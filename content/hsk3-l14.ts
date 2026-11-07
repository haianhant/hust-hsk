/**
 * Dữ liệu: HSK 3 — Bài 14 (27 từ, 4 nhóm 7+4+8+8).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk3 (kiểm chứng 2026-11-06,
 * xem docs/content-audit.md §3a: bài 14 có 27 từ, nhóm 7+4+8+8).
 * Thứ tự + ranh giới nhóm theo bảng 生词 (file hsk3-vocabgroups.js công khai);
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép câu ví dụ của site nguồn hay toàn văn bài khóa.
 */
import { HSK3_COURSE } from './hsk3-l10';
import type {
  Example,
  Lesson,
  LessonGroup,
  LessonVocabulary,
  Lexeme,
} from '../lib/learn/types';

export { HSK3_COURSE };

export const HSK3_L14_LESSON: Lesson = {
  id: 'hsk3-l14',
  courseId: 'hsk3',
  number: 14,
  title: "这本书被别人借走了",
  topic: "Thư viện & câu chữ 被",
};

export const HSK3_L14_GROUP1: LessonGroup = {
  id: 'hsk3-l14-g1',
  lessonId: 'hsk3-l14',
  index: 1,
};

export const HSK3_L14_GROUP2: LessonGroup = {
  id: 'hsk3-l14-g2',
  lessonId: 'hsk3-l14',
  index: 2,
};

export const HSK3_L14_GROUP3: LessonGroup = {
  id: 'hsk3-l14-g3',
  lessonId: 'hsk3-l14',
  index: 3,
};

export const HSK3_L14_GROUP4: LessonGroup = {
  id: 'hsk3-l14-g4',
  lessonId: 'hsk3-l14',
  index: 4,
};

export const HSK3_L14_GROUPS: LessonGroup[] = [
  HSK3_L14_GROUP1,
  HSK3_L14_GROUP2,
  HSK3_L14_GROUP3,
  HSK3_L14_GROUP4,
];

const SOURCE_URL = 'https://hoc-hsk.vercel.app/hsk3';
const VERIFIED_AT = '2026-11-06';

function lexeme(
  groupId: string,
  idSuffix: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
  pos: string,
  order: number,
): Lexeme {
  const group = Number(groupId.slice(-1));
  return {
    id: `hsk3-l14-g${group}-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk3',
    lessonId: 'hsk3-l14',
    groupId,
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 27 từ bài 14, đúng thứ tự nguồn trong từng nhóm. */
export const HSK3_L14_LEXEMES: Lexeme[] = [
  lexeme('hsk3-l14-g1', "cidian", "词典", "cídiǎn", "từ điển", "danh từ", 1),
  lexeme('hsk3-l14-g1', "zuihao", "最好", "zuìhǎo", "tốt nhất", "phó từ", 2),
  lexeme('hsk3-l14-g1', "jie", "节", "jié", "tiết (học)", "lượng từ", 3),
  lexeme('hsk3-l14-g1', "tushuguan", "图书馆", "túshūguǎn", "thư viện", "danh từ", 4),
  lexeme('hsk3-l14-g1', "bei", "被", "bèi", "bị, được", "giới từ", 5),
  lexeme('hsk3-l14-g1', "mingren", "名人", "míngrén", "danh nhân", "danh từ", 6),
  lexeme('hsk3-l14-g1', "gushi", "故事", "gùshi", "câu chuyện", "danh từ", 7),
  lexeme('hsk3-l14-g2', "ranhou", "然后", "ránhòu", "sau đó", "liên từ", 1),
  lexeme('hsk3-l14-g2', "baozhi", "报纸", "bàozhǐ", "báo, tờ báo", "danh từ", 2),
  lexeme('hsk3-l14-g2', "wangji", "忘记", "wàngjì", "quên", "động từ", 3),
  lexeme('hsk3-l14-g2', "dianzishu", "电子书", "diànzǐshū", "sách điện tử", "danh từ", 4),
  lexeme('hsk3-l14-g3', "nvsheng", "女生", "nǚshēng", "nữ sinh", "danh từ", 1),
  lexeme('hsk3-l14-g3', "biaoyan", "表演", "biǎoyǎn", "biểu diễn", "động từ", 2),
  lexeme('hsk3-l14-g3', "jiemu", "节目", "jiémù", "tiết mục", "danh từ", 3),
  lexeme('hsk3-l14-g3', "zenmeban", "怎么办", "zěnme bàn", "làm thế nào", "cụm từ", 4),
  lexeme('hsk3-l14-g3', "xiaozhang", "校长", "xiàozhǎng", "hiệu trưởng", "danh từ", 5),
  lexeme('hsk3-l14-g3', "mianqian", "面前", "miànqián", "phía trước, trước mặt", "danh từ", 6),
  lexeme('hsk3-l14-g3', "youxie", "有些", "yǒuxiē", "hơi, có phần", "phó từ", 7),
  lexeme('hsk3-l14-g3', "xiangxin", "相信", "xiāngxìn", "tin tưởng", "động từ", 8),
  lexeme('hsk3-l14-g4', "xinnian", "新年", "xīnnián", "năm mới", "danh từ", 1),
  lexeme('hsk3-l14-g4', "banji", "班级", "bānjí", "lớp học", "danh từ", 2),
  lexeme('hsk3-l14-g4', "tiao", "跳", "tiào", "nhảy, khiêu vũ", "động từ", 3),
  lexeme('hsk3-l14-g4', "liuxuesheng", "留学生", "liúxuéshēng", "lưu học sinh", "danh từ", 4),
  lexeme('hsk3-l14-g4', "zuihou", "最后", "zuìhòu", "cuối cùng", "danh từ/phó từ", 5),
  lexeme('hsk3-l14-g4', "yikuair", "一块儿", "yíkuàir", "cùng nhau", "phó từ", 6),
  lexeme('hsk3-l14-g4', "wangzhan", "网站", "wǎngzhàn", "trang web", "danh từ", 7),
  lexeme('hsk3-l14-g4', "shipin", "视频", "shìpín", "video", "danh từ", 8),
];

/** Liên kết 27 từ với bài 14, giữ thứ tự nguồn. */
export const HSK3_L14_VOCABULARY: LessonVocabulary[] = HSK3_L14_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk3-l14',
    groupId: w.groupId,
    lexemeId: w.id,
    order: w.order,
  }),
);

function example(
  lexemeId: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
): Example {
  return {
    id: `${lexemeId}-ex1`,
    lexemeId,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/** Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát. */
export const HSK3_L14_EXAMPLES: Example[] = [
  example("hsk3-l14-g1-cidian", "我有一本词典。", "wǒ yǒu yì běn cídiǎn.", "Tôi có một cuốn từ điển."),
  example("hsk3-l14-g1-zuihao", "最好先问老师。", "zuìhǎo xiān wèn lǎoshī.", "Tốt nhất hỏi cô giáo trước."),
  example("hsk3-l14-g1-jie", "今天有三节课。", "jīntiān yǒu sān jié kè.", "Hôm nay có ba tiết học."),
  example("hsk3-l14-g1-tushuguan", "图书馆在学校里。", "túshūguǎn zài xuéxiào lǐ.", "Thư viện ở trong trường."),
  example("hsk3-l14-g1-bei", "我的伞被风吹走了。", "wǒ de sǎn bèi fēng chuī zǒu le.", "Ô của tôi bị gió thổi bay mất."),
  example("hsk3-l14-g1-mingren", "他是一位名人。", "tā shì yí wèi míngrén.", "Anh ấy là một danh nhân."),
  example("hsk3-l14-g1-gushi", "这个故事很有意思。", "zhège gùshi hěn yǒu yìsi.", "Câu chuyện này rất thú vị."),
  example("hsk3-l14-g2-ranhou", "吃完饭，然后回家。", "chī wán fàn, ránhòu huí jiā.", "Ăn cơm xong, sau đó về nhà."),
  example("hsk3-l14-g2-baozhi", "爷爷每天看报纸。", "yéye měitiān kàn bàozhǐ.", "Ông nội ngày nào cũng đọc báo."),
  example("hsk3-l14-g2-wangji", "我忘记带书了。", "wǒ wàngjì dài shū le.", "Tôi quên mang sách rồi."),
  example("hsk3-l14-g2-dianzishu", "我喜欢看电子书。", "wǒ xǐhuān kàn diànzǐshū.", "Tôi thích đọc sách điện tử."),
  example("hsk3-l14-g3-nvsheng", "教室里有很多女生。", "jiàoshì lǐ yǒu hěn duō nǚshēng.", "Trong lớp học có nhiều nữ sinh."),
  example("hsk3-l14-g3-biaoyan", "她们在表演节目。", "tāmen zài biǎoyǎn jiémù.", "Họ đang biểu diễn tiết mục."),
  example("hsk3-l14-g3-jiemu", "这个节目很好看。", "zhège jiémù hěn hǎokàn.", "Tiết mục này rất hay."),
  example("hsk3-l14-g3-zenmeban", "我不知道怎么办。", "wǒ bù zhīdào zěnme bàn.", "Tôi không biết làm thế nào."),
  example("hsk3-l14-g3-xiaozhang", "校长在开会。", "xiàozhǎng zài kāihuì.", "Hiệu trưởng đang họp."),
  example("hsk3-l14-g3-mianqian", "书在我的面前。", "shū zài wǒ de miànqián.", "Quyển sách ở trước mặt tôi."),
  example("hsk3-l14-g3-youxie", "我有些累。", "wǒ yǒuxiē lèi.", "Tôi hơi mệt."),
  example("hsk3-l14-g3-xiangxin", "我相信你。", "wǒ xiāngxìn nǐ.", "Tôi tin bạn."),
  example("hsk3-l14-g4-xinnian", "新年快乐！", "xīnnián kuàilè!", "Chúc mừng năm mới!"),
  example("hsk3-l14-g4-banji", "我的班级在三楼。", "wǒ de bānjí zài sān lóu.", "Lớp học của tôi ở tầng ba."),
  example("hsk3-l14-g4-tiao", "她跳得很好。", "tā tiào de hěn hǎo.", "Cô ấy nhảy rất giỏi."),
  example("hsk3-l14-g4-liuxuesheng", "他是留学生。", "tā shì liúxuéshēng.", "Anh ấy là lưu học sinh."),
  example("hsk3-l14-g4-zuihou", "最后，我们回家了。", "zuìhòu, wǒmen huí jiā le.", "Cuối cùng, chúng tôi về nhà."),
  example("hsk3-l14-g4-yikuair", "我们一块儿去吧。", "wǒmen yíkuàir qù ba.", "Chúng ta cùng đi nhé."),
  example("hsk3-l14-g4-wangzhan", "这个网站很好。", "zhège wǎngzhàn hěn hǎo.", "Trang web này rất tốt."),
  example("hsk3-l14-g4-shipin", "我看了这个视频。", "wǒ kàn le zhège shìpín.", "Tôi đã xem video này."),
];

/** Alias ngắn cho HSK3_L14_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK3_L14_EXAMPLES;
