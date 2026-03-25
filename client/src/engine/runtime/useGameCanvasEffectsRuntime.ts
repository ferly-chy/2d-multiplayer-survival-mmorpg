import { useGameCanvasEnvironmentRuntime } from './useGameCanvasEnvironmentRuntime';
import { useGameCanvasRuntimeEffects } from './useGameCanvasRuntimeEffects';
import type { GameCanvasRuntimeHost } from './GameCanvasRuntimeHost';

/**
 * Temporary React adapter for canvas effects state.
 *
 * Particle production now lives in `useGameCanvasParticleRuntime()` so the host
 * can consume a render-focused effects surface. This adapter is narrowed to the
 * remaining hook-side ambient/runtime effects that still need explicit host
 * services before they can move out of React.
 */
const EMPTY_MAP = new Map<string, any>();
const EMPTY_WORLD_MOUSE_POS = { x: null, y: null } as const;
const NOOP_SHOW_ERROR = () => {};

interface UseGameCanvasEffectsRuntimeOptions {
  host: GameCanvasRuntimeHost;
}

export function useGameCanvasEffectsRuntime({
  host,
}: UseGameCanvasEffectsRuntimeOptions) {
  const ambientEffectsSnapshot = host.getAmbientEffectsSnapshot();
  const sceneRuntime = host.getSceneSnapshot();
  const controllerRuntime = host.getControllerSnapshot();

  useGameCanvasRuntimeEffects({
    connection: ambientEffectsSnapshot?.connection ?? null,
    localPlayer: ambientEffectsSnapshot?.localPlayer ?? null,
    predictedPosition: ambientEffectsSnapshot?.predictedPosition ?? null,
    worldMousePos: controllerRuntime?.worldMousePos ?? EMPTY_WORLD_MOUSE_POS,
    localPlayerId: ambientEffectsSnapshot?.localPlayerId,
    activeConsumableEffects: sceneRuntime?.activeConsumableEffects ?? EMPTY_MAP,
    isAutoAttacking: controllerRuntime?.isAutoAttacking ?? false,
    onAutoActionStatesChange: ambientEffectsSnapshot?.onAutoActionStatesChange,
    showError: ambientEffectsSnapshot?.showError ?? NOOP_SHOW_ERROR,
  });

  useGameCanvasEnvironmentRuntime({
    connection: ambientEffectsSnapshot?.connection ?? null,
    cameraX: ambientEffectsSnapshot?.cameraOffsetX ?? 0,
    cameraY: ambientEffectsSnapshot?.cameraOffsetY ?? 0,
    canvasWidth: ambientEffectsSnapshot?.canvasSize.width ?? 0,
    canvasHeight: ambientEffectsSnapshot?.canvasSize.height ?? 0,
    localPlayer: ambientEffectsSnapshot?.localPlayer ?? null,
    chunkWeather: sceneRuntime?.chunkWeather ?? EMPTY_MAP,
    activeConsumableEffects: sceneRuntime?.activeConsumableEffects ?? EMPTY_MAP,
    localPlayerId: ambientEffectsSnapshot?.localPlayerId,
    worldState: sceneRuntime?.worldState ?? null,
    distanceToShore: sceneRuntime?.distanceToShore ?? 0,
    distanceToMapEdge: sceneRuntime?.distanceToMapEdge ?? 0,
    visibleWildAnimalsMap: sceneRuntime?.visibleWildAnimalsMap ?? EMPTY_MAP,
    environmentalVolume: ambientEffectsSnapshot?.environmentalVolume,
  });
}
