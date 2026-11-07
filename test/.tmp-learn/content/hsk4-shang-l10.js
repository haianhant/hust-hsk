"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_SHANG_L10_G4_EXAMPLES = exports.HSK4_SHANG_L10_G3_EXAMPLES = exports.HSK4_SHANG_L10_G2_EXAMPLES = exports.HSK4_SHANG_L10_EXAMPLES = exports.HSK4_SHANG_L10_G4_VOCABULARY = exports.HSK4_SHANG_L10_G3_VOCABULARY = exports.HSK4_SHANG_L10_G2_VOCABULARY = exports.HSK4_SHANG_L10_VOCABULARY = exports.HSK4_SHANG_L10_G4_LEXEMES = exports.HSK4_SHANG_L10_G3_LEXEMES = exports.HSK4_SHANG_L10_G2_LEXEMES = exports.HSK4_SHANG_L10_LEXEMES = exports.HSK4_SHANG_L10_GROUP4 = exports.HSK4_SHANG_L10_GROUP3 = exports.HSK4_SHANG_L10_GROUP2 = exports.HSK4_SHANG_L10_GROUP = exports.HSK4_SHANG_L10_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_SHANG_L10_LESSON = {
    id: 'hsk4-shang-l10',
    courseId: 'hsk4-shang',
    number: 10,
    title: '南方人不懂北方的冷',
    topic: 'Thời tiết Nam – Bắc, phương ngữ & sống xanh',
};
exports.HSK4_SHANG_L10_GROUP = {
    id: 'hsk4-shang-l10-g1',
    lessonId: 'hsk4-shang-l10',
    index: 1,
};
exports.HSK4_SHANG_L10_GROUP2 = {
    id: 'hsk4-shang-l10-g2',
    lessonId: 'hsk4-shang-l10',
    index: 2,
};
exports.HSK4_SHANG_L10_GROUP3 = {
    id: 'hsk4-shang-l10-g3',
    lessonId: 'hsk4-shang-l10',
    index: 3,
};
exports.HSK4_SHANG_L10_GROUP4 = {
    id: 'hsk4-shang-l10-g4',
    lessonId: 'hsk4-shang-l10',
    index: 4,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-thuong';
const VERIFIED_AT = '2026-11-06';
function lexeme(group, idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-shang-l10-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-shang',
        lessonId: 'hsk4-shang-l10',
        groupId: `hsk4-shang-l10-g${group}`,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 12 từ nhóm 1 HSK 4 quyển thượng bài 10, đúng thứ tự nguồn 1..12. */
exports.HSK4_SHANG_L10_LEXEMES = [
    lexeme(1, 'xiaohuozi', '小伙子', 'xiǎohuǒzi', 'anh chàng, chàng trai trẻ', 'Danh từ', 1),
    lexeme(1, 'qiwen', '气温', 'qìwēn', 'nhiệt độ không khí', 'Danh từ', 2),
    lexeme(1, 'lingxia', '零下', 'líng xià', 'âm (dưới 0 độ)', 'Danh từ', 3),
    lexeme(1, 'du', '度', 'dù', 'độ (nhiệt độ, góc…)', 'Lượng từ', 4),
    lexeme(1, 'dong', '冻', 'dòng', 'đóng băng; lạnh cóng', 'Động từ', 5),
    lexeme(1, 'houhui', '后悔', 'hòuhuǐ', 'hối hận', 'Động từ', 6),
    lexeme(1, 'jiushi', '就是', 'jiùshì', 'chính là; nhất định (nhấn mạnh)', 'Phó từ', 7),
    lexeme(1, 'wendu', '温度', 'wēndù', 'nhiệt độ', 'Danh từ', 8),
    lexeme(1, 'chabie', '差别', 'chābié', 'sự khác biệt, chênh lệch', 'Danh từ', 9),
    lexeme(1, 'hou', '厚', 'hòu', 'dày', 'Tính từ', 10),
    lexeme(1, 'guangzhou', '广州', 'Guǎngzhōu', 'Quảng Châu (thành phố miền Nam TQ)', 'Danh từ riêng', 11),
    lexeme(1, 'haerbin', '哈尔滨', "Hā'ěrbīn", 'Cáp Nhĩ Tân (thành phố miền Bắc TQ)', 'Danh từ riêng', 12),
];
/** 8 từ nhóm 2 HSK 4 quyển thượng bài 10, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L10_G2_LEXEMES = [
    lexeme(2, 'hanjia', '寒假', 'hánjià', 'kỳ nghỉ đông', 'Danh từ', 1),
    lexeme(2, 'nuanhuo', '暖和', 'nuǎnhuo', 'ấm áp', 'Tính từ / Động từ', 2),
    lexeme(2, 'diyu', '低于', 'dīyú', 'thấp hơn, dưới (mức)', 'Động từ', 3),
    lexeme(2, 'sheshidu', '摄氏度', 'shèshìdù', 'độ C (độ bách phân)', 'Lượng từ', 4),
    lexeme(2, 'shoubuliao', '受不了', 'shòubuliǎo', 'chịu không nổi', 'Động từ', 5),
    lexeme(2, 'juban', '举办', 'jǔbàn', 'tổ chức, đăng cai (hoạt động, sự kiện)', 'Động từ', 6),
    lexeme(2, 'gezhong', '各种', 'gèzhǒng', 'đủ loại, các loại', 'Đại từ', 7),
    lexeme(2, 'zhiwu', '植物', 'zhíwù', 'thực vật, cây cối', 'Danh từ', 8),
];
/** 10 từ nhóm 3 HSK 4 quyển thượng bài 10, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L10_G3_LEXEMES = [
    lexeme(3, 'gongli', '公里', 'gōnglǐ', 'ki-lô-mét', 'Lượng từ', 1),
    lexeme(3, 'qihou', '气候', 'qìhòu', 'khí hậu', 'Danh từ', 2),
    lexeme(3, 'er', '而', 'ér', 'còn, mà; và (văn viết, nối đối lập/bổ sung)', 'Liên từ', 3),
    lexeme(3, 'ciwai', '此外', 'cǐwài', 'ngoài ra', 'Liên từ', 4),
    lexeme(3, 'fangyan', '方言', 'fāngyán', 'phương ngữ, tiếng địa phương', 'Danh từ', 5),
    lexeme(3, 'putonghua', '普通话', 'pǔtōnghuà', 'tiếng phổ thông (quan thoại chuẩn)', 'Danh từ', 6),
    lexeme(3, 'jiao', '较', 'jiào', 'hơi, khá; so (văn viết: 较大）', 'Phó từ', 7),
    lexeme(3, 'shiyong', '使用', 'shǐyòng', 'sử dụng, dùng', 'Động từ', 8),
    lexeme(3, 'yinqi', '引起', 'yǐnqǐ', 'gây ra, dẫn đến', 'Động từ', 9),
    lexeme(3, 'wuhui', '误会', 'wùhuì', 'hiểu lầm; hiểu lầm (ai)', 'Danh từ / Động từ', 10),
];
/** 13 từ nhóm 4 HSK 4 quyển thượng bài 10, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L10_G4_LEXEMES = [
    lexeme(4, 'qinai', '亲爱', "qīn'ài", 'thân yêu, yêu quý (kính ngữ thư từ)', 'Tính từ', 1),
    lexeme(4, 'zaici', '再次', 'zàicì', 'một lần nữa, lần thứ hai', 'Phó từ', 2),
    lexeme(4, 'kaizhan', '开展', 'kāizhǎn', 'triển khai, phát động (hoạt động)', 'Động từ', 3),
    lexeme(4, 'lvse', '绿色', 'lǜsè', 'màu xanh lá; xanh (thân thiện môi trường)', 'Tính từ', 4),
    lexeme(4, 'huanbao', '环保', 'huánbǎo', 'bảo vệ môi trường', 'Danh từ / Tính từ', 5),
    lexeme(4, 'jujue', '拒绝', 'jùjué', 'từ chối, khước từ', 'Động từ', 6),
    lexeme(4, 'langfei', '浪费', 'làngfèi', 'lãng phí; lãng phí (đồ vật, thời gian)', 'Động từ', 7),
    lexeme(4, 'jieyue', '节约', 'jiéyuē', 'tiết kiệm', 'Động từ', 8),
    lexeme(4, 'ziyuan', '资源', 'zīyuán', 'tài nguyên, nguồn lực', 'Danh từ', 9),
    lexeme(4, 'guang', '光', 'guāng', 'sáng, bóng loáng; trơ trụi, sạch nhẵn', 'Tính từ', 10),
    lexeme(4, 'laji', '垃圾', 'lājī', 'rác', 'Danh từ', 11),
    lexeme(4, 'fenlei', '分类', 'fēnlèi', 'phân loại', 'Động từ', 12),
    lexeme(4, 'richang', '日常', 'rìcháng', 'hằng ngày, thường ngày', 'Tính từ', 13),
];
/** Liên kết 43 từ với bài 10, giữ thứ tự nguồn. */
exports.HSK4_SHANG_L10_VOCABULARY = exports.HSK4_SHANG_L10_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l10',
    groupId: 'hsk4-shang-l10-g1',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK4_SHANG_L10_G2_VOCABULARY = exports.HSK4_SHANG_L10_G2_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l10',
    groupId: 'hsk4-shang-l10-g2',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK4_SHANG_L10_G3_VOCABULARY = exports.HSK4_SHANG_L10_G3_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l10',
    groupId: 'hsk4-shang-l10-g3',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK4_SHANG_L10_G4_VOCABULARY = exports.HSK4_SHANG_L10_G4_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l10',
    groupId: 'hsk4-shang-l10-g4',
    lexemeId: w.id,
    order: w.order,
}));
function example(group, lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-shang-l10-g${group}-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-shang-l10-g${group}-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 小伙子 "那个小伙子很热情。" / nàge xiǎohuǒzi hěn rèqíng. / Anh chàng đó rất nhiệt tình.
 * - 气温 "今天的气温很低。" / jīntiān de qìwēn hěn dī. / Nhiệt độ không khí hôm nay rất thấp.
 * - 零下 "今天零下五度。" / jīntiān líng xià wǔ dù. / Hôm nay âm năm độ.
 * - 度 "今天多少度？" / jīntiān duōshao dù? / Hôm nay bao nhiêu độ?
 * - 冻 "我的手都冻了。" / wǒ de shǒu dōu dòng le. / Tay tôi lạnh cóng cả rồi.
 * - 后悔 "我不后悔这个决定。" / wǒ bú hòuhuǐ zhège juédìng. / Tôi không hối hận về quyết định này.
 * - 就是 "他就是我的好朋友。" / tā jiùshì wǒ de hǎo péngyou. / Anh ấy chính là bạn tốt của tôi.
 * - 温度 "屋里的温度很高。" / wū lǐ de wēndù hěn gāo. / Nhiệt độ trong nhà rất cao.
 * - 差别 "南方和北方的差别很大。" / nánfāng hé běifāng de chābié hěn dà. / Sự khác biệt giữa miền Nam và miền Bắc rất lớn.
 * - 厚 "这件衣服很厚。" / zhè jiàn yīfu hěn hòu. / Chiếc áo này rất dày.
 * - 广州 "广州在中国的南方。" / Guǎngzhōu zài Zhōngguó de nánfāng. / Quảng Châu ở miền Nam Trung Quốc.
 * - 哈尔滨 "哈尔滨在中国的北方。" / Hā'ěrbīn zài Zhōngguó de běifāng. / Cáp Nhĩ Tân ở miền Bắc Trung Quốc.
 */
exports.HSK4_SHANG_L10_EXAMPLES = [
    example(1, 'xiaohuozi', '那个小伙子很热情。', 'nàge xiǎohuǒzi hěn rèqíng.', 'Anh chàng đó rất nhiệt tình.'),
    example(1, 'qiwen', '今天的气温很低。', 'jīntiān de qìwēn hěn dī.', 'Nhiệt độ không khí hôm nay rất thấp.'),
    example(1, 'lingxia', '今天零下五度。', 'jīntiān líng xià wǔ dù.', 'Hôm nay âm năm độ.'),
    example(1, 'du', '今天多少度？', 'jīntiān duōshao dù?', 'Hôm nay bao nhiêu độ?'),
    example(1, 'dong', '我的手都冻了。', 'wǒ de shǒu dōu dòng le.', 'Tay tôi lạnh cóng cả rồi.'),
    example(1, 'houhui', '我不后悔这个决定。', 'wǒ bú hòuhuǐ zhège juédìng.', 'Tôi không hối hận về quyết định này.'),
    example(1, 'jiushi', '他就是我的好朋友。', 'tā jiùshì wǒ de hǎo péngyou.', 'Anh ấy chính là bạn tốt của tôi.'),
    example(1, 'wendu', '屋里的温度很高。', 'wū lǐ de wēndù hěn gāo.', 'Nhiệt độ trong nhà rất cao.'),
    example(1, 'chabie', '南方和北方的差别很大。', 'nánfāng hé běifāng de chābié hěn dà.', 'Sự khác biệt giữa miền Nam và miền Bắc rất lớn.'),
    example(1, 'hou', '这件衣服很厚。', 'zhè jiàn yīfu hěn hòu.', 'Chiếc áo này rất dày.'),
    example(1, 'guangzhou', '广州在中国的南方。', 'Guǎngzhōu zài Zhōngguó de nánfāng.', 'Quảng Châu ở miền Nam Trung Quốc.'),
    example(1, 'haerbin', '哈尔滨在中国的北方。', "Hā'ěrbīn zài Zhōngguó de běifāng.", 'Cáp Nhĩ Tân ở miền Bắc Trung Quốc.'),
];
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 寒假 "寒假我想去哈尔滨。" / hánjià wǒ xiǎng qù Hā'ěrbīn. / Kỳ nghỉ đông tôi muốn đi Cáp Nhĩ Tân.
 * - 暖和 "屋里很暖和。" / wū lǐ hěn nuǎnhuo. / Trong nhà rất ấm áp.
 * - 低于 "气温低于零度。" / qìwēn dīyú líng dù. / Nhiệt độ không khí dưới 0 độ.
 * - 摄氏度 "今天是零下五摄氏度。" / jīntiān shì líng xià wǔ shèshìdù. / Hôm nay là âm năm độ C.
 * - 受不了 "我受不了这么冷的天气。" / wǒ shòu bu liǎo zhème lěng de tiānqì. / Tôi chịu không nổi thời tiết lạnh thế này.
 * - 举办 "学校举办了一个活动。" / xuéxiào jǔbàn le yí gè huódòng. / Trường học đã tổ chức một hoạt động.
 * - 各种 "这里有各种植物。" / zhèlǐ yǒu gèzhǒng zhíwù. / Ở đây có đủ loại thực vật.
 * - 植物 "我喜欢种植物。" / wǒ xǐhuān zhòng zhíwù. / Tôi thích trồng cây.
 */
exports.HSK4_SHANG_L10_G2_EXAMPLES = [
    example(2, 'hanjia', '寒假我想去哈尔滨。', "hánjià wǒ xiǎng qù Hā'ěrbīn.", 'Kỳ nghỉ đông tôi muốn đi Cáp Nhĩ Tân.'),
    example(2, 'nuanhuo', '屋里很暖和。', 'wū lǐ hěn nuǎnhuo.', 'Trong nhà rất ấm áp.'),
    example(2, 'diyu', '气温低于零度。', 'qìwēn dīyú líng dù.', 'Nhiệt độ không khí dưới 0 độ.'),
    example(2, 'sheshidu', '今天是零下五摄氏度。', 'jīntiān shì líng xià wǔ shèshìdù.', 'Hôm nay là âm năm độ C.'),
    example(2, 'shoubuliao', '我受不了这么冷的天气。', 'wǒ shòu bu liǎo zhème lěng de tiānqì.', 'Tôi chịu không nổi thời tiết lạnh thế này.'),
    example(2, 'juban', '学校举办了一个活动。', 'xuéxiào jǔbàn le yí gè huódòng.', 'Trường học đã tổ chức một hoạt động.'),
    example(2, 'gezhong', '这里有各种植物。', 'zhèlǐ yǒu gèzhǒng zhíwù.', 'Ở đây có đủ loại thực vật.'),
    example(2, 'zhiwu', '我喜欢种植物。', 'wǒ xǐhuān zhòng zhíwù.', 'Tôi thích trồng cây.'),
];
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 公里 "这里离学校三公里。" / zhèlǐ lí xuéxiào sān gōnglǐ. / Chỗ này cách trường ba ki-lô-mét.
 * - 气候 "这里的气候很好。" / zhèlǐ de qìhòu hěn hǎo. / Khí hậu ở đây rất tốt.
 * - 而 "北方冷，而南方暖和。" / běifāng lěng, ér nánfāng nuǎnhuo. / Miền Bắc lạnh, còn miền Nam ấm áp.
 * - 此外 "此外，这里还有很多花。" / cǐwài, zhèlǐ hái yǒu hěn duō huā. / Ngoài ra, ở đây còn có rất nhiều hoa.
 * - 方言 "他会说很多方言。" / tā huì shuō hěn duō fāngyán. / Anh ấy nói được nhiều phương ngữ.
 * - 普通话 "我们都说普通话。" / wǒmen dōu shuō pǔtōnghuà. / Chúng tôi đều nói tiếng phổ thông.
 * - 较 "北方的冬天较冷。" / běifāng de dōngtiān jiào lěng. / Mùa đông miền Bắc khá lạnh.
 * - 使用 "请不要使用塑料袋。" / qǐng búyào shǐyòng sùliàodài. / Xin đừng dùng túi ni-lông.
 * - 引起 "这件事引起了大家的注意。" / zhè jiàn shì yǐnqǐ le dàjiā de zhùyì. / Việc này đã gây sự chú ý của mọi người.
 * - 误会 "这只是一个误会。" / zhè zhǐ shì yí gè wùhuì. / Đây chỉ là một hiểu lầm.
 */
exports.HSK4_SHANG_L10_G3_EXAMPLES = [
    example(3, 'gongli', '这里离学校三公里。', 'zhèlǐ lí xuéxiào sān gōnglǐ.', 'Chỗ này cách trường ba ki-lô-mét.'),
    example(3, 'qihou', '这里的气候很好。', 'zhèlǐ de qìhòu hěn hǎo.', 'Khí hậu ở đây rất tốt.'),
    example(3, 'er', '北方冷，而南方暖和。', 'běifāng lěng, ér nánfāng nuǎnhuo.', 'Miền Bắc lạnh, còn miền Nam ấm áp.'),
    example(3, 'ciwai', '此外，这里还有很多花。', 'cǐwài, zhèlǐ hái yǒu hěn duō huā.', 'Ngoài ra, ở đây còn có rất nhiều hoa.'),
    example(3, 'fangyan', '他会说很多方言。', 'tā huì shuō hěn duō fāngyán.', 'Anh ấy nói được nhiều phương ngữ.'),
    example(3, 'putonghua', '我们都说普通话。', 'wǒmen dōu shuō pǔtōnghuà.', 'Chúng tôi đều nói tiếng phổ thông.'),
    example(3, 'jiao', '北方的冬天较冷。', 'běifāng de dōngtiān jiào lěng.', 'Mùa đông miền Bắc khá lạnh.'),
    example(3, 'shiyong', '请不要使用塑料袋。', 'qǐng búyào shǐyòng sùliàodài.', 'Xin đừng dùng túi ni-lông.'),
    example(3, 'yinqi', '这件事引起了大家的注意。', 'zhè jiàn shì yǐnqǐ le dàjiā de zhùyì.', 'Việc này đã gây sự chú ý của mọi người.'),
    example(3, 'wuhui', '这只是一个误会。', 'zhè zhǐ shì yí gè wùhuì.', 'Đây chỉ là một hiểu lầm.'),
];
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 亲爱 "亲爱的朋友，你好！" / qīn'ài de péngyou, nǐ hǎo! / Bạn thân yêu, xin chào!
 * - 再次 "我们再次见面了。" / wǒmen zàicì jiànmiàn le. / Chúng ta lại gặp nhau rồi.
 * - 开展 "学校开展了环保活动。" / xuéxiào kāizhǎn le huánbǎo huódòng. / Trường học đã phát động hoạt động bảo vệ môi trường.
 * - 绿色 "我喜欢绿色。" / wǒ xǐhuān lǜsè. / Tôi thích màu xanh lá.
 * - 环保 "环保很重要。" / huánbǎo hěn zhòngyào. / Bảo vệ môi trường rất quan trọng.
 * - 拒绝 "我拒绝浪费。" / wǒ jùjué làngfèi. / Tôi từ chối lãng phí.
 * - 浪费 "不要浪费水。" / búyào làngfèi shuǐ. / Đừng lãng phí nước.
 * - 节约 "我们要节约用水。" / wǒmen yào jiéyuē yòng shuǐ. / Chúng ta phải tiết kiệm nước.
 * - 资源 "水是很重要的资源。" / shuǐ shì hěn zhòngyào de zīyuán. / Nước là tài nguyên rất quan trọng.
 * - 光 "墙上光光的，没有画。" / qiáng shang guāngguāng de, méiyǒu huà. / Trên tường trống trơn, không có tranh.
 * - 垃圾 "请把垃圾分类。" / qǐng bǎ lājī fēnlèi. / Xin hãy phân loại rác.
 * - 分类 "请把这些书分类。" / qǐng bǎ zhèxiē shū fēnlèi. / Xin hãy phân loại những cuốn sách này.
 * - 日常 "日常生活要节约用水。" / rìcháng shēnghuó yào jiéyuē yòng shuǐ. / Trong sinh hoạt hằng ngày cần tiết kiệm nước.
 */
exports.HSK4_SHANG_L10_G4_EXAMPLES = [
    example(4, 'qinai', '亲爱的朋友，你好！', "qīn'ài de péngyou, nǐ hǎo!", 'Bạn thân yêu, xin chào!'),
    example(4, 'zaici', '我们再次见面了。', 'wǒmen zàicì jiànmiàn le.', 'Chúng ta lại gặp nhau rồi.'),
    example(4, 'kaizhan', '学校开展了环保活动。', 'xuéxiào kāizhǎn le huánbǎo huódòng.', 'Trường học đã phát động hoạt động bảo vệ môi trường.'),
    example(4, 'lvse', '我喜欢绿色。', 'wǒ xǐhuān lǜsè.', 'Tôi thích màu xanh lá.'),
    example(4, 'huanbao', '环保很重要。', 'huánbǎo hěn zhòngyào.', 'Bảo vệ môi trường rất quan trọng.'),
    example(4, 'jujue', '我拒绝浪费。', 'wǒ jùjué làngfèi.', 'Tôi từ chối lãng phí.'),
    example(4, 'langfei', '不要浪费水。', 'búyào làngfèi shuǐ.', 'Đừng lãng phí nước.'),
    example(4, 'jieyue', '我们要节约用水。', 'wǒmen yào jiéyuē yòng shuǐ.', 'Chúng ta phải tiết kiệm nước.'),
    example(4, 'ziyuan', '水是很重要的资源。', 'shuǐ shì hěn zhòngyào de zīyuán.', 'Nước là tài nguyên rất quan trọng.'),
    example(4, 'guang', '墙上光光的，没有画。', 'qiáng shang guāngguāng de, méiyǒu huà.', 'Trên tường trống trơn, không có tranh.'),
    example(4, 'laji', '请把垃圾分类。', 'qǐng bǎ lājī fēnlèi.', 'Xin hãy phân loại rác.'),
    example(4, 'fenlei', '请把这些书分类。', 'qǐng bǎ zhèxiē shū fēnlèi.', 'Xin hãy phân loại những cuốn sách này.'),
    example(4, 'richang', '日常生活要节约用水。', 'rìcháng shēnghuó yào jiéyuē yòng shuǐ.', 'Trong sinh hoạt hằng ngày cần tiết kiệm nước.'),
];
/** Alias ngắn cho HSK4_SHANG_L10_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_SHANG_L10_EXAMPLES;
