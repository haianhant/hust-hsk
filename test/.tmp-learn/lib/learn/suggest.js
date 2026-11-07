"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextSuggestion = getNextSuggestion;
const quest_data_1 = require("./quest-data");
const store_1 = require("./store");
function getNextSuggestion(p) {
    if (!p) {
        return {
            kind: 'next',
            text: 'Bắt đầu với "Buổi học đầu tiên" — gặp Minh ở cổng Parabol.',
            action: 'start',
            questId: 'first-lesson',
            dueCount: 0,
        };
    }
    let dueCount = 0;
    try {
        dueCount = (0, store_1.getDueWordsIncludingTodayWrong)(p, (0, store_1.todayKey)()).length;
    }
    catch {
        dueCount = 0;
    }
    if (dueCount > 0) {
        return {
            kind: 'due',
            text: `Hôm nay có ${dueCount} từ đến hạn ôn — mở Sổ tay › Lịch ôn để ôn.`,
            action: 'calendar',
            questId: null,
            dueCount,
        };
    }
    const active = p.questState && !p.questState.done ? p.questState.questId : null;
    if (active) {
        const def = quest_data_1.ALL_QUEST_DEFS.find((d) => d.quest.id === active);
        return {
            kind: 'unfinished',
            text: `Bài "${def?.quest.title ?? active}" đang học dở — bấm để học tiếp.`,
            action: 'resume',
            questId: active,
            dueCount: 0,
        };
    }
    const nextDef = quest_data_1.ALL_QUEST_DEFS.find((d) => !p.completedQuests[d.quest.id]);
    if (nextDef) {
        return {
            kind: 'next',
            text: `Bài tiếp theo: "${nextDef.quest.title}" — ${nextDef.quest.lexemeIds.length} từ mới.`,
            action: 'start',
            questId: nextDef.quest.id,
            dueCount: 0,
        };
    }
    return {
        kind: 'done',
        text: 'Đã hoàn thành tất cả các bài — ôn lại từ cần ôn để giữ vững nhé.',
        action: 'calendar',
        questId: null,
        dueCount: 0,
    };
}
