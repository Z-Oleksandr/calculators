"use strict";

const API_BASE = "https://date.nager.at/api/v3";
const MIN_YEAR = 1976;
const MAX_YEAR = 2075;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;
const MAX_BODY_BYTES = 512 * 1024;
const TIMEOUT_MS = 5000;
const UPSTREAM_BUDGET = 60;
const UPSTREAM_WINDOW_MS = 60 * 1000;

const COUNTRY_CODE = /^[A-Z]{2}$/;
const REGION_CODE = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME_LENGTH = 200;

class HolidayError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/**
 * Reads a fetch Response body as JSON without buffering more than `limit` bytes.
 */
async function readJson(response, limit) {
    const declared = Number(response.headers.get("content-length"));
    if (declared > limit) throw new Error("Upstream response too large");
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            throw new Error("Upstream response too large");
        }
        chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function cleanName(value) {
    return typeof value === "string" ? value.slice(0, MAX_NAME_LENGTH) : "";
}

function toHoliday(entry) {
    if (
        !entry ||
        typeof entry.date !== "string" ||
        !ISO_DATE.test(entry.date)
    ) {
        return null;
    }
    if (!Array.isArray(entry.types) || !entry.types.includes("Public")) {
        return null;
    }
    const regions = Array.isArray(entry.counties)
        ? entry.counties.filter(
              (c) => typeof c === "string" && REGION_CODE.test(c),
          )
        : [];
    return {
        date: entry.date,
        name: cleanName(entry.name),
        localName: cleanName(entry.localName),
        regions,
    };
}

/**
 * Proxy for the Nager.Date public holiday API. Visitors never talk to the
 * upstream directly: inputs are validated against the upstream country list,
 * responses are size-capped, sanitised and cached (stale copies are served if
 * the upstream fails), concurrent misses share one request, and the total
 * upstream request rate is capped so the server cannot be used as an amplifier.
 */
function createHolidayService({
    fetchImpl = globalThis.fetch,
    now = Date.now,
} = {}) {
    const cache = new Map();
    const inFlight = new Map();
    let windowStart = 0;
    let windowCount = 0;

    function takeBudget() {
        const t = now();
        if (t - windowStart >= UPSTREAM_WINDOW_MS) {
            windowStart = t;
            windowCount = 0;
        }
        if (windowCount >= UPSTREAM_BUDGET) return false;
        windowCount += 1;
        return true;
    }

    function remember(key, value) {
        cache.delete(key);
        cache.set(key, { value, expires: now() + TTL_MS });
        if (cache.size > MAX_CACHE_ENTRIES) {
            cache.delete(cache.keys().next().value);
        }
    }

    async function request(path) {
        if (!takeBudget()) {
            throw new HolidayError(503, "Holiday service is busy");
        }
        const response = await fetchImpl(`${API_BASE}${path}`, {
            headers: { Accept: "application/json" },
            redirect: "error",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.status === 204 || response.status === 404) {
            return [];
        }
        if (!response.ok) {
            throw new Error(`Upstream responded ${response.status}`);
        }
        return readJson(response, MAX_BODY_BYTES);
    }

    async function cached(key, path, transform) {
        const hit = cache.get(key);
        if (hit && hit.expires > now()) {
            cache.delete(key);
            cache.set(key, hit);
            return hit.value;
        }
        if (inFlight.has(key)) return inFlight.get(key);

        const pending = request(path)
            .then((data) => {
                const value = transform(data);
                remember(key, value);
                return value;
            })
            .catch((err) => {
                if (hit) return hit.value;
                if (err instanceof HolidayError) throw err;
                throw new HolidayError(503, "Holiday service unavailable");
            })
            .finally(() => inFlight.delete(key));
        inFlight.set(key, pending);
        return pending;
    }

    function countries() {
        return cached("countries", "/AvailableCountries", (data) => {
            if (!Array.isArray(data)) throw new Error("Unexpected payload");
            return data
                .map((c) => c && c.countryCode)
                .filter(
                    (code) =>
                        typeof code === "string" && COUNTRY_CODE.test(code),
                )
                .sort();
        });
    }

    async function holidays(year, country) {
        if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
            throw new HolidayError(400, "Unsupported year");
        }
        if (typeof country !== "string" || !COUNTRY_CODE.test(country)) {
            throw new HolidayError(400, "Invalid country code");
        }
        const known = await countries();
        if (!known.includes(country)) {
            throw new HolidayError(404, "Unknown country");
        }
        return cached(
            `${country}:${year}`,
            `/PublicHolidays/${year}/${country}`,
            (data) => {
                if (!Array.isArray(data)) throw new Error("Unexpected payload");
                return data.map(toHoliday).filter(Boolean);
            },
        );
    }

    return { countries, holidays };
}

module.exports = { createHolidayService, HolidayError, MIN_YEAR, MAX_YEAR };
