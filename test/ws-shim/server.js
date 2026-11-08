/**
 * HSK WebSocket shim — a local stand-in for the hust-hsk-rooms Worker,
 * executing the ACTUAL `HskRoom` Durable Object class from `worker/src/room.ts`
 * with simulated DurableObjectState and WebSocket Hibernation attachments.
 *
 * Endpoints:
 *   GET  /health               — { ok, rooms, capacity }
 *   GET  /api/rooms            — per-room player counts
 *   POST /__hibernate?room=... — simulates a Durable Object hibernation cold restart
 *                                by re-instantiating `new HskRoom(ctx)` while keeping
 *                                live WebSockets and their serialized attachments intact
 *   WS   /ws?room=hsk-1        — WebSocket upgrade routed to the room's HskRoom DO
 *
 * Usage: node test/ws-shim/server.js [port]   (default 8788)
 */
require('../register-ts.cjs');

const http = require('http');
const { WebSocketServer } = require('./mini-ws');
const { ROOM_CAPACITY, ROOM_IDS } = require('../../shared/contracts/multiplayer.ts');
const { HskRoom } = require('../../worker/src/room.ts');

const PORT = Number(process.argv[2] || 8788);
const ROOMS = [...ROOM_IDS];
const CAPACITY = ROOM_CAPACITY;

function createRoomContainer(roomId) {
  const sockets = [];
  const ctx = {
    id: {
      name: roomId,
      toString: () => roomId,
      equals: (other) => Boolean(other && other.toString() === roomId),
    },
    acceptWebSocket(ws) {
      if (!sockets.includes(ws)) {
        sockets.push(ws);
      }
    },
    getWebSockets() {
      return sockets.filter((s) => s.readyState === 1);
    },
  };

  function instantiateDo() {
    const inst = new HskRoom(ctx);
    inst.roomId = roomId;
    return inst;
  }

  let doInstance = instantiateDo();

  return {
    id: roomId,
    ctx,
    get doInstance() {
      return doInstance;
    },
    get count() {
      return doInstance.sessions ? doInstance.sessions.size : ctx.getWebSockets().length;
    },
    hibernateAndWake() {
      doInstance = instantiateDo();
      return doInstance;
    },
  };
}

function attachHibernationSupport(ws, roomId) {
  let attachment = { id: '', roomId };
  ws.serializeAttachment = (val) => {
    attachment = val ? JSON.parse(JSON.stringify(val)) : null;
  };
  ws.deserializeAttachment = () => {
    return attachment ? JSON.parse(JSON.stringify(attachment)) : null;
  };
}

const rooms = new Map(ROOMS.map((id) => [id, createRoomContainer(id)]));
const wss = new WebSocketServer({ noServer: true });

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, rooms: ROOMS, capacity: CAPACITY }));
  }

  if (url.pathname === '/api/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        rooms: ROOMS.map((id) => ({
          id,
          count: rooms.get(id).count,
          capacity: CAPACITY,
        })),
      }),
    );
  }

  if (url.pathname === '/__hibernate') {
    const roomId = url.searchParams.get('room') || 'hsk-1';
    const room = rooms.get(roomId);
    if (!room) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'unknown room' }));
    }
    room.hibernateAndWake();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, roomId, count: room.count }));
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
  const candidates =
    requested && ROOMS.includes(requested)
      ? [requested, ...ROOMS.filter((r) => r !== requested)]
      : ROOMS;

  for (const roomId of candidates) {
    const room = rooms.get(roomId);
    if (room.count >= CAPACITY) continue;
    wss.handleUpgrade(req, socket, head, (ws) => {
      attachHibernationSupport(ws, roomId);
      room.ctx.acceptWebSocket(ws);
      ws.on('message', (d) => {
        room.doInstance.webSocketMessage(ws, d.toString());
      });
      ws.on('close', () => {
        room.doInstance.webSocketClose(ws);
      });
      ws.on('error', () => {
        room.doInstance.webSocketError(ws);
      });
    });
    return;
  }
  socket.destroy();
});

server.listen(PORT, () =>
  console.log(`HSK shim listening on http://127.0.0.1:${PORT} (ws /ws)`),
);
