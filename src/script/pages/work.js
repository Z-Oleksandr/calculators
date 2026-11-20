import { countDaysOnWeekdays, countWeekdays } from "../lib/dates.js";
import { toCents } from "../lib/money.js";
import { highlight, message, money, number, unit } from "../i18n.js";
import { checkedValues, numberValue, value } from "../form.js";
import { holidayDays, setupHolidayFields } from "../holidays.js";
import { readPeriod } from "./period.js";

export function init(form) {
    return setupHolidayFields(form);
}

export async function compute(form) {
    const { start, end } = readPeriod(form);
    const weekdays = checkedValues(form, "d")
        .map(Number)
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (weekdays.length === 0) return [message("work.noWorkdays")];

    const hoursPerDay = numberValue(form, "hours") ?? 0;
    const daysOff =
        (numberValue(form, "vacation") ?? 0) + (numberValue(form, "sick") ?? 0);
    const eggsPerDay = numberValue(form, "eggs");
    const rate = numberValue(form, "rate");
    const country = value(form, "country");

    const scheduled = countWeekdays(start, end, weekdays);
    let holidays = 0;
    let holidayNote = null;
    if (country) {
        const result = await holidayDays(
            country,
            value(form, "region"),
            start,
            end,
        );
        if (result.days) {
            holidays = countDaysOnWeekdays(result.days, start, end, weekdays);
        } else {
            holidayNote = `holidays.${result.status}`;
        }
    }

    const worked = Math.max(0, scheduled - holidays - daysOff);
    const hours = worked * hoursPerDay;
    const lines = [
        message("work.worked", { days: unit("units.days", worked, 1) }),
        message("work.hours", { hours: unit("units.hours", hours, 2) }),
    ];
    if (country && !holidayNote) {
        lines.push(
            message("work.holidays", {
                holidays: highlight(number(holidays, 0)),
            }),
        );
    }
    if (holidayNote) lines.push(message(holidayNote));
    if (scheduled > 0 && worked === 0) lines.push(message("work.allOff"));

    const eggs = eggsPerDay ? worked * eggsPerDay : 0;
    if (eggs > 0) {
        lines.push(message("work.eggs", { eggs: unit("units.eggs", eggs, 1) }));
    }
    if (rate !== null) {
        const pay = toCents(rate * hours);
        lines.push(message("work.pay", { amount: highlight(money(pay)) }));
        if (eggs > 0) {
            lines.push(
                message("work.perEgg", {
                    amount: highlight(money(Math.round(pay / eggs))),
                }),
            );
        }
    }
    return lines;
}
