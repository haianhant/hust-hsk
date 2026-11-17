// ---------------------------------------------------------------------------
// features/campus/ui/welcome-intro-state.ts — Trạng thái & nội dung Intro
// chào tân sinh viên lần đầu (lưu localStorage để từ lần sau không hiện lại).
// ---------------------------------------------------------------------------

export const CAMPUS_WELCOME_INTRO_STORAGE_KEY = 'bkhn-campus-intro-done-v1';

export interface CampusWelcomeStep {
  id: string;
  badge: string;
  title: string;
  body: string;
}

export const CAMPUS_WELCOME_STEPS: readonly CampusWelcomeStep[] = [
  {
    id: 'controls',
    badge: 'Bước 1/3 · Làm quen Cổng Trần Đại Nghĩa',
    title: 'Chào mừng {name} đến với Bách Khoa 3D!',
    body: 'Mình là Minh — sinh viên khóa trên đón bạn ngay phía trong Cổng Trần Đại Nghĩa. Dùng WASD (hoặc cần gạt cảm ứng) để đi bộ, kéo màn hình để xoay góc nhìn và nhấn E khi thấy gợi ý tương tác.',
  },
  {
    id: 'landmarks',
    badge: 'Bước 2/3 · Định hướng khuôn viên HUST',
    title: 'Từ Tòa C7 tới Thư viện & CLB Board Game',
    body: 'Ngay bên phải bạn là Đại sảnh kính Tòa C7. Đi thẳng đại lộ cây xanh sẽ tới Thư viện Tạ Quang Bửu 10 tầng, Hồ Tiền và Quảng trường C1; bấm Bản đồ góc trên-phải để Dịch chuyển nhanh tới KTX & CLB Board Game.',
  },
  {
    id: 'hud',
    badge: 'Bước 3/3 · Thanh công cụ gọn thoáng',
    title: 'Tập trung trải nghiệm, mở rộng khi cần',
    body: 'Hàng nút trên cùng giữ những tính năng dùng nhiều nhất: Tự học Pomodoro, Đổi 10 bộ đồng phục HUST và Thời gian. Toàn bộ Nhiệm vụ SV, Chụp ảnh, Lưu bút hay Chế độ HSK nằm gọn trong "⋯ Tiện ích".',
  },
] as const;

export function hasCompletedCampusIntro(
  storage?: Pick<Storage, 'getItem'> | null,
): boolean {
  try {
    if (!storage) return false;
    return storage.getItem(CAMPUS_WELCOME_INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markCampusIntroCompleted(
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    storage?.setItem(CAMPUS_WELCOME_INTRO_STORAGE_KEY, '1');
  } catch {
    // Bỏ qua nếu môi trường chặn localStorage (ví dụ duyệt web ẩn danh nghiêm ngặt)
  }
}
