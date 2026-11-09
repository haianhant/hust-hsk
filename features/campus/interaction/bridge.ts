// ---------------------------------------------------------------------------
// features/campus/interaction/bridge.ts — Cầu nối tương tác thế giới 3D (`__bkhn`)
// và hàm thuần phát hiện vật thể tương tác gần nhất theo thứ tự ưu tiên chuẩn.
// Module ID: feature.campus.interaction
// ---------------------------------------------------------------------------

import { CLASSROOM, CLASSROOM_DOOR, LIBRARY_DOOR, LIBRARY_LOBBY } from '../world-data';
import { findNearestLibrarySeat, SEAT_INTERACT_RADIUS } from './seat-interaction';

export const TOAST_MS = 2500;
export const SPEECH_RATES = [0.6, 0.8, 1.0] as const;
export const MINH_POS = { x: -72, z: -8.5 };
export const MINH_RADIUS = 2.5;

export type BkhnHook = {
  enterClassroom: () => void;
  exitClassroom: () => void;
  enterLibraryLobby?: () => void;
  exitLibraryLobby?: () => void;
  isInLibraryLobby?: () => boolean;
  teleport: (x: number, z: number, yaw?: number, pitch?: number) => void;
  getPos: () => { x: number; z: number };
  getYaw?: () => number;
  getPitch?: () => number;
  getBike?: () => {
    pos: { x: number; z: number };
    heading: number;
    speed: number;
    steer: number;
    lean: number;
    riding: boolean;
    instances: number;
  };
  mountBike?: () => { ok: boolean; reason?: string };
  dismountBike?: () => { ok: boolean; reason?: string };
  callBike?: () => { ok: boolean; reason?: string };
  recallBike?: () => { ok: boolean; reason?: string };
  setBikePose?: (x: number, z: number, heading: number) => void;
  fastTravel?: (destId: string) => { ok: boolean; reason?: string };
  getFastTravel?: () => { traveling: boolean; count: number; lastDestId: string | null };
  sitAtSeat?: (seatId: string) => {
    ok: boolean;
    reason?: string;
    message?: string;
    seatId?: string;
    label?: string;
  };
  standUp?: () => {
    ok: boolean;
    reason?: string;
    releasedSeatId?: string | null;
    pos?: { x: number; z: number };
  };
  getSeatState?: () => {
    seated: boolean;
    seatId: string | null;
    seatLabel: string | null;
    pos: { x: number; z: number };
    facing: number;
  };
  projectSeatToScreen?: (
    seatId: string,
  ) => { x: number; y: number; inFront: boolean } | null;
  setLibraryFloor?: (
    floor: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10,
    customX?: number,
    customZ?: number,
    customYaw?: number,
    customPitch?: number,
  ) => void;
  getLibraryFloor?: () => 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10;
  getLibrarySpatialDiagnostics?: () => unknown;
  setLibraryCollisionDebug?: (enabled: boolean) => boolean;
};

export function getHook(): BkhnHook | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __bkhn?: BkhnHook }).__bkhn;
}

export interface InteractableDetectionInput {
  pos: { x: number; z: number };
  inClassroom: boolean;
  inLibraryLobby: boolean;
  libraryFloor?: number;
  bikeRiding: boolean;
  bikeSpeed: number;
  bikePos: { x: number; z: number };
  questActive: boolean;
  questDoneBefore: boolean;
  anyQuestDone: boolean;
  stepId?: string;
  seated?: boolean;
  seatId?: string | null;
  occupiedByOtherSeatIds?: ReadonlySet<string>;
  pendingSeatId?: string | null;
}

export interface DetectedInteractable {
  id: string;
  label: string;
}

/**
 * Thứ tự ưu tiên prompt E — chỉ HIỆN ĐÚNG 1 prompt:
 *   1. Trong sảnh Thư viện Tầng 1 (`seat-stand-up`, `seat:<seatId>`, `lobby-statue`, `lobby-vocab-board`, `lobby-info-desk`)
 *   2. Đang lái xe ngoài sân → `bike-dismount`
 *   3. Đứng gần xe (≤ 2,2 m) ngoài sân → `bike-mount`
 *   4. Tương tác ngoài sân (`npc-minh`, `classroom-door`, `library-door`)
 *   5. Tương tác trong phòng học (`board`, `notebook`, `homework`)
 */
export function findNearestInteractable(
  input: InteractableDetectionInput,
): DetectedInteractable | null {
  const {
    pos,
    inClassroom,
    inLibraryLobby,
    libraryFloor = 1,
    bikeRiding,
    bikeSpeed,
    bikePos,
    questActive,
    questDoneBefore,
    anyQuestDone,
    stepId,
    seated = false,
    occupiedByOtherSeatIds,
    pendingSeatId = null,
  } = input;
  const dist = (x: number, z: number) => Math.hypot(pos.x - x, pos.z - z);

  if (inLibraryLobby) {
    if (seated) {
      return { id: 'seat-stand-up', label: 'E — Đứng dậy' };
    }
    if (libraryFloor !== 1) {
      return null;
    }
    const nearestSeat = findNearestLibrarySeat(pos, SEAT_INTERACT_RADIUS, libraryFloor);
    if (nearestSeat) {
      const sid = nearestSeat.seat.seatId;
      if (pendingSeatId === sid) {
        return {
          id: `seat:${sid}`,
          label: '⏳ Đang giữ chỗ...',
        };
      }
      if (occupiedByOtherSeatIds?.has(sid)) {
        return {
          id: `seat:${sid}`,
          label: '🔒 Ghế đang có người ngồi — hãy chọn ghế khác',
        };
      }
      return {
        id: `seat:${sid}`,
        label: 'E — Ngồi học',
      };
    }
    if (dist(LIBRARY_LOBBY.statue.x, LIBRARY_LOBBY.statue.z) <= 2.6) {
      return { id: 'lobby-statue', label: 'E — Tìm hiểu Tượng GS. Tạ Quang Bửu' };
    }
    if (dist(LIBRARY_LOBBY.vocabBoard.x, LIBRARY_LOBBY.vocabBoard.z) <= 2.4) {
      return { id: 'lobby-vocab-board', label: 'E — Xem bảng từ vựng Thư viện' };
    }
    if (dist(LIBRARY_LOBBY.infoDesk.x, LIBRARY_LOBBY.infoDesk.z) <= 2.4) {
      return { id: 'lobby-info-desk', label: 'E — Quầy thông tin & mượn sách' };
    }
    return null;
  }

  if (!inClassroom && bikeRiding) {
    return {
      id: 'bike-dismount',
      label:
        Math.abs(bikeSpeed) <= 0.5
          ? 'E — Xuống xe'
          : 'E — Xuống xe (chỉ khi dừng hẳn)',
    };
  }

  if (!inClassroom && dist(bikePos.x, bikePos.z) <= 2.2) {
    return { id: 'bike-mount', label: 'E — Lên xe' };
  }

  if (!inClassroom) {
    if (!questActive && !questDoneBefore && dist(MINH_POS.x, MINH_POS.z) <= MINH_RADIUS) {
      return { id: 'npc-minh', label: 'E — Nói chuyện với Minh' };
    }
    if (questActive && stepId === 'greet-minh' && dist(MINH_POS.x, MINH_POS.z) <= MINH_RADIUS) {
      return { id: 'npc-minh', label: 'E — Nói chuyện với Minh' };
    }
    if (
      ((questActive && stepId === 'goto-door') || anyQuestDone) &&
      dist(CLASSROOM_DOOR.pos.x, CLASSROOM_DOOR.pos.z) <= CLASSROOM_DOOR.triggerRadius
    ) {
      return { id: 'classroom-door', label: 'E — Vào phòng học' };
    }
    if (dist(LIBRARY_DOOR.pos.x, LIBRARY_DOOR.pos.z) <= LIBRARY_DOOR.triggerRadius) {
      return { id: 'library-door', label: 'E — Vào sảnh Thư viện Tạ Quang Bửu' };
    }
    return null;
  }

  if (questActive && stepId === 'find-board' && dist(CLASSROOM.board.x, CLASSROOM.board.z) <= 2.5) {
    return { id: 'board', label: 'E — Chọn bảng đen' };
  }
  if (
    questActive &&
    stepId === 'open-notebook' &&
    dist(CLASSROOM.notebook.x, CLASSROOM.notebook.z) <= 2
  ) {
    return { id: 'notebook', label: 'E — Mở vở ghi chép' };
  }
  if (
    questActive &&
    stepId === 'take-homework' &&
    dist(CLASSROOM.homework.x, CLASSROOM.homework.z) <= 2
  ) {
    return { id: 'homework', label: 'E — Nhận bài tập' };
  }

  return null;
}
