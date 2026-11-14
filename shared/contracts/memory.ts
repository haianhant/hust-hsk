// ---------------------------------------------------------------------------
// shared/contracts/memory.ts — Hợp đồng & Dữ liệu mẫu Bảng Lưu bút Sân trường
// Dùng chung cho Frontend (`features/social/memory-wall`) và Cloudflare Worker
// (`worker/src/room.ts`). Pure TypeScript — không phụ thuộc DOM/React/Three.
// ---------------------------------------------------------------------------

import { sanitizeName } from './multiplayer';

export type MemoryBoardId = 'c1-board' | 'tien-lake-board' | 'library-board';
export type MemoryNoteColor = 'yellow' | 'pink' | 'blue' | 'mint';

export interface CampusMemoryNote {
  id: string;
  boardId: MemoryBoardId;
  authorName: string;
  cohortBadge: string;
  message: string;
  color: MemoryNoteColor;
  likes: number;
  createdAtMs: number;
}

export const MEMORY_BOARD_LABELS: Record<MemoryBoardId, string> = {
  'c1-board': 'Quảng trường C1',
  'tien-lake-board': 'Bờ Hồ Tiền',
  'library-board': 'Thư viện Tạ Quang Bửu',
};

export const VALID_MEMORY_BOARD_IDS: readonly MemoryBoardId[] = [
  'c1-board',
  'tien-lake-board',
  'library-board',
] as const;

export const VALID_MEMORY_COLORS: readonly MemoryNoteColor[] = [
  'yellow',
  'pink',
  'blue',
  'mint',
] as const;

export const SEED_CAMPUS_MEMORIES: readonly CampusMemoryNote[] = [
  {
    id: 'seed-mem-c1-1',
    boardId: 'c1-board',
    authorName: 'Nguyễn Minh Quân',
    cohortBadge: 'K65 · SoICT',
    message: 'Ngày bảo vệ đồ án tốt nghiệp dưới nắng C1, hẹn một ngày quay lại Bách Khoa cùng anh em!',
    color: 'yellow',
    likes: 18,
    createdAtMs: 1762800000000,
  },
  {
    id: 'seed-mem-c1-2',
    boardId: 'c1-board',
    authorName: 'Trần Hà Linh',
    cohortBadge: 'K69 · SEEE',
    message: 'Tuần sinh hoạt công dân đầu tiên chụp ảnh ở I ❤ BK mà hồi hộp quá trời ❤️',
    color: 'pink',
    likes: 12,
    createdAtMs: 1762810000000,
  },
  {
    id: 'seed-mem-c1-3',
    boardId: 'c1-board',
    authorName: 'Lê Hoàng Nam',
    cohortBadge: 'Cựu SV K60',
    message: '10 năm ra trường rồi nhìn lại 9 gợn sóng mái C1 vẫn thấy rưng rưng tự hào.',
    color: 'blue',
    likes: 24,
    createdAtMs: 1762820000000,
  },
  {
    id: 'seed-mem-lake-1',
    boardId: 'tien-lake-board',
    authorName: 'Phạm Thảo Vy',
    cohortBadge: 'K68 · SMSE',
    message: 'Chiều gió mát ngồi ghế đá Hồ Tiền làm cốc trà chanh ngắm sen nở hết sẩy!',
    color: 'mint',
    likes: 15,
    createdAtMs: 1762830000000,
  },
  {
    id: 'seed-mem-lake-2',
    boardId: 'tien-lake-board',
    authorName: 'Đỗ Tuấn Kiệt',
    cohortBadge: 'K67 · SME',
    message: 'Chúc toàn thể K69-K70 kỳ này qua môn Giải tích I & Vật lý đại cương ngay lần đầu!',
    color: 'yellow',
    likes: 31,
    createdAtMs: 1762840000000,
  },
  {
    id: 'seed-mem-lake-3',
    boardId: 'tien-lake-board',
    authorName: 'Vũ Ngọc Mai',
    cohortBadge: 'K66 · SCLS',
    message: 'Hồ Tiền ban đêm lên đèn và đom đóm cực chill luôn các bạn ơi ✨',
    color: 'blue',
    likes: 11,
    createdAtMs: 1762850000000,
  },
  {
    id: 'seed-mem-lib-1',
    boardId: 'library-board',
    authorName: 'Bùi Đức Anh',
    cohortBadge: 'K68 · SoICT',
    message: 'Combo 2 Pomodoro Tầng 4 Thư viện + Piano Tầng 6 giải tỏa stress cực đỉnh!',
    color: 'blue',
    likes: 19,
    createdAtMs: 1762860000000,
  },
  {
    id: 'seed-mem-lib-2',
    boardId: 'library-board',
    authorName: 'Hoàng Thu Trang',
    cohortBadge: 'K69 · HSK Club',
    message: 'Ai chuẩn bị thi HSK 3 lên Tòa C7 học bài khóa với bọn mình nhé 🇨🇳📚',
    color: 'pink',
    likes: 9,
    createdAtMs: 1762870000000,
  },
  {
    id: 'seed-mem-lib-3',
    boardId: 'library-board',
    authorName: 'Nguyễn Hữu Phước',
    cohortBadge: 'K67 · SEEE',
    message: 'Lần đầu leo sân thượng Tầng 10 TQB ngắm hoàng hôn Bách Khoa nhớ mãi không quên.',
    color: 'mint',
    likes: 14,
    createdAtMs: 1762880000000,
  },
];

export function isValidMemoryBoardId(value: unknown): value is MemoryBoardId {
  return VALID_MEMORY_BOARD_IDS.includes(value as MemoryBoardId);
}

export function isValidMemoryColor(value: unknown): value is MemoryNoteColor {
  return VALID_MEMORY_COLORS.includes(value as MemoryNoteColor);
}

export function sanitizeMemoryText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

export function sanitizeMemoryAuthor(raw: unknown): string {
  return sanitizeName(raw);
}

export function sanitizeMemoryCohort(raw: unknown): string {
  if (typeof raw !== 'string') return 'SV Bách Khoa';
  const clean = raw
    .replace(/[\u0000-\u001F\u007F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
  return clean || 'SV Bách Khoa';
}

export function mergeMemoryNotes(
  incoming: readonly CampusMemoryNote[],
  existing: readonly CampusMemoryNote[],
): CampusMemoryNote[] {
  const byId = new Map<string, CampusMemoryNote>();
  for (const n of existing) {
    byId.set(n.id, n);
  }
  for (const n of incoming) {
    const prev = byId.get(n.id);
    if (!prev) {
      byId.set(n.id, n);
    } else {
      byId.set(n.id, {
        ...n,
        likes: Math.max(prev.likes, n.likes),
      });
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 80);
}
