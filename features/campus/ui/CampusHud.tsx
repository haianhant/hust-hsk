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
import { FAST_TRAVEL_DESTINATIONS } from '../../../lib/campus';
import type { Progress } from '../../../lib/learn/types';
import type { MultiplayerSnapshot } from '../../../lib/multiplayer';
import { bikeInput, playerInput, type TimeOfDay } from '../../../lib/playerState';
import type { HandbookTab } from '../../learning/hsk/EntryScreen';
import type { LearningPanelType } from '../../learning/hsk/LearningOverlayModal';
import { MultiplayerStatusChip } from '../../social/multiplayer/MultiplayerStatusBar';
import type { FocusRuntimePolicy } from '../../study/focus-mode/focus-mode';
import type { PomodoroState } from '../../study/pomodoro/timer';
import { usePomodoro } from '../../study/pomodoro/usePomodoro';
import { getHook } from '../interaction/bridge';

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
      {hasActivePomodoro
        ? `🍅 Tự học · ${displayRemainingMmSs}${evaluation.state.running ? '' : ' (Tạm dừng)'}`
        : '🍅 Tự học'}
    </button>
  );
}

export interface CampusHudProps {
  inClassroom: boolean;
  inLibraryLobby: boolean;
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
  onReconcileStudyAt?: (nowMs: number) => void;
  onExitFocusMode?: () => void;
  onDismissNoVoice: () => void;
  onSetPanel: (panel: LearningPanelType) => void;
  onSetReReviewIds: (ids: string[] | null) => void;
  onFastTravel: (destId: string) => void;
  onSetFastTravelOpen: (updater: (prev: boolean) => boolean) => void;
  onCycleTimeOfDay: () => void;
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
  soundOn,
  speechRate,
  objectiveText,
  interactLabel,
  fastTravelOpen,
  traveling,
  helpOpen,
  toast,
  pomodoro,
  focusPolicy,
  onOpenStudyPanel,
  onReconcileStudyAt,
  onExitFocusMode,
  onDismissNoVoice,
  onSetPanel,
  onSetReReviewIds,
  onFastTravel,
  onSetFastTravelOpen,
  onCycleTimeOfDay,
  onToggleOutfit,
  onOpenLessons,
  onOpenHandbook,
  onToggleSound,
  onCycleRate,
  onExitLibraryLobby,
  onExitClassroom,
  onInteract,
  onSetHelpOpen,
  onShowToast,
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

      {/* Góc trên-phải: minimap + nút ngày/đêm, sổ tay, âm thanh, tốc độ, đổi bài. */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        {!inClassroom && !inLibraryLobby && !hideNav && <Minimap onFastTravel={onFastTravel} />}
        <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
          {onOpenStudyPanel && (
            <StudyHudButton
              pomodoro={pomodoro}
              onOpenStudyPanel={onOpenStudyPanel}
              onReconcileStudyAt={onReconcileStudyAt}
            />
          )}
          {!hideNav && (
            <button
              id="toggle-time"
              type="button"
              onClick={onCycleTimeOfDay}
              aria-label="Chuyển đổi thời gian Ngày / Hoàng hôn / Đêm"
              className="rounded-full bg-black/50 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              {timeOfDay === 'day' ? '☀️ Ngày' : timeOfDay === 'sunset' ? '🌇 Hoàng hôn' : '🌙 Đêm'}
            </button>
          )}
          {!hideNav && (
            <button
              id="toggle-outfit"
              data-testid="hud-outfit-btn"
              type="button"
              onClick={onToggleOutfit}
              aria-label="Nhân vật và trang phục"
              className="rounded-full bg-black/50 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
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
          (trên nhân vật một chút để không che người) để người mới nhìn là
          thấy ngay — trước đây chỉ là viên thuốc nhỏ ở mép dưới, dễ bỏ qua. */}
      {interactLabel && panel === null && !lessonsOpen && (
        <div className="pointer-events-none absolute left-1/2 top-[36%] z-20 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="animate-pulse rounded-3xl bg-black/75 px-6 py-5 shadow-2xl backdrop-blur-sm sm:px-8">
            <span className="mr-4 inline-block rounded-2xl bg-white px-5 py-2 align-middle text-4xl font-black text-black shadow">
              E
            </span>
            <span className="align-middle text-2xl font-bold leading-tight text-white sm:text-3xl">
              {interactLabel.replace(/^E — /, '')}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            Bấm phím E — hoặc nút ✋ Tương tác ở góc dưới phải
          </p>
        </div>
      )}

      {/* Góc dưới-phải: về vị trí an toàn + nút Tương tác (mobile). */}
      <div className="absolute bottom-4 right-3 flex flex-col items-end gap-2">
        {/* Đợt 3 giai đoạn 5 — dịch chuyển nhanh: nút mở panel + danh sách
            6 điểm đến (mở ngay từ đầu). Panel hiện phía trên nút. */}
        {!hideNav && fastTravelOpen && (
          <div
            data-testid="fast-travel-panel"
            className="pointer-events-auto w-[248px] rounded-2xl bg-white p-2 shadow-2xl"
          >
            <p className="px-2 pb-1 pt-1 text-sm font-bold text-[#1c2b1f]">🚀 Đi nhanh tới…</p>
            {FAST_TRAVEL_DESTINATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                data-testid={`fast-travel-${d.id}`}
                disabled={traveling}
                onClick={() => onFastTravel(d.id)}
                className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-[#1c5c3a]/10 disabled:opacity-50"
              >
                <span className="text-lg">{d.icon}</span>
                <span>
                  <span className="block text-sm font-bold text-[#2B2B2B]">{d.name}</span>
                  <span className="block text-xs text-[#2B2B2B]/60">{d.desc}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {!hideNav && (
          <button
            id="fast-travel"
            type="button"
            disabled={traveling}
            onClick={() => onSetFastTravelOpen((o) => !o)}
            className="pointer-events-auto rounded-full bg-[#1c5c3a] px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[#16492e] disabled:opacity-60"
          >
            🚀 Đi nhanh
          </button>
        )}
        {/* Đợt 3 giai đoạn 4 — xe máy: chỉ ngoài sân (không gọi xe trong
            phòng học); "Gọi xe" ẩn khi đang lái vì đã ngồi trên xe rồi. */}
        {!hideMove && !inClassroom && !inLibraryLobby && !riding && (
          <button
            id="call-bike"
            type="button"
            onClick={() => {
              const r = getHook()?.callBike?.();
              if (r?.ok) onShowToast('Xe đang tới chỗ bạn.');
              else if (r?.reason === 'classroom') onShowToast('Đang trong phòng học thì không gọi xe được.');
              else onShowToast('Quanh đây không có chỗ trống để đỗ xe.');
            }}
            className="pointer-events-auto rounded-full bg-[#1c5c3a] px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[#16492e]"
          >
            🛵 Gọi xe
          </button>
        )}
        {!hideMove && !inClassroom && !inLibraryLobby && (
          <button
            id="recall-bike"
            type="button"
            onClick={() => {
              const r = getHook()?.recallBike?.();
              if (r?.ok) onShowToast('Xe đã về đường gần nhất.');
              else onShowToast('Chưa đưa xe về đường được — thử lại sau.');
            }}
            className="pointer-events-auto rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            🛵 Đưa xe về đường
          </button>
        )}
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
              // Thoát được cả khi panel học đang mở (trước đây chỉ thoát
              // khi panel đóng nên học dở trong lớp thì kẹt). relative z-30
              // để nút nổi trên panel dạng bottom sheet (z-20) trên mobile;
              // các nút HUD khác vẫn nằm dưới sheet như trước để khỏi che
              // nút trong bảng học.
              onSetPanel(null);
              onSetReReviewIds(null);
              onExitClassroom();
            }}
            className="pointer-events-auto relative z-30 rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            🚪 Ra khỏi phòng
          </button>
        )}
        <button
          id="interact-button"
          type="button"
          onClick={onInteract}
          className="pointer-events-auto rounded-full bg-[#A54432] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#8A3828]"
        >
          ✋ Tương tác
        </button>
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

      {/* Góc dưới-trái: joystick (chỉ hiện trên thiết bị cảm ứng). */}
      {!hideMove && (
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
              <li>E — tương tác</li>
              <li>Shift — chạy</li>
              <li>🛵 Gọi xe — nút “Gọi xe” góc dưới-phải</li>
              <li>Đang lái: W ga · S phanh · A/D lái · E xuống xe (khi dừng)</li>
              <li>🚀 Đi nhanh — nút “Đi nhanh” góc dưới-phải / trên bản đồ</li>
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
