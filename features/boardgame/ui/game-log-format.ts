// ---------------------------------------------------------------------------
// features/boardgame/ui/game-log-format.ts — Bộ tách token định dạng Nhật ký
// trận đấu an toàn XSS (thuần dữ liệu, KHÔNG dùng dangerouslySetInnerHTML).
// Tô đậm rõ ràng: Tên người chơi, Trang bị/Tên thẻ, Khu vực, Sát thương/Hồi máu
// và Tên nhân vật.
// ---------------------------------------------------------------------------

import { CARDS_CATALOG } from '../domain/cards';
import { ALL_ROLE_DESIGNS_BY_ID } from '../domain/roles';
import { LOCATIONS_CATALOG } from '../domain/rules';

export type LogTokenKind =
  | 'plain'
  | 'player'
  | 'card'
  | 'location'
  | 'damage'
  | 'heal'
  | 'role';

export interface LogToken {
  text: string;
  kind: LogTokenKind;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const KNOWN_LOCATION_PHRASES: readonly string[] = Array.from(
  new Set([
    ...LOCATIONS_CATALOG.map((loc) => loc.name),
    ...LOCATIONS_CATALOG.map((loc) => loc.shortName),
    'Ô 2–3',
    'Ô 4–5',
    'Ô 6',
    'Ô 8',
    'Ô 9',
    'Ô 10',
  ]),
)
  .filter((s) => s.length >= 3)
  .sort((a, b) => b.length - a.length);

const KNOWN_CARD_TITLES: readonly string[] = Array.from(
  new Set(CARDS_CATALOG.map((c) => c.title)),
)
  .filter((s) => s.length >= 3)
  .sort((a, b) => b.length - a.length);

const KNOWN_ROLE_NAMES: readonly string[] = Array.from(
  new Set(Object.values(ALL_ROLE_DESIGNS_BY_ID).map((r) => r.name)),
)
  .filter((s) => s.length >= 3)
  .sort((a, b) => b.length - a.length);

interface MatchSpan {
  start: number;
  end: number;
  kind: Exclude<LogTokenKind, 'plain'>;
  priority: number;
}

function collectRegexSpans(
  text: string,
  regex: RegExp,
  kind: Exclude<LogTokenKind, 'plain'>,
  priority: number,
  out: MatchSpan[],
): void {
  regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[0].length === 0) {
      regex.lastIndex += 1;
      continue;
    }
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      kind,
      priority,
    });
  }
}

function collectLiteralWordSpans(
  text: string,
  phrases: readonly string[],
  kind: Exclude<LogTokenKind, 'plain'>,
  priority: number,
  out: MatchSpan[],
): void {
  if (phrases.length === 0) return;
  const alts = phrases.map(escapeRegex).join('|');
  // Dùng new RegExp để tương thích tsconfig ES5 trong khi vẫn dùng Unicode property escapes tại runtime
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alts})(?![\\p{L}\\p{N}_])`, 'gu');
  collectRegexSpans(text, regex, kind, priority, out);
}

const QUOTED_CARD_REGEX = new RegExp('"[^"\\n]{2,64}"', 'gu');
const HEAL_REGEX = new RegExp(
  '(?:hồi\\s+(?:sạch\\s+)?\\d+\\s*(?:thương tích|máu|HP|ST)|(?<![\\p{L}\\p{N}])\\+\\d+\\s*(?:HP|máu)|đầy máu)',
  'giu',
);
const DAMAGE_REGEX = new RegExp(
  '(?:(?<![\\p{L}\\p{N}])-\\d+\\s*(?:ST|HP|máu)|(?<![\\p{L}\\p{N}])\\d+\\s*(?:sát thương|ST|thương tích|HP)(?![\\p{L}\\p{N}])|ĐÁNH HỤT|PHẢN TÁC DỤNG|BOM XỊT)',
  'giu',
);

/**
 * Tách một dòng nhật ký thành danh sách token có phân loại ngữ nghĩa để tô đậm an toàn trong React.
 * Thứ tự ưu tiên tránh xung đột lồng nhau:
 * 1. Tên thẻ/trang bị trong ngoặc kép `"..."`
 * 2. Tên người chơi hiện diện trên bàn
 * 3. Tên khu vực (Hermit's Cabin, Church, Weird Woods, ...)
 * 4. Cụm hồi máu / sát thương
 * 5. Tên thẻ/trang bị không nằm trong ngoặc kép
 * 6. Tên nhân vật chuẩn (George, Vampire, Werewolf, ...)
 */
export function tokenizeGameLogText(
  text: string,
  playerNames: readonly string[],
): LogToken[] {
  if (!text) return [];

  const spans: MatchSpan[] = [];
  const cleanPlayers = Array.from(
    new Set(playerNames.map((n) => n.trim()).filter((n) => n.length >= 2)),
  ).sort((a, b) => b.length - a.length);

  collectRegexSpans(text, QUOTED_CARD_REGEX, 'card', 1, spans);
  collectLiteralWordSpans(text, cleanPlayers, 'player', 2, spans);
  collectLiteralWordSpans(text, KNOWN_LOCATION_PHRASES, 'location', 3, spans);
  collectRegexSpans(text, HEAL_REGEX, 'heal', 4, spans);
  collectRegexSpans(text, DAMAGE_REGEX, 'damage', 5, spans);
  collectLiteralWordSpans(text, KNOWN_CARD_TITLES, 'card', 6, spans);
  collectLiteralWordSpans(text, KNOWN_ROLE_NAMES, 'role', 7, spans);

  if (spans.length === 0) {
    return [{ text, kind: 'plain' }];
  }

  // Sắp theo vị trí xuất hiện -> độ ưu tiên cao hơn -> độ dài lớn hơn
  spans.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.end - a.end;
  });

  // Chọn tập span không giao nhau (greedy ưu tiên span thắng trước, và ưu tiên priority cao nếu bao trùm)
  const chosen: MatchSpan[] = [];
  for (const cand of spans) {
    const prev = chosen[chosen.length - 1];
    if (!prev || cand.start >= prev.end) {
      chosen.push(cand);
    } else if (cand.priority < prev.priority && cand.start >= prev.start && cand.end >= prev.end) {
      chosen[chosen.length - 1] = cand;
    }
  }

  const tokens: LogToken[] = [];
  let cursor = 0;
  for (const span of chosen) {
    if (span.start > cursor) {
      tokens.push({ text: text.slice(cursor, span.start), kind: 'plain' });
    }
    tokens.push({ text: text.slice(span.start, span.end), kind: span.kind });
    cursor = span.end;
  }
  if (cursor < text.length) {
    tokens.push({ text: text.slice(cursor), kind: 'plain' });
  }
  return tokens;
}
