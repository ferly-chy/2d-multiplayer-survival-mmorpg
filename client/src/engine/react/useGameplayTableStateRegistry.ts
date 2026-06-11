import { useCallback, useRef } from 'react';
import * as SpacetimeDB from '../../generated/types';
import type {
  Projectile as SpacetimeDBProjectile,
  RangedWeaponStats as SpacetimeDBRangedWeaponStats,
} from '../../generated/types';
import { useEngineWorldTableState } from './useEngineStoreState';

export function useGameplayTableStateRegistry() {
  const [players, setPlayers] = useEngineWorldTableState<Map<string, SpacetimeDB.Player>>('players', () => new Map());
  const [trees, setTrees] = useEngineWorldTableState<Map<string, SpacetimeDB.Tree>>('trees', () => new Map());
  const [stones, setStones] = useEngineWorldTableState<Map<string, SpacetimeDB.Stone>>('stones', () => new Map());
  const [runeStones, setRuneStones] = useEngineWorldTableState<Map<string, SpacetimeDB.RuneStone>>('runeStones', () => new Map());
  const [cairns, setCairns] = useEngineWorldTableState<Map<string, SpacetimeDB.Cairn>>('cairns', () => new Map());
  const [playerDiscoveredCairns, setPlayerDiscoveredCairns] = useEngineWorldTableState<Map<string, SpacetimeDB.PlayerDiscoveredCairn>>('playerDiscoveredCairns', () => new Map());
  const [campfires, setCampfires] = useEngineWorldTableState<Map<string, SpacetimeDB.Campfire>>('campfires', () => new Map());
  const [furnaces, setFurnaces] = useEngineWorldTableState<Map<string, SpacetimeDB.Furnace>>('furnaces', () => new Map());
  const [barbecues, setBarbecues] = useEngineWorldTableState<Map<string, SpacetimeDB.Barbecue>>('barbecues', () => new Map());
  const [lanterns, setLanterns] = useEngineWorldTableState<Map<string, SpacetimeDB.Lantern>>('lanterns', () => new Map());
  const [turrets, setTurrets] = useEngineWorldTableState<Map<string, SpacetimeDB.Turret>>('turrets', () => new Map());
  const [homesteadHearths, setHomesteadHearths] = useEngineWorldTableState<Map<string, SpacetimeDB.HomesteadHearth>>('homesteadHearths', () => new Map());
  const [brothPots, setBrothPots] = useEngineWorldTableState<Map<string, SpacetimeDB.BrothPot>>('brothPots', () => new Map());
  const [harvestableResources, setHarvestableResources] = useEngineWorldTableState<Map<string, SpacetimeDB.HarvestableResource>>('harvestableResources', () => new Map());
  const [plantedSeeds, setPlantedSeeds] = useEngineWorldTableState<Map<string, SpacetimeDB.PlantedSeed>>('plantedSeeds', () => new Map());
  const [itemDefinitions, setItemDefinitions] = useEngineWorldTableState<Map<string, SpacetimeDB.ItemDefinition>>('itemDefinitions', () => new Map());
  const [inventoryItems, setInventoryItems] = useEngineWorldTableState<Map<string, SpacetimeDB.InventoryItem>>('inventoryItems', () => new Map());
  const [worldState, setWorldState] = useEngineWorldTableState<SpacetimeDB.WorldState | null>('worldState', () => null);
  const [activeEquipments, setActiveEquipments] = useEngineWorldTableState<Map<string, SpacetimeDB.ActiveEquipment>>('activeEquipments', () => new Map());
  const [droppedItems, setDroppedItems] = useEngineWorldTableState<Map<string, SpacetimeDB.DroppedItem>>('droppedItems', () => new Map());
  const [woodenStorageBoxes, setWoodenStorageBoxes] = useEngineWorldTableState<Map<string, SpacetimeDB.WoodenStorageBox>>('woodenStorageBoxes', () => new Map());
  const [recipes, setRecipes] = useEngineWorldTableState<Map<string, SpacetimeDB.Recipe>>('recipes', () => new Map());
  const [craftingQueueItems, setCraftingQueueItems] = useEngineWorldTableState<Map<string, SpacetimeDB.CraftingQueueItem>>('craftingQueueItems', () => new Map());
  const [localPlayerRegistered, setLocalPlayerRegistered] = useEngineWorldTableState<boolean>('localPlayerRegistered', () => false);
  const [sleepingBags, setSleepingBags] = useEngineWorldTableState<Map<string, SpacetimeDB.SleepingBag>>('sleepingBags', () => new Map());
  const [playerCorpses, setPlayerCorpses] = useEngineWorldTableState<Map<string, SpacetimeDB.PlayerCorpse>>('playerCorpses', () => new Map());
  const [stashes, setStashes] = useEngineWorldTableState<Map<string, SpacetimeDB.Stash>>('stashes', () => new Map());
  const [rainCollectors, setRainCollectors] = useEngineWorldTableState<Map<string, SpacetimeDB.RainCollector>>('rainCollectors', () => new Map());
  const [waterPatches, setWaterPatches] = useEngineWorldTableState<Map<string, SpacetimeDB.WaterPatch>>('waterPatches', () => new Map());
  const [fertilizerPatches, setFertilizerPatches] = useEngineWorldTableState<Map<string, SpacetimeDB.FertilizerPatch>>('fertilizerPatches', () => new Map());
  const [firePatches, setFirePatches] = useEngineWorldTableState<Map<string, SpacetimeDB.FirePatch>>('firePatches', () => new Map());
  const [placedExplosives, setPlacedExplosives] = useEngineWorldTableState<Map<string, SpacetimeDB.PlacedExplosive>>('placedExplosives', () => new Map());
  const [hotSprings, setHotSprings] = useEngineWorldTableState<Map<string, any>>('hotSprings', () => new Map());
  const [activeConsumableEffects, setActiveConsumableEffects] = useEngineWorldTableState<Map<string, SpacetimeDB.ActiveConsumableEffect>>('activeConsumableEffects', () => new Map());
  const [clouds, setClouds] = useEngineWorldTableState<Map<string, SpacetimeDB.Cloud>>('clouds', () => new Map());
  const [droneEvents, setDroneEvents] = useEngineWorldTableState<Map<string, SpacetimeDB.DroneEvent>>('droneEvents', () => new Map());
  const [grass, setGrass] = useEngineWorldTableState<Map<string, SpacetimeDB.Grass>>('grass', () => new Map());
  const [grassState, setGrassState] = useEngineWorldTableState<Map<string, SpacetimeDB.GrassState>>('grassState', () => new Map());
  const [knockedOutStatus, setKnockedOutStatus] = useEngineWorldTableState<Map<string, SpacetimeDB.KnockedOutStatus>>('knockedOutStatus', () => new Map());
  const [rangedWeaponStats, setRangedWeaponStats] = useEngineWorldTableState<Map<string, SpacetimeDBRangedWeaponStats>>('rangedWeaponStats', () => new Map());
  const [projectiles, setProjectiles] = useEngineWorldTableState<Map<string, SpacetimeDBProjectile>>('projectiles', () => new Map());
  const [deathMarkers, setDeathMarkers] = useEngineWorldTableState<Map<string, SpacetimeDB.DeathMarker>>('deathMarkers', () => new Map());
  const [shelters, setShelters] = useEngineWorldTableState<Map<string, SpacetimeDB.Shelter>>('shelters', () => new Map());
  const [minimapCache, setMinimapCache] = useEngineWorldTableState<SpacetimeDB.MinimapCache | null>('minimapCache', () => null);
  const [playerDodgeRollStates, setPlayerDodgeRollStates] = useEngineWorldTableState<Map<string, SpacetimeDB.PlayerDodgeRollState>>('playerDodgeRollStates', () => new Map());
  const [fishingSessions, setFishingSessions] = useEngineWorldTableState<Map<string, SpacetimeDB.FishingSession>>('fishingSessions', () => new Map());
  const [soundEvents, setSoundEvents] = useEngineWorldTableState<Map<string, SpacetimeDB.SoundEvent>>('soundEvents', () => new Map());
  const [continuousSounds, setContinuousSounds] = useEngineWorldTableState<Map<string, SpacetimeDB.ContinuousSound>>('continuousSounds', () => new Map());
  const [playerDrinkingCooldowns, setPlayerDrinkingCooldowns] = useEngineWorldTableState<Map<string, SpacetimeDB.PlayerDrinkingCooldown>>('playerDrinkingCooldowns', () => new Map());
  const [wildAnimals, setWildAnimals] = useEngineWorldTableState<Map<string, SpacetimeDB.WildAnimal>>('wildAnimals', () => new Map());
  const [hostileDeathEvents, setHostileDeathEvents] = useEngineWorldTableState<Array<{ id: string, x: number, y: number, species: string, timestamp: number }>>('hostileDeathEvents', () => []);
  const [animalCorpses, setAnimalCorpses] = useEngineWorldTableState<Map<string, SpacetimeDB.AnimalCorpse>>('animalCorpses', () => new Map());
  const [barrels, setBarrels] = useEngineWorldTableState<Map<string, SpacetimeDB.Barrel>>('barrels', () => new Map());
  const [roadLampposts, setRoadLampposts] = useEngineWorldTableState<Map<string, SpacetimeDB.RoadLamppost>>('roadLampposts', () => new Map());
  const [seaStacks, setSeaStacks] = useEngineWorldTableState<Map<string, SpacetimeDB.SeaStack>>('seaStacks', () => new Map());
  const [fumaroles, setFumaroles] = useEngineWorldTableState<Map<string, SpacetimeDB.Fumarole>>('fumaroles', () => new Map());
  const [basaltColumns, setBasaltColumns] = useEngineWorldTableState<Map<string, SpacetimeDB.BasaltColumn>>('basaltColumns', () => new Map());
  const [livingCorals, setLivingCorals] = useEngineWorldTableState<Map<string, SpacetimeDB.LivingCoral>>('livingCorals', () => new Map());
  const [foundationCells, setFoundationCells] = useEngineWorldTableState<Map<string, SpacetimeDB.FoundationCell>>('foundationCells', () => new Map());
  const [wallCells, setWallCells] = useEngineWorldTableState<Map<string, SpacetimeDB.WallCell>>('wallCells', () => new Map());
  const [doors, setDoors] = useEngineWorldTableState<Map<string, SpacetimeDB.Door>>('doors', () => new Map());
  const [fences, setFences] = useEngineWorldTableState<Map<string, SpacetimeDB.Fence>>('fences', () => new Map());
  const [chunkWeather, setChunkWeather] = useEngineWorldTableState<Map<string, any>>('chunkWeather', () => new Map());
  const [alkStations, setAlkStations] = useEngineWorldTableState<Map<string, SpacetimeDB.AlkStation>>('alkStations', () => new Map());
  const [alkContracts, setAlkContracts] = useEngineWorldTableState<Map<string, SpacetimeDB.AlkContract>>('alkContracts', () => new Map());
  const [alkPlayerContracts, setAlkPlayerContracts] = useEngineWorldTableState<Map<string, SpacetimeDB.AlkPlayerContract>>('alkPlayerContracts', () => new Map());
  const [alkState, setAlkState] = useEngineWorldTableState<SpacetimeDB.AlkState | null>('alkState', () => null);
  const [playerShardBalance, setPlayerShardBalance] = useEngineWorldTableState<Map<string, SpacetimeDB.PlayerShardBalance>>('playerShardBalance', () => new Map());
  const [memoryGridProgress, setMemoryGridProgress] = useEngineWorldTableState<Map<string, SpacetimeDB.MemoryGridProgress>>('memoryGridProgress', () => new Map());
  const [monumentParts, setMonumentParts] = useEngineWorldTableState<Map<string, any>>('monumentParts', () => new Map());
  const [largeQuarries, setLargeQuarries] = useEngineWorldTableState<Map<string, any>>('largeQuarries', () => new Map());
  const [playerStats, setPlayerStats] = useEngineWorldTableState<Map<string, SpacetimeDB.PlayerStats>>('playerStats', () => new Map());
  const [achievementDefinitions, setAchievementDefinitions] = useEngineWorldTableState<Map<string, SpacetimeDB.AchievementDefinition>>('achievementDefinitions', () => new Map());
  const [playerAchievements, setPlayerAchievements] = useEngineWorldTableState<Map<string, SpacetimeDB.PlayerAchievement>>('playerAchievements', () => new Map());
  const [achievementUnlockNotifications, setAchievementUnlockNotifications] = useEngineWorldTableState<Map<string, SpacetimeDB.AchievementUnlockNotification>>('achievementUnlockNotifications', () => new Map());
  const [levelUpNotifications, setLevelUpNotifications] = useEngineWorldTableState<Map<string, SpacetimeDB.LevelUpNotification>>('levelUpNotifications', () => new Map());
  const [dailyLoginNotifications, setDailyLoginNotifications] = useEngineWorldTableState<Map<string, SpacetimeDB.DailyLoginNotification>>('dailyLoginNotifications', () => new Map());
  const [progressNotifications, setProgressNotifications] = useEngineWorldTableState<Map<string, SpacetimeDB.ProgressNotification>>('progressNotifications', () => new Map());
  const [comparativeStatNotifications, setComparativeStatNotifications] = useEngineWorldTableState<Map<string, SpacetimeDB.ComparativeStatNotification>>('comparativeStatNotifications', () => new Map());
  const [leaderboardEntries, setLeaderboardEntries] = useEngineWorldTableState<Map<string, SpacetimeDB.LeaderboardEntry>>('leaderboardEntries', () => new Map());
  const [dailyLoginRewards, setDailyLoginRewards] = useEngineWorldTableState<Map<string, SpacetimeDB.DailyLoginReward>>('dailyLoginRewards', () => new Map());
  const [plantConfigDefinitions, setPlantConfigDefinitions] = useEngineWorldTableState<Map<string, SpacetimeDB.PlantConfigDefinition>>('plantConfigDefinitions', () => new Map());
  const [discoveredPlants, setDiscoveredPlants] = useEngineWorldTableState<Map<string, SpacetimeDB.PlayerDiscoveredPlant>>('discoveredPlants', () => new Map());
  const [caribouBreedingData, setCaribouBreedingData] = useEngineWorldTableState<Map<string, SpacetimeDB.CaribouBreedingData>>('caribouBreedingData', () => new Map());
  const [walrusBreedingData, setWalrusBreedingData] = useEngineWorldTableState<Map<string, SpacetimeDB.WalrusBreedingData>>('walrusBreedingData', () => new Map());
  const [caribouRutState, setCaribouRutState] = useEngineWorldTableState<SpacetimeDB.CaribouRutState | null>('caribouRutState', () => null);
  const [walrusRutState, setWalrusRutState] = useEngineWorldTableState<SpacetimeDB.WalrusRutState | null>('walrusRutState', () => null);

  const chunkWeatherRef = useRef<Map<string, any>>(new Map());
  const chunkWeatherUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wildAnimalsRef = useRef<Map<string, SpacetimeDB.WildAnimal>>(new Map());
  const wildAnimalsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const WILD_ANIMAL_BATCH_INTERVAL_MS = 50;
  const projectilesRef = useRef<Map<string, SpacetimeDBProjectile>>(new Map());
  const projectilesUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const PROJECTILE_BATCH_INTERVAL_MS = 50;
  const harvestableResourceBatchRef = useRef<Array<{ op: 'set'; id: string; resource: SpacetimeDB.HarvestableResource } | { op: 'delete'; id: string }>>([]);
  const harvestableResourceFlushScheduledRef = useRef(false);
  const droppedItemBatchRef = useRef<Array<{ op: 'set'; id: string; item: SpacetimeDB.DroppedItem } | { op: 'delete'; id: string }>>([]);
  const droppedItemFlushScheduledRef = useRef(false);
  const hostileDeathCleanupTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const HOSTILE_DEATH_EVENTS_MAX = 30;
  const playerDodgeRollStatesRef = useRef<Map<string, SpacetimeDB.PlayerDodgeRollState>>(new Map());
  const playersRef = useRef<Map<string, SpacetimeDB.Player>>(new Map());
  const lastPlayerRenderTimeRef = useRef<number>(0);
  const playerRenderPendingRef = useRef<boolean>(false);
  const playerRenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const treeBatchRef = useRef<SpacetimeDB.Tree[]>([]);
  const treeFlushScheduledRef = useRef(false);
  const stoneBatchRef = useRef<SpacetimeDB.Stone[]>([]);
  const stoneFlushScheduledRef = useRef(false);
  const campfireBatchRef = useRef<SpacetimeDB.Campfire[]>([]);
  const campfireFlushScheduledRef = useRef(false);
  const chunkPerformanceMetricsRef = useRef<{
    totalChunkCrossings: number;
    totalSubscriptionTime: number;
    totalSubscriptionsCreated: number;
    chunkCrossingTimes: number[];
    subscriptionCreationTimes: number[];
    chunksVisibleHistory: number[];
    lastMetricsLog: number;
  }>({
    totalChunkCrossings: 0,
    totalSubscriptionTime: 0,
    totalSubscriptionsCreated: 0,
    chunkCrossingTimes: [],
    subscriptionCreationTimes: [],
    chunksVisibleHistory: [],
    lastMetricsLog: performance.now(),
  });
  const ENABLE_CHUNK_PERFORMANCE_LOGGING = false;
  const CHUNK_METRICS_LOG_INTERVAL_MS = 10000;

  const resetDataState = useCallback(() => {
    if (playerRenderTimerRef.current) {
      clearTimeout(playerRenderTimerRef.current);
      playerRenderTimerRef.current = null;
    }
    if (projectilesUpdateTimeoutRef.current) {
      clearTimeout(projectilesUpdateTimeoutRef.current);
      projectilesUpdateTimeoutRef.current = null;
    }
    if (wildAnimalsUpdateTimeoutRef.current) {
      clearTimeout(wildAnimalsUpdateTimeoutRef.current);
      wildAnimalsUpdateTimeoutRef.current = null;
    }
    if (chunkWeatherUpdateTimeoutRef.current) {
      clearTimeout(chunkWeatherUpdateTimeoutRef.current);
      chunkWeatherUpdateTimeoutRef.current = null;
    }

    setLocalPlayerRegistered(false);
    setWorldState(null);
    setMinimapCache(null);
    setAlkState(null);
    setCaribouRutState(null);
    setWalrusRutState(null);
    setHostileDeathEvents([]);

    const mapResetters: Array<(next: Map<any, any>) => void> = [
      setPlayers, setTrees, setStones, setRuneStones, setCairns, setPlayerDiscoveredCairns,
      setCampfires, setBarbecues, setFurnaces, setLanterns, setTurrets, setHomesteadHearths, setBrothPots,
      setHarvestableResources, setPlantedSeeds, setItemDefinitions, setInventoryItems, setActiveEquipments,
      setDroppedItems, setWoodenStorageBoxes, setRecipes, setCraftingQueueItems, setSleepingBags,
      setPlayerCorpses, setStashes, setRainCollectors, setWaterPatches, setFertilizerPatches, setFirePatches,
      setPlacedExplosives, setHotSprings, setActiveConsumableEffects, setClouds, setDroneEvents, setGrass,
      setGrassState, setKnockedOutStatus, setRangedWeaponStats, setProjectiles, setDeathMarkers, setShelters,
      setPlayerDodgeRollStates, setFishingSessions, setSoundEvents, setContinuousSounds, setPlayerDrinkingCooldowns,
      setWildAnimals, setAnimalCorpses, setBarrels, setRoadLampposts, setSeaStacks, setFumaroles,
      setBasaltColumns, setLivingCorals, setFoundationCells, setWallCells, setDoors, setFences, setChunkWeather,
      setAlkStations, setAlkContracts, setAlkPlayerContracts, setPlayerShardBalance, setMemoryGridProgress,
      setMonumentParts, setLargeQuarries, setPlayerStats, setAchievementDefinitions, setPlayerAchievements,
      setAchievementUnlockNotifications, setLevelUpNotifications, setDailyLoginNotifications, setProgressNotifications,
      setComparativeStatNotifications, setLeaderboardEntries, setDailyLoginRewards, setPlantConfigDefinitions,
      setDiscoveredPlants, setCaribouBreedingData, setWalrusBreedingData,
    ];

    for (const resetMap of mapResetters) {
      resetMap(new Map());
    }

    projectilesRef.current.clear();
    wildAnimalsRef.current.clear();
    playerDodgeRollStatesRef.current.clear();
    playersRef.current.clear();
    chunkWeatherRef.current.clear();
    harvestableResourceBatchRef.current = [];
    droppedItemBatchRef.current = [];
    treeBatchRef.current = [];
    stoneBatchRef.current = [];
    campfireBatchRef.current = [];
    harvestableResourceFlushScheduledRef.current = false;
    droppedItemFlushScheduledRef.current = false;
    treeFlushScheduledRef.current = false;
    stoneFlushScheduledRef.current = false;
    campfireFlushScheduledRef.current = false;
    playerRenderPendingRef.current = false;
    lastPlayerRenderTimeRef.current = 0;

    hostileDeathCleanupTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    hostileDeathCleanupTimeoutsRef.current.clear();
  }, [
    setLocalPlayerRegistered,
    setWorldState,
    setMinimapCache,
    setAlkState,
    setCaribouRutState,
    setWalrusRutState,
    setHostileDeathEvents,
    setPlayers,
    setTrees,
    setStones,
    setRuneStones,
    setCairns,
    setPlayerDiscoveredCairns,
    setCampfires,
    setBarbecues,
    setFurnaces,
    setLanterns,
    setTurrets,
    setHomesteadHearths,
    setBrothPots,
    setHarvestableResources,
    setPlantedSeeds,
    setItemDefinitions,
    setInventoryItems,
    setActiveEquipments,
    setDroppedItems,
    setWoodenStorageBoxes,
    setRecipes,
    setCraftingQueueItems,
    setSleepingBags,
    setPlayerCorpses,
    setStashes,
    setRainCollectors,
    setWaterPatches,
    setFertilizerPatches,
    setFirePatches,
    setPlacedExplosives,
    setHotSprings,
    setActiveConsumableEffects,
    setClouds,
    setDroneEvents,
    setGrass,
    setGrassState,
    setKnockedOutStatus,
    setRangedWeaponStats,
    setProjectiles,
    setDeathMarkers,
    setShelters,
    setPlayerDodgeRollStates,
    setFishingSessions,
    setSoundEvents,
    setContinuousSounds,
    setPlayerDrinkingCooldowns,
    setWildAnimals,
    setAnimalCorpses,
    setBarrels,
    setRoadLampposts,
    setSeaStacks,
    setFumaroles,
    setBasaltColumns,
    setLivingCorals,
    setFoundationCells,
    setWallCells,
    setDoors,
    setFences,
    setChunkWeather,
    setAlkStations,
    setAlkContracts,
    setAlkPlayerContracts,
    setPlayerShardBalance,
    setMemoryGridProgress,
    setMonumentParts,
    setLargeQuarries,
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
    setCaribouBreedingData,
    setWalrusBreedingData,
  ]);

  return {
    players, setPlayers,
    trees, setTrees,
    stones, setStones,
    runeStones, setRuneStones,
    cairns, setCairns,
    playerDiscoveredCairns, setPlayerDiscoveredCairns,
    campfires, setCampfires,
    furnaces, setFurnaces,
    barbecues, setBarbecues,
    lanterns, setLanterns,
    turrets, setTurrets,
    homesteadHearths, setHomesteadHearths,
    brothPots, setBrothPots,
    harvestableResources, setHarvestableResources,
    plantedSeeds, setPlantedSeeds,
    itemDefinitions, setItemDefinitions,
    inventoryItems, setInventoryItems,
    worldState, setWorldState,
    activeEquipments, setActiveEquipments,
    droppedItems, setDroppedItems,
    woodenStorageBoxes, setWoodenStorageBoxes,
    recipes, setRecipes,
    craftingQueueItems, setCraftingQueueItems,
    localPlayerRegistered, setLocalPlayerRegistered,
    sleepingBags, setSleepingBags,
    playerCorpses, setPlayerCorpses,
    stashes, setStashes,
    rainCollectors, setRainCollectors,
    waterPatches, setWaterPatches,
    fertilizerPatches, setFertilizerPatches,
    firePatches, setFirePatches,
    placedExplosives, setPlacedExplosives,
    hotSprings, setHotSprings,
    activeConsumableEffects, setActiveConsumableEffects,
    clouds, setClouds,
    droneEvents, setDroneEvents,
    grass, setGrass,
    grassState, setGrassState,
    knockedOutStatus, setKnockedOutStatus,
    rangedWeaponStats, setRangedWeaponStats,
    projectiles, setProjectiles,
    deathMarkers, setDeathMarkers,
    shelters, setShelters,
    minimapCache, setMinimapCache,
    playerDodgeRollStates, setPlayerDodgeRollStates,
    fishingSessions, setFishingSessions,
    soundEvents, setSoundEvents,
    continuousSounds, setContinuousSounds,
    playerDrinkingCooldowns, setPlayerDrinkingCooldowns,
    wildAnimals, setWildAnimals,
    hostileDeathEvents, setHostileDeathEvents,
    animalCorpses, setAnimalCorpses,
    barrels, setBarrels,
    roadLampposts, setRoadLampposts,
    seaStacks, setSeaStacks,
    fumaroles, setFumaroles,
    basaltColumns, setBasaltColumns,
    livingCorals, setLivingCorals,
    foundationCells, setFoundationCells,
    wallCells, setWallCells,
    doors, setDoors,
    fences, setFences,
    chunkWeather, setChunkWeather,
    alkStations, setAlkStations,
    alkContracts, setAlkContracts,
    alkPlayerContracts, setAlkPlayerContracts,
    alkState, setAlkState,
    playerShardBalance, setPlayerShardBalance,
    memoryGridProgress, setMemoryGridProgress,
    monumentParts, setMonumentParts,
    largeQuarries, setLargeQuarries,
    playerStats, setPlayerStats,
    achievementDefinitions, setAchievementDefinitions,
    playerAchievements, setPlayerAchievements,
    achievementUnlockNotifications, setAchievementUnlockNotifications,
    levelUpNotifications, setLevelUpNotifications,
    dailyLoginNotifications, setDailyLoginNotifications,
    progressNotifications, setProgressNotifications,
    comparativeStatNotifications, setComparativeStatNotifications,
    leaderboardEntries, setLeaderboardEntries,
    dailyLoginRewards, setDailyLoginRewards,
    plantConfigDefinitions, setPlantConfigDefinitions,
    discoveredPlants, setDiscoveredPlants,
    caribouBreedingData, setCaribouBreedingData,
    walrusBreedingData, setWalrusBreedingData,
    caribouRutState, setCaribouRutState,
    walrusRutState, setWalrusRutState,
    chunkWeatherRef,
    chunkWeatherUpdateTimeoutRef,
    wildAnimalsRef,
    wildAnimalsUpdateTimeoutRef,
    WILD_ANIMAL_BATCH_INTERVAL_MS,
    projectilesRef,
    projectilesUpdateTimeoutRef,
    PROJECTILE_BATCH_INTERVAL_MS,
    harvestableResourceBatchRef,
    harvestableResourceFlushScheduledRef,
    droppedItemBatchRef,
    droppedItemFlushScheduledRef,
    hostileDeathCleanupTimeoutsRef,
    HOSTILE_DEATH_EVENTS_MAX,
    playerDodgeRollStatesRef,
    playersRef,
    lastPlayerRenderTimeRef,
    playerRenderPendingRef,
    playerRenderTimerRef,
    treeBatchRef,
    treeFlushScheduledRef,
    stoneBatchRef,
    stoneFlushScheduledRef,
    campfireBatchRef,
    campfireFlushScheduledRef,
    chunkPerformanceMetricsRef,
    ENABLE_CHUNK_PERFORMANCE_LOGGING,
    CHUNK_METRICS_LOG_INTERVAL_MS,
    resetDataState,
  };
}
