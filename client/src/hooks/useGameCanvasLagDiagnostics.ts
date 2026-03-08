import { useCallback, useEffect, useRef } from 'react';
import { FpsProfiler } from '../utils/profiler';

interface UseGameCanvasLagDiagnosticsOptions {
  localPlayer: { positionX: number; positionY: number } | null | undefined;
  enabled: boolean;
}

export function useGameCanvasLagDiagnostics({
  localPlayer,
  enabled,
}: UseGameCanvasLagDiagnosticsOptions) {
  const lastFrameTimeRef = useRef(0);
  const ySortDebugRef = useRef({
    lastLogTime: 0,
  });
  const perfProfilingRef = useRef({
    lastLogTime: Date.now(),
    frameCount: 0,
    totalFrameTime: 0,
    maxFrameTime: 0,
    slowFrames: 0,
    verySlowFrames: 0,
    lastServerUpdateTime: 0,
    serverUpdateCount: 0,
    maxServerLatency: 0,
    totalServerLatency: 0,
    renderCallCount: 0,
  });
  const fpsProfilerRef = useRef(new FpsProfiler());
  const lastKnownPlayerPosRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);

  const checkPerformance = useCallback((frameStartTime: number) => {
    lastFrameTimeRef.current = performance.now() - frameStartTime;
  }, []);

  useEffect(() => {
    if (!enabled || !localPlayer) {
      return;
    }

    const now = performance.now();
    const lastKnown = lastKnownPlayerPosRef.current;
    if (lastKnown && (localPlayer.positionX !== lastKnown.x || localPlayer.positionY !== lastKnown.y)) {
      const timeSinceLastUpdate = now - lastKnown.timestamp;
      perfProfilingRef.current.serverUpdateCount++;
      perfProfilingRef.current.totalServerLatency += timeSinceLastUpdate;
      if (timeSinceLastUpdate > perfProfilingRef.current.maxServerLatency) {
        perfProfilingRef.current.maxServerLatency = timeSinceLastUpdate;
      }
      perfProfilingRef.current.lastServerUpdateTime = now;
    }

    lastKnownPlayerPosRef.current = {
      x: localPlayer.positionX,
      y: localPlayer.positionY,
      timestamp: now,
    };
  }, [enabled, localPlayer?.positionX, localPlayer?.positionY]);

  return {
    lastFrameTimeRef,
    ySortDebugRef,
    perfProfilingRef,
    fpsProfilerRef,
    checkPerformance,
  };
}
