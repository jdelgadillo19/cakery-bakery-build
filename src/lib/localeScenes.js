import { publicUrl } from "@/lib/publicUrl";

/**
 * Workday bakery backgrounds (768×512): same counter POV per locale.
 * `bgImage` on VILLAGES should point at `morning` for menus / static previews.
 */
export const LOCALE_SCENE_KEYS = ["paris", "london", "ming_china", "frontier_us"];

const SCENES = {
  paris: {
    morning: publicUrl("sprites/scenes/bakery_counter_montmartre_morning.png"),
    afternoon: publicUrl("sprites/scenes/bakery_counter_golden_hour.png"),
    night: publicUrl("sprites/scenes/bakery_counter_evening_lamps.png"),
    rain: publicUrl("sprites/scenes/bakery_counter_rainy_paris.png"),
  },
  london: {
    morning: publicUrl("sprites/scenes/london_counter_morning.png"),
    afternoon: publicUrl("sprites/scenes/london_counter_afternoon.png"),
    night: publicUrl("sprites/scenes/london_counter_night.png"),
    rain: publicUrl("sprites/scenes/london_counter_rain.png"),
  },
  ming_china: {
    morning: publicUrl("sprites/scenes/ming_china_counter_morning.png"),
    afternoon: publicUrl("sprites/scenes/ming_china_counter_afternoon.png"),
    night: publicUrl("sprites/scenes/ming_china_counter_night.png"),
    rain: publicUrl("sprites/scenes/ming_china_counter_rain.png"),
  },
  frontier_us: {
    morning: publicUrl("sprites/scenes/frontier_counter_morning.png"),
    afternoon: publicUrl("sprites/scenes/frontier_counter_afternoon.png"),
    night: publicUrl("sprites/scenes/frontier_counter_night.png"),
    rain: publicUrl("sprites/scenes/frontier_counter_rain.png"),
  },
};

/** @typedef {'morning'|'afternoon'|'night'} WorkdayScenePeriod */

/**
 * @param {string} villageKey
 * @param {{ period: WorkdayScenePeriod, raining?: boolean }} opts
 */
export function getWorkdaySceneUrl(villageKey, { period, raining = false }) {
  const pack = SCENES[villageKey] || SCENES.paris;
  if (raining && pack.rain) return pack.rain;
  return pack[period] || pack.morning;
}

export function getLocaleScenePack(villageKey) {
  return SCENES[villageKey] || SCENES.paris;
}

export function getDefaultVillageBgUrl(villageKey) {
  return getLocaleScenePack(villageKey).morning;
}
