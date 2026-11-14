'use client';

// ---------------------------------------------------------------------------
// features/campus/ui/CampusQuestsModal.tsx — Modal 6 Nhiệm vụ "Hành trình
// Sinh viên Bách Khoa" + Bảng trang bị Danh hiệu, Huy hiệu Trường/Viện,
// Mũ Cử nhân & Đồ uống cầm tay. Hoạt động 100% độc lập kể cả khi tắt HSK.
// Module ID: feature.campus.quests
// ---------------------------------------------------------------------------

import { useState } from 'react';
import type { CharacterProfile } from '../../../lib/identity';
import type { CampusTitleId, HeldDrinkId, SchoolBadgeId } from '../../../lib/playerState';
import {
  CAMPUS_LIFE_QUESTS,
  CAMPUS_TITLES,
  SCHOOL_BADGES,
  getUnlockedTitleIds,
  isCampusQuestCompleted,
  isGradCapUnlocked,
  type CampusQuestsState,
} from '../quests/campus-quests';

export interface CampusQuestsModalProps {
  open: boolean;
  questsState: CampusQuestsState;
  characterProfile: CharacterProfile;
  heldDrink: HeldDrinkId;
  onClaimQuest: (questId: string) => void;
  onFastTravel: (destId: string) => void;
  onUpdateCosmetics: (patch: {
    schoolId?: SchoolBadgeId;
    titleId?: CampusTitleId;
    gradCap?: boolean;
  }) => void;
  onSelectDrink: (drinkId: HeldDrinkId) => void;
  onClose: () => void;
}

export function CampusQuestsModal({
  open,
  questsState,
  characterProfile,
  heldDrink,
  onClaimQuest,
  onFastTravel,
  onUpdateCosmetics,
  onSelectDrink,
  onClose,
}: CampusQuestsModalProps) {
  const [tab, setTab] = useState<'quests' | 'cosmetics'>('quests');

  if (!open) return null;

  const unlockedTitleIds = new Set(getUnlockedTitleIds(questsState));
  const gradUnlocked = isGradCapUnlocked(questsState);
  const completedCount = CAMPUS_LIFE_QUESTS.filter((q) =>
    isCampusQuestCompleted(questsState, q),
  ).length;

  return (
    <div
      data-testid="campus-quests-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-200/60 bg-[#FAF6EE] text-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-[#1E293B] px-5 py-3.5 text-white">
          <div>
            <h2 className="text-base font-extrabold sm:text-lg">
              🎒 Hành trình Sinh viên Bách Khoa ({completedCount}/{CAMPUS_LIFE_QUESTS.length})
            </h2>
            <p className="text-xs text-slate-300">
              Hoàn thành trải nghiệm sân trường để nhận ⭐ điểm & mở khóa Danh hiệu + 🎓 Mũ Cử nhân
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng bảng nhiệm vụ sinh viên"
            data-testid="campus-quests-close"
            onClick={onClose}
            className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white transition hover:bg-white/25"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-black/10 bg-white px-4 py-2.5">
          <button
            type="button"
            data-testid="quests-tab-btn"
            onClick={() => setTab('quests')}
            className={`rounded-full px-4 py-1.5 text-xs font-extrabold ${
              tab === 'quests'
                ? 'bg-[#B5121B] text-white shadow'
                : 'bg-black/5 text-slate-700 hover:bg-black/10'
            }`}
          >
            🎯 Nhiệm vụ Sân trường
          </button>
          <button
            type="button"
            data-testid="cosmetics-tab-btn"
            onClick={() => setTab('cosmetics')}
            className={`rounded-full px-4 py-1.5 text-xs font-extrabold ${
              tab === 'cosmetics'
                ? 'bg-[#B5121B] text-white shadow'
                : 'bg-black/5 text-slate-700 hover:bg-black/10'
            }`}
          >
            🏅 Danh hiệu & Phụ kiện ({unlockedTitleIds.size - 1}/{CAMPUS_TITLES.length - 1})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'quests' ? (
            <div className="space-y-3">
              {CAMPUS_LIFE_QUESTS.map((q) => {
                const current = Math.min(q.target, questsState.metrics[q.metricKey] ?? 0);
                const done = current >= q.target;
                const claimed = questsState.claimedIds.includes(q.id);
                const titleDef = CAMPUS_TITLES.find((t) => t.id === q.rewardTitleId);
                return (
                  <div
                    key={q.id}
                    data-testid={`campus-quest-${q.id}`}
                    className={`rounded-2xl border p-4 shadow-xs transition ${
                      claimed
                        ? 'border-emerald-300 bg-emerald-50/70'
                        : done
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-black/10 bg-white'
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg">{q.icon}</span>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            {q.order}. {q.title}
                          </h3>
                          <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                            {current}/{q.target}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{q.desc}</p>
                        <p className="text-[11px] text-slate-500">💡 {q.hint}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-bold">
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-800">
                            ⭐ +{q.rewardPoints} điểm
                          </span>
                          {titleDef && (
                            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-800">
                              {titleDef.label}
                            </span>
                          )}
                          {q.unlocksGradCap && (
                            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-purple-800">
                              🎓 Mũ Cử nhân Bách Khoa
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {claimed ? (
                          <span className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white">
                            ✅ Đã nhận thưởng
                          </span>
                        ) : done ? (
                          <button
                            type="button"
                            data-testid={`claim-quest-${q.id}`}
                            onClick={() => onClaimQuest(q.id)}
                            className="rounded-full bg-[#B5121B] px-4 py-2 text-xs font-extrabold text-white shadow transition hover:bg-[#8F1418]"
                          >
                            🎁 Nhận thưởng
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onFastTravel(q.fastTravelId);
                            }}
                            className="rounded-full border border-slate-300 bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-slate-200"
                          >
                            🧭 Đi tới nơi
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {/* 1. Trường / Viện trực thuộc */}
              <div>
                <h3 className="mb-2 text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                  1. Trường / Viện trực thuộc ĐHBK Hà Nội
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SCHOOL_BADGES.map((sb) => {
                    const active = (characterProfile.schoolId ?? 'none') === sb.id;
                    return (
                      <button
                        key={sb.id}
                        type="button"
                        data-testid={`school-badge-${sb.id}`}
                        onClick={() => onUpdateCosmetics({ schoolId: sb.id })}
                        className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left text-xs font-bold ${
                          active
                            ? 'border-[#B5121B] bg-[#B5121B]/10 text-[#8F1418] ring-1 ring-[#B5121B]'
                            : 'border-black/10 bg-white text-slate-800 hover:bg-black/5'
                        }`}
                      >
                        <span>{sb.fullName}</span>
                        {active && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Danh hiệu trên đầu nhân vật */}
              <div>
                <h3 className="mb-2 text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                  2. Danh hiệu hiển thị trên bảng tên 3D
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CAMPUS_TITLES.map((t) => {
                    const unlocked = unlockedTitleIds.has(t.id);
                    const active = (characterProfile.titleId ?? 'none') === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        data-testid={`title-badge-${t.id}`}
                        disabled={!unlocked}
                        onClick={() => onUpdateCosmetics({ titleId: t.id })}
                        className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left text-xs font-bold ${
                          active
                            ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white'
                            : unlocked
                              ? 'border-black/10 bg-white text-slate-800 hover:bg-black/5'
                              : 'cursor-not-allowed border-black/10 bg-slate-100 text-slate-400'
                        }`}
                      >
                        <span>{t.label}</span>
                        <span>{!unlocked ? '🔒' : active ? '✓ Đang đeo' : 'Chọn'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Mũ Cử nhân & Đồ uống cầm tay */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                    3. Phụ kiện Tốt nghiệp
                  </h3>
                  <button
                    type="button"
                    data-testid="toggle-grad-cap-btn"
                    disabled={!gradUnlocked && !characterProfile.gradCap}
                    onClick={() =>
                      onUpdateCosmetics({ gradCap: !characterProfile.gradCap })
                    }
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold ${
                      characterProfile.gradCap
                        ? 'border-purple-600 bg-purple-700 text-white shadow'
                        : gradUnlocked
                          ? 'border-black/15 bg-white text-slate-800 hover:bg-black/5'
                          : 'cursor-not-allowed border-black/10 bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span>🎓 Mũ Cử nhân Bách Khoa</span>
                    <span>
                      {characterProfile.gradCap
                        ? 'Đang đội ✓'
                        : gradUnlocked
                          ? 'Đội mũ'
                          : '🔒 Mở khóa tại NV 6'}
                    </span>
                  </button>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-extrabold tracking-wide text-slate-700 uppercase">
                    4. Đồ uống cầm tay
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'none', label: 'Bỏ xuống' },
                        { id: 'iced-tea', label: '🍋 Trà chanh' },
                        { id: 'coffee', label: '☕ Cà phê nâu' },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        data-testid={`cosmetic-drink-${d.id}`}
                        onClick={() => onSelectDrink(d.id)}
                        className={`rounded-2xl border px-3 py-2 text-xs font-bold ${
                          heldDrink === d.id
                            ? 'border-[#1c5c3a] bg-[#1c5c3a] text-white'
                            : 'border-black/15 bg-white text-slate-800 hover:bg-black/5'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampusQuestsModal;
