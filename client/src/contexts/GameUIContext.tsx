/**
 * GameUIContext - UI state for game screen (minimap, chat, crafting focus, music panel).
 * Replaces prop-drilling of these values from App → GameplayRuntimeBridge → GameScreen.
 */
import React, { createContext, useContext } from 'react';

export type InterfaceView = 'minimap' | 'encyclopedia' | 'memory-grid' | 'alk' | 'cairns' | 'matronage' | 'leaderboard' | 'achievements';

export interface GameUIContextValue {
  isMinimapOpen: boolean;
  setIsMinimapOpen: React.Dispatch<React.SetStateAction<boolean>>;
  interfaceInitialView: InterfaceView | undefined;
  setInterfaceInitialView: React.Dispatch<React.SetStateAction<InterfaceView | undefined>>;
  isChatting: boolean;
  setIsChatting: React.Dispatch<React.SetStateAction<boolean>>;
  isCraftingSearchFocused: boolean;
  setIsCraftingSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
  isMusicPanelVisible: boolean;
  setIsMusicPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenAchievements: () => void;
}

const GameUIContext = createContext<GameUIContextValue | null>(null);

export function GameUIProvider({
  value,
  children,
}: {
  value: GameUIContextValue;
  children: React.ReactNode;
}) {
  return <GameUIContext.Provider value={value}>{children}</GameUIContext.Provider>;
}

export function useGameUI(): GameUIContextValue {
  const ctx = useContext(GameUIContext);
  if (!ctx) throw new Error('useGameUI must be used within GameUIProvider');
  return ctx;
}
