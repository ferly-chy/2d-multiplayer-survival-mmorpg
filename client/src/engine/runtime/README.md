# Engine Runtime Modules

Runtime modules own subscriptions, table bindings, and side effects. React hooks orchestrate; runtime modules execute.

## Current Architecture

| Module | Responsibility |
|--------|----------------|
| `gameplaySubscriptionsRuntime` | Spatial + non-spatial chunk subscriptions, viewport sync |
| `gameplayEventEffectsRuntime` | Grass cut effects, cairn unlock sounds |
| `uiSubscriptionsRuntime` | UI-only tables (messages, pins, quests, matronage) |
| `worldChunkDataRuntime` | Chunk data map for tile lookups |

## useSpacetimeTables Split Strategy

`useSpacetimeTables` (~2000 lines) is the monolithic subscription orchestrator. Target: reduce to <200 lines.

### Extraction Order

1. **Table binding handlers** → `engine/adapters/spacetime/gameplayTableBindingHandlers.ts`
   - Factory: `createGameplayTableBindings(ctx: GameplayTableBindingContext) => GameplayTableBindings`
   - Context: setters from `useEngineWorldTableState`, refs, connection, cancelPlacement
   - Domain groups already defined in `gameplayTableBindings.ts`: progression, structures, items, world, combat, social

2. **Effect triggers** → `gameplayEventEffectsRuntime` or `gameplayEventEffectsRuntime.ts`
   - Explosion, barrel destruction, animal corpse effects
   - Hostile encounter tutorial dispatch

3. **Thin hook** → `useSpacetimeTables` becomes:
   - `useEngineWorldTableState` for each table
   - Call `createGameplayTableBindings(ctx)` with context
   - Call `setupGameplayConnection({ connection, tableBindings })`
   - Delegate spatial sync to `gameplaySubscriptionsRuntime.sync()`

### Dead Code Removed

- `useUISubscriptions.ts` – deleted; UI tables handled by `uiSubscriptionsRuntime`

### Domain Slices (from gameplayTableBindings)

- **progression**: player_stats, achievements, notifications, ALK, plants
- **structures**: campfires, storage, shelters, placeables
- **items**: item_def, inventory, equipment, recipes
- **world**: trees, stones, grass, weather, monuments
- **combat**: players, projectiles, animals, fishing
- **social**: player_corpse
