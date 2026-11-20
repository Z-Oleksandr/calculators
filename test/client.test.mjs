import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { JSDOM, VirtualConsole } from "jsdom";

/**
 * Run west of UTC: parsing date inputs as UTC instants and reading them back in
 * local time used to shift every weekday by one here.
 */
process.env.TZ = "America/Los_Angeles";

const require = createRequire(import.meta.url);
const { createApp } = require("../src/server/app.js");
const { createHolidayService } = require("../src/server/holidays.js");
const { fakeUpstream } = require("./helpers/upstream.js");

const bundle = readFileSync(
    new URL("../dist/main.js", import.meta.url),
    "utf8",
);
const themeScript = readFileSync(
    new URL("../public/js/theme.js", import.meta.url),
    "utf8",
);

let server;
let base;

before(async () => {
    const app = createApp({
        production: true,
        holidayService: createHolidayService({
            fetchImpl: fakeUpstream().fetchImpl,
        }),
    });
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

/** Loads a page into jsdom and runs the production bundle in it. */
async function open(path, { storage = {} } = {}) {
    const html = await (await fetch(base + path)).text();
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", (e) => errors.push(String(e)));
    virtualConsole.on("jsdomError", (e) => errors.push(e.message));
    const dom = new JSDOM(html, {
        url: base + path,
        runScripts: "outside-only",
        pretendToBeVisual: true,
        virtualConsole,
    });
    const { window } = dom;
    window.fetch = (url, options) => fetch(new URL(url, base), options);
    window.matchMedia = () => ({ matches: false, addEventListener() {} });
    for (const [key, value] of Object.entries(storage)) {
        window.localStorage.setItem(key, value);
    }
    window.eval(themeScript);
    window.eval(bundle);
    await settle();
    const output = () =>
        window.document
            .getElementById("output")
            .textContent.replace(/\s+/g, " ")
            .trim();
    return { window, document: window.document, output, errors };
}

test("egg calculator counts both ends of the period", async () => {
    const page = await open(
        "/?start=2026-11-01&end=2026-11-10&eggs=2&price=0.3&age=30",
    );
    assert.match(page.output(), /In 10 days you have eaten 20 eggs\./);
    assert.match(page.output(), /They cost you 6\.00\./);
    assert.match(page.output(), /That's 2 cartons of ten\./);
    const few = await open("/?start=2026-11-01&end=2026-11-07&eggs=2");
    assert.match(few.output(), /That's 1\.4 cartons of ten\./);
    assert.match(
        few.output(),
        /Stacked on top of each other, they would be 0\.8 m tall\./,
    );
    assert.match(page.output(), /another 36,525 eggs/);
    assert.deepEqual(page.errors, []);
});

test("invalid ranges show an error and no share link", async () => {
    const page = await open("/?start=2026-11-10&end=2026-11-01&eggs=2");
    assert.match(page.output(), /can't be before the start date/);
    assert.equal(page.document.querySelector(".copy-link").hidden, true);
});

test("working days subtract regional holidays, days off, and add eggs and pay", async () => {
    const page = await open(
        "/workCalc?start=2026-01-01&end=2026-01-31&hours=7.5&d=1&d=2&d=3&d=4&d=5&vacation=2&eggs=1&rate=20&country=DE&region=DE-BY",
    );
    assert.match(page.output(), /you worked 18 days\./);
    assert.match(page.output(), /That makes 135 hours\./);
    assert.match(page.output(), /subtracted: 2\./);
    assert.match(page.output(), /In those days you have eaten 18 eggs\./);
    assert.match(page.output(), /You earned 2,700\.00\./);
    assert.equal(page.document.getElementById("region").value, "DE-BY");
});

test("weekday counts do not depend on the visitor's timezone", async () => {
    const page = await open(
        "/workCalc?start=2026-11-02&end=2026-11-15&d=1&d=2&d=3&d=4&d=5",
    );
    assert.match(page.output(), /you worked 10 days\.\s*That makes 80 hours\./);
});

test("localised output uses the right plural forms", async () => {
    const uk = await open("/uk/?start=2026-11-01&end=2026-11-05&eggs=1.5");
    assert.match(uk.output(), /За 5 днів з'їдено 7,5 яйця\./);
    const de = await open("/de/split?amount=100&tip=10&people=3&round=1");
    assert.match(de.output(), /Jede Person zahlt 37,00\./);
});

test("results are rendered as text, never as HTML", async () => {
    const page = await open(
        "/countdown?target=2099-01-01&event=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
    );
    assert.equal(page.document.querySelector("#output img"), null);
    assert.match(page.output(), /<img src=x onerror=alert\(1\)>/);
});

test("state is saved to the URL and restored from storage", async () => {
    const page = await open("/pizza?d1=30&p1=10&d2=40&p2=15");
    assert.equal(page.window.location.search, "?d1=30&p1=10&d2=40&p2=15");
    assert.match(page.output(), /Best value: pizza 2\./);
    assert.match(
        page.document
            .querySelector('[data-lang-link][hreflang="de"]')
            .getAttribute("href"),
        /^\/de\/pizza\?d1=30/,
    );
    const restored = await open("/workCalc", {
        storage: { "calc:work": "start=2026-03-01&hours=6&d=1&d=3&country=UA" },
    });
    const { document } = restored;
    assert.equal(document.getElementById("start").value, "2026-03-01");
    assert.equal(document.getElementById("hours").value, "6");
    assert.deepEqual(
        [...document.querySelectorAll('[name="d"]:checked')].map(
            (e) => e.value,
        ),
        ["1", "3"],
    );
    assert.equal(document.getElementById("country").value, "UA");
    assert.equal(document.getElementById("output").hidden, true);
});

test("egg timer shows the boiling time and theme toggle persists", async () => {
    const page = await open("/egg-timer?size=L&start=room&doneness=soft");
    assert.match(
        page.document.getElementById("clock").textContent,
        /^\d+:\d\d$/,
    );
    assert.equal(page.document.getElementById("timer-start").disabled, false);
    page.document.querySelector(".theme-toggle").click();
    assert.equal(page.document.documentElement.dataset.theme, "dark");
    assert.equal(page.window.localStorage.getItem("theme"), "dark");
});
