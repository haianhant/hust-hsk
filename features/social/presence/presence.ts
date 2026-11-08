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
  sanitizeStudyPresence,
  type PlayerPresenceStatus,
  type PlayerStudyPresence,
  type PomodoroPhase,
  type StudyRoomZoneId,
} from '../../../shared/contracts/study';
import type { StudySessionState } from '../../study/study-session/session';

export interface DerivePresenceInput {
  session: StudySessionState;
  inClassroom: boolean;
  inLibraryLobby: boolean;
  nowMs?: number;
}

export function derivePlayerPresence(input: DerivePresenceInput): PlayerStudyPresence {
  const { session, inClassroom, inLibraryLobby, nowMs = Date.now() } = input;
  const pomodoroPhase: PomodoroPhase = session.pomodoro.phase;

  let status: PlayerPresenceStatus = 'exploring';
  if (session.active) {
    if (pomodoroPhase === 'focus' && session.pomodoro.running) {
      status = 'studying';
    } else if (pomodoroPhase === 'short-break' || pomodoroPhase === 'long-break') {
      status = 'break';
    } else if (session.seatId) {
      status = 'studying';
    } else {
      status = 'idle';
    }
  }

  const seatDef = session.seatId ? getSeatDefinition(session.seatId) : undefined;
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
      pomodoroPhase,
      subjectTag: session.subjectTag,
      updatedAtMs: nowMs,
    },
    nowMs,
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
