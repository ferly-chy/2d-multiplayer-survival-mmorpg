import { useMemo } from 'react';

interface UseGameCanvasHostStateOptions {
  localPlayer: any;
  connection: any;
  isGameMenuOpen: boolean;
  placementInfo: any;
  deathMarkers: Map<string, any> | undefined;
  sleepingBags: Map<string, any>;
}

export function useGameCanvasHostState({
  localPlayer,
  connection,
  isGameMenuOpen,
  placementInfo,
  deathMarkers,
  sleepingBags,
}: UseGameCanvasHostStateOptions) {
  const shouldShowDeathScreen = !!(localPlayer?.isDead && connection);
  const cursorStyle = isGameMenuOpen ? 'default' : (placementInfo ? 'cell' : 'crosshair');

  const localPlayerDeathMarker = useMemo(() => {
    if (localPlayer?.identity && deathMarkers) {
      return deathMarkers.get(localPlayer.identity.toHexString()) || null;
    }
    return null;
  }, [localPlayer, deathMarkers]);

  const sleepingBagsById = useMemo(() => {
    const mapById = new Map<number, any>();
    sleepingBags.forEach((bag) => {
      mapById.set(bag.id, bag);
    });
    return mapById;
  }, [sleepingBags]);

  return {
    shouldShowDeathScreen,
    cursorStyle,
    localPlayerDeathMarker,
    sleepingBagsById,
  };
}
