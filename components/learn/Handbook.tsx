// ---------------------------------------------------------------------------
// Handbook.tsx — Sổ tay từ vựng (Bước 5).
// Tab: theo bài / đã gặp / cần ôn / đã nhớ vững / tìm kiếm (chữ Hán, pinyin,
// nghĩa). Mỗi từ: chữ Hán, pinyin bật/tắt, nghĩa, phát âm, ví dụ (nếu có
// trong content), lịch sử sai ngắn (từ events). Ghi rõ "Tiến độ lưu trên
// thiết bị này" + nút Xuất/Nhập JSON bản sao.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import type { Lexeme, Progress } from '../../lib/learn/types';
import { ALL_HSK3_EXAMPLES, HSK3_LESSONS } from '../../content/hsk3-index';
import { ALL_HSK4_EXAMPLES, HSK4_LESSONS } from '../../content/hsk4-index';
import {
  addDaysToKey,
  exportProgress,
  getDueWordsIncludingTodayWrong,
  getErrorWords,
  getReviewCalendar,
  importProgress,
  isWellKnownState,
  todayKey,
} from '../../lib/learn/store';
import { getGlobalBadgeStates } from '../../lib/learn/badges';
import { getQuestDef } from '../../lib/learn/quest-data';

type Tab = 'lesson' | 'encountered' | 'due' | 'known' | 'search' | 'calendar' | 'errors' | 'badges';

export interface HandbookProps {
  progress: Progress;
  lexemes: Lexeme[];
  /** Toàn bộ từ HSK 3 + HSK 4 (dùng cho Lịch ôn / Sổ lỗi, vốn vượt khỏi 1 bài). */
  allLexemes?: Lexeme[];
  onSpeak: (text: string) => void;
  soundOn: boolean;
  onImport: (p: Progress) => void;
  onClose: () => void;
  defaultTab?: Tab;
  /** Mở phiên ôn nhanh (ReviewSession) với các từ đã chọn. */
  onStartReview?: (ids: string[], mode: 'review' | 'error', title: string) => void;
}

export default function Handbook({ progress, lexemes, allLexemes, onSpeak, soundOn, onImport, onClose, defaultTab = 'lesson', onStartReview }: HandbookProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [query, setQuery] = useState('');
  const [showPinyin, setShowPinyin] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState(false);

  const lexemeById = useMemo(() => {
    const m: Record<string, Lexeme> = {};
    for (const l of lexemes) m[l.id] = l;
    return m;
  }, [lexemes]);

  // Toàn bộ từ (mặc định = từ của bài đang học khi caller không truyền).
  const allLexemesResolved = useMemo(
    () => (allLexemes && allLexemes.length > 0 ? allLexemes : lexemes),
    [allLexemes, lexemes],
  );
  const allById = useMemo(() => {
    const m: Record<string, Lexeme> = {};
    for (const l of allLexemesResolved) m[l.id] = l;
    return m;
  }, [allLexemesResolved]);
  const lessonTitleById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const l of [...HSK3_LESSONS, ...HSK4_LESSONS]) m[l.id] = `Bài ${l.number} — ${l.title}`;
    return m;
  }, []);

  // Bước 8 — Lịch ôn SRS (7 ngày tới) + Sổ lỗi + Huy hiệu toàn cục.
  const calendar = useMemo(() => {
    try {
      return getReviewCalendar(progress, todayKey());
    } catch {
      return { days: [], laterIds: [] as string[] };
    }
  }, [progress]);
  const errorWords = useMemo(() => {
    try {
      return getErrorWords(progress);
    } catch {
      return [];
    }
  }, [progress]);
  // Sổ lỗi nhóm theo bài (giữ thứ tự bài HSK 3 → HSK 4).
  const errorsByLesson = useMemo(() => {
    const order: Record<string, number> = {};
    [...HSK3_LESSONS, ...HSK4_LESSONS].forEach((l, i) => {
      order[l.id] = i;
    });
    const groups = new Map<string, typeof errorWords>();
    for (const w of errorWords) {
      const lessonId = allById[w.lexemeId]?.lessonId ?? 'unknown';
      const list = groups.get(lessonId) ?? [];
      list.push(w);
      groups.set(lessonId, list);
    }
    return Array.from(groups.entries()).sort(
      (a, b) => (order[a[0]] ?? 999) - (order[b[0]] ?? 999),
    );
  }, [errorWords, allById]);
  const badgeStates = useMemo(() => getGlobalBadgeStates(progress), [progress]);
  const earnedBadgeCount = badgeStates.filter((b) => b.earned).length;

  const encounteredIds: string[] = useMemo(() => {
    const e = (progress as unknown as { encountered?: unknown }).encountered;
    if (Array.isArray(e)) return e as string[];
    if (e && typeof e === 'object') return Object.keys(e as Record<string, unknown>);
    return [];
  }, [progress]);

  // F2c — "Cần ôn" gồm từ đến hạn CỘNG từ sai trong phiên/ngày hôm nay
  // (từ vừa sai có nextDue ngày mai nên getDueWords thuần không thấy).
  const dueIds = useMemo(() => {
    try {
      return getDueWordsIncludingTodayWrong(progress, todayKey());
    } catch {
      return [] as string[];
    }
  }, [progress]);

  const dueSet = useMemo(() => new Set(dueIds), [dueIds]);
  const encounteredSet = useMemo(() => new Set(encounteredIds), [encounteredIds]);
  // F3 — "Đã nhớ vững" chỉ khi level >= 3 VÀ không còn lần sai chưa sửa
  // (xem isWellKnownState): từ vừa sai (level 0) không còn lọt vào đây.
  const knownIds = useMemo(
    () => encounteredIds.filter((id) => isWellKnownState(progress.lexemes[id])),
    [encounteredIds, progress],
  );

  const wrongCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const events = (progress as unknown as { events?: Array<{ lexemeId?: string; correct?: boolean }> }).events;
    if (Array.isArray(events)) {
      for (const ev of events) {
        if (ev && ev.lexemeId && ev.correct === false) counts[ev.lexemeId] = (counts[ev.lexemeId] ?? 0) + 1;
      }
    }
    return counts;
  }, [progress]);

  const examplesByLexeme = useMemo(() => {
    const m: Record<string, { hanzi: string; pinyin?: string; meaning?: string }> = {};
    // Ví dụ tự soạn HSK 3 + HSK 4 (trước đây chỉ có HSK 3 nên từ HSK 4
    // trong sổ tay không hiện ví dụ).
    const list = [...ALL_HSK3_EXAMPLES, ...ALL_HSK4_EXAMPLES] as unknown as Array<{ lexemeId?: string; hanzi?: string; pinyin?: string; meaning?: string }>;
    if (Array.isArray(list)) {
      for (const ex of list) {
        if (ex && ex.lexemeId && ex.hanzi && !m[ex.lexemeId]) {
          m[ex.lexemeId] = { hanzi: ex.hanzi, pinyin: ex.pinyin, meaning: ex.meaning };
        }
      }
    }
    return m;
  }, []);

  const visible: Lexeme[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchQuery = (l: Lexeme) =>
      !q || l.hanzi.includes(query.trim()) || l.pinyin.toLowerCase().includes(q) || l.meaning.toLowerCase().includes(q);
    switch (tab) {
      case 'encountered':
        return lexemes.filter((l) => encounteredSet.has(l.id) && matchQuery(l));
      case 'due':
        return lexemes.filter((l) => dueSet.has(l.id) && matchQuery(l));
      case 'known':
        return lexemes.filter((l) => knownIds.includes(l.id) && matchQuery(l));
      case 'search':
        return q ? lexemes.filter(matchQuery) : lexemes;
      case 'lesson':
      default:
        return lexemes.filter(matchQuery);
    }
  }, [tab, lexemes, encounteredSet, dueSet, knownIds, query]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'lesson', label: 'Theo bài', count: lexemes.length },
    { id: 'encountered', label: 'Đã gặp', count: encounteredIds.length },
    { id: 'due', label: 'Cần ôn', count: dueIds.length },
    { id: 'known', label: 'Đã nhớ vững', count: knownIds.length },
    { id: 'search', label: 'Tìm kiếm' },
    { id: 'calendar', label: 'Lịch ôn', count: dueIds.length },
    { id: 'errors', label: 'Sổ lỗi', count: errorWords.length },
    { id: 'badges', label: 'Huy hiệu', count: earnedBadgeCount },
  ];

  const doExport = () => {
    try {
      const json = exportProgress(progress);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bkhn-tien-do.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setImportError('Không xuất được bản sao tiến độ.');
    }
  };

  const doImport = async (file: File) => {
    setImportError(null);
    setImportOk(false);
    try {
      const text = await file.text();
      // importProgress trả { ok, progress?, error?, warnings? } (hợp đồng
      // engine Bước 4) — KHÔNG trả Progress trực tiếp.
      const result = importProgress(text);
      if (!result.ok || !result.progress) {
        // Không ghi đè dữ liệu hiện tại khi import lỗi.
        setImportError(result.error ?? 'File không phải bản sao tiến độ hợp lệ.');
        return;
      }
      onImport(result.progress);
      setImportOk(true);
      if (result.warnings && result.warnings.length > 0) {
        setImportError(`Đã nhập, nhưng có lưu ý: ${result.warnings.join(' ')}`);
      }
    } catch {
      setImportError('Không đọc được file — hãy chọn file JSON đã xuất từ sổ tay.');
    }
  };

  return (
    <div className="flex max-h-[85dvh] w-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-[#2B2B2B]">📖 Sổ tay từ vựng</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng sổ tay"
          className="rounded-full bg-[#2B2B2B]/10 px-3 py-1 text-lg font-bold text-[#2B2B2B] hover:bg-[#2B2B2B]/20"
        >
          ✕
        </button>
      </div>

      <p className="mb-3 rounded-lg bg-[#EAF3E6] px-3 py-2 text-sm text-[#2E7D32]">
        Tiến độ lưu trên thiết bị này (không cần tài khoản). Bạn có thể xuất bản sao JSON để giữ lại.
      </p>

      <p className="mb-3 text-sm font-semibold text-[#2B2B2B]/80">
        🔥 Chuỗi {progress.streak.count} ngày · ⭐ {progress.points} điểm · Đã gặp {encounteredIds.length} từ ·{' '}
        {earnedBadgeCount}/{badgeStates.length} huy hiệu toàn cục
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-[#A54432] text-white' : 'bg-[#2B2B2B]/10 text-[#2B2B2B]/80 hover:bg-[#2B2B2B]/20'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' ? ` (${t.count})` : ''}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowPinyin(!showPinyin)}
          className="rounded-full border border-[#1F5C8A] px-3 py-1.5 text-sm font-semibold text-[#1F5C8A]"
        >
          Pinyin: {showPinyin ? 'Hiện' : 'Ẩn'}
        </button>
      </div>

      {(tab === 'search' || tab === 'lesson') && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo chữ Hán, pinyin hoặc nghĩa…"
          aria-label="Tìm từ trong sổ tay"
          className="mb-3 w-full rounded-xl border border-[#2B2B2B]/30 px-4 py-2 text-base text-[#2B2B2B] focus:border-[#A54432] focus:outline-none"
        />
      )}

      {tab === 'calendar' && (
        <div data-testid="review-calendar" className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <p className="text-sm text-[#2B2B2B]/70">
            Lịch ôn theo SRS 1–3–7–14–30 ngày. Ôn đúng hạn được 10 điểm/từ; từ quá hạn hiện rõ ở đầu.
          </p>
          {calendar.days.every((d) => d.lexemeIds.length === 0) && (
            <p className="rounded-lg bg-[#EAF3E6] px-4 py-6 text-center text-sm text-[#2E7D32]">
              Không có từ nào đến hạn trong 7 ngày tới. 🎉
            </p>
          )}
          {calendar.days
            .filter((d) => d.lexemeIds.length > 0)
            .map((d) => {
              const label = d.overdue
                ? `⚠️ Quá hạn — lâu nhất ${d.overdueDays} ngày`
                : d.dayKey === todayKey()
                  ? `📅 Hôm nay (${d.dayKey})`
                  : d.dayKey === addDaysToKey(todayKey(), 1)
                    ? `📅 Ngày mai (${d.dayKey})`
                    : `📅 ${d.dayKey}`;
              return (
                <div key={d.overdue ? 'overdue' : d.dayKey} className="rounded-xl border border-[#2B2B2B]/15 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-base font-bold ${d.overdue ? 'text-[#A54432]' : 'text-[#2B2B2B]'}`}>
                      {label} · {d.lexemeIds.length} từ
                    </span>
                    {onStartReview && (
                      <button
                        type="button"
                        onClick={() => onStartReview(d.lexemeIds, 'review', label)}
                        className="shrink-0 rounded-full bg-[#2E7D32] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#256B29]"
                      >
                        Ôn {d.lexemeIds.length} từ
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.lexemeIds.map((id) => {
                      const l = allById[id];
                      return l ? (
                        <span key={id} className="rounded-full bg-[#2B2B2B]/5 px-2 py-0.5 text-sm font-semibold text-[#2B2B2B]">
                          {l.hanzi}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          {calendar.laterIds.length > 0 && (
            <p className="text-sm text-[#2B2B2B]/60">
              Còn {calendar.laterIds.length} từ đến hạn sau 7 ngày nữa — sẽ hiện ở đây khi tới lượt.
            </p>
          )}
        </div>
      )}

      {tab === 'errors' && (
        <div data-testid="error-notebook" className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <p className="text-sm text-[#2B2B2B]/70">
            Các từ đã sai mà chưa sửa đúng sau đó. Ôn lại riêng từng bài (0đ, không đổi lịch ôn) — sửa đúng thì từ rời khỏi sổ.
          </p>
          {errorsByLesson.length === 0 && (
            <p className="rounded-lg bg-[#EAF3E6] px-4 py-6 text-center text-sm text-[#2E7D32]">
              Sổ lỗi đang trống — chưa có từ nào sai chưa sửa. 🎉
            </p>
          )}
          {errorsByLesson.map(([lessonId, words]) => (
            <div key={lessonId} className="rounded-xl border border-[#2B2B2B]/15 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold text-[#2B2B2B]">
                  {lessonTitleById[lessonId] ?? lessonId} · {words.length} từ
                </span>
                {onStartReview && (
                  <button
                    type="button"
                    onClick={() =>
                      onStartReview(
                        words.map((w) => w.lexemeId),
                        'error',
                        `Ôn lỗi — ${lessonTitleById[lessonId] ?? lessonId}`,
                      )
                    }
                    className="shrink-0 rounded-full bg-[#A54432] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#8A3828]"
                  >
                    Ôn lại {words.length} từ (0đ)
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {words.map((w) => {
                  const l = allById[w.lexemeId];
                  return l ? (
                    <div key={w.lexemeId} className="flex items-baseline justify-between gap-2 text-sm">
                      <span>
                        <span className="text-base font-bold text-[#2B2B2B]">{l.hanzi}</span>
                        <span className="ml-2 text-[#1F5C8A]">{l.pinyin}</span>
                        <span className="ml-2 text-[#2B2B2B]/70">{l.meaning}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-[#A54432]">
                        sai {w.wrongCount} lần{w.lastWrongAt ? ` · ${w.lastWrongAt.slice(0, 10)}` : ''}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'badges' && (
        <div data-testid="badge-list" className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          <p className="text-sm text-[#2B2B2B]/70">
            Huy hiệu toàn cục — tính tự động từ tiến độ của bạn, không cần nhận thủ công. Huy hiệu từng bài đã nhận hiện ở dưới.
          </p>
          {badgeStates.map(({ def, earned, progressText }) => (
            <div
              key={def.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                earned ? 'border-[#2E7D32]/40 bg-[#EAF3E6]' : 'border-[#2B2B2B]/15 bg-white opacity-80'
              }`}
            >
              <span className="text-2xl">{def.icon}</span>
              <div>
                <div className="text-base font-bold text-[#2B2B2B]">
                  {def.title} {earned ? '✓' : ''}
                </div>
                <div className="text-sm text-[#2B2B2B]/70">{def.description}</div>
                <div className="text-xs font-semibold text-[#2B2B2B]/60">{earned ? 'Đã đạt' : progressText}</div>
              </div>
            </div>
          ))}
          <h3 className="pt-2 text-sm font-bold text-[#2B2B2B]/80">
            Huy hiệu từng bài đã nhận ({progress.badges.length})
          </h3>
          {progress.badges.length === 0 && (
            <p className="text-sm text-[#2B2B2B]/60">Chưa nhận huy hiệu bài nào — hoàn thành một quest để nhận huy hiệu riêng của bài đó.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {progress.badges.map((b) => (
              <span key={b} className="rounded-full bg-[#FFF8E6] px-3 py-1 text-sm font-semibold text-[#2B2B2B]">
                🏅 {getQuestDef(b)?.quest.title ?? b}
              </span>
            ))}
          </div>
        </div>
      )}

      {!(['calendar', 'errors', 'badges'] as Tab[]).includes(tab) && (
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {visible.length === 0 && (
          <p className="rounded-lg bg-[#2B2B2B]/5 px-4 py-6 text-center text-sm text-[#2B2B2B]/60">
            {tab === 'due'
              ? 'Không có từ nào cần ôn hôm nay. 🎉'
              : tab === 'encountered'
                ? 'Chưa gặp từ nào — hãy bắt đầu một bài học để gặp từ mới.'
                : 'Không tìm thấy từ nào khớp.'}
          </p>
        )}
        {visible.map((l) => {
          const ex = examplesByLexeme[l.id];
          const wrong = wrongCounts[l.id] ?? 0;
          return (
            <div key={l.id} className="rounded-xl border border-[#2B2B2B]/15 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-3xl font-bold text-[#2B2B2B]">{l.hanzi}</span>
                  {showPinyin && <span className="ml-2 text-base text-[#1F5C8A]">{l.pinyin}</span>}
                  <span className="ml-2 rounded-full bg-[#2B2B2B]/10 px-2 py-0.5 text-xs font-semibold text-[#2B2B2B]/70">
                    {dueSet.has(l.id) ? 'Cần ôn' : encounteredSet.has(l.id) ? 'Đã gặp' : 'Chưa gặp'}
                  </span>
                  <div className="mt-1 text-base text-[#2B2B2B]/85">{l.meaning}</div>
                  {ex && (
                    <div className="mt-1 text-sm text-[#2B2B2B]/70">
                      <span className="font-semibold text-[#2B2B2B]">{ex.hanzi}</span>
                      {showPinyin && ex.pinyin ? <span className="text-[#1F5C8A]"> ({ex.pinyin})</span> : null}
                      {ex.meaning ? <span> — {ex.meaning}</span> : null}
                    </div>
                  )}
                  {wrong > 0 && (
                    <div className="mt-1 text-xs font-semibold text-[#A54432]">Đã sai {wrong} lần — cần ôn lại.</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSpeak(l.hanzi)}
                  disabled={!soundOn}
                  aria-label={`Nghe phát âm ${l.hanzi}`}
                  className="shrink-0 rounded-full bg-[#1F5C8A] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#17486E] disabled:opacity-40"
                >
                  🔊 Nghe
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#2B2B2B]/10 pt-3">
        <button
          type="button"
          onClick={doExport}
          className="rounded-full bg-[#2E7D32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256B29]"
        >
          ⬇ Xuất JSON bản sao
        </button>
        <label className="cursor-pointer rounded-full border border-[#2E7D32] px-4 py-2 text-sm font-semibold text-[#2E7D32] transition hover:bg-[#2E7D32]/10">
          ⬆ Nhập JSON bản sao
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
        </label>
        {importError && <span className="text-sm font-semibold text-[#A54432]">{importError}</span>}
        {importOk && <span className="text-sm font-semibold text-[#2E7D32]">Đã nhập tiến độ từ file.</span>}
      </div>
    </div>
  );
}
