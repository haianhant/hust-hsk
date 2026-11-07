/**
 * Dữ liệu khởi đầu: HSK 4 quyển hạ — Bài 19 (40 từ, 1 nhóm duy nhất).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-ha (file dữ liệu công khai
 * assets/data/hsk4-xia.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3c + §4 + §6).
 * Đối chiếu audit §3c: bài 19 = 40 từ — KHỚP.
 *
 * CHỈ 1 NHÓM (g1, chứa toàn bộ 40 từ của bài) — KHÔNG chia 4 nhóm.
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

export const HSK4_XIA_L19_LESSON: Lesson = {
  id: 'hsk4-xia-l19',
  courseId: 'hsk4-xia',
  number: 19,
  title: "他们都很棒",
  topic: "Nghệ thuật và sân khấu: tập kịch, xem Kinh kịch & giấc mơ văn học",
};

export const HSK4_XIA_L19_GROUP: LessonGroup = {
  id: 'hsk4-xia-l19-g1',
  lessonId: 'hsk4-xia-l19',
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
    id: `hsk4-xia-l19-g1-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-xia',
    lessonId: 'hsk4-xia-l19',
    groupId: 'hsk4-xia-l19-g1',
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 40 từ HSK 4 quyển hạ bài 19 (nhóm duy nhất g1), đúng thứ tự nguồn 1..40. */
export const HSK4_XIA_L19_LEXEMES: Lexeme[] = [
  lexeme("huaju", "话剧", "huàjù", "kịch nói", "Danh từ", 1),
  lexeme("pai", "排", "pái", "tập dượt, diễn tập", "Động từ", 2),
  lexeme("yishu", "艺术", "yìshù", "nghệ thuật", "Danh từ", 3),
  lexeme("neixin", "内心", "nèixīn", "nội tâm, trong lòng", "Danh từ", 4),
  lexeme("zixin", "自信", "zìxìn", "tự tin; sự tự tin", "Tính từ/Danh từ/Động từ", 5),
  lexeme("shaonian", "少年", "shàonián", "thiếu niên, thanh thiếu niên", "Danh từ", 6),
  lexeme("geshou", "歌手", "gēshǒu", "ca sĩ", "Danh từ", 7),
  lexeme("gesheng", "歌声", "gēshēng", "giọng hát, tiếng hát", "Danh từ", 8),
  lexeme("dujia", "度假", "dùjià", "đi nghỉ, nghỉ mát", "Động từ", 9),
  lexeme("yanyuan", "演员", "yǎnyuán", "diễn viên", "Danh từ", 10),
  lexeme("yanchang", "演唱", "yǎnchàng", "biểu diễn hát, trình diễn ca khúc", "Động từ", 11),
  lexeme("liuxia", "留下", "liúxia", "để lại, lưu lại", "Động từ", 12),
  lexeme("qingnian", "青年", "qīngnián", "thanh niên", "Danh từ", 13),
  lexeme("guanzhong", "观众", "guānzhòng", "khán giả", "Danh từ", 14),
  lexeme("gongke", "功课", "gōngkè", "bài vở, việc học; (nghĩa bóng) việc chuẩn bị/tìm hiểu trước", "Danh từ", 15),
  lexeme("zhuanfa", "转发", "zhuǎnfā", "chuyển tiếp (tin nhắn, bài viết)", "Động từ", 16),
  lexeme("rukou", "入口", "rùkǒu", "lối vào, cửa vào", "Danh từ", 17),
  lexeme("ru", "入", "rù", "vào (nhập vào, đi vào)", "Động từ", 18),
  lexeme("zhi", "指", "zhǐ", "chỉ (bằng tay), trỏ", "Động từ", 19),
  lexeme("gongfu", "功夫", "gōngfu", "công phu, tay nghề/kỹ năng luyện tập lâu năm", "Danh từ", 20),
  lexeme("huojiang", "获奖", "huòjiǎng", "đoạt giải, được giải thưởng", "Động từ", 21),
  lexeme("jiang", "奖", "jiǎng", "giải thưởng, phần thưởng", "Danh từ", 22),
  lexeme("qidai", "期待", "qīdài", "mong đợi, kỳ vọng", "Động từ", 23),
  lexeme("guzhang", "鼓掌", "gǔzhǎng", "vỗ tay", "Động từ", 24),
  lexeme("yaoqing", "邀请", "yāoqǐng", "mời", "Động từ", 25),
  lexeme("qingzhu", "庆祝", "qìngzhù", "ăn mừng, chúc mừng", "Động từ", 26),
  lexeme("diantou", "点头", "diǎntóu", "gật đầu", "Động từ", 27),
  lexeme("zuopin", "作品", "zuòpǐn", "tác phẩm (văn học, nghệ thuật)", "Danh từ", 28),
  lexeme("zuozhe", "作者", "zuòzhě", "tác giả", "Danh từ", 29),
  lexeme("shiji", "世纪", "shìjì", "thế kỷ", "Danh từ", 30),
  lexeme("duzhe", "读者", "dúzhě", "độc giả, bạn đọc", "Danh từ", 31),
  lexeme("zuojia", "作家", "zuòjiā", "nhà văn", "Danh từ", 32),
  lexeme("ban", "版", "bǎn", "ấn bản, phiên bản, bản (in)", "Danh từ", 33),
  lexeme("wenzhang", "文章", "wénzhāng", "bài văn, bài viết", "Danh từ", 34),
  lexeme("quanbu", "全部", "quánbù", "toàn bộ, tất cả", "Danh từ", 35),
  lexeme("zhengli", "整理", "zhěnglǐ", "sắp xếp, chỉnh lý, thu xếp", "Động từ", 36),
  lexeme("wenzi", "文字", "wénzì", "chữ viết, văn tự", "Danh từ", 37),
  lexeme("tupian", "图片", "túpiàn", "hình ảnh, tranh ảnh", "Danh từ", 38),
  lexeme("baokao", "报考", "bàokǎo", "đăng ký dự thi, nộp hồ sơ thi", "Động từ", 39),
  lexeme("wenxue", "文学", "wénxué", "văn học", "Danh từ", 40),
];

/** Liên kết 40 từ với bài 19, giữ thứ tự nguồn. */
export const HSK4_XIA_L19_VOCABULARY: LessonVocabulary[] = HSK4_XIA_L19_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-xia-l19',
    groupId: 'hsk4-xia-l19-g1',
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
    id: `hsk4-xia-l19-g1-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-xia-l19-g1-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 话剧 "我们学校要演一场话剧。" / 排 "我们每天排话剧。" / 艺术 "我很喜欢艺术。"
 * - 内心 "他的内心很强大。" / 自信 "你要对自己自信。" / 少年 "他还是一个少年。"
 * - 歌手 "她是一位有名的歌手。" / 歌声 "她的歌声很好听。" / 度假 "夏天我们去海边度假。"
 * - 演员 "他是一名演员。" / 演唱 "歌手在舞台上演唱。" / 留下 "请把你的名字留下。"
 * - 青年 "他是一位青年作家。" / 观众 "观众都很喜欢这场演出。" / 功课 "演出之前，我要做好功课。"
 * - 转发 "请把这条消息转发给我。" / 入口 "剧场的入口在前面。" / 入 "他入门的时候，大家都站起来了。"
 * - 指 "他用手指着地图。" / 功夫 "他练了十年的功夫。" / 获奖 "这部话剧获奖了。"
 * - 奖 "他得了一个奖。" / 期待 "我很期待这场演出。" / 鼓掌 "观众一起鼓掌。"
 * - 邀请 "我邀请你来看话剧。" / 庆祝 "我们一起庆祝胜利。" / 点头 "他笑着点了点头。"
 * - 作品 "这是他的最新作品。" / 作者 "这本书的作者是谁？" / 世纪 "这是二十世纪的作品。"
 * - 读者 "很多读者喜欢这本书。" / 作家 "他是一位有名的作家。" / 版 "这是这本书的第二版。"
 * - 文章 "他写了一篇文章。" / 全部 "全部的书都在这里。" / 整理 "请你整理一下桌子。"
 * - 文字 "这些文字很漂亮。" / 图片 "这张图片很清楚。" / 报考 "他报考了中文系。"
 * - 文学 "我很喜欢中国文学。"
 */
export const HSK4_XIA_L19_EXAMPLES: Example[] = [
  example("huaju", "我们学校要演一场话剧。", "Wǒmen xuéxiào yào yǎn yì chǎng huàjù.", "Trường chúng tôi sắp diễn một vở kịch nói."),
  example("pai", "我们每天排话剧。", "Wǒmen měitiān pái huàjù.", "Mỗi ngày chúng tôi tập dượt kịch nói."),
  example("yishu", "我很喜欢艺术。", "Wǒ hěn xǐhuān yìshù.", "Tôi rất thích nghệ thuật."),
  example("neixin", "他的内心很强大。", "Tā de nèixīn hěn qiángdà.", "Nội tâm của anh ấy rất mạnh mẽ."),
  example("zixin", "你要对自己自信。", "Nǐ yào duì zìjǐ zìxìn.", "Bạn phải tự tin vào bản thân."),
  example("shaonian", "他还是一个少年。", "Tā háishi yí gè shàonián.", "Anh ấy vẫn còn là một thiếu niên."),
  example("geshou", "她是一位有名的歌手。", "Tā shì yí wèi yǒumíng de gēshǒu.", "Cô ấy là một ca sĩ nổi tiếng."),
  example("gesheng", "她的歌声很好听。", "Tā de gēshēng hěn hǎotīng.", "Giọng hát của cô ấy rất hay."),
  example("dujia", "夏天我们去海边度假。", "Xiàtiān wǒmen qù hǎibiān dùjià.", "Mùa hè chúng tôi đi nghỉ mát ở biển."),
  example("yanyuan", "他是一名演员。", "Tā shì yì míng yǎnyuán.", "Anh ấy là một diễn viên."),
  example("yanchang", "歌手在舞台上演唱。", "Gēshǒu zài wǔtái shàng yǎnchàng.", "Ca sĩ biểu diễn hát trên sân khấu."),
  example("liuxia", "请把你的名字留下。", "Qǐng bǎ nǐ de míngzi liúxia.", "Xin hãy để lại tên của bạn."),
  example("qingnian", "他是一位青年作家。", "Tā shì yí wèi qīngnián zuòjiā.", "Anh ấy là một nhà văn trẻ."),
  example("guanzhong", "观众都很喜欢这场演出。", "Guānzhòng dōu hěn xǐhuān zhè chǎng yǎnchū.", "Khán giả đều rất thích buổi biểu diễn này."),
  example("gongke", "演出之前，我要做好功课。", "Yǎnchū zhīqián, wǒ yào zuò hǎo gōngkè.", "Trước buổi biểu diễn, tôi phải chuẩn bị kỹ."),
  example("zhuanfa", "请把这条消息转发给我。", "Qǐng bǎ zhè tiáo xiāoxi zhuǎnfā gěi wǒ.", "Xin hãy chuyển tiếp tin nhắn này cho tôi."),
  example("rukou", "剧场的入口在前面。", "Jùchǎng de rùkǒu zài qiánmiàn.", "Lối vào của nhà hát ở phía trước."),
  example("ru", "他入门的时候，大家都站起来了。", "Tā rù mén de shíhou, dàjiā dōu zhàn qǐlái le.", "Khi anh ấy bước vào cửa, mọi người đều đứng dậy."),
  example("zhi", "他用手指着地图。", "Tā yòng shǒu zhǐ zhe dìtú.", "Anh ấy dùng tay chỉ vào bản đồ."),
  example("gongfu", "他练了十年的功夫。", "Tā liàn le shí nián de gōngfu.", "Anh ấy đã luyện công phu mười năm."),
  example("huojiang", "这部话剧获奖了。", "Zhè bù huàjù huòjiǎng le.", "Vở kịch nói này đã đoạt giải."),
  example("jiang", "他得了一个奖。", "Tā dé le yí gè jiǎng.", "Anh ấy đã nhận được một giải thưởng."),
  example("qidai", "我很期待这场演出。", "Wǒ hěn qīdài zhè chǎng yǎnchū.", "Tôi rất mong đợi buổi biểu diễn này."),
  example("guzhang", "观众一起鼓掌。", "Guānzhòng yìqǐ gǔzhǎng.", "Khán giả cùng nhau vỗ tay."),
  example("yaoqing", "我邀请你来看话剧。", "Wǒ yāoqǐng nǐ lái kàn huàjù.", "Tôi mời bạn đến xem kịch nói."),
  example("qingzhu", "我们一起庆祝胜利。", "Wǒmen yìqǐ qìngzhù shènglì.", "Chúng ta cùng ăn mừng chiến thắng."),
  example("diantou", "他笑着点了点头。", "Tā xiào zhe diǎn le diǎntóu.", "Anh ấy cười và gật đầu."),
  example("zuopin", "这是他的最新作品。", "Zhè shì tā de zuìxīn zuòpǐn.", "Đây là tác phẩm mới nhất của anh ấy."),
  example("zuozhe", "这本书的作者是谁？", "Zhè běn shū de zuòzhě shì shéi?", "Tác giả của quyển sách này là ai?"),
  example("shiji", "这是二十世纪的作品。", "Zhè shì èrshí shìjì de zuòpǐn.", "Đây là tác phẩm của thế kỷ hai mươi."),
  example("duzhe", "很多读者喜欢这本书。", "Hěn duō dúzhě xǐhuān zhè běn shū.", "Rất nhiều độc giả thích quyển sách này."),
  example("zuojia", "他是一位有名的作家。", "Tā shì yí wèi yǒumíng de zuòjiā.", "Ông ấy là một nhà văn nổi tiếng."),
  example("ban", "这是这本书的第二版。", "Zhè shì zhè běn shū de dì'èr bǎn.", "Đây là ấn bản thứ hai của quyển sách này."),
  example("wenzhang", "他写了一篇文章。", "Tā xiě le yì piān wénzhāng.", "Anh ấy đã viết một bài văn."),
  example("quanbu", "全部的书都在这里。", "Quánbù de shū dōu zài zhèlǐ.", "Toàn bộ sách đều ở đây."),
  example("zhengli", "请你整理一下桌子。", "Qǐng nǐ zhěnglǐ yíxià zhuōzi.", "Xin bạn hãy sắp xếp bàn một chút."),
  example("wenzi", "这些文字很漂亮。", "Zhèxiē wénzì hěn piàoliang.", "Những chữ này rất đẹp."),
  example("tupian", "这张图片很清楚。", "Zhè zhāng túpiàn hěn qīngchu.", "Bức hình này rất rõ."),
  example("baokao", "他报考了中文系。", "Tā bàokǎo le Zhōngwén xì.", "Anh ấy đã đăng ký dự thi khoa tiếng Trung."),
  example("wenxue", "我很喜欢中国文学。", "Wǒ hěn xǐhuān Zhōngguó wénxué.", "Tôi rất thích văn học Trung Quốc."),
];

/** Alias ngắn cho HSK4_XIA_L19_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_XIA_L19_EXAMPLES;
