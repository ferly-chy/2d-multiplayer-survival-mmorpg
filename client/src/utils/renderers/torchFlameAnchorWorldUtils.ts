/**
 * World-space anchor for torch flame (GPU overlay + CPU particles).
 * Matches hand pivot, directional offsets, jump height, and swing arc from equipped torch rendering.
 */

import { JUMP_DURATION_MS, JUMP_HEIGHT_PX, gameConfig } from '../../config/gameConfig';

const SWING_DURATION_MS = 150;
const DEFAULT_SWING_ANGLE_MAX_RAD = Math.PI / 4;

const BASE_TORCH_FLAME_OFFSET_X = 0;
const BASE_TORCH_FLAME_OFFSET_Y = 0;

const OFFSET_X_LEFT = -25;
const OFFSET_Y_LEFT = -10;
const OFFSET_X_RIGHT = 15;
const OFFSET_Y_RIGHT = -10;
const OFFSET_X_UP = 35;
const OFFSET_Y_UP = -15;
const OFFSET_X_DOWN = -30;
const OFFSET_Y_DOWN = -10;

/** Vertical nudge so GPU / CPU fire base aligns with torch art. */
export const TORCH_FLAME_ANCHOR_FIRE_BASE_Y_OFFSET = 8;

export interface TorchFlameAnchorWorldInput {
  worldX: number;
  worldY: number;
  direction: string;
  jumpStartTimeMs: number | bigint;
  swingStartTimeMs: number;
  nowMs: number;
}

export function getTorchGpuFlameAnchorWorld(input: TorchFlameAnchorWorldInput): { x: number; y: number } {
  const { worldX, worldY, direction, jumpStartTimeMs, swingStartTimeMs, nowMs } = input;

  let currentJumpOffsetY = 0;
  if (jumpStartTimeMs) {
    const elapsedJumpTime = nowMs - Number(jumpStartTimeMs);
    if (elapsedJumpTime >= 0 && elapsedJumpTime < JUMP_DURATION_MS) {
      const t = elapsedJumpTime / JUMP_DURATION_MS;
      currentJumpOffsetY = Math.sin(t * Math.PI) * JUMP_HEIGHT_PX;
    }
  }

  let baseFlameOffsetX = BASE_TORCH_FLAME_OFFSET_X;
  let baseFlameOffsetY = BASE_TORCH_FLAME_OFFSET_Y;
  switch (direction) {
    case 'left':
      baseFlameOffsetX = OFFSET_X_LEFT;
      baseFlameOffsetY = OFFSET_Y_LEFT;
      break;
    case 'right':
      baseFlameOffsetX = OFFSET_X_RIGHT;
      baseFlameOffsetY = OFFSET_Y_RIGHT;
      break;
    case 'up':
      baseFlameOffsetX = OFFSET_X_UP;
      baseFlameOffsetY = OFFSET_Y_UP;
      break;
    case 'down':
      baseFlameOffsetX = OFFSET_X_DOWN;
      baseFlameOffsetY = OFFSET_Y_DOWN;
      break;
    default:
      break;
  }

  const handOffsetXConfig = gameConfig.spriteWidth * 0.2;
  const handOffsetYConfig = gameConfig.spriteHeight * 0.05;
  let handPivotRelativeX = 0;
  let handPivotRelativeY = 0;
  switch (direction) {
    case 'up':
      handPivotRelativeX = -handOffsetXConfig * -1.5;
      handPivotRelativeY = -handOffsetYConfig * 2.0;
      break;
    case 'down':
      handPivotRelativeX = handOffsetXConfig * -2.5;
      handPivotRelativeY = handOffsetYConfig * 1.5;
      break;
    case 'left':
      handPivotRelativeX = -handOffsetXConfig * 2.0;
      handPivotRelativeY = handOffsetYConfig;
      break;
    case 'right':
      handPivotRelativeX = handOffsetXConfig * 0.5;
      handPivotRelativeY = handOffsetYConfig;
      break;
  }

  let swingRotationRad = 0;
  const swingStart = Number(swingStartTimeMs || 0);
  if (swingStart > 0) {
    const elapsedSwingTime = nowMs - swingStart;
    if (elapsedSwingTime >= 0 && elapsedSwingTime < SWING_DURATION_MS) {
      const swingProgress = elapsedSwingTime / SWING_DURATION_MS;
      const baseAngle = Math.sin(swingProgress * Math.PI) * DEFAULT_SWING_ANGLE_MAX_RAD;
      if (direction === 'right' || direction === 'up') {
        swingRotationRad = baseAngle;
      } else {
        swingRotationRad = -baseAngle;
      }
    }
  }

  const playerWorldY = worldY - currentJumpOffsetY;
  const worldHandPivotX = worldX + handPivotRelativeX;
  const worldHandPivotY = playerWorldY + handPivotRelativeY;
  const initialFlameWorldX = worldX + baseFlameOffsetX;
  const initialFlameWorldY = playerWorldY + baseFlameOffsetY;
  const vecToFlameX = initialFlameWorldX - worldHandPivotX;
  const vecToFlameY = initialFlameWorldY - worldHandPivotY;
  const cosAngle = Math.cos(swingRotationRad);
  const sinAngle = Math.sin(swingRotationRad);
  const rotatedVecToFlameX = vecToFlameX * cosAngle - vecToFlameY * sinAngle;
  const rotatedVecToFlameY = vecToFlameX * sinAngle + vecToFlameY * cosAngle;
  const finalEmissionPointX = worldHandPivotX + rotatedVecToFlameX;
  const finalEmissionPointY = worldHandPivotY + rotatedVecToFlameY;

  return {
    x: finalEmissionPointX,
    y: finalEmissionPointY + TORCH_FLAME_ANCHOR_FIRE_BASE_Y_OFFSET,
  };
}
