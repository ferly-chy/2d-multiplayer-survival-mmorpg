/**
 * Selector for sound system tables. Reads from engine store.
 */
import { useEngineSnapshot } from '../useEngineSnapshot';
import type { SoundEvent, ContinuousSound, ChunkWeather, Season } from '../../../generated/types';

const EMPTY_MAP = new Map();

export function useSoundSystemTables() {
  return useEngineSnapshot((s) => {
    const t = s.world.tables;
    return {
      soundEvents: (t['soundEvents'] ?? EMPTY_MAP) as Map<string, SoundEvent>,
      continuousSounds: (t['continuousSounds'] ?? EMPTY_MAP) as Map<string, ContinuousSound>,
      chunkWeather: (t['chunkWeather'] ?? EMPTY_MAP) as Map<string, ChunkWeather>,
      worldState: t['worldState'] as { currentSeason?: Season } | null,
    };
  });
}
