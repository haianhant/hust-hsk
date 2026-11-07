"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_XIA_L18_EXAMPLES = exports.HSK4_XIA_L18_VOCABULARY = exports.HSK4_XIA_L18_LEXEMES = exports.HSK4_XIA_L18_GROUP = exports.HSK4_XIA_L18_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_XIA_L18_LESSON = {
    id: 'hsk4-xia-l18',
    courseId: 'hsk4-xia',
    number: 18,
    title: "科技改变生活",
    topic: "Công nghệ thay đổi cuộc sống: xe đạp chia sẻ, video ngắn & dịch vụ tại nhà",
};
exports.HSK4_XIA_L18_GROUP = {
    id: 'hsk4-xia-l18-g1',
    lessonId: 'hsk4-xia-l18',
    index: 1,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-ha';
const VERIFIED_AT = '2026-11-06';
function lexeme(idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-xia-l18-g1-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-xia',
        lessonId: 'hsk4-xia-l18',
        groupId: 'hsk4-xia-l18-g1',
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 39 từ HSK 4 quyển hạ bài 18 (nhóm duy nhất g1), đúng thứ tự nguồn 1..39. */
exports.HSK4_XIA_L18_LEXEMES = [
    lexeme("cai", "猜", "cāi", "đoán", "Động từ", 1),
    lexeme("gongxiangdanche", "共享单车", "gòngxiǎng dānchē", "xe đạp chia sẻ (xe đạp công cộng dùng chung)", "Danh từ", 2),
    lexeme("chukou", "出口", "chūkǒu", "lối ra, cửa ra", "Danh từ", 3),
    lexeme("tui", "推", "tuī", "đẩy; dắt (xe)", "Động từ", 4),
    lexeme("dui", "对", "duì", "hướng vào, chĩa vào", "Động từ", 5),
    lexeme("erweima", "二维码", "èrwéimǎ", "mã QR (mã hai chiều)", "Danh từ", 6),
    lexeme("zhuce", "注册", "zhùcè", "đăng ký (tài khoản)", "Động từ", 7),
    lexeme("feiyong", "费用", "fèiyong", "chi phí, lệ phí", "Danh từ", 8),
    lexeme("shuoming", "说明", "shuōmíng", "bản hướng dẫn; giải thích, nói rõ", "Danh từ/Động từ", 9),
    lexeme("banshi", "办事", "bànshì", "làm việc, giải quyết công việc", "Động từ", 10),
    lexeme("chadianr", "差点儿", "chàdiǎnr", "suýt nữa, thiếu chút nữa", "Phó từ", 11),
    lexeme("pai", "拍", "pāi", "quay (phim), chụp (ảnh)", "Động từ", 12),
    lexeme("gege", "各个", "gègè", "mỗi, từng (cái, người); từng cái một", "Đại từ/Phó từ", 13),
    lexeme("xiaozu", "小组", "xiǎozǔ", "nhóm nhỏ, tổ", "Danh từ", 14),
    lexeme("taolun", "讨论", "tǎolùn", "thảo luận", "Động từ", 15),
    lexeme("yan", "演", "yǎn", "đóng vai, diễn", "Động từ", 16),
    lexeme("chushi", "厨师", "chúshī", "đầu bếp", "Danh từ", 17),
    lexeme("gedi", "各地", "gèdì", "các nơi, khắp các địa phương", "Danh từ", 18),
    lexeme("zhuming", "著名", "zhùmíng", "nổi tiếng, trứ danh", "Tính từ", 19),
    lexeme("xiaochi", "小吃", "xiǎochī", "món ăn vặt, món ăn nhẹ", "Danh từ", 20),
    lexeme("hulianwang", "互联网", "hùliánwǎng", "mạng internet", "Danh từ", 21),
    lexeme("dianzan", "点赞", "diǎnzàn", "bấm \"thích\" (like)", "Động từ", 22),
    lexeme("aiyanjing", "AI眼镜", "AI yǎnjìng", "kính thông minh AI", "Danh từ", 23),
    lexeme("3ddayinji", "3D打印机", "3D dǎyìnjī", "máy in 3D", "Danh từ", 24),
    lexeme("shangmen", "上门", "shàngmén", "đến tận nhà (để cung cấp dịch vụ)", "Động từ", 25),
    lexeme("daodi", "到底", "dàodǐ", "rốt cuộc (dùng trong câu hỏi để truy vấn, nhấn mạnh)", "Phó từ", 26),
    lexeme("jin", "仅", "jǐn", "chỉ, vẻn vẹn", "Phó từ", 27),
    lexeme("duoyang", "多样", "duōyàng", "đa dạng, nhiều loại", "Tính từ", 28),
    lexeme("tuichu", "推出", "tuīchū", "cho ra mắt, tung ra (sản phẩm, dịch vụ)", "Động từ", 29),
    lexeme("yuyue", "预约", "yùyuē", "đặt hẹn trước, đặt trước", "Động từ", 30),
    lexeme("qu", "取", "qǔ", "lấy, nhận (đồ)", "Động từ", 31),
    lexeme("yuanyin", "原因", "yuányīn", "nguyên nhân", "Danh từ", 32),
    lexeme("raner", "然而", "rán'ér", "tuy nhiên, nhưng mà", "Liên từ", 33),
    lexeme("bubi", "不必", "búbì", "không cần, không nhất thiết", "Phó từ", 34),
    lexeme("qinqi", "亲戚", "qīnqi", "họ hàng, bà con", "Danh từ", 35),
    lexeme("an", "按", "àn", "theo, dựa theo; ấn, bấm", "Giới từ/Động từ", 36),
    lexeme("tichu", "提出", "tíchū", "đưa ra, đề xuất", "Động từ", 37),
    lexeme("dada", "大大", "dàdà", "rất nhiều, ở mức độ lớn", "Phó từ", 38),
    lexeme("xianyou", "现有", "xiànyǒu", "hiện có, sẵn có hiện nay", "Tính từ", 39),
];
/** Liên kết 39 từ với bài 18, giữ thứ tự nguồn. */
exports.HSK4_XIA_L18_VOCABULARY = exports.HSK4_XIA_L18_LEXEMES.map((w) => ({
    lessonId: 'hsk4-xia-l18',
    groupId: 'hsk4-xia-l18-g1',
    lexemeId: w.id,
    order: w.order,
}));
function example(lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-xia-l18-g1-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-xia-l18-g1-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 猜 "你猜我在哪儿？" / 共享单车 "我每天骑共享单车去上课。" / 出口 "地铁站的出口在那边。"
 * - 推 "请你帮我推一下自行车。" / 对 "请把手机对着二维码。" / 二维码 "请你扫一下二维码。"
 * - 注册 "请先注册一个账号。" / 费用 "这个服务要收费用吗？" / 说明 "请你看一下说明书。"
 * - 办事 "我去银行办事。" / 差点儿 "我差点儿迟到了。" / 拍 "我们拍了一张照片。"
 * - 各个 "各个小组都要发言。" / 小组 "我们分成了三个小组。" / 讨论 "我们一起讨论这个问题。"
 * - 演 "他在电影里演一个厨师。" / 厨师 "这位厨师做菜很好吃。" / 各地 "各地的游客都来这里。"
 * - 著名 "这是一家著名的饭馆。" / 小吃 "我想吃一点儿小吃。" / 互联网 "现在人人都用互联网。"
 * - 点赞 "很多人给这个视频点赞。" / AI眼镜 "这副AI眼镜很贵。" / 3D打印机 "3D打印机可以打印很多东西。"
 * - 上门 "师傅上门来修电脑。" / 到底 "你到底想说什么？" / 仅 "这家店仅有三张桌子。"
 * - 多样 "这里的菜很多样。" / 推出 "公司推出了一项新服务。" / 预约 "请你先预约一下。"
 * - 取 "我去取快递。" / 原因 "这是什么原因？" / 然而 "他很累，然而还是继续工作。"
 * - 不必 "你不必担心。" / 亲戚 "我的亲戚都住在北京。" / 按 "请按说明书操作。"
 * - 提出 "他提出了一个新办法。" / 大大 "互联网大大改变了我们的生活。" / 现有 "我们要利用现有的设备。"
 */
exports.HSK4_XIA_L18_EXAMPLES = [
    example("cai", "你猜我在哪儿？", "Nǐ cāi wǒ zài nǎr?", "Bạn đoán xem tôi đang ở đâu?"),
    example("gongxiangdanche", "我每天骑共享单车去上课。", "Wǒ měitiān qí gòngxiǎng dānchē qù shàngkè.", "Mỗi ngày tôi đạp xe đạp chia sẻ đi học."),
    example("chukou", "地铁站的出口在那边。", "Dìtiě zhàn de chūkǒu zài nàbiān.", "Lối ra của ga tàu điện ngầm ở bên kia."),
    example("tui", "请你帮我推一下自行车。", "Qǐng nǐ bāng wǒ tuī yíxià zìxíngchē.", "Xin bạn giúp tôi dắt xe đạp một chút."),
    example("dui", "请把手机对着二维码。", "Qǐng bǎ shǒujī duì zhe èrwéimǎ.", "Xin hãy hướng điện thoại vào mã QR."),
    example("erweima", "请你扫一下二维码。", "Qǐng nǐ sǎo yíxià èrwéimǎ.", "Xin bạn hãy quét mã QR một cái."),
    example("zhuce", "请先注册一个账号。", "Qǐng xiān zhùcè yí gè zhànghào.", "Xin hãy đăng ký một tài khoản trước."),
    example("feiyong", "这个服务要收费用吗？", "Zhège fúwù yào shōu fèiyong ma?", "Dịch vụ này có thu phí không?"),
    example("shuoming", "请你看一下说明书。", "Qǐng nǐ kàn yíxià shuōmíngshū.", "Xin bạn hãy xem bản hướng dẫn."),
    example("banshi", "我去银行办事。", "Wǒ qù yínháng bànshì.", "Tôi đi ngân hàng giải quyết công việc."),
    example("chadianr", "我差点儿迟到了。", "Wǒ chàdiǎnr chídào le.", "Tôi suýt nữa thì đến muộn."),
    example("pai", "我们拍了一张照片。", "Wǒmen pāi le yì zhāng zhàopiàn.", "Chúng tôi đã chụp một bức ảnh."),
    example("gege", "各个小组都要发言。", "Gègè xiǎozǔ dōu yào fāyán.", "Mỗi nhóm nhỏ đều phải phát biểu."),
    example("xiaozu", "我们分成了三个小组。", "Wǒmen fēn chéng le sān gè xiǎozǔ.", "Chúng tôi chia thành ba nhóm nhỏ."),
    example("taolun", "我们一起讨论这个问题。", "Wǒmen yìqǐ tǎolùn zhège wèntí.", "Chúng ta cùng thảo luận vấn đề này."),
    example("yan", "他在电影里演一个厨师。", "Tā zài diànyǐng lǐ yǎn yí gè chúshī.", "Anh ấy đóng vai một đầu bếp trong phim."),
    example("chushi", "这位厨师做菜很好吃。", "Zhè wèi chúshī zuò cài hěn hǎochī.", "Đầu bếp này nấu ăn rất ngon."),
    example("gedi", "各地的游客都来这里。", "Gèdì de yóukè dōu lái zhèlǐ.", "Du khách khắp các nơi đều đến đây."),
    example("zhuming", "这是一家著名的饭馆。", "Zhè shì yì jiā zhùmíng de fànguǎn.", "Đây là một nhà hàng nổi tiếng."),
    example("xiaochi", "我想吃一点儿小吃。", "Wǒ xiǎng chī yìdiǎnr xiǎochī.", "Tôi muốn ăn một chút món ăn vặt."),
    example("hulianwang", "现在人人都用互联网。", "Xiànzài rénrén dōu yòng hùliánwǎng.", "Bây giờ ai cũng dùng internet."),
    example("dianzan", "很多人给这个视频点赞。", "Hěn duō rén gěi zhège shìpín diǎnzàn.", "Rất nhiều người đã bấm thích video này."),
    example("aiyanjing", "这副AI眼镜很贵。", "Zhè fù AI yǎnjìng hěn guì.", "Cặp kính thông minh AI này rất đắt."),
    example("3ddayinji", "3D打印机可以打印很多东西。", "3D dǎyìnjī kěyǐ dǎyìn hěn duō dōngxi.", "Máy in 3D có thể in rất nhiều thứ."),
    example("shangmen", "师傅上门来修电脑。", "Shīfu shàngmén lái xiū diànnǎo.", "Thợ đến tận nhà để sửa máy tính."),
    example("daodi", "你到底想说什么？", "Nǐ dàodǐ xiǎng shuō shénme?", "Rốt cuộc bạn muốn nói gì?"),
    example("jin", "这家店仅有三张桌子。", "Zhè jiā diàn jǐn yǒu sān zhāng zhuōzi.", "Cửa hàng này chỉ có ba cái bàn."),
    example("duoyang", "这里的菜很多样。", "Zhèlǐ de cài hěn duōyàng.", "Món ăn ở đây rất đa dạng."),
    example("tuichu", "公司推出了一项新服务。", "Gōngsī tuīchū le yì xiàng xīn fúwù.", "Công ty đã cho ra mắt một dịch vụ mới."),
    example("yuyue", "请你先预约一下。", "Qǐng nǐ xiān yùyuē yíxià.", "Xin bạn hãy đặt hẹn trước."),
    example("qu", "我去取快递。", "Wǒ qù qǔ kuàidì.", "Tôi đi lấy bưu kiện."),
    example("yuanyin", "这是什么原因？", "Zhè shì shénme yuányīn?", "Đây là nguyên nhân gì?"),
    example("raner", "他很累，然而还是继续工作。", "Tā hěn lèi, rán'ér háishi jìxù gōngzuò.", "Anh ấy rất mệt, tuy nhiên vẫn tiếp tục làm việc."),
    example("bubi", "你不必担心。", "Nǐ búbì dānxīn.", "Bạn không cần lo lắng."),
    example("qinqi", "我的亲戚都住在北京。", "Wǒ de qīnqi dōu zhù zài Běijīng.", "Họ hàng của tôi đều sống ở Bắc Kinh."),
    example("an", "请按说明书操作。", "Qǐng àn shuōmíngshū cāozuò.", "Xin hãy thao tác theo bản hướng dẫn."),
    example("tichu", "他提出了一个新办法。", "Tā tíchū le yí gè xīn bànfǎ.", "Anh ấy đã đưa ra một cách mới."),
    example("dada", "互联网大大改变了我们的生活。", "Hùliánwǎng dàdà gǎibiàn le wǒmen de shēnghuó.", "Internet đã thay đổi rất nhiều cuộc sống của chúng ta."),
    example("xianyou", "我们要利用现有的设备。", "Wǒmen yào lìyòng xiànyǒu de shèbèi.", "Chúng ta cần tận dụng thiết bị hiện có."),
];
/** Alias ngắn cho HSK4_XIA_L18_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_XIA_L18_EXAMPLES;
