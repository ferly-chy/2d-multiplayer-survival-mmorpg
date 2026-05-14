/**
 * GameplayRuntimeBridge - Transitional gameplay ownership boundary.
 *
 * Hosts gameplay-scoped runtime services and providers that no longer belong in `App`,
 * then hands a much thinner shell off to `GameScreen`.
 */
import React from 'react';
import { Identity } from 'spacetimedb';
import GameScreen from './GameScreen';
import type { DbConnection } from '../generated';
import type { PlacementItemInfo, PlacementActions } from '../hooks/usePlacementManager';
import { GameUIProvider } from '../contexts/GameUIContext';
import { GameplaySessionProvider } from '../contexts/GameplaySessionContext';
import { GameplayInteractionProvider } from '../contexts/GameplayInteractionContext';
import { GameplayMovementProvider } from '../contexts/GameplayMovementContext';
import { useGameplayRuntimeHost } from '../engine/runtime/useGameplayRuntimeHost';

export interface GameplayRuntimeBridgeProps {
    localPlayerId?: string;
    playerIdentity: Identity | null;
    connection: DbConnection | null;
    placementInfo: PlacementItemInfo | null;
    placementActions: PlacementActions;
    placementError: string | null;
    setPlacementWarning: (warning: string | null) => void;
    startPlacement: (itemInfo: PlacementItemInfo) => void;
    cancelPlacement: () => void;
    musicSystem: ReturnType<typeof import('../hooks/useMusicSystem').useMusicSystem>;
    showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void;
}

const GameplayRuntimeBridge: React.FC<GameplayRuntimeBridgeProps> = (props) => {
    const {
        soundSystem,
        canvasRef,
        isFishing,
        setIsFishing,
        interactionRuntime,
        sessionRuntime,
        inputState,
        isAutoWalking,
        predictedMovement,
        isMobile,
        tapAnimation,
        handleMobileTap,
        mobileSprintOverride,
        setMobileSprintOverride,
    } = useGameplayRuntimeHost({
        localPlayerId: props.localPlayerId,
        playerIdentity: props.playerIdentity,
        connection: props.connection,
    });

    return (
        <GameplaySessionProvider value={sessionRuntime}>
            <GameplayInteractionProvider value={interactionRuntime}>
                <GameplayMovementProvider
                    value={{
                        predictedPosition: predictedMovement.predictedPosition,
                        getCurrentPositionNow: predictedMovement.getCurrentPositionNow,
                        getReconciliationProfilerSnapshot: predictedMovement.getReconciliationProfilerSnapshot,
                        getCurrentFacingDirectionNow: predictedMovement.getCurrentFacingDirectionNow,
                        getCurrentDodgeRollVisualNow: predictedMovement.getCurrentDodgeRollVisualNow,
                        onDodgeRollStart: predictedMovement.triggerOptimisticDodgeRoll,
                        stepPredictedMovement: predictedMovement.stepPredictedMovement,
                        movementDirection: inputState.direction,
                        isAutoWalking,
                        facingDirection: predictedMovement.facingDirection,
                        isMobile,
                        onMobileTap: handleMobileTap,
                        tapAnimation,
                        onMobileSprintToggle: setMobileSprintOverride,
                        mobileSprintOverride,
                        isFishing,
                        onFishingStateChange: setIsFishing,
                    }}
                >
                    <GameUIProvider value={sessionRuntime.gameUIValue}>
                        <GameScreen
                            {...props}
                            canvasRef={canvasRef}
                            soundSystem={soundSystem}
                        />
                    </GameUIProvider>
                </GameplayMovementProvider>
            </GameplayInteractionProvider>
        </GameplaySessionProvider>
    );
};

export default GameplayRuntimeBridge;