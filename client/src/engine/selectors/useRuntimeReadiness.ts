/**
 * Selector hook for runtime readiness and logged-in player state.
 */
import type { Player } from '../../generated/types';
import { useEngineSnapshot } from '../react/useEngineSnapshot';

export function useRuntimeReadiness(identityHex: string | null): {
  localPlayerRegistered: boolean;
  loggedInPlayer: Player | null;
} {
  return useEngineSnapshot((snapshot) => {
    const localPlayerRegistered =
      (snapshot.world.tables['localPlayerRegistered'] as boolean | undefined) ?? false;
    const players = snapshot.world.tables['players'] as Map<string, Player> | undefined;
    const loggedInPlayer = identityHex && players ? players.get(identityHex) ?? null : null;
    return { localPlayerRegistered, loggedInPlayer };
  });
}
