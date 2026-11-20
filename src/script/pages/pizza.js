import { comparePizzas } from "../lib/money.js";
import { highlight, message, number } from "../i18n.js";
import { InputError } from "../dom.js";
import { numberValue } from "../form.js";

const SLOTS = [1, 2, 3, 4];

export function compute(form) {
    const pizzas = [];
    for (const n of SLOTS) {
        const diameter = numberValue(form, `d${n}`);
        const price = numberValue(form, `p${n}`);
        if (diameter === null && price === null) continue;
        if (diameter === null || price === null || diameter <= 0) {
            throw new InputError("errors.invalidNumber");
        }
        pizzas.push({
            n,
            diameter,
            price,
            quantity: numberValue(form, `q${n}`) ?? 1,
        });
    }
    if (pizzas.length === 0) throw new InputError("pizza.empty");

    const { rows, best } = comparePizzas(pizzas);
    const lines = rows.map((row) =>
        message("pizza.row", {
            n: row.n,
            quantity: row.quantity,
            diameter: number(row.diameter, 1),
            area: highlight(number(row.area * row.quantity, 0)),
            price: number(row.price * row.quantity, 2, 2),
            per100: highlight(number(row.per100, 2, 2)),
        }),
    );
    if (rows.length > 1) {
        lines.push(message("pizza.best", { n: highlight(rows[best].n) }));
        const sorted = [...rows].sort((a, b) => b.diameter - a.diameter);
        const big = sorted[0].diameter;
        const small = sorted[sorted.length - 1].diameter;
        if (big !== small) {
            lines.push(
                message("pizza.compare", {
                    big: number(big, 1),
                    small: number(small, 1),
                    count: highlight(number((big / small) ** 2, 1)),
                }),
            );
        }
    }
    return lines;
}
