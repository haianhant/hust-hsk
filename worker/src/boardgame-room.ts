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
  BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS,
  BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS,
  BOARD_GAME_FINISHED_TTL_MS,
  BOARD_GAME_MAX_DIRECTORY_MATCHES,
  BOARD_GAME_MAX_PLAYERS,
  BOARD_GAME_MAX_SPECTATORS,
  BOARD_GAME_MIN_PLAYERS,
  BOARD_GAME_RECONNECT_HOLD_MS,
  canTransitionBoardGameStatus,
  sanitizeBoardGameAppearance,
  sanitizeBoardGameChatText,
  sanitizeBoardGameMatchId,
  sanitizeBoardGameName,
  sanitizeBoardGameRequestId,
  sanitizeBoardGameSeatIndex,
  sanitizeBoardGameTableId,
  sanitizeBoardGameToken,
  sanitizeInviteCode,
  seatIndexToSeatId,
  isValidBoardGameEmote,
  type BoardGameActionPayload,
  type BoardGameLobbyPlayerView,
  type BoardGameMatchStatus,
  type BoardGameMatchSummary,
  type BoardGamePrivateGameView,
  type BoardGamePublicGameView,
  type BoardGameServerMessage,
  type BoardGameTableId,
} from '../../shared/contracts/boardgame';
import {
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  createInitialGameState,
  getActivePlayer,
  getPrivateGameView,
  getPublicGameView,
  type AuthoritativeGameState,
} from '../../features/boardgame/domain';

export const BG_DIRECTORY_ROOM_NAME = '__lounge_directory__';
export const BG_WS_FENCE_CLOSE_CODE = 4001;
const MAX_WS_PAYLOAD_BYTES = 8192;
const MIN_ACTION_INTERVAL_MS = 25;
const EMOTE_COOLDOWN_MS = 1500;
const WINDOW_MS = 2000;
const MAX_MSGS_PER_WINDOW = 25;

export interface BoardGameEnv {
  BOARD_GAME_ROOM?: DurableObjectNamespace;
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
}

interface DirectoryRow {
  match_id: string;
  invite_code: string;
  table_id: BoardGameTableId;
  host_name: string;
  status: BoardGameMatchStatus;
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
      const matchCount = this.sql
        .exec<{ c: number }>('SELECT COUNT(*) AS c FROM matches')
        .one();
      return (dirCount?.c ?? 0) > 0 && (matchCount?.c ?? 0) === 0;
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
        turn_timeout_ms INTEGER NOT NULL DEFAULT 45000,
        created_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL,
        game_state_json TEXT
      )
    `);
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
        last_seen_ms INTEGER NOT NULL
      )
    `);
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
        player_count INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        spectator_count INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      )
    `);
    sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_dir_status_updated
      ON directory_matches(status, updated_at_ms DESC)
    `);
    this.schemaReady = true;
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
          match_id, invite_code, table_id, host_name, status, player_count, max_players, spectator_count, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        matchId,
        inviteCode,
        tableId,
        hostName,
        'CREATED',
        0,
        BOARD_GAME_MAX_PLAYERS,
        0,
        nowMs,
      );
      this.broadcastDirectorySnapshot();
      return Response.json({ ok: true, matchId, inviteCode, tableId }, { status: 201 });
    }

    if (url.pathname === '/__dir/update' && request.method === 'POST') {
      this.roomName = BG_DIRECTORY_ROOM_NAME;
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      const matchId = sanitizeBoardGameMatchId(body.matchId);
      if (!matchId) return Response.json({ ok: false, error: 'invalid-matchId' }, { status: 400 });
      const status = typeof body.status === 'string' ? body.status : 'WAITING';
      const hostName = sanitizeBoardGameName(body.hostName);
      const playerCount = typeof body.playerCount === 'number' ? Math.max(0, Math.floor(body.playerCount)) : 0;
      const spectatorCount =
        typeof body.spectatorCount === 'number' ? Math.max(0, Math.floor(body.spectatorCount)) : 0;
      if (status === 'CLOSED') {
        this.sql.exec('DELETE FROM directory_matches WHERE match_id = ?', matchId);
      } else {
        this.sql.exec(
          `UPDATE directory_matches
           SET status = ?, host_name = ?, player_count = ?, spectator_count = ?, updated_at_ms = ?
           WHERE match_id = ?`,
          status,
          hostName,
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

    // Match DO initialization (`POST /__init`)
    if (url.pathname === '/__init' && request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      const matchId = sanitizeBoardGameMatchId(body.matchId);
      const inviteCode = sanitizeInviteCode(body.inviteCode);
      const tableId = sanitizeBoardGameTableId(body.tableId);
      const rawTimeout = typeof body.turnTimeoutMs === 'number' ? body.turnTimeoutMs : BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS;
      const turnTimeoutMs = Math.max(3000, Math.min(120_000, Math.floor(rawTimeout)));
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
        });
      }
      this.sql.exec(
        `INSERT INTO matches (
          match_id, invite_code, table_id, host_player_id, status, revision, turn_deadline_ms, turn_timeout_ms, created_at_ms, updated_at_ms, game_state_json
        ) VALUES (?, ?, ?, '', 'CREATED', 1, NULL, ?, ?, ?, NULL)`,
        matchId,
        inviteCode,
        tableId,
        turnTimeoutMs,
        nowMs,
        nowMs,
      );
      return Response.json({ ok: true, matchId, inviteCode, tableId }, { status: 201 });
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
    const rawStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
    if (rawStr.length > MAX_WS_PAYLOAD_BYTES) {
      this.sendError(ws, 'RATE_LIMITED', 'Gói tin vượt quá kích thước cho phép.');
      return;
    }
    const msg = parseJsonObject(rawStr);
    if (!msg || typeof msg.type !== 'string') return;

    // Rate limit per socket
    const rl = this.rateMap.get(ws) ?? {
      windowStartMs: nowMs,
      msgCount: 0,
      lastActionMs: 0,
      lastChatEmoteMs: 0,
    };
    if (nowMs - rl.windowStartMs > WINDOW_MS) {
      rl.windowStartMs = nowMs;
      rl.msgCount = 0;
    }
    rl.msgCount += 1;
    this.rateMap.set(ws, rl);
    if (rl.msgCount > MAX_MSGS_PER_WINDOW) {
      this.sendError(ws, 'RATE_LIMITED', 'Bạn gửi yêu cầu quá nhanh, vui lòng chậm lại.');
      return;
    }

    if (msg.type === 'BG_PING') {
      this.send(ws, {
        type: 'BG_PONG',
        serverTimeMs: nowMs,
        ...(typeof msg.clientTimeMs === 'number' ? { clientTimeMs: msg.clientTimeMs } : {}),
      });
      return;
    }

    // Directory socket subscription
    const att = this.getAttachment(ws);
    if (att?.isDirectory) {
      if (msg.type === 'BG_DIRECTORY_REFRESH') {
        this.send(ws, {
          type: 'BG_DIRECTORY_SYNC',
          matches: this.queryDirectoryMatches(nowMs),
        });
      }
      return;
    }

    if (msg.type === 'BG_JOIN') {
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

    if (msg.type === 'BG_LEAVE') {
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

    if (msg.type === 'BG_CHAT_EMOTE') {
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

    if (msg.type === 'BG_GAME_ACTION') {
      await this.handleGameAction(ws, player, msg, reqId, rl, nowMs);
      return;
    }

    switch (msg.type) {
      case 'BG_SELECT_SEAT': {
        await this.handleSelectSeat(ws, player, sanitizeBoardGameSeatIndex(msg.seatIndex), reqId);
        return;
      }
      case 'BG_STAND_UP': {
        await this.handleStandUp(ws, player, reqId);
        return;
      }
      case 'BG_SET_READY': {
        await this.handleSetReady(ws, player, Boolean(msg.ready), reqId);
        return;
      }
      case 'BG_START_MATCH': {
        const timeoutOverride =
          typeof msg.turnTimeoutMs === 'number'
            ? Math.max(1500, Math.min(120_000, Math.floor(msg.turnTimeoutMs)))
            : undefined;
        await this.handleStartMatch(ws, player, reqId, timeoutOverride);
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

    // If active turn holder disconnects mid-PLAYING, cap remaining deadline cleanly
    if (match.status === 'PLAYING') {
      const engineState = this.loadEngineState(match);
      const active = engineState ? getActivePlayer(engineState) : null;
      if (active && active.playerId === player.player_id) {
        const capped = Math.min(
          match.turn_deadline_ms ?? nowMs + BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS,
          nowMs + BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS,
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
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    this.ensureSchema();
    const match = this.getMatchRow();
    if (!match || match.status === 'CLOSED') return;
    const nowMs = Date.now();

    // Auto-advance expired turns during PLAYING so a disconnected/AFK player never stalls the table
    if (
      match.status === 'PLAYING' &&
      typeof match.turn_deadline_ms === 'number' &&
      nowMs >= match.turn_deadline_ms - 50
    ) {
      const rows = this.listPlayerRows();
      const engineState = this.loadEngineState(match, rows);
      if (engineState && !engineState.finished) {
        applyTimeoutAutoTurn(engineState, nowMs);
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
          JSON.stringify({ engineState }),
          match.match_id,
        );
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
    if (!match || match.status === 'CLOSED') {
      this.sendError(ws, 'MATCH_NOT_FOUND', 'Phòng chơi không tồn tại hoặc đã đóng.');
      return;
    }

    const nowMs = Date.now();
    const rawInvite = msg.inviteCode !== undefined ? sanitizeInviteCode(msg.inviteCode) : null;
    if (msg.inviteCode !== undefined && rawInvite !== match.invite_code) {
      this.sendError(ws, 'INVALID_INVITE', 'Mã mời không khớp với phòng này.');
      return;
    }

    const displayName = sanitizeBoardGameName(msg.displayName);
    const appearanceJson = JSON.stringify(sanitizeBoardGameAppearance(msg.appearance));
    const suppliedToken = sanitizeBoardGameToken(msg.reconnectToken);
    const wantsSpectator = Boolean(msg.asSpectator);
    const preferredSeat = sanitizeBoardGameSeatIndex(msg.preferredSeatIndex);

    // Try token-based authenticated reconnect first
    if (suppliedToken) {
      const tokenHash = await sha256Hex(suppliedToken);
      const latestMatch = this.getMatchRow();
      if (!latestMatch || latestMatch.status === 'CLOSED') {
        this.sendError(ws, 'MATCH_NOT_FOUND', 'Phòng chơi không tồn tại hoặc đã đóng.');
        return;
      }
      const existing = this.findPlayerByTokenHash(tokenHash);
      if (existing) {
        // Fence any prior live WebSocket belonging to this playerId with close code 4001
        this.fenceExistingSockets(existing.player_id, ws);
        this.sql.exec(
          `UPDATE match_players
           SET connected = 1, display_name = ?, outfit_json = ?, last_seen_ms = ?
           WHERE player_id = ?`,
          displayName,
          appearanceJson,
          nowMs,
          existing.player_id,
        );
        const connId = randomBase64Url(9);
        this.setAttachment(ws, {
          matchId: latestMatch.match_id,
          playerId: existing.player_id,
          connectionId: connId,
          isSpectator: existing.is_spectator === 1,
        });
        this.send(ws, {
          type: 'BG_AUTH_ISSUED',
          matchId: latestMatch.match_id,
          inviteCode: latestMatch.invite_code,
          playerId: existing.player_id,
          reconnectToken: suppliedToken,
          isSpectator: existing.is_spectator === 1,
          seatIndex: existing.seat_index,
        });
        this.bumpMatchRevisionOnly(nowMs);
        this.broadcastStateSync();
        await this.syncDirectoryFromMatch();
        return;
      }
      // If reconnectToken didn't match DB, continue only if match isn't started/full or reject if mismatch?
      // Security: if client was attempting to reconnect in PLAYING state with an invalid token, reject cleanly.
      if (latestMatch.status === 'PLAYING' && !wantsSpectator) {
        this.sendError(
          ws,
          'UNAUTHORIZED',
          'Token kết nối lại không hợp lệ hoặc phiên đã hết hạn.',
        );
        return;
      }
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
    try {
      this.sql.exec(
        `INSERT INTO match_players (
          player_id, seat_index, display_name, outfit_json, is_spectator, ready, connected, reconnect_token_hash, last_seen_ms
        ) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
        playerId,
        assignedSeat,
        displayName,
        appearanceJson,
        isSpectator ? 1 : 0,
        tokenHash,
        nowMs,
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

    // Send secret 256-bit reconnectToken UNICAST ONCE exclusively to joining client
    this.send(ws, {
      type: 'BG_AUTH_ISSUED',
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

  private async handleStartMatch(
    ws: WebSocket,
    player: MatchPlayerDbRow,
    requestId?: string,
    turnTimeoutOverrideMs?: number,
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

    const nowMs = Date.now();
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
    const deadlineMs = nowMs + timeoutMs;

    const seedArr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(seedArr);
    const seed = (seedArr[0] >>> 0) || 1337;

    const engineState = createInitialGameState({
      matchId: match.match_id,
      seed,
      nowMs,
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
           game_state_json = ?
       WHERE match_id = ?`,
      deadlineMs,
      timeoutMs,
      nowMs,
      JSON.stringify({ engineState }),
      match.match_id,
    );

    await this.scheduleNextAlarm(nowMs);
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

    const rawAction = msg.action;
    if (!rawAction || typeof rawAction !== 'object' || typeof (rawAction as Record<string, unknown>).type !== 'string') {
      this.send(ws, {
        type: 'BG_ACTION_ACK',
        requestId: reqId,
        ok: false,
        revision: match.revision,
        reason: 'Gói lệnh hành động không hợp lệ.',
      });
      this.sendError(ws, 'INVALID_ACTION', 'Gói lệnh hành động không hợp lệ.', {
        requestId: reqId,
        revision: match.revision,
      });
      return;
    }

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

    const res = applyPlayerGameAction(
      engineState,
      player.player_id,
      rawAction as BoardGameActionPayload,
      nowMs,
    );
    if (!res.ok) {
      const reason = res.reason || 'Hành động không hợp lệ ở pha hiện tại.';
      const errCode = reason.includes('Chưa tới lượt') ? 'NOT_YOUR_TURN' : 'INVALID_ACTION';
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

    const nextStatus: BoardGameMatchStatus = engineState.finished ? 'FINISHED' : 'PLAYING';
    const nextDeadline = engineState.finished
      ? null
      : this.computeNextTurnDeadline(engineState, playerRows, match.turn_timeout_ms, nowMs);
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
      JSON.stringify({ engineState }),
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
    const active = engineState ? getActivePlayer(engineState) : null;
    if (active && active.playerId === player.player_id) {
      const capped = Math.min(
        match.turn_deadline_ms ?? nowMs + BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS,
        nowMs + BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS,
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
    if (match.status === 'PLAYING' && typeof match.turn_deadline_ms === 'number') {
      candidates.push(Math.max(nowMs + 250, match.turn_deadline_ms));
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

  private loadEngineState(
    match: MatchDbRow,
    playerRows?: readonly MatchPlayerDbRow[],
  ): AuthoritativeGameState | null {
    const parsedState = parseJsonObject(match.game_state_json);
    const rawEngine = parsedState?.engineState;
    if (!rawEngine || typeof rawEngine !== 'object') return null;
    const engineState = rawEngine as AuthoritativeGameState;
    if (playerRows && Array.isArray(engineState.players)) {
      const connById = new Map<string, boolean>();
      for (const row of playerRows) {
        connById.set(row.player_id, row.connected === 1);
      }
      for (const ep of engineState.players) {
        const isConn = connById.get(ep.playerId);
        if (typeof isConn === 'boolean') {
          ep.connected = isConn;
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
    const active = getActivePlayer(engineState);
    if (!active) return null;
    const row = playerRows.find((r) => r.player_id === active.playerId);
    const isConnected = row ? row.connected === 1 : active.connected;
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
    const publicGame: BoardGamePublicGameView | null = engineState
      ? getPublicGameView(engineState)
      : null;
    const privateView: BoardGamePrivateGameView | null =
      !engineState || isSpectator || !forPlayerId
        ? null
        : getPrivateGameView(engineState, forPlayerId);

    return {
      type: 'BG_STATE_SYNC',
      matchId: match.match_id,
      inviteCode: match.invite_code,
      tableId: match.table_id,
      status: match.status,
      revision: match.revision,
      hostPlayerId: match.host_player_id,
      players,
      spectatorCount: spectators.length,
      turnDeadlineMs: match.turn_deadline_ms,
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
