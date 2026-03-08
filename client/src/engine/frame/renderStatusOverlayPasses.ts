import { renderCombinedHealthOverlays } from '../../utils/renderers/healthOverlayUtils';
import { renderBrothEffectsOverlays } from '../../utils/renderers/brothEffectsOverlayUtils';
import { renderInsanityOverlay } from '../../utils/renderers/insanityOverlayUtils';
import { renderUnderwaterVignette } from '../../utils/renderers/underwaterEffectsUtils';

interface RenderStatusOverlayPassesOptions {
  ctx: CanvasRenderingContext2D;
  isSnorkeling: boolean;
  canvasWidth: number;
  canvasHeight: number;
  showStatusOverlays: boolean;
  localPlayer: any;
  deltaTimeMs: number;
  activeConsumableEffects: Map<string, any>;
  localPlayerId?: string;
  cycleProgress: number;
}

export function renderStatusOverlayPasses({
  ctx,
  isSnorkeling,
  canvasWidth,
  canvasHeight,
  showStatusOverlays,
  localPlayer,
  deltaTimeMs,
  activeConsumableEffects,
  localPlayerId,
  cycleProgress,
}: RenderStatusOverlayPassesOptions): void {
  if (isSnorkeling) {
    renderUnderwaterVignette(ctx, canvasWidth, canvasHeight);
  }

  if (showStatusOverlays && localPlayer && !localPlayer.isDead && !localPlayer.isKnockedOut) {
    const healthPercent = localPlayer.health / 100.0;
    const warmthPercent = localPlayer.warmth / 100.0;
    const deltaSeconds = deltaTimeMs / 1000;

    renderCombinedHealthOverlays(
      ctx,
      canvasWidth,
      canvasHeight,
      healthPercent,
      warmthPercent,
      deltaSeconds,
    );

    renderBrothEffectsOverlays(
      ctx,
      canvasWidth,
      canvasHeight,
      deltaSeconds,
      activeConsumableEffects,
      localPlayerId,
      cycleProgress,
    );
  }

  if (localPlayer && !localPlayer.isDead && !localPlayer.isKnockedOut) {
    const insanityIntensity = (localPlayer.insanity ?? 0) / 100.0;
    let hasEntrainment = false;

    if (localPlayerId && activeConsumableEffects) {
      for (const effect of activeConsumableEffects.values()) {
        if (effect.playerId.toHexString() === localPlayerId && effect.effectType.tag === 'Entrainment') {
          hasEntrainment = true;
          break;
        }
      }
    }

    renderInsanityOverlay(
      ctx,
      canvasWidth,
      canvasHeight,
      deltaTimeMs / 1000,
      insanityIntensity,
      hasEntrainment,
    );
  }
}
