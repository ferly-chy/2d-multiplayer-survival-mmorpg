/**
 * Shared 0..1 GPU fire intensity ramp (lit / extinguished). Used by overlay emitters hook
 * and y-sort merge fallback so merge rows use the same ramp as the hook.
 */

import {
  CAMPFIRE_GPU_FIRE_RAMP_DOWN_MS,
  CAMPFIRE_GPU_FIRE_RAMP_UP_MS,
  CAMPFIRE_LIGHT_RAMP_UP_MS,
} from './campfireRenderingUtils';
import { isCampfireFireWebGLOverlayAvailable } from './campfireFireOverlayUtils';

const smoothed = new Map<string, number>();
/** Light/mask intensity: slow ramp up while burning (capped by fire), tracks fire01 when extinguishing. */
const lightSmoothed = new Map<string, number>();
let frameNowMs = -1;
let lastNowMs = 0;
let frameDt = 0;

/** Stable dt for all callers sharing the same performance.now() for this paint. */
export function getCampfireGpuFireDt(nowMs: number): number {
  if (nowMs !== frameNowMs) {
    frameDt =
      lastNowMs > 0 ? Math.min(120, Math.max(0, nowMs - lastNowMs)) : 0;
    lastNowMs = nowMs;
    frameNowMs = nowMs;
  }
  return frameDt;
}

export function stepCampfireGpuFire01(
  idKey: string,
  isBurning: boolean,
  dt: number,
): number {
  const target = isBurning ? 1 : 0;
  let f = smoothed.get(idKey) ?? 0;
  if (dt > 0) {
    if (f < target) {
      f = Math.min(target, f + dt / CAMPFIRE_GPU_FIRE_RAMP_UP_MS);
    } else if (f > target) {
      f = Math.max(target, f - dt / CAMPFIRE_GPU_FIRE_RAMP_DOWN_MS);
    }
  }
  smoothed.set(idKey, f);
  return f;
}

export function deleteCampfireGpuFire01(idKey: string): void {
  smoothed.delete(idKey);
  lightSmoothed.delete(idKey);
}

/** Drop `torch_*` ramp state when those players are no longer in the world map. */
export function pruneTorchGpuFireKeysNotIn(validTorchKeys: Set<string>): void {
  const toDelete: string[] = [];
  smoothed.forEach((_v, k) => {
    if (k.startsWith('torch_') && !validTorchKeys.has(k)) {
      toDelete.push(k);
    }
  });
  for (let i = 0; i < toDelete.length; i++) {
    deleteCampfireGpuFire01(toDelete[i]!);
  }
}

export function getCampfireGpuFire01(idKey: string): number {
  return smoothed.get(idKey) ?? 0;
}

export function getCampfireGpuLight01(idKey: string): number {
  return lightSmoothed.get(idKey) ?? 0;
}

/**
 * Call each frame after `stepCampfireGpuFire01` for the same id (hook + merge paths).
 * While burning: light rises slower than fire and never exceeds current `fire01`.
 * While extinguishing: light equals `fire01` (same ramp down as flame).
 */
export function syncCampfireGpuLight01(
  idKey: string,
  isBurning: boolean,
  dt: number,
  fire01: number,
): void {
  let L = lightSmoothed.get(idKey) ?? 0;
  if (!isBurning) {
    L = fire01;
  } else {
    if (dt > 0) {
      L = Math.min(1, L + dt / CAMPFIRE_LIGHT_RAMP_UP_MS);
    }
    L = Math.min(L, fire01);
  }
  lightSmoothed.set(idKey, L);
}

/**
 * Canvas lights + night mask. With GPU fire: uses `syncCampfireGpuLight01` state (slow brighten, fire-capped).
 * Without WebGL: instant from server isBurning.
 */
export function getPlacedCampfireLightIntensity01(
  isBurning: boolean,
  idKey: string,
): number {
  if (!isCampfireFireWebGLOverlayAvailable()) {
    return isBurning ? 1 : 0;
  }
  return getCampfireGpuLight01(idKey);
}
