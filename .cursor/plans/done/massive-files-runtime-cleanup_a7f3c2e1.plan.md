---
name: "massive-files-runtime-cleanup "
overview: "Address the remaining runtime migration leftovers. App.tsx, GameScreen.tsx, and useSpacetimeTables.ts are still major migration leftovers despite prior work. This plan follows the recommended order: shrink App first, GameScreen second, split useSpacetimeTables last. "
todos:
  - id: shrink-app-first
    content: "Shrink App.tsx by replacing useSpacetimeTables fan-out and movement/prediction wiring with selector hooks. "
    status: completed
  - id: shrink-gamescreen-second
    content: "Shrink GameScreen.tsx by making it read UI/runtime slices directly instead of accepting a giant prop contract. "
    status: completed
  - id: split-spacetime-last
    content: "Split useSpacetimeTables.ts into engine runtime modules plus tiny selector/compat hooks; delete dead leftovers. "
    status: completed
isProject: false
---

# Massive Files Runtime Cleanup Plan

## Context

The full runtime migration plan overstated completion. These phases remain incomplete in practice:

- **Phase 2**: gameplay subscription ownership
- **Phase 3**: input/prediction ownership
- **Phase 4**: frame assembly ownership
- **Phase 6**: prop-drilling removal

**App.tsx**, **GameScreen.tsx**, and **useSpacetimeTables.ts** are still major migration leftovers, not just cosmetic large files.

## Current State (as of plan creation)


| File                  | Lines | Status                                                                                                                           |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| App.tsx               | ~680  | Uses selectors; movement/prediction moved to GameplayRuntimeBridge; still owns sound/music wiring, asset preload, many UI states |
| GameScreen.tsx        | ~1234 | Reads world tables via useGameScreenWorldTables; still has ~90+ imperative/UI props                                              |
| useSpacetimeTables.ts | ~2030 | Monolithic subscription orchestrator; writer-only from App's perspective                                                         |
| GameCanvas.tsx        | ~4203 | Owns frame assembly; engine/frame boundary established, extraction incomplete                                                    |


**Done so far:**

- App no longer destructures gameplay tables; uses selector hooks
- GameplayRuntimeBridge owns useMovementInput, usePredictedMovement, tap-to-walk, mobile sprint
- GameScreen reads world tables via useGameScreenWorldTables (no table props)
- useUISubscriptions.ts removed (dead code)
- engine/frame/README documents staged extraction; useFrameEntityFiltering re-export exists

**Remaining:**

- App still wires sound/music tables, asset preload, many UI states; can be further thinned
- GameScreen still accepts a giant prop contract; many props could become selector reads
- useSpacetimeTables is still a 2000+ line monolith; needs domain split
- GameCanvas still owns most frame assembly; extraction stages 2–4 not done

## Recommended Order of Operations

Do it in this order for the cleanest migration:

1. **Shrink App.tsx first** – Replace useSpacetimeTables fan-out and movement/prediction wiring with selector hooks.
2. **Shrink GameScreen.tsx next** – Make it read UI/runtime slices directly instead of accepting a giant prop contract.
3. **Split useSpacetimeTables.ts last** – Break into engine runtime modules plus tiny selector/compat hooks, then delete dead leftovers.

---

## 1. Shrink App.tsx First

**Goal:** Convert App into an auth/bootstrap/router shell plus only the minimum UI state that truly belongs at the app boundary.

**Move out of App.tsx:**

- Any remaining world-table fan-out from useSpacetimeTables (ensure App never reads tables for fan-out)
- Sound/music table wiring – consider moving to a dedicated `useSoundMusicRuntime` or having sound/music hooks read via selectors only
- Asset preload orchestration – consider a dedicated `AssetPreloadShell` or similar
- Coarse UI state that could live in a context or engine slice (e.g. isMinimapOpen, interfaceInitialView)

**Introduce or extend selectors:**

- Sound/music tables: `useSoundSystemTables`, `useMusicSystemTables` (or equivalent) so App doesn’t manually pluck from engine snapshot
- Any remaining coarse UI/game entry state used by LoginScreen and GameScreen

**Exit criteria:**

- App.tsx is materially smaller (target: <400 lines)
- App no longer manually wires most gameplay/sound/music tables
- App is mostly auth, loading, and top-level shell composition

---

## 2. Shrink GameScreen.tsx Next

**Goal:** Make GameScreen read UI/runtime slices directly instead of accepting a giant prop contract.

**Current prop categories to reduce:**

- Placement state/actions – consider `usePlacementManager` or placement slice read inside GameScreen
- Interaction state – consider `useInteractionManager` or interaction slice
- Drag/drop – consider `useDragDropManager` or drag slice
- Minimap, interface initial view, chat, crafting focus – move to context or engine UI slice
- Music panel, SOVA sound box – move to context or dedicated provider
- Movement direction, auto-walk, facing – already in GameplayRuntimeBridge; ensure GameScreen reads via selector where possible
- Mobile controls (tap, sprint override) – keep in bridge or move to mobile-specific context

**Strategy:**

- Push reads down to real consumers (Chat, SpeechBubbleManager, QuestsPanel, AlkDeliveryPanel, GameCanvas)
- Where a prop is read-only and comes from engine/store, replace with a selector
- Keep imperative callbacks (e.g. cancelPlacement, handleSetInteractingWith) as props until their consumers can be refactored

**Exit criteria:**

- GameScreenProps shrinks drastically (target: <30 props)
- GameScreen becomes HUD/menu/overlay composition, not a second runtime router
- GameScreen reads UI/runtime slices via selectors where possible

---

## 3. Split useSpacetimeTables.ts Last

**Goal:** Break useSpacetimeTables into engine runtime modules plus tiny selector/compat hooks; remove dead leftovers.

**Extraction order:**

1. Remove any UI-owned table duplication already covered by `uiSubscriptionsRuntime.ts`
2. Move pure effect/event listeners into `gameplayEventEffectsRuntime.ts` or sibling runtime modules
3. Split gameplay table binding/connection setup by domain around `gameplayConnectionSetup.ts` and `gameplayTableBindings.ts`
4. Replace the giant hook with small domain-specific subscription modules and thin compatibility wrappers

**Likely domain slices:**

- Player/core world tables
- Buildables / placeables / environment
- Combat / projectiles / animals
- Progression / achievements / encyclopedia
- Audio / sound-event tables

**Exit criteria:**

- useSpacetimeTables.ts is no longer the authoritative gameplay subscription orchestrator
- The file is either deleted or reduced to a thin backward-compat wrapper (<200 lines)
- Dead leftovers removed (useUISubscriptions already removed)
- Domain modules live under `engine/runtime/` or `engine/adapters/spacetime/`

---

## Risk Controls

- Keep the writer path stable while first moving read-side consumption to selectors
- Prefer compatibility hooks over big-bang deletions
- Do App.tsx before useSpacetimeTables so the monolith split becomes mechanical
- Reduce prop drilling before touching the hottest render/prediction code
- Treat GameCanvas frame extraction as a separate, staged effort (see engine/frame/README.md)

## Acceptance Checks

- App.tsx is materially smaller and no longer routes most gameplay/sound/music tables
- GameScreen.tsx has a much smaller prop interface and reads runtime/UI slices directly
- useSpacetimeTables.ts is split or reduced to a small compatibility layer
- Runtime ownership is consistent: React captures input and composes UI; engine/runtime owns gameplay state and subscriptions

