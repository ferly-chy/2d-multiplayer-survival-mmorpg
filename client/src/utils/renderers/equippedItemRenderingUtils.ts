/**
 * equippedItemRenderingUtils - Equipped item and melee attack rendering.
 *
 * Renders the item held by the player (tool, weapon, consumable) with correct
 * position/rotation based on facing. Draws melee swipe arc during attack and
 * handles bandaging, drinking, and other use animations.
 *
 * Responsibilities:
 * 1. ITEM RENDERING: renderEquippedItem draws the equipped item sprite with
 *    offset from player center. Handles spear, scythe, hammer, etc.
 *
 * 2. MELEE SWIPE: renderMeleeSwipeArcIfSwinging draws attack arc during swing.
 *    MELEE_ATTACK_RANGE, SPEAR_ATTACK_RANGE, SCYTHE_ATTACK_RANGE. Arc angles
 *    match server (90°, 60°, 150°).
 *
 * 3. OPTIMISTIC SWING: registerLocalPlayerSwing for immediate swing feedback.
 *    Local melee/tool/spear swing is client-only (no server replay — avoids double-swing
 *    when ack is late). Remote players still use server swingStartTimeMs.
 *
 * 4. USE ANIMATIONS: Bandaging, Selo Olive Oil, water drinking wobble/rotation.
 *
 * 5. DODGE ROLL: Held Tool / Weapon / RangedWeapon items spin one full turn over the roll,
 *    signed from dodge direction (passed from renderYSortedEntities).
 */

import { Player as SpacetimeDBPlayer, ActiveEquipment as SpacetimeDBActiveEquipment, ItemDefinition as SpacetimeDBItemDefinition, ActiveConsumableEffect, EffectType } from '../../generated/types';
import { gameConfig } from '../../config/gameConfig';
import {
  touchCampfireFireWebGLInit,
  isCampfireFireWebGLOverlayAvailable,
} from './campfireFireOverlayUtils';
import {
  DEFAULT_MELEE_ARC_DEGREES as DEFAULT_ATTACK_ARC_DEGREES,
  DEFAULT_MELEE_ATTACK_RANGE,
  SCYTHE_MELEE_ARC_DEGREES,
  SCYTHE_MELEE_ATTACK_RANGE,
  SPEAR_MELEE_ARC_DEGREES,
  SPEAR_MELEE_ATTACK_RANGE,
} from '../../config/combatConstants';

/** Passed from player render when dodge is active (Tool, Weapon, or RangedWeapon). */
export type ToolDodgeRollSpin = { progress: number; direction: string };

// --- Constants ---
const SWING_DURATION_MS = 150;
// Match server ranged_weapon_stats reload/magazine times (arcade pacing).
const HUNTING_BOW_RELOAD_MS = 400;
const CROSSBOW_RELOAD_MS = 1000;
const HARPOON_GUN_RELOAD_MS = 225;

// Helper to get swing angle from item definition
// Items with attackArcDegrees defined use that, otherwise default to 90°
const getSwingAngleMaxRad = (itemDef: SpacetimeDBItemDefinition): number => {
  // attackArcDegrees is the total arc (e.g., 120° for Scythe)
  // We divide by 2 because swing goes from -angle to +angle
  const arcDegrees = itemDef.attackArcDegrees ?? 90;
  return (arcDegrees / 2) * (Math.PI / 180);
};
const PLAYER_HIT_SHAKE_DURATION_MS = 200; // Copied from renderingUtils.ts
const PLAYER_HIT_SHAKE_AMOUNT_PX = 3;   // Copied from renderingUtils.ts

// --- Bandage Animation Constants ---
const BANDAGING_ANIMATION_DURATION_MS = 5000; // Duration of the bandaging animation (MATCHES SERVER: 5 seconds)
const BANDAGING_MAX_ROTATION_RAD = Math.PI / 12; // Max rotation angle (e.g., 15 degrees)
const BANDAGING_WOBBLES = 20; // Number of full back-and-forth wobbles (10 * 2 for twice as fast)

// Selo Olive Oil animation constants
const SELO_OLIVE_OIL_ANIMATION_DURATION_MS = 2000; // Duration of the Selo Olive Oil animation (MATCHES SERVER: 2 seconds)
const SELO_OLIVE_OIL_MAX_ROTATION_RAD = Math.PI / 16; // Much gentler rotation than bandage (was Math.PI / 10)
const SELO_OLIVE_OIL_WOBBLES = 8; // Fewer wobbles for a gentler shake (was 15)

// Water drinking animation constants
const WATER_DRINKING_ANIMATION_DURATION_MS = 2000; // Duration of the water drinking animation (MATCHES SERVER: 2 seconds)
const WATER_DRINKING_MAX_ROTATION_RAD = Math.PI / 20; // Gentle rotation for drinking
const WATER_DRINKING_WOBBLES = 6; // Gentle wobbles for drinking

// --- Client-side animation tracking ---
const clientSwingStartTimes = new Map<string, number>(); // playerId -> client timestamp when swing started
const lastKnownServerSwingTimes = new Map<string, number>(); // playerId -> last known server timestamp for the swing

// --- CLIENT-AUTHORITATIVE SWING TRACKING (for local player only) ---
// Local swing visuals use only this clock — server swingStartTimeMs is not replayed for
// the local player (late acks no longer cause a second swing). Remotes use server time.
let localPlayerClientSwingStartTime: number = 0; // When local player initiated swing (client time)
let localPlayerSwingDuration: number = SWING_DURATION_MS; // How long the swing should last

/**
 * Call this from the input handler when the local player initiates a swing.
 * This allows the animation to start immediately without waiting for server confirmation.
 * @param duration - Optional custom swing duration (defaults to SWING_DURATION_MS)
 */
export function registerLocalPlayerSwing(duration?: number): void {
  const dur = duration ?? SWING_DURATION_MS;
  localPlayerClientSwingStartTime = performance.now();
  localPlayerSwingDuration = dur;
}

/**
 * Check if the local player has an active client-initiated swing animation.
 * Returns the elapsed time since the swing started, or -1 if no active swing.
 */
export function getLocalPlayerSwingElapsed(): number {
  if (localPlayerClientSwingStartTime === 0) return -1;
  const elapsed = performance.now() - localPlayerClientSwingStartTime;
  if (elapsed >= localPlayerSwingDuration) {
    // Swing animation complete, reset start time but keep grace period active
    localPlayerClientSwingStartTime = 0;
    return -1;
  }
  return elapsed;
}

const localPlayerLoadedAmmoHideUntilByWeapon = new Map<string, number>();

function getLocalRangedAmmoHideDurationMs(itemName?: string | null): number {
  switch (itemName) {
    case 'Crossbow':
      return 120;
    case 'Reed Harpoon Gun':
      return 90;
    case 'Hunting Bow':
    default:
      return 100;
  }
}

function shouldHideLocalPlayerLoadedAmmo(itemName: string | null | undefined, nowMs: number): boolean {
  if (!itemName) return false;
  const hideUntil = localPlayerLoadedAmmoHideUntilByWeapon.get(itemName) ?? 0;
  if (hideUntil <= nowMs) {
    localPlayerLoadedAmmoHideUntilByWeapon.delete(itemName);
    return false;
  }
  return true;
}

export function registerLocalPlayerRangedShot(itemName?: string | null): void {
  if (!itemName) return;
  localPlayerLoadedAmmoHideUntilByWeapon.set(
    itemName,
    Date.now() + getLocalRangedAmmoHideDurationMs(itemName)
  );
}

// --- Melee Swipe Arc (server-pixel-perfect hitbox indicator) ---
/** Facing direction to radians. Must match server get_player_forward_vector. */
const getFacingAngleRad = (dir: string): number => {
  const d = dir?.toLowerCase() ?? 'down';
  switch (d) {
    case 'up': return -Math.PI / 2;
    case 'down': return Math.PI / 2;
    case 'left': return Math.PI;
    case 'right': return 0;
    default: return Math.PI / 2;
  }
};

/**
 * Spin direction from dodge travel (world/cardinal). Canvas apply order uses mirror scales after/before
 * rotate depending on item branch — multiply by dodgeRollSpinOrientationFactor for correct screen sense.
 */
const toolDodgeRollSpinSign = (dodgeDirection: string): number => {
  const d = dodgeDirection?.toLowerCase() ?? '';
  switch (d) {
    case 'right': return 1;
    case 'left': return -1;
    case 'down': return -1; // was +1; reversed so roll matches motion (up/left/right unchanged)
    case 'up': return -1;
    default: return 1;
  }
};

/**
 * Generic held items: translate, then scale(-1,1) for right/up, then inner rotate — i.e. rotation is
 * applied before the horizontal mirror in the effective transform (T·M·R on points), which inverts
 * apparent spin; negate dodge ω to compensate. Spear/bow/harpoon use rotate-before-scale (T·R·S), so
 * they do not use this factor here (see ctx.translate/rotate/scale order below).
 */
const dodgeRollSpinOrientationFactor = (
  itemDef: SpacetimeDBItemDefinition,
  facing: string
): number => {
  const d = facing?.toLowerCase() ?? 'down';
  const usesGenericHeldMirrorBeforeInnerRotate =
    itemDef.name !== 'Wooden Spear' &&
    itemDef.name !== 'Stone Spear' &&
    itemDef.name !== 'Reed Harpoon' &&
    itemDef.name !== 'Hunting Bow' &&
    itemDef.name !== 'Crossbow' &&
    itemDef.name !== 'Reed Harpoon Gun';
  if (!usesGenericHeldMirrorBeforeInnerRotate) {
    return 1;
  }
  if (itemDef.name === 'Bandage' || itemDef.name === 'Selo Olive Oil') {
    return 1;
  }
  if (d === 'right' || d === 'up') return -1;
  return 1;
};

/** Weapon-specific range and arc. Must match server active_equipment.rs. */
const getWeaponAttackParams = (itemDef: SpacetimeDBItemDefinition): { range: number; arcDegrees: number; isSpear: boolean } => {
  const name = itemDef.name;
  if (name === 'Wooden Spear' || name === 'Stone Spear' || name === 'Reed Harpoon') {
    return { range: SPEAR_MELEE_ATTACK_RANGE, arcDegrees: SPEAR_MELEE_ARC_DEGREES, isSpear: true };
  }
  if (name === 'Scythe') {
    return { range: SCYTHE_MELEE_ATTACK_RANGE, arcDegrees: SCYTHE_MELEE_ARC_DEGREES, isSpear: false };
  }
  const arc = itemDef.attackArcDegrees ?? DEFAULT_ATTACK_ARC_DEGREES;
  return { range: DEFAULT_MELEE_ATTACK_RANGE, arcDegrees: arc, isSpear: false };
};

/**
 * Draws a subtle swipe arc that reflects the server's exact attack hitbox.
 * Arc flashes at impact moment (peak of swing). Stroke-only to avoid tacky fills.
 */
const drawMeleeSwipeArc = (
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  direction: string,
  itemDef: SpacetimeDBItemDefinition,
  swingProgress: number,
  isSpearThrusting: boolean,
  thrustDistance: number
): void => {
  const params = getWeaponAttackParams(itemDef);
  const facingAngle = getFacingAngleRad(direction);
  const halfArcRad = (params.arcDegrees / 2) * (Math.PI / 180);
  const startAngle = facingAngle - halfArcRad;
  const endAngle = facingAngle + halfArcRad;

  // Peak visibility at impact (~progress 0.5).
  const opacity = Math.sin(swingProgress * Math.PI) * 0.32;
  if (opacity < 0.03) return;

  ctx.save();

  const range = params.isSpear
    ? Math.max(thrustDistance, params.range * 0.2)  // Spear: cone extends with thrust
    : params.range;

  ctx.beginPath();
  ctx.arc(originX, originY, range, startAngle, endAngle);

  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.restore();
};

/**
 * Draws the melee swipe arc for a swinging player. Call this AFTER renderPlayer
 * so the arc appears on top (not hidden behind the player when facing up/left).
 */
export function renderMeleeSwipeArcIfSwinging(
  ctx: CanvasRenderingContext2D,
  player: SpacetimeDBPlayer,
  equipment: SpacetimeDBActiveEquipment,
  itemDef: SpacetimeDBItemDefinition,
  now_ms: number,
  jumpOffset: number,
  localPlayerId?: string
): void {
  const isRangedWeapon = ['Hunting Bow', 'Crossbow', 'Reed Harpoon Gun', 'Makarov PM', 'PP-91 KEDR'].includes(itemDef.name ?? '');
  const isMeleeWeapon = itemDef.category?.tag === 'Weapon' && !isRangedWeapon;
  const isSpearItem = ['Wooden Spear', 'Stone Spear', 'Reed Harpoon'].includes(itemDef.name ?? '');
  const isTool = itemDef.category?.tag === 'Tool';
  if (!isMeleeWeapon && !isSpearItem && !isTool) return;

  const swingStartTime = Number(equipment.swingStartTimeMs);
  const playerId = player.identity.toHexString();
  const isLocalPlayer = localPlayerId && playerId === localPlayerId;
  let elapsedSwingTime = 0;
  let thrustDistance = 0;

  if (isLocalPlayer) {
    const clientSwingElapsed = getLocalPlayerSwingElapsed();
    if (clientSwingElapsed < 0) {
      clientSwingStartTimes.delete(playerId);
      lastKnownServerSwingTimes.delete(playerId);
      return;
    }
    elapsedSwingTime = clientSwingElapsed;
  } else {
    if (swingStartTime <= 0) return;
    const clientStartTime = clientSwingStartTimes.get(playerId);
    const lastKnownServerTime = lastKnownServerSwingTimes.get(playerId) || 0;
    if (swingStartTime !== lastKnownServerTime) {
      lastKnownServerSwingTimes.set(playerId, swingStartTime);
      clientSwingStartTimes.set(playerId, now_ms);
      elapsedSwingTime = 0;
    } else if (clientStartTime) {
      elapsedSwingTime = now_ms - clientStartTime;
    } else {
      return;
    }
  }

  if (elapsedSwingTime >= SWING_DURATION_MS) return;

  const swingProgress = elapsedSwingTime / SWING_DURATION_MS;
  const isSpearThrusting = isSpearItem;
  if (isSpearThrusting) {
    thrustDistance = Math.sin(swingProgress * Math.PI) * SPEAR_MELEE_ATTACK_RANGE;
  }

  const originX = player.positionX;
  const originY = player.positionY - jumpOffset;
  drawMeleeSwipeArc(ctx, originX, originY, player.direction, itemDef, swingProgress, isSpearThrusting, thrustDistance);
}

// --- Helper Function for Rendering Equipped Item ---
export const renderEquippedItem = (
  ctx: CanvasRenderingContext2D,
  player: SpacetimeDBPlayer, 
  equipment: SpacetimeDBActiveEquipment,
  itemDef: SpacetimeDBItemDefinition,
  itemDefinitions: Map<string, SpacetimeDBItemDefinition>,
  itemImgFromCaller: HTMLImageElement,
  now_ms: number,
  jumpOffset: number,
  itemImages: Map<string, HTMLImageElement>,
  activeConsumableEffects?: Map<string, ActiveConsumableEffect>,
  localPlayerId?: string,
  serverSyncedDirection?: string, // Optional: Server-synced direction for accurate attack arc display
  applyUnderwaterTint?: boolean, // Apply teal underwater tint when snorkeling
  toolDodgeRollSpin?: ToolDodgeRollSpin | null
) => {
  // DEBUG: Log item being rendered
  // if (localPlayerId && player.identity.toHexString() === localPlayerId) {
  //   console.log(`[DEBUG] renderEquippedItem called for:`, {
  //     itemName: itemDef.name,
  //     category: itemDef.category,
  //     categoryTag: itemDef.category?.tag,
  //     categoryType: typeof itemDef.category,
  //     hasInstanceId: !!equipment.equippedItemInstanceId
  //   });
  // }

  // Early validation: if no equipped item instance ID, don't render anything
  if (!equipment.equippedItemInstanceId) {
    return;
  }

  const catTag = itemDef.category?.tag;
  const appliesEquippedDodgeRollSpin =
    catTag === 'Tool' || catTag === 'Weapon' || catTag === 'RangedWeapon';
  const dodgeSpinRad =
    appliesEquippedDodgeRollSpin && toolDodgeRollSpin
      ? Math.max(0, Math.min(1, toolDodgeRollSpin.progress)) *
        Math.PI *
        2 *
        toolDodgeRollSpinSign(toolDodgeRollSpin.direction) *
        dodgeRollSpinOrientationFactor(itemDef, player.direction)
      : 0;

  const playerId = player.identity.toHexString();
  const isLocalPlayer = localPlayerId && playerId === localPlayerId;
  // --- Calculate Shake Offset (Only if alive) ---
  let shakeX = 0;
  let shakeY = 0;
  if (!player.isDead && player.lastHitTime) { // Check if alive and hit time exists
    const lastHitMs = Number(player.lastHitTime.microsSinceUnixEpoch / 1000n);
    const elapsedSinceHit = now_ms - lastHitMs;
    if (elapsedSinceHit >= 0 && elapsedSinceHit < PLAYER_HIT_SHAKE_DURATION_MS) {
      shakeX = (Math.random() - 0.5) * 2 * PLAYER_HIT_SHAKE_AMOUNT_PX;
      shakeY = (Math.random() - 0.5) * 2 * PLAYER_HIT_SHAKE_AMOUNT_PX;
    }
  }
  // --- End Shake Offset ---

  // --- Item Size and Position ---
  // Items are now 64x64px, so we need much larger scales than before
  // Melee weapons need to be larger to be visible - using 0.9 scale (57px)
  // Skulls and fertilizer render at larger size (0.75 scale = 48px)
  // Vole skull is tiny - half the size of other skulls (0.375 scale = 24px)
  // Other items use 0.7 scale (45px)
  const isVoleSkull = itemDef.name === "Vole Skull";
  const isSkull = itemDef.name === "Human Skull" || itemDef.name === "Fox Skull" || 
                   itemDef.name === "Wolf Skull" || itemDef.name === "Viper Skull" || 
                   itemDef.name === "Walrus Skull" || itemDef.name === "Wolverine Skull";
  const isFertilizer = itemDef.name === "Fertilizer";
  const isMeleeWeapon = itemDef.category?.tag === "Weapon";
  // Updated scales for 64x64px images: 
  // - Melee weapons: 0.9 scale (57px) for visibility
  // - Skulls/fertilizer: 0.75 scale (48px)
  // - Vole skull: 0.375 scale (24px) - half the size of other skulls
  // - Other items: 0.7 scale (45px)
  const scale = isVoleSkull ? 0.5 : (isMeleeWeapon ? 0.9 : (isSkull || isFertilizer) ? 0.75 : 0.7); 
  const itemWidth = itemImgFromCaller.width * scale;
  const itemHeight = itemImgFromCaller.height * scale;
  let itemOffsetX = 0; 
  let itemOffsetY = 0; 

  let displayItemWidth = itemWidth;
  let displayItemHeight = itemHeight;

  // Make repair hammer twice as small
  if (itemDef.name === "Repair Hammer") {
    displayItemWidth = itemWidth * 0.5;
    displayItemHeight = itemHeight * 0.5;
  }

  let rotation = 0;
  let isSwinging = false;
  let isSpearThrusting = false;

  // --- Define spear-specific orientation variables ---
  let spearRotation = 0; // This will be the primary rotation for the spear
  let spearScaleX = 1;
  let spearScaleY = 1;
  // --- End spear-specific orientation variables ---

  let pivotX = player.positionX + shakeX;
  let pivotY = player.positionY - jumpOffset + shakeY; 
  
  const handOffsetX = gameConfig.spriteWidth * 0.2; 
  const handOffsetY = gameConfig.spriteHeight * 0.05;

  if (itemDef.name === "Wooden Spear" || itemDef.name === "Stone Spear" || itemDef.name === "Reed Harpoon") {
    // Base rotations to make spear point in player's direction
    // (assuming spear asset points horizontally to the right by default)
    switch (player.direction) {
      case 'up':
        spearRotation = -Math.PI / 2; // Points asset 'up'
        itemOffsetX = 0; 
        itemOffsetY = -gameConfig.spriteHeight * 0.1; 
        break;
      case 'down':
        spearRotation = Math.PI / 2;  // Points asset 'down'
        itemOffsetX = 0;
        itemOffsetY = gameConfig.spriteHeight * 0.1;
        break;
      case 'left':
        spearRotation = Math.PI;      // Points asset 'left'
        itemOffsetX = -gameConfig.spriteWidth * 0.15;
        itemOffsetY = 0; 
        break;
      case 'right':
        spearRotation = 0;            // Points asset 'right' (default asset orientation)
        itemOffsetX = gameConfig.spriteWidth * 0.15;
        itemOffsetY = 0;
        break;
    }

    // Apply user-specified distinct transformations for each direction
    // This switch can override spearRotation from the first switch, set scaling,
    // and now also fine-tune itemOffsetX/Y for each specific spear orientation.
    switch (player.direction) {
      case 'up':
        spearRotation = (Math.PI / 4) + (Math.PI / 2) + (Math.PI / 2); 
        spearScaleX = -1; 
        spearScaleY = -1; 
        // Initial offset from first switch for 'up': itemOffsetX = 0; itemOffsetY = -gameConfig.spriteHeight * 0.1;
        itemOffsetX = 0 + 15; // adjust X for up
        itemOffsetY = (-gameConfig.spriteHeight * 0.1) -20; // adjust Y for up
        break;
      case 'down':
        spearRotation = (Math.PI / 4) + (Math.PI / 2);
        spearScaleX = -1; 
        spearScaleY = 1;
        // Initial offset from first switch for 'down': itemOffsetX = 0; itemOffsetY = gameConfig.spriteHeight * 0.1;
        itemOffsetX = 0 - 15; // adjust X for down (e.g., move left by 5px)
        itemOffsetY = (gameConfig.spriteHeight * 0.1) + 25; // adjust Y for down (e.g., move down by 5px)
        break;
      case 'left':
        spearRotation = Math.PI + (Math.PI / 4);
        spearScaleX = -1; 
        spearScaleY = 1;
        // Initial offset from first switch for 'left': itemOffsetX = -gameConfig.spriteWidth * 0.15; itemOffsetY = 0;
        itemOffsetX = (-gameConfig.spriteWidth * 0.15) - 15; // adjust X for left
        itemOffsetY = 0 + 0; // adjust Y for left
        break;
      case 'right':
        spearRotation = Math.PI / 4; 
        spearScaleX = -1; 
        spearScaleY = 1;
        // Initial offset from first switch for 'right': itemOffsetX = gameConfig.spriteWidth * 0.15; itemOffsetY = 0;
        itemOffsetX = (gameConfig.spriteWidth * 0.15) + 5; // adjust X for right
        itemOffsetY = 0 + 15; // adjust Y for right
        break;
    }
    
    // The pivotX and pivotY are now based on these potentially fine-tuned offsets.
    // The initial calculation of pivotX/Y before this switch might need to be re-evaluated
    // if we don't want to ADD to player.positionX/Y + shakeX/Y + itemOffsetX/Y from the *first* switch.
    // For now, we effectively override the first switch's itemOffset by re-assigning itemOffsetX/Y here.
    // So, the final pivot calculation should directly use these values.

    // Recalculate pivotX, pivotY based on the final itemOffsetX/Y for the spear
    pivotX = player.positionX + shakeX + itemOffsetX;
    pivotY = player.positionY - jumpOffset + shakeY + itemOffsetY;
    
    rotation = spearRotation; // Use the calculated spear rotation

  } else if (itemDef.name === "Hunting Bow") {

    // Full 64x64px rendering for bows
    const bowScale = 1.0;
    displayItemWidth = itemImgFromCaller.width * bowScale;
    displayItemHeight = itemImgFromCaller.height * bowScale;

    switch (player.direction) {
      case 'up':
        itemOffsetX = gameConfig.spriteWidth * 0.3;
        itemOffsetY = -gameConfig.spriteHeight * 0.0;
        rotation = -Math.PI / 2; // Point bow upward (with horizontal flip, -90° points up)
        break;
      case 'down':
        itemOffsetX = gameConfig.spriteWidth * -0.3;
        itemOffsetY = gameConfig.spriteHeight * 0.2;
        rotation = Math.PI / 2; // Point bow downward (with horizontal flip, +90° points down)
        break;
      case 'left':
        itemOffsetX = -gameConfig.spriteWidth * 0.2;
        itemOffsetY = 0;
        rotation = Math.PI / 2; // Rotate counterclockwise 90° to mirror the right direction
        break;
      case 'right':
        itemOffsetX = gameConfig.spriteWidth * -0.2;
        itemOffsetY = 4.0;
        rotation = 0; // Point bow right (0° is correct, this is our reference)
        break;
    }
    
    pivotX = player.positionX + shakeX + itemOffsetX;
    pivotY = player.positionY - jumpOffset + shakeY + itemOffsetY;

  } else if (itemDef.name === "Crossbow") {

    // Full 64x64px rendering for crossbows
    const crossbowScale = 1.0;
    displayItemWidth = itemImgFromCaller.width * crossbowScale;
    displayItemHeight = itemImgFromCaller.height * crossbowScale;

    switch (player.direction) {
      case 'up':
        itemOffsetX = gameConfig.spriteWidth * 0.25;
        itemOffsetY = -gameConfig.spriteHeight * 0.05;
        rotation = -Math.PI / 2; // Point crossbow upward (with horizontal flip, -90° points up)
        break;
      case 'down':
        itemOffsetX = gameConfig.spriteWidth * -0.25;
        itemOffsetY = gameConfig.spriteHeight * 0.25;
        rotation = Math.PI / 2; // Point crossbow downward (with horizontal flip, +90° points down)
        break;
      case 'left':
        itemOffsetX = -gameConfig.spriteWidth * 0.25;
        itemOffsetY = 0;
        rotation = Math.PI / 2; // Rotate counterclockwise 90° to mirror the right direction
        break;
      case 'right':
        itemOffsetX = gameConfig.spriteWidth * -0.25;
        itemOffsetY = 2.0;
        rotation = 0; // Point crossbow right (0° is correct, this is our reference)
        break;
    }
    
    pivotX = player.positionX + shakeX + itemOffsetX;
    pivotY = player.positionY - jumpOffset + shakeY + itemOffsetY;

  } else if (itemDef.name === "Makarov PM") {

    // 33% larger than half-size rendering for pistol (~42x42px effective)
    const pistolScale = 0.5 * 1.33; // 0.665
    displayItemWidth = itemImgFromCaller.width * pistolScale;
    displayItemHeight = itemImgFromCaller.height * pistolScale;

    switch (player.direction) {
      case 'up':
        itemOffsetX = gameConfig.spriteWidth * 0.25;
        itemOffsetY = -gameConfig.spriteHeight * 0.05;
        rotation = -Math.PI / 2; // Point pistol upward
        break;
      case 'down':
        itemOffsetX = gameConfig.spriteWidth * -0.25;
        itemOffsetY = gameConfig.spriteHeight * 0.25;
        rotation = Math.PI / 2; // Point pistol downward
        break;
      case 'left':
        itemOffsetX = -gameConfig.spriteWidth * 0.25;
        itemOffsetY = 0;
        rotation = Math.PI / 2; // Rotate counterclockwise 90°
        break;
      case 'right':
        itemOffsetX = gameConfig.spriteWidth * +0.05; // Shifted right slightly
        itemOffsetY = 5.0;
        rotation = 0; // Point pistol right
        break;
    }
    
    pivotX = player.positionX + shakeX + itemOffsetX;
    pivotY = player.positionY - jumpOffset + shakeY + itemOffsetY;

  } else if (itemDef.name === "PP-91 KEDR") {

    // Full 64x64px rendering for SMG
    const smgScale = 1.0;
    displayItemWidth = itemImgFromCaller.width * smgScale;
    displayItemHeight = itemImgFromCaller.height * smgScale;

    switch (player.direction) {
      case 'up':
        itemOffsetX = gameConfig.spriteWidth * 0.25;
        itemOffsetY = -gameConfig.spriteHeight * 0.05;
        rotation = -Math.PI / 2; // Point SMG upward
        break;
      case 'down':
        itemOffsetX = gameConfig.spriteWidth * -0.25;
        itemOffsetY = gameConfig.spriteHeight * 0.25;
        rotation = Math.PI / 2; // Point SMG downward
        break;
      case 'left':
        itemOffsetX = -gameConfig.spriteWidth * 0.25;
        itemOffsetY = 0;
        rotation = Math.PI / 2; // Rotate counterclockwise 90°
        break;
      case 'right':
        itemOffsetX = gameConfig.spriteWidth * +0.10; // Shifted right slightly
        itemOffsetY = 6.0;
        rotation = 0; // Point SMG right
        break;
    }
    
    pivotX = player.positionX + shakeX + itemOffsetX;
    pivotY = player.positionY - jumpOffset + shakeY + itemOffsetY;

  } else if (itemDef.name === "Reed Harpoon Gun") {

    // Full 64x64px rendering for harpoon gun (similar to crossbow positioning)
    const harpoonGunScale = 1.0;
    displayItemWidth = itemImgFromCaller.width * harpoonGunScale;
    displayItemHeight = itemImgFromCaller.height * harpoonGunScale;

    switch (player.direction) {
      case 'up':
        itemOffsetX = gameConfig.spriteWidth * 0.25;
        itemOffsetY = -gameConfig.spriteHeight * 0.05;
        rotation = -Math.PI / 2; // Point harpoon gun upward
        break;
      case 'down':
        itemOffsetX = gameConfig.spriteWidth * -0.25;
        itemOffsetY = gameConfig.spriteHeight * 0.25;
        rotation = Math.PI / 2; // Point harpoon gun downward
        break;
      case 'left':
        itemOffsetX = -gameConfig.spriteWidth * 0.25;
        itemOffsetY = 0;
        rotation = Math.PI / 2; // Rotate counterclockwise 90°
        break;
      case 'right':
        itemOffsetX = gameConfig.spriteWidth * -0.25;
        itemOffsetY = 2.0;
        rotation = 0; // Point harpoon gun right
        break;
    }
    
    pivotX = player.positionX + shakeX + itemOffsetX;
    pivotY = player.positionY - jumpOffset + shakeY + itemOffsetY;

  } else {
    // Original logic for other items' pivot and default orientation
    switch (player.direction) {
        case 'up': 
            itemOffsetX = -handOffsetX * -2.5;
            itemOffsetY = handOffsetY * -1.0;
            pivotX += itemOffsetX;
            pivotY += itemOffsetY; 
            break;
        case 'down': 
            itemOffsetX = handOffsetX * -2.5;
            itemOffsetY = handOffsetY * 1.0; 
            pivotX += itemOffsetX;
            pivotY += itemOffsetY; 
            break;
        case 'left': 
            itemOffsetX = -handOffsetX * 1.5; 
            itemOffsetY = handOffsetY;
            pivotX += itemOffsetX; 
            pivotY += itemOffsetY; 
            break;
        case 'right': 
            itemOffsetX = handOffsetX * 0.5; 
            itemOffsetY = handOffsetY;
            pivotX += itemOffsetX;
            pivotY += itemOffsetY; 
            break;
    }
  }
  // --- End Item Size and Position adjustments ---

  // Store the pivot before animation for the thrust line visual and arc effects
  const preAnimationPivotX = pivotX;
  const preAnimationPivotY = pivotY;

  // --- Arrow/Dart Rendering for Loaded Bow/Crossbow/Harpoon Gun ---
  // Only show ammo when weapon is TRULY ready to fire (after reload cooldown)
  // The server sets isReadyToFire=true immediately on reload, but actual firing is blocked
  // by a cooldown based on reload_time_secs. We mirror this check client-side for accurate UX.
  // EXCEPTION: Reed Harpoon Gun works like a gun - dart shows immediately when loaded
  let loadedArrowImage: HTMLImageElement | undefined = undefined;
  const isRangedWeaponWithVisibleAmmo = itemDef.name === "Hunting Bow" || itemDef.name === "Crossbow" || itemDef.name === "Reed Harpoon Gun";
  if (isRangedWeaponWithVisibleAmmo && equipment.isReadyToFire && equipment.loadedAmmoDefId && itemDefinitions) {
    const isLocalAmmoOwner = !!localPlayerId && player.identity.toHexString() === localPlayerId;
    if (isLocalAmmoOwner && shouldHideLocalPlayerLoadedAmmo(itemDef.name, now_ms)) {
      loadedArrowImage = undefined;
    } else {
    // Reed Harpoon Gun: No reload delay visual - dart shows immediately like a gun
    // Bows/Crossbows: Have reload animations so we wait for cooldown before showing ammo
    const isHarpoonGun = itemDef.name === "Reed Harpoon Gun";
    
    let reloadComplete = true; // Default to true for harpoon gun
    
    if (!isHarpoonGun) {
      // Check if reload cooldown has elapsed since last shot (swing_start_time_ms)
      // Hunting Bow: 850ms reload, Crossbow: 2300ms reload
      let reloadTimeMs = itemDef.name === "Crossbow" ? CROSSBOW_RELOAD_MS : HUNTING_BOW_RELOAD_MS;
      
      const lastShotTimeMs = Number(equipment.swingStartTimeMs);
      const timeSinceLastShot = now_ms - lastShotTimeMs;
      reloadComplete = lastShotTimeMs === 0 || timeSinceLastShot >= reloadTimeMs;
    }
    
    if (reloadComplete) {
      const ammoDef = itemDefinitions.get(String(equipment.loadedAmmoDefId));
      if (ammoDef && ammoDef.iconAssetName) {
          loadedArrowImage = itemImages.get(ammoDef.iconAssetName); // Use ammo's icon
          if (!loadedArrowImage) {
              // console.warn(`[RenderEquipped] Image for loaded ammo '${ammoDef.iconAssetName}' not found.`);
          }
      }
    }
    }
  }
  // --- END Arrow/Dart Rendering ---

  // --- Swing/Thrust Animation --- 
  const swingStartTime = Number(equipment.swingStartTimeMs);
  let elapsedSwingTime = 0;
  let currentAngle = 0; 
  let thrustDistance = 0; 

  // Local player: swing pose is 100% client-predicted (registerLocalPlayerSwing on input).
  // Server swingStartTimeMs is still used for bow/crossbow reload timing above, not for this pose.
  if (isLocalPlayer) {
    const clientSwingElapsed = getLocalPlayerSwingElapsed();
    if (clientSwingElapsed >= 0) {
      elapsedSwingTime = clientSwingElapsed;
    } else {
      clientSwingStartTimes.delete(playerId);
      lastKnownServerSwingTimes.delete(playerId);
      elapsedSwingTime = SWING_DURATION_MS + 1;
    }
  } else {
    // SERVER-AUTHORITATIVE for other players (we don't predict their actions)
    if (swingStartTime > 0) {
      const clientStartTime = clientSwingStartTimes.get(playerId);
      const lastKnownServerTime = lastKnownServerSwingTimes.get(playerId) || 0;
      
      if (swingStartTime !== lastKnownServerTime) {
        // NEW swing detected! Record both server time and client time
        lastKnownServerSwingTimes.set(playerId, swingStartTime);
        clientSwingStartTimes.set(playerId, now_ms);
        elapsedSwingTime = 0;
      } else if (clientStartTime) {
        // Use client-tracked time for animation
        elapsedSwingTime = now_ms - clientStartTime;
      }
    } else {
      // Clean up tracking for this player if no active swing
      clientSwingStartTimes.delete(playerId);
      lastKnownServerSwingTimes.delete(playerId);
    }
  }

  if (elapsedSwingTime < SWING_DURATION_MS) {
      isSwinging = true; 
      const swingProgress = elapsedSwingTime / SWING_DURATION_MS;
      
      if (itemDef.name === "Wooden Spear" || itemDef.name === "Stone Spear" || itemDef.name === "Reed Harpoon") {
          isSpearThrusting = true;
          thrustDistance = Math.sin(swingProgress * Math.PI) * SPEAR_MELEE_ATTACK_RANGE;
          
          // Apply thrust directly to pivotX/pivotY based on world direction
          // The `rotation` variable (which is spearRotation) is for the visual angle.
          switch (player.direction) {
            case 'up':    pivotY -= thrustDistance; break;
            case 'down':  pivotY += thrustDistance; break;
            case 'left':  pivotX -= thrustDistance; break;
            case 'right': pivotX += thrustDistance; break;
          }
          // `rotation` (which is spearRotation) is already set for the spear's pointing direction from earlier logic.
      } else {
          // Swing animation for other items. 
          // currentAngle will be negative or zero, representing a CCW swing if positive was CW (and backwards).
          // Use per-weapon swing angle - Scythe has wider 120° arc, most weapons use 90°
          const weaponSwingAngle = getSwingAngleMaxRad(itemDef);
          currentAngle = -(Math.sin(swingProgress * Math.PI) * weaponSwingAngle);
          // The 'rotation' variable is used for the slash arc. It should match the item's swing direction.
          // Don't override rotation for ranged weapons - they should maintain their directional orientation
          if (itemDef.name !== "Hunting Bow" && itemDef.name !== "Crossbow") {
            rotation = currentAngle; 
          }
      }
  }
  
  // --- Resolve the correct image to render ---
  let imageToRender: HTMLImageElement | undefined = itemImgFromCaller;
  if (itemDef.name === "Torch" && equipment.iconAssetName) {
    touchCampfireFireWebGLInit();
    // Lit + GPU fire: always base torch art (same tick as preload init — no torch_on flash).
    const torchAssetName =
      player.isTorchLit && isCampfireFireWebGLOverlayAvailable()
        ? 'torch.png'
        : equipment.iconAssetName;
    const specificTorchImage = itemImages.get(torchAssetName);
    if (specificTorchImage) {
      imageToRender = specificTorchImage;
    } else {
      console.warn(`[renderEquippedItem] Image for torch state '${torchAssetName}' not found in itemImages map. Falling back.`);
    }
  }

  if (!imageToRender) {
    return;
  }
  // --- End Image Resolution ---

  ctx.save(); // Overall item rendering context save (applies to pivot translation and general orientation)
  
  // Apply teal underwater tint when snorkeling (consistent with other underwater entities)
  if (applyUnderwaterTint) {
    ctx.filter = 'sepia(20%) hue-rotate(140deg) saturate(120%)';
  }
  
  ctx.translate(pivotX, pivotY); 

  // Apply general orientation/scaling based on player direction (and spear specifics)
  if (itemDef.name === "Wooden Spear" || itemDef.name === "Stone Spear" || itemDef.name === "Reed Harpoon") {
    ctx.rotate(rotation + dodgeSpinRad); // spear aim + dodge roll spin
    ctx.scale(spearScaleX, spearScaleY);
  } else if (itemDef.name === "Hunting Bow") {
    ctx.rotate(rotation + dodgeSpinRad);
    ctx.scale(-1, 1); // Flip horizontally
  } else if (itemDef.name === "Crossbow") {
    ctx.rotate(rotation + dodgeSpinRad);
    ctx.scale(-1, 1); // Flip horizontally
  } else if (itemDef.name === "Reed Harpoon Gun") {
    ctx.rotate(rotation + dodgeSpinRad);
    // Apply direction-specific flipping for proper orientation
    switch (player.direction) {
      case 'up':
        ctx.scale(-1, 1); // Flip vertically when facing up
        break;
      case 'left':
        ctx.scale(-1, 1); // Flip vertically when facing left
        break;
      case 'down':
        ctx.scale(-1, -1); // Flip horizontally when facing down
        break;
      case 'right':
        ctx.scale(-1, 1); // Flip horizontally when facing right
        break;
    }
  } else {
    // Non-spear items might have a different base orientation/flip before animation
    // Ensure this scale doesn't affect bandage animation logic if it's drawn separately with its own save/restore
    if (player.direction === 'right' || player.direction === 'up') {
       if (itemDef.name !== "Bandage" && itemDef.name !== "Selo Olive Oil") { // Don't apply this generic flip if it's a bandage or Selo Olive Oil that will handle its own drawing
            ctx.scale(-1, 1); 
       }
    }
  }

  // --- BANDAGE ANIMATION & DRAWING --- 
  let bandageDrawnWithAnimation = false;
  let bandagingStartTimeMs: number | null = null;
  let bandageEffectStillActive = false;

  // Only show bandage animation if we have both an active effect AND the bandage is actually equipped
  if (itemDef.name === "Bandage" && activeConsumableEffects && player.identity) {
    const playerHexId = player.identity.toHexString();
    for (const effect of activeConsumableEffects.values()) {
      // Show animation if player is healing themselves or someone else with this equipped bandage
      if ((effect.effectType.tag === "BandageBurst" && effect.playerId.toHexString() === playerHexId) ||
          (effect.effectType.tag === "RemoteBandageBurst" && effect.playerId.toHexString() === playerHexId)) {
        bandagingStartTimeMs = Number(effect.startedAt.microsSinceUnixEpoch / 1000n);
        
        // Check if the effect is still active by comparing current time with effect end time
        const effectEndTimeMs = Number(effect.endsAt.microsSinceUnixEpoch / 1000n);
        bandageEffectStillActive = now_ms < effectEndTimeMs;
        break;
      }
    }
  }

  // Only animate if both the effect is still active AND within the animation duration
  if (itemDef.name === "Bandage" && bandagingStartTimeMs !== null && bandageEffectStillActive) {
    const elapsedBandagingTime = now_ms - bandagingStartTimeMs;
    if (elapsedBandagingTime >= 0 && elapsedBandagingTime < BANDAGING_ANIMATION_DURATION_MS) {
      const animationProgress = elapsedBandagingTime / BANDAGING_ANIMATION_DURATION_MS;
      const bandagingRotation = Math.sin(animationProgress * Math.PI * BANDAGING_WOBBLES * 2) * BANDAGING_MAX_ROTATION_RAD;
      
      ctx.save(); // Save for bandage specific animation transforms
      // Bandage rotation is applied here. Pivot is already at item center due to prior ctx.translate(pivotX, pivotY)
      // and items are drawn relative to -itemWidth/2, -itemHeight/2.
      ctx.rotate(bandagingRotation); // Apply the wobble
      ctx.drawImage(imageToRender, -itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight); // Draw centered & rotated bandage
      ctx.restore(); // Restore from bandage specific animation
      bandageDrawnWithAnimation = true;
    }
  }
  // --- END BANDAGE ANIMATION & DRAWING --- 

  // --- SELO OLIVE OIL ANIMATION & DRAWING --- 
  let seloOliveOilDrawnWithAnimation = false;
  let seloOliveOilStartTimeMs: number | null = null;
  let seloOliveOilEffectStillActive = false;

  // Only show Selo Olive Oil animation if we have both an active effect AND the Selo Olive Oil is actually equipped
  if (itemDef.name === "Selo Olive Oil" && activeConsumableEffects && player.identity) {
    const playerHexId = player.identity.toHexString();
    for (const effect of activeConsumableEffects.values()) {
      // Show animation if player is using Selo Olive Oil (HealthRegen effect with 2-second duration)
      if (effect.effectType.tag === "HealthRegen" && effect.playerId.toHexString() === playerHexId) {
        // Check if this is a short-duration effect (2 seconds for Selo Olive Oil vs longer for other items)
        const effectDurationMs = Number(effect.endsAt.microsSinceUnixEpoch / 1000n) - Number(effect.startedAt.microsSinceUnixEpoch / 1000n);
        if (effectDurationMs <= 2500) { // 2.5 seconds to account for slight timing variations
          seloOliveOilStartTimeMs = Number(effect.startedAt.microsSinceUnixEpoch / 1000n);
          
          // Check if the effect is still active by comparing current time with effect end time
          const effectEndTimeMs = Number(effect.endsAt.microsSinceUnixEpoch / 1000n);
          seloOliveOilEffectStillActive = now_ms < effectEndTimeMs;
          break;
        }
      }
    }
  }

  // Only animate if both the effect is still active AND within the animation duration
  if (itemDef.name === "Selo Olive Oil" && seloOliveOilStartTimeMs !== null && seloOliveOilEffectStillActive) {
    const elapsedSeloOliveOilTime = now_ms - seloOliveOilStartTimeMs;
    if (elapsedSeloOliveOilTime >= 0 && elapsedSeloOliveOilTime < SELO_OLIVE_OIL_ANIMATION_DURATION_MS) {
      const animationProgress = elapsedSeloOliveOilTime / SELO_OLIVE_OIL_ANIMATION_DURATION_MS;
      const seloOliveOilRotation = Math.sin(animationProgress * Math.PI * SELO_OLIVE_OIL_WOBBLES * 2) * SELO_OLIVE_OIL_MAX_ROTATION_RAD;
      
      ctx.save(); // Save for Selo Olive Oil specific animation transforms
      // Selo Olive Oil rotation is applied here. Pivot is already at item center due to prior ctx.translate(pivotX, pivotY)
      // and items are drawn relative to -itemWidth/2, -itemHeight/2.
      ctx.rotate(seloOliveOilRotation); // Apply the wobble
      ctx.drawImage(imageToRender, -itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight); // Draw centered & rotated Selo Olive Oil
      ctx.restore(); // Restore from Selo Olive Oil specific animation
      seloOliveOilDrawnWithAnimation = true;
    }
  }
  // --- END SELO OLIVE OIL ANIMATION & DRAWING ---

  // --- WATER DRINKING ANIMATION & DRAWING ---
  let waterDrinkingDrawnWithAnimation = false;
  let waterDrinkingStartTimeMs: number | null = null;
  let waterDrinkingEffectStillActive = false;

  // Only show water drinking animation if we have both an active effect AND a water container is actually equipped
  if ((itemDef.name === "Reed Water Bottle" || itemDef.name === "Plastic Water Jug") && activeConsumableEffects && player.identity) {
    const playerHexId = player.identity.toHexString();
    for (const effect of activeConsumableEffects.values()) {
      // Show animation if player is drinking water (WaterDrinking effect with 2-second duration)
      if (effect.effectType.tag === "WaterDrinking" && effect.playerId.toHexString() === playerHexId) {
        waterDrinkingStartTimeMs = Number(effect.startedAt.microsSinceUnixEpoch / 1000n);
        
        // Check if the effect is still active by comparing current time with effect end time
        const effectEndTimeMs = Number(effect.endsAt.microsSinceUnixEpoch / 1000n);
        waterDrinkingEffectStillActive = now_ms < effectEndTimeMs;
        break;
      }
    }
  }

  // Only animate if both the effect is still active AND within the animation duration
  if ((itemDef.name === "Reed Water Bottle" || itemDef.name === "Plastic Water Jug") && waterDrinkingStartTimeMs !== null && waterDrinkingEffectStillActive) {
    const elapsedWaterDrinkingTime = now_ms - waterDrinkingStartTimeMs;
    if (elapsedWaterDrinkingTime >= 0 && elapsedWaterDrinkingTime < WATER_DRINKING_ANIMATION_DURATION_MS) {
      const animationProgress = elapsedWaterDrinkingTime / WATER_DRINKING_ANIMATION_DURATION_MS;
      const waterDrinkingRotation = Math.sin(animationProgress * Math.PI * WATER_DRINKING_WOBBLES * 2) * WATER_DRINKING_MAX_ROTATION_RAD;
      
      ctx.save(); // Save for water drinking specific animation transforms
      // Water drinking rotation is applied here. Pivot is already at item center due to prior ctx.translate(pivotX, pivotY)
      // and items are drawn relative to -itemWidth/2, -itemHeight/2.
      ctx.rotate(waterDrinkingRotation); // Apply the wobble
      ctx.drawImage(imageToRender, -itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight); // Draw centered & rotated water container
      ctx.restore(); // Restore from water drinking specific animation
      waterDrinkingDrawnWithAnimation = true;
    }
  }
  // --- END WATER DRINKING ANIMATION & DRAWING ---

  // --- REGULAR ITEM DRAWING (AND SWING FOR NON-SPEAR/NON-BANDAGE-ANIMATING) --- 
  if (!bandageDrawnWithAnimation && !seloOliveOilDrawnWithAnimation && !waterDrinkingDrawnWithAnimation) {
    ctx.save(); // Save for regular item drawing / swing
    const excludedFromInnerSwingRotate =
      itemDef.name === "Wooden Spear" ||
      itemDef.name === "Stone Spear" ||
      itemDef.name === "Reed Harpoon" ||
      itemDef.name === "Bandage" ||
      itemDef.name === "Selo Olive Oil";
    const rangedWithDedicatedOuterRotate =
      itemDef.name === "Hunting Bow" ||
      itemDef.name === "Crossbow" ||
      itemDef.name === "Reed Harpoon Gun";
    if (!excludedFromInnerSwingRotate && !rangedWithDedicatedOuterRotate) {
      if (itemDef.category?.tag !== "RangedWeapon") {
        ctx.rotate(currentAngle + dodgeSpinRad);
      } else {
        ctx.rotate(rotation + currentAngle + dodgeSpinRad);
      }
    }

    ctx.drawImage(imageToRender, -displayItemWidth / 2, -displayItemHeight / 2, displayItemWidth, displayItemHeight); // Draw centered

    // --- NEW: Draw Loaded Arrow on Bow ---
    if (loadedArrowImage && itemDef.name === "Hunting Bow") {
        const arrowScale = 0.7; // Match projectile size
        const arrowWidth = loadedArrowImage.width * arrowScale;
        const arrowHeight = loadedArrowImage.height * arrowScale;
        // Arrow position and rotation settings per player direction
        let arrowOffsetX = 0; // Independent arrow position
        let arrowOffsetY = 0;
        let arrowRotation = 0; // Independent arrow rotation
        
        switch (player.direction) {
            case 'up':
                arrowOffsetX = -displayItemWidth * 0.15; 
                arrowOffsetY = -displayItemHeight * -0.15; // Arrow nocked further up
                arrowRotation = -Math.PI / 2; // Point arrow upward
                break;
            case 'down':
                arrowOffsetX = displayItemWidth * -0.15;  // Mirrored horizontally
                arrowOffsetY = -displayItemHeight * -0.15; // Mirrored vertically
                arrowRotation = -Math.PI / 2; // Mirrored rotation
                break;
            case 'left':
                arrowOffsetX = displayItemWidth * 0.0; 
                arrowOffsetY = -displayItemHeight * -0.15;
                arrowRotation = Math.PI + (Math.PI / 2); // Point arrow left and rotate 45 degrees counterclockwise
                break;
            case 'right':
                arrowOffsetX = -displayItemWidth * 0.0; 
                arrowOffsetY = -displayItemHeight * 0.0;
                arrowRotation = Math.PI + (Math.PI / 2); // Point arrow left and rotate 45 degrees counterclockwise
                break;
        }
        
        // Draw arrow with independent rotation
        ctx.save(); // Save current context for arrow-specific transforms
        ctx.translate(arrowOffsetX, arrowOffsetY); // Move to arrow position
        ctx.rotate(arrowRotation); // Apply independent arrow rotation
        ctx.drawImage(loadedArrowImage, -arrowWidth / 2, -arrowHeight / 2, arrowWidth, arrowHeight);
        ctx.restore(); // Restore context
    }
    
    // --- NEW: Draw Loaded Arrow on Crossbow ---
    if (loadedArrowImage && itemDef.name === "Crossbow") {
        const arrowScale = 0.7; // Match projectile size
        const arrowWidth = loadedArrowImage.width * arrowScale;
        const arrowHeight = loadedArrowImage.height * arrowScale;
        // Arrow position and rotation settings per player direction
        let arrowOffsetX = 0; // Independent arrow position
        let arrowOffsetY = 0;
        let arrowRotation = 0; // Independent arrow rotation
        
        switch (player.direction) {
            case 'up':
                arrowOffsetX = -displayItemWidth * 0.15; 
                arrowOffsetY = -displayItemHeight * -0.15; // Arrow nocked further up
                arrowRotation = -Math.PI / 2; // Point arrow upward
                break;
            case 'down':
                arrowOffsetX = displayItemWidth * -0.15;  // Mirrored horizontally
                arrowOffsetY = -displayItemHeight * -0.15; // Mirrored vertically
                arrowRotation = -Math.PI / 2; // Mirrored rotation
                break;
            case 'left':
                arrowOffsetX = displayItemWidth * 0.0; 
                arrowOffsetY = -displayItemHeight * -0.15;
                arrowRotation = Math.PI + (Math.PI / 2); // Point arrow left and rotate 45 degrees counterclockwise
                break;
            case 'right':
                arrowOffsetX = -displayItemWidth * 0.0; 
                arrowOffsetY = -displayItemHeight * 0.0;
                arrowRotation = Math.PI + (Math.PI / 2); // Point arrow left and rotate 45 degrees counterclockwise
                break;
        }
        
        // Draw bolt with independent rotation
        ctx.save(); // Save current context for bolt-specific transforms
        ctx.translate(arrowOffsetX, arrowOffsetY); // Move to bolt position
        ctx.rotate(arrowRotation); // Apply independent bolt rotation
        ctx.drawImage(loadedArrowImage, -arrowWidth / 2, -arrowHeight / 2, arrowWidth, arrowHeight);
        ctx.restore(); // Restore context
    }
    
    // --- NEW: Draw Loaded Dart on Reed Harpoon Gun ---
    if (loadedArrowImage && itemDef.name === "Reed Harpoon Gun") {
        const dartScale = 0.7; // Match projectile size
        const dartWidth = loadedArrowImage.width * dartScale;
        const dartHeight = loadedArrowImage.height * dartScale;
        // Dart position and rotation settings per player direction
        let dartOffsetX = 0; // Independent dart position
        let dartOffsetY = 0;
        let dartRotation = 0; // Independent dart rotation
        
        switch (player.direction) {
            case 'up':
                dartOffsetX = -displayItemWidth * 0.15; 
                dartOffsetY = -displayItemHeight * -0.15;
                dartRotation = -Math.PI / 2; // Point dart upward
                break;
            case 'down':
                dartOffsetX = displayItemWidth * -0.15;
                dartOffsetY = -displayItemHeight * -0.15;
                dartRotation = -Math.PI / 2;
                break;
            case 'left':
                dartOffsetX = displayItemWidth * 0.0; 
                dartOffsetY = -displayItemHeight * -0.15;
                dartRotation = Math.PI + (Math.PI / 2);
                break;
            case 'right':
                dartOffsetX = -displayItemWidth * 0.0; 
                dartOffsetY = -displayItemHeight * 0.0;
                dartRotation = Math.PI + (Math.PI / 2);
                break;
        }
        
        // Draw dart with independent rotation
        ctx.save(); // Save current context for dart-specific transforms
        ctx.translate(dartOffsetX, dartOffsetY); // Move to dart position
        ctx.rotate(dartRotation); // Apply independent dart rotation
        ctx.drawImage(loadedArrowImage, -dartWidth / 2, -dartHeight / 2, dartWidth, dartHeight);
        ctx.restore(); // Restore context
    }
    // --- END NEW ---

    ctx.restore(); // Restore from regular item drawing / swing
  }

  ctx.restore(); // Restore overall item rendering context (matches the first ctx.save() in this block)

  // Note: Melee swipe arc is drawn by renderMeleeSwipeArcIfSwinging() from renderingUtils
  // AFTER the player sprite, so it's always visible on top (not hidden behind player for up/left).

  // Note: Underwater tinting for equipped items now uses CSS filter (ctx.filter) applied at the start
  // of this function. This approach is consistent with other underwater entities (coral, fumaroles,
  // seaweed, dropped items) and avoids the visual artifacts that the old offscreen canvas approach caused.


}; 