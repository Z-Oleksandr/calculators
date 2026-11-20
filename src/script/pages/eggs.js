import { daysInclusive } from "../lib/dates.js";
import { eggStats, hensNeeded, lifetimeEggs } from "../lib/eggs.js";
import { highlight, message, number, unit } from "../i18n.js";
import { numberValue } from "../form.js";
import { readPeriod } from "./period.js";

export function compute(form) {
    const { start, end } = readPeriod(form);
    const days = daysInclusive(start, end);
    const perDay = numberValue(form, "eggs") ?? 0;
    const price = numberValue(form, "price");
    const age = numberValue(form, "age");
    const total = days * perDay;
    const stats = eggStats(total, price);

    const lines = [
        message("eggs.result", {
            days: unit("units.daysIn", days),
            eggs: unit("units.eggs", total, 1),
        }),
    ];
    if (total <= 0) return lines;

    lines.push(
        message("eggs.weight", {
            kg: highlight(number(stats.massKg, 1)),
            protein: highlight(number(stats.proteinKg, 2)),
            kcal: highlight(number(stats.kcal, 0)),
        }),
        message("eggs.cartons", {
            cartons: unit("units.cartons", stats.cartons),
        }),
        message("eggs.stack", {
            metres: highlight(number(stats.stackMetres, 1)),
        }),
    );
    if (stats.cost !== null) {
        lines.push(
            message("eggs.cost", { cost: highlight(number(stats.cost, 2, 2)) }),
        );
    }
    lines.push(
        message("eggs.hens", {
            hens: unit("units.hens", hensNeeded(perDay), 1),
        }),
    );
    const future = lifetimeEggs(perDay, age);
    if (future !== null && future > 0) {
        lines.push(
            message("eggs.lifetime", { eggs: unit("units.eggs", future) }),
        );
    }
    return lines;
}
