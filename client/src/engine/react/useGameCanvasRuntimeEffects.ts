import { useEffect, useRef } from 'react';
import { useArrowBreakEffects } from '../../hooks/useArrowBreakEffects';
import { useGameReducerFeedbackHandlers } from '../../hooks/useGameReducerFeedbackHandlers';
import { playImmediateSound } from '../../hooks/useSoundSystem';
import { isAnySovaAudioPlaying } from '../../hooks/useSovaSoundBox';
import { logDebug } from '../../utils/gameDebugUtils';

interface UseGameCanvasRuntimeEffectsOptions {
  connection: any | null;
  localPlayer: any;
  predictedPosition: { x: number; y: number } | null;
  worldMousePos: { x: number | null; y: number | null };
  localPlayerId?: string;
  activeConsumableEffects: Map<string, any>;
  isAutoAttacking: boolean;
  onAutoActionStatesChange?: (isAutoAttacking: boolean) => void;
  showError: (message: string) => void;
}

export function useGameCanvasRuntimeEffects({
  connection,
  localPlayer,
  predictedPosition,
  worldMousePos,
  localPlayerId,
  activeConsumableEffects,
  isAutoAttacking,
  onAutoActionStatesChange,
  showError,
}: UseGameCanvasRuntimeEffectsOptions): void {
  const burnSoundPlayedRef = useRef<Set<string>>(new Set());
  const lastSentFlashlightAngleRef = useRef(0);
  const lastFlashlightSyncTimeRef = useRef(0);

  useEffect(() => {
    if (!localPlayerId || !activeConsumableEffects) {
      return;
    }

    const localPlayerBurnEffects: any[] = [];
    for (const effect of activeConsumableEffects.values()) {
      if (effect.playerId.toHexString() === localPlayerId && effect.effectType.tag === 'Burn') {
        localPlayerBurnEffects.push(effect);
      }
    }

    localPlayerBurnEffects.forEach((effect) => {
      const effectKey = `${effect.effectId}_${effect.endsAt.microsSinceUnixEpoch}`;
      if (!burnSoundPlayedRef.current.has(effectKey)) {
        logDebug('[BURN_SOUND] Playing burn sound for effect', effect.effectId, 'ending at', effect.endsAt.microsSinceUnixEpoch);
        playImmediateSound('player_burnt', 1.0);
        burnSoundPlayedRef.current.add(effectKey);
      }
    });

    const currentEffectKeys = new Set(
      localPlayerBurnEffects.map((effect) => `${effect.effectId}_${effect.endsAt.microsSinceUnixEpoch}`)
    );
    burnSoundPlayedRef.current.forEach((oldKey) => {
      if (!currentEffectKeys.has(oldKey)) {
        burnSoundPlayedRef.current.delete(oldKey);
      }
    });
  }, [activeConsumableEffects, localPlayerId]);

  useEffect(() => {
    if (!connection || !localPlayer?.isFlashlightOn) {
      return;
    }
    if (worldMousePos.x === null || worldMousePos.y === null) {
      return;
    }

    const playerX = predictedPosition?.x ?? localPlayer.positionX;
    const playerY = predictedPosition?.y ?? localPlayer.positionY;
    const dx = worldMousePos.x - playerX;
    const dy = worldMousePos.y - playerY;
    const aimAngle = Math.atan2(dy, dx);
    const angleDiff = Math.abs(aimAngle - lastSentFlashlightAngleRef.current);
    const timeSinceLastSync = Date.now() - lastFlashlightSyncTimeRef.current;

    if (angleDiff > 0.087 || timeSinceLastSync > 100) {
      lastSentFlashlightAngleRef.current = aimAngle;
      lastFlashlightSyncTimeRef.current = Date.now();

      try {
        connection.reducers.updateFlashlightAim({ aimAngle });
      } catch {
        // Ignore reducer errors during hot reload / partial runtime init.
      }
    }
  }, [
    connection,
    localPlayer?.isFlashlightOn,
    localPlayer?.positionX,
    localPlayer?.positionY,
    predictedPosition,
    worldMousePos.x,
    worldMousePos.y,
  ]);

  useGameReducerFeedbackHandlers({
    connection,
    showError,
    playImmediateSound: playImmediateSound as (soundType: string, volume?: number) => void,
    isAnySovaAudioPlaying,
  });

  useArrowBreakEffects({ connection });

  useEffect(() => {
    onAutoActionStatesChange?.(isAutoAttacking);
  }, [isAutoAttacking, onAutoActionStatesChange]);
}
