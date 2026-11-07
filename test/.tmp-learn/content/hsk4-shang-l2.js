"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_SHANG_L2_G4_EXAMPLES = exports.HSK4_SHANG_L2_G3_EXAMPLES = exports.HSK4_SHANG_L2_G2_EXAMPLES = exports.HSK4_SHANG_L2_EXAMPLES = exports.HSK4_SHANG_L2_G4_VOCABULARY = exports.HSK4_SHANG_L2_G3_VOCABULARY = exports.HSK4_SHANG_L2_G2_VOCABULARY = exports.HSK4_SHANG_L2_VOCABULARY = exports.HSK4_SHANG_L2_G4_LEXEMES = exports.HSK4_SHANG_L2_G3_LEXEMES = exports.HSK4_SHANG_L2_G2_LEXEMES = exports.HSK4_SHANG_L2_LEXEMES = exports.HSK4_SHANG_L2_GROUP4 = exports.HSK4_SHANG_L2_GROUP3 = exports.HSK4_SHANG_L2_GROUP2 = exports.HSK4_SHANG_L2_GROUP = exports.HSK4_SHANG_L2_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_SHANG_L2_LESSON = {
    id: 'hsk4-shang-l2',
    courseId: 'hsk4-shang',
    number: 2,
    title: '租到了合适的房子',
    topic: 'Thuê nhà, xem nhà & dọn vào ở',
};
exports.HSK4_SHANG_L2_GROUP = {
    id: 'hsk4-shang-l2-g1',
    lessonId: 'hsk4-shang-l2',
    index: 1,
};
exports.HSK4_SHANG_L2_GROUP2 = {
    id: 'hsk4-shang-l2-g2',
    lessonId: 'hsk4-shang-l2',
    index: 2,
};
exports.HSK4_SHANG_L2_GROUP3 = {
    id: 'hsk4-shang-l2-g3',
    lessonId: 'hsk4-shang-l2',
    index: 3,
};
exports.HSK4_SHANG_L2_GROUP4 = {
    id: 'hsk4-shang-l2-g4',
    lessonId: 'hsk4-shang-l2',
    index: 4,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-thuong';
const VERIFIED_AT = '2026-11-06';
function lexeme(group, idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-shang-l2-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-shang',
        lessonId: 'hsk4-shang-l2',
        groupId: `hsk4-shang-l2-g${group}`,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 8 từ nhóm 1 HSK 4 quyển thượng bài 2, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L2_LEXEMES = [
    lexeme(1, 'fangdong', '房东', 'fángdōng', 'chủ nhà (cho thuê)', 'Danh từ', 1),
    lexeme(1, 'chuzu', '出租', 'chūzū', 'cho thuê', 'Động từ', 2),
    lexeme(1, 'fangzu', '房租', 'fángzū', 'tiền thuê nhà', 'Danh từ', 3),
    lexeme(1, 'shoushi', '收拾', 'shōushi', 'dọn dẹp, thu xếp', 'Động từ', 4),
    lexeme(1, 'zu', '租', 'zū', 'thuê', 'Động từ', 5),
    lexeme(1, 'ng', '嗯', 'ǹg', 'ừ, ừm (thán từ hưởng ứng)', 'Thán từ', 6),
    lexeme(1, 'liang', '亮', 'liàng', 'sáng; sáng sủa', 'Tính từ / Động từ', 7),
    lexeme(1, 'jiushi', '就是', 'jiùshì', '(cụm cuối câu) cứ… là được', 'Trợ từ', 8),
];
/** 7 từ nhóm 2 HSK 4 quyển thượng bài 2, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L2_G2_LEXEMES = [
    lexeme(2, 'zhong', '种', 'zhǒng', 'trồng', 'Động từ', 1),
    lexeme(2, 'zhouwei', '周围', 'zhōuwéi', 'xung quanh', 'Danh từ', 2),
    lexeme(2, 'buguo', '不过', 'búguò', 'nhưng, tuy nhiên (nhẹ nhàng)', 'Liên từ', 3),
    lexeme(2, 'biye', '毕业', 'bìyè', 'tốt nghiệp', 'Động từ', 4),
    lexeme(2, 'kongpa', '恐怕', 'kǒngpà', 'e rằng, sợ rằng', 'Phó từ', 5),
    lexeme(2, 'renao', '热闹', 'rènao', 'náo nhiệt, nhộn nhịp', 'Động từ / Tính từ / Danh từ', 6),
    lexeme(2, 'ruzhu', '入住', 'rùzhù', 'dọn vào ở, vào ở', 'Động từ', 7),
];
/** 10 từ nhóm 3 HSK 4 quyển thượng bài 2, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L2_G3_LEXEMES = [
    lexeme(3, 'riji', '日记', 'rìjì', 'nhật ký', 'Danh từ', 1),
    lexeme(3, 'shunli', '顺利', 'shùnlì', 'thuận lợi, suôn sẻ', 'Tính từ', 2),
    lexeme(3, 'bing', '并', 'bìng', 'và, đồng thời; (trước phủ định) hoàn toàn', 'Liên từ / Phó từ', 3),
    lexeme(3, 'keting', '客厅', 'kètīng', 'phòng khách', 'Danh từ', 4),
    lexeme(3, 'tai', '台', 'tái', '(lượng từ) chiếc — dùng cho máy móc, thiết bị', 'Lượng từ', 5),
    lexeme(3, 'chufang', '厨房', 'chúfáng', 'nhà bếp', 'Danh từ', 6),
    lexeme(3, 'pingchang', '平常', 'píngcháng', 'ngày thường; bình thường', 'Danh từ / Tính từ', 7),
    lexeme(3, 'jibenshang', '基本上', 'jīběnshàng', 'về cơ bản, cơ bản là', 'Phó từ', 8),
    lexeme(3, 'zhengge', '整个', 'zhěnggè', 'toàn bộ, cả (một đơn vị)', 'Tính từ', 9),
    lexeme(3, 'maojin', '毛巾', 'máojīn', 'khăn mặt, khăn tắm', 'Danh từ', 10),
];
/** 12 từ nhóm 4 HSK 4 quyển thượng bài 2, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L2_G4_LEXEMES = [
    lexeme(4, 'jianyi', '建议', 'jiànyì', 'kiến nghị, đề xuất; lời khuyên', 'Danh từ / Động từ', 1),
    lexeme(4, 'chakan', '查看', 'chákàn', 'kiểm tra, xem xét', 'Động từ', 2),
    lexeme(4, 'xinxi', '信息', 'xìnxī', 'thông tin', 'Danh từ', 3),
    lexeme(4, 'chazhao', '查找', 'cházhǎo', 'tra cứu, tìm kiếm', 'Động từ', 4),
    lexeme(4, 'jiezhe', '接着', 'jiēzhe', 'tiếp theo, sau đó; tiếp tục', 'Phó từ / Động từ', 5),
    lexeme(4, 'tongshi', '同时', 'tóngshí', 'đồng thời; cùng lúc đó', 'Liên từ / Danh từ', 6),
    lexeme(4, 'weizhi', '位置', 'wèizhì', 'vị trí', 'Danh từ', 7),
    lexeme(4, 'jiage', '价格', 'jiàgé', 'giá cả', 'Danh từ', 8),
    lexeme(4, 'lixiang', '理想', 'lǐxiǎng', 'lý tưởng; lý tưởng (điều mơ ước)', 'Tính từ / Danh từ', 9),
    lexeme(4, 'youyu', '由于', 'yóuyú', 'do, bởi vì, nhờ', 'Liên từ / Giới từ', 10),
    lexeme(4, 'gongzi', '工资', 'gōngzī', 'tiền lương', 'Danh từ', 11),
    lexeme(4, 'gan', '感', 'gǎn', 'cảm giác (hậu tố: 幸福感， 安全感…)', 'Hậu tố', 12),
];
/** Liên kết 8 từ với bài 2 (nhóm 1), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L2_VOCABULARY = exports.HSK4_SHANG_L2_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l2',
    groupId: 'hsk4-shang-l2-g1',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 7 từ với bài 2 (nhóm 2), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L2_G2_VOCABULARY = exports.HSK4_SHANG_L2_G2_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l2',
    groupId: 'hsk4-shang-l2-g2',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 10 từ với bài 2 (nhóm 3), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L2_G3_VOCABULARY = exports.HSK4_SHANG_L2_G3_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l2',
    groupId: 'hsk4-shang-l2-g3',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 12 từ với bài 2 (nhóm 4), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L2_G4_VOCABULARY = exports.HSK4_SHANG_L2_G4_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l2',
    groupId: 'hsk4-shang-l2-g4',
    lexemeId: w.id,
    order: w.order,
}));
function example(group, lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-shang-l2-g${group}-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-shang-l2-g${group}-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 房东 "房东人很好。" / 出租 "这间房子出租。" / 房租 "这里的房租不贵。" / 收拾 "我先收拾一下房间。" / 租 "我想租一间房子。" / 嗯 "嗯，我知道了。" / 亮 "这个房间很亮。" / 就是 "你住在这里就是了。"
 * - 种 "我在阳台上种花。" / 周围 "房子周围很安静。" / 不过 "这间房子不错，不过有点儿贵。" / 毕业 "他明年毕业。" / 恐怕 "恐怕他今天来不了。" / 热闹 "这里很热闹。" / 入住 "我们明天入住新房子。"
 * - 日记 "我每天写日记。" / 顺利 "一切都很顺利。" / 并 "我并不喜欢这里。" / 客厅 "客厅很大。" / 台 "桌子上有一台电脑。" / 厨房 "厨房在客厅旁边。" / 平常 "我平常在家吃饭。" / 基本上 "我基本上每天都跑步。" / 整个 "整个房间都很干净。" / 毛巾 "请给我一条毛巾。"
 * - 建议 "我有一个建议。" / 查看 "请查看一下你的信息。" / 信息 "我收到了一条信息。" / 查找 "我在网上查找房子。" / 接着 "吃完饭，接着我们去看电影。" / 同时 "他同时学中文和英文。" / 位置 "这个房子的位置很好。" / 价格 "这个价格很便宜。" / 理想 "这是一个理想的地方。" / 由于 "由于下雨，我们没有去。" / 工资 "他的工资很高。" / 感 "这里很有安全感。"
 */
exports.HSK4_SHANG_L2_EXAMPLES = [
    example(1, 'fangdong', '房东人很好。', 'fángdōng rén hěn hǎo.', 'Chủ nhà rất tốt.'),
    example(1, 'chuzu', '这间房子出租。', 'zhè jiān fángzi chūzū.', 'Căn nhà này cho thuê.'),
    example(1, 'fangzu', '这里的房租不贵。', 'zhèlǐ de fángzū bú guì.', 'Tiền thuê nhà ở đây không đắt.'),
    example(1, 'shoushi', '我先收拾一下房间。', 'wǒ xiān shōushi yíxià fángjiān.', 'Tôi dọn dẹp phòng trước đã.'),
    example(1, 'zu', '我想租一间房子。', 'wǒ xiǎng zū yì jiān fángzi.', 'Tôi muốn thuê một căn nhà.'),
    example(1, 'ng', '嗯，我知道了。', 'ǹg, wǒ zhīdào le.', 'Ừ, tôi biết rồi.'),
    example(1, 'liang', '这个房间很亮。', 'zhège fángjiān hěn liàng.', 'Căn phòng này rất sáng.'),
    example(1, 'jiushi', '你住在这里就是了。', 'nǐ zhù zài zhèlǐ jiùshì le.', 'Bạn cứ ở đây là được.'),
];
exports.HSK4_SHANG_L2_G2_EXAMPLES = [
    example(2, 'zhong', '我在阳台上种花。', 'wǒ zài yángtái shàng zhòng huā.', 'Tôi trồng hoa trên ban công.'),
    example(2, 'zhouwei', '房子周围很安静。', 'fángzi zhōuwéi hěn ānjìng.', 'Xung quanh ngôi nhà rất yên tĩnh.'),
    example(2, 'buguo', '这间房子不错，不过有点儿贵。', 'zhè jiān fángzi búcuò, búguò yǒudiǎnr guì.', 'Căn nhà này không tệ, nhưng hơi đắt.'),
    example(2, 'biye', '他明年毕业。', 'tā míngnián bìyè.', 'Anh ấy tốt nghiệp vào năm sau.'),
    example(2, 'kongpa', '恐怕他今天来不了。', 'kǒngpà tā jīntiān lái bù liǎo.', 'E rằng hôm nay anh ấy không đến được.'),
    example(2, 'renao', '这里很热闹。', 'zhèlǐ hěn rènao.', 'Ở đây rất náo nhiệt.'),
    example(2, 'ruzhu', '我们明天入住新房子。', 'wǒmen míngtiān rùzhù xīn fángzi.', 'Ngày mai chúng tôi dọn vào ở nhà mới.'),
];
exports.HSK4_SHANG_L2_G3_EXAMPLES = [
    example(3, 'riji', '我每天写日记。', 'wǒ měitiān xiě rìjì.', 'Tôi viết nhật ký mỗi ngày.'),
    example(3, 'shunli', '一切都很顺利。', 'yíqiè dōu hěn shùnlì.', 'Mọi việc đều rất thuận lợi.'),
    example(3, 'bing', '我并不喜欢这里。', 'wǒ bìng bù xǐhuān zhèlǐ.', 'Tôi hoàn toàn không thích ở đây.'),
    example(3, 'keting', '客厅很大。', 'kètīng hěn dà.', 'Phòng khách rất lớn.'),
    example(3, 'tai', '桌子上有一台电脑。', 'zhuōzi shàng yǒu yì tái diànnǎo.', 'Trên bàn có một chiếc máy tính.'),
    example(3, 'chufang', '厨房在客厅旁边。', 'chúfáng zài kètīng pángbiān.', 'Nhà bếp ở cạnh phòng khách.'),
    example(3, 'pingchang', '我平常在家吃饭。', 'wǒ píngcháng zài jiā chī fàn.', 'Ngày thường tôi ăn cơm ở nhà.'),
    example(3, 'jibenshang', '我基本上每天都跑步。', 'wǒ jīběnshàng měitiān dōu pǎobù.', 'Về cơ bản tôi chạy bộ mỗi ngày.'),
    example(3, 'zhengge', '整个房间都很干净。', 'zhěnggè fángjiān dōu hěn gānjìng.', 'Cả căn phòng đều rất sạch.'),
    example(3, 'maojin', '请给我一条毛巾。', 'qǐng gěi wǒ yì tiáo máojīn.', 'Xin cho tôi một chiếc khăn.'),
];
exports.HSK4_SHANG_L2_G4_EXAMPLES = [
    example(4, 'jianyi', '我有一个建议。', 'wǒ yǒu yí gè jiànyì.', 'Tôi có một đề xuất.'),
    example(4, 'chakan', '请查看一下你的信息。', 'qǐng chákàn yíxià nǐ de xìnxī.', 'Xin hãy kiểm tra thông tin của bạn.'),
    example(4, 'xinxi', '我收到了一条信息。', 'wǒ shōudào le yì tiáo xìnxī.', 'Tôi đã nhận được một tin nhắn.'),
    example(4, 'chazhao', '我在网上查找房子。', 'wǒ zài wǎngshàng cházhǎo fángzi.', 'Tôi tra cứu nhà trên mạng.'),
    example(4, 'jiezhe', '吃完饭，接着我们去看电影。', 'chī wán fàn, jiēzhe wǒmen qù kàn diànyǐng.', 'Ăn cơm xong, tiếp theo chúng tôi đi xem phim.'),
    example(4, 'tongshi', '他同时学中文和英文。', 'tā tóngshí xué Zhōngwén hé Yīngwén.', 'Anh ấy đồng thời học tiếng Trung và tiếng Anh.'),
    example(4, 'weizhi', '这个房子的位置很好。', 'zhège fángzi de wèizhì hěn hǎo.', 'Vị trí của căn nhà này rất tốt.'),
    example(4, 'jiage', '这个价格很便宜。', 'zhège jiàgé hěn piányi.', 'Giá này rất rẻ.'),
    example(4, 'lixiang', '这是一个理想的地方。', 'zhè shì yí gè lǐxiǎng de dìfang.', 'Đây là một nơi lý tưởng.'),
    example(4, 'youyu', '由于下雨，我们没有去。', 'yóuyú xià yǔ, wǒmen méiyǒu qù.', 'Do trời mưa, chúng tôi đã không đi.'),
    example(4, 'gongzi', '他的工资很高。', 'tā de gōngzī hěn gāo.', 'Lương của anh ấy rất cao.'),
    example(4, 'gan', '这里很有安全感。', 'zhèlǐ hěn yǒu ānquángǎn.', 'Ở đây rất có cảm giác an toàn.'),
];
/** Alias ngắn cho HSK4_SHANG_L2_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_SHANG_L2_EXAMPLES;
