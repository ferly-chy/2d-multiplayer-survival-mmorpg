import { useEffect } from 'react';
import { useEngineFrameLoop } from '../react/useEngineFrameLoop';
import type { GameCanvasRuntimeHost } from './GameCanvasRuntimeHost';

interface UseGameCanvasFramePipelineOptions {
  host: GameCanvasRuntimeHost;
  showFpsProfiler: boolean;
}

export function useGameCanvasFramePipeline({
  host,
  showFpsProfiler,
}: UseGameCanvasFramePipelineOptions): void {
  useEffect(() => {
    host.mount();

    return () => {
      host.unmount();
    };
  }, [host]);

  useEngineFrameLoop(null, {
    targetFPS: 0,
    maxFrameTime: 33,
    enableProfiling: false,
  });

  useEffect(() => {
    if (!showFpsProfiler) {
      const frameBindings = host.getFrameBindings();
      if (frameBindings) {
        frameBindings.gameLoopMetricsRef.current = null;
      }
    }
  }, [host, showFpsProfiler]);
}
