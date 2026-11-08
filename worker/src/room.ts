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

import { BOUNDS, SPAWN } from '../../shared/constants/world';
import {
  MAX_MSG_PER_SEC,
  ROOM_CAPACITY,
  SHIRT_COLORS,
  clampMoveStep,
  extractValidAppearance,
  hashString,
  isRemoteState,
  pickShirtColor,
  sanitizeMssv,
  sanitizeName,
  type AvatarGender,
  type AvatarHairStyle,
  type AvatarOutfitId,
  type Player,
  type PlayerState,
} from '../../shared/contracts/multiplayer';

export {
  BOUNDS,
  ROOM_CAPACITY,
  SHIRT_COLORS,
  SPAWN,
  hashString,
  sanitizeMssv,
  sanitizeName,
  type Player,
  type PlayerState,
};

export interface SocketAttachment {
  id: string;
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
}

interface HibernatableWebSocket extends WebSocket {
  serializeAttachment?: (attachment: SocketAttachment) => void;
  deserializeAttachment?: () => SocketAttachment | null | undefined;
}

interface Session {
  id: string;
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

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
    this.restoreHibernatedSessions();
  }

  /**
   * Rehydrates `this.sessions`, `this.bySocket`, and `this.roomId` from
   * Cloudflare Durable Object WebSocket attachments after waking from hibernation.
   */
  private restoreHibernatedSessions() {
    let sockets: WebSocket[];
    try {
      sockets = this.ctx.getWebSockets();
    } catch {
      return;
    }
    const now = Date.now();
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
      this.bySocket.set(ws, att.id);
      if (!this.sessions.has(att.id)) {
        const mssv = sanitizeMssv(att.mssv) ?? '20226010';
        const session: Session = {
          id: att.id,
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
      }
    }
  }

  private persistSocketAttachment(ws: WebSocket, session: Session) {
    try {
      const hws = ws as HibernatableWebSocket;
      hws.serializeAttachment?.({
        id: session.id,
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
      });
    } catch {
      // Older runtimes without attachments: bySocket covers in-memory state.
    }
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
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
    } catch {
      return;
    }
    const now = Date.now();

    if (msg.type === 'join') {
      const sessionId = typeof msg.sessionId === 'string' ? msg.sessionId.slice(0, 64) : '';
      if (!sessionId) {
        this.send(ws, { type: 'error', message: 'Missing sessionId' });
        return;
      }
      const mssv = sanitizeMssv(msg.mssv);
      if (!mssv) {
        this.send(ws, { type: 'error', message: 'MSSV phải là 8 chữ số' });
        return;
      }
      // Reconnect with the same sessionId replaces any old socket
      // (both in-memory and hibernated sockets): no duplicate avatar, ever.
      const allSockets = new Set<WebSocket>([
        ...this.bySocket.keys(),
        ...this.ctx.getWebSockets(),
      ]);
      for (const oldWs of allSockets) {
        if (oldWs === ws) continue;
        const oldId = this.getSocketSessionId(oldWs);
        if (oldId === sessionId) {
          try {
            oldWs.close(1000, 'Replaced by reconnect');
          } catch {
            // ignore
          }
          this.bySocket.delete(oldWs);
        }
      }
      if (this.sessions.size >= ROOM_CAPACITY && !this.sessions.has(sessionId)) {
        this.send(ws, { type: 'full', message: 'Room is full' });
        return;
      }
      const name = sanitizeName(msg.name);
      const color = pickShirtColor(sessionId);
      const existing = this.sessions.get(sessionId);
      const session: Session = existing ?? {
        id: sessionId,
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
      session.name = name;
      session.mssv = mssv;
      applyAppearance(session, msg);
      session.lastUpdate = now;
      session.msgTimes = [];
      this.sessions.set(sessionId, session);
      this.bySocket.set(ws, sessionId);
      this.persistSocketAttachment(ws, session);

      // Snapshot to the newcomer (so they see everyone already here),
      // then a join broadcast to everyone else.
      this.send(ws, {
        type: 'welcome',
        id: sessionId,
        roomId: this.roomId,
        players: [...this.sessions.values()].map((s) => this.publicPlayer(s)),
        count: this.sessions.size,
      });
      this.broadcast({ type: 'join', player: this.publicPlayer(session) }, sessionId);
      this.broadcast({ type: 'count', count: this.sessions.size });
      return;
    }

    const sessionId = this.getSocketSessionId(ws);
    if (!sessionId) return;
    const session = this.sessions.get(sessionId);
    if (!session) return;

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
    if (session.msgTimes.length > MAX_MSG_PER_SEC) return; // drop, don't broadcast

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
      this.persistSocketAttachment(ws, session);
      this.broadcast({ type: 'appearance', player: this.publicPlayer(session) }, sessionId);
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
    if (this.sessions.delete(sessionId)) {
      this.broadcast({ type: 'leave', id: sessionId });
      this.broadcast({ type: 'count', count: this.sessions.size });
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
}
