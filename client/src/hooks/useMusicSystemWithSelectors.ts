/**
 * Composite hook: music system with selector-backed tables.
 * Replaces inline useEngineSnapshot + useMusicSystem wiring in App.
 */
import { useEffect } from 'react';
import { useMusicSystem } from './useMusicSystem';
import { useMusicSystemTables } from '../engine/selectors/useMusicSystemTables';
import { useLocalPlayer } from '../engine/selectors/useLocalPlayer';
import { useSettings } from '../contexts/SettingsContext';
import { getTileTypeFromChunkData } from '../utils/renderers/placementRenderingUtils';
import type { DbConnection } from '../generated';

export function useMusicSystemWithSelectors(
  connection: DbConnection | null,
  identityHex: string | null
) {
  const musicTables = useMusicSystemTables();
  const localPlayer = useLocalPlayer(identityHex);
  const { musicVolume } = useSettings();
  const playerPosition = localPlayer
    ? { x: localPlayer.positionX, y: localPlayer.positionY }
    : null;

  const musicSystem = useMusicSystem({
    enabled: true,
    volume: musicVolume,
    crossfadeDuration: 3000,
    shuffleMode: true,
    preloadAll: true,
    playerPosition,
    monumentParts: musicTables.monumentParts,
    alkStations: musicTables.alkStations,
    getTileTypeAtPosition: connection ? (tx, ty) => getTileTypeFromChunkData(connection, tx, ty) : undefined,
  });

  useEffect(() => {
    if (musicSystem.setVolume) musicSystem.setVolume(musicVolume);
  }, [musicVolume, musicSystem.setVolume]);

  return musicSystem;
}
