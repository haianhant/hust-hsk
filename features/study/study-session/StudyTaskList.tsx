'use client';

// ---------------------------------------------------------------------------
// features/study/study-session/StudyTaskList.tsx — Personal Study Task list
// management UI (`feature.study.session`).
// ---------------------------------------------------------------------------

import { useState, type FormEvent } from 'react';
import { MAX_STUDY_TASKS, type StudyTaskItem } from './session';

export interface StudyTaskListProps {
  tasks: StudyTaskItem[];
  onAddTask: (title: string) => void;
  onToggleTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
}

export function StudyTaskList({
  tasks,
  onAddTask,
  onToggleTask,
  onRemoveTask,
}: StudyTaskListProps) {
  const [draft, setDraft] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned) return;
    onAddTask(cleaned);
    setDraft('');
  };

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <section
      aria-label="Danh sách việc cần làm"
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-[#1c2b1f]">
          📝 Mục tiêu &amp; việc cần làm
        </h3>
        <span
          data-testid="study-task-counter"
          className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600"
        >
          {completedCount}/{tasks.length} hoàn thành
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
        <input
          type="text"
          data-testid="study-task-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={120}
          placeholder="Thêm việc cần làm (VD: Ôn 15 từ Bài 10 HSK 3)..."
          aria-label="Nhập công việc học tập mới"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-[#1c2b1f] placeholder:text-stone-400 focus:border-[#A54432] focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          data-testid="study-task-add"
          disabled={!draft.trim() || tasks.length >= MAX_STUDY_TASKS}
          className="shrink-0 rounded-xl bg-[#1c5c3a] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#16492e] disabled:opacity-50"
        >
          + Thêm
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="rounded-xl bg-stone-50 px-3 py-4 text-center text-xs text-stone-500">
          Chưa có mục tiêu nào. Hãy thêm 1–3 đầu việc ngắn gọn cho phiên Pomodoro này.
        </p>
      ) : (
        <ul data-testid="study-task-list" className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              data-testid="study-task-item"
              className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2 text-sm"
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  data-testid={`study-task-toggle-${task.id}`}
                  checked={task.done}
                  onChange={() => onToggleTask(task.id)}
                  className="h-4 w-4 rounded border-stone-300 text-[#1c5c3a] focus:ring-[#1c5c3a]"
                />
                <span
                  className={`truncate ${
                    task.done ? 'text-stone-400 line-through' : 'font-medium text-[#1c2b1f]'
                  }`}
                >
                  {task.title}
                </span>
              </label>
              <button
                type="button"
                data-testid={`study-task-remove-${task.id}`}
                onClick={() => onRemoveTask(task.id)}
                aria-label={`Xóa công việc ${task.title}`}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-stone-400 transition hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default StudyTaskList;
