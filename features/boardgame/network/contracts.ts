// ---------------------------------------------------------------------------
// features/boardgame/network/contracts.ts — Guard runtime & helpers định tuyến
// URL (HTTP + WebSocket) cho Bóng Đêm KTX, dùng lại whitelist bảo mật của
// `resolveWsUrl` trong lib/multiplayer.ts.
// ---------------------------------------------------------------------------

import { resolveWsUrl } from '../../../lib/multiplayer';
import {
  BOARD_GAME_MAX_PLAYERS,
  BOARD_GAME_PROTOCOL_VERSION,
  BOARD_GAME_RULESET_VERSION,
  sanitizeBoardGameMatchId,
  sanitizeBoardGameName,
  sanitizeBoardGameTableId,
  sanitizeInviteCode,
  type BoardGameEmoteId,
  type BoardGameMatchStatus,
  type BoardGameMatchSummary,
  type BoardGameServerMessage,
  type BoardGameStateSyncMessage,
  isValidBoardGameEmote,
} from '../../../shared/contracts/boardgame';

export * from '../../../shared/contracts/boardgame';

export const BOARD_GAME_STORAGE_PREFIX = 'hustverse:bg-auth:v1:';
export const BOARD_GAME_PLAYER_KEY_STORAGE = 'hustverse:bg-player-key:v1';

let fallbackInMemoryPlayerKey: string | null = null;

export function getOrCreateStoredBoardGamePlayerKey(): string {
  const randomKey = (): string => {
    const bytes = new Uint8Array(12);
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return `bgk_${hex}`;
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    if (!fallbackInMemoryPlayerKey) fallbackInMemoryPlayerKey = randomKey();
    return fallbackInMemoryPlayerKey;
  }
  try {
    const existing = window.localStorage.getItem(BOARD_GAME_PLAYER_KEY_STORAGE);
    if (existing && /^bgk_[A-Za-z0-9_-]{8,36}$/.test(existing)) {
      return existing;
    }
    const created = randomKey();
    window.localStorage.setItem(BOARD_GAME_PLAYER_KEY_STORAGE, created);
    return created;
  } catch {
    if (!fallbackInMemoryPlayerKey) fallbackInMemoryPlayerKey = randomKey();
    return fallbackInMemoryPlayerKey;
  }
}

export interface StoredBoardGameAuth {
  matchId: string;
  inviteCode: string;
  playerId: string;
  reconnectToken: string;
  isSpectator: boolean;
  savedAtMs: number;
}

export interface BoardGameEndpoints {
  ok: true;
  httpBaseUrl: string;
  wsBaseUrl: string;
}

export function resolveBoardGameEndpoints():
  | BoardGameEndpoints
  | { ok: false; reason: string } {
  const wsRes = resolveWsUrl();
  if (!wsRes.ok) {
    return { ok: false, reason: wsRes.reason };
  }
  if (!wsRes.url) {
    return { ok: false, reason: 'Unresolved WebSocket endpoint' };
  }
  try {
    const parsed = new URL(wsRes.url);
    parsed.search = '';
    parsed.hash = '';
    if (parsed.pathname.endsWith('/ws')) {
      parsed.pathname = parsed.pathname.slice(0, -3) || '/';
    }
    const basePath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    const wsBaseUrl = `${parsed.protocol}//${parsed.host}${basePath}`;
    const httpProto = parsed.protocol === 'wss:' ? 'https:' : 'http:';
    const httpBaseUrl = `${httpProto}//${parsed.host}${basePath}`;
    return { ok: true, httpBaseUrl, wsBaseUrl };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}

export function sanitizeMatchSummary(raw: unknown): BoardGameMatchSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const matchId = sanitizeBoardGameMatchId(obj.matchId);
  const inviteCode = sanitizeInviteCode(obj.inviteCode);
  if (!matchId || !inviteCode) return null;
  const validStatuses: readonly BoardGameMatchStatus[] = [
    'CREATED',
    'WAITING',
    'READY_CHECK',
    'STARTING',
    'PLAYING',
    'FINISHED',
    'CLOSED',
  ];
  const status = validStatuses.includes(obj.status as BoardGameMatchStatus)
    ? (obj.status as BoardGameMatchStatus)
    : 'WAITING';
  return {
    matchId,
    inviteCode,
    tableId: sanitizeBoardGameTableId(obj.tableId),
    hostName: sanitizeBoardGameName(obj.hostName),
    status,
    playerCount:
      typeof obj.playerCount === 'number' && Number.isFinite(obj.playerCount)
        ? Math.max(0, Math.min(BOARD_GAME_MAX_PLAYERS, Math.floor(obj.playerCount)))
        : 0,
    maxPlayers:
      typeof obj.maxPlayers === 'number' && Number.isFinite(obj.maxPlayers)
        ? Math.max(4, Math.min(BOARD_GAME_MAX_PLAYERS, Math.floor(obj.maxPlayers)))
        : BOARD_GAME_MAX_PLAYERS,
    spectatorCount:
      typeof obj.spectatorCount === 'number' && Number.isFinite(obj.spectatorCount)
        ? Math.max(0, Math.floor(obj.spectatorCount))
        : 0,
    updatedAtMs:
      typeof obj.updatedAtMs === 'number' && Number.isFinite(obj.updatedAtMs)
        ? obj.updatedAtMs
        : Date.now(),
  };
}

export function parseBoardGameServerMessage(rawJson: string): BoardGameServerMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const msg = parsed as Record<string, unknown>;
  switch (msg.type) {
    case 'BG_AUTH_ISSUED': {
      if (
        typeof msg.matchId === 'string' &&
        typeof msg.inviteCode === 'string' &&
        typeof msg.playerId === 'string' &&
        typeof msg.reconnectToken === 'string'
      ) {
        return {
          type: 'BG_AUTH_ISSUED',
          ...(typeof msg.protocolVersion === 'number'
            ? { protocolVersion: msg.protocolVersion }
            : {}),
          matchId: msg.matchId,
          inviteCode: msg.inviteCode,
          playerId: msg.playerId,
          reconnectToken: msg.reconnectToken,
          isSpectator: Boolean(msg.isSpectator),
          seatIndex: typeof msg.seatIndex === 'number' ? msg.seatIndex : null,
        };
      }
      return null;
    }
    case 'BG_STATE_SYNC': {
      if (
        typeof msg.matchId === 'string' &&
        typeof msg.inviteCode === 'string' &&
        typeof msg.revision === 'number' &&
        Array.isArray(msg.players)
      ) {
        return msg as unknown as BoardGameStateSyncMessage;
      }
      return null;
    }
    case 'BG_ACTION_ACK': {
      if (typeof msg.requestId === 'string' && typeof msg.ok === 'boolean') {
        return {
          type: 'BG_ACTION_ACK',
          requestId: msg.requestId,
          ok: msg.ok,
          revision: typeof msg.revision === 'number' ? msg.revision : 0,
          reason: typeof msg.reason === 'string' ? msg.reason : undefined,
        };
      }
      return null;
    }
    case 'BG_ERROR': {
      if (typeof msg.code === 'string' && typeof msg.message === 'string') {
        return {
          type: 'BG_ERROR',
          code: msg.code as Extract<BoardGameServerMessage, { type: 'BG_ERROR' }>['code'],
          message: msg.message,
          requestId: typeof msg.requestId === 'string' ? msg.requestId : undefined,
          revision: typeof msg.revision === 'number' ? msg.revision : undefined,
        };
      }
      return null;
    }
    case 'BG_CHAT_EMOTE': {
      if (typeof msg.playerId === 'string' && typeof msg.displayName === 'string') {
        const emote: BoardGameEmoteId | undefined = isValidBoardGameEmote(msg.emote)
          ? msg.emote
          : undefined;
        return {
          type: 'BG_CHAT_EMOTE',
          playerId: msg.playerId,
          displayName: msg.displayName,
          emote,
          text: typeof msg.text === 'string' ? msg.text : undefined,
          atMs: typeof msg.atMs === 'number' ? msg.atMs : Date.now(),
        };
      }
      return null;
    }
    case 'BG_PONG': {
      return {
        type: 'BG_PONG',
        serverTimeMs: typeof msg.serverTimeMs === 'number' ? msg.serverTimeMs : Date.now(),
        clientTimeMs: typeof msg.clientTimeMs === 'number' ? msg.clientTimeMs : undefined,
      };
    }
    default:
      return null;
  }
}

export function loadStoredBoardGameAuth(matchId: string): StoredBoardGameAuth | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(`${BOARD_GAME_STORAGE_PREFIX}${matchId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBoardGameAuth;
    if (
      parsed &&
      parsed.matchId === matchId &&
      typeof parsed.playerId === 'string' &&
      typeof parsed.reconnectToken === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredBoardGameAuth(auth: StoredBoardGameAuth): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(`${BOARD_GAME_STORAGE_PREFIX}${auth.matchId}`, JSON.stringify(auth));
  } catch {
    // ignore storage quota errors
  }
}

export function clearStoredBoardGameAuth(matchId: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(`${BOARD_GAME_STORAGE_PREFIX}${matchId}`);
  } catch {
    // ignore
  }
}
