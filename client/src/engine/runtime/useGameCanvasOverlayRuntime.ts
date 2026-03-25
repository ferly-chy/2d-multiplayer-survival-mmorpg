import { usePlayerHover } from '../../hooks/usePlayerHover';
import { usePlantedSeedHover } from '../../hooks/usePlantedSeedHover';
import { useTamedAnimalHover } from '../../hooks/useTamedAnimalHover';
import type { GameCanvasOverlayUIProps } from '../../components/GameCanvasOverlayUI';
import type { GameCanvasRuntimeControllerSnapshot } from './GameCanvasRuntimeHost';

interface UseGameCanvasOverlayRuntimeOptions {
  connection: any;
  localPlayerId?: string;
  itemImagesRef: any;
  deathMarkerImg: any;
  pinMarkerImg: any;
  campfireWarmthImg: any;
  torchOnImg: any;
  canvasSize: { width: number; height: number };
  controllerRuntime: GameCanvasRuntimeControllerSnapshot;
  plantedSeeds: Map<any, any>;
  wildAnimals: Map<any, any>;
}

/**
 * React-side overlay adapter that owns hover derivation and assembles the
 * narrow prop surface consumed by `GameCanvasOverlayUI`.
 */
export function useGameCanvasOverlayRuntime({
  connection,
  localPlayerId,
  itemImagesRef,
  deathMarkerImg,
  pinMarkerImg,
  campfireWarmthImg,
  torchOnImg,
  canvasSize,
  controllerRuntime,
  plantedSeeds,
  wildAnimals,
}: UseGameCanvasOverlayRuntimeOptions) {
  const { hoveredPlayerIds, handlePlayerHover } = usePlayerHover();

  const { hoveredSeed } = usePlantedSeedHover(
    plantedSeeds,
    controllerRuntime.worldMousePos.x,
    controllerRuntime.worldMousePos.y,
  );

  const { hoveredTamedAnimal } = useTamedAnimalHover(
    wildAnimals,
    controllerRuntime.worldMousePos.x,
    controllerRuntime.worldMousePos.y,
  );

  const overlayProps: GameCanvasOverlayUIProps = {
    connection,
    localPlayerId,
    itemImagesRef,
    deathMarkerImg,
    pinMarkerImg,
    campfireWarmthImg,
    torchOnImg,
    canvasSize,
    showBuildingRadialMenu: controllerRuntime.showBuildingRadialMenu,
    radialMenuMouseX: controllerRuntime.radialMenuMouseX,
    radialMenuMouseY: controllerRuntime.radialMenuMouseY,
    buildingActions: controllerRuntime.buildingActions,
    setShowBuildingRadialMenu: controllerRuntime.setShowBuildingRadialMenu,
    showUpgradeRadialMenu: controllerRuntime.showUpgradeRadialMenu,
    setShowUpgradeRadialMenu: controllerRuntime.setShowUpgradeRadialMenu,
    upgradeMenuFoundationRef: controllerRuntime.upgradeMenuFoundationRef,
    upgradeMenuWallRef: controllerRuntime.upgradeMenuWallRef,
    upgradeMenuFenceRef: controllerRuntime.upgradeMenuFenceRef,
    hoveredSeed,
    canvasMousePos: controllerRuntime.canvasMousePos,
    hoveredTamedAnimal,
  };

  return {
    hoveredPlayerIds,
    handlePlayerHover,
    overlayProps,
  };
}
