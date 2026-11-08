// ---------------------------------------------------------------------------
// shared/contracts/study.ts — Shared contracts, authoritative constants, and
// pure validators for HUST Virtual Study Campus (Study Rooms, Seat Occupancy,
// Study Session, Wall-Clock Pomodoro Timer, Focus Mode, and Player Presence).
//
// ARCHITECTURAL RULE: Zero React, Three.js, or browser DOM dependencies.
// Must compile cleanly in both Frontend (tsconfig.json) and Cloudflare Worker
// (worker/tsconfig.json).
// ---------------------------------------------------------------------------

import { clampScalar } from '../constants/world';
import {
  extractValidAppearance,
  sanitizeName,
  type AvatarGender,
  type AvatarHairStyle,
  type AvatarOutfitId,
} from './multiplayer';

// ---------------------------------------------------------------------------
// 1. Study Room Zones & Catalog (`feature.social.study-rooms`)
// ---------------------------------------------------------------------------

export type StudyRoomZoneId =
  | 'library-lobby'
  | 'library-reading-3f'
  | 'c1-classroom-101'
  | 'tien-lake-pavilion';

export const VALID_STUDY_ROOM_ZONES: readonly StudyRoomZoneId[] = [
  'library-lobby',
  'library-reading-3f',
  'c1-classroom-101',
  'tien-lake-pavilion',
] as const;

const STUDY_ROOM_ZONE_SET = new Set<string>(VALID_STUDY_ROOM_ZONES);

export interface StudyRoomDefinition {
  id: StudyRoomZoneId;
  name: string;
  buildingCode: 'TV-TQB' | 'C1' | 'HO-TIEN';
  capacity: number;
  quietLevel: 'silent' | 'whisper' | 'collaborative';
  description: string;
}

export const STUDY_ROOMS: readonly StudyRoomDefinition[] = [
  {
    id: 'library-lobby',
    name: 'Sảnh Tầng 1 — Thư viện Tạ Quang Bửu',
    buildingCode: 'TV-TQB',
    capacity: 12,
    quietLevel: 'whisper',
    description: 'Khu bàn đọc mở cạnh Tượng GS. Tạ Quang Bửu và bảng từ vựng Hán ngữ.',
  },
  {
    id: 'library-reading-3f',
    name: 'Phòng đọc Tự học Tầng 3 — Thư viện Tạ Quang Bửu',
    buildingCode: 'TV-TQB',
    capacity: 24,
    quietLevel: 'silent',
    description: 'Không gian tự học yên tĩnh tuyệt đối theo nhịp Pomodoro chuẩn Bách khoa.',
  },
  {
    id: 'c1-classroom-101',
    name: 'Phòng học C1-101 — Tòa nhà C1',
    buildingCode: 'C1',
    capacity: 16,
    quietLevel: 'collaborative',
    description: 'Phòng học mô phỏng nhà C1 dành cho ôn tập HSK và thảo luận nhóm.',
  },
  {
    id: 'tien-lake-pavilion',
    name: 'Bàn đá ven Hồ Tiền (C9 – Cầu thang đỏ)',
    buildingCode: 'HO-TIEN',
    capacity: 8,
    quietLevel: 'collaborative',
    description: 'Không gian ôn bài thoáng đãng dưới hàng liễu rủ ven Hồ Tiền.',
  },
] as const;

export function isValidStudyRoomZone(value: unknown): value is StudyRoomZoneId {
  return typeof value === 'string' && STUDY_ROOM_ZONE_SET.has(value);
}

/**
 * PR9 physical scope: Networked seat occupancy is supported ONLY in the
 * implemented 3D first-floor Library Lobby (`library-lobby`).
 */
export const PR9_SUPPORTED_STUDY_ROOM_ZONES: readonly StudyRoomZoneId[] = [
  'library-lobby',
] as const;

const PR9_SUPPORTED_ZONE_SET = new Set<string>(PR9_SUPPORTED_STUDY_ROOM_ZONES);

export function isSupportedStudyRoomZone(value: unknown): value is 'library-lobby' {
  return typeof value === 'string' && PR9_SUPPORTED_ZONE_SET.has(value);
}

export function getStudyRoomDefinition(zoneId: StudyRoomZoneId): StudyRoomDefinition | undefined {
  return STUDY_ROOMS.find((r) => r.id === zoneId);
}

// ---------------------------------------------------------------------------
// 2. Seat Catalog & Authoritative Seat Occupancy (`feature.social.study-rooms`)
// ---------------------------------------------------------------------------

export interface StudySeatDefinition {
  seatId: string;
  studyRoomId: StudyRoomZoneId;
  tableId: string;
  label: string;
  x: number;
  y: number;
  z: number;
  facing: number;
}

/**
 * Authoritative public seat occupancy record broadcast within a multiplayer
 * room instance.
 *
 * PRIVACY INVARIANT (PR9): Never includes `occupantMssv`, personal tasks,
 * HSK progress, or full Pomodoro history. Includes only non-sensitive public
 * display name and optional avatar appearance so remote seated students can
 * be rendered accurately in 3D.
 */
export interface SeatOccupancy {
  seatId: string;
  studyRoomId: StudyRoomZoneId;
  occupantId: string;
  occupantName: string;
  occupiedAtMs: number;
  subjectTag?: string;
  color?: string;
  gender?: AvatarGender;
  outfit?: AvatarOutfitId;
  hairStyle?: AvatarHairStyle;
  skirt?: boolean;
  glasses?: boolean;
  backpack?: boolean;
}

/**
 * Canonical seat catalog across HUST Virtual Study Campus interiors and outdoor
 * study tables. Coordinates match the local coordinate frames of LibraryLobby,
 * Classroom C1, and TienLake benches.
 */
export const STUDY_SEATS: readonly StudySeatDefinition[] = [
  // Library Lobby 1F reading tables (verified against LIBRARY_LOBBY bounds, columns & fixtures)
  {
    seatId: 'tqb-1f-t1-s1',
    studyRoomId: 'library-lobby',
    tableId: 'tqb-1f-t1',
    label: 'Bàn đọc Tây 1 · Ghế A',
    x: -2.4,
    y: 0,
    z: 1.2,
    facing: 0,
  },
  {
    seatId: 'tqb-1f-t1-s2',
    studyRoomId: 'library-lobby',
    tableId: 'tqb-1f-t1',
    label: 'Bàn đọc Tây 1 · Ghế B',
    x: -1.9,
    y: 0,
    z: 2.3,
    facing: Math.PI,
  },
  {
    seatId: 'tqb-1f-t2-s1',
    studyRoomId: 'library-lobby',
    tableId: 'tqb-1f-t2',
    label: 'Bàn đọc Đông 2 · Ghế A',
    x: 1.9,
    y: 0,
    z: 1.2,
    facing: 0,
  },
  {
    seatId: 'tqb-1f-t2-s2',
    studyRoomId: 'library-lobby',
    tableId: 'tqb-1f-t2',
    label: 'Bàn đọc Đông 2 · Ghế B',
    x: 2.4,
    y: 0,
    z: 2.3,
    facing: Math.PI,
  },
  // Library 3F Silent Reading Room
  {
    seatId: 'tqb-3f-t1-s1',
    studyRoomId: 'library-reading-3f',
    tableId: 'tqb-3f-t1',
    label: 'Bàn Tự học 301 · Ghế 1',
    x: -3.0,
    y: 0,
    z: -2.0,
    facing: 0,
  },
  {
    seatId: 'tqb-3f-t1-s2',
    studyRoomId: 'library-reading-3f',
    tableId: 'tqb-3f-t1',
    label: 'Bàn Tự học 301 · Ghế 2',
    x: -1.5,
    y: 0,
    z: -2.0,
    facing: 0,
  },
  {
    seatId: 'tqb-3f-t2-s1',
    studyRoomId: 'library-reading-3f',
    tableId: 'tqb-3f-t2',
    label: 'Bàn Tự học 302 · Ghế 1',
    x: 1.5,
    y: 0,
    z: -2.0,
    facing: Math.PI,
  },
  {
    seatId: 'tqb-3f-t2-s2',
    studyRoomId: 'library-reading-3f',
    tableId: 'tqb-3f-t2',
    label: 'Bàn Tự học 302 · Ghế 2',
    x: 3.0,
    y: 0,
    z: -2.0,
    facing: Math.PI,
  },
  // Classroom C1-101 desks
  {
    seatId: 'c1-101-d1-s1',
    studyRoomId: 'c1-classroom-101',
    tableId: 'c1-101-d1',
    label: 'Bàn 1 Dãy trái · Ghế A',
    x: -2.2,
    y: 0,
    z: -0.2,
    facing: 0,
  },
  {
    seatId: 'c1-101-d1-s2',
    studyRoomId: 'c1-classroom-101',
    tableId: 'c1-101-d1',
    label: 'Bàn 1 Dãy trái · Ghế B',
    x: -1.2,
    y: 0,
    z: -0.2,
    facing: 0,
  },
  {
    seatId: 'c1-101-d2-s1',
    studyRoomId: 'c1-classroom-101',
    tableId: 'c1-101-d2',
    label: 'Bàn 1 Dãy phải · Ghế A',
    x: 1.2,
    y: 0,
    z: -0.2,
    facing: 0,
  },
  {
    seatId: 'c1-101-d2-s2',
    studyRoomId: 'c1-classroom-101',
    tableId: 'c1-101-d2',
    label: 'Bàn 1 Dãy phải · Ghế B',
    x: 2.2,
    y: 0,
    z: -0.2,
    facing: 0,
  },
  // Tien Lake outdoor benches
  {
    seatId: 'lake-bench-w1',
    studyRoomId: 'tien-lake-pavilion',
    tableId: 'lake-bench-west',
    label: 'Ghế đá bờ Tây Hồ Tiền · Số 1',
    x: -36.5,
    y: 0,
    z: 32.0,
    facing: Math.PI / 2,
  },
  {
    seatId: 'lake-bench-n1',
    studyRoomId: 'tien-lake-pavilion',
    tableId: 'lake-bench-north',
    label: 'Ghế đá bờ Bắc Hồ Tiền · Số 1',
    x: -12.0,
    y: 0,
    z: 6.5,
    facing: Math.PI,
  },
] as const;

const SEAT_BY_ID = new Map<string, StudySeatDefinition>(
  STUDY_SEATS.map((s) => [s.seatId, s]),
);

export function getSeatDefinition(seatId: string): StudySeatDefinition | undefined {
  return SEAT_BY_ID.get(seatId);
}

export function getSeatsForStudyRoom(studyRoomId: StudyRoomZoneId): StudySeatDefinition[] {
  return STUDY_SEATS.filter((s) => s.studyRoomId === studyRoomId);
}

export function isValidSeatId(seatId: unknown): seatId is string {
  return typeof seatId === 'string' && SEAT_BY_ID.has(seatId);
}

/**
 * Checks whether a seatId is both in the canonical catalog AND inside a
 * PR9-supported 3D study room zone (`library-lobby`).
 */
export function isSupportedLibrarySeatId(seatId: unknown): seatId is string {
  if (!isValidSeatId(seatId)) return false;
  const def = SEAT_BY_ID.get(seatId);
  return !!def && isSupportedStudyRoomZone(def.studyRoomId);
}

// ---------------------------------------------------------------------------
// 3. Wall-Clock Pomodoro Timer Contract (`feature.study.pomodoro`)
// ---------------------------------------------------------------------------

export type PomodoroPhase = 'idle' | 'focus' | 'short-break' | 'long-break';

export const VALID_POMODORO_PHASES: readonly PomodoroPhase[] = [
  'idle',
  'focus',
  'short-break',
  'long-break',
] as const;

const POMODORO_PHASE_SET = new Set<string>(VALID_POMODORO_PHASES);

export interface PomodoroConfig {
  /** Focus phase duration in milliseconds (default 25 minutes). */
  focusDurationMs: number;
  /** Short break duration in milliseconds (default 5 minutes). */
  shortBreakDurationMs: number;
  /** Long break duration in milliseconds (default 15 minutes). */
  longBreakDurationMs: number;
  /** Number of completed focus blocks before a long break (default 4). */
  cyclesBeforeLongBreak: number;
}

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusDurationMs: 25 * 60 * 1000,
  shortBreakDurationMs: 5 * 60 * 1000,
  longBreakDurationMs: 15 * 60 * 1000,
  cyclesBeforeLongBreak: 4,
};

export const MIN_POMODORO_PHASE_MS = 60 * 1000; // 1 minute minimum
export const MAX_POMODORO_PHASE_MS = 120 * 60 * 1000; // 120 minutes maximum

export function sanitizePomodoroConfig(raw?: Partial<PomodoroConfig> | null): PomodoroConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_POMODORO_CONFIG };
  const focusDurationMs = Number.isFinite(raw.focusDurationMs)
    ? clampScalar(Math.round(raw.focusDurationMs as number), MIN_POMODORO_PHASE_MS, MAX_POMODORO_PHASE_MS)
    : DEFAULT_POMODORO_CONFIG.focusDurationMs;
  const shortBreakDurationMs = Number.isFinite(raw.shortBreakDurationMs)
    ? clampScalar(Math.round(raw.shortBreakDurationMs as number), MIN_POMODORO_PHASE_MS, MAX_POMODORO_PHASE_MS)
    : DEFAULT_POMODORO_CONFIG.shortBreakDurationMs;
  const longBreakDurationMs = Number.isFinite(raw.longBreakDurationMs)
    ? clampScalar(Math.round(raw.longBreakDurationMs as number), MIN_POMODORO_PHASE_MS, MAX_POMODORO_PHASE_MS)
    : DEFAULT_POMODORO_CONFIG.longBreakDurationMs;
  const cyclesBeforeLongBreak = Number.isFinite(raw.cyclesBeforeLongBreak)
    ? clampScalar(Math.round(raw.cyclesBeforeLongBreak as number), 1, 12)
    : DEFAULT_POMODORO_CONFIG.cyclesBeforeLongBreak;

  return {
    focusDurationMs,
    shortBreakDurationMs,
    longBreakDurationMs,
    cyclesBeforeLongBreak,
  };
}

export function isValidPomodoroPhase(value: unknown): value is PomodoroPhase {
  return typeof value === 'string' && POMODORO_PHASE_SET.has(value);
}

// ---------------------------------------------------------------------------
// 4. Player Study Presence Contract (`feature.social.presence`)
// ---------------------------------------------------------------------------

export type PlayerPresenceStatus = 'exploring' | 'studying' | 'break' | 'idle';

export const VALID_PRESENCE_STATUSES: readonly PlayerPresenceStatus[] = [
  'exploring',
  'studying',
  'break',
  'idle',
] as const;

const PRESENCE_STATUS_SET = new Set<string>(VALID_PRESENCE_STATUSES);

export const MAX_SUBJECT_TAG_LEN = 36;

export interface PlayerStudyPresence {
  status: PlayerPresenceStatus;
  studyRoomId: StudyRoomZoneId | null;
  seatId: string | null;
  pomodoroPhase: PomodoroPhase;
  /** Optional subject tag shown on desk/nameplate, e.g. "HSK 4 · Bài 5" or "Giải tích 1". */
  subjectTag: string | null;
  updatedAtMs: number;
}

export function sanitizeSubjectTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = Array.from(raw)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, MAX_SUBJECT_TAG_LEN);
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeStudyPresence(
  raw: Partial<PlayerStudyPresence> | null | undefined,
  nowMs: number = Date.now(),
): PlayerStudyPresence {
  const status: PlayerPresenceStatus =
    raw && typeof raw.status === 'string' && PRESENCE_STATUS_SET.has(raw.status)
      ? (raw.status as PlayerPresenceStatus)
      : 'exploring';

  const seatDef = raw?.seatId && isValidSeatId(raw.seatId) ? getSeatDefinition(raw.seatId) : undefined;
  const studyRoomId: StudyRoomZoneId | null = seatDef
    ? seatDef.studyRoomId
    : isValidStudyRoomZone(raw?.studyRoomId)
      ? raw.studyRoomId
      : null;

  const pomodoroPhase: PomodoroPhase = isValidPomodoroPhase(raw?.pomodoroPhase)
    ? raw.pomodoroPhase
    : status === 'studying'
      ? 'focus'
      : status === 'break'
        ? 'short-break'
        : 'idle';

  return {
    status,
    studyRoomId,
    seatId: seatDef ? seatDef.seatId : null,
    pomodoroPhase,
    subjectTag: sanitizeSubjectTag(raw?.subjectTag),
    updatedAtMs: Number.isFinite(raw?.updatedAtMs) ? (raw!.updatedAtMs as number) : nowMs,
  };
}

// ---------------------------------------------------------------------------
// 5. Wire Protocol Extensions for Study Rooms & Seat Occupancy
// ---------------------------------------------------------------------------

export const MAX_STUDY_WS_PAYLOAD_BYTES = 2048;

export function sanitizeRequestId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.trim().slice(0, 64);
  if (!cleaned || !/^[A-Za-z0-9._:-]+$/.test(cleaned)) return undefined;
  return cleaned;
}

export function sanitizeSeatOccupancy(raw: unknown): SeatOccupancy | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!isSupportedLibrarySeatId(obj.seatId)) return null;
  const seatDef = getSeatDefinition(obj.seatId);
  if (!seatDef) return null;
  if (typeof obj.occupantId !== 'string' || !obj.occupantId.trim()) return null;
  const occupantId = obj.occupantId.trim().slice(0, 64);
  const occupantName = sanitizeName(obj.occupantName);
  const occupiedAtMs = Number.isFinite(obj.occupiedAtMs)
    ? (obj.occupiedAtMs as number)
    : Date.now();
  const subjectTag = sanitizeSubjectTag(obj.subjectTag) ?? undefined;
  const appearance = extractValidAppearance(obj);
  const color =
    typeof obj.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(obj.color)
      ? obj.color
      : undefined;

  return {
    seatId: seatDef.seatId,
    studyRoomId: seatDef.studyRoomId,
    occupantId,
    occupantName,
    occupiedAtMs,
    ...(subjectTag !== undefined ? { subjectTag } : {}),
    ...(color !== undefined ? { color } : {}),
    ...appearance,
  };
}

export type SeatClaimRejectionReason =
  | 'invalid-seat'
  | 'unsupported-zone'
  | 'already-occupied'
  | 'not-authenticated'
  | 'rate-limited'
  | 'invalid-payload';

export interface ClientClaimSeatMessage {
  type: 'study:claim-seat';
  seatId: string;
  subjectTag?: string | null;
  pomodoroPhase?: PomodoroPhase;
  requestId?: string;
}

export interface ClientReleaseSeatMessage {
  type: 'study:release-seat';
  seatId?: string | null;
  requestId?: string;
}

export interface ClientPresenceMessage {
  type: 'study:presence';
  presence?: Partial<PlayerStudyPresence>;
  status?: PlayerPresenceStatus;
  studyRoomId?: StudyRoomZoneId | null;
  seatId?: string | null;
  pomodoroPhase?: PomodoroPhase;
  subjectTag?: string | null;
  requestId?: string;
}

export type StudyClientToServerMessage =
  | ClientClaimSeatMessage
  | ClientReleaseSeatMessage
  | ClientPresenceMessage;

export interface ServerSeatClaimedMessage {
  type: 'study:seat-claimed';
  occupancy: SeatOccupancy;
  releasedSeatId?: string | null;
  requestId?: string;
  revision?: number;
  serverNowMs?: number;
}

export interface ServerSeatReleasedMessage {
  type: 'study:seat-released';
  seatId: string;
  occupantId: string;
  reason?: 'manual' | 'switched-seat' | 'disconnect';
  requestId?: string;
  revision?: number;
  serverNowMs?: number;
}

export interface ServerSeatRejectedMessage {
  type: 'study:seat-rejected';
  seatId: string;
  reason: SeatClaimRejectionReason;
  occupiedBy?: string;
  occupiedByName?: string;
  requestId?: string;
  revision?: number;
  serverNowMs?: number;
}

export interface ServerPresenceBroadcastMessage {
  type: 'study:presence';
  playerId: string;
  presence: PlayerStudyPresence;
  revision?: number;
  serverNowMs?: number;
}

export interface ServerStudyRoomSnapshotMessage {
  type: 'study:room-snapshot';
  roomId?: string;
  seats: SeatOccupancy[];
  presences: Record<string, PlayerStudyPresence>;
  revision?: number;
  serverNowMs?: number;
}

export type StudyServerToClientMessage =
  | ServerSeatClaimedMessage
  | ServerSeatReleasedMessage
  | ServerSeatRejectedMessage
  | ServerPresenceBroadcastMessage
  | ServerStudyRoomSnapshotMessage;
