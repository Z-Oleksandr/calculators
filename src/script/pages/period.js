import { MAX_RANGE_DAYS, daysInclusive } from "../lib/dates.js";
import { InputError } from "../dom.js";
import { dateValue } from "../form.js";

/**
 * Reads and validates the start/end date pair.
 * @returns {{start: number, end: number}}
 */
export function readPeriod(form) {
    const start = dateValue(form, "start");
    const end = dateValue(form, "end");
    if (start === null || end === null) {
        throw new InputError("errors.invalidDate");
    }
    if (end < start) throw new InputError("errors.endBeforeStart");
    if (daysInclusive(start, end) > MAX_RANGE_DAYS) {
        throw new InputError("errors.rangeTooLong");
    }
    return { start, end };
}
