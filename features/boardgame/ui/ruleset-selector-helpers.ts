// ---------------------------------------------------------------------------
// features/boardgame/ui/ruleset-selector-helpers.ts — Pure, server-authoritative
// helpers shared by BoardGameHUD, BoardGameLobby, app/page.tsx and unit tests.
// ---------------------------------------------------------------------------

import type {
  BoardGameMatchStatus,
  BoardGameRulesetId,
  BoardGameServerRulesetCapability,
} from '../../../shared/contracts/boardgame';
import { DEFAULT_RULESET_REGISTRY } from '../domain/registry';

export type RulesetConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Hiển thị tên chế độ chơi chuẩn trên UI (sử dụng nhãn thân thiện cho người chơi,
 * trong khi mọi thuộc tính số tướng/trạng thái/khả dụng lấy trực tiếp từ server capabilities).
 */
export function formatRulesetDisplayLabel(
  rs: { readonly id: BoardGameRulesetId; readonly shortLabel: string },
): string {
  switch (rs.id) {
    case 'classic':
      return 'Classic';
    case 'expansion-1':
      return 'Expansion 1';
    case 'expansion-2':
      return 'Expansion 2';
    case 'full-expansion':
      return 'Full Expansion';
    default:
      return rs.shortLabel;
  }
}

export function formatRulesetReleaseBadge(
  status: BoardGameServerRulesetCapability['status'],
): 'Stable' | 'Beta' | 'Unavailable' {
  if (status === 'stable') return 'Stable';
  if (status === 'beta') return 'Beta';
  return 'Unavailable';
}

export function formatRulesetTriggerSummary(
  rs: {
    readonly id: BoardGameRulesetId;
    readonly shortLabel: string;
    readonly expectedCharacterCount: number;
  },
): string {
  return `${formatRulesetDisplayLabel(rs)} (${rs.expectedCharacterCount} tướng)`;
}

export function formatRulesetChangedNotice(
  rs: {
    readonly id: BoardGameRulesetId;
    readonly shortLabel: string;
    readonly expectedCharacterCount: number;
    readonly status: BoardGameServerRulesetCapability['status'];
  },
): string {
  const name = formatRulesetDisplayLabel(rs);
  const badge = formatRulesetReleaseBadge(rs.status);
  return `🎮 Chủ bàn đã chuyển sang ${name} — ${rs.expectedCharacterCount} tướng (${badge}).`;
}

/**
 * Khớp 1-1 với `worker/src/boardgame-room.ts` (`handleSetRuleset`):
 * Server từ chối đổi bộ luật khi `STARTING`, `PLAYING` hoặc `CLOSED`;
 * cho phép ở `CREATED`, `WAITING`, `READY_CHECK` và `FINISHED` (tái đấu).
 */
export function isRulesetLockedForMatchStatus(
  status: BoardGameMatchStatus | null | undefined,
): boolean {
  return status === 'STARTING' || status === 'PLAYING' || status === 'CLOSED';
}

export interface ResolveRulesetSelectorStateInput {
  rulesetId?: BoardGameRulesetId | null;
  serverRulesets?: readonly BoardGameServerRulesetCapability[] | null;
  matchStatus?: BoardGameMatchStatus | null;
  isHost?: boolean;
  isSpectator?: boolean;
  pendingRulesetId?: BoardGameRulesetId | null;
  hasSelectHandler?: boolean;
  connectionState?: RulesetConnectionState;
}

export interface ResolvedRulesetSelectorState {
  readonly effectiveRulesets: readonly BoardGameServerRulesetCapability[];
  readonly activeRuleset: BoardGameServerRulesetCapability;
  readonly pendingRuleset: BoardGameServerRulesetCapability | null;
  readonly anyBetaEnabled: boolean;
  readonly lockedByMatch: boolean;
  readonly disconnected: boolean;
  readonly isPending: boolean;
  readonly canOpenSelector: boolean;
  readonly readOnlyReason: string | null;
  readonly ariaLabel: string;
}

export function resolveRulesetSelectorState(
  input: ResolveRulesetSelectorStateInput,
): ResolvedRulesetSelectorState {
  const effectiveRulesets: readonly BoardGameServerRulesetCapability[] =
    input.serverRulesets && input.serverRulesets.length > 0
      ? input.serverRulesets
      : DEFAULT_RULESET_REGISTRY.getPublicServerCapabilities().rulesets;

  const activeRuleset =
    effectiveRulesets.find((r) => r.id === input.rulesetId) ?? effectiveRulesets[0];
  const pendingRuleset = input.pendingRulesetId
    ? effectiveRulesets.find((r) => r.id === input.pendingRulesetId) ?? null
    : null;
  const anyBetaEnabled = effectiveRulesets.some((r) => r.isBeta && r.selectable);
  const lockedByMatch = isRulesetLockedForMatchStatus(input.matchStatus);
  const disconnected =
    input.connectionState === 'reconnecting' || input.connectionState === 'error';
  const isPending = Boolean(input.pendingRulesetId);
  const canOpenSelector = Boolean(
    input.isHost &&
      !input.isSpectator &&
      !lockedByMatch &&
      !disconnected &&
      input.hasSelectHandler,
  );

  let readOnlyReason: string | null = null;
  if (lockedByMatch) {
    readOnlyReason =
      input.matchStatus === 'CLOSED'
        ? 'Phòng đã đóng'
        : 'Không thể đổi chế độ khi trận đang diễn ra';
  } else if (input.isSpectator) {
    readOnlyReason = 'Chủ bàn chọn chế độ chơi';
  } else if (!input.isHost) {
    readOnlyReason = 'Chủ bàn chọn chế độ chơi';
  } else if (disconnected) {
    readOnlyReason = 'Đang kết nối lại máy chủ...';
  }

  const badge = formatRulesetReleaseBadge(activeRuleset.status);
  const summary = formatRulesetTriggerSummary(activeRuleset);
  const ariaLabel = `Chế độ chơi: ${summary} · ${badge}${readOnlyReason ? ` · ${readOnlyReason}` : ''}`;

  return {
    effectiveRulesets,
    activeRuleset,
    pendingRuleset,
    anyBetaEnabled,
    lockedByMatch,
    disconnected,
    isPending,
    canOpenSelector,
    readOnlyReason,
    ariaLabel,
  };
}

export function canRequestRulesetOption(
  state: ResolvedRulesetSelectorState,
  option: BoardGameServerRulesetCapability,
): boolean {
  return (
    state.canOpenSelector &&
    !state.isPending &&
    option.selectable &&
    option.id !== state.activeRuleset.id
  );
}
