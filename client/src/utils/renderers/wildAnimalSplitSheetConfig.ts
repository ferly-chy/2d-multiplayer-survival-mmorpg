/**
 * Wild animals that use per-direction walking strips (see npcDirectionalWalkingSheetAssets.ts).
 * Add `AnimalSpecies` tag → asset folder/file prefix when PNGs exist.
 */
import {
    collectNpcWalkingSheetUrlsForPrefixes,
    getNpcWalkingSheetUrl,
    type CardinalDirection,
} from './npcDirectionalWalkingSheetAssets';

/** Maps SpacetimeDB species tag to `assets/npcs/{prefix}/{prefix}_*_walking.png` prefix. */
export const DIRECTIONAL_SHEET_SPECIES_PREFIX: Record<string, string> = {
    BeachCrab: 'crab',
    // PolarBear: 'polar_bear',
    // TundraWolf: 'tundra_wolf',
};

export const SPLIT_DIRECTIONAL_SHEET_SPECIES = new Set(Object.keys(DIRECTIONAL_SHEET_SPECIES_PREFIX));

export type { CardinalDirection };

export function usesSplitDirectionalSheets(speciesTag: string): boolean {
    return SPLIT_DIRECTIONAL_SHEET_SPECIES.has(speciesTag);
}

export function normalizeFacingDirectionToCardinal(direction: string): CardinalDirection {
    let normalizedDir = direction.toLowerCase();

    if (normalizedDir === 'up_left' || normalizedDir === 'up-left' || normalizedDir === 'upleft') {
        normalizedDir = 'left';
    } else if (normalizedDir === 'up_right' || normalizedDir === 'up-right' || normalizedDir === 'upright') {
        normalizedDir = 'right';
    } else if (normalizedDir === 'down_left' || normalizedDir === 'down-left' || normalizedDir === 'downleft') {
        normalizedDir = 'left';
    } else if (normalizedDir === 'down_right' || normalizedDir === 'down-right' || normalizedDir === 'downright') {
        normalizedDir = 'right';
    }

    if (normalizedDir !== 'down' && normalizedDir !== 'right' && normalizedDir !== 'left' && normalizedDir !== 'up') {
        normalizedDir = 'down';
    }

    return normalizedDir as CardinalDirection;
}

export function getWildAnimalSplitSheetUrl(speciesTag: string, facingDirection: string): string | undefined {
    const prefix = DIRECTIONAL_SHEET_SPECIES_PREFIX[speciesTag];
    if (!prefix) return undefined;
    return getNpcWalkingSheetUrl(prefix, normalizeFacingDirectionToCardinal(facingDirection));
}

/** Corpse pose: down-facing strip, frame 0. */
export function getWildAnimalCorpseDirectionalSheetUrl(speciesTag: string): string | undefined {
    const prefix = DIRECTIONAL_SHEET_SPECIES_PREFIX[speciesTag];
    if (!prefix || !usesSplitDirectionalSheets(speciesTag)) return undefined;
    return getNpcWalkingSheetUrl(prefix, 'down');
}

/** All resolved URLs for registered species (preload). */
export const REGISTERED_DIRECTIONAL_SHEET_PRELOAD_URLS: readonly string[] = collectNpcWalkingSheetUrlsForPrefixes(
    Object.values(DIRECTIONAL_SHEET_SPECIES_PREFIX),
);
