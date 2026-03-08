import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { PlacementActions } from './usePlacementManager';

interface UseGameCanvasHostRefsOptions<TWorldMousePos, TPredictedPosition, TFacingDirection, TClouds, TYSortedEntities, TSwimmingPlayers> {
  placementActions: PlacementActions;
  placementActionsRef: MutableRefObject<PlacementActions>;
  worldMousePos: TWorldMousePos;
  worldMousePosRef: MutableRefObject<TWorldMousePos>;
  cameraOffsetX: number;
  cameraOffsetY: number;
  cameraOffsetRef: MutableRefObject<{ x: number; y: number }>;
  predictedPosition: TPredictedPosition;
  predictedPositionRef: MutableRefObject<TPredictedPosition>;
  localFacingDirection: TFacingDirection;
  localFacingDirectionRef: MutableRefObject<TFacingDirection>;
  interpolatedClouds: TClouds;
  interpolatedCloudsRef: MutableRefObject<TClouds>;
  cycleProgress: number;
  cycleProgressRef: MutableRefObject<number>;
  ySortedEntities: TYSortedEntities;
  ySortedEntitiesRef: MutableRefObject<TYSortedEntities>;
  swimmingPlayersForBottomHalf: TSwimmingPlayers;
  swimmingPlayersForBottomHalfRef: MutableRefObject<TSwimmingPlayers>;
}

export function useGameCanvasHostRefs<TWorldMousePos, TPredictedPosition, TFacingDirection, TClouds, TYSortedEntities, TSwimmingPlayers>({
  placementActions,
  placementActionsRef,
  worldMousePos,
  worldMousePosRef,
  cameraOffsetX,
  cameraOffsetY,
  cameraOffsetRef,
  predictedPosition,
  predictedPositionRef,
  localFacingDirection,
  localFacingDirectionRef,
  interpolatedClouds,
  interpolatedCloudsRef,
  cycleProgress,
  cycleProgressRef,
  ySortedEntities,
  ySortedEntitiesRef,
  swimmingPlayersForBottomHalf,
  swimmingPlayersForBottomHalfRef,
}: UseGameCanvasHostRefsOptions<TWorldMousePos, TPredictedPosition, TFacingDirection, TClouds, TYSortedEntities, TSwimmingPlayers>) {
  ySortedEntitiesRef.current = ySortedEntities;
  swimmingPlayersForBottomHalfRef.current = swimmingPlayersForBottomHalf;

  useEffect(() => {
    placementActionsRef.current = placementActions;
  }, [placementActions, placementActionsRef]);

  useEffect(() => {
    worldMousePosRef.current = worldMousePos;
  }, [worldMousePos, worldMousePosRef]);

  useEffect(() => {
    cameraOffsetRef.current = { x: cameraOffsetX, y: cameraOffsetY };
  }, [cameraOffsetX, cameraOffsetY, cameraOffsetRef]);

  useEffect(() => {
    predictedPositionRef.current = predictedPosition;
  }, [predictedPosition, predictedPositionRef]);

  useEffect(() => {
    localFacingDirectionRef.current = localFacingDirection;
  }, [localFacingDirection, localFacingDirectionRef]);

  useEffect(() => {
    interpolatedCloudsRef.current = interpolatedClouds;
  }, [interpolatedClouds, interpolatedCloudsRef]);

  useEffect(() => {
    cycleProgressRef.current = cycleProgress;
  }, [cycleProgress, cycleProgressRef]);

  useEffect(() => {
    ySortedEntitiesRef.current = ySortedEntities;
  }, [ySortedEntities, ySortedEntitiesRef]);
}
