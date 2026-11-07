// ---------------------------------------------------------------------------
// ResultPanel.tsx — Màn kết quả tuyến "Buổi học đầu tiên" (Bước 5).
// Hiển thị: đã gặp từ nào, tự nhớ đúng từ nào, từ nào cần ôn; nút "Ôn lỗi
// ngay" (mở sổ tay tab Cần ôn) + "Học tiếp" (ra khỏi phòng về campus).
// ---------------------------------------------------------------------------

import type { Lexeme } from '../../lib/learn/types';

export interface ResultPanelProps {
  encountered: Lexeme[];
  totalLexemes: number;
  recallCorrect: number;
  recallTotal: number;
  recallResults: { lexeme: Lexeme; correct: boolean }[];
  dueWords: Lexeme[];
  /** ID các từ sai trong phiên — hiển thị nhãn "ôn lại ngày mai" (F2b). */
  dueTomorrowIds?: string[];
  rewardPoints: number;
  rewardAlreadyGiven: boolean;
  /** Huy hiệu toàn cục đạt được nhờ buổi học này (Bước 8); isNew = mới đạt. */
  globalBadges?: { id: string; title: string; isNew: boolean }[];
  onReviewNow: () => void;
  onContinue: () => void;
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
}: ResultPanelProps) {
  return (
    <div className="w-full">
      <div className="mb-2 text-center">
        <div className="text-3xl">🎉</div>
        <h2 className="mt-1 text-2xl font-bold text-[#2B2B2B]">Xong buổi học đầu tiên!</h2>
        <p className="mt-1 text-base text-[#2B2B2B]/75">
          Bạn đã gặp {encountered.length}/{totalLexemes} từ và tự nhớ đúng {recallCorrect}/{recallTotal} từ ở phần kiểm tra cuối.
        </p>
        <p className="mt-1 text-sm font-semibold text-[#A54432]">
          {rewardAlreadyGiven
            ? `Thưởng ${rewardPoints} điểm đã nhận ở lần chơi trước.`
            : `+${rewardPoints} điểm thưởng hoàn thành nhiệm vụ lần đầu!`}
        </p>
      </div>

      <div className="mb-2">
        <h3 className="mb-2 text-sm font-bold text-[#2B2B2B]/80">Đã gặp trong buổi học:</h3>
        <div className="flex flex-wrap gap-2">
          {encountered.map((l) => (
            <span key={l.id} className="rounded-full bg-[#EAF3E6] px-3 py-1 text-base font-semibold text-[#2E7D32]">
              {l.hanzi} <span className="text-xs font-normal">({l.pinyin})</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <h3 className="mb-2 text-sm font-bold text-[#2B2B2B]/80">Kiểm tra cuối — tự nhớ:</h3>
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
                <span className="ml-2 text-sm">({lexeme.pinyin} — {lexeme.meaning})</span>
              </span>
              <span className="font-bold">{correct ? '✓ Đúng' : '✗ Sai'}</span>
            </div>
          ))}
        </div>
      </div>

      {dueWords.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-bold text-[#A54432]">Cần ôn lại:</h3>
          <div className="flex flex-wrap gap-2">
            {dueWords.map((l) => (
              <span key={l.id} className="rounded-full bg-[#FDECEA] px-3 py-1 text-base font-semibold text-[#8A1F16]">
                {l.hanzi}
                {dueTomorrowIds.includes(l.id) && (
                  <span className="ml-1 text-xs font-normal">· ôn lại ngày mai</span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-[#2B2B2B]/60">
            Từ sai trong phiên đã được hỏi lại ngay — vẫn cần ôn lại vào ngày mai.
          </p>
        </div>
      )}

      {globalBadges.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-bold text-[#2B2B2B]/80">Huy hiệu toàn cục:</h3>
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
        <button
          type="button"
          data-testid="result-review-now"
          onClick={onReviewNow}
          className="flex-1 rounded-full bg-[#1F5C8A] px-6 py-3 text-base font-bold text-white transition hover:bg-[#17486E]"
        >
          Ôn lỗi ngay
        </button>
        <button
          type="button"
          data-testid="result-continue"
          onClick={onContinue}
          className="flex-1 rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828]"
        >
          Học tiếp →
        </button>
      </div>
    </div>
  );
}
