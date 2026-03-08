/**
 * App - Application root, providers, and route-level shell.
 *
 * Owns app bootstrap, providers, auth/connection gating, loading flow, placement
 * setup, and route selection, then hands in-game execution off to
 * `GameplayRuntimeBridge`. Gameplay session behavior is expected to live below this
 * boundary in runtime-backed bridge, selector, and subsystem layers.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Components
import LoginScreen from './components/LoginScreen';
import GameplayRuntimeBridge from './components/GameplayRuntimeBridge';
import CyberpunkLoadingScreen from './components/CyberpunkLoadingScreen';

// Blog Components
import BlogPage from './blog/BlogPage';
import BlogPostPage from './blog/BlogPostPage';

// Legal Pages
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import CookiesPage from './components/CookiesPage';
import AIDisclosurePage from './components/AIDisclosurePage';

// Context Providers
import { GameContextsProvider } from './contexts/GameContexts';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DebugProvider } from './contexts/DebugContext';

// Hooks
import { useGameConnection } from './contexts/GameConnectionContext';
import { useSpacetimeTables } from './hooks/useSpacetimeTables';
import { useAppGameplayRegistration } from './hooks/useAppGameplayRegistration';
import { useAppLoadingScreenFlow } from './hooks/useAppLoadingScreenFlow';
import { useAppPlacementShellEffects } from './hooks/useAppPlacementShellEffects';
import { usePlacementManager } from './hooks/usePlacementManager';
import { useAuthErrorHandler } from './hooks/useAuthErrorHandler';
import { useSovaSoundBox } from './hooks/useSovaSoundBox';
import { useMusicSystemWithSelectors } from './hooks/useMusicSystemWithSelectors';
import { useErrorDisplay } from './contexts/ErrorDisplayContext';
import { useSettings } from './contexts/SettingsContext';

// Asset Preloading
import { useAssetPreload } from './hooks/useAssetPreload';

// Assets & Styles
import './App.css';

// Auto-close interaction when player moves too far from container
import { resetBrothEffectsState } from './utils/renderers/brothEffectsOverlayUtils';
import { resetInsanityState } from './utils/renderers/insanityOverlayUtils';
import { useRuntimeBootstrap } from './engine/react/useRuntimeBootstrap';
import { useRuntimeConnectionBridge } from './engine/react/useRuntimeConnectionBridge';
import { useRuntimeViewport } from './engine/react/useRuntimeViewport';
import { useLocalPlayer, useOnlinePlayerCount, useRuntimeReadiness } from './engine/selectors';

/** Server capacity - must match server/src/lib.rs MAX_PLAYERS */
const MAX_PLAYERS = 50;

// Graceful error boundary that logs errors but doesn't crash the app
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any; hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { error: null, hasError: false };
    }

    static getDerivedStateFromError(error: any) {
        // Log the error but don't set hasError to true - let the app continue
        const msg = error?.message ?? String(error);
        const stack = error?.stack ?? '(no stack)';
        console.error('[AppErrorBoundary] Error caught:', msg, '\nStack:', stack);
        return { error, hasError: false }; // Don't show error UI, just log it
    }

    componentDidCatch(error: any, info: React.ErrorInfo) {
        const msg = error?.message ?? String(error);
        const stack = error?.stack ?? '(no stack)';
        console.error('[AppErrorBoundary] Detailed error:', { message: msg, stack, componentStack: info?.componentStack });
        // Optionally send to error tracking service here
    }

    render() {
        // Always render children - errors are logged but don't crash the app
        return this.props.children;
    }
}

function AppContent() {
    // --- Global Auth Error Handler ---
    useAuthErrorHandler(); // This will automatically handle 401 errors and invalidate tokens
    
    // --- Auth Hook ---
    const { 
        userProfile, 
        isAuthenticated, 
        isLoading: authLoading, 
        loginRedirect,
        spacetimeToken
    } = useAuth();
    
    // --- Core Hooks --- 
    const {
        connection,
        dbIdentity, // Get the derived SpacetimeDB identity
        isConnected: spacetimeConnected, // Rename for clarity
        isLoading: spacetimeLoading, // Rename for clarity
        error: connectionError,
        registerPlayer,
        retryConnection,
    } = useGameConnection();
    useRuntimeBootstrap(connection, dbIdentity ? dbIdentity.toHexString() : null);
    useRuntimeConnectionBridge({
        connection,
        identityHex: dbIdentity ? dbIdentity.toHexString() : null,
        connected: Boolean(spacetimeConnected),
        loading: Boolean(authLoading || spacetimeLoading),
    });

    const [placementState, placementActions] = usePlacementManager(connection);
    const { placementInfo, placementError, placementWarning } = placementState; // Destructure state
    const { cancelPlacement, startPlacement, setPlacementWarning } = placementActions; // Destructure actions
    const { showError } = useErrorDisplay();
    
    // Asset preloading (extracted to hook)
    const { assetProgress, assetsLoaded } = useAssetPreload();
    const { grassEnabled } = useSettings();

    // --- useSpacetimeTables: writer only (subscription setup); consumers read via selectors ---
    useSpacetimeTables({
        connection,
        cancelPlacement: placementActions.cancelPlacement,
        grassEnabled,
    });

    // --- Selectors: read-only derived state from engine store ---
    const identityHex = dbIdentity ? dbIdentity.toHexString() : null;
    const localPlayer = useLocalPlayer(identityHex);
    const onlinePlayerCount = useOnlinePlayerCount();
    const { localPlayerRegistered, loggedInPlayer } = useRuntimeReadiness(identityHex);

    useRuntimeViewport({
        localPlayer,
        onRespawn: () => {
            console.log('[App] Respawn detected - resetting overlay states');
            resetBrothEffectsState();
            resetInsanityState();
        },
    });
    
    // --- SOVA Sound Box Hook (for deterministic SOVA voice notifications) ---
    const { showSovaSoundBox, hideSovaSoundBox, revealSovaSoundBoxUI, SovaSoundBoxComponent } = useSovaSoundBox();

    // --- Sound & Music Systems (selector-backed) ---
    const musicSystem = useMusicSystemWithSelectors(connection, identityHex);

    // Performance monitor removed - all logging was disabled and the recursive RAF loop
    // was still consuming CPU cycles. It also restarted on players.size/connection changes,
    // creating orphaned loops (no cleanup was implemented despite using requestAnimationFrame).
    // Re-enable via browser DevTools Performance tab when profiling is needed.

    // Note: Movement is now handled entirely by usePredictedMovement hook
    // No need for complex movement processing in App.tsx anymore

    useAppPlacementShellEffects({
        placementInfo,
        placementWarning,
        placementError,
        showError,
    });

    const { handleAttemptRegisterPlayer } = useAppGameplayRegistration({
        registerPlayer,
        isAuthenticated,
        spacetimeConnected,
        spacetimeToken,
        connection,
        dbIdentity,
        spacetimeLoading,
        localPlayerRegistered,
        loggedInPlayer,
    });

    const {
        storedUsername,
        isSpacetimeReady,
        shouldShowLoadingScreen,
        handleSequenceComplete,
    } = useAppLoadingScreenFlow({
        connectionError,
        isAuthenticated,
        dbIdentity,
        loggedInPlayer,
        authLoading,
        spacetimeLoading,
        connection,
        musicSystem,
        revealSovaSoundBoxUI,
    });

    // --- Render Logic ---
    return (
        <div className="App" style={{ backgroundColor: '#111' }}>
            {/* Show loading screen only when needed */} 
            {shouldShowLoadingScreen && (
                <CyberpunkLoadingScreen 
                    authLoading={authLoading}
                    spacetimeLoading={spacetimeLoading}
                    onSequenceComplete={handleSequenceComplete}
                    hasSeenSovaIntro={loggedInPlayer?.seenTutorialIds?.includes('crashIntro')}
                    musicPreloadProgress={musicSystem.preloadProgress}
                    musicPreloadComplete={musicSystem.preloadProgress >= 1 && !musicSystem.isLoading}
                    assetProgress={assetProgress}
                    assetsLoaded={assetsLoaded}
                    showSovaSoundBox={showSovaSoundBox}
                    hideSovaSoundBox={hideSovaSoundBox}
                    hasStoredUsername={!!storedUsername}
                    hasLastKnownPlayer={typeof localStorage !== 'undefined' && !!localStorage.getItem('lastKnownPlayerInfo')}
                />
            )}

            {/* Conditional Rendering: Login vs Game (only if not showing loading screen) */}
            {!shouldShowLoadingScreen && !isAuthenticated && (
                 <LoginScreen
                    handleJoinGame={loginRedirect} // Correctly pass loginRedirect
                    loggedInPlayer={null}
                    connectionError={connectionError}
                    isSpacetimeConnected={spacetimeConnected}
                    isSpacetimeReady={isSpacetimeReady}
                    retryConnection={retryConnection}
                    onlinePlayerCount={onlinePlayerCount}
                    maxPlayerCount={MAX_PLAYERS}
                 />
            )}

            {/* If authenticated but not yet registered/connected to game */}
            {!shouldShowLoadingScreen && isAuthenticated && !localPlayerRegistered && (
                 <LoginScreen 
                    handleJoinGame={handleAttemptRegisterPlayer} // Pass the updated handler
                    loggedInPlayer={loggedInPlayer}
                    connectionError={connectionError}
                    storedUsername={storedUsername}
                    isSpacetimeConnected={spacetimeConnected}
                    isSpacetimeReady={isSpacetimeReady}
                    retryConnection={retryConnection}
                    onlinePlayerCount={onlinePlayerCount}
                    maxPlayerCount={MAX_PLAYERS}
                 />
            )}
            
            {/* If authenticated AND registered/game ready */}
            {!shouldShowLoadingScreen && isAuthenticated && localPlayerRegistered && loggedInPlayer && (
                (() => { 
                    const localPlayerIdentityHex = dbIdentity ? dbIdentity.toHexString() : undefined;
                    return (
                        <>
                        <GameplayRuntimeBridge 
                            localPlayerId={localPlayerIdentityHex}
                            playerIdentity={dbIdentity} 
                            connection={connection}
                            placementInfo={placementInfo}
                            placementActions={placementActions}
                            placementError={placementError}
                            setPlacementWarning={setPlacementWarning}
                            startPlacement={startPlacement}
                            cancelPlacement={cancelPlacement}
                            musicSystem={musicSystem}
                            showSovaSoundBox={showSovaSoundBox}
                        />
                        {/* SOVA Sound Box - Deterministic voice notifications */}
                        {SovaSoundBoxComponent}
                        </>
                    );
                })()
            )}
        </div>
    );
}

// Wrap the app with our context providers
function App() {
    return (
        <AuthProvider>
            <GameContextsProvider>
                <DebugProvider>
                    <Router>
                        <Routes>
                            <Route path="/" element={<AppErrorBoundary><AppContent /></AppErrorBoundary>} />
                            <Route path="/blog" element={<BlogPage />} />
                            <Route path="/blog/:slug" element={<BlogPostPage />} />
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="/terms" element={<TermsPage />} />
                            <Route path="/cookies" element={<CookiesPage />} />
                            <Route path="/ai-disclosure" element={<AIDisclosurePage />} />
                        </Routes>
                    </Router>
                </DebugProvider>
            </GameContextsProvider>
        </AuthProvider>
    );
}
export default App;