// ---------------------------------------------------------------------------
// features/boardgame/domain/projections.ts — Tách biệt tuyệt đối P0 giữa
// dữ liệu công khai (`getPublicGameView`) và bí mật (`getPrivateGameView`).
// Khán giả / socket chưa xác thực luôn nhận `privateView: null`.
// ---------------------------------------------------------------------------

import type {
  BoardGamePrivateGameView,
  BoardGamePublicGameView,
  BoardGamePublicPlayerView,
} from '../../../shared/contracts/boardgame';
import { ROLES_BY_ID } from './roles';
import type { AuthoritativeGameState } from './types';
import { buildFinalRevealSummary } from './victory';

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
    hp: p.hp,
    maxHp: p.maxHp,
    shield: p.shield,
    fragments: p.fragments,
    handCount: p.hand.length,
    alive: p.alive,
    connected: p.connected,
    skillUsed: p.skillUsed,
    // BẢO MẬT P0: Chỉ hiện vai & phe khi người chơi tự lật hoặc ván đã FINISHED!
    revealedRoleId: p.revealed ? p.roleId : null,
    revealedFaction: p.revealed ? p.faction : null,
    appearance: p.appearance,
  }));

  return {
    matchId: state.matchId,
    round: state.round,
    maxRounds: state.maxRounds,
    signalProgress: state.signalProgress,
    mistProgress: state.mistProgress,
    maxTrackValue: state.maxTrackValue,
    turnPhase: state.turnPhase,
    activePlayerId,
    turnOrder: state.turnOrder.slice(),
    blackoutLocation: state.blackoutLocation,
    players,
    deckCounts: {
      clue: state.decks.clue.length,
      event: state.decks.event.length,
      tactic: state.decks.tactic.length,
    },
    publicLog: state.publicLog.slice(-40),
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

  const roleDef = ROLES_BY_ID[player.roleId];
  const wardPlayer = player.wardPlayerId
    ? state.players.find((p) => p.playerId === player.wardPlayerId) ?? null
    : null;

  return {
    playerId: player.playerId,
    roleId: player.roleId,
    roleName: roleDef.name,
    faction: player.faction,
    hp: player.hp,
    maxHp: player.maxHp,
    shield: player.shield,
    fragments: player.fragments,
    skillUsed: player.skillUsed,
    revealed: player.revealed,
    secretGoalText: roleDef.goalSummary,
    wardPlayerId: wardPlayer?.playerId ?? null,
    wardDisplayName: wardPlayer?.displayName ?? null,
    shieldedForWardCount: player.shieldedForWardCount,
    correctPredictions: player.correctPredictions,
    predictedPlayerIds: player.predictedPlayerIds.slice(),
    hand: player.hand.map((c) => ({
      id: c.id,
      deck: c.deck,
      title: c.title,
      summary: c.summary,
      effectId: c.effectId,
      targetMode: c.targetMode,
      value: c.value,
    })),
    privateNotes: player.privateNotes.slice(-16),
  };
}
