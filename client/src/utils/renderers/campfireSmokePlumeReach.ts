/**
 * Client-side smoke plume buildup: tall transparent smoke ramps in over time after a fire is lit.
 * Module state — synced each frame from renderGameCanvasFrame (authoritative burning flags).
 */

const burningSinceMs = new Map<string, number>();

/** ~16s from spark to full column; ease-in so the top wisps appear late */
export const SMOKE_PLUME_BUILD_MS = 16000;

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * @param idToBurning — campfire id string -> currently burning (destroyed / absent = not burning)
 */
export function syncCampfireSmokePlumeBuild(idToBurning: Map<string, boolean>, nowMs: number): void {
  idToBurning.forEach((burning, id) => {
    if (burning) {
      if (!burningSinceMs.has(id)) burningSinceMs.set(id, nowMs);
    } else {
      burningSinceMs.delete(id);
    }
  });
  const dead: string[] = [];
  burningSinceMs.forEach((_, id) => {
    if (!idToBurning.has(id)) dead.push(id);
  });
  for (let i = 0; i < dead.length; i++) burningSinceMs.delete(dead[i]!);
}

/**
 * 0 = no tall plume yet, 1 = full height. Unknown id => 1 (monument / static ids not synced).
 */
export function getSmokePlumeReach01(id: string, nowMs: number): number {
  if (id.startsWith('static_')) return 1;
  const since = burningSinceMs.get(id);
  if (since === undefined) return 1;
  const t = (nowMs - since) / SMOKE_PLUME_BUILD_MS;
  return smoothstep01(t);
}

export function buildCampfireBurningStateMap(
  visibleCampfiresMap: Map<string, { isDestroyed?: boolean; isBurning?: boolean }> | undefined,
  ySortedEntities: readonly { type?: string; entity?: { id?: unknown; isBurning?: boolean; isMonument?: boolean } }[],
): Map<string, boolean> {
  const states = new Map<string, boolean>();
  visibleCampfiresMap?.forEach((c, id) => {
    if (c.isDestroyed) return;
    states.set(id, !!c.isBurning);
  });
  for (let i = 0; i < ySortedEntities.length; i++) {
    const item = ySortedEntities[i];
    if (!item || item.type !== 'campfire' || !item.entity || item.entity.isMonument) continue;
    const id = String(item.entity.id);
    const b = !!item.entity.isBurning;
    states.set(id, states.get(id) || b);
  }
  return states;
}
