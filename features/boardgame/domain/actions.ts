// ---------------------------------------------------------------------------
// features/boardgame/domain/actions.ts — Bộ xử lý lệnh hợp lệ Bóng Đêm KTX v2
// (MOVE kề cận -> DRAW_OR_EXPLORE [INTERACT_LOC / DRAW_CARD] -> TACTICAL_ACTION
// [INVESTIGATE / USE_CARD / USE_SKILL / ATTACK / CONFRONT / DETONATE_PLOT /
// PUBLISH_DOSSIER / RECORD_HYPOTHESIS / REVEAL_ROLE / END_TURN]).
// ---------------------------------------------------------------------------

import type {
  BoardGameActionPayload,
  BoardGameLocationId,
} from '../../../shared/contracts/boardgame';
import {
  addCardToHand,
  appendEvidence,
  appendPrivateNote,
  appendPublicLog,
  applyDamage,
  applyDirectWounds,
  applyHeal,
  clampShieldForLocation,
  createActivityEvidence,
  createEquipmentTraitEvidence,
  drawCardFromDeck,
  grantShield,
  performLocationScanOrDisarm,
  pickInspectionTarget,
  recordCoPresenceForPlayer,
  resolveCardImmediateEffect,
} from './effects';
import { FACTION_LABELS, ROLES_BY_ID } from './roles';
import {
  getLocationName,
  getLocationShortLabel,
  isAdjacentLocation,
  isValidLocationId,
  listAdjacentDestinations,
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
    if (candidate && candidate.alive && !candidate.detained) {
      if (wrapped) {
        state.round += 1;
        if (state.blackoutRoundsLeft > 0) {
          state.blackoutRoundsLeft -= 1;
          if (state.blackoutRoundsLeft <= 0) {
            state.blackoutLocation = null;
          }
        }
        // Sang vòng mới: Mạch Quá Tải gài từ vòng trước chính thức phát cảnh báo toàn KTX (không nêu tên phòng)
        if (state.sabotagePlanted && !state.sabotageArmed) {
          state.sabotageArmed = true;
          appendPublicLog(
            state,
            'incident',
            `⚠️ CẢNH BÁO ĐÊM KHUYA (V${state.round}): Hệ thống KTX phát hiện 1 Mạch Quá Tải đang chờ kích nổ! Hãy mau tìm & gỡ trước khi bị kích hoạt!`,
            nowMs,
          );
          state.highlights.push({
            round: state.round,
            title: 'Báo động Mạch Quá Tải',
            detail: 'Phát hiện mạch gài ngầm trong hạ tầng KTX — chưa rõ khu vực nào!',
            atMs: nowMs,
          });
        }
        if (state.round > state.maxRounds) {
          evaluateVictoryState(state, nowMs, true);
          return;
        }
      }
      state.activeTurnIdx = nextIdx;
      state.turnPhase = 'MOVE';
      state.actionUsedThisTurn = false;
      state.hypothesisUpdatedThisTurn = false;
      candidate.healBlockedNextTurn = false;
      return;
    }
  }

  evaluateVictoryState(state, nowMs, true);
}

function executeRevealedRoleSkill(
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
    `${actor.displayName} LẬT VAI [${roleDef.name}] và kích hoạt "${roleDef.skillName}"!`,
    nowMs,
    actor.playerId,
  );
  state.highlights.push({
    round: state.round,
    title: `${actor.displayName} lật vai`,
    detail: `Công khai ${roleDef.name} (${roleDef.skillName}).`,
    atMs: nowMs,
  });

  switch (actor.roleId) {
    case 'gac-ky-thuat': {
      // Sửa lưới điện xuyên mất điện tại vị trí đang đứng + hồi 2 thương cho đồng đội cùng phòng
      performLocationScanOrDisarm(state, actor, actor.location, 'scan', nowMs, roleDef.skillName);
      const ally =
        targetPlayer && targetPlayer.alive && targetPlayer.location === actor.location
          ? targetPlayer
          : actor;
      applyHeal(ally, 2);
      return;
    }
    case 'gac-truc-ban': {
      grantShield(actor, 2);
      const target = pickInspectionTarget(state, actor, targetPlayer, true) ?? pickInspectionTarget(state, actor, targetPlayer, false);
      if (target) {
        createActivityEvidence(state, actor, target, roleDef.skillName, nowMs);
      }
      return;
    }
    case 'gac-radio': {
      grantShield(actor, 1);
      const card = drawCardFromDeck(state, 'tactic');
      if (card) addCardToHand(state, actor, card);
      if (actor.location === 'radio') {
        performLocationScanOrDisarm(state, actor, 'radio', 'scan', nowMs, roleDef.skillName);
      }
      return;
    }
    case 'suong-an-danh': {
      grantShield(actor, 1);
      state.blackoutLocation = actor.location;
      state.blackoutRoundsLeft = 1;
      const hist = state.tamperHistoryByLocation[actor.location];
      if (hist.length > 0) {
        hist.pop();
      }
      appendPrivateNote(
        state,
        actor,
        `[Cắt Cầu Dao] Đã ngắt điện ${getLocationShortLabel(actor.location)} và xóa dấu thao tác gần nhất tại phòng này.`,
        nowMs,
      );
      return;
    }
    case 'suong-tin-gia': {
      grantShield(actor, 1);
      const victim = pickInspectionTarget(state, actor, targetPlayer, true);
      if (victim) {
        if (!actor.dealtDamageRounds.includes(state.round)) {
          actor.dealtDamageRounds.push(state.round);
        }
        applyDamage(state, victim, 2, nowMs, `${actor.displayName} (${roleDef.skillName})`, {
          attacker: actor,
        });
      }
      return;
    }
    case 'suong-gac-cong': {
      const victim = pickInspectionTarget(state, actor, targetPlayer, true);
      if (victim) {
        victim.healBlockedNextTurn = true;
        if (!actor.dealtDamageRounds.includes(state.round)) {
          actor.dealtDamageRounds.push(state.round);
        }
        applyDamage(state, victim, 2, nowMs, `${actor.displayName} (${roleDef.skillName})`, {
          pierceShield: 1,
          attacker: actor,
        });
      }
      return;
    }
    case 'lang-anh-san': {
      grantShield(actor, 1);
      if (!actor.verifiedSceneLocations.includes(actor.location)) {
        actor.verifiedSceneLocations.push(actor.location);
      }
      const hist = state.tamperHistoryByLocation[actor.location];
      const latest = hist[hist.length - 1];
      appendEvidence(
        state,
        actor,
        {
          kind: 'scene',
          subjectLabel: `Trích xuất ${getLocationShortLabel(actor.location)}`,
          locationId: actor.location,
          summary: latest
            ? `Thu được dấu vết hiện trường từ ${latest.displayName} (V${latest.round}).`
            : `Đã xác thực hiện trường ${getLocationShortLabel(actor.location)}.`,
          sourceLabel: roleDef.skillName,
        },
        nowMs,
      );
      return;
    }
    case 'lang-quan-sat': {
      grantShield(actor, 2);
      const t = pickInspectionTarget(state, actor, targetPlayer, true);
      if (t) {
        if (!actor.metPlayerIds.includes(t.playerId)) actor.metPlayerIds.push(t.playerId);
        createEquipmentTraitEvidence(state, actor, t, false, roleDef.skillName, nowMs);
      }
      return;
    }
    case 'lang-cuu-ho': {
      actor.bodyguardActive = true;
      const ward = actor.wardPlayerId
        ? state.players.find((p) => p.playerId === actor.wardPlayerId && p.alive) ?? null
        : null;
      const healTarget = ward ?? (targetPlayer && targetPlayer.alive ? targetPlayer : actor);
      applyHeal(healTarget, 3);
      grantShield(healTarget, 2);
      if (ward && healTarget.playerId === ward.playerId) {
        actor.wardProtectionsCount += 1;
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
  if (!actor || !actor.alive || actor.detained) {
    return { ok: false, reason: 'Bạn không còn quyền hành động trong ván này.' };
  }
  const active = getActivePlayer(state);
  if (!active || active.playerId !== playerId) {
    return { ok: false, reason: 'Chưa tới lượt của bạn.' };
  }

  // Cho phép tự lật vai công khai bất kỳ lúc nào trong lượt mình (nhận +1 Khiên tinh thần)
  if (action.type === 'REVEAL_ROLE') {
    if (actor.revealed) {
      return { ok: false, reason: 'Bạn đã công khai danh tính trước đó.' };
    }
    actor.revealed = true;
    grantShield(actor, 1);
    if (actor.roleId === 'lang-cuu-ho') {
      actor.bodyguardActive = true;
    }
    const roleDef = ROLES_BY_ID[actor.roleId];
    appendPublicLog(
      state,
      'reveal',
      `${actor.displayName} tự công khai danh tính: ${roleDef.name} (${FACTION_LABELS[actor.faction]})!`,
      nowMs,
      actor.playerId,
    );
    evaluateVictoryState(state, nowMs, false);
    return { ok: true };
  }

  // Ghi nhận giả thuyết (thao tác sổ tay miễn phí 1 lần/lượt trước khi hết lượt)
  if (action.type === 'RECORD_HYPOTHESIS') {
    if (state.hypothesisUpdatedThisTurn) {
      return { ok: false, reason: 'Bạn đã cập nhật giả thuyết trong lượt này rồi.' };
    }
    const target = state.players.find(
      (p) => p.playerId === action.targetPlayerId && p.playerId !== actor.playerId && p.alive,
    );
    if (!target) {
      return { ok: false, reason: 'Mục tiêu giả thuyết không hợp lệ.' };
    }
    if (target.revealed) {
      return { ok: false, reason: 'Chỉ được ghi giả thuyết cho sinh viên CHƯA lật vai.' };
    }
    if (!actor.metPlayerIds.includes(target.playerId)) {
      return { ok: false, reason: 'Hãy gặp mặt hoặc điều tra sinh viên này trước khi chốt giả thuyết.' };
    }
    const existingIdx = actor.hypotheses.findIndex((h) => h.targetPlayerId === target.playerId);
    const nextEntry = {
      targetPlayerId: target.playerId,
      targetName: target.displayName,
      predictedFaction: action.predictedFaction,
      recordedRound: state.round,
    };
    if (existingIdx >= 0) {
      actor.hypotheses[existingIdx] = nextEntry;
    } else {
      if (actor.hypotheses.length >= 3) {
        actor.hypotheses.shift();
      }
      actor.hypotheses.push(nextEntry);
    }
    state.hypothesisUpdatedThisTurn = true;
    appendPrivateNote(
      state,
      actor,
      `[Giả Thuyết] Ghi nhận ${target.displayName} → ${FACTION_LABELS[action.predictedFaction]}.`,
      nowMs,
    );
    return { ok: true };
  }

  // Pha 1: MOVE (Bắt buộc di chuyển sang ô KỀ CẬN)
  if (state.turnPhase === 'MOVE') {
    if (action.type !== 'MOVE') {
      return { ok: false, reason: 'Đang ở pha Di chuyển: hãy chọn 1 khu vực kề cận.' };
    }
    if (!isValidLocationId(action.location) || action.location === actor.location) {
      return { ok: false, reason: 'Hãy chọn một khu vực khác với vị trí đang đứng.' };
    }
    if (!isAdjacentLocation(actor.location, action.location)) {
      return { ok: false, reason: 'Chỉ được di chuyển tới khu vực có đường nối kề cận (trừ khi dùng Giấy Thông Hành).' };
    }

    actor.location = action.location;
    clampShieldForLocation(actor);
    if (!actor.visitedLocations.includes(action.location)) {
      actor.visitedLocations.push(action.location);
    }
    actor.recentMoves.push({ round: state.round, location: action.location });
    if (actor.recentMoves.length > 6) {
      actor.recentMoves = actor.recentMoves.slice(-6);
    }
    state.lastVisitorByLocation[action.location] = actor.playerId;
    recordCoPresenceForPlayer(state, actor);

    appendPublicLog(
      state,
      'move',
      `${actor.displayName} di chuyển tới ${getLocationName(action.location)}.`,
      nowMs,
      actor.playerId,
    );

    state.turnPhase = 'DRAW_OR_EXPLORE';
    evaluateVictoryState(state, nowMs, false);
    return { ok: true };
  }

  // Pha 2: DRAW_OR_EXPLORE (Khảo sát khu vực hoặc Rút thẻ)
  if (state.turnPhase === 'DRAW_OR_EXPLORE') {
    if (action.type === 'INTERACT_LOC') {
      if (state.blackoutLocation === actor.location) {
        return { ok: false, reason: 'Khu vực này đang mất điện cục bộ trong vòng này — không thể thao tác thiết bị.' };
      }
      const mode = action.mode === 'sabotage' ? 'sabotage' : 'scan';
      const scanRes = performLocationScanOrDisarm(
        state,
        actor,
        actor.location,
        mode,
        nowMs,
        `Khảo sát ${getLocationShortLabel(actor.location)}`,
      );
      if (!scanRes.ok) return scanRes;
      state.turnPhase = 'TACTICAL_ACTION';
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
    }

    if (action.type !== 'DRAW_CARD') {
      return { ok: false, reason: 'Đang ở pha Khảo sát: hãy Khảo sát khu vực hoặc Rút 1 lá bài.' };
    }

    const deck =
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
        `${actor.displayName} rút thẻ ${deck === 'clue' ? 'Điều tra' : 'Sự kiện'}: "${card.title}".`,
        nowMs,
        actor.playerId,
      );
      resolveCardImmediateEffect(state, actor, card, null, null, undefined, nowMs);
      state.discards[deck].push(card.id);
    }

    state.turnPhase = 'TACTICAL_ACTION';
    if (!evaluateVictoryState(state, nowMs, false) && (!actor.alive || actor.detained)) {
      advanceTurnPointer(state, nowMs);
    }
    return { ok: true };
  }

  // Pha 3: TACTICAL_ACTION
  if (state.turnPhase === 'TACTICAL_ACTION') {
    if (action.type === 'END_TURN') {
      appendPublicLog(state, 'system', `${actor.displayName} kết thúc lượt.`, nowMs, actor.playerId);
      advanceTurnPointer(state, nowMs);
      return { ok: true };
    }

    if (state.actionUsedThisTurn) {
      return { ok: false, reason: 'Bạn đã thực hiện hành động chính lượt này; hãy bấm Kết thúc lượt.' };
    }

    if (action.type === 'INVESTIGATE') {
      const target = state.players.find((p) => p.playerId === action.targetPlayerId && p.alive);
      if (!target || target.playerId === actor.playerId) {
        return { ok: false, reason: 'Hãy chọn sinh viên còn sống hợp lệ để điều tra.' };
      }
      const inRange =
        target.location === actor.location ||
        (actor.location === 'court' && isAdjacentLocation('court', target.location));
      if (!inRange) {
        return {
          ok: false,
          reason: 'Chỉ điều tra được người đứng cùng phòng (hoặc ô kề cận khi ở Sân Bóng Rổ).',
        };
      }
      if (!actor.metPlayerIds.includes(target.playerId)) {
        actor.metPlayerIds.push(target.playerId);
      }

      const focus = action.focus === 'activity' ? 'activity' : 'equipment';
      if (focus === 'activity') {
        createActivityEvidence(state, actor, target, 'Điều Tra Hành Tung', nowMs);
      } else {
        createEquipmentTraitEvidence(state, actor, target, false, 'Kiểm Tra Trang Bị', nowMs);
      }

      appendPublicLog(
        state,
        'investigate',
        `${actor.displayName} tiến hành điều tra (${focus === 'activity' ? 'hành tung' : 'trang bị'}) đối với ${target.displayName}.`,
        nowMs,
        actor.playerId,
      );
      state.actionUsedThisTurn = true;
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
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
      const explicitSecond = action.targetSecondPlayerId
        ? state.players.find((p) => p.playerId === action.targetSecondPlayerId && p.alive) ?? null
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

      resolveCardImmediateEffect(
        state,
        actor,
        card,
        explicitTarget,
        explicitSecond,
        action.targetLocation,
        nowMs,
      );
      state.discards[card.deck].push(card.id);
      state.actionUsedThisTurn = true;
      if (!evaluateVictoryState(state, nowMs, false) && (!actor.alive || actor.detained)) {
        advanceTurnPointer(state, nowMs);
      }
      return { ok: true };
    }

    if (action.type === 'USE_SKILL') {
      const target = action.targetPlayerId
        ? state.players.find((p) => p.playerId === action.targetPlayerId && p.alive) ?? null
        : null;

      // Vy (suong-tin-gia) dùng lén khi chưa lật: cấy nhiễu giả mà KHÔNG lộ vai!
      if (actor.roleId === 'suong-tin-gia' && !actor.revealed) {
        if (actor.covertSkillUsed) {
          return { ok: false, reason: 'Bạn đã dùng khả năng lén trong ván này rồi.' };
        }
        const roomVictim =
          target && target.playerId !== actor.playerId && target.location === actor.location
            ? target
            : state.players.find(
                (p) => p.alive && p.playerId !== actor.playerId && p.location === actor.location,
              ) ?? null;
        if (!roomVictim) {
          return { ok: false, reason: 'Cần có 1 sinh viên khác đứng cùng phòng để gieo nhiễu giả bí mật.' };
        }
        actor.covertSkillUsed = true;
        if (!roomVictim.plantedDecoyRounds.includes(state.round)) {
          roomVictim.plantedDecoyRounds.push(state.round);
        }
        appendPrivateNote(
          state,
          actor,
          `[Gieo Nhiễu Giả - Ẩn Danh] Đã gài dấu thao tác kỹ thuật giả lên ${roomVictim.displayName} mà không lộ danh tính.`,
          nowMs,
        );
        appendPublicLog(
          state,
          'scene',
          `${actor.displayName} quan sát kỹ xung quanh tại ${getLocationShortLabel(actor.location)}.`,
          nowMs,
          actor.playerId,
        );
        state.actionUsedThisTurn = true;
        evaluateVictoryState(state, nowMs, false);
        return { ok: true };
      }

      if (actor.skillUsed) {
        return { ok: false, reason: 'Kỹ năng nhân vật đã được sử dụng.' };
      }
      executeRevealedRoleSkill(state, actor, target, nowMs);
      state.actionUsedThisTurn = true;
      if (!evaluateVictoryState(state, nowMs, false) && (!actor.alive || actor.detained)) {
        advanceTurnPointer(state, nowMs);
      }
      return { ok: true };
    }

    if (action.type === 'ATTACK') {
      const target = state.players.find(
        (p) => p.playerId === action.targetPlayerId && p.alive && !p.detained,
      );
      if (!target || target.playerId === actor.playerId) {
        return { ok: false, reason: 'Hãy chọn mục tiêu còn khả năng hành động hợp lệ.' };
      }
      if (target.location !== actor.location) {
        return { ok: false, reason: 'Chỉ được Công kích người đứng cùng khu vực với bạn.' };
      }
      if (!actor.dealtDamageRounds.includes(state.round)) {
        actor.dealtDamageRounds.push(state.round);
      }
      const pierce = actor.roleId === 'suong-gac-cong' && actor.revealed ? 1 : 0;
      const dmgRes = applyDamage(state, target, 2, nowMs, `${actor.displayName} (Công kích)`, {
        pierceShield: pierce,
        attacker: actor,
      });
      appendPublicLog(
        state,
        'attack',
        `${actor.displayName} công kích ${target.displayName} (gây ${dmgRes.hpLost} vết thương, Khiên đỡ ${dmgRes.shieldAbsorbed}).`,
        nowMs,
        actor.playerId,
      );
      state.actionUsedThisTurn = true;
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
    }

    if (action.type === 'CONFRONT') {
      if (state.round < 3) {
        return { ok: false, reason: 'Chỉ được mở Đối Chất chính thức từ Vòng 3 trở đi.' };
      }
      if (actor.confrontUsed) {
        return { ok: false, reason: 'Mỗi sinh viên chỉ được quyền Đối Chất tối đa 1 lần mỗi ván.' };
      }
      const anywhereAllowed = state.breakerSealed && state.radioSealed;
      if (!anywhereAllowed && actor.location !== 'lobby' && actor.location !== 'breaker') {
        return {
          ok: false,
          reason: 'Cần đứng ở Sảnh KTX hoặc Phòng Cầu Dao (hoặc niêm phong đủ Cầu Dao & Phát Thanh) để Đối Chất.',
        };
      }
      const target = state.players.find(
        (p) => p.playerId === action.targetPlayerId && p.playerId !== actor.playerId && p.alive,
      );
      if (!target || target.revealed || target.detained) {
        return { ok: false, reason: 'Chỉ được Đối Chất sinh viên còn sống và CHƯA lật vai.' };
      }
      if (!anywhereAllowed && target.location !== actor.location) {
        return { ok: false, reason: 'Mục tiêu Đối Chất phải đứng cùng phòng với bạn.' };
      }

      actor.confrontUsed = true;
      state.actionUsedThisTurn = true;

      if (target.faction === 'mist-order') {
        target.revealed = true;
        target.detained = true;
        const rName = ROLES_BY_ID[target.roleId].name;
        appendPublicLog(
          state,
          'confront',
          `⚖️ ĐỐI CHẤT CHÍNH XÁC! ${actor.displayName} vạch trần ${target.displayName} là [${rName} · Hội Màn Sương] và TẠM GIỮ thành công!`,
          nowMs,
          actor.playerId,
        );
        state.highlights.push({
          round: state.round,
          title: `Tạm giữ ${target.displayName}`,
          detail: `${actor.displayName} đối chất chính xác Hội Màn Sương.`,
          atMs: nowMs,
        });
      } else {
        state.falseAccusationCount += 1;
        applyDirectWounds(state, actor, 2, nowMs, 'Phản chấn Đối Chất sai');
        if (state.sabotagePlanted && !state.sabotageArmed) {
          state.sabotageArmed = true;
          appendPublicLog(
            state,
            'incident',
            `⚠️ Nhân lúc hoảng loạn sau cáo buộc sai, Mạch Quá Tải gài ngầm trong KTX đã chuyển sang trạng thái CHỜ KÍCH NỔ!`,
            nowMs,
          );
        }
        appendPublicLog(
          state,
          'confront',
          `❌ ĐỐI CHẤT SAI NGƯỜI! ${target.displayName} không thuộc Hội Màn Sương — ${actor.displayName} chịu phản chấn 2 vết thương trực tiếp!`,
          nowMs,
          actor.playerId,
        );
      }

      if (!evaluateVictoryState(state, nowMs, false) && !actor.alive) {
        advanceTurnPointer(state, nowMs);
      }
      return { ok: true };
    }

    if (action.type === 'DETONATE_PLOT') {
      if (actor.faction !== 'mist-order') {
        return { ok: false, reason: 'Chỉ Hội Màn Sương mới có thể kích nổ Mạch Quá Tải.' };
      }
      if (!state.sabotageArmed || !state.sabotagePlanted || state.sabotagePlantedRound === null) {
        return { ok: false, reason: 'Chưa có Mạch Quá Tải nào được gài và kích hoạt chờ nổ.' };
      }
      if (state.round <= state.sabotagePlantedRound) {
        return { ok: false, reason: 'Phải sang vòng kế tiếp sau khi gài mạch mới được phép kích nổ.' };
      }
      const canRemote = actor.revealed && actor.location === 'radio';
      if (actor.location !== state.secretSabotageLocation && !canRemote) {
        return {
          ok: false,
          reason: `Hãy đứng tại ${getLocationShortLabel(state.secretSabotageLocation)} (hoặc lật vai tại Phát Thanh) để kích nổ!`,
        };
      }
      state.plotDetonated = true;
      state.actionUsedThisTurn = true;
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
    }

    if (action.type === 'PUBLISH_DOSSIER') {
      if (actor.roleId !== 'lang-anh-san') {
        return { ok: false, reason: 'Chỉ vai Hải (Người Săn Gói Tin) mới thực hiện được hành động này.' };
      }
      if (state.round < 4) {
        return { ok: false, reason: 'Chỉ được Công Bố Hồ Sơ trên sóng từ Vòng 4 trở đi.' };
      }
      if (actor.location !== 'radio') {
        return { ok: false, reason: 'Bạn phải có mặt tại Phòng Phát Thanh để phát sóng hồ sơ.' };
      }
      if (actor.verifiedSceneLocations.length < 2 || actor.evidenceList.length < 3) {
        return {
          ok: false,
          reason: `Cần xác thực >= 2 hiện trường kỹ thuật (${actor.verifiedSceneLocations.length}/2) và >= 3 chứng cứ (${actor.evidenceList.length}/3).`,
        };
      }
      actor.revealed = true;
      state.dossierPublishedBy = actor.playerId;
      state.actionUsedThisTurn = true;
      evaluateVictoryState(state, nowMs, false);
      return { ok: true };
    }
  }

  return { ok: false, reason: 'Hành động không hợp lệ ở pha hiện tại.' };
}

/**
 * Timeout 100% trung lập phe — KHÔNG bao giờ đọc `faction`, `roleId`, `hand` hay `secretSabotageLocation`.
 * Hai trạng thái công khai giống nhau sẽ luôn cho kết quả công khai giống nhau khi hết giờ.
 */
export function applyTimeoutAutoTurn(state: AuthoritativeGameState, nowMs: number): void {
  if (state.finished) return;
  const active = getActivePlayer(state);
  if (!active || !active.alive || active.detained) {
    advanceTurnPointer(state, nowMs);
    return;
  }

  if (state.turnPhase === 'MOVE') {
    grantShield(active, 1);
  }

  appendPublicLog(
    state,
    'timeout',
    `⏳ ${active.displayName} hết giờ thao tác — giữ vị trí phòng thủ và tự động chuyển lượt.`,
    nowMs,
    active.playerId,
  );
  advanceTurnPointer(state, nowMs);
}

export function listLegalMovesForLocation(loc: BoardGameLocationId): BoardGameLocationId[] {
  return listAdjacentDestinations(loc);
}
