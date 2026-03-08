/**
 * Asset preloading hook. Runs preload on mount, returns progress and completion state.
 */
import { useState, useEffect, useRef } from 'react';
import { preloadAllAssets, areAllAssetsPreloaded, type AssetLoadingProgress } from '../services/assetPreloader';

export function useAssetPreload() {
  const [assetProgress, setAssetProgress] = useState<AssetLoadingProgress | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (import.meta.env.DEV) {
      setAssetsLoaded(true);
      setAssetProgress({
        phase: 'complete',
        phaseName: 'Dev Mode',
        phaseProgress: 1,
        totalProgress: 1,
        loadedCount: 0,
        totalCount: 0,
        currentAsset: 'Skipped in dev',
        fromCache: 0,
      });
      return;
    }

    if (areAllAssetsPreloaded()) {
      setAssetsLoaded(true);
      setAssetProgress({
        phase: 'complete',
        phaseName: 'Cached',
        phaseProgress: 1,
        totalProgress: 1,
        loadedCount: 0,
        totalCount: 0,
        currentAsset: 'All assets cached',
        fromCache: 0,
      });
      return;
    }

    preloadAllAssets((progress) => {
      setAssetProgress(progress);
      if (progress.phase === 'complete') setAssetsLoaded(true);
    }).catch(() => setAssetsLoaded(true));
  }, []);

  return { assetProgress, assetsLoaded };
}
