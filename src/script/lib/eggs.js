/**
 * Facts for a medium/large hen's egg (~58 g in shell, ~50 g edible),
 * based on USDA FoodData Central values.
 */
export const EGG = Object.freeze({
    massGrams: 58,
    proteinGrams: 6.3,
    kcal: 72,
    lengthCm: 5.7,
    eggsPerHenPerYear: 300,
    cartonSize: 10,
});

export const LIFE_EXPECTANCY_YEARS = 80;
const DAYS_PER_YEAR = 365.25;

/**
 * @param {number} count eggs eaten
 * @param {number|null} pricePerEgg null when unknown
 */
export function eggStats(count, pricePerEgg = null) {
    return {
        count,
        massKg: (count * EGG.massGrams) / 1000,
        proteinKg: (count * EGG.proteinGrams) / 1000,
        kcal: count * EGG.kcal,
        cartons: Math.ceil(count / EGG.cartonSize),
        stackMetres: (count * EGG.lengthCm) / 100,
        cost: pricePerEgg == null ? null : count * pricePerEgg,
    };
}

/** Laying hens needed to supply `eggsPerDay` all year round. */
export function hensNeeded(eggsPerDay) {
    return (eggsPerDay * 365) / EGG.eggsPerHenPerYear;
}

/**
 * Eggs still to be eaten between `ageYears` and LIFE_EXPECTANCY_YEARS.
 * @returns {number|null} null when the age is unknown or past the horizon
 */
export function lifetimeEggs(eggsPerDay, ageYears) {
    if (ageYears == null || ageYears >= LIFE_EXPECTANCY_YEARS) return null;
    return Math.round(
        eggsPerDay * (LIFE_EXPECTANCY_YEARS - ageYears) * DAYS_PER_YEAR
    );
}
