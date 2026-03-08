import { useEffect, useRef } from 'react';
import type { Projectile as SpacetimeDBProjectile } from '../generated/types';

interface UseGameCanvasRenderDependencyRefsOptions {
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

export function useGameCanvasRenderDependencyRefs({
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
}: UseGameCanvasRenderDependencyRefsOptions) {
  const renderGameDepsRef = useRef<{
    messages: any;
    projectiles: Map<string, SpacetimeDBProjectile>;
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
  }>({
    messages: new Map(),
    projectiles: new Map(),
    holdInteractionProgress: null,
    isActivelyHolding: false,
    closestInteractableHarvestableResourceId: null,
    closestInteractableCampfireId: null,
    closestInteractableDroppedItemId: null,
    closestInteractableBoxId: null,
    isClosestInteractableBoxEmpty: false,
    closestInteractableWaterPosition: null,
    closestInteractableStashId: null,
    closestInteractableSleepingBagId: null,
    closestInteractableDoorId: null,
    closestInteractableTarget: null,
    unifiedInteractableTarget: null,
    closestInteractableKnockedOutPlayerId: null,
    closestInteractableCorpseId: null,
    closestInteractableAlkStationId: null,
    closestInteractableCairnId: null,
    closestInteractableMilkableAnimalId: null,
  });

  useEffect(() => {
    const d = renderGameDepsRef.current;
    d.messages = messages;
    d.projectiles = renderableProjectiles;
    d.holdInteractionProgress = holdInteractionProgress;
    d.isActivelyHolding = isActivelyHolding;
    d.closestInteractableHarvestableResourceId = closestInteractableHarvestableResourceId;
    d.closestInteractableCampfireId = closestInteractableCampfireId;
    d.closestInteractableDroppedItemId = closestInteractableDroppedItemId;
    d.closestInteractableBoxId = closestInteractableBoxId;
    d.isClosestInteractableBoxEmpty = isClosestInteractableBoxEmpty;
    d.closestInteractableWaterPosition = closestInteractableWaterPosition;
    d.closestInteractableStashId = closestInteractableStashId;
    d.closestInteractableSleepingBagId = closestInteractableSleepingBagId;
    d.closestInteractableDoorId = closestInteractableDoorId;
    d.closestInteractableTarget = closestInteractableTarget;
    d.unifiedInteractableTarget = unifiedInteractableTarget;
    d.closestInteractableKnockedOutPlayerId = closestInteractableKnockedOutPlayerId;
    d.closestInteractableCorpseId = closestInteractableCorpseId;
    d.closestInteractableAlkStationId = closestInteractableAlkStationId;
    d.closestInteractableCairnId = closestInteractableCairnId;
    d.closestInteractableMilkableAnimalId = closestInteractableMilkableAnimalId;
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
