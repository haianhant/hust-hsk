"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK3_L15_EXAMPLES = exports.HSK3_L15_VOCABULARY = exports.HSK3_L15_LEXEMES = exports.HSK3_L15_GROUPS = exports.HSK3_L15_GROUP4 = exports.HSK3_L15_GROUP3 = exports.HSK3_L15_GROUP2 = exports.HSK3_L15_GROUP1 = exports.HSK3_L15_LESSON = exports.HSK3_COURSE = void 0;
/**
 * Dữ liệu: HSK 3 — Bài 15 (26 từ, 4 nhóm 9+9+4+4).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (kiểm chứng 2026-11-06,
 * xem docs/content-audit.md §3a: bài 15 có 26 từ, nhóm 9+9+4+4).
 * Thứ tự + ranh giới nhóm theo bảng 生词 (file hsk3-vocabgroups.js công khai);
 * bài 15: 南京 ở nhóm 2, 黄河 ở nhóm 3 theo vị trí danh từ riêng của nguồn.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép câu ví dụ của site nguồn hay toàn văn bài khóa.
 */
const hsk3_l10_1 = require("./hsk3-l10");
Object.defineProperty(exports, "HSK3_COURSE", { enumerable: true, get: function () { return hsk3_l10_1.HSK3_COURSE; } });
exports.HSK3_L15_LESSON = {
    id: 'hsk3-l15',
    courseId: 'hsk3',
    number: 15,
    title: "我是半个南京人",
    topic: "Nam Kinh & Hoàng Hà",
};
exports.HSK3_L15_GROUP1 = {
    id: 'hsk3-l15-g1',
    lessonId: 'hsk3-l15',
    index: 1,
};
exports.HSK3_L15_GROUP2 = {
    id: 'hsk3-l15-g2',
    lessonId: 'hsk3-l15',
    index: 2,
};
exports.HSK3_L15_GROUP3 = {
    id: 'hsk3-l15-g3',
    lessonId: 'hsk3-l15',
    index: 3,
};
exports.HSK3_L15_GROUP4 = {
    id: 'hsk3-l15-g4',
    lessonId: 'hsk3-l15',
    index: 4,
};
exports.HSK3_L15_GROUPS = [
    exports.HSK3_L15_GROUP1,
    exports.HSK3_L15_GROUP2,
    exports.HSK3_L15_GROUP3,
    exports.HSK3_L15_GROUP4,
];
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk3';
const VERIFIED_AT = '2026-11-06';
function lexeme(groupId, idSuffix, hanzi, pinyin, meaning, pos, order) {
    const group = Number(groupId.slice(-1));
    return {
        id: `hsk3-l15-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk3',
        lessonId: 'hsk3-l15',
        groupId,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 26 từ bài 15, đúng thứ tự nguồn trong từng nhóm. */
exports.HSK3_L15_LEXEMES = [
    lexeme('hsk3-l15-g1', "lan", "蓝", "lán", "màu xanh lam", "tính từ", 1),
    lexeme('hsk3-l15-g1', "duan", "段", "duàn", "đoạn, quãng", "lượng từ", 2),
    lexeme('hsk3-l15-g1', "fujin", "附近", "fùjìn", "gần đó, lân cận", "danh từ", 3),
    lexeme('hsk3-l15-g1', "malu", "马路", "mǎlù", "đường cái", "danh từ", 4),
    lexeme('hsk3-l15-g1', "pingshi", "平时", "píngshí", "thường ngày", "danh từ", 5),
    lexeme('hsk3-l15-g1', "fangxue", "放学", "fàngxué", "tan học", "động từ", 6),
    lexeme('hsk3-l15-g1', "youxi", "游戏", "yóuxì", "trò chơi", "danh từ", 7),
    lexeme('hsk3-l15-g1', "laoren", "老人", "lǎorén", "người già", "danh từ", 8),
    lexeme('hsk3-l15-g1', "genju", "根据", "gēnjù", "căn cứ vào, dựa vào", "giới từ/động từ", 9),
    lexeme('hsk3-l15-g2', "liaojie", "了解", "liǎojiě", "hiểu rõ, tìm hiểu", "động từ", 1),
    lexeme('hsk3-l15-g2', "keshi", "可是", "kěshì", "nhưng", "liên từ", 2),
    lexeme('hsk3-l15-g2', "yishang", "以上", "yǐshàng", "trở lên", "danh từ", 3),
    lexeme('hsk3-l15-g2', "youming", "有名", "yǒumíng", "nổi tiếng", "tính từ", 4),
    lexeme('hsk3-l15-g2', "jingdian", "景点", "jǐngdiǎn", "điểm du lịch", "danh từ", 5),
    lexeme('hsk3-l15-g2', "youke", "游客", "yóukè", "du khách", "danh từ", 6),
    lexeme('hsk3-l15-g2', "waidi", "外地", "wàidì", "nơi khác, vùng khác", "danh từ", 7),
    lexeme('hsk3-l15-g2', "liao", "聊", "liáo", "trò chuyện", "động từ", 8),
    lexeme('hsk3-l15-g2', "nanjing", "南京", "nánjīng", "Nam Kinh", "danh từ riêng", 9),
    lexeme('hsk3-l15-g3', "he", "河", "hé", "sông", "danh từ", 1),
    lexeme('hsk3-l15-g3', "guanxi", "关系", "guānxi", "quan hệ", "danh từ", 2),
    lexeme('hsk3-l15-g3', "yang", "养", "yǎng", "nuôi dưỡng", "động từ", 3),
    lexeme('hsk3-l15-g3', "huanghe", "黄河", "huáng hé", "sông Hoàng Hà", "danh từ riêng", 4),
    lexeme('hsk3-l15-g4', "xibei", "西北", "xīběi", "tây bắc", "danh từ", 1),
    lexeme('hsk3-l15-g4', "jingguo", "经过", "jīngguò", "đi qua, trải qua", "động từ", 2),
    lexeme('hsk3-l15-g4', "caodi", "草地", "cǎodì", "thảm cỏ", "danh từ", 3),
    lexeme('hsk3-l15-g4', "yujian", "遇见", "yùjiàn", "tình cờ gặp", "động từ", 4),
];
/** Liên kết 26 từ với bài 15, giữ thứ tự nguồn. */
exports.HSK3_L15_VOCABULARY = exports.HSK3_L15_LEXEMES.map((w) => ({
    lessonId: 'hsk3-l15',
    groupId: w.groupId,
    lexemeId: w.id,
    order: w.order,
}));
function example(lexemeId, hanzi, pinyin, meaning) {
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
exports.HSK3_L15_EXAMPLES = [
    example("hsk3-l15-g1-lan", "天空是蓝色的。", "tiānkōng shì lán sè de.", "Bầu trời màu xanh lam."),
    example("hsk3-l15-g1-duan", "这段路不长。", "zhè duàn lù bù cháng.", "Đoạn đường này không dài."),
    example("hsk3-l15-g1-fujin", "学校附近有一家书店。", "xuéxiào fùjìn yǒu yì jiā shūdiàn.", "Gần trường có một hiệu sách."),
    example("hsk3-l15-g1-malu", "马路上有很多车。", "mǎlù shàng yǒu hěn duō chē.", "Trên đường cái có nhiều xe."),
    example("hsk3-l15-g1-pingshi", "我平时喜欢跑步。", "wǒ píngshí xǐhuān pǎobù.", "Thường ngày tôi thích chạy bộ."),
    example("hsk3-l15-g1-fangxue", "我们下午四点放学。", "wǒmen xiàwǔ sì diǎn fàngxué.", "Chúng tôi tan học lúc bốn giờ chiều."),
    example("hsk3-l15-g1-youxi", "这个游戏很有意思。", "zhège yóuxì hěn yǒu yìsi.", "Trò chơi này rất thú vị."),
    example("hsk3-l15-g1-laoren", "这位老人七十岁了。", "zhè wèi lǎorén qīshí suì le.", "Cụ già này bảy mươi tuổi rồi."),
    example("hsk3-l15-g1-genju", "我们根据地图走。", "wǒmen gēnjù dìtú zǒu.", "Chúng tôi đi theo bản đồ."),
    example("hsk3-l15-g2-liaojie", "我想了解南京。", "wǒ xiǎng liǎojiě Nánjīng.", "Tôi muốn tìm hiểu Nam Kinh."),
    example("hsk3-l15-g2-keshi", "我想去，可是没有时间。", "wǒ xiǎng qù, kěshì méiyǒu shíjiān.", "Tôi muốn đi, nhưng không có thời gian."),
    example("hsk3-l15-g2-yishang", "三十岁以上的人可以参加。", "sānshí suì yǐshàng de rén kěyǐ cānjiā.", "Người từ ba mươi tuổi trở lên có thể tham gia."),
    example("hsk3-l15-g2-youming", "南京是一个有名的城市。", "Nánjīng shì yí ge yǒumíng de chéngshì.", "Nam Kinh là một thành phố nổi tiếng."),
    example("hsk3-l15-g2-jingdian", "这个景点很漂亮。", "zhège jǐngdiǎn hěn piàoliang.", "Điểm du lịch này rất đẹp."),
    example("hsk3-l15-g2-youke", "这里有很多游客。", "zhèlǐ yǒu hěn duō yóukè.", "Ở đây có nhiều du khách."),
    example("hsk3-l15-g2-waidi", "他从外地来。", "tā cóng wàidì lái.", "Anh ấy từ nơi khác đến."),
    example("hsk3-l15-g2-liao", "我们一起聊聊天吧。", "wǒmen yìqǐ liáo liáo tiān ba.", "Chúng ta cùng trò chuyện nhé."),
    example("hsk3-l15-g2-nanjing", "南京在江苏。", "Nánjīng zài Jiāngsū.", "Nam Kinh ở Giang Tô."),
    example("hsk3-l15-g3-he", "这条河很长。", "zhè tiáo hé hěn cháng.", "Con sông này rất dài."),
    example("hsk3-l15-g3-guanxi", "他们关系很好。", "tāmen guānxi hěn hǎo.", "Quan hệ của họ rất tốt."),
    example("hsk3-l15-g3-yang", "奶奶养了一只猫。", "nǎinai yǎng le yì zhī māo.", "Bà nội nuôi một con mèo."),
    example("hsk3-l15-g3-huanghe", "黄河是中国的大河。", "Huáng Hé shì Zhōngguó de dà hé.", "Sông Hoàng Hà là con sông lớn của Trung Quốc."),
    example("hsk3-l15-g4-xibei", "西北的冬天很冷。", "xīběi de dōngtiān hěn lěng.", "Mùa đông ở tây bắc rất lạnh."),
    example("hsk3-l15-g4-jingguo", "我们经过了学校。", "wǒmen jīngguò le xuéxiào.", "Chúng tôi đã đi qua trường."),
    example("hsk3-l15-g4-caodi", "草地上有花。", "cǎodì shàng yǒu huā.", "Trên thảm cỏ có hoa."),
    example("hsk3-l15-g4-yujian", "我在路上遇见了他。", "wǒ zài lùshang yùjiàn le tā.", "Tôi tình cờ gặp anh ấy trên đường."),
];
/** Alias ngắn cho HSK3_L15_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK3_L15_EXAMPLES;
