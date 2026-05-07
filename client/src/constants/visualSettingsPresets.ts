/**
 * Shared visual preset values for SettingsContext defaults and the Visual Cortex menu.
 * Performance baseline is the first-run default; advanced is opt-in from the menu.
 */

export const PERFORMANCE_VISUAL_DEFAULTS = {
    allShadowsEnabled: false,
    treeShadowsEnabled: false,
    weatherOverlayEnabled: false,
    stormAtmosphereEnabled: false,
    statusOverlaysEnabled: false,
    grassEnabled: true,
    grassAnimationEnabled: false,
    alwaysShowPlayerNames: true,
    cloudsEnabled: false,
    waterSurfaceEffectsEnabled: false,
    waterSurfaceEffectsIntensity: 0,
    worldParticlesQuality: 0,
    footprintsEnabled: false,
    bloomIntensity: 0,
    vignetteIntensity: 0,
    chromaticAberrationIntensity: 0,
    colorCorrection: 50,
} as const;

/** Former default “full fidelity” configuration — enabled only via Advanced Graphics. */
export const ADVANCED_VISUAL_DEFAULTS = {
    allShadowsEnabled: true,
    treeShadowsEnabled: true,
    weatherOverlayEnabled: true,
    stormAtmosphereEnabled: true,
    statusOverlaysEnabled: true,
    grassEnabled: true,
    grassAnimationEnabled: true,
    alwaysShowPlayerNames: true,
    cloudsEnabled: true,
    waterSurfaceEffectsEnabled: true,
    waterSurfaceEffectsIntensity: 75,
    worldParticlesQuality: 2,
    footprintsEnabled: true,
    bloomIntensity: 0,
    vignetteIntensity: 0,
    chromaticAberrationIntensity: 0,
    colorCorrection: 50,
} as const;
