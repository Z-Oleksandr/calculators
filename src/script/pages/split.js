import { splitBill } from "../lib/money.js";
import { highlight, message, money } from "../i18n.js";
import { checkedValues, numberValue } from "../form.js";

export function compute(form) {
    const people = Math.max(1, Math.round(numberValue(form, "people") ?? 1));
    const result = splitBill({
        amount: numberValue(form, "amount") ?? 0,
        tipPercent: numberValue(form, "tip") ?? 0,
        people,
        roundUp: checkedValues(form, "round").length > 0,
    });
    const lines = [
        message("split.total", {
            tip: highlight(money(result.tip)),
            total: highlight(money(result.total)),
        }),
        message("split.share", {
            share: highlight(money(result.share)),
        }),
    ];
    if (result.extra > 0) {
        lines.push(
            message("split.extra", { extra: highlight(money(result.extra)) }),
        );
    }
    return lines;
}
