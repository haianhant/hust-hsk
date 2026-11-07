"use strict";
// ---------------------------------------------------------------------------
// quest-data.ts — Tuyến "Buổi học đầu tiên" (Bước 5), định nghĩa bằng DỮ LIỆU.
// 13 bước dữ liệu khớp 10 bước thiết kế ở brief §5.1 (bước 4, 5, 7 tách làm
// hai để mỗi bước chỉ có một hành động/câu hỏi). Từ vựng lấy từ
// content/hsk3-l10.ts (LEXEMES, id hsk3-l10-g1-<pinyin>); mọi câu tiếng Trung
// tự soạn đều gắn cờ source:'authored' và KHÔNG trình bày là trích giáo trình.
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSK4_LESSON_QUEST_IDS = exports.L10_QUEST_IDS = exports.ALL_QUEST_DEFS = exports.QUEST_REGISTRY = exports.L18_STEPS = exports.L18_REVIEW_LEXEME_IDS = exports.L18_QUEST = exports.L18_LEXEME_IDS = exports.L17_STEPS = exports.L17_REVIEW_LEXEME_IDS = exports.L17_QUEST = exports.L17_LEXEME_IDS = exports.L16_STEPS = exports.L16_REVIEW_LEXEME_IDS = exports.L16_QUEST = exports.L16_LEXEME_IDS = exports.L15_STEPS = exports.L15_REVIEW_LEXEME_IDS = exports.L15_QUEST = exports.L15_LEXEME_IDS = exports.L14_STEPS = exports.L14_REVIEW_LEXEME_IDS = exports.L14_QUEST = exports.L14_LEXEME_IDS = exports.L13_STEPS = exports.L13_REVIEW_LEXEME_IDS = exports.L13_QUEST = exports.L13_LEXEME_IDS = exports.L12_STEPS = exports.L12_REVIEW_LEXEME_IDS = exports.L12_QUEST = exports.L12_LEXEME_IDS = exports.L11_STEPS = exports.L11_REVIEW_LEXEME_IDS = exports.L11_QUEST = exports.L11_LEXEME_IDS = exports.L10_G234_STEPS = exports.L10_G234_REVIEW_LEXEME_IDS = exports.L10_G234_QUEST = exports.L10_G234_LEXEME_IDS = exports.FIRST_LESSON_STEPS = exports.REVIEW_LEXEME_IDS = exports.FIRST_LESSON_QUEST = exports.LEXEME_IDS = exports.QUEST_ID = void 0;
exports.getQuestDef = getQuestDef;
// HSK 4 (Bước 7): 40 quest nối từ 2 file riêng. Hai file này chỉ import
// TYPE từ file này (QuestDef/QuestStep) nên không có vòng lặp import ở
// runtime — import giá trị dưới đây chỉ lấy các mảng DEFS đã build sẵn.
const quest_data_hsk4_shang_1 = require("./quest-data-hsk4-shang");
const quest_data_hsk4_xia_1 = require("./quest-data-hsk4-xia");
exports.QUEST_ID = 'first-lesson';
exports.LEXEME_IDS = [
    'hsk3-l10-g1-shuxue',
    'hsk3-l10-g1-renzhen',
    'hsk3-l10-g1-biji',
    'hsk3-l10-g1-qingchu',
    'hsk3-l10-g1-heiban',
    'hsk3-l10-g1-ba',
    'hsk3-l10-g1-zuoye',
    'hsk3-l10-g1-bian',
    'hsk3-l10-g1-tigao',
];
exports.FIRST_LESSON_QUEST = {
    id: exports.QUEST_ID,
    title: 'Buổi học đầu tiên',
    lessonId: 'hsk3-l10',
    lexemeIds: [...exports.LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'first-lesson',
};
/** 5 từ kiểm tra cuối (bước 8): câu hỏi mới, không lặp câu ở các bước trước. */
exports.REVIEW_LEXEME_IDS = [
    'hsk3-l10-g1-shuxue',
    'hsk3-l10-g1-heiban',
    'hsk3-l10-g1-biji',
    'hsk3-l10-g1-zuoye',
    'hsk3-l10-g1-tigao',
];
exports.FIRST_LESSON_STEPS = [
    // 1 — Spawn ở cổng Parabol; Minh chào + chỉ đường tới phòng học ở nhà C1.
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天是数学课，我们去教室吧。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay có tiết Toán, mình cùng tới phòng học nhé. Phòng học ở nhà C1, ngay chân bậc tam cấp — cứ đi theo đường chính về phía bắc.',
        speakText: '你好！我是明。今天是数学课，我们去教室吧。',
    },
    // 1 (tiếp) — Đi tới cửa phòng học (CLASSROOM_DOOR, chân bậc tam cấp C1).
    {
        id: 'goto-door',
        kind: 'goto',
        targetId: 'classroom-door',
        vi: 'Đi tới cửa phòng học ở chân bậc tam cấp nhà C1 (theo đường chính về phía bắc, qua quảng trường), rồi bấm E để vào lớp.',
    },
    // 2 — Vào phòng; giáo viên nói đây là tiết Toán. Gặp từ 数学.
    {
        id: 'teacher-math',
        kind: 'talk',
        npc: 'teacher',
        zh: '今天是数学课。',
        vi: 'Hôm nay là tiết Toán.',
        lexemeId: 'hsk3-l10-g1-shuxue',
        speakText: '今天是数学课。',
    },
    // 3 — Nghe "请看黑板。" → chọn đúng bảng đen giữa các vật (không mũi tên chỉ đáp án).
    {
        id: 'find-board',
        kind: 'pick-object',
        lexemeId: 'hsk3-l10-g1-heiban',
        zh: '请看黑板。',
        vi: 'Hãy nhìn lên bảng đen. Bấm trực tiếp vào đúng vật trong phòng, hoặc chọn ở dưới đây.',
        correctId: 'board',
        options: [
            { id: 'board', label: '黑板', vi: 'bảng đen' },
            { id: 'window', label: '窗户', vi: 'cửa sổ' },
            { id: 'clock', label: '钟', vi: 'đồng hồ' },
            { id: 'shelf', label: '书架', vi: 'kệ sách' },
            { id: 'desk', label: '桌子', vi: 'bàn học' },
        ],
    },
    // 4a — Mở vở 笔记 trên bàn 1 (animation mở vở + panel).
    {
        id: 'open-notebook',
        kind: 'interact-object',
        objectId: 'notebook',
        lexemeId: 'hsk3-l10-g1-biji',
        vi: 'Trên bàn 1 có một quyển vở. Bấm vào quyển vở để mở ra xem.',
        actionLabel: 'Mở vở',
        doneText: 'Bạn đã mở vở ghi chép. Trong vở có ghi: 数学 (môn Toán), 黑板 (bảng đen).',
    },
    // 4b — Nhận tập 作业 trên bàn 1 (animation bay lên tay).
    {
        id: 'take-homework',
        kind: 'interact-object',
        objectId: 'homework',
        lexemeId: 'hsk3-l10-g1-zuoye',
        vi: 'Trên bàn 1 còn có tập bài tập về nhà. Bấm vào tập bài để nhận.',
        actionLabel: 'Nhận bài tập',
        doneText: 'Bạn đã nhận tập bài tập về nhà. Lát nữa nhớ nộp cho cô giáo nhé.',
    },
    // 5a — 认真: chọn cách học chăm chỉ.
    {
        id: 'learn-renzhen',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l10-g1-renzhen',
        scenario: '认真 nghĩa là chăm chỉ, nghiêm túc. Trong hai cách học dưới đây, cách nào là 认真 (học chăm chỉ)?',
        options: [
            {
                text: '每天学习两个小时。',
                correct: true,
                explain: '每天学习两个小时 — mỗi ngày học hai tiếng: đó là cách học chăm chỉ, nghiêm túc.',
            },
            {
                text: '上课玩手机。',
                correct: false,
                explain: '上课玩手机 — trong giờ học nghịch điện thoại: không phải là học chăm chỉ.',
            },
        ],
    },
    // 5b — 清楚: chọn cách nói rõ ràng.
    {
        id: 'learn-qingchu',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l10-g1-qingchu',
        scenario: '清楚 nghĩa là rõ ràng. Câu nào nói rằng cô giáo giảng rất rõ ràng?',
        options: [
            {
                text: '老师说得很清楚。',
                correct: true,
                explain: '老师说得很清楚 — cô giáo nói rất rõ ràng.',
            },
            {
                text: '老师说得不清楚。',
                correct: false,
                explain: '老师说得不清楚 — cô giáo nói không rõ ràng (phủ định của 清楚).',
            },
        ],
    },
    // 6 — 把: xếp câu rồi thực hiện (tập 作业 bay tới tay giáo viên).
    {
        id: 'order-ba',
        kind: 'order',
        lexemeId: 'hsk3-l10-g1-ba',
        zh: '请把作业交给老师。',
        vi: 'Xếp các thẻ từ thành câu đúng (câu tự soạn để luyện cấu trúc 把, không phải trích nguyên văn giáo trình), rồi nộp bài cho cô giáo.',
        tiles: ['请', '把', '作业', '交', '给', '老师', '。'],
        answer: '请把作业交给老师。',
        source: 'authored',
    },
    // 7a — 遍: nghe yêu cầu lặp lại, chọn số lượt (đúng là 3).
    {
        id: 'count-bian',
        kind: 'choose-number',
        lexemeId: 'hsk3-l10-g1-bian',
        zh: '请读三遍。',
        vi: 'Cô giáo bảo: hãy đọc ba lượt. 遍 nghĩa là lượt. Cô muốn bạn đọc mấy lượt?',
        options: [1, 2, 3, 4],
        correct: 3,
        source: 'authored',
    },
    // 7b — 提高: chọn mục tiêu cải thiện (cả hai đều đúng, ghi nhận lựa chọn).
    {
        id: 'goal-tigao',
        kind: 'choose-goal',
        lexemeId: 'hsk3-l10-g1-tigao',
        zh: '我想提高汉语。',
        vi: '提高 nghĩa là nâng cao, cải thiện. Bạn muốn cải thiện điều gì nhất trong học kỳ này? (Cả hai lựa chọn đều đúng — chỉ để ghi nhận mục tiêu của bạn.)',
        options: [
            { text: '我想提高汉语。', vi: 'Tôi muốn nâng cao tiếng Trung.' },
            { text: '我想提高数学。', vi: 'Tôi muốn nâng cao môn Toán.' },
        ],
        source: 'authored',
    },
    // 8 — Kiểm tra cuối 5 từ, ít nhất 1 lượt tự nhớ không nhìn đáp án trước
    // (chỉ hiện chữ Hán, ẩn pinyin + nghĩa; gõ pinyin hoặc chọn nghĩa).
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.REVIEW_LEXEME_IDS] },
    // 9 — Màn kết quả.
    { id: 'result', kind: 'result' },
];
const GOTO_DOOR_VI = 'Đi tới cửa phòng học ở chân bậc tam cấp nhà C1 (theo đường chính về phía bắc, qua quảng trường), rồi bấm E để vào lớp.';
const ORDER_VI = 'Xếp các thẻ từ thành câu đúng (câu tự soạn để luyện từ của bài, không phải trích nguyên văn giáo trình).';
// --- Bài 10, nhóm 2–4 (19 từ: nhóm 2 = 9, nhóm 3 = 6, nhóm 4 = 4) ---------
exports.L10_G234_LEXEME_IDS = [
    'hsk3-l10-g2-lishi',
    'hsk3-l10-g2-nan',
    'hsk3-l10-g2-yaoqiu',
    'hsk3-l10-g2-cha',
    'hsk3-l10-g2-fuxi',
    'hsk3-l10-g2-waiyu',
    'hsk3-l10-g2-dangran',
    'hsk3-l10-g2-yudao',
    'hsk3-l10-g2-bangongshi',
    'hsk3-l10-g3-ye',
    'hsk3-l10-g3-duihua',
    'hsk3-l10-g3-mingbai',
    'hsk3-l10-g3-jiang',
    'hsk3-l10-g3-ju',
    'hsk3-l10-g3-juzi',
    'hsk3-l10-g4-nianji',
    'hsk3-l10-g4-hounian',
    'hsk3-l10-g4-yiban',
    'hsk3-l10-g4-nuli',
];
exports.L10_G234_QUEST = {
    id: 'l10-g234',
    title: 'Bài 10 — Ôn tập & nỗ lực (nhóm 2–4)',
    lessonId: 'hsk3-l10',
    lexemeIds: [...exports.L10_G234_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l10-g234',
};
exports.L10_G234_REVIEW_LEXEME_IDS = [
    'hsk3-l10-g2-lishi',
    'hsk3-l10-g2-fuxi',
    'hsk3-l10-g3-duihua',
    'hsk3-l10-g3-mingbai',
    'hsk3-l10-g4-nuli',
];
exports.L10_G234_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天我们复习汉语，还要努力学习。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay mình cùng ôn tập tiếng Hán và nỗ lực học tập nhé. Bài này học tiếp các từ còn lại của bài 10 — nhóm 2, 3 và 4.',
        speakText: '你好！我是明。今天我们复习汉语，还要努力学习。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l10-g234-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '我每天复习汉语。',
        vi: 'Tôi ôn tập tiếng Hán mỗi ngày.',
        lexemeId: 'hsk3-l10-g2-fuxi',
        speakText: '我每天复习汉语。',
    },
    {
        id: 'l10-g234-pick-nan',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l10-g2-nan',
        scenario: '难 nghĩa là khó. Câu nào nói rằng chữ này rất khó?',
        options: [
            {
                text: '这个字很难。',
                correct: true,
                explain: '这个字很难 — chữ này rất khó.',
            },
            {
                text: '这个字不难。',
                correct: false,
                explain: '这个字不难 — chữ này không khó (phủ định của 难).',
            },
        ],
    },
    {
        id: 'l10-g234-pick-mingbai',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l10-g3-mingbai',
        scenario: '明白 nghĩa là hiểu. Câu nào nói rằng bạn đã hiểu?',
        options: [
            {
                text: '我明白了。',
                correct: true,
                explain: '我明白了 — tôi hiểu rồi.',
            },
            {
                text: '我不明白。',
                correct: false,
                explain: '我不明白 — tôi không hiểu (phủ định của 明白).',
            },
        ],
    },
    {
        id: 'l10-g234-order',
        kind: 'order',
        lexemeId: 'hsk3-l10-g4-nuli',
        zh: '我要努力学习。',
        vi: ORDER_VI,
        tiles: ['我', '要', '努力', '学习', '。'],
        answer: '我要努力学习。',
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L10_G234_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Bài 11 — Công sở & giải quyết vấn đề (28 từ) ---------------------------
exports.L11_LEXEME_IDS = [
    'hsk3-l11-g1-huiyi',
    'hsk3-l11-g1-jingli',
    'hsk3-l11-g1-kaihui',
    'hsk3-l11-g1-houtian',
    'hsk3-l11-g1-didian',
    'hsk3-l11-g1-shi',
    'hsk3-l11-g1-fa',
    'hsk3-l11-g1-bijibendiannao',
    'hsk3-l11-g1-huozhe',
    'hsk3-l11-g2-shengyin',
    'hsk3-l11-g2-kanlai',
    'hsk3-l11-g2-banfa',
    'hsk3-l11-g2-jiejue',
    'hsk3-l11-g2-zhineng',
    'hsk3-l11-g2-bieren',
    'hsk3-l11-g3-qingjia',
    'hsk3-l11-g3-tongshi',
    'hsk3-l11-g3-xiujia',
    'hsk3-l11-g3-pa',
    'hsk3-l11-g3-youxiang',
    'hsk3-l11-g3-laozhang',
    'hsk3-l11-g4-yuanyi',
    'hsk3-l11-g4-chengshi',
    'hsk3-l11-g4-likai',
    'hsk3-l11-g4-jihui',
    'hsk3-l11-g4-shenghuo',
    'hsk3-l11-g4-wei',
    'hsk3-l11-g4-huo',
];
exports.L11_QUEST = {
    id: 'l11',
    title: 'Bài 11 — Giải quyết vấn đề',
    lessonId: 'hsk3-l11',
    lexemeIds: [...exports.L11_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l11',
};
exports.L11_REVIEW_LEXEME_IDS = [
    'hsk3-l11-g1-huiyi',
    'hsk3-l11-g1-kaihui',
    'hsk3-l11-g2-jiejue',
    'hsk3-l11-g3-qingjia',
    'hsk3-l11-g4-jihui',
];
exports.L11_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天我们去开会，解决一个问题。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay mình cùng đi họp để giải quyết một vấn đề nhé. Bài 11 nói về công sở và cách giải quyết vấn đề.',
        speakText: '你好！我是明。今天我们去开会，解决一个问题。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l11-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '会议在十点开始。',
        vi: 'Cuộc họp bắt đầu lúc mười giờ.',
        lexemeId: 'hsk3-l11-g1-huiyi',
        speakText: '会议在十点开始。',
    },
    {
        id: 'l11-pick-jiejue',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l11-g2-jiejue',
        scenario: '解决 nghĩa là giải quyết. Câu nào nói rằng chúng tôi giải quyết vấn đề?',
        options: [
            {
                text: '我们解决问题。',
                correct: true,
                explain: '我们解决问题 — chúng tôi giải quyết vấn đề.',
            },
            {
                text: '我们不解决问题。',
                correct: false,
                explain: '我们不解决问题 — chúng tôi không giải quyết vấn đề.',
            },
        ],
    },
    {
        id: 'l11-pick-qingjia',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l11-g3-qingjia',
        scenario: '请假 nghĩa là xin nghỉ. Câu nào nói rằng hôm nay bạn xin nghỉ?',
        options: [
            {
                text: '我今天请假。',
                correct: true,
                explain: '我今天请假 — hôm nay tôi xin nghỉ.',
            },
            {
                text: '我今天不请假。',
                correct: false,
                explain: '我今天不请假 — hôm nay tôi không xin nghỉ.',
            },
        ],
    },
    {
        id: 'l11-order',
        kind: 'order',
        lexemeId: 'hsk3-l11-g1-kaihui',
        zh: '我们开会解决问题。',
        vi: ORDER_VI,
        tiles: ['我们', '开会', '解决', '问题', '。'],
        answer: '我们开会解决问题。',
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L11_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Bài 12 — Thời tiết & bốn mùa (27 từ) ------------------------------------
exports.L12_LEXEME_IDS = [
    'hsk3-l12-g1-jie',
    'hsk3-l12-g1-kaihua',
    'hsk3-l12-g1-gongyuan',
    'hsk3-l12-g1-chuan',
    'hsk3-l12-g1-gongzuori',
    'hsk3-l12-g1-difang',
    'hsk3-l12-g2-gangcai',
    'hsk3-l12-g2-gua',
    'hsk3-l12-g2-feng',
    'hsk3-l12-g2-xinwen',
    'hsk3-l12-g2-san',
    'hsk3-l12-g2-jie',
    'hsk3-l12-g2-ba',
    'hsk3-l12-g2-yuyi',
    'hsk3-l12-g2-bian',
    'hsk3-l12-g2-jijie',
    'hsk3-l12-g2-bianhua',
    'hsk3-l12-g3-dongtian',
    'hsk3-l12-g3-changchang',
    'hsk3-l12-g3-guanzhu',
    'hsk3-l12-g4-siji',
    'hsk3-l12-g4-chuntian',
    'hsk3-l12-g4-xiatian',
    'hsk3-l12-g4-liangkuai',
    'hsk3-l12-g4-qiutian',
    'hsk3-l12-g4-yezi',
    'hsk3-l12-g4-biancheng',
];
exports.L12_QUEST = {
    id: 'l12',
    title: 'Bài 12 — Thời tiết bốn mùa',
    lessonId: 'hsk3-l12',
    lexemeIds: [...exports.L12_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l12',
};
exports.L12_REVIEW_LEXEME_IDS = [
    'hsk3-l12-g2-jijie',
    'hsk3-l12-g4-siji',
    'hsk3-l12-g3-dongtian',
    'hsk3-l12-g2-bianhua',
    'hsk3-l12-g1-gongyuan',
];
exports.L12_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天天气很好，我们去公园吧。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay thời tiết rất đẹp, mình cùng ra công viên nhé. Bài 12 nói về thời tiết và bốn mùa.',
        speakText: '你好！我是明。今天天气很好，我们去公园吧。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l12-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '这个季节很冷。',
        vi: 'Mùa này rất lạnh.',
        lexemeId: 'hsk3-l12-g2-jijie',
        speakText: '这个季节很冷。',
    },
    {
        id: 'l12-pick-bianhua',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l12-g2-bianhua',
        scenario: '变化 nghĩa là thay đổi; sự thay đổi. Câu nào nói rằng sự thay đổi ở đây rất lớn?',
        options: [
            {
                text: '这里的变化很大。',
                correct: true,
                explain: '这里的变化很大 — sự thay đổi ở đây rất lớn.',
            },
            {
                text: '这里的变化不大。',
                correct: false,
                explain: '这里的变化不大 — sự thay đổi ở đây không lớn.',
            },
        ],
    },
    {
        id: 'l12-pick-changchang',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l12-g3-changchang',
        scenario: '常常 nghĩa là thường, thường xuyên. Câu nào nói rằng bạn thường đi công viên?',
        options: [
            {
                text: '我常常去公园。',
                correct: true,
                explain: '我常常去公园 — tôi thường đi công viên.',
            },
            {
                text: '我不常常去公园。',
                correct: false,
                explain: '我不常常去公园 — tôi không thường đi công viên.',
            },
        ],
    },
    {
        id: 'l12-count',
        kind: 'choose-number',
        lexemeId: 'hsk3-l12-g4-siji',
        zh: '一年有四个季节。',
        vi: 'Một năm có bốn mùa. 季节 nghĩa là mùa (trong năm). Một năm có mấy mùa?',
        options: [2, 3, 4, 5],
        correct: 4,
        unit: 'mùa',
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L12_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Bài 13 — Hàng xóm & văn hóa (28 từ) --------------------------------------
exports.L13_LEXEME_IDS = [
    'hsk3-l13-g1-qingke',
    'hsk3-l13-g1-nanfang',
    'hsk3-l13-g1-beifang',
    'hsk3-l13-g1-zuofa',
    'hsk3-l13-g1-butong',
    'hsk3-l13-g1-jia',
    'hsk3-l13-g1-dehua',
    'hsk3-l13-g1-zuoke',
    'hsk3-l13-g2-linju',
    'hsk3-l13-g2-fangxin',
    'hsk3-l13-g2-jiu',
    'hsk3-l13-g2-fang',
    'hsk3-l13-g2-keren',
    'hsk3-l13-g3-wanhui',
    'hsk3-l13-g3-liwu',
    'hsk3-l13-g3-huajia',
    'hsk3-l13-g3-panzi',
    'hsk3-l13-g3-yibian',
    'hsk3-l13-g3-liaotianr',
    'hsk3-l13-g4-laizi',
    'hsk3-l13-g4-fuqi',
    'hsk3-l13-g4-zhidao',
    'hsk3-l13-g4-ditu',
    'hsk3-l13-g4-dian',
    'hsk3-l13-g4-gandao',
    'hsk3-l13-g4-dongfang',
    'hsk3-l13-g4-wenhua',
    'hsk3-l13-g4-yingguo',
];
exports.L13_QUEST = {
    id: 'l13',
    title: 'Bài 13 — Hàng xóm mới',
    lessonId: 'hsk3-l13',
    lexemeIds: [...exports.L13_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l13',
};
exports.L13_REVIEW_LEXEME_IDS = [
    'hsk3-l13-g2-linju',
    'hsk3-l13-g1-qingke',
    'hsk3-l13-g4-wenhua',
    'hsk3-l13-g4-laizi',
    'hsk3-l13-g3-liwu',
];
exports.L13_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天我的新邻居请客，我们去做客吧。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay hàng xóm mới của mình đãi khách, mình cùng đến nhà họ làm khách nhé. Bài 13 nói về hàng xóm và văn hóa.',
        speakText: '你好！我是明。今天我的新邻居请客，我们去做客吧。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l13-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '我的邻居很好。',
        vi: 'Hàng xóm của tôi rất tốt.',
        lexemeId: 'hsk3-l13-g2-linju',
        speakText: '我的邻居很好。',
    },
    {
        id: 'l13-pick-laizi',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l13-g4-laizi',
        scenario: '来自 nghĩa là đến từ. Câu nào nói rằng anh ấy đến từ Vương quốc Anh?',
        options: [
            {
                text: '他来自英国。',
                correct: true,
                explain: '他来自英国 — anh ấy đến từ Vương quốc Anh.',
            },
            {
                text: '他来自南方。',
                correct: false,
                explain: '他来自南方 — anh ấy đến từ miền Nam, không phải Vương quốc Anh.',
            },
        ],
    },
    {
        id: 'l13-pick-wenhua',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l13-g4-wenhua',
        scenario: '文化 nghĩa là văn hóa. Câu nào nói rằng bạn thích văn hóa Trung Quốc?',
        options: [
            {
                text: '我喜欢中国文化。',
                correct: true,
                explain: '我喜欢中国文化 — tôi thích văn hóa Trung Quốc.',
            },
            {
                text: '我不喜欢中国文化。',
                correct: false,
                explain: '我不喜欢中国文化 — tôi không thích văn hóa Trung Quốc.',
            },
        ],
    },
    {
        id: 'l13-order',
        kind: 'order',
        lexemeId: 'hsk3-l13-g2-linju',
        zh: '我的邻居是画家。',
        vi: ORDER_VI,
        tiles: ['我', '的', '邻居', '是', '画家', '。'],
        answer: '我的邻居是画家。',
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L13_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Bài 14 — Thư viện & câu chữ 被 (27 từ) ------------------------------------
exports.L14_LEXEME_IDS = [
    'hsk3-l14-g1-cidian',
    'hsk3-l14-g1-zuihao',
    'hsk3-l14-g1-jie',
    'hsk3-l14-g1-tushuguan',
    'hsk3-l14-g1-bei',
    'hsk3-l14-g1-mingren',
    'hsk3-l14-g1-gushi',
    'hsk3-l14-g2-ranhou',
    'hsk3-l14-g2-baozhi',
    'hsk3-l14-g2-wangji',
    'hsk3-l14-g2-dianzishu',
    'hsk3-l14-g3-nvsheng',
    'hsk3-l14-g3-biaoyan',
    'hsk3-l14-g3-jiemu',
    'hsk3-l14-g3-zenmeban',
    'hsk3-l14-g3-xiaozhang',
    'hsk3-l14-g3-mianqian',
    'hsk3-l14-g3-youxie',
    'hsk3-l14-g3-xiangxin',
    'hsk3-l14-g4-xinnian',
    'hsk3-l14-g4-banji',
    'hsk3-l14-g4-tiao',
    'hsk3-l14-g4-liuxuesheng',
    'hsk3-l14-g4-zuihou',
    'hsk3-l14-g4-yikuair',
    'hsk3-l14-g4-wangzhan',
    'hsk3-l14-g4-shipin',
];
exports.L14_QUEST = {
    id: 'l14',
    title: 'Bài 14 — Sách bị mượn mất',
    lessonId: 'hsk3-l14',
    lexemeIds: [...exports.L14_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l14',
};
exports.L14_REVIEW_LEXEME_IDS = [
    'hsk3-l14-g1-cidian',
    'hsk3-l14-g1-tushuguan',
    'hsk3-l14-g1-bei',
    'hsk3-l14-g1-gushi',
    'hsk3-l14-g3-xiangxin',
];
exports.L14_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天我们去图书馆看书。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay mình cùng đến thư viện đọc sách nhé. Bài 14 nói về thư viện và câu chữ 被.',
        speakText: '你好！我是明。今天我们去图书馆看书。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l14-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '图书馆在学校里。',
        vi: 'Thư viện ở trong trường.',
        lexemeId: 'hsk3-l14-g1-tushuguan',
        speakText: '图书馆在学校里。',
    },
    {
        id: 'l14-pick-xiangxin',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l14-g3-xiangxin',
        scenario: '相信 nghĩa là tin tưởng. Câu nào nói rằng bạn tin tôi?',
        options: [
            {
                text: '我相信你。',
                correct: true,
                explain: '我相信你 — tôi tin bạn.',
            },
            {
                text: '我不相信你。',
                correct: false,
                explain: '我不相信你 — tôi không tin bạn.',
            },
        ],
    },
    {
        id: 'l14-pick-wangji',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l14-g2-wangji',
        scenario: '忘记 nghĩa là quên. Câu nào nói rằng bạn quên mang sách rồi?',
        options: [
            {
                text: '我忘记带书了。',
                correct: true,
                explain: '我忘记带书了 — tôi quên mang sách rồi.',
            },
            {
                text: '我没有忘记带书。',
                correct: false,
                explain: '我没有忘记带书 — tôi không quên mang sách.',
            },
        ],
    },
    {
        id: 'l14-order',
        kind: 'order',
        lexemeId: 'hsk3-l14-g1-cidian',
        zh: '我的词典被他借走了。',
        vi: 'Xếp các thẻ từ thành câu đúng (câu tự soạn để luyện cấu trúc 被, không phải trích nguyên văn giáo trình).',
        tiles: ['我', '的', '词典', '被', '他', '借', '走', '了', '。'],
        answer: '我的词典被他借走了。',
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L14_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Bài 15 — Nam Kinh & Hoàng Hà (26 từ) ---------------------------------------
exports.L15_LEXEME_IDS = [
    'hsk3-l15-g1-lan',
    'hsk3-l15-g1-duan',
    'hsk3-l15-g1-fujin',
    'hsk3-l15-g1-malu',
    'hsk3-l15-g1-pingshi',
    'hsk3-l15-g1-fangxue',
    'hsk3-l15-g1-youxi',
    'hsk3-l15-g1-laoren',
    'hsk3-l15-g1-genju',
    'hsk3-l15-g2-liaojie',
    'hsk3-l15-g2-keshi',
    'hsk3-l15-g2-yishang',
    'hsk3-l15-g2-youming',
    'hsk3-l15-g2-jingdian',
    'hsk3-l15-g2-youke',
    'hsk3-l15-g2-waidi',
    'hsk3-l15-g2-liao',
    'hsk3-l15-g2-nanjing',
    'hsk3-l15-g3-he',
    'hsk3-l15-g3-guanxi',
    'hsk3-l15-g3-yang',
    'hsk3-l15-g3-huanghe',
    'hsk3-l15-g4-xibei',
    'hsk3-l15-g4-jingguo',
    'hsk3-l15-g4-caodi',
    'hsk3-l15-g4-yujian',
];
exports.L15_QUEST = {
    id: 'l15',
    title: 'Bài 15 — Nửa người Nam Kinh',
    lessonId: 'hsk3-l15',
    lexemeIds: [...exports.L15_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l15',
};
exports.L15_REVIEW_LEXEME_IDS = [
    'hsk3-l15-g2-nanjing',
    'hsk3-l15-g3-huanghe',
    'hsk3-l15-g2-liaojie',
    'hsk3-l15-g2-jingdian',
    'hsk3-l15-g4-yujian',
];
exports.L15_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天我们去了解南京。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay mình cùng tìm hiểu về Nam Kinh nhé. Bài 15 nói về Nam Kinh và sông Hoàng Hà.',
        speakText: '你好！我是明。今天我们去了解南京。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l15-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '南京在江苏。',
        vi: 'Nam Kinh ở Giang Tô.',
        lexemeId: 'hsk3-l15-g2-nanjing',
        speakText: '南京在江苏。',
    },
    {
        id: 'l15-pick-liaojie',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l15-g2-liaojie',
        scenario: '了解 nghĩa là hiểu rõ, tìm hiểu. Câu nào nói rằng bạn muốn tìm hiểu Nam Kinh?',
        options: [
            {
                text: '我想了解南京。',
                correct: true,
                explain: '我想了解南京 — tôi muốn tìm hiểu Nam Kinh.',
            },
            {
                text: '我不想了解南京。',
                correct: false,
                explain: '我不想了解南京 — tôi không muốn tìm hiểu Nam Kinh.',
            },
        ],
    },
    {
        id: 'l15-pick-youming',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l15-g2-youming',
        scenario: '有名 nghĩa là nổi tiếng. Câu nào nói rằng Nam Kinh là một thành phố nổi tiếng?',
        options: [
            {
                text: '南京是一个有名的城市。',
                correct: true,
                explain: '南京是一个有名的城市 — Nam Kinh là một thành phố nổi tiếng.',
            },
            {
                text: '南京不是一个有名的城市。',
                correct: false,
                explain: '南京不是一个有名的城市 — Nam Kinh không phải là một thành phố nổi tiếng.',
            },
        ],
    },
    {
        id: 'l15-goal',
        kind: 'choose-goal',
        lexemeId: 'hsk3-l15-g2-liaojie',
        zh: '我想了解南京。',
        vi: '了解 nghĩa là tìm hiểu, hiểu rõ. Bạn muốn tìm hiểu điều gì nhất trong bài này? (Cả hai lựa chọn đều đúng — chỉ để ghi nhận mục tiêu của bạn.)',
        options: [
            { text: '我想了解南京。', vi: 'Tôi muốn tìm hiểu Nam Kinh.' },
            { text: '我想了解黄河。', vi: 'Tôi muốn tìm hiểu sông Hoàng Hà.' },
        ],
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L15_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Bài 16 — Động vật & vườn thú (26 từ) ---------------------------------------
exports.L16_LEXEME_IDS = [
    'hsk3-l16-g1-zang',
    'hsk3-l16-g1-keai',
    'hsk3-l16-g1-yihuir',
    'hsk3-l16-g1-jiao',
    'hsk3-l16-g1-zhaogu',
    'hsk3-l16-g1-haoxiang',
    'hsk3-l16-g1-rende',
    'hsk3-l16-g1-zhoumo',
    'hsk3-l16-g1-dongwuyuan',
    'hsk3-l16-g1-dongwu',
    'hsk3-l16-g2-daxiongmao',
    'hsk3-l16-g2-qiguai',
    'hsk3-l16-g2-qishi',
    'hsk3-l16-g2-zhuzi',
    'hsk3-l16-g2-guobao',
    'hsk3-l16-g2-quan',
    'hsk3-l16-g2-yesheng',
    'hsk3-l16-g2-guanyu',
    'hsk3-l16-g3-bao',
    'hsk3-l16-g3-zhang',
    'hsk3-l16-g3-zui',
    'hsk3-l16-g3-shenbian',
    'hsk3-l16-g3-bantian',
    'hsk3-l16-g3-lian',
    'hsk3-l16-g4-daren',
    'hsk3-l16-g4-xiai',
];
exports.L16_QUEST = {
    id: 'l16',
    title: 'Bài 16 — Gấu trúc ra nước ngoài',
    lessonId: 'hsk3-l16',
    lexemeIds: [...exports.L16_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l16',
};
exports.L16_REVIEW_LEXEME_IDS = [
    'hsk3-l16-g2-daxiongmao',
    'hsk3-l16-g1-dongwuyuan',
    'hsk3-l16-g2-zhuzi',
    'hsk3-l16-g2-guobao',
    'hsk3-l16-g1-keai',
];
exports.L16_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天是周末，我们去动物园看大熊猫吧。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay là cuối tuần, mình cùng đi vườn thú xem gấu trúc lớn nhé. Bài 16 nói về động vật và vườn thú.',
        speakText: '你好！我是明。今天是周末，我们去动物园看大熊猫吧。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l16-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '大熊猫喜欢吃竹子。',
        vi: 'Gấu trúc lớn thích ăn tre trúc.',
        lexemeId: 'hsk3-l16-g2-daxiongmao',
        speakText: '大熊猫喜欢吃竹子。',
    },
    {
        id: 'l16-pick-keai',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l16-g1-keai',
        scenario: '可爱 nghĩa là đáng yêu. Câu nào nói rằng con gấu trúc này rất đáng yêu?',
        options: [
            {
                text: '这只熊猫很可爱。',
                correct: true,
                explain: '这只熊猫很可爱 — con gấu trúc này rất đáng yêu.',
            },
            {
                text: '这只熊猫不可爱。',
                correct: false,
                explain: '这只熊猫不可爱 — con gấu trúc này không đáng yêu.',
            },
        ],
    },
    {
        id: 'l16-pick-qishi',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l16-g2-qishi',
        scenario: '其实 nghĩa là thật ra, thực ra. Câu nào nói rằng thật ra bạn không thích ăn cay?',
        options: [
            {
                text: '其实，我不喜欢吃辣。',
                correct: true,
                explain: '其实，我不喜欢吃辣 — thật ra, tôi không thích ăn cay.',
            },
            {
                text: '其实，我喜欢吃辣。',
                correct: false,
                explain: '其实，我喜欢吃辣 — thật ra, tôi thích ăn cay (ngược với câu cần tìm).',
            },
        ],
    },
    {
        id: 'l16-count',
        kind: 'choose-number',
        lexemeId: 'hsk3-l16-g2-daxiongmao',
        zh: '动物园有三只大熊猫。',
        vi: 'Vườn thú có ba con gấu trúc lớn. 只 là lượng từ dùng cho con vật. Vườn thú có mấy con gấu trúc lớn?',
        options: [2, 3, 4, 5],
        correct: 3,
        unit: 'con',
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L16_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Bài 17 — Định hướng & học tập (27 từ) --------------------------------------
exports.L17_LEXEME_IDS = [
    'hsk3-l17-g1-xiang',
    'hsk3-l17-g1-louti',
    'hsk3-l17-g1-haipa',
    'hsk3-l17-g1-shengqi',
    'hsk3-l17-g1-changjian',
    'hsk3-l17-g1-congming',
    'hsk3-l17-g1-cuo',
    'hsk3-l17-g1-renwei',
    'hsk3-l17-g2-daochu',
    'hsk3-l17-g2-jixu',
    'hsk3-l17-g2-tongyi',
    'hsk3-l17-g2-ke',
    'hsk3-l17-g2-wuzi',
    'hsk3-l17-g2-youguan',
    'hsk3-l17-g3-guanji',
    'hsk3-l17-g3-qiantian',
    'hsk3-l17-g3-liuxue',
    'hsk3-l17-g3-guojia',
    'hsk3-l17-g3-biru',
    'hsk3-l17-g3-cha',
    'hsk3-l17-g3-youyong',
    'hsk3-l17-g4-rongyi',
    'hsk3-l17-g4-huida',
    'hsk3-l17-g4-fangxiang',
    'hsk3-l17-g4-zhiyou',
    'hsk3-l17-g4-zhenzheng',
    'hsk3-l17-g4-nanti',
];
exports.L17_QUEST = {
    id: 'l17',
    title: 'Bài 17 — Học hỏi người chăm chỉ',
    lessonId: 'hsk3-l17',
    lexemeIds: [...exports.L17_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l17',
};
exports.L17_REVIEW_LEXEME_IDS = [
    'hsk3-l17-g1-xiang',
    'hsk3-l17-g1-congming',
    'hsk3-l17-g4-rongyi',
    'hsk3-l17-g4-huida',
    'hsk3-l17-g4-nanti',
];
exports.L17_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。今天我们向聪明的人学习。',
        vi: 'Chào bạn! Mình là Minh. Hôm nay mình cùng học hỏi những người thông minh nhé. Bài 17 nói về định hướng và học tập.',
        speakText: '你好！我是明。今天我们向聪明的人学习。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l17-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '他很聪明。',
        vi: 'Anh ấy rất thông minh.',
        lexemeId: 'hsk3-l17-g1-congming',
        speakText: '他很聪明。',
    },
    {
        id: 'l17-pick-tongyi',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l17-g2-tongyi',
        scenario: '同意 nghĩa là đồng ý. Câu nào nói rằng bạn đồng ý với ý kiến của tôi?',
        options: [
            {
                text: '我同意你的看法。',
                correct: true,
                explain: '我同意你的看法 — tôi đồng ý với ý kiến của bạn.',
            },
            {
                text: '我不同意你的看法。',
                correct: false,
                explain: '我不同意你的看法 — tôi không đồng ý với ý kiến của bạn.',
            },
        ],
    },
    {
        id: 'l17-pick-rongyi',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l17-g4-rongyi',
        scenario: '容易 nghĩa là dễ, dễ dàng. Câu nào nói rằng vấn đề này rất dễ?',
        options: [
            {
                text: '这个问题很容易。',
                correct: true,
                explain: '这个问题很容易 — vấn đề này rất dễ.',
            },
            {
                text: '这个问题不容易。',
                correct: false,
                explain: '这个问题不容易 — vấn đề này không dễ.',
            },
        ],
    },
    {
        id: 'l17-order',
        kind: 'order',
        lexemeId: 'hsk3-l17-g1-xiang',
        zh: '我要向他学习。',
        vi: ORDER_VI,
        tiles: ['我', '要', '向', '他', '学习', '。'],
        answer: '我要向他学习。',
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L17_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Bài 18 — Tết & gia đình (29 từ) ---------------------------------------------
exports.L18_LEXEME_IDS = [
    'hsk3-l18-g1-zenyang',
    'hsk3-l18-g1-guojie',
    'hsk3-l18-g1-jie',
    'hsk3-l18-g1-jieri',
    'hsk3-l18-g1-lianhuan',
    'hsk3-l18-g1-dagai',
    'hsk3-l18-g1-chunjie',
    'hsk3-l18-g2-ayi',
    'hsk3-l18-g2-shushu',
    'hsk3-l18-g2-shou',
    'hsk3-l18-g2-zong',
    'hsk3-l18-g2-qi',
    'hsk3-l18-g2-jianmian',
    'hsk3-l18-g2-kuangquanshui',
    'hsk3-l18-g2-ganggang',
    'hsk3-l18-g3-chufa',
    'hsk3-l18-g3-bujiu',
    'hsk3-l18-g3-fasheng',
    'hsk3-l18-g3-gang',
    'hsk3-l18-g3-zhiyao',
    'hsk3-l18-g3-xueqi',
    'hsk3-l18-g3-biye',
    'hsk3-l18-g4-chusheng',
    'hsk3-l18-g4-guoqu',
    'hsk3-l18-g4-dongde',
    'hsk3-l18-g4-jianchi',
    'hsk3-l18-g4-wancheng',
    'hsk3-l18-g4-mubiao',
    'hsk3-l18-g4-fazhan',
];
exports.L18_QUEST = {
    id: 'l18',
    title: 'Bài 18 — Học gói bánh chẻo',
    lessonId: 'hsk3-l18',
    lexemeIds: [...exports.L18_LEXEME_IDS],
    rewardPoints: 50,
    badgeId: 'l18',
};
exports.L18_REVIEW_LEXEME_IDS = [
    'hsk3-l18-g1-chunjie',
    'hsk3-l18-g4-jianchi',
    'hsk3-l18-g4-mubiao',
    'hsk3-l18-g4-wancheng',
    'hsk3-l18-g3-biye',
];
exports.L18_STEPS = [
    {
        id: 'greet-minh',
        kind: 'talk',
        npc: 'minh',
        zh: '你好！我是明。春节快到了，我们一起过春节吧。',
        vi: 'Chào bạn! Mình là Minh. Tết Nguyên đán sắp đến, mình cùng đón Tết nhé. Bài 18 nói về Tết và gia đình.',
        speakText: '你好！我是明。春节快到了，我们一起过春节吧。',
    },
    { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
    {
        id: 'l18-teacher',
        kind: 'talk',
        npc: 'teacher',
        zh: '春节我们一家人吃饺子。',
        vi: 'Tết Nguyên đán cả nhà chúng tôi ăn sủi cảo.',
        lexemeId: 'hsk3-l18-g1-chunjie',
        speakText: '春节我们一家人吃饺子。',
    },
    {
        id: 'l18-pick-jianchi',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l18-g4-jianchi',
        scenario: '坚持 nghĩa là kiên trì, duy trì. Câu nào nói rằng học tiếng Hán cần kiên trì?',
        options: [
            {
                text: '学习汉语要坚持。',
                correct: true,
                explain: '学习汉语要坚持 — học tiếng Hán cần kiên trì.',
            },
            {
                text: '学习汉语不要坚持。',
                correct: false,
                explain: '学习汉语不要坚持 — học tiếng Hán không cần kiên trì (trái với câu cần tìm).',
            },
        ],
    },
    {
        id: 'l18-pick-mubiao',
        kind: 'pick-meaning',
        lexemeId: 'hsk3-l18-g4-mubiao',
        scenario: '目标 nghĩa là mục tiêu. Câu nào nói rằng mục tiêu của bạn là học được tiếng Hán?',
        options: [
            {
                text: '我的目标是学会汉语。',
                correct: true,
                explain: '我的目标是学会汉语 — mục tiêu của tôi là học được tiếng Hán.',
            },
            {
                text: '我的目标不是学会汉语。',
                correct: false,
                explain: '我的目标不是学会汉语 — mục tiêu của tôi không phải là học được tiếng Hán.',
            },
        ],
    },
    {
        id: 'l18-order',
        kind: 'order',
        lexemeId: 'hsk3-l18-g1-chunjie',
        zh: '我们一起过春节。',
        vi: ORDER_VI,
        tiles: ['我们', '一起', '过', '春节', '。'],
        answer: '我们一起过春节。',
        source: 'authored',
    },
    { id: 'final-review', kind: 'review', lexemeIds: [...exports.L18_REVIEW_LEXEME_IDS] },
    { id: 'result', kind: 'result' },
];
// --- Registry: questId → { quest, steps } (page.tsx phân giải theo đây) --------
exports.QUEST_REGISTRY = {
    'first-lesson': {
        quest: {
            ...exports.FIRST_LESSON_QUEST,
            lexemeIds: [...exports.FIRST_LESSON_QUEST.lexemeIds],
        },
        steps: exports.FIRST_LESSON_STEPS,
    },
    'l10-g234': { quest: { ...exports.L10_G234_QUEST, lexemeIds: [...exports.L10_G234_QUEST.lexemeIds] }, steps: exports.L10_G234_STEPS },
    l11: { quest: { ...exports.L11_QUEST, lexemeIds: [...exports.L11_QUEST.lexemeIds] }, steps: exports.L11_STEPS },
    l12: { quest: { ...exports.L12_QUEST, lexemeIds: [...exports.L12_QUEST.lexemeIds] }, steps: exports.L12_STEPS },
    l13: { quest: { ...exports.L13_QUEST, lexemeIds: [...exports.L13_QUEST.lexemeIds] }, steps: exports.L13_STEPS },
    l14: { quest: { ...exports.L14_QUEST, lexemeIds: [...exports.L14_QUEST.lexemeIds] }, steps: exports.L14_STEPS },
    l15: { quest: { ...exports.L15_QUEST, lexemeIds: [...exports.L15_QUEST.lexemeIds] }, steps: exports.L15_STEPS },
    l16: { quest: { ...exports.L16_QUEST, lexemeIds: [...exports.L16_QUEST.lexemeIds] }, steps: exports.L16_STEPS },
    l17: { quest: { ...exports.L17_QUEST, lexemeIds: [...exports.L17_QUEST.lexemeIds] }, steps: exports.L17_STEPS },
    l18: { quest: { ...exports.L18_QUEST, lexemeIds: [...exports.L18_QUEST.lexemeIds] }, steps: exports.L18_STEPS },
    // HSK 4 (Bước 7): 40 quest (thượng 20 + hạ 20), mỗi quest 8 bước.
    ...Object.fromEntries(quest_data_hsk4_shang_1.HSK4_SHANG_QUEST_DEFS.map((d) => [d.quest.id, d])),
    ...Object.fromEntries(quest_data_hsk4_xia_1.HSK4_XIA_QUEST_DEFS.map((d) => [d.quest.id, d])),
};
/** Tra quest theo id; id lạ → undefined (page fallback về tuyến bài 10). */
function getQuestDef(questId) {
    return exports.QUEST_REGISTRY[questId];
}
/** Toàn bộ 50 quest (10 HSK 3 + 40 HSK 4 Bước 7). */
exports.ALL_QUEST_DEFS = Object.values(exports.QUEST_REGISTRY);
/** Quest của bài 10 theo thứ tự học: nhóm 1 trước, nhóm 2–4 sau. */
exports.L10_QUEST_IDS = ['first-lesson', 'l10-g234'];
/** Quest của từng bài HSK 4 theo thứ tự học: phần 1 trước, phần 2 sau. */
exports.HSK4_LESSON_QUEST_IDS = {
    ...quest_data_hsk4_shang_1.HSK4_SHANG_LESSON_QUEST_IDS,
    ...quest_data_hsk4_xia_1.HSK4_XIA_LESSON_QUEST_IDS,
};
