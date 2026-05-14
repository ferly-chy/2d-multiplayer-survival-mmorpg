import type { DualGridTileInfo } from '../dualGridAutotile';

export interface ProceduralBlendConfig {
    readonly terrainA: string;
    readonly terrainB: string;
    readonly textureKeyA: string;
    readonly textureKeyB: string;
}

type ProceduralBlendPair = readonly [terrainA: string, terrainB: string];

const PROCEDURAL_BLEND_PAIRS: readonly ProceduralBlendPair[] = [
    ['Grass', 'Beach'],
    ['Grass', 'HotSpringWater'],
    ['Grass', 'Dirt'],
    ['Grass', 'DirtRoad'],
    ['Grass', 'Tundra'],
    ['Grass', 'TundraGrass'],
    ['Grass', 'Forest'],
    ['Forest', 'Beach'],
    ['Forest', 'Dirt'],
    ['Forest', 'DirtRoad'],
    ['Forest', 'Tundra'],
    ['Forest', 'TundraGrass'],
    ['Beach', 'Sea'],
    ['Beach', 'DeepSea'],
    ['Beach', 'HotSpringWater'],
    ['Beach', 'DirtRoad'],
    ['Sea', 'DeepSea'],
    ['Dirt', 'Beach'],
    ['Dirt', 'DirtRoad'],
    ['Dirt', 'Tundra'],
    ['Dirt', 'TundraGrass'],
    ['DirtRoad', 'Tundra'],
    ['DirtRoad', 'TundraGrass'],
    ['Quarry', 'Grass'],
    ['Quarry', 'Dirt'],
    ['Quarry', 'Beach'],
    ['Quarry', 'DirtRoad'],
    ['Quarry', 'Tundra'],
    ['Quarry', 'TundraGrass'],
    ['Quarry', 'Alpine'],
    ['Quarry', 'Forest'],
    ['Asphalt', 'DirtRoad'],
    ['Asphalt', 'Dirt'],
    ['Asphalt', 'Beach'],
    ['Asphalt', 'Alpine'],
    ['Asphalt', 'Tundra'],
    ['Asphalt', 'Sea'],
    ['Asphalt', 'DeepSea'],
    ['Asphalt', 'Grass'],
    ['Alpine', 'DirtRoad'],
    ['Alpine', 'Dirt'],
    ['Alpine', 'Beach'],
    ['Alpine', 'Tundra'],
    ['Alpine', 'TundraGrass'],
    ['Tundra', 'Beach'],
    ['TundraGrass', 'Tundra'],
    ['TundraGrass', 'Beach'],
];

function toTextureKey(terrain: string): string {
    return `${terrain}_base`;
}

const PROCEDURAL_BLEND_CONFIGS: readonly ProceduralBlendConfig[] = PROCEDURAL_BLEND_PAIRS.map(
    ([terrainA, terrainB]) => ({
        terrainA,
        terrainB,
        textureKeyA: toTextureKey(terrainA),
        textureKeyB: toTextureKey(terrainB),
    })
);

function hasTerrainPair(tileInfo: DualGridTileInfo, config: ProceduralBlendConfig): boolean {
    const secondary = tileInfo.secondaryTerrain;
    if (!secondary) return false;

    return (
        (tileInfo.primaryTerrain === config.terrainA && secondary === config.terrainB) ||
        (tileInfo.primaryTerrain === config.terrainB && secondary === config.terrainA)
    );
}

export function getProceduralBlendConfig(tileInfo: DualGridTileInfo): ProceduralBlendConfig | null {
    return PROCEDURAL_BLEND_CONFIGS.find((config) => hasTerrainPair(tileInfo, config)) ?? null;
}

export function isProceduralBlendEnabled(tileInfo: DualGridTileInfo): boolean {
    return getProceduralBlendConfig(tileInfo) !== null;
}

export function getProceduralTransitionKeys(): ReadonlySet<string> {
    const keys = new Set<string>();
    for (const [terrainA, terrainB] of PROCEDURAL_BLEND_PAIRS) {
        keys.add(`${terrainA}_${terrainB}`);
        keys.add(`${terrainB}_${terrainA}`);
    }
    return keys;
}
