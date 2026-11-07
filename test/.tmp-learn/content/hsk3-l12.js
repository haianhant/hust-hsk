"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK3_L12_G4_EXAMPLES = exports.HSK3_L12_G3_EXAMPLES = exports.HSK3_L12_G2_EXAMPLES = exports.HSK3_L12_EXAMPLES = exports.HSK3_L12_G4_VOCABULARY = exports.HSK3_L12_G3_VOCABULARY = exports.HSK3_L12_G2_VOCABULARY = exports.HSK3_L12_VOCABULARY = exports.HSK3_L12_G4_LEXEMES = exports.HSK3_L12_G3_LEXEMES = exports.HSK3_L12_G2_LEXEMES = exports.HSK3_L12_LEXEMES = exports.HSK3_L12_GROUP4 = exports.HSK3_L12_GROUP3 = exports.HSK3_L12_GROUP2 = exports.HSK3_L12_GROUP = exports.HSK3_L12_LESSON = exports.HSK3_COURSE = void 0;
const hsk3_l10_1 = require("./hsk3-l10");
Object.defineProperty(exports, "HSK3_COURSE", { enumerable: true, get: function () { return hsk3_l10_1.HSK3_COURSE; } });
exports.HSK3_L12_LESSON = {
    id: 'hsk3-l12',
    courseId: 'hsk3',
    number: 12,
    title: '这个季节天气变化很快',
    topic: 'Thời tiết & bốn mùa',
};
exports.HSK3_L12_GROUP = {
    id: 'hsk3-l12-g1',
    lessonId: 'hsk3-l12',
    index: 1,
};
exports.HSK3_L12_GROUP2 = {
    id: 'hsk3-l12-g2',
    lessonId: 'hsk3-l12',
    index: 2,
};
exports.HSK3_L12_GROUP3 = {
    id: 'hsk3-l12-g3',
    lessonId: 'hsk3-l12',
    index: 3,
};
exports.HSK3_L12_GROUP4 = {
    id: 'hsk3-l12-g4',
    lessonId: 'hsk3-l12',
    index: 4,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk3';
const VERIFIED_AT = '2026-11-06';
function lexeme(group, idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk3-l12-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk3',
        lessonId: 'hsk3-l12',
        groupId: `hsk3-l12-g${group}`,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 6 từ nhóm 1 HSK 3 bài 12, đúng thứ tự nguồn 1..6. */
exports.HSK3_L12_LEXEMES = [
    lexeme(1, 'jie', '街', 'jiē', 'phố, đường', 'danh từ', 1),
    lexeme(1, 'kaihua', '开花', 'kāihuā', 'nở hoa', 'động từ', 2),
    lexeme(1, 'gongyuan', '公园', 'gōngyuán', 'công viên', 'danh từ', 3),
    lexeme(1, 'chuan', '船', 'chuán', 'thuyền', 'danh từ', 4),
    lexeme(1, 'gongzuori', '工作日', 'gōngzuòrì', 'ngày làm việc', 'danh từ', 5),
    lexeme(1, 'difang', '地方', 'dìfang', 'nơi, địa điểm', 'danh từ', 6),
];
/** 11 từ nhóm 2 HSK 3 bài 12, đúng thứ tự nguồn 1..11. */
exports.HSK3_L12_G2_LEXEMES = [
    lexeme(2, 'gangcai', '刚才', 'gāngcái', 'vừa rồi, lúc nãy', 'danh từ', 1),
    lexeme(2, 'gua', '刮', 'guā', '(gió) thổi', 'động từ', 2),
    lexeme(2, 'feng', '风', 'fēng', 'gió', 'danh từ', 3),
    lexeme(2, 'xinwen', '新闻', 'xīnwén', 'tin tức', 'danh từ', 4),
    lexeme(2, 'san', '伞', 'sǎn', 'ô, dù', 'danh từ', 5),
    lexeme(2, 'jie', '借', 'jiè', 'mượn', 'động từ', 6),
    lexeme(2, 'ba', '把', 'bǎ', 'cái (đồ có tay cầm)', 'lượng từ', 7),
    lexeme(2, 'yuyi', '雨衣', 'yǔyī', 'áo mưa', 'danh từ', 8),
    lexeme(2, 'bian', '变', 'biàn', 'thay đổi', 'động từ', 9),
    lexeme(2, 'jijie', '季节', 'jìjié', 'mùa (trong năm)', 'danh từ', 10),
    lexeme(2, 'bianhua', '变化', 'biànhuà', 'thay đổi; sự thay đổi', 'động từ / danh từ', 11),
];
/** 3 từ nhóm 3 HSK 3 bài 12, đúng thứ tự nguồn 1..3. */
exports.HSK3_L12_G3_LEXEMES = [
    lexeme(3, 'dongtian', '冬天', 'dōngtiān', 'mùa đông', 'danh từ', 1),
    lexeme(3, 'changchang', '常常', 'chángcháng', 'thường, thường xuyên', 'phó từ', 2),
    lexeme(3, 'guanzhu', '关注', 'guānzhù', 'quan tâm, chú ý', 'động từ', 3),
];
/** 7 từ nhóm 4 HSK 3 bài 12, đúng thứ tự nguồn 1..7. */
exports.HSK3_L12_G4_LEXEMES = [
    lexeme(4, 'siji', '四季', 'sìjì', 'bốn mùa', 'danh từ', 1),
    lexeme(4, 'chuntian', '春天', 'chūntiān', 'mùa xuân', 'danh từ', 2),
    lexeme(4, 'xiatian', '夏天', 'xiàtiān', 'mùa hè', 'danh từ', 3),
    lexeme(4, 'liangkuai', '凉快', 'liángkuai', 'mát mẻ', 'tính từ', 4),
    lexeme(4, 'qiutian', '秋天', 'qiūtiān', 'mùa thu', 'danh từ', 5),
    lexeme(4, 'yezi', '叶子', 'yèzi', 'lá', 'danh từ', 6),
    lexeme(4, 'biancheng', '变成', 'biànchéng', 'trở thành', 'động từ', 7),
];
/** Liên kết 27 từ với bài 12, giữ thứ tự nguồn. */
exports.HSK3_L12_VOCABULARY = exports.HSK3_L12_LEXEMES.map((w) => ({
    lessonId: 'hsk3-l12',
    groupId: 'hsk3-l12-g1',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK3_L12_G2_VOCABULARY = exports.HSK3_L12_G2_LEXEMES.map((w) => ({
    lessonId: 'hsk3-l12',
    groupId: 'hsk3-l12-g2',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK3_L12_G3_VOCABULARY = exports.HSK3_L12_G3_LEXEMES.map((w) => ({
    lessonId: 'hsk3-l12',
    groupId: 'hsk3-l12-g3',
    lexemeId: w.id,
    order: w.order,
}));
exports.HSK3_L12_G4_VOCABULARY = exports.HSK3_L12_G4_LEXEMES.map((w) => ({
    lessonId: 'hsk3-l12',
    groupId: 'hsk3-l12-g4',
    lexemeId: w.id,
    order: w.order,
}));
function example(group, lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk3-l12-g${group}-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk3-l12-g${group}-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 街 "这条街很热闹。" / 开花 "春天花开了。" / 公园 "公园里有很多人。"
 *   / 船 "湖上有一条船。" / 工作日 "工作日我很忙。" / 地方 "这是一个好地方。"
 * - 刚才 "刚才我在看书。" / 刮 "外面刮风了。" / 风 "今天的风很大。"
 *   / 新闻 "我每天看新闻。" / 伞 "我带了一把伞。" / 借 "我借一本书。"
 *   / 把 "这是一把伞。" / 雨衣 "下雨了，穿雨衣。" / 变 "天气变了。"
 *   / 季节 "这个季节很冷。" / 变化 "这里的变化很大。"
 * - 冬天 "冬天很冷。" / 常常 "我常常去公园。" / 关注 "我关注天气。"
 * - 四季 "这里有四季。" / 春天 "春天很美。" / 夏天 "夏天很热。"
 *   / 凉快 "今天很凉快。" / 秋天 "秋天很凉快。" / 叶子 "树上的叶子黄了。"
 *   / 变成 "水变成冰了。"
 */
exports.HSK3_L12_EXAMPLES = [
    example(1, 'jie', '这条街很热闹。', 'zhè tiáo jiē hěn rènào.', 'Con phố này rất nhộn nhịp.'),
    example(1, 'kaihua', '春天花开了。', 'chūntiān huā kāi le.', 'Mùa xuân hoa nở.'),
    example(1, 'gongyuan', '公园里有很多人。', 'gōngyuán lǐ yǒu hěn duō rén.', 'Trong công viên có rất nhiều người.'),
    example(1, 'chuan', '湖上有一条船。', 'hú shàng yǒu yì tiáo chuán.', 'Trên hồ có một chiếc thuyền.'),
    example(1, 'gongzuori', '工作日我很忙。', 'gōngzuòrì wǒ hěn máng.', 'Ngày làm việc tôi rất bận.'),
    example(1, 'difang', '这是一个好地方。', 'zhè shì yí gè hǎo dìfang.', 'Đây là một nơi tốt.'),
];
exports.HSK3_L12_G2_EXAMPLES = [
    example(2, 'gangcai', '刚才我在看书。', 'gāngcái wǒ zài kàn shū.', 'Lúc nãy tôi đang đọc sách.'),
    example(2, 'gua', '外面刮风了。', 'wàimiàn guā fēng le.', 'Bên ngoài gió thổi rồi.'),
    example(2, 'feng', '今天的风很大。', 'jīntiān de fēng hěn dà.', 'Gió hôm nay rất lớn.'),
    example(2, 'xinwen', '我每天看新闻。', 'wǒ měitiān kàn xīnwén.', 'Tôi xem tin tức mỗi ngày.'),
    example(2, 'san', '我带了一把伞。', 'wǒ dài le yì bǎ sǎn.', 'Tôi mang theo một chiếc ô.'),
    example(2, 'jie', '我借一本书。', 'wǒ jiè yì běn shū.', 'Tôi mượn một cuốn sách.'),
    example(2, 'ba', '这是一把伞。', 'zhè shì yì bǎ sǎn.', 'Đây là một chiếc ô.'),
    example(2, 'yuyi', '下雨了，穿雨衣。', 'xià yǔ le, chuān yǔyī.', 'Mưa rồi, mặc áo mưa vào.'),
    example(2, 'bian', '天气变了。', 'tiānqì biàn le.', 'Thời tiết thay đổi rồi.'),
    example(2, 'jijie', '这个季节很冷。', 'zhège jìjié hěn lěng.', 'Mùa này rất lạnh.'),
    example(2, 'bianhua', '这里的变化很大。', 'zhèlǐ de biànhuà hěn dà.', 'Sự thay đổi ở đây rất lớn.'),
];
exports.HSK3_L12_G3_EXAMPLES = [
    example(3, 'dongtian', '冬天很冷。', 'dōngtiān hěn lěng.', 'Mùa đông rất lạnh.'),
    example(3, 'changchang', '我常常去公园。', 'wǒ chángcháng qù gōngyuán.', 'Tôi thường đi công viên.'),
    example(3, 'guanzhu', '我关注天气。', 'wǒ guānzhù tiānqì.', 'Tôi quan tâm đến thời tiết.'),
];
exports.HSK3_L12_G4_EXAMPLES = [
    example(4, 'siji', '这里有四季。', 'zhèlǐ yǒu sìjì.', 'Ở đây có bốn mùa.'),
    example(4, 'chuntian', '春天很美。', 'chūntiān hěn měi.', 'Mùa xuân rất đẹp.'),
    example(4, 'xiatian', '夏天很热。', 'xiàtiān hěn rè.', 'Mùa hè rất nóng.'),
    example(4, 'liangkuai', '今天很凉快。', 'jīntiān hěn liángkuai.', 'Hôm nay rất mát mẻ.'),
    example(4, 'qiutian', '秋天很凉快。', 'qiūtiān hěn liángkuai.', 'Mùa thu rất mát mẻ.'),
    example(4, 'yezi', '树上的叶子黄了。', 'shù shàng de yèzi huáng le.', 'Lá trên cây đã vàng.'),
    example(4, 'biancheng', '水变成冰了。', 'shuǐ biànchéng bīng le.', 'Nước đã trở thành băng.'),
];
/** Alias ngắn cho HSK3_L12_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK3_L12_EXAMPLES;
