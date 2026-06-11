/**
 * useGameplayScreenRuntime - Runtime-facing data/session adapter for GameScreen.
 *
 * Consolidates selector reads plus the remaining screen session hook so `GameScreen`
 * can stay focused on composition and presentation.
 */
import { useMemo } from 'react';
import type { Identity } from 'spacetimedb';
import type { DbConnection } from '../../generated';
import { createIsWaterTile } from '../../hooks/useWorldChunkDataMap';
import {
  useGameScreenWorldTables,
  useQuestUiTables,
  useUITable,
} from './selectors';
import { useEngineSnapshot } from './useEngineSnapshot';
import { useGameUI } from '../../contexts/GameUIContext';
import { useGameplaySession } from '../../contexts/GameplaySessionContext';
import { useGameplayInteraction } from '../../contexts/GameplayInteractionContext';
import { useGameScreenSessionUi } from '../../hooks/useGameScreenSessionUi';

interface UseGameplayScreenRuntimeOptions {
  localPlayerId?: string;
  playerIdentity: Identity | null;
  connection: DbConnection | null;
  showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void;
  predictedPosition: { x: number; y: number } | null;
}

export function useGameplayScreenRuntime({
  localPlayerId,
  playerIdentity,
  connection,
  showSovaSoundBox,
  predictedPosition,
}: UseGameplayScreenRuntimeOptions) {
  const gameUI = useGameUI();
  const {
    currentMenu,
    showInventoryState,
    showCraftingScreenState,
    sovaMessageAdder,
    setAlkInitialTab,
    onSOVALoadingStateChange,
  } = useGameplaySession();
  const {
    interactingWith,
    handleSetInteractingWith,
  } = useGameplayInteraction();
  const tables = useGameScreenWorldTables();
  const messages = useUITable<Map<string, any>>('messages');
  const playerPins = useUITable<Map<string, any>>('playerPins');
  const activeConnections = useUITable<Map<string, any>>('activeConnections');
  const matronages = useUITable<Map<string, any>>('matronages');
  const matronageMembers = useUITable<Map<string, any>>('matronageMembers');
  const matronageInvitations = useUITable<Map<string, any>>('matronageInvitations');
  const matronageOwedShards = useUITable<Map<string, any>>('matronageOwedShards');
  const { tutorialQuestDefinitions, dailyQuestDefinitions, playerTutorialProgress, playerDailyQuests } = useQuestUiTables();
  const questCompletionNotifications = useUITable<Map<string, any>>('questCompletionNotifications');
  const questProgressNotifications = useUITable<Map<string, any>>('questProgressNotifications');
  const sovaQuestMessages = useUITable<Map<string, any>>('sovaQuestMessages');
  const beaconDropEvents = useUITable<Map<string, any>>('beaconDropEvents');

  const worldChunkDataMap = useEngineSnapshot(
    (snapshot) => snapshot.world.chunkDataMap as Map<string, any> | null,
  ) ?? undefined;

  const isWaterTile = useMemo(
    () => createIsWaterTile(worldChunkDataMap),
    [worldChunkDataMap],
  );

  const sessionUi = useGameScreenSessionUi({
    localPlayerId,
    playerIdentity,
    connection,
    currentMenu,
    showInventoryState,
    showCraftingScreenState,
    showSovaSoundBox,
    sovaMessageAdder,
    predictedPosition,
    runeStones: tables.runeStones,
    alkStations: tables.alkStations,
    monumentParts: tables.monumentParts,
    sovaQuestMessages,
    questCompletionNotifications,
    questProgressNotifications,
    players: tables.players,
    activeConsumableEffects: tables.activeConsumableEffects,
    activeEquipments: tables.activeEquipments,
    itemDefinitions: tables.itemDefinitions,
    interactingWith,
    handleSetInteractingWith,
    setAlkInitialTab,
    gameUI,
    onSOVALoadingStateChange,
  });

  return {
    gameUI,
    tables,
    messages,
    playerPins,
    activeConnections,
    matronages,
    matronageMembers,
    matronageInvitations,
    matronageOwedShards,
    tutorialQuestDefinitions,
    dailyQuestDefinitions,
    playerTutorialProgress,
    playerDailyQuests,
    questCompletionNotifications,
    questProgressNotifications,
    sovaQuestMessages,
    beaconDropEvents,
    worldChunkDataMap,
    isWaterTile,
    ...sessionUi,
  };
}
