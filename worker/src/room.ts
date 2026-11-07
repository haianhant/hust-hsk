/**
 * HskRoom — one Cloudflare Durable Object = one HUST campus room.
 *
 * Adapted from the temple worker (~/workspace/chua-online/worker/src/room.ts)
 * — same rules, different world:
 * - No database for continuous position. Player state lives only in
 *   this object's memory while connected, and is forgotten on leave.
 *   Nothing is stored: no name, no MSSV, no location after leave.
 * - One player = one sessionId, chosen by the client and kept in its
 *   localStorage. Reconnecting with the same sessionId REPLACES the
 *   old socket, so a reconnect never creates a duplicate avatar.
 * - The server never trusts the client: it clamps positions to the
 *   campus, caps speed (riding is faster than running), sanitises
 *   names, validates MSSV (exactly 8 digits), and rate-limits
 *   messages.
 * - Only position, facing, movement state and riding state leave a
 *   client. No points, quests, SRS or progress are ever synced.
 * - WebSocket hibernation is used (acceptWebSocket + webSocket*
 *   handlers) so an idle room costs no duration on the free tier.
 */

export type PlayerState = 'idle' | 'walking' | 'running' | 'riding';

export interface Player {
  id: string;
  name: string;
  mssv: string;
  color: string;
  x: number;
  z: number;
  facing: number;
  state: PlayerState;
}

export const ROOM_CAPACITY = 15;
/** Campus bounds, same numbers as lib/campus.ts BOUNDS. */
export const BOUNDS = { minX: -96, maxX: 96, minZ: -76, maxZ: 86 };
/** Spawn inside the Parabol gate, same as lib/campus.ts SPAWN. */
export const SPAWN = { x: -76, z: 10, facing: -Math.PI / 2 };
const MAX_SPEED_WALK = 7; // m/s: walk 4, run ~6.5, plus jitter tolerance
const MAX_SPEED_RIDE = 15; // m/s: bike max 14, plus jitter tolerance
const MAX_MSG_PER_SEC = 20;

/**
 * Shirt colours for remote players, hashed from sessionId. HUST red
 * (#DA1E26) is deliberately NOT in the list: the local player always
 * wears the red HUST polo, so remotes are instantly distinguishable.
 */
export const SHIRT_COLORS = [
  '#1F3A5F', // navy
  '#2E7D32', // green
  '#F2A007', // amber
  '#7C4DBE', // purple
  '#0E7C7B', // teal
  '#C2571B', // orange
  '#546E7A', // slate
  '#8E24AA', // magenta
];

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Bạn';
  // Strip anything that could break a UI: angle brackets, slashes,
  // backslashes, control characters. React also renders names as text,
  // never as HTML, so this is defence in depth.
  const clean = raw.replace(/[<>&/\\]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 30);
  return clean || 'Bạn';
}

/** MSSV HUST: exactly 8 digits. Anything else is rejected at join. */
export function sanitizeMssv(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim();
  return /^\d{8}$/.test(clean) ? clean : null;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
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
  lastUpdate: number;
  msgTimes: number[];
}

export class HskRoom {
  private ctx: DurableObjectState;
  private roomId = 'hsk-1';
  private sessions = new Map<string, Session>();
  private bySocket = new Map<WebSocket, string>();

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
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
        const att = (ws as unknown as { deserializeAttachment?: () => { id?: string } }).deserializeAttachment?.();
        if (exceptId && att?.id === exceptId) continue;
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
    };
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
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
      // Reconnect with the same sessionId replaces the old socket:
      // no duplicate avatar, ever.
      for (const [oldWs, oldId] of this.bySocket.entries()) {
        if (oldId === sessionId && oldWs !== ws) {
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
      const color = SHIRT_COLORS[hashString(sessionId) % SHIRT_COLORS.length];
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
      session.msgTimes = [];
      this.sessions.set(sessionId, session);
      this.bySocket.set(ws, sessionId);
      try {
        (ws as unknown as { serializeAttachment: (v: unknown) => void }).serializeAttachment({ id: sessionId });
      } catch {
        // Older runtimes without attachments: bySocket covers it.
      }
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

    const att = (ws as unknown as { deserializeAttachment?: () => { id?: string } }).deserializeAttachment?.();
    const sessionId = att?.id ?? this.bySocket.get(ws);
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
      const x = clamp(Number(msg.x) || 0, BOUNDS.minX, BOUNDS.maxX);
      const z = clamp(Number(msg.z) || 0, BOUNDS.minZ, BOUNDS.maxZ);
      const facing = Number(msg.facing) || 0;
      const state = ['idle', 'walking', 'running', 'riding'].includes(String(msg.state))
        ? (msg.state as PlayerState)
        : session.state;
      // Speed cap: clamp a jump to what is physically reachable since
      // the last accepted update, instead of teleporting the avatar.
      // Riding is faster than running, so the cap depends on state.
      const dt = Math.max(0.05, (now - session.lastUpdate) / 1000);
      const dx = x - session.x;
      const dz = z - session.z;
      const dist = Math.hypot(dx, dz);
      const maxDist = (state === 'riding' ? MAX_SPEED_RIDE : MAX_SPEED_WALK) * dt + 0.5;
      let nx = x;
      let nz = z;
      if (dist > maxDist && dist > 0) {
        nx = session.x + (dx / dist) * maxDist;
        nz = session.z + (dz / dist) * maxDist;
      }
      session.x = nx;
      session.z = nz;
      session.facing = facing;
      session.state = state;
      session.lastUpdate = now;
      this.broadcast({ type: 'move', id: sessionId, x: nx, z: nz, facing, state, t: now }, sessionId);
      return;
    }

    if (msg.type === 'state') {
      const state = String(msg.state);
      if (['idle', 'walking', 'running', 'riding'].includes(state)) {
        session.state = state as PlayerState;
        session.lastUpdate = now;
        this.broadcast({ type: 'state', id: sessionId, state }, sessionId);
      }
      return;
    }

    if (msg.type === 'ping') {
      this.send(ws, { type: 'pong' });
    }
  }

  async webSocketClose(ws: WebSocket) {
    const att = (ws as unknown as { deserializeAttachment?: () => { id?: string } }).deserializeAttachment?.();
    const sessionId = att?.id ?? this.bySocket.get(ws);
    this.bySocket.delete(ws);
    if (!sessionId) return;
    // Only remove if this socket is still the current one for the
    // session (a reconnect may already have replaced it).
    const current = [...this.bySocket.entries()].find(([, id]) => id === sessionId);
    if (current) return;
    if (this.sessions.delete(sessionId)) {
      this.broadcast({ type: 'leave', id: sessionId });
      this.broadcast({ type: 'count', count: this.sessions.size });
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
}
