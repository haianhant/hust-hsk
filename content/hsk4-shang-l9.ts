/**
 * Dữ liệu khởi đầu: HSK 4 quyển thượng — Bài 9 (40 từ, 4 nhóm: 10+8+12+10).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-thuong (file dữ liệu công khai
 * assets/data/hsk4-shang.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3b).
 * Đối chiếu audit: nhóm 1 = 10, nhóm 2 = 8, nhóm 3 = 12, nhóm 4 = 10 — KHỚP.
 * Thứ tự + ranh giới nhóm theo đúng mảng chỉ mục vocabGroups4 của nguồn.
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
import { HSK4_COURSE } from './hsk4-shang-l1';

export { HSK4_COURSE };

export const HSK4_SHANG_L9_LESSON: Lesson = {
  id: 'hsk4-shang-l9',
  courseId: 'hsk4-shang',
  number: 9,
  title: '遇见你，刚刚好',
  topic: 'Tình cảm, tình bạn & tính cách con người',
};

export const HSK4_SHANG_L9_GROUP: LessonGroup = {
  id: 'hsk4-shang-l9-g1',
  lessonId: 'hsk4-shang-l9',
  index: 1,
};

export const HSK4_SHANG_L9_GROUP2: LessonGroup = {
  id: 'hsk4-shang-l9-g2',
  lessonId: 'hsk4-shang-l9',
  index: 2,
};

export const HSK4_SHANG_L9_GROUP3: LessonGroup = {
  id: 'hsk4-shang-l9-g3',
  lessonId: 'hsk4-shang-l9',
  index: 3,
};

export const HSK4_SHANG_L9_GROUP4: LessonGroup = {
  id: 'hsk4-shang-l9-g4',
  lessonId: 'hsk4-shang-l9',
  index: 4,
};

const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-thuong';
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
    id: `hsk4-shang-l9-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-shang',
    lessonId: 'hsk4-shang-l9',
    groupId: `hsk4-shang-l9-g${group}`,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 10 từ nhóm 1 HSK 4 quyển thượng bài 9, đúng thứ tự nguồn 1..10. */
export const HSK4_SHANG_L9_LEXEMES: Lexeme[] = [
  lexeme(1, 'zhu', '祝', 'zhù', 'chúc, chúc mừng', 'Động từ', 1),
  lexeme(1, 'qiaokeli', '巧克力', 'qiǎokèlì', 'sô-cô-la', 'Danh từ', 2),
  lexeme(1, 'gandong', '感动', 'gǎndòng', 'cảm động', 'Tính từ / Động từ', 3),
  lexeme(1, 'langman', '浪漫', 'làngmàn', 'lãng mạn', 'Tính từ', 4),
  lexeme(1, 'youmo', '幽默', 'yōumò', 'hài hước, hóm hỉnh', 'Tính từ', 5),
  lexeme(1, 'naixin', '耐心', 'nàixīn', 'kiên nhẫn; sự kiên nhẫn', 'Tính từ / Danh từ', 6),
  lexeme(1, 'xiyin', '吸引', 'xīyǐn', 'hấp dẫn, thu hút', 'Động từ', 7),
  lexeme(1, 'dangshi', '当时', 'dāngshí', 'lúc đó, khi đó', 'Danh từ', 8),
  lexeme(1, 'cuoguo', '错过', 'cuòguò', 'bỏ lỡ, lỡ mất', 'Động từ', 9),
  lexeme(1, 'xingyun', '幸运', 'xìngyùn', 'may mắn', 'Tính từ / Danh từ', 10),
];

/** 8 từ nhóm 2 HSK 4 quyển thượng bài 9, đúng thứ tự nguồn. */
export const HSK4_SHANG_L9_G2_LEXEMES: Lexeme[] = [
  lexeme(2, 'xingfu', '幸福', 'xìngfú', 'hạnh phúc', 'Tính từ / Danh từ', 1),
  lexeme(2, 'jinguan', '尽管', 'jǐnguǎn', 'mặc dù', 'Liên từ', 2),
  lexeme(2, 'xingge', '性格', 'xìnggé', 'tính cách, tính nết', 'Danh từ', 3),
  lexeme(2, 'gongtong', '共同', 'gòngtóng', 'chung, cùng nhau', 'Tính từ', 4),
  lexeme(2, 'zeren', '责任', 'zérèn', 'trách nhiệm', 'Danh từ', 5),
  lexeme(2, 'xianghu', '相互', 'xiānghù', 'lẫn nhau (trang trọng hơn 互相）', 'Phó từ', 6),
  lexeme(2, 'lijie', '理解', 'lǐjiě', 'thấu hiểu, hiểu rõ', 'Động từ', 7),
  lexeme(2, 'zhichi', '支持', 'zhīchí', 'ủng hộ, hỗ trợ', 'Động từ', 8),
];

/** 12 từ nhóm 3 HSK 4 quyển thượng bài 9, đúng thứ tự nguồn. */
export const HSK4_SHANG_L9_G3_LEXEMES: Lexeme[] = [
  lexeme(3, 'yinxiang', '印象', 'yìnxiàng', 'ấn tượng', 'Danh từ', 1),
  lexeme(3, 'shizai', '实在', 'shízài', 'thật thà, thực sự; thực sự là', 'Tính từ / Phó từ', 2),
  lexeme(3, 'yangguang', '阳光', 'yángguāng', 'ánh nắng; tươi sáng, lạc quan (tính cách)', 'Tính từ / Danh từ', 3),
  lexeme(3, 'fuze', '负责', 'fùzé', 'có trách nhiệm; phụ trách', 'Tính từ / Động từ', 4),
  lexeme(3, 'jiji', '积极', 'jījí', 'tích cực, hăng hái', 'Tính từ', 5),
  lexeme(3, 'ci', '此', 'cǐ', 'này (văn viết: 此次， 此人）', 'Đại từ', 6),
  lexeme(3, 'congci', '从此', 'cóngcǐ', 'từ đó, từ nay trở đi', 'Phó từ', 7),
  lexeme(3, 'chansheng', '产生', 'chǎnshēng', 'sinh ra, nảy sinh', 'Động từ', 8),
  lexeme(3, 'aiqing', '爱情', 'àiqíng', 'tình yêu (nam nữ)', 'Danh từ', 9),
  lexeme(3, 'jian', '间', 'jiān', 'khoảng, gian (phòng, giữa hai điểm thời gian)', 'Danh từ', 10),
  lexeme(3, 'youqing', '友情', 'yǒuqíng', 'tình bạn', 'Danh từ', 11),
  lexeme(3, 'meihao', '美好', 'měihǎo', 'tốt đẹp, tươi đẹp', 'Tính từ', 12),
];

/** 10 từ nhóm 4 HSK 4 quyển thượng bài 9, đúng thứ tự nguồn. */
export const HSK4_SHANG_L9_G4_LEXEMES: Lexeme[] = [
  lexeme(4, 'rensheng', '人生', 'rénshēng', 'cuộc đời, nhân sinh', 'Danh từ', 1),
  lexeme(4, 'jingcai', '精彩', 'jīngcǎi', 'đặc sắc, tuyệt vời', 'Tính từ', 2),
  lexeme(4, 'ganqing', '感情', 'gǎnqíng', 'tình cảm', 'Danh từ', 3),
  lexeme(4, 'shen', '深', 'shēn', 'sâu; (màu) đậm, sẫm', 'Tính từ', 4),
  lexeme(4, 'jingying', '经营', 'jīngyíng', 'kinh doanh; vun đắp, gìn giữ (tình cảm)', 'Động từ', 5),
  lexeme(4, 'duifang', '对方', 'duìfāng', 'đối phương, người kia', 'Danh từ', 6),
  lexeme(4, 'ganshou', '感受', 'gǎnshòu', 'cảm nhận, cảm xúc', 'Danh từ / Động từ', 7),
  lexeme(4, 'youqi', '尤其', 'yóuqí', 'nhất là, đặc biệt là', 'Phó từ', 8),
  lexeme(4, 'rizi', '日子', 'rìzi', 'ngày tháng, cuộc sống thường ngày', 'Danh từ', 9),
  lexeme(4, 'conglai', '从来', 'cónglái', 'từ trước đến nay, xưa nay', 'Phó từ', 10),
];

/** Liên kết 40 từ với bài 9, giữ thứ tự nguồn. */
export const HSK4_SHANG_L9_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L9_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l9',
    groupId: 'hsk4-shang-l9-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L9_G2_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L9_G2_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l9',
    groupId: 'hsk4-shang-l9-g2',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L9_G3_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L9_G3_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l9',
    groupId: 'hsk4-shang-l9-g3',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L9_G4_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L9_G4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l9',
    groupId: 'hsk4-shang-l9-g4',
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
    id: `hsk4-shang-l9-g${group}-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-shang-l9-g${group}-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 祝 "祝你生日快乐！" / zhù nǐ shēngrì kuàilè! / Chúc bạn sinh nhật vui vẻ!
 * - 巧克力 "我喜欢吃巧克力。" / wǒ xǐhuān chī qiǎokèlì. / Tôi thích ăn sô-cô-la.
 * - 感动 "他的话让我很感动。" / tā de huà ràng wǒ hěn gǎndòng. / Lời nói của anh ấy khiến tôi rất cảm động.
 * - 浪漫 "这部电影很浪漫。" / zhè bù diànyǐng hěn làngmàn. / Bộ phim này rất lãng mạn.
 * - 幽默 "他是一个幽默的人。" / tā shì yí gè yōumò de rén. / Anh ấy là một người hài hước.
 * - 耐心 "老师对我们很有耐心。" / lǎoshī duì wǒmen hěn yǒu nàixīn. / Thầy cô rất kiên nhẫn với chúng tôi.
 * - 吸引 "这个故事吸引了我。" / zhège gùshi xīyǐn le wǒ. / Câu chuyện này đã thu hút tôi.
 * - 当时 "当时我还很小。" / dāngshí wǒ hái hěn xiǎo. / Lúc đó tôi còn rất nhỏ.
 * - 错过 "别错过这个机会。" / bié cuòguò zhège jīhuì. / Đừng bỏ lỡ cơ hội này.
 * - 幸运 "遇见你，我很幸运。" / yùjiàn nǐ, wǒ hěn xìngyùn. / Gặp được bạn, tôi rất may mắn.
 */
export const HSK4_SHANG_L9_EXAMPLES: Example[] = [
  example(1, 'zhu', '祝你生日快乐！', 'zhù nǐ shēngrì kuàilè!', 'Chúc bạn sinh nhật vui vẻ!'),
  example(1, 'qiaokeli', '我喜欢吃巧克力。', 'wǒ xǐhuān chī qiǎokèlì.', 'Tôi thích ăn sô-cô-la.'),
  example(1, 'gandong', '他的话让我很感动。', 'tā de huà ràng wǒ hěn gǎndòng.', 'Lời nói của anh ấy khiến tôi rất cảm động.'),
  example(1, 'langman', '这部电影很浪漫。', 'zhè bù diànyǐng hěn làngmàn.', 'Bộ phim này rất lãng mạn.'),
  example(1, 'youmo', '他是一个幽默的人。', 'tā shì yí gè yōumò de rén.', 'Anh ấy là một người hài hước.'),
  example(1, 'naixin', '老师对我们很有耐心。', 'lǎoshī duì wǒmen hěn yǒu nàixīn.', 'Thầy cô rất kiên nhẫn với chúng tôi.'),
  example(1, 'xiyin', '这个故事吸引了我。', 'zhège gùshi xīyǐn le wǒ.', 'Câu chuyện này đã thu hút tôi.'),
  example(1, 'dangshi', '当时我还很小。', 'dāngshí wǒ hái hěn xiǎo.', 'Lúc đó tôi còn rất nhỏ.'),
  example(1, 'cuoguo', '别错过这个机会。', 'bié cuòguò zhège jīhuì.', 'Đừng bỏ lỡ cơ hội này.'),
  example(1, 'xingyun', '遇见你，我很幸运。', 'yùjiàn nǐ, wǒ hěn xìngyùn.', 'Gặp được bạn, tôi rất may mắn.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 幸福 "我们生活得很幸福。" / wǒmen shēnghuó de hěn xìngfú. / Chúng tôi sống rất hạnh phúc.
 * - 尽管 "尽管很忙，他还是来了。" / jǐnguǎn hěn máng, tā háishi lái le. / Mặc dù rất bận, anh ấy vẫn đến.
 * - 性格 "她的性格很好。" / tā de xìnggé hěn hǎo. / Tính cách của cô ấy rất tốt.
 * - 共同 "我们有共同的爱好。" / wǒmen yǒu gòngtóng de àihào. / Chúng tôi có sở thích chung.
 * - 责任 "这是我的责任。" / zhè shì wǒ de zérèn. / Đây là trách nhiệm của tôi.
 * - 相互 "朋友要相互帮助。" / péngyou yào xiānghù bāngzhù. / Bạn bè phải giúp đỡ lẫn nhau.
 * - 理解 "我能理解你的心情。" / wǒ néng lǐjiě nǐ de xīnqíng. / Tôi có thể hiểu tâm trạng của bạn.
 * - 支持 "谢谢你的支持。" / xièxie nǐ de zhīchí. / Cảm ơn sự ủng hộ của bạn.
 */
export const HSK4_SHANG_L9_G2_EXAMPLES: Example[] = [
  example(2, 'xingfu', '我们生活得很幸福。', 'wǒmen shēnghuó de hěn xìngfú.', 'Chúng tôi sống rất hạnh phúc.'),
  example(2, 'jinguan', '尽管很忙，他还是来了。', 'jǐnguǎn hěn máng, tā háishi lái le.', 'Mặc dù rất bận, anh ấy vẫn đến.'),
  example(2, 'xingge', '她的性格很好。', 'tā de xìnggé hěn hǎo.', 'Tính cách của cô ấy rất tốt.'),
  example(2, 'gongtong', '我们有共同的爱好。', 'wǒmen yǒu gòngtóng de àihào.', 'Chúng tôi có sở thích chung.'),
  example(2, 'zeren', '这是我的责任。', 'zhè shì wǒ de zérèn.', 'Đây là trách nhiệm của tôi.'),
  example(2, 'xianghu', '朋友要相互帮助。', 'péngyou yào xiānghù bāngzhù.', 'Bạn bè phải giúp đỡ lẫn nhau.'),
  example(2, 'lijie', '我能理解你的心情。', 'wǒ néng lǐjiě nǐ de xīnqíng.', 'Tôi có thể hiểu tâm trạng của bạn.'),
  example(2, 'zhichi', '谢谢你的支持。', 'xièxie nǐ de zhīchí.', 'Cảm ơn sự ủng hộ của bạn.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 印象 "他给我留下了很好的印象。" / tā gěi wǒ liú xià le hěn hǎo de yìnxiàng. / Anh ấy để lại cho tôi ấn tượng rất tốt.
 * - 实在 "他是一个实在的人。" / tā shì yí gè shízài de rén. / Anh ấy là một người thật thà.
 * - 阳光 "她是一个阳光的女孩。" / tā shì yí gè yángguāng de nǚhái. / Cô ấy là một cô gái tươi sáng.
 * - 负责 "他对工作很负责。" / tā duì gōngzuò hěn fùzé. / Anh ấy rất có trách nhiệm với công việc.
 * - 积极 "我们要积极面对生活。" / wǒmen yào jījí miànduì shēnghuó. / Chúng ta phải tích cực đối mặt với cuộc sống.
 * - 此 "此次旅行很愉快。" / cǐ cì lǚxíng hěn yúkuài. / Chuyến du lịch lần này rất vui vẻ.
 * - 从此 "从此，我们成了好朋友。" / cóngcǐ, wǒmen chéng le hǎo péngyou. / Từ đó, chúng tôi trở thành bạn tốt.
 * - 产生 "他们之间产生了爱情。" / tāmen zhījiān chǎnshēng le àiqíng. / Giữa họ đã nảy sinh tình yêu.
 * - 爱情 "爱情需要相互理解。" / àiqíng xūyào xiānghù lǐjiě. / Tình yêu cần sự thấu hiểu lẫn nhau.
 * - 间 "朋友之间要多交流。" / péngyou zhījiān yào duō jiāoliú. / Giữa bạn bè với nhau cần giao lưu nhiều.
 * - 友情 "我们的友情很深。" / wǒmen de yǒuqíng hěn shēn. / Tình bạn của chúng tôi rất sâu đậm.
 * - 美好 "这是一段美好的日子。" / zhè shì yí duàn měihǎo de rìzi. / Đây là một khoảng thời gian tươi đẹp.
 */
export const HSK4_SHANG_L9_G3_EXAMPLES: Example[] = [
  example(3, 'yinxiang', '他给我留下了很好的印象。', 'tā gěi wǒ liú xià le hěn hǎo de yìnxiàng.', 'Anh ấy để lại cho tôi ấn tượng rất tốt.'),
  example(3, 'shizai', '他是一个实在的人。', 'tā shì yí gè shízài de rén.', 'Anh ấy là một người thật thà.'),
  example(3, 'yangguang', '她是一个阳光的女孩。', 'tā shì yí gè yángguāng de nǚhái.', 'Cô ấy là một cô gái tươi sáng.'),
  example(3, 'fuze', '他对工作很负责。', 'tā duì gōngzuò hěn fùzé.', 'Anh ấy rất có trách nhiệm với công việc.'),
  example(3, 'jiji', '我们要积极面对生活。', 'wǒmen yào jījí miànduì shēnghuó.', 'Chúng ta phải tích cực đối mặt với cuộc sống.'),
  example(3, 'ci', '此次旅行很愉快。', 'cǐ cì lǚxíng hěn yúkuài.', 'Chuyến du lịch lần này rất vui vẻ.'),
  example(3, 'congci', '从此，我们成了好朋友。', 'cóngcǐ, wǒmen chéng le hǎo péngyou.', 'Từ đó, chúng tôi trở thành bạn tốt.'),
  example(3, 'chansheng', '他们之间产生了爱情。', 'tāmen zhījiān chǎnshēng le àiqíng.', 'Giữa họ đã nảy sinh tình yêu.'),
  example(3, 'aiqing', '爱情需要相互理解。', 'àiqíng xūyào xiānghù lǐjiě.', 'Tình yêu cần sự thấu hiểu lẫn nhau.'),
  example(3, 'jian', '朋友之间要多交流。', 'péngyou zhījiān yào duō jiāoliú.', 'Giữa bạn bè với nhau cần giao lưu nhiều.'),
  example(3, 'youqing', '我们的友情很深。', 'wǒmen de yǒuqíng hěn shēn.', 'Tình bạn của chúng tôi rất sâu đậm.'),
  example(3, 'meihao', '这是一段美好的日子。', 'zhè shì yí duàn měihǎo de rìzi.', 'Đây là một khoảng thời gian tươi đẹp.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 人生 "人生有很多可能。" / rénshēng yǒu hěn duō kěnéng. / Cuộc đời có rất nhiều khả năng.
 * - 精彩 "这场比赛很精彩。" / zhè chǎng bǐsài hěn jīngcǎi. / Trận đấu này rất đặc sắc.
 * - 感情 "他们的感情很好。" / tāmen de gǎnqíng hěn hǎo. / Tình cảm của họ rất tốt.
 * - 深 "这条河很深。" / zhè tiáo hé hěn shēn. / Con sông này rất sâu.
 * - 经营 "友情也需要经营。" / yǒuqíng yě xūyào jīngyíng. / Tình bạn cũng cần vun đắp.
 * - 对方 "要多为对方想一想。" / yào duō wèi duìfāng xiǎng yì xiǎng. / Hãy nghĩ nhiều hơn cho đối phương.
 * - 感受 "你有什么感受？" / nǐ yǒu shénme gǎnshòu? / Bạn có cảm nhận gì?
 * - 尤其 "我喜欢吃水果，尤其喜欢苹果。" / wǒ xǐhuān chī shuǐguǒ, yóuqí xǐhuān píngguǒ. / Tôi thích ăn trái cây, nhất là thích táo.
 * - 日子 "这样的日子真好。" / zhèyàng de rìzi zhēn hǎo. / Những ngày tháng như thế này thật tốt.
 * - 从来 "我从来没有去过中国。" / wǒ cónglái méiyǒu qù guò Zhōngguó. / Tôi chưa bao giờ đến Trung Quốc.
 */
export const HSK4_SHANG_L9_G4_EXAMPLES: Example[] = [
  example(4, 'rensheng', '人生有很多可能。', 'rénshēng yǒu hěn duō kěnéng.', 'Cuộc đời có rất nhiều khả năng.'),
  example(4, 'jingcai', '这场比赛很精彩。', 'zhè chǎng bǐsài hěn jīngcǎi.', 'Trận đấu này rất đặc sắc.'),
  example(4, 'ganqing', '他们的感情很好。', 'tāmen de gǎnqíng hěn hǎo.', 'Tình cảm của họ rất tốt.'),
  example(4, 'shen', '这条河很深。', 'zhè tiáo hé hěn shēn.', 'Con sông này rất sâu.'),
  example(4, 'jingying', '友情也需要经营。', 'yǒuqíng yě xūyào jīngyíng.', 'Tình bạn cũng cần vun đắp.'),
  example(4, 'duifang', '要多为对方想一想。', 'yào duō wèi duìfāng xiǎng yì xiǎng.', 'Hãy nghĩ nhiều hơn cho đối phương.'),
  example(4, 'ganshou', '你有什么感受？', 'nǐ yǒu shénme gǎnshòu?', 'Bạn có cảm nhận gì?'),
  example(4, 'youqi', '我喜欢吃水果，尤其喜欢苹果。', 'wǒ xǐhuān chī shuǐguǒ, yóuqí xǐhuān píngguǒ.', 'Tôi thích ăn trái cây, nhất là thích táo.'),
  example(4, 'rizi', '这样的日子真好。', 'zhèyàng de rìzi zhēn hǎo.', 'Những ngày tháng như thế này thật tốt.'),
  example(4, 'conglai', '我从来没有去过中国。', 'wǒ cónglái méiyǒu qù guò Zhōngguó.', 'Tôi chưa bao giờ đến Trung Quốc.'),
];

/** Alias ngắn cho HSK4_SHANG_L9_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_SHANG_L9_EXAMPLES;
