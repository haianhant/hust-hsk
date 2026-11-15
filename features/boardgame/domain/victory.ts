// ---------------------------------------------------------------------------
// features/boardgame/domain/victory.ts — Điều kiện thắng bất đối xứng v2
// (Âm Mưu Phá Hoại Ngầm, Niêm Phong Lưới Điện, Đối Chất & Phiên Họp Rạng Sáng).
// Tuyệt đối không dùng điểm Tín hiệu/Màn sương hay tổng HP để phân thắng bại.
// ---------------------------------------------------------------------------

import type { BoardGameRevealRecord } from '../../../shared/contracts/boardgame';
import { FACTION_LABELS, ROLES_BY_ID } from './roles';
import { getLocationName } from './rules';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

function scoreHypotheses(
  player: AuthoritativePlayerState,
  allPlayers: readonly AuthoritativePlayerState[],
): { correct: number; wrong: number } {
  let correct = 0;
  let wrong = 0;
  for (const h of player.hypotheses) {
    const target = allPlayers.find((p) => p.playerId === h.targetPlayerId);
    if (!target) continue;
    if (target.faction === h.predictedFaction) {
      correct += 1;
    } else {
      wrong += 1;
    }
  }
  return { correct, wrong };
}

export function qualifiesWandererCoWin(
  p: AuthoritativePlayerState,
  allPlayers: readonly AuthoritativePlayerState[],
): boolean {
  if (p.faction !== 'wanderer') return false;
  if (p.roleId === 'lang-anh-san') {
    return p.alive && !p.detained && p.verifiedSceneLocations.length >= 2 && p.evidenceList.length >= 3;
  }
  if (p.roleId === 'lang-quan-sat') {
    if (!p.alive) return false;
    const { correct, wrong } = scoreHypotheses(p, allPlayers);
    return correct >= 2 && wrong === 0;
  }
  if (p.roleId === 'lang-cuu-ho') {
    const ward = p.wardPlayerId ? allPlayers.find((x) => x.playerId === p.wardPlayerId) : null;
    if (!ward || !ward.alive) return false;
    return (p.alive && p.wardProtectionsCount >= 1) || p.sacrificedForWard;
  }
  return false;
}

function finalizeMatchOutcome(
  state: AuthoritativeGameState,
  nowMs: number,
  winnerFaction: 'lantern-guard' | 'mist-order' | 'wanderer-solo',
  winnerLabel: string,
  reason: string,
  primaryWinnerIds: string[],
  highlightTitle: string,
): true {
  const winnerSet = new Set<string>(primaryWinnerIds);
  for (const p of state.players) {
    if (qualifiesWandererCoWin(p, state.players)) {
      winnerSet.add(p.playerId);
    }
    // Lật mở toàn bộ vai công khai khi trận kết thúc
    p.revealed = true;
  }

  state.finished = true;
  state.turnPhase = 'ENDED';
  state.winnerFaction = winnerFaction;
  state.winnerPlayerIds = Array.from(winnerSet);
  state.winnerLabel = winnerLabel;
  state.winReason = reason;
  state.highlights.push({
    round: state.round,
    title: highlightTitle,
    detail: reason,
    atMs: nowMs,
  });

  state.seqCounter += 1;
  state.publicLog.push({
    id: `log-win-${state.seqCounter}`,
    round: state.round,
    atMs: nowMs,
    kind: 'victory',
    text: reason,
  });
  return true;
}

/** Đánh giá toàn bộ điều kiện thắng v2 theo thứ tự ưu tiên tất định. */
export function evaluateVictoryState(
  state: AuthoritativeGameState,
  nowMs: number,
  isDawnReached = false,
): boolean {
  if (state.finished) return true;

  // 1. Hải — Công Bố Hồ Sơ Độc Lập từ Vòng 4+ tại Phòng Phát Thanh
  if (state.dossierPublishedBy) {
    const hai = state.players.find((p) => p.playerId === state.dossierPublishedBy);
    if (hai) {
      const reason = `${hai.displayName} (Kẻ Lang Thang) đã công bố toàn bộ Hồ Sơ Mất Điện trực tiếp trên sóng Phát Thanh Bách Khoa!`;
      return finalizeMatchOutcome(
        state,
        nowMs,
        'wanderer-solo',
        `${hai.displayName} (Công Bố Hồ Sơ)`,
        reason,
        [hai.playerId],
        'Hồ sơ chấn động KTX',
      );
    }
  }

  // 2. Hội Màn Sương kích nổ thành công Mạch Quá Tải đã gài
  if (state.plotDetonated) {
    const mistIds = state.players.filter((p) => p.faction === 'mist-order').map((p) => p.playerId);
    const reason = `Hội Màn Sương kích nổ thành công Mạch Quá Tải tại ${getLocationName(state.secretSabotageLocation)}, cắt hoàn toàn hệ thống KTX!`;
    return finalizeMatchOutcome(
      state,
      nowMs,
      'mist-order',
      FACTION_LABELS['mist-order'],
      reason,
      mistIds,
      `${FACTION_LABELS['mist-order']} chiến thắng`,
    );
  }

  const activeMist = state.players.filter(
    (p) => p.faction === 'mist-order' && p.alive && !p.detained,
  );
  const aliveGuard = state.players.filter((p) => p.faction === 'lantern-guard' && p.alive);
  const guardIds = state.players.filter((p) => p.faction === 'lantern-guard').map((p) => p.playerId);
  const mistIds = state.players.filter((p) => p.faction === 'mist-order').map((p) => p.playerId);

  // 3. Toàn bộ Hội Màn Sương đã bị loại hoặc bị Tạm giữ qua Đối chất
  if (activeMist.length === 0) {
    const reason =
      'Toàn bộ thành viên Hội Màn Sương đã bị tạm giữ hoặc rời cuộc chơi — Đội Gác Đèn bảo vệ an toàn KTX!';
    return finalizeMatchOutcome(
      state,
      nowMs,
      'lantern-guard',
      FACTION_LABELS['lantern-guard'],
      reason,
      guardIds,
      `${FACTION_LABELS['lantern-guard']} chiến thắng`,
    );
  }

  // 4. Toàn bộ Đội Gác Đèn đã kiệt sức trong khi Hội Màn Sương vẫn còn người tự do
  if (aliveGuard.length === 0) {
    const reason = 'Toàn bộ Đội Gác Đèn đã kiệt sức; Hội Màn Sương hoàn toàn làm chủ khu KTX!';
    return finalizeMatchOutcome(
      state,
      nowMs,
      'mist-order',
      FACTION_LABELS['mist-order'],
      reason,
      mistIds,
      `${FACTION_LABELS['mist-order']} chiến thắng`,
    );
  }

  // 4b. Từ Vòng 3+, gỡ được >= 2 lần mạch và niêm phong cả Cầu Dao lẫn Phát Thanh thắng ngay lập tức
  if (state.round >= 3 && state.disarmedCount >= 2 && state.breakerSealed && state.radioSealed) {
    const reason =
      'Đội Gác Đèn đã gỡ thành công 2 Mạch Quá Tải và niêm phong chặt cả Cầu Dao lẫn Phát Thanh!';
    return finalizeMatchOutcome(
      state,
      nowMs,
      'lantern-guard',
      FACTION_LABELS['lantern-guard'],
      reason,
      guardIds,
      'Niêm phong & Vô hiệu hóa hoàn toàn',
    );
  }

  // 5. Rạng Sáng (chạm trần số vòng hữu hạn)
  if (isDawnReached) {
    // 5a. Mạch Quá Tải chưa bị gỡ phát nổ lúc Rạng Sáng
    if (state.sabotagePlanted) {
      const reason = `Rạng Sáng Vòng ${state.maxRounds}: Mạch Quá Tải tại ${getLocationName(state.secretSabotageLocation)} không được gỡ kịp thời đã kích nổ lúc chuyển ca!`;
      return finalizeMatchOutcome(
        state,
        nowMs,
        'mist-order',
        FACTION_LABELS['mist-order'],
        reason,
        mistIds,
        'Mạch nổ lúc Rạng Sáng',
      );
    }

    // 5b. Đội Gác Đèn đã niêm phong cả Cầu Dao & Phát Thanh và ít nhất 1 lần gỡ mạch hoặc lật/khống chế Màn Sương
    const anyMistExposedOrDown = state.players.some(
      (p) => p.faction === 'mist-order' && (p.revealed || p.detained || !p.alive),
    );
    if (state.breakerSealed && state.radioSealed && (state.disarmedCount >= 1 || anyMistExposedOrDown)) {
      const reason = `Rạng Sáng Vòng ${state.maxRounds}: Đội Gác Đèn đã niêm phong cả Cầu Dao lẫn Phát Thanh và khóa chặt âm mưu Màn Sương!`;
      return finalizeMatchOutcome(
        state,
        nowMs,
        'lantern-guard',
        FACTION_LABELS['lantern-guard'],
        reason,
        guardIds,
        'Niêm phong thành công',
      );
    }

    // 5c. Nếu hai phe chính giằng co chưa hoàn tất mục tiêu, Trang có thể đoạt chiến thắng Rạng Sáng bằng 2+ giả thuyết chuẩn xác tuyệt đối
    const trang = state.players.find((p) => p.roleId === 'lang-quan-sat' && p.alive);
    if (trang) {
      const { correct, wrong } = scoreHypotheses(trang, state.players);
      if (correct >= 2 && wrong === 0) {
        const reason = `Rạng Sáng Vòng ${state.maxRounds}: Giữa thế giằng co, ${trang.displayName} (Người Ghi Chép) đưa ra bản luận tội chính xác ${correct}/${correct} nhân thân bí mật!`;
        return finalizeMatchOutcome(
          state,
          nowMs,
          'wanderer-solo',
          `${trang.displayName} (Suy Luận Tuyệt Đối)`,
          reason,
          [trang.playerId],
          'Bản ghi Rạng Sáng',
        );
      }
    }

    // 5d. Phiên Họp Rạng Sáng: Xét xem có thành viên Màn Sương ẩn danh & tự do nào từng xâm nhập Trạm Mục Tiêu hay không
    const undetectedInfiltrator = activeMist.find(
      (p) => !p.revealed && p.visitedLocations.includes(state.secretSabotageLocation),
    );
    if (undetectedInfiltrator) {
      const reason = `Phiên Họp Rạng Sáng: Màn Sương còn người ẩn danh chưa bị lật từng xâm nhập ${getLocationName(state.secretSabotageLocation)} qua mặt đội tuần tra!`;
      return finalizeMatchOutcome(
        state,
        nowMs,
        'mist-order',
        FACTION_LABELS['mist-order'],
        reason,
        mistIds,
        'Màn Sương qua mặt tuần tra',
      );
    }

    const reason = `Phiên Họp Rạng Sáng: Không kẻ phá hoại ẩn danh nào lọt được vào ${getLocationName(state.secretSabotageLocation)} — Đội Gác Đèn giữ vững khu KTX!`;
    return finalizeMatchOutcome(
      state,
      nowMs,
      'lantern-guard',
      FACTION_LABELS['lantern-guard'],
      reason,
      guardIds,
      'Tuần tra giữ vững KTX',
    );
  }

  return false;
}

export function buildFinalRevealSummary(state: AuthoritativeGameState): BoardGameRevealRecord[] {
  const winners = new Set(state.winnerPlayerIds);
  return state.players.map((p) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    roleId: p.roleId,
    roleName: ROLES_BY_ID[p.roleId].name,
    faction: p.faction,
    won: winners.has(p.playerId),
    alive: p.alive,
    detained: p.detained,
    hp: p.hp,
    maxHp: p.maxHp,
    woundsTaken: Math.max(0, p.maxHp - p.hp),
  }));
}
