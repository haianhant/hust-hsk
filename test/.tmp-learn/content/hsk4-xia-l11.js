"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_XIA_L11_EXAMPLES = exports.HSK4_XIA_L11_VOCABULARY = exports.HSK4_XIA_L11_LEXEMES = exports.HSK4_XIA_L11_GROUP = exports.HSK4_XIA_L11_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_XIA_L11_LESSON = {
    id: 'hsk4-xia-l11',
    courseId: 'hsk4-xia',
    number: 11,
    title: '活到老学到老',
    topic: 'Học tập suốt đời, lớp học số & quan niệm giáo dục con cái',
};
exports.HSK4_XIA_L11_GROUP = {
    id: 'hsk4-xia-l11-g1',
    lessonId: 'hsk4-xia-l11',
    index: 1,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-ha';
const VERIFIED_AT = '2026-11-06';
function lexeme(idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-xia-l11-g1-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-xia',
        lessonId: 'hsk4-xia-l11',
        groupId: 'hsk4-xia-l11-g1',
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 41 từ bài 11, nhóm duy nhất g1, đúng thứ tự nguồn 1..41. */
exports.HSK4_XIA_L11_LEXEMES = [
    lexeme('laonian', '老年', 'lǎonián', 'tuổi già', 'Danh từ', 1),
    lexeme('sanbu', '散步', 'sànbù', 'đi dạo, tản bộ', 'Động từ', 2),
    lexeme('fengfu', '丰富', 'fēngfù', 'phong phú', 'Tính từ', 3),
    lexeme('xianmu', '羡慕', 'xiànmù', 'ngưỡng mộ', 'Động từ', 4),
    lexeme('jishi', '即使', 'jíshǐ', 'cho dù, dù cho', 'Liên từ', 5),
    lexeme('huo', '活', 'huó', 'sống; sinh động; công việc', 'Động từ/Tính từ/Danh từ', 6),
    lexeme('jixu', '继续', 'jìxù', 'tiếp tục', 'Động từ', 7),
    lexeme('wangyou', '网友', 'wǎngyǒu', 'bạn trên mạng', 'Danh từ', 8),
    lexeme('wuliao', '无聊', 'wúliáo', 'nhàm chán, buồn tẻ', 'Tính từ', 9),
    lexeme('shuzi', '数字', 'shùzì', 'kỹ thuật số; con số', 'Tính từ/Danh từ', 10),
    lexeme('dianming', '点名', 'diǎnmíng', 'điểm danh', 'Động từ', 11),
    lexeme('jiaoshou', '教授', 'jiàoshòu', 'giáo sư', 'Danh từ', 12),
    lexeme('xianshang', '线上', 'xiànshàng', 'trực tuyến, trên mạng (online)', 'Danh từ', 13),
    lexeme('xianxia', '线下', 'xiànxià', 'trực tiếp, ngoại tuyến (offline)', 'Danh từ', 14),
    lexeme('shipin', '视频', 'shìpín', 'video', 'Danh từ', 15),
    lexeme('jilu', '记录', 'jìlù', 'bản ghi, đoạn ghi lại', 'Danh từ', 16),
    lexeme('ziliao', '资料', 'zīliào', 'tài liệu, tư liệu', 'Danh từ', 17),
    lexeme('zixue', '自学', 'zìxué', 'tự học', 'Động từ', 18),
    lexeme('kouyu', '口语', 'kǒuyǔ', 'khẩu ngữ, khả năng nói', 'Danh từ', 19),
    lexeme('keji', '科技', 'kējì', 'khoa học kỹ thuật, công nghệ', 'Danh từ', 20),
    lexeme('huoqu', '获取', 'huòqǔ', 'thu được, tiếp cận được', 'Động từ', 21),
    lexeme('limao', '礼貌', 'lǐmào', 'lễ phép, sự lịch sự', 'Danh từ/Tính từ', 22),
    lexeme('dazhaohu', '打招呼', 'dǎ zhāohu', 'chào hỏi', 'Cụm từ', 23),
    lexeme('jiazhang', '家长', 'jiāzhǎng', 'phụ huynh', 'Danh từ', 24),
    lexeme('chenggong', '成功', 'chénggōng', 'thành công', 'Tính từ/Động từ', 25),
    lexeme('fenshu', '分数', 'fēnshù', 'điểm số', 'Danh từ', 26),
    lexeme('mudi', '目的', 'mùdì', 'mục đích', 'Danh từ', 27),
    lexeme('yangcheng', '养成', 'yǎngchéng', 'hình thành, rèn thành (thói quen)', 'Động từ', 28),
    lexeme('liu', '留', 'liú', 'dành ra, để lại; ở lại', 'Động từ', 29),
    lexeme('zuofa', '做法', 'zuòfǎ', 'cách làm', 'Danh từ', 30),
    lexeme('bang', '棒', 'bàng', 'tuyệt vời, giỏi lắm', 'Tính từ', 31),
    lexeme('yisheng', '一生', 'yìshēng', 'cả đời, suốt đời', 'Danh từ', 32),
    lexeme('kuaisu', '快速', 'kuàisù', 'nhanh chóng, tốc độ cao', 'Tính từ', 33),
    lexeme('youxiu', '优秀', 'yōuxiù', 'xuất sắc, ưu tú', 'Tính từ', 34),
    lexeme('lushi', '律师', 'lǜshī', 'luật sư', 'Danh từ', 35),
    lexeme('reng', '仍', 'réng', 'vẫn, vẫn còn', 'Phó từ', 36),
    lexeme('zhunshi', '准时', 'zhǔnshí', 'đúng giờ', 'Tính từ', 37),
    lexeme('wangye', '网页', 'wǎngyè', 'trang web', 'Danh từ', 38),
    lexeme('tan', '弹', 'tán', 'chơi, gảy (nhạc cụ dây/phím)', 'Động từ', 39),
    lexeme('gangqin', '钢琴', 'gāngqín', 'đàn piano', 'Danh từ', 40),
    lexeme('chongxin', '重新', 'chóngxīn', 'lại từ đầu, một lần nữa', 'Phó từ', 41),
];
/** Liên kết 41 từ với bài 11, giữ thứ tự nguồn. */
exports.HSK4_XIA_L11_VOCABULARY = exports.HSK4_XIA_L11_LEXEMES.map((w) => ({
    lessonId: 'hsk4-xia-l11',
    groupId: 'hsk4-xia-l11-g1',
    lexemeId: w.id,
    order: w.order,
}));
function example(lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-xia-l11-g1-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-xia-l11-g1-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * 老年 '爷爷的老年生活很丰富。' / 散步 '晚上我们去公园散步。' / 丰富 '他的生活很丰富。' / 羡慕 '我很羡慕他的生活。' / 即使 '即使下雨，我也要去跑步。' / 活 '他活得很开心。' / 继续 '请你继续说。' / 网友 '我的网友住在北京。' / 无聊 '今天真无聊。' / 数字 '这个数字是什么意思？' / 点名 '老师在点名。' / 教授 '这位教授很有名。' / 线上 '我们在线上学习汉语。' / 线下 '线下的课在教室里上。' / 视频 '我看了一个视频。' / 记录 '这是一段珍贵的记录。' / 资料 '我需要一些学习资料。' / 自学 '他通过自学学会了汉语。' / 口语 '他的口语很好。' / 科技 '科技改变了我们的生活。' / 获取 '我们在网上获取信息。' / 礼貌 '对人要有礼貌。' / 打招呼 '每天早上，我跟邻居打招呼。' / 家长 '家长们都很关心孩子。' / 成功 '他终于成功了。' / 分数 '我的分数比他高。' / 目的 '你来这里的目的是什么？' / 养成 '我们要养成好习惯。' / 留 '请你留一点时间给我。' / 做法 '你的做法很对。' / 棒 '你真棒！' / 一生 '学习是一生的事。' / 快速 '他快速地回答了问题。' / 优秀 '她是一名优秀的学生。' / 律师 '我爸爸是一名律师。' / 仍 '她仍在工作。' / 准时 '他每天都准时上班。' / 网页 '这个网页很有意思。' / 弹 '她会弹钢琴。' / 钢琴 '我每天练习钢琴。' / 重新 '我们重新开始吧。'
 */
exports.HSK4_XIA_L11_EXAMPLES = [
    example('laonian', '爷爷的老年生活很丰富。', 'yéye de lǎonián shēnghuó hěn fēngfù.', 'Cuộc sống tuổi già của ông rất phong phú.'),
    example('sanbu', '晚上我们去公园散步。', 'wǎnshang wǒmen qù gōngyuán sànbù.', 'Buổi tối chúng tôi đi dạo công viên.'),
    example('fengfu', '他的生活很丰富。', 'tā de shēnghuó hěn fēngfù.', 'Cuộc sống của anh ấy rất phong phú.'),
    example('xianmu', '我很羡慕他的生活。', 'wǒ hěn xiànmù tā de shēnghuó.', 'Tôi rất ngưỡng mộ cuộc sống của anh ấy.'),
    example('jishi', '即使下雨，我也要去跑步。', 'jíshǐ xià yǔ, wǒ yě yào qù pǎobù.', 'Cho dù trời mưa, tôi cũng phải đi chạy bộ.'),
    example('huo', '他活得很开心。', 'tā huó de hěn kāixīn.', 'Anh ấy sống rất vui vẻ.'),
    example('jixu', '请你继续说。', 'qǐng nǐ jìxù shuō.', 'Xin bạn hãy nói tiếp.'),
    example('wangyou', '我的网友住在北京。', 'wǒ de wǎngyǒu zhù zài Běijīng.', 'Bạn trên mạng của tôi sống ở Bắc Kinh.'),
    example('wuliao', '今天真无聊。', 'jīntiān zhēn wúliáo.', 'Hôm nay thật nhàm chán.'),
    example('shuzi', '这个数字是什么意思？', 'zhège shùzì shì shénme yìsi?', 'Con số này có nghĩa là gì?'),
    example('dianming', '老师在点名。', 'lǎoshī zài diǎnmíng.', 'Thầy giáo đang điểm danh.'),
    example('jiaoshou', '这位教授很有名。', 'zhè wèi jiàoshòu hěn yǒumíng.', 'Vị giáo sư này rất nổi tiếng.'),
    example('xianshang', '我们在线上学习汉语。', 'wǒmen zài xiànshàng xuéxí Hànyǔ.', 'Chúng tôi học tiếng Trung trực tuyến.'),
    example('xianxia', '线下的课在教室里上。', 'xiànxià de kè zài jiàoshì lǐ shàng.', 'Lớp học trực tiếp diễn ra trong phòng học.'),
    example('shipin', '我看了一个视频。', 'wǒ kàn le yí gè shìpín.', 'Tôi đã xem một video.'),
    example('jilu', '这是一段珍贵的记录。', 'zhè shì yí duàn zhēnguì de jìlù.', 'Đây là một bản ghi quý giá.'),
    example('ziliao', '我需要一些学习资料。', 'wǒ xūyào yìxiē xuéxí zīliào.', 'Tôi cần một số tài liệu học tập.'),
    example('zixue', '他通过自学学会了汉语。', 'tā tōngguò zìxué xuéhuì le Hànyǔ.', 'Anh ấy đã học được tiếng Trung nhờ tự học.'),
    example('kouyu', '他的口语很好。', 'tā de kǒuyǔ hěn hǎo.', 'Khẩu ngữ của anh ấy rất tốt.'),
    example('keji', '科技改变了我们的生活。', 'kējì gǎibiàn le wǒmen de shēnghuó.', 'Công nghệ đã thay đổi cuộc sống của chúng ta.'),
    example('huoqu', '我们在网上获取信息。', 'wǒmen zài wǎngshang huòqǔ xìnxī.', 'Chúng tôi tiếp cận thông tin trên mạng.'),
    example('limao', '对人要有礼貌。', 'duì rén yào yǒu lǐmào.', 'Đối với người khác phải lịch sự.'),
    example('dazhaohu', '每天早上，我跟邻居打招呼。', 'měitiān zǎoshang, wǒ gēn línjū dǎ zhāohu.', 'Mỗi sáng, tôi chào hỏi hàng xóm.'),
    example('jiazhang', '家长们都很关心孩子。', 'jiāzhǎngmen dōu hěn guānxīn háizi.', 'Các phụ huynh đều rất quan tâm đến con cái.'),
    example('chenggong', '他终于成功了。', 'tā zhōngyú chénggōng le.', 'Cuối cùng anh ấy đã thành công.'),
    example('fenshu', '我的分数比他高。', 'wǒ de fēnshù bǐ tā gāo.', 'Điểm số của tôi cao hơn anh ấy.'),
    example('mudi', '你来这里的目的是什么？', 'nǐ lái zhèlǐ de mùdì shì shénme?', 'Mục đích bạn đến đây là gì?'),
    example('yangcheng', '我们要养成好习惯。', 'wǒmen yào yǎngchéng hǎo xíguàn.', 'Chúng ta phải hình thành thói quen tốt.'),
    example('liu', '请你留一点时间给我。', 'qǐng nǐ liú yì diǎn shíjiān gěi wǒ.', 'Xin bạn hãy dành ra một chút thời gian cho tôi.'),
    example('zuofa', '你的做法很对。', 'nǐ de zuòfǎ hěn duì.', 'Cách làm của bạn rất đúng.'),
    example('bang', '你真棒！', 'nǐ zhēn bàng!', 'Bạn thật tuyệt vời!'),
    example('yisheng', '学习是一生的事。', 'xuéxí shì yìshēng de shì.', 'Học tập là việc cả đời.'),
    example('kuaisu', '他快速地回答了问题。', 'tā kuàisù de huídá le wèntí.', 'Anh ấy trả lời câu hỏi rất nhanh.'),
    example('youxiu', '她是一名优秀的学生。', 'tā shì yì míng yōuxiù de xuésheng.', 'Cô ấy là một học sinh xuất sắc.'),
    example('lushi', '我爸爸是一名律师。', 'wǒ bàba shì yì míng lǜshī.', 'Bố tôi là một luật sư.'),
    example('reng', '她仍在工作。', 'tā réng zài gōngzuò.', 'Cô ấy vẫn đang làm việc.'),
    example('zhunshi', '他每天都准时上班。', 'tā měitiān dōu zhǔnshí shàngbān.', 'Anh ấy đi làm đúng giờ mỗi ngày.'),
    example('wangye', '这个网页很有意思。', 'zhège wǎngyè hěn yǒu yìsi.', 'Trang web này rất thú vị.'),
    example('tan', '她会弹钢琴。', 'tā huì tán gāngqín.', 'Cô ấy biết chơi đàn piano.'),
    example('gangqin', '我每天练习钢琴。', 'wǒ měitiān liànxí gāngqín.', 'Tôi luyện đàn piano mỗi ngày.'),
    example('chongxin', '我们重新开始吧。', 'wǒmen chóngxīn kāishǐ ba.', 'Chúng ta bắt đầu lại từ đầu nhé.'),
];
/** Alias ngắn cho HSK4_XIA_L11_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_XIA_L11_EXAMPLES;
