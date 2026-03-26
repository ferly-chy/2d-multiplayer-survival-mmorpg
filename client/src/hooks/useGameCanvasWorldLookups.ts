import React, { useEffect, useMemo, useRef } from 'react';
import { useWorldTileCache } from './useWorldTileCache';
import { detectHotSprings } from '../utils/hotSpringDetector';
import { detectQuarries } from '../utils/quarryDetector';
import { getTileTypeFromChunkData } from '../utils/renderers/placementRenderingUtils';
import { isOceanTileTag, isWaterTileTag } from '../utils/tileTypeGuards';
import { gameConfig } from '../config/gameConfig';

const EMPTY_MAP = new Map();
const WORLD_TILE_RENDER_BUFFER_TILES = 4;

interface UseGameCanvasWorldLookupsOptions {
  worldChunkDataMap: Map<string, any> | undefined;
  connection: any;
  cameraOffsetX: number;
  cameraOffsetY: number;
  canvasWidth: number;
  canvasHeight: number;
  localPlayer: any;
}

export function useGameCanvasWorldLookups({
  worldChunkDataMap,
  connection,
  cameraOffsetX,
  cameraOffsetY,
  canvasWidth,
  canvasHeight,
  localPlayer,
}: UseGameCanvasWorldLookupsOptions) {
  const tileSize = gameConfig.tileSize;
  const viewTileX = Math.floor((-cameraOffsetX) / tileSize);
  const viewTileY = Math.floor((-cameraOffsetY) / tileSize);
  const bufferedViewTileX = viewTileX - WORLD_TILE_RENDER_BUFFER_TILES;
  const bufferedViewTileY = viewTileY - WORLD_TILE_RENDER_BUFFER_TILES;

  const worldChunkSize = useMemo(() => {
    if (!worldChunkDataMap || worldChunkDataMap.size === 0) return 8;
    const firstChunk = worldChunkDataMap.values().next().value as { chunkSize?: number } | undefined;
    return firstChunk?.chunkSize ?? 8;
  }, [worldChunkDataMap]);

  const visibleWorldTiles = useMemo(() => {
    const map = new Map<string, any>();
    const chunkSize = worldChunkSize;
    const extraTiles = WORLD_TILE_RENDER_BUFFER_TILES * 2;
    const tilesHorz = Math.ceil(canvasWidth / tileSize) + extraTiles;
    const tilesVert = Math.ceil(canvasHeight / tileSize) + extraTiles;
    const minTileX = Math.max(0, bufferedViewTileX);
    const minTileY = Math.max(0, bufferedViewTileY);
    const maxTileX = bufferedViewTileX + tilesHorz;
    const maxTileY = bufferedViewTileY + tilesVert;
    const typeFromU8 = (value: number): string => {
      switch (value) {
        case 0: return 'Grass';
        case 1: return 'Dirt';
        case 2: return 'DirtRoad';
        case 3: return 'Sea';
        case 4: return 'Beach';
        case 5: return 'Sand';
        case 6: return 'HotSpringWater';
        case 7: return 'Quarry';
        case 8: return 'Asphalt';
        case 9: return 'Forest';
        case 10: return 'Tundra';
        case 11: return 'Alpine';
        case 12: return 'TundraGrass';
        case 13: return 'Tilled';
        case 14: return 'DeepSea';
        default: return 'Grass';
      }
    };

    const chunkSource = worldChunkDataMap ?? EMPTY_MAP;
    for (let ty = minTileY; ty < maxTileY; ty++) {
      for (let tx = minTileX; tx < maxTileX; tx++) {
        const cx = Math.floor(tx / chunkSize);
        const cy = Math.floor(ty / chunkSize);
        const chunk = chunkSource.get(`${cx},${cy}`);
        if (!chunk) continue;
        const localX = tx % chunkSize;
        const localY = ty % chunkSize;
        if (localX < 0 || localY < 0) continue;
        const idx = localY * chunk.chunkSize + localX;
        if (idx < 0 || idx >= chunk.tileTypes.length) continue;
        map.set(`${tx}_${ty}`, {
          worldX: tx,
          worldY: ty,
          tileType: { tag: typeFromU8(chunk.tileTypes[idx]) },
          variant: chunk.variants?.[idx] ?? 0,
        });
      }
    }
    return map;
  }, [bufferedViewTileX, bufferedViewTileY, canvasWidth, canvasHeight, tileSize, worldChunkSize, worldChunkDataMap]);

  const waterTileLookup = useMemo(() => {
    const lookup = new Map<string, boolean>();
    visibleWorldTiles.forEach((tile) => {
      lookup.set(`${tile.worldX},${tile.worldY}`, isWaterTileTag(tile.tileType?.tag));
    });
    return lookup;
  }, [visibleWorldTiles]);

  const seaTransitionTileLookup = useMemo(() => {
    const lookup = new Map<string, boolean>();
    if (!connection) return lookup;
    const isLandAtShore = (tileType: string | null) => tileType === 'Beach' || tileType === 'Asphalt';
    // Include hot spring water so barrel shadows / transition skips match sea-style shoreline rules
    const isShoreWater = (tileType: string | null) =>
      isOceanTileTag(tileType) || tileType === 'HotSpringWater';
    visibleWorldTiles.forEach((tile) => {
      const tx = tile.worldX;
      const ty = tile.worldY;
      const center = getTileTypeFromChunkData(connection, tx, ty);
      const n = getTileTypeFromChunkData(connection, tx, ty - 1);
      const s = getTileTypeFromChunkData(connection, tx, ty + 1);
      const e = getTileTypeFromChunkData(connection, tx + 1, ty);
      const w = getTileTypeFromChunkData(connection, tx - 1, ty);
      const hasWater = isShoreWater(n) || isShoreWater(s) || isShoreWater(e) || isShoreWater(w);
      const hasLand = isLandAtShore(n) || isLandAtShore(s) || isLandAtShore(e) || isLandAtShore(w);
      const isTransition = (isShoreWater(center) && hasLand) || (isLandAtShore(center) && hasWater);
      if (isTransition) {
        lookup.set(`${tx},${ty}`, true);
      }
    });
    return lookup;
  }, [connection, visibleWorldTiles]);

  const { proceduralRenderer, isInitialized: isWorldRendererInitialized, updateTileCache } = useWorldTileCache();

  const detectedHotSprings = useMemo(() => {
    return detectHotSprings((worldChunkDataMap ?? EMPTY_MAP) as Map<string, any>);
  }, [worldChunkDataMap]);

  const detectedQuarries = useMemo(() => {
    return detectQuarries((worldChunkDataMap ?? EMPTY_MAP) as Map<string, any>);
  }, [worldChunkDataMap]);

  useEffect(() => {
    if (visibleWorldTiles.size > 0) {
      updateTileCache(visibleWorldTiles);
    }
  }, [visibleWorldTiles, updateTileCache]);

  const lastShoreCheckPosRef = useRef({ x: 0, y: 0 });
  const cachedDistanceToShoreRef = useRef(9999);

  const distanceToShore = useMemo(() => {
    if (!localPlayer || waterTileLookup.size === 0) {
      return 9999;
    }

    const playerX = localPlayer.positionX;
    const playerY = localPlayer.positionY;
    const dx = playerX - lastShoreCheckPosRef.current.x;
    const dy = playerY - lastShoreCheckPosRef.current.y;
    if (dx * dx + dy * dy < 96 * 96) {
      return cachedDistanceToShoreRef.current;
    }

    lastShoreCheckPosRef.current = { x: playerX, y: playerY };
    const playerTileX = Math.floor(playerX / tileSize);
    const playerTileY = Math.floor(playerY / tileSize);
    const maxSearchRadius = 17;

    for (let radius = 0; radius <= maxSearchRadius; radius++) {
      for (let offsetX = -radius; offsetX <= radius; offsetX++) {
        for (let offsetY = -radius; offsetY <= radius; offsetY++) {
          if (Math.abs(offsetX) !== radius && Math.abs(offsetY) !== radius) continue;
          const tileKey = `${playerTileX + offsetX},${playerTileY + offsetY}`;
          if (waterTileLookup.get(tileKey)) {
            const tileWorldX = (playerTileX + offsetX) * tileSize + tileSize / 2;
            const tileWorldY = (playerTileY + offsetY) * tileSize + tileSize / 2;
            const distX = playerX - tileWorldX;
            const distY = playerY - tileWorldY;
            const distance = Math.sqrt(distX * distX + distY * distY);
            cachedDistanceToShoreRef.current = distance;
            return distance;
          }
        }
      }
    }

    cachedDistanceToShoreRef.current = 9999;
    return 9999;
  }, [localPlayer, tileSize, waterTileLookup]);

  const distanceToMapEdge = useMemo(() => {
    if (!localPlayer) return Infinity;
    const playerX = localPlayer.positionX ?? 0;
    const playerY = localPlayer.positionY ?? 0;
    return Math.min(playerX, gameConfig.worldWidthPx - playerX, playerY, gameConfig.worldHeightPx - playerY);
  }, [localPlayer]);

  return {
    proceduralRenderer,
    isWorldRendererInitialized,
    visibleWorldTiles,
    waterTileLookup,
    seaTransitionTileLookup,
    detectedHotSprings,
    detectedQuarries,
    distanceToShore,
    distanceToMapEdge,
  };
}
