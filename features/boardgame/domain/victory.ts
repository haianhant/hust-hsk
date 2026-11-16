// ---------------------------------------------------------------------------
// features/boardgame/domain/victory.ts — Đánh giá điều kiện thắng bại chuẩn 100%
// Shadow Hunters cho Đội Săn Đêm (3), Hội Bóng Đêm (3) & Kẻ Độc Hành (4).
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGameRevealRecord,
} from '../../../shared/contracts/boardgame';
import { FACTION_LABELS, getRoleDesign } from './roles';
import type {
  AuthoritativeGameState,
  AuthoritativePlayerState,
  VictoryEvaluation,
} from './types';

function qualifiesWandererVictory(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  huntersWon: boolean,
  isFinalFallback = false,
): boolean {
  if (player.faction !== 'wanderer') return false;
  switch (player.roleId) {
    case 'lang-anh-san': // Hải "Sưu Tầm" (Bob): 5+ Trang bị
      return player.alive && (isFinalFallback ? player.equipped.length >= 3 : player.equipped.length >= 5);
    case 'lang-quan-sat': // Trang "Kiên Cường" (Allie): còn sống khi ván đấu kết thúc
      return player.alive;
    case 'lang-cuu-ho': // Bách "Cuồng Chiến" (Charles): giết người khi deadCount >= 3
      return player.alive && player.charlesKillWon;
    case 'lang-tien-phong': {
      // Đạt "Cảm Tử" (Daniel): là người ĐẦU TIÊN bị loại, HOẶC còn sống khi Đội Săn Đêm thắng!
      const deadCount = Object.values(state.players).filter((p) => !p.alive).length;
      if (!player.alive && state.firstDeadPlayerId === player.playerId && deadCount === 1) {
        return true;
      }
      return player.alive && huntersWon;
    }
    default:
      return false;
  }
}

export function evaluateVictory(state: AuthoritativeGameState): VictoryEvaluation {
  const allPlayers = Object.values(state.players);
  const alivePlayers = allPlayers.filter((p) => p.alive);
  const deadCount = allPlayers.length - alivePlayers.length;

  const hunterPlayers = allPlayers.filter((p) => p.faction === 'lantern-guard');
  const shadowPlayers = allPlayers.filter((p) => p.faction === 'mist-order');
  const wanderers = allPlayers.filter((p) => p.faction === 'wanderer');

  const huntersAlive = hunterPlayers.filter((p) => p.alive).length;
  const shadowsAlive = shadowPlayers.filter((p) => p.alive).length;
  const wanderersDead = wanderers.filter((w) => !w.alive).length;

  const allShadowsDead = shadowPlayers.length > 0 && shadowsAlive === 0;
  const allHuntersDead = hunterPlayers.length > 0 && huntersAlive === 0;
  const shadowsReachedThreeNeutralKills = shadowPlayers.length > 0 && wanderersDead >= 3;
  const huntersTriggered = allShadowsDead;
  const shadowsTriggered = allHuntersDead || shadowsReachedThreeNeutralKills;

  // Các điều kiện thắng tức thì của Kẻ Độc Hành (chuẩn Shadow Hunters)
  const bobWinners = wanderers.filter(
    (w) => w.alive && w.roleId === 'lang-anh-san' && w.equipped.length >= 5,
  );
  const charlesWinners = wanderers.filter(
    (w) => w.alive && w.roleId === 'lang-cuu-ho' && w.charlesKillWon,
  );
  const danielFirstDeathWinners = wanderers.filter(
    (w) =>
      !w.alive &&
      w.roleId === 'lang-tien-phong' &&
      state.firstDeadPlayerId === w.playerId &&
      deadCount === 1,
  );
  const soleAllieWinners = wanderers.filter(
    (w) => w.alive && w.roleId === 'lang-quan-sat' && alivePlayers.length === 1,
  );

  // 1. Khi đồng thời kích hoạt cả Đội Săn Đêm & Hội Bóng Đêm (đòn quyết tử đồng quy)
  if (huntersTriggered && shadowsTriggered) {
    const activeActor = state.activePlayerId ? state.players[state.activePlayerId] : null;
    const tiebreakFaction: BoardGameFactionId =
      activeActor && (activeActor.faction === 'lantern-guard' || activeActor.faction === 'mist-order')
        ? activeActor.faction
        : hunterPlayers.reduce((s, p) => s + p.woundsTaken, 0) <=
            shadowPlayers.reduce((s, p) => s + p.woundsTaken, 0)
          ? 'lantern-guard'
          : 'mist-order';
    const baseWinners = tiebreakFaction === 'lantern-guard' ? hunterPlayers : shadowPlayers;
    const winnerSet = new Set<string>(baseWinners.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, tiebreakFaction === 'lantern-guard')) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: tiebreakFaction,
      winnerLabel: `${FACTION_LABELS[tiebreakFaction]} (Đòn quyết tử)`,
      winnerPlayerIds: winnerIds,
      winReason: `Đòn quyết tử đồng quy — ${FACTION_LABELS[tiebreakFaction]} giành chiến thắng chung cuộc!`,
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 2. Đội Săn Đêm tiêu diệt hết Hội Bóng Đêm
  if (huntersTriggered) {
    const winnerSet = new Set<string>(hunterPlayers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, true)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: 'lantern-guard',
      winnerLabel: FACTION_LABELS['lantern-guard'],
      winnerPlayerIds: winnerIds,
      winReason: 'Toàn bộ Hội Bóng Đêm đã bị loại khỏi KTX!',
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 3. Hội Bóng Đêm tiêu diệt hết Đội Săn Đêm HOẶC có đủ 3 Kẻ Độc Hành gục ngã
  if (shadowsTriggered) {
    const winnerSet = new Set<string>(shadowPlayers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, false)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: 'mist-order',
      winnerLabel: FACTION_LABELS['mist-order'],
      winnerPlayerIds: winnerIds,
      winReason: allHuntersDead
        ? 'Toàn bộ Đội Săn Đêm đã gục ngã — Hội Bóng Đêm làm chủ KTX!'
        : `Đã có ${wanderersDead} Kẻ Độc Hành gục ngã — Hội Bóng Đêm kích hoạt thắng lợi!`,
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 4. Các điều kiện thắng tức thì của Kẻ Độc Hành (Bob 5 đồ / Charles >=3 xác / Daniel chết đầu tiên / Allie sống cuối)
  const soloTriggers = [
    ...bobWinners,
    ...charlesWinners,
    ...danielFirstDeathWinners,
    ...soleAllieWinners,
  ];
  if (soloTriggers.length > 0) {
    const lead = soloTriggers[0];
    const leadDesign = getRoleDesign(lead.roleId);
    const winnerSet = new Set<string>(soloTriggers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, false)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    const winReason =
      lead.roleId === 'lang-anh-san'
        ? `${lead.displayName} sở hữu đủ ${lead.equipped.length} Trang bị — hoàn thành mục tiêu Độc Hành!`
        : lead.roleId === 'lang-cuu-ho'
          ? `${lead.displayName} đã hạ gục mục tiêu khi có ${deadCount} người ngã xuống (≥ 3)!`
          : lead.roleId === 'lang-tien-phong'
            ? `${lead.displayName} (Đạt "Cảm Tử") là người ĐẦU TIÊN ngã xuống — hoàn thành mục tiêu tức thì!`
            : `${lead.displayName} (Trang "Kiên Cường") trụ lại sống sót cuối cùng!`;
    return {
      finished: true,
      winnerFaction: 'wanderer-solo',
      winnerLabel: `Kẻ Độc Hành — ${lead.displayName} (${leadDesign.name})`,
      winnerPlayerIds: winnerIds,
      winReason,
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 5. Giới hạn an toàn maxRounds (chỉ dùng nếu trận kéo dài bất thường > 30 vòng)
  if (state.round > state.maxRounds) {
    const hunterRatio =
      hunterPlayers.length === 0
        ? -1
        : huntersAlive * 100 -
          hunterPlayers.reduce((sum, p) => sum + p.woundsTaken, 0);
    const shadowRatio =
      shadowPlayers.length === 0
        ? -1
        : shadowsAlive * 100 -
          shadowPlayers.reduce((sum, p) => sum + p.woundsTaken, 0);
    const topFaction: BoardGameFactionId =
      hunterRatio >= shadowRatio ? 'lantern-guard' : 'mist-order';
    const baseWinners = topFaction === 'lantern-guard' ? hunterPlayers : shadowPlayers;
    const winnerSet = new Set<string>(baseWinners.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, topFaction === 'lantern-guard', true)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: topFaction,
      winnerLabel: `${FACTION_LABELS[topFaction]} (Ưu thế sinh tồn)`,
      winnerPlayerIds: winnerIds,
      winReason: `Hết ${state.maxRounds} vòng an toàn — ${FACTION_LABELS[topFaction]} chiếm ưu thế sinh tồn!`,
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  return {
    finished: false,
    winnerFaction: null,
    winnerLabel: null,
    winnerPlayerIds: [],
    winReason: null,
    winningRoleIds: [],
  };
}

export function buildFinalRevealSummary(
  state: AuthoritativeGameState,
  winnerPlayerIds: readonly string[],
): BoardGameRevealRecord[] {
  const winnerSet = new Set(winnerPlayerIds);
  return state.turnOrder
    .map((pid) => state.players[pid])
    .filter((p): p is AuthoritativePlayerState => Boolean(p))
    .map((player) => {
      const role = getRoleDesign(player.roleId);
      return {
        playerId: player.playerId,
        displayName: player.displayName,
        roleId: player.roleId,
        roleName: role.name,
        faction: player.faction,
        won: winnerSet.has(player.playerId),
        alive: player.alive,
        hp: player.hp,
        maxHp: player.maxHp,
        woundsTaken: player.woundsTaken,
      };
    });
}
