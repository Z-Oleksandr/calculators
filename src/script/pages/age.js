import {
    calendarDiff,
    nextAnniversary,
    toISODate,
    today,
} from "../lib/dates.js";
import { highlight, longDate, message, number, unit } from "../i18n.js";
import { InputError } from "../dom.js";
import { dateValue } from "../form.js";

const HEARTBEATS_PER_MINUTE = 80;
const BREATHS_PER_MINUTE = 16;
const MILESTONE_STEP = 1000;

export function init(form) {
    form.elements.namedItem("birth").max = toISODate(today());
}

export function compute(form) {
    const birth = dateValue(form, "birth");
    const now = today();
    if (birth === null) throw new InputError("errors.invalidDate");
    if (birth > now) throw new InputError("errors.future");

    const age = calendarDiff(birth, now);
    const days = now - birth;
    const minutes = days * 24 * 60;
    const milestone = (Math.floor(days / MILESTONE_STEP) + 1) * MILESTONE_STEP;
    const milestoneDate = birth + milestone;
    const birthday = nextAnniversary(birth, now);

    const lines = [
        message("age.exact", {
            years: unit("units.years", age.years),
            months: unit("units.months", age.months),
            days: unit("units.days", age.days),
        }),
        message("age.total", {
            days: unit("units.days", days),
            hours: unit("units.hours", days * 24),
        }),
        message("age.body", {
            beats: highlight(number(minutes * HEARTBEATS_PER_MINUTE, 0)),
            breaths: highlight(number(minutes * BREATHS_PER_MINUTE, 0)),
        }),
        message("age.milestone", {
            n: highlight(number(milestone, 0)),
            date: highlight(longDate(milestoneDate)),
            days: unit("units.daysIn", milestoneDate - now),
        }),
    ];
    if (birthday === now && days > 0) {
        lines.push(message("age.birthdayToday"));
    } else if (birthday !== null) {
        lines.push(
            message("age.birthday", {
                days: unit("units.daysIn", birthday - now),
            }),
        );
    }
    return lines;
}
