/**
 * Selector hook for SpeechBubbleManager's read-only runtime data.
 */
import type { Message, Player } from '../../generated/types';
import { useEngineSnapshot } from '../react/useEngineSnapshot';

const EMPTY_MAP = new Map();

export function useSpeechBubbleRuntimeData() {
  return useEngineSnapshot((snapshot) => ({
    messages: (snapshot.ui.uiTables.messages as Map<string, Message> | undefined) ?? (EMPTY_MAP as Map<string, Message>),
    players: (snapshot.world.tables.players as Map<string, Player> | undefined) ?? (EMPTY_MAP as Map<string, Player>),
    localPlayerId: snapshot.connection.identityHex ?? undefined,
  }));
}
