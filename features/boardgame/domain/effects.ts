// ---------------------------------------------------------------------------
// features/boardgame/domain/effects.ts — Thực thi hiệu ứng vị trí, rút bài,
// thẻ Điều tra có điều kiện, Trang bị, Sự kiện, Chiến đấu, Lật vai & Kỹ năng v3.
//
// Bảo mật P0:
// - `publicLog` chỉ tăng `state.publicLogSeq` (KHÔNG bao giờ dùng chung `seqCounter`
//   với ghi chú riêng tư hay manh mối điều tra để tránh lộ chỉ số ID).
// - Nhân vật chưa lật vai KHÔNG tạo ra hiệu ứng công khai khác biệt.
// ---------------------------------------------------------------------------

import type {
  BoardGameDeckId,
  BoardGameLocationId,
  BoardGamePublicLogEntry,
} from '../../../shared/contracts/boardgame';
import { CARDS_BY_ID } from './cards';
import { FACTION_LABELS, ROLES_BY_ID } from './roles';
import {
  BOARD_GAME_MAX_EQUIPPED,
  BOARD_GAME_MAX_HAND,
  BOARD_GAME_MAX_SHIELD,
  canPlayerInvestigateTarget,
  canPlayerUseSkillRange,
  getLocationName,
  hasEquippedEffect,
  listLegalMovesForLocation,
  shuffleWithRng,
} from './rules';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  GameCard,
} from './types';
import { evaluateVictoryState, finalizeMatchOutcome } from './victory';

const DECK_LABELS: Record<BoardGameDeckId, string> = {
  investigation: 'Điều tra',
  equipment: 'Trang bị',
  event: 'Sự kiện',
};

export function appendPublicLog(
  state: AuthoritativeGameState,
  kind: BoardGamePublicLogEntry['kind'],
  text: string,
  nowMs: number,
  actorId?: string | null,
): void {
  state.publicLogSeq += 1;
  state.publicLog.push({
    id: `log-${state.publicLogSeq}`,
    round: state.round,
    atMs: nowMs,
    kind,
    text,
    actorId: actorId ?? null,
  });
}

export function appendPrivateNote(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  text: string,
  nowMs: number,
): void {
  state.seqCounter += 1;
  player.privateNotes.push({
    id: `note-${state.seqCounter}`,
    round: state.round,
    atMs: nowMs,
    text,
  });
}

export function appendPrivateClue(
  state: AuthoritativeGameState,
  investigator: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
  cardTitle: string,
  outcome: 'condition-met' | 'no-reaction',
  detail: string,
  nowMs: number,
): void {
  state.seqCounter += 1;
  investigator.privateClues.push({
    id: `clue-${state.seqCounter}`,
    round: state.round,
    atMs: nowMs,
    cardTitle,
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome,
    detail,
  });
}

export function appendHighlight(
  state: AuthoritativeGameState,
  title: string,
  detail: string,
  nowMs: number,
): void {
  state.seqCounter += 1;
  state.highlights.push({
    round: state.round,
    title,
    detail,
    atMs: nowMs,
  });
}

export function addTempShield(player: AuthoritativePlayerState, amount: number): number {
  const before = player.tempShield;
  player.tempShield = Math.min(BOARD_GAME_MAX_SHIELD, player.tempShield + Math.max(0, amount));
  if (amount > 0) {
    player.gainedShieldThisTurn = true;
  }
  return player.tempShield - before;
}

export function healPlayerWounds(player: AuthoritativePlayerState, amount: number): number {
  if (!player.alive) return 0;
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + Math.max(0, amount));
  return player.hp - before;
}

export function drawCardFromDeck(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  deck: BoardGameDeckId,
  nowMs: number,
): GameCard | null {
  if (state.decks[deck].length === 0 && state.discards[deck].length > 0) {
    state.decks[deck] = shuffleWithRng(state.discards[deck], state);
    state.discards[deck] = [];
  }
  const cardId = state.decks[deck].shift();
  if (!cardId) return null;
  const card = CARDS_BY_ID[cardId];
  if (!card) return null;

  if (player.hand.length >= BOARD_GAME_MAX_HAND) {
    const dropped = player.hand.shift();
    if (dropped) {
      state.discards[dropped.deck].push(dropped.id);
      appendPrivateNote(
        state,
        player,
        `Tay bài đầy (${BOARD_GAME_MAX_HAND} lá) — bỏ bớt "${dropped.title}" để nhận "${card.title}".`,
        nowMs,
      );
    }
  }
  player.hand.push(card);
  return card;
}

export function discardCardFromHand(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  cardId: string,
): GameCard | null {
  const idx = player.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;
  const [removed] = player.hand.splice(idx, 1);
  if (!removed) return null;
  state.discards[removed.deck].push(removed.id);
  return removed;
}

export function applyNonLethalPressureDamage(
  state: AuthoritativeGameState,
  target: AuthoritativePlayerState,
  amount: number,
  sourceType: 'investigation' | 'event',
  nowMs: number,
): { dealt: number; blockedReason: string | null } {
  if (!target.alive || amount <= 0) return { dealt: 0, blockedReason: null };
  if (hasEquippedEffect(target, 'eq-goggles')) {
    return { dealt: 0, blockedReason: 'Kính Chắn Bụi' };
  }
  if (
    sourceType === 'event' &&
    target.revealed &&
    target.roleId === 'gac-ky-thuat' &&
    target.equipped.length >= 1
  ) {
    return { dealt: 0, blockedReason: 'Tay Nghề Minh' };
  }

  const floorHp = Math.max(1, target.hp);
  if (target.hp <= 1) {
    appendPrivateNote(state, target, 'Bạn chịu áp lực nhẹ ở mức giới hạn (giữ ở 1 HP).', nowMs);
    return { dealt: 0, blockedReason: null };
  }
  const dealt = Math.min(amount, floorHp - 1);
  target.hp -= dealt;
  return { dealt, blockedReason: null };
}

export function eliminatePlayer(
  state: AuthoritativeGameState,
  victim: AuthoritativePlayerState,
  killer: AuthoritativePlayerState | null,
  nowMs: number,
): void {
  if (!victim.alive) return;
  victim.alive = false;
  victim.hp = 0;
  victim.tempShield = 0;
  victim.wardedUntilRound = 0;
  victim.exposedMark = 0;
  victim.eliminatedByPlayerId = killer?.playerId ?? null;

  for (const eq of victim.equipped) {
    state.discards[eq.deck].push(eq.id);
  }
  victim.equipped = [];

  for (const card of victim.hand) {
    state.discards[card.deck].push(card.id);
  }
  victim.hand = [];

  if (killer) {
    killer.eliminatedPlayerIds.push(victim.playerId);
    // Nếu Bình kết liễu kẻ từng hạ gục Mục tiêu Bảo hộ của mình -> kích hoạt trả thù
    for (const p of state.players) {
      if (p.roleId === 'lang-cuu-ho' && p.protegePlayerId && p.playerId === killer.playerId) {
        const protege = state.players.find((x) => x.playerId === p.protegePlayerId);
        if (protege && !protege.alive && protege.eliminatedByPlayerId === victim.playerId) {
          p.avengedProtegeKiller = true;
          appendPrivateNote(
            state,
            p,
            `Bạn đã kết liễu ${victim.displayName} — hoàn thành báo thù cho Mục tiêu Bảo hộ!`,
            nowMs,
          );
        }
      }
    }
  }

  const wasHidden = !victim.revealed;
  victim.revealed = true;
  const roleDef = ROLES_BY_ID[victim.roleId];
  if (wasHidden) {
    state.seqCounter += 1;
    state.lastRevealEvent = {
      id: `reveal-${state.seqCounter}`,
      round: state.round,
      atMs: nowMs,
      playerId: victim.playerId,
      displayName: victim.displayName,
      roleId: victim.roleId,
      roleName: roleDef.name,
      faction: victim.faction,
      reason: 'eliminated',
    };
  }

  appendHighlight(
    state,
    `${victim.displayName} Bị Loại`,
    `Lộ danh tính: ${roleDef.name} (${FACTION_LABELS[victim.faction]}).`,
    nowMs,
  );
  appendPublicLog(
    state,
    'elimination',
    `💀 ${victim.displayName} đã kiệt sức và bị loại! Lộ vai: ${roleDef.name} (${FACTION_LABELS[victim.faction]}).`,
    nowMs,
    victim.playerId,
  );
}

export function resolveAttackStrike(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
  baseDamage: number,
  nowMs: number,
  sourceLabel: string,
  options: { isNormalAttack: boolean } = { isNormalAttack: true },
): { ok: true; shieldedOut: boolean } {
  const targetWoundsBefore = Math.max(0, target.maxHp - target.hp);
  let bonus = 0;

  if (options.isNormalAttack) {
    if (hasEquippedEffect(actor, 'eq-flashlight') && (target.revealed || targetWoundsBefore >= 2)) {
      bonus += 1;
    }
    if (
      actor.courtAttackBonusThisTurn &&
      state.courtRangeJammedRound !== state.round &&
      (target.revealed || targetWoundsBefore >= 2)
    ) {
      bonus += 1;
    }
    if (actor.revealed && actor.roleId === 'suong-gac-cong' && targetWoundsBefore >= 3) {
      bonus += 1;
    }
  }

  if (target.exposedMark > 0) {
    bonus += 1;
    target.exposedMark = 0;
  }

  // Giới hạn thưởng tấn công tối đa +2 (tổng sát thương gốc tối đa 4 điểm)
  let rawDmg = Math.min(4, baseDamage + Math.min(2, bonus));

  // Chống đánh bừa (Unprovoked Composure)
  let unprovokedComposureTriggered = false;
  const ignoreComposure = actor.revealed && actor.roleId === 'suong-an-danh';
  if (
    options.isNormalAttack &&
    !ignoreComposure &&
    !target.revealed &&
    target.attacksMade === 0 &&
    !actor.investigatedTargetIds.includes(target.playerId)
  ) {
    rawDmg = Math.max(1, rawDmg - 1);
    unprovokedComposureTriggered = true;
  }

  if (hasEquippedEffect(target, 'eq-windbreaker')) {
    rawDmg = Math.max(1, rawDmg - 1);
  }

  const wardActive = target.wardedUntilRound >= state.turnNumber;
  if (wardActive) {
    rawDmg = Math.max(1, rawDmg - 1);
  }

  const absorbedByShield = Math.min(target.tempShield, rawDmg);
  target.tempShield -= absorbedByShield;
  let hpDmg = rawDmg - absorbedByShield;

  if (wardActive && target.hp - hpDmg < 1) {
    hpDmg = Math.max(0, target.hp - 1);
  }

  target.hp = Math.max(0, target.hp - hpDmg);
  actor.attacksMade += 1;
  actor.actedThisRound = true;

  const extraTags: string[] = [];
  if (absorbedByShield > 0) extraTags.push(`-${absorbedByShield} Giáp`);
  if (unprovokedComposureTriggered) extraTags.push('Bình Tĩnh Tự Vệ');

  appendPublicLog(
    state,
    'attack',
    `⚔️ ${actor.displayName} ${sourceLabel} ${target.displayName}: ${hpDmg} vết thương${
      extraTags.length > 0 ? ` (${extraTags.join(', ')})` : ''
    }.`,
    nowMs,
    actor.playerId,
  );

  if (target.hp <= 0) {
    eliminatePlayer(state, target, actor, nowMs);

    // Kỷ luật Đội Gác Đèn: Gác Đèn hạ nhầm Gác Đèn bị sốc 2 vết thương & rơi 1 trang bị
    if (
      options.isNormalAttack &&
      actor.faction === 'lantern-guard' &&
      target.faction === 'lantern-guard' &&
      actor.alive
    ) {
      const shock = actor.hp > 1 ? Math.min(2, actor.hp - 1) : 0;
      actor.hp -= shock;
      const droppedEq = actor.equipped.shift();
      if (droppedEq) {
        state.discards[droppedEq.deck].push(droppedEq.id);
      }
      appendHighlight(
        state,
        'Kỷ Luật Nội Trú',
        `${actor.displayName} hạ nhầm đồng đội Gác Đèn (${target.displayName}), chịu ${shock} sốc tâm lý!`,
        nowMs,
      );
      appendPublicLog(
        state,
        'attack',
        `🚨 Kỷ luật Đội Gác Đèn: ${actor.displayName} đánh gục đồng đội và chịu ${shock} vết thương phản chấn${
          droppedEq ? ` cùng rơi "${droppedEq.title}"` : ''
        }!`,
        nowMs,
        actor.playerId,
      );
    }
  } else {
    if (unprovokedComposureTriggered) {
      addTempShield(target, 1);
      appendPrivateNote(
        state,
        target,
        `Bình Tĩnh Tự Vệ: bạn bị đánh khi chưa khiêu khích nên nhận thêm +1 Giáp tạm.`,
        nowMs,
      );
    }
    if (
      options.isNormalAttack &&
      target.location === actor.location &&
      hasEquippedEffect(target, 'eq-alarm-whistle')
    ) {
      const exits = listLegalMovesForLocation(actor.location).filter((id) => id !== actor.location);
      const pushTo = exits[state.round % exits.length];
      if (pushTo) {
        actor.location = pushTo;
        if (!actor.visitedLocations.includes(pushTo)) actor.visitedLocations.push(pushTo);
        actor.recentTrail = [...actor.recentTrail.slice(-5), pushTo];
        appendPublicLog(
          state,
          'equipment',
          `📣 Còi Báo Động của ${target.displayName} vang lên, đẩy ${actor.displayName} dạt sang ${getLocationName(pushTo)}!`,
          nowMs,
          target.playerId,
        );
      }
    }
  }

  evaluateVictoryState(state, nowMs, false);
  return { ok: true, shieldedOut: hpDmg === 0 };
}

export function executeExploreLocation(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): { ok: true; gainedShieldThisTurn: boolean } {
  const loc = actor.location;
  let gainedShield = false;

  if (loc === 'lobby') {
    const healed = healPlayerWounds(actor, 1);
    if (healed > 0) {
      appendPublicLog(
        state,
        'explore',
        `🩺 ${actor.displayName} sơ cứu tại Sảnh KTX (hồi 1 vết thương).`,
        nowMs,
        actor.playerId,
      );
    } else {
      addTempShield(actor, 1);
      gainedShield = true;
      appendPublicLog(
        state,
        'explore',
        `🛡️ ${actor.displayName} trực tại Sảnh KTX (+1 Giáp tạm).`,
        nowMs,
        actor.playerId,
      );
    }
  } else if (loc === 'canteen') {
    const drawn = drawCardFromDeck(state, actor, 'equipment', nowMs);
    appendPublicLog(
      state,
      'explore',
      `🍜 ${actor.displayName} tiếp tế tại Căng Tin và nhận 1 thẻ Trang bị.`,
      nowMs,
      actor.playerId,
    );
    if (drawn) {
      appendPrivateNote(state, actor, `Tiếp tế Căng Tin nhận: "${drawn.title}".`, nowMs);
    }
  } else if (loc === 'court') {
    actor.extendedRangeThisTurn = true;
    actor.courtAttackBonusThisTurn = true;
    appendPublicLog(
      state,
      'explore',
      `🏀 ${actor.displayName} lấy tầm nhìn cao tại Sân Bóng Rổ (mở tầm kề phòng lượt này).`,
      nowMs,
      actor.playerId,
    );
  } else if (loc === 'radio') {
    actor.globalInvestigateThisTurn = true;
    const drawn = drawCardFromDeck(state, actor, 'investigation', nowMs);
    appendPublicLog(
      state,
      'explore',
      `📻 ${actor.displayName} mở Sóng toàn khu tại Phòng Phát Thanh và nhận 1 thẻ Điều tra.`,
      nowMs,
      actor.playerId,
    );
    if (drawn) {
      appendPrivateNote(state, actor, `Phòng Phát Thanh cấp thẻ: "${drawn.title}".`, nowMs);
    }
  } else if (loc === 'corridor') {
    addTempShield(actor, 1);
    gainedShield = true;
    appendPublicLog(
      state,
      'explore',
      `🧭 ${actor.displayName} cơ động dọc Hành Lang B7 (+1 Giáp tạm).`,
      nowMs,
      actor.playerId,
    );
  } else {
    // breaker
    addTempShield(actor, 1);
    actor.exposedMark = 0;
    gainedShield = true;
    appendPublicLog(
      state,
      'explore',
      `🛡️ ${actor.displayName} kiểm tra chốt Bảo Vệ (+1 Giáp tạm & xóa hở sườn).`,
      nowMs,
      actor.playerId,
    );
  }

  return { ok: true, gainedShieldThisTurn: gainedShield };
}

export function resolveInvestigationCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
  card: GameCard,
  nowMs: number,
): { ok: true } | { ok: false; reason: string } {
  if (!canPlayerInvestigateTarget(state, actor, target)) {
    return {
      ok: false,
      reason: 'Mục tiêu ở ngoài tầm điều tra (cần cùng/kề phòng, đứng Phát Thanh, có Bộ Đàm hoặc Khánh đã lật).',
    };
  }

  discardCardFromHand(state, actor, card.id);
  actor.investigationsCount += 1;
  actor.actedThisRound = true;
  if (!actor.investigatedTargetIds.includes(target.playerId)) {
    actor.investigatedTargetIds.push(target.playerId);
  }

  let met = false;
  let publicMessage = '';
  let privateDetail = '';

  switch (card.effectKind) {
    case 'inv-mist-or-13': {
      met = target.faction === 'mist-order' || target.maxHp === 13;
      if (met) {
        const res = applyNonLethalPressureDamage(state, target, 1, 'investigation', nowMs);
        publicMessage = res.dealt > 0
          ? `Có phản ứng! ${target.displayName} chịu 1 vết thương áp lực (khớp Màn Sương hoặc 13 HP).`
          : `Có phản ứng (${res.blockedReason ?? 'đã chặn/tới sàn 1 HP'})!`;
        privateDetail = `Điều kiện khớp (${card.conditionText}): ${target.displayName} thuộc nhóm {Minh, Tú, Vy, Dũng, Bình}.`;
      } else {
        publicMessage = `Không có phản ứng với "${card.title}".`;
        privateDetail = `Không khớp (${card.conditionText}): ${target.displayName} thuộc nhóm {Lan, Khánh, Hải, Trang}.`;
      }
      break;
    }
    case 'inv-guard-or-12': {
      met = target.faction === 'lantern-guard' || target.maxHp === 12;
      if (met) {
        const healed = healPlayerWounds(target, 1);
        publicMessage = healed > 0
          ? `Có phản ứng! ${target.displayName} được hồi 1 vết thương theo danh sách trực.`
          : `Có phản ứng! ${target.displayName} khớp điều kiện (đang đầy máu nên không đổi vết thương).`;
        privateDetail = `Điều kiện khớp (${card.conditionText}): ${target.displayName} thuộc nhóm {Minh, Lan, Khánh, Tú, Hải}.`;
      } else {
        publicMessage = `Không có phản ứng với "${card.title}".`;
        privateDetail = `Không khớp (${card.conditionText}): ${target.displayName} thuộc nhóm {Vy, Dũng, Trang, Bình}.`;
      }
      break;
    }
    case 'inv-wanderer-or-11': {
      met = target.faction === 'wanderer' || target.maxHp === 11;
      const hasUseful = target.hand.some((c) => c.deck === 'investigation' || c.deck === 'equipment');
      if (met) {
        publicMessage = `Có phản ứng trên tủ đồ của ${target.displayName} — báo manh mối kín cho ${actor.displayName}.`;
        privateDetail = `Khớp nhóm {Khánh, Vy, Hải, Trang, Bình} · Trong tay ${target.displayName} ${
          hasUseful ? 'CÓ thẻ Điều tra/Trang bị' : 'chỉ có Sự kiện hoặc đang trống tay'
        }.`;
      } else {
        publicMessage = `Không có phản ứng với "${card.title}".`;
        privateDetail = `Không khớp (${card.conditionText}): ${target.displayName} thuộc nhóm {Minh, Lan, Tú, Dũng}.`;
      }
      break;
    }
    case 'inv-non-guard-le12': {
      met =
        (target.faction === 'mist-order' || target.faction === 'wanderer') &&
        target.maxHp <= 12;
      if (met) {
        if (target.tempShield > 0) {
          target.tempShield -= 1;
          publicMessage = `Có phản ứng! ${target.displayName} bị mất 1 Giáp tạm trước tiếng còi tuần đêm.`;
        } else {
          const res = applyNonLethalPressureDamage(state, target, 1, 'investigation', nowMs);
          publicMessage = res.dealt > 0
            ? `Có phản ứng! ${target.displayName} chịu 1 vết thương áp lực.`
            : `Có phản ứng (${res.blockedReason ?? 'giữ mức 1 HP'})!`;
        }
        privateDetail = `Khớp điều kiện (${card.conditionText}): ${target.displayName} thuộc nhóm {Tú, Vy, Hải, Trang}.`;
      } else {
        publicMessage = `Không có phản ứng với "${card.title}".`;
        privateDetail = `Không khớp: ${target.displayName} thuộc nhóm {Minh, Lan, Khánh, Dũng, Bình}.`;
      }
      break;
    }
    case 'inv-guard-dung-trang': {
      met =
        target.faction === 'lantern-guard' ||
        target.roleId === 'suong-gac-cong' ||
        target.roleId === 'lang-quan-sat';
      if (met) {
        const band = target.maxHp === 12 ? 'Máu tối đa CHẴN (12)' : 'Máu tối đa LẺ (11 hoặc 13)';
        publicMessage = `Có phản ứng trên thẻ nội trú của ${target.displayName} — ghi manh mối kín cho ${actor.displayName}.`;
        privateDetail = `Khớp nhóm {Minh, Lan, Khánh, Dũng, Trang} · Thông số: ${band}.`;
      } else {
        publicMessage = `Không có phản ứng với "${card.title}".`;
        privateDetail = `Không khớp: ${target.displayName} thuộc nhóm {Tú, Vy, Hải, Bình}.`;
      }
      break;
    }
    case 'inv-pair-resonance': {
      met = actor.faction === target.faction || actor.maxHp === target.maxHp;
      const wounds = target.maxHp - target.hp;
      if (met) {
        publicMessage = `Đối chiếu lời khai giữa ${actor.displayName} và ${target.displayName}: CÙNG CHỈ SỐ ĐỐI CHIẾU!`;
        privateDetail = `${target.displayName} cùng phe HOẶC cùng MaxHP (${actor.maxHp}) với bạn · Đang có ${wounds} vết thương.`;
      } else {
        publicMessage = `Đối chiếu lời khai giữa ${actor.displayName} và ${target.displayName}: KHÁC biệt hoàn toàn.`;
        privateDetail = `${target.displayName} vừa KHÁC phe với bạn vừa KHÁC MaxHP (${actor.maxHp}).`;
      }
      break;
    }
    case 'inv-footsteps': {
      met =
        target.visitedLocations.includes('radio') ||
        target.visitedLocations.includes('breaker') ||
        target.stayedCount >= 1;
      const recentNames = target.recentTrail.slice(-2).map(getLocationName).join(' -> ');
      if (met) {
        publicMessage = `Phát hiện dấu chân hành lang của ${target.displayName} — gửi báo cáo kín cho ${actor.displayName}.`;
        privateDetail = `${target.displayName} ghé gần đây: [${recentNames}] · Tổng lượt Đứng yên: ${target.stayedCount}.`;
      } else {
        publicMessage = `${target.displayName} chưa lưu dấu chân ở khu trọng yếu hay đứng yên.`;
        privateDetail = `${target.displayName} chưa từng qua Phát Thanh / Bảo Vệ và chưa dùng STAY.`;
      }
      break;
    }
    case 'inv-scuffle-trace': {
      met = target.attacksMade > 0 || target.equipped.length >= 1;
      if (met) {
        if (target.attacksMade > 0 && target.maxHp - target.hp <= 1) {
          applyNonLethalPressureDamage(state, target, 1, 'investigation', nowMs);
        }
        publicMessage = `Phát hiện dấu vết xô xát/trang bị trên ${target.displayName}.`;
        privateDetail = `${target.displayName} đã đánh ${target.attacksMade} lần · Mang ${target.equipped.length} trang bị · Giữ ${target.hand.length} lá trên tay.`;
      } else {
        publicMessage = `${target.displayName} chưa có dấu xô xát và chưa mang trang bị.`;
        privateDetail = `${target.displayName} đang 0 lần tấn công và 0 trang bị công khai.`;
      }
      break;
    }
    case 'inv-locker-check':
    default: {
      met = target.hand.length >= 2 || target.equipped.length >= 1;
      const cats = target.hand.slice(0, 3).map((c) => DECK_LABELS[c.deck]);
      if (met) {
        publicMessage = `Kiểm tra ngăn balo ${target.displayName} hoàn tất — manh mối gửi kín cho ${actor.displayName}.`;
        privateDetail = `Trong tay ${target.displayName} có ${target.hand.length} lá [${cats.join(', ') || 'trống'}] · Trang bị: ${target.equipped.length}.`;
      } else {
        publicMessage = `${target.displayName} hiện mang quá ít vật dụng trong balo.`;
        privateDetail = `${target.displayName} đang giữ ${target.hand.length} lá và ${target.equipped.length} trang bị.`;
      }
      break;
    }
  }

  // Nội tại sau khi lật vai của Lan: tự động đọc thêm số bài chính xác trên tay mục tiêu
  if (actor.revealed && actor.roleId === 'gac-truc-ban') {
    privateDetail += ` [Sổ trực Lan: mục tiêu hiện có ${target.hand.length} lá trên tay & ${target.equipped.length} trang bị].`;
  }

  const outcome: 'condition-met' | 'no-reaction' = met ? 'condition-met' : 'no-reaction';
  state.seqCounter += 1;
  state.lastInvestigation = {
    id: `inv-res-${state.seqCounter}`,
    round: state.round,
    atMs: nowMs,
    cardId: card.id,
    cardTitle: card.title,
    conditionLabel: card.conditionText ?? card.summary,
    investigatorId: actor.playerId,
    investigatorName: actor.displayName,
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome,
    publicMessage,
  };

  appendPrivateClue(state, actor, target, card.title, outcome, privateDetail, nowMs);
  appendPublicLog(
    state,
    'investigate',
    `🔍 ${actor.displayName} dùng "${card.title}" kiểm tra ${target.displayName}: ${publicMessage}`,
    nowMs,
    actor.playerId,
  );

  evaluateVictoryState(state, nowMs, false);
  return { ok: true };
}

export function resolveEquipCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  card: GameCard,
  nowMs: number,
): { ok: true } | { ok: false; reason: string } {
  if (actor.equipUsedThisTurn) {
    return { ok: false, reason: 'Mỗi lượt chỉ được trang bị tối đa 1 vật phẩm.' };
  }
  if (card.deck !== 'equipment' || card.isConsumable) {
    return { ok: false, reason: 'Thẻ này không phải trang bị mang lâu dài (dùng nút Sử dụng nếu là tiêu hao).' };
  }

  const idx = actor.hand.findIndex((c) => c.id === card.id);
  if (idx < 0) return { ok: false, reason: 'Không tìm thấy thẻ trang bị trên tay.' };
  actor.hand.splice(idx, 1);

  if (actor.equipped.length >= BOARD_GAME_MAX_EQUIPPED) {
    const oldItem = actor.equipped.shift();
    if (oldItem) {
      state.discards[oldItem.deck].push(oldItem.id);
    }
  }
  actor.equipped.push(card);
  actor.equipUsedThisTurn = true;

  appendPublicLog(
    state,
    'equipment',
    `🎒 ${actor.displayName} trang bị "${card.title}" công khai trước mặt.`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

export function resolveUseConsumableEquipment(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  card: GameCard,
  targetPlayerId: string | undefined,
  nowMs: number,
): { ok: true } | { ok: false; reason: string } {
  if (card.deck !== 'equipment' || !card.isConsumable) {
    return { ok: false, reason: 'Chỉ thẻ trang bị tiêu hao (Trà gừng / Thẻ từ đa năng) mới dùng theo lệnh này.' };
  }

  if (card.effectKind === 'eq-thermos') {
    const target = targetPlayerId
      ? state.players.find((p) => p.playerId === targetPlayerId && p.alive)
      : actor;
    if (!target || target.location !== actor.location) {
      return { ok: false, reason: 'Bình Trà Gừng chỉ dùng lên bản thân hoặc người sống cùng phòng.' };
    }
    discardCardFromHand(state, actor, card.id);
    const healed = healPlayerWounds(target, 3);
    actor.actedThisRound = true;
    appendPublicLog(
      state,
      'equipment',
      `🫖 ${actor.displayName} dùng "${card.title}" hồi ${healed} vết thương cho ${target.displayName}.`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  // eq-magnetic-pass
  discardCardFromHand(state, actor, card.id);
  addTempShield(actor, 2);
  const drawn = drawCardFromDeck(state, actor, 'investigation', nowMs);
  actor.actedThisRound = true;
  appendPublicLog(
    state,
    'equipment',
    `🪪 ${actor.displayName} dùng "${card.title}": nhận +2 Giáp tạm & rút 1 thẻ Điều tra.`,
    nowMs,
    actor.playerId,
  );
  if (drawn) {
    appendPrivateNote(state, actor, `Thẻ Từ Đa Năng rút thêm: "${drawn.title}".`, nowMs);
  }
  return { ok: true };
}

export function resolveEventCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  card: GameCard,
  targetPlayerId: string | undefined,
  targetLocation: BoardGameLocationId | undefined,
  nowMs: number,
): { ok: true } | { ok: false; reason: string } {
  if (card.deck !== 'event') {
    return { ok: false, reason: 'Thẻ được chọn không thuộc bộ Sự kiện.' };
  }

  const destLoc = targetLocation ?? actor.location;

  switch (card.effectKind) {
    case 'ev-power-flicker': {
      if (card.targetMode === 'location' && destLoc === 'corridor') {
        return { ok: false, reason: 'Hãy chọn 1 khu vực khác Hành Lang B7 để tặng +1 Giáp tạm.' };
      }
      discardCardFromHand(state, actor, card.id);
      for (const p of state.players) {
        if (!p.alive) continue;
        if (p.location === 'corridor' && p.tempShield > 0) p.tempShield -= 1;
        if (p.location === destLoc) addTempShield(p, 1);
      }
      appendPublicLog(
        state,
        'event',
        `⚡ ${actor.displayName} kích hoạt "${card.title}": Hành Lang B7 giảm giáp, ${getLocationName(destLoc)} nhận +1 Giáp tạm!`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'ev-midnight-noodles': {
      discardCardFromHand(state, actor, card.id);
      for (const p of state.players) {
        if (!p.alive) continue;
        if (p.location === 'canteen' || p.location === 'lobby') {
          healPlayerWounds(p, 1);
        } else if (p.tempShield === 0) {
          applyNonLethalPressureDamage(state, p, 1, 'event', nowMs);
        }
      }
      appendPublicLog(
        state,
        'event',
        `🍜 ${actor.displayName} kích hoạt "${card.title}": Căng Tin & Sảnh hồi 1 thương; người bên ngoài không giáp chịu lạnh!`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'ev-loudspeaker': {
      discardCardFromHand(state, actor, card.id);
      const exits = listLegalMovesForLocation(destLoc);
      const pushLoc = exits[0] ?? 'corridor';
      let movedCount = 0;
      for (const p of state.players) {
        if (!p.alive || p.location !== destLoc || p.playerId === actor.playerId) continue;
        p.location = pushLoc;
        if (!p.visitedLocations.includes(pushLoc)) p.visitedLocations.push(pushLoc);
        p.recentTrail = [...p.recentTrail.slice(-5), pushLoc];
        movedCount += 1;
      }
      appendPublicLog(
        state,
        'event',
        `📢 ${actor.displayName} bật "${card.title}" tại ${getLocationName(destLoc)}: điều động ${movedCount} người sang ${getLocationName(pushLoc)}.`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'ev-rain-shower': {
      discardCardFromHand(state, actor, card.id);
      state.courtRangeJammedRound = state.round;
      for (const p of state.players) {
        if (!p.alive || p.location !== 'court') continue;
        p.extendedRangeThisTurn = false;
        if (p.tempShield === 0) {
          applyNonLethalPressureDamage(state, p, 1, 'event', nowMs);
        }
      }
      appendPublicLog(
        state,
        'event',
        `🌧️ ${actor.displayName} kích hoạt "${card.title}": khóa tầm nhìn Sân Bóng Rổ hết Vòng ${state.round}!`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'ev-locker-audit': {
      const target = targetPlayerId
        ? state.players.find((p) => p.playerId === targetPlayerId && p.alive && p.equipped.length > 0)
        : state.players.find((p) => p.playerId !== actor.playerId && p.alive && p.equipped.length > 0);
      if (!target) {
        return { ok: false, reason: 'Chưa có sinh viên nào đang đeo Trang bị trên bàn để kiểm tra tủ đồ.' };
      }
      discardCardFromHand(state, actor, card.id);
      const dropped = target.equipped.shift();
      if (dropped) state.discards[dropped.deck].push(dropped.id);
      drawCardFromDeck(state, target, 'investigation', nowMs);
      appendPublicLog(
        state,
        'event',
        `🧰 ${actor.displayName} dùng "${card.title}": tháo "${dropped?.title ?? 'trang bị'}" của ${target.displayName} và cấp bù 1 thẻ Điều tra.`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'ev-calm-tea': {
      discardCardFromHand(state, actor, card.id);
      healPlayerWounds(actor, 2);
      const companion =
        (targetPlayerId
          ? state.players.find(
              (p) =>
                p.playerId === targetPlayerId &&
                p.playerId !== actor.playerId &&
                p.alive &&
                p.location === actor.location,
            )
          : state.players.find(
              (p) =>
                p.playerId !== actor.playerId &&
                p.alive &&
                p.location === actor.location &&
                p.hp < p.maxHp,
            )) ?? null;
      if (companion) healPlayerWounds(companion, 1);
      appendPublicLog(
        state,
        'event',
        `🍵 ${actor.displayName} pha "${card.title}": tự hồi 2 vết thương${
          companion ? ` & chia 1 thương cho ${companion.displayName}` : ''
        }.`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'ev-rumor-wave': {
      discardCardFromHand(state, actor, card.id);
      addTempShield(actor, 1);
      for (const p of state.players) {
        if (p.alive && p.hand.length >= 3) {
          const oldCard = p.hand.shift();
          if (oldCard) state.discards[oldCard.deck].push(oldCard.id);
        }
      }
      appendPublicLog(
        state,
        'event',
        `💬 ${actor.displayName} tung "${card.title}": mọi người giữ >= 3 thẻ bỏ bớt 1 thẻ, ${actor.displayName} nhận +1 Giáp tạm.`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'ev-curfew-bell':
    default: {
      discardCardFromHand(state, actor, card.id);
      for (const p of state.players) {
        if (p.alive && p.investigationsCount === 0) {
          applyNonLethalPressureDamage(state, p, 1, 'event', nowMs);
        }
      }
      appendPublicLog(
        state,
        'event',
        `🔔 ${actor.displayName} rung "${card.title}": ai chưa điều tra lần nào chịu 1 vết thương cảnh cáo!`,
        nowMs,
        actor.playerId,
      );
      break;
    }
  }

  actor.actedThisRound = true;
  evaluateVictoryState(state, nowMs, false);
  return { ok: true };
}

export function resolveVoluntaryReveal(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): { ok: true } | { ok: false; reason: string } {
  if (actor.revealed) {
    return { ok: false, reason: 'Nhân vật của bạn đã lật vai công khai từ trước.' };
  }
  const roleDef = ROLES_BY_ID[actor.roleId];
  actor.revealed = true;
  actor.actedThisRound = true;

  let perkText = '';
  switch (actor.roleId) {
    case 'gac-ky-thuat': {
      addTempShield(actor, 1);
      drawCardFromDeck(state, actor, 'equipment', nowMs);
      perkText = '+1 Giáp tạm & rút 1 Trang bị';
      break;
    }
    case 'gac-truc-ban': {
      healPlayerWounds(actor, 1);
      drawCardFromDeck(state, actor, 'investigation', nowMs);
      perkText = 'hồi 1 thương & rút 1 Điều tra';
      break;
    }
    case 'gac-radio': {
      actor.globalInvestigateThisTurn = true;
      addTempShield(actor, 1);
      perkText = 'mở Sóng toàn khu & +1 Giáp tạm';
      break;
    }
    case 'suong-an-danh': {
      addTempShield(actor, 1);
      actor.extendedRangeThisTurn = true;
      perkText = '+1 Giáp tạm & mở tầm kề phòng';
      break;
    }
    case 'suong-tin-gia': {
      drawCardFromDeck(state, actor, 'event', nowMs);
      addTempShield(actor, 1);
      perkText = 'rút 1 Sự kiện & +1 Giáp tạm';
      break;
    }
    case 'suong-gac-cong': {
      actor.extendedRangeThisTurn = true;
      perkText = 'mở tầm đánh kề phòng lượt này';
      break;
    }
    case 'lang-anh-san': {
      addTempShield(actor, 1);
      drawCardFromDeck(state, actor, 'equipment', nowMs);
      perkText = '+1 Giáp tạm & rút 1 Trang bị';
      break;
    }
    case 'lang-quan-sat': {
      healPlayerWounds(actor, 1);
      addTempShield(actor, 1);
      perkText = 'hồi 1 thương & +1 Giáp tạm';
      break;
    }
    case 'lang-cuu-ho':
    default: {
      healPlayerWounds(actor, 1);
      addTempShield(actor, 1);
      perkText = 'hồi 1 thương & +1 Giáp tạm';
      break;
    }
  }

  state.seqCounter += 1;
  state.lastRevealEvent = {
    id: `reveal-${state.seqCounter}`,
    round: state.round,
    atMs: nowMs,
    playerId: actor.playerId,
    displayName: actor.displayName,
    roleId: actor.roleId,
    roleName: roleDef.name,
    faction: actor.faction,
    reason: 'voluntary',
  };

  appendHighlight(
    state,
    `${actor.displayName} Tự Lật Vai`,
    `${roleDef.name} (${FACTION_LABELS[actor.faction]}) — ${perkText}.`,
    nowMs,
  );
  appendPublicLog(
    state,
    'reveal',
    `🎭 ${actor.displayName} tự nguyện LẬT VAI: ${roleDef.name} [${FACTION_LABELS[actor.faction]}] (${perkText})!`,
    nowMs,
    actor.playerId,
  );

  evaluateVictoryState(state, nowMs, false);
  return { ok: true };
}

export function resolveRevealedSkill(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string | undefined,
  nowMs: number,
): { ok: true } | { ok: false; reason: string } {
  if (!actor.revealed) {
    return {
      ok: false,
      reason: 'Bạn cần Tự Lật Vai công khai trước khi kích hoạt kỹ năng đặc biệt.',
    };
  }
  if (actor.skillCooldown > 0) {
    return {
      ok: false,
      reason: `Kỹ năng đang hồi chiêu (còn ${actor.skillCooldown} vòng).`,
    };
  }

  const roleDef = ROLES_BY_ID[actor.roleId];
  const findTarget = (allowSelf: boolean, sameOrAdjOnly: boolean): AuthoritativePlayerState | null => {
    const t = targetPlayerId
      ? state.players.find((p) => p.playerId === targetPlayerId && p.alive) ?? null
      : allowSelf
        ? actor
        : null;
    if (!t) return null;
    if (!allowSelf && t.playerId === actor.playerId) return null;
    if (sameOrAdjOnly && !canPlayerUseSkillRange(actor, t)) return null;
    return t;
  };

  switch (actor.roleId) {
    case 'gac-ky-thuat': {
      const t = findTarget(true, true);
      if (!t) return { ok: false, reason: 'Chọn bản thân hoặc 1 người sống cùng/kề phòng.' };
      const unhurt = t.hp >= t.maxHp;
      healPlayerWounds(t, 2);
      addTempShield(t, unhurt ? 2 : 1);
      appendPublicLog(
        state,
        'skill',
        `🔧 Minh (${actor.displayName}) dùng "${roleDef.activeAbility.name}" gia cố cho ${t.displayName}.`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'gac-truc-ban': {
      const t = findTarget(false, true);
      if (!t) return { ok: false, reason: 'Hãy chọn 1 sinh viên khác cùng/kề phòng để bảo hộ.' };
      t.wardedUntilRound = state.turnNumber + state.players.filter((p) => p.alive).length;
      appendPublicLog(
        state,
        'skill',
        `🛡️ Lan (${actor.displayName}) ban bố "${roleDef.activeAbility.name}" lên ${t.displayName} (giảm 1 ST & không thể gục dưới 1 HP trong 1 vòng lượt).`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'gac-radio': {
      const t = findTarget(false, false);
      if (!t) return { ok: false, reason: 'Chọn 1 sinh viên khác trên bản đồ để Phát Sóng Kiểm Chứng.' };
      const suspicious = t.attacksMade > 0 || t.equipped.length >= 1 || (t.revealed && t.faction === 'mist-order');
      if (suspicious) t.exposedMark = 1;
      appendPublicLog(
        state,
        'skill',
        `📡 Khánh (${actor.displayName}) phát sóng kiểm chứng ${t.displayName}: ${
          suspicious
            ? 'XÁC NHẬN từng tấn công/mang trang bị — gắn dấu Hở sườn (+1 ST đòn kế)!'
            : 'Chưa từng tấn công hay mang trang bị.'
        }`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'suong-an-danh': {
      const t = findTarget(false, true);
      if (!t) return { ok: false, reason: 'Chọn 1 sinh viên khác cùng/kề phòng để Đánh Tráo Bóng Tối.' };
      const oldActorLoc = actor.location;
      const oldTargetLoc = t.location;
      if (oldActorLoc !== oldTargetLoc) {
        actor.location = oldTargetLoc;
        t.location = oldActorLoc;
        if (!actor.visitedLocations.includes(oldTargetLoc)) actor.visitedLocations.push(oldTargetLoc);
        if (!t.visitedLocations.includes(oldActorLoc)) t.visitedLocations.push(oldActorLoc);
      }
      resolveAttackStrike(state, actor, t, 2, nowMs, 'Đánh Tráo Bóng Tối tấn công', {
        isNormalAttack: false,
      });
      break;
    }
    case 'suong-tin-gia': {
      const t = findTarget(false, true);
      if (!t) return { ok: false, reason: 'Chọn 1 sinh viên khác cùng/kề phòng để Tung Hỏa Mù.' };
      if (t.tempShield > 0) t.tempShield -= 1;
      const exits = listLegalMovesForLocation(t.location).filter((id) => id !== t.location);
      const pushDest = exits[state.round % exits.length];
      resolveAttackStrike(state, actor, t, 1, nowMs, 'Tung Hỏa Mù vào', { isNormalAttack: false });
      if (t.alive && pushDest) {
        t.location = pushDest;
        if (!t.visitedLocations.includes(pushDest)) t.visitedLocations.push(pushDest);
        appendPublicLog(
          state,
          'skill',
          `🌫️ Hỏa mù của Vy đẩy ${t.displayName} dạt sang ${getLocationName(pushDest)}.`,
          nowMs,
          actor.playerId,
        );
      }
      break;
    }
    case 'suong-gac-cong': {
      const t = findTarget(false, true);
      if (!t) return { ok: false, reason: 'Chọn 1 sinh viên khác cùng/kề phòng.' };
      if (!t.revealed && t.hp >= t.maxHp) {
        return { ok: false, reason: 'Áp Sát Bất Ngờ chỉ nhắm mục tiêu đã bị thương hoặc đã lật vai.' };
      }
      if (actor.location !== t.location) {
        actor.location = t.location;
        if (!actor.visitedLocations.includes(t.location)) actor.visitedLocations.push(t.location);
      }
      resolveAttackStrike(state, actor, t, 3, nowMs, 'Áp Sát Bất Ngờ hạ đòn vào', {
        isNormalAttack: false,
      });
      break;
    }
    case 'lang-anh-san': {
      if (
        state.round >= 5 &&
        actor.equipped.length >= 2 &&
        actor.investigationsCount >= 3
      ) {
        actor.skillCooldown = roleDef.activeAbility.cooldownRounds;
        actor.actedThisRound = true;
        finalizeMatchOutcome(
          state,
          nowMs,
          'wanderer-solo',
          `${actor.displayName} (Hải — Kẻ Lang Thang)`,
          `${actor.displayName} đã thu thập đủ ${actor.equipped.length} trang bị và ${actor.investigationsCount} cuộc điều tra từ Vòng ${state.round}, kích hoạt Chốt Gói Tin Đêm để THẮNG ĐỘC LẬP!`,
          [actor.playerId],
          'Hải Chốt Gói Tin Đêm',
        );
        return { ok: true };
      }
      drawCardFromDeck(state, actor, 'investigation', nowMs);
      addTempShield(actor, 1);
      appendPublicLog(
        state,
        'skill',
        `💎 Hải (${actor.displayName}) mở "Chốt Gói Tin Đêm": rút 1 thẻ Điều tra & +1 Giáp tạm (cần Vòng 5+, >=2 Trang bị, >=3 Điều tra để thắng ngay).`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'lang-quan-sat': {
      const t = findTarget(false, true);
      if (!t) return { ok: false, reason: 'Chọn 1 sinh viên khác cùng/kề phòng cho Biên Bản Đối Chất.' };
      addTempShield(actor, 1);
      addTempShield(t, 1);
      drawCardFromDeck(state, actor, 'investigation', nowMs);
      appendPublicLog(
        state,
        'skill',
        `📓 Trang (${actor.displayName}) lập Biên Bản Đối Chất cùng ${t.displayName}: cả hai +1 Giáp tạm & Trang rút 1 Điều tra.`,
        nowMs,
        actor.playerId,
      );
      break;
    }
    case 'lang-cuu-ho':
    default: {
      const t = findTarget(false, true);
      if (!t) return { ok: false, reason: 'Chọn 1 sinh viên khác cùng/kề phòng để dùng Lá Chắn Thân Mình.' };
      healPlayerWounds(t, 1);
      addTempShield(t, 2);
      addTempShield(actor, 1);
      if (actor.protegePlayerId && t.playerId === actor.protegePlayerId) {
        actor.protectedProtegeCount += 1;
        appendPrivateNote(
          state,
          actor,
          `Bạn đã bảo hộ thành công cho Mục tiêu ${t.displayName} (${actor.protectedProtegeCount} lần)!`,
          nowMs,
        );
      }
      appendPublicLog(
        state,
        'skill',
        `🩺 Bình (${actor.displayName}) tung "${roleDef.activeAbility.name}" hồi 1 thương & +2 Giáp tạm cho ${t.displayName}.`,
        nowMs,
        actor.playerId,
      );
      break;
    }
  }

  actor.skillCooldown = roleDef.activeAbility.cooldownRounds;
  actor.actedThisRound = true;
  evaluateVictoryState(state, nowMs, false);
  return { ok: true };
}
