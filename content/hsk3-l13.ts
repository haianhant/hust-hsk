/**
 * Dữ liệu khởi đầu: HSK 3 — Bài 13 (28 từ, 4 nhóm: 8+5+6+9).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (file dữ liệu công khai
 * assets/data/hsk3-vocabgroups.js + assets/data/hsk3.js, tải về /tmp và
 * đếm trực tiếp 2026-11-06; xem docs/content-audit.md §3a).
 * Đối chiếu audit: nhóm 1 = 8, nhóm 2 = 5, nhóm 3 = 6, nhóm 4 = 9 — KHỚP.
 * Thứ tự + ranh giới nhóm theo đúng file nhóm của nguồn.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép toàn văn bài khóa.
 */
import type {
  Example,
  Lesson,
  LessonGroup,
  LessonVocabulary,
  Lexeme,
} from '../lib/learn/types';
import { HSK3_COURSE } from './hsk3-l10';

export { HSK3_COURSE };

export const HSK3_L13_LESSON: Lesson = {
  id: 'hsk3-l13',
  courseId: 'hsk3',
  number: 13,
  title: '我的新邻居来自英国',
  topic: 'Hàng xóm & văn hóa',
};

export const HSK3_L13_GROUP: LessonGroup = {
  id: 'hsk3-l13-g1',
  lessonId: 'hsk3-l13',
  index: 1,
};

export const HSK3_L13_GROUP2: LessonGroup = {
  id: 'hsk3-l13-g2',
  lessonId: 'hsk3-l13',
  index: 2,
};

export const HSK3_L13_GROUP3: LessonGroup = {
  id: 'hsk3-l13-g3',
  lessonId: 'hsk3-l13',
  index: 3,
};

export const HSK3_L13_GROUP4: LessonGroup = {
  id: 'hsk3-l13-g4',
  lessonId: 'hsk3-l13',
  index: 4,
};

const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk3';
const VERIFIED_AT = '2026-11-06';

function lexeme(
  group: 1 | 2 | 3 | 4,
  idSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
  pos: string,
  order: number,
): Lexeme {
  return {
    id: `hsk3-l13-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk3',
    lessonId: 'hsk3-l13',
    groupId: `hsk3-l13-g${group}`,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 8 từ nhóm 1 HSK 3 bài 13, đúng thứ tự nguồn 1..8. */
export const HSK3_L13_LEXEMES: Lexeme[] = [
  lexeme(1, 'qingke', '请客', 'qǐngkè', 'đãi khách, mời khách', 'động từ', 1),
  lexeme(1, 'nanfang', '南方', 'nánfāng', 'miền Nam', 'danh từ', 2),
  lexeme(1, 'beifang', '北方', 'běifāng', 'miền Bắc', 'danh từ', 3),
  lexeme(1, 'zuofa', '做法', 'zuòfǎ', 'cách làm', 'danh từ', 4),
  lexeme(1, 'butong', '不同', 'bùtóng', 'khác nhau', 'tính từ', 5),
  lexeme(1, 'jia', '加', 'jiā', 'thêm', 'động từ', 6),
  lexeme(1, 'dehua', '的话', 'dehuà', 'nếu', 'trợ từ/cấu trúc', 7),
  lexeme(1, 'zuoke', '做客', 'zuòkè', 'làm khách', 'động từ', 8),
];

/** 5 từ nhóm 2 HSK 3 bài 13, đúng thứ tự nguồn 1..5. */
export const HSK3_L13_G2_LEXEMES: Lexeme[] = [
  lexeme(2, 'linju', '邻居', 'línjū', 'hàng xóm, láng giềng', 'danh từ', 1),
  lexeme(2, 'fangxin', '放心', 'fàngxīn', 'yên tâm', 'động từ', 2),
  lexeme(2, 'jiu', '酒', 'jiǔ', 'rượu', 'danh từ', 3),
  lexeme(2, 'fang', '放', 'fàng', 'đặt, để', 'động từ', 4),
  lexeme(2, 'keren', '客人', 'kèrén', 'khách, khách hàng', 'danh từ', 5),
];

/** 6 từ nhóm 3 HSK 3 bài 13, đúng thứ tự nguồn 1..6. */
export const HSK3_L13_G3_LEXEMES: Lexeme[] = [
  lexeme(3, 'wanhui', '晚会', 'wǎnhuì', 'dạ hội, buổi tiệc tối', 'danh từ', 1),
  lexeme(3, 'liwu', '礼物', 'lǐwù', 'quà, món quà', 'danh từ', 2),
  lexeme(3, 'huajia', '画家', 'huàjiā', 'họa sĩ', 'danh từ', 3),
  lexeme(3, 'panzi', '盘子', 'pánzi', 'đĩa', 'danh từ', 4),
  lexeme(3, 'yibian', '一边', 'yìbiān', 'vừa… vừa…', 'phó từ', 5),
  lexeme(3, 'liaotianr', '聊天儿', 'liáotiānr', 'trò chuyện, tán gẫu', 'động từ', 6),
];

/** 9 từ nhóm 4 HSK 3 bài 13, đúng thứ tự nguồn 1..9. */
export const HSK3_L13_G4_LEXEMES: Lexeme[] = [
  lexeme(4, 'laizi', '来自', 'láizì', 'đến từ', 'động từ', 1),
  lexeme(4, 'fuqi', '夫妻', 'fūqī', 'vợ chồng', 'danh từ', 2),
  lexeme(4, 'zhidao', '直到', 'zhídào', 'cho đến, mãi đến', 'động từ / giới từ', 3),
  lexeme(4, 'ditu', '地图', 'dìtú', 'bản đồ', 'danh từ', 4),
  lexeme(4, 'dian', '点', 'diǎn', 'điểm, chấm nhỏ', 'danh từ', 5),
  lexeme(4, 'gandao', '感到', 'gǎndào', 'cảm thấy', 'động từ', 6),
  lexeme(4, 'dongfang', '东方', 'dōngfāng', 'phương Đông', 'danh từ', 7),
  lexeme(4, 'wenhua', '文化', 'wénhuà', 'văn hóa', 'danh từ', 8),
  lexeme(4, 'yingguo', '英国', 'Yīngguó', 'Vương quốc Anh', 'danh từ riêng', 9),
];

/** Liên kết 28 từ với bài 13, giữ thứ tự nguồn. */
export const HSK3_L13_VOCABULARY: LessonVocabulary[] = HSK3_L13_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l13',
    groupId: 'hsk3-l13-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK3_L13_G2_VOCABULARY: LessonVocabulary[] = HSK3_L13_G2_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l13',
    groupId: 'hsk3-l13-g2',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK3_L13_G3_VOCABULARY: LessonVocabulary[] = HSK3_L13_G3_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l13',
    groupId: 'hsk3-l13-g3',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK3_L13_G4_VOCABULARY: LessonVocabulary[] = HSK3_L13_G4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l13',
    groupId: 'hsk3-l13-g4',
    lexemeId: w.id,
    order: w.order,
  }),
);

function example(
  group: 1 | 2 | 3 | 4,
  lexemeIdSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
): Example {
  return {
    id: `hsk3-l13-g${group}-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk3-l13-g${group}-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 请客 "今天我请客。" / 南方 "他来自南方。" / 北方 "北方很冷。"
 *   / 做法 "这个做法很好。" / 不同 "我们的想法不同。" / 加 "请加一点儿水。"
 *   / 的话 "你来的话，我很高兴。" / 做客 "我去他家做客。"
 * - 邻居 "我的邻居很好。" / 放心 "你放心吧。" / 酒 "他不喝酒。"
 *   / 放 "请把书放在桌子上。" / 客人 "家里来了客人。"
 * - 晚会 "今晚有一个晚会。" / 礼物 "这是一个礼物。" / 画家 "他是一位画家。"
 *   / 盘子 "盘子在桌子上。" / 一边 "他一边走一边唱歌。" / 聊天儿 "我们聊天儿。"
 * - 来自 "我来自越南。" / 夫妻 "他们是夫妻。" / 直到 "直到十点，我才回家。"
 *   / 地图 "这是一张地图。" / 点 "地图上有一个点。" / 感到 "我感到很高兴。"
 *   / 东方 "东方文化很有意思。" / 文化 "我喜欢中国文化。" / 英国 "他来自英国。"
 */
export const HSK3_L13_EXAMPLES: Example[] = [
  example(1, 'qingke', '今天我请客。', 'jīntiān wǒ qǐngkè.', 'Hôm nay tôi đãi khách.'),
  example(1, 'nanfang', '他来自南方。', 'tā láizì nánfāng.', 'Anh ấy đến từ miền Nam.'),
  example(1, 'beifang', '北方很冷。', 'běifāng hěn lěng.', 'Miền Bắc rất lạnh.'),
  example(1, 'zuofa', '这个做法很好。', 'zhège zuòfǎ hěn hǎo.', 'Cách làm này rất tốt.'),
  example(1, 'butong', '我们的想法不同。', 'wǒmen de xiǎngfǎ bùtóng.', 'Suy nghĩ của chúng tôi khác nhau.'),
  example(1, 'jia', '请加一点儿水。', 'qǐng jiā yìdiǎnr shuǐ.', 'Xin hãy thêm một chút nước.'),
  example(1, 'dehua', '你来的话，我很高兴。', 'nǐ lái dehuà, wǒ hěn gāoxìng.', 'Nếu bạn đến, tôi rất vui.'),
  example(1, 'zuoke', '我去他家做客。', 'wǒ qù tā jiā zuòkè.', 'Tôi đến nhà anh ấy làm khách.'),
];

export const HSK3_L13_G2_EXAMPLES: Example[] = [
  example(2, 'linju', '我的邻居很好。', 'wǒ de línjū hěn hǎo.', 'Hàng xóm của tôi rất tốt.'),
  example(2, 'fangxin', '你放心吧。', 'nǐ fàngxīn ba.', 'Bạn yên tâm đi.'),
  example(2, 'jiu', '他不喝酒。', 'tā bù hē jiǔ.', 'Anh ấy không uống rượu.'),
  example(2, 'fang', '请把书放在桌子上。', 'qǐng bǎ shū fàng zài zhuōzi shang.', 'Xin hãy đặt sách lên bàn.'),
  example(2, 'keren', '家里来了客人。', 'jiālǐ lái le kèrén.', 'Trong nhà có khách đến.'),
];

export const HSK3_L13_G3_EXAMPLES: Example[] = [
  example(3, 'wanhui', '今晚有一个晚会。', 'jīnwǎn yǒu yí gè wǎnhuì.', 'Tối nay có một buổi dạ hội.'),
  example(3, 'liwu', '这是一个礼物。', 'zhè shì yí gè lǐwù.', 'Đây là một món quà.'),
  example(3, 'huajia', '他是一位画家。', 'tā shì yí wèi huàjiā.', 'Anh ấy là một họa sĩ.'),
  example(3, 'panzi', '盘子在桌子上。', 'pánzi zài zhuōzi shang.', 'Cái đĩa ở trên bàn.'),
  example(3, 'yibian', '他一边走一边唱歌。', 'tā yìbiān zǒu yìbiān chàng gē.', 'Anh ấy vừa đi vừa hát.'),
  example(3, 'liaotianr', '我们聊天儿。', 'wǒmen liáotiānr.', 'Chúng tôi trò chuyện.'),
];

export const HSK3_L13_G4_EXAMPLES: Example[] = [
  example(4, 'laizi', '我来自越南。', 'wǒ láizì Yuènán.', 'Tôi đến từ Việt Nam.'),
  example(4, 'fuqi', '他们是夫妻。', 'tāmen shì fūqī.', 'Họ là vợ chồng.'),
  example(4, 'zhidao', '直到十点，我才回家。', 'zhídào shí diǎn, wǒ cái huí jiā.', 'Mãi đến mười giờ tôi mới về nhà.'),
  example(4, 'ditu', '这是一张地图。', 'zhè shì yì zhāng dìtú.', 'Đây là một tấm bản đồ.'),
  example(4, 'dian', '地图上有一个点。', 'dìtú shàng yǒu yí gè diǎn.', 'Trên bản đồ có một điểm.'),
  example(4, 'gandao', '我感到很高兴。', 'wǒ gǎndào hěn gāoxìng.', 'Tôi cảm thấy rất vui.'),
  example(4, 'dongfang', '东方文化很有意思。', 'dōngfāng wénhuà hěn yǒu yìsi.', 'Văn hóa phương Đông rất thú vị.'),
  example(4, 'wenhua', '我喜欢中国文化。', 'wǒ xǐhuān Zhōngguó wénhuà.', 'Tôi thích văn hóa Trung Quốc.'),
  example(4, 'yingguo', '他来自英国。', 'tā láizì Yīngguó.', 'Anh ấy đến từ Vương quốc Anh.'),
];

/** Alias ngắn cho HSK3_L13_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK3_L13_EXAMPLES;
