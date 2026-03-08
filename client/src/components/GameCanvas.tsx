/**
 * GameCanvas - Canvas host around runtime-backed frame, interaction, and render state.
 *
 * Bridges the DOM canvas into the client runtime, wires canvas-local hooks that still
 * feed frame assembly and interaction/render pipelines, and renders only the canvas
 * surface plus canvas-adjacent overlay UI. This file is now much closer to a host
 * boundary, but it still assembles a large amount of canvas-specific runtime input.
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';

import type {
  Player as SpacetimeDBPlayer,
} from '../generated/types';

// --- Core Hooks ---
import { useWalkingAnimationCycle, useSprintAnimationCycle, useIdleAnimationCycle } from '../hooks/useAnimationCycle';
import { useAssetLoader } from '../hooks/useAssetLoader';
import { useDoodadImages } from '../hooks/useDoodadImages';
import { useGameViewport } from '../hooks/useGameViewport';
import type { GameLoopMetrics } from '../hooks/useGameLoop';
import { usePlayerHover } from '../hooks/usePlayerHover';
import { usePlantedSeedHover } from '../hooks/usePlantedSeedHover';
import { useTamedAnimalHover } from '../hooks/useTamedAnimalHover';
import { useRuneStoneHover } from '../hooks/useRuneStoneHover';
import { useGameCanvasLagDiagnostics } from '../hooks/useGameCanvasLagDiagnostics';
import { renderGameCanvasFrame } from '../engine/frame/renderGameCanvasFrame';
import { renderLateFramePasses } from '../engine/frame/renderLateFramePasses';
import { renderWorldPreparationPasses } from '../engine/frame/renderWorldPreparationPasses';
import { renderEntityWorldPasses } from '../engine/frame/renderEntityWorldPasses';
import { renderTranslatedWorldExtras } from '../engine/frame/renderTranslatedWorldExtras';
import { renderScreenSpaceWorldEffects } from '../engine/frame/renderScreenSpaceWorldEffects';
import { useDamageEffects } from '../hooks/useDamageEffects';
import { useSettings } from '../contexts/SettingsContext';
import { useErrorDisplay } from '../contexts/ErrorDisplayContext';
import { useGameUI } from '../contexts/GameUIContext';
import { useGameplaySession } from '../contexts/GameplaySessionContext';
import { useGameplayInteraction } from '../contexts/GameplayInteractionContext';
import { useGameplayMovement } from '../contexts/GameplayMovementContext';
import { useLocalPlayer } from '../engine/selectors';

// --- Rendering Utilities ---
import { setWaterOverlayIntensity } from '../utils/renderers/waterOverlayUtils';

// --- Other Components & Utils ---
import GameCanvasOverlayUI from './GameCanvasOverlayUI';
import type { PlacementItemInfo, PlacementActions } from '../hooks/usePlacementManager';
import { gameConfig } from '../config/gameConfig';
// V2 system removed due to performance issues
import { useGameCanvasAssetPreload } from '../hooks/useGameCanvasAssetPreload';
import { useGameCanvasFramePipeline } from '../engine/runtime/useGameCanvasFramePipeline';
import { useGameCanvasSceneRuntime } from '../engine/runtime/useGameCanvasSceneRuntime';
import { useGameCanvasEffectsRuntime } from '../engine/runtime/useGameCanvasEffectsRuntime';
import { useGameCanvasControllerRuntime } from '../engine/runtime/useGameCanvasControllerRuntime';

// Stable empty Map fallback to avoid per-render allocations.
const EMPTY_MAP = new Map();

// --- Prop Interface ---
interface GameCanvasProps {
  localPlayerId?: string;
  connection: any | null;
  placementInfo: PlacementItemInfo | null;
  placementActions: PlacementActions;
  placementError: string | null;
  setPlacementWarning: (warning: string | null) => void;
  gameCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  addSOVAMessage?: (message: { id: string; text: string; isUser: boolean; timestamp: Date; flashTab?: boolean }) => void; // SOVA message sink for cairn lore.
  showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void; // SOVA audio visualization callback.
  onCairnNotification?: (notification: { id: string; cairnNumber: number; totalCairns: number; title: string; isFirstDiscovery: boolean; timestamp: number }) => void;
  showAutotileDebug: boolean;
  showChunkBoundaries: boolean;
  showInteriorDebug: boolean;
  showCollisionDebug: boolean;
  showAttackRangeDebug: boolean;
  showYSortDebug: boolean;
  showShipwreckDebug: boolean;
  showFpsProfiler?: boolean; // FPS profiler overlay - lightweight, no extra lag when enabled
  isProfilerRecording?: boolean; // Show REC indicator when recording
  startProfilerRecording?: () => void;
  stopProfilerRecording?: () => Promise<boolean>;
  onProfilerCopied?: () => void; // Toast callback when stop & copy succeeds
  isGameMenuOpen: boolean;
  onAutoActionStatesChange?: (isAutoAttacking: boolean) => void;
}

/**
 * GameCanvas Component
 *
 * The main component responsible for rendering the game world, entities, UI elements,
 * and handling the game loop orchestration. It integrates various custom hooks
 * to manage specific aspects like input, viewport, assets, day/night cycle, etc.
 */
const GameCanvas: React.FC<GameCanvasProps> = ({
  localPlayerId,
  connection,
  placementInfo,
  placementActions,
  placementError,
  setPlacementWarning,
  gameCanvasRef,
  showAutotileDebug,
  showChunkBoundaries,
  showInteriorDebug,
  showCollisionDebug,
  showAttackRangeDebug,
  showYSortDebug,
  showShipwreckDebug,
  showFpsProfiler = false,
  isProfilerRecording = false,
  startProfilerRecording,
  stopProfilerRecording,
  onProfilerCopied,
  isGameMenuOpen,
  onAutoActionStatesChange,
  addSOVAMessage,
  showSovaSoundBox,
  onCairnNotification,
}) => {
  // --- Settings from context (audio + visual) ---
  const {
    environmentalVolume,
    allShadowsEnabled,
    weatherOverlayEnabled: showPrecipitation,
    stormAtmosphereEnabled,
    statusOverlaysEnabled: showStatusOverlays,
    alwaysShowPlayerNames,
    cloudsEnabled,
    waterSurfaceEffectsEnabled,
    waterSurfaceEffectsIntensity,
    worldParticlesQuality,
    footprintsEnabled,
    bloomIntensity,
    vignetteIntensity,
    chromaticAberrationIntensity,
    colorCorrection,
    fixedSimulationEnabled,
  } = useSettings();
  const gameUI = useGameUI();
  const {
    onMobileInteractInfoChange,
    mobileInteractTrigger,
    showInventoryState,
    showCraftingScreenState,
  } = useGameplaySession();
  const { handleSetInteractingWith: onSetInteractingWith } = useGameplayInteraction();
  const {
    predictedPosition,
    getCurrentPositionNow,
    getCurrentFacingDirectionNow,
    getCurrentDodgeRollVisualNow,
    onDodgeRollStart,
    stepPredictedMovement,
    movementDirection,
    isAutoWalking,
    facingDirection: localFacingDirection,
    isMobile,
    onMobileTap,
    tapAnimation,
    isFishing,
  } = useGameplayMovement();
  const isMinimapOpen = gameUI.isMinimapOpen;
  const setIsMinimapOpen = gameUI.setIsMinimapOpen;
  const isChatting = gameUI.isChatting;
  const isSearchingCraftRecipes = gameUI.isCraftingSearchFocused;
  const showInventory = showInventoryState || showCraftingScreenState;
  const setMusicPanelVisible = gameUI.setIsMusicPanelVisible;

  useEffect(() => {
    setWaterOverlayIntensity(waterSurfaceEffectsIntensity / 100);
  }, [waterSurfaceEffectsIntensity]);

  const postProcessStyle = useMemo(() => {
    const colorOffset = colorCorrection - 50;
    // Bloom: 25% slider = max effect (cap effective at 25)
    const effectiveBloom = Math.min(bloomIntensity, 25);
    const bloomBrightness = 1 + effectiveBloom * 0.0045;
    const bloomBlur = effectiveBloom * 0.02;
    const colorBrightness = 1 + colorOffset * 0.0025;
    const colorContrast = 1 + colorOffset * 0.004;
    const colorSaturation = 1 + colorOffset * 0.0065;
    const colorHueRotate = colorOffset * 0.28;

    const cssFilterParts = [
      `brightness(${(bloomBrightness * colorBrightness).toFixed(3)})`,
      `contrast(${colorContrast.toFixed(3)})`,
      `saturate(${colorSaturation.toFixed(3)})`,
      `hue-rotate(${colorHueRotate.toFixed(2)}deg)`,
      `blur(${bloomBlur.toFixed(3)}px)`,
    ];

    if (chromaticAberrationIntensity > 0) {
      cssFilterParts.push('url(#game-chromatic-aberration-filter)');
    }

    const vignetteEdgeOpacity = Math.max(0, Math.min(0.72, vignetteIntensity * 0.009));
    // Chromatic aberration: 50% slider = max effect (cap effective at 50)
    const effectiveChromatic = Math.min(chromaticAberrationIntensity, 50);
    const chromaticOffset = effectiveChromatic * 0.03;

    return {
      cssFilter: cssFilterParts.join(' '),
      vignetteEdgeOpacity,
      chromaticOffset,
    };
  }, [bloomIntensity, vignetteIntensity, chromaticAberrationIntensity, colorCorrection]);

  const { showError } = useErrorDisplay();

  // --- Refs ---
  const lastPositionsRef = useRef<Map<string, { x: number, y: number }>>(new Map());
  const lastPlacementWarningRef = useRef<string | null>(null);

  // High-frequency value refs (to avoid renderGame dependency array churn)
  const localSwimTransitionRef = useRef<{ wasSwimming: boolean; enteredWaterAtMs: number }>({
    wasSwimming: false,
    enteredWaterAtMs: 0,
  });

  // Phase 3d: Reusable scratch objects for render hot path (avoid spread-operator allocation)
  const swimmingPlayerScratchRef = useRef<Partial<SpacetimeDBPlayer> & { positionX: number; positionY: number }>({ positionX: 0, positionY: 0 });
  const swimmingPlayerTopHalfScratchRef = useRef<{ entity: SpacetimeDBPlayer; playerId: string; yPosition: number }>({ entity: null as any, playerId: '', yPosition: 0 });
  const localPlayerScratchRef = useRef<Record<string, unknown>>({ positionX: 0, positionY: 0, direction: 0 });
  const deltaTimeRef = useRef<number>(0);
  const interactionScanFrameSkipRef = useRef<number>(0);
  const gameLoopMetricsRef = useRef<GameLoopMetrics | null>(null);

  // --- Core Game State Hooks ---
  const localPlayer = useLocalPlayer(localPlayerId ?? null);

  const { canvasSize, cameraOffsetX: baseCameraOffsetX, cameraOffsetY: baseCameraOffsetY } = useGameViewport(localPlayer, predictedPosition);

  // === AAA Combat Effects: Screen shake, vignette, heartbeat ===
  // PERFORMANCE FIX: shakeOffset and vignetteOpacity are now refs (updated by RAF loop,
  // not React state). Only low-health UI state triggers re-renders.
  const {
    isLowHealth,
    isCriticalHealth,
    heartbeatPulse
  } = useDamageEffects(localPlayer, 100); // 100 = max health

  // Camera offset WITHOUT shake - used by hooks (mouse position, day/night, etc.)
  // Screen shake is applied directly inside renderGame() by reading shakeOffsetXRef/YRef,
  // which avoids triggering React re-renders on every shake frame.
  const cameraOffsetX = baseCameraOffsetX;
  const cameraOffsetY = baseCameraOffsetY;

  const { heroImageRef, heroSprintImageRef, heroIdleImageRef, heroWaterImageRef, heroCrouchImageRef, heroDodgeImageRef, itemImagesRef, cloudImagesRef, droneImageRef, shelterImageRef } = useAssetLoader();
  const doodadImagesRef = useDoodadImages(); // Extracted to dedicated hook
  const {
    foundationTileImagesRef,
    deathMarkerImg,
    pinMarkerImg,
    campfireWarmthImg,
    torchOnImg,
  } = useGameCanvasAssetPreload({
    itemImagesRef,
  });

  // These hooks advance the shared animation refs consumed by the frame renderer.
  useWalkingAnimationCycle();
  useSprintAnimationCycle();
  useIdleAnimationCycle();

  const sceneRuntime = useGameCanvasSceneRuntime({
    connection,
    localPlayerId,
    localPlayer,
    gameCanvasRef,
    predictedPosition,
    cameraOffsetX,
    cameraOffsetY,
    canvasSize,
    deltaTime: deltaTimeRef.current,
  });

  const {
    players,
    trees,
    clouds,
    droneEvents,
    stones,
    runeStones,
    cairns,
    campfires,
    furnaces,
    barbecues,
    lanterns,
    turrets,
    woodenStorageBoxes,
    sleepingBags,
    playerCorpses,
    stashes,
    rainCollectors,
    brothPots,
    waterPatches,
    fertilizerPatches,
    firePatches,
    placedExplosives,
    inventoryItems,
    itemDefinitions,
    activeEquipments,
    activeConsumableEffects,
    worldState,
    activeConnections,
    plantedSeeds,
    wildAnimals,
    barrels,
    roadLampposts,
    fumaroles,
    basaltColumns,
    seaStacks,
    homesteadHearths,
    foundationCells,
    wallCells,
    doors,
    playerDodgeRollStates,
    chunkWeather,
    alkStations,
    monumentParts,
    largeQuarries,
    playerStats,
    caribouBreedingData,
    walrusBreedingData,
    shelters,
    interpolatedGrass,
    shipwreckPartsMap,
    isTreeFalling,
    getFallProgress,
    visibleWorldTiles,
    waterTileLookup,
    seaTransitionTileLookup,
    detectedHotSprings,
    detectedQuarries,
    visibleSleepingBags,
    visibleHarvestableResources,
    visibleDroppedItems,
    visibleCampfires,
    visibleBarbecues,
    visibleHarvestableResourcesMap,
    visibleCampfiresMap,
    visibleFurnacesMap,
    visibleBarbecuesMap,
    visibleLanternsMap,
    visibleTurretsMap,
    visibleRuneStonesMap,
    visibleDroppedItemsMap,
    visibleBoxesMap,
    visiblePlayerCorpses,
    visibleStashes,
    visiblePlayerCorpsesMap,
    visibleSleepingBagsMap,
    visibleTrees,
    visibleTreesMap,
    visibleGrassMap,
    visibleShelters,
    visibleSheltersMap,
    visibleLanterns,
    visibleAnimalCorpsesMap,
    visibleBarrels,
    visibleBarrelsMap,
    visibleRoadLamppostsMap,
    visibleSeaStacks,
    visibleSeaStacksMap,
    visibleHomesteadHearthsMap,
    visibleDoorsMap,
    visibleFences,
    resolvedBuildingClusters,
    playerBuildingClusterId,
    resolvedOverlayRgba,
    resolvedMaskCanvas,
    redrawMask,
    remotePlayerInterpolation,
  } = sceneRuntime;

  const {
    worldMousePos,
    canvasMousePos,
    buildingState,
    buildingActions,
    hasRepairHammer,
    hasStoneTiller,
    targetedFoundation,
    targetedWall,
    targetedFence,
    updateInteractionResult,
    isAutoAttacking,
    isCrouching: localPlayerIsCrouching,
    showBuildingRadialMenu,
    radialMenuMouseX,
    radialMenuMouseY,
    setShowBuildingRadialMenu,
    showUpgradeRadialMenu,
    setShowUpgradeRadialMenu,
    processInputsAndActions,
    upgradeMenuFoundationRef,
    upgradeMenuWallRef,
    upgradeMenuFenceRef,
    cursorStyle,
    worldMousePosRef,
    cameraOffsetRef,
    predictedPositionRef,
    localFacingDirectionRef,
    localOptimisticDodgeRollStartMsRef,
    interpolatedCloudsRef,
    cycleProgressRef,
    ySortedEntitiesRef,
    swimmingPlayersForBottomHalfRef,
    renderGameDepsRef,
  } = useGameCanvasControllerRuntime({
    gameCanvasRef,
    sceneRuntime,
    localPlayer,
    localPlayerId,
    connection,
    predictedPosition,
    getCurrentPositionNow,
    localFacingDirection,
    cameraOffsetX,
    cameraOffsetY,
    canvasSize,
    deltaTimeRef,
    interactionScanFrameSkipRef,
    gameLoopMetricsRef,
    onDodgeRollStart,
    addSOVAMessage,
    showSovaSoundBox,
    onCairnNotification,
    onSetInteractingWith,
    isMinimapOpen,
    setIsMinimapOpen,
    isChatting,
    showInventory,
    isGameMenuOpen,
    isSearchingCraftRecipes,
    isFishing,
    setMusicPanelVisible,
    movementDirection,
    isAutoWalking,
    showFpsProfiler,
    isProfilerRecording,
    startProfilerRecording,
    stopProfilerRecording,
    onProfilerCopied,
    placementInfo,
    placementActions,
    isMobile,
    onMobileTap,
    onMobileInteractInfoChange,
    mobileInteractTrigger,
    showError,
  });

  // --- UI State ---
  const { hoveredPlayerIds, handlePlayerHover } = usePlayerHover();

  const { hoveredSeed, hoveredSeedId } = usePlantedSeedHover(
    plantedSeeds,
    worldMousePos.x,
    worldMousePos.y
  );

  const { hoveredTamedAnimal, hoveredAnimalId } = useTamedAnimalHover(
    wildAnimals,
    worldMousePos.x,
    worldMousePos.y
  );

  // Define camera and canvas dimensions for rendering
  const localPlayerX = predictedPosition?.x ?? localPlayer?.positionX ?? 0;
  const localPlayerY = predictedPosition?.y ?? localPlayer?.positionY ?? 0;


  const {
    renderParticles,
    campfireParticles,
    torchParticles,
    fireArrowParticles,
    furnaceParticles,
    barbecueParticles,
    firePatchParticles,
    wardParticles,
    resourceSparkleParticles,
    hostileDeathParticles,
    impactParticles,
    structureImpactParticles,
  } = useGameCanvasEffectsRuntime({
    connection,
    localPlayer,
    localPlayerId,
    predictedPosition,
    worldMousePos,
    sceneRuntime,
    cameraOffsetX,
    cameraOffsetY,
    canvasSize,
    environmentalVolume,
    isAutoAttacking,
    onAutoActionStatesChange,
    showError,
  });

  // Helper function to convert shelter data for shadow clipping
  const shelterClippingData = useMemo(() => {
    if (!shelters) return [];
    return Array.from(shelters.values()).map(shelter => ({
      posX: shelter.posX,
      posY: shelter.posY,
      isDestroyed: shelter.isDestroyed,
    }));
  }, [shelters]);

  // === PERFORMANCE PROFILING ===
  // 🔧 SET TO true TO ENABLE LAG DIAGNOSTICS IN CONSOLE
  const ENABLE_LAG_DIAGNOSTICS = false;
  const LAG_DIAGNOSTIC_INTERVAL_MS = 5000; // Log every 5 seconds
  const PLAYER_SORT_FEET_OFFSET_PX = gameConfig.tileSize;
  // 🔧 SET TO true TO ENABLE Y-SORT DEBUG LOGGING (throttled to 400ms; adds findIndex + loop overhead)
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

  const renderGame = useCallback((renderAlpha: number = 1) => {
    renderGameCanvasFrame({
      ENABLE_LAG_DIAGNOSTICS,
      ENABLE_YSORT_DEBUG,
      YSORT_DEBUG_INTERVAL_MS,
      PLAYER_SORT_FEET_OFFSET_PX,
      LAG_DIAGNOSTIC_INTERVAL_MS,
      perfProfilingRef,
      gameCanvasRef,
      resolvedMaskCanvas,
      worldMousePosRef,
      cameraOffsetRef,
      predictedPositionRef,
      localFacingDirectionRef,
      getCurrentDodgeRollVisualNow,
      interpolatedCloudsRef,
      cycleProgressRef,
      ySortedEntitiesRef,
      swimmingPlayersForBottomHalfRef,
      localSwimTransitionRef,
      ySortDebugRef,
      localPlayerId,
      localPlayer,
      canvasSize,
      currentCanvasWidth: canvasSize.width,
      currentCanvasHeight: canvasSize.height,
      renderGameDepsRef,
      seaTransitionTileLookup,
      waterTileLookup,
      showFpsProfiler,
      allShadowsEnabled,
      shelterClippingData,
      visibleWorldTiles,
      showAutotileDebug,
      waterPatches,
      fertilizerPatches,
      firePatches,
      placedExplosives,
      placementInfo,
      visibleCampfires,
      visibleBarbecues,
      visibleSeaStacks,
      visibleBarrels,
      doodadImagesRef,
      deltaTimeRef,
      players,
      remotePlayerInterpolation,
      lastPositionsRef,
      swimmingPlayerScratchRef,
      localPlayerScratchRef,
      heroImageRef,
      heroSprintImageRef,
      heroIdleImageRef,
      heroWaterImageRef,
      heroCrouchImageRef,
      heroDodgeImageRef,
      activeConnections,
      worldMousePos,
      activeConsumableEffects,
      alwaysShowPlayerNames,
      localPlayerIsCrouching,
      waterSurfaceEffectsEnabled,
      footprintsEnabled,
      renderWorldPreparationPasses,
      renderEntityWorldPasses,
      renderTranslatedWorldExtras,
      renderScreenSpaceWorldEffects,
      renderLateFramePasses,
      hoveredPlayerIds,
      handlePlayerHover,
      localOptimisticDodgeRollStartMsRef,
      playerDodgeRollStates,
      foundationTileImagesRef,
      wallCells,
      foundationCells,
      visibleFences,
      resolvedBuildingClusters,
      playerBuildingClusterId,
      connection,
      isTreeFalling,
      getFallProgress,
      playerStats,
      largeQuarries,
      detectedHotSprings,
      detectedQuarries,
      caribouBreedingData,
      walrusBreedingData,
      chunkWeather,
      visibleTrees,
      worldState,
      targetedFoundation,
      targetedWall,
      targetedFence,
      hasRepairHammer,
      worldParticlesQuality,
      renderParticles,
      campfireParticles,
      fireArrowParticles,
      torchParticles,
      furnaceParticles,
      barbecueParticles,
      firePatchParticles,
      wardParticles,
      resourceSparkleParticles,
      impactParticles,
      structureImpactParticles,
      hostileDeathParticles,
      visibleHarvestableResourcesMap,
      visibleCampfiresMap,
      visibleFurnacesMap,
      visibleBarbecuesMap,
      fumaroles,
      visibleDroppedItemsMap,
      visibleBoxesMap,
      visiblePlayerCorpsesMap,
      stashes,
      visibleSleepingBagsMap,
      itemDefinitions,
      buildingState,
      itemImagesRef,
      shelterImageRef,
      placementError,
      placementActions,
      localPlayerX,
      localPlayerY,
      inventoryItems,
      lastPlacementWarningRef,
      setPlacementWarning,
      cloudsEnabled,
      clouds,
      cloudImagesRef,
      droneEvents,
      droneImageRef,
      showChunkBoundaries,
      showInteriorDebug,
      showCollisionDebug,
      trees,
      stones,
      runeStones,
      cairns,
      woodenStorageBoxes,
      furnaces,
      barbecues,
      shelters,
      wildAnimals,
      visibleAnimalCorpsesMap,
      barrels,
      roadLampposts,
      seaStacks,
      homesteadHearths,
      basaltColumns,
      doors,
      lanterns,
      turrets,
      monumentParts,
      showYSortDebug,
      hasStoneTiller,
      showAttackRangeDebug,
      activeEquipments,
      campfires,
      sleepingBags,
      interpolatedGrass,
      showPrecipitation,
      stormAtmosphereEnabled,
      resolvedOverlayRgba,
      redrawMask,
      visibleLanterns,
      showStatusOverlays,
      visibleRoadLamppostsMap,
      visibleBarrelsMap,
      visibleRuneStonesMap,
      shipwreckPartsMap,
      showShipwreckDebug,
      isMobile,
      tapAnimation,
      fpsProfilerRef,
      isProfilerRecording,
      visibleGrassMap,
      visibleSeaStacksMap,
      visibleBoxesMapSizeSource: visibleBoxesMap,
      visibleLanternsMap,
      visibleTurretsMap,
      visibleHomesteadHearthsMap,
      visibleDoorsMap,
      rainCollectors,
      brothPots,
      alkStations,
      EMPTY_MAP,
      isAutoAttacking,
      isAutoWalking,
      swimmingPlayerTopHalfScratchRef,
      renderAlpha,
      checkPerformance,
    });
  }, [checkPerformance,
    visibleHarvestableResources,
    visibleHarvestableResourcesMap,
    visibleDroppedItems, visibleCampfires, visibleSleepingBags,
    visibleCampfiresMap, visibleDroppedItemsMap, visibleBoxesMap,
    players, itemDefinitions, inventoryItems, trees, stones,
    worldState, localPlayerId, localPlayer, activeEquipments,
    itemImagesRef, heroImageRef, heroSprintImageRef, heroWaterImageRef, heroCrouchImageRef, heroDodgeImageRef, cloudImagesRef,
    canvasSize.width, canvasSize.height,
    placementInfo, placementError, resolvedOverlayRgba, resolvedMaskCanvas, redrawMask,
    // Phase 4b: messages, projectiles, holdInteractionProgress, closestInteractable* moved to renderGameDepsRef
    hoveredPlayerIds, handlePlayerHover,
    activeConnections,
    activeConsumableEffects,
    visiblePlayerCorpses,
    visibleStashes,
    visibleSleepingBags,
    isSearchingCraftRecipes,
    visibleTrees,
    visibleTreesMap,
    playerCorpses,
    showInventory,
    gameCanvasRef,
    deathMarkerImg,
    shelters,
    visibleShelters,
    visibleSheltersMap,
    shelterImageRef,
    chunkWeather,
    clouds, // Only need clouds prop for the size check, interpolation is via ref
    droneImageRef,
    showFpsProfiler,
  ]);

  useGameCanvasFramePipeline({
    renderGame,
    processInputsAndActions,
    stepPredictedMovement,
    fixedSimulationEnabled,
    getCurrentPositionNow,
    predictedPositionRef,
    getCurrentFacingDirectionNow,
    localFacingDirectionRef,
    localPlayer,
    updateInteractionResult,
    isAutoWalking,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    showFpsProfiler,
    gameLoopMetricsRef,
    deltaTimeRef,
    interactionScanFrameSkipRef,
    cameraOffsetRef,
  });

  return (
    <div style={{ position: 'relative', width: canvasSize.width, height: canvasSize.height, overflow: 'hidden' }}>
      <svg
        width={0}
        height={0}
        style={{ position: 'absolute', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <defs>
          <filter id="game-chromatic-aberration-filter" colorInterpolationFilters="sRGB">
            <feOffset in="SourceGraphic" dx={postProcessStyle.chromaticOffset} dy="0" result="redOffset" />
            <feColorMatrix
              in="redOffset"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"
              result="redChannel"
            />
            <feOffset in="SourceGraphic" dx={-postProcessStyle.chromaticOffset} dy="0" result="greenOffset" />
            <feColorMatrix
              in="greenOffset"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0.55 0"
              result="greenChannel"
            />
            <feBlend in="redChannel" in2="greenChannel" mode="screen" result="fringe" />
            <feBlend in="SourceGraphic" in2="fringe" mode="screen" />
          </filter>
        </defs>
      </svg>

      <canvas
        ref={gameCanvasRef}
        id="game-canvas"
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          filter: postProcessStyle.cssFilter,
          cursor: cursorStyle,
          pointerEvents: isGameMenuOpen ? 'none' : 'auto', // Don't capture events when menu is open
          touchAction: isMobile ? 'none' : 'auto', // Prevent default touch behaviors on mobile
        }}
        onContextMenu={(e) => {
          if (placementInfo) {
            e.preventDefault();
          }
        }}
      />

      {/* === AAA Damage Vignette Effect === */}
      {/* PERFORMANCE FIX: Vignette is now rendered on the game canvas in renderGame() */}
      {/* Reading from vignetteOpacityRef avoids React re-renders during damage animations */}
      {postProcessStyle.vignetteEdgeOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 45,
            background: `radial-gradient(circle at center, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, ${postProcessStyle.vignetteEdgeOpacity.toFixed(3)}) 100%)`,
            transition: 'background 0.12s ease-out',
          }}
        />
      )}

      {/* === Low Health Warning Effect === */}
      {/* Pulsing red border when health is critically low */}
      {isLowHealth && !localPlayer?.isDead && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            boxShadow: `inset 0 0 ${isCriticalHealth ? 80 : 50}px ${isCriticalHealth ? 30 : 15}px rgba(180, 20, 20, ${0.3 + heartbeatPulse * 0.4})`,
            zIndex: 49,
            transition: 'box-shadow 0.1s ease-out',
          }}
        />
      )}

      <GameCanvasOverlayUI
        connection={connection}
        localPlayerId={localPlayerId}
        itemImagesRef={itemImagesRef}
        deathMarkerImg={deathMarkerImg}
        pinMarkerImg={pinMarkerImg}
        campfireWarmthImg={campfireWarmthImg}
        torchOnImg={torchOnImg}
        canvasSize={canvasSize}
        showBuildingRadialMenu={showBuildingRadialMenu}
        radialMenuMouseX={radialMenuMouseX}
        radialMenuMouseY={radialMenuMouseY}
        buildingActions={buildingActions}
        setShowBuildingRadialMenu={setShowBuildingRadialMenu}
        showUpgradeRadialMenu={showUpgradeRadialMenu}
        setShowUpgradeRadialMenu={setShowUpgradeRadialMenu}
        upgradeMenuFoundationRef={upgradeMenuFoundationRef}
        upgradeMenuWallRef={upgradeMenuWallRef}
        upgradeMenuFenceRef={upgradeMenuFenceRef}
        hoveredSeed={hoveredSeed}
        canvasMousePos={canvasMousePos}
        hoveredTamedAnimal={hoveredTamedAnimal}
      />
    </div>
  );
};

const MemoizedGameCanvas = React.memo(GameCanvas);
export default MemoizedGameCanvas;