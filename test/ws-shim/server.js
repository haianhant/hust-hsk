/**
 * HSK WebSocket shim — a local stand-in for the hust-hsk-rooms Worker,
 * mirroring worker/src/room.ts + worker/src/index.ts closely enough that
 * the protocol test proves the frontend client and the server agree:
 * - rooms hsk-1..hsk-5, capacity 15, /ws assigns the first with space
 * - join validates MSSV (8 digits) and sanitises names (max 30)
 * - shirt colour hashed from sessionId (no HUST red)
 * - positions clamped to campus bounds; speed capped (walk/run 7, ride 15)
 * - rate limit 20 msg/s (drop; 2x -> close)
 * - reconnect with the same sessionId replaces the old socket
 * - welcome snapshot, join/leave/move/state/count/full/error/pong
 * - /health and /api/rooms (counts only) over plain HTTP on the same port
 *
 * Usage: node test/ws-shim/server.js [port]   (default 8788)
 */
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number(process.argv[2] || 8788);
const ROOMS = ['hsk-1', 'hsk-2', 'hsk-3', 'hsk-4', 'hsk-5'];
const CAPACITY = 15;
const BOUNDS = { minX: -96, maxX: 96, minZ: -76, maxZ: 86 };
const SPAWN = { x: -76, z: 10, facing: -Math.PI / 2 };
const MAX_SPEED_WALK = 7;
const MAX_SPEED_RIDE = 15;
const MAX_MSG_PER_SEC = 20;
const SHIRT_COLORS = ['#1F3A5F', '#2E7D32', '#F2A007', '#7C4DBE', '#0E7C7B', '#C2571B', '#546E7A', '#8E24AA'];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function sanitizeName(raw) {
  if (typeof raw !== 'string') return 'Bạn';
  const clean = raw.replace(/[<>&/\\]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 30);
  return clean || 'Bạn';
}
function sanitizeMssv(raw) {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim();
  return /^\d{8}$/.test(clean) ? clean : null;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

class Room {
  constructor(id) {
    this.id = id;
    this.sessions = new Map(); // sessionId -> session
    this.sockets = new Map(); // ws -> sessionId
  }
  get count() {
    return this.sessions.size;
  }
  broadcast(msg, exceptId) {
    const data = JSON.stringify(msg);
    for (const [ws, id] of this.sockets.entries()) {
      if (exceptId && id === exceptId) continue;
      if (ws.readyState === 1) {
        try { ws.send(data); } catch { /* ignore */ }
      }
    }
  }
  publicPlayer(s) {
    return { id: s.id, name: s.name, mssv: s.mssv, color: s.color, x: s.x, z: s.z, facing: s.facing, state: s.state };
  }
  onMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const now = Date.now();
    if (msg.type === 'join') {
      const sessionId = typeof msg.sessionId === 'string' ? msg.sessionId.slice(0, 64) : '';
      if (!sessionId) return ws.send(JSON.stringify({ type: 'error', message: 'Missing sessionId' }));
      const mssv = sanitizeMssv(msg.mssv);
      if (!mssv) return ws.send(JSON.stringify({ type: 'error', message: 'MSSV phải là 8 chữ số' }));
      for (const [oldWs, oldId] of this.sockets.entries()) {
        if (oldId === sessionId && oldWs !== ws) {
          try { oldWs.close(1000, 'Replaced by reconnect'); } catch { /* ignore */ }
          this.sockets.delete(oldWs);
        }
      }
      if (this.sessions.size >= CAPACITY && !this.sessions.has(sessionId)) {
        return ws.send(JSON.stringify({ type: 'full', message: 'Room is full' }));
      }
      const name = sanitizeName(msg.name);
      const color = SHIRT_COLORS[hashString(sessionId) % SHIRT_COLORS.length];
      const existing = this.sessions.get(sessionId);
      const session = existing ?? {
        id: sessionId, name, mssv, color, x: SPAWN.x, z: SPAWN.z, facing: SPAWN.facing,
        state: 'idle', lastUpdate: now, msgTimes: [],
      };
      session.name = name;
      session.mssv = mssv;
      session.msgTimes = [];
      this.sessions.set(sessionId, session);
      this.sockets.set(ws, sessionId);
      ws.send(JSON.stringify({
        type: 'welcome', id: sessionId, roomId: this.id,
        players: Array.from(this.sessions.values()).map((s) => this.publicPlayer(s)),
        count: this.sessions.size,
      }));
      this.broadcast({ type: 'join', player: this.publicPlayer(session) }, sessionId);
      this.broadcast({ type: 'count', count: this.sessions.size });
      return;
    }
    const sessionId = this.sockets.get(ws);
    if (!sessionId) return;
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.msgTimes = session.msgTimes.filter((t) => now - t < 1000);
    session.msgTimes.push(now);
    if (session.msgTimes.length > MAX_MSG_PER_SEC * 2) {
      try { ws.close(1011, 'Rate limit exceeded'); } catch { /* ignore */ }
      return;
    }
    if (session.msgTimes.length > MAX_MSG_PER_SEC) return;
    if (msg.type === 'move') {
      const x = clamp(Number(msg.x) || 0, BOUNDS.minX, BOUNDS.maxX);
      const z = clamp(Number(msg.z) || 0, BOUNDS.minZ, BOUNDS.maxZ);
      const facing = Number(msg.facing) || 0;
      const state = ['idle', 'walking', 'running', 'riding'].includes(String(msg.state)) ? msg.state : session.state;
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
        session.state = state;
        session.lastUpdate = now;
        this.broadcast({ type: 'state', id: sessionId, state }, sessionId);
      }
      return;
    }
    if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
  }
  onClose(ws) {
    const sessionId = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (!sessionId) return;
    if (Array.from(this.sockets.values()).includes(sessionId)) return;
    if (this.sessions.delete(sessionId)) {
      this.broadcast({ type: 'leave', id: sessionId });
      this.broadcast({ type: 'count', count: this.sessions.size });
    }
  }
}

const rooms = new Map(ROOMS.map((id) => [id, new Room(id)]));
const wss = new WebSocketServer({ noServer: true });
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, rooms: ROOMS, capacity: CAPACITY }));
  }
  if (req.url === '/api/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      rooms: ROOMS.map((id) => ({ id, count: rooms.get(id).count, capacity: CAPACITY })),
    }));
  }
  res.writeHead(404);
  res.end('not found');
});
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  const requested = url.searchParams.get('room');
  const candidates = requested && ROOMS.includes(requested) ? [requested, ...ROOMS.filter((r) => r !== requested)] : ROOMS;
  for (const roomId of candidates) {
    const room = rooms.get(roomId);
    if (room.count >= CAPACITY) continue;
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.on('message', (d) => room.onMessage(ws, d));
      ws.on('close', () => room.onClose(ws));
      ws.on('error', () => room.onClose(ws));
    });
    return;
  }
  socket.destroy();
});
server.listen(PORT, () => console.log(`HSK shim listening on http://127.0.0.1:${PORT} (ws /ws)`));
