/**
 * HSK WebSocket shim — a local stand-in for the hust-hsk-rooms Worker,
 * importing the exact same authoritative shared constants and contracts as
 * `worker/src/room.ts` + `worker/src/index.ts` (`shared/constants/world.ts`
 * and `shared/contracts/multiplayer.ts`).
 *
 * Usage: node test/ws-shim/server.js [port]   (default 8788)
 */
require('../register-ts.cjs');

const http = require('http');
const { WebSocketServer } = require('ws');
const { BOUNDS, SPAWN } = require('../../shared/constants/world.ts');
const {
  MAX_MSG_PER_SEC,
  ROOM_CAPACITY,
  ROOM_IDS,
  clampMoveStep,
  extractValidAppearance,
  isRemoteState,
  pickShirtColor,
  sanitizeMssv,
  sanitizeName,
} = require('../../shared/contracts/multiplayer.ts');

const PORT = Number(process.argv[2] || 8788);
const ROOMS = [...ROOM_IDS];
const CAPACITY = ROOM_CAPACITY;

function applyAppearance(session, msg) {
  const valid = extractValidAppearance(msg);
  if (valid.gender !== undefined) session.gender = valid.gender;
  if (valid.outfit !== undefined) session.outfit = valid.outfit;
  if (valid.hairStyle !== undefined) session.hairStyle = valid.hairStyle;
  if (valid.skirt !== undefined) session.skirt = valid.skirt;
  if (valid.glasses !== undefined) session.glasses = valid.glasses;
  if (valid.backpack !== undefined) session.backpack = valid.backpack;
}

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
      const color = pickShirtColor(sessionId);
      const existing = this.sessions.get(sessionId);
      const session = existing ?? {
        id: sessionId, name, mssv, color, x: SPAWN.x, z: SPAWN.z, facing: SPAWN.facing,
        state: 'idle', lastUpdate: now, msgTimes: [],
      };
      session.name = name;
      session.mssv = mssv;
      applyAppearance(session, msg);
      session.lastUpdate = now;
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
      const facing = Number(msg.facing) || 0;
      const state = isRemoteState(msg.state) ? msg.state : session.state;
      const dt = (now - session.lastUpdate) / 1000;
      const { x: nx, z: nz } = clampMoveStep(session.x, session.z, msg.x, msg.z, state, dt, BOUNDS);
      session.x = nx;
      session.z = nz;
      session.facing = facing;
      session.state = state;
      session.lastUpdate = now;
      this.broadcast({ type: 'move', id: sessionId, x: nx, z: nz, facing, state, t: now }, sessionId);
      return;
    }
    if (msg.type === 'state') {
      if (isRemoteState(msg.state)) {
        session.state = msg.state;
        session.lastUpdate = now;
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
      this.broadcast({ type: 'appearance', player: this.publicPlayer(session) }, sessionId);
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
