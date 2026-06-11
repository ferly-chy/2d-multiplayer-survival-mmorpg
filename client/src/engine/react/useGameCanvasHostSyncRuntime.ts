import type {
  GameCanvasRuntimeAmbientEffectsSnapshot,
  GameCanvasRuntimeControllerSnapshot,
  GameCanvasRuntimeFrameBindings,
  GameCanvasRuntimeHost,
  GameCanvasRuntimeParticleSnapshot,
  GameCanvasRuntimeSceneSnapshot,
} from '../runtime/GameCanvasRuntimeHost';

interface UseGameCanvasHostSyncRuntimeOptions {
  host: GameCanvasRuntimeHost;
  sceneSnapshot: GameCanvasRuntimeSceneSnapshot;
  controllerSnapshot: GameCanvasRuntimeControllerSnapshot;
  particleSnapshot: GameCanvasRuntimeParticleSnapshot;
  ambientEffectsSnapshot: GameCanvasRuntimeAmbientEffectsSnapshot;
  frameBindings: GameCanvasRuntimeFrameBindings;
}

/**
 * React adapter that synchronizes the latest canvas runtime snapshots into the
 * non-React host before host-backed bridges consume them.
 */
export function useGameCanvasHostSyncRuntime({
  host,
  sceneSnapshot,
  controllerSnapshot,
  particleSnapshot,
  ambientEffectsSnapshot,
  frameBindings,
}: UseGameCanvasHostSyncRuntimeOptions): void {
  host.configureAmbientEffectsSnapshot(ambientEffectsSnapshot);
  host.configureSceneSnapshot(sceneSnapshot);
  host.configureControllerSnapshot(controllerSnapshot);
  host.configureParticleSnapshot(particleSnapshot);
  host.configureFrameBindings(frameBindings);
}
