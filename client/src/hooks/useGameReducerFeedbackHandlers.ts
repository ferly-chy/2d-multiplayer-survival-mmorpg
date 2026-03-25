/**
 * SpacetimeDB 2.x: `connection.reducers` is invoke-only (no `onConsumeItem` / `removeOn*`).
 * We wrap selected reducer methods once per connection so failed calls still run sounds + toasts
 * via the returned Promise rejection (SenderError / InternalError).
 */

import { useEffect } from 'react';
import { InternalError, SenderError } from 'spacetimedb';
import { logReducer, trimErrorForDisplay } from '../utils/gameDebugUtils';

type Connection = { reducers: Record<string, unknown> } | null;

export interface UseGameReducerFeedbackHandlersParams {
  connection: Connection;
  showError: (msg: string) => void;
  playImmediateSound: (soundType: string, volume?: number) => void;
  isAnySovaAudioPlaying: () => boolean;
}

function rejectionMessage(err: unknown): string {
  if (err instanceof SenderError || err instanceof InternalError || err instanceof Error) {
    return err.message;
  }
  return String(err);
}

type FailureCtx = Pick<
  UseGameReducerFeedbackHandlersParams,
  'showError' | 'playImmediateSound' | 'isAnySovaAudioPlaying'
>;

const PLACEMENT_LABELS: Record<string, string> = {
  placeCampfire: 'Campfire',
  placeFurnace: 'Furnace',
  placeLantern: 'Lantern',
  placeWoodenStorageBox: 'Wooden Storage Box',
  placeSleepingBag: 'Sleeping Bag',
  placeStash: 'Stash',
  placeShelter: 'Shelter',
  placeRainCollector: 'Rain Collector',
  placeHomesteadHearth: "Matron's Chest",
  placeBarbecue: 'Barbecue',
  placeTurret: 'Turret',
  placeExplosive: 'Explosive',
};

function wrapReducer(
  reducers: Record<string, unknown>,
  methodName: string,
  onFailure: (errorMsg: string, args: unknown[]) => void
): (() => void) | undefined {
  const original = reducers[methodName];
  if (typeof original !== 'function') return undefined;

  const bound = original.bind(reducers) as (...args: unknown[]) => Promise<unknown>;

  reducers[methodName] = (...args: unknown[]) => {
    return bound(...args).catch((err: unknown) => {
      onFailure(rejectionMessage(err), args);
      return Promise.reject(err);
    });
  };

  return () => {
    reducers[methodName] = original;
  };
}

function installReducerFailureWrappers(connection: NonNullable<Connection>, ctx: FailureCtx): () => void {
  const { showError, playImmediateSound, isAnySovaAudioPlaying } = ctx;
  const reducers = connection.reducers;
  const cleanups: (() => void)[] = [];

  const add = (method: string, onFailure: (errorMsg: string, args: unknown[]) => void) => {
    const u = wrapReducer(reducers, method, onFailure);
    if (u) cleanups.push(u);
  };

  add('consumeItem', (errorMsg, args) => {
    const params = args[0] as { itemInstanceId?: bigint } | undefined;
    logReducer('GameCanvas', 'consumeItem reject', params?.itemInstanceId?.toString?.() ?? '?', errorMsg);
    if (errorMsg === 'BREW_COOLDOWN') {
      if (isAnySovaAudioPlaying()) {
        showError('Brew cooldown active.');
      } else {
        const brewCooldownSounds = [
          '/sounds/sova_brew_cooldown.mp3',
          '/sounds/sova_brew_cooldown1.mp3',
          '/sounds/sova_brew_cooldown2.mp3',
          '/sounds/sova_brew_cooldown3.mp3',
        ];
        const randomSound = brewCooldownSounds[Math.floor(Math.random() * brewCooldownSounds.length)];
        try {
          const audio = new Audio(randomSound);
          audio.volume = 0.7;
          audio.play().catch(() => {});
        } catch {
          // Ignore
        }
      }
    } else {
      showError(trimErrorForDisplay(errorMsg));
    }
  });

  add('applyFertilizer', (errorMsg, args) => {
    const params = args[0] as { fertilizerInstanceId?: bigint } | undefined;
    logReducer('GameCanvas', 'applyFertilizer reject', params?.fertilizerInstanceId?.toString?.() ?? '?', errorMsg);
    showError(trimErrorForDisplay(errorMsg || 'Unknown error'));
  });

  add('destroyFoundation', (errorMsg) => {
    logReducer('GameCanvas', 'destroyFoundation', errorMsg);
    showError(trimErrorForDisplay(errorMsg || 'Failed to destroy foundation'));
  });

  add('destroyWall', (errorMsg) => {
    logReducer('GameCanvas', 'destroyWall', errorMsg);
    showError(trimErrorForDisplay(errorMsg || 'Failed to destroy wall'));
  });

  add('fireProjectile', () => {
    // Sync / expected failures — suppress sound and toast
  });

  add('loadRangedWeapon', (errorMsg) => {
    if (errorMsg.includes('need at least 1 arrow')) {
      playImmediateSound('error_arrows', 1.0);
    }
    showError(errorMsg || 'Failed to load weapon');
  });

  const upgradeFoundationLike = (errorMsg: string) => {
    if (errorMsg.includes('Building privilege') || errorMsg.includes('building privilege')) {
      playImmediateSound('error_building_privilege', 1.0);
    } else if (
      errorMsg.includes('Cannot downgrade') ||
      errorMsg.includes('Current tier') ||
      errorMsg.includes('Target tier')
    ) {
      playImmediateSound('error_tier_upgrade', 1.0);
    } else if (
      errorMsg.includes('Not enough') ||
      errorMsg.includes('wood') ||
      errorMsg.includes('stone') ||
      errorMsg.includes('metal fragments') ||
      errorMsg.includes('Required:')
    ) {
      playImmediateSound('error_resources', 1.0);
    }
    showError(trimErrorForDisplay(errorMsg));
  };

  add('upgradeFoundation', (errorMsg) => upgradeFoundationLike(errorMsg));

  add('upgradeWall', (errorMsg) => {
    logReducer('GameCanvas', 'upgradeWall', errorMsg);
    upgradeFoundationLike(errorMsg || 'Failed to upgrade wall');
  });

  for (const [method, label] of Object.entries(PLACEMENT_LABELS)) {
    add(method, (errorMsg) => {
      playImmediateSound('error_placement_failed', 1.0);
      showError(trimErrorForDisplay(errorMsg || `${label} placement failed`));
    });
  }

  add('pickupDroppedItem', (errorMsg) => {
    const lower = errorMsg.toLowerCase();
    if (lower.includes('too far') || lower.includes('not found')) return;
    showError(trimErrorForDisplay(errorMsg || 'Cannot pick up item'));
  });

  add('interactDoor', (errorMsg) => {
    if (errorMsg.toLowerCase().includes('too far')) return;
    showError(trimErrorForDisplay(errorMsg || 'Cannot interact with door'));
  });

  add('interactWithCairn', (errorMsg) => {
    if (errorMsg.toLowerCase().includes('too far')) return;
    showError(trimErrorForDisplay(errorMsg || 'Cannot interact with cairn'));
  });

  add('milkAnimal', (errorMsg) => {
    if (errorMsg.toLowerCase().includes('too far')) return;
    showError(trimErrorForDisplay(errorMsg || 'Cannot milk animal'));
  });

  add('castFishingLine', (errorMsg) => {
    if (errorMsg.toLowerCase().includes('too far')) return;
    showError(trimErrorForDisplay(errorMsg || 'Cannot cast fishing line'));
  });

  add('finishFishing', (errorMsg) => {
    const lower = errorMsg.toLowerCase();
    if (lower.includes('no active') || lower.includes('session is not active')) return;
    showError(trimErrorForDisplay(errorMsg || 'Fishing failed'));
  });

  add('respawnRandomly', (errorMsg) => {
    showError(trimErrorForDisplay(errorMsg || 'Respawn failed'));
  });

  add('respawnAtSleepingBag', (errorMsg) => {
    showError(trimErrorForDisplay(errorMsg || 'Respawn at sleeping bag failed'));
  });

  return () => {
    for (let i = cleanups.length - 1; i >= 0; i--) cleanups[i]();
  };
}

export function useGameReducerFeedbackHandlers({
  connection,
  showError,
  playImmediateSound,
  isAnySovaAudioPlaying,
}: UseGameReducerFeedbackHandlersParams) {
  useEffect(() => {
    if (!connection) return;
    return installReducerFailureWrappers(connection, {
      showError,
      playImmediateSound,
      isAnySovaAudioPlaying,
    });
  }, [connection, showError, playImmediateSound, isAnySovaAudioPlaying]);
}
