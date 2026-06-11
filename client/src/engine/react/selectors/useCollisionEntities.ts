/**
 * Selector hook for collision entities used by usePredictedMovement.
 * Memoizes filtered viewport-visible entities to avoid unnecessary recalculations.
 */
import { useMemo } from 'react';
import { useEngineSnapshot } from '../useEngineSnapshot';
import { filterVisibleEntities, filterVisibleTrees } from '../../../utils/entityFilteringUtils';
import type { GameEntities } from '../../../utils/clientCollision';

const EMPTY_MAP = new Map<string, unknown>();

function getTable<T = Map<string, unknown>>(tables: Record<string, unknown>, key: string): T {
  const val = tables[key];
  return (val as T) ?? (EMPTY_MAP as T);
}

export function useCollisionEntities(): GameEntities {
  const viewport = useEngineSnapshot((s) => s.world.viewport);
  const tables = useEngineSnapshot((s) => s.world.tables);

  return useMemo(() => {
    const viewBounds = viewport
      ? {
          viewMinX: viewport.minX,
          viewMinY: viewport.minY,
          viewMaxX: viewport.maxX,
          viewMaxY: viewport.maxY,
        }
      : null;
    const now = Date.now();

    const trees = getTable<Map<string, unknown>>(tables, 'trees');
    const stones = getTable<Map<string, unknown>>(tables, 'stones');
    const runeStones = getTable<Map<string, unknown>>(tables, 'runeStones');
    const cairns = getTable<Map<string, unknown>>(tables, 'cairns');

    return {
      trees: viewBounds
        ? new Map(filterVisibleTrees(trees, viewBounds, now).map((t) => [(t as { id: { toString: () => string } }).id.toString(), t]))
        : EMPTY_MAP,
      stones,
      runeStones: viewBounds
        ? new Map(filterVisibleEntities(runeStones, viewBounds, now).map((rs) => [(rs as { id: { toString: () => string } }).id.toString(), rs]))
        : EMPTY_MAP,
      cairns: viewBounds
        ? new Map(filterVisibleEntities(cairns, viewBounds, now).map((c) => [(c as { id: { toString: () => string } }).id.toString(), c]))
        : EMPTY_MAP,
      boxes: getTable(tables, 'woodenStorageBoxes'),
      rainCollectors: getTable(tables, 'rainCollectors'),
      furnaces: getTable(tables, 'furnaces'),
      barbecues: getTable(tables, 'barbecues'),
      shelters: getTable(tables, 'shelters'),
      players: getTable(tables, 'players'),
      wildAnimals: getTable(tables, 'wildAnimals'),
      barrels: getTable(tables, 'barrels'),
      roadLampposts: getTable(tables, 'roadLampposts'),
      seaStacks: getTable(tables, 'seaStacks'),
      wallCells: getTable(tables, 'wallCells'),
      foundationCells: getTable(tables, 'foundationCells'),
      homesteadHearths: getTable(tables, 'homesteadHearths'),
      basaltColumns: getTable(tables, 'basaltColumns'),
      livingCorals: getTable(tables, 'livingCorals'),
      doors: getTable(tables, 'doors'),
      fences: getTable(tables, 'fences'),
      alkStations: getTable(tables, 'alkStations'),
      lanterns: getTable(tables, 'lanterns'),
      turrets: getTable(tables, 'turrets'),
      monumentParts: (getTable(tables, 'monumentParts') as Map<string, unknown>) ?? EMPTY_MAP,
    } as GameEntities;
  }, [viewport, tables]);
}
