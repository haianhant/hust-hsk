// ---------------------------------------------------------------------------
// features/social/memory-wall/memory-wall.ts — Adapter lưu trữ localStorage &
// gọi Cloudflare Worker HTTP API `/api/memories` cho Bảng Lưu bút Sân trường.
// Module ID: feature.social.memory-wall
// ---------------------------------------------------------------------------

import { resolveWsUrl } from '../../../lib/multiplayer';
import {
  SEED_CAMPUS_MEMORIES,
  isValidMemoryBoardId,
  isValidMemoryColor,
  mergeMemoryNotes,
  sanitizeMemoryAuthor,
  sanitizeMemoryCohort,
  sanitizeMemoryText,
  type CampusMemoryNote,
  type MemoryBoardId,
  type MemoryNoteColor,
} from '../../../shared/contracts/memory';

export * from '../../../shared/contracts/memory';

export const MEMORY_WALL_STORAGE_KEY = 'bkhn_campus_memories_v1';
export const MEMORY_WALL_LIKED_STORAGE_KEY = 'bkhn_campus_memories_liked_v1';

export function loadLocalMemories(storage?: Pick<Storage, 'getItem'> | null): CampusMemoryNote[] {
  const seeds = SEED_CAMPUS_MEMORIES.map((s) => ({ ...s }));
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return seeds;
    const raw = store.getItem(MEMORY_WALL_STORAGE_KEY);
    if (!raw) return seeds;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return seeds;
    const valid: CampusMemoryNote[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Partial<CampusMemoryNote>;
      const msg = sanitizeMemoryText(obj.message);
      if (!msg || typeof obj.id !== 'string' || !isValidMemoryBoardId(obj.boardId)) continue;
      valid.push({
        id: obj.id.slice(0, 64),
        boardId: obj.boardId,
        authorName: sanitizeMemoryAuthor(obj.authorName),
        cohortBadge: sanitizeMemoryCohort(obj.cohortBadge),
        message: msg,
        color: isValidMemoryColor(obj.color) ? obj.color : 'yellow',
        likes:
          typeof obj.likes === 'number' && Number.isFinite(obj.likes)
            ? Math.max(0, Math.floor(obj.likes))
            : 0,
        createdAtMs:
          typeof obj.createdAtMs === 'number' && Number.isFinite(obj.createdAtMs)
            ? obj.createdAtMs
            : Date.now(),
      });
    }
    return mergeMemoryNotes(valid, seeds);
  } catch {
    return seeds;
  }
}

export function saveLocalMemories(
  notes: readonly CampusMemoryNote[],
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    store?.setItem(MEMORY_WALL_STORAGE_KEY, JSON.stringify(notes.slice(0, 80)));
  } catch {
    // ignore storage errors
  }
}

export function loadLikedMemoryIds(storage?: Pick<Storage, 'getItem'> | null): Set<string> {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return new Set();
    const raw = store.getItem(MEMORY_WALL_LIKED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function saveLikedMemoryIds(
  likedIds: ReadonlySet<string>,
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    store?.setItem(MEMORY_WALL_LIKED_STORAGE_KEY, JSON.stringify(Array.from(likedIds).slice(0, 200)));
  } catch {
    // ignore storage errors
  }
}

export function resolveMemoriesApiBaseUrl(overrideWsUrl?: string): string | null {
  const resolved = overrideWsUrl
    ? { ok: true as const, url: overrideWsUrl }
    : resolveWsUrl();
  if (!resolved.ok || !resolved.url) return null;
  try {
    const u = new URL(resolved.url);
    u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
    u.pathname = '';
    u.search = '';
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export async function fetchCampusMemoriesRemote(
  boardId?: MemoryBoardId,
  baseOverride?: string,
): Promise<CampusMemoryNote[] | null> {
  if (typeof fetch !== 'function') return null;
  const base = baseOverride ?? resolveMemoriesApiBaseUrl();
  if (!base) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const qs = boardId ? `?boardId=${encodeURIComponent(boardId)}` : '';
    const res = await fetch(`${base}/api/memories${qs}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; notes?: CampusMemoryNote[] };
    if (!data?.ok || !Array.isArray(data.notes)) return null;
    return data.notes;
  } catch {
    return null;
  }
}

export async function postCampusMemoryRemote(
  input: {
    boardId: MemoryBoardId;
    authorName: string;
    cohortBadge: string;
    message: string;
    color: MemoryNoteColor;
  },
  baseOverride?: string,
): Promise<CampusMemoryNote | null> {
  if (typeof fetch !== 'function') return null;
  const base = baseOverride ?? resolveMemoriesApiBaseUrl();
  if (!base) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${base}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; note?: CampusMemoryNote };
    return data?.ok && data.note ? data.note : null;
  } catch {
    return null;
  }
}

export async function likeCampusMemoryRemote(
  id: string,
  baseOverride?: string,
): Promise<CampusMemoryNote | null> {
  if (typeof fetch !== 'function') return null;
  const base = baseOverride ?? resolveMemoriesApiBaseUrl();
  if (!base) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${base}/api/memories/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; note?: CampusMemoryNote };
    return data?.ok && data.note ? data.note : null;
  } catch {
    return null;
  }
}
