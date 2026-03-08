/**
 * Selector hook for the local player from the engine store.
 */
import type { Player } from '../../generated/types';
import { useEngineSnapshot } from '../react/useEngineSnapshot';

export function useLocalPlayer(identityHex: string | null): Player | undefined {
  return useEngineSnapshot((snapshot) => {
    if (!identityHex) return undefined;
    const players = snapshot.world.tables['players'] as Map<string, Player> | undefined;
    if (!players) return undefined;
    return players.get(identityHex);
  });
}
