/**
 * Selector hook for Chat's read-only runtime data.
 */
import type {
  AchievementDefinition,
  ActiveEquipment,
  ItemDefinition,
  InventoryItem,
  Message,
  Player,
  PlayerAchievement,
  PlayerStats,
  Recipe,
  WorldState,
} from '../../generated/types';
import { useEngineSnapshot } from '../react/useEngineSnapshot';

const EMPTY_MAP = new Map();

export function useChatRuntimeData(identityHex: string | null) {
  return useEngineSnapshot((snapshot) => {
    const worldTables = snapshot.world.tables;
    const uiTables = snapshot.ui.uiTables;
    const players = (worldTables.players as Map<string, Player> | undefined) ?? (EMPTY_MAP as Map<string, Player>);

    return {
      messages: (uiTables.messages as Map<string, Message> | undefined) ?? (EMPTY_MAP as Map<string, Message>),
      players,
      worldState: (worldTables.worldState as WorldState | null | undefined) ?? null,
      localPlayer: identityHex ? players.get(identityHex) : undefined,
      itemDefinitions: (worldTables.itemDefinitions as Map<string, ItemDefinition> | undefined) ?? (EMPTY_MAP as Map<string, ItemDefinition>),
      activeEquipments: (worldTables.activeEquipments as Map<string, ActiveEquipment> | undefined) ?? (EMPTY_MAP as Map<string, ActiveEquipment>),
      inventoryItems: (worldTables.inventoryItems as Map<string, InventoryItem> | undefined) ?? (EMPTY_MAP as Map<string, InventoryItem>),
      recipes: (worldTables.recipes as Map<string, Recipe> | undefined) ?? (EMPTY_MAP as Map<string, Recipe>),
      matronageMembers: (uiTables.matronageMembers as Map<string, unknown> | undefined) ?? EMPTY_MAP,
      matronages: (uiTables.matronages as Map<string, unknown> | undefined) ?? EMPTY_MAP,
      playerStats: (worldTables.playerStats as Map<string, PlayerStats> | undefined) ?? (EMPTY_MAP as Map<string, PlayerStats>),
      playerAchievements: (worldTables.playerAchievements as Map<string, PlayerAchievement> | undefined) ?? (EMPTY_MAP as Map<string, PlayerAchievement>),
      achievementDefinitions:
        (worldTables.achievementDefinitions as Map<string, AchievementDefinition> | undefined) ??
        (EMPTY_MAP as Map<string, AchievementDefinition>),
    };
  });
}
