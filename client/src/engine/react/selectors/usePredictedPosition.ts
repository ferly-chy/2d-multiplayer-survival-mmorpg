/**
 * Selector for predicted position from engine store.
 * GameCanvas writes this each frame; use as fallback when prediction hooks live in child components.
 */
import { useEngineSnapshot } from '../useEngineSnapshot';

export function usePredictedPosition(
  fallback: { x: number; y: number } | null
): { x: number; y: number } | null {
  return useEngineSnapshot((s) => s.world.predictedPosition ?? fallback);
}
