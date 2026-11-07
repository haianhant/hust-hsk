/**
 * Dữ liệu khởi đầu: HSK 4 quyển thượng — Bài 6 (39 từ, 4 nhóm: 7+9+15+8).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-thuong (file dữ liệu công khai
 * assets/data/hsk4-shang.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3b).
 * Đối chiếu audit: nhóm 1 = 7, nhóm 2 = 9, nhóm 3 = 15, nhóm 4 = 8 — KHỚP.
 * Thứ tự + ranh giới nhóm theo đúng mảng chỉ mục vocabGroups4 của nguồn.
 * Lưu ý ID: trong bài 6 có 2 cặp trùng pinyin bỏ dấu trong cùng một nhóm,
 * nên từ xuất hiện sau dùng hậu tố '2' để ID duy nhất (quy tắc chung vẫn giữ
 * cho mọi từ còn lại): nhóm 3 性 (xìng) = ...-g3-xing, 醒 (xǐng) = ...-g3-xing2;
 * nhóm 4 部 (bù) = ...-g4-bu, 步 (bù) = ...-g4-bu2.
 * (Bài 8 cũng có 失去 shīqù / 市区 shìqū cùng 'shiqu' nhưng khác nhóm
 * nên ID đầy đủ vẫn khác nhau, không cần hậu tố.)
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

export const HSK4_SHANG_L6_LESSON: Lesson = {
  id: 'hsk4-shang-l6',
  courseId: 'hsk4-shang',
  number: 6,
  title: '我陪你去看病',
  topic: 'Khám bệnh, bệnh viện & sức khỏe',
};

export const HSK4_SHANG_L6_GROUP: LessonGroup = {
  id: 'hsk4-shang-l6-g1',
  lessonId: 'hsk4-shang-l6',
  index: 1,
};

export const HSK4_SHANG_L6_GROUP2: LessonGroup = {
  id: 'hsk4-shang-l6-g2',
  lessonId: 'hsk4-shang-l6',
  index: 2,
};

export const HSK4_SHANG_L6_GROUP3: LessonGroup = {
  id: 'hsk4-shang-l6-g3',
  lessonId: 'hsk4-shang-l6',
  index: 3,
};

export const HSK4_SHANG_L6_GROUP4: LessonGroup = {
  id: 'hsk4-shang-l6-g4',
  lessonId: 'hsk4-shang-l6',
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
    id: `hsk4-shang-l6-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-shang',
    lessonId: 'hsk4-shang-l6',
    groupId: `hsk4-shang-l6-g${group}`,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 7 từ nhóm 1 HSK 4 quyển thượng bài 6, đúng thứ tự nguồn 1..7. */
export const HSK4_SHANG_L6_LEXEMES: Lexeme[] = [
  lexeme(1, 'kesou', '咳嗽', 'késou', 'ho', 'Động từ', 1),
  lexeme(1, 'ke', '咳', 'ké', 'ho (đơn âm tiết của 咳嗽）', 'Động từ', 2),
  lexeme(1, 'lihai', '厉害', 'lìhai', 'dữ dội, ghê gớm; lợi hại', 'Tính từ', 3),
  lexeme(1, 'yanzhong', '严重', 'yánzhòng', 'nghiêm trọng', 'Tính từ', 4),
  lexeme(1, 'gankuai', '赶快', 'gǎnkuài', 'mau, nhanh chóng', 'Phó từ', 5),
  lexeme(1, 'pei', '陪', 'péi', 'đi cùng, ở bên cùng', 'Động từ', 6),
  lexeme(1, 'fanyi', '翻译', 'fānyì', 'phiên dịch; người phiên dịch', 'Động từ / Danh từ', 7),
];

/** 9 từ nhóm 2 HSK 4 quyển thượng bài 6, đúng thứ tự nguồn. */
export const HSK4_SHANG_L6_G2_LEXEMES: Lexeme[] = [
  lexeme(2, 'hushi', '护士', 'hùshi', 'y tá, điều dưỡng', 'Danh từ', 1),
  lexeme(2, 'biao', '表', 'biǎo', 'bảng, biểu mẫu; đồng hồ', 'Danh từ', 2),
  lexeme(2, 'xingbie', '性别', 'xìngbié', 'giới tính', 'Danh từ', 3),
  lexeme(2, 'guoji', '国籍', 'guójí', 'quốc tịch', 'Danh từ', 4),
  lexeme(2, 'jiating', '家庭', 'jiātíng', 'gia đình', 'Danh từ', 5),
  lexeme(2, 'dizhi', '地址', 'dìzhǐ', 'địa chỉ', 'Danh từ', 6),
  lexeme(2, 'guahao', '挂号', 'guàhào', 'đăng ký khám, lấy số (khám bệnh)', 'Động từ', 7),
  lexeme(2, 'paidui', '排队', 'páiduì', 'xếp hàng', 'Động từ', 8),
  lexeme(2, 'dating', '大厅', 'dàtīng', 'sảnh lớn, đại sảnh', 'Danh từ', 9),
];

/** 15 từ nhóm 3 HSK 4 quyển thượng bài 6, đúng thứ tự nguồn. */
export const HSK4_SHANG_L6_G3_LEXEMES: Lexeme[] = [
  lexeme(3, 'ouer', '偶尔', "ǒu'ěr", 'thỉnh thoảng, hiếm khi', 'Phó từ / Tính từ', 1),
  lexeme(3, 'shen', '身', 'shēn', 'thân thể; (lượng từ) bộ — dùng cho quần áo cả bộ', 'Danh từ / Lượng từ', 2),
  lexeme(3, 'jieguo', '结果', 'jiéguǒ', 'kết quả; (liên từ) kết quả là', 'Danh từ / Liên từ', 3),
  lexeme(3, 'xing', '性', 'xìng', 'tính, …tính (hậu tố: 可能性， 重要性…)', 'Hậu tố', 4),
  lexeme(3, 'tiwen', '体温', 'tǐwēn', 'thân nhiệt, nhiệt độ cơ thể', 'Danh từ', 5),
  lexeme(3, 'jiang', '降', 'jiàng', 'hạ xuống, giảm xuống', 'Động từ', 6),
  lexeme(3, 'guang', '光', 'guāng', 'ánh sáng; chỉ, mỗi (phó từ)', 'Phó từ', 7),
  lexeme(3, 'dazhen', '打针', 'dǎzhēn', 'tiêm (thuốc)', 'Động từ', 8),
  lexeme(3, 'youxiao', '有效', 'yǒuxiào', 'có hiệu quả', 'Động từ', 9),
  lexeme(3, 'anshi', '按时', 'ànshí', 'đúng giờ, theo đúng lịch', 'Phó từ', 10),
  lexeme(3, 'han', '汗', 'hàn', 'mồ hôi', 'Danh từ', 11),
  lexeme(3, 'xing2', '醒', 'xǐng', 'tỉnh dậy, tỉnh giấc', 'Động từ', 12),
  lexeme(3, 'ganjue', '感觉', 'gǎnjué', 'cảm giác; cảm thấy', 'Động từ / Danh từ', 13),
  lexeme(3, 'di', '低', 'dī', 'thấp', 'Tính từ', 14),
  lexeme(3, 'nanshou', '难受', 'nánshòu', 'khó chịu, mệt (trong người)', 'Tính từ', 15),
];

/** 8 từ nhóm 4 HSK 4 quyển thượng bài 6, đúng thứ tự nguồn. */
export const HSK4_SHANG_L6_G4_LEXEMES: Lexeme[] = [
  lexeme(4, 'tong', '通', 'tōng', 'thông (suốt); gọi (điện) được', 'Động từ', 1),
  lexeme(4, 'guocheng', '过程', 'guòchéng', 'quá trình', 'Danh từ', 2),
  lexeme(4, 'bu', '部', 'bù', 'bộ phận, phần; bộ (cơ quan)', 'Danh từ', 3),
  lexeme(4, 'shoufei', '收费', 'shōufèi', 'thu phí, thu tiền', 'Động từ', 4),
  lexeme(4, 'qingkuang', '情况', 'qíngkuàng', 'tình hình, tình trạng', 'Danh từ', 5),
  lexeme(4, 'hao', '好', 'hǎo', 'để, sao cho (chỉ mục đích); khỏi (bệnh)', 'Động từ', 6),
  lexeme(4, 'zhiliao', '治疗', 'zhìliáo', 'điều trị, chữa trị', 'Động từ', 7),
  lexeme(4, 'bu2', '步', 'bù', 'bước chân', 'Danh từ', 8),
];

/** Liên kết 39 từ với bài 6, giữ thứ tự nguồn. */
export const HSK4_SHANG_L6_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L6_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l6',
    groupId: 'hsk4-shang-l6-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L6_G2_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L6_G2_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l6',
    groupId: 'hsk4-shang-l6-g2',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L6_G3_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L6_G3_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l6',
    groupId: 'hsk4-shang-l6-g3',
    lexemeId: w.id,
    order: w.order,
  }),
);

export const HSK4_SHANG_L6_G4_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L6_G4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l6',
    groupId: 'hsk4-shang-l6-g4',
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
    id: `hsk4-shang-l6-g${group}-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-shang-l6-g${group}-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 咳嗽 "他一直在咳嗽。" / tā yìzhí zài késou. / Anh ấy cứ ho mãi.
 * - 咳 "他咳了几声。" / tā ké le jǐ shēng. / Anh ấy ho vài tiếng.
 * - 厉害 "这次感冒很厉害。" / zhè cì gǎnmào hěn lìhai. / Lần cảm lạnh này rất nặng.
 * - 严重 "他的病不严重。" / tā de bìng bù yánzhòng. / Bệnh của anh ấy không nghiêm trọng.
 * - 赶快 "我们赶快去医院。" / wǒmen gǎnkuài qù yīyuàn. / Chúng ta mau đến bệnh viện.
 * - 陪 "我陪妈妈去看病。" / wǒ péi māmā qù kàn bìng. / Tôi đi khám bệnh cùng mẹ.
 * - 翻译 "她帮我翻译。" / tā bāng wǒ fānyì. / Cô ấy giúp tôi phiên dịch.
 */
export const HSK4_SHANG_L6_EXAMPLES: Example[] = [
  example(1, 'kesou', '他一直在咳嗽。', 'tā yìzhí zài késou.', 'Anh ấy cứ ho mãi.'),
  example(1, 'ke', '他咳了几声。', 'tā ké le jǐ shēng.', 'Anh ấy ho vài tiếng.'),
  example(1, 'lihai', '这次感冒很厉害。', 'zhè cì gǎnmào hěn lìhai.', 'Lần cảm lạnh này rất nặng.'),
  example(1, 'yanzhong', '他的病不严重。', 'tā de bìng bù yánzhòng.', 'Bệnh của anh ấy không nghiêm trọng.'),
  example(1, 'gankuai', '我们赶快去医院。', 'wǒmen gǎnkuài qù yīyuàn.', 'Chúng ta mau đến bệnh viện.'),
  example(1, 'pei', '我陪妈妈去看病。', 'wǒ péi māmā qù kàn bìng.', 'Tôi đi khám bệnh cùng mẹ.'),
  example(1, 'fanyi', '她帮我翻译。', 'tā bāng wǒ fānyì.', 'Cô ấy giúp tôi phiên dịch.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 护士 "护士很细心。" / hùshi hěn xìxīn. / Y tá rất tỉ mỉ.
 * - 表 "请先填这张表。" / qǐng xiān tián zhè zhāng biǎo. / Xin hãy điền tờ đơn này trước.
 * - 性别 "请写上你的性别。" / qǐng xiě shàng nǐ de xìngbié. / Xin hãy ghi giới tính của bạn.
 * - 国籍 "你的国籍是中国吗？" / nǐ de guójí shì Zhōngguó ma? / Quốc tịch của bạn là Trung Quốc phải không?
 * - 家庭 "我的家庭有五口人。" / wǒ de jiātíng yǒu wǔ kǒu rén. / Gia đình tôi có năm người.
 * - 地址 "请告诉我你的地址。" / qǐng gàosu wǒ nǐ de dìzhǐ. / Xin hãy cho tôi biết địa chỉ của bạn.
 * - 挂号 "我去挂号。" / wǒ qù guàhào. / Tôi đi lấy số khám bệnh.
 * - 排队 "大家在排队。" / dàjiā zài páiduì. / Mọi người đang xếp hàng.
 * - 大厅 "大厅里有很多人。" / dàtīng lǐ yǒu hěn duō rén. / Trong sảnh lớn có rất nhiều người.
 */
export const HSK4_SHANG_L6_G2_EXAMPLES: Example[] = [
  example(2, 'hushi', '护士很细心。', 'hùshi hěn xìxīn.', 'Y tá rất tỉ mỉ.'),
  example(2, 'biao', '请先填这张表。', 'qǐng xiān tián zhè zhāng biǎo.', 'Xin hãy điền tờ đơn này trước.'),
  example(2, 'xingbie', '请写上你的性别。', 'qǐng xiě shàng nǐ de xìngbié.', 'Xin hãy ghi giới tính của bạn.'),
  example(2, 'guoji', '你的国籍是中国吗？', 'nǐ de guójí shì Zhōngguó ma?', 'Quốc tịch của bạn là Trung Quốc phải không?'),
  example(2, 'jiating', '我的家庭有五口人。', 'wǒ de jiātíng yǒu wǔ kǒu rén.', 'Gia đình tôi có năm người.'),
  example(2, 'dizhi', '请告诉我你的地址。', 'qǐng gàosu wǒ nǐ de dìzhǐ.', 'Xin hãy cho tôi biết địa chỉ của bạn.'),
  example(2, 'guahao', '我去挂号。', 'wǒ qù guàhào.', 'Tôi đi lấy số khám bệnh.'),
  example(2, 'paidui', '大家在排队。', 'dàjiā zài páiduì.', 'Mọi người đang xếp hàng.'),
  example(2, 'dating', '大厅里有很多人。', 'dàtīng lǐ yǒu hěn duō rén.', 'Trong sảnh lớn có rất nhiều người.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 偶尔 "我偶尔去跑步。" / wǒ ǒu'ěr qù pǎobù. / Thỉnh thoảng tôi đi chạy bộ.
 * - 身 "他身上很热。" / tā shēnshang hěn rè. / Người anh ấy rất nóng.
 * - 结果 "检查的结果很好。" / jiǎnchá de jiéguǒ hěn hǎo. / Kết quả kiểm tra rất tốt.
 * - 性 "今天下雨的可能性不大。" / jīntiān xià yǔ de kěnéngxìng bú dà. / Khả năng hôm nay mưa không lớn.
 * - 体温 "你的体温正常。" / nǐ de tǐwēn zhèngcháng. / Thân nhiệt của bạn bình thường.
 * - 降 "他的体温降了。" / tā de tǐwēn jiàng le. / Thân nhiệt của anh ấy đã hạ xuống.
 * - 光 "他光吃饭，不吃药。" / tā guāng chī fàn, bù chī yào. / Anh ấy chỉ ăn cơm, không uống thuốc.
 * - 打针 "我不怕打针。" / wǒ bú pà dǎzhēn. / Tôi không sợ tiêm.
 * - 有效 "这种药很有效。" / zhè zhǒng yào hěn yǒuxiào. / Loại thuốc này rất hiệu quả.
 * - 按时 "请按时吃药。" / qǐng ànshí chī yào. / Xin hãy uống thuốc đúng giờ.
 * - 汗 "他出了一身汗。" / tā chū le yì shēn hàn. / Anh ấy ra đầy mồ hôi.
 * - 醒 "他醒了。" / tā xǐng le. / Anh ấy đã tỉnh dậy.
 * - 感觉 "我感觉好多了。" / wǒ gǎnjué hǎo duō le. / Tôi cảm thấy đỡ hơn nhiều rồi.
 * - 低 "他的体温有点儿低。" / tā de tǐwēn yǒudiǎnr dī. / Thân nhiệt của anh ấy hơi thấp.
 * - 难受 "我觉得很难受。" / wǒ juéde hěn nánshòu. / Tôi thấy rất khó chịu.
 */
export const HSK4_SHANG_L6_G3_EXAMPLES: Example[] = [
  example(3, 'ouer', '我偶尔去跑步。', "wǒ ǒu'ěr qù pǎobù.", 'Thỉnh thoảng tôi đi chạy bộ.'),
  example(3, 'shen', '他身上很热。', 'tā shēnshang hěn rè.', 'Người anh ấy rất nóng.'),
  example(3, 'jieguo', '检查的结果很好。', 'jiǎnchá de jiéguǒ hěn hǎo.', 'Kết quả kiểm tra rất tốt.'),
  example(3, 'xing', '今天下雨的可能性不大。', 'jīntiān xià yǔ de kěnéngxìng bú dà.', 'Khả năng hôm nay mưa không lớn.'),
  example(3, 'tiwen', '你的体温正常。', 'nǐ de tǐwēn zhèngcháng.', 'Thân nhiệt của bạn bình thường.'),
  example(3, 'jiang', '他的体温降了。', 'tā de tǐwēn jiàng le.', 'Thân nhiệt của anh ấy đã hạ xuống.'),
  example(3, 'guang', '他光吃饭，不吃药。', 'tā guāng chī fàn, bù chī yào.', 'Anh ấy chỉ ăn cơm, không uống thuốc.'),
  example(3, 'dazhen', '我不怕打针。', 'wǒ bú pà dǎzhēn.', 'Tôi không sợ tiêm.'),
  example(3, 'youxiao', '这种药很有效。', 'zhè zhǒng yào hěn yǒuxiào.', 'Loại thuốc này rất hiệu quả.'),
  example(3, 'anshi', '请按时吃药。', 'qǐng ànshí chī yào.', 'Xin hãy uống thuốc đúng giờ.'),
  example(3, 'han', '他出了一身汗。', 'tā chū le yì shēn hàn.', 'Anh ấy ra đầy mồ hôi.'),
  example(3, 'xing2', '他醒了。', 'tā xǐng le.', 'Anh ấy đã tỉnh dậy.'),
  example(3, 'ganjue', '我感觉好多了。', 'wǒ gǎnjué hǎo duō le.', 'Tôi cảm thấy đỡ hơn nhiều rồi.'),
  example(3, 'di', '他的体温有点儿低。', 'tā de tǐwēn yǒudiǎnr dī.', 'Thân nhiệt của anh ấy hơi thấp.'),
  example(3, 'nanshou', '我觉得很难受。', 'wǒ juéde hěn nánshòu.', 'Tôi thấy rất khó chịu.'),
];

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 通 "这个电话打不通。" / zhège diànhuà dǎ bu tōng. / Cuộc điện thoại này gọi không được.
 * - 过程 "看病的过程很快。" / kàn bìng de guòchéng hěn kuài. / Quá trình khám bệnh rất nhanh.
 * - 部 "他在医院的后勤部工作。" / tā zài yīyuàn de hòuqínbù gōngzuò. / Anh ấy làm việc ở bộ phận hậu cần của bệnh viện.
 * - 收费 "这里不收费。" / zhèlǐ bù shōufèi. / Ở đây không thu phí.
 * - 情况 "情况比我想的好。" / qíngkuàng bǐ wǒ xiǎng de hǎo. / Tình hình tốt hơn tôi nghĩ.
 * - 好 "他的病很快就好了。" / tā de bìng hěn kuài jiù hǎo le. / Bệnh của anh ấy khỏi rất nhanh.
 * - 治疗 "医生在治疗他。" / yīshēng zài zhìliáo tā. / Bác sĩ đang điều trị cho anh ấy.
 * - 步 "他每天走很多步。" / tā měitiān zǒu hěn duō bù. / Mỗi ngày anh ấy đi rất nhiều bước.
 */
export const HSK4_SHANG_L6_G4_EXAMPLES: Example[] = [
  example(4, 'tong', '这个电话打不通。', 'zhège diànhuà dǎ bu tōng.', 'Cuộc điện thoại này gọi không được.'),
  example(4, 'guocheng', '看病的过程很快。', 'kàn bìng de guòchéng hěn kuài.', 'Quá trình khám bệnh rất nhanh.'),
  example(4, 'bu', '他在医院的后勤部工作。', 'tā zài yīyuàn de hòuqínbù gōngzuò.', 'Anh ấy làm việc ở bộ phận hậu cần của bệnh viện.'),
  example(4, 'shoufei', '这里不收费。', 'zhèlǐ bù shōufèi.', 'Ở đây không thu phí.'),
  example(4, 'qingkuang', '情况比我想的好。', 'qíngkuàng bǐ wǒ xiǎng de hǎo.', 'Tình hình tốt hơn tôi nghĩ.'),
  example(4, 'hao', '他的病很快就好了。', 'tā de bìng hěn kuài jiù hǎo le.', 'Bệnh của anh ấy khỏi rất nhanh.'),
  example(4, 'zhiliao', '医生在治疗他。', 'yīshēng zài zhìliáo tā.', 'Bác sĩ đang điều trị cho anh ấy.'),
  example(4, 'bu2', '他每天走很多步。', 'tā měitiān zǒu hěn duō bù.', 'Mỗi ngày anh ấy đi rất nhiều bước.'),
];

/** Alias ngắn cho HSK4_SHANG_L6_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_SHANG_L6_EXAMPLES;
