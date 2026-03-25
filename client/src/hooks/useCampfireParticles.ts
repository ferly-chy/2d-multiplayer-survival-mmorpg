import { useEffect, useRef } from 'react';
import { Campfire as SpacetimeDBCampfire } from '../generated/types';
import { CAMPFIRE_RENDER_Y_OFFSET, CAMPFIRE_HEIGHT } from '../utils/renderers/campfireRenderingUtils';

// Steady fire/smoke: WebGL overlay (campfireFireOverlayUtils). This hook only drives hot-zone smoke_burst particles.

export interface Particle {
  id: string;
  type: 'fire' | 'smoke' | 'smoke_burst' | 'ember' | 'spark';
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnTime: number;
  initialLifetime: number;
  lifetime: number;
  size: number;
  color?: string;
  alpha: number;
}

const SMOKE_TARGET_ALPHA = 0.05;
const SMOKE_INITIAL_ALPHA = 0.6;

const SMOKE_BURST_LIFETIME_MIN = 600;
const SMOKE_BURST_LIFETIME_MAX = 1500;
const SMOKE_BURST_COLORS = ['#1a1a1a', '#2a2a2a', '#333333', '#000000'];
const SMOKE_BURST_SPEED_X_SPREAD = 0.5;
const SMOKE_BURST_SPEED_Y_MIN = -0.2;
const SMOKE_BURST_SPEED_Y_MAX = -0.5;
const SMOKE_BURST_SIZE_MIN = 3;
const SMOKE_BURST_SIZE_MAX = 6;
const SMOKE_BURST_INITIAL_ALPHA = 0.9;

interface StaticCampfirePosition {
  id: string;
  posX: number;
  posY: number;
}

interface UseCampfireParticlesProps {
  visibleCampfiresMap: Map<string, SpacetimeDBCampfire>;
  deltaTime: number;
  staticCampfires?: StaticCampfirePosition[];
}

export function useCampfireParticles({
  visibleCampfiresMap,
  deltaTime: _deltaTime,
  staticCampfires = [],
}: UseCampfireParticlesProps): Particle[] {
  const particlesRef = useRef<Particle[]>([]);
  const smokeBurstEmissionAccumulatorRef = useRef<Map<string, number>>(new Map());
  const lastUpdateTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const updateParticles = () => {
      const now = performance.now();
      const deltaTime = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;

      if (deltaTime <= 0) {
        animationFrameRef.current = requestAnimationFrame(updateParticles);
        return;
      }

      const currentParticles = particlesRef.current;
      let liveParticleCount = 0;
      const deltaTimeFactor = deltaTime / 16.667;

      for (let i = 0; i < currentParticles.length; i++) {
        const p = currentParticles[i]!;
        if (p.type !== 'smoke_burst') {
          continue;
        }

        const age = now - p.spawnTime;
        const lifetimeRemaining = p.initialLifetime - age;

        if (lifetimeRemaining <= 0) {
          continue;
        }

        let newVx = p.vx;
        let newVy = p.vy;
        newVy -= 0.0015 * deltaTimeFactor;
        const lifeRatio = Math.max(0, lifetimeRemaining / p.initialLifetime);
        const currentAlpha = SMOKE_TARGET_ALPHA + (SMOKE_INITIAL_ALPHA + 0.4 - SMOKE_TARGET_ALPHA) * lifeRatio;

        p.x += newVx * deltaTimeFactor;
        p.y += newVy * deltaTimeFactor;
        p.lifetime = lifetimeRemaining;
        p.alpha = Math.max(0, Math.min(1, currentAlpha));

        if (p.alpha > 0.01) {
          currentParticles[liveParticleCount++] = p;
        }
      }
      currentParticles.length = liveParticleCount;

      const newGeneratedParticles: Particle[] = [];
      const currentVisibleCampfireIds = new Set<string>();

      visibleCampfiresMap.forEach((campfire, campfireId) => {
        currentVisibleCampfireIds.add(campfireId);
        if (campfire.isDestroyed) return;

        const visualCenterX = campfire.posX;
        const visualCenterY = campfire.posY - CAMPFIRE_HEIGHT / 2 - CAMPFIRE_RENDER_Y_OFFSET;

        if (campfire.isPlayerInHotZone && campfire.isBurning) {
          let burstAcc = smokeBurstEmissionAccumulatorRef.current.get(campfireId) || 0;
          burstAcc += 4.0 * deltaTimeFactor;
          while (burstAcc >= 1) {
            burstAcc -= 1;
            const lifetime =
              SMOKE_BURST_LIFETIME_MIN + Math.random() * (SMOKE_BURST_LIFETIME_MAX - SMOKE_BURST_LIFETIME_MIN);
            newGeneratedParticles.push({
              id: `smokeburst_${campfireId}_${now}_${Math.random()}`,
              type: 'smoke_burst',
              x: visualCenterX + (Math.random() - 0.5) * 20,
              y: visualCenterY + (Math.random() - 0.5) * 16,
              vx: (Math.random() - 0.5) * SMOKE_BURST_SPEED_X_SPREAD,
              vy: SMOKE_BURST_SPEED_Y_MIN + Math.random() * (SMOKE_BURST_SPEED_Y_MAX - SMOKE_BURST_SPEED_Y_MIN),
              spawnTime: now,
              initialLifetime: lifetime,
              lifetime,
              size: SMOKE_BURST_SIZE_MIN + Math.floor(Math.random() * (SMOKE_BURST_SIZE_MAX - SMOKE_BURST_SIZE_MIN + 1)),
              color: SMOKE_BURST_COLORS[Math.floor(Math.random() * SMOKE_BURST_COLORS.length)],
              alpha: SMOKE_BURST_INITIAL_ALPHA,
            });
          }
          smokeBurstEmissionAccumulatorRef.current.set(campfireId, burstAcc);
        } else {
          smokeBurstEmissionAccumulatorRef.current.set(campfireId, 0);
        }
      });

      staticCampfires.forEach((s) => currentVisibleCampfireIds.add(`static_${s.id}`));

      smokeBurstEmissionAccumulatorRef.current.forEach((_, campfireId) => {
        if (!currentVisibleCampfireIds.has(campfireId)) {
          smokeBurstEmissionAccumulatorRef.current.delete(campfireId);
        }
      });

      if (newGeneratedParticles.length > 0) {
        particlesRef.current = currentParticles.concat(newGeneratedParticles);
      } else {
        particlesRef.current = currentParticles;
      }

      animationFrameRef.current = requestAnimationFrame(updateParticles);
    };

    lastUpdateTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(updateParticles);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visibleCampfiresMap, staticCampfires]);

  return particlesRef.current;
}
