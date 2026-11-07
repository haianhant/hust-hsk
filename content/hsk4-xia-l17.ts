/**
 * Dữ liệu khởi đầu: HSK 4 quyển hạ — Bài 17 (41 từ, 1 nhóm duy nhất).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-ha (file dữ liệu công khai
 * assets/data/hsk4-xia.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3c + §4 + §6).
 * Đối chiếu audit §3c: bài 17 = 41 từ — KHỚP.
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

export const HSK4_XIA_L17_LESSON: Lesson = {
  id: 'hsk4-xia-l17',
  courseId: 'hsk4-xia',
  number: 17,
  title: "运动让我更健康",
  topic: "Vận động và sức khỏe: tập gym khoa học, tiến bộ từng ngày & bóng bàn quốc dân",
};

export const HSK4_XIA_L17_GROUP: LessonGroup = {
  id: 'hsk4-xia-l17-g1',
  lessonId: 'hsk4-xia-l17',
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
    id: `hsk4-xia-l17-g1-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-xia',
    lessonId: 'hsk4-xia-l17',
    groupId: 'hsk4-xia-l17-g1',
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 41 từ HSK 4 quyển hạ bài 17 (nhóm duy nhất g1), đúng thứ tự nguồn 1..41. */
export const HSK4_XIA_L17_LEXEMES: Lexeme[] = [
  lexeme("luguo", "路过", "lùguò", "đi ngang qua, ghé qua", "Động từ", 1),
  lexeme("tang", "趟", "tàng", "chuyến, lượt (dùng cho việc đi lại)", "Lượng từ", 2),
  lexeme("jianshenfang", "健身房", "jiànshēnfáng", "phòng tập gym, phòng tập thể hình", "Danh từ", 3),
  lexeme("jianshen", "健身", "jiànshēn", "tập gym, rèn luyện thân thể", "Động từ", 4),
  lexeme("tizhong", "体重", "tǐzhòng", "cân nặng, thể trọng", "Danh từ", 5),
  lexeme("huiyuan", "会员", "huìyuán", "hội viên, thành viên", "Danh từ", 6),
  lexeme("binggan", "饼干", "bǐnggān", "bánh quy", "Danh từ", 7),
  lexeme("suannai", "酸奶", "suānnǎi", "sữa chua", "Danh từ", 8),
  lexeme("guozhi", "果汁", "guǒzhī", "nước ép trái cây", "Danh từ", 9),
  lexeme("jiaolian", "教练", "jiàoliàn", "huấn luyện viên", "Danh từ", 10),
  lexeme("dongzuo", "动作", "dòngzuò", "động tác", "Danh từ", 11),
  lexeme("kexue", "科学", "kēxué", "khoa học; (thuộc) khoa học", "Tính từ/Danh từ", 12),
  lexeme("shoushang", "受伤", "shòushāng", "bị thương, bị chấn thương", "Động từ", 13),
  lexeme("caochang", "操场", "cāochǎng", "sân vận động, sân tập", "Danh từ", 14),
  lexeme("qizhong", "其中", "qízhōng", "trong đó, trong số đó", "Danh từ", 15),
  lexeme("zhi", "之", "zhī", "trợ từ \"chi\", dùng giữa định ngữ và trung tâm ngữ (văn phong trang trọng, tương đương 的）", "Trợ từ", 16),
  lexeme("huo", "火", "huǒ", "rất được ưa chuộng, \"hot\"; lửa", "Tính từ/Danh từ", 17),
  lexeme("haochu", "好处", "hǎochù", "lợi ích, điểm tốt", "Danh từ", 18),
  lexeme("shebei", "设备", "shèbèi", "thiết bị, trang thiết bị", "Danh từ", 19),
  lexeme("quanshen", "全身", "quánshēn", "toàn thân", "Danh từ", 20),
  lexeme("zhunque", "准确", "zhǔnquè", "chính xác, chuẩn xác", "Tính từ", 21),
  lexeme("jinjin", "仅仅", "jǐnjǐn", "chỉ, vẻn vẹn, mới chỉ", "Phó từ", 22),
  lexeme("biaoyang", "表扬", "biǎoyáng", "khen ngợi, biểu dương", "Động từ", 23),
  lexeme("jinbu", "进步", "jìnbù", "tiến bộ", "Động từ/Tính từ", 24),
  lexeme("guli", "鼓励", "gǔlì", "khuyến khích, động viên", "Động từ", 25),
  lexeme("shuai", "帅", "shuài", "đẹp trai, bảnh bao", "Tính từ", 26),
  lexeme("pingpangqiu", "乒乓球", "pīngpāngqiú", "bóng bàn", "Danh từ", 27),
  lexeme("dui", "队", "duì", "đội", "Danh từ", 28),
  lexeme("xiang", "项", "xiàng", "hạng mục, mục (dùng cho nội dung thi đấu, công việc, nhiệm vụ…)", "Lượng từ", 29),
  lexeme("yingde", "赢得", "yíngdé", "giành được, thắng được", "Động từ", 30),
  lexeme("jiaozuo", "叫作", "jiàozuò", "được gọi là", "Động từ", 31),
  lexeme("meng", "梦", "mèng", "giấc mơ; mơ", "Danh từ/Động từ", 32),
  lexeme("buduan", "不断", "búduàn", "không ngừng, liên tục", "Phó từ/Động từ", 33),
  lexeme("duiyuan", "队员", "duìyuán", "thành viên đội, tuyển thủ", "Danh từ", 34),
  lexeme("xunlian", "训练", "xùnliàn", "huấn luyện, tập luyện", "Động từ", 35),
  lexeme("qiudui", "球队", "qiúduì", "đội bóng, đội thi đấu các môn bóng", "Danh từ", 36),
  lexeme("qiumi", "球迷", "qiúmí", "người hâm mộ (các môn bóng), cổ động viên", "Danh từ", 37),
  lexeme("mengxiang", "梦想", "mèngxiǎng", "ước mơ; mơ ước", "Danh từ/Động từ", 38),
  lexeme("dasai", "大赛", "dàsài", "giải đấu lớn, cuộc thi lớn", "Danh từ", 39),
  lexeme("ying", "赢", "yíng", "thắng, giành chiến thắng", "Động từ", 40),
  lexeme("lian", "连", "lián", "ngay cả, đến cả", "Giới từ", 41),
];

/** Liên kết 41 từ với bài 17, giữ thứ tự nguồn. */
export const HSK4_XIA_L17_VOCABULARY: LessonVocabulary[] = HSK4_XIA_L17_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-xia-l17',
    groupId: 'hsk4-xia-l17-g1',
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
    id: `hsk4-xia-l17-g1-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-xia-l17-g1-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * - 路过 "我每天路过这家书店。" / 趟 "这周我去了两趟健身房。" / 健身房 "健身房离我家很近。"
 * - 健身 "他每天去健身。" / 体重 "我的体重是六十公斤。" / 会员 "我是这家健身房的会员。"
 * - 饼干 "我买了一包饼干。" / 酸奶 "早上我喝一杯酸奶。" / 果汁 "请给我一杯果汁。"
 * - 教练 "教练教我们做动作。" / 动作 "这个动作很难。" / 科学 "科学的运动方法很重要。"
 * - 受伤 "运动时要小心，别受伤。" / 操场 "我们在操场上跑步。" / 其中 "我们班有二十个人，其中十个是男生。"
 * - 之 "成功之路上没有捷径。" / 火 "这首歌现在很火。" / 好处 "运动有很多好处。"
 * - 设备 "这个健身房的设备很好。" / 全身 "我全身都累了。" / 准确 "你的回答很准确。"
 * - 仅仅 "他仅仅睡了三个小时。" / 表扬 "老师表扬了他。" / 进步 "你的汉语进步很快。"
 * - 鼓励 "老师常常鼓励我们。" / 帅 "他长得很帅。" / 乒乓球 "我喜欢打乒乓球。"
 * - 队 "我们队赢了。" / 项 "乒乓球是一项运动。" / 赢得 "我们队赢得了比赛。"
 * - 叫作 "这种运动叫作乒乓球。" / 梦 "我做了一个好梦。" / 不断 "他不断地练习。"
 * - 队员 "他是我们队的队员。" / 训练 "队员每天训练。" / 球队 "这支球队很强。"
 * - 球迷 "他是一个球迷。" / 梦想 "我的梦想是当一名老师。" / 大赛 "我们要参加一场大赛。"
 * - 赢 "我们一定会赢。" / 连 "连小孩子都会打乒乓球。"
 */
export const HSK4_XIA_L17_EXAMPLES: Example[] = [
  example("luguo", "我每天路过这家书店。", "Wǒ měitiān lùguò zhè jiā shūdiàn.", "Mỗi ngày tôi đi ngang qua hiệu sách này."),
  example("tang", "这周我去了两趟健身房。", "Zhè zhōu wǒ qù le liǎng tàng jiànshēnfáng.", "Tuần này tôi đã đi phòng gym hai lần."),
  example("jianshenfang", "健身房离我家很近。", "Jiànshēnfáng lí wǒ jiā hěn jìn.", "Phòng gym rất gần nhà tôi."),
  example("jianshen", "他每天去健身。", "Tā měitiān qù jiànshēn.", "Anh ấy ngày nào cũng đi tập gym."),
  example("tizhong", "我的体重是六十公斤。", "Wǒ de tǐzhòng shì liùshí gōngjīn.", "Cân nặng của tôi là sáu mươi ki-lô-gam."),
  example("huiyuan", "我是这家健身房的会员。", "Wǒ shì zhè jiā jiànshēnfáng de huìyuán.", "Tôi là hội viên của phòng gym này."),
  example("binggan", "我买了一包饼干。", "Wǒ mǎi le yì bāo bǐnggān.", "Tôi đã mua một gói bánh quy."),
  example("suannai", "早上我喝一杯酸奶。", "Zǎoshang wǒ hē yì bēi suānnǎi.", "Buổi sáng tôi uống một cốc sữa chua."),
  example("guozhi", "请给我一杯果汁。", "Qǐng gěi wǒ yì bēi guǒzhī.", "Xin cho tôi một cốc nước ép trái cây."),
  example("jiaolian", "教练教我们做动作。", "Jiàoliàn jiāo wǒmen zuò dòngzuò.", "Huấn luyện viên dạy chúng tôi làm động tác."),
  example("dongzuo", "这个动作很难。", "Zhège dòngzuò hěn nán.", "Động tác này rất khó."),
  example("kexue", "科学的运动方法很重要。", "Kēxué de yùndòng fāngfǎ hěn zhòngyào.", "Phương pháp vận động khoa học rất quan trọng."),
  example("shoushang", "运动时要小心，别受伤。", "Yùndòng shí yào xiǎoxīn, bié shòushāng.", "Khi vận động phải cẩn thận, đừng để bị thương."),
  example("caochang", "我们在操场上跑步。", "Wǒmen zài cāochǎng shàng pǎobù.", "Chúng tôi chạy bộ trên sân vận động."),
  example("qizhong", "我们班有二十个人，其中十个是男生。", "Wǒmen bān yǒu èrshí gè rén, qízhōng shí gè shì nánshēng.", "Lớp chúng tôi có hai mươi người, trong đó mười người là nam."),
  example("zhi", "成功之路上没有捷径。", "Chénggōng zhī lù shàng méiyǒu jiéjìng.", "Trên con đường thành công không có đường tắt."),
  example("huo", "这首歌现在很火。", "Zhè shǒu gē xiànzài hěn huǒ.", "Bài hát này hiện đang rất hot."),
  example("haochu", "运动有很多好处。", "Yùndòng yǒu hěn duō hǎochù.", "Vận động có rất nhiều lợi ích."),
  example("shebei", "这个健身房的设备很好。", "Zhège jiànshēnfáng de shèbèi hěn hǎo.", "Thiết bị của phòng gym này rất tốt."),
  example("quanshen", "我全身都累了。", "Wǒ quánshēn dōu lèi le.", "Toàn thân tôi đều mệt."),
  example("zhunque", "你的回答很准确。", "Nǐ de huídá hěn zhǔnquè.", "Câu trả lời của bạn rất chính xác."),
  example("jinjin", "他仅仅睡了三个小时。", "Tā jǐnjǐn shuì le sān gè xiǎoshí.", "Anh ấy mới chỉ ngủ ba tiếng."),
  example("biaoyang", "老师表扬了他。", "Lǎoshī biǎoyáng le tā.", "Thầy giáo đã khen ngợi anh ấy."),
  example("jinbu", "你的汉语进步很快。", "Nǐ de Hànyǔ jìnbù hěn kuài.", "Tiếng Trung của bạn tiến bộ rất nhanh."),
  example("guli", "老师常常鼓励我们。", "Lǎoshī chángcháng gǔlì wǒmen.", "Thầy giáo thường xuyên động viên chúng tôi."),
  example("shuai", "他长得很帅。", "Tā zhǎng de hěn shuài.", "Anh ấy trông rất đẹp trai."),
  example("pingpangqiu", "我喜欢打乒乓球。", "Wǒ xǐhuān dǎ pīngpāngqiú.", "Tôi thích chơi bóng bàn."),
  example("dui", "我们队赢了。", "Wǒmen duì yíng le.", "Đội chúng tôi đã thắng."),
  example("xiang", "乒乓球是一项运动。", "Pīngpāngqiú shì yí xiàng yùndòng.", "Bóng bàn là một môn thể thao."),
  example("yingde", "我们队赢得了比赛。", "Wǒmen duì yíngdé le bǐsài.", "Đội chúng tôi đã giành chiến thắng trong trận đấu."),
  example("jiaozuo", "这种运动叫作乒乓球。", "Zhè zhǒng yùndòng jiàozuò pīngpāngqiú.", "Môn thể thao này được gọi là bóng bàn."),
  example("meng", "我做了一个好梦。", "Wǒ zuò le yí gè hǎo mèng.", "Tôi đã mơ một giấc mơ đẹp."),
  example("buduan", "他不断地练习。", "Tā búduàn de liànxí.", "Anh ấy luyện tập không ngừng."),
  example("duiyuan", "他是我们队的队员。", "Tā shì wǒmen duì de duìyuán.", "Anh ấy là thành viên đội của chúng tôi."),
  example("xunlian", "队员每天训练。", "Duìyuán měitiān xùnliàn.", "Các thành viên đội ngày nào cũng tập luyện."),
  example("qiudui", "这支球队很强。", "Zhè zhī qiúduì hěn qiáng.", "Đội bóng này rất mạnh."),
  example("qiumi", "他是一个球迷。", "Tā shì yí gè qiúmí.", "Anh ấy là một cổ động viên."),
  example("mengxiang", "我的梦想是当一名老师。", "Wǒ de mèngxiǎng shì dāng yì míng lǎoshī.", "Ước mơ của tôi là trở thành một giáo viên."),
  example("dasai", "我们要参加一场大赛。", "Wǒmen yào cānjiā yì chǎng dàsài.", "Chúng tôi sẽ tham gia một giải đấu lớn."),
  example("ying", "我们一定会赢。", "Wǒmen yídìng huì yíng.", "Chúng tôi nhất định sẽ thắng."),
  example("lian", "连小孩子都会打乒乓球。", "Lián xiǎo háizi dōu huì dǎ pīngpāngqiú.", "Ngay cả trẻ con cũng biết chơi bóng bàn."),
];

/** Alias ngắn cho HSK4_XIA_L17_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_XIA_L17_EXAMPLES;
