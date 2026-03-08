import { useEffect, type MutableRefObject } from 'react';
import { useEngineFrameLoop } from '../react/useEngineFrameLoop';
import { runtimeEngine } from '../runtimeEngine';
import { gameConfig } from '../../config/gameConfig';
import type { GameLoopMetrics } from '../../hooks/useGameLoop';

interface UseGameCanvasFramePipelineOptions {
  renderGame: () => void;
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
  showFpsProfiler: boolean;
  gameLoopMetricsRef: MutableRefObject<GameLoopMetrics | null>;
  deltaTimeRef: MutableRefObject<number>;
  interactionScanFrameSkipRef: MutableRefObject<number>;
  cameraOffsetRef: MutableRefObject<{ x: number; y: number }>;
}

export function useGameCanvasFramePipeline({
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
  canvasWidth,
  canvasHeight,
  showFpsProfiler,
  gameLoopMetricsRef,
  deltaTimeRef,
  interactionScanFrameSkipRef,
  cameraOffsetRef,
}: UseGameCanvasFramePipelineOptions): void {
  useEffect(() => {
    runtimeEngine.setFramePipeline({
      prepareFrame: (frameInfo) => {
        deltaTimeRef.current =
          frameInfo.deltaTime > 0 && frameInfo.deltaTime < 100 ? frameInfo.deltaTime : 16.667;

        if (++interactionScanFrameSkipRef.current % 2 === 0) {
          updateInteractionResult?.();
        }

        const livePredictedPosition = getCurrentPositionNow?.() ?? predictedPositionRef.current;
        const liveFacingDirection = getCurrentFacingDirectionNow?.() ?? localFacingDirectionRef.current;
        runtimeEngine.setPredictedPosition(livePredictedPosition ?? null);
        runtimeEngine.updateInputState('isAutoWalking', isAutoWalking);

        if (livePredictedPosition) {
          predictedPositionRef.current = livePredictedPosition;
          cameraOffsetRef.current = {
            x: (canvasWidth / 2) - livePredictedPosition.x,
            y: (canvasHeight / 2) - livePredictedPosition.y,
          };
        } else if (localPlayer) {
          cameraOffsetRef.current = {
            x: (canvasWidth / 2) - localPlayer.positionX,
            y: (canvasHeight / 2) - localPlayer.positionY,
          };
        }

        if (liveFacingDirection) {
          localFacingDirectionRef.current = liveFacingDirection;
          runtimeEngine.updateWorldState('facingDirection', liveFacingDirection);
        }
      },
      processInputs: processInputsAndActions,
      stepSimulation: (dtMs) => {
        stepPredictedMovement?.(dtMs);
      },
      renderFrame: () => {
        renderGame();
      },
      getConfig: () => ({
        fixedSimulationEnabled,
        fixedSimulationDtMs: gameConfig.fixedSimDtMs,
        maxSimulationStepsPerFrame: gameConfig.maxSimStepsPerFrame,
      }),
    });

    return () => {
      runtimeEngine.setFramePipeline(null);
    };
  }, [
    renderGame,
    processInputsAndActions,
    stepPredictedMovement,
    fixedSimulationEnabled,
    getCurrentPositionNow,
    getCurrentFacingDirectionNow,
    localPlayer,
    updateInteractionResult,
    isAutoWalking,
    canvasWidth,
    canvasHeight,
    predictedPositionRef,
    localFacingDirectionRef,
    deltaTimeRef,
    interactionScanFrameSkipRef,
    cameraOffsetRef,
  ]);

  useEngineFrameLoop(null, {
    targetFPS: 0,
    maxFrameTime: 33,
    enableProfiling: false,
  });

  useEffect(() => {
    if (!showFpsProfiler) {
      gameLoopMetricsRef.current = null;
    }
  }, [showFpsProfiler, gameLoopMetricsRef]);
}
