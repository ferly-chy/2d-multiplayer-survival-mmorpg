/**
 * Shared day/night cycle constants for world lighting.
 * All lights (road lampposts, shipwreck glow, ALK compound, rune stones, campfires, etc.)
 * must use these thresholds so they turn on/off at the same time.
 *
 * Full cycle = dayDurationSeconds + nightDurationSeconds (shared/config/gameConfig.json).
 * Day (dawn through end of dusk) occupies twilightEveningStartProgress of linear progress;
 * night (twilight evening through twilight morning) occupies the remainder to 1.0.
 *
 * Key visual anchors (from gameConfig dayNight):
 * - morningClearProgress: lights off / clear day
 * - duskStartProgress: sunset overlay / lights on ramp
 * - twilightEveningStartProgress: deep evening / full night arc begins
 */
import { dayNightConfig } from './sharedGameConfig';

/** Keyframes and some client effects were authored when evening twilight started at 0.76. */
export const LEGACY_TWILIGHT_EVENING_START_PROGRESS = 0.76;

/** Map legacy 0–1 cycle keyframe progress to current shared thresholds (same phase order). */
export function mapLegacyCycleProgress(p: number): number {
  const twilight = dayNightConfig.twilightEveningStartProgress;
  if (p < LEGACY_TWILIGHT_EVENING_START_PROGRESS) {
    return p * (twilight / LEGACY_TWILIGHT_EVENING_START_PROGRESS);
  }
  return (
    twilight +
    (p - LEGACY_TWILIGHT_EVENING_START_PROGRESS) *
      ((1 - twilight) / (1 - LEGACY_TWILIGHT_EVENING_START_PROGRESS))
  );
}

/** When lights turn ON at dusk (sunset overlay starts) */
export const NIGHT_LIGHTS_ON = dayNightConfig.duskStartProgress;

/** When lights turn OFF at dawn (morning fully clear) */
export const NIGHT_LIGHTS_OFF = dayNightConfig.morningClearProgress;

/** Fade-in ends here (full intensity) - used for eerie light fade 0.72→0.80 */
export const LIGHT_FADE_FULL_AT = dayNightConfig.nightStartProgress;

/** Fade-out starts here - used for rune stone/shipwreck fade at end of night */
export const TWILIGHT_MORNING_FADE_START = dayNightConfig.twilightMorningStartProgress;

/** Twilight morning end (cycle end) */
export const TWILIGHT_MORNING_END = dayNightConfig.cycleEndProgress;

/** Server cadence for full moon cycles */
export const FULL_MOON_CYCLE_INTERVAL = dayNightConfig.fullMoonCycleInterval;

/**
 * Returns true when it's "night" - lights should be on.
 * Night = dusk onwards (>= 0.72) OR dawn (0 to 0.15).
 */
export function isNightTime(cycleProgress: number): boolean {
  return cycleProgress >= NIGHT_LIGHTS_ON || cycleProgress < NIGHT_LIGHTS_OFF;
}
