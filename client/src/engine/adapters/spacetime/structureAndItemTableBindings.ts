import type { Identity } from 'spacetimedb';
import type * as SpacetimeDB from '../../../generated/types';
import type { RangedWeaponStats as SpacetimeDBRangedWeaponStats } from '../../../generated/types';
import type { GameplayTableBindings } from './gameplayConnectionSetup';
import type { StateSetter } from '../../types';

type MapSetter<T> = StateSetter<Map<string, T>>;
type ValueSetter<T> = StateSetter<T>;

type StructuresBindingKey =
  | 'barbecue'
  | 'furnace'
  | 'lantern'
  | 'turret'
  | 'homestead_hearth'
  | 'broth_pot'
  | 'wooden_storage_box'
  | 'sleeping_bag'
  | 'stash'
  | 'rain_collector'
  | 'shelter'
  | 'barrel'
  | 'road_lamppost'
  | 'foundation_cell'
  | 'wall_cell'
  | 'door'
  | 'fence';

type ItemsBindingKey =
  | 'item_definition'
  | 'inventory_item'
  | 'active_equipment'
  | 'recipe'
  | 'crafting_queue_item'
  | 'active_consumable_effect'
  | 'ranged_weapon_stats'
  | 'player_drinking_cooldown'
  | 'minimap_cache';

type StructuresTableBindingGroup = Pick<GameplayTableBindings, StructuresBindingKey>;
type ItemsTableBindingGroup = Pick<GameplayTableBindings, ItemsBindingKey>;

interface CreateStructuresTableBindingsOptions {
  connectionIdentity: Identity | null;
  cancelPlacement: () => void;
  setBarbecues: MapSetter<SpacetimeDB.Barbecue>;
  setFurnaces: MapSetter<SpacetimeDB.Furnace>;
  setLanterns: MapSetter<SpacetimeDB.Lantern>;
  setTurrets: MapSetter<SpacetimeDB.Turret>;
  setHomesteadHearths: MapSetter<SpacetimeDB.HomesteadHearth>;
  setBrothPots: MapSetter<SpacetimeDB.BrothPot>;
  setWoodenStorageBoxes: MapSetter<SpacetimeDB.WoodenStorageBox>;
  setSleepingBags: MapSetter<SpacetimeDB.SleepingBag>;
  setStashes: MapSetter<SpacetimeDB.Stash>;
  setRainCollectors: MapSetter<SpacetimeDB.RainCollector>;
  setShelters: MapSetter<SpacetimeDB.Shelter>;
  setBarrels: MapSetter<SpacetimeDB.Barrel>;
  setRoadLampposts: MapSetter<SpacetimeDB.RoadLamppost>;
  setFoundationCells: MapSetter<SpacetimeDB.FoundationCell>;
  setWallCells: MapSetter<SpacetimeDB.WallCell>;
  setDoors: MapSetter<SpacetimeDB.Door>;
  setFences: MapSetter<SpacetimeDB.Fence>;
}

interface CreateItemsTableBindingsOptions {
  setItemDefinitions: MapSetter<SpacetimeDB.ItemDefinition>;
  setInventoryItems: MapSetter<SpacetimeDB.InventoryItem>;
  setActiveEquipments: MapSetter<SpacetimeDB.ActiveEquipment>;
  setRecipes: MapSetter<SpacetimeDB.Recipe>;
  setCraftingQueueItems: MapSetter<SpacetimeDB.CraftingQueueItem>;
  setActiveConsumableEffects: MapSetter<SpacetimeDB.ActiveConsumableEffect>;
  setRangedWeaponStats: MapSetter<SpacetimeDBRangedWeaponStats>;
  setPlayerDrinkingCooldowns: MapSetter<SpacetimeDB.PlayerDrinkingCooldown>;
  setMinimapCache: ValueSetter<SpacetimeDB.MinimapCache | null>;
}

function upsertMapState<T>(setter: MapSetter<T>, key: string, value: T): void {
  setter((prev) => {
    if (prev.get(key) === value) return prev;
    const next = new Map(prev);
    next.set(key, value);
    return next;
  });
}

function replaceMapEntry<T>(setter: MapSetter<T>, key: string, value: T): void {
  setter((prev) => new Map(prev).set(key, value));
}

function deleteMapEntry<T>(setter: MapSetter<T>, key: string): void {
  setter((prev) => {
    const next = new Map(prev);
    next.delete(key);
    return next;
  });
}

function maybeCancelPlacement(
  connectionIdentity: Identity | null,
  placedBy: Identity | null | undefined,
  cancelPlacement: () => void,
): void {
  if (connectionIdentity && placedBy && placedBy.isEqual(connectionIdentity)) {
    cancelPlacement();
  }
}

function createPlacementCrudHandlers<T extends { placedBy?: Identity }>(
  setter: MapSetter<T>,
  keyOf: (value: T) => string,
  connectionIdentity: Identity | null,
  cancelPlacement: () => void,
) {
  return {
    onInsert: (_ctx: any, value: T) => {
      replaceMapEntry(setter, keyOf(value), value);
      maybeCancelPlacement(connectionIdentity, value.placedBy, cancelPlacement);
    },
    onUpdate: (_ctx: any, _oldValue: T, newValue: T) => {
      replaceMapEntry(setter, keyOf(newValue), newValue);
    },
    onDelete: (_ctx: any, value: T) => {
      deleteMapEntry(setter, keyOf(value));
    },
  };
}

export function createStructuresTableBindings({
  connectionIdentity,
  cancelPlacement,
  setBarbecues,
  setFurnaces,
  setLanterns,
  setTurrets,
  setHomesteadHearths,
  setBrothPots,
  setWoodenStorageBoxes,
  setSleepingBags,
  setStashes,
  setRainCollectors,
  setShelters,
  setBarrels,
  setRoadLampposts,
  setFoundationCells,
  setWallCells,
  setDoors,
  setFences,
}: CreateStructuresTableBindingsOptions): StructuresTableBindingGroup {
  return {
    barbecue: createPlacementCrudHandlers(setBarbecues, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    furnace: createPlacementCrudHandlers(setFurnaces, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    lantern: createPlacementCrudHandlers(setLanterns, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    turret: createPlacementCrudHandlers(setTurrets, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    homestead_hearth: createPlacementCrudHandlers(setHomesteadHearths, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    broth_pot: createPlacementCrudHandlers(setBrothPots, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    wooden_storage_box: createPlacementCrudHandlers(setWoodenStorageBoxes, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    sleeping_bag: createPlacementCrudHandlers(setSleepingBags, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    stash: createPlacementCrudHandlers(setStashes, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    rain_collector: createPlacementCrudHandlers(setRainCollectors, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    shelter: createPlacementCrudHandlers(setShelters, (value) => value.id.toString(), connectionIdentity, cancelPlacement),
    barrel: {
      onInsert: (_ctx: any, barrel: SpacetimeDB.Barrel) => replaceMapEntry(setBarrels, barrel.id.toString(), barrel),
      onUpdate: (_ctx: any, oldBarrel: SpacetimeDB.Barrel, newBarrel: SpacetimeDB.Barrel) => {
        const visuallySignificant =
          Math.abs(oldBarrel.posX - newBarrel.posX) > 0.1 ||
          Math.abs(oldBarrel.posY - newBarrel.posY) > 0.1 ||
          Math.abs(oldBarrel.health - newBarrel.health) > 0.1 ||
          oldBarrel.variant !== newBarrel.variant ||
          (oldBarrel.respawnAt?.microsSinceUnixEpoch ?? 0n) !== (newBarrel.respawnAt?.microsSinceUnixEpoch ?? 0n) ||
          (oldBarrel.lastHitTime?.microsSinceUnixEpoch ?? 0n) !== (newBarrel.lastHitTime?.microsSinceUnixEpoch ?? 0n);
        if (visuallySignificant) {
          replaceMapEntry(setBarrels, newBarrel.id.toString(), newBarrel);
        }
      },
      onDelete: (_ctx: any, barrel: SpacetimeDB.Barrel) => deleteMapEntry(setBarrels, barrel.id.toString()),
    },
    road_lamppost: {
      onInsert: (_ctx: any, lamppost: SpacetimeDB.RoadLamppost) => replaceMapEntry(setRoadLampposts, lamppost.id.toString(), lamppost),
      onUpdate: (_ctx: any, _old: SpacetimeDB.RoadLamppost, newLamppost: SpacetimeDB.RoadLamppost) =>
        replaceMapEntry(setRoadLampposts, newLamppost.id.toString(), newLamppost),
      onDelete: (_ctx: any, lamppost: SpacetimeDB.RoadLamppost) => deleteMapEntry(setRoadLampposts, lamppost.id.toString()),
    },
    foundation_cell: {
      onInsert: (_ctx: any, foundation: SpacetimeDB.FoundationCell) => replaceMapEntry(setFoundationCells, foundation.id.toString(), foundation),
      onUpdate: (_ctx: any, oldFoundation: SpacetimeDB.FoundationCell, newFoundation: SpacetimeDB.FoundationCell) => {
        const visuallySignificant =
          oldFoundation.cellX !== newFoundation.cellX ||
          oldFoundation.cellY !== newFoundation.cellY ||
          oldFoundation.shape !== newFoundation.shape ||
          oldFoundation.tier !== newFoundation.tier ||
          Math.abs(oldFoundation.health - newFoundation.health) > 0.1 ||
          oldFoundation.isDestroyed !== newFoundation.isDestroyed;
        if (visuallySignificant) {
          replaceMapEntry(setFoundationCells, newFoundation.id.toString(), newFoundation);
        }
      },
      onDelete: (_ctx: any, foundation: SpacetimeDB.FoundationCell) => deleteMapEntry(setFoundationCells, foundation.id.toString()),
    },
    wall_cell: {
      onInsert: (_ctx: any, wall: SpacetimeDB.WallCell) => {
        console.log(`[Wall Insert] Wall inserted: id=${wall.id.toString()}, cellX=${wall.cellX}, cellY=${wall.cellY}, edge=${wall.edge}, chunk=${wall.chunkIndex}`);
        setWallCells((prev) => {
          const next = new Map(prev);
          next.set(wall.id.toString(), wall);
          console.log(`[Wall Insert] Map size changed from ${prev.size} to ${next.size}`);
          return next;
        });
      },
      onUpdate: (_ctx: any, oldWall: SpacetimeDB.WallCell, newWall: SpacetimeDB.WallCell) => {
        const visuallySignificant =
          oldWall.cellX !== newWall.cellX ||
          oldWall.cellY !== newWall.cellY ||
          oldWall.edge !== newWall.edge ||
          oldWall.facing !== newWall.facing ||
          oldWall.tier !== newWall.tier ||
          Math.abs(oldWall.health - newWall.health) > 0.1 ||
          oldWall.isDestroyed !== newWall.isDestroyed;
        if (visuallySignificant) {
          replaceMapEntry(setWallCells, newWall.id.toString(), newWall);
        }
      },
      onDelete: (_ctx: any, wall: SpacetimeDB.WallCell) => deleteMapEntry(setWallCells, wall.id.toString()),
    },
    door: {
      onInsert: (_ctx: any, door: SpacetimeDB.Door) => {
        console.log(`[Door Insert] Door inserted: id=${door.id.toString()}, cellX=${door.cellX}, cellY=${door.cellY}, edge=${door.edge}, isOpen=${door.isOpen}`);
        replaceMapEntry(setDoors, door.id.toString(), door);
      },
      onUpdate: (_ctx: any, oldDoor: SpacetimeDB.Door, newDoor: SpacetimeDB.Door) => {
        const visuallySignificant =
          oldDoor.posX !== newDoor.posX ||
          oldDoor.posY !== newDoor.posY ||
          oldDoor.isOpen !== newDoor.isOpen ||
          oldDoor.health !== newDoor.health ||
          oldDoor.isDestroyed !== newDoor.isDestroyed;
        if (visuallySignificant) {
          replaceMapEntry(setDoors, newDoor.id.toString(), newDoor);
        }
      },
      onDelete: (_ctx: any, door: SpacetimeDB.Door) => deleteMapEntry(setDoors, door.id.toString()),
    },
    fence: {
      onInsert: (_ctx: any, fence: SpacetimeDB.Fence) => replaceMapEntry(setFences, fence.id.toString(), fence),
      onUpdate: (_ctx: any, oldFence: SpacetimeDB.Fence, newFence: SpacetimeDB.Fence) => {
        const visuallySignificant =
          Math.abs(oldFence.posX - newFence.posX) > 0.1 ||
          Math.abs(oldFence.posY - newFence.posY) > 0.1 ||
          oldFence.edge !== newFence.edge ||
          oldFence.health !== newFence.health ||
          oldFence.isDestroyed !== newFence.isDestroyed;
        if (visuallySignificant) {
          replaceMapEntry(setFences, newFence.id.toString(), newFence);
        }
      },
      onDelete: (_ctx: any, fence: SpacetimeDB.Fence) => deleteMapEntry(setFences, fence.id.toString()),
    },
  };
}

export function createItemsTableBindings({
  setItemDefinitions,
  setInventoryItems,
  setActiveEquipments,
  setRecipes,
  setCraftingQueueItems,
  setActiveConsumableEffects,
  setRangedWeaponStats,
  setPlayerDrinkingCooldowns,
  setMinimapCache,
}: CreateItemsTableBindingsOptions): ItemsTableBindingGroup {
  return {
    item_definition: {
      onInsert: (_ctx: any, itemDef: SpacetimeDB.ItemDefinition) => replaceMapEntry(setItemDefinitions, itemDef.id.toString(), itemDef),
      onUpdate: (_ctx: any, _oldDef: SpacetimeDB.ItemDefinition, newDef: SpacetimeDB.ItemDefinition) => replaceMapEntry(setItemDefinitions, newDef.id.toString(), newDef),
      onDelete: (_ctx: any, itemDef: SpacetimeDB.ItemDefinition) => deleteMapEntry(setItemDefinitions, itemDef.id.toString()),
    },
    inventory_item: {
      onInsert: (_ctx: any, invItem: SpacetimeDB.InventoryItem) => upsertMapState(setInventoryItems, invItem.instanceId.toString(), invItem),
      onUpdate: (_ctx: any, _oldItem: SpacetimeDB.InventoryItem, newItem: SpacetimeDB.InventoryItem) => upsertMapState(setInventoryItems, newItem.instanceId.toString(), newItem),
      onDelete: (_ctx: any, invItem: SpacetimeDB.InventoryItem) => deleteMapEntry(setInventoryItems, invItem.instanceId.toString()),
    },
    active_equipment: {
      onInsert: (_ctx: any, equip: SpacetimeDB.ActiveEquipment) => replaceMapEntry(setActiveEquipments, equip.playerIdentity.toHexString(), equip),
      onUpdate: (_ctx: any, _oldEquip: SpacetimeDB.ActiveEquipment, newEquip: SpacetimeDB.ActiveEquipment) => replaceMapEntry(setActiveEquipments, newEquip.playerIdentity.toHexString(), newEquip),
      onDelete: (_ctx: any, equip: SpacetimeDB.ActiveEquipment) => deleteMapEntry(setActiveEquipments, equip.playerIdentity.toHexString()),
    },
    recipe: {
      onInsert: (_ctx: any, recipe: SpacetimeDB.Recipe) => replaceMapEntry(setRecipes, recipe.recipeId.toString(), recipe),
      onUpdate: (_ctx: any, _oldRecipe: SpacetimeDB.Recipe, newRecipe: SpacetimeDB.Recipe) => replaceMapEntry(setRecipes, newRecipe.recipeId.toString(), newRecipe),
      onDelete: (_ctx: any, recipe: SpacetimeDB.Recipe) => deleteMapEntry(setRecipes, recipe.recipeId.toString()),
    },
    crafting_queue_item: {
      onInsert: (_ctx: any, queueItem: SpacetimeDB.CraftingQueueItem) => replaceMapEntry(setCraftingQueueItems, queueItem.queueItemId.toString(), queueItem),
      onUpdate: (_ctx: any, _oldItem: SpacetimeDB.CraftingQueueItem, newItem: SpacetimeDB.CraftingQueueItem) => replaceMapEntry(setCraftingQueueItems, newItem.queueItemId.toString(), newItem),
      onDelete: (_ctx: any, queueItem: SpacetimeDB.CraftingQueueItem) => deleteMapEntry(setCraftingQueueItems, queueItem.queueItemId.toString()),
    },
    active_consumable_effect: {
      onInsert: (_ctx: any, effect: SpacetimeDB.ActiveConsumableEffect) => replaceMapEntry(setActiveConsumableEffects, effect.effectId.toString(), effect),
      onUpdate: (_ctx: any, _oldEffect: SpacetimeDB.ActiveConsumableEffect, newEffect: SpacetimeDB.ActiveConsumableEffect) => replaceMapEntry(setActiveConsumableEffects, newEffect.effectId.toString(), newEffect),
      onDelete: (_ctx: any, effect: SpacetimeDB.ActiveConsumableEffect) => deleteMapEntry(setActiveConsumableEffects, effect.effectId.toString()),
    },
    ranged_weapon_stats: {
      onInsert: (_ctx: any, stats: SpacetimeDBRangedWeaponStats) => replaceMapEntry(setRangedWeaponStats, stats.itemName, stats),
      onUpdate: (_ctx: any, _oldStats: SpacetimeDBRangedWeaponStats, newStats: SpacetimeDBRangedWeaponStats) => replaceMapEntry(setRangedWeaponStats, newStats.itemName, newStats),
      onDelete: (_ctx: any, stats: SpacetimeDBRangedWeaponStats) => deleteMapEntry(setRangedWeaponStats, stats.itemName),
    },
    player_drinking_cooldown: {
      onInsert: (_ctx: any, cooldown: SpacetimeDB.PlayerDrinkingCooldown) => replaceMapEntry(setPlayerDrinkingCooldowns, cooldown.playerId.toHexString(), cooldown),
      onUpdate: (_ctx: any, _oldCooldown: SpacetimeDB.PlayerDrinkingCooldown, newCooldown: SpacetimeDB.PlayerDrinkingCooldown) => replaceMapEntry(setPlayerDrinkingCooldowns, newCooldown.playerId.toHexString(), newCooldown),
      onDelete: (_ctx: any, cooldown: SpacetimeDB.PlayerDrinkingCooldown) => deleteMapEntry(setPlayerDrinkingCooldowns, cooldown.playerId.toHexString()),
    },
    minimap_cache: {
      onInsert: (_ctx: any, cache: SpacetimeDB.MinimapCache) => setMinimapCache(cache),
      onUpdate: (_ctx: any, _oldCache: SpacetimeDB.MinimapCache, newCache: SpacetimeDB.MinimapCache) => setMinimapCache(newCache),
      onDelete: () => setMinimapCache(null),
    },
  };
}
