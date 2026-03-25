/**
 * WebGL2 procedural campfire fire + smoke overlay (pixel-snapped, low-res like waterOverlayWebGL).
 * Same GPU stack as the voronoi water overlay — not WebGPU/WGSL, for consistency and support.
 */

const MAX_EMITTERS = 24;
const PACK_FLOATS = MAX_EMITTERS * 8;

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position;
  gl_Position = vec4(a_position * 2.0 - 1.0, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_camOrigin;
uniform vec2  u_viewSize;
uniform float u_time;
uniform int   u_count;
uniform float u_emitPacked[${PACK_FLOATS}];

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash2(i);
  float b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0));
  float d = hash2(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void readEmit(int i, out vec2 anchor, out float fireAmt, out float smokeAmt, out float hotBoost, out float scl) {
  int b = i * 8;
  anchor = vec2(u_emitPacked[b], u_emitPacked[b + 1]);
  fireAmt = u_emitPacked[b + 2];
  smokeAmt = u_emitPacked[b + 3];
  hotBoost = u_emitPacked[b + 4];
  scl = max(u_emitPacked[b + 5], 0.5);
}

void main() {
  vec2 worldPx = floor(u_camOrigin + vec2(v_uv.x, 1.0 - v_uv.y) * u_viewSize);
  float t = u_time * 0.001;

  vec3 col = vec3(0.0);
  float a = 0.0;

  for (int i = 0; i < ${MAX_EMITTERS}; i++) {
    if (i >= u_count) break;

    vec2 anchor;
    float fireAmt, smokeAmt, hotBoost, scl;
    readEmit(i, anchor, fireAmt, smokeAmt, hotBoost, scl);

    float dx = worldPx.x - anchor.x;
    float relUp = anchor.y - worldPx.y;

    // --- Fire column (relUp positive = above anchor / upward in world) ---
    if (fireAmt > 0.01) {
      float hMax = 58.0 * scl;
      float hMin = -6.0 * scl;
      if (relUp > hMin && relUp < hMax) {
        float hn = relUp / hMax;
        float halfW = mix(16.0, 5.0, hn) * scl;
        vec2 warp = vec2(
          fbm(vec2(worldPx.x * 0.09 + t * 18.0, worldPx.y * 0.11 - t * 52.0)),
          fbm(vec2(worldPx.y * 0.08 + t * 14.0, worldPx.x * 0.10 + t * 40.0))
        ) - 0.5;
        float wobble = (warp.x + warp.y) * 9.0 * scl;
        float adx = abs(dx + wobble);

        float edge = smoothstep(halfW + 3.5 * scl, halfW - 1.0 * scl, adx);
        float vert = smoothstep(hMin - 2.0 * scl, hMin + 8.0 * scl, relUp)
                   * smoothstep(hMax + 8.0 * scl, hMax - 12.0 * scl, relUp);

        float flick = fbm(vec2(worldPx * 0.15 + vec2(0.0, t * 80.0)));
        float core = smoothstep(0.35, 0.75, flick) * edge * vert;

        vec3 yellow = vec3(1.0, 0.92, 0.45);
        vec3 orange = vec3(1.0, 0.55, 0.12);
        vec3 deep = vec3(0.85, 0.12, 0.04);
        float heat = clamp(flick + (1.0 - hn) * 0.35, 0.0, 1.0);
        vec3 fcol = mix(deep, orange, smoothstep(0.0, 0.55, heat));
        fcol = mix(fcol, yellow, smoothstep(0.45, 1.0, heat));

        float steps = 5.0;
        fcol = floor(fcol * steps + 0.001) / steps;

        float fa = fireAmt * core * 0.95;
        col = col + fcol * fa * (1.0 - a * 0.35);
        a = min(1.0, a + fa * 0.85);
      }
    }

    // --- Smoke plume above fire ---
    if (smokeAmt > 0.01) {
      float sBase = 18.0 * scl;
      float sTop = sBase + 95.0 * scl;
      if (relUp > sBase && relUp < sTop) {
        float sn = (relUp - sBase) / (sTop - sBase);
        float halfW = mix(10.0, 28.0, sn) * scl;
        vec2 sp = worldPx * 0.06 + vec2(t * 7.0, -t * 11.0);
        float billow = fbm(sp + hotBoost * 2.0) * 14.0 * scl;
        float adx = abs(dx + billow);

        float dens = smoothstep(halfW + 6.0 * scl, halfW * 0.35, adx);
        dens *= smoothstep(sBase - 4.0 * scl, sBase + 10.0 * scl, relUp);
        dens *= smoothstep(sTop + 12.0 * scl, sTop - 25.0 * scl, relUp);
        dens *= noise(worldPx * 0.11 + t * 3.0) * 0.35 + 0.65;

        vec3 sgray = mix(vec3(0.42, 0.42, 0.44), vec3(0.12, 0.12, 0.13), hotBoost);
        sgray = floor(sgray * 6.0 + 0.001) / 6.0;

        float sa = smokeAmt * dens * 0.42 * (1.0 - sn * 0.35);
        col = mix(col, sgray, sa);
        a = min(1.0, a + sa * 0.55);
      }
    }
  }

  fragColor = vec4(col, a);
}
`;

export interface CampfireFireWebGLContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  uLoc: Record<string, WebGLUniformLocation | null>;
  aLoc: number;
}

let ctx: CampfireFireWebGLContext | null = null;

function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VERTEX_SHADER);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.warn('[CampfireFire] VS compile:', gl.getShaderInfoLog(vs));
    gl.deleteShader(vs);
    return null;
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, FRAGMENT_SHADER);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.warn('[CampfireFire] FS compile:', gl.getShaderInfoLog(fs));
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[CampfireFire] Link:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function initCampfireFireWebGL(): CampfireFireWebGLContext | null {
  if (ctx) return ctx;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  }) as WebGL2RenderingContext | null;
  if (!gl) {
    console.warn('[CampfireFire] WebGL2 unavailable, skipping campfire fire overlay.');
    return null;
  }

  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault();
      ctx = null;
    },
    false,
  );

  const program = createProgram(gl);
  if (!program) return null;

  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);

  const uLoc: Record<string, WebGLUniformLocation | null> = {
    u_camOrigin: gl.getUniformLocation(program, 'u_camOrigin'),
    u_viewSize: gl.getUniformLocation(program, 'u_viewSize'),
    u_time: gl.getUniformLocation(program, 'u_time'),
    u_count: gl.getUniformLocation(program, 'u_count'),
    u_emitPacked: gl.getUniformLocation(program, 'u_emitPacked[0]'),
  };
  for (const [k, v] of Object.entries(uLoc)) {
    if (!v && k !== 'u_emitPacked') {
      console.warn('[CampfireFire] Missing uniform:', k);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      return null;
    }
  }
  if (!uLoc.u_emitPacked) {
    console.warn('[CampfireFire] Missing u_emitPacked[0]');
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    return null;
  }

  const aLoc = gl.getAttribLocation(program, 'a_position');
  ctx = { canvas, gl, program, buffer, uLoc, aLoc };
  return ctx;
}

const PX = 4;

const packedScratch = new Float32Array(PACK_FLOATS);

export interface CampfireFireGpuEmitter {
  anchorX: number;
  anchorY: number;
  fireAmt: number;
  smokeAmt: number;
  hotBoost: number;
  scale: number;
}

export function renderCampfireFireWebGL(
  wctx: CampfireFireWebGLContext,
  camX: number,
  camY: number,
  cw: number,
  ch: number,
  tMs: number,
  emitters: readonly CampfireFireGpuEmitter[],
): boolean {
  const { gl, program, buffer, uLoc, aLoc } = wctx;
  const bw = Math.ceil(cw / PX);
  const bh = Math.ceil(ch / PX);
  if (bw <= 0 || bh <= 0) return false;
  if (gl.isContextLost()) return false;

  const count = Math.min(emitters.length, MAX_EMITTERS);
  packedScratch.fill(0);
  for (let i = 0; i < count; i++) {
    const e = emitters[i]!;
    const b = i * 8;
    packedScratch[b] = e.anchorX;
    packedScratch[b + 1] = e.anchorY;
    packedScratch[b + 2] = e.fireAmt;
    packedScratch[b + 3] = e.smokeAmt;
    packedScratch[b + 4] = e.hotBoost;
    packedScratch[b + 5] = e.scale;
  }

  if (wctx.canvas.width !== bw || wctx.canvas.height !== bh) {
    wctx.canvas.width = bw;
    wctx.canvas.height = bh;
  }
  gl.viewport(0, 0, bw, bh);
  gl.useProgram(program);

  gl.uniform2f(uLoc.u_camOrigin!, camX, camY);
  gl.uniform2f(uLoc.u_viewSize!, cw, ch);
  gl.uniform1f(uLoc.u_time!, tMs);
  gl.uniform1i(uLoc.u_count!, count);
  gl.uniform1fv(uLoc.u_emitPacked!, packedScratch);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  return true;
}

export function clearCampfireFireWebGL(): void {
  if (ctx) {
    const { gl, program, buffer } = ctx;
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    ctx = null;
  }
}

export { MAX_EMITTERS };
