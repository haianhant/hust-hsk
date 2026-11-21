// ---------------------------------------------------------------------------
// shared/contracts/boardgame.ts — Single Source of Truth cho Hợp đồng Mạng,
// Máy trạng thái Lobby/Trận đấu & DTO của "Bóng Đêm KTX v4 — Săn Bóng Đêm KTX".
// Không phụ thuộc React, Three.js hay DOM.
//
// Bảo mật P0:
// - Tuyệt đối KHÔNG định nghĩa hoặc truyền `mssv`, `reconnectTokenHash`, `hp`,
//   `maxHp`, vai chưa lật, bài trên tay hay `protegePlayerId` trong DTO công khai.
// - `getPublicGameView` và `getPrivateGameView` chia tách rõ kênh công khai
//   vs kênh unicast riêng cho `authenticatedPlayerId`.
// ---------------------------------------------------------------------------

import {
  extractValidAppearance,
  type RemoteAppearance,
} from './multiplayer';

export type BoardGameTableId = 'table-1' | 'table-2';

export type BoardGameMatchStatus =
  | 'CREATED'
  | 'WAITING'
  | 'READY_CHECK'
  | 'STARTING'
  | 'PLAYING'
  | 'FINISHED'
  | 'CLOSED';

export const BOARD_GAME_RULESET_VERSION = 4 as const;
export const BOARD_GAME_PROTOCOL_VERSION = 1 as const;
export const BOARD_GAME_CATALOG_VERSION = '2026.11-p7b' as const;

export type BoardGameProductionBetaRulesetId =
  | 'expansion-1'
  | 'expansion-2'
  | 'full-expansion';

export type BoardGameProductionRulesetId =
  | 'classic'
  | BoardGameProductionBetaRulesetId;

export type BoardGameExperimentalRulesetId =
  | 'starter-four'
  | 'starter-eight'
  | 'starter-sixteen'
  | 'starter-twenty-six'
  | 'starter-thirty-eight'
  | 'starter-forty-eight'
  | 'starter-fifty-six';

export type BoardGameRulesetId =
  | BoardGameProductionRulesetId
  | BoardGameExperimentalRulesetId;

export type BoardGameRulesetAvailability =
  | 'available'
  | 'beta'
  | 'coming-soon'
  | 'disabled'
  | 'experimental';

export type BoardGameRulesetReleaseStatus =
  | 'IMPLEMENTED'
  | 'INTERNAL_VALIDATED'
  | 'PRODUCTION_BETA_ENABLED'
  | 'PUBLIC_RELEASE_APPROVED';

export const BOARD_GAME_DEFAULT_RULESET_ID: BoardGameRulesetId = 'classic';

export const BOARD_GAME_PRODUCTION_BETA_ELIGIBLE_RULESETS: readonly BoardGameProductionBetaRulesetId[] =
  ['expansion-1', 'expansion-2', 'full-expansion'];

export const BOARD_GAME_VALID_RULESETS: readonly BoardGameProductionRulesetId[] = [
  'classic',
  ...BOARD_GAME_PRODUCTION_BETA_ELIGIBLE_RULESETS,
];

export interface BoardGameProductionBetaConfig {
  readonly enableProductionBetaExpansions: boolean;
  readonly betaAllowedRulesets: readonly BoardGameProductionBetaRulesetId[];
}

export interface BoardGameProductionBetaEnvInput {
  readonly ENABLE_PRODUCTION_BETA_EXPANSIONS?: string;
  readonly BETA_ALLOWED_RULESETS?: string;
}

export const DEFAULT_PRODUCTION_BETA_CONFIG: BoardGameProductionBetaConfig = {
  enableProductionBetaExpansions: false,
  betaAllowedRulesets: [],
};

export function isProductionBetaEligibleRulesetId(
  value: unknown,
): value is BoardGameProductionBetaRulesetId {
  return (
    typeof value === 'string' &&
    (BOARD_GAME_PRODUCTION_BETA_ELIGIBLE_RULESETS as readonly string[]).includes(value)
  );
}

/**
 * Phân tích cấu hình Production Beta phía server (mặc định TẮT tuyệt đối).
 * - Chỉ chấp nhận danh sách allowlist thuộc `expansion-1 | expansion-2 | full-expansion`.
 * - TUYỆT ĐỐI không bao giờ mở khóa các pool `starter-*` hoặc role pool tùy biến từ client.
 */
export function resolveProductionBetaConfigFromEnv(
  env?: BoardGameProductionBetaEnvInput | null,
): BoardGameProductionBetaConfig {
  const rawToggle = env?.ENABLE_PRODUCTION_BETA_EXPANSIONS?.trim().toLowerCase() ?? '';
  const enabled = rawToggle === '1' || rawToggle === 'true';
  if (!enabled) {
    return DEFAULT_PRODUCTION_BETA_CONFIG;
  }
  const rawList = env?.BETA_ALLOWED_RULESETS ?? '';
  const allowed: BoardGameProductionBetaRulesetId[] = [];
  for (const token of rawList.split(',')) {
    const clean = token.trim();
    if (isProductionBetaEligibleRulesetId(clean) && !allowed.includes(clean)) {
      allowed.push(clean);
    }
  }
  return {
    enableProductionBetaExpansions: allowed.length > 0,
    betaAllowedRulesets: allowed,
  };
}

export function isProductionBetaRulesetEnabled(
  rulesetId: string,
  betaConfig?: BoardGameProductionBetaConfig | null,
): boolean {
  if (!betaConfig?.enableProductionBetaExpansions) return false;
  if (!isProductionBetaEligibleRulesetId(rulesetId)) return false;
  return betaConfig.betaAllowedRulesets.includes(rulesetId);
}

export interface BoardGameServerRulesetCapability {
  readonly id: BoardGameProductionRulesetId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly expectedCharacterCount: number;
  readonly status: 'stable' | 'beta' | 'unavailable';
  readonly releaseStatus: BoardGameRulesetReleaseStatus;
  readonly selectable: boolean;
  readonly isBeta: boolean;
  readonly isDefault: boolean;
  readonly catalogVersion: string;
}

export interface BoardGameServerCapabilities {
  readonly defaultRulesetId: BoardGameProductionRulesetId;
  readonly catalogVersion: string;
  readonly rulesetVersion: number;
  readonly betaEnabled: boolean;
  readonly betaAllowedRulesets: readonly BoardGameProductionBetaRulesetId[];
  readonly rulesets: readonly BoardGameServerRulesetCapability[];
}

export const BOARD_GAME_EXPERIMENTAL_RULESETS: readonly BoardGameExperimentalRulesetId[] = [
  'starter-four',
  'starter-eight',
  'starter-sixteen',
  'starter-twenty-six',
  'starter-thirty-eight',
  'starter-forty-eight',
  'starter-fifty-six',
];

export const BOARD_GAME_ALL_RULESETS: readonly BoardGameRulesetId[] = [
  ...BOARD_GAME_VALID_RULESETS,
  ...BOARD_GAME_EXPERIMENTAL_RULESETS,
];

export const BOARD_GAME_MIN_PLAYERS = 4;
export const BOARD_GAME_MAX_PLAYERS = 8;
export const BOARD_GAME_TABLE_SEAT_COUNT = 8;
export const BOARD_GAME_MAX_SPECTATORS = 8;
export const BOARD_GAME_MAX_DIRECTORY_MATCHES = 16;
/** Mặc định 0 = thời gian suy nghĩ vô hạn khi người chơi đang online; chỉ tự kết thúc lượt nếu rớt mạng quá hạn. */
export const BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS = 0;
export const BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS = 12_000;
/** Thời hạn mặc định cho lựa chọn kỹ năng / phản ứng ngoài lượt (chống treo ván tuyệt đối). */
export const BOARD_GAME_CHOICE_TIMEOUT_MS = 12_000;
export const BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS = 2_500;
export const BOARD_GAME_RECONNECT_HOLD_MS = 90_000;
export const BOARD_GAME_ABANDONED_MATCH_TTL_MS = 5 * 60_000;
export const BOARD_GAME_FINISHED_TTL_MS = 10 * 60_000;

export const BOARD_GAME_VALID_LOCATIONS: readonly BoardGameLocationId[] = [
  'lobby',
  'canteen',
  'radio',
  'court',
  'corridor',
  'breaker',
];

export const BOARD_GAME_VALID_DECKS: readonly BoardGameDeckId[] = [
  'investigation',
  'equipment',
  'event',
];

/** Tập ký tự mã mời 6 ký tự dễ đọc, loại bỏ 0/O/1/I/L tránh nhầm lẫn. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

export type BoardGameFactionId = 'lantern-guard' | 'mist-order' | 'wanderer';

export type BoardGameWinnerFaction =
  | BoardGameFactionId
  | 'wanderer-solo'
  | 'wanderer'
  | 'multi-faction';

export type BoardGamePlayerLifecycleState =
  | 'ALIVE'
  | 'DORMANT_PENDING_REVIVE'
  | 'REVIVED'
  | 'FINAL_ELIMINATED';

export type ClassicBoardGameRoleId =
  | 'gac-ky-thuat'
  | 'gac-truc-ban'
  | 'gac-radio'
  | 'suong-an-danh'
  | 'suong-tin-gia'
  | 'suong-gac-cong'
  | 'lang-anh-san'
  | 'lang-quan-sat'
  | 'lang-cuu-ho'
  | 'lang-tien-phong';

export type Phase2ARoleId =
  | 'exp1_wendigo'
  | 'exp2_g43'
  | 'exp2_fiona'
  | 'exp2_wyvern';

export type Phase2BRoleId =
  | 'exp1_gayle'
  | 'exp1_felicia'
  | 'exp1_victor'
  | 'exp1_undying';

export type Phase2RoleId = Phase2ARoleId | Phase2BRoleId;

export type Phase3RoleId =
  | 'exp1_elysia'
  | 'exp2_unchained'
  | 'exp2_warlock'
  | 'exp2_witch'
  | 'exp2_father_harrison'
  | 'exp2_gloria'
  | 'exp1_cindy'
  | 'exp1_bipolar';

export type Phase4RoleId =
  | 'exp1_fallen'
  | 'exp1_fea'
  | 'exp2_eleanor'
  | 'exp2_fujiko'
  | 'exp1_udi'
  | 'exp1_wrath'
  | 'exp1_vengeance'
  | 'exp2_visions'
  | 'exp2_cruz'
  | 'exp2_bryon';

export type Phase5BRoleId =
  | 'exp2_elise'
  | 'exp2_umibozu'
  | 'exp2_urban_legend'
  | 'exp2_arlene';

export type Phase5CRoleId =
  | 'exp1_ernest'
  | 'exp1_gwendolen'
  | 'exp2_freyja'
  | 'exp2_warlord'
  | 'exp2_usurper'
  | 'exp1_angel'
  | 'exp2_bianca'
  | 'exp2_dalton';

export type Phase5RoleId = Phase5BRoleId | Phase5CRoleId;

export type Phase6RoleId =
  | 'exp2_gideon'
  | 'exp1_anathema'
  | 'exp1_bethany'
  | 'exp1_arnold'
  | 'exp1_cassie'
  | 'exp1_clairvoyant'
  | 'exp2_april_skipps'
  | 'exp2_colt'
  | 'exp2_diana'
  | 'exp2_aaron';

export type Phase7RoleId =
  | 'exp1_lloyd'
  | 'exp1_vengeful_spirit'
  | 'exp1_voodoo'
  | 'exp1_undead'
  | 'exp1_antimony'
  | 'exp2_cain'
  | 'exp2_bonnie'
  | 'exp2_nc_soldier';

export type BoardGameRoleId =
  | ClassicBoardGameRoleId
  | Phase2RoleId
  | Phase3RoleId
  | Phase4RoleId
  | Phase5RoleId
  | Phase6RoleId
  | Phase7RoleId;

export type BoardGameLocationId =
  | 'lobby'
  | 'canteen'
  | 'radio'
  | 'court'
  | 'corridor'
  | 'breaker';

export type BoardGameZoneClusterId = 'north' | 'central' | 'south';

export type BoardGameDeckId = 'investigation' | 'equipment' | 'event';

export type BoardGameTurnPhase =
  | 'ROLL_MOVE'
  | 'CHOOSE_MOVE'
  | 'LOCATION_ACTION'
  | 'MAIN_ACTION'
  | 'ENDED';

export type BoardGameReactionPolicy =
  | 'ASK'
  | 'AUTO_DECLINE'
  | 'AUTO_ACTIVATE_WHEN_ELIGIBLE';

export const BOARD_GAME_VALID_REACTION_POLICIES: readonly BoardGameReactionPolicy[] = [
  'ASK',
  'AUTO_DECLINE',
  'AUTO_ACTIVATE_WHEN_ELIGIBLE',
];

export type BoardGameEmoteId =
  | 'wave'
  | 'think'
  | 'suspect'
  | 'cheer'
  | 'sweat'
  | 'laugh';

export const VALID_BOARD_GAME_EMOTES: readonly BoardGameEmoteId[] = [
  'wave',
  'think',
  'suspect',
  'cheer',
  'sweat',
  'laugh',
];

export interface BoardGameCardPublicMeta {
  id: string;
  deck: BoardGameDeckId;
  title: string;
  summary: string;
  conditionText?: string;
  effectId: string;
  targetMode:
    | 'self'
    | 'single-player'
    | 'same-cluster'
    | 'other-cluster'
    | 'global'
    | 'location';
  isConsumable?: boolean;
  value: number;
}

export interface BoardGameDiceRollEvent {
  id: string;
  round: number;
  atMs: number;
  playerId: string;
  displayName: string;
  kind: 'move' | 'attack';
  d6: number;
  d4: number;
  total: number;
  rerollRequired: boolean;
  freeChoice: boolean;
  resolvedLocation: BoardGameLocationId | null;
  targetPlayerId?: string;
  damageDealt?: number;
  counterRoll?: {
    playerId: string;
    displayName: string;
    d6: number;
    d4: number;
    total: number;
    damageDealt: number;
  };
}

export interface BoardGameInvestigationOutcome {
  id: string;
  round: number;
  atMs: number;
  cardId: string;
  cardTitle: string;
  conditionLabel: string;
  investigatorId: string;
  investigatorName: string;
  targetPlayerId: string;
  targetName: string;
  outcome: 'condition-met' | 'no-reaction';
  publicMessage: string;
}

export interface BoardGameRevealEvent {
  id: string;
  round: number;
  atMs: number;
  playerId: string;
  displayName: string;
  roleId: BoardGameRoleId;
  roleName: string;
  faction: BoardGameFactionId;
  reason: 'voluntary' | 'eliminated';
}

export const BOARD_GAME_MAX_VISUAL_EVENTS = 48 as const;

export type BoardGameStructuredVisualEventKind =
  | 'ATTACK_DECLARED'
  | 'ATTACK_HIT'
  | 'ATTACK_MISSED'
  | 'ATTACK_CANCELLED'
  | 'DAMAGE_APPLIED'
  | 'DAMAGE_PREVENTED'
  | 'DAMAGE_REDIRECTED'
  | 'HEAL_APPLIED'
  | 'HEAL_BLOCKED'
  | 'EQUIPMENT_TRANSFERRED'
  | 'ROLE_REVEALED'
  | 'SKILL_ACTIVATED'
  | 'COPY_SKILL_APPLIED'
  | 'TURN_HIJACK_STARTED'
  | 'TURN_HIJACK_ENDED'
  | 'PLAYER_DORMANT'
  | 'PLAYER_REVIVED'
  | 'FACTION_CHANGED'
  | 'PLAYER_RECRUITED'
  | 'ELIMINATION'
  | 'MATCH_FINISHED';

/**
 * Sự kiện hình ảnh công khai có cấu trúc từ máy chủ (Phase 8C).
 * BẢO MẬT P0: CHỈ chứa dữ liệu công khai hợp pháp — tuyệt đối không chứa vai ẩn,
 * thẻ điều tra kín, hay gợi ý phản ứng bí mật bị từ chối.
 */
export interface BoardGameStructuredVisualEvent {
  readonly id: string;
  readonly seq: number;
  readonly matchId: string;
  readonly round: number;
  readonly turnNumber: number;
  readonly atMs: number;
  readonly kind: BoardGameStructuredVisualEventKind;
  readonly effectKey: string;
  readonly actorPlayerId: string | null;
  readonly targetPlayerIds: readonly string[];
  readonly visibility: 'public';
  readonly publicRoleId?: BoardGameRoleId | null;
  readonly publicFaction?: BoardGameFactionId | null;
  readonly publicCopiedRoleId?: BoardGameRoleId | null;
  readonly amount?: number;
  readonly isCritical?: boolean;
  readonly isMultiTarget?: boolean;
  readonly outcome?: 'success' | 'failed' | 'blocked' | 'cancelled';
  readonly winningFactions?: readonly BoardGameFactionId[];
  readonly cardCount?: number;
  readonly label?: string;
}

export interface BoardGamePrivateClueEntry {
  id: string;
  round: number;
  atMs: number;
  cardTitle: string;
  targetPlayerId: string;
  targetName: string;
  outcome: 'condition-met' | 'no-reaction';
  detail: string;
}

export interface BoardGameLobbyPlayerView {
  playerId: string;
  displayName: string;
  seatIndex: number | null;
  seatId: string | null;
  ready: boolean;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
  appearance: RemoteAppearance;
  lastSeenMs: number;
}

export interface BoardGameMatchSummary {
  matchId: string;
  inviteCode: string;
  tableId: BoardGameTableId;
  hostName: string;
  status: BoardGameMatchStatus;
  rulesetId?: BoardGameRulesetId;
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
  updatedAtMs: number;
}

export type BoardGameLeaderboardPeriod = 'weekly' | 'alltime';
export type BoardGameLeaderboardFactionFilter = 'all' | BoardGameFactionId;

export interface BoardGameLeaderboardEntry {
  rank: number;
  playerKey: string;
  displayName: string;
  appearance: RemoteAppearance;
  ratingPoints: number;
  wins: number;
  matchesPlayed: number;
  winRatePct: number;
  hunterWins: number;
  shadowWins: number;
  wandererWins: number;
  eliminationsDealt: number;
  survivalsTotal: number;
  currentWinStreak: number;
  bestWinStreak: number;
  lastRoleId: BoardGameRoleId | null;
  lastPlayedAtMs: number;
  isSelf?: boolean;
}

export interface BoardGameLeaderboardResponse {
  ok: true;
  period: BoardGameLeaderboardPeriod;
  faction: BoardGameLeaderboardFactionFilter;
  updatedAtMs: number;
  totalPlayers: number;
  entries: BoardGameLeaderboardEntry[];
  myEntry: BoardGameLeaderboardEntry | null;
}

export interface BoardGameClusterPair {
  clusterId: BoardGameZoneClusterId;
  locationIds: readonly [BoardGameLocationId, BoardGameLocationId];
}

export interface BoardGamePublicPlayerView {
  playerId: string;
  displayName: string;
  seatIndex: number;
  location: BoardGameLocationId;
  /** Thang thương tích công khai (0..14); HP tối đa giữ bí mật đến khi lật vai. */
  woundsTaken: number;
  handCount: number;
  equipped: readonly BoardGameCardPublicMeta[];
  attacksMade: number;
  attacksThisTurn: number;
  lastAttackTargetId?: string | null;
  investigationsCount: number;
  /** Trạng thái khiên che chắn 1 vòng sau khi Trang lật vai/kích hoạt bảo vệ. */
  guardianShieldActive: boolean;
  alive: boolean;
  connected: boolean;
  // BẢO MẬT P0: Chỉ hiện vai, phe, maxHp & trạng thái kỹ năng khi đã lật vai công khai hoặc FINISHED!
  revealedRoleId: BoardGameRoleId | null;
  revealedFaction: BoardGameFactionId | null;
  revealedMaxHp: number | null;
  revealedSkillCooldown: number;
  revealedSkillUsedOnce: boolean;
  /** Phase 7A: Trạng thái vòng đời mở rộng (CHỈ xuất khi ở chế độ mở rộng và không phải ALIVE mặc định). */
  lifecycleState?: BoardGamePlayerLifecycleState;
  /** Phase 7A: Phe hiệu lực động khi khác phe gốc (CHỈ xuất khi đã lộ diện hoặc FINISHED — vd. Bonnie). */
  effectiveFaction?: BoardGameFactionId;
  /** Phase 7A: Mã kỹ năng hiệu lực đang sao chép/chiêu mộ (CHỈ xuất khi đã lộ diện hoặc FINISHED). */
  copiedSkillRoleId?: string | null;
  /** Phase 7A: Mã liên minh công khai (CHỈ xuất khi đã lộ diện hoặc FINISHED — vd. N.C. Soldier). */
  allianceId?: string | null;
  appearance: RemoteAppearance;
}

export interface BoardGamePublicLogEntry {
  id: string;
  round: number;
  atMs: number;
  kind:
    | 'system'
    | 'dice'
    | 'move'
    | 'draw'
    | 'investigate'
    | 'equipment'
    | 'event'
    | 'steal'
    | 'skill'
    | 'attack'
    | 'reveal'
    | 'elimination'
    | 'timeout'
    | 'victory';
  text: string;
  actorId?: string | null;
}

export interface BoardGameHighlightEntry {
  round: number;
  title: string;
  detail: string;
  atMs: number;
}

export interface BoardGameRevealRecord {
  playerId: string;
  displayName: string;
  roleId: BoardGameRoleId;
  roleName: string;
  faction: BoardGameFactionId;
  /** Phase 7A: Phe hiệu lực cuối trận (khi khác phe gốc, vd. Bonnie -> Shadow). */
  effectiveFaction?: BoardGameFactionId;
  /** Phase 7A: Mã kỹ năng hiệu lực cuối trận nếu đã sao chép hoặc chiêu mộ. */
  copiedSkillRoleId?: string | null;
  /** Phase 7A: Mã liên minh cuối trận nếu tham gia liên minh N.C. Soldier. */
  allianceId?: string | null;
  won: boolean;
  alive: boolean;
  hp: number;
  maxHp: number;
  woundsTaken: number;
}

export type BoardGamePendingChoiceKind =
  | 'fiona_attack_roll'
  | 'wendigo_reveal_heal'
  | 'gayle_attack_reroll'
  | 'felicia_draw_choice'
  | 'victor_blood_boost'
  | 'undying_reveal_reduce'
  | 'elysia_counter_boost'
  | 'cindy_reveal_retaliate'
  | 'bipolar_fate_coin'
  | 'fea_move_adjust'
  | 'wrath_turn_start_aoe'
  | 'vengeance_chain_strike'
  | 'visions_mark_target'
  | 'cruz_black_redraw'
  | 'bryon_gift_equipment'
  | 'elise_distribute_heal'
  | 'urban_legend_reveal_heal'
  | 'gwendolen_counter_attack'
  | 'freyja_extra_attack'
  | 'warlord_pull_attack'
  | 'usurper_reveal_block_heal'
  | 'bianca_discard_prevent'
  | 'gideon_draw_white'
  | 'gideon_white_card_target'
  | 'anathema_curse_target'
  | 'bethany_designate_chosen'
  | 'arnold_reflect_lethal'
  | 'cassie_turn_heal'
  | 'clairvoyant_peek_copy'
  | 'colt_theft_counter'
  | 'colt_recover_or_damage'
  | 'lloyd_interrupt_attack'
  | 'vengeful_spirit_copy_skill'
  | 'voodoo_select_puppet';

export interface BoardGameChoiceOptionView {
  optionId: string;
  label: string;
  detail?: string;
  card?: BoardGameCardPublicMeta;
  roll?: {
    d6: number;
    d4: number;
    baseDmg: number;
    totalDmg: number;
    hasMasamune: boolean;
  };
  targetPlayerId?: string;
}

/**
 * Thông tin công khai của Pending Choice.
 * BẢO MẬT P0: Khi `isSecret === true` (vd. Wendigo / Undying chưa lộ vai),
 * `ownerPlayerId` và `kind` BẮT BUỘC bằng `null` để tuyệt đối không rò rỉ danh tính ẩn!
 */
export interface BoardGamePublicPendingChoice {
  choiceId: string;
  isSecret: boolean;
  ownerPlayerId: string | null;
  kind: BoardGamePendingChoiceKind | null;
  promptLabel: string;
  deadlineMs: number;
}

export interface BoardGamePrivatePendingChoice {
  choiceId: string;
  kind: BoardGamePendingChoiceKind;
  title: string;
  description: string;
  options: readonly BoardGameChoiceOptionView[];
  defaultOptionId: string;
  deadlineMs: number;
  isSecret: boolean;
}

export interface BoardGamePublicControlledTurnView {
  readonly controlGrantId: string;
  readonly activePlayerId: string;
  readonly controllerPlayerId: string;
  readonly pausedForOwnerDecision: boolean;
  /** CHỈ chứa các lá Trắng/Đen công khai rút trong lượt điều khiển; TUYỆT ĐỐI không chứa lá Điều tra (inv-*). */
  readonly publicDrawnCards: readonly BoardGameCardPublicMeta[];
}

export interface BoardGamePublicAllianceView {
  readonly allianceId: string;
  readonly leaderPlayerId: string;
  readonly memberPlayerIds: readonly string[];
}

export interface BoardGamePublicGameView {
  rulesetVersion: 4;
  rulesetId?: BoardGameRulesetId;
  catalogVersion?: string;
  matchId: string;
  round: number;
  maxRounds: number;
  turnNumber: number;
  turnPhase: BoardGameTurnPhase;
  activePlayerId: string | null;
  turnOrder: readonly string[];
  clusterPairs: readonly BoardGameClusterPair[];
  allowedMoveDestinations?: readonly BoardGameLocationId[];
  pendingChoice?: BoardGamePublicPendingChoice | null;
  /** Dấu ấn Visions công khai (CHỈ xuất cho Visions đã lộ vai & mục tiêu còn sống — zero hidden role leak). */
  visionsMarkedTargetByPlayer?: Readonly<Record<string, string>>;
  /** Danh sách playerId Neutral đang được hào quang Angel đã lộ diện bảo vệ (zero hidden role leak). */
  angelProtectedPlayerIds?: readonly string[];
  /** True khi có ít nhất 1 Usurper đã lộ diện còn sống kích hoạt hào quang cấm hồi máu. */
  usurperAuraActive?: boolean;
  /** Danh sách playerId Dalton đã lộ diện & kích hoạt Vòng Đấu Thứ 12 (cấm tự hồi máu). */
  daltonActivatedPlayerIds?: readonly string[];
  /** Mục tiêu lời nguyền Anathema công khai (CHỈ xuất khi Anathema đã lộ diện & mục tiêu còn sống). */
  anathemaCursedTargetByPlayer?: Readonly<Record<string, string>>;
  /** Người được chọn công khai của Bethany (CHỈ xuất khi Bethany đã lộ diện). */
  bethanyChosenTargetByPlayer?: Readonly<Record<string, string>>;
  /** Khách hàng ĐANG HOẠT ĐỘNG của Diana (CHỈ xuất khi Diana đã lộ diện & hợp đồng đã kích hoạt; KHÔNG lộ trạng thái chờ). */
  dianaActiveCustomerByPlayer?: Readonly<Record<string, string>>;
  /** Người vợ công khai của Aaron (CHỈ xuất khi Aaron đã lộ diện & đã gắn kết). */
  aaronSpouseByPlayer?: Readonly<Record<string, string>>;
  /** Đếm ngược sống sót của April & Skipps (CHỈ xuất sau khi bị ép lộ vai ở ô 7). */
  aprilSkippsCountdownByPlayer?: Readonly<Record<string, number>>;
  /** Phase 7A: Chỉ báo lượt đang bị chiếm quyền điều khiển (Voodoo — tuyệt đối không lộ thông tin bí mật). */
  controlledTurn?: BoardGamePublicControlledTurnView | null;
  /** Phase 7A: Danh sách playerId đã lộ diện và kích hoạt điều kiện thắng song phe của Cain. */
  cainDeathModifierActivePlayerIds?: readonly string[];
  /** Phase 7A: Các nhóm liên minh công khai (CHỈ gồm thành viên đã lộ diện — zero hidden role leak). */
  alliances?: readonly BoardGamePublicAllianceView[];
  deadCount: number;
  players: readonly BoardGamePublicPlayerView[];
  deckCounts: Record<BoardGameDeckId, number>;
  lastDiceRoll: BoardGameDiceRollEvent | null;
  lastInvestigation: BoardGameInvestigationOutcome | null;
  lastRevealEvent: BoardGameRevealEvent | null;
  /** Phase 8C: Hàng đợi sự kiện hình ảnh công khai có cấu trúc (tùy chọn để tương thích ngược client cũ). */
  visualEvents?: readonly BoardGameStructuredVisualEvent[];
  publicLog: readonly BoardGamePublicLogEntry[];
  highlights: readonly BoardGameHighlightEntry[];
  winnerLabel: string | null;
  winnerFaction: BoardGameWinnerFaction | null;
  /** Phase 7A: Danh sách đầy đủ các phe đồng thắng (hỗ trợ MultiFactionVictory song phe Hunter + Shadow). */
  winningFactions?: readonly BoardGameFactionId[];
  winnerPlayerIds: readonly string[];
  winReason: string | null;
  /** Chỉ điền đầy đủ sau khi trận đấu kết thúc (`FINISHED`). */
  finalReveal: readonly BoardGameRevealRecord[] | null;
}

export interface BoardGameClairvoyantRevealView {
  readonly targetPlayerId: string;
  readonly targetDisplayName: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly faction: BoardGameFactionId;
  readonly maxHp: number;
  readonly copiedGoalSummary: string;
  readonly atMs: number;
}

export interface BoardGamePrivateGameView {
  playerId: string;
  roleId: BoardGameRoleId;
  roleName: string;
  faction: BoardGameFactionId;
  hp: number;
  maxHp: number;
  woundsTaken: number;
  skillCooldown: number;
  skillUsedOnce: boolean;
  revealed: boolean;
  secretGoalText: string;
  protegePlayerId: string | null;
  protegeDisplayName: string | null;
  avengedProtegeKiller: boolean;
  investigatedTargetIds: readonly string[];
  hand: readonly BoardGameCardPublicMeta[];
  equipped: readonly BoardGameCardPublicMeta[];
  privateClues: readonly BoardGamePrivateClueEntry[];
  /** Chính sách phản ứng riêng tư trên server (CHỈ gửi unicast cho chủ sở hữu, tuyệt đối không xuất công khai). */
  reactionPolicy?: BoardGameReactionPolicy;
  /** Kết quả soi vai bí mật của Clairvoyant (BẢO MẬT P0: CHỈ gửi unicast cho chủ sở hữu Clairvoyant!). */
  clairvoyantReveals?: readonly BoardGameClairvoyantRevealView[];
  /** Tóm tắt mục tiêu chiến thắng đang sao chép/gắn kết của riêng chủ sở hữu (Cassie / Clairvoyant / Diana / Antimony). */
  copiedVictoryGoalSummary?: string | null;
  /** Phase 7A: Phe hiệu lực động của chính chủ sở hữu (mở rộng). */
  effectiveFaction?: BoardGameFactionId;
  /** Phase 7A: Trạng thái vòng đời hồi sinh của chính chủ sở hữu (mở rộng). */
  lifecycleState?: BoardGamePlayerLifecycleState;
  /** Phase 7A: Mã kỹ năng hiệu lực đang sao chép/chiêu mộ của chính chủ sở hữu. */
  copiedSkillRoleId?: string | null;
  /** Phase 7A: Mã liên minh hiện tại của chính chủ sở hữu (N.C. Soldier). */
  allianceId?: string | null;
  /** Phase 7A: True khi chính bạn đang là controller tạm thời điều khiển lượt của người khác (Voodoo). */
  isControllingActiveTurn?: boolean;
  /** Phase 7A: True khi lượt hiện tại của bạn đang bị người khác chiếm quyền (Voodoo). */
  isTurnHijacked?: boolean;
  pendingChoice?: BoardGamePrivatePendingChoice | null;
}

export type BoardGameActionPayload =
  | { type: 'ROLL_DICE' }
  | { type: 'CHOOSE_DEST'; location: BoardGameLocationId }
  | { type: 'DRAW_CARD'; deck: BoardGameDeckId }
  | {
      type: 'USE_LOC_POWER';
      targetPlayerId?: string;
      mode?: 'heal' | 'damage' | 'steal';
      equipCardId?: string;
    }
  | { type: 'SKIP_LOC' }
  | { type: 'EQUIP_CARD'; cardId: string }
  | {
      type: 'USE_CARD';
      cardId: string;
      targetPlayerId?: string;
      targetLocation?: BoardGameLocationId;
      equipCardId?: string;
      skipEffect?: boolean;
    }
  | { type: 'INVESTIGATE_CARD'; cardId: string; targetPlayerId: string }
  | { type: 'ATTACK'; targetPlayerId: string }
  | { type: 'REVEAL_ROLE' }
  | {
      type: 'USE_SKILL';
      targetPlayerId?: string;
      targetLocation?: BoardGameLocationId;
    }
  | {
      type: 'RESOLVE_CHOICE';
      choiceId: string;
      optionId: string;
    }
  | {
      type: 'SET_REACTION_PREF';
      policy: BoardGameReactionPolicy;
    }
  | {
      type: 'TRANSFER_TO_BETHANY';
      targetPlayerId: string;
      cardId: string;
    }
  | { type: 'END_TURN' };

export interface BoardGameStateSyncMessage {
  type: 'BG_STATE_SYNC';
  protocolVersion?: number;
  matchId: string;
  inviteCode: string;
  tableId: BoardGameTableId;
  status: BoardGameMatchStatus;
  rulesetId?: BoardGameRulesetId;
  catalogVersion?: string;
  betaEnabled?: boolean;
  availableRulesets?: readonly BoardGameServerRulesetCapability[];
  revision: number;
  hostPlayerId: string;
  players: readonly BoardGameLobbyPlayerView[];
  spectatorCount: number;
  turnDeadlineMs: number | null;
  publicGame: BoardGamePublicGameView | null;
  privateView: BoardGamePrivateGameView | null;
}

export interface BoardGameAuthIssuedMessage {
  type: 'BG_AUTH_ISSUED';
  protocolVersion?: number;
  matchId: string;
  inviteCode: string;
  playerId: string;
  reconnectToken: string;
  isSpectator: boolean;
  seatIndex: number | null;
}

export interface BoardGameActionAckMessage {
  type: 'BG_ACTION_ACK';
  requestId: string;
  ok: boolean;
  revision: number;
  reason?: string;
}

export interface BoardGameErrorMessage {
  type: 'BG_ERROR';
  code:
    | 'UNAUTHORIZED'
    | 'INVALID_INVITE'
    | 'ROOM_FULL'
    | 'SEAT_TAKEN'
    | 'NOT_HOST'
    | 'NOT_READY'
    | 'SPECTATOR_READ_ONLY'
    | 'STALE_REVISION'
    | 'INVALID_ACTION'
    | 'INVALID_RULESET'
    | 'RULESET_UNAVAILABLE'
    | 'NOT_YOUR_TURN'
    | 'RATE_LIMITED'
    | 'MATCH_NOT_FOUND';
  message: string;
  requestId?: string;
  revision?: number;
}

export interface BoardGameChatEmoteServerMessage {
  type: 'BG_CHAT_EMOTE';
  playerId: string;
  displayName: string;
  emote?: BoardGameEmoteId;
  text?: string;
  atMs: number;
}

export interface BoardGamePongMessage {
  type: 'BG_PONG';
  serverTimeMs: number;
  clientTimeMs?: number;
}

export type BoardGameServerMessage =
  | BoardGameAuthIssuedMessage
  | BoardGameStateSyncMessage
  | BoardGameActionAckMessage
  | BoardGameErrorMessage
  | BoardGameChatEmoteServerMessage
  | BoardGamePongMessage;

export interface BoardGameClientJoinMessage {
  type: 'BG_JOIN';
  matchId: string;
  inviteCode?: string;
  displayName: string;
  playerKey?: string;
  appearance?: RemoteAppearance;
  asSpectator?: boolean;
  preferredSeatIndex?: number | null;
  reconnectToken?: string;
  requestId?: string;
}

export interface BoardGameClientSelectSeatMessage {
  type: 'BG_SELECT_SEAT';
  seatIndex: number;
  requestId?: string;
}

export interface BoardGameClientStandUpMessage {
  type: 'BG_STAND_UP';
  requestId?: string;
}

export interface BoardGameClientSetReadyMessage {
  type: 'BG_SET_READY';
  ready: boolean;
  requestId?: string;
}

export interface BoardGameClientSetRulesetMessage {
  type: 'BG_SET_RULESET';
  rulesetId: BoardGameRulesetId;
  requestId?: string;
}

export interface BoardGameClientStartMatchMessage {
  type: 'BG_START_MATCH';
  requestId?: string;
  turnTimeoutMs?: number;
  rulesetId?: BoardGameRulesetId;
}

export interface BoardGameClientGameActionMessage {
  type: 'BG_GAME_ACTION';
  requestId: string;
  expectedRevision: number;
  action: BoardGameActionPayload;
}

export interface BoardGameClientLeaveMessage {
  type: 'BG_LEAVE';
  requestId?: string;
}

export interface BoardGameClientChatEmoteMessage {
  type: 'BG_CHAT_EMOTE';
  emote?: BoardGameEmoteId;
  text?: string;
  requestId?: string;
}

export interface BoardGameClientPingMessage {
  type: 'BG_PING';
  clientTimeMs?: number;
}

export interface BoardGameClientRequestSyncMessage {
  type: 'BG_REQUEST_SYNC';
  requestId?: string;
}

export interface BoardGameClientDirectoryRefreshMessage {
  type: 'BG_DIRECTORY_REFRESH';
}

export type BoardGameClientMessage =
  | BoardGameClientJoinMessage
  | BoardGameClientSelectSeatMessage
  | BoardGameClientStandUpMessage
  | BoardGameClientSetReadyMessage
  | BoardGameClientSetRulesetMessage
  | BoardGameClientStartMatchMessage
  | BoardGameClientGameActionMessage
  | BoardGameClientLeaveMessage
  | BoardGameClientChatEmoteMessage
  | BoardGameClientPingMessage
  | BoardGameClientRequestSyncMessage
  | BoardGameClientDirectoryRefreshMessage;

// ---------------------------------------------------------------------------
// Chuyển trạng thái Lobby / Match hợp lệ
// ---------------------------------------------------------------------------

const ALLOWED_STATUS_TRANSITIONS: Record<BoardGameMatchStatus, readonly BoardGameMatchStatus[]> = {
  CREATED: ['WAITING', 'CLOSED'],
  WAITING: ['READY_CHECK', 'STARTING', 'CLOSED'],
  READY_CHECK: ['WAITING', 'STARTING', 'CLOSED'],
  STARTING: ['PLAYING', 'WAITING', 'CLOSED'],
  PLAYING: ['FINISHED', 'CLOSED'],
  FINISHED: ['WAITING', 'CLOSED'],
  CLOSED: [],
};

export function canTransitionBoardGameStatus(
  from: BoardGameMatchStatus,
  to: BoardGameMatchStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Mapping Ghế 3D <-> Chỉ số ghế bàn (0..7)
// ---------------------------------------------------------------------------

export function seatIndexToSeatId(tableId: BoardGameTableId, seatIndex: number): string {
  const prefix = tableId === 'table-1' ? 'bg-t1' : 'bg-t2';
  return `${prefix}-s${Math.max(0, Math.min(BOARD_GAME_TABLE_SEAT_COUNT - 1, Math.floor(seatIndex)))}`;
}

export function seatIdToTableAndIndex(
  seatId: string | null | undefined,
): { tableId: BoardGameTableId; seatIndex: number } | null {
  if (typeof seatId !== 'string') return null;
  const m = /^bg-(t1|t2)-s([0-7])$/.exec(seatId.trim());
  if (!m) return null;
  return {
    tableId: m[1] === 't1' ? 'table-1' : 'table-2',
    seatIndex: Number(m[2]),
  };
}

// ---------------------------------------------------------------------------
// Sanitizers chuẩn hóa đầu vào (Zero MSSV / XSS / Control-Char Safe)
// ---------------------------------------------------------------------------

export function sanitizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!INVITE_CODE_RE.test(cleaned)) return null;
  return cleaned;
}

export function isValidInviteCode(raw: unknown): raw is string {
  return sanitizeInviteCode(raw) !== null;
}

export function generateInviteCode(randomByteFn?: () => number): string {
  let out = '';
  const alphabetLen = INVITE_CODE_ALPHABET.length;
  if (randomByteFn) {
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      const r = Math.abs(Math.floor(randomByteFn()));
      out += INVITE_CODE_ALPHABET[r % alphabetLen];
    }
    return out;
  }
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('CSPRNG globalThis.crypto.getRandomValues is required to generate invite codes.');
  }
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  cryptoApi.getRandomValues(bytes);
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    out += INVITE_CODE_ALPHABET[bytes[i] % alphabetLen];
  }
  return out;
}

export function sanitizeBoardGameName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Sinh viên';
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F<>`]/g, '')
    .replace(/\b\d{8}\b/g, 'HUST')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
  return cleaned.length > 0 ? cleaned : 'Sinh viên';
}

export function sanitizeBoardGameTableId(raw: unknown): BoardGameTableId {
  return raw === 'table-2' ? 'table-2' : 'table-1';
}

export function isValidBoardGameRulesetId(raw: unknown): raw is BoardGameRulesetId {
  return (
    typeof raw === 'string' &&
    (BOARD_GAME_ALL_RULESETS as readonly string[]).includes(raw)
  );
}

export function sanitizeBoardGameRulesetId(raw: unknown): BoardGameRulesetId {
  return isValidBoardGameRulesetId(raw) ? raw : BOARD_GAME_DEFAULT_RULESET_ID;
}

export function sanitizeBoardGameMatchId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (clean.length < 4 || clean.length > 48) return null;
  return clean;
}

export function sanitizeBoardGamePlayerId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (clean.length < 4 || clean.length > 48) return null;
  return clean;
}

export function sanitizeBoardGameRequestId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/[^a-zA-Z0-9_.:-]/g, '');
  if (clean.length < 2 || clean.length > 64) return null;
  return clean;
}

export function sanitizeBoardGameSeatIndex(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
  if (raw < 0 || raw >= BOARD_GAME_TABLE_SEAT_COUNT) return null;
  return raw;
}

export function sanitizeBoardGameChatText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw
    .replace(/[\u0000-\u001F\u007F<>`]/g, '')
    .replace(/\b\d{8}\b/g, '***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  return clean.length > 0 ? clean : null;
}

export function isValidBoardGameEmote(raw: unknown): raw is BoardGameEmoteId {
  return typeof raw === 'string' && (VALID_BOARD_GAME_EMOTES as readonly string[]).includes(raw);
}

export function isValidBoardGameReactionPolicy(raw: unknown): raw is BoardGameReactionPolicy {
  return (
    typeof raw === 'string' &&
    (BOARD_GAME_VALID_REACTION_POLICIES as readonly string[]).includes(raw)
  );
}

export function sanitizeBoardGameToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim();
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(clean)) return null;
  return clean;
}

export function sanitizeBoardGameAppearance(raw: unknown): RemoteAppearance {
  if (!raw || typeof raw !== 'object') return {};
  return extractValidAppearance(raw as Record<string, unknown>) ?? {};
}

export function sanitizeBoardGamePlayerKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim();
  if (!/^bgk_[A-Za-z0-9_-]{8,36}$/.test(clean)) return null;
  return clean;
}

export function isValidBoardGameLeaderboardPeriod(
  raw: unknown,
): raw is BoardGameLeaderboardPeriod {
  return raw === 'weekly' || raw === 'alltime';
}

export function isValidBoardGameLeaderboardFactionFilter(
  raw: unknown,
): raw is BoardGameLeaderboardFactionFilter {
  return (
    raw === 'all' ||
    raw === 'lantern-guard' ||
    raw === 'mist-order' ||
    raw === 'wanderer'
  );
}

// ---------------------------------------------------------------------------
// Strict Runtime Schema Validators (Zero-Dependency, Anti-Prototype-Pollution)
// ---------------------------------------------------------------------------

const FORBIDDEN_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RESERVED_SYMBOL_IDS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
]);

const VALID_LOCATION_SET = new Set<string>(BOARD_GAME_VALID_LOCATIONS);
const VALID_DECK_SET = new Set<string>(BOARD_GAME_VALID_DECKS);
const STRICT_PLAYER_ID_RE = /^[A-Za-z0-9_-]{2,48}$/;
const STRICT_CARD_ID_RE = /^(?:inv|eq|ev)-[0-9]{2}$/;
const STRICT_MATCH_ID_RE = /^[A-Za-z0-9_-]{4,48}$/;
const STRICT_REQUEST_ID_RE = /^[A-Za-z0-9_.:-]{2,64}$/;
const STRICT_CHOICE_ID_RE = /^[A-Za-z0-9_.:-]{2,64}$/;
const STRICT_OPTION_ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

export function isSafePlainObject(raw: unknown): raw is Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return false;
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) return false;
  const ownNames = Object.getOwnPropertyNames(raw);
  for (let i = 0; i < ownNames.length; i++) {
    if (FORBIDDEN_PROTO_KEYS.has(ownNames[i])) return false;
  }
  return true;
}

function hasOnlyAllowedKeys(
  obj: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
): boolean {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    if (!allowedKeys.has(keys[i])) return false;
  }
  return true;
}

export function isValidBoardGamePlayerIdSyntax(raw: unknown): raw is string {
  return (
    typeof raw === 'string' &&
    STRICT_PLAYER_ID_RE.test(raw) &&
    !RESERVED_SYMBOL_IDS.has(raw)
  );
}

export function isValidBoardGameCardIdSyntax(raw: unknown): raw is string {
  return (
    typeof raw === 'string' &&
    STRICT_CARD_ID_RE.test(raw) &&
    !RESERVED_SYMBOL_IDS.has(raw)
  );
}

export function isValidBoardGameMatchIdSyntax(raw: unknown): raw is string {
  return (
    typeof raw === 'string' &&
    STRICT_MATCH_ID_RE.test(raw) &&
    !RESERVED_SYMBOL_IDS.has(raw)
  );
}

export function isValidBoardGameRequestIdSyntax(raw: unknown): raw is string {
  return (
    typeof raw === 'string' &&
    STRICT_REQUEST_ID_RE.test(raw) &&
    !RESERVED_SYMBOL_IDS.has(raw)
  );
}

export function isValidContractLocationId(raw: unknown): raw is BoardGameLocationId {
  return typeof raw === 'string' && VALID_LOCATION_SET.has(raw);
}

export function isValidContractDeckId(raw: unknown): raw is BoardGameDeckId {
  return typeof raw === 'string' && VALID_DECK_SET.has(raw);
}

const ACTION_ALLOWED_KEYS: Record<BoardGameActionPayload['type'], ReadonlySet<string>> = {
  ROLL_DICE: new Set(['type']),
  CHOOSE_DEST: new Set(['type', 'location']),
  DRAW_CARD: new Set(['type', 'deck']),
  USE_LOC_POWER: new Set(['type', 'targetPlayerId', 'mode', 'equipCardId']),
  SKIP_LOC: new Set(['type']),
  EQUIP_CARD: new Set(['type', 'cardId']),
  USE_CARD: new Set(['type', 'cardId', 'targetPlayerId', 'targetLocation', 'equipCardId', 'skipEffect']),
  INVESTIGATE_CARD: new Set(['type', 'cardId', 'targetPlayerId']),
  ATTACK: new Set(['type', 'targetPlayerId']),
  REVEAL_ROLE: new Set(['type']),
  USE_SKILL: new Set(['type', 'targetPlayerId', 'targetLocation']),
  RESOLVE_CHOICE: new Set(['type', 'choiceId', 'optionId']),
  SET_REACTION_PREF: new Set(['type', 'policy']),
  TRANSFER_TO_BETHANY: new Set(['type', 'targetPlayerId', 'cardId']),
  END_TURN: new Set(['type']),
};

const VALID_LOC_POWER_MODES = new Set(['heal', 'damage', 'steal']);

export function validateBoardGameActionPayload(
  raw: unknown,
): { ok: true; action: BoardGameActionPayload } | { ok: false; error: string } {
  if (!isSafePlainObject(raw)) {
    return { ok: false, error: 'Cấu trúc hành động không hợp lệ.' };
  }
  const actionType = raw.type;
  if (typeof actionType !== 'string' || !Object.hasOwn(ACTION_ALLOWED_KEYS, actionType)) {
    return { ok: false, error: 'Loại hành động không được hỗ trợ.' };
  }
  const allowedKeys = ACTION_ALLOWED_KEYS[actionType as BoardGameActionPayload['type']];
  if (!hasOnlyAllowedKeys(raw, allowedKeys)) {
    return { ok: false, error: 'Gói hành động chứa trường dữ liệu không hợp lệ.' };
  }

  switch (actionType as BoardGameActionPayload['type']) {
    case 'ROLL_DICE':
      return { ok: true, action: { type: 'ROLL_DICE' } };
    case 'CHOOSE_DEST': {
      if (!isValidContractLocationId(raw.location)) {
        return { ok: false, error: 'Khu vực điểm đến không hợp lệ.' };
      }
      return { ok: true, action: { type: 'CHOOSE_DEST', location: raw.location } };
    }
    case 'DRAW_CARD': {
      if (!isValidContractDeckId(raw.deck)) {
        return { ok: false, error: 'Bộ bài rút không hợp lệ.' };
      }
      return { ok: true, action: { type: 'DRAW_CARD', deck: raw.deck } };
    }
    case 'USE_LOC_POWER': {
      if (raw.targetPlayerId !== undefined && !isValidBoardGamePlayerIdSyntax(raw.targetPlayerId)) {
        return { ok: false, error: 'Mục tiêu quyền năng khu vực không hợp lệ.' };
      }
      if (
        raw.mode !== undefined &&
        (typeof raw.mode !== 'string' || !VALID_LOC_POWER_MODES.has(raw.mode))
      ) {
        return { ok: false, error: 'Chế độ quyền năng khu vực không hợp lệ.' };
      }
      if (raw.equipCardId !== undefined && !isValidBoardGameCardIdSyntax(raw.equipCardId)) {
        return { ok: false, error: 'Mã trang bị mục tiêu không hợp lệ.' };
      }
      return {
        ok: true,
        action: {
          type: 'USE_LOC_POWER',
          ...(raw.targetPlayerId !== undefined ? { targetPlayerId: raw.targetPlayerId } : {}),
          ...(raw.mode !== undefined ? { mode: raw.mode as 'heal' | 'damage' | 'steal' } : {}),
          ...(raw.equipCardId !== undefined ? { equipCardId: raw.equipCardId } : {}),
        },
      };
    }
    case 'SKIP_LOC':
      return { ok: true, action: { type: 'SKIP_LOC' } };
    case 'EQUIP_CARD': {
      if (!isValidBoardGameCardIdSyntax(raw.cardId)) {
        return { ok: false, error: 'Mã thẻ trang bị không hợp lệ.' };
      }
      return { ok: true, action: { type: 'EQUIP_CARD', cardId: raw.cardId } };
    }
    case 'USE_CARD': {
      if (!isValidBoardGameCardIdSyntax(raw.cardId)) {
        return { ok: false, error: 'Mã thẻ bài không hợp lệ.' };
      }
      if (raw.targetPlayerId !== undefined && !isValidBoardGamePlayerIdSyntax(raw.targetPlayerId)) {
        return { ok: false, error: 'Mục tiêu thẻ bài không hợp lệ.' };
      }
      if (raw.targetLocation !== undefined && !isValidContractLocationId(raw.targetLocation)) {
        return { ok: false, error: 'Khu vực mục tiêu của thẻ bài không hợp lệ.' };
      }
      if (raw.equipCardId !== undefined && !isValidBoardGameCardIdSyntax(raw.equipCardId)) {
        return { ok: false, error: 'Mã trang bị trong thẻ bài không hợp lệ.' };
      }
      if (raw.skipEffect !== undefined && typeof raw.skipEffect !== 'boolean') {
        return { ok: false, error: 'Tham số skipEffect phải là boolean.' };
      }
      return {
        ok: true,
        action: {
          type: 'USE_CARD',
          cardId: raw.cardId,
          ...(raw.targetPlayerId !== undefined ? { targetPlayerId: raw.targetPlayerId } : {}),
          ...(raw.targetLocation !== undefined ? { targetLocation: raw.targetLocation } : {}),
          ...(raw.equipCardId !== undefined ? { equipCardId: raw.equipCardId } : {}),
          ...(raw.skipEffect !== undefined ? { skipEffect: raw.skipEffect } : {}),
        },
      };
    }
    case 'INVESTIGATE_CARD': {
      if (!isValidBoardGameCardIdSyntax(raw.cardId)) {
        return { ok: false, error: 'Mã thẻ điều tra không hợp lệ.' };
      }
      if (!isValidBoardGamePlayerIdSyntax(raw.targetPlayerId)) {
        return { ok: false, error: 'Mục tiêu điều tra không hợp lệ.' };
      }
      return {
        ok: true,
        action: {
          type: 'INVESTIGATE_CARD',
          cardId: raw.cardId,
          targetPlayerId: raw.targetPlayerId,
        },
      };
    }
    case 'ATTACK': {
      if (!isValidBoardGamePlayerIdSyntax(raw.targetPlayerId)) {
        return { ok: false, error: 'Mục tiêu tấn công không hợp lệ.' };
      }
      return {
        ok: true,
        action: { type: 'ATTACK', targetPlayerId: raw.targetPlayerId },
      };
    }
    case 'REVEAL_ROLE':
      return { ok: true, action: { type: 'REVEAL_ROLE' } };
    case 'USE_SKILL': {
      if (raw.targetPlayerId !== undefined && !isValidBoardGamePlayerIdSyntax(raw.targetPlayerId)) {
        return { ok: false, error: 'Mục tiêu kỹ năng không hợp lệ.' };
      }
      if (raw.targetLocation !== undefined && !isValidContractLocationId(raw.targetLocation)) {
        return { ok: false, error: 'Khu vực kỹ năng không hợp lệ.' };
      }
      return {
        ok: true,
        action: {
          type: 'USE_SKILL',
          ...(raw.targetPlayerId !== undefined ? { targetPlayerId: raw.targetPlayerId } : {}),
          ...(raw.targetLocation !== undefined ? { targetLocation: raw.targetLocation } : {}),
        },
      };
    }
    case 'RESOLVE_CHOICE': {
      if (
        typeof raw.choiceId !== 'string' ||
        !STRICT_CHOICE_ID_RE.test(raw.choiceId) ||
        RESERVED_SYMBOL_IDS.has(raw.choiceId)
      ) {
        return { ok: false, error: 'Mã lựa chọn (choiceId) không hợp lệ.' };
      }
      if (
        typeof raw.optionId !== 'string' ||
        !STRICT_OPTION_ID_RE.test(raw.optionId) ||
        RESERVED_SYMBOL_IDS.has(raw.optionId)
      ) {
        return { ok: false, error: 'Phương án lựa chọn (optionId) không hợp lệ.' };
      }
      return {
        ok: true,
        action: {
          type: 'RESOLVE_CHOICE',
          choiceId: raw.choiceId,
          optionId: raw.optionId,
        },
      };
    }
    case 'SET_REACTION_PREF': {
      if (!isValidBoardGameReactionPolicy(raw.policy)) {
        return { ok: false, error: 'Chính sách phản ứng (policy) không hợp lệ.' };
      }
      return {
        ok: true,
        action: {
          type: 'SET_REACTION_PREF',
          policy: raw.policy,
        },
      };
    }
    case 'TRANSFER_TO_BETHANY': {
      if (!isValidBoardGamePlayerIdSyntax(raw.targetPlayerId)) {
        return { ok: false, error: 'Mục tiêu nhận trang bị (Bethany) không hợp lệ.' };
      }
      if (!isValidBoardGameCardIdSyntax(raw.cardId)) {
        return { ok: false, error: 'Mã trang bị chuyển tặng không hợp lệ.' };
      }
      return {
        ok: true,
        action: {
          type: 'TRANSFER_TO_BETHANY',
          targetPlayerId: raw.targetPlayerId,
          cardId: raw.cardId,
        },
      };
    }
    case 'END_TURN':
      return { ok: true, action: { type: 'END_TURN' } };
  }
}

const CLIENT_MSG_ALLOWED_KEYS: Record<BoardGameClientMessage['type'], ReadonlySet<string>> = {
  BG_JOIN: new Set([
    'type',
    'matchId',
    'inviteCode',
    'displayName',
    'playerKey',
    'appearance',
    'asSpectator',
    'preferredSeatIndex',
    'reconnectToken',
    'requestId',
  ]),
  BG_SELECT_SEAT: new Set(['type', 'seatIndex', 'requestId']),
  BG_STAND_UP: new Set(['type', 'requestId']),
  BG_SET_READY: new Set(['type', 'ready', 'requestId']),
  BG_SET_RULESET: new Set(['type', 'rulesetId', 'requestId']),
  BG_START_MATCH: new Set(['type', 'requestId', 'turnTimeoutMs', 'rulesetId']),
  BG_GAME_ACTION: new Set(['type', 'requestId', 'expectedRevision', 'action']),
  BG_LEAVE: new Set(['type', 'requestId']),
  BG_CHAT_EMOTE: new Set(['type', 'emote', 'text', 'requestId']),
  BG_PING: new Set(['type', 'clientTimeMs']),
  BG_REQUEST_SYNC: new Set(['type', 'requestId']),
  BG_DIRECTORY_REFRESH: new Set(['type']),
};

export function validateBoardGameClientMessage(
  raw: unknown,
):
  | { ok: true; message: BoardGameClientMessage; requestId?: string }
  | {
      ok: false;
      code: BoardGameErrorMessage['code'];
      error: string;
      requestId?: string;
    } {
  if (!isSafePlainObject(raw)) {
    return {
      ok: false,
      code: 'INVALID_ACTION',
      error: 'Thông điệp WebSocket không phải object hợp lệ.',
    };
  }
  const reqId = isValidBoardGameRequestIdSyntax(raw.requestId) ? raw.requestId : undefined;
  const msgType = raw.type;
  if (typeof msgType !== 'string' || !Object.hasOwn(CLIENT_MSG_ALLOWED_KEYS, msgType)) {
    return {
      ok: false,
      code: 'INVALID_ACTION',
      error: 'Loại thông điệp WebSocket không được hỗ trợ.',
      requestId: reqId,
    };
  }

  const allowedKeys = CLIENT_MSG_ALLOWED_KEYS[msgType as BoardGameClientMessage['type']];
  if (!hasOnlyAllowedKeys(raw, allowedKeys)) {
    return {
      ok: false,
      code: 'INVALID_ACTION',
      error: 'Thông điệp WebSocket chứa trường dữ liệu không hợp lệ.',
      requestId: reqId,
    };
  }

  if (raw.requestId !== undefined && !isValidBoardGameRequestIdSyntax(raw.requestId)) {
    return {
      ok: false,
      code: 'INVALID_ACTION',
      error: 'requestId không hợp lệ.',
    };
  }

  switch (msgType as BoardGameClientMessage['type']) {
    case 'BG_JOIN': {
      if (!isValidBoardGameMatchIdSyntax(raw.matchId)) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'matchId không hợp lệ.',
          requestId: reqId,
        };
      }
      if (raw.inviteCode !== undefined && typeof raw.inviteCode !== 'string') {
        return {
          ok: false,
          code: 'INVALID_INVITE',
          error: 'Mã mời không hợp lệ.',
          requestId: reqId,
        };
      }
      if (typeof raw.displayName !== 'string' || raw.displayName.length > 80) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Tên hiển thị không hợp lệ.',
          requestId: reqId,
        };
      }
      if (raw.appearance !== undefined && !isSafePlainObject(raw.appearance)) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Dữ liệu trang phục không hợp lệ.',
          requestId: reqId,
        };
      }
      if (raw.asSpectator !== undefined && typeof raw.asSpectator !== 'boolean') {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Tham số asSpectator phải là boolean.',
          requestId: reqId,
        };
      }
      if (
        raw.preferredSeatIndex !== undefined &&
        raw.preferredSeatIndex !== null &&
        sanitizeBoardGameSeatIndex(raw.preferredSeatIndex) === null
      ) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Vị trí ghế ưu tiên không hợp lệ.',
          requestId: reqId,
        };
      }
      if (
        raw.playerKey !== undefined &&
        raw.playerKey !== '' &&
        sanitizeBoardGamePlayerKey(raw.playerKey) === null
      ) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'playerKey không hợp lệ.',
          requestId: reqId,
        };
      }
      if (
        raw.reconnectToken !== undefined &&
        raw.reconnectToken !== '' &&
        sanitizeBoardGameToken(raw.reconnectToken) === null
      ) {
        return {
          ok: false,
          code: 'UNAUTHORIZED',
          error: 'Token kết nối lại không hợp lệ.',
          requestId: reqId,
        };
      }
      return {
        ok: true,
        requestId: reqId,
        message: raw as unknown as BoardGameClientJoinMessage,
      };
    }
    case 'BG_SELECT_SEAT': {
      const seatIdx = sanitizeBoardGameSeatIndex(raw.seatIndex);
      if (seatIdx === null) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Chỉ số ghế không hợp lệ (0..7).',
          requestId: reqId,
        };
      }
      return {
        ok: true,
        requestId: reqId,
        message: {
          type: 'BG_SELECT_SEAT',
          seatIndex: seatIdx,
          ...(reqId ? { requestId: reqId } : {}),
        },
      };
    }
    case 'BG_STAND_UP':
      return {
        ok: true,
        requestId: reqId,
        message: { type: 'BG_STAND_UP', ...(reqId ? { requestId: reqId } : {}) },
      };
    case 'BG_SET_READY': {
      if (typeof raw.ready !== 'boolean') {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Tham số ready phải là boolean.',
          requestId: reqId,
        };
      }
      return {
        ok: true,
        requestId: reqId,
        message: {
          type: 'BG_SET_READY',
          ready: raw.ready,
          ...(reqId ? { requestId: reqId } : {}),
        },
      };
    }
    case 'BG_SET_RULESET': {
      if (!isValidBoardGameRulesetId(raw.rulesetId)) {
        return {
          ok: false,
          code: 'INVALID_RULESET',
          error: 'Bộ luật (rulesetId) không hợp lệ.',
          requestId: reqId,
        };
      }
      return {
        ok: true,
        requestId: reqId,
        message: {
          type: 'BG_SET_RULESET',
          rulesetId: raw.rulesetId,
          ...(reqId ? { requestId: reqId } : {}),
        },
      };
    }
    case 'BG_START_MATCH': {
      const validTimeout =
        raw.turnTimeoutMs === 0 ||
        (typeof raw.turnTimeoutMs === 'number' &&
          Number.isFinite(raw.turnTimeoutMs) &&
          raw.turnTimeoutMs >= 500 &&
          raw.turnTimeoutMs <= 600_000);
      if (raw.turnTimeoutMs !== undefined && !validTimeout) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Thời lượng lượt turnTimeoutMs không hợp lệ.',
          requestId: reqId,
        };
      }
      if (raw.rulesetId !== undefined && !isValidBoardGameRulesetId(raw.rulesetId)) {
        return {
          ok: false,
          code: 'INVALID_RULESET',
          error: 'Bộ luật (rulesetId) không hợp lệ.',
          requestId: reqId,
        };
      }
      return {
        ok: true,
        requestId: reqId,
        message: raw as unknown as BoardGameClientStartMatchMessage,
      };
    }
    case 'BG_GAME_ACTION': {
      if (!reqId) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Thiếu hoặc sai định dạng requestId.',
        };
      }
      if (
        typeof raw.expectedRevision !== 'number' ||
        !Number.isInteger(raw.expectedRevision) ||
        raw.expectedRevision < 0
      ) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'expectedRevision phải là số nguyên không âm.',
          requestId: reqId,
        };
      }
      const actionCheck = validateBoardGameActionPayload(raw.action);
      if (!actionCheck.ok) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: actionCheck.error,
          requestId: reqId,
        };
      }
      return {
        ok: true,
        requestId: reqId,
        message: {
          type: 'BG_GAME_ACTION',
          requestId: reqId,
          expectedRevision: raw.expectedRevision,
          action: actionCheck.action,
        },
      };
    }
    case 'BG_LEAVE':
      return {
        ok: true,
        requestId: reqId,
        message: { type: 'BG_LEAVE', ...(reqId ? { requestId: reqId } : {}) },
      };
    case 'BG_CHAT_EMOTE': {
      if (raw.emote !== undefined && !isValidBoardGameEmote(raw.emote)) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Biểu cảm không hợp lệ.',
          requestId: reqId,
        };
      }
      if (raw.text !== undefined && (typeof raw.text !== 'string' || raw.text.length > 300)) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Nội dung tin nhắn không hợp lệ hoặc quá dài.',
          requestId: reqId,
        };
      }
      if (raw.emote === undefined && raw.text === undefined) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'Tin nhắn hoặc biểu cảm không được để trống.',
          requestId: reqId,
        };
      }
      return {
        ok: true,
        requestId: reqId,
        message: raw as unknown as BoardGameClientChatEmoteMessage,
      };
    }
    case 'BG_PING': {
      if (
        raw.clientTimeMs !== undefined &&
        (typeof raw.clientTimeMs !== 'number' || !Number.isFinite(raw.clientTimeMs))
      ) {
        return {
          ok: false,
          code: 'INVALID_ACTION',
          error: 'clientTimeMs không hợp lệ.',
        };
      }
      return {
        ok: true,
        message: raw as unknown as BoardGameClientPingMessage,
      };
    }
    case 'BG_REQUEST_SYNC':
      return {
        ok: true,
        requestId: reqId,
        message: { type: 'BG_REQUEST_SYNC', ...(reqId ? { requestId: reqId } : {}) },
      };
    case 'BG_DIRECTORY_REFRESH':
      return { ok: true, message: { type: 'BG_DIRECTORY_REFRESH' } };
  }
}
