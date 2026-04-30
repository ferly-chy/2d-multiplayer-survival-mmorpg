import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Identity } from 'spacetimedb';
import type { AlkContract, AlkContractKind, AlkPlayerContract } from '../generated/types';
import { useGameConnection } from '../contexts/GameConnectionContext';
import { useGameplaySession } from '../contexts/GameplaySessionContext';
import { useGameplayMovement } from '../contexts/GameplayMovementContext';
import { useAlkPanelRuntimeData, useGameScreenWorldTables, useLocalPlayer } from '../engine/selectors';
import {
  buildItemDefinitionsByName,
  buildPlayerInventoryCountsByDefId,
} from '../utils/playerInventoryIndex';

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
          e.key === 'y' || e.key === 'Y' || e.key === 'k' || e.key === 'K' ||
          e.key === 'g' || e.key === 'G' ||
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

  const itemDefinitionsByName = useMemo(
    () => buildItemDefinitionsByName(itemDefinitions),
    [itemDefinitions],
  );

  const playerInventoryCountsByDefId = useMemo(
    () => buildPlayerInventoryCountsByDefId(inventoryItems, playerIdentity),
    [inventoryItems, playerIdentity],
  );

  const inventoryShardCount = useMemo(() => {
    const memoryShardDef = itemDefinitionsByName.get('Memory Shard');
    return memoryShardDef ? playerInventoryCountsByDefId.get(memoryShardDef.id.toString()) ?? 0 : 0;
  }, [itemDefinitionsByName, playerInventoryCountsByDefId]);

  const currentSeason = useMemo(() => {
    if (worldState) {
      return Math.floor((Number(worldState.dayOfYear) - 1) / 90);
    }
    if (alkState) {
      return Number(alkState.seasonIndex);
    }
    return 0;
  }, [worldState, alkState]);

  const groupedContracts = useMemo(() => {
    const groups = {
      seasonal: [] as AlkContract[],
      materials: [] as AlkContract[],
      arms: [] as AlkContract[],
      armor: [] as AlkContract[],
      tools: [] as AlkContract[],
      provisions: [] as AlkContract[],
      bonus: [] as AlkContract[],
      buyOrders: [] as AlkContract[],
    };

    alkContracts.forEach((contract) => {
      if (!contract.isActive || !isNotMemoryShard(contract)) return;

      switch (getKindTag(contract.kind)) {
        case 'SeasonalHarvest':
        case 'BaseFood':
          groups.seasonal.push(contract);
          break;
        case 'Materials':
        case 'BaseIndustrial':
          groups.materials.push(contract);
          break;
        case 'Arms':
          groups.arms.push(contract);
          break;
        case 'Armor':
          groups.armor.push(contract);
          break;
        case 'Tools':
          groups.tools.push(contract);
          break;
        case 'Provisions':
          groups.provisions.push(contract);
          break;
        case 'DailyBonus':
          groups.bonus.push(contract);
          break;
        case 'BuyOrder':
          groups.buyOrders.push(contract);
          break;
      }
    });

    return groups;
  }, [alkContracts]);

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
    itemDefinitionsByName,
    playerInventoryCountsByDefId,
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
    seasonalContracts: groupedContracts.seasonal,
    materialsContracts: groupedContracts.materials,
    armsContracts: groupedContracts.arms,
    armorContracts: groupedContracts.armor,
    toolsContracts: groupedContracts.tools,
    provisionsContracts: groupedContracts.provisions,
    bonusContracts: groupedContracts.bonus,
    buyOrderContracts: groupedContracts.buyOrders,
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
