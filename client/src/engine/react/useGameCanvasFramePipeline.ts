import { useEffect } from 'react';
import { useEngineFrameLoop } from './useEngineFrameLoop';
import type { GameCanvasRuntimeHost } from '../runtime/GameCanvasRuntimeHost';

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
