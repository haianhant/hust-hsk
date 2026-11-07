/**
 * Kiểu dữ liệu lõi của engine học tập — logic thuần, không DOM, không 3D.
 * UI / quest 3D (luồng khác) dùng các kiểu này, không định nghĩa lại.
 */

/** Trạng thái kiểm chứng của một mục từ. */
export type VerificationStatus = 'verified' | 'pending' | 'authored';

export interface Course {
  id: string;
  title: string;
  /** Vd: 'HSK 3', 'HSK 4'. */
  level: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  /** Số bài trong cấp độ, vd 10. */
  number: number;
  /** Câu chủ đề của bài, vd '你明天再把书还给我'. */
  title: string;
  /** Chủ đề, vd 'Học tập & câu chữ 把'. */
  topic: string;
}

export interface LessonGroup {
  id: string;
  lessonId: string;
  /** Thứ tự nhóm trong bài, bắt đầu từ 1. */
  index: number;
  title?: string;
}

/**
 * Một mục từ (lexeme). ID ổn định, không đổi khi sửa dữ liệu,
 * để tiến độ đã lưu không bị mất.
 */
export interface Lexeme {
  id: string;
  hanzi: string;
  /** Pinyin gốc có dấu thanh, vd 'shùxué'. */
  pinyin: string;
  /** Nghĩa tiếng Việt. */
  meaning: string;
  /** Từ loại, vd 'danh từ', 'động từ', 'lượng từ'. */
  pos: string;
  courseId: string;
  lessonId: string;
  groupId: string;
  /** Thứ tự trong nhóm theo nguồn. */
  order: number;
  /** URL nguồn đối soát, vd 'https://hoc-hsk.vercel.app/hsk3'. */
  sourceUrl: string;
  /** Ngày đối soát, dạng YYYY-MM-DD. */
  verifiedAt: string;
  status: VerificationStatus;
}

/** Liên kết từ ↔ bài/nhóm, giữ thứ tự nguồn. Một từ có thể ở nhiều bài. */
export interface LessonVocabulary {
  lessonId: string;
  groupId: string;
  lexemeId: string;
  order: number;
}

export type ExampleSource = 'authored' | 'textbook';

export interface Example {
  id: string;
  lexemeId: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  /**
   * 'authored' = câu do nhóm dự án tự viết, đã rà soát tiếng Trung,
   * KHÔNG trình bày là trích nguyên văn giáo trình.
   * 'textbook' = trích từ nguồn đã đối soát (chỉ dùng khi có căn cứ).
   */
  source: ExampleSource;
}

/** Tóm tắt quest cho engine học tập (định nghĩa đầy đủ thuộc luồng quest/UI). */
export interface Quest {
  id: string;
  title: string;
  lessonId: string;
  lexemeIds: string[];
  rewardPoints: number;
  badgeId?: string;
}

export type ActivityType =
  | 'encounter'
  | 'flashcard'
  | 'quiz'
  | 'dictation'
  | 'tone'
  | 'pinyin'
  | 'fill'
  | 'quest'
  | 'review';

/** Một sự kiện học: đáp án, kết quả, thời điểm, có dùng gợi ý hay không. */
export interface LearningEvent {
  id: string;
  /** Thời điểm ISO 8601, vd '2026-11-05T13:00:00.000Z'. */
  at: string;
  /** null khi sự kiện không gắn với một từ cụ thể (vd hoàn thành quest). */
  lexemeId: string | null;
  activity: ActivityType;
  correct: boolean;
  usedHint: boolean;
  points: number;
  questId?: string;
}

/** Trạng thái nhớ của một từ (ôn cách quãng). */
export interface ReviewState {
  lexemeId: string;
  /** Mức nhớ 0..5. 0 = mới gặp / vừa sai; 5 = vững nhất. */
  level: number;
  /** Ngày ôn tiếp theo, dạng YYYY-MM-DD (ngày địa phương Asia/Ho_Chi_Minh). */
  nextDue: string;
  /** Lần gặp/trả lời gần nhất (ISO), null nếu chưa từng trả lời. */
  lastSeen: string | null;
  correctCount: number;
  wrongCount: number;
  lastWrongAt: string | null;
  /**
   * Lần trả lời ĐÚNG gần nhất (ISO), null nếu chưa từng đúng.
   * Dùng cùng lastWrongAt để biết một lần sai đã được sửa đúng sau đó
   * hay chưa (xem isWellKnownState trong store.ts). Thêm ở Bước 4-fix.
   */
  lastCorrectAt: string | null;
}

/** Toàn bộ tiến độ học, lưu localStorage dưới key bkhn-progress-v1. */
export interface Progress {
  version: 1;
  lexemes: Record<string, ReviewState>;
  /** ID các từ đã gặp. Gặp ≠ thuộc: chỉ ghi nhận đã thấy từ. */
  encountered: string[];
  events: LearningEvent[];
  points: number;
  badges: string[];
  completedQuests: Record<string, { at: string; points: number }>;
  streak: { count: number; lastDay: string | null };
  settings: { soundOn: boolean; speechRate: number; showPinyin: boolean };
  questState: {
    questId: string;
    stepIndex: number;
    done: boolean;
    /**
     * Góc camera (yaw/pitch, radian) lúc đang ở trong phòng học — khôi
     * phục sau reload trong phòng (mặc định quay về hướng bảng, không
     * quay về hướng đông). Chỉ có nghĩa khi đang ở trong phòng.
     * Thêm ở Bước 4-fix (F5b); dữ liệu cũ thiếu trường thì mặc định.
     */
    yaw?: number;
    pitch?: number;
  } | null;
  /**
   * Lỗi nạp dữ liệu đã lưu (chỉ xuất hiện tạm thời sau loadProgress,
   * KHÔNG được lưu lại bởi saveProgress/exportProgress).
   */
  loadError?: string;
}

/** Đồ vật / điểm tương tác trong campus, gắn với học tập. */
export interface CampusObject {
  id: string;
  name: string;
  position: { x: number; z: number };
  triggerRadius: number;
  questId?: string;
}
