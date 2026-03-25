/**
 * Per-frame GPU fire/smoke emitters for lit torches (same WebGL path as campfires).
 */

import type { Player as SpacetimeDBPlayer } from '../../generated/types';
import type { ActiveEquipment as SpacetimeDBActiveEquipment } from '../../generated/types';
import type { ItemDefinition as SpacetimeDBItemDefinition } from '../../generated/types';
import type { CampfireFireGpuEmitter } from './campfireFireOverlayUtils';
import { isCampfireFireWebGLOverlayAvailable } from './campfireFireOverlayUtils';
import {
  deleteCampfireGpuFire01,
  getCampfireGpuFireDt,
  pruneTorchGpuFireKeysNotIn,
  stepCampfireGpuFire01,
} from './campfireGpuFireSmoothing';
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
    localPredictedPosition,
    remotePlayerInterpolation,
    nowMs,
  } = params;

  const dt = getCampfireGpuFireDt(nowMs);
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

    const anchor = getTorchGpuFlameAnchorWorld({
      worldX,
      worldY,
      direction: player.direction ?? 'down',
      jumpStartTimeMs: player.jumpStartTimeMs,
      swingStartTimeMs: Number(equipment?.swingStartTimeMs ?? 0),
      nowMs,
    });

    if (!isLitTorch) {
      const fireAmt = stepCampfireGpuFire01(idKey, false, dt);
      if (fireAmt <= 0) {
        deleteCampfireGpuFire01(idKey);
        return;
      }
      out.push({
        anchorX: anchor.x,
        anchorY: anchor.y,
        fireAmt,
        smokeAmt: fireAmt,
        hotBoost: 0,
        scale: TORCH_GPU_OVERLAY_SCALE,
        smokePlumeReach01: TORCH_GPU_SMOKE_PLUME_REACH01,
      });
      return;
    }

    const fireAmt = stepCampfireGpuFire01(idKey, true, dt);
    out.push({
      anchorX: anchor.x,
      anchorY: anchor.y,
      fireAmt,
      smokeAmt: fireAmt,
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
