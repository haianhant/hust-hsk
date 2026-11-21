// ---------------------------------------------------------------------------
// features/boardgame/domain/dynamic-allegiance.ts — DynamicAllegiance & Alliance Groups (Phase 7A)
//
// Tách bạch tuyệt đối 4 khái niệm cốt lõi (Section 6):
// 1. `baseFaction` (`player.faction` bất biến theo catalog provenance).
// 2. `effectiveFaction` (phe hiệu lực động — phục vụ Bonnie Neutral -> Shadow).
// 3. `allianceId` / `AllianceGroupRecord` (liên minh Neutral độc lập — phục vụ N.C. Soldier;
//    thành viên liên minh VẪN GIỮ `baseFaction = 'wanderer'`, `effectiveFaction = 'wanderer'`
//    và `roleId` gốc!).
// 4. `roleId` gốc vs `effectiveSkillRoleId` (quản lý bởi `dynamic-skill-copy.ts`).
//
// Bất biến:
// - Classic (`rulesetId === 'classic'`) KHÔNG BAO GIỜ chịu ảnh hưởng.
// - Thay đổi phe động KHÔNG viết đè lịch sử loại / lịch sử lộ diện đã cam kết.
// - Không bao giờ đếm Bonnie vừa là Neutral vừa là Shadow.
// - Không bao giờ lộ chuyển phe / liên minh khi chưa lộ diện theo luật chơi.
// ---------------------------------------------------------------------------

import type { BoardGameFactionId } from '../../../shared/contracts/boardgame';
import { isPlayerDormantPendingRevive } from './pending-resurrection';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

export interface DynamicFactionChangeRecord {
  readonly playerId: string;
  readonly baseFaction: BoardGameFactionId;
  readonly effectiveFaction: BoardGameFactionId;
  readonly conversionEventId: string;
  readonly triggerVictimPlayerId: string | null;
  readonly convertedAtTurnNumber: number;
  readonly convertedAtMs: number;
  readonly reason: 'bonnie_shadow_succession';
}

export interface AllianceRecruitmentRecord {
  readonly eventId: string;
  readonly recruiterPlayerId: string;
  readonly recruitedPlayerId: string;
  readonly atTurnNumber: number;
  readonly atMs: number;
}

export interface AllianceGroupRecord {
  readonly allianceId: string;
  readonly kind: 'nc_soldier_recruitment';
  readonly leaderPlayerId: string;
  readonly memberPlayerIds: string[];
  readonly createdAtTurnNumber: number;
  readonly createdAtMs: number;
  readonly recruitEvents: AllianceRecruitmentRecord[];
}

/** 3 vũ khí bắt buộc N.C. Soldier (leader) phải tự mình sở hữu để kích hoạt chiến thắng liên minh. */
export const NC_SOLDIER_REQUIRED_WEAPON_IDS = ['ev-06', 'ev-05', 'ev-03'] as const;

export function getBaseFaction(player: AuthoritativePlayerState): BoardGameFactionId {
  return player.faction;
}

/**
 * Truy vấn phe hiệu lực hiện tại của người chơi:
 * - Classic hoặc người chơi chưa đổi phe -> trả về `player.faction` (`baseFaction`).
 * - Sau khi Bonnie hoàn tất chuyển phe -> trả về `'mist-order'` (Shadow).
 */
export function getEffectiveFaction(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): BoardGameFactionId {
  if (!player) return 'wanderer';
  if (!state.rulesetId || state.rulesetId === 'classic') {
    return player.faction;
  }
  const change = state.expansionState?.effectiveFactionByPlayer?.[player.playerId];
  return change ? change.effectiveFaction : player.faction;
}

export function getDynamicFactionChange(
  state: AuthoritativeGameState,
  playerId: string,
): DynamicFactionChangeRecord | null {
  return state.expansionState?.effectiveFactionByPlayer?.[playerId] ?? null;
}

export function hasConvertedEffectiveFaction(
  state: AuthoritativeGameState,
  playerId: string,
): boolean {
  const change = getDynamicFactionChange(state, playerId);
  return Boolean(change && change.effectiveFaction !== change.baseFaction);
}

export function isEffectiveHunter(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  return Boolean(player && getEffectiveFaction(state, player) === 'lantern-guard');
}

export function isEffectiveShadow(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  return Boolean(player && getEffectiveFaction(state, player) === 'mist-order');
}

export function isEffectiveNeutral(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): boolean {
  return Boolean(player && getEffectiveFaction(state, player) === 'wanderer');
}

export interface ConvertFactionResult {
  readonly converted: boolean;
  readonly alreadyConverted?: boolean;
  readonly record?: DynamicFactionChangeRecord;
}

/**
 * Thực thi chuyển đổi phe động 1 lần duy nhất, bất khả nghịch (Bonnie -> Shadow).
 * - GIỮ NGUYÊN `player.faction` (baseFaction) và `player.roleId`.
 * - KHÔNG chỉnh sửa lịch sử quá khứ (`revealHistory` / các lượt loại trước đó).
 */
export function convertPlayerEffectiveFaction(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
  params: {
    targetFaction: BoardGameFactionId;
    conversionEventId: string;
    triggerVictimPlayerId: string | null;
    reason: DynamicFactionChangeRecord['reason'];
    nowMs: number;
  },
): ConvertFactionResult {
  if (!state.rulesetId || state.rulesetId === 'classic' || !state.expansionState) {
    return { converted: false };
  }
  if (!state.expansionState.effectiveFactionByPlayer) {
    state.expansionState.effectiveFactionByPlayer = {};
  }
  const existing = state.expansionState.effectiveFactionByPlayer[player.playerId];
  if (existing) {
    return { converted: false, alreadyConverted: true, record: existing };
  }
  if (player.faction === params.targetFaction) {
    return { converted: false };
  }

  const record: DynamicFactionChangeRecord = {
    playerId: player.playerId,
    baseFaction: player.faction,
    effectiveFaction: params.targetFaction,
    conversionEventId: params.conversionEventId,
    triggerVictimPlayerId: params.triggerVictimPlayerId,
    convertedAtTurnNumber: state.turnNumber,
    convertedAtMs: params.nowMs,
    reason: params.reason,
  };
  state.expansionState.effectiveFactionByPlayer[player.playerId] = record;
  return { converted: true, record };
}

/**
 * Danh sách `playerId` của các nhân vật Neutral ĐƯỢC CHIA BAN ĐẦU trong ván đấu.
 * (Dùng cho điều kiện thắng N.C. Soldier: mọi Neutral ban đầu khác phải được chiêu mộ.)
 */
export function getOriginallyDealtNeutralPlayerIds(
  state: AuthoritativeGameState,
): readonly string[] {
  const recorded = state.expansionState?.originallyDealtNeutralIds;
  if (Array.isArray(recorded) && recorded.length > 0) {
    return recorded;
  }
  const orderedIds =
    state.turnOrder.length > 0 ? state.turnOrder : Object.keys(state.players);
  return orderedIds.filter((pid) => state.players[pid]?.faction === 'wanderer');
}

/** Trả về nhóm liên minh (AllianceGroupRecord) mà `playerId` đang trực thuộc, hoặc null. */
export function getPlayerAlliance(
  state: AuthoritativeGameState,
  playerId: string,
): AllianceGroupRecord | null {
  const alliances = state.expansionState?.alliances;
  if (!alliances) return null;
  for (const group of Object.values(alliances)) {
    if (group.memberPlayerIds.includes(playerId)) {
      return group;
    }
  }
  return null;
}

export function isPlayerInAlliance(
  state: AuthoritativeGameState,
  playerId: string,
  allianceId?: string,
): boolean {
  const group = getPlayerAlliance(state, playerId);
  if (!group) return false;
  return allianceId ? group.allianceId === allianceId : true;
}

export function listAlliances(state: AuthoritativeGameState): readonly AllianceGroupRecord[] {
  const alliances = state.expansionState?.alliances;
  if (!alliances) return [];
  return Object.values(alliances);
}

/**
 * Kiểm tra liệu `target` có hợp lệ để bị chiêu mộ vào liên minh N.C. Soldier hay không:
 * - Khác người chiêu mộ & khác thủ lĩnh.
 * - Còn sống & không ngủ đông.
 * - ĐÃ LỘ DIỆN công khai (bảo toàn P0 hidden-role privacy!).
 * - `effectiveFaction === 'wanderer'` (nếu Bonnie đã thành Shadow -> bị từ chối!).
 * - Chưa nằm trong liên minh.
 */
export function isEligibleNcSoldierRecruitTarget(
  state: AuthoritativeGameState,
  recruiter: AuthoritativePlayerState,
  target: AuthoritativePlayerState | null | undefined,
): boolean {
  if (!target || target.playerId === recruiter.playerId) return false;
  if (!target.alive || isPlayerDormantPendingRevive(state, target)) return false;
  if (!target.revealed) return false;
  if (!isEffectiveNeutral(state, target)) return false;
  if (isPlayerInAlliance(state, target.playerId)) return false;
  return true;
}

export interface RecruitAllianceResult {
  readonly recruited: boolean;
  readonly alreadyRecruited?: boolean;
  readonly reason?: string;
  readonly alliance?: AllianceGroupRecord;
}

/**
 * Kết nạp `target` vào liên minh N.C. Soldier của `recruiter`.
 * - Nếu `recruiter` là thủ lĩnh chưa có nhóm -> khởi tạo `AllianceGroupRecord` mới.
 * - Nếu `recruiter` là thành viên đã được chiêu mộ -> kết nạp vào chính liên minh của thủ lĩnh.
 * - Giữ nguyên `target.roleId` & `target.faction` (`'wanderer'`); KHÔNG đổi `effectiveFaction`.
 * - Idempotent theo `eventId` & chống chiêu mộ lặp trên cùng mục tiêu.
 */
export function recruitPlayerIntoNcSoldierAlliance(
  state: AuthoritativeGameState,
  recruiter: AuthoritativePlayerState,
  target: AuthoritativePlayerState,
  eventId: string,
  nowMs: number,
): RecruitAllianceResult {
  if (!state.rulesetId || state.rulesetId === 'classic' || !state.expansionState) {
    return { recruited: false, reason: 'Chỉ khả dụng ở bộ luật mở rộng.' };
  }
  if (!state.expansionState.alliances) {
    state.expansionState.alliances = {};
  }

  const existingTargetAlliance = getPlayerAlliance(state, target.playerId);
  if (existingTargetAlliance) {
    return {
      recruited: false,
      alreadyRecruited: true,
      reason: 'Người chơi này đã thuộc liên minh Chiêu Mộ.',
      alliance: existingTargetAlliance,
    };
  }

  if (!isEligibleNcSoldierRecruitTarget(state, recruiter, target)) {
    return {
      recruited: false,
      reason: 'Mục tiêu không phải Kẻ Độc Hành đã lộ diện hợp lệ để chiêu mộ.',
    };
  }

  let group = getPlayerAlliance(state, recruiter.playerId);
  if (!group) {
    const allianceId = `alliance:nc_soldier:${recruiter.playerId}`;
    group = {
      allianceId,
      kind: 'nc_soldier_recruitment',
      leaderPlayerId: recruiter.playerId,
      memberPlayerIds: [recruiter.playerId],
      createdAtTurnNumber: state.turnNumber,
      createdAtMs: nowMs,
      recruitEvents: [],
    };
    state.expansionState.alliances[allianceId] = group;
  }

  if (group.recruitEvents.some((e) => e.eventId === eventId)) {
    return { recruited: false, alreadyRecruited: true, alliance: group };
  }

  group.memberPlayerIds.push(target.playerId);
  group.recruitEvents.push({
    eventId,
    recruiterPlayerId: recruiter.playerId,
    recruitedPlayerId: target.playerId,
    atTurnNumber: state.turnNumber,
    atMs: nowMs,
  });

  return { recruited: true, alliance: group };
}

/**
 * Kiểm tra điều kiện thắng tức thì của Liên minh N.C. Soldier (Section 17):
 * 1. Thủ lĩnh còn sống (và chưa chuyển sang phe không phải Neutral).
 * 2. Có ít nhất 1 Neutral khác đã được chiêu mộ thành công.
 * 3. MỌI Neutral khác được chia ban đầu trong trận đều đã được chiêu mộ thành công
 *    (nếu 1 Neutral chết hoặc Bonnie chuyển thành Shadow trước khi chiêu mộ -> FALSE!).
 * 4. Thủ lĩnh TỰ MÌNH sở hữu đủ 3 vũ khí chuẩn: `ev-06` (Machine Gun), `ev-05` (Handgun), `ev-03` (Chainsaw).
 */
export function isNcSoldierAllianceVictorySatisfied(
  state: AuthoritativeGameState,
  alliance: AllianceGroupRecord,
): boolean {
  if (alliance.kind !== 'nc_soldier_recruitment') return false;
  const leader = state.players[alliance.leaderPlayerId];
  if (!leader || !leader.alive || isPlayerDormantPendingRevive(state, leader)) {
    return false;
  }
  if (!isEffectiveNeutral(state, leader)) return false;

  // Thủ lĩnh phải tự sở hữu cả 3 vũ khí bắt buộc
  const hasAllWeapons = NC_SOLDIER_REQUIRED_WEAPON_IDS.every((weaponId) =>
    leader.equipped.includes(weaponId),
  );
  if (!hasAllWeapons) return false;

  const originalNeutrals = getOriginallyDealtNeutralPlayerIds(state);
  const otherOriginalNeutrals = originalNeutrals.filter(
    (pid) => pid !== alliance.leaderPlayerId,
  );
  if (otherOriginalNeutrals.length === 0) return false;

  // Mọi Neutral khác ban đầu đều phải nằm trong liên minh (đã chiêu mộ & chưa chuyển sang phe khác)
  return otherOriginalNeutrals.every((pid) => {
    if (!alliance.memberPlayerIds.includes(pid)) return false;
    const member = state.players[pid];
    if (!member) return false;
    return isEffectiveNeutral(state, member);
  });
}
