import { useRef, type MutableRefObject } from 'react';
import type { GameLoopMetrics } from '../../hooks/useGameLoop';
import { useGameCanvasBuildState } from './useGameCanvasBuildState';
import { useGameCanvasInteractionRuntime } from './useGameCanvasInteractionRuntime';
import { useGameCanvasFrameRuntimeState } from './useGameCanvasFrameRuntimeState';
import { useGameCanvasUpgradeMenuState } from '../../hooks/useGameCanvasUpgradeMenuState';
import { useGameCanvasHostState } from '../../hooks/useGameCanvasHostState';

interface UseGameCanvasControllerRuntimeOptions {
  gameCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  sceneRuntime: any;
  localPlayer: any;
  localPlayerId?: string;
  connection: any | null;
  predictedPosition: { x: number; y: number } | null;
  getCurrentPositionNow: () => { x: number; y: number } | null;
  localFacingDirection: string | undefined;
  cameraOffsetX: number;
  cameraOffsetY: number;
  canvasSize: { width: number; height: number };
  deltaTimeRef: MutableRefObject<number>;
  interactionScanFrameSkipRef: MutableRefObject<number>;
  gameLoopMetricsRef: MutableRefObject<GameLoopMetrics | null>;
  onDodgeRollStart?: (moveX: number, moveY: number) => void;
  addSOVAMessage?: (message: any) => void;
  showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void;
  onCairnNotification?: (notification: any) => void;
  onSetInteractingWith: (target: any | null) => void;
  isMinimapOpen: boolean;
  setIsMinimapOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isChatting: boolean;
  showInventory: boolean;
  isGameMenuOpen: boolean;
  isSearchingCraftRecipes?: boolean;
  isFishing: boolean;
  setMusicPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
  movementDirection: { x: number; y: number };
  isAutoWalking: boolean;
  showFpsProfiler: boolean;
  isProfilerRecording: boolean;
  startProfilerRecording?: () => void;
  stopProfilerRecording?: () => Promise<boolean>;
  onProfilerCopied?: () => void;
  placementInfo: any;
  placementActions: any;
  isMobile?: boolean;
  onMobileTap?: (worldX: number, worldY: number) => void;
  onMobileInteractInfoChange?: (info: { hasTarget: boolean; label?: string } | null) => void;
  mobileInteractTrigger?: number;
  showError: (message: string) => void;
}

export function useGameCanvasControllerRuntime({
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
}: UseGameCanvasControllerRuntimeOptions) {
  const worldMousePosRef = useRef<{ x: number | null; y: number | null }>({ x: 0, y: 0 });
  const cameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const predictedPositionRef = useRef<{ x: number; y: number } | null>(null);
  const localFacingDirectionRef = useRef<string | undefined>(localFacingDirection);
  const localOptimisticDodgeRollStartMsRef = useRef<number>(0);
  const interpolatedCloudsRef = useRef<Map<string, any>>(new Map());
  const cycleProgressRef = useRef<number>(0.375);
  const ySortedEntitiesRef = useRef<any[]>([]);
  const swimmingPlayersForBottomHalfRef = useRef<any[]>([]);

  const buildState = useGameCanvasBuildState({
    canvasRef: gameCanvasRef,
    cameraOffsetX,
    cameraOffsetY,
    canvasSize,
    connection,
    predictedPosition,
    localPlayer,
    activeEquipments: sceneRuntime.activeEquipments,
    itemDefinitions: sceneRuntime.itemDefinitions,
    localPlayerId,
    isMobile,
    onMobileTap,
  });

  const interactionRuntime = useGameCanvasInteractionRuntime({
    localPlayer,
    predictedPosition,
    getCurrentPositionNow,
    campfires: sceneRuntime.campfires,
    furnaces: sceneRuntime.furnaces,
    barbecues: sceneRuntime.barbecues,
    fumaroles: sceneRuntime.fumaroles,
    lanterns: sceneRuntime.lanterns,
    visibleTurretsMap: sceneRuntime.visibleTurretsMap,
    homesteadHearths: sceneRuntime.homesteadHearths,
    droppedItems: sceneRuntime.droppedItems,
    woodenStorageBoxes: sceneRuntime.woodenStorageBoxes,
    playerCorpses: sceneRuntime.playerCorpses,
    stashes: sceneRuntime.stashes,
    sleepingBags: sceneRuntime.sleepingBags,
    players: sceneRuntime.players,
    shelters: sceneRuntime.shelters,
    connection,
    inventoryItems: sceneRuntime.inventoryItems,
    itemDefinitions: sceneRuntime.itemDefinitions,
    playerDrinkingCooldowns: sceneRuntime.playerDrinkingCooldowns,
    rainCollectors: sceneRuntime.rainCollectors,
    brothPots: sceneRuntime.brothPots,
    doors: sceneRuntime.doors,
    visibleAlkStationsMap: sceneRuntime.visibleAlkStationsMap,
    cairns: sceneRuntime.cairns,
    harvestableResources: sceneRuntime.harvestableResources,
    visibleWorldTiles: sceneRuntime.visibleWorldTiles,
    wildAnimals: sceneRuntime.wildAnimals,
    caribouBreedingData: sceneRuntime.caribouBreedingData ?? new Map(),
    walrusBreedingData: sceneRuntime.walrusBreedingData ?? new Map(),
    worldState: sceneRuntime.worldState,
    showFpsProfiler,
    isProfilerRecording,
    canvasWidth: canvasSize.width,
    startProfilerRecording,
    stopProfilerRecording,
    onProfilerCopied,
    onDodgeRollStart,
    localOptimisticDodgeRollStartMsRef,
    canvasRef: gameCanvasRef,
    activeEquipments: sceneRuntime.activeEquipments,
    placementInfo,
    placementActions,
    buildingState: buildState.buildingState,
    buildingActions: buildState.buildingActions,
    worldMousePos: buildState.worldMousePos,
    visibleTreesMap: sceneRuntime.visibleTreesMap,
    visibleStonesMap: sceneRuntime.visibleStonesMap,
    visibleLivingCoralsMap: sceneRuntime.visibleLivingCoralsMap,
    visibleBarrelsMap: sceneRuntime.visibleBarrelsMap,
    visibleAnimalCorpsesMap: sceneRuntime.visibleAnimalCorpsesMap,
    visibleWildAnimalsMap: sceneRuntime.visibleWildAnimalsMap,
    playerDiscoveredCairns: sceneRuntime.playerDiscoveredCairns,
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
    targetedFoundation: buildState.targetedFoundation,
    targetedWall: buildState.targetedWall,
    targetedFence: buildState.targetedFence,
    rangedWeaponStats: sceneRuntime.rangedWeaponStats,
    projectiles: sceneRuntime.projectiles,
    isMobile,
    onMobileInteractInfoChange,
    mobileInteractTrigger,
    showError,
  });

  const { renderGameDepsRef } = useGameCanvasFrameRuntimeState({
    worldMousePos: buildState.worldMousePos,
    worldMousePosRef,
    cameraOffsetX,
    cameraOffsetY,
    cameraOffsetRef,
    predictedPosition,
    predictedPositionRef,
    localFacingDirection,
    localFacingDirectionRef,
    interpolatedClouds: sceneRuntime.interpolatedClouds,
    interpolatedCloudsRef,
    cycleProgress: sceneRuntime.worldState?.cycleProgress ?? 0.375,
    cycleProgressRef,
    ySortedEntities: sceneRuntime.resolvedYSortedEntities,
    ySortedEntitiesRef,
    swimmingPlayersForBottomHalf: sceneRuntime.resolvedSwimmingPlayersForBottomHalf,
    swimmingPlayersForBottomHalfRef,
    messages: sceneRuntime.messages,
    renderableProjectiles: sceneRuntime.renderableProjectiles,
    holdInteractionProgress: interactionRuntime.interactionProgress,
    isActivelyHolding: interactionRuntime.isActivelyHolding,
    closestInteractableHarvestableResourceId: interactionRuntime.closestInteractableHarvestableResourceId,
    closestInteractableCampfireId: interactionRuntime.closestInteractableCampfireId,
    closestInteractableDroppedItemId: interactionRuntime.closestInteractableDroppedItemId,
    closestInteractableBoxId: interactionRuntime.closestInteractableBoxId,
    isClosestInteractableBoxEmpty: interactionRuntime.isClosestInteractableBoxEmpty,
    closestInteractableWaterPosition: interactionRuntime.closestInteractableWaterPosition,
    closestInteractableStashId: interactionRuntime.closestInteractableStashId,
    closestInteractableSleepingBagId: interactionRuntime.closestInteractableSleepingBagId,
    closestInteractableDoorId: interactionRuntime.closestInteractableDoorId,
    closestInteractableTarget: interactionRuntime.closestInteractableTarget,
    unifiedInteractableTarget: interactionRuntime.unifiedInteractableTarget,
    closestInteractableKnockedOutPlayerId: interactionRuntime.closestInteractableKnockedOutPlayerId,
    closestInteractableCorpseId: interactionRuntime.closestInteractableCorpseId,
    closestInteractableAlkStationId: interactionRuntime.closestInteractableAlkStationId,
    closestInteractableCairnId: interactionRuntime.closestInteractableCairnId,
    closestInteractableMilkableAnimalId: interactionRuntime.closestInteractableMilkableAnimalId,
  });

  const upgradeMenuState = useGameCanvasUpgradeMenuState({
    showUpgradeRadialMenu: interactionRuntime.showUpgradeRadialMenu,
    targetedFoundation: buildState.targetedFoundation,
    targetedWall: buildState.targetedWall,
    targetedFence: buildState.targetedFence,
  });

  const hostState = useGameCanvasHostState({
    localPlayer,
    connection,
    isGameMenuOpen,
    placementInfo,
    deathMarkers: sceneRuntime.deathMarkers,
    sleepingBags: sceneRuntime.sleepingBags,
  });

  return {
    ...buildState,
    ...interactionRuntime,
    ...upgradeMenuState,
    ...hostState,
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
  };
}
