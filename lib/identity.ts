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
  isAvatarGender,
  isAvatarHairStyle,
  isAvatarOutfitId,
} from '../shared/contracts/multiplayer';

export { MSSV_RE };

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

/** Session id ổn định theo trình duyệt — để server nhận ra khi kết nối lại. */
export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
