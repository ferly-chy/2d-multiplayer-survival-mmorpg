/**
 * useSpacetimeTables - React lifecycle shim for runtime-backed Spacetime ingestion.
 *
 * Owns the connection-bound mount/unmount lifecycle for gameplay subscriptions while
 * delegating table registration, connection setup, and spatial orchestration to
 * runtime/adapter modules. UI consumers are expected to read derived state from
 * runtime selectors rather than treat this hook as an application data hub.
 */

import { useEffect, useRef } from 'react';
import { DbConnection } from '../generated';
import { useEngineSnapshot } from '../engine/react/useEngineSnapshot';
import { gameplaySubscriptionsRuntime } from '../engine/runtime/gameplaySubscriptionsRuntime';
import { useGameplayConnectionSetup } from '../engine/react/useGameplayConnectionSetup';
import { useGameplaySpatialSubscriptionRuntime } from '../engine/react/useGameplaySpatialSubscriptionRuntime';
import { useGameplayTableStateRegistry } from '../engine/react/useGameplayTableStateRegistry';

// ─── Spatial chunk-subscription strategy ─────────────────────────────────────
// - Batch and throttle chunk subscriptions to avoid bursty update spikes.
// - Keep configuration centralized below for easier tuning.
// - Performance logging can be enabled temporarily when investigating issues.

// Spatial subscription control flags.
const DISABLE_ALL_SPATIAL_SUBSCRIPTIONS = false; // Master switch for spatial subscriptions.
const ENABLE_CLOUDS = true; // Controls cloud spatial subscriptions
// ENABLE_GRASS is now controlled by the grassEnabled prop passed to the hook

// Performance tuning flags.
const GRASS_PERFORMANCE_MODE = true; // If enabled, only subscribe to healthy grass (reduces update volume)

// Batched subscription optimization.
const ENABLE_BATCHED_SUBSCRIPTIONS = true; // Combines similar tables into batched queries for massive performance gains

// Toggle ENABLE_BATCHED_SUBSCRIPTIONS to compare:
// - true:  ~3 batched calls per chunk (recommended for production)
// - false: ~12 individual calls per chunk (legacy approach, for debugging only)

// Re-export for backward compatibility; definition moved to engine/types/spacetimeTableStates.ts
export type { SpacetimeTableStates } from '../engine/types/spacetimeTableStates';

// Define the props the hook accepts
interface UseSpacetimeTablesProps {
    connection: DbConnection | null;
    cancelPlacement: () => void; // Function to cancel placement mode
    grassEnabled?: boolean; // Toggle for grass subscriptions (defaults to true)
}

export const useSpacetimeTables = ({
    connection,
    cancelPlacement,
    grassEnabled = true, // Default to enabled if not provided
}: UseSpacetimeTablesProps): void => {
    const viewport = useEngineSnapshot((snapshot) => snapshot.world.viewport);

    const tableState = useGameplayTableStateRegistry();
    const {
        setGrass,
        setGrassState,
        chunkPerformanceMetricsRef,
        ENABLE_CHUNK_PERFORMANCE_LOGGING,
        resetDataState,
    } = tableState;

    // Ref to hold the cancelPlacement function
    const cancelPlacementRef = useRef(cancelPlacement);
    useEffect(() => { cancelPlacementRef.current = cancelPlacement; }, [cancelPlacement]);

    const { subscribeToChunk, subscribeGrassForChunk } = useGameplaySpatialSubscriptionRuntime({
        connection,
        grassEnabled,
        cloudsEnabled: ENABLE_CLOUDS,
        grassPerformanceMode: GRASS_PERFORMANCE_MODE,
        enableBatchedSubscriptions: ENABLE_BATCHED_SUBSCRIPTIONS,
        enableChunkPerformanceLogging: ENABLE_CHUNK_PERFORMANCE_LOGGING,
        chunkPerformanceMetricsRef,
    });

    const ensureConnectionSetup = useGameplayConnectionSetup({
        connection,
        cancelPlacementRef,
        subscribeToChunk,
        tableState,
    });

    const clearGrassData = () => {
        console.log('[useSpacetimeTables] Grass disabled - clearing grass/grassState maps');
        setGrass(new Map());
        setGrassState(new Map());
    };

    useEffect(() => {
        gameplaySubscriptionsRuntime.sync({
            connection,
            viewport,
            grassEnabled,
            ensureConnectionSetup,
            subscribeToChunk,
            subscribeGrassForChunk,
            clearGrassData,
            resetDataState,
        });
    }, [connection, viewport, grassEnabled, ensureConnectionSetup]);

    useEffect(() => {
        return () => {
            gameplaySubscriptionsRuntime.stop({
                resetDataState,
            });
        };
    }, []);

    // No return: consumers read via engine selectors (useGameScreenWorldTables, useLocalPlayer, etc.)
}; 