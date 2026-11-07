/**
 * Dữ liệu khởi đầu: HSK 4 quyển thượng — Bài 8 (40 từ, 4 nhóm: 11+9+9+11).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-thuong (file dữ liệu công khai
 * assets/data/hsk4-shang.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3b).
 * Đối chiếu audit: nhóm 1 = 11, nhóm 2 = 9, nhóm 3 = 9, nhóm 4 = 11 — KHỚP.
 * Thứ tự + ranh giới nhóm theo đúng mảng chỉ mục vocabGroups4 của nguồn.
 * Lưu ý: ranh giới nhóm theo đúng mảng chỉ mục vocabGroups4 của nguồn —
 * KHÔNG phải lát liên tiếp: danh từ riêng 长城 (chỉ mục 38) thuộc nhóm 1
 * (thứ tự 11), 故宫 (chỉ mục 39) thuộc nhóm 4 (thứ tự 11).
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

export const HSK4_SHANG_L8_LESSON: Lesson = {
  id: 'hsk4-shang-l8',
  courseId: 'hsk4-shang',
  number: 8,
  title: '该放松时就放松',
  topic: 'Thư giãn, du lịch & cân bằng cuộc sống',
};

export const HSK4_SHANG_L8_GROUP: LessonGroup = {
  id: 'hsk4-shang-l8-g1',
  lessonId: 'hsk4-shang-l8',
  index: 1,
};

export const HSK4_SHANG_L8_GROUP2: LessonGroup = {
  id: 'hsk4-shang-l8-g2',
  lessonId: 'hsk4-shang-l8',
  index: 2,
};

export const HSK4_SHANG_L8_GROUP3: LessonGroup = {
  id: 'hsk4-shang-l8-g3',
  lessonId: 'hsk4-shang-l8',
  index: 3,
};

export const HSK4_SHANG_L8_GROUP4: LessonGroup = {
  id: 'hsk4-shang-l8-g4',
  lessonId: 'hsk4-shang-l8',
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
    id: `hsk4-shang-l8-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-shang',
    lessonId: 'hsk4-shang-l8',
    groupId: `hsk4-shang-l8-g${group}`,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 11 từ nhóm 1 HSK 4 quyển thượng bài 8, đúng thứ tự nguồn 1..11. */
export const HSK4_SHANG_L8_LEXEMES: Lexeme[] = [
  lexeme(1, 'jinzhang', '紧张', 'jǐnzhāng', 'căng thẳng, hồi hộp', 'Tính từ', 1),
  lexeme(1, 'fangsong', '放松', 'fàngsōng', 'thư giãn, thả lỏng', 'Động từ', 2),
  lexeme(1, 'ya', '呀', 'yā', 'nha, đấy (thán từ cuối câu)', 'Thán từ', 3),
  lexeme(1, 'buguan', '不管', 'bùguǎn', 'dù, bất kể', 'Liên từ', 4),
  lexeme(1, 'jiaoqu', '郊区', 'jiāoqū', 'ngoại ô', 'Danh từ', 5),
  lexeme(1, 'youwan', '游玩', 'yóuwán', 'đi chơi, tham quan vui chơi', 'Động từ', 6),
  lexeme(1, 'zhuyi', '主意', 'zhǔyi', 'ý kiến, cách, chủ ý', 'Danh từ', 7),
  lexeme(1, 'waichu', '外出', 'wàichū', 'ra ngoài, đi ra ngoài', 'Động từ', 8),
  lexeme(1, 'dai', '戴', 'dài', 'đội, đeo (mũ, kính, găng…)', 'Động từ', 9),
  lexeme(1, 'maozi', '帽子', 'màozi', 'mũ, nón', 'Danh từ', 10),
  lexeme(1, 'changcheng', '长城', 'Chángchéng', 'Vạn Lý Trường Thành', 'Danh từ riêng', 11),
];

/** 9 từ nhóm 2 HSK 4 quyển thượng bài 8, đúng thứ tự nguồn. */
export const HSK4_SHANG_L8_G2_LEXEMES: Lexeme[] = [
  lexeme(2, 'xiangmu', '项目', 'xiàngmù', 'hạng mục, dự án, môn (thể thao)', 'Danh từ', 1),
  lexeme(2, 'jiaban', '加班', 'jiābān', 'tăng ca, làm thêm giờ', 'Động từ', 2),
  lexeme(2, 'aoye', '熬夜', 'áoyè', 'thức khuya, thức đêm', 'Động từ', 3),
  lexeme(2, 'fouze', '否则', 'fǒuzé', 'nếu không thì', 'Liên từ', 4),
  lexeme(2, 'shiqu', '失去', 'shīqù', 'mất đi, đánh mất', 'Động từ', 5),
  lexeme(2, 'zhide', '值得', 'zhídé', 'đáng, xứng đáng', 'Động từ', 6),
  lexeme(2, 'zanting', '暂停', 'zàntíng', 'tạm dừng', 'Động từ', 7),
  lexeme(2, 'zhihou', '之后', 'zhīhòu', 'sau, sau khi', 'Danh từ', 8),
  lexeme(2, 'fengjing', '风景', 'fēngjǐng', 'phong cảnh', 'Danh từ', 9),
];

/** 9 từ nhóm 3 HSK 4 quyển thượng bài 8, đúng thứ tự nguồn. */
export const HSK4_SHANG_L8_G3_LEXEMES: Lexeme[] = [
  lexeme(3, 'xiaolv', '效率', 'xiàolǜ', 'hiệu suất, hiệu quả làm việc', 'Danh từ', 1),
  lexeme(3, 'xiajiang', '下降', 'xiàjiàng', 'giảm xuống, hạ xuống', 'Động từ', 2),
  lexeme(3, 'xiangbi', '相比', 'xiāngbǐ', 'so sánh (跟…相比）', 'Động từ', 3),
  lexeme(3, 'yinci', '因此', 'yīncǐ', 'vì vậy, do đó', 'Liên từ', 4),
  lexeme(3, 'tixing', '提醒', 'tíxǐng', 'nhắc nhở', 'Động từ', 5),
  lexeme(3, 'yu', '与', 'yǔ', 'và, với, cùng (văn viết)', 'Giới từ / Liên từ', 6),
  lexeme(3, 'daziran', '大自然', 'dàzìrán', 'thiên nhiên, tự nhiên rộng lớn', 'Danh từ', 7),
  lexeme(3, 'meili', '美丽', 'měilì', 'xinh đẹp, tuyệt đẹp', 'Tính từ', 8),
  lexeme(3, 'jingse', '景色', 'jǐngsè', 'cảnh sắc, cảnh đẹp', 'Danh từ', 9),
];

/** 11 từ nhóm 4 HSK 4 quyển thượng bài 8, đúng thứ tự nguồn. */
export const HSK4_SHANG_L8_G4_LEXEMES: Lexeme[] = [
  lexeme(4, 'shoudu', '首都', 'shǒudū', 'thủ đô', 'Danh từ', 1),
  lexeme(4, 'shiqu', '市区', 'shìqū', 'khu nội thành, trung tâm thành phố', 'Danh từ', 2),
  lexeme(4, 'yanqian', '眼前', 'yǎnqián', 'ngay trước mắt', 'Danh từ', 3),
  lexeme(4, 'meijing', '美景', 'měijǐng', 'cảnh đẹp', 'Danh từ', 4),
  lexeme(4, 'canguan', '参观', 'cānguān', 'tham quan, thăm quan', 'Động từ', 5),
  lexeme(4, 'jingdian', '景点', 'jǐngdiǎn', 'điểm tham quan, thắng cảnh', 'Danh từ', 6),
  lexeme(4, 'jiaotong', '交通', 'jiāotōng', 'giao thông', 'Danh từ', 7),
  lexeme(4, 'chengzuo', '乘坐', 'chéngzuò', 'đi, đón (phương tiện: xe, tàu, máy bay)', 'Động từ', 8),
  lexeme(4, 'shifen', '十分', 'shífēn', 'vô cùng, rất (mức độ cao)', 'Phó từ', 9),
  lexeme(4, 'shijishang', '实际上', 'shíjìshàng', 'trên thực tế', 'Phó từ', 10),
  lexeme(4, 'gugong', '故宫', 'Gùgōng', 'Cố Cung (Tử Cấm Thành, Bắc Kinh)', 'Danh từ riêng', 11),
];

/** Liên kết 40 từ với bài 8, giữ thứ tự nguồn. */
export const HSK4_SHANG_L8_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L8_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l8',
    groupId: 'hsk4-shang-l8-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L8_G2_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L8_G2_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l8',
    groupId: 'hsk4-shang-l8-g2',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L8_G3_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L8_G3_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l8',
    groupId: 'hsk4-shang-l8-g3',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L8_G4_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L8_G4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l8',
    groupId: 'hsk4-shang-l8-g4',
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
    id: `hsk4-shang-l8-g${group}-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-shang-l8-g${group}-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 紧张 "考试前我很紧张。" / kǎoshì qián wǒ hěn jǐnzhāng. / Trước kỳ thi tôi rất căng thẳng.
 * - 放松 "周末我们去放松一下。" / zhōumò wǒmen qù fàngsōng yíxià. / Cuối tuần chúng ta đi thư giãn một chút.
 * - 呀 "今天天气真好呀！" / jīntiān tiānqì zhēn hǎo ya! / Hôm nay thời tiết thật đẹp!
 * - 不管 "不管多忙，我都要休息。" / bùguǎn duō máng, wǒ dōu yào xiūxi. / Dù bận đến đâu, tôi cũng phải nghỉ ngơi.
 * - 郊区 "他住在郊区。" / tā zhù zài jiāoqū. / Anh ấy sống ở ngoại ô.
 * - 游玩 "我们去郊区游玩。" / wǒmen qù jiāoqū yóuwán. / Chúng ta đi chơi ở ngoại ô.
 * - 主意 "你有什么好主意？" / nǐ yǒu shénme hǎo zhǔyi? / Bạn có ý kiến hay nào không?
 * - 外出 "今天不适合外出。" / jīntiān bú shìhé wàichū. / Hôm nay không thích hợp ra ngoài.
 * - 戴 "出门请戴帽子。" / chūmén qǐng dài màozi. / Ra ngoài xin hãy đội mũ.
 * - 帽子 "这顶帽子很好看。" / zhè dǐng màozi hěn hǎokàn. / Chiếc mũ này rất đẹp.
 * - 长城 "我想去看长城。" / wǒ xiǎng qù kàn Chángchéng. / Tôi muốn đi xem Vạn Lý Trường Thành.
 */
export const HSK4_SHANG_L8_EXAMPLES: Example[] = [
  example(1, 'jinzhang', '考试前我很紧张。', 'kǎoshì qián wǒ hěn jǐnzhāng.', 'Trước kỳ thi tôi rất căng thẳng.'),
  example(1, 'fangsong', '周末我们去放松一下。', 'zhōumò wǒmen qù fàngsōng yíxià.', 'Cuối tuần chúng ta đi thư giãn một chút.'),
  example(1, 'ya', '今天天气真好呀！', 'jīntiān tiānqì zhēn hǎo ya!', 'Hôm nay thời tiết thật đẹp!'),
  example(1, 'buguan', '不管多忙，我都要休息。', 'bùguǎn duō máng, wǒ dōu yào xiūxi.', 'Dù bận đến đâu, tôi cũng phải nghỉ ngơi.'),
  example(1, 'jiaoqu', '他住在郊区。', 'tā zhù zài jiāoqū.', 'Anh ấy sống ở ngoại ô.'),
  example(1, 'youwan', '我们去郊区游玩。', 'wǒmen qù jiāoqū yóuwán.', 'Chúng ta đi chơi ở ngoại ô.'),
  example(1, 'zhuyi', '你有什么好主意？', 'nǐ yǒu shénme hǎo zhǔyi?', 'Bạn có ý kiến hay nào không?'),
  example(1, 'waichu', '今天不适合外出。', 'jīntiān bú shìhé wàichū.', 'Hôm nay không thích hợp ra ngoài.'),
  example(1, 'dai', '出门请戴帽子。', 'chūmén qǐng dài màozi.', 'Ra ngoài xin hãy đội mũ.'),
  example(1, 'maozi', '这顶帽子很好看。', 'zhè dǐng màozi hěn hǎokàn.', 'Chiếc mũ này rất đẹp.'),
  example(1, 'changcheng', '我想去看长城。', 'wǒ xiǎng qù kàn Chángchéng.', 'Tôi muốn đi xem Vạn Lý Trường Thành.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 项目 "这个项目下个月开始。" / zhège xiàngmù xià gè yuè kāishǐ. / Dự án này bắt đầu tháng sau.
 * - 加班 "他每天都加班。" / tā měitiān dōu jiābān. / Anh ấy ngày nào cũng tăng ca.
 * - 熬夜 "不要常常熬夜。" / búyào chángcháng áoyè. / Đừng thường xuyên thức khuya.
 * - 否则 "你要休息，否则会生病。" / nǐ yào xiūxi, fǒuzé huì shēng bìng. / Bạn phải nghỉ ngơi, nếu không sẽ bị ốm.
 * - 失去 "不要失去信心。" / búyào shīqù xìnxīn. / Đừng đánh mất niềm tin.
 * - 值得 "这个地方值得去。" / zhège dìfang zhídé qù. / Nơi này đáng đi.
 * - 暂停 "我们暂停一下吧。" / wǒmen zàntíng yíxià ba. / Chúng ta tạm dừng một chút nhé.
 * - 之后 "工作之后，我去跑步。" / gōngzuò zhīhòu, wǒ qù pǎobù. / Sau khi làm việc, tôi đi chạy bộ.
 * - 风景 "这里的风景很美。" / zhèlǐ de fēngjǐng hěn měi. / Phong cảnh ở đây rất đẹp.
 */
export const HSK4_SHANG_L8_G2_EXAMPLES: Example[] = [
  example(2, 'xiangmu', '这个项目下个月开始。', 'zhège xiàngmù xià gè yuè kāishǐ.', 'Dự án này bắt đầu tháng sau.'),
  example(2, 'jiaban', '他每天都加班。', 'tā měitiān dōu jiābān.', 'Anh ấy ngày nào cũng tăng ca.'),
  example(2, 'aoye', '不要常常熬夜。', 'búyào chángcháng áoyè.', 'Đừng thường xuyên thức khuya.'),
  example(2, 'fouze', '你要休息，否则会生病。', 'nǐ yào xiūxi, fǒuzé huì shēng bìng.', 'Bạn phải nghỉ ngơi, nếu không sẽ bị ốm.'),
  example(2, 'shiqu', '不要失去信心。', 'búyào shīqù xìnxīn.', 'Đừng đánh mất niềm tin.'),
  example(2, 'zhide', '这个地方值得去。', 'zhège dìfang zhídé qù.', 'Nơi này đáng đi.'),
  example(2, 'zanting', '我们暂停一下吧。', 'wǒmen zàntíng yíxià ba.', 'Chúng ta tạm dừng một chút nhé.'),
  example(2, 'zhihou', '工作之后，我去跑步。', 'gōngzuò zhīhòu, wǒ qù pǎobù.', 'Sau khi làm việc, tôi đi chạy bộ.'),
  example(2, 'fengjing', '这里的风景很美。', 'zhèlǐ de fēngjǐng hěn měi.', 'Phong cảnh ở đây rất đẹp.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 效率 "休息可以提高效率。" / xiūxi kěyǐ tígāo xiàolǜ. / Nghỉ ngơi có thể nâng cao hiệu suất.
 * - 下降 "他的效率下降了。" / tā de xiàolǜ xiàjiàng le. / Hiệu suất của anh ấy đã giảm xuống.
 * - 相比 "跟去年相比，今年更好。" / gēn qùnián xiāngbǐ, jīnnián gèng hǎo. / So với năm ngoái, năm nay tốt hơn.
 * - 因此 "他很累，因此想休息。" / tā hěn lèi, yīncǐ xiǎng xiūxi. / Anh ấy rất mệt, vì vậy muốn nghỉ ngơi.
 * - 提醒 "谢谢你的提醒。" / xièxie nǐ de tíxǐng. / Cảm ơn lời nhắc nhở của bạn.
 * - 与 "工作与休息都很重要。" / gōngzuò yǔ xiūxi dōu hěn zhòngyào. / Công việc và nghỉ ngơi đều quan trọng.
 * - 大自然 "我喜欢大自然。" / wǒ xǐhuān dàzìrán. / Tôi thích thiên nhiên.
 * - 美丽 "这儿的风景很美丽。" / zhèr de fēngjǐng hěn měilì. / Phong cảnh nơi đây rất đẹp.
 * - 景色 "秋天的景色很美。" / qiūtiān de jǐngsè hěn měi. / Cảnh sắc mùa thu rất đẹp.
 */
export const HSK4_SHANG_L8_G3_EXAMPLES: Example[] = [
  example(3, 'xiaolv', '休息可以提高效率。', 'xiūxi kěyǐ tígāo xiàolǜ.', 'Nghỉ ngơi có thể nâng cao hiệu suất.'),
  example(3, 'xiajiang', '他的效率下降了。', 'tā de xiàolǜ xiàjiàng le.', 'Hiệu suất của anh ấy đã giảm xuống.'),
  example(3, 'xiangbi', '跟去年相比，今年更好。', 'gēn qùnián xiāngbǐ, jīnnián gèng hǎo.', 'So với năm ngoái, năm nay tốt hơn.'),
  example(3, 'yinci', '他很累，因此想休息。', 'tā hěn lèi, yīncǐ xiǎng xiūxi.', 'Anh ấy rất mệt, vì vậy muốn nghỉ ngơi.'),
  example(3, 'tixing', '谢谢你的提醒。', 'xièxie nǐ de tíxǐng.', 'Cảm ơn lời nhắc nhở của bạn.'),
  example(3, 'yu', '工作与休息都很重要。', 'gōngzuò yǔ xiūxi dōu hěn zhòngyào.', 'Công việc và nghỉ ngơi đều quan trọng.'),
  example(3, 'daziran', '我喜欢大自然。', 'wǒ xǐhuān dàzìrán.', 'Tôi thích thiên nhiên.'),
  example(3, 'meili', '这儿的风景很美丽。', 'zhèr de fēngjǐng hěn měilì.', 'Phong cảnh nơi đây rất đẹp.'),
  example(3, 'jingse', '秋天的景色很美。', 'qiūtiān de jǐngsè hěn měi.', 'Cảnh sắc mùa thu rất đẹp.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 首都 "首都是一个国家的政治中心。" / shǒudū shì yí gè guójiā de zhèngzhì zhōngxīn. / Thủ đô là trung tâm chính trị của một quốc gia.
 * - 市区 "他住在市区。" / tā zhù zài shìqū. / Anh ấy sống ở khu nội thành.
 * - 眼前 "美景就在眼前。" / měijǐng jiù zài yǎnqián. / Cảnh đẹp ở ngay trước mắt.
 * - 美景 "这里有很多美景。" / zhèlǐ yǒu hěn duō měijǐng. / Ở đây có rất nhiều cảnh đẹp.
 * - 参观 "明天我们去参观故宫。" / míngtiān wǒmen qù cānguān Gùgōng. / Ngày mai chúng ta đi tham quan Cố Cung.
 * - 景点 "这个景点很有名。" / zhège jǐngdiǎn hěn yǒumíng. / Điểm tham quan này rất nổi tiếng.
 * - 交通 "这里的交通很方便。" / zhèlǐ de jiāotōng hěn fāngbiàn. / Giao thông ở đây rất thuận tiện.
 * - 乘坐 "我们可以乘坐地铁。" / wǒmen kěyǐ chéngzuò dìtiě. / Chúng ta có thể đi tàu điện ngầm.
 * - 十分 "我十分喜欢这里。" / wǒ shífēn xǐhuān zhèlǐ. / Tôi vô cùng thích nơi này.
 * - 实际上 "实际上，他很想去旅行。" / shíjìshàng, tā hěn xiǎng qù lǚxíng. / Trên thực tế, anh ấy rất muốn đi du lịch.
 * - 故宫 "故宫在北京的市中心。" / Gùgōng zài Běijīng de shì zhōngxīn. / Cố Cung ở trung tâm thành phố Bắc Kinh.
 */
export const HSK4_SHANG_L8_G4_EXAMPLES: Example[] = [
  example(4, 'shoudu', '首都是一个国家的政治中心。', 'shǒudū shì yí gè guójiā de zhèngzhì zhōngxīn.', 'Thủ đô là trung tâm chính trị của một quốc gia.'),
  example(4, 'shiqu', '他住在市区。', 'tā zhù zài shìqū.', 'Anh ấy sống ở khu nội thành.'),
  example(4, 'yanqian', '美景就在眼前。', 'měijǐng jiù zài yǎnqián.', 'Cảnh đẹp ở ngay trước mắt.'),
  example(4, 'meijing', '这里有很多美景。', 'zhèlǐ yǒu hěn duō měijǐng.', 'Ở đây có rất nhiều cảnh đẹp.'),
  example(4, 'canguan', '明天我们去参观故宫。', 'míngtiān wǒmen qù cānguān Gùgōng.', 'Ngày mai chúng ta đi tham quan Cố Cung.'),
  example(4, 'jingdian', '这个景点很有名。', 'zhège jǐngdiǎn hěn yǒumíng.', 'Điểm tham quan này rất nổi tiếng.'),
  example(4, 'jiaotong', '这里的交通很方便。', 'zhèlǐ de jiāotōng hěn fāngbiàn.', 'Giao thông ở đây rất thuận tiện.'),
  example(4, 'chengzuo', '我们可以乘坐地铁。', 'wǒmen kěyǐ chéngzuò dìtiě.', 'Chúng ta có thể đi tàu điện ngầm.'),
  example(4, 'shifen', '我十分喜欢这里。', 'wǒ shífēn xǐhuān zhèlǐ.', 'Tôi vô cùng thích nơi này.'),
  example(4, 'shijishang', '实际上，他很想去旅行。', 'shíjìshàng, tā hěn xiǎng qù lǚxíng.', 'Trên thực tế, anh ấy rất muốn đi du lịch.'),
  example(4, 'gugong', '故宫在北京的市中心。', 'Gùgōng zài Běijīng de shì zhōngxīn.', 'Cố Cung ở trung tâm thành phố Bắc Kinh.'),
];

/** Alias ngắn cho HSK4_SHANG_L8_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_SHANG_L8_EXAMPLES;
