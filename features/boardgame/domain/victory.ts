// ---------------------------------------------------------------------------
// features/boardgame/domain/victory.ts — Điều kiện thắng & phân giải xung đột v3
// ("Bóng Đêm KTX v3 — Hidden Role, Investigation & Survival").
//
// Quy tắc:
// - Không dùng điểm Tín hiệu/Màn sương.
// - Không dùng tổng HP đội làm tiêu chí phân thắng bại cuối trận.
// - Hỗ trợ thắng đơn độc (Hải / Trang), thắng phe (Gác Đèn / Màn Sương / Lang Thang),
//   đồng thắng Kẻ Lang Thang, và Phiên Trực Cuối Đêm chống hòa kẹt.
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGameRevealRecord,
} from '../../../shared/contracts/boardgame';
import { FACTION_LABELS, ROLES_BY_ID } from './roles';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

export function buildFinalRevealSummary(
  state: AuthoritativeGameState,
): BoardGameRevealRecord[] {
  const winnerSet = new Set(state.winnerPlayerIds);
  return state.players.map((p) => {
    const roleDef = ROLES_BY_ID[p.roleId];
    return {
      playerId: p.playerId,
      displayName: p.displayName,
      roleId: p.roleId,
      roleName: roleDef?.name ?? p.roleId,
      faction: p.faction,
      won: winnerSet.has(p.playerId),
      alive: p.alive,
      hp: p.hp,
      maxHp: p.maxHp,
      woundsTaken: Math.max(0, p.maxHp - p.hp),
    };
  });
}

export function qualifiesWandererCoWin(
  p: AuthoritativePlayerState,
  allPlayers: readonly AuthoritativePlayerState[],
  currentRound = 1,
): boolean {
  if (p.faction !== 'wanderer') return false;
  const eliminatedCount = allPlayers.filter((x) => !x.alive).length;
  const aliveCount = allPlayers.length - eliminatedCount;

  if (p.roleId === 'lang-anh-san') {
    return p.alive && p.equipped.length >= 2 && p.investigationsCount >= 2;
  }

  if (p.roleId === 'lang-quan-sat') {
    if (!p.alive) return false;
    return (
      eliminatedCount >= 2 ||
      (currentRound >= 6 && eliminatedCount >= 1 && p.investigationsCount >= 2)
    );
  }

  if (p.roleId === 'lang-cuu-ho') {
    const protege = p.protegePlayerId
      ? allPlayers.find((x) => x.playerId === p.protegePlayerId) ?? null
      : null;
    if (!protege) return p.alive;
    if (protege.alive) {
      return p.alive || p.protectedProtegeCount >= 1;
    }
    return p.alive && (p.avengedProtegeKiller || aliveCount <= 2);
  }

  return false;
}

export function finalizeMatchOutcome(
  state: AuthoritativeGameState,
  nowMs: number,
  winnerFaction: BoardGameFactionId | 'wanderer-solo' | 'wanderer',
  winnerLabel: string,
  reason: string,
  primaryWinnerIds: string[],
  highlightTitle: string,
): true {
  if (state.finished) return true;
  const winnerSet = new Set<string>(primaryWinnerIds);
  for (const p of state.players) {
    if (qualifiesWandererCoWin(p, state.players, state.round)) {
      winnerSet.add(p.playerId);
    }
    p.revealed = true;
  }

  const coWinners = state.players
    .filter(
      (p) =>
        p.faction === 'wanderer' &&
        winnerSet.has(p.playerId) &&
        !primaryWinnerIds.includes(p.playerId),
    )
    .map((p) => p.displayName);

  const finalReason =
    coWinners.length > 0
      ? `${reason} (Đồng thắng cùng Kẻ Lang Thang: ${coWinners.join(', ')})`
      : reason;

  state.finished = true;
  state.turnPhase = 'ENDED';
  state.winnerFaction = winnerFaction;
  state.winnerPlayerIds = Array.from(winnerSet);
  state.winnerLabel = winnerLabel;
  state.winReason = finalReason;

  state.seqCounter += 1;
  state.highlights.push({
    round: Math.min(state.round, state.maxRounds),
    title: highlightTitle,
    detail: finalReason,
    atMs: nowMs,
  });

  state.publicLogSeq += 1;
  state.publicLog.push({
    id: `log-win-${state.publicLogSeq}`,
    round: Math.min(state.round, state.maxRounds),
    atMs: nowMs,
    kind: 'victory',
    text: finalReason,
  });

  return true;
}

/** Đánh giá toàn bộ điều kiện thắng v3 theo thứ tự ưu tiên tất định. */
export function evaluateVictoryState(
  state: AuthoritativeGameState,
  nowMs: number,
  isRoundCapReached = false,
): boolean {
  if (state.finished) return true;

  const alivePlayers = state.players.filter((p) => p.alive);
  const eliminatedCount = state.players.length - alivePlayers.length;

  const aliveGuards = alivePlayers.filter((p) => p.faction === 'lantern-guard');
  const aliveMists = alivePlayers.filter((p) => p.faction === 'mist-order');
  const aliveWanderers = alivePlayers.filter((p) => p.faction === 'wanderer');

  // 1. Thắng đơn độc tức thì của Trang nếu đã lật vai & trụ tới nhóm 2 người cuối
  const revealedTrangWinner = aliveWanderers.find(
    (p) =>
      p.roleId === 'lang-quan-sat' &&
      p.revealed &&
      alivePlayers.length <= 2 &&
      eliminatedCount >= 2,
  );
  if (revealedTrangWinner) {
    return finalizeMatchOutcome(
      state,
      nowMs,
      'wanderer-solo',
      `${revealedTrangWinner.displayName} (Trang — Kẻ Lang Thang)`,
      `${revealedTrangWinner.displayName} đã lật vai làm nhân chứng cuối cùng giữa đêm KTX hỗn loạn và giành chiến thắng độc lập!`,
      [revealedTrangWinner.playerId],
      'Nhân Chứng Sống Sót Cuối Đêm',
    );
  }

  // 2. Đội Gác Đèn thắng khi toàn bộ Hội Màn Sương bị loại
  if (aliveMists.length === 0 && aliveGuards.length > 0) {
    const guardIds = state.players
      .filter((p) => p.faction === 'lantern-guard')
      .map((p) => p.playerId);
    return finalizeMatchOutcome(
      state,
      nowMs,
      'lantern-guard',
      FACTION_LABELS['lantern-guard'],
      'Toàn bộ thành viên Hội Màn Sương đã bị hạ gục — Đội Gác Đèn bảo vệ an toàn ký túc xá!',
      guardIds,
      'Đội Gác Đèn Quét Sạch Màn Sương',
    );
  }

  // 3. Hội Màn Sương thắng khi toàn bộ Đội Gác Đèn bị loại
  if (aliveGuards.length === 0 && aliveMists.length > 0) {
    const mistIds = state.players
      .filter((p) => p.faction === 'mist-order')
      .map((p) => p.playerId);
    return finalizeMatchOutcome(
      state,
      nowMs,
      'mist-order',
      FACTION_LABELS['mist-order'],
      'Toàn bộ Đội Gác Đèn đã ngã gục — Hội Màn Sương chiếm trọn bóng đêm KTX!',
      mistIds,
      'Hội Màn Sương Áp Đảo Ký Túc Xá',
    );
  }

  // 4. Cùng triệt tiêu cả hai phe chính
  if (aliveGuards.length === 0 && aliveMists.length === 0) {
    if (aliveWanderers.length > 0) {
      return finalizeMatchOutcome(
        state,
        nowMs,
        'wanderer',
        FACTION_LABELS.wanderer,
        'Cả Đội Gác Đèn lẫn Hội Màn Sương đều kiệt sức — những Kẻ Lang Thang trụ lại giành chiến thắng!',
        aliveWanderers.map((p) => p.playerId),
        'Kẻ Lang Thang Chiếm Lĩnh Sân Đêm',
      );
    }
    const guardIds = state.players
      .filter((p) => p.faction === 'lantern-guard')
      .map((p) => p.playerId);
    return finalizeMatchOutcome(
      state,
      nowMs,
      'lantern-guard',
      FACTION_LABELS['lantern-guard'],
      'Toàn bộ hai phe đều ngã xuống cùng lúc — kỷ luật Đội Gác Đèn giữ được trạm gác KTX.',
      guardIds,
      'Trạm Gác Giữ Vững Phút Cuối',
    );
  }

  // 5. Hết Vòng tối đa: Phiên Trực Cuối Đêm (không cộng tổng HP để phân thắng bại!)
  if (isRoundCapReached || state.round > state.maxRounds) {
    const eliminatedMists = state.players.filter(
      (p) => p.faction === 'mist-order' && !p.alive,
    ).length;
    const eliminatedGuards = state.players.filter(
      (p) => p.faction === 'lantern-guard' && !p.alive,
    ).length;

    if (eliminatedMists > eliminatedGuards) {
      const guardIds = state.players
        .filter((p) => p.faction === 'lantern-guard')
        .map((p) => p.playerId);
      return finalizeMatchOutcome(
        state,
        nowMs,
        'lantern-guard',
        FACTION_LABELS['lantern-guard'],
        `Hết ${state.maxRounds} vòng: Đội Gác Đèn loại được nhiều đối thủ hơn (${eliminatedMists} so với ${eliminatedGuards}) và kiểm soát KTX tới rạng sáng!`,
        guardIds,
        'Phiên Trực Cuối Đêm — Gác Đèn Thắng Thế',
      );
    }

    if (eliminatedGuards > eliminatedMists) {
      const mistIds = state.players
        .filter((p) => p.faction === 'mist-order')
        .map((p) => p.playerId);
      return finalizeMatchOutcome(
        state,
        nowMs,
        'mist-order',
        FACTION_LABELS['mist-order'],
        `Hết ${state.maxRounds} vòng: Hội Màn Sương hạ gục được nhiều mục tiêu hơn (${eliminatedGuards} so với ${eliminatedMists}) và phá vỡ chốt tuần tra!`,
        mistIds,
        'Phiên Trực Cuối Đêm — Màn Sương Thắng Thế',
      );
    }

    // Hòa số người bị loại -> so điểm kiểm soát chốt trực & ẩn danh chiến thuật
    const guardWatchControl =
      aliveGuards.filter((p) =>
        p.location === 'lobby' || p.location === 'radio' || p.location === 'breaker',
      ).length *
        2 +
      state.players
        .filter((p) => p.faction === 'lantern-guard')
        .reduce((acc, p) => acc + p.investigationsCount, 0);

    const mistStealthControl =
      aliveMists.filter((p) => !p.revealed).length * 2 +
      aliveMists.filter((p) =>
        p.location === 'corridor' || p.location === 'canteen' || p.location === 'radio',
      ).length;

    if (mistStealthControl > guardWatchControl) {
      const mistIds = state.players
        .filter((p) => p.faction === 'mist-order')
        .map((p) => p.playerId);
      return finalizeMatchOutcome(
        state,
        nowMs,
        'mist-order',
        FACTION_LABELS['mist-order'],
        `Hết ${state.maxRounds} vòng: Hội Màn Sương giữ kín tung tích và áp đảo điểm kiểm soát khu trung tâm (${mistStealthControl} vs ${guardWatchControl})!`,
        mistIds,
        'Phiên Trực Cuối Đêm — Màn Sương Ẩn Mình',
      );
    }

    const guardIds = state.players
      .filter((p) => p.faction === 'lantern-guard')
      .map((p) => p.playerId);
    return finalizeMatchOutcome(
      state,
      nowMs,
      'lantern-guard',
      FACTION_LABELS['lantern-guard'],
      `Hết ${state.maxRounds} vòng: Đội Gác Đèn giữ vững chốt trực và tổng số điều tra (${guardWatchControl} vs ${mistStealthControl}) tới khi trời sáng!`,
      guardIds,
      'Phiên Trực Cuối Đêm — An Toàn Rạng Sáng',
    );
  }

  return false;
}
