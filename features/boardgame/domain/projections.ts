// ---------------------------------------------------------------------------
// features/boardgame/domain/projections.ts — Tách biệt tuyệt đối P0 giữa
// dữ liệu công khai (`getPublicGameView`) và bí mật (`getPrivateGameView`).
// Khán giả / socket chưa xác thực luôn nhận `privateView: null`.
// Tuyệt đối không gửi `hp`, `maxHp`, vai chưa lật, bài trên tay hay
// `protegePlayerId` ra kênh công khai.
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_RULESET_VERSION,
  type BoardGameCardPublicMeta,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
  type BoardGamePublicPlayerView,
} from '../../../shared/contracts/boardgame';
import { getRoleById, ROLES_BY_ID } from './roles';
import type { AuthoritativeGameState, GameCard } from './types';
import { buildFinalRevealSummary } from './victory';

function serializeCardMeta(card: GameCard): BoardGameCardPublicMeta {
  return {
    id: card.id,
    deck: card.deck,
    title: card.title,
    summary: card.summary,
    conditionText: card.conditionText,
    effectId: card.effectId,
    targetMode: card.targetMode,
    isConsumable: card.isConsumable,
    value: card.value,
  };
}

export function getPublicGameView(state: AuthoritativeGameState): BoardGamePublicGameView {
  const activePlayerId =
    !state.finished && state.turnOrder.length > 0
      ? state.turnOrder[state.activeTurnIdx] ?? null
      : null;

  const players: BoardGamePublicPlayerView[] = state.players.map((p) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    seatIndex: p.seatIndex,
    location: p.location,
    woundsTaken: Math.max(0, p.maxHp - p.hp),
    tempShield: p.tempShield,
    handCount: p.revealed && p.roleId === 'suong-tin-gia' ? null : p.hand.length,
    equipped: p.equipped.map(serializeCardMeta),
    attacksMade: p.attacksMade,
    investigationsCount: p.investigationsCount,
    stayedLastTurn: p.stayedLastTurn,
    wardedUntilRound: p.wardedUntilRound >= state.turnNumber ? state.round : 0,
    exposedMark: p.exposedMark,
    alive: p.alive,
    connected: p.connected,
    // BẢO MẬT P0: Chỉ hiện vai, phe, maxHp & cooldown sau khi lật vai hoặc trận FINISHED!
    revealedRoleId: p.revealed ? p.roleId : null,
    revealedFaction: p.revealed ? p.faction : null,
    revealedMaxHp: p.revealed ? p.maxHp : null,
    revealedSkillCooldown: p.revealed ? p.skillCooldown : 0,
    appearance: p.appearance,
  }));

  return {
    rulesetVersion: BOARD_GAME_RULESET_VERSION,
    matchId: state.matchId,
    round: state.round,
    maxRounds: state.maxRounds,
    turnNumber: state.turnNumber,
    turnPhase: state.turnPhase,
    activePlayerId,
    turnOrder: state.turnOrder.slice(),
    curfewPressureActive: state.curfewPressureActive,
    players,
    deckCounts: {
      investigation: state.decks.investigation.length,
      equipment: state.decks.equipment.length,
      event: state.decks.event.length,
    },
    lastInvestigation: state.lastInvestigation,
    lastRevealEvent: state.lastRevealEvent,
    publicLog: state.publicLog.slice(-45),
    highlights: state.highlights.slice(-12),
    winnerLabel: state.winnerLabel,
    winnerFaction: state.winnerFaction,
    winnerPlayerIds: state.winnerPlayerIds.slice(),
    winReason: state.winReason,
    finalReveal: state.finished ? buildFinalRevealSummary(state) : null,
  };
}

export function getPrivateGameView(
  state: AuthoritativeGameState,
  authenticatedPlayerId: string | null | undefined,
): BoardGamePrivateGameView | null {
  if (!authenticatedPlayerId) return null;
  const player = state.players.find((p) => p.playerId === authenticatedPlayerId);
  if (!player) return null;

  const roleDef = getRoleById(player.roleId) ?? ROLES_BY_ID['gac-ky-thuat'];
  const protege = player.protegePlayerId
    ? state.players.find((p) => p.playerId === player.protegePlayerId) ?? null
    : null;

  return {
    playerId: player.playerId,
    roleId: player.roleId,
    roleName: roleDef.name,
    faction: player.faction,
    hp: player.hp,
    maxHp: player.maxHp,
    woundsTaken: Math.max(0, player.maxHp - player.hp),
    tempShield: player.tempShield,
    skillCooldown: player.skillCooldown,
    revealed: player.revealed,
    secretGoalText: roleDef.secretObjective,
    protegePlayerId: protege?.playerId ?? null,
    protegeDisplayName: protege?.displayName ?? null,
    protectedProtegeCount: player.protectedProtegeCount,
    avengedProtegeKiller: player.avengedProtegeKiller,
    investigatedTargetIds: player.investigatedTargetIds.slice(),
    visitedLocations: player.visitedLocations.slice(),
    hand: player.hand.map(serializeCardMeta),
    equipped: player.equipped.map(serializeCardMeta),
    privateClues: player.privateClues.slice(-24),
    privateNotes: player.privateNotes.slice(-18),
  };
}
