// Honorific / forms-of-address drive gender & age band, then names & portraits match.

const POOLS = {
  paris: [
    { honorific: "Mademoiselle", gender: "female", ageBand: "adult" },
    { honorific: "Madame", gender: "female", ageBand: "adult" },
    { honorific: "Madame", gender: "female", ageBand: "elder" },
    { honorific: "Monsieur", gender: "male", ageBand: "adult" },
    { honorific: "Monsieur", gender: "male", ageBand: "elder" },
    { honorific: "Le Petit", gender: "male", ageBand: "child" },
    { honorific: "Little", gender: "female", ageBand: "child" },
    { honorific: "Mademoiselle", gender: "female", ageBand: "child" },
    { honorific: "Professeur", gender: "male", ageBand: "adult" },
    { honorific: "Maîtresse", gender: "female", ageBand: "adult" },
  ],
  london: [
    { honorific: "Lady", gender: "female", ageBand: "adult" },
    { honorific: "Lady", gender: "female", ageBand: "elder" },
    { honorific: "Lord", gender: "male", ageBand: "adult" },
    { honorific: "Lord", gender: "male", ageBand: "elder" },
    { honorific: "Sir", gender: "male", ageBand: "adult" },
    { honorific: "Sir", gender: "male", ageBand: "elder" },
    { honorific: "Miss", gender: "female", ageBand: "adult" },
    { honorific: "Mrs.", gender: "female", ageBand: "adult" },
    { honorific: "Mrs.", gender: "female", ageBand: "elder" },
    { honorific: "Mr.", gender: "male", ageBand: "adult" },
    { honorific: "Mr.", gender: "male", ageBand: "elder" },
    { honorific: "Young", gender: "male", ageBand: "child" },
    { honorific: "Little", gender: "female", ageBand: "child" },
  ],
  frontier_us: [
    { honorific: "Sheriff", gender: "male", ageBand: "adult" },
    { honorific: "Deputy", gender: "male", ageBand: "adult" },
    { honorific: "Miss", gender: "female", ageBand: "adult" },
    { honorific: "Mrs.", gender: "female", ageBand: "adult" },
    { honorific: "Mrs.", gender: "female", ageBand: "elder" },
    { honorific: "Mr.", gender: "male", ageBand: "adult" },
    { honorific: "Mr.", gender: "male", ageBand: "elder" },
    { honorific: "Reverend", gender: "male", ageBand: "elder" },
    { honorific: "Little", gender: "male", ageBand: "child" },
    { honorific: "Little", gender: "female", ageBand: "child" },
  ],
  ming_china: [
    { honorific: "Teacher", gender: "male", ageBand: "elder" },
    { honorific: "Teacher", gender: "female", ageBand: "elder" },
    { honorific: "Young Mistress", gender: "female", ageBand: "adult" },
    { honorific: "Young Master", gender: "male", ageBand: "adult" },
    { honorific: "Madam", gender: "female", ageBand: "adult" },
    { honorific: "Madam", gender: "female", ageBand: "elder" },
    { honorific: "Sir", gender: "male", ageBand: "adult" },
    { honorific: "Old Sir", gender: "male", ageBand: "elder" },
    { honorific: "Little", gender: "male", ageBand: "child" },
    { honorific: "Little", gender: "female", ageBand: "child" },
  ],
};

/**
 * @returns {{ honorific: string | null, gender: "male"|"female", ageBand: "elder"|"adult"|"child" }}
 */
export function pickHonorificForLocale(villageKey) {
  const pool = POOLS[villageKey];
  if (!pool?.length) {
    return {
      honorific: null,
      gender: Math.random() < 0.5 ? "female" : "male",
      ageBand: "adult",
    };
  }
  const hit = pool[Math.floor(Math.random() * pool.length)];
  return {
    honorific: hit.honorific,
    gender: hit.gender,
    ageBand: hit.ageBand,
  };
}
