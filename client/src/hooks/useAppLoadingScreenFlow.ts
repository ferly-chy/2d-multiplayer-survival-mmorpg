import { useEffect, useMemo, useRef } from 'react';

interface UseAppLoadingScreenFlowOptions {
  connectionError: unknown;
  isAuthenticated: boolean;
  dbIdentity: { toHexString(): string } | null;
  loggedInPlayer: { username: string; seenTutorialIds?: string[] } | null | undefined;
  authLoading: boolean;
  spacetimeLoading: boolean;
  connection: unknown;
  musicSystem: {
    isPlaying: boolean;
    isLoading?: boolean;
    preloadProgress: number;
    start: () => Promise<void>;
    stop: () => void;
  };
  revealSovaSoundBoxUI: () => void;
}

export function useAppLoadingScreenFlow({
  connectionError,
  isAuthenticated,
  dbIdentity,
  loggedInPlayer,
  authLoading,
  spacetimeLoading,
  connection,
  musicSystem,
  revealSovaSoundBoxUI,
}: UseAppLoadingScreenFlowOptions) {
  const musicStartRequestedRef = useRef(false);

  useEffect(() => {
    if (loggedInPlayer && dbIdentity) {
      localStorage.setItem('lastKnownPlayerInfo', JSON.stringify({
        identity: dbIdentity.toHexString(),
        username: loggedInPlayer.username,
        lastStored: Date.now(),
      }));
    }
  }, [loggedInPlayer, dbIdentity]);

  const storedUsername = useMemo(() => {
    if (!connectionError || !isAuthenticated || !dbIdentity) {
      return null;
    }

    const stored = localStorage.getItem('lastKnownPlayerInfo');
    if (!stored) {
      return null;
    }

    try {
      const playerInfo = JSON.parse(stored);
      if (
        playerInfo.identity === dbIdentity.toHexString() &&
        (Date.now() - playerInfo.lastStored) < 7 * 24 * 60 * 60 * 1000
      ) {
        return playerInfo.username;
      }
    } catch (e) {
      console.warn('[App] Failed to parse stored player info:', e);
    }

    return null;
  }, [connectionError, dbIdentity, isAuthenticated]);

  const isSpacetimeReady = !spacetimeLoading && !!connection && !!dbIdentity;
  const hasPlayerDataOrUsername = loggedInPlayer || storedUsername;

  useEffect(() => {
    if (!isAuthenticated) {
      musicStartRequestedRef.current = false;
      return;
    }

    if (authLoading || !isSpacetimeReady || !hasPlayerDataOrUsername) {
      return;
    }

    revealSovaSoundBoxUI();

    if (!musicSystem.isPlaying && !musicStartRequestedRef.current) {
      musicStartRequestedRef.current = true;
      console.log('[App] Starting background music after game readiness...');
      musicSystem.start().catch((error) => {
        musicStartRequestedRef.current = false;
        console.warn('[App] Failed to start music:', error);
      });
    }
  }, [
    authLoading,
    hasPlayerDataOrUsername,
    isAuthenticated,
    isSpacetimeReady,
    musicSystem,
    revealSovaSoundBoxUI,
  ]);

  useEffect(() => {
    console.log(
      `[App] isSpacetimeReady changed to: ${isSpacetimeReady} (spacetimeLoading: ${spacetimeLoading}, connection: ${!!connection}, dbIdentity: ${!!dbIdentity})`,
    );
  }, [isSpacetimeReady, spacetimeLoading, connection, dbIdentity]);

  return {
    storedUsername,
    isSpacetimeReady,
  };
}
