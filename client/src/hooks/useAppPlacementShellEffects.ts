import { useEffect, useRef } from 'react';

interface UseAppPlacementShellEffectsOptions {
  placementInfo: unknown;
  placementWarning: string | null;
  placementError: string | null;
  showError: (message: string) => void;
}

export function useAppPlacementShellEffects({
  placementInfo,
  placementWarning,
  placementError,
  showError,
}: UseAppPlacementShellEffectsOptions) {
  const placementInfoRef = useRef(placementInfo);

  useEffect(() => {
    placementInfoRef.current = placementInfo;
  }, [placementInfo]);

  useEffect(() => {
    const handleGlobalContextMenu = (event: MouseEvent) => {
      if (document.body.style.cursor === 'grabbing') {
        return;
      }

      if (!placementInfoRef.current) {
        event.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (document.body.style.cursor === 'grabbing') {
        return;
      }

      if (event.key === 'ContextMenu' && !placementInfoRef.current) {
        event.preventDefault();
      }
    };

    const handleGlobalContextMenu = (event: MouseEvent) => {
      if (document.body.style.cursor === 'grabbing') {
        return;
      }

      if (!placementInfoRef.current) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, []);

  const placementMessage = (placementWarning || placementError || '').trim() || null;

  useEffect(() => {
    if (placementMessage) {
      showError(placementMessage);
    }
  }, [placementMessage, showError]);
}
