// ---------------------------------------------------------------------------
// features/boardgame/domain/projections.ts — Tách biệt tuyệt đối P0 giữa
// dữ liệu công khai (`getPublicGameView`) và bí mật (`getPrivateGameView`).
// Khán giả / socket chưa xác thực luôn nhận `privateView: null`.
// Tuyệt đối không gửi `hp`, `maxHp`, `fragments`, `skillUsed` ẩn hay
// `secretSabotageLocation` ra kênh công khai.
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_RULESET_VERSION,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
  type BoardGamePublicPlayerView,
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
    woundsTaken: Math.max(0, p.maxHp - p.hp),
    visibleShield: p.shield,
    handCount: p.hand.length,
    alive: p.alive,
    detained: p.detained,
    connected: p.connected,
    // BẢO MẬT P0: Chỉ hiện vai, phe, maxHp & skillUsed khi người chơi đã lật vai công khai hoặc hết trận!
    revealedRoleId: p.revealed ? p.roleId : null,
    revealedFaction: p.revealed ? p.faction : null,
    revealedMaxHp: p.revealed ? p.maxHp : null,
    revealedSkillUsed: p.revealed ? p.skillUsed : false,
    appearance: p.appearance,
  }));

  return {
    rulesetVersion: BOARD_GAME_RULESET_VERSION,
    matchId: state.matchId,
    round: state.round,
    maxRounds: state.maxRounds,
    sabotageArmed: state.sabotageArmed,
    disarmedCount: state.disarmedCount,
    breakerSealed: state.breakerSealed,
    radioSealed: state.radioSealed,
    falseAccusationCount: state.falseAccusationCount,
    tamperedLocations: state.tamperedLocations.slice(),
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
    woundsTaken: Math.max(0, player.maxHp - player.hp),
    shield: player.shield,
    skillUsed: player.skillUsed,
    covertSkillUsed: player.covertSkillUsed,
    confrontUsed: player.confrontUsed,
    revealed: player.revealed,
    detained: player.detained,
    accessTag: player.accessTag,
    traceTag: player.traceTag,
    secretGoalText: roleDef.goalSummary,
    // Chỉ thành viên Hội Màn Sương mới biết Trạm Mục Tiêu phá hoại ngầm!
    secretSabotageLocation: player.faction === 'mist-order' ? state.secretSabotageLocation : null,
    sabotagePlanted: player.faction === 'mist-order' ? state.sabotagePlanted : false,
    sabotageCanDetonate:
      player.faction === 'mist-order'
        ? Boolean(
            state.sabotageArmed &&
              state.sabotagePlanted &&
              state.sabotagePlantedRound !== null &&
              state.round > state.sabotagePlantedRound,
          )
        : false,
    verifiedSceneLocations: player.verifiedSceneLocations.slice(),
    wardPlayerId: wardPlayer?.playerId ?? null,
    wardDisplayName: wardPlayer?.displayName ?? null,
    wardProtectionsCount: player.wardProtectionsCount,
    sacrificedForWard: player.sacrificedForWard,
    hypotheses: player.hypotheses.slice(),
    metPlayerIds: player.metPlayerIds.slice(),
    hand: player.hand.map((c) => ({
      id: c.id,
      deck: c.deck,
      title: c.title,
      summary: c.summary,
      effectId: c.effectId,
      targetMode: c.targetMode,
      value: c.value,
    })),
    evidenceList: player.evidenceList.slice(-20),
    privateNotes: player.privateNotes.slice(-18),
  };
}
