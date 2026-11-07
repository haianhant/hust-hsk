/**
 * Dữ liệu khởi đầu: HSK 4 quyển hạ — Bài 12 (43 từ, 1 nhóm duy nhất).
 *
 * Nguồn đối soát: https://hoc-hsk.vercel.app/hsk4-ha (file dữ liệu công khai
 * assets/data/hsk4-xia.js, tải về /tmp và đếm trực tiếp 2026-11-06;
 * xem docs/content-audit.md §3c + §4 + §6).
 * Đối chiếu audit: bài 12 = 43 từ — KHỚP.
 *
 * NHÓM TỪ QUYỂN HẠ — CHỈ 1 NHÓM/BÀI: file nguồn không có bảng nhóm từ
 * (không có vocabGroupsX), và engine.js hàm vocabGroupsCur() với isXia()
 * trả về [l.vocab.map((v,i)=>i)] — tức trên trang render thật, mỗi bài hạ
 * chỉ có MỘT nhóm duy nhất chứa toàn bộ từ của bài. Vì vậy file này chỉ
 * định nghĩa g1 chứa toàn bộ 43 từ, đúng thứ tự nguồn; KHÔNG tự chia
 * nhóm theo cảm tính.
 *
 * Ví dụ: mỗi từ 1 câu NGẮN do nhóm dự án tự viết, đã rà soát tiếng Trung,
 * gắn cờ source 'authored' — KHÔNG trình bày là trích giáo trình,
 * KHÔNG sao chép toàn văn bài khóa.
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

export const HSK4_XIA_L12_LESSON: Lesson = {
  id: 'hsk4-xia-l12',
  courseId: 'hsk4-xia',
  number: 12,
  title: '幸福的家庭',
  topic: 'Gia đình hạnh phúc: quan tâm cha mẹ, ứng xử trong nhà & tình thân',
};

export const HSK4_XIA_L12_GROUP: LessonGroup = {
  id: 'hsk4-xia-l12-g1',
  lessonId: 'hsk4-xia-l12',
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
    id: `hsk4-xia-l12-g1-${idSuffix}`,
    hanzi,
    pinyin,
    meaning,
    pos,
    courseId: 'hsk4-xia',
    lessonId: 'hsk4-xia-l12',
    groupId: 'hsk4-xia-l12-g1',
    order,
    sourceUrl: SOURCE_URL,
    verifiedAt: VERIFIED_AT,
    status: 'verified',
  };
}

/** 43 từ bài 12, nhóm duy nhất g1, đúng thứ tự nguồn 1..43. */
export const HSK4_XIA_L12_LEXEMES: Lexeme[] = [
  lexeme('maoyi', '毛衣', 'máoyī', 'áo len', 'Danh từ', 1),
  lexeme('yangzi', '样子', 'yàngzi', 'kiểu dáng, mẫu mã', 'Danh từ', 2),
  lexeme('shihe', '适合', 'shìhé', 'phù hợp, thích hợp', 'Động từ', 3),
  lexeme('shouhuoyuan', '售货员', 'shòuhuòyuán', 'nhân viên bán hàng', 'Danh từ', 4),
  lexeme('zhiliang', '质量', 'zhìliàng', 'chất lượng', 'Danh từ', 5),
  lexeme('qiang', '强', 'qiáng', 'hơn, tốt hơn; mạnh', 'Tính từ', 6),
  lexeme('niandi', '年底', 'niándǐ', 'cuối năm', 'Danh từ', 7),
  lexeme('quan', '全', 'quán', 'toàn bộ, tất cả; hoàn toàn', 'Tính từ/Phó từ', 8),
  lexeme('dazhe', '打折', 'dǎzhé', 'giảm giá, chiết khấu', 'Động từ', 9),
  lexeme('zhi', '值', 'zhí', 'đáng (giá), xứng đáng', 'Tính từ/Động từ', 10),
  lexeme('guji', '估计', 'gūjì', 'đoán chừng, ước lượng', 'Động từ', 11),
  lexeme('qi', '期', 'qī', 'kỳ, đợt (cho sự việc tổ chức theo kỳ)', 'Lượng từ', 12),
  lexeme('tingli', '听力', 'tīnglì', 'thính lực, khả năng nghe', 'Danh từ', 13),
  lexeme('fan', '烦', 'fán', 'bực bội, khó chịu; làm phiền', 'Tính từ/Động từ', 14),
  lexeme('tuo', '脱', 'tuō', 'cởi (quần áo, giày)', 'Động từ', 15),
  lexeme('gua', '挂', 'guà', 'treo, móc', 'Động từ', 16),
  lexeme('piqi', '脾气', 'píqi', 'tính khí, tính nóng nảy （发脾气： nổi giận)', 'Danh từ', 17),
  lexeme('shangxin', '伤心', 'shāngxīn', 'đau lòng, buồn bã', 'Tính từ', 18),
  lexeme('piping', '批评', 'pīpíng', 'phê bình', 'Động từ', 19),
  lexeme('daoqian', '道歉', 'dàoqiàn', 'xin lỗi', 'Động từ', 20),
  lexeme('laojia', '老家', 'lǎojiā', 'quê nhà, quê gốc', 'Danh từ', 21),
  lexeme('zi', '自', 'zì', 'từ, kể từ', 'Giới từ', 22),
  lexeme('fumu', '父母', 'fùmǔ', 'cha mẹ', 'Danh từ', 23),
  lexeme('fuzi', '父子', 'fùzǐ', 'cha và con', 'Danh từ', 24),
  lexeme('muzi', '母子', 'mǔzǐ', 'mẹ và con', 'Danh từ', 25),
  lexeme('wulun', '无论', 'wúlùn', 'bất luận, dù cho', 'Liên từ', 26),
  lexeme('tiaojian', '条件', 'tiáojiàn', 'điều kiện', 'Danh từ', 27),
  lexeme('yunxu', '允许', 'yǔnxǔ', 'cho phép', 'Động từ', 28),
  lexeme('lingwai', '另外', 'lìngwài', 'ngoài ra; (cái) khác; riêng ra', 'Phó từ/Đại từ/Liên từ', 29),
  lexeme('weisheng', '卫生', 'wèishēng', 'vệ sinh; hợp vệ sinh', 'Danh từ/Tính từ', 30),
  lexeme('muqin', '母亲', 'mǔqīn', 'mẹ', 'Danh từ', 31),
  lexeme('dai', '待', 'dāi', 'ở, nán lại', 'Động từ', 32),
  lexeme('jiang', '将', 'jiāng', '(trang trọng, dùng như 把）', 'Giới từ', 33),
  lexeme('wen', '闻', 'wén', 'ngửi', 'Động từ', 34),
  lexeme('weidao', '味道', 'wèidào', 'mùi; hương vị', 'Danh từ', 35),
  lexeme('lengjing', '冷静', 'lěngjìng', 'bình tĩnh, điềm tĩnh', 'Tính từ', 36),
  lexeme('bizi', '鼻子', 'bízi', 'mũi', 'Danh từ', 37),
  lexeme('fuqin', '父亲', 'fùqīn', 'cha', 'Danh từ', 38),
  lexeme('cheng', '城', 'chéng', 'thành phố', 'Danh từ', 39),
  lexeme('xian', '鲜', 'xiān', 'tươi ngon, đậm vị (món ăn)', 'Tính từ', 40),
  lexeme('nuan', '暖', 'nuǎn', 'ấm áp', 'Tính từ', 41),
  lexeme('yonggan', '勇敢', 'yǒnggǎn', 'dũng cảm', 'Tính từ', 42),
  lexeme('shangliang', '商量', 'shāngliang', 'bàn bạc, thương lượng', 'Động từ', 43),
];

/** Liên kết 43 từ với bài 12, giữ thứ tự nguồn. */
export const HSK4_XIA_L12_VOCABULARY: LessonVocabulary[] = HSK4_XIA_L12_LEXEMES.map(
  (w) => ({
    lessonId: 'hsk4-xia-l12',
    groupId: 'hsk4-xia-l12-g1',
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
    id: `hsk4-xia-l12-g1-${lexemeIdSuffix}-ex1`,
    lexemeId: `hsk4-xia-l12-g1-${lexemeIdSuffix}`,
    hanzi,
    pinyin,
    meaning,
    source: 'authored',
  };
}

/**
 * Ví dụ tự viết (source 'authored'), mỗi từ 1 câu ngắn, đã rà soát:
 * 毛衣 '妈妈给我织了一件毛衣。' / 样子 '这件衣服的样子很好看。' / 适合 '这件毛衣很适合你。' / 售货员 '售货员很热情。' / 质量 '这件衣服的质量很好。' / 强 '他的身体比我强。' / 年底 '我们年底回家。' / 全 '全家人都来了。' / 打折 '这家店今天打折。' / 值 '这件衣服很值。' / 估计 '我估计他今天不来。' / 期 '这是第一期课程。' / 听力 '他的听力很好。' / 烦 '我今天很烦。' / 脱 '进屋请脱鞋。' / 挂 '请把衣服挂在衣架上。' / 脾气 '他的脾气很好。' / 伤心 '听到这个消息，我很伤心。' / 批评 '老师批评了他。' / 道歉 '他向我道歉了。' / 老家 '我的老家在农村。' / 自 '我自小就喜欢画画。' / 父母 '我的父母住在老家。' / 父子 '这对父子很像。' / 母子 '这对母子一起去公园。' / 无论 '无论多忙，我都要回家。' / 条件 '这个条件很好。' / 允许 '这里不允许吸烟。' / 另外 '另外，我还有一件事。' / 卫生 '请你注意卫生。' / 母亲 '我的母亲很爱我。' / 待 '我想在家里待一天。' / 将 '请将书放在桌子上。' / 闻 '我闻到了花的香味。' / 味道 '这道菜的味道很好。' / 冷静 '请你冷静下来。' / 鼻子 '我的鼻子不舒服。' / 父亲 '我的父亲是一名医生。' / 城 '这座城很美。' / 鲜 '这条鱼很鲜。' / 暖 '这个房间很暖。' / 勇敢 '他是一个勇敢的孩子。' / 商量 '我们商量一下吧。'
 */
export const HSK4_XIA_L12_EXAMPLES: Example[] = [
  example('maoyi', '妈妈给我织了一件毛衣。', 'māma gěi wǒ zhī le yí jiàn máoyī.', 'Mẹ đã đan cho tôi một chiếc áo len.'),
  example('yangzi', '这件衣服的样子很好看。', 'zhè jiàn yīfu de yàngzi hěn hǎokàn.', 'Kiểu dáng của chiếc áo này rất đẹp.'),
  example('shihe', '这件毛衣很适合你。', 'zhè jiàn máoyī hěn shìhé nǐ.', 'Chiếc áo len này rất hợp với bạn.'),
  example('shouhuoyuan', '售货员很热情。', 'shòuhuòyuán hěn rèqíng.', 'Nhân viên bán hàng rất nhiệt tình.'),
  example('zhiliang', '这件衣服的质量很好。', 'zhè jiàn yīfu de zhìliàng hěn hǎo.', 'Chất lượng của chiếc áo này rất tốt.'),
  example('qiang', '他的身体比我强。', 'tā de shēntǐ bǐ wǒ qiáng.', 'Sức khỏe của anh ấy tốt hơn tôi.'),
  example('niandi', '我们年底回家。', 'wǒmen niándǐ huí jiā.', 'Cuối năm chúng tôi về nhà.'),
  example('quan', '全家人都来了。', 'quán jiārén dōu lái le.', 'Cả nhà đều đã đến.'),
  example('dazhe', '这家店今天打折。', 'zhè jiā diàn jīntiān dǎzhé.', 'Cửa hàng này hôm nay giảm giá.'),
  example('zhi', '这件衣服很值。', 'zhè jiàn yīfu hěn zhí.', 'Chiếc áo này rất đáng giá.'),
  example('guji', '我估计他今天不来。', 'wǒ gūjì tā jīntiān bù lái.', 'Tôi đoán chừng hôm nay anh ấy không đến.'),
  example('qi', '这是第一期课程。', 'zhè shì dì yī qī kèchéng.', 'Đây là khóa học đợt đầu tiên.'),
  example('tingli', '他的听力很好。', 'tā de tīnglì hěn hǎo.', 'Khả năng nghe của anh ấy rất tốt.'),
  example('fan', '我今天很烦。', 'wǒ jīntiān hěn fán.', 'Hôm nay tôi rất bực bội.'),
  example('tuo', '进屋请脱鞋。', 'jìn wū qǐng tuō xié.', 'Vào nhà xin hãy cởi giày.'),
  example('gua', '请把衣服挂在衣架上。', 'qǐng bǎ yīfu guà zài yījià shang.', 'Xin hãy treo quần áo lên móc.'),
  example('piqi', '他的脾气很好。', 'tā de píqi hěn hǎo.', 'Tính khí của anh ấy rất tốt.'),
  example('shangxin', '听到这个消息，我很伤心。', 'tīng dào zhège xiāoxi, wǒ hěn shāngxīn.', 'Nghe tin này, tôi rất đau lòng.'),
  example('piping', '老师批评了他。', 'lǎoshī pīpíng le tā.', 'Thầy giáo đã phê bình anh ấy.'),
  example('daoqian', '他向我道歉了。', 'tā xiàng wǒ dàoqiàn le.', 'Anh ấy đã xin lỗi tôi.'),
  example('laojia', '我的老家在农村。', 'wǒ de lǎojiā zài nóngcūn.', 'Quê nhà của tôi ở nông thôn.'),
  example('zi', '我自小就喜欢画画。', 'wǒ zì xiǎo jiù xǐhuan huàhuà.', 'Từ nhỏ tôi đã thích vẽ.'),
  example('fumu', '我的父母住在老家。', 'wǒ de fùmǔ zhù zài lǎojiā.', 'Cha mẹ tôi sống ở quê nhà.'),
  example('fuzi', '这对父子很像。', 'zhè duì fùzǐ hěn xiàng.', 'Cặp cha con này rất giống nhau.'),
  example('muzi', '这对母子一起去公园。', 'zhè duì mǔzǐ yìqǐ qù gōngyuán.', 'Cặp mẹ con này cùng đi công viên.'),
  example('wulun', '无论多忙，我都要回家。', 'wúlùn duō máng, wǒ dōu yào huí jiā.', 'Dù bận đến đâu, tôi cũng phải về nhà.'),
  example('tiaojian', '这个条件很好。', 'zhège tiáojiàn hěn hǎo.', 'Điều kiện này rất tốt.'),
  example('yunxu', '这里不允许吸烟。', 'zhèlǐ bù yǔnxǔ xīyān.', 'Ở đây không cho phép hút thuốc.'),
  example('lingwai', '另外，我还有一件事。', 'lìngwài, wǒ hái yǒu yí jiàn shì.', 'Ngoài ra, tôi còn một việc nữa.'),
  example('weisheng', '请你注意卫生。', 'qǐng nǐ zhùyì wèishēng.', 'Xin bạn hãy chú ý vệ sinh.'),
  example('muqin', '我的母亲很爱我。', 'wǒ de mǔqīn hěn ài wǒ.', 'Mẹ tôi rất yêu tôi.'),
  example('dai', '我想在家里待一天。', 'wǒ xiǎng zài jiālǐ dāi yì tiān.', 'Tôi muốn ở nhà một ngày.'),
  example('jiang', '请将书放在桌子上。', 'qǐng jiāng shū fàng zài zhuōzi shang.', 'Xin hãy đặt sách lên bàn.'),
  example('wen', '我闻到了花的香味。', 'wǒ wén dào le huā de xiāngwèi.', 'Tôi ngửi thấy mùi thơm của hoa.'),
  example('weidao', '这道菜的味道很好。', 'zhè dào cài de wèidào hěn hǎo.', 'Món ăn này có hương vị rất ngon.'),
  example('lengjing', '请你冷静下来。', 'qǐng nǐ lěngjìng xiàlai.', 'Xin bạn hãy bình tĩnh lại.'),
  example('bizi', '我的鼻子不舒服。', 'wǒ de bízi bù shūfu.', 'Mũi tôi khó chịu.'),
  example('fuqin', '我的父亲是一名医生。', 'wǒ de fùqīn shì yì míng yīshēng.', 'Cha tôi là một bác sĩ.'),
  example('cheng', '这座城很美。', 'zhè zuò chéng hěn měi.', 'Thành phố này rất đẹp.'),
  example('xian', '这条鱼很鲜。', 'zhè tiáo yú hěn xiān.', 'Con cá này rất tươi ngon.'),
  example('nuan', '这个房间很暖。', 'zhège fángjiān hěn nuǎn.', 'Căn phòng này rất ấm áp.'),
  example('yonggan', '他是一个勇敢的孩子。', 'tā shì yí gè yǒnggǎn de háizi.', 'Anh ấy là một đứa trẻ dũng cảm.'),
  example('shangliang', '我们商量一下吧。', 'wǒmen shāngliang yí xià ba.', 'Chúng ta bàn bạc một chút nhé.'),
];

/** Alias ngắn cho HSK4_XIA_L12_EXAMPLES (dùng chung cho UI sổ tay). */
export const EXAMPLES: Example[] = HSK4_XIA_L12_EXAMPLES;
