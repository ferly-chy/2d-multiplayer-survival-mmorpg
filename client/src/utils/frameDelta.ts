import type { MutableRefObject } from 'react';

const DEFAULT_MAX_DELTA_MS = 50;
const DEFAULT_RESUME_RESET_MS = 250;

/**
 * Clamp independent RAF loops so a hidden tab does not replay several seconds
 * of particle simulation in the first frame after focus returns.
 */
export function getClampedRafDeltaMs(
  nowMs: number,
  lastUpdateTimeRef: MutableRefObject<number>,
  maxDeltaMs = DEFAULT_MAX_DELTA_MS,
  resumeResetMs = DEFAULT_RESUME_RESET_MS,
): number {
  const rawDeltaMs = nowMs - lastUpdateTimeRef.current;
  lastUpdateTimeRef.current = nowMs;

  if (rawDeltaMs <= 0) return 0;
  if (rawDeltaMs > resumeResetMs) return 0;
  return Math.min(rawDeltaMs, maxDeltaMs);
}

