// ---------------------------------------------------------------------------
// worker/src/boardgame-observability.ts — Structured JSON logging & safe
// metrics cho Bóng Đêm KTX v3.1.
//
// Bảo mật P0:
// - Chỉ cho phép whitelist các trường công khai/vận hành an toàn.
// - Tuyệt đối KHÔNG log `reconnectToken`, `tokenHash`, `roleId` chưa lật,
//   `faction` đang chơi, `hp`/`maxHp`, `hand`, `privateClues`, `privateNotes`,
//   `protegePlayerId`, `rngState`, `game_state_json`, hay MSSV 8 chữ số.
// ---------------------------------------------------------------------------

export type BoardGameLogEventType =
  | 'MATCH_CREATED'
  | 'PLAYER_JOINED'
  | 'PLAYER_RECONNECTED'
  | 'PLAYER_DISCONNECTED'
  | 'MATCH_STARTED'
  | 'ACTION_APPLIED'
  | 'ACTION_REJECTED'
  | 'TURN_TIMEOUT'
  | 'MATCH_FINISHED'
  | 'MATCH_CLEANED_UP'
  | 'ORIGIN_REJECTED'
  | 'RATE_LIMITED'
  | 'WEBSOCKET_ERROR';

export interface BoardGameLogEntry {
  ts: string;
  component: 'boardgame';
  env: string;
  event: BoardGameLogEventType;
  matchId?: string;
  tableId?: string;
  status?: string;
  revision?: number;
  playerId?: string;
  seatIndex?: number | null;
  isSpectator?: boolean;
  actionType?: string;
  code?: string;
  reason?: string;
  round?: number;
  turnNumber?: number;
  playerCount?: number;
  cleanedCount?: number;
  pathname?: string;
  winnerFaction?: string | null;
}

const SAFE_TEXT_RE = /\b\d{8}\b/g;

function sanitizeLogString(raw: unknown, maxLen = 160): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(SAFE_TEXT_RE, 'HUST')
    .trim()
    .slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : undefined;
}

const eventCounters: Record<BoardGameLogEventType, number> = {
  MATCH_CREATED: 0,
  PLAYER_JOINED: 0,
  PLAYER_RECONNECTED: 0,
  PLAYER_DISCONNECTED: 0,
  MATCH_STARTED: 0,
  ACTION_APPLIED: 0,
  ACTION_REJECTED: 0,
  TURN_TIMEOUT: 0,
  MATCH_FINISHED: 0,
  MATCH_CLEANED_UP: 0,
  ORIGIN_REJECTED: 0,
  RATE_LIMITED: 0,
  WEBSOCKET_ERROR: 0,
};

let lastEventAtMs = 0;
let activeLogSink: ((entry: BoardGameLogEntry) => void) | null = null;

export function setBoardGameLogSink(
  sink: ((entry: BoardGameLogEntry) => void) | null,
): void {
  activeLogSink = sink;
}

export function getBoardGameMetricsSnapshot(): {
  counts: Record<BoardGameLogEventType, number>;
  lastEventAtMs: number;
} {
  return {
    counts: { ...eventCounters },
    lastEventAtMs,
  };
}

export function resetBoardGameObservabilityForTest(): void {
  for (const key of Object.keys(eventCounters) as BoardGameLogEventType[]) {
    eventCounters[key] = 0;
  }
  lastEventAtMs = 0;
}

export function logBoardGameEvent(
  env: { ENVIRONMENT?: string } | undefined,
  event: BoardGameLogEventType,
  fields: Omit<BoardGameLogEntry, 'ts' | 'component' | 'env' | 'event'> = {},
): BoardGameLogEntry {
  const nowMs = Date.now();
  eventCounters[event] += 1;
  lastEventAtMs = nowMs;

  const entry: BoardGameLogEntry = {
    ts: new Date(nowMs).toISOString(),
    component: 'boardgame',
    env: sanitizeLogString(env?.ENVIRONMENT, 24) ?? 'production',
    event,
    ...(fields.matchId !== undefined
      ? { matchId: sanitizeLogString(fields.matchId, 48) }
      : {}),
    ...(fields.tableId !== undefined
      ? { tableId: sanitizeLogString(fields.tableId, 16) }
      : {}),
    ...(fields.status !== undefined
      ? { status: sanitizeLogString(fields.status, 24) }
      : {}),
    ...(typeof fields.revision === 'number' && Number.isFinite(fields.revision)
      ? { revision: fields.revision }
      : {}),
    ...(fields.playerId !== undefined
      ? { playerId: sanitizeLogString(fields.playerId, 48) }
      : {}),
    ...(fields.seatIndex !== undefined ? { seatIndex: fields.seatIndex } : {}),
    ...(typeof fields.isSpectator === 'boolean'
      ? { isSpectator: fields.isSpectator }
      : {}),
    ...(fields.actionType !== undefined
      ? { actionType: sanitizeLogString(fields.actionType, 32) }
      : {}),
    ...(fields.code !== undefined ? { code: sanitizeLogString(fields.code, 32) } : {}),
    ...(fields.reason !== undefined
      ? { reason: sanitizeLogString(fields.reason, 160) }
      : {}),
    ...(typeof fields.round === 'number' && Number.isFinite(fields.round)
      ? { round: fields.round }
      : {}),
    ...(typeof fields.turnNumber === 'number' && Number.isFinite(fields.turnNumber)
      ? { turnNumber: fields.turnNumber }
      : {}),
    ...(typeof fields.playerCount === 'number' && Number.isFinite(fields.playerCount)
      ? { playerCount: fields.playerCount }
      : {}),
    ...(typeof fields.cleanedCount === 'number' && Number.isFinite(fields.cleanedCount)
      ? { cleanedCount: fields.cleanedCount }
      : {}),
    ...(fields.pathname !== undefined
      ? { pathname: sanitizeLogString(fields.pathname, 64) }
      : {}),
    ...(event === 'MATCH_FINISHED' && fields.winnerFaction !== undefined
      ? { winnerFaction: fields.winnerFaction }
      : {}),
  };

  if (activeLogSink) {
    activeLogSink(entry);
  } else if (
    event === 'ACTION_REJECTED' ||
    event === 'ORIGIN_REJECTED' ||
    event === 'RATE_LIMITED' ||
    event === 'WEBSOCKET_ERROR'
  ) {
    console.warn(JSON.stringify(entry));
  } else {
    console.info(JSON.stringify(entry));
  }

  return entry;
}
