// ---------------------------------------------------------------------------
// shared/contracts/boardgame.ts — Single Source of Truth cho Hợp đồng Mạng,
// Máy trạng thái Lobby/Trận đấu & DTO của "Bóng Đêm KTX v3 — Hidden Role,
// Investigation & Survival". Không phụ thuộc React, Three.js hay DOM.
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

export const BOARD_GAME_RULESET_VERSION = 3 as const;
export const BOARD_GAME_MIN_PLAYERS = 4;
export const BOARD_GAME_MAX_PLAYERS = 8;
export const BOARD_GAME_TABLE_SEAT_COUNT = 8;
export const BOARD_GAME_MAX_SPECTATORS = 8;
export const BOARD_GAME_MAX_DIRECTORY_MATCHES = 16;
export const BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS = 40_000;
export const BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS = 12_000;
export const BOARD_GAME_RECONNECT_HOLD_MS = 90_000;
export const BOARD_GAME_FINISHED_TTL_MS = 10 * 60_000;

/** Tập ký tự mã mời 6 ký tự dễ đọc, loại bỏ 0/O/1/I/L tránh nhầm lẫn. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

export type BoardGameFactionId = 'lantern-guard' | 'mist-order' | 'wanderer';

export type BoardGameRoleId =
  | 'gac-ky-thuat'
  | 'gac-truc-ban'
  | 'gac-radio'
  | 'suong-an-danh'
  | 'suong-tin-gia'
  | 'suong-gac-cong'
  | 'lang-anh-san'
  | 'lang-quan-sat'
  | 'lang-cuu-ho';

export type BoardGameLocationId =
  | 'lobby'
  | 'canteen'
  | 'radio'
  | 'court'
  | 'corridor'
  | 'breaker';

export type BoardGameDeckId = 'investigation' | 'equipment' | 'event';

export type BoardGameTurnPhase =
  | 'MOVE_OR_STAY'
  | 'LOCATION_ACTION'
  | 'MAIN_ACTION'
  | 'ENDED';

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
    | 'adjacent-or-same'
    | 'same-location'
    | 'global'
    | 'location';
  isConsumable?: boolean;
  value: number;
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
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
  updatedAtMs: number;
}

export interface BoardGamePublicPlayerView {
  playerId: string;
  displayName: string;
  seatIndex: number;
  location: BoardGameLocationId;
  /** Sức khỏe bí mật được tách khỏi kênh công khai: chỉ lộ vết thương và Giáp tạm hiện có. */
  woundsTaken: number;
  tempShield: number;
  handCount: number;
  equipped: readonly BoardGameCardPublicMeta[];
  attacksMade: number;
  investigationsCount: number;
  stayedLastTurn: boolean;
  wardedUntilRound: number;
  exposedMark: number;
  alive: boolean;
  connected: boolean;
  // BẢO MẬT P0: Chỉ hiện vai, phe, maxHp & cooldown kỹ năng khi đã lật vai công khai hoặc FINISHED!
  revealedRoleId: BoardGameRoleId | null;
  revealedFaction: BoardGameFactionId | null;
  revealedMaxHp: number | null;
  revealedSkillCooldown: number;
  appearance: RemoteAppearance;
}

export interface BoardGamePublicLogEntry {
  id: string;
  round: number;
  atMs: number;
  kind:
    | 'system'
    | 'move'
    | 'stay'
    | 'explore'
    | 'draw'
    | 'investigate'
    | 'equipment'
    | 'event'
    | 'skill'
    | 'attack'
    | 'defend'
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
  won: boolean;
  alive: boolean;
  hp: number;
  maxHp: number;
  woundsTaken: number;
}

export interface BoardGamePublicGameView {
  rulesetVersion: 3;
  matchId: string;
  round: number;
  maxRounds: number;
  turnNumber: number;
  turnPhase: BoardGameTurnPhase;
  activePlayerId: string | null;
  turnOrder: readonly string[];
  curfewPressureActive: boolean;
  players: readonly BoardGamePublicPlayerView[];
  deckCounts: Record<BoardGameDeckId, number>;
  lastInvestigation: BoardGameInvestigationOutcome | null;
  lastRevealEvent: BoardGameRevealEvent | null;
  publicLog: readonly BoardGamePublicLogEntry[];
  highlights: readonly BoardGameHighlightEntry[];
  winnerLabel: string | null;
  winnerFaction: BoardGameFactionId | 'wanderer-solo' | 'wanderer' | null;
  winnerPlayerIds: readonly string[];
  winReason: string | null;
  /** Chỉ điền đầy đủ sau khi trận đấu kết thúc (`FINISHED`). */
  finalReveal: readonly BoardGameRevealRecord[] | null;
}

export interface BoardGamePrivateNote {
  id: string;
  atMs: number;
  round: number;
  text: string;
}

export interface BoardGamePrivateGameView {
  playerId: string;
  roleId: BoardGameRoleId;
  roleName: string;
  faction: BoardGameFactionId;
  hp: number;
  maxHp: number;
  woundsTaken: number;
  tempShield: number;
  skillCooldown: number;
  revealed: boolean;
  secretGoalText: string;
  protegePlayerId: string | null;
  protegeDisplayName: string | null;
  protectedProtegeCount: number;
  avengedProtegeKiller: boolean;
  investigatedTargetIds: readonly string[];
  visitedLocations: readonly BoardGameLocationId[];
  hand: readonly BoardGameCardPublicMeta[];
  equipped: readonly BoardGameCardPublicMeta[];
  privateClues: readonly BoardGamePrivateClueEntry[];
  privateNotes: readonly BoardGamePrivateNote[];
}

export type BoardGameActionPayload =
  | { type: 'MOVE'; location: BoardGameLocationId }
  | { type: 'STAY' }
  | { type: 'EXPLORE_LOC' }
  | { type: 'DRAW_CARD'; deck: BoardGameDeckId }
  | { type: 'EQUIP_CARD'; cardId: string }
  | { type: 'USE_EQUIPMENT'; cardId: string; targetPlayerId?: string }
  | { type: 'INVESTIGATE_CARD'; cardId: string; targetPlayerId: string }
  | {
      type: 'PLAY_EVENT';
      cardId: string;
      targetPlayerId?: string;
      targetLocation?: BoardGameLocationId;
    }
  | { type: 'ATTACK'; targetPlayerId: string }
  | { type: 'DEFEND' }
  | { type: 'REVEAL_ROLE' }
  | {
      type: 'USE_SKILL';
      targetPlayerId?: string;
      targetLocation?: BoardGameLocationId;
    }
  | { type: 'END_TURN' };

export interface BoardGameStateSyncMessage {
  type: 'BG_STATE_SYNC';
  matchId: string;
  inviteCode: string;
  tableId: BoardGameTableId;
  status: BoardGameMatchStatus;
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

export interface BoardGameClientStartMatchMessage {
  type: 'BG_START_MATCH';
  requestId?: string;
  turnTimeoutMs?: number;
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

export type BoardGameClientMessage =
  | BoardGameClientJoinMessage
  | BoardGameClientSelectSeatMessage
  | BoardGameClientStandUpMessage
  | BoardGameClientSetReadyMessage
  | BoardGameClientStartMatchMessage
  | BoardGameClientGameActionMessage
  | BoardGameClientLeaveMessage
  | BoardGameClientChatEmoteMessage
  | BoardGameClientPingMessage;

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
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const r = randomByteFn ? Math.abs(Math.floor(randomByteFn())) : Math.floor(Math.random() * 256);
    out += INVITE_CODE_ALPHABET[r % alphabetLen];
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
