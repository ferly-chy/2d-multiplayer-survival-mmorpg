import type { DualGridTileInfo } from '../dualGridAutotile';
import type { ProceduralBlendConfig } from './dualGridProceduralBlendRegistry';

export interface CornerWeights {
    readonly tl: number;
    readonly tr: number;
    readonly bl: number;
    readonly br: number;
}

function bitsToWeights(index: number): CornerWeights {
    return {
        tl: (index & 8) ? 1 : 0,
        tr: (index & 4) ? 1 : 0,
        bl: (index & 2) ? 1 : 0,
        br: (index & 1) ? 1 : 0,
    };
}

function invertWeights(weights: CornerWeights): CornerWeights {
    return {
        tl: 1 - weights.tl,
        tr: 1 - weights.tr,
        bl: 1 - weights.bl,
        br: 1 - weights.br,
    };
}

/**
 * Returns per-corner weights for config.terrainB in world corner order.
 *
 * DualGridTileInfo.dualGridIndex is already inverted for reversed atlas lookup.
 * For two-terrain cells that means:
 * - normal lookup: bits represent the original secondary terrain
 * - reversed lookup: bits represent the original primary terrain
 *
 * Atlas flip flags are intentionally not applied here. They are sprite-orientation
 * corrections for authored diagonal tiles; these weights describe the actual
 * terrain corners and are the right input for generated procedural masks.
 */
export function getProceduralBlendCornerWeights(
    tileInfo: DualGridTileInfo,
    config: ProceduralBlendConfig
): CornerWeights | null {
    const secondary = tileInfo.secondaryTerrain;
    if (!secondary) {
        return null;
    }

    const bitsRepresentTerrain =
        tileInfo.isReversedTileset ? tileInfo.primaryTerrain : secondary;

    const bits = bitsToWeights(tileInfo.dualGridIndex);
    return bitsRepresentTerrain === config.terrainB ? bits : invertWeights(bits);
}
