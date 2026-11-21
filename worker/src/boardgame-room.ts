// ---------------------------------------------------------------------------
// worker/src/boardgame-room.ts — Cloudflare Durable Object `BoardGameRoom`
// quản lý độc lập phòng chơi & sảnh chờ "Bóng Đêm KTX — Secrets After Dark".
//
// Đặc tả kỹ thuật & Bảo mật (BG2 + sẵn sàng cho BG3 engine):
// - Chạy SQLite cục bộ bên trong Durable Object (`ctx.storage.sql`) với
//   4 bảng: `matches`, `match_players` (ràng buộc UNIQUE từng ghế `0..7`),
//   `processed_requests` (idempotency cho BG3) và `directory_matches`.
// - Sinh token kết nối lại 256-bit CSPRNG, chỉ lưu `SHA-256` hex trong SQLite.
// - Fencing tab cũ bằng mã đóng WebSocket `4001` ("Replaced by newer connection").
// - Hỗ trợ WebSocket Hibernation (`acceptWebSocket` + `serializeAttachment`) và
//   khôi phục đầy đủ trạng thái từ SQLite + socket attachments sau hibernation.
// - Tách biệt tuyệt đối thông tin công khai vs riêng tư (`privateView`).
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_ABANDONED_MATCH_TTL_MS,
  BOARD_GAME_CATALOG_VERSION,
  BOARD_GAME_CHOICE_TIMEOUT_MS,
  BOARD_GAME_DEFAULT_RULESET_ID,
  BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS,
  BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS,
  BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS,
  BOARD_GAME_FINISHED_TTL_MS,
  BOARD_GAME_MAX_DIRECTORY_MATCHES,
  BOARD_GAME_MAX_PLAYERS,
  BOARD_GAME_MAX_SPECTATORS,
  BOARD_GAME_MIN_PLAYERS,
  BOARD_GAME_PROTOCOL_VERSION,
  BOARD_GAME_RECONNECT_HOLD_MS,
  BOARD_GAME_RULESET_VERSION,
  canTransitionBoardGameStatus,
  isValidBoardGameLeaderboardFactionFilter,
  isValidBoardGameLeaderboardPeriod,
  resolveProductionBetaConfigFromEnv,
  sanitizeBoardGameAppearance,
  sanitizeBoardGameChatText,
  sanitizeBoardGameMatchId,
  sanitizeBoardGameName,
  sanitizeBoardGamePlayerKey,
  sanitizeBoardGameRequestId,
  sanitizeBoardGameRulesetId,
  sanitizeBoardGameSeatIndex,
  sanitizeBoardGameTableId,
  sanitizeBoardGameToken,
  sanitizeInviteCode,
  seatIndexToSeatId,
  isValidBoardGameEmote,
  validateBoardGameActionPayload,
  validateBoardGameClientMessage,
  type BoardGameActionPayload,
  type BoardGameFactionId,
  type BoardGameLeaderboardEntry,
  type BoardGameLeaderboardFactionFilter,
  type BoardGameLeaderboardPeriod,
  type BoardGameLeaderboardResponse,
  type BoardGameLobbyPlayerView,
  type BoardGameMatchStatus,
  type BoardGameMatchSummary,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
  type BoardGameRoleId,
  type BoardGameRulesetId,
  type BoardGameServerMessage,
  type BoardGameTableId,
} from '../../shared/contracts/boardgame';
import {
  DEFAULT_CLUSTER_PAIRS,
  DEFAULT_RULESET_REGISTRY,
  ROLES_BY_ID,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  createInitialGameState,
  getActivePlayer,
  getEffectiveTurnControllerId,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  isKnownBoardGameRoleId,
  isValidLocationId,
  type AuthoritativeGameState,
  type AuthoritativePlayerState,
} from '../../features/boardgame/domain';
import { logBoardGameEvent } from './boardgame-observability';

export const BG_DIRECTORY_ROOM_NAME = '__lounge_directory__';
export const BG_WS_FENCE_CLOSE_CODE = 4001;
const MAX_WS_PAYLOAD_BYTES = 8192;
const MIN_ACTION_INTERVAL_MS = 25;
const EMOTE_COOLDOWN_MS = 1500;
const WINDOW_MS = 2000;
const MAX_MSGS_PER_WINDOW = 25;
const MAX_JOINS_PER_WINDOW = 5;
const PROD_MIN_TURN_TIMEOUT_MS = 15_000;
const PROD_MAX_TURN_TIMEOUT_MS = 90_000;
const TEST_MIN_TURN_TIMEOUT_MS = 1_500;
const TEST_MAX_TURN_TIMEOUT_MS = 120_000;
const utf8Encoder = new TextEncoder();

export interface BoardGameEnv {
  BOARD_GAME_ROOM?: DurableObjectNamespace;
  ENVIRONMENT?: string;
  ALLOW_SHORT_TURN_TIMEOUT?: string;
  /** Chỉ bật trong test/alpha harness nội bộ — KHÔNG cấu hình trong production wrangler.toml. */
  ALLOW_EXPERIMENTAL_RULESETS?: string;
  /** Cờ bật Production Beta mặc định TẮT (`'1'` / `'true'` để bật các gói trong `BETA_ALLOWED_RULESETS`). */
  ENABLE_PRODUCTION_BETA_EXPANSIONS?: string;
  /** Allowlist phân tách dấu phẩy gồm tối đa: `expansion-1,expansion-2,full-expansion`. */
  BETA_ALLOWED_RULESETS?: string;
  /** Token tùy chọn bảo vệ chi tiết per-character trong endpoint `/api/boardgame/telemetry`. */
  BETA_TELEMETRY_TOKEN?: string;
  /** Ghi đè thời hạn pending choice trong test (ms). */
  CHOICE_TIMEOUT_OVERRIDE_MS?: string;
}

export function clampBoardGameTurnTimeoutMs(
  rawTimeout: unknown,
  env?: Pick<BoardGameEnv, 'ALLOW_SHORT_TURN_TIMEOUT'>,
): number {
  if (typeof rawTimeout !== 'number' || !Number.isFinite(rawTimeout)) {
    return BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS;
  }
  if (rawTimeout <= 0) {
    return 0;
  }
  const allowShort = env?.ALLOW_SHORT_TURN_TIMEOUT === '1';
  const minMs = allowShort ? TEST_MIN_TURN_TIMEOUT_MS : PROD_MIN_TURN_TIMEOUT_MS;
  const maxMs = allowShort ? TEST_MAX_TURN_TIMEOUT_MS : PROD_MAX_TURN_TIMEOUT_MS;
  return Math.max(minMs, Math.min(maxMs, Math.floor(rawTimeout)));
}

interface MatchDbRow {
  match_id: string;
  invite_code: string;
  table_id: BoardGameTableId;
  host_player_id: string;
  status: BoardGameMatchStatus;
  revision: number;
  turn_deadline_ms: number | null;
  turn_timeout_ms: number;
  created_at_ms: number;
  updated_at_ms: number;
  game_state_json: string | null;
  leaderboard_recorded?: number;
  ruleset_id?: string | null;
  catalog_version?: string | null;
}

interface MatchPlayerDbRow {
  player_id: string;
  seat_index: number | null;
  display_name: string;
  outfit_json: string;
  is_spectator: number;
  ready: number;
  connected: number;
  reconnect_token_hash: string;
  last_seen_ms: number;
  leaderboard_key?: string | null;
}

interface BoardGameLeaderboardDbRow {
  player_key: string;
  display_name: string;
  appearance_json: string;
  matches_played: number;
  wins_total: number;
  hunter_wins: number;
  shadow_wins: number;
  wanderer_wins: number;
  eliminations_dealt: number;
  investigations_total: number;
  survivals_total: number;
  current_win_streak: number;
  best_win_streak: number;
  rating_points: number;
  week_key: string;
  weekly_matches: number;
  weekly_wins: number;
  weekly_points: number;
  last_role_id: string | null;
  last_played_at_ms: number;
}

interface LeaderboardParticipantPayload {
  playerKey: string;
  displayName: string;
  appearance: ReturnType<typeof sanitizeBoardGameAppearance>;
  won: boolean;
  faction: BoardGameFactionId;
  roleId: BoardGameRoleId;
  alive: boolean;
  eliminationsDealt: number;
  investigationsCount: number;
}

function computeVnWeekKey(nowMs: number): string {
  const vnDate = new Date(nowMs + 7 * 3600_000);
  const utcMid = Date.UTC(vnDate.getUTCFullYear(), vnDate.getUTCMonth(), vnDate.getUTCDate());
  const d = new Date(utcMid);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

interface DirectoryRow {
  match_id: string;
  invite_code: string;
  table_id: BoardGameTableId;
  host_name: string;
  status: BoardGameMatchStatus;
  ruleset_id?: string | null;
  player_count: number;
  max_players: number;
  spectator_count: number;
  updated_at_ms: number;
}

interface BgSocketAttachment {
  matchId: string;
  playerId: string;
  connectionId: string;
  isSpectator: boolean;
  isDirectory?: boolean;
  replaced?: boolean;
}

interface SocketRateState {
  windowStartMs: number;
  msgCount: number;
  joinWindowStartMs: number;
  joinCount: number;
  lastActionMs: number;
  lastChatEmoteMs: number;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function randomBase64Url(numBytes: number): string {
  const buf = new Uint8Array(numBytes);
  globalThis.crypto.getRandomValues(buf);
  let raw = '';
  for (let i = 0; i < buf.length; i++) {
    raw += String.fromCharCode(buf[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return bytesToHex(buf);
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export class BoardGameRoom {
  private ctx: DurableObjectState;
  private env: BoardGameEnv;
  private schemaReady = false;
  private roomName: string | null = null;
  private rateMap = new WeakMap<WebSocket, SocketRateState>();
  private joinChain: Promise<void> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: BoardGameEnv = {}) {
    this.ctx = ctx;
    this.env = env;
    this.roomName = ctx.id?.name ?? null;
    this.ensureSchema();
  }

  private get sql(): SqlStorage {
    const sql = this.ctx.storage?.sql;
    if (!sql) {
      throw new Error('BoardGameRoom requires Durable Object SQLite storage (ctx.storage.sql).');
    }
    return sql;
  }

  private isDirectoryInstance(): boolean {
    if (this.roomName === BG_DIRECTORY_ROOM_NAME) return true;
    // Fallback check when DO awakened with unnamed id
    try {
      const dirCount = this.sql
        .exec<{ c: number }>('SELECT COUNT(*) AS c FROM directory_matches')
        .one();
      const lbCount = this.sql
        .exec<{ c: number }>('SELECT COUNT(*) AS c FROM boardgame_leaderboard')
        .one();
      const matchCount = this.sql
        .exec<{ c: number }>('SELECT COUNT(*) AS c FROM matches')
        .one();
      return ((dirCount?.c ?? 0) > 0 || (lbCount?.c ?? 0) > 0) && (matchCount?.c ?? 0) === 0;
    } catch {
      return false;
    }
  }

  private ensureSchema(): void {
    if (this.schemaReady) return;
    const sql = this.sql;
    sql.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        match_id TEXT PRIMARY KEY,
        invite_code TEXT NOT NULL,
        table_id TEXT NOT NULL,
        host_player_id TEXT NOT NULL,
        status TEXT NOT NULL,
        revision INTEGER NOT NULL,
        turn_deadline_ms INTEGER,
        turn_timeout_ms INTEGER NOT NULL DEFAULT 0,
        created_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL,
        game_state_json TEXT,
        leaderboard_recorded INTEGER NOT NULL DEFAULT 0,
        ruleset_id TEXT NOT NULL DEFAULT 'classic',
        catalog_version TEXT
      )
    `);
    try {
      sql.exec('ALTER TABLE matches ADD COLUMN leaderboard_recorded INTEGER NOT NULL DEFAULT 0');
    } catch {
      // already migrated
    }
    try {
      sql.exec("ALTER TABLE matches ADD COLUMN ruleset_id TEXT NOT NULL DEFAULT 'classic'");
    } catch {
      // already migrated
    }
    try {
      sql.exec('ALTER TABLE matches ADD COLUMN catalog_version TEXT');
    } catch {
      // already migrated
    }
    sql.exec(`
      CREATE TABLE IF NOT EXISTS match_players (
        player_id TEXT PRIMARY KEY,
        seat_index INTEGER,
        display_name TEXT NOT NULL,
        outfit_json TEXT NOT NULL,
        is_spectator INTEGER NOT NULL DEFAULT 0,
        ready INTEGER NOT NULL DEFAULT 0,
        connected INTEGER NOT NULL DEFAULT 1,
        reconnect_token_hash TEXT NOT NULL,
        last_seen_ms INTEGER NOT NULL,
        leaderboard_key TEXT
      )
    `);
    try {
      sql.exec('ALTER TABLE match_players ADD COLUMN leaderboard_key TEXT');
    } catch {
      // already migrated
    }
    sql.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_seat_unique
      ON match_players(seat_index)
      WHERE seat_index IS NOT NULL AND is_spectator = 0
    `);
    sql.exec(`
      CREATE TABLE IF NOT EXISTS processed_requests (
        player_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        created_at_ms INTEGER NOT NULL,
        PRIMARY KEY (player_id, request_id)
      )
    `);
    sql.exec(`
      CREATE TABLE IF NOT EXISTS directory_matches (
        match_id TEXT PRIMARY KEY,
        invite_code TEXT NOT NULL UNIQUE,
        table_id TEXT NOT NULL,
        host_name TEXT NOT NULL,
        status TEXT NOT NULL,
        ruleset_id TEXT NOT NULL DEFAULT 'classic',
        player_count INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        spectator_count INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      )
    `);
    try {
      sql.exec("ALTER TABLE directory_matches ADD COLUMN ruleset_id TEXT NOT NULL DEFAULT 'classic'");
    } catch {
      // already migrated
    }
    sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_dir_status_updated
      ON directory_matches(status, updated_at_ms DESC)
    `);
    sql.exec(`
      CREATE TABLE IF NOT EXISTS boardgame_leaderboard_matches (
        match_id TEXT PRIMARY KEY,
        recorded_at_ms INTEGER NOT NULL
      )
    `);
    sql.exec(`
      CREATE TABLE IF NOT EXISTS boardgame_leaderboard (
        player_key TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        appearance_json TEXT NOT NULL,
        matches_played INTEGER NOT NULL DEFAULT 0,
        wins_total INTEGER NOT NULL DEFAULT 0,
        hunter_wins INTEGER NOT NULL DEFAULT 0,
        shadow_wins INTEGER NOT NULL DEFAULT 0,
        wanderer_wins INTEGER NOT NULL DEFAULT 0,
        eliminations_dealt INTEGER NOT NULL DEFAULT 0,
        investigations_total INTEGER NOT NULL DEFAULT 0,
        survivals_total INTEGER NOT NULL DEFAULT 0,
        current_win_streak INTEGER NOT NULL DEFAULT 0,
        best_win_streak INTEGER NOT NULL DEFAULT 0,
        rating_points INTEGER NOT NULL DEFAULT 0,
        week_key TEXT NOT NULL DEFAULT '',
        weekly_matches INTEGER NOT NULL DEFAULT 0,
        weekly_wins INTEGER NOT NULL DEFAULT 0,
        weekly_points INTEGER NOT NULL DEFAULT 0,
        last_role_id TEXT,
        last_played_at_ms INTEGER NOT NULL DEFAULT 0
      )
    `);
    sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_bg_lb_points
      ON boardgame_leaderboard(rating_points DESC, wins_total DESC)
    `);
    // Phase 8A — Bảng telemetry tổng hợp Production Beta (additive 100%, ZERO dữ liệu bí mật/PII)
    sql.exec(`
      CREATE TABLE IF NOT EXISTS boardgame_telemetry_counters (
        metric_key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at_ms INTEGER NOT NULL
      )
    `);
    sql.exec(`
      CREATE TABLE IF NOT EXISTS boardgame_telemetry_roles (
        role_id TEXT PRIMARY KEY,
        appearances INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        survivals INTEGER NOT NULL DEFAULT 0,
        skill_activations INTEGER NOT NULL DEFAULT 0,
        updated_at_ms INTEGER NOT NULL
      )
    `);
    sql.exec(`
      CREATE TABLE IF NOT EXISTS boardgame_telemetry_recorded_matches (
        record_key TEXT PRIMARY KEY,
        ruleset_id TEXT NOT NULL,
        catalog_version TEXT,
        player_count INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        winner_faction TEXT,
        recorded_at_ms INTEGER NOT NULL
      )
    `);
    this.schemaReady = true;
  }

  private getRulesetValidationOptions() {
    return {
      allowExperimental: this.env.ALLOW_EXPERIMENTAL_RULESETS === '1',
      productionBeta: resolveProductionBetaConfigFromEnv(this.env),
    };
  }

  private incrementTelemetryCounterLocal(
    metricKey: string,
    delta: number,
    nowMs: number,
  ): void {
    const cleanKey = metricKey.trim().slice(0, 64);
    if (!cleanKey || !Number.isFinite(delta) || delta === 0) return;
    const step = Math.round(delta);
    this.sql.exec(
      `INSERT INTO boardgame_telemetry_counters (metric_key, count, updated_at_ms)
       VALUES (?, ?, ?)
       ON CONFLICT(metric_key) DO UPDATE SET
         count = count + excluded.count,
         updated_at_ms = excluded.updated_at_ms`,
      cleanKey,
      step,
      nowMs,
    );
  }

  private async emitBetaTelemetryCounters(
    metrics: readonly string[],
    deltas?: Record<string, number>,
  ): Promise<void> {
    const ns = this.env.BOARD_GAME_ROOM;
    if (!ns) return;
    if (metrics.length === 0 && (!deltas || Object.keys(deltas).length === 0)) return;
    const stub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
    await stub
      .fetch('https://internal/__dir/telemetry-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, deltas }),
      })
      .catch(() => undefined);
  }

  private getMatchRow(): MatchDbRow | null {
    this.ensureSchema();
    const rows = this.sql.exec<MatchDbRow>('SELECT * FROM matches LIMIT 1').toArray();
    return rows[0] ?? null;
  }

  private listPlayerRows(): MatchPlayerDbRow[] {
    this.ensureSchema();
    return this.sql
      .exec<MatchPlayerDbRow>(
        'SELECT * FROM match_players ORDER BY is_spectator ASC, COALESCE(seat_index, 99) ASC, last_seen_ms ASC',
      )
      .toArray();
  }

  private getPlayerRow(playerId: string): MatchPlayerDbRow | null {
    this.ensureSchema();
    const rows = this.sql
      .exec<MatchPlayerDbRow>('SELECT * FROM match_players WHERE player_id = ?', playerId)
      .toArray();
    return rows[0] ?? null;
  }

  private findPlayerByTokenHash(tokenHash: string): MatchPlayerDbRow | null {
    this.ensureSchema();
    const rows = this.sql
      .exec<MatchPlayerDbRow>('SELECT * FROM match_players WHERE reconnect_token_hash = ? LIMIT 1', tokenHash)
      .toArray();
    return rows[0] ?? null;
  }

  private getAttachment(ws: WebSocket): BgSocketAttachment | null {
    try {
      const att = ws.deserializeAttachment?.();
      if (!att || typeof att !== 'object') return null;
      return att as BgSocketAttachment;
    } catch {
      return null;
    }
  }

  private setAttachment(ws: WebSocket, att: BgSocketAttachment): void {
    try {
      ws.serializeAttachment?.(att);
    } catch {
      // ignore if test socket lacks attachment support
    }
  }

  private send(ws: WebSocket, msg: BoardGameServerMessage | Record<string, unknown>): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // dead socket cleaned on webSocketClose
    }
  }

  private sendError(
    ws: WebSocket,
    code: Extract<BoardGameServerMessage, { type: 'BG_ERROR' }>['code'],
    message: string,
    extra?: { requestId?: string; revision?: number },
  ): void {
    this.send(ws, {
      type: 'BG_ERROR',
      code,
      message,
      ...(extra?.requestId ? { requestId: extra.requestId } : {}),
      ...(typeof extra?.revision === 'number' ? { revision: extra.revision } : {}),
    });
  }

  // -------------------------------------------------------------------------
  // HTTP + WebSocket Fetch Router (DO entry point)
  // -------------------------------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    const url = new URL(request.url);
    const nowMs = Date.now();

    // Directory instance endpoints (`__lounge_directory__`)
    if (url.pathname === '/__dir/register' && request.method === 'POST') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      const matchId = sanitizeBoardGameMatchId(body.matchId);
      const inviteCode = sanitizeInviteCode(body.inviteCode);
      const tableId = sanitizeBoardGameTableId(body.tableId);
      const hostName = sanitizeBoardGameName(body.hostName);
      const rulesetId = sanitizeBoardGameRulesetId(body.rulesetId);
      if (!matchId || !inviteCode) {
        return Response.json({ ok: false, error: 'invalid-fields' }, { status: 400 });
      }
      // Clean stale CLOSED/very old rows (> 3 hours) so old invite codes can be recycled
      this.sql.exec(
        'DELETE FROM directory_matches WHERE status = ? OR updated_at_ms < ?',
        'CLOSED',
        nowMs - 3 * 3600_000,
      );
      const conflict = this.sql
        .exec<{ match_id: string }>(
          'SELECT match_id FROM directory_matches WHERE invite_code = ? LIMIT 1',
          inviteCode,
        )
        .toArray();
      if (conflict.length > 0) {
        return Response.json({ ok: false, error: 'invite-code-collision' }, { status: 409 });
      }
      this.sql.exec(
        `INSERT INTO directory_matches (
          match_id, invite_code, table_id, host_name, status, ruleset_id, player_count, max_players, spectator_count, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        matchId,
        inviteCode,
        tableId,
        hostName,
        'CREATED',
        rulesetId,
        0,
        BOARD_GAME_MAX_PLAYERS,
        0,
        nowMs,
      );
      this.broadcastDirectorySnapshot();
      return Response.json({ ok: true, matchId, inviteCode, tableId, rulesetId }, { status: 201 });
    }

    if (url.pathname === '/__dir/join-or-register-table' && request.method === 'POST') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      const tableId = sanitizeBoardGameTableId(body.tableId);
      const hostName = sanitizeBoardGameName(body.hostName);
      const matchId = sanitizeBoardGameMatchId(body.matchId);
      const inviteCode = sanitizeInviteCode(body.inviteCode);
      const rulesetId = sanitizeBoardGameRulesetId(body.rulesetId);
      if (!matchId || !inviteCode) {
        return Response.json({ ok: false, error: 'invalid-fields' }, { status: 400 });
      }
      this.sql.exec(
        'DELETE FROM directory_matches WHERE status = ? OR updated_at_ms < ?',
        'CLOSED',
        nowMs - 2 * 3600_000,
      );
      const openRows = this.sql
        .exec<DirectoryRow>(
          `SELECT * FROM directory_matches
           WHERE table_id = ?
             AND status IN ('CREATED', 'WAITING', 'READY_CHECK')
             AND player_count < max_players
           ORDER BY (CASE WHEN player_count > 0 THEN 0 ELSE 1 END) ASC, updated_at_ms DESC
           LIMIT 1`,
          tableId,
        )
        .toArray();
      if (openRows[0]) {
        return Response.json({
          ok: true,
          created: false,
          match: this.formatDirectoryRow(openRows[0]),
        });
      }
      const conflict = this.sql
        .exec<{ match_id: string }>(
          'SELECT match_id FROM directory_matches WHERE invite_code = ? LIMIT 1',
          inviteCode,
        )
        .toArray();
      if (conflict.length > 0) {
        return Response.json({ ok: false, error: 'invite-code-collision' }, { status: 409 });
      }
      this.sql.exec(
        `INSERT INTO directory_matches (
          match_id, invite_code, table_id, host_name, status, ruleset_id, player_count, max_players, spectator_count, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        matchId,
        inviteCode,
        tableId,
        hostName,
        'CREATED',
        rulesetId,
        0,
        BOARD_GAME_MAX_PLAYERS,
        0,
        nowMs,
      );
      this.broadcastDirectorySnapshot();
      return Response.json(
        {
          ok: true,
          created: true,
          match: {
            matchId,
            inviteCode,
            tableId,
            hostName,
            status: 'CREATED' as BoardGameMatchStatus,
            rulesetId,
            playerCount: 0,
            maxPlayers: BOARD_GAME_MAX_PLAYERS,
            spectatorCount: 0,
            updatedAtMs: nowMs,
          },
        },
        { status: 201 },
      );
    }

    if (url.pathname === '/__dir/update' && request.method === 'POST') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      const matchId = sanitizeBoardGameMatchId(body.matchId);
      if (!matchId) return Response.json({ ok: false, error: 'invalid-matchId' }, { status: 400 });
      const status = typeof body.status === 'string' ? body.status : 'WAITING';
      const hostName = sanitizeBoardGameName(body.hostName);
      const rulesetId = sanitizeBoardGameRulesetId(body.rulesetId);
      const playerCount = typeof body.playerCount === 'number' ? Math.max(0, Math.floor(body.playerCount)) : 0;
      const spectatorCount =
        typeof body.spectatorCount === 'number' ? Math.max(0, Math.floor(body.spectatorCount)) : 0;
      if (status === 'CLOSED') {
        this.sql.exec('DELETE FROM directory_matches WHERE match_id = ?', matchId);
      } else {
        this.sql.exec(
          `UPDATE directory_matches
           SET status = ?, host_name = ?, ruleset_id = ?, player_count = ?, spectator_count = ?, updated_at_ms = ?
           WHERE match_id = ?`,
          status,
          hostName,
          rulesetId,
          playerCount,
          spectatorCount,
          nowMs,
          matchId,
        );
      }
      this.broadcastDirectorySnapshot();
      return Response.json({ ok: true });
    }

    if (url.pathname === '/__dir/list' && request.method === 'GET') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      return Response.json({ ok: true, matches: this.queryDirectoryMatches(nowMs) });
    }

    if (url.pathname === '/__dir/lookup' && request.method === 'GET') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const code = sanitizeInviteCode(url.searchParams.get('code'));
      if (!code) {
        return Response.json({ ok: false, error: 'Mã mời không hợp lệ.' }, { status: 400 });
      }
      const rows = this.sql
        .exec<DirectoryRow>(
          'SELECT * FROM directory_matches WHERE invite_code = ? AND status != ? LIMIT 1',
          code,
          'CLOSED',
        )
        .toArray();
      if (!rows[0]) {
        return Response.json({ ok: false, error: 'Không tìm thấy phòng với mã mời này.' }, { status: 404 });
      }
      return Response.json({
        ok: true,
        match: this.formatDirectoryRow(rows[0]),
      });
    }

    if (url.pathname === '/__dir/record-match' && request.method === 'POST') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body.recordKey !== 'string' || !Array.isArray(body.participants)) {
        return Response.json({ ok: false, error: 'invalid-payload' }, { status: 400 });
      }
      const recordKey = body.recordKey.trim().slice(0, 128);
      if (!recordKey) {
        return Response.json({ ok: false, error: 'missing-record-key' }, { status: 400 });
      }
      const existing = this.sql
        .exec<{ match_id: string }>(
          'SELECT match_id FROM boardgame_leaderboard_matches WHERE match_id = ? LIMIT 1',
          recordKey,
        )
        .toArray();
      if (existing.length > 0) {
        return Response.json({ ok: true, alreadyRecorded: true });
      }
      const recordedAt =
        typeof body.nowMs === 'number' && Number.isFinite(body.nowMs) ? body.nowMs : nowMs;
      const weekKey = computeVnWeekKey(recordedAt);
      this.sql.exec(
        'INSERT INTO boardgame_leaderboard_matches (match_id, recorded_at_ms) VALUES (?, ?)',
        recordKey,
        recordedAt,
      );
      for (const rawItem of body.participants) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const item = rawItem as Partial<LeaderboardParticipantPayload>;
        const rawKey = typeof item.playerKey === 'string' ? item.playerKey.trim() : '';
        const cleanKey = /^lb_[a-f0-9]{16,32}$/.test(rawKey)
          ? rawKey
          : sanitizeBoardGamePlayerKey(rawKey);
        if (!cleanKey) continue;
        const cleanName = sanitizeBoardGameName(item.displayName);
        const appearanceJson = JSON.stringify(sanitizeBoardGameAppearance(item.appearance));
        const won = Boolean(item.won);
        const faction: BoardGameFactionId =
          item.faction === 'lantern-guard' ||
          item.faction === 'mist-order' ||
          item.faction === 'wanderer'
            ? item.faction
            : 'wanderer';
        const roleId =
          isKnownBoardGameRoleId(item.roleId)
            ? (item.roleId as BoardGameRoleId)
            : null;
        const alive = Boolean(item.alive);
        const eliminationsDealt =
          typeof item.eliminationsDealt === 'number' && Number.isFinite(item.eliminationsDealt)
            ? Math.max(0, Math.min(8, Math.floor(item.eliminationsDealt)))
            : 0;
        const investigationsCount =
          typeof item.investigationsCount === 'number' && Number.isFinite(item.investigationsCount)
            ? Math.max(0, Math.min(64, Math.floor(item.investigationsCount)))
            : 0;
        const matchPts =
          5 +
          (won ? (faction === 'wanderer' ? 30 : 25) : 0) +
          eliminationsDealt * 3 +
          (alive ? 2 : 0);
        const hunterInc = won && faction === 'lantern-guard' ? 1 : 0;
        const shadowInc = won && faction === 'mist-order' ? 1 : 0;
        const wandererInc = won && faction === 'wanderer' ? 1 : 0;

        const prev = this.sql
          .exec<BoardGameLeaderboardDbRow>(
            'SELECT * FROM boardgame_leaderboard WHERE player_key = ? LIMIT 1',
            cleanKey,
          )
          .toArray()[0];

        if (!prev) {
          const streak = won ? 1 : 0;
          this.sql.exec(
            `INSERT INTO boardgame_leaderboard (
              player_key, display_name, appearance_json, matches_played, wins_total,
              hunter_wins, shadow_wins, wanderer_wins, eliminations_dealt,
              investigations_total, survivals_total, current_win_streak, best_win_streak,
              rating_points, week_key, weekly_matches, weekly_wins, weekly_points,
              last_role_id, last_played_at_ms
            ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
            cleanKey,
            cleanName,
            appearanceJson,
            won ? 1 : 0,
            hunterInc,
            shadowInc,
            wandererInc,
            eliminationsDealt,
            investigationsCount,
            alive ? 1 : 0,
            streak,
            streak,
            matchPts,
            weekKey,
            won ? 1 : 0,
            matchPts,
            roleId,
            recordedAt,
          );
        } else {
          const nextStreak = won ? prev.current_win_streak + 1 : 0;
          const nextBest = Math.max(prev.best_win_streak, nextStreak);
          const sameWeek = prev.week_key === weekKey;
          const nextWeeklyMatches = sameWeek ? prev.weekly_matches + 1 : 1;
          const nextWeeklyWins = (sameWeek ? prev.weekly_wins : 0) + (won ? 1 : 0);
          const nextWeeklyPoints = (sameWeek ? prev.weekly_points : 0) + matchPts;
          this.sql.exec(
            `UPDATE boardgame_leaderboard
             SET display_name = ?,
                 appearance_json = ?,
                 matches_played = matches_played + 1,
                 wins_total = wins_total + ?,
                 hunter_wins = hunter_wins + ?,
                 shadow_wins = shadow_wins + ?,
                 wanderer_wins = wanderer_wins + ?,
                 eliminations_dealt = eliminations_dealt + ?,
                 investigations_total = investigations_total + ?,
                 survivals_total = survivals_total + ?,
                 current_win_streak = ?,
                 best_win_streak = ?,
                 rating_points = rating_points + ?,
                 week_key = ?,
                 weekly_matches = ?,
                 weekly_wins = ?,
                 weekly_points = ?,
                 last_role_id = ?,
                 last_played_at_ms = ?
             WHERE player_key = ?`,
            cleanName,
            appearanceJson,
            won ? 1 : 0,
            hunterInc,
            shadowInc,
            wandererInc,
            eliminationsDealt,
            investigationsCount,
            alive ? 1 : 0,
            nextStreak,
            nextBest,
            matchPts,
            weekKey,
            nextWeeklyMatches,
            nextWeeklyWins,
            nextWeeklyPoints,
            roleId,
            recordedAt,
            cleanKey,
          );
        }
      }
      return Response.json({ ok: true, recorded: true });
    }

    if (url.pathname === '/__dir/leaderboard' && request.method === 'GET') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const rawPeriod = url.searchParams.get('period');
      const rawFaction = url.searchParams.get('faction');
      const period: BoardGameLeaderboardPeriod = isValidBoardGameLeaderboardPeriod(rawPeriod)
        ? rawPeriod
        : 'alltime';
      const faction: BoardGameLeaderboardFactionFilter = isValidBoardGameLeaderboardFactionFilter(
        rawFaction,
      )
        ? rawFaction
        : 'all';
      const rawSelfKey = sanitizeBoardGamePlayerKey(url.searchParams.get('playerKey'));
      const hashedSelfKey = rawSelfKey ? await this.hashLeaderboardKey(rawSelfKey) : null;
      const currentWeekKey = computeVnWeekKey(nowMs);

      const conditions: string[] = [];
      const params: unknown[] = [];
      if (period === 'weekly') {
        conditions.push('week_key = ? AND weekly_matches > 0');
        params.push(currentWeekKey);
      } else {
        conditions.push('matches_played > 0');
      }
      if (faction === 'lantern-guard') {
        conditions.push('hunter_wins > 0');
      } else if (faction === 'mist-order') {
        conditions.push('shadow_wins > 0');
      } else if (faction === 'wanderer') {
        conditions.push('wanderer_wins > 0');
      }

      let orderBy =
        'rating_points DESC, wins_total DESC, eliminations_dealt DESC, best_win_streak DESC, last_played_at_ms DESC';
      if (period === 'weekly') {
        if (faction === 'lantern-guard') {
          orderBy = 'weekly_points DESC, hunter_wins DESC, weekly_wins DESC, last_played_at_ms DESC';
        } else if (faction === 'mist-order') {
          orderBy = 'weekly_points DESC, shadow_wins DESC, weekly_wins DESC, last_played_at_ms DESC';
        } else if (faction === 'wanderer') {
          orderBy = 'weekly_points DESC, wanderer_wins DESC, weekly_wins DESC, last_played_at_ms DESC';
        } else {
          orderBy = 'weekly_points DESC, weekly_wins DESC, best_win_streak DESC, last_played_at_ms DESC';
        }
      } else if (faction === 'lantern-guard') {
        orderBy = 'hunter_wins DESC, rating_points DESC, wins_total DESC, last_played_at_ms DESC';
      } else if (faction === 'mist-order') {
        orderBy = 'shadow_wins DESC, rating_points DESC, wins_total DESC, last_played_at_ms DESC';
      } else if (faction === 'wanderer') {
        orderBy = 'wanderer_wins DESC, rating_points DESC, wins_total DESC, last_played_at_ms DESC';
      }

      const rows = this.sql
        .exec<BoardGameLeaderboardDbRow>(
          `SELECT * FROM boardgame_leaderboard WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT 200`,
          ...params,
        )
        .toArray();

      const allEntries: BoardGameLeaderboardEntry[] = rows.map((row, idx) => {
        const ratingPoints = period === 'weekly' ? row.weekly_points : row.rating_points;
        const wins = period === 'weekly' ? row.weekly_wins : row.wins_total;
        const matchesPlayed = period === 'weekly' ? row.weekly_matches : row.matches_played;
        const winRatePct = matchesPlayed > 0 ? Math.round((wins * 100) / matchesPlayed) : 0;
        const isSelf = hashedSelfKey !== null && row.player_key === hashedSelfKey;
        const validLastRole =
          isKnownBoardGameRoleId(row.last_role_id)
            ? (row.last_role_id as BoardGameRoleId)
            : null;
        return {
          rank: idx + 1,
          playerKey: row.player_key,
          displayName: row.display_name,
          appearance: sanitizeBoardGameAppearance(parseJsonObject(row.appearance_json)),
          ratingPoints,
          wins,
          matchesPlayed,
          winRatePct,
          hunterWins: row.hunter_wins,
          shadowWins: row.shadow_wins,
          wandererWins: row.wanderer_wins,
          eliminationsDealt: row.eliminations_dealt,
          survivalsTotal: row.survivals_total,
          currentWinStreak: row.current_win_streak,
          bestWinStreak: row.best_win_streak,
          lastRoleId: validLastRole,
          lastPlayedAtMs: row.last_played_at_ms,
          ...(isSelf ? { isSelf: true } : {}),
        };
      });

      const myEntry = hashedSelfKey
        ? (allEntries.find((e) => e.playerKey === hashedSelfKey) ?? null)
        : null;
      const body: BoardGameLeaderboardResponse = {
        ok: true,
        period,
        faction,
        updatedAtMs: nowMs,
        totalPlayers: allEntries.length,
        entries: allEntries.slice(0, 50),
        myEntry,
      };
      return Response.json(body);
    }

    // Phase 8A — Directory DO: ghi nhận sự kiện vận hành Production Beta (aggregate-only, zero PII/secrets)
    if (url.pathname === '/__dir/telemetry-event' && request.method === 'POST') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      const metrics = Array.isArray(body.metrics) ? body.metrics : [];
      for (const rawKey of metrics) {
        if (typeof rawKey === 'string' && /^[a-z0-9:_-]{1,64}$/i.test(rawKey)) {
          this.incrementTelemetryCounterLocal(rawKey, 1, nowMs);
        }
      }
      if (body.deltas && typeof body.deltas === 'object' && !Array.isArray(body.deltas)) {
        for (const [k, v] of Object.entries(body.deltas as Record<string, unknown>)) {
          if (
            /^[a-z0-9:_-]{1,64}$/i.test(k) &&
            typeof v === 'number' &&
            Number.isFinite(v) &&
            v >= 0 &&
            v <= 86_400_000
          ) {
            this.incrementTelemetryCounterLocal(k, Math.round(v), nowMs);
          }
        }
      }
      return Response.json({ ok: true });
    }

    // Phase 8A — Directory DO: ghi nhận trận ĐÃ KẾT THÚC vào telemetry tổng hợp (idempotent, ẩn danh 100%)
    if (url.pathname === '/__dir/telemetry-match' && request.method === 'POST') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body.recordKey !== 'string') {
        return Response.json({ ok: false, error: 'invalid-payload' }, { status: 400 });
      }
      const recordKey = body.recordKey.trim().slice(0, 128);
      if (!recordKey) {
        return Response.json({ ok: false, error: 'missing-record-key' }, { status: 400 });
      }
      const existing = this.sql
        .exec<{ record_key: string }>(
          'SELECT record_key FROM boardgame_telemetry_recorded_matches WHERE record_key = ? LIMIT 1',
          recordKey,
        )
        .toArray();
      if (existing.length > 0) {
        return Response.json({ ok: true, alreadyRecorded: true });
      }
      const rulesetId = sanitizeBoardGameRulesetId(body.rulesetId);
      const catalogVersion =
        typeof body.catalogVersion === 'string'
          ? body.catalogVersion.slice(0, 32)
          : BOARD_GAME_CATALOG_VERSION;
      const playerCount =
        typeof body.playerCount === 'number' && Number.isFinite(body.playerCount)
          ? Math.max(BOARD_GAME_MIN_PLAYERS, Math.min(BOARD_GAME_MAX_PLAYERS, Math.floor(body.playerCount)))
          : BOARD_GAME_MIN_PLAYERS;
      const durationMs =
        typeof body.durationMs === 'number' && Number.isFinite(body.durationMs)
          ? Math.max(0, Math.min(14_400_000, Math.round(body.durationMs)))
          : 0;
      const winnerFaction =
        typeof body.winnerFaction === 'string' && /^[a-z0-9-]{1,32}$/.test(body.winnerFaction)
          ? body.winnerFaction
          : 'none';
      const unexpectedEnding = Boolean(body.unexpectedEnding);

      this.sql.exec(
        `INSERT INTO boardgame_telemetry_recorded_matches (
          record_key, ruleset_id, catalog_version, player_count, duration_ms, winner_faction, recorded_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        recordKey,
        rulesetId,
        catalogVersion,
        playerCount,
        durationMs,
        winnerFaction,
        nowMs,
      );

      this.incrementTelemetryCounterLocal('matches_completed', 1, nowMs);
      this.incrementTelemetryCounterLocal(`ruleset_completed:${rulesetId}`, 1, nowMs);
      this.incrementTelemetryCounterLocal(`player_count_completed:${playerCount}`, 1, nowMs);
      this.incrementTelemetryCounterLocal(`winner_faction:${winnerFaction}`, 1, nowMs);
      if (durationMs > 0) {
        this.incrementTelemetryCounterLocal('duration_ms_sum', durationMs, nowMs);
        this.incrementTelemetryCounterLocal('duration_ms_count', 1, nowMs);
      }
      if (unexpectedEnding) {
        this.incrementTelemetryCounterLocal('unexpected_endings', 1, nowMs);
      }

      if (Array.isArray(body.roles)) {
        for (const rawRole of body.roles) {
          if (!rawRole || typeof rawRole !== 'object') continue;
          const r = rawRole as Record<string, unknown>;
          if (!isKnownBoardGameRoleId(r.roleId)) continue;
          const won = r.won ? 1 : 0;
          const survived = r.survived ? 1 : 0;
          const activations =
            typeof r.skillActivations === 'number' && Number.isFinite(r.skillActivations)
              ? Math.max(0, Math.min(200, Math.floor(r.skillActivations)))
              : 0;
          this.sql.exec(
            `INSERT INTO boardgame_telemetry_roles (
              role_id, appearances, wins, survivals, skill_activations, updated_at_ms
            ) VALUES (?, 1, ?, ?, ?, ?)
            ON CONFLICT(role_id) DO UPDATE SET
              appearances = appearances + 1,
              wins = wins + excluded.wins,
              survivals = survivals + excluded.survivals,
              skill_activations = skill_activations + excluded.skill_activations,
              updated_at_ms = excluded.updated_at_ms`,
            r.roleId,
            won,
            survived,
            activations,
            nowMs,
          );
        }
      }
      return Response.json({ ok: true, recorded: true });
    }

    // Phase 8A — Directory DO: xuất snapshot telemetry ẩn danh cho vận hành Beta
    if (url.pathname === '/__dir/telemetry' && request.method === 'GET') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const includePerRole = url.searchParams.get('includePerRole') !== '0';
      const counterRows = this.sql
        .exec<{ metric_key: string; count: number; updated_at_ms: number }>(
          'SELECT metric_key, count, updated_at_ms FROM boardgame_telemetry_counters',
        )
        .toArray();
      const counters: Record<string, number> = {};
      let lastUpdatedMs = 0;
      for (const row of counterRows) {
        counters[row.metric_key] = Number(row.count ?? 0);
        if (row.updated_at_ms > lastUpdatedMs) lastUpdatedMs = row.updated_at_ms;
      }

      const rulesetCreated: Record<string, number> = {};
      const rulesetCompleted: Record<string, number> = {};
      const playerCountDistribution: Record<string, number> = {};
      const victoryDistribution: Record<string, number> = {};
      for (const [k, v] of Object.entries(counters)) {
        if (k.startsWith('ruleset_created:')) rulesetCreated[k.slice(16)] = v;
        else if (k.startsWith('ruleset_completed:')) rulesetCompleted[k.slice(18)] = v;
        else if (k.startsWith('player_count_started:')) playerCountDistribution[k.slice(21)] = v;
        else if (k.startsWith('winner_faction:')) victoryDistribution[k.slice(15)] = v;
      }

      const durCount = counters.duration_ms_count ?? 0;
      const avgMatchDurationMs =
        durCount > 0 ? Math.round((counters.duration_ms_sum ?? 0) / durCount) : 0;

      const roleRows = includePerRole
        ? this.sql
            .exec<{
              role_id: string;
              appearances: number;
              wins: number;
              survivals: number;
              skill_activations: number;
            }>(
              'SELECT role_id, appearances, wins, survivals, skill_activations FROM boardgame_telemetry_roles ORDER BY appearances DESC, role_id ASC',
            )
            .toArray()
        : [];

      const activeMatchesCount = this.sql
        .exec<{ c: number }>(
          "SELECT COUNT(*) AS c FROM directory_matches WHERE status IN ('CREATED', 'WAITING', 'READY_CHECK', 'STARTING', 'PLAYING')",
        )
        .one()?.c ?? 0;

      return Response.json({
        ok: true,
        generatedAtMs: nowMs,
        lastUpdatedMs,
        retentionDays: 90,
        privacyGuarantees: {
          noReconnectTokens: true,
          noPlayerPiiOrNames: true,
          noActiveMatchHiddenRoles: true,
          postMatchAggregateOnly: true,
        },
        summary: {
          activeMatchesNow: Number(activeMatchesCount),
          matchesCreated: counters.matches_created ?? 0,
          matchesStarted: counters.matches_started ?? 0,
          matchesCompleted: counters.matches_completed ?? 0,
          matchesAbandoned: counters.matches_abandoned ?? 0,
          avgMatchDurationMs,
          humanPlaytestTargetMatches: 100,
          humanPlaytestProgressCompleted: counters.matches_completed ?? 0,
        },
        operational: {
          disconnections: counters.disconnections ?? 0,
          reconnectAttempts: counters.reconnect_attempts ?? 0,
          invalidActionAttempts: counters.invalid_actions ?? 0,
          pendingChoiceTimeouts: counters.choice_timeouts ?? 0,
          turnTimeouts: counters.turn_timeouts ?? 0,
          engineErrors: counters.engine_errors ?? 0,
          workerErrors: counters.worker_errors ?? 0,
          unhandledExceptions: counters.unhandled_exceptions ?? 0,
          stateRestoreFailures: counters.state_restore_failures ?? 0,
          unexpectedMatchEndings: counters.unexpected_endings ?? 0,
        },
        rulesetPopularity: {
          created: rulesetCreated,
          completed: rulesetCompleted,
        },
        playerCountDistribution,
        victoryDistribution,
        perCharacterStats: includePerRole
          ? roleRows.map((r) => ({
              roleId: r.role_id,
              appearances: r.appearances,
              wins: r.wins,
              winRatePct:
                r.appearances > 0 ? Number(((r.wins / r.appearances) * 100).toFixed(2)) : 0,
              survivals: r.survivals,
              skillActivations: r.skill_activations,
            }))
          : null,
      });
    }

    // Match DO initialization (`POST /__init`)
    if (url.pathname === '/__init' && request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      const matchId = sanitizeBoardGameMatchId(body.matchId);
      const inviteCode = sanitizeInviteCode(body.inviteCode);
      const tableId = sanitizeBoardGameTableId(body.tableId);
      const requestedRuleset =
        body.rulesetId === undefined ? BOARD_GAME_DEFAULT_RULESET_ID : body.rulesetId;
      const rulesetCheck = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(
        requestedRuleset,
        BOARD_GAME_MIN_PLAYERS,
        this.getRulesetValidationOptions(),
      );
      if (!rulesetCheck.ok) {
        return Response.json(
          { ok: false, code: rulesetCheck.code, error: rulesetCheck.error },
          { status: 400 },
        );
      }
      const rulesetId = rulesetCheck.ruleset.id;
      const rawTimeout = typeof body.turnTimeoutMs === 'number' ? body.turnTimeoutMs : BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS;
      const turnTimeoutMs = clampBoardGameTurnTimeoutMs(rawTimeout, this.env);
      if (!matchId || !inviteCode) {
        return Response.json({ ok: false, error: 'invalid-init-fields' }, { status: 400 });
      }
      this.roomName = matchId;
      const existing = this.getMatchRow();
      if (existing) {
        return Response.json({
          ok: true,
          matchId: existing.match_id,
          inviteCode: existing.invite_code,
          tableId: existing.table_id,
          rulesetId: sanitizeBoardGameRulesetId(existing.ruleset_id),
        });
      }
      this.sql.exec(
        `INSERT INTO matches (
          match_id, invite_code, table_id, host_player_id, status, revision, turn_deadline_ms, turn_timeout_ms, created_at_ms, updated_at_ms, game_state_json, ruleset_id, catalog_version
        ) VALUES (?, ?, ?, '', 'CREATED', 1, NULL, ?, ?, ?, NULL, ?, ?)`,
        matchId,
        inviteCode,
        tableId,
        turnTimeoutMs,
        nowMs,
        nowMs,
        rulesetId,
        rulesetCheck.catalogVersion,
      );
      await this.scheduleNextAlarm(nowMs);
      logBoardGameEvent(this.env, 'MATCH_CREATED', {
        matchId,
        tableId,
        rulesetId,
        catalogVersion: rulesetCheck.catalogVersion,
        status: 'CREATED',
        revision: 1,
      });
      await this.emitBetaTelemetryCounters(['matches_created', `ruleset_created:${rulesetId}`]);
      return Response.json({ ok: true, matchId, inviteCode, tableId, rulesetId }, { status: 201 });
    }

    // Read-only match public meta (`GET /__meta`)
    if (url.pathname === '/__meta' && request.method === 'GET') {
      const row = this.getMatchRow();
      if (!row || row.status === 'CLOSED') {
        return Response.json({ ok: false, error: 'not-found' }, { status: 404 });
      }
      return Response.json({
        ok: true,
        matchId: row.match_id,
        inviteCode: row.invite_code,
        tableId: row.table_id,
        status: row.status,
      });
    }

    // WebSocket upgrade (directory or match room)
    const upgrade = request.headers.get('Upgrade');
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const mode = url.searchParams.get('mode');
    const hdrMatchId = sanitizeBoardGameMatchId(
      request.headers.get('x-bg-match-id') ?? url.searchParams.get('matchId'),
    );
    const isDir = mode === 'directory' || (!hdrMatchId && this.isDirectoryInstance());
    if (!isDir && !this.getMatchRow()) {
      return Response.json({ ok: false, error: 'match-not-found' }, { status: 404 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    this.setAttachment(server, {
      matchId: hdrMatchId ?? '',
      playerId: '',
      connectionId: randomBase64Url(9),
      isSpectator: false,
      isDirectory: isDir,
    });
    if (isDir) {
      this.send(server, {
        type: 'BG_DIRECTORY_SYNC',
        matches: this.queryDirectoryMatches(nowMs),
      });
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  private formatDirectoryRow(row: DirectoryRow): BoardGameMatchSummary {
    return {
      matchId: row.match_id,
      inviteCode: row.invite_code,
      tableId: sanitizeBoardGameTableId(row.table_id),
      hostName: sanitizeBoardGameName(row.host_name),
      status: row.status,
      rulesetId: sanitizeBoardGameRulesetId(row.ruleset_id),
      playerCount: Math.max(0, Math.min(BOARD_GAME_MAX_PLAYERS, row.player_count)),
      maxPlayers: row.max_players || BOARD_GAME_MAX_PLAYERS,
      spectatorCount: Math.max(0, row.spectator_count),
      updatedAtMs: row.updated_at_ms,
    };
  }

  private queryDirectoryMatches(nowMs: number): BoardGameMatchSummary[] {
    this.ensureSchema();
    // Prune closed or abandoned (> 2h idle) directory entries
    this.sql.exec(
      'DELETE FROM directory_matches WHERE status = ? OR updated_at_ms < ?',
      'CLOSED',
      nowMs - 2 * 3600_000,
    );
    const rows = this.sql
      .exec<DirectoryRow>(
        `SELECT * FROM directory_matches
         WHERE status IN ('CREATED', 'WAITING', 'READY_CHECK', 'STARTING', 'PLAYING')
         ORDER BY updated_at_ms DESC
         LIMIT ?`,
        BOARD_GAME_MAX_DIRECTORY_MATCHES,
      )
      .toArray();
    return rows.map((r) => this.formatDirectoryRow(r));
  }

  private broadcastDirectorySnapshot(): void {
    const matches = this.queryDirectoryMatches(Date.now());
    const payload = JSON.stringify({ type: 'BG_DIRECTORY_SYNC', matches });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // ignore dead socket
      }
    }
  }

  private async hashLeaderboardKey(rawKey: string): Promise<string> {
    const digest = await sha256Hex(`bg-lb:${rawKey}`);
    return `lb_${digest.slice(0, 24)}`;
  }

  private async recordFinishedMatchToLeaderboard(nowMs: number): Promise<void> {
    const ns = this.env.BOARD_GAME_ROOM;
    const match = this.getMatchRow();
    if (!ns || !match || match.leaderboard_recorded === 1) return;
    const playerRows = this.listPlayerRows();
    const engineState = this.loadEngineState(match, playerRows);
    if (!engineState || !engineState.finished) return;

    const rowByPlayerId = new Map<string, MatchPlayerDbRow>();
    for (const r of playerRows) {
      rowByPlayerId.set(r.player_id, r);
    }

    const winnerSet = new Set(engineState.winnerPlayerIds);
    const allEnginePlayers = Object.values(engineState.players);
    const participants: LeaderboardParticipantPayload[] = [];
    for (const ep of allEnginePlayers) {
      const row = rowByPlayerId.get(ep.playerId);
      const playerKey = row?.leaderboard_key ?? (await this.hashLeaderboardKey(ep.playerId));
      const eliminationsDealt = allEnginePlayers.filter(
        (other) => other.eliminatedByPlayerId === ep.playerId,
      ).length;
      const appearance = row
        ? sanitizeBoardGameAppearance(parseJsonObject(row.outfit_json))
        : sanitizeBoardGameAppearance(ep.appearance);
      participants.push({
        playerKey,
        displayName: row?.display_name ?? ep.displayName,
        appearance,
        won: winnerSet.has(ep.playerId),
        faction: ep.faction,
        roleId: ep.roleId,
        alive: ep.alive,
        eliminationsDealt,
        investigationsCount: ep.investigationsCount,
      });
    }

    const stub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
    const res = await stub
      .fetch('https://internal/__dir/record-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordKey: `${match.match_id}:${engineState.seed}`,
          nowMs,
          participants,
        }),
      })
      .catch(() => null);
    if (res?.ok) {
      this.sql.exec(
        'UPDATE matches SET leaderboard_recorded = 1 WHERE match_id = ?',
        match.match_id,
      );
    }

    // Phase 8A: ghi nhận telemetry tổng hợp trận ĐÃ KẾT THÚC (idempotent, ẩn danh 100%, ZERO PII/token)
    const expActivations = engineState.expansionState?.stats?.activationsByRole ?? {};
    const durationMs = Math.max(0, nowMs - match.created_at_ms);
    const unexpectedEnding =
      !engineState.winnerPlayerIds ||
      engineState.winnerPlayerIds.length === 0 ||
      engineState.round >= engineState.maxRounds;
    const rulesetId = engineState.rulesetId ?? sanitizeBoardGameRulesetId(match.ruleset_id);
    const catalogVersion =
      engineState.catalogVersion ?? match.catalog_version ?? BOARD_GAME_CATALOG_VERSION;
    if (unexpectedEnding) {
      logBoardGameEvent(this.env, 'UNEXPECTED_MATCH_END', {
        matchId: match.match_id,
        tableId: match.table_id,
        rulesetId,
        catalogVersion,
        round: engineState.round,
        turnNumber: engineState.turnNumber,
        reason:
          !engineState.winnerPlayerIds || engineState.winnerPlayerIds.length === 0
            ? 'no-winner-recorded'
            : 'reached-max-rounds',
      });
    }
    const roleCounts = new Map<string, number>();
    for (const ep of allEnginePlayers) {
      roleCounts.set(ep.roleId, (roleCounts.get(ep.roleId) ?? 0) + 1);
    }
    const roleStatsPayload = allEnginePlayers.map((ep) => ({
      roleId: ep.roleId,
      won: winnerSet.has(ep.playerId),
      survived: ep.alive,
      skillActivations: Math.round(
        (expActivations[ep.roleId] ?? 0) / Math.max(1, roleCounts.get(ep.roleId) ?? 1),
      ),
    }));
    const anonMatchHash = await sha256Hex(`bg-tel:${match.match_id}:${engineState.seed}`);
    await stub
      .fetch('https://internal/__dir/telemetry-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordKey: `tm_${anonMatchHash.slice(0, 28)}`,
          rulesetId,
          catalogVersion,
          playerCount: allEnginePlayers.length,
          durationMs,
          winnerFaction: engineState.winnerFaction ?? 'none',
          unexpectedEnding,
          roles: roleStatsPayload,
        }),
      })
      .catch(() => undefined);
  }

  private async syncDirectoryFromMatch(): Promise<void> {
    const ns = this.env.BOARD_GAME_ROOM;
    const match = this.getMatchRow();
    if (!ns || !match) return;
    const players = this.listPlayerRows();
    const seated = players.filter((p) => p.is_spectator === 0 && p.seat_index !== null);
    const spectators = players.filter((p) => p.is_spectator === 1);
    const hostRow = seated.find((p) => p.player_id === match.host_player_id) ?? seated[0];
    const stub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
    await stub
      .fetch('https://internal/__dir/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.match_id,
          status: match.status,
          hostName: hostRow?.display_name ?? 'Sinh viên',
          rulesetId: sanitizeBoardGameRulesetId(match.ruleset_id),
          playerCount: seated.length,
          spectatorCount: spectators.length,
        }),
      })
      .catch(() => undefined);
  }

  // -------------------------------------------------------------------------
  // WebSocket Message / Close / Error / Alarm Handlers
  // -------------------------------------------------------------------------

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    this.ensureSchema();
    const nowMs = Date.now();
    const attBefore = this.getAttachment(ws);
    const byteLength =
      typeof message === 'string' ? utf8Encoder.encode(message).byteLength : message.byteLength;
    if (byteLength > MAX_WS_PAYLOAD_BYTES) {
      logBoardGameEvent(this.env, 'WEBSOCKET_ERROR', {
        matchId: attBefore?.matchId,
        playerId: attBefore?.playerId,
        reason: 'payload-too-large',
      });
      this.sendError(ws, 'INVALID_ACTION', 'Gói tin vượt quá kích thước cho phép (8 KB).');
      return;
    }
    const rawStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(rawStr);
    } catch {
      logBoardGameEvent(this.env, 'WEBSOCKET_ERROR', {
        matchId: attBefore?.matchId,
        playerId: attBefore?.playerId,
        reason: 'malformed-json',
      });
      this.sendError(ws, 'INVALID_ACTION', 'Thông điệp WebSocket không phải JSON hợp lệ.');
      return;
    }

    const validation = validateBoardGameClientMessage(parsedRaw);
    if (!validation.ok) {
      logBoardGameEvent(this.env, 'ACTION_REJECTED', {
        matchId: attBefore?.matchId,
        playerId: attBefore?.playerId,
        code: validation.code,
        reason: validation.error,
      });
      this.sendError(
        ws,
        validation.code,
        validation.error,
        validation.requestId ? { requestId: validation.requestId } : undefined,
      );
      return;
    }
    const validatedMsg = validation.message;
    const msg = validatedMsg as unknown as Record<string, unknown>;

    // Rate limit per socket
    const rl = this.rateMap.get(ws) ?? {
      windowStartMs: nowMs,
      msgCount: 0,
      joinWindowStartMs: nowMs,
      joinCount: 0,
      lastActionMs: 0,
      lastChatEmoteMs: 0,
    };
    if (nowMs - rl.windowStartMs > WINDOW_MS) {
      rl.windowStartMs = nowMs;
      rl.msgCount = 0;
    }
    if (nowMs - rl.joinWindowStartMs > WINDOW_MS) {
      rl.joinWindowStartMs = nowMs;
      rl.joinCount = 0;
    }
    rl.msgCount += 1;
    this.rateMap.set(ws, rl);
    if (rl.msgCount > MAX_MSGS_PER_WINDOW) {
      logBoardGameEvent(this.env, 'RATE_LIMITED', {
        matchId: attBefore?.matchId,
        playerId: attBefore?.playerId,
        reason: 'ws-msg-burst',
      });
      this.sendError(ws, 'RATE_LIMITED', 'Bạn gửi yêu cầu quá nhanh, vui lòng chậm lại.');
      return;
    }

    if (validatedMsg.type === 'BG_PING') {
      this.send(ws, {
        type: 'BG_PONG',
        serverTimeMs: nowMs,
        ...(typeof validatedMsg.clientTimeMs === 'number'
          ? { clientTimeMs: validatedMsg.clientTimeMs }
          : {}),
      });
      return;
    }

    // Directory socket subscription
    const att = this.getAttachment(ws);
    if (att?.isDirectory) {
      if (validatedMsg.type === 'BG_DIRECTORY_REFRESH') {
        this.send(ws, {
          type: 'BG_DIRECTORY_SYNC',
          matches: this.queryDirectoryMatches(nowMs),
        });
      }
      return;
    }

    if (validatedMsg.type === 'BG_JOIN') {
      rl.joinCount += 1;
      if (rl.joinCount > MAX_JOINS_PER_WINDOW) {
        logBoardGameEvent(this.env, 'RATE_LIMITED', {
          matchId: validatedMsg.matchId,
          reason: 'join-burst',
        });
        this.sendError(
          ws,
          'RATE_LIMITED',
          'Gửi yêu cầu tham gia/kết nối lại quá nhanh, vui lòng chờ giây lát.',
          validation.requestId ? { requestId: validation.requestId } : undefined,
        );
        return;
      }
      // Serialize joins through async promise chain so SHA-256 + seat check stay race-free
      const prev = this.joinChain;
      let release!: () => void;
      this.joinChain = new Promise<void>((res) => {
        release = res;
      });
      try {
        await prev;
        await this.handleJoin(ws, msg);
      } finally {
        release();
      }
      return;
    }

    // All subsequent commands require authenticated socket attachment
    if (!att || !att.playerId) {
      this.sendError(ws, 'UNAUTHORIZED', 'Vui lòng gửi BG_JOIN hợp lệ trước khi thao tác.');
      return;
    }

    // Update last seen timestamp & ensure connection marked alive
    const player = this.getPlayerRow(att.playerId);
    if (!player) {
      this.sendError(ws, 'UNAUTHORIZED', 'Không tìm thấy phiên người chơi trong phòng.');
      return;
    }

    const reqId = sanitizeBoardGameRequestId(msg.requestId) ?? undefined;

    if (validatedMsg.type === 'BG_REQUEST_SYNC') {
      const syncMsg = this.buildStateSyncPayload(att.playerId, att.isSpectator);
      if (syncMsg) {
        this.send(ws, syncMsg);
      } else {
        this.sendError(ws, 'MATCH_NOT_FOUND', 'Phòng chơi không còn tồn tại.', {
          requestId: reqId,
        });
      }
      return;
    }

    if (validatedMsg.type === 'BG_LEAVE') {
      await this.handleLeave(ws, player);
      return;
    }

    if (player.is_spectator === 1) {
      this.sendError(
        ws,
        'SPECTATOR_READ_ONLY',
        'Khán giả chỉ có quyền xem trận đấu, không thể thao tác.',
        { requestId: reqId },
      );
      return;
    }

    if (validatedMsg.type === 'BG_CHAT_EMOTE') {
      if (nowMs - rl.lastChatEmoteMs < EMOTE_COOLDOWN_MS) {
        this.sendError(ws, 'RATE_LIMITED', 'Biểu cảm/nhắn tin đang hồi, chờ giây lát.', {
          requestId: reqId,
        });
        return;
      }
      const emote = isValidBoardGameEmote(msg.emote) ? msg.emote : undefined;
      const text = sanitizeBoardGameChatText(msg.text) ?? undefined;
      if (!emote && !text) return;
      rl.lastChatEmoteMs = nowMs;
      this.broadcastAll({
        type: 'BG_CHAT_EMOTE',
        playerId: player.player_id,
        displayName: player.display_name,
        ...(emote ? { emote } : {}),
        ...(text ? { text } : {}),
        atMs: nowMs,
      });
      return;
    }

    if (validatedMsg.type === 'BG_GAME_ACTION') {
      await this.handleGameAction(ws, player, msg, reqId, rl, nowMs);
      return;
    }

    switch (validatedMsg.type) {
      case 'BG_SELECT_SEAT': {
        await this.handleSelectSeat(ws, player, sanitizeBoardGameSeatIndex(msg.seatIndex), reqId);
        return;
      }
      case 'BG_STAND_UP': {
        await this.handleStandUp(ws, player, reqId);
        return;
      }
      case 'BG_SET_READY': {
        await this.handleSetReady(ws, player, validatedMsg.ready, reqId);
        return;
      }
      case 'BG_SET_RULESET': {
        await this.handleSetRuleset(ws, player, validatedMsg.rulesetId, reqId);
        return;
      }
      case 'BG_START_MATCH': {
        const timeoutOverride =
          typeof validatedMsg.turnTimeoutMs === 'number'
            ? clampBoardGameTurnTimeoutMs(validatedMsg.turnTimeoutMs, this.env)
            : undefined;
        await this.handleStartMatch(ws, player, reqId, timeoutOverride, validatedMsg.rulesetId);
        return;
      }
      default:
        return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.ensureSchema();
    const att = this.getAttachment(ws);
    if (!att || att.isDirectory || !att.playerId || att.replaced) return;

    // Check if another active socket already took over this playerId (4001 fence guard)
    const activeForPlayer = this.findActiveSocketForPlayer(att.playerId, ws);
    if (activeForPlayer) return;

    const match = this.getMatchRow();
    const player = this.getPlayerRow(att.playerId);
    if (!match || !player) return;

    const nowMs = Date.now();
    this.sql.exec(
      'UPDATE match_players SET connected = 0, last_seen_ms = ? WHERE player_id = ?',
      nowMs,
      player.player_id,
    );
    logBoardGameEvent(this.env, 'PLAYER_DISCONNECTED', {
      matchId: match.match_id,
      tableId: match.table_id,
      rulesetId: sanitizeBoardGameRulesetId(match.ruleset_id),
      playerId: player.player_id,
      seatIndex: player.seat_index,
      isSpectator: player.is_spectator === 1,
      status: match.status,
    });
    if (player.is_spectator === 0) {
      await this.emitBetaTelemetryCounters(['disconnections']);
    }

    if (player.is_spectator === 1) {
      // Remove disconnected spectators cleanly so they don't occupy spectator cap
      this.sql.exec('DELETE FROM match_players WHERE player_id = ?', player.player_id);
      this.bumpMatchRevisionAndSchedule(nowMs, match.turn_deadline_ms);
      this.broadcastStateSync();
      await this.syncDirectoryFromMatch();
      return;
    }

    // If host disconnects in lobby, promote next lowest-seat connected player
    if (
      (match.status === 'WAITING' || match.status === 'READY_CHECK' || match.status === 'FINISHED') &&
      match.host_player_id === player.player_id
    ) {
      this.promoteNextConnectedHost(player.player_id);
    }

    // If active turn holder OR pending choice owner disconnects mid-PLAYING, start/cap timer cleanly
    if (match.status === 'PLAYING') {
      const engineState = this.loadEngineState(match);
      const effectiveControllerId = engineState ? getEffectiveTurnControllerId(engineState) : null;
      if (engineState?.pendingChoice?.ownerPlayerId === player.player_id) {
        const disconnChoiceMs =
          this.env.ALLOW_SHORT_TURN_TIMEOUT === '1'
            ? Math.min(800, BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS)
            : BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS;
        const cappedChoiceDeadline = Math.min(
          engineState.pendingChoice.deadlineMs,
          nowMs + disconnChoiceMs,
        );
        // Phase 6A Privacy Hardening: giữ nguyên publicDeadlineMs ban đầu cho secret choice
        // để đối thủ không thể phát hiện chủ nhân secret choice vừa rớt mạng!
        if (engineState.pendingChoice.isSecret && engineState.pendingChoice.publicDeadlineMs === undefined) {
          engineState.pendingChoice.publicDeadlineMs = engineState.pendingChoice.deadlineMs;
        }
        engineState.pendingChoice.deadlineMs = cappedChoiceDeadline;
        this.sql.exec(
          'UPDATE matches SET turn_deadline_ms = ?, game_state_json = ? WHERE match_id = ?',
          cappedChoiceDeadline,
          JSON.stringify({ rulesetVersion: BOARD_GAME_RULESET_VERSION, engineState }),
          match.match_id,
        );
      } else if (effectiveControllerId && effectiveControllerId === player.player_id) {
        const holdWindow =
          match.turn_timeout_ms <= 0
            ? BOARD_GAME_RECONNECT_HOLD_MS
            : BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS;
        const capped = Math.min(
          match.turn_deadline_ms ?? nowMs + holdWindow,
          nowMs + holdWindow,
        );
        this.sql.exec('UPDATE matches SET turn_deadline_ms = ? WHERE match_id = ?', capped, match.match_id);
      }
    }

    await this.scheduleNextAlarm(nowMs);
    this.bumpMatchRevisionOnly(nowMs);
    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const att = this.getAttachment(ws);
    logBoardGameEvent(this.env, 'WEBSOCKET_ERROR', {
      matchId: att?.matchId,
      playerId: att?.playerId,
      reason: 'socket-error-event',
    });
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    this.ensureSchema();
    const match = this.getMatchRow();
    if (!match || match.status === 'CLOSED') return;
    const nowMs = Date.now();

    // Expire orphaned CREATED lobbies that never received a player join
    if (
      match.status === 'CREATED' &&
      nowMs - match.created_at_ms >= BOARD_GAME_RECONNECT_HOLD_MS
    ) {
      this.sql.exec(
        'UPDATE matches SET status = ?, updated_at_ms = ? WHERE match_id = ?',
        'CLOSED',
        nowMs,
        match.match_id,
      );
      logBoardGameEvent(this.env, 'MATCH_CLEANED_UP', {
        matchId: match.match_id,
        tableId: match.table_id,
        status: 'CLOSED',
        reason: 'created-orphan-timeout',
      });
      await this.syncDirectoryFromMatch();
      return;
    }

    // Expire abandoned PLAYING matches when every seated player has disconnected past TTL
    if (match.status === 'PLAYING') {
      const disconnAgg = this.sql
        .exec<{ connected_count: number | null; max_seen: number | null }>(
          `SELECT
             SUM(CASE WHEN connected = 1 AND is_spectator = 0 THEN 1 ELSE 0 END) AS connected_count,
             MAX(CASE WHEN is_spectator = 0 THEN last_seen_ms ELSE NULL END) AS max_seen
           FROM match_players`,
        )
        .one();
      const connectedPlayers = Number(disconnAgg?.connected_count ?? 0);
      const maxLastSeen = disconnAgg?.max_seen;
      if (
        connectedPlayers === 0 &&
        typeof maxLastSeen === 'number' &&
        nowMs - maxLastSeen >= BOARD_GAME_ABANDONED_MATCH_TTL_MS
      ) {
        this.sql.exec(
          'UPDATE matches SET status = ?, turn_deadline_ms = NULL, updated_at_ms = ? WHERE match_id = ?',
          'CLOSED',
          nowMs,
          match.match_id,
        );
        logBoardGameEvent(this.env, 'MATCH_ABANDONED', {
          matchId: match.match_id,
          tableId: match.table_id,
          rulesetId: sanitizeBoardGameRulesetId(match.ruleset_id),
          status: 'CLOSED',
          reason: 'all-players-abandoned',
        });
        logBoardGameEvent(this.env, 'MATCH_CLEANED_UP', {
          matchId: match.match_id,
          tableId: match.table_id,
          rulesetId: sanitizeBoardGameRulesetId(match.ruleset_id),
          status: 'CLOSED',
          reason: 'all-players-abandoned',
        });
        await this.emitBetaTelemetryCounters(['matches_abandoned']);
        await this.syncDirectoryFromMatch();
        return;
      }
    }

    // Auto-advance expired pending choices or turns during PLAYING so an AFK/disconnected player never stalls the table
    if (
      match.status === 'PLAYING' &&
      typeof match.turn_deadline_ms === 'number' &&
      nowMs >= match.turn_deadline_ms - 50
    ) {
      const rows = this.listPlayerRows();
      const engineState = this.loadEngineState(match, rows);
      if (engineState && (!engineState.finished || match.status === 'PLAYING')) {
        const wasChoiceTimeout = Boolean(
          engineState.pendingChoice && nowMs >= engineState.pendingChoice.deadlineMs - 50,
        );
        const choiceKindForLog = engineState.pendingChoice
          ? engineState.pendingChoice.isSecret
            ? 'secret'
            : engineState.pendingChoice.kind
          : undefined;
        const timedOutPlayerId =
          engineState.pendingChoice?.isSecret
            ? undefined
            : (engineState.pendingChoice?.ownerPlayerId ??
              getEffectiveTurnControllerId(engineState) ??
              getActivePlayer(engineState)?.playerId);
        if (!engineState.finished) {
          if (wasChoiceTimeout) {
            applyPendingChoiceTimeout(engineState, nowMs);
          } else {
            applyTimeoutAutoTurn(engineState, nowMs);
          }
        }
        const nextStatus: BoardGameMatchStatus = engineState.finished ? 'FINISHED' : 'PLAYING';
        const nextDeadline = engineState.finished
          ? null
          : this.computeNextTurnDeadline(engineState, rows, match.turn_timeout_ms, nowMs);
        if (engineState.finished) {
          this.sql.exec('UPDATE match_players SET ready = 0');
        }
        this.sql.exec(
          `UPDATE matches
           SET status = ?, revision = revision + 1, turn_deadline_ms = ?, updated_at_ms = ?, game_state_json = ?
           WHERE match_id = ?`,
          nextStatus,
          nextDeadline,
          nowMs,
          JSON.stringify({ rulesetVersion: BOARD_GAME_RULESET_VERSION, engineState }),
          match.match_id,
        );
        logBoardGameEvent(this.env, wasChoiceTimeout ? 'CHOICE_TIMEOUT' : 'TURN_TIMEOUT', {
          matchId: match.match_id,
          tableId: match.table_id,
          rulesetId: engineState.rulesetId ?? sanitizeBoardGameRulesetId(match.ruleset_id),
          playerId: timedOutPlayerId,
          pendingChoiceKind: choiceKindForLog,
          status: nextStatus,
          round: engineState.round,
          turnNumber: engineState.turnNumber,
        });
        await this.emitBetaTelemetryCounters([
          wasChoiceTimeout ? 'choice_timeouts' : 'turn_timeouts',
        ]);
        if (engineState.finished) {
          logBoardGameEvent(this.env, 'MATCH_FINISHED', {
            matchId: match.match_id,
            tableId: match.table_id,
            status: 'FINISHED',
            round: engineState.round,
            turnNumber: engineState.turnNumber,
            winnerFaction: engineState.winnerFaction,
          });
          await this.recordFinishedMatchToLeaderboard(nowMs);
        }
        await this.scheduleNextAlarm(nowMs);
        this.broadcastStateSync();
        await this.syncDirectoryFromMatch();
        return;
      }
    }

    // Release lobby seats of players disconnected longer than BOARD_GAME_RECONNECT_HOLD_MS
    if (match.status === 'WAITING' || match.status === 'READY_CHECK' || match.status === 'FINISHED') {
      const stalePlayers = this.sql
        .exec<MatchPlayerDbRow>(
          'SELECT * FROM match_players WHERE connected = 0 AND last_seen_ms <= ?',
          nowMs - BOARD_GAME_RECONNECT_HOLD_MS,
        )
        .toArray();
      if (stalePlayers.length > 0) {
        for (const sp of stalePlayers) {
          this.sql.exec('DELETE FROM match_players WHERE player_id = ?', sp.player_id);
        }
        const remainingSeated = this.listPlayerRows().filter(
          (p) => p.is_spectator === 0 && p.seat_index !== null,
        );
        if (remainingSeated.length === 0) {
          this.sql.exec(
            'UPDATE matches SET status = ?, updated_at_ms = ? WHERE match_id = ?',
            'CLOSED',
            nowMs,
            match.match_id,
          );
          logBoardGameEvent(this.env, 'MATCH_CLEANED_UP', {
            matchId: match.match_id,
            tableId: match.table_id,
            status: 'CLOSED',
            cleanedCount: stalePlayers.length,
            reason: 'lobby-stale-empty',
          });
          await this.syncDirectoryFromMatch();
          return;
        }
        if (!remainingSeated.some((p) => p.player_id === match.host_player_id)) {
          this.promoteNextConnectedHost(match.host_player_id);
        }
        this.recomputeLobbyStatus();
        this.broadcastStateSync();
        await this.syncDirectoryFromMatch();
      }
    }

    // Clean finished matches after TTL
    if (match.status === 'FINISHED' && nowMs - match.updated_at_ms >= BOARD_GAME_FINISHED_TTL_MS) {
      this.sql.exec(
        'UPDATE matches SET status = ?, updated_at_ms = ? WHERE match_id = ?',
        'CLOSED',
        nowMs,
        match.match_id,
      );
      logBoardGameEvent(this.env, 'MATCH_CLEANED_UP', {
        matchId: match.match_id,
        tableId: match.table_id,
        status: 'CLOSED',
        reason: 'finished-ttl-expired',
      });
      await this.syncDirectoryFromMatch();
      return;
    }

    await this.scheduleNextAlarm(nowMs);
  }

  // -------------------------------------------------------------------------
  // Match Handlers (BG2)
  // -------------------------------------------------------------------------

  private async handleJoin(ws: WebSocket, msg: Record<string, unknown>): Promise<void> {
    const match = this.getMatchRow();
    const reqId = sanitizeBoardGameRequestId(msg.requestId) ?? undefined;
    if (!match || match.status === 'CLOSED') {
      this.sendError(ws, 'MATCH_NOT_FOUND', 'Phòng chơi không tồn tại hoặc đã đóng.', {
        requestId: reqId,
      });
      return;
    }

    const nowMs = Date.now();
    const rawInvite = msg.inviteCode !== undefined ? sanitizeInviteCode(msg.inviteCode) : null;
    if (msg.inviteCode !== undefined && rawInvite !== match.invite_code) {
      this.sendError(ws, 'INVALID_INVITE', 'Mã mời không khớp với phòng này.', {
        requestId: reqId,
      });
      return;
    }

    const displayName = sanitizeBoardGameName(msg.displayName);
    const appearanceJson = JSON.stringify(sanitizeBoardGameAppearance(msg.appearance));
    const cleanPlayerKey = sanitizeBoardGamePlayerKey(msg.playerKey);
    const hasSuppliedTokenRaw =
      typeof msg.reconnectToken === 'string' && msg.reconnectToken.trim().length > 0;
    const suppliedToken = sanitizeBoardGameToken(msg.reconnectToken);
    if (hasSuppliedTokenRaw && !suppliedToken) {
      this.sendError(
        ws,
        'UNAUTHORIZED',
        'Token kết nối lại không đúng định dạng.',
        { requestId: reqId },
      );
      return;
    }
    const wantsSpectator = Boolean(msg.asSpectator);
    const preferredSeat = sanitizeBoardGameSeatIndex(msg.preferredSeatIndex);

    // Try token-based authenticated reconnect first
    if (suppliedToken) {
      const tokenHash = await sha256Hex(suppliedToken);
      const latestMatch = this.getMatchRow();
      if (!latestMatch || latestMatch.status === 'CLOSED') {
        this.sendError(ws, 'MATCH_NOT_FOUND', 'Phòng chơi không tồn tại hoặc đã đóng.', {
          requestId: reqId,
        });
        return;
      }
      const existing = this.findPlayerByTokenHash(tokenHash);
      if (existing) {
        // Fence any prior live WebSocket belonging to this playerId with close code 4001
        this.fenceExistingSockets(existing.player_id, ws);
        const hashedLbKey =
          existing.is_spectator === 0 && cleanPlayerKey
            ? await this.hashLeaderboardKey(cleanPlayerKey)
            : null;
        this.sql.exec(
          `UPDATE match_players
           SET connected = 1,
               display_name = ?,
               outfit_json = ?,
               last_seen_ms = ?,
               leaderboard_key = COALESCE(?, leaderboard_key)
           WHERE player_id = ?`,
          displayName,
          appearanceJson,
          nowMs,
          hashedLbKey,
          existing.player_id,
        );
        if (latestMatch.status === 'WAITING' || latestMatch.status === 'READY_CHECK') {
          this.recomputeLobbyStatus();
        }
        const connId = randomBase64Url(9);
        this.setAttachment(ws, {
          matchId: latestMatch.match_id,
          playerId: existing.player_id,
          connectionId: connId,
          isSpectator: existing.is_spectator === 1,
        });
        this.send(ws, {
          type: 'BG_AUTH_ISSUED',
          protocolVersion: BOARD_GAME_PROTOCOL_VERSION,
          matchId: latestMatch.match_id,
          inviteCode: latestMatch.invite_code,
          playerId: existing.player_id,
          reconnectToken: suppliedToken,
          isSpectator: existing.is_spectator === 1,
          seatIndex: existing.seat_index,
        });
        if (latestMatch.status === 'PLAYING') {
          const postRows = this.listPlayerRows();
          const engineState = this.loadEngineState(latestMatch, postRows);
          const effectiveControllerId = engineState
            ? getEffectiveTurnControllerId(engineState)
            : null;
          if (
            effectiveControllerId &&
            effectiveControllerId === existing.player_id &&
            latestMatch.turn_timeout_ms <= 0
          ) {
            this.sql.exec(
              'UPDATE matches SET turn_deadline_ms = NULL WHERE match_id = ?',
              latestMatch.match_id,
            );
          }
        }
        this.bumpMatchRevisionOnly(nowMs);
        await this.scheduleNextAlarm(nowMs);
        logBoardGameEvent(this.env, 'PLAYER_RECONNECTED', {
          matchId: latestMatch.match_id,
          tableId: latestMatch.table_id,
          rulesetId: sanitizeBoardGameRulesetId(latestMatch.ruleset_id),
          playerId: existing.player_id,
          seatIndex: existing.seat_index,
          isSpectator: existing.is_spectator === 1,
          status: latestMatch.status,
        });
        await this.emitBetaTelemetryCounters(['reconnect_attempts']);
        this.broadcastStateSync();
        await this.syncDirectoryFromMatch();
        return;
      }
      // Security: Reject any unknown/expired/wrong-match reconnectToken across ALL match states.
      logBoardGameEvent(this.env, 'ACTION_REJECTED', {
        matchId: latestMatch.match_id,
        code: 'UNAUTHORIZED',
        reason: 'invalid-reconnect-token',
      });
      this.sendError(
        ws,
        'UNAUTHORIZED',
        'Token kết nối lại không hợp lệ, thuộc phòng khác hoặc phiên đã hết hạn.',
        { requestId: reqId },
      );
      return;
    }

    // Fresh join path — generate new CSPRNG 256-bit reconnectToken
    const rawToken = randomBase64Url(32);
    const tokenHash = await sha256Hex(rawToken);
    const latestMatch = this.getMatchRow();
    if (!latestMatch || latestMatch.status === 'CLOSED') {
      this.sendError(ws, 'MATCH_NOT_FOUND', 'Phòng chơi không tồn tại hoặc đã đóng.');
      return;
    }

    const currentPlayers = this.listPlayerRows();
    const seatedPlayers = currentPlayers.filter((p) => p.is_spectator === 0 && p.seat_index !== null);
    const spectators = currentPlayers.filter((p) => p.is_spectator === 1);

    let assignedSeat: number | null = null;
    let isSpectator = false;

    if (wantsSpectator) {
      if (spectators.length >= BOARD_GAME_MAX_SPECTATORS) {
        this.sendError(ws, 'ROOM_FULL', 'Khu vực khán giả đã đủ chỗ.');
        return;
      }
      isSpectator = true;
    } else {
      if (latestMatch.status === 'PLAYING' || latestMatch.status === 'FINISHED') {
        this.sendError(
          ws,
          'ROOM_FULL',
          'Ván đấu đang diễn ra; hãy tham gia bằng chế độ khán giả.',
        );
        return;
      }
      if (seatedPlayers.length >= BOARD_GAME_MAX_PLAYERS) {
        this.sendError(ws, 'ROOM_FULL', 'Bàn chơi đã đủ 8/8 ghế.');
        return;
      }
      const takenSeats = new Set(seatedPlayers.map((p) => p.seat_index));
      if (preferredSeat !== null && !takenSeats.has(preferredSeat)) {
        assignedSeat = preferredSeat;
      } else {
        for (let i = 0; i < BOARD_GAME_MAX_PLAYERS; i++) {
          if (!takenSeats.has(i)) {
            assignedSeat = i;
            break;
          }
        }
      }
      if (assignedSeat === null) {
        this.sendError(ws, 'ROOM_FULL', 'Không còn ghế trống tại bàn.');
        return;
      }
    }

    const playerId = `bgp_${randomBase64Url(8)}`;
    const hashedLbKey = isSpectator
      ? null
      : await this.hashLeaderboardKey(cleanPlayerKey ?? playerId);
    try {
      this.sql.exec(
        `INSERT INTO match_players (
          player_id, seat_index, display_name, outfit_json, is_spectator, ready, connected, reconnect_token_hash, last_seen_ms, leaderboard_key
        ) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?)`,
        playerId,
        assignedSeat,
        displayName,
        appearanceJson,
        isSpectator ? 1 : 0,
        tokenHash,
        nowMs,
        hashedLbKey,
      );
    } catch {
      this.sendError(ws, 'SEAT_TAKEN', 'Ghế vừa có người khác ngồi trước, vui lòng thử lại.');
      return;
    }

    // Assign host & advance CREATED -> WAITING when first seated player enters
    let nextHost = latestMatch.host_player_id;
    let nextStatus = latestMatch.status;
    if (!isSpectator) {
      if (!nextHost || !seatedPlayers.some((p) => p.player_id === nextHost)) {
        nextHost = playerId;
      }
      if (nextStatus === 'CREATED' && canTransitionBoardGameStatus('CREATED', 'WAITING')) {
        nextStatus = 'WAITING';
      }
    }

    this.sql.exec(
      'UPDATE matches SET host_player_id = ?, status = ?, revision = revision + 1, updated_at_ms = ? WHERE match_id = ?',
      nextHost,
      nextStatus,
      nowMs,
      latestMatch.match_id,
    );
    if (!isSpectator) {
      this.recomputeLobbyStatus();
    }

    const connId = randomBase64Url(9);
    this.setAttachment(ws, {
      matchId: latestMatch.match_id,
      playerId,
      connectionId: connId,
      isSpectator,
    });

    await this.scheduleNextAlarm(nowMs);
    logBoardGameEvent(this.env, 'PLAYER_JOINED', {
      matchId: latestMatch.match_id,
      tableId: latestMatch.table_id,
      playerId,
      seatIndex: assignedSeat,
      isSpectator,
      status: this.getMatchRow()?.status ?? nextStatus,
    });

    // Send secret 256-bit reconnectToken UNICAST ONCE exclusively to joining client
    this.send(ws, {
      type: 'BG_AUTH_ISSUED',
      protocolVersion: BOARD_GAME_PROTOCOL_VERSION,
      matchId: latestMatch.match_id,
      inviteCode: latestMatch.invite_code,
      playerId,
      reconnectToken: rawToken,
      isSpectator,
      seatIndex: assignedSeat,
    });

    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
  }

  private async handleSelectSeat(
    ws: WebSocket,
    player: MatchPlayerDbRow,
    seatIndex: number | null,
    requestId?: string,
  ): Promise<void> {
    const match = this.getMatchRow();
    if (!match) return;
    if (match.status === 'PLAYING' || match.status === 'STARTING' || match.status === 'CLOSED') {
      this.sendError(ws, 'INVALID_ACTION', 'Không thể đổi ghế khi ván đang diễn ra.', { requestId });
      return;
    }
    if (seatIndex === null) {
      this.sendError(ws, 'INVALID_ACTION', 'Chỉ số ghế không hợp lệ (0..7).', { requestId });
      return;
    }
    const occupied = this.sql
      .exec<{ player_id: string }>(
        'SELECT player_id FROM match_players WHERE seat_index = ? AND is_spectator = 0 LIMIT 1',
        seatIndex,
      )
      .toArray();
    if (occupied[0] && occupied[0].player_id !== player.player_id) {
      this.sendError(ws, 'SEAT_TAKEN', 'Ghế này đã có sinh viên khác ngồi.', { requestId });
      return;
    }
    const nowMs = Date.now();
    this.sql.exec(
      'UPDATE match_players SET seat_index = ?, ready = 0, last_seen_ms = ? WHERE player_id = ?',
      seatIndex,
      nowMs,
      player.player_id,
    );
    this.recomputeLobbyStatus();
    this.bumpMatchRevisionOnly(nowMs);
    if (requestId) {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId,
        ok: true,
        revision: this.getMatchRow()?.revision ?? match.revision + 1,
      });
    }
    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
  }

  private async handleStandUp(
    ws: WebSocket,
    player: MatchPlayerDbRow,
    requestId?: string,
  ): Promise<void> {
    const match = this.getMatchRow();
    if (!match) return;
    if (match.status === 'PLAYING' || match.status === 'STARTING') {
      this.sendError(ws, 'INVALID_ACTION', 'Không thể đứng dậy rời ghế giữa ván đấu.', { requestId });
      return;
    }
    const nowMs = Date.now();
    this.sql.exec(
      'UPDATE match_players SET seat_index = NULL, is_spectator = 1, ready = 0, last_seen_ms = ? WHERE player_id = ?',
      nowMs,
      player.player_id,
    );
    const att = this.getAttachment(ws);
    if (att) {
      this.setAttachment(ws, { ...att, isSpectator: true });
    }
    if (match.host_player_id === player.player_id) {
      this.promoteNextConnectedHost(player.player_id);
    }
    this.recomputeLobbyStatus();
    this.bumpMatchRevisionOnly(nowMs);
    if (requestId) {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId,
        ok: true,
        revision: this.getMatchRow()?.revision ?? match.revision + 1,
      });
    }
    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
  }

  private async handleSetReady(
    ws: WebSocket,
    player: MatchPlayerDbRow,
    ready: boolean,
    requestId?: string,
  ): Promise<void> {
    const match = this.getMatchRow();
    if (!match) return;
    if (match.status !== 'WAITING' && match.status !== 'READY_CHECK' && match.status !== 'FINISHED') {
      this.sendError(ws, 'INVALID_ACTION', 'Chỉ có thể sẵn sàng khi ở sảnh chờ.', { requestId });
      return;
    }
    if (player.seat_index === null) {
      this.sendError(ws, 'INVALID_ACTION', 'Bạn cần ngồi vào một ghế trước khi Sẵn sàng.', { requestId });
      return;
    }
    const nowMs = Date.now();
    this.sql.exec(
      'UPDATE match_players SET ready = ?, last_seen_ms = ? WHERE player_id = ?',
      ready ? 1 : 0,
      nowMs,
      player.player_id,
    );
    if (match.status === 'FINISHED' && canTransitionBoardGameStatus('FINISHED', 'WAITING')) {
      this.sql.exec('DELETE FROM processed_requests');
      this.sql.exec('UPDATE match_players SET ready = 0 WHERE player_id != ?', player.player_id);
      this.sql.exec(
        'UPDATE matches SET status = ?, game_state_json = NULL, turn_deadline_ms = NULL, updated_at_ms = ? WHERE match_id = ?',
        'WAITING',
        nowMs,
        match.match_id,
      );
    }
    this.recomputeLobbyStatus();
    this.bumpMatchRevisionOnly(nowMs);
    if (requestId) {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId,
        ok: true,
        revision: this.getMatchRow()?.revision ?? match.revision + 1,
      });
    }
    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
  }

  private async handleSetRuleset(
    ws: WebSocket,
    player: MatchPlayerDbRow,
    rulesetId: BoardGameRulesetId,
    requestId?: string,
  ): Promise<void> {
    const match = this.getMatchRow();
    if (!match) return;
    if (match.host_player_id !== player.player_id) {
      this.sendError(ws, 'NOT_HOST', 'Chỉ trưởng bàn (Host) mới được thay đổi bộ luật.', {
        requestId,
      });
      return;
    }
    if (match.status === 'PLAYING' || match.status === 'STARTING' || match.status === 'CLOSED') {
      this.sendError(
        ws,
        'INVALID_ACTION',
        'Không thể đổi bộ luật khi ván đấu đã bắt đầu hoặc đã đóng.',
        { requestId },
      );
      return;
    }

    const validationOpts = this.getRulesetValidationOptions();
    const validation = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(
      rulesetId,
      BOARD_GAME_MIN_PLAYERS,
      validationOpts,
    );
    if (!validation.ok) {
      this.sendError(ws, validation.code, validation.error, { requestId });
      return;
    }

    const nowMs = Date.now();
    this.sql.exec(
      'UPDATE matches SET ruleset_id = ?, catalog_version = ?, revision = revision + 1, updated_at_ms = ? WHERE match_id = ?',
      validation.ruleset.id,
      validation.catalogVersion,
      nowMs,
      match.match_id,
    );
    const updated = this.getMatchRow();
    logBoardGameEvent(this.env, 'RULESET_CHANGED', {
      matchId: match.match_id,
      tableId: match.table_id,
      rulesetId: validation.ruleset.id,
      catalogVersion: validation.catalogVersion,
      playerId: player.player_id,
      revision: updated?.revision ?? match.revision + 1,
    });
    if (requestId && updated) {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId,
        ok: true,
        revision: updated.revision,
      });
    }
    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
  }

  private async handleStartMatch(
    ws: WebSocket,
    player: MatchPlayerDbRow,
    requestId?: string,
    turnTimeoutOverrideMs?: number,
    rulesetOverrideId?: BoardGameRulesetId,
  ): Promise<void> {
    const match = this.getMatchRow();
    if (!match) return;
    if (match.host_player_id !== player.player_id) {
      this.sendError(ws, 'NOT_HOST', 'Chỉ trưởng bàn (Host) mới được bắt đầu ván đấu.', { requestId });
      return;
    }
    if (match.status === 'PLAYING' || match.status === 'STARTING') {
      this.sendError(ws, 'INVALID_ACTION', 'Ván đấu đã bắt đầu.', { requestId });
      return;
    }

    const seated = this.listPlayerRows().filter(
      (p) => p.is_spectator === 0 && p.seat_index !== null && p.connected === 1,
    );
    if (seated.length < BOARD_GAME_MIN_PLAYERS || seated.length > BOARD_GAME_MAX_PLAYERS) {
      this.sendError(
        ws,
        'NOT_READY',
        `Cần từ ${BOARD_GAME_MIN_PLAYERS} đến ${BOARD_GAME_MAX_PLAYERS} người ngồi ghế để bắt đầu (hiện có ${seated.length}).`,
        { requestId },
      );
      return;
    }

    const unreadyOthers = seated.filter((p) => p.player_id !== match.host_player_id && p.ready !== 1);
    if (unreadyOthers.length > 0) {
      this.sendError(
        ws,
        'NOT_READY',
        `Còn ${unreadyOthers.length} thành viên chưa bấm Sẵn sàng.`,
        { requestId },
      );
      return;
    }

    // Khóa và xác thực bộ luật & phiên bản catalog tại server trước khi khởi tạo ván
    const validationOpts = this.getRulesetValidationOptions();
    const requestedRulesetId =
      rulesetOverrideId ?? match.ruleset_id ?? BOARD_GAME_DEFAULT_RULESET_ID;
    const rulesetValidation = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch(
      requestedRulesetId,
      seated.length,
      validationOpts,
    );
    if (!rulesetValidation.ok) {
      this.sendError(ws, rulesetValidation.code, rulesetValidation.error, { requestId });
      return;
    }
    const lockedRulesetId = rulesetValidation.ruleset.id;
    const lockedCatalogVersion = rulesetValidation.catalogVersion;

    const nowMs = Date.now();
    // Clean any disconnected or unseated ghost lobby rows before locking PLAYING roster
    this.sql.exec(
      'DELETE FROM match_players WHERE is_spectator = 0 AND (connected = 0 OR seat_index IS NULL)',
    );
    // Mark host ready too cleanly, walk WAITING/READY_CHECK -> STARTING -> PLAYING
    this.sql.exec('UPDATE match_players SET ready = 1 WHERE player_id = ?', player.player_id);
    if (canTransitionBoardGameStatus(match.status, 'STARTING')) {
      this.sql.exec(
        'UPDATE matches SET status = ?, updated_at_ms = ? WHERE match_id = ?',
        'STARTING',
        nowMs,
        match.match_id,
      );
    }

    const timeoutMs = turnTimeoutOverrideMs ?? match.turn_timeout_ms ?? BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS;
    const deadlineMs = timeoutMs <= 0 ? null : nowMs + timeoutMs;

    const seedArr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(seedArr);
    const seed = (seedArr[0] >>> 0) || 1337;

    const rawChoiceTimeout = Number(this.env.CHOICE_TIMEOUT_OVERRIDE_MS);
    const choiceTimeoutMs =
      Number.isFinite(rawChoiceTimeout) && rawChoiceTimeout >= 300
        ? Math.floor(rawChoiceTimeout)
        : BOARD_GAME_CHOICE_TIMEOUT_MS;

    const engineState = createInitialGameState({
      matchId: match.match_id,
      seed,
      nowMs,
      rulesetId: lockedRulesetId,
      allowExperimental: validationOpts.allowExperimental,
      productionBeta: validationOpts.productionBeta,
      choiceTimeoutMs,
      players: seated.map((p) => ({
        playerId: p.player_id,
        displayName: p.display_name,
        seatIndex: p.seat_index ?? 0,
        appearance: sanitizeBoardGameAppearance(parseJsonObject(p.outfit_json)),
        connected: p.connected === 1,
      })),
    });

    this.sql.exec('DELETE FROM processed_requests');
    this.sql.exec(
      `UPDATE matches
       SET status = 'PLAYING',
           revision = revision + 1,
           turn_deadline_ms = ?,
           turn_timeout_ms = ?,
           updated_at_ms = ?,
           leaderboard_recorded = 0,
           ruleset_id = ?,
           catalog_version = ?,
           game_state_json = ?
       WHERE match_id = ?`,
      deadlineMs,
      timeoutMs,
      nowMs,
      lockedRulesetId,
      lockedCatalogVersion,
      JSON.stringify({ rulesetVersion: BOARD_GAME_RULESET_VERSION, engineState }),
      match.match_id,
    );

    await this.scheduleNextAlarm(nowMs);
    logBoardGameEvent(this.env, 'MATCH_STARTED', {
      matchId: match.match_id,
      tableId: match.table_id,
      rulesetId: lockedRulesetId,
      catalogVersion: lockedCatalogVersion,
      status: 'PLAYING',
      playerCount: seated.length,
      revision: match.revision + 1,
      round: engineState.round,
      turnNumber: engineState.turnNumber,
    });
    await this.emitBetaTelemetryCounters([
      'matches_started',
      `player_count_started:${seated.length}`,
    ]);
    if (requestId) {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId,
        ok: true,
        revision: this.getMatchRow()?.revision ?? match.revision + 1,
      });
    }
    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
  }

  private async handleGameAction(
    ws: WebSocket,
    player: MatchPlayerDbRow,
    msg: Record<string, unknown>,
    reqId: string | undefined,
    rl: SocketRateState,
    nowMs: number,
  ): Promise<void> {
    const match = this.getMatchRow();
    const curRev = match?.revision ?? 0;

    if (!reqId) {
      this.sendError(ws, 'INVALID_ACTION', 'Thiếu requestId cho hành động trong ván.');
      return;
    }

    // 1. Idempotency check BEFORE rate throttling so legitimate retries always resolve cleanly
    const existingReq = this.sql
      .exec<{ revision: number }>(
        'SELECT revision FROM processed_requests WHERE player_id = ? AND request_id = ? LIMIT 1',
        player.player_id,
        reqId,
      )
      .toArray();
    if (existingReq.length > 0) {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: true,
        revision: existingReq[0].revision,
      });
      const resync = this.buildStateSyncPayload(player.player_id, false);
      if (resync) this.send(ws, resync);
      return;
    }

    // 2. Per-socket mutation cadence throttle
    if (nowMs - rl.lastActionMs < MIN_ACTION_INTERVAL_MS) {
      logBoardGameEvent(this.env, 'RATE_LIMITED', {
        matchId: match?.match_id,
        tableId: match?.table_id,
        playerId: player.player_id,
        reason: 'action-burst',
      });
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: false,
        revision: curRev,
        reason: 'Thao tác quá nhanh.',
      });
      this.sendError(ws, 'RATE_LIMITED', 'Thao tác quá nhanh.', {
        requestId: reqId,
        revision: curRev,
      });
      return;
    }
    rl.lastActionMs = nowMs;

    if (!match || match.status !== 'PLAYING') {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: false,
        revision: curRev,
        reason: 'Ván đấu chưa ở trạng thái đang chơi.',
      });
      this.sendError(ws, 'INVALID_ACTION', 'Ván đấu chưa ở trạng thái đang chơi.', {
        requestId: reqId,
        revision: curRev,
      });
      return;
    }

    // 3. Optimistic concurrency check (`expectedRevision`)
    if (typeof msg.expectedRevision !== 'number' || msg.expectedRevision !== match.revision) {
      const latestSync = this.buildStateSyncPayload(player.player_id, false);
      if (latestSync) this.send(ws, latestSync);
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: false,
        revision: match.revision,
        reason: 'Trạng thái bàn vừa cập nhật mới hơn; vui lòng thử lại.',
      });
      this.sendError(ws, 'STALE_REVISION', 'Trạng thái bàn đã thay đổi, vừa đồng bộ lại.', {
        requestId: reqId,
        revision: match.revision,
      });
      return;
    }

    const actionCheck = validateBoardGameActionPayload(msg.action);
    if (!actionCheck.ok) {
      logBoardGameEvent(this.env, 'ACTION_REJECTED', {
        matchId: match.match_id,
        tableId: match.table_id,
        playerId: player.player_id,
        code: 'INVALID_ACTION',
        reason: actionCheck.error,
      });
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: false,
        revision: match.revision,
        reason: actionCheck.error,
      });
      this.sendError(ws, 'INVALID_ACTION', actionCheck.error, {
        requestId: reqId,
        revision: match.revision,
      });
      return;
    }
    const actionPayload = actionCheck.action;

    const playerRows = this.listPlayerRows();
    const engineState = this.loadEngineState(match, playerRows);
    if (!engineState) {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: false,
        revision: match.revision,
        reason: 'Không đọc được trạng thái ván đấu trên máy chủ.',
      });
      this.sendError(ws, 'INVALID_ACTION', 'Không đọc được trạng thái ván đấu.', {
        requestId: reqId,
        revision: match.revision,
      });
      return;
    }

    if (engineState.finished && match.status === 'PLAYING') {
      const nextRev = match.revision + 1;
      this.sql.exec('UPDATE match_players SET ready = 0');
      this.sql.exec(
        `UPDATE matches
         SET status = 'FINISHED', revision = ?, turn_deadline_ms = NULL, updated_at_ms = ?, game_state_json = ?
         WHERE match_id = ?`,
        nextRev,
        nowMs,
        JSON.stringify({ rulesetVersion: BOARD_GAME_RULESET_VERSION, engineState }),
        match.match_id,
      );
      this.broadcastStateSync();
      await this.syncDirectoryFromMatch();
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: false,
        revision: nextRev,
        reason: engineState.winReason ?? 'Phiên ván cũ đã được khép an toàn khi nâng cấp lên Luật v3.',
      });
      return;
    }

    const prevTurnNumber = engineState.turnNumber;
    let res: ReturnType<typeof applyPlayerGameAction>;
    try {
      res = applyPlayerGameAction(engineState, player.player_id, actionPayload, nowMs);
    } catch (err) {
      logBoardGameEvent(this.env, 'ENGINE_ERROR', {
        matchId: match.match_id,
        tableId: match.table_id,
        rulesetId: engineState.rulesetId ?? sanitizeBoardGameRulesetId(match.ruleset_id),
        playerId: player.player_id,
        actionType: actionPayload.type,
        reason: err instanceof Error ? err.message.slice(0, 120) : 'engine-exception',
      });
      await this.emitBetaTelemetryCounters(['engine_errors', 'unhandled_exceptions']);
      this.sendError(ws, 'INVALID_ACTION', 'Lỗi xử lý nước đi trên máy chủ, trạng thái ván được bảo toàn.', {
        requestId: reqId,
        revision: match.revision,
      });
      return;
    }
    if (!res.ok) {
      const reason = res.reason || res.error || 'Hành động không hợp lệ ở pha hiện tại.';
      const errCode = reason.toLowerCase().includes('chưa tới lượt') ? 'NOT_YOUR_TURN' : 'INVALID_ACTION';
      logBoardGameEvent(this.env, 'ACTION_REJECTED', {
        matchId: match.match_id,
        tableId: match.table_id,
        rulesetId: engineState.rulesetId ?? sanitizeBoardGameRulesetId(match.ruleset_id),
        playerId: player.player_id,
        actionType: actionPayload.type,
        code: errCode,
        reason,
      });
      await this.emitBetaTelemetryCounters(['invalid_actions']);
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: false,
        revision: match.revision,
        reason,
      });
      this.sendError(ws, errCode, reason, {
        requestId: reqId,
        revision: match.revision,
      });
      return;
    }

    // CAP-05 Zero-Leak Private Preference Update:
    // `SET_REACTION_PREF` chỉ ghi `game_state_json` xuống SQLite và unicast riêng cho
    // chính chủ sở hữu — KHÔNG tăng revision công khai, KHÔNG broadcast sang người khác hay Spectator!
    if (actionPayload.type === 'SET_REACTION_PREF') {
      this.sql.exec(
        `UPDATE matches SET game_state_json = ? WHERE match_id = ?`,
        JSON.stringify({ rulesetVersion: BOARD_GAME_RULESET_VERSION, engineState }),
        match.match_id,
      );
      this.sql.exec(
        `INSERT OR REPLACE INTO processed_requests (player_id, request_id, revision, created_at_ms)
         VALUES (?, ?, ?, ?)`,
        player.player_id,
        reqId,
        match.revision,
        nowMs,
      );
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: true,
        revision: match.revision,
      });
      const privateSync = this.buildStateSyncPayload(player.player_id, false);
      if (privateSync) {
        this.send(ws, privateSync);
      }
      return;
    }

    const nextStatus: BoardGameMatchStatus = engineState.finished ? 'FINISHED' : 'PLAYING';
    const turnChanged = engineState.turnNumber !== prevTurnNumber;
    const hasPendingChoice = Boolean(engineState.pendingChoice);
    const nextDeadline = engineState.finished
      ? null
      : hasPendingChoice
        ? engineState.pendingChoice!.deadlineMs
        : match.turn_timeout_ms <= 0 || turnChanged
          ? this.computeNextTurnDeadline(engineState, playerRows, match.turn_timeout_ms, nowMs)
          : match.turn_deadline_ms ??
            this.computeNextTurnDeadline(engineState, playerRows, match.turn_timeout_ms, nowMs);
    const newRevision = match.revision + 1;

    if (engineState.finished) {
      this.sql.exec('UPDATE match_players SET ready = 0');
    }

    this.sql.exec(
      `UPDATE matches
       SET status = ?, revision = ?, turn_deadline_ms = ?, updated_at_ms = ?, game_state_json = ?
       WHERE match_id = ?`,
      nextStatus,
      newRevision,
      nextDeadline,
      nowMs,
      JSON.stringify({ rulesetVersion: BOARD_GAME_RULESET_VERSION, engineState }),
      match.match_id,
    );

    this.sql.exec(
      `INSERT OR REPLACE INTO processed_requests (player_id, request_id, revision, created_at_ms)
       VALUES (?, ?, ?, ?)`,
      player.player_id,
      reqId,
      newRevision,
      nowMs,
    );

    await this.scheduleNextAlarm(nowMs);
    logBoardGameEvent(this.env, 'ACTION_APPLIED', {
      matchId: match.match_id,
      tableId: match.table_id,
      playerId: player.player_id,
      actionType: actionPayload.type,
      revision: newRevision,
      round: engineState.round,
      turnNumber: engineState.turnNumber,
      status: nextStatus,
    });
    if (engineState.finished) {
      logBoardGameEvent(this.env, 'MATCH_FINISHED', {
        matchId: match.match_id,
        tableId: match.table_id,
        status: 'FINISHED',
        round: engineState.round,
        turnNumber: engineState.turnNumber,
        winnerFaction: engineState.winnerFaction,
      });
      await this.recordFinishedMatchToLeaderboard(nowMs);
    }
    this.send(ws, {
      type: 'BG_ACTION_ACK',
      requestId: reqId,
      ok: true,
      revision: newRevision,
    });
    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
  }

  private async handleLeave(ws: WebSocket, player: MatchPlayerDbRow): Promise<void> {
    const match = this.getMatchRow();
    if (!match) return;
    const nowMs = Date.now();
    this.setAttachment(ws, {
      matchId: match.match_id,
      playerId: '',
      connectionId: '',
      isSpectator: false,
      replaced: true,
    });

    if (match.status !== 'PLAYING' || player.is_spectator === 1) {
      this.sql.exec('DELETE FROM match_players WHERE player_id = ?', player.player_id);
      const remainingSeated = this.listPlayerRows().filter(
        (p) => p.is_spectator === 0 && p.seat_index !== null,
      );
      if (remainingSeated.length === 0) {
        this.sql.exec(
          'UPDATE matches SET status = ?, revision = revision + 1, updated_at_ms = ? WHERE match_id = ?',
          'CLOSED',
          nowMs,
          match.match_id,
        );
      } else {
        if (match.host_player_id === player.player_id) {
          this.promoteNextConnectedHost(player.player_id);
        }
        this.recomputeLobbyStatus();
        this.bumpMatchRevisionOnly(nowMs);
        this.broadcastStateSync();
      }
      await this.syncDirectoryFromMatch();
      try {
        ws.close(1000, 'Left match');
      } catch {
        // ignore
      }
      return;
    }

    // Leaving mid-PLAYING marks player disconnected (seat kept for reconnect window; shortened alarm)
    this.sql.exec(
      'UPDATE match_players SET connected = 0, last_seen_ms = ? WHERE player_id = ?',
      nowMs,
      player.player_id,
    );
    if (match.host_player_id === player.player_id) {
      this.promoteNextConnectedHost(player.player_id);
    }
    const engineState = this.loadEngineState(match);
    const effectiveControllerId = engineState ? getEffectiveTurnControllerId(engineState) : null;
    if (engineState?.pendingChoice?.ownerPlayerId === player.player_id) {
      const disconnChoiceMs =
        this.env.ALLOW_SHORT_TURN_TIMEOUT === '1'
          ? Math.min(800, BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS)
          : BOARD_GAME_DISCONNECTED_CHOICE_TIMEOUT_MS;
      const cappedChoiceDeadline = Math.min(
        engineState.pendingChoice.deadlineMs,
        nowMs + disconnChoiceMs,
      );
      if (engineState.pendingChoice.isSecret && engineState.pendingChoice.publicDeadlineMs === undefined) {
        engineState.pendingChoice.publicDeadlineMs = engineState.pendingChoice.deadlineMs;
      }
      engineState.pendingChoice.deadlineMs = cappedChoiceDeadline;
      this.sql.exec(
        'UPDATE matches SET turn_deadline_ms = ?, game_state_json = ? WHERE match_id = ?',
        cappedChoiceDeadline,
        JSON.stringify({ rulesetVersion: BOARD_GAME_RULESET_VERSION, engineState }),
        match.match_id,
      );
    } else if (effectiveControllerId && effectiveControllerId === player.player_id) {
      const holdWindow =
        match.turn_timeout_ms <= 0
          ? BOARD_GAME_RECONNECT_HOLD_MS
          : BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS;
      const capped = Math.min(
        match.turn_deadline_ms ?? nowMs + holdWindow,
        nowMs + holdWindow,
      );
      this.sql.exec('UPDATE matches SET turn_deadline_ms = ? WHERE match_id = ?', capped, match.match_id);
    }
    await this.scheduleNextAlarm(nowMs);
    this.bumpMatchRevisionOnly(nowMs);
    this.broadcastStateSync();
    await this.syncDirectoryFromMatch();
    try {
      ws.close(1000, 'Left match');
    } catch {
      // ignore
    }
  }

  // -------------------------------------------------------------------------
  // Helpers: Fencing, Host Promotion, State Sync Projection & Alarms
  // -------------------------------------------------------------------------

  private fenceExistingSockets(playerId: string, exceptWs: WebSocket): void {
    for (const sock of this.ctx.getWebSockets()) {
      if (sock === exceptWs) continue;
      const att = this.getAttachment(sock);
      if (att?.playerId === playerId) {
        this.setAttachment(sock, { ...att, playerId: '', replaced: true });
        try {
          sock.close(BG_WS_FENCE_CLOSE_CODE, 'Replaced by newer connection');
        } catch {
          // ignore already closed socket
        }
      }
    }
  }

  private findActiveSocketForPlayer(playerId: string, exceptWs?: WebSocket): WebSocket | null {
    for (const sock of this.ctx.getWebSockets()) {
      if (exceptWs && sock === exceptWs) continue;
      const att = this.getAttachment(sock);
      if (att && !att.replaced && att.playerId === playerId) {
        return sock;
      }
    }
    return null;
  }

  private promoteNextConnectedHost(formerHostId: string): void {
    const match = this.getMatchRow();
    if (!match) return;
    const candidates = this.listPlayerRows().filter(
      (p) => p.is_spectator === 0 && p.seat_index !== null && p.player_id !== formerHostId,
    );
    const connectedCandidate = candidates.find((p) => p.connected === 1) ?? candidates[0];
    if (!connectedCandidate) return;
    this.sql.exec(
      'UPDATE matches SET host_player_id = ? WHERE match_id = ?',
      connectedCandidate.player_id,
      match.match_id,
    );
  }

  private recomputeLobbyStatus(): void {
    const match = this.getMatchRow();
    if (!match) return;
    if (match.status !== 'WAITING' && match.status !== 'READY_CHECK') return;
    const seated = this.listPlayerRows().filter((p) => p.is_spectator === 0 && p.seat_index !== null);
    const connectedSeated = seated.filter((p) => p.connected === 1);
    const othersReady = connectedSeated
      .filter((p) => p.player_id !== match.host_player_id)
      .every((p) => p.ready === 1);
    const nextStatus: BoardGameMatchStatus =
      connectedSeated.length >= BOARD_GAME_MIN_PLAYERS && othersReady ? 'READY_CHECK' : 'WAITING';
    if (nextStatus !== match.status && canTransitionBoardGameStatus(match.status, nextStatus)) {
      this.sql.exec(
        'UPDATE matches SET status = ? WHERE match_id = ?',
        nextStatus,
        match.match_id,
      );
    }
  }

  private bumpMatchRevisionOnly(nowMs: number): void {
    this.sql.exec(
      'UPDATE matches SET revision = revision + 1, updated_at_ms = ?',
      nowMs,
    );
  }

  private bumpMatchRevisionAndSchedule(nowMs: number, deadlineMs: number | null): void {
    this.sql.exec(
      'UPDATE matches SET revision = revision + 1, turn_deadline_ms = ?, updated_at_ms = ?',
      deadlineMs,
      nowMs,
    );
  }

  private async scheduleNextAlarm(nowMs: number): Promise<void> {
    const storage = this.ctx.storage;
    if (!storage?.setAlarm) return;
    const match = this.getMatchRow();
    if (!match || match.status === 'CLOSED') {
      await storage.deleteAlarm?.();
      return;
    }

    const candidates: number[] = [];
    if (match.status === 'CREATED') {
      candidates.push(Math.max(nowMs + 250, match.created_at_ms + BOARD_GAME_RECONNECT_HOLD_MS));
    }
    if (match.status === 'PLAYING' && typeof match.turn_deadline_ms === 'number') {
      candidates.push(Math.max(nowMs + 250, match.turn_deadline_ms));
    }
    if (match.status === 'PLAYING') {
      const disconnAgg = this.sql
        .exec<{ connected_count: number | null; max_seen: number | null }>(
          `SELECT
             SUM(CASE WHEN connected = 1 AND is_spectator = 0 THEN 1 ELSE 0 END) AS connected_count,
             MAX(CASE WHEN is_spectator = 0 THEN last_seen_ms ELSE NULL END) AS max_seen
           FROM match_players`,
        )
        .one();
      if (
        Number(disconnAgg?.connected_count ?? 0) === 0 &&
        typeof disconnAgg?.max_seen === 'number'
      ) {
        candidates.push(
          Math.max(nowMs + 1000, disconnAgg.max_seen + BOARD_GAME_ABANDONED_MATCH_TTL_MS),
        );
      }
    }
    if (match.status === 'WAITING' || match.status === 'READY_CHECK' || match.status === 'FINISHED') {
      const disconn = this.sql
        .exec<{ min_seen: number | null }>(
          'SELECT MIN(last_seen_ms) AS min_seen FROM match_players WHERE connected = 0',
        )
        .one();
      if (typeof disconn?.min_seen === 'number') {
        candidates.push(Math.max(nowMs + 250, disconn.min_seen + BOARD_GAME_RECONNECT_HOLD_MS));
      }
    }
    if (match.status === 'FINISHED') {
      candidates.push(Math.max(nowMs + 1000, match.updated_at_ms + BOARD_GAME_FINISHED_TTL_MS));
    }

    if (candidates.length === 0) {
      await storage.deleteAlarm?.();
      return;
    }
    const earliest = Math.min(...candidates);
    await storage.setAlarm(earliest);
  }

  private adaptLegacyEngineState(
    match: MatchDbRow,
    rawEngine: Record<string, unknown>,
    playerRows?: readonly MatchPlayerDbRow[],
  ): AuthoritativeGameState {
    const fallbackRole = ROLES_BY_ID['gac-ky-thuat'];
    const rawPlayers = Array.isArray(rawEngine.players)
      ? rawEngine.players
      : rawEngine.players && typeof rawEngine.players === 'object'
        ? Object.values(rawEngine.players as Record<string, unknown>)
        : [];
    const playersRecord: Record<string, AuthoritativePlayerState> = {};
    const turnOrder: string[] = [];

    rawPlayers.forEach((entry, idx) => {
      const p = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      const rawRoleId = isKnownBoardGameRoleId(p.roleId) ? p.roleId : fallbackRole.id;
      const roleDef = getRoleDesign(rawRoleId);
      const maxHp = typeof p.maxHp === 'number' && p.maxHp > 0 ? p.maxHp : roleDef.maxHp;
      const hp = typeof p.hp === 'number' ? Math.max(0, Math.min(maxHp, p.hp)) : maxHp;
      const woundsTaken =
        typeof p.woundsTaken === 'number' ? Math.max(0, p.woundsTaken) : Math.max(0, maxHp - hp);
      const loc =
        typeof p.location === 'string' && isValidLocationId(p.location) ? p.location : 'lobby';
      const playerId = typeof p.playerId === 'string' ? p.playerId : `legacy-${idx}`;
      playersRecord[playerId] = {
        playerId,
        displayName: typeof p.displayName === 'string' ? p.displayName : `Sinh viên ${idx + 1}`,
        seatIndex: typeof p.seatIndex === 'number' ? p.seatIndex : idx,
        appearance: sanitizeBoardGameAppearance(p.appearance),
        roleId: roleDef.id,
        faction: roleDef.faction,
        hp,
        maxHp,
        woundsTaken,
        location: loc,
        hand: [],
        equipped: [],
        revealed: true,
        alive: typeof p.alive === 'boolean' ? p.alive : hp > 0,
        connected: Boolean(p.connected),
        skillCooldown: 0,
        skillUsedOnce: false,
        guardianShieldActive: false,
        attacksMade: typeof p.attacksMade === 'number' ? p.attacksMade : 0,
        attacksThisTurn: typeof p.attacksThisTurn === 'number' ? p.attacksThisTurn : 0,
        lastAttackTargetId: null,
        investigationsCount: typeof p.investigationsCount === 'number' ? p.investigationsCount : 0,
        consecutiveSameZoneRolls: 0,
        eliminatedRound: null,
        eliminatedByPlayerId: null,
        protegePlayerId: null,
        avengedProtegeKiller: false,
        charlesKillWon: false,
        investigatedTargetIds: [],
        privateClues: [],
      };
      turnOrder.push(playerId);
    });

    if (playerRows) {
      const connById = new Map<string, boolean>();
      for (const row of playerRows) {
        connById.set(row.player_id, row.connected === 1);
      }
      for (const ep of Object.values(playersRecord)) {
        const isConn = connById.get(ep.playerId);
        if (typeof isConn === 'boolean') ep.connected = isConn;
      }
    }

    const wasFinished = match.status === 'FINISHED' || Boolean(rawEngine.finished);
    const preservedWinnerLabel =
      wasFinished && typeof rawEngine.winnerLabel === 'string'
        ? rawEngine.winnerLabel
        : 'Phiên cũ đã khép — Sẵn sàng Luật v4';
    const preservedWinReason =
      wasFinished && typeof rawEngine.winReason === 'string'
        ? rawEngine.winReason
        : 'Bóng Đêm KTX đã nâng cấp lên Luật v4 (Săn Bóng Đêm KTX với xúc xắc 1d6+1d4 & 3 Cụm). Phiên cũ đã được khép an toàn; hãy bấm Sẵn sàng để bắt đầu ván mới!';
    const preservedWinnerFaction =
      wasFinished &&
      (rawEngine.winnerFaction === 'lantern-guard' ||
        rawEngine.winnerFaction === 'mist-order' ||
        rawEngine.winnerFaction === 'wanderer-solo' ||
        rawEngine.winnerFaction === 'wanderer' ||
        rawEngine.winnerFaction === 'multi-faction')
        ? rawEngine.winnerFaction
        : null;
    const preservedWinnerPlayerIds =
      wasFinished && Array.isArray(rawEngine.winnerPlayerIds)
        ? rawEngine.winnerPlayerIds.filter((id): id is string => typeof id === 'string')
        : [];
    const winnerSet = new Set(preservedWinnerPlayerIds);
    const mappedLogs = Array.isArray(rawEngine.publicLog)
      ? rawEngine.publicLog
          .slice(-20)
          .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
          .map((entry, idx) => ({
            id: typeof entry.id === 'string' ? entry.id : `legacy-log-${idx + 1}`,
            round: typeof entry.round === 'number' ? entry.round : 1,
            atMs: typeof entry.atMs === 'number' ? entry.atMs : match.updated_at_ms,
            kind: 'system' as const,
            text: typeof entry.text === 'string' ? entry.text : '',
          }))
      : [];

    return {
      rulesetVersion: BOARD_GAME_RULESET_VERSION,
      matchId: typeof rawEngine.matchId === 'string' ? rawEngine.matchId : match.match_id,
      seed: typeof rawEngine.seed === 'number' ? rawEngine.seed : 1,
      rngState: typeof rawEngine.rngState === 'number' ? rawEngine.rngState : 1,
      round: typeof rawEngine.round === 'number' ? rawEngine.round : 1,
      maxRounds: typeof rawEngine.maxRounds === 'number' ? rawEngine.maxRounds : 30,
      turnNumber: typeof rawEngine.turnNumber === 'number' ? rawEngine.turnNumber : 1,
      turnPhase: 'ENDED',
      activePlayerId: null,
      turnOrder,
      clusterPairs: DEFAULT_CLUSTER_PAIRS.map((pair) => ({
        clusterId: pair.clusterId,
        locationIds: [pair.locationIds[0], pair.locationIds[1]],
      })),
      firstDeadPlayerId: null,
      extraTurnPending: false,
      players: playersRecord,
      decks: { investigation: [], equipment: [], event: [] },
      discards: { investigation: [], equipment: [], event: [] },
      lastDiceRoll: null,
      lastInvestigation: null,
      lastRevealEvent: null,
      publicLog: mappedLogs,
      highlights: [],
      finished: true,
      winnerLabel: preservedWinnerLabel,
      winnerFaction: preservedWinnerFaction,
      winnerPlayerIds: preservedWinnerPlayerIds,
      winReason: preservedWinReason,
      finalReveal: turnOrder.map((pid) => {
        const ep = playersRecord[pid];
        const roleDef = getRoleDesign(ep.roleId);
        return {
          playerId: ep.playerId,
          displayName: ep.displayName,
          roleId: ep.roleId,
          roleName: roleDef.name,
          faction: ep.faction,
          won: winnerSet.has(ep.playerId),
          alive: ep.alive,
          hp: ep.hp,
          maxHp: ep.maxHp,
          woundsTaken: ep.woundsTaken,
        };
      }),
    };
  }

  private loadEngineState(
    match: MatchDbRow,
    playerRows?: readonly MatchPlayerDbRow[],
  ): AuthoritativeGameState | null {
    const parsedState = parseJsonObject(match.game_state_json);
    const rawEngine = parsedState?.engineState;
    if (!rawEngine || typeof rawEngine !== 'object') {
      if (match.game_state_json && (match.status === 'PLAYING' || match.status === 'FINISHED')) {
        logBoardGameEvent(this.env, 'STATE_RESTORE_ERROR', {
          matchId: match.match_id,
          tableId: match.table_id,
          rulesetId: sanitizeBoardGameRulesetId(match.ruleset_id),
          status: match.status,
          reason: 'corrupt-or-missing-engine-state-json',
        });
        void this.emitBetaTelemetryCounters(['state_restore_failures']);
      }
      return null;
    }
    const rawRecord = rawEngine as Record<string, unknown>;
    const outerVersion = parsedState?.rulesetVersion;
    if (
      outerVersion !== BOARD_GAME_RULESET_VERSION ||
      rawRecord.rulesetVersion !== BOARD_GAME_RULESET_VERSION
    ) {
      return this.adaptLegacyEngineState(match, rawRecord, playerRows);
    }
    const engineState = rawEngine as AuthoritativeGameState;
    if (!engineState.rulesetId) {
      engineState.rulesetId = sanitizeBoardGameRulesetId(match.ruleset_id);
    }
    if (!engineState.catalogVersion) {
      engineState.catalogVersion = match.catalog_version ?? BOARD_GAME_CATALOG_VERSION;
    }
    if (!Array.isArray(engineState.clusterPairs) || engineState.clusterPairs.length !== 3) {
      engineState.clusterPairs = DEFAULT_CLUSTER_PAIRS.map((pair) => ({
        clusterId: pair.clusterId,
        locationIds: [pair.locationIds[0], pair.locationIds[1]],
      }));
    }
    if (engineState.firstDeadPlayerId === undefined) engineState.firstDeadPlayerId = null;
    if (typeof engineState.extraTurnPending !== 'boolean') engineState.extraTurnPending = false;
    if (typeof engineState.logSeq !== 'number') {
      engineState.logSeq = Array.isArray(engineState.publicLog) ? engineState.publicLog.length : 0;
    }
    if (engineState.players && typeof engineState.players === 'object') {
      const connById = new Map<string, boolean>();
      if (playerRows) {
        for (const row of playerRows) {
          connById.set(row.player_id, row.connected === 1);
        }
      }
      const list = Array.isArray(engineState.players)
        ? engineState.players
        : Object.values(engineState.players);
      for (const ep of list) {
        if (playerRows) {
          const isConn = connById.get(ep.playerId);
          if (typeof isConn === 'boolean') {
            ep.connected = isConn;
          }
        }
        if (typeof ep.attacksThisTurn !== 'number') ep.attacksThisTurn = 0;
        if (ep.lastAttackTargetId === undefined) ep.lastAttackTargetId = null;
        if (typeof ep.charlesKillWon !== 'boolean') ep.charlesKillWon = false;
        if (typeof ep.clueSeq !== 'number') {
          ep.clueSeq = Array.isArray(ep.privateClues) ? ep.privateClues.length : 0;
        }
      }
    }
    return engineState;
  }

  private computeNextTurnDeadline(
    engineState: AuthoritativeGameState,
    playerRows: readonly MatchPlayerDbRow[],
    turnTimeoutMs: number,
    nowMs: number,
  ): number | null {
    if (engineState.finished) return null;
    if (engineState.pendingChoice) {
      return engineState.pendingChoice.deadlineMs;
    }
    const controllerId = getEffectiveTurnControllerId(engineState);
    if (!controllerId) return null;
    const controllerPlayer = engineState.players[controllerId];
    const row = playerRows.find((r) => r.player_id === controllerId);
    const isConnected = row ? row.connected === 1 : Boolean(controllerPlayer?.connected);
    if (turnTimeoutMs <= 0) {
      return isConnected ? null : nowMs + BOARD_GAME_RECONNECT_HOLD_MS;
    }
    const dur = isConnected
      ? turnTimeoutMs
      : Math.min(turnTimeoutMs, BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS);
    return nowMs + Math.max(1000, dur);
  }

  private buildStateSyncPayload(forPlayerId: string | null, isSpectator: boolean): BoardGameServerMessage | null {
    const match = this.getMatchRow();
    if (!match) return null;
    const rows = this.listPlayerRows();
    const spectators = rows.filter((p) => p.is_spectator === 1);
    const players: BoardGameLobbyPlayerView[] = rows
      .filter((p) => p.is_spectator === 0)
      .map((p) => ({
        playerId: p.player_id,
        displayName: p.display_name,
        seatIndex: p.seat_index,
        seatId:
          p.seat_index !== null ? seatIndexToSeatId(match.table_id, p.seat_index) : null,
        ready: p.ready === 1,
        isHost: p.player_id === match.host_player_id,
        isSpectator: false,
        connected: p.connected === 1,
        appearance: sanitizeBoardGameAppearance(parseJsonObject(p.outfit_json)),
        lastSeenMs: p.last_seen_ms,
      }));

    const engineState =
      match.status === 'PLAYING' || match.status === 'FINISHED'
        ? this.loadEngineState(match, rows)
        : null;
    if (match.status === 'PLAYING' && engineState?.finished) {
      const nowMs = Date.now();
      this.sql.exec('UPDATE match_players SET ready = 0');
      this.sql.exec(
        `UPDATE matches
         SET status = 'FINISHED', revision = revision + 1, turn_deadline_ms = NULL, updated_at_ms = ?, game_state_json = ?
         WHERE match_id = ?`,
        nowMs,
        JSON.stringify({ rulesetVersion: BOARD_GAME_RULESET_VERSION, engineState }),
        match.match_id,
      );
      logBoardGameEvent(this.env, 'MATCH_FINISHED', {
        matchId: match.match_id,
        tableId: match.table_id,
        status: 'FINISHED',
        round: engineState.round,
        turnNumber: engineState.turnNumber,
        winnerFaction: engineState.winnerFaction,
      });
    }
    const effectiveMatch = this.getMatchRow() ?? match;
    const publicGame: BoardGamePublicGameView | null = engineState
      ? getPublicGameView(engineState)
      : null;
    const privateView: BoardGamePrivateGameView | null =
      !engineState || isSpectator || !forPlayerId
        ? null
        : getPrivateGameView(engineState, forPlayerId);

    const publicCaps = DEFAULT_RULESET_REGISTRY.getPublicServerCapabilities({
      productionBeta: resolveProductionBetaConfigFromEnv(this.env),
    });

    return {
      type: 'BG_STATE_SYNC',
      protocolVersion: BOARD_GAME_PROTOCOL_VERSION,
      matchId: effectiveMatch.match_id,
      inviteCode: effectiveMatch.invite_code,
      tableId: effectiveMatch.table_id,
      status: effectiveMatch.status,
      rulesetId: engineState?.rulesetId ?? sanitizeBoardGameRulesetId(effectiveMatch.ruleset_id),
      catalogVersion:
        engineState?.catalogVersion ??
        effectiveMatch.catalog_version ??
        BOARD_GAME_CATALOG_VERSION,
      betaEnabled: publicCaps.betaEnabled,
      availableRulesets: publicCaps.rulesets,
      revision: effectiveMatch.revision,
      hostPlayerId: effectiveMatch.host_player_id,
      players,
      spectatorCount: spectators.length,
      turnDeadlineMs: effectiveMatch.turn_deadline_ms,
      publicGame,
      privateView,
    };
  }

  private broadcastStateSync(): void {
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      const att = this.getAttachment(ws);
      if (!att || att.isDirectory || !att.playerId || att.replaced) continue;
      const syncMsg = this.buildStateSyncPayload(att.playerId, att.isSpectator);
      if (syncMsg) {
        this.send(ws, syncMsg);
      }
    }
  }

  private broadcastAll(msg: BoardGameServerMessage): void {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.getAttachment(ws);
      if (!att || att.isDirectory || !att.playerId || att.replaced) continue;
      try {
        ws.send(data);
      } catch {
        // ignore
      }
    }
  }
}
