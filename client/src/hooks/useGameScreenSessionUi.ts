import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Identity } from 'spacetimedb';
import type { DbConnection } from '../generated';
import type * as SpacetimeDB from '../generated/types';
import type { InteractionTarget } from './useInteractionManager';
import type { GameUIContextValue } from '../contexts/GameUIContext';
import type { MenuType } from '../components/GameMenu';
import { useGameplayScreenAudioRuntime } from './useGameplayScreenAudioRuntime';
import { useGameplayScreenProgressionRuntime } from './useGameplayScreenProgressionRuntime';
import { useGameplayScreenUiActionRuntime } from './useGameplayScreenUiActionRuntime';
import { useSpeechBubbleManager } from './useSpeechBubbleManager';
import { useVoiceInterface } from './useVoiceInterface';

export type AlkTab = 'seasonal' | 'materials' | 'arms' | 'armor' | 'tools' | 'provisions' | 'bonus' | 'buy-orders' | 'my-contracts';
export type SovaMessageAdder = (message: { id: string; text: string; isUser: boolean; timestamp: Date; flashTab?: boolean }) => void;
export type LocalBubble = { id: string; message: string; playerId: string; timestamp: number };
export type SovaLoadingState = {
  isRecording: boolean;
  isTranscribing: boolean;
  isGeneratingResponse: boolean;
  isSynthesizingVoice: boolean;
  isPlayingAudio: boolean;
  transcribedText: string;
  currentPhase: string;
};

interface UseGameScreenSessionUiOptions {
  localPlayerId?: string;
  playerIdentity: Identity | null;
  connection: DbConnection | null;
  currentMenu: MenuType;
  showInventoryState: boolean;
  showCraftingScreenState: boolean;
  showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void;
  sovaMessageAdder: SovaMessageAdder | null;
  predictedPosition: { x: number; y: number } | null;
  runeStones: Map<string, SpacetimeDB.RuneStone>;
  alkStations: Map<string, SpacetimeDB.AlkStation>;
  monumentParts: Map<string, any> | undefined;
  sovaQuestMessages: Map<string, any>;
  questCompletionNotifications: Map<string, any>;
  questProgressNotifications: Map<string, any>;
  players: Map<string, SpacetimeDB.Player>;
  activeConsumableEffects: Map<string, SpacetimeDB.ActiveConsumableEffect>;
  activeEquipments: Map<string, SpacetimeDB.ActiveEquipment>;
  itemDefinitions: Map<string, SpacetimeDB.ItemDefinition>;
  interactingWith: InteractionTarget;
  handleSetInteractingWith: (target: InteractionTarget) => void;
  setAlkInitialTab: Dispatch<SetStateAction<AlkTab | undefined>>;
  gameUI: GameUIContextValue;
  onSOVALoadingStateChange: (state: SovaLoadingState) => void;
}

export function useGameScreenSessionUi({
  localPlayerId,
  playerIdentity,
  connection,
  currentMenu,
  showInventoryState,
  showCraftingScreenState,
  showSovaSoundBox,
  sovaMessageAdder,
  predictedPosition,
  runeStones,
  alkStations,
  monumentParts,
  sovaQuestMessages,
  questCompletionNotifications,
  questProgressNotifications,
  players,
  activeConsumableEffects,
  activeEquipments,
  itemDefinitions,
  interactingWith,
  handleSetInteractingWith,
  setAlkInitialTab,
  gameUI,
  onSOVALoadingStateChange,
}: UseGameScreenSessionUiOptions) {
  const {
    voiceState,
    handleTranscriptionComplete,
    handleError: handleVoiceError,
    forceClose: forceCloseVoice,
  } = useVoiceInterface({
    isEnabled: true,
    isChatting: gameUI.isChatting,
    isGameMenuOpen: currentMenu !== null,
    isInventoryOpen: showInventoryState || showCraftingScreenState,
  });

  const localPlayer = localPlayerId ? players.get(localPlayerId) : undefined;
  const seenTutorialIds = localPlayer?.seenTutorialIds;
  const {
    questCompletionNotification,
    dismissQuestCompletionNotification,
    hasNewQuestNotification,
  } = useGameplayScreenProgressionRuntime({
    localPlayerId,
    playerIdentity,
    sovaQuestMessages,
    questCompletionNotifications,
    questProgressNotifications,
    connection,
    showSovaSoundBox,
    sovaMessageAdder,
    seenTutorialIds,
    predictedPosition,
    runeStones,
    alkStations,
    monumentParts,
  });
  const {
    handleMatronageCreated,
    handleOpenAlkBoard,
    handleInterfaceClose,
    handleTitleSelect,
  } = useGameplayScreenUiActionRuntime({
    connection,
    gameUI,
    interactingWith,
    handleSetInteractingWith,
    setAlkInitialTab,
    alkStations,
    predictedPosition,
    localPlayer,
  });

  useGameplayScreenAudioRuntime({
    localPlayer,
    activeConsumableEffects,
    localPlayerId,
    showSovaSoundBox,
    sovaMessageAdder,
  });

  const { cameraOffsetX, cameraOffsetY } = useSpeechBubbleManager(localPlayer, predictedPosition);
  const localPlayerActiveEquipment = localPlayerId ? activeEquipments.get(localPlayerId) : undefined;
  const activeItemDef = localPlayerActiveEquipment?.equippedItemDefId
    ? itemDefinitions.get(localPlayerActiveEquipment.equippedItemDefId.toString()) || null
    : null;

  return {
    voiceState,
    handleTranscriptionComplete,
    handleVoiceError,
    forceCloseVoice,
    seenTutorialIds,
    questCompletionNotification,
    dismissQuestCompletionNotification,
    hasNewQuestNotification,
    handleMatronageCreated,
    handleOpenAlkBoard,
    handleInterfaceClose,
    localPlayer,
    cameraOffsetX,
    cameraOffsetY,
    localPlayerActiveEquipment,
    activeItemDef,
    handleTitleSelect,
    onSOVALoadingStateChange,
  };
}
