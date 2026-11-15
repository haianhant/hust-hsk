// ---------------------------------------------------------------------------
// features/boardgame/domain/state-machine.ts — Khởi tạo trận đấu Bóng Đêm KTX v3
// (`rulesetVersion = 3`: Hidden Role, Investigation & Survival) cho 4–8 người.
// Bảo mật Turn 0: MỌI vai trò đều ẩn với tất cả (kể cả đồng đội cùng phe),
// cùng xuất phát tại Sảnh KTX với `woundsTaken = 0` và 2 lá bài ngẫu nhiên.
// ---------------------------------------------------------------------------

import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import { CARDS_BY_ID, listCardIdsByDeck } from './cards';
import {
  FACTION_LABELS,
  ROLES_BY_ID,
  getRoleDistribution,
  listRolesForFaction,
} from './roles';
import {
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
  const sortedPlayers = input.players.slice().sort((a, b) => a.seatIndex - b.seatIndex);

  const state: AuthoritativeGameState = {
    rulesetVersion: 3,
    matchId: input.matchId,
    seed,
    rngState: seed,
    round: 1,
    maxRounds: getMaxRoundsForPlayerCount(sortedPlayers.length),
    turnNumber: 1,
    turnStartedAtMs: input.nowMs,
    turnOrder: sortedPlayers.map((p) => p.playerId),
    activeTurnIdx: 0,
    turnPhase: 'MOVE_OR_STAY',
    curfewPressureActive: false,
    courtRangeJammedRound: 0,
    lastInvestigation: null,
    lastRevealEvent: null,
    players: [],
    decks: {
      investigation: [],
      equipment: [],
      event: [],
    },
    discards: {
      investigation: [],
      equipment: [],
      event: [],
    },
    publicLog: [],
    highlights: [],
    winnerLabel: null,
    winnerFaction: null,
    winnerPlayerIds: [],
    winReason: null,
    finished: false,
    publicLogSeq: 0,
    seqCounter: 0,
  };

  // Trộn 3 bộ bài (2 bản sao mỗi lá = 18 Điều tra + 18 Trang bị + 16 Sự kiện = 52 lá)
  const invIds = listCardIdsByDeck('investigation');
  const eqIds = listCardIdsByDeck('equipment');
  const evIds = listCardIdsByDeck('event');
  state.decks.investigation = shuffleWithRng([...invIds, ...invIds], state);
  state.decks.equipment = shuffleWithRng([...eqIds, ...eqIds], state);
  state.decks.event = shuffleWithRng([...evIds, ...evIds], state);

  // Chia vai theo bảng phân bổ 4–8 người
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

    // Mỗi sinh viên khởi đầu đồng nhất với 1 Thẻ Điều tra + 1 Thẻ Trang bị hoặc Sự kiện (luân phiên theo ghế)
    const invId = state.decks.investigation.shift();
    if (invId && CARDS_BY_ID[invId]) {
      startingCards.push(CARDS_BY_ID[invId]);
    }
    const secondDeck = idx % 2 === 0 ? state.decks.equipment : state.decks.event;
    const secondId = secondDeck.shift();
    if (secondId && CARDS_BY_ID[secondId]) {
      startingCards.push(CARDS_BY_ID[secondId]);
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
      tempShield: 0,
      location: 'lobby',
      visitedLocations: ['lobby'],
      recentTrail: ['lobby'],
      alive: true,
      connected: p.connected !== false,
      revealed: false,
      skillCooldown: 0,
      stayedLastTurn: false,
      stayedCount: 0,
      movesMade: 0,
      attacksMade: 0,
      investigationsCount: 0,
      actedThisRound: false,
      extendedRangeThisTurn: false,
      courtAttackBonusThisTurn: false,
      globalInvestigateThisTurn: false,
      equipUsedThisTurn: false,
      wardedUntilRound: 0,
      exposedMark: 0,
      gainedShieldThisTurn: false,
      protegePlayerId: null,
      protectedProtegeCount: 0,
      eliminatedByPlayerId: null,
      eliminatedPlayerIds: [],
      avengedProtegeKiller: false,
      investigatedTargetIds: [],
      hand: startingCards,
      equipped: [],
      privateClues: [],
      privateNotes: [
        {
          id: `init-note-${idx + 1}`,
          round: 1,
          atMs: input.nowMs,
          text: `Vai bí mật: ${role.name} (${FACTION_LABELS[role.faction]} · ${role.maxHp} HP). Mục tiêu: ${role.secretObjective}`,
        },
      ],
    };
  });

  // Gán Mục tiêu Bảo hộ bí mật nếu có Bình (lang-cuu-ho)
  for (const p of authPlayers) {
    if (p.roleId === 'lang-cuu-ho') {
      const candidates = authPlayers.filter((other) => other.playerId !== p.playerId);
      const picked =
        candidates[Math.floor(nextDeterministicRandom(state) * candidates.length)] ?? null;
      if (picked) {
        p.protegePlayerId = picked.playerId;
        state.seqCounter += 1;
        p.privateNotes.push({
          id: `note-protege-${state.seqCounter}`,
          round: 1,
          atMs: input.nowMs,
          text: `Mục tiêu Bảo hộ bí mật của bạn là ${picked.displayName}. Hãy che chắn và giữ họ sống sót tới cuối trận (hoặc kết liễu kẻ hạ họ)!`,
        });
      }
    }
  }

  state.players = authPlayers;
  state.publicLogSeq += 1;
  state.publicLog.push({
    id: `log-${state.publicLogSeq}`,
    round: 1,
    atMs: input.nowMs,
    kind: 'system',
    text: `Đêm KTX v3 bắt đầu (${authPlayers.length} sinh viên · Giới nghiêm tối đa ${state.maxRounds} vòng). Toàn bộ vai trò đang ẩn danh!`,
  });

  return state;
}
