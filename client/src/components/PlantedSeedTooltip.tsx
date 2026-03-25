import React, { useMemo, useState, useEffect, type RefObject, memo } from 'react';
import { PlantedSeed } from '../generated/types';
import styles from './PlantedSeedTooltip.module.css';
import {
  buildPlantedSeedEnvSnapshot,
  completePlantedSeedTooltipSnapshot,
  EMPTY_TOOLTIP_WORLD_ENV,
  type TooltipWorldEnv,
} from './plantedSeedTooltipSnapshot';

export interface PlantedSeedTooltipProps {
  seed: PlantedSeed;
  visible: boolean;
  position: { x: number; y: number };
  /** Filled every overlay render — body reads `.current` so Map identity churn does not force rerenders. */
  worldEnvRef: RefObject<TooltipWorldEnv>;
  /** Primitive tags so memo’d body updates when weather / chunk wx changes without Map deps. */
  globalWeatherTag: string;
  timeOfDayTag: string;
  chunkWxTag: string;
}

function getTimeOfDayDisplay(tag: string): string {
  switch (tag) {
    case 'Dawn':
      return 'Dawn';
    case 'TwilightMorning':
      return 'Twilight';
    case 'Morning':
      return 'Morning';
    case 'Noon':
      return 'Noon';
    case 'Afternoon':
      return 'Afternoon';
    case 'Dusk':
      return 'Dusk';
    case 'TwilightEvening':
      return 'Twilight';
    case 'Night':
      return 'Night';
    case 'Midnight':
      return 'Midnight';
    default:
      return tag || 'Unknown';
  }
}

type PlantedSeedTooltipBodyProps = Omit<PlantedSeedTooltipProps, 'position'>;

function plantedSeedTooltipBodyPropsEqual(
  a: PlantedSeedTooltipBodyProps,
  b: PlantedSeedTooltipBodyProps,
): boolean {
  if (a.visible !== b.visible) return false;
  if (!b.visible) return true;
  if (a.worldEnvRef !== b.worldEnvRef) return false;
  if (a.globalWeatherTag !== b.globalWeatherTag) return false;
  if (a.timeOfDayTag !== b.timeOfDayTag) return false;
  if (a.chunkWxTag !== b.chunkWxTag) return false;
  const s = a.seed;
  const t = b.seed;
  if (s.id !== t.id) return false;
  if (s.growthProgress !== t.growthProgress) return false;
  if (s.posX !== t.posX || s.posY !== t.posY) return false;
  if (s.seedType !== t.seedType) return false;
  if (s.plantType.tag !== t.plantType.tag) return false;
  if (s.baseGrowthTimeSecs !== t.baseGrowthTimeSecs) return false;
  if (s.plantedAt.toDate().getTime() !== t.plantedAt.toDate().getTime()) return false;
  if ((s.targetTreeType?.tag ?? '') !== (t.targetTreeType?.tag ?? '')) return false;
  return true;
}

const PlantedSeedTooltipBody = memo(function PlantedSeedTooltipBody({
  seed,
  visible,
  worldEnvRef,
  globalWeatherTag,
  timeOfDayTag,
  chunkWxTag,
}: PlantedSeedTooltipBodyProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const plantTypeTag = seed.plantType.tag;
  const targetTreeTag = seed.targetTreeType?.tag ?? '';

  const envSnap = useMemo(() => {
    const env = worldEnvRef.current ?? EMPTY_TOOLTIP_WORLD_ENV;
    return buildPlantedSeedEnvSnapshot(seed, env);
  }, [
    seed.id,
    seed.posX,
    seed.posY,
    seed.seedType,
    plantTypeTag,
    Number(seed.baseGrowthTimeSecs),
    targetTreeTag,
    globalWeatherTag,
    timeOfDayTag,
    chunkWxTag,
    worldEnvRef,
  ]);

  const plantedAtMs = seed.plantedAt.toDate().getTime();
  const snap = useMemo(
    () => completePlantedSeedTooltipSnapshot(envSnap, seed, nowMs),
    [envSnap, seed.growthProgress, plantedAtMs, nowMs, seed.baseGrowthTimeSecs],
  );

  if (!visible || !seed) {
    return null;
  }

  const formatTimeDuration = (ms: number): string => {
    if (!isFinite(ms) || ms === Infinity) {
      return 'Stalled';
    }
    const seconds = Math.floor(Math.abs(ms) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const {
    growthPercent,
    isFullyGrown,
    timeSpentGrowingMs,
    cloudCoverage,
    waterPatchEffect,
    fertilizerPatchEffect,
    nearTree,
    nearGreenRuneStone,
    lightEffects,
    onPreparedSoil,
    hasBeachPenalty,
    currentWeather,
    currentTimeOfDay,
    isMushroomPlant,
    totalGrowthMultiplier,
    timeUntilMatureMs,
    plantTypeName,
    plantImageSource,
    growthStage,
  } = snap;

  return (
    <>
      <div className={`${styles.header} ${styles[growthStage]}`}>
        {plantImageSource ? (
          <img src={plantImageSource} alt={plantTypeName} className={styles.plantIcon} />
        ) : (
          <span className={styles.plantIcon}>🌱</span>
        )}
        <span className={styles.plantName}>{plantTypeName}</span>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          <span>Growth Progress</span>
          <span className={styles.progressPercent}>{growthPercent}%</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div
            className={`${styles.progressBarFill} ${styles[growthStage]}`}
            style={{ width: `${growthPercent}%` }}
          />
        </div>
      </div>

      <div className={styles.infoSection}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Seed Type:</span>
          <span className={styles.infoValue}>{seed.seedType}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Time Growing:</span>
          <span className={styles.infoValue}>{formatTimeDuration(timeSpentGrowingMs)}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{isFullyGrown ? 'Status:' : 'Time Until Mature:'}</span>
          <span className={`${styles.infoValue} ${styles[growthStage]}`}>
            {isFullyGrown ? '✓ Ready to Harvest!' : formatTimeDuration(timeUntilMatureMs)}
          </span>
        </div>

        {!isFullyGrown && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Growth Rate:</span>
            <span
              className={`${styles.infoValue} ${
                totalGrowthMultiplier >= 1.5
                  ? styles.positive
                  : totalGrowthMultiplier <= 0.5
                    ? styles.negative
                    : totalGrowthMultiplier === 0
                      ? styles.negative
                      : styles.neutral
              }`}
            >
              {totalGrowthMultiplier === 0
                ? '⏸️ Paused'
                : `${Math.round(totalGrowthMultiplier * 100)}%`}
            </span>
          </div>
        )}
      </div>

      {!isFullyGrown && (
        <div className={styles.conditionsSection}>
          <div className={styles.conditionsHeader}>Growth Conditions</div>

          <div className={styles.conditionRow}>
            <span className={styles.conditionLabel}>Time of Day:</span>
            <span
              className={`${styles.conditionValue} ${
                isMushroomPlant
                  ? currentTimeOfDay === 'Night' || currentTimeOfDay === 'Midnight'
                    ? styles.positive
                    : styles.neutral
                  : currentTimeOfDay === 'Night' || currentTimeOfDay === 'Midnight'
                    ? styles.negative
                    : styles.neutral
              }`}
            >
              {getTimeOfDayDisplay(currentTimeOfDay)}
              {isMushroomPlant ? (
                (currentTimeOfDay === 'Night' || currentTimeOfDay === 'Midnight') && ' 🌙 +50%'
              ) : (
                <>
                  {(currentTimeOfDay === 'Night' || currentTimeOfDay === 'Midnight') && ' ⛔'}
                  {currentTimeOfDay === 'Noon' && ' ☀️'}
                </>
              )}
            </span>
          </div>

          <div className={styles.conditionRow}>
            <span className={styles.conditionLabel}>Weather:</span>
            <span
              className={`${styles.conditionValue} ${
                currentWeather === 'LightRain' || currentWeather === 'ModerateRain'
                  ? styles.positive
                  : currentWeather === 'HeavyStorm'
                    ? styles.negative
                    : styles.neutral
              }`}
            >
              {currentWeather === 'LightRain' && '🌧️ Light Rain +30%'}
              {currentWeather === 'ModerateRain' && '🌧️ Moderate Rain +60%'}
              {currentWeather === 'HeavyRain' && '⛈️ Heavy Rain +40%'}
              {currentWeather === 'HeavyStorm' && '⛈️ Heavy Storm -20%'}
              {currentWeather === 'Clear' && '☀️ Clear'}
            </span>
          </div>

          {cloudCoverage > 0.1 && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Cloud Cover:</span>
              <span
                className={`${styles.conditionValue} ${isMushroomPlant ? styles.positive : styles.negative}`}
              >
                ☁️ {Math.round(cloudCoverage * 100)}%
                {isMushroomPlant
                  ? ` (+${Math.round(cloudCoverage * 36)}%)`
                  : ` (−${Math.round(cloudCoverage * 60)}%)`}
              </span>
            </div>
          )}

          {isMushroomPlant && nearTree && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Near Tree:</span>
              <span className={`${styles.conditionValue} ${styles.positive}`}>🌳 Yes +50%</span>
            </div>
          )}

          {nearGreenRuneStone && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Green Rune Stone:</span>
              <span className={`${styles.conditionValue} ${styles.positive}`}>💚 Active +50%</span>
            </div>
          )}

          {onPreparedSoil && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Prepared Soil:</span>
              <span className={`${styles.conditionValue} ${styles.positive}`}>🌾 Yes +50%</span>
            </div>
          )}

          {hasBeachPenalty && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Sandy Soil:</span>
              <span className={`${styles.conditionValue} ${styles.negative}`}>🏖️ Beach −50%</span>
            </div>
          )}

          {waterPatchEffect.hasWater && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>
                {waterPatchEffect.isSaltWater ? 'Near Salt Water:' : 'Near Water:'}
              </span>
              <span
                className={`${styles.conditionValue} ${
                  waterPatchEffect.isSaltWater ? styles.negative : styles.positive
                }`}
              >
                {waterPatchEffect.isSaltWater ? '🧂 ' : '💧 '}
                {waterPatchEffect.isSaltWater ? 'Yes ' : 'Yes '}
                {waterPatchEffect.multiplier < 1.0
                  ? `−${Math.round((1.0 - waterPatchEffect.multiplier) * 100)}%`
                  : `+${Math.round((waterPatchEffect.multiplier - 1.0) * 100)}%`}
              </span>
            </div>
          )}

          {fertilizerPatchEffect.hasFertilizer && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Near Compost:</span>
              <span className={`${styles.conditionValue} ${styles.positive}`}>
                🌿 Yes +{Math.round((fertilizerPatchEffect.multiplier - 1.0) * 100)}%
              </span>
            </div>
          )}

          {lightEffects.nearLantern && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Near Lantern:</span>
              <span className={`${styles.conditionValue} ${styles.positive}`}>🏮 Yes +80%</span>
            </div>
          )}

          {lightEffects.nearFurnace && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Near Furnace:</span>
              <span className={`${styles.conditionValue} ${styles.positive}`}>🔥 Yes +60%</span>
            </div>
          )}

          {lightEffects.nearCampfire && (
            <div className={styles.conditionRow}>
              <span className={styles.conditionLabel}>Near Campfire:</span>
              <span className={`${styles.conditionValue} ${styles.negative}`}>🔥 Too close! −40%</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}, plantedSeedTooltipBodyPropsEqual);

export default function PlantedSeedTooltip({
  position,
  ...rest
}: PlantedSeedTooltipProps) {
  if (!rest.visible || !rest.seed) {
    return null;
  }

  return (
    <div
      className={styles.tooltipContainer}
      style={{ left: `${position.x + 15}px`, top: `${position.y + 15}px` }}
    >
      <PlantedSeedTooltipBody {...rest} />
    </div>
  );
}
