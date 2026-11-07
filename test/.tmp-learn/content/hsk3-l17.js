"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK3_L17_EXAMPLES = exports.HSK3_L17_VOCABULARY = exports.HSK3_L17_LEXEMES = exports.HSK3_L17_GROUPS = exports.HSK3_L17_GROUP4 = exports.HSK3_L17_GROUP3 = exports.HSK3_L17_GROUP2 = exports.HSK3_L17_GROUP1 = exports.HSK3_L17_LESSON = exports.HSK3_COURSE = void 0;
/**
 * Dữ liệu: HSK 3 — Bài 17 (27 từ, 4 nhóm 8+6+7+6).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (kiểm chứng 2026-11-06,
 * xem docs/content-audit.md §3a: bài 17 có 27 từ, nhóm 8+6+7+6).
 * Thứ tự + ranh giới nhóm theo bảng 生词 (file hsk3-vocabgroups.js công khai);
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép câu ví dụ của site nguồn hay toàn văn bài khóa.
 */
const hsk3_l10_1 = require("./hsk3-l10");
Object.defineProperty(exports, "HSK3_COURSE", { enumerable: true, get: function () { return hsk3_l10_1.HSK3_COURSE; } });
exports.HSK3_L17_LESSON = {
    id: 'hsk3-l17',
    courseId: 'hsk3',
    number: 17,
    title: "我要多向认真的人学习",
    topic: "Định hướng & học tập",
};
exports.HSK3_L17_GROUP1 = {
    id: 'hsk3-l17-g1',
    lessonId: 'hsk3-l17',
    index: 1,
};
exports.HSK3_L17_GROUP2 = {
    id: 'hsk3-l17-g2',
    lessonId: 'hsk3-l17',
    index: 2,
};
exports.HSK3_L17_GROUP3 = {
    id: 'hsk3-l17-g3',
    lessonId: 'hsk3-l17',
    index: 3,
};
exports.HSK3_L17_GROUP4 = {
    id: 'hsk3-l17-g4',
    lessonId: 'hsk3-l17',
    index: 4,
};
exports.HSK3_L17_GROUPS = [
    exports.HSK3_L17_GROUP1,
    exports.HSK3_L17_GROUP2,
    exports.HSK3_L17_GROUP3,
    exports.HSK3_L17_GROUP4,
];
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk3';
const VERIFIED_AT = '2026-11-06';
function lexeme(groupId, idSuffix, hanzi, pinyin, meaning, pos, order) {
    const group = Number(groupId.slice(-1));
    return {
        id: `hsk3-l17-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk3',
        lessonId: 'hsk3-l17',
        groupId,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 27 từ bài 17, đúng thứ tự nguồn trong từng nhóm. */
exports.HSK3_L17_LEXEMES = [
    lexeme('hsk3-l17-g1', "xiang", "向", "xiàng", "hướng về", "giới từ", 1),
    lexeme('hsk3-l17-g1', "louti", "楼梯", "lóutī", "cầu thang bộ", "danh từ", 2),
    lexeme('hsk3-l17-g1', "haipa", "害怕", "hàipà", "sợ, sợ hãi", "động từ", 3),
    lexeme('hsk3-l17-g1', "shengqi", "生气", "shēngqì", "giận, tức giận", "động từ", 4),
    lexeme('hsk3-l17-g1', "changjian", "常见", "chángjiàn", "thường gặp, thường thấy", "tính từ", 5),
    lexeme('hsk3-l17-g1', "congming", "聪明", "cōngming", "thông minh", "tính từ", 6),
    lexeme('hsk3-l17-g1', "cuo", "错", "cuò", "sai, lỗi, lỗi sai", "tính từ", 7),
    lexeme('hsk3-l17-g1', "renwei", "认为", "rènwéi", "cho rằng, nghĩ rằng", "động từ", 8),
    lexeme('hsk3-l17-g2', "daochu", "到处", "dàochù", "mọi nơi, khắp nơi", "phó từ", 1),
    lexeme('hsk3-l17-g2', "jixu", "继续", "jìxù", "tiếp tục", "động từ", 2),
    lexeme('hsk3-l17-g2', "tongyi", "同意", "tóngyì", "đồng ý", "động từ", 3),
    lexeme('hsk3-l17-g2', "ke", "可", "kě", "nhưng, nhưng mà; thật (nhấn mạnh)", "liên từ", 4),
    lexeme('hsk3-l17-g2', "wuzi", "屋子", "wūzi", "phòng, căn phòng, ngôi nhà", "danh từ", 5),
    lexeme('hsk3-l17-g2', "youguan", "有关", "yǒuguān", "liên quan, có liên quan", "động từ", 6),
    lexeme('hsk3-l17-g3', "guanji", "关机", "guānjī", "tắt máy", "động từ", 1),
    lexeme('hsk3-l17-g3', "qiantian", "前天", "qiántiān", "hôm kia", "danh từ", 2),
    lexeme('hsk3-l17-g3', "liuxue", "留学", "liúxué", "du học", "động từ", 3),
    lexeme('hsk3-l17-g3', "guojia", "国家", "guójiā", "quốc gia, đất nước", "danh từ", 4),
    lexeme('hsk3-l17-g3', "biru", "比如", "bǐrú", "ví dụ như, chẳng hạn", "động từ", 5),
    lexeme('hsk3-l17-g3', "cha", "查", "chá", "tra, kiểm tra", "động từ", 6),
    lexeme('hsk3-l17-g3', "youyong", "有用", "yǒuyòng", "hữu ích", "tính từ", 7),
    lexeme('hsk3-l17-g4', "rongyi", "容易", "róngyì", "dễ, dễ dàng", "tính từ", 1),
    lexeme('hsk3-l17-g4', "huida", "回答", "huídá", "trả lời", "động từ", 2),
    lexeme('hsk3-l17-g4', "fangxiang", "方向", "fāngxiàng", "phương hướng", "danh từ", 3),
    lexeme('hsk3-l17-g4', "zhiyou", "只有", "zhǐyǒu", "chỉ có", "liên từ", 4),
    lexeme('hsk3-l17-g4', "zhenzheng", "真正", "zhēnzhèng", "thực sự, thật sự", "phó từ", 5),
    lexeme('hsk3-l17-g4', "nanti", "难题", "nántí", "vấn đề khó, vấn đề nan giải", "danh từ", 6),
];
/** Liên kết 27 từ với bài 17, giữ thứ tự nguồn. */
exports.HSK3_L17_VOCABULARY = exports.HSK3_L17_LEXEMES.map((w) => ({
    lessonId: 'hsk3-l17',
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
exports.HSK3_L17_EXAMPLES = [
    example("hsk3-l17-g1-xiang", "请向左走。", "qǐng xiàng zuǒ zǒu.", "Xin hãy đi về phía trái."),
    example("hsk3-l17-g1-louti", "楼梯在教室旁边。", "lóutī zài jiàoshì pángbiān.", "Cầu thang bộ ở bên cạnh lớp học."),
    example("hsk3-l17-g1-haipa", "他害怕一个人回家。", "tā hàipà yí ge rén huí jiā.", "Anh ấy sợ về nhà một mình."),
    example("hsk3-l17-g1-shengqi", "妈妈生气了。", "māma shēngqì le.", "Mẹ giận rồi."),
    example("hsk3-l17-g1-changjian", "这种花很常见。", "zhè zhǒng huā hěn chángjiàn.", "Loài hoa này rất thường gặp."),
    example("hsk3-l17-g1-congming", "他很聪明。", "tā hěn cōngming.", "Anh ấy rất thông minh."),
    example("hsk3-l17-g1-cuo", "这道题我做错了。", "zhè dào tí wǒ zuò cuò le.", "Câu này tôi làm sai rồi."),
    example("hsk3-l17-g1-renwei", "我认为他说得对。", "wǒ rènwéi tā shuō de duì.", "Tôi cho rằng anh ấy nói đúng."),
    example("hsk3-l17-g2-daochu", "春天，到处都是花。", "chūntiān, dàochù dōu shì huā.", "Mùa xuân, đâu đâu cũng là hoa."),
    example("hsk3-l17-g2-jixu", "请继续学习。", "qǐng jìxù xuéxí.", "Xin hãy tiếp tục học."),
    example("hsk3-l17-g2-tongyi", "我同意你的看法。", "wǒ tóngyì nǐ de kànfǎ.", "Tôi đồng ý với ý kiến của bạn."),
    example("hsk3-l17-g2-ke", "他跑得可快了。", "tā pǎo de kě kuài le.", "Anh ấy chạy nhanh thật đấy."),
    example("hsk3-l17-g2-wuzi", "屋子里很干净。", "wūzi lǐ hěn gānjìng.", "Trong phòng rất sạch sẽ."),
    example("hsk3-l17-g2-youguan", "这件事和我有关。", "zhè jiàn shì hé wǒ yǒuguān.", "Chuyện này liên quan đến tôi."),
    example("hsk3-l17-g3-guanji", "睡觉前请关机。", "shuìjiào qián qǐng guānjī.", "Trước khi ngủ xin hãy tắt máy."),
    example("hsk3-l17-g3-qiantian", "前天我去了北京。", "qiántiān wǒ qù le Běijīng.", "Hôm kia tôi đã đi Bắc Kinh."),
    example("hsk3-l17-g3-liuxue", "他想去中国留学。", "tā xiǎng qù Zhōngguó liúxué.", "Anh ấy muốn sang Trung Quốc du học."),
    example("hsk3-l17-g3-guojia", "中国是一个大国家。", "Zhōngguó shì yí ge dà guójiā.", "Trung Quốc là một quốc gia lớn."),
    example("hsk3-l17-g3-biru", "我喜欢水果，比如苹果。", "wǒ xǐhuān shuǐguǒ, bǐrú píngguǒ.", "Tôi thích hoa quả, ví dụ như táo."),
    example("hsk3-l17-g3-cha", "我要查一个词。", "wǒ yào chá yí ge cí.", "Tôi muốn tra một từ."),
    example("hsk3-l17-g3-youyong", "这本书很有用。", "zhè běn shū hěn yǒuyòng.", "Quyển sách này rất hữu ích."),
    example("hsk3-l17-g4-rongyi", "这个问题很容易。", "zhège wèntí hěn róngyì.", "Vấn đề này rất dễ."),
    example("hsk3-l17-g4-huida", "请回答我的问题。", "qǐng huídá wǒ de wèntí.", "Xin hãy trả lời câu hỏi của tôi."),
    example("hsk3-l17-g4-fangxiang", "我们走错方向了。", "wǒmen zǒu cuò fāngxiàng le.", "Chúng tôi đi sai hướng rồi."),
    example("hsk3-l17-g4-zhiyou", "只有他一个人来了。", "zhǐyǒu tā yí ge rén lái le.", "Chỉ có một mình anh ấy đến."),
    example("hsk3-l17-g4-zhenzheng", "这才是真正的问题。", "zhè cái shì zhēnzhèng de wèntí.", "Đây mới là vấn đề thực sự."),
    example("hsk3-l17-g4-nanti", "这是一道难题。", "zhè shì yí dào nántí.", "Đây là một bài toán khó."),
];
/** Alias ngắn cho HSK3_L17_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK3_L17_EXAMPLES;
