/**
 * lib/learn/suggest.ts — Gợi ý việc nên làm tiếp khi mở app (Bước 8).
 *
 * Gọn, một dòng, không che cảnh: hiển thị ở màn mở đầu (dưới nút vào
 * trường) và có thể tái dùng ở HUD. Thứ tự ưu tiên:
 * 1. Có từ đến hạn ôn hôm nay (kể cả quá hạn) → ôn trước.
 * 2. Có quest đang học dở → học tiếp quest đó.
 * 3. Bài tiếp theo chưa hoàn thành (theo thứ tự HSK 3 → HSK 4).
 * 4. Đã hoàn thành tất cả → ôn lại từ cần ôn.
 */
import type { Progress } from './types';
import { ALL_QUEST_DEFS } from './quest-data';
import { getDueWordsIncludingTodayWrong, todayKey } from './store';

export type SuggestionAction = 'calendar' | 'resume' | 'start' | 'none';

export interface NextSuggestion {
  kind: 'due' | 'unfinished' | 'next' | 'done';
  text: string;
  action: SuggestionAction;
  /** Quest sẽ mở khi bấm (resume/start), null nếu chỉ mở lịch ôn. */
  questId: string | null;
  /** Số từ đến hạn (chỉ có nghĩa khi kind = 'due'). */
  dueCount: number;
}

export function getNextSuggestion(p: Progress | null): NextSuggestion {
  if (!p) {
    return {
      kind: 'next',
      text: 'Bắt đầu với "Buổi học đầu tiên" — gặp Minh ở cổng Parabol.',
      action: 'start',
      questId: 'first-lesson',
      dueCount: 0,
    };
  }
  let dueCount = 0;
  try {
    dueCount = getDueWordsIncludingTodayWrong(p, todayKey()).length;
  } catch {
    dueCount = 0;
  }
  if (dueCount > 0) {
    return {
      kind: 'due',
      text: `Hôm nay có ${dueCount} từ đến hạn ôn — mở Sổ tay › Lịch ôn để ôn.`,
      action: 'calendar',
      questId: null,
      dueCount,
    };
  }
  const active = p.questState && !p.questState.done ? p.questState.questId : null;
  if (active) {
    const def = ALL_QUEST_DEFS.find((d) => d.quest.id === active);
    return {
      kind: 'unfinished',
      text: `Bài "${def?.quest.title ?? active}" đang học dở — bấm để học tiếp.`,
      action: 'resume',
      questId: active,
      dueCount: 0,
    };
  }
  const nextDef = ALL_QUEST_DEFS.find((d) => !p.completedQuests[d.quest.id]);
  if (nextDef) {
    return {
      kind: 'next',
      text: `Bài tiếp theo: "${nextDef.quest.title}" — ${nextDef.quest.lexemeIds.length} từ mới.`,
      action: 'start',
      questId: nextDef.quest.id,
      dueCount: 0,
    };
  }
  return {
    kind: 'done',
    text: 'Đã hoàn thành tất cả các bài — ôn lại từ cần ôn để giữ vững nhé.',
    action: 'calendar',
    questId: null,
    dueCount: 0,
  };
}
