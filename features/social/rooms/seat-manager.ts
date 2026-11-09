// ---------------------------------------------------------------------------
// features/social/rooms/seat-manager.ts — Authoritative Seat Occupancy &
// Study Room state machine (`feature.social.study-rooms`).
//
// ARCHITECTURAL INVARIANTS (PR6 & PR9):
// 1. Shared room state (who sits at which desk) is authoritative on the server
//    within each multiplayer room instance (`hsk-1`..`hsk-5`).
// 2. A student may occupy at most ONE seat at any time; claiming a new seat
//    atomically releases their previous seat.
// 3. Only PR9-supported 3D zones (`library-lobby`) can be claimed unless
//    explicitly overridden in `allowedZones`.
// 4. Privacy: `SeatOccupancy` never stores or broadcasts `occupantMssv`.
// 5. Supports deterministic reconstruction after Cloudflare Durable Object
//    WebSocket Hibernation (`restoreSeatRegistryFromAttachments`).
// ---------------------------------------------------------------------------

import {
  extractValidAppearance,
  sanitizeName,
  type AvatarGender,
  type AvatarHairStyle,
  type AvatarOutfitId,
} from '../../../shared/contracts/multiplayer';
import {
  getSeatDefinition,
  getSeatsForStudyRoom,
  isValidSeatId,
  PR9_SUPPORTED_STUDY_ROOM_ZONES,
  sanitizeStudyPresence,
  sanitizeSubjectTag,
  STUDY_ROOMS,
  type PlayerStudyPresence,
  type SeatClaimRejectionReason,
  type SeatOccupancy,
  type StudyRoomZoneId,
} from '../../../shared/contracts/study';

export interface SeatRegistry {
  bySeatId: Map<string, SeatOccupancy>;
  seatByOccupant: Map<string, string>;
}

export interface ClaimSeatInput {
  seatId: string;
  occupantId: string;
  occupantName: string;
  /** Accepted for call-site compatibility; never stored on SeatOccupancy. */
  occupantMssv?: string;
  subjectTag?: string | null;
  nowMs?: number;
  color?: string;
  gender?: AvatarGender;
  outfit?: AvatarOutfitId;
  hairStyle?: AvatarHairStyle;
  skirt?: boolean;
  glasses?: boolean;
  backpack?: boolean;
  allowedZones?: readonly StudyRoomZoneId[];
}

export type ClaimSeatResult =
  | {
      ok: true;
      occupancy: SeatOccupancy;
      releasedPreviousSeatId: string | null;
    }
  | {
      ok: false;
      seatId: string;
      reason: SeatClaimRejectionReason;
      occupiedBy?: string;
      occupiedByName?: string;
    };

export interface HibernatedSeatAttachment {
  occupantId: string;
  occupantName: string;
  occupantMssv?: string;
  seatId?: string | null;
  occupiedAtMs?: number | null;
  subjectTag?: string | null;
  color?: string;
  gender?: AvatarGender;
  outfit?: AvatarOutfitId;
  hairStyle?: AvatarHairStyle;
  skirt?: boolean;
  glasses?: boolean;
  backpack?: boolean;
}

export function createSeatRegistry(): SeatRegistry {
  return {
    bySeatId: new Map<string, SeatOccupancy>(),
    seatByOccupant: new Map<string, string>(),
  };
}

export function claimSeat(
  registry: SeatRegistry,
  input: ClaimSeatInput,
): ClaimSeatResult {
  const occupantId = typeof input?.occupantId === 'string' ? input.occupantId.trim() : '';
  if (!occupantId) {
    return {
      ok: false,
      seatId: String(input?.seatId ?? ''),
      reason: 'not-authenticated',
    };
  }

  if (!isValidSeatId(input.seatId)) {
    return {
      ok: false,
      seatId: String(input.seatId ?? ''),
      reason: 'invalid-seat',
    };
  }

  const seatDef = getSeatDefinition(input.seatId)!;
  const allowedZones = input.allowedZones ?? PR9_SUPPORTED_STUDY_ROOM_ZONES;
  if (!allowedZones.includes(seatDef.studyRoomId)) {
    return {
      ok: false,
      seatId: seatDef.seatId,
      reason: 'unsupported-zone',
    };
  }

  const existing = registry.bySeatId.get(seatDef.seatId);
  if (existing && existing.occupantId !== occupantId) {
    return {
      ok: false,
      seatId: seatDef.seatId,
      reason: 'already-occupied',
      occupiedBy: existing.occupantId,
      occupiedByName: existing.occupantName,
    };
  }

  let releasedPreviousSeatId: string | null = null;
  const prevSeatId = registry.seatByOccupant.get(occupantId);
  if (prevSeatId && prevSeatId !== seatDef.seatId) {
    registry.bySeatId.delete(prevSeatId);
    registry.seatByOccupant.delete(occupantId);
    releasedPreviousSeatId = prevSeatId;
  }

  const appearance = extractValidAppearance(input as unknown as Record<string, unknown>);
  const subjectTag = sanitizeSubjectTag(input.subjectTag) ?? undefined;
  const color =
    typeof input.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(input.color)
      ? input.color
      : existing?.color;

  const occupancy: SeatOccupancy = {
    seatId: seatDef.seatId,
    studyRoomId: seatDef.studyRoomId,
    occupantId,
    occupantName: sanitizeName(input.occupantName),
    occupiedAtMs:
      existing && existing.occupantId === occupantId
        ? existing.occupiedAtMs
        : Number.isFinite(input.nowMs)
          ? (input.nowMs as number)
          : Date.now(),
    ...(subjectTag !== undefined ? { subjectTag } : {}),
    ...(color !== undefined ? { color } : {}),
    ...appearance,
  };

  registry.bySeatId.set(seatDef.seatId, occupancy);
  registry.seatByOccupant.set(occupantId, seatDef.seatId);

  return {
    ok: true,
    occupancy,
    releasedPreviousSeatId,
  };
}

export function updateOccupantMetaInSeatRegistry(
  registry: SeatRegistry,
  occupantId: string,
  meta: {
    occupantName?: string;
    subjectTag?: string | null;
    color?: string;
    gender?: AvatarGender;
    outfit?: AvatarOutfitId;
    hairStyle?: AvatarHairStyle;
    skirt?: boolean;
    glasses?: boolean;
    backpack?: boolean;
  },
): SeatOccupancy | null {
  const seatId = registry.seatByOccupant.get(occupantId);
  if (!seatId) return null;
  const current = registry.bySeatId.get(seatId);
  if (!current) return null;

  const nextAppearance = extractValidAppearance({
    gender: meta.gender ?? current.gender,
    outfit: meta.outfit ?? current.outfit,
    hairStyle: meta.hairStyle ?? current.hairStyle,
    skirt: meta.skirt ?? current.skirt,
    glasses: meta.glasses ?? current.glasses,
    backpack: meta.backpack ?? current.backpack,
  });

  const nextSubject =
    meta.subjectTag !== undefined
      ? (sanitizeSubjectTag(meta.subjectTag) ?? undefined)
      : current.subjectTag;

  const updated: SeatOccupancy = {
    seatId: current.seatId,
    studyRoomId: current.studyRoomId,
    occupantId: current.occupantId,
    occupantName:
      meta.occupantName !== undefined
        ? sanitizeName(meta.occupantName)
        : current.occupantName,
    occupiedAtMs: current.occupiedAtMs,
    ...(nextSubject !== undefined ? { subjectTag: nextSubject } : {}),
    ...(meta.color ?? current.color ? { color: meta.color ?? current.color } : {}),
    ...nextAppearance,
  };

  registry.bySeatId.set(seatId, updated);
  return updated;
}

export type ReleaseSeatResult =
  | {
      ok: true;
      released: SeatOccupancy;
    }
  | {
      ok: false;
      reason: 'not-occupied' | 'not-owner';
    };

export function releaseSeat(
  registry: SeatRegistry,
  seatId: string,
  occupantId: string,
): ReleaseSeatResult {
  const occupancy = registry.bySeatId.get(seatId);
  if (!occupancy) {
    return { ok: false, reason: 'not-occupied' };
  }
  if (occupancy.occupantId !== occupantId) {
    return { ok: false, reason: 'not-owner' };
  }
  registry.bySeatId.delete(seatId);
  if (registry.seatByOccupant.get(occupantId) === seatId) {
    registry.seatByOccupant.delete(occupantId);
  }
  return { ok: true, released: occupancy };
}

export function releaseSeatByOccupant(
  registry: SeatRegistry,
  occupantId: string,
): SeatOccupancy | null {
  const seatId = registry.seatByOccupant.get(occupantId);
  if (!seatId) return null;
  const occupancy = registry.bySeatId.get(seatId) ?? null;
  registry.seatByOccupant.delete(occupantId);
  registry.bySeatId.delete(seatId);
  return occupancy;
}

export function getSeatOccupancy(
  registry: SeatRegistry,
  seatId: string,
): SeatOccupancy | null {
  return registry.bySeatId.get(seatId) ?? null;
}

export function getOccupantSeat(
  registry: SeatRegistry,
  occupantId: string,
): SeatOccupancy | null {
  const seatId = registry.seatByOccupant.get(occupantId);
  if (!seatId) return null;
  return registry.bySeatId.get(seatId) ?? null;
}

export function listOccupanciesForRoom(
  registry: SeatRegistry,
  studyRoomId?: StudyRoomZoneId,
): SeatOccupancy[] {
  const all = Array.from(registry.bySeatId.values());
  if (!studyRoomId) return all;
  return all.filter((o) => o.studyRoomId === studyRoomId);
}

export function getStudyRoomAvailabilitySummary(registry: SeatRegistry) {
  return STUDY_ROOMS.map((room) => {
    const seats = getSeatsForStudyRoom(room.id);
    const occupiedCount = seats.filter((s) => registry.bySeatId.has(s.seatId)).length;
    return {
      studyRoomId: room.id,
      name: room.name,
      totalSeats: seats.length,
      occupiedSeats: occupiedCount,
      availableSeats: Math.max(0, seats.length - occupiedCount),
    };
  });
}

/**
 * Reconstructs the authoritative SeatRegistry from deserialized WebSocket
 * attachments when a Cloudflare Durable Object wakes up from hibernation.
 *
 * - Ignores corrupted, unauthenticated, or unsupported-zone attachments.
 * - Sorts by `occupiedAtMs` ascending (with deterministic `occupantId` tie-breaker)
 *   so earlier claims win deterministically.
 * - Enforces at most 1 seat per player and 1 player per seat.
 */
export function restoreSeatRegistryFromAttachments(
  attachments: readonly HibernatedSeatAttachment[],
  nowMs: number = Date.now(),
  options?: { allowedZones?: readonly StudyRoomZoneId[] },
): SeatRegistry {
  const registry = createSeatRegistry();
  if (!Array.isArray(attachments)) return registry;

  const validItems = attachments.filter(
    (a): a is HibernatedSeatAttachment & { seatId: string } =>
      Boolean(
        a &&
          typeof a === 'object' &&
          typeof a.occupantId === 'string' &&
          a.occupantId.trim().length > 0 &&
          typeof a.seatId === 'string' &&
          a.seatId.trim().length > 0,
      ),
  );

  const sorted = [...validItems].sort((a, b) => {
    const tA = Number.isFinite(a.occupiedAtMs) ? (a.occupiedAtMs as number) : nowMs;
    const tB = Number.isFinite(b.occupiedAtMs) ? (b.occupiedAtMs as number) : nowMs;
    if (tA !== tB) return tA - tB;
    return a.occupantId.localeCompare(b.occupantId);
  });

  for (const item of sorted) {
    // If this occupant already restored a seat from an earlier attachment, skip
    // so a single occupant never overwrites their own earlier seat during restoration.
    if (registry.seatByOccupant.has(item.occupantId.trim())) continue;

    claimSeat(registry, {
      seatId: item.seatId,
      occupantId: item.occupantId,
      occupantName: item.occupantName,
      subjectTag: item.subjectTag,
      nowMs: Number.isFinite(item.occupiedAtMs) ? (item.occupiedAtMs as number) : nowMs,
      color: item.color,
      gender: item.gender,
      outfit: item.outfit,
      hairStyle: item.hairStyle,
      skirt: item.skirt,
      glasses: item.glasses,
      backpack: item.backpack,
      allowedZones: options?.allowedZones,
    });
  }
  return registry;
}

/**
 * Enforces the server-authoritative rule that a player's public presence
 * `seatId` MUST match the seat they actually own in the room's `SeatRegistry`.
 * Prevents a client from spoofing seat occupancy via `study:presence`.
 */
export function reconcileServerPresenceWithSeat(
  raw: Partial<PlayerStudyPresence> | null | undefined,
  ownedSeat: SeatOccupancy | null,
  nowMs: number = Date.now(),
): PlayerStudyPresence {
  const sanitized = sanitizeStudyPresence(raw, nowMs);
  const authoritativeSeatId = ownedSeat ? ownedSeat.seatId : null;
  const authoritativeRoomId: StudyRoomZoneId | null = ownedSeat
    ? ownedSeat.studyRoomId
    : sanitized.studyRoomId === 'library-lobby'
      ? 'library-lobby'
      : null;

  return {
    status: sanitized.status,
    studyRoomId: authoritativeRoomId,
    seatId: authoritativeSeatId,
    pomodoroPhase: sanitized.pomodoroPhase,
    subjectTag: sanitized.subjectTag ?? ownedSeat?.subjectTag ?? null,
    updatedAtMs: nowMs,
  };
}
