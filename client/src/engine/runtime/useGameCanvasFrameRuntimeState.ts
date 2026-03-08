import { useEffect, useRef } from 'react';
import type { Projectile as SpacetimeDBProjectile } from '../../generated/types';

interface UseGameCanvasFrameRuntimeStateOptions {
  worldMousePos: { x: number | null; y: number | null };
  worldMousePosRef: React.MutableRefObject<{ x: number | null; y: number | null }>;
  cameraOffsetX: number;
  cameraOffsetY: number;
  cameraOffsetRef: React.MutableRefObject<{ x: number; y: number }>;
  predictedPosition: { x: number; y: number } | null;
  predictedPositionRef: React.MutableRefObject<{ x: number; y: number } | null>;
  localFacingDirection: string | undefined;
  localFacingDirectionRef: React.MutableRefObject<string | undefined>;
  interpolatedClouds: Map<string, any>;
  interpolatedCloudsRef: React.MutableRefObject<Map<string, any>>;
  cycleProgress: number;
  cycleProgressRef: React.MutableRefObject<number>;
  ySortedEntities: any[];
  ySortedEntitiesRef: React.MutableRefObject<any[]>;
  swimmingPlayersForBottomHalf: any[];
  swimmingPlayersForBottomHalfRef: React.MutableRefObject<any[]>;
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
  worldMousePos,
  worldMousePosRef,
  cameraOffsetX,
  cameraOffsetY,
  cameraOffsetRef,
  predictedPosition,
  predictedPositionRef,
  localFacingDirection,
  localFacingDirectionRef,
  interpolatedClouds,
  interpolatedCloudsRef,
  cycleProgress,
  cycleProgressRef,
  ySortedEntities,
  ySortedEntitiesRef,
  swimmingPlayersForBottomHalf,
  swimmingPlayersForBottomHalfRef,
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
  const renderGameDepsRef = useRef({
    messages: new Map(),
    projectiles: new Map<string, SpacetimeDBProjectile>(),
    holdInteractionProgress: null as { targetId: string | number | bigint | null; targetType: string; startTime: number } | null,
    isActivelyHolding: false,
    closestInteractableHarvestableResourceId: null as bigint | null,
    closestInteractableCampfireId: null as number | bigint | null,
    closestInteractableDroppedItemId: null as number | bigint | null,
    closestInteractableBoxId: null as number | bigint | null,
    isClosestInteractableBoxEmpty: false,
    closestInteractableWaterPosition: null as { x: number; y: number } | null,
    closestInteractableStashId: null as number | bigint | null,
    closestInteractableSleepingBagId: null as number | bigint | null,
    closestInteractableDoorId: null as number | bigint | null,
    closestInteractableTarget: null as any,
    unifiedInteractableTarget: null as any,
    closestInteractableKnockedOutPlayerId: null as string | null,
    closestInteractableCorpseId: null as number | bigint | null,
    closestInteractableAlkStationId: null as number | bigint | null,
    closestInteractableCairnId: null as number | bigint | null,
    closestInteractableMilkableAnimalId: null as number | bigint | null,
  });

  ySortedEntitiesRef.current = ySortedEntities;
  swimmingPlayersForBottomHalfRef.current = swimmingPlayersForBottomHalf;

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
