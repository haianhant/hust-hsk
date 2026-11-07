// ---------------------------------------------------------------------------
// lib/identity.ts — Tên + MSSV của người chơi (đợt 5 multiplayer).
// - Hỏi một lần ở màn hình vào, lưu localStorage để lần sau khỏi nhập lại.
// - MSSV đúng định dạng HUST: 8 chữ số (vd 20226010). Tên 1..30 ký tự.
// - KHÔNG hardcode tên/MSSV của bất kỳ ai vào code.
// - Identity chỉ dùng để hiển thị bảng tên "Tên (MSSV)" trong trường và
//   để server hash màu áo — không đồng bộ điểm/quest/SRS.
// ---------------------------------------------------------------------------

export interface Identity {
  name: string;
  mssv: string;
}

export const IDENTITY_KEY = 'bkhn-identity-v1';
export const SESSION_KEY = 'bkhn-session-id';

export const MSSV_RE = /^\d{8}$/;

export function isValidMssv(mssv: string): boolean {
  return MSSV_RE.test(mssv.trim());
}

export function isValidName(name: string): boolean {
  const t = name.trim();
  return t.length >= 1 && t.length <= 30;
}

export function validateIdentity(name: string, mssv: string): string | null {
  if (!isValidName(name)) return 'Tên phải từ 1 đến 30 ký tự.';
  if (!isValidMssv(mssv)) return 'MSSV phải là 8 chữ số (vd 20226010).';
  return null;
}

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (typeof parsed.name !== 'string' || typeof parsed.mssv !== 'string') return null;
    if (!isValidName(parsed.name) || !isValidMssv(parsed.mssv)) return null;
    return { name: parsed.name.trim(), mssv: parsed.mssv.trim() };
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity): void {
  try {
    localStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({ name: identity.name.trim(), mssv: identity.mssv.trim() }),
    );
  } catch {
    // localStorage đầy/bị chặn: lần sau nhập lại, không chặn vào trường.
  }
}

export function clearIdentity(): void {
  try {
    localStorage.removeItem(IDENTITY_KEY);
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
