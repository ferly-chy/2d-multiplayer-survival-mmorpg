/**
 * Client-side collision shapes for monument buildings.
 * Abstraction layer for monument-specific collision (village campfires, scarecrow, etc.).
 */
import type { MonumentPart } from '../generated/types';
import type { CollisionShape } from './clientCollision';

// --- Monument scarecrow collision (matches wooden storage box - 20px radius, same position) ---
const MONUMENT_SCARECROW_CULL_DISTANCE_SQ = 200 * 200; // Only check within 200px
const MAX_MONUMENT_SCARECROWS_TO_CHECK = 3;
// Always use COLLISION_RADII.STORAGE_BOX (20) - ignore part.collisionRadius from DB (may be stale 64)
const MONUMENT_SCARECROW_COLLISION_RADIUS = 20;
/** Keep in sync with clientCollision COLLISION_DEBUG_VIEWPORT_MARGIN */
const COLLISION_DEBUG_VIEWPORT_MARGIN = 480;

type CollisionDebugViewportBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function pointInDebugViewport(
  x: number,
  y: number,
  vp: CollisionDebugViewportBounds,
  margin: number = COLLISION_DEBUG_VIEWPORT_MARGIN
): boolean {
  return (
    x >= vp.minX - margin &&
    x <= vp.maxX + margin &&
    y >= vp.minY - margin &&
    y <= vp.maxY + margin
  );
}

function isMonumentScarecrowPart(part: MonumentPart): boolean {
  return part.monumentType?.tag === 'HuntingVillage' && part.partType === 'scarecrow' && (part.collisionRadius ?? 0) > 0;
}

/**
 * Returns collision shapes for hunting village monument scarecrow (matches wooden storage box).
 * Always uses radius 20 - same as COLLISION_RADII.STORAGE_BOX. Ignores part.collisionRadius.
 */
export function getMonumentScarecrowCollisionShapes(
  monumentParts: Map<string, MonumentPart> | undefined,
  playerX: number,
  playerY: number,
  collisionDebugViewport?: CollisionDebugViewportBounds
): CollisionShape[] {
  if (!monumentParts || monumentParts.size === 0) return [];

  const shapes: CollisionShape[] = [];
  let count = 0;

  for (const part of monumentParts.values()) {
    if (!collisionDebugViewport && count >= MAX_MONUMENT_SCARECROWS_TO_CHECK) break;
    if (!isMonumentScarecrowPart(part)) continue;

    if (collisionDebugViewport) {
      if (!pointInDebugViewport(part.worldX, part.worldY, collisionDebugViewport)) continue;
    } else {
      const dx = part.worldX - playerX;
      const dy = part.worldY - playerY;
      const distSq = dx * dx + dy * dy;
      if (distSq > MONUMENT_SCARECROW_CULL_DISTANCE_SQ) continue;
    }

    shapes.push({
      id: `monument_scarecrow_${part.id}`,
      type: `monument_scarecrow-${part.id}`,
      x: part.worldX,
      y: part.worldY,
      radius: MONUMENT_SCARECROW_COLLISION_RADIUS,
    });
    if (!collisionDebugViewport) count++;
  }

  return shapes;
}

// --- Village campfire collision ---
const VILLAGE_CAMPFIRE_COLLISION_RADIUS = 70;
const VILLAGE_CAMPFIRE_CULL_DISTANCE_SQ = 250 * 250; // Only check within 250px
const MAX_VILLAGE_CAMPFIRES_TO_CHECK = 5;
// fv_campfire.png is 256x256, anchor at bottom; collision center at fire pit (half-height up)
const VILLAGE_CAMPFIRE_COLLISION_Y_OFFSET = -128;

function isVillageCampfirePart(part: MonumentPart): boolean {
  const isFishingVillage = part.monumentType?.tag === 'FishingVillage' && part.isCenter;
  const isHuntingVillage = part.monumentType?.tag === 'HuntingVillage' && part.partType === 'campfire';
  return Boolean(isFishingVillage || isHuntingVillage);
}

/**
 * Returns collision shapes for fishing/hunting village campfires (70px radius circle).
 * Culled by distance from player for performance.
 */
export function getVillageCampfireCollisionShapes(
  monumentParts: Map<string, MonumentPart> | undefined,
  playerX: number,
  playerY: number,
  collisionDebugViewport?: CollisionDebugViewportBounds
): CollisionShape[] {
  if (!monumentParts || monumentParts.size === 0) return [];

  const shapes: CollisionShape[] = [];
  let count = 0;

  for (const part of monumentParts.values()) {
    if (!collisionDebugViewport && count >= MAX_VILLAGE_CAMPFIRES_TO_CHECK) break;
    if (!isVillageCampfirePart(part)) continue;

    const shapeCenterX = part.worldX;
    const shapeCenterY = part.worldY + VILLAGE_CAMPFIRE_COLLISION_Y_OFFSET;

    if (collisionDebugViewport) {
      if (!pointInDebugViewport(shapeCenterX, shapeCenterY, collisionDebugViewport)) continue;
    } else {
      const dx = part.worldX - playerX;
      const dy = part.worldY - playerY;
      const distSq = dx * dx + dy * dy;
      if (distSq > VILLAGE_CAMPFIRE_CULL_DISTANCE_SQ) continue;
    }

    shapes.push({
      id: `monument_campfire_${part.id}`,
      type: `monument_campfire-${part.id}`,
      x: shapeCenterX,
      y: shapeCenterY,
      radius: VILLAGE_CAMPFIRE_COLLISION_RADIUS,
    });
    if (!collisionDebugViewport) count++;
  }

  return shapes;
}
