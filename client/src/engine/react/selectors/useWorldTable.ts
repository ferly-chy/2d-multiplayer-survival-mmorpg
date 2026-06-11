/**
 * Selector hook to read a world table from the engine store.
 * Use for read-only consumption; useSpacetimeTables remains the writer.
 */
import { useEngineSnapshot } from '../useEngineSnapshot';

export function useWorldTable<T>(key: string): T {
  return useEngineSnapshot(
    (snapshot) => (snapshot.world.tables[key] as T | undefined) ?? (new Map() as T)
  );
}
