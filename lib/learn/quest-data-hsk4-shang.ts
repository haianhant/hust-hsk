// ---------------------------------------------------------------------------
// quest-data-hsk4-shang.ts — 20 quest HSK 4 quyển thượng, bài 1–10 (Bước 7).
// Mỗi bài có 2 quest ngắn: quest A = nhóm 1–2, quest B = nhóm 3–4 của bài.
// Khung 8 bước theo đúng quest mẫu L11 trong quest-data.ts:
//   1. talk Minh (greet-minh) — 2. goto cửa phòng (goto-door, cùng câu chỉ
//      đường) — 3. talk cô giáo (1 từ chủ đề) — 4–5. pick-meaning × 2
//      — 6. order / choose-number / choose-goal — 7. review cuối 5 từ
//      (dàn đều 2 nhóm của quest) — 8. result.
// KHÔNG dùng pick-object / interact-object (gắn cứng vật phòng học bài 10).
//
// Mọi câu tiếng Trung trong bước đều TỰ SOẠN (hội thoại/tình huống ngắn,
// dùng từ của bài, tiếng Trung chuẩn) hoặc tái dùng câu ví dụ authored đã
// có trong content/hsk4-shang-l*.ts — KHÔNG trích giáo trình, KHÔNG sao
// chép toàn văn bài khóa, KHÔNG dịch toàn văn.
// Lưu ý ID đặc biệt đã dùng đúng: bài 5 道 (lượng từ) = dao-liangci,
// 倒 giữ dao; bài 6 性/醒 = xing/xing2, 部/步 = bu/bu2; ü viết thành v
// (vd 绿色 = lvse). rewardPoints = 50 cho mọi quest; badgeId = quest id.
//
// Tích hợp: luồng tích hợp nối HSK4_SHANG_QUEST_DEFS vào registry sau;
// file này KHÔNG import giá trị nào từ quest-data.ts (tránh vòng lặp).
// ---------------------------------------------------------------------------

import type { Quest } from './types';
import type { QuestDef, QuestStep } from './quest-data';

const GOTO_DOOR_VI =
  'Đi tới cửa phòng học ở chân bậc tam cấp nhà C1 (theo đường chính về phía bắc, qua quảng trường), rồi bấm E để vào lớp.';

const ORDER_VI =
  'Xếp các thẻ từ thành câu đúng (câu tự soạn để luyện từ của bài, không phải trích nguyên văn giáo trình).';

// --- Bài 1 quest A — nhóm 1–2 (18 từ) ---------------------------
export const L1A_LEXEME_IDS = [
  'hsk4-shang-l1-g1-qianzheng',
  'hsk4-shang-l1-g1-ruxue',
  'hsk4-shang-l1-g1-tongzhi',
  'hsk4-shang-l1-g1-zhengjian',
  'hsk4-shang-l1-g1-cailiao',
  'hsk4-shang-l1-g1-zheng',
  'hsk4-shang-l1-g1-renhe',
  'hsk4-shang-l1-g2-shitang',
  'hsk4-shang-l1-g2-zuo',
  'hsk4-shang-l1-g2-shenqing',
  'hsk4-shang-l1-g2-jiangxuejin',
  'hsk4-shang-l1-g2-biaoxian',
  'hsk4-shang-l1-g2-huode',
  'hsk4-shang-l1-g2-yaoshi',
  'hsk4-shang-l1-g2-jianqing',
  'hsk4-shang-l1-g2-jingji',
  'hsk4-shang-l1-g2-yali',
  'hsk4-shang-l1-g2-jiayou',
] as const;

export const L1A_QUEST = {
  id: 'hsk4-shang-l1a',
  title: 'Bài 1 — Nhập học và học bổng',
  lessonId: 'hsk4-shang-l1',
  lexemeIds: [...L1A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l1a',
} as const;

export const L1A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l1-g1-qianzheng',
  'hsk4-shang-l1-g1-tongzhi',
  'hsk4-shang-l1-g2-jiangxuejin',
  'hsk4-shang-l1-g2-huode',
  'hsk4-shang-l1-g2-jiayou',
] as const;

export const L1A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。我来中国学习了，我想申请奖学金。',
    vi: 'Chào bạn! Mình là Minh. Mình đến Trung Quốc học và muốn xin học bổng. Bài 1 nói về nhập học, học bổng và đời sống du học sinh.',
    speakText: '你好！我是明。我来中国学习了，我想申请奖学金。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l1a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '他获得了奖学金。',
    vi: 'Anh ấy đã nhận được học bổng.',
    lexemeId: 'hsk4-shang-l1-g2-jiangxuejin',
    speakText: '他获得了奖学金。',
  },
  {
    id: 'hsk4-shang-l1a-pick-ruxue',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l1-g1-ruxue',
    scenario: '入学 nghĩa là nhập học. Câu nào nói rằng anh ấy nhập học vào tháng Chín?',
    options: [
      {
        text: '他九月入学。',
        correct: true,
        explain: '他九月入学。 — Anh ấy nhập học vào tháng Chín.',
      },
      {
        text: '他九月不入学。',
        correct: false,
        explain: '他九月不入学。 — Anh ấy không nhập học vào tháng Chín. (phủ định của 入学).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l1a-pick-yali',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l1-g2-yali',
    scenario: '压力 nghĩa là áp lực. Câu nào nói rằng gần đây áp lực của bạn rất lớn?',
    options: [
      {
        text: '最近我的压力很大。',
        correct: true,
        explain: '最近我的压力很大。 — Gần đây áp lực của tôi rất lớn.',
      },
      {
        text: '最近我的压力不大。',
        correct: false,
        explain: '最近我的压力不大。 — Gần đây áp lực của tôi không lớn. (phủ định của 压力很大).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l1a-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l1-g2-shenqing',
    zh: '我想申请奖学金。',
    vi: ORDER_VI,
    tiles: ['我', '想', '申请', '奖学金', '。'],
    answer: '我想申请奖学金。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L1A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 1 quest B — nhóm 3–4 (22 từ) ---------------------------
export const L1B_LEXEME_IDS = [
  'hsk4-shang-l1-g3-suizhe',
  'hsk4-shang-l1-g3-kecheng',
  'hsk4-shang-l1-g3-zhuanye',
  'hsk4-shang-l1-g3-benke',
  'hsk4-shang-l1-g3-shuoshi',
  'hsk4-shang-l1-g3-yanjiusheng',
  'hsk4-shang-l1-g3-boshi',
  'hsk4-shang-l1-g3-yanjiu',
  'hsk4-shang-l1-g3-huodong',
  'hsk4-shang-l1-g3-tongguo',
  'hsk4-shang-l1-g3-jiaoliu',
  'hsk4-shang-l1-g3-shiying',
  'hsk4-shang-l1-g4-jianglai',
  'hsk4-shang-l1-g4-guoji',
  'hsk4-shang-l1-g4-dang',
  'hsk4-shang-l1-g4-jiaoyu',
  'hsk4-shang-l1-g4-chengwei',
  'hsk4-shang-l1-g4-jiaoshi',
  'hsk4-shang-l1-g4-maoyi',
  'hsk4-shang-l1-g4-fangmian',
  'hsk4-shang-l1-g4-zhishi',
  'hsk4-shang-l1-g4-ling',
] as const;

export const L1B_QUEST = {
  id: 'hsk4-shang-l1b',
  title: 'Bài 1 — Nhập học và học bổng',
  lessonId: 'hsk4-shang-l1',
  lexemeIds: [...L1B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l1b',
} as const;

export const L1B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l1-g3-kecheng',
  'hsk4-shang-l1-g3-tongguo',
  'hsk4-shang-l1-g3-shiying',
  'hsk4-shang-l1-g4-jianglai',
  'hsk4-shang-l1-g4-zhishi',
] as const;

export const L1B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。我的专业是汉语，我想成为一名教师。',
    vi: 'Chào bạn! Mình là Minh. Chuyên ngành của mình là tiếng Hán, sau này mình muốn làm giáo viên. Buổi này học tiếp các từ còn lại của bài 1 — nhóm 3 và 4.',
    speakText: '你好！我是明。我的专业是汉语，我想成为一名教师。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l1b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '你的专业是什么？',
    vi: 'Chuyên ngành của bạn là gì?',
    lexemeId: 'hsk4-shang-l1-g3-zhuanye',
    speakText: '你的专业是什么？',
  },
  {
    id: 'hsk4-shang-l1b-pick-shiying',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l1-g3-shiying',
    scenario: '适应 nghĩa là thích nghi, thích ứng. Câu nào nói rằng bạn đã nhanh chóng thích nghi với cuộc sống mới?',
    options: [
      {
        text: '我很快适应了新生活。',
        correct: true,
        explain: '我很快适应了新生活。 — Tôi đã nhanh chóng thích nghi với cuộc sống mới.',
      },
      {
        text: '我不适应新生活。',
        correct: false,
        explain: '我不适应新生活。 — Tôi không thích nghi với cuộc sống mới. (phủ định của 适应).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l1b-pick-chengwei',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l1-g4-chengwei',
    scenario: '成为 nghĩa là trở thành. Câu nào nói rằng anh ấy đã trở thành thầy giáo?',
    options: [
      {
        text: '他成为了老师。',
        correct: true,
        explain: '他成为了老师。 — Anh ấy đã trở thành thầy giáo.',
      },
      {
        text: '他没有成为老师。',
        correct: false,
        explain: '他没有成为老师。 — Anh ấy đã không trở thành thầy giáo. (phủ định của 成为).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l1b-goal',
    kind: 'choose-goal',
    lexemeId: 'hsk4-shang-l1-g4-jianglai',
    zh: '将来我想当一名教师。',
    vi: '将来 nghĩa là tương lai, sau này. Tương lai bạn muốn làm gì? (Cả hai lựa chọn đều đúng — chỉ để ghi nhận mục tiêu của bạn.)',
    options: [
      { text: '将来我想当一名教师。', vi: 'Tương lai tôi muốn làm một giáo viên.' },
      { text: '将来我想做国际贸易。', vi: 'Tương lai tôi muốn làm thương mại quốc tế.' },
    ],
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L1B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 2 quest A — nhóm 1–2 (15 từ) ---------------------------
export const L2A_LEXEME_IDS = [
  'hsk4-shang-l2-g1-fangdong',
  'hsk4-shang-l2-g1-chuzu',
  'hsk4-shang-l2-g1-fangzu',
  'hsk4-shang-l2-g1-shoushi',
  'hsk4-shang-l2-g1-zu',
  'hsk4-shang-l2-g1-ng',
  'hsk4-shang-l2-g1-liang',
  'hsk4-shang-l2-g1-jiushi',
  'hsk4-shang-l2-g2-zhong',
  'hsk4-shang-l2-g2-zhouwei',
  'hsk4-shang-l2-g2-buguo',
  'hsk4-shang-l2-g2-biye',
  'hsk4-shang-l2-g2-kongpa',
  'hsk4-shang-l2-g2-renao',
  'hsk4-shang-l2-g2-ruzhu',
] as const;

export const L2A_QUEST = {
  id: 'hsk4-shang-l2a',
  title: 'Bài 2 — Thuê nhà và dọn vào ở',
  lessonId: 'hsk4-shang-l2',
  lexemeIds: [...L2A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l2a',
} as const;

export const L2A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l2-g1-fangdong',
  'hsk4-shang-l2-g1-fangzu',
  'hsk4-shang-l2-g1-zu',
  'hsk4-shang-l2-g2-zhouwei',
  'hsk4-shang-l2-g2-renao',
] as const;

export const L2A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。我想租一间房子，房东人很好。',
    vi: 'Chào bạn! Mình là Minh. Mình muốn thuê một căn nhà gần trường, chủ nhà rất tốt. Bài 2 nói về thuê nhà, xem nhà và dọn vào ở.',
    speakText: '你好！我是明。我想租一间房子，房东人很好。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l2a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '这里的房租不贵。',
    vi: 'Tiền thuê nhà ở đây không đắt.',
    lexemeId: 'hsk4-shang-l2-g1-fangzu',
    speakText: '这里的房租不贵。',
  },
  {
    id: 'hsk4-shang-l2a-pick-shoushi',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l2-g1-shoushi',
    scenario: '收拾 nghĩa là dọn dẹp, thu xếp. Câu nào nói rằng bạn dọn dẹp phòng trước đã?',
    options: [
      {
        text: '我先收拾一下房间。',
        correct: true,
        explain: '我先收拾一下房间。 — Tôi dọn dẹp phòng trước đã.',
      },
      {
        text: '我不收拾房间。',
        correct: false,
        explain: '我不收拾房间。 — Tôi không dọn dẹp phòng. (phủ định của 收拾).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l2a-pick-ruzhu',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l2-g2-ruzhu',
    scenario: '入住 nghĩa là dọn vào ở, vào ở. Câu nào nói rằng ngày mai chúng tôi dọn vào ở nhà mới?',
    options: [
      {
        text: '我们明天入住新房子。',
        correct: true,
        explain: '我们明天入住新房子。 — Ngày mai chúng tôi dọn vào ở nhà mới.',
      },
      {
        text: '我们明天不入住新房子。',
        correct: false,
        explain: '我们明天不入住新房子。 — Ngày mai chúng tôi không dọn vào ở nhà mới. (phủ định của 入住).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l2a-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l2-g1-zu',
    zh: '我想租一间房子。',
    vi: ORDER_VI,
    tiles: ['我', '想', '租', '一', '间', '房子', '。'],
    answer: '我想租一间房子。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L2A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 2 quest B — nhóm 3–4 (22 từ) ---------------------------
export const L2B_LEXEME_IDS = [
  'hsk4-shang-l2-g3-riji',
  'hsk4-shang-l2-g3-shunli',
  'hsk4-shang-l2-g3-bing',
  'hsk4-shang-l2-g3-keting',
  'hsk4-shang-l2-g3-tai',
  'hsk4-shang-l2-g3-chufang',
  'hsk4-shang-l2-g3-pingchang',
  'hsk4-shang-l2-g3-jibenshang',
  'hsk4-shang-l2-g3-zhengge',
  'hsk4-shang-l2-g3-maojin',
  'hsk4-shang-l2-g4-jianyi',
  'hsk4-shang-l2-g4-chakan',
  'hsk4-shang-l2-g4-xinxi',
  'hsk4-shang-l2-g4-chazhao',
  'hsk4-shang-l2-g4-jiezhe',
  'hsk4-shang-l2-g4-tongshi',
  'hsk4-shang-l2-g4-weizhi',
  'hsk4-shang-l2-g4-jiage',
  'hsk4-shang-l2-g4-lixiang',
  'hsk4-shang-l2-g4-youyu',
  'hsk4-shang-l2-g4-gongzi',
  'hsk4-shang-l2-g4-gan',
] as const;

export const L2B_QUEST = {
  id: 'hsk4-shang-l2b',
  title: 'Bài 2 — Thuê nhà và dọn vào ở',
  lessonId: 'hsk4-shang-l2',
  lexemeIds: [...L2B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l2b',
} as const;

export const L2B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l2-g3-riji',
  'hsk4-shang-l2-g3-keting',
  'hsk4-shang-l2-g3-zhengge',
  'hsk4-shang-l2-g4-jianyi',
  'hsk4-shang-l2-g4-weizhi',
] as const;

export const L2B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。我住在新房子里，客厅很大。',
    vi: 'Chào bạn! Mình là Minh. Nhà mới của mình rất sạch, phòng khách ở cạnh nhà bếp. Buổi này học tiếp các từ còn lại của bài 2 — nhóm 3 và 4.',
    speakText: '你好！我是明。我住在新房子里，客厅很大。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l2b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '客厅很大。',
    vi: 'Phòng khách rất lớn.',
    lexemeId: 'hsk4-shang-l2-g3-keting',
    speakText: '客厅很大。',
  },
  {
    id: 'hsk4-shang-l2b-pick-shunli',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l2-g3-shunli',
    scenario: '顺利 nghĩa là thuận lợi, suôn sẻ. Câu nào nói rằng mọi việc đều rất thuận lợi?',
    options: [
      {
        text: '一切都很顺利。',
        correct: true,
        explain: '一切都很顺利。 — Mọi việc đều rất thuận lợi.',
      },
      {
        text: '一切都不顺利。',
        correct: false,
        explain: '一切都不顺利。 — Mọi việc đều không thuận lợi. (phủ định của 顺利).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l2b-pick-lixiang',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l2-g4-lixiang',
    scenario: '理想 nghĩa là lý tưởng. Câu nào nói rằng đây là một nơi lý tưởng?',
    options: [
      {
        text: '这是一个理想的地方。',
        correct: true,
        explain: '这是一个理想的地方。 — Đây là một nơi lý tưởng.',
      },
      {
        text: '这不是一个理想的地方。',
        correct: false,
        explain: '这不是一个理想的地方。 — Đây không phải là một nơi lý tưởng. (phủ định của 理想).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l2b-count',
    kind: 'choose-number',
    lexemeId: 'hsk4-shang-l2-g3-tai',
    zh: '桌子上有一台电脑。',
    vi: 'Trên bàn có một chiếc máy tính. 台 là lượng từ dùng cho máy móc, thiết bị. Trên bàn có mấy chiếc máy tính?',
    options: [1, 2, 3, 4],
    correct: 1,
    unit: 'chiếc',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L2B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 3 quest A — nhóm 1–2 (19 từ) ---------------------------
export const L3A_LEXEME_IDS = [
  'hsk4-shang-l3-g1-shizilukou',
  'hsk4-shang-l3-g1-zhijie',
  'hsk4-shang-l3-g1-zhuan',
  'hsk4-shang-l3-g1-zhenghao',
  'hsk4-shang-l3-g1-shuxi',
  'hsk4-shang-l3-g1-zheng',
  'hsk4-shang-l3-g1-mudidi',
  'hsk4-shang-l3-g2-xiazai',
  'hsk4-shang-l3-g2-jinxing',
  'hsk4-shang-l3-g2-zhifu',
  'hsk4-shang-l3-g2-ruanjian',
  'hsk4-shang-l3-g2-bujin',
  'hsk4-shang-l3-g2-saoma',
  'hsk4-shang-l3-g2-jiezhang',
  'hsk4-shang-l3-g2-gouwu',
  'hsk4-shang-l3-g2-ding',
  'hsk4-shang-l3-g2-kuaidi',
  'hsk4-shang-l3-g2-weixin',
  'hsk4-shang-l3-g2-zhifubao',
] as const;

export const L3A_QUEST = {
  id: 'hsk4-shang-l3a',
  title: 'Bài 3 — Chỉ đường và quét mã',
  lessonId: 'hsk4-shang-l3',
  lexemeIds: [...L3A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l3a',
} as const;

export const L3A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l3-g1-shizilukou',
  'hsk4-shang-l3-g1-zhuan',
  'hsk4-shang-l3-g1-shuxi',
  'hsk4-shang-l3-g2-saoma',
  'hsk4-shang-l3-g2-zhifubao',
] as const;

export const L3A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。前面就是十字路口，请扫码付款。',
    vi: 'Chào bạn! Mình là Minh. Phía trước là ngã tư, mình đi thẳng rồi rẽ trái. Bài 3 nói về chỉ đường, quét mã thanh toán và mua sắm trên mạng.',
    speakText: '你好！我是明。前面就是十字路口，请扫码付款。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l3a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '前面就是十字路口。',
    vi: 'Phía trước chính là ngã tư.',
    lexemeId: 'hsk4-shang-l3-g1-shizilukou',
    speakText: '前面就是十字路口。',
  },
  {
    id: 'hsk4-shang-l3a-pick-zhuan',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l3-g1-zhuan',
    scenario: '转 nghĩa là rẽ, quay, chuyển. Câu nào bảo rẽ trái ở phía trước?',
    options: [
      {
        text: '前面左转。',
        correct: true,
        explain: '前面左转。 — Phía trước rẽ trái.',
      },
      {
        text: '前面右转。',
        correct: false,
        explain: '前面右转。 — Phía trước rẽ phải. (右转 là rẽ phải, không phải rẽ trái).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l3a-pick-zhifu',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l3-g2-zhifu',
    scenario: '支付 nghĩa là thanh toán, trả tiền. Câu nào nói rằng bạn có thể thanh toán bằng điện thoại?',
    options: [
      {
        text: '你可以用手机支付。',
        correct: true,
        explain: '你可以用手机支付。 — Bạn có thể thanh toán bằng điện thoại.',
      },
      {
        text: '你不可以用手机支付。',
        correct: false,
        explain: '你不可以用手机支付。 — Bạn không thể thanh toán bằng điện thoại. (phủ định của 可以支付).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l3a-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l3-g2-saoma',
    zh: '请扫码付款。',
    vi: ORDER_VI,
    tiles: ['请', '扫码', '付', '款', '。'],
    answer: '请扫码付款。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L3A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 3 quest B — nhóm 3–4 (23 từ) ---------------------------
export const L3B_LEXEME_IDS = [
  'hsk4-shang-l3-g3-xianjin',
  'hsk4-shang-l3-g3-wanggou',
  'hsk4-shang-l3-g3-ji',
  'hsk4-shang-l3-g3-deng',
  'hsk4-shang-l3-g3-huo',
  'hsk4-shang-l3-g3-shenzhi',
  'hsk4-shang-l3-g3-gaibian',
  'hsk4-shang-l3-g3-shouzhi',
  'hsk4-shang-l3-g3-luan',
  'hsk4-shang-l3-g3-guan',
  'hsk4-shang-l3-g4-tigong',
  'hsk4-shang-l3-g4-shenfenzheng',
  'hsk4-shang-l3-g4-geren',
  'hsk4-shang-l3-g4-nengfou',
  'hsk4-shang-l3-g4-baohu',
  'hsk4-shang-l3-g4-yushi',
  'hsk4-shang-l3-g4-mima',
  'hsk4-shang-l3-g4-suibian',
  'hsk4-shang-l3-g4-jishu',
  'hsk4-shang-l3-g4-falu',
  'hsk4-shang-l3-g4-shouduan',
  'hsk4-shang-l3-g4-baozheng',
  'hsk4-shang-l3-g4-wangluo',
] as const;

export const L3B_QUEST = {
  id: 'hsk4-shang-l3b',
  title: 'Bài 3 — Chỉ đường và quét mã',
  lessonId: 'hsk4-shang-l3',
  lexemeIds: [...L3B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l3b',
} as const;

export const L3B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l3-g3-xianjin',
  'hsk4-shang-l3-g3-wanggou',
  'hsk4-shang-l3-g3-gaibian',
  'hsk4-shang-l3-g4-baohu',
  'hsk4-shang-l3-g4-wangluo',
] as const;

export const L3B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。现在很多人喜欢网购，我们要保护个人信息。',
    vi: 'Chào bạn! Mình là Minh. Bây giờ nhiều người thích mua sắm trên mạng, nhưng phải bảo vệ thông tin cá nhân. Buổi này học tiếp các từ còn lại của bài 3 — nhóm 3 và 4.',
    speakText: '你好！我是明。现在很多人喜欢网购，我们要保护个人信息。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l3b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '现在很多人喜欢网购。',
    vi: 'Bây giờ nhiều người thích mua sắm trên mạng.',
    lexemeId: 'hsk4-shang-l3-g3-wanggou',
    speakText: '现在很多人喜欢网购。',
  },
  {
    id: 'hsk4-shang-l3b-pick-gaibian',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l3-g3-gaibian',
    scenario: '改变 nghĩa là thay đổi. Câu nào nói rằng điện thoại đã thay đổi cuộc sống của chúng ta?',
    options: [
      {
        text: '手机改变了我们的生活。',
        correct: true,
        explain: '手机改变了我们的生活。 — Điện thoại đã thay đổi cuộc sống của chúng ta.',
      },
      {
        text: '手机没有改变我们的生活。',
        correct: false,
        explain: '手机没有改变我们的生活。 — Điện thoại đã không thay đổi cuộc sống của chúng ta. (phủ định của 改变).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l3b-pick-baohu',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l3-g4-baohu',
    scenario: '保护 nghĩa là bảo vệ. Câu nào nói rằng chúng ta phải bảo vệ thông tin cá nhân?',
    options: [
      {
        text: '我们要保护个人信息。',
        correct: true,
        explain: '我们要保护个人信息。 — Chúng ta phải bảo vệ thông tin cá nhân.',
      },
      {
        text: '我们不要保护个人信息。',
        correct: false,
        explain: '我们不要保护个人信息。 — Chúng ta đừng bảo vệ thông tin cá nhân. (phủ định của 要保护).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l3b-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l3-g4-mima',
    zh: '请不要告诉别人你的密码。',
    vi: ORDER_VI,
    tiles: ['请', '不要', '告诉', '别人', '你', '的', '密码', '。'],
    answer: '请不要告诉别人你的密码。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L3B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 4 quest A — nhóm 1–2 (18 từ) ---------------------------
export const L4A_LEXEME_IDS = [
  'hsk4-shang-l4-g1-a',
  'hsk4-shang-l4-g1-ting',
  'hsk4-shang-l4-g1-jiao',
  'hsk4-shang-l4-g1-fei',
  'hsk4-shang-l4-g1-xinhao',
  'hsk4-shang-l4-g1-ganxie',
  'hsk4-shang-l4-g1-lianxi',
  'hsk4-shang-l4-g1-fangshi',
  'hsk4-shang-l4-g1-keqi',
  'hsk4-shang-l4-g2-sheng',
  'hsk4-shang-l4-g2-ti',
  'hsk4-shang-l4-g2-daizi',
  'hsk4-shang-l4-g2-zhong',
  'hsk4-shang-l4-g2-suan',
  'hsk4-shang-l4-g2-zaishuo',
  'hsk4-shang-l4-g2-zhijian',
  'hsk4-shang-l4-g2-huxiang',
  'hsk4-shang-l4-g2-xinku',
] as const;

export const L4A_QUEST = {
  id: 'hsk4-shang-l4a',
  title: 'Bài 4 — Giúp đỡ lẫn nhau',
  lessonId: 'hsk4-shang-l4',
  lexemeIds: [...L4A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l4a',
} as const;

export const L4A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l4-g1-ganxie',
  'hsk4-shang-l4-g1-lianxi',
  'hsk4-shang-l4-g1-keqi',
  'hsk4-shang-l4-g2-huxiang',
  'hsk4-shang-l4-g2-xinku',
] as const;

export const L4A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。谢谢你的帮助，我们互相帮助吧。',
    vi: 'Chào bạn! Mình là Minh. Cảm ơn bạn đã giúp mình, chúng mình giúp đỡ lẫn nhau nhé. Bài 4 nói về giúp đỡ lẫn nhau và đi lại trong thành phố.',
    speakText: '你好！我是明。谢谢你的帮助，我们互相帮助吧。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l4a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '我很感谢你的帮助。',
    vi: 'Tôi rất cảm ơn sự giúp đỡ của bạn.',
    lexemeId: 'hsk4-shang-l4-g1-ganxie',
    speakText: '我很感谢你的帮助。',
  },
  {
    id: 'hsk4-shang-l4a-pick-huxiang',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l4-g2-huxiang',
    scenario: '互相 nghĩa là lẫn nhau, qua lại. Câu nào nói rằng chúng ta phải giúp đỡ lẫn nhau?',
    options: [
      {
        text: '我们要互相帮助。',
        correct: true,
        explain: '我们要互相帮助。 — Chúng ta phải giúp đỡ lẫn nhau.',
      },
      {
        text: '我们不要互相帮助。',
        correct: false,
        explain: '我们不要互相帮助。 — Chúng ta đừng giúp đỡ lẫn nhau. (phủ định của 要互相帮助).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l4a-pick-xinku',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l4-g2-xinku',
    scenario: '辛苦 nghĩa là vất vả. Câu nào nói rằng bạn vất vả rồi (lời cảm ơn)?',
    options: [
      {
        text: '你辛苦了。',
        correct: true,
        explain: '你辛苦了。 — Bạn vất vả rồi.',
      },
      {
        text: '你不辛苦。',
        correct: false,
        explain: '你不辛苦。 — Bạn không vất vả. (không phải lời cảm ơn “bạn vất vả rồi”).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l4a-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l4-g1-lianxi',
    zh: '我们保持联系。',
    vi: ORDER_VI,
    tiles: ['我们', '保持', '联系', '。'],
    answer: '我们保持联系。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L4A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 4 quest B — nhóm 3–4 (22 từ) ---------------------------
export const L4B_LEXEME_IDS = [
  'hsk4-shang-l4-g3-chuxing',
  'hsk4-shang-l4-g3-juli',
  'hsk4-shang-l4-g3-wangwang',
  'hsk4-shang-l4-g3-ji',
  'hsk4-shang-l4-g3-diandongche',
  'hsk4-shang-l4-g3-sudu',
  'hsk4-shang-l4-g3-chongdian',
  'hsk4-shang-l4-g3-liuxing',
  'hsk4-shang-l4-g3-sheng',
  'hsk4-shang-l4-g3-liqi',
  'hsk4-shang-l4-g4-chengke',
  'hsk4-shang-l4-g4-goumai',
  'hsk4-shang-l4-g4-shiwu',
  'hsk4-shang-l4-g4-mianfei',
  'hsk4-shang-l4-g4-zaocan',
  'hsk4-shang-l4-g4-laideji',
  'hsk4-shang-l4-g4-xianhua',
  'hsk4-shang-l4-g4-shunbian',
  'hsk4-shang-l4-g4-xinqing',
  'hsk4-shang-l4-g4-gengjia',
  'hsk4-shang-l4-g4-yukuai',
  'hsk4-shang-l4-g4-laibuji',
] as const;

export const L4B_QUEST = {
  id: 'hsk4-shang-l4b',
  title: 'Bài 4 — Giúp đỡ lẫn nhau',
  lessonId: 'hsk4-shang-l4',
  lexemeIds: [...L4B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l4b',
} as const;

export const L4B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l4-g3-chuxing',
  'hsk4-shang-l4-g3-diandongche',
  'hsk4-shang-l4-g3-sudu',
  'hsk4-shang-l4-g4-mianfei',
  'hsk4-shang-l4-g4-xinqing',
] as const;

export const L4B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。我骑电动车去学校，绿色出行很方便。',
    vi: 'Chào bạn! Mình là Minh. Mình đi xe điện đến trường, vừa nhanh vừa tiết kiệm sức. Buổi này học tiếp các từ còn lại của bài 4 — nhóm 3 và 4.',
    speakText: '你好！我是明。我骑电动车去学校，绿色出行很方便。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l4b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '我骑电动车去学校。',
    vi: 'Tôi đi xe điện đến trường.',
    lexemeId: 'hsk4-shang-l4-g3-diandongche',
    speakText: '我骑电动车去学校。',
  },
  {
    id: 'hsk4-shang-l4b-pick-liuxing',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l4-g3-liuxing',
    scenario: '流行 nghĩa là thịnh hành, được ưa chuộng. Câu nào nói rằng xe điện bây giờ rất thịnh hành?',
    options: [
      {
        text: '电动车现在很流行。',
        correct: true,
        explain: '电动车现在很流行。 — Xe điện bây giờ rất thịnh hành.',
      },
      {
        text: '电动车现在不流行。',
        correct: false,
        explain: '电动车现在不流行。 — Xe điện bây giờ không thịnh hành. (phủ định của 很流行).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l4b-pick-laideji',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l4-g4-laideji',
    scenario: '来得及 nghĩa là kịp, còn đủ thời gian. Câu nào nói rằng nhanh lên, vẫn còn kịp?',
    options: [
      {
        text: '快点儿，还来得及。',
        correct: true,
        explain: '快点儿，还来得及。 — Nhanh lên, vẫn còn kịp.',
      },
      {
        text: '快点儿，我来不及了。',
        correct: false,
        explain: '快点儿，我来不及了。 — Nhanh lên, tôi không kịp nữa rồi. (来不及 là không kịp, trái với 来得及).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l4b-goal',
    kind: 'choose-goal',
    lexemeId: 'hsk4-shang-l4-g4-xinqing',
    zh: '今天我的心情很好。',
    vi: '心情 nghĩa là tâm trạng. Hôm nay tâm trạng của bạn thế nào? (Chọn câu đúng với bạn — chỉ để ghi nhận, không tính đúng sai.)',
    options: [
      { text: '今天我的心情很好。', vi: 'Hôm nay tâm trạng của tôi rất tốt.' },
      { text: '今天我的心情不太好。', vi: 'Hôm nay tâm trạng của tôi không tốt lắm.' },
    ],
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L4B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 5 quest A — nhóm 1–2 (18 từ) ---------------------------
export const L5A_LEXEME_IDS = [
  'hsk4-shang-l5-g1-zhishao',
  'hsk4-shang-l5-g1-zhongcan',
  'hsk4-shang-l5-g1-zhuanmen',
  'hsk4-shang-l5-g1-zhu',
  'hsk4-shang-l5-g1-you',
  'hsk4-shang-l5-g1-dao-liangci',
  'hsk4-shang-l5-g1-shushou',
  'hsk4-shang-l5-g1-dao',
  'hsk4-shang-l5-g1-lajiao',
  'hsk4-shang-l5-g1-la',
  'hsk4-shang-l5-g1-shuizhuyu',
  'hsk4-shang-l5-g2-gan',
  'hsk4-shang-l5-g2-duzi',
  'hsk4-shang-l5-g2-xiangtong',
  'hsk4-shang-l5-g2-shunxu',
  'hsk4-shang-l5-g2-gou',
  'hsk4-shang-l5-g2-bugou',
  'hsk4-shang-l5-g2-dadao',
] as const;

export const L5A_QUEST = {
  id: 'hsk4-shang-l5a',
  title: 'Bài 5 — Ẩm thực và khẩu vị',
  lessonId: 'hsk4-shang-l5',
  lexemeIds: [...L5A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l5a',
} as const;

export const L5A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l5-g1-zhongcan',
  'hsk4-shang-l5-g1-dao-liangci',
  'hsk4-shang-l5-g1-la',
  'hsk4-shang-l5-g2-gan',
  'hsk4-shang-l5-g2-gou',
] as const;

export const L5A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。这道菜很辣，你敢吃辣椒吗？',
    vi: 'Chào bạn! Mình là Minh. Món này rất cay, bạn có dám ăn ớt không? Bài 5 nói về ẩm thực, khẩu vị và văn hóa ăn uống.',
    speakText: '你好！我是明。这道菜很辣，你敢吃辣椒吗？',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l5a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '这道菜很辣。',
    vi: 'Món này rất cay.',
    lexemeId: 'hsk4-shang-l5-g1-la',
    speakText: '这道菜很辣。',
  },
  {
    id: 'hsk4-shang-l5a-pick-dao-liangci',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l5-g1-dao-liangci',
    scenario: '道 là lượng từ dùng cho món ăn trong bữa. Câu nào nói rằng đây là một món ăn nổi tiếng?',
    options: [
      {
        text: '这是一道有名的菜。',
        correct: true,
        explain: '这是一道有名的菜。 — Đây là một món ăn nổi tiếng.',
      },
      {
        text: '这不是一道有名的菜。',
        correct: false,
        explain: '这不是一道有名的菜。 — Đây không phải là một món ăn nổi tiếng. (phủ định của 是).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l5a-pick-shushou',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l5-g1-shushou',
    scenario: '熟 nghĩa là chín (đã nấu chín). Câu nào nói rằng món này đã chín rồi?',
    options: [
      {
        text: '这道菜已经熟了。',
        correct: true,
        explain: '这道菜已经熟了。 — Món này đã chín rồi.',
      },
      {
        text: '这道菜还没有熟。',
        correct: false,
        explain: '这道菜还没有熟。 — Món này vẫn chưa chín. (trái với 已经熟了).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l5a-count',
    kind: 'choose-number',
    lexemeId: 'hsk4-shang-l5-g1-dao-liangci',
    zh: '我们今天吃了三道菜。',
    vi: 'Hôm nay chúng tôi đã ăn ba món. 道 là lượng từ dùng cho món ăn trong bữa. Hôm nay chúng tôi ăn mấy món?',
    options: [2, 3, 4, 5],
    correct: 3,
    unit: 'món',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L5A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 5 quest B — nhóm 3–4 (26 từ) ---------------------------
export const L5B_LEXEME_IDS = [
  'hsk4-shang-l5-g3-ju',
  'hsk4-shang-l5-g3-wucan',
  'hsk4-shang-l5-g3-xian',
  'hsk4-shang-l5-g3-liang',
  'hsk4-shang-l5-g3-fu',
  'hsk4-shang-l5-g3-ge',
  'hsk4-shang-l5-g3-jucan',
  'hsk4-shang-l5-g3-suan',
  'hsk4-shang-l5-g3-tang',
  'hsk4-shang-l5-g3-guizhou',
  'hsk4-shang-l5-g3-hongshaoyangrou',
  'hsk4-shang-l5-g3-laziji',
  'hsk4-shang-l5-g3-songshuguiyu',
  'hsk4-shang-l5-g3-suantangmixian',
  'hsk4-shang-l5-g4-anpai',
  'hsk4-shang-l5-g4-anzhao',
  'hsk4-shang-l5-g4-deng',
  'hsk4-shang-l5-g4-miandui',
  'hsk4-shang-l5-g4-nianling',
  'hsk4-shang-l5-g4-putong',
  'hsk4-shang-l5-g4-suiyi',
  'hsk4-shang-l5-g4-zhengshi',
  'hsk4-shang-l5-g4-zhongshi',
  'hsk4-shang-l5-g4-zhuren',
  'hsk4-shang-l5-g4-zunzhong',
  'hsk4-shang-l5-g4-zuowei',
] as const;

export const L5B_QUEST = {
  id: 'hsk4-shang-l5b',
  title: 'Bài 5 — Ẩm thực và khẩu vị',
  lessonId: 'hsk4-shang-l5',
  lexemeIds: [...L5B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l5b',
} as const;

export const L5B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l5-g3-ju',
  'hsk4-shang-l5-g3-jucan',
  'hsk4-shang-l5-g3-tang',
  'hsk4-shang-l5-g4-anpai',
  'hsk4-shang-l5-g4-zunzhong',
] as const;

export const L5B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。我们周末一起聚餐，今天我来付钱。',
    vi: 'Chào bạn! Mình là Minh. Cuối tuần chúng mình cùng liên hoan, hôm nay mình trả tiền. Buổi này học tiếp các từ còn lại của bài 5 — nhóm 3 và 4.',
    speakText: '你好！我是明。我们周末一起聚餐，今天我来付钱。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l5b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '我们周末一起聚餐。',
    vi: 'Cuối tuần chúng tôi cùng nhau liên hoan.',
    lexemeId: 'hsk4-shang-l5-g3-jucan',
    speakText: '我们周末一起聚餐。',
  },
  {
    id: 'hsk4-shang-l5b-pick-fu',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l5-g3-fu',
    scenario: '付 nghĩa là trả (tiền), thanh toán. Câu nào nói rằng hôm nay bạn trả tiền?',
    options: [
      {
        text: '今天我来付钱。',
        correct: true,
        explain: '今天我来付钱。 — Hôm nay tôi trả tiền.',
      },
      {
        text: '今天我不付钱。',
        correct: false,
        explain: '今天我不付钱。 — Hôm nay tôi không trả tiền. (phủ định của 付钱).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l5b-pick-zunzhong',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l5-g4-zunzhong',
    scenario: '尊重 nghĩa là tôn trọng. Câu nào nói rằng chúng ta phải tôn trọng sự sắp xếp của chủ nhà?',
    options: [
      {
        text: '我们要尊重主人的安排。',
        correct: true,
        explain: '我们要尊重主人的安排。 — Chúng ta phải tôn trọng sự sắp xếp của chủ nhà.',
      },
      {
        text: '我们不要尊重主人的安排。',
        correct: false,
        explain: '我们不要尊重主人的安排。 — Chúng ta đừng tôn trọng sự sắp xếp của chủ nhà. (phủ định của 要尊重).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l5b-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l5-g4-anpai',
    zh: '我来安排今天的午餐。',
    vi: ORDER_VI,
    tiles: ['我', '来', '安排', '今天', '的', '午餐', '。'],
    answer: '我来安排今天的午餐。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L5B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 6 quest A — nhóm 1–2 (16 từ) ---------------------------
export const L6A_LEXEME_IDS = [
  'hsk4-shang-l6-g1-kesou',
  'hsk4-shang-l6-g1-ke',
  'hsk4-shang-l6-g1-lihai',
  'hsk4-shang-l6-g1-yanzhong',
  'hsk4-shang-l6-g1-gankuai',
  'hsk4-shang-l6-g1-pei',
  'hsk4-shang-l6-g1-fanyi',
  'hsk4-shang-l6-g2-hushi',
  'hsk4-shang-l6-g2-biao',
  'hsk4-shang-l6-g2-xingbie',
  'hsk4-shang-l6-g2-guoji',
  'hsk4-shang-l6-g2-jiating',
  'hsk4-shang-l6-g2-dizhi',
  'hsk4-shang-l6-g2-guahao',
  'hsk4-shang-l6-g2-paidui',
  'hsk4-shang-l6-g2-dating',
] as const;

export const L6A_QUEST = {
  id: 'hsk4-shang-l6a',
  title: 'Bài 6 — Khám bệnh và sức khỏe',
  lessonId: 'hsk4-shang-l6',
  lexemeIds: [...L6A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l6a',
} as const;

export const L6A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l6-g1-kesou',
  'hsk4-shang-l6-g1-lihai',
  'hsk4-shang-l6-g1-pei',
  'hsk4-shang-l6-g2-hushi',
  'hsk4-shang-l6-g2-paidui',
] as const;

export const L6A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。他一直在咳嗽，我们赶快去医院。',
    vi: 'Chào bạn! Mình là Minh. Anh ấy cứ ho mãi, chúng mình mau đến bệnh viện. Bài 6 nói về khám bệnh, bệnh viện và sức khỏe.',
    speakText: '你好！我是明。他一直在咳嗽，我们赶快去医院。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l6a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '他一直在咳嗽。',
    vi: 'Anh ấy cứ ho mãi.',
    lexemeId: 'hsk4-shang-l6-g1-kesou',
    speakText: '他一直在咳嗽。',
  },
  {
    id: 'hsk4-shang-l6a-pick-lihai',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l6-g1-lihai',
    scenario: '厉害 nghĩa là dữ dội, ghê gớm. Câu nào nói rằng lần cảm lạnh này rất nặng?',
    options: [
      {
        text: '这次感冒很厉害。',
        correct: true,
        explain: '这次感冒很厉害。 — Lần cảm lạnh này rất nặng.',
      },
      {
        text: '这次感冒不厉害。',
        correct: false,
        explain: '这次感冒不厉害。 — Lần cảm lạnh này không nặng. (phủ định của 很厉害).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l6a-pick-guahao',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l6-g2-guahao',
    scenario: '挂号 nghĩa là đăng ký khám, lấy số (khám bệnh). Câu nào nói rằng bạn đi lấy số khám bệnh?',
    options: [
      {
        text: '我去挂号。',
        correct: true,
        explain: '我去挂号。 — Tôi đi lấy số khám bệnh.',
      },
      {
        text: '我不去挂号。',
        correct: false,
        explain: '我不去挂号。 — Tôi không đi lấy số khám bệnh. (phủ định của 去挂号).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l6a-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l6-g1-pei',
    zh: '我陪妈妈去看病。',
    vi: ORDER_VI,
    tiles: ['我', '陪', '妈妈', '去', '看病', '。'],
    answer: '我陪妈妈去看病。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L6A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 6 quest B — nhóm 3–4 (23 từ) ---------------------------
export const L6B_LEXEME_IDS = [
  'hsk4-shang-l6-g3-ouer',
  'hsk4-shang-l6-g3-shen',
  'hsk4-shang-l6-g3-jieguo',
  'hsk4-shang-l6-g3-xing',
  'hsk4-shang-l6-g3-tiwen',
  'hsk4-shang-l6-g3-jiang',
  'hsk4-shang-l6-g3-guang',
  'hsk4-shang-l6-g3-dazhen',
  'hsk4-shang-l6-g3-youxiao',
  'hsk4-shang-l6-g3-anshi',
  'hsk4-shang-l6-g3-han',
  'hsk4-shang-l6-g3-xing2',
  'hsk4-shang-l6-g3-ganjue',
  'hsk4-shang-l6-g3-di',
  'hsk4-shang-l6-g3-nanshou',
  'hsk4-shang-l6-g4-tong',
  'hsk4-shang-l6-g4-guocheng',
  'hsk4-shang-l6-g4-bu',
  'hsk4-shang-l6-g4-shoufei',
  'hsk4-shang-l6-g4-qingkuang',
  'hsk4-shang-l6-g4-hao',
  'hsk4-shang-l6-g4-zhiliao',
  'hsk4-shang-l6-g4-bu2',
] as const;

export const L6B_QUEST = {
  id: 'hsk4-shang-l6b',
  title: 'Bài 6 — Khám bệnh và sức khỏe',
  lessonId: 'hsk4-shang-l6',
  lexemeIds: [...L6B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l6b',
} as const;

export const L6B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l6-g3-jieguo',
  'hsk4-shang-l6-g3-youxiao',
  'hsk4-shang-l6-g3-ganjue',
  'hsk4-shang-l6-g4-qingkuang',
  'hsk4-shang-l6-g4-zhiliao',
] as const;

export const L6B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。检查的结果很好，我感觉好多了。',
    vi: 'Chào bạn! Mình là Minh. Kết quả kiểm tra rất tốt, mình cảm thấy đỡ hơn nhiều rồi. Buổi này học tiếp các từ còn lại của bài 6 — nhóm 3 và 4.',
    speakText: '你好！我是明。检查的结果很好，我感觉好多了。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l6b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '检查的结果很好。',
    vi: 'Kết quả kiểm tra rất tốt.',
    lexemeId: 'hsk4-shang-l6-g3-jieguo',
    speakText: '检查的结果很好。',
  },
  {
    id: 'hsk4-shang-l6b-pick-youxiao',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l6-g3-youxiao',
    scenario: '有效 nghĩa là có hiệu quả. Câu nào nói rằng loại thuốc này rất hiệu quả?',
    options: [
      {
        text: '这种药很有效。',
        correct: true,
        explain: '这种药很有效。 — Loại thuốc này rất hiệu quả.',
      },
      {
        text: '这种药没有效果。',
        correct: false,
        explain: '这种药没有效果。 — Loại thuốc này không có hiệu quả. (没有效果 là không có hiệu quả).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l6b-pick-nanshou',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l6-g3-nanshou',
    scenario: '难受 nghĩa là khó chịu, mệt (trong người). Câu nào nói rằng bạn thấy rất khó chịu?',
    options: [
      {
        text: '我觉得很难受。',
        correct: true,
        explain: '我觉得很难受。 — Tôi thấy rất khó chịu.',
      },
      {
        text: '我觉得不难受。',
        correct: false,
        explain: '我觉得不难受。 — Tôi thấy không khó chịu. (phủ định của 很难受).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l6b-count',
    kind: 'choose-number',
    lexemeId: 'hsk4-shang-l6-g4-bu2',
    zh: '他每天走一万步。',
    vi: 'Mỗi ngày anh ấy đi một vạn bước (一万 = 10.000 bước). 步 nghĩa là bước chân. Mỗi ngày anh ấy đi mấy bước?',
    options: [5000, 8000, 10000, 12000],
    correct: 10000,
    unit: 'bước',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L6B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 7 quest A — nhóm 1–2 (20 từ) ---------------------------
export const L7A_LEXEME_IDS = [
  'hsk4-shang-l7-g1-darao',
  'hsk4-shang-l7-g1-shichang',
  'hsk4-shang-l7-g1-diaocha',
  'hsk4-shang-l7-g1-jihua',
  'hsk4-shang-l7-g1-neirong',
  'hsk4-shang-l7-g1-gai',
  'hsk4-shang-l7-g1-xixin',
  'hsk4-shang-l7-g1-kehu',
  'hsk4-shang-l7-g1-zhenzheng',
  'hsk4-shang-l7-g1-xiangfa',
  'hsk4-shang-l7-g1-renwu',
  'hsk4-shang-l7-g1-jishi',
  'hsk4-shang-l7-g2-chuchai',
  'hsk4-shang-l7-g2-jingyan',
  'hsk4-shang-l7-g2-caifang',
  'hsk4-shang-l7-g2-chanpin',
  'hsk4-shang-l7-g2-kanfa',
  'hsk4-shang-l7-g2-tiqian',
  'hsk4-shang-l7-g2-bianyu',
  'hsk4-shang-l7-g2-jiran',
] as const;

export const L7A_QUEST = {
  id: 'hsk4-shang-l7a',
  title: 'Bài 7 — Công việc và phỏng vấn',
  lessonId: 'hsk4-shang-l7',
  lexemeIds: [...L7A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l7a',
} as const;

export const L7A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l7-g1-diaocha',
  'hsk4-shang-l7-g1-jihua',
  'hsk4-shang-l7-g1-xixin',
  'hsk4-shang-l7-g2-jingyan',
  'hsk4-shang-l7-g2-caifang',
] as const;

export const L7A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。我有一个新计划，我们在做市场调查。',
    vi: 'Chào bạn! Mình là Minh. Mình có một kế hoạch mới, chúng mình đang làm khảo sát thị trường. Bài 7 nói về công việc, phỏng vấn và kinh nghiệm.',
    speakText: '你好！我是明。我有一个新计划，我们在做市场调查。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l7a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '我有一个新计划。',
    vi: 'Tôi có một kế hoạch mới.',
    lexemeId: 'hsk4-shang-l7-g1-jihua',
    speakText: '我有一个新计划。',
  },
  {
    id: 'hsk4-shang-l7a-pick-xixin',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l7-g1-xixin',
    scenario: '细心 nghĩa là tỉ mỉ, cẩn thận. Câu nào nói rằng cô ấy làm việc rất tỉ mỉ?',
    options: [
      {
        text: '她工作很细心。',
        correct: true,
        explain: '她工作很细心。 — Cô ấy làm việc rất tỉ mỉ.',
      },
      {
        text: '她工作不细心。',
        correct: false,
        explain: '她工作不细心。 — Cô ấy làm việc không tỉ mỉ. (phủ định của 很细心).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l7a-pick-jingyan',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l7-g2-jingyan',
    scenario: '经验 nghĩa là kinh nghiệm. Câu nào nói rằng anh ấy có rất nhiều kinh nghiệm?',
    options: [
      {
        text: '他有很多经验。',
        correct: true,
        explain: '他有很多经验。 — Anh ấy có rất nhiều kinh nghiệm.',
      },
      {
        text: '他没有很多经验。',
        correct: false,
        explain: '他没有很多经验。 — Anh ấy không có nhiều kinh nghiệm. (phủ định của 有很多经验).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l7a-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l7-g1-diaocha',
    zh: '我们在做市场调查。',
    vi: ORDER_VI,
    tiles: ['我们', '在', '做', '市场', '调查', '。'],
    answer: '我们在做市场调查。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L7A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 7 quest B — nhóm 3–4 (19 từ) ---------------------------
export const L7B_LEXEME_IDS = [
  'hsk4-shang-l7-g3-tan',
  'hsk4-shang-l7-g3-bi',
  'hsk4-shang-l7-g3-shengyi',
  'hsk4-shang-l7-g3-kunnan',
  'hsk4-shang-l7-g3-youdian',
  'hsk4-shang-l7-g3-quedian',
  'hsk4-shang-l7-g3-shiji',
  'hsk4-shang-l7-g3-xiaoguo',
  'hsk4-shang-l7-g3-dian',
  'hsk4-shang-l7-g3-yixia',
  'hsk4-shang-l7-g4-fen',
  'hsk4-shang-l7-g4-jilei',
  'hsk4-shang-l7-g4-shi',
  'hsk4-shang-l7-g4-jinru',
  'hsk4-shang-l7-g4-shehui',
  'hsk4-shang-l7-g4-guanli',
  'hsk4-shang-l7-g4-jichu',
  'hsk4-shang-l7-g4-nengli',
  'hsk4-shang-l7-g4-jinhou',
] as const;

export const L7B_QUEST = {
  id: 'hsk4-shang-l7b',
  title: 'Bài 7 — Công việc và phỏng vấn',
  lessonId: 'hsk4-shang-l7',
  lexemeIds: [...L7B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l7b',
} as const;

export const L7B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l7-g3-tan',
  'hsk4-shang-l7-g3-kunnan',
  'hsk4-shang-l7-g3-xiaoguo',
  'hsk4-shang-l7-g4-jilei',
  'hsk4-shang-l7-g4-nengli',
] as const;

export const L7B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。工作中有很多困难，经验是慢慢积累的。',
    vi: 'Chào bạn! Mình là Minh. Trong công việc có nhiều khó khăn, kinh nghiệm tích lũy dần dần. Buổi này học tiếp các từ còn lại của bài 7 — nhóm 3 và 4.',
    speakText: '你好！我是明。工作中有很多困难，经验是慢慢积累的。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l7b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '工作中有很多困难。',
    vi: 'Trong công việc có nhiều khó khăn.',
    lexemeId: 'hsk4-shang-l7-g3-kunnan',
    speakText: '工作中有很多困难。',
  },
  {
    id: 'hsk4-shang-l7b-pick-youdian',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l7-g3-youdian',
    scenario: '优点 nghĩa là ưu điểm. Câu nào nói rằng anh ấy có nhiều ưu điểm?',
    options: [
      {
        text: '他有很多优点。',
        correct: true,
        explain: '他有很多优点。 — Anh ấy có nhiều ưu điểm.',
      },
      {
        text: '他有很多缺点。',
        correct: false,
        explain: '他有很多缺点。 — Anh ấy có nhiều nhược điểm. (缺点 là nhược điểm, trái với 优点).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l7b-pick-nengli',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l7-g4-nengli',
    scenario: '能力 nghĩa là năng lực, khả năng. Câu nào nói rằng năng lực của anh ấy rất mạnh?',
    options: [
      {
        text: '他的能力很强。',
        correct: true,
        explain: '他的能力很强。 — Năng lực của anh ấy rất mạnh.',
      },
      {
        text: '他的能力不强。',
        correct: false,
        explain: '他的能力不强。 — Năng lực của anh ấy không mạnh. (phủ định của 很强).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l7b-goal',
    kind: 'choose-goal',
    lexemeId: 'hsk4-shang-l7-g4-jinhou',
    zh: '今后我会更加努力。',
    vi: '今后 nghĩa là từ nay về sau, sau này. Từ nay về sau bạn muốn làm gì nhất? (Cả hai lựa chọn đều đúng — chỉ để ghi nhận mục tiêu của bạn.)',
    options: [
      { text: '今后我会更加努力。', vi: 'Từ nay về sau tôi sẽ cố gắng hơn nữa.' },
      { text: '今后我想进入这家公司。', vi: 'Từ nay về sau tôi muốn vào làm ở công ty này.' },
    ],
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L7B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 8 quest A — nhóm 1–2 (20 từ) ---------------------------
export const L8A_LEXEME_IDS = [
  'hsk4-shang-l8-g1-jinzhang',
  'hsk4-shang-l8-g1-fangsong',
  'hsk4-shang-l8-g1-ya',
  'hsk4-shang-l8-g1-buguan',
  'hsk4-shang-l8-g1-jiaoqu',
  'hsk4-shang-l8-g1-youwan',
  'hsk4-shang-l8-g1-zhuyi',
  'hsk4-shang-l8-g1-waichu',
  'hsk4-shang-l8-g1-dai',
  'hsk4-shang-l8-g1-maozi',
  'hsk4-shang-l8-g1-changcheng',
  'hsk4-shang-l8-g2-xiangmu',
  'hsk4-shang-l8-g2-jiaban',
  'hsk4-shang-l8-g2-aoye',
  'hsk4-shang-l8-g2-fouze',
  'hsk4-shang-l8-g2-shiqu',
  'hsk4-shang-l8-g2-zhide',
  'hsk4-shang-l8-g2-zanting',
  'hsk4-shang-l8-g2-zhihou',
  'hsk4-shang-l8-g2-fengjing',
] as const;

export const L8A_QUEST = {
  id: 'hsk4-shang-l8a',
  title: 'Bài 8 — Thư giãn và du lịch',
  lessonId: 'hsk4-shang-l8',
  lexemeIds: [...L8A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l8a',
} as const;

export const L8A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l8-g1-jinzhang',
  'hsk4-shang-l8-g1-fangsong',
  'hsk4-shang-l8-g1-changcheng',
  'hsk4-shang-l8-g2-jiaban',
  'hsk4-shang-l8-g2-fengjing',
] as const;

export const L8A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。周末我们去放松一下，我想去看长城。',
    vi: 'Chào bạn! Mình là Minh. Cuối tuần chúng mình đi thư giãn, mình muốn xem Vạn Lý Trường Thành. Bài 8 nói về thư giãn, du lịch và cân bằng cuộc sống.',
    speakText: '你好！我是明。周末我们去放松一下，我想去看长城。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l8a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '周末我们去放松一下。',
    vi: 'Cuối tuần chúng ta đi thư giãn một chút.',
    lexemeId: 'hsk4-shang-l8-g1-fangsong',
    speakText: '周末我们去放松一下。',
  },
  {
    id: 'hsk4-shang-l8a-pick-jinzhang',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l8-g1-jinzhang',
    scenario: '紧张 nghĩa là căng thẳng, hồi hộp. Câu nào nói rằng trước kỳ thi bạn rất căng thẳng?',
    options: [
      {
        text: '考试前我很紧张。',
        correct: true,
        explain: '考试前我很紧张。 — Trước kỳ thi tôi rất căng thẳng.',
      },
      {
        text: '考试前我不紧张。',
        correct: false,
        explain: '考试前我不紧张。 — Trước kỳ thi tôi không căng thẳng. (phủ định của 很紧张).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l8a-pick-fengjing',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l8-g2-fengjing',
    scenario: '风景 nghĩa là phong cảnh. Câu nào nói rằng phong cảnh ở đây rất đẹp?',
    options: [
      {
        text: '这里的风景很美。',
        correct: true,
        explain: '这里的风景很美。 — Phong cảnh ở đây rất đẹp.',
      },
      {
        text: '这里的风景不美。',
        correct: false,
        explain: '这里的风景不美。 — Phong cảnh ở đây không đẹp. (phủ định của 很美).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l8a-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l8-g1-youwan',
    zh: '我们去郊区游玩。',
    vi: ORDER_VI,
    tiles: ['我们', '去', '郊区', '游玩', '。'],
    answer: '我们去郊区游玩。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L8A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 8 quest B — nhóm 3–4 (20 từ) ---------------------------
export const L8B_LEXEME_IDS = [
  'hsk4-shang-l8-g3-xiaolv',
  'hsk4-shang-l8-g3-xiajiang',
  'hsk4-shang-l8-g3-xiangbi',
  'hsk4-shang-l8-g3-yinci',
  'hsk4-shang-l8-g3-tixing',
  'hsk4-shang-l8-g3-yu',
  'hsk4-shang-l8-g3-daziran',
  'hsk4-shang-l8-g3-meili',
  'hsk4-shang-l8-g3-jingse',
  'hsk4-shang-l8-g4-shoudu',
  'hsk4-shang-l8-g4-shiqu',
  'hsk4-shang-l8-g4-yanqian',
  'hsk4-shang-l8-g4-meijing',
  'hsk4-shang-l8-g4-canguan',
  'hsk4-shang-l8-g4-jingdian',
  'hsk4-shang-l8-g4-jiaotong',
  'hsk4-shang-l8-g4-chengzuo',
  'hsk4-shang-l8-g4-shifen',
  'hsk4-shang-l8-g4-shijishang',
  'hsk4-shang-l8-g4-gugong',
] as const;

export const L8B_QUEST = {
  id: 'hsk4-shang-l8b',
  title: 'Bài 8 — Thư giãn và du lịch',
  lessonId: 'hsk4-shang-l8',
  lexemeIds: [...L8B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l8b',
} as const;

export const L8B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l8-g3-xiaolv',
  'hsk4-shang-l8-g3-daziran',
  'hsk4-shang-l8-g3-meili',
  'hsk4-shang-l8-g4-canguan',
  'hsk4-shang-l8-g4-jiaotong',
] as const;

export const L8B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。休息可以提高效率，明天我们去参观故宫。',
    vi: 'Chào bạn! Mình là Minh. Nghỉ ngơi giúp nâng cao hiệu suất, ngày mai chúng mình đi tham quan Cố Cung. Buổi này học tiếp các từ còn lại của bài 8 — nhóm 3 và 4.',
    speakText: '你好！我是明。休息可以提高效率，明天我们去参观故宫。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l8b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '休息可以提高效率。',
    vi: 'Nghỉ ngơi có thể nâng cao hiệu suất.',
    lexemeId: 'hsk4-shang-l8-g3-xiaolv',
    speakText: '休息可以提高效率。',
  },
  {
    id: 'hsk4-shang-l8b-pick-meili',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l8-g3-meili',
    scenario: '美丽 nghĩa là xinh đẹp, tuyệt đẹp. Câu nào nói rằng phong cảnh nơi đây rất đẹp?',
    options: [
      {
        text: '这儿的风景很美丽。',
        correct: true,
        explain: '这儿的风景很美丽。 — Phong cảnh nơi đây rất đẹp.',
      },
      {
        text: '这儿的风景不美丽。',
        correct: false,
        explain: '这儿的风景不美丽。 — Phong cảnh nơi đây không đẹp. (phủ định của 很美丽).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l8b-pick-canguan',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l8-g4-canguan',
    scenario: '参观 nghĩa là tham quan, thăm quan. Câu nào nói rằng ngày mai chúng ta đi tham quan Cố Cung?',
    options: [
      {
        text: '明天我们去参观故宫。',
        correct: true,
        explain: '明天我们去参观故宫。 — Ngày mai chúng ta đi tham quan Cố Cung.',
      },
      {
        text: '明天我们不去参观故宫。',
        correct: false,
        explain: '明天我们不去参观故宫。 — Ngày mai chúng ta không đi tham quan Cố Cung. (phủ định của 去参观).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l8b-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l8-g3-tixing',
    zh: '谢谢你的提醒。',
    vi: ORDER_VI,
    tiles: ['谢谢', '你', '的', '提醒', '。'],
    answer: '谢谢你的提醒。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L8B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 9 quest A — nhóm 1–2 (18 từ) ---------------------------
export const L9A_LEXEME_IDS = [
  'hsk4-shang-l9-g1-zhu',
  'hsk4-shang-l9-g1-qiaokeli',
  'hsk4-shang-l9-g1-gandong',
  'hsk4-shang-l9-g1-langman',
  'hsk4-shang-l9-g1-youmo',
  'hsk4-shang-l9-g1-naixin',
  'hsk4-shang-l9-g1-xiyin',
  'hsk4-shang-l9-g1-dangshi',
  'hsk4-shang-l9-g1-cuoguo',
  'hsk4-shang-l9-g1-xingyun',
  'hsk4-shang-l9-g2-xingfu',
  'hsk4-shang-l9-g2-jinguan',
  'hsk4-shang-l9-g2-xingge',
  'hsk4-shang-l9-g2-gongtong',
  'hsk4-shang-l9-g2-zeren',
  'hsk4-shang-l9-g2-xianghu',
  'hsk4-shang-l9-g2-lijie',
  'hsk4-shang-l9-g2-zhichi',
] as const;

export const L9A_QUEST = {
  id: 'hsk4-shang-l9a',
  title: 'Bài 9 — Tình cảm và tình bạn',
  lessonId: 'hsk4-shang-l9',
  lexemeIds: [...L9A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l9a',
} as const;

export const L9A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l9-g1-zhu',
  'hsk4-shang-l9-g1-gandong',
  'hsk4-shang-l9-g1-xingyun',
  'hsk4-shang-l9-g2-xingfu',
  'hsk4-shang-l9-g2-lijie',
] as const;

export const L9A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。遇见你，我很幸运。祝你生日快乐！',
    vi: 'Chào bạn! Mình là Minh. Gặp được bạn, mình rất may mắn. Bài 9 nói về tình cảm, tình bạn và tính cách con người.',
    speakText: '你好！我是明。遇见你，我很幸运。祝你生日快乐！',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l9a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '遇见你，我很幸运。',
    vi: 'Gặp được bạn, tôi rất may mắn.',
    lexemeId: 'hsk4-shang-l9-g1-xingyun',
    speakText: '遇见你，我很幸运。',
  },
  {
    id: 'hsk4-shang-l9a-pick-gandong',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l9-g1-gandong',
    scenario: '感动 nghĩa là cảm động. Câu nào nói rằng lời nói của anh ấy khiến bạn rất cảm động?',
    options: [
      {
        text: '他的话让我很感动。',
        correct: true,
        explain: '他的话让我很感动。 — Lời nói của anh ấy khiến tôi rất cảm động.',
      },
      {
        text: '他的话没有让我感动。',
        correct: false,
        explain: '他的话没有让我感动。 — Lời nói của anh ấy đã không khiến tôi cảm động. (phủ định của 让我很感动).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l9a-pick-xingfu',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l9-g2-xingfu',
    scenario: '幸福 nghĩa là hạnh phúc. Câu nào nói rằng chúng tôi sống rất hạnh phúc?',
    options: [
      {
        text: '我们生活得很幸福。',
        correct: true,
        explain: '我们生活得很幸福。 — Chúng tôi sống rất hạnh phúc.',
      },
      {
        text: '我们生活得不幸福。',
        correct: false,
        explain: '我们生活得不幸福。 — Chúng tôi sống không hạnh phúc. (phủ định của 很幸福).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l9a-goal',
    kind: 'choose-goal',
    lexemeId: 'hsk4-shang-l9-g2-gongtong',
    zh: '我们有共同的爱好。',
    vi: '共同 nghĩa là chung, cùng nhau. Bạn và bạn của bạn có điểm chung gì? (Cả hai lựa chọn đều đúng — chỉ để ghi nhận.)',
    options: [
      { text: '我们有共同的爱好。', vi: 'Chúng tôi có sở thích chung.' },
      { text: '我们有共同的目标。', vi: 'Chúng tôi có mục tiêu chung.' },
    ],
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L9A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 9 quest B — nhóm 3–4 (22 từ) ---------------------------
export const L9B_LEXEME_IDS = [
  'hsk4-shang-l9-g3-yinxiang',
  'hsk4-shang-l9-g3-shizai',
  'hsk4-shang-l9-g3-yangguang',
  'hsk4-shang-l9-g3-fuze',
  'hsk4-shang-l9-g3-jiji',
  'hsk4-shang-l9-g3-ci',
  'hsk4-shang-l9-g3-congci',
  'hsk4-shang-l9-g3-chansheng',
  'hsk4-shang-l9-g3-aiqing',
  'hsk4-shang-l9-g3-jian',
  'hsk4-shang-l9-g3-youqing',
  'hsk4-shang-l9-g3-meihao',
  'hsk4-shang-l9-g4-rensheng',
  'hsk4-shang-l9-g4-jingcai',
  'hsk4-shang-l9-g4-ganqing',
  'hsk4-shang-l9-g4-shen',
  'hsk4-shang-l9-g4-jingying',
  'hsk4-shang-l9-g4-duifang',
  'hsk4-shang-l9-g4-ganshou',
  'hsk4-shang-l9-g4-youqi',
  'hsk4-shang-l9-g4-rizi',
  'hsk4-shang-l9-g4-conglai',
] as const;

export const L9B_QUEST = {
  id: 'hsk4-shang-l9b',
  title: 'Bài 9 — Tình cảm và tình bạn',
  lessonId: 'hsk4-shang-l9',
  lexemeIds: [...L9B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l9b',
} as const;

export const L9B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l9-g3-yinxiang',
  'hsk4-shang-l9-g3-aiqing',
  'hsk4-shang-l9-g3-youqing',
  'hsk4-shang-l9-g4-ganqing',
  'hsk4-shang-l9-g4-rizi',
] as const;

export const L9B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。从此，我们成了好朋友，我们的友情很深。',
    vi: 'Chào bạn! Mình là Minh. Từ đó, chúng mình thành bạn tốt, tình bạn rất sâu đậm. Buổi này học tiếp các từ còn lại của bài 9 — nhóm 3 và 4.',
    speakText: '你好！我是明。从此，我们成了好朋友，我们的友情很深。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l9b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '我们的友情很深。',
    vi: 'Tình bạn của chúng tôi rất sâu đậm.',
    lexemeId: 'hsk4-shang-l9-g3-youqing',
    speakText: '我们的友情很深。',
  },
  {
    id: 'hsk4-shang-l9b-pick-yinxiang',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l9-g3-yinxiang',
    scenario: '印象 nghĩa là ấn tượng. Câu nào nói rằng anh ấy để lại cho bạn ấn tượng rất tốt?',
    options: [
      {
        text: '他给我留下了很好的印象。',
        correct: true,
        explain: '他给我留下了很好的印象。 — Anh ấy để lại cho tôi ấn tượng rất tốt.',
      },
      {
        text: '他给我留下了不好的印象。',
        correct: false,
        explain: '他给我留下了不好的印象。 — Anh ấy để lại cho tôi ấn tượng không tốt. (不好的印象 trái với 很好的印象).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l9b-pick-jingying',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l9-g4-jingying',
    scenario: '经营 nghĩa là vun đắp, gìn giữ (tình cảm). Câu nào nói rằng tình bạn cũng cần vun đắp?',
    options: [
      {
        text: '友情也需要经营。',
        correct: true,
        explain: '友情也需要经营。 — Tình bạn cũng cần vun đắp.',
      },
      {
        text: '友情不需要经营。',
        correct: false,
        explain: '友情不需要经营。 — Tình bạn không cần vun đắp. (phủ định của 也需要经营).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l9b-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l9-g3-aiqing',
    zh: '爱情需要相互理解。',
    vi: ORDER_VI,
    tiles: ['爱情', '需要', '相互', '理解', '。'],
    answer: '爱情需要相互理解。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L9B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 10 quest A — nhóm 1–2 (20 từ) ---------------------------
export const L10A_LEXEME_IDS = [
  'hsk4-shang-l10-g1-xiaohuozi',
  'hsk4-shang-l10-g1-qiwen',
  'hsk4-shang-l10-g1-lingxia',
  'hsk4-shang-l10-g1-du',
  'hsk4-shang-l10-g1-dong',
  'hsk4-shang-l10-g1-houhui',
  'hsk4-shang-l10-g1-jiushi',
  'hsk4-shang-l10-g1-wendu',
  'hsk4-shang-l10-g1-chabie',
  'hsk4-shang-l10-g1-hou',
  'hsk4-shang-l10-g1-guangzhou',
  'hsk4-shang-l10-g1-haerbin',
  'hsk4-shang-l10-g2-hanjia',
  'hsk4-shang-l10-g2-nuanhuo',
  'hsk4-shang-l10-g2-diyu',
  'hsk4-shang-l10-g2-sheshidu',
  'hsk4-shang-l10-g2-shoubuliao',
  'hsk4-shang-l10-g2-juban',
  'hsk4-shang-l10-g2-gezhong',
  'hsk4-shang-l10-g2-zhiwu',
] as const;

export const L10A_QUEST = {
  id: 'hsk4-shang-l10a',
  title: 'Bài 10 — Thời tiết Nam – Bắc',
  lessonId: 'hsk4-shang-l10',
  lexemeIds: [...L10A_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l10a',
} as const;

export const L10A_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l10-g1-qiwen',
  'hsk4-shang-l10-g1-dong',
  'hsk4-shang-l10-g1-chabie',
  'hsk4-shang-l10-g2-hanjia',
  'hsk4-shang-l10-g2-shoubuliao',
] as const;

export const L10A_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。今天的气温很低，广州在中国的南方。',
    vi: 'Chào bạn! Mình là Minh. Hôm nay nhiệt độ rất thấp, Quảng Châu ở miền Nam Trung Quốc. Bài 10 nói về thời tiết Nam – Bắc, phương ngữ và sống xanh.',
    speakText: '你好！我是明。今天的气温很低，广州在中国的南方。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l10a-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '今天的气温很低。',
    vi: 'Nhiệt độ không khí hôm nay rất thấp.',
    lexemeId: 'hsk4-shang-l10-g1-qiwen',
    speakText: '今天的气温很低。',
  },
  {
    id: 'hsk4-shang-l10a-pick-chabie',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l10-g1-chabie',
    scenario: '差别 nghĩa là sự khác biệt, chênh lệch. Câu nào nói rằng sự khác biệt giữa miền Nam và miền Bắc rất lớn?',
    options: [
      {
        text: '南方和北方的差别很大。',
        correct: true,
        explain: '南方和北方的差别很大。 — Sự khác biệt giữa miền Nam và miền Bắc rất lớn.',
      },
      {
        text: '南方和北方的差别不大。',
        correct: false,
        explain: '南方和北方的差别不大。 — Sự khác biệt giữa miền Nam và miền Bắc không lớn. (phủ định của 很大).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l10a-pick-nuanhuo',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l10-g2-nuanhuo',
    scenario: '暖和 nghĩa là ấm áp. Câu nào nói rằng trong nhà rất ấm áp?',
    options: [
      {
        text: '屋里很暖和。',
        correct: true,
        explain: '屋里很暖和。 — Trong nhà rất ấm áp.',
      },
      {
        text: '屋里不暖和。',
        correct: false,
        explain: '屋里不暖和。 — Trong nhà không ấm áp. (phủ định của 很暖和).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l10a-count',
    kind: 'choose-number',
    lexemeId: 'hsk4-shang-l10-g1-lingxia',
    zh: '今天零下五度。',
    vi: 'Hôm nay âm năm độ. 零下 nghĩa là âm (dưới 0 độ). Hôm nay bao nhiêu độ?',
    options: [-10, -5, 0, 5],
    correct: -5,
    unit: 'độ',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L10A_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Bài 10 quest B — nhóm 3–4 (23 từ) ---------------------------
export const L10B_LEXEME_IDS = [
  'hsk4-shang-l10-g3-gongli',
  'hsk4-shang-l10-g3-qihou',
  'hsk4-shang-l10-g3-er',
  'hsk4-shang-l10-g3-ciwai',
  'hsk4-shang-l10-g3-fangyan',
  'hsk4-shang-l10-g3-putonghua',
  'hsk4-shang-l10-g3-jiao',
  'hsk4-shang-l10-g3-shiyong',
  'hsk4-shang-l10-g3-yinqi',
  'hsk4-shang-l10-g3-wuhui',
  'hsk4-shang-l10-g4-qinai',
  'hsk4-shang-l10-g4-zaici',
  'hsk4-shang-l10-g4-kaizhan',
  'hsk4-shang-l10-g4-lvse',
  'hsk4-shang-l10-g4-huanbao',
  'hsk4-shang-l10-g4-jujue',
  'hsk4-shang-l10-g4-langfei',
  'hsk4-shang-l10-g4-jieyue',
  'hsk4-shang-l10-g4-ziyuan',
  'hsk4-shang-l10-g4-guang',
  'hsk4-shang-l10-g4-laji',
  'hsk4-shang-l10-g4-fenlei',
  'hsk4-shang-l10-g4-richang',
] as const;

export const L10B_QUEST = {
  id: 'hsk4-shang-l10b',
  title: 'Bài 10 — Thời tiết Nam – Bắc',
  lessonId: 'hsk4-shang-l10',
  lexemeIds: [...L10B_LEXEME_IDS],
  rewardPoints: 50,
  badgeId: 'hsk4-shang-l10b',
} as const;

export const L10B_REVIEW_LEXEME_IDS = [
  'hsk4-shang-l10-g3-qihou',
  'hsk4-shang-l10-g3-fangyan',
  'hsk4-shang-l10-g3-wuhui',
  'hsk4-shang-l10-g4-huanbao',
  'hsk4-shang-l10-g4-fenlei',
] as const;

export const L10B_STEPS: QuestStep[] = [
  {
    id: 'greet-minh',
    kind: 'talk',
    npc: 'minh',
    zh: '你好！我是明。这里的气候很好，我们要节约用水。',
    vi: 'Chào bạn! Mình là Minh. Khí hậu ở đây rất tốt, chúng mình phải tiết kiệm nước. Buổi này học tiếp các từ còn lại của bài 10 — nhóm 3 và 4.',
    speakText: '你好！我是明。这里的气候很好，我们要节约用水。',
  },
  { id: 'goto-door', kind: 'goto', targetId: 'classroom-door', vi: GOTO_DOOR_VI },
  {
    id: 'hsk4-shang-l10b-teacher',
    kind: 'talk',
    npc: 'teacher',
    zh: '这里的气候很好。',
    vi: 'Khí hậu ở đây rất tốt.',
    lexemeId: 'hsk4-shang-l10-g3-qihou',
    speakText: '这里的气候很好。',
  },
  {
    id: 'hsk4-shang-l10b-pick-fangyan',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l10-g3-fangyan',
    scenario: '方言 nghĩa là phương ngữ, tiếng địa phương. Câu nào nói rằng anh ấy nói được nhiều phương ngữ?',
    options: [
      {
        text: '他会说很多方言。',
        correct: true,
        explain: '他会说很多方言。 — Anh ấy nói được nhiều phương ngữ.',
      },
      {
        text: '他不会说很多方言。',
        correct: false,
        explain: '他不会说很多方言。 — Anh ấy không nói được nhiều phương ngữ. (phủ định của 会说很多方言).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l10b-pick-jieyue',
    kind: 'pick-meaning',
    lexemeId: 'hsk4-shang-l10-g4-jieyue',
    scenario: '节约 nghĩa là tiết kiệm. Câu nào nói rằng chúng ta phải tiết kiệm nước?',
    options: [
      {
        text: '我们要节约用水。',
        correct: true,
        explain: '我们要节约用水。 — Chúng ta phải tiết kiệm nước.',
      },
      {
        text: '我们不要节约用水。',
        correct: false,
        explain: '我们不要节约用水。 — Chúng ta đừng tiết kiệm nước. (phủ định của 要节约).',
      },
    ],
  },
  {
    id: 'hsk4-shang-l10b-order',
    kind: 'order',
    lexemeId: 'hsk4-shang-l10-g4-kaizhan',
    zh: '学校开展了环保活动。',
    vi: ORDER_VI,
    tiles: ['学校', '开展', '了', '环保', '活动', '。'],
    answer: '学校开展了环保活动。',
    source: 'authored',
  },
  { id: 'final-review', kind: 'review', lexemeIds: [...L10B_REVIEW_LEXEME_IDS] },
  { id: 'result', kind: 'result' },
];

// --- Registry riêng quyển thượng (luồng tích hợp nối vào QUEST_REGISTRY sau) ---
export const HSK4_SHANG_QUEST_DEFS: QuestDef[] = [
  {
    quest: { ...L1A_QUEST, lexemeIds: [...L1A_QUEST.lexemeIds] },
    steps: L1A_STEPS,
  },
  {
    quest: { ...L1B_QUEST, lexemeIds: [...L1B_QUEST.lexemeIds] },
    steps: L1B_STEPS,
  },
  {
    quest: { ...L2A_QUEST, lexemeIds: [...L2A_QUEST.lexemeIds] },
    steps: L2A_STEPS,
  },
  {
    quest: { ...L2B_QUEST, lexemeIds: [...L2B_QUEST.lexemeIds] },
    steps: L2B_STEPS,
  },
  {
    quest: { ...L3A_QUEST, lexemeIds: [...L3A_QUEST.lexemeIds] },
    steps: L3A_STEPS,
  },
  {
    quest: { ...L3B_QUEST, lexemeIds: [...L3B_QUEST.lexemeIds] },
    steps: L3B_STEPS,
  },
  {
    quest: { ...L4A_QUEST, lexemeIds: [...L4A_QUEST.lexemeIds] },
    steps: L4A_STEPS,
  },
  {
    quest: { ...L4B_QUEST, lexemeIds: [...L4B_QUEST.lexemeIds] },
    steps: L4B_STEPS,
  },
  {
    quest: { ...L5A_QUEST, lexemeIds: [...L5A_QUEST.lexemeIds] },
    steps: L5A_STEPS,
  },
  {
    quest: { ...L5B_QUEST, lexemeIds: [...L5B_QUEST.lexemeIds] },
    steps: L5B_STEPS,
  },
  {
    quest: { ...L6A_QUEST, lexemeIds: [...L6A_QUEST.lexemeIds] },
    steps: L6A_STEPS,
  },
  {
    quest: { ...L6B_QUEST, lexemeIds: [...L6B_QUEST.lexemeIds] },
    steps: L6B_STEPS,
  },
  {
    quest: { ...L7A_QUEST, lexemeIds: [...L7A_QUEST.lexemeIds] },
    steps: L7A_STEPS,
  },
  {
    quest: { ...L7B_QUEST, lexemeIds: [...L7B_QUEST.lexemeIds] },
    steps: L7B_STEPS,
  },
  {
    quest: { ...L8A_QUEST, lexemeIds: [...L8A_QUEST.lexemeIds] },
    steps: L8A_STEPS,
  },
  {
    quest: { ...L8B_QUEST, lexemeIds: [...L8B_QUEST.lexemeIds] },
    steps: L8B_STEPS,
  },
  {
    quest: { ...L9A_QUEST, lexemeIds: [...L9A_QUEST.lexemeIds] },
    steps: L9A_STEPS,
  },
  {
    quest: { ...L9B_QUEST, lexemeIds: [...L9B_QUEST.lexemeIds] },
    steps: L9B_STEPS,
  },
  {
    quest: { ...L10A_QUEST, lexemeIds: [...L10A_QUEST.lexemeIds] },
    steps: L10A_STEPS,
  },
  {
    quest: { ...L10B_QUEST, lexemeIds: [...L10B_QUEST.lexemeIds] },
    steps: L10B_STEPS,
  },
];

/** lessonId → [id quest A (nhóm 1–2), id quest B (nhóm 3–4)]. */
export const HSK4_SHANG_LESSON_QUEST_IDS: Record<string, [string, string]> = {
  'hsk4-shang-l1': ['hsk4-shang-l1a', 'hsk4-shang-l1b'],
  'hsk4-shang-l2': ['hsk4-shang-l2a', 'hsk4-shang-l2b'],
  'hsk4-shang-l3': ['hsk4-shang-l3a', 'hsk4-shang-l3b'],
  'hsk4-shang-l4': ['hsk4-shang-l4a', 'hsk4-shang-l4b'],
  'hsk4-shang-l5': ['hsk4-shang-l5a', 'hsk4-shang-l5b'],
  'hsk4-shang-l6': ['hsk4-shang-l6a', 'hsk4-shang-l6b'],
  'hsk4-shang-l7': ['hsk4-shang-l7a', 'hsk4-shang-l7b'],
  'hsk4-shang-l8': ['hsk4-shang-l8a', 'hsk4-shang-l8b'],
  'hsk4-shang-l9': ['hsk4-shang-l9a', 'hsk4-shang-l9b'],
  'hsk4-shang-l10': ['hsk4-shang-l10a', 'hsk4-shang-l10b'],
};
