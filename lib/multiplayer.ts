// ---------------------------------------------------------------------------
// lib/multiplayer.ts — Client WebSocket cho đợt 5 (multiplayer) & PR9
// (Server-Authoritative Seat Occupancy & Live Study Presence).
//
// Bảo mật & Độ tin cậy (PR9 Review Fixes):
// 1. FIX 1 — Không cho phép tham số URL `?mpWs=` ghi đè máy chủ WebSocket
//    để tránh rò rỉ `sessionId` / `mssv` sang endpoint không tin cậy.
//    Trong môi trường local/test (`127.0.0.1` / `localhost`), chỉ chấp nhận
//    biến toàn cục `window.__HUST_TEST_MP_WS_URL` trỏ tới địa chỉ loopback.
// 2. FIX 2 & FIX 3 — Máy trạng thái giữ chỗ ghế tất định (`idle`, `requesting`,
//    `confirmed`, `rejected`, `timed-out`, `cancelled`, `releasing`) với
//    khớp lệnh nghiêm ngặt theo `(requestId, seatId, selfId, connectionGeneration)`.
//    Mọi Promise luôn kết thúc đúng 1 lần; nếu ACK đến muộn sau khi đã
//    timeout hoặc hủy, client tự động gửi `study:release-seat` để giải phóng
//    ghế mồ côi trên server.
// ---------------------------------------------------------------------------

import {
  ROOM_IDS,
  extractValidAppearance,
  isRemoteState,
  type RemoteAppearance,
  type RemotePlayer,
  type RemoteState,
} from '../shared/contracts/multiplayer';
import {
  isSupportedLibrarySeatId,
  sanitizeRequestId,
  sanitizeSeatOccupancy,
  sanitizeStudyPresence,
  type PlayerStudyPresence,
  type PomodoroPhase,
  type SeatClaimRejectionReason,
  type SeatOccupancy,
} from '../shared/contracts/study';
import { SPAWN } from '../shared/constants/world';

export type { RemoteAppearance, RemotePlayer, RemoteState };

export type MpStatus = 'idle' | 'connecting' | 'online' | 'offline';

export type SeatClaimClientState =
  | 'idle'
  | 'requesting'
  | 'confirmed'
  | 'rejected'
  | 'timed-out'
  | 'cancelled'
  | 'releasing';

export type SeatClaimFailureReason =
  | SeatClaimRejectionReason
  | 'timeout'
  | 'offline'
  | 'cancelled'
  | 'pending-request';

export interface PendingSeatRequest {
  seatId: string;
  requestId: string;
  requestedAtMs: number;
  connectionGeneration: number;
}

export interface SeatRejectionNotice {
  seatId: string;
  reason: SeatClaimFailureReason;
  occupiedBy?: string;
  occupiedByName?: string;
  requestId?: string;
  atMs: number;
}

export type SeatClaimOutcome =
  | {
      ok: true;
      occupancy: SeatOccupancy;
      requestId: string;
    }
  | {
      ok: false;
      seatId: string;
      reason: SeatClaimFailureReason;
      occupiedBy?: string;
      occupiedByName?: string;
      requestId: string;
    };

export interface MultiplayerSnapshot {
  status: MpStatus;
  roomId: string | null;
  count: number;
  players: RemotePlayer[];
  selfId: string | null;
  error: string | null;
  // PR9 Server-Authoritative Seat Occupancy & Live Study Presence:
  seats: SeatOccupancy[];
  seatMap: Record<string, SeatOccupancy>;
  presences: Record<string, PlayerStudyPresence>;
  mySeatId: string | null;
  seatClaimState: SeatClaimClientState;
  pendingSeatRequest: PendingSeatRequest | null;
  lastSeatRejection: SeatRejectionNotice | null;
  studyRevision: number;
}

export const TRUSTED_PROD_WS_URL = 'wss://hust-hsk-rooms.hunganhz179.workers.dev/ws';

export const TRUSTED_PROD_WS_HOSTS: ReadonlySet<string> = new Set([
  'hust-hsk-rooms.hunganhz179.workers.dev',
]);

export const LOOPBACK_WS_HOSTS: ReadonlySet<string> = new Set([
  '127.0.0.1',
  'localhost',
  '[::1]',
  '::1',
]);

const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_HUST_MULTIPLAYER_WS_URL || TRUSTED_PROD_WS_URL;

const HEARTBEAT_MS = 30000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const MAX_RECONNECTS = 10;
export const SEAT_CLAIM_TIMEOUT_MS = 4000;
const MAX_TERMINATED_REQUEST_HISTORY = 64;

export function isLoopbackHostname(hostname: unknown): boolean {
  if (typeof hostname !== 'string') return false;
  return LOOPBACK_WS_HOSTS.has(hostname.trim().toLowerCase());
}

export type WsEndpointValidationResult =
  | {
      ok: true;
      url: string;
      hostname: string;
      protocol: 'ws:' | 'wss:';
      isLoopback: boolean;
    }
  | {
      ok: false;
      reason:
        | 'empty'
        | 'malformed-url'
        | 'invalid-protocol'
        | 'credentials-forbidden'
        | 'untrusted-host';
    };

export function validateWsEndpointUrl(
  rawUrl: unknown,
  options?: {
    allowLoopback?: boolean;
    requireLoopbackOnly?: boolean;
    extraTrustedHosts?: Iterable<string>;
  },
): WsEndpointValidationResult {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { ok: false, reason: 'empty' };
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: 'malformed-url' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'credentials-forbidden' };
  }

  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    return { ok: false, reason: 'invalid-protocol' };
  }

  const host = parsed.hostname.toLowerCase();
  const isLoopback = isLoopbackHostname(host);

  if (options?.requireLoopbackOnly) {
    if (!isLoopback) {
      return { ok: false, reason: 'untrusted-host' };
    }
    return {
      ok: true,
      url: parsed.toString(),
      hostname: host,
      protocol: parsed.protocol,
      isLoopback: true,
    };
  }

  if (isLoopback) {
    if (!options?.allowLoopback) {
      return { ok: false, reason: 'untrusted-host' };
    }
    return {
      ok: true,
      url: parsed.toString(),
      hostname: host,
      protocol: parsed.protocol,
      isLoopback: true,
    };
  }

  // Non-loopback endpoints must always use encrypted wss:
  if (parsed.protocol !== 'wss:') {
    return { ok: false, reason: 'invalid-protocol' };
  }

  const trustedHosts = new Set<string>(TRUSTED_PROD_WS_HOSTS);
  if (options?.extraTrustedHosts) {
    for (const h of Array.from(options.extraTrustedHosts)) {
      if (typeof h === 'string' && h.trim()) {
        trustedHosts.add(h.trim().toLowerCase());
      }
    }
  }

  if (!trustedHosts.has(host)) {
    return { ok: false, reason: 'untrusted-host' };
  }

  return {
    ok: true,
    url: parsed.toString(),
    hostname: host,
    protocol: parsed.protocol,
    isLoopback: false,
  };
}

export interface ResolveWsUrlInput {
  configuredUrl?: string;
  nodeEnv?: string;
  pageHostname?: string;
  pageSearch?: string;
  testOverrideUrl?: unknown;
}

export type ResolveWsUrlResult =
  | {
      ok: true;
      url: string;
      source: 'configured' | 'test-override';
    }
  | {
      ok: false;
      url: null;
      reason: string;
    };

/**
 * Resolves and validates the WebSocket endpoint URL.
 *
 * Security invariants (FIX 1):
 * - NEVER reads `?mpWs=` or any URL query parameter to override the WebSocket
 *   host/endpoint. Query parameters can only select a valid room (`?room=hsk-1`..`hsk-5`).
 * - In production on non-loopback origins, runtime window overrides are ignored
 *   and only the trusted configured `wss://` endpoint is permitted.
 * - In local development or localhost Playwright tests (`pageHostname` is loopback),
 *   `window.__HUST_TEST_MP_WS_URL` (or `window.__HUST_MP_WS_URL`) may override the
 *   endpoint ONLY if the target WebSocket URL is itself a loopback `ws://` or `wss://` URL.
 */
export function resolveWsUrl(input?: ResolveWsUrlInput): ResolveWsUrlResult {
  const configuredRaw =
    input?.configuredUrl !== undefined ? input.configuredUrl : DEFAULT_WS_URL;
  const nodeEnv =
    input?.nodeEnv !== undefined
      ? input.nodeEnv
      : typeof process !== 'undefined' && process.env?.NODE_ENV
        ? process.env.NODE_ENV
        : 'production';

  let pageHostname = input?.pageHostname;
  let pageSearch = input?.pageSearch;
  let testOverrideUrl = input?.testOverrideUrl;

  if (typeof window !== 'undefined') {
    if (pageHostname === undefined) {
      pageHostname = window.location?.hostname ?? '';
    }
    if (pageSearch === undefined) {
      pageSearch = window.location?.search ?? '';
    }
    if (testOverrideUrl === undefined) {
      const win = window as unknown as {
        __HUST_TEST_MP_WS_URL?: unknown;
        __HUST_MP_WS_URL?: unknown;
      };
      testOverrideUrl = win.__HUST_TEST_MP_WS_URL ?? win.__HUST_MP_WS_URL;
    }
  }

  const isLocalPage = isLoopbackHostname(pageHostname);
  const allowLocalTestOverride = isLocalPage || nodeEnv === 'test';
  const allowLoopbackConfigured = allowLocalTestOverride || nodeEnv !== 'production';

  // Extract configured host if it is a valid wss:// URL from build configuration
  const extraTrustedHosts: string[] = [];
  try {
    const cfgUrl = new URL(configuredRaw);
    if (cfgUrl.protocol === 'wss:' && cfgUrl.hostname && !cfgUrl.username && !cfgUrl.password) {
      extraTrustedHosts.push(cfgUrl.hostname.toLowerCase());
    }
  } catch {
    // handled by validateWsEndpointUrl below
  }

  let baseResolved: string | null = null;
  let source: 'configured' | 'test-override' = 'configured';

  if (
    allowLocalTestOverride &&
    typeof testOverrideUrl === 'string' &&
    testOverrideUrl.trim().length > 0
  ) {
    const overrideCheck = validateWsEndpointUrl(testOverrideUrl, {
      requireLoopbackOnly: true,
    });
    if (!overrideCheck.ok) {
      return {
        ok: false,
        url: null,
        reason: `Rejected untrusted test WS override (${overrideCheck.reason})`,
      };
    }
    baseResolved = overrideCheck.url;
    source = 'test-override';
  } else {
    const cfgCheck = validateWsEndpointUrl(configuredRaw, {
      allowLoopback: allowLoopbackConfigured,
      extraTrustedHosts,
    });
    if (!cfgCheck.ok) {
      return {
        ok: false,
        url: null,
        reason: `Rejected configured WS URL (${cfgCheck.reason})`,
      };
    }
    baseResolved = cfgCheck.url;
    source = 'configured';
  }

  // Safely append ?room=hsk-X if present in pageSearch and valid
  if (typeof pageSearch === 'string' && pageSearch.length > 0) {
    try {
      const params = new URLSearchParams(pageSearch);
      const roomParam = params.get('room');
      if (roomParam && (ROOM_IDS as readonly string[]).includes(roomParam)) {
        const finalUrl = new URL(baseResolved);
        if (!finalUrl.searchParams.has('room')) {
          finalUrl.searchParams.set('room', roomParam);
        }
        baseResolved = finalUrl.toString();
      }
    } catch {
      // ignore malformed search string
    }
  }

  return {
    ok: true,
    url: baseResolved,
    source,
  };
}

type Listener = (snap: MultiplayerSnapshot) => void;

export interface RequestSeatClaimOptions {
  subjectTag?: string | null;
  pomodoroPhase?: PomodoroPhase;
  /**
   * When true, if another claim request is already in-flight, reject the new
   * request immediately with `reason: 'pending-request'` instead of cancelling
   * and superseding the earlier request.
   */
  rejectIfPending?: boolean;
}

export interface MultiplayerClientOptions {
  webSocketFactory?: (url: string) => WebSocket;
  setTimeoutFn?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (id: ReturnType<typeof setTimeout>) => void;
  nowFn?: () => number;
  claimTimeoutMs?: number;
  resolveUrlFn?: () => ResolveWsUrlResult;
}

interface TerminatedClaimRecord {
  seatId: string;
  reason: 'timed-out' | 'cancelled' | 'offline';
  connectionGeneration: number;
  terminatedAtMs: number;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private status: MpStatus = 'idle';
  private roomId: string | null = null;
  private count = 0;
  private players = new Map<string, RemotePlayer>();
  private selfId: string | null = null;
  private error: string | null = null;
  private sessionId = '';
  private name = '';
  private mssv = '';
  private appearance: RemoteAppearance = {};
  private reconnects = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;
  private listeners = new Set<Listener>();

  // PR9 Study Rooms & Authoritative Seat Occupancy state
  private seats = new Map<string, SeatOccupancy>();
  private presences = new Map<string, PlayerStudyPresence>();
  private mySeatId: string | null = null;
  private seatClaimState: SeatClaimClientState = 'idle';
  private pendingSeatRequest: PendingSeatRequest | null = null;
  private pendingClaimTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingClaimResolvers = new Map<string, (outcome: SeatClaimOutcome) => void>();
  private terminatedClaimRequests = new Map<string, TerminatedClaimRecord>();
  private orphanedServerSeatId: string | null = null;
  private lastSeatRejection: SeatRejectionNotice | null = null;
  private studyRevision = 0;
  private reqCounter = 0;
  private connectionGeneration = 0;

  private readonly webSocketFactory: (url: string) => WebSocket;
  private readonly setTimeoutFn: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  private readonly clearTimeoutFn: (id: ReturnType<typeof setTimeout>) => void;
  private readonly nowFn: () => number;
  private readonly claimTimeoutMs: number;
  private readonly resolveUrlFn: () => ResolveWsUrlResult;

  constructor(options?: MultiplayerClientOptions) {
    this.webSocketFactory = options?.webSocketFactory ?? ((url: string) => new WebSocket(url));
    this.setTimeoutFn =
      options?.setTimeoutFn ?? ((cb, ms) => setTimeout(cb, ms));
    this.clearTimeoutFn =
      options?.clearTimeoutFn ?? ((id) => clearTimeout(id));
    this.nowFn = options?.nowFn ?? (() => Date.now());
    this.claimTimeoutMs = options?.claimTimeoutMs ?? SEAT_CLAIM_TIMEOUT_MS;
    this.resolveUrlFn = options?.resolveUrlFn ?? (() => resolveWsUrl());
  }

  get snapshot(): MultiplayerSnapshot {
    const seatsList = Array.from(this.seats.values());
    const seatMap: Record<string, SeatOccupancy> = {};
    for (const s of seatsList) {
      seatMap[s.seatId] = s;
    }
    const presencesMap: Record<string, PlayerStudyPresence> = {};
    for (const [pid, pres] of Array.from(this.presences.entries())) {
      presencesMap[pid] = pres;
    }
    return {
      status: this.status,
      roomId: this.roomId,
      count: this.count,
      players: Array.from(this.players.values()),
      selfId: this.selfId,
      error: this.error,
      seats: seatsList,
      seatMap,
      presences: presencesMap,
      mySeatId: this.mySeatId,
      seatClaimState: this.seatClaimState,
      pendingSeatRequest: this.pendingSeatRequest ? { ...this.pendingSeatRequest } : null,
      lastSeatRejection: this.lastSeatRejection ? { ...this.lastSeatRejection } : null,
      studyRevision: this.studyRevision,
    };
  }

  getSnapshot(): MultiplayerSnapshot {
    return this.snapshot;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const snap = this.snapshot;
    for (const fn of Array.from(this.listeners)) {
      try {
        fn(snap);
      } catch {
        // Listener lỗi không được làm sập client.
      }
    }
  }

  private setStatus(status: MpStatus, error: string | null = null) {
    this.status = status;
    if (error !== null) this.error = error;
    this.emit();
  }

  private clearPendingClaimTimer() {
    if (this.pendingClaimTimer) {
      this.clearTimeoutFn(this.pendingClaimTimer);
      this.pendingClaimTimer = null;
    }
  }

  private recordTerminatedClaim(
    requestId: string,
    seatId: string,
    reason: 'timed-out' | 'cancelled' | 'offline',
    connectionGeneration: number,
  ) {
    if (this.terminatedClaimRequests.size >= MAX_TERMINATED_REQUEST_HISTORY) {
      const oldestKey = this.terminatedClaimRequests.keys().next().value;
      if (oldestKey) this.terminatedClaimRequests.delete(oldestKey);
    }
    this.terminatedClaimRequests.set(requestId, {
      seatId,
      reason,
      connectionGeneration,
      terminatedAtMs: this.nowFn(),
    });
  }

  private settlePendingClaimAsFailed(
    requestId: string,
    seatId: string,
    reason: SeatClaimFailureReason,
    extra?: { occupiedBy?: string; occupiedByName?: string },
  ) {
    const resolver = this.pendingClaimResolvers.get(requestId);
    if (resolver) {
      this.pendingClaimResolvers.delete(requestId);
      resolver({
        ok: false,
        seatId,
        reason,
        ...(extra?.occupiedBy ? { occupiedBy: extra.occupiedBy } : {}),
        ...(extra?.occupiedByName ? { occupiedByName: extra.occupiedByName } : {}),
        requestId,
      });
    }
  }

  /**
   * Explicitly cancels any in-flight seat claim request and settles its Promise
   * with `reason: 'cancelled'`. If the server later ACKs the cancelled request,
   * `onmessage` will automatically release the orphaned server seat.
   */
  cancelPendingSeatClaim(): boolean {
    if (!this.pendingSeatRequest) return false;
    this.clearPendingClaimTimer();
    const req = this.pendingSeatRequest;
    this.pendingSeatRequest = null;
    this.recordTerminatedClaim(
      req.requestId,
      req.seatId,
      'cancelled',
      req.connectionGeneration,
    );
    this.seatClaimState = this.mySeatId ? 'confirmed' : 'cancelled';
    const cancelNotice: SeatRejectionNotice = {
      seatId: req.seatId,
      reason: 'cancelled',
      requestId: req.requestId,
      atMs: this.nowFn(),
    };
    this.lastSeatRejection = cancelNotice;
    this.settlePendingClaimAsFailed(req.requestId, req.seatId, 'cancelled');
    this.emit();
    return true;
  }

  /**
   * Sends an authoritative release for a seat that the server assigned to `selfId`
   * from a timed-out, cancelled, or stale request that the client did not accept.
   */
  private releaseOrphanedServerSeat(seatId: string) {
    if (!seatId) return;
    this.orphanedServerSeatId = null;
    const currentOcc = this.seats.get(seatId);
    if (currentOcc && this.selfId && currentOcc.occupantId === this.selfId) {
      this.seats.delete(seatId);
    }
    if (this.selfId) {
      const pres = this.presences.get(this.selfId);
      if (pres && pres.seatId === seatId) {
        this.presences.set(this.selfId, {
          ...pres,
          seatId: this.mySeatId,
          updatedAtMs: this.nowFn(),
        });
      }
    }
    if (!this.mySeatId && !this.pendingSeatRequest) {
      this.seatClaimState = 'releasing';
    }
    if (
      this.status === 'online' &&
      this.ws &&
      this.ws.readyState === 1 /* WebSocket.OPEN */ &&
      this.selfId
    ) {
      const releaseReqId = this.nextRequestId('release-orphan');
      try {
        this.ws.send(
          JSON.stringify({
            type: 'study:release-seat',
            seatId,
            requestId: releaseReqId,
          }),
        );
      } catch {
        if (!this.mySeatId && !this.pendingSeatRequest) {
          this.seatClaimState = 'idle';
        }
      }
    } else if (!this.mySeatId && !this.pendingSeatRequest) {
      this.seatClaimState = 'idle';
    }
  }

  private clearLiveStudyRoomState(reason: 'offline' | 'disconnect' = 'offline') {
    this.clearPendingClaimTimer();
    if (this.pendingSeatRequest) {
      const req = this.pendingSeatRequest;
      this.pendingSeatRequest = null;
      this.recordTerminatedClaim(
        req.requestId,
        req.seatId,
        'offline',
        req.connectionGeneration,
      );
      this.settlePendingClaimAsFailed(req.requestId, req.seatId, 'offline');
    }
    for (const [reqId, resolver] of Array.from(this.pendingClaimResolvers.entries())) {
      this.pendingClaimResolvers.delete(reqId);
      resolver({
        ok: false,
        seatId: '',
        reason: 'offline',
        requestId: reqId,
      });
    }
    this.seats.clear();
    this.presences.clear();
    this.mySeatId = null;
    this.orphanedServerSeatId = null;
    this.seatClaimState = 'idle';
    this.studyRevision = 0;
    if (reason === 'disconnect') {
      this.lastSeatRejection = null;
      this.terminatedClaimRequests.clear();
    }
  }

  private nextRequestId(prefix: string): string {
    this.reqCounter += 1;
    const sid = (this.sessionId || 'anon').slice(0, 12).replace(/[^A-Za-z0-9_-]/g, '');
    return `${prefix}-${sid}-${this.nowFn()}-${this.reqCounter}`;
  }

  connect(sessionId: string, name: string, mssv: string, appearance: RemoteAppearance = {}) {
    this.sessionId = sessionId;
    this.name = name;
    this.mssv = mssv;
    this.appearance = { ...appearance };
    this.intentionalClose = false;
    this.reconnects = 0;
    this.error = null;
    this.openSocket();
  }

  /** Cập nhật tên, MSSV và ngoại hình nhân vật ngay trong phòng đang kết nối. */
  sendAppearance(name: string, mssv: string, appearance: RemoteAppearance) {
    this.name = name;
    this.mssv = mssv;
    this.appearance = { ...appearance };
    if (!this.ws || this.ws.readyState !== 1 /* WebSocket.OPEN */ || !this.selfId) return;
    try {
      this.ws.send(
        JSON.stringify({
          type: 'appearance',
          name: this.name,
          mssv: this.mssv,
          ...this.appearance,
        }),
      );
    } catch {
      // ignore
    }
  }

  /**
   * PR9 — Yêu cầu giữ chỗ ngồi học tại Thư viện Tạ Quang Bửu tới HskRoom Durable Object.
   *
   * Máy trạng thái:
   * - `idle → requesting → confirmed`
   * - `requesting → rejected | timed-out | cancelled`
   * - `confirmed → releasing → idle`
   *
   * Nếu có yêu cầu giữ ghế đang chờ (`pendingSeatRequest`):
   * - Nếu `options.rejectIfPending === true` hoặc yêu cầu trùng chính ghế đang chờ:
   *   từ chối ngay yêu cầu mới với `reason: 'pending-request'` mà không làm hỏng yêu cầu đang bay.
   * - Nếu yêu cầu đổi sang ghế khác (`seatB !== pending.seatId`):
   *   hủy tường minh và kết thúc Promise của yêu cầu cũ với `reason: 'cancelled'`,
   *   ghi nhận vào `terminatedClaimRequests` để nếu server vẫn ACK ghế cũ thì tự động
   *   đối soát/giải phóng ghế mồ côi mà không bao giờ gán nhầm ghế.
   */
  requestSeatClaim(
    seatId: string,
    options?: RequestSeatClaimOptions,
  ): Promise<SeatClaimOutcome> {
    const requestId = this.nextRequestId('claim');

    if (
      this.status !== 'online' ||
      !this.ws ||
      this.ws.readyState !== 1 /* WebSocket.OPEN */ ||
      !this.selfId ||
      this.studyRevision === 0
    ) {
      return Promise.resolve({
        ok: false,
        seatId,
        reason: 'offline',
        requestId,
      });
    }

    if (!isSupportedLibrarySeatId(seatId)) {
      const rejection: SeatRejectionNotice = {
        seatId,
        reason: 'invalid-seat',
        requestId,
        atMs: this.nowFn(),
      };
      this.lastSeatRejection = rejection;
      this.seatClaimState = this.mySeatId ? 'confirmed' : 'rejected';
      this.emit();
      return Promise.resolve({
        ok: false,
        seatId,
        reason: 'invalid-seat',
        requestId,
      });
    }

    const existingOcc = this.seats.get(seatId);
    if (existingOcc && existingOcc.occupantId !== this.selfId) {
      const rejection: SeatRejectionNotice = {
        seatId,
        reason: 'already-occupied',
        occupiedBy: existingOcc.occupantId,
        occupiedByName: existingOcc.occupantName,
        requestId,
        atMs: this.nowFn(),
      };
      this.lastSeatRejection = rejection;
      if (!this.pendingSeatRequest) {
        this.seatClaimState = this.mySeatId ? 'confirmed' : 'rejected';
      }
      this.emit();
      return Promise.resolve({
        ok: false,
        seatId,
        reason: 'already-occupied',
        occupiedBy: existingOcc.occupantId,
        occupiedByName: existingOcc.occupantName,
        requestId,
      });
    }

    // Handle concurrent in-flight claim request deterministically (FIX 3)
    if (this.pendingSeatRequest) {
      if (options?.rejectIfPending || this.pendingSeatRequest.seatId === seatId) {
        return Promise.resolve({
          ok: false,
          seatId,
          reason: 'pending-request',
          requestId,
        });
      }
      // Explicitly cancel and settle the earlier request before starting the new one
      this.cancelPendingSeatClaim();
    }

    const connGen = this.connectionGeneration;
    this.pendingSeatRequest = {
      seatId,
      requestId,
      requestedAtMs: this.nowFn(),
      connectionGeneration: connGen,
    };
    this.seatClaimState = 'requesting';
    this.lastSeatRejection = null;
    this.emit();

    return new Promise<SeatClaimOutcome>((resolve) => {
      this.pendingClaimResolvers.set(requestId, resolve);

      this.pendingClaimTimer = this.setTimeoutFn(() => {
        if (this.pendingSeatRequest?.requestId !== requestId) return;
        this.pendingSeatRequest = null;
        this.recordTerminatedClaim(requestId, seatId, 'timed-out', connGen);
        this.seatClaimState = this.mySeatId ? 'confirmed' : 'timed-out';
        const timeoutNotice: SeatRejectionNotice = {
          seatId,
          reason: 'timeout',
          requestId,
          atMs: this.nowFn(),
        };
        this.lastSeatRejection = timeoutNotice;
        this.settlePendingClaimAsFailed(requestId, seatId, 'timeout');
        if (this.orphanedServerSeatId && this.orphanedServerSeatId !== this.mySeatId) {
          this.releaseOrphanedServerSeat(this.orphanedServerSeatId);
        }
        this.emit();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('bkhn:mp-seat-rejected', { detail: timeoutNotice }),
          );
        }
      }, this.claimTimeoutMs);

      try {
        this.ws!.send(
          JSON.stringify({
            type: 'study:claim-seat',
            seatId,
            ...(options?.subjectTag ? { subjectTag: options.subjectTag } : {}),
            ...(options?.pomodoroPhase ? { pomodoroPhase: options.pomodoroPhase } : {}),
            requestId,
          }),
        );
      } catch {
        this.clearPendingClaimTimer();
        if (this.pendingSeatRequest?.requestId === requestId) {
          this.pendingSeatRequest = null;
        }
        this.recordTerminatedClaim(requestId, seatId, 'offline', connGen);
        this.seatClaimState = this.mySeatId ? 'confirmed' : 'idle';
        this.settlePendingClaimAsFailed(requestId, seatId, 'offline');
        this.emit();
      }
    });
  }

  /**
   * PR9 — Giải phóng ghế học đang ngồi trên server (hoặc hủy yêu cầu giữ ghế đang chờ).
   * Nếu `seatId` được truyền vào nhưng khác với `this.mySeatId` hiện tại (khi người chơi
   * đã chuyển sang ghế mới hợp lệ), không được phép giải phóng nhầm ghế mới.
   */
  requestSeatRelease(seatId?: string | null): void {
    // If a claim request is in-flight for the target seat (or any seat when seatId is omitted),
    // cancel and settle its Promise cleanly so it never hangs or auto-confirms on late ACK.
    if (
      this.pendingSeatRequest &&
      (!seatId || this.pendingSeatRequest.seatId === seatId)
    ) {
      this.cancelPendingSeatClaim();
    }

    // Guard against releasing a newer valid seat when a stale seatId is passed
    if (seatId && this.mySeatId && this.mySeatId !== seatId) {
      return;
    }

    const targetSeatId = seatId ?? this.mySeatId ?? this.orphanedServerSeatId;
    this.orphanedServerSeatId = null;

    if (this.mySeatId) {
      this.seatClaimState = 'releasing';
      this.seats.delete(this.mySeatId);
      this.mySeatId = null;
    } else if (!this.pendingSeatRequest && this.seatClaimState !== 'cancelled') {
      this.seatClaimState = targetSeatId ? 'releasing' : 'idle';
    }

    if (this.selfId) {
      const pres = this.presences.get(this.selfId);
      if (pres && pres.seatId && (!targetSeatId || pres.seatId === targetSeatId)) {
        this.presences.set(this.selfId, {
          ...pres,
          seatId: null,
          updatedAtMs: this.nowFn(),
        });
      }
    }
    this.emit();

    if (
      this.status !== 'online' ||
      !this.ws ||
      this.ws.readyState !== 1 /* WebSocket.OPEN */ ||
      !this.selfId
    ) {
      if (!this.pendingSeatRequest) {
        this.seatClaimState = 'idle';
      }
      this.emit();
      return;
    }

    const requestId = this.nextRequestId('release');
    try {
      this.ws.send(
        JSON.stringify({
          type: 'study:release-seat',
          ...(targetSeatId ? { seatId: targetSeatId } : {}),
          requestId,
        }),
      );
    } catch {
      if (!this.pendingSeatRequest) {
        this.seatClaimState = 'idle';
      }
      this.emit();
    }
  }

  /**
   * PR9 — Gửi trạng thái tự học công khai (`exploring | studying | break | idle`)
   * khi và chỉ khi có sự chuyển đổi trạng thái thực sự.
   */
  sendStudyPresence(presence: Partial<PlayerStudyPresence>) {
    if (
      this.status !== 'online' ||
      !this.ws ||
      this.ws.readyState !== 1 /* WebSocket.OPEN */ ||
      !this.selfId
    ) {
      return;
    }
    const sanitized = sanitizeStudyPresence(presence, this.nowFn());
    try {
      this.ws.send(
        JSON.stringify({
          type: 'study:presence',
          presence: {
            status: sanitized.status,
            studyRoomId: sanitized.studyRoomId,
            seatId: sanitized.seatId,
            pomodoroPhase: sanitized.pomodoroPhase,
            subjectTag: sanitized.subjectTag,
            updatedAtMs: sanitized.updatedAtMs,
          },
        }),
      );
    } catch {
      // ignore
    }
  }

  disconnect() {
    this.intentionalClose = true;
    this.connectionGeneration += 1;
    if (this.reconnectTimer) {
      this.clearTimeoutFn(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      try {
        oldWs.close();
      } catch {
        // ignore
      }
    }
    this.players.clear();
    this.clearLiveStudyRoomState('disconnect');
    this.roomId = null;
    this.count = 0;
    this.selfId = null;
    this.setStatus('idle');
  }

  /** Gửi vị trí + hướng + trạng thái hiện tại (gọi ~10 lần/giây khi đổi). */
  sendMove(x: number, z: number, facing: number, state: RemoteState) {
    if (!this.ws || this.ws.readyState !== 1 /* WebSocket.OPEN */ || !this.selfId) return;
    try {
      this.ws.send(JSON.stringify({ type: 'move', x, z, facing, state }));
    } catch {
      // ignore — lần gửi sau sẽ thử lại
    }
  }

  private openSocket() {
    if (this.ws) {
      const prevWs = this.ws;
      this.ws = null;
      try {
        prevWs.close();
      } catch {
        // ignore
      }
    }
    this.connectionGeneration += 1;
    const socketGen = this.connectionGeneration;

    const resolved = this.resolveUrlFn();
    if (!resolved.ok) {
      this.clearLiveStudyRoomState('offline');
      this.setStatus('offline', resolved.reason || 'Địa chỉ máy chủ không hợp lệ.');
      return;
    }

    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = this.webSocketFactory(resolved.url);
    } catch {
      this.scheduleReconnect('Không mở được kết nối.');
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws || this.connectionGeneration !== socketGen) return;
      this.reconnects = 0;
      ws.send(
        JSON.stringify({
          type: 'join',
          sessionId: this.sessionId,
          name: this.name,
          mssv: this.mssv,
          ...this.appearance,
        }),
      );
      this.startHeartbeat();
    };

    ws.onmessage = (ev) => {
      if (this.ws !== ws || this.connectionGeneration !== socketGen) return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      switch (msg.type) {
        case 'welcome': {
          this.selfId = typeof msg.id === 'string' ? msg.id : null;
          this.roomId = typeof msg.roomId === 'string' ? msg.roomId : null;
          this.count = typeof msg.count === 'number' ? msg.count : 0;
          this.players.clear();
          const list = Array.isArray(msg.players) ? msg.players : [];
          for (const p of list) {
            const rp = toRemotePlayer(p);
            if (rp && rp.id !== this.selfId) this.players.set(rp.id, rp);
          }
          this.setStatus('online', null);
          break;
        }
        case 'study:room-snapshot': {
          this.seats.clear();
          this.presences.clear();
          let foundMySeat: string | null = null;
          if (Array.isArray(msg.seats)) {
            for (const rawSeat of msg.seats) {
              const occ = sanitizeSeatOccupancy(rawSeat);
              if (occ) {
                this.seats.set(occ.seatId, occ);
                if (this.selfId && occ.occupantId === this.selfId) {
                  foundMySeat = occ.seatId;
                }
              }
            }
          } else if (msg.seats && typeof msg.seats === 'object') {
            for (const rawSeat of Object.values(msg.seats as Record<string, unknown>)) {
              const occ = sanitizeSeatOccupancy(rawSeat);
              if (occ) {
                this.seats.set(occ.seatId, occ);
                if (this.selfId && occ.occupantId === this.selfId) {
                  foundMySeat = occ.seatId;
                }
              }
            }
          }
          if (Array.isArray(msg.presences)) {
            for (const rawPres of msg.presences) {
              if (!rawPres || typeof rawPres !== 'object') continue;
              const rec = rawPres as Record<string, unknown>;
              const pid = typeof rec.playerId === 'string' ? rec.playerId : '';
              if (!pid) continue;
              const pres = sanitizeStudyPresence(rec);
              this.presences.set(pid, pres);
            }
          } else if (msg.presences && typeof msg.presences === 'object') {
            for (const [pid, rawPres] of Object.entries(
              msg.presences as Record<string, unknown>,
            )) {
              if (!pid || !rawPres || typeof rawPres !== 'object') continue;
              const pres = sanitizeStudyPresence(
                rawPres as Partial<PlayerStudyPresence>,
              );
              this.presences.set(pid, pres);
            }
          }
          if (typeof msg.revision === 'number' && msg.revision > 0) {
            this.studyRevision = Math.max(this.studyRevision, msg.revision);
          } else if (this.studyRevision === 0) {
            this.studyRevision = 1;
          }
          this.mySeatId = foundMySeat;
          if (!this.pendingSeatRequest) {
            this.seatClaimState = foundMySeat ? 'confirmed' : 'idle';
          }
          this.emit();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('bkhn:mp-study-snapshot', { detail: this.snapshot }),
            );
          }
          break;
        }
        case 'study:seat-claimed': {
          const occ = sanitizeSeatOccupancy(msg.occupancy ?? msg.seat);
          if (!occ) break;
          const msgRevision = typeof msg.revision === 'number' ? msg.revision : null;
          const reqId = sanitizeRequestId(msg.requestId);

          // 1. Remote player seat claim: always apply authoritative state
          if (!this.selfId || occ.occupantId !== this.selfId) {
            if (typeof msg.releasedSeatId === 'string' && msg.releasedSeatId) {
              this.seats.delete(msg.releasedSeatId);
            }
            for (const [sid, existing] of Array.from(this.seats.entries())) {
              if (existing.occupantId === occ.occupantId && sid !== occ.seatId) {
                this.seats.delete(sid);
              }
            }
            this.seats.set(occ.seatId, occ);
            if (msgRevision !== null) {
              this.studyRevision = Math.max(this.studyRevision, msgRevision);
            }
            // If another player claimed the seat we thought we owned, clear our ownership
            if (this.mySeatId === occ.seatId) {
              this.mySeatId = null;
              if (!this.pendingSeatRequest) {
                this.seatClaimState = 'idle';
              }
            }
            const existingPres = this.presences.get(occ.occupantId);
            if (existingPres) {
              this.presences.set(occ.occupantId, {
                ...existingPres,
                seatId: occ.seatId,
                studyRoomId: occ.studyRoomId,
                ...(occ.subjectTag !== undefined ? { subjectTag: occ.subjectTag } : {}),
              });
            }
            this.emit();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('bkhn:mp-seat-claimed', {
                  detail: { occupancy: occ, requestId: reqId ?? '' },
                }),
              );
            }
            break;
          }

          // 2. Self seat claim (`occ.occupantId === this.selfId`):
          // Case 2a: In-place metadata update (e.g. appearance change) for an ALREADY confirmed seat
          if (
            !reqId &&
            !this.pendingSeatRequest &&
            this.mySeatId === occ.seatId &&
            this.seatClaimState === 'confirmed'
          ) {
            this.seats.set(occ.seatId, occ);
            if (msgRevision !== null) {
              this.studyRevision = Math.max(this.studyRevision, msgRevision);
            }
            this.emit();
            break;
          }

          // Case 2b: Matches the active in-flight `pendingSeatRequest`
          const activeReq = this.pendingSeatRequest;
          const isMatchingActiveRequest =
            activeReq !== null &&
            reqId !== null &&
            activeReq.requestId === reqId &&
            activeReq.seatId === occ.seatId &&
            activeReq.connectionGeneration === this.connectionGeneration;

          if (isMatchingActiveRequest) {
            this.clearPendingClaimTimer();
            this.pendingSeatRequest = null;

            const prevOrphan = this.orphanedServerSeatId;
            this.orphanedServerSeatId = null;

            if (typeof msg.releasedSeatId === 'string' && msg.releasedSeatId) {
              this.seats.delete(msg.releasedSeatId);
            }
            if (prevOrphan && prevOrphan !== occ.seatId) {
              this.seats.delete(prevOrphan);
            }
            for (const [sid, existing] of Array.from(this.seats.entries())) {
              if (existing.occupantId === occ.occupantId && sid !== occ.seatId) {
                this.seats.delete(sid);
              }
            }
            this.seats.set(occ.seatId, occ);
            if (msgRevision !== null) {
              this.studyRevision = Math.max(this.studyRevision, msgRevision);
            }
            const existingPres = this.presences.get(occ.occupantId);
            if (existingPres) {
              this.presences.set(occ.occupantId, {
                ...existingPres,
                seatId: occ.seatId,
                studyRoomId: occ.studyRoomId,
                ...(occ.subjectTag !== undefined ? { subjectTag: occ.subjectTag } : {}),
              });
            }

            this.mySeatId = occ.seatId;
            this.seatClaimState = 'confirmed';
            this.lastSeatRejection = null;

            const resolver = this.pendingClaimResolvers.get(reqId);
            if (resolver) {
              this.pendingClaimResolvers.delete(reqId);
              resolver({ ok: true, occupancy: occ, requestId: reqId });
            }

            this.emit();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('bkhn:mp-seat-claimed', {
                  detail: { occupancy: occ, requestId: reqId },
                }),
              );
            }
            break;
          }

          // Case 2c: Unmatched, timed-out, cancelled, superseded, or out-of-order self claim ACK (FIX 2 & FIX 3)
          // Never accept an unmatched claim as local confirmed state or resolve a different request's Promise!
          if (activeReq && activeReq.seatId !== occ.seatId) {
            // A newer request `activeReq` is currently in-flight for a different seat.
            // Record `occ.seatId` as an orphaned server seat in case `activeReq` is later rejected or times out.
            this.orphanedServerSeatId = occ.seatId;
            if (msgRevision !== null) {
              this.studyRevision = Math.max(this.studyRevision, msgRevision);
            }
            this.emit();
            break;
          }

          if (this.mySeatId && this.mySeatId !== occ.seatId) {
            // We already have a confirmed seat `this.mySeatId` (e.g., reversed ACK order where B was confirmed first, then stale A arrived).
            if (msgRevision !== null && msgRevision < this.studyRevision) {
              // Out-of-order older packet: ignore completely so `this.mySeatId` remains intact.
              break;
            }
            if (msgRevision !== null) {
              this.studyRevision = Math.max(this.studyRevision, msgRevision);
            }
            // Server processed A after B; re-assert our confirmed seat `this.mySeatId` on the server so it switches back to `this.mySeatId`.
            if (
              this.status === 'online' &&
              this.ws &&
              this.ws.readyState === 1 /* WebSocket.OPEN */
            ) {
              const reassertReqId = this.nextRequestId('reassert');
              try {
                this.ws.send(
                  JSON.stringify({
                    type: 'study:claim-seat',
                    seatId: this.mySeatId,
                    requestId: reassertReqId,
                  }),
                );
              } catch {
                // ignore
              }
            }
            break;
          }

          // Otherwise: we are not seated locally (`!this.mySeatId`) and have no active claim for `occ.seatId`
          // (e.g. claim timed out or was cancelled before server ACK arrived).
          // Immediately release the orphaned seat on the server so no ghost occupancy remains!
          if (msgRevision !== null) {
            this.studyRevision = Math.max(this.studyRevision, msgRevision);
          }
          if (!this.mySeatId) {
            this.releaseOrphanedServerSeat(occ.seatId);
          }
          this.emit();
          break;
        }
        case 'study:seat-released': {
          const seatId = typeof msg.seatId === 'string' ? msg.seatId : '';
          const occupantId = typeof msg.occupantId === 'string' ? msg.occupantId : '';
          if (seatId) {
            const current = this.seats.get(seatId);
            if (current && (!occupantId || current.occupantId === occupantId)) {
              this.seats.delete(seatId);
            }
            if (this.orphanedServerSeatId === seatId) {
              this.orphanedServerSeatId = null;
            }
          }
          if (occupantId) {
            const pres = this.presences.get(occupantId);
            if (pres && (!seatId || pres.seatId === seatId)) {
              this.presences.set(occupantId, { ...pres, seatId: null });
            }
          }
          if (typeof msg.revision === 'number') {
            this.studyRevision = Math.max(this.studyRevision, msg.revision);
          }
          if (this.selfId && occupantId === this.selfId) {
            if (!seatId || this.mySeatId === seatId) {
              this.mySeatId = null;
            }
            if (!this.pendingSeatRequest && !this.mySeatId) {
              this.seatClaimState = 'idle';
            }
          } else if (seatId && this.mySeatId === seatId) {
            this.mySeatId = null;
            if (!this.pendingSeatRequest) {
              this.seatClaimState = 'idle';
            }
          }
          this.emit();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('bkhn:mp-seat-released', {
                detail: { seatId, occupantId, reason: msg.reason },
              }),
            );
          }
          break;
        }
        case 'study:seat-rejected': {
          const seatId = typeof msg.seatId === 'string' ? msg.seatId : '';
          const reqId = sanitizeRequestId(msg.requestId);
          if (typeof msg.revision === 'number') {
            this.studyRevision = Math.max(this.studyRevision, msg.revision);
          }

          // Strict correlation: only settle the active request if `reqId` matches `pendingSeatRequest.requestId`
          // (or if server omitted `reqId` and `seatId` matches `pendingSeatRequest.seatId`).
          const activeReq = this.pendingSeatRequest;
          const matchesActive =
            activeReq !== null &&
            activeReq.connectionGeneration === this.connectionGeneration &&
            ((reqId !== null && activeReq.requestId === reqId) ||
              (reqId === null && activeReq.seatId === seatId));

          if (!matchesActive) {
            break;
          }

          this.clearPendingClaimTimer();
          this.pendingSeatRequest = null;
          const reason = (
            typeof msg.reason === 'string' ? msg.reason : 'invalid-payload'
          ) as SeatClaimRejectionReason;
          const occupiedBy =
            typeof msg.occupiedBy === 'string'
              ? msg.occupiedBy
              : msg.occupiedBy &&
                  typeof msg.occupiedBy === 'object' &&
                  typeof (msg.occupiedBy as Record<string, unknown>).occupantId === 'string'
                ? ((msg.occupiedBy as Record<string, unknown>).occupantId as string)
                : undefined;
          const occupiedByName =
            typeof msg.occupiedByName === 'string'
              ? msg.occupiedByName
              : msg.occupiedBy &&
                  typeof msg.occupiedBy === 'object' &&
                  typeof (msg.occupiedBy as Record<string, unknown>).occupantName === 'string'
                ? ((msg.occupiedBy as Record<string, unknown>).occupantName as string)
                : undefined;

          const rejection: SeatRejectionNotice = {
            seatId: seatId || activeReq.seatId,
            reason,
            ...(occupiedBy ? { occupiedBy } : {}),
            ...(occupiedByName ? { occupiedByName } : {}),
            requestId: activeReq.requestId,
            atMs: this.nowFn(),
          };
          this.lastSeatRejection = rejection;
          this.seatClaimState = this.mySeatId ? 'confirmed' : 'rejected';

          this.settlePendingClaimAsFailed(
            activeReq.requestId,
            seatId || activeReq.seatId,
            reason,
            { occupiedBy, occupiedByName },
          );

          // If an earlier superseded claim `A` had been accepted on the server before `B` was rejected,
          // release the orphaned seat `A` now so the server does not keep `A` locked!
          if (this.orphanedServerSeatId && this.orphanedServerSeatId !== this.mySeatId) {
            this.releaseOrphanedServerSeat(this.orphanedServerSeatId);
          }

          this.emit();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('bkhn:mp-seat-rejected', { detail: rejection }),
            );
          }
          break;
        }
        case 'study:presence': {
          const playerId = typeof msg.playerId === 'string' ? msg.playerId : '';
          if (!playerId || !msg.presence || typeof msg.presence !== 'object') break;
          const sanitized = sanitizeStudyPresence(
            msg.presence as Partial<PlayerStudyPresence>,
          );
          let ownedSeatId: string | null = null;
          for (const occ of Array.from(this.seats.values())) {
            if (occ.occupantId === playerId) {
              ownedSeatId = occ.seatId;
              break;
            }
          }
          const reconciled: PlayerStudyPresence = {
            ...sanitized,
            seatId: ownedSeatId,
          };
          this.presences.set(playerId, reconciled);
          if (ownedSeatId) {
            const occ = this.seats.get(ownedSeatId);
            const nextSubjectTag = reconciled.subjectTag ?? undefined;
            if (occ && occ.subjectTag !== nextSubjectTag) {
              this.seats.set(ownedSeatId, {
                ...occ,
                subjectTag: nextSubjectTag,
              });
            }
          }
          if (typeof msg.revision === 'number') {
            this.studyRevision = Math.max(this.studyRevision, msg.revision);
          }
          this.emit();
          break;
        }
        case 'join': {
          const rp = toRemotePlayer(msg.player);
          if (rp && rp.id !== this.selfId) this.players.set(rp.id, rp);
          this.emit();
          break;
        }
        case 'appearance': {
          const rp = toRemotePlayer(msg.player);
          if (rp && rp.id !== this.selfId) {
            const prev = this.players.get(rp.id);
            if (prev) {
              prev.name = rp.name;
              prev.mssv = rp.mssv;
              prev.gender = rp.gender;
              prev.outfit = rp.outfit;
              prev.hairStyle = rp.hairStyle;
              prev.skirt = rp.skirt;
              prev.glasses = rp.glasses;
              prev.backpack = rp.backpack;
            } else {
              this.players.set(rp.id, rp);
            }
            for (const [sid, occ] of Array.from(this.seats.entries())) {
              if (occ.occupantId === rp.id) {
                this.seats.set(sid, {
                  ...occ,
                  occupantName: rp.name,
                  color: rp.color,
                  gender: rp.gender,
                  outfit: rp.outfit,
                  hairStyle: rp.hairStyle,
                  skirt: rp.skirt,
                  glasses: rp.glasses,
                  backpack: rp.backpack,
                });
              }
            }
            this.emit();
          }
          break;
        }
        case 'leave': {
          if (typeof msg.id === 'string') {
            this.players.delete(msg.id);
            this.presences.delete(msg.id);
            for (const [sid, occ] of Array.from(this.seats.entries())) {
              if (occ.occupantId === msg.id) {
                this.seats.delete(sid);
              }
            }
          }
          this.emit();
          break;
        }
        case 'move': {
          if (typeof msg.id !== 'string') break;
          const p = this.players.get(msg.id);
          if (!p) break;
          if (typeof msg.x === 'number') p.x = msg.x;
          if (typeof msg.z === 'number') p.z = msg.z;
          if (typeof msg.facing === 'number') p.facing = msg.facing;
          if (typeof msg.state === 'string' && isRemoteState(msg.state)) p.state = msg.state;
          break;
        }
        case 'state': {
          if (typeof msg.id !== 'string') break;
          const p = this.players.get(msg.id);
          if (p && typeof msg.state === 'string' && isRemoteState(msg.state)) p.state = msg.state;
          break;
        }
        case 'count': {
          if (typeof msg.count === 'number') this.count = msg.count;
          this.emit();
          break;
        }
        case 'full': {
          this.clearLiveStudyRoomState('offline');
          this.setStatus('offline', 'Phòng đã đầy — đang chơi một mình.');
          this.scheduleReconnect();
          break;
        }
        case 'error': {
          this.setStatus('offline', typeof msg.message === 'string' ? msg.message : 'Lỗi kết nối.');
          break;
        }
        case 'pong': {
          break;
        }
        default:
          break;
      }
    };

    ws.onclose = () => {
      if (this.ws !== ws || this.connectionGeneration !== socketGen) return;
      this.stopHeartbeat();
      if (this.intentionalClose) return;
      this.clearLiveStudyRoomState('offline');
      this.setStatus('offline', 'Mất kết nối — đang chơi một mình.');
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose sẽ xử lý tiếp (reconnect + status offline).
    };
  }

  private scheduleReconnect(reason?: string) {
    if (this.intentionalClose) return;
    if (this.reconnects >= MAX_RECONNECTS) {
      this.setStatus('offline', reason ?? 'Không kết nối được — đang chơi một mình.');
      return;
    }
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnects, RECONNECT_MAX_MS);
    this.reconnects += 1;
    if (this.reconnectTimer) this.clearTimeoutFn(this.reconnectTimer);
    this.reconnectTimer = this.setTimeoutFn(() => {
      if (!this.intentionalClose) this.openSocket();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === 1 /* WebSocket.OPEN */) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore
        }
      }
    }, HEARTBEAT_MS);
    (this.heartbeatTimer as { unref?: () => void })?.unref?.();
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

function toRemotePlayer(raw: unknown): RemotePlayer | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== 'string') return null;
  const appearance = extractValidAppearance(p);
  return {
    id: p.id,
    name: typeof p.name === 'string' ? p.name : 'Bạn',
    mssv: typeof p.mssv === 'string' ? p.mssv : '',
    color: typeof p.color === 'string' ? p.color : '#1F3A5F',
    x: typeof p.x === 'number' ? p.x : SPAWN.x,
    z: typeof p.z === 'number' ? p.z : SPAWN.z,
    facing: typeof p.facing === 'number' ? p.facing : 0,
    state: isRemoteState(p.state) ? p.state : 'idle',
    ...appearance,
  };
}

/** Singleton dùng chung cho cả app. */
export const multiplayer = new MultiplayerClient();
