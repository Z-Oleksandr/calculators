"use strict";

function jsonResponse(status, body) {
    return new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

const HOLIDAYS_DE_2026 = [
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
];

/** A fake Nager.Date upstream that records the URLs it was asked for. */
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
            return jsonResponse(200, HOLIDAYS_DE_2026);
        }
        return jsonResponse(204);
    };
    return { calls, fetchImpl };
}

module.exports = { fakeUpstream };
