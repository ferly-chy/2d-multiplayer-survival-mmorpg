import { gameConfig } from '../../config/gameConfig';
import { runtimeEngine } from '../runtimeEngine';
import { renderGameCanvasFrame } from '../frame/renderGameCanvasFrame';
import type { FrameInfo, GameLoopMetrics, MutableRef, RuntimeFramePipeline, StateSetter } from '../types';
import type { Projectile as SpacetimeDBProjectile } from '../../generated/types';
import type { CampfireFireGpuEmitter } from '../../utils/renderers/campfireFireOverlayUtils';
import { addCameraSample, isProfilerRecording } from '../../utils/profilerRecording';
import type { ReconciliationProfilerSnapshot } from './movementPredictionRuntime';

export interface GameCanvasRuntimeRenderContext {
  [key: string]: unknown;
}

export interface GameCanvasRuntimeSceneSnapshot extends Record<string, any> {
  worldChunkDataMap: Map<string, any> | undefined;
  interpolatedClouds: Map<string, any>;
  interpolatedGrass: Map<string, any>;
  shipwreckPartsMap: Map<string, any>;
  isTreeFalling: (treeId: string) => boolean;
  getFallProgress: (treeId: string) => number;
  TREE_FALL_DURATION_MS: number;
  resolvedOverlayRgba: any;
  resolvedBuildingClusters: any;
  resolvedYSortedEntities: any[];
  resolvedSwimmingPlayersForBottomHalf: any[];
  resolvedMaskCanvas: HTMLCanvasElement | null;
}

export interface GameCanvasRuntimeFrameBindings {
  processInputsAndActions: () => void;
  stepPredictedMovement?: (dtMs: number) => void;
  fixedSimulationEnabled: boolean;
  getCurrentPositionNow?: () => { x: number; y: number } | null;
  getReconciliationProfilerSnapshot?: () => ReconciliationProfilerSnapshot | null;
  predictedPositionRef: MutableRef<{ x: number; y: number } | null>;
  getCurrentFacingDirectionNow?: () => string | undefined;
  localFacingDirectionRef: MutableRef<string | undefined>;
  localPlayer: { positionX: number; positionY: number } | null | undefined;
  updateInteractionResult?: () => void;
  isAutoWalking: boolean;
  canvasWidth: number;
  canvasHeight: number;
  gameLoopMetricsRef: MutableRef<GameLoopMetrics | null>;
  deltaTimeRef: MutableRef<number>;
  interactionScanFrameSkipRef: MutableRef<number>;
  cameraOffsetRef: MutableRef<{ x: number; y: number }>;
}

export interface GameCanvasRuntimeControllerRefs {
  worldMousePosRef: MutableRef<{ x: number | null; y: number | null }>;
  cameraOffsetRef: MutableRef<{ x: number; y: number }>;
  predictedPositionRef: MutableRef<{ x: number; y: number } | null>;
  localFacingDirectionRef: MutableRef<string | undefined>;
  localOptimisticDodgeRollStartMsRef: MutableRef<number>;
  /** Wall-clock ms when local player pressed jump; render + input merge with server like dodge roll. */
  localOptimisticJumpPressMsRef: MutableRef<number>;
  interpolatedCloudsRef: MutableRef<Map<string, any>>;
  cycleProgressRef: MutableRef<number>;
  ySortedEntitiesRef: MutableRef<any[]>;
  swimmingPlayersForBottomHalfRef: MutableRef<any[]>;
  renderGameDepsRef: MutableRef<{
    messages: Map<string, any>;
    projectiles: Map<string, SpacetimeDBProjectile>;
    holdInteractionProgress: { targetId: string | number | bigint | null; targetType: string; startTime: number } | null;
    isActivelyHolding: boolean;
    closestInteractableHarvestableResourceId: bigint | null;
    closestInteractableCampfireId: number | bigint | null;
    closestInteractableDroppedItemId: number | bigint | null;
    closestInteractableBoxId: number | bigint | null;
    isClosestInteractableBoxEmpty: boolean;
    closestInteractableWaterPosition: { x: number; y: number } | null;
    closestInteractableStashId: number | bigint | null;
    closestInteractableSleepingBagId: number | bigint | null;
    closestInteractableDoorId: number | bigint | null;
    closestInteractableTarget: any;
    unifiedInteractableTarget: any;
    closestInteractableKnockedOutPlayerId: string | null;
    closestInteractableCorpseId: number | bigint | null;
    closestInteractableAlkStationId: number | bigint | null;
    closestInteractableCairnId: number | bigint | null;
    closestInteractableMilkableAnimalId: number | bigint | null;
  }>;
}

export interface GameCanvasRuntimeControllerSnapshot
  extends Record<string, any>, GameCanvasRuntimeControllerRefs {
  worldMousePos: { x: number | null; y: number | null };
  canvasMousePos: { x: number | null; y: number | null };
  buildingState: any;
  buildingActions: any;
  hasRepairHammer: boolean;
  hasStoneTiller: boolean;
  targetedFoundation: any;
  targetedWall: any;
  targetedFence: any;
  updateInteractionResult?: () => void;
  isAutoAttacking: boolean;
  isCrouching: boolean;
  showBuildingRadialMenu: boolean;
  radialMenuMouseX: number;
  radialMenuMouseY: number;
  setShowBuildingRadialMenu: StateSetter<boolean>;
  showUpgradeRadialMenu: boolean;
  setShowUpgradeRadialMenu: StateSetter<boolean>;
  processInputsAndActions: () => void;
  upgradeMenuFoundationRef: MutableRef<any>;
  upgradeMenuWallRef: MutableRef<any>;
  upgradeMenuFenceRef: MutableRef<any>;
  cursorStyle: string;
}

export interface GameCanvasRuntimeParticleSnapshot extends Record<string, any> {
  renderParticles: (ctx: CanvasRenderingContext2D, particles: any[]) => void;
  /** World-space GPU emitters for WebGL fire/smoke overlay (built each frame with nowMs). */
  computeCampfireFireOverlayEmitters: (nowMs: number) => readonly CampfireFireGpuEmitter[];
  campfireParticles: any;
  torchParticles: any;
  fireArrowParticles: any;
  furnaceParticles: any;
  barbecueParticles: any;
  firePatchParticles: any;
  wardParticles: any;
  resourceSparkleParticles: any;
  hostileDeathParticles: any;
  impactParticles: any;
  structureImpactParticles: any;
}

export interface GameCanvasRuntimeAmbientEffectsSnapshot extends Record<string, any> {
  connection: any | null;
  localPlayer: any;
  localPlayerId?: string;
  predictedPosition: { x: number; y: number } | null;
  cameraOffsetX: number;
  cameraOffsetY: number;
  canvasSize: { width: number; height: number };
  environmentalVolume: number;
  onAutoActionStatesChange?: (isAutoAttacking: boolean) => void;
  showError: (message: string) => void;
}

export class GameCanvasRuntimeHost {
  private renderContext: GameCanvasRuntimeRenderContext | null = null;
  private frameBindings: GameCanvasRuntimeFrameBindings | null = null;
  private sceneSnapshot: GameCanvasRuntimeSceneSnapshot | null = null;
  private controllerSnapshot: GameCanvasRuntimeControllerSnapshot | null = null;
  private particleSnapshot: GameCanvasRuntimeParticleSnapshot | null = null;
  private ambientEffectsSnapshot: GameCanvasRuntimeAmbientEffectsSnapshot | null = null;
  private wasProfilerRecording = false;
  private cameraProfilerState: {
    sampleIndex: number;
    lastSampleTime: number;
    lastPlayerX: number;
    lastPlayerY: number;
    lastCameraX: number;
    lastCameraY: number;
    lastCameraDx: number;
    lastCameraDy: number;
    lastPredictionError: number;
    lastReconciliationEventId: number;
  } | null = null;
  private readonly controllerRefsState: GameCanvasRuntimeControllerRefs = {
    worldMousePosRef: { current: { x: 0, y: 0 } },
    cameraOffsetRef: { current: { x: 0, y: 0 } },
    predictedPositionRef: { current: null },
    localFacingDirectionRef: { current: undefined },
    localOptimisticDodgeRollStartMsRef: { current: 0 },
    localOptimisticJumpPressMsRef: { current: 0 },
    interpolatedCloudsRef: { current: new Map() },
    cycleProgressRef: { current: 0.375 },
    ySortedEntitiesRef: { current: [] },
    swimmingPlayersForBottomHalfRef: { current: [] },
    renderGameDepsRef: {
      current: {
        messages: new Map(),
        projectiles: new Map<string, SpacetimeDBProjectile>(),
        holdInteractionProgress: null,
        isActivelyHolding: false,
        closestInteractableHarvestableResourceId: null,
        closestInteractableCampfireId: null,
        closestInteractableDroppedItemId: null,
        closestInteractableBoxId: null,
        isClosestInteractableBoxEmpty: false,
        closestInteractableWaterPosition: null,
        closestInteractableStashId: null,
        closestInteractableSleepingBagId: null,
        closestInteractableDoorId: null,
        closestInteractableTarget: null,
        unifiedInteractableTarget: null,
        closestInteractableKnockedOutPlayerId: null,
        closestInteractableCorpseId: null,
        closestInteractableAlkStationId: null,
        closestInteractableCairnId: null,
        closestInteractableMilkableAnimalId: null,
      },
    },
  };

  private readonly framePipeline: RuntimeFramePipeline = {
    prepareFrame: (frameInfo: FrameInfo) => {
      const bindings = this.frameBindings;
      if (!bindings) {
        return;
      }

      bindings.deltaTimeRef.current =
        frameInfo.deltaTime > 0 && frameInfo.deltaTime < 100 ? frameInfo.deltaTime : 16.667;

      runtimeEngine.updateInputState('isAutoWalking', bindings.isAutoWalking);

      // Keep controller scans on the same pose source as rendering. We refresh
      // again immediately before render after movement simulation has advanced.
      this.refreshLiveFramePose(bindings);

      if (++bindings.interactionScanFrameSkipRef.current % 2 === 0) {
        bindings.updateInteractionResult?.();
      }

      const liveFacingDirection = bindings.getCurrentFacingDirectionNow?.() ?? bindings.localFacingDirectionRef.current;
      if (liveFacingDirection) {
        bindings.localFacingDirectionRef.current = liveFacingDirection;
        runtimeEngine.updateWorldState('facingDirection', liveFacingDirection);
      }
    },
    processInputs: () => {
      this.frameBindings?.processInputsAndActions();
    },
    stepSimulation: (dtMs: number) => {
      this.frameBindings?.stepPredictedMovement?.(dtMs);
    },
    renderFrame: (renderAlpha: number) => {
      this.renderFrame(renderAlpha);
    },
    getConfig: () => ({
      fixedSimulationEnabled: this.frameBindings?.fixedSimulationEnabled ?? false,
      fixedSimulationDtMs: gameConfig.fixedSimDtMs,
      maxSimulationStepsPerFrame: gameConfig.maxSimStepsPerFrame,
    }),
  };

  configureRenderContext(renderContext: GameCanvasRuntimeRenderContext): void {
    this.renderContext = renderContext;
  }

  configureFrameBindings(frameBindings: GameCanvasRuntimeFrameBindings): void {
    this.frameBindings = frameBindings;
  }

  getFrameBindings(): GameCanvasRuntimeFrameBindings | null {
    return this.frameBindings;
  }

  configureSceneSnapshot(sceneSnapshot: GameCanvasRuntimeSceneSnapshot): void {
    this.sceneSnapshot = sceneSnapshot;
  }

  getControllerRefs(): GameCanvasRuntimeControllerRefs {
    return this.controllerRefsState;
  }

  getSceneSnapshot(): GameCanvasRuntimeSceneSnapshot | null {
    return this.sceneSnapshot;
  }

  configureControllerSnapshot(controllerSnapshot: GameCanvasRuntimeControllerSnapshot): void {
    this.controllerSnapshot = controllerSnapshot;
  }

  getControllerSnapshot(): GameCanvasRuntimeControllerSnapshot | null {
    return this.controllerSnapshot;
  }

  configureParticleSnapshot(particleSnapshot: GameCanvasRuntimeParticleSnapshot): void {
    this.particleSnapshot = particleSnapshot;
  }

  getParticleSnapshot(): GameCanvasRuntimeParticleSnapshot | null {
    return this.particleSnapshot;
  }

  configureAmbientEffectsSnapshot(ambientEffectsSnapshot: GameCanvasRuntimeAmbientEffectsSnapshot): void {
    this.ambientEffectsSnapshot = ambientEffectsSnapshot;
  }

  getAmbientEffectsSnapshot(): GameCanvasRuntimeAmbientEffectsSnapshot | null {
    return this.ambientEffectsSnapshot;
  }

  mount(): void {
    runtimeEngine.setFramePipeline(this.framePipeline);
  }

  unmount(): void {
    runtimeEngine.setFramePipeline(null);
  }

  renderFrame(renderAlpha: number = 1): void {
    if (!this.renderContext) {
      return;
    }

    if (this.frameBindings) {
      this.refreshLiveFramePose(this.frameBindings);
      this.recordCameraProfilerSample(this.frameBindings);
    }

    renderGameCanvasFrame({
      ...this.renderContext,
      renderAlpha,
    });
  }

  private refreshLiveFramePose(bindings: GameCanvasRuntimeFrameBindings): void {
    const livePredictedPosition = bindings.getCurrentPositionNow?.() ?? bindings.predictedPositionRef.current;
    if (livePredictedPosition) {
      bindings.predictedPositionRef.current = livePredictedPosition;
      bindings.cameraOffsetRef.current = {
        x: (bindings.canvasWidth / 2) - livePredictedPosition.x,
        y: (bindings.canvasHeight / 2) - livePredictedPosition.y,
      };
      return;
    }

    if (bindings.localPlayer) {
      bindings.cameraOffsetRef.current = {
        x: (bindings.canvasWidth / 2) - bindings.localPlayer.positionX,
        y: (bindings.canvasHeight / 2) - bindings.localPlayer.positionY,
      };
    }
  }

  private recordCameraProfilerSample(bindings: GameCanvasRuntimeFrameBindings): void {
    const recording = isProfilerRecording();
    if (!recording) {
      this.wasProfilerRecording = false;
      this.cameraProfilerState = null;
      return;
    }
    if (!this.wasProfilerRecording) {
      this.wasProfilerRecording = true;
      this.cameraProfilerState = null;
    }

    const predictedPosition = bindings.predictedPositionRef.current;
    const localPlayer = bindings.localPlayer;
    if (!predictedPosition || !localPlayer) {
      this.cameraProfilerState = null;
      return;
    }

    const now = performance.now();
    const camera = bindings.cameraOffsetRef.current;
    const previous = this.cameraProfilerState;
    const playerDx = previous ? predictedPosition.x - previous.lastPlayerX : 0;
    const playerDy = previous ? predictedPosition.y - previous.lastPlayerY : 0;
    const cameraDx = previous ? camera.x - previous.lastCameraX : 0;
    const cameraDy = previous ? camera.y - previous.lastCameraY : 0;
    const predictionErrorX = predictedPosition.x - localPlayer.positionX;
    const predictionErrorY = predictedPosition.y - localPlayer.positionY;
    const predictionError = Math.hypot(predictionErrorX, predictionErrorY);
    const reconciliation = bindings.getReconciliationProfilerSnapshot?.() ?? null;
    const reconciliationChanged = reconciliation != null
      && reconciliation.eventId !== (previous?.lastReconciliationEventId ?? 0);

    addCameraSample({
      sampleIndex: previous ? previous.sampleIndex + 1 : 0,
      dtMs: bindings.deltaTimeRef.current,
      frameGapMs: previous ? now - previous.lastSampleTime : 0,
      playerX: predictedPosition.x,
      playerY: predictedPosition.y,
      playerDx,
      playerDy,
      playerDist: Math.hypot(playerDx, playerDy),
      cameraX: camera.x,
      cameraY: camera.y,
      cameraDx,
      cameraDy,
      cameraDist: Math.hypot(cameraDx, cameraDy),
      cameraJerk: previous ? Math.hypot(cameraDx - previous.lastCameraDx, cameraDy - previous.lastCameraDy) : 0,
      serverX: localPlayer.positionX,
      serverY: localPlayer.positionY,
      predictedMinusServerX: predictionErrorX,
      predictedMinusServerY: predictionErrorY,
      predictedMinusServerDist: predictionError,
      correctionDelta: previous ? Math.abs(predictionError - previous.lastPredictionError) : 0,
      reconciliationChanged: reconciliationChanged ? 1 : 0,
      reconciliationEventType: reconciliation?.eventType ?? 'none',
      reconciliationEventAgeMs: reconciliation?.eventAgeMs ?? -1,
      reconciliationErrorDist: reconciliation?.errorDist ?? 0,
      reconciliationSequenceAdvance: reconciliation?.sequenceAdvance ?? 0,
      tileX: Math.floor(predictedPosition.x / gameConfig.tileSize),
      tileY: Math.floor(predictedPosition.y / gameConfig.tileSize),
    });

    this.cameraProfilerState = {
      sampleIndex: previous ? previous.sampleIndex + 1 : 0,
      lastSampleTime: now,
      lastPlayerX: predictedPosition.x,
      lastPlayerY: predictedPosition.y,
      lastCameraX: camera.x,
      lastCameraY: camera.y,
      lastCameraDx: cameraDx,
      lastCameraDy: cameraDy,
      lastPredictionError: predictionError,
      lastReconciliationEventId: reconciliation?.eventId ?? 0,
    };
  }
}
