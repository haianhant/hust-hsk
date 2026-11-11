'use client';

// ---------------------------------------------------------------------------
// features/learning/hsk/LearningOverlayModal.tsx — Bottom-sheet / modal
// overlay cho bài học HSK tại Tòa C7, ResultPanel, Sổ tay Khám phá & Check-in
// Bách Khoa (CampusPassportHandbook), và ReviewSession.
// ---------------------------------------------------------------------------

import CampusPassportHandbook, {
  type PassportMainSection,
} from '../../../components/learn/CampusPassportHandbook';
import QuestPanel, { type QuestAnswer } from '../../../components/learn/QuestPanel';
import ResultPanel from '../../../components/learn/ResultPanel';
import ReviewSession from '../../../components/learn/ReviewSession';
import type { CampusPassportState } from '../../campus/checkin/campus-passport';
import type { QuestStep } from '../../../lib/learn/quest-data';
import type { Lexeme, Progress, Quest } from '../../../lib/learn/types';
import type { HandbookTab } from './EntryScreen';

export type LearningPanelType = 'quest' | 'handbook' | 'result' | 'review' | null;

export interface ReviewSessionState {
  ids: string[];
  mode: 'review' | 'error';
  title: string;
}

export interface LearningOverlayModalProps {
  panel: LearningPanelType;
  passport: CampusPassportState;
  passportSection?: PassportMainSection;
  progress: Progress | null;
  reReviewIds: string[] | null;
  step: QuestStep | undefined;
  stepIndex: number;
  currentSteps: QuestStep[];
  currentQuest: Quest;
  currentQuestDone: boolean;
  lexemeById: Record<string, Lexeme>;
  allLexemes: Lexeme[];
  currentLessonLexemes: Lexeme[];
  actionDone: boolean;
  soundOn: boolean;
  encounteredLexemes: Lexeme[];
  recallResults: { lexemeId: string; correct: boolean }[];
  recallDetail: { lexeme: Lexeme; correct: boolean }[];
  dueLexemes: Lexeme[];
  sessionWrongIds: string[];
  rewardAlreadyGiven: boolean;
  resultGlobalBadges: { id: string; title: string; isNew: boolean }[];
  handbookTab: HandbookTab;
  reviewSession: ReviewSessionState | null;
  onSetPanel: (panel: LearningPanelType) => void;
  onSetReReviewIds: (ids: string[] | null) => void;
  onSetReviewSession: (session: ReviewSessionState | null) => void;
  onSetProgress: (progress: Progress) => void;
  onAnswer: (answer: QuestAnswer) => void;
  onAdvance: () => void;
  onInteractObject: (objectId: 'notebook' | 'homework') => void;
  onSpeak: (text: string) => void;
  onReviewAnswer: (correct: boolean, lexemeId: string) => void;
  onReReviewAnswer: (correct: boolean, lexemeId: string) => void;
  onReviewSessionAnswer: (lexemeId: string, correct: boolean) => void;
  onExitLesson: () => void;
  onFastTravel: (destId: string) => void;
  onInspectLandmark: (landmarkId: string) => void;
  onPickAnotherLesson?: () => void;
  onReviewNow: () => void;
  onCompleteQuest: () => void;
  onStartQuest: (questId: string) => void;
}

export function LearningOverlayModal({
  panel,
  passport,
  passportSection = 'checkin',
  progress,
  reReviewIds,
  step,
  stepIndex,
  currentSteps,
  currentQuest,
  currentQuestDone,
  lexemeById,
  allLexemes,
  currentLessonLexemes,
  actionDone,
  soundOn,
  encounteredLexemes,
  recallResults,
  recallDetail,
  dueLexemes,
  sessionWrongIds,
  rewardAlreadyGiven,
  resultGlobalBadges,
  handbookTab,
  reviewSession,
  onSetPanel,
  onSetReReviewIds,
  onSetReviewSession,
  onSetProgress,
  onAnswer,
  onAdvance,
  onInteractObject,
  onSpeak,
  onReviewAnswer,
  onReReviewAnswer,
  onReviewSessionAnswer,
  onExitLesson,
  onFastTravel,
  onInspectLandmark,
  onPickAnotherLesson,
  onReviewNow,
  onCompleteQuest,
  onStartQuest,
}: LearningOverlayModalProps) {
  if (panel === null || !progress) return null;

  const widthClass =
    panel === 'handbook' ? 'sm:w-[min(94vw,760px)]' : 'sm:w-[min(94vw,560px)]';

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-[#FDF8EE] p-4 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:left-1/2 ${widthClass} sm:-translate-x-1/2 sm:rounded-2xl sm:p-5`}
    >
      {panel === 'quest' && reReviewIds && step?.kind === 'result' && (
        <QuestPanel
          step={{ id: 're-review', kind: 'review', lexemeIds: reReviewIds }}
          stepNumber={currentSteps.length}
          totalSteps={currentSteps.length}
          lexemeById={lexemeById}
          allLexemes={allLexemes}
          actionDone={false}
          onAnswer={onAnswer}
          onAdvance={onAdvance}
          onInteractObject={onInteractObject}
          onSpeak={onSpeak}
          soundOn={soundOn}
          onReviewAnswer={onReviewAnswer}
          onReviewDone={() => onSetReReviewIds(null)}
          onReReviewAnswer={onReReviewAnswer}
          reReviewOnly
          onReReviewDone={() => onSetReReviewIds(null)}
          onClose={() => onSetReReviewIds(null)}
          onExitLesson={onExitLesson}
          questTitle={currentQuest.title}
        />
      )}
      {panel === 'quest' && !reReviewIds && step && step.kind !== 'result' && (
        <QuestPanel
          step={step}
          stepNumber={stepIndex + 1}
          totalSteps={currentSteps.length}
          lexemeById={lexemeById}
          allLexemes={allLexemes}
          actionDone={actionDone}
          onAnswer={onAnswer}
          onAdvance={onAdvance}
          onInteractObject={onInteractObject}
          onSpeak={onSpeak}
          soundOn={soundOn}
          onReviewAnswer={onReviewAnswer}
          onReviewDone={onAdvance}
          onClose={() => onSetPanel(null)}
          onExitLesson={onExitLesson}
          questTitle={currentQuest.title}
          onFastTravel={onFastTravel}
        />
      )}
      {panel === 'quest' && !reReviewIds && step && step.kind === 'result' && (
        <ResultPanel
          encountered={encounteredLexemes}
          totalLexemes={currentQuest.lexemeIds.length}
          recallCorrect={recallResults.filter((r) => r.correct).length}
          recallTotal={recallResults.length}
          recallResults={recallDetail}
          dueWords={dueLexemes}
          dueTomorrowIds={sessionWrongIds}
          rewardPoints={currentQuest.rewardPoints}
          rewardAlreadyGiven={rewardAlreadyGiven}
          globalBadges={resultGlobalBadges}
          onReviewNow={onReviewNow}
          onContinue={onCompleteQuest}
          onPickAnotherLesson={onPickAnotherLesson}
        />
      )}
      {panel === 'quest' && !step && (
        <div className="text-center">
          <p className="mb-3 text-base text-[#2B2B2B]/80">
            {currentQuestDone
              ? `Bạn đã hoàn thành “${currentQuest.title}” tại Giảng đường Tòa C7.`
              : `Chào mừng tới Giảng đường HSK Tòa C7 — bắt đầu bài “${currentQuest.title}”.`}
          </p>
          <button
            type="button"
            onClick={() => {
              onSetPanel(null);
              onStartQuest(currentQuest.id);
            }}
            className="w-full rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828]"
          >
            {currentQuestDone ? 'Học lại bài này' : 'Bắt đầu bài học'}
          </button>
        </div>
      )}
      {panel === 'handbook' && (
        <CampusPassportHandbook
          passport={passport}
          initialSection={passportSection}
          progress={progress}
          lexemes={currentLessonLexemes}
          allLexemes={allLexemes}
          onSpeak={onSpeak}
          soundOn={soundOn}
          onImport={(p) => onSetProgress(p)}
          onClose={() => onSetPanel(null)}
          defaultHandbookTab={handbookTab}
          onFastTravel={onFastTravel}
          onInspectLandmark={onInspectLandmark}
          onStartReview={(ids, mode, title) => {
            onSetReviewSession({ ids, mode, title });
            onSetPanel('review');
          }}
        />
      )}
      {panel === 'review' && reviewSession && (
        <ReviewSession
          title={reviewSession.title}
          subtitle={
            reviewSession.mode === 'error'
              ? 'Vòng ôn lỗi riêng: 0 điểm, không đổi level hay lịch ôn. Sửa đúng thì từ rời khỏi sổ lỗi.'
              : 'Ôn đúng hạn: nhớ đúng +10 điểm và lên level nhớ; chưa nhớ thì từ về level 0, ôn lại ngày mai.'
          }
          words={reviewSession.ids
            .map((id) => lexemeById[id])
            .filter((l): l is Lexeme => !!l)}
          mode={reviewSession.mode}
          onAnswer={onReviewSessionAnswer}
          onSpeak={onSpeak}
          soundOn={soundOn}
          onClose={() => {
            onSetReviewSession(null);
            onSetPanel(null);
          }}
        />
      )}
    </div>
  );
}

export default LearningOverlayModal;
