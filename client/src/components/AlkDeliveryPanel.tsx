/**
 * AlkDeliveryPanel.tsx
 * 
 * Panel that appears when players interact with an ALK delivery station
 * Shows active contracts and allows delivery of completed ones
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Identity } from 'spacetimedb';
import { useGameConnection } from '../contexts/GameConnectionContext';
import { getItemIcon } from '../utils/itemIconUtils';
import './AlkDeliveryPanel.css';
import {
    AlkStation,
    AlkContract,
    AlkPlayerContract,
    ItemDefinition,
} from '../generated/types';
import { useAlkPanelRuntimeData } from '../engine/selectors';
import {
    buildItemDefinitionsByName,
    buildPlayerInventoryCountsByDefId,
} from '../utils/playerInventoryIndex';

// Module-level flag to prevent immediate reopening after E key close
// This is shared across all instances and persists briefly after panel closes
let alkPanelJustClosed = false;
let alkPanelCloseTimeout: NodeJS.Timeout | null = null;

export function wasAlkPanelJustClosed(): boolean {
    return alkPanelJustClosed;
}

function setAlkPanelJustClosed() {
    alkPanelJustClosed = true;
    if (alkPanelCloseTimeout) {
        clearTimeout(alkPanelCloseTimeout);
    }
    // Reset flag after 200ms - enough time for keyup to fire
    alkPanelCloseTimeout = setTimeout(() => {
        alkPanelJustClosed = false;
    }, 200);
}

// Memory shard icon
const memoryShardIcon = getItemIcon('memory_shard.png');

interface AlkDeliveryPanelProps {
    playerIdentity: Identity | null;
    onClose: () => void;
    stationId: number;
    // Callback when a matronage is created - opens matronage page
    onMatronageCreated?: () => void;
    // Callback to open ALK provisioning board (G menu) to a specific tab
    onOpenAlkBoard?: (tab?: string) => void;
}

export const AlkDeliveryPanel: React.FC<AlkDeliveryPanelProps> = ({
    playerIdentity,
    onClose,
    stationId,
    onMatronageCreated,
    onOpenAlkBoard,
}) => {
    const { connection } = useGameConnection();
    const {
        alkStations,
        alkContracts,
        alkPlayerContracts,
        itemDefinitions,
        inventoryItems,
        matronageMembers,
        matronages,
    } = useAlkPanelRuntimeData();
    const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
    const [isDelivering, setIsDelivering] = useState(false);
    // Matronage creation state
    const [matronageName, setMatronageName] = useState('');
    const [isCreatingMatronage, setIsCreatingMatronage] = useState(false);
    const [matronageError, setMatronageError] = useState<string | null>(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    // Check if player is in a matronage
    const playerMatronage = useMemo(() => {
        if (!playerIdentity || !matronageMembers || !matronages) return null;
        const membership = matronageMembers.get(playerIdentity.toHexString());
        if (!membership) return null;
        const matronageId = membership.matronageId?.toString();
        return Array.from(matronages.values()).find(
            (m: any) => m.id?.toString() === matronageId
        ) || null;
    }, [playerIdentity, matronageMembers, matronages]);
    
    const isInMatronage = !!playerMatronage;
    
    // Check if this is the Central Compound
    const isCentralCompound = stationId === 0;
    
    const itemDefinitionsByName = useMemo(
        () => buildItemDefinitionsByName(itemDefinitions),
        [itemDefinitions],
    );

    const playerInventoryCountsByDefId = useMemo(
        () => buildPlayerInventoryCountsByDefId(inventoryItems, playerIdentity),
        [inventoryItems, playerIdentity],
    );
    
    // Check if player has a Matron's Mark in inventory
    const hasMatronsMark = useMemo(() => {
        const matronsMarkDef = itemDefinitionsByName.get("Matron's Mark");
        if (!matronsMarkDef) return false;

        return (playerInventoryCountsByDefId.get(matronsMarkDef.id.toString()) ?? 0) > 0;
    }, [itemDefinitionsByName, playerInventoryCountsByDefId]);
    
    // Handle creating a new matronage
    const handleCreateMatronage = useCallback(async () => {
        if (!connection || !matronageName.trim()) return;
        setIsCreatingMatronage(true);
        setMatronageError(null);
        try {
            await connection.reducers.useMatronsMark({ matronageName: matronageName.trim() });
            setMatronageName(''); // Clear input on success
            // Close this panel and open the matronage page so user can see their new matronage
            if (onMatronageCreated) {
                onMatronageCreated();
            }
        } catch (e: any) {
            setMatronageError(e.message || 'Failed to create matronage');
        }
        setIsCreatingMatronage(false);
    }, [connection, matronageName, onMatronageCreated]);
    
    // Count Memory Shards in player's inventory (this is the real shard count)
    const inventoryShardCount = useMemo(() => {
        const memoryShardDef = itemDefinitionsByName.get('Memory Shard');
        return memoryShardDef ? playerInventoryCountsByDefId.get(memoryShardDef.id.toString()) ?? 0 : 0;
    }, [itemDefinitionsByName, playerInventoryCountsByDefId]);

    // Get the station details
    const station = useMemo(() => {
        return alkStations.get(stationId.toString());
    }, [alkStations, stationId]);

    // Get player's active contracts
    const activeContracts = useMemo(() => {
        if (!playerIdentity) return [];
        
        const contracts: Array<{
            playerContract: AlkPlayerContract;
            contract: AlkContract;
            itemDef: ItemDefinition | undefined;
            inventoryQty: number;
            canDeliver: boolean;
        }> = [];

        alkPlayerContracts.forEach((pc) => {
            // Only show Active contracts for this player
            if (!pc.playerId || !pc.playerId.isEqual(playerIdentity)) return;
            if (!pc.status || pc.status.tag !== 'Active') return;

            const contract = alkContracts.get(pc.contractId.toString());
            if (!contract) return;

            const itemDef = itemDefinitionsByName.get(contract.itemName.trim());

            const inventoryQty = itemDef
                ? playerInventoryCountsByDefId.get(itemDef.id.toString()) ?? 0
                : 0;

            // Can deliver if we have at least the target quantity
            const targetQty = Number(pc.targetQuantity);
            const canDeliver = inventoryQty >= targetQty;

            contracts.push({
                playerContract: pc,
                contract,
                itemDef,
                inventoryQty,
                canDeliver,
            });
        });

        return contracts;
    }, [alkPlayerContracts, alkContracts, itemDefinitionsByName, playerInventoryCountsByDefId, playerIdentity]);

    // Calculate total deliverable shards
    const deliverableSummary = useMemo(() => {
        let totalGross = 0;
        let totalFee = 0;
        let totalBundleCount = 0;
        let deliverableContractCount = 0;

        activeContracts.forEach(({ playerContract, contract, canDeliver }) => {
            if (canDeliver) {
                // Calculate total bundles for this contract
                const targetQty = Number(playerContract.targetQuantity);
                const bundleSize = Number(contract.bundleSize);
                const bundles = Math.floor(targetQty / bundleSize);
                // Total reward = bundles × reward per bundle
                const gross = bundles * Number(contract.shardRewardPerBundle);
                const fee = station ? Math.floor(gross * station.deliveryFeeRate) : 0;
                totalGross += gross;
                totalFee += fee;
                totalBundleCount += bundles;
                deliverableContractCount++;
            }
        });

        return {
            totalGross,
            totalFee,
            totalNet: totalGross - totalFee,
            totalBundleCount,
            deliverableContractCount,
        };
    }, [activeContracts, station]);

    // Handle delivering a single contract (to player directly)
    const handleDeliver = useCallback(async (playerContractId: bigint) => {
        if (!connection?.reducers || isDelivering) return;

        setIsDelivering(true);
        setDeliveryStatus('Processing delivery...');

        try {
            connection.reducers.deliverAlkContract({ playerContractId: BigInt(playerContractId), stationId });
            setDeliveryStatus('✓ Delivery successful!');
            setTimeout(() => setDeliveryStatus(null), 2000);
        } catch (error: any) {
            setDeliveryStatus(`✗ ${error.message || 'Delivery failed'}`);
            setTimeout(() => setDeliveryStatus(null), 3000);
        } finally {
            setIsDelivering(false);
        }
    }, [connection, stationId, isDelivering]);
    
    // Handle delivering a single contract to matronage pool
    const handleDeliverToMatronage = useCallback(async (playerContractId: bigint) => {
        if (!connection?.reducers || isDelivering || !isInMatronage) return;

        setIsDelivering(true);
        setDeliveryStatus('Assigning to Matronage...');

        try {
            connection.reducers.deliverAlkContractToMatronage({ playerContractId: BigInt(playerContractId), stationId });
            setDeliveryStatus('✓ Assigned to Matronage pool!');
            setTimeout(() => setDeliveryStatus(null), 2000);
        } catch (error: any) {
            setDeliveryStatus(`✗ ${error.message || 'Assignment failed'}`);
            setTimeout(() => setDeliveryStatus(null), 3000);
        } finally {
            setIsDelivering(false);
        }
    }, [connection, stationId, isDelivering, isInMatronage]);

    // Handle delivering all ready contracts
    const handleDeliverAll = useCallback(async () => {
        if (!connection?.reducers || isDelivering || deliverableSummary.deliverableContractCount === 0) return;

        setIsDelivering(true);
        setDeliveryStatus('Processing deliveries...');

        let successCount = 0;
        let failCount = 0;

        for (const { playerContract, canDeliver } of activeContracts) {
            if (canDeliver) {
                try {
                    connection.reducers.deliverAlkContract({ playerContractId: BigInt(playerContract.id), stationId });
                    successCount++;
                } catch {
                    failCount++;
                }
            }
        }

        if (failCount === 0) {
            setDeliveryStatus(`✓ ${successCount} deliveries completed!`);
        } else {
            setDeliveryStatus(`${successCount} delivered, ${failCount} failed`);
        }

        setTimeout(() => setDeliveryStatus(null), 3000);
        setIsDelivering(false);
    }, [connection, stationId, isDelivering, activeContracts, deliverableSummary.deliverableContractCount]);

    // Handle E key to close the panel (toggle behavior)
    // Uses a module-level flag to prevent the input handler from immediately reopening
    // Block movement keys when input is focused (for matronage name entry)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Handle Escape on keydown (feels more responsive)
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                onClose();
                return;
            }
            // Block E keydown from reaching input handler while panel is open
            if (e.key === 'e' || e.key === 'E') {
                if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    // Set flag BEFORE closing so input handler knows not to reopen
                    setAlkPanelJustClosed();
                    onClose();
                }
            }
            // Block movement keys and spacebar when input is focused (matronage name entry)
            if (isInputFocused) {
                // Block WASD and arrow keys from moving player
                if (e.key === 'w' || e.key === 'W' || e.key === 'a' || e.key === 'A' ||
                    e.key === 's' || e.key === 'S' || e.key === 'd' || e.key === 'D' ||
                    e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
                    e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.stopPropagation();
                }
                // Spacebar needs special handling - stop propagation but don't prevent default
                // so the space character still gets typed
                if (e.key === ' ') {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }
        };

        // Use capture phase to intercept BEFORE the input handler's bubble phase listeners
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [onClose, isInputFocused]);

    if (!station) {
        return (
            <div className="alk-delivery-panel">
                <div className="alk-delivery-header">
                    <h2>Station Not Found</h2>
                    <button className="alk-delivery-close" onClick={onClose}>×</button>
                </div>
                <p>Unable to locate this delivery station.</p>
            </div>
        );
    }

    return (
        <div className="alk-delivery-panel">
            {/* Header */}
            <div className="alk-delivery-header">
                <div className="station-info">
                    <h2>{station.name || 'ALK STATION'}</h2>
                    {station.deliveryFeeRate > 0 && (
                        <span className="station-fee">
                            {Math.round(station.deliveryFeeRate * 100)}% Station Fee
                        </span>
                    )}
                </div>
                <button className="alk-delivery-close" onClick={onClose}>×</button>
            </div>

            {/* Status Message */}
            {deliveryStatus && (
                <div className={`delivery-status ${deliveryStatus.startsWith('✓') ? 'success' : deliveryStatus.startsWith('✗') ? 'error' : 'processing'}`}>
                    {deliveryStatus}
                </div>
            )}

            {/* Shard Balance - shows actual Memory Shards in inventory */}
            <div className="alk-delivery-balance">
                <span className="balance-label">Your Shards:</span>
                <span className="balance-value">
                    <img src={memoryShardIcon} alt="" className="shard-icon" />
                    {inventoryShardCount.toLocaleString()}
                </span>
            </div>

            {/* Central Compound Quick Actions - Only shown at station 0 */}
            {isCentralCompound && onOpenAlkBoard && (
                <div className="alk-quick-actions">
                    <div className="quick-actions-header">
                        <span className="quick-actions-icon">📋</span>
                        <span className="quick-actions-title">ALK Provisioning Board</span>
                    </div>
                    <div className="quick-actions-buttons">
                        <button 
                            className="quick-action-btn buy-orders"
                            onClick={() => onOpenAlkBoard('buy-orders')}
                            title="Spend Memory Shards to buy materials"
                        >
                            <span className="btn-icon">🛒</span>
                            <span className="btn-text">Buy Materials</span>
                        </button>
                        <button 
                            className="quick-action-btn work-orders"
                            onClick={() => onOpenAlkBoard('seasonal')}
                            title="Accept work orders to earn Memory Shards"
                        >
                            <span className="btn-icon">📜</span>
                            <span className="btn-text">Work Orders</span>
                        </button>
                        <button 
                            className="quick-action-btn my-contracts"
                            onClick={() => onOpenAlkBoard('my-contracts')}
                            title="View your accepted contracts"
                        >
                            <span className="btn-icon">📦</span>
                            <span className="btn-text">My Contracts</span>
                        </button>
                    </div>
                    <p className="quick-actions-hint">Central Compound: No delivery fee • Buy orders available here</p>
                </div>
            )}

            {/* Matronage Creation Section - Always shown at Central Compound, greyed out if unavailable */}
            {isCentralCompound && (
                <div className={`alk-matronage-section ${!hasMatronsMark || isInMatronage ? 'disabled' : ''}`}>
                    <div className="matronage-header">
                        <span className="matronage-icon">🏛️</span>
                        <h3>Found a Matronage</h3>
                        {isInMatronage && (
                            <span className="matronage-status in-matronage">Already in Matronage</span>
                        )}
                        {!isInMatronage && !hasMatronsMark && (
                            <span className="matronage-status needs-mark">Requires Matron's Mark</span>
                        )}
                    </div>
                    <p className="matronage-desc">
                        {isInMatronage 
                            ? `You are a member of "${playerMatronage?.name || 'a Matronage'}". Leave to found your own.`
                            : hasMatronsMark
                                ? 'Use your Matron\'s Mark to create a cooperative for pooling work order rewards.'
                                : 'Obtain a Matron\'s Mark to create your own cooperative for pooling work order rewards with allies.'
                        }
                    </p>
                    {matronageError && (
                        <div className="matronage-error">{matronageError}</div>
                    )}
                    <div className="matronage-form">
                        <input
                            type="text"
                            className="matronage-name-input"
                            placeholder={hasMatronsMark ? "Enter Matronage Name (1-32 chars)" : "Matron's Mark required..."}
                            value={matronageName}
                            onChange={(e) => setMatronageName(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            maxLength={32}
                            disabled={isCreatingMatronage || !hasMatronsMark || isInMatronage}
                            data-allow-spacebar="true"
                        />
                        <button
                            className="matronage-create-btn"
                            onClick={handleCreateMatronage}
                            disabled={isCreatingMatronage || !matronageName.trim() || !hasMatronsMark || isInMatronage}
                        >
                            {isCreatingMatronage ? 'Creating...' : 'Found Matronage'}
                        </button>
                    </div>
                </div>
            )}

            {/* Contract List */}
            <div className="alk-delivery-contracts">
                <h3>Active Contracts ({activeContracts.length})</h3>
                
                {activeContracts.length === 0 ? (
                    <div className="no-contracts">
                        <p>No active contracts.</p>
                        <p className="hint">Accept contracts from the ALK Board (press G)</p>
                    </div>
                ) : (
                    <div className="contract-list">
                        {activeContracts.map(({ playerContract, contract, itemDef, inventoryQty, canDeliver }) => {
                            const targetQty = Number(playerContract.targetQuantity);
                            const bundleSize = Number(contract.bundleSize);
                            // Calculate total bundles purchased for this contract
                            const totalBundles = Math.floor(targetQty / bundleSize);
                            // Total reward = bundles × reward per bundle
                            const grossReward = totalBundles * Number(contract.shardRewardPerBundle);
                            const fee = station ? Math.floor(grossReward * station.deliveryFeeRate) : 0;
                            const netReward = grossReward - fee;
                            const progress = Math.min(100, (inventoryQty / targetQty) * 100);

                            return (
                                <div 
                                    key={playerContract.id.toString()} 
                                    className={`delivery-contract ${canDeliver ? 'ready' : 'incomplete'}`}
                                >
                                    <div className="contract-item">
                                        {itemDef?.iconAssetName && (
                                            <img 
                                                src={getItemIcon(itemDef.iconAssetName, 'crafting')} 
                                                alt="" 
                                                className="item-icon" 
                                            />
                                        )}
                                        <div className="item-details">
                                            <span className="item-name">{contract.itemName.trim()}</span>
                                            <span className="item-progress">
                                                {inventoryQty} / {targetQty}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    <div className="contract-reward">
                                        <div className="reward-row">
                                            <span className="reward-label">Gross:</span>
                                            <span className="reward-value">
                                                <img src={memoryShardIcon} alt="" className="shard-icon-small" />
                                                {grossReward}
                                            </span>
                                        </div>
                                        {fee > 0 && (
                                            <div className="reward-row fee">
                                                <span className="reward-label">Fee:</span>
                                                <span className="reward-value">-{fee}</span>
                                            </div>
                                        )}
                                        <div className="reward-row net">
                                            <span className="reward-label">Net:</span>
                                            <span className="reward-value">
                                                <img src={memoryShardIcon} alt="" className="shard-icon-small" />
                                                {netReward}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="deliver-buttons">
                                        <button
                                            className={`deliver-button ${canDeliver ? 'enabled' : 'disabled'}`}
                                            onClick={() => handleDeliver(playerContract.id)}
                                            disabled={!canDeliver || isDelivering}
                                            title={canDeliver ? 'Deliver and receive shards directly' : 'Not enough items to deliver'}
                                        >
                                            {canDeliver ? 'DELIVER' : 'INCOMPLETE'}
                                        </button>
                                        {isInMatronage && canDeliver && (
                                            <button
                                                className="deliver-button matronage-deliver enabled"
                                                onClick={() => handleDeliverToMatronage(playerContract.id)}
                                                disabled={isDelivering}
                                                title={`Assign to ${playerMatronage?.name || 'Matronage'} pool`}
                                            >
                                                🏛️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Deliver All Button */}
            {deliverableSummary.deliverableContractCount > 0 && (
                <div className="alk-delivery-footer">
                    <div className="delivery-summary">
                        <span>
                            {deliverableSummary.deliverableContractCount} contract{deliverableSummary.deliverableContractCount !== 1 ? 's' : ''} ready
                            {deliverableSummary.totalBundleCount > deliverableSummary.deliverableContractCount && 
                                ` (${deliverableSummary.totalBundleCount} bundles)`}
                        </span>
                        <span className="summary-reward">
                            Total: <img src={memoryShardIcon} alt="" className="shard-icon" />
                            {deliverableSummary.totalNet.toLocaleString()}
                            {deliverableSummary.totalFee > 0 && ' (after fee)'}
                        </span>
                    </div>
                    <button
                        className="deliver-all-button"
                        onClick={handleDeliverAll}
                        disabled={isDelivering}
                    >
                        DELIVER ALL
                    </button>
                </div>
            )}

            {/* Instructions */}
            <div className="alk-delivery-instructions">
                <p>Deliver completed contracts to earn Memory Shards!</p>
                {station.deliveryFeeRate > 0 && station.deliveryFeeRate < 0.15 ? null : (
                    <p className="tip">💡 Central Compound has no delivery fee</p>
                )}
            </div>
        </div>
    );
};

export default AlkDeliveryPanel;

