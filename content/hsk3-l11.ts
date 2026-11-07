/**
 * Dữ liệu khởi đầu: HSK 3 — Bài 11 (28 từ, 4 nhóm: 9+6+6+7).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (file dữ liệu công khai
 * assets/data/hsk3-vocabgroups.js + assets/data/hsk3.js, tải về /tmp và
 * đếm trực tiếp 2026-11-06; xem docs/content-audit.md §3a).
 * Đối chiếu audit: nhóm 1 = 9, nhóm 2 = 6, nhóm 3 = 6, nhóm 4 = 7 — KHỚP.
 * Thứ tự + ranh giới nhóm theo đúng file nhóm của nguồn.
 * Lưu ý: nhóm 3 của nguồn gồm cả danh từ riêng 老张 (chỉ mục 27) — giữ
 * đúng thứ tự nguồn, không bỏ từ.
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

export const HSK3_L11_LESSON: Lesson = {
  id: 'hsk3-l11',
  courseId: 'hsk3',
  number: 11,
  title: '看来我没办法解决这个问题',
  topic: 'Công sở & giải quyết vấn đề',
};

export const HSK3_L11_GROUP: LessonGroup = {
  id: 'hsk3-l11-g1',
  lessonId: 'hsk3-l11',
  index: 1,
};

export const HSK3_L11_GROUP2: LessonGroup = {
  id: 'hsk3-l11-g2',
  lessonId: 'hsk3-l11',
  index: 2,
};

export const HSK3_L11_GROUP3: LessonGroup = {
  id: 'hsk3-l11-g3',
  lessonId: 'hsk3-l11',
  index: 3,
};

export const HSK3_L11_GROUP4: LessonGroup = {
  id: 'hsk3-l11-g4',
  lessonId: 'hsk3-l11',
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
    id: `hsk3-l11-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk3',
    lessonId: 'hsk3-l11',
    groupId: `hsk3-l11-g${group}`,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 9 từ nhóm 1 HSK 3 bài 11, đúng thứ tự nguồn 1..9. */
export const HSK3_L11_LEXEMES: Lexeme[] = [
  lexeme(1, 'huiyi', '会议', 'huìyì', 'cuộc họp', 'danh từ', 1),
  lexeme(1, 'jingli', '经理', 'jīnglǐ', 'giám đốc', 'danh từ', 2),
  lexeme(1, 'kaihui', '开会', 'kāihuì', 'họp', 'động từ', 3),
  lexeme(1, 'houtian', '后天', 'hòutiān', 'ngày kia', 'danh từ', 4),
  lexeme(1, 'didian', '地点', 'dìdiǎn', 'địa điểm', 'danh từ', 5),
  lexeme(1, 'shi', '室', 'shì', 'phòng', 'danh từ', 6),
  lexeme(1, 'fa', '发', 'fā', 'gửi', 'động từ', 7),
  lexeme(1, 'bijibendiannao', '笔记本电脑', 'bǐjìběn diànnǎo', 'máy tính xách tay', 'danh từ', 8),
  lexeme(1, 'huozhe', '或者', 'huòzhě', 'hoặc', 'liên từ', 9),
];

/** 6 từ nhóm 2 HSK 3 bài 11, đúng thứ tự nguồn 1..6. */
export const HSK3_L11_G2_LEXEMES: Lexeme[] = [
  lexeme(2, 'shengyin', '声音', 'shēngyīn', 'âm thanh', 'danh từ', 1),
  lexeme(2, 'kanlai', '看来', 'kànlái', 'xem ra, có vẻ như', 'động từ', 2),
  lexeme(2, 'banfa', '办法', 'bànfǎ', 'cách, biện pháp', 'danh từ', 3),
  lexeme(2, 'jiejue', '解决', 'jiějué', 'giải quyết', 'động từ', 4),
  lexeme(2, 'zhineng', '只能', 'zhǐnéng', 'chỉ có thể', 'phó từ', 5),
  lexeme(2, 'bieren', '别人', 'biérén', 'người khác', 'danh từ', 6),
];

/** 6 từ nhóm 3 HSK 3 bài 11, đúng thứ tự nguồn 1..6. */
export const HSK3_L11_G3_LEXEMES: Lexeme[] = [
  lexeme(3, 'qingjia', '请假', 'qǐngjià', 'xin nghỉ', 'động từ', 1),
  lexeme(3, 'tongshi', '同事', 'tóngshì', 'đồng nghiệp', 'danh từ', 2),
  lexeme(3, 'xiujia', '休假', 'xiūjià', 'nghỉ phép', 'động từ', 3),
  lexeme(3, 'pa', '怕', 'pà', 'sợ', 'động từ', 4),
  lexeme(3, 'youxiang', '邮箱', 'yóuxiāng', 'hộp thư điện tử', 'danh từ', 5),
  lexeme(3, 'laozhang', '老张', 'Lǎo Zhāng', 'Lão Trương (cách gọi đồng nghiệp họ Trương)', 'danh từ riêng', 6),
];

/** 7 từ nhóm 4 HSK 3 bài 11, đúng thứ tự nguồn 1..7. */
export const HSK3_L11_G4_LEXEMES: Lexeme[] = [
  lexeme(4, 'yuanyi', '愿意', 'yuànyì', 'sẵn lòng', 'động từ năng nguyện', 1),
  lexeme(4, 'chengshi', '城市', 'chéngshì', 'thành phố', 'danh từ', 2),
  lexeme(4, 'likai', '离开', 'líkāi', 'rời khỏi', 'động từ', 3),
  lexeme(4, 'jihui', '机会', 'jīhuì', 'cơ hội', 'danh từ', 4),
  lexeme(4, 'shenghuo', '生活', 'shēnghuó', 'cuộc sống', 'danh từ / động từ', 5),
  lexeme(4, 'wei', '为', 'wèi', 'vì', 'giới từ', 6),
  lexeme(4, 'huo', '或', 'huò', 'hoặc', 'liên từ', 7),
];

/** Liên kết 28 từ với bài 11, giữ thứ tự nguồn. */
export const HSK3_L11_VOCABULARY: LessonVocabulary[] = HSK3_L11_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l11',
    groupId: 'hsk3-l11-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK3_L11_G2_VOCABULARY: LessonVocabulary[] = HSK3_L11_G2_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l11',
    groupId: 'hsk3-l11-g2',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK3_L11_G3_VOCABULARY: LessonVocabulary[] = HSK3_L11_G3_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l11',
    groupId: 'hsk3-l11-g3',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK3_L11_G4_VOCABULARY: LessonVocabulary[] = HSK3_L11_G4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l11',
    groupId: 'hsk3-l11-g4',
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
    id: `hsk3-l11-g${group}-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk3-l11-g${group}-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 会议 "会议在十点开始。" / 经理 "经理在办公室。" / 开会 "我们今天开会。"
 *   / 后天 "后天我去北京。" / 地点 "会议的地点在哪儿？" / 室 "会议室在三楼。"
 *   （室 đứng một mình không tự nhiên nên dùng trong từ ghép 会议室）
 *   / 发 "我发一封邮件。" / 笔记本电脑 "我的笔记本电脑很新。"
 *   / 或者 "你喝茶或者咖啡？"
 * - 声音 "这个声音很好听。" / 看来 "看来今天要下雨。" / 办法 "我有一个办法。"
 *   / 解决 "我们解决问题。" / 只能 "我只能等他。" / 别人 "别问别人。"
 * - 请假 "我今天请假。" / 同事 "他是我的同事。" / 休假 "下个月我休假。"
 *   / 怕 "我不怕冷。" / 邮箱 "请看你的邮箱。" / 老张 "老张是我的同事。"
 * - 愿意 "我愿意帮助你。" / 城市 "这个城市很大。" / 离开 "他离开了北京。"
 *   / 机会 "这是一个好机会。" / 生活 "我喜欢这里的生活。"
 *   / 为 "我为你高兴。" / 或 "明天或后天都可以。"
 */
export const HSK3_L11_EXAMPLES: Example[] = [
  example(1, 'huiyi', '会议在十点开始。', 'huìyì zài shí diǎn kāishǐ.', 'Cuộc họp bắt đầu lúc mười giờ.'),
  example(1, 'jingli', '经理在办公室。', 'jīnglǐ zài bàngōngshì.', 'Giám đốc ở văn phòng.'),
  example(1, 'kaihui', '我们今天开会。', 'wǒmen jīntiān kāihuì.', 'Hôm nay chúng tôi họp.'),
  example(1, 'houtian', '后天我去北京。', 'hòutiān wǒ qù Běijīng.', 'Ngày kia tôi đi Bắc Kinh.'),
  example(1, 'didian', '会议的地点在哪儿？', 'huìyì de dìdiǎn zài nǎr?', 'Địa điểm cuộc họp ở đâu?'),
  example(1, 'shi', '会议室在三楼。', 'huìyìshì zài sān lóu.', 'Phòng họp ở tầng ba.'),
  example(1, 'fa', '我发一封邮件。', 'wǒ fā yì fēng yóujiàn.', 'Tôi gửi một email.'),
  example(1, 'bijibendiannao', '我的笔记本电脑很新。', 'wǒ de bǐjìběn diànnǎo hěn xīn.', 'Máy tính xách tay của tôi rất mới.'),
  example(1, 'huozhe', '你喝茶或者咖啡？', 'nǐ hē chá huòzhě kāfēi?', 'Bạn uống trà hay cà phê?'),
];

export const HSK3_L11_G2_EXAMPLES: Example[] = [
  example(2, 'shengyin', '这个声音很好听。', 'zhège shēngyīn hěn hǎotīng.', 'Âm thanh này rất hay.'),
  example(2, 'kanlai', '看来今天要下雨。', 'kànlái jīntiān yào xià yǔ.', 'Xem ra hôm nay sẽ mưa.'),
  example(2, 'banfa', '我有一个办法。', 'wǒ yǒu yí gè bànfǎ.', 'Tôi có một cách.'),
  example(2, 'jiejue', '我们解决问题。', 'wǒmen jiějué wèntí.', 'Chúng tôi giải quyết vấn đề.'),
  example(2, 'zhineng', '我只能等他。', 'wǒ zhǐnéng děng tā.', 'Tôi chỉ có thể đợi anh ấy.'),
  example(2, 'bieren', '别问别人。', 'bié wèn biérén.', 'Đừng hỏi người khác.'),
];

export const HSK3_L11_G3_EXAMPLES: Example[] = [
  example(3, 'qingjia', '我今天请假。', 'wǒ jīntiān qǐngjià.', 'Hôm nay tôi xin nghỉ.'),
  example(3, 'tongshi', '他是我的同事。', 'tā shì wǒ de tóngshì.', 'Anh ấy là đồng nghiệp của tôi.'),
  example(3, 'xiujia', '下个月我休假。', 'xià gè yuè wǒ xiūjià.', 'Tháng sau tôi nghỉ phép.'),
  example(3, 'pa', '我不怕冷。', 'wǒ bú pà lěng.', 'Tôi không sợ lạnh.'),
  example(3, 'youxiang', '请看你的邮箱。', 'qǐng kàn nǐ de yóuxiāng.', 'Xin hãy xem hộp thư của bạn.'),
  example(3, 'laozhang', '老张是我的同事。', 'Lǎo Zhāng shì wǒ de tóngshì.', 'Lão Trương là đồng nghiệp của tôi.'),
];

export const HSK3_L11_G4_EXAMPLES: Example[] = [
  example(4, 'yuanyi', '我愿意帮助你。', 'wǒ yuànyì bāngzhù nǐ.', 'Tôi sẵn lòng giúp bạn.'),
  example(4, 'chengshi', '这个城市很大。', 'zhège chéngshì hěn dà.', 'Thành phố này rất lớn.'),
  example(4, 'likai', '他离开了北京。', 'tā líkāi le Běijīng.', 'Anh ấy đã rời khỏi Bắc Kinh.'),
  example(4, 'jihui', '这是一个好机会。', 'zhè shì yí gè hǎo jīhuì.', 'Đây là một cơ hội tốt.'),
  example(4, 'shenghuo', '我喜欢这里的生活。', 'wǒ xǐhuān zhèlǐ de shēnghuó.', 'Tôi thích cuộc sống ở đây.'),
  example(4, 'wei', '我为你高兴。', 'wǒ wèi nǐ gāoxìng.', 'Tôi vui vì bạn.'),
  example(4, 'huo', '明天或后天都可以。', 'míngtiān huò hòutiān dōu kěyǐ.', 'Ngày mai hoặc ngày kia đều được.'),
];

/** Alias ngắn cho HSK3_L11_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK3_L11_EXAMPLES;
