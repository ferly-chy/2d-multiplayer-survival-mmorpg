import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DbConnection } from '../generated';
import type { GameUIContextValue } from '../contexts/GameUIContext';
import type { AlkTab } from './useGameScreenSessionUi';
import type { InteractionTarget } from './useInteractionManager';

interface UseGameplayScreenUiActionRuntimeOptions {
  connection: DbConnection | null;
  gameUI: GameUIContextValue;
  interactingWith: InteractionTarget;
  handleSetInteractingWith: (target: InteractionTarget) => void;
  setAlkInitialTab: Dispatch<SetStateAction<AlkTab | undefined>>;
  alkStations: Map<string, any>;
  predictedPosition: { x: number; y: number } | null;
  localPlayer: { positionX: number; positionY: number } | undefined;
}

export function useGameplayScreenUiActionRuntime({
  connection,
  gameUI,
  interactingWith,
  handleSetInteractingWith,
  setAlkInitialTab,
  alkStations,
  predictedPosition,
  localPlayer,
}: UseGameplayScreenUiActionRuntimeOptions) {
  const handleMatronageCreated = useCallback(() => {
    handleSetInteractingWith(null);
    gameUI.setInterfaceInitialView('matronage');
    gameUI.setIsMinimapOpen(true);
  }, [gameUI, handleSetInteractingWith]);

  const handleOpenAlkBoard = useCallback((tab?: string) => {
    handleSetInteractingWith(null);
    setAlkInitialTab(tab as AlkTab | undefined);
    gameUI.setInterfaceInitialView('alk');
    gameUI.setIsMinimapOpen(true);
  }, [gameUI, handleSetInteractingWith, setAlkInitialTab]);

  const handleInterfaceClose = useCallback(() => {
    gameUI.setInterfaceInitialView(undefined);
    gameUI.setIsMinimapOpen(false);
  }, [gameUI]);

  const handleTitleSelect = useCallback((titleId: string | null) => {
    if (!connection?.reducers) {
      return;
    }

    try {
      connection.reducers.setActiveTitle({ titleId: titleId ?? undefined });
    } catch (error) {
      console.error('[GameScreen] Failed to set active title:', error);
    }
  }, [connection]);

  useEffect(() => {
    if (interactingWith?.type !== 'alk_station') {
      return;
    }

    const station = alkStations?.get(String(interactingWith.id));
    if (!station) {
      handleSetInteractingWith(null);
      return;
    }

    const playerPos = predictedPosition || (localPlayer ? { x: localPlayer.positionX, y: localPlayer.positionY } : null);
    if (!playerPos) {
      return;
    }

    const dx = playerPos.x - station.worldPosX;
    const dy = playerPos.y - station.worldPosY;
    if ((dx * dx) + (dy * dy) > 320 * 320) {
      console.log('[GameScreen] Player walked out of ALK station range, closing panel');
      handleSetInteractingWith(null);
    }
  }, [alkStations, handleSetInteractingWith, interactingWith, localPlayer, predictedPosition]);

  return {
    handleMatronageCreated,
    handleOpenAlkBoard,
    handleInterfaceClose,
    handleTitleSelect,
  };
}
