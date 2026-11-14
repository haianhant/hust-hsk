// ---------------------------------------------------------------------------
// features/boardgame/domain/effects.ts — Thực thi hiệu ứng thẻ bài,
// sát thương/khiên, kỹ năng nhân vật và sổ ghi chú bí mật (không lộ sang log chung).
// ---------------------------------------------------------------------------

import type {
  BoardGameDeckId,
  BoardGamePublicLogEntry,
} from '../../../shared/contracts/boardgame';
import { CARDS_BY_ID, listCardIdsByDeck } from './cards';
import { FACTION_LABELS } from './roles';
import {
  BOARD_GAME_MAX_HAND,
  BOARD_GAME_MAX_TRACK,
  getLocationName,
  isAdjacentLocation,
  nextDeterministicRandom,
  shuffleWithRng,
} from './rules';
import type { AuthoritativeGameState, AuthoritativePlayerState, GameCard } from './types';

export function appendPublicLog(
  state: AuthoritativeGameState,
  kind: BoardGamePublicLogEntry['kind'],
  text: string,
  nowMs: number,
  actorId?: string,
): void {
  state.seqCounter += 1;
  state.publicLog.push({
    id: `log-${state.seqCounter}`,
    round: state.round,
    atMs: nowMs,
    kind,
    text,
    ...(actorId ? { actorId } : {}),
  });
  if (state.publicLog.length > 80) {
    state.publicLog = state.publicLog.slice(-60);
  }
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
  if (player.privateNotes.length > 24) {
    player.privateNotes = player.privateNotes.slice(-20);
  }
}

export function drawCardFromDeck(state: AuthoritativeGameState, deck: BoardGameDeckId): GameCard | null {
  let pile = state.decks[deck];
  if (pile.length === 0) {
    const recycled = state.discards[deck].length > 0 ? state.discards[deck] : listCardIdsByDeck(deck);
    state.discards[deck] = [];
    pile = shuffleWithRng(recycled, state);
    state.decks[deck] = pile;
  }
  const cardId = pile.shift();
  if (!cardId) return null;
  return CARDS_BY_ID[cardId] ?? null;
}

export function applyHeal(
  target: AuthoritativePlayerState,
  amount: number,
): number {
  if (!target.alive || amount <= 0 || target.healBlockedNextTurn) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  return target.hp - before;
}

export function applyDamage(
  state: AuthoritativeGameState,
  target: AuthoritativePlayerState,
  rawDamage: number,
  nowMs: number,
  sourceLabel: string,
): { hpLost: number; shieldAbsorbed: number; eliminated: boolean } {
  if (!target.alive || rawDamage <= 0) {
    return { hpLost: 0, shieldAbsorbed: 0, eliminated: false };
  }
  const shieldAbsorbed = Math.min(target.shield, rawDamage);
  target.shield -= shieldAbsorbed;
  const remaining = rawDamage - shieldAbsorbed;
  const beforeHp = target.hp;
  target.hp = Math.max(0, target.hp - remaining);
  const hpLost = beforeHp - target.hp;

  if (target.hp === 0) {
    target.alive = false;
    target.revealed = true;
    appendPublicLog(
      state,
      'elimination',
      `${target.displayName} đã bị loại bởi ${sourceLabel} (lật vai công khai: ${FACTION_LABELS[target.faction]}).`,
      nowMs,
      target.playerId,
    );
    state.highlights.push({
      round: state.round,
      title: `${target.displayName} bị loại`,
      detail: `${target.displayName} rời cuộc điều tra (${FACTION_LABELS[target.faction]}).`,
      atMs: nowMs,
    });
    return { hpLost, shieldAbsorbed, eliminated: true };
  }
  return { hpLost, shieldAbsorbed, eliminated: false };
}

export function adjustSignalOrMist(
  state: AuthoritativeGameState,
  which: 'signal' | 'mist',
  delta: number,
  nowMs: number,
  reasonLabel: string,
): void {
  if (which === 'signal') {
    const next = Math.max(0, Math.min(BOARD_GAME_MAX_TRACK, state.signalProgress + delta));
    if (next !== state.signalProgress) {
      state.signalProgress = next;
      appendPublicLog(
        state,
        'track',
        `${reasonLabel}: Chỉ số Tín hiệu -> ${state.signalProgress}/${BOARD_GAME_MAX_TRACK}.`,
        nowMs,
      );
    }
  } else {
    const next = Math.max(0, Math.min(BOARD_GAME_MAX_TRACK, state.mistProgress + delta));
    if (next !== state.mistProgress) {
      state.mistProgress = next;
      appendPublicLog(
        state,
        'track',
        `${reasonLabel}: Chỉ số Màn sương -> ${state.mistProgress}/${BOARD_GAME_MAX_TRACK}.`,
        nowMs,
      );
    }
  }
}

export function pickInspectionTarget(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  explicitTarget: AuthoritativePlayerState | null,
): AuthoritativePlayerState | null {
  if (explicitTarget && explicitTarget.playerId !== actor.playerId) return explicitTarget;
  const others = state.players.filter((p) => p.playerId !== actor.playerId && p.alive);
  if (others.length === 0) return null;
  const sameOrAdj = others.filter((p) => isAdjacentLocation(actor.location, p.location));
  const pool = sameOrAdj.length > 0 ? sameOrAdj : others;
  const idx = Math.floor(nextDeterministicRandom(state) * pool.length);
  return pool[idx] ?? pool[0];
}

export function resolveCardImmediateEffect(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  card: GameCard,
  explicitTarget: AuthoritativePlayerState | null,
  nowMs: number,
): void {
  switch (card.effectKind) {
    case 'signal-up': {
      adjustSignalOrMist(state, 'signal', card.value, nowMs, `${actor.displayName} (${card.title})`);
      if (card.id === 'clue-04' || card.id === 'evt-sig-shield') {
        actor.shield += 1;
      }
      if (card.id === 'event-10' && actor.location !== 'radio' && actor.location !== 'breaker') {
        applyHeal(actor, 1);
      }
      return;
    }
    case 'mist-up': {
      adjustSignalOrMist(state, 'mist', card.value, nowMs, `${actor.displayName} (${card.title})`);
      if (card.id === 'clue-09') {
        actor.fragments += 1;
      }
      if (card.id === 'event-07') {
        actor.location = 'lobby';
      }
      if (card.id === 'event-11') {
        const sameLoc = state.players
          .filter((p) => p.alive && p.location === actor.location && p.playerId !== actor.playerId)
          .sort((a, b) => b.hp - a.hp);
        if (sameLoc[0]) {
          applyDamage(state, sameLoc[0], 1, nowMs, card.title);
        }
      }
      return;
    }
    case 'heal-self': {
      if (card.targetMode === 'same-location') {
        state.players
          .filter((p) => p.alive && p.location === actor.location)
          .forEach((p) => {
            applyHeal(p, card.value);
          });
        appendPublicLog(
          state,
          'tactic',
          `${card.title}: Sinh viên tại ${getLocationName(actor.location)} được hồi phục.`,
          nowMs,
          actor.playerId,
        );
      } else {
        const healedTarget = explicitTarget && explicitTarget.alive ? explicitTarget : actor;
        const gained = applyHeal(healedTarget, card.value);
        if (
          actor.roleId === 'lang-cuu-ho' &&
          actor.wardPlayerId &&
          healedTarget.playerId === actor.wardPlayerId &&
          gained > 0
        ) {
          actor.shieldedForWardCount += 1;
        }
        appendPublicLog(
          state,
          'tactic',
          `${actor.displayName} dùng ${card.title} hồi +${gained} HP cho ${healedTarget.displayName}.`,
          nowMs,
          actor.playerId,
        );
      }
      return;
    }
    case 'shield-self': {
      actor.shield = Math.min(8, actor.shield + card.value);
      appendPublicLog(
        state,
        'tactic',
        `${actor.displayName} dùng ${card.title}, nhận +${card.value} Khiên.`,
        nowMs,
        actor.playerId,
      );
      return;
    }
    case 'fragment-up': {
      actor.fragments += card.value;
      if (card.id === 'clue-07') {
        applyHeal(actor, 1);
      }
      appendPrivateNote(
        state,
        actor,
        `${card.title}: Bạn thu thập +${card.value} Mảnh Tin Đen (tổng ${actor.fragments}).`,
        nowMs,
      );
      return;
    }
    case 'steal-fragment': {
      if (explicitTarget && explicitTarget.fragments > 0) {
        explicitTarget.fragments -= 1;
        actor.fragments += 1;
        appendPrivateNote(
          state,
          actor,
          `Bạn đã thu hồi 1 Mảnh Tin Đen từ ${explicitTarget.displayName} (tổng ${actor.fragments}).`,
          nowMs,
        );
        appendPublicLog(
          state,
          'tactic',
          `${actor.displayName} kích hoạt ${card.title} lên ${explicitTarget.displayName}.`,
          nowMs,
          actor.playerId,
        );
      } else {
        actor.fragments += 1;
        appendPrivateNote(state, actor, `${card.title}: Nhặt thêm +1 Mảnh Tin Đen.`, nowMs);
      }
      return;
    }
    case 'inspect-faction':
    case 'inspect-revealed-clue': {
      const target = pickInspectionTarget(state, actor, explicitTarget);
      if (target) {
        appendPrivateNote(
          state,
          actor,
          `[Mật — ${card.title}] ${target.displayName} thuộc phe ${FACTION_LABELS[target.faction]}.`,
          nowMs,
        );
      }
      if (card.deck === 'clue' && card.value > 0 && card.id !== 'clue-06' && card.id !== 'clue-10') {
        actor.fragments += 1;
      }
      if (card.id === 'clue-10') {
        adjustSignalOrMist(state, 'signal', 1, nowMs, `${actor.displayName} (${card.title})`);
      }
      if (card.id === 'event-12') {
        applyHeal(actor, 1);
      }
      appendPublicLog(
        state,
        'draw',
        `${actor.displayName} giải mã ${card.title} và ghi chú riêng thông tin điều tra.`,
        nowMs,
        actor.playerId,
      );
      return;
    }
    case 'damage-target': {
      const target = explicitTarget ?? pickInspectionTarget(state, actor, null);
      if (!target) return;
      const dmgRes = applyDamage(state, target, card.value, nowMs, `${actor.displayName} (${card.title})`);
      appendPublicLog(
        state,
        'attack',
        `${actor.displayName} dùng ${card.title} tác động ${target.displayName} (-${dmgRes.hpLost} HP, chặn ${dmgRes.shieldAbsorbed} Khiên).`,
        nowMs,
        actor.playerId,
      );
      return;
    }
    case 'damage-area': {
      const victims = state.players.filter((p) => p.alive && p.location === actor.location);
      victims.forEach((v) => {
        applyDamage(state, v, card.value, nowMs, card.title);
      });
      appendPublicLog(
        state,
        'tactic',
        `${card.title} gây ${card.value} sát thương tại ${getLocationName(actor.location)}.`,
        nowMs,
        actor.playerId,
      );
      return;
    }
    case 'blackout-location': {
      state.blackoutLocation = actor.location;
      state.blackoutRoundsLeft = 1;
      appendPublicLog(
        state,
        'tactic',
        `${getLocationName(actor.location)} bị mất điện cục bộ trong 1 vòng!`,
        nowMs,
        actor.playerId,
      );
      return;
    }
    case 'relocate-target': {
      const target = explicitTarget ?? pickInspectionTarget(state, actor, null);
      if (!target) return;
      target.location = 'lobby';
      const dmgRes = applyDamage(state, target, card.value, nowMs, `${actor.displayName} (${card.title})`);
      appendPublicLog(
        state,
        'tactic',
        `${actor.displayName} kích hoạt ${card.title}, đẩy ${target.displayName} về Sảnh KTX (-${dmgRes.hpLost} HP).`,
        nowMs,
        actor.playerId,
      );
      return;
    }
    case 'block-heal': {
      const target = explicitTarget ?? pickInspectionTarget(state, actor, null);
      if (!target) return;
      target.healBlockedNextTurn = true;
      const dmgRes = applyDamage(state, target, card.value, nowMs, `${actor.displayName} (${card.title})`);
      appendPublicLog(
        state,
        'tactic',
        `${actor.displayName} dùng ${card.title} khóa hồi phục của ${target.displayName} (-${dmgRes.hpLost} HP).`,
        nowMs,
        actor.playerId,
      );
      return;
    }
  }
}

export function addCardToHand(state: AuthoritativeGameState, player: AuthoritativePlayerState, card: GameCard): void {
  if (player.hand.length >= BOARD_GAME_MAX_HAND) {
    const dropped = player.hand.shift();
    if (dropped) {
      state.discards[dropped.deck].push(dropped.id);
    }
  }
  player.hand.push(card);
}
