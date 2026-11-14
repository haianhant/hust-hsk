// ---------------------------------------------------------------------------
// features/boardgame/domain/victory.ts — Kiểm tra & kết thúc thắng thua
// tức thì hoặc khi chạm trần số vòng hữu hạn (7 hoặc 8 vòng).
// ---------------------------------------------------------------------------

import { FACTION_LABELS, ROLES_BY_ID } from './roles';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

function qualifiesWandererAtEnd(
  p: AuthoritativePlayerState,
  players: readonly AuthoritativePlayerState[],
  isRoundLimitReached: boolean,
): boolean {
  if (p.faction !== 'wanderer') return false;
  if (p.roleId === 'lang-anh-san') {
    return p.alive && p.fragments >= 2;
  }
  if (p.roleId === 'lang-quan-sat') {
    return p.alive && (p.correctPredictions >= 2 || (isRoundLimitReached && p.hp >= 6));
  }
  if (p.roleId === 'lang-cuu-ho') {
    const ward = p.wardPlayerId ? players.find((x) => x.playerId === p.wardPlayerId) : null;
    if (ward && ward.alive && p.alive && p.hp >= 4 && (p.shieldedForWardCount >= 1 || isRoundLimitReached)) {
      return true;
    }
    return p.shieldedForWardCount >= 2;
  }
  return false;
}

/** Kiểm tra điều kiện thắng tức thì giữa ván đấu. Trả true nếu trận đã ngã ngũ. */
export function evaluateVictoryState(
  state: AuthoritativeGameState,
  nowMs: number,
  isRoundLimitReached = false,
): boolean {
  if (state.finished) return true;

  // 1. Kẻ Lang Thang đạt mốc thắng tức thì (Hải đủ >= 3 Mảnh Tin Đen)
  const soloHunter = state.players.find(
    (p) => p.roleId === 'lang-anh-san' && p.alive && p.fragments >= 3,
  );
  if (soloHunter && !isRoundLimitReached) {
    state.finished = true;
    state.turnPhase = 'ENDED';
    state.winnerFaction = 'wanderer-solo';
    state.winnerPlayerIds = [soloHunter.playerId];
    state.winnerLabel = `${soloHunter.displayName} (Kẻ Lang Thang)`;
    state.winReason = `${soloHunter.displayName} đã thu thập đủ ${soloHunter.fragments} Mảnh Tin Đen và giải mã toàn bộ đêm mất điện!`;
    state.highlights.push({
      round: state.round,
      title: 'Giải mã đơn độc',
      detail: state.winReason,
      atMs: nowMs,
    });
    return true;
  }

  const aliveGuard = state.players.filter((p) => p.faction === 'lantern-guard' && p.alive);
  const aliveMist = state.players.filter((p) => p.faction === 'mist-order' && p.alive);

  let primaryFaction: 'lantern-guard' | 'mist-order' | null = null;
  let reason = '';

  if (state.signalProgress >= state.maxTrackValue) {
    primaryFaction = 'lantern-guard';
    reason = `Đội Gác Đèn đã đưa Chỉ số Tín hiệu lên ${state.signalProgress}/${state.maxTrackValue}, khôi phục hoàn toàn phát thanh KTX!`;
  } else if (state.mistProgress >= state.maxTrackValue) {
    primaryFaction = 'mist-order';
    reason = `Hội Màn Sương đã đẩy Chỉ số Nhiễu sóng lên ${state.mistProgress}/${state.maxTrackValue}, nhấn chìm khu KTX trong màn sương!`;
  } else if (aliveMist.length === 0 && aliveGuard.length > 0) {
    primaryFaction = 'lantern-guard';
    reason = 'Toàn bộ thành viên Hội Màn Sương đã bị loại khỏi cuộc điều tra!';
  } else if (aliveGuard.length === 0 && aliveMist.length > 0) {
    primaryFaction = 'mist-order';
    reason = 'Toàn bộ Đội Gác Đèn đã kiệt sức; Hội Màn Sương kiểm soát hệ thống KTX!';
  } else if (isRoundLimitReached) {
    if (state.signalProgress > state.mistProgress) {
      primaryFaction = 'lantern-guard';
      reason = `Hết ${state.maxRounds} vòng: Đội Gác Đèn dẫn điểm Tín hiệu (${state.signalProgress} so với ${state.mistProgress}).`;
    } else if (state.mistProgress > state.signalProgress) {
      primaryFaction = 'mist-order';
      reason = `Hết ${state.maxRounds} vòng: Hội Màn Sương chiếm ưu thế Nhiễu sóng (${state.mistProgress} so với ${state.signalProgress}).`;
    } else {
      const guardHp = aliveGuard.reduce((sum, p) => sum + p.hp, 0);
      const mistHp = aliveMist.reduce((sum, p) => sum + p.hp, 0);
      if (mistHp > guardHp) {
        primaryFaction = 'mist-order';
        reason = `Hết ${state.maxRounds} vòng hòa chỉ số (${state.mistProgress}-${state.signalProgress}); Hội Màn Sương giữ tổng HP cao hơn (${mistHp} vs ${guardHp}).`;
      } else {
        primaryFaction = 'lantern-guard';
        reason = `Hết ${state.maxRounds} vòng đến rạng sáng: Đội Gác Đèn bật thành công nguồn điện dự phòng (${guardHp} vs ${mistHp} HP).`;
      }
    }
  }

  if (!primaryFaction) return false;

  const coWinners: string[] = [];
  state.players.forEach((p) => {
    if (p.faction === primaryFaction) {
      coWinners.push(p.playerId);
    } else if (qualifiesWandererAtEnd(p, state.players, isRoundLimitReached)) {
      coWinners.push(p.playerId);
    }
    // Lật toàn bộ vai công khai trong trạng thái kết thúc
    p.revealed = true;
  });

  state.finished = true;
  state.turnPhase = 'ENDED';
  state.winnerFaction = primaryFaction;
  state.winnerPlayerIds = coWinners;
  state.winnerLabel = FACTION_LABELS[primaryFaction];
  state.winReason = reason;
  state.highlights.push({
    round: state.round,
    title: `${state.winnerLabel} chiến thắng`,
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

export function buildFinalRevealSummary(state: AuthoritativeGameState) {
  const winners = new Set(state.winnerPlayerIds);
  return state.players.map((p) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    roleId: p.roleId,
    roleName: ROLES_BY_ID[p.roleId].name,
    faction: p.faction,
    won: winners.has(p.playerId),
    alive: p.alive,
    hp: p.hp,
  }));
}
