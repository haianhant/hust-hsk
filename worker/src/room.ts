/**
 * HskRoom — one Cloudflare Durable Object = one HUST campus room.
 *
 * Adapted from the temple worker (~/workspace/chua-online/worker/src/room.ts)
 * — same rules, different world:
 * - No database for continuous position. Player state lives only in
 *   this object's memory (and WebSocket hibernation attachments while
 *   connected), and is forgotten on leave.
 *   Nothing is stored after leave: no name, no MSSV, no location.
 * - One player = one sessionId, chosen by the client and kept in its
 *   localStorage. Reconnecting with the same sessionId REPLACES the
 *   old socket, so a reconnect never creates a duplicate avatar.
 * - The server never trusts the client: it clamps positions to the
 *   authoritative campus bounds (shared/constants/world.ts), caps speed
 *   (riding is faster than running), sanitises names, validates MSSV
 *   (exactly 8 digits), and rate-limits messages.
 * - Only position, facing, movement state, riding state and appearance
 *   leave a client. No points, quests, SRS or progress are ever synced.
 * - WebSocket hibernation is used (acceptWebSocket + webSocket*
 *   handlers) with full session attachment serialization/restoration so
 *   an idle room costs no duration on the free tier and wakes up
 *   seamlessly without losing connected players.
 */

import {
  claimSeat,
  createSeatRegistry,
  getOccupantSeat,
  listOccupanciesForRoom,
  reconcileServerPresenceWithSeat,
  releaseSeatByOccupant,
  restoreSeatRegistryFromAttachments,
  updateOccupantMetaInSeatRegistry,
  type HibernatedSeatAttachment,
  type SeatRegistry,
} from '../../features/social/rooms/seat-manager';
import { BOUNDS, SPAWN } from '../../shared/constants/world';
import {
  MAX_MSG_PER_SEC,
  ROOM_CAPACITY,
  SHIRT_COLORS,
  clampMoveStep,
  derivePublicPlayerId,
  extractValidAppearance,
  hashString,
  isAvatarEmoteId,
  isRemoteState,
  pickShirtColor,
  sanitizeChatMessage,
  sanitizeMssv,
  sanitizeName,
  sanitizeReconnectToken,
  type AvatarGender,
  type AvatarHairStyle,
  type AvatarOutfitId,
  type Player,
  type PlayerState,
} from '../../shared/contracts/multiplayer';
import {
  MAX_STUDY_WS_PAYLOAD_BYTES,
  sanitizeRequestId,
  type PlayerPresenceStatus,
  type PlayerStudyPresence,
  type PomodoroPhase,
  type ServerStudyRoomSnapshotMessage,
} from '../../shared/contracts/study';

export {
  BOUNDS,
  ROOM_CAPACITY,
  SHIRT_COLORS,
  SPAWN,
  derivePublicPlayerId,
  hashString,
  sanitizeMssv,
  sanitizeName,
  sanitizeReconnectToken,
  type Player,
  type PlayerState,
};

export interface SocketAttachment {
  id: string;
  reconnectKey?: string;
  roomId?: string;
  name?: string;
  mssv?: string;
  color?: string;
  x?: number;
  z?: number;
  facing?: number;
  state?: PlayerState;
  gender?: AvatarGender;
  outfit?: AvatarOutfitId;
  hairStyle?: AvatarHairStyle;
  skirt?: boolean;
  glasses?: boolean;
  backpack?: boolean;
  lastUpdate?: number;
  seatId?: string | null;
  occupiedAtMs?: number | null;
  studyPresence?: {
    status?: PlayerPresenceStatus;
    pomodoroPhase?: PomodoroPhase;
    subjectTag?: string | null;
    updatedAtMs?: number;
  } | null;
  studyRevision?: number;
}

interface HibernatableWebSocket extends WebSocket {
  serializeAttachment?: (attachment: SocketAttachment) => void;
  deserializeAttachment?: () => SocketAttachment | null | undefined;
}

interface Session {
  id: string;
  reconnectKey: string;
  name: string;
  mssv: string;
  color: string;
  x: number;
  z: number;
  facing: number;
  state: PlayerState;
  gender?: AvatarGender;
  outfit?: AvatarOutfitId;
  hairStyle?: AvatarHairStyle;
  skirt?: boolean;
  glasses?: boolean;
  backpack?: boolean;
  lastUpdate: number;
  msgTimes: number[];
}

function applyAppearance(session: Session, msg: Record<string, unknown>) {
  const valid = extractValidAppearance(msg);
  if (valid.gender !== undefined) session.gender = valid.gender;
  if (valid.outfit !== undefined) session.outfit = valid.outfit;
  if (valid.hairStyle !== undefined) session.hairStyle = valid.hairStyle;
  if (valid.skirt !== undefined) session.skirt = valid.skirt;
  if (valid.glasses !== undefined) session.glasses = valid.glasses;
  if (valid.backpack !== undefined) session.backpack = valid.backpack;
}

export class HskRoom {
  private ctx: DurableObjectState;
  private roomId = 'hsk-1';
  private sessions = new Map<string, Session>();
  private bySocket = new Map<WebSocket, string>();
  private seatRegistry: SeatRegistry = createSeatRegistry();
  private presences = new Map<string, PlayerStudyPresence>();
  private studyRevision = 1;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
    this.restoreHibernatedSessions();
  }

  /**
   * Rehydrates `this.sessions`, `this.bySocket`, `this.roomId`, `this.seatRegistry`,
   * and `this.presences` from Cloudflare Durable Object WebSocket attachments
   * after waking from hibernation.
   */
  private restoreHibernatedSessions() {
    let sockets: WebSocket[];
    try {
      sockets = this.ctx.getWebSockets();
    } catch {
      return;
    }
    const now = Date.now();
    const rawSeatAttachments: HibernatedSeatAttachment[] = [];
    const rawPresenceBySession = new Map<
      string,
      NonNullable<SocketAttachment['studyPresence']>
    >();
    let restoredAnyNewSession = false;

    for (const rawWs of sockets) {
      const ws = rawWs as HibernatableWebSocket;
      if (this.bySocket.has(ws)) continue;
      let att: SocketAttachment | null | undefined;
      try {
        att = ws.deserializeAttachment?.();
      } catch {
        att = null;
      }
      if (!att || typeof att.id !== 'string' || !att.id) continue;
      if (typeof att.roomId === 'string' && att.roomId) {
        this.roomId = att.roomId;
      }
      if (typeof att.studyRevision === 'number' && Number.isFinite(att.studyRevision)) {
        this.studyRevision = Math.max(this.studyRevision, att.studyRevision);
      }
      this.bySocket.set(ws, att.id);
      if (!this.sessions.has(att.id)) {
        restoredAnyNewSession = true;
        const mssv = sanitizeMssv(att.mssv) ?? '20226010';
        const session: Session = {
          id: att.id,
          reconnectKey:
            typeof att.reconnectKey === 'string' && att.reconnectKey
              ? att.reconnectKey
              : att.id,
          name: sanitizeName(att.name),
          mssv,
          color: typeof att.color === 'string' ? att.color : pickShirtColor(att.id),
          x: typeof att.x === 'number' ? att.x : SPAWN.x,
          z: typeof att.z === 'number' ? att.z : SPAWN.z,
          facing: typeof att.facing === 'number' ? att.facing : SPAWN.facing,
          state: isRemoteState(att.state) ? att.state : 'idle',
          lastUpdate: typeof att.lastUpdate === 'number' ? att.lastUpdate : now,
          msgTimes: [],
        };
        applyAppearance(session, att as unknown as Record<string, unknown>);
        this.sessions.set(att.id, session);

        if (typeof att.seatId === 'string' && att.seatId.trim().length > 0) {
          rawSeatAttachments.push({
            occupantId: session.id,
            occupantName: session.name,
            seatId: att.seatId.trim(),
            occupiedAtMs:
              typeof att.occupiedAtMs === 'number' && Number.isFinite(att.occupiedAtMs)
                ? att.occupiedAtMs
                : session.lastUpdate,
            subjectTag: att.studyPresence?.subjectTag ?? null,
            color: session.color,
            gender: session.gender,
            outfit: session.outfit,
            hairStyle: session.hairStyle,
            skirt: session.skirt,
            glasses: session.glasses,
            backpack: session.backpack,
          });
        }
        if (att.studyPresence && typeof att.studyPresence === 'object') {
          rawPresenceBySession.set(session.id, att.studyPresence);
        }
      }
    }

    if (!restoredAnyNewSession) return;

    // Merge any already-known in-memory seat claims with newly restored socket attachments
    for (const occ of this.seatRegistry.bySeatId.values()) {
      rawSeatAttachments.push({
        occupantId: occ.occupantId,
        occupantName: occ.occupantName,
        seatId: occ.seatId,
        occupiedAtMs: occ.occupiedAtMs,
        subjectTag: occ.subjectTag ?? null,
        color: occ.color,
        gender: occ.gender,
        outfit: occ.outfit,
        hairStyle: occ.hairStyle,
        skirt: occ.skirt,
        glasses: occ.glasses,
        backpack: occ.backpack,
      });
    }

    this.seatRegistry = restoreSeatRegistryFromAttachments(rawSeatAttachments, now);

    // Reconcile each restored session's presence with authoritative seat ownership
    for (const session of this.sessions.values()) {
      const ownedSeat = getOccupantSeat(this.seatRegistry, session.id);
      const rawPres = rawPresenceBySession.get(session.id) ?? this.presences.get(session.id);
      const reconciled = reconcileServerPresenceWithSeat(
        rawPres,
        ownedSeat,
        typeof rawPres?.updatedAtMs === 'number' ? rawPres.updatedAtMs : now,
      );
      this.presences.set(session.id, reconciled);
    }

    // Re-persist socket attachments so any conflicting seat claims rejected during
    // hibernation recovery are cleaned up on the socket attachments.
    for (const [ws, sid] of this.bySocket.entries()) {
      const sess = this.sessions.get(sid);
      if (sess) {
        this.persistSocketAttachment(ws, sess);
      }
    }
  }

  private persistSocketAttachment(ws: WebSocket, session: Session) {
    try {
      const hws = ws as HibernatableWebSocket;
      const ownedSeat = getOccupantSeat(this.seatRegistry, session.id);
      const presence = this.presences.get(session.id);
      hws.serializeAttachment?.({
        id: session.id,
        reconnectKey: session.reconnectKey,
        roomId: this.roomId,
        name: session.name,
        mssv: session.mssv,
        color: session.color,
        x: session.x,
        z: session.z,
        facing: session.facing,
        state: session.state,
        ...(session.gender !== undefined ? { gender: session.gender } : {}),
        ...(session.outfit !== undefined ? { outfit: session.outfit } : {}),
        ...(session.hairStyle !== undefined ? { hairStyle: session.hairStyle } : {}),
        ...(session.skirt !== undefined ? { skirt: session.skirt } : {}),
        ...(session.glasses !== undefined ? { glasses: session.glasses } : {}),
        ...(session.backpack !== undefined ? { backpack: session.backpack } : {}),
        lastUpdate: session.lastUpdate,
        seatId: ownedSeat ? ownedSeat.seatId : null,
        occupiedAtMs: ownedSeat ? ownedSeat.occupiedAtMs : null,
        studyPresence: presence
          ? {
              status: presence.status,
              pomodoroPhase: presence.pomodoroPhase,
              subjectTag: presence.subjectTag,
              updatedAtMs: presence.updatedAtMs,
            }
          : null,
        studyRevision: this.studyRevision,
      });
    } catch {
      // Older runtimes without attachments: bySocket covers in-memory state.
    }
  }

  private buildStudyRoomSnapshot(nowMs: number = Date.now()): ServerStudyRoomSnapshotMessage {
    const presencesRecord: Record<string, PlayerStudyPresence> = {};
    for (const [pid, pres] of this.presences.entries()) {
      if (this.sessions.has(pid)) {
        presencesRecord[pid] = pres;
      }
    }
    return {
      type: 'study:room-snapshot',
      roomId: this.roomId,
      seats: listOccupanciesForRoom(this.seatRegistry, 'library-lobby'),
      presences: presencesRecord,
      revision: this.studyRevision,
      serverNowMs: nowMs,
    };
  }

  private getSocketSessionId(ws: WebSocket): string | undefined {
    const fromMap = this.bySocket.get(ws);
    if (fromMap) return fromMap;
    try {
      const att = (ws as HibernatableWebSocket).deserializeAttachment?.();
      if (att && typeof att.id === 'string' && att.id) {
        this.bySocket.set(ws, att.id);
        return att.id;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  async fetch(request: Request): Promise<Response> {
    this.restoreHibernatedSessions();
    const url = new URL(request.url);
    if (url.pathname === '/__count') {
      return Response.json({ count: this.sessions.size });
    }
    this.roomId = request.headers.get('x-room-id') || this.roomId;
    const upgrade = request.headers.get('Upgrade');
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    // Hibernation: the object sleeps while idle; handlers below wake it.
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast(msg: object, exceptId?: string) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const sid = this.getSocketSessionId(ws);
        if (exceptId && sid === exceptId) continue;
        ws.send(data);
      } catch {
        // A dead socket is cleaned up on webSocketClose.
      }
    }
  }

  private send(ws: WebSocket, msg: object) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }

  private publicPlayer(s: Session): Player {
    return {
      id: s.id,
      name: s.name,
      mssv: s.mssv,
      color: s.color,
      x: s.x,
      z: s.z,
      facing: s.facing,
      state: s.state,
      ...(s.gender !== undefined ? { gender: s.gender } : {}),
      ...(s.outfit !== undefined ? { outfit: s.outfit } : {}),
      ...(s.hairStyle !== undefined ? { hairStyle: s.hairStyle } : {}),
      ...(s.skirt !== undefined ? { skirt: s.skirt } : {}),
      ...(s.glasses !== undefined ? { glasses: s.glasses } : {}),
      ...(s.backpack !== undefined ? { backpack: s.backpack } : {}),
    };
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    this.restoreHibernatedSessions();
    const rawStr =
      typeof message === 'string' ? message : new TextDecoder().decode(message);
    if (rawStr.length > MAX_STUDY_WS_PAYLOAD_BYTES * 2) {
      return;
    }
    let msg: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawStr);
      if (!parsed || typeof parsed !== 'object') return;
      msg = parsed as Record<string, unknown>;
    } catch {
      return;
    }
    const now = Date.now();

    if (msg.type === 'join') {
      const rawSessionId = sanitizeReconnectToken(msg.sessionId);
      const rawReconnectToken = sanitizeReconnectToken(msg.reconnectToken);
      const reconnectKey = rawReconnectToken ?? rawSessionId ?? '';
      if (!reconnectKey) {
        this.send(ws, { type: 'error', message: 'Missing sessionId' });
        return;
      }

      // Separate public player identity (`id` / `occupantId` / `playerId`) from
      // the secret reconnect credential (`reconnectKey`):
      // 1. An active player's public ID (`p-...`) is broadcast to peers and must
      //    NEVER be accepted as a reconnect credential to hijack that session.
      if (this.sessions.has(reconnectKey)) {
        this.send(ws, {
          type: 'error',
          message: 'Public player ID cannot be used as reconnect credential',
        });
        return;
      }

      const sessionId = derivePublicPlayerId(reconnectKey);
      if (
        rawReconnectToken &&
        rawSessionId &&
        rawSessionId !== sessionId &&
        rawSessionId !== rawReconnectToken
      ) {
        this.send(ws, {
          type: 'error',
          message: 'Invalid reconnect credential for session',
        });
        return;
      }

      // Enforce strict invariant: one WebSocket is bound to at most one sessionId.
      // Attempting to switch sessionId on an already-joined socket is rejected.
      const boundSessionId = this.getSocketSessionId(ws);
      if (boundSessionId && boundSessionId !== sessionId) {
        this.send(ws, {
          type: 'error',
          message: 'Socket is already bound to a different sessionId',
        });
        return;
      }
      const existing = this.sessions.get(sessionId);
      if (existing && existing.reconnectKey !== reconnectKey) {
        this.send(ws, {
          type: 'error',
          message: 'Invalid reconnect credential',
        });
        return;
      }
      const mssv = sanitizeMssv(msg.mssv);
      if (!mssv) {
        this.send(ws, { type: 'error', message: 'MSSV phải là 8 chữ số' });
        return;
      }
      const isSameSocketRepeatJoin = boundSessionId === sessionId;
      // Reconnect with the same secret reconnectKey on a NEW socket replaces any old socket
      // (both in-memory and hibernated sockets): no duplicate avatar, ever.
      const allSockets = new Set<WebSocket>([
        ...this.bySocket.keys(),
        ...this.ctx.getWebSockets(),
      ]);
      for (const oldWs of allSockets) {
        if (oldWs === ws) continue;
        const oldId = this.getSocketSessionId(oldWs);
        if (oldId === sessionId) {
          this.bySocket.delete(oldWs);
          try {
            (oldWs as HibernatableWebSocket).serializeAttachment?.({ id: '' });
          } catch {
            // ignore
          }
          try {
            oldWs.close(1000, 'Replaced by reconnect');
          } catch {
            // ignore
          }
        }
      }
      if (this.sessions.size >= ROOM_CAPACITY && !this.sessions.has(sessionId)) {
        this.send(ws, { type: 'full', message: 'Room is full' });
        return;
      }
      const name = sanitizeName(msg.name);
      const color = pickShirtColor(sessionId);
      const session: Session = existing ?? {
        id: sessionId,
        reconnectKey,
        name,
        mssv,
        color,
        x: SPAWN.x,
        z: SPAWN.z,
        facing: SPAWN.facing,
        state: 'idle',
        lastUpdate: now,
        msgTimes: [],
      };
      session.reconnectKey = reconnectKey;
      session.name = name;
      session.mssv = mssv;
      applyAppearance(session, msg);
      session.lastUpdate = now;
      if (!isSameSocketRepeatJoin) {
        session.msgTimes = [];
      }
      this.sessions.set(sessionId, session);
      this.bySocket.set(ws, sessionId);

      // Preserve any existing seat ownership for this session across reconnect
      const updatedOccupancy = updateOccupantMetaInSeatRegistry(this.seatRegistry, sessionId, {
        occupantName: session.name,
        color: session.color,
        gender: session.gender,
        outfit: session.outfit,
        hairStyle: session.hairStyle,
        skirt: session.skirt,
        glasses: session.glasses,
        backpack: session.backpack,
      });
      const existingPresence = this.presences.get(sessionId);
      const reconciledPresence = reconcileServerPresenceWithSeat(
        existingPresence,
        updatedOccupancy ?? getOccupantSeat(this.seatRegistry, sessionId),
        now,
      );
      this.presences.set(sessionId, reconciledPresence);
      this.persistSocketAttachment(ws, session);

      // Snapshot to the newcomer (so they see everyone already here),
      // followed by authoritative study room snapshot, then join broadcast.
      this.send(ws, {
        type: 'welcome',
        id: sessionId,
        roomId: this.roomId,
        players: [...this.sessions.values()].map((s) => this.publicPlayer(s)),
        count: this.sessions.size,
      });
      this.send(ws, this.buildStudyRoomSnapshot(now));
      this.broadcast({ type: 'join', player: this.publicPlayer(session) }, sessionId);
      this.broadcast({ type: 'count', count: this.sessions.size });
      return;
    }

    const sessionId = this.getSocketSessionId(ws);
    const session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!sessionId || !session) {
      if (msg.type === 'study:claim-seat') {
        const requestId = sanitizeRequestId(msg.requestId);
        this.send(ws, {
          type: 'study:seat-rejected',
          seatId: typeof msg.seatId === 'string' ? msg.seatId.slice(0, 64) : '',
          reason: 'not-authenticated',
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }
      return;
    }

    // Rate limit: drop (and eventually close) abusive connections.
    session.msgTimes = session.msgTimes.filter((t) => now - t < 1000);
    session.msgTimes.push(now);
    if (session.msgTimes.length > MAX_MSG_PER_SEC * 2) {
      try {
        ws.close(1011, 'Rate limit exceeded');
      } catch {
        // ignore
      }
      return;
    }
    if (session.msgTimes.length > MAX_MSG_PER_SEC) {
      if (msg.type === 'study:claim-seat') {
        const requestId = sanitizeRequestId(msg.requestId);
        this.send(ws, {
          type: 'study:seat-rejected',
          seatId: typeof msg.seatId === 'string' ? msg.seatId.slice(0, 64) : '',
          reason: 'rate-limited',
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }
      return; // drop, don't broadcast
    }

    if (msg.type === 'study:claim-seat') {
      const requestId = sanitizeRequestId(msg.requestId);
      if (rawStr.length > MAX_STUDY_WS_PAYLOAD_BYTES || typeof msg.seatId !== 'string') {
        this.send(ws, {
          type: 'study:seat-rejected',
          seatId: typeof msg.seatId === 'string' ? msg.seatId.slice(0, 64) : '',
          reason: 'invalid-payload',
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
        return;
      }

      const claimRes = claimSeat(this.seatRegistry, {
        seatId: msg.seatId.trim(),
        occupantId: sessionId,
        occupantName: session.name,
        subjectTag: typeof msg.subjectTag === 'string' ? msg.subjectTag : null,
        nowMs: now,
        color: session.color,
        gender: session.gender,
        outfit: session.outfit,
        hairStyle: session.hairStyle,
        skirt: session.skirt,
        glasses: session.glasses,
        backpack: session.backpack,
      });

      if (!claimRes.ok) {
        this.send(ws, {
          type: 'study:seat-rejected',
          seatId: claimRes.seatId,
          reason: claimRes.reason,
          ...(claimRes.occupiedBy ? { occupiedBy: claimRes.occupiedBy } : {}),
          ...(claimRes.occupiedByName ? { occupiedByName: claimRes.occupiedByName } : {}),
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
        return;
      }

      if (claimRes.releasedPreviousSeatId) {
        this.studyRevision += 1;
        this.broadcast({
          type: 'study:seat-released',
          seatId: claimRes.releasedPreviousSeatId,
          occupantId: sessionId,
          reason: 'switched-seat',
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }

      this.studyRevision += 1;
      const prevPresence = this.presences.get(sessionId);
      const nextPresence = reconcileServerPresenceWithSeat(
        {
          status:
            prevPresence?.status === 'studying' || prevPresence?.status === 'break'
              ? prevPresence.status
              : msg.pomodoroPhase === 'focus'
                ? 'studying'
                : msg.pomodoroPhase === 'short-break' || msg.pomodoroPhase === 'long-break'
                  ? 'break'
                  : 'idle',
          studyRoomId: claimRes.occupancy.studyRoomId,
          seatId: claimRes.occupancy.seatId,
          pomodoroPhase:
            typeof msg.pomodoroPhase === 'string'
              ? (msg.pomodoroPhase as PomodoroPhase)
              : (prevPresence?.pomodoroPhase ?? 'idle'),
          subjectTag:
            claimRes.occupancy.subjectTag ?? prevPresence?.subjectTag ?? null,
        },
        claimRes.occupancy,
        now,
      );
      this.presences.set(sessionId, nextPresence);
      session.lastUpdate = now;
      this.persistSocketAttachment(ws, session);

      this.broadcast({
        type: 'study:seat-claimed',
        occupancy: claimRes.occupancy,
        ...(claimRes.releasedPreviousSeatId
          ? { releasedSeatId: claimRes.releasedPreviousSeatId }
          : {}),
        ...(requestId ? { requestId } : {}),
        revision: this.studyRevision,
        serverNowMs: now,
      });
      this.broadcast({
        type: 'study:presence',
        playerId: sessionId,
        presence: nextPresence,
        revision: this.studyRevision,
        serverNowMs: now,
      });
      return;
    }

    if (msg.type === 'study:release-seat') {
      const requestId = sanitizeRequestId(msg.requestId);
      const owned = getOccupantSeat(this.seatRegistry, sessionId);
      if (
        typeof msg.seatId === 'string' &&
        msg.seatId.trim().length > 0 &&
        owned &&
        owned.seatId !== msg.seatId.trim()
      ) {
        // Never allow releasing a seat other than the one this session actually owns
        return;
      }

      const released = releaseSeatByOccupant(this.seatRegistry, sessionId);
      if (!released) {
        this.send(ws, this.buildStudyRoomSnapshot(now));
        return;
      }

      this.studyRevision += 1;
      const prevPresence = this.presences.get(sessionId);
      const nextPresence = reconcileServerPresenceWithSeat(
        {
          status:
            prevPresence?.status === 'studying' || prevPresence?.status === 'break'
              ? prevPresence.status
              : 'exploring',
          studyRoomId: prevPresence?.studyRoomId ?? 'library-lobby',
          seatId: null,
          pomodoroPhase: prevPresence?.pomodoroPhase ?? 'idle',
          subjectTag: prevPresence?.subjectTag ?? null,
        },
        null,
        now,
      );
      this.presences.set(sessionId, nextPresence);
      session.lastUpdate = now;
      this.persistSocketAttachment(ws, session);

      this.broadcast({
        type: 'study:seat-released',
        seatId: released.seatId,
        occupantId: sessionId,
        reason: 'manual',
        ...(requestId ? { requestId } : {}),
        revision: this.studyRevision,
        serverNowMs: now,
      });
      this.broadcast({
        type: 'study:presence',
        playerId: sessionId,
        presence: nextPresence,
        revision: this.studyRevision,
        serverNowMs: now,
      });
      return;
    }

    if (msg.type === 'study:presence') {
      if (rawStr.length > MAX_STUDY_WS_PAYLOAD_BYTES) return;
      const rawPresence =
        msg.presence && typeof msg.presence === 'object'
          ? (msg.presence as Partial<PlayerStudyPresence>)
          : (msg as Partial<PlayerStudyPresence>);
      const ownedSeat = getOccupantSeat(this.seatRegistry, sessionId);
      const nextPresence = reconcileServerPresenceWithSeat(rawPresence, ownedSeat, now);
      this.presences.set(sessionId, nextPresence);
      if (ownedSeat && nextPresence.subjectTag !== (ownedSeat.subjectTag ?? null)) {
        updateOccupantMetaInSeatRegistry(this.seatRegistry, sessionId, {
          subjectTag: nextPresence.subjectTag,
        });
      }
      this.studyRevision += 1;
      session.lastUpdate = now;
      this.persistSocketAttachment(ws, session);
      this.broadcast({
        type: 'study:presence',
        playerId: sessionId,
        presence: nextPresence,
        revision: this.studyRevision,
        serverNowMs: now,
      });
      return;
    }

    if (msg.type === 'move') {
      const facing = Number(msg.facing) || 0;
      const state: PlayerState = isRemoteState(msg.state) ? msg.state : session.state;
      const dt = (now - session.lastUpdate) / 1000;
      const { x: nx, z: nz } = clampMoveStep(
        session.x,
        session.z,
        msg.x,
        msg.z,
        state,
        dt,
        BOUNDS,
      );
      session.x = nx;
      session.z = nz;
      session.facing = facing;
      session.state = state;
      session.lastUpdate = now;
      this.persistSocketAttachment(ws, session);
      this.broadcast({ type: 'move', id: sessionId, x: nx, z: nz, facing, state, t: now }, sessionId);
      return;
    }

    if (msg.type === 'state') {
      if (isRemoteState(msg.state)) {
        session.state = msg.state;
        session.lastUpdate = now;
        this.persistSocketAttachment(ws, session);
        this.broadcast({ type: 'state', id: sessionId, state: msg.state }, sessionId);
      }
      return;
    }

    if (msg.type === 'appearance') {
      if (msg.name !== undefined) session.name = sanitizeName(msg.name);
      if (msg.mssv !== undefined) {
        const m = sanitizeMssv(msg.mssv);
        if (m) session.mssv = m;
      }
      applyAppearance(session, msg);
      session.lastUpdate = now;
      const updatedOcc = updateOccupantMetaInSeatRegistry(this.seatRegistry, sessionId, {
        occupantName: session.name,
        color: session.color,
        gender: session.gender,
        outfit: session.outfit,
        hairStyle: session.hairStyle,
        skirt: session.skirt,
        glasses: session.glasses,
        backpack: session.backpack,
      });
      this.persistSocketAttachment(ws, session);
      this.broadcast({ type: 'appearance', player: this.publicPlayer(session) }, sessionId);
      if (updatedOcc) {
        this.studyRevision += 1;
        this.broadcast({
          type: 'study:seat-claimed',
          occupancy: updatedOcc,
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }
      return;
    }

    if (msg.type === 'chat') {
      const text = sanitizeChatMessage(msg.text);
      if (!text) return;
      session.lastUpdate = now;
      this.broadcast({
        type: 'chat',
        id: sessionId,
        name: session.name,
        color: session.color,
        text,
        t: now,
      });
      return;
    }

    if (msg.type === 'emote') {
      if (!isAvatarEmoteId(msg.emote)) return;
      session.lastUpdate = now;
      this.broadcast({
        type: 'emote',
        id: sessionId,
        emote: msg.emote,
        t: now,
      });
      return;
    }

    if (msg.type === 'ping') {
      this.send(ws, { type: 'pong' });
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.restoreHibernatedSessions();
    const sessionId = this.getSocketSessionId(ws);
    this.bySocket.delete(ws);
    try {
      (ws as HibernatableWebSocket).serializeAttachment?.({ id: '' });
    } catch {
      // ignore
    }
    if (!sessionId) return;
    // Only remove if no other active socket is still bound to this sessionId
    // (a reconnect may already have replaced it).
    for (const [otherWs, id] of this.bySocket.entries()) {
      if (otherWs !== ws && id === sessionId) return;
    }
    for (const otherWs of this.ctx.getWebSockets()) {
      if (otherWs === ws) continue;
      if (this.getSocketSessionId(otherWs) === sessionId) return;
    }
    const now = Date.now();
    const releasedSeat = releaseSeatByOccupant(this.seatRegistry, sessionId);
    this.presences.delete(sessionId);
    if (this.sessions.delete(sessionId)) {
      if (releasedSeat) {
        this.studyRevision += 1;
        this.broadcast({
          type: 'study:seat-released',
          seatId: releasedSeat.seatId,
          occupantId: sessionId,
          reason: 'disconnect',
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }
      this.broadcast({ type: 'leave', id: sessionId });
      this.broadcast({ type: 'count', count: this.sessions.size });
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
}
