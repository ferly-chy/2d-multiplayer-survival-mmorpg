import { mark } from '../../utils/profiler';
import { renderYSortedEntities } from '../../utils/renderers/renderingUtils';
import { isPlayerHovered, renderPlayer } from '../../utils/renderers/playerRenderingUtils';
import { renderEquippedItem } from '../../utils/renderers/equippedItemRenderingUtils';
import { buildProjectileCollisionCircles } from '../../utils/renderers/projectileRenderingUtils';
import { renderTreeCanopyShadowsOverlay } from '../../utils/renderers/treeRenderingUtils';
import { renderSeaStackShadowsOverlay } from '../../utils/renderers/seaStackRenderingUtils';
import { processWildAnimalsForBurrowEffects, renderBurrowEffects } from '../../utils/renderers/wildAnimalRenderingUtils';
import { renderHotSprings } from '../../utils/renderers/hotSpringRenderingUtils';
import { renderUnderwaterEffectsOver } from '../../utils/renderers/underwaterEffectsUtils';
import {
  renderFoundationTargetIndicator,
  renderWallTargetIndicator,
  renderFenceTargetIndicator,
} from '../../utils/renderers/foundationRenderingUtils';
import { gameConfig, isPlayerMoving } from '../../config/gameConfig';
import { getTileTypeFromChunkData } from '../../utils/renderers/placementRenderingUtils';
import type { MutableRefObject } from 'react';

const LOCAL_DODGE_ROLL_VISUAL_DURATION_MS = 180;

interface RenderEntityWorldPassesOptions {
  ctx: CanvasRenderingContext2D;
  showFpsProfiler: boolean;
  ySortedEntities: any[];
  heroImageRef: any;
  heroSprintImageRef: any;
  heroIdleImageRef: any;
  heroWaterImageRef: any;
  heroCrouchImageRef: any;
  heroDodgeImageRef: any;
  lastPositionsRef: any;
  activeConnections: any;
  activeEquipments: Map<string, any>;
  activeConsumableEffects: Map<string, any>;
  itemDefinitions: Map<string, any>;
  inventoryItems: Map<string, any>;
  itemImagesRef: any;
  doodadImagesRef: any;
  shelterImageRef: any;
  currentWorldMouseX: number | null;
  currentWorldMouseY: number | null;
  localPlayerId?: string;
  currentAnimationFrame: number;
  currentSprintAnimationFrame: number;
  currentIdleAnimationFrame: number;
  nowMs: number;
  hoveredPlayerIds: Set<string>;
  handlePlayerHover: any;
  currentCycleProgress: number;
  localPredictedDodgeRollVisualState: any;
  localOptimisticDodgeRollStartMs: number;
  localOptimisticJumpPressMsRef: MutableRefObject<number>;
  renderPlayerCorpseFn: (props: any) => void;
  localPlayer: any;
  currentPredictedPosition: { x: number; y: number } | null;
  playerDodgeRollStates: Map<string, any>;
  remotePlayerInterpolation: any;
  localPlayerIsCrouching: boolean;
  rd: any;
  shelterClippingData: any;
  currentLocalFacingDirection?: string;
  allShadowsEnabled: boolean;
  isTreeFalling: any;
  getFallProgress: any;
  currentCameraOffsetX: number;
  currentCameraOffsetY: number;
  foundationTileImagesRef: any;
  wallCells: any;
  foundationCells: any;
  visibleFences: any;
  resolvedBuildingClusters: any;
  playerBuildingClusterId: any;
  connection: any;
  isSnorkeling: boolean;
  alwaysShowPlayerNames: boolean;
  playerStats: any;
  largeQuarries: any;
  detectedHotSprings: any;
  detectedQuarries: any;
  placementInfo: any;
  caribouBreedingData: any;
  walrusBreedingData: any;
  chunkWeather: any;
  seaTransitionTileLookup: Map<string, boolean>;
  waterTileLookup: Map<string, boolean>;
  swimmingPlayersForBottomHalf: any[];
  swimmingPlayerScratchRef: any;
  swimmingPlayerTopHalfScratchRef: any;
  visibleTrees: any[];
  worldTimeOfDay: any;
  visibleSeaStacks: any[];
  wildAnimals: any;
  canvasWidth: number;
  canvasHeight: number;
  targetedFoundation: any;
  targetedWall: any;
  targetedFence: any;
  hasRepairHammer: boolean;
}

export function renderEntityWorldPasses(options: RenderEntityWorldPassesOptions): { t3: number; t3a: number } {
  const {
    ctx,
    showFpsProfiler,
    ySortedEntities,
    heroImageRef,
    heroSprintImageRef,
    heroIdleImageRef,
    heroWaterImageRef,
    heroCrouchImageRef,
    heroDodgeImageRef,
    lastPositionsRef,
    activeConnections,
    activeEquipments,
    activeConsumableEffects,
    itemDefinitions,
    inventoryItems,
    itemImagesRef,
    doodadImagesRef,
    shelterImageRef,
    currentWorldMouseX,
    currentWorldMouseY,
    localPlayerId,
    currentAnimationFrame,
    currentSprintAnimationFrame,
    currentIdleAnimationFrame,
    nowMs,
    hoveredPlayerIds,
    handlePlayerHover,
    currentCycleProgress,
    localPredictedDodgeRollVisualState,
    localOptimisticDodgeRollStartMs,
    localOptimisticJumpPressMsRef,
    renderPlayerCorpseFn,
    localPlayer,
    currentPredictedPosition,
    playerDodgeRollStates,
    remotePlayerInterpolation,
    localPlayerIsCrouching,
    rd,
    shelterClippingData,
    currentLocalFacingDirection,
    allShadowsEnabled,
    isTreeFalling,
    getFallProgress,
    currentCameraOffsetX,
    currentCameraOffsetY,
    foundationTileImagesRef,
    wallCells,
    foundationCells,
    visibleFences,
    resolvedBuildingClusters,
    playerBuildingClusterId,
    connection,
    isSnorkeling,
    alwaysShowPlayerNames,
    playerStats,
    largeQuarries,
    detectedHotSprings,
    detectedQuarries,
    placementInfo,
    caribouBreedingData,
    walrusBreedingData,
    chunkWeather,
    seaTransitionTileLookup,
    waterTileLookup,
    swimmingPlayersForBottomHalf,
    swimmingPlayerScratchRef,
    swimmingPlayerTopHalfScratchRef,
    visibleTrees,
    worldTimeOfDay,
    visibleSeaStacks,
    wildAnimals,
    canvasWidth,
    canvasHeight,
    targetedFoundation,
    targetedWall,
    targetedFence,
    hasRepairHammer,
  } = options;

  const projectileCollisionCircles = buildProjectileCollisionCircles(ySortedEntities);
  const flushBatch = (batch: any[]) => {
    if (batch.length > 0) {
      const localOptimisticJumpPressMsSnapshot = localOptimisticJumpPressMsRef.current;
      renderYSortedEntities({
        ctx,
        ySortedEntities: batch,
        heroImageRef,
        heroSprintImageRef,
        heroIdleImageRef,
        heroWaterImageRef,
        heroCrouchImageRef,
        heroDodgeImageRef,
        lastPositionsRef,
        activeConnections,
        activeEquipments,
        activeConsumableEffects,
        itemDefinitions,
        inventoryItems,
        itemImagesRef,
        doodadImagesRef,
        shelterImage: shelterImageRef.current,
        worldMouseX: currentWorldMouseX,
        worldMouseY: currentWorldMouseY,
        localPlayerId,
        animationFrame: currentAnimationFrame,
        sprintAnimationFrame: currentSprintAnimationFrame,
        idleAnimationFrame: currentIdleAnimationFrame,
        nowMs,
        hoveredPlayerIds,
        onPlayerHover: handlePlayerHover,
        cycleProgress: currentCycleProgress,
        localPredictedDodgeRollVisualState,
        localOptimisticDodgeRollStartMs,
        localOptimisticDodgeRollDurationMs: LOCAL_DODGE_ROLL_VISUAL_DURATION_MS,
        localOptimisticJumpPressMs: localOptimisticJumpPressMsSnapshot,
        localOptimisticJumpPressMsRef,
        renderPlayerCorpse: renderPlayerCorpseFn,
        localPlayerPosition: currentPredictedPosition ?? { x: localPlayer?.positionX ?? 0, y: localPlayer?.positionY ?? 0 },
        playerDodgeRollStates,
        remotePlayerInterpolation,
        localPlayerIsCrouching,
        closestInteractableCampfireId: rd.closestInteractableCampfireId as number | null,
        closestInteractableBoxId: rd.closestInteractableBoxId as number | null,
        closestInteractableStashId: rd.closestInteractableStashId as number | null,
        closestInteractableSleepingBagId: rd.closestInteractableSleepingBagId as number | null,
        closestInteractableHarvestableResourceId: rd.closestInteractableHarvestableResourceId as bigint | null,
        closestInteractableDroppedItemId: rd.closestInteractableDroppedItemId as bigint | null,
        closestInteractableDoorId: rd.closestInteractableDoorId as bigint | null,
        closestInteractableTarget: rd.closestInteractableTarget,
        shelterClippingData,
        localFacingDirection: currentLocalFacingDirection,
        treeShadowsEnabled: allShadowsEnabled,
        allShadowsEnabled,
        isTreeFalling,
        getFallProgress,
        cameraOffsetX: currentCameraOffsetX,
        cameraOffsetY: currentCameraOffsetY,
        foundationTileImagesRef,
        allWalls: wallCells,
        allFoundations: foundationCells,
        allFences: visibleFences,
        buildingClusters: resolvedBuildingClusters,
        playerBuildingClusterId,
        connection,
        isLocalPlayerSnorkeling: isSnorkeling,
        alwaysShowPlayerNames,
        playerStats,
        largeQuarries,
        detectedHotSprings,
        detectedQuarries,
        placementInfo,
        caribouBreedingData,
        walrusBreedingData,
        chunkWeather,
        seaTransitionTileLookup,
        waterTileLookup,
        projectileCollisionCircles,
      });
    }
  };

  const renderSwimmingPlayerTopHalf = (item: { entity: any; playerId: string; yPosition: number }) => {
    const player = item.entity;
    const playerId = item.playerId;
    const isLocalTopHalf = playerId === localPlayerId;
    const lastPos = lastPositionsRef.current?.get(playerId);
    const moving = isPlayerMoving(lastPos, player.positionX, player.positionY);
    const currentAnimFrame = moving ? currentAnimationFrame : currentIdleAnimationFrame;
    const heroImg: HTMLImageElement | null = heroWaterImageRef.current || heroImageRef.current;

    if (heroImg) {
      const isOnline = activeConnections ? activeConnections.has(playerId) : false;
      const isHovered = currentWorldMouseX !== null && currentWorldMouseY !== null
        ? isPlayerHovered(currentWorldMouseX, currentWorldMouseY, player)
        : false;

      const equipment = activeEquipments.get(playerId);
      let itemDef: any = null;
      let itemImg: HTMLImageElement | null = null;

      if (equipment && equipment.equippedItemDefId) {
        const resolvedItemDef = itemDefinitions.get(equipment.equippedItemDefId.toString()) || null;
        if (isLocalTopHalf) {
          itemDef = resolvedItemDef;
          itemImg = (resolvedItemDef ? itemImagesRef.current.get(resolvedItemDef.iconAssetName) : null) || null;
        } else if (equipment.equippedItemInstanceId) {
          const equippedItemInstance = inventoryItems.get(equipment.equippedItemInstanceId.toString());
          if (equippedItemInstance && equippedItemInstance.quantity > 0) {
            itemDef = resolvedItemDef;
            itemImg = (resolvedItemDef ? itemImagesRef.current.get(resolvedItemDef.iconAssetName) : null) || null;
          }
        }
      }

      const canRenderItem = itemDef && itemImg && itemImg.complete && itemImg.naturalHeight !== 0;
      const itemBehindPlayer = player.direction === 'up' || player.direction === 'left';
      const renderSwimmingEquippedItem = () => {
        if (player.direction === 'up') {
          ctx.save();
          ctx.beginPath();
          ctx.rect(player.positionX - 2000, player.positionY - 2000, 4000, 2000);
          ctx.clip();
          renderEquippedItem(ctx, player, equipment!, itemDef!, itemDefinitions, itemImg!, nowMs, 0, itemImagesRef.current, activeConsumableEffects, localPlayerId, player.direction);
          ctx.restore();
        } else {
          renderEquippedItem(ctx, player, equipment!, itemDef!, itemDefinitions, itemImg!, nowMs, 0, itemImagesRef.current, activeConsumableEffects, localPlayerId, player.direction);
        }
      };

      if (itemBehindPlayer && canRenderItem && equipment) {
        renderSwimmingEquippedItem();
      }

      const topHsTileX = Math.floor(player.positionX / gameConfig.tileSize);
      const topHsTileY = Math.floor(player.positionY / gameConfig.tileSize);
      const topHsType = connection ? getTileTypeFromChunkData(connection, topHsTileX, topHsTileY) : null;
      const isSwimmingInHotSpringWater = topHsType === 'HotSpringWater';

      renderPlayer(
        ctx,
        player,
        heroImg,
        heroSprintImageRef.current || heroImg,
        heroIdleImageRef.current || heroImg,
        heroCrouchImageRef.current || heroImg,
        heroWaterImageRef.current || heroImageRef.current || heroImg,
        heroDodgeImageRef.current || heroImg,
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
        'top',
        false,
        0,
        false,
        isSnorkeling,
        undefined,
        true,
        undefined,
        isSwimmingInHotSpringWater,
      );

      lastPositionsRef.current?.set(playerId, { x: player.positionX, y: player.positionY });

      if (!itemBehindPlayer && canRenderItem && equipment) {
        renderSwimmingEquippedItem();
      }
    }
  };

  const renderedSwimmingTopHalfIds = new Set<string>();
  const renderTopHalfForPlayer = (sourcePlayer: any, sourcePlayerId: string, sourceY: number) => {
    const scratch = swimmingPlayerScratchRef.current;
    const topHalfScratch = swimmingPlayerTopHalfScratchRef.current;
    let playerForRendering: any = sourcePlayer;
    if (sourcePlayerId === localPlayerId && currentPredictedPosition) {
      Object.assign(scratch, sourcePlayer);
      scratch.positionX = currentPredictedPosition.x;
      scratch.positionY = currentPredictedPosition.y;
      scratch.direction = currentLocalFacingDirection ?? sourcePlayer.direction;
      playerForRendering = scratch;
    } else if (remotePlayerInterpolation) {
      const interp = remotePlayerInterpolation.updateAndGetSmoothedPosition(sourcePlayer, localPlayerId);
      Object.assign(scratch, sourcePlayer);
      scratch.positionX = interp.x;
      scratch.positionY = interp.y;
      playerForRendering = scratch;
    }
    topHalfScratch.entity = playerForRendering;
    topHalfScratch.playerId = sourcePlayerId;
    topHalfScratch.yPosition = sourceY;
    renderSwimmingPlayerTopHalf(topHalfScratch);
    renderedSwimmingTopHalfIds.add(sourcePlayerId);
  };

  let currentBatch: any[] = [];
  for (const item of ySortedEntities) {
    if (item.type === 'swimmingPlayerTopHalf') {
      flushBatch(currentBatch);
      currentBatch.length = 0;
      renderTopHalfForPlayer(item.entity, item.playerId, item.yPosition);
    } else {
      currentBatch.push(item);
    }
  }
  flushBatch(currentBatch);
  currentBatch.length = 0;

  for (const swimPlayer of swimmingPlayersForBottomHalf) {
    const swimPlayerId = swimPlayer.identity.toHexString();
    if (renderedSwimmingTopHalfIds.has(swimPlayerId)) continue;
    renderTopHalfForPlayer(swimPlayer, swimPlayerId, swimPlayer.positionY);
  }
  const t3 = mark(showFpsProfiler);

  if (visibleTrees && visibleTrees.length > 0 && allShadowsEnabled) {
    renderTreeCanopyShadowsOverlay(ctx, visibleTrees, nowMs, isTreeFalling, worldTimeOfDay, allShadowsEnabled);
  }
  if (allShadowsEnabled && !isSnorkeling && visibleSeaStacks && visibleSeaStacks.length > 0) {
    renderSeaStackShadowsOverlay(ctx, visibleSeaStacks, doodadImagesRef.current, currentCycleProgress);
  }
  const t3a = mark(showFpsProfiler);

  processWildAnimalsForBurrowEffects(wildAnimals, nowMs);
  renderBurrowEffects(ctx, nowMs);

  renderHotSprings(ctx, detectedHotSprings, -currentCameraOffsetX, -currentCameraOffsetY, canvasWidth, canvasHeight);

  if (isSnorkeling) {
    const tileSize = 48;
    const checkIsWaterTile = (worldX: number, worldY: number): boolean => {
      const tileX = Math.floor(worldX / tileSize);
      const tileY = Math.floor(worldY / tileSize);
      return waterTileLookup.get(`${tileX},${tileY}`) ?? false;
    };
    renderUnderwaterEffectsOver(
      ctx,
      -currentCameraOffsetX,
      -currentCameraOffsetY,
      canvasWidth,
      canvasHeight,
      nowMs,
      false,
      checkIsWaterTile,
    );
  }

  if (targetedFoundation && hasRepairHammer && !targetedWall) {
    renderFoundationTargetIndicator({
      ctx,
      foundation: targetedFoundation,
      worldScale: 1.0,
      viewOffsetX: -currentCameraOffsetX,
      viewOffsetY: -currentCameraOffsetY,
    });
  }
  if (targetedWall && hasRepairHammer) {
    renderWallTargetIndicator({
      ctx,
      wall: targetedWall,
      worldScale: 1.0,
      viewOffsetX: -currentCameraOffsetX,
      viewOffsetY: -currentCameraOffsetY,
    });
  }
  if (targetedFence && hasRepairHammer) {
    renderFenceTargetIndicator({
      ctx,
      fence: targetedFence,
      worldScale: 1.0,
      viewOffsetX: -currentCameraOffsetX,
      viewOffsetY: -currentCameraOffsetY,
    });
  }

  return { t3, t3a };
}
