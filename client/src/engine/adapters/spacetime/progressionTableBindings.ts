import type { Dispatch, SetStateAction } from 'react';
import type { Identity } from 'spacetimedb';
import type * as SpacetimeDB from '../../../generated/types';
import type { GameplayTableBindings } from './gameplayConnectionSetup';

type MapSetter<T> = Dispatch<SetStateAction<Map<string, T>>>;
type ValueSetter<T> = Dispatch<SetStateAction<T>>;

type ProgressionBindingKey =
  | 'player_stats'
  | 'achievement_definition'
  | 'player_achievement'
  | 'achievement_unlock_notification'
  | 'level_up_notification'
  | 'daily_login_notification'
  | 'progress_notification'
  | 'comparative_stat_notification'
  | 'leaderboard_entry'
  | 'daily_login_reward'
  | 'plant_config_definition'
  | 'player_discovered_plant'
  | 'alk_contract'
  | 'alk_player_contract'
  | 'alk_state'
  | 'player_shard_balance'
  | 'memory_grid_progress'
  | 'alk_station'
  | 'monument_part'
  | 'large_quarry';

type ProgressionTableBindingGroup = Pick<GameplayTableBindings, ProgressionBindingKey>;

interface CreateProgressionTableBindingsOptions {
  connectionIdentity: Identity | null;
  setPlayerStats: MapSetter<SpacetimeDB.PlayerStats>;
  setAchievementDefinitions: MapSetter<SpacetimeDB.AchievementDefinition>;
  setPlayerAchievements: MapSetter<SpacetimeDB.PlayerAchievement>;
  setAchievementUnlockNotifications: MapSetter<SpacetimeDB.AchievementUnlockNotification>;
  setLevelUpNotifications: MapSetter<SpacetimeDB.LevelUpNotification>;
  setDailyLoginNotifications: MapSetter<SpacetimeDB.DailyLoginNotification>;
  setProgressNotifications: MapSetter<SpacetimeDB.ProgressNotification>;
  setComparativeStatNotifications: MapSetter<SpacetimeDB.ComparativeStatNotification>;
  setLeaderboardEntries: MapSetter<SpacetimeDB.LeaderboardEntry>;
  setDailyLoginRewards: MapSetter<SpacetimeDB.DailyLoginReward>;
  setPlantConfigDefinitions: MapSetter<SpacetimeDB.PlantConfigDefinition>;
  setDiscoveredPlants: MapSetter<SpacetimeDB.PlayerDiscoveredPlant>;
  setAlkContracts: MapSetter<SpacetimeDB.AlkContract>;
  setAlkPlayerContracts: MapSetter<SpacetimeDB.AlkPlayerContract>;
  setAlkState: ValueSetter<SpacetimeDB.AlkState | null>;
  setPlayerShardBalance: MapSetter<SpacetimeDB.PlayerShardBalance>;
  setMemoryGridProgress: MapSetter<SpacetimeDB.MemoryGridProgress>;
  setAlkStations: MapSetter<SpacetimeDB.AlkStation>;
  setMonumentParts: MapSetter<any>;
  setLargeQuarries: MapSetter<any>;
}

function setMapEntry<T>(setter: MapSetter<T>, key: string, value: T): void {
  setter((prev) => new Map(prev).set(key, value));
}

function deleteMapEntry<T>(setter: MapSetter<T>, key: string): void {
  setter((prev) => {
    const next = new Map(prev);
    next.delete(key);
    return next;
  });
}

function createMapCrudHandlers<T>(
  setter: MapSetter<T>,
  keyOf: (value: T) => string,
) {
  return {
    onInsert: (_ctx: any, value: T) => {
      setMapEntry(setter, keyOf(value), value);
    },
    onUpdate: (_ctx: any, _oldValue: T, newValue: T) => {
      setMapEntry(setter, keyOf(newValue), newValue);
    },
    onDelete: (_ctx: any, value: T) => {
      deleteMapEntry(setter, keyOf(value));
    },
  };
}

function createLocalOnlyCrudHandlers<T extends { playerId: Identity }>(
  setter: MapSetter<T>,
  keyOf: (value: T) => string,
  connectionIdentity: Identity | null,
) {
  return {
    onInsert: (_ctx: any, value: T) => {
      if (connectionIdentity && value.playerId?.isEqual(connectionIdentity)) {
        setMapEntry(setter, keyOf(value), value);
      }
    },
    onUpdate: (_ctx: any, _oldValue: T, newValue: T) => {
      if (connectionIdentity && newValue.playerId?.isEqual(connectionIdentity)) {
        setMapEntry(setter, keyOf(newValue), newValue);
      }
    },
    onDelete: (_ctx: any, value: T) => {
      deleteMapEntry(setter, keyOf(value));
    },
  };
}

export function createProgressionTableBindings({
  connectionIdentity,
  setPlayerStats,
  setAchievementDefinitions,
  setPlayerAchievements,
  setAchievementUnlockNotifications,
  setLevelUpNotifications,
  setDailyLoginNotifications,
  setProgressNotifications,
  setComparativeStatNotifications,
  setLeaderboardEntries,
  setDailyLoginRewards,
  setPlantConfigDefinitions,
  setDiscoveredPlants,
  setAlkContracts,
  setAlkPlayerContracts,
  setAlkState,
  setPlayerShardBalance,
  setMemoryGridProgress,
  setAlkStations,
  setMonumentParts,
  setLargeQuarries,
}: CreateProgressionTableBindingsOptions): ProgressionTableBindingGroup {
  return {
    player_stats: createMapCrudHandlers(setPlayerStats, (stats) => stats.playerId.toHexString()),
    achievement_definition: createMapCrudHandlers(setAchievementDefinitions, (definition) => String(definition.id)),
    player_achievement: createMapCrudHandlers(setPlayerAchievements, (achievement) => achievement.id.toString()),
    achievement_unlock_notification: createLocalOnlyCrudHandlers(
      setAchievementUnlockNotifications,
      (notification) => notification.id.toString(),
      connectionIdentity,
    ),
    level_up_notification: createLocalOnlyCrudHandlers(
      setLevelUpNotifications,
      (notification) => notification.id.toString(),
      connectionIdentity,
    ),
    daily_login_notification: createLocalOnlyCrudHandlers(
      setDailyLoginNotifications,
      (notification) => notification.id.toString(),
      connectionIdentity,
    ),
    progress_notification: createLocalOnlyCrudHandlers(
      setProgressNotifications,
      (notification) => notification.id.toString(),
      connectionIdentity,
    ),
    comparative_stat_notification: createLocalOnlyCrudHandlers(
      setComparativeStatNotifications,
      (notification) => notification.id.toString(),
      connectionIdentity,
    ),
    leaderboard_entry: createMapCrudHandlers(setLeaderboardEntries, (entry) => entry.id.toString()),
    daily_login_reward: createMapCrudHandlers(setDailyLoginRewards, (reward) => reward.day.toString()),
    plant_config_definition: createMapCrudHandlers(
      setPlantConfigDefinitions,
      (config) => config.plantType?.tag || 'unknown',
    ),
    player_discovered_plant: {
      onInsert: (_ctx: any, discovery: SpacetimeDB.PlayerDiscoveredPlant) => {
        if (connectionIdentity && discovery.playerId.toHexString() === connectionIdentity.toHexString()) {
          setMapEntry(setDiscoveredPlants, discovery.plantType?.tag || 'unknown', discovery);
        }
      },
      onDelete: (_ctx: any, discovery: SpacetimeDB.PlayerDiscoveredPlant) => {
        deleteMapEntry(setDiscoveredPlants, discovery.plantType?.tag || 'unknown');
      },
    },
    alk_contract: createMapCrudHandlers(setAlkContracts, (contract) => contract.contractId.toString()),
    alk_player_contract: createMapCrudHandlers(setAlkPlayerContracts, (contract) => contract.id.toString()),
    alk_state: {
      onInsert: (_ctx: any, state: SpacetimeDB.AlkState) => {
        setAlkState(state);
      },
      onUpdate: (_ctx: any, _oldState: SpacetimeDB.AlkState, newState: SpacetimeDB.AlkState) => {
        setAlkState(newState);
      },
      onDelete: () => {
        setAlkState(null);
      },
    },
    player_shard_balance: createMapCrudHandlers(
      setPlayerShardBalance,
      (balance) => balance.playerId.toString(),
    ),
    memory_grid_progress: createMapCrudHandlers(
      setMemoryGridProgress,
      (progress) => progress.playerId.toString(),
    ),
    alk_station: createMapCrudHandlers(setAlkStations, (station) => station.stationId.toString()),
    monument_part: createMapCrudHandlers(setMonumentParts, (part) => part.id.toString()),
    large_quarry: createMapCrudHandlers(setLargeQuarries, (quarry) => quarry.id.toString()),
  };
}
