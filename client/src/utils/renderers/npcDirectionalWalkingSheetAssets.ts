/**
 * Shared NPC walking strips: one PNG per cardinal direction, horizontal 1×6 layout.
 *
 * Convention (under `client/src/assets/npcs/{prefix}/`):
 *   {prefix}_down_walking.png
 *   {prefix}_up_walking.png
 *   {prefix}_left_walking.png
 *   {prefix}_right_walking.png
 *
 * Each file: N frames × frameSize in one horizontal row (default 6×64×64 → 384×64).
 * Per-species frame size lives in `wildAnimalSplitSheetConfig` (`WILD_ANIMAL_DIRECTIONAL_SHEET_CONFIG`).
 */
type AssetModule = { default: string };

const npcPngModules = import.meta.glob<AssetModule>('../../assets/npcs/**/*.png', { eager: true });

const WALKING_SHEET_FILENAME_RE = /^(.+)_(down|up|left|right)_walking\.png$/i;

function fileNameFromGlobPath(globPath: string): string {
    const parts = globPath.split(/[/\\]/);
    return parts[parts.length - 1] ?? '';
}

function buildWalkingSheetUrlByFilename(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [path, mod] of Object.entries(npcPngModules)) {
        const fileName = fileNameFromGlobPath(path);
        if (!WALKING_SHEET_FILENAME_RE.test(fileName)) continue;
        map.set(fileName.toLowerCase(), mod.default);
    }
    return map;
}

const walkingSheetUrlByFileName = buildWalkingSheetUrlByFilename();

export type CardinalDirection = 'down' | 'right' | 'left' | 'up';

export function getNpcWalkingSheetUrl(assetPrefix: string, direction: CardinalDirection): string | undefined {
    const fileName = `${assetPrefix}_${direction}_walking.png`.toLowerCase();
    return walkingSheetUrlByFileName.get(fileName);
}

export function collectNpcWalkingSheetUrlsForPrefixes(prefixes: readonly string[]): string[] {
    const dirs: CardinalDirection[] = ['down', 'up', 'left', 'right'];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const prefix of prefixes) {
        for (const d of dirs) {
            const url = getNpcWalkingSheetUrl(prefix, d);
            if (url && !seen.has(url)) {
                seen.add(url);
                out.push(url);
            }
        }
    }
    return out;
}

/** One horizontal strip: `cols` frames of `frameWidth`×`frameHeight`. */
export interface DirectionalWalkingStripLayout {
    frameWidth: number;
    frameHeight: number;
    cols: number;
}

/** Default strip layout (e.g. BeachCrab): 6×64×64 → 384×64. */
export const DEFAULT_DIRECTIONAL_WALKING_STRIP_LAYOUT: DirectionalWalkingStripLayout = {
    frameWidth: 64,
    frameHeight: 64,
    cols: 6,
};

/** Legacy aliases (default strip); prefer `DEFAULT_DIRECTIONAL_WALKING_STRIP_LAYOUT`. */
export const DIRECTIONAL_WALKING_STRIP_FRAME_WIDTH = DEFAULT_DIRECTIONAL_WALKING_STRIP_LAYOUT.frameWidth;
export const DIRECTIONAL_WALKING_STRIP_FRAME_HEIGHT = DEFAULT_DIRECTIONAL_WALKING_STRIP_LAYOUT.frameHeight;
export const DIRECTIONAL_WALKING_STRIP_FRAME_COLS = DEFAULT_DIRECTIONAL_WALKING_STRIP_LAYOUT.cols;

export function getDirectionalWalkingStripSourceRect(
    animationFrame: number,
    layout: DirectionalWalkingStripLayout = DEFAULT_DIRECTIONAL_WALKING_STRIP_LAYOUT,
): {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
} {
    const cols = layout.cols;
    const col = ((animationFrame % cols) + cols) % cols;
    const w = layout.frameWidth;
    const h = layout.frameHeight;
    return { sx: col * w, sy: 0, sw: w, sh: h };
}
