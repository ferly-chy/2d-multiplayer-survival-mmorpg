/**
 * useGameplayBridgeRuntime - Gameplay-scoped manager assembly for the runtime bridge.
 *
 * Keeps interaction ownership, drag/drop, and interaction auto-close out of `App`
 * while preserving their existing hook implementations.
 */
import type { Identity } from 'spacetimedb';
import type { DbConnection } from '../../generated';
import { useDragDropManager } from '../../hooks/useDragDropManager';
import { useInteractionAutoClose } from '../../hooks/useInteractionAutoClose';
import { useInteractionManager } from '../../hooks/useInteractionManager';
import { useWorldTablesForInteractionAutoClose } from './selectors';

interface UseGameplayBridgeRuntimeOptions {
  connection: DbConnection | null;
  playerIdentity: Identity | null;
}

export interface GameplayBridgeRuntimeResult {
  interactingWith: ReturnType<typeof useInteractionManager>['interactingWith'];
  handleSetInteractingWith: ReturnType<typeof useInteractionManager>['handleSetInteractingWith'];
  draggedItemInfo: ReturnType<typeof useDragDropManager>['draggedItemInfo'];
  handleItemDragStart: ReturnType<typeof useDragDropManager>['handleItemDragStart'];
  handleItemDrop: ReturnType<typeof useDragDropManager>['handleItemDrop'];
}


export function useGameplayBridgeRuntime({
  connection,
  playerIdentity,
}: UseGameplayBridgeRuntimeOptions) {
  const { interactingWith, handleSetInteractingWith } = useInteractionManager(connection);
  const { draggedItemInfo, handleItemDragStart, handleItemDrop } = useDragDropManager({
    connection,
    interactingWith,
    playerIdentity,
  });
  const interactionAutoCloseTables = useWorldTablesForInteractionAutoClose();

  useInteractionAutoClose({
    interactingWith,
    handleSetInteractingWith,
    connectionIdentity: connection?.identity,
    ...interactionAutoCloseTables,
  });

  const runtimeValue: GameplayBridgeRuntimeResult = {
    interactingWith,
    handleSetInteractingWith,
    draggedItemInfo,
    handleItemDragStart,
    handleItemDrop,
  };

  return runtimeValue;
}
