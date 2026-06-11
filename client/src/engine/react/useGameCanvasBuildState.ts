import { useEffect, useMemo, type RefObject } from 'react';
import { useMousePosition } from '../../hooks/useMousePosition';
import {
  useBuildingManager,
  type BuildingPlacementActions,
  type BuildingPlacementState,
} from '../../hooks/useBuildingManager';
import { useFoundationTargeting } from '../../hooks/useFoundationTargeting';
import { useWallTargeting } from '../../hooks/useWallTargeting';
import { useFenceTargeting } from '../../hooks/useFenceTargeting';

interface UseGameCanvasBuildStateOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cameraOffsetX: number;
  cameraOffsetY: number;
  canvasSize: { width: number; height: number };
  connection: any | null;
  predictedPosition: { x: number; y: number } | null;
  localPlayer: any;
  activeEquipments: Map<string, any>;
  itemDefinitions: Map<string, any>;
  localPlayerId?: string;
  isMobile?: boolean;
  onMobileTap?: (worldX: number, worldY: number) => void;
}

interface UseGameCanvasBuildStateResult {
  worldMousePos: { x: number | null; y: number | null };
  canvasMousePos: { x: number | null; y: number | null };
  buildingState: BuildingPlacementState;
  buildingActions: BuildingPlacementActions;
  hasRepairHammer: boolean;
  hasStoneTiller: boolean;
  targetedFoundation: any;
  targetTileX: number | null;
  targetTileY: number | null;
  targetedWall: any;
  targetWallTileX: number | null;
  targetWallTileY: number | null;
  targetedFence: any;
}

export function useGameCanvasBuildState({
  canvasRef,
  cameraOffsetX,
  cameraOffsetY,
  canvasSize,
  connection,
  predictedPosition,
  localPlayer,
  activeEquipments,
  itemDefinitions,
  localPlayerId,
  isMobile,
  onMobileTap,
}: UseGameCanvasBuildStateOptions): UseGameCanvasBuildStateResult {
  const { worldMousePos, canvasMousePos } = useMousePosition({
    canvasRef,
    cameraOffsetX,
    cameraOffsetY,
    canvasSize,
  });

  const localPlayerX = predictedPosition?.x ?? localPlayer?.positionX ?? 0;
  const localPlayerY = predictedPosition?.y ?? localPlayer?.positionY ?? 0;

  const [buildingState, buildingActions] = useBuildingManager(
    connection,
    localPlayerX,
    localPlayerY,
    activeEquipments,
    itemDefinitions,
    localPlayerId,
    worldMousePos.x,
    worldMousePos.y,
  );

  const hasRepairHammer = useMemo(() => {
    if (!localPlayerId || !activeEquipments || !itemDefinitions) return false;
    const equipment = activeEquipments.get(localPlayerId);
    if (!equipment?.equippedItemDefId) return false;
    const itemDef = itemDefinitions.get(String(equipment.equippedItemDefId));
    return itemDef?.name === 'Repair Hammer';
  }, [localPlayerId, activeEquipments, itemDefinitions]);

  const hasStoneTiller = useMemo(() => {
    if (!localPlayerId || !activeEquipments || !itemDefinitions) return false;
    const equipment = activeEquipments.get(localPlayerId);
    if (!equipment?.equippedItemDefId) return false;
    const itemDef = itemDefinitions.get(String(equipment.equippedItemDefId));
    return itemDef?.name === 'Stone Tiller';
  }, [localPlayerId, activeEquipments, itemDefinitions]);

  const { targetedFoundation, targetTileX, targetTileY } = useFoundationTargeting(
    connection,
    localPlayerX,
    localPlayerY,
    worldMousePos.x,
    worldMousePos.y,
    hasRepairHammer,
  );

  const {
    targetedWall,
    targetTileX: targetWallTileX,
    targetTileY: targetWallTileY,
  } = useWallTargeting(
    connection,
    localPlayerX,
    localPlayerY,
    worldMousePos.x,
    worldMousePos.y,
    hasRepairHammer,
  );

  const { targetedFence } = useFenceTargeting(
    connection,
    localPlayerX,
    localPlayerY,
    worldMousePos.x,
    worldMousePos.y,
    hasRepairHammer,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isMobile) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (!onMobileTap || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const rect = canvas.getBoundingClientRect();
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;
      onMobileTap(screenX - cameraOffsetX, screenY - cameraOffsetY);
      event.preventDefault();
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [canvasRef, isMobile, onMobileTap, cameraOffsetX, cameraOffsetY]);

  return {
    worldMousePos,
    canvasMousePos,
    buildingState,
    buildingActions,
    hasRepairHammer,
    hasStoneTiller,
    targetedFoundation,
    targetTileX,
    targetTileY,
    targetedWall,
    targetWallTileX,
    targetWallTileY,
    targetedFence,
  };
}
