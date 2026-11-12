'use client';

// ---------------------------------------------------------------------------
// features/learning/hsk/EntryScreen.tsx — Màn hình tạo nhân vật 3D trước khi
// bước vào khuôn viên ĐHBK Hà Nội.
// (Theo kiến trúc EdTech mới: Trang chủ không còn chọn bài học; việc chọn bài
// và học HSK theo bài diễn ra chuyên biệt tại Giảng đường Tòa C7).
// ---------------------------------------------------------------------------

import CharacterCreatorModal from '../../../components/ui/CharacterCreatorModal';
import type { CharacterProfile, Identity } from '../../../lib/identity';
import type { Progress } from '../../../lib/learn/types';

export type HandbookTab =
  | 'lesson'
  | 'encountered'
  | 'due'
  | 'known'
  | 'search'
  | 'calendar'
  | 'errors'
  | 'badges';

export interface EntryScreenProps {
  characterProfile: CharacterProfile;
  savedIdentity: Identity | null;
  identityName: string;
  identityMssv: string;
  progress: Progress | null;
  hskMode?: boolean;
  onToggleHskMode?: () => void;
  onEnter: (resumeQuest: boolean, submittedProfile?: CharacterProfile) => void;
}

export function EntryScreen({
  characterProfile,
  savedIdentity,
  identityName,
  identityMssv,
  progress,
  hskMode = false,
  onToggleHskMode,
  onEnter,
}: EntryScreenProps) {
  const hasSave =
    !!progress &&
    (progress.points > 0 ||
      !!progress.questState ||
      Object.keys(progress.completedQuests ?? {}).length > 0);

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-3 overflow-y-auto bg-[#eef2e6] px-4 py-6 text-center">
      <CharacterCreatorModal
        mode="entry"
        initialProfile={characterProfile}
        initialNameInput={savedIdentity ? identityName : ''}
        initialMssvInput={savedIdentity ? identityMssv : ''}
        hasSave={hasSave}
        onConfirm={(nextProfile) => onEnter(false, nextProfile)}
      />
      <div className="flex w-full max-w-5xl flex-col items-center justify-between gap-2.5 rounded-2xl border border-[#B5121B]/20 bg-white/85 px-4 py-3 text-left text-xs text-[#334155] shadow-sm sm:flex-row sm:px-5">
        <div className="space-y-0.5">
          <div className="font-extrabold text-[#1E293B]">
            🎮 Chế độ cốt lõi: Mô phỏng &amp; Game 3D Tương tác Khuôn viên ĐHBK Hà Nội
          </div>
          <p className="text-[11px] text-[#475569] sm:text-xs">
            Dạo trường bằng xe máy, check-in 9 công trình biểu tượng, tự học Pomodoro &amp; đánh đàn
            Piano tại <strong>Thư viện Tạ Quang Bửu 10 tầng</strong>, trò chuyện trực tuyến cùng bạn bè.
            {hskMode
              ? ' Đang bật thêm Chế độ Học tiếng Trung (HSK) tại Tòa C7 & Sổ tay từ vựng!'
              : ' Bạn có thể bật thêm Chế độ Học tiếng Trung (HSK) bất cứ lúc nào.'}
          </p>
        </div>
        {onToggleHskMode && (
          <button
            type="button"
            data-testid="entry-toggle-hsk-mode"
            onClick={onToggleHskMode}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition shadow-sm ${
              hskMode
                ? 'bg-[#B5121B] text-white ring-2 ring-amber-300/80 hover:bg-[#8F1418]'
                : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {hskMode
              ? '🇨🇳 Chế độ HSK: Đang BẬT'
              : '🇨🇳 Chế độ HSK: Đang TẮT (Tùy chọn)'}
          </button>
        )}
      </div>
    </main>
  );
}

export default EntryScreen;
