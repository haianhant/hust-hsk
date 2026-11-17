/**
 * test/ws-shim/boardgame-do-harness.cjs — Harness thực thi `BoardGameRoom`
 * Durable Object + `handleBoardGameRequest` trên SQLite thật (qua
 * `boardgame-sqlite.cjs`) cho cả `ws-shim/server.js` và bộ test DO tích hợp.
 */

require('../register-ts.cjs');

const crypto = require('crypto');
const http = require('http');
const { WebSocketServer } = require('./mini-ws');
const { createPersistentSqlStorage, disposeAllSqliteStores } = require('./boardgame-sqlite.cjs');
const {
  BG_DIRECTORY_ROOM_NAME,
  BoardGameRoom,
} = require('../../worker/src/boardgame-room.ts');
const {
  handleBoardGameRequest,
  resolveAllowedBoardGameOrigin,
} = require('../../worker/src/boardgame-router.ts');
const {
  sanitizeBoardGameMatchId,
  sanitizeInviteCode,
} = require('../../shared/contracts/boardgame.ts');

function attachBgHibernationSupport(ws, matchId, isDirectory) {
  let attachment = {
    matchId: matchId || '',
    playerId: '',
    connectionId: crypto.randomBytes(8).toString('hex'),
    isSpectator: false,
    isDirectory: Boolean(isDirectory),
  };
  ws.serializeAttachment = (val) => {
    attachment = val ? JSON.parse(JSON.stringify(val)) : null;
  };
  ws.deserializeAttachment = () => {
    return attachment ? JSON.parse(JSON.stringify(attachment)) : null;
  };
}

function createBoardGameNamespace() {
  const containers = new Map();
  const env = {
    ENVIRONMENT: 'test',
    ALLOW_SHORT_TURN_TIMEOUT: '1',
  };

  function getOrCreateContainer(roomName) {
    let entry = containers.get(roomName);
    if (entry) return entry;

    const sockets = [];
    const sql = createPersistentSqlStorage(`bg_${roomName}`);
    let scheduledAlarmMs = null;

    const ctx = {
      id: {
        name: roomName,
        toString: () => roomName,
        equals: (other) => Boolean(other && other.toString() === roomName),
      },
      storage: {
        sql,
        getAlarm: async () => scheduledAlarmMs,
        setAlarm: async (t) => {
          scheduledAlarmMs = typeof t === 'number' ? t : t.getTime();
        },
        deleteAlarm: async () => {
          scheduledAlarmMs = null;
        },
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

    let doInstance = new BoardGameRoom(ctx, env);

    entry = {
      roomName,
      ctx,
      get doInstance() {
        return doInstance;
      },
      get alarmAtMs() {
        return scheduledAlarmMs;
      },
      hibernateAndWake() {
        doInstance = new BoardGameRoom(ctx, env);
        return doInstance;
      },
      async triggerAlarm() {
        scheduledAlarmMs = null;
        await doInstance.alarm();
        return scheduledAlarmMs;
      },
    };

    containers.set(roomName, entry);
    return entry;
  }

  const namespace = {
    idFromName(name) {
      return {
        name,
        toString: () => name,
        equals: (other) => Boolean(other && other.toString() === name),
      };
    },
    get(id) {
      const name = id.name || id.toString();
      const c = getOrCreateContainer(name);
      return {
        id,
        name,
        fetch(input, init) {
          const req = input instanceof Request ? input : new Request(input, init);
          return c.doInstance.fetch(req);
        },
      };
    },
  };

  env.BOARD_GAME_ROOM = namespace;

  return {
    namespace,
    env,
    containers,
    getOrCreateContainer,
  };
}

function readNodeRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function createBoardGameHttpAndWsHandler() {
  const { env, containers, getOrCreateContainer } = createBoardGameNamespace();

  async function tryHandleHttp(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

    if (url.pathname === '/__bg_hibernate') {
      const matchId = url.searchParams.get('matchId') || BG_DIRECTORY_ROOM_NAME;
      const c = containers.get(matchId);
      if (!c) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'unknown room' }));
        return true;
      }
      c.hibernateAndWake();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, matchId }));
      return true;
    }

    if (url.pathname === '/__bg_trigger_alarm') {
      const matchId = url.searchParams.get('matchId');
      const c = matchId ? containers.get(matchId) : null;
      if (!c) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'unknown matchId' }));
        return true;
      }
      const nextAlarmAt = await c.triggerAlarm();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, matchId, nextAlarmAt }));
      return true;
    }

    if (!url.pathname.startsWith('/api/boardgame')) {
      return false;
    }

    const bodyBuf =
      req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
        ? undefined
        : await readNodeRequestBody(req);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(', '));
    }
    const webReq = new Request(url.toString(), {
      method: req.method,
      headers,
      body: bodyBuf && bodyBuf.length > 0 ? bodyBuf : undefined,
    });
    const webRes = await handleBoardGameRequest(webReq, env);
    if (!webRes) return false;

    const resHeaders = {};
    webRes.headers.forEach((value, key) => {
      resHeaders[key] = value;
    });
    res.writeHead(webRes.status, resHeaders);
    const text = await webRes.text();
    res.end(text);
    return true;
  }

  async function tryHandleUpgrade(req, socket, head, wss) {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    if (url.pathname !== '/ws/boardgame') return false;

    const origin = req.headers.origin ?? null;
    if (!resolveAllowedBoardGameOrigin(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return true;
    }

    const mode = url.searchParams.get('mode');
    if (mode === 'directory') {
      const dirContainer = getOrCreateContainer(BG_DIRECTORY_ROOM_NAME);
      wss.handleUpgrade(req, socket, head, async (ws) => {
        attachBgHibernationSupport(ws, '', true);
        dirContainer.ctx.acceptWebSocket(ws);
        try {
          const listRes = await dirContainer.doInstance.fetch(
            new Request('https://internal/__dir/list'),
          );
          const data = await listRes.json();
          ws.send(JSON.stringify({ type: 'BG_DIRECTORY_SYNC', matches: data.matches || [] }));
        } catch {
          // ignore
        }
        ws.on('message', (d) => {
          void dirContainer.doInstance.webSocketMessage(ws, d.toString());
        });
        ws.on('close', () => {
          void dirContainer.doInstance.webSocketClose(ws);
        });
        ws.on('error', () => {
          void dirContainer.doInstance.webSocketError(ws);
        });
      });
      return true;
    }

    let matchId = sanitizeBoardGameMatchId(url.searchParams.get('matchId'));
    const code = sanitizeInviteCode(url.searchParams.get('inviteCode'));
    if (!matchId && code) {
      const dirContainer = getOrCreateContainer(BG_DIRECTORY_ROOM_NAME);
      const lookupRes = await dirContainer.doInstance.fetch(
        new Request(`https://internal/__dir/lookup?code=${encodeURIComponent(code)}`),
      );
      if (lookupRes.ok) {
        const data = await lookupRes.json();
        matchId = sanitizeBoardGameMatchId(data.match?.matchId);
      }
    }

    if (!matchId) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return true;
    }

    const matchContainer = getOrCreateContainer(matchId);
    const metaRes = await matchContainer.doInstance.fetch(
      new Request('https://internal/__meta'),
    );
    if (!metaRes.ok) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return true;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      attachBgHibernationSupport(ws, matchId, false);
      matchContainer.ctx.acceptWebSocket(ws);
      ws.on('message', (d) => {
        void matchContainer.doInstance.webSocketMessage(ws, d.toString());
      });
      ws.on('close', () => {
        void matchContainer.doInstance.webSocketClose(ws);
      });
      ws.on('error', () => {
        void matchContainer.doInstance.webSocketError(ws);
      });
    });
    return true;
  }

  return {
    env,
    containers,
    tryHandleHttp,
    tryHandleUpgrade,
  };
}

async function startStandaloneBoardGameTestServer(port = 0) {
  const bgHandler = createBoardGameHttpAndWsHandler();
  const wss = new WebSocketServer({ noServer: true });
  const server = http.createServer((req, res) => {
    void bgHandler.tryHandleHttp(req, res).then((handled) => {
      if (!handled) {
        res.writeHead(404);
        res.end('not found');
      }
    });
  });
  server.on('upgrade', (req, socket, head) => {
    void bgHandler.tryHandleUpgrade(req, socket, head, wss).then((handled) => {
      if (!handled) socket.destroy();
    });
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const actualPort = server.address().port;
  return {
    port: actualPort,
    httpBaseUrl: `http://127.0.0.1:${actualPort}`,
    wsBaseUrl: `ws://127.0.0.1:${actualPort}`,
    containers: bgHandler.containers,
    close: async () => {
      for (const c of bgHandler.containers.values()) {
        for (const sock of c.ctx.getWebSockets()) {
          try {
            sock.close(1000, 'server shutdown');
          } catch {
            // ignore
          }
        }
      }
      await new Promise((r) => setTimeout(r, 60));
      await new Promise((resolve) => server.close(resolve));
      disposeAllSqliteStores();
    },
  };
}

module.exports = {
  createBoardGameNamespace,
  createBoardGameHttpAndWsHandler,
  startStandaloneBoardGameTestServer,
};
