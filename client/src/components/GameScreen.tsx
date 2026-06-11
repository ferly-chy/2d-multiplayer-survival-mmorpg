/**
 * GameScreen - Gameplay composition layer around runtime-backed state.
 *
 * Focuses on screen layout and view wiring by composing `GameCanvas`, overlay UI,
 * and gameplay panels around runtime selectors plus bridge-provided session,
 * interaction, and movement contexts. Broad gameplay ownership is expected to live
 * below this component.
 */

import { memo, useState, useCallback } from 'react';

// Import child components
import GameCanvas from './GameCanvas';
import PlayerUI from './PlayerUI';
import Chat from './Chat';
import SpeechBubbleManager from './SpeechBubbleManager';
import TargetingReticle from './TargetingReticle';
import FishingManager from './FishingManager';
import { type CairnNotification } from './CairnUnlockNotification';
import GameScreenOverlayUI from './GameScreenOverlayUI';

// Import types used by props
import type {
    Player as SpacetimeDBPlayer,
    Tree as SpacetimeDBTree,
    Stone as SpacetimeDBStone,
    RuneStone as SpacetimeDBRuneStone,
    Cairn as SpacetimeDBCairn,
    PlayerDiscoveredCairn as SpacetimeDBPlayerDiscoveredCairn,
    Campfire as SpacetimeDBCampfire,
    Furnace as SpacetimeDBFurnace,
    Barbecue as SpacetimeDBBarbecue,
    Lantern as SpacetimeDBLantern,
    Turret as SpacetimeDBTurret,
    HarvestableResource as SpacetimeDBHarvestableResource,
    DroppedItem as SpacetimeDBDroppedItem,
    WoodenStorageBox as SpacetimeDBWoodenStorageBox,
    InventoryItem as SpacetimeDBInventoryItem,
    ItemDefinition as SpacetimeDBItemDefinition,
    WorldState as SpacetimeDBWorldState,
    ActiveEquipment as SpacetimeDBActiveEquipment,
    Recipe as SpacetimeDBRecipe,
    CraftingQueueItem as SpacetimeDBCraftingQueueItem,
    SleepingBag as SpacetimeDBSleepingBag,
    PlayerCorpse as SpacetimeDBPlayerCorpse,
    Stash as SpacetimeDBStash,
    RainCollector as SpacetimeDBRainCollector,
    WaterPatch as SpacetimeDBWaterPatch,
    FertilizerPatch as SpacetimeDBFertilizerPatch,
    FirePatch as SpacetimeDBFirePatch,
    PlacedExplosive as SpacetimeDBPlacedExplosive,
    ActiveConsumableEffect as SpacetimeDBActiveConsumableEffect,
    Cloud as SpacetimeDBCloud,
    Grass as SpacetimeDBGrass,
    KnockedOutStatus as SpacetimeDBKnockedOutStatus,
    RangedWeaponStats,
    Projectile as SpacetimeDBProjectile,
    DeathMarker as SpacetimeDBDeathMarker,
    Shelter as SpacetimeDBShelter,
    MinimapCache as SpacetimeDBMinimapCache,
    FishingSession,
    PlantedSeed as SpacetimeDBPlantedSeed,
    PlayerDrinkingCooldown as SpacetimeDBPlayerDrinkingCooldown,
    WildAnimal as SpacetimeDBWildAnimal, // Includes hostile NPCs with is_hostile_npc = true
    AnimalCorpse as SpacetimeDBAnimalCorpse,
    Barrel as SpacetimeDBBarrel,
    HomesteadHearth as SpacetimeDBHomesteadHearth,
    BrothPot as SpacetimeDBBrothPot,
    AlkStation as SpacetimeDBAlkStation,
    AlkContract as SpacetimeDBAlkContract,
    AlkPlayerContract as SpacetimeDBAlkPlayerContract,
    AlkState as SpacetimeDBAlkState,
    PlayerShardBalance as SpacetimeDBPlayerShardBalance,
    MemoryGridProgress as SpacetimeDBMemoryGridProgress,
} from '../generated/types';
import { DbConnection } from '../generated';
import { Identity } from 'spacetimedb';
import { PlacementItemInfo, PlacementActions } from '../hooks/usePlacementManager';

// Import voice interface components
import VoiceInterface from './VoiceInterface';
import SOVALoadingBar from './SOVALoadingBar';

// Import other necessary imports
import { useMusicSystem } from '../hooks/useMusicSystem';
import { useGameplayScreenRuntime } from '../engine/react/useGameplayScreenRuntime';
import { useGameplaySession } from '../contexts/GameplaySessionContext';
import { useGameplayInteraction } from '../contexts/GameplayInteractionContext';
import { useGameplayMovement } from '../contexts/GameplayMovementContext';

// Import debug context
import { useDebug } from '../contexts/DebugContext';
import { useErrorDisplay } from '../contexts/ErrorDisplayContext';
import { isAnySovaAudioPlaying } from '../hooks/useSovaSoundBox';

const MemoGameCanvas = memo(GameCanvas);
const MemoPlayerUI = memo(PlayerUI);

// Define props required by GameScreen and its children.
// World tables are read via useGameScreenWorldTables selector; only imperative/UI props here.
interface GameScreenProps {
    // Connection & Player Info
    localPlayerId?: string;
    playerIdentity: Identity | null;
    connection: DbConnection | null;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;

    // Placement State/Actions (from usePlacementManager)
    placementInfo: PlacementItemInfo | null;
    placementActions: PlacementActions; // Pass whole object if GameCanvas needs more than cancel
    placementError: string | null;
    setPlacementWarning: (warning: string | null) => void;
    startPlacement: (itemInfo: PlacementItemInfo) => void;
    cancelPlacement: () => void;

    // Music system for debug controls
    musicSystem: ReturnType<typeof useMusicSystem>;

    // Settings (audio + visual) are now in SettingsContext -- no longer passed as props.

    // Sound system for immediate sound effects
    soundSystem: ReturnType<typeof import('../hooks/useSoundSystem').useSoundSystem>;

    // SOVA Sound Box callback (for deterministic voice notifications)
    showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void;
}

const GameScreen: React.FC<GameScreenProps> = (props) => {
    const [autoActionStates, setAutoActionStates] = useState({ isAutoAttacking: false });

    // Cairn unlock notification state
    const [cairnNotification, setCairnNotification] = useState<CairnNotification | null>(null);
    const handleCairnNotification = useCallback((notification: CairnNotification) => {
        setCairnNotification(notification);
    }, []);
    const dismissCairnNotification = useCallback(() => {
        setCairnNotification(null);
    }, []);

    // Debug context
    const { showAutotileDebug, toggleAutotileDebug, showMusicDebug, showChunkBoundaries, toggleChunkBoundaries, showInteriorDebug, toggleInteriorDebug, showCollisionDebug, toggleCollisionDebug, showAttackRangeDebug, toggleAttackRangeDebug, showYSortDebug, toggleYSortDebug, showShipwreckDebug, toggleShipwreckDebug, showFpsProfiler, isProfilerRecording, startProfilerRecording, stopProfilerRecording } = useDebug();
    const { showError } = useErrorDisplay();



    // Destructure imperative props; UI state from useGameUI
    const {
        localPlayerId, playerIdentity, connection,
        canvasRef,
        placementInfo, placementActions, placementError, setPlacementWarning, startPlacement, cancelPlacement,
        musicSystem,
        soundSystem,
        showSovaSoundBox,
    } = props;

    const {
        currentMenu,
        onMenuOpen,
        onMenuClose,
        onMenuNavigate,
        onMenuBack,
        showRefreshDialog,
        onRefreshConfirm,
        onRefreshCancel,
        isQuestsPanelOpen,
        onOpenQuestsPanel,
        onCloseQuestsPanel,
        isDayNightMinimized,
        onDayNightMinimizedChange,
        mobileInteractInfo,
        onMobileInteractInfoChange,
        mobileInteractTrigger,
        onMobileInteract,
        profilerCopyToast,
        onProfilerCopied,
        showInventoryState,
        setShowInventoryState,
        showCraftingScreenState,
        setShowCraftingScreenState,
        isMobileChatOpen,
        setIsMobileChatOpen,
        alkInitialTab,
        sovaMessageAdder,
        onSOVAMessageAdderReady,
        localBubbles,
        onAddLocalBubble,
        sovaLoadingState,
        onSOVALoadingStateChange,
    } = useGameplaySession();
    const {
        interactingWith,
        handleSetInteractingWith,
        draggedItemInfo,
        handleItemDragStart,
        handleItemDrop,
    } = useGameplayInteraction();
    const {
        predictedPosition,
        getCurrentPositionNow,
        getCurrentFacingDirectionNow,
        getCurrentDodgeRollVisualNow,
        onDodgeRollStart,
        stepPredictedMovement,
        movementDirection,
        isAutoWalking,
        facingDirection,
        isMobile,
        onMobileTap,
        tapAnimation,
        isFishing,
        onFishingStateChange,
    } = useGameplayMovement();

    const {
        gameUI,
        tables,
        messages,
        playerPins,
        activeConnections,
        matronages,
        matronageMembers,
        matronageInvitations,
        matronageOwedShards,
        beaconDropEvents,
        worldChunkDataMap,
        isWaterTile,
        voiceState,
        handleTranscriptionComplete,
        handleVoiceError,
        seenTutorialIds,
        questCompletionNotification,
        dismissQuestCompletionNotification,
        hasNewQuestNotification,
        handleMatronageCreated,
        handleOpenAlkBoard,
        handleInterfaceClose,
        localPlayer,
        cameraOffsetX,
        cameraOffsetY,
        localPlayerActiveEquipment,
        activeItemDef,
        handleTitleSelect,
    } = useGameplayScreenRuntime({
        localPlayerId,
        playerIdentity,
        connection,
        showSovaSoundBox,
        predictedPosition,
    });

    const {
        players, trees, stones, runeStones, cairns, playerDiscoveredCairns, campfires, furnaces, barbecues, lanterns, turrets,
        harvestableResources, droppedItems, woodenStorageBoxes, sleepingBags, playerCorpses, stashes, shelters, plantedSeeds,
        minimapCache, wildAnimals, hostileDeathEvents, animalCorpses, inventoryItems, itemDefinitions, worldState,
        activeEquipments, recipes, craftingQueueItems, activeConsumableEffects, clouds, droneEvents, grass, grassState,
        knockedOutStatus, rangedWeaponStats, projectiles, deathMarkers, playerDrinkingCooldowns, playerDodgeRollStates,
        rainCollectors, brothPots, waterPatches, fertilizerPatches, firePatches, placedExplosives, chunkWeather, fishingSessions,
        alkStations, alkContracts, alkPlayerContracts, alkState, monumentParts, largeQuarries, playerShardBalance,
        memoryGridProgress, playerStats, playerAchievements, achievementDefinitions, leaderboardEntries,
        plantConfigDefinitions, discoveredPlants, caribouBreedingData, walrusBreedingData, caribouRutState, walrusRutState,
        barrels, roadLampposts, seaStacks, homesteadHearths, foundationCells, wallCells, doors, fences,
        fumaroles, basaltColumns, livingCorals, hotSprings,
    } = tables;

    // Handler for auto-action state changes from GameCanvas
    const handleAutoActionStatesChange = useCallback((isAutoAttacking: boolean) => {
        // console.log('[GameScreen] Auto-action states changed:', { isAutoAttacking });
        setAutoActionStates({ isAutoAttacking });
    }, []);

    return (
        <div className="game-container">
            <GameScreenOverlayUI
                isMobile={isMobile}
                localPlayer={localPlayer}
                worldState={worldState}
                connection={connection}
                itemDefinitions={itemDefinitions}
                autoActionStates={autoActionStates}
                playerIdentity={playerIdentity}
                showSovaSoundBox={showSovaSoundBox}
                seenTutorialIds={seenTutorialIds}
                musicSystem={musicSystem}
                alkStations={alkStations}
                onMatronageCreated={handleMatronageCreated}
                onOpenAlkBoard={handleOpenAlkBoard}
                cairnNotification={cairnNotification}
                onDismissCairnNotification={dismissCairnNotification}
                questCompletionNotification={questCompletionNotification}
                onDismissQuestCompletion={dismissQuestCompletionNotification}
                hasNewQuestNotification={hasNewQuestNotification}
            />

            <MemoGameCanvas
                addSOVAMessage={sovaMessageAdder || undefined}
                showSovaSoundBox={showSovaSoundBox}
                onCairnNotification={handleCairnNotification}
                localPlayerId={localPlayerId}
                connection={connection}
                placementInfo={placementInfo}
                placementActions={placementActions}
                placementError={placementError}
                setPlacementWarning={setPlacementWarning}
                gameCanvasRef={canvasRef}
                showAutotileDebug={showAutotileDebug}
                showChunkBoundaries={showChunkBoundaries}
                showInteriorDebug={showInteriorDebug}
                showCollisionDebug={showCollisionDebug}
                showAttackRangeDebug={showAttackRangeDebug}
                showYSortDebug={showYSortDebug}
                showShipwreckDebug={showShipwreckDebug}
                showFpsProfiler={showFpsProfiler}
                isProfilerRecording={isProfilerRecording}
                startProfilerRecording={startProfilerRecording}
                stopProfilerRecording={stopProfilerRecording}
                onProfilerCopied={onProfilerCopied}
                isGameMenuOpen={currentMenu !== null}
                onAutoActionStatesChange={handleAutoActionStatesChange}
            />

            {/* Use our camera offsets for SpeechBubbleManager */}
            {/* Pass predicted position so local player bubble tracks smoothly */}
            <SpeechBubbleManager
                cameraOffsetX={cameraOffsetX}
                cameraOffsetY={cameraOffsetY}
                localBubbles={localBubbles}
                predictedPosition={predictedPosition}
            />

            {/* PlayerUI - Always render for status bars, but inventory only when opened on mobile */}
            <MemoPlayerUI
                identity={playerIdentity}
                players={players}
                inventoryItems={inventoryItems}
                itemDefinitions={itemDefinitions}
                rangedWeaponStats={rangedWeaponStats}
                recipes={recipes}
                craftingQueueItems={craftingQueueItems}
                onItemDragStart={handleItemDragStart}
                onItemDrop={handleItemDrop}
                draggedItemInfo={draggedItemInfo}
                interactingWith={interactingWith}
                onSetInteractingWith={handleSetInteractingWith}
                campfires={campfires}
                furnaces={furnaces}
                barbecues={barbecues}
                fumaroles={fumaroles}
                lanterns={lanterns}
                turrets={turrets}
                woodenStorageBoxes={woodenStorageBoxes}
                playerCorpses={playerCorpses}
                stashes={stashes}
                rainCollectors={rainCollectors}
                brothPots={brothPots}
                homesteadHearths={homesteadHearths}
                currentStorageBox={
                    interactingWith?.type === 'wooden_storage_box'
                        ? woodenStorageBoxes.get(interactingWith.id.toString()) || null
                        : null
                }
                startPlacement={startPlacement}
                cancelPlacement={cancelPlacement}
                placementInfo={placementInfo}
                connection={connection}
                chunkWeather={chunkWeather}
                activeEquipments={activeEquipments}
                activeConsumableEffects={activeConsumableEffects}
                onCraftingSearchFocusChange={gameUI.setIsCraftingSearchFocused}
                onToggleInventory={() => {
                    if (isMobile && !showInventoryState) {
                        // Block opening inventory on mobile - SOVA error or red box when narrative playing
                        if (isAnySovaAudioPlaying()) {
                            showError('Not available on mobile.');
                        } else if (showSovaSoundBox) {
                            const audio = new Audio('/sounds/sova_error_mobile_capability.mp3');
                            audio.volume = 0.8;
                            showSovaSoundBox(audio, 'SOVA');
                            audio.play().catch(() => { });
                        }
                        return;
                    }
                    setShowInventoryState(prev => !prev);
                }}
                showInventory={isMobile ? showInventoryState : showInventoryState}
                knockedOutStatus={knockedOutStatus}
                worldState={worldState}
                isGameMenuOpen={currentMenu !== null}
                memoryGridProgress={memoryGridProgress}
                playerStats={playerStats}
                isMobile={isMobile}
                showCraftingScreen={showCraftingScreenState}
                onToggleCraftingScreen={() => {
                    if (isMobile && !showCraftingScreenState) {
                        // Block opening crafting on mobile - SOVA error or red box when narrative playing
                        if (isAnySovaAudioPlaying()) {
                            showError('Not available on mobile.');
                        } else if (showSovaSoundBox) {
                            const audio = new Audio('/sounds/sova_error_mobile_capability.mp3');
                            audio.volume = 0.8;
                            showSovaSoundBox(audio, 'SOVA');
                            audio.play().catch(() => { });
                        }
                        return;
                    }
                    setShowCraftingScreenState(prev => !prev);
                }}
                onPauseBackgroundMusic={musicSystem.stop}
                onResumeBackgroundMusic={musicSystem.start}
            />
            <Chat
                connection={connection}
                onSOVAMessageAdderReady={onSOVAMessageAdderReady}
                isMobile={isMobile}
                isMobileChatOpen={isMobileChatOpen}
                onTitleSelect={handleTitleSelect}
                onSayCommand={onAddLocalBubble}
            />

            {/* TargetingReticle - Hidden on mobile */}
            {!isMobile && (
                <TargetingReticle
                    localPlayer={localPlayer || null}
                    playerIdentity={playerIdentity}
                    activeItemDef={activeItemDef}
                    activeEquipment={localPlayerActiveEquipment || null}
                    rangedWeaponStats={rangedWeaponStats || new Map()}
                    gameCanvasRef={canvasRef}
                    cameraOffsetX={cameraOffsetX}
                    cameraOffsetY={cameraOffsetY}
                    isInventoryOpen={showInventoryState || showCraftingScreenState}
                    isGameMenuOpen={currentMenu !== null}
                    isMinimapOpen={gameUI.isMinimapOpen}
                />
            )}

            {/* FishingManager - Hidden on mobile */}
            {!isMobile && (
                <FishingManager
                    localPlayer={localPlayer || null}
                    playerIdentity={playerIdentity}
                    activeItemDef={activeItemDef}
                    gameCanvasRef={canvasRef}
                    cameraOffsetX={cameraOffsetX}
                    cameraOffsetY={cameraOffsetY}
                    connection={connection}
                    onFishingStateChange={onFishingStateChange}
                    // Fishing sessions and players for rendering other players' fishing
                    fishingSessions={fishingSessions}
                    players={players}
                    // worldState for weather information
                    worldState={worldState}
                    isWaterTile={isWaterTile}
                    isInventoryOpen={showInventoryState || showCraftingScreenState}
                    isGameMenuOpen={currentMenu !== null}
                    isMinimapOpen={gameUI.isMinimapOpen}
                />
            )}

            {/* SOVA Loading Bar - Hidden on mobile */}
            {!isMobile && (
                <SOVALoadingBar
                    isRecording={sovaLoadingState.isRecording}
                    isTranscribing={sovaLoadingState.isTranscribing}
                    isGeneratingResponse={sovaLoadingState.isGeneratingResponse}
                    isSynthesizingVoice={sovaLoadingState.isSynthesizingVoice}
                    isPlayingAudio={sovaLoadingState.isPlayingAudio}
                    currentPhase={sovaLoadingState.currentPhase}
                />
            )}

            {/* Voice Interface - Hidden on mobile */}
            {!isMobile && (
                <VoiceInterface
                    isVisible={voiceState.isVisible}
                    onTranscriptionComplete={handleTranscriptionComplete}
                    onError={handleVoiceError}
                    onAddSOVAMessage={sovaMessageAdder}
                    localPlayerIdentity={localPlayerId}
                    worldState={worldState}
                    localPlayer={localPlayer}
                    itemDefinitions={itemDefinitions}
                    activeEquipments={activeEquipments}
                    inventoryItems={inventoryItems}
                    recipes={recipes}
                    playerIdentity={playerIdentity}
                    connection={connection}
                    onLoadingStateChange={onSOVALoadingStateChange}
                />
            )}

        </div>
    );
};

export default GameScreen; 