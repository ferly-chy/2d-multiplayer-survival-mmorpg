---
name: runtime-host endgame
overview: Finish the migration from React-refreshed canvas runtime snapshots to long-lived host-owned producer services, so React becomes mostly mount/unmount/config for gameplay canvas.
todos:
  - id: remove-sync-only-adapters
    content: Delete the remaining sync-only React adapters by moving their frame/snapshot configuration calls directly behind the host boundary.
    status: in_progress
  - id: migrate-controller-adjuncts
    content: Move upgrade menu and host-state adjunct controller logic behind host-owned controller services.
    status: pending
  - id: migrate-ambient-effects
    content: Convert the narrowed ambient/runtime effects bridge into explicit host-owned services with start/stop/update lifecycle.
    status: pending
  - id: migrate-particle-production
    content: Replace the isolated hook-driven particle adapter with a host-owned particle service.
    status: pending
  - id: migrate-render-context
    content: Move render-context assembly behind host configuration so React only passes stable config/assets/refs.
    status: in_progress
  - id: migrate-controller-core
    content: Extract build/interaction/frame-state behavior into imperative host-owned controller services.
    status: pending
  - id: migrate-scene-production
    content: Move scene snapshot production from React hooks into long-lived runtimeEngine-backed services/stores.
    status: pending
isProject: false
---

# Runtime Host Endgame Plan

## Goal

Move snapshot-producing canvas/runtime adapters out of React and into long-lived host-owned services, so `client/src/components/GameCanvas.tsx` becomes mostly a shell around the DOM canvas, overlay composition, and host lifecycle.

Current reality after the latest runtime and renderer changes:

- `GameCanvasRuntimeHost` owns the `runtimeEngine` frame pipeline, render context storage, typed snapshots, frame bindings, and controller refs in `client/src/engine/runtime/GameCanvasRuntimeHost.ts`.
- `useGameCanvasFramePipeline` mounts the host pipeline and only keeps the React frame-loop bridge alive in `client/src/engine/runtime/useGameCanvasFramePipeline.ts`.
- `useGameCanvasControllerRuntime` already consumes host-owned refs, but build, interaction, upgrade menu, and host-state shaping are still React hook producers.
- `useGameCanvasEffectsRuntime` has been narrowed to ambient/runtime effects and now reads snapshots from the host; particle production is isolated in `useGameCanvasParticleRuntime`.
- React still produces scene, controller, particle, ambient, and render snapshots in `GameCanvas`, then synchronizes them through `useGameCanvasHostSyncRuntime`.
- The procedural world renderer cache/transition optimizations are orthogonal to this plan. They improve render hot paths but do not materially change runtime ownership.

## End-State Shape

```mermaid
flowchart LR
  reactShell[GameCanvasReactShell] -->|mount/config| canvasHost[GameCanvasRuntimeHost]
  canvasHost --> sceneService[SceneSnapshotService]
  canvasHost --> controllerService[ControllerService]
  canvasHost --> effectsService[EffectsAndParticleServices]
  canvasHost --> renderPipeline[RenderAndFramePipeline]
  sceneService --> runtimeStore[runtimeEngine]
  controllerService --> runtimeStore
  effectsService --> runtimeStore
```

## Current Boundary Map

Still React-produced:

- Scene snapshot: `useGameCanvasSceneRuntime`, `useGameScreenWorldTables`, `useUITable`, `useFrameAssembly`, interpolation hooks, mouse/world lookups.
- Controller snapshot: `useGameCanvasControllerRuntime`, `useGameCanvasBuildState`, `useGameCanvasInteractionRuntime`, `useGameCanvasUpgradeMenuState`, `useGameCanvasHostState`.
- Particle snapshot: `useGameCanvasParticleRuntime` and particle hooks.
- Ambient/runtime effects: `useGameCanvasEffectsRuntime`, `useGameCanvasRuntimeEffects`, `useGameCanvasEnvironmentRuntime`.
- Render context: `useGameCanvasRenderRuntime` still assembles the large render input bag and calls `host.configureRenderContext()`.

Already host-owned enough to build on:

- Runtime frame pipeline and frame callbacks in `GameCanvasRuntimeHost`.
- Controller mutable refs returned by `host.getControllerRefs()`.
- Frame binding execution and live pose refresh in `GameCanvasRuntimeHost`.
- Snapshot storage/accessors for scene, controller, particles, ambient effects, and render context.
- The render pipeline entrypoint, via `host.renderFrame()` calling `renderGameCanvasFrame()`.

## Recommended Order

The old stage order is still broadly valid, but the next useful slices are narrower than before:

1. Collapse sync-only adapters.
2. Move adjunct controller state.
3. Convert ambient/runtime effects to host services.
4. Move isolated particle producers into a host service.
5. Move render-context assembly behind host configuration.
6. Extract controller core services.
7. Migrate scene production last.

## Stage 1: Remove Sync-Only Adapters

Replace the remaining React-only sync glue with direct host configuration methods first, because this is now the lowest-risk cleanup slice.

Files:

- `client/src/engine/runtime/useGameCanvasHostSyncRuntime.ts`
- `client/src/engine/runtime/useGameCanvasControllerBridgeRuntime.ts`
- `client/src/components/GameCanvas.tsx`
- `client/src/engine/runtime/GameCanvasRuntimeHost.ts`

Plan:

- Inline or replace `useGameCanvasHostSyncRuntime`; it is currently just five `host.configure*()` calls.
- Collapse `useGameCanvasControllerBridgeRuntime` by moving frame binding construction to a host method such as `configureFrameBindingsFromController()` or to a small pure assembler used directly by `GameCanvas`.
- Keep `GameCanvas` as the mount/configuration caller, but remove adapter hooks whose only job is forwarding already-shaped data.
- Do not change scene/controller/particle production behavior in this stage.

## Stage 2: Move Tiny Controller Adjunct State Behind Host Services

Pull the small controller-owned adjuncts into host-managed controller services before touching the hardest controller logic.

Files:

- `client/src/engine/runtime/useGameCanvasControllerRuntime.ts`
- `client/src/hooks/useGameCanvasUpgradeMenuState.ts`
- `client/src/hooks/useGameCanvasHostState.ts`
- `client/src/engine/runtime/assembleGameCanvasControllerSnapshot.ts`
- `client/src/engine/runtime/GameCanvasRuntimeHost.ts`

Plan:

- Turn upgrade menu state and host-state shaping into host/controller-owned mutable services.
- Reduce the controller snapshot to service outputs instead of React-local hook composition.
- Preserve the current typed controller snapshot contract while swapping who produces it.
- Keep `assembleGameCanvasControllerSnapshot` as the compatibility boundary until build/interaction extraction is ready.

## Stage 3: Move Ambient/Effects Services Out of React

The ambient bridge has already been narrowed and now reads host snapshots, so it is the best next producer migration after sync glue and controller adjuncts.

Files:

- `client/src/engine/runtime/useGameCanvasEffectsRuntime.ts`
- `client/src/engine/runtime/useGameCanvasRuntimeEffects.ts`
- `client/src/engine/runtime/useGameCanvasEnvironmentRuntime.ts`
- `client/src/engine/runtime/gameplayEventEffectsRuntime.ts`
- `client/src/engine/runtime/GameCanvasRuntimeHost.ts`

Plan:

- Convert ambient/effects behavior from hook-backed bridges into host-owned services with explicit `start/stop/update` lifecycles.
- Start with non-render side effects that already have stable inputs: flashlight aim sync, burn sound bookkeeping, reducer feedback handlers, arrow break effects, weather/environment updates, and auto-action callbacks.
- Reuse existing non-React service patterns from `client/src/engine/runtime/gameplaySubscriptionsRuntime.ts` and `client/src/engine/runtime/worldChunkDataRuntime.ts`.
- Leave only effect configuration and browser lifecycle attachment in React if needed.

## Stage 4: Move Particle Production Into Host-Owned Services

Particle production is now isolated from ambient/runtime effects, making this stage more mechanical than it was when the plan was first written.

Files:

- `client/src/engine/runtime/useGameCanvasParticleRuntime.ts`
- `client/src/engine/runtime/GameCanvasRuntimeHost.ts`
- Particle hooks under `client/src/hooks/use*Particles.ts`

Plan:

- Replace the hook-driven particle snapshot with a host-owned particle service consuming scene/controller state.
- Keep the existing typed particle snapshot as the host-facing render contract.
- Preserve the current `renderParticles` and `computeCampfireFireOverlayEmitters` surface so `useGameCanvasRenderRuntime` can keep reading the same snapshot shape during migration.
- Move one particle family at a time only if the particle hooks have materially different lifecycle behavior.

## Stage 5: Move Render-Context Assembly Behind Host Configuration

React still assembles the large render input bag in `useGameCanvasRenderRuntime`. The host stores the render context, but it does not yet own render-context assembly.

Files:

- `client/src/engine/runtime/useGameCanvasRenderRuntime.ts`
- `client/src/engine/runtime/GameCanvasRuntimeHost.ts`
- `client/src/components/GameCanvas.tsx`
- `client/src/engine/frame/renderGameCanvasFrame.ts`

Plan:

- Push render-context assembly into the host so React passes only stable config/assets/DOM refs.
- Keep browser-bound assets and DOM refs configured from React, but stop recomputing the full render context in a hook.
- Split the render input bag into stable host config, live host snapshots/refs, and per-frame render parameters before moving it wholesale.
- End target: render hook becomes either tiny config glue or disappears entirely.

## Stage 6: Migrate Core Controller Behavior

This remains one of the largest ownership seams and should happen after the thinner sync/effects/particle/render slices.

Files:

- `client/src/engine/runtime/useGameCanvasBuildState.ts`
- `client/src/engine/runtime/useGameCanvasInteractionRuntime.ts`
- `client/src/engine/runtime/useGameCanvasFrameRuntimeState.ts`
- `client/src/engine/runtime/movementPredictionRuntime.ts`
- `client/src/engine/runtime/useGameCanvasControllerRuntime.ts`

Plan:

- Extract build/interaction logic into imperative controller services owned by the host.
- Use the existing runtime-owned movement precedent in `client/src/engine/runtime/movementPredictionRuntime.ts` as the design model.
- Treat `useGameCanvasFrameRuntimeState` as mostly transitional; its ref writes already target host-owned refs.
- Keep React limited to event capture and minimal subscriptions.

## Stage 7: Migrate Scene Production Last

This is the heaviest and riskiest migration because it still owns table reads, interpolation, mouse/world lookup work, and frame assembly.

Files:

- `client/src/engine/runtime/useGameCanvasSceneRuntime.ts`
- `client/src/engine/runtime/assembleGameCanvasSceneSnapshot.ts`
- `client/src/engine/frame/useFrameAssembly.ts`
- `client/src/engine/runtime/useGameplayTableStateRegistry.ts`
- `client/src/engine/adapters/spacetime/createGameplayTableBindings.ts`
- `client/src/engine/runtimeEngine.ts`

Plan:

- Move scene producers toward long-lived runtime stores/services backed by `runtimeEngine` rather than React hooks.
- Replace hook-local interpolation and lookup production with host/service-owned caches or runtimeEngine slices.
- Keep `assembleGameCanvasSceneSnapshot` as the contract-preserving adapter while migrating one producer group at a time.
- Expect this stage to require the most coordination with table binding/state registry architecture.

## Risks

- `client/src/engine/runtimeEngine.ts` is a global singleton, so ownership boundaries need discipline to avoid accidental coupling.
- `client/src/engine/runtime/useGameplayTableStateRegistry.ts` and `client/src/engine/adapters/spacetime/createGameplayTableBindings.ts` still anchor a lot of gameplay state flow in React-shaped setters/refs.
- Controller/build/interaction migration is behavior-heavy and should not be attempted before the thinner sync/effects/render slices are done.
- Render context assembly is a large bag of live refs and stable assets; move it by grouping ownership first, not by blindly relocating the object literal.
- Particle hooks use React lifecycles today; converting them should preserve cleanup/timer behavior before deleting hooks.

## Success Criteria

- `client/src/components/GameCanvas.tsx` is reduced to host instantiation, DOM refs, stable config/assets, and overlay composition.
- `GameCanvasRuntimeHost` becomes the long-lived owner of canvas producers, not just the consumer of React-refreshed snapshots.
- React hooks stop being the refresher of scene/controller/effects runtime state and become primarily mount/config/subscription bridges.
- Remaining React canvas hooks, if any, are clearly browser lifecycle adapters rather than gameplay state producers.
