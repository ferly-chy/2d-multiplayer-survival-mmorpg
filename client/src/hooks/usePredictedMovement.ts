/**
 * usePredictedMovement - Thin React bridge into the runtime-owned movement system.
 *
 * Connects React/context inputs such as `usePlayerActions()` to the movement
 * prediction runtime, then exposes the runtime snapshot and imperative movement
 * helpers through the legacy hook-shaped interface used by gameplay components.
 */

import { useEffect } from 'react';
import { usePlayerActions } from '../contexts/PlayerActionsContext';
import { useEngineSnapshot } from '../engine/react/useEngineSnapshot';
import {
  movementPredictionRuntime,
  type MovementPredictionRuntimeProps,
  type MovementPredictionSnapshot,
} from '../engine/runtime/movementPredictionRuntime';

type UsePredictedMovementProps = Omit<
  MovementPredictionRuntimeProps,
  'isAutoWalking' | 'stopAutoWalk' | 'isAutoAttacking'
>;

export type {
  MovementInputState,
  DodgeRollVisualState,
} from '../engine/runtime/movementPredictionRuntime';

export type { UsePredictedMovementProps };

const DEFAULT_MOVEMENT_SNAPSHOT: MovementPredictionSnapshot = {
  predictedPosition: null,
  facingDirection: 'down',
  dodgeRollVisual: {
    isDodgeRolling: false,
    progress: 0,
    direction: 'down',
  },
  isAutoWalking: false,
  isAutoAttacking: false,
};

export function usePredictedMovement(props: UsePredictedMovementProps) {
  const { isAutoWalking, stopAutoWalk, isAutoAttacking } = usePlayerActions();
  const movementSnapshot = useEngineSnapshot(
    (snapshot) =>
      (snapshot.world.runtimeState.movementPrediction as MovementPredictionSnapshot | undefined)
      ?? DEFAULT_MOVEMENT_SNAPSHOT,
  );

  useEffect(() => {
    movementPredictionRuntime.configure({
      ...props,
      isAutoWalking,
      stopAutoWalk,
      isAutoAttacking,
    });
  }, [isAutoAttacking, isAutoWalking, props, stopAutoWalk]);

  return {
    predictedPosition: movementSnapshot.predictedPosition,
    getCurrentPositionNow: movementPredictionRuntime.getCurrentPositionNow,
    getReconciliationProfilerSnapshot: movementPredictionRuntime.getReconciliationProfilerSnapshot.bind(movementPredictionRuntime),
    getCurrentFacingDirectionNow: movementPredictionRuntime.getCurrentFacingDirectionNow,
    getCurrentDodgeRollVisualNow: movementPredictionRuntime.getCurrentDodgeRollVisualNow,
    triggerOptimisticDodgeRoll: movementPredictionRuntime.triggerOptimisticDodgeRoll,
    stepPredictedMovement: movementPredictionRuntime.stepPredictedMovement.bind(movementPredictionRuntime),
    isAutoWalking,
    isAutoAttacking,
    facingDirection: movementSnapshot.facingDirection,
  };
}