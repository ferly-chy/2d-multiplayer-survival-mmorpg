import { useEffect, useMemo } from 'react';
import { gameConfig } from '../../config/gameConfig';
import { useWalkingAnimationCycle, useSprintAnimationCycle, useIdleAnimationCycle } from '../../hooks/useAnimationCycle';
import { useGameCanvasLagDiagnostics } from '../../hooks/useGameCanvasLagDiagnostics';
import { renderLateFramePasses } from '../frame/renderLateFramePasses';
import { renderWorldPreparationPasses } from '../frame/renderWorldPreparationPasses';
import { renderEntityWorldPasses } from '../frame/renderEntityWorldPasses';
import { renderScreenSpaceWorldEffects } from '../frame/renderScreenSpaceWorldEffects';
import type {
  GameCanvasRuntimeControllerSnapshot,
  GameCanvasRuntimeHost,
  GameCanvasRuntimeParticleSnapshot,
  GameCanvasRuntimeSceneSnapshot,
} from './GameCanvasRuntimeHost';

const EMPTY_MAP = new Map();

interface UseGameCanvasRenderRuntimeOptions {
  host: GameCanvasRuntimeHost;
  localPlayerId?: string;
  localPlayer: any;
  predictedPosition: { x: number; y: number } | null;
  connection: any | null;
  gameCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasSize: { width: number; height: number };
  placementInfo: any;
  placementError: string | null;
  placementActions: any;
  setPlacementWarning: (warning: string | null) => void;
  showFpsProfiler: boolean;
  isProfilerRecording: boolean;
  showAutotileDebug: boolean;
  showChunkBoundaries: boolean;
  showInteriorDebug: boolean;
  showCollisionDebug: boolean;
  showAttackRangeDebug: boolean;
  showYSortDebug: boolean;
  showShipwreckDebug: boolean;
  allShadowsEnabled: boolean;
  alwaysShowPlayerNames: boolean;
  waterSurfaceEffectsEnabled: boolean;
  footprintsEnabled: boolean;
  grassAnimationEnabled: boolean;
  worldParticlesQuality: number;
  cloudsEnabled: boolean;
  showPrecipitation: boolean;
  stormAtmosphereEnabled: boolean;
  showStatusOverlays: boolean;
  isSearchingCraftRecipes: boolean;
  showInventory: boolean;
  isMobile: boolean;
  tapAnimation: any;
  localPlayerIsCrouching: boolean;
  isAutoAttacking: boolean;
  isAutoWalking: boolean;
  hoveredPlayerIds: Set<string>;
  handlePlayerHover: (...args: any[]) => void;
  getCurrentDodgeRollVisualNow?: () => any;
  assets: {
    doodadImagesRef: any;
    heroImageRef: any;
    heroSprintImageRef: any;
    heroIdleImageRef: any;
    heroWaterImageRef: any;
    heroCrouchImageRef: any;
    heroDodgeImageRef: any;
    itemImagesRef: any;
    cloudImagesRef: any;
    droneImageRef: any;
    shelterImageRef: any;
    foundationTileImagesRef: any;
  };
  renderRefs: {
    deltaTimeRef: React.MutableRefObject<number>;
    lastPositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
    localSwimTransitionRef: React.MutableRefObject<{ wasSwimming: boolean; enteredWaterAtMs: number }>;
    swimmingPlayerScratchRef: React.MutableRefObject<any>;
    swimmingPlayerTopHalfScratchRef: React.MutableRefObject<any>;
    localPlayerScratchRef: React.MutableRefObject<Record<string, unknown>>;
    lastPlacementWarningRef: React.MutableRefObject<string | null>;
  };
}

export function useGameCanvasRenderRuntime({
  host,
  localPlayerId,
  localPlayer,
  predictedPosition,
  connection,
  gameCanvasRef,
  canvasSize,
  placementInfo,
  placementError,
  placementActions,
  setPlacementWarning,
  showFpsProfiler,
  isProfilerRecording,
  showAutotileDebug,
  showChunkBoundaries,
  showInteriorDebug,
  showCollisionDebug,
  showAttackRangeDebug,
  showYSortDebug,
  showShipwreckDebug,
  allShadowsEnabled,
  alwaysShowPlayerNames,
  waterSurfaceEffectsEnabled,
  footprintsEnabled,
  grassAnimationEnabled,
  worldParticlesQuality,
  cloudsEnabled,
  showPrecipitation,
  stormAtmosphereEnabled,
  showStatusOverlays,
  isSearchingCraftRecipes,
  showInventory,
  isMobile,
  tapAnimation,
  localPlayerIsCrouching,
  isAutoAttacking,
  isAutoWalking,
  hoveredPlayerIds,
  handlePlayerHover,
  getCurrentDodgeRollVisualNow,
  assets,
  renderRefs,
}: UseGameCanvasRenderRuntimeOptions) {
  // These hooks advance the shared animation refs consumed by the frame renderer.
  useWalkingAnimationCycle();
  useSprintAnimationCycle();
  useIdleAnimationCycle();

  const ENABLE_LAG_DIAGNOSTICS = false;
  const LAG_DIAGNOSTIC_INTERVAL_MS = 5000;
  const PLAYER_SORT_FEET_OFFSET_PX = gameConfig.tileSize;
  const ENABLE_YSORT_DEBUG = false;
  const YSORT_DEBUG_INTERVAL_MS = 400;

  const {
    ySortDebugRef,
    perfProfilingRef,
    fpsProfilerRef,
    checkPerformance,
  } = useGameCanvasLagDiagnostics({
    localPlayer,
    enabled: ENABLE_LAG_DIAGNOSTICS,
  });

  const sceneRuntime = host.getSceneSnapshot() as GameCanvasRuntimeSceneSnapshot | null;
  const controllerRuntime = host.getControllerSnapshot() as GameCanvasRuntimeControllerSnapshot | null;
  const effectsRuntime = host.getParticleSnapshot() as GameCanvasRuntimeParticleSnapshot | null;

  const shelterClippingData = useMemo(() => {
    if (!sceneRuntime?.shelters) return [];
    return Array.from(sceneRuntime.shelters.values()).map((shelter: any) => ({
      posX: shelter.posX,
      posY: shelter.posY,
      isDestroyed: shelter.isDestroyed,
    }));
  }, [sceneRuntime?.shelters]);

  const localPlayerX = predictedPosition?.x ?? localPlayer?.positionX ?? 0;
  const localPlayerY = predictedPosition?.y ?? localPlayer?.positionY ?? 0;

  const renderContext = useMemo(() => {
    if (!sceneRuntime || !controllerRuntime || !effectsRuntime) {
      return null;
    }

    return {
    ENABLE_LAG_DIAGNOSTICS,
    ENABLE_YSORT_DEBUG,
    YSORT_DEBUG_INTERVAL_MS,
    PLAYER_SORT_FEET_OFFSET_PX,
    LAG_DIAGNOSTIC_INTERVAL_MS,
    perfProfilingRef,
    gameCanvasRef,
    resolvedMaskCanvas: sceneRuntime.resolvedMaskCanvas,
    worldMousePosRef: controllerRuntime.worldMousePosRef,
    cameraOffsetRef: controllerRuntime.cameraOffsetRef,
    predictedPositionRef: controllerRuntime.predictedPositionRef,
    localFacingDirectionRef: controllerRuntime.localFacingDirectionRef,
    getCurrentDodgeRollVisualNow,
    interpolatedCloudsRef: controllerRuntime.interpolatedCloudsRef,
    cycleProgressRef: controllerRuntime.cycleProgressRef,
    ySortedEntitiesRef: controllerRuntime.ySortedEntitiesRef,
    swimmingPlayersForBottomHalfRef: controllerRuntime.swimmingPlayersForBottomHalfRef,
    localSwimTransitionRef: renderRefs.localSwimTransitionRef,
    ySortDebugRef,
    localPlayerId,
    localPlayer,
    canvasSize,
    currentCanvasWidth: canvasSize.width,
    currentCanvasHeight: canvasSize.height,
    renderGameDepsRef: controllerRuntime.renderGameDepsRef,
    seaTransitionTileLookup: sceneRuntime.seaTransitionTileLookup,
    waterTileLookup: sceneRuntime.waterTileLookup,
    showFpsProfiler,
    allShadowsEnabled,
    shelterClippingData,
    visibleWorldTiles: sceneRuntime.visibleWorldTiles,
    showAutotileDebug,
    waterPatches: sceneRuntime.waterPatches,
    fertilizerPatches: sceneRuntime.fertilizerPatches,
    firePatches: sceneRuntime.firePatches,
    placedExplosives: sceneRuntime.placedExplosives,
    placementInfo,
    visibleCampfires: sceneRuntime.visibleCampfires,
    visibleBarbecues: sceneRuntime.visibleBarbecues,
    visibleSeaStacks: sceneRuntime.visibleSeaStacks,
    visibleBarrels: sceneRuntime.visibleBarrels,
    doodadImagesRef: assets.doodadImagesRef,
    deltaTimeRef: renderRefs.deltaTimeRef,
    players: sceneRuntime.players,
    remotePlayerInterpolation: sceneRuntime.remotePlayerInterpolation,
    lastPositionsRef: renderRefs.lastPositionsRef,
    swimmingPlayerScratchRef: renderRefs.swimmingPlayerScratchRef,
    localPlayerScratchRef: renderRefs.localPlayerScratchRef,
    heroImageRef: assets.heroImageRef,
    heroSprintImageRef: assets.heroSprintImageRef,
    heroIdleImageRef: assets.heroIdleImageRef,
    heroWaterImageRef: assets.heroWaterImageRef,
    heroCrouchImageRef: assets.heroCrouchImageRef,
    heroDodgeImageRef: assets.heroDodgeImageRef,
    activeConnections: sceneRuntime.activeConnections,
    worldMousePos: controllerRuntime.worldMousePos,
    activeConsumableEffects: sceneRuntime.activeConsumableEffects,
    alwaysShowPlayerNames,
    localPlayerIsCrouching,
    waterSurfaceEffectsEnabled,
    footprintsEnabled,
    grassAnimationEnabled,
    renderWorldPreparationPasses,
    renderEntityWorldPasses,
    renderScreenSpaceWorldEffects,
    renderLateFramePasses,
    hoveredPlayerIds,
    handlePlayerHover,
    localOptimisticDodgeRollStartMsRef: controllerRuntime.localOptimisticDodgeRollStartMsRef,
    localOptimisticJumpPressMsRef: controllerRuntime.localOptimisticJumpPressMsRef,
    playerDodgeRollStates: sceneRuntime.playerDodgeRollStates,
    foundationTileImagesRef: assets.foundationTileImagesRef,
    wallCells: sceneRuntime.wallCells,
    foundationCells: sceneRuntime.foundationCells,
    visibleFences: sceneRuntime.visibleFences,
    resolvedBuildingClusters: sceneRuntime.resolvedBuildingClusters,
    playerBuildingClusterId: sceneRuntime.playerBuildingClusterId,
    connection,
    isTreeFalling: sceneRuntime.isTreeFalling,
    getFallProgress: sceneRuntime.getFallProgress,
    playerStats: sceneRuntime.playerStats,
    largeQuarries: sceneRuntime.largeQuarries,
    detectedHotSprings: sceneRuntime.detectedHotSprings,
    detectedQuarries: sceneRuntime.detectedQuarries,
    caribouBreedingData: sceneRuntime.caribouBreedingData,
    walrusBreedingData: sceneRuntime.walrusBreedingData,
    chunkWeather: sceneRuntime.chunkWeather,
    visibleTrees: sceneRuntime.visibleTrees,
    worldState: sceneRuntime.worldState,
    targetedFoundation: controllerRuntime.targetedFoundation,
    targetedWall: controllerRuntime.targetedWall,
    targetedFence: controllerRuntime.targetedFence,
    hasRepairHammer: controllerRuntime.hasRepairHammer,
    worldParticlesQuality,
    renderParticles: effectsRuntime.renderParticles,
    computeCampfireFireOverlayEmitters: effectsRuntime.computeCampfireFireOverlayEmitters,
    campfireParticles: effectsRuntime.campfireParticles,
    fireArrowParticles: effectsRuntime.fireArrowParticles,
    torchParticles: effectsRuntime.torchParticles,
    furnaceParticles: effectsRuntime.furnaceParticles,
    barbecueParticles: effectsRuntime.barbecueParticles,
    firePatchParticles: effectsRuntime.firePatchParticles,
    wardParticles: effectsRuntime.wardParticles,
    resourceSparkleParticles: effectsRuntime.resourceSparkleParticles,
    impactParticles: effectsRuntime.impactParticles,
    structureImpactParticles: effectsRuntime.structureImpactParticles,
    hostileDeathParticles: effectsRuntime.hostileDeathParticles,
    visibleHarvestableResourcesMap: sceneRuntime.visibleHarvestableResourcesMap,
    visibleCampfiresMap: sceneRuntime.visibleCampfiresMap,
    visibleFurnacesMap: sceneRuntime.visibleFurnacesMap,
    visibleBarbecuesMap: sceneRuntime.visibleBarbecuesMap,
    fumaroles: sceneRuntime.fumaroles,
    visibleDroppedItemsMap: sceneRuntime.visibleDroppedItemsMap,
    visibleBoxesMap: sceneRuntime.visibleBoxesMap,
    visiblePlayerCorpsesMap: sceneRuntime.visiblePlayerCorpsesMap,
    stashes: sceneRuntime.stashes,
    visibleSleepingBagsMap: sceneRuntime.visibleSleepingBagsMap,
    itemDefinitions: sceneRuntime.itemDefinitions,
    buildingState: controllerRuntime.buildingState,
    itemImagesRef: assets.itemImagesRef,
    shelterImageRef: assets.shelterImageRef,
    placementError,
    placementActions,
    localPlayerX,
    localPlayerY,
    inventoryItems: sceneRuntime.inventoryItems,
    lastPlacementWarningRef: renderRefs.lastPlacementWarningRef,
    setPlacementWarning,
    cloudsEnabled,
    clouds: sceneRuntime.clouds,
    cloudImagesRef: assets.cloudImagesRef,
    droneEvents: sceneRuntime.droneEvents,
    droneImageRef: assets.droneImageRef,
    showChunkBoundaries,
    showInteriorDebug,
    showCollisionDebug,
    trees: sceneRuntime.trees,
    stones: sceneRuntime.stones,
    runeStones: sceneRuntime.runeStones,
    cairns: sceneRuntime.cairns,
    woodenStorageBoxes: sceneRuntime.woodenStorageBoxes,
    furnaces: sceneRuntime.furnaces,
    barbecues: sceneRuntime.barbecues,
    shelters: sceneRuntime.shelters,
    wildAnimals: sceneRuntime.wildAnimals,
    visibleAnimalCorpsesMap: sceneRuntime.visibleAnimalCorpsesMap,
    barrels: sceneRuntime.barrels,
    roadLampposts: sceneRuntime.roadLampposts,
    seaStacks: sceneRuntime.seaStacks,
    homesteadHearths: sceneRuntime.homesteadHearths,
    basaltColumns: sceneRuntime.basaltColumns,
    doors: sceneRuntime.doors,
    lanterns: sceneRuntime.lanterns,
    turrets: sceneRuntime.turrets,
    monumentParts: sceneRuntime.monumentParts,
    showYSortDebug,
    hasStoneTiller: controllerRuntime.hasStoneTiller,
    showAttackRangeDebug,
    activeEquipments: sceneRuntime.activeEquipments,
    campfires: sceneRuntime.campfires,
    sleepingBags: sceneRuntime.sleepingBags,
    interpolatedGrass: sceneRuntime.interpolatedGrass,
    showPrecipitation,
    stormAtmosphereEnabled,
    resolvedOverlayRgba: sceneRuntime.resolvedOverlayRgba,
    redrawMask: sceneRuntime.redrawMask,
    visibleLanterns: sceneRuntime.visibleLanterns,
    showStatusOverlays,
    visibleRoadLamppostsMap: sceneRuntime.visibleRoadLamppostsMap,
    visibleBarrelsMap: sceneRuntime.visibleBarrelsMap,
    visibleRuneStonesMap: sceneRuntime.visibleRuneStonesMap,
    shipwreckPartsMap: sceneRuntime.shipwreckPartsMap,
    showShipwreckDebug,
    isMobile,
    tapAnimation,
    fpsProfilerRef,
    isProfilerRecording,
    visibleGrassMap: sceneRuntime.visibleGrassMap,
    visibleSeaStacksMap: sceneRuntime.visibleSeaStacksMap,
    visibleBoxesMapSizeSource: sceneRuntime.visibleBoxesMap,
    visibleLanternsMap: sceneRuntime.visibleLanternsMap,
    visibleTurretsMap: sceneRuntime.visibleTurretsMap,
    visibleHomesteadHearthsMap: sceneRuntime.visibleHomesteadHearthsMap,
    visibleDoorsMap: sceneRuntime.visibleDoorsMap,
    rainCollectors: sceneRuntime.rainCollectors,
    brothPots: sceneRuntime.brothPots,
    alkStations: sceneRuntime.alkStations,
    EMPTY_MAP,
    isAutoAttacking,
    isAutoWalking,
    swimmingPlayerTopHalfScratchRef: renderRefs.swimmingPlayerTopHalfScratchRef,
      checkPerformance,
    };
  }, [
    ENABLE_LAG_DIAGNOSTICS,
    ENABLE_YSORT_DEBUG,
    YSORT_DEBUG_INTERVAL_MS,
    PLAYER_SORT_FEET_OFFSET_PX,
    LAG_DIAGNOSTIC_INTERVAL_MS,
    perfProfilingRef,
    gameCanvasRef,
    sceneRuntime,
    controllerRuntime,
    localPlayerId,
    localPlayer,
    canvasSize,
    showFpsProfiler,
    allShadowsEnabled,
    shelterClippingData,
    showAutotileDebug,
    renderRefs,
    assets,
    connection,
    alwaysShowPlayerNames,
    localPlayerIsCrouching,
    waterSurfaceEffectsEnabled,
    footprintsEnabled,
    grassAnimationEnabled,
    hoveredPlayerIds,
    handlePlayerHover,
    worldParticlesQuality,
    effectsRuntime,
    placementInfo,
    placementError,
    placementActions,
    localPlayerX,
    localPlayerY,
    setPlacementWarning,
    cloudsEnabled,
    showChunkBoundaries,
    showInteriorDebug,
    showCollisionDebug,
    showYSortDebug,
    showAttackRangeDebug,
    showPrecipitation,
    stormAtmosphereEnabled,
    showStatusOverlays,
    showShipwreckDebug,
    isMobile,
    tapAnimation,
    isProfilerRecording,
    isAutoAttacking,
    isAutoWalking,
    checkPerformance,
    fpsProfilerRef,
    getCurrentDodgeRollVisualNow,
  ]);

  useEffect(() => {
    if (!renderContext) {
      return;
    }
    host.configureRenderContext(renderContext);
  }, [host, renderContext]);
}
