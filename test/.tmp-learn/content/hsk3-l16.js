"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK3_L16_EXAMPLES = exports.HSK3_L16_VOCABULARY = exports.HSK3_L16_LEXEMES = exports.HSK3_L16_GROUPS = exports.HSK3_L16_GROUP4 = exports.HSK3_L16_GROUP3 = exports.HSK3_L16_GROUP2 = exports.HSK3_L16_GROUP1 = exports.HSK3_L16_LESSON = exports.HSK3_COURSE = void 0;
/**
 * Dữ liệu: HSK 3 — Bài 16 (26 từ, 4 nhóm 10+8+6+2).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (kiểm chứng 2026-11-06,
 * xem docs/content-audit.md §3a: bài 16 có 26 từ, nhóm 10+8+6+2).
 * Thứ tự + ranh giới nhóm theo bảng 生词 (file hsk3-vocabgroups.js công khai);
 * Bài 16: thứ tự trong nhóm lấy theo nguồn (chỉ số nhóm không theo thứ tự a-b-c của mảng vocab).
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép câu ví dụ của site nguồn hay toàn văn bài khóa.
 */
const hsk3_l10_1 = require("./hsk3-l10");
Object.defineProperty(exports, "HSK3_COURSE", { enumerable: true, get: function () { return hsk3_l10_1.HSK3_COURSE; } });
exports.HSK3_L16_LESSON = {
    id: 'hsk3-l16',
    courseId: 'hsk3',
    number: 16,
    title: "我听说有的熊猫出国了",
    topic: "Động vật & vườn thú",
};
exports.HSK3_L16_GROUP1 = {
    id: 'hsk3-l16-g1',
    lessonId: 'hsk3-l16',
    index: 1,
};
exports.HSK3_L16_GROUP2 = {
    id: 'hsk3-l16-g2',
    lessonId: 'hsk3-l16',
    index: 2,
};
exports.HSK3_L16_GROUP3 = {
    id: 'hsk3-l16-g3',
    lessonId: 'hsk3-l16',
    index: 3,
};
exports.HSK3_L16_GROUP4 = {
    id: 'hsk3-l16-g4',
    lessonId: 'hsk3-l16',
    index: 4,
};
exports.HSK3_L16_GROUPS = [
    exports.HSK3_L16_GROUP1,
    exports.HSK3_L16_GROUP2,
    exports.HSK3_L16_GROUP3,
    exports.HSK3_L16_GROUP4,
];
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk3';
const VERIFIED_AT = '2026-11-06';
function lexeme(groupId, idSuffix, hanzi, pinyin, meaning, pos, order) {
    const group = Number(groupId.slice(-1));
    return {
        id: `hsk3-l16-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk3',
        lessonId: 'hsk3-l16',
        groupId,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 26 từ bài 16, đúng thứ tự nguồn trong từng nhóm. */
exports.HSK3_L16_LEXEMES = [
    lexeme('hsk3-l16-g1', "zang", "脏", "zāng", "bẩn", "tính từ", 1),
    lexeme('hsk3-l16-g1', "keai", "可爱", "kě'ài", "đáng yêu", "tính từ", 2),
    lexeme('hsk3-l16-g1', "yihuir", "一会儿", "yíhuìr", "một lát", "phó từ", 3),
    lexeme('hsk3-l16-g1', "jiao", "脚", "jiǎo", "bàn chân", "danh từ", 4),
    lexeme('hsk3-l16-g1', "zhaogu", "照顾", "zhàogu", "chăm sóc", "động từ", 5),
    lexeme('hsk3-l16-g1', "haoxiang", "好像", "hǎoxiàng", "hình như; giống như", "động từ", 6),
    lexeme('hsk3-l16-g1', "rende", "认得", "rènde", "nhận ra, biết mặt/chữ", "động từ", 7),
    lexeme('hsk3-l16-g1', "zhoumo", "周末", "zhōumò", "cuối tuần", "danh từ", 8),
    lexeme('hsk3-l16-g1', "dongwuyuan", "动物园", "dòngwùyuán", "vườn thú", "danh từ", 9),
    lexeme('hsk3-l16-g1', "dongwu", "动物", "dòngwù", "động vật", "danh từ", 10),
    lexeme('hsk3-l16-g2', "daxiongmao", "大熊猫", "dàxióngmāo", "gấu trúc lớn", "danh từ", 1),
    lexeme('hsk3-l16-g2', "qiguai", "奇怪", "qíguài", "kỳ lạ", "tính từ", 2),
    lexeme('hsk3-l16-g2', "qishi", "其实", "qíshí", "thật ra, thực ra", "phó từ", 3),
    lexeme('hsk3-l16-g2', "zhuzi", "竹子", "zhúzi", "tre, trúc", "danh từ", 4),
    lexeme('hsk3-l16-g2', "guobao", "国宝", "guóbǎo", "báu vật quốc gia, quốc bảo", "danh từ", 5),
    lexeme('hsk3-l16-g2', "quan", "全", "quán", "toàn bộ, tất cả", "tính từ", 6),
    lexeme('hsk3-l16-g2', "yesheng", "野生", "yěshēng", "hoang dã", "tính từ", 7),
    lexeme('hsk3-l16-g2', "guanyu", "关于", "guānyú", "về, liên quan đến", "giới từ", 8),
    lexeme('hsk3-l16-g3', "bao", "饱", "bǎo", "no", "tính từ", 1),
    lexeme('hsk3-l16-g3', "zhang", "张", "zhāng", "mở, há", "động từ", 2),
    lexeme('hsk3-l16-g3', "zui", "嘴", "zuǐ", "miệng", "danh từ", 3),
    lexeme('hsk3-l16-g3', "shenbian", "身边", "shēnbiān", "bên cạnh (người)", "danh từ", 4),
    lexeme('hsk3-l16-g3', "bantian", "半天", "bàntiān", "nửa ngày; rất lâu", "số lượng từ", 5),
    lexeme('hsk3-l16-g3', "lian", "脸", "liǎn", "mặt, khuôn mặt", "danh từ", 6),
    lexeme('hsk3-l16-g4', "daren", "大人", "dàrén", "người lớn", "danh từ", 1),
    lexeme('hsk3-l16-g4', "xiai", "喜爱", "xǐ'ài", "yêu thích", "động từ", 2),
];
/** Liên kết 26 từ với bài 16, giữ thứ tự nguồn. */
exports.HSK3_L16_VOCABULARY = exports.HSK3_L16_LEXEMES.map((w) => ({
    lessonId: 'hsk3-l16',
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
exports.HSK3_L16_EXAMPLES = [
    example("hsk3-l16-g1-zang", "我的手很脏。", "wǒ de shǒu hěn zāng.", "Tay tôi rất bẩn."),
    example("hsk3-l16-g1-keai", "这只熊猫很可爱。", "zhè zhī xióngmāo hěn kě'ài.", "Con gấu trúc này rất đáng yêu."),
    example("hsk3-l16-g1-yihuir", "等一会儿，我马上来。", "děng yíhuìr, wǒ mǎshàng lái.", "Đợi một lát, tôi đến ngay."),
    example("hsk3-l16-g1-jiao", "我的脚有点儿疼。", "wǒ de jiǎo yǒudiǎnr téng.", "Chân tôi hơi đau."),
    example("hsk3-l16-g1-zhaogu", "请照顾好自己。", "qǐng zhàogu hǎo zìjǐ.", "Xin hãy chăm sóc tốt bản thân."),
    example("hsk3-l16-g1-haoxiang", "他好像很累。", "tā hǎoxiàng hěn lèi.", "Anh ấy hình như rất mệt."),
    example("hsk3-l16-g1-rende", "我认得这只狗。", "wǒ rènde zhè zhī gǒu.", "Tôi nhận ra con chó này."),
    example("hsk3-l16-g1-zhoumo", "周末我们去动物园。", "zhōumò wǒmen qù dòngwùyuán.", "Cuối tuần chúng tôi đi vườn thú."),
    example("hsk3-l16-g1-dongwuyuan", "动物园里有很多动物。", "dòngwùyuán lǐ yǒu hěn duō dòngwù.", "Trong vườn thú có nhiều động vật."),
    example("hsk3-l16-g1-dongwu", "熊猫是一种动物。", "xióngmāo shì yì zhǒng dòngwù.", "Gấu trúc là một loài động vật."),
    example("hsk3-l16-g2-daxiongmao", "大熊猫喜欢吃竹子。", "dàxióngmāo xǐhuān chī zhúzi.", "Gấu trúc lớn thích ăn tre trúc."),
    example("hsk3-l16-g2-qiguai", "这件事很奇怪。", "zhè jiàn shì hěn qíguài.", "Chuyện này rất kỳ lạ."),
    example("hsk3-l16-g2-qishi", "其实，我不喜欢吃辣。", "qíshí, wǒ bù xǐhuān chī là.", "Thật ra, tôi không thích ăn cay."),
    example("hsk3-l16-g2-zhuzi", "竹子长得很快。", "zhúzi zhǎng de hěn kuài.", "Tre trúc mọc rất nhanh."),
    example("hsk3-l16-g2-guobao", "熊猫是中国的国宝。", "xióngmāo shì Zhōngguó de guóbǎo.", "Gấu trúc là quốc bảo của Trung Quốc."),
    example("hsk3-l16-g2-quan", "全班同学都来了。", "quán bān tóngxué dōu lái le.", "Cả lớp đều đã đến."),
    example("hsk3-l16-g2-yesheng", "野生动物住在森林里。", "yěshēng dòngwù zhù zài sēnlín lǐ.", "Động vật hoang dã sống trong rừng."),
    example("hsk3-l16-g2-guanyu", "这本书是关于熊猫的。", "zhè běn shū shì guānyú xióngmāo de.", "Quyển sách này viết về gấu trúc."),
    example("hsk3-l16-g3-bao", "他吃了一个包子就饱了。", "tā chī le yí ge bāozi jiù bǎo le.", "Anh ấy ăn một cái bánh bao là no rồi."),
    example("hsk3-l16-g3-zhang", "请张开嘴。", "qǐng zhāng kāi zuǐ.", "Xin hãy há miệng ra."),
    example("hsk3-l16-g3-zui", "我的嘴有点儿干。", "wǒ de zuǐ yǒudiǎnr gān.", "Miệng tôi hơi khô."),
    example("hsk3-l16-g3-shenbian", "书就在我身边。", "shū jiù zài wǒ shēnbiān.", "Quyển sách ở ngay bên cạnh tôi."),
    example("hsk3-l16-g3-bantian", "我们找了半天才找到。", "wǒmen zhǎo le bàntiān cái zhǎodào.", "Chúng tôi tìm rất lâu mới thấy."),
    example("hsk3-l16-g3-lian", "她的脸红了。", "tā de liǎn hóng le.", "Mặt cô ấy đỏ lên."),
    example("hsk3-l16-g4-daren", "妈妈是大人，我是孩子。", "māma shì dàrén, wǒ shì háizi.", "Mẹ là người lớn, tôi là trẻ con."),
    example("hsk3-l16-g4-xiai", "我很喜爱这只小猫。", "wǒ hěn xǐ'ài zhè zhī xiǎo māo.", "Tôi rất yêu thích con mèo nhỏ này."),
];
/** Alias ngắn cho HSK3_L16_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK3_L16_EXAMPLES;
