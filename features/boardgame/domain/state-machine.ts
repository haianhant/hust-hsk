// ---------------------------------------------------------------------------
// features/boardgame/domain/state-machine.ts — Khởi tạo trận đấu Bóng Đêm KTX v2
// (rulesetVersion = 2) từ danh sách ghế thật 4–8 người chơi.
// ---------------------------------------------------------------------------

import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import { CARDS_BY_ID, listCardIdsByDeck } from './cards';
import {
  ACCESS_TAG_LABELS,
  FACTION_LABELS,
  ROLES_BY_ID,
  TRACE_TAG_LABELS,
  getRoleDistribution,
  listRolesForFaction,
} from './roles';
import {
  BOARD_GAME_INFRASTRUCTURE_LOCATIONS,
  getLocationName,
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
    rulesetVersion: 2,
    matchId: input.matchId,
    seed,
    rngState: seed,
    round: 1,
    maxRounds: getMaxRoundsForPlayerCount(sortedPlayers.length),
    secretSabotageLocation: 'radio',
    sabotagePlanted: false,
    sabotagePlantedRound: null,
    sabotagePlantedByPlayerId: null,
    sabotageArmed: false,
    plotDetonated: false,
    disarmedCount: 0,
    breakerSealed: false,
    radioSealed: false,
    falseAccusationCount: 0,
    dossierPublishedBy: null,
    tamperedLocations: [],
    tamperHistoryByLocation: {
      lobby: [],
      canteen: [],
      radio: [],
      court: [],
      corridor: [],
      breaker: [],
    },
    turnOrder: sortedPlayers.map((p) => p.playerId),
    activeTurnIdx: 0,
    turnPhase: 'MOVE',
    actionUsedThisTurn: false,
    hypothesisUpdatedThisTurn: false,
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

  // Chọn Trạm Mục Tiêu phá hoại bí mật cho ván này
  const targetIdx = Math.floor(nextDeterministicRandom(state) * BOARD_GAME_INFRASTRUCTURE_LOCATIONS.length);
  state.secretSabotageLocation = BOARD_GAME_INFRASTRUCTURE_LOCATIONS[targetIdx] ?? 'radio';

  // Trộn bộ bài 24 lá (tạo đủ nhịp điều tra và chiến thuật)
  state.decks.clue = shuffleWithRng([...listCardIdsByDeck('clue'), ...listCardIdsByDeck('clue')], state);
  state.decks.event = shuffleWithRng([...listCardIdsByDeck('event'), ...listCardIdsByDeck('event')], state);
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
      accessTag: role.accessTag,
      traceTag: role.traceTag,
      location: 'lobby',
      visitedLocations: ['lobby'],
      recentMoves: [],
      technicalActionRounds: [],
      plantedDecoyRounds: [],
      dealtDamageRounds: [],
      metPlayerIds: [],
      verifiedSceneLocations: [],
      alive: true,
      detained: false,
      connected: p.connected !== false,
      revealed: false,
      skillUsed: false,
      covertSkillUsed: false,
      confrontUsed: false,
      healBlockedNextTurn: false,
      bodyguardActive: false,
      wardPlayerId: null,
      wardProtectionsCount: 0,
      sacrificedForWard: false,
      hypotheses: [],
      hand: startingCards,
      evidenceList: [],
      privateNotes: [
        {
          id: `init-note-${idx + 1}`,
          round: 1,
          atMs: input.nowMs,
          text: `Vai bí mật: ${role.name} (${FACTION_LABELS[role.faction]}) · Trang bị [${ACCESS_TAG_LABELS[role.accessTag]} / ${TRACE_TAG_LABELS[role.traceTag]}].`,
        },
      ],
    };
  });

  // Giao kèo bí mật cho Hội Màn Sương: biết đồng đội cùng phe và Trạm Mục Tiêu phá hoại
  const mistTeam = authPlayers.filter((p) => p.faction === 'mist-order');
  for (const m of mistTeam) {
    const partners = mistTeam
      .filter((other) => other.playerId !== m.playerId)
      .map((other) => other.displayName);
    m.privateNotes.push({
      id: `mist-brief-${m.playerId}`,
      round: 1,
      atMs: input.nowMs,
      text: `Mật lệnh Hội Màn Sương: Đồng đội [${partners.join(', ') || 'Chỉ mình bạn'}]. Trạm Mục Tiêu phá hoại là ${getLocationName(state.secretSabotageLocation)}!`,
    });
  }

  // Gán mục tiêu bảo hộ bí mật cho Bình (Người Bảo Hộ Ngầm)
  for (const p of authPlayers) {
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
          text: `Mục tiêu Bảo hộ bí mật của bạn là ${picked.displayName}. Hãy che chắn và giữ họ sống sót tới cuối ván!`,
        });
      }
    }
  }

  state.players = authPlayers;
  state.seqCounter += 1;
  state.publicLog.push({
    id: `log-init-${state.seqCounter}`,
    round: 1,
    atMs: input.nowMs,
    kind: 'system',
    text: `Đêm mất điện KTX v2 bắt đầu (${authPlayers.length} sinh viên · Rạng Sáng sau ${state.maxRounds} vòng).`,
  });

  return state;
}
