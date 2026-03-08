import React, { createContext, useContext } from 'react';
import type { GameplaySessionRuntimeResult } from '../engine/runtime/useGameplaySessionRuntime';

const GameplaySessionContext = createContext<GameplaySessionRuntimeResult | null>(null);

export function GameplaySessionProvider({
  value,
  children,
}: {
  value: GameplaySessionRuntimeResult;
  children: React.ReactNode;
}) {
  return (
    <GameplaySessionContext.Provider value={value}>
      {children}
    </GameplaySessionContext.Provider>
  );
}

export function useGameplaySession(): GameplaySessionRuntimeResult {
  const ctx = useContext(GameplaySessionContext);
  if (!ctx) {
    throw new Error('useGameplaySession must be used within GameplaySessionProvider');
  }
  return ctx;
}
