'use client';

// ---------------------------------------------------------------------------
// features/social/memory-wall/CampusMemoryWallModal.tsx — Modal đọc, thả tim
// và ghim Lưu bút sinh viên lên 3 Bảng Lưu bút Sân trường (Quảng trường C1,
// Bờ Hồ Tiền, Thư viện Tạ Quang Bửu). Đồng bộ Cloudflare DO + localStorage.
// Module ID: feature.social.memory-wall
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import type { CharacterProfile } from '../../../lib/identity';
import { getSchoolBadgeDef } from '../../campus/quests/campus-quests';
import { CAMPUS_MEMORY_BOARDS } from '../../campus/world-data';
import {
  fetchCampusMemoriesRemote,
  likeCampusMemoryRemote,
  loadLikedMemoryIds,
  loadLocalMemories,
  mergeMemoryNotes,
  postCampusMemoryRemote,
  sanitizeMemoryAuthor,
  sanitizeMemoryCohort,
  sanitizeMemoryText,
  saveLikedMemoryIds,
  saveLocalMemories,
  type CampusMemoryNote,
  type MemoryBoardId,
  type MemoryNoteColor,
} from './memory-wall';

export interface CampusMemoryWallModalProps {
  open: boolean;
  initialBoardId?: MemoryBoardId;
  characterProfile: CharacterProfile;
  onMemoryAction?: (kind: 'post' | 'like') => void;
  onClose: () => void;
}

const NOTE_COLOR_CLASSES: Record<MemoryNoteColor, string> = {
  yellow: 'border-amber-300 bg-[#FEF9C3] text-slate-900',
  pink: 'border-pink-300 bg-[#FCE7F3] text-slate-900',
  blue: 'border-sky-300 bg-[#E0F2FE] text-slate-900',
  mint: 'border-emerald-300 bg-[#DCFCE7] text-slate-900',
};

const COLOR_DOTS: ReadonlyArray<{ id: MemoryNoteColor; label: string; bg: string }> = [
  { id: 'yellow', label: 'Vàng nắng', bg: '#FDE047' },
  { id: 'pink', label: 'Hồng phấn', bg: '#F9A8D4' },
  { id: 'blue', label: 'Xanh trời', bg: '#7DD3FC' },
  { id: 'mint', label: 'Bạc hà', bg: '#86EFAC' },
];

export function CampusMemoryWallModal({
  open,
  initialBoardId,
  characterProfile,
  onMemoryAction,
  onClose,
}: CampusMemoryWallModalProps) {
  const [filterBoard, setFilterBoard] = useState<'all' | MemoryBoardId>(
    initialBoardId ?? 'all',
  );
  const [composeBoard, setComposeBoard] = useState<MemoryBoardId>(
    initialBoardId ?? 'c1-board',
  );
  const [notes, setNotes] = useState<CampusMemoryNote[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState('');
  const [noteColor, setNoteColor] = useState<MemoryNoteColor>('yellow');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialBoardId) {
      setFilterBoard(initialBoardId);
      setComposeBoard(initialBoardId);
    }
    const localNotes = loadLocalMemories();
    setNotes(localNotes);
    setLikedIds(loadLikedMemoryIds());

    let cancelled = false;
    fetchCampusMemoriesRemote().then((remote) => {
      if (cancelled || !remote) return;
      setNotes((prev) => {
        const merged = mergeMemoryNotes(remote, prev);
        saveLocalMemories(merged);
        return merged;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, initialBoardId]);

  const visibleNotes = useMemo(() => {
    if (filterBoard === 'all') return notes;
    return notes.filter((n) => n.boardId === filterBoard);
  }, [notes, filterBoard]);

  if (!open) return null;

  const schoolBadge = getSchoolBadgeDef(characterProfile.schoolId);
  const defaultCohort = sanitizeMemoryCohort(
    schoolBadge.id !== 'none'
      ? `${schoolBadge.shortLabel} · ${characterProfile.mssv}`
      : `MSSV ${characterProfile.mssv}`,
  );

  const handleLike = async (noteId: string) => {
    if (likedIds.has(noteId)) return;
    const nextLiked = new Set(likedIds);
    nextLiked.add(noteId);
    setLikedIds(nextLiked);
    saveLikedMemoryIds(nextLiked);

    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === noteId ? { ...n, likes: n.likes + 1 } : n));
      saveLocalMemories(updated);
      return updated;
    });
    onMemoryAction?.('like');

    const remoteNote = await likeCampusMemoryRemote(noteId);
    if (remoteNote) {
      setNotes((prev) => {
        const updated = prev.map((n) => (n.id === noteId ? remoteNote : n));
        saveLocalMemories(updated);
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = sanitizeMemoryText(draft);
    if (!cleanMsg || submitting) return;
    setSubmitting(true);
    try {
      const authorName = sanitizeMemoryAuthor(characterProfile.name);
      const optimistic: CampusMemoryNote = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        boardId: composeBoard,
        authorName,
        cohortBadge: defaultCohort,
        message: cleanMsg,
        color: noteColor,
        likes: 0,
        createdAtMs: Date.now(),
      };
      setNotes((prev) => {
        const merged = mergeMemoryNotes([optimistic], prev);
        saveLocalMemories(merged);
        return merged;
      });
      setDraft('');
      setFilterBoard((cur) => (cur === 'all' ? 'all' : composeBoard));
      onMemoryAction?.('post');

      const remoteSaved = await postCampusMemoryRemote({
        boardId: composeBoard,
        authorName,
        cohortBadge: defaultCohort,
        message: cleanMsg,
        color: noteColor,
      });
      if (remoteSaved) {
        setNotes((prev) => {
          const withoutTemp = prev.filter((n) => n.id !== optimistic.id);
          const merged = mergeMemoryNotes([remoteSaved], withoutTemp);
          saveLocalMemories(merged);
          return merged;
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="memory-wall-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-200/60 bg-[#FAF6EE] text-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-[#B5121B] px-5 py-3.5 text-white">
          <div>
            <h2 className="text-base font-extrabold sm:text-lg">
              📌 Bảng Lưu bút Sân trường Bách Khoa
            </h2>
            <p className="text-xs text-amber-100">
              Gửi gắm lời chúc, kỷ niệm đồ án và dấu ấn thanh xuân tới sinh viên các khóa
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng bảng lưu bút"
            data-testid="memory-wall-close"
            onClick={onClose}
            className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white transition hover:bg-white/25"
          >
            ✕
          </button>
        </div>

        {/* Bộ lọc 3 vị trí bảng trên sân trường */}
        <div className="flex flex-wrap gap-1.5 border-b border-black/10 bg-white/75 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setFilterBoard('all')}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              filterBoard === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-black/5 text-slate-700 hover:bg-black/10'
            }`}
          >
            Tất cả bảng ({notes.length})
          </button>
          {CAMPUS_MEMORY_BOARDS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setFilterBoard(b.id);
                setComposeBoard(b.id);
              }}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                filterBoard === b.id
                  ? 'bg-[#B5121B] text-white'
                  : 'bg-black/5 text-slate-700 hover:bg-black/10'
              }`}
            >
              {b.label.replace('Bảng Lưu bút ', '')}
            </button>
          ))}
        </div>

        {/* Danh sách giấy lưu bút */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleNotes.map((note) => {
              const boardSpec = CAMPUS_MEMORY_BOARDS.find((b) => b.id === note.boardId);
              const liked = likedIds.has(note.id);
              return (
                <div
                  key={note.id}
                  data-testid="memory-note-card"
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 shadow-sm transition ${
                    NOTE_COLOR_CLASSES[note.color]
                  }`}
                >
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
                      <span className="truncate">
                        {boardSpec?.label.replace('Bảng Lưu bút ', '') ?? note.boardId}
                      </span>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px]">
                        {note.cohortBadge}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-slate-900">
                      {note.message}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2">
                    <span className="text-xs font-bold text-slate-700">
                      — {note.authorName}
                    </span>
                    <button
                      type="button"
                      data-testid="like-memory-btn"
                      onClick={() => handleLike(note.id)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                        liked
                          ? 'bg-rose-600 text-white'
                          : 'bg-white/80 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      ❤️ {note.likes}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form ghim lưu bút mới */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-black/10 bg-white px-4 py-3"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span>Ghim tại:</span>
              <select
                value={composeBoard}
                onChange={(e) => setComposeBoard(e.target.value as MemoryBoardId)}
                className="rounded-xl border border-black/15 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                {CAMPUS_MEMORY_BOARDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Màu giấy:</span>
              {COLOR_DOTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={c.label}
                  onClick={() => setNoteColor(c.id)}
                  style={{ backgroundColor: c.bg }}
                  className={`h-5 w-5 rounded-full border transition ${
                    noteColor === c.id ? 'scale-110 border-slate-900 ring-2 ring-slate-900/30' : 'border-black/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              maxLength={140}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              data-testid="memory-note-input"
              placeholder="Viết lưu bút của bạn (tối đa 140 ký tự)..."
              className="flex-1 rounded-2xl border border-black/20 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-[#B5121B] focus:outline-none"
            />
            <button
              type="submit"
              data-testid="submit-memory-btn"
              disabled={!sanitizeMemoryText(draft) || submitting}
              className="rounded-2xl bg-[#B5121B] px-5 py-2 text-sm font-extrabold text-white shadow transition hover:bg-[#8F1418] disabled:opacity-45"
            >
              📌 Ghim Lưu bút
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CampusMemoryWallModal;
