/**
 * Browser-side translation helpers. Messages are embedded by the server as
 * JSON in #i18n; plural messages are objects keyed by Intl.PluralRules category.
 */

const source = document.getElementById("i18n");
const messages = source ? JSON.parse(source.textContent) : {};

export const locale = document.documentElement.lang || "en";

const pluralRules = new Intl.PluralRules(locale);
const numberFormats = new Map();
const PLACEHOLDER = /\{(\w+)\}/g;

function lookup(key) {
    return key
        .split(".")
        .reduce(
            (node, part) => (node == null ? undefined : node[part]),
            messages,
        );
}

/** Locale-formatted number with at most `maxDigits` fraction digits. */
export function number(value, maxDigits = 2, minDigits = 0) {
    const cacheKey = `${minDigits}:${maxDigits}`;
    let format = numberFormats.get(cacheKey);
    if (!format) {
        format = new Intl.NumberFormat(locale, {
            minimumFractionDigits: minDigits,
            maximumFractionDigits: maxDigits,
        });
        numberFormats.set(cacheKey, format);
    }
    return format.format(value);
}

/** Formats an amount in cents with two decimals and no currency symbol. */
export function money(cents) {
    return number(cents / 100, 2, 2);
}

/** Formats a day number as a long, localised date. */
export function longDate(dayNumber) {
    return new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeZone: "UTC",
    }).format(dayNumber * 86_400_000);
}

/** Plain string for `key`, or the key itself when missing. */
export function text(key) {
    const value = lookup(key);
    return typeof value === "string" ? value : key;
}

/** Highlighted span for a value. */
export function highlight(value) {
    const span = document.createElement("span");
    span.className = "highlight";
    span.textContent = String(value);
    return span;
}

/**
 * Highlighted plural phrase such as "3 eggs" from a units.* message.
 * @param {string} key message key of a plural object
 * @param {number} count value that selects the plural form
 * @param {number} [digits] fraction digits used when displaying `count`
 */
export function unit(key, count, digits = 0) {
    const forms = lookup(key);
    let phrase = key;
    if (forms && typeof forms === "object") {
        phrase = forms[pluralRules.select(count)] ?? forms.other ?? key;
    }
    return highlight(phrase.replace("{n}", number(count, digits)));
}

/**
 * Builds a fragment from the message at `key`, replacing {name} placeholders
 * with `params[name]` (a string, number or DOM node). Never parses HTML.
 */
export function message(key, params = {}) {
    const template = text(key);
    const fragment = document.createDocumentFragment();
    let last = 0;
    for (const match of template.matchAll(PLACEHOLDER)) {
        fragment.append(template.slice(last, match.index));
        const value = params[match[1]];
        fragment.append(
            value instanceof Node ? value : String(value ?? match[0]),
        );
        last = match.index + match[0].length;
    }
    fragment.append(template.slice(last));
    return fragment;
}
