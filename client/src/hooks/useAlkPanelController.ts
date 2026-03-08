import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Identity } from 'spacetimedb';
import type { AlkContract, AlkContractKind, AlkPlayerContract, ItemDefinition } from '../generated/types';
import { useGameConnection } from '../contexts/GameConnectionContext';
import { useGameplaySession } from '../contexts/GameplaySessionContext';
import { useGameplayMovement } from '../contexts/GameplayMovementContext';
import { useAlkPanelRuntimeData, useGameScreenWorldTables, useLocalPlayer } from '../engine/selectors';

export type AlkTab =
  | 'seasonal'
  | 'materials'
  | 'arms'
  | 'armor'
  | 'tools'
  | 'provisions'
  | 'bonus'
  | 'buy-orders'
  | 'my-contracts';

const getKindTag = (kind: AlkContractKind | undefined | null): string =>
  kind && 'tag' in kind ? (kind.tag as string) : '';

const isNotMemoryShard = (contract: AlkContract) => contract.itemName.trim() !== 'Memory Shard';

export function useAlkPanelController({ onClose }: { onClose: () => void }) {
  const connection = useGameConnection();
  const { alkInitialTab: initialTab } = useGameplaySession();
  const { predictedPosition } = useGameplayMovement();
  const playerIdentity = connection.dbIdentity;
  const localPlayer = useLocalPlayer(playerIdentity?.toHexString() ?? null);
  const playerPosition = predictedPosition ?? (localPlayer ? { x: localPlayer.positionX, y: localPlayer.positionY } : null);
  const { alkState, alkStations, alkContracts, alkPlayerContracts, itemDefinitions, inventoryItems } = useAlkPanelRuntimeData();
  const { worldState: runtimeWorldState } = useGameScreenWorldTables();
  const worldState = runtimeWorldState as any;

  const [activeTab, setActiveTab] = useState<AlkTab>(initialTab || 'seasonal');
  const [nearbyStationId, setNearbyStationId] = useState<number | null>(null);
  const [isQuantityInputFocused, setIsQuantityInputFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (!playerPosition || alkStations.size === 0) {
      setNearbyStationId(null);
      return;
    }

    let nearestStationId: number | null = null;
    let nearestDistanceSq = Infinity;

    for (const station of alkStations.values()) {
      if (!station.isActive) continue;

      const dx = playerPosition.x - station.worldPosX;
      const dy = playerPosition.y - station.worldPosY;
      const distanceSq = dx * dx + dy * dy;
      const radiusSq = station.interactionRadius * station.interactionRadius;

      if (distanceSq <= radiusSq && distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestStationId = station.stationId;
      }
    }

    setNearbyStationId(nearestStationId);
  }, [playerPosition, alkStations]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (isSearchFocused && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape' && searchQuery) {
          setSearchQuery('');
          e.preventDefault();
          e.stopImmediatePropagation();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (searchQuery && isSearchFocused) {
          setSearchQuery('');
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
        return;
      }

      const isInputFocused = isQuantityInputFocused || isSearchFocused;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (isInputFocused || !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          e.stopPropagation();
        }
      }

      if (e.key === 'w' || e.key === 'W' || e.key === 'a' || e.key === 'A' || e.key === 's' || e.key === 'S' || e.key === 'd' || e.key === 'D') {
        if (isInputFocused || !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          e.stopPropagation();
        }
      }

      if (isInputFocused) {
        if (
          e.key === 'y' || e.key === 'Y' || e.key === 'g' || e.key === 'G' ||
          e.key === 'e' || e.key === 'E' || e.key === 'r' || e.key === 'R' ||
          e.key === 'f' || e.key === 'F' || e.key === 'q' || e.key === 'Q' ||
          e.key === 'Tab'
        ) {
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose, isQuantityInputFocused, isSearchFocused, searchQuery]);

  const inventoryShardCount = useMemo(() => {
    if (!playerIdentity || !inventoryItems || !itemDefinitions) return 0;

    const memoryShardDef = Array.from(itemDefinitions.values()).find((def) => def.name === 'Memory Shard');
    if (!memoryShardDef) return 0;

    let total = 0;
    inventoryItems.forEach((item) => {
      const loc = item.location;
      if (!loc) return;

      let isOwned = false;
      if (loc.tag === 'Inventory' && loc.value?.ownerId?.isEqual(playerIdentity)) {
        isOwned = true;
      } else if (loc.tag === 'Hotbar' && loc.value?.ownerId?.isEqual(playerIdentity)) {
        isOwned = true;
      }

      if (isOwned && item.itemDefId === memoryShardDef.id) {
        total += Number(item.quantity);
      }
    });

    return total;
  }, [playerIdentity, inventoryItems, itemDefinitions]);

  const currentSeason = useMemo(() => {
    if (worldState) {
      return Math.floor((Number(worldState.dayOfYear) - 1) / 90);
    }
    if (alkState) {
      return Number(alkState.seasonIndex);
    }
    return 0;
  }, [worldState, alkState]);

  const seasonalContracts = useMemo(
    () => Array.from(alkContracts.values()).filter((c) => (getKindTag(c.kind) === 'SeasonalHarvest' || getKindTag(c.kind) === 'BaseFood') && c.isActive && isNotMemoryShard(c)),
    [alkContracts],
  );
  const materialsContracts = useMemo(
    () => Array.from(alkContracts.values()).filter((c) => (getKindTag(c.kind) === 'Materials' || getKindTag(c.kind) === 'BaseIndustrial') && c.isActive && isNotMemoryShard(c)),
    [alkContracts],
  );
  const armsContracts = useMemo(
    () => Array.from(alkContracts.values()).filter((c) => getKindTag(c.kind) === 'Arms' && c.isActive && isNotMemoryShard(c)),
    [alkContracts],
  );
  const armorContracts = useMemo(
    () => Array.from(alkContracts.values()).filter((c) => getKindTag(c.kind) === 'Armor' && c.isActive && isNotMemoryShard(c)),
    [alkContracts],
  );
  const toolsContracts = useMemo(
    () => Array.from(alkContracts.values()).filter((c) => getKindTag(c.kind) === 'Tools' && c.isActive && isNotMemoryShard(c)),
    [alkContracts],
  );
  const provisionsContracts = useMemo(
    () => Array.from(alkContracts.values()).filter((c) => getKindTag(c.kind) === 'Provisions' && c.isActive && isNotMemoryShard(c)),
    [alkContracts],
  );
  const bonusContracts = useMemo(
    () => Array.from(alkContracts.values()).filter((c) => getKindTag(c.kind) === 'DailyBonus' && c.isActive && isNotMemoryShard(c)),
    [alkContracts],
  );
  const buyOrderContracts = useMemo(
    () => Array.from(alkContracts.values()).filter((c) => getKindTag(c.kind) === 'BuyOrder' && c.isActive && isNotMemoryShard(c)),
    [alkContracts],
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    return Array.from(alkContracts.values())
      .filter((c) => c.isActive && isNotMemoryShard(c))
      .filter((contract) => {
        const itemName = contract.itemName.trim().toLowerCase();
        if (itemName.includes(query)) return true;

        const itemDef = itemDefinitions.get(contract.itemDefId.toString());
        return itemDef?.name?.toLowerCase().includes(query) ?? false;
      });
  }, [alkContracts, searchQuery, itemDefinitions]);

  const isSearchActive = searchQuery.trim().length > 0;

  const myContracts = useMemo(() => {
    if (!playerIdentity) return [] as AlkPlayerContract[];
    return Array.from(alkPlayerContracts.values())
      .filter((pc) => pc.playerId.toHexString() === playerIdentity.toHexString())
      .sort((a, b) => {
        const timeA = (a.acceptedAt as any)?.microsSinceUnixEpoch ?? 0n;
        const timeB = (b.acceptedAt as any)?.microsSinceUnixEpoch ?? 0n;
        if (timeB > timeA) return 1;
        if (timeB < timeA) return -1;
        return 0;
      });
  }, [alkPlayerContracts, playerIdentity]);

  const acceptedContractIds = useMemo(
    () => new Set(myContracts.filter((pc) => pc.status?.tag === 'Active').map((pc) => pc.contractId.toString())),
    [myContracts],
  );

  const handleAcceptContract = useCallback((contractId: bigint, quantity: number) => {
    if (!connection.connection) return;
    connection.connection.reducers.acceptAlkContract({
      contractId,
      targetQuantity: quantity,
      preferredStationId: nearbyStationId !== null ? nearbyStationId : undefined,
    });
  }, [connection, nearbyStationId]);

  const handleCancelContract = useCallback((playerContractId: bigint) => {
    if (!connection.connection) return;
    connection.connection.reducers.cancelAlkContract({ playerContractId });
  }, [connection]);

  const handleDeliverContract = useCallback((playerContractId: bigint) => {
    if (!connection.connection || nearbyStationId === null) return;
    connection.connection.reducers.deliverAlkContract({ playerContractId, stationId: nearbyStationId });
  }, [connection, nearbyStationId]);

  const handlePurchase = useCallback((contractId: bigint, bundlesToBuy: number) => {
    if (!connection.connection) return;
    (connection.connection.reducers as any).purchaseFromAlk(contractId, bundlesToBuy);
  }, [connection]);

  return {
    playerIdentity: playerIdentity as Identity | null,
    alkState,
    alkStations,
    alkContracts,
    alkPlayerContracts,
    worldState,
    itemDefinitions,
    inventoryItems,
    activeTab,
    setActiveTab,
    nearbyStationId,
    isQuantityInputFocused,
    setIsQuantityInputFocused,
    searchQuery,
    setSearchQuery,
    isSearchFocused,
    setIsSearchFocused,
    inventoryShardCount,
    currentSeason,
    seasonalContracts,
    materialsContracts,
    armsContracts,
    armorContracts,
    toolsContracts,
    provisionsContracts,
    bonusContracts,
    buyOrderContracts,
    searchResults,
    isSearchActive,
    myContracts,
    acceptedContractIds,
    handleAcceptContract,
    handleCancelContract,
    handleDeliverContract,
    handlePurchase,
    isAtCentralCompound: nearbyStationId === 0,
  };
}
