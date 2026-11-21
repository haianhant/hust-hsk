// ---------------------------------------------------------------------------
// features/boardgame/domain/projections.ts — Tách bạch tuyệt đối kênh Công khai
// và kênh Riêng tư (P0 isolation) cho Bóng Đêm KTX v4.
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_CATALOG_VERSION,
  BOARD_GAME_CHOICE_TIMEOUT_MS,
  BOARD_GAME_DEFAULT_RULESET_ID,
  type BoardGameCardPublicMeta,
  type BoardGameClairvoyantRevealView,
  type BoardGamePrivateGameView,
  type BoardGamePrivatePendingChoice,
  type BoardGamePublicAllianceView,
  type BoardGamePublicControlledTurnView,
  type BoardGamePublicGameView,
  type BoardGamePublicPendingChoice,
  type BoardGamePublicPlayerView,
} from '../../../shared/contracts/boardgame';
import { getCardById, toCardPublicMeta } from './cards';
import {
  getEffectiveFaction,
  getPlayerAlliance,
  listAlliances,
} from './dynamic-allegiance';
import {
  getCopiedSkillBinding,
  getEffectiveSkillRoleId,
} from './dynamic-skill-copy';
import {
  getPlayerLifecycleState,
  isPlayerFinallyEliminated,
} from './pending-resurrection';
import { getRoleDesign } from './roles';
import { DEFAULT_CLUSTER_PAIRS } from './rules';
import {
  getActiveTurnControlGrant,
  isTurnControlPausedForOwnerDecision,
} from './turn-ownership';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';
import { projectPublicVisualEvents } from './visual-events';

function mapCardIdsToMeta(cardIds: readonly string[]): BoardGameCardPublicMeta[] {
  const metas: BoardGameCardPublicMeta[] = [];
  for (const id of cardIds) {
    const card = getCardById(id);
    if (card) metas.push(toCardPublicMeta(card));
  }
  return metas;
}

export function getPublicPlayerView(
  player: AuthoritativePlayerState,
  matchFinished: boolean,
  state?: AuthoritativeGameState,
): BoardGamePublicPlayerView {
  const showRole = player.revealed || matchFinished;
  const isExpanded = Boolean(state?.rulesetId && state.rulesetId !== 'classic');

  const lifecycleState =
    isExpanded && state ? getPlayerLifecycleState(state, player) : undefined;
  const effectiveFaction =
    isExpanded && state && showRole ? getEffectiveFaction(state, player) : undefined;
  const copiedBinding =
    isExpanded && state && showRole ? getCopiedSkillBinding(state, player.playerId) : null;
  const alliance =
    isExpanded && state && showRole ? getPlayerAlliance(state, player.playerId) : null;

  return {
    playerId: player.playerId,
    displayName: player.displayName,
    seatIndex: player.seatIndex,
    location: player.location,
    woundsTaken: player.woundsTaken,
    handCount: player.hand.length,
    equipped: mapCardIdsToMeta(player.equipped),
    attacksMade: player.attacksMade,
    attacksThisTurn: player.attacksThisTurn ?? 0,
    lastAttackTargetId: player.lastAttackTargetId ?? null,
    investigationsCount: player.investigationsCount,
    guardianShieldActive: player.guardianShieldActive,
    alive: player.alive,
    connected: player.connected,
    revealedRoleId: showRole ? player.roleId : null,
    revealedFaction: showRole ? player.faction : null,
    revealedMaxHp: showRole ? player.maxHp : null,
    revealedSkillCooldown: showRole ? player.skillCooldown : 0,
    revealedSkillUsedOnce: showRole ? player.skillUsedOnce : false,
    ...(lifecycleState && lifecycleState !== 'ALIVE' ? { lifecycleState } : {}),
    ...(effectiveFaction && effectiveFaction !== player.faction ? { effectiveFaction } : {}),
    ...(copiedBinding ? { copiedSkillRoleId: copiedBinding.effectiveSkillRoleId } : {}),
    ...(alliance ? { allianceId: alliance.allianceId } : {}),
    appearance: player.appearance,
  };
}

export function getPublicGameView(state: AuthoritativeGameState): BoardGamePublicGameView {
  const isExpanded = Boolean(state.rulesetId && state.rulesetId !== 'classic');
  const orderedPlayers = state.turnOrder
    .map((pid) => state.players[pid])
    .filter((p): p is AuthoritativePlayerState => Boolean(p))
    .map((player) => getPublicPlayerView(player, state.finished, state));
  const deadCount = isExpanded
    ? Object.values(state.players).filter((p) => isPlayerFinallyEliminated(state, p)).length
    : Object.values(state.players).filter((p) => !p.alive).length;

  const publicPendingChoice: BoardGamePublicPendingChoice | null = state.pendingChoice
    ? {
        choiceId: state.pendingChoice.choiceId,
        isSecret: state.pendingChoice.isSecret,
        // BẢO MẬT P0: Tuyệt đối KHÔNG lộ chủ sở hữu hay loại phản ứng bí mật cho bàn công khai / Spectator!
        ownerPlayerId: state.pendingChoice.isSecret ? null : state.pendingChoice.ownerPlayerId,
        kind: state.pendingChoice.isSecret ? null : state.pendingChoice.kind,
        promptLabel: state.pendingChoice.publicPromptLabel,
        // Phase 6A Privacy Hardening: chuẩn hóa deadlineMs công khai cho secret choice để không lộ trạng thái rớt mạng!
        deadlineMs: state.pendingChoice.isSecret
          ? (state.pendingChoice.publicDeadlineMs ??
              state.pendingChoice.createdAtMs +
                (state.expansionState?.choiceTimeoutMs ?? BOARD_GAME_CHOICE_TIMEOUT_MS))
          : state.pendingChoice.deadlineMs,
      }
    : null;

  const visionsMarkedTargetByPlayer: Record<string, string> = {};
  if (state.expansionState?.visionsMarks) {
    for (const [visionsId, mark] of Object.entries(state.expansionState.visionsMarks)) {
      const owner = state.players[visionsId];
      const victim = state.players[mark.targetPlayerId];
      if (owner && (owner.revealed || state.finished) && victim && victim.alive) {
        visionsMarkedTargetByPlayer[visionsId] = mark.targetPlayerId;
      }
    }
  }

  // BẢO MẬT P0: Chỉ xuất hào quang công khai của các nhân vật ĐÃ LỘ DIỆN (tuyệt đối không lộ vai ẩn!).
  const angelProtectedPlayerIds: string[] = [];
  if (state.expansionState?.angelAuras) {
    const hasActiveRevealedAngel = Object.entries(state.expansionState.angelAuras).some(
      ([angelId, aura]) => {
        const owner = state.players[angelId];
        return Boolean(owner && owner.alive && owner.revealed && aura.phase === 'active');
      },
    );
    if (hasActiveRevealedAngel) {
      for (const pid of state.turnOrder) {
        const p = state.players[pid];
        if (p && p.alive && p.revealed && getEffectiveFaction(state, p) === 'wanderer') {
          angelProtectedPlayerIds.push(p.playerId);
        }
      }
    }
  }

  const usurperAuraActive = Object.values(state.players).some(
    (p) => p.alive && p.revealed && (getEffectiveSkillRoleId(state, p) as string) === 'exp2_usurper',
  );

  const daltonActivatedPlayerIds: string[] = [];
  if (state.expansionState?.daltonActivatedByPlayer) {
    for (const daltonId of Object.keys(state.expansionState.daltonActivatedByPlayer)) {
      const owner = state.players[daltonId];
      if (owner && (owner.revealed || state.finished)) {
        daltonActivatedPlayerIds.push(daltonId);
      }
    }
  }

  // Phase 6A/6B: Các huy hiệu công khai CHỈ được xuất khi chủ sở hữu ĐÃ LỘ DIỆN (zero hidden role leak!)
  const anathemaCursedTargetByPlayer: Record<string, string> = {};
  if (state.expansionState?.anathemaCurses) {
    for (const [anathemaId, curse] of Object.entries(state.expansionState.anathemaCurses)) {
      const owner = state.players[anathemaId];
      const victim = state.players[curse.targetPlayerId];
      if (curse.active && owner && (owner.revealed || state.finished) && victim && victim.alive) {
        anathemaCursedTargetByPlayer[anathemaId] = curse.targetPlayerId;
      }
    }
  }

  const bethanyChosenTargetByPlayer: Record<string, string> = {};
  if (state.expansionState?.bethanyChosenByPlayer) {
    for (const [bethanyId, chosen] of Object.entries(state.expansionState.bethanyChosenByPlayer)) {
      const owner = state.players[bethanyId];
      if (owner && (owner.revealed || state.finished) && state.players[chosen.chosenPlayerId]) {
        bethanyChosenTargetByPlayer[bethanyId] = chosen.chosenPlayerId;
      }
    }
  }

  const dianaActiveCustomerByPlayer: Record<string, string> = {};
  if (state.expansionState?.dianaContracts) {
    for (const [dianaId, contract] of Object.entries(state.expansionState.dianaContracts)) {
      const owner = state.players[dianaId];
      // BẢO MẬT P0: Chỉ xuất khi hợp đồng đã `active` (và Diana đã lộ diện) — tuyệt đối KHÔNG lộ trạng thái `pending`!
      if (
        contract.status === 'active' &&
        owner &&
        (owner.revealed || state.finished) &&
        state.players[contract.customerPlayerId]
      ) {
        dianaActiveCustomerByPlayer[dianaId] = contract.customerPlayerId;
      }
    }
  }

  const aaronSpouseByPlayer: Record<string, string> = {};
  if (state.expansionState?.aaronSpouseByPlayer) {
    for (const [aaronId, spouse] of Object.entries(state.expansionState.aaronSpouseByPlayer)) {
      const owner = state.players[aaronId];
      if (owner && (owner.revealed || state.finished) && state.players[spouse.spousePlayerId]) {
        aaronSpouseByPlayer[aaronId] = spouse.spousePlayerId;
      }
    }
  }

  const aprilSkippsCountdownByPlayer: Record<string, number> = {};
  if (state.expansionState?.aprilSkippsCountdownByPlayer) {
    for (const [aprilId, entry] of Object.entries(state.expansionState.aprilSkippsCountdownByPlayer)) {
      const owner = state.players[aprilId];
      if (entry.revealedBySkill && owner && (owner.revealed || state.finished)) {
        aprilSkippsCountdownByPlayer[aprilId] = entry.triggeredOnTurnNumber;
      }
    }
  }

  // Phase 7A: Chỉ báo lượt bị chiếm quyền (Voodoo — CHỈ xuất lá Trắng/Đen công khai, TUYỆT ĐỐI không xuất `inv-*`!)
  let controlledTurn: BoardGamePublicControlledTurnView | undefined;
  const activeGrant = isExpanded ? getActiveTurnControlGrant(state) : null;
  if (activeGrant) {
    const safePublicCardIds = activeGrant.publicDrawnCardIds.filter((cid) => !cid.startsWith('inv-'));
    controlledTurn = {
      controlGrantId: activeGrant.controlGrantId,
      activePlayerId: activeGrant.activePlayerId,
      controllerPlayerId: activeGrant.controllerPlayerId,
      pausedForOwnerDecision: isTurnControlPausedForOwnerDecision(state, activeGrant),
      publicDrawnCards: mapCardIdsToMeta(safePublicCardIds),
    };
  }

  // Phase 7A: Huy hiệu Cain công khai (CHỈ xuất cho người đã lộ diện hoặc FINISHED)
  const cainDeathModifierActivePlayerIds: string[] = [];
  if (isExpanded && state.expansionState?.cainDeathVictoryModifierIds) {
    for (const pid of state.expansionState.cainDeathVictoryModifierIds) {
      const owner = state.players[pid];
      if (owner && (owner.revealed || state.finished)) {
        cainDeathModifierActivePlayerIds.push(pid);
      }
    }
  }

  // Phase 7A: Liên minh N.C. Soldier công khai (CHỈ xuất các thành viên đã lộ diện hoặc FINISHED)
  const publicAlliances: BoardGamePublicAllianceView[] = [];
  if (isExpanded) {
    for (const grp of listAlliances(state)) {
      const visibleMembers = grp.memberPlayerIds.filter((mid) => {
        const m = state.players[mid];
        return Boolean(m && (m.revealed || state.finished));
      });
      if (visibleMembers.length > 0) {
        publicAlliances.push({
          allianceId: grp.allianceId,
          leaderPlayerId: grp.leaderPlayerId,
          memberPlayerIds: visibleMembers,
        });
      }
    }
  }

  const publicVisualEvents = projectPublicVisualEvents(state);
  return {
    rulesetVersion: 4,
    rulesetId: state.rulesetId ?? BOARD_GAME_DEFAULT_RULESET_ID,
    catalogVersion: state.catalogVersion ?? BOARD_GAME_CATALOG_VERSION,
    matchId: state.matchId,
    round: state.round,
    maxRounds: state.maxRounds,
    turnNumber: state.turnNumber,
    turnPhase: state.turnPhase,
    activePlayerId: state.activePlayerId,
    turnOrder: [...state.turnOrder],
    clusterPairs: state.clusterPairs ?? DEFAULT_CLUSTER_PAIRS,
    ...(state.allowedMoveDestinations ? { allowedMoveDestinations: [...state.allowedMoveDestinations] } : {}),
    ...(publicPendingChoice ? { pendingChoice: publicPendingChoice } : {}),
    ...(Object.keys(visionsMarkedTargetByPlayer).length > 0
      ? { visionsMarkedTargetByPlayer }
      : {}),
    ...(angelProtectedPlayerIds.length > 0 ? { angelProtectedPlayerIds } : {}),
    ...(usurperAuraActive ? { usurperAuraActive: true } : {}),
    ...(daltonActivatedPlayerIds.length > 0 ? { daltonActivatedPlayerIds } : {}),
    ...(Object.keys(anathemaCursedTargetByPlayer).length > 0
      ? { anathemaCursedTargetByPlayer }
      : {}),
    ...(Object.keys(bethanyChosenTargetByPlayer).length > 0
      ? { bethanyChosenTargetByPlayer }
      : {}),
    ...(Object.keys(dianaActiveCustomerByPlayer).length > 0
      ? { dianaActiveCustomerByPlayer }
      : {}),
    ...(Object.keys(aaronSpouseByPlayer).length > 0 ? { aaronSpouseByPlayer } : {}),
    ...(Object.keys(aprilSkippsCountdownByPlayer).length > 0
      ? { aprilSkippsCountdownByPlayer }
      : {}),
    ...(controlledTurn ? { controlledTurn } : {}),
    ...(cainDeathModifierActivePlayerIds.length > 0
      ? { cainDeathModifierActivePlayerIds }
      : {}),
    ...(publicAlliances.length > 0 ? { alliances: publicAlliances } : {}),
    deadCount,
    players: orderedPlayers,
    deckCounts: {
      investigation: state.decks.investigation.length,
      equipment: state.decks.equipment.length,
      event: state.decks.event.length,
    },
    lastDiceRoll: state.lastDiceRoll,
    lastInvestigation: state.lastInvestigation,
    lastRevealEvent: state.lastRevealEvent,
    ...(publicVisualEvents ? { visualEvents: publicVisualEvents } : {}),
    publicLog: [...state.publicLog],
    highlights: [...state.highlights],
    winnerLabel: state.winnerLabel,
    winnerFaction: state.winnerFaction,
    ...(isExpanded && state.finished && state.winningFactions && state.winningFactions.length > 0
      ? { winningFactions: [...state.winningFactions] }
      : {}),
    winnerPlayerIds: [...state.winnerPlayerIds],
    winReason: state.winReason
      ? state.winReason
          .replace('(Đạt "Cảm Tử")', '(Daniel)')
          .replace('(Trang "Kiên Cường")', '(Allie)')
      : null,
    finalReveal: state.finished ? state.finalReveal : null,
  };
}

export function getPrivateGameView(
  state: AuthoritativeGameState,
  playerId: string,
): BoardGamePrivateGameView | null {
  const player = state.players[playerId];
  if (!player) return null;
  const role = getRoleDesign(player.roleId);
  const protege =
    player.protegePlayerId ? state.players[player.protegePlayerId] ?? null : null;

  const privatePendingChoice: BoardGamePrivatePendingChoice | null =
    state.pendingChoice && state.pendingChoice.ownerPlayerId === player.playerId
      ? {
          choiceId: state.pendingChoice.choiceId,
          kind: state.pendingChoice.kind,
          title: state.pendingChoice.title,
          description: state.pendingChoice.description,
          options: state.pendingChoice.options.map((opt) => ({
            ...opt,
            ...(opt.card ? { card: { ...opt.card } } : {}),
            ...(opt.roll ? { roll: { ...opt.roll } } : {}),
          })),
          defaultOptionId: state.pendingChoice.defaultOptionId,
          deadlineMs: state.pendingChoice.deadlineMs,
          isSecret: state.pendingChoice.isSecret,
        }
      : null;

  const isExpanded = Boolean(state.rulesetId && state.rulesetId !== 'classic');
  const reactionPolicy = isExpanded
    ? (state.expansionState?.reactionPolicyByPlayer?.[player.playerId] ?? 'ASK')
    : undefined;

  // BẢO MẬT P0: Chỉ chiếu kết quả soi vai Clairvoyant & mục tiêu sao chép cho ĐÚNG chủ sở hữu!
  let clairvoyantReveals: BoardGameClairvoyantRevealView[] | undefined;
  const vision = state.expansionState?.clairvoyantVisions?.[player.playerId];
  if (vision) {
    clairvoyantReveals = [
      {
        targetPlayerId: vision.targetPlayerId,
        targetDisplayName: vision.targetDisplayName,
        roleId: vision.sourceRoleId,
        roleName: vision.roleName,
        faction: vision.faction,
        maxHp: vision.maxHp,
        copiedGoalSummary: vision.copiedGoalSummary,
        atMs: vision.boundAtMs,
      },
    ];
  }

  let copiedVictoryGoalSummary: string | null | undefined;
  if (vision) {
    copiedVictoryGoalSummary = `Sao chép mục tiêu của ${vision.targetDisplayName} (${vision.roleName}): ${vision.copiedGoalSummary}`;
  } else if (state.expansionState?.cassieCopiedGoalByPlayer?.[player.playerId]) {
    const cassieBind = state.expansionState.cassieCopiedGoalByPlayer[player.playerId];
    const copiedDesign = getRoleDesign(cassieBind.sourceRoleId as Parameters<typeof getRoleDesign>[0]);
    const boundPlayer = state.players[cassieBind.targetPlayerId];
    copiedVictoryGoalSummary = `Sao chép mục tiêu của ${boundPlayer?.displayName ?? cassieBind.targetPlayerId} (${copiedDesign.name}): ${copiedDesign.secretGoalText}`;
  } else if (state.expansionState?.antimonyCopiedGoalByPlayer?.[player.playerId]) {
    const antiBind = state.expansionState.antimonyCopiedGoalByPlayer[player.playerId];
    const copiedDesign = getRoleDesign(antiBind.sourceRoleId as Parameters<typeof getRoleDesign>[0]);
    const boundPlayer = state.players[antiBind.targetPlayerId];
    copiedVictoryGoalSummary = `Nhân Bản — Sao chép mục tiêu của ${boundPlayer?.displayName ?? antiBind.targetPlayerId} (${copiedDesign.name}): ${copiedDesign.secretGoalText}`;
  } else if (state.expansionState?.dianaContracts?.[player.playerId]) {
    const contract = state.expansionState.dianaContracts[player.playerId];
    const custName = state.players[contract.customerPlayerId]?.displayName ?? contract.customerPlayerId;
    copiedVictoryGoalSummary =
      contract.status === 'active'
        ? `Khách hàng đang hoạt động: ${custName} (cần sống sót & khách hàng thắng).`
        : contract.status === 'pending'
          ? `Khách hàng chờ kích hoạt vào đầu lượt kế của họ: ${custName}.`
          : 'Khách hàng đã bị loại trước khi kích hoạt — cần sống sót với đầy máu cuối trận.';
  }

  // Phase 7A: Trường mở rộng riêng tư cho CHÍNH chủ sở hữu (tuyệt đối không rò thông tin nạn nhân sang controller!)
  const effectiveFaction = isExpanded ? getEffectiveFaction(state, player) : undefined;
  const lifecycleState = isExpanded ? getPlayerLifecycleState(state, player) : undefined;
  const copiedBinding = isExpanded ? getCopiedSkillBinding(state, player.playerId) : null;
  const alliance = isExpanded ? getPlayerAlliance(state, player.playerId) : null;
  const activeGrant = isExpanded ? getActiveTurnControlGrant(state) : null;
  const isControllingActiveTurn = Boolean(
    activeGrant && activeGrant.controllerPlayerId === player.playerId,
  );
  const isTurnHijacked = Boolean(
    activeGrant && activeGrant.activePlayerId === player.playerId,
  );

  return {
    playerId: player.playerId,
    roleId: player.roleId,
    roleName: role.name,
    faction: player.faction,
    hp: player.hp,
    maxHp: player.maxHp,
    woundsTaken: player.woundsTaken,
    skillCooldown: player.skillCooldown,
    skillUsedOnce: player.skillUsedOnce,
    revealed: player.revealed,
    secretGoalText: role.secretGoalText,
    protegePlayerId: player.protegePlayerId,
    protegeDisplayName: protege ? protege.displayName : null,
    avengedProtegeKiller: player.avengedProtegeKiller,
    investigatedTargetIds: [...player.investigatedTargetIds],
    hand: mapCardIdsToMeta(player.hand),
    equipped: mapCardIdsToMeta(player.equipped),
    privateClues: [...player.privateClues],
    ...(reactionPolicy ? { reactionPolicy } : {}),
    ...(clairvoyantReveals ? { clairvoyantReveals } : {}),
    ...(copiedVictoryGoalSummary !== undefined ? { copiedVictoryGoalSummary } : {}),
    ...(effectiveFaction && effectiveFaction !== player.faction ? { effectiveFaction } : {}),
    ...(lifecycleState && lifecycleState !== 'ALIVE' ? { lifecycleState } : {}),
    ...(copiedBinding ? { copiedSkillRoleId: copiedBinding.effectiveSkillRoleId } : {}),
    ...(alliance ? { allianceId: alliance.allianceId } : {}),
    ...(isControllingActiveTurn ? { isControllingActiveTurn: true } : {}),
    ...(isTurnHijacked ? { isTurnHijacked: true } : {}),
    ...(privatePendingChoice ? { pendingChoice: privatePendingChoice } : {}),
  };
}
