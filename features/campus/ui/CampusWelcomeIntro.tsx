'use client';

// ---------------------------------------------------------------------------
// features/campus/ui/CampusWelcomeIntro.tsx — Thẻ hội thoại Intro gọn gàng
// từ Bạn học Minh (Áo phông đỏ HUST) chỉ tự động mở đúng 1 lần ở lần vào đầu.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { CAMPUS_WELCOME_STEPS } from './welcome-intro-state';

export interface CampusWelcomeIntroProps {
  open: boolean;
  playerName?: string;
  onClose: () => void;
}

export function CampusWelcomeIntro({
  open,
  playerName,
  onClose,
}: CampusWelcomeIntroProps) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setStepIdx(0);
    }
  }, [open]);

  if (!open) return null;

  const step = CAMPUS_WELCOME_STEPS[stepIdx] ?? CAMPUS_WELCOME_STEPS[0];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx >= CAMPUS_WELCOME_STEPS.length - 1;
  const displayName = (playerName ?? '').trim() || 'tân sinh viên';
  const renderedTitle = step.title.replace('{name}', displayName);

  return (
    <aside
      aria-label="Giới thiệu tân sinh viên Bách Khoa 3D"
      data-testid="campus-welcome-intro"
      className="pointer-events-auto fixed bottom-[12.75rem] left-1/2 z-30 w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border border-rose-300/35 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-xl sm:bottom-16"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#DA1E26] text-xs font-black text-white shadow">
            👋
          </span>
          <span className="text-[11px] font-bold tracking-wide text-rose-200 uppercase">
            Bạn học Minh · Áo đỏ HUST
          </span>
        </div>
        <button
          type="button"
          data-testid="welcome-intro-skip"
          onClick={onClose}
          className="rounded-lg px-2 py-0.5 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          Bỏ qua
        </button>
      </div>

      <p className="text-[11px] font-semibold text-amber-300/95">{step.badge}</p>
      <h2 className="mt-0.5 text-sm font-extrabold leading-snug text-white sm:text-base">
        {renderedTitle}
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-200 sm:text-[13px]">
        {step.body}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {CAMPUS_WELCOME_STEPS.map((s, idx) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === stepIdx ? 'w-5 bg-[#DA1E26]' : 'w-1.5 bg-white/25'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Quay lại
            </button>
          )}
          <button
            type="button"
            data-testid="welcome-intro-next"
            onClick={() => {
              if (isLast) {
                onClose();
              } else {
                setStepIdx((i) => Math.min(CAMPUS_WELCOME_STEPS.length - 1, i + 1));
              }
            }}
            className="rounded-xl bg-[#B5121B] px-3.5 py-1.5 text-xs font-bold text-white shadow transition hover:bg-[#8F1418]"
          >
            {isLast ? 'Bắt đầu khám phá!' : 'Tiếp theo ›'}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default CampusWelcomeIntro;
