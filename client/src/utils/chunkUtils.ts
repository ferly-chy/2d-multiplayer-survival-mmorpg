import { gameConfig } from '../config/gameConfig';

// Type definition for viewport bounds
interface Viewport {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/**
 * Calculates the 1D chunk indices that overlap with the given viewport bounds.
 * Assumes a row-major order for chunk indexing (index = y * width + x).
 * IMPORTANT: This calculation MUST match the server's chunk index assignment logic.
 *
 * @param viewport The viewport boundaries { minX, minY, maxX, maxY }.
 * @returns An array of 1D chunk indices.
 */
export const getChunkIndicesForViewport = (viewport: Viewport | null): number[] => {
    return getChunkIndicesForViewportWithBuffer(viewport, 0);
};

/**
 * OPTIMIZED: Calculates chunk indices with a buffer zone to prevent subscription lag at boundaries.
 * Buffer chunks are loaded ahead of time and kept after leaving to smooth chunk transitions.
 *
 * @param viewport The viewport boundaries { minX, minY, maxX, maxY }.
 * @param bufferChunks Number of extra chunks to load in each direction (0 = no buffer, 1 = 1 chunk buffer, etc.)
 * @returns An array of 1D chunk indices including buffer zone.
 */
export const getChunkIndicesForViewportWithBuffer = (viewport: Viewport | null, bufferChunks: number = 1): number[] => {
    if (!viewport) return [];

    const { chunkSizePx, worldWidthChunks, worldHeightChunks } = gameConfig;

    // Calculate the range of chunk coordinates (X and Y) covered by the viewport
    // Apply buffer zone by expanding the range
    const baseMinChunkX = Math.floor(viewport.minX / chunkSizePx);
    const baseMaxChunkX = Math.floor(viewport.maxX / chunkSizePx);
    const baseMinChunkY = Math.floor(viewport.minY / chunkSizePx);
    const baseMaxChunkY = Math.floor(viewport.maxY / chunkSizePx);

    // Apply buffer and ensure chunk coordinates stay within world bounds
    const minChunkX = Math.max(0, baseMinChunkX - bufferChunks);
    const maxChunkX = Math.min(worldWidthChunks - 1, baseMaxChunkX + bufferChunks);
    const minChunkY = Math.max(0, baseMinChunkY - bufferChunks);
    const maxChunkY = Math.min(worldHeightChunks - 1, baseMaxChunkY + bufferChunks);

    const indices: number[] = [];

    // Iterate through the buffered 2D chunk range and calculate the 1D index
    for (let y = minChunkY; y <= maxChunkY; y++) {
        for (let x = minChunkX; x <= maxChunkX; x++) {
            // Calculate 1D index using row-major order
            const index = y * worldWidthChunks + x;
            indices.push(index);
        }
    }
    
    return indices;
};

/**
 * Calculates the chunk index for a given world position.
 * Matches the server's calculate_chunk_index function exactly.
 * 
 * @param posX X position in pixels
 * @param posY Y position in pixels
 * @returns The 1D chunk index (row-major ordering)
 */
export const calculateChunkIndex = (posX: number, posY: number): number => {
    const { chunkSizeTiles, worldWidthChunks, worldHeightChunks, tileSize } = gameConfig;
    
    // Convert position to tile coordinates (matching server logic)
    const tileX = Math.floor(posX / tileSize);
    const tileY = Math.floor(posY / tileSize);
    
    // Calculate chunk coordinates (which chunk the tile is in)
    const chunkX = Math.min(Math.floor(tileX / chunkSizeTiles), worldWidthChunks - 1);
    const chunkY = Math.min(Math.floor(tileY / chunkSizeTiles), worldHeightChunks - 1);
    
    // Calculate 1D chunk index (row-major ordering)
    return chunkY * worldWidthChunks + chunkX;
}; 