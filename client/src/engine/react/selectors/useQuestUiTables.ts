/**
 * Selector hook for quest/tutorial UI tables.
 */
import type {
  DailyQuestDefinition,
  PlayerDailyQuest,
  PlayerTutorialProgress,
  TutorialQuestDefinition,
} from '../../../generated/types';
import { useEngineSnapshot } from '../useEngineSnapshot';

const EMPTY_MAP = new Map();

export function useQuestUiTables() {
  return useEngineSnapshot((snapshot) => {
    const uiTables = snapshot.ui.uiTables;
    return {
      tutorialQuestDefinitions:
        (uiTables.tutorialQuestDefinitions as Map<string, TutorialQuestDefinition> | undefined) ??
        (EMPTY_MAP as Map<string, TutorialQuestDefinition>),
      dailyQuestDefinitions:
        (uiTables.dailyQuestDefinitions as Map<string, DailyQuestDefinition> | undefined) ??
        (EMPTY_MAP as Map<string, DailyQuestDefinition>),
      playerTutorialProgress:
        (uiTables.playerTutorialProgress as Map<string, PlayerTutorialProgress> | undefined) ??
        (EMPTY_MAP as Map<string, PlayerTutorialProgress>),
      playerDailyQuests:
        (uiTables.playerDailyQuests as Map<string, PlayerDailyQuest> | undefined) ??
        (EMPTY_MAP as Map<string, PlayerDailyQuest>),
    };
  });
}
