/**
 * Composites WebGL2 campfire fire/smoke onto the main world canvas (screen space, like water overlay).
 */

import {
  initCampfireFireWebGL,
  renderCampfireFireWebGL,
  clearCampfireFireWebGL,
  type CampfireFireGpuEmitter,
} from './campfireFireWebGL';

export type { CampfireFireGpuEmitter };

let wctx: ReturnType<typeof initCampfireFireWebGL> | null | undefined;
let loggedCampfireWebGLPath = false;

const PX = 4;

/** Sync init so sprite pick (before overlay composite) knows if GPU fire path is active. No-op if already tried. */
export function touchCampfireFireWebGLInit(): void {
  if (wctx !== undefined) return;
  wctx = initCampfireFireWebGL();
  if (wctx && !loggedCampfireWebGLPath) {
    loggedCampfireWebGLPath = true;
    console.log('[CampfireFire] Using WebGL2 (GPU) path');
  }
}

export function isCampfireFireWebGLOverlayAvailable(): boolean {
  return wctx != null;
}

export function renderCampfireFireOverlay(
  ctx: CanvasRenderingContext2D,
  cameraOffsetX: number,
  cameraOffsetY: number,
  canvasWidth: number,
  canvasHeight: number,
  nowMs: number,
  emitters: readonly CampfireFireGpuEmitter[],
): void {
  if (emitters.length === 0 || canvasWidth <= 0 || canvasHeight <= 0) return;

  touchCampfireFireWebGLInit();
  if (!wctx) return;

  const camX = -cameraOffsetX;
  const camY = -cameraOffsetY;
  const ok = renderCampfireFireWebGL(wctx, camX, camY, canvasWidth, canvasHeight, nowMs, emitters);
  if (!ok) {
    clearCampfireFireWebGL();
    wctx = undefined;
    return;
  }

  const bw = wctx.canvas.width;
  const bh = wctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(wctx.canvas, 0, 0, bw, bh, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

export function clearCampfireFireOverlay(): void {
  clearCampfireFireWebGL();
  wctx = undefined;
}

export { PX as CAMPFIRE_FIRE_OVERLAY_PIXEL_SCALE };
