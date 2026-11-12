// ---------------------------------------------------------------------------
// lib/gameModes.ts — Quản lý các Chế độ Chơi & Học tập gắn rời (Pluggable Modes)
// của nền tảng HUSTVerse — Bách Khoa 3D.
//
// Định hướng kiến trúc:
// - Lớp Lõi (Core Campus Sandbox & Social 3D): Luôn bật — khám phá khuôn viên,
//   lái xe máy, 10 bộ đồng phục HUST, check-in 9 công trình, tự học Thư viện
//   Tạ Quang Bửu và giao lưu Multiplayer.
// - Chế độ Học tiếng Trung (`hskMode`): Mặc định TẮT (`false`) cho người chơi
//   mới để giao diện gọn sạch đúng chất game mô phỏng Bách Khoa 3D; có thể
//   bật/tắt bất kỳ lúc nào ngay trên màn hình vào hoặc thanh HUD và được lưu
//   bền vững trong `localStorage`.
// ---------------------------------------------------------------------------

export const GAME_MODES_STORAGE_KEY = 'hustverse:modes:v1';

export interface GameModesState {
  version: 1;
  /** Bật/tắt Chế độ Học tiếng Trung HSK (mặc định: false) */
  hskMode: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_GAME_MODES: Readonly<GameModesState> = Object.freeze({
  version: 1,
  hskMode: false,
});

function resolveStorage(explicit?: StorageLike | null): StorageLike | null {
  if (explicit !== undefined) return explicit;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function loadGameModes(storage?: StorageLike | null): GameModesState {
  const target = resolveStorage(storage);
  if (!target) {
    return { ...DEFAULT_GAME_MODES };
  }
  try {
    const raw = target.getItem(GAME_MODES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_GAME_MODES };
    }
    const parsed = JSON.parse(raw) as Partial<GameModesState> | null;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_GAME_MODES };
    }
    return {
      version: 1,
      hskMode: Boolean(parsed.hskMode),
    };
  } catch {
    return { ...DEFAULT_GAME_MODES };
  }
}

export function saveGameModes(
  state: GameModesState,
  storage?: StorageLike | null,
): void {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.setItem(
      GAME_MODES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        hskMode: Boolean(state.hskMode),
      }),
    );
  } catch {
    // Bỏ qua nếu trình duyệt chặn ghi localStorage / đầy bộ nhớ
  }
}

export function setHskModeEnabled(
  state: GameModesState,
  enabled: boolean,
): GameModesState {
  return {
    ...state,
    version: 1,
    hskMode: Boolean(enabled),
  };
}

export function toggleHskModeState(state: GameModesState): GameModesState {
  return setHskModeEnabled(state, !state.hskMode);
}

/**
 * Hiển thị tên kênh Multiplayer thân thiện kiểu thế giới mở HUSTVerse
 * (ví dụ: `hsk-1` -> `Kênh BK 1`) trong khi vẫn giữ nguyên mã phòng kỹ thuật
 * trên đường truyền WebSocket để tương thích tuyệt đối với Cloudflare Worker.
 */
export function formatCampusChannelLabel(roomId: string | null | undefined): string {
  if (!roomId) return 'Kênh BK';
  const m = /^hsk-(\d+)$/i.exec(roomId.trim());
  if (m) {
    return `Kênh BK ${m[1]}`;
  }
  return `Kênh ${roomId}`;
}
