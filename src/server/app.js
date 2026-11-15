"use strict";

const path = require("node:path");
const express = require("express");
const expressLayout = require("express-ejs-layouts");
const helmet = require("helmet");
const compression = require("compression");

const {
    LOCALES,
    DEFAULT_LOCALE,
    catalogs,
    clientJson,
    prefixFor,
    translator,
} = require("./i18n");
const { createHolidayService, HolidayError } = require("./holidays");

const ROOT = path.join(__dirname, "..", "..");

/** Every page, in navigation order. `key` selects the strings in the locale catalog. */
const PAGES = [
    { key: "eggs", path: "/", view: "index" },
    { key: "work", path: "/workCalc", view: "workingDays" },
    { key: "timer", path: "/egg-timer", view: "eggTimer" },
    { key: "age", path: "/age", view: "age" },
    { key: "countdown", path: "/countdown", view: "countdown" },
    { key: "pizza", path: "/pizza", view: "pizza" },
    { key: "split", path: "/split", view: "split" },
    { key: "about", path: "/about", view: "about" },
];

const PERMISSIONS_POLICY = [
    "accelerometer=()",
    "camera=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "payment=()",
    "usb=()",
    "interest-cohort=()",
].join(", ");

function normaliseSiteUrl(value) {
    if (!value) return null;
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("SITE_URL must be an http(s) URL");
    }
    return url.origin;
}

function localisedPath(locale, pagePath) {
    const prefix = prefixFor(locale);
    if (pagePath === "/") return prefix || "/";
    return `${prefix}${pagePath}`;
}

/** Monday-first weekday list with JS day indexes and localised names. */
function weekdays(locale) {
    const format = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        timeZone: "UTC",
    });
    return [1, 2, 3, 4, 5, 6, 0].map((index) => ({
        index,
        name: format.format(Date.UTC(2026, 10, 15 + index)),
    }));
}

const weekdayNames = Object.fromEntries(
    LOCALES.map((locale) => [locale, weekdays(locale)]),
);

function sendHolidayError(res, err) {
    const status = err instanceof HolidayError ? err.status : 500;
    if (status >= 500) console.error("holidays:", err.message);
    res.status(status)
        .set("Cache-Control", "no-store")
        .json({ error: err instanceof HolidayError ? err.message : "Error" });
}

/**
 * Builds the Express application.
 * @param {object} [options]
 * @param {boolean} [options.production]
 * @param {string} [options.siteUrl] public origin used for canonical links and the sitemap
 * @param {object} [options.holidayService] injectable for tests
 */
function createApp({
    production = process.env.NODE_ENV === "production",
    siteUrl = process.env.SITE_URL,
    holidayService = createHolidayService(),
} = {}) {
    const origin = normaliseSiteUrl(siteUrl);
    const app = express();

    app.disable("x-powered-by");
    app.set("trust proxy", false);
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    "style-src": ["'self'"],
                    "font-src": ["'self'"],
                    "img-src": ["'self'", "data:"],
                },
            },
        }),
    );
    app.use((req, res, next) => {
        res.set("Permissions-Policy", PERMISSIONS_POLICY);
        next();
    });
    app.use(compression());

    const staticOptions = {
        maxAge: production ? "7d" : 0,
        index: false,
        redirect: false,
    };
    app.use(express.static(path.join(ROOT, "public"), staticOptions));
    app.use(express.static(path.join(ROOT, "dist"), staticOptions));

    app.use(expressLayout);
    app.set("layout", path.join(ROOT, "src/views/layouts/main"));
    app.set("views", path.join(ROOT, "src/views"));
    app.set("view engine", "ejs");

    app.get("/healthz", (req, res) => {
        res.set("Cache-Control", "no-store").type("text/plain").send("ok");
    });

    app.get("/robots.txt", (req, res) => {
        const lines = ["User-agent: *", "Disallow: /api/", "Allow: /"];
        if (origin) lines.push(`Sitemap: ${origin}/sitemap.xml`);
        res.set("Cache-Control", "public, max-age=86400")
            .type("text/plain")
            .send(`${lines.join("\n")}\n`);
    });

    if (origin) {
        const urls = PAGES.flatMap((page) =>
            LOCALES.map(
                (locale) =>
                    `  <url><loc>${origin}${localisedPath(locale, page.path)}</loc></url>`,
            ),
        );
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
        app.get("/sitemap.xml", (req, res) => {
            res.set("Cache-Control", "public, max-age=86400")
                .type("application/xml")
                .send(sitemap);
        });
    }

    app.get("/api/holidays/countries", async (req, res) => {
        try {
            const countries = await holidayService.countries();
            res.set("Cache-Control", "public, max-age=86400").json({
                countries,
            });
        } catch (err) {
            sendHolidayError(res, err);
        }
    });

    app.get("/api/holidays/:year/:country", async (req, res) => {
        const { year, country } = req.params;
        try {
            if (!/^\d{4}$/.test(year)) {
                throw new HolidayError(400, "Unsupported year");
            }
            const holidays = await holidayService.holidays(
                Number(year),
                country,
            );
            res.set("Cache-Control", "public, max-age=86400").json({
                holidays,
            });
        } catch (err) {
            sendHolidayError(res, err);
        }
    });

    for (const locale of LOCALES) {
        const t = translator(locale);
        const nav = PAGES.map((page) => ({
            key: page.key,
            href: localisedPath(locale, page.path),
            label: t(`nav.${page.key}`),
        }));

        for (const page of PAGES) {
            const alternates = LOCALES.map((alt) => ({
                locale: alt,
                href: localisedPath(alt, page.path),
                name: catalogs[alt].meta.languageName,
            }));
            const locals = {
                t,
                locale,
                page: page.key,
                nav,
                alternates,
                origin,
                canonical: origin
                    ? `${origin}${localisedPath(locale, page.path)}`
                    : null,
                defaultHref: origin
                    ? `${origin}${localisedPath(DEFAULT_LOCALE, page.path)}`
                    : null,
                title: t(`pages.${page.key}.title`),
                description: t(`pages.${page.key}.description`),
                clientMessages: clientJson[locale],
                weekdays: weekdayNames[locale],
            };
            app.get(localisedPath(locale, page.path), (req, res) => {
                res.render(page.view, locals);
            });
        }
    }

    app.use((req, res) => {
        res.status(404).type("text/plain").send("Not found");
    });

    app.use((err, req, res, _next) => {
        console.error(err);
        if (res.headersSent) return;
        res.status(err.status === 400 ? 400 : 500)
            .type("text/plain")
            .send(err.status === 400 ? "Bad request" : "Internal server error");
    });

    return app;
}

module.exports = { createApp, PAGES };
