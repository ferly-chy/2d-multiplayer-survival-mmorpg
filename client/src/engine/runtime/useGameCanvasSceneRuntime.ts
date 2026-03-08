import { useMemo } from 'react';
import { useEngineSnapshot } from '../react/useEngineSnapshot';
import { useUITable } from '../selectors';
import { useGameScreenWorldTables } from '../selectors/useGameScreenWorldTables';
import { useGameCanvasWorldLookups } from '../../hooks/useGameCanvasWorldLookups';
import { useFrameAssembly } from '../frame/useFrameAssembly';
import { useCloudInterpolation } from '../../hooks/useCloudInterpolation';
import { useGrassInterpolation } from '../../hooks/useGrassInterpolation';
import { useFallingTreeAnimations } from '../../hooks/useFallingTreeAnimations';
import { useMousePosition } from '../../hooks/useMousePosition';

const EMPTY_MAP = new Map();

interface UseGameCanvasSceneRuntimeOptions {
  connection: any | null;
  localPlayerId?: string;
  localPlayer: any;
  gameCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  predictedPosition: { x: number; y: number } | null;
  cameraOffsetX: number;
  cameraOffsetY: number;
  canvasSize: { width: number; height: number };
  deltaTime: number;
}

export function useGameCanvasSceneRuntime({
  connection,
  localPlayerId,
  localPlayer,
  gameCanvasRef,
  predictedPosition,
  cameraOffsetX,
  cameraOffsetY,
  canvasSize,
  deltaTime,
}: UseGameCanvasSceneRuntimeOptions) {
  const tables = useGameScreenWorldTables();
  const messages = useUITable<Map<string, any>>('messages');
  const playerPins = useUITable<Map<string, any>>('playerPins');
  const activeConnections = useUITable<Map<string, any> | undefined>('activeConnections');
  const matronages = useUITable<Map<string, any>>('matronages');
  const matronageMembers = useUITable<Map<string, any>>('matronageMembers');
  const matronageInvitations = useUITable<Map<string, any>>('matronageInvitations');
  const matronageOwedShards = useUITable<Map<string, any>>('matronageOwedShards');
  const beaconDropEvents = useUITable<Map<string, any>>('beaconDropEvents');
  const worldChunkDataMap = useEngineSnapshot(
    (snapshot) => snapshot.world.chunkDataMap as Map<string, any> | null,
  ) ?? undefined;

  const interpolatedClouds = useCloudInterpolation({
    serverClouds: tables.clouds,
    deltaTime,
  });

  const interpolatedGrass = useGrassInterpolation({
    serverGrass: tables.grass,
    serverGrassState: tables.grassState,
    deltaTime,
  });
  const { worldMousePos } = useMousePosition({
    canvasRef: gameCanvasRef,
    cameraOffsetX,
    cameraOffsetY,
    canvasSize,
  });

  const {
    isTreeFalling,
    getFallProgress,
    TREE_FALL_DURATION_MS,
  } = useFallingTreeAnimations(tables.trees);

  const worldLookups = useGameCanvasWorldLookups({
    worldChunkDataMap,
    connection,
    cameraOffsetX,
    cameraOffsetY,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    localPlayer,
  });

  const frameAssembly = useFrameAssembly({
    connection,
    players: tables.players,
    trees: tables.trees,
    stones: tables.stones,
    runeStones: tables.runeStones,
    cairns: tables.cairns,
    campfires: tables.campfires,
    furnaces: tables.furnaces,
    barbecues: tables.barbecues,
    lanterns: tables.lanterns,
    turrets: tables.turrets,
    homesteadHearths: tables.homesteadHearths,
    harvestableResources: tables.harvestableResources,
    droppedItems: tables.droppedItems,
    woodenStorageBoxes: tables.woodenStorageBoxes,
    sleepingBags: tables.sleepingBags,
    playerCorpses: tables.playerCorpses,
    stashes: tables.stashes,
    cameraOffsetX,
    cameraOffsetY,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    interpolatedGrass,
    projectiles: tables.projectiles,
    shelters: tables.shelters,
    clouds: tables.clouds,
    plantedSeeds: tables.plantedSeeds,
    rainCollectors: tables.rainCollectors,
    brothPots: tables.brothPots,
    wildAnimals: tables.wildAnimals,
    animalCorpses: tables.animalCorpses,
    barrels: tables.barrels,
    roadLampposts: tables.roadLampposts ?? EMPTY_MAP,
    fumaroles: tables.fumaroles,
    basaltColumns: tables.basaltColumns,
    seaStacks: tables.seaStacks,
    foundationCells: tables.foundationCells,
    wallCells: tables.wallCells,
    doors: tables.doors,
    fences: tables.fences,
    localPlayerId,
    isLocalPlayerSnorkeling: localPlayer?.isSnorkeling ?? false,
    predictedPosition: predictedPosition ? { x: predictedPosition.x, y: predictedPosition.y } : null,
    isTreeFalling,
    worldChunkDataMap,
    alkStations: tables.alkStations ?? EMPTY_MAP,
    monumentParts: tables.monumentParts ?? EMPTY_MAP,
    livingCorals: tables.livingCorals,
    seaTransitionTileLookup: worldLookups.seaTransitionTileLookup,
    waterTileLookup: worldLookups.waterTileLookup,
    worldState: tables.worldState,
    firePatches: tables.firePatches,
    activeEquipments: tables.activeEquipments,
    itemDefinitions: tables.itemDefinitions,
    worldMouseX: worldMousePos.x ?? 0,
    worldMouseY: worldMousePos.y ?? 0,
    roadLamppostsAll: tables.roadLampposts ?? EMPTY_MAP,
    barrelsAll: tables.barrels ?? EMPTY_MAP,
  });

  const shipwreckPartsMap = useMemo(() => {
    const monumentParts = tables.monumentParts;
    if (!monumentParts) {
      return EMPTY_MAP;
    }

    const filtered = new Map();
    monumentParts.forEach((part: any, id: string) => {
      if (part.monumentType?.tag === 'Shipwreck') {
        filtered.set(id, part);
      }
    });
    return filtered;
  }, [tables.monumentParts]);

  return {
    ...tables,
    messages,
    playerPins,
    activeConnections,
    matronages,
    matronageMembers,
    matronageInvitations,
    matronageOwedShards,
    beaconDropEvents,
    worldChunkDataMap,
    interpolatedClouds,
    interpolatedGrass,
    shipwreckPartsMap,
    isTreeFalling,
    getFallProgress,
    TREE_FALL_DURATION_MS,
    ...worldLookups,
    ...frameAssembly,
    resolvedOverlayRgba: frameAssembly.overlayRgba,
    resolvedBuildingClusters: frameAssembly.buildingClusters,
    resolvedYSortedEntities: frameAssembly.ySortedEntities,
    resolvedSwimmingPlayersForBottomHalf: frameAssembly.swimmingPlayersForBottomHalf,
    resolvedMaskCanvas: frameAssembly.maskCanvasRef.current,
  };
}
