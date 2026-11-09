// ---------------------------------------------------------------------------
// lib/identity.ts — Tên + MSSV + Hồ sơ Nhân vật Sinh viên Bách Khoa (Việc 2).
// - Hỏi ở màn hình tạo nhân vật trước khi vào trường và mở lại bất kỳ lúc nào
//   từ nút "Nhân vật & trang phục" trong HUD, lưu localStorage để F5 khôi phục.
// - Nếu tên để trống khi vào trường → mặc định "Sinh viên".
// - MSSV đúng định dạng HUST: 8 chữ số (vd 20226010); nếu để trống → mặc định
//   "20226010", nếu nhập sai định dạng → báo lỗi.
// ---------------------------------------------------------------------------

import {
  playerState,
  type AvatarGender,
  type AvatarHairStyle,
  type AvatarOutfitId,
} from './playerState';
import {
  MSSV_RE,
  VALID_GENDERS,
  VALID_HAIR_STYLES,
  VALID_OUTFIT_IDS,
  derivePublicPlayerId,
  isAvatarGender,
  isAvatarHairStyle,
  isAvatarOutfitId,
} from '../shared/contracts/multiplayer';

export { MSSV_RE, derivePublicPlayerId };

export interface Identity {
  name: string;
  mssv: string;
}

export interface CharacterProfile {
  name: string;
  mssv: string;
  gender: AvatarGender;
  hairStyle: AvatarHairStyle;
  outfit: AvatarOutfitId;
  skirt?: boolean;
  backpack: boolean;
  glasses: boolean;
  lanyard: boolean;
}

export const IDENTITY_KEY = 'bkhn-identity-v1';
export const CHARACTER_KEY = 'bkhn-character-v1';
export const SESSION_KEY = 'bkhn-session-id';
export const RECONNECT_TOKEN_KEY = 'bkhn-reconnect-token-v1';

export const DEFAULT_CHARACTER_PROFILE: CharacterProfile = {
  name: 'Sinh viên',
  mssv: '20226010',
  gender: 'male',
  hairStyle: 'short',
  outfit: 'windbreaker-hust',
  skirt: false,
  backpack: true,
  glasses: false,
  lanyard: true,
};

export function isValidMssv(mssv: string): boolean {
  return MSSV_RE.test(mssv.trim());
}

export function isValidName(name: string): boolean {
  const t = name.trim();
  return t.length >= 1 && t.length <= 30;
}

export function validateIdentity(name: string, mssv: string): string | null {
  const trimmedName = name.trim();
  const trimmedMssv = mssv.trim();
  if (trimmedName.length > 30) return 'Tên phải từ 1 đến 30 ký tự.';
  if (trimmedMssv.length > 0 && !isValidMssv(trimmedMssv)) {
    return 'MSSV phải là 8 chữ số (vd 20226010).';
  }
  return null;
}

export const VALID_HAIRS = VALID_HAIR_STYLES;
export const VALID_OUTFITS = VALID_OUTFIT_IDS;

export function syncCharacterToPlayerState(profile: CharacterProfile): void {
  playerState.avatarName = profile.name.trim() || 'Sinh viên';
  playerState.avatarGender = profile.gender;
  playerState.avatarHairStyle = profile.hairStyle;
  playerState.avatarOutfit = profile.outfit;
  playerState.avatarSkirt = Boolean(profile.skirt);
  playerState.avatarBackpack = profile.backpack;
  playerState.avatarGlasses = profile.glasses;
  playerState.avatarLanyard = profile.lanyard;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bkhn:outfit'));
  }
}

export function loadCharacterProfile(): CharacterProfile | null {
  try {
    const rawChar = localStorage.getItem(CHARACTER_KEY);
    const rawId = localStorage.getItem(IDENTITY_KEY);
    if (!rawChar && !rawId) return null;

    const parsedChar = rawChar ? (JSON.parse(rawChar) as Partial<CharacterProfile>) : {};
    const parsedId = rawId ? (JSON.parse(rawId) as Partial<Identity>) : {};

    const rawName =
      typeof parsedChar.name === 'string' && parsedChar.name.trim()
        ? parsedChar.name.trim()
        : typeof parsedId.name === 'string' && parsedId.name.trim()
          ? parsedId.name.trim()
          : '';
    const rawMssv =
      typeof parsedChar.mssv === 'string' && isValidMssv(parsedChar.mssv)
        ? parsedChar.mssv.trim()
        : typeof parsedId.mssv === 'string' && isValidMssv(parsedId.mssv)
          ? parsedId.mssv.trim()
          : '';

    if (!rawName && !rawMssv) return null;

    const gender: AvatarGender = isAvatarGender(parsedChar.gender)
      ? parsedChar.gender
      : DEFAULT_CHARACTER_PROFILE.gender;
    const hairStyle: AvatarHairStyle = isAvatarHairStyle(parsedChar.hairStyle)
      ? parsedChar.hairStyle
      : gender === 'female'
        ? 'ponytail'
        : 'short';
    const outfit: AvatarOutfitId = isAvatarOutfitId(parsedChar.outfit)
      ? parsedChar.outfit
      : DEFAULT_CHARACTER_PROFILE.outfit;

    return {
      name: rawName || 'Sinh viên',
      mssv: rawMssv || '20226010',
      gender,
      hairStyle,
      outfit,
      skirt:
        typeof parsedChar.skirt === 'boolean'
          ? parsedChar.skirt
          : gender === 'female' && (outfit === 'tshirt-navy' || outfit === 'shirt-white'),
      backpack: typeof parsedChar.backpack === 'boolean' ? parsedChar.backpack : true,
      glasses: typeof parsedChar.glasses === 'boolean' ? parsedChar.glasses : false,
      lanyard: typeof parsedChar.lanyard === 'boolean' ? parsedChar.lanyard : true,
    };
  } catch {
    return null;
  }
}

export function saveCharacterProfile(profile: CharacterProfile): void {
  const cleanName = profile.name.trim() || 'Sinh viên';
  const cleanMssv = isValidMssv(profile.mssv) ? profile.mssv.trim() : '20226010';
  const normalized: CharacterProfile = {
    ...profile,
    name: cleanName,
    mssv: cleanMssv,
  };
  try {
    localStorage.setItem(CHARACTER_KEY, JSON.stringify(normalized));
    localStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({ name: cleanName, mssv: cleanMssv }),
    );
  } catch {
    // localStorage đầy/bị chặn
  }
  syncCharacterToPlayerState(normalized);
}

export function loadIdentity(): Identity | null {
  const profile = loadCharacterProfile();
  if (!profile) return null;
  syncCharacterToPlayerState(profile);
  return { name: profile.name, mssv: profile.mssv };
}

export function saveIdentity(identity: Identity): void {
  const existing = loadCharacterProfile() ?? DEFAULT_CHARACTER_PROFILE;
  saveCharacterProfile({
    ...existing,
    name: identity.name.trim() || 'Sinh viên',
    mssv: isValidMssv(identity.mssv) ? identity.mssv.trim() : '20226010',
  });
}

export function clearIdentity(): void {
  try {
    localStorage.removeItem(IDENTITY_KEY);
    localStorage.removeItem(CHARACTER_KEY);
  } catch {
    // ignore
  }
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/**
 * Định dạng chuẩn của `reconnectToken` sinh bằng CSPRNG:
 * tiền tố `rt-` nối với 32..64 ký tự hex chữ thường (>= 128 bit entropy, mặc định 192 bit = 48 hex).
 */
export const VALID_RECONNECT_TOKEN_RE = /^rt-[0-9a-f]{32,64}$/;

export function isValidReconnectToken(value: unknown): value is string {
  return typeof value === 'string' && VALID_RECONNECT_TOKEN_RE.test(value);
}

/**
 * Sinh `reconnectToken` bí mật mới bằng CSPRNG (`crypto.getRandomValues`, 24 bytes = 192-bit entropy).
 * Tuyệt đối không dùng `Math.random()` hoặc tái sử dụng `bkhn-session-id` cũ.
 */
export function generateSecureReconnectToken(): string {
  const bytes = new Uint8Array(24);
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new Error('CSPRNG (crypto.getRandomValues) is required to generate reconnectToken');
  }
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return `rt-${hex}`;
}

let fallbackMemoryReconnectToken: string | null = null;

function resolveStorage(explicit?: StorageLike | null): StorageLike | null {
  if (explicit) return explicit;
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage;
    }
  } catch {
    // localStorage blocked or unavailable
  }
  return null;
}

/**
 * Secret credential dùng riêng để xác thực kết nối lại (reconnect) với HskRoom.
 *
 * Bảo mật & Migration an toàn:
 * - Giá trị `bkhn-session-id` cũ (legacy) từng được broadcast công khai cho các client
 *   khác trong phòng trước PR9, nên TUYỆT ĐỐI KHÔNG bao giờ được tái sử dụng làm
 *   `reconnectToken` bí mật.
 * - Khi chưa có `bkhn-reconnect-token-v1` hợp lệ (hoặc khi phát hiện legacy `bkhn-session-id`),
 *   hàm luôn sinh secret mới bằng CSPRNG (`generateSecureReconnectToken()`), lưu vào
 *   `bkhn-reconnect-token-v1`, dẫn xuất `publicId = derivePublicPlayerId(token)` và ghi đè
 *   `bkhn-session-id` bằng `publicId` mới.
 * - Khi F5 tải lại trang và đã có `bkhn-reconnect-token-v1` hợp lệ, giữ nguyên secret
 *   để kết nối lại (reconnect) chính xác vào phiên hiện tại.
 */
export function getReconnectToken(storage?: StorageLike | null): string {
  const store = resolveStorage(storage);
  if (store) {
    try {
      const existingToken = store.getItem(RECONNECT_TOKEN_KEY);
      const existingSessionId = store.getItem(SESSION_KEY);

      if (
        isValidReconnectToken(existingToken) &&
        existingToken !== existingSessionId
      ) {
        const expectedPublicId = derivePublicPlayerId(existingToken);
        if (existingSessionId !== expectedPublicId) {
          store.setItem(SESSION_KEY, expectedPublicId);
        }
        return existingToken;
      }

      // Chưa có reconnectToken hợp lệ hoặc đang ở trạng thái legacy -> luôn sinh CSPRNG secret mới
      const freshToken = generateSecureReconnectToken();
      const freshPublicId = derivePublicPlayerId(freshToken);
      store.setItem(RECONNECT_TOKEN_KEY, freshToken);
      store.setItem(SESSION_KEY, freshPublicId);
      return freshToken;
    } catch {
      // Fallback sang bộ nhớ tạm nếu storage ném ngoại lệ (ví dụ Safari Private Mode quota)
    }
  }

  if (!isValidReconnectToken(fallbackMemoryReconnectToken)) {
    fallbackMemoryReconnectToken = generateSecureReconnectToken();
  }
  return fallbackMemoryReconnectToken;
}

/**
 * Mã định danh công khai của người chơi (`p-...`) dẫn xuất một chiều từ
 * `reconnectToken` — an toàn để hiển thị công khai trong phòng học mà không
 * thể dùng ngược lại để chiếm quyền phiên kết nối.
 */
export function getSessionId(storage?: StorageLike | null): string {
  const store = resolveStorage(storage);
  const token = getReconnectToken(store);
  const publicId = derivePublicPlayerId(token);
  if (store) {
    try {
      if (store.getItem(SESSION_KEY) !== publicId) {
        store.setItem(SESSION_KEY, publicId);
      }
    } catch {
      // ignore
    }
  }
  return publicId;
}
