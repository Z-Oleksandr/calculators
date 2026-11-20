/** Money is handled in integer cents to avoid floating point drift. */
export function toCents(amount) {
    return Math.round(amount * 100);
}

/**
 * Splits a bill between `people`. With `roundUp` every share is rounded up to
 * a whole currency unit and the surplus goes to the tip.
 * @returns {{bill: number, tip: number, total: number, share: number, collected: number, extra: number}} cents
 */
export function splitBill({ amount, tipPercent, people, roundUp = false }) {
    const bill = toCents(amount);
    const tip = Math.round((bill * tipPercent) / 100);
    const total = bill + tip;
    const exactShare = Math.ceil(total / people);
    const share = roundUp ? Math.ceil(exactShare / 100) * 100 : exactShare;
    const collected = share * people;
    return { bill, tip, total, share, collected, extra: collected - total };
}

/** Area of a round pizza in cm². */
export function pizzaArea(diameterCm) {
    return Math.PI * (diameterCm / 2) ** 2;
}

/**
 * Adds area and price per 100 cm² to each pizza and finds the best value.
 * @param {{diameter: number, price: number}[]} pizzas
 * @returns {{rows: object[], best: number}} best is the index of the lowest price per area
 */
export function comparePizzas(pizzas) {
    const rows = pizzas.map((p) => {
        const area = pizzaArea(p.diameter);
        return { ...p, area, per100: (p.price / area) * 100 };
    });
    let best = -1;
    rows.forEach((row, i) => {
        if (best === -1 || row.per100 < rows[best].per100) best = i;
    });
    return { rows, best };
}
