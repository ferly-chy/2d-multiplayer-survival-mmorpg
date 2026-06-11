import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Identity } from 'spacetimedb';
import { useGameConnection } from '../contexts/GameConnectionContext';
import { useLocalPlayer, useUITable, useWorldTable } from '../engine/react/selectors';

export type MatronageTab = 'overview' | 'members' | 'invitations' | 'management' | 'explore';

export function useMatronagePanelController() {
  const { connection, isConnected, dbIdentity } = useGameConnection();
  const playerIdentity = dbIdentity;
  const localPlayer = useLocalPlayer(playerIdentity?.toHexString() ?? null);
  const playerUsername = localPlayer?.username || 'Unknown';
  const matronages = useUITable<Map<string, any>>('matronages');
  const matronageMembers = useUITable<Map<string, any>>('matronageMembers');
  const matronageInvitations = useUITable<Map<string, any>>('matronageInvitations');
  const matronageOwedShards = useUITable<Map<string, any>>('matronageOwedShards');
  const players = useWorldTable<Map<string, any>>('players');

  const [activeTab, setActiveTab] = useState<MatronageTab>('overview');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [renameSuccess, setRenameSuccess] = useState(false);
  const [descriptionSuccess, setDescriptionSuccess] = useState(false);
  const [iconSuccess, setIconSuccess] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [showDissolveDialog, setShowDissolveDialog] = useState(false);
  const [playerSearchFilter, setPlayerSearchFilter] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInputFocused) return;
      if (
        e.key === 'w' || e.key === 'W' || e.key === 'a' || e.key === 'A' ||
        e.key === 's' || e.key === 'S' || e.key === 'd' || e.key === 'D' ||
        e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight'
      ) {
        e.stopPropagation();
      }
      if (
        e.key === 'y' || e.key === 'Y' || e.key === 'k' || e.key === 'K' ||
        e.key === 'g' || e.key === 'G' ||
        e.key === 'e' || e.key === 'E' || e.key === 'r' || e.key === 'R' ||
        e.key === 'f' || e.key === 'F' || e.key === 'q' || e.key === 'Q' ||
        e.key === 'Tab'
      ) {
        e.stopPropagation();
      }
      if (e.key === ' ') {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isInputFocused]);

  const playerMembership = useMemo(() => {
    if (!playerIdentity) return null;
    return matronageMembers.get(playerIdentity.toHexString()) || null;
  }, [playerIdentity, matronageMembers]);

  const playerMatronage = useMemo(() => {
    if (!playerMembership) return null;
    return Array.from(matronages.values()).find((m: any) => m.id?.toString() === playerMembership.matronageId?.toString()) || null;
  }, [playerMembership, matronages]);

  const isPraMatron = useMemo(() => playerMembership?.role?.tag === 'PraMatron', [playerMembership]);

  const matronageAllMembers = useMemo(() => {
    if (!playerMatronage) return [];
    const matronageId = playerMatronage.id?.toString();
    return Array.from(matronageMembers.values()).filter((m: any) => m.matronageId?.toString() === matronageId);
  }, [playerMatronage, matronageMembers]);

  const owedShards = useMemo(() => {
    if (!playerIdentity) return 0n;
    const owed = matronageOwedShards.get(playerIdentity.toHexString());
    return owed?.owedBalance ?? 0n;
  }, [playerIdentity, matronageOwedShards]);

  const pendingInvitations = useMemo(() => {
    const usernameLower = playerUsername.toLowerCase();
    return Array.from(matronageInvitations.values()).filter((inv: any) => inv.targetUsername?.toLowerCase() === usernameLower);
  }, [playerUsername, matronageInvitations]);

  const invitablePlayers = useMemo(() => {
    const memberIdentities = new Set(matronageAllMembers.map((m: any) => m.playerId?.toHexString()));
    const pendingInviteUsernames = new Set(
      Array.from(matronageInvitations.values())
        .filter((inv: any) => inv.matronageId?.toString() === playerMatronage?.id?.toString())
        .map((inv: any) => inv.targetUsername?.toLowerCase()),
    );

    return Array.from(players.values())
      .filter((p: any) => {
        if (memberIdentities.has(p.identity?.toHexString())) return false;
        if (pendingInviteUsernames.has(p.username?.toLowerCase())) return false;
        if (playerSearchFilter) {
          return p.username?.toLowerCase().includes(playerSearchFilter.toLowerCase());
        }
        return true;
      })
      .sort((a: any, b: any) => a.username?.localeCompare(b.username));
  }, [players, matronageAllMembers, matronageInvitations, playerMatronage, playerSearchFilter]);

  const allMatronagesWithInfo = useMemo(
    () =>
      Array.from(matronages.values())
        .map((m: any) => ({
          ...m,
          memberCount: Array.from(matronageMembers.values()).filter((member: any) => member.matronageId?.toString() === m.id?.toString()).length,
        }))
        .sort((a, b) => b.memberCount - a.memberCount),
    [matronages, matronageMembers],
  );

  const getUsernameForIdentity = useCallback((identity: any): string => {
    const identityStr = identity?.toHexString?.() || identity?.toString?.() || '';
    const player = Array.from(players.values()).find(
      (p: any) => p.identity?.toHexString?.() === identityStr || p.identity?.toString?.() === identityStr,
    );
    return player?.username || `${identityStr.substring(0, 8)}...`;
  }, [players]);

  const getMatronageNameForInvitation = useCallback((matronageId: any): string => {
    const idStr = matronageId?.toString();
    const matronage = Array.from(matronages.values()).find((m: any) => m.id?.toString() === idStr);
    return matronage?.name || 'Unknown Matronage';
  }, [matronages]);

  const runAction = useCallback(async (action: () => Promise<void>, errorMessage: string) => {
    if (!connection || !isConnected) return false;
    setIsLoading(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e: any) {
      setError(e.message || errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [connection, isConnected]);

  const handleWithdrawShards = useCallback(async () => {
    await runAction(() => connection!.reducers.withdrawMatronageShards({}), 'Failed to withdraw shards');
  }, [connection, runAction]);

  const handleAcceptInvitation = useCallback(async (invitationId: bigint) => {
    await runAction(() => connection!.reducers.acceptMatronageInvitation({ invitationId }), 'Failed to accept invitation');
  }, [connection, runAction]);

  const handleDeclineInvitation = useCallback(async (invitationId: bigint) => {
    await runAction(() => connection!.reducers.declineMatronageInvitation({ invitationId }), 'Failed to decline invitation');
  }, [connection, runAction]);

  const handleInvitePlayer = useCallback(async (username?: string) => {
    const targetUsername = username || playerSearchFilter.trim();
    if (!targetUsername) return;
    const success = await runAction(() => connection!.reducers.inviteToMatronage({ targetUsername }), 'Failed to invite player');
    if (!success) return;
    if (!username) {
      setPlayerSearchFilter('');
    }
    setInviteSuccess(targetUsername);
    window.setTimeout(() => setInviteSuccess(null), 2000);
  }, [connection, playerSearchFilter, runAction]);

  const handleRemoveMember = useCallback(async (targetIdentity: Identity) => {
    await runAction(() => connection!.reducers.removeFromMatronage({ targetPlayerId: targetIdentity }), 'Failed to remove member');
  }, [connection, runAction]);

  const handlePromoteToPraMatron = useCallback(async (targetIdentity: Identity) => {
    await runAction(() => connection!.reducers.promoteToPraMatron({ targetPlayerId: targetIdentity }), 'Failed to promote member');
  }, [connection, runAction]);

  const handleRenameMatronage = useCallback(async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const success = await runAction(() => connection!.reducers.renameMatronage({ newName: trimmedName }), 'Failed to rename matronage');
    if (!success) return;
    setNewName('');
    setRenameSuccess(true);
    window.setTimeout(() => setRenameSuccess(false), 2000);
  }, [connection, newName, runAction]);

  const handleUpdateDescription = useCallback(async () => {
    const success = await runAction(
      () => connection!.reducers.updateMatronageDescription({ newDescription: newDescription.trim() }),
      'Failed to update description',
    );
    if (!success) return;
    setDescriptionSuccess(true);
    window.setTimeout(() => setDescriptionSuccess(false), 2000);
  }, [connection, newDescription, runAction]);

  const handleUpdateIcon = useCallback(async (iconId: string) => {
    const success = await runAction(() => connection!.reducers.updateMatronageIcon({ newIcon: iconId }), 'Failed to update icon');
    if (!success) return;
    setSelectedIcon(iconId);
    setIconSuccess(true);
    window.setTimeout(() => setIconSuccess(false), 2000);
  }, [connection, runAction]);

  const handleLeaveMatronage = useCallback(async () => {
    await runAction(() => connection!.reducers.leaveMatronage({}), 'Failed to leave matronage');
  }, [connection, runAction]);

  const handleDissolveMatronage = useCallback(async () => {
    setShowDissolveDialog(false);
    await runAction(() => connection!.reducers.dissolveMatronage({}), 'Failed to dissolve matronage');
  }, [connection, runAction]);

  useEffect(() => {
    if (!playerMatronage) return;
    setSelectedIcon(playerMatronage.icon || 'fa-users');
    setNewDescription(playerMatronage.description || '');
  }, [playerMatronage]);

  return {
    playerIdentity: playerIdentity as Identity | null,
    playerUsername,
    matronages,
    activeTab,
    setActiveTab,
    newName,
    setNewName,
    newDescription,
    setNewDescription,
    selectedIcon,
    setSelectedIcon,
    isLoading,
    error,
    setError,
    isInputFocused,
    setIsInputFocused,
    renameSuccess,
    descriptionSuccess,
    iconSuccess,
    inviteSuccess,
    showDissolveDialog,
    setShowDissolveDialog,
    playerSearchFilter,
    setPlayerSearchFilter,
    playerMatronage,
    isPraMatron,
    matronageAllMembers,
    owedShards,
    pendingInvitations,
    invitablePlayers,
    allMatronagesWithInfo,
    getUsernameForIdentity,
    getMatronageNameForInvitation,
    handleWithdrawShards,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleInvitePlayer,
    handleRemoveMember,
    handlePromoteToPraMatron,
    handleRenameMatronage,
    handleUpdateDescription,
    handleUpdateIcon,
    handleLeaveMatronage,
    handleDissolveMatronage,
  };
}
