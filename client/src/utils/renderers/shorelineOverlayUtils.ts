/**
 * Shoreline Overlay Utilities
 *
 * Renders a thin animated teal shoreline where Grass meets HotSpringWater.
 * The mask is derived from pixel warmth along grass/beach→water boundaries on a
 * transition atlas tile sheet **when one is loaded** (non‑GPU canvas fallback path).
 *
 * When transitions are procedural‑blend/GPU only, no Grass_Beach atlas image exists in
 * cache → initialization returns null and the overlay is skipped (no asset imports).
 */

import { TILE_SIZE as AUTOTILE_TILE_SIZE, TILESET_COLS, TILESET_ROWS } from '../dualGridAutotile';

// =============================================================================
// CONSTANTS
// =============================================================================

const EDGE_THRESHOLD = 33;
/** Hot spring / grass+hotspring water art is often higher-chroma; looser threshold picks up the shore line */
const HOT_SPRING_SHORE_EDGE_THRESHOLD = 20;
const WAVE_SPEED = 2.8;
const WAVE_OFFSET_PX = 2.8;
const WAVE_LAYERS = 3;

interface ShorelineRgb {
  r: number;
  g: number;
  b: number;
}

const SHORE_COLOR: ShorelineRgb = { r: 145, g: 190, b: 225 };
const BEACH_COLOR: ShorelineRgb = { r: 200, g: 225, b: 235 };

/** Dark teal edge + mid teal foam — reads on bright aqua HotSpringWater tiles */
const HOT_SPRING_SHORE_COLOR: ShorelineRgb = { r: 10, g: 72, b: 82 };
const HOT_SPRING_WAVE_COLOR: ShorelineRgb = { r: 32, g: 118, b: 128 };

const getWarmth = (r: number, g: number, b: number): number =>
  (r + g) - b * 1.4;

// =============================================================================
// SHORELINE MASK CACHE (Grass ↔ HotSpringWater only)
// =============================================================================

interface ShorelineMaskCache {
  canvas: HTMLCanvasElement;
  waveCanvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ready: boolean;
}

let grassHotSpringMaskCache: ShorelineMaskCache | null = null;
let grassHotSpringMaskLoadPromise: Promise<ShorelineMaskCache | null> | null = null;

/** 8-neighbor offsets for connectivity check */
const DX8 = [-1, 0, 1, -1, 1, -1, 0, 1];
const DY8 = [-1, -1, -1, 0, 0, 1, 1, 1];

function processTileRegion(
  data: Uint8ClampedArray,
  tileW: number,
  tileH: number,
  stride: number,
  edgeThreshold: number = EDGE_THRESHOLD,
  shoreRgb: ShorelineRgb = SHORE_COLOR
): Uint8Array {
  const edgeMask = new Uint8Array(tileW * tileH * 4);
  const dx = [-1, 1, 0, 0];
  const dy = [0, 0, -1, 1];

  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
      const idx = y * tileW + x;
      const i = y * stride + x * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 64) continue;

      const warmth = getWarmth(r, g, b);

      let maxNeighborWarmth = -999;
      for (let k = 0; k < 4; k++) {
        const nx = x + dx[k];
        const ny = y + dy[k];
        if (nx < 0 || nx >= tileW || ny < 0 || ny >= tileH) continue;
        const ni = ny * stride + nx * 4;
        if (data[ni + 3] < 64) continue;
        const nw = getWarmth(data[ni], data[ni + 1], data[ni + 2]);
        maxNeighborWarmth = Math.max(maxNeighborWarmth, nw);
      }

      const atBoundary = (maxNeighborWarmth - warmth) >= edgeThreshold;
      const onWaterSide = warmth < maxNeighborWarmth;

      if (atBoundary && onWaterSide) {
        const base = idx * 4;
        const alpha = Math.min(255, Math.max(0, 220 - Math.abs(warmth) * 2));
        edgeMask[base] = shoreRgb.r;
        edgeMask[base + 1] = shoreRgb.g;
        edgeMask[base + 2] = shoreRgb.b;
        edgeMask[base + 3] = alpha;
      }
    }
  }

  const cleaned = new Uint8Array(tileW * tileH * 4);
  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
      const idx = y * tileW + x;
      const base = idx * 4;
      if (edgeMask[base + 3] === 0) continue;
      let edgeNeighbors = 0;
      for (let k = 0; k < 8; k++) {
        const nx = x + DX8[k];
        const ny = y + DY8[k];
        if (nx >= 0 && nx < tileW && ny >= 0 && ny < tileH) {
          if (edgeMask[(ny * tileW + nx) * 4 + 3] > 0) edgeNeighbors++;
        }
      }
      if (edgeNeighbors >= 2) {
        cleaned[base] = edgeMask[base];
        cleaned[base + 1] = edgeMask[base + 1];
        cleaned[base + 2] = edgeMask[base + 2];
        cleaned[base + 3] = edgeMask[base + 3];
      }
    }
  }

  const shoreline = new Uint8Array(tileW * tileH * 4);
  const expand = 1;
  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
      const idx = y * tileW + x;
      const i = y * stride + x * 4;
      const myWarmth = getWarmth(data[i], data[i + 1], data[i + 2]);
      let maxA = cleaned[idx * 4 + 3];
      let addPixel = maxA > 0;
      if (!addPixel) {
        for (let dy = -expand; dy <= expand; dy++) {
          for (let dx = -expand; dx <= expand; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < tileW && ny >= 0 && ny < tileH) {
              const nIdx = ny * tileW + nx;
              const nA = cleaned[nIdx * 4 + 3];
              if (nA > 0) {
                const ni = ny * stride + nx * 4;
                const nWarmth = getWarmth(data[ni], data[ni + 1], data[ni + 2]);
                if (myWarmth >= nWarmth) {
                  maxA = Math.max(maxA, nA);
                  addPixel = true;
                }
              }
            }
          }
        }
      }
      if (addPixel && maxA > 0) {
        const base = idx * 4;
        shoreline[base] = shoreRgb.r;
        shoreline[base + 1] = shoreRgb.g;
        shoreline[base + 2] = shoreRgb.b;
        shoreline[base + 3] = Math.min(255, maxA + 60);
      }
    }
  }

  return shoreline;
}

async function generateShorelineMasks(
  tilesetImg: HTMLImageElement,
  edgeThreshold: number = EDGE_THRESHOLD,
  shoreRgb: ShorelineRgb = SHORE_COLOR,
  waveRgb: ShorelineRgb = BEACH_COLOR
): Promise<{ shoreCanvas: HTMLCanvasElement; waveCanvas: HTMLCanvasElement }> {
  const fullW = tilesetImg.naturalWidth;
  const fullH = tilesetImg.naturalHeight;

  const off = document.createElement('canvas');
  off.width = fullW;
  off.height = fullH;
  const offCtx = off.getContext('2d')!;
  offCtx.drawImage(tilesetImg, 0, 0);
  const imgData = offCtx.getImageData(0, 0, fullW, fullH);
  const data = imgData.data;
  const stride = fullW * 4;

  const shoreCanvas = document.createElement('canvas');
  shoreCanvas.width = fullW;
  shoreCanvas.height = fullH;
  const shoreCtx = shoreCanvas.getContext('2d')!;
  const shoreData = shoreCtx.createImageData(fullW, fullH);

  for (let row = 0; row < TILESET_ROWS; row++) {
    for (let col = 0; col < TILESET_COLS; col++) {
      const sx = col * AUTOTILE_TILE_SIZE;
      const sy = row * AUTOTILE_TILE_SIZE;

      if (sx + AUTOTILE_TILE_SIZE > fullW || sy + AUTOTILE_TILE_SIZE > fullH) continue;

      const tileData = new Uint8ClampedArray(AUTOTILE_TILE_SIZE * AUTOTILE_TILE_SIZE * 4);
      for (let y = 0; y < AUTOTILE_TILE_SIZE; y++) {
        for (let x = 0; x < AUTOTILE_TILE_SIZE; x++) {
          const srcIdx = (sy + y) * stride + (sx + x) * 4;
          const dstIdx = (y * AUTOTILE_TILE_SIZE + x) * 4;
          tileData[dstIdx] = data[srcIdx];
          tileData[dstIdx + 1] = data[srcIdx + 1];
          tileData[dstIdx + 2] = data[srcIdx + 2];
          tileData[dstIdx + 3] = data[srcIdx + 3];
        }
      }

      const shoreline = processTileRegion(
        tileData,
        AUTOTILE_TILE_SIZE,
        AUTOTILE_TILE_SIZE,
        AUTOTILE_TILE_SIZE * 4,
        edgeThreshold,
        shoreRgb
      );

      for (let y = 0; y < AUTOTILE_TILE_SIZE; y++) {
        for (let x = 0; x < AUTOTILE_TILE_SIZE; x++) {
          const srcIdx = (y * AUTOTILE_TILE_SIZE + x) * 4;
          const outIdx = ((sy + y) * fullW + (sx + x)) * 4;
          if (shoreline[srcIdx + 3] > 0) {
            shoreData.data[outIdx] = shoreline[srcIdx];
            shoreData.data[outIdx + 1] = shoreline[srcIdx + 1];
            shoreData.data[outIdx + 2] = shoreline[srcIdx + 2];
            shoreData.data[outIdx + 3] = shoreline[srcIdx + 3];
          }
        }
      }
    }
  }

  shoreCtx.putImageData(shoreData, 0, 0);

  const waveCanvas = document.createElement('canvas');
  waveCanvas.width = fullW;
  waveCanvas.height = fullH;
  const waveCtx = waveCanvas.getContext('2d')!;
  waveCtx.drawImage(shoreCanvas, 0, 0);
  const waveData = waveCtx.getImageData(0, 0, fullW, fullH);
  const wavePixels = waveData.data;
  for (let i = 0; i < wavePixels.length; i += 4) {
    if (wavePixels[i + 3] > 0) {
      wavePixels[i] = waveRgb.r;
      wavePixels[i + 1] = waveRgb.g;
      wavePixels[i + 2] = waveRgb.b;
    }
  }
  waveCtx.putImageData(waveData, 0, 0);

  return { shoreCanvas, waveCanvas };
}

/**
 * Build shoreline masks from a loaded Grass_Beach transition atlas (canvas fallback path).
 * Returns null if no image — GPU procedural blends do not ship this atlas.
 */
export async function initGrassHotSpringShorelineMask(
  grassBeachImage?: HTMLImageElement | null
): Promise<ShorelineMaskCache | null> {
  if (grassHotSpringMaskCache?.ready) return grassHotSpringMaskCache;
  if (grassHotSpringMaskLoadPromise) return grassHotSpringMaskLoadPromise;

  if (!grassBeachImage?.complete || grassBeachImage.naturalWidth <= 0) {
    return null;
  }

  grassHotSpringMaskLoadPromise = (async () => {
    try {
      const img = grassBeachImage;
      const { shoreCanvas, waveCanvas } = await generateShorelineMasks(
        img,
        HOT_SPRING_SHORE_EDGE_THRESHOLD,
        HOT_SPRING_SHORE_COLOR,
        HOT_SPRING_WAVE_COLOR
      );
      grassHotSpringMaskCache = {
        canvas: shoreCanvas,
        waveCanvas,
        ctx: shoreCanvas.getContext('2d')!,
        ready: true,
      };
      return grassHotSpringMaskCache;
    } catch (e) {
      console.warn('[ShorelineOverlay] Failed to generate grass+hotspring mask:', e);
      return null;
    }
  })();

  return grassHotSpringMaskLoadPromise;
}

/**
 * Render animated shoreline for Grass ↔ HotSpringWater when a mask exists.
 */
export function renderShorelineOverlay(
  ctx: CanvasRenderingContext2D,
  spriteCoords: { x: number; y: number; width: number; height: number },
  destX: number,
  destY: number,
  destSize: number,
  flipHorizontal: boolean,
  flipVertical: boolean,
  currentTimeMs: number
): void {
  const cache = grassHotSpringMaskCache;
  const t = currentTimeMs * 0.001;

  ctx.save();

  if (flipHorizontal || flipVertical) {
    const centerX = destX + destSize / 2;
    const centerY = destY + destSize / 2;
    ctx.translate(centerX, centerY);
    if (flipHorizontal) ctx.scale(-1, 1);
    if (flipVertical) ctx.scale(1, -1);
    ctx.translate(-centerX, -centerY);
  }

  if (!cache?.ready) {
    ctx.restore();
    return;
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
  ctx.drawImage(
    cache.canvas,
    Math.floor(spriteCoords.x),
    Math.floor(spriteCoords.y),
    Math.floor(spriteCoords.width),
    Math.floor(spriteCoords.height),
    destX,
    destY,
    Math.floor(destSize),
    Math.floor(destSize)
  );

  ctx.globalCompositeOperation = 'source-over';
  const tileScale = destSize / AUTOTILE_TILE_SIZE;
  const offsetPx = WAVE_OFFSET_PX * Math.max(0.5, tileScale / 4);
  for (let w = 0; w < WAVE_LAYERS; w++) {
    const phase = t * WAVE_SPEED + w * 0.7;
    const s = Math.sin(phase);
    const dx = s * offsetPx;
    const dy = Math.sin(phase + 0.5) * offsetPx;
    const alpha = 0.75 * (1 - w * 0.35) * (0.5 + 0.5 * s);

    ctx.save();
    ctx.globalAlpha = Math.max(0.2, alpha);
    ctx.translate(dx, dy);
    ctx.drawImage(
      cache.waveCanvas,
      Math.floor(spriteCoords.x),
      Math.floor(spriteCoords.y),
      Math.floor(spriteCoords.width),
      Math.floor(spriteCoords.height),
      destX,
      destY,
      Math.floor(destSize),
      Math.floor(destSize)
    );
    ctx.restore();
  }

  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

export function isGrassHotSpringShorelineMaskReady(): boolean {
  return grassHotSpringMaskCache?.ready ?? false;
}
