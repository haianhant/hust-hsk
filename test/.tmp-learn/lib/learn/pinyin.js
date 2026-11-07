"use strict";
/**
 * Chuẩn hóa + chấm pinyin và chữ Hán. Logic thuần, không phụ thuộc DOM.
 *
 * Quy ước ánh xạ ü (định nghĩa rõ, theo brief §6.3):
 * - 'v' và 'u:' đều là cách gõ thay cho 'ü' → chuẩn hóa thành 'ü'.
 * - 'ü' giữ nguyên 'ü'.
 * - Không tự thêm dấu thanh: đầu vào không dấu vẫn là không dấu
 *   (vd 'nv' → 'nü', KHÔNG thành 'nǚ').
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePinyin = normalizePinyin;
exports.stripPinyinTones = stripPinyinTones;
exports.syllabifyPinyin = syllabifyPinyin;
exports.pinyinToNumbered = pinyinToNumbered;
exports.checkPinyin = checkPinyin;
exports.normalizeHanzi = normalizeHanzi;
exports.checkHanzi = checkHanzi;
// ---------------------------------------------------------------------------
// Bảng dấu thanh
// ---------------------------------------------------------------------------
/** base vowel -> [thanh 1, 2, 3, 4]. */
const TONE_MARKS = {
    a: ['ā', 'á', 'ǎ', 'à'],
    e: ['ē', 'é', 'ě', 'è'],
    i: ['ī', 'í', 'ǐ', 'ì'],
    o: ['ō', 'ó', 'ǒ', 'ò'],
    u: ['ū', 'ú', 'ǔ', 'ù'],
    ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};
const BASE_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ü']);
/** ký tự có dấu -> { base, tone }. */
const TONED_TO_BASE = new Map();
for (const [base, marks] of Object.entries(TONE_MARKS)) {
    marks.forEach((ch, i) => TONED_TO_BASE.set(ch, { base, tone: i + 1 }));
}
function tonedChar(base, tone) {
    return TONE_MARKS[base]?.[tone - 1] ?? base;
}
// ---------------------------------------------------------------------------
// Chuẩn hóa
// ---------------------------------------------------------------------------
/**
 * Chuẩn hóa pinyin: NFC, lowercase, bỏ toàn bộ khoảng trắng,
 * ánh xạ 'u:' và 'v' → 'ü'. Giữ nguyên dấu thanh và chữ số thanh (nếu có).
 */
function normalizePinyin(s) {
    return s
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/u:/g, 'ü')
        .replace(/v/g, 'ü');
}
/** Bỏ dấu thanh (và chữ số thanh) khỏi pinyin đã chuẩn hóa, chỉ giữ chữ cái gốc. */
function stripPinyinTones(s) {
    const norm = normalizePinyin(s).replace(/[1-5]/g, '');
    let out = '';
    for (const ch of norm.split('')) {
        out += TONED_TO_BASE.get(ch)?.base ?? ch;
    }
    return out;
}
// ---------------------------------------------------------------------------
// Tách âm tiết (maximal munch trên bảng âm tiết pinyin hợp lệ)
// ---------------------------------------------------------------------------
/** Bảng âm tiết pinyin hợp lệ (không dấu), dùng để tách chuỗi pinyin liền. */
const VALID_SYLLABLES = new Set([
    // Không phụ âm đầu / y- / w-
    'a', 'ai', 'an', 'ang', 'ao', 'e', 'ei', 'en', 'eng', 'er', 'o', 'ou',
    'ya', 'yao', 'ye', 'yi', 'yin', 'ying', 'yo', 'you', 'yan', 'yang', 'yun',
    'yue', 'yuan', 'yong', 'yu',
    'wa', 'wo', 'wai', 'wei', 'wan', 'wen', 'wang', 'weng', 'wu',
    // b p m f
    'ba', 'bai', 'ban', 'bang', 'bao', 'bei', 'ben', 'beng', 'bi', 'bie', 'biao',
    'bian', 'bin', 'bing', 'bo', 'bu',
    'pa', 'pai', 'pan', 'pang', 'pao', 'pei', 'pen', 'peng', 'pi', 'pie', 'piao',
    'pian', 'pin', 'ping', 'po', 'pu',
    'ma', 'mai', 'man', 'mang', 'mao', 'mei', 'men', 'meng', 'mi', 'mie', 'miao',
    'mian', 'min', 'ming', 'mo', 'mu',
    'fa', 'fan', 'fang', 'fei', 'fen', 'feng', 'fo', 'fou', 'fu',
    // d t n l
    'da', 'dai', 'dan', 'dang', 'dao', 'de', 'dei', 'den', 'deng', 'di', 'die',
    'diao', 'dian', 'ding', 'diu', 'dong', 'dou', 'du', 'duan', 'dui', 'dun', 'duo',
    'ta', 'tai', 'tan', 'tang', 'tao', 'te', 'teng', 'ti', 'tie', 'tiao', 'tian',
    'ting', 'tong', 'tou', 'tu', 'tuan', 'tui', 'tun', 'tuo',
    'na', 'nai', 'nan', 'nang', 'nao', 'ne', 'nei', 'nen', 'neng', 'ni', 'nie',
    'niao', 'nian', 'nin', 'ning', 'niu', 'nong', 'nu', 'nuan', 'nuo', 'nü', 'nüe',
    'la', 'lai', 'lan', 'lang', 'lao', 'le', 'lei', 'leng', 'li', 'lia', 'liao',
    'lie', 'lian', 'lin', 'ling', 'liu', 'long', 'lou', 'lu', 'luan', 'lun', 'luo',
    'lü', 'lüe',
    // g k h
    'ga', 'gai', 'gan', 'gang', 'gao', 'ge', 'gei', 'gen', 'geng', 'gong', 'gou',
    'gu', 'gua', 'guai', 'guan', 'guang', 'gui', 'gun', 'guo',
    'ka', 'kai', 'kan', 'kang', 'kao', 'ke', 'ken', 'keng', 'kong', 'kou', 'ku',
    'kua', 'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo',
    'ha', 'hai', 'han', 'hang', 'hao', 'he', 'hei', 'hen', 'heng', 'hong', 'hou',
    'hu', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo',
    // j q x
    'ji', 'jia', 'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiu', 'ju',
    'juan', 'jue', 'jun',
    'qi', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin', 'qing', 'qiu', 'qu',
    'quan', 'que', 'qun',
    'xi', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiu', 'xu',
    'xuan', 'xue', 'xun',
    // zh ch sh r
    'zha', 'zhai', 'zhan', 'zhang', 'zhao', 'zhe', 'zhei', 'zhen', 'zheng', 'zhi',
    'zhou', 'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhui', 'zhun', 'zhuo',
    'cha', 'chai', 'chan', 'chang', 'chao', 'che', 'chen', 'cheng', 'chi', 'chou',
    'chu', 'chua', 'chuai', 'chuan', 'chuang', 'chui', 'chun', 'chuo',
    'sha', 'shai', 'shan', 'shang', 'shao', 'she', 'shei', 'shen', 'sheng', 'shi',
    'shou', 'shu', 'shua', 'shuai', 'shuan', 'shuang', 'shui', 'shun', 'shuo',
    're', 'ren', 'reng', 'ri', 'rong', 'rou', 'ru', 'ruan', 'rui', 'run', 'ruo',
    // z c s
    'za', 'zai', 'zan', 'zang', 'zao', 'ze', 'zei', 'zen', 'zeng', 'zi', 'zong',
    'zou', 'zu', 'zuan', 'zui', 'zun', 'zuo',
    'ca', 'cai', 'can', 'cang', 'cao', 'ce', 'cen', 'ceng', 'ci', 'cong', 'cou',
    'cu', 'cuan', 'cui', 'cun', 'cuo',
    'sa', 'sai', 'san', 'sang', 'sao', 'se', 'sen', 'seng', 'si', 'song', 'sou',
    'su', 'suan', 'sui', 'sun', 'suo',
]);
/**
 * Đổi chữ số thanh (1-5) trong chuỗi thành dấu thanh trên nguyên âm đúng vị trí.
 * Quy tắc đặt dấu: có 'a' → đánh vào 'a'; không có 'a' mà có 'e' → 'e';
 * không có 'a'/'e' mà có 'ou' → 'o'; còn lại đánh vào nguyên âm cuối cùng
 * của cụm nguyên âm (vd 'liu2' → 'liú', 'gui4' → 'guì').
 */
function digitsToToneMarks(s) {
    const chars = s.split('');
    const out = [];
    for (const ch of chars) {
        if (ch >= '1' && ch <= '5') {
            const tone = Number(ch);
            if (tone === 5)
                continue; // thanh nhẹ: không dấu
            // Tìm cụm nguyên âm ngay trước chữ số trong `out`.
            let start = out.length;
            while (start > 0 && BASE_VOWELS.has(out[start - 1]))
                start--;
            const cluster = out.slice(start);
            let idx = cluster.indexOf('a');
            if (idx < 0)
                idx = cluster.indexOf('e');
            if (idx < 0)
                idx = cluster.indexOf('o');
            if (idx < 0)
                idx = cluster.length - 1;
            if (idx >= 0) {
                const base = cluster[idx];
                out[start + idx] = tonedChar(base, tone);
            }
            continue;
        }
        out.push(ch);
    }
    return out.join('');
}
/** Tách pinyin đã chuẩn hóa thành các âm tiết { base, tone }. */
function syllabifyPinyin(s) {
    const withMarks = digitsToToneMarks(normalizePinyin(s));
    // Song song: chuỗi chữ cái gốc + thanh điệu của từng ký tự.
    const bases = [];
    const tones = [];
    for (const ch of withMarks.split('')) {
        const hit = TONED_TO_BASE.get(ch);
        if (hit) {
            bases.push(hit.base);
            tones.push(hit.tone);
        }
        else {
            bases.push(ch);
            tones.push(0);
        }
    }
    const baseStr = bases.join('');
    const result = [];
    let i = 0;
    while (i < baseStr.length) {
        let matched = '';
        for (let len = Math.min(6, baseStr.length - i); len >= 1; len--) {
            const cand = baseStr.slice(i, i + len);
            if (VALID_SYLLABLES.has(cand)) {
                matched = cand;
                break;
            }
        }
        if (!matched)
            matched = baseStr[i]; // ký tự lạ: nuốt 1 ký tự, không vỡ
        let tone = 5;
        for (let k = i; k < i + matched.length; k++) {
            if (tones[k] > 0) {
                tone = tones[k];
                break;
            }
        }
        result.push({ base: matched, tone });
        i += matched.length;
    }
    return result;
}
/**
 * Đổi dấu thanh thành số: 'shùxué' → 'shu4xue2', 'rènzhēn' → 'ren4zhen1'.
 * Âm tiết không dấu → số 5 (thanh nhẹ / chưa ghi dấu).
 */
function pinyinToNumbered(s) {
    return syllabifyPinyin(s)
        .map((syl) => `${syl.base}${syl.tone}`)
        .join('');
}
/**
 * Chấm pinyin.
 * - mode 'tone': so sánh sau khi đổi cả hai về dạng số; PHẢI khớp số thanh.
 *   Input bỏ dấu khi đáp án có dấu → SAI. Chấp nhận cả dạng nhập số thanh
 *   (vd 'shu4xue2') và dạng dấu (vd 'shùxué'), không phân biệt hoa/thường.
 * - mode 'toneless': chỉ so sánh chữ cái gốc bỏ dấu (dùng khi câu hỏi
 *   không kiểm tra thanh điệu).
 */
function checkPinyin(input, expected, mode) {
    if (mode === 'toneless') {
        const a = stripPinyinTones(input);
        const b = stripPinyinTones(expected);
        if (a === b)
            return { ok: true, detail: `Khớp (không kiểm tra thanh điệu): "${a}".` };
        const pos = firstDiffIndex(a, b);
        return {
            ok: false,
            detail: `Sai chữ ở vị trí ${pos + 1}: nhập "${a[pos] ?? '(hết)'}" nhưng đáp án là ` +
                `"${b[pos] ?? '(hết)'}".`,
        };
    }
    const a = syllabifyPinyin(input);
    const b = syllabifyPinyin(expected);
    if (a.length !== b.length) {
        return {
            ok: false,
            detail: `Số âm tiết khác nhau: nhập ${a.length} âm tiết ` +
                `(${a.map((s) => s.base).join(' ')}), đáp án ${b.length} âm tiết ` +
                `(${b.map((s) => s.base).join(' ')}).`,
        };
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i].base !== b[i].base) {
            return {
                ok: false,
                detail: `Sai chữ ở âm tiết ${i + 1}: nhập "${a[i].base}" nhưng đáp án là "${b[i].base}".`,
            };
        }
        if (a[i].tone !== b[i].tone) {
            const got = a[i].tone === 5 ? 'không dấu' : `thanh ${a[i].tone}`;
            return {
                ok: false,
                detail: `Sai thanh điệu ở âm tiết ${i + 1} ("${b[i].base}"): ` +
                    `bạn nhập ${got}, đáp án là thanh ${b[i].tone}.`,
            };
        }
    }
    return { ok: true, detail: `Khớp, kể cả thanh điệu: "${pinyinToNumbered(expected)}".` };
}
function firstDiffIndex(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
        if (a[i] !== b[i])
            return i;
    }
    return n;
}
// ---------------------------------------------------------------------------
// Chữ Hán
// ---------------------------------------------------------------------------
/** Dấu câu được bỏ qua khi chấm chữ Hán (ASCII + toàn giác). */
const HANZI_PUNCT = new Set();
for (const ch of '.,;:?!\'"()[]{}<>\\/|@#$%^&*+=~`_-'.split(''))
    HANZI_PUNCT.add(ch);
for (const ch of '。，、；：？！·…—「」『』（）《》〈〉“”‘’　'.split(''))
    HANZI_PUNCT.add(ch);
/**
 * Chuẩn hóa chữ Hán: NFC, bỏ khoảng trắng và dấu câu.
 * KHÔNG bỏ qua từ sai, KHÔNG đổi trật tự.
 */
function normalizeHanzi(s) {
    let out = '';
    for (const ch of s.normalize('NFC').split('')) {
        if (/\s/.test(ch) || HANZI_PUNCT.has(ch))
            continue;
        out += ch;
    }
    return out;
}
/**
 * Chấm chữ Hán: chỉ cho phép khác biệt khoảng trắng/dấu câu.
 * Từ sai hay đổi trật tự đều tính sai.
 */
function checkHanzi(input, expected) {
    const a = normalizeHanzi(input);
    const b = normalizeHanzi(expected);
    if (a === b)
        return { ok: true, detail: 'Khớp chữ Hán.' };
    if (a.length !== b.length) {
        return {
            ok: false,
            detail: `Độ dài khác nhau sau khi bỏ dấu câu: nhập ${a.length} chữ, đáp án ${b.length} chữ.`,
        };
    }
    const pos = firstDiffIndex(a, b);
    return {
        ok: false,
        detail: `Sai chữ Hán ở vị trí ${pos + 1}: nhập "${a[pos]}" nhưng đáp án là "${b[pos]}".`,
    };
}
