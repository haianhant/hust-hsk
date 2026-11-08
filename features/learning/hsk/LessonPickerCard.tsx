// ---------------------------------------------------------------------------
// features/learning/hsk/LessonPickerCard.tsx — Thẻ chọn bài học HSK 3 (Bài 10–18)
// & HSK 4 (Quyển thượng Bài 1–10, Quyển hạ Bài 11–20), dùng chung cho màn mở đầu
// và menu "Đổi bài" trong game.
// Module ID: feature.learning.hsk
// ---------------------------------------------------------------------------

import { HSK3_LESSONS, HSK3_LESSON_LEXEMES } from '../../../content/hsk3-index';
import { HSK4_LESSONS, HSK4_LESSON_LEXEMES } from '../../../content/hsk4-index';
import type { Lesson } from '../../../lib/learn/types';
import { pickQuestForLesson, statusForLesson } from './objectives';

export interface LessonPickerCardProps {
  activeQuestId: string | null;
  completedQuests: Record<string, { at: string; points: number }>;
  onPick: (questId: string) => void;
  onClose: () => void;
  onHome?: () => void;
}

export default function LessonPickerCard({
  activeQuestId,
  completedQuests,
  onPick,
  onClose,
  onHome,
}: LessonPickerCardProps) {
  const lessonButton = (lesson: Lesson, levelLabel: string) => {
    const wordCount =
      (levelLabel === 'HSK 3' ? HSK3_LESSON_LEXEMES : HSK4_LESSON_LEXEMES)[lesson.id]?.length ?? 0;
    return (
      <button
        key={lesson.id}
        type="button"
        data-testid={`lesson-pick-${lesson.id}`}
        onClick={() => onPick(pickQuestForLesson(lesson.id, activeQuestId, completedQuests))}
        className="mb-2 w-full rounded-xl border border-[#A54432]/40 bg-[#FFF8E6] px-4 py-3 text-left transition hover:bg-[#A54432]/10"
      >
        <span className="block text-base font-bold text-[#2B2B2B]">
          {levelLabel} · Bài {lesson.number} — {lesson.title}
        </span>
        <span className="block text-sm text-[#2B2B2B]/70">
          {lesson.topic} · {wordCount} từ · {statusForLesson(lesson.id, activeQuestId, completedQuests)}
        </span>
      </button>
    );
  };

  return (
    <div
      data-testid="lesson-picker"
      className="w-full max-w-md rounded-2xl border border-[#1c2b1f]/15 bg-white p-4 text-left shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1c2b1f]">Chọn bài học</h2>
        <button
          type="button"
          aria-label="Đóng chọn bài"
          onClick={onClose}
          className="rounded-full bg-black/10 px-2 py-0.5 font-bold text-[#1c2b1f]"
        >
          ✕
        </button>
      </div>
      {/* Danh sách bài cuộn trong thẻ (29 bài HSK 3 + HSK 4 không vừa màn
          hình): tiêu đề + nút "Về màn hình chính" luôn hiện, chỉ phần danh
          sách cuộn — trên điện thoại thật vẫn bấm được bài ở cuối danh sách. */}
      <div data-testid="lesson-list" className="max-h-[58vh] overflow-y-auto pr-1">
        <h3 className="mb-1 text-sm font-bold text-[#1c2b1f]/80">HSK 3 · Bài 10–18</h3>
        {HSK3_LESSONS.map((lesson) => lessonButton(lesson, 'HSK 3'))}
        <h3 className="mb-1 mt-3 text-sm font-bold text-[#1c2b1f]/80">
          HSK 4 · Quyển thượng · Bài 1–10
        </h3>
        {HSK4_LESSONS.filter((l) => l.id.startsWith('hsk4-shang')).map((lesson) =>
          lessonButton(lesson, 'HSK 4'),
        )}
        <h3 className="mb-1 mt-3 text-sm font-bold text-[#1c2b1f]/80">
          HSK 4 · Quyển hạ · Bài 11–20
        </h3>
        {HSK4_LESSONS.filter((l) => l.id.startsWith('hsk4-xia')).map((lesson) =>
          lessonButton(lesson, 'HSK 4'),
        )}
        <div className="mb-2 w-full cursor-not-allowed rounded-xl border border-[#2B2B2B]/10 bg-[#2B2B2B]/5 px-4 py-3 text-left text-sm text-[#2B2B2B]/50">
          HSK 5 — Sắp ra mắt
        </div>
      </div>
      {onHome && (
        <button
          type="button"
          onClick={onHome}
          className="w-full rounded-full border-2 border-[#1c2b1f]/30 px-6 py-2.5 text-base font-semibold text-[#1c2b1f] transition hover:bg-black/5"
        >
          🏠 Về màn hình chính
        </button>
      )}
    </div>
  );
}
