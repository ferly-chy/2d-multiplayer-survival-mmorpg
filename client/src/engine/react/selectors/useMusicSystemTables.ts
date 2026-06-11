/**
 * Selector for music system tables. Reads from engine store.
 */
import { useEngineSnapshot } from '../useEngineSnapshot';
import type { MonumentPart, AlkStation } from '../../../generated/types';

const EMPTY_MAP = new Map();

export function useMusicSystemTables() {
  return useEngineSnapshot((s) => {
    const t = s.world.tables;
    return {
      monumentParts: (t['monumentParts'] ?? EMPTY_MAP) as Map<string, MonumentPart>,
      alkStations: (t['alkStations'] ?? EMPTY_MAP) as Map<string, AlkStation>,
    };
  });
}