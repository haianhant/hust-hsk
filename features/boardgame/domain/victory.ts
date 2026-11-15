// ---------------------------------------------------------------------------
// features/boardgame/domain/victory.ts — Đánh giá điều kiện thắng bại cho
// Đội Săn Đêm, Hội Bóng Đêm và Kẻ Độc Hành (Bóng Đêm KTX v4).
// ---------------------------------------------------------------------------

import type {
  BoardGameFactionId,
  BoardGameRevealRecord,
  BoardGameRoleId,
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
  primaryTeamWinners: ReadonlySet<string>,
  alivePlayers: readonly AuthoritativePlayerState[],
  deadCount: number,
  isFinalFallback = false,
): boolean {
  if (!player.alive || player.faction !== 'wanderer') return false;
  switch (player.roleId) {
    case 'lang-anh-san':
      return isFinalFallback
        ? player.equipped.length >= 2
        : state.round >= 3 && player.revealed && player.equipped.length >= 3;
    case 'lang-quan-sat':
      if (isFinalFallback) return true;
      return alivePlayers.length === 1 || (player.revealed && deadCount >= 2);
    case 'lang-cuu-ho': {
      if (player.avengedProtegeKiller) return true;
      const prot = player.protegePlayerId ? state.players[player.protegePlayerId] : null;
      return Boolean(
        (prot && prot.alive) ||
          (player.protegePlayerId && primaryTeamWinners.has(player.protegePlayerId)),
      );
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

  // 1. Hải (vòng 3+, lật vai + 3+ Trang bị) hoặc Bình (đã lật vai & báo thù) thắng tức thì.
  for (const w of wanderers) {
    if (!w.alive) continue;
    if (w.roleId === 'lang-anh-san' && state.round >= 3 && w.revealed && w.equipped.length >= 3) {
      const winnerSet = new Set<string>([w.playerId]);
      for (const other of wanderers) {
        if (
          other.playerId !== w.playerId &&
          qualifiesWandererVictory(state, other, winnerSet, alivePlayers, deadCount)
        ) {
          winnerSet.add(other.playerId);
        }
      }
      const winnerIds = Array.from(winnerSet);
      const design = getRoleDesign(w.roleId);
      return {
        finished: true,
        winnerFaction: 'wanderer-solo',
        winnerLabel: `Kẻ Độc Hành — ${w.displayName} (${design.name})`,
        winnerPlayerIds: winnerIds,
        winReason: `${w.displayName} thu thập đủ ${w.equipped.length} Trang bị — hoàn thành mục tiêu Độc Hành!`,
        winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
      };
    }
    if (w.roleId === 'lang-cuu-ho' && w.revealed && w.avengedProtegeKiller) {
      const winnerSet = new Set<string>([w.playerId]);
      for (const other of wanderers) {
        if (
          other.playerId !== w.playerId &&
          qualifiesWandererVictory(state, other, winnerSet, alivePlayers, deadCount)
        ) {
          winnerSet.add(other.playerId);
        }
      }
      const winnerIds = Array.from(winnerSet);
      return {
        finished: true,
        winnerFaction: 'wanderer-solo',
        winnerLabel: `Kẻ Độc Hành — ${w.displayName} (Báo thù thành công)`,
        winnerPlayerIds: winnerIds,
        winReason: `${w.displayName} đã hạ gục kẻ loại Người được bảo hộ và sống sót!`,
        winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
      };
    }
  }

  // 2. Xóa sổ toàn bộ Hội Bóng Đêm hoặc Đội Săn Đêm.
  const allShadowsDead = shadowPlayers.length > 0 && shadowsAlive === 0;
  const allHuntersDead = hunterPlayers.length > 0 && huntersAlive === 0;

  if (allShadowsDead && allHuntersDead) {
    const primarySet = new Set<string>();
    const wandererWinners = wanderers
      .filter((w) => qualifiesWandererVictory(state, w, primarySet, alivePlayers, deadCount, true))
      .map((w) => w.playerId);
    if (wandererWinners.length > 0) {
      return {
        finished: true,
        winnerFaction: 'wanderer',
        winnerLabel: 'Kẻ Độc Hành sống sót cuối cùng',
        winnerPlayerIds: wandererWinners,
        winReason: 'Cả hai phe Săn Đêm và Bóng Đêm đều kiệt quệ — Kẻ Độc Hành trụ lại sau cùng!',
        winningRoleIds: wandererWinners.map((id) => state.players[id].roleId),
      };
    }
    const activeActor = state.activePlayerId ? state.players[state.activePlayerId] : null;
    const tiebreakFaction: BoardGameFactionId =
      activeActor && (activeActor.faction === 'lantern-guard' || activeActor.faction === 'mist-order')
        ? activeActor.faction
        : hunterPlayers.reduce((s, p) => s + p.woundsTaken, 0) <=
            shadowPlayers.reduce((s, p) => s + p.woundsTaken, 0)
          ? 'lantern-guard'
          : 'mist-order';
    const baseWinners =
      tiebreakFaction === 'lantern-guard' ? hunterPlayers : shadowPlayers;
    const winnerSet = new Set<string>(baseWinners.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, winnerSet, alivePlayers, deadCount, true)) {
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

  if (allShadowsDead) {
    const winnerSet = new Set<string>(hunterPlayers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, winnerSet, alivePlayers, deadCount)) {
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

  if (allHuntersDead) {
    const winnerSet = new Set<string>(shadowPlayers.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, winnerSet, alivePlayers, deadCount)) {
        winnerSet.add(w.playerId);
      }
    }
    const winnerIds = Array.from(winnerSet);
    return {
      finished: true,
      winnerFaction: 'mist-order',
      winnerLabel: FACTION_LABELS['mist-order'],
      winnerPlayerIds: winnerIds,
      winReason: 'Toàn bộ Đội Săn Đêm đã gục ngã — Hội Bóng Đêm làm chủ KTX!',
      winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
    };
  }

  // 3. Trang "Kiên Cường" solo survivor (khi bàn đã có >=3 người bị loại & chỉ còn <=2 sống sót).
  for (const w of wanderers) {
    if (
      w.roleId === 'lang-quan-sat' &&
      w.alive &&
      (alivePlayers.length === 1 || (w.revealed && deadCount >= 3 && alivePlayers.length <= 2))
    ) {
      const winnerSet = new Set<string>([w.playerId]);
      for (const other of wanderers) {
        if (
          other.playerId !== w.playerId &&
          qualifiesWandererVictory(state, other, winnerSet, alivePlayers, deadCount)
        ) {
          winnerSet.add(other.playerId);
        }
      }
      const winnerIds = Array.from(winnerSet);
      return {
        finished: true,
        winnerFaction: 'wanderer-solo',
        winnerLabel: `Kẻ Độc Hành — ${w.displayName} (Trang "Kiên Cường")`,
        winnerPlayerIds: winnerIds,
        winReason: `${w.displayName} sống sót ngoạn mục đến phút cuối (${alivePlayers.length} người còn lại)!`,
        winningRoleIds: winnerIds.map((id) => state.players[id].roleId),
      };
    }
  }

  // 4. Giới hạn an toàn maxRounds (chỉ dùng nếu trận kéo dài bất thường > 30 vòng).
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
    const baseWinners =
      topFaction === 'lantern-guard' ? hunterPlayers : shadowPlayers;
    const winnerSet = new Set<string>(baseWinners.map((p) => p.playerId));
    for (const w of wanderers) {
      if (qualifiesWandererVictory(state, w, winnerSet, alivePlayers, deadCount, true)) {
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
