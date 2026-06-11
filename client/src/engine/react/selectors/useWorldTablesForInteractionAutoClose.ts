/**
 * Selector hook that returns the tables needed by useInteractionAutoClose.
 */
import type {
  Player,
  Campfire,
  Furnace,
  Fumarole,
  WoodenStorageBox,
  Stash,
  PlayerCorpse,
  RainCollector,
} from '../../../generated/types';
import { useEngineSnapshot } from '../useEngineSnapshot';

const emptyMap = <T>(): Map<string, T> => new Map();

export function useWorldTablesForInteractionAutoClose(): {
  players: Map<string, Player>;
  woodenStorageBoxes: Map<string, WoodenStorageBox>;
  campfires: Map<string, Campfire>;
  furnaces: Map<string, Furnace>;
  fumaroles: Map<string, Fumarole>;
  stashes: Map<string, Stash>;
  playerCorpses: Map<string, PlayerCorpse>;
  rainCollectors: Map<string, RainCollector>;
} {
  return useEngineSnapshot((s) => {
    const t = s.world.tables;
    return {
      players: (t['players'] as Map<string, Player>) ?? emptyMap<Player>(),
      woodenStorageBoxes: (t['woodenStorageBoxes'] as Map<string, WoodenStorageBox>) ?? emptyMap<WoodenStorageBox>(),
      campfires: (t['campfires'] as Map<string, Campfire>) ?? emptyMap<Campfire>(),
      furnaces: (t['furnaces'] as Map<string, Furnace>) ?? emptyMap<Furnace>(),
      fumaroles: (t['fumaroles'] as Map<string, Fumarole>) ?? emptyMap<Fumarole>(),
      stashes: (t['stashes'] as Map<string, Stash>) ?? emptyMap<Stash>(),
      playerCorpses: (t['playerCorpses'] as Map<string, PlayerCorpse>) ?? emptyMap<PlayerCorpse>(),
      rainCollectors: (t['rainCollectors'] as Map<string, RainCollector>) ?? emptyMap<RainCollector>(),
    };
  });
}
