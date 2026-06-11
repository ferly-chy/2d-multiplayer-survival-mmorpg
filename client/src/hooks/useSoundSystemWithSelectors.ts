/**
 * Composite hook: sound system with selector-backed tables.
 * Replaces inline useEngineSnapshot + useSoundSystem wiring in App.
 */
import { useSoundSystem } from './useSoundSystem';
import { useSoundSystemTables } from '../engine/react/selectors/useSoundSystemTables';
import { useLocalPlayer } from '../engine/react/selectors/useLocalPlayer';
import { usePredictedPosition } from '../engine/react/selectors/usePredictedPosition';
import { useSettings } from '../contexts/SettingsContext';
import type { DbConnection } from '../generated';

export function useSoundSystemWithSelectors(
  connection: DbConnection | null,
  identityHex: string | null
) {
  const soundTables = useSoundSystemTables();
  const localPlayer = useLocalPlayer(identityHex);
  const serverPosition = localPlayer ? { x: localPlayer.positionX, y: localPlayer.positionY } : null;
  const predictedPosition = usePredictedPosition(serverPosition);
  const { soundVolume, environmentalVolume } = useSettings();

  return useSoundSystem({
    ...soundTables,
    currentSeason: soundTables.worldState?.currentSeason,
    localPlayerPosition: predictedPosition,
    localPlayerIdentity: connection?.identity ?? null,
    masterVolume: soundVolume,
    environmentalVolume,
  });
}
