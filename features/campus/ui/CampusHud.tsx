'use client';

// ---------------------------------------------------------------------------
// features/campus/ui/CampusHud.tsx — Main Campus HUD overlay (zone/points/MP
// status chips, Minimap, top-right quick settings, QuestObjective, center 'E'
// interaction prompt, fast-travel menu, motorbike call/recall & mobile
// steering controls, Joystick, help overlay, and toast notification).
// ---------------------------------------------------------------------------

import QuestObjective from '../../../components/learn/QuestObjective';
import Joystick from '../../../components/ui/Joystick';
import Minimap from '../../../components/ui/Minimap';
import type { Progress } from '../../../lib/learn/types';
import type { MultiplayerSnapshot } from '../../../lib/multiplayer';
import { bikeInput, playerInput, type TimeOfDay } from '../../../lib/playerState';
import type { HandbookTab } from '../../learning/hsk/EntryScreen';
import type { LearningPanelType } from '../../learning/hsk/LearningOverlayModal';
import { MultiplayerStatusChip } from '../../social/multiplayer/MultiplayerStatusBar';
import type { FocusRuntimePolicy } from '../../study/focus-mode/focus-mode';
import type { PomodoroState } from '../../study/pomodoro/timer';
import { usePomodoro } from '../../study/pomodoro/usePomodoro';

function StudyHudButton({
  pomodoro,
  onOpenStudyPanel,
  onReconcileStudyAt,
}: {
  pomodoro?: PomodoroState;
  onOpenStudyPanel: () => void;
  onReconcileStudyAt?: (nowMs: number) => void;
}) {
  const fallbackPomodoro: PomodoroState = pomodoro ?? {
    version: 1,
    phase: 'idle',
    running: false,
    config: {
      focusDurationMs: 25 * 60 * 1000,
      shortBreakDurationMs: 5 * 60 * 1000,
      longBreakDurationMs: 15 * 60 * 1000,
      cyclesBeforeLongBreak: 4,
    },
    phaseStartedAtMs: null,
    phaseEndsAtMs: null,
    pausedRemainingMs: null,
    completedFocusBlocks: 0,
    totalFocusedMs: 0,
  };
  const { evaluation, displayRemainingMmSs } = usePomodoro(fallbackPomodoro, onReconcileStudyAt);
  const hasActivePomodoro = evaluation.state.phase !== 'idle';

  return (
    <button
      id="open-study-panel"
      data-testid="open-study-panel"
      type="button"
      onClick={onOpenStudyPanel}
      className={`rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition ${
        hasActivePomodoro
          ? 'bg-[#A54432] hover:bg-[#8A3828]'
          : 'bg-[#1c5c3a]/90 hover:bg-[#16492e]'
      }`}
    >
      {hasActivePomodoro ? (
        <span>
          🍅 Tự học ·{' '}
          <span className="inline-block w-[44px] text-center font-mono">
            {displayRemainingMmSs}
          </span>
          {evaluation.state.running ? '' : ' (Tạm dừng)'}
        </span>
      ) : (
        '🍅 Tự học'
      )}
    </button>
  );
}

export interface CampusHudProps {
  inClassroom: boolean;
  inLibraryLobby: boolean;
  seated?: boolean;
  activeSeatId?: string | null;
  activeSeatLabel?: string | null;
  zone: string;
  progress: Progress | null;
  mpSnap: MultiplayerSnapshot;
  riding: boolean;
  bikeSpeed: number;
  noVoice: boolean;
  questActive: boolean;
  panel: LearningPanelType;
  lessonsOpen: boolean;
  timeOfDay: TimeOfDay;
  realClockText?: string;
  autoTimeOfDay?: boolean;
  lofiPlaying?: boolean;
  soundOn: boolean;
  speechRate: number;
  objectiveText: string | null;
  interactLabel: string | null;
  fastTravelOpen: boolean;
  traveling: boolean;
  helpOpen: boolean;
  toast: string | null;
  pomodoro?: PomodoroState;
  focusPolicy?: FocusRuntimePolicy;
  onOpenStudyPanel?: () => void;
  onStandUp?: () => void;
  onReconcileStudyAt?: (nowMs: number) => void;
  onExitFocusMode?: () => void;
  onDismissNoVoice: () => void;
  onSetPanel: (panel: LearningPanelType) => void;
  onSetReReviewIds: (ids: string[] | null) => void;
  onFastTravel: (destId: string) => void;
  onSetFastTravelOpen: (updater: (prev: boolean) => boolean) => void;
  onCycleTimeOfDay: () => void;
  onToggleLofi?: () => void;
  onToggleOutfit: () => void;
  onOpenLessons: () => void;
  onOpenHandbook: (tab: HandbookTab) => void;
  onToggleSound: () => void;
  onCycleRate: () => void;
  onExitLibraryLobby: () => void;
  onExitClassroom: () => void;
  onInteract: () => void;
  onSetHelpOpen: (open: boolean) => void;
  onShowToast: (msg: string) => void;
}

export function CampusHud({
  inClassroom,
  inLibraryLobby,
  seated = false,
  activeSeatId = null,
  activeSeatLabel = null,
  zone,
  progress,
  mpSnap,
  riding,
  bikeSpeed,
  noVoice,
  questActive,
  panel,
  lessonsOpen,
  timeOfDay,
  realClockText,
  autoTimeOfDay = true,
  lofiPlaying = false,
  soundOn,
  speechRate,
  objectiveText,
  interactLabel,
  helpOpen,
  toast,
  pomodoro,
  focusPolicy,
  onOpenStudyPanel,
  onStandUp,
  onReconcileStudyAt,
  onExitFocusMode,
  onDismissNoVoice,
  onSetPanel,
  onSetReReviewIds,
  onCycleTimeOfDay,
  onToggleLofi,
  onToggleOutfit,
  onOpenLessons,
  onOpenHandbook,
  onToggleSound,
  onCycleRate,
  onExitLibraryLobby,
  onExitClassroom,
  onInteract,
  onSetHelpOpen,
}: CampusHudProps) {
  const hideNav = focusPolicy?.hideNavigationHud ?? false;
  const hideMove = focusPolicy?.hideMovementControls ?? false;
  const isMinimalHud = focusPolicy?.effectiveLevel === 'minimal-hud';

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Góc trên-trái: tên khu + điểm. */}
      <div className="absolute left-3 top-3 flex flex-col gap-2">
        <div className="w-fit rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
          {inClassroom
            ? 'Phòng học mô phỏng'
            : inLibraryLobby
              ? 'Sảnh Thư viện Tạ Quang Bửu'
              : zone}
        </div>
        <div className="w-fit rounded-full bg-[#A54432]/90 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
          ⭐ {progress?.points ?? 0} điểm
          {progress?.streak && progress.streak.count > 0 ? ` · 🔥 ${progress.streak.count} ngày` : ''}
        </div>
        {/* Đợt 5 multiplayer — phòng + số người THẬT trong phòng; mất
            kết nối thì ghi rõ đang chơi một mình, không báo số giả. */}
        <MultiplayerStatusChip snapshot={mpSnap} />
        {/* PR9 — Tóm tắt bàn đọc Sảnh Thư viện Tạ Quang Bửu */}
        {inLibraryLobby && (
          <div
            data-testid="hud-library-seat-summary"
            className="w-fit rounded-full bg-slate-900/80 px-3.5 py-1.5 text-xs font-bold text-slate-100 shadow-lg ring-1 ring-white/15 backdrop-blur-sm"
          >
            {mpSnap.status === 'online' ? (
              <span>
                🪑 Bàn đọc Thư viện ({mpSnap.roomId ?? 'online'}): Còn trống{' '}
                {Math.max(
                  0,
                  4 - mpSnap.seats.filter((s) => s.studyRoomId === 'library-lobby').length,
                )}
                /4 ghế
              </span>
            ) : (
              <span className="text-amber-200">
                🪑 Bàn đọc Thư viện · Chế độ ngoại tuyến (chỉ hiển thị cục bộ)
              </span>
            )}
          </div>
        )}
        {/* PR8/PR9 — Trạng thái đang ngồi học tại bàn thư viện kèm nút Mở bảng Tự học / Đứng dậy */}
        {seated && activeSeatId && (
          <div
            data-testid="hud-seated-status"
            className="pointer-events-auto flex w-fit max-w-[92vw] flex-wrap items-center gap-2 rounded-2xl border border-amber-300/40 bg-black/75 px-3.5 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm"
          >
            <span>
              🍅 Đang ngồi học tại{' '}
              <strong className="text-amber-300">{activeSeatLabel ?? activeSeatId}</strong>
              {mpSnap.status !== 'online' ? ' (Ngoại tuyến)' : ''}
            </span>
            {onOpenStudyPanel && (
              <button
                type="button"
                data-testid="hud-seated-open-study"
                onClick={onOpenStudyPanel}
                className="rounded-xl bg-[#1c5c3a] px-2.5 py-1 text-xs font-bold text-white transition hover:bg-[#16492e]"
              >
                🍅 Bảng Tự học
              </button>
            )}
            {onStandUp && (
              <button
                type="button"
                data-testid="hud-stand-up-button"
                onClick={onStandUp}
                className="rounded-xl bg-[#A54432] px-2.5 py-1 text-xs font-bold text-white transition hover:bg-[#8A3828]"
              >
                🚶 Đứng dậy
              </button>
            )}
          </div>
        )}
        {/* Chip trạng thái Minimal HUD và nút thoát rõ ràng */}
        {isMinimalHud && onExitFocusMode && (
          <button
            id="exit-focus-mode"
            data-testid="exit-focus-mode"
            type="button"
            onClick={onExitFocusMode}
            className="pointer-events-auto w-fit rounded-full bg-amber-600/95 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-amber-700"
          >
            🎯 Đang bật Minimal HUD · Thoát Focus Mode
          </button>
        )}
        {/* Đợt 3 giai đoạn 4 — tốc độ xe khi đang lái (tối đa 14 m/s). */}
        {riding && !hideMove && (
          <div className="w-fit rounded-full bg-[#1c5c3a]/90 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
            🛵 {bikeSpeed.toFixed(1)} m/s · tối đa 14
          </div>
        )}
        {/* Chip thiếu giọng tiếng Trung — gọn, cho đóng; nằm trong cột trạng
            thái góc trái trên nên không che mặt tiền hay chiếm bầu trời.
            Sau khi đóng, noVoiceDismissedRef chặn hiện lại trong phiên;
            trạng thái âm thanh vẫn giữ trong settings.soundOn (nút 🔊/🔇
            góc trên-phải). */}
        {noVoice && (
          <div className="pointer-events-auto flex w-fit max-w-[190px] items-center gap-1.5 rounded-full bg-[#FFF3CD]/95 px-3 py-1.5 text-xs font-semibold text-[#6B4E00] shadow-lg backdrop-blur-sm sm:max-w-[360px] sm:whitespace-nowrap">
            <span className="leading-snug">🔇 Chưa có giọng tiếng Trung — học bằng chữ</span>
            <button
              type="button"
              onClick={onDismissNoVoice}
              className="shrink-0 rounded-full px-1 font-bold hover:bg-black/10"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}
        {/* Nút mở lại panel nhiệm vụ khi đã đóng (đặt ở cột trái trên để
            không chồng hộp hướng dẫn ở giữa dưới trên desktop). */}
        {questActive && panel === null && (
          <button
            id="reopen-quest"
            type="button"
            onClick={() => onSetPanel('quest')}
            className="pointer-events-auto w-fit rounded-full bg-[#A54432] px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-[#8A3828]"
          >
            🎯 Nhiệm vụ
          </button>
        )}
      </div>

      {/* Góc trên-phải: minimap + nút ngày/đêm, nhạc lofi, sổ tay, âm thanh, tốc độ, đổi bài. */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:flex-row-reverse sm:items-start">
        {!inClassroom && !inLibraryLobby && !hideNav && <Minimap />}
        <div className="pointer-events-auto flex max-w-[calc(100vw-240px)] flex-wrap justify-end gap-2">
          {onOpenStudyPanel && (
            <StudyHudButton
              pomodoro={pomodoro}
              onOpenStudyPanel={onOpenStudyPanel}
              onReconcileStudyAt={onReconcileStudyAt}
            />
          )}
          {onToggleLofi && (
            <button
              id="toggle-lofi"
              data-testid="toggle-lofi"
              type="button"
              onClick={onToggleLofi}
              aria-label={lofiPlaying ? 'Tắt nhạc Lofi Chill' : 'Bật nhạc Lofi Chill học tập'}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition ${
                lofiPlaying
                  ? 'bg-amber-600/95 ring-1 ring-amber-300/60 hover:bg-amber-700'
                  : 'bg-black/50 hover:bg-black/70'
              }`}
            >
              {lofiPlaying ? '🎵 Lofi Chill' : '🎧 Nhạc Lofi'}
            </button>
          )}
          {!hideNav && (
            <button
              id="toggle-time"
              data-testid="toggle-time"
              type="button"
              onClick={onCycleTimeOfDay}
              aria-label="Chuyển đổi thời gian Ngày / Hoàng hôn / Đêm (Mặc định theo thời gian thực)"
              title={
                autoTimeOfDay
                  ? 'Đang tự động theo giờ thực ngoài đời — bấm để chuyển thủ công'
                  : 'Đang chỉnh giờ thủ công — bấm để xoay vòng hoặc quay về Tự động'
              }
              className="rounded-full bg-black/50 px-3.5 py-2 text-sm font-semibold tabular-nums text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              {timeOfDay === 'day' ? '☀️ Ngày' : timeOfDay === 'sunset' ? '🌇 Hoàng hôn' : '🌙 Đêm'}
              {realClockText ? (
                <>
                  {' · '}
                  <span className="inline-block w-[42px] text-center font-mono">
                    {realClockText}
                  </span>
                </>
              ) : null}
            </button>
          )}
          {!hideNav && (
            <button
              id="toggle-outfit"
              data-testid="hud-outfit-btn"
              type="button"
              onClick={onToggleOutfit}
              aria-label="Nhân vật và trang phục"
              className="rounded-full bg-black/50 px-3.5 py-2 text-sm font-semibold tabular-nums text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              👕 Nhân vật &amp; trang phục
            </button>
          )}
          <button
            id="change-lesson"
            type="button"
            onClick={onOpenLessons}
            className="rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            📚 Đổi bài
          </button>
          <button
            id="open-handbook"
            type="button"
            onClick={() => onOpenHandbook('lesson')}
            className="rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            📖 Sổ tay
          </button>
          <button
            id="toggle-sound"
            type="button"
            onClick={onToggleSound}
            aria-label={soundOn ? 'Tắt lời đọc' : 'Bật lời đọc'}
            className="rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button
            id="speech-rate"
            type="button"
            onClick={onCycleRate}
            aria-label="Đổi tốc độ đọc"
            className="rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            {speechRate.toFixed(1)}×
          </button>
        </div>
      </div>

      {/* Chip mục tiêu hiện tại. F5a — trong phòng học thì dời sang góc
          trên-phải (dưới hàng nút), để khỏi che tiêu đề bảng đen ở giữa
          trên; ngoài sân vẫn giữ giữa trên như cũ. */}
      <div
        className={
          inClassroom
            ? 'absolute right-3 top-[5.5rem] flex justify-end'
            : 'absolute left-1/2 top-16 flex -translate-x-1/2 justify-center sm:top-3 sm:mt-12'
        }
      >
        <QuestObjective text={objectiveText} />
      </div>

      {/* Gợi ý tương tác "E — ..." (chỉ khi trong tầm): TO, GIỮA màn hình
          khi đang đứng; khi đang ngồi tại bàn học thì thu gọn xuống mép dưới
          để không che khuất nhân vật đang ngồi học tại bàn. */}
      {interactLabel && panel === null && !lessonsOpen && (
        seated ? (
          <div
            data-testid="seated-interact-hint"
            className="pointer-events-auto absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-center"
          >
            <button
              type="button"
              onClick={onInteract}
              className="rounded-full bg-black/75 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/90 sm:text-sm"
            >
              <span className="mr-2 inline-block rounded-md bg-white px-2 py-0.5 font-black text-black">
                E
              </span>
              <span>{interactLabel.replace(/^E — /, '')}</span>
            </button>
          </div>
        ) : (
          <div
            data-testid="center-interact-prompt"
            className="pointer-events-auto absolute left-1/2 top-[36%] z-20 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 text-center"
          >
            <button
              type="button"
              onClick={onInteract}
              className="w-full animate-pulse rounded-3xl bg-black/75 px-6 py-5 shadow-2xl backdrop-blur-sm transition hover:bg-black/85 sm:px-8"
            >
              <span className="mr-4 inline-block rounded-2xl bg-white px-5 py-2 align-middle text-4xl font-black text-black shadow">
                E
              </span>
              <span className="align-middle text-2xl font-bold leading-tight text-white sm:text-3xl">
                {interactLabel.replace(/^E — /, '')}
              </span>
            </button>
            <p className="mt-3 text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Nhấn phím [E] để tương tác
            </p>
          </div>
        )
      )}

      {/* Góc dưới-phải: thoát sảnh/phòng, đứng dậy (khi đang ngồi) + về vị trí an toàn. */}
      <div className="absolute bottom-4 right-3 flex flex-col items-end gap-2">
        {inLibraryLobby && (
          <button
            id="exit-library-lobby"
            type="button"
            onClick={onExitLibraryLobby}
            className="pointer-events-auto relative z-30 rounded-full bg-black/65 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            🚪 Ra khỏi sảnh Thư viện
          </button>
        )}
        {inClassroom && (
          <button
            id="exit-classroom"
            type="button"
            onClick={() => {
              onSetPanel(null);
              onSetReReviewIds(null);
              onExitClassroom();
            }}
            className="pointer-events-auto relative z-30 rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            🚪 Ra khỏi phòng
          </button>
        )}
        {seated && onStandUp && (
          <button
            id="stand-up-button"
            data-testid="hud-bottom-stand-up"
            type="button"
            onClick={onStandUp}
            className="pointer-events-auto rounded-full bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-amber-700"
          >
            🚶 Đứng dậy (E)
          </button>
        )}
        <button
          id="safe-position"
          type="button"
          onClick={() => {
            playerInput.resetToken += 1;
          }}
          className="pointer-events-auto rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Về vị trí an toàn
        </button>
      </div>

      {/* Đợt 3 giai đoạn 4 — cụm lái mobile khi đang lái xe: nút ga/phanh
          + lái trái/phải 64 px, giữ để chạy; đặt góc dưới-phải, trên cụm
          nút (bottom 13rem) để không đè nút "?" (bottom 10rem, mobile)
          và không chạm joystick góc dưới-trái. Khi không lái thì ẩn. */}
      {riding && !hideMove && (
        <div className="pointer-events-auto absolute bottom-[13rem] right-3 hidden flex-col items-center gap-2 [@media(pointer:coarse)]:flex">
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="bike-left"
              aria-label="Lái trái"
              onPointerDown={(e) => {
                e.preventDefault();
                bikeInput.steer = -1;
              }}
              onPointerUp={() => {
                bikeInput.steer = 0;
              }}
              onPointerLeave={() => {
                bikeInput.steer = 0;
              }}
              onPointerCancel={() => {
                bikeInput.steer = 0;
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="flex h-16 w-16 touch-none items-center justify-center rounded-full bg-black/50 text-2xl font-bold text-white shadow-lg backdrop-blur-sm active:bg-black/70"
            >
              ◀
            </button>
            <button
              type="button"
              data-testid="bike-right"
              aria-label="Lái phải"
              onPointerDown={(e) => {
                e.preventDefault();
                bikeInput.steer = 1;
              }}
              onPointerUp={() => {
                bikeInput.steer = 0;
              }}
              onPointerLeave={() => {
                bikeInput.steer = 0;
              }}
              onPointerCancel={() => {
                bikeInput.steer = 0;
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="flex h-16 w-16 touch-none items-center justify-center rounded-full bg-black/50 text-2xl font-bold text-white shadow-lg backdrop-blur-sm active:bg-black/70"
            >
              ▶
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="bike-gas"
              aria-label="Ga"
              onPointerDown={(e) => {
                e.preventDefault();
                bikeInput.throttle = 1;
              }}
              onPointerUp={() => {
                bikeInput.throttle = 0;
              }}
              onPointerLeave={() => {
                bikeInput.throttle = 0;
              }}
              onPointerCancel={() => {
                bikeInput.throttle = 0;
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="flex h-16 w-16 touch-none items-center justify-center rounded-full bg-[#1c5c3a] text-base font-bold text-white shadow-lg active:bg-[#16492e]"
            >
              GA
            </button>
            <button
              type="button"
              data-testid="bike-brake"
              aria-label="Phanh"
              onPointerDown={(e) => {
                e.preventDefault();
                bikeInput.brake = 1;
              }}
              onPointerUp={() => {
                bikeInput.brake = 0;
              }}
              onPointerLeave={() => {
                bikeInput.brake = 0;
              }}
              onPointerCancel={() => {
                bikeInput.brake = 0;
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="flex h-16 w-16 touch-none items-center justify-center rounded-full bg-[#A54432] text-base font-bold text-white shadow-lg active:bg-[#8A3828]"
            >
              PHANH
            </button>
          </div>
        </div>
      )}

      {/* Góc dưới-trái: joystick (chỉ hiện trên thiết bị cảm ứng và khi không ngồi học). */}
      {!hideMove && !seated && (
        <div className="absolute bottom-4 left-3">
          <Joystick />
        </div>
      )}

      {/* Bảng hướng dẫn thao tác. */}
      {!hideMove &&
        (helpOpen ? (
          <div className="pointer-events-auto absolute bottom-20 left-3 max-w-[260px] rounded-xl bg-black/50 p-3 text-xs leading-relaxed text-white backdrop-blur-sm sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:text-sm">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-semibold">Cách di chuyển</span>
              <button
                type="button"
                aria-label="Đóng hướng dẫn"
                onClick={() => onSetHelpOpen(false)}
                className="rounded-full px-2 py-0.5 text-white/80 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                ✕
              </button>
            </div>
            <ul className="list-none space-y-0.5">
              <li>WASD / mũi tên — di chuyển</li>
              <li>Kéo chuột — xoay camera</li>
              <li>Lăn chuột — zoom</li>
              <li>E — tương tác khi lại gần</li>
              <li>Shift — chạy</li>
              <li>Đang lái xe: W ga · S phanh · A/D lái · E xuống xe</li>
            </ul>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Mở hướng dẫn"
            onClick={() => onSetHelpOpen(true)}
            className="pointer-events-auto absolute bottom-[10rem] right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-base text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
          >
            ?
          </button>
        ))}

      {/* Toast. */}
      {toast && (
        <div
          role="status"
          className="absolute left-1/2 top-16 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default CampusHud;
