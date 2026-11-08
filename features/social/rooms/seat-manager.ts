// ---------------------------------------------------------------------------
// features/social/rooms/seat-manager.ts — Authoritative Seat Occupancy &
// Study Room state machine (`feature.social.study-rooms`).
//
// ARCHITECTURAL INVARIANTS (PR6):
// 1. Shared room state (who sits at which desk) is authoritative on the server.
// 2. A student may occupy at most ONE seat at any time; claiming a new seat
//    atomically releases their previous seat.
// 3. Supports deterministic reconstruction after Cloudflare Durable Object
//    WebSocket Hibernation (`restoreSeatRegistryFromAttachments`).
// ---------------------------------------------------------------------------

import {
  getSeatDefinition,
  getSeatsForStudyRoom,
  isValidSeatId,
  sanitizeSubjectTag,
  STUDY_ROOMS,
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
  occupantMssv: string;
  subjectTag?: string | null;
  nowMs?: number;
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
      reason: 'invalid-seat' | 'already-occupied';
      occupiedBy?: string;
    };

export interface HibernatedSeatAttachment {
  occupantId: string;
  occupantName: string;
  occupantMssv: string;
  seatId?: string | null;
  occupiedAtMs?: number;
  subjectTag?: string | null;
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
  if (!isValidSeatId(input.seatId)) {
    return {
      ok: false,
      seatId: String(input.seatId),
      reason: 'invalid-seat',
    };
  }
  const seatDef = getSeatDefinition(input.seatId)!;
  const existing = registry.bySeatId.get(seatDef.seatId);
  if (existing && existing.occupantId !== input.occupantId) {
    return {
      ok: false,
      seatId: seatDef.seatId,
      reason: 'already-occupied',
      occupiedBy: existing.occupantId,
    };
  }

  let releasedPreviousSeatId: string | null = null;
  const prevSeatId = registry.seatByOccupant.get(input.occupantId);
  if (prevSeatId && prevSeatId !== seatDef.seatId) {
    registry.bySeatId.delete(prevSeatId);
    registry.seatByOccupant.delete(input.occupantId);
    releasedPreviousSeatId = prevSeatId;
  }

  const occupancy: SeatOccupancy = {
    seatId: seatDef.seatId,
    studyRoomId: seatDef.studyRoomId,
    occupantId: input.occupantId,
    occupantName: input.occupantName,
    occupantMssv: input.occupantMssv,
    occupiedAtMs:
      existing && existing.occupantId === input.occupantId
        ? existing.occupiedAtMs
        : (input.nowMs ?? Date.now()),
    subjectTag: sanitizeSubjectTag(input.subjectTag) ?? undefined,
  };

  registry.bySeatId.set(seatDef.seatId, occupancy);
  registry.seatByOccupant.set(input.occupantId, seatDef.seatId);

  return {
    ok: true,
    occupancy,
    releasedPreviousSeatId,
  };
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
 * Sorts by `occupiedAtMs` ascending so earlier claims win deterministically.
 */
export function restoreSeatRegistryFromAttachments(
  attachments: readonly HibernatedSeatAttachment[],
  nowMs: number = Date.now(),
): SeatRegistry {
  const registry = createSeatRegistry();
  const sorted = [...attachments]
    .filter((a) => a && typeof a.occupantId === 'string' && a.seatId)
    .sort((a, b) => (a.occupiedAtMs ?? nowMs) - (b.occupiedAtMs ?? nowMs));

  for (const item of sorted) {
    if (!item.seatId) continue;
    claimSeat(registry, {
      seatId: item.seatId,
      occupantId: item.occupantId,
      occupantName: item.occupantName,
      occupantMssv: item.occupantMssv,
      subjectTag: item.subjectTag,
      nowMs: item.occupiedAtMs ?? nowMs,
    });
  }
  return registry;
}
