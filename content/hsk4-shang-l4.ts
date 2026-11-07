/**
 * Dữ liệu khởi đầu: HSK 4 quyển thượng — Bài 4 (40 từ, 4 nhóm: 9+9+10+12).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-thuong (file dữ liệu công khai
 * assets/data/hsk4-shang.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3b).
 * Đối chiếu audit: nhóm 1 = 9, nhóm 2 = 9, nhóm 3 = 10, nhóm 4 = 12 — KHỚP.
 * Thứ tự + ranh giới nhóm theo đúng file nhóm của nguồn.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép câu ví dụ của nguồn, KHÔNG sao chép toàn văn bài khóa.
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

export const HSK4_SHANG_L4_LESSON: Lesson = {
  id: 'hsk4-shang-l4',
  courseId: 'hsk4-shang',
  number: 4,
  title: '很高兴能帮到你',
  topic: 'Giúp đỡ lẫn nhau & đi lại trong thành phố',
};

export const HSK4_SHANG_L4_GROUP: LessonGroup = {
  id: 'hsk4-shang-l4-g1',
  lessonId: 'hsk4-shang-l4',
  index: 1,
};

export const HSK4_SHANG_L4_GROUP2: LessonGroup = {
  id: 'hsk4-shang-l4-g2',
  lessonId: 'hsk4-shang-l4',
  index: 2,
};

export const HSK4_SHANG_L4_GROUP3: LessonGroup = {
  id: 'hsk4-shang-l4-g3',
  lessonId: 'hsk4-shang-l4',
  index: 3,
};

export const HSK4_SHANG_L4_GROUP4: LessonGroup = {
  id: 'hsk4-shang-l4-g4',
  lessonId: 'hsk4-shang-l4',
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
    id: `hsk4-shang-l4-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-shang',
    lessonId: 'hsk4-shang-l4',
    groupId: `hsk4-shang-l4-g${group}`,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 9 từ nhóm 1 HSK 4 quyển thượng bài 4, đúng thứ tự nguồn. */
export const HSK4_SHANG_L4_LEXEMES: Lexeme[] = [
  lexeme(1, 'a', '啊', 'ā', 'à (thán từ: ngạc nhiên, chợt hiểu)', 'Thán từ', 1),
  lexeme(1, 'ting', '停', 'tíng', 'đỗ, dừng (xe)', 'Động từ', 2),
  lexeme(1, 'jiao', '交', 'jiāo', 'giao, nộp', 'Động từ', 3),
  lexeme(1, 'fei', '费', 'fèi', 'phí, chi phí; tốn (công, sức)', 'Danh từ / Động từ', 4),
  lexeme(1, 'xinhao', '信号', 'xìnhào', 'tín hiệu, sóng', 'Danh từ', 5),
  lexeme(1, 'ganxie', '感谢', 'gǎnxiè', 'cảm ơn, biết ơn', 'Động từ', 6),
  lexeme(1, 'lianxi', '联系', 'liánxì', 'liên lạc, liên hệ', 'Động từ', 7),
  lexeme(1, 'fangshi', '方式', 'fāngshì', 'cách thức, phương thức', 'Danh từ', 8),
  lexeme(1, 'keqi', '客气', 'kèqi', 'khách sáo, lịch sự', 'Động từ / Tính từ', 9),
];

/** 9 từ nhóm 2 HSK 4 quyển thượng bài 4, đúng thứ tự nguồn. */
export const HSK4_SHANG_L4_G2_LEXEMES: Lexeme[] = [
  lexeme(2, 'sheng', '剩', 'shèng', 'thừa, còn lại', 'Động từ', 1),
  lexeme(2, 'ti', '提', 'tí', 'xách, cầm (nâng lên)', 'Động từ', 2),
  lexeme(2, 'daizi', '袋子', 'dàizi', 'túi, bao', 'Danh từ', 3),
  lexeme(2, 'zhong', '重', 'zhòng', 'nặng', 'Tính từ / Danh từ', 4),
  lexeme(2, 'suan', '算', 'suàn', 'tính, tính toán', 'Động từ', 5),
  lexeme(2, 'zaishuo', '再说', 'zàishuō', 'hơn nữa, với lại', 'Liên từ', 6),
  lexeme(2, 'zhijian', '之间', 'zhījiān', 'giữa, trong khoảng (hai điểm/người)', 'Danh từ', 7),
  lexeme(2, 'huxiang', '互相', 'hùxiāng', 'lẫn nhau, qua lại', 'Phó từ', 8),
  lexeme(2, 'xinku', '辛苦', 'xīnkǔ', 'vất vả; (lời cảm ơn) bạn vất vả rồi', 'Động từ / Tính từ', 9),
];

/** 10 từ nhóm 3 HSK 4 quyển thượng bài 4, đúng thứ tự nguồn. */
export const HSK4_SHANG_L4_G3_LEXEMES: Lexeme[] = [
  lexeme(3, 'chuxing', '出行', 'chūxíng', 'đi lại, ra ngoài đi xa', 'Động từ', 1),
  lexeme(3, 'juli', '距离', 'jùlí', 'khoảng cách; cách (xa)', 'Danh từ / Động từ', 2),
  lexeme(3, 'wangwang', '往往', 'wǎngwǎng', 'thường thường, hay (theo quy luật)', 'Phó từ', 3),
  lexeme(3, 'ji', '既', 'jì', 'vừa (trong mẫu 既…又…: vừa… vừa…)', 'Phó từ', 4),
  lexeme(3, 'diandongche', '电动车', 'diàndòngchē', 'xe điện', 'Danh từ', 5),
  lexeme(3, 'sudu', '速度', 'sùdù', 'tốc độ', 'Danh từ', 6),
  lexeme(3, 'chongdian', '充电', 'chōngdiàn', 'sạc điện', 'Động từ', 7),
  lexeme(3, 'liuxing', '流行', 'liúxíng', 'thịnh hành, được ưa chuộng', 'Động từ', 8),
  lexeme(3, 'sheng', '省', 'shěng', 'tiết kiệm; tỉnh (đơn vị hành chính)', 'Động từ', 9),
  lexeme(3, 'liqi', '力气', 'lìqi', 'sức lực', 'Danh từ', 10),
];

/** 12 từ nhóm 4 HSK 4 quyển thượng bài 4, đúng thứ tự nguồn. */
export const HSK4_SHANG_L4_G4_LEXEMES: Lexeme[] = [
  lexeme(4, 'chengke', '乘客', 'chéngkè', 'hành khách', 'Danh từ', 1),
  lexeme(4, 'goumai', '购买', 'gòumǎi', 'mua (trang trọng hơn 买）', 'Động từ', 2),
  lexeme(4, 'shiwu', '食物', 'shíwù', 'thức ăn, thực phẩm', 'Danh từ', 3),
  lexeme(4, 'mianfei', '免费', 'miǎnfèi', 'miễn phí', 'Động từ', 4),
  lexeme(4, 'zaocan', '早餐', 'zǎocān', 'bữa sáng', 'Danh từ', 5),
  lexeme(4, 'laideji', '来得及', 'láidejí', 'kịp, còn đủ thời gian', 'Động từ', 6),
  lexeme(4, 'xianhua', '鲜花', 'xiānhuā', 'hoa tươi', 'Danh từ', 7),
  lexeme(4, 'shunbian', '顺便', 'shùnbiàn', 'nhân tiện, tiện thể', 'Phó từ', 8),
  lexeme(4, 'xinqing', '心情', 'xīnqíng', 'tâm trạng', 'Danh từ', 9),
  lexeme(4, 'gengjia', '更加', 'gèngjiā', 'càng… hơn, càng thêm', 'Phó từ', 10),
  lexeme(4, 'yukuai', '愉快', 'yúkuài', 'vui vẻ, thoải mái', 'Tính từ', 11),
  lexeme(4, 'laibuji', '来不及', 'láibùjí', 'không kịp, không đủ thời gian', 'Cụm từ cố định', 12),
];

/** Liên kết 9 từ với bài 4 (nhóm 1), giữ thứ tự nguồn. */
export const HSK4_SHANG_L4_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l4',
    groupId: 'hsk4-shang-l4-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

/** Liên kết 9 từ với bài 4 (nhóm 2), giữ thứ tự nguồn. */
export const HSK4_SHANG_L4_G2_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L4_G2_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l4',
    groupId: 'hsk4-shang-l4-g2',
    lexemeId: w.id,
    order: w.order,
  }),
);

/** Liên kết 10 từ với bài 4 (nhóm 3), giữ thứ tự nguồn. */
export const HSK4_SHANG_L4_G3_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L4_G3_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l4',
    groupId: 'hsk4-shang-l4-g3',
    lexemeId: w.id,
    order: w.order,
  }),
);

/** Liên kết 12 từ với bài 4 (nhóm 4), giữ thứ tự nguồn. */
export const HSK4_SHANG_L4_G4_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L4_G4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l4',
    groupId: 'hsk4-shang-l4-g4',
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
    id: `hsk4-shang-l4-g${group}-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-shang-l4-g${group}-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 啊 "啊，我想起来了！" / 停 "请把车停在这里。" / 交 "请把作业交给我。" / 费 "停车费是多少？" / 信号 "这里的信号很好。" / 感谢 "我很感谢你的帮助。" / 联系 "我们保持联系。" / 方式 "这是一种新的学习方式。" / 客气 "别客气，这是我应该做的。"
 * - 剩 "还剩多少钱？" / 提 "我帮你提袋子。" / 袋子 "这个袋子很重。" / 重 "这个箱子很重。" / 算 "你算一算多少钱。" / 再说 "今天太晚了，再说我也很累。" / 之间 "我们之间没有秘密。" / 互相 "我们要互相帮助。" / 辛苦 "你辛苦了。"
 * - 出行 "绿色出行很方便。" / 距离 "两地之间的距离很远。" / 往往 "他往往很早就起床。" / 既 "他既会唱歌，又会跳舞。" / 电动车 "我骑电动车去学校。" / 速度 "这辆车速度很快。" / 充电 "我的手机正在充电。" / 流行 "电动车现在很流行。" / 省 "骑电动车很省力气。" / 力气 "我没有力气了。"
 * - 乘客 "车上的乘客很多。" / 购买 "我在网上购买了一本书。" / 食物 "这些食物很新鲜。" / 免费 "这顿早餐是免费的。" / 早餐 "我每天吃早餐。" / 来得及 "快点儿，还来得及。" / 鲜花 "我买了一束鲜花。" / 顺便 "我顺便去买点儿东西。" / 心情 "今天我的心情很好。" / 更加 "他学习更加努力了。" / 愉快 "祝你周末愉快！" / 来不及 "时间不够，我来不及了。"
 */
export const HSK4_SHANG_L4_EXAMPLES: Example[] = [
  example(1, 'a', '啊，我想起来了！', 'ā, wǒ xiǎng qǐlái le!', 'À, tôi nhớ ra rồi!'),
  example(1, 'ting', '请把车停在这里。', 'qǐng bǎ chē tíng zài zhèlǐ.', 'Xin hãy đỗ xe ở đây.'),
  example(1, 'jiao', '请把作业交给我。', 'qǐng bǎ zuòyè jiāo gěi wǒ.', 'Xin hãy nộp bài tập cho tôi.'),
  example(1, 'fei', '停车费是多少？', 'tíngchēfèi shì duōshao?', 'Phí đỗ xe là bao nhiêu?'),
  example(1, 'xinhao', '这里的信号很好。', 'zhèlǐ de xìnhào hěn hǎo.', 'Sóng ở đây rất tốt.'),
  example(1, 'ganxie', '我很感谢你的帮助。', 'wǒ hěn gǎnxiè nǐ de bāngzhù.', 'Tôi rất cảm ơn sự giúp đỡ của bạn.'),
  example(1, 'lianxi', '我们保持联系。', 'wǒmen bǎochí liánxì.', 'Chúng ta giữ liên lạc nhé.'),
  example(1, 'fangshi', '这是一种新的学习方式。', 'zhè shì yì zhǒng xīn de xuéxí fāngshì.', 'Đây là một cách học mới.'),
  example(1, 'keqi', '别客气，这是我应该做的。', 'bié kèqi, zhè shì wǒ yīnggāi zuò de.', 'Đừng khách sáo, đây là việc tôi nên làm.'),
];

export const HSK4_SHANG_L4_G2_EXAMPLES: Example[] = [
  example(2, 'sheng', '还剩多少钱？', 'hái shèng duōshao qián?', 'Còn lại bao nhiêu tiền?'),
  example(2, 'ti', '我帮你提袋子。', 'wǒ bāng nǐ tí dàizi.', 'Tôi giúp bạn xách túi.'),
  example(2, 'daizi', '这个袋子很重。', 'zhège dàizi hěn zhòng.', 'Cái túi này rất nặng.'),
  example(2, 'zhong', '这个箱子很重。', 'zhège xiāngzi hěn zhòng.', 'Cái thùng này rất nặng.'),
  example(2, 'suan', '你算一算多少钱。', 'nǐ suàn yí suàn duōshao qián.', 'Bạn tính xem bao nhiêu tiền.'),
  example(2, 'zaishuo', '今天太晚了，再说我也很累。', 'jīntiān tài wǎn le, zàishuō wǒ yě hěn lèi.', 'Hôm nay muộn quá, hơn nữa tôi cũng rất mệt.'),
  example(2, 'zhijian', '我们之间没有秘密。', 'wǒmen zhījiān méiyǒu mìmì.', 'Giữa chúng tôi không có bí mật.'),
  example(2, 'huxiang', '我们要互相帮助。', 'wǒmen yào hùxiāng bāngzhù.', 'Chúng ta phải giúp đỡ lẫn nhau.'),
  example(2, 'xinku', '你辛苦了。', 'nǐ xīnkǔ le.', 'Bạn vất vả rồi.'),
];

export const HSK4_SHANG_L4_G3_EXAMPLES: Example[] = [
  example(3, 'chuxing', '绿色出行很方便。', 'lǜsè chūxíng hěn fāngbiàn.', 'Đi lại xanh rất tiện lợi.'),
  example(3, 'juli', '两地之间的距离很远。', 'liǎng dì zhījiān de jùlí hěn yuǎn.', 'Khoảng cách giữa hai nơi rất xa.'),
  example(3, 'wangwang', '他往往很早就起床。', 'tā wǎngwǎng hěn zǎo jiù qǐchuáng.', 'Anh ấy thường dậy rất sớm.'),
  example(3, 'ji', '他既会唱歌，又会跳舞。', 'tā jì huì chànggē, yòu huì tiàowǔ.', 'Anh ấy vừa biết hát vừa biết nhảy.'),
  example(3, 'diandongche', '我骑电动车去学校。', 'wǒ qí diàndòngchē qù xuéxiào.', 'Tôi đi xe điện đến trường.'),
  example(3, 'sudu', '这辆车速度很快。', 'zhè liàng chē sùdù hěn kuài.', 'Chiếc xe này tốc độ rất nhanh.'),
  example(3, 'chongdian', '我的手机正在充电。', 'wǒ de shǒujī zhèngzài chōngdiàn.', 'Điện thoại của tôi đang sạc.'),
  example(3, 'liuxing', '电动车现在很流行。', 'diàndòngchē xiànzài hěn liúxíng.', 'Xe điện bây giờ rất thịnh hành.'),
  example(3, 'sheng', '骑电动车很省力气。', 'qí diàndòngchē hěn shěng lìqi.', 'Đi xe điện rất tiết kiệm sức.'),
  example(3, 'liqi', '我没有力气了。', 'wǒ méiyǒu lìqi le.', 'Tôi hết sức rồi.'),
];

export const HSK4_SHANG_L4_G4_EXAMPLES: Example[] = [
  example(4, 'chengke', '车上的乘客很多。', 'chē shàng de chéngkè hěn duō.', 'Hành khách trên xe rất đông.'),
  example(4, 'goumai', '我在网上购买了一本书。', 'wǒ zài wǎngshàng gòumǎi le yì běn shū.', 'Tôi đã mua một cuốn sách trên mạng.'),
  example(4, 'shiwu', '这些食物很新鲜。', 'zhèxiē shíwù hěn xīnxiān.', 'Những thức ăn này rất tươi.'),
  example(4, 'mianfei', '这顿早餐是免费的。', 'zhè dùn zǎocān shì miǎnfèi de.', 'Bữa sáng này miễn phí.'),
  example(4, 'zaocan', '我每天吃早餐。', 'wǒ měitiān chī zǎocān.', 'Tôi ăn sáng mỗi ngày.'),
  example(4, 'laideji', '快点儿，还来得及。', 'kuài diǎnr, hái láidejí.', 'Nhanh lên, vẫn còn kịp.'),
  example(4, 'xianhua', '我买了一束鲜花。', 'wǒ mǎi le yí shù xiānhuā.', 'Tôi đã mua một bó hoa tươi.'),
  example(4, 'shunbian', '我顺便去买点儿东西。', 'wǒ shùnbiàn qù mǎi diǎnr dōngxi.', 'Tôi nhân tiện đi mua ít đồ.'),
  example(4, 'xinqing', '今天我的心情很好。', 'jīntiān wǒ de xīnqíng hěn hǎo.', 'Hôm nay tâm trạng của tôi rất tốt.'),
  example(4, 'gengjia', '他学习更加努力了。', 'tā xuéxí gèngjiā nǔlì le.', 'Anh ấy học tập càng chăm chỉ hơn.'),
  example(4, 'yukuai', '祝你周末愉快！', 'zhù nǐ zhōumò yúkuài!', 'Chúc bạn cuối tuần vui vẻ!'),
  example(4, 'laibuji', '时间不够，我来不及了。', 'shíjiān bú gòu, wǒ láibùjí le.', 'Không đủ thời gian, tôi không kịp nữa rồi.'),
];

/** Alias ngắn cho HSK4_SHANG_L4_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_SHANG_L4_EXAMPLES;
