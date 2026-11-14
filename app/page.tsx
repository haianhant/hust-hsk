'use client';

// ---------------------------------------------------------------------------
// app/page.tsx — Composition root cho ứng dụng HUSTVerse — Bách Khoa 3D.
// - Điều phối không gian mô phỏng 3D ĐHBK Hà Nội, nhân vật & multiplayer,
//   Tự học Pomodoro Cloud (Thư viện Tạ Quang Bửu 10 tầng), Sổ tay Khám phá 9
//   tòa nhà, và Chế độ Học tiếng Trung (HSK Mode) có thể bật/tắt tùy chọn.
// ---------------------------------------------------------------------------

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadGameModes, saveGameModes } from '../lib/gameModes';
import {
  bikeState,
  playerState,
  type CameraViewMode,
  type CampusTitleId,
  type HeldDrinkId,
  type SchoolBadgeId,
  type TimeOfDay,
} from '../lib/playerState';
import {
  CAMPUS_DRINK_STALLS,
  CLASSROOM,
  FAST_TRAVEL_DESTINATIONS,
  SPAWN,
  nearestZone,
} from '../lib/campus';
import { ALL_HSK3_LEXEMES as LEXEMES, HSK3_LESSON_LEXEMES } from '../content/hsk3-index';
import { ALL_HSK4_LEXEMES, HSK4_LESSON_LEXEMES } from '../content/hsk4-index';
import {
  FIRST_LESSON_QUEST,
  getQuestDef,
  type QuestDef,
  type QuestStep,
} from '../lib/learn/quest-data';
import type { Lexeme, Progress } from '../lib/learn/types';
import {
  awardQuestCompletion,
  getDueWordsIncludingTodayWrong,
  loadProgress,
  markActivityDay,
  markEncountered,
  recordAnswer,
  recordReReview,
  saveProgress,
  todayKey,
} from '../lib/learn/store';
import { speak, stopSpeaking } from '../lib/learn/speech';
import {
  DEFAULT_CHARACTER_PROFILE,
  getReconnectToken,
  getSessionId,
  loadCharacterProfile,
  loadIdentity,
  saveCharacterProfile,
  syncCharacterToPlayerState,
  type CharacterProfile,
  type Identity,
} from '../lib/identity';
import { multiplayer } from '../lib/multiplayer';
import { lofiAudio } from '../lib/lofiAudio';
import { getEarnedGlobalBadgeIds, GLOBAL_BADGES } from '../lib/learn/badges';
import type { PassportMainSection } from '../components/learn/CampusPassportHandbook';
import type { QuestAnswer } from '../components/learn/QuestPanel';
import CharacterCreatorModal from '../components/ui/CharacterCreatorModal';
import { LibraryFloorNav } from '../components/ui/LibraryFloorNav';
import type { HomeworkState } from '../components/three/Classroom';
import BuildingEdTechModal from '../features/campus/checkin/BuildingEdTechModal';
import {
  createEmptyPassportState,
  getCampusLandmarkById,
  getPassportSummary,
  loadCampusPassport,
  recordLandmarkCheckIn,
  recordLandmarkFeatureCollected,
  recordLandmarkQuizSolved,
  saveCampusPassport,
  type CampusLandmarkSpec,
  type CampusPassportState,
} from '../features/campus/checkin/campus-passport';
import {
  createInitialSeatingState,
  evaluateReclaimOutcome,
  evaluateReconnectSeatAction,
  findNearestInteractable,
  getAnyLibrarySeatDefinition,
  getHook,
  isLibraryLobbySeatId,
  LibraryLobbyModal,
  releaseActiveSeatSafely,
  SPEECH_RATES,
  TOAST_MS,
  validateSeatSelection,
  type LibraryLobbyTopic,
} from '../features/campus/interaction';
import {
  CampusHud,
  CampusQuestsModal,
  PHOTO_FILTERS,
  PhotoModeOverlay,
  type PhotoFilterId,
} from '../features/campus/ui';
import {
  CAMPUS_LIFE_QUESTS,
  claimCampusQuest,
  createInitialCampusQuestsState,
  isCampusQuestCompleted,
  loadCampusQuestsState,
  recordCampusQuestMetric,
  saveCampusQuestsState,
  type CampusQuestMetricKey,
  type CampusQuestsState,
} from '../features/campus/quests/campus-quests';
import CampusMemoryWallModal from '../features/social/memory-wall/CampusMemoryWallModal';
import { BoardGameHUD, BoardGameLobby } from '../features/boardgame';
import type { MemoryBoardId } from '../features/social/memory-wall/memory-wall';
import {
  EntryScreen,
  LearningOverlayModal,
  LessonPickerCard,
  type HandbookTab,
  type LearningPanelType,
  type ReviewSessionState,
} from '../features/learning/hsk';
import { useMultiplayerBridge } from '../features/social/multiplayer';
import {
  derivePlayerPresence,
  isSamePublicPresence,
} from '../features/social/presence/presence';
import {
  FocusModeView,
  StudyLeaderboardModal,
  StudyPanel,
  useStudySession,
} from '../features/study';
import {
  getSeatDefinition,
  type PlayerStudyPresence,
  type StudyRoomZoneId,
} from '../shared/contracts/study';

// CampusScene chỉ mount sau khi bấm "Vào trường" — tránh autoplay/WebGL
// trước khi người dùng tương tác.
const CampusScene = dynamic(() => import('../components/three/CampusScene'), {
  ssr: false,
});

function computeRealWorldTimeOfDay(now: Date = new Date()): {
  timeOfDay: TimeOfDay;
  clockText: string;
} {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const clockText = `${hh}:${mm}`;
  // 05:30 - 16:59 => Ban ngày; 17:00 - 18:29 => Hoàng hôn; 18:30 - 05:29 => Ban đêm
  if (totalMinutes >= 5 * 60 + 30 && totalMinutes < 17 * 60) {
    return { timeOfDay: 'day', clockText };
  }
  if (totalMinutes >= 17 * 60 && totalMinutes < 18 * 60 + 30) {
    return { timeOfDay: 'sunset', clockText };
  }
  return { timeOfDay: 'night', clockText };
}

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [zone, setZone] = useState(playerState.zone);
  const [viewMode, setViewMode] = useState<CameraViewMode>(playerState.viewMode);
  const [photoMode, setPhotoMode] = useState<boolean>(false);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilterId>('none');
  const [memoryWallOpen, setMemoryWallOpen] = useState<boolean>(false);
  const [memoryWallBoardId, setMemoryWallBoardId] = useState<MemoryBoardId | undefined>(undefined);
  const [campusQuestsOpen, setCampusQuestsOpen] = useState<boolean>(false);
  const [campusQuests, setCampusQuests] = useState<CampusQuestsState>(() =>
    createInitialCampusQuestsState(),
  );
  const [outdoorBenchLabel, setOutdoorBenchLabel] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Hộp "Cách di chuyển" mặc định THU GỌN trong game (mục 7, 06/11): chỉ
  // hiện nút "?" để mở lại; màn hình vào (entry screen) không dùng state này.
  const [helpOpen, setHelpOpen] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [passport, setPassport] = useState<CampusPassportState>(() => createEmptyPassportState());
  const [passportSection, setPassportSection] = useState<PassportMainSection>('checkin');
  const [hskMode, setHskMode] = useState<boolean>(false);
  const hskModeRef = useRef<boolean>(false);
  hskModeRef.current = hskMode;
  const [activeEdTechLandmarkId, setActiveEdTechLandmarkId] = useState<string | null>(null);
  const [panel, setPanel] = useState<LearningPanelType>(null);
  const [handbookTab, setHandbookTab] = useState<HandbookTab>('lesson');
  // Phiên ôn nhanh (Bước 8): mở từ Lịch ôn / Sổ lỗi trong sổ tay.
  const [reviewSession, setReviewSession] = useState<ReviewSessionState | null>(null);
  const [inClassroom, setInClassroom] = useState(false);
  const [inLibraryLobby, setInLibraryLobby] = useState(false);
  const [inBoardGameClub, setInBoardGameClub] = useState(false);
  const [boardGameSeatId, setBoardGameSeatId] = useState<string | null>(null);
  const [nearestBoardGameSeatId, setNearestBoardGameSeatId] = useState<string | null>(null);
  const [boardGameLobbyOpen, setBoardGameLobbyOpen] = useState(false);
  const [boardGameRulesOpen, setBoardGameRulesOpen] = useState(false);
  const [boardGameExitConfirmOpen, setBoardGameExitConfirmOpen] = useState(false);
  const [seatedSeatId, setSeatedSeatId] = useState<string | null>(null);
  const [seatedSeatLabel, setSeatedSeatLabel] = useState<string | null>(null);
  const [nearestSeatId, setNearestSeatId] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [autoTimeOfDay, setAutoTimeOfDay] = useState<boolean>(true);
  const [realClockText, setRealClockText] = useState<string>('');
  const [lofiPlaying, setLofiPlaying] = useState<boolean>(true);
  const lofiManuallyPausedRef = useRef<boolean>(false);
  const [outfitOpen, setOutfitOpen] = useState(false);
  const [characterProfile, setCharacterProfile] = useState<CharacterProfile>(DEFAULT_CHARACTER_PROFILE);
  const [lobbyModal, setLobbyModal] = useState<LibraryLobbyTopic | null>(null);
  const [libraryExtraModal, setLibraryExtraModal] = useState<'piano' | 'telescope' | 'elevator' | null>(null);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [homework, setHomework] = useState<HomeworkState>('desk');
  const [actionDone, setActionDone] = useState(false);
  const [interactLabel, setInteractLabel] = useState<string | null>(null);
  // Đợt 3 giai đoạn 4 — xe máy: HUD đọc bikeState mỗi 200 ms (cùng poll
  // vật tương tác), không re-render mỗi frame.
  const [riding, setRiding] = useState(false);
  const [bikeSpeed, setBikeSpeed] = useState(0);
  const lastBikeNoticeRef = useRef(0);
  // Đợt 5 multiplayer + Việc 2 nhân vật — đọc hồ sơ nhân vật & identity đã lưu
  // SAU khi mount (client-only) để tránh lỗi hydration React #425/#418.
  const [savedIdentity, setSavedIdentity] = useState<Identity | null>(null);
  const [identityName, setIdentityName] = useState<string>('');
  const [identityMssv, setIdentityMssv] = useState<string>('');
  const mpSnap = useMultiplayerBridge(entered);

  useEffect(() => {
    const savedModes = loadGameModes();
    setHskMode(savedModes.hskMode);
    playerState.hskMode = savedModes.hskMode;
    hskModeRef.current = savedModes.hskMode;
    setPassport(loadCampusPassport());
    setCampusQuests(loadCampusQuestsState());
    const saved = loadIdentity();
    const savedChar = loadCharacterProfile() ?? {
      ...DEFAULT_CHARACTER_PROFILE,
      name: saved?.name ?? DEFAULT_CHARACTER_PROFILE.name,
      mssv: saved?.mssv ?? DEFAULT_CHARACTER_PROFILE.mssv,
    };
    setCharacterProfile(savedChar);
    syncCharacterToPlayerState(savedChar);
    if (saved) {
      setSavedIdentity(saved);
      setIdentityName(saved.name);
      setIdentityMssv(saved.mssv);
    }
  }, []);

  // Tự động đồng bộ Ngày / Hoàng hôn / Đêm theo giờ thực ngoài đời (cập nhật mỗi 15 giây)
  useEffect(() => {
    const syncRealClock = () => {
      const { timeOfDay: realTod, clockText } = computeRealWorldTimeOfDay(new Date());
      setRealClockText(clockText);
      if (autoTimeOfDay) {
        setTimeOfDay(realTod);
        playerState.timeOfDay = realTod;
      }
    };
    syncRealClock();
    const timer = window.setInterval(syncRealClock, 15_000);
    return () => window.clearInterval(timer);
  }, [autoTimeOfDay]);

  // Đồng bộ trạng thái nhạc Lofi Chill từ Web Audio engine & tự động phát khi vào game
  useEffect(() => {
    const unsub = lofiAudio.subscribe((snap) => {
      setLofiPlaying(snap.playing);
    });
    if (!lofiManuallyPausedRef.current) {
      lofiAudio.start();
    }
    return () => {
      unsub();
      lofiAudio.stop();
    };
  }, []);

  useEffect(() => {
    if (entered && !lofiManuallyPausedRef.current) {
      lofiAudio.start();
    }
  }, [entered]);

  const [noVoice, setNoVoice] = useState(false);
  const noVoiceDismissedRef = useRef(false);
  const [fade, setFade] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [fastTravelOpen, setFastTravelOpen] = useState(false);
  const [traveling, setTraveling] = useState(false);
  const travelingRef = useRef(false);
  const [recallResults, setRecallResults] = useState<{ lexemeId: string; correct: boolean }[]>([]);
  const [rewardAlreadyGiven, setRewardAlreadyGiven] = useState(false);
  const [reReviewIds, setReReviewIds] = useState<string[] | null>(null);
  const [, setReReviewResults] = useState<{ lexemeId: string; correct: boolean }[]>([]);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<Progress | null>(null);
  const interactableRef = useRef<string | null>(null);
  const panelRef = useRef<typeof panel>(null);
  const lastYawSaveRef = useRef<{ yaw: number; pitch: number; at: number } | null>(null);
  const badgesBeforeQuestRef = useRef<string[]>([]);
  panelRef.current = panel;

  // Toàn bộ 1057 từ (HSK 3 246 + HSK 4 811)
  const ALL_LEXEMES = useMemo(
    () => [...(LEXEMES as unknown as Lexeme[]), ...ALL_HSK4_LEXEMES],
    [],
  );

  const lexemeById = useMemo(() => {
    const m: Record<string, Lexeme> = {};
    for (const l of ALL_LEXEMES) m[l.id] = l;
    return m;
  }, [ALL_LEXEMES]);

  const questState = progress?.questState ?? null;
  const questActive = !!questState && !questState.done;
  const stepIndex = questState?.stepIndex ?? 0;
  const currentQuestDef: QuestDef =
    getQuestDef(questState?.questId ?? '') ?? (getQuestDef('first-lesson') as QuestDef);
  const currentQuest = currentQuestDef.quest;
  const currentSteps = currentQuestDef.steps;
  const step: QuestStep | undefined = questActive ? currentSteps[stepIndex] : undefined;
  const questDoneBefore = !!progress?.completedQuests?.[FIRST_LESSON_QUEST.id];
  const currentQuestDone = !!progress?.completedQuests?.[currentQuest.id];
  const anyQuestDone = !!progress && Object.keys(progress.completedQuests ?? {}).length > 0;
  const currentLessonLexemes: Lexeme[] =
    HSK3_LESSON_LEXEMES[currentQuest.lessonId] ??
    HSK4_LESSON_LEXEMES[currentQuest.lessonId] ??
    (LEXEMES as unknown as Lexeme[]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const bumpQuestMetric = useCallback(
    (
      metricKey: CampusQuestMetricKey,
      options?: { setAbsolute?: number; increment?: number; uniqueFlag?: string },
    ) => {
      setCampusQuests((prev) => {
        const res = recordCampusQuestMetric(prev, metricKey, options);
        if (res.next !== prev) {
          saveCampusQuestsState(res.next);
        }
        if (res.newlyCompletedQuestIds.length > 0) {
          window.setTimeout(() => {
            showToast('🎉 Hoàn thành nhiệm vụ Bách Khoa! Mở "🎒 Nhiệm vụ SV" để nhận thưởng!');
          }, 0);
        }
        return res.next;
      });
    },
    [showToast],
  );
  const bumpQuestMetricRef = useRef(bumpQuestMetric);
  bumpQuestMetricRef.current = bumpQuestMetric;

  useEffect(() => {
    const total = Object.keys(passport.checkedInAt).length;
    if (total > 0) {
      bumpQuestMetricRef.current('checkins', { setAbsolute: total });
    }
  }, [passport.checkedInAt]);

  const study = useStudySession({ onNotify: showToast });
  const bindSeatRef = useRef(study.bindSeat);
  bindSeatRef.current = study.bindSeat;

  // PR8/PR9 — Đồng bộ trạng thái ngồi ghế thư viện từ Player sang React state, Study Session & Server
  useEffect(() => {
    const onSeatChange = (e: Event) => {
      const d = (
        e as CustomEvent<{
          seated: boolean;
          seatId: string | null;
          seatLabel: string | null;
          studyRoomId: StudyRoomZoneId | null;
        }>
      ).detail;
      if (!d) return;
      setSeatedSeatId(d.seated ? d.seatId : null);
      setSeatedSeatLabel(d.seated ? d.seatLabel : null);
      multiplayer.setLocalSeatedSeatId(d.seated ? d.seatId : null);
      bindSeatRef.current(
        d.seated
          ? (d.studyRoomId ?? 'library-lobby')
          : playerState.inLibraryLobby
            ? 'library-lobby'
            : null,
        d.seated ? d.seatId : null,
      );
      if (!d.seated) {
        const snap = multiplayer.snapshot;
        if (snap.mySeatId || snap.seatClaimState === 'requesting') {
          multiplayer.requestSeatRelease(snap.mySeatId);
        }
      }
    };
    window.addEventListener('bkhn:seat-change', onSeatChange);
    return () => window.removeEventListener('bkhn:seat-change', onSeatChange);
  }, []);

  const handleSitAtSeat = useCallback(
    (seatId: string) => {
      const snap = multiplayer.snapshot;
      const remoteOcc = snap.seatMap[seatId];

      // 1. Nếu ghế đang có sinh viên khác giữ chỗ trong phòng multiplayer hiện tại -> từ chối ngay
      if (snap.status === 'online' && remoteOcc && remoteOcc.occupantId !== snap.selfId) {
        showToast(
          `🪑 Ghế này đang có ${remoteOcc.occupantName || 'sinh viên khác'} ngồi học. Hãy chọn ghế trống khác nhé!`,
        );
        return;
      }

      // 2. Kiểm tra điều kiện cục bộ (khoảng cách <= 1.65m, đang trong sảnh, không lái xe, v.v.)
      const currentSeating =
        playerState.seated && playerState.seatId
          ? {
              ...createInitialSeatingState(),
              status: 'seated' as const,
              seatId: playerState.seatId,
            }
          : createInitialSeatingState();

      const localCheck = validateSeatSelection({
        seatId,
        playerPos: playerState.pos,
        inLibraryLobby: playerState.inLibraryLobby,
        libraryFloor: playerState.libraryFloor,
        inClassroom: playerState.inClassroom,
        bikeRiding: bikeState.riding,
        uiLocked: playerState.uiLocked,
        currentSeating,
      });

      if (!localCheck.ok) {
        if (localCheck.reason === 'too-far') {
          showToast('Hãy bước lại gần ghế hơn để ngồi học.');
        } else if (localCheck.reason === 'already-seated-other') {
          showToast('Bạn đang ngồi ở ghế khác — hãy bấm Đứng dậy trước khi đổi ghế.');
        } else if (localCheck.reason === 'riding-bike') {
          showToast('Không thể ngồi ghế học khi đang lái xe.');
        } else if (localCheck.reason === 'already-seated-same') {
          study.setStudyPanelOpen(true);
        } else {
          showToast(localCheck.message ?? 'Chưa thể ngồi vào ghế này.');
        }
        return;
      }

      // 3. Nếu đây là 1 trong 4 ghế sảnh tầng 1 có đồng bộ Multiplayer (Server-Authoritative PR9)
      if (
        isLibraryLobbySeatId(seatId) &&
        snap.status === 'online' &&
        snap.selfId &&
        snap.studyRevision > 0
      ) {
        if (snap.seatClaimState === 'requesting' && snap.pendingSeatRequest?.seatId === seatId) {
          return;
        }
        void multiplayer
          .requestSeatClaim(seatId, {
            subjectTag: study.session.subjectTag,
            pomodoroPhase: study.session.pomodoro.phase,
          })
          .then((outcome) => {
            if (!outcome.ok) {
              if (outcome.reason === 'cancelled' || outcome.reason === 'pending-request') {
                return;
              }
              if (outcome.reason === 'already-occupied') {
                showToast(
                  `🪑 Ghế này vừa có ${outcome.occupiedByName || 'bạn khác'} ngồi trước rồi. Hãy chọn ghế trống khác nhé!`,
                );
              } else if (outcome.reason === 'timeout') {
                showToast('⏳ Hết thời gian giữ chỗ — vui lòng thử lại.');
              } else if (outcome.reason === 'offline') {
                const rOffline = getHook()?.sitAtSeat?.(seatId);
                if (rOffline?.ok) {
                  showToast(
                    `🪑 Đang ngồi học tại ${localCheck.seat.label}. Bấm "🍅 Tự học" để bắt đầu Pomodoro! (Chế độ ngoại tuyến)`,
                  );
                }
              } else {
                showToast('Chưa thể giữ chỗ ngồi này — vui lòng thử lại.');
              }
              return;
            }

            // Sau khi server xác nhận, kiểm tra lại người chơi còn đứng gần ghế trong sảnh không
            const r = getHook()?.sitAtSeat?.(seatId);
            if (r?.ok) {
              showToast(
                `🪑 Đang ngồi học tại ${localCheck.seat.label}. Bấm "🍅 Tự học" để bắt đầu Pomodoro!`,
              );
            } else {
              // Người chơi đã bước đi xa hoặc rời sảnh trong lúc gói tin đang bay -> trả lại ghế ngay
              multiplayer.requestSeatRelease(seatId);
              if (r?.reason === 'too-far') {
                showToast('Hãy bước lại gần ghế hơn để ngồi học.');
              }
            }
          });
        return;
      }

      // 4. Bàn ghế ở các tầng khác (T1 sofa, T2–T10) hoặc chế độ ngoại tuyến: cho phép ngồi học ngay
      const r = getHook()?.sitAtSeat?.(seatId);
      if (r?.ok) {
        if (seatId === 'tqb-6f-piano-bench') {
          setLibraryExtraModal('piano');
          showToast(
            '🎹 Đã ngồi vào ghế Đại dương cầm Tầng 6 — bấm các phím đàn để tấu nhạc cho mọi người cùng nghe!',
          );
        } else if (seatId.startsWith('tqb-10f-bed-') || seatId.startsWith('tqb-10f-lounger-')) {
          showToast(
            `🛏️ Đang nằm thư giãn trên ${localCheck.seat.label} ngắm toàn cảnh ĐHBK Hà Nội!`,
          );
        } else {
          const suffix =
            isLibraryLobbySeatId(seatId) && snap.status !== 'online' ? ' (Chế độ ngoại tuyến)' : '';
          showToast(
            `🪑 Đang ngồi học tại ${localCheck.seat.label}. Bấm "🍅 Tự học" để bắt đầu Pomodoro!${suffix}`,
          );
        }
      } else {
        showToast(r?.message ?? 'Chưa thể ngồi vào ghế này.');
      }
    },
    [showToast, study],
  );

  const handleStandUp = useCallback(() => {
    const activeId = seatedSeatId ?? study.session.seatId ?? multiplayer.snapshot.mySeatId;
    multiplayer.setLocalSeatedSeatId(null);
    const r = releaseActiveSeatSafely({
      driver: study.focusPolicy.suspend3DRendering ? undefined : getHook(),
      fallbackSeatId: activeId,
    });
    if (activeId || multiplayer.snapshot.mySeatId) {
      multiplayer.requestSeatRelease(activeId);
    }
    if (r.released) {
      setSeatedSeatId(null);
      setSeatedSeatLabel(null);
      showToast('🚶 Đã đứng dậy khỏi bàn học.');
    }
  }, [seatedSeatId, showToast, study.focusPolicy.suspend3DRendering, study.session.seatId]);

  const handleEndStudySession = useCallback(() => {
    const activeId = seatedSeatId ?? study.session.seatId ?? multiplayer.snapshot.mySeatId;
    multiplayer.setLocalSeatedSeatId(null);
    releaseActiveSeatSafely({
      driver: study.focusPolicy.suspend3DRendering ? undefined : getHook(),
      fallbackSeatId: activeId,
    });
    if (activeId || multiplayer.snapshot.mySeatId) {
      multiplayer.requestSeatRelease(activeId);
    }
    setSeatedSeatId(null);
    setSeatedSeatLabel(null);
    study.endSession();
  }, [seatedSeatId, study]);

  // PR9 (FIX 5) — Đồng bộ & đối soát quyền giữ ghế khi kết nối lại (study:room-snapshot)
  // hoặc khi có thông báo chiếm ghế có thẩm quyền từ server (bkhn:mp-seat-claimed)
  useEffect(() => {
    const forceStandUpFromLostSeat = (seatId: string, occupiedByName?: string) => {
      multiplayer.setLocalSeatedSeatId(null);
      releaseActiveSeatSafely({
        driver: study.focusPolicy.suspend3DRendering ? undefined : getHook(),
        fallbackSeatId: seatId,
      });
      setSeatedSeatId(null);
      setSeatedSeatLabel(null);
      bindSeatRef.current(playerState.inLibraryLobby ? 'library-lobby' : null, null);
      const seatLabel = getSeatDefinition(seatId)?.label ?? seatId;
      if (occupiedByName) {
        showToast(
          `🪑 Ghế ${seatLabel} đã có ${occupiedByName} ngồi khi kết nối lại — bạn đã đứng dậy.`,
        );
      } else {
        showToast(
          `🪑 Không thể giữ lại ghế ${seatLabel} sau khi kết nối lại — bạn đã đứng dậy.`,
        );
      }
    };

    const onStudySnapshot = () => {
      const snap = multiplayer.snapshot;
      const decision = evaluateReconnectSeatAction({
        inLibraryLobby: playerState.inLibraryLobby,
        libraryFloor: playerState.libraryFloor,
        localSeated: playerState.seated,
        localSeatId: playerState.seated ? playerState.seatId : null,
        mpStatus: snap.status,
        selfId: snap.selfId,
        seatMap: snap.seatMap,
      });

      if (decision.action === 'none') {
        return;
      }

      if (decision.action === 'release-stale-server-seat') {
        multiplayer.setLocalSeatedSeatId(null);
        setSeatedSeatId(null);
        setSeatedSeatLabel(null);
        bindSeatRef.current(playerState.inLibraryLobby ? 'library-lobby' : null, null);
        multiplayer.requestSeatRelease(decision.seatId);
        return;
      }

      if (decision.action === 'preserve-confirmed') {
        const seatDef = getSeatDefinition(decision.seatId);
        multiplayer.setLocalSeatedSeatId(decision.seatId);
        setSeatedSeatId(decision.seatId);
        setSeatedSeatLabel(seatDef?.label ?? decision.seatId);
        bindSeatRef.current('library-lobby', decision.seatId);
        return;
      }

      if (decision.action === 'stand-up-occupied') {
        if (decision.releaseServerSeatId) {
          multiplayer.requestSeatRelease(decision.releaseServerSeatId);
        }
        forceStandUpFromLostSeat(decision.seatId, decision.occupiedByName);
        return;
      }

      if (decision.action === 'reclaim-available') {
        const targetSeatId = decision.seatId;
        const previousServerSeatId = decision.previousServerSeatId ?? null;
        void multiplayer
          .requestSeatClaim(targetSeatId, {
            subjectTag: study.session.subjectTag,
            pomodoroPhase: study.session.pomodoro.phase,
          })
          .then((outcome) => {
            const postDecision = evaluateReclaimOutcome({
              targetSeatId,
              outcome,
              currentlyInLibraryLobby: playerState.inLibraryLobby,
              currentLibraryFloor: playerState.libraryFloor,
              currentlySeated: playerState.seated,
              currentLocalSeatId: playerState.seated ? playerState.seatId : null,
              previousServerSeatId,
            });

            if (postDecision.action === 'keep-seated') {
              const seatDef = getSeatDefinition(postDecision.seatId);
              multiplayer.setLocalSeatedSeatId(postDecision.seatId);
              setSeatedSeatId(postDecision.seatId);
              setSeatedSeatLabel(seatDef?.label ?? postDecision.seatId);
              bindSeatRef.current('library-lobby', postDecision.seatId);
            } else if (postDecision.action === 'release-server-seat') {
              multiplayer.requestSeatRelease(postDecision.seatId);
            } else if (postDecision.action === 'stand-up-failed') {
              if (postDecision.releaseServerSeatId) {
                multiplayer.requestSeatRelease(postDecision.releaseServerSeatId);
              }
              forceStandUpFromLostSeat(
                postDecision.seatId,
                postDecision.occupiedByName,
              );
            }
          });
      }
    };

    const onRemoteSeatClaimed = (e: Event) => {
      const d = (
        e as CustomEvent<{
          occupancy?: { seatId: string; occupantId: string; occupantName?: string };
        }>
      ).detail;
      const occ = d?.occupancy;
      if (!occ || !playerState.inLibraryLobby || !playerState.seated) return;
      const snap = multiplayer.snapshot;
      if (
        snap.selfId &&
        occ.occupantId !== snap.selfId &&
        playerState.seatId === occ.seatId
      ) {
        forceStandUpFromLostSeat(occ.seatId, occ.occupantName || 'bạn khác');
      }
    };

    window.addEventListener('bkhn:mp-study-snapshot', onStudySnapshot);
    window.addEventListener('bkhn:mp-seat-claimed', onRemoteSeatClaimed);
    return () => {
      window.removeEventListener('bkhn:mp-study-snapshot', onStudySnapshot);
      window.removeEventListener('bkhn:mp-seat-claimed', onRemoteSeatClaimed);
    };
  }, [
    showToast,
    study.focusPolicy.suspend3DRendering,
    study.session.pomodoro.phase,
    study.session.subjectTag,
  ]);

  // PR9 — Phát sóng trạng thái tự học công khai (Presence) khi có chuyển đổi trạng thái thực sự
  const currentPresence = useMemo(
    () =>
      derivePlayerPresence({
        session: study.session,
        inClassroom,
        inLibraryLobby,
        activeSeatId: seatedSeatId,
        nowMs: 0,
      }),
    [
      study.session,
      inClassroom,
      inLibraryLobby,
      seatedSeatId,
    ],
  );
  const lastSentPresenceRef = useRef<PlayerStudyPresence | null>(null);

  useEffect(() => {
    if (!entered || mpSnap.status !== 'online' || !mpSnap.selfId) {
      lastSentPresenceRef.current = null;
      return;
    }
    if (isSamePublicPresence(lastSentPresenceRef.current, currentPresence)) {
      return;
    }
    lastSentPresenceRef.current = currentPresence;
    multiplayer.sendStudyPresence({
      ...currentPresence,
      updatedAtMs: Date.now(),
    });
  }, [entered, mpSnap.status, mpSnap.selfId, currentPresence]);

  // --- Nạp + lưu tiến độ (localStorage, không tài khoản) ----------------------
  useEffect(() => {
    try {
      let p = loadProgress(window.localStorage);
      // Nếu dữ liệu cũ trong localStorage đang dừng ở bước 'review' ("Kiểm tra cuối 5 từ"),
      // tự động chuyển qua bước tiếp theo ('result') để không bao giờ hiện popup Kiểm tra cuối.
      if (p.questState && !p.questState.done) {
        const def = getQuestDef(p.questState.questId) ?? (getQuestDef('first-lesson') as QuestDef);
        let idx = p.questState.stepIndex;
        while (idx < def.steps.length && def.steps[idx]?.kind === 'review') {
          idx += 1;
        }
        if (idx !== p.questState.stepIndex) {
          p = {
            ...p,
            questState: {
              ...p.questState,
              stepIndex: Math.min(idx, Math.max(0, def.steps.length - 1)),
            },
          };
        }
      }
      progressRef.current = p;
      badgesBeforeQuestRef.current = getEarnedGlobalBadgeIds(p);
      setProgress(p);
    } catch {
      // loadProgress lỗi (dữ liệu hỏng): giữ progress null.
    }
  }, []);

  useEffect(() => {
    progressRef.current = progress;
    if (progress) {
      try {
        saveProgress(window.localStorage, progress);
      } catch {
        // Lưu thất bại (đầy bộ nhớ…): không chặn chơi.
      }
    }
  }, [progress]);

  const soundOn = progress?.settings?.soundOn ?? true;
  const speechRate = progress?.settings?.speechRate ?? 1.0;

  const speakText = useCallback(
    (text: string) => {
      if (!soundOn || !hskModeRef.current) return;
      try {
        stopSpeaking();
        speak(text, {
          rate: speechRate,
          onError: () => {
            // Không hiển thị chip cảnh báo thiếu giọng tiếng Trung trên HUD
          },
        });
      } catch {
        // TTS lỗi: không chặn học, người dùng vẫn đọc được chữ.
      }
    },
    [soundOn, speechRate],
  );

  // Khu hiện tại + chế độ camera: đọc playerState.zone/viewMode mỗi 200 ms.
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      setZone(playerState.zone);
      setViewMode(playerState.viewMode);
      if (!playerState.inClassroom) return;
      const yaw = playerState.cameraYaw;
      const pitch = playerState.cameraPitch;
      if (typeof yaw !== 'number' || typeof pitch !== 'number') return;
      const last = lastYawSaveRef.current;
      const now = Date.now();
      if (
        last &&
        Math.abs(last.yaw - yaw) < 0.1 &&
        Math.abs(last.pitch - pitch) < 0.05
      ) {
        return;
      }
      if (last && now - last.at < 1500) return;
      lastYawSaveRef.current = { yaw, pitch, at: now };
      setProgress((prev) => {
        if (!prev || !prev.questState) return prev;
        return { ...prev, questState: { ...prev.questState, yaw, pitch } };
      });
    }, 200);
    return () => clearInterval(id);
  }, [entered]);

  useEffect(() => {
    if (viewMode === 'top') setHelpOpen(false);
  }, [viewMode]);

  // Khi panel học, menu chọn bài, thẻ EdTech công trình, bảng thông tin sảnh thư viện, bảng Tự học, bảng Xếp hạng, Lưu bút, Nhiệm vụ SV hoặc modal nhân vật mở: khóa di chuyển.
  useEffect(() => {
    playerState.uiLocked =
      panel !== null ||
      lessonsOpen ||
      leaderboardOpen ||
      activeEdTechLandmarkId !== null ||
      lobbyModal !== null ||
      outfitOpen ||
      memoryWallOpen ||
      campusQuestsOpen ||
      boardGameLobbyOpen ||
      boardGameRulesOpen ||
      boardGameExitConfirmOpen ||
      study.studyPanelOpen ||
      study.focusPolicy.suspend3DRendering;
    return () => {
      playerState.uiLocked = false;
    };
  }, [
    panel,
    lessonsOpen,
    leaderboardOpen,
    activeEdTechLandmarkId,
    lobbyModal,
    outfitOpen,
    memoryWallOpen,
    campusQuestsOpen,
    boardGameLobbyOpen,
    boardGameRulesOpen,
    boardGameExitConfirmOpen,
    study.studyPanelOpen,
    study.focusPolicy.suspend3DRendering,
  ]);

  useEffect(() => {
    playerState.photoMode = photoMode;
    return () => {
      playerState.photoMode = false;
    };
  }, [photoMode]);

  useEffect(() => {
    if (!entered) return;
    const onPhotoHotkey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      if (e.code === 'Escape' && photoMode) {
        setPhotoMode(false);
        return;
      }
      if (
        e.code === 'KeyP' &&
        !e.repeat &&
        !playerState.uiLocked &&
        !study.focusPolicy.suspend3DRendering
      ) {
        setPhotoMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onPhotoHotkey);
    return () => window.removeEventListener('keydown', onPhotoHotkey);
  }, [entered, photoMode, study.focusPolicy.suspend3DRendering]);

  useEffect(() => {
    if (!entered) return;
    const onViewModeChange = (e: Event) => {
      const d = (e as CustomEvent<{ viewMode?: CameraViewMode }>).detail;
      if (!d?.viewMode) return;
      setViewMode(d.viewMode);
      if (d.viewMode === 'pov') {
        bumpQuestMetricRef.current('cameraMoments');
      }
    };
    const onOutdoorBenchChange = (e: Event) => {
      const d = (e as CustomEvent<{ seated: boolean; benchId: string | null; label?: string }>).detail;
      if (!d) return;
      if (d.seated) {
        setOutdoorBenchLabel(d.label || d.benchId || 'Ghế đá sân trường');
        bumpQuestMetricRef.current('chillLake', { uniqueFlag: 'sat-bench' });
      } else {
        setOutdoorBenchLabel(null);
      }
    };
    const onFootballGoal = (e: Event) => {
      const d = (e as CustomEvent<{ side: 'west' | 'east'; totalGoals: number }>).detail;
      if (!d) return;
      bumpQuestMetricRef.current('footballGoals', { setAbsolute: d.totalGoals });
      showToast(`⚽ VÀOOO! Bạn vừa ghi bàn thắng thứ ${d.totalGoals} tại SVĐ Bách Khoa!`);
    };
    window.addEventListener('bkhn:view-mode', onViewModeChange);
    window.addEventListener('bkhn:outdoor-bench-change', onOutdoorBenchChange);
    window.addEventListener('bkhn:football-goal', onFootballGoal);
    return () => {
      window.removeEventListener('bkhn:view-mode', onViewModeChange);
      window.removeEventListener('bkhn:outdoor-bench-change', onOutdoorBenchChange);
      window.removeEventListener('bkhn:football-goal', onFootballGoal);
    };
  }, [entered, showToast]);

  // Đồng bộ mode phòng học & sảnh thư viện từ hook Player.
  useEffect(() => {
    const onMode = (e: Event) => {
      const d = (e as CustomEvent<{ inClassroom: boolean }>).detail;
      if (d) setInClassroom(d.inClassroom);
    };
    const onLobbyMode = (e: Event) => {
      const d = (e as CustomEvent<{ inLibraryLobby: boolean }>).detail;
      if (d) {
        setInLibraryLobby(d.inLibraryLobby);
        if (!d.inLibraryLobby) {
          setLobbyModal(null);
          setLibraryExtraModal(null);
          multiplayer.setLocalSeatedSeatId(null);
        }
      }
    };
    const onBoardGameMode = (e: Event) => {
      const d = (e as CustomEvent<{ inBoardGameClub: boolean }>).detail;
      if (d) {
        setInBoardGameClub(d.inBoardGameClub);
        if (!d.inBoardGameClub) {
          setBoardGameSeatId(null);
          setBoardGameLobbyOpen(false);
          setBoardGameRulesOpen(false);
          setBoardGameExitConfirmOpen(false);
        }
      }
    };
    const onBoardGameSeat = (e: Event) => {
      const d = (e as CustomEvent<{ seated?: boolean; seatId?: string | null }>).detail;
      if (d) {
        setBoardGameSeatId(d.seated ? d.seatId ?? null : null);
      }
    };
    const onLibraryFloor = (e: Event) => {
      const d = (e as CustomEvent<{ floor: number }>).detail;
      if (!d) return;
      if (d.floor !== 1) {
        setLobbyModal(null);
      }
      const snap = multiplayer.snapshot;
      if (d.floor !== 1 && snap.seatClaimState === 'requesting') {
        multiplayer.cancelPendingSeatClaim();
      }
      const activeSeat = playerState.seatId ?? snap.mySeatId;
      const activeSeatFloor = activeSeat ? (getAnyLibrarySeatDefinition(activeSeat)?.floor ?? 1) : null;
      if ((playerState.seated || snap.mySeatId) && activeSeatFloor !== null && d.floor !== activeSeatFloor) {
        multiplayer.setLocalSeatedSeatId(null);
        releaseActiveSeatSafely({
          driver: getHook(),
          fallbackSeatId: activeSeat,
        });
        if (snap.mySeatId) {
          multiplayer.requestSeatRelease(snap.mySeatId);
        }
        setSeatedSeatId(null);
        setSeatedSeatLabel(null);
        bindSeatRef.current('library-lobby', null);
      }
      if (d.floor !== 6 && d.floor !== 10) {
        setLibraryExtraModal((prev) => (prev === 'piano' || prev === 'telescope' ? null : prev));
      }
    };
    window.addEventListener('bkhn:classroom', onMode);
    window.addEventListener('bkhn:library-lobby', onLobbyMode);
    window.addEventListener('bkhn:library-floor', onLibraryFloor);
    window.addEventListener('bkhn:boardgame-club', onBoardGameMode);
    window.addEventListener('bkhn:boardgame-seat-change', onBoardGameSeat);
    return () => {
      window.removeEventListener('bkhn:classroom', onMode);
      window.removeEventListener('bkhn:library-lobby', onLobbyMode);
      window.removeEventListener('bkhn:library-floor', onLibraryFloor);
      window.removeEventListener('bkhn:boardgame-club', onBoardGameMode);
      window.removeEventListener('bkhn:boardgame-seat-change', onBoardGameSeat);
    };
  }, []);

  // --- Bắt đầu / chơi lại bài HSK tại Giảng đường Tòa C7 -----------------------
  const startQuest = useCallback(
    (questId: string = FIRST_LESSON_QUEST.id, startInsideClassroom = true) => {
      const p = progressRef.current;
      if (!p) return;
      const def = getQuestDef(questId) ?? (getQuestDef('first-lesson') as QuestDef);
      const doorIdx = def.steps.findIndex((s) => s.kind === 'goto');
      const initialStepIndex =
        startInsideClassroom && doorIdx >= 0 && doorIdx + 1 < def.steps.length
          ? doorIdx + 1
          : 0;
      setRecallResults([]);
      setReReviewIds(null);
      setReReviewResults([]);
      setNotebookOpen(false);
      setHomework('desk');
      setActionDone(false);
      setRewardAlreadyGiven(!!p.completedQuests?.[def.quest.id]);
      badgesBeforeQuestRef.current = getEarnedGlobalBadgeIds(p);
      setProgress({
        ...p,
        questState: { questId: def.quest.id, stepIndex: initialStepIndex, done: false },
      });
      setPanel('quest');
    },
    [],
  );

  // --- Gặp từ: đánh dấu encountered khi vào bước có lexemeId -------------------
  useEffect(() => {
    if (!entered || !step || !('lexemeId' in step) || !step.lexemeId) return;
    const id = step.lexemeId;
    setProgress((prev) => {
      if (!prev) return prev;
      return markEncountered(prev, id);
    });
  }, [entered, step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Nói câu tiếng Trung khi vào bước talk / pick-object / choose-number ----
  useEffect(() => {
    if (!entered || !step) return;
    if (step.kind === 'talk' && step.speakText) speakText(step.speakText);
    if (step.kind === 'pick-object') speakText(step.zh);
    if (step.kind === 'choose-number') speakText(step.zh);
    if (step.kind === 'choose-goal') speakText(step.zh);
  }, [entered, step?.id, speakText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chỉ tự động mở bảng câu hỏi khi người chơi ĐANG ở trong Giảng đường Tòa C7 (inClassroom)
  // và tuyệt đối bỏ qua bước 'review' ("Kiểm tra cuối 5 từ").
  useEffect(() => {
    if (!entered || !inClassroom || !step || step.kind === 'goto') return;
    if (step.kind === 'review') {
      advance();
      return;
    }
    setPanel('quest');
  }, [entered, inClassroom, step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Vật tương tác gần nhất (poll 200 ms) ------------------------------------
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      setRiding(bikeState.riding);
      setBikeSpeed(bikeState.speed);
      if (bikeState.notice && bikeState.notice.id !== lastBikeNoticeRef.current) {
        lastBikeNoticeRef.current = bikeState.notice.id;
        showToast(bikeState.notice.text);
      }
      const snapNow = multiplayer.snapshot;
      const occupiedOtherSet = new Set<string>();
      for (const occ of snapNow.seats) {
        if (
          occ.studyRoomId === 'library-lobby' &&
          (!snapNow.selfId || occ.occupantId !== snapNow.selfId) &&
          occ.seatId !== playerState.seatId
        ) {
          occupiedOtherSet.add(occ.seatId);
        }
      }
      const found = findNearestInteractable({
        pos: playerState.pos,
        inClassroom,
        inLibraryLobby,
        inBoardGameClub,
        libraryFloor: playerState.libraryFloor,
        seated: playerState.seated,
        seatId: playerState.seatId,
        boardGameSeatId: playerState.boardGameSeatId,
        occupiedByOtherSeatIds: occupiedOtherSet,
        pendingSeatId: snapNow.pendingSeatRequest?.seatId ?? null,
        outdoorBenchId: playerState.outdoorBenchId,
        footballPos: playerState.footballPos,
        bikeRiding: bikeState.riding,
        bikeSpeed: bikeState.speed,
        bikePos: bikeState.pos,
        questActive,
        questDoneBefore,
        anyQuestDone,
        stepId: step?.id,
        hskMode,
      });
      interactableRef.current = found?.id ?? null;
      setInteractLabel(found?.label ?? null);
      setNearestSeatId(
        found?.id?.startsWith('seat:') ? found.id.slice('seat:'.length) : null,
      );
      setNearestBoardGameSeatId(
        found?.id?.startsWith('bg-seat:') ? found.id.slice('bg-seat:'.length) : null,
      );
    }, 200);
    return () => clearInterval(id);
  }, [entered, inClassroom, inLibraryLobby, inBoardGameClub, questActive, questDoneBefore, anyQuestDone, step?.id, hskMode, showToast]);

  // --- Ghi đáp án vào store -----------------------------------------------------
  const handleAnswer = useCallback((a: QuestAnswer) => {
    const p = progressRef.current;
    if (!p || !a.lexemeId) return;
    const questId = p.questState?.questId ?? FIRST_LESSON_QUEST.id;
    setProgress(
      recordAnswer(p, {
        lexemeId: a.lexemeId,
        correct: a.correct,
        usedHint: a.usedHint,
        activity: a.activity,
        questId,
        firstTry: a.firstTry ?? true,
      }),
    );
    if (a.activity === 'fill' && a.correct && questId === FIRST_LESSON_QUEST.id) setHomework('teacher');
  }, []);

  const handleReviewAnswer = useCallback((correct: boolean, lexemeId: string) => {
    const p = progressRef.current;
    if (!p) return;
    setProgress(
      recordAnswer(p, {
        lexemeId,
        correct,
        usedHint: false,
        activity: 'review',
        questId: p.questState?.questId ?? FIRST_LESSON_QUEST.id,
        firstTry: true,
      }),
    );
    setRecallResults((prev) => [...prev, { lexemeId, correct }]);
  }, []);

  const handleReReviewAnswer = useCallback((correct: boolean, lexemeId: string) => {
    const p = progressRef.current;
    if (!p) return;
    setProgress(recordReReview(p, lexemeId, correct));
    setReReviewResults((prev) => [...prev, { lexemeId, correct }]);
  }, []);

  const advance = useCallback(() => {
    setActionDone(false);
    setProgress((prev) => {
      if (!prev || !prev.questState) return prev;
      const def = getQuestDef(prev.questState.questId) ?? (getQuestDef('first-lesson') as QuestDef);
      let nextIdx = prev.questState.stepIndex + 1;
      // Bỏ qua bước kiểm tra cuối 5 từ (kind === 'review') theo thiết kế học bài mới tại Tòa C7
      while (nextIdx < def.steps.length && def.steps[nextIdx]?.kind === 'review') {
        nextIdx += 1;
      }
      if (nextIdx >= def.steps.length) return prev;
      return { ...prev, questState: { ...prev.questState, stepIndex: nextIdx } };
    });
  }, []);

  // --- Hành động với vật trong phòng (vở / bài tập) ------------------------------
  const handleObjectAction = useCallback(
    (objectId: 'notebook' | 'homework') => {
      if (!questActive || !step || step.kind !== 'interact-object' || step.objectId !== objectId) {
        return;
      }
      if (objectId === 'notebook') setNotebookOpen(true);
      if (objectId === 'homework') setHomework('hand');
      setActionDone(true);
      const p = progressRef.current;
      if (p) setProgress(markEncountered(p, step.lexemeId));
    },
    [questActive, step],
  );

  // Bấm vật 3D trong phòng (raycast onClick) — kiểm tra khoảng cách rồi mới tính.
  const handleObjectClick = useCallback(
    (id: string) => {
      if (panelRef.current === 'handbook') return;
      if (id.startsWith('seat:')) {
        const seatId = id.slice('seat:'.length);
        handleSitAtSeat(seatId);
        return;
      }
      const pos = playerState.pos;
      const near = (x: number, z: number, r: number) => Math.hypot(pos.x - x, pos.z - z) <= r;
      if (id === 'statue') {
        if (playerState.libraryFloor !== 1) return;
        setLobbyModal('statue');
        speakText('谢光宝教授图书馆');
        return;
      }
      if (id === 'vocab-board') {
        if (playerState.libraryFloor !== 1 || !hskModeRef.current) return;
        setLobbyModal('vocab-board');
        speakText('图书馆，科学，技术，借书，阅读');
        return;
      }
      if (id === 'info-desk') {
        if (playerState.libraryFloor !== 1) return;
        setLobbyModal('info-desk');
        speakText('你好，我想借书');
        return;
      }
      if (id === 'piano-6f') {
        if (playerState.libraryFloor !== 6) return;
        if (playerState.seatId !== 'tqb-6f-piano-bench') {
          if (playerState.seated) {
            getHook()?.standUp?.();
          }
          if (Math.hypot(playerState.pos.x - -6.986, playerState.pos.z - 2.634) > 1.55) {
            getHook()?.teleport?.(-7.23, 2.02, 0.38 + Math.PI);
          }
          getHook()?.sitAtSeat?.('tqb-6f-piano-bench');
        }
        setLibraryExtraModal('piano');
        showToast('🎹 Đại dương cầm Tầng 6 — bấm các phím đàn trên thanh Piano để tấu nhạc!');
        return;
      }
      if (id === 'telescope-10f') {
        if (playerState.libraryFloor !== 10) return;
        setLibraryExtraModal('telescope');
        speakText('天文望远镜，星空，银河');
        return;
      }
      if (id === 'board') {
        if (!near(CLASSROOM.board.x, CLASSROOM.board.z, 2.5)) {
          showToast('Hãy đến gần bảng hơn để chọn.');
          return;
        }
        window.dispatchEvent(new CustomEvent('bkhn:quest-object', { detail: { id: 'board' } }));
        return;
      }
      if (id === 'notebook' || id === 'homework') {
        if (!near(CLASSROOM.notebook.x, CLASSROOM.notebook.z, 2)) {
          showToast('Hãy đến gần bàn 1 hơn.');
          return;
        }
        handleObjectAction(id);
        return;
      }
      if (step?.kind === 'pick-object') {
        window.dispatchEvent(new CustomEvent('bkhn:quest-object', { detail: { id } }));
      }
    },
    [handleObjectAction, handleSitAtSeat, showToast, speakText, step?.kind],
  );

  // --- Check-in & Thu thập Tính năng Sáng tạo tại 9 tòa nhà ĐHBK Hà Nội -------
  const stampLandmarkCheckin = useCallback(
    (landmarkId: string, alsoCollectFeature = false) => {
      setPassport((prev) => {
        let res = recordLandmarkCheckIn(prev, landmarkId);
        let next = res.next;
        if (alsoCollectFeature) {
          next = recordLandmarkFeatureCollected(next, landmarkId).next;
        }
        if (next !== prev) {
          saveCampusPassport(next);
        }
        if (res.isFirstTime) {
          const lm = getCampusLandmarkById(landmarkId);
          setProgress((p) => (p ? { ...p, points: (p.points ?? 0) + 10 } : p));
          if (lm) {
            showToast(`📍 Check-in thành công: ${lm.shortName} (+10 điểm Khám phá Bách Khoa!)`);
          }
        }
        return next;
      });
    },
    [showToast],
  );

  // --- Vào / ra Giảng đường Tòa C7 & Sảnh Thư viện (fade) -----------------------
  const enterClassroomFade = useCallback(
    (origin: 'c7' | 'c1' = 'c7', openLessonPickerAfterEnter = false) => {
      if (origin === 'c7') {
        stampLandmarkCheckin('c7', true);
      }
      setFade(true);
      window.setTimeout(() => {
        getHook()?.enterClassroom(origin);
        setInClassroom(true);
        setFade(false);
        if (openLessonPickerAfterEnter) {
          setLessonsOpen(true);
        }
      }, 350);
    },
    [stampLandmarkCheckin],
  );

  const exitClassroomFade = useCallback(() => {
    setLessonsOpen(false);
    setFade(true);
    window.setTimeout(() => {
      getHook()?.exitClassroom();
      setInClassroom(false);
      setFade(false);
    }, 350);
  }, []);

  const handleToggleHskMode = useCallback(
    (forceEnabled?: boolean, silent = false) => {
      const nextEnabled =
        typeof forceEnabled === 'boolean' ? forceEnabled : !hskModeRef.current;
      hskModeRef.current = nextEnabled;
      playerState.hskMode = nextEnabled;
      setHskMode(nextEnabled);
      saveGameModes({ version: 1, hskMode: nextEnabled });

      if (!nextEnabled) {
        try {
          stopSpeaking();
        } catch {
          // ignore
        }
        setLessonsOpen(false);
        setPassportSection((sec) => (sec === 'hsk' ? 'checkin' : sec));
        setLobbyModal((m) => (m === 'vocab-board' ? null : m));
        setPanel((cur) =>
          cur === 'quest' || cur === 'result' || cur === 'review' ? null : cur,
        );
        if (playerState.inClassroom) {
          exitClassroomFade();
        }
      }

      if (!silent) {
        showToast(
          nextEnabled
            ? '🇨🇳 Đã bật Chế độ Học tiếng Trung (HSK) — ghé Tòa C7 hoặc Sổ tay để luyện bài!'
            : '🎮 Đã tắt Chế độ HSK — trải nghiệm thuần không gian Bách Khoa 3D.',
        );
      }
    },
    [exitClassroomFade, showToast],
  );

  const enterLibraryLobbyFade = useCallback(() => {
    stampLandmarkCheckin('library', true);
    bumpQuestMetricRef.current('libraryVisits');
    setFade(true);
    window.setTimeout(() => {
      getHook()?.enterLibraryLobby?.();
      setInLibraryLobby(true);
      setFade(false);
    }, 350);
  }, [stampLandmarkCheckin]);

  const exitLibraryLobbyFade = useCallback(() => {
    setLobbyModal(null);
    setFade(true);
    window.setTimeout(() => {
      getHook()?.exitLibraryLobby?.();
      setInLibraryLobby(false);
      setFade(false);
    }, 350);
  }, []);

  const enterBoardGameClubFade = useCallback(() => {
    setFade(true);
    window.setTimeout(() => {
      getHook()?.enterBoardGameClub?.();
      setInBoardGameClub(true);
      setFade(false);
    }, 350);
  }, []);

  const exitBoardGameClubFade = useCallback(() => {
    setBoardGameLobbyOpen(false);
    setBoardGameRulesOpen(false);
    setBoardGameExitConfirmOpen(false);
    setFade(true);
    window.setTimeout(() => {
      getHook()?.exitBoardGameClub?.();
      setInBoardGameClub(false);
      setBoardGameSeatId(null);
      setFade(false);
    }, 350);
  }, []);

  const handleRequestExitBoardGameClub = useCallback(() => {
    if (boardGameSeatId) {
      setBoardGameExitConfirmOpen(true);
      return;
    }
    exitBoardGameClubFade();
  }, [boardGameSeatId, exitBoardGameClubFade]);

  const handleSelectBoardGameSeat = useCallback(
    (seatId: string) => {
      const r = getHook()?.sitAtBoardGameSeat?.(seatId);
      if (r?.ok) {
        setBoardGameSeatId(r.seatId ?? seatId);
        showToast(`🪑 Đã ngồi vào ${r.label ?? 'ghế bàn chơi'} (bấm E để đứng dậy)`);
      }
    },
    [showToast],
  );

  const handleStandUpBoardGameSeat = useCallback(() => {
    const r = getHook()?.standUpBoardGameSeat?.();
    if (r?.ok) {
      setBoardGameSeatId(null);
      showToast('Đã đứng dậy khỏi bàn Board Game.');
    }
  }, [showToast]);

  const cycleTimeOfDay = useCallback(() => {
    setAutoTimeOfDay(false);
    setTimeOfDay((prev) => {
      const next: TimeOfDay = prev === 'day' ? 'sunset' : prev === 'sunset' ? 'night' : 'day';
      playerState.timeOfDay = next;
      const label = next === 'day' ? 'Ban ngày ☀️' : next === 'sunset' ? 'Hoàng hôn 🌇' : 'Ban đêm 🌙';
      showToast(`Đã chuyển sang chế độ: ${label}`);
      return next;
    });
  }, [showToast]);

  const handleToggleLofi = useCallback(() => {
    const nowPlaying = lofiAudio.toggle();
    lofiManuallyPausedRef.current = !nowPlaying;
    setLofiPlaying(nowPlaying);
    if (nowPlaying) {
      showToast('🎵 Đang phát nhạc Lofi Chill học tập (75 BPM · Felt Piano & Warm Pad)');
    } else {
      showToast('🔇 Đã tắt nhạc Lofi Chill.');
    }
  }, [showToast]);

  const handleSaveCharacterInGame = useCallback(
    (nextProfile: CharacterProfile) => {
      saveCharacterProfile(nextProfile);
      syncCharacterToPlayerState(nextProfile);
      setCharacterProfile(nextProfile);
      setSavedIdentity({ name: nextProfile.name, mssv: nextProfile.mssv });
      setIdentityName(nextProfile.name);
      setIdentityMssv(nextProfile.mssv);
      multiplayer.sendAppearance(nextProfile.name, nextProfile.mssv, {
        gender: nextProfile.gender,
        outfit: nextProfile.outfit,
        hairStyle: nextProfile.hairStyle,
        skirt: nextProfile.skirt,
        glasses: nextProfile.glasses,
        backpack: nextProfile.backpack,
      });
      setOutfitOpen(false);
      showToast(`Đã lưu nhân vật: ${nextProfile.name} (${nextProfile.mssv})`);
    },
    [showToast],
  );

  const handleUpdateCosmetics = useCallback(
    (patch: { schoolId?: SchoolBadgeId; titleId?: CampusTitleId; gradCap?: boolean }) => {
      setCharacterProfile((prev) => {
        const next: CharacterProfile = { ...prev, ...patch };
        saveCharacterProfile(next);
        syncCharacterToPlayerState(next);
        return next;
      });
      showToast('🏅 Đã cập nhật danh hiệu / phụ kiện Bách Khoa!');
    },
    [showToast],
  );

  const handleSelectDrink = useCallback(
    (drinkId: HeldDrinkId) => {
      setCharacterProfile((prev) => {
        const next: CharacterProfile = { ...prev, heldDrink: drinkId };
        saveCharacterProfile(next);
        syncCharacterToPlayerState(next);
        return next;
      });
      if (drinkId === 'iced-tea') {
        showToast('🍋 Đã cầm trên tay Trà chanh đá Bách Khoa!');
        bumpQuestMetricRef.current('chillLake', { uniqueFlag: 'ordered-drink' });
      } else if (drinkId === 'coffee') {
        showToast('☕ Đã cầm trên tay Cà phê nâu đá Hồ Tiền!');
        bumpQuestMetricRef.current('chillLake', { uniqueFlag: 'ordered-drink' });
      } else {
        showToast('Đã cất đồ uống cầm tay.');
      }
    },
    [showToast],
  );

  const handleClaimCampusQuest = useCallback(
    (questId: string) => {
      const res = claimCampusQuest(campusQuests, questId);
      if (!res.claimed) return;
      saveCampusQuestsState(res.next);
      setCampusQuests(res.next);
      setProgress((prev) =>
        prev ? { ...prev, points: (prev.points ?? 0) + res.rewardPoints } : prev,
      );
      if (res.unlockedTitleId || res.unlockedGradCap) {
        setCharacterProfile((prev) => {
          const next: CharacterProfile = {
            ...prev,
            ...(res.unlockedTitleId ? { titleId: res.unlockedTitleId } : {}),
            ...(res.unlockedGradCap ? { gradCap: true } : {}),
          };
          saveCharacterProfile(next);
          syncCharacterToPlayerState(next);
          return next;
        });
      }
      showToast(
        `🎁 Nhận thưởng +${res.rewardPoints} điểm${res.unlockedGradCap ? ' & mở khóa 🎓 Mũ Cử nhân Bách Khoa!' : ' & danh hiệu mới!'}`,
      );
    },
    [campusQuests, showToast],
  );

  const handleTogglePov = useCallback(() => {
    const next = getHook()?.togglePov?.();
    if (next) {
      setViewMode(next);
      if (next === 'pov') {
        bumpQuestMetricRef.current('cameraMoments');
      }
      showToast(
        next === 'pov'
          ? '👁️ Đã chuyển sang Góc nhìn thứ nhất (POV · bấm V để quay lại)'
          : '🎥 Đã quay lại Góc nhìn thứ ba',
      );
    }
  }, [showToast]);

  // --- Dịch chuyển nhanh (đợt 3 giai đoạn 5) -----------------------------------
  const doFastTravel = useCallback((destId: string) => {
    if (travelingRef.current) return;
    const hook = getHook();
    if (!hook?.fastTravel) return;
    travelingRef.current = true;
    setTraveling(true);
    setFastTravelOpen(false);
    setPanel(null);
    setLessonsOpen(false);
    setReReviewIds(null);
    setFade(true);
    window.setTimeout(() => {
      const r = hook.fastTravel?.(destId);
      if (r?.ok) {
        const dest = FAST_TRAVEL_DESTINATIONS.find((d) => d.id === destId);
        if (dest) showToast(`Đã tới ${dest.name}.`);
      } else if (r?.reason === 'busy') {
        showToast('Đang chuyển cảnh — đợi một chút rồi thử lại.');
      } else {
        showToast('Chưa đi nhanh được — thử lại sau.');
      }
      window.setTimeout(() => {
        setFade(false);
        travelingRef.current = false;
        setTraveling(false);
      }, 350);
    }, 350);
  }, [showToast]);

  const exitLesson = useCallback(() => {
    setPanel(null);
    setReReviewIds(null);
    setLessonsOpen(false);
    if (inClassroom) exitClassroomFade();
    showToast('Đã thoát buổi học — tiến độ vẫn được lưu, vào lớp lại để học tiếp.');
  }, [inClassroom, exitClassroomFade, showToast]);

  const pickLesson = useCallback(
    (questId: string) => {
      setLessonsOpen(false);
      setActiveEdTechLandmarkId(null);
      if (!inClassroom) {
        enterClassroomFade('c7', false);
      }
      if (questActive && questState?.questId === questId && stepIndex >= 2) {
        setPanel('quest');
        return;
      }
      startQuest(questId, true);
    },
    [inClassroom, enterClassroomFade, questActive, questState?.questId, stepIndex, startQuest],
  );

  const goToMenu = useCallback(() => {
    setPanel(null);
    setReReviewIds(null);
    setLessonsOpen(false);
    try {
      getHook()?.exitClassroom();
    } catch {
      // Scene đã tháo — không cần thoát phòng nữa.
    }
    setInClassroom(false);
    setEntered(false);
    multiplayer.disconnect();
  }, []);

  // --- Xử lý phím E / nút Tương tác -------------------------------------------------
  const handleInteract = useCallback(() => {
    if (panelRef.current !== null) return;
    const snapNow = multiplayer.snapshot;
    const occupiedOtherSet = new Set<string>();
    for (const occ of snapNow.seats) {
      if (
        occ.studyRoomId === 'library-lobby' &&
        (!snapNow.selfId || occ.occupantId !== snapNow.selfId) &&
        occ.seatId !== playerState.seatId
      ) {
        occupiedOtherSet.add(occ.seatId);
      }
    }
    const liveFound = findNearestInteractable({
      pos: playerState.pos,
      inClassroom: playerState.inClassroom,
      inLibraryLobby: playerState.inLibraryLobby,
      libraryFloor: playerState.libraryFloor,
      seated: playerState.seated,
      seatId: playerState.seatId,
      occupiedByOtherSeatIds: occupiedOtherSet,
      pendingSeatId: snapNow.pendingSeatRequest?.seatId ?? null,
      outdoorBenchId: playerState.outdoorBenchId,
      footballPos: playerState.footballPos,
      bikeRiding: bikeState.riding,
      bikeSpeed: bikeState.speed,
      bikePos: bikeState.pos,
      questActive,
      questDoneBefore,
      anyQuestDone,
      stepId: step?.id,
      hskMode: hskModeRef.current,
    });
    interactableRef.current = liveFound?.id ?? interactableRef.current;
    const id = liveFound?.id ?? interactableRef.current;
    if (!id) {
      showToast('Hãy đến gần hơn để tương tác.');
      return;
    }
    if (id === 'bike-mount') {
      const r = getHook()?.mountBike?.();
      if (!r?.ok) showToast('Hãy đến gần xe hơn để lên xe.');
      return;
    }
    if (id === 'bike-dismount') {
      const r = getHook()?.dismountBike?.();
      if (!r?.ok && r?.reason === 'moving') {
        showToast('Xe đang chạy — giữ S để phanh dừng hẳn rồi mới xuống xe.');
      } else if (!r?.ok) {
        showToast('Chưa xuống xe được — đợi xe dừng hẳn rồi thử lại.');
      }
      return;
    }
    if (id === 'npc-minh') {
      stampLandmarkCheckin('parabol-gate', false);
      setActiveEdTechLandmarkId('parabol-gate');
      speakText('欢迎来到河内百科大学！');
      showToast('👋 Minh: Chào mừng bạn! Muốn học HSK theo bài thì ghé Tòa C7 nhé!');
      return;
    }
    if (id === 'classroom-door') {
      if (questActive && step?.id === 'goto-door') {
        enterClassroomFade('c1', false);
        window.setTimeout(() => advance(), 400);
      } else if (anyQuestDone || questActive) {
        enterClassroomFade('c1', false);
      }
      return;
    }
    if (id === 'c7-door') {
      if (!hskModeRef.current) {
        handleToggleHskMode(true, true);
        showToast('🇨🇳 Đã bật Chế độ HSK — chào mừng vào Giảng đường Tòa C7!');
      }
      const hasOngoingC7Lesson = questActive && stepIndex >= 2;
      enterClassroomFade('c7', !hasOngoingC7Lesson);
      if (hasOngoingC7Lesson) {
        window.setTimeout(() => setPanel('quest'), 400);
      }
      return;
    }
    if (id === 'library-door') {
      enterLibraryLobbyFade();
      return;
    }
    if (id === 'boardgame-door') {
      enterBoardGameClubFade();
      return;
    }
    if (id === 'bg-seat-stand-up') {
      handleStandUpBoardGameSeat();
      return;
    }
    if (id.startsWith('bg-seat:')) {
      handleSelectBoardGameSeat(id.slice('bg-seat:'.length));
      return;
    }
    if (id === 'boardgame-info') {
      setBoardGameRulesOpen(true);
      return;
    }
    if (id === 'boardgame-exit') {
      handleRequestExitBoardGameClub();
      return;
    }
    if (id.startsWith('checkin:')) {
      const lmId = id.slice('checkin:'.length);
      stampLandmarkCheckin(lmId, false);
      setActiveEdTechLandmarkId(lmId);
      const lm = getCampusLandmarkById(lmId);
      if (lm?.vocab[0]) {
        speakText(lm.vocab[0].hanzi);
      }
      return;
    }
    if (id === 'bench-stand-up') {
      getHook()?.standUpOutdoorBench?.();
      return;
    }
    if (id.startsWith('bench:')) {
      const benchId = id.slice('bench:'.length);
      const r = getHook()?.sitOutdoorBench?.(benchId);
      if (r?.ok) {
        showToast(`🪑 Đang ngồi nghỉ tại ${r.label ?? 'ghế đá'} (di chuyển WASD hoặc bấm E để đứng dậy)`);
      }
      return;
    }
    if (id.startsWith('drink-stall:')) {
      const stallId = id.slice('drink-stall:'.length);
      const stall = CAMPUS_DRINK_STALLS.find((s) => s.id === stallId);
      if (stall) {
        handleSelectDrink(stall.drinkId);
      }
      return;
    }
    if (id.startsWith('memory-board:')) {
      const boardId = id.slice('memory-board:'.length) as MemoryBoardId;
      setMemoryWallBoardId(boardId);
      setMemoryWallOpen(true);
      return;
    }
    if (id === 'football-kick') {
      window.dispatchEvent(new CustomEvent('bkhn:football-kick'));
      return;
    }
    if (id === 'seat-stand-up') {
      handleStandUp();
      return;
    }
    if (id.startsWith('seat:')) {
      handleSitAtSeat(id.slice('seat:'.length));
      return;
    }
    if (id === 'lobby-statue') {
      setLobbyModal('statue');
      speakText('谢光宝教授图书馆');
      return;
    }
    if (id === 'lobby-vocab-board') {
      setLobbyModal('vocab-board');
      speakText('图书馆，科学，技术，借书，阅读');
      return;
    }
    if (id === 'lobby-info-desk') {
      setLobbyModal('info-desk');
      speakText('你好，我想借书');
      return;
    }
    if (id === 'library-elevator') {
      window.dispatchEvent(
        new CustomEvent('bkhn:elevator-call', { detail: { floor: playerState.libraryFloor } }),
      );
      window.dispatchEvent(new CustomEvent('bkhn:open-elevator-panel'));
      setLibraryExtraModal('elevator');
      return;
    }
    if (id === 'piano-6f') {
      if (playerState.inLibraryLobby && playerState.libraryFloor === 6 && playerState.seatId !== 'tqb-6f-piano-bench') {
        if (playerState.seated) {
          getHook()?.standUp?.();
        }
        if (Math.hypot(playerState.pos.x - -6.986, playerState.pos.z - 2.634) > 1.55) {
          getHook()?.teleport?.(-7.23, 2.02, 0.38 + Math.PI);
        }
        getHook()?.sitAtSeat?.('tqb-6f-piano-bench');
      }
      setLibraryExtraModal('piano');
      showToast('🎹 Đại dương cầm Tầng 6 — bấm các phím đàn trên thanh Piano để tấu nhạc!');
      return;
    }
    if (id === 'telescope-10f') {
      setLibraryExtraModal('telescope');
      speakText('天文望远镜，星空，银河');
      return;
    }
    if (id === 'board') {
      window.dispatchEvent(new CustomEvent('bkhn:quest-object', { detail: { id: 'board' } }));
      return;
    }
    if (id === 'notebook' || id === 'homework') {
      handleObjectAction(id);
    }
  }, [
    questActive,
    questDoneBefore,
    anyQuestDone,
    stepIndex,
    step?.id,
    stampLandmarkCheckin,
    enterClassroomFade,
    enterLibraryLobbyFade,
    enterBoardGameClubFade,
    handleSelectBoardGameSeat,
    handleStandUpBoardGameSeat,
    handleRequestExitBoardGameClub,
    advance,
    handleObjectAction,
    handleSitAtSeat,
    handleStandUp,
    handleSelectDrink,
    handleToggleHskMode,
    showToast,
    speakText,
  ]);

  useEffect(() => {
    if (!entered) return;
    const onInteract = () => handleInteract();
    const onSitPianoBench = () => {
      if (
        playerState.inLibraryLobby &&
        playerState.libraryFloor === 6 &&
        playerState.seatId !== 'tqb-6f-piano-bench'
      ) {
        if (playerState.seated) {
          getHook()?.standUp?.();
        }
        if (Math.hypot(playerState.pos.x - -6.986, playerState.pos.z - 2.634) > 1.55) {
          getHook()?.teleport?.(-7.23, 2.02, 0.38 + Math.PI);
        }
        getHook()?.sitAtSeat?.('tqb-6f-piano-bench');
      }
    };
    window.addEventListener('bkhn:interact', onInteract);
    window.addEventListener('bkhn:sit-piano-bench', onSitPianoBench);
    return () => {
      window.removeEventListener('bkhn:interact', onInteract);
      window.removeEventListener('bkhn:sit-piano-bench', onSitPianoBench);
    };
  }, [entered, handleInteract]);

  // --- Hoàn thành quest --------------------------------------------------------------
  const completeQuest = useCallback(() => {
    const p = progressRef.current;
    if (!p) return;
    const def = getQuestDef(p.questState?.questId ?? '') ?? (getQuestDef('first-lesson') as QuestDef);
    const result = awardQuestCompletion(
      p,
      def.quest.id,
      def.quest.rewardPoints,
      def.quest.badgeId,
    );
    setRewardAlreadyGiven(!result.awarded);
    let next = markActivityDay(result.progress, todayKey());
    next = { ...next, questState: next.questState ? { ...next.questState, done: true } : null };
    setProgress(next);
    setReReviewIds(null);
    setPanel(null);
    exitClassroomFade();
  }, [exitClassroomFade]);

  // --- Vào trường (khôi phục vị trí phòng học chỉ khi bấm Tiếp tục học) ------------
  const enterCampus = useCallback(
    (resumeQuest: boolean) => {
      const p = progressRef.current;
      const qs = p?.questState;
      playerState.seated = false;
      playerState.seatId = null;
      multiplayer.setLocalSeatedSeatId(null);
      setSeatedSeatId(null);
      setSeatedSeatLabel(null);
      bindSeatRef.current(null, null);
      if (resumeQuest && qs && !qs.done && qs.stepIndex >= 2) {
        playerState.inClassroom = true;
        playerState.inLibraryLobby = false;
        playerState.inBoardGameClub = false;
        playerState.boardGameSeatId = null;
        playerState.pos = { ...CLASSROOM.spawn };
        playerState.cameraYaw = typeof qs.yaw === 'number' ? qs.yaw : 0;
        playerState.cameraPitch = typeof qs.pitch === 'number' ? qs.pitch : 0.25;
        setInClassroom(true);
        setInLibraryLobby(false);
        setInBoardGameClub(false);
        setBoardGameSeatId(null);
      } else {
        playerState.inClassroom = false;
        playerState.inLibraryLobby = false;
        playerState.inBoardGameClub = false;
        playerState.boardGameSeatId = null;
        playerState.pos = { ...SPAWN };
        playerState.facing = -Math.PI / 2;
        playerState.zone = nearestZone(SPAWN);
        playerState.cameraYaw = Math.PI / 2;
        playerState.cameraPitch = 0.18;
        setInClassroom(false);
        setInLibraryLobby(false);
        setInBoardGameClub(false);
        setBoardGameSeatId(null);
      }
      setEntered(true);
      if (!lofiManuallyPausedRef.current) {
        lofiAudio.start();
      }
      if (resumeQuest && qs && !qs.done) {
        window.setTimeout(() => setPanel('quest'), 300);
      }
    },
    [],
  );

  const tryEnter = useCallback(
    (resumeQuest: boolean, submittedProfile?: CharacterProfile) => {
      const finalProfile: CharacterProfile = submittedProfile ?? {
        ...characterProfile,
        name: identityName.trim() || characterProfile.name || 'Sinh viên',
        mssv: identityMssv.trim() || characterProfile.mssv || '20226010',
      };
      saveCharacterProfile(finalProfile);
      setCharacterProfile(finalProfile);
      const identity: Identity = { name: finalProfile.name, mssv: finalProfile.mssv };
      setSavedIdentity(identity);
      setIdentityName(finalProfile.name);
      setIdentityMssv(finalProfile.mssv);
      multiplayer.connect(
        getSessionId(),
        identity.name,
        identity.mssv,
        {
          gender: finalProfile.gender,
          outfit: finalProfile.outfit,
          hairStyle: finalProfile.hairStyle,
          skirt: finalProfile.skirt,
          glasses: finalProfile.glasses,
          backpack: finalProfile.backpack,
        },
        getReconnectToken(),
      );
      enterCampus(resumeQuest);
    },
    [characterProfile, identityName, identityMssv, enterCampus],
  );

  const toggleSound = useCallback(() => {
    setProgress((prev) => {
      if (!prev) return prev;
      return { ...prev, settings: { ...prev.settings, soundOn: !prev.settings.soundOn } };
    });
  }, []);

  const cycleRate = useCallback(() => {
    setProgress((prev) => {
      if (!prev) return prev;
      const cur = prev.settings.speechRate ?? 1.0;
      const idx = SPEECH_RATES.indexOf(cur as (typeof SPEECH_RATES)[number]);
      const next = SPEECH_RATES[(idx + 1) % SPEECH_RATES.length];
      return { ...prev, settings: { ...prev.settings, speechRate: next } };
    });
  }, []);

  const openHandbook = useCallback((tab: HandbookTab) => {
    setHandbookTab(tab);
    if (
      hskModeRef.current &&
      (tab === 'due' || tab === 'calendar' || tab === 'errors' || tab === 'search')
    ) {
      setPassportSection('hsk');
    } else {
      setPassportSection('checkin');
    }
    setPanel('handbook');
  }, []);

  const handleActivateCreativeFeature = useCallback(
    (lm: CampusLandmarkSpec) => {
      setPassport((prev) => {
        const res = recordLandmarkFeatureCollected(prev, lm.id);
        if (res.next !== prev) {
          saveCampusPassport(res.next);
        }
        if (res.isNewFeature) {
          setProgress((p) => (p ? { ...p, points: (p.points ?? 0) + 5 } : p));
          showToast(`✨ Đã sưu tầm tính năng sáng tạo của ${lm.shortName} (+5 điểm)!`);
        }
        return res.next;
      });
      if (lm.creativeActionKind === 'enter-c7-hsk') {
        if (!hskModeRef.current) {
          handleToggleHskMode(true, true);
          showToast('🇨🇳 Đã bật Chế độ HSK — chào mừng vào Giảng đường Tòa C7!');
        }
        setActiveEdTechLandmarkId(null);
        const hasOngoingC7Lesson = questActive && stepIndex >= 2;
        enterClassroomFade('c7', !hasOngoingC7Lesson);
        if (hasOngoingC7Lesson) {
          window.setTimeout(() => setPanel('quest'), 400);
        }
      } else if (lm.creativeActionKind === 'enter-library') {
        setActiveEdTechLandmarkId(null);
        enterLibraryLobbyFade();
      } else if (lm.creativeActionKind === 'toggle-lofi') {
        if (!lofiPlaying) {
          handleToggleLofi();
        }
      }
    },
    [
      questActive,
      stepIndex,
      enterClassroomFade,
      enterLibraryLobbyFade,
      lofiPlaying,
      handleToggleLofi,
      handleToggleHskMode,
      showToast,
    ],
  );

  const handleSolveLandmarkQuiz = useCallback(
    (lm: CampusLandmarkSpec) => {
      setPassport((prev) => {
        const res = recordLandmarkQuizSolved(prev, lm.id);
        if (res.next !== prev) {
          saveCampusPassport(res.next);
        }
        if (res.isFirstSolve) {
          setProgress((p) =>
            p ? { ...p, points: (p.points ?? 0) + lm.quiz.rewardPoints } : p,
          );
          showToast(
            `🎉 Giải đúng câu đố EdTech ${lm.shortName} — nhận +${lm.quiz.rewardPoints} điểm!`,
          );
        }
        return res.next;
      });
    },
    [showToast],
  );

  const handleReviewNow = useCallback(() => {
    const wrong = recallResults.filter((r) => !r.correct).map((r) => r.lexemeId);
    if (wrong.length > 0) {
      setReReviewResults([]);
      setReReviewIds(wrong);
      setPanel('quest');
    } else {
      openHandbook('due');
    }
  }, [recallResults, openHandbook]);

  // (Các useMemo này PHẢI ở trước early return màn intro — hook phải chạy
  // đủ mọi lần render, nếu không React lỗi #310 khi entered đổi false→true.)
  const sessionWrongIds: string[] = useMemo(
    () => recallResults.filter((r) => !r.correct).map((r) => r.lexemeId),
    [recallResults],
  );
  const dueLexemes: Lexeme[] = useMemo(() => {
    if (!progress) return [];
    try {
      const ids = Array.from(
        new Set([...getDueWordsIncludingTodayWrong(progress, todayKey()), ...sessionWrongIds]),
      );
      return ids.map((id) => lexemeById[id]).filter((l): l is Lexeme => !!l);
    } catch {
      return [];
    }
  }, [progress, lexemeById, sessionWrongIds]);

  const encounteredLexemes: Lexeme[] = useMemo(() => {
    if (!progress) return [];
    const e = (progress as unknown as { encountered?: unknown }).encountered;
    const ids: string[] = Array.isArray(e) ? (e as string[]) : e && typeof e === 'object' ? Object.keys(e as Record<string, unknown>) : [];
    return ids.map((id) => lexemeById[id]).filter((l): l is Lexeme => !!l);
  }, [progress, lexemeById]);

  const recallDetail = recallResults
    .map((r) => ({ lexeme: lexemeById[r.lexemeId], correct: r.correct }))
    .filter((r): r is { lexeme: Lexeme; correct: boolean } => !!r.lexeme);

  const handleReviewSessionAnswer = (lexemeId: string, correct: boolean) => {
    const p = progressRef.current;
    if (!p || !reviewSession) return;
    setProgress(
      reviewSession.mode === 'error'
        ? recordReReview(p, lexemeId, correct)
        : recordAnswer(p, {
            lexemeId,
            correct,
            usedHint: false,
            activity: 'review',
            firstTry: true,
          }),
    );
  };

  const resultGlobalBadges = useMemo(() => {
    if (!progress) return [];
    const before = new Set(badgesBeforeQuestRef.current);
    const afterProgress =
      step?.kind === 'result' && progress.questState?.questId
        ? {
            ...progress,
            completedQuests: {
              ...progress.completedQuests,
              [progress.questState.questId]: {
                at: new Date().toISOString(),
                points: currentQuest?.rewardPoints ?? 50,
              },
            },
          }
        : progress;
    return getEarnedGlobalBadgeIds(afterProgress).map((id) => ({
      id,
      title: GLOBAL_BADGES.find((b) => b.id === id)?.title ?? id,
      isNew: !before.has(id),
    }));
  }, [progress, step?.kind, currentQuest?.rewardPoints]);

  const passportSummary = useMemo(() => getPassportSummary(passport), [passport]);
  const activeEdTechLandmark = useMemo(
    () => (activeEdTechLandmarkId ? getCampusLandmarkById(activeEdTechLandmarkId) ?? null : null),
    [activeEdTechLandmarkId],
  );

  // --- Màn mở đầu (Trình tạo Nhân vật 3D trước khi vào trường) ---------------
  if (!entered) {
    return (
      <EntryScreen
        characterProfile={characterProfile}
        savedIdentity={savedIdentity}
        identityName={identityName}
        identityMssv={identityMssv}
        progress={progress}
        hskMode={hskMode}
        onToggleHskMode={() => handleToggleHskMode(undefined, true)}
        onEnter={tryEnter}
      />
    );
  }

  const currentZoneLabel = inClassroom
    ? 'Giảng đường HSK · Tòa C7'
    : inLibraryLobby
      ? 'Sảnh Thư viện Tạ Quang Bửu'
      : inBoardGameClub
        ? '🎲 CLB Board Game KTX'
        : zone;

  const bgTable1Count = boardGameSeatId?.startsWith('bg-t1-') ? 1 : 0;
  const bgTable2Count = boardGameSeatId?.startsWith('bg-t2-') ? 1 : 0;

  const unclaimedQuestCount = CAMPUS_LIFE_QUESTS.filter(
    (q) => isCampusQuestCompleted(campusQuests, q) && !campusQuests.claimedIds.includes(q.id),
  ).length;
  const activePhotoCssFilter = photoMode
    ? PHOTO_FILTERS.find((f) => f.id === photoFilter)?.cssFilter ?? 'none'
    : 'none';

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {study.focusPolicy.suspend3DRendering ? (
        <FocusModeView
          zoneLabel={currentZoneLabel}
          points={progress?.points ?? 0}
          streakCount={progress?.streak?.count ?? 0}
          mpSnap={mpSnap}
          session={study.session}
          onReconcileAt={study.reconcileAt}
          onExitZen2D={study.exitFocusMode}
          onOpenHandbook={() => openHandbook('lesson')}
          onStartSession={() =>
            study.startSession({
              studyRoomId: seatedSeatId ? 'library-lobby' : null,
              seatId: seatedSeatId,
            })
          }
          onEndSession={handleEndStudySession}
          onUpdateSubject={study.updateSubject}
          onAddTask={study.addTask}
          onToggleTask={study.toggleTask}
          onRemoveTask={study.removeTask}
          onStartFocus={study.startFocus}
          onPauseTimer={study.pauseTimer}
          onResumeTimer={study.resumeTimer}
          onSkipPhase={study.skipPhase}
          onResetTimer={study.resetTimer}
          onSelectPreset={study.selectPreset}
        />
      ) : (
        <>
          {/* Canvas chiếm toàn bộ viewport phía sau HUD. */}
          <div
            className="absolute inset-0 transition-[filter] duration-200"
            style={{
              filter: activePhotoCssFilter !== 'none' ? activePhotoCssFilter : undefined,
            }}
          >
            <CampusScene
              inClassroom={inClassroom}
              inLibraryLobby={inLibraryLobby}
              inBoardGameClub={inBoardGameClub}
              activeSeatId={seatedSeatId}
              nearestSeatId={nearestSeatId}
              boardGameSeatId={boardGameSeatId}
              nearestBoardGameSeatId={nearestBoardGameSeatId}
              boardGameTable1Count={bgTable1Count}
              boardGameTable2Count={bgTable2Count}
              timeOfDay={timeOfDay}
              hskMode={hskMode}
              notebookOpen={notebookOpen}
              homework={homework}
              onObjectClick={handleObjectClick}
              onSelectBoardGameSeat={handleSelectBoardGameSeat}
            />
          </div>

          {/* Fade chuyển cảnh vào/ra phòng học. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 z-30 bg-black transition-opacity duration-300 ${
              fade ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* HUD sân trường hoặc Studio Photo Mode */}
          {photoMode ? (
            <PhotoModeOverlay
              open={photoMode}
              zone={currentZoneLabel}
              characterProfile={characterProfile}
              timeOfDay={timeOfDay}
              viewMode={viewMode}
              filterId={photoFilter}
              onChangeFilter={setPhotoFilter}
              onCycleTimeOfDay={cycleTimeOfDay}
              onToggleViewMode={handleTogglePov}
              onTriggerEmote={(emoteId) => multiplayer.sendEmote(emoteId)}
              onExportedPostcard={() => {
                bumpQuestMetric('cameraMoments');
                showToast('📸 Đã xuất Bưu thiếp Kỷ yếu HUSTVerse PNG!');
              }}
              onClose={() => setPhotoMode(false)}
            />
          ) : (
            <CampusHud
              inClassroom={inClassroom}
              inLibraryLobby={inLibraryLobby}
              inBoardGameClub={inBoardGameClub}
              seated={!!seatedSeatId}
              activeSeatId={seatedSeatId}
              activeSeatLabel={seatedSeatLabel}
              zone={zone}
              progress={progress}
              mpSnap={mpSnap}
              riding={riding}
              bikeSpeed={bikeSpeed}
              noVoice={noVoice}
              questActive={questActive}
              panel={panel}
              lessonsOpen={lessonsOpen}
              timeOfDay={timeOfDay}
              realClockText={realClockText}
              autoTimeOfDay={autoTimeOfDay}
              lofiPlaying={lofiPlaying}
              soundOn={soundOn}
              speechRate={speechRate}
              objectiveText={null}
              interactLabel={interactLabel}
              fastTravelOpen={fastTravelOpen}
              traveling={traveling}
              helpOpen={helpOpen}
              toast={toast}
              checkedInCount={passportSummary.checkedInCount}
              totalLandmarks={passportSummary.totalLandmarks}
              hskMode={hskMode}
              viewMode={viewMode}
              outdoorBenchLabel={outdoorBenchLabel}
              unclaimedQuestCount={unclaimedQuestCount}
              pomodoro={study.session.pomodoro}
              focusPolicy={study.focusPolicy}
              onToggleHskMode={() => handleToggleHskMode()}
              onTogglePov={handleTogglePov}
              onOpenPhotoMode={() => setPhotoMode(true)}
              onOpenMemoryWall={() => {
                setMemoryWallBoardId(undefined);
                setMemoryWallOpen(true);
              }}
              onOpenCampusQuests={() => setCampusQuestsOpen(true)}
              onStandUpOutdoorBench={() => getHook()?.standUpOutdoorBench?.()}
              onOpenStudyPanel={() => study.setStudyPanelOpen(true)}
              onOpenLeaderboard={() => setLeaderboardOpen(true)}
              onStandUp={handleStandUp}
              onReconcileStudyAt={study.reconcileAt}
              onExitFocusMode={study.exitFocusMode}
              onDismissNoVoice={() => {
                noVoiceDismissedRef.current = true;
                setNoVoice(false);
              }}
              onSetPanel={setPanel}
              onSetReReviewIds={setReReviewIds}
              onFastTravel={doFastTravel}
              onSetFastTravelOpen={setFastTravelOpen}
              onCycleTimeOfDay={cycleTimeOfDay}
              onToggleLofi={handleToggleLofi}
              onToggleOutfit={() => setOutfitOpen((o) => !o)}
              onOpenLessons={() => setLessonsOpen(true)}
              onOpenHandbook={openHandbook}
              onToggleSound={toggleSound}
              onCycleRate={cycleRate}
              onExitLibraryLobby={exitLibraryLobbyFade}
              onExitClassroom={exitClassroomFade}
              onInteract={handleInteract}
              onSetHelpOpen={setHelpOpen}
              onShowToast={showToast}
            />
          )}

          {/* Bảng điều khiển Thang máy & Chuyển tầng Thư viện Tạ Quang Bửu (Tầng 1–10) */}
          <LibraryFloorNav
            visible={inLibraryLobby && !study.focusPolicy.suspend3DRendering}
            externalModal={libraryExtraModal}
            onClearExternalModal={() => setLibraryExtraModal(null)}
          />
        </>
      )}

      {/* Bảng Tự học Bách khoa (Pomodoro + Nhiệm vụ tự học + Focus Mode) */}
      {!study.focusPolicy.suspend3DRendering && (
        <StudyPanel
          open={study.studyPanelOpen}
          zoneLabel={currentZoneLabel}
          activeSeatId={seatedSeatId}
          activeSeatLabel={seatedSeatLabel}
          mpSnap={mpSnap}
          session={study.session}
          focusPrefs={study.focusPrefs}
          focusPolicy={study.focusPolicy}
          onClose={() => study.setStudyPanelOpen(false)}
          onOpenLeaderboard={() => {
            study.setStudyPanelOpen(false);
            setLeaderboardOpen(true);
          }}
          onStandUp={handleStandUp}
          onReconcileAt={study.reconcileAt}
          onStartSession={() =>
            study.startSession({
              studyRoomId: seatedSeatId ? 'library-lobby' : null,
              seatId: seatedSeatId,
            })
          }
          onEndSession={handleEndStudySession}
          onUpdateSubject={study.updateSubject}
          onSetLinkedHskLesson={study.setLinkedHskLesson}
          onAddTask={study.addTask}
          onToggleTask={study.toggleTask}
          onRemoveTask={study.removeTask}
          onStartFocus={study.startFocus}
          onPauseTimer={study.pauseTimer}
          onResumeTimer={study.resumeTimer}
          onSkipPhase={study.skipPhase}
          onResetTimer={study.resetTimer}
          onSelectPreset={study.selectPreset}
          onSetFocusLevel={study.setFocusLevel}
          onSetAutoHideHudOnFocus={study.setAutoHideHudOnFocus}
        />
      )}

      {/* Bảng Xếp Hạng Giờ Học Bách Khoa (SQLite Cloud Sync) */}
      <StudyLeaderboardModal
        open={leaderboardOpen}
        session={study.session}
        onClose={() => setLeaderboardOpen(false)}
        onOpenStudyPanel={() => study.setStudyPanelOpen(true)}
      />

      {/* Bảng Lưu bút Sân trường (Async Memory Wall) */}
      <CampusMemoryWallModal
        open={memoryWallOpen && entered}
        initialBoardId={memoryWallBoardId}
        characterProfile={characterProfile}
        onMemoryAction={() => {
          bumpQuestMetric('memoryActions');
        }}
        onClose={() => setMemoryWallOpen(false)}
      />

      {/* Bảng Hành trình Sinh viên Bách Khoa & Danh hiệu mở khóa */}
      <CampusQuestsModal
        open={campusQuestsOpen && entered}
        questsState={campusQuests}
        characterProfile={characterProfile}
        heldDrink={characterProfile.heldDrink ?? 'none'}
        onClaimQuest={handleClaimCampusQuest}
        onFastTravel={doFastTravel}
        onUpdateCosmetics={handleUpdateCosmetics}
        onSelectDrink={handleSelectDrink}
        onClose={() => setCampusQuestsOpen(false)}
      />

      {/* Cửa sổ 3D Nhân vật & Trang phục HUST mở từ HUD trong sân trường */}
      {outfitOpen && entered && (
        <CharacterCreatorModal
          mode="modal"
          initialProfile={characterProfile}
          onConfirm={handleSaveCharacterInGame}
          onClose={() => setOutfitOpen(false)}
        />
      )}

      {/* Menu chọn bài trong game (nút 📚 Đổi bài) */}
      {lessonsOpen && entered && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <LessonPickerCard
            activeQuestId={questActive ? questState?.questId ?? null : null}
            completedQuests={progress?.completedQuests ?? {}}
            onPick={pickLesson}
            onClose={() => setLessonsOpen(false)}
            onHome={goToMenu}
          />
        </div>
      )}

      {/* Bảng tương tác Sảnh tầng 1 Thư viện Tạ Quang Bửu */}
      {lobbyModal && inLibraryLobby && (
        <LibraryLobbyModal
          topic={lobbyModal}
          hskMode={hskMode}
          onSpeak={speakText}
          onClose={() => setLobbyModal(null)}
        />
      )}

      {/* HUD & Sảnh phòng CLB Board Game KTX (BG1) */}
      {inBoardGameClub && entered && (
        <>
          <BoardGameHUD
            seatId={boardGameSeatId}
            table1Count={bgTable1Count}
            table2Count={bgTable2Count}
            lobbyOpen={boardGameLobbyOpen}
            rulesOpen={boardGameRulesOpen}
            hasActiveMatch={Boolean(boardGameSeatId)}
            onToggleLobby={() => setBoardGameLobbyOpen((v) => !v)}
            onToggleRules={() => setBoardGameRulesOpen((v) => !v)}
            onStandUpSeat={handleStandUpBoardGameSeat}
            onRequestExit={handleRequestExitBoardGameClub}
          />
          <BoardGameLobby
            open={boardGameLobbyOpen}
            rulesOpen={boardGameRulesOpen}
            exitConfirmOpen={boardGameExitConfirmOpen}
            currentSeatId={boardGameSeatId}
            onCloseLobby={() => setBoardGameLobbyOpen(false)}
            onCloseRules={() => setBoardGameRulesOpen(false)}
            onCancelExit={() => setBoardGameExitConfirmOpen(false)}
            onConfirmExit={exitBoardGameClubFade}
            onSelectSeat={handleSelectBoardGameSeat}
            onStandUpSeat={handleStandUpBoardGameSeat}
          />
        </>
      )}

      {/* Cửa sổ Check-in & Trải nghiệm riêng của từng Tòa nhà Bách Khoa */}
      {activeEdTechLandmark && entered && (
        <BuildingEdTechModal
          landmark={activeEdTechLandmark}
          passport={passport}
          playerName={characterProfile.name}
          hskMode={hskMode}
          onEnableHskMode={() => handleToggleHskMode(true)}
          onClose={() => setActiveEdTechLandmarkId(null)}
          onSpeakChinese={speakText}
          onActivateCreativeFeature={handleActivateCreativeFeature}
          onSolveQuiz={handleSolveLandmarkQuiz}
          onOpenPassportHandbook={() => {
            setActiveEdTechLandmarkId(null);
            setPassportSection('features');
            setPanel('handbook');
          }}
        />
      )}

      {/* Panel học / sổ tay / kết quả (DOM overlay, khóa di chuyển khi mở). */}
      <LearningOverlayModal
        panel={panel}
        passport={passport}
        passportSection={passportSection}
        progress={progress}
        reReviewIds={reReviewIds}
        step={step}
        stepIndex={stepIndex}
        currentSteps={currentSteps}
        currentQuest={currentQuest}
        currentQuestDone={currentQuestDone}
        lexemeById={lexemeById}
        allLexemes={ALL_LEXEMES}
        currentLessonLexemes={currentLessonLexemes}
        actionDone={actionDone}
        soundOn={soundOn}
        hskMode={hskMode}
        encounteredLexemes={encounteredLexemes}
        recallResults={recallResults}
        recallDetail={recallDetail}
        dueLexemes={dueLexemes}
        sessionWrongIds={sessionWrongIds}
        rewardAlreadyGiven={rewardAlreadyGiven}
        resultGlobalBadges={resultGlobalBadges}
        handbookTab={handbookTab}
        reviewSession={reviewSession}
        onSetPanel={setPanel}
        onToggleHskMode={() => handleToggleHskMode()}
        onSetReReviewIds={setReReviewIds}
        onSetReviewSession={setReviewSession}
        onSetProgress={setProgress}
        onAnswer={handleAnswer}
        onAdvance={advance}
        onInteractObject={handleObjectAction}
        onSpeak={speakText}
        onReviewAnswer={handleReviewAnswer}
        onReReviewAnswer={handleReReviewAnswer}
        onReviewSessionAnswer={handleReviewSessionAnswer}
        onExitLesson={exitLesson}
        onFastTravel={doFastTravel}
        onInspectLandmark={(landmarkId) => {
          setPanel(null);
          setActiveEdTechLandmarkId(landmarkId);
        }}
        onPickAnotherLesson={() => {
          setPanel(null);
          setLessonsOpen(true);
        }}
        onReviewNow={handleReviewNow}
        onCompleteQuest={completeQuest}
        onStartQuest={(qId) => startQuest(qId, true)}
      />
    </main>
  );
}
