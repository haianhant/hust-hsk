// ---------------------------------------------------------------------------
// ReviewSession.tsx — Phiên ôn nhanh (Bước 8): flashcard tự đánh giá.
// Dùng cho (a) lịch ôn SRS: nhớ đúng +10đ, level +1 (qua recordAnswer);
// (b) sổ lỗi: 0đ, không đổi level/nextDue (qua recordReReview).
// Tự đánh giá nên ghi rõ: chỉ bấm "Đã nhớ" khi thực sự nhớ nghĩa.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import type { Lexeme } from '../../lib/learn/types';

export interface ReviewSessionProps {
  title: string;
  subtitle: string;
  words: Lexeme[];
  mode: 'review' | 'error';
  onAnswer: (lexemeId: string, correct: boolean) => void;
  onSpeak: (text: string) => void;
  soundOn: boolean;
  onClose: () => void;
}

export default function ReviewSession({
  title,
  subtitle,
  words,
  mode,
  onAnswer,
  onSpeak,
  soundOn,
  onClose,
}: ReviewSessionProps) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const done = idx >= words.length;
  const word = done ? null : words[idx];

  const answer = (correct: boolean) => {
    if (!word) return;
    if (correct) setRemembered((n) => n + 1);
    onAnswer(word.id, correct);
    setIdx((i) => i + 1);
    setRevealed(false);
  };

  return (
    <div data-testid="review-session" className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-[#2B2B2B]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng phiên ôn"
          className="rounded-full bg-[#2B2B2B]/10 px-3 py-1 text-lg font-bold text-[#2B2B2B] hover:bg-[#2B2B2B]/20"
        >
          ✕
        </button>
      </div>
      <p className="mb-3 text-sm text-[#2B2B2B]/70">{subtitle}</p>

      {words.length === 0 && (
        <p className="rounded-lg bg-[#EAF3E6] px-4 py-6 text-center text-base text-[#2E7D32]">
          Không có từ nào cần ôn. 🎉
        </p>
      )}

      {!done && word && (
        <div>
          <p className="mb-2 text-sm font-semibold text-[#2B2B2B]/60">
            Từ {idx + 1}/{words.length}
            {mode === 'error' ? ' · vòng ôn lỗi (0đ)' : ' · ôn đúng hạn +10đ khi nhớ'}
          </p>
          <div className="rounded-2xl border border-[#2B2B2B]/15 bg-white px-4 py-6 text-center">
            <div className="text-5xl font-bold text-[#2B2B2B]">{word.hanzi}</div>
            {revealed ? (
              <div className="mt-3">
                <div className="text-xl text-[#1F5C8A]">{word.pinyin}</div>
                <div className="mt-1 text-lg text-[#2B2B2B]/85">{word.meaning}</div>
              </div>
            ) : (
              <button
                type="button"
                data-testid="review-reveal"
                onClick={() => setRevealed(true)}
                className="mt-4 rounded-full border-2 border-[#1F5C8A] px-6 py-2 text-base font-semibold text-[#1F5C8A] transition hover:bg-[#1F5C8A]/10"
              >
                Hiện nghĩa
              </button>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onSpeak(word.hanzi)}
                disabled={!soundOn}
                aria-label={`Nghe phát âm ${word.hanzi}`}
                className="rounded-full bg-[#1F5C8A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17486E] disabled:opacity-40"
              >
                🔊 Nghe
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-[#2B2B2B]/60">
            Tự đánh giá — hãy thành thật: chỉ bấm “Đã nhớ” khi bạn thực sự nhớ nghĩa của từ.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              data-testid="review-forget"
              onClick={() => answer(false)}
              className="flex-1 rounded-full border-2 border-[#A54432] px-6 py-3 text-base font-bold text-[#A54432] transition hover:bg-[#A54432]/10"
            >
              Chưa nhớ ✗
            </button>
            <button
              type="button"
              data-testid="review-remember"
              onClick={() => answer(true)}
              className="flex-1 rounded-full bg-[#2E7D32] px-6 py-3 text-base font-bold text-white transition hover:bg-[#256B29]"
            >
              Đã nhớ ✓
            </button>
          </div>
        </div>
      )}

      {done && words.length > 0 && (
        <div data-testid="review-summary" className="text-center">
          <div className="text-3xl">🎉</div>
          <p className="mt-2 text-xl font-bold text-[#2B2B2B]">
            Xong phiên ôn: nhớ {remembered}/{words.length} từ.
          </p>
          <p className="mt-1 text-sm text-[#2B2B2B]/70">
            {mode === 'error'
              ? 'Từ đã sửa sẽ không còn nằm trong sổ lỗi sau khi bạn nhớ lại (vòng ôn lỗi 0đ, không đổi lịch ôn).'
              : 'Từ nhớ đúng đã lên level và dời lịch ôn theo SRS 1–3–7–14–30 ngày; từ chưa nhớ về level 0, ôn lại ngày mai.'}
          </p>
          <button
            type="button"
            data-testid="review-close"
            onClick={onClose}
            className="mt-4 w-full rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828]"
          >
            Xong
          </button>
        </div>
      )}
    </div>
  );
}
