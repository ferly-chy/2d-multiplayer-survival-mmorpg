import { getPlacedCampfireFireAnchorWorld } from './campfireRenderingUtils';
import type { CampfireFireGpuEmitter } from './campfireFireOverlayUtils';
import { MAX_EMITTERS } from './campfireFireWebGL';
import {
  getCampfireGpuFireDt,
  stepCampfireGpuFire01,
  syncCampfireGpuLight01,
} from './campfireGpuFireSmoothing';
import { getSmokePlumeReach01 } from './campfireSmokePlumeReach';

/**
 * Ensures burning placed campfires get GPU emitters even when visibleCampfiresMap
 * lags the same frame as ySortedEntities (stable Map refs from SpacetimeDB).
 * Skips isMonument rows — those use the static monument emitter list from the React hook.
 */
export function mergeCampfireFireEmittersWithYSort(
  base: readonly CampfireFireGpuEmitter[],
  ySortedEntities: readonly { type?: string; entity?: { id?: unknown; isDestroyed?: boolean; isBurning?: boolean; isMonument?: boolean; isPlayerInHotZone?: boolean; posX: number; posY: number } }[],
  nowMs: number,
): CampfireFireGpuEmitter[] {
  const out: CampfireFireGpuEmitter[] = base.length <= MAX_EMITTERS ? [...base] : base.slice(0, MAX_EMITTERS);
  if (out.length >= MAX_EMITTERS) return out;

  const dt = getCampfireGpuFireDt(nowMs);

  const used = new Set<string>();
  for (let i = 0; i < out.length; i++) {
    const e = out[i]!;
    used.add(`${Math.round(e.anchorX)}_${Math.round(e.anchorY)}_${e.scale}`);
  }

  for (let i = 0; i < ySortedEntities.length; i++) {
    if (out.length >= MAX_EMITTERS) break;
    const item = ySortedEntities[i];
    if (!item || item.type !== 'campfire') continue;
    const c = item.entity;
    if (!c || c.isDestroyed || !c.isBurning || c.isMonument) continue;

    const { x, y } = getPlacedCampfireFireAnchorWorld(c.posX, c.posY);
    const key = `${Math.round(x)}_${Math.round(y)}_1`;
    if (used.has(key)) continue;
    used.add(key);
    const cid = String(c.id);
    const f = stepCampfireGpuFire01(cid, true, dt);
    syncCampfireGpuLight01(cid, true, dt, f);
    const hot = c.isPlayerInHotZone ? Math.min(1, f * 1.25) : 0;
    out.push({
      anchorX: x,
      anchorY: y,
      fireAmt: f,
      smokeAmt: f,
      hotBoost: hot,
      scale: 1,
      smokePlumeReach01: getSmokePlumeReach01(cid, nowMs),
    });
  }

  return out;
}
