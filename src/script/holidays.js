import { parseISODate, yearsInRange } from "./lib/dates.js";
import { locale } from "./i18n.js";

export const MIN_YEAR = 1976;
export const MAX_YEAR = 2075;
export const MAX_YEARS = 10;

const requests = new Map();

function getJson(url) {
    if (!requests.has(url)) {
        const pending = fetch(url, { headers: { Accept: "application/json" } })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .catch((err) => {
                requests.delete(url);
                throw err;
            });
        requests.set(url, pending);
    }
    return requests.get(url);
}

function fetchYear(year, country) {
    return getJson(`/api/holidays/${year}/${encodeURIComponent(country)}`).then(
        (data) => (Array.isArray(data.holidays) ? data.holidays : []),
    );
}

function regionName(code) {
    return code.split("-")[1] ?? code;
}

function fill(select, options) {
    const keep = select.options[0];
    const nodes = options.map(({ value, label }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        return option;
    });
    select.replaceChildren(keep, ...nodes);
}

function applyPending(select) {
    const pending = select.dataset.pending;
    if (!pending) return;
    delete select.dataset.pending;
    select.value = pending;
    if (select.value !== pending) select.value = "";
}

/**
 * Wires up the country and region selects inside `form`.
 * @returns {Promise<void>} resolves once restored selections are applied
 */
export async function setupHolidayFields(form) {
    const container = form.querySelector("[data-holidays]");
    if (!container) return;
    const country = form.elements.namedItem("country");
    const region = form.elements.namedItem("region");
    const regionField = container.querySelector("[data-region-field]");

    async function loadRegions() {
        regionField.hidden = true;
        fill(region, []);
        if (!country.value) return;
        try {
            const year = Math.min(
                Math.max(new Date().getFullYear(), MIN_YEAR),
                MAX_YEAR,
            );
            const list = await fetchYear(year, country.value);
            const codes = [...new Set(list.flatMap((h) => h.regions))].sort();
            fill(
                region,
                codes.map((code) => ({ value: code, label: regionName(code) })),
            );
            regionField.hidden = codes.length === 0;
        } catch {
            regionField.hidden = true;
        }
        applyPending(region);
    }

    country.addEventListener("change", loadRegions);

    try {
        const { countries } = await getJson("/api/holidays/countries");
        let names = null;
        try {
            names = new Intl.DisplayNames([locale], { type: "region" });
        } catch {
            names = null;
        }
        const options = countries
            .map((code) => ({ value: code, label: names?.of(code) ?? code }))
            .sort((a, b) => a.label.localeCompare(b.label, locale));
        fill(country, options);
    } catch {
        container.hidden = true;
        return;
    }
    applyPending(country);
    await loadRegions();
}

/**
 * Public holidays for `country` (and optionally `region`) between start and
 * end, as day numbers.
 * @returns {Promise<{days: number[]}|{status: "unsupported"|"unavailable"}>}
 */
export async function holidayDays(country, region, start, end) {
    const years = yearsInRange(start, end);
    if (
        years.length > MAX_YEARS ||
        years[0] < MIN_YEAR ||
        years[years.length - 1] > MAX_YEAR
    ) {
        return { status: "unsupported" };
    }
    try {
        const lists = await Promise.all(
            years.map((y) => fetchYear(y, country)),
        );
        const days = lists
            .flat()
            .filter(
                (h) =>
                    h.regions.length === 0 ||
                    (region && h.regions.includes(region)),
            )
            .map((h) => parseISODate(h.date))
            .filter((d) => d !== null);
        return { days };
    } catch {
        return { status: "unavailable" };
    }
}
