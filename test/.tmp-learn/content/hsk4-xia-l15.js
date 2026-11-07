"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_XIA_L15_EXAMPLES = exports.HSK4_XIA_L15_VOCABULARY = exports.HSK4_XIA_L15_LEXEMES = exports.HSK4_XIA_L15_GROUP = exports.HSK4_XIA_L15_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_XIA_L15_LESSON = {
    id: 'hsk4-xia-l15',
    courseId: 'hsk4-xia',
    number: 15,
    title: '我去应聘了',
    topic: 'Đi ứng tuyển & thực tập: thi viết, phỏng vấn và những thu hoạch đầu đời',
};
exports.HSK4_XIA_L15_GROUP = {
    id: 'hsk4-xia-l15-g1',
    lessonId: 'hsk4-xia-l15',
    index: 1,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-ha';
const VERIFIED_AT = '2026-11-06';
function lexeme(idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-xia-l15-g1-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-xia',
        lessonId: 'hsk4-xia-l15',
        groupId: 'hsk4-xia-l15-g1',
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 37 từ bài 15, nhóm duy nhất g1, đúng thứ tự nguồn 1..37. */
exports.HSK4_XIA_L15_LEXEMES = [
    lexeme('qizhong', '期中', 'qīzhōng', 'giữa kỳ (như thi giữa kỳ)', 'Cụm từ', 1),
    lexeme('yiyao', '医药', 'yīyào', 'y dược', 'Cụm từ', 2),
    lexeme('yingpin', '应聘', 'yìngpìn', 'ứng tuyển, đi xin việc theo tin tuyển dụng', 'Cụm từ', 3),
    lexeme('zhaopin', '招聘', 'zhāopìn', 'tuyển dụng, chiêu mộ nhân sự', 'Cụm từ', 4),
    lexeme('shixi', '实习', 'shíxí', 'thực tập', 'Cụm từ', 5),
    lexeme('kaolu', '考虑', 'kǎolǜ', 'cân nhắc, suy xét', 'Cụm từ', 6),
    lexeme('danwei', '单位', 'dānwèi', 'đơn vị, cơ quan (nơi làm việc)', 'Cụm từ', 7),
    lexeme('biyesheng', '毕业生', 'bìyèshēng', 'sinh viên (sắp/mới) tốt nghiệp', 'Cụm từ', 8),
    lexeme('jingli', '经历', 'jīnglì', 'kinh nghiệm, trải nghiệm; trải qua', 'Cụm từ', 9),
    lexeme('xiaoxi', '消息', 'xiāoxi', 'tin tức, tin thông báo', 'Cụm từ', 10),
    lexeme('baoming', '报名', 'bàomíng', 'đăng ký, ghi danh', 'Cụm từ', 11),
    lexeme('tianxie', '填写', 'tiánxiě', 'điền (thông tin vào biểu mẫu)', 'Cụm từ', 12),
    lexeme('bishi', '笔试', 'bǐshì', 'thi viết; kỳ thi viết', 'Cụm từ', 13),
    lexeme('mianshi', '面试', 'miànshì', 'phỏng vấn; buổi phỏng vấn', 'Cụm từ', 14),
    lexeme('da', '答', 'dá', 'trả lời, đáp', 'Cụm từ', 15),
    lexeme('you', '由', 'yóu', 'bởi, do (chỉ người thực hiện hành động)', 'Cụm từ', 16),
    lexeme('bumen', '部门', 'bùmén', 'bộ phận, phòng ban', 'Cụm từ', 17),
    lexeme('fuzeren', '负责人', 'fùzérén', 'người phụ trách, người chịu trách nhiệm', 'Cụm từ', 18),
    lexeme('bulun', '不论', 'búlùn', 'bất luận, dù (cho)', 'Cụm từ', 19),
    lexeme('kending', '肯定', 'kěndìng', 'chắc chắn; khẳng định', 'Cụm từ', 20),
    lexeme('duanxin', '短信', 'duǎnxìn', 'tin nhắn (văn bản)', 'Cụm từ', 21),
    lexeme('jidong', '激动', 'jīdòng', 'xúc động, phấn khích; làm xúc động', 'Cụm từ', 22),
    lexeme('reng', '扔', 'rēng', 'ném, vứt', 'Cụm từ', 23),
    lexeme('lifa', '理发', 'lǐfà', 'cắt tóc', 'Cụm từ', 24),
    lexeme('jingzi', '镜子', 'jìngzi', '(cái) gương', 'Cụm từ', 25),
    lexeme('ziwo', '自我', 'zìwǒ', 'bản thân, chính mình', 'Cụm từ', 26),
    lexeme('nenggou', '能够', 'nénggòu', 'có thể, có khả năng (làm được)', 'Cụm từ', 27),
    lexeme('yunyong', '运用', 'yùnyòng', 'vận dụng, áp dụng', 'Cụm từ', 28),
    lexeme('gongchang', '工厂', 'gōngchǎng', 'nhà máy, xí nghiệp', 'Cụm từ', 29),
    lexeme('guiding', '规定', 'guīdìng', 'quy định; đưa ra quy định', 'Cụm từ', 30),
    lexeme('ketang', '课堂', 'kètáng', 'lớp học, giờ học trên lớp', 'Cụm từ', 31),
    lexeme('wanquan', '完全', 'wánquán', 'hoàn toàn; trọn vẹn', 'Cụm từ', 32),
    lexeme('liru', '例如', 'lìrú', 'ví dụ như, chẳng hạn như', 'Cụm từ', 33),
    lexeme('buru', '不如', 'bùrú', 'không bằng (so sánh kém hơn)', 'Cụm từ', 34),
    lexeme('xijie', '细节', 'xìjié', 'chi tiết, tình tiết nhỏ', 'Cụm từ', 35),
    lexeme('daan', '答案', 'dá\'àn', 'đáp án, câu trả lời', 'Cụm từ', 36),
    lexeme('zhiye', '职业', 'zhíyè', 'nghề nghiệp', 'Cụm từ', 37),
];
/** Liên kết 37 từ với bài 15, giữ thứ tự nguồn. */
exports.HSK4_XIA_L15_VOCABULARY = exports.HSK4_XIA_L15_LEXEMES.map((w) => ({
    lessonId: 'hsk4-xia-l15',
    groupId: 'hsk4-xia-l15-g1',
    lexemeId: w.id,
    order: w.order,
}));
function example(lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-xia-l15-g1-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-xia-l15-g1-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * 期中 '期中考试快到了。' / 医药 '他学习医药专业。' / 应聘 '我去那家公司应聘了。' / 招聘 '这家公司在招聘新人。' / 实习 '我在那家公司实习。' / 考虑 '请你好好考虑一下。' / 单位 '他在一家大单位工作。' / 毕业生 '今年的毕业生很多。' / 经历 '他有着丰富的经历。' / 消息 '我收到了一个好消息。' / 报名 '我已经报名了。' / 填写 '请你填写这张表。' / 笔试 '笔试在下星期一。' / 面试 '面试在明天下午。' / 答 '他答对了这个问题。' / 由 '这件事由我来做。' / 部门 '他在市场部门工作。' / 负责人 '请你找这里的负责人。' / 不论 '不论多难，我都要试一试。' / 肯定 '我肯定他会来。' / 短信 '我收到了一条短信。' / 激动 '听到好消息，我很激动。' / 扔 '请别把垃圾扔在地上。' / 理发 '我去理发了。' / 镜子 '这面镜子很干净。' / 自我 '请你做一个自我介绍。' / 能够 '我能够自己解决问题。' / 运用 '我们要学会运用知识。' / 工厂 '这家工厂很大。' / 规定 '请你遵守这里的规定。' / 课堂 '课堂上请安静。' / 完全 '我完全同意你的意见。' / 例如 '他喜欢水果，例如苹果和香蕉。' / 不如 '今天不如昨天冷。' / 细节 '请你注意细节。' / 答案 '这道题的答案是什么？' / 职业 '你的职业是什么？'
 */
exports.HSK4_XIA_L15_EXAMPLES = [
    example('qizhong', '期中考试快到了。', 'qīzhōng kǎoshì kuài dào le.', 'Kỳ thi giữa kỳ sắp đến rồi.'),
    example('yiyao', '他学习医药专业。', 'tā xuéxí yīyào zhuānyè.', 'Anh ấy học chuyên ngành y dược.'),
    example('yingpin', '我去那家公司应聘了。', 'wǒ qù nà jiā gōngsī yìngpìn le.', 'Tôi đã đến công ty đó ứng tuyển.'),
    example('zhaopin', '这家公司在招聘新人。', 'zhè jiā gōngsī zài zhāopìn xīnrén.', 'Công ty này đang tuyển dụng nhân viên mới.'),
    example('shixi', '我在那家公司实习。', 'wǒ zài nà jiā gōngsī shíxí.', 'Tôi thực tập ở công ty đó.'),
    example('kaolu', '请你好好考虑一下。', 'qǐng nǐ hǎohǎo kǎolǜ yí xià.', 'Xin bạn hãy cân nhắc kỹ một chút.'),
    example('danwei', '他在一家大单位工作。', 'tā zài yì jiā dà dānwèi gōngzuò.', 'Anh ấy làm việc ở một cơ quan lớn.'),
    example('biyesheng', '今年的毕业生很多。', 'jīnnián de bìyèshēng hěn duō.', 'Sinh viên tốt nghiệp năm nay rất đông.'),
    example('jingli', '他有着丰富的经历。', 'tā yǒuzhe fēngfù de jīnglì.', 'Anh ấy có kinh nghiệm phong phú.'),
    example('xiaoxi', '我收到了一个好消息。', 'wǒ shōu dào le yí gè hǎo xiāoxi.', 'Tôi đã nhận được một tin tốt.'),
    example('baoming', '我已经报名了。', 'wǒ yǐjīng bàomíng le.', 'Tôi đã đăng ký rồi.'),
    example('tianxie', '请你填写这张表。', 'qǐng nǐ tiánxiě zhè zhāng biǎo.', 'Xin bạn hãy điền vào tờ đơn này.'),
    example('bishi', '笔试在下星期一。', 'bǐshì zài xià xīngqī yī.', 'Kỳ thi viết vào thứ Hai tuần sau.'),
    example('mianshi', '面试在明天下午。', 'miànshì zài míngtiān xiàwǔ.', 'Buổi phỏng vấn vào chiều mai.'),
    example('da', '他答对了这个问题。', 'tā dá duì le zhège wèntí.', 'Anh ấy đã trả lời đúng câu hỏi này.'),
    example('you', '这件事由我来做。', 'zhè jiàn shì yóu wǒ lái zuò.', 'Việc này do tôi làm.'),
    example('bumen', '他在市场部门工作。', 'tā zài shìchǎng bùmén gōngzuò.', 'Anh ấy làm việc ở bộ phận thị trường.'),
    example('fuzeren', '请你找这里的负责人。', 'qǐng nǐ zhǎo zhèlǐ de fùzérén.', 'Xin bạn hãy tìm người phụ trách ở đây.'),
    example('bulun', '不论多难，我都要试一试。', 'búlùn duō nán, wǒ dōu yào shì yí shì.', 'Dù khó đến đâu, tôi cũng phải thử một lần.'),
    example('kending', '我肯定他会来。', 'wǒ kěndìng tā huì lái.', 'Tôi chắc chắn anh ấy sẽ đến.'),
    example('duanxin', '我收到了一条短信。', 'wǒ shōu dào le yì tiáo duǎnxìn.', 'Tôi đã nhận được một tin nhắn.'),
    example('jidong', '听到好消息，我很激动。', 'tīng dào hǎo xiāoxi, wǒ hěn jīdòng.', 'Nghe tin tốt, tôi rất xúc động.'),
    example('reng', '请别把垃圾扔在地上。', 'qǐng bié bǎ lājī rēng zài dìshang.', 'Xin đừng vứt rác xuống đất.'),
    example('lifa', '我去理发了。', 'wǒ qù lǐfà le.', 'Tôi đã đi cắt tóc.'),
    example('jingzi', '这面镜子很干净。', 'zhè miàn jìngzi hěn gānjìng.', 'Chiếc gương này rất sạch.'),
    example('ziwo', '请你做一个自我介绍。', 'qǐng nǐ zuò yí gè zìwǒ jièshào.', 'Xin bạn hãy tự giới thiệu bản thân.'),
    example('nenggou', '我能够自己解决问题。', 'wǒ nénggòu zìjǐ jiějué wèntí.', 'Tôi có thể tự mình giải quyết vấn đề.'),
    example('yunyong', '我们要学会运用知识。', 'wǒmen yào xuéhuì yùnyòng zhīshi.', 'Chúng ta phải học cách vận dụng kiến thức.'),
    example('gongchang', '这家工厂很大。', 'zhè jiā gōngchǎng hěn dà.', 'Nhà máy này rất lớn.'),
    example('guiding', '请你遵守这里的规定。', 'qǐng nǐ zūnshǒu zhèlǐ de guīdìng.', 'Xin bạn hãy tuân thủ quy định ở đây.'),
    example('ketang', '课堂上请安静。', 'kètáng shang qǐng ānjìng.', 'Trong giờ học xin hãy giữ yên lặng.'),
    example('wanquan', '我完全同意你的意见。', 'wǒ wánquán tóngyì nǐ de yìjiàn.', 'Tôi hoàn toàn đồng ý với ý kiến của bạn.'),
    example('liru', '他喜欢水果，例如苹果和香蕉。', 'tā xǐhuan shuǐguǒ, lìrú píngguǒ hé xiāngjiāo.', 'Anh ấy thích trái cây, ví dụ như táo và chuối.'),
    example('buru', '今天不如昨天冷。', 'jīntiān bùrú zuótiān lěng.', 'Hôm nay không lạnh bằng hôm qua.'),
    example('xijie', '请你注意细节。', 'qǐng nǐ zhùyì xìjié.', 'Xin bạn hãy chú ý đến chi tiết.'),
    example('daan', '这道题的答案是什么？', 'zhè dào tí de dá\'àn shì shénme?', 'Đáp án của câu hỏi này là gì?'),
    example('zhiye', '你的职业是什么？', 'nǐ de zhíyè shì shénme?', 'Nghề nghiệp của bạn là gì?'),
];
/** Alias ngắn cho HSK4_XIA_L15_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_XIA_L15_EXAMPLES;
