/**
 * Per-frame GPU fire/smoke emitters for lit torches (same WebGL path as campfires).
 */

import type {
  ActiveEquipment as SpacetimeDBActiveEquipment,
  ItemDefinition as SpacetimeDBItemDefinition,
  Player as SpacetimeDBPlayer,
} from '../../generated/types';
import type { CampfireFireGpuEmitter } from './campfireFireOverlayUtils';
import { isCampfireFireWebGLOverlayAvailable } from './campfireFireOverlayUtils';
import { deleteCampfireGpuFire01, pruneTorchGpuFireKeysNotIn } from './campfireGpuFireSmoothing';
import { getTorchGpuFlameAnchorWorld } from './torchFlameAnchorWorldUtils';

const TORCH_GPU_OVERLAY_SCALE = 0.5;
const TORCH_GPU_SMOKE_PLUME_REACH01 = 0.42;

function torchIdKey(playerMapKey: string): string {
  return `torch_${playerMapKey}`;
}

export interface BuildTorchFireGpuOverlayEmittersParams {
  players: Map<string, SpacetimeDBPlayer>;
  activeEquipments: Map<string, SpacetimeDBActiveEquipment>;
  itemDefinitions: Map<string, SpacetimeDBItemDefinition>;
  localPlayerId: string | undefined;
  /** Client-predicted facing (same frame as canvas); avoids server direction lag for local torch. */
  localFacingDirection: string | undefined;
  localPredictedPosition: { x: number; y: number } | null | undefined;
  remotePlayerInterpolation: {
    updateAndGetSmoothedPosition: (player: SpacetimeDBPlayer, localId: string) => { x: number; y: number } | null;
  } | null;
  nowMs: number;
}

export function buildTorchFireGpuOverlayEmitters(
  params: BuildTorchFireGpuOverlayEmittersParams,
): CampfireFireGpuEmitter[] {
  if (!isCampfireFireWebGLOverlayAvailable()) {
    return [];
  }

  const {
    players,
    activeEquipments,
    itemDefinitions,
    localPlayerId,
    localFacingDirection,
    localPredictedPosition,
    remotePlayerInterpolation,
    nowMs,
  } = params;

  const out: CampfireFireGpuEmitter[] = [];
  const activePlayerKeys = new Set<string>();

  players.forEach((player, playerId) => {
    activePlayerKeys.add(playerId);

    const idKey = torchIdKey(playerId);

    if (!player || player.isDead) {
      deleteCampfireGpuFire01(idKey);
      return;
    }

    const equipment = activeEquipments.get(playerId);
    const itemDefId = equipment?.equippedItemDefId;
    const itemDef = itemDefId ? itemDefinitions.get(itemDefId.toString()) : null;
    const isLitTorch = !!(itemDef && itemDef.name === 'Torch' && player.isTorchLit);

    let worldX = player.positionX;
    let worldY = player.positionY;
    if (localPlayerId && playerId === localPlayerId && localPredictedPosition) {
      worldX = localPredictedPosition.x;
      worldY = localPredictedPosition.y;
    } else if (localPlayerId && playerId !== localPlayerId && remotePlayerInterpolation) {
      const ip = remotePlayerInterpolation.updateAndGetSmoothedPosition(player, localPlayerId);
      if (ip) {
        worldX = ip.x;
        worldY = ip.y;
      }
    }

    const directionForTorch =
      localPlayerId && playerId === localPlayerId
        ? localFacingDirection ?? player.direction ?? 'down'
        : player.direction ?? 'down';

    const anchor = getTorchGpuFlameAnchorWorld({
      worldX,
      worldY,
      direction: directionForTorch,
      jumpStartTimeMs: player.jumpStartTimeMs,
      swingStartTimeMs: Number(equipment?.swingStartTimeMs ?? 0),
      nowMs,
    });

    if (!isLitTorch) {
      deleteCampfireGpuFire01(idKey);
      return;
    }

    out.push({
      anchorX: anchor.x,
      anchorY: anchor.y,
      fireAmt: 1,
      smokeAmt: 1,
      hotBoost: 0,
      scale: TORCH_GPU_OVERLAY_SCALE,
      smokePlumeReach01: TORCH_GPU_SMOKE_PLUME_REACH01,
    });
  });

  const wantTorchKeys = new Set<string>();
  activePlayerKeys.forEach((id) => wantTorchKeys.add(torchIdKey(id)));
  pruneTorchGpuFireKeysNotIn(wantTorchKeys);
  return out;
}
