// ---------------------------------------------------------------------------
// worker/src/boardgame-router.ts — HTTP & WebSocket Router cho HUSTVerse
// Board Game Club (`BOARD_GAME_ROOM`), tách biệt hoàn toàn khỏi HskRoom.
//
// Routes:
//   GET  /api/boardgame/matches       — Danh sách các trận công khai từ directory DO
//   POST /api/boardgame/matches       — Tạo trận mới + mã mời CSPRNG 6 ký tự
//   POST /api/boardgame/join-by-code  — Tra cứu matchId từ mã mời 6 ký tự
//   GET  /ws/boardgame                — Nâng cấp WebSocket vào BoardGameRoom DO
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS,
  BOARD_GAME_PROTOCOL_VERSION,
  BOARD_GAME_RULESET_VERSION,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  sanitizeBoardGameMatchId,
  sanitizeBoardGameName,
  sanitizeBoardGameTableId,
  sanitizeInviteCode,
} from '../../shared/contracts/boardgame';
import {
  BG_DIRECTORY_ROOM_NAME,
  clampBoardGameTurnTimeoutMs,
  type BoardGameEnv,
} from './boardgame-room';
import {
  getBoardGameMetricsSnapshot,
  logBoardGameEvent,
} from './boardgame-observability';

const ipCreateBuckets = new Map<string, { windowStartMs: number; count: number }>();

export function resolveAllowedBoardGameOrigin(origin: string | null): string | null {
  if (!origin) return 'https://hustverse.vercel.app';
  const trimmed = origin.trim();
  if (trimmed === 'https://hustverse.vercel.app') return trimmed;
  if (/^https:\/\/hust[a-z0-9-]*\.vercel\.app$/i.test(trimmed)) return trimmed;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(trimmed)) return trimmed;
  return null;
}

export function buildBoardGameCorsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function generateCryptoInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    out += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
  }
  return out;
}

function generateCryptoMatchId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return `bg_${hex}`;
}

function checkIpRateLimit(ipKey: string, limitPerMin: number): boolean {
  const now = Date.now();
  const entry = ipCreateBuckets.get(ipKey) ?? { windowStartMs: now, count: 0 };
  if (now - entry.windowStartMs > 60_000) {
    entry.windowStartMs = now;
    entry.count = 0;
  }
  entry.count += 1;
  ipCreateBuckets.set(ipKey, entry);
  if (ipCreateBuckets.size > 512) {
    const oldestKey = ipCreateBuckets.keys().next().value;
    if (oldestKey) ipCreateBuckets.delete(oldestKey);
  }
  return entry.count <= limitPerMin;
}

export async function handleBoardGameRequest(
  request: Request,
  env: BoardGameEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  const isBgHttp = url.pathname.startsWith('/api/boardgame');
  const isBgWs = url.pathname === '/ws/boardgame';
  if (!isBgHttp && !isBgWs) {
    return null;
  }

  const origin = request.headers.get('Origin');
  const allowedOrigin = resolveAllowedBoardGameOrigin(origin);
  if (!allowedOrigin) {
    logBoardGameEvent(env, 'ORIGIN_REJECTED', {
      pathname: url.pathname,
      reason: 'disallowed-origin',
    });
    return Response.json(
      { ok: false, error: 'Origin không nằm trong danh sách cho phép.' },
      { status: 403 },
    );
  }
  const headers = buildBoardGameCorsHeaders(allowedOrigin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // GET /api/boardgame/health — Trạng thái vận hành nhẹ, an toàn (zero secret data)
  if (url.pathname === '/api/boardgame/health' && request.method === 'GET') {
    return Response.json(
      {
        ok: true,
        component: 'boardgame',
        env: env.ENVIRONMENT ?? 'production',
        protocolVersion: BOARD_GAME_PROTOCOL_VERSION,
        rulesetVersion: BOARD_GAME_RULESET_VERSION,
        metrics: getBoardGameMetricsSnapshot(),
      },
      { status: 200, headers },
    );
  }

  const ns = env.BOARD_GAME_ROOM;
  if (!ns) {
    return Response.json(
      { ok: false, error: 'BOARD_GAME_ROOM Durable Object binding is not configured.' },
      { status: 503, headers },
    );
  }

  const clientIp =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'local';

  // GET /api/boardgame/matches — Danh sách trận đang mở từ directory DO
  if (url.pathname === '/api/boardgame/matches' && request.method === 'GET') {
    const dirStub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
    const res = await dirStub.fetch('https://internal/__dir/list');
    const data = await res.json();
    return Response.json(data, { status: res.status, headers });
  }

  // GET /api/boardgame/leaderboard — Bảng Xếp Hạng CLB Board Game (tuần & toàn thời gian)
  if (url.pathname === '/api/boardgame/leaderboard' && request.method === 'GET') {
    const dirStub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
    const res = await dirStub.fetch(`https://internal/__dir/leaderboard${url.search}`);
    const data = await res.json();
    return Response.json(data, { status: res.status, headers });
  }

  // POST /api/boardgame/matches — Tạo phòng đấu mới + sinh mã mời 6 ký tự duy nhất
  if (url.pathname === '/api/boardgame/matches' && request.method === 'POST') {
    if (!checkIpRateLimit(`create:${clientIp}`, 20)) {
      logBoardGameEvent(env, 'RATE_LIMITED', { pathname: url.pathname, reason: 'create-match' });
      return Response.json(
        { ok: false, error: 'Tạo phòng quá nhanh, vui lòng thử lại sau ít phút.' },
        { status: 429, headers },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === 'object') {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return Response.json({ ok: false, error: 'JSON không hợp lệ.' }, { status: 400, headers });
    }

    const tableId = sanitizeBoardGameTableId(body.tableId);
    const hostName = sanitizeBoardGameName(body.hostName);
    const rawTimeout =
      typeof body.turnTimeoutMs === 'number'
        ? body.turnTimeoutMs
        : BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS;
    const turnTimeoutMs = clampBoardGameTurnTimeoutMs(rawTimeout, env);

    const dirStub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
    let createdMatchId = '';
    let createdInvite = '';

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidateMatchId = generateCryptoMatchId();
      const candidateCode = generateCryptoInviteCode();
      const regRes = await dirStub.fetch('https://internal/__dir/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: candidateMatchId,
          inviteCode: candidateCode,
          tableId,
          hostName,
        }),
      });
      if (regRes.status === 409) continue;
      if (!regRes.ok) {
        return Response.json(
          { ok: false, error: 'Không thể đăng ký phòng vào danh sách CLB.' },
          { status: 500, headers },
        );
      }
      createdMatchId = candidateMatchId;
      createdInvite = candidateCode;
      break;
    }

    if (!createdMatchId || !createdInvite) {
      return Response.json(
        { ok: false, error: 'Không thể cấp phát mã mời duy nhất, vui lòng thử lại.' },
        { status: 503, headers },
      );
    }

    const matchStub = ns.get(ns.idFromName(createdMatchId));
    const initRes = await matchStub.fetch('https://internal/__init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: createdMatchId,
        inviteCode: createdInvite,
        tableId,
        turnTimeoutMs,
      }),
    });
    if (!initRes.ok) {
      return Response.json(
        { ok: false, error: 'Không thể khởi tạo phòng Durable Object.' },
        { status: 500, headers },
      );
    }

    return Response.json(
      {
        ok: true,
        matchId: createdMatchId,
        inviteCode: createdInvite,
        tableId,
      },
      { status: 201, headers },
    );
  }

  // POST /api/boardgame/join-table — Tự động vào phòng chờ đang mở của Bàn 1/2 hoặc tạo phòng mới
  if (url.pathname === '/api/boardgame/join-table' && request.method === 'POST') {
    if (!checkIpRateLimit(`join-table:${clientIp}`, 30)) {
      logBoardGameEvent(env, 'RATE_LIMITED', { pathname: url.pathname, reason: 'join-table' });
      return Response.json(
        { ok: false, error: 'Thao tác chọn bàn quá nhanh, vui lòng chờ giây lát.' },
        { status: 429, headers },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === 'object') {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return Response.json({ ok: false, error: 'JSON không hợp lệ.' }, { status: 400, headers });
    }

    const tableId = sanitizeBoardGameTableId(body.tableId);
    const hostName = sanitizeBoardGameName(body.hostName);
    const rawTimeout =
      typeof body.turnTimeoutMs === 'number'
        ? body.turnTimeoutMs
        : BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS;
    const turnTimeoutMs = clampBoardGameTurnTimeoutMs(rawTimeout, env);
    const dirStub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidateMatchId = generateCryptoMatchId();
      const candidateCode = generateCryptoInviteCode();
      const regRes = await dirStub.fetch('https://internal/__dir/join-or-register-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          hostName,
          matchId: candidateMatchId,
          inviteCode: candidateCode,
        }),
      });
      if (regRes.status === 409) continue;
      if (!regRes.ok) {
        return Response.json(
          { ok: false, error: 'Không thể ghép phòng vào danh sách CLB.' },
          { status: 500, headers },
        );
      }

      const regData = (await regRes.json()) as {
        ok?: boolean;
        created?: boolean;
        match?: { matchId?: string; inviteCode?: string; updatedAtMs?: number };
      };
      const targetMatchId = sanitizeBoardGameMatchId(regData.match?.matchId);
      const targetInvite = sanitizeInviteCode(regData.match?.inviteCode);
      if (!targetMatchId || !targetInvite) {
        continue;
      }

      const matchStub = ns.get(ns.idFromName(targetMatchId));
      if (regData.created) {
        const initRes = await matchStub.fetch('https://internal/__init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: targetMatchId,
            inviteCode: targetInvite,
            tableId,
            turnTimeoutMs,
          }),
        });
        if (!initRes.ok) {
          await dirStub
            .fetch('https://internal/__dir/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                matchId: targetMatchId,
                status: 'CLOSED',
                hostName,
                playerCount: 0,
                spectatorCount: 0,
              }),
            })
            .catch(() => undefined);
          return Response.json(
            { ok: false, error: 'Không thể khởi tạo phòng Durable Object.' },
            { status: 500, headers },
          );
        }
        return Response.json(
          {
            ok: true,
            created: true,
            matchId: targetMatchId,
            inviteCode: targetInvite,
            tableId,
          },
          { status: 201, headers },
        );
      }

      // Xác minh DO thực tế vẫn đang mở ở sảnh chờ trước khi trả cho client kết nối
      let metaRes = await matchStub.fetch('https://internal/__meta');
      if (
        !metaRes.ok &&
        typeof regData.match?.updatedAtMs === 'number' &&
        Date.now() - regData.match.updatedAtMs < 5000
      ) {
        // Phòng vừa được đăng ký song song -> khởi tạo idempotent rồi kiểm tra lại
        await matchStub
          .fetch('https://internal/__init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: targetMatchId,
              inviteCode: targetInvite,
              tableId,
              turnTimeoutMs,
            }),
          })
          .catch(() => undefined);
        metaRes = await matchStub.fetch('https://internal/__meta');
      }
      if (!metaRes.ok) {
        await dirStub
          .fetch('https://internal/__dir/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: targetMatchId,
              status: 'CLOSED',
              hostName,
              playerCount: 0,
              spectatorCount: 0,
            }),
          })
          .catch(() => undefined);
        continue;
      }
      const meta = (await metaRes.json().catch(() => ({}))) as { status?: string };
      if (
        meta.status !== 'CREATED' &&
        meta.status !== 'WAITING' &&
        meta.status !== 'READY_CHECK'
      ) {
        await dirStub
          .fetch('https://internal/__dir/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: targetMatchId,
              status: meta.status || 'CLOSED',
              hostName,
              playerCount: 0,
              spectatorCount: 0,
            }),
          })
          .catch(() => undefined);
        continue;
      }

      return Response.json(
        {
          ok: true,
          created: false,
          matchId: targetMatchId,
          inviteCode: targetInvite,
          tableId,
        },
        { status: 200, headers },
      );
    }

    return Response.json(
      { ok: false, error: 'Không thể ghép hoặc tạo phòng cho bàn này, vui lòng thử lại.' },
      { status: 503, headers },
    );
  }

  // POST /api/boardgame/join-by-code — Tra cứu phòng qua mã mời 6 ký tự
  if (url.pathname === '/api/boardgame/join-by-code' && request.method === 'POST') {
    if (!checkIpRateLimit(`lookup:${clientIp}`, 40)) {
      logBoardGameEvent(env, 'RATE_LIMITED', { pathname: url.pathname, reason: 'join-by-code' });
      return Response.json(
        { ok: false, error: 'Tra cứu mã mời quá nhiều lần, vui lòng chờ giây lát.' },
        { status: 429, headers },
      );
    }
    let body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === 'object') {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return Response.json({ ok: false, error: 'JSON không hợp lệ.' }, { status: 400, headers });
    }
    const code = sanitizeInviteCode(body.inviteCode);
    if (!code) {
      return Response.json(
        { ok: false, error: 'Mã mời phải gồm đúng 6 ký tự hợp lệ.' },
        { status: 400, headers },
      );
    }
    const dirStub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
    const lookupRes = await dirStub.fetch(
      `https://internal/__dir/lookup?code=${encodeURIComponent(code)}`,
    );
    const data = await lookupRes.json();
    return Response.json(data, { status: lookupRes.status, headers });
  }

  // GET /ws/boardgame — Nâng cấp WebSocket cho directory hoặc phòng đấu cụ thể
  if (isBgWs) {
    const mode = url.searchParams.get('mode');
    if (mode === 'directory') {
      const dirStub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
      return dirStub.fetch(request);
    }

    let matchId = sanitizeBoardGameMatchId(url.searchParams.get('matchId'));
    const code = sanitizeInviteCode(url.searchParams.get('inviteCode'));
    if (!matchId && code) {
      const dirStub = ns.get(ns.idFromName(BG_DIRECTORY_ROOM_NAME));
      const lookupRes = await dirStub.fetch(
        `https://internal/__dir/lookup?code=${encodeURIComponent(code)}`,
      );
      if (lookupRes.ok) {
        const payload = (await lookupRes.json()) as { match?: { matchId?: string } };
        matchId = sanitizeBoardGameMatchId(payload.match?.matchId);
      }
    }
    if (!matchId) {
      return Response.json(
        { ok: false, error: 'Thiếu hoặc sai matchId / inviteCode.' },
        { status: 404, headers },
      );
    }

    const matchStub = ns.get(ns.idFromName(matchId));
    const forwarded = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'x-bg-match-id': matchId,
      },
    });
    return matchStub.fetch(forwarded);
  }

  return Response.json({ ok: false, error: 'not found' }, { status: 404, headers });
}
