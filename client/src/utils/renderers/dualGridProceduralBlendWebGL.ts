import type { CornerWeights } from './dualGridCornerBlend';

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position;
  gl_Position = vec4(a_position.x * 2.0 - 1.0, 1.0 - a_position.y * 2.0, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texA;
uniform sampler2D u_texB;
uniform vec2 u_worldOriginPx;
uniform float u_quadSizePx;
uniform float u_tileSizePx;
uniform vec4 u_wB; // TL, TR, BL, BR weights for terrain B

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += valueNoise(p) * amp;
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

float luminance(vec3 rgb) {
  return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 worldPx = u_worldOriginPx + v_uv * u_quadSizePx;
  vec2 tileUv = fract(worldPx / max(u_tileSizePx, 1.0));

  vec4 texA = texture(u_texA, tileUv);
  vec4 texB = texture(u_texB, tileUv);

  float top = mix(u_wB.x, u_wB.y, v_uv.x);
  float bottom = mix(u_wB.z, u_wB.w, v_uv.x);
  float intention = clamp(mix(top, bottom, v_uv.y), 0.0, 1.0);

  float edgeInfluence = 1.0 - smoothstep(0.18, 0.46, abs(intention - 0.5));
  float coarseNoise = fbm(worldPx * 0.018);
  float fineNoise = fbm(worldPx * 0.071 + vec2(17.0, -9.0));
  float heightDelta = luminance(texB.rgb) - luminance(texA.rgb);

  float mask = intention;
  mask += (coarseNoise - 0.5) * 0.30 * edgeInfluence;
  mask += (fineNoise - 0.5) * 0.10 * edgeInfluence;
  mask += heightDelta * 0.18 * edgeInfluence;
  mask = smoothstep(0.40, 0.60, mask);

  vec3 rgb = mix(texA.rgb, texB.rgb, mask);
  fragColor = vec4(rgb, 1.0);
}
`;

const MAX_GENERATED_CACHE_ENTRIES = 512;
const SHORE_RGB = { r: 145, g: 190, b: 225 };
const WAVE_RGB = { r: 200, g: 225, b: 235 };
const WAVE_SPEED = 2.8;
/** Keep foam motion subtle so it stays glued to the beach contour. */
const WAVE_OFFSET_PX = 0.85;
const WAVE_LAYERS = 3;
/**
 * Shoreline follows the same sea-weight field as terrain (`computeBlendMask`), not RGB warmth.
 * Center the foam on the rendered beach/sea transition and thicken it explicitly so it
 * reads as a continuous shoreline instead of sparse contour dots.
 */
const SHORELINE_MASK_ISO = 0.5;
const SHORELINE_MASK_HALF_WIDTH = 0.22;
const SHORELINE_FOAM_RADIUS_PX = 2;

export interface ProceduralDualGridBlendContext {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    program: WebGLProgram;
    buffer: WebGLBuffer;
    aLoc: number;
    uLoc: Record<string, WebGLUniformLocation>;
    textures: WeakMap<HTMLImageElement, WebGLTexture>;
}

export interface RenderProceduralDualGridLayerArgs {
    imageA: HTMLImageElement;
    imageB: HTMLImageElement;
    cornerWeightsB: CornerWeights;
    worldOriginX: number;
    worldOriginY: number;
    pixelSize: number;
    tileSize: number;
}

export interface RenderProceduralBeachSeaShorelineArgs {
    ctx: CanvasRenderingContext2D;
    imageA: HTMLImageElement;
    imageB: HTMLImageElement;
    cornerWeightsB: CornerWeights;
    worldOriginX: number;
    worldOriginY: number;
    destX: number;
    destY: number;
    destSize: number;
    tileSize: number;
    currentTimeMs: number;
}

interface ImageSampler {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

let ctx: ProceduralDualGridBlendContext | null = null;
let initFailed = false;
const imageSamplerCache = new WeakMap<HTMLImageElement, ImageSampler>();
const cpuLayerCache = new Map<string, HTMLCanvasElement>();
const shorelineCache = new Map<string, { shoreCanvas: HTMLCanvasElement; waveCanvas: HTMLCanvasElement }>();

function fract(n: number): number {
    return n - Math.floor(n);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function hash21(x: number, y: number): number {
    const px = fract(x * 0.1031);
    const py = fract(y * 0.1031);
    const dotp = px * (py + 45.32) + py * (px + 45.32);
    return fract((px + dotp) * (py + dotp));
}

function valueNoise(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = fract(x);
    const fy = fract(y);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash21(ix, iy);
    const b = hash21(ix + 1, iy);
    const c = hash21(ix, iy + 1);
    const d = hash21(ix + 1, iy + 1);
    const top = a + (b - a) * ux;
    const bottom = c + (d - c) * ux;
    return top + (bottom - top) * uy;
}

function fbm(x: number, y: number): number {
    let value = 0;
    let amplitude = 0.5;
    let px = x;
    let py = y;
    for (let i = 0; i < 4; i += 1) {
        value += valueNoise(px, py) * amplitude;
        px *= 2.03;
        py *= 2.03;
        amplitude *= 0.5;
    }
    return value;
}

function luminance(r: number, g: number, b: number): number {
    return r * 0.299 + g * 0.587 + b * 0.114;
}

function cacheSetWithTrim<T>(map: Map<string, T>, key: string, value: T): void {
    if (map.size >= MAX_GENERATED_CACHE_ENTRIES) {
        map.clear();
    }
    map.set(key, value);
}

function getImageSampler(image: HTMLImageElement): ImageSampler | null {
    const cached = imageSamplerCache.get(image);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return null;

    ctx2d.drawImage(image, 0, 0);
    const imageData = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
    const sampler = {
        width: canvas.width,
        height: canvas.height,
        data: imageData.data,
    };
    imageSamplerCache.set(image, sampler);
    return sampler;
}

function sampleRepeatRgb(
    sampler: ImageSampler,
    worldX: number,
    worldY: number,
    tileSize: number
): { r: number; g: number; b: number } {
    const u = fract(worldX / Math.max(tileSize, 1));
    const v = fract(worldY / Math.max(tileSize, 1));
    const x = Math.min(sampler.width - 1, Math.floor(u * sampler.width));
    const y = Math.min(sampler.height - 1, Math.floor(v * sampler.height));
    const idx = (y * sampler.width + x) * 4;
    return {
        r: sampler.data[idx],
        g: sampler.data[idx + 1],
        b: sampler.data[idx + 2],
    };
}

function computeBlendMask(
    samplerA: ImageSampler,
    samplerB: ImageSampler,
    cornerWeightsB: CornerWeights,
    worldX: number,
    worldY: number,
    u: number,
    v: number,
    tileSize: number
): number {
    const texA = sampleRepeatRgb(samplerA, worldX, worldY, tileSize);
    const texB = sampleRepeatRgb(samplerB, worldX, worldY, tileSize);

    const top = cornerWeightsB.tl + (cornerWeightsB.tr - cornerWeightsB.tl) * u;
    const bottom = cornerWeightsB.bl + (cornerWeightsB.br - cornerWeightsB.bl) * u;
    const intention = Math.max(0, Math.min(1, top + (bottom - top) * v));

    const edgeInfluence = 1 - smoothstep(0.18, 0.46, Math.abs(intention - 0.5));
    const coarseNoise = fbm(worldX * 0.018, worldY * 0.018);
    const fineNoise = fbm(worldX * 0.071 + 17, worldY * 0.071 - 9);
    const heightDelta = luminance(texB.r, texB.g, texB.b) - luminance(texA.r, texA.g, texA.b);

    let mask = intention;
    mask += (coarseNoise - 0.5) * 0.30 * edgeInfluence;
    mask += (fineNoise - 0.5) * 0.10 * edgeInfluence;
    mask += heightDelta * 0.18 * edgeInfluence;
    return smoothstep(0.4, 0.6, mask);
}

function buildCacheKey(
    prefix: string,
    imageA: HTMLImageElement,
    imageB: HTMLImageElement,
    cornerWeightsB: CornerWeights,
    worldOriginX: number,
    worldOriginY: number,
    pixelSize: number,
    tileSize: number
): string {
    return [
        prefix,
        imageA.currentSrc || imageA.src,
        imageB.currentSrc || imageB.src,
        cornerWeightsB.tl,
        cornerWeightsB.tr,
        cornerWeightsB.bl,
        cornerWeightsB.br,
        worldOriginX,
        worldOriginY,
        pixelSize,
        tileSize,
    ].join('|');
}

function buildProceduralLayerCanvas(
    imageA: HTMLImageElement,
    imageB: HTMLImageElement,
    cornerWeightsB: CornerWeights,
    worldOriginX: number,
    worldOriginY: number,
    pixelSize: number,
    tileSize: number
): HTMLCanvasElement | null {
    const samplerA = getImageSampler(imageA);
    const samplerB = getImageSampler(imageB);
    if (!samplerA || !samplerB) return null;

    const size = Math.ceil(pixelSize);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return null;

    const imageData = ctx2d.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y += 1) {
        const v = (y + 0.5) / size;
        for (let x = 0; x < size; x += 1) {
            const u = (x + 0.5) / size;
            const worldX = worldOriginX + u * pixelSize;
            const worldY = worldOriginY + v * pixelSize;
            const mask = computeBlendMask(samplerA, samplerB, cornerWeightsB, worldX, worldY, u, v, tileSize);
            const texA = sampleRepeatRgb(samplerA, worldX, worldY, tileSize);
            const texB = sampleRepeatRgb(samplerB, worldX, worldY, tileSize);
            const idx = (y * size + x) * 4;
            data[idx] = Math.round(texA.r + (texB.r - texA.r) * mask);
            data[idx + 1] = Math.round(texA.g + (texB.g - texA.g) * mask);
            data[idx + 2] = Math.round(texA.b + (texB.b - texA.b) * mask);
            data[idx + 3] = 255;
        }
    }
    ctx2d.putImageData(imageData, 0, 0);
    return canvas;
}

function cloneCanvas(source: HTMLCanvasElement, size: number): HTMLCanvasElement | null {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return null;
    ctx2d.drawImage(source, 0, 0, size, size);
    return canvas;
}

function buildProceduralShorelineCanvases(
    imageA: HTMLImageElement,
    imageB: HTMLImageElement,
    cornerWeightsB: CornerWeights,
    worldOriginX: number,
    worldOriginY: number,
    pixelSize: number,
    tileSize: number
): { shoreCanvas: HTMLCanvasElement; waveCanvas: HTMLCanvasElement } | null {
    const samplerA = getImageSampler(imageA);
    const samplerB = getImageSampler(imageB);
    if (!samplerA || !samplerB) return null;

    const size = Math.ceil(pixelSize);
    const seaMask = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
        const v = (y + 0.5) / size;
        for (let x = 0; x < size; x += 1) {
            const u = (x + 0.5) / size;
            const worldX = worldOriginX + u * pixelSize;
            const worldY = worldOriginY + v * pixelSize;
            seaMask[y * size + x] = computeBlendMask(
                samplerA,
                samplerB,
                cornerWeightsB,
                worldX,
                worldY,
                u,
                v,
                tileSize
            );
        }
    }

    const edgeAlpha = new Uint8Array(size * size);
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const idx = y * size + x;
            const m = seaMask[idx];
            const distanceFromShoreline = Math.abs(m - SHORELINE_MASK_ISO);
            const bandStrength = 1 - Math.min(1, distanceFromShoreline / SHORELINE_MASK_HALF_WIDTH);
            if (bandStrength <= 0) continue;
            edgeAlpha[idx] = Math.min(255, Math.max(96, Math.round(120 + bandStrength * 135)));
        }
    }

    const shoreline = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            let maxAlpha = edgeAlpha[y * size + x];
            for (let oy = -SHORELINE_FOAM_RADIUS_PX; oy <= SHORELINE_FOAM_RADIUS_PX; oy += 1) {
                for (let ox = -SHORELINE_FOAM_RADIUS_PX; ox <= SHORELINE_FOAM_RADIUS_PX; ox += 1) {
                    const nx = x + ox;
                    const ny = y + oy;
                    if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
                    const distance = Math.hypot(ox, oy);
                    if (distance > SHORELINE_FOAM_RADIUS_PX) continue;
                    const neighborAlpha = edgeAlpha[ny * size + nx];
                    if (neighborAlpha <= 0) continue;
                    const falloff = 1 - distance / (SHORELINE_FOAM_RADIUS_PX + 1);
                    maxAlpha = Math.max(maxAlpha, Math.round(neighborAlpha * falloff));
                }
            }

            if (maxAlpha <= 0) continue;
            const i = (y * size + x) * 4;
            shoreline[i] = SHORE_RGB.r;
            shoreline[i + 1] = SHORE_RGB.g;
            shoreline[i + 2] = SHORE_RGB.b;
            shoreline[i + 3] = maxAlpha;
        }
    }

    const shoreCanvas = document.createElement('canvas');
    shoreCanvas.width = size;
    shoreCanvas.height = size;
    const shoreCtx = shoreCanvas.getContext('2d');
    if (!shoreCtx) return null;

    const shoreData = shoreCtx.createImageData(size, size);
    const waveCanvas = document.createElement('canvas');
    waveCanvas.width = size;
    waveCanvas.height = size;
    const waveCtx = waveCanvas.getContext('2d');
    if (!waveCtx) return null;
    const waveData = waveCtx.createImageData(size, size);
    const wavePixels = waveData.data;

    for (let i = 0; i < shoreline.length; i += 4) {
        if (shoreline[i + 3] <= 0) continue;
        shoreData.data[i] = shoreline[i];
        shoreData.data[i + 1] = shoreline[i + 1];
        shoreData.data[i + 2] = shoreline[i + 2];
        shoreData.data[i + 3] = shoreline[i + 3];
        wavePixels[i] = WAVE_RGB.r;
        wavePixels[i + 1] = WAVE_RGB.g;
        wavePixels[i + 2] = WAVE_RGB.b;
        wavePixels[i + 3] = shoreline[i + 3];
    }
    shoreCtx.putImageData(shoreData, 0, 0);
    waveCtx.putImageData(waveData, 0, 0);

    return { shoreCanvas, waveCanvas };
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.warn('[DualGridProceduralBlend] VS compile:', gl.getShaderInfoLog(vs));
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return null;
    }

    gl.shaderSource(fs, FRAGMENT_SHADER);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.warn('[DualGridProceduralBlend] FS compile:', gl.getShaderInfoLog(fs));
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return null;
    }

    const program = gl.createProgram();
    if (!program) {
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return null;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn('[DualGridProceduralBlend] Link:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

export function initProceduralDualGridBlendWebGL(): ProceduralDualGridBlendContext | null {
    if (ctx) return ctx;
    if (initFailed) return null;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
    }) as WebGL2RenderingContext | null;

    if (!gl) {
        const gl1 = canvas.getContext('webgl');
        console.warn(
            '[DualGridProceduralBlend] WebGL2 unavailable, using generated CPU fallback.',
            gl1 ? 'WebGL1 is available but WebGL2 is required.' : 'No WebGL context could be created.'
        );
        initFailed = true;
        return null;
    }

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        ctx = null;
    }, false);

    const program = createProgram(gl);
    if (!program) {
        initFailed = true;
        return null;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
        gl.deleteProgram(program);
        initFailed = true;
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);

    const uniformNames = [
        'u_texA',
        'u_texB',
        'u_worldOriginPx',
        'u_quadSizePx',
        'u_tileSizePx',
        'u_wB',
    ];
    const uLoc: Record<string, WebGLUniformLocation> = {};
    for (const name of uniformNames) {
        const loc = gl.getUniformLocation(program, name);
        if (!loc) {
            console.warn('[DualGridProceduralBlend] Missing uniform:', name);
            gl.deleteProgram(program);
            gl.deleteBuffer(buffer);
            initFailed = true;
            return null;
        }
        uLoc[name] = loc;
    }

    const aLoc = gl.getAttribLocation(program, 'a_position');
    if (aLoc < 0) {
        gl.deleteProgram(program);
        gl.deleteBuffer(buffer);
        initFailed = true;
        return null;
    }

    ctx = {
        canvas,
        gl,
        program,
        buffer,
        aLoc,
        uLoc,
        textures: new WeakMap(),
    };
    return ctx;
}

function getTexture(wctx: ProceduralDualGridBlendContext, image: HTMLImageElement): WebGLTexture | null {
    const cached = wctx.textures.get(image);
    if (cached) return cached;

    const { gl } = wctx;
    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    wctx.textures.set(image, texture);
    return texture;
}

export function renderProceduralDualGridLayer(
    wctx: ProceduralDualGridBlendContext,
    args: RenderProceduralDualGridLayerArgs
): HTMLCanvasElement | null {
    const { imageA, imageB, cornerWeightsB, worldOriginX, worldOriginY, pixelSize, tileSize } = args;
    if (pixelSize <= 0 || tileSize <= 0 || !imageA.complete || !imageB.complete) return null;

    const key = buildCacheKey(
        'layer',
        imageA,
        imageB,
        cornerWeightsB,
        worldOriginX,
        worldOriginY,
        pixelSize,
        tileSize
    );
    const cached = cpuLayerCache.get(key);
    if (cached) return cached;

    const { canvas, gl, program, buffer, aLoc, uLoc } = wctx;
    if (gl.isContextLost()) return null;

    const texA = getTexture(wctx, imageA);
    const texB = getTexture(wctx, imageB);
    if (!texA || !texB) return null;

    const size = Math.ceil(pixelSize);
    if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
    }

    gl.viewport(0, 0, size, size);
    gl.useProgram(program);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(uLoc.u_texA, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.uniform1i(uLoc.u_texB, 1);

    gl.uniform2f(uLoc.u_worldOriginPx, worldOriginX, worldOriginY);
    gl.uniform1f(uLoc.u_quadSizePx, pixelSize);
    gl.uniform1f(uLoc.u_tileSizePx, tileSize);
    gl.uniform4f(
        uLoc.u_wB,
        cornerWeightsB.tl,
        cornerWeightsB.tr,
        cornerWeightsB.bl,
        cornerWeightsB.br
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const cloned = cloneCanvas(canvas, size);
    if (cloned) {
        cacheSetWithTrim(cpuLayerCache, key, cloned);
        return cloned;
    }

    return canvas;
}

export function renderProceduralDualGridLayerFallback(
    args: RenderProceduralDualGridLayerArgs
): HTMLCanvasElement | null {
    const { imageA, imageB, cornerWeightsB, worldOriginX, worldOriginY, pixelSize, tileSize } = args;
    const key = buildCacheKey(
        'layer',
        imageA,
        imageB,
        cornerWeightsB,
        worldOriginX,
        worldOriginY,
        pixelSize,
        tileSize
    );
    const cached = cpuLayerCache.get(key);
    if (cached) return cached;

    const canvas = buildProceduralLayerCanvas(
        imageA,
        imageB,
        cornerWeightsB,
        worldOriginX,
        worldOriginY,
        pixelSize,
        tileSize
    );
    if (canvas) {
        cacheSetWithTrim(cpuLayerCache, key, canvas);
    }
    return canvas;
}

export function renderProceduralBeachSeaShorelineOverlay(
    args: RenderProceduralBeachSeaShorelineArgs
): void {
    const {
        ctx: canvasCtx,
        imageA,
        imageB,
        cornerWeightsB,
        worldOriginX,
        worldOriginY,
        destX,
        destY,
        destSize,
        tileSize,
        currentTimeMs,
    } = args;

    const key = buildCacheKey(
        'shore_v16_thick_centered_transition',
        imageA,
        imageB,
        cornerWeightsB,
        worldOriginX,
        worldOriginY,
        destSize,
        tileSize
    );

    let cached = shorelineCache.get(key);
    if (!cached) {
        const built = buildProceduralShorelineCanvases(
            imageA,
            imageB,
            cornerWeightsB,
            worldOriginX,
            worldOriginY,
            destSize,
            tileSize
        );
        if (!built) return;
        cacheSetWithTrim(shorelineCache, key, built);
        cached = built;
    }

    const t = currentTimeMs * 0.001;
    canvasCtx.save();
    canvasCtx.globalCompositeOperation = 'source-over';
    canvasCtx.globalAlpha = 1.0;
    canvasCtx.drawImage(cached.shoreCanvas, destX, destY, Math.floor(destSize), Math.floor(destSize));

    const tileScale = destSize / Math.max(tileSize, 1);
    const offsetPx = WAVE_OFFSET_PX * Math.max(0.35, tileScale * 0.24);
    for (let w = 0; w < WAVE_LAYERS; w += 1) {
        const phase = t * WAVE_SPEED + w * 0.7;
        const s = Math.sin(phase);
        const dx = s * offsetPx;
        const dy = Math.sin(phase + 0.5) * offsetPx;
        const alpha = 0.98 * (1 - w * 0.25) * (0.42 + 0.58 * (0.5 + 0.5 * s));

        canvasCtx.save();
        canvasCtx.globalAlpha = Math.max(0.24, alpha);
        canvasCtx.translate(dx, dy);
        canvasCtx.drawImage(cached.waveCanvas, destX, destY, Math.floor(destSize), Math.floor(destSize));
        canvasCtx.restore();
    }

    canvasCtx.restore();
}

export function clearProceduralDualGridBlendWebGL(): void {
    if (ctx) {
        const { gl, program, buffer } = ctx;
        gl.deleteProgram(program);
        gl.deleteBuffer(buffer);
        ctx = null;
    }
    initFailed = false;
    cpuLayerCache.clear();
    shorelineCache.clear();
}
