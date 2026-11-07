"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVIEW_INTERVALS_DAYS = exports.CURRENT_VERSION = exports.STORAGE_KEY = void 0;
exports.todayKey = todayKey;
exports.addDaysToKey = addDaysToKey;
exports.createEmptyProgress = createEmptyProgress;
exports.loadProgress = loadProgress;
exports.exportProgress = exportProgress;
exports.saveProgress = saveProgress;
exports.resetProgress = resetProgress;
exports.scoreAnswer = scoreAnswer;
exports.markActivityDay = markActivityDay;
exports.recordAnswer = recordAnswer;
exports.recordReReview = recordReReview;
exports.awardQuestCompletion = awardQuestCompletion;
exports.getDueWords = getDueWords;
exports.getSessionWrongIds = getSessionWrongIds;
exports.getDueWordsIncludingTodayWrong = getDueWordsIncludingTodayWrong;
exports.getReviewCalendar = getReviewCalendar;
exports.getErrorWords = getErrorWords;
exports.isWellKnownState = isWellKnownState;
exports.getWordState = getWordState;
exports.markEncountered = markEncountered;
exports.importProgress = importProgress;
const hsk3_index_1 = require("../../content/hsk3-index");
const hsk4_index_1 = require("../../content/hsk4-index");
/** ID các từ đã biết (HSK 3 246 + HSK 4 811 = 1057) — loại id lạ khi import. */
const KNOWN_LEXEME_IDS = [...hsk3_index_1.KNOWN_LEXEME_IDS, ...hsk4_index_1.KNOWN_HSK4_LEXEME_IDS];
exports.STORAGE_KEY = 'bkhn-progress-v1';
exports.CURRENT_VERSION = 1;
/**
 * Lịch ôn theo level (ngày): level 1 → +1, 2 → +3, 3 → +7, 4 → +14, 5 → +30.
 * Đây là CẤU HÌNH SẢN PHẨM, không tuyên bố là thuật toán tối ưu khoa học.
 */
exports.REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const MAX_LEVEL = 5;
// ---------------------------------------------------------------------------
// Ngày (múi giờ Asia/Ho_Chi_Minh)
// ---------------------------------------------------------------------------
/** Ngày địa phương Asia/Ho_Chi_Minh dạng YYYY-MM-DD. */
function todayKey(d = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(d);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
}
/** Cộng/trừ n ngày vào một khóa ngày YYYY-MM-DD. */
function addDaysToKey(dayKey, days) {
    const [y, m, d] = dayKey.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    const pad = (n) => String(n).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
function isDateKey(v) {
    return (typeof v === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(`${v}T00:00:00Z`)));
}
// ---------------------------------------------------------------------------
// Tạo / nạp / lưu
// ---------------------------------------------------------------------------
function createEmptyProgress() {
    return {
        version: 1,
        lexemes: {},
        encountered: [],
        events: [],
        points: 0,
        badges: [],
        completedQuests: {},
        streak: { count: 0, lastDay: null },
        settings: { soundOn: true, speechRate: 1, showPinyin: true },
        questState: null,
    };
}
function isRecord(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function asArray(v) {
    return Array.isArray(v) ? v : [];
}
/**
 * Migration v1: dữ liệu cũ thiếu trường thì điền mặc định, không mất tiến độ.
 * Lenient có chủ đích: nạp dữ liệu đã lưu trên máy thì giữ lại tối đa những
 * gì đọc được; cổng kiểm tra chặt là importProgress (có cảnh báo + từ chối).
 */
function migrateProgress(data) {
    const p = createEmptyProgress();
    if (isRecord(data.lexemes)) {
        for (const [id, raw] of Object.entries(data.lexemes)) {
            if (!isRecord(raw))
                continue;
            const level = typeof raw.level === 'number' &&
                Number.isInteger(raw.level) &&
                raw.level >= 0 &&
                raw.level <= MAX_LEVEL
                ? raw.level
                : 0;
            p.lexemes[id] = {
                lexemeId: typeof raw.lexemeId === 'string' ? raw.lexemeId : id,
                level,
                nextDue: isDateKey(raw.nextDue) ? raw.nextDue : todayKey(),
                lastSeen: typeof raw.lastSeen === 'string' ? raw.lastSeen : null,
                correctCount: typeof raw.correctCount === 'number' && raw.correctCount >= 0
                    ? Math.floor(raw.correctCount)
                    : 0,
                wrongCount: typeof raw.wrongCount === 'number' && raw.wrongCount >= 0
                    ? Math.floor(raw.wrongCount)
                    : 0,
                lastWrongAt: typeof raw.lastWrongAt === 'string' ? raw.lastWrongAt : null,
                lastCorrectAt: typeof raw.lastCorrectAt === 'string' ? raw.lastCorrectAt : null,
            };
        }
    }
    p.encountered = asArray(data.encountered).filter((x) => typeof x === 'string');
    p.events = asArray(data.events).filter((e) => isRecord(e) &&
        typeof e.id === 'string' &&
        typeof e.at === 'string' &&
        typeof e.correct === 'boolean');
    if (typeof data.points === 'number' && data.points >= 0) {
        p.points = Math.floor(data.points);
    }
    p.badges = asArray(data.badges).filter((x) => typeof x === 'string');
    if (isRecord(data.completedQuests)) {
        for (const [qid, raw] of Object.entries(data.completedQuests)) {
            if (isRecord(raw) &&
                typeof raw.at === 'string' &&
                typeof raw.points === 'number') {
                p.completedQuests[qid] = { at: raw.at, points: raw.points };
            }
        }
    }
    if (isRecord(data.streak)) {
        p.streak = {
            count: typeof data.streak.count === 'number' && data.streak.count >= 0
                ? Math.floor(data.streak.count)
                : 0,
            lastDay: isDateKey(data.streak.lastDay) ? data.streak.lastDay : null,
        };
    }
    if (isRecord(data.settings)) {
        p.settings = {
            soundOn: typeof data.settings.soundOn === 'boolean'
                ? data.settings.soundOn
                : true,
            speechRate: typeof data.settings.speechRate === 'number' &&
                data.settings.speechRate > 0
                ? data.settings.speechRate
                : 1,
            showPinyin: typeof data.settings.showPinyin === 'boolean'
                ? data.settings.showPinyin
                : true,
        };
    }
    if (isRecord(data.questState) &&
        typeof data.questState.questId === 'string' &&
        typeof data.questState.stepIndex === 'number' &&
        typeof data.questState.done === 'boolean') {
        p.questState = {
            questId: data.questState.questId,
            stepIndex: Math.floor(data.questState.stepIndex),
            done: data.questState.done,
            ...(typeof data.questState.yaw === 'number'
                ? { yaw: data.questState.yaw }
                : {}),
            ...(typeof data.questState.pitch === 'number'
                ? { pitch: data.questState.pitch }
                : {}),
        };
    }
    return p;
}
/**
 * Nạp tiến độ. JSON hỏng hoặc không phải object → progress rỗng
 * kèm `loadError`, KHÔNG throw.
 */
function loadProgress(storage) {
    const raw = storage.getItem(exports.STORAGE_KEY);
    if (raw == null)
        return createEmptyProgress();
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        const p = createEmptyProgress();
        p.loadError =
            'Dữ liệu tiến độ đã lưu bị hỏng (không đọc được JSON); đã khởi tạo tiến độ mới, dữ liệu cũ chưa bị ghi đè.';
        return p;
    }
    if (!isRecord(parsed)) {
        const p = createEmptyProgress();
        p.loadError =
            'Dữ liệu tiến độ đã lưu không đúng định dạng; đã khởi tạo tiến độ mới.';
        return p;
    }
    return migrateProgress(parsed);
}
function exportProgress(p) {
    const { loadError: _loadError, ...rest } = p;
    return JSON.stringify(rest);
}
function saveProgress(storage, p) {
    storage.setItem(exports.STORAGE_KEY, exportProgress(p));
}
/** Xóa dữ liệu đã lưu, trả về progress rỗng. */
function resetProgress(storage) {
    storage.removeItem(exports.STORAGE_KEY);
    return createEmptyProgress();
}
// ---------------------------------------------------------------------------
// Điểm
// ---------------------------------------------------------------------------
/**
 * Điểm cho một câu trả lời ĐÚNG (chỉ gọi khi correct = true):
 * - đúng lần đầu, không gợi ý: 10đ (trừ replay)
 * - đúng có gợi ý: 5đ
 * - đúng sau khi đã sai trong lượt này (firstTry = false): 3đ
 * - replay (quest đã hoàn thành): 2đ
 * Điểm thưởng và mức nhớ là hai dữ liệu khác nhau.
 */
function scoreAnswer(firstTry, usedHint, isReplay) {
    if (isReplay)
        return 2;
    if (usedHint)
        return 5;
    if (!firstTry)
        return 3;
    return 10;
}
function newEventId() {
    return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function emptyReviewState(lexemeId, today) {
    return {
        lexemeId,
        level: 0,
        nextDue: today,
        lastSeen: null,
        correctCount: 0,
        wrongCount: 0,
        lastWrongAt: null,
        lastCorrectAt: null,
    };
}
/**
 * Đảm bảo mốc thời gian mới luôn MỚI HƠN mốc đối diện: hai lần ghi liên
 * tiếp trong cùng một mili-giây cho chuỗi ISO bằng nhau, khi đó
 * getErrorWords (so sánh lastCorrectAt < lastWrongAt) không phân biệt
 * được "sai sau đúng" và từ sai lại không vào sổ lỗi. Cùng mili-giây
 * thì +1ms — chỉ dùng để so thứ tự, không ảnh hưởng ngày/lịch ôn.
 */
function strictlyAfter(now, other) {
    if (other === null || now > other)
        return now;
    return new Date(new Date(other).getTime() + 1).toISOString();
}
/**
 * Chỉ tăng streak khi có hoạt động học có trả lời trong ngày.
 * - cùng ngày: giữ nguyên; hôm qua → +1; khác → reset về 1.
 */
function markActivityDay(p, dayKey) {
    const { count, lastDay } = p.streak;
    if (lastDay === dayKey)
        return p;
    const nextCount = lastDay === addDaysToKey(dayKey, -1) ? count + 1 : 1;
    return { ...p, streak: { count: nextCount, lastDay: dayKey } };
}
/**
 * Ghi một đáp án. Trả Progress MỚI (không mutate input).
 * - Đúng, không gợi ý, lần đầu → level +1 (tối đa 5),
 *   nextDue = hôm nay + khoảng của level mới.
 * - Đúng, có gợi ý → giữ level, nextDue = ngày mai.
 * - Đúng sau khi sai trong lượt → giữ level, nextDue = ngày mai.
 * - Sai → level 0, nextDue = ngày mai, wrongCount +1.
 * Ghi LearningEvent, cộng điểm, đánh dấu đã gặp từ; đáp án đúng
 * thì tính vào streak trong ngày.
 */
function recordAnswer(p, input) {
    const today = todayKey();
    const firstTry = input.firstTry ?? true;
    const isReplay = input.questId
        ? Boolean(p.completedQuests[input.questId])
        : false;
    const points = input.correct
        ? scoreAnswer(firstTry, input.usedHint, isReplay)
        : 0;
    const prev = p.lexemes[input.lexemeId] ?? emptyReviewState(input.lexemeId, today);
    const now = new Date().toISOString();
    let next;
    if (input.correct && !input.usedHint && firstTry) {
        const level = Math.min(MAX_LEVEL, prev.level + 1);
        next = {
            ...prev,
            level,
            nextDue: addDaysToKey(today, exports.REVIEW_INTERVALS_DAYS[level - 1]),
            lastSeen: now,
            correctCount: prev.correctCount + 1,
            lastCorrectAt: strictlyAfter(now, prev.lastWrongAt),
        };
    }
    else if (input.correct) {
        next = {
            ...prev,
            lastSeen: now,
            nextDue: addDaysToKey(today, 1),
            correctCount: prev.correctCount + 1,
            lastCorrectAt: strictlyAfter(now, prev.lastWrongAt),
        };
    }
    else {
        next = {
            ...prev,
            level: 0,
            nextDue: addDaysToKey(today, 1),
            lastSeen: now,
            wrongCount: prev.wrongCount + 1,
            lastWrongAt: strictlyAfter(now, prev.lastCorrectAt),
        };
    }
    const event = {
        id: newEventId(),
        at: new Date().toISOString(),
        lexemeId: input.lexemeId,
        activity: input.activity,
        correct: input.correct,
        usedHint: input.usedHint,
        points,
        ...(input.questId ? { questId: input.questId } : {}),
    };
    let out = {
        ...p,
        lexemes: { ...p.lexemes, [input.lexemeId]: next },
        encountered: p.encountered.includes(input.lexemeId)
            ? p.encountered
            : [...p.encountered, input.lexemeId],
        events: [...p.events, event],
        points: p.points + points,
    };
    if (input.correct)
        out = markActivityDay(out, today);
    return out;
}
/**
 * Ghi một câu trả lời ở VÒNG ÔN LẠI NGAY trong phiên (F2, Bước 4-fix):
 * hỏi lại từ vừa sai ở kiểm tra cuối bằng dạng câu khác, TRƯỚC khi sang
 * màn kết quả. Lượt này KHÔNG cộng điểm, KHÔNG nâng level dài hạn và
 * KHÔNG đổi nextDue (từ sai vẫn level 0, nextDue ngày mai — đúng §8.3);
 * chỉ ghi event (0đ), cập nhật lastSeen/correctCount/wrongCount và
 * lastCorrectAt/lastWrongAt để sổ tay biết lần sai đã được sửa hay chưa.
 * Trả Progress MỚI (không mutate input).
 */
function recordReReview(p, lexemeId, correct) {
    const today = todayKey();
    const prev = p.lexemes[lexemeId] ?? emptyReviewState(lexemeId, today);
    const now = new Date().toISOString();
    const next = correct
        ? {
            ...prev,
            lastSeen: now,
            correctCount: prev.correctCount + 1,
            lastCorrectAt: strictlyAfter(now, prev.lastWrongAt),
        }
        : {
            ...prev,
            lastSeen: now,
            wrongCount: prev.wrongCount + 1,
            lastWrongAt: strictlyAfter(now, prev.lastCorrectAt),
        };
    const event = {
        id: newEventId(),
        at: now,
        lexemeId,
        activity: 'review',
        correct,
        usedHint: false,
        points: 0,
    };
    let out = {
        ...p,
        lexemes: { ...p.lexemes, [lexemeId]: next },
        encountered: p.encountered.includes(lexemeId)
            ? p.encountered
            : [...p.encountered, lexemeId],
        events: [...p.events, event],
    };
    if (correct)
        out = markActivityDay(out, today);
    return out;
}
// ---------------------------------------------------------------------------
// Quest
// ---------------------------------------------------------------------------
/**
 * Ghi hoàn thành quest — idempotent: gọi lần 2 trả awarded=false,
 * không cộng điểm, không thêm badge lần nữa.
 */
function awardQuestCompletion(p, questId, points, badgeId) {
    if (p.completedQuests[questId]) {
        return { progress: p, awarded: false, points: 0 };
    }
    const at = new Date().toISOString();
    let next = {
        ...p,
        completedQuests: {
            ...p.completedQuests,
            [questId]: { at, points },
        },
        points: p.points + points,
        badges: badgeId && !p.badges.includes(badgeId)
            ? [...p.badges, badgeId]
            : p.badges,
        events: [
            ...p.events,
            {
                id: newEventId(),
                at,
                lexemeId: null,
                activity: 'quest',
                correct: true,
                usedHint: false,
                points,
                questId,
            },
        ],
    };
    next = markActivityDay(next, todayKey());
    return { progress: next, awarded: true, points };
}
// ---------------------------------------------------------------------------
// Truy vấn
// ---------------------------------------------------------------------------
/**
 * Các từ đến hạn ôn trong ngày `today` (YYYY-MM-DD):
 * - đã có trạng thái ôn và nextDue <= today, hoặc
 * - đã gặp nhưng chưa từng có trạng thái ôn (level 0 chưa xếp lịch).
 * Từ vừa sai có nextDue = ngày mai nên chưa đến hạn trong hôm nay.
 */
function getDueWords(p, today) {
    const ids = new Set([...p.encountered, ...Object.keys(p.lexemes)]);
    return Array.from(ids).filter((id) => {
        const st = p.lexemes[id];
        if (!st)
            return true;
        return st.nextDue <= today;
    });
}
/**
 * Các từ sai trong ngày `today` (theo giờ Asia/Ho_Chi_Minh) mà CHƯA được
 * sửa đúng sau đó: lần sai gần nhất trong ngày không có câu trả lời ĐÚNG
 * CÓ TÍNH ĐIỂM nào sau nó (F2). Phân biệt hai trường hợp:
 * - sai rồi sửa đúng ngay trong câu (đúng có điểm, vd 3đ) → đã sửa, không
 *   còn "cần ôn" vì lần sai đó;
 * - sai ở kiểm tra cuối (mỗi câu chỉ trả lời một lần) → dù vòng ôn lại
 *   ngay sau đó trả lời đúng thì lượt ôn lại là 0đ, không đổi level/
 *   nextDue (recordReReview), nên từ vẫn tính là sai trong phiên và vẫn
 *   cần ôn lại vào ngày mai.
 * Dùng để tab "Cần ôn" và màn kết quả thấy được từ vừa sai trong phiên
 * dù nextDue của nó là ngày mai.
 */
function getSessionWrongIds(p, today) {
    // Chỉ số event sai CUỐI CÙNG trong ngày của từng từ (thứ tự mảng =
    // thứ tự thời gian, chắc hơn so sánh timestamp mili-giây).
    const lastWrongIdx = {};
    p.events.forEach((e, i) => {
        if (!e.lexemeId || e.correct)
            return;
        if (todayKey(new Date(e.at)) !== today)
            return;
        lastWrongIdx[e.lexemeId] = i;
    });
    return Object.keys(lastWrongIdx).filter((id) => {
        const wIdx = lastWrongIdx[id];
        // Đã sửa đúng bằng câu trả lời có tính điểm sau lần sai đó chưa?
        const fixed = p.events.some((e, i) => i > wIdx && e.lexemeId === id && e.correct && e.points > 0);
        return !fixed;
    });
}
/**
 * Từ cần ôn hiển thị trong sổ tay (F2c): từ đến hạn (getDueWords) CỘNG
 * từ sai trong phiên/ngày hôm nay (dù nextDue là ngày mai).
 */
function getDueWordsIncludingTodayWrong(p, today) {
    const ids = new Set([
        ...getDueWords(p, today),
        ...getSessionWrongIds(p, today),
    ]);
    return Array.from(ids);
}
/**
 * Lịch ôn 7 ngày tới (mặc định daysAhead = 7): nhóm các từ đã gặp theo
 * nextDue — quá hạn gộp một nhóm, hôm nay một nhóm, rồi từng ngày sau.
 * Từ chưa có trạng thái ôn (mới gặp) tính là đến hạn hôm nay. Từ đến hạn
 * sau cửa sổ 7 ngày trả riêng ở laterIds (không mất khỏi lịch, chỉ chưa
 * tới lượt hiện).
 */
function getReviewCalendar(p, today, daysAhead = 7) {
    const overdue = [];
    const laterIds = [];
    const byDay = new Map();
    const lastDay = addDaysToKey(today, daysAhead);
    const ids = new Set([...p.encountered, ...Object.keys(p.lexemes)]);
    for (const id of Array.from(ids)) {
        const st = p.lexemes[id];
        const due = st?.nextDue ?? today;
        if (due < today) {
            overdue.push(id);
        }
        else if (due > lastDay) {
            laterIds.push(id);
        }
        else {
            const list = byDay.get(due) ?? [];
            list.push(id);
            byDay.set(due, list);
        }
    }
    const days = [];
    if (overdue.length > 0) {
        // Số ngày quá hạn = từ quá hạn lâu nhất (nextDue nhỏ nhất).
        const oldest = overdue.map((id) => p.lexemes[id]?.nextDue ?? today).sort()[0];
        const overdueDays = Math.max(1, Math.round((Date.parse(today) - Date.parse(oldest)) / 86400000));
        days.push({ dayKey: '', overdue: true, overdueDays, lexemeIds: overdue });
    }
    for (let i = 0; i <= daysAhead; i++) {
        const key = addDaysToKey(today, i);
        days.push({ dayKey: key, overdue: false, overdueDays: 0, lexemeIds: byDay.get(key) ?? [] });
    }
    return { days, laterIds };
}
/**
 * Sổ lỗi: các từ đã sai mà CHƯA được sửa đúng sau đó (lastWrongAt mới
 * hơn lastCorrectAt) — từ đã sửa đúng (kể cả ở vòng ôn lại 0đ) thì rời
 * khỏi sổ. Khác tab "Cần ôn": ở đó vòng ôn lại 0đ KHÔNG xóa trạng thái
 * "cần ôn ngày mai" (F2 — lịch SRS không đổi); sổ lỗi chỉ ghi nhận lần
 * sai đã được sửa hay chưa. Nhóm theo bài ở UI (qua lexeme.lessonId).
 * Vòng ôn lại riêng dùng recordReReview (0đ, không đổi level/nextDue).
 */
function getErrorWords(p) {
    return Object.values(p.lexemes)
        .filter((st) => st.wrongCount > 0 &&
        st.lastWrongAt !== null &&
        (st.lastCorrectAt === null || st.lastCorrectAt < st.lastWrongAt))
        .map((st) => ({
        lexemeId: st.lexemeId,
        wrongCount: st.wrongCount,
        lastWrongAt: st.lastWrongAt,
    }))
        .sort((a, b) => (b.lastWrongAt ?? '').localeCompare(a.lastWrongAt ?? ''));
}
/**
 * "Đã nhớ tương đối vững" (F3): level >= 3 VÀ không còn lần sai chưa
 * được sửa đúng sau đó (lastWrongAt == null, hoặc lần đúng gần nhất
 * xảy ra sau lần sai gần nhất). Từ vừa sai có level 0 nên đã bị loại
 * ngay từ điều kiện level; điều kiện lastCorrectAt chặn thêm trường hợp
 * từ từng sai mà chưa có câu đúng nào sau lần sai đó.
 */
function isWellKnownState(st) {
    if (!st)
        return false;
    if (st.level < 3)
        return false;
    if (!st.lastWrongAt)
        return true;
    if (!st.lastCorrectAt)
        return false;
    return st.lastCorrectAt > st.lastWrongAt;
}
function getWordState(p, lexemeId) {
    return p.lexemes[lexemeId];
}
/** Gặp ≠ thuộc: chỉ thêm vào encountered, không tạo trạng thái nhớ. */
function markEncountered(p, lexemeId) {
    if (p.encountered.includes(lexemeId))
        return p;
    return { ...p, encountered: [...p.encountered, lexemeId] };
}
/**
 * Nhập tiến độ từ JSON. Validate kỹ, KHÔNG throw, KHÔNG ghi đè dữ liệu hiện tại
 * (hàm này chỉ trả kết quả; việc lưu là quyết định của caller).
 * - JSON hỏng / không phải object / sai kiểu trường → ok=false + error rõ ràng.
 * - id từ lạ (không nằm trong 1057 id đã biết) → bị loại bỏ, ok=true kèm warnings.
 */
function importProgress(json) {
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch {
        return { ok: false, error: 'File nhập không phải JSON hợp lệ.' };
    }
    if (!isRecord(parsed)) {
        return { ok: false, error: 'Dữ liệu nhập phải là một object tiến độ.' };
    }
    if (typeof parsed.version !== 'number') {
        return { ok: false, error: 'Thiếu trường version (phải là số).' };
    }
    const warnings = [];
    const known = new Set(KNOWN_LEXEME_IDS);
    const p = createEmptyProgress();
    const fail = (msg) => ({ ok: false, error: msg });
    // lexemes
    if (parsed.lexemes !== undefined) {
        if (!isRecord(parsed.lexemes))
            return fail('Trường lexemes phải là object.');
        for (const [id, raw] of Object.entries(parsed.lexemes)) {
            if (!known.has(id)) {
                warnings.push(`Bỏ qua từ lạ chưa biết: ${id}.`);
                continue;
            }
            if (!isRecord(raw))
                return fail(`Trạng thái của từ ${id} phải là object.`);
            if (typeof raw.lexemeId !== 'string' || raw.lexemeId !== id) {
                return fail(`Trường lexemeId của từ ${id} không khớp id.`);
            }
            if (typeof raw.level !== 'number' ||
                !Number.isInteger(raw.level) ||
                raw.level < 0 ||
                raw.level > MAX_LEVEL) {
                return fail(`Trường level của từ ${id} phải là số nguyên 0..5.`);
            }
            if (!isDateKey(raw.nextDue)) {
                return fail(`Trường nextDue của từ ${id} phải là ngày YYYY-MM-DD.`);
            }
            if (raw.lastSeen !== null && typeof raw.lastSeen !== 'string') {
                return fail(`Trường lastSeen của từ ${id} phải là chuỗi hoặc null.`);
            }
            if (typeof raw.correctCount !== 'number' ||
                !Number.isInteger(raw.correctCount) ||
                raw.correctCount < 0 ||
                typeof raw.wrongCount !== 'number' ||
                !Number.isInteger(raw.wrongCount) ||
                raw.wrongCount < 0) {
                return fail(`Trường correctCount/wrongCount của từ ${id} phải là số nguyên >= 0.`);
            }
            if (raw.lastWrongAt !== null && typeof raw.lastWrongAt !== 'string') {
                return fail(`Trường lastWrongAt của từ ${id} phải là chuỗi hoặc null.`);
            }
            if (raw.lastCorrectAt !== undefined && raw.lastCorrectAt !== null && typeof raw.lastCorrectAt !== 'string') {
                return fail(`Trường lastCorrectAt của từ ${id} phải là chuỗi hoặc null.`);
            }
            // Các trường đã được validate ngay phía trên; ép kiểu rõ ràng để
            // cả tsc --noEmit (project) lẫn tsc lẻ (test build) đều chấp nhận.
            p.lexemes[id] = {
                lexemeId: id,
                level: raw.level,
                nextDue: raw.nextDue,
                lastSeen: raw.lastSeen,
                correctCount: raw.correctCount,
                wrongCount: raw.wrongCount,
                lastWrongAt: raw.lastWrongAt,
                lastCorrectAt: typeof raw.lastCorrectAt === 'string' ? raw.lastCorrectAt : null,
            };
        }
    }
    // encountered
    if (parsed.encountered !== undefined) {
        if (!Array.isArray(parsed.encountered) ||
            parsed.encountered.some((x) => typeof x !== 'string')) {
            return fail('Trường encountered phải là mảng chuỗi.');
        }
        for (const id of parsed.encountered) {
            if (!known.has(id)) {
                warnings.push(`Bỏ qua từ lạ trong encountered: ${id}.`);
                continue;
            }
            if (!p.encountered.includes(id))
                p.encountered.push(id);
        }
    }
    // events
    if (parsed.events !== undefined) {
        if (!Array.isArray(parsed.events))
            return fail('Trường events phải là mảng.');
        for (const e of parsed.events) {
            if (!isRecord(e) ||
                typeof e.id !== 'string' ||
                typeof e.at !== 'string' ||
                (e.lexemeId !== null && typeof e.lexemeId !== 'string') ||
                typeof e.activity !== 'string' ||
                typeof e.correct !== 'boolean' ||
                typeof e.usedHint !== 'boolean' ||
                typeof e.points !== 'number') {
                return fail('Một mục trong events sai định dạng.');
            }
            p.events.push(e);
        }
    }
    // points / badges
    if (parsed.points !== undefined) {
        if (typeof parsed.points !== 'number' || parsed.points < 0) {
            return fail('Trường points phải là số >= 0.');
        }
        p.points = Math.floor(parsed.points);
    }
    if (parsed.badges !== undefined) {
        if (!Array.isArray(parsed.badges) ||
            parsed.badges.some((x) => typeof x !== 'string')) {
            return fail('Trường badges phải là mảng chuỗi.');
        }
        p.badges = [...parsed.badges];
    }
    // completedQuests
    if (parsed.completedQuests !== undefined) {
        if (!isRecord(parsed.completedQuests)) {
            return fail('Trường completedQuests phải là object.');
        }
        for (const [qid, raw] of Object.entries(parsed.completedQuests)) {
            if (!isRecord(raw) ||
                typeof raw.at !== 'string' ||
                typeof raw.points !== 'number') {
                return fail(`Mục completedQuests.${qid} phải có at (chuỗi) và points (số).`);
            }
            p.completedQuests[qid] = { at: raw.at, points: raw.points };
        }
    }
    // streak
    if (parsed.streak !== undefined) {
        if (!isRecord(parsed.streak) ||
            typeof parsed.streak.count !== 'number' ||
            !Number.isInteger(parsed.streak.count) ||
            parsed.streak.count < 0 ||
            (parsed.streak.lastDay !== null && !isDateKey(parsed.streak.lastDay))) {
            return fail('Trường streak phải có count (số nguyên >= 0) và lastDay (ngày hoặc null).');
        }
        p.streak = {
            count: parsed.streak.count,
            lastDay: parsed.streak.lastDay,
        };
    }
    // settings
    if (parsed.settings !== undefined) {
        if (!isRecord(parsed.settings) ||
            typeof parsed.settings.soundOn !== 'boolean' ||
            typeof parsed.settings.speechRate !== 'number' ||
            typeof parsed.settings.showPinyin !== 'boolean') {
            return fail('Trường settings sai định dạng.');
        }
        p.settings = {
            soundOn: parsed.settings.soundOn,
            speechRate: parsed.settings.speechRate,
            showPinyin: parsed.settings.showPinyin,
        };
    }
    // questState
    if (parsed.questState !== undefined && parsed.questState !== null) {
        if (!isRecord(parsed.questState) ||
            typeof parsed.questState.questId !== 'string' ||
            typeof parsed.questState.stepIndex !== 'number' ||
            typeof parsed.questState.done !== 'boolean' ||
            (parsed.questState.yaw !== undefined && typeof parsed.questState.yaw !== 'number') ||
            (parsed.questState.pitch !== undefined && typeof parsed.questState.pitch !== 'number')) {
            return fail('Trường questState sai định dạng.');
        }
        p.questState = {
            questId: parsed.questState.questId,
            stepIndex: Math.floor(parsed.questState.stepIndex),
            done: parsed.questState.done,
            ...(typeof parsed.questState.yaw === 'number'
                ? { yaw: parsed.questState.yaw }
                : {}),
            ...(typeof parsed.questState.pitch === 'number'
                ? { pitch: parsed.questState.pitch }
                : {}),
        };
    }
    return { ok: true, progress: p, warnings };
}
