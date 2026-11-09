'use client';

// ---------------------------------------------------------------------------
// features/study/ui/StudyPanel.tsx — Main Study Experience modal/drawer opened
// from the HUST 3D Campus HUD (`feature.study.session`, `feature.study.pomodoro`,
// `feature.study.focus-mode`, `feature.social.rooms`).
// ---------------------------------------------------------------------------

import type { MultiplayerSnapshot } from '../../../lib/multiplayer';
import {
  getSeatDefinition,
  getSeatsForStudyRoom,
  type PlayerStudyPresence,
  type SeatOccupancy,
} from '../../../shared/contracts/study';
import type {
  FocusModeLevel,
  FocusModePreferences,
  FocusRuntimePolicy,
} from '../focus-mode/focus-mode';
import { PomodoroTimer } from '../pomodoro/PomodoroTimer';
import type { PomodoroPresetId } from '../pomodoro/timer';
import { StudyTaskList } from '../study-session/StudyTaskList';
import {
  CANONICAL_HSK_LESSON_OPTIONS,
  type StudySessionState,
} from '../study-session/session';
import { StudySessionSummary } from './StudySessionSummary';

export interface StudyPanelProps {
  open: boolean;
  zoneLabel: string;
  activeSeatId?: string | null;
  activeSeatLabel?: string | null;
  mpSnap?: MultiplayerSnapshot;
  session: StudySessionState;
  focusPrefs: FocusModePreferences;
  focusPolicy: FocusRuntimePolicy;
  onClose: () => void;
  onStandUp?: () => void;
  onReconcileAt?: (nowMs: number) => void;
  onStartSession: () => void;
  onEndSession: () => void;
  onUpdateSubject: (subject: string) => void;
  onSetLinkedHskLesson: (lessonId: string | null) => void;
  onAddTask: (title: string) => void;
  onToggleTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onStartFocus: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onSkipPhase: () => void;
  onResetTimer: () => void;
  onSelectPreset: (preset: PomodoroPresetId) => void;
  onSetFocusLevel: (level: FocusModeLevel) => void;
  onSetAutoHideHudOnFocus: (enabled: boolean) => void;
}

function formatOccupantStatusBadge(
  occ: SeatOccupancy,
  pres: PlayerStudyPresence | undefined,
): { label: string; className: string } {
  const status = pres?.status ?? 'idle';
  const subject = pres?.subjectTag ?? occ.subjectTag ?? null;
  if (status === 'studying') {
    return {
      label: subject ? `🍅 Đang tự học · ${subject}` : '🍅 Đang tự học · Tập trung',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (status === 'break') {
    return {
      label: subject ? `☕ Giải lao · ${subject}` : '☕ Đang giải lao',
      className: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    label: subject ? `🪑 Đang ngồi · ${subject}` : '🪑 Đang ngồi học',
    className: 'bg-sky-50 text-sky-800 border-sky-200',
  };
}

export function StudyPanel({
  open,
  zoneLabel,
  activeSeatId = null,
  activeSeatLabel = null,
  mpSnap,
  session,
  focusPrefs,
  focusPolicy,
  onClose,
  onStandUp,
  onReconcileAt,
  onStartSession,
  onEndSession,
  onUpdateSubject,
  onSetLinkedHskLesson,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onStartFocus,
  onPauseTimer,
  onResumeTimer,
  onSkipPhase,
  onResetTimer,
  onSelectPreset,
  onSetFocusLevel,
  onSetAutoHideHudOnFocus,
}: StudyPanelProps) {
  if (!open) return null;

  const isOnline = mpSnap?.status === 'online';
  const lobbySeats = getSeatsForStudyRoom('library-lobby');
  const lobbyOccupancies: SeatOccupancy[] = isOnline
    ? (mpSnap?.seats ?? []).filter((s) => s.studyRoomId === 'library-lobby')
    : activeSeatId
      ? [
          {
            seatId: activeSeatId,
            studyRoomId: 'library-lobby',
            occupantId: 'local-self',
            occupantName: 'Bạn (Ngoại tuyến)',
            occupiedAtMs: session.sessionStartedAtMs ?? 0,
            ...(session.subjectTag ? { subjectTag: session.subjectTag } : {}),
          },
        ]
      : [];

  const occupiedCount = lobbyOccupancies.length;
  const totalSeats = lobbySeats.length;
  const availableCount = Math.max(0, totalSeats - occupiedCount);

  return (
    <div
      data-testid="study-panel-backdrop"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Không gian Tự học Bách khoa"
    >
      <div
        data-testid="study-panel"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#FAF7F2] text-[#1c2b1f] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-[#A54432] px-5 py-3.5 text-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight">
                🍅 Tự học Bách khoa (Study MVP)
              </h2>
              <span
                data-testid="study-session-status-badge"
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  session.active
                    ? 'bg-emerald-400/25 text-emerald-100 ring-1 ring-emerald-200/40'
                    : 'bg-white/15 text-white/90'
                }`}
              >
                {session.active ? 'Đang trong phiên' : 'Chưa bắt đầu phiên'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-white/85">
              Vị trí hiện tại: <strong className="font-semibold">{zoneLabel}</strong>
              {activeSeatId && (
                <span
                  data-testid="study-panel-seat-badge"
                  className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-300/25 px-2.5 py-0.5 text-[11px] font-bold text-amber-100 ring-1 ring-amber-200/40"
                >
                  🪑 Đang ngồi tại: {activeSeatLabel ?? activeSeatId}
                  {!isOnline ? ' · Ngoại tuyến' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeSeatId && onStandUp && (
              <button
                type="button"
                data-testid="study-panel-stand-up"
                onClick={onStandUp}
                className="rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-amber-600"
              >
                🚶 Đứng dậy
              </button>
            )}
            <button
              type="button"
              data-testid="close-study-panel"
              onClick={onClose}
              aria-label="Đóng bảng Tự học"
              className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/25"
            >
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* PR9 — Phòng Tự học Trực tuyến & Tình trạng ghế Thư viện Tạ Quang Bửu */}
          <section
            data-testid="study-room-presence-section"
            aria-label="Phòng tự học trực tuyến"
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[#1c2b1f]">
                  🏛️ Sảnh Thư viện Tạ Quang Bửu · Phòng tự học
                </h3>
                <span
                  data-testid="study-room-id-badge"
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isOnline
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {isOnline
                    ? `Phòng ${mpSnap?.roomId ?? 'online'} · ${mpSnap?.count ?? 1} SV trong phòng`
                    : 'Chế độ ngoại tuyến (chỉ hiển thị cục bộ)'}
                </span>
              </div>

              <span
                data-testid="study-room-availability"
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700"
              >
                🪑 Còn trống {availableCount}/{totalSeats} ghế · Đang ngồi {occupiedCount}/{totalSeats}
              </span>
            </div>

            {lobbyOccupancies.length > 0 ? (
              <ul
                data-testid="study-room-occupants-list"
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {lobbyOccupancies.map((occ) => {
                  const seatDef = getSeatDefinition(occ.seatId);
                  const isMe =
                    (isOnline && mpSnap?.selfId && occ.occupantId === mpSnap.selfId) ||
                    occ.occupantId === 'local-self';
                  const pres = isOnline
                    ? mpSnap?.presences?.[occ.occupantId]
                    : {
                        status:
                          session.pomodoro.phase === 'focus' && session.pomodoro.running
                            ? ('studying' as const)
                            : session.pomodoro.phase === 'short-break' ||
                                session.pomodoro.phase === 'long-break'
                              ? ('break' as const)
                              : ('idle' as const),
                        studyRoomId: 'library-lobby' as const,
                        seatId: occ.seatId,
                        pomodoroPhase: session.pomodoro.phase,
                        subjectTag: session.subjectTag,
                        updatedAtMs: 0,
                      };
                  const badge = formatOccupantStatusBadge(occ, pres);
                  return (
                    <li
                      key={occ.seatId}
                      data-testid={`study-room-occupant-${occ.seatId}`}
                      className="flex flex-col justify-between gap-1 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#1c2b1f]">
                          {occ.occupantName}
                          {isMe ? ' (Bạn)' : ''}
                        </span>
                        <span className="font-semibold text-stone-500">
                          {seatDef?.label ?? occ.seatId}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-stone-500">
                Hiện cả 4 ghế đọc sách tại Sảnh tầng 1 đều đang trống — hãy lại gần bàn học và bấm phím E hoặc chọn ghế để ngồi học.
              </p>
            )}
          </section>

          {/* Thiết lập Chủ đề / Mục tiêu phiên học */}
          <section
            aria-label="Thông tin phiên học"
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-[#1c2b1f]">
                🎯 Chủ đề phiên tự học
              </h3>
              <div className="flex items-center gap-2">
                {!session.active ? (
                  <button
                    type="button"
                    data-testid="study-session-start"
                    onClick={onStartSession}
                    className="rounded-xl bg-[#1c5c3a] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#16492e]"
                  >
                    + Bắt đầu phiên tự học
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="study-session-end"
                    onClick={onEndSession}
                    className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                  >
                    ⏹ Kết thúc phiên
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-stone-600">
                Môn học / mục tiêu hiện tại
                <input
                  type="text"
                  data-testid="study-subject-input"
                  value={session.subjectTag ?? ''}
                  onChange={(e) => onUpdateSubject(e.target.value)}
                  maxLength={36}
                  placeholder="VD: Ôn từ vựng HSK 4, Giải tích 1..."
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold text-[#1c2b1f] focus:border-[#A54432] focus:bg-white focus:outline-none"
                />
              </label>

              <label className="block text-xs font-semibold text-stone-600">
                Gắn bài HSK tham khảo (tùy chọn)
                <select
                  data-testid="study-hsk-lesson-select"
                  value={session.linkedHskLessonId ?? ''}
                  onChange={(e) => onSetLinkedHskLesson(e.target.value || null)}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-[#1c2b1f] focus:border-[#A54432] focus:bg-white focus:outline-none"
                >
                  <option value="">Không gắn bài cụ thể</option>
                  {CANONICAL_HSK_LESSON_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Đồng hồ Pomodoro */}
          <PomodoroTimer
            pomodoro={session.pomodoro}
            onReconcileAt={onReconcileAt}
            onSelectPreset={onSelectPreset}
            onStart={onStartFocus}
            onPause={onPauseTimer}
            onResume={onResumeTimer}
            onSkipPhase={onSkipPhase}
            onReset={onResetTimer}
          />

          {/* Chế độ Tập trung (Focus Mode: Normal 3D / Minimal HUD / Zen 2D) */}
          <section
            aria-label="Chế độ Tập trung"
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-[#1c2b1f]">
                🧘 Chế độ Tập trung (Focus Mode)
              </h3>
              <span
                data-testid="focus-effective-level"
                className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600"
              >
                Đang áp dụng: {focusPolicy.effectiveLevel}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                data-testid="focus-mode-off"
                onClick={() => onSetFocusLevel('off')}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                  focusPolicy.effectiveLevel === 'off'
                    ? 'border-[#1c5c3a] bg-[#1c5c3a]/10 font-bold text-[#1c5c3a]'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="block text-sm font-extrabold">🏞️ Normal 3D</span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  Giữ nguyên sân trường 3D &amp; đầy đủ nút điều khiển HUD
                </span>
              </button>

              <button
                type="button"
                data-testid="focus-mode-minimal-hud"
                onClick={() => onSetFocusLevel('minimal-hud')}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                  focusPolicy.effectiveLevel === 'minimal-hud'
                    ? 'border-[#A54432] bg-[#A54432]/10 font-bold text-[#A54432]'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="block text-sm font-extrabold">🎯 Minimal HUD</span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  Giữ cảnh 3D, ẩn bản đồ &amp; nút di chuyển phụ khi đang học
                </span>
              </button>

              <button
                type="button"
                data-testid="focus-mode-zen-2d"
                onClick={() => onSetFocusLevel('zen-2d')}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                  focusPolicy.effectiveLevel === 'zen-2d'
                    ? 'border-sky-700 bg-sky-50 font-bold text-sky-900'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="block text-sm font-extrabold">🌿 Zen 2D</span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  Tạm dừng WebGL 3D để tiết kiệm pin, tập trung học 100%
                </span>
              </button>
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                data-testid="focus-auto-hide-checkbox"
                checked={focusPrefs.autoHideHudOnFocus}
                onChange={(e) => onSetAutoHideHudOnFocus(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-[#A54432] focus:ring-[#A54432]"
              />
              <span>Tự động thu gọn HUD (Minimal HUD) khi bắt đầu pha Focus</span>
            </label>
          </section>

          {/* Danh sách việc cần làm */}
          <StudyTaskList
            tasks={session.tasks}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onRemoveTask={onRemoveTask}
          />

          {/* Thống kê phiên tự học */}
          <StudySessionSummary
            completedFocusBlocks={session.pomodoro.completedFocusBlocks}
            totalFocusedMs={session.pomodoro.totalFocusedMs}
            tasks={session.tasks}
            history={session.history}
          />
        </div>
      </div>
    </div>
  );
}

export default StudyPanel;
