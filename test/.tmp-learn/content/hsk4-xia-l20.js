"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_XIA_L20_EXAMPLES = exports.HSK4_XIA_L20_VOCABULARY = exports.HSK4_XIA_L20_LEXEMES = exports.HSK4_XIA_L20_GROUP = exports.HSK4_XIA_L20_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_XIA_L20_LESSON = {
    id: 'hsk4-xia-l20',
    courseId: 'hsk4-xia',
    number: 20,
    title: "看不完也读不完",
    topic: "Du lịch khắp Trung Quốc: tàu xe, sân bay, kinh nghiệm & “đọc vạn cuốn sách, đi vạn dặm đường”",
};
exports.HSK4_XIA_L20_GROUP = {
    id: 'hsk4-xia-l20-g1',
    lessonId: 'hsk4-xia-l20',
    index: 1,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-ha';
const VERIFIED_AT = '2026-11-06';
function lexeme(idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-xia-l20-g1-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-xia',
        lessonId: 'hsk4-xia-l20',
        groupId: 'hsk4-xia-l20-g1',
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 41 từ HSK 4 quyển hạ bài 20 (nhóm duy nhất g1), đúng thứ tự nguồn 1..41. */
exports.HSK4_XIA_L20_LEXEMES = [
    lexeme("duche", "堵车", "dǔchē", "tắc xe, kẹt xe", "Động từ", 1),
    lexeme("cheng", "乘", "chéng", "đi, đáp (tàu, xe, máy bay)", "Động từ", 2),
    lexeme("nandao", "难道", "nándào", "lẽ nào, chẳng lẽ (phó từ ngữ khí, dùng trong câu phản vấn hoặc biểu thị suy đoán)", "Phó từ", 3),
    lexeme("wu", "无", "wú", "không có", "Động từ", 4),
    lexeme("dongche", "动车", "dòngchē", "tàu cao tốc (tàu động lực phân tán)", "Danh từ", 5),
    lexeme("chesu", "车速", "chēsù", "tốc độ xe/tàu", "Danh từ", 6),
    lexeme("lie", "列", "liè", "đoàn, dãy (dùng cho tàu, hàng dài)", "Lượng từ", 7),
    lexeme("wancan", "晚餐", "wǎncān", "bữa tối", "Danh từ", 8),
    lexeme("ye", "夜", "yè", "đêm, ban đêm", "Danh từ/Lượng từ", 9),
    lexeme("daba", "大巴", "dàbā", "xe buýt lớn, xe khách đường dài", "Danh từ", 10),
    lexeme("anjian", "安检", "ānjiǎn", "kiểm tra an ninh", "Động từ", 11),
    lexeme("dengji", "登机", "dēngjī", "lên máy bay", "Động từ", 12),
    lexeme("xiaoshuo", "小说", "xiǎoshuō", "tiểu thuyết", "Danh từ", 13),
    lexeme("hangban", "航班", "hángbān", "chuyến bay", "Danh từ", 14),
    lexeme("zhiji", "值机", "zhíjī", "làm thủ tục lên máy bay (check-in)", "Động từ", 15),
    lexeme("luke", "旅客", "lǚkè", "hành khách, lữ khách", "Danh từ", 16),
    lexeme("pai", "牌", "pái", "bảng, biển, thẻ", "Danh từ", 17),
    lexeme("kao", "靠", "kào", "sát, gần bên; dựa vào", "Động từ", 18),
    lexeme("chuanghu", "窗户", "chuānghu", "cửa sổ", "Danh từ", 19),
    lexeme("zhuanji", "转机", "zhuǎnjī", "chuyển máy bay, quá cảnh", "Động từ", 20),
    lexeme("congzhong", "从中", "cóngzhōng", "từ trong đó, qua đó", "Phó từ", 21),
    lexeme("zongjie", "总结", "zǒngjié", "tổng kết, đúc kết", "Động từ", 22),
    lexeme("daolu", "道路", "dàolù", "đường sá, đường đi", "Danh từ", 23),
    lexeme("tedian", "特点", "tèdiǎn", "đặc điểm", "Danh từ", 24),
    lexeme("suoyou", "所有", "suǒyǒu", "tất cả, mọi", "Tính từ", 25),
    lexeme("yijian", "意见", "yìjiàn", "ý kiến", "Danh từ", 26),
    lexeme("xi", "细", "xì", "tỉ mỉ, kỹ lưỡng; mảnh, mỏng", "Tính từ", 27),
    lexeme("fannao", "烦恼", "fánnǎo", "phiền não, bực dọc", "Tính từ", 28),
    lexeme("baifenzhi", "百分之", "bǎi fēn zhī", "phần trăm (百分之四十 = bốn mươi phần trăm, 40%)", "Cụm từ", 29),
    lexeme("jiesheng", "节省", "jiéshěng", "tiết kiệm", "Động từ", 30),
    lexeme("dang", "当", "dàng", "coi như, xem là", "Động từ", 31),
    lexeme("hongbao", "红包", "hóngbāo", "bao lì xì, phong bao đỏ", "Danh từ", 32),
    lexeme("juan", "卷", "juàn", "quyển, cuốn (dùng cho sách)", "Lượng từ", 33),
    lexeme("li", "里", "lǐ", "dặm (đơn vị đo độ dài, 1 dặm = 500 mét)", "Lượng từ", 34),
    lexeme("yaoshi", "要是", "yàoshi", "nếu, nếu như", "Liên từ", 35),
    lexeme("shaoshu", "少数", "shǎoshù", "thiểu số, số ít", "Danh từ", 36),
    lexeme("minzu", "民族", "mínzú", "dân tộc", "Danh từ", 37),
    lexeme("daoyou", "导游", "dǎoyóu", "hướng dẫn viên du lịch; dẫn tour", "Danh từ/Động từ", 38),
    lexeme("jieshi", "解释", "jiěshì", "giải thích", "Động từ", 39),
    lexeme("po", "泼", "pō", "té, hắt (nước)", "Động từ", 40),
    lexeme("liuli", "流利", "liúlì", "lưu loát, trôi chảy", "Tính từ", 41),
];
/** Liên kết 41 từ với bài 20, giữ thứ tự nguồn. */
exports.HSK4_XIA_L20_VOCABULARY = exports.HSK4_XIA_L20_LEXEMES.map((w) => ({
    lessonId: 'hsk4-xia-l20',
    groupId: 'hsk4-xia-l20-g1',
    lexemeId: w.id,
    order: w.order,
}));
function example(lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-xia-l20-g1-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-xia-l20-g1-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 堵车 "早上常常堵车。" / 乘 "我们乘火车去北京。" / 难道 "难道你不喜欢旅行吗？"
 * - 无 "山上无水无电，生活很难。" / 动车 "动车的速度很快。" / 车速 "请你慢一点儿，车速太快了。"
 * - 列 "一列火车开过来了。" / 晚餐 "我们一起吃晚餐。" / 夜 "夜里很安静。"
 * - 大巴 "我们坐大巴去机场。" / 安检 "请先过安检。" / 登机 "我们开始登机了。"
 * - 小说 "我在飞机上看小说。" / 航班 "这个航班晚点了。" / 值机 "请先去值机。"
 * - 旅客 "旅客们都在等飞机。" / 牌 "请看那块牌。" / 靠 "我的座位靠窗户。"
 * - 窗户 "请打开窗户。" / 转机 "我们要在上海转机。" / 从中 "这次旅行，我从中学到了很多。"
 * - 总结 "请你总结一下这次旅行。" / 道路 "这条道路很宽。" / 特点 "这座城市有什么特点？"
 * - 所有 "所有的旅客都上车了。" / 意见 "你有什么意见？" / 细 "请你说得细一点儿。"
 * - 烦恼 "他最近很烦恼。" / 百分之 "百分之四十的旅客坐飞机。" / 节省 "坐火车可以节省时间。"
 * - 当 "这本书可以当字典用。" / 红包 "过年的时候，妈妈给我一个红包。" / 卷 "这套书一共有五卷。"
 * - 里 "从这里到北京有一千里。" / 要是 "要是下雨，我们就不去了。" / 少数 "少数人喜欢冬天旅行。"
 * - 民族 "我们班有三个不同民族的同学。" / 导游 "导游给我们解释了很多。" / 解释 "请你解释一下这个词。"
 * - 泼 "别把水泼到地上。" / 流利 "他的汉语说得很流利。"
 */
exports.HSK4_XIA_L20_EXAMPLES = [
    example("duche", "早上常常堵车。", "Zǎoshang chángcháng dǔchē.", "Buổi sáng thường hay tắc xe."),
    example("cheng", "我们乘火车去北京。", "Wǒmen chéng huǒchē qù Běijīng.", "Chúng tôi đi tàu hỏa đến Bắc Kinh."),
    example("nandao", "难道你不喜欢旅行吗？", "Nándào nǐ bù xǐhuān lǚxíng ma?", "Lẽ nào bạn không thích du lịch sao?"),
    example("wu", "山上无水无电，生活很难。", "Shān shàng wú shuǐ wú diàn, shēnghuó hěn nán.", "Trên núi không có nước không có điện, cuộc sống rất khó khăn."),
    example("dongche", "动车的速度很快。", "Dòngchē de sùdù hěn kuài.", "Tốc độ của tàu cao tốc rất nhanh."),
    example("chesu", "请你慢一点儿，车速太快了。", "Qǐng nǐ màn yìdiǎnr, chēsù tài kuài le.", "Xin bạn hãy chậm lại một chút, tốc độ xe quá nhanh."),
    example("lie", "一列火车开过来了。", "Yí liè huǒchē kāi guòlái le.", "Một đoàn tàu đang chạy tới."),
    example("wancan", "我们一起吃晚餐。", "Wǒmen yìqǐ chī wǎncān.", "Chúng ta cùng ăn bữa tối."),
    example("ye", "夜里很安静。", "Yè lǐ hěn ānjìng.", "Ban đêm rất yên tĩnh."),
    example("daba", "我们坐大巴去机场。", "Wǒmen zuò dàbā qù jīchǎng.", "Chúng tôi đi xe buýt lớn ra sân bay."),
    example("anjian", "请先过安检。", "Qǐng xiān guò ānjiǎn.", "Xin hãy qua kiểm tra an ninh trước."),
    example("dengji", "我们开始登机了。", "Wǒmen kāishǐ dēngjī le.", "Chúng tôi bắt đầu lên máy bay."),
    example("xiaoshuo", "我在飞机上看小说。", "Wǒ zài fēijī shàng kàn xiǎoshuō.", "Tôi đọc tiểu thuyết trên máy bay."),
    example("hangban", "这个航班晚点了。", "Zhège hángbān wǎndiǎn le.", "Chuyến bay này bị chậm giờ."),
    example("zhiji", "请先去值机。", "Qǐng xiān qù zhíjī.", "Xin hãy đi làm thủ tục check-in trước."),
    example("luke", "旅客们都在等飞机。", "Lǚkè men dōu zài děng fēijī.", "Các hành khách đều đang đợi máy bay."),
    example("pai", "请看那块牌。", "Qǐng kàn nà kuài pái.", "Xin hãy nhìn tấm biển kia."),
    example("kao", "我的座位靠窗户。", "Wǒ de zuòwèi kào chuānghu.", "Chỗ ngồi của tôi sát cửa sổ."),
    example("chuanghu", "请打开窗户。", "Qǐng dǎkāi chuānghu.", "Xin hãy mở cửa sổ."),
    example("zhuanji", "我们要在上海转机。", "Wǒmen yào zài Shànghǎi zhuǎnjī.", "Chúng tôi sẽ quá cảnh ở Thượng Hải."),
    example("congzhong", "这次旅行，我从中学到了很多。", "Zhè cì lǚxíng, wǒ cóng zhōng xué dào le hěn duō.", "Chuyến du lịch lần này, tôi đã học được rất nhiều từ đó."),
    example("zongjie", "请你总结一下这次旅行。", "Qǐng nǐ zǒngjié yíxià zhè cì lǚxíng.", "Xin bạn hãy tổng kết chuyến du lịch lần này."),
    example("daolu", "这条道路很宽。", "Zhè tiáo dàolù hěn kuān.", "Con đường này rất rộng."),
    example("tedian", "这座城市有什么特点？", "Zhè zuò chéngshì yǒu shénme tèdiǎn?", "Thành phố này có đặc điểm gì?"),
    example("suoyou", "所有的旅客都上车了。", "Suǒyǒu de lǚkè dōu shàng chē le.", "Tất cả hành khách đều đã lên xe."),
    example("yijian", "你有什么意见？", "Nǐ yǒu shénme yìjiàn?", "Bạn có ý kiến gì không?"),
    example("xi", "请你说得细一点儿。", "Qǐng nǐ shuō de xì yìdiǎnr.", "Xin bạn hãy nói tỉ mỉ hơn một chút."),
    example("fannao", "他最近很烦恼。", "Tā zuìjìn hěn fánnǎo.", "Gần đây anh ấy rất phiền muộn."),
    example("baifenzhi", "百分之四十的旅客坐飞机。", "Bǎi fēn zhī sìshí de lǚkè zuò fēijī.", "Bốn mươi phần trăm hành khách đi máy bay."),
    example("jiesheng", "坐火车可以节省时间。", "Zuò huǒchē kěyǐ jiéshěng shíjiān.", "Đi tàu hỏa có thể tiết kiệm thời gian."),
    example("dang", "这本书可以当字典用。", "Zhè běn shū kěyǐ dàng zìdiǎn yòng.", "Quyển sách này có thể dùng như từ điển."),
    example("hongbao", "过年的时候，妈妈给我一个红包。", "Guònián de shíhou, māma gěi wǒ yí gè hóngbāo.", "Khi Tết đến, mẹ cho tôi một bao lì xì."),
    example("juan", "这套书一共有五卷。", "Zhè tào shū yígòng yǒu wǔ juàn.", "Bộ sách này tổng cộng có năm quyển."),
    example("li", "从这里到北京有一千里。", "Cóng zhèlǐ dào Běijīng yǒu yì qiān lǐ.", "Từ đây đến Bắc Kinh có một nghìn dặm."),
    example("yaoshi", "要是下雨，我们就不去了。", "Yàoshi xià yǔ, wǒmen jiù bú qù le.", "Nếu trời mưa, chúng tôi sẽ không đi nữa."),
    example("shaoshu", "少数人喜欢冬天旅行。", "Shǎoshù rén xǐhuān dōngtiān lǚxíng.", "Số ít người thích du lịch mùa đông."),
    example("minzu", "我们班有三个不同民族的同学。", "Wǒmen bān yǒu sān gè bùtóng mínzú de tóngxué.", "Lớp chúng tôi có ba bạn học thuộc các dân tộc khác nhau."),
    example("daoyou", "导游给我们解释了很多。", "Dǎoyóu gěi wǒmen jiěshì le hěn duō.", "Hướng dẫn viên đã giải thích cho chúng tôi rất nhiều."),
    example("jieshi", "请你解释一下这个词。", "Qǐng nǐ jiěshì yíxià zhège cí.", "Xin bạn hãy giải thích từ này."),
    example("po", "别把水泼到地上。", "Bié bǎ shuǐ pō dào dìshang.", "Đừng hắt nước xuống đất."),
    example("liuli", "他的汉语说得很流利。", "Tā de Hànyǔ shuō de hěn liúlì.", "Tiếng Trung của anh ấy nói rất lưu loát."),
];
/** Alias ngắn cho HSK4_XIA_L20_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_XIA_L20_EXAMPLES;
