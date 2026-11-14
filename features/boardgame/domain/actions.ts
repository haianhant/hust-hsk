// ---------------------------------------------------------------------------
// features/boardgame/domain/actions.ts — Bộ xử lý lệnh hợp lệ theo từng pha
// (MOVE -> DRAW_OR_EXPLORE -> TACTICAL_ACTION -> END_TURN) với chống gian lận.
// ---------------------------------------------------------------------------

import type { BoardGameActionPayload, BoardGameDeckId, BoardGameLocationId } from '../../../shared/contracts/boardgame';
import { CARDS_BY_ID } from './cards';
import {
  addCardToHand,
  adjustSignalOrMist,
  appendPrivateNote,
  appendPublicLog,
  applyDamage,
  applyHeal,
  drawCardFromDeck,
  pickInspectionTarget,
  resolveCardImmediateEffect,
} from './effects';
import { FACTION_LABELS, ROLES_BY_ID } from './roles';
import {
  KTX_LOCATIONS,
  getLocationName,
  isAdjacentLocation,
  isValidLocationId,
  nextDeterministicRandom,
} from './rules';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';
import { evaluateVictoryState } from './victory';

export interface ActionApplyResult {
  ok: boolean;
  reason?: string;
}

export function getActivePlayer(state: AuthoritativeGameState): AuthoritativePlayerState | null {
  if (state.finished || state.turnOrder.length === 0) return null;
  const activeId = state.turnOrder[state.activeTurnIdx];
  if (!activeId) return null;
  return state.players.find((p) => p.playerId === activeId) ?? null;
}

export function advanceTurnPointer(state: AuthoritativeGameState, nowMs: number): void {
  if (evaluateVictoryState(state, nowMs, false)) return;

  const total = state.turnOrder.length;
  if (total === 0) {
    evaluateVictoryState(state, nowMs, true);
    return;
  }

  let nextIdx = state.activeTurnIdx;
  let wrapped = false;

  for (let step = 0; step < total; step++) {
    nextIdx += 1;
    if (nextIdx >= total) {
      nextIdx = 0;
      wrapped = true;
    }
    const candidateId = state.turnOrder[nextIdx];
    const candidate = state.players.find((p) => p.playerId === candidateId);
    if (candidate && candidate.alive) {
      if (wrapped) {
        state.round += 1;
        if (state.blackoutRoundsLeft > 0) {
          state.blackoutRoundsLeft -= 1;
          if (state.blackoutRoundsLeft <= 0) {
            state.blackoutLocation = null;
          }
        }
        if (state.round > state.maxRounds) {
          evaluateVictoryState(state, nowMs, true);
          return;
        }
      }
      state.activeTurnIdx = nextIdx;
      state.turnPhase = 'MOVE';
      state.actionUsedThisTurn = false;
      candidate.healBlockedNextTurn = false;
      return;
    }
  }

  // Không còn người chơi sống nào
  evaluateVictoryState(state, nowMs, true);
}

function executeRoleSkill(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayer: AuthoritativePlayerState | null,
  nowMs: number,
): void {
  const roleDef = ROLES_BY_ID[actor.roleId];
  actor.skillUsed = true;
  actor.revealed = true;

  appendPublicLog(
    state,
    'skill',
    `${actor.displayName} LẬT VAI [${roleDef.name}] và kích hoạt kỹ năng "${roleDef.skillName}"!`,
    nowMs,
    actor.playerId,
  );
  state.highlights.push({
    round: state.round,
    title: `${actor.displayName} lật vai`,
    detail: `Công khai nhân vật ${roleDef.name} (${roleDef.skillName}).`,
    atMs: nowMs,
  });

  switch (actor.roleId) {
    case 'gac-ky-thuat': {
      adjustSignalOrMist(state, 'signal', 1, nowMs, `${actor.displayName} (${roleDef.skillName})`);
      const ally = targetPlayer && targetPlayer.location === actor.location && targetPlayer.alive ? targetPlayer : actor;
      applyHeal(ally, 2);
      return;
    }
    case 'gac-truc-ban': {
      actor.shield = Math.min(8, actor.shield + 2);
      const t = pickInspectionTarget(state, actor, targetPlayer);
      if (t) {
        const isMist = t.faction === 'mist-order';
        appendPrivateNote(
          state,
          actor,
          `[Kiểm Tra Sổ Trực] ${t.displayName} ${isMist ? 'THUỘC Hội Màn Sương!' : 'KHÔNG thuộc Hội Màn Sương.'}`,
          nowMs,
        );
      }
      return;
    }
    case 'gac-radio': {
      adjustSignalOrMist(state, 'signal', 1, nowMs, `${actor.displayName} (${roleDef.skillName})`);
      const card = drawCardFromDeck(state, 'tactic');
      if (card) addCardToHand(state, actor, card);
      return;
    }
    case 'suong-an-danh': {
      adjustSignalOrMist(state, 'mist', 1, nowMs, `${actor.displayName} (${roleDef.skillName})`);
      state.blackoutLocation = actor.location;
      state.blackoutRoundsLeft = 1;
      return;
    }
    case 'suong-tin-gia': {
      if (state.signalProgress > 0) {
        adjustSignalOrMist(state, 'signal', -1, nowMs, `${actor.displayName} (${roleDef.skillName})`);
      }
      adjustSignalOrMist(state, 'mist', 1, nowMs, `${actor.displayName} (${roleDef.skillName})`);
      const victim = pickInspectionTarget(state, actor, targetPlayer);
      if (victim) {
        applyDamage(state, victim, 1, nowMs, `${actor.displayName} (${roleDef.skillName})`);
      }
      return;
    }
    case 'suong-gac-cong': {
      const victim = pickInspectionTarget(state, actor, targetPlayer);
      if (victim) {
        victim.healBlockedNextTurn = true;
        applyDamage(state, victim, 2, nowMs, `${actor.displayName} (${roleDef.skillName})`);
      }
      return;
    }
    case 'lang-anh-san': {
      actor.fragments += 1;
      actor.shield = Math.min(8, actor.shield + 1);
      const t = pickInspectionTarget(state, actor, targetPlayer);
      if (t) {
        appendPrivateNote(
          state,
          actor,
          `[Lần Theo Dây Cáp] +1 Mảnh Tin (${actor.fragments}). ${t.displayName} thuộc phe ${FACTION_LABELS[t.faction]}.`,
          nowMs,
        );
      }
      return;
    }
    case 'lang-quan-sat': {
      actor.shield = Math.min(8, actor.shield + 2);
      const t = pickInspectionTarget(state, actor, targetPlayer);
      if (t) {
        appendPrivateNote(
          state,
          actor,
          `[Ghi Chép Lạnh Lùng] ${t.displayName} thuộc phe ${FACTION_LABELS[t.faction]}.`,
          nowMs,
        );
        if (!actor.predictedPlayerIds.includes(t.playerId)) {
          actor.predictedPlayerIds.push(t.playerId);
          actor.correctPredictions += 1;
        }
      }
      return;
    }
    case 'lang-cuu-ho': {
      const ward = actor.wardPlayerId
        ? state.players.find((p) => p.playerId === actor.wardPlayerId && p.alive) ?? null
        : null;
      const healTarget = ward ?? (targetPlayer && targetPlayer.alive ? targetPlayer : actor);
      applyHeal(healTarget, 3);
      healTarget.shield = Math.min(8, healTarget.shield + 2);
      if (ward && healTarget.playerId === ward.playerId) {
        actor.shieldedForWardCount += 2;
      }
      return;
    }
  }
}

export function applyPlayerGameAction(
  state: AuthoritativeGameState,
  playerId: string,
  action: BoardGameActionPayload,
  nowMs: number,
): ActionApplyResult {
  if (state.finished) {
    return { ok: false, reason: 'Ván đấu đã kết thúc.' };
  }
  const actor = state.players.find((p) => p.playerId === playerId);
  if (!actor || !actor.alive) {
    return { ok: false, reason: 'Bạn không còn trong lượt tham chiến.' };
  }
  const active = getActivePlayer(state);
  if (!active || active.playerId !== playerId) {
    return { ok: false, reason: 'Chưa tới lượt của bạn.' };
  }

  // Cho phép tự lật vai công khai bất kỳ lúc nào trong lượt mình
  if (action.type === 'REVEAL_ROLE') {
    if (actor.revealed) {
      return { ok: false, reason: 'Bạn đã lật vai công khai trước đó.' };
    }
    actor.revealed = true;
    const roleDef = ROLES_BY_ID[actor.roleId];
    appendPublicLog(
      state,
      'reveal',
      `${actor.displayName} công khai danh tính: ${roleDef.name} (${FACTION_LABELS[actor.faction]})!`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  if (state.turnPhase === 'MOVE') {
    if (action.type !== 'MOVE') {
      return { ok: false, reason: 'Đang ở pha Di chuyển: hãy chọn khu vực KTX khác vị trí hiện tại.' };
    }
    if (!isValidLocationId(action.location) || action.location === actor.location) {
      return { ok: false, reason: 'Hãy chọn một khu vực khác với vị trí đang đứng.' };
    }
    actor.location = action.location;
    appendPublicLog(
      state,
      'move',
      `${actor.displayName} di chuyển tới ${getLocationName(action.location)}.`,
      nowMs,
      actor.playerId,
    );

    const isBlackout = state.blackoutLocation === action.location;
    if (!isBlackout) {
      if (action.location === 'lobby' && actor.hp < actor.maxHp) {
        const gained = applyHeal(actor, 1);
        if (gained > 0) {
          appendPrivateNote(state, actor, 'Đèn pin Sảnh KTX giúp bạn hồi +1 HP.', nowMs);
        }
      } else if (action.location === 'breaker') {
        const prevId = state.lastVisitorByLocation.breaker;
        if (prevId && prevId !== actor.playerId) {
          const prevPlayer = state.players.find((p) => p.playerId === prevId);
          if (prevPlayer) {
            appendPrivateNote(
              state,
              actor,
              `[Sổ Cầu Dao] Người ghé Phòng Cầu Dao ngay trước bạn là ${prevPlayer.displayName}.`,
              nowMs,
            );
          }
        }
      }
    }
    state.lastVisitorByLocation[action.location] = actor.playerId;
    state.turnPhase = 'DRAW_OR_EXPLORE';
    evaluateVictoryState(state, nowMs, false);
    return { ok: true };
  }

  if (state.turnPhase === 'DRAW_OR_EXPLORE') {
    if (action.type === 'ADJUST_TRACK') {
      if (actor.location !== 'radio') {
        return { ok: false, reason: 'Chỉ được chỉnh Tín hiệu/Màn sương trực tiếp tại Phòng Phát Thanh.' };
      }
      if (state.blackoutLocation === actor.location) {
        return { ok: false, reason: 'Khu vực này đang mất điện cục bộ trong vòng này.' };
      }
      const which = action.mode === 'mist' ? 'mist' : 'signal';
      adjustSignalOrMist(
        state,
        which,
        1,
        nowMs,
        `${actor.displayName} tại ${getLocationName(actor.location)}`,
      );
      state.turnPhase = 'TACTICAL_ACTION';
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
    }

    if (action.type !== 'DRAW_CARD') {
      return { ok: false, reason: 'Đang ở pha Điều tra: hãy rút 1 thẻ (Manh mối / Sự kiện / Chiến thuật) hoặc dùng Trạm.' };
    }

    const deck: BoardGameDeckId =
      action.deck === 'clue' || action.deck === 'event' || action.deck === 'tactic'
        ? action.deck
        : 'event';
    const card = drawCardFromDeck(state, deck);
    if (!card) {
      state.turnPhase = 'TACTICAL_ACTION';
      return { ok: true };
    }

    if (deck === 'tactic') {
      addCardToHand(state, actor, card);
      appendPublicLog(
        state,
        'draw',
        `${actor.displayName} rút 1 lá Chiến thuật giữ kín trên tay.`,
        nowMs,
        actor.playerId,
      );
    } else {
      appendPublicLog(
        state,
        'draw',
        `${actor.displayName} rút thẻ ${deck === 'clue' ? 'Manh mối' : 'Sự kiện'}: "${card.title}".`,
        nowMs,
        actor.playerId,
      );
      resolveCardImmediateEffect(state, actor, card, null, nowMs);
      state.discards[deck].push(card.id);
    }

    // Đặc quyền khu vực Căng Tin, Cầu Dao & Sân Bóng Rổ
    if (state.blackoutLocation !== actor.location) {
      if (actor.location === 'canteen' && deck === 'event') {
        actor.shield = Math.min(8, actor.shield + 1);
      } else if (actor.location === 'breaker' && deck === 'clue') {
        actor.shield = Math.min(8, actor.shield + 1);
      } else if (actor.location === 'court') {
        const peersHere = state.players.filter(
          (p) => p.alive && p.playerId !== actor.playerId && p.location === 'court',
        );
        if (peersHere.length === 0) {
          actor.fragments += 1;
          appendPrivateNote(
            state,
            actor,
            `Quan sát từ Sân Bóng Rổ trống giúp bạn nhặt +1 Mảnh Tin Đen (${actor.fragments}).`,
            nowMs,
          );
        }
      }
    }

    state.turnPhase = 'TACTICAL_ACTION';
    if (!evaluateVictoryState(state, nowMs, false) && !actor.alive) {
      advanceTurnPointer(state, nowMs);
    }
    return { ok: true };
  }

  if (state.turnPhase === 'TACTICAL_ACTION') {
    if (action.type === 'END_TURN') {
      appendPublicLog(state, 'system', `${actor.displayName} kết thúc lượt.`, nowMs, actor.playerId);
      advanceTurnPointer(state, nowMs);
      return { ok: true };
    }

    if (state.actionUsedThisTurn) {
      return { ok: false, reason: 'Bạn đã thực hiện hành động chiến thuật trong lượt này; hãy bấm Kết thúc lượt.' };
    }

    if (action.type === 'USE_CARD') {
      const cardIdx = actor.hand.findIndex((c) => c.id === action.cardId);
      if (cardIdx === -1) {
        return { ok: false, reason: 'Bạn không giữ lá bài này trên tay.' };
      }
      const [card] = actor.hand.splice(cardIdx, 1);
      const explicitTarget = action.targetPlayerId
        ? state.players.find((p) => p.playerId === action.targetPlayerId && p.alive) ?? null
        : null;
      if (
        explicitTarget &&
        (card.targetMode === 'same-location' || card.targetMode === 'adjacent-or-same') &&
        explicitTarget.location !== actor.location &&
        !(card.targetMode === 'adjacent-or-same' && isAdjacentLocation(actor.location, explicitTarget.location))
      ) {
        actor.hand.splice(cardIdx, 0, card);
        return { ok: false, reason: 'Mục tiêu đang đứng ngoài tầm tác động của thẻ bài này.' };
      }
      resolveCardImmediateEffect(state, actor, card, explicitTarget, nowMs);
      state.discards[card.deck].push(card.id);
      state.actionUsedThisTurn = true;
      if (!evaluateVictoryState(state, nowMs, false) && !actor.alive) {
        advanceTurnPointer(state, nowMs);
      }
      return { ok: true };
    }

    if (action.type === 'USE_SKILL') {
      if (actor.skillUsed) {
        return { ok: false, reason: 'Kỹ năng nhân vật chỉ dùng 1 lần mỗi ván.' };
      }
      const target = action.targetPlayerId
        ? state.players.find((p) => p.playerId === action.targetPlayerId && p.alive) ?? null
        : null;
      executeRoleSkill(state, actor, target, nowMs);
      state.actionUsedThisTurn = true;
      if (!evaluateVictoryState(state, nowMs, false) && !actor.alive) {
        advanceTurnPointer(state, nowMs);
      }
      return { ok: true };
    }

    if (action.type === 'ATTACK') {
      const target = state.players.find((p) => p.playerId === action.targetPlayerId && p.alive);
      if (!target || target.playerId === actor.playerId) {
        return { ok: false, reason: 'Hãy chọn mục tiêu còn sống hợp lệ.' };
      }
      const inRange =
        target.location === actor.location ||
        (actor.location === 'court' && isAdjacentLocation(actor.location, target.location));
      if (!inRange) {
        return { ok: false, reason: 'Mục tiêu phải đứng cùng khu vực (hoặc kề cạnh nếu bạn ở Sân Bóng Rổ).' };
      }
      const dmg = actor.roleId === 'suong-gac-cong' && actor.revealed ? 3 : 2;
      const dmgRes = applyDamage(state, target, dmg, nowMs, `${actor.displayName} (Công kích)`);
      appendPublicLog(
        state,
        'attack',
        `${actor.displayName} công kích ${target.displayName} (-${dmgRes.hpLost} HP, Khiên đỡ ${dmgRes.shieldAbsorbed}).`,
        nowMs,
        actor.playerId,
      );
      state.actionUsedThisTurn = true;
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
    }

    if (action.type === 'PROBE') {
      const target = state.players.find((p) => p.playerId === action.targetPlayerId && p.alive);
      if (!target || target.playerId === actor.playerId) {
        return { ok: false, reason: 'Hãy chọn sinh viên hợp lệ để thăm dò.' };
      }
      const inRange =
        target.location === actor.location ||
        (actor.location === 'court' && isAdjacentLocation(actor.location, target.location));
      if (!inRange) {
        return { ok: false, reason: 'Chỉ thăm dò được người ở cùng khu vực (hoặc kề cạnh khi ở Sân Bóng Rổ).' };
      }
      const claimed = action.claimedFaction ?? 'mist-order';
      const matches = target.faction === claimed;
      if (matches && !actor.predictedPlayerIds.includes(target.playerId)) {
        actor.predictedPlayerIds.push(target.playerId);
        actor.correctPredictions += 1;
      }
      appendPrivateNote(
        state,
        actor,
        `[Thăm dò] ${target.displayName}: giả thuyết "${FACTION_LABELS[claimed]}" là ${matches ? 'ĐÚNG!' : 'SAI.'}`,
        nowMs,
      );
      appendPublicLog(
        state,
        'probe',
        `${actor.displayName} thực hiện thăm dò bí mật đối với ${target.displayName}.`,
        nowMs,
        actor.playerId,
      );
      state.actionUsedThisTurn = true;
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
    }
  }

  return { ok: false, reason: 'Hành động không hợp lệ ở pha hiện tại.' };
}

/** Tự động hoàn thành phần còn lại của lượt khi hết giờ `alarm()` — bảo đảm 0% treo bàn. */
export function applyTimeoutAutoTurn(state: AuthoritativeGameState, nowMs: number): void {
  if (state.finished) return;
  const active = getActivePlayer(state);
  if (!active || !active.alive) {
    advanceTurnPointer(state, nowMs);
    return;
  }

  const startActiveId = active.playerId;
  const startRound = state.round;
  let guard = 0;

  while (!state.finished && guard < 4) {
    guard += 1;
    const cur = getActivePlayer(state);
    if (!cur || cur.playerId !== startActiveId || state.round !== startRound) break;

    if (state.turnPhase === 'MOVE') {
      const options = KTX_LOCATIONS.map((l) => l.id).filter((id) => id !== cur.location);
      const pick = options[Math.floor(nextDeterministicRandom(state) * options.length)] ?? 'corridor';
      applyPlayerGameAction(state, cur.playerId, { type: 'MOVE', location: pick }, nowMs);
      continue;
    }

    if (state.turnPhase === 'DRAW_OR_EXPLORE') {
      if (
        cur.location === 'radio' &&
        state.blackoutLocation !== cur.location &&
        cur.faction !== 'wanderer'
      ) {
        const mode = cur.faction === 'mist-order' ? 'mist' : 'signal';
        applyPlayerGameAction(state, cur.playerId, { type: 'ADJUST_TRACK', mode }, nowMs);
      } else {
        const decks: readonly BoardGameDeckId[] = ['clue', 'event', 'tactic'];
        const deckPick = decks[Math.floor(nextDeterministicRandom(state) * decks.length)] ?? 'event';
        applyPlayerGameAction(state, cur.playerId, { type: 'DRAW_CARD', deck: deckPick }, nowMs);
      }
      continue;
    }

    if (state.turnPhase === 'TACTICAL_ACTION') {
      appendPublicLog(
        state,
        'timeout',
        `${cur.displayName} hết giờ thao tác — máy chủ tự chuyển lượt.`,
        nowMs,
        cur.playerId,
      );
      advanceTurnPointer(state, nowMs);
      break;
    }

    break;
  }
}

export function listLegalMovesForLocation(loc: BoardGameLocationId): BoardGameLocationId[] {
  return KTX_LOCATIONS.map((l) => l.id).filter((id) => id !== loc);
}
