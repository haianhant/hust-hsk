// ---------------------------------------------------------------------------
// features/boardgame/domain/effects.ts — Thực thi hiệu ứng thẻ bài,
// bằng chứng suy luận có điều kiện, sát thương/bảo hộ, và ghi chú riêng.
// Bảo mật P0: Không rò rỉ hp/maxHp thật, phe bí mật, hay secretSabotageLocation.
// ---------------------------------------------------------------------------

import type {
  BoardGameDeckId,
  BoardGameEvidenceEntry,
  BoardGameEvidenceKind,
  BoardGameLocationId,
  BoardGamePublicLogEntry,
} from '../../../shared/contracts/boardgame';
import { CARDS_BY_ID, listCardIdsByDeck } from './cards';
import {
  ACCESS_TAG_LABELS,
  FACTION_LABELS,
  ROLES_BY_ID,
  TRACE_TAG_LABELS,
  formatRoleMatchSummary,
  listRolesMatchingAccessTag,
  listRolesMatchingTraceTag,
} from './roles';
import {
  BOARD_GAME_COURT_MAX_SHIELD,
  BOARD_GAME_INFRASTRUCTURE_LOCATIONS,
  BOARD_GAME_MAX_HAND,
  BOARD_GAME_MAX_SHIELD,
  getLocationName,
  getLocationShortLabel,
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
  if (player.privateNotes.length > 28) {
    player.privateNotes = player.privateNotes.slice(-24);
  }
}

export function appendEvidence(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  entry: Omit<BoardGameEvidenceEntry, 'id' | 'round' | 'atMs'>,
  nowMs: number,
): BoardGameEvidenceEntry {
  state.seqCounter += 1;
  const full: BoardGameEvidenceEntry = {
    id: `ev-${state.seqCounter}`,
    round: state.round,
    atMs: nowMs,
    ...entry,
  };
  player.evidenceList.push(full);
  if (player.evidenceList.length > 24) {
    player.evidenceList = player.evidenceList.slice(-20);
  }
  appendPrivateNote(
    state,
    player,
    `[${entry.sourceLabel}] ${entry.subjectLabel}: ${entry.summary}`,
    nowMs,
  );
  return full;
}

export function recordCoPresenceForPlayer(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): void {
  if (!player.alive) return;
  for (const peer of state.players) {
    if (!peer.alive || peer.playerId === player.playerId) continue;
    if (peer.location === player.location) {
      if (!player.metPlayerIds.includes(peer.playerId)) {
        player.metPlayerIds.push(peer.playerId);
      }
      if (!peer.metPlayerIds.includes(player.playerId)) {
        peer.metPlayerIds.push(player.playerId);
      }
    }
  }
}

export function shieldCapForPlayer(player: AuthoritativePlayerState): number {
  return player.location === 'court' ? BOARD_GAME_COURT_MAX_SHIELD : BOARD_GAME_MAX_SHIELD;
}

export function grantShield(player: AuthoritativePlayerState, delta: number): number {
  if (!player.alive || delta <= 0) return 0;
  const cap = shieldCapForPlayer(player);
  const before = player.shield;
  player.shield = Math.min(cap, player.shield + delta);
  return Math.max(0, player.shield - before);
}

export function clampShieldForLocation(player: AuthoritativePlayerState): void {
  const cap = shieldCapForPlayer(player);
  if (player.shield > cap) {
    player.shield = cap;
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

export function applyHeal(target: AuthoritativePlayerState, amount: number): number {
  if (!target.alive || amount <= 0 || target.healBlockedNextTurn) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  return target.hp - before;
}

function finalizeEliminationIfZeroHp(
  state: AuthoritativeGameState,
  victim: AuthoritativePlayerState,
  nowMs: number,
  sourceLabel: string,
): boolean {
  if (victim.hp > 0 || !victim.alive) return false;
  victim.alive = false;
  victim.revealed = true;
  const roleName = ROLES_BY_ID[victim.roleId].name;
  appendPublicLog(
    state,
    'elimination',
    `${victim.displayName} đã kiệt sức bởi ${sourceLabel} (lật vai: ${roleName} · ${FACTION_LABELS[victim.faction]}).`,
    nowMs,
    victim.playerId,
  );
  state.highlights.push({
    round: state.round,
    title: `${victim.displayName} kiệt sức`,
    detail: `Công khai danh tính: ${roleName} (${FACTION_LABELS[victim.faction]}).`,
    atMs: nowMs,
  });
  return true;
}

export function applyDamage(
  state: AuthoritativeGameState,
  target: AuthoritativePlayerState,
  rawDamage: number,
  nowMs: number,
  sourceLabel: string,
  options?: { pierceShield?: number; attacker?: AuthoritativePlayerState | null },
): { hpLost: number; shieldAbsorbed: number; eliminated: boolean; interceptedBy?: string } {
  if (!target.alive || rawDamage <= 0) {
    return { hpLost: 0, shieldAbsorbed: 0, eliminated: false };
  }

  // Người Bảo Hộ Ngầm (Bình) khi đã bật chế độ đỡ đòn ở cùng phòng sẽ chắn đòn thay Mục tiêu Bảo Hộ
  let actualVictim = target;
  let interceptedBy: string | undefined;
  const guard = state.players.find(
    (p) =>
      p.roleId === 'lang-cuu-ho' &&
      p.alive &&
      !p.detained &&
      p.bodyguardActive &&
      p.wardPlayerId === target.playerId &&
      p.location === target.location &&
      p.playerId !== target.playerId,
  );
  if (guard && options?.attacker?.playerId !== guard.playerId) {
    actualVictim = guard;
    interceptedBy = guard.displayName;
    guard.wardProtectionsCount += 1;
    appendPublicLog(
      state,
      'skill',
      `🩺 ${guard.displayName} lao ra chắn đòn thay cho ${target.displayName}!`,
      nowMs,
      guard.playerId,
    );
  }

  const pierce = Math.max(0, options?.pierceShield ?? 0);
  const blockable = Math.max(0, rawDamage - pierce);
  const shieldAbsorbed = Math.min(actualVictim.shield, blockable);
  actualVictim.shield -= shieldAbsorbed;
  const unblocked = rawDamage - shieldAbsorbed;

  const beforeHp = actualVictim.hp;
  actualVictim.hp = Math.max(0, actualVictim.hp - unblocked);
  const hpLost = beforeHp - actualVictim.hp;

  const eliminated = finalizeEliminationIfZeroHp(state, actualVictim, nowMs, sourceLabel);
  if (eliminated && interceptedBy && actualVictim.roleId === 'lang-cuu-ho') {
    actualVictim.sacrificedForWard = true;
  }

  return { hpLost, shieldAbsorbed, eliminated, interceptedBy };
}

/** Gây vết thương trực tiếp xuyên khiên (dùng khi Đối chất sai người). */
export function applyDirectWounds(
  state: AuthoritativeGameState,
  target: AuthoritativePlayerState,
  wounds: number,
  nowMs: number,
  sourceLabel: string,
): { hpLost: number; eliminated: boolean } {
  if (!target.alive || wounds <= 0) return { hpLost: 0, eliminated: false };
  const beforeHp = target.hp;
  target.hp = Math.max(0, target.hp - wounds);
  const hpLost = beforeHp - target.hp;
  const eliminated = finalizeEliminationIfZeroHp(state, target, nowMs, sourceLabel);
  return { hpLost, eliminated };
}

export function pickInspectionTarget(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  explicitTarget: AuthoritativePlayerState | null,
  requireAdjacentOrSame = false,
): AuthoritativePlayerState | null {
  if (explicitTarget && explicitTarget.playerId !== actor.playerId && explicitTarget.alive) {
    if (!requireAdjacentOrSame || isAdjacentLocation(actor.location, explicitTarget.location)) {
      return explicitTarget;
    }
  }
  const others = state.players.filter((p) => p.playerId !== actor.playerId && p.alive);
  if (others.length === 0) return null;
  const sameOrAdj = others.filter((p) => isAdjacentLocation(actor.location, p.location));
  if (requireAdjacentOrSame && sameOrAdj.length === 0) return null;
  const pool = sameOrAdj.length > 0 ? sameOrAdj : others;
  const idx = Math.floor(nextDeterministicRandom(state) * pool.length);
  return pool[idx] ?? pool[0];
}

export function createEquipmentTraitEvidence(
  state: AuthoritativeGameState,
  investigator: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
  preferTrace: boolean,
  sourceLabel: string,
  nowMs: number,
): BoardGameEvidenceEntry {
  const hasAccess = investigator.evidenceList.some(
    (e) =>
      e.targetPlayerId === target.playerId &&
      e.kind === 'equipment' &&
      e.summary.includes(ACCESS_TAG_LABELS[target.accessTag]),
  );
  const useTrace = preferTrace || hasAccess;
  if (useTrace) {
    const roles = listRolesMatchingTraceTag(target.traceTag);
    const label = TRACE_TAG_LABELS[target.traceTag];
    return appendEvidence(
      state,
      investigator,
      {
        kind: 'equipment',
        subjectLabel: target.displayName,
        targetPlayerId: target.playerId,
        summary: `Phát hiện dấu vết [${label}] (khớp 3 nhân vật thuộc 3 phe).`,
        sourceLabel,
        compatibleHint: `Khớp: ${formatRoleMatchSummary(roles)}`,
      },
      nowMs,
    );
  }
  const roles = listRolesMatchingAccessTag(target.accessTag);
  const label = ACCESS_TAG_LABELS[target.accessTag];
  return appendEvidence(
    state,
    investigator,
    {
      kind: 'equipment',
      subjectLabel: target.displayName,
      targetPlayerId: target.playerId,
      summary: `Phát hiện dụng cụ [${label}] (khớp 3 nhân vật thuộc 3 phe).`,
      sourceLabel,
      compatibleHint: `Khớp: ${formatRoleMatchSummary(roles)}`,
    },
    nowMs,
  );
}

export function createActivityEvidence(
  state: AuthoritativeGameState,
  investigator: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
  sourceLabel: string,
  nowMs: number,
): BoardGameEvidenceEntry {
  const minRound = Math.max(1, state.round - 1);
  const recentMoves = target.recentMoves
    .filter((m) => m.round >= minRound)
    .map((m) => `V${m.round}:${getLocationShortLabel(m.location)}`);
  const realTech = target.technicalActionRounds.filter((r) => r >= minRound);
  const decoyTech = target.plantedDecoyRounds.filter((r) => r >= minRound);
  const combinedTech = Array.from(new Set([...realTech, ...decoyTech])).sort((a, b) => a - b);
  const recentAttacks = target.dealtDamageRounds.filter((r) => r >= minRound);

  const parts: string[] = [];
  parts.push(
    recentMoves.length > 0
      ? `Di chuyển gần đây: ${recentMoves.join(' → ')}`
      : `Vẫn đang đứng từ đầu tại ${getLocationShortLabel(target.location)}`,
  );
  parts.push(
    combinedTech.length > 0
      ? `Có dấu tương tác kỹ thuật (V${combinedTech.join(', V')})`
      : 'Chưa ghi nhận tương tác kỹ thuật trong 2 vòng gần nhất',
  );
  if (recentAttacks.length > 0) {
    parts.push(`Từng công kích (V${recentAttacks.join(', V')})`);
  }

  return appendEvidence(
    state,
    investigator,
    {
      kind: 'activity',
      subjectLabel: target.displayName,
      targetPlayerId: target.playerId,
      summary: `${parts.join('. ')}.`,
      sourceLabel,
      compatibleHint: decoyTech.length > 0 ? 'Lưu ý: Dấu kỹ thuật có thể bị gài nhiễu nếu có người ở cùng phòng.' : undefined,
    },
    nowMs,
  );
}

export function performLocationScanOrDisarm(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  loc: BoardGameLocationId,
  mode: 'scan' | 'sabotage',
  nowMs: number,
  sourceLabel: string,
): { ok: boolean; reason?: string } {
  if (!actor.technicalActionRounds.includes(state.round)) {
    actor.technicalActionRounds.push(state.round);
  }

  if (mode === 'sabotage') {
    if (actor.faction !== 'mist-order' || actor.detained) {
      return { ok: false, reason: 'Chỉ thành viên Hội Màn Sương chưa bị tạm giữ mới gài được Mạch Quá Tải.' };
    }
    if (loc !== state.secretSabotageLocation) {
      return { ok: false, reason: 'Chỉ được gài Mạch Quá Tải tại Trạm Mục Tiêu bí mật của Hội Màn Sương.' };
    }
    if (state.sabotagePlanted || state.sabotageArmed) {
      return { ok: false, reason: 'Mạch Quá Tải đã được gài sẵn tại KTX.' };
    }

    state.sabotagePlanted = true;
    state.sabotagePlantedRound = state.round;
    state.sabotagePlantedByPlayerId = actor.playerId;
    if (!state.tamperedLocations.includes(loc)) {
      state.tamperedLocations.push(loc);
    }
    state.tamperHistoryByLocation[loc].push({
      round: state.round,
      playerId: actor.playerId,
      displayName: actor.displayName,
      traceTag: actor.traceTag,
      wasSabotage: true,
    });
    state.lastVisitorByLocation[loc] = actor.playerId;

    // Nhật ký công khai y hệt thao tác kiểm tra bình thường để giữ bí mật bluff!
    appendPublicLog(
      state,
      'scene',
      `${actor.displayName} kiểm tra thiết bị kỹ thuật tại ${getLocationName(loc)}.`,
      nowMs,
      actor.playerId,
    );
    appendPrivateNote(
      state,
      actor,
      `[Gài Mạch Thành Công] Đã đặt Mạch Quá Tải ngầm tại ${getLocationName(loc)} — báo động sẽ kích hoạt vào đầu vòng kế tiếp để Kích nổ!`,
      nowMs,
    );
    return { ok: true };
  }

  // Mode === 'scan'
  const locShort = getLocationShortLabel(loc);
  const locName = getLocationName(loc);
  if (
    (loc === 'breaker' || loc === 'radio' || loc === 'canteen') &&
    !state.tamperedLocations.includes(loc)
  ) {
    state.tamperedLocations.push(loc);
  }

  if (loc === 'lobby') {
    const gainedHeal = applyHeal(actor, 1);
    const gainedShield = grantShield(actor, 1);
    appendPublicLog(
      state,
      'scene',
      `${actor.displayName} khảo sát Trạm Sơ Cứu Sảnh KTX (+${gainedShield} Khiên${gainedHeal > 0 ? ', hồi 1 vết thương' : ''}).`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  if (loc === 'corridor') {
    const sameLocPeers = state.players.filter(
      (p) => p.alive && p.playerId !== actor.playerId && p.location === 'corridor',
    );
    if (sameLocPeers.length === 0) {
      grantShield(actor, 1);
    }
    const activeRooms = state.tamperedLocations.map((id) => getLocationShortLabel(id));
    appendEvidence(
      state,
      actor,
      {
        kind: 'grid',
        subjectLabel: 'Hành Lang B7',
        locationId: 'corridor',
        summary:
          activeRooms.length > 0
            ? `Các khu vực đã ghi nhận thao tác kỹ thuật: ${activeRooms.join(', ')}.`
            : 'Chưa có phòng hạ tầng nào ghi nhận dấu thao tác kỹ thuật.',
        sourceLabel,
      },
      nowMs,
    );
    appendPublicLog(
      state,
      'scene',
      `${actor.displayName} nghe ngóng tình hình tại Hành Lang B7.`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  if (loc === 'court') {
    const adjTargets = state.players.filter(
      (p) => p.alive && p.playerId !== actor.playerId && isAdjacentLocation('court', p.location),
    );
    const chosen = adjTargets[Math.floor(nextDeterministicRandom(state) * adjTargets.length)] ?? null;
    if (chosen) {
      createEquipmentTraitEvidence(state, actor, chosen, false, 'Đài Quan Sát Sân Bóng Rổ', nowMs);
    } else {
      appendPrivateNote(
        state,
        actor,
        'Sân Bóng Rổ hiện chưa có người đứng ở khu vực kề cận để quan sát.',
        nowMs,
      );
    }
    appendPublicLog(
      state,
      'scene',
      `${actor.displayName} quan sát khu vực quanh Sân Bóng Rổ KTX.`,
      nowMs,
      actor.playerId,
    );
    return { ok: true };
  }

  // Infrastructure scan at breaker / radio / canteen:
  // Kiểm tra xem tại phòng này có Mạch Quá Tải chưa gỡ hay không!
  if (
    state.sabotagePlanted &&
    state.secretSabotageLocation === loc &&
    actor.faction !== 'mist-order'
  ) {
    const saboteurId = state.sabotagePlantedByPlayerId;
    const saboteur = saboteurId ? state.players.find((p) => p.playerId === saboteurId) ?? null : null;
    state.sabotagePlanted = false;
    state.sabotageArmed = false;
    state.sabotagePlantedRound = null;
    state.sabotagePlantedByPlayerId = null;
    state.disarmedCount += 1;

    if (loc === 'breaker') state.breakerSealed = true;
    if (loc === 'radio') state.radioSealed = true;
    if (!actor.verifiedSceneLocations.includes(loc)) {
      actor.verifiedSceneLocations.push(loc);
    }

    if (saboteur) {
      const traceLabel = TRACE_TAG_LABELS[saboteur.traceTag];
      const matchingRoles = listRolesMatchingTraceTag(saboteur.traceTag);
      appendEvidence(
        state,
        actor,
        {
          kind: 'scene',
          subjectLabel: `Mạch gài tại ${locShort}`,
          locationId: loc,
          summary: `Đã gỡ Mạch Quá Tải! Tại hiện trường sót lại dấu vết [${traceLabel}].`,
          sourceLabel: `Gỡ mạch ${locShort}`,
          compatibleHint: `Khớp dấu vết: ${formatRoleMatchSummary(matchingRoles)}`,
        },
        nowMs,
      );
    }

    appendPublicLog(
      state,
      'incident',
      `🛠️ ${actor.displayName} phát hiện và GỠ THÀNH CÔNG Mạch Quá Tải tại ${locName}!`,
      nowMs,
      actor.playerId,
    );
    state.highlights.push({
      round: state.round,
      title: `Gỡ mạch tại ${locShort}`,
      detail: `${actor.displayName} kịp thời vô hiệu hóa Mạch Quá Tải của Hội Màn Sương.`,
      atMs: nowMs,
    });
    return { ok: true };
  }

  // Quét an toàn bình thường
  const history = state.tamperHistoryByLocation[loc];
  const lastRec = history.length > 0 ? history[history.length - 1] : null;
  if (lastRec && lastRec.playerId !== actor.playerId) {
    const matchingRoles = listRolesMatchingTraceTag(lastRec.traceTag);
    appendEvidence(
      state,
      actor,
      {
        kind: 'scene',
        subjectLabel: `Hiện trường ${locShort}`,
        locationId: loc,
        summary: `Người thao tác kỹ thuật gần nhất tại ${locShort} là ${lastRec.displayName} (V${lastRec.round}, dấu [${TRACE_TAG_LABELS[lastRec.traceTag]}]).`,
        sourceLabel,
        compatibleHint: `Khớp: ${formatRoleMatchSummary(matchingRoles)}`,
      },
      nowMs,
    );
  } else {
    appendEvidence(
      state,
      actor,
      {
        kind: 'scene',
        subjectLabel: `Hiện trường ${locShort}`,
        locationId: loc,
        summary: `Chưa phát hiện mạch gài ngầm tại ${locShort} tính tới Vòng ${state.round}.`,
        sourceLabel,
      },
      nowMs,
    );
  }

  if (history.length > 0 && !actor.verifiedSceneLocations.includes(loc)) {
    actor.verifiedSceneLocations.push(loc);
  }

  history.push({
    round: state.round,
    playerId: actor.playerId,
    displayName: actor.displayName,
    traceTag: actor.traceTag,
    wasSabotage: false,
  });

  if (loc === 'breaker') state.breakerSealed = true;
  if (loc === 'radio') state.radioSealed = true;
  if (loc === 'canteen') grantShield(actor, 1);

  appendPublicLog(
    state,
    'scene',
    `${actor.displayName} kiểm tra thiết bị kỹ thuật tại ${locName}.`,
    nowMs,
    actor.playerId,
  );
  return { ok: true };
}

export function resolveCardImmediateEffect(
  state: AuthoritativeGameState,
  actor: AuthoritativePlayerState,
  card: GameCard,
  explicitTarget: AuthoritativePlayerState | null,
  explicitSecondTarget: AuthoritativePlayerState | null,
  explicitLocation: BoardGameLocationId | undefined,
  nowMs: number,
): void {
  const sourceLabel = card.title;
  switch (card.effectKind) {
    case 'scene-last-operator': {
      const targetLoc: BoardGameLocationId =
        state.tamperHistoryByLocation[actor.location].length > 0
          ? actor.location
          : state.tamperedLocations[0] ?? actor.location;
      const recs = state.tamperHistoryByLocation[targetLoc];
      const latest = recs[recs.length - 1];
      if (latest) {
        if (!actor.verifiedSceneLocations.includes(targetLoc)) {
          actor.verifiedSceneLocations.push(targetLoc);
        }
        const roles = listRolesMatchingTraceTag(latest.traceTag);
        appendEvidence(
          state,
          actor,
          {
            kind: 'scene',
            subjectLabel: `Tủ điện ${getLocationShortLabel(targetLoc)}`,
            locationId: targetLoc,
            summary: `${latest.displayName} thao tác ở V${latest.round} với dấu [${TRACE_TAG_LABELS[latest.traceTag]}].`,
            sourceLabel,
            compatibleHint: `Khớp: ${formatRoleMatchSummary(roles)}`,
          },
          nowMs,
        );
      } else {
        appendEvidence(
          state,
          actor,
          {
            kind: 'scene',
            subjectLabel: getLocationShortLabel(actor.location),
            locationId: actor.location,
            summary: 'Nhật ký tủ điện KTX chưa ghi nhận lượt thao tác kỹ thuật nào.',
            sourceLabel,
          },
          nowMs,
        );
      }
      return;
    }

    case 'inspect-access-tag': {
      const target = pickInspectionTarget(state, actor, explicitTarget, true) ?? pickInspectionTarget(state, actor, explicitTarget, false);
      if (!target) return;
      const roles = listRolesMatchingAccessTag(target.accessTag);
      appendEvidence(
        state,
        actor,
        {
          kind: 'equipment',
          subjectLabel: target.displayName,
          targetPlayerId: target.playerId,
          summary: `Mang dụng cụ [${ACCESS_TAG_LABELS[target.accessTag]}] (3 phe đều có vai khớp).`,
          sourceLabel,
          compatibleHint: `Khớp: ${formatRoleMatchSummary(roles)}`,
        },
        nowMs,
      );
      return;
    }

    case 'inspect-trace-tag': {
      const target = pickInspectionTarget(state, actor, explicitTarget, true) ?? pickInspectionTarget(state, actor, explicitTarget, false);
      if (!target) return;
      const roles = listRolesMatchingTraceTag(target.traceTag);
      appendEvidence(
        state,
        actor,
        {
          kind: 'equipment',
          subjectLabel: target.displayName,
          targetPlayerId: target.playerId,
          summary: `Để lại dấu vết [${TRACE_TAG_LABELS[target.traceTag]}] (3 phe đều có vai khớp).`,
          sourceLabel,
          compatibleHint: `Khớp: ${formatRoleMatchSummary(roles)}`,
        },
        nowMs,
      );
      return;
    }

    case 'compare-alignment': {
      const others = state.players.filter((p) => p.alive && p.playerId !== actor.playerId);
      const first =
        explicitTarget && explicitTarget.alive && explicitTarget.playerId !== actor.playerId
          ? explicitTarget
          : others[0] ?? null;
      const secondPool = others.filter((p) => p.playerId !== first?.playerId);
      const second =
        explicitSecondTarget &&
        explicitSecondTarget.alive &&
        explicitSecondTarget.playerId !== actor.playerId &&
        explicitSecondTarget.playerId !== first?.playerId
          ? explicitSecondTarget
          : secondPool[Math.floor(nextDeterministicRandom(state) * secondPool.length)] ?? null;
      if (!first || !second) return;
      const sameGroup = first.faction === second.faction;
      appendEvidence(
        state,
        actor,
        {
          kind: 'comparison',
          subjectLabel: `${first.displayName} ↔ ${second.displayName}`,
          summary: sameGroup
            ? `Hai người này thuộc CÙNG MỘT NHÓM PHE (chưa rõ là phe nào).`
            : `Hai người này thuộc HAI PHE KHÁC NHAU.`,
          sourceLabel,
        },
        nowMs,
      );
      return;
    }

    case 'inspect-movement-history': {
      const target = pickInspectionTarget(state, actor, explicitTarget, false);
      if (!target) return;
      createActivityEvidence(state, actor, target, sourceLabel, nowMs);
      return;
    }

    case 'radar-adjacent-overload': {
      const near = isAdjacentLocation(actor.location, state.secretSabotageLocation);
      appendEvidence(
        state,
        actor,
        {
          kind: 'grid',
          subjectLabel: `Vùng quanh ${getLocationShortLabel(actor.location)}`,
          locationId: actor.location,
          summary: near
            ? `Máy dò bắt được dao động Trạm Mục Tiêu phá hoại nằm TẠI ĐÂY hoặc Ô KỀ CẬN!`
            : `Không có Trạm Mục Tiêu phá hoại nào tại ${getLocationShortLabel(actor.location)} hay các ô kề cận.`,
          sourceLabel,
        },
        nowMs,
      );
      return;
    }

    case 'verify-decoy-tamper': {
      grantShield(actor, 1);
      const target = pickInspectionTarget(state, actor, explicitTarget, false);
      if (!target) return;
      const hasDecoy = target.plantedDecoyRounds.length > 0;
      const hasReal = target.technicalActionRounds.length > 0;
      const summary = hasDecoy
        ? `Phát hiện dấu nhiễu giả từng bị cấy lên ${target.displayName} ở V${target.plantedDecoyRounds.join(', V')}${hasReal ? ` (cũng có thao tác thật V${target.technicalActionRounds.join(', V')})` : ' (chưa từng tự thao tác kỹ thuật)'}.`
        : hasReal
          ? `${target.displayName} có thao tác kỹ thuật thật (V${target.technicalActionRounds.join(', V')}), không có tem nhiễu giả.`
          : `${target.displayName} chưa từng thao tác kỹ thuật hay dính tem nhiễu giả.`;
      appendEvidence(
        state,
        actor,
        {
          kind: 'activity',
          subjectLabel: target.displayName,
          targetPlayerId: target.playerId,
          summary,
          sourceLabel,
        },
        nowMs,
      );
      return;
    }

    case 'exclude-safe-facility': {
      const safeInfra = BOARD_GAME_INFRASTRUCTURE_LOCATIONS.filter(
        (id) => id !== state.secretSabotageLocation,
      );
      const picked =
        safeInfra[Math.floor(nextDeterministicRandom(state) * safeInfra.length)] ?? safeInfra[0];
      appendEvidence(
        state,
        actor,
        {
          kind: 'grid',
          subjectLabel: getLocationShortLabel(picked),
          locationId: picked,
          summary: `Biên bản kỹ thuật xác nhận ${getLocationName(picked)} KHÔNG PHẢI Trạm Mục Tiêu của âm mưu đêm nay.`,
          sourceLabel,
        },
        nowMs,
      );
      return;
    }

    case 'local-blackout-shield': {
      state.blackoutLocation = actor.location;
      state.blackoutRoundsLeft = 1;
      grantShield(actor, 1);
      appendPublicLog(
        state,
        'incident',
        `⚡ Sự cố: ${getLocationName(actor.location)} bị mất điện cục bộ 1 vòng!`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'canteen-ginger-tea': {
      const sameRoom = state.players.filter((p) => p.alive && p.location === actor.location);
      sameRoom.forEach((p) => applyHeal(p, card.value));
      appendPublicLog(
        state,
        'tactic',
        `☕ ${card.title}: Sinh viên tại ${getLocationName(actor.location)} được hồi phục.`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'surprise-rollcall': {
      const infraVictims = state.players.filter(
        (p) =>
          p.alive &&
          (p.location === 'radio' || p.location === 'breaker' || p.location === 'canteen'),
      );
      infraVictims.forEach((v) => {
        applyDamage(state, v, card.value, nowMs, card.title);
      });
      appendPublicLog(
        state,
        'incident',
        `📣 ${card.title}: ${infraVictims.length} người tại khu kỹ thuật chịu va chạm 1 điểm.`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'corridor-chill-draw': {
      state.players
        .filter((p) => p.alive && p.location === actor.location)
        .forEach((v) => applyDamage(state, v, card.value, nowMs, card.title));
      const drawn = drawCardFromDeck(state, 'tactic');
      if (drawn) addCardToHand(state, actor, drawn);
      appendPublicLog(
        state,
        'incident',
        `❄️ ${card.title} tại ${getLocationName(actor.location)}: Mọi người chịu 1 ST; ${actor.displayName} nhặt 1 thẻ Chiến thuật.`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'floodlight-clear-blackout': {
      const prevLoc = state.blackoutLocation;
      state.blackoutLocation = null;
      state.blackoutRoundsLeft = 0;
      if (prevLoc && state.lastVisitorByLocation[prevLoc]) {
        const visitor = state.players.find(
          (p) => p.playerId === state.lastVisitorByLocation[prevLoc],
        );
        if (visitor) {
          appendEvidence(
            state,
            actor,
            {
              kind: 'scene',
              subjectLabel: getLocationShortLabel(prevLoc),
              locationId: prevLoc,
              summary: `Ánh đèn pha rọi thấy ${visitor.displayName} vừa ở khu vực bị cắt điện.`,
              sourceLabel,
            },
            nowMs,
          );
        }
      }
      appendPublicLog(
        state,
        'incident',
        `💡 ${card.title}: Toàn bộ điểm mất điện trên bản đồ KTX đã sáng trở lại!`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'urgent-step-shield':
    case 'shield-self': {
      const gained = grantShield(actor, card.value);
      appendPublicLog(
        state,
        'tactic',
        `🛡️ ${actor.displayName} dùng ${card.title}, nhận +${gained} Khiên.`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'cabinet-spark-trace': {
      if (state.sabotagePlanted && !state.sabotageArmed) {
        state.sabotageArmed = true;
        appendPublicLog(
          state,
          'incident',
          `⚠️ Tia Lửa Tủ Điện kích hoạt sớm chuông báo: Phát hiện Mạch Quá Tải đang chờ nổ trong KTX!`,
          nowMs,
          actor.playerId,
        );
      }
      const rooms = state.tamperedLocations.map((l) => getLocationShortLabel(l));
      appendEvidence(
        state,
        actor,
        {
          kind: 'grid',
          subjectLabel: 'Lưới điện KTX',
          summary:
            rooms.length > 0
              ? `Tia lửa ghi nhận dấu thao tác kỹ thuật tại: ${rooms.join(', ')}.`
              : 'Lưới điện KTX chưa có trạm nào có dấu thao tác.',
          sourceLabel,
        },
        nowMs,
      );
      return;
    }

    case 'warden-supply-unlock': {
      const s = grantShield(actor, 1);
      const h = applyHeal(actor, 1);
      appendPublicLog(
        state,
        'tactic',
        `🧰 ${actor.displayName} mở ${card.title}: +${s} Khiên${h > 0 ? ', hồi 1 vết thương' : ''}.`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'heal-target': {
      const target =
        explicitTarget && explicitTarget.alive && explicitTarget.location === actor.location
          ? explicitTarget
          : actor;
      const gained = applyHeal(target, card.value);
      if (
        actor.roleId === 'lang-cuu-ho' &&
        actor.wardPlayerId &&
        target.playerId === actor.wardPlayerId &&
        gained > 0
      ) {
        actor.wardProtectionsCount += 1;
      }
      appendPublicLog(
        state,
        'tactic',
        `🩹 ${actor.displayName} dùng ${card.title} cho ${target.displayName} (hồi ${gained} vết thương).`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'damage-target-trace': {
      const target =
        explicitTarget && explicitTarget.alive && explicitTarget.playerId !== actor.playerId
          ? explicitTarget
          : pickInspectionTarget(state, actor, null, true);
      if (!target) return;
      if (!actor.dealtDamageRounds.includes(state.round)) {
        actor.dealtDamageRounds.push(state.round);
      }
      const res = applyDamage(state, target, card.value, nowMs, `${actor.displayName} (${card.title})`, {
        attacker: actor,
      });
      createEquipmentTraitEvidence(state, actor, target, false, card.title, nowMs);
      appendPublicLog(
        state,
        'attack',
        `🔦 ${actor.displayName} rọi ${card.title} vào ${target.displayName} (gây ${res.hpLost} vết thương, Khiên đỡ ${res.shieldAbsorbed}).`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'relocate-self': {
      const dest: BoardGameLocationId =
        explicitLocation && explicitLocation !== actor.location
          ? explicitLocation
          : 'radio';
      actor.location = dest;
      clampShieldForLocation(actor);
      grantShield(actor, card.value);
      if (!actor.visitedLocations.includes(dest)) actor.visitedLocations.push(dest);
      actor.recentMoves.push({ round: state.round, location: dest });
      recordCoPresenceForPlayer(state, actor);
      appendPublicLog(
        state,
        'move',
        `🪪 ${actor.displayName} dùng ${card.title}, đi tắt thẳng tới ${getLocationName(dest)}!`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'relocate-target': {
      const target =
        explicitTarget && explicitTarget.alive && explicitTarget.playerId !== actor.playerId
          ? explicitTarget
          : pickInspectionTarget(state, actor, null, true);
      if (!target) return;
      target.location = 'lobby';
      clampShieldForLocation(target);
      if (!target.visitedLocations.includes('lobby')) target.visitedLocations.push('lobby');
      recordCoPresenceForPlayer(state, target);
      const res = applyDamage(state, target, card.value, nowMs, `${actor.displayName} (${card.title})`, {
        attacker: actor,
      });
      appendPublicLog(
        state,
        'tactic',
        `🚨 ${actor.displayName} thổi ${card.title}, đẩy ${target.displayName} về Sảnh KTX (${res.hpLost} vết thương).`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'block-heal': {
      const target =
        explicitTarget && explicitTarget.alive && explicitTarget.playerId !== actor.playerId
          ? explicitTarget
          : pickInspectionTarget(state, actor, null, true);
      if (!target) return;
      target.healBlockedNextTurn = true;
      if (!actor.dealtDamageRounds.includes(state.round)) {
        actor.dealtDamageRounds.push(state.round);
      }
      const res = applyDamage(state, target, card.value, nowMs, `${actor.displayName} (${card.title})`, {
        attacker: actor,
      });
      appendPublicLog(
        state,
        'tactic',
        `🔐 ${actor.displayName} kích hoạt ${card.title} lên ${target.displayName}, khóa hồi phục lượt tới.`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'plant-decoy-trace': {
      const target =
        explicitTarget && explicitTarget.alive && explicitTarget.playerId !== actor.playerId
          ? explicitTarget
          : pickInspectionTarget(state, actor, null, true);
      if (!target) return;
      if (!target.plantedDecoyRounds.includes(state.round)) {
        target.plantedDecoyRounds.push(state.round);
      }
      appendPrivateNote(
        state,
        actor,
        `[Tem Nhiễu Giả] Đã gắn dấu thao tác kỹ thuật giả lên ${target.displayName} cho Vòng ${state.round}.`,
        nowMs,
      );
      appendPublicLog(
        state,
        'tactic',
        `${actor.displayName} trao đổi nhanh gần ${target.displayName} tại ${getLocationShortLabel(actor.location)}.`,
        nowMs,
        actor.playerId,
      );
      return;
    }

    case 'handheld-scanner': {
      performLocationScanOrDisarm(state, actor, actor.location, 'scan', nowMs, card.title);
      const roomTarget = state.players.find(
        (p) => p.alive && p.playerId !== actor.playerId && p.location === actor.location,
      );
      if (roomTarget) {
        createEquipmentTraitEvidence(state, actor, roomTarget, false, card.title, nowMs);
      }
      return;
    }
  }
}

export function addCardToHand(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  card: GameCard,
): void {
  if (player.hand.length >= BOARD_GAME_MAX_HAND) {
    const dropped = player.hand.shift();
    if (dropped) {
      state.discards[dropped.deck].push(dropped.id);
    }
  }
  player.hand.push(card);
}

export function createEvidenceFromCardFlavorText(kind: BoardGameEvidenceKind): string {
  return kind;
}
