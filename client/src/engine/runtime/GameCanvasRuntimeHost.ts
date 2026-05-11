import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { gameConfig } from '../../config/gameConfig';
import { runtimeEngine } from '../runtimeEngine';
import { renderGameCanvasFrame } from '../frame/renderGameCanvasFrame';
import type { RuntimeFramePipeline } from '../types';
import type { GameLoopMetrics } from '../../hooks/useGameLoop';
import type { FrameInfo } from '../../hooks/useGameLoop';
import type { Projectile as SpacetimeDBProjectile } from '../../generated/types';
import type { CampfireFireGpuEmitter } from '../../utils/renderers/campfireFireOverlayUtils';

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
  predictedPositionRef: MutableRefObject<{ x: number; y: number } | null>;
  getCurrentFacingDirectionNow?: () => string | undefined;
  localFacingDirectionRef: MutableRefObject<string | undefined>;
  localPlayer: { positionX: number; positionY: number } | null | undefined;
  updateInteractionResult?: () => void;
  isAutoWalking: boolean;
  canvasWidth: number;
  canvasHeight: number;
  gameLoopMetricsRef: MutableRefObject<GameLoopMetrics | null>;
  deltaTimeRef: MutableRefObject<number>;
  interactionScanFrameSkipRef: MutableRefObject<number>;
  cameraOffsetRef: MutableRefObject<{ x: number; y: number }>;
}

export interface GameCanvasRuntimeControllerRefs {
  worldMousePosRef: MutableRefObject<{ x: number | null; y: number | null }>;
  cameraOffsetRef: MutableRefObject<{ x: number; y: number }>;
  predictedPositionRef: MutableRefObject<{ x: number; y: number } | null>;
  localFacingDirectionRef: MutableRefObject<string | undefined>;
  localOptimisticDodgeRollStartMsRef: MutableRefObject<number>;
  /** Wall-clock ms when local player pressed jump; render + input merge with server like dodge roll. */
  localOptimisticJumpPressMsRef: MutableRefObject<number>;
  interpolatedCloudsRef: MutableRefObject<Map<string, any>>;
  cycleProgressRef: MutableRefObject<number>;
  ySortedEntitiesRef: MutableRefObject<any[]>;
  swimmingPlayersForBottomHalfRef: MutableRefObject<any[]>;
  renderGameDepsRef: MutableRefObject<{
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
  setShowBuildingRadialMenu: Dispatch<SetStateAction<boolean>>;
  showUpgradeRadialMenu: boolean;
  setShowUpgradeRadialMenu: Dispatch<SetStateAction<boolean>>;
  processInputsAndActions: () => void;
  upgradeMenuFoundationRef: MutableRefObject<any>;
  upgradeMenuWallRef: MutableRefObject<any>;
  upgradeMenuFenceRef: MutableRefObject<any>;
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

      if (++bindings.interactionScanFrameSkipRef.current % 2 === 0) {
        bindings.updateInteractionResult?.();
      }

      const livePredictedPosition = bindings.getCurrentPositionNow?.() ?? bindings.predictedPositionRef.current;
      const liveFacingDirection = bindings.getCurrentFacingDirectionNow?.() ?? bindings.localFacingDirectionRef.current;

      runtimeEngine.updateInputState('isAutoWalking', bindings.isAutoWalking);

      if (livePredictedPosition) {
        bindings.predictedPositionRef.current = livePredictedPosition;
        bindings.cameraOffsetRef.current = {
          x: (bindings.canvasWidth / 2) - livePredictedPosition.x,
          y: (bindings.canvasHeight / 2) - livePredictedPosition.y,
        };
      } else if (bindings.localPlayer) {
        bindings.cameraOffsetRef.current = {
          x: (bindings.canvasWidth / 2) - bindings.localPlayer.positionX,
          y: (bindings.canvasHeight / 2) - bindings.localPlayer.positionY,
        };
      }

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

    renderGameCanvasFrame({
      ...this.renderContext,
      renderAlpha,
    });
  }
}
