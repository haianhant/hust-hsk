// ---------------------------------------------------------------------------
// features/boardgame/domain/dynamic-skill-copy.ts — DynamicSkillCopy (Phase 7A)
//
// Hệ thống gắn kết kỹ năng động (runtime skill bindings) cho:
// - Vengeful Spirit (`exp1_vengeful_spirit`) — sao chép kỹ năng tùy chọn sau 1 cái chết.
// - Antimony (`exp1_antimony`) — tự động sao chép kỹ năng + điều kiện thắng (qua CopiedVictoryGraph).
// - Thành viên được N.C. Soldier (`exp2_nc_soldier`) chiêu mộ — nhận kỹ năng Chiêu Mộ.
//
// Bất biến cốt lõi (Section 5):
// 1. Sao chép kỹ năng KHÔNG tự động sao chép phe (`baseFaction` giữ nguyên).
// 2. Sao chép kỹ năng KHÔNG tự động sao chép thông tin bí mật của nguồn.
// 3. Kỹ năng once-per-match được sao chép luôn nhận trạng thái sử dụng MỚI (`skillUsedOnce = false`).
// 4. Sao chép một kỹ năng đã được sao chép diễn giải tất định theo `effectiveSkillRoleId`
//    với giới hạn độ sâu `MAX_SKILL_COPY_DEPTH = 3` và chống chu trình.
// 5. Ma trận năng lực sao chép `SKILL_COPY_CAPABILITY_MATRIX` phủ tường minh ĐỦ 66/66 nhân vật.
// 6. KHÔNG nhân bản logic CopiedVictoryGraph trong module này.
// ---------------------------------------------------------------------------

import type { BoardGameRoleId } from '../../../shared/contracts/boardgame';
import { EXPANSION_CHARACTER_CATALOG } from './expansion-catalog';
import { ROLES_CATALOG } from './roles';
import type { AuthoritativeGameState, AuthoritativePlayerState } from './types';

export const MAX_SKILL_COPY_DEPTH = 3 as const;

export type SkillCopyCapabilityStatus =
  | 'FULL_DIRECT'
  | 'ADAPTED_FUTURE_ONLY'
  | 'SPECIAL_LIFECYCLE'
  | 'SELF_REFERENTIAL_NO_LOOP';

export type SkillCopyUsageAllowance =
  | 'fresh-once-per-match'
  | 'fresh-per-turn'
  | 'passive-continuous'
  | 'repeatable-cost';

export interface SkillCopyCapabilityEntry {
  readonly roleId: string;
  readonly sourceName: string;
  readonly pack: 'classic' | 'expansion-1' | 'expansion-2';
  readonly copyStatus: SkillCopyCapabilityStatus;
  readonly freshUsageAllowance: SkillCopyUsageAllowance;
  readonly historicalConditionPolicy: string;
  readonly revealCoherenceNote: string;
  readonly notes: string;
}

export interface CopiedSkillBinding {
  readonly ownerPlayerId: string;
  readonly baseRoleId: BoardGameRoleId;
  /** Mã kỹ năng hiệu lực mà chủ sở hữu đang thực thi (có thể là role mở rộng hoặc Classic). */
  readonly effectiveSkillRoleId: string;
  readonly sourcePlayerId: string;
  readonly sourceOriginalRoleId: string;
  readonly copyEventId: string;
  readonly copiedAtMs: number;
  readonly copiedAtTurnNumber: number;
  readonly copyDepth: number;
  readonly provenanceChain: readonly string[];
  readonly bindingKind: 'copied-from-elimination' | 'alliance-recruitment';
  skillUsedOnce: boolean;
  skillCooldown: number;
  resurrectionChargesUsed?: number;
  skillRuntimeMeta?: Record<string, unknown>;
}

/** Ghi đè ngữ nghĩa chuyên biệt cho các vai diễn đặc thù / phụ thuộc lịch sử / vòng đời. */
const SPECIAL_COPY_OVERRIDES: Readonly<
  Record<
    string,
    Partial<
      Pick<
        SkillCopyCapabilityEntry,
        | 'copyStatus'
        | 'freshUsageAllowance'
        | 'historicalConditionPolicy'
        | 'revealCoherenceNote'
        | 'notes'
      >
    >
  >
> = {
  // Classic roles
  'gac-ky-thuat': {
    freshUsageAllowance: 'fresh-once-per-match',
    notes: 'Bản sao nhận 1 lượt dùng mới (1d4 sát thương) độc lập với trạng thái đã dùng của nguồn.',
  },
  'gac-truc-ban': {
    freshUsageAllowance: 'passive-continuous',
    notes: 'Di chuyển tự do tới ô bất kỳ trong cùng cụm mà không cần xúc xắc.',
  },
  'gac-radio': {
    freshUsageAllowance: 'fresh-once-per-match',
    notes: 'Bản sao nhận 1 lượt dùng mới (1d6 sát thương).',
  },
  'suong-an-danh': {
    freshUsageAllowance: 'passive-continuous',
    notes: 'Hồi 2 HP sau mỗi đòn tấn công thường gây >= 1 sát thương.',
  },
  'suong-tin-gia': {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'passive-continuous',
    historicalConditionPolicy: 'Chỉ áp dụng cho các lá Điều tra tương lai; không sửa manh mối đã ghi trước đó.',
    revealCoherenceNote: 'Người sao chép đã lộ diện nên kỹ năng che giấu trước khi lộ không áp dụng hồi tố.',
    notes: 'Không phát lại lịch sử điều tra cũ.',
  },
  'suong-gac-cong': {
    freshUsageAllowance: 'passive-continuous',
    notes: 'Phản công tự động khi bị tấn công thường.',
  },
  'lang-anh-san': {
    freshUsageAllowance: 'passive-continuous',
    notes: 'Cướp trang bị thay vì gây sát thương khi đòn đánh >= 2 sát thương.',
  },
  'lang-quan-sat': {
    freshUsageAllowance: 'fresh-once-per-match',
    notes: 'Bản sao nhận 1 lượt hồi đầy máu mới qua HealPipeline.',
  },
  'lang-cuu-ho': {
    freshUsageAllowance: 'repeatable-cost',
    notes: 'Tự nhận 2 sát thương để chém bồi mục tiêu vừa đánh.',
  },
  'lang-tien-phong': {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'passive-continuous',
    historicalConditionPolicy: 'Không phát lại Tiếng Hét Lộ Diện của cái chết đầu tiên đã xảy ra.',
    revealCoherenceNote: 'Người sao chép vốn đã lộ diện.',
    notes: 'Antimony sao chép Daniel vẫn đánh giá điều kiện thắng qua CopiedVictoryGraph (chỉ thắng theo nhánh Hunter nếu đã có người chết trước).',
  },

  // Special Expansion roles (lifecycle / reveal / historical / self-copy)
  exp1_lloyd: {
    copyStatus: 'SPECIAL_LIFECYCLE',
    freshUsageAllowance: 'repeatable-cost',
    notes: 'Bản sao trở thành ứng viên GlobalAttackInterrupt hợp lệ (chống lặp & xếp hàng xác định với mọi Lloyd khác).',
  },
  exp1_vengeful_spirit: {
    copyStatus: 'SELF_REFERENTIAL_NO_LOOP',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Nếu nguồn đã sao chép 1 kỹ năng X -> kế thừa trực tiếp kỹ năng hiệu lực X (tăng copyDepth). Nếu nguồn chưa từng sao chép -> bản sao không thể tự sao chép vòng lặp chính mình.',
    notes: 'Được bảo vệ bởi MAX_SKILL_COPY_DEPTH = 3 & kiểm tra chu trình.',
  },
  exp1_antimony: {
    copyStatus: 'SELF_REFERENTIAL_NO_LOOP',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Nếu Antimony nguồn đã sao chép kỹ năng X -> kế thừa trực tiếp X (tăng copyDepth). Nếu Antimony chết trước khi kích hoạt -> không gây vòng lặp tự sao chép.',
    notes: 'Mục tiêu thắng (nếu Antimony sao chép Antimony) được giải riêng qua CopiedVictoryGraph với cycle guard.',
  },
  exp1_voodoo: {
    copyStatus: 'SPECIAL_LIFECYCLE',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Không kế thừa grant đang chờ/đã dùng của Voodoo cũ; bản sao nhận 1 lượt chiếm quyền mới vào đầu lượt tiếp theo của chính mình.',
    notes: 'Toàn bộ giới hạn bảo mật TurnOwnershipOverride áp dụng y hệt cho người sao chép.',
  },
  exp1_undead: {
    copyStatus: 'SPECIAL_LIFECYCLE',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Nhận 1 lượt PendingResurrection mới (revive 6 HP, tối đa maxHp của bản thân) cho lần chí tử kế tiếp.',
    revealCoherenceNote: 'Bản sao đã lộ diện nên bỏ qua ràng buộc "chỉ lộ diện khi chết"; vẫn kích hoạt DORMANT_PENDING_REVIVE vào lần chí tử tiếp theo.',
    notes: 'Không cho phép hồi sinh vô hạn: mỗi bản sao chỉ có đúng 1 charge.',
  },
  exp2_cain: {
    copyStatus: 'SPECIAL_LIFECYCLE',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Nhận 1 lượt hồi máu theo số người còn sống và gắn điều kiện thắng song phe khi CHÍNH người sao chép bị loại vĩnh viễn.',
    notes: 'Đi qua HealPipeline và MultiFactionVictory theo playerId chủ sở hữu.',
  },
  exp2_bonnie: {
    copyStatus: 'SPECIAL_LIFECYCLE',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Nếu người sao chép có effectiveFaction !== Shadow và sau này kết liễu 1 Shadow -> chuyển effectiveFaction sang Shadow (1 lần, bất khả nghịch). Nếu đã là Shadow (Vengeful Spirit) -> không đổi phe kép.',
    notes: 'Không thay đổi lịch sử loại trước thời điểm sao chép.',
  },
  exp2_nc_soldier: {
    copyStatus: 'SPECIAL_LIFECYCLE',
    freshUsageAllowance: 'fresh-per-turn',
    historicalConditionPolicy: 'Nhận kỹ năng Chiêu Mộ thay cho đòn đánh thường lên Neutral đã lộ diện; giữ nguyên baseFaction của người sao chép (chỉ thắng liên minh nếu chính là thủ lĩnh hoặc thành viên hợp lệ trong liên minh).',
    notes: 'Đồng minh được N.C. Soldier chiêu mộ cũng dùng cơ chế binding này (`bindingKind: alliance-recruitment`).',
  },
  exp2_umibozu: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Người sao chép đã lộ diện tại thời điểm sao chép nên KHÔNG kích hoạt hồi tố AoE lộ diện; chỉ kích hoạt nếu có sự kiện lộ diện mới trong tương lai.',
    revealCoherenceNote: 'Không tự phát nổ AoE miễn phí ngay khi copy.',
    notes: 'Tuân thủ nguyên tắc không hồi tố sự kiện quá khứ.',
  },
  exp2_arlene: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'passive-continuous',
    historicalConditionPolicy: 'Áp dụng cho các lá Điều tra tương lai (như Unknown cho mọi phe).',
    revealCoherenceNote: 'Người sao chép đã lộ diện nên hiệu ứng che giấu khi ẩn không áp dụng hồi tố.',
    notes: 'Điều kiện thắng Arlene chỉ sao chép bởi Antimony qua CopiedVictoryGraph.',
  },
  exp1_fallen: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'passive-continuous',
    historicalConditionPolicy: 'Bỏ qua khóa lộ diện vì người sao chép đã lộ; giữ hiệu ứng +2 sát thương khi HP còn lại >= 8.',
    notes: 'Đánh giá trên HP của chính người sao chép.',
  },
  exp1_cassie: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'fresh-per-turn',
    historicalConditionPolicy: 'Nhận kỹ năng hồi 1 máu đầu lượt; điều kiện thắng liên kết (nếu là Antimony) đi qua CopiedVictoryGraph.',
    notes: 'Không kế thừa dữ liệu riêng của Cassie cũ.',
  },
  exp1_clairvoyant: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Nhận 1 lượt soi vai mới cho mục tiêu tương lai; KHÔNG kế thừa danh sách soi vai bí mật của Clairvoyant đã chết!',
    notes: 'Bảo mật P0: Zero private vision inheritance.',
  },
  exp2_april_skipps: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'passive-continuous',
    historicalConditionPolicy: 'Không hồi tố đồng hồ đếm ngược cũ; người sao chép đã lộ diện nên điều kiện kích hoạt ô 7 không tự chạy hồi tố.',
    notes: 'An toàn, không tự tặng thắng miễn phí.',
  },
  exp2_dalton: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'passive-continuous',
    historicalConditionPolicy: 'Bản sao chỉ kích hoạt Vòng Đấu Thứ 12 khi CHÍNH người sao chép chạm ngưỡng thương tích trong tương lai; không kế thừa lệnh cấm tự hồi máu của Dalton đã chết.',
    notes: 'Trạng thái kích hoạt lưu theo playerId chủ sở hữu.',
  },
  exp1_ernest: {
    freshUsageAllowance: 'fresh-once-per-match',
    notes: 'Nhận 1 lượt Từ Đạo mới (mất 2 HP ép Shadow lộ diện & hủy trang bị).',
  },
  exp1_bethany: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Nhận 1 lượt chỉ định Người Được Chọn mới (không kế thừa lựa chọn cũ của Bethany).',
    notes: 'Tuân thủ atomic equipment transaction.',
  },
  exp1_arnold: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'fresh-once-per-match',
    historicalConditionPolicy: 'Nhận 1 lượt phản đòn chí tử mới cho bản thân qua DamageRedirection.',
    notes: 'Mỗi chủ sở hữu theo dõi độc lập.',
  },
  exp2_diana: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'passive-continuous',
    historicalConditionPolicy: 'Không kế thừa hợp đồng khách hàng cũ của Diana; áp dụng cho sự kiện lộ diện tương lai.',
    notes: 'Mục tiêu thắng đi qua CopiedVictoryGraph.',
  },
  exp2_aaron: {
    copyStatus: 'ADAPTED_FUTURE_ONLY',
    freshUsageAllowance: 'passive-continuous',
    historicalConditionPolicy: 'Không kế thừa quan hệ vợ/chồng cũ của Aaron; áp dụng cho sự kiện lộ diện nữ nhân vật tương lai.',
    notes: 'Mục tiêu thắng đi qua CopiedVictoryGraph.',
  },
};

function inferDefaultAllowance(usageLimit: string): SkillCopyUsageAllowance {
  if (usageLimit === 'once_per_match') return 'fresh-once-per-match';
  if (usageLimit === 'per_turn' || usageLimit === 'per_attack') return 'fresh-per-turn';
  if (usageLimit === 'repeatable') return 'repeatable-cost';
  return 'passive-continuous';
}

function buildSkillCopyCapabilityMatrix(): Readonly<Record<string, SkillCopyCapabilityEntry>> {
  const out: Record<string, SkillCopyCapabilityEntry> = {};

  for (const c of ROLES_CATALOG) {
    if (c.id.startsWith('exp')) continue;
    const ov = SPECIAL_COPY_OVERRIDES[c.id];
    out[c.id] = {
      roleId: c.id,
      sourceName: c.name,
      pack: 'classic',
      copyStatus: ov?.copyStatus ?? 'FULL_DIRECT',
      freshUsageAllowance:
        ov?.freshUsageAllowance ??
        (c.oncePerMatch ? 'fresh-once-per-match' : 'passive-continuous'),
      historicalConditionPolicy:
        ov?.historicalConditionPolicy ?? 'Thực thi trực tiếp trên trạng thái hiện tại của người sao chép; không hồi tố quá khứ.',
      revealCoherenceNote:
        ov?.revealCoherenceNote ?? 'Người sao chép đã lộ diện nên thỏa mọi điều kiện yêu cầu lộ vai.',
      notes: ov?.notes ?? 'Hỗ trợ sao chép trực tiếp với bộ đếm sử dụng độc lập.',
    };
  }

  for (const e of EXPANSION_CHARACTER_CATALOG) {
    const ov = SPECIAL_COPY_OVERRIDES[e.id];
    out[e.id] = {
      roleId: e.id,
      sourceName: e.sourceName,
      pack: e.expansionId,
      copyStatus: ov?.copyStatus ?? 'FULL_DIRECT',
      freshUsageAllowance: ov?.freshUsageAllowance ?? inferDefaultAllowance(e.usageLimit),
      historicalConditionPolicy:
        ov?.historicalConditionPolicy ?? 'Thực thi trực tiếp trên trạng thái hiện tại của người sao chép; không hồi tố sự kiện quá khứ.',
      revealCoherenceNote:
        ov?.revealCoherenceNote ?? 'Người sao chép lộ diện khi kích hoạt sao chép nên đồng nhất điều kiện lộ vai.',
      notes: ov?.notes ?? 'Hỗ trợ sao chép trực tiếp với trạng thái lượt dùng độc lập.',
    };
  }

  return out;
}

/** Ma trận năng lực sao chép chính tắc phủ đủ 66/66 nhân vật (10 Classic + 56 Expansion). */
export const SKILL_COPY_CAPABILITY_MATRIX: Readonly<
  Record<string, SkillCopyCapabilityEntry>
> = buildSkillCopyCapabilityMatrix();

export function getSkillCopyCapability(roleId: string): SkillCopyCapabilityEntry | null {
  return SKILL_COPY_CAPABILITY_MATRIX[roleId] ?? null;
}

export function getCopiedSkillBinding(
  state: AuthoritativeGameState,
  playerId: string,
): CopiedSkillBinding | null {
  if (!state.rulesetId || state.rulesetId === 'classic') return null;
  return state.expansionState?.copiedSkillsByPlayer?.[playerId] ?? null;
}

/**
 * Truy vấn mã kỹ năng hiệu lực hiện tại của người chơi:
 * - Classic hoặc chưa sao chép/chiêu mộ -> `player.roleId`.
 * - Đã sao chép kỹ năng hoặc được N.C. Soldier chiêu mộ -> `binding.effectiveSkillRoleId`.
 */
export function getEffectiveSkillRoleId(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState | null | undefined,
): string {
  if (!player) return '';
  if (!state.rulesetId || state.rulesetId === 'classic') {
    return player.roleId;
  }
  const binding = state.expansionState?.copiedSkillsByPlayer?.[player.playerId];
  return binding ? binding.effectiveSkillRoleId : player.roleId;
}

/**
 * Kiểm tra liệu người chơi đã tiêu hao kỹ năng once-per-match HIỆU LỰC của mình chưa.
 * - Khi có `CopiedSkillBinding`, kiểm tra trên `binding.skillUsedOnce` (tách biệt hoàn toàn
 *   với `player.skillUsedOnce` của bản thân Antimony/Vengeful Spirit và của nạn nhân!).
 */
export function hasEffectiveSkillUsedOnce(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): boolean {
  const binding = getCopiedSkillBinding(state, player.playerId);
  if (binding) return binding.skillUsedOnce;
  return player.skillUsedOnce;
}

export function markEffectiveSkillUsedOnce(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): void {
  const binding = getCopiedSkillBinding(state, player.playerId);
  if (binding) {
    binding.skillUsedOnce = true;
    return;
  }
  player.skillUsedOnce = true;
}

export function getEffectiveSkillCooldown(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): number {
  const binding = getCopiedSkillBinding(state, player.playerId);
  if (binding) return binding.skillCooldown;
  return player.skillCooldown;
}

export function tickEffectiveSkillCooldown(
  state: AuthoritativeGameState,
  player: AuthoritativePlayerState,
): void {
  const binding = getCopiedSkillBinding(state, player.playerId);
  if (binding && binding.skillCooldown > 0) {
    binding.skillCooldown = Math.max(0, binding.skillCooldown - 1);
  }
}

export interface BindCopiedSkillResult {
  readonly bound: boolean;
  readonly reason?: string;
  readonly cycleOrDepthBlocked?: boolean;
  readonly binding?: CopiedSkillBinding;
}

/**
 * Gắn kỹ năng sao chép động cho `copier` (Vengeful Spirit hoặc Antimony) từ `sourceVictim`.
 *
 * Bảo đảm:
 * - Giải chuỗi lồng nhau (nested copy) tới `effectiveSkillRoleId` hiện tại của `sourceVictim`.
 * - Chặn vượt `MAX_SKILL_COPY_DEPTH` và chặn vòng lặp tự sao chép (`copier -> victim -> copier`).
 * - Cấp trạng thái lượt dùng MỚI (`skillUsedOnce = false`, `skillCooldown = 0`, `resurrectionChargesUsed = 0`).
 * - KHÔNG sao chép phe, KHÔNG sao chép thông tin riêng tư (`privateClues`, `hand`, `clairvoyantVisions`).
 */
export function bindCopiedSkillFromElimination(
  state: AuthoritativeGameState,
  copier: AuthoritativePlayerState,
  sourceVictim: AuthoritativePlayerState,
  copyEventId: string,
  nowMs: number,
): BindCopiedSkillResult {
  if (!state.rulesetId || state.rulesetId === 'classic' || !state.expansionState) {
    return { bound: false, reason: 'Chỉ khả dụng ở bộ luật mở rộng.' };
  }
  if (copier.playerId === sourceVictim.playerId) {
    return { bound: false, cycleOrDepthBlocked: true, reason: 'Không thể tự sao chép chính mình.' };
  }

  if (!state.expansionState.copiedSkillsByPlayer) {
    state.expansionState.copiedSkillsByPlayer = {};
  }

  const existingOwn = state.expansionState.copiedSkillsByPlayer[copier.playerId];
  if (existingOwn && existingOwn.copyEventId === copyEventId) {
    return { bound: true, binding: existingOwn };
  }

  const victimBinding = state.expansionState.copiedSkillsByPlayer[sourceVictim.playerId];
  const resolvedEffectiveRoleId = victimBinding
    ? victimBinding.effectiveSkillRoleId
    : sourceVictim.roleId;
  const nextDepth = (victimBinding?.copyDepth ?? 0) + 1;

  if (nextDepth > MAX_SKILL_COPY_DEPTH) {
    return {
      bound: false,
      cycleOrDepthBlocked: true,
      reason: `Vượt giới hạn độ sâu sao chép kỹ năng (MAX_SKILL_COPY_DEPTH = ${MAX_SKILL_COPY_DEPTH}).`,
    };
  }

  // Chống chu trình: nếu chuỗi nguồn đã chứa chính copier -> từ chối an toàn
  const victimChain = victimBinding ? [...victimBinding.provenanceChain] : [sourceVictim.roleId];
  if (victimBinding && victimBinding.sourcePlayerId === copier.playerId) {
    return {
      bound: false,
      cycleOrDepthBlocked: true,
      reason: 'Phát hiện chu trình sao chép kỹ năng — chặn an toàn.',
    };
  }

  const capability = getSkillCopyCapability(resolvedEffectiveRoleId);
  if (!capability) {
    return {
      bound: false,
      reason: `Không tìm thấy đặc tả sao chép cho vai diễn ${resolvedEffectiveRoleId}.`,
    };
  }

  // Nếu mục tiêu là một vai tự sao chép CHƯA từng kích hoạt sao chép (chính vai `exp1_antimony` / `exp1_vengeful_spirit`),
  // vẫn ghi nhận provenance minh bạch nhưng đánh dấu `skillUsedOnce = true` trên bản sao tự tham chiếu
  // để tuyệt đối không sinh chuỗi tự sao chép vô hạn!
  const isUnactivatedSelfCopier =
    resolvedEffectiveRoleId === 'exp1_antimony' ||
    resolvedEffectiveRoleId === 'exp1_vengeful_spirit';

  const binding: CopiedSkillBinding = {
    ownerPlayerId: copier.playerId,
    baseRoleId: copier.roleId,
    effectiveSkillRoleId: resolvedEffectiveRoleId,
    sourcePlayerId: sourceVictim.playerId,
    sourceOriginalRoleId: sourceVictim.roleId,
    copyEventId,
    copiedAtMs: nowMs,
    copiedAtTurnNumber: state.turnNumber,
    copyDepth: nextDepth,
    provenanceChain: [copier.roleId, ...victimChain],
    bindingKind: 'copied-from-elimination',
    skillUsedOnce: isUnactivatedSelfCopier,
    skillCooldown: 0,
    resurrectionChargesUsed: 0,
  };

  state.expansionState.copiedSkillsByPlayer[copier.playerId] = binding;
  return { bound: true, binding };
}

/**
 * Gắn kỹ năng Chiêu Mộ (`exp2_nc_soldier`) cho thành viên vừa được N.C. Soldier chiêu mộ.
 * Giữ nguyên `baseRoleId` & `baseFaction` của thành viên.
 */
export function bindNcSoldierRecruitedSkill(
  state: AuthoritativeGameState,
  member: AuthoritativePlayerState,
  recruiter: AuthoritativePlayerState,
  eventId: string,
  nowMs: number,
): CopiedSkillBinding | null {
  if (!state.rulesetId || state.rulesetId === 'classic' || !state.expansionState) {
    return null;
  }
  if (!state.expansionState.copiedSkillsByPlayer) {
    state.expansionState.copiedSkillsByPlayer = {};
  }

  const binding: CopiedSkillBinding = {
    ownerPlayerId: member.playerId,
    baseRoleId: member.roleId,
    effectiveSkillRoleId: 'exp2_nc_soldier',
    sourcePlayerId: recruiter.playerId,
    sourceOriginalRoleId: recruiter.roleId,
    copyEventId: eventId,
    copiedAtMs: nowMs,
    copiedAtTurnNumber: state.turnNumber,
    copyDepth: 1,
    provenanceChain: [member.roleId, 'exp2_nc_soldier'],
    bindingKind: 'alliance-recruitment',
    skillUsedOnce: false,
    skillCooldown: 0,
  };

  state.expansionState.copiedSkillsByPlayer[member.playerId] = binding;
  return binding;
}
