/**
 * hust-hsk-rooms — Cloudflare Worker for Bách khoa Hán ngữ 3D multiplayer.
 *
 * Routes:
 *   GET  /health     — { ok, rooms, capacity } (health check, no names)
 *   GET  /api/rooms  — per-room player counts ONLY (never names/MSSV)
 *   GET  /ws         — WebSocket upgrade; the client is placed in the
 *                      first room with a free slot (hsk-1..hsk-5).
 *
 * No state is ever stored: room membership lives in the Durable
 * Object's memory and is forgotten on leave. No MSSV is logged.
 */

import { HskRoom } from './room';

export { HskRoom };

const ROOMS = ['hsk-1', 'hsk-2', 'hsk-3', 'hsk-4', 'hsk-5'];
const CAPACITY = 15;

interface Env {
  HSK_ROOM: DurableObjectNamespace;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const headers = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === '/health') {
      return Response.json(
        { ok: true, rooms: ROOMS, capacity: CAPACITY },
        { headers },
      );
    }

    if (url.pathname === '/api/rooms') {
      const rooms = await Promise.all(
        ROOMS.map(async (roomId) => {
          const count = await roomCount(env, roomId);
          return { id: roomId, count, capacity: CAPACITY };
        }),
      );
      return Response.json({ rooms }, { headers });
    }

    if (url.pathname === '/ws') {
      const requested = url.searchParams.get('room');
      const candidates = requested && ROOMS.includes(requested)
        ? [requested, ...ROOMS.filter((r) => r !== requested)]
        : ROOMS;
      for (const roomId of candidates) {
        const count = await roomCount(env, roomId);
        if (count >= CAPACITY) continue;
        const stub = env.HSK_ROOM.get(env.HSK_ROOM.idFromName(roomId));
        // Forward the ORIGINAL request (keeps the WebSocket upgrade);
        // only add the room id so the DO can report it in welcome.
        const forwarded = new Request(request, {
          headers: { ...Object.fromEntries(request.headers.entries()), 'x-room-id': roomId },
        });
        return stub.fetch(forwarded);
      }
      return Response.json(
        { ok: false, error: 'all rooms full' },
        { status: 503, headers },
      );
    }

    return Response.json({ ok: false, error: 'not found' }, { status: 404, headers });
  },
};

async function roomCount(env: Env, roomId: string): Promise<number> {
  const stub = env.HSK_ROOM.get(env.HSK_ROOM.idFromName(roomId));
  return stub
    .fetch('https://internal/__count')
    .then((r) => r.json())
    .then((j) => (j as { count?: number }).count ?? 0)
    .catch(() => 0);
}
