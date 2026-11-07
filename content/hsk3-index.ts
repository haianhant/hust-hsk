/**
 * content/hsk3-index.ts — Aggregate toàn bộ HSK 3 (Bước 6).
 *
 * Gộp 9 file bài 10–18 (content/hsk3-l10.ts … hsk3-l18.ts) thành một đầu
 * mối duy nhất cho engine + UI + test:
 * - ALL_HSK3_LEXEMES: 246 từ, đúng thứ tự bài 10→18, nhóm 1→4 trong bài.
 * - KNOWN_LEXEME_IDS: 246 id — dùng cho store (import/xuất tiến độ).
 * - HSK3_LESSONS: metadata 9 bài (id, number, title, topic theo audit §3a).
 *
 * Đối chiếu docs/content-audit.md §3a: 246 từ / 36 nhóm (10: 9+9+6+4;
 * 11: 9+6+6+7; 12: 6+11+3+7; 13: 8+5+6+9; 14: 7+4+8+8; 15: 9+9+4+4;
 * 16: 10+8+6+2; 17: 8+6+7+6; 18: 7+8+7+7). Mọi từ đều có đúng 1 ví dụ
 * tự soạn (source 'authored'), KHÔNG sao chép câu ví dụ của site nguồn
 * hay giáo trình, KHÔNG toàn văn bài khóa.
 *
 * LƯU Ý: export KNOWN_LEXEME_IDS cũ trong hsk3-l10.ts (chỉ 9 id nhóm 1)
 * được GIỮ NGUYÊN để không vỡ import khác; store dùng bản 246 id ở đây.
 */
import type {
  Example,
  Lesson,
  LessonGroup,
  LessonVocabulary,
  Lexeme,
} from '../lib/learn/types';

import {
  HSK3_L10_EXAMPLES,
  HSK3_L10_G2_EXAMPLES,
  HSK3_L10_G2_LEXEMES,
  HSK3_L10_G2_VOCABULARY,
  HSK3_L10_G3_EXAMPLES,
  HSK3_L10_G3_LEXEMES,
  HSK3_L10_G3_VOCABULARY,
  HSK3_L10_G4_EXAMPLES,
  HSK3_L10_G4_LEXEMES,
  HSK3_L10_G4_VOCABULARY,
  HSK3_L10_GROUP,
  HSK3_L10_GROUP2,
  HSK3_L10_GROUP3,
  HSK3_L10_GROUP4,
  HSK3_L10_LESSON,
  HSK3_L10_LEXEMES,
  HSK3_L10_VOCABULARY,
} from './hsk3-l10';
import {
  HSK3_L11_EXAMPLES,
  HSK3_L11_G2_EXAMPLES,
  HSK3_L11_G2_LEXEMES,
  HSK3_L11_G2_VOCABULARY,
  HSK3_L11_G3_EXAMPLES,
  HSK3_L11_G3_LEXEMES,
  HSK3_L11_G3_VOCABULARY,
  HSK3_L11_G4_EXAMPLES,
  HSK3_L11_G4_LEXEMES,
  HSK3_L11_G4_VOCABULARY,
  HSK3_L11_GROUP,
  HSK3_L11_GROUP2,
  HSK3_L11_GROUP3,
  HSK3_L11_GROUP4,
  HSK3_L11_LESSON,
  HSK3_L11_LEXEMES,
  HSK3_L11_VOCABULARY,
} from './hsk3-l11';
import {
  HSK3_L12_EXAMPLES,
  HSK3_L12_G2_EXAMPLES,
  HSK3_L12_G2_LEXEMES,
  HSK3_L12_G2_VOCABULARY,
  HSK3_L12_G3_EXAMPLES,
  HSK3_L12_G3_LEXEMES,
  HSK3_L12_G3_VOCABULARY,
  HSK3_L12_G4_EXAMPLES,
  HSK3_L12_G4_LEXEMES,
  HSK3_L12_G4_VOCABULARY,
  HSK3_L12_GROUP,
  HSK3_L12_GROUP2,
  HSK3_L12_GROUP3,
  HSK3_L12_GROUP4,
  HSK3_L12_LESSON,
  HSK3_L12_LEXEMES,
  HSK3_L12_VOCABULARY,
} from './hsk3-l12';
import {
  HSK3_L13_EXAMPLES,
  HSK3_L13_G2_EXAMPLES,
  HSK3_L13_G2_LEXEMES,
  HSK3_L13_G2_VOCABULARY,
  HSK3_L13_G3_EXAMPLES,
  HSK3_L13_G3_LEXEMES,
  HSK3_L13_G3_VOCABULARY,
  HSK3_L13_G4_EXAMPLES,
  HSK3_L13_G4_LEXEMES,
  HSK3_L13_G4_VOCABULARY,
  HSK3_L13_GROUP,
  HSK3_L13_GROUP2,
  HSK3_L13_GROUP3,
  HSK3_L13_GROUP4,
  HSK3_L13_LESSON,
  HSK3_L13_LEXEMES,
  HSK3_L13_VOCABULARY,
} from './hsk3-l13';
import {
  HSK3_L14_EXAMPLES,
  HSK3_L14_GROUPS,
  HSK3_L14_LESSON,
  HSK3_L14_LEXEMES,
  HSK3_L14_VOCABULARY,
} from './hsk3-l14';
import {
  HSK3_L15_EXAMPLES,
  HSK3_L15_GROUPS,
  HSK3_L15_LESSON,
  HSK3_L15_LEXEMES,
  HSK3_L15_VOCABULARY,
} from './hsk3-l15';
import {
  HSK3_L16_EXAMPLES,
  HSK3_L16_GROUPS,
  HSK3_L16_LESSON,
  HSK3_L16_LEXEMES,
  HSK3_L16_VOCABULARY,
} from './hsk3-l16';
import {
  HSK3_L17_EXAMPLES,
  HSK3_L17_GROUPS,
  HSK3_L17_LESSON,
  HSK3_L17_LEXEMES,
  HSK3_L17_VOCABULARY,
} from './hsk3-l17';
import {
  HSK3_L18_EXAMPLES,
  HSK3_L18_GROUPS,
  HSK3_L18_LESSON,
  HSK3_L18_LEXEMES,
  HSK3_L18_VOCABULARY,
} from './hsk3-l18';

/** Metadata 9 bài HSK 3, theo audit §3a (title = câu chủ đề, topic). */
export const HSK3_LESSONS: Lesson[] = [
  HSK3_L10_LESSON,
  HSK3_L11_LESSON,
  HSK3_L12_LESSON,
  HSK3_L13_LESSON,
  HSK3_L14_LESSON,
  HSK3_L15_LESSON,
  HSK3_L16_LESSON,
  HSK3_L17_LESSON,
  HSK3_L18_LESSON,
];

/** Toàn bộ từ theo bài (giữ thứ tự nguồn trong từng nhóm). */
export const HSK3_LESSON_LEXEMES: Record<string, Lexeme[]> = {
  'hsk3-l10': [
    ...HSK3_L10_LEXEMES,
    ...HSK3_L10_G2_LEXEMES,
    ...HSK3_L10_G3_LEXEMES,
    ...HSK3_L10_G4_LEXEMES,
  ],
  'hsk3-l11': [
    ...HSK3_L11_LEXEMES,
    ...HSK3_L11_G2_LEXEMES,
    ...HSK3_L11_G3_LEXEMES,
    ...HSK3_L11_G4_LEXEMES,
  ],
  'hsk3-l12': [
    ...HSK3_L12_LEXEMES,
    ...HSK3_L12_G2_LEXEMES,
    ...HSK3_L12_G3_LEXEMES,
    ...HSK3_L12_G4_LEXEMES,
  ],
  'hsk3-l13': [
    ...HSK3_L13_LEXEMES,
    ...HSK3_L13_G2_LEXEMES,
    ...HSK3_L13_G3_LEXEMES,
    ...HSK3_L13_G4_LEXEMES,
  ],
  'hsk3-l14': [...HSK3_L14_LEXEMES],
  'hsk3-l15': [...HSK3_L15_LEXEMES],
  'hsk3-l16': [...HSK3_L16_LEXEMES],
  'hsk3-l17': [...HSK3_L17_LEXEMES],
  'hsk3-l18': [...HSK3_L18_LEXEMES],
};

/** Nhóm từ theo bài (4 nhóm/bài, 36 nhóm). */
export const HSK3_LESSON_GROUPS: Record<string, LessonGroup[]> = {
  'hsk3-l10': [HSK3_L10_GROUP, HSK3_L10_GROUP2, HSK3_L10_GROUP3, HSK3_L10_GROUP4],
  'hsk3-l11': [HSK3_L11_GROUP, HSK3_L11_GROUP2, HSK3_L11_GROUP3, HSK3_L11_GROUP4],
  'hsk3-l12': [HSK3_L12_GROUP, HSK3_L12_GROUP2, HSK3_L12_GROUP3, HSK3_L12_GROUP4],
  'hsk3-l13': [HSK3_L13_GROUP, HSK3_L13_GROUP2, HSK3_L13_GROUP3, HSK3_L13_GROUP4],
  'hsk3-l14': [...HSK3_L14_GROUPS],
  'hsk3-l15': [...HSK3_L15_GROUPS],
  'hsk3-l16': [...HSK3_L16_GROUPS],
  'hsk3-l17': [...HSK3_L17_GROUPS],
  'hsk3-l18': [...HSK3_L18_GROUPS],
};

/** Toàn bộ 246 từ HSK 3, bài 10→18. */
export const ALL_HSK3_LEXEMES: Lexeme[] = HSK3_LESSONS.flatMap(
  (l) => HSK3_LESSON_LEXEMES[l.id],
);

/** ID các từ đã biết — dùng để loại id lạ khi import tiến độ (store). */
export const KNOWN_LEXEME_IDS: string[] = ALL_HSK3_LEXEMES.map((w) => w.id);

/** Liên kết từ ↔ bài/nhóm, giữ thứ tự nguồn (246 mục). */
export const ALL_HSK3_VOCABULARY: LessonVocabulary[] = [
  ...HSK3_L10_VOCABULARY,
  ...HSK3_L10_G2_VOCABULARY,
  ...HSK3_L10_G3_VOCABULARY,
  ...HSK3_L10_G4_VOCABULARY,
  ...HSK3_L11_VOCABULARY,
  ...HSK3_L11_G2_VOCABULARY,
  ...HSK3_L11_G3_VOCABULARY,
  ...HSK3_L11_G4_VOCABULARY,
  ...HSK3_L12_VOCABULARY,
  ...HSK3_L12_G2_VOCABULARY,
  ...HSK3_L12_G3_VOCABULARY,
  ...HSK3_L12_G4_VOCABULARY,
  ...HSK3_L13_VOCABULARY,
  ...HSK3_L13_G2_VOCABULARY,
  ...HSK3_L13_G3_VOCABULARY,
  ...HSK3_L13_G4_VOCABULARY,
  ...HSK3_L14_VOCABULARY,
  ...HSK3_L15_VOCABULARY,
  ...HSK3_L16_VOCABULARY,
  ...HSK3_L17_VOCABULARY,
  ...HSK3_L18_VOCABULARY,
];

/** Ví dụ tự viết theo bài (mỗi từ 1 câu, source 'authored'). */
export const HSK3_LESSON_EXAMPLES: Record<string, Example[]> = {
  'hsk3-l10': [
    ...HSK3_L10_EXAMPLES,
    ...HSK3_L10_G2_EXAMPLES,
    ...HSK3_L10_G3_EXAMPLES,
    ...HSK3_L10_G4_EXAMPLES,
  ],
  'hsk3-l11': [
    ...HSK3_L11_EXAMPLES,
    ...HSK3_L11_G2_EXAMPLES,
    ...HSK3_L11_G3_EXAMPLES,
    ...HSK3_L11_G4_EXAMPLES,
  ],
  'hsk3-l12': [
    ...HSK3_L12_EXAMPLES,
    ...HSK3_L12_G2_EXAMPLES,
    ...HSK3_L12_G3_EXAMPLES,
    ...HSK3_L12_G4_EXAMPLES,
  ],
  'hsk3-l13': [
    ...HSK3_L13_EXAMPLES,
    ...HSK3_L13_G2_EXAMPLES,
    ...HSK3_L13_G3_EXAMPLES,
    ...HSK3_L13_G4_EXAMPLES,
  ],
  'hsk3-l14': [...HSK3_L14_EXAMPLES],
  'hsk3-l15': [...HSK3_L15_EXAMPLES],
  'hsk3-l16': [...HSK3_L16_EXAMPLES],
  'hsk3-l17': [...HSK3_L17_EXAMPLES],
  'hsk3-l18': [...HSK3_L18_EXAMPLES],
};

/** Toàn bộ 246 ví dụ tự viết HSK 3 (dùng cho sổ tay). */
export const ALL_HSK3_EXAMPLES: Example[] = HSK3_LESSONS.flatMap(
  (l) => HSK3_LESSON_EXAMPLES[l.id],
);
