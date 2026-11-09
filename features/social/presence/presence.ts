// ---------------------------------------------------------------------------
// features/social/presence/presence.ts — Player Study Presence resolver &
// badge formatter (`feature.social.presence`).
//
// ARCHITECTURAL INVARIANTS (PR6):
// 1. Strict privacy & state boundary: only public presence metadata (`status`,
//    `studyRoomId`, `seatId`, `pomodoroPhase`, `subjectTag`) is derived for
//    room broadcast; personal tasks, SRS scores, and focus logs never leave
//    the client.
// ---------------------------------------------------------------------------

import {
  getSeatDefinition,
  isSupportedLibrarySeatId,
  sanitizeStudyPresence,
  type PlayerPresenceStatus,
  type PlayerStudyPresence,
  type PomodoroPhase,
  type StudyRoomZoneId,
} from '../../../shared/contracts/study';
import type { StudySessionState } from '../../study/study-session/session';
import { reconcileServerPresenceWithSeat } from '../rooms/seat-manager';

export { reconcileServerPresenceWithSeat };

export interface DerivePresenceInput {
  session: StudySessionState;
  inClassroom: boolean;
  inLibraryLobby: boolean;
  activeSeatId?: string | null;
  nowMs?: number;
}

export function derivePlayerPresence(input: DerivePresenceInput): PlayerStudyPresence {
  const { session, inClassroom, inLibraryLobby, activeSeatId, nowMs = Date.now() } = input;
  const effectiveSeatId =
    activeSeatId !== undefined ? activeSeatId : session.seatId;
  const seatDef =
    effectiveSeatId && isSupportedLibrarySeatId(effectiveSeatId)
      ? getSeatDefinition(effectiveSeatId)
      : undefined;
  const isSeated = Boolean(seatDef);
  const pomodoroPhase: PomodoroPhase = session.pomodoro.phase;

  let status: PlayerPresenceStatus = 'exploring';
  if (session.active || isSeated) {
    if (pomodoroPhase === 'focus' && session.pomodoro.running) {
      status = 'studying';
    } else if (
      session.active &&
      (pomodoroPhase === 'short-break' || pomodoroPhase === 'long-break')
    ) {
      status = 'break';
    } else {
      status = 'idle';
    }
  }

  const inferredRoomId: StudyRoomZoneId | null = seatDef
    ? seatDef.studyRoomId
    : session.studyRoomId
      ? session.studyRoomId
      : inLibraryLobby
        ? 'library-lobby'
        : inClassroom
          ? 'c1-classroom-101'
          : null;

  return sanitizeStudyPresence(
    {
      status,
      studyRoomId: inferredRoomId,
      seatId: seatDef ? seatDef.seatId : null,
      pomodoroPhase: session.active ? pomodoroPhase : 'idle',
      subjectTag: session.active || isSeated ? session.subjectTag : null,
      updatedAtMs: nowMs,
    },
    nowMs,
  );
}

export function isSamePublicPresence(
  a: PlayerStudyPresence | null | undefined,
  b: PlayerStudyPresence | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.status === b.status &&
    a.studyRoomId === b.studyRoomId &&
    a.seatId === b.seatId &&
    a.pomodoroPhase === b.pomodoroPhase &&
    (a.subjectTag ?? null) === (b.subjectTag ?? null)
  );
}

export function formatPresenceBadge(presence: PlayerStudyPresence): string {
  const tagSuffix = presence.subjectTag ? ` · ${presence.subjectTag}` : '';
  switch (presence.status) {
    case 'studying':
      return `🍅 Đang tự học${tagSuffix}`;
    case 'break':
      return presence.pomodoroPhase === 'long-break'
        ? `☕ Nghỉ dài${tagSuffix}`
        : `☕ Giải lao${tagSuffix}`;
    case 'idle':
      return `⏸️ Tạm nghỉ${tagSuffix}`;
    case 'exploring':
    default:
      return '🚶 Dạo sân trường';
  }
}
