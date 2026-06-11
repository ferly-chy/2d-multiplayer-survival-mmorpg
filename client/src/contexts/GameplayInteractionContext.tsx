import React, { createContext, useContext } from 'react';
import type { GameplayBridgeRuntimeResult } from '../engine/react/useGameplayBridgeRuntime';

const GameplayInteractionContext = createContext<GameplayBridgeRuntimeResult | null>(null);

export function GameplayInteractionProvider({
  value,
  children,
}: {
  value: GameplayBridgeRuntimeResult;
  children: React.ReactNode;
}) {
  return (
    <GameplayInteractionContext.Provider value={value}>
      {children}
    </GameplayInteractionContext.Provider>
  );
}

export function useGameplayInteraction(): GameplayBridgeRuntimeResult {
  const ctx = useContext(GameplayInteractionContext);
  if (!ctx) {
    throw new Error('useGameplayInteraction must be used within GameplayInteractionProvider');
  }
  return ctx;
}

