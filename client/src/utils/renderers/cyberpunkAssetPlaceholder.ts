export type CyberpunkPlaceholderShape = 'diamond' | 'circle' | 'rect' | 'plant' | 'animal' | 'item';

export interface CyberpunkAssetPlaceholderOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  nowMs: number;
  shape?: CyberpunkPlaceholderShape;
  label?: string;
  alpha?: number;
  rotation?: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function renderCyberpunkAssetPlaceholder(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    width,
    height,
    nowMs,
    shape = 'diamond',
    label,
    alpha = 1,
    rotation = 0,
  }: CyberpunkAssetPlaceholderOptions,
): void {
  const safeWidth = Math.max(10, width);
  const safeHeight = Math.max(10, height);
  const pulse = 0.58 + Math.sin(nowMs / 160 + x * 0.01 + y * 0.01) * 0.22;
  const opacity = clamp(alpha, 0, 1);
  const halfW = safeWidth / 2;
  const halfH = safeHeight / 2;
  const scanY = -halfH + ((nowMs / 9 + x + y) % safeHeight);

  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.globalAlpha *= opacity;
  ctx.shadowColor = 'rgba(0, 221, 255, 0.85)';
  ctx.shadowBlur = 10;
  ctx.lineWidth = Math.max(1, Math.min(3, safeWidth / 42));
  ctx.strokeStyle = `rgba(0, 221, 255, ${pulse})`;
  ctx.fillStyle = 'rgba(8, 14, 32, 0.48)';

  ctx.beginPath();
  if (shape === 'circle' || shape === 'animal') {
    ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
  } else if (shape === 'plant') {
    ctx.moveTo(0, -halfH);
    ctx.bezierCurveTo(halfW * 0.82, -halfH * 0.45, halfW * 0.55, halfH * 0.35, 0, halfH);
    ctx.bezierCurveTo(-halfW * 0.55, halfH * 0.35, -halfW * 0.82, -halfH * 0.45, 0, -halfH);
  } else if (shape === 'item') {
    ctx.rect(-halfW, -halfH, safeWidth, safeHeight);
  } else if (shape === 'rect') {
    ctx.roundRect?.(-halfW, -halfH, safeWidth, safeHeight, Math.min(8, halfW, halfH));
    if (!ctx.roundRect) ctx.rect(-halfW, -halfH, safeWidth, safeHeight);
  } else {
    ctx.moveTo(0, -halfH);
    ctx.lineTo(halfW, 0);
    ctx.lineTo(0, halfH);
    ctx.lineTo(-halfW, 0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255, 0, 255, ${0.55 + pulse * 0.25})`;
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.65, scanY);
  ctx.lineTo(halfW * 0.65, scanY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 221, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.5, 0);
  ctx.lineTo(halfW * 0.5, 0);
  ctx.moveTo(0, -halfH * 0.5);
  ctx.lineTo(0, halfH * 0.5);
  ctx.stroke();

  if (label) {
    ctx.fillStyle = 'rgba(210, 245, 255, 0.82)';
    ctx.font = `${Math.max(9, Math.min(14, safeWidth / 4))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 3).toUpperCase(), 0, 0);
  }

  ctx.restore();
}
