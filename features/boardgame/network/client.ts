'use client';

// ---------------------------------------------------------------------------
// features/boardgame/network/client.ts — Client WebSocket & REST kết nối
// BoardGameRoom Durable Object cho sảnh & trận đấu Bóng Đêm KTX.
//
// Hỗ trợ:
// - Tạo phòng (`POST /api/boardgame/matches`), tham gia qua mã mời
//   (`POST /api/boardgame/join-by-code`), liệt kê sảnh (`GET /api/boardgame/matches`).
// - Kênh WebSocket `/ws/boardgame?mode=directory` cập nhật sảnh CLB thời gian thực.
// - Kênh WebSocket `/ws/boardgame?matchId=...` đồng bộ ghế 3D, sẵn sàng, bắt đầu,
//   lưu `reconnectToken` (256-bit) ở `sessionStorage` để F5 khôi phục đúng ghế/vai,
//   tôn trọng close code `4001` khi mở tab mới (không loop reconnect vô hạn).
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import { sanitizeBoardGameAppearance } from '../../../shared/contracts/boardgame';
import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import {
  BOARD_GAME_PROTOCOL_VERSION,
  BOARD_GAME_RULESET_VERSION,
  clearStoredBoardGameAuth,
  getOrCreateStoredBoardGamePlayerKey,
  loadStoredBoardGameAuth,
  parseBoardGameServerMessage,
  resolveBoardGameEndpoints,
  sanitizeBoardGameName,
  sanitizeInviteCode,
  sanitizeMatchSummary,
  saveStoredBoardGameAuth,
  type BoardGameActionPayload,
  type BoardGameChatEmoteServerMessage,
  type BoardGameClientMessage,
  type BoardGameEmoteId,
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
  type BoardGameTableId,
} from './contracts';

const ACTIVE_MATCH_SESSION_KEY = 'hustverse:bg-active-match:v1';
const LOCAL_LEADERBOARD_STORAGE_KEY = 'hustverse:bg-local-leaderboard:v1';
const BG_WS_FENCE_CLOSE_CODE = 4001;
const RECONNECT_BACKOFF_MS = [600, 1200, 2500, 5000] as const;

interface LocalLeaderboardRecord {
  playerKey: string;
  displayName: string;
  appearance: RemoteAppearance;
  matchesPlayed: number;
  wins: number;
  hunterWins: number;
  shadowWins: number;
  wandererWins: number;
  eliminationsDealt: number;
  survivalsTotal: number;
  currentWinStreak: number;
  bestWinStreak: number;
  ratingPoints: number;
  weekKey: string;
  weeklyMatches: number;
  weeklyWins: number;
  weeklyPoints: number;
  lastRoleId: BoardGameRoleId | null;
  lastPlayedAtMs: number;
}

function computeLocalVnWeekKey(nowMs: number): string {
  const vnDate = new Date(nowMs + 7 * 3600_000);
  const utcMid = Date.UTC(vnDate.getUTCFullYear(), vnDate.getUTCMonth(), vnDate.getUTCDate());
  const d = new Date(utcMid);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function loadLocalLeaderboardMap(): Record<string, LocalLeaderboardRecord> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_LEADERBOARD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, LocalLeaderboardRecord>) : {};
  } catch {
    return {};
  }
}

function saveLocalLeaderboardMap(map: Record<string, LocalLeaderboardRecord>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_LEADERBOARD_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export type BoardGameConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface BoardGameClientSnapshot {
  connectionState: BoardGameConnectionState;
  directoryMatches: readonly BoardGameMatchSummary[];
  matchId: string | null;
  inviteCode: string | null;
  tableId: BoardGameTableId | null;
  status: BoardGameMatchStatus | null;
  revision: number;
  playerId: string | null;
  isSpectator: boolean;
  hostPlayerId: string | null;
  players: readonly BoardGameLobbyPlayerView[];
  spectatorCount: number;
  turnDeadlineMs: number | null;
  publicGame: BoardGamePublicGameView | null;
  privateView: BoardGamePrivateGameView | null;
  recentEmotes: readonly BoardGameChatEmoteServerMessage[];
  lastError: string | null;
  fencedByNewTab: boolean;
}

const EMPTY_SNAPSHOT: BoardGameClientSnapshot = {
  connectionState: 'idle',
  directoryMatches: [],
  matchId: null,
  inviteCode: null,
  tableId: null,
  status: null,
  revision: 0,
  playerId: null,
  isSpectator: false,
  hostPlayerId: null,
  players: [],
  spectatorCount: 0,
  turnDeadlineMs: null,
  publicGame: null,
  privateView: null,
  recentEmotes: [],
  lastError: null,
  fencedByNewTab: false,
};

interface ActiveJoinContext {
  matchId: string;
  inviteCode?: string;
  displayName: string;
  appearance: RemoteAppearance;
  asSpectator: boolean;
  preferredSeatIndex?: number | null;
}

type Listener = () => void;

export class BoardGameClient {
  private snap: BoardGameClientSnapshot = EMPTY_SNAPSHOT;
  private listeners = new Set<Listener>();
  private ws: WebSocket | null = null;
  private dirWs: WebSocket | null = null;
  private joinCtx: ActiveJoinContext | null = null;
  private intentionalClose = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reqCounter = 0;
  private opSeq = 0;
  private recordedLocalMatches = new Set<string>();
  private pendingAck = new Map<
    string,
    { resolve: (ok: boolean, reason?: string) => void; timer: ReturnType<typeof setTimeout> }
  >();

  getSnapshot = (): BoardGameClientSnapshot => this.snap;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(patch: Partial<BoardGameClientSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  private nextRequestId(): string {
    this.reqCounter += 1;
    return `bgreq_${Date.now().toString(36)}_${this.reqCounter}`;
  }

  // -------------------------------------------------------------------------
  // Directory REST + Live Directory WebSocket
  // -------------------------------------------------------------------------

  async refreshDirectory(): Promise<readonly BoardGameMatchSummary[]> {
    const eps = resolveBoardGameEndpoints();
    if (!eps.ok) return this.snap.directoryMatches;
    try {
      const res = await fetch(`${eps.httpBaseUrl}/api/boardgame/matches`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return this.snap.directoryMatches;
      const data = (await res.json()) as { matches?: unknown[] };
      const clean = Array.isArray(data.matches)
        ? data.matches
            .map(sanitizeMatchSummary)
            .filter((m): m is BoardGameMatchSummary => m !== null)
        : [];
      this.emit({ directoryMatches: clean });
      return clean;
    } catch {
      return this.snap.directoryMatches;
    }
  }

  subscribeDirectory(): () => void {
    const eps = resolveBoardGameEndpoints();
    void this.refreshDirectory();
    if (!eps.ok || typeof WebSocket === 'undefined') {
      return () => undefined;
    }
    this.closeDirectorySocket();
    try {
      const sock = new WebSocket(`${eps.wsBaseUrl}/ws/boardgame?mode=directory`);
      this.dirWs = sock;
      sock.onmessage = (ev) => {
        if (typeof ev.data !== 'string') return;
        try {
          const msg = JSON.parse(ev.data) as { type?: string; matches?: unknown[] };
          if (msg.type === 'BG_DIRECTORY_SYNC' && Array.isArray(msg.matches)) {
            const clean = msg.matches
              .map(sanitizeMatchSummary)
              .filter((m): m is BoardGameMatchSummary => m !== null);
            this.emit({ directoryMatches: clean });
          }
        } catch {
          // ignore invalid JSON
        }
      };
      sock.onerror = () => {
        // silent fallback to manual refresh
      };
    } catch {
      // ignore if test shim without network
    }
    return () => {
      this.closeDirectorySocket();
    };
  }

  private closeDirectorySocket(): void {
    if (this.dirWs) {
      try {
        this.dirWs.close(1000, 'Lounge closed');
      } catch {
        // ignore
      }
      this.dirWs = null;
    }
  }

  // -------------------------------------------------------------------------
  // Create / Lookup / Connect to Match
  // -------------------------------------------------------------------------

  async createMatch(params: {
    tableId: BoardGameTableId;
    displayName: string;
    appearance?: RemoteAppearance;
    preferredSeatIndex?: number | null;
    turnTimeoutMs?: number;
  }): Promise<{ ok: true; matchId: string; inviteCode: string } | { ok: false; error: string }> {
    const seq = ++this.opSeq;
    const eps = resolveBoardGameEndpoints();
    if (!eps.ok) {
      return { ok: false, error: eps.reason };
    }
    const cleanName = sanitizeBoardGameName(params.displayName);
    try {
      const res = await fetch(`${eps.httpBaseUrl}/api/boardgame/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: params.tableId,
          hostName: cleanName,
          ...(typeof params.turnTimeoutMs === 'number'
            ? { turnTimeoutMs: params.turnTimeoutMs }
            : {}),
        }),
      });
      if (seq !== this.opSeq) {
        return { ok: false, error: 'Thao tác đã được thay thế.' };
      }
      const data = (await res.json()) as {
        ok?: boolean;
        matchId?: string;
        inviteCode?: string;
        tableId?: BoardGameTableId;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.matchId || !data.inviteCode) {
        const errMsg = data.error || 'Không thể tạo phòng mới.';
        this.emit({ lastError: errMsg });
        return { ok: false, error: errMsg };
      }
      this.connectToMatch({
        matchId: data.matchId,
        inviteCode: data.inviteCode,
        displayName: cleanName,
        appearance: params.appearance ?? {},
        asSpectator: false,
        preferredSeatIndex: params.preferredSeatIndex ?? 0,
      });
      return { ok: true, matchId: data.matchId, inviteCode: data.inviteCode };
    } catch {
      const errMsg = 'Không kết nối được tới máy chủ Board Game.';
      this.emit({ lastError: errMsg });
      return { ok: false, error: errMsg };
    }
  }

  /** Tự động vào phòng chờ đang mở của bàn 1/2 hoặc tạo mới khi vừa ngồi ghế 3D. */
  async joinOrCreateTableMatch(params: {
    tableId: BoardGameTableId;
    displayName: string;
    appearance?: RemoteAppearance;
    preferredSeatIndex?: number | null;
    turnTimeoutMs?: number;
  }): Promise<
    { ok: true; matchId: string; inviteCode: string; created: boolean } | { ok: false; error: string }
  > {
    const seq = ++this.opSeq;
    const eps = resolveBoardGameEndpoints();
    if (!eps.ok) {
      return { ok: false, error: eps.reason };
    }
    const cleanName = sanitizeBoardGameName(params.displayName);
    try {
      const res = await fetch(`${eps.httpBaseUrl}/api/boardgame/join-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: params.tableId,
          hostName: cleanName,
          ...(typeof params.turnTimeoutMs === 'number'
            ? { turnTimeoutMs: params.turnTimeoutMs }
            : {}),
        }),
      });
      if (seq !== this.opSeq) {
        return { ok: false, error: 'Thao tác chọn bàn đã bị hủy.' };
      }
      const data = (await res.json()) as {
        ok?: boolean;
        created?: boolean;
        matchId?: string;
        inviteCode?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.matchId || !data.inviteCode) {
        const errMsg = data.error || 'Không thể kết nối phòng của bàn chơi.';
        this.emit({ lastError: errMsg });
        return { ok: false, error: errMsg };
      }
      this.connectToMatch({
        matchId: data.matchId,
        inviteCode: data.inviteCode,
        displayName: cleanName,
        appearance: params.appearance ?? {},
        asSpectator: false,
        preferredSeatIndex: params.preferredSeatIndex ?? null,
      });
      return {
        ok: true,
        matchId: data.matchId,
        inviteCode: data.inviteCode,
        created: Boolean(data.created),
      };
    } catch {
      const errMsg = 'Không kết nối được tới máy chủ Board Game.';
      this.emit({ lastError: errMsg });
      return { ok: false, error: errMsg };
    }
  }

  async joinByInviteCode(params: {
    inviteCode: string;
    displayName: string;
    appearance?: RemoteAppearance;
    asSpectator?: boolean;
    preferredSeatIndex?: number | null;
  }): Promise<{ ok: true; matchId: string; inviteCode: string } | { ok: false; error: string }> {
    const seq = ++this.opSeq;
    const cleanCode = sanitizeInviteCode(params.inviteCode);
    if (!cleanCode) {
      const errMsg = 'Mã mời phải gồm 6 ký tự chữ/số hợp lệ (ví dụ: KTX89A).';
      this.emit({ lastError: errMsg });
      return { ok: false, error: errMsg };
    }
    const eps = resolveBoardGameEndpoints();
    if (!eps.ok) {
      return { ok: false, error: eps.reason };
    }
    try {
      const res = await fetch(`${eps.httpBaseUrl}/api/boardgame/join-by-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: cleanCode }),
      });
      if (seq !== this.opSeq) {
        return { ok: false, error: 'Thao tác đã được thay thế.' };
      }
      const data = (await res.json()) as {
        ok?: boolean;
        match?: { matchId?: string; inviteCode?: string };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.match?.matchId) {
        const errMsg = data.error || 'Không tìm thấy phòng với mã mời này.';
        this.emit({ lastError: errMsg });
        return { ok: false, error: errMsg };
      }
      this.connectToMatch({
        matchId: data.match.matchId,
        inviteCode: data.match.inviteCode ?? cleanCode,
        displayName: sanitizeBoardGameName(params.displayName),
        appearance: params.appearance ?? {},
        asSpectator: Boolean(params.asSpectator),
        preferredSeatIndex: params.preferredSeatIndex ?? null,
      });
      return {
        ok: true,
        matchId: data.match.matchId,
        inviteCode: data.match.inviteCode ?? cleanCode,
      };
    } catch {
      const errMsg = 'Không thể tra cứu mã mời lúc này.';
      this.emit({ lastError: errMsg });
      return { ok: false, error: errMsg };
    }
  }

  connectToMatch(params: {
    matchId: string;
    inviteCode?: string;
    displayName: string;
    appearance?: RemoteAppearance;
    asSpectator?: boolean;
    preferredSeatIndex?: number | null;
  }): void {
    this.opSeq += 1;
    this.clearReconnectTimer();
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.joinCtx = {
      matchId: params.matchId,
      inviteCode: params.inviteCode,
      displayName: sanitizeBoardGameName(params.displayName),
      appearance: params.appearance ?? {},
      asSpectator: Boolean(params.asSpectator),
      preferredSeatIndex: params.preferredSeatIndex ?? null,
    };
    this.saveActiveMatchRef({
      matchId: params.matchId,
      inviteCode: params.inviteCode ?? null,
      displayName: this.joinCtx.displayName,
      asSpectator: this.joinCtx.asSpectator,
    });
    this.openMatchSocket(false);
  }

  /** Thử khôi phục trận đang chơi từ sessionStorage khi người chơi vừa tải lại trang (F5). */
  tryRestoreSessionMatch(displayName: string, appearance: RemoteAppearance): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
      const raw = window.sessionStorage.getItem(ACTIVE_MATCH_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        matchId?: string;
        inviteCode?: string | null;
        asSpectator?: boolean;
      };
      if (!parsed.matchId) return null;
      const auth = loadStoredBoardGameAuth(parsed.matchId);
      if (!auth) return null;
      this.connectToMatch({
        matchId: parsed.matchId,
        inviteCode: parsed.inviteCode ?? auth.inviteCode,
        displayName,
        appearance,
        asSpectator: Boolean(parsed.asSpectator ?? auth.isSpectator),
      });
      return parsed.matchId;
    } catch {
      return null;
    }
  }

  private openMatchSocket(isReconnect: boolean): void {
    const ctx = this.joinCtx;
    if (!ctx) return;
    const eps = resolveBoardGameEndpoints();
    if (!eps.ok) {
      this.emit({ connectionState: 'error', lastError: eps.reason });
      return;
    }
    this.teardownMatchSocketOnly();
    this.emit({
      connectionState: isReconnect ? 'reconnecting' : 'connecting',
      matchId: ctx.matchId,
      inviteCode: ctx.inviteCode ?? this.snap.inviteCode,
      lastError: null,
      fencedByNewTab: false,
    });

    const qs = new URLSearchParams({ matchId: ctx.matchId });
    const sock = new WebSocket(`${eps.wsBaseUrl}/ws/boardgame?${qs.toString()}`);
    this.ws = sock;

    sock.onopen = () => {
      if (this.ws !== sock) return;
      this.reconnectAttempts = 0;
      const storedAuth = loadStoredBoardGameAuth(ctx.matchId);
      const joinMsg: BoardGameClientMessage = {
        type: 'BG_JOIN',
        matchId: ctx.matchId,
        ...(ctx.inviteCode ? { inviteCode: ctx.inviteCode } : {}),
        displayName: ctx.displayName,
        appearance: ctx.appearance,
        asSpectator: ctx.asSpectator,
        ...(!ctx.asSpectator ? { playerKey: getOrCreateStoredBoardGamePlayerKey() } : {}),
        ...(ctx.preferredSeatIndex !== null && ctx.preferredSeatIndex !== undefined
          ? { preferredSeatIndex: ctx.preferredSeatIndex }
          : {}),
        ...(storedAuth?.reconnectToken ? { reconnectToken: storedAuth.reconnectToken } : {}),
        requestId: this.nextRequestId(),
      };
      this.rawSend(joinMsg);
      this.startHeartbeat();
    };

    sock.onmessage = (ev) => {
      if (this.ws !== sock || typeof ev.data !== 'string') return;
      const parsed = parseBoardGameServerMessage(ev.data);
      if (!parsed) return;
      this.handleServerMessage(parsed);
    };

    sock.onclose = (ev) => {
      if (this.ws !== sock) return;
      this.ws = null;
      this.stopHeartbeat();
      if (ev.code === BG_WS_FENCE_CLOSE_CODE) {
        this.intentionalClose = true;
        this.emit({
          connectionState: 'error',
          fencedByNewTab: true,
          lastError: 'Phiên kết nối đã được chuyển sang tab mới hơn.',
        });
        return;
      }
      if (!this.intentionalClose && this.joinCtx) {
        const delay =
          RECONNECT_BACKOFF_MS[Math.min(this.reconnectAttempts, RECONNECT_BACKOFF_MS.length - 1)];
        this.reconnectAttempts += 1;
        this.emit({ connectionState: 'reconnecting' });
        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
          this.openMatchSocket(true);
        }, delay);
      }
    };

    sock.onerror = () => {
      // handled cleanly by onclose
    };
  }

  private handleServerMessage(msg: NonNullable<ReturnType<typeof parseBoardGameServerMessage>>): void {
    switch (msg.type) {
      case 'BG_AUTH_ISSUED': {
        if (
          typeof msg.protocolVersion === 'number' &&
          msg.protocolVersion > BOARD_GAME_PROTOCOL_VERSION
        ) {
          this.intentionalClose = true;
          this.emit({
            lastError: `Phiên bản giao thức máy chủ (v${msg.protocolVersion}) mới hơn trình khách. Vui lòng tải lại trang.`,
          });
          return;
        }
        saveStoredBoardGameAuth({
          matchId: msg.matchId,
          inviteCode: msg.inviteCode,
          playerId: msg.playerId,
          reconnectToken: msg.reconnectToken,
          isSpectator: msg.isSpectator,
          savedAtMs: Date.now(),
        });
        this.emit({
          connectionState: 'connected',
          matchId: msg.matchId,
          inviteCode: msg.inviteCode,
          playerId: msg.playerId,
          isSpectator: msg.isSpectator,
          lastError: null,
        });
        return;
      }
      case 'BG_STATE_SYNC': {
        if (
          (typeof msg.protocolVersion === 'number' &&
            msg.protocolVersion > BOARD_GAME_PROTOCOL_VERSION) ||
          (msg.publicGame &&
            typeof msg.publicGame.rulesetVersion === 'number' &&
            msg.publicGame.rulesetVersion > BOARD_GAME_RULESET_VERSION)
        ) {
          this.intentionalClose = true;
          this.emit({
            lastError: 'Phiên bản luật chơi trên máy chủ mới hơn trình khách. Vui lòng tải lại trang.',
          });
          return;
        }
        if (
          msg.status === 'FINISHED' &&
          msg.publicGame?.finalReveal &&
          msg.publicGame.finalReveal.length > 0
        ) {
          this.recordLocalMatchFromSync(msg.matchId, msg.players, msg.publicGame, msg.privateView);
        }
        this.emit({
          connectionState: 'connected',
          matchId: msg.matchId,
          inviteCode: msg.inviteCode,
          tableId: msg.tableId,
          status: msg.status,
          revision: msg.revision,
          hostPlayerId: msg.hostPlayerId,
          players: msg.players,
          spectatorCount: msg.spectatorCount,
          turnDeadlineMs: msg.turnDeadlineMs,
          publicGame: msg.publicGame,
          privateView: msg.privateView,
          lastError: null,
        });
        return;
      }
      case 'BG_ACTION_ACK': {
        const entry = this.pendingAck.get(msg.requestId);
        if (entry) {
          clearTimeout(entry.timer);
          this.pendingAck.delete(msg.requestId);
          entry.resolve(msg.ok, msg.reason);
        }
        return;
      }
      case 'BG_ERROR': {
        if (msg.requestId) {
          const entry = this.pendingAck.get(msg.requestId);
          if (entry) {
            clearTimeout(entry.timer);
            this.pendingAck.delete(msg.requestId);
            entry.resolve(false, msg.message);
          }
        }
        if ((msg.code === 'MATCH_NOT_FOUND' || msg.code === 'UNAUTHORIZED') && this.joinCtx) {
          clearStoredBoardGameAuth(this.joinCtx.matchId);
          this.clearActiveMatchRef();
          if (msg.code === 'MATCH_NOT_FOUND') {
            this.intentionalClose = true;
          }
        }
        this.emit({ lastError: msg.message });
        return;
      }
      case 'BG_CHAT_EMOTE': {
        const next = [...this.snap.recentEmotes.slice(-19), msg];
        this.emit({ recentEmotes: next });
        return;
      }
      case 'BG_PONG':
        return;
    }
  }

  // -------------------------------------------------------------------------
  // Lobby & Match Action Senders
  // -------------------------------------------------------------------------

  private rawSend(msg: BoardGameClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== 1) return false;
    try {
      this.ws.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  selectSeat(seatIndex: number): void {
    this.rawSend({ type: 'BG_SELECT_SEAT', seatIndex, requestId: this.nextRequestId() });
  }

  standUp(): void {
    this.rawSend({ type: 'BG_STAND_UP', requestId: this.nextRequestId() });
  }

  setReady(ready: boolean): void {
    this.rawSend({ type: 'BG_SET_READY', ready, requestId: this.nextRequestId() });
  }

  startMatch(turnTimeoutMs?: number): void {
    this.rawSend({
      type: 'BG_START_MATCH',
      requestId: this.nextRequestId(),
      ...(typeof turnTimeoutMs === 'number' ? { turnTimeoutMs } : {}),
    });
  }

  sendGameAction(
    action: BoardGameActionPayload,
  ): Promise<{ ok: boolean; reason?: string }> {
    const requestId = this.nextRequestId();
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== 1) {
        resolve({ ok: false, reason: 'Chưa kết nối tới phòng đấu.' });
        return;
      }
      const timer = setTimeout(() => {
        this.pendingAck.delete(requestId);
        resolve({ ok: false, reason: 'Hết thời gian chờ phản hồi từ máy chủ.' });
      }, 8000);
      this.pendingAck.set(requestId, {
        resolve: (ok, reason) => resolve({ ok, reason }),
        timer,
      });
      this.rawSend({
        type: 'BG_GAME_ACTION',
        requestId,
        expectedRevision: this.snap.revision,
        action,
      });
    });
  }

  sendEmote(emote: BoardGameEmoteId): void {
    this.rawSend({ type: 'BG_CHAT_EMOTE', emote, requestId: this.nextRequestId() });
  }

  sendChat(text: string): void {
    this.rawSend({ type: 'BG_CHAT_EMOTE', text, requestId: this.nextRequestId() });
  }

  leaveMatch(): void {
    this.opSeq += 1;
    const currentId = this.snap.matchId ?? this.joinCtx?.matchId ?? null;
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (this.ws && this.ws.readyState === 1) {
      this.rawSend({ type: 'BG_LEAVE', requestId: this.nextRequestId() });
    }
    this.teardownMatchSocketOnly();
    if (currentId) {
      clearStoredBoardGameAuth(currentId);
    }
    this.clearActiveMatchRef();
    this.joinCtx = null;
    this.emit({
      ...EMPTY_SNAPSHOT,
      directoryMatches: this.snap.directoryMatches,
    });
  }

  requestSync(): void {
    this.rawSend({ type: 'BG_REQUEST_SYNC', requestId: this.nextRequestId() });
  }

  clearError(): void {
    this.emit({ lastError: null });
  }

  async fetchLeaderboard(
    period: BoardGameLeaderboardPeriod = 'alltime',
    faction: BoardGameLeaderboardFactionFilter = 'all',
  ): Promise<BoardGameLeaderboardResponse> {
    const localKey = getOrCreateStoredBoardGamePlayerKey();
    const eps = resolveBoardGameEndpoints();
    if (!eps.ok) {
      return this.buildLocalLeaderboardResponse(period, faction, localKey);
    }
    const qs = new URLSearchParams({ period, faction });
    if (localKey) {
      qs.set('playerKey', localKey);
    }
    try {
      const res = await fetch(`${eps.httpBaseUrl}/api/boardgame/leaderboard?${qs.toString()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as BoardGameLeaderboardResponse;
        if (data && data.ok && Array.isArray(data.entries)) {
          return data;
        }
      }
    } catch {
      // fallback to local storage leaderboard when worker/network unavailable
    }
    return this.buildLocalLeaderboardResponse(period, faction, localKey);
  }

  private recordLocalMatchFromSync(
    matchId: string,
    lobbyPlayers: readonly BoardGameLobbyPlayerView[],
    publicGame: BoardGamePublicGameView,
    privateView: BoardGamePrivateGameView | null,
  ): void {
    const reveals = publicGame.finalReveal;
    if (!reveals || reveals.length === 0) return;
    const dedupKey = `${matchId}:${publicGame.round}:${publicGame.turnNumber}`;
    if (this.recordedLocalMatches.has(dedupKey)) return;
    this.recordedLocalMatches.add(dedupKey);

    const nowMs = Date.now();
    const weekKey = computeLocalVnWeekKey(nowMs);
    const localSelfKey = getOrCreateStoredBoardGamePlayerKey() || 'bgk_local_self';
    const selfPlayerId = privateView?.playerId ?? this.snap.playerId;
    const map = loadLocalLeaderboardMap();

    for (const rec of reveals) {
      const playerKey =
        selfPlayerId && rec.playerId === selfPlayerId ? localSelfKey : `local_${rec.playerId}`;
      const lobbyMatch = lobbyPlayers.find((p) => p.playerId === rec.playerId);
      const appearance = sanitizeBoardGameAppearance(
        lobbyMatch?.appearance ?? publicGame.players.find((p) => p.playerId === rec.playerId)?.appearance,
      );
      const cleanName = sanitizeBoardGameName(rec.displayName);
      const pts =
        5 +
        (rec.won ? (rec.faction === 'wanderer' ? 30 : 25) : 0) +
        (rec.alive ? 2 : 0);
      const hunterInc = rec.won && rec.faction === 'lantern-guard' ? 1 : 0;
      const shadowInc = rec.won && rec.faction === 'mist-order' ? 1 : 0;
      const wandererInc = rec.won && rec.faction === 'wanderer' ? 1 : 0;

      const prev = map[playerKey];
      const nextStreak = rec.won ? (prev?.currentWinStreak ?? 0) + 1 : 0;
      const nextBest = Math.max(prev?.bestWinStreak ?? 0, nextStreak);
      const sameWeek = prev?.weekKey === weekKey;

      map[playerKey] = {
        playerKey,
        displayName: cleanName,
        appearance,
        matchesPlayed: (prev?.matchesPlayed ?? 0) + 1,
        wins: (prev?.wins ?? 0) + (rec.won ? 1 : 0),
        hunterWins: (prev?.hunterWins ?? 0) + hunterInc,
        shadowWins: (prev?.shadowWins ?? 0) + shadowInc,
        wandererWins: (prev?.wandererWins ?? 0) + wandererInc,
        eliminationsDealt: prev?.eliminationsDealt ?? 0,
        survivalsTotal: (prev?.survivalsTotal ?? 0) + (rec.alive ? 1 : 0),
        currentWinStreak: nextStreak,
        bestWinStreak: nextBest,
        ratingPoints: (prev?.ratingPoints ?? 0) + pts,
        weekKey,
        weeklyMatches: sameWeek ? (prev?.weeklyMatches ?? 0) + 1 : 1,
        weeklyWins: (sameWeek ? (prev?.weeklyWins ?? 0) : 0) + (rec.won ? 1 : 0),
        weeklyPoints: (sameWeek ? (prev?.weeklyPoints ?? 0) : 0) + pts,
        lastRoleId: rec.roleId,
        lastPlayedAtMs: nowMs,
      };
    }

    saveLocalLeaderboardMap(map);
  }

  private buildLocalLeaderboardResponse(
    period: BoardGameLeaderboardPeriod,
    faction: BoardGameLeaderboardFactionFilter,
    localSelfKey: string,
  ): BoardGameLeaderboardResponse {
    const nowMs = Date.now();
    const currentWeekKey = computeLocalVnWeekKey(nowMs);
    const map = loadLocalLeaderboardMap();
    const filtered = Object.values(map).filter((row) => {
      if (period === 'weekly' && (row.weekKey !== currentWeekKey || row.weeklyMatches <= 0)) {
        return false;
      }
      if (period === 'alltime' && row.matchesPlayed <= 0) {
        return false;
      }
      if (faction === 'lantern-guard' && row.hunterWins <= 0) return false;
      if (faction === 'mist-order' && row.shadowWins <= 0) return false;
      if (faction === 'wanderer' && row.wandererWins <= 0) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (period === 'weekly') {
        if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints;
        if (b.weeklyWins !== a.weeklyWins) return b.weeklyWins - a.weeklyWins;
      } else {
        if (b.ratingPoints !== a.ratingPoints) return b.ratingPoints - a.ratingPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
      }
      return b.lastPlayedAtMs - a.lastPlayedAtMs;
    });

    const entries: BoardGameLeaderboardEntry[] = filtered.map((row, idx) => {
      const ratingPoints = period === 'weekly' ? row.weeklyPoints : row.ratingPoints;
      const wins = period === 'weekly' ? row.weeklyWins : row.wins;
      const matchesPlayed = period === 'weekly' ? row.weeklyMatches : row.matchesPlayed;
      const winRatePct = matchesPlayed > 0 ? Math.round((wins * 100) / matchesPlayed) : 0;
      const isSelf = Boolean(localSelfKey && row.playerKey === localSelfKey);
      return {
        rank: idx + 1,
        playerKey: row.playerKey,
        displayName: row.displayName,
        appearance: row.appearance,
        ratingPoints,
        wins,
        matchesPlayed,
        winRatePct,
        hunterWins: row.hunterWins,
        shadowWins: row.shadowWins,
        wandererWins: row.wandererWins,
        eliminationsDealt: row.eliminationsDealt,
        survivalsTotal: row.survivalsTotal,
        currentWinStreak: row.currentWinStreak,
        bestWinStreak: row.bestWinStreak,
        lastRoleId: row.lastRoleId,
        lastPlayedAtMs: row.lastPlayedAtMs,
        ...(isSelf ? { isSelf: true } : {}),
      };
    });

    const myEntry = entries.find((e) => e.isSelf) ?? null;
    return {
      ok: true,
      period,
      faction,
      updatedAtMs: nowMs,
      totalPlayers: entries.length,
      entries: entries.slice(0, 50),
      myEntry,
    };
  }

  private teardownMatchSocketOnly(): void {
    this.stopHeartbeat();
    this.pendingAck.forEach((entry) => {
      clearTimeout(entry.timer);
      entry.resolve(false, 'Disconnected');
    });
    this.pendingAck.clear();
    if (this.ws) {
      try {
        this.ws.close(1000, 'Switching connection');
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.rawSend({ type: 'BG_PING', clientTimeMs: Date.now() });
    }, 25_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private saveActiveMatchRef(data: {
    matchId: string;
    inviteCode: string | null;
    displayName: string;
    asSpectator: boolean;
  }): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      window.sessionStorage.setItem(ACTIVE_MATCH_SESSION_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private clearActiveMatchRef(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      window.sessionStorage.removeItem(ACTIVE_MATCH_SESSION_KEY);
    } catch {
      // ignore
    }
  }
}

export const boardGameClient = new BoardGameClient();

export function useBoardGameClientSnapshot(): BoardGameClientSnapshot {
  return useSyncExternalStore(
    boardGameClient.subscribe,
    boardGameClient.getSnapshot,
    () => EMPTY_SNAPSHOT,
  );
}
