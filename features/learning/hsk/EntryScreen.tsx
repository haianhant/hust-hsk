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
  onEnter: (resumeQuest: boolean, submittedProfile?: CharacterProfile) => void;
}

export function EntryScreen({
  characterProfile,
  savedIdentity,
  identityName,
  identityMssv,
  progress,
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
      <div className="max-w-2xl rounded-2xl border border-[#B5121B]/20 bg-white/75 px-5 py-2.5 text-xs text-[#334155] shadow-sm">
        <strong className="text-[#B5121B]">✨ Mỗi tòa nhà một tính năng EdTech:</strong> Ghé{' '}
        <strong>Tòa C7</strong> để chọn &amp; học HSK theo bài · Vào{' '}
        <strong>Thư viện Tạ Quang Bửu</strong> để tự học Pomodoro, đánh đàn Piano Tầng 6 &amp; ngắm
        cảnh Tầng 10 · Check-in 9 công trình biểu tượng để sưu tầm trọn bộ Sổ tay Bách Khoa!
      </div>
    </main>
  );
}

export default EntryScreen;
