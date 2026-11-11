'use client';

// ---------------------------------------------------------------------------
// features/campus/checkin/BuildingEdTechModal.tsx — Cửa sổ Tương tác Giới thiệu
// Công trình ĐHBK Hà Nội + Từ vựng Hán ngữ Chuyên đề + Tính năng Sáng tạo Riêng.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import {
  type CampusLandmarkSpec,
  type CampusPassportState,
} from './campus-passport';

export interface BuildingEdTechModalProps {
  landmark: CampusLandmarkSpec;
  passport: CampusPassportState;
  playerName: string;
  onClose: () => void;
  onSpeakChinese: (text: string) => void;
  onActivateCreativeFeature: (landmark: CampusLandmarkSpec) => void;
  onSolveQuiz: (landmark: CampusLandmarkSpec) => void;
  onOpenPassportHandbook: () => void;
}

const CANTEEN_DISHES = [
  { hanzi: '米饭', pinyin: 'mǐfàn', vi: 'Cơm trắng nóng' },
  { hanzi: '红烧肉', pinyin: 'hóngshāoròu', vi: 'Thịt kho tàu B9' },
  { hanzi: '鸡蛋汤', pinyin: 'jīdàntāng', vi: 'Canh trứng cà chua' },
  { hanzi: '冰茶', pinyin: 'bīngchá', vi: 'Trà đá sinh viên' },
] as const;

export default function BuildingEdTechModal({
  landmark,
  passport,
  playerName,
  onClose,
  onSpeakChinese,
  onActivateCreativeFeature,
  onSolveQuiz,
  onOpenPassportHandbook,
}: BuildingEdTechModalProps) {
  const checkedTime = passport.checkedInAt[landmark.id];
  const featureDone = !!passport.featuresCollected[landmark.id];
  const quizAlreadySolved = !!passport.quizSolved[landmark.id];

  const [selectedOpt, setSelectedOpt] = useState<number | null>(
    quizAlreadySolved ? landmark.quiz.correctIndex : null,
  );
  const [creativeBanner, setCreativeBanner] = useState<string | null>(null);
  const [selectedDishIdx, setSelectedDishIdx] = useState<number>(0);

  const isCorrect = selectedOpt === landmark.quiz.correctIndex;

  const handleSelectOption = (idx: number) => {
    setSelectedOpt(idx);
    if (idx === landmark.quiz.correctIndex && !quizAlreadySolved) {
      onSolveQuiz(landmark);
    }
  };

  const handleCreativeClick = () => {
    onActivateCreativeFeature(landmark);

    switch (landmark.creativeActionKind) {
      case 'student-card-check':
        onSpeakChinese('保安大叔，您好！这是我的学生证。');
        setCreativeBanner(
          `👮 Bác bảo vệ Bách Khoa mỉm cười: "Chào ${playerName || 'em'}! Thẻ sinh viên hợp lệ rồi nhé — chúc em một ngày học tập thật tốt! (祝你学习进步！)"`,
        );
        break;
      case 'architectural-lens':
        onSpeakChinese('欢迎来到河内百科大学！');
        setCreativeBanner(
          '📐 Phương trình vòm Cổng Parabol (KTS Nguyễn Tiến Thuận, 1965): y = 12,5 × [1 − (x / 4)²] — đỉnh vòm cao 12,5 m, khẩu độ chân vòm 8,0 m!',
        );
        break;
      case 'heritage-pledge':
        onSpeakChinese('我是百科学生，我很骄傲！');
        setCreativeBanner(
          '🎖️ Đã thắp sáng Huy hiệu Truyền thống 15/10/1956: Bánh răng công nghiệp – Compa kỹ thuật – Trang sách tri thức mở rộng!',
        );
        break;
      case 'soict-tech-decode':
        onSpeakChinese('我对人工智能和编程很感兴趣！');
        setCreativeBanner(
          '💻 [SoICT AI Lab] Đã giải mã bộ từ khóa kỹ sư CNTT: 人工智能 (AI) · 编程 (Coding) · 算法 (Thuật toán) · 软件工程师 (Kỹ sư phần mềm)!',
        );
        break;
      case 'c9-sentence-sprint':
        onSpeakChinese('我和同学一起去C9大楼上课！');
        setCreativeBanner(
          '⚡ Ghép câu thành công: "我和同学一起去C9大楼上课！" (Mình cùng bạn học lên tòa C9 học đại cương!) — Đã lưu dấu ấn Cầu thang Đỏ!',
        );
        break;
      case 'dorm-canteen-order': {
        const dish = CANTEEN_DISHES[selectedDishIdx] ?? CANTEEN_DISHES[0];
        onSpeakChinese(`阿姨，我要一份${dish.hanzi}，谢谢！`);
        setCreativeBanner(
          `🍜 Cô nhà ăn KTX B9: "Có ngay một phần ${dish.vi} (${dish.hanzi} - ${dish.pinyin}) nóng hổi cho sinh viên Bách Khoa đây!"`,
        );
        break;
      }
      case 'toggle-lofi':
        onSpeakChinese('今天天气很好，我们在湖边散步吧。');
        setCreativeBanner(
          '🎵 Đã kích hoạt không gian âm nhạc Lofi Chill bên bờ Hồ Tiền lộng gió!',
        );
        break;
      default:
        break;
    }
  };

  return (
    <div
      id="building-edtech-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm pointer-events-auto"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-300/35 bg-slate-900/95 text-slate-100 shadow-2xl">
        {/* Header công trình & con dấu Check-in */}
        <div
          className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${landmark.accentColor}38 0%, rgba(15,23,42,0.96) 72%)`,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-2xl shadow-inner">
              {landmark.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold tracking-wider text-amber-300 uppercase">
                  {landmark.code} · {landmark.historyYear}
                </span>
                <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  ✓ ĐÃ CHECK-IN
                  {checkedTime
                    ? ` · ${new Date(checkedTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ''}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">
                {landmark.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm font-semibold text-slate-300 hover:bg-white/15 hover:text-white"
          >
            ✕ Đóng
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* 1. Câu chuyện Kiến trúc & Lịch sử ĐHBK Hà Nội */}
          <section className="rounded-xl border border-white/10 bg-slate-800/65 p-3.5">
            <div className="text-xs font-bold tracking-wider text-amber-300 uppercase">
              🏛️ Câu chuyện Kiến trúc & Lịch sử Bách Khoa
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
              {landmark.historySummary}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300/90">
              <span className="font-semibold text-sky-300">Điểm nhấn kiến trúc: </span>
              {landmark.architecturalHighlight}
            </p>
          </section>

          {/* 2. Tính năng Sáng tạo đặc trưng của riêng tòa nhà */}
          <section className="rounded-xl border border-amber-400/35 bg-gradient-to-br from-amber-500/12 via-rose-500/10 to-slate-800/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                ✨ Tính năng Sáng tạo Riêng · {landmark.creativeFeatureBadge}
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  featureDone
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                    : 'bg-amber-400/20 text-amber-200 border border-amber-300/35'
                }`}
              >
                {featureDone ? '★ Đã thu thập vào Sổ tay' : '☆ Khám phá để thu thập'}
              </span>
            </div>
            <div className="mt-1 text-base font-bold text-white">
              {landmark.creativeFeatureTitle}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-200/90">
              {landmark.creativeFeatureDesc}
            </p>

            {/* Tùy chọn món ăn nhanh riêng cho Căng-tin KTX */}
            {landmark.creativeActionKind === 'dorm-canteen-order' && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {CANTEEN_DISHES.map((dish, idx) => (
                  <button
                    key={dish.hanzi}
                    type="button"
                    onClick={() => setSelectedDishIdx(idx)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      selectedDishIdx === idx
                        ? 'border-amber-300 bg-amber-400/25 text-white'
                        : 'border-white/15 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {dish.hanzi} ({dish.vi})
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <button
                id="activate-building-creative-feature"
                type="button"
                onClick={handleCreativeClick}
                className="rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:from-red-500 hover:to-amber-500"
              >
                {landmark.creativeActionLabel}
              </button>
              <button
                type="button"
                onClick={onOpenPassportHandbook}
                className="rounded-xl border border-white/20 bg-white/8 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/15"
              >
                📖 Xem Sổ tay Sưu tầm
              </button>
            </div>

            {creativeBanner && (
              <div className="mt-3 rounded-lg border border-emerald-400/35 bg-emerald-950/60 px-3 py-2 text-xs leading-relaxed text-emerald-200">
                {creativeBanner}
              </div>
            )}
          </section>

          {/* 3. Thẻ Từ vựng Hán ngữ Chuyên đề gắn với Công trình */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-sky-300 uppercase">
                🗣️ Từ vựng Hán ngữ Thực tế tại {landmark.shortName} (Bấm để nghe phát âm)
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {landmark.vocab.map((w) => (
                <button
                  key={w.hanzi}
                  type="button"
                  onClick={() => onSpeakChinese(w.example ? `${w.hanzi}。${w.example}` : w.hanzi)}
                  className="group flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-slate-800/75 p-3 text-left transition hover:border-sky-400/50 hover:bg-slate-800"
                >
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-extrabold text-white">{w.hanzi}</span>
                      <span className="text-xs font-medium text-sky-300">{w.pinyin}</span>
                    </div>
                    <div className="text-xs font-semibold text-amber-200">{w.vi}</div>
                    {w.example && (
                      <div className="mt-1 text-[11px] text-slate-400">{w.example}</div>
                    )}
                  </div>
                  <span className="rounded-lg bg-sky-500/15 px-2 py-1 text-xs text-sky-300 group-hover:bg-sky-500/30">
                    🔊
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* 4. Câu đố EdTech gắn kết Kiến trúc Bách Khoa & Hán ngữ */}
          <section className="rounded-xl border border-indigo-400/30 bg-indigo-950/35 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold tracking-wider text-indigo-300 uppercase">
                🧠 Thử thách EdTech Bách Khoa (+{landmark.quiz.rewardPoints} điểm)
              </span>
              {quizAlreadySolved && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                  ✓ Đã nhận +{landmark.quiz.rewardPoints} điểm
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm font-semibold text-white">
              {landmark.quiz.question}
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {landmark.quiz.options.map((opt, idx) => {
                const chosen = selectedOpt === idx;
                const right = idx === landmark.quiz.correctIndex;
                let cls =
                  'border-white/15 bg-slate-900/75 text-slate-200 hover:border-indigo-400/60 hover:bg-slate-800';
                if (selectedOpt !== null) {
                  if (right) {
                    cls = 'border-emerald-400 bg-emerald-500/25 text-emerald-100 font-bold';
                  } else if (chosen) {
                    cls = 'border-rose-400 bg-rose-500/25 text-rose-100';
                  }
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${cls}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {selectedOpt !== null && (
              <div
                className={`mt-2.5 rounded-lg px-3 py-2 text-xs ${
                  isCorrect
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/35'
                    : 'bg-rose-500/20 text-rose-200 border border-rose-400/35'
                }`}
              >
                {isCorrect ? '🎉 Chính xác! ' : '💡 Gợi ý: '}
                {landmark.quiz.explanation}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
