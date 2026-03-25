import type { GameCanvasRuntimeControllerSnapshot, GameCanvasRuntimeHost } from './GameCanvasRuntimeHost';

interface AssembleGameCanvasControllerSnapshotOptions {
  host: GameCanvasRuntimeHost;
  buildState: Record<string, any>;
  interactionRuntime: Record<string, any>;
  upgradeMenuState: Record<string, any>;
  hostState: Record<string, any>;
}

export function assembleGameCanvasControllerSnapshot({
  host,
  buildState,
  interactionRuntime,
  upgradeMenuState,
  hostState,
}: AssembleGameCanvasControllerSnapshotOptions): GameCanvasRuntimeControllerSnapshot {
  return {
    ...buildState,
    ...interactionRuntime,
    ...upgradeMenuState,
    ...hostState,
    ...host.getControllerRefs(),
  } as GameCanvasRuntimeControllerSnapshot;
}
