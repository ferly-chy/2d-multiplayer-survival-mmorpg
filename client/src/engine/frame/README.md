# Frame Assembly

Frame assembly produces the render-ready data consumed by GameCanvas each frame:
- Viewport-culled visible entities
- Y-sorted draw order
- Remote player interpolation
- Day/night mask and overlay

## Current State

- `useEntityFiltering` adapter (engine/react/): viewport culling + Y-sort
- `useRemotePlayerInterpolation` adapter (engine/react/): remote player positions
- `useDayNightCycle` adapter (engine/react/): overlay RGBA, mask canvas
- `useRuntimeFrameBridge` (engine/react/): pushes frame data to runtime store
- `useFrameAssembly` (engine/react/): composes filtering + interpolation + lighting + runtime publication

## Extraction Strategy

1. **Stage 1 (done)**: Establish frame module boundary; GameCanvas remains consumer
2. **Stage 2 (done)**: Move useEntityFiltering behind an engine/react adapter
3. **Stage 3 (done)**: Compose useEntityFiltering + useRemotePlayerInterpolation + useDayNightCycle into single useFrameAssembly hook in engine/react
4. **Stage 4**: Produce frame snapshot in engine; GameCanvas becomes thin host over engine-prepared data

## Contract

- **FrameInput**: Entity maps, viewport, camera offset, local player, predicted position
- **FrameOutput**: visibleEntities, ySortedEntities, remotePlayerPositions, overlayRgba, maskCanvas
