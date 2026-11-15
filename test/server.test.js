"use strict";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { createApp, PAGES } = require("../src/server/app");
const { catalogs, LOCALES } = require("../src/server/i18n");
const {
    createHolidayService,
    HolidayError,
} = require("../src/server/holidays");

function shape(node, prefix = "") {
    if (node === null || typeof node !== "object") return [prefix];
    return Object.keys(node).flatMap((key) =>
        shape(node[key], `${prefix}.${key}`),
    );
}

function pluralNeutral(paths) {
    return paths
        .map((p) => p.replace(/\.(zero|one|two|few|many|other)$/, ".#"))
        .filter((p, i, all) => all.indexOf(p) === i)
        .sort();
}

test("all locales define the same messages", () => {
    const reference = pluralNeutral(shape(catalogs.en));
    for (const locale of LOCALES) {
        assert.deepEqual(
            pluralNeutral(shape(catalogs[locale])),
            reference,
            locale,
        );
    }
});

test("plural messages cover every plural category of their locale", () => {
    for (const locale of LOCALES) {
        const categories = new Intl.PluralRules(locale).resolvedOptions()
            .pluralCategories;
        for (const [name, forms] of Object.entries(
            catalogs[locale].client.units,
        )) {
            for (const category of categories) {
                assert.ok(
                    forms[category],
                    `${locale} units.${name}.${category}`,
                );
            }
        }
    }
});

function jsonResponse(status, body) {
    return new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

function fakeUpstream() {
    const calls = [];
    const fetchImpl = async (url) => {
        calls.push(url);
        if (url.endsWith("/AvailableCountries")) {
            return jsonResponse(200, [
                { countryCode: "DE", name: "Germany" },
                { countryCode: "UA", name: "Ukraine" },
                { countryCode: "bad", name: "x" },
            ]);
        }
        if (url.includes("/PublicHolidays/2026/DE")) {
            return jsonResponse(200, [
                {
                    date: "2026-01-01",
                    name: "New Year",
                    localName: "Neujahr",
                    counties: null,
                    types: ["Public"],
                },
                {
                    date: "2026-01-06",
                    name: "Epiphany",
                    localName: "Heilige Drei Könige",
                    counties: ["DE-BY", "<script>"],
                    types: ["Public"],
                },
                {
                    date: "2026-02-14",
                    name: "Bank",
                    localName: "Bank",
                    counties: null,
                    types: ["Bank"],
                },
                { date: "nope", name: "Broken", types: ["Public"] },
            ]);
        }
        return jsonResponse(204);
    };
    return { calls, fetchImpl };
}

describe("holiday service", () => {
    test("validates, sanitises and caches", async () => {
        const upstream = fakeUpstream();
        const service = createHolidayService({ fetchImpl: upstream.fetchImpl });
        assert.deepEqual(await service.countries(), ["DE", "UA"]);
        const list = await service.holidays(2026, "DE");
        assert.equal(list.length, 2);
        assert.deepEqual(list[1].regions, ["DE-BY"]);
        await service.holidays(2026, "DE");
        assert.equal(upstream.calls.length, 2);
        assert.deepEqual(await service.holidays(2027, "UA"), []);
    });

    test("rejects bad input without calling upstream", async () => {
        const upstream = fakeUpstream();
        const service = createHolidayService({ fetchImpl: upstream.fetchImpl });
        for (const [year, country] of [
            [1900, "DE"],
            [2026, "de"],
            [2026, "DEU"],
            [2026.5, "DE"],
        ]) {
            await assert.rejects(
                service.holidays(year, country),
                (err) => err.status === 400,
            );
        }
        assert.equal(upstream.calls.length, 0);
        await assert.rejects(
            service.holidays(2026, "XX"),
            (err) => err.status === 404,
        );
    });

    test("dedupes concurrent misses and serves stale data on failure", async () => {
        let now = 0;
        let fail = false;
        const upstream = fakeUpstream();
        const service = createHolidayService({
            now: () => now,
            fetchImpl: async (url) => {
                if (fail) throw new Error("down");
                return upstream.fetchImpl(url);
            },
        });
        await Promise.all([
            service.holidays(2026, "DE"),
            service.holidays(2026, "DE"),
        ]);
        assert.equal(upstream.calls.length, 2);
        now += 2 * 24 * 60 * 60 * 1000;
        fail = true;
        assert.equal((await service.holidays(2026, "DE")).length, 2);
        await assert.rejects(
            service.holidays(2025, "DE"),
            (err) => err instanceof HolidayError && err.status === 503,
        );
    });

    test("caps the upstream request rate", async () => {
        const upstream = fakeUpstream();
        const service = createHolidayService({
            fetchImpl: upstream.fetchImpl,
            now: () => 0,
        });
        const results = await Promise.allSettled(
            Array.from({ length: 70 }, (_, i) =>
                service.holidays(1976 + i, "UA"),
            ),
        );
        assert.ok(
            results.some(
                (r) => r.status === "rejected" && r.reason.status === 503,
            ),
        );
        assert.ok(upstream.calls.length <= 60);
    });

    test("refuses oversized upstream bodies", async () => {
        const service = createHolidayService({
            fetchImpl: async () =>
                new Response("[" + " ".repeat(600 * 1024) + "]", {
                    status: 200,
                }),
        });
        await assert.rejects(service.countries(), (err) => err.status === 503);
    });
});

describe("http app", () => {
    let server;
    let base;

    before(async () => {
        const upstream = fakeUpstream();
        const app = createApp({
            production: true,
            siteUrl: "https://eggs.example",
            holidayService: createHolidayService({
                fetchImpl: upstream.fetchImpl,
            }),
        });
        server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));
        base = `http://127.0.0.1:${server.address().port}`;
    });

    after(() => new Promise((resolve) => server.close(resolve)));

    test("every page renders in every locale", async () => {
        for (const locale of LOCALES) {
            for (const page of PAGES) {
                const prefix = locale === "en" ? "" : `/${locale}`;
                const url =
                    page.path === "/" ? prefix || "/" : `${prefix}${page.path}`;
                const res = await fetch(base + url);
                assert.equal(res.status, 200, url);
                const html = await res.text();
                assert.match(html, new RegExp(`<html lang="${locale}">`), url);
                assert.match(
                    html,
                    /<link rel="canonical" href="https:\/\/eggs\.example/,
                    url,
                );
                assert.doesNotMatch(html, /pages\.|common\.|nav\./, url);
            }
        }
    });

    test("security headers are set", async () => {
        const res = await fetch(`${base}/`);
        const csp = res.headers.get("content-security-policy");
        assert.match(csp, /script-src 'self'/);
        assert.match(csp, /style-src 'self';/);
        assert.equal(res.headers.get("x-powered-by"), null);
        assert.match(res.headers.get("permissions-policy"), /camera=\(\)/);
    });

    test("holiday api validates and returns json", async () => {
        let res = await fetch(`${base}/api/holidays/countries`);
        assert.deepEqual(await res.json(), { countries: ["DE", "UA"] });
        res = await fetch(`${base}/api/holidays/2026/DE`);
        assert.equal(res.status, 200);
        assert.match(res.headers.get("cache-control"), /max-age=86400/);
        assert.equal((await res.json()).holidays.length, 2);
        for (const bad of [
            "/api/holidays/20x6/DE",
            "/api/holidays/2026/de",
            "/api/holidays/1800/DE",
        ]) {
            res = await fetch(base + bad);
            assert.equal(res.status, 400, bad);
            assert.equal(res.headers.get("cache-control"), "no-store");
        }
        res = await fetch(`${base}/api/holidays/2026/ZZ`);
        assert.equal(res.status, 404);
    });

    test("robots, sitemap, health and 404", async () => {
        assert.match(
            await (await fetch(`${base}/robots.txt`)).text(),
            /Sitemap: https:\/\/eggs\.example\/sitemap\.xml/,
        );
        const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
        assert.equal(
            sitemap.match(/<url>/g).length,
            PAGES.length * LOCALES.length,
        );
        assert.equal(await (await fetch(`${base}/healthz`)).text(), "ok");
        assert.equal((await fetch(`${base}/nope`)).status, 404);
        assert.equal((await fetch(`${base}/package.json`)).status, 404);
        assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 404);
    });
});
