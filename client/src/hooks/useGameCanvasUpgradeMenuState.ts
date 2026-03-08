import { useEffect, useRef } from 'react';
import type { FoundationCell } from '../generated/types';

interface UseGameCanvasUpgradeMenuStateOptions {
  showUpgradeRadialMenu: boolean;
  targetedFoundation: FoundationCell | null;
  targetedWall: any | null;
  targetedFence: any | null;
}

export function useGameCanvasUpgradeMenuState({
  showUpgradeRadialMenu,
  targetedFoundation,
  targetedWall,
  targetedFence,
}: UseGameCanvasUpgradeMenuStateOptions) {
  const upgradeMenuFoundationRef = useRef<FoundationCell | null>(null);
  const upgradeMenuWallRef = useRef<any | null>(null);
  const upgradeMenuFenceRef = useRef<any | null>(null);
  const prevShowUpgradeRadialMenuRef = useRef(false);

  useEffect(() => {
    const wasOpen = prevShowUpgradeRadialMenuRef.current;
    const isOpen = showUpgradeRadialMenu;

    if (!wasOpen && isOpen) {
      if (targetedWall) {
        upgradeMenuWallRef.current = targetedWall;
        upgradeMenuFoundationRef.current = null;
        upgradeMenuFenceRef.current = null;
      } else if (targetedFence) {
        upgradeMenuFenceRef.current = targetedFence;
        upgradeMenuFoundationRef.current = null;
        upgradeMenuWallRef.current = null;
      } else if (targetedFoundation) {
        upgradeMenuFoundationRef.current = targetedFoundation;
        upgradeMenuWallRef.current = null;
        upgradeMenuFenceRef.current = null;
      }
    } else if (!isOpen) {
      upgradeMenuFoundationRef.current = null;
      upgradeMenuWallRef.current = null;
      upgradeMenuFenceRef.current = null;
    }

    prevShowUpgradeRadialMenuRef.current = isOpen;
  }, [showUpgradeRadialMenu, targetedFence, targetedFoundation, targetedWall]);

  return {
    upgradeMenuFoundationRef,
    upgradeMenuWallRef,
    upgradeMenuFenceRef,
  };
}
