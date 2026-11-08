// Trạng thái chạy chia sẻ giữa Player (3D, cập nhật mỗi frame) và HUD/Minimap (DOM).
// Dùng object mutable thay vì React state để tránh re-render mỗi frame.
import { SPAWN, nearestZone, type Vec2 } from './campus';
import type {
  AvatarGender,
  AvatarHairStyle,
  AvatarOutfitId,
} from '../shared/contracts/multiplayer';

export type { AvatarGender, AvatarHairStyle, AvatarOutfitId };

export const playerInput = {
  /** vector di chuyển từ phím hoặc joystick: x = phải/trái, y = tiến/lùi (theo hướng camera) */
  move: { x: 0, y: 0 },
  run: false,
  /** delta xoay camera do kéo chuột / vùng xoay phải (radian, cộng dồn rồi reset) */
  lookDelta: { x: 0, y: 0 },
  /** tăng mỗi lần bấm "Về vị trí an toàn" — Player theo dõi để reset vị trí */
  resetToken: 0,
};

/**
 * Đợt 3 giai đoạn 4 — trạng thái xe máy (1 xe cá nhân duy nhất).
 * Player là nguồn thật duy nhất ghi vào đây mỗi frame; Motorbike.tsx chỉ
 * ĐỌC để vẽ; page.tsx chỉ ĐỌC để hiện HUD/nút (gọi xe qua hook __bkhn).
 */
export const bikeState = {
  /** vị trí tâm xe trên mặt đất (giữa 2 bánh) */
  pos: { x: -70, z: 14.5 } as Vec2,
  /** hướng đầu xe: forward = (sin heading, cos heading), cùng quy ước facing của Player */
  heading: Math.PI / 2,
  /** vận tốc dọc thân xe (m/s, âm = lùi chậm), HUD hiển thị nếu cần */
  speed: 0,
  /** góc lái bánh trước hiện tại (rad, + = rẽ trái) */
  steer: 0,
  /** độ nghiêng thân khi rẽ (rad, để Motorbike vẽ) */
  lean: 0,
  /** true khi người chơi đang ngồi trên xe */
  riding: false,
  /** số instance xe đang mount trong scene — luôn phải = 1 (gọi xe không nhân bản) */
  instances: 0,
  /** thông báo một lần cho HUD (vd chặn ở cửa phòng học): {id, text} */
  notice: null as { id: number; text: string } | null,
};

/** Input lái trên mobile (nút ga/phanh/lái giữ): page.tsx ghi, Player đọc. */
export const bikeInput = {
  /** 0..1 — giữ nút ga */
  throttle: 0,
  /** 0..1 — giữ nút phanh */
  brake: 0,
  /** -1..1 — giữ nút lái trái/phải */
  steer: 0,
};

/**
 * Đợt 3 giai đoạn 5 — trạng thái dịch chuyển nhanh (1 lần chuyển cảnh tại
 * một thời điểm). Player là nguồn thật duy nhất ghi vào đây; page.tsx chỉ
 * ĐỌC/đặt cờ qua hook __bkhn.fastTravel để chặn bấm chồng.
 */
export const fastTravelState = {
  /** true trong lúc đang chuyển cảnh (fade + đặt người xuống) — bấm thêm bị từ chối với reason 'busy' */
  traveling: false,
  /** số lần dịch chuyển đã thực hiện trong phiên (test chống bấm chồng đếm cái này) */
  count: 0,
  /** id điểm đến của lần dịch chuyển gần nhất */
  lastDestId: null as string | null,
};

export type TimeOfDay = 'day' | 'sunset' | 'night';

export const playerState = {
  pos: { ...SPAWN } as Vec2,
  zone: 'Cổng Parabol',
  moving: false,
  /** số lần va chạm (đếm trong Player) — chỉ để HUD debug, không phải điểm */
  collisions: 0,
  /** chế độ camera: 'follow' (chơi) hay 'top' (nhìn từ trên cao, test hook) —
   *  HUD tự ẩn hộp hướng dẫn khi ở top-view để khỏi che khung cảnh. */
  viewMode: 'follow' as 'follow' | 'top',
  /** độ phủ lá + bèo trên Hồ Tiền (0..1), đo thật bằng rasterization trong
   *  LotusField — mục tiêu 0,70–0,80. 0 = chưa đo. */
  lakeCoverage: 0,
  /** Bước 5 — true khi panel học/hộp thoại đang mở: Player không nhận di
   *  chuyển (cả phím lẫn joystick) và không xử lý E. */
  uiLocked: false,
  /** Bước 5 — true khi đang ở phòng học mô phỏng (mode phòng học, tọa độ
   *  cục bộ CLASSROOM thay cho campus). */
  inClassroom: false,
  /** Giai đoạn 4 — true khi đang ở Sảnh tầng 1 Thư viện Tạ Quang Bửu (tọa độ cục bộ LIBRARY_LOBBY). */
  inLibraryLobby: false,
  /** Giai đoạn 2 — chế độ thời gian ngày / hoàng hôn / đêm. */
  timeOfDay: 'day' as TimeOfDay,
  /** Việc 2 — Hệ thống nhân vật & đồng phục sinh viên Bách khoa. */
  avatarName: 'Sinh viên',
  avatarGender: 'male' as AvatarGender,
  avatarHairStyle: 'short' as AvatarHairStyle,
  avatarOutfit: 'windbreaker-hust' as AvatarOutfitId,
  avatarSkirt: false,
  avatarBackpack: true,
  avatarGlasses: false,
  avatarLanyard: true,
  /**
   * Góc camera (yaw/pitch, radian) đã lưu — Player khởi tạo từ đây khi
   * mount (reload trong phòng khôi phục đúng hướng nhìn, F5b) và ghi đè
   * mỗi frame; page lưu vào questState.yaw/pitch khi ở trong phòng.
   * null = dùng mặc định (yaw -π/2 hướng đông ngoài sân, pitch 0.18).
   */
  cameraYaw: null as number | null,
  cameraPitch: null as number | null,
  /**
   * Đợt 5 multiplayer — hướng nhân vật đang quay (radian, cùng quy ước
   * facing của Player: forward = (sin f, cos f)) và trạng thái đang lái
   * xe. Player ghi đè mỗi frame; cầu nối multiplayer (page.tsx) đọc để
   * gửi lên server. Chỉ dùng cho hiển thị người chơi khác, không ảnh
   * hưởng gameplay hay điểm số.
   */
  facing: -Math.PI / 2,
  riding: false,
};

export function updatePlayerState(pos: Vec2, moving: boolean): void {
  playerState.pos = pos;
  playerState.zone = nearestZone(pos);
  playerState.moving = moving;
}
