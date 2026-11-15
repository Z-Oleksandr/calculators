import { countDaysOnWeekdays, countWeekdays, today } from "../lib/dates.js";
import { highlight, message, number, unit } from "../i18n.js";
import { InputError } from "../dom.js";
import { dateValue, value } from "../form.js";
import { holidayDays, setupHolidayFields } from "../holidays.js";

const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5];
const SATURDAY = 6;
const MAX_EVENT_LENGTH = 60;

export function init(form) {
    return setupHolidayFields(form);
}

export async function compute(form) {
    const target = dateValue(form, "target");
    if (target === null) throw new InputError("errors.invalidDate");
    const now = today();
    const diff = target - now;
    if (diff === 0) return [message("countdown.today")];
    if (diff < 0)
        return [
            message("countdown.past", { days: unit("units.daysIn", -diff) }),
        ];

    const event = value(form, "event").trim().slice(0, MAX_EVENT_LENGTH);
    const lines = [
        event
            ? message("countdown.leftEvent", {
                  days: unit("units.days", diff),
                  event,
              })
            : message("countdown.left", { days: unit("units.days", diff) }),
    ];
    if (diff >= 7) {
        lines.push(
            message("countdown.weeks", {
                weeks: unit("units.weeks", Math.floor(diff / 7)),
                days: unit("units.days", diff % 7),
            }),
        );
    }

    const last = target - 1;
    let workdays = countWeekdays(now, last, MONDAY_TO_FRIDAY);
    const country = value(form, "country");
    let note = null;
    if (country) {
        const result = await holidayDays(
            country,
            value(form, "region"),
            now,
            last,
        );
        if (result.days) {
            workdays -= countDaysOnWeekdays(
                result.days,
                now,
                last,
                MONDAY_TO_FRIDAY,
            );
        } else {
            note = `holidays.${result.status}`;
        }
    }
    lines.push(
        message("countdown.workdays", {
            workdays: highlight(number(workdays, 0)),
        }),
    );
    if (note) lines.push(message(note));

    const weekends = countWeekdays(now, last, [SATURDAY]);
    if (weekends > 0) {
        lines.push(
            message("countdown.weekends", {
                weekends: highlight(number(weekends, 0)),
            }),
        );
    }
    return lines;
}
