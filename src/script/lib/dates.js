/**
 * Calendar maths on integer "day numbers" (days since 1970-01-01, UTC).
 * A date input holds a calendar date rather than an instant, so working on
 * plain day numbers keeps every calculation free of timezone and DST effects.
 */

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const THURSDAY = 4;

/** Upper bound for any date range the calculators accept (~200 years). */
export const MAX_RANGE_DAYS = 366 * 200;

function fromParts(year, month, day) {
    return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * @param {string} value "YYYY-MM-DD"
 * @returns {number|null} day number, or null if the value is not a real date
 */
export function parseISODate(value) {
    if (typeof value !== "string") return null;
    const match = ISO_DATE.exec(value);
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number);
    if (month < 1 || month > 12 || day < 1) return null;
    if (day > daysInMonth(year, month)) return null;
    return fromParts(year, month, day);
}

/** @returns {string} "YYYY-MM-DD" */
export function toISODate(dayNumber) {
    return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

/** @returns {{year: number, month: number, day: number}} month is 1-12 */
export function toParts(dayNumber) {
    const date = new Date(dayNumber * MS_PER_DAY);
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    };
}

/** Today's calendar date in the visitor's local timezone, as a day number. */
export function today(now = new Date()) {
    return fromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** @returns {number} 0 = Sunday ... 6 = Saturday */
export function weekday(dayNumber) {
    return (((dayNumber + THURSDAY) % 7) + 7) % 7;
}

/** Calendar days from start to end with both ends included. */
export function daysInclusive(start, end) {
    return end - start + 1;
}

/**
 * Days in [start, end] whose weekday is in `weekdays`. Runs in constant time:
 * whole weeks are multiplied out and at most six remaining days are checked.
 * @param {Iterable<number>} weekdays values 0-6
 */
export function countWeekdays(start, end, weekdays) {
    if (end < start) return 0;
    const set = new Set(weekdays);
    const fullWeeks = Math.floor(daysInclusive(start, end) / 7);
    let count = fullWeeks * set.size;
    for (let day = start + fullWeeks * 7; day <= end; day++) {
        if (set.has(weekday(day))) count++;
    }
    return count;
}

/** Distinct days from `days` that fall in [start, end] on one of `weekdays`. */
export function countDaysOnWeekdays(days, start, end, weekdays) {
    const set = new Set(weekdays);
    const matched = new Set();
    for (const day of days) {
        if (day >= start && day <= end && set.has(weekday(day))) {
            matched.add(day);
        }
    }
    return matched.size;
}

/** @returns {number[]} every calendar year touched by [start, end] */
export function yearsInRange(start, end) {
    const years = [];
    for (let y = toParts(start).year; y <= toParts(end).year; y++) {
        years.push(y);
    }
    return years;
}

/**
 * Adds whole months, clamping the day to the target month's length
 * (31 Jan + 1 month = 28/29 Feb).
 */
export function addMonths(dayNumber, months) {
    const { year, month, day } = toParts(dayNumber);
    const index = year * 12 + (month - 1) + months;
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    return fromParts(y, m, Math.min(day, daysInMonth(y, m)));
}

/**
 * Calendar difference between two dates (to >= from).
 * @returns {{years: number, months: number, days: number}}
 */
export function calendarDiff(from, to) {
    const a = toParts(from);
    const b = toParts(to);
    let months = (b.year - a.year) * 12 + (b.month - a.month);
    if (b.day < a.day) months -= 1;
    if (addMonths(from, months) > to) months -= 1;
    return {
        years: Math.floor(months / 12),
        months: months % 12,
        days: to - addMonths(from, months),
    };
}

/**
 * Next occurrence on or after `from` of the month and day of `birth`.
 * A 29 February birthday falls on 28 February in common years.
 */
export function nextAnniversary(birth, from) {
    const { month, day } = toParts(birth);
    const { year } = toParts(from);
    for (const y of [year, year + 1]) {
        const candidate = fromParts(y, month, Math.min(day, daysInMonth(y, month)));
        if (candidate >= from) return candidate;
    }
    return null;
}
