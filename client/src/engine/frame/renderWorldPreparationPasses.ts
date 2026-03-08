import { mark } from '../../utils/profiler';
import { renderWorldBackground, renderShorelineOverlay } from '../../utils/renderers/worldRenderingUtils';
import { renderCyberpunkGridBackground } from '../../utils/renderers/cyberpunkGridBackground';
import { renderWaterPatches } from '../../utils/renderers/waterPatchRenderingUtils';
import { renderFertilizerPatches } from '../../utils/renderers/fertilizerPatchRenderingUtils';
import { renderFirePatches } from '../../utils/renderers/firePatchRenderingUtils';
import { renderPlacedExplosives } from '../../utils/renderers/explosiveRenderingUtils';
import { isPlacementTooFar, worldPosToTileCoords } from '../../utils/renderers/placementRenderingUtils';
import { renderCampfire } from '../../utils/renderers/campfireRenderingUtils';
import { renderBarbecue } from '../../utils/renderers/barbecueRenderingUtils';
import {
  renderSeaStackUnderwaterSilhouette,
  renderSeaStackBottomOnly,
} from '../../utils/renderers/seaStackRenderingUtils';
import {
  renderBarrelUnderwaterSilhouette,
  renderSeaBarrelWaterShadowOnly,
} from '../../utils/renderers/barrelRenderingUtils';
import {
  updateUnderwaterEffects,
  renderUnderwaterEffectsUnder,
} from '../../utils/renderers/underwaterEffectsUtils';
import {
  renderUnderwaterShadowIfOverWater,
} from '../../utils/renderers/swimmingEffectsUtils';
import {
  getPlayerForRendering,
  isPlayerHovered,
  renderPlayer,
  getSpriteCoordinates,
} from '../../utils/renderers/playerRenderingUtils';
import { isPlayerMoving } from '../../config/gameConfig';
import { renderWaterOverlay } from '../../utils/renderers/waterOverlayUtils';
import { setShelterClippingData, setGlobalShadowsEnabled } from '../../utils/renderers/shadowUtils';

const TOTAL_SWIMMING_FRAMES = 24;

interface RenderWorldPreparationPassesOptions {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  cameraOffsetX: number;
  cameraOffsetY: number;
  showFpsProfiler: boolean;
  allShadowsEnabled: boolean;
  shelterClippingData: any;
  localPlayer: any;
  visibleWorldTiles: Map<string, any>;
  showAutotileDebug: boolean;
  waterPatches: Map<string, any>;
  fertilizerPatches: Map<string, any>;
  firePatches: Map<string, any>;
  placedExplosives: Map<string, any>;
  nowMs: number;
  placementInfo: any;
  currentWorldMouseX: number | null;
  currentWorldMouseY: number | null;
  visibleCampfires: any[];
  visibleBarbecues: any[];
  visibleSeaStacks: any[];
  visibleBarrels: any[];
  currentCycleProgress: number;
  currentPredictedPosition: { x: number; y: number } | null;
  doodadImages: Map<string, any>;
  deltaTimeMs: number;
  waterTileLookup: Map<string, boolean>;
  seaTransitionTileLookup: Map<string, boolean>;
  swimmingPlayersForBottomHalf: any[];
  players: Map<string, any>;
  localPlayerId?: string;
  currentLocalFacingDirection?: string;
  remotePlayerInterpolation: any;
  lastPositionsRef: { current: Map<string, { x: number; y: number }> };
  swimmingPlayerScratchRef: { current: any };
  localPlayerScratchRef: { current: any };
  heroImage: HTMLImageElement | null;
  heroSprintImage: HTMLImageElement | null;
  heroIdleImage: HTMLImageElement | null;
  heroWaterImage: HTMLImageElement | null;
  heroCrouchImage: HTMLImageElement | null;
  heroDodgeImage: HTMLImageElement | null;
  currentIdleAnimationFrame: number;
  activeConnections: Map<string, any> | null | undefined;
  worldMousePos: { x: number | null; y: number | null };
  activeConsumableEffects: Map<string, any>;
  alwaysShowPlayerNames: boolean;
  localPlayerIsCrouching: boolean;
  localWaterEntryGraceActive: boolean;
  waterSurfaceEffectsEnabled: boolean;
}

export function renderWorldPreparationPasses({
  ctx,
  canvasWidth,
  canvasHeight,
  cameraOffsetX,
  cameraOffsetY,
  showFpsProfiler,
  allShadowsEnabled,
  shelterClippingData,
  localPlayer,
  visibleWorldTiles,
  showAutotileDebug,
  waterPatches,
  fertilizerPatches,
  firePatches,
  placedExplosives,
  nowMs,
  placementInfo,
  currentWorldMouseX,
  currentWorldMouseY,
  visibleCampfires,
  visibleBarbecues,
  visibleSeaStacks,
  visibleBarrels,
  currentCycleProgress,
  currentPredictedPosition,
  doodadImages,
  deltaTimeMs,
  waterTileLookup,
  seaTransitionTileLookup,
  swimmingPlayersForBottomHalf,
  players,
  localPlayerId,
  currentLocalFacingDirection,
  remotePlayerInterpolation,
  lastPositionsRef,
  swimmingPlayerScratchRef,
  localPlayerScratchRef,
  heroImage,
  heroSprintImage,
  heroIdleImage,
  heroWaterImage,
  heroCrouchImage,
  heroDodgeImage,
  currentIdleAnimationFrame,
  activeConnections,
  worldMousePos,
  activeConsumableEffects,
  alwaysShowPlayerNames,
  localPlayerIsCrouching,
  localWaterEntryGraceActive,
  waterSurfaceEffectsEnabled,
}: RenderWorldPreparationPassesOptions) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  renderCyberpunkGridBackground(ctx, canvasWidth, canvasHeight, cameraOffsetX, cameraOffsetY);
  ctx.save();
  ctx.translate(cameraOffsetX, cameraOffsetY);
  const t0 = mark(showFpsProfiler);

  setGlobalShadowsEnabled(allShadowsEnabled);
  setShelterClippingData(shelterClippingData);
  const isSnorkeling = localPlayer?.isSnorkeling ?? false;

  renderWorldBackground(
    ctx,
    cameraOffsetX,
    cameraOffsetY,
    canvasWidth,
    canvasHeight,
    visibleWorldTiles,
    showAutotileDebug,
    isSnorkeling,
  );

  renderWaterPatches(ctx, waterPatches, -cameraOffsetX, -cameraOffsetY, canvasWidth, canvasHeight);
  renderFertilizerPatches(ctx, fertilizerPatches, -cameraOffsetX, -cameraOffsetY, canvasWidth, canvasHeight);
  renderFirePatches(ctx, firePatches, -cameraOffsetX, -cameraOffsetY, canvasWidth, canvasHeight, nowMs);
  renderPlacedExplosives(ctx, placedExplosives, -cameraOffsetX, -cameraOffsetY, canvasWidth, canvasHeight, nowMs);
  const t1 = mark(showFpsProfiler);

  const isPlacementTooFarValue = Boolean(
    placementInfo &&
    localPlayer &&
    currentWorldMouseX !== null &&
    currentWorldMouseY !== null &&
    isPlacementTooFar(
      placementInfo,
      localPlayer.positionX,
      localPlayer.positionY,
      currentWorldMouseX,
      currentWorldMouseY,
    ),
  );

  if (allShadowsEnabled) {
    visibleCampfires.forEach((campfire) => {
      renderCampfire(ctx, campfire, nowMs, currentCycleProgress, true);
    });
    visibleBarbecues.forEach((barbecue) => {
      renderBarbecue(ctx, barbecue, nowMs, currentCycleProgress, true);
    });
  }

  if (isSnorkeling) {
    visibleSeaStacks.forEach((seaStack) => {
      renderSeaStackUnderwaterSilhouette(ctx, seaStack, currentCycleProgress);
    });
    visibleBarrels.forEach((barrel) => {
      renderBarrelUnderwaterSilhouette(ctx, barrel, currentCycleProgress, nowMs);
    });
  } else {
    const localPlayerPositionForSeaStacks =
      currentPredictedPosition ?? (localPlayer ? { x: localPlayer.positionX, y: localPlayer.positionY } : null);
    visibleSeaStacks.forEach((seaStack) => {
      renderSeaStackBottomOnly(
        ctx,
        seaStack,
        doodadImages,
        currentCycleProgress,
        nowMs,
        localPlayerPositionForSeaStacks,
      );
    });
  }
  const t1a = mark(showFpsProfiler);

  if (isSnorkeling) {
    updateUnderwaterEffects(deltaTimeMs / 1000, -cameraOffsetX, -cameraOffsetY, canvasWidth, canvasHeight);
    renderUnderwaterEffectsUnder(ctx, -cameraOffsetX, -cameraOffsetY, canvasWidth, canvasHeight, nowMs);
  }
  const t1b = mark(showFpsProfiler);

  const isOnSeaTileForBarrels = (worldX: number, worldY: number): boolean => {
    const { tileX, tileY } = worldPosToTileCoords(worldX, worldY);
    return waterTileLookup.get(`${tileX},${tileY}`) ?? false;
  };

  if (allShadowsEnabled) {
    visibleBarrels.forEach((barrel) => {
      renderSeaBarrelWaterShadowOnly(
        ctx,
        barrel,
        nowMs,
        currentCycleProgress,
        isOnSeaTileForBarrels,
        seaTransitionTileLookup,
      );
    });
  }

  if (allShadowsEnabled) {
    swimmingPlayersForBottomHalf.forEach((player) => {
      const playerId = player.identity.toHexString();
      const isLocalPlayer = localPlayerId === playerId;
      const playerForRendering = getPlayerForRendering(
        player,
        isLocalPlayer,
        currentPredictedPosition,
        currentLocalFacingDirection,
        remotePlayerInterpolation,
        localPlayerId,
        swimmingPlayerScratchRef.current,
      );
      const lastPos = lastPositionsRef.current?.get(playerId);
      const moving = isPlayerMoving(lastPos, playerForRendering.positionX, playerForRendering.positionY);
      const currentAnimFrame = currentIdleAnimationFrame;
      lastPositionsRef.current?.set(playerId, { x: playerForRendering.positionX, y: playerForRendering.positionY });
      const effectiveHeroImage = heroWaterImage || heroImage;

      if (effectiveHeroImage) {
        const isOnline = activeConnections ? activeConnections.has(playerId) : false;
        const isHovered = worldMousePos ? isPlayerHovered(worldMousePos.x, worldMousePos.y, playerForRendering) : false;
        const forceFullSpriteForLocalWaterEntry = isLocalPlayer && localWaterEntryGraceActive;

        renderPlayer(
          ctx,
          playerForRendering,
          effectiveHeroImage,
          heroSprintImage || effectiveHeroImage,
          heroIdleImage || effectiveHeroImage,
          heroCrouchImage || effectiveHeroImage,
          heroWaterImage || heroImage || effectiveHeroImage,
          heroDodgeImage || effectiveHeroImage,
          isOnline,
          moving,
          isHovered,
          currentAnimFrame,
          nowMs,
          0,
          alwaysShowPlayerNames || isHovered,
          activeConsumableEffects,
          localPlayerId,
          false,
          currentCycleProgress,
          localPlayerIsCrouching,
          forceFullSpriteForLocalWaterEntry ? 'full' : 'bottom',
          false,
          0,
          false,
          isSnorkeling,
          undefined,
          true,
        );
      }
    });
  }

  swimmingPlayersForBottomHalf.forEach((player) => {
    const playerId = player.identity.toHexString();
    const isLocalPlayer = localPlayerId === playerId;
    const playerForRendering = getPlayerForRendering(
      player,
      isLocalPlayer,
      currentPredictedPosition,
      currentLocalFacingDirection,
      remotePlayerInterpolation,
      localPlayerId,
      swimmingPlayerScratchRef.current,
    );

    let shadowImage: HTMLImageElement | null = null;
    const effectiveIsCrouching = isLocalPlayer && localPlayerIsCrouching !== undefined
      ? localPlayerIsCrouching
      : player.isCrouching;

    if (player.isOnWater) {
      shadowImage = heroWaterImage || heroImage;
    } else if (effectiveIsCrouching) {
      shadowImage = heroCrouchImage || heroImage;
    } else {
      shadowImage = heroImage;
    }

    if (shadowImage) {
      const lastPos = lastPositionsRef.current?.get(playerId);
      const moving = isPlayerMoving(lastPos, playerForRendering.positionX, playerForRendering.positionY);
      const { sx, sy } = getSpriteCoordinates(
        playerForRendering,
        moving,
        currentIdleAnimationFrame,
        false,
        TOTAL_SWIMMING_FRAMES,
        false,
        false,
        true,
        false,
        0,
      );
      renderUnderwaterShadowIfOverWater(
        ctx,
        shadowImage,
        playerForRendering.positionX,
        playerForRendering.positionY,
        sx,
        sy,
        waterTileLookup,
        seaTransitionTileLookup,
      );
    }
  });

  if (allShadowsEnabled && isSnorkeling && localPlayer && currentPredictedPosition) {
    const shadowImage = heroWaterImage || heroImage;
    if (shadowImage) {
      const lastPos = lastPositionsRef.current?.get(localPlayerId ?? '');
      const moving = isPlayerMoving(lastPos, currentPredictedPosition.x, currentPredictedPosition.y);
      const localScratch = localPlayerScratchRef.current;
      Object.assign(localScratch, localPlayer);
      localScratch.positionX = currentPredictedPosition.x;
      localScratch.positionY = currentPredictedPosition.y;
      localScratch.direction = currentLocalFacingDirection ?? localPlayer.direction;
      const { sx, sy } = getSpriteCoordinates(
        localScratch,
        moving,
        0,
        false,
        TOTAL_SWIMMING_FRAMES,
        false,
        false,
        true,
        false,
        0,
      );
      renderUnderwaterShadowIfOverWater(
        ctx,
        shadowImage,
        currentPredictedPosition.x,
        currentPredictedPosition.y,
        sx,
        sy,
        waterTileLookup,
        seaTransitionTileLookup,
      );
    }
  }

  if (allShadowsEnabled) {
    players.forEach((player) => {
      if (player.identity.toHexString() === localPlayerId) return;
      if (!player.isSnorkeling) return;
      if (player.isDead || player.isKnockedOut) return;

      const shadowImage = heroWaterImage || heroImage;
      if (!shadowImage) return;

      const playerId = player.identity.toHexString();
      const playerForRendering = getPlayerForRendering(
        player,
        false,
        null,
        undefined,
        remotePlayerInterpolation,
        localPlayerId,
        swimmingPlayerScratchRef.current,
      );
      const lastPos = lastPositionsRef.current?.get(playerId);
      const moving = isPlayerMoving(lastPos, playerForRendering.positionX, playerForRendering.positionY);
      const { sx, sy } = getSpriteCoordinates(
        playerForRendering,
        moving,
        currentIdleAnimationFrame,
        false,
        TOTAL_SWIMMING_FRAMES,
        false,
        false,
        true,
        false,
        0,
      );
      renderUnderwaterShadowIfOverWater(
        ctx,
        shadowImage,
        playerForRendering.positionX,
        playerForRendering.positionY,
        sx,
        sy,
        waterTileLookup,
        seaTransitionTileLookup,
      );
    });
  }

  const t1c = mark(showFpsProfiler);

  if (!isSnorkeling && waterSurfaceEffectsEnabled) {
    renderWaterOverlay(
      ctx,
      -cameraOffsetX,
      -cameraOffsetY,
      canvasWidth,
      canvasHeight,
      deltaTimeMs / 1000,
      visibleWorldTiles,
    );
    renderShorelineOverlay(ctx, cameraOffsetX, cameraOffsetY, canvasWidth, canvasHeight, isSnorkeling);
  }
  const t2 = mark(showFpsProfiler);

  return { t0, t1, t1a, t1b, t1c, t2, isPlacementTooFarValue, isSnorkeling };
}
