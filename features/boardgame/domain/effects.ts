// ---------------------------------------------------------------------------
// features/boardgame/domain/effects.ts — Thực thi mọi hiệu ứng chuẩn 100%
// Shadow Hunters: Xúc xắc di chuyển (+ La Bàn), 6 Khu vực, 48 Thẻ bài,
// 10 Nhân vật & Giao tranh.
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
  BOARD_GAME_MAX_EQUIPPED,
  BOARD_GAME_MAX_HAND,
  canPlayerAttackTarget,
  DEFAULT_CLUSTER_PAIRS,
  getLocationDefinition,
  getPairedLocationInCluster,
  listReachableAttackTargets,
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

export function discardCardId(state: AuthoritativeGameState, cardId: string): void {
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
  if (owner.equipped.length < BOARD_GAME_MAX_EQUIPPED) {
    owner.equipped.push(cardId);
  }
}

function pickEquippedIndex(
  equipped: readonly string[],
  mode: 'highest' | 'lowest',
  preferredCardId?: string,
): number {
  if (preferredCardId) {
    const found = equipped.indexOf(preferredCardId);
    if (found >= 0) return found;
  }
  let chosenIdx = 0;
  let chosenVal = mode === 'highest' ? -1 : Number.POSITIVE_INFINITY;
  for (let i = 0; i < equipped.length; i++) {
    const c = getCardById(equipped[i]);
    const val = c ? c.value : 0;
    if (mode === 'highest' ? val > chosenVal : val < chosenVal) {
      chosenVal = val;
      chosenIdx = i;
    }
  }
  return chosenIdx;
}

export function stealOneEquippedGear(
  _state: AuthoritativeGameState,
  thief: AuthoritativePlayerState,
  victim: AuthoritativePlayerState,
  preferredCardId?: string,
): GameCardDefinition | null {
  if (victim.equipped.length === 0) return null;
  const bestIdx = pickEquippedIndex(victim.equipped, 'highest', preferredCardId);
  const [stolenId] = victim.equipped.splice(bestIdx, 1);
  if (!stolenId) return null;
  equipToPlayerSlot(thief, stolenId);
  return getCardById(stolenId);
}

function transferLowestEquippedGear(
  giver: AuthoritativePlayerState,
  receiver: AuthoritativePlayerState,
  preferredCardId?: string,
): GameCardDefinition | null {
  if (giver.equipped.length === 0) return null;
  const idx = pickEquippedIndex(giver.equipped, 'lowest', preferredCardId);
  const [movedId] = giver.equipped.splice(idx, 1);
  if (!movedId) return null;
  equipToPlayerSlot(receiver, movedId);
  return getCardById(movedId);
}

function stealAllEquippedGear(
  thief: AuthoritativePlayerState,
  victim: AuthoritativePlayerState,
): GameCardDefinition[] {
  const stolen: GameCardDefinition[] = [];
  while (victim.equipped.length > 0) {
    const id = victim.equipped.shift();
    if (!id) continue;
    equipToPlayerSlot(thief, id);
    const def = getCardById(id);
    if (def) stolen.push(def);
  }
  return stolen;
}

function revealPlayerNow(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  reason: 'voluntary' | 'eliminated',
  nowMs: number,
): boolean {
  if (player.revealed) return false;
  player.revealed = true;
  const role = getRoleDesign(player.roleId);
  state.lastRevealEvent = {
    id: `rev-${state.turnNumber}-${player.playerId}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    playerId: player.playerId,
    displayName: player.displayName,
    roleId: player.roleId,
    roleName: role.name,
    faction: player.faction,
    reason,
  };
  return true;
}

export function applyDamage(
  state: AuthoritativeGameState,
  target: AuthoritativePlayerState,
  rawAmount: number,
  sourceType: DamageSourceKind,
  attacker: AuthoritativePlayerState | null,
  nowMs: number,
  options?: { isTalismanWardable?: boolean },
): number {
  if (!target.alive || rawAmount <= 0) return 0;

  // Lá Chắn Thiên Thần (eq-10): chỉ chặn đòn đánh thường (ATTACK) tới đầu lượt kế.
  if (sourceType === 'attack' && target.guardianShieldActive) {
    appendPublicLog(
      state,
      'skill',
      `🛡️ Lá Chắn Thiên Thần che chở ${target.displayName} — miễn nhiễm đòn đánh!`,
      nowMs,
      target.playerId,
    );
    return 0;
  }

  // Ghim Cài May Mắn (eq-02): miễn sát thương từ Hành Lang Tầng 4 (Ô 9 / Weird Woods).
  if (sourceType === 'location' && target.equipped.includes('eq-02')) {
    appendPublicLog(
      state,
      'equipment',
      `🍀 Ghim Cài May Mắn bảo vệ ${target.displayName} khỏi bẫy Ô 9 (0 sát thương)!`,
      nowMs,
      target.playerId,
    );
    return 0;
  }

  // Bùa Hộ Mệnh (eq-03): miễn sát thương từ Dơi Hút Điện (ev-07), Nhện Chập Mạch (ev-08), Kíp Nổ (ev-09).
  if (options?.isTalismanWardable && target.equipped.includes('eq-03')) {
    appendPublicLog(
      state,
      'equipment',
      `🧿 Bùa Hộ Mệnh bảo vệ ${target.displayName} — miễn nhiễm sát thương từ thẻ Đột Kích!`,
      nowMs,
      target.playerId,
    );
    return 0;
  }

  let finalDmg = rawAmount;
  // Áo Choàng Bảo Hộ (eq-01): giảm 1 sát thương từ đòn đánh thường (giảm về 0 được).
  if (sourceType === 'attack' && finalDmg > 0 && target.equipped.includes('eq-01')) {
    finalDmg = Math.max(0, finalDmg - 1);
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

    const deadCountNow = Object.values(state.players).filter((p) => !p.alive).length;
    if (!state.firstDeadPlayerId) {
      state.firstDeadPlayerId = target.playerId;
    }

    const role = getRoleDesign(target.roleId);
    state.lastRevealEvent = {
      id: `rev-${state.turnNumber}-${target.playerId}-${nowMs}`,
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

    // Đạt "Cảm Tử" (Daniel — Scream): nếu còn sống khi người khác ĐẦU TIÊN chết -> buộc lộ diện ngay!
    if (deadCountNow === 1) {
      for (const other of Object.values(state.players)) {
        if (
          other.playerId !== target.playerId &&
          other.alive &&
          !other.revealed &&
          other.roleId === 'lang-tien-phong'
        ) {
          revealPlayerNow(state, other, 'voluntary', nowMs);
          appendPublicLog(
            state,
            'reveal',
            `🗣️ Tiếng Hét Lộ Diện: ${other.displayName} (Đạt "Cảm Tử") buộc phải lật vai khi có người đầu tiên gục ngã!`,
            nowMs,
            other.playerId,
          );
        }
      }
    }

    // Bách "Cuồng Chiến" (Charles): thắng ngay khi đòn đánh thường kết liễu nạn nhân lúc tổng xác >= 3!
    if (
      attacker &&
      attacker.alive &&
      attacker.playerId !== target.playerId &&
      sourceType === 'attack' &&
      attacker.roleId === 'lang-cuu-ho' &&
      deadCountNow >= 3
    ) {
      attacker.charlesKillWon = true;
    }

    // Chiến lợi phẩm khi hạ gục (khi người khác kết liễu mục tiêu)
    if (
      attacker &&
      attacker.alive &&
      attacker.playerId !== target.playerId &&
      target.equipped.length > 0
    ) {
      const lootAll =
        sourceType === 'attack' &&
        (attacker.equipped.includes('eq-06') ||
          (attacker.revealed &&
            attacker.roleId === 'lang-anh-san' &&
            state.turnOrder.length >= 7));
      if (lootAll) {
        const lootedList = stealAllEquippedGear(attacker, target);
        if (lootedList.length > 0) {
          appendPublicLog(
            state,
            'steal',
            `🏆 ${attacker.displayName} thu giữ toàn bộ ${lootedList.length} Trang bị từ ${target.displayName} (${lootedList.map((c) => c.title).join(', ')})!`,
            nowMs,
            attacker.playerId,
          );
        }
      } else {
        const looted = stealOneEquippedGear(state, attacker, target);
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

  // La Bàn Định Hướng (eq-05): tung xúc xắc di chuyển 2 lần và chọn 1 trong 2 kết quả.
  if (actor.equipped.includes('eq-05')) {
    const rollOneNonSame = () => {
      let d6 = rollD6(state);
      let d4 = rollD4(state);
      let mapped = resolveLocationForDiceTotal(d6 + d4);
      let guard = 0;
      while (mapped === actor.location && guard < 4) {
        guard += 1;
        d6 = rollD6(state);
        d4 = rollD4(state);
        mapped = resolveLocationForDiceTotal(d6 + d4);
      }
      if (mapped === actor.location) {
        const alt = LOCATIONS_CATALOG.find((l) => l.id !== actor.location)?.id ?? 'lobby';
        mapped = alt;
      }
      return { d6, d4, total: d6 + d4, mapped };
    };

    const r1 = rollOneNonSame();
    const r2 = rollOneNonSame();
    const allOthers = LOCATIONS_CATALOG.filter((l) => l.id !== actor.location).map((l) => l.id);
    const hasChooseAny = r1.mapped === 'choose-any' || r2.mapped === 'choose-any';
    const distinctChoices = hasChooseAny
      ? allOthers
      : Array.from(
          new Set(
            [r1.mapped, r2.mapped].filter(
              (m): m is BoardGameLocationId => m !== 'choose-any' && m !== actor.location,
            ),
          ),
        );
    const finalChoices = distinctChoices.length > 0 ? distinctChoices : [allOthers[0]];

    if (finalChoices.length === 1) {
      const destId = finalChoices[0];
      const destDef = getLocationDefinition(destId);
      actor.location = destId;
      actor.consecutiveSameZoneRolls = 0;
      state.allowedMoveDestinations = undefined;
      state.turnPhase = 'LOCATION_ACTION';
      state.lastDiceRoll = {
        id: `roll-${state.turnNumber}-${nowMs}`,
        round: state.round,
        atMs: nowMs,
        playerId: actor.playerId,
        displayName: actor.displayName,
        kind: 'move',
        d6: r1.d6,
        d4: r1.d4,
        total: r1.total,
        rerollRequired: false,
        freeChoice: false,
        resolvedLocation: destId,
      };
      appendPublicLog(
        state,
        'move',
        `🧭 La Bàn (${actor.displayName}): (${r1.d6}+${r1.d4}) & (${r2.d6}+${r2.d4}) → tới Ô ${destDef.diceLabel} (${destDef.name}).`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    state.turnPhase = 'CHOOSE_MOVE';
    state.allowedMoveDestinations = finalChoices;
    actor.consecutiveSameZoneRolls = 0;
    state.lastDiceRoll = {
      id: `roll-${state.turnNumber}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      playerId: actor.playerId,
      displayName: actor.displayName,
      kind: 'move',
      d6: r1.d6,
      d4: r1.d4,
      total: r1.total,
      rerollRequired: false,
      freeChoice: true,
      resolvedLocation: finalChoices[0],
    };
    appendPublicLog(
      state,
      'dice',
      `🧭 La Bàn Định Hướng: ${actor.displayName} tung (${r1.d6}+${r1.d4}=${r1.total}) & (${r2.d6}+${r2.d4}=${r2.total}) — hãy chọn 1 khu vực!`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  const d6 = rollD6(state);
  const d4 = rollD4(state);
  const total = d6 + d4;
  const mapped = resolveLocationForDiceTotal(total);

  if (mapped === 'choose-any') {
    state.allowedMoveDestinations = LOCATIONS_CATALOG.filter((l) => l.id !== actor.location).map(
      (l) => l.id,
    );
    state.lastDiceRoll = {
      id: `roll-${state.turnNumber}-${nowMs}`,
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
    state.turnPhase = 'CHOOSE_MOVE';
    actor.consecutiveSameZoneRolls = 0;
    appendPublicLog(
      state,
      'dice',
      `🎲 ${actor.displayName} tung ${d6} + ${d4} = 7! Tự do chọn khu vực bất kỳ trên bàn.`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  if (mapped === actor.location) {
    actor.consecutiveSameZoneRolls += 1;
    if (actor.consecutiveSameZoneRolls >= 2) {
      const others = LOCATIONS_CATALOG.filter((l) => l.id !== actor.location);
      const fallback = others[nextRandomInt(state, others.length)];
      actor.location = fallback.id;
      actor.consecutiveSameZoneRolls = 0;
      state.allowedMoveDestinations = undefined;
      state.turnPhase = 'LOCATION_ACTION';
      state.lastDiceRoll = {
        id: `roll-${state.turnNumber}-${nowMs}`,
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
        resolvedLocation: fallback.id,
      };
      appendPublicLog(
        state,
        'move',
        `🎲 ${actor.displayName} tung trùng ô hiện tại liên tiếp 2 lần → hệ thống chuyển thẳng sang Ô ${fallback.diceLabel} (${fallback.name}).`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    state.allowedMoveDestinations = undefined;
    state.lastDiceRoll = {
      id: `roll-${state.turnNumber}-${nowMs}`,
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
    const sameLoc = getLocationDefinition(mapped);
    appendPublicLog(
      state,
      'dice',
      `🎲 ${actor.displayName} tung ${d6} + ${d4} = ${total} (trùng ${sameLoc.name}) → được quyền ĐỔ LẠI!`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  actor.location = mapped;
  actor.consecutiveSameZoneRolls = 0;
  state.allowedMoveDestinations = undefined;
  state.turnPhase = 'LOCATION_ACTION';
  const destDef = getLocationDefinition(mapped);
  state.lastDiceRoll = {
    id: `roll-${state.turnNumber}-${nowMs}`,
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
    `🚶 ${actor.displayName} tung ${d6} + ${d4} = ${total} → di chuyển tới Ô ${destDef.diceLabel} (${destDef.name}).`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

export function resolveChooseDestination(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  destLocation: BoardGameLocationId,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'CHOOSE_MOVE') {
    return { ok: false, error: 'Chỉ chọn khu vực khi có quyền lựa chọn điểm đến (Tổng 7 hoặc La Bàn).' };
  }
  if (destLocation === actor.location) {
    return { ok: false, error: 'Phải di chuyển tới một khu vực khác với vị trí đang đứng.' };
  }
  if (
    state.allowedMoveDestinations &&
    state.allowedMoveDestinations.length > 0 &&
    !state.allowedMoveDestinations.includes(destLocation)
  ) {
    return { ok: false, error: 'Điểm đến không nằm trong lựa chọn hợp lệ từ kết quả xúc xắc.' };
  }
  actor.location = destLocation;
  actor.consecutiveSameZoneRolls = 0;
  state.allowedMoveDestinations = undefined;
  state.turnPhase = 'LOCATION_ACTION';
  const destDef = getLocationDefinition(destLocation);
  if (state.lastDiceRoll && state.lastDiceRoll.playerId === actor.playerId) {
    state.lastDiceRoll = {
      ...state.lastDiceRoll,
      resolvedLocation: destLocation,
    };
  }
  appendPublicLog(
    state,
    'move',
    `✨ ${actor.displayName} chọn di chuyển tới Ô ${destDef.diceLabel} (${destDef.name}).`,
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

  const deckLabel =
    deckId === 'investigation'
      ? 'Khám Phá (Xanh)'
      : deckId === 'equipment'
        ? 'Cung Ứng (Trắng)'
        : 'Đột Kích (Đen)';

  // Chuẩn Shadow Hunters: Rút trúng Trang bị -> đặt ngửa ĐEO NGAY trước mặt!
  if (!card.isConsumable && card.deck !== 'investigation') {
    equipToPlayerSlot(actor, card.id);
    state.turnPhase = 'MAIN_ACTION';
    appendPublicLog(
      state,
      'equipment',
      `🎒 ${actor.displayName} rút từ ${deckLabel} tại ${loc.name} và trang bị ngay "${card.title}"!`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  if (actor.hand.length >= BOARD_GAME_MAX_HAND) {
    const discardedId = actor.hand.shift();
    if (discardedId) discardCardId(state, discardedId);
  }
  actor.hand.push(card.id);
  state.turnPhase = 'MAIN_ACTION';

  appendPublicLog(
    state,
    'draw',
    `🃏 ${actor.displayName} rút 1 thẻ ${deckLabel} tại ${loc.name} (cần giải quyết trong lượt).`,
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
  equipCardId?: string,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION') {
    return { ok: false, error: 'Không ở pha hành động khu vực.' };
  }

  if (actor.location === 'corridor') {
    const target = targetPlayerId ? state.players[targetPlayerId] : actor;
    if (!target || !target.alive) {
      return { ok: false, error: 'Mục tiêu Hành Lang (9) không hợp lệ hoặc đã bị loại.' };
    }
    const chosenMode =
      mode === 'damage'
        ? 'damage'
        : mode === 'heal'
          ? 'heal'
          : target.playerId === actor.playerId
            ? 'heal'
            : 'damage';
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
      return {
        ok: false,
        error: 'Hãy chọn 1 người chơi đang đeo Trang bị để cướp, hoặc Bỏ qua khu vực.',
      };
    }
    const victim = state.players[targetPlayerId];
    if (!victim || !victim.alive || victim.playerId === actor.playerId) {
      return { ok: false, error: 'Mục tiêu Sân Bóng (10) không hợp lệ.' };
    }
    if (victim.equipped.length === 0) {
      return { ok: false, error: `${victim.displayName} chưa đeo Trang bị nào để cướp.` };
    }
    const stolen = stealOneEquippedGear(state, actor, victim, equipCardId);
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

  return { ok: false, error: 'Khu vực hiện tại dùng hành động rút bài, không phải quyền năng đặc biệt.' };
}

export function resolveSkipLocation(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'LOCATION_ACTION') {
    return { ok: false, error: 'Không ở pha hành động khu vực.' };
  }
  state.turnPhase = 'MAIN_ACTION';
  appendPublicLog(
    state,
    'system',
    `⏭️ ${actor.displayName} bỏ qua hành động khu vực để vào pha Chiến đấu.`,
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
  _targetLocation: BoardGameLocationId | undefined,
  nowMs: number,
  equipCardId?: string,
  skipEffect?: boolean,
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
    return { ok: false, error: 'Thẻ Khám Phá cần dùng hành động Điều Tra lên 1 người chơi khác.' };
  }
  if (!card.isConsumable) {
    return resolveEquipCard(state, actor, cardId, nowMs);
  }

  switch (card.effectKind) {
    case 'eq_holy_water': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const healed = applyHeal(state, actor, 2);
      appendPublicLog(
        state,
        'equipment',
        `💧 ${actor.displayName} uống "${card.title}": tự hồi ${healed} thương tích.`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'eq_blessing': {
      const target = targetPlayerId ? state.players[targetPlayerId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Lời Chúc Cứu Viện yêu cầu chọn 1 người chơi KHÁC còn sống.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const roll = rollD6(state);
      const healed = applyHeal(state, target, roll);
      appendPublicLog(
        state,
        'equipment',
        `✨ ${actor.displayName} dùng "${card.title}" cho ${target.displayName} (tung 1d6=${roll}) → hồi ${healed} thương tích!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'eq_first_aid': {
      const target = targetPlayerId ? state.players[targetPlayerId] : actor;
      if (!target || !target.alive) {
        return { ok: false, error: 'Mục tiêu Sơ Cứu Mốc 7 không hợp lệ.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const prevWounds = target.woundsTaken;
      target.woundsTaken = Math.min(target.maxHp - 1, 7);
      target.hp = target.maxHp - target.woundsTaken;
      appendPublicLog(
        state,
        'equipment',
        `🩺 ${actor.displayName} dùng "${card.title}" lên ${target.displayName}: thương tích chuyển từ ${prevWounds} → ${target.woundsTaken}!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'eq_guardian_angel': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      actor.guardianShieldActive = true;
      appendPublicLog(
        state,
        'equipment',
        `🛡️ ${actor.displayName} kích hoạt "${card.title}" — miễn nhiễm đòn đánh thường tới đầu lượt kế tiếp!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'eq_flare': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const others = Object.values(state.players).filter(
        (p) => p.alive && p.playerId !== actor.playerId,
      );
      for (const other of others) {
        applyDamage(state, other, 2, 'event', actor, nowMs);
      }
      appendPublicLog(
        state,
        'event',
        `💥 ${actor.displayName} bắn "${card.title}": tất cả ${others.length} người chơi khác chịu 2 sát thương!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'eq_mirror': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (
        (actor.roleId === 'suong-an-danh' || actor.roleId === 'suong-gac-cong') &&
        !actor.revealed
      ) {
        revealPlayerNow(state, actor, 'voluntary', nowMs);
        const role = getRoleDesign(actor.roleId);
        appendPublicLog(
          state,
          'reveal',
          `🪞 ${actor.displayName} soi "${card.title}" và buộc phải lộ diện: ${role.name} (${FACTION_LABELS[actor.faction]})!`,
          nowMs,
          actor.playerId,
        );
      } else {
        appendPublicLog(
          state,
          'equipment',
          `🪞 ${actor.displayName} soi "${card.title}" — không có phản ứng lộ diện.`,
          nowMs,
          actor.playerId,
        );
      }
      return { ok: true };
    }

    case 'eq_advent': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (!skipEffect && actor.faction === 'lantern-guard') {
        revealPlayerNow(state, actor, 'voluntary', nowMs);
        const healed = applyHeal(state, actor, actor.woundsTaken);
        appendPublicLog(
          state,
          'reveal',
          `🔦 ${actor.displayName} kích hoạt "${card.title}" (Đội Săn Đêm): lộ vai & hồi sạch ${healed} thương tích về 0!`,
          nowMs,
          actor.playerId,
        );
      } else {
        appendPublicLog(
          state,
          'equipment',
          `🃏 ${actor.displayName} bỏ qua "${card.title}" (giữ kín / không kích hoạt).`,
          nowMs,
          actor.playerId,
        );
      }
      return { ok: true };
    }

    case 'eq_chocolate': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const qualifies =
        actor.roleId === 'lang-quan-sat' ||
        actor.roleId === 'gac-truc-ban' ||
        actor.roleId === 'suong-tin-gia';
      if (!skipEffect && qualifies) {
        revealPlayerNow(state, actor, 'voluntary', nowMs);
        const healed = applyHeal(state, actor, actor.woundsTaken);
        appendPublicLog(
          state,
          'reveal',
          `🍫 ${actor.displayName} dùng "${card.title}": lộ vai ${getRoleDesign(actor.roleId).name} & hồi sạch ${healed} thương tích về 0!`,
          nowMs,
          actor.playerId,
        );
      } else {
        appendPublicLog(
          state,
          'equipment',
          `🍫 ${actor.displayName} đặt xuống "${card.title}" (không kích hoạt).`,
          nowMs,
          actor.playerId,
        );
      }
      return { ok: true };
    }

    case 'eq_concealed_knowledge': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      state.extraTurnPending = true;
      appendPublicLog(
        state,
        'equipment',
        `📘 ${actor.displayName} kích hoạt "${card.title}" — sẽ được đi thêm 1 lượt phụ ngay sau lượt này!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'ev_vampire_bat': {
      const target = targetPlayerId ? state.players[targetPlayerId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi khác để dùng Dơi Hút Điện.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const dealt = applyDamage(state, target, 2, 'event', actor, nowMs, {
        isTalismanWardable: true,
      });
      const healed = actor.alive ? applyHeal(state, actor, 1) : 0;
      appendPublicLog(
        state,
        'event',
        `🦇 ${actor.displayName} dùng "${card.title}" lên ${target.displayName} (-${dealt} HP, bản thân +${healed} HP).`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'ev_spider': {
      const target = targetPlayerId ? state.players[targetPlayerId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi khác để phóng Nhện Chập Mạch.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const dealtTarget = applyDamage(state, target, 2, 'event', actor, nowMs, {
        isTalismanWardable: true,
      });
      const dealtSelf = applyDamage(state, actor, 2, 'event', null, nowMs, {
        isTalismanWardable: true,
      });
      appendPublicLog(
        state,
        'event',
        `🕷️ ${actor.displayName} tung "${card.title}": ${target.displayName} chịu ${dealtTarget} ST, bản thân chịu ${dealtSelf} ST!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'ev_dynamite': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const d6 = rollD6(state);
      const d4 = rollD4(state);
      const total = d6 + d4;
      const mapped = resolveLocationForDiceTotal(total);
      if (mapped === 'choose-any') {
        state.lastDiceRoll = {
          id: `dyn-${state.turnNumber}-${nowMs}`,
          round: state.round,
          atMs: nowMs,
          playerId: actor.playerId,
          displayName: actor.displayName,
          kind: 'attack',
          d6,
          d4,
          total,
          rerollRequired: false,
          freeChoice: false,
          resolvedLocation: null,
          damageDealt: 0,
        };
        appendPublicLog(
          state,
          'event',
          `🧨 ${actor.displayName} kích hoạt Kíp Nổ Tự Động (${d6}+${d4}=7) → BOM XỊT (0 sát thương)!`,
          nowMs,
          actor.playerId,
        );
        return { ok: true };
      }
      const zoneDef = getLocationDefinition(mapped);
      const victims = Object.values(state.players).filter((p) => p.alive && p.location === mapped);
      let totalDmg = 0;
      for (const v of victims) {
        totalDmg += applyDamage(state, v, 3, 'event', actor, nowMs, {
          isTalismanWardable: true,
        });
      }
      state.lastDiceRoll = {
        id: `dyn-${state.turnNumber}-${nowMs}`,
        round: state.round,
        atMs: nowMs,
        playerId: actor.playerId,
        displayName: actor.displayName,
        kind: 'attack',
        d6,
        d4,
        total,
        rerollRequired: false,
        freeChoice: false,
        resolvedLocation: mapped,
        damageDealt: totalDmg,
      };
      appendPublicLog(
        state,
        'event',
        `🧨 ${actor.displayName} ném "${card.title}" (${d6}+${d4}=${total} → ${zoneDef.name}): ${victims.length} người dính vụ nổ 3 ST!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'ev_spiritual_doll': {
      const target = targetPlayerId ? state.players[targetPlayerId] : null;
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi khác cho Búp Bê Tâm Linh.' };
      }
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const d6 = rollD6(state);
      if (d6 <= 4) {
        const dealt = applyDamage(state, target, 3, 'event', actor, nowMs);
        appendPublicLog(
          state,
          'event',
          `🪆 ${actor.displayName} gieo "${card.title}" (1d6=${d6}) → ${target.displayName} chịu ${dealt} ST!`,
          nowMs,
          actor.playerId,
        );
      } else {
        const dealtSelf = applyDamage(state, actor, 3, 'event', null, nowMs);
        appendPublicLog(
          state,
          'event',
          `🪆 ${actor.displayName} gieo "${card.title}" (1d6=${d6}) → PHẢN TÁC DỤNG! ${actor.displayName} tự chịu ${dealtSelf} ST!`,
          nowMs,
          actor.playerId,
        );
      }
      return { ok: true };
    }

    case 'ev_moody_goblin': {
      const donors = Object.values(state.players).filter(
        (p) => p.alive && p.playerId !== actor.playerId && p.equipped.length > 0,
      );
      if (donors.length === 0) {
        actor.hand.splice(idx, 1);
        discardCardId(state, card.id);
        appendPublicLog(
          state,
          'event',
          `👺 ${actor.displayName} dùng "${card.title}" nhưng chưa ai đeo Trang bị để cướp.`,
          nowMs,
          actor.playerId,
        );
        return { ok: true };
      }
      const victim =
        (targetPlayerId ? donors.find((d) => d.playerId === targetPlayerId) : null) ?? donors[0];
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      const stolen = stealOneEquippedGear(state, actor, victim, equipCardId);
      if (stolen) {
        appendPublicLog(
          state,
          'steal',
          `👺 ${actor.displayName} dùng "${card.title}": cướp "${stolen.title}" của ${victim.displayName}!`,
          nowMs,
          actor.playerId,
        );
      }
      return { ok: true };
    }

    case 'ev_banana_peel': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (actor.equipped.length === 0) {
        const dealt = applyDamage(state, actor, 1, 'event', null, nowMs);
        appendPublicLog(
          state,
          'event',
          `🍌 ${actor.displayName} trượt "${card.title}" (không có Trang bị để giao) → tự chịu ${dealt} ST!`,
          nowMs,
          actor.playerId,
        );
        return { ok: true };
      }
      const others = Object.values(state.players).filter(
        (p) => p.alive && p.playerId !== actor.playerId,
      );
      const recipient =
        (targetPlayerId ? others.find((p) => p.playerId === targetPlayerId) : null) ?? others[0];
      if (!recipient) {
        return { ok: true };
      }
      const given = transferLowestEquippedGear(actor, recipient, equipCardId);
      appendPublicLog(
        state,
        'event',
        `🍌 ${actor.displayName} dính "${card.title}": phải giao "${given?.title ?? '1 Trang bị'}" cho ${recipient.displayName}!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'ev_diabolic_ritual': {
      actor.hand.splice(idx, 1);
      discardCardId(state, card.id);
      if (!skipEffect && actor.faction === 'mist-order') {
        revealPlayerNow(state, actor, 'voluntary', nowMs);
        const healed = applyHeal(state, actor, actor.woundsTaken);
        appendPublicLog(
          state,
          'reveal',
          `🌑 ${actor.displayName} cử hành "${card.title}" (Hội Bóng Đêm): lộ vai & hồi sạch ${healed} thương tích về 0!`,
          nowMs,
          actor.playerId,
        );
      } else {
        appendPublicLog(
          state,
          'equipment',
          `🌑 ${actor.displayName} gác lại "${card.title}" (giữ kín / không kích hoạt).`,
          nowMs,
          actor.playerId,
        );
      }
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

  // Trường hợp đặc biệt: inv-12 Tiên Tri (Hermit's Prediction) soi thẳng vai thật 1-đối-1
  if (card.effectKind === 'inv_prediction') {
    const targetRole = getRoleDesign(target.roleId);
    appendPrivateClue(actor, {
      round: state.round,
      atMs: nowMs,
      cardTitle: card.title,
      targetPlayerId: target.playerId,
      targetName: target.displayName,
      outcome: 'condition-met',
      detail: `🔮 Tiên Tri: ${target.displayName} chính là ${targetRole.name} (${FACTION_LABELS[target.faction]}, ${target.maxHp} HP).`,
    });
    appendPrivateClue(target, {
      round: state.round,
      atMs: nowMs,
      cardTitle: card.title,
      targetPlayerId: actor.playerId,
      targetName: actor.displayName,
      outcome: 'condition-met',
      detail: `🔮 ${actor.displayName} đã đưa "Thăm Dò: Tiên Tri" và nhìn thấy vai thật của bạn (${targetRole.name}).`,
    });
    const pubMsg = `🔍 ${actor.displayName} đưa Thẻ Thăm Dò Kín cho ${target.displayName}: trao đổi mật tín bí mật.`;
    state.lastInvestigation = {
      id: `inv-${state.turnNumber}-${nowMs}`,
      round: state.round,
      atMs: nowMs,
      cardId: 'inv-00',
      cardTitle: 'Thẻ Thăm Dò Kín',
      conditionLabel: 'Mật báo 1-đối-1',
      investigatorId: actor.playerId,
      investigatorName: actor.displayName,
      targetPlayerId: target.playerId,
      targetName: target.displayName,
      outcome: 'condition-met',
      publicMessage: pubMsg,
    };
    appendPublicLog(state, 'investigate', pubMsg, nowMs, actor.playerId);
    return { ok: true };
  }

  let rawMatch = false;
  let isHealHermit = false;
  switch (card.effectKind) {
    case 'inv_anger':
      rawMatch = target.faction === 'lantern-guard' || target.faction === 'mist-order';
      break;
    case 'inv_blackmail':
      rawMatch = target.faction === 'lantern-guard' || target.faction === 'wanderer';
      break;
    case 'inv_greed':
      rawMatch = target.faction === 'wanderer' || target.faction === 'mist-order';
      break;
    case 'inv_slap':
      rawMatch = target.faction === 'lantern-guard';
      break;
    case 'inv_spell':
    case 'inv_exorcism':
      rawMatch = target.faction === 'mist-order';
      break;
    case 'inv_aid':
      rawMatch = target.faction === 'lantern-guard';
      isHealHermit = true;
      break;
    case 'inv_nurturance':
      rawMatch = target.faction === 'wanderer';
      isHealHermit = true;
      break;
    case 'inv_huddle':
      rawMatch = target.faction === 'mist-order';
      isHealHermit = true;
      break;
    case 'inv_bully':
      rawMatch = target.maxHp <= 11;
      break;
    case 'inv_tough_lesson':
      rawMatch = target.maxHp >= 12;
      break;
    default:
      break;
  }

  // Khánh "Tin Giả" (Unknown - Deceit): khi đang úp vai có thể nói dối trước thẻ Hermit!
  const isUnrevealedUnknown = target.roleId === 'suong-tin-gia' && !target.revealed;
  let effectiveMatch = rawMatch;
  let usedDeceit = false;
  if (isUnrevealedUnknown) {
    if (isHealHermit) {
      // Đang mất máu -> giả danh để nhận hồi 1 máu; đang 0 vết -> nói "Không phản ứng" để tránh -1 ST!
      effectiveMatch = target.woundsTaken > 0;
      usedDeceit = effectiveMatch !== rawMatch;
    } else {
      effectiveMatch = false;
      usedDeceit = rawMatch;
    }
  }

  const outcome = effectiveMatch ? 'condition-met' : 'no-reaction';
  const condTag = card.conditionText ?? card.title;
  let effectNote = 'Không phản ứng.';
  let transferredGearName: string | null = null;

  if (effectiveMatch) {
    if (
      card.effectKind === 'inv_anger' ||
      card.effectKind === 'inv_blackmail' ||
      card.effectKind === 'inv_greed'
    ) {
      const preferGear =
        target.equipped.length > 0 && (target.hp <= 2 || target.roleId !== 'lang-anh-san');
      if (preferGear) {
        const stolen = transferLowestEquippedGear(target, actor);
        transferredGearName = stolen?.title ?? null;
        effectNote = stolen
          ? `Giao nộp "${stolen.title}" cho ${actor.displayName}!`
          : 'Khớp điều kiện nhưng không có đồ để giao.';
      } else {
        const dealt = applyDamage(state, target, 1, 'investigation', actor, nowMs);
        effectNote = `Khớp điều kiện — nhận ${dealt} thương tích.`;
      }
    } else if (isHealHermit) {
      if (target.woundsTaken > 0) {
        const healed = applyHeal(state, target, 1);
        effectNote = `Khớp điều kiện — hồi ${healed} thương tích.`;
      } else {
        // Chuẩn Shadow Hunters (Aid/Nurturance/Huddle): đang 0 thương tích phải nhận 1 thương tích!
        const dealt = applyDamage(state, target, 1, 'investigation', actor, nowMs);
        effectNote = `Khớp điều kiện (đang 0 vết) — phải nhận ${dealt} thương tích!`;
      }
    } else {
      const dmgAmount =
        card.effectKind === 'inv_exorcism' || card.effectKind === 'inv_tough_lesson' ? 2 : 1;
      const dealt = applyDamage(state, target, dmgAmount, 'investigation', actor, nowMs);
      effectNote = `Khớp điều kiện — nhận ${dealt} thương tích.`;
    }
  }

  appendPrivateClue(actor, {
    round: state.round,
    atMs: nowMs,
    cardTitle: card.title,
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome,
    detail: `[${condTag}] ${target.displayName} → ${effectNote}`,
  });

  appendPrivateClue(target, {
    round: state.round,
    atMs: nowMs,
    cardTitle: card.title,
    targetPlayerId: actor.playerId,
    targetName: actor.displayName,
    outcome,
    detail: usedDeceit
      ? `🎭 ${actor.displayName} đưa "${card.title}" [${condTag}] — Bạn đã Ngụy Trang Đa Tầng → ${effectNote}`
      : `Bạn nhận "${card.title}" [${condTag}] từ ${actor.displayName} → ${effectNote}`,
  });

  const publicEffectText = transferredGearName
    ? `${target.displayName} phải chuyển "${transferredGearName}" cho ${actor.displayName}!`
    : effectiveMatch
      ? 'Có phản ứng (trên Thang Thương Tích)!'
      : 'Không có gì xảy ra.';
  const pubMsg = `🔍 ${actor.displayName} đưa Thẻ Thăm Dò Kín cho ${target.displayName}: ${publicEffectText}`;

  state.lastInvestigation = {
    id: `inv-${state.turnNumber}-${nowMs}`,
    round: state.round,
    atMs: nowMs,
    // BẢO MẬT P0: Không lộ cardId/điều kiện thẻ ở kênh công khai!
    cardId: 'inv-00',
    cardTitle: 'Thẻ Thăm Dò Kín',
    conditionLabel: 'Điều kiện bí mật 1-đối-1',
    investigatorId: actor.playerId,
    investigatorName: actor.displayName,
    targetPlayerId: target.playerId,
    targetName: target.displayName,
    outcome,
    publicMessage: pubMsg,
  };

  appendPublicLog(state, 'investigate', pubMsg, nowMs, actor.playerId);
  return { ok: true };
}

export function resolveAttack(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  targetPlayerId: string,
  nowMs: number,
): EngineActionResult {
  if (state.turnPhase !== 'MAIN_ACTION') {
    return { ok: false, error: 'Chỉ được tấn công khi đang ở pha Hành động chính.' };
  }
  const target = state.players[targetPlayerId];
  if (!target || !target.alive || target.playerId === actor.playerId) {
    return { ok: false, error: 'Mục tiêu tấn công không hợp lệ.' };
  }
  if (!canPlayerAttackTarget(state, actor, target)) {
    return {
      ok: false,
      error: actor.equipped.includes('ev-05')
        ? 'Súng Bắn Đinh (Handgun) chỉ bắn được các Cụm KHÁC ngoài Cụm bạn đang đứng!'
        : 'Mục tiêu phải đứng cùng Cụm Khu Vực với bạn.',
    };
  }

  const hasMasamune = actor.equipped.includes('ev-01');
  const hasMachineGun = actor.equipped.includes('ev-06');
  const d6 = hasMasamune ? 0 : rollD6(state);
  const d4 = rollD4(state);
  const baseDmg = hasMasamune ? d4 : Math.abs(d6 - d4);

  actor.attacksMade += 1;
  actor.attacksThisTurn += 1;

  let rawDmg = baseDmg;
  if (baseDmg > 0) {
    // Thương Ánh Sáng (eq-04): chỉ +2 nếu là Đội Săn Đêm ĐÃ LẬT VAI
    if (actor.equipped.includes('eq-04') && actor.revealed && actor.faction === 'lantern-guard') {
      rawDmg += 2;
    }
    if (actor.equipped.includes('ev-02')) rawDmg += 1; // Dao Rọc Kỹ Thuật
    if (actor.equipped.includes('ev-03')) rawDmg += 1; // Cưa Máy Công Xưởng
    if (actor.equipped.includes('ev-04')) rawDmg += 1; // Rìu Sắt Cứu Hỏa
    if (actor.equipped.includes('eq-01')) rawDmg = Math.max(0, rawDmg - 1); // Áo Choàng Bảo Hộ
  }

  const targets = hasMachineGun ? listReachableAttackTargets(state, actor) : [target];
  let totalDealt = 0;
  const counterAttackers: AuthoritativePlayerState[] = [];
  const rollDesc = hasMasamune ? `1d4=${d4}` : `|${d6}-${d4}|=${baseDmg}`;

  for (const victim of targets) {
    // Hải "Sưu Tầm" (Bob 4–6 người): gây >= 2 ST có thể cướp 1 Trang bị THAY VÌ gây sát thương
    const bobStealInstead =
      state.turnOrder.length <= 6 &&
      actor.alive &&
      actor.revealed &&
      actor.roleId === 'lang-anh-san' &&
      rawDmg >= 2 &&
      victim.equipped.length > 0;

    if (bobStealInstead) {
      const stolen = stealOneEquippedGear(state, actor, victim);
      if (stolen) {
        appendPublicLog(
          state,
          'steal',
          `🧲 Hải "Sưu Tầm" (${actor.displayName}) chọn Cướp Đồ Thay Đòn (${rollDesc}) → lấy "${stolen.title}" từ ${victim.displayName} (0 sát thương)!`,
          nowMs,
          actor.playerId,
        );
      }
    } else {
      const dealt = applyDamage(state, victim, rawDmg, 'attack', actor, nowMs);
      totalDealt += dealt;
      if (targets.length === 1) {
        appendPublicLog(
          state,
          'attack',
          rawDmg === 0
            ? `⚔️ ${actor.displayName} đánh ${victim.displayName} (${rollDesc}) → ĐÁNH HỤT (0 sát thương)!`
            : `⚔️ ${actor.displayName} tấn công ${victim.displayName} (${rollDesc}, tổng ${rawDmg}) → gây ${dealt} sát thương!`,
          nowMs,
          actor.playerId,
        );
      }
    }

    if (victim.alive && victim.revealed && victim.roleId === 'suong-gac-cong') {
      counterAttackers.push(victim);
    }
  }

  if (targets.length > 1) {
    appendPublicLog(
      state,
      'attack',
      `🔫 Súng Liên Thanh! ${actor.displayName} xả đạn (${rollDesc}, tổng ${rawDmg}) vào ${targets.length} người trong tầm → tổng ${totalDealt} sát thương!`,
      nowMs,
      actor.playerId,
    );
  }

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
    damageDealt: totalDealt,
  };

  // Nội tại Tú "Ẩn Danh" (Vampire): hồi 2 thương tích nếu đòn đánh gây > 0 sát thương.
  if (totalDealt > 0 && actor.alive && actor.revealed && actor.roleId === 'suong-an-danh') {
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

  // Nội tại Dũng "Gác Cổng" (Werewolf): bị đánh mà còn sống -> phản kích ngay (kể cả bắn tầm xa).
  for (const dung of counterAttackers) {
    if (!dung.alive || !actor.alive) continue;
    const cStick = dung.equipped.includes('ev-01');
    const cd6 = cStick ? 0 : rollD6(state);
    const cd4 = rollD4(state);
    const cBase = cStick ? cd4 : Math.abs(cd6 - cd4);
    let cRaw = cBase;
    if (cBase > 0) {
      if (dung.equipped.includes('ev-02')) cRaw += 1;
      if (dung.equipped.includes('ev-03')) cRaw += 1;
      if (dung.equipped.includes('ev-04')) cRaw += 1;
      if (dung.equipped.includes('eq-01')) cRaw = Math.max(0, cRaw - 1);
    }
    const cDealt = applyDamage(state, actor, cRaw, 'attack', dung, nowMs);
    if (state.lastDiceRoll) {
      state.lastDiceRoll.counterRoll = {
        playerId: dung.playerId,
        displayName: dung.displayName,
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
        ? `🥊 Dũng "Gác Cổng" (${dung.displayName}) phản kích tức thì (${cRollDesc}, tổng ${cRaw}) → ${actor.displayName} chịu ${cDealt} sát thương!`
        : `🥊 Dũng "Gác Cổng" (${dung.displayName}) phản kích (${cRollDesc}) nhưng không gây sát thương cho ${actor.displayName}!`,
      nowMs,
      dung.playerId,
    );
  }

  return { ok: true };
}

export function resolveRevealRole(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  nowMs: number,
): EngineActionResult {
  if (
    state.turnPhase !== 'ROLL_MOVE' &&
    state.turnPhase !== 'LOCATION_ACTION' &&
    state.turnPhase !== 'MAIN_ACTION'
  ) {
    return { ok: false, error: 'Không thể lật vai ở trạng thái hiện tại.' };
  }
  if (actor.revealed) {
    return { ok: false, error: 'Bạn đã lật vai công khai rồi.' };
  }
  if (actor.roleId === 'lang-tien-phong') {
    return {
      ok: false,
      error: 'Đạt "Cảm Tử" không thể tự ý lật vai; sẽ tự động lộ diện khi có người khác đầu tiên gục ngã.',
    };
  }
  revealPlayerNow(state, actor, 'voluntary', nowMs);
  const role = getRoleDesign(actor.roleId);
  appendPublicLog(
    state,
    'reveal',
    `🎭 ${actor.displayName} lật vai công khai: ${role.name} (${FACTION_LABELS[actor.faction]})!`,
    nowMs,
    actor.playerId,
  );
  appendHighlight(
    state,
    `Lộ vai: ${actor.displayName}`,
    `${role.name} (${FACTION_LABELS[actor.faction]}) — ${role.skillName}`,
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
  if (!actor.revealed) {
    return { ok: false, error: 'Bạn cần Lật vai công khai trước khi kích hoạt kỹ năng.' };
  }
  const role = getRoleDesign(actor.roleId);
  if (role.targetMode === 'passive') {
    return { ok: false, error: `${role.name} sở hữu kỹ năng nội tại tự động.` };
  }
  if (role.oncePerMatch && actor.skillUsedOnce) {
    return { ok: false, error: `${role.skillName} chỉ dùng 1 lần duy nhất mỗi trận.` };
  }
  if (actor.skillCooldown > 0) {
    return { ok: false, error: `${role.skillName} đang hồi chiêu (${actor.skillCooldown} vòng nữa).` };
  }

  switch (actor.roleId) {
    case 'gac-truc-ban': {
      // Lan "Trực Ban" (Emi - Teleport): chỉ dùng thay thế tung xúc xắc ở Pha 1 (ROLL_MOVE)
      if (state.turnPhase !== 'ROLL_MOVE') {
        return {
          ok: false,
          error: 'Bước Nhảy Tắt chỉ dùng được ở Pha 1 (thay thế việc tung xúc xắc di chuyển).',
        };
      }
      const destId = getPairedLocationInCluster(
        actor.location,
        state.clusterPairs ?? DEFAULT_CLUSTER_PAIRS,
      );
      const destDef = getLocationDefinition(destId);
      actor.location = destId;
      actor.consecutiveSameZoneRolls = 0;
      state.allowedMoveDestinations = undefined;
      state.turnPhase = 'LOCATION_ACTION';
      appendPublicLog(
        state,
        'skill',
        `✨ Lan "Trực Ban" (${actor.displayName}) dùng Bước Nhảy Tắt sang Ô ${destDef.diceLabel} (${destDef.name}) không cần tung xúc xắc!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'gac-ky-thuat': {
      if (
        state.turnPhase !== 'ROLL_MOVE' &&
        state.turnPhase !== 'LOCATION_ACTION' &&
        state.turnPhase !== 'MAIN_ACTION'
      ) {
        return { ok: false, error: 'Chưa thể kích hoạt kỹ năng lúc này.' };
      }
      if (!targetPlayerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi bất kỳ làm mục tiêu.' };
      }
      const target = state.players[targetPlayerId];
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Mục tiêu Đòn Phá Vây phải là một người khác còn sống.' };
      }
      actor.skillUsedOnce = true;
      const dmg = rollD4(state);
      const dealt = applyDamage(state, target, dmg, 'skill', actor, nowMs);
      appendPublicLog(
        state,
        'skill',
        `⚡ ${actor.displayName} tung Đòn Phá Vây (1d4=${dmg}) lên ${target.displayName} → ${dealt} sát thương!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'gac-radio': {
      if (
        state.turnPhase !== 'ROLL_MOVE' &&
        state.turnPhase !== 'LOCATION_ACTION' &&
        state.turnPhase !== 'MAIN_ACTION'
      ) {
        return { ok: false, error: 'Chưa thể kích hoạt kỹ năng lúc này.' };
      }
      if (!targetPlayerId) {
        return { ok: false, error: 'Hãy chọn 1 người chơi bất kỳ để phóng Xung Cao Áp.' };
      }
      const target = state.players[targetPlayerId];
      if (!target || !target.alive || target.playerId === actor.playerId) {
        return { ok: false, error: 'Mục tiêu không hợp lệ.' };
      }
      actor.skillUsedOnce = true;
      const dmg = rollD6(state);
      const dealt = applyDamage(state, target, dmg, 'skill', actor, nowMs);
      appendPublicLog(
        state,
        'skill',
        `⚡ ${actor.displayName} phóng Xung Cao Áp (1d6=${dmg}) lên ${target.displayName} → ${dealt} sát thương!`,
        nowMs,
        actor.playerId,
      );
      return { ok: true };
    }

    case 'lang-quan-sat': {
      if (
        state.turnPhase !== 'ROLL_MOVE' &&
        state.turnPhase !== 'LOCATION_ACTION' &&
        state.turnPhase !== 'MAIN_ACTION'
      ) {
        return { ok: false, error: 'Chưa thể kích hoạt kỹ năng lúc này.' };
      }
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
      // Bách "Cuồng Chiến" (Charles - Bloody Feast): sau đòn đánh thứ nhất trong lượt -> tự nhận 2 ST để đánh thêm 1 lần nữa
      if (state.turnPhase !== 'MAIN_ACTION' || actor.attacksThisTurn !== 1) {
        return {
          ok: false,
          error: 'Đòn Đánh Đẫm Máu chỉ kích hoạt được ngay sau đòn đánh thường đầu tiên trong lượt.',
        };
      }
      if (actor.hand.length > 0) {
        return { ok: false, error: 'Hãy giải quyết lá bài vừa rút trước khi tung đòn đánh bồi.' };
      }
      if (actor.hp <= 2) {
        return { ok: false, error: 'Bạn cần còn trên 2 HP mới đủ sức tự nhận 2 thương tích để chém bồi!' };
      }
      if (!targetPlayerId) {
        return { ok: false, error: 'Chọn 1 mục tiêu trong tầm đánh để tung đòn đánh thứ hai.' };
      }
      const target = state.players[targetPlayerId];
      if (!target || !target.alive || !canPlayerAttackTarget(state, actor, target)) {
        return { ok: false, error: 'Mục tiêu Đòn Đánh Đẫm Máu không hợp lệ hoặc ngoài tầm.' };
      }
      applyDamage(state, actor, 2, 'skill', null, nowMs);
      appendPublicLog(
        state,
        'skill',
        `🩸 Bách "Cuồng Chiến" (${actor.displayName}) tự nhận 2 thương tích kích hoạt Đòn Đánh Đẫm Máu!`,
        nowMs,
        actor.playerId,
      );
      if (!actor.alive) return { ok: true };
      return resolveAttack(state, actor, targetPlayerId, nowMs);
    }

    default:
      return { ok: false, error: 'Vai này không có kỹ năng kích hoạt.' };
  }
}
