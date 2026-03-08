# Frame Assembly

Frame assembly produces the render-ready data consumed by GameCanvas each frame:
- Viewport-culled visible entities
- Y-sorted draw order
- Remote player interpolation
- Day/night mask and overlay

## Current State

- `useEntityFiltering` (hooks/): viewport culling + Y-sort
- `useRemotePlayerInterpolation` (hooks/): remote player positions
- `useDayNightCycle` (hooks/): overlay RGBA, mask canvas
- `useRuntimeFrameBridge` (engine/react/): pushes frame data to runtime store
- `useFrameAssembly` (engine/frame/): composes filtering + interpolation + lighting + runtime publication

## Extraction Strategy

1. **Stage 1 (done)**: Establish frame module boundary; GameCanvas remains consumer
2. **Stage 2 (done)**: Move useEntityFiltering into frame module; GameCanvas imports from engine/frame
3. **Stage 3 (done)**: Compose useEntityFiltering + useRemotePlayerInterpolation + useDayNightCycle into single useFrameAssembly hook
4. **Stage 4**: Produce frame snapshot in engine; GameCanvas becomes thin host over engine-prepared data

## Contract

- **FrameInput**: Entity maps, viewport, camera offset, local player, predicted position
- **FrameOutput**: visibleEntities, ySortedEntities, remotePlayerPositions, overlayRgba, maskCanvas
