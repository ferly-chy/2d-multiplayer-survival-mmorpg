import { useMemo, useRef, useCallback, type MutableRefObject } from 'react';
import { useCampfireParticles } from '../../hooks/useCampfireParticles';
import { useCampfireFireOverlayEmitters } from '../../hooks/useCampfireFireOverlayEmitters';
import { useTorchParticles } from '../../hooks/useTorchParticles';
import { useWardParticles } from '../../hooks/useWardParticles';
import { useResourceSparkleParticles } from '../../hooks/useResourceSparkleParticles';
import { useHostileDeathEffects } from '../../hooks/useHostileDeathEffects';
import { useImpactParticles } from '../../hooks/useImpactParticles';
import { useStructureImpactParticles } from '../../hooks/useStructureImpactParticles';
import { useFireArrowParticles } from '../../hooks/useFireArrowParticles';
import { useFirePatchParticles } from '../../hooks/useFirePatchParticles';
import { useFurnaceParticles } from '../../hooks/useFurnaceParticles';
import { useBarbecueParticles } from '../../hooks/useBarbecueParticles';
import { renderParticlesToCanvas } from '../../utils/renderers/particleRenderingUtils';
import type { GameCanvasRuntimeParticleSnapshot, GameCanvasRuntimeSceneSnapshot } from './GameCanvasRuntimeHost';

interface UseGameCanvasParticleRuntimeOptions {
  localPlayer: any;
  sceneRuntime: GameCanvasRuntimeSceneSnapshot;
  localPlayerId?: string;
  /** Updated each simulation tick; torch CPU particles match client facing like the canvas. */
  localFacingDirectionRef?: MutableRefObject<string | undefined>;
}

/**
 * React adapter that produces particle state for the non-React canvas host.
 *
 * This isolates particle production from hook-side environmental and gameplay
 * effects so the host can consume a cleaner, render-focused effects surface.
 */
export function useGameCanvasParticleRuntime({
  localPlayer,
  sceneRuntime,
  localPlayerId,
  localFacingDirectionRef,
}: UseGameCanvasParticleRuntimeOptions): GameCanvasRuntimeParticleSnapshot {
  const memoryParticleGradientCacheRef = useRef<Map<string, CanvasGradient>>(new Map());
  const particleBucketsRef = useRef<{
    fire: any[];
    ember: any[];
    spark: any[];
    other: any[];
    memory: any[];
    regularSmoke: any[];
  }>({
    fire: [],
    ember: [],
    spark: [],
    other: [],
    memory: [],
    regularSmoke: [],
  });

  const villageCampfirePositions = useMemo(() => {
    const monumentParts = sceneRuntime.monumentParts;
    if (!monumentParts || monumentParts.size === 0) {
      return [];
    }

    const positions: { id: string; posX: number; posY: number }[] = [];
    monumentParts.forEach((part: any) => {
      const tag = part.monumentType?.tag ?? '';
      const isFishingVillageCampfire = tag === 'FishingVillage' && part.isCenter;
      const isHuntingVillageCampfire = tag === 'HuntingVillage' && part.partType === 'campfire';

      if ((isFishingVillageCampfire || isHuntingVillageCampfire) && part.imagePath === 'fv_campfire.png') {
        positions.push({ id: part.id.toString(), posX: part.worldX, posY: part.worldY });
      }
    });
    return positions;
  }, [sceneRuntime.monumentParts]);

  const computeCampfireFireOverlayEmitters = useCampfireFireOverlayEmitters({
    visibleCampfiresMap: sceneRuntime.visibleCampfiresMap,
    staticCampfires: villageCampfirePositions,
  });

  const campfireParticles = useCampfireParticles({
    visibleCampfiresMap: sceneRuntime.visibleCampfiresMap,
    deltaTime: 0,
    staticCampfires: villageCampfirePositions,
  });

  const torchParticles = useTorchParticles({
    players: sceneRuntime.players,
    activeEquipments: sceneRuntime.activeEquipments,
    itemDefinitions: sceneRuntime.itemDefinitions,
    deltaTime: 0,
    localPlayerId,
    localFacingDirectionRef,
  });

  const fireArrowParticles = useFireArrowParticles({
    players: sceneRuntime.players,
    activeEquipments: sceneRuntime.activeEquipments,
    itemDefinitions: sceneRuntime.itemDefinitions,
    projectiles: sceneRuntime.renderableProjectiles,
    deltaTime: 0,
  });

  const furnaceParticles = useFurnaceParticles({
    visibleFurnacesMap: sceneRuntime.visibleFurnacesMap,
  });

  const barbecueParticles = useBarbecueParticles({
    visibleBarbecuesMap: sceneRuntime.visibleBarbecuesMap,
  });

  const firePatchParticles = useFirePatchParticles({
    visibleFirePatchesMap: sceneRuntime.firePatches,
    localPlayer: localPlayer ?? null,
  });

  const wardParticles = useWardParticles({
    visibleLanternsMap: sceneRuntime.visibleLanternsMap,
    deltaTime: 0,
  });

  const resourceSparkleParticles = useResourceSparkleParticles({
    harvestableResources: sceneRuntime.visibleHarvestableResourcesMap,
    cycleProgress: sceneRuntime.worldState?.cycleProgress ?? 0.5,
  });

  const hostileDeathParticles = useHostileDeathEffects({
    hostileDeathEvents: sceneRuntime.hostileDeathEvents,
  });

  const impactParticles = useImpactParticles({
    wildAnimals: sceneRuntime.wildAnimals,
    animalCorpses: sceneRuntime.animalCorpses,
    localPlayer,
  });

  const structureImpactParticles = useStructureImpactParticles({
    walls: sceneRuntime.wallCells,
    doors: sceneRuntime.doors,
    shelters: sceneRuntime.shelters,
  });

  const renderParticles = useCallback((ctx: CanvasRenderingContext2D, particles: any[]) => {
    renderParticlesToCanvas(
      ctx,
      particles,
      particleBucketsRef.current,
      memoryParticleGradientCacheRef.current,
    );
  }, []);

  return {
    renderParticles,
    computeCampfireFireOverlayEmitters,
    campfireParticles,
    torchParticles,
    fireArrowParticles,
    furnaceParticles,
    barbecueParticles,
    firePatchParticles,
    wardParticles,
    resourceSparkleParticles,
    hostileDeathParticles,
    impactParticles,
    structureImpactParticles,
  };
}
