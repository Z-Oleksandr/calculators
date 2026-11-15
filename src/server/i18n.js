"use strict";

const fs = require("node:fs");
const path = require("node:path");

const LOCALES = ["en", "de", "uk"];
const DEFAULT_LOCALE = "en";
const LOCALE_DIR = path.join(__dirname, "..", "locales");

const catalogs = Object.fromEntries(
    LOCALES.map((locale) => [
        locale,
        JSON.parse(
            fs.readFileSync(path.join(LOCALE_DIR, `${locale}.json`), "utf8"),
        ),
    ]),
);

function lookup(catalog, key) {
    return key
        .split(".")
        .reduce(
            (node, part) => (node == null ? undefined : node[part]),
            catalog,
        );
}

/** URL prefix for a locale: "" for the default locale, "/de" otherwise. */
function prefixFor(locale) {
    return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/**
 * Returns a translator for `locale`. Missing keys fall back to the default
 * locale and finally to the key itself; `{name}` placeholders are filled from
 * `params`.
 */
function translator(locale) {
    const catalog = catalogs[locale];
    const fallback = catalogs[DEFAULT_LOCALE];
    return function t(key, params) {
        let message = lookup(catalog, key);
        if (typeof message !== "string") message = lookup(fallback, key);
        if (typeof message !== "string") return key;
        if (!params) return message;
        return message.replace(/\{(\w+)\}/g, (match, name) =>
            name in params ? String(params[name]) : match,
        );
    };
}

/**
 * The browser-side messages for `locale` as JSON that is safe to embed in a
 * <script type="application/json"> element.
 */
const clientJson = Object.fromEntries(
    LOCALES.map((locale) => [
        locale,
        JSON.stringify(catalogs[locale].client).replace(/</g, "\\u003c"),
    ]),
);

module.exports = {
    LOCALES,
    DEFAULT_LOCALE,
    catalogs,
    clientJson,
    prefixFor,
    translator,
};
