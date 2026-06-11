/**
 * Selector hook for ALK delivery panel read-only runtime data.
 */
import type {
  AlkContract,
  AlkPlayerContract,
  AlkState,
  AlkStation,
  InventoryItem,
  ItemDefinition,
  PlayerShardBalance,
} from '../../../generated/types';
import { useEngineSnapshot } from '../useEngineSnapshot';

const EMPTY_MAP = new Map();

export function useAlkPanelRuntimeData() {
  return useEngineSnapshot((snapshot) => {
    const worldTables = snapshot.world.tables;
    const uiTables = snapshot.ui.uiTables;
    return {
      alkStations: (worldTables.alkStations as Map<string, AlkStation> | undefined) ?? (EMPTY_MAP as Map<string, AlkStation>),
      alkContracts: (worldTables.alkContracts as Map<string, AlkContract> | undefined) ?? (EMPTY_MAP as Map<string, AlkContract>),
      alkPlayerContracts:
        (worldTables.alkPlayerContracts as Map<string, AlkPlayerContract> | undefined) ??
        (EMPTY_MAP as Map<string, AlkPlayerContract>),
      alkState: (worldTables.alkState as AlkState | null | undefined) ?? null,
      playerShardBalance:
        (worldTables.playerShardBalance as Map<string, PlayerShardBalance> | undefined) ??
        (EMPTY_MAP as Map<string, PlayerShardBalance>),
      itemDefinitions:
        (worldTables.itemDefinitions as Map<string, ItemDefinition> | undefined) ??
        (EMPTY_MAP as Map<string, ItemDefinition>),
      inventoryItems:
        (worldTables.inventoryItems as Map<string, InventoryItem> | undefined) ??
        (EMPTY_MAP as Map<string, InventoryItem>),
      matronageMembers: (uiTables.matronageMembers as Map<string, unknown> | undefined) ?? EMPTY_MAP,
      matronages: (uiTables.matronages as Map<string, unknown> | undefined) ?? EMPTY_MAP,
    };
  });
}
