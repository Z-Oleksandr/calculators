/**
 * Boiling time after Charles D. H. Williams, "The Physics of Cooking an Egg":
 * t[min] = 0.451 * M^(2/3) * ln(0.76 * (Tegg - Twater) / (Tyolk - Twater))
 * with M the egg mass in grams and temperatures in degrees Celsius.
 */

export const EGG_SIZES = Object.freeze({ S: 48, M: 58, L: 68, XL: 78 });
export const START_TEMPS = Object.freeze({ fridge: 4, room: 20 });
export const DONENESS = Object.freeze({ soft: 64, medium: 70, hard: 80 });
export const MAX_ALTITUDE_M = 5000;

/** Approximate boiling point of water in degrees Celsius at `altitudeM` metres. */
export function boilingPoint(altitudeM) {
    return 100 - altitudeM / 300;
}

/**
 * @param {{size: string, start: string, doneness: string, altitude?: number}} input
 * @returns {number|null} whole seconds, or null for invalid input
 */
export function boilSeconds({ size, start, doneness, altitude = 0 }) {
    const mass = EGG_SIZES[size];
    const tEgg = START_TEMPS[start];
    const tYolk = DONENESS[doneness];
    if (!mass || tEgg === undefined || !tYolk) return null;
    if (!Number.isFinite(altitude) || altitude < 0 || altitude > MAX_ALTITUDE_M) {
        return null;
    }
    const tWater = boilingPoint(altitude);
    const minutes =
        0.451 *
        Math.cbrt(mass * mass) *
        Math.log((0.76 * (tEgg - tWater)) / (tYolk - tWater));
    return Math.round(minutes * 60);
}

/** Formats seconds as m:ss, e.g. 425 -> "7:05". */
export function formatClock(totalSeconds) {
    const s = Math.max(0, Math.ceil(totalSeconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
