import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEngineInputState } from '../react/useEngineStoreState';

const TAP_ARRIVAL_THRESHOLD = 16;

interface MovementInputState {
  direction: { x: number; y: number };
  sprinting: boolean;
}

interface UseGameplayMobileRuntimeOptions {
  isMobile: boolean;
  localPlayer: { positionX: number; positionY: number } | null | undefined;
  keyboardInputState: MovementInputState;
  connection: any | null;
}

export function useGameplayMobileRuntime({
  isMobile,
  localPlayer,
  keyboardInputState,
  connection,
}: UseGameplayMobileRuntimeOptions) {
  const tapAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tapTarget, setTapTarget] = useEngineInputState<{ x: number; y: number } | null>('tapTarget', () => null);
  const [tapAnimation, setTapAnimation] = useEngineInputState<{ x: number; y: number; startTime: number } | null>('tapAnimation', () => null);
  const [mobileSprintOverride, setMobileSprintOverride] = useEngineInputState<boolean | undefined>('mobileSprintOverride', () => undefined);

  const tapDirection = useMemo(() => {
    if (!isMobile || !tapTarget || !localPlayer) {
      return { x: 0, y: 0 };
    }

    const dx = tapTarget.x - localPlayer.positionX;
    const dy = tapTarget.y - localPlayer.positionY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= TAP_ARRIVAL_THRESHOLD) {
      return { x: 0, y: 0 };
    }

    return { x: dx / distance, y: dy / distance };
  }, [isMobile, tapTarget, localPlayer]);

  useEffect(() => {
    if (!isMobile || !tapTarget || !localPlayer) {
      return;
    }

    const dx = tapTarget.x - localPlayer.positionX;
    const dy = tapTarget.y - localPlayer.positionY;
    if (Math.sqrt(dx * dx + dy * dy) <= TAP_ARRIVAL_THRESHOLD) {
      setTapTarget(null);
    }
  }, [isMobile, tapTarget, localPlayer, setTapTarget]);

  useEffect(() => {
    return () => {
      if (tapAnimationTimeoutRef.current) {
        clearTimeout(tapAnimationTimeoutRef.current);
      }
    };
  }, []);

  const inputState = useMemo(() => {
    if (isMobile && (tapDirection.x !== 0 || tapDirection.y !== 0)) {
      return { direction: tapDirection, sprinting: keyboardInputState.sprinting };
    }
    return keyboardInputState;
  }, [isMobile, tapDirection, keyboardInputState]);

  const handleMobileTap = useCallback((worldX: number, worldY: number) => {
    if (!isMobile) {
      return;
    }

    setTapTarget({ x: worldX, y: worldY });
    setTapAnimation({ x: worldX, y: worldY, startTime: performance.now() });

    if (tapAnimationTimeoutRef.current) {
      clearTimeout(tapAnimationTimeoutRef.current);
    }

    tapAnimationTimeoutRef.current = setTimeout(() => {
      setTapAnimation(null);
      tapAnimationTimeoutRef.current = null;
    }, 500);
  }, [isMobile, setTapAnimation, setTapTarget]);

  useEffect(() => {
    if (isMobile) {
      setMobileSprintOverride(true);
      try {
        connection?.reducers?.setSprinting?.({ sprinting: true });
      } catch {
        // Ignore reducer availability issues during partial startup.
      }
      return;
    }

    setTapTarget(null);
    setTapAnimation(null);
    setMobileSprintOverride(undefined);
  }, [connection, isMobile, setMobileSprintOverride, setTapAnimation, setTapTarget]);

  return {
    inputState,
    tapAnimation,
    mobileSprintOverride,
    setMobileSprintOverride,
    handleMobileTap,
  };
}
