"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_XIA_L13_EXAMPLES = exports.HSK4_XIA_L13_VOCABULARY = exports.HSK4_XIA_L13_LEXEMES = exports.HSK4_XIA_L13_GROUP = exports.HSK4_XIA_L13_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_XIA_L13_LESSON = {
    id: 'hsk4-xia-l13',
    courseId: 'hsk4-xia',
    number: 13,
    title: '美好的日子',
    topic: 'Những ngày lễ tươi đẹp: đi chơi lễ, Trung thu đoàn viên & ký ức Tết',
};
exports.HSK4_XIA_L13_GROUP = {
    id: 'hsk4-xia-l13-g1',
    lessonId: 'hsk4-xia-l13',
    index: 1,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-ha';
const VERIFIED_AT = '2026-11-06';
function lexeme(idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-xia-l13-g1-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-xia',
        lessonId: 'hsk4-xia-l13',
        groupId: 'hsk4-xia-l13-g1',
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 43 từ bài 13, nhóm duy nhất g1, đúng thứ tự nguồn 1..43. */
exports.HSK4_XIA_L13_LEXEMES = [
    lexeme('xiong', '熊', 'xióng', 'con gấu', 'Danh từ', 1),
    lexeme('laohu', '老虎', 'lǎohǔ', 'con hổ', 'Danh từ', 2),
    lexeme('han', '喊', 'hǎn', 'hét, kêu to, gọi to', 'Động từ', 3),
    lexeme('ji', '级', 'jí', 'cấp, bậc (dùng cho cấp độ, bậc hạng)', 'Lượng từ', 4),
    lexeme('shulin', '树林', 'shùlín', 'rừng cây', 'Danh từ', 5),
    lexeme('jingqu', '景区', 'jǐngqū', 'khu danh lam thắng cảnh, khu tham quan', 'Danh từ', 6),
    lexeme('qu', '区', 'qū', 'khu, khu vực', 'Danh từ', 7),
    lexeme('mei', '美', 'měi', 'đẹp', 'Tính từ', 8),
    lexeme('jiejiari', '节假日', 'jiéjiàrì', 'ngày lễ tết và ngày nghỉ', 'Danh từ', 9),
    lexeme('qianwan', '千万', 'qiānwàn', 'nhất thiết phải, nhất định (lời dặn dò)', 'Phó từ', 10),
    lexeme('kaiwanxiao', '开玩笑', 'kāi wánxiào', 'nói đùa, đùa giỡn', 'Cụm động tân', 11),
    lexeme('yuebing', '月饼', 'yuèbǐng', 'bánh trung thu', 'Danh từ', 12),
    lexeme('putao', '葡萄', 'pútao', 'quả nho', 'Danh từ', 13),
    lexeme('xiang', '香', 'xiāng', 'thơm', 'Tính từ', 14),
    lexeme('jiedao', '街道', 'jiēdào', 'đường phố', 'Danh từ', 15),
    lexeme('juyuan', '剧院', 'jùyuàn', 'nhà hát, rạp hát', 'Danh từ', 16),
    lexeme('yanchu', '演出', 'yǎnchū', 'biểu diễn', 'Động từ', 17),
    lexeme('gan', '赶', 'gǎn', 'kịp lúc gặp đúng, rơi đúng vào (thời điểm)', 'Động từ', 18),
    lexeme('qiao', '巧', 'qiǎo', 'khéo, trùng hợp', 'Tính từ', 19),
    lexeme('zhizhong', '之中', 'zhīzhōng', 'ở trong, trong số (những người/việc nào đó)', 'Danh từ', 20),
    lexeme('tielu', '铁路', 'tiělù', 'đường sắt', 'Danh từ', 21),
    lexeme('renyuan', '人员', 'rényuán', 'nhân viên, nhân sự', 'Danh từ', 22),
    lexeme('fanxiang', '反向', 'fǎnxiàng', 'ngược hướng, đi ngược chiều', 'Động từ', 23),
    lexeme('tuanyuan', '团圆', 'tuányuán', 'đoàn viên, sum họp', 'Động từ', 24),
    lexeme('zuoyou', '左右', 'zuǒyòu', 'khoảng, chừng (đặt sau số từ để chỉ số xấp xỉ)', 'Danh từ', 25),
    lexeme('dayue', '大约', 'dàyuē', 'khoảng, chừng, đại khái', 'Phó từ', 26),
    lexeme('kao', '烤', 'kǎo', 'nướng', 'Động từ', 27),
    lexeme('xihongshi', '西红柿', 'xīhóngshì', 'cà chua', 'Danh từ', 28),
    lexeme('chuxian', '出现', 'chūxiàn', 'xuất hiện', 'Động từ', 29),
    lexeme('zuowei', '作为', 'zuòwéi', 'với tư cách là; là, làm', 'Giới từ/Động từ', 30),
    lexeme('chuantong', '传统', 'chuántǒng', 'truyền thống', 'Tính từ/Danh từ', 31),
    lexeme('youzhe', '有着', 'yǒuzhe', 'có, đang có (mang theo)', 'Động từ', 32),
    lexeme('yiyi', '意义', 'yìyì', 'ý nghĩa', 'Danh từ', 33),
    lexeme('daolai', '到来', 'dàolái', 'đến, tới (thời điểm, sự việc)', 'Động từ', 34),
    lexeme('meishi', '美食', 'měishí', 'món ăn ngon, mỹ thực', 'Danh từ', 35),
    lexeme('nianyefan', '年夜饭', 'niányèfàn', 'cơm tất niên (bữa cơm đêm giao thừa)', 'Danh từ', 36),
    lexeme('huiyi', '回忆', 'huíyì', 'hồi tưởng, nhớ lại', 'Động từ', 37),
    lexeme('tongnian', '童年', 'tóngnián', 'tuổi thơ, thời thơ ấu', 'Danh từ', 38),
    lexeme('jiyi', '记忆', 'jìyì', 'ký ức, trí nhớ', 'Danh từ', 39),
    lexeme('yi', '已', 'yǐ', 'đã', 'Phó từ', 40),
    lexeme('zhongnian', '中年', 'zhōngnián', 'tuổi trung niên', 'Danh từ', 41),
    lexeme('rengran', '仍然', 'réngrán', 'vẫn, vẫn còn', 'Phó từ', 42),
    lexeme('xiongdi', '兄弟', 'xiōngdì', 'anh em', 'Danh từ', 43),
];
/** Liên kết 43 từ với bài 13, giữ thứ tự nguồn. */
exports.HSK4_XIA_L13_VOCABULARY = exports.HSK4_XIA_L13_LEXEMES.map((w) => ({
    lessonId: 'hsk4-xia-l13',
    groupId: 'hsk4-xia-l13-g1',
    lexemeId: w.id,
    order: w.order,
}));
function example(lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-xia-l13-g1-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-xia-l13-g1-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * 熊 '动物园里有一只熊。' / 老虎 '老虎跑得很快。' / 喊 '他在大声地喊。' / 级 '他通过了三级考试。' / 树林 '树林里有很多鸟。' / 景区 '这个景区很美。' / 区 '我住在这个区。' / 美 '这里的风景很美。' / 节假日 '节假日人很多。' / 千万 '你千万别忘了。' / 开玩笑 '我跟你开玩笑呢。' / 月饼 '中秋节我们吃月饼。' / 葡萄 '这些葡萄很甜。' / 香 '这朵花很香。' / 街道 '这条街道很干净。' / 剧院 '我们在剧院看演出。' / 演出 '今晚有一场演出。' / 赶 '我赶上了最后一班车。' / 巧 '真巧，我们又见面了。' / 之中 '在他们之中，他最高。' / 铁路 '这条铁路很长。' / 人员 '车站的工作人员很多。' / 反向 '这辆车反向行驶。' / 团圆 '全家人团圆了。' / 左右 '我们要走十公里左右。' / 大约 '大约有十个人。' / 烤 '我们在烤肉。' / 西红柿 '西红柿很新鲜。' / 出现 '天上出现了一道彩虹。' / 作为 '作为老师，我要帮助学生。' / 传统 '春节是中国传统节日。' / 有着 '他有着丰富的经验。' / 意义 '这件事很有意义。' / 到来 '春天到来了。' / 美食 '这里有很多美食。' / 年夜饭 '我们一起吃年夜饭。' / 回忆 '我常常回忆童年。' / 童年 '我的童年很快乐。' / 记忆 '这是一段美好的记忆。' / 已 '他已三十岁了。' / 中年 '他已经到了中年。' / 仍然 '他仍然在学习汉语。' / 兄弟 '他们是兄弟。'
 */
exports.HSK4_XIA_L13_EXAMPLES = [
    example('xiong', '动物园里有一只熊。', 'dòngwùyuán lǐ yǒu yì zhī xióng.', 'Trong vườn thú có một con gấu.'),
    example('laohu', '老虎跑得很快。', 'lǎohǔ pǎo de hěn kuài.', 'Hổ chạy rất nhanh.'),
    example('han', '他在大声地喊。', 'tā zài dàshēng de hǎn.', 'Anh ấy đang hét to.'),
    example('ji', '他通过了三级考试。', 'tā tōngguò le sān jí kǎoshì.', 'Anh ấy đã qua kỳ thi cấp ba.'),
    example('shulin', '树林里有很多鸟。', 'shùlín lǐ yǒu hěn duō niǎo.', 'Trong rừng cây có rất nhiều chim.'),
    example('jingqu', '这个景区很美。', 'zhège jǐngqū hěn měi.', 'Khu tham quan này rất đẹp.'),
    example('qu', '我住在这个区。', 'wǒ zhù zài zhège qū.', 'Tôi sống ở khu này.'),
    example('mei', '这里的风景很美。', 'zhèlǐ de fēngjǐng hěn měi.', 'Phong cảnh ở đây rất đẹp.'),
    example('jiejiari', '节假日人很多。', 'jiéjiàrì rén hěn duō.', 'Ngày lễ tết có rất đông người.'),
    example('qianwan', '你千万别忘了。', 'nǐ qiānwàn bié wàng le.', 'Bạn nhất định đừng quên nhé.'),
    example('kaiwanxiao', '我跟你开玩笑呢。', 'wǒ gēn nǐ kāi wánxiào ne.', 'Tôi đang đùa với bạn đấy.'),
    example('yuebing', '中秋节我们吃月饼。', 'Zhōngqiūjié wǒmen chī yuèbǐng.', 'Tết Trung thu chúng tôi ăn bánh trung thu.'),
    example('putao', '这些葡萄很甜。', 'zhèxiē pútao hěn tián.', 'Những quả nho này rất ngọt.'),
    example('xiang', '这朵花很香。', 'zhè duǒ huā hěn xiāng.', 'Bông hoa này rất thơm.'),
    example('jiedao', '这条街道很干净。', 'zhè tiáo jiēdào hěn gānjìng.', 'Con đường phố này rất sạch.'),
    example('juyuan', '我们在剧院看演出。', 'wǒmen zài jùyuàn kàn yǎnchū.', 'Chúng tôi xem biểu diễn ở nhà hát.'),
    example('yanchu', '今晚有一场演出。', 'jīnwǎn yǒu yì chǎng yǎnchū.', 'Tối nay có một buổi biểu diễn.'),
    example('gan', '我赶上了最后一班车。', 'wǒ gǎnshang le zuìhòu yì bān chē.', 'Tôi đã kịp chuyến xe cuối cùng.'),
    example('qiao', '真巧，我们又见面了。', 'zhēn qiǎo, wǒmen yòu jiànmiàn le.', 'Thật trùng hợp, chúng ta lại gặp nhau.'),
    example('zhizhong', '在他们之中，他最高。', 'zài tāmen zhīzhōng, tā zuì gāo.', 'Trong số họ, anh ấy cao nhất.'),
    example('tielu', '这条铁路很长。', 'zhè tiáo tiělù hěn cháng.', 'Tuyến đường sắt này rất dài.'),
    example('renyuan', '车站的工作人员很多。', 'chēzhàn de gōngzuò rényuán hěn duō.', 'Nhân viên làm việc ở nhà ga rất đông.'),
    example('fanxiang', '这辆车反向行驶。', 'zhè liàng chē fǎnxiàng xíngshǐ.', 'Chiếc xe này đi ngược chiều.'),
    example('tuanyuan', '全家人团圆了。', 'quán jiārén tuányuán le.', 'Cả nhà đã đoàn viên.'),
    example('zuoyou', '我们要走十公里左右。', 'wǒmen yào zǒu shí gōnglǐ zuǒyòu.', 'Chúng tôi phải đi khoảng mười cây số.'),
    example('dayue', '大约有十个人。', 'dàyuē yǒu shí gè rén.', 'Khoảng có mười người.'),
    example('kao', '我们在烤肉。', 'wǒmen zài kǎo ròu.', 'Chúng tôi đang nướng thịt.'),
    example('xihongshi', '西红柿很新鲜。', 'xīhóngshì hěn xīnxiān.', 'Cà chua rất tươi.'),
    example('chuxian', '天上出现了一道彩虹。', 'tiānshang chūxiàn le yí dào cǎihóng.', 'Trên trời xuất hiện một cầu vồng.'),
    example('zuowei', '作为老师，我要帮助学生。', 'zuòwéi lǎoshī, wǒ yào bāngzhù xuésheng.', 'Là giáo viên, tôi phải giúp học sinh.'),
    example('chuantong', '春节是中国传统节日。', 'Chūnjié shì Zhōngguó chuántǒng jiérì.', 'Tết là ngày lễ truyền thống của Trung Quốc.'),
    example('youzhe', '他有着丰富的经验。', 'tā yǒuzhe fēngfù de jīngyàn.', 'Anh ấy có kinh nghiệm phong phú.'),
    example('yiyi', '这件事很有意义。', 'zhè jiàn shì hěn yǒu yìyì.', 'Việc này rất có ý nghĩa.'),
    example('daolai', '春天到来了。', 'chūntiān dàolái le.', 'Mùa xuân đã đến.'),
    example('meishi', '这里有很多美食。', 'zhèlǐ yǒu hěn duō měishí.', 'Ở đây có rất nhiều món ăn ngon.'),
    example('nianyefan', '我们一起吃年夜饭。', 'wǒmen yìqǐ chī niányèfàn.', 'Chúng tôi cùng ăn cơm tất niên.'),
    example('huiyi', '我常常回忆童年。', 'wǒ chángcháng huíyì tóngnián.', 'Tôi thường nhớ lại tuổi thơ.'),
    example('tongnian', '我的童年很快乐。', 'wǒ de tóngnián hěn kuàilè.', 'Tuổi thơ của tôi rất vui vẻ.'),
    example('jiyi', '这是一段美好的记忆。', 'zhè shì yí duàn měihǎo de jìyì.', 'Đây là một ký ức tươi đẹp.'),
    example('yi', '他已三十岁了。', 'tā yǐ sānshí suì le.', 'Anh ấy đã ba mươi tuổi rồi.'),
    example('zhongnian', '他已经到了中年。', 'tā yǐjīng dào le zhōngnián.', 'Anh ấy đã đến tuổi trung niên.'),
    example('rengran', '他仍然在学习汉语。', 'tā réngrán zài xuéxí Hànyǔ.', 'Anh ấy vẫn đang học tiếng Trung.'),
    example('xiongdi', '他们是兄弟。', 'tāmen shì xiōngdì.', 'Họ là anh em.'),
];
/** Alias ngắn cho HSK4_XIA_L13_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_XIA_L13_EXAMPLES;
