import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { MenuType } from '../../components/GameMenu';
import type { GameUIContextValue, InterfaceView } from '../../contexts/GameUIContext';
import { useEngineUiState } from '../react/useEngineStoreState';
import type { AlkTab, LocalBubble, SovaLoadingState, SovaMessageAdder } from '../../hooks/useGameScreenSessionUi';

interface UseGameplaySessionRuntimeOptions {
  localPlayerId?: string;
}

export interface GameplaySessionRuntimeResult {
  currentMenu: MenuType;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onMenuNavigate: (menu: MenuType) => void;
  onMenuBack: () => void;
  showRefreshDialog: boolean;
  onRefreshConfirm: () => void;
  onRefreshCancel: () => void;
  isQuestsPanelOpen: boolean;
  onOpenQuestsPanel: () => void;
  onCloseQuestsPanel: () => void;
  isDayNightMinimized: boolean;
  onDayNightMinimizedChange: (minimized: boolean) => void;
  mobileInteractInfo: { hasTarget: boolean; label?: string } | null;
  onMobileInteractInfoChange: Dispatch<SetStateAction<{ hasTarget: boolean; label?: string } | null>>;
  mobileInteractTrigger: number;
  onMobileInteract: () => void;
  profilerCopyToast: boolean;
  onProfilerCopied: () => void;
  showInventoryState: boolean;
  setShowInventoryState: Dispatch<SetStateAction<boolean>>;
  showCraftingScreenState: boolean;
  setShowCraftingScreenState: Dispatch<SetStateAction<boolean>>;
  isMobileChatOpen: boolean;
  setIsMobileChatOpen: Dispatch<SetStateAction<boolean>>;
  alkInitialTab: AlkTab | undefined;
  setAlkInitialTab: Dispatch<SetStateAction<AlkTab | undefined>>;
  sovaMessageAdder: SovaMessageAdder | null;
  onSOVAMessageAdderReady: (addMessage: SovaMessageAdder) => void;
  localBubbles: LocalBubble[];
  onAddLocalBubble: (message: string) => void;
  sovaLoadingState: SovaLoadingState;
  onSOVALoadingStateChange: (state: SovaLoadingState) => void;
  gameUIValue: GameUIContextValue;
}

const INITIAL_SOVA_LOADING_STATE: SovaLoadingState = {
  isRecording: false,
  isTranscribing: false,
  isGeneratingResponse: false,
  isSynthesizingVoice: false,
  isPlayingAudio: false,
  transcribedText: '',
  currentPhase: 'Ready',
};

export function useGameplaySessionRuntime({
  localPlayerId,
}: UseGameplaySessionRuntimeOptions): GameplaySessionRuntimeResult {
  const [isMinimapOpen, setIsMinimapOpen] = useEngineUiState<boolean>('isMinimapOpen', () => false);
  const [interfaceInitialView, setInterfaceInitialView] = useEngineUiState<InterfaceView | undefined>('interfaceInitialView', () => undefined);
  const [isChatting, setIsChatting] = useEngineUiState<boolean>('isChatting', () => false);
  const [isCraftingSearchFocused, setIsCraftingSearchFocused] = useEngineUiState<boolean>('isCraftingSearchFocused', () => false);
  const [isMusicPanelVisible, setIsMusicPanelVisible] = useEngineUiState<boolean>('isMusicPanelVisible', () => false);
  const [currentMenu, setCurrentMenu] = useEngineUiState<MenuType>('currentMenu', () => null);
  const [showRefreshDialog, setShowRefreshDialog] = useEngineUiState<boolean>('showRefreshDialog', () => false);
  const [isQuestsPanelOpen, setIsQuestsPanelOpen] = useEngineUiState<boolean>('isQuestsPanelOpen', () => false);
  const [isDayNightMinimized, setIsDayNightMinimized] = useEngineUiState<boolean>('isDayNightMinimized', () => false);
  const [mobileInteractInfo, setMobileInteractInfo] = useEngineUiState<{ hasTarget: boolean; label?: string } | null>('mobileInteractInfo', () => null);
  const [mobileInteractTrigger, setMobileInteractTrigger] = useEngineUiState<number>('mobileInteractTrigger', () => 0);
  const [profilerCopyToast, setProfilerCopyToast] = useEngineUiState<boolean>('profilerCopyToast', () => false);
  const [showInventoryState, setShowInventoryState] = useEngineUiState<boolean>('showInventoryState', () => false);
  const [showCraftingScreenState, setShowCraftingScreenState] = useEngineUiState<boolean>('showCraftingScreenState', () => false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useEngineUiState<boolean>('isMobileChatOpen', () => false);
  const [alkInitialTab, setAlkInitialTab] = useEngineUiState<AlkTab | undefined>('alkInitialTab', () => undefined);
  const [sovaMessageAdder, setSovaMessageAdder] = useEngineUiState<SovaMessageAdder | null>('sovaMessageAdder', () => null);
  const [localBubbles, setLocalBubbles] = useEngineUiState<LocalBubble[]>('localBubbles', () => []);
  const [sovaLoadingState, setSovaLoadingState] = useEngineUiState<SovaLoadingState>('sovaLoadingState', () => INITIAL_SOVA_LOADING_STATE);

  const profilerToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localBubbleTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      if (profilerToastTimeoutRef.current) {
        clearTimeout(profilerToastTimeoutRef.current);
      }

      localBubbleTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      localBubbleTimeoutsRef.current.clear();
    };
  }, []);

  const handleOpenAchievements = useCallback(() => {
    setInterfaceInitialView('achievements');
    setIsMinimapOpen(true);
  }, [setInterfaceInitialView, setIsMinimapOpen]);

  const handleMenuOpen = useCallback(() => {
    setCurrentMenu('main');
  }, [setCurrentMenu]);

  const handleMenuClose = useCallback(() => {
    setCurrentMenu(null);
  }, [setCurrentMenu]);

  const handleMenuNavigate = useCallback((menu: MenuType) => {
    setCurrentMenu(menu);
  }, [setCurrentMenu]);

  const handleMenuBack = useCallback(() => {
    setCurrentMenu('main');
  }, [setCurrentMenu]);

  const handleRefreshConfirm = useCallback(() => {
    window.location.reload();
  }, []);

  const handleRefreshCancel = useCallback(() => {
    setShowRefreshDialog(false);
  }, [setShowRefreshDialog]);

  const handleOpenQuestsPanel = useCallback(() => {
    setIsQuestsPanelOpen(true);
  }, [setIsQuestsPanelOpen]);

  const handleCloseQuestsPanel = useCallback(() => {
    setIsQuestsPanelOpen(false);
  }, [setIsQuestsPanelOpen]);

  const handleDayNightMinimizedChange = useCallback((minimized: boolean) => {
    setIsDayNightMinimized(minimized);
  }, [setIsDayNightMinimized]);

  const handleMobileInteract = useCallback(() => {
    setMobileInteractTrigger((prev) => prev + 1);
  }, [setMobileInteractTrigger]);

  const handleProfilerCopied = useCallback(() => {
    setProfilerCopyToast(true);

    if (profilerToastTimeoutRef.current) {
      clearTimeout(profilerToastTimeoutRef.current);
    }

    profilerToastTimeoutRef.current = setTimeout(() => {
      setProfilerCopyToast(false);
      profilerToastTimeoutRef.current = null;
    }, 2000);
  }, [setProfilerCopyToast]);

  const handleSOVAMessageAdderReady = useCallback((addMessage: SovaMessageAdder) => {
    setSovaMessageAdder(() => addMessage);
  }, [setSovaMessageAdder]);

  const handleAddLocalBubble = useCallback((message: string) => {
    if (!localPlayerId) {
      return;
    }

    const bubbleId = `local-${Date.now()}-${Math.random()}`;
    const nextBubble: LocalBubble = {
      id: bubbleId,
      message,
      playerId: localPlayerId,
      timestamp: Date.now(),
    };

    setLocalBubbles((prev) => {
      const filtered = prev.filter((bubble) => bubble.playerId !== localPlayerId);
      return [...filtered, nextBubble];
    });

    const timeoutId = setTimeout(() => {
      localBubbleTimeoutsRef.current.delete(bubbleId);
      setLocalBubbles((prev) => prev.filter((bubble) => bubble.id !== bubbleId));
    }, 8000);

    const previousTimeout = localBubbleTimeoutsRef.current.get(bubbleId);
    if (previousTimeout) {
      clearTimeout(previousTimeout);
    }
    localBubbleTimeoutsRef.current.set(bubbleId, timeoutId);
  }, [localPlayerId, setLocalBubbles]);

  const handleSOVALoadingStateChange = useCallback((state: SovaLoadingState) => {
    setSovaLoadingState(state);
  }, [setSovaLoadingState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (currentMenu === null) {
          setCurrentMenu('main');
        } else if (currentMenu === 'main') {
          setCurrentMenu(null);
        } else {
          setCurrentMenu('main');
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        setShowRefreshDialog(true);
        return;
      }

      if ((event.key === 'j' || event.key === 'J') && !isChatting) {
        setIsQuestsPanelOpen((prev) => !prev);
        return;
      }

      if ((event.key === 'g' || event.key === 'G') && !isChatting) {
        event.preventDefault();
        event.stopPropagation();
        if (isMinimapOpen) {
          if (interfaceInitialView === undefined || interfaceInitialView === 'minimap') {
            setIsMinimapOpen(false);
          } else {
            setInterfaceInitialView(undefined);
          }
        } else {
          setInterfaceInitialView(undefined);
          setIsMinimapOpen(true);
        }
        return;
      }

      if ((event.key === 'y' || event.key === 'Y') && !isChatting) {
        event.preventDefault();
        if (isMinimapOpen && interfaceInitialView === 'achievements') {
          setInterfaceInitialView(undefined);
          setIsMinimapOpen(false);
        } else {
          setInterfaceInitialView('achievements');
          setIsMinimapOpen(true);
        }
        return;
      }

      if ((event.key === 'k' || event.key === 'K') && !isChatting) {
        event.preventDefault();
        if (isMinimapOpen && interfaceInitialView === 'alk') {
          setInterfaceInitialView(undefined);
          setIsMinimapOpen(false);
        } else {
          setInterfaceInitialView('alk');
          setIsMinimapOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    currentMenu,
    interfaceInitialView,
    isChatting,
    isMinimapOpen,
    setCurrentMenu,
    setInterfaceInitialView,
    setIsMinimapOpen,
    setIsQuestsPanelOpen,
    setShowRefreshDialog,
  ]);

  const gameUIValue = useMemo<GameUIContextValue>(() => ({
    isMinimapOpen,
    setIsMinimapOpen,
    interfaceInitialView,
    setInterfaceInitialView,
    isChatting,
    setIsChatting,
    isCraftingSearchFocused,
    setIsCraftingSearchFocused,
    isMusicPanelVisible,
    setIsMusicPanelVisible,
    onOpenAchievements: handleOpenAchievements,
  }), [
    handleOpenAchievements,
    interfaceInitialView,
    isChatting,
    isCraftingSearchFocused,
    isMinimapOpen,
    isMusicPanelVisible,
    setInterfaceInitialView,
    setIsChatting,
    setIsCraftingSearchFocused,
    setIsMinimapOpen,
    setIsMusicPanelVisible,
  ]);

  return {
    currentMenu,
    onMenuOpen: handleMenuOpen,
    onMenuClose: handleMenuClose,
    onMenuNavigate: handleMenuNavigate,
    onMenuBack: handleMenuBack,
    showRefreshDialog,
    onRefreshConfirm: handleRefreshConfirm,
    onRefreshCancel: handleRefreshCancel,
    isQuestsPanelOpen,
    onOpenQuestsPanel: handleOpenQuestsPanel,
    onCloseQuestsPanel: handleCloseQuestsPanel,
    isDayNightMinimized,
    onDayNightMinimizedChange: handleDayNightMinimizedChange,
    mobileInteractInfo,
    onMobileInteractInfoChange: setMobileInteractInfo,
    mobileInteractTrigger,
    onMobileInteract: handleMobileInteract,
    profilerCopyToast,
    onProfilerCopied: handleProfilerCopied,
    showInventoryState,
    setShowInventoryState,
    showCraftingScreenState,
    setShowCraftingScreenState,
    isMobileChatOpen,
    setIsMobileChatOpen,
    alkInitialTab,
    setAlkInitialTab,
    sovaMessageAdder,
    onSOVAMessageAdderReady: handleSOVAMessageAdderReady,
    localBubbles,
    onAddLocalBubble: handleAddLocalBubble,
    sovaLoadingState,
    onSOVALoadingStateChange: handleSOVALoadingStateChange,
    gameUIValue,
  };
}
