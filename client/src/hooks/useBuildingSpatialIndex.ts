import { useEffect, useMemo, useState } from 'react';
import { DbConnection } from '../generated';
import type { Fence, FoundationCell, WallCell } from '../generated/types';

export function getBuildingCellKey(cellX: number, cellY: number): string {
  return `${cellX},${cellY}`;
}

type CellPosition = {
  cellX: number;
  cellY: number;
  isDestroyed?: boolean;
};

type TableHandle<Row> = {
  iter(): Iterable<Row>;
  onInsert(cb: (...args: any[]) => void): void;
  onUpdate(cb: (...args: any[]) => void): void;
  onDelete(cb: (...args: any[]) => void): void;
  removeOnInsert(cb: (...args: any[]) => void): void;
  removeOnUpdate(cb: (...args: any[]) => void): void;
  removeOnDelete(cb: (...args: any[]) => void): void;
};

function useTableVersion<Row>(table: TableHandle<Row> | null): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!table) return;

    const bumpVersion = () => {
      setVersion((currentVersion) => currentVersion + 1);
    };

    table.onInsert(bumpVersion);
    table.onUpdate(bumpVersion);
    table.onDelete(bumpVersion);

    return () => {
      table.removeOnInsert(bumpVersion);
      table.removeOnUpdate(bumpVersion);
      table.removeOnDelete(bumpVersion);
    };
  }, [table]);

  return version;
}

function buildActiveRowsByCell<Row extends CellPosition>(rows: Iterable<Row>): Map<string, Row[]> {
  const rowsByCell = new Map<string, Row[]>();

  for (const row of rows) {
    if (row.isDestroyed) continue;

    const key = getBuildingCellKey(row.cellX, row.cellY);
    const existingRows = rowsByCell.get(key);
    if (existingRows) {
      existingRows.push(row);
    } else {
      rowsByCell.set(key, [row]);
    }
  }

  return rowsByCell;
}

export interface BuildingSpatialIndex {
  foundationsByCell: Map<string, FoundationCell[]>;
  wallsByCell: Map<string, WallCell[]>;
  fencesByCell: Map<string, Fence[]>;
}

export function useBuildingSpatialIndex(connection: DbConnection | null): BuildingSpatialIndex {
  const foundationTable = connection?.db.foundation_cell ?? null;
  const wallTable = connection?.db.wall_cell ?? null;
  const fenceTable = connection?.db.fence ?? null;

  const foundationVersion = useTableVersion(foundationTable);
  const wallVersion = useTableVersion(wallTable);
  const fenceVersion = useTableVersion(fenceTable);

  return useMemo(() => {
    if (!connection) {
      return {
        foundationsByCell: new Map<string, FoundationCell[]>(),
        wallsByCell: new Map<string, WallCell[]>(),
        fencesByCell: new Map<string, Fence[]>(),
      };
    }

    return {
      foundationsByCell: buildActiveRowsByCell(connection.db.foundation_cell.iter()),
      wallsByCell: buildActiveRowsByCell(connection.db.wall_cell.iter()),
      fencesByCell: buildActiveRowsByCell(connection.db.fence.iter()),
    };
  }, [connection, foundationVersion, wallVersion, fenceVersion]);
}
