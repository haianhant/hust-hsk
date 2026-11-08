'use client';

// ---------------------------------------------------------------------------
// app/page.tsx — Composition root cho ứng dụng Bách khoa Hán ngữ 3D.
// - Điều phối trạng thái tiến độ HSK (localStorage), nhân vật & multiplayer,
//   chuyển cảnh Ngoài sân / Phòng học C1 / Sảnh Thư viện Tạ Quang Bửu, và
//   kết nối các module:
//   + features/learning/hsk (EntryScreen, LessonPickerCard, LearningOverlayModal, OBJECTIVES)
//   + features/campus/ui (CampusHud)
//   + features/campus/interaction (LibraryLobbyModal, findNearestInteractable, getHook)
//   + features/social/multiplayer (useMultiplayerBridge)
// ---------------------------------------------------------------------------

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bikeState, playerState, type TimeOfDay } from '../lib/playerState';
import { CLASSROOM, FAST_TRAVEL_DESTINATIONS, SPAWN, nearestZone } from '../lib/campus';
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
import { hasChineseVoice, speak, stopSpeaking } from '../lib/learn/speech';
import {
  DEFAULT_CHARACTER_PROFILE,
  getSessionId,
  loadCharacterProfile,
  loadIdentity,
  saveCharacterProfile,
  syncCharacterToPlayerState,
  type CharacterProfile,
  type Identity,
} from '../lib/identity';
import { multiplayer } from '../lib/multiplayer';
import { getEarnedGlobalBadgeIds, GLOBAL_BADGES } from '../lib/learn/badges';
import { getNextSuggestion } from '../lib/learn/suggest';
import type { QuestAnswer } from '../components/learn/QuestPanel';
import CharacterCreatorModal from '../components/ui/CharacterCreatorModal';
import type { HomeworkState } from '../components/three/Classroom';
import {
  createInitialSeatingState,
  findNearestInteractable,
  getHook,
  LibraryLobbyModal,
  releaseActiveSeatSafely,
  SPEECH_RATES,
  TOAST_MS,
  validateSeatSelection,
  type LibraryLobbyTopic,
} from '../features/campus/interaction';
import { CampusHud } from '../features/campus/ui';
import {
  EntryScreen,
  LearningOverlayModal,
  LessonPickerCard,
  OBJECTIVES,
  type HandbookTab,
  type LearningPanelType,
  type ReviewSessionState,
} from '../features/learning/hsk';
import { useMultiplayerBridge } from '../features/social/multiplayer';
import {
  derivePlayerPresence,
  isSamePublicPresence,
} from '../features/social/presence/presence';
import { FocusModeView, StudyPanel, useStudySession } from '../features/study';
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

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [zone, setZone] = useState(playerState.zone);
  const [viewMode, setViewMode] = useState<'follow' | 'top'>(playerState.viewMode);
  const [toast, setToast] = useState<string | null>(null);
  // Hộp "Cách di chuyển" mặc định THU GỌN trong game (mục 7, 06/11): chỉ
  // hiện nút "?" để mở lại; màn hình vào (entry screen) không dùng state này.
  const [helpOpen, setHelpOpen] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [panel, setPanel] = useState<LearningPanelType>(null);
  const [handbookTab, setHandbookTab] = useState<HandbookTab>('lesson');
  // Phiên ôn nhanh (Bước 8): mở từ Lịch ôn / Sổ lỗi trong sổ tay.
  const [reviewSession, setReviewSession] = useState<ReviewSessionState | null>(null);
  const [inClassroom, setInClassroom] = useState(false);
  const [inLibraryLobby, setInLibraryLobby] = useState(false);
  const [seatedSeatId, setSeatedSeatId] = useState<string | null>(null);
  const [seatedSeatLabel, setSeatedSeatLabel] = useState<string | null>(null);
  const [nearestSeatId, setNearestSeatId] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [outfitOpen, setOutfitOpen] = useState(false);
  const [characterProfile, setCharacterProfile] = useState<CharacterProfile>(DEFAULT_CHARACTER_PROFILE);
  const [lobbyModal, setLobbyModal] = useState<LibraryLobbyTopic | null>(null);
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

  const [noVoice, setNoVoice] = useState(false);
  const noVoiceDismissedRef = useRef(false);
  const [fade, setFade] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
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
        if (snap.mySeatId || snap.seatClaimState !== 'idle') {
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

      // 3. Nếu đang kết nối Multiplayer (và server hỗ trợ giao thức phòng tự học PR9) -> yêu cầu HskRoom Durable Object cấp quyền giữ ghế (Server-Authoritative)
      if (snap.status === 'online' && snap.selfId && snap.studyRevision > 0) {
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

      // 4. Chế độ ngoại tuyến (Offline fallback): vẫn cho phép ngồi học cục bộ và thông báo rõ
      const r = getHook()?.sitAtSeat?.(seatId);
      if (r?.ok) {
        showToast(
          `🪑 Đang ngồi học tại ${localCheck.seat.label}. Bấm "🍅 Tự học" để bắt đầu Pomodoro! (Chế độ ngoại tuyến)`,
        );
      } else {
        showToast(r?.message ?? 'Chưa thể ngồi vào ghế này.');
      }
    },
    [showToast, study],
  );

  const handleStandUp = useCallback(() => {
    const activeId = seatedSeatId ?? study.session.seatId ?? multiplayer.snapshot.mySeatId;
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

  // PR9 — Đồng bộ lại quyền giữ ghế khi kết nối lại (study:room-snapshot)
  useEffect(() => {
    const onStudySnapshot = () => {
      const localSeatId = playerState.seated ? playerState.seatId : null;
      if (!localSeatId || !playerState.inLibraryLobby) return;
      const snap = multiplayer.snapshot;
      if (snap.status !== 'online' || !snap.selfId) return;
      const occ = snap.seatMap[localSeatId];
      if (occ && occ.occupantId !== snap.selfId) {
        releaseActiveSeatSafely({
          driver: study.focusPolicy.suspend3DRendering ? undefined : getHook(),
          fallbackSeatId: localSeatId,
        });
        setSeatedSeatId(null);
        setSeatedSeatLabel(null);
        showToast(
          `🪑 Ghế ${getSeatDefinition(localSeatId)?.label ?? localSeatId} đã có ${occ.occupantName} ngồi khi kết nối lại — bạn đã đứng dậy.`,
        );
      } else if (!occ) {
        void multiplayer.requestSeatClaim(localSeatId, {
          subjectTag: study.session.subjectTag,
          pomodoroPhase: study.session.pomodoro.phase,
        });
      }
    };
    window.addEventListener('bkhn:mp-study-snapshot', onStudySnapshot);
    return () => window.removeEventListener('bkhn:mp-study-snapshot', onStudySnapshot);
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
      const p = loadProgress(window.localStorage);
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
      if (!soundOn) return;
      try {
        stopSpeaking();
        speak(text, {
          rate: speechRate,
          onError: (e) => {
            if (e === 'no-voice' && !noVoiceDismissedRef.current) setNoVoice(true);
          },
        });
      } catch {
        // TTS lỗi: không chặn học, người dùng vẫn đọc được chữ.
      }
    },
    [soundOn, speechRate],
  );

  // Kiểm tra giọng zh-CN sau khi vào trường (chỉ phát sau tương tác).
  useEffect(() => {
    if (!entered) return;
    try {
      if (!hasChineseVoice() && !noVoiceDismissedRef.current) setNoVoice(true);
    } catch {
      // hasChineseVoice lỗi: không chặn học.
    }
  }, [entered]);

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

  // Khi panel học, menu chọn bài, bảng thông tin sảnh thư viện, bảng Tự học hoặc modal nhân vật mở: khóa di chuyển.
  useEffect(() => {
    playerState.uiLocked =
      panel !== null ||
      lessonsOpen ||
      lobbyModal !== null ||
      outfitOpen ||
      study.studyPanelOpen ||
      study.focusPolicy.suspend3DRendering;
    return () => {
      playerState.uiLocked = false;
    };
  }, [
    panel,
    lessonsOpen,
    lobbyModal,
    outfitOpen,
    study.studyPanelOpen,
    study.focusPolicy.suspend3DRendering,
  ]);

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
        if (!d.inLibraryLobby) setLobbyModal(null);
      }
    };
    window.addEventListener('bkhn:classroom', onMode);
    window.addEventListener('bkhn:library-lobby', onLobbyMode);
    return () => {
      window.removeEventListener('bkhn:classroom', onMode);
      window.removeEventListener('bkhn:library-lobby', onLobbyMode);
    };
  }, []);

  // --- Bắt đầu / chơi lại quest (mặc định tuyến bài 10 nhóm 1) ----------------
  const startQuest = useCallback((questId: string = FIRST_LESSON_QUEST.id) => {
    const p = progressRef.current;
    if (!p) return;
    const def = getQuestDef(questId) ?? (getQuestDef('first-lesson') as QuestDef);
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
      questState: { questId: def.quest.id, stepIndex: 0, done: false },
    });
    setPanel('quest');
  }, []);

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

  useEffect(() => {
    if (!entered || !step || step.kind === 'goto') return;
    setPanel('quest');
  }, [entered, step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        seated: playerState.seated,
        seatId: playerState.seatId,
        occupiedByOtherSeatIds: occupiedOtherSet,
        pendingSeatId: snapNow.pendingSeatRequest?.seatId ?? null,
        bikeRiding: bikeState.riding,
        bikeSpeed: bikeState.speed,
        bikePos: bikeState.pos,
        questActive,
        questDoneBefore,
        anyQuestDone,
        stepId: step?.id,
      });
      interactableRef.current = found?.id ?? null;
      setInteractLabel(found?.label ?? null);
      setNearestSeatId(
        found?.id?.startsWith('seat:') ? found.id.slice('seat:'.length) : null,
      );
    }, 200);
    return () => clearInterval(id);
  }, [entered, inClassroom, inLibraryLobby, questActive, questDoneBefore, anyQuestDone, step?.id, showToast]);

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
      const nextIdx = prev.questState.stepIndex + 1;
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
        setLobbyModal('statue');
        speakText('谢光宝教授图书馆');
        return;
      }
      if (id === 'vocab-board') {
        setLobbyModal('vocab-board');
        speakText('图书馆，科学，技术，借书，阅读');
        return;
      }
      if (id === 'info-desk') {
        setLobbyModal('info-desk');
        speakText('你好，我想借书');
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

  // --- Vào / ra phòng học & Sảnh Thư viện (fade) -----------------------------------
  const enterClassroomFade = useCallback(() => {
    setFade(true);
    window.setTimeout(() => {
      getHook()?.enterClassroom();
      setInClassroom(true);
      setFade(false);
    }, 350);
  }, []);

  const exitClassroomFade = useCallback(() => {
    setFade(true);
    window.setTimeout(() => {
      getHook()?.exitClassroom();
      setInClassroom(false);
      setFade(false);
    }, 350);
  }, []);

  const enterLibraryLobbyFade = useCallback(() => {
    setFade(true);
    window.setTimeout(() => {
      getHook()?.enterLibraryLobby?.();
      setInLibraryLobby(true);
      setFade(false);
    }, 350);
  }, []);

  const exitLibraryLobbyFade = useCallback(() => {
    setLobbyModal(null);
    setFade(true);
    window.setTimeout(() => {
      getHook()?.exitLibraryLobby?.();
      setInLibraryLobby(false);
      setFade(false);
    }, 350);
  }, []);

  const cycleTimeOfDay = useCallback(() => {
    setTimeOfDay((prev) => {
      const next: TimeOfDay = prev === 'day' ? 'sunset' : prev === 'sunset' ? 'night' : 'day';
      playerState.timeOfDay = next;
      const label = next === 'day' ? 'Ban ngày ☀️' : next === 'sunset' ? 'Hoàng hôn 🌇' : 'Ban đêm 🌙';
      showToast(`Đã chuyển sang chế độ: ${label}`);
      return next;
    });
  }, [showToast]);

  const handleSaveCharacterInGame = useCallback(
    (nextProfile: CharacterProfile) => {
      saveCharacterProfile(nextProfile);
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

  const pickLesson = useCallback((questId: string) => {
    setLessonsOpen(false);
    if (inClassroom) exitClassroomFade();
    if (questActive && questState?.questId === questId) return;
    startQuest(questId);
  }, [inClassroom, exitClassroomFade, questActive, questState?.questId, startQuest]);

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
    const id = interactableRef.current;
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
      if (!questActive && !questDoneBefore) {
        startQuest();
      } else if (questActive && step?.id === 'greet-minh') {
        setPanel('quest');
      }
      return;
    }
    if (id === 'classroom-door') {
      if (questActive && step?.id === 'goto-door') {
        enterClassroomFade();
        window.setTimeout(() => advance(), 400);
      } else if (anyQuestDone || questActive) {
        enterClassroomFade();
      }
      return;
    }
    if (id === 'library-door') {
      enterLibraryLobbyFade();
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
    step?.id,
    startQuest,
    enterClassroomFade,
    enterLibraryLobbyFade,
    advance,
    handleObjectAction,
    handleSitAtSeat,
    handleStandUp,
    showToast,
    speakText,
  ]);

  useEffect(() => {
    if (!entered) return;
    const onInteract = () => handleInteract();
    window.addEventListener('bkhn:interact', onInteract);
    return () => window.removeEventListener('bkhn:interact', onInteract);
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
      setSeatedSeatId(null);
      setSeatedSeatLabel(null);
      bindSeatRef.current(null, null);
      if (resumeQuest && qs && !qs.done && qs.stepIndex >= 2) {
        playerState.inClassroom = true;
        playerState.inLibraryLobby = false;
        playerState.pos = { ...CLASSROOM.spawn };
        playerState.cameraYaw = typeof qs.yaw === 'number' ? qs.yaw : 0;
        playerState.cameraPitch = typeof qs.pitch === 'number' ? qs.pitch : 0.25;
        setInClassroom(true);
        setInLibraryLobby(false);
      } else {
        playerState.inClassroom = false;
        playerState.inLibraryLobby = false;
        playerState.pos = { ...SPAWN };
        playerState.facing = -Math.PI / 2;
        playerState.zone = nearestZone(SPAWN);
        playerState.cameraYaw = Math.PI / 2;
        playerState.cameraPitch = 0.18;
        setInClassroom(false);
        setInLibraryLobby(false);
      }
      setEntered(true);
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
      multiplayer.connect(getSessionId(), identity.name, identity.mssv, {
        gender: finalProfile.gender,
        outfit: finalProfile.outfit,
        hairStyle: finalProfile.hairStyle,
        skirt: finalProfile.skirt,
        glasses: finalProfile.glasses,
        backpack: finalProfile.backpack,
      });
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
    setPanel('handbook');
  }, []);

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

  const suggestion = useMemo(() => getNextSuggestion(progress), [progress]);
  const objectiveText = questActive && step ? OBJECTIVES[step.id] ?? currentQuest.title : null;

  // --- Màn mở đầu (Trình tạo Nhân vật 3D trước khi vào trường) ---------------
  if (!entered) {
    return (
      <EntryScreen
        characterProfile={characterProfile}
        savedIdentity={savedIdentity}
        identityName={identityName}
        identityMssv={identityMssv}
        progress={progress}
        lessonsOpen={lessonsOpen}
        questActive={questActive}
        activeQuestId={questState?.questId ?? null}
        suggestion={suggestion}
        onSetLessonsOpen={setLessonsOpen}
        onEnter={tryEnter}
        onStartQuest={startQuest}
        onOpenHandbook={openHandbook}
      />
    );
  }

  const currentZoneLabel = inClassroom
    ? 'Phòng học mô phỏng'
    : inLibraryLobby
      ? 'Sảnh Thư viện Tạ Quang Bửu'
      : zone;

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
          <div className="absolute inset-0">
            <CampusScene
              inClassroom={inClassroom}
              inLibraryLobby={inLibraryLobby}
              activeSeatId={seatedSeatId}
              nearestSeatId={nearestSeatId}
              timeOfDay={timeOfDay}
              notebookOpen={notebookOpen}
              homework={homework}
              onObjectClick={handleObjectClick}
            />
          </div>

          {/* Fade chuyển cảnh vào/ra phòng học. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 z-30 bg-black transition-opacity duration-300 ${
              fade ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* HUD sân trường */}
          <CampusHud
            inClassroom={inClassroom}
            inLibraryLobby={inLibraryLobby}
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
            soundOn={soundOn}
            speechRate={speechRate}
            objectiveText={objectiveText}
            interactLabel={interactLabel}
            fastTravelOpen={fastTravelOpen}
            traveling={traveling}
            helpOpen={helpOpen}
            toast={toast}
            pomodoro={study.session.pomodoro}
            focusPolicy={study.focusPolicy}
            onOpenStudyPanel={() => study.setStudyPanelOpen(true)}
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
          onSpeak={speakText}
          onClose={() => setLobbyModal(null)}
        />
      )}

      {/* Panel học / sổ tay / kết quả (DOM overlay, khóa di chuyển khi mở). */}
      <LearningOverlayModal
        panel={panel}
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
        onReviewNow={handleReviewNow}
        onCompleteQuest={completeQuest}
        onStartQuest={startQuest}
      />
    </main>
  );
}
