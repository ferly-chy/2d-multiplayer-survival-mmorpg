/**

 * Wild animals that use per-direction walking strips (see npcDirectionalWalkingSheetAssets.ts).

 * Add `AnimalSpecies` tag → asset prefix + strip layout when PNGs exist.

 */

import {

    collectNpcWalkingSheetUrlsForPrefixes,

    getNpcWalkingSheetUrl,

    DEFAULT_DIRECTIONAL_WALKING_STRIP_LAYOUT,

    type CardinalDirection,

    type DirectionalWalkingStripLayout,

} from './npcDirectionalWalkingSheetAssets';



export type { CardinalDirection, DirectionalWalkingStripLayout };



/** Prefix under `assets/npcs/{prefix}/` plus frame layout for that species' strips. */

export const WILD_ANIMAL_DIRECTIONAL_SHEET_CONFIG: Record<

    string,

    { prefix: string; layout: DirectionalWalkingStripLayout }

> = {

    BeachCrab: { prefix: 'crab', layout: DEFAULT_DIRECTIONAL_WALKING_STRIP_LAYOUT },

    // 588×98 sheet → 6×98×98 frames

    TundraWolf: { prefix: 'tundra_wolf', layout: { frameWidth: 98, frameHeight: 98, cols: 6 } },

    // PolarBear: { prefix: 'polar_bear', layout: { ... } },

};



/** Maps species tag → npc folder prefix (convenience for tooling). */

export const DIRECTIONAL_SHEET_SPECIES_PREFIX: Record<string, string> = Object.fromEntries(

    Object.entries(WILD_ANIMAL_DIRECTIONAL_SHEET_CONFIG).map(([tag, { prefix }]) => [tag, prefix]),

);



export const SPLIT_DIRECTIONAL_SHEET_SPECIES = new Set(Object.keys(WILD_ANIMAL_DIRECTIONAL_SHEET_CONFIG));



export function getWildAnimalDirectionalStripLayout(speciesTag: string): DirectionalWalkingStripLayout | undefined {

    return WILD_ANIMAL_DIRECTIONAL_SHEET_CONFIG[speciesTag]?.layout;

}



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

    const entry = WILD_ANIMAL_DIRECTIONAL_SHEET_CONFIG[speciesTag];

    if (!entry) return undefined;

    return getNpcWalkingSheetUrl(entry.prefix, normalizeFacingDirectionToCardinal(facingDirection));

}



/** Corpse pose: down-facing strip, frame 0. */

export function getWildAnimalCorpseDirectionalSheetUrl(speciesTag: string): string | undefined {

    const entry = WILD_ANIMAL_DIRECTIONAL_SHEET_CONFIG[speciesTag];

    if (!entry || !usesSplitDirectionalSheets(speciesTag)) return undefined;

    return getNpcWalkingSheetUrl(entry.prefix, 'down');

}



const UNIQUE_DIRECTIONAL_PREFIXES: readonly string[] = [

    ...new Set(Object.values(WILD_ANIMAL_DIRECTIONAL_SHEET_CONFIG).map((c) => c.prefix)),

];



/** All resolved URLs for registered species (preload). */

export const REGISTERED_DIRECTIONAL_SHEET_PRELOAD_URLS: readonly string[] =

    collectNpcWalkingSheetUrlsForPrefixes(UNIQUE_DIRECTIONAL_PREFIXES);


