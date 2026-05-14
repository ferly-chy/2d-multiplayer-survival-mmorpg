---
name: Beach/Sea WebGL2 blends
overview: Introduce a DRY WebGL2 dual-grid transition blend module and route only simple Beach_Sea (and reversed Sea_Beach) two-terrain layers through it in Pass 2. The Beach/Sea transition output must be generated procedurally from code-driven masks/noise/height sampling, not from authored Beach/Sea transition tile images; base tiles, shoreline overlay behavior, and all other transitions stay on the current path.
todos:
  - id: registry-and-pure-math
    content: Add dualGridProceduralBlendRegistry.ts + dualGridCornerBlend.ts (pair registry, corner weights + flip handling, clipCorners guard)
    status: completed
  - id: webgl-module
    content: Implement dualGridProceduralBlendWebGL.ts (GL2 program, texture cache, per-quad render → RGBA canvas drawImage composite)
    status: completed
  - id: hook-pass2
    content: Wire renderDualGridTransition in proceduralWorldRenderer.ts; preserve non-Beach/Sea atlas fallback
    status: completed
  - id: manual-verify
    content: Run client and verify beach/sea borders, junction fallbacks, snorkeling unchanged
    status: completed
isProject: false
---

# Beach/Sea procedural WebGL2 transition (DRY foundation)

## Context

- World background is drawn in [`client/src/engine/frame/renderWorldPreparationPasses.ts`](client/src/engine/frame/renderWorldPreparationPasses.ts) with `ctx.translate(cameraOffsetX, cameraOffsetY)` before [`renderWorldBackground`](client/src/utils/renderers/worldRenderingUtils.ts).
- [`ProceduralWorldRenderer.renderDualGridTransition`](client/src/utils/renderers/proceduralWorldRenderer.ts) (Pass 2) loops `getDualGridTileInfoMultiLayer` layers and `drawImage` from `transition_${Primary}_${Secondary}` atlases using `spriteCoords`, flips, and optional `clipCorners`.
- **Two-terrain cells** hit the fast path in [`getDualGridTileInfoMultiLayer`](client/src/utils/dualGridAutotile.ts) (single layer from `getDualGridTileInfo`, typically `clipCorners: null`). **3+ terrain** layers use priority-based bitmasks and `clipCorners`; those must **keep using atlases** in phase one (shader clip parity is non-trivial).
- The implementation target is the **Pass 2 terrain composite** for simple Beach↔Sea layers. Those transition pixels must be produced by WebGL2 from base terrain textures plus generated blend data, not copied from the authored `transition_Beach_Sea` atlas.
- Animated shoreline is a separate overlay path in [`shorelineOverlayUtils.ts`](client/src/utils/renderers/shorelineOverlayUtils.ts) via `initShorelineMask` + [`renderShorelineOverlayPass`](client/src/utils/renderers/proceduralWorldRenderer.ts). Keep its current behavior unless implementation reveals it is using the same authored transition art for visible terrain pixels; if so, preserve behavior through a generated mask instead of relying on the authored transition atlas.

## Architecture (DRY for future pairs)

Add a small, isolated WebGL2 module (mirror patterns from [`waterOverlayWebGL.ts`](client/src/utils/renderers/waterOverlayWebGL.ts): `#version 300 es`, compile/link helpers, context lost handling):

| Piece | Responsibility |
|--------|----------------|
| **`dualGridProceduralBlendRegistry.ts`** | Declarative registry: transition pair key (`Primary_Secondary`) → `{ terrainA, terrainB }` (unordered) + feature flag / optional future knobs (height map later). Export `getProceduralBlendConfig(tileInfo)` or `isProceduralBlendEnabled(tileInfo)`. |
| **`dualGridCornerBlend.ts`** | Pure helpers (easy to unit test): map [`DualGridTileInfo`](client/src/utils/dualGridAutotile.ts) → `vec4` corner weights for **secondary** blend contribution + handling **flipHorizontal / flipVertical** by swapping/mirroring corner weights or UV (keep parity with existing atlas transforms). |
| **`dualGridProceduralBlendWebGL.ts`** | Single reusable WebGL2 context + RGBA FBO/scissor-sized draws + texture cache (`HTMLImageElement` → `WebGLTexture`) keyed like tile cache (`Beach_base`, `Sea_base`). Export `renderProceduralDualGridLayer(args)` → renders **one dual quad** (`tileSize+1` world px, half-tile offset) into an internal RGBA canvas/texture with alpha = opaque blend result; caller composites with `ctx.drawImage(...)` at the **same dest rect** as current Pass 2. |

**Shader model (phase one)**

- Fragment computes **world pixel** from quad-local UV and quad world-space bounds (uniform `vec2 u_quadOriginPx`, `float u_quadSizePx`).
- Sample **both base textures** with **world-aligned repeating UV**: `fract(worldPx / tileWorldPx)` × normalized bitmap dimensions (same visual tiling as Pass 1 `renderBaseTile`).
- Blend factor starts from bilinear interpolation of four corner weights (TL/TR/BL/BR) passed from CPU (`uniform vec4 u_wSecondaryCorners`), clamp `[0,1]`:  
  `w = (1-u)*(1-v)*wTL + u*(1-v)*wTR + (1-u)*v*wBL + u*v*wBR`.
- Modulate the blend edge procedurally, inspired by the terrain-tool reference: treat the dual-grid weights like a tiny intention/mask texture, then use deterministic noise plus sampled texture height/luminance to roughen the Beach/Sea boundary. This should create organic beach/sea transitions without depending on hand-authored transition tile images.
- Keep the phase-one mask small and deterministic. A CPU-generated 512×512-style intention texture is acceptable if it fits the renderer better than uniforms, but do not introduce new authored image assets for the Beach/Sea transition.
- Output **opaque RGB** (alpha 1); shoreline/water overlays remain unchanged.

**Corner weights source**

- For enabled pairs where **`clipCorners` is null** and the layer is exactly Beach↔Sea, derive weights from existing dual-grid semantics already encoded in `tileInfo.dualGridIndex` relative to **primary** (same meaning as today’s bitmask after `isReversed` handling). Validate against `describeDualGridIndex` / comments in [`dualGridAutotile.ts`](client/src/utils/dualGridAutotile.ts).

## Integration point (minimal churn)

In [`renderDualGridTransition`](client/src/utils/renderers/proceduralWorldRenderer.ts), **before** loading `transition_*` image and `drawImage`:

1. If `!proceduralBlendRegistry.hasPair(tileInfo)` → existing path.
2. If `tileInfo.clipCorners?.length` → existing path (multi-terrain junction safety).
3. If WebGL init failed / context lost → existing path.
4. Else call `renderProceduralDualGridLayer({ ctx, tileInfo, destRect, tileSize, beachImg: cache['Beach_base'], seaImg: cache['Sea_base'] })` then `continue` (skip atlas draw for that layer).

Keep debug overlay drawing unchanged (still reflects top layer metadata).

## Preload / assets

- Procedural Beach/Sea transition path uses **`Beach_base` / `Sea_base`** already loaded, plus generated mask/noise/height data.
- Do **not** use the authored `transition_Beach_Sea` image for the Beach/Sea Pass 2 terrain composite.
- Keep atlas fallback only for unsupported terrain pairs, unsupported multi-terrain junctions, or WebGL failure. If `transition_Beach_Sea` still has to be loaded for the separate shoreline overlay, document that as a temporary shoreline-only dependency during implementation.

## Testing checklist (manual)

- Straight shoreline, inner/outer corners, diagonal cells, reversed primary/secondary, zoom levels, odd `tileSize`, context-loss recovery.
- **3-terrain** beach pockets (Grass/Beach/Sea): confirm atlas fallback still draws correctly.
- Snorkeling path untouched (Pass 2 alternate branches).

## Follow-ups (not in this PR)

- Second transition pair = add one registry row + base texture keys.
- Optional: migrate shoreline mask fully off any Beach/Sea atlas dependency (separate generated mask or procedural foam).
- Optional: batch quads into one GL pass if profiling shows draw-call overhead.

## Plain-English outcome

This change replaces the hand-drawn Beach/Sea transition tiles with a small procedural renderer. The game will still draw normal beach and sea base tiles, but where those two terrains meet, WebGL2 will generate the blended edge itself from the dual-grid corner data, repeated base textures, deterministic noise, and simple height/luminance information from the textures.

The idea is similar to the referenced terrain tutorial: instead of every transition being a separate painted tile, the renderer has a compact "intention" mask that says where each surface should appear, then it uses noise and texture height information to make the boundary look natural. For this first step, the only generated transition is Beach↔Sea. Other terrain junctions keep using the old atlas path until they are explicitly migrated.

The Unity-specific 45-degree orthographic camera trick is useful background, but it does not directly apply here because this is a 2D canvas/WebGL renderer, not a projected 3D mesh workflow. The relevant parts for this project are the mask-driven surface blending, height-aware texture transitions, mip/smoothing idea for softer edges, and the option to add a subtle generated grid/edge treatment later if it improves readability.

We should not use the authored Beach/Sea transition images as the source of the new terrain blend. If any existing Beach/Sea image remains in the load path after this work, it should be either a temporary fallback for failure cases or a shoreline-overlay-only dependency, not the thing producing the main Beach/Sea transition pixels.
