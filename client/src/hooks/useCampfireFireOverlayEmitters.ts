import { useCallback, useRef } from 'react';
import type { Campfire } from '../generated/types';
import {
  getPlacedCampfireFireAnchorWorld,
  getStaticMonumentCampfireFireAnchorWorld,
  CAMPFIRE_SMOKE_LINGER_MS,
} from '../utils/renderers/campfireRenderingUtils';
import type { CampfireFireGpuEmitter } from '../utils/renderers/campfireFireOverlayUtils';
import { MAX_EMITTERS } from '../utils/renderers/campfireFireWebGL';

export interface StaticCampfirePosition {
  id: string;
  posX: number;
  posY: number;
}

interface UseCampfireFireOverlayEmittersOptions {
  visibleCampfiresMap: Map<string, Campfire>;
  staticCampfires: StaticCampfirePosition[];
}

/**
 * Builds GPU emitter list each frame: burning fire + smoke, extinguish linger smoke, hot-zone darkening in shader.
 */
export function useCampfireFireOverlayEmitters({
  visibleCampfiresMap,
  staticCampfires,
}: UseCampfireFireOverlayEmittersOptions): (nowMs: number) => readonly CampfireFireGpuEmitter[] {
  const scratchRef = useRef<CampfireFireGpuEmitter[]>([]);
  const prevBurningRef = useRef<Map<string, boolean>>(new Map());
  const lingerUntilRef = useRef<Map<string, number>>(new Map());

  return useCallback(
    (nowMs: number): readonly CampfireFireGpuEmitter[] => {
      const out = scratchRef.current;
      out.length = 0;

      const visit = (idKey: string, anchorX: number, anchorY: number, isBurning: boolean, hotZone: boolean, scale: number) => {
        if (out.length >= MAX_EMITTERS) return;

        const wasBurning = prevBurningRef.current.get(idKey) ?? false;
        if (isBurning) {
          lingerUntilRef.current.delete(idKey);
        } else if (wasBurning && !isBurning) {
          lingerUntilRef.current.set(idKey, nowMs + CAMPFIRE_SMOKE_LINGER_MS);
        }
        prevBurningRef.current.set(idKey, isBurning);

        let smokeAmt = 0;
        if (isBurning) {
          smokeAmt = 1;
        } else {
          const until = lingerUntilRef.current.get(idKey);
          if (until !== undefined && nowMs < until) {
            smokeAmt = (until - nowMs) / CAMPFIRE_SMOKE_LINGER_MS;
          } else if (until !== undefined) {
            lingerUntilRef.current.delete(idKey);
          }
        }

        const fireAmt = isBurning ? 1 : 0;
        if (fireAmt <= 0 && smokeAmt <= 0) return;

        out.push({
          anchorX,
          anchorY,
          fireAmt,
          smokeAmt,
          hotBoost: isBurning && hotZone ? 1 : 0,
          scale,
        });
      };

      visibleCampfiresMap.forEach((campfire, idKey) => {
        if (campfire.isDestroyed) {
          prevBurningRef.current.delete(idKey);
          lingerUntilRef.current.delete(idKey);
          return;
        }
        const { x, y } = getPlacedCampfireFireAnchorWorld(campfire.posX, campfire.posY);
        visit(idKey, x, y, campfire.isBurning, campfire.isPlayerInHotZone ?? false, 1);
      });

      const staticIdKeys = new Set<string>();
      for (let i = 0; i < staticCampfires.length; i++) {
        const s = staticCampfires[i]!;
        const idKey = `static_${s.id}`;
        staticIdKeys.add(idKey);
        const { x, y } = getStaticMonumentCampfireFireAnchorWorld(s.posX, s.posY);
        visit(idKey, x, y, true, false, 2);
      }

      const dropStatic: string[] = [];
      const dropGone: string[] = [];
      prevBurningRef.current.forEach((_v, idKey) => {
        if (idKey.startsWith('static_')) {
          if (!staticIdKeys.has(idKey)) dropStatic.push(idKey);
        } else if (!visibleCampfiresMap.has(idKey)) {
          dropGone.push(idKey);
        }
      });
      for (let i = 0; i < dropStatic.length; i++) {
        const k = dropStatic[i]!;
        prevBurningRef.current.delete(k);
        lingerUntilRef.current.delete(k);
      }
      for (let i = 0; i < dropGone.length; i++) {
        const k = dropGone[i]!;
        prevBurningRef.current.delete(k);
        lingerUntilRef.current.delete(k);
      }

      return out;
    },
    [visibleCampfiresMap, staticCampfires],
  );
}
