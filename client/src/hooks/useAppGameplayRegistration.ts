import { useCallback, useEffect, useState } from 'react';

interface UseAppGameplayRegistrationOptions {
  registerPlayer: (username: string) => Promise<void>;
  isAuthenticated: boolean;
  spacetimeConnected: boolean;
  spacetimeToken: string | null | undefined;
  connection: any;
  dbIdentity: any;
  spacetimeLoading: boolean;
  localPlayerRegistered: boolean;
  loggedInPlayer: { username: string } | null | undefined;
}

export function useAppGameplayRegistration({
  registerPlayer,
  isAuthenticated,
  spacetimeConnected,
  spacetimeToken,
  connection,
  dbIdentity,
  spacetimeLoading,
  localPlayerRegistered,
  loggedInPlayer,
}: UseAppGameplayRegistrationOptions) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    if (localPlayerRegistered && isRegistering) {
      setIsRegistering(false);
    }
  }, [localPlayerRegistered, isRegistering]);

  const handleAttemptRegisterPlayer = useCallback(async (usernameToRegister: string | null): Promise<void> => {
    setUiError(null);

    if (!isAuthenticated) {
      console.error('SECURITY: Attempted player registration without proper authentication.');
      throw new Error('Authentication required. Please sign in to access the game.');
    }

    if (!spacetimeToken) {
      console.error('SECURITY: No valid SpacetimeDB token available for registration.');
      throw new Error('Authentication error, please sign out and sign in again.');
    }

    if (!connection) {
      console.error('SECURITY: No valid SpacetimeDB connection for registration.');
      throw new Error(
        spacetimeLoading
          ? 'Connecting to game servers, please wait...'
          : 'Please refresh your browser to re-establish connection.',
      );
    }

    if (!dbIdentity) {
      console.warn('SpacetimeDB identity not yet established, waiting for connection to complete...');
      throw new Error('Establishing connection, please wait a moment...');
    }

    if (!spacetimeConnected) {
      console.warn('SpacetimeDB connection status is false, but proceeding with registration attempt since user is authenticated and has connection identity.');
    }

    if (!usernameToRegister || !usernameToRegister.trim()) {
      if (!loggedInPlayer) {
        const errorMessage = 'Username cannot be empty.';
        setUiError(errorMessage);
        throw new Error(errorMessage);
      }
    }

    if (isRegistering) {
      console.warn('Registration already in progress, ignoring duplicate request.');
      return;
    }

    setIsRegistering(true);
    try {
      const usernameToSend = usernameToRegister?.trim() || loggedInPlayer?.username || 'Player';
      await registerPlayer(usernameToSend);
    } catch (error) {
      setIsRegistering(false);
      throw error;
    }
  }, [
    connection,
    dbIdentity,
    isAuthenticated,
    isRegistering,
    loggedInPlayer,
    registerPlayer,
    spacetimeConnected,
    spacetimeLoading,
    spacetimeToken,
  ]);

  return {
    isRegistering,
    uiError,
    handleAttemptRegisterPlayer,
  };
}
