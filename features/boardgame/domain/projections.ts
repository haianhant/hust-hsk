// ---------------------------------------------------------------------------
// features/boardgame/domain/projections.ts — Tách bạch tuyệt đối kênh Công khai
// và kênh Riêng tư (P0 isolation) cho Bóng Đêm KTX v4.
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_CATALOG_VERSION,
  BOARD_GAME_DEFAULT_RULESET_ID,
  type BoardGameCardPublicMeta,
  type BoardGamePrivateGameView,
  type BoardGamePrivatePendingChoice,
  type BoardGamePublicGameView,
  type BoardGamePublicPendingChoice,
  type BoardGamePublicPlayerView,
} from '../../../shared/contracts/boardgame';
import { getCardById, toCardPublicMeta } from './cards';
import { getRoleDesign } from './roles';
import { DEFAULT_CLUSTER_PAIRS } from './rules';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

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
): BoardGamePublicPlayerView {
  const showRole = player.revealed || matchFinished;
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
    appearance: player.appearance,
  };
}

export function getPublicGameView(state: AuthoritativeGameState): BoardGamePublicGameView {
  const orderedPlayers = state.turnOrder
    .map((pid) => state.players[pid])
    .filter((p): p is AuthoritativePlayerState => Boolean(p))
    .map((player) => getPublicPlayerView(player, state.finished));
  const deadCount = Object.values(state.players).filter((p) => !p.alive).length;

  const publicPendingChoice: BoardGamePublicPendingChoice | null = state.pendingChoice
    ? {
        choiceId: state.pendingChoice.choiceId,
        isSecret: state.pendingChoice.isSecret,
        // BẢO MẬT P0: Tuyệt đối KHÔNG lộ chủ sở hữu hay loại phản ứng bí mật cho bàn công khai / Spectator!
        ownerPlayerId: state.pendingChoice.isSecret ? null : state.pendingChoice.ownerPlayerId,
        kind: state.pendingChoice.isSecret ? null : state.pendingChoice.kind,
        promptLabel: state.pendingChoice.publicPromptLabel,
        deadlineMs: state.pendingChoice.deadlineMs,
      }
    : null;

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
    publicLog: [...state.publicLog],
    highlights: [...state.highlights],
    winnerLabel: state.winnerLabel,
    winnerFaction: state.winnerFaction,
    winnerPlayerIds: [...state.winnerPlayerIds],
    winReason: state.winReason,
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
    ...(privatePendingChoice ? { pendingChoice: privatePendingChoice } : {}),
  };
}
