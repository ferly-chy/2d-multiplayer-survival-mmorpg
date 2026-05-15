import { useState, useEffect, useRef, RefObject } from 'react';

interface MousePosition {
  x: number | null;
  y: number | null;
}

interface UseMousePositionProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cameraOffsetX: number;
  cameraOffsetY: number;
  canvasSize: { width: number; height: number }; // Needed for scaling calculation
}

interface UseMousePositionResult {
  screenMousePos: MousePosition;
  worldMousePos: MousePosition;
  canvasMousePos: MousePosition;
}

/**
 * Tracks mouse position relative to the canvas and the game world.
 * OPTIMIZED: Uses refs instead of state to avoid re-renders on every mouse move.
 */
export function useMousePosition({
  canvasRef,
  cameraOffsetX,
  cameraOffsetY,
  canvasSize,
}: UseMousePositionProps): UseMousePositionResult {
  const [screenMousePos, setScreenMousePos] = useState<MousePosition>({ x: null, y: null });
  const [worldMousePos, setWorldMousePos] = useState<MousePosition>({ x: null, y: null });
  const [canvasMousePos, setCanvasMousePos] = useState<MousePosition>({ x: null, y: null });

  // Keep the latest values in refs so high-frequency mouse events do not trigger
  // more than one React update per animation frame.
  const screenMousePosRef = useRef<MousePosition>({ x: null, y: null });
  const worldMousePosRef = useRef<MousePosition>({ x: null, y: null });
  const canvasMousePosRef = useRef<MousePosition>({ x: null, y: null });
  const lastClientMouseRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const flushMouseState = () => {
    rafIdRef.current = null;
    setScreenMousePos(screenMousePosRef.current);
    setWorldMousePos(worldMousePosRef.current);
    setCanvasMousePos(canvasMousePosRef.current);
  };

  const scheduleMouseStateFlush = () => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(flushMouseState);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateMousePositions = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      // Calculate scale based on current canvas size and rect size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      // Calculate screen coordinates
      const currentScreenX = (clientX - rect.left) * scaleX;
      const currentScreenY = (clientY - rect.top) * scaleY;
      screenMousePosRef.current = { x: currentScreenX, y: currentScreenY };

      // Calculate world coordinates using camera offset
      const currentWorldX = currentScreenX - cameraOffsetX;
      const currentWorldY = currentScreenY - cameraOffsetY;
      worldMousePosRef.current = { x: currentWorldX, y: currentWorldY };

      // Calculate canvas coordinates
      const canvasX = currentScreenX - rect.left;
      const canvasY = currentScreenY - rect.top;
      canvasMousePosRef.current = { x: canvasX, y: canvasY };

      scheduleMouseStateFlush();
    };

    const handleMouseMove = (event: MouseEvent) => {
      lastClientMouseRef.current = { x: event.clientX, y: event.clientY };
      updateMousePositions(event.clientX, event.clientY);
    };

    const handleMouseLeave = () => {
      lastClientMouseRef.current = null;
      screenMousePosRef.current = { x: null, y: null };
      worldMousePosRef.current = { x: null, y: null };
      canvasMousePosRef.current = { x: null, y: null };
      scheduleMouseStateFlush();
    };

    if (lastClientMouseRef.current) {
      updateMousePositions(lastClientMouseRef.current.x, lastClientMouseRef.current.y);
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup listeners
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  // Re-run effect if canvasRef, offsets, or canvasSize changes
  }, [canvasRef, cameraOffsetX, cameraOffsetY, canvasSize]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    screenMousePos,
    worldMousePos,
    canvasMousePos,
  };
} 