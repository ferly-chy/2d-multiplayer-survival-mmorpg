import React, { createContext, useContext } from 'react';

export interface GameplayMovementContextValue {
  predictedPosition: { x: number; y: number } | null;
  getCurrentPositionNow: () => { x: number; y: number } | null;
  getReconciliationProfilerSnapshot?: () => any;
  getCurrentFacingDirectionNow?: () => string;
  getCurrentDodgeRollVisualNow?: () => { isDodgeRolling: boolean; progress: number; direction: string };
  onDodgeRollStart?: (moveX: number, moveY: number) => boolean;
  stepPredictedMovement?: (dtMs: number) => void;
  movementDirection: { x: number; y: number };
  isAutoWalking: boolean;
  facingDirection?: string;
  isMobile: boolean;
  onMobileTap?: (worldX: number, worldY: number) => void;
  tapAnimation?: { x: number; y: number; startTime: number } | null;
  onMobileSprintToggle?: (enabled: boolean | undefined) => void;
  mobileSprintOverride?: boolean;
  isFishing: boolean;
  onFishingStateChange: (isFishing: boolean) => void;
}

const GameplayMovementContext = createContext<GameplayMovementContextValue | null>(null);

export function GameplayMovementProvider({
  value,
  children,
}: {
  value: GameplayMovementContextValue;
  children: React.ReactNode;
}) {
  return (
    <GameplayMovementContext.Provider value={value}>
      {children}
    </GameplayMovementContext.Provider>
  );
}

export function useGameplayMovement(): GameplayMovementContextValue {
  const ctx = useContext(GameplayMovementContext);
  if (!ctx) {
    throw new Error('useGameplayMovement must be used within GameplayMovementProvider');
  }
  return ctx;
}
