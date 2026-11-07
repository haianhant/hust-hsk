"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_HSK4_EXAMPLES = exports.HSK4_LESSON_EXAMPLES = exports.ALL_HSK4_VOCABULARY = exports.KNOWN_HSK4_LEXEME_IDS = exports.ALL_HSK4_LEXEMES = exports.HSK4_LESSON_GROUPS = exports.HSK4_LESSON_LEXEMES = exports.HSK4_LESSONS = exports.HSK4_XIA_LESSONS = exports.HSK4_SHANG_LESSONS = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
const hsk4_shang_l2_1 = require("./hsk4-shang-l2");
const hsk4_shang_l3_1 = require("./hsk4-shang-l3");
const hsk4_shang_l4_1 = require("./hsk4-shang-l4");
const hsk4_shang_l5_1 = require("./hsk4-shang-l5");
const hsk4_shang_l6_1 = require("./hsk4-shang-l6");
const hsk4_shang_l7_1 = require("./hsk4-shang-l7");
const hsk4_shang_l8_1 = require("./hsk4-shang-l8");
const hsk4_shang_l9_1 = require("./hsk4-shang-l9");
const hsk4_shang_l10_1 = require("./hsk4-shang-l10");
const hsk4_xia_l11_1 = require("./hsk4-xia-l11");
const hsk4_xia_l12_1 = require("./hsk4-xia-l12");
const hsk4_xia_l13_1 = require("./hsk4-xia-l13");
const hsk4_xia_l14_1 = require("./hsk4-xia-l14");
const hsk4_xia_l15_1 = require("./hsk4-xia-l15");
const hsk4_xia_l16_1 = require("./hsk4-xia-l16");
const hsk4_xia_l17_1 = require("./hsk4-xia-l17");
const hsk4_xia_l18_1 = require("./hsk4-xia-l18");
const hsk4_xia_l19_1 = require("./hsk4-xia-l19");
const hsk4_xia_l20_1 = require("./hsk4-xia-l20");
/** Metadata 10 bài HSK 4 quyển thượng, theo audit §3b. */
exports.HSK4_SHANG_LESSONS = [
    hsk4_shang_l1_1.HSK4_SHANG_L1_LESSON,
    hsk4_shang_l2_1.HSK4_SHANG_L2_LESSON,
    hsk4_shang_l3_1.HSK4_SHANG_L3_LESSON,
    hsk4_shang_l4_1.HSK4_SHANG_L4_LESSON,
    hsk4_shang_l5_1.HSK4_SHANG_L5_LESSON,
    hsk4_shang_l6_1.HSK4_SHANG_L6_LESSON,
    hsk4_shang_l7_1.HSK4_SHANG_L7_LESSON,
    hsk4_shang_l8_1.HSK4_SHANG_L8_LESSON,
    hsk4_shang_l9_1.HSK4_SHANG_L9_LESSON,
    hsk4_shang_l10_1.HSK4_SHANG_L10_LESSON,
];
/** Metadata 10 bài HSK 4 quyển hạ, theo audit §3c. */
exports.HSK4_XIA_LESSONS = [
    hsk4_xia_l11_1.HSK4_XIA_L11_LESSON,
    hsk4_xia_l12_1.HSK4_XIA_L12_LESSON,
    hsk4_xia_l13_1.HSK4_XIA_L13_LESSON,
    hsk4_xia_l14_1.HSK4_XIA_L14_LESSON,
    hsk4_xia_l15_1.HSK4_XIA_L15_LESSON,
    hsk4_xia_l16_1.HSK4_XIA_L16_LESSON,
    hsk4_xia_l17_1.HSK4_XIA_L17_LESSON,
    hsk4_xia_l18_1.HSK4_XIA_L18_LESSON,
    hsk4_xia_l19_1.HSK4_XIA_L19_LESSON,
    hsk4_xia_l20_1.HSK4_XIA_L20_LESSON,
];
/** Metadata cả 20 bài HSK 4. */
exports.HSK4_LESSONS = [...exports.HSK4_SHANG_LESSONS, ...exports.HSK4_XIA_LESSONS];
/** Toàn bộ từ theo bài (giữ thứ tự nguồn trong từng nhóm). */
exports.HSK4_LESSON_LEXEMES = {
    'hsk4-shang-l1': [
        ...hsk4_shang_l1_1.HSK4_SHANG_L1_LEXEMES,
        ...hsk4_shang_l1_1.HSK4_SHANG_L1_G2_LEXEMES,
        ...hsk4_shang_l1_1.HSK4_SHANG_L1_G3_LEXEMES,
        ...hsk4_shang_l1_1.HSK4_SHANG_L1_G4_LEXEMES,
    ],
    'hsk4-shang-l2': [
        ...hsk4_shang_l2_1.HSK4_SHANG_L2_LEXEMES,
        ...hsk4_shang_l2_1.HSK4_SHANG_L2_G2_LEXEMES,
        ...hsk4_shang_l2_1.HSK4_SHANG_L2_G3_LEXEMES,
        ...hsk4_shang_l2_1.HSK4_SHANG_L2_G4_LEXEMES,
    ],
    'hsk4-shang-l3': [
        ...hsk4_shang_l3_1.HSK4_SHANG_L3_LEXEMES,
        ...hsk4_shang_l3_1.HSK4_SHANG_L3_G2_LEXEMES,
        ...hsk4_shang_l3_1.HSK4_SHANG_L3_G3_LEXEMES,
        ...hsk4_shang_l3_1.HSK4_SHANG_L3_G4_LEXEMES,
    ],
    'hsk4-shang-l4': [
        ...hsk4_shang_l4_1.HSK4_SHANG_L4_LEXEMES,
        ...hsk4_shang_l4_1.HSK4_SHANG_L4_G2_LEXEMES,
        ...hsk4_shang_l4_1.HSK4_SHANG_L4_G3_LEXEMES,
        ...hsk4_shang_l4_1.HSK4_SHANG_L4_G4_LEXEMES,
    ],
    'hsk4-shang-l5': [
        ...hsk4_shang_l5_1.HSK4_SHANG_L5_LEXEMES,
        ...hsk4_shang_l5_1.HSK4_SHANG_L5_G2_LEXEMES,
        ...hsk4_shang_l5_1.HSK4_SHANG_L5_G3_LEXEMES,
        ...hsk4_shang_l5_1.HSK4_SHANG_L5_G4_LEXEMES,
    ],
    'hsk4-shang-l6': [
        ...hsk4_shang_l6_1.HSK4_SHANG_L6_LEXEMES,
        ...hsk4_shang_l6_1.HSK4_SHANG_L6_G2_LEXEMES,
        ...hsk4_shang_l6_1.HSK4_SHANG_L6_G3_LEXEMES,
        ...hsk4_shang_l6_1.HSK4_SHANG_L6_G4_LEXEMES,
    ],
    'hsk4-shang-l7': [
        ...hsk4_shang_l7_1.HSK4_SHANG_L7_LEXEMES,
        ...hsk4_shang_l7_1.HSK4_SHANG_L7_G2_LEXEMES,
        ...hsk4_shang_l7_1.HSK4_SHANG_L7_G3_LEXEMES,
        ...hsk4_shang_l7_1.HSK4_SHANG_L7_G4_LEXEMES,
    ],
    'hsk4-shang-l8': [
        ...hsk4_shang_l8_1.HSK4_SHANG_L8_LEXEMES,
        ...hsk4_shang_l8_1.HSK4_SHANG_L8_G2_LEXEMES,
        ...hsk4_shang_l8_1.HSK4_SHANG_L8_G3_LEXEMES,
        ...hsk4_shang_l8_1.HSK4_SHANG_L8_G4_LEXEMES,
    ],
    'hsk4-shang-l9': [
        ...hsk4_shang_l9_1.HSK4_SHANG_L9_LEXEMES,
        ...hsk4_shang_l9_1.HSK4_SHANG_L9_G2_LEXEMES,
        ...hsk4_shang_l9_1.HSK4_SHANG_L9_G3_LEXEMES,
        ...hsk4_shang_l9_1.HSK4_SHANG_L9_G4_LEXEMES,
    ],
    'hsk4-shang-l10': [
        ...hsk4_shang_l10_1.HSK4_SHANG_L10_LEXEMES,
        ...hsk4_shang_l10_1.HSK4_SHANG_L10_G2_LEXEMES,
        ...hsk4_shang_l10_1.HSK4_SHANG_L10_G3_LEXEMES,
        ...hsk4_shang_l10_1.HSK4_SHANG_L10_G4_LEXEMES,
    ],
    'hsk4-xia-l11': [...hsk4_xia_l11_1.HSK4_XIA_L11_LEXEMES],
    'hsk4-xia-l12': [...hsk4_xia_l12_1.HSK4_XIA_L12_LEXEMES],
    'hsk4-xia-l13': [...hsk4_xia_l13_1.HSK4_XIA_L13_LEXEMES],
    'hsk4-xia-l14': [...hsk4_xia_l14_1.HSK4_XIA_L14_LEXEMES],
    'hsk4-xia-l15': [...hsk4_xia_l15_1.HSK4_XIA_L15_LEXEMES],
    'hsk4-xia-l16': [...hsk4_xia_l16_1.HSK4_XIA_L16_LEXEMES],
    'hsk4-xia-l17': [...hsk4_xia_l17_1.HSK4_XIA_L17_LEXEMES],
    'hsk4-xia-l18': [...hsk4_xia_l18_1.HSK4_XIA_L18_LEXEMES],
    'hsk4-xia-l19': [...hsk4_xia_l19_1.HSK4_XIA_L19_LEXEMES],
    'hsk4-xia-l20': [...hsk4_xia_l20_1.HSK4_XIA_L20_LEXEMES],
};
/** Nhóm từ theo bài (thượng 4 nhóm/bài = 40 nhóm; hạ 1 nhóm/bài = 10 nhóm). */
exports.HSK4_LESSON_GROUPS = {
    'hsk4-shang-l1': [hsk4_shang_l1_1.HSK4_SHANG_L1_GROUP, hsk4_shang_l1_1.HSK4_SHANG_L1_GROUP2, hsk4_shang_l1_1.HSK4_SHANG_L1_GROUP3, hsk4_shang_l1_1.HSK4_SHANG_L1_GROUP4],
    'hsk4-shang-l2': [hsk4_shang_l2_1.HSK4_SHANG_L2_GROUP, hsk4_shang_l2_1.HSK4_SHANG_L2_GROUP2, hsk4_shang_l2_1.HSK4_SHANG_L2_GROUP3, hsk4_shang_l2_1.HSK4_SHANG_L2_GROUP4],
    'hsk4-shang-l3': [hsk4_shang_l3_1.HSK4_SHANG_L3_GROUP, hsk4_shang_l3_1.HSK4_SHANG_L3_GROUP2, hsk4_shang_l3_1.HSK4_SHANG_L3_GROUP3, hsk4_shang_l3_1.HSK4_SHANG_L3_GROUP4],
    'hsk4-shang-l4': [hsk4_shang_l4_1.HSK4_SHANG_L4_GROUP, hsk4_shang_l4_1.HSK4_SHANG_L4_GROUP2, hsk4_shang_l4_1.HSK4_SHANG_L4_GROUP3, hsk4_shang_l4_1.HSK4_SHANG_L4_GROUP4],
    'hsk4-shang-l5': [hsk4_shang_l5_1.HSK4_SHANG_L5_GROUP, hsk4_shang_l5_1.HSK4_SHANG_L5_GROUP2, hsk4_shang_l5_1.HSK4_SHANG_L5_GROUP3, hsk4_shang_l5_1.HSK4_SHANG_L5_GROUP4],
    'hsk4-shang-l6': [hsk4_shang_l6_1.HSK4_SHANG_L6_GROUP, hsk4_shang_l6_1.HSK4_SHANG_L6_GROUP2, hsk4_shang_l6_1.HSK4_SHANG_L6_GROUP3, hsk4_shang_l6_1.HSK4_SHANG_L6_GROUP4],
    'hsk4-shang-l7': [hsk4_shang_l7_1.HSK4_SHANG_L7_GROUP, hsk4_shang_l7_1.HSK4_SHANG_L7_GROUP2, hsk4_shang_l7_1.HSK4_SHANG_L7_GROUP3, hsk4_shang_l7_1.HSK4_SHANG_L7_GROUP4],
    'hsk4-shang-l8': [hsk4_shang_l8_1.HSK4_SHANG_L8_GROUP, hsk4_shang_l8_1.HSK4_SHANG_L8_GROUP2, hsk4_shang_l8_1.HSK4_SHANG_L8_GROUP3, hsk4_shang_l8_1.HSK4_SHANG_L8_GROUP4],
    'hsk4-shang-l9': [hsk4_shang_l9_1.HSK4_SHANG_L9_GROUP, hsk4_shang_l9_1.HSK4_SHANG_L9_GROUP2, hsk4_shang_l9_1.HSK4_SHANG_L9_GROUP3, hsk4_shang_l9_1.HSK4_SHANG_L9_GROUP4],
    'hsk4-shang-l10': [hsk4_shang_l10_1.HSK4_SHANG_L10_GROUP, hsk4_shang_l10_1.HSK4_SHANG_L10_GROUP2, hsk4_shang_l10_1.HSK4_SHANG_L10_GROUP3, hsk4_shang_l10_1.HSK4_SHANG_L10_GROUP4],
    'hsk4-xia-l11': [hsk4_xia_l11_1.HSK4_XIA_L11_GROUP],
    'hsk4-xia-l12': [hsk4_xia_l12_1.HSK4_XIA_L12_GROUP],
    'hsk4-xia-l13': [hsk4_xia_l13_1.HSK4_XIA_L13_GROUP],
    'hsk4-xia-l14': [hsk4_xia_l14_1.HSK4_XIA_L14_GROUP],
    'hsk4-xia-l15': [hsk4_xia_l15_1.HSK4_XIA_L15_GROUP],
    'hsk4-xia-l16': [hsk4_xia_l16_1.HSK4_XIA_L16_GROUP],
    'hsk4-xia-l17': [hsk4_xia_l17_1.HSK4_XIA_L17_GROUP],
    'hsk4-xia-l18': [hsk4_xia_l18_1.HSK4_XIA_L18_GROUP],
    'hsk4-xia-l19': [hsk4_xia_l19_1.HSK4_XIA_L19_GROUP],
    'hsk4-xia-l20': [hsk4_xia_l20_1.HSK4_XIA_L20_GROUP],
};
/** Toàn bộ 811 từ HSK 4, bài 1→20. */
exports.ALL_HSK4_LEXEMES = exports.HSK4_LESSONS.flatMap((l) => exports.HSK4_LESSON_LEXEMES[l.id]);
/** ID các từ đã biết — dùng để loại id lạ khi import tiến độ (store). */
exports.KNOWN_HSK4_LEXEME_IDS = exports.ALL_HSK4_LEXEMES.map((w) => w.id);
/** Liên kết từ ↔ bài/nhóm, giữ thứ tự nguồn (811 mục). */
exports.ALL_HSK4_VOCABULARY = [
    ...hsk4_shang_l1_1.HSK4_SHANG_L1_VOCABULARY,
    ...hsk4_shang_l1_1.HSK4_SHANG_L1_G2_VOCABULARY,
    ...hsk4_shang_l1_1.HSK4_SHANG_L1_G3_VOCABULARY,
    ...hsk4_shang_l1_1.HSK4_SHANG_L1_G4_VOCABULARY,
    ...hsk4_shang_l2_1.HSK4_SHANG_L2_VOCABULARY,
    ...hsk4_shang_l2_1.HSK4_SHANG_L2_G2_VOCABULARY,
    ...hsk4_shang_l2_1.HSK4_SHANG_L2_G3_VOCABULARY,
    ...hsk4_shang_l2_1.HSK4_SHANG_L2_G4_VOCABULARY,
    ...hsk4_shang_l3_1.HSK4_SHANG_L3_VOCABULARY,
    ...hsk4_shang_l3_1.HSK4_SHANG_L3_G2_VOCABULARY,
    ...hsk4_shang_l3_1.HSK4_SHANG_L3_G3_VOCABULARY,
    ...hsk4_shang_l3_1.HSK4_SHANG_L3_G4_VOCABULARY,
    ...hsk4_shang_l4_1.HSK4_SHANG_L4_VOCABULARY,
    ...hsk4_shang_l4_1.HSK4_SHANG_L4_G2_VOCABULARY,
    ...hsk4_shang_l4_1.HSK4_SHANG_L4_G3_VOCABULARY,
    ...hsk4_shang_l4_1.HSK4_SHANG_L4_G4_VOCABULARY,
    ...hsk4_shang_l5_1.HSK4_SHANG_L5_VOCABULARY,
    ...hsk4_shang_l5_1.HSK4_SHANG_L5_G2_VOCABULARY,
    ...hsk4_shang_l5_1.HSK4_SHANG_L5_G3_VOCABULARY,
    ...hsk4_shang_l5_1.HSK4_SHANG_L5_G4_VOCABULARY,
    ...hsk4_shang_l6_1.HSK4_SHANG_L6_VOCABULARY,
    ...hsk4_shang_l6_1.HSK4_SHANG_L6_G2_VOCABULARY,
    ...hsk4_shang_l6_1.HSK4_SHANG_L6_G3_VOCABULARY,
    ...hsk4_shang_l6_1.HSK4_SHANG_L6_G4_VOCABULARY,
    ...hsk4_shang_l7_1.HSK4_SHANG_L7_VOCABULARY,
    ...hsk4_shang_l7_1.HSK4_SHANG_L7_G2_VOCABULARY,
    ...hsk4_shang_l7_1.HSK4_SHANG_L7_G3_VOCABULARY,
    ...hsk4_shang_l7_1.HSK4_SHANG_L7_G4_VOCABULARY,
    ...hsk4_shang_l8_1.HSK4_SHANG_L8_VOCABULARY,
    ...hsk4_shang_l8_1.HSK4_SHANG_L8_G2_VOCABULARY,
    ...hsk4_shang_l8_1.HSK4_SHANG_L8_G3_VOCABULARY,
    ...hsk4_shang_l8_1.HSK4_SHANG_L8_G4_VOCABULARY,
    ...hsk4_shang_l9_1.HSK4_SHANG_L9_VOCABULARY,
    ...hsk4_shang_l9_1.HSK4_SHANG_L9_G2_VOCABULARY,
    ...hsk4_shang_l9_1.HSK4_SHANG_L9_G3_VOCABULARY,
    ...hsk4_shang_l9_1.HSK4_SHANG_L9_G4_VOCABULARY,
    ...hsk4_shang_l10_1.HSK4_SHANG_L10_VOCABULARY,
    ...hsk4_shang_l10_1.HSK4_SHANG_L10_G2_VOCABULARY,
    ...hsk4_shang_l10_1.HSK4_SHANG_L10_G3_VOCABULARY,
    ...hsk4_shang_l10_1.HSK4_SHANG_L10_G4_VOCABULARY,
    ...hsk4_xia_l11_1.HSK4_XIA_L11_VOCABULARY,
    ...hsk4_xia_l12_1.HSK4_XIA_L12_VOCABULARY,
    ...hsk4_xia_l13_1.HSK4_XIA_L13_VOCABULARY,
    ...hsk4_xia_l14_1.HSK4_XIA_L14_VOCABULARY,
    ...hsk4_xia_l15_1.HSK4_XIA_L15_VOCABULARY,
    ...hsk4_xia_l16_1.HSK4_XIA_L16_VOCABULARY,
    ...hsk4_xia_l17_1.HSK4_XIA_L17_VOCABULARY,
    ...hsk4_xia_l18_1.HSK4_XIA_L18_VOCABULARY,
    ...hsk4_xia_l19_1.HSK4_XIA_L19_VOCABULARY,
    ...hsk4_xia_l20_1.HSK4_XIA_L20_VOCABULARY,
];
/** Ví dụ tự viết theo bài (mỗi từ 1 câu, source 'authored'). */
exports.HSK4_LESSON_EXAMPLES = {
    'hsk4-shang-l1': [
        ...hsk4_shang_l1_1.HSK4_SHANG_L1_EXAMPLES,
        ...hsk4_shang_l1_1.HSK4_SHANG_L1_G2_EXAMPLES,
        ...hsk4_shang_l1_1.HSK4_SHANG_L1_G3_EXAMPLES,
        ...hsk4_shang_l1_1.HSK4_SHANG_L1_G4_EXAMPLES,
    ],
    'hsk4-shang-l2': [
        ...hsk4_shang_l2_1.HSK4_SHANG_L2_EXAMPLES,
        ...hsk4_shang_l2_1.HSK4_SHANG_L2_G2_EXAMPLES,
        ...hsk4_shang_l2_1.HSK4_SHANG_L2_G3_EXAMPLES,
        ...hsk4_shang_l2_1.HSK4_SHANG_L2_G4_EXAMPLES,
    ],
    'hsk4-shang-l3': [
        ...hsk4_shang_l3_1.HSK4_SHANG_L3_EXAMPLES,
        ...hsk4_shang_l3_1.HSK4_SHANG_L3_G2_EXAMPLES,
        ...hsk4_shang_l3_1.HSK4_SHANG_L3_G3_EXAMPLES,
        ...hsk4_shang_l3_1.HSK4_SHANG_L3_G4_EXAMPLES,
    ],
    'hsk4-shang-l4': [
        ...hsk4_shang_l4_1.HSK4_SHANG_L4_EXAMPLES,
        ...hsk4_shang_l4_1.HSK4_SHANG_L4_G2_EXAMPLES,
        ...hsk4_shang_l4_1.HSK4_SHANG_L4_G3_EXAMPLES,
        ...hsk4_shang_l4_1.HSK4_SHANG_L4_G4_EXAMPLES,
    ],
    'hsk4-shang-l5': [
        ...hsk4_shang_l5_1.HSK4_SHANG_L5_EXAMPLES,
        ...hsk4_shang_l5_1.HSK4_SHANG_L5_G2_EXAMPLES,
        ...hsk4_shang_l5_1.HSK4_SHANG_L5_G3_EXAMPLES,
        ...hsk4_shang_l5_1.HSK4_SHANG_L5_G4_EXAMPLES,
    ],
    'hsk4-shang-l6': [
        ...hsk4_shang_l6_1.HSK4_SHANG_L6_EXAMPLES,
        ...hsk4_shang_l6_1.HSK4_SHANG_L6_G2_EXAMPLES,
        ...hsk4_shang_l6_1.HSK4_SHANG_L6_G3_EXAMPLES,
        ...hsk4_shang_l6_1.HSK4_SHANG_L6_G4_EXAMPLES,
    ],
    'hsk4-shang-l7': [
        ...hsk4_shang_l7_1.HSK4_SHANG_L7_EXAMPLES,
        ...hsk4_shang_l7_1.HSK4_SHANG_L7_G2_EXAMPLES,
        ...hsk4_shang_l7_1.HSK4_SHANG_L7_G3_EXAMPLES,
        ...hsk4_shang_l7_1.HSK4_SHANG_L7_G4_EXAMPLES,
    ],
    'hsk4-shang-l8': [
        ...hsk4_shang_l8_1.HSK4_SHANG_L8_EXAMPLES,
        ...hsk4_shang_l8_1.HSK4_SHANG_L8_G2_EXAMPLES,
        ...hsk4_shang_l8_1.HSK4_SHANG_L8_G3_EXAMPLES,
        ...hsk4_shang_l8_1.HSK4_SHANG_L8_G4_EXAMPLES,
    ],
    'hsk4-shang-l9': [
        ...hsk4_shang_l9_1.HSK4_SHANG_L9_EXAMPLES,
        ...hsk4_shang_l9_1.HSK4_SHANG_L9_G2_EXAMPLES,
        ...hsk4_shang_l9_1.HSK4_SHANG_L9_G3_EXAMPLES,
        ...hsk4_shang_l9_1.HSK4_SHANG_L9_G4_EXAMPLES,
    ],
    'hsk4-shang-l10': [
        ...hsk4_shang_l10_1.HSK4_SHANG_L10_EXAMPLES,
        ...hsk4_shang_l10_1.HSK4_SHANG_L10_G2_EXAMPLES,
        ...hsk4_shang_l10_1.HSK4_SHANG_L10_G3_EXAMPLES,
        ...hsk4_shang_l10_1.HSK4_SHANG_L10_G4_EXAMPLES,
    ],
    'hsk4-xia-l11': [...hsk4_xia_l11_1.HSK4_XIA_L11_EXAMPLES],
    'hsk4-xia-l12': [...hsk4_xia_l12_1.HSK4_XIA_L12_EXAMPLES],
    'hsk4-xia-l13': [...hsk4_xia_l13_1.HSK4_XIA_L13_EXAMPLES],
    'hsk4-xia-l14': [...hsk4_xia_l14_1.HSK4_XIA_L14_EXAMPLES],
    'hsk4-xia-l15': [...hsk4_xia_l15_1.HSK4_XIA_L15_EXAMPLES],
    'hsk4-xia-l16': [...hsk4_xia_l16_1.HSK4_XIA_L16_EXAMPLES],
    'hsk4-xia-l17': [...hsk4_xia_l17_1.HSK4_XIA_L17_EXAMPLES],
    'hsk4-xia-l18': [...hsk4_xia_l18_1.HSK4_XIA_L18_EXAMPLES],
    'hsk4-xia-l19': [...hsk4_xia_l19_1.HSK4_XIA_L19_EXAMPLES],
    'hsk4-xia-l20': [...hsk4_xia_l20_1.HSK4_XIA_L20_EXAMPLES],
};
/** Toàn bộ 811 ví dụ tự viết HSK 4 (dùng cho sổ tay). */
exports.ALL_HSK4_EXAMPLES = exports.HSK4_LESSONS.flatMap((l) => exports.HSK4_LESSON_EXAMPLES[l.id]);
