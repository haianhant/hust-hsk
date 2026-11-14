// ---------------------------------------------------------------------------
// features/boardgame/domain/state-machine.ts — Khởi tạo trận đấu
// AuthoritativeGameState từ danh sách ghế thật 4–8 người chơi.
// ---------------------------------------------------------------------------

import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import { CARDS_BY_ID, listCardIdsByDeck } from './cards';
import { FACTION_LABELS, ROLES_BY_ID, getRoleDistribution, listRolesForFaction } from './roles';
import {
  BOARD_GAME_MAX_TRACK,
  getMaxRoundsForPlayerCount,
  nextDeterministicRandom,
  shuffleWithRng,
} from './rules';
import type { AuthoritativeGameState, AuthoritativePlayerState, GameCard } from './types';

export interface CreateInitialGameInput {
  matchId: string;
  seed?: number;
  nowMs: number;
  players: ReadonlyArray<{
    playerId: string;
    displayName: string;
    seatIndex: number;
    appearance?: RemoteAppearance;
    connected?: boolean;
  }>;
}

export function createInitialGameState(input: CreateInitialGameInput): AuthoritativeGameState {
  if (input.players.length < 4 || input.players.length > 8) {
    throw new Error(`Số người chơi phải trong khoảng 4–8 (nhận ${input.players.length}).`);
  }

  const seed = (input.seed ?? Math.floor(Math.random() * 0x7fffffff)) >>> 0 || 1337;
  const sortedPlayers = input.players
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex);

  const state: AuthoritativeGameState = {
    matchId: input.matchId,
    seed,
    rngState: seed,
    round: 1,
    maxRounds: getMaxRoundsForPlayerCount(sortedPlayers.length),
    signalProgress: 0,
    mistProgress: 0,
    maxTrackValue: BOARD_GAME_MAX_TRACK,
    turnOrder: sortedPlayers.map((p) => p.playerId),
    activeTurnIdx: 0,
    turnPhase: 'MOVE',
    actionUsedThisTurn: false,
    blackoutLocation: null,
    blackoutRoundsLeft: 0,
    lastVisitorByLocation: {
      lobby: null,
      canteen: null,
      radio: null,
      court: null,
      corridor: null,
      breaker: null,
    },
    players: [],
    decks: {
      clue: [],
      event: [],
      tactic: [],
    },
    discards: {
      clue: [],
      event: [],
      tactic: [],
    },
    publicLog: [],
    highlights: [],
    winnerLabel: null,
    winnerFaction: null,
    winnerPlayerIds: [],
    winReason: null,
    finished: false,
    seqCounter: 0,
  };

  state.decks.clue = shuffleWithRng(listCardIdsByDeck('clue'), state);
  state.decks.event = shuffleWithRng(listCardIdsByDeck('event'), state);
  const tacticPool = [...listCardIdsByDeck('tactic'), ...listCardIdsByDeck('tactic')];
  state.decks.tactic = shuffleWithRng(tacticPool, state);

  const split = getRoleDistribution(sortedPlayers.length);
  const guardRoles = shuffleWithRng(listRolesForFaction('lantern-guard'), state).slice(
    0,
    split.lanternGuard,
  );
  const mistRoles = shuffleWithRng(listRolesForFaction('mist-order'), state).slice(
    0,
    split.mistOrder,
  );
  const wandererRoles = shuffleWithRng(listRolesForFaction('wanderer'), state).slice(
    0,
    split.wanderer,
  );

  const assignedRoles = shuffleWithRng([...guardRoles, ...mistRoles, ...wandererRoles], state);

  const authPlayers: AuthoritativePlayerState[] = sortedPlayers.map((p, idx) => {
    const role = assignedRoles[idx] ?? ROLES_BY_ID['gac-ky-thuat'];
    const startingCards: GameCard[] = [];
    for (let k = 0; k < 2; k++) {
      const cid = state.decks.tactic.shift();
      if (cid && CARDS_BY_ID[cid]) {
        startingCards.push(CARDS_BY_ID[cid]);
      }
    }
    return {
      playerId: p.playerId,
      displayName: p.displayName,
      seatIndex: p.seatIndex,
      appearance: p.appearance ?? {},
      roleId: role.id,
      faction: role.faction,
      hp: role.maxHp,
      maxHp: role.maxHp,
      shield: 0,
      fragments: 0,
      location: 'lobby',
      alive: true,
      connected: p.connected !== false,
      revealed: false,
      skillUsed: false,
      healBlockedNextTurn: false,
      wardPlayerId: null,
      shieldedForWardCount: 0,
      predictedPlayerIds: [],
      correctPredictions: 0,
      hand: startingCards,
      privateNotes: [
        {
          id: `init-note-${idx + 1}`,
          round: 1,
          atMs: input.nowMs,
          text: `Vai trò bí mật: ${role.name} (${FACTION_LABELS[role.faction]}). Mục tiêu: ${role.goalSummary}`,
        },
      ],
    };
  });

  // Gán ward bí mật cho Bình (Kẻ Lang Thang - Người Bảo Hộ Ngầm)
  authPlayers.forEach((p) => {
    if (p.roleId === 'lang-cuu-ho') {
      const candidates = authPlayers.filter((other) => other.playerId !== p.playerId);
      const picked =
        candidates[Math.floor(nextDeterministicRandom(state) * candidates.length)] ?? null;
      if (picked) {
        p.wardPlayerId = picked.playerId;
        p.privateNotes.push({
          id: `ward-note-${p.playerId}`,
          round: 1,
          atMs: input.nowMs,
          text: `Mục tiêu bảo hộ bí mật của bạn là ${picked.displayName}. Hãy giữ họ sống sót tới cuối ván!`,
        });
      }
    }
  });

  state.players = authPlayers;
  state.seqCounter += 1;
  state.publicLog.push({
    id: `log-init-${state.seqCounter}`,
    round: 1,
    atMs: input.nowMs,
    kind: 'system',
    text: `Đêm mất điện KTX bắt đầu (${authPlayers.length} sinh viên · tối đa ${state.maxRounds} vòng).`,
  });

  return state;
}
