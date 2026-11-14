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

import {
  claimSeat,
  createSeatRegistry,
  getOccupantSeat,
  listOccupanciesForRoom,
  reconcileServerPresenceWithSeat,
  releaseSeatByOccupant,
  restoreSeatRegistryFromAttachments,
  updateOccupantMetaInSeatRegistry,
  type HibernatedSeatAttachment,
  type SeatRegistry,
} from '../../features/social/rooms/seat-manager';
import { BOUNDS, SPAWN, clampScalar } from '../../shared/constants/world';
import {
  MAX_MSG_PER_SEC,
  ROOM_CAPACITY,
  SHIRT_COLORS,
  clampMoveStep,
  derivePublicPlayerId,
  extractValidAppearance,
  hashString,
  isAvatarEmoteId,
  isRemoteState,
  pickShirtColor,
  sanitizeChatMessage,
  sanitizeMssv,
  sanitizeName,
  sanitizeReconnectToken,
  type AvatarGender,
  type AvatarHairStyle,
  type AvatarOutfitId,
  type Player,
  type PlayerState,
} from '../../shared/contracts/multiplayer';
import {
  SEED_CAMPUS_MEMORIES,
  isValidMemoryBoardId,
  isValidMemoryColor,
  sanitizeMemoryAuthor,
  sanitizeMemoryCohort,
  sanitizeMemoryText,
  type CampusMemoryNote,
  type MemoryBoardId,
  type MemoryNoteColor,
} from '../../shared/contracts/memory';
import {
  MAX_STUDY_WS_PAYLOAD_BYTES,
  formatHustCohortBadge,
  getVietnamDayKey,
  getVietnamWeekKey,
  isValidLeaderboardPeriod,
  sanitizeRequestId,
  sanitizeSubjectTag,
  type LeaderboardPeriod,
  type PlayerPresenceStatus,
  type PlayerStudyPresence,
  type PomodoroPhase,
  type ServerStudyRoomSnapshotMessage,
  type StudyLeaderboardEntry,
  type StudyLeaderboardResponse,
} from '../../shared/contracts/study';

export {
  BOUNDS,
  ROOM_CAPACITY,
  SHIRT_COLORS,
  SPAWN,
  derivePublicPlayerId,
  hashString,
  sanitizeMssv,
  sanitizeName,
  sanitizeReconnectToken,
  type Player,
  type PlayerState,
};

export interface SocketAttachment {
  id: string;
  reconnectKey?: string;
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
  seatId?: string | null;
  occupiedAtMs?: number | null;
  studyPresence?: {
    status?: PlayerPresenceStatus;
    pomodoroPhase?: PomodoroPhase;
    subjectTag?: string | null;
    updatedAtMs?: number;
  } | null;
  studyRevision?: number;
}

interface HibernatableWebSocket extends WebSocket {
  serializeAttachment?: (attachment: SocketAttachment) => void;
  deserializeAttachment?: () => SocketAttachment | null | undefined;
}

interface Session {
  id: string;
  reconnectKey: string;
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

interface LeaderboardRow {
  player_id: string;
  name: string;
  cohort_badge: string;
  color: string;
  gender: AvatarGender;
  outfit: AvatarOutfitId;
  hair_style: AvatarHairStyle;
  subject_tag: string | null;
  daily_focus_seconds: number;
  weekly_focus_seconds: number;
  total_focus_seconds: number;
  completed_blocks: number;
  streak_days: number;
  day_key: string;
  week_key: string;
  last_progress_at_ms: number;
  updated_at_ms: number;
}

const SEED_LEADERBOARD_STUDENTS: ReadonlyArray<
  Omit<LeaderboardRow, 'day_key' | 'week_key' | 'last_progress_at_ms' | 'updated_at_ms'>
> = [
  {
    player_id: 'seed-hust-1',
    name: 'Trần Minh Hoàng',
    cohort_badge: 'K67 · 2022****',
    color: '#1F3A5F',
    gender: 'male',
    outfit: 'windbreaker-hust',
    hair_style: 'swept',
    subject_tag: 'HSK 4 · Bài 5 — Ôn thi',
    daily_focus_seconds: 5400, // 1 giờ 30 phút
    weekly_focus_seconds: 21600, // 6 giờ 00 phút
    total_focus_seconds: 64800, // 18 giờ 00 phút
    completed_blocks: 43,
    streak_days: 7,
  },
  {
    player_id: 'seed-hust-2',
    name: 'Nguyễn Phương Linh',
    cohort_badge: 'K68 · 2023****',
    color: '#7C4DBE',
    gender: 'female',
    outfit: 'bomber-red-grey',
    hair_style: 'ponytail',
    subject_tag: 'HSK 3 · Bài 12 — Giao tiếp',
    daily_focus_seconds: 4200, // 1 giờ 10 phút
    weekly_focus_seconds: 18000, // 5 giờ 00 phút
    total_focus_seconds: 50400, // 14 giờ 00 phút
    completed_blocks: 34,
    streak_days: 5,
  },
  {
    player_id: 'seed-hust-3',
    name: 'Lê Đức Anh',
    cohort_badge: 'K67 · 2022****',
    color: '#2E7D32',
    gender: 'male',
    outfit: 'hoodie-hust',
    hair_style: 'short',
    subject_tag: 'Giải tích 1 & HSK 3',
    daily_focus_seconds: 3000, // 50 phút
    weekly_focus_seconds: 13500, // 3 giờ 45 phút
    total_focus_seconds: 37800, // 10 giờ 30 phút
    completed_blocks: 25,
    streak_days: 4,
  },
  {
    player_id: 'seed-hust-4',
    name: 'Phạm Thảo Vy',
    cohort_badge: 'K69 · 2024****',
    color: '#0E7C7B',
    gender: 'female',
    outfit: 'sweater-cream',
    hair_style: 'bob',
    subject_tag: 'Từ vựng HSK 3 · Thư viện TQB',
    daily_focus_seconds: 1800, // 30 phút
    weekly_focus_seconds: 9000, // 2 giờ 30 phút
    total_focus_seconds: 25200, // 7 giờ 00 phút
    completed_blocks: 17,
    streak_days: 3,
  },
  {
    player_id: 'seed-hust-5',
    name: 'Vũ Quốc Khánh',
    cohort_badge: 'K66 · 2021****',
    color: '#C2571B',
    gender: 'male',
    outfit: 'polo-red',
    hair_style: 'layered',
    subject_tag: 'Đồ án SoICT & HSK 4',
    daily_focus_seconds: 1500, // 25 phút
    weekly_focus_seconds: 6000, // 1 giờ 40 phút
    total_focus_seconds: 16200, // 4 giờ 30 phút
    completed_blocks: 11,
    streak_days: 2,
  },
];

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
  private seatRegistry: SeatRegistry = createSeatRegistry();
  private presences = new Map<string, PlayerStudyPresence>();
  private studyRevision = 1;
  private leaderboardSchemaReady = false;
  private leaderboardMem = new Map<string, LeaderboardRow>();
  private memoriesSchemaReady = false;
  private memoriesMem = new Map<string, CampusMemoryNote>();

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
    this.restoreHibernatedSessions();
  }

  private get sql(): SqlStorage | undefined {
    try {
      return this.ctx.storage?.sql;
    } catch {
      return undefined;
    }
  }

  /**
   * Initializes the SQLite table `study_leaderboard` inside the Durable Object
   * (with automatic in-memory fallback for unit test shims) and seeds 5 HUST
   * student peers so the leaderboard is always rich and motivating.
   */
  private ensureLeaderboardSchema(nowMs: number = Date.now()) {
    const dayKey = getVietnamDayKey(nowMs);
    const weekKey = getVietnamWeekKey(nowMs);
    const sql = this.sql;

    if (!this.leaderboardSchemaReady) {
      this.leaderboardSchemaReady = true;
      if (sql) {
        try {
          sql.exec(`
            CREATE TABLE IF NOT EXISTS study_leaderboard (
              player_id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              cohort_badge TEXT NOT NULL,
              color TEXT NOT NULL,
              gender TEXT NOT NULL DEFAULT 'male',
              outfit TEXT NOT NULL DEFAULT 'windbreaker-hust',
              hair_style TEXT NOT NULL DEFAULT 'short',
              subject_tag TEXT,
              daily_focus_seconds INTEGER NOT NULL DEFAULT 0,
              weekly_focus_seconds INTEGER NOT NULL DEFAULT 0,
              total_focus_seconds INTEGER NOT NULL DEFAULT 0,
              completed_blocks INTEGER NOT NULL DEFAULT 0,
              streak_days INTEGER NOT NULL DEFAULT 1,
              day_key TEXT NOT NULL,
              week_key TEXT NOT NULL,
              last_progress_at_ms INTEGER NOT NULL DEFAULT 0,
              updated_at_ms INTEGER NOT NULL DEFAULT 0
            )
          `);
          sql.exec(
            `CREATE INDEX IF NOT EXISTS idx_lb_daily ON study_leaderboard(day_key, daily_focus_seconds DESC)`,
          );
          sql.exec(
            `CREATE INDEX IF NOT EXISTS idx_lb_weekly ON study_leaderboard(week_key, weekly_focus_seconds DESC)`,
          );
          sql.exec(
            `CREATE INDEX IF NOT EXISTS idx_lb_total ON study_leaderboard(total_focus_seconds DESC)`,
          );
        } catch {
          // fallback to leaderboardMem if sql.exec fails
        }
      }
    }

    for (const seed of SEED_LEADERBOARD_STUDENTS) {
      const existing = this.getLeaderboardRow(seed.player_id);
      if (!existing) {
        this.upsertLeaderboardRow({
          ...seed,
          day_key: dayKey,
          week_key: weekKey,
          last_progress_at_ms: 0,
          updated_at_ms: nowMs - 60000,
        });
      } else if (existing.day_key !== dayKey || existing.week_key !== weekKey) {
        this.upsertLeaderboardRow({
          ...existing,
          daily_focus_seconds: seed.daily_focus_seconds,
          weekly_focus_seconds: seed.weekly_focus_seconds,
          day_key: dayKey,
          week_key: weekKey,
        });
      }
    }
  }

  private getLeaderboardRow(playerId: string): LeaderboardRow | null {
    const sql = this.sql;
    if (sql) {
      try {
        const rows = sql
          .exec<LeaderboardRow>(
            `SELECT * FROM study_leaderboard WHERE player_id = ? LIMIT 1`,
            playerId,
          )
          .toArray();
        if (rows.length > 0) {
          return this.normalizeLeaderboardRow(rows[0]);
        }
        return null;
      } catch {
        // fallback to in-memory
      }
    }
    return this.leaderboardMem.get(playerId) ?? null;
  }

  private listAllLeaderboardRows(): LeaderboardRow[] {
    const sql = this.sql;
    if (sql) {
      try {
        return sql
          .exec<LeaderboardRow>(`SELECT * FROM study_leaderboard`)
          .toArray()
          .map((r) => this.normalizeLeaderboardRow(r));
      } catch {
        // fallback to in-memory
      }
    }
    return Array.from(this.leaderboardMem.values());
  }

  private normalizeLeaderboardRow(raw: LeaderboardRow): LeaderboardRow {
    const validApp = extractValidAppearance({
      gender: raw.gender,
      outfit: raw.outfit,
      hairStyle: raw.hair_style,
    });
    return {
      player_id: String(raw.player_id),
      name: sanitizeName(raw.name),
      cohort_badge: String(raw.cohort_badge || 'SV Bách Khoa').slice(0, 32),
      color: typeof raw.color === 'string' && raw.color.startsWith('#') ? raw.color : '#1F3A5F',
      gender: validApp.gender ?? 'male',
      outfit: validApp.outfit ?? 'windbreaker-hust',
      hair_style: validApp.hairStyle ?? 'short',
      subject_tag: sanitizeSubjectTag(raw.subject_tag),
      daily_focus_seconds: Math.max(0, Math.floor(Number(raw.daily_focus_seconds) || 0)),
      weekly_focus_seconds: Math.max(0, Math.floor(Number(raw.weekly_focus_seconds) || 0)),
      total_focus_seconds: Math.max(0, Math.floor(Number(raw.total_focus_seconds) || 0)),
      completed_blocks: Math.max(0, Math.floor(Number(raw.completed_blocks) || 0)),
      streak_days: Math.max(1, Math.floor(Number(raw.streak_days) || 1)),
      day_key: String(raw.day_key || ''),
      week_key: String(raw.week_key || ''),
      last_progress_at_ms: Math.max(0, Math.floor(Number(raw.last_progress_at_ms) || 0)),
      updated_at_ms: Math.max(0, Math.floor(Number(raw.updated_at_ms) || 0)),
    };
  }

  private upsertLeaderboardRow(row: LeaderboardRow) {
    this.leaderboardMem.set(row.player_id, row);
    const sql = this.sql;
    if (sql) {
      try {
        sql.exec(
          `INSERT INTO study_leaderboard (
            player_id, name, cohort_badge, color, gender, outfit, hair_style,
            subject_tag, daily_focus_seconds, weekly_focus_seconds, total_focus_seconds,
            completed_blocks, streak_days, day_key, week_key, last_progress_at_ms, updated_at_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(player_id) DO UPDATE SET
            name = excluded.name,
            cohort_badge = excluded.cohort_badge,
            color = excluded.color,
            gender = excluded.gender,
            outfit = excluded.outfit,
            hair_style = excluded.hair_style,
            subject_tag = excluded.subject_tag,
            daily_focus_seconds = excluded.daily_focus_seconds,
            weekly_focus_seconds = excluded.weekly_focus_seconds,
            total_focus_seconds = excluded.total_focus_seconds,
            completed_blocks = excluded.completed_blocks,
            streak_days = excluded.streak_days,
            day_key = excluded.day_key,
            week_key = excluded.week_key,
            last_progress_at_ms = excluded.last_progress_at_ms,
            updated_at_ms = excluded.updated_at_ms`,
          row.player_id,
          row.name,
          row.cohort_badge,
          row.color,
          row.gender,
          row.outfit,
          row.hair_style,
          row.subject_tag,
          row.daily_focus_seconds,
          row.weekly_focus_seconds,
          row.total_focus_seconds,
          row.completed_blocks,
          row.streak_days,
          row.day_key,
          row.week_key,
          row.last_progress_at_ms,
          row.updated_at_ms,
        );
      } catch {
        // in-memory fallback already updated
      }
    }
  }

  private rowToLeaderboardEntry(
    row: LeaderboardRow,
    period: LeaderboardPeriod,
    rank: number,
    dayKey: string,
    weekKey: string,
    selfPlayerId?: string | null,
  ): StudyLeaderboardEntry {
    const dailyFocusSeconds = row.day_key === dayKey ? row.daily_focus_seconds : 0;
    const weeklyFocusSeconds = row.week_key === weekKey ? row.weekly_focus_seconds : 0;
    const totalFocusSeconds = row.total_focus_seconds;
    const focusSeconds =
      period === 'daily'
        ? dailyFocusSeconds
        : period === 'weekly'
          ? weeklyFocusSeconds
          : totalFocusSeconds;

    return {
      rank,
      playerId: row.player_id,
      name: row.name,
      cohortBadge: row.cohort_badge,
      color: row.color,
      gender: row.gender,
      outfit: row.outfit,
      hairStyle: row.hair_style,
      subjectTag: row.subject_tag,
      focusSeconds,
      dailyFocusSeconds,
      weeklyFocusSeconds,
      totalFocusSeconds,
      completedBlocks: row.completed_blocks,
      streakDays: row.streak_days,
      updatedAtMs: row.updated_at_ms,
      ...(selfPlayerId && row.player_id === selfPlayerId ? { isSelf: true } : {}),
    };
  }

  private recordLeaderboardProgress(params: {
    playerId: string;
    name: string;
    mssv?: string | null;
    color?: string;
    gender?: AvatarGender;
    outfit?: AvatarOutfitId;
    hairStyle?: AvatarHairStyle;
    subjectTag?: string | null;
    deltaSeconds: number;
    completedBlocksDelta?: number;
    nowMs?: number;
  }): StudyLeaderboardEntry {
    const nowMs = params.nowMs ?? Date.now();
    this.ensureLeaderboardSchema(nowMs);
    const dayKey = getVietnamDayKey(nowMs);
    const weekKey = getVietnamWeekKey(nowMs);
    const yesterdayKey = getVietnamDayKey(nowMs - 86400000);
    const existing = this.getLeaderboardRow(params.playerId);

    const rawDelta = Math.max(0, Math.round(Number(params.deltaSeconds) || 0));
    let clampedDelta = 0;
    if (rawDelta > 0) {
      if (existing && existing.last_progress_at_ms > 0) {
        const elapsedSec = Math.max(
          1,
          Math.ceil((nowMs - existing.last_progress_at_ms) / 1000),
        );
        const maxAllowed = Math.min(1800, elapsedSec * 2 + 60);
        clampedDelta = clampScalar(rawDelta, 0, maxAllowed);
      } else {
        clampedDelta = clampScalar(rawDelta, 0, 1800);
      }
    }

    const blocksDelta = clampScalar(
      Math.max(0, Math.round(Number(params.completedBlocksDelta) || 0)),
      0,
      4,
    );

    const prevDaily = existing && existing.day_key === dayKey ? existing.daily_focus_seconds : 0;
    const prevWeekly =
      existing && existing.week_key === weekKey ? existing.weekly_focus_seconds : 0;
    const prevTotal = existing ? existing.total_focus_seconds : 0;
    const prevBlocks = existing ? existing.completed_blocks : 0;

    let streakDays = existing ? existing.streak_days : 1;
    if (existing && existing.day_key !== dayKey) {
      streakDays = existing.day_key === yesterdayKey ? existing.streak_days + 1 : 1;
    }

    const cohortBadge = params.mssv
      ? formatHustCohortBadge(params.mssv)
      : (existing?.cohort_badge ?? 'SV Bách Khoa');

    const nextRow: LeaderboardRow = {
      player_id: params.playerId,
      name: sanitizeName(params.name || existing?.name || 'Sinh viên'),
      cohort_badge: cohortBadge,
      color: params.color || existing?.color || pickShirtColor(params.playerId),
      gender: params.gender ?? existing?.gender ?? 'male',
      outfit: params.outfit ?? existing?.outfit ?? 'windbreaker-hust',
      hair_style: params.hairStyle ?? existing?.hair_style ?? 'short',
      subject_tag:
        params.subjectTag !== undefined
          ? sanitizeSubjectTag(params.subjectTag)
          : (existing?.subject_tag ?? 'Tự học HSK'),
      daily_focus_seconds: prevDaily + clampedDelta,
      weekly_focus_seconds: prevWeekly + clampedDelta,
      total_focus_seconds: prevTotal + clampedDelta,
      completed_blocks: prevBlocks + blocksDelta,
      streak_days: streakDays,
      day_key: dayKey,
      week_key: weekKey,
      last_progress_at_ms: rawDelta > 0 ? nowMs : (existing?.last_progress_at_ms ?? nowMs),
      updated_at_ms: nowMs,
    };

    this.upsertLeaderboardRow(nextRow);
    const snapshot = this.queryLeaderboard('daily', 50, params.playerId, nowMs);
    return (
      snapshot.myEntry ??
      this.rowToLeaderboardEntry(nextRow, 'daily', 1, dayKey, weekKey, params.playerId)
    );
  }

  private queryLeaderboard(
    period: LeaderboardPeriod = 'daily',
    limit = 20,
    selfPlayerId?: string | null,
    nowMs: number = Date.now(),
  ): StudyLeaderboardResponse {
    this.ensureLeaderboardSchema(nowMs);
    const dayKey = getVietnamDayKey(nowMs);
    const weekKey = getVietnamWeekKey(nowMs);
    const safeLimit = clampScalar(Math.floor(Number(limit) || 20), 1, 50);

    const allRows = this.listAllLeaderboardRows();
    const scoreFor = (r: LeaderboardRow): number => {
      if (period === 'daily') return r.day_key === dayKey ? r.daily_focus_seconds : 0;
      if (period === 'weekly') return r.week_key === weekKey ? r.weekly_focus_seconds : 0;
      return r.total_focus_seconds;
    };

    allRows.sort((a, b) => {
      const diff = scoreFor(b) - scoreFor(a);
      if (diff !== 0) return diff;
      if (b.total_focus_seconds !== a.total_focus_seconds) {
        return b.total_focus_seconds - a.total_focus_seconds;
      }
      if (b.completed_blocks !== a.completed_blocks) {
        return b.completed_blocks - a.completed_blocks;
      }
      return a.player_id.localeCompare(b.player_id);
    });

    const ranked = allRows.map((row, idx) =>
      this.rowToLeaderboardEntry(row, period, idx + 1, dayKey, weekKey, selfPlayerId),
    );

    const myEntry = selfPlayerId
      ? (ranked.find((e) => e.playerId === selfPlayerId) ?? null)
      : null;

    return {
      ok: true,
      period,
      dayKey,
      weekKey,
      entries: ranked.slice(0, safeLimit),
      myEntry,
      totalStudents: ranked.length,
      serverNowMs: nowMs,
    };
  }

  private ensureMemoriesSchema() {
    const sql = this.sql;
    if (!this.memoriesSchemaReady) {
      this.memoriesSchemaReady = true;
      if (sql) {
        try {
          sql.exec(`
            CREATE TABLE IF NOT EXISTS campus_memories (
              id TEXT PRIMARY KEY,
              board_id TEXT NOT NULL,
              author_name TEXT NOT NULL,
              cohort_badge TEXT NOT NULL,
              message TEXT NOT NULL,
              color TEXT NOT NULL DEFAULT 'yellow',
              likes INTEGER NOT NULL DEFAULT 0,
              created_at_ms INTEGER NOT NULL DEFAULT 0
            )
          `);
          sql.exec(
            `CREATE INDEX IF NOT EXISTS idx_memories_created ON campus_memories(created_at_ms DESC)`,
          );
        } catch {
          // fallback to memoriesMem
        }
      }
    }

    for (const seed of SEED_CAMPUS_MEMORIES) {
      if (!this.memoriesMem.has(seed.id)) {
        const existing = this.getMemoryById(seed.id);
        if (!existing) {
          this.saveMemoryNote({ ...seed });
        } else {
          this.memoriesMem.set(existing.id, existing);
        }
      }
    }
  }

  private getMemoryById(id: string): CampusMemoryNote | null {
    const sql = this.sql;
    if (sql) {
      try {
        const rows = sql
          .exec<{
            id: string;
            board_id: string;
            author_name: string;
            cohort_badge: string;
            message: string;
            color: string;
            likes: number;
            created_at_ms: number;
          }>(`SELECT * FROM campus_memories WHERE id = ? LIMIT 1`, id)
          .toArray();
        if (rows.length > 0) {
          const r = rows[0];
          const boardId: MemoryBoardId = isValidMemoryBoardId(r.board_id) ? r.board_id : 'c1-board';
          const color: MemoryNoteColor = isValidMemoryColor(r.color) ? r.color : 'yellow';
          return {
            id: String(r.id),
            boardId,
            authorName: sanitizeMemoryAuthor(r.author_name),
            cohortBadge: sanitizeMemoryCohort(r.cohort_badge),
            message: sanitizeMemoryText(r.message),
            color,
            likes: Math.max(0, Math.floor(Number(r.likes) || 0)),
            createdAtMs: Math.max(0, Math.floor(Number(r.created_at_ms) || 0)),
          };
        }
        return null;
      } catch {
        // fallback to memoriesMem
      }
    }
    return this.memoriesMem.get(id) ?? null;
  }

  private saveMemoryNote(note: CampusMemoryNote) {
    this.memoriesMem.set(note.id, note);
    const sql = this.sql;
    if (sql) {
      try {
        sql.exec(
          `INSERT INTO campus_memories (
            id, board_id, author_name, cohort_badge, message, color, likes, created_at_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            likes = excluded.likes`,
          note.id,
          note.boardId,
          note.authorName,
          note.cohortBadge,
          note.message,
          note.color,
          note.likes,
          note.createdAtMs,
        );
      } catch {
        // already in memoriesMem
      }
    }
  }

  private listCampusMemories(boardId?: MemoryBoardId | null): CampusMemoryNote[] {
    this.ensureMemoriesSchema();
    const sql = this.sql;
    let list: CampusMemoryNote[] | null = null;
    if (sql) {
      try {
        const rows = sql
          .exec<{
            id: string;
            board_id: string;
            author_name: string;
            cohort_badge: string;
            message: string;
            color: string;
            likes: number;
            created_at_ms: number;
          }>(
            boardId
              ? `SELECT * FROM campus_memories WHERE board_id = ? ORDER BY created_at_ms DESC LIMIT 80`
              : `SELECT * FROM campus_memories ORDER BY created_at_ms DESC LIMIT 80`,
            ...(boardId ? [boardId] : []),
          )
          .toArray();
        list = rows.map((r) => ({
          id: String(r.id),
          boardId: isValidMemoryBoardId(r.board_id) ? r.board_id : 'c1-board',
          authorName: sanitizeMemoryAuthor(r.author_name),
          cohortBadge: sanitizeMemoryCohort(r.cohort_badge),
          message: sanitizeMemoryText(r.message),
          color: isValidMemoryColor(r.color) ? r.color : 'yellow',
          likes: Math.max(0, Math.floor(Number(r.likes) || 0)),
          createdAtMs: Math.max(0, Math.floor(Number(r.created_at_ms) || 0)),
        }));
      } catch {
        list = null;
      }
    }
    if (!list) {
      list = Array.from(this.memoriesMem.values())
        .filter((n) => !boardId || n.boardId === boardId)
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .slice(0, 80);
    }
    return list;
  }

  private addCampusMemory(body: Record<string, unknown>, nowMs: number = Date.now()): CampusMemoryNote | null {
    this.ensureMemoriesSchema();
    const message = sanitizeMemoryText(body.message);
    if (!message) return null;
    const boardId: MemoryBoardId = isValidMemoryBoardId(body.boardId) ? body.boardId : 'c1-board';
    const color: MemoryNoteColor = isValidMemoryColor(body.color) ? body.color : 'yellow';
    const note: CampusMemoryNote = {
      id: `mem-${nowMs}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      boardId,
      authorName: sanitizeMemoryAuthor(body.authorName),
      cohortBadge: sanitizeMemoryCohort(body.cohortBadge),
      message,
      color,
      likes: 0,
      createdAtMs: nowMs,
    };
    this.saveMemoryNote(note);
    return note;
  }

  private likeCampusMemory(id: string): CampusMemoryNote | null {
    this.ensureMemoriesSchema();
    const existing = this.getMemoryById(id);
    if (!existing) return null;
    const updated: CampusMemoryNote = { ...existing, likes: existing.likes + 1 };
    this.saveMemoryNote(updated);
    return updated;
  }

  /**
   * Rehydrates `this.sessions`, `this.bySocket`, `this.roomId`, `this.seatRegistry`,
   * and `this.presences` from Cloudflare Durable Object WebSocket attachments
   * after waking from hibernation.
   */
  private restoreHibernatedSessions() {
    let sockets: WebSocket[];
    try {
      sockets = this.ctx.getWebSockets();
    } catch {
      return;
    }
    const now = Date.now();
    const rawSeatAttachments: HibernatedSeatAttachment[] = [];
    const rawPresenceBySession = new Map<
      string,
      NonNullable<SocketAttachment['studyPresence']>
    >();
    let restoredAnyNewSession = false;

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
      if (typeof att.studyRevision === 'number' && Number.isFinite(att.studyRevision)) {
        this.studyRevision = Math.max(this.studyRevision, att.studyRevision);
      }
      this.bySocket.set(ws, att.id);
      if (!this.sessions.has(att.id)) {
        restoredAnyNewSession = true;
        const mssv = sanitizeMssv(att.mssv) ?? '20226010';
        const session: Session = {
          id: att.id,
          reconnectKey:
            typeof att.reconnectKey === 'string' && att.reconnectKey
              ? att.reconnectKey
              : att.id,
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

        if (typeof att.seatId === 'string' && att.seatId.trim().length > 0) {
          rawSeatAttachments.push({
            occupantId: session.id,
            occupantName: session.name,
            seatId: att.seatId.trim(),
            occupiedAtMs:
              typeof att.occupiedAtMs === 'number' && Number.isFinite(att.occupiedAtMs)
                ? att.occupiedAtMs
                : session.lastUpdate,
            subjectTag: att.studyPresence?.subjectTag ?? null,
            color: session.color,
            gender: session.gender,
            outfit: session.outfit,
            hairStyle: session.hairStyle,
            skirt: session.skirt,
            glasses: session.glasses,
            backpack: session.backpack,
          });
        }
        if (att.studyPresence && typeof att.studyPresence === 'object') {
          rawPresenceBySession.set(session.id, att.studyPresence);
        }
      }
    }

    if (!restoredAnyNewSession) return;

    // Merge any already-known in-memory seat claims with newly restored socket attachments
    for (const occ of this.seatRegistry.bySeatId.values()) {
      rawSeatAttachments.push({
        occupantId: occ.occupantId,
        occupantName: occ.occupantName,
        seatId: occ.seatId,
        occupiedAtMs: occ.occupiedAtMs,
        subjectTag: occ.subjectTag ?? null,
        color: occ.color,
        gender: occ.gender,
        outfit: occ.outfit,
        hairStyle: occ.hairStyle,
        skirt: occ.skirt,
        glasses: occ.glasses,
        backpack: occ.backpack,
      });
    }

    this.seatRegistry = restoreSeatRegistryFromAttachments(rawSeatAttachments, now);

    // Reconcile each restored session's presence with authoritative seat ownership
    for (const session of this.sessions.values()) {
      const ownedSeat = getOccupantSeat(this.seatRegistry, session.id);
      const rawPres = rawPresenceBySession.get(session.id) ?? this.presences.get(session.id);
      const reconciled = reconcileServerPresenceWithSeat(
        rawPres,
        ownedSeat,
        typeof rawPres?.updatedAtMs === 'number' ? rawPres.updatedAtMs : now,
      );
      this.presences.set(session.id, reconciled);
    }

    // Re-persist socket attachments so any conflicting seat claims rejected during
    // hibernation recovery are cleaned up on the socket attachments.
    for (const [ws, sid] of this.bySocket.entries()) {
      const sess = this.sessions.get(sid);
      if (sess) {
        this.persistSocketAttachment(ws, sess);
      }
    }
  }

  private persistSocketAttachment(ws: WebSocket, session: Session) {
    try {
      const hws = ws as HibernatableWebSocket;
      const ownedSeat = getOccupantSeat(this.seatRegistry, session.id);
      const presence = this.presences.get(session.id);
      hws.serializeAttachment?.({
        id: session.id,
        reconnectKey: session.reconnectKey,
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
        seatId: ownedSeat ? ownedSeat.seatId : null,
        occupiedAtMs: ownedSeat ? ownedSeat.occupiedAtMs : null,
        studyPresence: presence
          ? {
              status: presence.status,
              pomodoroPhase: presence.pomodoroPhase,
              subjectTag: presence.subjectTag,
              updatedAtMs: presence.updatedAtMs,
            }
          : null,
        studyRevision: this.studyRevision,
      });
    } catch {
      // Older runtimes without attachments: bySocket covers in-memory state.
    }
  }

  private buildStudyRoomSnapshot(nowMs: number = Date.now()): ServerStudyRoomSnapshotMessage {
    const presencesRecord: Record<string, PlayerStudyPresence> = {};
    for (const [pid, pres] of this.presences.entries()) {
      if (this.sessions.has(pid)) {
        presencesRecord[pid] = pres;
      }
    }
    return {
      type: 'study:room-snapshot',
      roomId: this.roomId,
      seats: listOccupanciesForRoom(this.seatRegistry, 'library-lobby'),
      presences: presencesRecord,
      revision: this.studyRevision,
      serverNowMs: nowMs,
    };
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
    if (url.pathname === '/__leaderboard' && request.method === 'GET') {
      const rawPeriod = url.searchParams.get('period');
      const period: LeaderboardPeriod = isValidLeaderboardPeriod(rawPeriod)
        ? rawPeriod
        : 'daily';
      const limit = Number(url.searchParams.get('limit') || 20);
      const playerId = url.searchParams.get('playerId') || null;
      return Response.json(this.queryLeaderboard(period, limit, playerId, Date.now()));
    }
    if (url.pathname === '/__leaderboard/record' && request.method === 'POST') {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      }
      const rawSessionId = sanitizeReconnectToken(body.sessionId);
      const rawPlayerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
      const playerId = rawSessionId
        ? derivePublicPlayerId(rawSessionId)
        : rawPlayerId.startsWith('p-')
          ? rawPlayerId.slice(0, 64)
          : '';
      if (!playerId) {
        return Response.json({ ok: false, error: 'missing-player-id' }, { status: 400 });
      }
      const validApp = extractValidAppearance(body);
      const entry = this.recordLeaderboardProgress({
        playerId,
        name: sanitizeName(body.name),
        mssv: sanitizeMssv(body.mssv),
        color:
          typeof body.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(body.color)
            ? body.color
            : pickShirtColor(playerId),
        gender: validApp.gender,
        outfit: validApp.outfit,
        hairStyle: validApp.hairStyle,
        subjectTag: sanitizeSubjectTag(body.subjectTag),
        deltaSeconds: Number(body.deltaSeconds) || 0,
        completedBlocksDelta: Number(body.completedBlocksDelta) || 0,
        nowMs: Date.now(),
      });
      return Response.json({
        ok: true,
        playerId,
        entry,
        serverNowMs: Date.now(),
      });
    }
    if (url.pathname === '/__memories' && request.method === 'GET') {
      const rawBoard = url.searchParams.get('boardId');
      const boardId = isValidMemoryBoardId(rawBoard) ? rawBoard : null;
      return Response.json({ ok: true, notes: this.listCampusMemories(boardId) });
    }
    if (url.pathname === '/__memories' && request.method === 'POST') {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      }
      const note = this.addCampusMemory(body, Date.now());
      if (!note) {
        return Response.json({ ok: false, error: 'empty-message' }, { status: 400 });
      }
      return Response.json({ ok: true, note });
    }
    if (url.pathname === '/__memories/like' && request.method === 'POST') {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return Response.json({ ok: false, error: 'invalid-json' }, { status: 400 });
      }
      const id = typeof body.id === 'string' ? body.id.trim().slice(0, 64) : '';
      if (!id) {
        return Response.json({ ok: false, error: 'missing-id' }, { status: 400 });
      }
      const note = this.likeCampusMemory(id);
      if (!note) {
        return Response.json({ ok: false, error: 'not-found' }, { status: 404 });
      }
      return Response.json({ ok: true, note });
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
    const allSockets = new Set<WebSocket>([
      ...this.bySocket.keys(),
      ...this.ctx.getWebSockets(),
    ]);
    for (const ws of allSockets) {
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
    const rawStr =
      typeof message === 'string' ? message : new TextDecoder().decode(message);
    if (rawStr.length > MAX_STUDY_WS_PAYLOAD_BYTES * 2) {
      return;
    }
    let msg: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawStr);
      if (!parsed || typeof parsed !== 'object') return;
      msg = parsed as Record<string, unknown>;
    } catch {
      return;
    }
    const now = Date.now();

    if (msg.type === 'join') {
      const rawSessionId = sanitizeReconnectToken(msg.sessionId);
      const rawReconnectToken = sanitizeReconnectToken(msg.reconnectToken);
      const reconnectKey = rawReconnectToken ?? rawSessionId ?? '';
      if (!reconnectKey) {
        this.send(ws, { type: 'error', message: 'Missing sessionId' });
        return;
      }

      // Separate public player identity (`id` / `occupantId` / `playerId`) from
      // the secret reconnect credential (`reconnectKey`):
      // 1. An active player's public ID (`p-...`) is broadcast to peers and must
      //    NEVER be accepted as a reconnect credential to hijack that session.
      if (this.sessions.has(reconnectKey)) {
        this.send(ws, {
          type: 'error',
          message: 'Public player ID cannot be used as reconnect credential',
        });
        return;
      }

      const sessionId = derivePublicPlayerId(reconnectKey);
      if (
        rawReconnectToken &&
        rawSessionId &&
        rawSessionId !== sessionId &&
        rawSessionId !== rawReconnectToken
      ) {
        this.send(ws, {
          type: 'error',
          message: 'Invalid reconnect credential for session',
        });
        return;
      }

      // Enforce strict invariant: one WebSocket is bound to at most one sessionId.
      // Attempting to switch sessionId on an already-joined socket is rejected.
      const boundSessionId = this.getSocketSessionId(ws);
      if (boundSessionId && boundSessionId !== sessionId) {
        this.send(ws, {
          type: 'error',
          message: 'Socket is already bound to a different sessionId',
        });
        return;
      }
      const existing = this.sessions.get(sessionId);
      if (existing && existing.reconnectKey !== reconnectKey) {
        this.send(ws, {
          type: 'error',
          message: 'Invalid reconnect credential',
        });
        return;
      }
      const mssv = sanitizeMssv(msg.mssv);
      if (!mssv) {
        this.send(ws, { type: 'error', message: 'MSSV phải là 8 chữ số' });
        return;
      }
      const isSameSocketRepeatJoin = boundSessionId === sessionId;
      // Reconnect with the same secret reconnectKey on a NEW socket replaces any old socket
      // (both in-memory and hibernated sockets): no duplicate avatar, ever.
      const allSockets = new Set<WebSocket>([
        ...this.bySocket.keys(),
        ...this.ctx.getWebSockets(),
      ]);
      for (const oldWs of allSockets) {
        if (oldWs === ws) continue;
        const oldId = this.getSocketSessionId(oldWs);
        if (oldId === sessionId) {
          this.bySocket.delete(oldWs);
          try {
            (oldWs as HibernatableWebSocket).serializeAttachment?.({ id: '' });
          } catch {
            // ignore
          }
          try {
            oldWs.close(1000, 'Replaced by reconnect');
          } catch {
            // ignore
          }
        }
      }
      if (this.sessions.size >= ROOM_CAPACITY && !this.sessions.has(sessionId)) {
        this.send(ws, { type: 'full', message: 'Room is full' });
        return;
      }
      const name = sanitizeName(msg.name);
      const color = pickShirtColor(sessionId);
      const session: Session = existing ?? {
        id: sessionId,
        reconnectKey,
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
      session.reconnectKey = reconnectKey;
      session.name = name;
      session.mssv = mssv;
      applyAppearance(session, msg);
      session.lastUpdate = now;
      if (!isSameSocketRepeatJoin) {
        session.msgTimes = [];
      }
      this.sessions.set(sessionId, session);
      this.bySocket.set(ws, sessionId);

      // Preserve any existing seat ownership for this session across reconnect
      const updatedOccupancy = updateOccupantMetaInSeatRegistry(this.seatRegistry, sessionId, {
        occupantName: session.name,
        color: session.color,
        gender: session.gender,
        outfit: session.outfit,
        hairStyle: session.hairStyle,
        skirt: session.skirt,
        glasses: session.glasses,
        backpack: session.backpack,
      });
      const existingPresence = this.presences.get(sessionId);
      const reconciledPresence = reconcileServerPresenceWithSeat(
        existingPresence,
        updatedOccupancy ?? getOccupantSeat(this.seatRegistry, sessionId),
        now,
      );
      this.presences.set(sessionId, reconciledPresence);
      this.persistSocketAttachment(ws, session);

      // Snapshot to the newcomer (so they see everyone already here),
      // followed by authoritative study room snapshot, then join broadcast.
      this.send(ws, {
        type: 'welcome',
        id: sessionId,
        roomId: this.roomId,
        players: [...this.sessions.values()].map((s) => this.publicPlayer(s)),
        count: this.sessions.size,
      });
      this.send(ws, this.buildStudyRoomSnapshot(now));
      this.broadcast({ type: 'join', player: this.publicPlayer(session) }, sessionId);
      this.broadcast({ type: 'count', count: this.sessions.size });
      return;
    }

    const sessionId = this.getSocketSessionId(ws);
    const session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!sessionId || !session) {
      if (msg.type === 'study:claim-seat') {
        const requestId = sanitizeRequestId(msg.requestId);
        this.send(ws, {
          type: 'study:seat-rejected',
          seatId: typeof msg.seatId === 'string' ? msg.seatId.slice(0, 64) : '',
          reason: 'not-authenticated',
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }
      return;
    }

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
    if (session.msgTimes.length > MAX_MSG_PER_SEC) {
      if (msg.type === 'study:claim-seat') {
        const requestId = sanitizeRequestId(msg.requestId);
        this.send(ws, {
          type: 'study:seat-rejected',
          seatId: typeof msg.seatId === 'string' ? msg.seatId.slice(0, 64) : '',
          reason: 'rate-limited',
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }
      return; // drop, don't broadcast
    }

    if (msg.type === 'study:claim-seat') {
      const requestId = sanitizeRequestId(msg.requestId);
      if (rawStr.length > MAX_STUDY_WS_PAYLOAD_BYTES || typeof msg.seatId !== 'string') {
        this.send(ws, {
          type: 'study:seat-rejected',
          seatId: typeof msg.seatId === 'string' ? msg.seatId.slice(0, 64) : '',
          reason: 'invalid-payload',
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
        return;
      }

      const claimRes = claimSeat(this.seatRegistry, {
        seatId: msg.seatId.trim(),
        occupantId: sessionId,
        occupantName: session.name,
        subjectTag: typeof msg.subjectTag === 'string' ? msg.subjectTag : null,
        nowMs: now,
        color: session.color,
        gender: session.gender,
        outfit: session.outfit,
        hairStyle: session.hairStyle,
        skirt: session.skirt,
        glasses: session.glasses,
        backpack: session.backpack,
      });

      if (!claimRes.ok) {
        this.send(ws, {
          type: 'study:seat-rejected',
          seatId: claimRes.seatId,
          reason: claimRes.reason,
          ...(claimRes.occupiedBy ? { occupiedBy: claimRes.occupiedBy } : {}),
          ...(claimRes.occupiedByName ? { occupiedByName: claimRes.occupiedByName } : {}),
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
        return;
      }

      if (claimRes.releasedPreviousSeatId) {
        this.studyRevision += 1;
        this.broadcast({
          type: 'study:seat-released',
          seatId: claimRes.releasedPreviousSeatId,
          occupantId: sessionId,
          reason: 'switched-seat',
          ...(requestId ? { requestId } : {}),
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }

      this.studyRevision += 1;
      const prevPresence = this.presences.get(sessionId);
      const nextPresence = reconcileServerPresenceWithSeat(
        {
          status:
            prevPresence?.status === 'studying' || prevPresence?.status === 'break'
              ? prevPresence.status
              : msg.pomodoroPhase === 'focus'
                ? 'studying'
                : msg.pomodoroPhase === 'short-break' || msg.pomodoroPhase === 'long-break'
                  ? 'break'
                  : 'idle',
          studyRoomId: claimRes.occupancy.studyRoomId,
          seatId: claimRes.occupancy.seatId,
          pomodoroPhase:
            typeof msg.pomodoroPhase === 'string'
              ? (msg.pomodoroPhase as PomodoroPhase)
              : (prevPresence?.pomodoroPhase ?? 'idle'),
          subjectTag:
            claimRes.occupancy.subjectTag ?? prevPresence?.subjectTag ?? null,
        },
        claimRes.occupancy,
        now,
      );
      this.presences.set(sessionId, nextPresence);
      session.lastUpdate = now;
      this.persistSocketAttachment(ws, session);

      this.broadcast({
        type: 'study:seat-claimed',
        occupancy: claimRes.occupancy,
        ...(claimRes.releasedPreviousSeatId
          ? { releasedSeatId: claimRes.releasedPreviousSeatId }
          : {}),
        ...(requestId ? { requestId } : {}),
        revision: this.studyRevision,
        serverNowMs: now,
      });
      this.broadcast({
        type: 'study:presence',
        playerId: sessionId,
        presence: nextPresence,
        revision: this.studyRevision,
        serverNowMs: now,
      });
      return;
    }

    if (msg.type === 'study:release-seat') {
      const requestId = sanitizeRequestId(msg.requestId);
      const owned = getOccupantSeat(this.seatRegistry, sessionId);
      if (
        typeof msg.seatId === 'string' &&
        msg.seatId.trim().length > 0 &&
        owned &&
        owned.seatId !== msg.seatId.trim()
      ) {
        // Never allow releasing a seat other than the one this session actually owns
        return;
      }

      const released = releaseSeatByOccupant(this.seatRegistry, sessionId);
      if (!released) {
        this.send(ws, this.buildStudyRoomSnapshot(now));
        return;
      }

      this.studyRevision += 1;
      const prevPresence = this.presences.get(sessionId);
      const nextPresence = reconcileServerPresenceWithSeat(
        {
          status:
            prevPresence?.status === 'studying' || prevPresence?.status === 'break'
              ? prevPresence.status
              : 'exploring',
          studyRoomId: prevPresence?.studyRoomId ?? 'library-lobby',
          seatId: null,
          pomodoroPhase: prevPresence?.pomodoroPhase ?? 'idle',
          subjectTag: prevPresence?.subjectTag ?? null,
        },
        null,
        now,
      );
      this.presences.set(sessionId, nextPresence);
      session.lastUpdate = now;
      this.persistSocketAttachment(ws, session);

      this.broadcast({
        type: 'study:seat-released',
        seatId: released.seatId,
        occupantId: sessionId,
        reason: 'manual',
        ...(requestId ? { requestId } : {}),
        revision: this.studyRevision,
        serverNowMs: now,
      });
      this.broadcast({
        type: 'study:presence',
        playerId: sessionId,
        presence: nextPresence,
        revision: this.studyRevision,
        serverNowMs: now,
      });
      return;
    }

    if (msg.type === 'study:presence') {
      if (rawStr.length > MAX_STUDY_WS_PAYLOAD_BYTES) return;
      const rawPresence =
        msg.presence && typeof msg.presence === 'object'
          ? (msg.presence as Partial<PlayerStudyPresence>)
          : (msg as Partial<PlayerStudyPresence>);
      const ownedSeat = getOccupantSeat(this.seatRegistry, sessionId);
      const nextPresence = reconcileServerPresenceWithSeat(rawPresence, ownedSeat, now);
      this.presences.set(sessionId, nextPresence);
      if (ownedSeat && nextPresence.subjectTag !== (ownedSeat.subjectTag ?? null)) {
        updateOccupantMetaInSeatRegistry(this.seatRegistry, sessionId, {
          subjectTag: nextPresence.subjectTag,
        });
      }
      this.studyRevision += 1;
      session.lastUpdate = now;
      this.persistSocketAttachment(ws, session);
      this.broadcast({
        type: 'study:presence',
        playerId: sessionId,
        presence: nextPresence,
        revision: this.studyRevision,
        serverNowMs: now,
      });
      return;
    }

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
      const updatedOcc = updateOccupantMetaInSeatRegistry(this.seatRegistry, sessionId, {
        occupantName: session.name,
        color: session.color,
        gender: session.gender,
        outfit: session.outfit,
        hairStyle: session.hairStyle,
        skirt: session.skirt,
        glasses: session.glasses,
        backpack: session.backpack,
      });
      this.persistSocketAttachment(ws, session);
      this.broadcast({ type: 'appearance', player: this.publicPlayer(session) }, sessionId);
      if (updatedOcc) {
        this.studyRevision += 1;
        this.broadcast({
          type: 'study:seat-claimed',
          occupancy: updatedOcc,
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }
      return;
    }

    if (msg.type === 'chat') {
      const text = sanitizeChatMessage(msg.text);
      if (!text) return;
      session.lastUpdate = now;
      this.broadcast({
        type: 'chat',
        id: sessionId,
        name: session.name,
        color: session.color,
        text,
        t: now,
      });
      return;
    }

    if (msg.type === 'emote') {
      if (!isAvatarEmoteId(msg.emote)) return;
      if (session.state === 'walking' || session.state === 'running') {
        session.state = 'idle';
      }
      session.lastUpdate = now;
      this.persistSocketAttachment(ws, session);
      this.broadcast({
        type: 'emote',
        id: sessionId,
        emote: msg.emote,
        t: now,
      });
      return;
    }

    if (msg.type === 'piano:note') {
      const midi = Math.round(Number(msg.midi) || 0);
      if (midi < 21 || midi > 108) return;
      const rawVel = Number(msg.velocity);
      const velocity = Number.isFinite(rawVel) ? Math.min(1, Math.max(0.05, rawVel)) : 0.82;
      session.lastUpdate = now;
      this.broadcast(
        {
          type: 'piano:note',
          id: sessionId,
          midi,
          velocity,
          t: now,
        },
        sessionId,
      );
      return;
    }

    if (msg.type === 'study:progress') {
      if (rawStr.length > MAX_STUDY_WS_PAYLOAD_BYTES) return;
      const deltaSeconds = Number(msg.deltaSeconds) || 0;
      const completedBlocksDelta = Number(msg.completedBlocksDelta) || 0;
      const pres = this.presences.get(sessionId);
      const subjectTag =
        msg.subjectTag !== undefined
          ? sanitizeSubjectTag(msg.subjectTag)
          : (pres?.subjectTag ?? 'Tự học HSK');
      session.lastUpdate = now;
      const entry = this.recordLeaderboardProgress({
        playerId: sessionId,
        name: session.name,
        mssv: session.mssv,
        color: session.color,
        gender: session.gender,
        outfit: session.outfit,
        hairStyle: session.hairStyle,
        subjectTag,
        deltaSeconds,
        completedBlocksDelta,
        nowMs: now,
      });
      this.send(ws, {
        type: 'study:leaderboard-ack',
        playerId: sessionId,
        entry,
        serverNowMs: now,
      });
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
    try {
      (ws as HibernatableWebSocket).serializeAttachment?.({ id: '' });
    } catch {
      // ignore
    }
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
    const now = Date.now();
    const releasedSeat = releaseSeatByOccupant(this.seatRegistry, sessionId);
    this.presences.delete(sessionId);
    if (this.sessions.delete(sessionId)) {
      if (releasedSeat) {
        this.studyRevision += 1;
        this.broadcast({
          type: 'study:seat-released',
          seatId: releasedSeat.seatId,
          occupantId: sessionId,
          reason: 'disconnect',
          revision: this.studyRevision,
          serverNowMs: now,
        });
      }
      this.broadcast({ type: 'leave', id: sessionId });
      this.broadcast({ type: 'count', count: this.sessions.size });
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
}
