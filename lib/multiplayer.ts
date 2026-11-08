// ---------------------------------------------------------------------------
// lib/multiplayer.ts — Client WebSocket cho đợt 5 (multiplayer).
// Phỏng theo lib/multiplayer.ts của Chùa Online 3D (đã chứng minh live):
// cùng protocol (join/move/state/ping, welcome/join/leave/move/state/count),
// cùng luật (reconnect backoff, heartbeat 30 s, gửi move 10 lần/giây khi
// đổi, reconnect cùng sessionId để không trùng avatar).
//
// Khác chùa ở: join kèm MSSV (server validate 8 chữ số); state thêm
// 'running' và 'riding'; màu áo do server hash từ sessionId (không có
// đỏ HUST — người chơi chính luôn mặc polo đỏ).
//
// KHÔNG đồng bộ điểm/quest/SRS/huy hiệu. Mất kết nối → chơi một mình,
// status 'offline' để HUD ghi rõ — không bao giờ báo số người giả.
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

export type SeatClaimClientState = 'idle' | 'requesting' | 'confirmed' | 'releasing';

export interface PendingSeatRequest {
  seatId: string;
  requestId: string;
  requestedAtMs: number;
}

export interface SeatRejectionNotice {
  seatId: string;
  reason: SeatClaimRejectionReason | 'timeout' | 'offline';
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
      reason: SeatClaimRejectionReason | 'timeout' | 'offline';
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

const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_HUST_MULTIPLAYER_WS_URL ||
  'wss://hust-hsk-rooms.hunganhz179.workers.dev/ws';

const HEARTBEAT_MS = 30000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const MAX_RECONNECTS = 10;
const SEAT_CLAIM_TIMEOUT_MS = 4000;

function resolveWsUrl(): string {
  let base = DEFAULT_WS_URL;
  if (typeof window !== 'undefined') {
    const winOverride = (window as unknown as { __HUST_MP_WS_URL?: string })
      .__HUST_MP_WS_URL;
    if (typeof winOverride === 'string' && winOverride.trim()) {
      base = winOverride.trim();
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const mpWsParam = params.get('mpWs');
      if (mpWsParam && /^wss?:\/\//i.test(mpWsParam.trim())) {
        base = mpWsParam.trim();
      }
      const roomParam = params.get('room');
      if (
        roomParam &&
        (ROOM_IDS as readonly string[]).includes(roomParam) &&
        !base.includes('room=')
      ) {
        const sep = base.includes('?') ? '&' : '?';
        base = `${base}${sep}room=${encodeURIComponent(roomParam)}`;
      }
    } catch {
      // ignore URL parse errors
    }
  }
  return base;
}

type Listener = (snap: MultiplayerSnapshot) => void;

class MultiplayerClient {
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
  private lastSeatRejection: SeatRejectionNotice | null = null;
  private studyRevision = 0;
  private reqCounter = 0;

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
      clearTimeout(this.pendingClaimTimer);
      this.pendingClaimTimer = null;
    }
  }

  private clearLiveStudyRoomState(reason: 'offline' | 'disconnect' = 'offline') {
    this.clearPendingClaimTimer();
    if (this.pendingSeatRequest) {
      const req = this.pendingSeatRequest;
      this.pendingSeatRequest = null;
      const resolver = this.pendingClaimResolvers.get(req.requestId);
      if (resolver) {
        this.pendingClaimResolvers.delete(req.requestId);
        resolver({
          ok: false,
          seatId: req.seatId,
          reason: 'offline',
          requestId: req.requestId,
        });
      }
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
    this.seatClaimState = 'idle';
    this.studyRevision = 0;
    if (reason === 'disconnect') {
      this.lastSeatRejection = null;
    }
  }

  private nextRequestId(prefix: string): string {
    this.reqCounter += 1;
    const sid = (this.sessionId || 'anon').slice(0, 12).replace(/[^A-Za-z0-9_-]/g, '');
    return `${prefix}-${sid}-${Date.now()}-${this.reqCounter}`;
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.selfId) return;
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
   * Tuân thủ máy trạng thái: idle -> requesting -> confirmed / rejected.
   */
  requestSeatClaim(
    seatId: string,
    options?: { subjectTag?: string | null; pomodoroPhase?: PomodoroPhase },
  ): Promise<SeatClaimOutcome> {
    const requestId = this.nextRequestId('claim');

    if (
      this.status !== 'online' ||
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
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
        atMs: Date.now(),
      };
      this.lastSeatRejection = rejection;
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

    // Supersede any older in-flight claim request
    this.clearPendingClaimTimer();
    if (this.pendingSeatRequest) {
      const oldReq = this.pendingSeatRequest;
      const oldResolver = this.pendingClaimResolvers.get(oldReq.requestId);
      if (oldResolver) {
        this.pendingClaimResolvers.delete(oldReq.requestId);
      }
    }

    this.pendingSeatRequest = {
      seatId,
      requestId,
      requestedAtMs: Date.now(),
    };
    this.seatClaimState = 'requesting';
    this.lastSeatRejection = null;
    this.emit();

    return new Promise<SeatClaimOutcome>((resolve) => {
      this.pendingClaimResolvers.set(requestId, resolve);

      this.pendingClaimTimer = setTimeout(() => {
        if (this.pendingSeatRequest?.requestId !== requestId) return;
        this.pendingSeatRequest = null;
        this.seatClaimState = this.mySeatId ? 'confirmed' : 'idle';
        this.pendingClaimResolvers.delete(requestId);
        const timeoutNotice: SeatRejectionNotice = {
          seatId,
          reason: 'timeout',
          requestId,
          atMs: Date.now(),
        };
        this.lastSeatRejection = timeoutNotice;
        this.emit();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('bkhn:mp-seat-rejected', { detail: timeoutNotice }),
          );
        }
        resolve({
          ok: false,
          seatId,
          reason: 'timeout',
          requestId,
        });
      }, SEAT_CLAIM_TIMEOUT_MS);

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
        this.pendingSeatRequest = null;
        this.seatClaimState = this.mySeatId ? 'confirmed' : 'idle';
        this.pendingClaimResolvers.delete(requestId);
        this.emit();
        resolve({
          ok: false,
          seatId,
          reason: 'offline',
          requestId,
        });
      }
    });
  }

  /**
   * PR9 — Giải phóng ghế học đang ngồi trên server.
   */
  requestSeatRelease(seatId?: string | null): void {
    this.clearPendingClaimTimer();
    this.pendingSeatRequest = null;
    const targetSeatId = seatId ?? this.mySeatId;
    if (this.mySeatId) {
      this.seatClaimState = 'releasing';
      this.seats.delete(this.mySeatId);
      this.mySeatId = null;
    } else {
      this.seatClaimState = 'idle';
    }
    if (this.selfId) {
      const pres = this.presences.get(this.selfId);
      if (pres && pres.seatId) {
        this.presences.set(this.selfId, { ...pres, seatId: null, updatedAtMs: Date.now() });
      }
    }
    this.emit();

    if (
      this.status !== 'online' ||
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.selfId
    ) {
      this.seatClaimState = 'idle';
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
      this.seatClaimState = 'idle';
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
      this.ws.readyState !== WebSocket.OPEN ||
      !this.selfId
    ) {
      return;
    }
    const sanitized = sanitizeStudyPresence(presence, Date.now());
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.selfId) return;
    try {
      this.ws.send(JSON.stringify({ type: 'move', x, z, facing, state }));
    } catch {
      // ignore — lần gửi sau sẽ thử lại
    }
  }

  private openSocket() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(resolveWsUrl());
    } catch {
      this.scheduleReconnect('Không mở được kết nối.');
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
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
          if (typeof msg.revision === 'number') {
            this.studyRevision = msg.revision;
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
          const occ = sanitizeSeatOccupancy(msg.occupancy);
          if (!occ) break;
          if (typeof msg.releasedSeatId === 'string' && msg.releasedSeatId) {
            this.seats.delete(msg.releasedSeatId);
          }
          for (const [sid, existing] of Array.from(this.seats.entries())) {
            if (existing.occupantId === occ.occupantId && sid !== occ.seatId) {
              this.seats.delete(sid);
            }
          }
          this.seats.set(occ.seatId, occ);
          if (typeof msg.revision === 'number') {
            this.studyRevision = Math.max(this.studyRevision, msg.revision);
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
          const reqId = sanitizeRequestId(msg.requestId) ?? this.pendingSeatRequest?.requestId ?? '';
          if (this.selfId && occ.occupantId === this.selfId) {
            this.clearPendingClaimTimer();
            this.pendingSeatRequest = null;
            this.mySeatId = occ.seatId;
            this.seatClaimState = 'confirmed';
            this.lastSeatRejection = null;
            const resolver = reqId ? this.pendingClaimResolvers.get(reqId) : undefined;
            if (resolver) {
              this.pendingClaimResolvers.delete(reqId);
              resolver({ ok: true, occupancy: occ, requestId: reqId });
            } else if (this.pendingClaimResolvers.size > 0) {
              for (const [pendingId, pendingResolver] of Array.from(
                this.pendingClaimResolvers.entries(),
              )) {
                this.pendingClaimResolvers.delete(pendingId);
                pendingResolver({ ok: true, occupancy: occ, requestId: pendingId });
              }
            }
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
        case 'study:seat-released': {
          const seatId = typeof msg.seatId === 'string' ? msg.seatId : '';
          const occupantId = typeof msg.occupantId === 'string' ? msg.occupantId : '';
          if (seatId) {
            const current = this.seats.get(seatId);
            if (current && (!occupantId || current.occupantId === occupantId)) {
              this.seats.delete(seatId);
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
          if (
            (this.selfId && occupantId === this.selfId) ||
            (seatId && this.mySeatId === seatId)
          ) {
            this.mySeatId = null;
            if (this.seatClaimState !== 'requesting') {
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
          if (
            this.pendingSeatRequest &&
            reqId &&
            this.pendingSeatRequest.requestId !== reqId &&
            !this.pendingClaimResolvers.has(reqId)
          ) {
            break;
          }
          this.clearPendingClaimTimer();
          if (!reqId || this.pendingSeatRequest?.requestId === reqId) {
            this.pendingSeatRequest = null;
          }
          this.seatClaimState = this.mySeatId ? 'confirmed' : 'idle';
          const reason = (
            typeof msg.reason === 'string' ? msg.reason : 'invalid-payload'
          ) as SeatClaimRejectionReason;
          const rejection: SeatRejectionNotice = {
            seatId,
            reason,
            ...(typeof msg.occupiedBy === 'string' ? { occupiedBy: msg.occupiedBy } : {}),
            ...(typeof msg.occupiedByName === 'string'
              ? { occupiedByName: msg.occupiedByName }
              : {}),
            ...(reqId ? { requestId: reqId } : {}),
            atMs: Date.now(),
          };
          this.lastSeatRejection = rejection;
          const targetReqId = reqId ?? '';
          const resolver = targetReqId
            ? this.pendingClaimResolvers.get(targetReqId)
            : undefined;
          if (resolver) {
            this.pendingClaimResolvers.delete(targetReqId);
            resolver({
              ok: false,
              seatId,
              reason,
              occupiedBy: rejection.occupiedBy,
              occupiedByName: rejection.occupiedByName,
              requestId: targetReqId,
            });
          } else if (this.pendingClaimResolvers.size === 1) {
            const [[onlyReqId, onlyResolver]] = Array.from(
              this.pendingClaimResolvers.entries(),
            );
            this.pendingClaimResolvers.delete(onlyReqId);
            onlyResolver({
              ok: false,
              seatId,
              reason,
              occupiedBy: rejection.occupiedBy,
              occupiedByName: rejection.occupiedByName,
              requestId: onlyReqId,
            });
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
          // Vị trí đổi trong object cũ (mutate in place) — RemotePlayers
          // đọc trực tiếp qua ref trong useFrame nên KHÔNG emit ở đây:
          // emit mỗi tin move (10/giây/người) sẽ re-render cả page.
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
          // Như move: chỉ đổi trạng thái trong object cũ, không emit.
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
      this.stopHeartbeat();
      if (this.intentionalClose) return;
      this.clearLiveStudyRoomState('offline');
      // Mất kết nối giữa chừng: vẫn giữ danh sách cũ trên màn hình cho
      // tới khi reconnect thành công, nhưng status nói rõ là offline.
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
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.intentionalClose) this.openSocket();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore
        }
      }
    }, HEARTBEAT_MS);
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

/** Singleton dùng chung cho cả app (giống chùa). */
export const multiplayer = new MultiplayerClient();
