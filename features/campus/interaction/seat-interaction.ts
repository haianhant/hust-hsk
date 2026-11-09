// ---------------------------------------------------------------------------
// features/campus/interaction/seat-interaction.ts — Local seat interaction
// state machine, proximity validator, and collision-safe stand-up resolver
// for the Ta Quang Buu Library 1F Lobby (`feature.campus.interaction`).
//
// ARCHITECTURAL BOUNDARY (PR8):
// - Local interactive seating only. All 4 library lobby seats are locally
//   selectable when within proximity.
// - Does NOT claim global multiplayer seat reservation or fabricate remote
//   occupancy (deferred to PR9).
// ---------------------------------------------------------------------------

import {
  getSeatDefinition,
  getSeatsForStudyRoom,
  isValidSeatId,
  type StudyRoomZoneId,
  type StudySeatDefinition,
} from '../../../shared/contracts/study';
import { playerInput, playerState } from '../../../lib/playerState';
import type { StudySessionState } from '../../study/study-session/session';
import {
  AVATAR,
  LIBRARY_LOBBY,
  resolveLibraryLobbyCollisions,
  type Vec2,
} from '../world-data';

/** Proximity threshold (m) for sitting in a Library Lobby chair via E or click/tap. */
export const SEAT_INTERACT_RADIUS = 1.65;

/** Step-back offset (m) behind the chair when standing up so the avatar clears the chair collider. */
export const SEAT_STAND_OFFSET = 0.66;

export type LocalSeatingStatus = 'standing' | 'seated';

export type SeatSelectionRejectionReason =
  | 'invalid-seat'
  | 'wrong-room'
  | 'riding-bike'
  | 'ui-locked'
  | 'transition-locked'
  | 'already-seated-same'
  | 'already-seated-other'
  | 'too-far';

export interface LocalSeatingState {
  status: LocalSeatingStatus;
  studyRoomId: StudyRoomZoneId | null;
  seatId: string | null;
  seatLabel: string | null;
  tableId: string | null;
  anchorPos: Vec2 | null;
  facing: number | null;
  standUpPos: Vec2 | null;
  transitionLock: boolean;
}

export function createInitialSeatingState(): LocalSeatingState {
  return {
    status: 'standing',
    studyRoomId: null,
    seatId: null,
    seatLabel: null,
    tableId: null,
    anchorPos: null,
    facing: null,
    standUpPos: null,
    transitionLock: false,
  };
}

export function getLibraryLobbySeats(): StudySeatDefinition[] {
  return getSeatsForStudyRoom('library-lobby');
}

export function isLibraryLobbySeatId(seatId: unknown): seatId is string {
  if (!isValidSeatId(seatId)) return false;
  const def = getSeatDefinition(seatId);
  return def?.studyRoomId === 'library-lobby';
}

export function findNearestLibrarySeat(
  pos: Vec2,
  maxRadius: number = SEAT_INTERACT_RADIUS,
): { seat: StudySeatDefinition; distance: number } | null {
  const seats = getLibraryLobbySeats();
  let bestSeat: StudySeatDefinition | null = null;
  let bestDist = Infinity;

  for (const seat of seats) {
    const d = Math.hypot(pos.x - seat.x, pos.z - seat.z);
    if (d <= maxRadius && d < bestDist) {
      bestDist = d;
      bestSeat = seat;
    }
  }

  return bestSeat ? { seat: bestSeat, distance: bestDist } : null;
}

/**
 * Computes a collision-safe standing position near `seat` in `LibraryLobby`
 * verified against `LIBRARY_LOBBY_COLLIDERS` with `AVATAR.radius` (0.4m).
 */
export function computeSafeStandUpPosition(
  seat: StudySeatDefinition,
  fallbackOrigin?: Vec2,
): Vec2 {
  const fwdX = Math.sin(seat.facing);
  const fwdZ = Math.cos(seat.facing);
  const rightX = Math.cos(seat.facing);
  const rightZ = -Math.sin(seat.facing);

  const candidates: Vec2[] = [
    // 1. Directly behind the chair backrest
    {
      x: +(seat.x - fwdX * SEAT_STAND_OFFSET).toFixed(3),
      z: +(seat.z - fwdZ * SEAT_STAND_OFFSET).toFixed(3),
    },
    // 2. Slightly further behind the chair
    {
      x: +(seat.x - fwdX * (SEAT_STAND_OFFSET + 0.14)).toFixed(3),
      z: +(seat.z - fwdZ * (SEAT_STAND_OFFSET + 0.14)).toFixed(3),
    },
    // 3. Back-left / Back-right of the chair
    {
      x: +(seat.x - fwdX * SEAT_STAND_OFFSET - rightX * 0.45).toFixed(3),
      z: +(seat.z - fwdZ * SEAT_STAND_OFFSET - rightZ * 0.45).toFixed(3),
    },
    {
      x: +(seat.x - fwdX * SEAT_STAND_OFFSET + rightX * 0.45).toFixed(3),
      z: +(seat.z - fwdZ * SEAT_STAND_OFFSET + rightZ * 0.45).toFixed(3),
    },
  ];

  if (fallbackOrigin) {
    candidates.push({ x: fallbackOrigin.x, z: fallbackOrigin.z });
  }

  for (const cand of candidates) {
    const resolved = resolveLibraryLobbyCollisions(cand, AVATAR.radius);
    if (
      resolved.hit === null &&
      Math.hypot(resolved.pos.x - cand.x, resolved.pos.z - cand.z) < 0.01
    ) {
      return resolved.pos;
    }
  }

  return resolveLibraryLobbyCollisions({ ...LIBRARY_LOBBY.spawn }, AVATAR.radius).pos;
}

export interface ValidateSeatSelectionInput {
  seatId: unknown;
  playerPos: Vec2;
  inLibraryLobby: boolean;
  inClassroom: boolean;
  bikeRiding: boolean;
  uiLocked?: boolean;
  currentSeating: LocalSeatingState;
  maxRadius?: number;
}

export type ValidateSeatSelectionResult =
  | {
      ok: true;
      seat: StudySeatDefinition;
      standUpPos: Vec2;
      distance: number;
    }
  | {
      ok: false;
      reason: SeatSelectionRejectionReason;
      message: string;
    };

export function validateSeatSelection(
  input: ValidateSeatSelectionInput,
): ValidateSeatSelectionResult {
  const {
    seatId,
    playerPos,
    inLibraryLobby,
    inClassroom,
    bikeRiding,
    uiLocked = false,
    currentSeating,
    maxRadius = SEAT_INTERACT_RADIUS,
  } = input;

  if (!isLibraryLobbySeatId(seatId)) {
    return {
      ok: false,
      reason: 'invalid-seat',
      message: 'Ghế học không hợp lệ.',
    };
  }

  if (!inLibraryLobby || inClassroom) {
    return {
      ok: false,
      reason: 'wrong-room',
      message: 'Bạn cần ở trong Sảnh tầng 1 Thư viện Tạ Quang Bửu để ngồi ghế này.',
    };
  }

  if (bikeRiding) {
    return {
      ok: false,
      reason: 'riding-bike',
      message: 'Không thể ngồi học khi đang lái xe máy.',
    };
  }

  if (uiLocked) {
    return {
      ok: false,
      reason: 'ui-locked',
      message: 'Hãy đóng bảng hiện tại trước khi chọn ghế học.',
    };
  }

  if (currentSeating.transitionLock) {
    return {
      ok: false,
      reason: 'transition-locked',
      message: 'Đang chuyển tư thế — vui lòng đợi một chút.',
    };
  }

  const seat = getSeatDefinition(seatId)!;

  if (currentSeating.status === 'seated') {
    if (currentSeating.seatId === seat.seatId) {
      return {
        ok: false,
        reason: 'already-seated-same',
        message: `Bạn đang ngồi tại ${seat.label} rồi.`,
      };
    }
    return {
      ok: false,
      reason: 'already-seated-other',
      message: 'Bạn đang ngồi học — hãy bấm "Đứng dậy" trước khi chuyển sang ghế khác.',
    };
  }

  const distance = Math.hypot(playerPos.x - seat.x, playerPos.z - seat.z);
  if (distance > maxRadius) {
    return {
      ok: false,
      reason: 'too-far',
      message: 'Hãy lại gần ghế đọc sách hơn để ngồi học (phím E hoặc bấm vào ghế).',
    };
  }

  const standUpPos = computeSafeStandUpPosition(seat, playerPos);

  return {
    ok: true,
    seat,
    standUpPos,
    distance,
  };
}

export interface SitTransitionResult {
  ok: boolean;
  state: LocalSeatingState;
  seat?: StudySeatDefinition;
  reason?: SeatSelectionRejectionReason;
  message?: string;
}

export function transitionToSeated(
  current: LocalSeatingState,
  input: Omit<ValidateSeatSelectionInput, 'currentSeating'>,
): SitTransitionResult {
  const check = validateSeatSelection({
    ...input,
    currentSeating: current,
  });

  if (!check.ok) {
    return {
      ok: false,
      state: current,
      reason: check.reason,
      message: check.message,
    };
  }

  const nextState: LocalSeatingState = {
    status: 'seated',
    studyRoomId: check.seat.studyRoomId,
    seatId: check.seat.seatId,
    seatLabel: check.seat.label,
    tableId: check.seat.tableId,
    anchorPos: { x: check.seat.x, z: check.seat.z },
    facing: check.seat.facing,
    standUpPos: check.standUpPos,
    transitionLock: false,
  };

  return {
    ok: true,
    state: nextState,
    seat: check.seat,
  };
}

export interface StandTransitionResult {
  ok: boolean;
  state: LocalSeatingState;
  releasedSeatId: string | null;
  standUpPos: Vec2 | null;
  facing: number | null;
  reason?: 'not-seated' | 'transition-locked';
}

export function transitionToStanding(current: LocalSeatingState): StandTransitionResult {
  if (current.transitionLock) {
    return {
      ok: false,
      state: current,
      releasedSeatId: null,
      standUpPos: null,
      facing: null,
      reason: 'transition-locked',
    };
  }

  if (current.status !== 'seated' || !current.seatId) {
    return {
      ok: false,
      state: current,
      releasedSeatId: null,
      standUpPos: null,
      facing: null,
      reason: 'not-seated',
    };
  }

  const seatDef = getSeatDefinition(current.seatId);
  const standUpPos =
    current.standUpPos ??
    (seatDef
      ? computeSafeStandUpPosition(seatDef, current.anchorPos ?? undefined)
      : resolveLibraryLobbyCollisions({ ...LIBRARY_LOBBY.spawn }, AVATAR.radius).pos);

  return {
    ok: true,
    state: createInitialSeatingState(),
    releasedSeatId: current.seatId,
    standUpPos,
    facing: current.facing,
  };
}

/**
 * Ensures local sitting state is released immediately if the player leaves
 * `LibraryLobby`, enters `Classroom`, or mounts a motorbike.
 */
export function reconcileSeatingWithEnvironment(
  current: LocalSeatingState,
  env: { inLibraryLobby: boolean; inClassroom: boolean; bikeRiding: boolean },
): { state: LocalSeatingState; released: boolean; releasedSeatId: string | null } {
  if (current.status !== 'seated') {
    return { state: current, released: false, releasedSeatId: null };
  }
  if (!env.inLibraryLobby || env.inClassroom || env.bikeRiding) {
    return {
      state: createInitialSeatingState(),
      released: true,
      releasedSeatId: current.seatId,
    };
  }
  return { state: current, released: false, releasedSeatId: null };
}

/**
 * Reconciles a persisted StudySessionState's `seatId` and `studyRoomId` on reload
 * or room change against the actual local seating state so a stale seat ID is
 * never restored when the player is not actually seated in that room, while
 * preserving Pomodoro state, tasks, subject, and focus history.
 */
export function reconcilePersistedSessionSeat(
  session: StudySessionState,
  env: { inLibraryLobby: boolean; activeSeatId: string | null },
): StudySessionState {
  const validLobbySeat =
    env.inLibraryLobby && env.activeSeatId && isLibraryLobbySeatId(env.activeSeatId)
      ? env.activeSeatId
      : null;

  const targetRoomId: StudyRoomZoneId | null = validLobbySeat
    ? 'library-lobby'
    : env.inLibraryLobby
      ? 'library-lobby'
      : null;

  if (session.seatId === validLobbySeat && session.studyRoomId === targetRoomId) {
    return session;
  }

  return {
    ...session,
    studyRoomId: targetRoomId,
    seatId: validLobbySeat,
  };
}

export interface ReleaseSeatDriver {
  standUp?: () => {
    ok: boolean;
    reason?: string;
    releasedSeatId?: string | null;
    pos?: Vec2;
  };
}

export interface ReleaseActiveSeatOptions {
  driver?: ReleaseSeatDriver | null;
  fallbackSeatId?: string | null;
}

export interface ReleaseActiveSeatResult {
  released: boolean;
  releasedSeatId: string | null;
  standUpPos: Vec2 | null;
  viaMountedPlayer: boolean;
}

/**
 * Safe, centralized seat-release transition that works both when the 3D `Player`
 * component is mounted (`driver.standUp` available) and when `CampusScene`/`Player`
 * are unmounted during Zen 2D (`driver` is undefined).
 *
 * - Never mutates `Player`'s internal refs externally when `Player` is mounted.
 * - When `Player` is unmounted (Zen 2D), transitions `playerState` to a collision-safe
 *   standing position via `computeSafeStandUpPosition` and emits `bkhn:seat-change`
 *   so React seating state, `StudySessionState`, and `playerState` stay in sync
 *   and remounting 3D renders a standing avatar outside furniture colliders.
 */
export function releaseActiveSeatSafely(
  options: ReleaseActiveSeatOptions = {},
): ReleaseActiveSeatResult {
  const { driver, fallbackSeatId = null } = options;

  // 1. Mounted 3D Player path: delegate directly to Player's internal standUp().
  if (driver && typeof driver.standUp === 'function') {
    const res = driver.standUp();
    if (res?.ok) {
      return {
        released: true,
        releasedSeatId: res.releasedSeatId ?? null,
        standUpPos: res.pos ? { ...res.pos } : { ...playerState.pos },
        viaMountedPlayer: true,
      };
    }

    const staleSeatId = playerState.seatId ?? fallbackSeatId;
    if (playerState.seated || staleSeatId) {
      playerState.seated = false;
      playerState.seatId = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bkhn:seat-change', {
            detail: {
              seated: false,
              seatId: null,
              seatLabel: null,
              studyRoomId: playerState.inLibraryLobby ? 'library-lobby' : null,
            },
          }),
        );
      }
    }

    return {
      released: false,
      releasedSeatId: null,
      standUpPos: null,
      viaMountedPlayer: true,
    };
  }

  // 2. Unmounted Player path (e.g. Zen 2D mode has suspended 3D rendering):
  const activeSeatId = playerState.seatId ?? fallbackSeatId ?? null;
  const wasSeated = Boolean(playerState.seated || activeSeatId);
  if (!wasSeated) {
    return {
      released: false,
      releasedSeatId: null,
      standUpPos: null,
      viaMountedPlayer: false,
    };
  }

  const seatDef = activeSeatId ? getSeatDefinition(activeSeatId) : undefined;
  let standUpPos: Vec2 = { ...playerState.pos };

  if (playerState.inLibraryLobby) {
    standUpPos = seatDef
      ? computeSafeStandUpPosition(seatDef, playerState.pos)
      : resolveLibraryLobbyCollisions({ ...playerState.pos }, AVATAR.radius).pos;
    playerState.pos = { ...standUpPos };
    if (seatDef) {
      playerState.facing = seatDef.facing;
    }
  }

  playerState.seated = false;
  playerState.seatId = null;
  playerState.moving = false;
  playerInput.move.x = 0;
  playerInput.move.y = 0;
  playerInput.run = false;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bkhn:seat-change', {
        detail: {
          seated: false,
          seatId: null,
          seatLabel: null,
          studyRoomId: playerState.inLibraryLobby ? 'library-lobby' : null,
        },
      }),
    );
  }

  return {
    released: true,
    releasedSeatId: activeSeatId,
    standUpPos: { ...standUpPos },
    viaMountedPlayer: false,
  };
}

export type ReconnectSeatDecision =
  | { action: 'none' }
  | { action: 'preserve-confirmed'; seatId: string }
  | { action: 'release-stale-server-seat'; seatId: string }
  | {
      action: 'stand-up-occupied';
      seatId: string;
      occupiedByName: string;
      releaseServerSeatId?: string;
    }
  | {
      action: 'reclaim-available';
      seatId: string;
      previousServerSeatId?: string;
    };

/**
 * Pure decision helper for FIX 5 — evaluates what action to take for the local
 * player when an authoritative `study:room-snapshot` arrives on reconnect.
 *
 * Also reconciles the inverse case where the local player has already stood up
 * (or left `LibraryLobby` / switched seats while offline) while the server still
 * holds an old seat for `selfId`.
 */
export function evaluateReconnectSeatAction(input: {
  inLibraryLobby: boolean;
  localSeated: boolean;
  localSeatId: string | null;
  mpStatus: 'idle' | 'connecting' | 'online' | 'offline';
  selfId: string | null;
  seatMap: Record<string, { occupantId: string; occupantName: string }>;
}): ReconnectSeatDecision {
  if (input.mpStatus !== 'online' || !input.selfId) {
    return { action: 'none' };
  }

  const serverOwnedSeatId =
    Object.keys(input.seatMap).find(
      (sid) => input.seatMap[sid]?.occupantId === input.selfId,
    ) ?? null;

  if (!input.inLibraryLobby || !input.localSeated || !input.localSeatId) {
    if (serverOwnedSeatId) {
      return { action: 'release-stale-server-seat', seatId: serverOwnedSeatId };
    }
    return { action: 'none' };
  }

  if (!isLibraryLobbySeatId(input.localSeatId)) {
    return {
      action: 'stand-up-occupied',
      seatId: input.localSeatId,
      occupiedByName: 'hệ thống',
      ...(serverOwnedSeatId ? { releaseServerSeatId: serverOwnedSeatId } : {}),
    };
  }

  const occ = input.seatMap[input.localSeatId];
  if (occ && occ.occupantId === input.selfId) {
    return { action: 'preserve-confirmed', seatId: input.localSeatId };
  }
  if (occ && occ.occupantId !== input.selfId) {
    return {
      action: 'stand-up-occupied',
      seatId: input.localSeatId,
      occupiedByName: occ.occupantName || 'bạn khác',
      ...(serverOwnedSeatId && serverOwnedSeatId !== input.localSeatId
        ? { releaseServerSeatId: serverOwnedSeatId }
        : {}),
    };
  }
  return {
    action: 'reclaim-available',
    seatId: input.localSeatId,
    ...(serverOwnedSeatId && serverOwnedSeatId !== input.localSeatId
      ? { previousServerSeatId: serverOwnedSeatId }
      : {}),
  };
}

export type ReclaimOutcomeDecision =
  | { action: 'keep-seated'; seatId: string }
  | { action: 'release-server-seat'; seatId: string }
  | { action: 'keep-offline'; seatId: string }
  | { action: 'noop' }
  | {
      action: 'stand-up-failed';
      seatId: string;
      reason: string;
      occupiedByName?: string;
      releaseServerSeatId?: string;
    };

/**
 * Pure reconciliation helper for FIX 5 — determines how to reconcile local seating
 * after an async `requestSeatClaim` triggered by `reclaim-available` settles.
 */
export function evaluateReclaimOutcome(input: {
  targetSeatId: string;
  outcome:
    | { ok: true; occupancy: { seatId: string; occupantId: string } }
    | {
        ok: false;
        seatId: string;
        reason: string;
        occupiedBy?: string;
        occupiedByName?: string;
      };
  currentlyInLibraryLobby: boolean;
  currentlySeated: boolean;
  currentLocalSeatId: string | null;
  previousServerSeatId?: string | null;
}): ReclaimOutcomeDecision {
  const stillSeatedAtTarget =
    input.currentlyInLibraryLobby &&
    input.currentlySeated &&
    input.currentLocalSeatId === input.targetSeatId;

  if (input.outcome.ok) {
    if (stillSeatedAtTarget) {
      return { action: 'keep-seated', seatId: input.targetSeatId };
    }
    return { action: 'release-server-seat', seatId: input.targetSeatId };
  }

  if (!stillSeatedAtTarget) {
    if (input.previousServerSeatId) {
      return { action: 'release-server-seat', seatId: input.previousServerSeatId };
    }
    return { action: 'noop' };
  }

  if (input.outcome.reason === 'offline') {
    return { action: 'keep-offline', seatId: input.targetSeatId };
  }

  return {
    action: 'stand-up-failed',
    seatId: input.targetSeatId,
    reason: input.outcome.reason,
    ...(input.outcome.occupiedByName
      ? { occupiedByName: input.outcome.occupiedByName }
      : {}),
    ...(input.previousServerSeatId
      ? { releaseServerSeatId: input.previousServerSeatId }
      : {}),
  };
}
