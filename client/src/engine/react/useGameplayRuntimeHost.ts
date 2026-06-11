import { useRef, useCallback } from 'react';
import type { Identity } from 'spacetimedb';
import type { DbConnection } from '../../generated';
import type { PlacementItemInfo, PlacementActions } from '../../hooks/usePlacementManager';
import { useMovementInput } from '../../hooks/useMovementInput';
import { usePredictedMovement } from '../../hooks/usePredictedMovement';
import { usePlayerActions } from '../../contexts/PlayerActionsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useSoundSystemWithSelectors } from '../../hooks/useSoundSystemWithSelectors';
import { getTileTypeFromChunkData, worldPosToTileCoords } from '../../utils/renderers/placementRenderingUtils';
import { isWaterTileTag } from '../../utils/tileTypeGuards';
import {
  useLocalPlayer,
  useEquipmentMovementModifiers,
  useCollisionEntities,
} from './selectors';
import { useEngineSnapshot } from './useEngineSnapshot';
import { useEngineInputState } from './useEngineStoreState';
import { useGameplayBridgeRuntime } from './useGameplayBridgeRuntime';
import { useGameplaySessionRuntime } from './useGameplaySessionRuntime';
import { useGameplayMobileRuntime } from './useGameplayMobileRuntime';

const EMPTY_MAP = new Map();

interface UseGameplayRuntimeHostOptions {
  localPlayerId?: string;
  playerIdentity: Identity | null;
  connection: DbConnection | null;
}

export function useGameplayRuntimeHost({
  localPlayerId,
  playerIdentity,
  connection,
}: UseGameplayRuntimeHostOptions) {
  const identityHex = playerIdentity ? playerIdentity.toHexString() : null;
  const localPlayer = useLocalPlayer(identityHex);
  const { waterSpeedBonus, movementSpeedModifier } = useEquipmentMovementModifiers(identityHex);
  const collisionEntities = useCollisionEntities();
  const playerDodgeRollStates = useEngineSnapshot(
    (s) => (s.world.tables.playerDodgeRollStates as Map<string, unknown>) ?? EMPTY_MAP,
  );
  const { toggleAutoAttack } = usePlayerActions();
  const { fixedSimulationEnabled } = useSettings();
  const isMobile = useMobileDetection();
  const soundSystem = useSoundSystemWithSelectors(connection, identityHex);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFishing, setIsFishing] = useEngineInputState<boolean>('isFishing', () => false);

  const interactionRuntime = useGameplayBridgeRuntime({
    connection,
    playerIdentity,
  });

  const sessionRuntime = useGameplaySessionRuntime({
    localPlayerId,
  });

  const isUIFocused =
    sessionRuntime.gameUIValue.isChatting ||
    sessionRuntime.gameUIValue.isCraftingSearchFocused ||
    sessionRuntime.isMobileChatOpen ||
    sessionRuntime.showInventoryState ||
    sessionRuntime.showCraftingScreenState;
  const isDead = localPlayer?.isDead ?? false;

  const {
    inputState: keyboardInputState,
    inputStateRef: keyboardInputStateRef,
    isAutoWalking,
  } = useMovementInput({
    isUIFocused: isUIFocused || isDead,
    localPlayer,
    onToggleAutoAttack: toggleAutoAttack,
    isFishing,
  });

  const {
    inputState,
    tapAnimation,
    mobileSprintOverride,
    setMobileSprintOverride,
    handleMobileTap,
  } = useGameplayMobileRuntime({
    isMobile,
    localPlayer,
    keyboardInputState,
    connection,
  });

  const isOnSeaTileForCollision = useCallback((worldX: number, worldY: number): boolean => {
    if (!connection) {
      return false;
    }
    const { tileX, tileY } = worldPosToTileCoords(worldX, worldY);
    const tileType = getTileTypeFromChunkData(connection, tileX, tileY);
    return isWaterTileTag(tileType);
  }, [connection]);

  const predictedMovement = usePredictedMovement({
    localPlayer,
    inputState,
    inputStateRef: isMobile ? undefined : keyboardInputStateRef,
    connection,
    isUIFocused,
    playerDodgeRollStates,
    mobileSprintOverride,
    waterSpeedBonus,
    movementSpeedModifier,
    entities: collisionEntities,
    isOnSeaTile: isOnSeaTileForCollision,
    fixedSimulationEnabled,
  });

  return {
    localPlayer,
    soundSystem,
    canvasRef,
    isFishing,
    setIsFishing,
    interactionRuntime,
    sessionRuntime,
    inputState,
    isAutoWalking,
    predictedMovement,
    isMobile,
    tapAnimation,
    handleMobileTap,
    mobileSprintOverride,
    setMobileSprintOverride,
  };
}
