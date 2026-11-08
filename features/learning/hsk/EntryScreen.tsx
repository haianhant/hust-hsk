'use client';

// ---------------------------------------------------------------------------
// features/learning/hsk/EntryScreen.tsx — Pre-campus 3D Character Creator,
// Lesson Picker & Smart Suggestion entry screen.
// ---------------------------------------------------------------------------

import CharacterCreatorModal from '../../../components/ui/CharacterCreatorModal';
import type { CharacterProfile, Identity } from '../../../lib/identity';
import type { NextSuggestion } from '../../../lib/learn/suggest';
import type { Progress } from '../../../lib/learn/types';
import LessonPickerCard from './LessonPickerCard';

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
  lessonsOpen: boolean;
  questActive: boolean;
  activeQuestId: string | null;
  suggestion: NextSuggestion;
  onSetLessonsOpen: (open: boolean) => void;
  onEnter: (resumeQuest: boolean, submittedProfile?: CharacterProfile) => void;
  onStartQuest: (questId: string) => void;
  onOpenHandbook: (tab: HandbookTab) => void;
}

export function EntryScreen({
  characterProfile,
  savedIdentity,
  identityName,
  identityMssv,
  progress,
  lessonsOpen,
  questActive,
  activeQuestId,
  suggestion,
  onSetLessonsOpen,
  onEnter,
  onStartQuest,
  onOpenHandbook,
}: EntryScreenProps) {
  const hasSave =
    !!progress &&
    (progress.points > 0 || !!progress.questState || Object.keys(progress.completedQuests ?? {}).length > 0);

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 overflow-y-auto bg-[#eef2e6] px-4 py-6 text-center">
      <CharacterCreatorModal
        mode="entry"
        initialProfile={characterProfile}
        initialNameInput={savedIdentity ? identityName : ''}
        initialMssvInput={savedIdentity ? identityMssv : ''}
        hasSave={hasSave}
        onConfirm={(nextProfile, resumeQuest) => onEnter(!!resumeQuest, nextProfile)}
        onChooseLesson={() => onSetLessonsOpen(true)}
      />
      {lessonsOpen && (
        <LessonPickerCard
          activeQuestId={questActive ? activeQuestId : null}
          completedQuests={progress?.completedQuests ?? {}}
          onPick={(questId) => {
            onSetLessonsOpen(false);
            onEnter(true);
            onStartQuest(questId);
          }}
          onClose={() => onSetLessonsOpen(false)}
        />
      )}
      {hasSave && (
        <p className="text-sm text-[#1c2b1f]/60">
          Đã lưu trên thiết bị này: {progress?.points ?? 0} điểm
          {progress?.streak ? ` · chuỗi ${progress.streak.count} ngày` : ''}.
        </p>
      )}
      {hasSave && (
        <div className="max-w-xl rounded-2xl border border-[#1c5c3a]/20 bg-white/70 px-5 py-3 text-left">
          <p className="text-base font-semibold text-[#1c5c3a]">💡 {suggestion.text}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestion.action === 'calendar' && (
              <button
                type="button"
                onClick={() => {
                  onEnter(true);
                  onOpenHandbook('calendar');
                }}
                className="rounded-full bg-[#2E7D32] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#256B29]"
              >
                Mở lịch ôn
              </button>
            )}
            {(suggestion.action === 'resume' || suggestion.action === 'start') && suggestion.questId && (
              <button
                type="button"
                onClick={() => {
                  onEnter(true);
                  onStartQuest(suggestion.questId as string);
                }}
                className="rounded-full bg-[#A54432] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#8A3828]"
              >
                Học ngay →
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default EntryScreen;
