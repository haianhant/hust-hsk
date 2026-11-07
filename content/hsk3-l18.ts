/**
 * Dữ liệu: HSK 3 — Bài 18 (29 từ, 4 nhóm 7+8+7+7).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (kiểm chứng 2026-11-06,
 * xem docs/content-audit.md §3a: bài 18 có 29 từ, nhóm 7+8+7+7).
 * Thứ tự + ranh giới nhóm theo bảng 生词 (file hsk3-vocabgroups.js công khai);
 * Bài 18 nhóm 1 có 春节 — từ do web nguồn tự thêm (cô Hà Hằng không đánh số),
 * giữ ở nhóm 1 theo chủ đề bài; xem ghi chú trong file hsk3-vocabgroups.js.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép câu ví dụ của site nguồn hay toàn văn bài khóa.
 */
import { HSK3_COURSE } from './hsk3-l10';
import type {
  Example,
  Lesson,
  LessonGroup,
  LessonVocabulary,
  Lexeme,
} from '../lib/learn/types';

export { HSK3_COURSE };

export const HSK3_L18_LESSON: Lesson = {
  id: 'hsk3-l18',
  courseId: 'hsk3',
  number: 18,
  title: "我学会了包饺子",
  topic: "Tết & gia đình",
};

export const HSK3_L18_GROUP1: LessonGroup = {
  id: 'hsk3-l18-g1',
  lessonId: 'hsk3-l18',
  index: 1,
};

export const HSK3_L18_GROUP2: LessonGroup = {
  id: 'hsk3-l18-g2',
  lessonId: 'hsk3-l18',
  index: 2,
};

export const HSK3_L18_GROUP3: LessonGroup = {
  id: 'hsk3-l18-g3',
  lessonId: 'hsk3-l18',
  index: 3,
};

export const HSK3_L18_GROUP4: LessonGroup = {
  id: 'hsk3-l18-g4',
  lessonId: 'hsk3-l18',
  index: 4,
};

export const HSK3_L18_GROUPS: LessonGroup[] = [
  HSK3_L18_GROUP1,
  HSK3_L18_GROUP2,
  HSK3_L18_GROUP3,
  HSK3_L18_GROUP4,
];

const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk3';
const VERIFIED_AT = '2026-11-06';

function lexeme(
  groupId: string,
  idSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
  pos: string,
  order: number,
): Lexeme {
  const group = Number(groupId.slice(-1));
  return {
    id: `hsk3-l18-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk3',
    lessonId: 'hsk3-l18',
    groupId,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 29 từ bài 18, đúng thứ tự nguồn trong từng nhóm. */
export const HSK3_L18_LEXEMES: Lexeme[] = [
  lexeme('hsk3-l18-g1', "zenyang", "怎样", "zěnyàng", "thế nào", "đại từ", 1),
  lexeme('hsk3-l18-g1', "guojie", "过节", "guòjié", "đón lễ", "động từ", 2),
  lexeme('hsk3-l18-g1', "jie", "节", "jié", "lễ, ngày lễ, dịp lễ", "danh từ", 3),
  lexeme('hsk3-l18-g1', "jieri", "节日", "jiérì", "ngày lễ", "danh từ", 4),
  lexeme('hsk3-l18-g1', "lianhuan", "联欢", "liánhuān", "liên hoan, vui chung", "động từ", 5),
  lexeme('hsk3-l18-g1', "dagai", "大概", "dàgài", "khoảng, đại khái; có lẽ", "phó từ", 6),
  lexeme('hsk3-l18-g1', "chunjie", "春节", "chūnjié", "Tết Nguyên đán", "tên riêng", 7),
  lexeme('hsk3-l18-g2', "ayi", "阿姨", "āyí", "cô, dì", "danh từ", 1),
  lexeme('hsk3-l18-g2', "shushu", "叔叔", "shūshu", "chú, bác trai", "danh từ", 2),
  lexeme('hsk3-l18-g2', "shou", "收", "shōu", "nhận; thu, cất", "động từ", 3),
  lexeme('hsk3-l18-g2', "zong", "总", "zǒng", "luôn, cứ", "phó từ", 4),
  lexeme('hsk3-l18-g2', "qi", "起", "qǐ", "(sau động từ) nhắc đến; bắt đầu từ", "động từ", 5),
  lexeme('hsk3-l18-g2', "jianmian", "见面", "jiànmiàn", "gặp mặt", "động từ", 6),
  lexeme('hsk3-l18-g2', "kuangquanshui", "矿泉水", "kuàngquánshuǐ", "nước khoáng", "danh từ", 7),
  lexeme('hsk3-l18-g2', "ganggang", "刚刚", "gānggāng", "vừa mới", "phó từ", 8),
  lexeme('hsk3-l18-g3', "chufa", "出发", "chūfā", "xuất phát", "động từ", 1),
  lexeme('hsk3-l18-g3', "bujiu", "不久", "bùjiǔ", "không lâu, chẳng bao lâu", "tính từ", 2),
  lexeme('hsk3-l18-g3', "fasheng", "发生", "fāshēng", "xảy ra", "động từ", 3),
  lexeme('hsk3-l18-g3', "gang", "刚", "gāng", "vừa mới", "phó từ", 4),
  lexeme('hsk3-l18-g3', "zhiyao", "只要", "zhǐyào", "chỉ cần", "liên từ", 5),
  lexeme('hsk3-l18-g3', "xueqi", "学期", "xuéqī", "học kỳ", "danh từ", 6),
  lexeme('hsk3-l18-g3', "biye", "毕业", "bìyè", "tốt nghiệp", "động từ", 7),
  lexeme('hsk3-l18-g4', "chusheng", "出生", "chūshēng", "sinh ra", "động từ", 1),
  lexeme('hsk3-l18-g4', "guoqu", "过去", "guòqù", "quá khứ, trước đây", "danh từ", 2),
  lexeme('hsk3-l18-g4', "dongde", "懂得", "dǒngde", "hiểu, biết được", "động từ", 3),
  lexeme('hsk3-l18-g4', "jianchi", "坚持", "jiānchí", "kiên trì, duy trì", "động từ", 4),
  lexeme('hsk3-l18-g4', "wancheng", "完成", "wánchéng", "hoàn thành", "động từ", 5),
  lexeme('hsk3-l18-g4', "mubiao", "目标", "mùbiāo", "mục tiêu", "danh từ", 6),
  lexeme('hsk3-l18-g4', "fazhan", "发展", "fāzhǎn", "phát triển", "động từ", 7),
];

/** Liên kết 29 từ với bài 18, giữ thứ tự nguồn. */
export const HSK3_L18_VOCABULARY: LessonVocabulary[] = HSK3_L18_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l18',
    groupId: w.groupId,
    lexemeId: w.id,
    order: w.order,
  }),
);

function example(
  lexemeId: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
): Example {
  return {
    id: `${lexemeId}-ex1`,
    lexemeId,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/** Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát. */
export const HSK3_L18_EXAMPLES: Example[] = [
  example("hsk3-l18-g1-zenyang", "你怎样学习汉语？", "nǐ zěnyàng xuéxí Hànyǔ?", "Bạn học tiếng Hán thế nào?"),
  example("hsk3-l18-g1-guojie", "今年我们在北京过节。", "jīnnián wǒmen zài Běijīng guòjié.", "Năm nay chúng tôi đón lễ ở Bắc Kinh."),
  example("hsk3-l18-g1-jie", "今天是什么节？", "jīntiān shì shénme jié?", "Hôm nay là lễ gì?"),
  example("hsk3-l18-g1-jieri", "春节是中国的重要节日。", "Chūnjié shì Zhōngguó de zhòngyào jiérì.", "Tết Nguyên đán là ngày lễ quan trọng của Trung Quốc."),
  example("hsk3-l18-g1-lianhuan", "我们开了一个联欢会。", "wǒmen kāi le yí ge liánhuānhuì.", "Chúng tôi đã tổ chức một buổi liên hoan."),
  example("hsk3-l18-g1-dagai", "大概有三十个人。", "dàgài yǒu sānshí ge rén.", "Khoảng có ba mươi người."),
  example("hsk3-l18-g1-chunjie", "春节我们一家人吃饺子。", "Chūnjié wǒmen yì jiā rén chī jiǎozi.", "Tết Nguyên đán cả nhà chúng tôi ăn sủi cảo."),
  example("hsk3-l18-g2-ayi", "阿姨给我做了饺子。", "āyí gěi wǒ zuò le jiǎozi.", "Cô đã làm sủi cảo cho tôi."),
  example("hsk3-l18-g2-shushu", "叔叔住在北京。", "shūshu zhù zài Běijīng.", "Chú sống ở Bắc Kinh."),
  example("hsk3-l18-g2-shou", "我收到了你的信。", "wǒ shōudào le nǐ de xìn.", "Tôi đã nhận được thư của bạn."),
  example("hsk3-l18-g2-zong", "他总是在学习。", "tā zǒng shì zài xuéxí.", "Anh ấy lúc nào cũng đang học."),
  example("hsk3-l18-g2-qi", "说起饺子，我就想吃。", "shuō qǐ jiǎozi, wǒ jiù xiǎng chī.", "Nhắc đến sủi cảo là tôi muốn ăn."),
  example("hsk3-l18-g2-jianmian", "我们明天见面吧。", "wǒmen míngtiān jiànmiàn ba.", "Ngày mai chúng ta gặp nhau nhé."),
  example("hsk3-l18-g2-kuangquanshui", "请给我一瓶矿泉水。", "qǐng gěi wǒ yì píng kuàngquánshuǐ.", "Xin cho tôi một chai nước khoáng."),
  example("hsk3-l18-g2-ganggang", "我刚刚回到家。", "wǒ gānggāng huí dào jiā.", "Tôi vừa mới về đến nhà."),
  example("hsk3-l18-g3-chufa", "我们明天早上出发。", "wǒmen míngtiān zǎoshang chūfā.", "Sáng mai chúng tôi xuất phát."),
  example("hsk3-l18-g3-bujiu", "不久，他就学会了。", "bùjiǔ, tā jiù xuéhuì le.", "Chẳng bao lâu, anh ấy đã học được."),
  example("hsk3-l18-g3-fasheng", "昨天发生了一件事。", "zuótiān fāshēng le yí jiàn shì.", "Hôm qua đã xảy ra một chuyện."),
  example("hsk3-l18-g3-gang", "我刚吃完饭。", "wǒ gāng chī wán fàn.", "Tôi vừa ăn cơm xong."),
  example("hsk3-l18-g3-zhiyao", "只要努力，就能学会。", "zhǐyào nǔlì, jiù néng xuéhuì.", "Chỉ cần cố gắng là học được."),
  example("hsk3-l18-g3-xueqi", "这学期我学汉语。", "zhè xuéqī wǒ xué Hànyǔ.", "Học kỳ này tôi học tiếng Hán."),
  example("hsk3-l18-g3-biye", "他明年毕业。", "tā míngnián bìyè.", "Anh ấy tốt nghiệp năm sau."),
  example("hsk3-l18-g4-chusheng", "他出生在北京。", "tā chūshēng zài Běijīng.", "Anh ấy sinh ra ở Bắc Kinh."),
  example("hsk3-l18-g4-guoqu", "过去，我不会包饺子。", "guòqù, wǒ bú huì bāo jiǎozi.", "Trước đây, tôi không biết gói sủi cảo."),
  example("hsk3-l18-g4-dongde", "我懂得这个道理。", "wǒ dǒngde zhège dàolǐ.", "Tôi hiểu đạo lý này."),
  example("hsk3-l18-g4-jianchi", "学习汉语要坚持。", "xuéxí Hànyǔ yào jiānchí.", "Học tiếng Hán cần kiên trì."),
  example("hsk3-l18-g4-wancheng", "我完成了作业。", "wǒ wánchéng le zuòyè.", "Tôi đã hoàn thành bài tập."),
  example("hsk3-l18-g4-mubiao", "我的目标是学会汉语。", "wǒ de mùbiāo shì xuéhuì Hànyǔ.", "Mục tiêu của tôi là học được tiếng Hán."),
  example("hsk3-l18-g4-fazhan", "中国发展很快。", "Zhōngguó fāzhǎn hěn kuài.", "Trung Quốc phát triển rất nhanh."),
];

/** Alias ngắn cho HSK3_L18_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK3_L18_EXAMPLES;
