import { useEffect } from 'react';
import type { Projectile as SpacetimeDBProjectile } from '../../generated/types';
import type { GameCanvasRuntimeHost } from '../runtime/GameCanvasRuntimeHost';

interface UseGameCanvasFrameRuntimeStateOptions {
  host: GameCanvasRuntimeHost;
  worldMousePos: { x: number | null; y: number | null };
  cameraOffsetX: number;
  cameraOffsetY: number;
  predictedPosition: { x: number; y: number } | null;
  localFacingDirection: string | undefined;
  interpolatedClouds: Map<string, any>;
  cycleProgress: number;
  ySortedEntities: any[];
  swimmingPlayersForBottomHalf: any[];
  messages: any;
  renderableProjectiles: Map<string, SpacetimeDBProjectile>;
  holdInteractionProgress: { targetId: string | number | bigint | null; targetType: string; startTime: number } | null;
  isActivelyHolding: boolean;
  closestInteractableHarvestableResourceId: bigint | null;
  closestInteractableCampfireId: number | bigint | null;
  closestInteractableDroppedItemId: number | bigint | null;
  closestInteractableBoxId: number | bigint | null;
  isClosestInteractableBoxEmpty: boolean;
  closestInteractableWaterPosition: { x: number; y: number } | null;
  closestInteractableStashId: number | bigint | null;
  closestInteractableSleepingBagId: number | bigint | null;
  closestInteractableDoorId: number | bigint | null;
  closestInteractableTarget: any;
  unifiedInteractableTarget: any;
  closestInteractableKnockedOutPlayerId: string | null;
  closestInteractableCorpseId: number | bigint | null;
  closestInteractableAlkStationId: number | bigint | null;
  closestInteractableCairnId: number | bigint | null;
  closestInteractableMilkableAnimalId: number | bigint | null;
}

export function useGameCanvasFrameRuntimeState({
  host,
  worldMousePos,
  cameraOffsetX,
  cameraOffsetY,
  predictedPosition,
  localFacingDirection,
  interpolatedClouds,
  cycleProgress,
  ySortedEntities,
  swimmingPlayersForBottomHalf,
  messages,
  renderableProjectiles,
  holdInteractionProgress,
  isActivelyHolding,
  closestInteractableHarvestableResourceId,
  closestInteractableCampfireId,
  closestInteractableDroppedItemId,
  closestInteractableBoxId,
  isClosestInteractableBoxEmpty,
  closestInteractableWaterPosition,
  closestInteractableStashId,
  closestInteractableSleepingBagId,
  closestInteractableDoorId,
  closestInteractableTarget,
  unifiedInteractableTarget,
  closestInteractableKnockedOutPlayerId,
  closestInteractableCorpseId,
  closestInteractableAlkStationId,
  closestInteractableCairnId,
  closestInteractableMilkableAnimalId,
}: UseGameCanvasFrameRuntimeStateOptions) {
  const {
    worldMousePosRef,
    cameraOffsetRef,
    predictedPositionRef,
    localFacingDirectionRef,
    interpolatedCloudsRef,
    cycleProgressRef,
    ySortedEntitiesRef,
    swimmingPlayersForBottomHalfRef,
    renderGameDepsRef,
  } = host.getControllerRefs();

  useEffect(() => {
    worldMousePosRef.current = worldMousePos;
  }, [worldMousePos, worldMousePosRef]);

  useEffect(() => {
    cameraOffsetRef.current = { x: cameraOffsetX, y: cameraOffsetY };
  }, [cameraOffsetX, cameraOffsetY, cameraOffsetRef]);

  useEffect(() => {
    predictedPositionRef.current = predictedPosition;
  }, [predictedPosition, predictedPositionRef]);

  useEffect(() => {
    localFacingDirectionRef.current = localFacingDirection;
  }, [localFacingDirection, localFacingDirectionRef]);

  useEffect(() => {
    interpolatedCloudsRef.current = interpolatedClouds;
  }, [interpolatedClouds, interpolatedCloudsRef]);

  useEffect(() => {
    cycleProgressRef.current = cycleProgress;
  }, [cycleProgress, cycleProgressRef]);

  useEffect(() => {
    ySortedEntitiesRef.current = ySortedEntities;
  }, [ySortedEntities, ySortedEntitiesRef]);

  useEffect(() => {
    const renderDeps = renderGameDepsRef.current;
    renderDeps.messages = messages;
    renderDeps.projectiles = renderableProjectiles;
    renderDeps.holdInteractionProgress = holdInteractionProgress;
    renderDeps.isActivelyHolding = isActivelyHolding;
    renderDeps.closestInteractableHarvestableResourceId = closestInteractableHarvestableResourceId;
    renderDeps.closestInteractableCampfireId = closestInteractableCampfireId;
    renderDeps.closestInteractableDroppedItemId = closestInteractableDroppedItemId;
    renderDeps.closestInteractableBoxId = closestInteractableBoxId;
    renderDeps.isClosestInteractableBoxEmpty = isClosestInteractableBoxEmpty;
    renderDeps.closestInteractableWaterPosition = closestInteractableWaterPosition;
    renderDeps.closestInteractableStashId = closestInteractableStashId;
    renderDeps.closestInteractableSleepingBagId = closestInteractableSleepingBagId;
    renderDeps.closestInteractableDoorId = closestInteractableDoorId;
    renderDeps.closestInteractableTarget = closestInteractableTarget;
    renderDeps.unifiedInteractableTarget = unifiedInteractableTarget;
    renderDeps.closestInteractableKnockedOutPlayerId = closestInteractableKnockedOutPlayerId;
    renderDeps.closestInteractableCorpseId = closestInteractableCorpseId;
    renderDeps.closestInteractableAlkStationId = closestInteractableAlkStationId;
    renderDeps.closestInteractableCairnId = closestInteractableCairnId;
    renderDeps.closestInteractableMilkableAnimalId = closestInteractableMilkableAnimalId;
  }, [
    messages,
    renderableProjectiles,
    holdInteractionProgress,
    isActivelyHolding,
    closestInteractableHarvestableResourceId,
    closestInteractableCampfireId,
    closestInteractableDroppedItemId,
    closestInteractableBoxId,
    isClosestInteractableBoxEmpty,
    closestInteractableWaterPosition,
    closestInteractableStashId,
    closestInteractableSleepingBagId,
    closestInteractableDoorId,
    closestInteractableTarget,
    unifiedInteractableTarget,
    closestInteractableKnockedOutPlayerId,
    closestInteractableCorpseId,
    closestInteractableAlkStationId,
    closestInteractableCairnId,
    closestInteractableMilkableAnimalId,
  ]);

  return { renderGameDepsRef };
}
