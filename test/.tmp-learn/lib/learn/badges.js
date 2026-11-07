"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_BADGES = exports.HSK4_QUEST_IDS = exports.HSK3_QUEST_IDS = void 0;
exports.getGlobalBadgeStates = getGlobalBadgeStates;
exports.getEarnedGlobalBadgeIds = getEarnedGlobalBadgeIds;
const quest_data_1 = require("./quest-data");
const store_1 = require("./store");
/** Quest HSK 3 (10 quest: tuyến bài 10 nhóm 1 + 9 quest Bước 6). */
exports.HSK3_QUEST_IDS = [
    'first-lesson',
    'l10-g234',
    'l11',
    'l12',
    'l13',
    'l14',
    'l15',
    'l16',
    'l17',
    'l18',
];
/** Quest HSK 4 (40 quest, phần 1 + phần 2 của 20 bài). */
exports.HSK4_QUEST_IDS = Object.values(quest_data_1.HSK4_LESSON_QUEST_IDS).flat();
exports.GLOBAL_BADGES = [
    {
        id: 'friend-of-library',
        icon: '📚',
        title: 'Bạn của thư viện',
        description: 'Đã gặp 100 từ trong sổ tay (HSK 3 + HSK 4).',
    },
    {
        id: 'diligent-reviewer',
        icon: '🔁',
        title: 'Chăm ôn tập',
        description: 'Có 20 từ đã nhớ vững (level ≥ 3, không còn lần sai chưa sửa).',
    },
    {
        id: 'hsk3-complete',
        icon: '🎓',
        title: 'Hoàn thành HSK 3',
        description: 'Hoàn thành cả 10 quest HSK 3 (bài 10–18).',
    },
    {
        id: 'hsk4-complete',
        icon: '🏆',
        title: 'Hoàn thành HSK 4',
        description: 'Hoàn thành cả 40 quest HSK 4 (bài 1–20).',
    },
    {
        id: 'streak-7',
        icon: '🔥',
        title: 'Bền bỉ 7 ngày',
        description: 'Học liên tục 7 ngày (theo ngày địa phương Asia/Ho_Chi_Minh).',
    },
    {
        id: 'streak-30',
        icon: '💎',
        title: 'Bền bỉ 30 ngày',
        description: 'Học liên tục 30 ngày (theo ngày địa phương Asia/Ho_Chi_Minh).',
    },
];
/** Tính trạng thái từng huy hiệu toàn cục từ tiến độ hiện tại. */
function getGlobalBadgeStates(p) {
    const encounteredCount = p.encountered.length;
    const wellKnownCount = Object.values(p.lexemes).filter((st) => (0, store_1.isWellKnownState)(st)).length;
    const hsk3Done = exports.HSK3_QUEST_IDS.filter((q) => p.completedQuests[q]).length;
    const hsk4Done = exports.HSK4_QUEST_IDS.filter((q) => p.completedQuests[q]).length;
    const streak = p.streak.count;
    const byId = {
        'friend-of-library': {
            earned: encounteredCount >= 100,
            progressText: `${encounteredCount}/100 từ đã gặp`,
        },
        'diligent-reviewer': {
            earned: wellKnownCount >= 20,
            progressText: `${wellKnownCount}/20 từ nhớ vững`,
        },
        'hsk3-complete': {
            earned: hsk3Done === exports.HSK3_QUEST_IDS.length,
            progressText: `${hsk3Done}/${exports.HSK3_QUEST_IDS.length} quest HSK 3`,
        },
        'hsk4-complete': {
            earned: hsk4Done === exports.HSK4_QUEST_IDS.length,
            progressText: `${hsk4Done}/${exports.HSK4_QUEST_IDS.length} quest HSK 4`,
        },
        'streak-7': {
            earned: streak >= 7,
            progressText: `${streak}/7 ngày liên tục`,
        },
        'streak-30': {
            earned: streak >= 30,
            progressText: `${streak}/30 ngày liên tục`,
        },
    };
    return exports.GLOBAL_BADGES.map((def) => ({
        def,
        earned: byId[def.id].earned,
        progressText: byId[def.id].progressText,
    }));
}
/** ID các huy hiệu toàn cục đã đạt (dùng để so sánh trước/sau một buổi học). */
function getEarnedGlobalBadgeIds(p) {
    return getGlobalBadgeStates(p)
        .filter((b) => b.earned)
        .map((b) => b.def.id);
}
