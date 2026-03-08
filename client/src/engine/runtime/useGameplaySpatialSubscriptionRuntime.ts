import { useCallback, type MutableRefObject } from 'react';
import type { DbConnection } from '../../generated';
import {
  getDefaultEnvironmentalQueries,
  getDefaultSpatialResourceTables,
  subscribeChunkBatches,
  subscribeChunkIndividually,
  subscribeGrassChunk,
} from '../adapters/spacetime/spatialSubscriptions';

type SubscriptionHandle = { unsubscribe: () => void } | null;

interface ChunkPerformanceMetrics {
  totalChunkCrossings: number;
  totalSubscriptionTime: number;
  totalSubscriptionsCreated: number;
  chunkCrossingTimes: number[];
  subscriptionCreationTimes: number[];
  chunksVisibleHistory: number[];
  lastMetricsLog: number;
}

interface UseGameplaySpatialSubscriptionRuntimeOptions {
  connection: DbConnection | null;
  grassEnabled: boolean;
  cloudsEnabled: boolean;
  grassPerformanceMode: boolean;
  enableBatchedSubscriptions: boolean;
  enableChunkPerformanceLogging: boolean;
  chunkPerformanceMetricsRef: MutableRefObject<ChunkPerformanceMetrics>;
}

export function useGameplaySpatialSubscriptionRuntime({
  connection,
  grassEnabled,
  cloudsEnabled,
  grassPerformanceMode,
  enableBatchedSubscriptions,
  enableChunkPerformanceLogging,
  chunkPerformanceMetricsRef,
}: UseGameplaySpatialSubscriptionRuntimeOptions) {
  const safeUnsubscribe = useCallback((sub: SubscriptionHandle) => {
    if (!sub) {
      return;
    }

    try {
      sub.unsubscribe();
    } catch {
      // Ignore best-effort cleanup failures during teardown.
    }
  }, []);

  const subscribeToChunk = useCallback((chunkIndex: number): SubscriptionHandle[] => {
    if (!connection) {
      return [];
    }

    const subscriptionStartTime = enableChunkPerformanceLogging ? performance.now() : 0;
    const newHandlesForChunk: SubscriptionHandle[] = [];

    try {
      const resourceTables = getDefaultSpatialResourceTables();
      const environmentalQueries = getDefaultEnvironmentalQueries(chunkIndex, {
        cloudsEnabled,
        grassEnabled,
        grassPerformanceMode,
      });

      if (enableBatchedSubscriptions) {
        newHandlesForChunk.push(
          ...subscribeChunkBatches(connection, chunkIndex, resourceTables, environmentalQueries),
        );
      } else {
        newHandlesForChunk.push(
          ...subscribeChunkIndividually(connection, chunkIndex, resourceTables, environmentalQueries),
        );
      }
    } catch (error) {
      console.error(`[CHUNK_ERROR] Failed to create subscriptions for chunk ${chunkIndex}:`, error);
      newHandlesForChunk.forEach(safeUnsubscribe);
      return [];
    }

    if (enableChunkPerformanceLogging && subscriptionStartTime > 0) {
      const subscriptionTime = performance.now() - subscriptionStartTime;
      const metrics = chunkPerformanceMetricsRef.current;
      metrics.totalSubscriptionTime += subscriptionTime;
      metrics.totalSubscriptionsCreated += newHandlesForChunk.length;
      metrics.subscriptionCreationTimes.push(subscriptionTime);

      if (metrics.subscriptionCreationTimes.length > 100) {
        metrics.subscriptionCreationTimes.shift();
      }
    }

    return newHandlesForChunk;
  }, [
    chunkPerformanceMetricsRef,
    cloudsEnabled,
    connection,
    enableBatchedSubscriptions,
    enableChunkPerformanceLogging,
    grassEnabled,
    grassPerformanceMode,
    safeUnsubscribe,
  ]);

  const subscribeGrassForChunk = useCallback((chunkIndex: number): SubscriptionHandle[] => {
    if (!connection) {
      return [];
    }

    try {
      console.log(`[GRASS_RESUB] Subscribing to grass/grass_state for chunk ${chunkIndex}`);
      return subscribeGrassChunk(connection, chunkIndex, grassPerformanceMode);
    } catch (error) {
      console.error(`[GRASS_RESUB] Failed to re-subscribe grass for chunk ${chunkIndex}:`, error);
      return [];
    }
  }, [connection, grassPerformanceMode]);

  return {
    subscribeToChunk,
    subscribeGrassForChunk,
  };
}
