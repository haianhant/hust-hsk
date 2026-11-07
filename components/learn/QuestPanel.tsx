// ---------------------------------------------------------------------------
// QuestPanel.tsx — Khung hội thoại NPC + render từng loại câu hỏi (Bước 5).
// DOM overlay (Tailwind). Chữ Hán trong panel học ≥ 28px. Màu: đỏ trầm
// #A54432 điểm nhấn, trắng ngà, xám than, xanh cây.
// Gõ pinyin: xử lý composition — KHÔNG chấm khi đang gõ IME, chỉ chấm sau
// compositionend (Enter bị chặn trong lúc composing). Nghe chép: nút nghe
// lại + tốc độ do HUD điều khiển. Gợi ý trừ điểm theo store (usedHint).
// Bấm vật 3D trong phòng: page chuyển tiếp sự kiện 'bkhn:quest-object' và
// panel xử lý như bấm nút tương ứng.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import type { ActivityType, Lexeme } from '../../lib/learn/types';
import type { QuestStep } from '../../lib/learn/quest-data';
import { checkHanzi, checkPinyin } from '../../lib/learn/pinyin';

export interface QuestAnswer {
  correct: boolean;
  usedHint: boolean;
  lexemeId?: string;
  /** Loại hoạt động theo ActivityType của engine (quest/quiz/fill/review…). */
  activity: ActivityType;
  /** đúng ngay lần thử đầu (10đ) hay đúng sau khi đã sai (3đ) */
  firstTry?: boolean;
}

export interface QuestPanelProps {
  step: QuestStep;
  stepNumber: number;
  totalSteps: number;
  lexemeById: Record<string, Lexeme>;
  allLexemes: Lexeme[];
  /** đã thực hiện xong hành động ở bước interact-object (vở đã mở / đã nhận bài) */
  actionDone: boolean;
  onAnswer: (a: QuestAnswer) => void;
  onAdvance: () => void;
  onInteractObject: (objectId: 'notebook' | 'homework') => void;
  onSpeak: (text: string) => void;
  soundOn: boolean;
  onReviewAnswer: (correct: boolean, lexemeId: string) => void;
  onReviewDone: () => void;
  /**
   * Vòng ôn lại ngay (F2a): câu trả lời ở vòng hỏi lại từ vừa sai.
   * Ghi bằng recordReReview — 0đ, không đổi level/nextDue.
   */
  onReReviewAnswer?: (correct: boolean, lexemeId: string) => void;
  /** Mở panel chỉ để ôn lại (từ nút "Ôn lỗi ngay" ở màn kết quả). */
  reReviewOnly?: boolean;
  /** Kết thúc vòng ôn lại mở riêng (quay lại màn kết quả). */
  onReReviewDone?: () => void;
  /** đóng panel tạm thời (dùng ở bước đi tới cửa — cần di chuyển tự do) */
  onClose: () => void;
  /** Tiêu đề quest hiện tại, hiện ở nhãn đầu panel (mặc định tuyến bài 10). */
  questTitle?: string;
  /** Thoát buổi học giữa chừng: đóng panel, ra khỏi phòng (nếu đang trong
   *  lớp), giữ nguyên tiến độ — vào lớp lại sẽ học tiếp đúng bước đang dở. */
  onExitLesson?: () => void;
  /** Đợt 3 giai đoạn 5 — dịch chuyển nhanh tới điểm gần mục tiêu của bước
   *  hiện tại (chỉ hiện ở bước đi tới cửa → Nhà C1 và bước gặp Minh →
   *  Điểm bắt đầu). Chỉ đổi vị trí, không hoàn thành bước hay cộng điểm. */
  onFastTravel?: (destId: string) => void;
}

type Feedback = { correct: boolean; text: string } | null;

function LexemeCard({ lexeme, showPinyin = true, showMeaning = true }: {
  lexeme: Lexeme;
  showPinyin?: boolean;
  showMeaning?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#A54432]/30 bg-[#FFF8E6] px-4 py-3 text-center">
      <div className="text-4xl font-bold leading-tight text-[#2B2B2B]">{lexeme.hanzi}</div>
      {showPinyin && <div className="mt-1 text-lg text-[#1F5C8A]">{lexeme.pinyin}</div>}
      {showMeaning && <div className="mt-1 text-base text-[#2B2B2B]/80">{lexeme.meaning}</div>}
    </div>
  );
}

function SpeakButton({ text, onSpeak, soundOn, label = '🔊 Nghe' }: {
  text: string;
  onSpeak: (t: string) => void;
  soundOn: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSpeak(text)}
      disabled={!soundOn}
      className="rounded-full bg-[#1F5C8A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17486E] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function HintButton({ hint, onHint }: { hint: string; onHint: () => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      {!shown ? (
        <button
          type="button"
          onClick={() => {
            setShown(true);
            onHint();
          }}
          className="rounded-full border border-[#A54432] px-4 py-2 text-sm font-semibold text-[#A54432] transition hover:bg-[#A54432]/10"
        >
          💡 Gợi ý (ít điểm hơn)
        </button>
      ) : (
        <p className="rounded-lg bg-[#FFF3CD] px-3 py-2 text-sm text-[#6B4E00]">{hint}</p>
      )}
    </div>
  );
}

export default function QuestPanel(props: QuestPanelProps) {
  const { step } = props;
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [answered, setAnswered] = useState(false);
  // Xếp câu (bước 把).
  const [picked, setPicked] = useState<string[]>([]);
  // Gõ pinyin / nghe chép.
  const [input, setInput] = useState('');
  const composingRef = useRef(false);
  // Kiểm tra cuối: chỉ số câu hiện tại + đã trả lời câu này chưa.
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);
  // Vòng ôn lại ngay (F2a): id các từ sai ở kiểm tra cuối + chỉ số hiện tại.
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [inReReview, setInReReview] = useState(!!props.reReviewOnly);
  const [reReviewIds, setReReviewIds] = useState<string[]>(
    props.reReviewOnly && step.kind === 'review' ? [...step.lexemeIds] : [],
  );
  const [reReviewIdx, setReReviewIdx] = useState(0);
  // Đã sai ít nhất một lần ở câu hỏi hiện tại chưa — để tính firstTry cho
  // store (đúng lần đầu 10đ, đúng sau khi sai 3đ).
  const wrongAttemptRef = useRef(false);

  // Đổi bước → reset toàn bộ trạng thái câu hỏi.
  useEffect(() => {
    setFeedback(null);
    setUsedHint(false);
    setAnswered(false);
    setPicked([]);
    setInput('');
    setReviewIdx(0);
    setReviewDone(false);
    setWrongIds([]);
    setReReviewIdx(0);
    if (props.reReviewOnly && step.kind === 'review') {
      setInReReview(true);
      setReReviewIds([...step.lexemeIds]);
    } else {
      setInReReview(false);
      setReReviewIds([]);
    }
    wrongAttemptRef.current = false;
  }, [step.id]);

  // Bấm vật 3D trong phòng → xử lý như bấm nút chọn vật.
  useEffect(() => {
    if (step.kind !== 'pick-object') return;
    const onObj = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) chooseObject(id);
    };
    window.addEventListener('bkhn:quest-object', onObj);
    return () => window.removeEventListener('bkhn:quest-object', onObj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  const record = (correct: boolean, lexemeId: string | undefined, activity: ActivityType) => {
    const firstTry = !wrongAttemptRef.current;
    if (!correct) wrongAttemptRef.current = true;
    props.onAnswer({ correct, usedHint, lexemeId, activity, firstTry });
  };

  const chooseObject = (id: string) => {
    if (step.kind !== 'pick-object' || answered) return;
    const correct = id === step.correctId;
    const pickedOpt = step.options.find((o) => o.id === id);
    setFeedback({
      correct,
      text: correct
        ? `Đúng rồi! Đây là ${step.options.find((o) => o.id === step.correctId)?.label ?? ''} — bảng đen.`
        : `Chưa đúng — đây là ${pickedOpt?.label ?? 'vật khác'} (${pickedOpt?.vi ?? ''}), không phải bảng đen. Thử lại nhé.`,
    });
    record(correct, step.lexemeId, 'quest');
    if (correct) setAnswered(true);
  };

  const chooseMeaning = (correct: boolean, explain: string) => {
    if (step.kind !== 'pick-meaning' || answered) return;
    setFeedback({ correct, text: explain });
    record(correct, step.lexemeId, 'quiz');
    if (correct) setAnswered(true);
  };

  const lexeme = (id?: string) => (id ? props.lexemeById[id] : undefined);

  // --- Kiểm tra cuối: 5 câu, xen kẽ gõ pinyin / chọn nghĩa / nghe chép -----
  const reviewKind = (i: number): 'type-pinyin' | 'pick-meaning' | 'dictation' =>
    i === 2 ? 'dictation' : i % 2 === 0 ? 'type-pinyin' : 'pick-meaning';

  const submitReviewText = (
    kind: 'type-pinyin' | 'dictation',
    targetOverride?: { id: string; pinyin: string; hanzi: string; meaning: string },
    isReReview = false,
  ) => {
    if (step.kind !== 'review') return;
    const target = targetOverride ?? props.lexemeById[step.lexemeIds[reviewIdx]];
    if (!target || !input.trim()) return;
    // checkPinyin / checkHanzi trả về { ok, detail } (hợp đồng engine Bước 4).
    const result =
      kind === 'type-pinyin'
        ? checkPinyin(input, target.pinyin, 'toneless')
        : checkHanzi(input, target.hanzi);
    const correct = result.ok;
    setFeedback({
      correct,
      text: correct
        ? 'Đúng rồi! Bạn tự nhớ được từ này.'
        : kind === 'type-pinyin'
          ? `Chưa đúng. ${result.detail} Pinyin đúng là ${target.pinyin}.`
          : `Chưa đúng. ${result.detail} Chữ đúng là ${target.hanzi} (${target.pinyin} — ${target.meaning}).`,
    });
    if (isReReview) {
      // Vòng ôn lại: 0đ, không đổi level/nextDue (recordReReview ở page).
      props.onReReviewAnswer?.(correct, target.id);
    } else {
      if (!correct) setWrongIds((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
      props.onReviewAnswer(correct, target.id);
    }
    setAnswered(true);
  };

  const submitReviewMeaning = (
    chosenId: string,
    targetOverride?: { id: string; pinyin: string; hanzi: string; meaning: string },
    isReReview = false,
  ) => {
    if (step.kind !== 'review' || answered) return;
    const target = targetOverride ?? props.lexemeById[step.lexemeIds[reviewIdx]];
    if (!target) return;
    const correct = chosenId === target.id;
    setFeedback({
      correct,
      text: correct
        ? 'Đúng rồi! Bạn tự nhớ được từ này.'
        : `Chưa đúng. ${target.hanzi} (${target.pinyin}) nghĩa là “${target.meaning}”.`,
    });
    if (isReReview) {
      props.onReReviewAnswer?.(correct, target.id);
    } else {
      if (!correct) setWrongIds((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
      props.onReviewAnswer(correct, target.id);
    }
    setAnswered(true);
  };

  const nextReview = () => {
    if (step.kind !== 'review') return;
    setFeedback(null);
    setAnswered(false);
    setInput('');
    if (reviewIdx + 1 >= step.lexemeIds.length) {
      // Hết kiểm tra cuối: còn từ sai → vào VÒNG ÔN LẠI NGAY (F2a),
      // hỏi lại mỗi từ sai 1 câu dạng khác, rồi mới sang màn kết quả.
      if (wrongIds.length > 0) {
        setReReviewIds([...wrongIds]);
        setReReviewIdx(0);
        setInReReview(true);
      } else {
        setReviewDone(true);
      }
    } else {
      setReviewIdx(reviewIdx + 1);
    }
  };

  const nextReReview = () => {
    if (step.kind !== 'review') return;
    setFeedback(null);
    setAnswered(false);
    setInput('');
    if (reReviewIdx + 1 >= reReviewIds.length) {
      setInReReview(false);
      // Mở riêng từ màn kết quả → quay lại màn kết quả; còn trong luồng
      // kiểm tra cuối → sang màn kết quả.
      if (props.reReviewOnly && props.onReReviewDone) props.onReReviewDone();
      else props.onReviewDone();
    } else {
      setReReviewIdx(reReviewIdx + 1);
    }
  };

  // Dạng câu hỏi lại cho vòng ôn lại: KHÁC dạng câu cũ của từ đó
  // (gõ pinyin ↔ chọn nghĩa; nghe chép → gõ pinyin).
  const reReviewKind = (lexemeId: string): 'type-pinyin' | 'pick-meaning' => {
    if (step.kind !== 'review') return 'type-pinyin';
    const origIdx = step.lexemeIds.indexOf(lexemeId);
    const origKind = reviewKind(origIdx < 0 ? 0 : origIdx);
    return origKind === 'type-pinyin' ? 'pick-meaning' : 'type-pinyin';
  };

  const header = (
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="rounded-full bg-[#A54432] px-3 py-1 text-xs font-bold text-white">
        {props.questTitle ?? 'Buổi học đầu tiên'}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[#2B2B2B]/60">
          Bước {props.stepNumber}/{props.totalSteps}
        </span>
        {props.onExitLesson && (
          <button
            type="button"
            onClick={props.onExitLesson}
            aria-label="Thoát buổi học"
            className="rounded-full bg-black/10 px-2.5 py-1 text-xs font-bold text-[#2B2B2B]/70 transition hover:bg-black/20"
          >
            🚪 Thoát
          </button>
        )}
      </span>
    </div>
  );

  const continueBtn = (
    <button
      type="button"
      data-testid="quest-continue"
      onClick={props.onAdvance}
      className="w-full rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828]"
    >
      Tiếp tục →
    </button>
  );

  const feedbackBox = feedback ? (
    <div
      role="status"
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
        feedback.correct ? 'bg-[#E3F2E6] text-[#1E5A22]' : 'bg-[#FDECEA] text-[#8A1F16]'
      }`}
    >
      {feedback.correct ? '✅ ' : '❌ '}
      {feedback.text}
    </div>
  ) : null;

  // --- talk: hội thoại NPC ---------------------------------------------------
  if (step.kind === 'talk') {
    const lx = lexeme(step.lexemeId);
    return (
      <div className="w-full">
        {header}
        <p className="mb-2 text-sm font-bold text-[#1F5C8A]">
          {step.npc === 'minh' ? '🧑 Minh — bạn đồng hành' : '👩‍🏫 Cô giáo'}
        </p>
        {step.zh && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-3xl font-bold leading-snug text-[#2B2B2B]">{step.zh}</p>
            <SpeakButton text={step.speakText ?? step.zh} onSpeak={props.onSpeak} soundOn={props.soundOn} />
          </div>
        )}
        <p className="mb-3 text-base leading-relaxed text-[#2B2B2B]/85">{step.vi}</p>
        {lx && (
          <div className="mb-3">
            <LexemeCard lexeme={lx} />
            <p className="mt-2 text-center text-xs text-[#2B2B2B]/60">
              Đã gặp từ mới — từ này đã vào sổ tay của bạn.
            </p>
          </div>
        )}
        {/* Đợt 3 giai đoạn 5 — bước gặp Minh: "Đi tới đây" tới Điểm bắt đầu
            (cách Minh ~4,5 m), chỉ đổi vị trí, không tự hoàn thành bước. */}
        {step.id === 'greet-minh' && props.onFastTravel && (
          <button
            type="button"
            data-testid="quest-fast-travel"
            onClick={() => props.onFastTravel?.('spawn')}
            className="mb-2 w-full rounded-full border-2 border-[#1c5c3a] px-6 py-2.5 text-base font-bold text-[#1c5c3a] transition hover:bg-[#1c5c3a]/10"
          >
            🚀 Đi tới đây — Điểm bắt đầu
          </button>
        )}
        {continueBtn}
      </div>
    );
  }

  // --- goto: đi tới cửa ------------------------------------------------------
  if (step.kind === 'goto') {
    return (
      <div className="w-full">
        {header}
        <p className="mb-3 text-base leading-relaxed text-[#2B2B2B]/85">{step.vi}</p>
        <p className="mb-3 rounded-lg bg-[#EAF3E6] px-3 py-2 text-sm font-semibold text-[#2E7D32]">
          🚶 Đang đi tới cửa phòng học… Khi bạn tới nơi, lớp học sẽ tự mở.
        </p>
        {/* Đợt 3 giai đoạn 5 — "Đi tới đây" tới Nhà C1 (đứng trước cửa lớp),
            chỉ đổi vị trí, không tự hoàn thành bước. */}
        {props.onFastTravel && (
          <button
            type="button"
            data-testid="quest-fast-travel"
            onClick={() => props.onFastTravel?.('c1')}
            className="mb-2 w-full rounded-full border-2 border-[#1c5c3a] px-6 py-2.5 text-base font-bold text-[#1c5c3a] transition hover:bg-[#1c5c3a]/10"
          >
            🚀 Đi tới đây — Nhà C1
          </button>
        )}
        <button
          type="button"
          data-testid="quest-close-panel"
          onClick={props.onClose}
          className="w-full rounded-full bg-[#2E7D32] px-6 py-3 text-base font-bold text-white transition hover:bg-[#256B29]"
        >
          Đóng bảng để đi tới lớp
        </button>
      </div>
    );
  }

  // --- pick-object: chọn đúng vật --------------------------------------------
  if (step.kind === 'pick-object') {
    const lx = lexeme(step.lexemeId);
    return (
      <div className="w-full">
        {header}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-3xl font-bold text-[#2B2B2B]">{step.zh}</p>
          <SpeakButton text={step.zh} onSpeak={props.onSpeak} soundOn={props.soundOn} />
        </div>
        <p className="mb-3 text-base text-[#2B2B2B]/85">{step.vi}</p>
        {lx && <div className="mb-3"><LexemeCard lexeme={lx} showPinyin={false} showMeaning={false} /></div>}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {step.options.map((o) => (
            <button
              key={o.id}
              type="button"
              data-testid={`object-option-${o.id}`}
              onClick={() => chooseObject(o.id)}
              disabled={answered}
              className="rounded-xl border border-[#2B2B2B]/20 bg-white px-3 py-3 text-center transition hover:border-[#A54432] hover:bg-[#A54432]/5 disabled:opacity-60"
            >
              <span className="block text-2xl font-bold text-[#2B2B2B]">{o.label}</span>
              <span className="block text-xs text-[#2B2B2B]/60">{o.vi}</span>
            </button>
          ))}
        </div>
        {feedbackBox}
        {answered && <div className="mt-3">{continueBtn}</div>}
      </div>
    );
  }

  // --- interact-object: mở vở / nhận bài ------------------------------------
  if (step.kind === 'interact-object') {
    const lx = lexeme(step.lexemeId);
    return (
      <div className="w-full">
        {header}
        <p className="mb-3 text-base leading-relaxed text-[#2B2B2B]/85">{step.vi}</p>
        {lx && <div className="mb-3"><LexemeCard lexeme={lx} /></div>}
        {!props.actionDone ? (
          <button
            type="button"
            data-testid="object-action"
            onClick={() => props.onInteractObject(step.objectId)}
            className="w-full rounded-full bg-[#2E7D32] px-6 py-3 text-base font-bold text-white transition hover:bg-[#256B29]"
          >
            {step.objectId === 'notebook' ? '📖 ' : '📝 '}
            {step.actionLabel}
          </button>
        ) : (
          <>
            <p className="mb-3 rounded-lg bg-[#E3F2E6] px-3 py-2 text-sm font-semibold text-[#1E5A22]">
              ✅ {step.doneText}
            </p>
            {continueBtn}
          </>
        )}
      </div>
    );
  }

  // --- pick-meaning: tình huống 认真 / 清楚 -----------------------------------
  if (step.kind === 'pick-meaning') {
    const lx = lexeme(step.lexemeId);
    return (
      <div className="w-full">
        {header}
        <p className="mb-3 text-base leading-relaxed text-[#2B2B2B]/85">{step.scenario}</p>
        {lx && <div className="mb-3"><LexemeCard lexeme={lx} /></div>}
        <div className="mb-3 space-y-2">
          {step.options.map((o, i) => (
            <button
              key={o.text}
              type="button"
              data-testid={`meaning-option-${i}`}
              onClick={() => chooseMeaning(o.correct, o.explain)}
              disabled={answered}
              className="w-full rounded-xl border border-[#2B2B2B]/20 bg-white px-4 py-3 text-left transition hover:border-[#A54432] hover:bg-[#A54432]/5 disabled:opacity-60"
            >
              <span className="block text-2xl font-bold text-[#2B2B2B]">{o.text}</span>
            </button>
          ))}
        </div>
        {feedbackBox}
        {answered && <div className="mt-3">{continueBtn}</div>}
      </div>
    );
  }

  // --- order: xếp câu 把 ------------------------------------------------------
  if (step.kind === 'order') {
    const lx = lexeme(step.lexemeId);
    const remaining = step.tiles.filter((t) => !picked.includes(t));
    const checkOrder = () => {
      const correct = picked.join('') === step.answer;
      setFeedback({
        correct,
        text: correct
          ? `Đúng rồi! “${step.answer}” — bạn đã xếp đúng câu.`
          : 'Chưa đúng thứ tự. Thử xếp lại nhé.',
      });
      record(correct, step.lexemeId, 'fill');
      if (correct) setAnswered(true);
    };
    return (
      <div className="w-full">
        {header}
        <p className="mb-1 text-base leading-relaxed text-[#2B2B2B]/85">{step.vi}</p>
        <p className="mb-3 text-xs text-[#2B2B2B]/60">
          Câu tự soạn để luyện từ của bài — không phải trích nguyên văn giáo trình.
        </p>
        {lx && <div className="mb-3"><LexemeCard lexeme={lx} /></div>}
        <div className="mb-2 min-h-[3.5rem] rounded-xl border-2 border-dashed border-[#A54432]/40 bg-[#FFF8E6] px-3 py-2 text-center">
          {picked.length === 0 ? (
            <span className="text-sm text-[#2B2B2B]/50">Bấm các thẻ từ dưới đây theo đúng thứ tự…</span>
          ) : (
            picked.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPicked(picked.filter((_, j) => j !== i))}
                className="mx-1 inline-block rounded-lg bg-[#A54432] px-3 py-1 text-2xl font-bold text-white"
                title="Bấm để gỡ thẻ này"
              >
                {t}
              </button>
            ))
          )}
        </div>
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {remaining.map((t, i) => (
            <button
              key={`${t}-${i}`}
              type="button"
              data-testid={`order-tile-${t}`}
              onClick={() => !answered && setPicked([...picked, t])}
              disabled={answered}
              className="rounded-lg border border-[#2B2B2B]/25 bg-white px-3 py-2 text-2xl font-bold text-[#2B2B2B] transition hover:border-[#A54432] hover:bg-[#A54432]/5 disabled:opacity-60"
            >
              {t}
            </button>
          ))}
        </div>
        {!answered && (
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              data-testid="order-check"
              onClick={checkOrder}
              disabled={picked.length === 0}
              className="flex-1 rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828] disabled:opacity-40"
            >
              Kiểm tra câu
            </button>
            <button
              type="button"
              onClick={() => setPicked([])}
              className="rounded-full border border-[#2B2B2B]/30 px-4 py-3 text-sm font-semibold text-[#2B2B2B]/70"
            >
              Xếp lại
            </button>
          </div>
        )}
        <HintButton hint={`Thứ tự đúng: ${step.tiles.join(' · ')}`} onHint={() => setUsedHint(true)} />
        <div className="mt-3">{feedbackBox}</div>
        {answered && <div className="mt-3">{continueBtn}</div>}
      </div>
    );
  }

  // --- choose-number: 遍 / 四季 / 大熊猫 (đơn vị đếm theo bước) ---------------
  if (step.kind === 'choose-number') {
    const lx = lexeme(step.lexemeId);
    const unit = step.unit ?? 'lượt';
    const choose = (n: number) => {
      if (answered) return;
      const correct = n === step.correct;
      setFeedback({
        correct,
        text: correct
          ? `Đúng rồi! “${step.zh}” — đúng là ${step.correct} ${unit}.`
          : `Chưa đúng — đáp án là ${step.correct} ${unit}, không phải ${n} ${unit}. Nghe lại rồi chọn nhé.`,
      });
      record(correct, step.lexemeId, 'quiz');
      if (correct) setAnswered(true);
    };
    return (
      <div className="w-full">
        {header}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-3xl font-bold text-[#2B2B2B]">{step.zh}</p>
          <SpeakButton text={step.zh} onSpeak={props.onSpeak} soundOn={props.soundOn} />
        </div>
        <p className="mb-3 text-base text-[#2B2B2B]/85">{step.vi}</p>
        {lx && <div className="mb-3"><LexemeCard lexeme={lx} /></div>}
        <div className="mb-3 grid grid-cols-4 gap-2">
          {step.options.map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`number-option-${n}`}
              onClick={() => choose(n)}
              disabled={answered}
              className="rounded-xl border border-[#2B2B2B]/20 bg-white px-3 py-4 text-center text-3xl font-bold text-[#2B2B2B] transition hover:border-[#A54432] hover:bg-[#A54432]/5 disabled:opacity-60"
            >
              {n}
            </button>
          ))}
        </div>
        {feedbackBox}
        {answered && <div className="mt-3">{continueBtn}</div>}
      </div>
    );
  }

  // --- choose-goal: 提高 ------------------------------------------------------
  if (step.kind === 'choose-goal') {
    const lx = lexeme(step.lexemeId);
    const choose = (text: string) => {
      if (answered) return;
      setFeedback({ correct: true, text: `Đã ghi nhận mục tiêu của bạn: “${text}” — cố lên nhé!` });
      record(true, step.lexemeId, 'quest');
      setAnswered(true);
    };
    return (
      <div className="w-full">
        {header}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-3xl font-bold text-[#2B2B2B]">{step.zh}</p>
          <SpeakButton text={step.zh} onSpeak={props.onSpeak} soundOn={props.soundOn} />
        </div>
        <p className="mb-3 text-base text-[#2B2B2B]/85">{step.vi}</p>
        {lx && <div className="mb-3"><LexemeCard lexeme={lx} /></div>}
        <div className="mb-3 space-y-2">
          {step.options.map((o, i) => (
            <button
              key={o.text}
              type="button"
              data-testid={`goal-option-${i}`}
              onClick={() => choose(o.text)}
              disabled={answered}
              className="w-full rounded-xl border border-[#2B2B2B]/20 bg-white px-4 py-3 text-left transition hover:border-[#A54432] hover:bg-[#A54432]/5 disabled:opacity-60"
            >
              <span className="block text-2xl font-bold text-[#2B2B2B]">{o.text}</span>
              <span className="block text-sm text-[#2B2B2B]/60">{o.vi}</span>
            </button>
          ))}
        </div>
        {feedbackBox}
        {answered && <div className="mt-3">{continueBtn}</div>}
      </div>
    );
  }

  // --- review: kiểm tra cuối 5 từ (tự nhớ) + vòng ôn lại ngay (F2a) --------
  if (step.kind === 'review') {
    if (reviewDone) {
      return (
        <div className="w-full">
          {header}
          <p className="mb-3 text-base leading-relaxed text-[#2B2B2B]/85">
            Bạn đã kiểm tra xong 5 từ và tự nhớ đúng hết — không có từ nào sai cần ôn lại ngay.
          </p>
          <button
            type="button"
            data-testid="review-done"
            onClick={props.onReviewDone}
            className="w-full rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828]"
          >
            Xem kết quả →
          </button>
        </div>
      );
    }

    // Một câu hỏi kiểm tra/ôn lại: dùng chung cho cả kiểm tra cuối và vòng
    // ôn lại ngay (khác nhau ở tiêu đề, nút tiếp và cách ghi đáp án).
    const renderQuestion = (
      target: Lexeme | undefined,
      kind: 'type-pinyin' | 'pick-meaning' | 'dictation',
      phase: 'review' | 're-review',
      idx: number,
      total: number,
    ) => {
      if (!target) return null;
      const isRe = phase === 're-review';
      const distractors = props.allLexemes.filter((l) => l.id !== target.id).slice(0, 3);
      const meaningOptions = [...distractors, target].sort((a, b) => a.id.localeCompare(b.id));
      return (
        <div className="w-full" data-testid={isRe ? 'rereview-panel' : 'review-panel'}>
          {header}
          <p className="mb-1 text-sm font-bold text-[#A54432]">
            {isRe
              ? `Ôn lại ngay — câu ${idx + 1}/${total} · Từ vừa sai, hỏi lại bằng dạng câu khác`
              : `Kiểm tra cuối — câu ${idx + 1}/${total} · Tự nhớ, không nhìn đáp án trước`}
          </p>
          <p className="mb-3 text-sm text-[#2B2B2B]/70">
            {isRe
              ? 'Chỉ hiện chữ Hán. Câu này không tính điểm, không đổi mức nhớ dài hạn — sai vẫn ôn lại vào ngày mai.'
              : 'Chỉ hiện chữ Hán. Pinyin và nghĩa đang ẩn — hãy tự nhớ rồi trả lời.'}
          </p>
          <div className="mb-3 rounded-lg border border-[#A54432]/30 bg-[#FFF8E6] px-4 py-4 text-center">
            <div className="text-5xl font-bold leading-tight text-[#2B2B2B]">{target.hanzi}</div>
          </div>
          {kind === 'type-pinyin' && (
            <div>
              <label htmlFor="review-pinyin" className="mb-1 block text-sm font-semibold text-[#2B2B2B]/80">
                Gõ pinyin của từ trên (không bắt buộc dấu thanh):
              </label>
              <input
                id="review-pinyin"
                autoFocus
                type="text"
                value={input}
                disabled={answered}
                onChange={(e) => setInput(e.target.value)}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={() => {
                  composingRef.current = false;
                }}
                onKeyDown={(e) => {
                  // KHÔNG chấm khi đang gõ IME — chờ compositionend mới cho Enter.
                  if (e.key === 'Enter' && !composingRef.current && !answered) {
                    e.preventDefault();
                    submitReviewText('type-pinyin', target, isRe);
                  }
                }}
                placeholder="Nhập pinyin…"
                className="mb-2 w-full rounded-xl border border-[#2B2B2B]/30 px-4 py-3 text-xl text-[#2B2B2B] focus:border-[#A54432] focus:outline-none"
              />
              <button
                type="button"
                data-testid="review-check"
                onClick={() => submitReviewText('type-pinyin', target, isRe)}
                disabled={answered || !input.trim()}
                className="mb-3 w-full rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828] disabled:opacity-40"
              >
                Chấm đáp án
              </button>
              {!isRe && <HintButton hint={`Pinyin của từ này là ${target.pinyin}.`} onHint={() => setUsedHint(true)} />}
            </div>
          )}
          {kind === 'dictation' && (
            <div>
              <p className="mb-2 text-sm font-semibold text-[#2B2B2B]/80">
                Nghe cô đọc từ này rồi gõ lại chữ Hán:
              </p>
              <div className="mb-2">
                <SpeakButton text={target.hanzi} onSpeak={props.onSpeak} soundOn={props.soundOn} label="🔊 Nghe từ" />
              </div>
              <input
                id="review-dictation"
                autoFocus
                type="text"
                value={input}
                disabled={answered}
                onChange={(e) => setInput(e.target.value)}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={() => {
                  composingRef.current = false;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !composingRef.current && !answered) {
                    e.preventDefault();
                    submitReviewText('dictation', target, isRe);
                  }
                }}
                placeholder="Gõ chữ Hán…"
                className="mb-2 w-full rounded-xl border border-[#2B2B2B]/30 px-4 py-3 text-3xl text-[#2B2B2B] focus:border-[#A54432] focus:outline-none"
              />
              <button
                type="button"
                data-testid="review-check"
                onClick={() => submitReviewText('dictation', target, isRe)}
                disabled={answered || !input.trim()}
                className="mb-3 w-full rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828] disabled:opacity-40"
              >
                Chấm đáp án
              </button>
            </div>
          )}
          {kind === 'pick-meaning' && (
            <div className="mb-3 space-y-2">
              <p className="text-sm font-semibold text-[#2B2B2B]/80">Từ trên nghĩa là gì?</p>
              {meaningOptions.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  data-testid={`review-meaning-${l.id}`}
                  onClick={() => submitReviewMeaning(l.id, target, isRe)}
                  disabled={answered}
                  className="w-full rounded-xl border border-[#2B2B2B]/20 bg-white px-4 py-3 text-left text-base text-[#2B2B2B] transition hover:border-[#A54432] hover:bg-[#A54432]/5 disabled:opacity-60"
                >
                  {l.meaning}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3">{feedbackBox}</div>
          {answered && (
            <button
              type="button"
              data-testid="review-next"
              onClick={isRe ? nextReReview : nextReview}
              className="mt-3 w-full rounded-full bg-[#2E7D32] px-6 py-3 text-base font-bold text-white transition hover:bg-[#256B29]"
            >
              {idx + 1 >= total ? (isRe ? 'Xem kết quả →' : 'Xong kiểm tra →') : 'Câu tiếp →'}
            </button>
          )}
        </div>
      );
    };

    if (inReReview) {
      const id = reReviewIds[reReviewIdx];
      const target = props.lexemeById[id];
      return renderQuestion(target, reReviewKind(id), 're-review', reReviewIdx, reReviewIds.length);
    }
    const target = props.lexemeById[step.lexemeIds[reviewIdx]];
    const kind = reviewKind(reviewIdx);
    return renderQuestion(target, kind, 'review', reviewIdx, step.lexemeIds.length);
  }

  // --- result: ResultPanel của page render riêng; panel này chỉ là dự phòng ---
  return (
    <div className="w-full">
      {header}
      {continueBtn}
    </div>
  );
}
