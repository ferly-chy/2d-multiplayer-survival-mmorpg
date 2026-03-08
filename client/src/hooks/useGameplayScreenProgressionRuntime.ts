import { useCallback, useRef } from 'react';
import type { Identity } from 'spacetimedb';
import type { DbConnection } from '../generated';
import { useQuestNotifications } from './useQuestNotifications';
import { useSovaTutorials } from './useSovaTutorials';
import type { SovaMessageAdder } from './useGameScreenSessionUi';

interface UseGameplayScreenProgressionRuntimeOptions {
  localPlayerId?: string;
  playerIdentity: Identity | null;
  connection: DbConnection | null;
  showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void;
  sovaMessageAdder: SovaMessageAdder | null;
  seenTutorialIds: readonly string[] | undefined;
  predictedPosition: { x: number; y: number } | null;
  runeStones: Map<string, any>;
  alkStations: Map<string, any>;
  monumentParts: Map<string, any> | undefined;
  sovaQuestMessages: Map<string, any>;
  questCompletionNotifications: Map<string, any>;
  questProgressNotifications: Map<string, any>;
}

export function useGameplayScreenProgressionRuntime({
  localPlayerId,
  playerIdentity,
  connection,
  showSovaSoundBox,
  sovaMessageAdder,
  seenTutorialIds,
  predictedPosition,
  runeStones,
  alkStations,
  monumentParts,
  sovaQuestMessages,
  questCompletionNotifications,
  questProgressNotifications,
}: UseGameplayScreenProgressionRuntimeOptions) {
  const showSovaSoundBoxRef = useRef(showSovaSoundBox);
  const sovaMessageAdderRef = useRef(sovaMessageAdder);
  showSovaSoundBoxRef.current = showSovaSoundBox;
  sovaMessageAdderRef.current = sovaMessageAdder;

  const handleMarkTutorialSeen = useCallback((tutorialId: string) => {
    const reducers = connection?.reducers as Record<string, (() => void) | undefined> | undefined;
    const reducerFn = reducers?.markTutorialSeen as ((id: string) => void) | undefined;
    if (!reducerFn) {
      return;
    }
    try {
      reducerFn(tutorialId);
      console.log('[GameScreen] Called markTutorialSeen reducer for:', tutorialId);
    } catch (error) {
      console.error('[GameScreen] Failed to mark tutorial as seen:', tutorialId, error);
    }
  }, [connection]);

  useSovaTutorials({
    localPlayerId,
    showSovaSoundBoxRef,
    sovaMessageAdderRef,
    seenTutorialIds: seenTutorialIds ? [...seenTutorialIds] : undefined,
    onMarkTutorialSeen: handleMarkTutorialSeen,
    localPlayerPosition: predictedPosition,
    runeStones,
    alkStations,
    monumentParts,
  });

  const {
    questCompletionNotification,
    dismissQuestCompletionNotification,
    hasNewQuestNotification,
  } = useQuestNotifications({
    sovaQuestMessages,
    questCompletionNotifications,
    questProgressNotifications,
    playerIdentity,
    showSovaSoundBoxRef,
    sovaMessageAdderRef,
  });

  return {
    questCompletionNotification,
    dismissQuestCompletionNotification,
    hasNewQuestNotification,
  };
}
