// ---------------------------------------------------------------------------
// features/boardgame/domain/state-machine.ts — Khởi tạo ván đấu Shadow Hunters
// chuẩn gốc (4–8 người chơi): 0 bài khởi đầu, xáo 3 Cụm ngẫu nhiên, đủ 48 thẻ & 10 vai.
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_DEFAULT_RULESET_ID,
  BOARD_GAME_VALID_LOCATIONS,
  type BoardGameClusterPair,
  type BoardGameDeckId,
  type BoardGameRoleId,
  type BoardGameRulesetId,
} from '../../../shared/contracts/boardgame';
import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import { listCardIdsByDeck } from './cards';
import { appendPublicLog } from './effects';
import { DEFAULT_RULESET_REGISTRY } from './registry';
import { getRoleDesign, getRoleDistribution } from './roles';
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
  rulesetId?: BoardGameRulesetId;
  allowExperimental?: boolean;
  choiceTimeoutMs?: number;
  players: readonly CreateGamePlayerInput[];
}

export function createInitialGameState(
  input: CreateGameStateInput,
): AuthoritativeGameState {
  const orderedInputs = [...input.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const requestedRulesetId = input.rulesetId ?? BOARD_GAME_DEFAULT_RULESET_ID;
  const resolvedPool = DEFAULT_RULESET_REGISTRY.resolvePlayableRolePoolOrThrow(
    requestedRulesetId,
    orderedInputs.length,
    { allowExperimental: Boolean(input.allowExperimental) },
  );
  let rngState = (input.seed >>> 0) || 135792468;

  const split = getRoleDistribution(orderedInputs.length);
  const hunters = shuffleWithRng(
    resolvedPool.pools.lanternGuard as readonly BoardGameRoleId[],
    rngState,
  );
  rngState = hunters.nextState;
  const shadows = shuffleWithRng(
    resolvedPool.pools.mistOrder as readonly BoardGameRoleId[],
    rngState,
  );
  rngState = shadows.nextState;
  const wanderers = shuffleWithRng(
    resolvedPool.pools.wanderer as readonly BoardGameRoleId[],
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

  // Xáo ngẫu nhiên 6 khu vực vào 3 Cụm cặp đôi (Shadow Hunters base setup)
  const shuffledZones = shuffleWithRng(BOARD_GAME_VALID_LOCATIONS, rngState);
  rngState = shuffledZones.nextState;
  const z = shuffledZones.shuffled;
  const clusterPairs: BoardGameClusterPair[] = [
    { clusterId: 'north', locationIds: [z[0], z[1]] },
    { clusterId: 'central', locationIds: [z[2], z[3]] },
    { clusterId: 'south', locationIds: [z[4], z[5]] },
  ];

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
      // Chuẩn Shadow Hunters: 0 bài trên tay lúc khởi đầu
      hand: [],
      equipped: [],
      revealed: false,
      alive: true,
      connected: pIn.connected,
      skillCooldown: 0,
      skillUsedOnce: false,
      guardianShieldActive: false,
      attacksMade: 0,
      attacksThisTurn: 0,
      lastAttackTargetId: null,
      investigationsCount: 0,
      consecutiveSameZoneRolls: 0,
      eliminatedRound: null,
      eliminatedByPlayerId: null,
      protegePlayerId: null,
      avengedProtegeKiller: false,
      charlesKillWon: false,
      investigatedTargetIds: [],
      clueSeq: 0,
      privateClues: [],
      appearance: pIn.appearance,
    };
    turnOrder.push(pIn.playerId);
  }

  const state: AuthoritativeGameState = {
    rulesetVersion: 4,
    rulesetId: resolvedPool.ruleset.id,
    catalogVersion: resolvedPool.catalogVersion,
    matchId: input.matchId,
    seed: input.seed,
    rngState,
    round: 1,
    maxRounds: BOARD_GAME_SAFETY_MAX_ROUNDS,
    turnNumber: 1,
    turnPhase: 'ROLL_MOVE',
    activePlayerId: turnOrder[0] ?? null,
    turnOrder,
    clusterPairs,
    firstDeadPlayerId: null,
    extraTurnPending: false,
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
    logSeq: 0,
    publicLog: [],
    highlights: [],
    finished: false,
    winnerFaction: null,
    winnerLabel: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
  };

  const isExpanded = resolvedPool.ruleset.id !== 'classic';
  if (isExpanded) {
    state.pendingChoice = null;
    state.expansionState = {
      eventSeq: 0,
      processedEventIds: [],
      resolvedChoiceIds: [],
      pendingSteps: [],
      ...(typeof input.choiceTimeoutMs === 'number' && input.choiceTimeoutMs >= 300
        ? { choiceTimeoutMs: input.choiceTimeoutMs }
        : {}),
      stats: {
        activationsByRole: {},
        damagePreventedByRole: {},
        healByRole: {},
        bonusDamageByRole: {},
      },
    };
  }

  appendPublicLog(
    state,
    'system',
    `🌙 Ván Săn Bóng Đêm KTX bắt đầu (${turnOrder.length} SV · ${split.lanternGuard} Săn / ${split.mistOrder} Bóng / ${split.wanderer} Độc hành)! 3 Cụm đã xáo ngẫu nhiên — tung 1d6+1d4 để di chuyển.`,
    input.nowMs,
  );
  return state;
}
