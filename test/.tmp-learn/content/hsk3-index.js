"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_HSK3_EXAMPLES = exports.HSK3_LESSON_EXAMPLES = exports.ALL_HSK3_VOCABULARY = exports.KNOWN_LEXEME_IDS = exports.ALL_HSK3_LEXEMES = exports.HSK3_LESSON_GROUPS = exports.HSK3_LESSON_LEXEMES = exports.HSK3_LESSONS = void 0;
const hsk3_l10_1 = require("./hsk3-l10");
const hsk3_l11_1 = require("./hsk3-l11");
const hsk3_l12_1 = require("./hsk3-l12");
const hsk3_l13_1 = require("./hsk3-l13");
const hsk3_l14_1 = require("./hsk3-l14");
const hsk3_l15_1 = require("./hsk3-l15");
const hsk3_l16_1 = require("./hsk3-l16");
const hsk3_l17_1 = require("./hsk3-l17");
const hsk3_l18_1 = require("./hsk3-l18");
/** Metadata 9 bài HSK 3, theo audit §3a (title = câu chủ đề, topic). */
exports.HSK3_LESSONS = [
    hsk3_l10_1.HSK3_L10_LESSON,
    hsk3_l11_1.HSK3_L11_LESSON,
    hsk3_l12_1.HSK3_L12_LESSON,
    hsk3_l13_1.HSK3_L13_LESSON,
    hsk3_l14_1.HSK3_L14_LESSON,
    hsk3_l15_1.HSK3_L15_LESSON,
    hsk3_l16_1.HSK3_L16_LESSON,
    hsk3_l17_1.HSK3_L17_LESSON,
    hsk3_l18_1.HSK3_L18_LESSON,
];
/** Toàn bộ từ theo bài (giữ thứ tự nguồn trong từng nhóm). */
exports.HSK3_LESSON_LEXEMES = {
    'hsk3-l10': [
        ...hsk3_l10_1.HSK3_L10_LEXEMES,
        ...hsk3_l10_1.HSK3_L10_G2_LEXEMES,
        ...hsk3_l10_1.HSK3_L10_G3_LEXEMES,
        ...hsk3_l10_1.HSK3_L10_G4_LEXEMES,
    ],
    'hsk3-l11': [
        ...hsk3_l11_1.HSK3_L11_LEXEMES,
        ...hsk3_l11_1.HSK3_L11_G2_LEXEMES,
        ...hsk3_l11_1.HSK3_L11_G3_LEXEMES,
        ...hsk3_l11_1.HSK3_L11_G4_LEXEMES,
    ],
    'hsk3-l12': [
        ...hsk3_l12_1.HSK3_L12_LEXEMES,
        ...hsk3_l12_1.HSK3_L12_G2_LEXEMES,
        ...hsk3_l12_1.HSK3_L12_G3_LEXEMES,
        ...hsk3_l12_1.HSK3_L12_G4_LEXEMES,
    ],
    'hsk3-l13': [
        ...hsk3_l13_1.HSK3_L13_LEXEMES,
        ...hsk3_l13_1.HSK3_L13_G2_LEXEMES,
        ...hsk3_l13_1.HSK3_L13_G3_LEXEMES,
        ...hsk3_l13_1.HSK3_L13_G4_LEXEMES,
    ],
    'hsk3-l14': [...hsk3_l14_1.HSK3_L14_LEXEMES],
    'hsk3-l15': [...hsk3_l15_1.HSK3_L15_LEXEMES],
    'hsk3-l16': [...hsk3_l16_1.HSK3_L16_LEXEMES],
    'hsk3-l17': [...hsk3_l17_1.HSK3_L17_LEXEMES],
    'hsk3-l18': [...hsk3_l18_1.HSK3_L18_LEXEMES],
};
/** Nhóm từ theo bài (4 nhóm/bài, 36 nhóm). */
exports.HSK3_LESSON_GROUPS = {
    'hsk3-l10': [hsk3_l10_1.HSK3_L10_GROUP, hsk3_l10_1.HSK3_L10_GROUP2, hsk3_l10_1.HSK3_L10_GROUP3, hsk3_l10_1.HSK3_L10_GROUP4],
    'hsk3-l11': [hsk3_l11_1.HSK3_L11_GROUP, hsk3_l11_1.HSK3_L11_GROUP2, hsk3_l11_1.HSK3_L11_GROUP3, hsk3_l11_1.HSK3_L11_GROUP4],
    'hsk3-l12': [hsk3_l12_1.HSK3_L12_GROUP, hsk3_l12_1.HSK3_L12_GROUP2, hsk3_l12_1.HSK3_L12_GROUP3, hsk3_l12_1.HSK3_L12_GROUP4],
    'hsk3-l13': [hsk3_l13_1.HSK3_L13_GROUP, hsk3_l13_1.HSK3_L13_GROUP2, hsk3_l13_1.HSK3_L13_GROUP3, hsk3_l13_1.HSK3_L13_GROUP4],
    'hsk3-l14': [...hsk3_l14_1.HSK3_L14_GROUPS],
    'hsk3-l15': [...hsk3_l15_1.HSK3_L15_GROUPS],
    'hsk3-l16': [...hsk3_l16_1.HSK3_L16_GROUPS],
    'hsk3-l17': [...hsk3_l17_1.HSK3_L17_GROUPS],
    'hsk3-l18': [...hsk3_l18_1.HSK3_L18_GROUPS],
};
/** Toàn bộ 246 từ HSK 3, bài 10→18. */
exports.ALL_HSK3_LEXEMES = exports.HSK3_LESSONS.flatMap((l) => exports.HSK3_LESSON_LEXEMES[l.id]);
/** ID các từ đã biết — dùng để loại id lạ khi import tiến độ (store). */
exports.KNOWN_LEXEME_IDS = exports.ALL_HSK3_LEXEMES.map((w) => w.id);
/** Liên kết từ ↔ bài/nhóm, giữ thứ tự nguồn (246 mục). */
exports.ALL_HSK3_VOCABULARY = [
    ...hsk3_l10_1.HSK3_L10_VOCABULARY,
    ...hsk3_l10_1.HSK3_L10_G2_VOCABULARY,
    ...hsk3_l10_1.HSK3_L10_G3_VOCABULARY,
    ...hsk3_l10_1.HSK3_L10_G4_VOCABULARY,
    ...hsk3_l11_1.HSK3_L11_VOCABULARY,
    ...hsk3_l11_1.HSK3_L11_G2_VOCABULARY,
    ...hsk3_l11_1.HSK3_L11_G3_VOCABULARY,
    ...hsk3_l11_1.HSK3_L11_G4_VOCABULARY,
    ...hsk3_l12_1.HSK3_L12_VOCABULARY,
    ...hsk3_l12_1.HSK3_L12_G2_VOCABULARY,
    ...hsk3_l12_1.HSK3_L12_G3_VOCABULARY,
    ...hsk3_l12_1.HSK3_L12_G4_VOCABULARY,
    ...hsk3_l13_1.HSK3_L13_VOCABULARY,
    ...hsk3_l13_1.HSK3_L13_G2_VOCABULARY,
    ...hsk3_l13_1.HSK3_L13_G3_VOCABULARY,
    ...hsk3_l13_1.HSK3_L13_G4_VOCABULARY,
    ...hsk3_l14_1.HSK3_L14_VOCABULARY,
    ...hsk3_l15_1.HSK3_L15_VOCABULARY,
    ...hsk3_l16_1.HSK3_L16_VOCABULARY,
    ...hsk3_l17_1.HSK3_L17_VOCABULARY,
    ...hsk3_l18_1.HSK3_L18_VOCABULARY,
];
/** Ví dụ tự viết theo bài (mỗi từ 1 câu, source 'authored'). */
exports.HSK3_LESSON_EXAMPLES = {
    'hsk3-l10': [
        ...hsk3_l10_1.HSK3_L10_EXAMPLES,
        ...hsk3_l10_1.HSK3_L10_G2_EXAMPLES,
        ...hsk3_l10_1.HSK3_L10_G3_EXAMPLES,
        ...hsk3_l10_1.HSK3_L10_G4_EXAMPLES,
    ],
    'hsk3-l11': [
        ...hsk3_l11_1.HSK3_L11_EXAMPLES,
        ...hsk3_l11_1.HSK3_L11_G2_EXAMPLES,
        ...hsk3_l11_1.HSK3_L11_G3_EXAMPLES,
        ...hsk3_l11_1.HSK3_L11_G4_EXAMPLES,
    ],
    'hsk3-l12': [
        ...hsk3_l12_1.HSK3_L12_EXAMPLES,
        ...hsk3_l12_1.HSK3_L12_G2_EXAMPLES,
        ...hsk3_l12_1.HSK3_L12_G3_EXAMPLES,
        ...hsk3_l12_1.HSK3_L12_G4_EXAMPLES,
    ],
    'hsk3-l13': [
        ...hsk3_l13_1.HSK3_L13_EXAMPLES,
        ...hsk3_l13_1.HSK3_L13_G2_EXAMPLES,
        ...hsk3_l13_1.HSK3_L13_G3_EXAMPLES,
        ...hsk3_l13_1.HSK3_L13_G4_EXAMPLES,
    ],
    'hsk3-l14': [...hsk3_l14_1.HSK3_L14_EXAMPLES],
    'hsk3-l15': [...hsk3_l15_1.HSK3_L15_EXAMPLES],
    'hsk3-l16': [...hsk3_l16_1.HSK3_L16_EXAMPLES],
    'hsk3-l17': [...hsk3_l17_1.HSK3_L17_EXAMPLES],
    'hsk3-l18': [...hsk3_l18_1.HSK3_L18_EXAMPLES],
};
/** Toàn bộ 246 ví dụ tự viết HSK 3 (dùng cho sổ tay). */
exports.ALL_HSK3_EXAMPLES = exports.HSK3_LESSONS.flatMap((l) => exports.HSK3_LESSON_EXAMPLES[l.id]);
