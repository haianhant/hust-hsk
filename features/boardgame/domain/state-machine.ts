// ---------------------------------------------------------------------------
// features/boardgame/domain/state-machine.ts — Khởi tạo ván đấu Bóng Đêm KTX v4
// từ phòng chờ (4–8 người chơi) với bộ chia phe cân bằng & bài khởi đầu.
// ---------------------------------------------------------------------------

import type {
  BoardGameDeckId,
  BoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import { listCardIdsByDeck } from './cards';
import { appendPublicLog } from './effects';
import { getRoleDesign, getRoleDistribution, listRolesForFaction } from './roles';
import {
  BOARD_GAME_SAFETY_MAX_ROUNDS,
  LOCATIONS_CATALOG,
  shuffleWithRng,
} from './rules';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

export interface CreateGamePlayerInput {
  playerId: string;
  displayName: string;
  seatIndex: number;
  appearance: RemoteAppearance;
  connected: boolean;
}

export interface CreateGameStateInput {
  matchId: string;
  seed: number;
  nowMs: number;
  players: readonly CreateGamePlayerInput[];
}

export function createInitialGameState(
  input: CreateGameStateInput,
): AuthoritativeGameState {
  const orderedInputs = [...input.players].sort((a, b) => a.seatIndex - b.seatIndex);
  let rngState = (input.seed >>> 0) || 135792468;

  const split = getRoleDistribution(orderedInputs.length);
  const hunters = shuffleWithRng(
    listRolesForFaction('lantern-guard').map((r) => r.id),
    rngState,
  );
  rngState = hunters.nextState;
  const shadows = shuffleWithRng(
    listRolesForFaction('mist-order').map((r) => r.id),
    rngState,
  );
  rngState = shadows.nextState;
  const wanderers = shuffleWithRng(
    listRolesForFaction('wanderer').map((r) => r.id),
    rngState,
  );
  rngState = wanderers.nextState;

  const pickedRoleIds: BoardGameRoleId[] = [
    ...hunters.shuffled.slice(0, split.lanternGuard),
    ...shadows.shuffled.slice(0, split.mistOrder),
    ...wanderers.shuffled.slice(0, split.wanderer),
  ];
  const shuffledRoles = shuffleWithRng(pickedRoleIds, rngState);
  rngState = shuffledRoles.nextState;

  const invDeck = shuffleWithRng(listCardIdsByDeck('investigation'), rngState);
  rngState = invDeck.nextState;
  const eqDeck = shuffleWithRng(listCardIdsByDeck('equipment'), rngState);
  rngState = eqDeck.nextState;
  const evDeck = shuffleWithRng(listCardIdsByDeck('event'), rngState);
  rngState = evDeck.nextState;

  const decks: Record<BoardGameDeckId, string[]> = {
    investigation: invDeck.shuffled,
    equipment: eqDeck.shuffled,
    event: evDeck.shuffled,
  };

  const shuffledStarts = shuffleWithRng(
    LOCATIONS_CATALOG.map((l) => l.id),
    rngState,
  );
  rngState = shuffledStarts.nextState;

  const players: Record<string, AuthoritativePlayerState> = {};
  const turnOrder: string[] = [];

  for (let i = 0; i < orderedInputs.length; i++) {
    const pIn = orderedInputs[i];
    const roleId = shuffledRoles.shuffled[i] ?? 'gac-truc-ban';
    const role = getRoleDesign(roleId);

    // Phát 1 lá Khám Phá Kín mở đầu để có tương tác ngay từ vòng 1.
    const startingCard = decks.investigation.shift();
    const initialHand = startingCard ? [startingCard] : [];

    players[pIn.playerId] = {
      playerId: pIn.playerId,
      displayName: pIn.displayName,
      seatIndex: pIn.seatIndex,
      roleId: role.id,
      faction: role.faction,
      hp: role.maxHp,
      maxHp: role.maxHp,
      woundsTaken: 0,
      location: shuffledStarts.shuffled[i % shuffledStarts.shuffled.length],
      hand: initialHand,
      equipped: [],
      revealed: false,
      alive: true,
      connected: pIn.connected,
      skillCooldown: 0,
      skillUsedOnce: false,
      guardianShieldActive: false,
      attacksMade: 0,
      investigationsCount: 0,
      consecutiveSameZoneRolls: 0,
      eliminatedRound: null,
      eliminatedByPlayerId: null,
      protegePlayerId: null,
      avengedProtegeKiller: false,
      investigatedTargetIds: [],
      privateClues: [],
      appearance: pIn.appearance,
    };
    turnOrder.push(pIn.playerId);
  }

  // Chỉ định Người được bảo hộ ngầm cho Bình "Bảo Vệ" (ưu tiên không phải Wanderer khác).
  for (const pid of turnOrder) {
    const player = players[pid];
    if (player.roleId !== 'lang-cuu-ho') continue;
    const nonWanderers = turnOrder.filter(
      (otherId) => otherId !== pid && players[otherId].faction !== 'wanderer',
    );
    const pool = nonWanderers.length > 0 ? nonWanderers : turnOrder.filter((o) => o !== pid);
    if (pool.length > 0) {
      const picked = shuffleWithRng(pool, rngState);
      rngState = picked.nextState;
      player.protegePlayerId = picked.shuffled[0] ?? null;
    }
  }

  const state: AuthoritativeGameState = {
    rulesetVersion: 4,
    matchId: input.matchId,
    seed: input.seed,
    rngState,
    round: 1,
    maxRounds: BOARD_GAME_SAFETY_MAX_ROUNDS,
    turnNumber: 1,
    turnPhase: 'ROLL_MOVE',
    activePlayerId: turnOrder[0] ?? null,
    turnOrder,
    players,
    decks,
    discards: {
      investigation: [],
      equipment: [],
      event: [],
    },
    lastDiceRoll: null,
    lastInvestigation: null,
    lastRevealEvent: null,
    publicLog: [],
    highlights: [],
    finished: false,
    winnerFaction: null,
    winnerLabel: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
  };

  appendPublicLog(
    state,
    'system',
    `🌙 Ván Săn Bóng Đêm KTX bắt đầu (${turnOrder.length} người chơi)! Hãy tung xúc xắc 1d6 + 1d4 ở mỗi lượt để di chuyển.`,
    input.nowMs,
  );
  return state;
}
