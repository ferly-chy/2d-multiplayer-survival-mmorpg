import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InterfaceContainer from './InterfaceContainer';
import { drawMinimapOntoCanvas } from './Minimap';
import { useMinimapInteraction } from '../hooks/useMinimapInteraction';
import { useGameUI } from '../contexts/GameUIContext';
import { useGameplayMovement } from '../contexts/GameplayMovementContext';
import { useGameScreenWorldTables, useLocalPlayer, useUITable } from '../engine/react/selectors';

const EMPTY_MAP = new Map();

interface GameMinimapOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  connection: any | null;
  localPlayerId?: string;
  itemImagesRef: React.MutableRefObject<Map<string, HTMLImageElement> | undefined>;
  deathMarkerImg?: HTMLImageElement | null;
  pinMarkerImg?: HTMLImageElement | null;
  campfireWarmthImg?: HTMLImageElement | null;
  torchOnImg?: HTMLImageElement | null;
}

export default function GameMinimapOverlay({
  canvasWidth,
  canvasHeight,
  connection,
  localPlayerId,
  itemImagesRef,
  deathMarkerImg,
  pinMarkerImg,
  campfireWarmthImg,
  torchOnImg,
}: GameMinimapOverlayProps) {
  const gameUI = useGameUI();
  const { isMobile } = useGameplayMovement();
  const worldTables = useGameScreenWorldTables();
  const localPlayer = useLocalPlayer(localPlayerId ?? null);
  const playerPins = useUITable<Map<string, any>>('playerPins');
  const matronages = useUITable<Map<string, any>>('matronages');
  const matronageMembers = useUITable<Map<string, any>>('matronageMembers');
  const matronageInvitations = useUITable<Map<string, any>>('matronageInvitations');
  const matronageOwedShards = useUITable<Map<string, any>>('matronageOwedShards');
  const beaconDropEvents = useUITable<Map<string, any>>('beaconDropEvents');
  const localPlayerDeathMarker = useMemo(() => {
    if (!localPlayer?.identity) {
      return null;
    }
    return worldTables.deathMarkers.get(localPlayer.identity.toHexString()) || null;
  }, [localPlayer, worldTables.deathMarkers]);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const [minimapCanvasSize, setMinimapCanvasSize] = useState({ width: 1, height: 1 });
  const [showWeatherOverlay, setShowWeatherOverlay] = useState<boolean>(() => {
    const saved = localStorage.getItem('minimap_show_weather_overlay');
    return saved !== null ? saved === 'true' : false;
  });
  const [showNames, setShowNames] = useState<boolean>(() => {
    const saved = localStorage.getItem('minimap_show_names');
    return saved !== null ? saved === 'true' : true;
  });

  const { minimapZoom, isMouseOverMinimap, localPlayerPin, viewCenterOffset } = useMinimapInteraction({
    canvasRef: minimapCanvasRef,
    localPlayer,
    isMinimapOpen: gameUI.isMinimapOpen,
    connection,
    playerPins,
    localPlayerId,
    canvasSize: minimapCanvasSize,
    setIsMinimapOpen: gameUI.setIsMinimapOpen,
  });

  useEffect(() => {
    if (!gameUI.isMinimapOpen || !minimapCanvasRef.current) return;

    const canvas = minimapCanvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        setMinimapCanvasSize({ width, height });
      }
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [gameUI.isMinimapOpen, isMobile]);

  const drawMinimap = useCallback(() => {
    if (!gameUI.isMinimapOpen || !minimapCanvasRef.current) return;

    const canvas = minimapCanvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const savedGridPref = localStorage.getItem('minimap_show_grid_coordinates');
    const showGridCoordinates = savedGridPref !== null ? savedGridPref === 'true' : true;

    const chunkWeatherForMinimap = new Map<number, any>();
    worldTables.chunkWeather?.forEach((weather, chunkIndexStr) => {
      const chunkIndex = parseInt(chunkIndexStr, 10);
      if (!Number.isNaN(chunkIndex)) {
        chunkWeatherForMinimap.set(chunkIndex, weather);
      }
    });

    drawMinimapOntoCanvas({
      ctx: context,
      players: worldTables.players instanceof Map ? worldTables.players : EMPTY_MAP,
      trees: worldTables.trees instanceof Map ? worldTables.trees : EMPTY_MAP,
      stones: worldTables.stones instanceof Map ? worldTables.stones : EMPTY_MAP,
      runeStones: worldTables.runeStones instanceof Map ? worldTables.runeStones : EMPTY_MAP,
      barrels: worldTables.barrels instanceof Map ? worldTables.barrels : EMPTY_MAP,
      campfires: worldTables.campfires instanceof Map ? worldTables.campfires : EMPTY_MAP,
      sleepingBags: worldTables.sleepingBags instanceof Map ? worldTables.sleepingBags : EMPTY_MAP,
      localPlayer,
      localPlayerId,
      viewCenterOffset,
      playerPin: localPlayerPin,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      isMouseOverMinimap,
      zoomLevel: minimapZoom,
      sleepingBagImage: itemImagesRef.current?.get('sleeping_bag.png'),
      localPlayerDeathMarker,
      deathMarkerImage: deathMarkerImg,
      worldState: worldTables.worldState,
      minimapCache: worldTables.minimapCache as any,
      pinMarkerImage: pinMarkerImg,
      campfireWarmthImage: campfireWarmthImg,
      torchOnImage: torchOnImg,
      showGridCoordinates,
      showWeatherOverlay,
      chunkWeatherData: chunkWeatherForMinimap,
      alkStations: worldTables.alkStations,
      monumentParts: worldTables.monumentParts,
      largeQuarries: worldTables.largeQuarries,
      livingCorals: worldTables.livingCorals,
      showNames,
      matronageMembers,
      matronages,
      beaconDropEvents,
      droneEvents: worldTables.droneEvents,
    });
  }, [
    gameUI.isMinimapOpen,
    worldTables.players,
    worldTables.trees,
    worldTables.stones,
    worldTables.runeStones,
    worldTables.barrels,
    worldTables.campfires,
    worldTables.sleepingBags,
    localPlayer,
    localPlayerId,
    viewCenterOffset,
    localPlayerPin,
    isMouseOverMinimap,
    minimapZoom,
    itemImagesRef,
    localPlayerDeathMarker,
    deathMarkerImg,
    worldTables.worldState,
    worldTables.minimapCache,
    pinMarkerImg,
    campfireWarmthImg,
    torchOnImg,
    showWeatherOverlay,
    worldTables.chunkWeather,
    worldTables.alkStations,
    worldTables.monumentParts,
    worldTables.largeQuarries,
    worldTables.livingCorals,
    showNames,
    matronageMembers,
    matronages,
    beaconDropEvents,
    worldTables.droneEvents,
  ]);

  useEffect(() => {
    drawMinimap();
  }, [drawMinimap]);

  useEffect(() => {
    if (!gameUI.isMinimapOpen || !worldTables.droneEvents || worldTables.droneEvents.size === 0) return;

    let frameId = 0;
    const tick = () => {
      drawMinimap();
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [gameUI.isMinimapOpen, worldTables.droneEvents, drawMinimap]);

  if (!gameUI.isMinimapOpen) {
    return null;
  }

  return (
    <InterfaceContainer
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      style={{
        zIndex: 9998,
      }}
      onClose={() => {
        gameUI.setIsMinimapOpen(false);
        gameUI.setInterfaceInitialView(undefined);
      }}
      showWeatherOverlay={showWeatherOverlay}
      onToggleWeatherOverlay={(checked) => {
        setShowWeatherOverlay(checked);
        localStorage.setItem('minimap_show_weather_overlay', checked.toString());
      }}
      showNames={showNames}
      onToggleShowNames={(checked) => {
        setShowNames(checked);
        localStorage.setItem('minimap_show_names', checked.toString());
      }}
    >
      <canvas
        ref={minimapCanvasRef}
        width={1}
        height={1}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </InterfaceContainer>
  );
}
