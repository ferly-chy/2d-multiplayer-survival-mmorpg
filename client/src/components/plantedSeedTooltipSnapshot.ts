import type {
  PlantedSeed,
  Cloud,
  WorldState,
  WaterPatch,
  Campfire,
  Lantern,
  Furnace,
  Tree,
  RuneStone,
  PlantType,
  FertilizerPatch,
  WorldChunkData,
  ChunkWeather,
} from '../generated/types';
import { calculateChunkIndex } from '../utils/chunkUtils';
import { RESOURCE_IMAGE_SOURCES } from '../utils/renderers/resourceImageConfigs';

const TILE_TYPE_DIRT = 1;
const TILE_TYPE_BEACH = 4;
const TILE_TYPE_TILLED = 13;
const TILE_SIZE_PX = 48;
const CHUNK_SIZE_TILES = 16;
const PREPARED_SOIL_GROWTH_MULTIPLIER = 1.5;
const BEACH_TILE_GROWTH_PENALTY = 0.5;

export type TooltipWorldEnv = {
  clouds: Map<string, Cloud>;
  worldState: WorldState | null;
  chunkWeather: Map<string, ChunkWeather>;
  waterPatches: Map<string, WaterPatch>;
  campfires: Map<string, Campfire>;
  lanterns: Map<string, Lantern>;
  furnaces: Map<string, Furnace>;
  trees: Map<string, Tree>;
  runeStones: Map<string, RuneStone>;
  fertilizerPatches: Map<string, FertilizerPatch>;
  worldChunkData?: Map<string, WorldChunkData>;
};

/** Heavy spatial scans only — omit growth/time fields so growth ticks don’t re-scan the world. */
export type PlantedSeedEnvSnapshot = {
  cloudCoverage: number;
  waterPatchEffect: { hasWater: boolean; isSaltWater: boolean; multiplier: number };
  fertilizerPatchEffect: { hasFertilizer: boolean; multiplier: number };
  nearTree: boolean;
  nearGreenRuneStone: boolean;
  lightEffects: { nearCampfire: boolean; nearLantern: boolean; nearFurnace: boolean };
  onPreparedSoil: boolean;
  onBeachTile: boolean;
  beachSpecificPlant: boolean;
  beachAdaptedTreeSapling: boolean;
  hasBeachPenalty: boolean;
  currentWeather: string;
  currentTimeOfDay: string;
  isMushroomPlant: boolean;
  totalGrowthMultiplier: number;
  plantTypeName: string;
  plantImageSource: string | null;
};

export type PlantedSeedTooltipSnapshot = PlantedSeedEnvSnapshot & {
  growthPercent: number;
  isFullyGrown: boolean;
  timeSpentGrowingMs: number;
  timeUntilMatureMs: number;
  growthStage: string;
};

export const EMPTY_TOOLTIP_WORLD_ENV: TooltipWorldEnv = {
  clouds: new Map(),
  worldState: null,
  chunkWeather: new Map(),
  waterPatches: new Map(),
  campfires: new Map(),
  lanterns: new Map(),
  furnaces: new Map(),
  trees: new Map(),
  runeStones: new Map(),
  fertilizerPatches: new Map(),
  worldChunkData: undefined,
};

function calculateCloudCoverage(seed: PlantedSeed, clouds: Map<string, Cloud>): number {
  let cloudCoverage = 0;
  clouds.forEach((cloud) => {
    const dx = seed.posX - cloud.posX;
    const dy = seed.posY - cloud.posY;
    const halfWidth = cloud.width / 2;
    const halfHeight = cloud.height / 2;
    if (halfWidth > 0 && halfHeight > 0) {
      const normalizedX = dx / halfWidth;
      const normalizedY = dy / halfHeight;
      const distanceSquared = normalizedX * normalizedX + normalizedY * normalizedY;
      if (distanceSquared <= 1.0) {
        const coverageIntensity = Math.max(0, 1.0 - Math.sqrt(distanceSquared));
        const effectiveCoverage = coverageIntensity * cloud.currentOpacity;
        cloudCoverage = Math.min(1.0, cloudCoverage + effectiveCoverage);
      }
    }
  });
  return cloudCoverage;
}

function getWaterPatchEffect(
  seed: PlantedSeed,
  waterPatches: Map<string, WaterPatch>,
): { hasWater: boolean; isSaltWater: boolean; multiplier: number } {
  const WATER_PATCH_GROWTH_EFFECT_RADIUS = 60;
  const WATER_PATCH_GROWTH_EFFECT_RADIUS_SQ = WATER_PATCH_GROWTH_EFFECT_RADIUS * WATER_PATCH_GROWTH_EFFECT_RADIUS;
  let bestMultiplier = 1.0;
  let hasWater = false;
  let isSaltWater = false;
  for (const waterPatch of waterPatches.values()) {
    const dx = seed.posX - waterPatch.posX;
    const dy = seed.posY - waterPatch.posY;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq <= WATER_PATCH_GROWTH_EFFECT_RADIUS_SQ) {
      hasWater = true;
      const distance = Math.sqrt(distanceSq);
      const distanceFactor = Math.max(0, Math.min(1, (WATER_PATCH_GROWTH_EFFECT_RADIUS - distance) / WATER_PATCH_GROWTH_EFFECT_RADIUS));
      const opacityFactor = waterPatch.currentOpacity;
      if ((waterPatch as { isSaltWater?: boolean }).isSaltWater) {
        const saltPenalty = 0.5 + 0.4 * (1.0 - distanceFactor * opacityFactor);
        bestMultiplier = Math.min(bestMultiplier, saltPenalty);
        isSaltWater = true;
      } else {
        const freshBonus = 1.0 + 1.0 * distanceFactor * opacityFactor;
        bestMultiplier = Math.max(bestMultiplier, freshBonus);
      }
    }
  }
  return { hasWater, isSaltWater, multiplier: bestMultiplier };
}

function getFertilizerPatchEffect(
  seed: PlantedSeed,
  fertilizerPatches: Map<string, FertilizerPatch>,
): { hasFertilizer: boolean; multiplier: number } {
  const FERTILIZER_PATCH_GROWTH_EFFECT_RADIUS = 60;
  const FERTILIZER_PATCH_GROWTH_EFFECT_RADIUS_SQ = FERTILIZER_PATCH_GROWTH_EFFECT_RADIUS * FERTILIZER_PATCH_GROWTH_EFFECT_RADIUS;
  const FERTILIZER_GROWTH_BONUS_MULTIPLIER = 2.0;
  let bestMultiplier = 1.0;
  let hasFertilizer = false;
  for (const fertilizerPatch of fertilizerPatches.values()) {
    const dx = seed.posX - fertilizerPatch.posX;
    const dy = seed.posY - fertilizerPatch.posY;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq <= FERTILIZER_PATCH_GROWTH_EFFECT_RADIUS_SQ) {
      hasFertilizer = true;
      const distance = Math.sqrt(distanceSq);
      const distanceFactor = Math.max(0, Math.min(1, (FERTILIZER_PATCH_GROWTH_EFFECT_RADIUS - distance) / FERTILIZER_PATCH_GROWTH_EFFECT_RADIUS));
      const opacityFactor = fertilizerPatch.currentOpacity;
      const fertilizerBonus = 1.0 + (FERTILIZER_GROWTH_BONUS_MULTIPLIER - 1.0) * distanceFactor * opacityFactor;
      bestMultiplier = Math.max(bestMultiplier, fertilizerBonus);
    }
  }
  return { hasFertilizer, multiplier: bestMultiplier };
}

function calculateLightEffects(
  seed: PlantedSeed,
  campfires: Map<string, Campfire>,
  lanterns: Map<string, Lantern>,
  furnaces: Map<string, Furnace>,
): { nearCampfire: boolean; nearLantern: boolean; nearFurnace: boolean } {
  let nearCampfire = false;
  let nearLantern = false;
  let nearFurnace = false;
  for (const campfire of campfires.values()) {
    if (campfire.isBurning && !campfire.isDestroyed) {
      const dx = seed.posX - campfire.posX;
      const dy = seed.posY - campfire.posY;
      if (dx * dx + dy * dy < 120 * 120) {
        nearCampfire = true;
        break;
      }
    }
  }
  for (const lantern of lanterns.values()) {
    if (lantern.isBurning && !lantern.isDestroyed) {
      const dx = seed.posX - lantern.posX;
      const dy = seed.posY - lantern.posY;
      if (dx * dx + dy * dy < 100 * 100) {
        nearLantern = true;
        break;
      }
    }
  }
  for (const furnace of furnaces.values()) {
    if (furnace.isBurning && !furnace.isDestroyed) {
      const dx = seed.posX - furnace.posX;
      const dy = seed.posY - furnace.posY;
      if (dx * dx + dy * dy < 120 * 120) {
        nearFurnace = true;
        break;
      }
    }
  }
  return { nearCampfire, nearLantern, nearFurnace };
}

function isMushroomPlantType(plantTypeTag: string): boolean {
  return (
    plantTypeTag === 'Chanterelle' ||
    plantTypeTag === 'Porcini' ||
    plantTypeTag === 'FlyAgaric' ||
    plantTypeTag === 'ShaggyInkCap' ||
    plantTypeTag === 'DeadlyWebcap' ||
    plantTypeTag === 'DestroyingAngel'
  );
}

function isNearTree(seed: PlantedSeed, trees: Map<string, Tree>): boolean {
  const TREE_COVER_DISTANCE = 150;
  const TREE_COVER_DISTANCE_SQ = TREE_COVER_DISTANCE * TREE_COVER_DISTANCE;
  for (const tree of trees.values()) {
    const dx = seed.posX - tree.posX;
    const dy = seed.posY - tree.posY;
    if (dx * dx + dy * dy <= TREE_COVER_DISTANCE_SQ) return true;
  }
  return false;
}

function isNearGreenRuneStone(seed: PlantedSeed, runeStones: Map<string, RuneStone>): boolean {
  const RUNE_STONE_EFFECT_RADIUS = 2000;
  const RUNE_STONE_EFFECT_RADIUS_SQ = RUNE_STONE_EFFECT_RADIUS * RUNE_STONE_EFFECT_RADIUS;
  for (const runeStone of runeStones.values()) {
    if (runeStone.runeType?.tag !== 'Green') continue;
    const dx = seed.posX - runeStone.posX;
    const dy = seed.posY - runeStone.posY;
    if (dx * dx + dy * dy <= RUNE_STONE_EFFECT_RADIUS_SQ) return true;
  }
  return false;
}

function readTileTypeAtSeed(worldChunkData: Map<string, WorldChunkData> | undefined, seed: PlantedSeed): number | null {
  if (!worldChunkData) return null;
  const tileX = Math.floor(seed.posX / TILE_SIZE_PX);
  const tileY = Math.floor(seed.posY / TILE_SIZE_PX);
  const chunkX = Math.floor(tileX / CHUNK_SIZE_TILES);
  const chunkY = Math.floor(tileY / CHUNK_SIZE_TILES);
  const chunk = worldChunkData.get(`${chunkX},${chunkY}`);
  if (!chunk) return null;
  let localTileX = tileX % CHUNK_SIZE_TILES;
  let localTileY = tileY % CHUNK_SIZE_TILES;
  if (localTileX < 0) localTileX += CHUNK_SIZE_TILES;
  if (localTileY < 0) localTileY += CHUNK_SIZE_TILES;
  const tileIndex = localTileY * CHUNK_SIZE_TILES + localTileX;
  if (tileIndex >= chunk.tileTypes.length) return null;
  return chunk.tileTypes[tileIndex]!;
}

function isOnPreparedSoil(worldChunkData: Map<string, WorldChunkData> | undefined, seed: PlantedSeed): boolean {
  const tileType = readTileTypeAtSeed(worldChunkData, seed);
  return tileType === TILE_TYPE_DIRT || tileType === TILE_TYPE_TILLED;
}

function isOnBeachTile(worldChunkData: Map<string, WorldChunkData> | undefined, seed: PlantedSeed): boolean {
  return readTileTypeAtSeed(worldChunkData, seed) === TILE_TYPE_BEACH;
}

function isBeachSpecificPlant(plantTypeTag: string): boolean {
  return (
    plantTypeTag === 'BeachLymeGrass' ||
    plantTypeTag === 'ScurvyGrass' ||
    plantTypeTag === 'SeaPlantain' ||
    plantTypeTag === 'Glasswort' ||
    plantTypeTag === 'SeaweedBed' ||
    plantTypeTag === 'Reed' ||
    plantTypeTag === 'BeachWoodPile'
  );
}

function isBeachAdaptedTreeSapling(seed: PlantedSeed): boolean {
  if (!seed.targetTreeType) return false;
  const treeTypeTag = seed.targetTreeType.tag;
  return treeTypeTag === 'SitkaAlder' || treeTypeTag === 'SitkaAlder2';
}

function getTimeOfDayMultiplier(timeOfDay: string): number {
  switch (timeOfDay) {
    case 'Dawn':
      return 0.3;
    case 'TwilightMorning':
      return 0.5;
    case 'Morning':
      return 1.0;
    case 'Noon':
      return 1.5;
    case 'Afternoon':
      return 1.2;
    case 'Dusk':
      return 0.4;
    case 'TwilightEvening':
      return 0.2;
    case 'Night':
      return 0.0;
    case 'Midnight':
      return 0.0;
    default:
      return 1.0;
  }
}

function getWeatherMultiplier(weather: string): number {
  switch (weather) {
    case 'Clear':
      return 1.0;
    case 'LightRain':
      return 1.3;
    case 'ModerateRain':
      return 1.6;
    case 'HeavyRain':
      return 1.4;
    case 'HeavyStorm':
      return 0.8;
    default:
      return 1.0;
  }
}

function getCloudMultiplier(coverage: number, isMushroom: boolean): number {
  if (isMushroom) return 1.0 + coverage * 0.36;
  return Math.max(0.4, 1.0 - coverage * 0.6);
}

function getLightMultiplier(effects: { nearCampfire: boolean; nearLantern: boolean; nearFurnace: boolean }): number {
  let totalEffect = 0;
  if (effects.nearCampfire) totalEffect -= 0.4;
  if (effects.nearLantern) totalEffect += 0.8;
  if (effects.nearFurnace) totalEffect += 0.6;
  return Math.max(0.2, Math.min(2.0, 1.0 + totalEffect));
}

function getMushroomBonusMultiplier(isMushroom: boolean, nearTree: boolean, timeOfDay: string): number {
  if (!isMushroom) return 1.0;
  const bonusFactors: number[] = [];
  if (nearTree) bonusFactors.push(1.5);
  switch (timeOfDay) {
    case 'Night':
      bonusFactors.push(1.5);
      break;
    case 'Midnight':
      bonusFactors.push(1.6);
      break;
    case 'TwilightEvening':
      bonusFactors.push(1.3);
      break;
    case 'TwilightMorning':
      bonusFactors.push(1.3);
      break;
    case 'Dusk':
      bonusFactors.push(1.2);
      break;
    case 'Dawn':
      bonusFactors.push(1.1);
      break;
    default:
      break;
  }
  if (bonusFactors.length === 0) return 1.0;
  const avgBonus = bonusFactors.reduce((a, b) => a + b, 0) / bonusFactors.length;
  return Math.min(2.0, avgBonus);
}

function getPlantImageSource(plantType: PlantType): string | null {
  const plantTypeTag = plantType.tag;
  if (plantTypeTag in RESOURCE_IMAGE_SOURCES) {
    return RESOURCE_IMAGE_SOURCES[plantTypeTag as keyof typeof RESOURCE_IMAGE_SOURCES];
  }
  return null;
}

/**
 * Spatial / environmental scans (clouds, water, lights, runes, soil). Does not depend on
 * `growthProgress` — memoize with seed position/type + weather tags, not every growth tick.
 */
export function buildPlantedSeedEnvSnapshot(seed: PlantedSeed, env: TooltipWorldEnv): PlantedSeedEnvSnapshot {
  const {
    clouds,
    worldState,
    chunkWeather,
    waterPatches,
    campfires,
    lanterns,
    furnaces,
    trees,
    runeStones,
    fertilizerPatches,
    worldChunkData,
  } = env;

  const chunkIndexStr = calculateChunkIndex(seed.posX, seed.posY).toString();
  const seedChunkWeather = chunkWeather.get(chunkIndexStr) ?? null;

  const plantTypeTag = seed.plantType.tag;
  const isMushroomPlant = isMushroomPlantType(plantTypeTag);

  const cloudCoverage = calculateCloudCoverage(seed, clouds);
  const waterPatchEffect = getWaterPatchEffect(seed, waterPatches);
  const fertilizerPatchEffect = getFertilizerPatchEffect(seed, fertilizerPatches);
  const nearTree = isMushroomPlant ? isNearTree(seed, trees) : false;
  const nearGreenRuneStone = isNearGreenRuneStone(seed, runeStones);
  const lightEffects = calculateLightEffects(seed, campfires, lanterns, furnaces);
  const onPreparedSoil = isOnPreparedSoil(worldChunkData, seed);
  const onBeachTile = isOnBeachTile(worldChunkData, seed);
  const beachSpecificPlant = isBeachSpecificPlant(plantTypeTag);
  const beachAdaptedTreeSapling = isBeachAdaptedTreeSapling(seed);
  const hasBeachPenalty = onBeachTile && !beachSpecificPlant && !beachAdaptedTreeSapling;

  const currentWeather =
    seedChunkWeather?.currentWeather?.tag || worldState?.currentWeather.tag || 'Clear';
  const currentTimeOfDay = worldState?.timeOfDay.tag || 'Noon';

  const baseTimeMultiplier = getTimeOfDayMultiplier(currentTimeOfDay);
  const weatherMultiplier = getWeatherMultiplier(currentWeather);
  const cloudMultiplier = getCloudMultiplier(cloudCoverage, isMushroomPlant);
  const lightMultiplier = getLightMultiplier(lightEffects);
  const mushroomBonus = getMushroomBonusMultiplier(isMushroomPlant, nearTree, currentTimeOfDay);
  const waterMult = waterPatchEffect.multiplier;
  const fertilizerMult = fertilizerPatchEffect.multiplier;
  const soilMult = onPreparedSoil ? PREPARED_SOIL_GROWTH_MULTIPLIER : 1.0;
  const beachMult = hasBeachPenalty ? BEACH_TILE_GROWTH_PENALTY : 1.0;
  const greenRuneMult = nearGreenRuneStone ? 1.5 : 1.0;

  let totalGrowthMultiplier: number;
  if (greenRuneMult > 1.0) {
    const positiveLightMult = Math.max(1.0, lightMultiplier);
    totalGrowthMultiplier =
      greenRuneMult * waterMult * fertilizerMult * mushroomBonus * soilMult * positiveLightMult;
  } else {
    totalGrowthMultiplier =
      baseTimeMultiplier *
      weatherMultiplier *
      cloudMultiplier *
      lightMultiplier *
      mushroomBonus *
      waterMult *
      fertilizerMult *
      soilMult *
      beachMult;
  }

  const plantTypeName = plantTypeTag
    .split(/(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const plantImageSource = getPlantImageSource(seed.plantType);

  return {
    cloudCoverage,
    waterPatchEffect,
    fertilizerPatchEffect,
    nearTree,
    nearGreenRuneStone,
    lightEffects,
    onPreparedSoil,
    onBeachTile,
    beachSpecificPlant,
    beachAdaptedTreeSapling,
    hasBeachPenalty,
    currentWeather,
    currentTimeOfDay,
    isMushroomPlant,
    totalGrowthMultiplier,
    plantTypeName,
    plantImageSource,
  };
}

/** O(1): merge live growth + clock into env snapshot for display. */
export function completePlantedSeedTooltipSnapshot(
  envSnap: PlantedSeedEnvSnapshot,
  seed: PlantedSeed,
  nowMs: number,
): PlantedSeedTooltipSnapshot {
  const growthPercent = Math.round(seed.growthProgress * 100);
  const isFullyGrown = seed.growthProgress >= 1.0;
  const timeSpentGrowingMs = nowMs - seed.plantedAt.toDate().getTime();
  const { totalGrowthMultiplier } = envSnap;

  let timeUntilMatureMs: number;
  if (isFullyGrown || totalGrowthMultiplier <= 0) {
    timeUntilMatureMs = 0;
  } else {
    const remainingProgress = 1.0 - seed.growthProgress;
    const baseGrowthRate = 1.0 / Number(seed.baseGrowthTimeSecs);
    const actualGrowthRate = baseGrowthRate * totalGrowthMultiplier;
    if (actualGrowthRate <= 0) {
      timeUntilMatureMs = Infinity;
    } else {
      timeUntilMatureMs = (remainingProgress / actualGrowthRate) * 1000;
    }
  }

  let growthStage: string;
  if (growthPercent >= 100) growthStage = 'mature';
  else if (growthPercent >= 75) growthStage = 'almostMature';
  else if (growthPercent >= 50) growthStage = 'growing';
  else if (growthPercent >= 25) growthStage = 'sprouting';
  else growthStage = 'planted';

  return {
    ...envSnap,
    growthPercent,
    isFullyGrown,
    timeSpentGrowingMs,
    timeUntilMatureMs,
    growthStage,
  };
}