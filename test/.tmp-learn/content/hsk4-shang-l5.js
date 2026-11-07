"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLES = exports.HSK4_SHANG_L5_G4_EXAMPLES = exports.HSK4_SHANG_L5_G3_EXAMPLES = exports.HSK4_SHANG_L5_G2_EXAMPLES = exports.HSK4_SHANG_L5_EXAMPLES = exports.HSK4_SHANG_L5_G4_VOCABULARY = exports.HSK4_SHANG_L5_G3_VOCABULARY = exports.HSK4_SHANG_L5_G2_VOCABULARY = exports.HSK4_SHANG_L5_VOCABULARY = exports.HSK4_SHANG_L5_G4_LEXEMES = exports.HSK4_SHANG_L5_G3_LEXEMES = exports.HSK4_SHANG_L5_G2_LEXEMES = exports.HSK4_SHANG_L5_LEXEMES = exports.HSK4_SHANG_L5_GROUP4 = exports.HSK4_SHANG_L5_GROUP3 = exports.HSK4_SHANG_L5_GROUP2 = exports.HSK4_SHANG_L5_GROUP = exports.HSK4_SHANG_L5_LESSON = exports.HSK4_COURSE = void 0;
const hsk4_shang_l1_1 = require("./hsk4-shang-l1");
Object.defineProperty(exports, "HSK4_COURSE", { enumerable: true, get: function () { return hsk4_shang_l1_1.HSK4_COURSE; } });
exports.HSK4_SHANG_L5_LESSON = {
    id: 'hsk4-shang-l5',
    courseId: 'hsk4-shang',
    number: 5,
    title: '“不怕辣”和“怕不辣”',
    topic: 'Ẩm thực, khẩu vị & văn hóa ăn uống',
};
exports.HSK4_SHANG_L5_GROUP = {
    id: 'hsk4-shang-l5-g1',
    lessonId: 'hsk4-shang-l5',
    index: 1,
};
exports.HSK4_SHANG_L5_GROUP2 = {
    id: 'hsk4-shang-l5-g2',
    lessonId: 'hsk4-shang-l5',
    index: 2,
};
exports.HSK4_SHANG_L5_GROUP3 = {
    id: 'hsk4-shang-l5-g3',
    lessonId: 'hsk4-shang-l5',
    index: 3,
};
exports.HSK4_SHANG_L5_GROUP4 = {
    id: 'hsk4-shang-l5-g4',
    lessonId: 'hsk4-shang-l5',
    index: 4,
};
const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-thuong';
const VERIFIED_AT = '2026-11-06';
function lexeme(group, idSuffix, hanzi, pinyin, meaning, pos, order) {
    return {
        id: `hsk4-shang-l5-g${group}-${idSuffix}`,
        hanzi,
        pinyin,
        meaning,
        pos,
        courseId: 'hsk4-shang',
        lessonId: 'hsk4-shang-l5',
        groupId: `hsk4-shang-l5-g${group}`,
        order,
        sourceUrl: SOURCE_URL,
        verifiedAt: VERIFIED_AT,
        status: 'verified',
    };
}
/** 11 từ nhóm 1 HSK 4 quyển thượng bài 5, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L5_LEXEMES = [
    lexeme(1, 'zhishao', '至少', 'zhìshǎo', 'ít nhất, tối thiểu', 'Phó từ', 1),
    lexeme(1, 'zhongcan', '中餐', 'zhōngcān', 'món ăn Trung Quốc, cơm Tàu', 'Danh từ', 2),
    lexeme(1, 'zhuanmen', '专门', 'zhuānmén', 'chuyên, riêng, đặc biệt (cho việc gì)', 'Phó từ / Tính từ', 3),
    lexeme(1, 'zhu', '煮', 'zhǔ', 'luộc, nấu (trong nước)', 'Động từ', 4),
    lexeme(1, 'you', '油', 'yóu', 'dầu (ăn)', 'Danh từ', 5),
    lexeme(1, 'dao-liangci', '道', 'dào', '(lượng từ) món — dùng cho món ăn trong bữa', 'Lượng từ', 6),
    lexeme(1, 'shushou', '熟', 'shú/shóu', 'chín (đã nấu chín); quen thuộc', 'Tính từ', 7),
    lexeme(1, 'dao', '倒', 'dào', 'rót, đổ', 'Động từ', 8),
    lexeme(1, 'lajiao', '辣椒', 'làjiāo', 'ớt', 'Danh từ', 9),
    lexeme(1, 'la', '辣', 'là', 'cay', 'Tính từ', 10),
    lexeme(1, 'shuizhuyu', '水煮鱼', 'Shuǐzhǔyú', 'cá luộc cay kiểu Tứ Xuyên', 'Danh từ riêng', 11),
];
/** 7 từ nhóm 2 HSK 4 quyển thượng bài 5, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L5_G2_LEXEMES = [
    lexeme(2, 'gan', '敢', 'gǎn', 'dám', 'Động từ', 1),
    lexeme(2, 'duzi', '肚子', 'dùzi', 'bụng', 'Danh từ', 2),
    lexeme(2, 'xiangtong', '相同', 'xiāngtóng', 'giống nhau, như nhau', 'Tính từ', 3),
    lexeme(2, 'shunxu', '顺序', 'shùnxù', 'thứ tự, trình tự', 'Danh từ', 4),
    lexeme(2, 'gou', '够', 'gòu', 'đủ', 'Phó từ / Động từ', 5),
    lexeme(2, 'bugou', '不够', 'búgòu', 'không đủ', 'Phó từ / Động từ', 6),
    lexeme(2, 'dadao', '达到', 'dádào', 'đạt đến, đạt được', 'Động từ', 7),
];
/** 14 từ nhóm 3 HSK 4 quyển thượng bài 5, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L5_G3_LEXEMES = [
    lexeme(3, 'ju', '聚', 'jù', 'tụ tập, tụ họp', 'Động từ', 1),
    lexeme(3, 'wucan', '午餐', 'wǔcān', 'bữa trưa', 'Danh từ', 2),
    lexeme(3, 'xian', '咸', 'xián', 'mặn', 'Tính từ', 3),
    lexeme(3, 'liang', '凉', 'liáng', 'nguội, mát lạnh', 'Tính từ', 4),
    lexeme(3, 'fu', '付', 'fù', 'trả (tiền), thanh toán', 'Động từ', 5),
    lexeme(3, 'ge', '各', 'gè', 'mỗi (người/vật một phần riêng)', 'Đại từ', 6),
    lexeme(3, 'jucan', '聚餐', 'jùcān', 'ăn uống tụ tập, liên hoan', 'Động từ', 7),
    lexeme(3, 'suan', '酸', 'suān', 'chua', 'Tính từ', 8),
    lexeme(3, 'tang', '汤', 'tāng', 'canh, súp', 'Danh từ', 9),
    lexeme(3, 'guizhou', '贵州', 'Guìzhōu', 'Quý Châu (tỉnh của Trung Quốc)', 'Danh từ riêng', 10),
    lexeme(3, 'hongshaoyangrou', '红烧羊肉', 'Hóngshāo Yángròu', 'thịt dê kho (hồng thiêu)', 'Danh từ riêng', 11),
    lexeme(3, 'laziji', '辣子鸡', 'Làzǐjī', 'gà xào ớt (món Tứ Xuyên)', 'Danh từ riêng', 12),
    lexeme(3, 'songshuguiyu', '松鼠鳜鱼', 'Sōngshǔ Guìyú', 'cá quế hình sóc (món Tô Châu chua ngọt)', 'Danh từ riêng', 13),
    lexeme(3, 'suantangmixian', '酸汤米线', 'Suāntāng Mǐxiàn', 'bún canh chua (đặc sản Quý Châu)', 'Danh từ riêng', 14),
];
/** 12 từ nhóm 4 HSK 4 quyển thượng bài 5, đúng thứ tự nguồn. */
exports.HSK4_SHANG_L5_G4_LEXEMES = [
    lexeme(4, 'anpai', '安排', 'ānpái', 'sắp xếp, bố trí', 'Động từ / Danh từ', 1),
    lexeme(4, 'anzhao', '按照', 'ànzhào', 'theo, căn cứ theo', 'Giới từ', 2),
    lexeme(4, 'deng', '等', 'děng', 'như, chẳng hạn (liệt kê: …等）', 'Giới từ', 3),
    lexeme(4, 'miandui', '面对', 'miànduì', 'đối mặt, đối diện', 'Động từ', 4),
    lexeme(4, 'nianling', '年龄', 'niánlíng', 'tuổi, độ tuổi', 'Danh từ', 5),
    lexeme(4, 'putong', '普通', 'pǔtōng', 'thông thường, bình thường', 'Tính từ', 6),
    lexeme(4, 'suiyi', '随意', 'suíyì', 'tùy ý, thoải mái, không câu nệ', 'Tính từ', 7),
    lexeme(4, 'zhengshi', '正式', 'zhèngshì', 'chính thức, trang trọng', 'Tính từ', 8),
    lexeme(4, 'zhongshi', '重视', 'zhòngshì', 'coi trọng, xem trọng', 'Động từ', 9),
    lexeme(4, 'zhuren', '主人', 'zhǔrén', 'chủ nhà, chủ bữa tiệc', 'Danh từ', 10),
    lexeme(4, 'zunzhong', '尊重', 'zūnzhòng', 'tôn trọng', 'Động từ', 11),
    lexeme(4, 'zuowei', '座位', 'zuòwèi', 'chỗ ngồi, ghế', 'Danh từ', 12),
];
/** Liên kết 11 từ với bài 5 (nhóm 1), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L5_VOCABULARY = exports.HSK4_SHANG_L5_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l5',
    groupId: 'hsk4-shang-l5-g1',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 7 từ với bài 5 (nhóm 2), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L5_G2_VOCABULARY = exports.HSK4_SHANG_L5_G2_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l5',
    groupId: 'hsk4-shang-l5-g2',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 14 từ với bài 5 (nhóm 3), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L5_G3_VOCABULARY = exports.HSK4_SHANG_L5_G3_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l5',
    groupId: 'hsk4-shang-l5-g3',
    lexemeId: w.id,
    order: w.order,
}));
/** Liên kết 12 từ với bài 5 (nhóm 4), giữ thứ tự nguồn. */
exports.HSK4_SHANG_L5_G4_VOCABULARY = exports.HSK4_SHANG_L5_G4_LEXEMES.map((w) => ({
    lessonId: 'hsk4-shang-l5',
    groupId: 'hsk4-shang-l5-g4',
    lexemeId: w.id,
    order: w.order,
}));
function example(group, lexemeIdSuffix, hanzi, pinyin, meaning) {
    return {
        id: `hsk4-shang-l5-g${group}-${lexemeIdSuffix}-ex1`,
        lexemeId: `hsk4-shang-l5-g${group}-${lexemeIdSuffix}`,
        hanzi,
        pinyin,
        meaning,
        source: 'authored',
    };
}
/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 至少 "他每天至少跑三公里。" / 中餐 "我很喜欢吃中餐。" / 专门 "他专门来中国学习中文。" / 煮 "妈妈在煮饭。" / 油 "请少放一点儿油。" / 道 "这是一道有名的菜。" / 熟 "这道菜已经熟了。" / 倒 "请帮我倒一杯水。" / 辣椒 "这道菜放了很多辣椒。" / 辣 "这道菜很辣。" / 水煮鱼 "水煮鱼是四川的名菜。"
 * - 敢 "你敢吃辣椒吗？" / 肚子 "我的肚子饿了。" / 相同 "我们的想法相同。" / 顺序 "请按顺序排队。" / 够 "这些菜够我们吃了。" / 不够 "时间不够，我们快点儿。" / 达到 "他达到了自己的目标。"
 * - 聚 "我们常常聚在一起吃饭。" / 午餐 "午餐我们吃饺子。" / 咸 "这道菜有点儿咸。" / 凉 "汤已经凉了。" / 付 "今天我来付钱。" / 各 "各人有各人的口味。" / 聚餐 "我们周末一起聚餐。" / 酸 "这个汤有点儿酸。" / 汤 "请给我一碗汤。" / 贵州 "贵州的菜很好吃。" / 红烧羊肉 "红烧羊肉很好吃。" / 辣子鸡 "辣子鸡是四川的名菜。" / 松鼠鳜鱼 "松鼠鳜鱼是苏州的名菜。" / 酸汤米线 "酸汤米线是贵州的特色小吃。"
 * - 安排 "我来安排今天的午餐。" / 按照 "请按照菜单点菜。" / 等 "米饭、面条等都是主食。" / 面对 "我们要勇敢面对困难。" / 年龄 "他的年龄比我大。" / 普通 "这是一家普通的饭馆。" / 随意 "大家请随意。" / 正式 "今天是一次正式的聚餐。" / 重视 "他很重视这次考试。" / 主人 "主人请我们坐下。" / 尊重 "我们要尊重主人的安排。" / 座位 "你的座位在这儿。"
 */
exports.HSK4_SHANG_L5_EXAMPLES = [
    example(1, 'zhishao', '他每天至少跑三公里。', 'tā měitiān zhìshǎo pǎo sān gōnglǐ.', 'Anh ấy mỗi ngày chạy ít nhất ba cây số.'),
    example(1, 'zhongcan', '我很喜欢吃中餐。', 'wǒ hěn xǐhuān chī zhōngcān.', 'Tôi rất thích ăn món Trung Quốc.'),
    example(1, 'zhuanmen', '他专门来中国学习中文。', 'tā zhuānmén lái Zhōngguó xuéxí Zhōngwén.', 'Anh ấy đặc biệt đến Trung Quốc học tiếng Trung.'),
    example(1, 'zhu', '妈妈在煮饭。', 'māma zài zhǔ fàn.', 'Mẹ đang nấu cơm.'),
    example(1, 'you', '请少放一点儿油。', 'qǐng shǎo fàng yìdiǎnr yóu.', 'Xin hãy cho ít dầu một chút.'),
    example(1, 'dao-liangci', '这是一道有名的菜。', 'zhè shì yí dào yǒumíng de cài.', 'Đây là một món ăn nổi tiếng.'),
    example(1, 'shushou', '这道菜已经熟了。', 'zhè dào cài yǐjīng shú le.', 'Món này đã chín rồi.'),
    example(1, 'dao', '请帮我倒一杯水。', 'qǐng bāng wǒ dào yì bēi shuǐ.', 'Xin hãy giúp tôi rót một cốc nước.'),
    example(1, 'lajiao', '这道菜放了很多辣椒。', 'zhè dào cài fàng le hěn duō làjiāo.', 'Món này cho rất nhiều ớt.'),
    example(1, 'la', '这道菜很辣。', 'zhè dào cài hěn là.', 'Món này rất cay.'),
    example(1, 'shuizhuyu', '水煮鱼是四川的名菜。', 'Shuǐzhǔyú shì Sìchuān de míng cài.', 'Cá luộc cay là món ăn nổi tiếng của Tứ Xuyên.'),
];
exports.HSK4_SHANG_L5_G2_EXAMPLES = [
    example(2, 'gan', '你敢吃辣椒吗？', 'nǐ gǎn chī làjiāo ma?', 'Bạn dám ăn ớt không?'),
    example(2, 'duzi', '我的肚子饿了。', 'wǒ de dùzi è le.', 'Tôi đói bụng rồi.'),
    example(2, 'xiangtong', '我们的想法相同。', 'wǒmen de xiǎngfǎ xiāngtóng.', 'Suy nghĩ của chúng tôi giống nhau.'),
    example(2, 'shunxu', '请按顺序排队。', 'qǐng àn shùnxù páiduì.', 'Xin hãy xếp hàng theo thứ tự.'),
    example(2, 'gou', '这些菜够我们吃了。', 'zhèxiē cài gòu wǒmen chī le.', 'Những món này đủ cho chúng tôi ăn rồi.'),
    example(2, 'bugou', '时间不够，我们快点儿。', 'shíjiān bú gòu, wǒmen kuài diǎnr.', 'Không đủ thời gian, chúng ta nhanh lên.'),
    example(2, 'dadao', '他达到了自己的目标。', 'tā dádào le zìjǐ de mùbiāo.', 'Anh ấy đã đạt được mục tiêu của mình.'),
];
exports.HSK4_SHANG_L5_G3_EXAMPLES = [
    example(3, 'ju', '我们常常聚在一起吃饭。', 'wǒmen chángcháng jù zài yìqǐ chī fàn.', 'Chúng tôi thường tụ tập cùng nhau ăn cơm.'),
    example(3, 'wucan', '午餐我们吃饺子。', 'wǔcān wǒmen chī jiǎozi.', 'Bữa trưa chúng tôi ăn sủi cảo.'),
    example(3, 'xian', '这道菜有点儿咸。', 'zhè dào cài yǒudiǎnr xián.', 'Món này hơi mặn.'),
    example(3, 'liang', '汤已经凉了。', 'tāng yǐjīng liáng le.', 'Canh đã nguội rồi.'),
    example(3, 'fu', '今天我来付钱。', 'jīntiān wǒ lái fù qián.', 'Hôm nay tôi trả tiền.'),
    example(3, 'ge', '各人有各人的口味。', 'gè rén yǒu gè rén de kǒuwèi.', 'Mỗi người có khẩu vị riêng.'),
    example(3, 'jucan', '我们周末一起聚餐。', 'wǒmen zhōumò yìqǐ jùcān.', 'Cuối tuần chúng tôi cùng nhau liên hoan.'),
    example(3, 'suan', '这个汤有点儿酸。', 'zhège tāng yǒudiǎnr suān.', 'Món canh này hơi chua.'),
    example(3, 'tang', '请给我一碗汤。', 'qǐng gěi wǒ yì wǎn tāng.', 'Xin cho tôi một bát canh.'),
    example(3, 'guizhou', '贵州的菜很好吃。', 'Guìzhōu de cài hěn hǎochī.', 'Món ăn Quý Châu rất ngon.'),
    example(3, 'hongshaoyangrou', '红烧羊肉很好吃。', 'Hóngshāo Yángròu hěn hǎochī.', 'Thịt dê kho rất ngon.'),
    example(3, 'laziji', '辣子鸡是四川的名菜。', 'Làzǐjī shì Sìchuān de míng cài.', 'Gà xào ớt là món ăn nổi tiếng của Tứ Xuyên.'),
    example(3, 'songshuguiyu', '松鼠鳜鱼是苏州的名菜。', 'Sōngshǔ Guìyú shì Sūzhōu de míng cài.', 'Cá quế hình sóc là món ăn nổi tiếng của Tô Châu.'),
    example(3, 'suantangmixian', '酸汤米线是贵州的特色小吃。', 'Suāntāng Mǐxiàn shì Guìzhōu de tèsè xiǎochī.', 'Bún canh chua là món ăn vặt đặc sản của Quý Châu.'),
];
exports.HSK4_SHANG_L5_G4_EXAMPLES = [
    example(4, 'anpai', '我来安排今天的午餐。', 'wǒ lái ānpái jīntiān de wǔcān.', 'Tôi sẽ sắp xếp bữa trưa hôm nay.'),
    example(4, 'anzhao', '请按照菜单点菜。', 'qǐng ànzhào càidān diǎn cài.', 'Xin hãy gọi món theo thực đơn.'),
    example(4, 'deng', '米饭、面条等都是主食。', 'mǐfàn, miàntiáo děng dōu shì zhǔshí.', 'Cơm, mì và các món khác đều là món chính.'),
    example(4, 'miandui', '我们要勇敢面对困难。', 'wǒmen yào yǒnggǎn miànduì kùnnán.', 'Chúng ta phải dũng cảm đối mặt với khó khăn.'),
    example(4, 'nianling', '他的年龄比我大。', 'tā de niánlíng bǐ wǒ dà.', 'Tuổi của anh ấy lớn hơn tôi.'),
    example(4, 'putong', '这是一家普通的饭馆。', 'zhè shì yì jiā pǔtōng de fànguǎn.', 'Đây là một quán ăn bình thường.'),
    example(4, 'suiyi', '大家请随意。', 'dàjiā qǐng suíyì.', 'Mọi người cứ tự nhiên.'),
    example(4, 'zhengshi', '今天是一次正式的聚餐。', 'jīntiān shì yí cì zhèngshì de jùcān.', 'Hôm nay là một bữa liên hoan chính thức.'),
    example(4, 'zhongshi', '他很重视这次考试。', 'tā hěn zhòngshì zhè cì kǎoshì.', 'Anh ấy rất coi trọng kỳ thi lần này.'),
    example(4, 'zhuren', '主人请我们坐下。', 'zhǔrén qǐng wǒmen zuò xià.', 'Chủ nhà mời chúng tôi ngồi xuống.'),
    example(4, 'zunzhong', '我们要尊重主人的安排。', 'wǒmen yào zūnzhòng zhǔrén de ānpái.', 'Chúng ta phải tôn trọng sự sắp xếp của chủ nhà.'),
    example(4, 'zuowei', '你的座位在这儿。', 'nǐ de zuòwèi zài zhèr.', 'Chỗ ngồi của bạn ở đây.'),
];
/** Alias ngắn cho HSK4_SHANG_L5_EXAMPLES (dùng chung cho UI sổ tay). */
exports.EXAMPLES = exports.HSK4_SHANG_L5_EXAMPLES;
