/**
 * Frame assembly hook that composes filtering, interpolation, lighting,
 * projectile presentation, and runtime frame publication into one
 * engine-owned boundary.
 */
import { useEffect, useMemo } from 'react';
import type { Projectile } from '../../generated/types';
import { useEntityFiltering } from './useFrameEntityFiltering';
import { runtimeEngine } from '../runtimeEngine';
import { useRemotePlayerInterpolation } from '../../hooks/useRemotePlayerInterpolation';
import { useDayNightCycle } from '../../hooks/useDayNightCycle';
import { useProjectilePresentationStore } from '../../hooks/useProjectilePresentationStore';
import { cleanupProjectileTrackingForDeleted, getProjectileVisualDedupKey } from '../../utils/renderers/projectileRenderingUtils';

interface UseFrameAssemblyOptions {
  connection: any | null;
  players: Map<string, any>;
  trees: Map<string, any>;
  stones: Map<string, any>;
  runeStones: Map<string, any>;
  cairns: Map<string, any>;
  campfires: Map<string, any>;
  furnaces: Map<string, any>;
  barbecues: Map<string, any>;
  lanterns: Map<string, any>;
  turrets: Map<string, any>;
  homesteadHearths: Map<string, any>;
  harvestableResources: Map<string, any>;
  droppedItems: Map<string, any>;
  woodenStorageBoxes: Map<string, any>;
  sleepingBags: Map<string, any>;
  playerCorpses: Map<string, any>;
  stashes: Map<string, any>;
  cameraOffsetX: number;
  cameraOffsetY: number;
  canvasWidth: number;
  canvasHeight: number;
  interpolatedGrass: Map<string, any>;
  projectiles: Map<string, any>;
  shelters: Map<string, any>;
  clouds: Map<string, any>;
  plantedSeeds: Map<string, any>;
  rainCollectors: Map<string, any>;
  brothPots: Map<string, any>;
  wildAnimals: Map<string, any>;
  animalCorpses: Map<string, any>;
  barrels: Map<string, any>;
  roadLampposts: Map<string, any>;
  fumaroles: Map<string, any>;
  basaltColumns: Map<string, any>;
  seaStacks: Map<string, any>;
  foundationCells: Map<string, any>;
  wallCells: Map<string, any>;
  doors: Map<string, any>;
  fences: Map<string, any>;
  localPlayerId?: string;
  isLocalPlayerSnorkeling: boolean;
  predictedPosition: { x: number; y: number } | null;
  isTreeFalling: (treeId: string) => boolean;
  worldChunkDataMap: Map<string, any> | null | undefined;
  alkStations: Map<string, any>;
  monumentParts: Map<string, any>;
  livingCorals: Map<string, any>;
  seaTransitionTileLookup: Map<string, boolean>;
  waterTileLookup: Map<string, boolean>;
  worldState: any;
  firePatches: Map<string, any>;
  activeEquipments: Map<string, any>;
  itemDefinitions: Map<string, any>;
  worldMouseX: number;
  worldMouseY: number;
  roadLamppostsAll: Map<string, any>;
  barrelsAll: Map<string, any>;
}

export function useFrameAssembly(options: UseFrameAssemblyOptions) {
  const remotePlayerInterpolation = useRemotePlayerInterpolation();
  const optimisticProjectiles =
    (runtimeEngine.getSnapshot().input.optimisticProjectiles as Map<string, Projectile> | undefined) ?? new Map<string, Projectile>();

  const filtering = useEntityFiltering(
    options.players,
    options.trees,
    options.stones,
    options.runeStones,
    options.cairns,
    options.campfires,
    options.furnaces,
    options.barbecues,
    options.lanterns,
    options.turrets,
    options.homesteadHearths,
    options.harvestableResources,
    options.droppedItems,
    options.woodenStorageBoxes,
    options.sleepingBags,
    options.playerCorpses,
    options.stashes,
    options.cameraOffsetX,
    options.cameraOffsetY,
    options.canvasWidth,
    options.canvasHeight,
    options.interpolatedGrass,
    options.projectiles,
    options.shelters,
    options.clouds,
    options.plantedSeeds,
    options.rainCollectors,
    options.brothPots,
    options.wildAnimals,
    options.animalCorpses,
    options.barrels,
    options.roadLampposts,
    options.fumaroles,
    options.basaltColumns,
    options.seaStacks,
    options.foundationCells,
    options.wallCells,
    options.doors,
    options.fences,
    options.localPlayerId,
    options.isLocalPlayerSnorkeling,
    options.predictedPosition ? { x: options.predictedPosition.x, y: options.predictedPosition.y } : null,
    options.isTreeFalling,
    options.worldChunkDataMap ?? undefined,
    options.alkStations,
    options.monumentParts,
    options.livingCorals,
    options.seaTransitionTileLookup,
    options.waterTileLookup
  );

  const stablePredictedPosition = useMemo(() => {
    if (!options.predictedPosition) return null;
    return { x: options.predictedPosition.x, y: options.predictedPosition.y };
  }, [options.predictedPosition?.x, options.predictedPosition?.y]);

  const { overlayRgba, maskCanvasRef, redrawMask } = useDayNightCycle({
    worldState: options.worldState,
    droppedItems: filtering.visibleDroppedItemsMap,
    campfires: options.campfires,
    lanterns: options.lanterns,
    furnaces: options.furnaces,
    barbecues: options.barbecues,
    roadLampposts: options.roadLamppostsAll,
    barrels: options.barrelsAll,
    runeStones: options.runeStones,
    firePatches: options.firePatches,
    fumaroles: options.fumaroles,
    monumentParts: options.monumentParts,
    players: options.players,
    activeEquipments: options.activeEquipments,
    itemDefinitions: options.itemDefinitions,
    cameraOffsetX: options.cameraOffsetX,
    cameraOffsetY: options.cameraOffsetY,
    canvasSize: { width: options.canvasWidth, height: options.canvasHeight },
    localPlayerId: options.localPlayerId,
    predictedPosition: stablePredictedPosition,
    remotePlayerInterpolation,
    buildingClusters: filtering.buildingClusters,
    worldMouseX: options.worldMouseX,
    worldMouseY: options.worldMouseY,
  });

  const renderableProjectiles = useProjectilePresentationStore({
    connection: options.connection,
    authoritativeProjectiles: options.projectiles as Map<string, Projectile>,
    optimisticProjectiles,
    localPlayerId: options.localPlayerId,
  });

  // Keep projectile timing state aligned with the final renderable set so
  // optimistic -> authoritative handoffs do not purge effects mid-flight.
  useEffect(() => {
    const ids = new Set<string>();
    renderableProjectiles.forEach((projectile) => ids.add(getProjectileVisualDedupKey(projectile)));
    cleanupProjectileTrackingForDeleted(ids);
  }, [renderableProjectiles]);

  const corpseSourceAnimalIds = useMemo(() => {
    const ids = new Set<string>();
    filtering.visibleAnimalCorpsesMap.forEach((corpse: any) => {
      ids.add(corpse.animalId.toString());
    });
    return ids;
  }, [filtering.visibleAnimalCorpsesMap]);

  const finalizedYSortedEntities = useMemo(() => {
    const withoutReplacedAnimals =
      corpseSourceAnimalIds.size === 0
        ? filtering.ySortedEntities
        : filtering.ySortedEntities.filter((entity: any) => {
            if (entity.type !== 'wild_animal') return true;
            return !corpseSourceAnimalIds.has(entity.entity.id.toString());
          });

    const withProjectiles = withoutReplacedAnimals.filter((entity: any) => entity.type !== 'projectile');
    renderableProjectiles.forEach((projectile) => {
      withProjectiles.push({ type: 'projectile', entity: projectile } as any);
    });
    return withProjectiles;
  }, [corpseSourceAnimalIds, filtering.ySortedEntities, renderableProjectiles]);

  const frameVisibility = useMemo(
    () => ({
      ySortedEntities: finalizedYSortedEntities,
      buildingClusters: filtering.buildingClusters,
      visibleHarvestableResourcesMap: filtering.visibleHarvestableResourcesMap,
      visibleTreesMap: filtering.visibleTreesMap,
      visibleStonesMap: filtering.visibleStonesMap,
      visibleDroppedItemsMap: filtering.visibleDroppedItemsMap,
      visibleCampfiresMap: filtering.visibleCampfiresMap,
      visibleFurnacesMap: filtering.visibleFurnacesMap,
      visibleBarbecuesMap: filtering.visibleBarbecuesMap,
      visibleRuneStonesMap: filtering.visibleRuneStonesMap,
      visibleCairnsMap: filtering.visibleCairnsMap,
      visibleLanternsMap: filtering.visibleLanternsMap,
      visibleTurretsMap: filtering.visibleTurretsMap,
      visibleBoxesMap: filtering.visibleBoxesMap,
      visiblePlayerCorpsesMap: filtering.visiblePlayerCorpsesMap,
      visibleStashesMap: filtering.visibleStashesMap,
      visibleSleepingBagsMap: filtering.visibleSleepingBagsMap,
      visibleGrassMap: filtering.visibleGrassMap,
      visibleSheltersMap: filtering.visibleSheltersMap,
      visibleWildAnimalsMap: filtering.visibleWildAnimalsMap,
      visibleAnimalCorpsesMap: filtering.visibleAnimalCorpsesMap,
      visibleBarrelsMap: filtering.visibleBarrelsMap,
      visibleRoadLamppostsMap: filtering.visibleRoadLamppostsMap,
      visibleFumarolesMap: filtering.visibleFumarolesMap,
      visibleBasaltColumnsMap: filtering.visibleBasaltColumnsMap,
      visibleLivingCoralsMap: filtering.visibleLivingCoralsMap,
      visibleSeaStacksMap: filtering.visibleSeaStacksMap,
      visibleHomesteadHearthsMap: filtering.visibleHomesteadHearthsMap,
      visibleDoorsMap: filtering.visibleDoorsMap,
      visibleFencesMap: filtering.visibleFencesMap,
      visibleAlkStationsMap: filtering.visibleAlkStationsMap,
      swimmingPlayersForBottomHalf: filtering.swimmingPlayersForBottomHalf,
    }),
    [
      finalizedYSortedEntities,
      filtering.buildingClusters,
      filtering.visibleHarvestableResourcesMap,
      filtering.visibleTreesMap,
      filtering.visibleStonesMap,
      filtering.visibleDroppedItemsMap,
      filtering.visibleCampfiresMap,
      filtering.visibleFurnacesMap,
      filtering.visibleBarbecuesMap,
      filtering.visibleRuneStonesMap,
      filtering.visibleCairnsMap,
      filtering.visibleLanternsMap,
      filtering.visibleTurretsMap,
      filtering.visibleBoxesMap,
      filtering.visiblePlayerCorpsesMap,
      filtering.visibleStashesMap,
      filtering.visibleSleepingBagsMap,
      filtering.visibleGrassMap,
      filtering.visibleSheltersMap,
      filtering.visibleWildAnimalsMap,
      filtering.visibleAnimalCorpsesMap,
      filtering.visibleBarrelsMap,
      filtering.visibleRoadLamppostsMap,
      filtering.visibleFumarolesMap,
      filtering.visibleBasaltColumnsMap,
      filtering.visibleLivingCoralsMap,
      filtering.visibleSeaStacksMap,
      filtering.visibleHomesteadHearthsMap,
      filtering.visibleDoorsMap,
      filtering.visibleFencesMap,
      filtering.visibleAlkStationsMap,
      filtering.swimmingPlayersForBottomHalf,
    ]
  );

  return {
    ...filtering,
    ySortedEntities: finalizedYSortedEntities,
    overlayRgba,
    maskCanvasRef,
    redrawMask,
    renderableProjectiles,
    remotePlayerInterpolation,
  };
}
