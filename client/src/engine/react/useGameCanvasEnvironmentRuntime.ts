import { useEffect } from 'react';
import type { ActiveConsumableEffect, Season, TimeOfDay, WeatherType } from '../../generated/types';
import { useAmbientSounds } from '../../hooks/useAmbientSounds';
import { useChunkBasedRainSounds } from '../../hooks/useChunkBasedRainSounds';
import { useThunderEffects } from '../../hooks/useThunderEffects';
import { useViewportSync } from '../../hooks/useViewportSync';

interface UseGameCanvasEnvironmentRuntimeOptions {
  connection: any | null;
  cameraX: number;
  cameraY: number;
  canvasWidth: number;
  canvasHeight: number;
  localPlayer: any;
  chunkWeather: Map<string, any>;
  activeConsumableEffects: Map<string, ActiveConsumableEffect>;
  localPlayerId?: string;
  worldState: {
    timeOfDay?: TimeOfDay;
    currentWeather?: WeatherType;
    currentSeason?: Season;
  } | null;
  distanceToShore: number;
  distanceToMapEdge: number;
  visibleWildAnimalsMap: Map<string, any>;
  environmentalVolume?: number;
}

export function useGameCanvasEnvironmentRuntime({
  connection,
  cameraX,
  cameraY,
  canvasWidth,
  canvasHeight,
  localPlayer,
  chunkWeather,
  activeConsumableEffects,
  localPlayerId,
  worldState,
  distanceToShore,
  distanceToMapEdge,
  visibleWildAnimalsMap,
  environmentalVolume,
}: UseGameCanvasEnvironmentRuntimeOptions) {
  useViewportSync(connection, cameraX, cameraY, canvasWidth, canvasHeight);
  useThunderEffects({ connection, localPlayer });
  useChunkBasedRainSounds({ connection, localPlayer, chunkWeather });

  const ambientSoundSystem = useAmbientSounds({
    masterVolume: 1.0,
    environmentalVolume: environmentalVolume ?? 0.7,
    timeOfDay: worldState?.timeOfDay,
    weatherCondition: worldState?.currentWeather,
    chunkWeather,
    localPlayer,
    activeConsumableEffects,
    localPlayerId,
    isUnderwater: localPlayer?.isSnorkeling ?? false,
    currentSeason: worldState?.currentSeason,
    isIndoors: localPlayer?.isInsideBuilding ?? false,
    distanceToShore,
    distanceToMapEdge,
    wildAnimals: visibleWildAnimalsMap,
  });

  useEffect(() => {
    (window as any).testAmbientVariants = ambientSoundSystem.testAllVariants;
    return () => {
      delete (window as any).testAmbientVariants;
    };
  }, [ambientSoundSystem.testAllVariants]);
}
