/**
 * Selector hook for online human player count (LoginScreen capacity display).
 */
import type { Player } from '../../../generated/types';
import { useEngineSnapshot } from '../useEngineSnapshot';

export function useOnlinePlayerCount(): number {
  return useEngineSnapshot((snapshot) => {
    const players = snapshot.world.tables['players'] as Map<string, Player> | undefined;
    if (!players) return 0;
    return Array.from(players.values()).filter((p) => p.isOnline && !p.isNpc).length;
  });
}
