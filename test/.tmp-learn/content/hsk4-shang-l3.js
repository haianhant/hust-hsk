"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_SHANG_L3_G4_EXAMPLES = exports.HSK4_SHANG_L3_G3_EXAMPLES = exports.HSK4_SHANG_L3_G2_EXAMPLES = exports.HSK4_SHANG_L3_EXAMPLES = exports.HSK4_SHANG_L3_G4_VOCABULARY = exports.HSK4_SHANG_L3_G3_VOCABULARY = exports.HSK4_SHANG_L3_G2_VOCABULARY = exports.HSK4_SHANG_L3_VOCABULARY = exports.HSK4_SHANG_L3_G4_LEXEMES = exports.HSK4_SHANG_L3_G3_LEXEMES = exports.HSK4_SHANG_L3_G2_LEXEMES = exports.HSK4_SHANG_L3_LEXEMES = exports.HSK4_SHANG_L3_GROUP4 = exports.HSK4_SHANG_L3_GROUP3 = exports.HSK4_SHANG_L3_GROUP2 = exports.HSK4_SHANG_L3_GROUP = exports.HSK4_SHANG_L3_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_SHANG_L3_LESSON = {
    id: 'hsk4-shang-l3',
    courseId: 'hsk4-shang',
    number: 3,
    title: '手机扫一下',
    topic: 'Chỉ đường, quét mã thanh toán & mua sắm online',
};
exports.HSK4_SHANG_L3_GROUP = {
    id: 'hsk4-shang-l3-g1',
    lessonId: 'hsk4-shang-l3',
    index: 1,
};
exports.HSK4_SHANG_L3_GROUP2 = {
    id: 'hsk4-shang-l3-g2',
    lessonId: 'hsk4-shang-l3',
    index: 2,
};
exports.HSK4_SHANG_L3_GROUP3 = {
    id: 'hsk4-shang-l3-g3',
    lessonId: 'hsk4-shang-l3',
    index: 3,
};
exports.HSK4_SHANG_L3_GROUP4 = {
    id: 'hsk4-shang-l3-g4',
    lessonId: 'hsk4-shang-l3',
    index: 4,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-thuong';
const VERIFIED_AT = '2026-11-06';
function lexeme(group, idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-shang-l3-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-shang',
        lessonId: 'hsk4-shang-l3',
        groupId: `hsk4-shang-l3-g${group}`,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 7 từ nhóm 1 HSK 4 quyển thượng bài 3, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L3_LEXEMES = [
    lexeme(1, 'shizilukou', '十字路口', 'shízì lùkǒu', 'ngã tư, giao lộ', 'Danh từ', 1),
    lexeme(1, 'zhijie', '直接', 'zhíjiē', 'trực tiếp; thẳng luôn', 'Tính từ', 2),
    lexeme(1, 'zhuan', '转', 'zhuǎn', 'rẽ, quay, chuyển', 'Động từ', 3),
    lexeme(1, 'zhenghao', '正好', 'zhènghǎo', 'vừa khéo, vừa đúng lúc', 'Phó từ / Tính từ', 4),
    lexeme(1, 'shuxi', '熟悉', 'shúxī', 'quen thuộc, biết rõ', 'Động từ', 5),
    lexeme(1, 'zheng', '正', 'zhèng', 'đúng hướng, thẳng (chính: chính nam, chính bắc)', 'Tính từ', 6),
    lexeme(1, 'mudidi', '目的地', 'mùdìdì', 'điểm đến, đích đến', 'Danh từ', 7),
];
/** 12 từ nhóm 2 HSK 4 quyển thượng bài 3, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L3_G2_LEXEMES = [
    lexeme(2, 'xiazai', '下载', 'xiàzài', 'tải xuống', 'Động từ', 1),
    lexeme(2, 'jinxing', '进行', 'jìnxíng', 'tiến hành', 'Động từ', 2),
    lexeme(2, 'zhifu', '支付', 'zhīfù', 'thanh toán, trả tiền', 'Động từ', 3),
    lexeme(2, 'ruanjian', '软件', 'ruǎnjiàn', 'phần mềm, ứng dụng', 'Danh từ', 4),
    lexeme(2, 'bujin', '不仅', 'bùjǐn', 'không chỉ, không những', 'Liên từ', 5),
    lexeme(2, 'saoma', '扫码', 'sǎomǎ', 'quét mã (QR)', 'Động từ', 6),
    lexeme(2, 'jiezhang', '结账', 'jiézhàng', 'thanh toán, tính tiền', 'Động từ', 7),
    lexeme(2, 'gouwu', '购物', 'gòuwù', 'mua sắm', 'Động từ', 8),
    lexeme(2, 'ding', '订', 'dìng', 'đặt (hàng, vé, phòng…)', 'Động từ', 9),
    lexeme(2, 'kuaidi', '快递', 'kuàidì', 'chuyển phát nhanh; hàng chuyển phát', 'Danh từ', 10),
    lexeme(2, 'weixin', '微信', 'Wēixìn', 'WeChat (ứng dụng nhắn tin, thanh toán)', 'Danh từ', 11),
    lexeme(2, 'zhifubao', '支付宝', 'Zhīfùbǎo', 'Alipay (ví điện tử thanh toán)', 'Danh từ', 12),
];
/** 10 từ nhóm 3 HSK 4 quyển thượng bài 3, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L3_G3_LEXEMES = [
    lexeme(3, 'xianjin', '现金', 'xiànjīn', 'tiền mặt', 'Danh từ', 1),
    lexeme(3, 'wanggou', '网购', 'wǎnggòu', 'mua sắm trên mạng', 'Động từ', 2),
    lexeme(3, 'ji', '寄', 'jì', 'gửi (thư, bưu phẩm)', 'Động từ', 3),
    lexeme(3, 'deng', '等', 'děng', 'vân vân, các thứ (liệt kê)', 'Trợ từ', 4),
    lexeme(3, 'huo', '货', 'huò', 'hàng hóa', 'Danh từ', 5),
    lexeme(3, 'shenzhi', '甚至', 'shènzhì', 'thậm chí', 'Liên từ', 6),
    lexeme(3, 'gaibian', '改变', 'gǎibiàn', 'thay đổi; làm thay đổi', 'Động từ', 7),
    lexeme(3, 'shouzhi', '手指', 'shǒuzhǐ', 'ngón tay', 'Danh từ', 8),
    lexeme(3, 'luan', '乱', 'luàn', 'lung tung, bừa bãi; loạn', 'Phó từ / Tính từ', 9),
    lexeme(3, 'guan', '管', 'guǎn', 'đừng bận tâm, đừng để ý (khẩu ngữ: 别管）', 'Động từ', 10),
];
/** 13 từ nhóm 4 HSK 4 quyển thượng bài 3, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L3_G4_LEXEMES = [
    lexeme(4, 'tigong', '提供', 'tígōng', 'cung cấp', 'Động từ', 1),
    lexeme(4, 'shenfenzheng', '身份证', 'shēnfènzhèng', 'chứng minh thư, căn cước', 'Danh từ', 2),
    lexeme(4, 'geren', '个人', 'gèrén', 'cá nhân', 'Danh từ', 3),
    lexeme(4, 'nengfou', '能否', 'néngfǒu', 'có thể… hay không (văn viết)', 'Động từ', 4),
    lexeme(4, 'baohu', '保护', 'bǎohù', 'bảo vệ', 'Động từ', 5),
    lexeme(4, 'yushi', '于是', 'yúshì', 'thế là, do đó', 'Liên từ', 6),
    lexeme(4, 'mima', '密码', 'mìmǎ', 'mật khẩu', 'Danh từ', 7),
    lexeme(4, 'suibian', '随便', 'suíbiàn', 'tùy tiện, sao cũng được; tùy ý', 'Tính từ / Động từ / Liên từ', 8),
    lexeme(4, 'jishu', '技术', 'jìshù', 'kỹ thuật, công nghệ', 'Danh từ', 9),
    lexeme(4, 'falu', '法律', 'fǎlǜ', 'pháp luật', 'Danh từ', 10),
    lexeme(4, 'shouduan', '手段', 'shǒuduàn', 'thủ đoạn, biện pháp, cách thức', 'Danh từ', 11),
    lexeme(4, 'baozheng', '保证', 'bǎozhèng', 'đảm bảo, cam đoan', 'Động từ / Danh từ', 12),
    lexeme(4, 'wangluo', '网络', 'wǎngluò', 'mạng (internet)', 'Danh từ', 13),
];
/** Liên kết 7 từ với bài 3 (nhóm 1), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L3_VOCABULARY = exports.HSK4_SHANG_L3_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l3',
    groupId: 'hsk4-shang-l3-g1',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 12 từ với bài 3 (nhóm 2), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L3_G2_VOCABULARY = exports.HSK4_SHANG_L3_G2_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l3',
    groupId: 'hsk4-shang-l3-g2',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 10 từ với bài 3 (nhóm 3), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L3_G3_VOCABULARY = exports.HSK4_SHANG_L3_G3_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l3',
    groupId: 'hsk4-shang-l3-g3',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 13 từ với bài 3 (nhóm 4), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L3_G4_VOCABULARY = exports.HSK4_SHANG_L3_G4_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l3',
    groupId: 'hsk4-shang-l3-g4',
    lexemeId: w.id,
    order: w.order,
}));
function example(group, lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-shang-l3-g${group}-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-shang-l3-g${group}-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 十字路口 "前面就是十字路口。" / 直接 "你直接走过去就行了。" / 转 "前面左转。" / 正好 "你来得正好。" / 熟悉 "我很熟悉这条路。" / 正 "往正北走。" / 目的地 "我们的目的地是火车站。"
 * - 下载 "请先下载这个软件。" / 进行 "我们正在进行讨论。" / 支付 "你可以用手机支付。" / 软件 "这个软件很好用。" / 不仅 "他不仅会中文，还会英文。" / 扫码 "请扫码付款。" / 结账 "我们去结账吧。" / 购物 "我喜欢网上购物。" / 订 "我订了一张火车票。" / 快递 "我的快递到了。" / 微信 "请加我的微信。" / 支付宝 "我用支付宝付款。"
 * - 现金 "我没有带现金。" / 网购 "现在很多人喜欢网购。" / 寄 "我想寄一个包裹。" / 等 "苹果、香蕉等水果都很好吃。" / 货 "这批货到了。" / 甚至 "他甚至忘了自己的生日。" / 改变 "手机改变了我们的生活。" / 手指 "他的手指很长。" / 乱 "别乱放东西。" / 管 "别管我，让我自己做。"
 * - 提供 "学校提供免费的课本。" / 身份证 "请出示你的身份证。" / 个人 "这是我的个人信息。" / 能否 "请问能否帮我一个忙？" / 保护 "我们要保护个人信息。" / 于是 "他很累，于是早早睡觉了。" / 密码 "请不要告诉别人你的密码。" / 随便 "你随便坐。" / 技术 "这项技术很先进。" / 法律 "我们要遵守法律。" / 手段 "这是一种新的支付手段。" / 保证 "我保证按时完成。" / 网络 "这里的网络很快。"
 */
exports.HSK4_SHANG_L3_EXAMPLES = [
    example(1, 'shizilukou', '前面就是十字路口。', 'qiánmiàn jiùshì shízì lùkǒu.', 'Phía trước chính là ngã tư.'),
    example(1, 'zhijie', '你直接走过去就行了。', 'nǐ zhíjiē zǒu guòqù jiù xíng le.', 'Bạn cứ đi thẳng qua là được.'),
    example(1, 'zhuan', '前面左转。', 'qiánmiàn zuǒ zhuǎn.', 'Phía trước rẽ trái.'),
    example(1, 'zhenghao', '你来得正好。', 'nǐ lái de zhènghǎo.', 'Bạn đến vừa đúng lúc.'),
    example(1, 'shuxi', '我很熟悉这条路。', 'wǒ hěn shúxī zhè tiáo lù.', 'Tôi rất quen thuộc con đường này.'),
    example(1, 'zheng', '往正北走。', 'wǎng zhèng běi zǒu.', 'Đi thẳng về phía chính bắc.'),
    example(1, 'mudidi', '我们的目的地是火车站。', 'wǒmen de mùdìdì shì huǒchēzhàn.', 'Điểm đến của chúng tôi là ga tàu.'),
];
exports.HSK4_SHANG_L3_G2_EXAMPLES = [
    example(2, 'xiazai', '请先下载这个软件。', 'qǐng xiān xiàzài zhège ruǎnjiàn.', 'Xin hãy tải ứng dụng này xuống trước.'),
    example(2, 'jinxing', '我们正在进行讨论。', 'wǒmen zhèngzài jìnxíng tǎolùn.', 'Chúng tôi đang tiến hành thảo luận.'),
    example(2, 'zhifu', '你可以用手机支付。', 'nǐ kěyǐ yòng shǒujī zhīfù.', 'Bạn có thể thanh toán bằng điện thoại.'),
    example(2, 'ruanjian', '这个软件很好用。', 'zhège ruǎnjiàn hěn hǎoyòng.', 'Ứng dụng này rất dễ dùng.'),
    example(2, 'bujin', '他不仅会中文，还会英文。', 'tā bùjǐn huì Zhōngwén, hái huì Yīngwén.', 'Anh ấy không chỉ biết tiếng Trung mà còn biết tiếng Anh.'),
    example(2, 'saoma', '请扫码付款。', 'qǐng sǎomǎ fùkuǎn.', 'Xin hãy quét mã để thanh toán.'),
    example(2, 'jiezhang', '我们去结账吧。', 'wǒmen qù jiézhàng ba.', 'Chúng ta đi thanh toán nhé.'),
    example(2, 'gouwu', '我喜欢网上购物。', 'wǒ xǐhuān wǎngshàng gòuwù.', 'Tôi thích mua sắm trên mạng.'),
    example(2, 'ding', '我订了一张火车票。', 'wǒ dìng le yì zhāng huǒchē piào.', 'Tôi đã đặt một vé tàu.'),
    example(2, 'kuaidi', '我的快递到了。', 'wǒ de kuàidì dào le.', 'Hàng chuyển phát nhanh của tôi đã đến.'),
    example(2, 'weixin', '请加我的微信。', 'qǐng jiā wǒ de Wēixìn.', 'Xin hãy thêm WeChat của tôi.'),
    example(2, 'zhifubao', '我用支付宝付款。', 'wǒ yòng Zhīfùbǎo fùkuǎn.', 'Tôi thanh toán bằng Alipay.'),
];
exports.HSK4_SHANG_L3_G3_EXAMPLES = [
    example(3, 'xianjin', '我没有带现金。', 'wǒ méiyǒu dài xiànjīn.', 'Tôi không mang tiền mặt.'),
    example(3, 'wanggou', '现在很多人喜欢网购。', 'xiànzài hěn duō rén xǐhuān wǎnggòu.', 'Bây giờ nhiều người thích mua sắm trên mạng.'),
    example(3, 'ji', '我想寄一个包裹。', 'wǒ xiǎng jì yí gè bāoguǒ.', 'Tôi muốn gửi một bưu phẩm.'),
    example(3, 'deng', '苹果、香蕉等水果都很好吃。', 'píngguǒ, xiāngjiāo děng shuǐguǒ dōu hěn hǎochī.', 'Táo, chuối và các loại trái cây khác đều rất ngon.'),
    example(3, 'huo', '这批货到了。', 'zhè pī huò dào le.', 'Lô hàng này đã đến.'),
    example(3, 'shenzhi', '他甚至忘了自己的生日。', 'tā shènzhì wàng le zìjǐ de shēngrì.', 'Anh ấy thậm chí quên cả sinh nhật của mình.'),
    example(3, 'gaibian', '手机改变了我们的生活。', 'shǒujī gǎibiàn le wǒmen de shēnghuó.', 'Điện thoại đã thay đổi cuộc sống của chúng ta.'),
    example(3, 'shouzhi', '他的手指很长。', 'tā de shǒuzhǐ hěn cháng.', 'Ngón tay của anh ấy rất dài.'),
    example(3, 'luan', '别乱放东西。', 'bié luàn fàng dōngxi.', 'Đừng để đồ lung tung.'),
    example(3, 'guan', '别管我，让我自己做。', 'bié guǎn wǒ, ràng wǒ zìjǐ zuò.', 'Đừng bận tâm đến tôi, để tôi tự làm.'),
];
exports.HSK4_SHANG_L3_G4_EXAMPLES = [
    example(4, 'tigong', '学校提供免费的课本。', 'xuéxiào tígōng miǎnfèi de kèběn.', 'Trường cung cấp sách giáo khoa miễn phí.'),
    example(4, 'shenfenzheng', '请出示你的身份证。', 'qǐng chūshì nǐ de shēnfènzhèng.', 'Xin hãy xuất trình chứng minh thư của bạn.'),
    example(4, 'geren', '这是我的个人信息。', 'zhè shì wǒ de gèrén xìnxī.', 'Đây là thông tin cá nhân của tôi.'),
    example(4, 'nengfou', '请问能否帮我一个忙？', 'qǐngwèn néngfǒu bāng wǒ yí gè máng?', 'Xin hỏi có thể giúp tôi một việc được không?'),
    example(4, 'baohu', '我们要保护个人信息。', 'wǒmen yào bǎohù gèrén xìnxī.', 'Chúng ta phải bảo vệ thông tin cá nhân.'),
    example(4, 'yushi', '他很累，于是早早睡觉了。', 'tā hěn lèi, yúshì zǎozǎo shuìjiào le.', 'Anh ấy rất mệt, thế là đi ngủ sớm.'),
    example(4, 'mima', '请不要告诉别人你的密码。', 'qǐng bú yào gàosu biérén nǐ de mìmǎ.', 'Xin đừng nói mật khẩu của bạn cho người khác.'),
    example(4, 'suibian', '你随便坐。', 'nǐ suíbiàn zuò.', 'Bạn cứ ngồi tùy ý.'),
    example(4, 'jishu', '这项技术很先进。', 'zhè xiàng jìshù hěn xiānjìn.', 'Kỹ thuật này rất tiên tiến.'),
    example(4, 'falu', '我们要遵守法律。', 'wǒmen yào zūnshǒu fǎlǜ.', 'Chúng ta phải tuân thủ pháp luật.'),
    example(4, 'shouduan', '这是一种新的支付手段。', 'zhè shì yì zhǒng xīn de zhīfù shǒuduàn.', 'Đây là một phương thức thanh toán mới.'),
    example(4, 'baozheng', '我保证按时完成。', 'wǒ bǎozhèng ànshí wánchéng.', 'Tôi đảm bảo hoàn thành đúng hạn.'),
    example(4, 'wangluo', '这里的网络很快。', 'zhèlǐ de wǎngluò hěn kuài.', 'Mạng ở đây rất nhanh.'),
];
/** Alias ngắn cho HSK4_SHANG_L3_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_SHANG_L3_EXAMPLES;
