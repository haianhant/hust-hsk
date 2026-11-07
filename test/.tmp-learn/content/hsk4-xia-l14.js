"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_XIA_L14_EXAMPLES = exports.HSK4_XIA_L14_VOCABULARY = exports.HSK4_XIA_L14_LEXEMES = exports.HSK4_XIA_L14_GROUP = exports.HSK4_XIA_L14_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_XIA_L14_LESSON = {
    id: 'hsk4-xia-l14',
    courseId: 'hsk4-xia',
    number: 14,
    title: '合适才买',
    topic: 'Mua sắm tỉnh táo: chọn trà, săn khuyến mãi & triết lý “hợp mới mua”',
};
exports.HSK4_XIA_L14_GROUP = {
    id: 'hsk4-xia-l14-g1',
    lessonId: 'hsk4-xia-l14',
    index: 1,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-ha';
const VERIFIED_AT = '2026-11-06';
function lexeme(idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-xia-l14-g1-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-xia',
        lessonId: 'hsk4-xia-l14',
        groupId: 'hsk4-xia-l14-g1',
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 41 từ bài 14, nhóm duy nhất g1, đúng thứ tự nguồn 1..41. */
exports.HSK4_XIA_L14_LEXEMES = [
    lexeme('chaye', '茶叶', 'cháyè', 'trà, lá trà (chè)', 'Danh từ', 1),
    lexeme('jiujing', '究竟', 'jiūjìng', 'rốt cuộc, cuối cùng thì (dùng trong câu hỏi để truy vấn)', 'Phó từ', 2),
    lexeme('fenwei', '分为', 'fēnwéi', 'chia thành, phân thành', 'Động từ', 3),
    lexeme('baoqian', '抱歉', 'bàoqiàn', 'xin lỗi, lấy làm tiếc', 'Tính từ', 4),
    lexeme('zanshi', '暂时', 'zànshí', 'tạm thời', 'Tính từ', 5),
    lexeme('man', '满', 'mǎn', 'đủ, đạt đến (một mức); đầy', 'Động từ/Tính từ', 6),
    lexeme('liang', '两', 'liǎng', 'lạng (đơn vị trọng lượng, bằng 50 gam)', 'Lượng từ', 7),
    lexeme('chaoguo', '超过', 'chāoguò', 'vượt quá, hơn', 'Động từ', 8),
    lexeme('hezi', '盒子', 'hézi', 'hộp', 'Danh từ', 9),
    lexeme('zhuang', '装', 'zhuāng', 'đựng, cho vào; lắp đặt', 'Động từ', 10),
    lexeme('gewei', '各位', 'gèwèi', 'các vị, quý vị (mọi người)', 'Đại từ', 11),
    lexeme('guke', '顾客', 'gùkè', 'khách hàng', 'Danh từ', 12),
    lexeme('ben', '本', 'běn', '(của) chính mình, bản (chỉ đơn vị/cửa hàng của phía người nói)', 'Đại từ', 13),
    lexeme('jiari', '假日', 'jiàrì', 'ngày nghỉ, ngày lễ', 'Danh từ', 14),
    lexeme('dijia', '低价', 'dījià', 'giá thấp, giá rẻ', 'Danh từ', 15),
    lexeme('cuxiao', '促销', 'cùxiāo', 'khuyến mãi, xúc tiến bán hàng', 'Động từ', 16),
    lexeme('guangbo', '广播', 'guǎngbō', 'phát thanh, loa phát thanh; phát (tin)', 'Danh từ/Động từ', 17),
    lexeme('jian', '减', 'jiǎn', 'giảm, bớt', 'Động từ', 18),
    lexeme('guanggao', '广告', 'guǎnggào', 'quảng cáo', 'Danh từ', 19),
    lexeme('shouxian', '首先', 'shǒuxiān', 'trước tiên, đầu tiên', 'Phó từ', 20),
    lexeme('paizi', '牌子', 'páizi', 'thương hiệu, nhãn hiệu', 'Danh từ', 21),
    lexeme('jiangjia', '降价', 'jiàngjià', 'giảm giá, hạ giá', 'Động từ', 22),
    lexeme('yangshi', '样式', 'yàngshì', 'kiểu dáng, mẫu mã', 'Danh từ', 23),
    lexeme('jiaqian', '价钱', 'jiàqián', 'giá cả, giá tiền', 'Danh từ', 24),
    lexeme('shangye', '商业', 'shāngyè', 'thương mại, kinh doanh', 'Danh từ', 25),
    lexeme('shangpin', '商品', 'shāngpǐn', 'hàng hóa, sản phẩm', 'Danh từ', 26),
    lexeme('zhonglei', '种类', 'zhǒnglèi', 'chủng loại, loại', 'Danh từ', 27),
    lexeme('manghe', '盲盒', 'mánghé', 'hộp mù (blind box — hộp đồ chơi bí mật)', 'Danh từ', 28),
    lexeme('que', '缺', 'quē', 'thiếu, hết (hàng)', 'Động từ', 29),
    lexeme('xuduo', '许多', 'xǔduō', 'nhiều, rất nhiều', 'Số từ', 30),
    lexeme('biaoshi', '表示', 'biǎoshì', 'bày tỏ, cho biết, thể hiện', 'Động từ', 31),
    lexeme('jiashang', '加上', 'jiāshàng', 'thêm vào đó, cộng thêm', 'Liên từ', 32),
    lexeme('taidu', '态度', 'tàidù', 'thái độ', 'Danh từ', 33),
    lexeme('youhao', '友好', 'yǒuhǎo', 'thân thiện, hữu hảo', 'Tính từ', 34),
    lexeme('shide', '使得', 'shǐde', 'khiến cho, làm cho', 'Động từ', 35),
    lexeme('zhe', '者', 'zhě', 'người (hậu tố chỉ người, như 购物者 — người mua sắm)', 'Trợ từ', 36),
    lexeme('zixi', '仔细', 'zǐxì', 'cẩn thận, kỹ lưỡng', 'Tính từ', 37),
    lexeme('duiyu', '对于', 'duìyú', 'đối với, về (một vấn đề/đối tượng)', 'Giới từ', 38),
    lexeme('buguang', '不光', 'bùguāng', 'không chỉ, không riêng', 'Liên từ/Phó từ', 39),
    lexeme('waitao', '外套', 'wàitào', 'áo khoác ngoài', 'Danh từ', 40),
    lexeme('wazi', '袜子', 'wàzi', 'tất, vớ', 'Danh từ', 41),
];
/** Liên kết 41 từ với bài 14, giữ thứ tự nguồn. */
exports.HSK4_XIA_L14_VOCABULARY = exports.HSK4_XIA_L14_LEXEMES.map((w) => ({
    lessonId: 'hsk4-xia-l14',
    groupId: 'hsk4-xia-l14-g1',
    lexemeId: w.id,
    order: w.order,
}));
function example(lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-xia-l14-g1-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-xia-l14-g1-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * 茶叶 '这种茶叶很香。' / 究竟 '这究竟是怎么回事？' / 分为 '茶叶分为很多种。' / 抱歉 '抱歉，我来晚了。' / 暂时 '我们暂时住在这里。' / 满 '这杯水满了。' / 两 '请给我三两茶叶。' / 超过 '这个价格超过了我的预算。' / 盒子 '这个盒子很漂亮。' / 装 '请把茶装进盒子里。' / 各位 '各位顾客请注意。' / 顾客 '店里有很多顾客。' / 本 '本店今天打折。' / 假日 '假日里人很多。' / 低价 '这种商品以低价出售。' / 促销 '商店正在促销。' / 广播 '广播里在放音乐。' / 减 '这件衣服减了五十块。' / 广告 '这个广告很有意思。' / 首先 '首先，请你看这里。' / 牌子 '这个牌子很有名。' / 降价 '这件衣服降价了。' / 样式 '这件衣服的样式很好看。' / 价钱 '这件衣服的价钱是多少？' / 商业 '这是一条商业街。' / 商品 '这家店的商品很多。' / 种类 '这家店的商品种类很多。' / 盲盒 '他买了一个盲盒。' / 缺 '我们不缺时间。' / 许多 '他有许多朋友。' / 表示 '我想表示感谢。' / 加上 '加上今天，我们一共来了五次。' / 态度 '他的态度很好。' / 友好 '他们对我很友好。' / 使得 '好消息使得大家很高兴。' / 者 '购物者是我们的顾客。' / 仔细 '请你仔细看这张地图。' / 对于 '对于这个问题，我没有答案。' / 不光 '他不光会说汉语，还会写汉字。' / 外套 '天气冷了，请穿上外套。' / 袜子 '这双袜子很舒服。'
 */
exports.HSK4_XIA_L14_EXAMPLES = [
    example('chaye', '这种茶叶很香。', 'zhè zhǒng cháyè hěn xiāng.', 'Loại trà này rất thơm.'),
    example('jiujing', '这究竟是怎么回事？', 'zhè jiūjìng shì zěnme huí shì?', 'Rốt cuộc đây là chuyện gì?'),
    example('fenwei', '茶叶分为很多种。', 'cháyè fēnwéi hěn duō zhǒng.', 'Trà được chia thành rất nhiều loại.'),
    example('baoqian', '抱歉，我来晚了。', 'bàoqiàn, wǒ lái wǎn le.', 'Xin lỗi, tôi đến muộn rồi.'),
    example('zanshi', '我们暂时住在这里。', 'wǒmen zànshí zhù zài zhèlǐ.', 'Chúng tôi tạm thời ở đây.'),
    example('man', '这杯水满了。', 'zhè bēi shuǐ mǎn le.', 'Cốc nước này đã đầy.'),
    example('liang', '请给我三两茶叶。', 'qǐng gěi wǒ sān liǎng cháyè.', 'Xin cho tôi ba lạng trà.'),
    example('chaoguo', '这个价格超过了我的预算。', 'zhège jiàgé chāoguò le wǒ de yùsuàn.', 'Giá này đã vượt quá ngân sách của tôi.'),
    example('hezi', '这个盒子很漂亮。', 'zhège hézi hěn piàoliang.', 'Chiếc hộp này rất đẹp.'),
    example('zhuang', '请把茶装进盒子里。', 'qǐng bǎ chá zhuāng jìn hézi lǐ.', 'Xin hãy cho trà vào trong hộp.'),
    example('gewei', '各位顾客请注意。', 'gèwèi gùkè qǐng zhùyì.', 'Kính thưa quý khách, xin chú ý.'),
    example('guke', '店里有很多顾客。', 'diàn lǐ yǒu hěn duō gùkè.', 'Trong cửa hàng có rất nhiều khách hàng.'),
    example('ben', '本店今天打折。', 'běn diàn jīntiān dǎzhé.', 'Cửa hàng chúng tôi hôm nay giảm giá.'),
    example('jiari', '假日里人很多。', 'jiàrì lǐ rén hěn duō.', 'Ngày nghỉ có rất đông người.'),
    example('dijia', '这种商品以低价出售。', 'zhè zhǒng shāngpǐn yǐ dījià chūshòu.', 'Loại hàng này được bán với giá rẻ.'),
    example('cuxiao', '商店正在促销。', 'shāngdiàn zhèngzài cùxiāo.', 'Cửa hàng đang khuyến mãi.'),
    example('guangbo', '广播里在放音乐。', 'guǎngbō lǐ zài fàng yīnyuè.', 'Trong loa phát thanh đang phát nhạc.'),
    example('jian', '这件衣服减了五十块。', 'zhè jiàn yīfu jiǎn le wǔshí kuài.', 'Chiếc áo này đã giảm năm mươi đồng.'),
    example('guanggao', '这个广告很有意思。', 'zhège guǎnggào hěn yǒu yìsi.', 'Quảng cáo này rất thú vị.'),
    example('shouxian', '首先，请你看这里。', 'shǒuxiān, qǐng nǐ kàn zhèlǐ.', 'Trước tiên, xin bạn hãy xem đây.'),
    example('paizi', '这个牌子很有名。', 'zhège páizi hěn yǒumíng.', 'Thương hiệu này rất nổi tiếng.'),
    example('jiangjia', '这件衣服降价了。', 'zhè jiàn yīfu jiàngjià le.', 'Chiếc áo này đã hạ giá.'),
    example('yangshi', '这件衣服的样式很好看。', 'zhè jiàn yīfu de yàngshì hěn hǎokàn.', 'Kiểu dáng của chiếc áo này rất đẹp.'),
    example('jiaqian', '这件衣服的价钱是多少？', 'zhè jiàn yīfu de jiàqián shì duōshao?', 'Giá tiền của chiếc áo này là bao nhiêu?'),
    example('shangye', '这是一条商业街。', 'zhè shì yì tiáo shāngyè jiē.', 'Đây là một con phố thương mại.'),
    example('shangpin', '这家店的商品很多。', 'zhè jiā diàn de shāngpǐn hěn duō.', 'Cửa hàng này có rất nhiều hàng hóa.'),
    example('zhonglei', '这家店的商品种类很多。', 'zhè jiā diàn de shāngpǐn zhǒnglèi hěn duō.', 'Cửa hàng này có rất nhiều loại hàng hóa.'),
    example('manghe', '他买了一个盲盒。', 'tā mǎi le yí gè mánghé.', 'Anh ấy đã mua một hộp mù.'),
    example('que', '我们不缺时间。', 'wǒmen bù quē shíjiān.', 'Chúng tôi không thiếu thời gian.'),
    example('xuduo', '他有许多朋友。', 'tā yǒu xǔduō péngyou.', 'Anh ấy có rất nhiều bạn.'),
    example('biaoshi', '我想表示感谢。', 'wǒ xiǎng biǎoshì gǎnxiè.', 'Tôi muốn bày tỏ lòng cảm ơn.'),
    example('jiashang', '加上今天，我们一共来了五次。', 'jiāshàng jīntiān, wǒmen yígòng lái le wǔ cì.', 'Tính thêm hôm nay, chúng ta đã đến tổng cộng năm lần.'),
    example('taidu', '他的态度很好。', 'tā de tàidù hěn hǎo.', 'Thái độ của anh ấy rất tốt.'),
    example('youhao', '他们对我很友好。', 'tāmen duì wǒ hěn yǒuhǎo.', 'Họ rất thân thiện với tôi.'),
    example('shide', '好消息使得大家很高兴。', 'hǎo xiāoxi shǐde dàjiā hěn gāoxìng.', 'Tin tốt khiến mọi người rất vui.'),
    example('zhe', '购物者是我们的顾客。', 'gòuwùzhě shì wǒmen de gùkè.', 'Người mua sắm là khách hàng của chúng tôi.'),
    example('zixi', '请你仔细看这张地图。', 'qǐng nǐ zǐxì kàn zhè zhāng dìtú.', 'Xin bạn hãy xem kỹ tấm bản đồ này.'),
    example('duiyu', '对于这个问题，我没有答案。', 'duìyú zhège wèntí, wǒ méiyǒu dá\'àn.', 'Đối với câu hỏi này, tôi không có đáp án.'),
    example('buguang', '他不光会说汉语，还会写汉字。', 'tā bùguāng huì shuō Hànyǔ, hái huì xiě Hànzì.', 'Anh ấy không chỉ biết nói tiếng Trung mà còn biết viết chữ Hán.'),
    example('waitao', '天气冷了，请穿上外套。', 'tiānqì lěng le, qǐng chuān shang wàitào.', 'Trời lạnh rồi, xin hãy mặc áo khoác vào.'),
    example('wazi', '这双袜子很舒服。', 'zhè shuāng wàzi hěn shūfu.', 'Đôi tất này rất thoải mái.'),
];
/** Alias ngắn cho HSK4_XIA_L14_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_XIA_L14_EXAMPLES;
