"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_SHANG_L7_G4_EXAMPLES = exports.HSK4_SHANG_L7_G3_EXAMPLES = exports.HSK4_SHANG_L7_G2_EXAMPLES = exports.HSK4_SHANG_L7_EXAMPLES = exports.HSK4_SHANG_L7_G4_VOCABULARY = exports.HSK4_SHANG_L7_G3_VOCABULARY = exports.HSK4_SHANG_L7_G2_VOCABULARY = exports.HSK4_SHANG_L7_VOCABULARY = exports.HSK4_SHANG_L7_G4_LEXEMES = exports.HSK4_SHANG_L7_G3_LEXEMES = exports.HSK4_SHANG_L7_G2_LEXEMES = exports.HSK4_SHANG_L7_LEXEMES = exports.HSK4_SHANG_L7_GROUP4 = exports.HSK4_SHANG_L7_GROUP3 = exports.HSK4_SHANG_L7_GROUP2 = exports.HSK4_SHANG_L7_GROUP = exports.HSK4_SHANG_L7_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_SHANG_L7_LESSON = {
    id: 'hsk4-shang-l7',
    courseId: 'hsk4-shang',
    number: 7,
    title: '在工作中学习',
    topic: 'Công việc, phỏng vấn & kinh nghiệm',
};
exports.HSK4_SHANG_L7_GROUP = {
    id: 'hsk4-shang-l7-g1',
    lessonId: 'hsk4-shang-l7',
    index: 1,
};
exports.HSK4_SHANG_L7_GROUP2 = {
    id: 'hsk4-shang-l7-g2',
    lessonId: 'hsk4-shang-l7',
    index: 2,
};
exports.HSK4_SHANG_L7_GROUP3 = {
    id: 'hsk4-shang-l7-g3',
    lessonId: 'hsk4-shang-l7',
    index: 3,
};
exports.HSK4_SHANG_L7_GROUP4 = {
    id: 'hsk4-shang-l7-g4',
    lessonId: 'hsk4-shang-l7',
    index: 4,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-thuong';
const VERIFIED_AT = '2026-11-06';
function lexeme(group, idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-shang-l7-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-shang',
        lessonId: 'hsk4-shang-l7',
        groupId: `hsk4-shang-l7-g${group}`,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 12 từ nhóm 1 HSK 4 quyển thượng bài 7, đúng thứ tự nguồn 1..12. */
exports.HSK4_SHANG_L7_LEXEMES = [
    lexeme(1, 'darao', '打扰', 'dǎrǎo', 'làm phiền, quấy rầy', 'Động từ', 1),
    lexeme(1, 'shichang', '市场', 'shìchǎng', 'thị trường', 'Danh từ', 2),
    lexeme(1, 'diaocha', '调查', 'diàochá', 'điều tra, khảo sát', 'Động từ', 3),
    lexeme(1, 'jihua', '计划', 'jìhuà', 'kế hoạch; lên kế hoạch', 'Danh từ / Động từ', 4),
    lexeme(1, 'neirong', '内容', 'nèiróng', 'nội dung', 'Danh từ', 5),
    lexeme(1, 'gai', '改', 'gǎi', 'sửa, thay đổi', 'Động từ', 6),
    lexeme(1, 'xixin', '细心', 'xìxīn', 'tỉ mỉ, cẩn thận', 'Tính từ', 7),
    lexeme(1, 'kehu', '客户', 'kèhù', 'khách hàng', 'Danh từ', 8),
    lexeme(1, 'zhenzheng', '真正', 'zhēnzhèng', 'thật sự, thực sự', 'Tính từ / Phó từ', 9),
    lexeme(1, 'xiangfa', '想法', 'xiǎngfǎ', 'suy nghĩ, ý tưởng', 'Danh từ', 10),
    lexeme(1, 'renwu', '任务', 'rènwù', 'nhiệm vụ', 'Danh từ', 11),
    lexeme(1, 'jishi', '及时', 'jíshí', 'kịp thời, đúng lúc', 'Phó từ / Tính từ', 12),
];
/** 8 từ nhóm 2 HSK 4 quyển thượng bài 7, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L7_G2_LEXEMES = [
    lexeme(2, 'chuchai', '出差', 'chūchāi', 'đi công tác', 'Động từ', 1),
    lexeme(2, 'jingyan', '经验', 'jīngyàn', 'kinh nghiệm', 'Danh từ', 2),
    lexeme(2, 'caifang', '采访', 'cǎifǎng', 'phỏng vấn', 'Động từ', 3),
    lexeme(2, 'chanpin', '产品', 'chǎnpǐn', 'sản phẩm', 'Danh từ', 4),
    lexeme(2, 'kanfa', '看法', 'kànfǎ', 'quan điểm, cách nhìn', 'Danh từ', 5),
    lexeme(2, 'tiqian', '提前', 'tíqián', 'sớm hơn, trước thời hạn', 'Động từ', 6),
    lexeme(2, 'bianyu', '便于', 'biànyú', 'thuận tiện cho, dễ dàng cho', 'Động từ', 7),
    lexeme(2, 'jiran', '既然', 'jìrán', 'đã… thì… (tiền đề đã rõ)', 'Liên từ', 8),
];
/** 10 từ nhóm 3 HSK 4 quyển thượng bài 7, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L7_G3_LEXEMES = [
    lexeme(3, 'tan', '谈', 'tán', 'nói chuyện, bàn bạc', 'Động từ', 1),
    lexeme(3, 'bi', '笔', 'bǐ', '(lượng từ) khoản — dùng cho tiền, giao dịch: 一笔钱', 'Lượng từ', 2),
    lexeme(3, 'shengyi', '生意', 'shēngyi', 'việc buôn bán, kinh doanh', 'Danh từ', 3),
    lexeme(3, 'kunnan', '困难', 'kùnnan', 'khó khăn', 'Danh từ / Tính từ', 4),
    lexeme(3, 'youdian', '优点', 'yōudiǎn', 'ưu điểm', 'Danh từ', 5),
    lexeme(3, 'quedian', '缺点', 'quēdiǎn', 'nhược điểm, khuyết điểm', 'Danh từ', 6),
    lexeme(3, 'shiji', '实际', 'shíjì', 'thực tế; thực tế (điều có thật)', 'Tính từ / Danh từ', 7),
    lexeme(3, 'xiaoguo', '效果', 'xiàoguǒ', 'hiệu quả, kết quả', 'Danh từ', 8),
    lexeme(3, 'dian', '点', 'diǎn', 'điểm, ý (khía cạnh: 这一点）', 'Danh từ', 9),
    lexeme(3, 'yixia', '一下', 'yíxià', 'một chút, một lát (sau động từ)', 'Phó từ', 10),
];
/** 9 từ nhóm 4 HSK 4 quyển thượng bài 7, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L7_G4_LEXEMES = [
    lexeme(4, 'fen', '份', 'fèn', '(lượng từ) phần, bản, suất', 'Lượng từ', 1),
    lexeme(4, 'jilei', '积累', 'jīlěi', 'tích lũy, gom góp dần', 'Động từ', 2),
    lexeme(4, 'shi', '使', 'shǐ', 'khiến, làm cho', 'Động từ', 3),
    lexeme(4, 'jinru', '进入', 'jìnrù', 'đi vào, bước vào', 'Động từ', 4),
    lexeme(4, 'shehui', '社会', 'shèhuì', 'xã hội', 'Danh từ', 5),
    lexeme(4, 'guanli', '管理', 'guǎnlǐ', 'quản lý', 'Động từ', 6),
    lexeme(4, 'jichu', '基础', 'jīchǔ', 'nền tảng, cơ sở', 'Danh từ', 7),
    lexeme(4, 'nengli', '能力', 'nénglì', 'năng lực, khả năng', 'Danh từ', 8),
    lexeme(4, 'jinhou', '今后', 'jīnhòu', 'từ nay về sau, sau này', 'Danh từ', 9),
];
/** Liên kết 39 từ với bài 7, giữ thứ tự nguồn. */
exports.HSK4_SHANG_L7_VOCABULARY = exports.HSK4_SHANG_L7_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l7',
    groupId: 'hsk4-shang-l7-g1',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK4_SHANG_L7_G2_VOCABULARY = exports.HSK4_SHANG_L7_G2_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l7',
    groupId: 'hsk4-shang-l7-g2',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK4_SHANG_L7_G3_VOCABULARY = exports.HSK4_SHANG_L7_G3_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l7',
    groupId: 'hsk4-shang-l7-g3',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK4_SHANG_L7_G4_VOCABULARY = exports.HSK4_SHANG_L7_G4_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l7',
    groupId: 'hsk4-shang-l7-g4',
    lexemeId: w.id,
    order: w.order,
}));
function example(group, lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-shang-l7-g${group}-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-shang-l7-g${group}-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 打扰 "对不起，打扰一下。" / duìbuqǐ, dǎrǎo yíxià. / Xin lỗi, làm phiền một chút.
 * - 市场 "这个市场很大。" / zhège shìchǎng hěn dà. / Thị trường này rất lớn.
 * - 调查 "我们在做市场调查。" / wǒmen zài zuò shìchǎng diàochá. / Chúng tôi đang làm khảo sát thị trường.
 * - 计划 "我有一个新计划。" / wǒ yǒu yí gè xīn jìhuà. / Tôi có một kế hoạch mới.
 * - 内容 "这份报告的内容很多。" / zhè fèn bàogào de nèiróng hěn duō. / Nội dung của bản báo cáo này rất nhiều.
 * - 改 "请把这句话改一下。" / qǐng bǎ zhè jù huà gǎi yíxià. / Xin hãy sửa câu này một chút.
 * - 细心 "她工作很细心。" / tā gōngzuò hěn xìxīn. / Cô ấy làm việc rất tỉ mỉ.
 * - 客户 "他是我们的客户。" / tā shì wǒmen de kèhù. / Anh ấy là khách hàng của chúng tôi.
 * - 真正 "这是真正的好产品。" / zhè shì zhēnzhèng de hǎo chǎnpǐn. / Đây là sản phẩm thực sự tốt.
 * - 想法 "你的想法很好。" / nǐ de xiǎngfǎ hěn hǎo. / Ý tưởng của bạn rất hay.
 * - 任务 "今天的任务很多。" / jīntiān de rènwù hěn duō. / Nhiệm vụ hôm nay rất nhiều.
 * - 及时 "请及时告诉我。" / qǐng jíshí gàosu wǒ. / Xin hãy báo cho tôi kịp thời.
 */
exports.HSK4_SHANG_L7_EXAMPLES = [
    example(1, 'darao', '对不起，打扰一下。', 'duìbuqǐ, dǎrǎo yíxià.', 'Xin lỗi, làm phiền một chút.'),
    example(1, 'shichang', '这个市场很大。', 'zhège shìchǎng hěn dà.', 'Thị trường này rất lớn.'),
    example(1, 'diaocha', '我们在做市场调查。', 'wǒmen zài zuò shìchǎng diàochá.', 'Chúng tôi đang làm khảo sát thị trường.'),
    example(1, 'jihua', '我有一个新计划。', 'wǒ yǒu yí gè xīn jìhuà.', 'Tôi có một kế hoạch mới.'),
    example(1, 'neirong', '这份报告的内容很多。', 'zhè fèn bàogào de nèiróng hěn duō.', 'Nội dung của bản báo cáo này rất nhiều.'),
    example(1, 'gai', '请把这句话改一下。', 'qǐng bǎ zhè jù huà gǎi yíxià.', 'Xin hãy sửa câu này một chút.'),
    example(1, 'xixin', '她工作很细心。', 'tā gōngzuò hěn xìxīn.', 'Cô ấy làm việc rất tỉ mỉ.'),
    example(1, 'kehu', '他是我们的客户。', 'tā shì wǒmen de kèhù.', 'Anh ấy là khách hàng của chúng tôi.'),
    example(1, 'zhenzheng', '这是真正的好产品。', 'zhè shì zhēnzhèng de hǎo chǎnpǐn.', 'Đây là sản phẩm thực sự tốt.'),
    example(1, 'xiangfa', '你的想法很好。', 'nǐ de xiǎngfǎ hěn hǎo.', 'Ý tưởng của bạn rất hay.'),
    example(1, 'renwu', '今天的任务很多。', 'jīntiān de rènwù hěn duō.', 'Nhiệm vụ hôm nay rất nhiều.'),
    example(1, 'jishi', '请及时告诉我。', 'qǐng jíshí gàosu wǒ.', 'Xin hãy báo cho tôi kịp thời.'),
];
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 出差 "下个月我要出差。" / xià gè yuè wǒ yào chūchāi. / Tháng sau tôi phải đi công tác.
 * - 经验 "他有很多经验。" / tā yǒu hěn duō jīngyàn. / Anh ấy có rất nhiều kinh nghiệm.
 * - 采访 "记者采访了他。" / jìzhě cǎifǎng le tā. / Phóng viên đã phỏng vấn anh ấy.
 * - 产品 "这个产品很好用。" / zhège chǎnpǐn hěn hǎoyòng. / Sản phẩm này rất dễ dùng.
 * - 看法 "你对这件事有什么看法？" / nǐ duì zhè jiàn shì yǒu shénme kànfǎ? / Bạn có quan điểm gì về việc này?
 * - 提前 "请提前十分钟到。" / qǐng tíqián shí fēnzhōng dào. / Xin hãy đến sớm mười phút.
 * - 便于 "这样便于大家学习。" / zhèyàng biànyú dàjiā xuéxí. / Như vậy thuận tiện cho mọi người học tập.
 * - 既然 "既然来了，就坐一会儿吧。" / jìrán lái le, jiù zuò yíhuìr ba. / Đã đến rồi thì ngồi chơi một lát đi.
 */
exports.HSK4_SHANG_L7_G2_EXAMPLES = [
    example(2, 'chuchai', '下个月我要出差。', 'xià gè yuè wǒ yào chūchāi.', 'Tháng sau tôi phải đi công tác.'),
    example(2, 'jingyan', '他有很多经验。', 'tā yǒu hěn duō jīngyàn.', 'Anh ấy có rất nhiều kinh nghiệm.'),
    example(2, 'caifang', '记者采访了他。', 'jìzhě cǎifǎng le tā.', 'Phóng viên đã phỏng vấn anh ấy.'),
    example(2, 'chanpin', '这个产品很好用。', 'zhège chǎnpǐn hěn hǎoyòng.', 'Sản phẩm này rất dễ dùng.'),
    example(2, 'kanfa', '你对这件事有什么看法？', 'nǐ duì zhè jiàn shì yǒu shénme kànfǎ?', 'Bạn có quan điểm gì về việc này?'),
    example(2, 'tiqian', '请提前十分钟到。', 'qǐng tíqián shí fēnzhōng dào.', 'Xin hãy đến sớm mười phút.'),
    example(2, 'bianyu', '这样便于大家学习。', 'zhèyàng biànyú dàjiā xuéxí.', 'Như vậy thuận tiện cho mọi người học tập.'),
    example(2, 'jiran', '既然来了，就坐一会儿吧。', 'jìrán lái le, jiù zuò yíhuìr ba.', 'Đã đến rồi thì ngồi chơi một lát đi.'),
];
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 谈 "我们谈一谈吧。" / wǒmen tán yì tán ba. / Chúng ta nói chuyện một chút nhé.
 * - 笔 "他花了一笔钱买书。" / tā huā le yì bǐ qián mǎi shū. / Anh ấy đã tiêu một khoản tiền mua sách.
 * - 生意 "他的生意很好。" / tā de shēngyi hěn hǎo. / Việc kinh doanh của anh ấy rất tốt.
 * - 困难 "工作中有很多困难。" / gōngzuò zhōng yǒu hěn duō kùnnan. / Trong công việc có nhiều khó khăn.
 * - 优点 "他有很多优点。" / tā yǒu hěn duō yōudiǎn. / Anh ấy có nhiều ưu điểm.
 * - 缺点 "这个产品有一个缺点。" / zhège chǎnpǐn yǒu yí gè quēdiǎn. / Sản phẩm này có một khuyết điểm.
 * - 实际 "实际情况比我想的复杂。" / shíjì qíngkuàng bǐ wǒ xiǎng de fùzá. / Tình hình thực tế phức tạp hơn tôi nghĩ.
 * - 效果 "这个办法的效果很好。" / zhège bànfǎ de xiàoguǒ hěn hǎo. / Hiệu quả của cách này rất tốt.
 * - 点 "这一点很重要。" / zhè yì diǎn hěn zhòngyào. / Điểm này rất quan trọng.
 * - 一下 "请等一下。" / qǐng děng yíxià. / Xin hãy đợi một chút.
 */
exports.HSK4_SHANG_L7_G3_EXAMPLES = [
    example(3, 'tan', '我们谈一谈吧。', 'wǒmen tán yì tán ba.', 'Chúng ta nói chuyện một chút nhé.'),
    example(3, 'bi', '他花了一笔钱买书。', 'tā huā le yì bǐ qián mǎi shū.', 'Anh ấy đã tiêu một khoản tiền mua sách.'),
    example(3, 'shengyi', '他的生意很好。', 'tā de shēngyi hěn hǎo.', 'Việc kinh doanh của anh ấy rất tốt.'),
    example(3, 'kunnan', '工作中有很多困难。', 'gōngzuò zhōng yǒu hěn duō kùnnan.', 'Trong công việc có nhiều khó khăn.'),
    example(3, 'youdian', '他有很多优点。', 'tā yǒu hěn duō yōudiǎn.', 'Anh ấy có nhiều ưu điểm.'),
    example(3, 'quedian', '这个产品有一个缺点。', 'zhège chǎnpǐn yǒu yí gè quēdiǎn.', 'Sản phẩm này có một khuyết điểm.'),
    example(3, 'shiji', '实际情况比我想的复杂。', 'shíjì qíngkuàng bǐ wǒ xiǎng de fùzá.', 'Tình hình thực tế phức tạp hơn tôi nghĩ.'),
    example(3, 'xiaoguo', '这个办法的效果很好。', 'zhège bànfǎ de xiàoguǒ hěn hǎo.', 'Hiệu quả của cách này rất tốt.'),
    example(3, 'dian', '这一点很重要。', 'zhè yì diǎn hěn zhòngyào.', 'Điểm này rất quan trọng.'),
    example(3, 'yixia', '请等一下。', 'qǐng děng yíxià.', 'Xin hãy đợi một chút.'),
];
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 份 "请给我一份报告。" / qǐng gěi wǒ yí fèn bàogào. / Xin hãy cho tôi một bản báo cáo.
 * - 积累 "经验是慢慢积累的。" / jīngyàn shì mànmàn jīlěi de. / Kinh nghiệm được tích lũy dần dần.
 * - 使 "这件事使我很高兴。" / zhè jiàn shì shǐ wǒ hěn gāoxìng. / Việc này khiến tôi rất vui.
 * - 进入 "他进入了这家公司。" / tā jìnrù le zhè jiā gōngsī. / Anh ấy đã vào làm ở công ty này.
 * - 社会 "社会在不断变化。" / shèhuì zài búduàn biànhuà. / Xã hội đang không ngừng thay đổi.
 * - 管理 "他负责管理这个项目。" / tā fùzé guǎnlǐ zhège xiàngmù. / Anh ấy phụ trách quản lý dự án này.
 * - 基础 "你的基础很好。" / nǐ de jīchǔ hěn hǎo. / Nền tảng của bạn rất tốt.
 * - 能力 "他的能力很强。" / tā de nénglì hěn qiáng. / Năng lực của anh ấy rất mạnh.
 * - 今后 "今后我会更加努力。" / jīnhòu wǒ huì gèngjiā nǔlì. / Từ nay về sau tôi sẽ cố gắng hơn nữa.
 */
exports.HSK4_SHANG_L7_G4_EXAMPLES = [
    example(4, 'fen', '请给我一份报告。', 'qǐng gěi wǒ yí fèn bàogào.', 'Xin hãy cho tôi một bản báo cáo.'),
    example(4, 'jilei', '经验是慢慢积累的。', 'jīngyàn shì mànmàn jīlěi de.', 'Kinh nghiệm được tích lũy dần dần.'),
    example(4, 'shi', '这件事使我很高兴。', 'zhè jiàn shì shǐ wǒ hěn gāoxìng.', 'Việc này khiến tôi rất vui.'),
    example(4, 'jinru', '他进入了这家公司。', 'tā jìnrù le zhè jiā gōngsī.', 'Anh ấy đã vào làm ở công ty này.'),
    example(4, 'shehui', '社会在不断变化。', 'shèhuì zài búduàn biànhuà.', 'Xã hội đang không ngừng thay đổi.'),
    example(4, 'guanli', '他负责管理这个项目。', 'tā fùzé guǎnlǐ zhège xiàngmù.', 'Anh ấy phụ trách quản lý dự án này.'),
    example(4, 'jichu', '你的基础很好。', 'nǐ de jīchǔ hěn hǎo.', 'Nền tảng của bạn rất tốt.'),
    example(4, 'nengli', '他的能力很强。', 'tā de nénglì hěn qiáng.', 'Năng lực của anh ấy rất mạnh.'),
    example(4, 'jinhou', '今后我会更加努力。', 'jīnhòu wǒ huì gèngjiā nǔlì.', 'Từ nay về sau tôi sẽ cố gắng hơn nữa.'),
];
/** Alias ngắn cho HSK4_SHANG_L7_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_SHANG_L7_EXAMPLES;
