import React from 'react';
import GameMenuButton from './GameMenuButton';
import GameMenu from './GameMenu';
import ControlsMenu from './ControlsMenu';
import GameTipsMenu from './GameTipsMenu';
import GameSettingsMenu from './GameSettingsMenu';
import GameVisualSettingsMenu from './GameVisualSettingsMenu';
import type { MenuType } from './GameMenu';
import DebugPanel from './DebugPanel';
import DayNightCycleTracker from './DayNightCycleTracker';
import QuestsPanel from './QuestsPanel';
import MusicControlPanel from './MusicControlPanel';
import ErrorDisplay from './ErrorDisplay';
import AlkDeliveryPanel from './AlkDeliveryPanel';
import MobileControlBar from './MobileControlBar';
import CairnUnlockNotification, { type CairnNotification } from './CairnUnlockNotification';
import UplinkNotifications from './UplinkNotifications';
import { useGameplaySession } from '../contexts/GameplaySessionContext';
import { useGameplayInteraction } from '../contexts/GameplayInteractionContext';
import { useGameUI } from '../contexts/GameUIContext';

interface GameScreenOverlayUIProps {
  isMobile: boolean;
  localPlayer: any;
  worldState: any;
  connection: any;
  itemDefinitions: Map<string, any>;
  autoActionStates: { isAutoAttacking: boolean };
  playerIdentity: any;
  showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void;
  seenTutorialIds: readonly string[] | undefined;
  musicSystem: any;
  alkStations: Map<string, any> | undefined;
  onMatronageCreated: () => void;
  onOpenAlkBoard: (tab?: string) => void;
  cairnNotification: CairnNotification | null;
  onDismissCairnNotification: () => void;
  questCompletionNotification: any;
  onDismissQuestCompletion: () => void;
  hasNewQuestNotification: boolean;
}

export default function GameScreenOverlayUI({
  isMobile,
  localPlayer,
  worldState,
  connection,
  itemDefinitions,
  autoActionStates,
  playerIdentity,
  showSovaSoundBox,
  seenTutorialIds,
  musicSystem,
  alkStations,
  onMatronageCreated,
  onOpenAlkBoard,
  cairnNotification,
  onDismissCairnNotification,
  questCompletionNotification,
  onDismissQuestCompletion,
  hasNewQuestNotification,
}: GameScreenOverlayUIProps) {
  const gameUI = useGameUI();
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
    onMobileInteract,
    profilerCopyToast,
    isMobileChatOpen,
    setIsMobileChatOpen,
    sovaMessageAdder,
  } = useGameplaySession();
  const { interactingWith, handleSetInteractingWith } = useGameplayInteraction();

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <GameMenuButton onClick={onMenuOpen} />

      {!isMobile && autoActionStates.isAutoAttacking && (
        <div style={{ position: 'fixed', top: '70px', right: '15px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 50, pointerEvents: 'none' }}>
          <div style={{ backgroundColor: 'rgba(40, 40, 60, 0.85)', color: 'white', padding: '8px 12px', borderRadius: '4px', fontSize: '10px', fontFamily: '"Press Start 2P", cursive', fontWeight: 'normal', textAlign: 'center', border: '1px solid #a0a0c0', boxShadow: '2px 2px 0px rgba(0,0,0,0.5)', width: '140px', animation: 'pulse 2s infinite' }}>
            ⚔️ AUTO ATTACK (Z)
          </div>
        </div>
      )}

      {!isMobile && process.env.NODE_ENV === 'development' && localPlayer && (
        <DebugPanel
          localPlayer={localPlayer}
          worldState={worldState}
          connection={connection}
          itemDefinitions={itemDefinitions}
        />
      )}

      {currentMenu === 'main' && <GameMenu onClose={onMenuClose} onNavigate={onMenuNavigate} />}
      {currentMenu === 'controls' && <ControlsMenu onBack={onMenuBack} onClose={onMenuClose} />}
      {currentMenu === 'tips' && <GameTipsMenu onBack={onMenuBack} onClose={onMenuClose} />}
      {currentMenu === 'settings' && <GameSettingsMenu onBack={onMenuBack} onClose={onMenuClose} />}
      {currentMenu === 'visual_settings' && <GameVisualSettingsMenu onBack={onMenuBack} onClose={onMenuClose} />}

      {showRefreshDialog && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" }}
          onClick={onRefreshCancel}
        >
          <div
            style={{ backgroundColor: 'rgba(20, 20, 40, 0.95)', border: '2px solid #00aaff', borderRadius: '8px', padding: '24px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 0 30px rgba(0, 170, 255, 0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: '#00ddff', fontSize: '16px', marginBottom: '12px', textShadow: '0 0 10px rgba(0, 221, 255, 0.5)', fontWeight: 'bold' }}>
              NEUROVEIL™ REFRESH REQUEST
            </div>
            <div style={{ color: '#e0e0e0', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
              Your neural interface is requesting to refresh the Babachain connection.
              This will reinitialize your session with the latest quantum state synchronization.
              <br /><br />
              Proceed with Neuroveil™ Refresh?
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={onRefreshConfirm}
                style={{ background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.8), rgba(200, 100, 0, 0.9))', color: '#ffffff', border: '2px solid #ff8c00', borderRadius: '8px', padding: '15px 25px', fontFamily: '"Press Start 2P", cursive', fontSize: '12px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 0 15px rgba(255, 140, 0, 0.3), inset 0 0 10px rgba(255, 140, 0, 0.1)', textShadow: '0 0 5px currentColor', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 160, 20, 0.9), rgba(220, 120, 10, 1))';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 140, 0, 0.6), inset 0 0 15px rgba(255, 140, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 140, 0, 0.8), rgba(200, 100, 0, 0.9))';
                  e.currentTarget.style.transform = 'translateY(0px) scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 140, 0, 0.3), inset 0 0 10px rgba(255, 140, 0, 0.1)';
                }}
              >
                REFRESH NEUROVEIL™
              </button>
              <button
                onClick={onRefreshCancel}
                style={{ background: 'linear-gradient(135deg, rgba(20, 40, 80, 0.8), rgba(10, 30, 70, 0.9))', color: '#ffffff', border: '2px solid #00aaff', borderRadius: '8px', padding: '15px 25px', fontFamily: '"Press Start 2P", cursive', fontSize: '12px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 0 15px rgba(0, 170, 255, 0.3), inset 0 0 10px rgba(0, 170, 255, 0.1)', textShadow: '0 0 5px currentColor', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 50, 100, 0.9), rgba(15, 40, 90, 1))';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 170, 255, 0.6), inset 0 0 15px rgba(0, 170, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20, 40, 80, 0.8), rgba(10, 30, 70, 0.9))';
                  e.currentTarget.style.transform = 'translateY(0px) scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 170, 255, 0.3), inset 0 0 10px rgba(0, 170, 255, 0.1)';
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <DayNightCycleTracker
        isMobile={isMobile}
        onMinimizedChange={onDayNightMinimizedChange}
        localPlayerId={playerIdentity || undefined}
        onOpenQuestsPanel={onOpenQuestsPanel}
        hasNewNotification={hasNewQuestNotification}
      />

      <QuestsPanel
        isOpen={isQuestsPanelOpen}
        onClose={onCloseQuestsPanel}
        localPlayerId={playerIdentity || undefined}
        isMobile={isMobile}
        showSovaSoundBox={showSovaSoundBox}
        addSOVAMessage={sovaMessageAdder || undefined}
        seenTutorialIds={seenTutorialIds ? [...seenTutorialIds] : undefined}
      />

      {!isMobile && (
        <MusicControlPanel
          musicSystem={musicSystem}
          isVisible={gameUI.isMusicPanelVisible}
          onClose={() => gameUI.setIsMusicPanelVisible(false)}
          isDayNightMinimized={isDayNightMinimized}
        />
      )}

      <ErrorDisplay isMobile={isMobile} />

      {profilerCopyToast && (
        <div
          role="status"
          aria-live="polite"
          style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '80px', padding: '10px 18px', background: 'rgba(40, 180, 80, 0.95)', border: '1px solid rgba(80, 255, 120, 0.6)', borderRadius: '6px', color: '#ffffff', fontSize: '11px', fontFamily: '"Press Start 2P", monospace', textAlign: 'center', zIndex: 1001, boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
        >
          Copied to clipboard
        </div>
      )}

      {interactingWith?.type === 'alk_station' && alkStations && (
        <AlkDeliveryPanel
          playerIdentity={playerIdentity}
          onClose={() => handleSetInteractingWith(null)}
          stationId={Number(interactingWith.id)}
          onMatronageCreated={onMatronageCreated}
          onOpenAlkBoard={onOpenAlkBoard}
        />
      )}

      {isMobile && (
        <MobileControlBar
          onMapToggle={() => gameUI.setIsMinimapOpen((prev) => !prev)}
          onChatToggle={() => setIsMobileChatOpen((prev) => !prev)}
          onInteract={onMobileInteract}
          isMapOpen={gameUI.isMinimapOpen}
          isChatOpen={isMobileChatOpen}
          hasInteractable={mobileInteractInfo?.hasTarget || false}
          interactableLabel={mobileInteractInfo?.label}
        />
      )}

      <CairnUnlockNotification
        notification={cairnNotification}
        onDismiss={onDismissCairnNotification}
      />

      <UplinkNotifications
        questCompletionNotification={questCompletionNotification}
        onDismissQuestCompletion={onDismissQuestCompletion}
        onOpenAchievements={gameUI.onOpenAchievements}
        onOpenQuests={onOpenQuestsPanel}
      />
    </>
  );
}
