import type { DbConnection } from '../../generated';
import type { WorldChunkData } from '../../generated/types';
import { runtimeEngine } from '../runtimeEngine';

class WorldChunkDataRuntime {
  private connection: DbConnection | null = null;
  private chunkCache = new Map<string, WorldChunkData>();
  private handle: { unsubscribe?: () => void } | null = null;
  private pendingCommitTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handleChunkInsert = (_ctx: unknown, row: WorldChunkData) => {
    this.chunkCache.set(`${row.chunkX},${row.chunkY}`, row);
    this.scheduleCommit();
  };
  private readonly handleChunkUpdate = (_ctx: unknown, _oldRow: WorldChunkData, row: WorldChunkData) => {
    this.chunkCache.set(`${row.chunkX},${row.chunkY}`, row);
    this.scheduleCommit();
  };
  private readonly handleChunkDelete = (_ctx: unknown, row: WorldChunkData) => {
    this.chunkCache.delete(`${row.chunkX},${row.chunkY}`);
    this.scheduleCommit();
  };

  start(connection: DbConnection | null): void {
    if (this.connection === connection) {
      return;
    }

    this.stop();
    if (!connection) {
      return;
    }

    this.connection = connection;
    connection.db.world_chunk_data.onInsert(this.handleChunkInsert);
    connection.db.world_chunk_data.onUpdate(this.handleChunkUpdate);
    connection.db.world_chunk_data.onDelete(this.handleChunkDelete);

    const syncFromTable = () => {
      this.chunkCache.clear();
      for (const chunk of connection.db.world_chunk_data.iter()) {
        this.chunkCache.set(`${chunk.chunkX},${chunk.chunkY}`, chunk);
      }
      this.commit();
    };

    syncFromTable();
    this.handle = connection
      .subscriptionBuilder()
      .onApplied(() => syncFromTable())
      .onError((err: unknown) => console.error('[WorldChunkDataRuntime] Sub error:', err))
      .subscribe('SELECT * FROM world_chunk_data');
  }

  stop(): void {
    if (this.handle?.unsubscribe) {
      try {
        this.handle.unsubscribe();
      } catch {
        // Ignore teardown failures.
      }
    }
    this.handle = null;

    if (this.pendingCommitTimer) {
      clearTimeout(this.pendingCommitTimer);
      this.pendingCommitTimer = null;
    }

    if (this.connection) {
      this.connection.db.world_chunk_data.removeOnInsert(this.handleChunkInsert);
      this.connection.db.world_chunk_data.removeOnUpdate(this.handleChunkUpdate);
      this.connection.db.world_chunk_data.removeOnDelete(this.handleChunkDelete);
    }

    this.connection = null;
    this.chunkCache.clear();
    runtimeEngine.setWorldChunkDataMap(new Map());
  }

  private scheduleCommit(): void {
    if (this.pendingCommitTimer) {
      return;
    }

    // SpacetimeDB can apply chunk rows in bursts. Publish one snapshot after the
    // burst instead of forcing React subscribers to recompute for every row.
    this.pendingCommitTimer = setTimeout(() => {
      this.pendingCommitTimer = null;
      this.commit();
    }, 0);
  }

  private commit(): void {
    runtimeEngine.setWorldChunkDataMap(new Map(this.chunkCache));
  }
}

export const worldChunkDataRuntime = new WorldChunkDataRuntime();
