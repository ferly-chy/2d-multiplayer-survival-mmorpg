import { useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type { GameLoopMetrics } from '../types';
import type {
  GameCanvasRuntimeControllerSnapshot,
  GameCanvasRuntimeFrameBindings,
} from '../runtime/GameCanvasRuntimeHost';

interface UseGameCanvasControllerBridgeRuntimeOptions {
  controllerRuntime: GameCanvasRuntimeControllerSnapshot;
  stepPredictedMovement?: (dtMs: number) => void;
  fixedSimulationEnabled: boolean;
  getCurrentPositionNow?: () => { x: number; y: number } | null;
  getReconciliationProfilerSnapshot?: () => any;
  getCurrentFacingDirectionNow?: () => string | undefined;
  localPlayer: { positionX: number; positionY: number } | null | undefined;
  isAutoWalking: boolean;
  canvasSize: { width: number; height: number };
  gameLoopMetricsRef: MutableRefObject<GameLoopMetrics | null>;
  deltaTimeRef: MutableRefObject<number>;
  interactionScanFrameSkipRef: MutableRefObject<number>;
}

/**
 * Narrow adapter over controller runtime output so `GameCanvas` only consumes
 * the minimal view-facing state plus host frame bindings.
 */
export function useGameCanvasControllerBridgeRuntime({
  controllerRuntime,
  stepPredictedMovement,
  fixedSimulationEnabled,
  getCurrentPositionNow,
  getReconciliationProfilerSnapshot,
  getCurrentFacingDirectionNow,
  localPlayer,
  isAutoWalking,
  canvasSize,
  gameLoopMetricsRef,
  deltaTimeRef,
  interactionScanFrameSkipRef,
}: UseGameCanvasControllerBridgeRuntimeOptions) {
  const frameBindings = useMemo<GameCanvasRuntimeFrameBindings>(() => ({
    processInputsAndActions: controllerRuntime.processInputsAndActions,
    stepPredictedMovement,
    fixedSimulationEnabled,
    getCurrentPositionNow,
    getReconciliationProfilerSnapshot,
    predictedPositionRef: controllerRuntime.predictedPositionRef,
    getCurrentFacingDirectionNow,
    localFacingDirectionRef: controllerRuntime.localFacingDirectionRef,
    localPlayer,
    updateInteractionResult: controllerRuntime.updateInteractionResult,
    isAutoWalking,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    gameLoopMetricsRef,
    deltaTimeRef,
    interactionScanFrameSkipRef,
    cameraOffsetRef: controllerRuntime.cameraOffsetRef,
  }), [
    controllerRuntime,
    stepPredictedMovement,
    fixedSimulationEnabled,
    getCurrentPositionNow,
    getReconciliationProfilerSnapshot,
    getCurrentFacingDirectionNow,
    localPlayer,
    isAutoWalking,
    canvasSize,
    gameLoopMetricsRef,
    deltaTimeRef,
    interactionScanFrameSkipRef,
  ]);

  return {
    frameBindings,
    cursorStyle: controllerRuntime.cursorStyle,
    localPlayerIsCrouching: controllerRuntime.isCrouching,
    isAutoAttacking: controllerRuntime.isAutoAttacking,
  };
}
