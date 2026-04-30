import { useState, useRef, useEffect, useMemo } from 'react';
import { PlantedSeed } from '../generated/types';

const SEED_HOVER_RADIUS = 30;
const SEED_HOVER_RADIUS_SQ = SEED_HOVER_RADIUS * SEED_HOVER_RADIUS;

/** World units per spatial bucket (~tile width); hover radius 30px needs at most ±1 cell overlap */
const BUCKET_CELL = 48;
const BUCKET_SCAN_RADIUS = 1;

type SeedBuckets = Map<string, string[]>;

function cellKeyForWorldPos(x: number, y: number): string {
  const cx = Math.floor(x / BUCKET_CELL);
  const cy = Math.floor(y / BUCKET_CELL);
  return `${cx},${cy}`;
}

function buildSeedBuckets(seeds: Map<string, PlantedSeed>): SeedBuckets {
  const buckets: SeedBuckets = new Map();
  for (const [id, seed] of seeds) {
    const key = cellKeyForWorldPos(seed.posX, seed.posY);
    let list = buckets.get(key);
    if (!list) {
      list = [];
      buckets.set(key, list);
    }
    list.push(id);
  }
  return buckets;
}

function findClosestSeedIdWithBuckets(
  seeds: Map<string, PlantedSeed>,
  buckets: SeedBuckets,
  worldMouseX: number,
  worldMouseY: number,
): string | null {
  const cx = Math.floor(worldMouseX / BUCKET_CELL);
  const cy = Math.floor(worldMouseY / BUCKET_CELL);
  let closestId: string | null = null;
  let closestDistSq = SEED_HOVER_RADIUS_SQ;

  for (let dy = -BUCKET_SCAN_RADIUS; dy <= BUCKET_SCAN_RADIUS; dy++) {
    for (let dx = -BUCKET_SCAN_RADIUS; dx <= BUCKET_SCAN_RADIUS; dx++) {
      const list = buckets.get(`${cx + dx},${cy + dy}`);
      if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        const id = list[i]!;
        const seed = seeds.get(id);
        if (!seed) continue;
        const ddx = worldMouseX - seed.posX;
        const ddy = worldMouseY - seed.posY;
        const distSq = ddx * ddx + ddy * ddy;
        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closestId = id;
        }
      }
    }
  }

  return closestId;
}

/**
 * Hook to manage planted seed hover states for displaying info tooltips.
 *
 * Performance: `plantedSeeds` gets a new Map reference on many SpacetimeDB updates (growth ticks).
 * We keep a spatial bucket index rebuilt only when `plantedSeeds.size` changes. Hover checks
 * only inspect the cursor bucket and its neighbors; no full-table fallback runs on mousemove.
 *
 * The closest match is exposed as a **primitive id** so downstream effects do not run on every
 * mousemove (tuple/array identity would change each frame).
 */
export function usePlantedSeedHover(
  plantedSeeds: Map<string, PlantedSeed>,
  worldMouseX: number | null,
  worldMouseY: number | null,
) {
  const [hoveredSeedId, setHoveredSeedId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredSeedIdRef = useRef<string | null>(null);
  hoveredSeedIdRef.current = hoveredSeedId;

  const plantedSeedsRef = useRef(plantedSeeds);
  plantedSeedsRef.current = plantedSeeds;

  const bucketIndexRef = useRef<{ size: number; buckets: SeedBuckets } | null>(null);
  const lastSize = plantedSeeds.size;
  if (!bucketIndexRef.current || bucketIndexRef.current.size !== lastSize) {
    bucketIndexRef.current = {
      size: lastSize,
      buckets: buildSeedBuckets(plantedSeeds),
    };
  }

  /** Boolean only flips when pointer leaves/enters canvas — not on every mousemove. */
  const canvasPointerActive = worldMouseX != null && worldMouseY != null;

  const closestSeedId = useMemo((): string | null => {
    if (worldMouseX === null || worldMouseY === null || lastSize === 0) {
      return null;
    }
    const seeds = plantedSeedsRef.current;
    const idx = bucketIndexRef.current;
    if (!idx) {
      return null;
    }
    return findClosestSeedIdWithBuckets(seeds, idx.buckets, worldMouseX, worldMouseY);
  }, [worldMouseX, worldMouseY, lastSize]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canvasPointerActive) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setHoveredSeedId(null);
      return;
    }

    if (closestSeedId) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (hoveredSeedIdRef.current !== closestSeedId) {
        setHoveredSeedId(closestSeedId);
      }
    } else if (hoveredSeedIdRef.current !== null) {
      if (!hoverTimeoutRef.current) {
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredSeedId(null);
          hoverTimeoutRef.current = null;
        }, 150);
      }
    }
  }, [closestSeedId, canvasPointerActive]);

  const hoveredSeed = hoveredSeedId ? plantedSeeds.get(hoveredSeedId) : null;

  useEffect(() => {
    if (!hoveredSeedId) return;
    if (!plantedSeedsRef.current.get(hoveredSeedId)) {
      setHoveredSeedId(null);
    }
  }, [hoveredSeedId, lastSize]);

  return {
    hoveredSeed,
    hoveredSeedId,
  };
}
