---
name: Beach/Sea WebGL2 blends
overview: Introduce a DRY WebGL2 dual-grid transition blend module and route only simple Beach_Sea (and reversed Sea_Beach) two-terrain layers through it in Pass 2, while keeping base tiles, shoreline foam mask (still sourced from the existing beach_sea atlas for now), and all other transitions on the current drawImage path.
todos:
  - id: registry-and-pure-math
    content: Add dualGridProceduralBlendRegistry.ts + dualGridCornerBlend.ts (pair registry, corner weights + flip handling, clipCorners guard)
    status: pending
  - id: webgl-module
    content: Implement dualGridProceduralBlendWebGL.ts (GL2 program, texture cache, per-quad render → RGBA canvas drawImage composite)
    status: pending
  - id: hook-pass2
    content: Wire renderDualGridTransition in proceduralWorldRenderer.ts; preserve shoreline preload and atlas fallback
    status: pending
  - id: manual-verify
    content: Run client and verify beach/sea borders, junction fallbacks, snorkeling unchanged
    status: pending
isProject: false
---

# Beach/Sea procedural WebGL2 transition (DRY foundation)

## Context

- World background is drawn in [`client/src/engine/frame/renderWorldPreparationPasses.ts`](client/src/engine/frame/renderWorldPreparationPasses.ts) with `ctx.translate(cameraOffsetX, cameraOffsetY)` before [`renderWorldBackground`](client/src/utils/renderers/worldRenderingUtils.ts).
- [`ProceduralWorldRenderer.renderDualGridTransition`](client/src/utils/renderers/proceduralWorldRenderer.ts) (Pass 2) loops `getDualGridTileInfoMultiLayer` layers and `drawImage` from `transition_${Primary}_${Secondary}` atlases using `spriteCoords`, flips, and optional `clipCorners`.
- **Two-terrain cells** hit the fast path in [`getDualGridTileInfoMultiLayer`](client/src/utils/dualGridAutotile.ts) (single layer from `getDualGridTileInfo`, typically `clipCorners: null`). **3+ terrain** layers use priority-based bitmasks and `clipCorners`; those must **keep using atlases** in phase one (shader clip parity is non-trivial).
- Animated shoreline still depends on the beach/sea **tileset image** in [`shorelineOverlayUtils.ts`](client/src/utils/renderers/shorelineOverlayUtils.ts) via `initShorelineMask` + [`renderShorelineOverlayPass`](client/src/utils/renderers/proceduralWorldRenderer.ts). **Do not remove** `transition_Beach_Sea` preload yet—only skip using it for the **Pass 2 terrain composite** when the procedural path runs.

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
- Blend factor: bilinear interpolation of four corner weights (TL/TR/BL/BR) passed from CPU (`uniform vec4 u_wSecondaryCorners`), clamp `[0,1]`:  
  `w = (1-u)*(1-v)*wTL + u*(1-v)*wTR + (1-u)*v*wBL + u*v*wBR`.
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

- **Continue** loading `transition_Beach_Sea` and passing it to `initShorelineMask` in [`preloadTileAssets`](client/src/utils/renderers/proceduralWorldRenderer.ts) — shoreline unchanged.
- Procedural path uses **`Beach_base` / `Sea_base`** already loaded.

## Testing checklist (manual)

- Straight shoreline, inner/outer corners, diagonal cells, reversed primary/secondary, zoom levels, odd `tileSize`, context-loss recovery.
- **3-terrain** beach pockets (Grass/Beach/Sea): confirm atlas fallback still draws correctly.
- Snorkeling path untouched (Pass 2 alternate branches).

## Follow-ups (not in this PR)

- Second transition pair = add one registry row + base texture keys.
- Optional: migrate shoreline mask off atlas (separate small texture or procedural foam).
- Optional: batch quads into one GL pass if profiling shows draw-call overhead.
