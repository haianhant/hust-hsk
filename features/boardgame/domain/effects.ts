// ---------------------------------------------------------------------------
// features/boardgame/domain/effects.ts — Thực thi mọi hiệu ứng xúc xắc di chuyển,
// quyền năng khu vực, thẻ Thăm Dò Kín 1-đối-1, Trang bị, Đột Kích, Chiến đấu & Kỹ năng (v4).
// ---------------------------------------------------------------------------

import type {
  BoardGameDeckId,
  BoardGameHighlightEntry,
  BoardGameLocationId,
  BoardGamePrivateClueEntry,
  BoardGamePublicLogEntry,
} from '../../../shared/contracts/boardgame';
import { getCardById } from './cards';
import { FACTION_LABELS, getRoleDesign } from './roles';
import {
  areInSameCluster,
  BOARD_GAME_MAX_EQUIPPED,
  BOARD_GAME_MAX_HAND,
  canPlayerAttackTarget,
  getLocationDefinition,
  LOCATIONS_CATALOG,
  nextRandomInt,
  resolveLocationForDiceTotal,
  rollD4,
  rollD6,
  shuffleWithRng,
} from './rules';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  EngineActionResult,
  GameCardDefinition,
} from './types';

export type DamageSourceKind = 'attack' | 'event' | 'location' | 'skill' | 'investigation';

const MAX_PUBLIC_LOG = 40;
const MAX_HIGHLIGHTS = 8;
const MAX_PRIVATE_CLUES = 20;

export function appendPublicLog(
  state: AuthoritativeGameState,
  kind: BoardGamePublicLogEntry['kind'],
  text: string,
  nowMs: number,
  actorId?: string | null,
): void {
  const entry: BoardGamePublicLogEntry = {
    id: `log-${state.turnNumber}-${state.publicLog.length + 1}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    kind,
    text,
    ...(actorId ? { actorId } : {}),
  };
  state.publicLog.push(entry);
  if (state.publicLog.length > MAX_PUBLIC_LOG) {
    state.publicLog.splice(0, state.publicLog.length - MAX_PUBLIC_LOG);
  }
}

export function appendHighlight(
  state: AuthoritativeGameState,
  title: string,
  detail: string,
  nowMs: number,
): void {
  const entry: BoardGameHighlightEntry = {
    round: state.round,
    title,
    detail,
    atMs: nowMs,
  };
  state.highlights.push(entry);
  if (state.highlights.length > MAX_HIGHLIGHTS) {
    state.highlights.splice(0, state.highlights.length - MAX_HIGHLIGHTS);
  }
}

export function appendPrivateClue(
  player: AuthoritativePlayerState,
  clue: Omit<BoardGamePrivateClueEntry, 'id'>,
): void {
  player.privateClues.push({
    ...clue,
    id: `clue-${player.privateClues.length + 1}-${clue.atMs}`,
  });
  if (player.privateClues.length > MAX_PRIVATE_CLUES) {
    player.privateClues.splice(0, player.privateClues.length - MAX_PRIVATE_CLUES);
  }
}

function discardCardId(state: AuthoritativeGameState, cardId: string): void {
  const card = getCardById(cardId);
  if (card) {
    state.discards[card.deck].push(cardId);
  }
}

function takeOneCardFromDeck(
  state: AuthoritativeGameState,
  deckId: BoardGameDeckId,
): GameCardDefinition | null {
  if (state.decks[deckId].length === 0 && state.discards[deckId].length > 0) {
    const reshuffled = shuffleWithRng(state.discards[deckId], state.rngState);
    state.decks[deckId] = reshuffled.shuffled;
    state.discards[deckId] = [];
    state.rngState = reshuffled.nextState;
  }
  const topId = state.decks[deckId].shift();
  if (!topId) return null;
  return getCardById(topId);
}

export function applyHeal(
  state: AuthoritativeGameState,
  target: AuthoritativePlayerState,
  amount: number,
  sourceLabel?: string,
  nowMs?: number,
): number {
  if (!target.alive || amount <= 0) return 0;
  const actual = Math.min(target.woundsTaken, amount);
  target.woundsTaken -= actual;
  target.hp = target.maxHp - target.woundsTaken;
  if (actual > 0 && sourceLabel && nowMs !== undefined) {
    appendPublicLog(
      state,
      'equipment',
      `💚 ${target.displayName} hồi ${actual} thương tích (${sourceLabel}).`,
      nowMs,
      target.playerId,
    );
  }
  return actual;
}

function equipToPlayerSlot(
  owner: AuthoritativePlayerState,
  cardId: string,
): void {
  // Chuẩn Shadow Hunters: trang bị đặt ngửa không bị giới hạn trần 3 món.
  if (owner.equipped.length < BOARD_GAME_MAX_EQUIPPED) {
    owner.equipped.push(cardId);
  }
}

export function stealOneEquippedGear(
  _state: AuthoritativeGameState,
  thief: AuthoritativePlayerState,
  victim: AuthoritativePlayerState,
): GameCardDefinition | null {
  if (victim.equipped.length === 0) return null;
  let bestIdx = 0;
  let bestVal = -1;
  for (let i = 0; i < victim.equipped.length; i++) {
    const c = getCardById(victim.equipped[i]);
    const val = c ? c.value : 0;
    if (val > bestVal) {
      bestVal = val;
      bestIdx = i;
    }
  }
  const [stolenId] = victim.equipped.splice(bestIdx, 1);
  if (!stolenId) return null;
  equipToPlayerSlot(thief, stolenId);
  return getCardById(stolenId);
}

export function applyDamage(
  state: AuthoritativeGameState,
  target: AuthoritativePlayerState,
  rawAmount: number,
  sourceType: DamageSourceKind,
  attacker: AuthoritativePlayerState | null,
  nowMs: number,
): number {
  if (!target.alive || rawAmount <= 0) return 0;

  if (target.guardianShieldActive) {
    appendPublicLog(
      state,
      'skill',
      `🛡️ Lá Chắn Chốt Trực che chở ${target.displayName} — miễn nhiễm sát thương!`,
      nowMs,
      target.playerId,
    );
    return 0;
  }

  let finalDmg = rawAmount;
  if (sourceType === 'attack' && finalDmg > 0) {
    if (target.equipped.includes('eq-01') && finalDmg > 1) {
      finalDmg -= 1;
    }
    if (target.equipped.includes('eq-02') && finalDmg >= 4) {
      finalDmg = Math.max(1, finalDmg - 2);
    }
  } else if ((sourceType === 'event' || sourceType === 'location') && finalDmg > 0) {
    if (target.equipped.includes('eq-03')) {
      finalDmg = Math.max(0, finalDmg - 1);
    }
  }

  if (finalDmg <= 0) return 0;

  const actual = Math.min(target.hp, finalDmg);
  target.woundsTaken += actual;
  target.hp -= actual;

  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    target.eliminatedRound = state.round;
    target.eliminatedByPlayerId = attacker ? attacker.playerId : null;
    target.revealed = true;

    const role = getRoleDesign(target.roleId);
    state.lastRevealEvent = {
      id: `rev-${state.turnNumber}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      playerId: target.playerId,
      displayName: target.displayName,
      roleId: target.roleId,
      roleName: role.name,
      faction: target.faction,
      reason: 'eliminated',
    };

    appendPublicLog(
      state,
      'elimination',
      `💀 ${target.displayName} đã bị loại — lộ diện vai ${role.name} (${FACTION_LABELS[target.faction]})!`,
      nowMs,
      attacker?.playerId ?? target.playerId,
    );
    appendHighlight(
      state,
      `Loại khỏi KTX: ${target.displayName}`,
      `${target.displayName} (${role.name}) gục ngã ở vòng ${state.round}.`,
      nowMs,
    );

    // Bình "Bảo Vệ" tự tay hạ kẻ đã loại Người được bảo hộ -> hoàn thành báo thù.
    if (attacker && attacker.alive && attacker.roleId === 'lang-cuu-ho' && attacker.protegePlayerId) {
      const protege = state.players[attacker.protegePlayerId];
      if (protege && protege.eliminatedByPlayerId === target.playerId) {
        attacker.avengedProtegeKiller = true;
      }
    }

    // Chiến lợi phẩm: khi kết liễu đối thủ bằng đòn đánh/sự kiện, kẻ hạ gục lấy 1 trang bị nếu đối thủ có.
    let looted: GameCardDefinition | null = null;
    if (
      attacker &&
      attacker.alive &&
      (sourceType === 'attack' || sourceType === 'event') &&
      target.equipped.length > 0
    ) {
      looted = stealOneEquippedGear(state, attacker, target);
      if (looted) {
        appendPublicLog(
          state,
          'steal',
          `🏆 ${attacker.displayName} thu giữ "${looted.title}" từ ${target.displayName}!`,
          nowMs,
          attacker.playerId,
        );
      }
    }

    while (target.equipped.length > 0) {
      const id = target.equipped.shift();
      if (id) discardCardId(state, id);
    }
    while (target.hand.length > 0) {
      const id = target.hand.shift();
      if (id) discardCardId(state, id);
    }
  }

  return actual;
}

export function resolveDiceRollMove(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'ROLL_MOVE') {
    return { ok: false, error: 'Hiện không ở pha tung xúc xắc di chuyển.' };
  }

  const d6 = rollD6(state);
  const d4 = rollD4(state);
  const total = d6 + d4;
  const mapped = resolveLocationForDiceTotal(total);

  if (mapped === 'choose-any') {
    actor.consecutiveSameZoneRolls = 0;
    state.turnPhase = 'CHOOSE_MOVE';
    state.lastDiceRoll = {
      id: `dice-${state.turnNumber}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      playerId: actor.playerId,
      displayName: actor.displayName,
      kind: 'move',
      d6,
      d4,
      total,
      rerollRequired: false,
      freeChoice: true,
      resolvedLocation: null,
    };
    appendPublicLog(
      state,
      'dice',
      `🎲 ${actor.displayName} tung ${d6} + ${d4} = 7! Được tự do chọn bất kỳ khu vực nào kế tiếp.`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  if (mapped === actor.location) {
    if (actor.consecutiveSameZoneRolls < 2) {
      actor.consecutiveSameZoneRolls += 1;
      const loc = getLocationDefinition(mapped);
      state.lastDiceRoll = {
        id: `dice-${state.turnNumber}-${nowMs}`,
        round: state.round,
        atMs: nowMs,
        playerId: actor.playerId,
        displayName: actor.displayName,
        kind: 'move',
        d6,
        d4,
        total,
        rerollRequired: true,
        freeChoice: false,
        resolvedLocation: mapped,
      };
      appendPublicLog(
        state,
        'dice',
        `🎲 ${actor.displayName} tung ${d6} + ${d4} = ${total} (trùng ${loc.name}) — được ĐỔ LẠI xúc xắc!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    // Chống kẹt vòng lặp vô hạn: quá 2 lần trùng liên tiếp thì chuyển sang khu vực kế tiếp xác định.
    const candidates = LOCATIONS_CATALOG.filter((l) => l.id !== actor.location);
    const chosen = candidates[nextRandomInt(state, candidates.length)];
    actor.consecutiveSameZoneRolls = 0;
    actor.location = chosen.id;
    state.turnPhase = 'LOCATION_ACTION';
    state.lastDiceRoll = {
      id: `dice-${state.turnNumber}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      playerId: actor.playerId,
      displayName: actor.displayName,
      kind: 'move',
      d6,
      d4,
      total,
      rerollRequired: false,
      freeChoice: false,
      resolvedLocation: chosen.id,
    };
    appendPublicLog(
      state,
      'move',
      `🎲 ${actor.displayName} tung lần 3 — đổi hướng tới ${chosen.name} (${chosen.diceLabel}).`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  actor.consecutiveSameZoneRolls = 0;
  actor.location = mapped;
  state.turnPhase = 'LOCATION_ACTION';
  const destDef = getLocationDefinition(mapped);
  state.lastDiceRoll = {
    id: `dice-${state.turnNumber}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    playerId: actor.playerId,
    displayName: actor.displayName,
    kind: 'move',
    d6,
    d4,
    total,
    rerollRequired: false,
    freeChoice: false,
    resolvedLocation: mapped,
  };
  appendPublicLog(
    state,
    'move',
    `🎲 ${actor.displayName} tung ${d6} + ${d4} = ${total} → di chuyển tới ${destDef.name}.`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

export function resolveChooseDestination(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  destination: BoardGameLocationId,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'CHOOSE_MOVE') {
    return { ok: false, error: 'Chỉ được chọn khu vực tự do sau khi tung ra tổng 7.' };
  }
  if (destination === actor.location) {
    return { ok: false, error: 'Phải chọn một khu vực khác với vị trí hiện tại.' };
  }
  actor.consecutiveSameZoneRolls = 0;
  actor.location = destination;
  state.turnPhase = 'LOCATION_ACTION';
  const destDef = getLocationDefinition(destination);
  appendPublicLog(
    state,
    'move',
    `🧭 ${actor.displayName} chọn di chuyển tới ${destDef.name} (${destDef.diceLabel}).`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

export function resolveDrawLocationCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  deckId: BoardGameDeckId,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION') {
    return { ok: false, error: 'Không ở pha hành động khu vực để rút bài.' };
  }
  const loc = getLocationDefinition(actor.location);
  if (loc.deckHint === 'power-9' || loc.deckHint === 'power-10') {
    return { ok: false, error: `${loc.name} dùng quyền năng đặc biệt, không rút bài ở đây.` };
  }
  if (loc.deckHint !== 'any' && loc.deckHint !== deckId) {
    return { ok: false, error: `${loc.name} chỉ cho phép rút chồng bài tương ứng.` };
  }

  const card = takeOneCardFromDeck(state, deckId);
  if (!card) {
    state.turnPhase = 'MAIN_ACTION';
    appendPublicLog(
      state,
      'draw',
      `🃏 Chồng bài đã cạn lá rảnh — ${actor.displayName} bước vào pha Hành động chính.`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  let trimmedOverflow = false;
  if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
    const discardedId = actor.hand.shift();
    if (discardedId) {
      discardCardId(state, discardedId);
      trimmedOverflow = true;
    }
  }
  actor.hand.push(card.id);
  state.turnPhase = 'MAIN_ACTION';

  const deckLabel =
    deckId === 'investigation'
      ? 'Khám Phá (Kín)'
      : deckId === 'equipment'
        ? 'Cung Ứng'
        : 'Đột Kích';

  appendPublicLog(
    state,
    'draw',
    `🃏 ${actor.displayName} rút 1 thẻ ${deckLabel} tại ${loc.name}${trimmedOverflow ? ` (đầy tay ${BOARD_GAME_MAX_HAND} lá, tự bỏ 1 lá cũ)` : ''}.`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

export function resolveLocationPower(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string | undefined,
  mode: 'heal' | 'damage' | 'steal' | undefined,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION') {
    return { ok: false, error: 'Không ở pha hành động khu vực.' };
  }

  if (actor.location === 'corridor') {
    const target = targetPlayerId ? state.players[targetPlayerId] : actor;
    if (!target || !target.alive) {
      return { ok: false, error: 'Mục tiêu Hành Lang (9) không hợp lệ hoặc đã bị loại.' };
    }
    const chosenMode = mode === 'damage' ? 'damage' : mode === 'heal' ? 'heal' : target.playerId === actor.playerId ? 'heal' : 'damage';
    if (chosenMode === 'damage' && target.playerId === actor.playerId) {
      return { ok: false, error: 'Không thể tự gây sát thương lên chính mình tại Hành Lang (9).' };
    }
    if (chosenMode === 'heal') {
      const healed = applyHeal(state, target, 1);
      appendPublicLog(
        state,
        'equipment',
        `💚 ${actor.displayName} dùng Hành Lang (9): hồi ${healed} thương tích cho ${target.displayName}.`,
        nowMs,
        actor.playerId,
      );
    } else {
      const dealt = applyDamage(state, target, 2, 'location', actor, nowMs);
      appendPublicLog(
        state,
        'event',
        `⚡ ${actor.displayName} kích hoạt Hành Lang (9): ${target.displayName} chịu ${dealt} sát thương!`,
        nowMs,
        actor.playerId,
      );
    }
    state.turnPhase = 'MAIN_ACTION';
    return { ok: true };
  }

  if (actor.location === 'court') {
    if (!targetPlayerId) {
      return { ok: false, error: 'Hãy chọn 1 người chơi đang đeo Trang bị để cướp, hoặc Bỏ qua khu vực.' };
    }
    const victim = state.players[targetPlayerId];
    if (!victim || !victim.alive || victim.playerId === actor.playerId) {
      return { ok: false, error: 'Mục tiêu Sân Bóng (10) không hợp lệ.' };
    }
    if (victim.equipped.length === 0) {
      return { ok: false, error: `${victim.displayName} chưa đeo Trang bị nào để cướp.` };
    }
    const stolen = stealOneEquippedGear(state, actor, victim);
    if (stolen) {
      appendPublicLog(
        state,
        'steal',
        `🧤 ${actor.displayName} dùng Sân Bóng (10): cướp "${stolen.title}" từ ${victim.displayName}!`,
        nowMs,
        actor.playerId,
      );
    }
    state.turnPhase = 'MAIN_ACTION';
    return { ok: true };
  }

  return { ok: false, error: 'Khu vực hiện tại không có quyền năng đặc biệt (ô 9 hoặc ô 10).' };
}

export function resolveSkipLocation(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION') {
    return { ok: false, error: 'Chỉ bỏ qua được khi đang ở pha Hành động khu vực.' };
  }
  state.turnPhase = 'MAIN_ACTION';
  appendPublicLog(
    state,
    'system',
    `⏭️ ${actor.displayName} bỏ qua hành động khu vực.`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

export function resolveEquipCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  cardId: string,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION' && state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Hãy tung xúc xắc di chuyển trước khi trang bị thẻ.' };
  }
  const idx = actor.hand.indexOf(cardId);
  if (idx === -1) {
    return { ok: false, error: 'Không có thẻ này trên tay.' };
  }
  const card = getCardById(cardId);
  if (!card || card.deck === 'investigation' || card.isConsumable) {
    return { ok: false, error: 'Chỉ thẻ Trang bị lâu dài mới lắp được vào ô đồ.' };
  }
  actor.hand.splice(idx, 1);
  equipToPlayerSlot(actor, card.id);
  appendPublicLog(
    state,
    'equipment',
    `🎒 ${actor.displayName} trang bị "${card.title}".`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

export function resolveUseCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  cardId: string,
  targetPlayerId: string | undefined,
  targetLocation: BoardGameLocationId | undefined,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION' && state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Hãy tung xúc xắc di chuyển trước khi dùng thẻ Hành động.' };
  }
  const idx = actor.hand.indexOf(cardId);
  if (idx === -1) {
    return { ok: false, error: 'Không có thẻ này trên tay.' };
  }
  const card = getCardById(cardId);
  if (!card) {
    return { ok: false, error: 'Thẻ bài không tồn tại.' };
  }
  if (card.deck === 'investigation') {
    return { ok: false, error: 'Thẻ Khám Phá cần dùng hành động Điều Tra lên 1 người chơi.' };
  }
  if (!card.isConsumable) {
    return resolveEquipCard(state, actor, cardId, nowMs);
  }

  switch (card.effectKind) {
    case 'ev_heal_2':
    case 'ev_heal_3': {
      const amount = card.effectKind === 'ev_heal_3' ? 3 : 2;
      const target = targetPlayerId ? state.players[targetPlayerId] : actor;
      if (!target || !target.alive) {
        return { ok: false, error: 'Mục tiêu hồi sức không hợp lệ.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const healed = applyHeal(state, target, amount);
      appendPublicLog(
        state,
        'equipment',
        `💊 ${actor.displayName} dùng "${card.title}": ${target.displayName} hồi ${healed} thương tích.`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }
    case 'ev_cluster_heal_2': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const affected = Object.values(state.players).filter(
        (p) => p.alive && areInSameCluster(p.location, actor.location),
      );
      for (const p of affected) {
        applyHeal(state, p, 2);
      }
      appendPublicLog(
        state,
        'equipment',
        `💡 ${actor.displayName} bật "${card.title}": cả Cụm hồi 2 thương tích (${affected.length} người).`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }
    case 'ev_full_heal_hunter': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const fullClean = actor.faction === 'lantern-guard' && actor.revealed;
      const healed = applyHeal(state, actor, fullClean ? actor.woundsTaken : 1);
      appendPublicLog(
        state,
        'equipment',
        `🪞 ${actor.displayName} dùng "${card.title}": hồi ${healed} thương tích${fullClean ? ' (hồi đầy Đội Săn Đêm!)' : '.'}`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }
    case 'ev_snipe_2': {
      if (!targetPlayerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi để phóng điện.' };
      }
      const target = state.players[targetPlayerId];
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Mục tiêu không hợp lệ.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const dealt = applyDamage(state, target, 2, 'event', actor, nowMs);
      appendPublicLog(
        state,
        'event',
        `⚡ ${actor.displayName} dùng "${card.title}": ${target.displayName} chịu ${dealt} sát thương!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }
    case 'ev_location_blast_2': {
      const zoneId = targetLocation ?? actor.location;
      const zoneDef = getLocationDefinition(zoneId);
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const victims = Object.values(state.players).filter(
        (p) => p.alive && p.location === zoneId,
      );
      for (const v of victims) {
        applyDamage(state, v, 2, 'event', actor, nowMs);
      }
      appendPublicLog(
        state,
        'event',
        `💥 ${actor.displayName} tung "${card.title}" vào ${zoneDef.name} (${victims.length} người dính đòn)!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }
    case 'ev_drain_2': {
      if (!targetPlayerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi để rút hút.' };
      }
      const target = state.players[targetPlayerId];
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Mục tiêu rút hút không hợp lệ.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const dealt = applyDamage(state, target, 2, 'event', actor, nowMs);
      const healed = dealt > 0 ? applyHeal(state, actor, 1) : 0;
      appendPublicLog(
        state,
        'event',
        `🩸 ${actor.displayName} dùng "${card.title}" lên ${target.displayName} (-${dealt} HP, bản thân +${healed} HP).`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }
    default:
      return { ok: false, error: 'Thẻ bài này không hỗ trợ dùng trực tiếp.' };
  }
}

export function resolveInvestigateCard(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  cardId: string,
  targetPlayerId: string,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION' && state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Hãy tung xúc xắc di chuyển trước khi đưa thẻ Thăm Dò Kín.' };
  }
  const idx = actor.hand.indexOf(cardId);
  if (idx === -1) {
    return { ok: false, error: 'Bạn không cầm thẻ Khám Phá này trên tay.' };
  }
  const card = getCardById(cardId);
  if (!card || card.deck !== 'investigation') {
    return { ok: false, error: 'Đây không phải Thẻ Khám Phá.' };
  }
  const target = state.players[targetPlayerId];
  if (!target || !target.alive || target.playerId === actor.playerId) {
    return { ok: false, error: 'Mục tiêu điều tra không hợp lệ.' };
  }

  actor.hand.splice(idx, 1);
  discardCardId(state, card.id);
  actor.investigationsCount += 1;
  if (!actor.investigatedTargetIds.includes(target.playerId)) {
    actor.investigatedTargetIds.push(target.playerId);
  }

  let conditionMet = false;
  let healCard = false;
  switch (card.effectKind) {
    case 'inv_is_hunter':
      conditionMet = target.faction === 'lantern-guard';
      break;
    case 'inv_is_shadow':
      conditionMet = target.faction === 'mist-order';
      break;
    case 'inv_is_wanderer':
      conditionMet = target.faction === 'wanderer';
      healCard = true;
      break;
    case 'inv_hunter_or_wanderer':
      conditionMet = target.faction === 'lantern-guard' || target.faction === 'wanderer';
      break;
    case 'inv_shadow_or_wanderer':
      conditionMet = target.faction === 'mist-order' || target.faction === 'wanderer';
      break;
    case 'inv_hp_ge_12':
      conditionMet = target.maxHp >= 12;
      break;
    case 'inv_hp_le_11':
      conditionMet = target.maxHp <= 11;
      healCard = true;
      break;
    case 'inv_unrevealed':
      conditionMet = !target.revealed;
      break;
    default:
      break;
  }

  const disguisedEvaded =
    target.roleId === 'suong-tin-gia' && !target.revealed && conditionMet && !healCard;
  if (disguisedEvaded) {
    conditionMet = false;
  }

  if (conditionMet) {
    if (healCard) {
      applyHeal(state, target, 1);
    } else {
      applyDamage(state, target, 1, 'investigation', actor, nowMs);
    }
  }

  // Bảo mật P0: Kênh công khai chỉ thấy đã đưa Thẻ Thăm Dò Kín & có phản ứng hay không,
  // KHÔNG bao giờ lộ cardTitle hay điều kiện cụ thể cho người thứ 3!
  const publicMessage = conditionMet
    ? `🔍 ${actor.displayName} đưa Thẻ Thăm Dò Kín cho ${target.displayName}: Có phản ứng (${healCard ? 'hồi 1 thương tích nếu đang bị thương' : 'nhận hiệu ứng 1 thương tích'})!`
    : `🔍 ${actor.displayName} đưa Thẻ Thăm Dò Kín cho ${target.displayName}: Không có phản ứng.`;

  state.lastInvestigation = {
    id: `inv-${state.turnNumber}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    cardId: 'inv-00',
    cardTitle: 'Thẻ Thăm Dò Kín',
    conditionLabel: 'Điều kiện bí mật 1-đối-1',
    investigatorId: actor.playerId,
    investigatorName: actor.displayName,
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome: conditionMet ? 'condition-met' : 'no-reaction',
    publicMessage,
  };

  appendPrivateClue(actor, {
    round: state.round,
    atMs: nowMs,
    cardTitle: card.title,
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome: conditionMet ? 'condition-met' : 'no-reaction',
    detail: conditionMet
      ? `✅ Thỏa điều kiện [${card.conditionText ?? card.title}] → ${target.displayName} khớp điều kiện này!`
      : `❌ Không thỏa [${card.conditionText ?? card.title}] → loại trừ khả năng của ${target.displayName}.`,
  });

  appendPrivateClue(target, {
    round: state.round,
    atMs: nowMs,
    cardTitle: card.title,
    targetPlayerId: actor.playerId,
    targetName: actor.displayName,
    outcome: conditionMet ? 'condition-met' : 'no-reaction',
    detail: disguisedEvaded
      ? `${actor.displayName} đưa kín cho bạn "${card.title}" → Bạn khớp điều kiện nhưng 🎭 Ngụy Trang Tin Giả đã né sát thương & báo Không phản ứng!`
      : `${actor.displayName} đưa kín cho bạn "${card.title}" → ${conditionMet ? 'Bạn khớp điều kiện!' : 'Không khớp.'}`,
  });

  appendPublicLog(state, 'investigate', publicMessage, nowMs, actor.playerId);
  return { ok: true };
}

export function resolveAttack(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Chỉ được tấn công trong pha Hành động chính.' };
  }
  const target = state.players[targetPlayerId];
  if (!target || !canPlayerAttackTarget(state, actor, target)) {
    return {
      ok: false,
      error: 'Mục tiêu không nằm trong tầm đánh (phải cùng Cụm Khu Vực, trừ khi đeo Dây Cáp Đàn Hồi).',
    };
  }

  const hasPreciseStick = actor.equipped.includes('ev-01');
  const d6 = hasPreciseStick ? 0 : rollD6(state);
  const d4 = rollD4(state);
  const baseDmg = hasPreciseStick ? d4 : Math.abs(d6 - d4);

  actor.attacksMade += 1;

  let rawDmg = baseDmg;
  if (baseDmg > 0) {
    if (actor.equipped.includes('eq-04')) {
      rawDmg += actor.revealed && actor.faction === 'lantern-guard' ? 2 : 1;
    }
    if (actor.equipped.includes('ev-02')) rawDmg += 1;
    if (actor.equipped.includes('ev-03')) rawDmg += 2;
    if (actor.equipped.includes('ev-04')) rawDmg += 1;
  }

  const actualDealt = applyDamage(state, target, rawDmg, 'attack', actor, nowMs);

  state.lastDiceRoll = {
    id: `atk-${state.turnNumber}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    playerId: actor.playerId,
    displayName: actor.displayName,
    kind: 'attack',
    d6,
    d4,
    total: rawDmg,
    rerollRequired: false,
    freeChoice: false,
    resolvedLocation: null,
    targetPlayerId: target.playerId,
    damageDealt: actualDealt,
  };

  const rollDesc = hasPreciseStick ? `1d4=${d4}` : `|${d6}-${d4}|=${baseDmg}`;
  if (baseDmg === 0) {
    appendPublicLog(
      state,
      'attack',
      `⚔️ ${actor.displayName} đánh ${target.displayName} (${rollDesc}) → ĐÁNH HỤT (0 sát thương)!`,
      nowMs,
      actor.playerId,
    );
  } else {
    appendPublicLog(
      state,
      'attack',
      `⚔️ ${actor.displayName} tấn công ${target.displayName} (${rollDesc}, tổng ${rawDmg}) → gây ${actualDealt} sát thương!`,
      nowMs,
      actor.playerId,
    );
  }

  // Nội tại Tú "Ẩn Danh": hồi 2 thương tích mỗi khi đánh trúng (> 0).
  if (actualDealt > 0 && actor.alive && actor.revealed && actor.roleId === 'suong-an-danh') {
    const healed = applyHeal(state, actor, 2);
    if (healed > 0) {
      appendPublicLog(
        state,
        'skill',
        `🦇 Tú "Ẩn Danh" (${actor.displayName}) hút sinh lực hồi ${healed} thương tích!`,
        nowMs,
        actor.playerId,
      );
    }
  }

  // Móc Kéo Đồ KTX (ev-05) hoặc Hải "Sưu Tầm" (lật vai): gây >= 2 sát thương -> cướp 1 Trang bị.
  const canStealGear =
    actor.equipped.includes('ev-05') || (actor.revealed && actor.roleId === 'lang-anh-san');
  if (
    actualDealt >= 2 &&
    actor.alive &&
    target.alive &&
    canStealGear &&
    target.equipped.length > 0
  ) {
    const stolen = stealOneEquippedGear(state, actor, target);
    if (stolen) {
      appendPublicLog(
        state,
        'steal',
        actor.equipped.includes('ev-05')
          ? `🪝 ${actor.displayName} kích hoạt Móc Kéo Đồ KTX: cướp "${stolen.title}" từ ${target.displayName}!`
          : `🧲 Hải "Sưu Tầm" (${actor.displayName}) thu thập "${stolen.title}" từ ${target.displayName}!`,
        nowMs,
        actor.playerId,
      );
    }
  }

  // Nội tại Dũng "Gác Cổng": khi còn sống sau bị đánh thường -> lập tức tung đòn đánh trả (|1d6 - 1d4|).
  if (target.alive && target.revealed && target.roleId === 'suong-gac-cong' && actor.alive) {
    const cStick = target.equipped.includes('ev-01');
    const cd6 = cStick ? 0 : rollD6(state);
    const cd4 = rollD4(state);
    const cBase = cStick ? cd4 : Math.abs(cd6 - cd4);
    let cRaw = cBase;
    if (cBase > 0) {
      if (target.equipped.includes('eq-04')) cRaw += 1;
      if (target.equipped.includes('ev-02')) cRaw += 1;
      if (target.equipped.includes('ev-03')) cRaw += 2;
      if (target.equipped.includes('ev-04')) cRaw += 1;
    }
    const cDealt = applyDamage(state, actor, cRaw, 'attack', target, nowMs);
    if (state.lastDiceRoll) {
      state.lastDiceRoll.counterRoll = {
        playerId: target.playerId,
        displayName: target.displayName,
        d6: cd6,
        d4: cd4,
        total: cRaw,
        damageDealt: cDealt,
      };
    }
    const cRollDesc = cStick ? `1d4=${cd4}` : `|${cd6}-${cd4}|=${cBase}`;
    appendPublicLog(
      state,
      'skill',
      cDealt > 0
        ? `🥊 Dũng "Gác Cổng" (${target.displayName}) phản kích tức thì (${cRollDesc}, tổng ${cRaw}) → ${actor.displayName} chịu ${cDealt} sát thương!`
        : `🥊 Dũng "Gác Cổng" (${target.displayName}) phản kích (${cRollDesc}) nhưng đánh hụt ${actor.displayName}!`,
      nowMs,
      target.playerId,
    );
  }

  return { ok: true };
}

export function resolveRevealRole(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): EngineActionResult {
  if (actor.revealed) {
    return { ok: false, error: 'Vai của bạn đã được lật công khai rồi.' };
  }
  actor.revealed = true;
  const role = getRoleDesign(actor.roleId);
  state.lastRevealEvent = {
    id: `rev-${state.turnNumber}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    playerId: actor.playerId,
    displayName: actor.displayName,
    roleId: actor.roleId,
    roleName: role.name,
    faction: actor.faction,
    reason: 'voluntary',
  };
  appendPublicLog(
    state,
    'reveal',
    `🎭 ${actor.displayName} chủ động LẬT VAI: ${role.name} (${FACTION_LABELS[actor.faction]})!`,
    nowMs,
    actor.playerId,
  );
  appendHighlight(
    state,
    `${actor.displayName} lộ diện!`,
    `${role.name} thuộc phe ${FACTION_LABELS[actor.faction]} bước ra ánh sáng.`,
    nowMs,
  );
  return { ok: true };
}

export function resolveUseSkill(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string | undefined,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION' && state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Hãy tung xúc xắc di chuyển trước khi dùng kỹ năng.' };
  }
  if (!actor.revealed) {
    return { ok: false, error: 'Bạn cần Lật vai công khai trước khi kích hoạt kỹ năng.' };
  }
  const role = getRoleDesign(actor.roleId);
  if (role.targetMode === 'passive') {
    return { ok: false, error: `Kỹ năng "${role.skillName}" là nội tại tự động, không cần bấm.` };
  }
  if (role.oncePerMatch && actor.skillUsedOnce) {
    return { ok: false, error: `Kỹ năng "${role.skillName}" chỉ dùng được 1 lần mỗi trận.` };
  }
  if (actor.skillCooldown > 0) {
    return { ok: false, error: `Kỹ năng đang hồi chiêu (còn ${actor.skillCooldown} vòng).` };
  }

  switch (actor.roleId) {
    case 'gac-ky-thuat': {
      if (!targetPlayerId) {
        return { ok: false, error: 'Chọn 1 người chơi bất kỳ để tung Đòn Phá Vây 1d4.' };
      }
      const target = state.players[targetPlayerId];
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Mục tiêu phải là người chơi khác còn sống.' };
      }
      actor.skillUsedOnce = true;
      const die = rollD4(state);
      const dealt = applyDamage(state, target, die, 'skill', actor, nowMs);
      appendPublicLog(
        state,
        'skill',
        `💥 ${actor.displayName} kích hoạt Đòn Phá Vây (1d4=${die}) vào ${target.displayName} → ${dealt} sát thương!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'gac-truc-ban': {
      actor.skillUsedOnce = true;
      actor.guardianShieldActive = true;
      appendPublicLog(
        state,
        'skill',
        `🛡️ ${actor.displayName} bật Lá Chắn Chốt Trực — miễn nhiễm mọi sát thương tới đầu lượt sau!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'gac-radio': {
      if (!targetPlayerId) {
        return { ok: false, error: 'Chọn 1 người chơi bất kỳ để phóng Xung Cao Áp 1d6.' };
      }
      const target = state.players[targetPlayerId];
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Mục tiêu không hợp lệ.' };
      }
      actor.skillUsedOnce = true;
      const die = rollD6(state);
      const dealt = applyDamage(state, target, die, 'skill', actor, nowMs);
      appendPublicLog(
        state,
        'skill',
        `⚡ ${actor.displayName} tung Xung Cao Áp (1d6=${die}) vào ${target.displayName} → ${dealt} sát thương!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'suong-tin-gia': {
      if (!targetPlayerId) {
        return { ok: false, error: 'Chọn 1 người cùng Cụm để tung Nhiễu Loạn KTX.' };
      }
      const target = state.players[targetPlayerId];
      if (
        !target ||
        !target.alive ||
        target.playerId === actor.playerId ||
        !areInSameCluster(actor.location, target.location)
      ) {
        return { ok: false, error: 'Mục tiêu phải đang đứng cùng Cụm Khu Vực với bạn.' };
      }
      actor.skillCooldown = role.cooldownRounds;
      const dealt = applyDamage(state, target, 2, 'skill', actor, nowMs);
      appendPublicLog(
        state,
        'skill',
        `🌀 ${actor.displayName} tung Nhiễu Loạn KTX: ${target.displayName} chịu ${dealt} sát thương!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'lang-anh-san': {
      if (!targetPlayerId) {
        return { ok: false, error: 'Chọn 1 người cùng Cụm đang đeo Trang bị để thu thập.' };
      }
      const victim = state.players[targetPlayerId];
      if (
        !victim ||
        !victim.alive ||
        victim.playerId === actor.playerId ||
        !areInSameCluster(actor.location, victim.location)
      ) {
        return { ok: false, error: 'Mục tiêu phải đang đứng cùng Cụm Khu Vực với bạn.' };
      }
      if (victim.equipped.length === 0) {
        return { ok: false, error: `${victim.displayName} chưa đeo Trang bị nào.` };
      }
      actor.skillCooldown = role.cooldownRounds;
      const stolen = stealOneEquippedGear(state, actor, victim);
      appendPublicLog(
        state,
        'steal',
        `🧲 ${actor.displayName} dùng Thu Thập Chiến Lợi Phẩm: cướp "${stolen?.title ?? 'Trang bị'}" từ ${victim.displayName}!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'lang-quan-sat': {
      actor.skillUsedOnce = true;
      const healed = applyHeal(state, actor, actor.woundsTaken);
      appendPublicLog(
        state,
        'skill',
        `💚 ${actor.displayName} kích hoạt Ý Chí Hồi Sinh: hồi sạch ${healed} thương tích về 0!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'lang-cuu-ho': {
      if (!targetPlayerId) {
        return { ok: false, error: 'Chọn 1 người cùng Cụm để thực hiện Hộ Vệ & Báo Thù.' };
      }
      const target = state.players[targetPlayerId];
      if (
        !target ||
        !target.alive ||
        target.playerId === actor.playerId ||
        !areInSameCluster(actor.location, target.location)
      ) {
        return { ok: false, error: 'Mục tiêu phải đứng cùng Cụm Khu Vực với bạn.' };
      }
      actor.skillCooldown = role.cooldownRounds;
      const prot = actor.protegePlayerId ? state.players[actor.protegePlayerId] : null;
      if (!prot || prot.alive) {
        const healed = applyHeal(state, target, 2);
        if (actor.hp > 1) {
          applyDamage(state, actor, 1, 'skill', null, nowMs);
        }
        appendPublicLog(
          state,
          'skill',
          `🛟 ${actor.displayName} dùng Hộ Vệ: ${target.displayName} hồi ${healed} thương tích.`,
          nowMs,
          actor.playerId,
        );
      } else {
        const dealt = applyDamage(state, target, 2, 'skill', actor, nowMs);
        appendPublicLog(
          state,
          'skill',
          `⚔️ ${actor.displayName} kích hoạt Báo Thù cho ${prot.displayName}: ${target.displayName} chịu ${dealt} sát thương!`,
          nowMs,
          actor.playerId,
        );
      }
      return { ok: true };
    }

    default:
      return { ok: false, error: 'Vai này không có kỹ năng kích hoạt.' };
  }
}
