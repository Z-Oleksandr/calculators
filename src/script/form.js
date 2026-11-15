import { parseISODate, toISODate, today } from "./lib/dates.js";

/**
 * Form state that survives reloads and can be shared: on every calculation the
 * inputs are written to the query string (shareable link) and to localStorage
 * (remembered on this device). Restored values go through the input elements
 * themselves, so the browser's own sanitisation of each input type applies.
 */

const MAX_VALUE_LENGTH = 100;
const MAX_PARAMS = 50;

function storageKey() {
    return `calc:${document.body.dataset.page}`;
}

function safeStorage(action) {
    try {
        return action(window.localStorage);
    } catch {
        return null;
    }
}

function isDefault(element) {
    if (!(element instanceof HTMLInputElement)) return false;
    if (element.type === "checkbox" || element.type === "radio") return false;
    return element.value === element.defaultValue;
}

/**
 * Form values as URLSearchParams. Empty values and text/number inputs still
 * at their default are left out to keep shared links short; restoring falls
 * back to the same defaults.
 */
export function serialize(form) {
    const params = new URLSearchParams();
    for (const element of form.elements) {
        const { name } = element;
        if (!name || element.disabled || isDefault(element)) continue;
        if (
            (element.type === "checkbox" || element.type === "radio") &&
            !element.checked
        ) {
            continue;
        }
        const value = element.value.trim();
        if (value !== "") params.append(name, value);
    }
    return params;
}

function apply(form, params) {
    const names = new Set(params.keys());
    for (const element of form.elements) {
        const { name, type } = element;
        if (!name) continue;
        const values = params
            .getAll(name)
            .map((v) => v.slice(0, MAX_VALUE_LENGTH));
        if (type === "checkbox" || type === "radio") {
            if (type === "radio" && !names.has(name)) continue;
            element.checked = values.includes(element.value);
        } else if (element.tagName === "SELECT") {
            element.value = values[0] ?? "";
            if (values[0] && element.value !== values[0]) {
                element.dataset.pending = values[0];
            }
        } else if (values.length > 0) {
            element.value = values[0];
        } else if (element.type !== "hidden") {
            element.value = element.defaultValue;
        }
    }
}

function parseParams(search) {
    const params = new URLSearchParams(search);
    return [...params.keys()].length > MAX_PARAMS ? null : params;
}

/**
 * Restores the form from the URL, else from localStorage, else fills any
 * empty [data-default-today] date with today's date.
 * @returns {"url"|"storage"|null} where the state came from
 */
export function restore(form) {
    let origin = null;
    const fromUrl = parseParams(window.location.search);
    if (fromUrl && fromUrl.size > 0) {
        apply(form, fromUrl);
        origin = "url";
    } else {
        const saved = safeStorage((s) => s.getItem(storageKey()));
        const fromStorage = saved ? parseParams(saved) : null;
        if (fromStorage && fromStorage.size > 0) {
            apply(form, fromStorage);
            origin = "storage";
        }
    }
    for (const input of form.querySelectorAll("[data-default-today]")) {
        if (parseISODate(input.value) === null) {
            input.value = toISODate(today());
        }
    }
    return origin;
}

/** Saves the form to the query string and localStorage. */
export function persist(form) {
    const query = serialize(form).toString();
    const search = query ? `?${query}` : "";
    window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${search}`,
    );
    safeStorage((s) => s.setItem(storageKey(), query));
    for (const link of document.querySelectorAll("[data-lang-link]")) {
        const url = new URL(link.href, window.location.href);
        url.search = search;
        link.href = url.pathname + url.search;
    }
}

/** Value of a named control (first of a group). */
export function value(form, name) {
    const element = form.elements.namedItem(name);
    return element ? element.value : "";
}

/**
 * Numeric value of a named input, or null when it is empty. Range checks are
 * done by the browser via the input's min/max/step before submit.
 */
export function numberValue(form, name) {
    const raw = value(form, name).trim();
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

/** Day number of a named date input, or null. */
export function dateValue(form, name) {
    return parseISODate(value(form, name));
}

/** Values of all checked checkboxes called `name`. */
export function checkedValues(form, name) {
    return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(
        (input) => input.value,
    );
}
