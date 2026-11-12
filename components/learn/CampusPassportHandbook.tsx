'use client';

// ---------------------------------------------------------------------------
// components/learn/CampusPassportHandbook.tsx — Sổ tay Khám phá Bách Khoa &
// Thu thập Tính năng Sáng tạo (EdTech Campus Passport + Từ vựng HSK).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import {
  CAMPUS_LANDMARKS,
  getPassportSummary,
  type CampusPassportState,
} from '../../features/campus/checkin/campus-passport';
import type { HandbookTab } from '../../features/learning/hsk/EntryScreen';
import type { Lexeme, Progress } from '../../lib/learn/types';
import Handbook from './Handbook';

export type PassportMainSection = 'checkin' | 'features' | 'hsk';

export interface CampusPassportHandbookProps {
  passport: CampusPassportState;
  progress: Progress;
  lexemes: Lexeme[];
  allLexemes: Lexeme[];
  soundOn: boolean;
  hskMode?: boolean;
  defaultHandbookTab?: HandbookTab;
  initialSection?: PassportMainSection;
  onToggleHskMode?: () => void;
  onSpeak: (text: string) => void;
  onImport: (p: Progress) => void;
  onClose: () => void;
  onFastTravel: (destId: string) => void;
  onInspectLandmark: (landmarkId: string) => void;
  onStartReview: (ids: string[], mode: 'review' | 'error', title: string) => void;
}

export default function CampusPassportHandbook({
  passport,
  progress,
  lexemes,
  allLexemes,
  soundOn,
  hskMode = false,
  defaultHandbookTab = 'lesson',
  initialSection = 'checkin',
  onToggleHskMode,
  onSpeak,
  onImport,
  onClose,
  onFastTravel,
  onInspectLandmark,
  onStartReview,
}: CampusPassportHandbookProps) {
  const [section, setSection] = useState<PassportMainSection>(
    !hskMode && initialSection === 'hsk' ? 'checkin' : initialSection,
  );

  useEffect(() => {
    setSection(!hskMode && initialSection === 'hsk' ? 'checkin' : initialSection);
  }, [initialSection, hskMode]);

  const summary = getPassportSummary(passport);

  return (
    <div id="campus-passport-handbook" className="w-full text-[#1E293B]">
      {/* Header Sổ tay Khám phá Bách Khoa */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-black/10 pb-3">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-[#B5121B] uppercase">
            HUSTVERSE PASSPORT · SỔ TAY KHÁM PHÁ ĐẠI HỌC BÁCH KHOA HÀ NỘI
          </div>
          <h2 className="text-xl font-extrabold text-[#1E293B]">
            🗺️ Hành trình Khám phá &amp; Sưu tầm Dấu ấn Bách Khoa
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng sổ tay"
          className="rounded-full bg-black/10 px-3 py-1 text-xs font-bold text-[#1E293B] hover:bg-black/20"
        >
          ✕ Đóng
        </button>
      </div>

      {/* Thanh tóm tắt tiến độ Check-in & Thu thập */}
      <div className="mb-3 rounded-2xl border border-[#B5121B]/20 bg-gradient-to-r from-[#FFF5F5] via-[#FFFBEB] to-[#F0FDF4] p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <span className="text-[#991B1B]">
            📍 Đã Check-in: {summary.checkedInCount}/{summary.totalLandmarks} tòa
          </span>
          <span className="text-[#B45309]">
            ✨ Tính năng sáng tạo: {summary.featuresCount}/{summary.totalLandmarks}
          </span>
          <span className="text-[#15803D]">
            🧠 Câu đố Bách Khoa: {summary.quizSolvedCount}/{summary.totalLandmarks}
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#B5121B] via-[#D97706] to-[#16A34A] transition-all duration-500"
            style={{ width: `${Math.max(4, summary.completionPercent)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[#475569]">
          {hskMode ? (
            <>
              Khám phá kiến trúc ĐHBK Hà Nội kết hợp <strong>Chế độ HSK</strong>: học theo bài tại{' '}
              <strong>Tòa C7</strong>, tự học Pomodoro &amp; đàn Piano tại{' '}
              <strong>Thư viện Tạ Quang Bửu</strong> và check-in 9 công trình biểu tượng!
            </>
          ) : (
            <>
              Dạo quanh khuôn viên ĐHBK Hà Nội, check-in 9 công trình biểu tượng, tự học Pomodoro
              &amp; chơi Đại dương cầm tại <strong>Thư viện Tạ Quang Bửu 10 tầng</strong>. Bạn có
              thể bật thêm <strong>Chế độ HSK</strong> bất cứ lúc nào!
            </>
          )}
        </p>
      </div>

      {/* Thanh Tab chính */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          data-testid="passport-tab-checkin"
          onClick={() => setSection('checkin')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
            section === 'checkin'
              ? 'bg-[#B5121B] text-white shadow'
              : 'bg-black/8 text-[#334155] hover:bg-black/15'
          }`}
        >
          📍 Check-in Tòa nhà ({summary.checkedInCount}/{summary.totalLandmarks})
        </button>
        <button
          type="button"
          data-testid="passport-tab-features"
          onClick={() => setSection('features')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
            section === 'features'
              ? 'bg-[#D97706] text-white shadow'
              : 'bg-black/8 text-[#334155] hover:bg-black/15'
          }`}
        >
          ✨ Bộ sưu tập Tính năng ({summary.featuresCount}/{summary.totalLandmarks})
        </button>
        {hskMode ? (
          <button
            type="button"
            data-testid="passport-tab-hsk"
            onClick={() => setSection('hsk')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
              section === 'hsk'
                ? 'bg-[#1C5C3A] text-white shadow'
                : 'bg-black/8 text-[#334155] hover:bg-black/15'
            }`}
          >
            📚 Kho Từ vựng &amp; Ôn tập HSK
          </button>
        ) : (
          onToggleHskMode && (
            <button
              type="button"
              data-testid="passport-enable-hsk"
              onClick={() => {
                onToggleHskMode();
                setSection('hsk');
              }}
              className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-100"
            >
              + 🇨🇳 Bật Chế độ Học HSK
            </button>
          )
        )}
      </div>

      {/* TAB 1: BẢN ĐỒ DẤU ẤN CHECK-IN CÁC TÒA NHÀ */}
      {section === 'checkin' && (
        <div className="grid max-h-[52dvh] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {CAMPUS_LANDMARKS.map((lm) => {
            const stampedAt = passport.checkedInAt[lm.id];
            const quizDone = !!passport.quizSolved[lm.id];
            const featDone = !!passport.featuresCollected[lm.id];

            return (
              <div
                key={lm.id}
                data-testid={`passport-card-${lm.id}`}
                className={`flex flex-col justify-between rounded-2xl border p-3.5 transition ${
                  stampedAt
                    ? 'border-emerald-600/35 bg-white shadow-sm'
                    : 'border-slate-300/80 bg-slate-50/85'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                        {lm.icon}
                      </span>
                      <div>
                        <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                          {lm.code} · {lm.historyYear}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {hskMode ? lm.shortName : (lm.coreShortName ?? lm.shortName)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        stampedAt
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {stampedAt ? '✓ ĐÃ CHECK-IN' : 'Chưa check-in'}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {lm.historySummary}
                  </p>

                  {/* 4 từ vựng mini (chỉ hiển thị khi bật Chế độ HSK) */}
                  {hskMode && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lm.vocab.map((v) => (
                        <button
                          key={v.hanzi}
                          type="button"
                          onClick={() => onSpeak(v.hanzi)}
                          title={`${v.pinyin} — ${v.vi} (Bấm để nghe)`}
                          className="rounded-md border border-slate-200 bg-slate-100/90 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50"
                        >
                          {v.hanzi} <span className="text-[10px] text-slate-500">{v.vi}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200/80 pt-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <span className={featDone ? 'text-amber-700' : 'text-slate-400'}>
                      {featDone ? '★ Tính năng' : '☆ Tính năng'}
                    </span>
                    <span>·</span>
                    <span className={quizDone ? 'text-emerald-700' : 'text-slate-400'}>
                      {quizDone ? '✓ Quiz' : '○ Quiz'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {stampedAt && (
                      <button
                        type="button"
                        onClick={() => onInspectLandmark(lm.id)}
                        className="rounded-lg border border-amber-500/40 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                      >
                        Mở thẻ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onFastTravel(lm.fastTravelId);
                      }}
                      className="rounded-lg bg-[#1E293B] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#0F172A]"
                    >
                      🚀 Đi tới
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: BỘ SƯU TẬP TÍNH NĂNG SÁNG TẠO CỦA TỪNG TÒA NHÀ */}
      {section === 'features' && (
        <div className="max-h-[52dvh] space-y-2.5 overflow-y-auto pr-1">
          {CAMPUS_LANDMARKS.map((lm) => {
            const collected = !!passport.featuresCollected[lm.id];
            const checked = !!passport.checkedInAt[lm.id];
            return (
              <div
                key={`feat-${lm.id}`}
                className={`flex flex-col justify-between gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center ${
                  collected
                    ? 'border-amber-400/60 bg-gradient-to-r from-amber-50 to-white shadow-sm'
                    : 'border-slate-200 bg-white/80'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg">{lm.icon}</span>
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                      {hskMode ? lm.shortName : (lm.coreShortName ?? lm.shortName)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        collected
                          ? 'bg-amber-200/80 text-amber-950'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {collected ? '★ ĐÃ SƯU TẦM' : '🔒 Chưa kích hoạt'}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {hskMode
                      ? lm.creativeFeatureTitle
                      : (lm.coreCreativeTitle ?? lm.creativeFeatureTitle)}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {hskMode
                      ? lm.creativeFeatureDesc
                      : (lm.coreCreativeDesc ?? lm.creativeFeatureDesc)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {checked && (
                    <button
                      type="button"
                      onClick={() => onInspectLandmark(lm.id)}
                      className="rounded-xl border border-amber-500/50 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-200"
                    >
                      ✨ Mở tính năng
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onFastTravel(lm.fastTravelId);
                    }}
                    className="rounded-xl bg-[#B5121B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#8F1418]"
                  >
                    🚀 Tới {lm.code}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: KHO TỪ VỰNG & LỊCH ÔN HSK (TÍCH HỢP HANDBOOK CŨ — KHI BẬT CHẾ ĐỘ HSK) */}
      {hskMode && section === 'hsk' && (
        <div className="pt-1">
          <Handbook
            progress={progress}
            lexemes={lexemes}
            allLexemes={allLexemes}
            onSpeak={onSpeak}
            soundOn={soundOn}
            onImport={onImport}
            onClose={onClose}
            defaultTab={defaultHandbookTab}
            onStartReview={onStartReview}
          />
        </div>
      )}
    </div>
  );
}
