// ---------------------------------------------------------------------------
// ResultPanel.tsx — Màn tổng kết sau khi hoàn thành bài học HSK tại Tòa C7.
// Đã lược bỏ bước "Kiểm tra cuối 5 từ" theo thiết kế EdTech Tòa C7 mới; chỉ
// hiển thị danh sách từ đã học, điểm thưởng, huy hiệu và nút chọn bài khác / ra sân.
// ---------------------------------------------------------------------------

import type { Lexeme } from '../../lib/learn/types';

export interface ResultPanelProps {
  encountered: Lexeme[];
  totalLexemes: number;
  recallCorrect: number;
  recallTotal: number;
  recallResults: { lexeme: Lexeme; correct: boolean }[];
  dueWords: Lexeme[];
  dueTomorrowIds?: string[];
  rewardPoints: number;
  rewardAlreadyGiven: boolean;
  globalBadges?: { id: string; title: string; isNew: boolean }[];
  onReviewNow: () => void;
  onContinue: () => void;
  onPickAnotherLesson?: () => void;
}

export default function ResultPanel({
  encountered,
  totalLexemes,
  recallCorrect,
  recallTotal,
  recallResults,
  dueWords,
  dueTomorrowIds = [],
  rewardPoints,
  rewardAlreadyGiven,
  globalBadges = [],
  onReviewNow,
  onContinue,
  onPickAnotherLesson,
}: ResultPanelProps) {
  return (
    <div className="w-full">
      <div className="mb-3 text-center">
        <div className="text-3xl">🎉</div>
        <h2 className="mt-1 text-2xl font-bold text-[#2B2B2B]">
          Hoàn thành bài học tại Tòa C7!
        </h2>
        <p className="mt-1 text-base text-[#2B2B2B]/75">
          {recallTotal > 0
            ? `Bạn đã học ${encountered.length}/${totalLexemes} từ và nhớ đúng ${recallCorrect}/${recallTotal} từ.`
            : `Bạn đã hoàn thành trọn vẹn bài giảng tại Giảng đường Tòa C7 (${encountered.length} từ vựng đã tích lũy).`}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#A54432]">
          {rewardAlreadyGiven
            ? `Thưởng ${rewardPoints} điểm của bài này đã nhận trước đó.`
            : `+${rewardPoints} điểm thưởng hoàn thành bài học tại Tòa C7!`}
        </p>
      </div>

      <div className="mb-3">
        <h3 className="mb-2 text-sm font-bold text-[#2B2B2B]/80">Từ vựng đã tích lũy:</h3>
        <div className="flex flex-wrap gap-2">
          {encountered.slice(-18).map((l) => (
            <span
              key={l.id}
              className="rounded-full bg-[#EAF3E6] px-3 py-1 text-base font-semibold text-[#2E7D32]"
            >
              {l.hanzi} <span className="text-xs font-normal">({l.pinyin})</span>
            </span>
          ))}
        </div>
      </div>

      {recallTotal > 0 && recallResults.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-bold text-[#2B2B2B]/80">Kết quả ôn nhanh:</h3>
          <div className="space-y-1">
            {recallResults.map(({ lexeme, correct }) => (
              <div
                key={lexeme.id}
                className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-base ${
                  correct ? 'bg-[#E3F2E6] text-[#1E5A22]' : 'bg-[#FDECEA] text-[#8A1F16]'
                }`}
              >
                <span>
                  <span className="font-bold">{lexeme.hanzi}</span>
                  <span className="ml-2 text-sm">
                    ({lexeme.pinyin} — {lexeme.meaning})
                  </span>
                </span>
                <span className="font-bold">{correct ? '✓ Đúng' : '✗ Sai'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dueWords.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-bold text-[#A54432]">Cần ôn lại:</h3>
          <div className="flex flex-wrap gap-2">
            {dueWords.map((l) => (
              <span
                key={l.id}
                className="rounded-full bg-[#FDECEA] px-3 py-1 text-base font-semibold text-[#8A1F16]"
              >
                {l.hanzi}
                {dueTomorrowIds.includes(l.id) && (
                  <span className="ml-1 text-xs font-normal">· ôn lại ngày mai</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {globalBadges.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-bold text-[#2B2B2B]/80">Huy hiệu đạt được:</h3>
          <div className="flex flex-wrap gap-2">
            {globalBadges.map((b) => (
              <span
                key={b.id}
                className={`rounded-full px-3 py-1 text-base font-semibold ${
                  b.isNew ? 'bg-[#EAF3E6] text-[#1E5A22]' : 'bg-[#2B2B2B]/5 text-[#2B2B2B]/70'
                }`}
              >
                🏅 {b.title}
                {b.isNew && <span className="ml-1 text-xs font-bold">· mới đạt!</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {onPickAnotherLesson ? (
          <button
            type="button"
            data-testid="result-pick-another-lesson"
            onClick={onPickAnotherLesson}
            className="flex-1 rounded-full bg-[#1F5C8A] px-5 py-3 text-base font-bold text-white transition hover:bg-[#17486E]"
          >
            📚 Chọn bài khác tại C7
          </button>
        ) : (
          <button
            type="button"
            data-testid="result-review-now"
            onClick={onReviewNow}
            className="flex-1 rounded-full bg-[#1F5C8A] px-5 py-3 text-base font-bold text-white transition hover:bg-[#17486E]"
          >
            Ôn từ trong Sổ tay
          </button>
        )}
        <button
          type="button"
          data-testid="result-continue"
          onClick={onContinue}
          className="flex-1 rounded-full bg-[#A54432] px-5 py-3 text-base font-bold text-white transition hover:bg-[#8A3828]"
        >
          Ra sân Tòa C7 →
        </button>
      </div>
    </div>
  );
}
