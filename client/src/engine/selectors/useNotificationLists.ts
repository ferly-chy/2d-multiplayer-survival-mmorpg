/**
 * Selector for level-up and achievement notification lists. Reads from engine store.
 */
import { useEngineSnapshot } from '../react/useEngineSnapshot';
import type { LevelUpNotification, AchievementUnlockNotification } from '../../generated/types';

const EMPTY_MAP = new Map();

export function useNotificationLists() {
  return useEngineSnapshot((s) => {
    const levelUp = (s.world.tables['levelUpNotifications'] as Map<string, unknown>) ?? EMPTY_MAP;
    const achievement = (s.world.tables['achievementUnlockNotifications'] as Map<string, unknown>) ?? EMPTY_MAP;
    return {
      levelUpNotificationsList: Array.from(levelUp.values()) as LevelUpNotification[],
      achievementUnlockNotificationsList: Array.from(achievement.values()) as AchievementUnlockNotification[],
    };
  });
}
