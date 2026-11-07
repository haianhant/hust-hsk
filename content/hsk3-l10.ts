/**
 * Dữ liệu khởi đầu: HSK 3 — Bài 10, nhóm 1 (9 từ).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (kiểm chứng 2026-11-05,
 * xem docs/content-audit.md §3a: bài 10 có 28 từ, nhóm 1 có 9 từ).
 * CHỈ 9 từ này. Không thêm từ/bài nào khác, không thêm HSK 3 bài 1–9 hay HSK 5.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép toàn văn bài khóa.
 */
import type {
  Course,
  Example,
  Lesson,
  LessonGroup,
  LessonVocabulary,
  Lexeme,
} from '../lib/learn/types';

export const HSK3_COURSE: Course = {
  id: 'hsk3',
  title: 'HSK 3',
  level: 'HSK 3',
};

export const HSK3_L10_LESSON: Lesson = {
  id: 'hsk3-l10',
  courseId: 'hsk3',
  number: 10,
  title: '你明天再把书还给我',
  topic: 'Học tập & câu chữ 把',
};

export const HSK3_L10_GROUP: LessonGroup = {
  id: 'hsk3-l10-g1',
  lessonId: 'hsk3-l10',
  index: 1,
};

const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk3';
const VERIFIED_AT = '2026-11-05';

function lexeme(
  idSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
  pos: string,
  order: number,
): Lexeme {
  return {
    id: `hsk3-l10-g1-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk3',
    lessonId: 'hsk3-l10',
    groupId: 'hsk3-l10-g1',
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 9 từ nhóm 1 HSK 3 bài 10, đúng thứ tự nguồn 1..9. */
export const HSK3_L10_LEXEMES: Lexeme[] = [
  lexeme('shuxue', '数学', 'shùxué', 'môn Toán', 'danh từ', 1),
  lexeme('renzhen', '认真', 'rènzhēn', 'chăm chỉ, nghiêm túc', 'tính từ', 2),
  lexeme('biji', '笔记', 'bǐjì', 'ghi chép', 'danh từ', 3),
  lexeme('qingchu', '清楚', 'qīngchu', 'rõ ràng', 'tính từ', 4),
  lexeme('heiban', '黑板', 'hēibǎn', 'bảng đen', 'danh từ', 5),
  lexeme('ba', '把', 'bǎ', 'giới từ/cấu trúc 把', 'giới từ/cấu trúc 把', 6),
  lexeme('zuoye', '作业', 'zuòyè', 'bài tập về nhà', 'danh từ', 7),
  lexeme('bian', '遍', 'biàn', 'lượt', 'lượng từ', 8),
  lexeme('tigao', '提高', 'tígāo', 'nâng cao', 'động từ', 9),
];

/** ID các từ đã biết — dùng để loại id lạ khi import tiến độ. */
export const KNOWN_LEXEME_IDS: string[] = HSK3_L10_LEXEMES.map((w) => w.id);

/** Liên kết 9 từ với bài 10 / nhóm 1, giữ thứ tự nguồn. */
export const HSK3_L10_VOCABULARY: LessonVocabulary[] = HSK3_L10_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l10',
    groupId: 'hsk3-l10-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

function example(
  lexemeIdSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
): Example {
  return {
    id: `hsk3-l10-g1-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk3-l10-g1-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 数学 "我喜欢数学。" / 认真 "他学习很认真。" / 笔记 "我记了笔记。"
 *   (dùng 记笔记 — cách kết hợp chuẩn; không dùng 写笔记)
 * - 清楚 "老师说得很清楚。" / 黑板 "黑板上有汉字。"
 * - 把 "请把书给我。" (câu chữ 把 chuẩn) / 作业 "我写作业。"
 * - 遍 "我读了三遍。" / 提高 "我想提高汉语。"
 * Không có câu nào còn nghi ngờ về độ đúng tiếng Trung ở thời điểm ghi.
 */
export const HSK3_L10_EXAMPLES: Example[] = [
  example('shuxue', '我喜欢数学。', 'wǒ xǐhuān shùxué.', 'Tôi thích môn Toán.'),
  example('renzhen', '他学习很认真。', 'tā xuéxí hěn rènzhēn.', 'Anh ấy học rất chăm chỉ.'),
  example('biji', '我记了笔记。', 'wǒ jì le bǐjì.', 'Tôi đã ghi chép.'),
  example('qingchu', '老师说得很清楚。', 'lǎoshī shuō de hěn qīngchu.', 'Cô giáo nói rất rõ ràng.'),
  example('heiban', '黑板上有汉字。', 'hēibǎn shàng yǒu Hànzì.', 'Trên bảng đen có chữ Hán.'),
  example('ba', '请把书给我。', 'qǐng bǎ shū gěi wǒ.', 'Xin hãy đưa sách cho tôi.'),
  example('zuoye', '我写作业。', 'wǒ xiě zuòyè.', 'Tôi làm bài tập về nhà.'),
  example('bian', '我读了三遍。', 'wǒ dú le sān biàn.', 'Tôi đã đọc ba lượt.'),
  example('tigao', '我想提高汉语。', 'wǒ xiǎng tígāo Hànyǔ.', 'Tôi muốn nâng cao tiếng Hán.'),
];

/** Alias ngắn cho HSK3_L10_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK3_L10_EXAMPLES;

/**
 * BỔ SUNG 2026-11-06 (Phần B): HSK 3 — Bài 10, nhóm 2–4 (19 từ).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (file dữ liệu công khai
 * assets/data/hsk3-vocabgroups.js + assets/data/hsk3.js, tải về /tmp và
 * đếm trực tiếp 2026-11-06; xem docs/content-audit.md §3a).
 * Đối chiếu audit: nhóm 2 = 9 từ, nhóm 3 = 6 từ, nhóm 4 = 4 từ — KHỚP.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG sao chép câu ví dụ của site nguồn
 * hay giáo trình.
 */
export const HSK3_L10_GROUP2: LessonGroup = {
  id: 'hsk3-l10-g2',
  lessonId: 'hsk3-l10',
  index: 2,
};

export const HSK3_L10_GROUP3: LessonGroup = {
  id: 'hsk3-l10-g3',
  lessonId: 'hsk3-l10',
  index: 3,
};

export const HSK3_L10_GROUP4: LessonGroup = {
  id: 'hsk3-l10-g4',
  lessonId: 'hsk3-l10',
  index: 4,
};

function lexemeG(
  group: 2 | 3 | 4,
  idSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
  pos: string,
  order: number,
): Lexeme {
  return {
    id: `hsk3-l10-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk3',
    lessonId: 'hsk3-l10',
    groupId: `hsk3-l10-g${group}`,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 9 từ nhóm 2 HSK 3 bài 10, đúng thứ tự nguồn 1..9. */
export const HSK3_L10_G2_LEXEMES: Lexeme[] = [
  lexemeG(2, 'lishi', '历史', 'lìshǐ', 'Lịch sử', 'danh từ', 1),
  lexemeG(2, 'nan', '难', 'nán', 'khó', 'tính từ', 2),
  lexemeG(2, 'yaoqiu', '要求', 'yāoqiú', 'yêu cầu', 'danh từ / động từ', 3),
  lexemeG(2, 'cha', '差', 'chà', 'kém', 'tính từ', 4),
  lexemeG(2, 'fuxi', '复习', 'fùxí', 'ôn tập', 'động từ', 5),
  lexemeG(2, 'waiyu', '外语', 'wàiyǔ', 'ngoại ngữ', 'danh từ', 6),
  lexemeG(2, 'dangran', '当然', 'dāngrán', 'đương nhiên', 'phó từ', 7),
  lexemeG(2, 'yudao', '遇到', 'yùdào', 'gặp, gặp phải', 'động từ', 8),
  lexemeG(2, 'bangongshi', '办公室', 'bàngōngshì', 'văn phòng', 'danh từ', 9),
];

/** 6 từ nhóm 3 HSK 3 bài 10, đúng thứ tự nguồn 1..6. */
export const HSK3_L10_G3_LEXEMES: Lexeme[] = [
  lexemeG(3, 'ye', '页', 'yè', 'trang (sách)', 'lượng từ', 1),
  lexemeG(3, 'duihua', '对话', 'duìhuà', 'hội thoại', 'danh từ', 2),
  lexemeG(3, 'mingbai', '明白', 'míngbai', 'hiểu', 'động từ', 3),
  lexemeG(3, 'jiang', '讲', 'jiǎng', 'giảng', 'động từ', 4),
  lexemeG(3, 'ju', '句', 'jù', 'câu (nói)', 'lượng từ', 5),
  lexemeG(3, 'juzi', '句子', 'jùzi', 'câu (văn)', 'danh từ', 6),
];

/** 4 từ nhóm 4 HSK 3 bài 10, đúng thứ tự nguồn 1..4. */
export const HSK3_L10_G4_LEXEMES: Lexeme[] = [
  lexemeG(4, 'nianji', '年级', 'niánjí', 'khối lớp', 'danh từ', 1),
  lexemeG(4, 'hounian', '后年', 'hòunián', 'năm sau nữa', 'danh từ', 2),
  lexemeG(4, 'yiban', '一般', 'yìbān', 'bình thường', 'tính từ', 3),
  lexemeG(4, 'nuli', '努力', 'nǔlì', 'nỗ lực', 'động từ', 4),
];

/** Liên kết 19 từ nhóm 2–4 với bài 10, giữ thứ tự nguồn. */
export const HSK3_L10_G2_VOCABULARY: LessonVocabulary[] = HSK3_L10_G2_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l10',
    groupId: 'hsk3-l10-g2',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK3_L10_G3_VOCABULARY: LessonVocabulary[] = HSK3_L10_G3_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l10',
    groupId: 'hsk3-l10-g3',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK3_L10_G4_VOCABULARY: LessonVocabulary[] = HSK3_L10_G4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l10',
    groupId: 'hsk3-l10-g4',
    lexemeId: w.id,
    order: w.order,
  }),
);

function exampleG(
  group: 2 | 3 | 4,
  lexemeIdSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
): Example {
  return {
    id: `hsk3-l10-g${group}-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk3-l10-g${group}-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ nhóm 2–4 một câu ngắn:
 * - 历史 "我喜欢历史。" / 难 "这个字很难。" / 要求 "老师的要求不高。"
 *   / 差 "我的数学很差。" / 复习 "我每天复习汉语。" / 外语 "他学两门外语。"
 *   / 当然 "当然可以。" / 遇到 "我遇到一个问题。" / 办公室 "办公室在二楼。"
 * - 页 "这本书有十页。" / 对话 "我们练习对话。" / 明白 "我明白了。"
 *   / 讲 "老师讲汉语。" / 句 "请说一句汉语。" / 句子 "这个句子很短。"
 * - 年级 "他在三年级。" / 后年 "后年我去中国。" / 一般 "我的汉语一般。"
 *   / 努力 "我要努力学习。"
 */
export const HSK3_L10_G2_EXAMPLES: Example[] = [
  exampleG(2, 'lishi', '我喜欢历史。', 'wǒ xǐhuān lìshǐ.', 'Tôi thích môn Lịch sử.'),
  exampleG(2, 'nan', '这个字很难。', 'zhège zì hěn nán.', 'Chữ này rất khó.'),
  exampleG(2, 'yaoqiu', '老师的要求不高。', 'lǎoshī de yāoqiú bù gāo.', 'Yêu cầu của cô giáo không cao.'),
  exampleG(2, 'cha', '我的数学很差。', 'wǒ de shùxué hěn chà.', 'Môn Toán của tôi rất kém.'),
  exampleG(2, 'fuxi', '我每天复习汉语。', 'wǒ měitiān fùxí Hànyǔ.', 'Tôi ôn tập tiếng Hán mỗi ngày.'),
  exampleG(2, 'waiyu', '他学两门外语。', 'tā xué liǎng mén wàiyǔ.', 'Anh ấy học hai ngoại ngữ.'),
  exampleG(2, 'dangran', '当然可以。', 'dāngrán kěyǐ.', 'Đương nhiên là được.'),
  exampleG(2, 'yudao', '我遇到一个问题。', 'wǒ yùdào yí gè wèntí.', 'Tôi gặp một vấn đề.'),
  exampleG(2, 'bangongshi', '办公室在二楼。', 'bàngōngshì zài èr lóu.', 'Văn phòng ở tầng hai.'),
];

export const HSK3_L10_G3_EXAMPLES: Example[] = [
  exampleG(3, 'ye', '这本书有十页。', 'zhè běn shū yǒu shí yè.', 'Cuốn sách này có mười trang.'),
  exampleG(3, 'duihua', '我们练习对话。', 'wǒmen liànxí duìhuà.', 'Chúng tôi luyện hội thoại.'),
  exampleG(3, 'mingbai', '我明白了。', 'wǒ míngbai le.', 'Tôi hiểu rồi.'),
  exampleG(3, 'jiang', '老师讲汉语。', 'lǎoshī jiǎng Hànyǔ.', 'Cô giáo giảng tiếng Hán.'),
  exampleG(3, 'ju', '请说一句汉语。', 'qǐng shuō yí jù Hànyǔ.', 'Xin hãy nói một câu tiếng Hán.'),
  exampleG(3, 'juzi', '这个句子很短。', 'zhège jùzi hěn duǎn.', 'Câu này rất ngắn.'),
];

export const HSK3_L10_G4_EXAMPLES: Example[] = [
  exampleG(4, 'nianji', '他在三年级。', 'tā zài sān niánjí.', 'Bạn ấy học lớp ba.'),
  exampleG(4, 'hounian', '后年我去中国。', 'hòunián wǒ qù Zhōngguó.', 'Năm sau nữa tôi đi Trung Quốc.'),
  exampleG(4, 'yiban', '我的汉语一般。', 'wǒ de Hànyǔ yìbān.', 'Tiếng Hán của tôi bình thường.'),
  exampleG(4, 'nuli', '我要努力学习。', 'wǒ yào nǔlì xuéxí.', 'Tôi muốn nỗ lực học tập.'),
];
