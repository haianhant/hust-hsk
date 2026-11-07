/**
 * Dữ liệu khởi đầu: HSK 4 quyển thượng — Bài 1 (40 từ, 4 nhóm: 7+11+12+10).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-thuong (file dữ liệu công khai
 * assets/data/hsk4-shang.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3b).
 * Đối chiếu audit: nhóm 1 = 7, nhóm 2 = 11, nhóm 3 = 12, nhóm 4 = 10 — KHỚP.
 * Lưu ý: 证 (chỉ mục 5) đứng một mình không tự nhiên nên ví dụ dùng trong
 * từ ghép 学生证 — theo tiền lệ 室 → 会议室 ở HSK 3 bài 11.
 * Thứ tự + ranh giới nhóm theo đúng file nhóm của nguồn.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép câu ví dụ của nguồn, KHÔNG sao chép toàn văn bài khóa.
 */
import type {
  Course,
  Example,
  Lesson,
  LessonGroup,
  LessonVocabulary,
  Lexeme,
} from '../lib/learn/types';

export const HSK4_COURSE: Course = {
  id: 'hsk4',
  title: 'HSK 4',
  level: 'HSK 4',
};

export const HSK4_SHANG_L1_LESSON: Lesson = {
  id: 'hsk4-shang-l1',
  courseId: 'hsk4-shang',
  number: 1,
  title: '我们来中国学习了',
  topic: 'Nhập học, học bổng & đời sống du học sinh',
};

export const HSK4_SHANG_L1_GROUP: LessonGroup = {
  id: 'hsk4-shang-l1-g1',
  lessonId: 'hsk4-shang-l1',
  index: 1,
};

export const HSK4_SHANG_L1_GROUP2: LessonGroup = {
  id: 'hsk4-shang-l1-g2',
  lessonId: 'hsk4-shang-l1',
  index: 2,
};

export const HSK4_SHANG_L1_GROUP3: LessonGroup = {
  id: 'hsk4-shang-l1-g3',
  lessonId: 'hsk4-shang-l1',
  index: 3,
};

export const HSK4_SHANG_L1_GROUP4: LessonGroup = {
  id: 'hsk4-shang-l1-g4',
  lessonId: 'hsk4-shang-l1',
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
    id: `hsk4-shang-l1-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-shang',
    lessonId: 'hsk4-shang-l1',
    groupId: `hsk4-shang-l1-g${group}`,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 7 từ nhóm 1 HSK 4 quyển thượng bài 1, đúng thứ tự nguồn. */
export const HSK4_SHANG_L1_LEXEMES: Lexeme[] = [
  lexeme(1, 'qianzheng', '签证', 'qiānzhèng', 'thị thực, visa', 'Danh từ', 1),
  lexeme(1, 'ruxue', '入学', 'rùxué', 'nhập học', 'Động từ', 2),
  lexeme(1, 'tongzhi', '通知', 'tōngzhī', 'thông báo; thông báo (cho ai)', 'Động từ / Danh từ', 3),
  lexeme(1, 'zhengjian', '证件', 'zhèngjiàn', 'giấy tờ tùy thân', 'Danh từ', 4),
  lexeme(1, 'cailiao', '材料', 'cáiliào', 'tài liệu, hồ sơ', 'Danh từ', 5),
  lexeme(1, 'zheng', '证', 'zhèng', 'giấy chứng nhận, thẻ (chứng)', 'Danh từ', 6),
  lexeme(1, 'renhe', '任何', 'rènhé', 'bất kỳ, bất cứ', 'Đại từ', 7),
];

/** 11 từ nhóm 2 HSK 4 quyển thượng bài 1, đúng thứ tự nguồn. */
export const HSK4_SHANG_L1_G2_LEXEMES: Lexeme[] = [
  lexeme(2, 'shitang', '食堂', 'shítáng', 'nhà ăn (căng-tin trường)', 'Danh từ', 1),
  lexeme(2, 'zuo', '座', 'zuò', '(lượng từ) tòa, ngôi — dùng cho tòa nhà, núi', 'Lượng từ', 2),
  lexeme(2, 'shenqing', '申请', 'shēnqǐng', 'xin, đăng ký, nộp đơn', 'Động từ', 3),
  lexeme(2, 'jiangxuejin', '奖学金', 'jiǎngxuéjīn', 'học bổng', 'Danh từ', 4),
  lexeme(2, 'biaoxian', '表现', 'biǎoxiàn', 'thể hiện, biểu hiện', 'Động từ', 5),
  lexeme(2, 'huode', '获得', 'huòdé', 'đạt được, nhận được', 'Động từ', 6),
  lexeme(2, 'yaoshi', '要是', 'yàoshi', 'nếu, nếu như', 'Liên từ', 7),
  lexeme(2, 'jianqing', '减轻', 'jiǎnqīng', 'giảm bớt, làm nhẹ đi', 'Động từ', 8),
  lexeme(2, 'jingji', '经济', 'jīngjì', 'kinh tế', 'Danh từ', 9),
  lexeme(2, 'yali', '压力', 'yālì', 'áp lực', 'Danh từ', 10),
  lexeme(2, 'jiayou', '加油', 'jiāyóu', 'cố lên', 'Động từ', 11),
];

/** 12 từ nhóm 3 HSK 4 quyển thượng bài 1, đúng thứ tự nguồn. */
export const HSK4_SHANG_L1_G3_LEXEMES: Lexeme[] = [
  lexeme(3, 'suizhe', '随着', 'suízhe', 'cùng với (sự thay đổi)', 'Giới từ', 1),
  lexeme(3, 'kecheng', '课程', 'kèchéng', 'khóa học, chương trình học', 'Danh từ', 2),
  lexeme(3, 'zhuanye', '专业', 'zhuānyè', 'chuyên ngành; chuyên nghiệp', 'Danh từ / Tính từ', 3),
  lexeme(3, 'benke', '本科', 'běnkē', 'bậc đại học (cử nhân)', 'Danh từ', 4),
  lexeme(3, 'shuoshi', '硕士', 'shuòshì', 'thạc sĩ', 'Danh từ', 5),
  lexeme(3, 'yanjiusheng', '研究生', 'yánjiūshēng', 'học viên cao học (thạc sĩ/tiến sĩ)', 'Danh từ', 6),
  lexeme(3, 'boshi', '博士', 'bóshì', 'tiến sĩ', 'Danh từ', 7),
  lexeme(3, 'yanjiu', '研究', 'yánjiū', 'nghiên cứu', 'Động từ', 8),
  lexeme(3, 'huodong', '活动', 'huódòng', 'hoạt động', 'Danh từ / Động từ', 9),
  lexeme(3, 'tongguo', '通过', 'tōngguò', 'thông qua, qua; đỗ (kỳ thi)', 'Giới từ / Động từ', 10),
  lexeme(3, 'jiaoliu', '交流', 'jiāoliú', 'giao lưu, trao đổi', 'Động từ', 11),
  lexeme(3, 'shiying', '适应', 'shìyìng', 'thích nghi, thích ứng', 'Động từ', 12),
];

/** 10 từ nhóm 4 HSK 4 quyển thượng bài 1, đúng thứ tự nguồn. */
export const HSK4_SHANG_L1_G4_LEXEMES: Lexeme[] = [
  lexeme(4, 'jianglai', '将来', 'jiānglái', 'tương lai, sau này', 'Danh từ', 1),
  lexeme(4, 'guoji', '国际', 'guójì', 'quốc tế', 'Tính từ / Danh từ', 2),
  lexeme(4, 'dang', '当', 'dāng', 'làm, đảm nhiệm (nghề/chức vụ)', 'Động từ', 3),
  lexeme(4, 'jiaoyu', '教育', 'jiàoyù', 'giáo dục; giáo dục (ai)', 'Danh từ / Động từ', 4),
  lexeme(4, 'chengwei', '成为', 'chéngwéi', 'trở thành', 'Động từ', 5),
  lexeme(4, 'jiaoshi', '教师', 'jiàoshī', 'giáo viên (gọi trang trọng)', 'Danh từ', 6),
  lexeme(4, 'maoyi', '贸易', 'màoyì', 'thương mại, mậu dịch', 'Danh từ', 7),
  lexeme(4, 'fangmian', '方面', 'fāngmiàn', 'phương diện, lĩnh vực, mặt', 'Danh từ', 8),
  lexeme(4, 'zhishi', '知识', 'zhīshi', 'kiến thức', 'Danh từ', 9),
  lexeme(4, 'ling', '另', 'lìng', 'khác, nữa (một … khác)', 'Đại từ', 10),
];

/** Liên kết 7 từ với bài 1 (nhóm 1), giữ thứ tự nguồn. */
export const HSK4_SHANG_L1_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L1_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l1',
    groupId: 'hsk4-shang-l1-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

/** Liên kết 11 từ với bài 1 (nhóm 2), giữ thứ tự nguồn. */
export const HSK4_SHANG_L1_G2_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L1_G2_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l1',
    groupId: 'hsk4-shang-l1-g2',
    lexemeId: w.id,
    order: w.order,
  }),
);

/** Liên kết 12 từ với bài 1 (nhóm 3), giữ thứ tự nguồn. */
export const HSK4_SHANG_L1_G3_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L1_G3_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l1',
    groupId: 'hsk4-shang-l1-g3',
    lexemeId: w.id,
    order: w.order,
  }),
);

/** Liên kết 10 từ với bài 1 (nhóm 4), giữ thứ tự nguồn. */
export const HSK4_SHANG_L1_G4_VOCABULARY: LessonVocabulary[] = HSK4_SHANG_L1_G4_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-shang-l1',
    groupId: 'hsk4-shang-l1-g4',
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
    id: `hsk4-shang-l1-g${group}-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-shang-l1-g${group}-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 签证 "我的签证下个月到期。" / 入学 "他九月入学。" / 通知 "学校通知我们明天上课。" / 证件 "请带好你的证件。" / 材料 "我准备好了所有材料。" / 证 "这是我的学生证。" / 任何 "任何问题都可以问我。"
 * - 食堂 "我们在食堂吃饭。" / 座 "学校有一座新图书馆。" / 申请 "我想申请奖学金。" / 奖学金 "他获得了奖学金。" / 表现 "他在课堂上表现很好。" / 获得 "我获得了第一名。" / 要是 "要是不下雨，我们就去爬山。" / 减轻 "奖学金减轻了我的压力。" / 经济 "他学经济专业。" / 压力 "最近我的压力很大。" / 加油 "加油，你一定能成功！"
 * - 随着 "随着时间过去，他慢慢适应了。" / 课程 "这门课程很有意思。" / 专业 "你的专业是什么？" / 本科 "他今年本科毕业。" / 硕士 "她在读硕士。" / 研究生 "他是一名研究生。" / 博士 "我的老师是博士。" / 研究 "他在研究中国文化。" / 活动 "学校有很多活动。" / 通过 "我通过了考试。" / 交流 "我们经常交流学习经验。" / 适应 "我很快适应了新生活。"
 * - 将来 "将来我想当一名教师。" / 国际 "这是一所国际学校。" / 当 "他想当医生。" / 教育 "教育很重要。" / 成为 "他成为了老师。" / 教师 "我的妈妈是一名教师。" / 贸易 "他们做国际贸易。" / 方面 "他在很多方面都很优秀。" / 知识 "读书可以增加知识。" / 另 "请给我另一个杯子。"
 */
export const HSK4_SHANG_L1_EXAMPLES: Example[] = [
  example(1, 'qianzheng', '我的签证下个月到期。', 'wǒ de qiānzhèng xià gè yuè dàoqī.', 'Thị thực của tôi hết hạn vào tháng sau.'),
  example(1, 'ruxue', '他九月入学。', 'tā jiǔ yuè rùxué.', 'Anh ấy nhập học vào tháng Chín.'),
  example(1, 'tongzhi', '学校通知我们明天上课。', 'xuéxiào tōngzhī wǒmen míngtiān shàngkè.', 'Trường thông báo chúng tôi ngày mai đi học.'),
  example(1, 'zhengjian', '请带好你的证件。', 'qǐng dài hǎo nǐ de zhèngjiàn.', 'Xin hãy mang theo giấy tờ tùy thân của bạn.'),
  example(1, 'cailiao', '我准备好了所有材料。', 'wǒ zhǔnbèi hǎo le suǒyǒu cáiliào.', 'Tôi đã chuẩn bị xong mọi tài liệu.'),
  example(1, 'zheng', '这是我的学生证。', 'zhè shì wǒ de xuéshēngzhèng.', 'Đây là thẻ sinh viên của tôi.'),
  example(1, 'renhe', '任何问题都可以问我。', 'rènhé wèntí dōu kěyǐ wèn wǒ.', 'Bất kỳ câu hỏi nào cũng có thể hỏi tôi.'),
];

export const HSK4_SHANG_L1_G2_EXAMPLES: Example[] = [
  example(2, 'shitang', '我们在食堂吃饭。', 'wǒmen zài shítáng chī fàn.', 'Chúng tôi ăn cơm ở nhà ăn.'),
  example(2, 'zuo', '学校有一座新图书馆。', 'xuéxiào yǒu yí zuò xīn túshūguǎn.', 'Trường có một tòa thư viện mới.'),
  example(2, 'shenqing', '我想申请奖学金。', 'wǒ xiǎng shēnqǐng jiǎngxuéjīn.', 'Tôi muốn xin học bổng.'),
  example(2, 'jiangxuejin', '他获得了奖学金。', 'tā huòdé le jiǎngxuéjīn.', 'Anh ấy đã nhận được học bổng.'),
  example(2, 'biaoxian', '他在课堂上表现很好。', 'tā zài kètáng shàng biǎoxiàn hěn hǎo.', 'Anh ấy thể hiện rất tốt trên lớp.'),
  example(2, 'huode', '我获得了第一名。', 'wǒ huòdé le dì yī míng.', 'Tôi đã đạt được hạng nhất.'),
  example(2, 'yaoshi', '要是不下雨，我们就去爬山。', 'yàoshi bú xià yǔ, wǒmen jiù qù pá shān.', 'Nếu không mưa, chúng tôi sẽ đi leo núi.'),
  example(2, 'jianqing', '奖学金减轻了我的压力。', 'jiǎngxuéjīn jiǎnqīng le wǒ de yālì.', 'Học bổng đã giảm bớt áp lực của tôi.'),
  example(2, 'jingji', '他学经济专业。', 'tā xué jīngjì zhuānyè.', 'Anh ấy học chuyên ngành kinh tế.'),
  example(2, 'yali', '最近我的压力很大。', 'zuìjìn wǒ de yālì hěn dà.', 'Gần đây áp lực của tôi rất lớn.'),
  example(2, 'jiayou', '加油，你一定能成功！', 'jiāyóu, nǐ yídìng néng chénggōng!', 'Cố lên, bạn nhất định sẽ thành công!'),
];

export const HSK4_SHANG_L1_G3_EXAMPLES: Example[] = [
  example(3, 'suizhe', '随着时间过去，他慢慢适应了。', 'suízhe shíjiān guòqù, tā mànmàn shìyìng le.', 'Cùng với thời gian trôi qua, anh ấy dần thích nghi.'),
  example(3, 'kecheng', '这门课程很有意思。', 'zhè mén kèchéng hěn yǒu yìsi.', 'Khóa học này rất thú vị.'),
  example(3, 'zhuanye', '你的专业是什么？', 'nǐ de zhuānyè shì shénme?', 'Chuyên ngành của bạn là gì?'),
  example(3, 'benke', '他今年本科毕业。', 'tā jīnnián běnkē bìyè.', 'Anh ấy tốt nghiệp đại học năm nay.'),
  example(3, 'shuoshi', '她在读硕士。', 'tā zài dú shuòshì.', 'Cô ấy đang học thạc sĩ.'),
  example(3, 'yanjiusheng', '他是一名研究生。', 'tā shì yì míng yánjiūshēng.', 'Anh ấy là một học viên cao học.'),
  example(3, 'boshi', '我的老师是博士。', 'wǒ de lǎoshī shì bóshì.', 'Thầy của tôi là tiến sĩ.'),
  example(3, 'yanjiu', '他在研究中国文化。', 'tā zài yánjiū Zhōngguó wénhuà.', 'Anh ấy đang nghiên cứu văn hóa Trung Quốc.'),
  example(3, 'huodong', '学校有很多活动。', 'xuéxiào yǒu hěn duō huódòng.', 'Trường có rất nhiều hoạt động.'),
  example(3, 'tongguo', '我通过了考试。', 'wǒ tōngguò le kǎoshì.', 'Tôi đã đỗ kỳ thi.'),
  example(3, 'jiaoliu', '我们经常交流学习经验。', 'wǒmen jīngcháng jiāoliú xuéxí jīngyàn.', 'Chúng tôi thường xuyên trao đổi kinh nghiệm học tập.'),
  example(3, 'shiying', '我很快适应了新生活。', 'wǒ hěn kuài shìyìng le xīn shēnghuó.', 'Tôi đã nhanh chóng thích nghi với cuộc sống mới.'),
];

export const HSK4_SHANG_L1_G4_EXAMPLES: Example[] = [
  example(4, 'jianglai', '将来我想当一名教师。', 'jiānglái wǒ xiǎng dāng yì míng jiàoshī.', 'Tương lai tôi muốn làm một giáo viên.'),
  example(4, 'guoji', '这是一所国际学校。', 'zhè shì yì suǒ guójì xuéxiào.', 'Đây là một trường quốc tế.'),
  example(4, 'dang', '他想当医生。', 'tā xiǎng dāng yīshēng.', 'Anh ấy muốn làm bác sĩ.'),
  example(4, 'jiaoyu', '教育很重要。', 'jiàoyù hěn zhòngyào.', 'Giáo dục rất quan trọng.'),
  example(4, 'chengwei', '他成为了老师。', 'tā chéngwéi le lǎoshī.', 'Anh ấy đã trở thành thầy giáo.'),
  example(4, 'jiaoshi', '我的妈妈是一名教师。', 'wǒ de māma shì yì míng jiàoshī.', 'Mẹ tôi là một giáo viên.'),
  example(4, 'maoyi', '他们做国际贸易。', 'tāmen zuò guójì màoyì.', 'Họ làm thương mại quốc tế.'),
  example(4, 'fangmian', '他在很多方面都很优秀。', 'tā zài hěn duō fāngmiàn dōu hěn yōuxiù.', 'Anh ấy xuất sắc ở nhiều phương diện.'),
  example(4, 'zhishi', '读书可以增加知识。', 'dú shū kěyǐ zēngjiā zhīshi.', 'Đọc sách có thể tăng thêm kiến thức.'),
  example(4, 'ling', '请给我另一个杯子。', 'qǐng gěi wǒ lìng yí gè bēizi.', 'Xin cho tôi một cái cốc khác.'),
];

/** Alias ngắn cho HSK4_SHANG_L1_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_SHANG_L1_EXAMPLES;
