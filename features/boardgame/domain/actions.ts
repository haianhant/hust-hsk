// ---------------------------------------------------------------------------
// features/boardgame/domain/actions.ts — Bộ xử lý lệnh hợp lệ Bóng Đêm KTX v3
// (`MOVE_OR_STAY` -> `LOCATION_ACTION` -> `MAIN_ACTION` -> chuyển lượt).
// Bao gồm `applyTimeoutAutoTurn` trung lập tuyệt đối (không đọc phe/vai).
// ---------------------------------------------------------------------------

import type {
  BoardGameActionPayload,
  BoardGameDeckId,
} from '../../../shared/contracts/boardgame';
import {
  addTempShield,
  appendPrivateNote,
  appendPublicLog,
  drawCardFromDeck,
  executeExploreLocation,
  resolveAttackStrike,
  resolveEquipCard,
  resolveEventCard,
  resolveInvestigationCard,
  resolveRevealedSkill,
  resolveUseConsumableEquipment,
  resolveVoluntaryReveal,
} from './effects';
import {
  canPlayerAttackTarget,
  getLocationDefinition,
  getLocationName,
  isValidLocationId,
  listLegalMovesForPlayer,
} from './rules';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';
import { evaluateVictoryState } from './victory';

const DECK_LABELS: Record<BoardGameDeckId, string> = {
  investigation: 'Điều tra',
  equipment: 'Trang bị',
  event: 'Sự kiện',
};

export interface ApplyActionResult {
  ok: boolean;
  reason?: string;
}

export function getActivePlayer(
  state: AuthoritativeGameState,
): AuthoritativePlayerState | null {
  if (state.finished || state.turnOrder.length === 0) return null;
  const activeId = state.turnOrder[state.activeTurnIdx];
  if (!activeId) return null;
  return state.players.find((p) => p.playerId === activeId) ?? null;
}

export function advanceTurn(state: AuthoritativeGameState, nowMs: number): void {
  if (state.finished) return;

  const outgoing = getActivePlayer(state);
  if (outgoing) {
    if (!outgoing.gainedShieldThisTurn && outgoing.tempShield > 0) {
      outgoing.tempShield = Math.max(0, outgoing.tempShield - 1);
    }
    outgoing.gainedShieldThisTurn = false;
    outgoing.extendedRangeThisTurn = false;
    outgoing.courtAttackBonusThisTurn = false;
    outgoing.globalInvestigateThisTurn = false;
    outgoing.equipUsedThisTurn = false;
    outgoing.exposedMark = 0;
  }

  const total = state.turnOrder.length;
  if (total === 0) return;

  let nextIdx = state.activeTurnIdx;
  let wrappedRound = false;
  let found = false;

  for (let offset = 1; offset <= total; offset++) {
    const candidateIdx = (state.activeTurnIdx + offset) % total;
    if (candidateIdx <= state.activeTurnIdx && offset > 0 && state.activeTurnIdx + offset >= total) {
      wrappedRound = true;
    }
    const candidateId = state.turnOrder[candidateIdx];
    const p = state.players.find((x) => x.playerId === candidateId);
    if (p && p.alive) {
      nextIdx = candidateIdx;
      found = true;
      break;
    }
  }

  if (!found) {
    evaluateVictoryState(state, nowMs, true);
    return;
  }

  if (wrappedRound) {
    // Kiểm tra áp lực Giới Nghiêm ở cuối 2 vòng chót (trước khi bước sang vòng mới)
    if (state.round >= state.maxRounds - 2) {
      const fatiguedNames: string[] = [];
      for (const p of state.players) {
        if (!p.alive) continue;
        const roomPeers = state.players.filter(
          (other) => other.alive && other.location === p.location,
        ).length;
        if (!p.actedThisRound && roomPeers === 1) {
          p.tempShield = 0;
          if (p.hp > 1) p.hp -= 1;
          fatiguedNames.push(p.displayName);
        }
      }
      if (fatiguedNames.length > 0) {
        appendPublicLog(
          state,
          'system',
          `🌙 Áp lực Giới Nghiêm cuối đêm: ${fatiguedNames.join(', ')} đứng tách lẻ không hành động — mất Giáp tạm & chịu 1 vết thương mệt mỏi.`,
          nowMs,
        );
      }
    }

    state.round += 1;
    state.curfewPressureActive = state.round >= state.maxRounds - 1;
    for (const p of state.players) {
      p.actedThisRound = false;
    }

    if (state.round > state.maxRounds) {
      evaluateVictoryState(state, nowMs, true);
      return;
    }

    appendPublicLog(
      state,
      'system',
      `🕒 Bước sang Vòng ${state.round}/${state.maxRounds}${
        state.curfewPressureActive ? ' (Cảnh báo Giới Nghiêm Khẩn Cấp)' : ''
      }.`,
      nowMs,
    );
  }

  state.activeTurnIdx = nextIdx;
  state.turnNumber += 1;
  state.turnStartedAtMs = nowMs;
  state.turnPhase = 'MOVE_OR_STAY';

  const nextPlayer = getActivePlayer(state);
  if (nextPlayer && nextPlayer.skillCooldown > 0) {
    nextPlayer.skillCooldown = Math.max(0, nextPlayer.skillCooldown - 1);
  }
}

export function applyPlayerGameAction(
  state: AuthoritativeGameState,
  playerId: string,
  action: BoardGameActionPayload,
  nowMs: number,
): ApplyActionResult {
  if (state.finished || state.turnPhase === 'ENDED') {
    return { ok: false, reason: 'Ván đấu đã kết thúc.' };
  }

  const actor = state.players.find((p) => p.playerId === playerId);
  if (!actor) {
    return { ok: false, reason: 'Người chơi không thuộc ván đấu này.' };
  }
  if (!actor.alive) {
    return { ok: false, reason: 'Bạn đã kiệt sức nên không thể thực hiện hành động.' };
  }

  const current = getActivePlayer(state);
  if (!current || current.playerId !== playerId) {
    return { ok: false, reason: 'Chưa tới lượt của bạn.' };
  }

  // --- PHA 1: MOVE_OR_STAY ---
  if (state.turnPhase === 'MOVE_OR_STAY') {
    if (action.type === 'MOVE') {
      if (!isValidLocationId(action.location)) {
        return { ok: false, reason: 'Khu vực di chuyển không hợp lệ.' };
      }
      const legalDests = listLegalMovesForPlayer(actor);
      if (!legalDests.includes(action.location)) {
        return {
          ok: false,
          reason: `Chỉ được bước tới khu vực kề cận (${legalDests.map(getLocationName).join(', ')}).`,
        };
      }
      actor.location = action.location;
      if (!actor.visitedLocations.includes(action.location)) {
        actor.visitedLocations.push(action.location);
      }
      actor.recentTrail = [...actor.recentTrail.slice(-5), action.location];
      actor.movesMade += 1;
      actor.stayedLastTurn = false;
      state.turnPhase = 'LOCATION_ACTION';
      appendPublicLog(
        state,
        'move',
        `🚶 ${actor.displayName} di chuyển tới ${getLocationName(action.location)}.`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    if (action.type === 'STAY') {
      actor.stayedLastTurn = true;
      actor.stayedCount += 1;
      state.turnPhase = 'LOCATION_ACTION';
      appendPublicLog(
        state,
        'stay',
        `⏸️ ${actor.displayName} chọn đứng yên tại ${getLocationName(actor.location)}.`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    return { ok: false, reason: 'Đang ở Pha 1 (Di chuyển hoặc Đứng yên).' };
  }

  // --- PHA 2: LOCATION_ACTION ---
  if (state.turnPhase === 'LOCATION_ACTION') {
    if (action.type === 'EXPLORE_LOC') {
      executeExploreLocation(state, actor, nowMs);
      state.turnPhase = 'MAIN_ACTION';
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
    }

    if (action.type === 'DRAW_CARD') {
      const allowed = getLocationDefinition(actor.location)?.allowedDecks ?? [];
      if (!allowed.includes(action.deck)) {
        return {
          ok: false,
          reason: `${getLocationName(actor.location)} chỉ cho rút bộ: ${allowed.map((d) => DECK_LABELS[d]).join(', ')}.`,
        };
      }
      const drawn = drawCardFromDeck(state, actor, action.deck, nowMs);
      if (!drawn) {
        return { ok: false, reason: 'Chồng bài này tạm thời đã hết.' };
      }
      appendPrivateNote(state, actor, `Bạn vừa rút thẻ "${drawn.title}".`, nowMs);
      appendPublicLog(
        state,
        'draw',
        `🃏 ${actor.displayName} rút 1 thẻ ${DECK_LABELS[action.deck]} tại ${getLocationName(actor.location)}.`,
        nowMs,
        actor.playerId,
      );
      state.turnPhase = 'MAIN_ACTION';
      return { ok: true };
    }

    return { ok: false, reason: 'Đang ở Pha 2 (Khảo sát khu vực hoặc Rút bài).' };
  }

  // --- PHA 3: MAIN_ACTION ---
  if (state.turnPhase === 'MAIN_ACTION') {
    if (action.type === 'EQUIP_CARD') {
      const card = actor.hand.find((c) => c.id === action.cardId);
      if (!card) return { ok: false, reason: 'Không tìm thấy thẻ trên tay.' };
      return resolveEquipCard(state, actor, card, nowMs);
    }

    if (action.type === 'REVEAL_ROLE') {
      return resolveVoluntaryReveal(state, actor, nowMs);
    }

    if (action.type === 'INVESTIGATE_CARD') {
      const card = actor.hand.find((c) => c.id === action.cardId && c.deck === 'investigation');
      if (!card) return { ok: false, reason: 'Không tìm thấy thẻ Điều tra này trên tay.' };
      const target = state.players.find(
        (p) => p.playerId === action.targetPlayerId && p.alive && p.playerId !== actor.playerId,
      );
      if (!target) return { ok: false, reason: 'Mục tiêu điều tra không hợp lệ.' };
      const res = resolveInvestigationCard(state, actor, target, card, nowMs);
      if (!res.ok) return res;
      if (!state.finished) advanceTurn(state, nowMs);
      return { ok: true };
    }

    if (action.type === 'PLAY_EVENT') {
      const card = actor.hand.find((c) => c.id === action.cardId && c.deck === 'event');
      if (!card) return { ok: false, reason: 'Không tìm thấy thẻ Sự kiện này trên tay.' };
      const res = resolveEventCard(
        state,
        actor,
        card,
        action.targetPlayerId,
        action.targetLocation,
        nowMs,
      );
      if (!res.ok) return res;
      if (!state.finished) advanceTurn(state, nowMs);
      return { ok: true };
    }

    if (action.type === 'USE_EQUIPMENT') {
      const card = actor.hand.find((c) => c.id === action.cardId && c.deck === 'equipment');
      if (!card) return { ok: false, reason: 'Không tìm thấy thẻ Trang bị tiêu hao trên tay.' };
      const res = resolveUseConsumableEquipment(
        state,
        actor,
        card,
        action.targetPlayerId,
        nowMs,
      );
      if (!res.ok) return res;
      if (!state.finished) advanceTurn(state, nowMs);
      return { ok: true };
    }

    if (action.type === 'ATTACK') {
      const target = state.players.find(
        (p) => p.playerId === action.targetPlayerId && p.alive && p.playerId !== actor.playerId,
      );
      if (!target) return { ok: false, reason: 'Mục tiêu tấn công không hợp lệ.' };
      if (!canPlayerAttackTarget(state, actor, target)) {
        return {
          ok: false,
          reason: 'Mục tiêu không ở trong tầm đánh (cần cùng phòng hoặc mở tầm đánh kề phòng).',
        };
      }
      resolveAttackStrike(state, actor, target, 2, nowMs, 'tấn công', { isNormalAttack: true });
      if (!state.finished) advanceTurn(state, nowMs);
      return { ok: true };
    }

    if (action.type === 'DEFEND') {
      addTempShield(actor, 1);
      const roomPeers = state.players.filter(
        (p) => p.alive && p.playerId !== actor.playerId && p.location === actor.location,
      );
      if (roomPeers.length > 0) {
        const obsLines = roomPeers.map((peer) => {
          const jamHand = peer.revealed && peer.roleId === 'suong-tin-gia';
          const handText = jamHand ? '? lá (bị nhiễu)' : `${peer.hand.length} lá`;
          return `${peer.displayName}: ${handText}, ${peer.equipped.length} trang bị`;
        });
        appendPrivateNote(
          state,
          actor,
          `Quan sát cùng phòng khi phòng thủ: ${obsLines.join(' · ')}.`,
          nowMs,
        );
      }
      appendPublicLog(
        state,
        'defend',
        `🛡️ ${actor.displayName} thủ thế phòng ngự (+1 Giáp tạm) và cảnh giác quan sát xung quanh.`,
        nowMs,
        actor.playerId,
      );
      if (!state.finished) advanceTurn(state, nowMs);
      return { ok: true };
    }

    if (action.type === 'USE_SKILL') {
      const res = resolveRevealedSkill(state, actor, action.targetPlayerId, nowMs);
      if (!res.ok) return res;
      if (!state.finished) advanceTurn(state, nowMs);
      return { ok: true };
    }

    if (action.type === 'END_TURN') {
      appendPublicLog(
        state,
        'system',
        `⏭️ ${actor.displayName} kết thúc lượt.`,
        nowMs,
        actor.playerId,
      );
      advanceTurn(state, nowMs);
      return { ok: true };
    }
  }

  return { ok: false, reason: 'Hành động không hợp lệ ở pha hiện tại.' };
}

/**
 * Xử lý hết giờ lượt trung lập 100%: tuyệt đối KHÔNG đọc `faction`, `roleId`,
 * `hand`, `hp` hay bất kỳ dữ liệu bí mật nào để tránh rò rỉ khi AFK/disconnect.
 */
export function applyTimeoutAutoTurn(
  state: AuthoritativeGameState,
  nowMs: number,
): boolean {
  if (state.finished || state.turnPhase === 'ENDED') return false;
  const actor = getActivePlayer(state);
  if (!actor || !actor.alive) {
    advanceTurn(state, nowMs);
    return true;
  }

  addTempShield(actor, 1);
  actor.stayedLastTurn = true;
  actor.stayedCount += 1;

  appendPublicLog(
    state,
    'timeout',
    `⏱️ ${actor.displayName} hết thời gian lượt — hệ thống tự động thủ thế (+1 Giáp tạm) và chuyển lượt.`,
    nowMs,
    actor.playerId,
  );
  advanceTurn(state, nowMs);
  return true;
}
