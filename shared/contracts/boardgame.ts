// ---------------------------------------------------------------------------
// shared/contracts/boardgame.ts — Single Source of Truth cho Hợp đồng Mạng,
// Máy trạng thái Lobby/Trận đấu & DTO của "Bóng Đêm KTX — Secrets After Dark".
// Không phụ thuộc React, Three.js hay DOM để chạy đồng bộ Frontend ↔ Worker DO.
//
// Bảo mật P0:
// - Tuyệt đối KHÔNG định nghĩa hoặc truyền `mssv`, `reconnectTokenHash` hay
//   thông tin vai bí mật trong DTO công khai / danh sách sảnh / MatchPostcard.
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

export const BOARD_GAME_RULESET_VERSION = 2 as const;
export const BOARD_GAME_MIN_PLAYERS = 4;
export const BOARD_GAME_MAX_PLAYERS = 8;
export const BOARD_GAME_TABLE_SEAT_COUNT = 8;
export const BOARD_GAME_MAX_SPECTATORS = 8;
export const BOARD_GAME_MAX_DIRECTORY_MATCHES = 16;
export const BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS = 45_000;
export const BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS = 15_000;
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

export type BoardGameDeckId = 'clue' | 'event' | 'tactic';

export type BoardGameAccessTag = 'tech-key' | 'broadcast-gear' | 'patrol-badge';

export type BoardGameTraceTag = 'insulated-gloves' | 'signal-meter' | 'magnetic-card';

export type BoardGameEvidenceKind =
  | 'equipment'
  | 'activity'
  | 'scene'
  | 'comparison'
  | 'grid';

export interface BoardGameEvidenceEntry {
  id: string;
  round: number;
  atMs: number;
  kind: BoardGameEvidenceKind;
  subjectLabel: string;
  targetPlayerId?: string | null;
  locationId?: BoardGameLocationId | null;
  summary: string;
  sourceLabel: string;
  compatibleHint?: string;
}

export interface BoardGameHypothesisEntry {
  targetPlayerId: string;
  targetName: string;
  predictedFaction: BoardGameFactionId;
  recordedRound: number;
}

export type BoardGameTurnPhase =
  | 'MOVE'
  | 'DRAW_OR_EXPLORE'
  | 'TACTICAL_ACTION'
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
  effectId: string;
  targetMode:
    | 'self'
    | 'single-player'
    | 'same-location'
    | 'adjacent-or-same'
    | 'pair-players'
    | 'global'
    | 'location';
  value: number;
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
  /** Sức khỏe bí mật được tách khỏi kênh công khai: chỉ lộ số vết thương và khiên hiện có. */
  woundsTaken: number;
  visibleShield: number;
  handCount: number;
  alive: boolean;
  detained: boolean;
  connected: boolean;
  // BẢO MẬT P0: Chỉ hiện vai, phe, maxHp & trạng thái kỹ năng khi người chơi tự lật, bị bắt giữ, bị loại hoặc trận FINISHED!
  revealedRoleId: BoardGameRoleId | null;
  revealedFaction: BoardGameFactionId | null;
  revealedMaxHp: number | null;
  revealedSkillUsed: boolean;
  appearance: RemoteAppearance;
}

export interface BoardGamePublicLogEntry {
  id: string;
  round: number;
  atMs: number;
  kind:
    | 'system'
    | 'move'
    | 'draw'
    | 'scene'
    | 'investigate'
    | 'tactic'
    | 'skill'
    | 'attack'
    | 'confront'
    | 'reveal'
    | 'incident'
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
  detained: boolean;
  hp: number;
  maxHp: number;
  woundsTaken: number;
}

export interface BoardGamePublicGameView {
  rulesetVersion: 2;
  matchId: string;
  round: number;
  maxRounds: number;
  sabotageArmed: boolean;
  disarmedCount: number;
  breakerSealed: boolean;
  radioSealed: boolean;
  falseAccusationCount: number;
  tamperedLocations: readonly BoardGameLocationId[];
  turnPhase: BoardGameTurnPhase;
  activePlayerId: string | null;
  turnOrder: readonly string[];
  blackoutLocation: BoardGameLocationId | null;
  players: readonly BoardGamePublicPlayerView[];
  deckCounts: Record<BoardGameDeckId, number>;
  publicLog: readonly BoardGamePublicLogEntry[];
  highlights: readonly BoardGameHighlightEntry[];
  winnerLabel: string | null;
  winnerFaction: BoardGameFactionId | 'wanderer-solo' | null;
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
  shield: number;
  skillUsed: boolean;
  covertSkillUsed: boolean;
  confrontUsed: boolean;
  revealed: boolean;
  detained: boolean;
  accessTag: BoardGameAccessTag;
  traceTag: BoardGameTraceTag;
  secretGoalText: string;
  /** Chỉ điền cho thành viên Hội Màn Sương (null với Gác Đèn, Lang Thang và Khán giả). */
  secretSabotageLocation: BoardGameLocationId | null;
  /** Chỉ bật true cho Hội Màn Sương khi Mạch Quá Tải đã được gài ngầm (luôn false với phe khác). */
  sabotagePlanted: boolean;
  /** Chỉ bật true cho Hội Màn Sương khi Mạch Quá Tải đã đủ điều kiện kích nổ ở vòng hiện tại. */
  sabotageCanDetonate: boolean;
  verifiedSceneLocations: readonly BoardGameLocationId[];
  wardPlayerId: string | null;
  wardDisplayName: string | null;
  wardProtectionsCount: number;
  sacrificedForWard: boolean;
  hypotheses: readonly BoardGameHypothesisEntry[];
  metPlayerIds: readonly string[];
  hand: readonly BoardGameCardPublicMeta[];
  evidenceList: readonly BoardGameEvidenceEntry[];
  privateNotes: readonly BoardGamePrivateNote[];
}

export type BoardGameActionPayload =
  | { type: 'MOVE'; location: BoardGameLocationId }
  | { type: 'DRAW_CARD'; deck: BoardGameDeckId }
  | { type: 'INTERACT_LOC'; mode?: 'scan' | 'sabotage' }
  | {
      type: 'USE_CARD';
      cardId: string;
      targetPlayerId?: string;
      targetSecondPlayerId?: string;
      targetLocation?: BoardGameLocationId;
    }
  | { type: 'ATTACK'; targetPlayerId: string }
  | {
      type: 'INVESTIGATE';
      targetPlayerId: string;
      focus?: 'equipment' | 'activity';
    }
  | { type: 'CONFRONT'; targetPlayerId: string }
  | { type: 'DETONATE_PLOT' }
  | { type: 'PUBLISH_DOSSIER' }
  | {
      type: 'RECORD_HYPOTHESIS';
      targetPlayerId: string;
      predictedFaction: BoardGameFactionId;
    }
  | {
      type: 'USE_SKILL';
      targetPlayerId?: string;
      targetSecondPlayerId?: string;
      targetLocation?: BoardGameLocationId;
    }
  | { type: 'REVEAL_ROLE' }
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
  // Loại bỏ ký tự điều khiển và làm sạch; đồng thời che dãy 8 số giống MSSV nếu lỡ nhập vào tên
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
