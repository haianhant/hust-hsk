/**
 * Dữ liệu khởi đầu: HSK 4 quyển hạ — Bài 16 (41 từ, 1 nhóm duy nhất).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-ha (file dữ liệu công khai
 * assets/data/hsk4-xia.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3c + §4 + §6).
 * Đối chiếu audit §3c: bài 16 = 41 từ — KHỚP.
 *
 * CHỈ 1 NHÓM (g1, chứa toàn bộ 41 từ của bài) — KHÔNG chia 4 nhóm.
 * Căn cứ: file nguồn KHÔNG có bảng nhóm từ cho quyển hạ, và engine.js
 * hàm vocabGroupsCur() với isXia() trả về [l.vocab.map((v,i)=>i)] — tức
 * trên trang render thật, mỗi bài hạ chỉ có MỘT nhóm duy nhất chứa toàn
 * bộ từ của bài. Tổng quyển hạ = 10 nhóm (1/bài).
 * Thứ tự từ theo đúng file nguồn.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép câu ví dụ của nguồn, KHÔNG sao chép toàn văn bài khóa.
 */
import type {
  Example,
  Lesson,
  LessonGroup,
  LessonVocabulary,
  Lexeme,
} from '../lib/learn/types';
import { HSK4_COURSE } from './hsk4-shang-l1';

export { HSK4_COURSE };

export const HSK4_XIA_L16_LESSON: Lesson = {
  id: 'hsk4-xia-l16',
  courseId: 'hsk4-xia',
  number: 16,
  title: "计划赶不上变化",
  topic: "Kế hoạch và thay đổi: hủy chuyến đi, đổi lịch họp & nghệ thuật thích ứng",
};

export const HSK4_XIA_L16_GROUP: LessonGroup = {
  id: 'hsk4-xia-l16-g1',
  lessonId: 'hsk4-xia-l16',
  index: 1,
};

const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk4-ha';
const VERIFIED_AT = '2026-11-06';

function lexeme(
  idSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
  pos: string,
  order: number,
): Lexeme {
  return {
    id: `hsk4-xia-l16-g1-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-xia',
    lessonId: 'hsk4-xia-l16',
    groupId: 'hsk4-xia-l16-g1',
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 41 từ HSK 4 quyển hạ bài 16 (nhóm duy nhất g1), đúng thứ tự nguồn 1..41. */
export const HSK4_XIA_L16_LEXEMES: Lexeme[] = [
  lexeme("benlai", "本来", "běnlái", "vốn dĩ, ban đầu; nguyên gốc", "Phó từ/Tính từ", 1),
  lexeme("zhihao", "只好", "zhǐhǎo", "đành phải, chỉ còn cách", "Phó từ", 2),
  lexeme("ganshang", "赶上", "gǎnshàng", "đuổi kịp, theo kịp", "Động từ", 3),
  lexeme("luxing", "旅行", "lǚxíng", "du lịch, đi du lịch", "Động từ", 4),
  lexeme("tuichi", "推迟", "tuīchí", "trì hoãn, lùi lại", "Động từ", 5),
  lexeme("quxiao", "取消", "qǔxiāo", "hủy bỏ", "Động từ", 6),
  lexeme("kexi", "可惜", "kěxī", "đáng tiếc, tiếc là", "Tính từ", 7),
  lexeme("queshi", "确实", "quèshí", "quả thực, đúng là", "Phó từ", 8),
  lexeme("dengdao", "等到", "děngdào", "đợi đến khi, chờ đến lúc", "Giới từ", 9),
  lexeme("zaochen", "早晨", "zǎochen", "buổi sáng (sớm)", "Danh từ", 10),
  lexeme("huran", "忽然", "hūrán", "bỗng nhiên, đột nhiên", "Phó từ", 11),
  lexeme("zengjia", "增加", "zēngjiā", "tăng thêm, gia tăng", "Động từ", 12),
  lexeme("tiaozheng", "调整", "tiáozhěng", "điều chỉnh", "Động từ", 13),
  lexeme("cuowu", "错误", "cuòwù", "sai sót, lỗi; sai, không đúng", "Danh từ/Tính từ", 14),
  lexeme("bingqie", "并且", "bìngqiě", "hơn nữa, đồng thời còn", "Liên từ", 15),
  lexeme("lizi", "例子", "lìzi", "ví dụ", "Danh từ", 16),
  lexeme("guanjian", "关键", "guānjiàn", "mấu chốt, điểm then chốt; quan trọng nhất", "Danh từ/Tính từ", 17),
  lexeme("xiangxi", "详细", "xiángxì", "chi tiết, tỉ mỉ", "Tính từ", 18),
  lexeme("shijianbiao", "时间表", "shíjiānbiǎo", "thời gian biểu, lịch trình", "Danh từ", 19),
  lexeme("bawo", "把握", "bǎwò", "sự chắc chắn, nắm chắc phần thắng", "Danh từ", 20),
  lexeme("xiangfan", "相反", "xiāngfǎn", "ngược lại; trái ngược", "Liên từ/Tính từ", 21),
  lexeme("bufen", "部分", "bùfen", "một phần, bộ phận", "Danh từ", 22),
  lexeme("qingsong", "轻松", "qīngsōng", "nhẹ nhõm, thoải mái, thư thả", "Tính từ", 23),
  lexeme("biaozhun", "标准", "biāozhǔn", "tiêu chuẩn, đạt chuẩn; chuẩn mực", "Tính từ/Danh từ", 24),
  lexeme("yange", "严格", "yángé", "nghiêm ngặt, nghiêm khắc; thực hiện nghiêm túc", "Tính từ/Động từ", 25),
  lexeme("qude", "取得", "qǔdé", "đạt được, giành được", "Động từ", 26),
  lexeme("shuobuding", "说不定", "shuōbudìng", "biết đâu, không chừng, có khi", "Phó từ", 27),
  lexeme("linghuo", "灵活", "línghuó", "linh hoạt", "Tính từ", 28),
  lexeme("yiqie", "一切", "yíqiè", "tất cả, mọi thứ", "Đại từ", 29),
  lexeme("que", "却", "què", "nhưng, thế mà (chỉ ý chuyển hướng)", "Phó từ", 30),
  lexeme("budebu", "不得不", "bùdébù", "không thể không, đành phải", "Phó từ", 31),
  lexeme("yue", "约", "yuē", "hẹn, đặt hẹn; khoảng, chừng", "Động từ/Phó từ", 32),
  lexeme("bubian", "不便", "búbiàn", "bất tiện; không tiện (làm việc gì)", "Tính từ/Động từ", 33),
  lexeme("shiwang", "失望", "shīwàng", "thất vọng; mất hy vọng", "Tính từ/Động từ", 34),
  lexeme("yexu", "也许", "yěxǔ", "có lẽ, có thể", "Phó từ", 35),
  lexeme("guang", "逛", "guàng", "dạo, đi dạo (phố, cửa hàng)", "Động từ", 36),
  lexeme("youqu", "有趣", "yǒuqù", "thú vị, hay", "Tính từ", 37),
  lexeme("guankan", "观看", "guānkàn", "xem, quan sát (phim, thi đấu…)", "Động từ", 38),
  lexeme("bu", "部", "bù", "lượng từ dùng cho sách, phim…", "Lượng từ", 39),
  lexeme("wufa", "无法", "wúfǎ", "không có cách nào, không thể", "Động từ", 40),
  lexeme("jieshou", "接受", "jiēshòu", "chấp nhận, tiếp nhận", "Động từ", 41),
];

/** Liên kết 41 từ với bài 16, giữ thứ tự nguồn. */
export const HSK4_XIA_L16_VOCABULARY: LessonVocabulary[] = HSK4_XIA_L16_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-xia-l16',
    groupId: 'hsk4-xia-l16-g1',
    lexemeId: w.id,
    order: w.order,
  }),
);

function example(
  lexemeIdSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
): Example {
  return {
    id: `hsk4-xia-l16-g1-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-xia-l16-g1-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 本来 "我本来想去旅行，可是下雨了。" / 只好 "下雨了，我们只好留在家里。" / 赶上 "快点儿，我们要赶上火车。"
 * - 旅行 "我喜欢和家人一起旅行。" / 推迟 "会议推迟到明天。" / 取消 "因为下雨，比赛取消了。"
 * - 可惜 "真可惜，你不能来。" / 确实 "这本书确实很有意思。" / 等到 "等到春天，我们一起去旅行。"
 * - 早晨 "早晨我常常去公园散步。" / 忽然 "忽然下起了大雨。" / 增加 "今年学生的数量增加了。"
 * - 调整 "我们要调整一下时间表。" / 错误 "这是一个小错误。" / 并且 "他会说汉语，并且说得很好。"
 * - 例子 "请你举一个例子。" / 关键 "时间是最关键的。" / 详细 "请你说得详细一点儿。"
 * - 时间表 "这是今天的时间表。" / 把握 "我对考试很有把握。" / 相反 "相反，我觉得这个办法很好。"
 * - 部分 "这本书的一部分很有意思。" / 轻松 "听音乐让我很轻松。" / 标准 "他的发音很标准。"
 * - 严格 "老师对我们很严格。" / 取得 "他取得了很好的成绩。" / 说不定 "说不定明天会下雨。"
 * - 灵活 "我们要灵活一点儿。" / 一切 "一切都很好。" / 却 "他想去，却没有时间。"
 * - 不得不 "我不得不早点儿回家。" / 约 "我们约好了明天见面。" / 不便 "对不起，给你带来不便。"
 * - 失望 "他对这个结果很失望。" / 也许 "也许他今天不来。" / 逛 "周末我们去逛街。"
 * - 有趣 "这个故事很有趣。" / 观看 "我们去观看足球比赛。" / 部 "我看了一部电影。"
 * - 无法 "我无法忘记他。" / 接受 "我接受你的建议。"
 */
export const HSK4_XIA_L16_EXAMPLES: Example[] = [
  example("benlai", "我本来想去旅行，可是下雨了。", "Wǒ běnlái xiǎng qù lǚxíng, kěshì xià yǔ le.", "Ban đầu tôi định đi du lịch, nhưng trời lại mưa."),
  example("zhihao", "下雨了，我们只好留在家里。", "Xià yǔ le, wǒmen zhǐhǎo liú zài jiālǐ.", "Trời mưa rồi, chúng tôi đành phải ở nhà."),
  example("ganshang", "快点儿，我们要赶上火车。", "Kuài diǎnr, wǒmen yào gǎnshàng huǒchē.", "Nhanh lên, chúng ta phải đuổi kịp chuyến tàu."),
  example("luxing", "我喜欢和家人一起旅行。", "Wǒ xǐhuān hé jiārén yìqǐ lǚxíng.", "Tôi thích đi du lịch cùng gia đình."),
  example("tuichi", "会议推迟到明天。", "Huìyì tuīchí dào míngtiān.", "Cuộc họp lùi lại đến ngày mai."),
  example("quxiao", "因为下雨，比赛取消了。", "Yīnwèi xià yǔ, bǐsài qǔxiāo le.", "Vì trời mưa, trận đấu đã bị hủy."),
  example("kexi", "真可惜，你不能来。", "Zhēn kěxī, nǐ bù néng lái.", "Thật đáng tiếc, bạn không thể đến."),
  example("queshi", "这本书确实很有意思。", "Zhè běn shū quèshí hěn yǒu yìsi.", "Quyển sách này quả thực rất thú vị."),
  example("dengdao", "等到春天，我们一起去旅行。", "Děngdào chūntiān, wǒmen yìqǐ qù lǚxíng.", "Đợi đến mùa xuân, chúng ta cùng đi du lịch."),
  example("zaochen", "早晨我常常去公园散步。", "Zǎochén wǒ chángcháng qù gōngyuán sànbù.", "Buổi sáng tôi thường đi dạo công viên."),
  example("huran", "忽然下起了大雨。", "Hūrán xià qǐ le dà yǔ.", "Bỗng nhiên trời đổ mưa to."),
  example("zengjia", "今年学生的数量增加了。", "Jīnnián xuéshēng de shùliàng zēngjiā le.", "Số lượng học sinh năm nay đã tăng lên."),
  example("tiaozheng", "我们要调整一下时间表。", "Wǒmen yào tiáozhěng yíxià shíjiānbiǎo.", "Chúng ta cần điều chỉnh thời gian biểu một chút."),
  example("cuowu", "这是一个小错误。", "Zhè shì yí gè xiǎo cuòwù.", "Đây là một lỗi nhỏ."),
  example("bingqie", "他会说汉语，并且说得很好。", "Tā huì shuō Hànyǔ, bìngqiě shuō de hěn hǎo.", "Anh ấy biết nói tiếng Trung, hơn nữa còn nói rất hay."),
  example("lizi", "请你举一个例子。", "Qǐng nǐ jǔ yí gè lìzi.", "Xin bạn hãy nêu một ví dụ."),
  example("guanjian", "时间是最关键的。", "Shíjiān shì zuì guānjiàn de.", "Thời gian là quan trọng nhất."),
  example("xiangxi", "请你说得详细一点儿。", "Qǐng nǐ shuō de xiángxì yìdiǎnr.", "Xin bạn hãy nói chi tiết hơn một chút."),
  example("shijianbiao", "这是今天的时间表。", "Zhè shì jīntiān de shíjiānbiǎo.", "Đây là thời gian biểu hôm nay."),
  example("bawo", "我对考试很有把握。", "Wǒ duì kǎoshì hěn yǒu bǎwò.", "Tôi rất chắc chắn về kỳ thi."),
  example("xiangfan", "相反，我觉得这个办法很好。", "Xiāngfǎn, wǒ juéde zhège bànfǎ hěn hǎo.", "Ngược lại, tôi thấy cách này rất hay."),
  example("bufen", "这本书的一部分很有意思。", "Zhè běn shū de yí bùfen hěn yǒu yìsi.", "Một phần của quyển sách này rất thú vị."),
  example("qingsong", "听音乐让我很轻松。", "Tīng yīnyuè ràng wǒ hěn qīngsōng.", "Nghe nhạc khiến tôi rất thư thái."),
  example("biaozhun", "他的发音很标准。", "Tā de fāyīn hěn biāozhǔn.", "Phát âm của anh ấy rất chuẩn."),
  example("yange", "老师对我们很严格。", "Lǎoshī duì wǒmen hěn yángé.", "Thầy giáo rất nghiêm khắc với chúng tôi."),
  example("qude", "他取得了很好的成绩。", "Tā qǔdé le hěn hǎo de chéngjì.", "Anh ấy đã đạt được thành tích rất tốt."),
  example("shuobuding", "说不定明天会下雨。", "Shuōbudìng míngtiān huì xià yǔ.", "Biết đâu ngày mai sẽ mưa."),
  example("linghuo", "我们要灵活一点儿。", "Wǒmen yào línghuó yìdiǎnr.", "Chúng ta cần linh hoạt hơn một chút."),
  example("yiqie", "一切都很好。", "Yíqiè dōu hěn hǎo.", "Mọi thứ đều rất tốt."),
  example("que", "他想去，却没有时间。", "Tā xiǎng qù, què méiyǒu shíjiān.", "Anh ấy muốn đi, nhưng lại không có thời gian."),
  example("budebu", "我不得不早点儿回家。", "Wǒ bùdébù zǎo diǎnr huí jiā.", "Tôi đành phải về nhà sớm hơn."),
  example("yue", "我们约好了明天见面。", "Wǒmen yuē hǎo le míngtiān jiànmiàn.", "Chúng tôi đã hẹn nhau ngày mai gặp mặt."),
  example("bubian", "对不起，给你带来不便。", "Duìbuqǐ, gěi nǐ dài lái búbiàn.", "Xin lỗi vì đã gây bất tiện cho bạn."),
  example("shiwang", "他对这个结果很失望。", "Tā duì zhège jiéguǒ hěn shīwàng.", "Anh ấy rất thất vọng về kết quả này."),
  example("yexu", "也许他今天不来。", "Yěxǔ tā jīntiān bù lái.", "Có lẽ hôm nay anh ấy không đến."),
  example("guang", "周末我们去逛街。", "Zhōumò wǒmen qù guàng jiē.", "Cuối tuần chúng tôi đi dạo phố."),
  example("youqu", "这个故事很有趣。", "Zhège gùshi hěn yǒuqù.", "Câu chuyện này rất thú vị."),
  example("guankan", "我们去观看足球比赛。", "Wǒmen qù guānkàn zúqiú bǐsài.", "Chúng tôi đi xem trận bóng đá."),
  example("bu", "我看了一部电影。", "Wǒ kàn le yí bù diànyǐng.", "Tôi đã xem một bộ phim."),
  example("wufa", "我无法忘记他。", "Wǒ wúfǎ wàngjì tā.", "Tôi không thể quên anh ấy."),
  example("jieshou", "我接受你的建议。", "Wǒ jiēshòu nǐ de jiànyì.", "Tôi chấp nhận đề nghị của bạn."),
];

/** Alias ngắn cho HSK4_XIA_L16_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_XIA_L16_EXAMPLES;
