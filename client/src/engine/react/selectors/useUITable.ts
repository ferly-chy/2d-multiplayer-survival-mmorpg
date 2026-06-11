/**
 * Selector hook to read a UI table from the engine store.
 * Use for read-only UI/runtime consumption; UI subscriptions remain the writer.
 */
import { useEngineSnapshot } from '../useEngineSnapshot';

const EMPTY_MAP = new Map();

export function useUITable<T>(key: string): T {
  return useEngineSnapshot(
    (snapshot) => (snapshot.ui.uiTables[key] as T | undefined) ?? (EMPTY_MAP as T)
  );
}
