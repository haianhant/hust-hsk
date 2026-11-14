// ---------------------------------------------------------------------------
// features/campus/interaction/bridge.ts — Cầu nối tương tác thế giới 3D (`__bkhn`)
// và hàm thuần phát hiện vật thể tương tác gần nhất theo thứ tự ưu tiên chuẩn.
// Module ID: feature.campus.interaction
// ---------------------------------------------------------------------------

import {
  BOARD_GAME_CLUB_DOOR,
  BOARD_GAME_LOUNGE,
  BOARD_GAME_SEATS,
  type BoardGameSeatSpec,
  C7_DOOR,
  CAMPUS_DRINK_STALLS,
  CAMPUS_FOOTBALL_PITCH,
  CAMPUS_MEMORY_BOARDS,
  CLASSROOM,
  CLASSROOM_DOOR,
  LIBRARY_DOOR,
  LIBRARY_LOBBY,
  OUTDOOR_SITTABLE_BENCHES,
} from '../world-data';
import { findNearestCheckinLandmark } from '../checkin/campus-passport';
import { findNearestLibrarySeat, SEAT_INTERACT_RADIUS } from './seat-interaction';

export const TOAST_MS = 2500;
export const SPEECH_RATES = [0.6, 0.8, 1.0] as const;
export const MINH_POS = { x: -72, z: -8.5 };
export const MINH_RADIUS = 2.5;

export type BkhnHook = {
  enterClassroom: (origin?: 'c7' | 'c1') => void;
  exitClassroom: () => void;
  enterLibraryLobby?: () => void;
  exitLibraryLobby?: () => void;
  isInLibraryLobby?: () => boolean;
  enterBoardGameClub?: () => void;
  exitBoardGameClub?: () => void;
  isInBoardGameClub?: () => boolean;
  sitAtBoardGameSeat?: (seatId: string) => {
    ok: boolean;
    reason?: string;
    seatId?: string;
    tableId?: string;
    label?: string;
  };
  standUpBoardGameSeat?: () => {
    ok: boolean;
    releasedSeatId?: string | null;
    pos?: { x: number; z: number };
  };
  getBoardGameSeatState?: () => {
    seated: boolean;
    seatId: string | null;
    tableId: string | null;
    pos: { x: number; z: number };
  };
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
  setViewMode?: (mode: 'follow' | 'pov' | 'top') => void;
  getViewMode?: () => 'follow' | 'pov' | 'top';
  togglePov?: () => 'follow' | 'pov';
  sitOutdoorBench?: (benchId: string) => { ok: boolean; reason?: string; label?: string };
  standUpOutdoorBench?: () => { ok: boolean; reason?: string };
};

export function getHook(): BkhnHook | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __bkhn?: BkhnHook }).__bkhn;
}

export interface InteractableDetectionInput {
  pos: { x: number; z: number };
  inClassroom: boolean;
  inLibraryLobby: boolean;
  inBoardGameClub?: boolean;
  libraryFloor?: number;
  boardGameSeatId?: string | null;
  occupiedBoardGameSeatIds?: ReadonlySet<string>;
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
  /** ID ghế đá sân trường đang ngồi (nếu có). */
  outdoorBenchId?: string | null;
  /** Tọa độ quả bóng đá tại SVĐ Bách Khoa. */
  footballPos?: { x: number; z: number } | null;
  /** Mặc định `true` khi bỏ trống để tương thích ngược bộ unit test HSK; `app/page.tsx` truyền tường minh trạng thái `hskMode`. */
  hskMode?: boolean;
}

export interface DetectedInteractable {
  id: string;
  label: string;
}

/**
 * Phát hiện người chơi đang đứng trước cửa Thang máy Thư viện Tạ Quang Bửu ở tầng hiện tại.
 */
export function isNearLibraryElevator(pos: { x: number; z: number }, libraryFloor = 1): boolean {
  if (libraryFloor >= 1 && libraryFloor <= 5) {
    // Khối A (Tầng 1–5): cụm 3 thang máy ở tường Đông (x ≈ 19.28, z ∈ [-2.9, 2.9])
    return pos.x >= 16.2 && pos.x <= 20.5 && Math.abs(pos.z) <= 4.0;
  }
  if (libraryFloor === 6 || libraryFloor === 7) {
    // Khối B (Tầng 6–7): cụm 3 thang máy ở vòm Đông (x ≈ 23.77, z ∈ [-3.6, 3.6])
    return pos.x >= 20.0 && pos.x <= 24.5 && Math.abs(pos.z) <= 4.4;
  }
  if (libraryFloor === 10) {
    // Khối D (Sân thượng Tầng 10): 2 cửa thang máy ở mặt Nam phòng kỹ thuật (x = ±2.4, z = -3.34)
    return (
      Math.hypot(pos.x + 2.4, pos.z + 3.34) <= 2.1 ||
      Math.hypot(pos.x - 2.4, pos.z + 3.34) <= 2.1
    );
  }
  return false;
}

/**
 * Thứ tự ưu tiên prompt E — chỉ HIỆN ĐÚNG 1 prompt:
 *   1. Trong Thư viện Tạ Quang Bửu Tầng 1–10 (`seat-stand-up`, `seat:<seatId>`, `library-elevator`, `lobby-*`, `piano-6f`, `telescope-10f`)
 *   2. Đang lái xe ngoài sân → `bike-dismount`
 *   3. Đứng gần xe (≤ 2,2 m) ngoài sân → `bike-mount`
 *   4. Tương tác ngoài sân (`npc-minh`, `classroom-door`, `library-door`)
 *   5. Tương tác trong phòng học (`board`, `notebook`, `homework`)
 */
export function findNearestBoardGameSeat(
  pos: { x: number; z: number },
  maxRadius = 1.45,
): { seat: BoardGameSeatSpec; dist: number } | null {
  let best: { seat: BoardGameSeatSpec; dist: number } | null = null;
  for (const seat of BOARD_GAME_SEATS) {
    const d = Math.hypot(pos.x - seat.x, pos.z - seat.z);
    if (d <= maxRadius && (!best || d < best.dist)) {
      best = { seat, dist: d };
    }
  }
  return best;
}

export function findNearestInteractable(
  input: InteractableDetectionInput,
): DetectedInteractable | null {
  const {
    pos,
    inClassroom,
    inLibraryLobby,
    inBoardGameClub = false,
    libraryFloor = 1,
    bikeRiding,
    bikeSpeed,
    bikePos,
    questActive,
    questDoneBefore,
    anyQuestDone,
    stepId,
    seated = false,
    boardGameSeatId = null,
    occupiedByOtherSeatIds,
    occupiedBoardGameSeatIds,
    pendingSeatId = null,
    outdoorBenchId = null,
    footballPos = null,
    hskMode = true,
  } = input;
  const dist = (x: number, z: number) => Math.hypot(pos.x - x, pos.z - z);

  if (inBoardGameClub) {
    if (boardGameSeatId) {
      return { id: 'bg-seat-stand-up', label: 'E — Đứng dậy khỏi bàn chơi' };
    }
    const nearBgSeat = findNearestBoardGameSeat(pos);
    if (nearBgSeat) {
      const sid = nearBgSeat.seat.seatId;
      if (occupiedBoardGameSeatIds?.has(sid)) {
        return {
          id: `bg-seat:${sid}`,
          label: '🔒 Ghế đang có người ngồi — hãy chọn ghế khác',
        };
      }
      return {
        id: `bg-seat:${sid}`,
        label: `E — Ngồi vào ${nearBgSeat.seat.label}`,
      };
    }
    if (dist(BOARD_GAME_LOUNGE.infoBoardPos.x, BOARD_GAME_LOUNGE.infoBoardPos.z) <= BOARD_GAME_LOUNGE.infoTriggerRadius) {
      return { id: 'boardgame-info', label: 'E — Xem Bảng thông tin & Luật Bóng Đêm KTX' };
    }
    if (dist(BOARD_GAME_LOUNGE.exitDoorPos.x, BOARD_GAME_LOUNGE.exitDoorPos.z) <= BOARD_GAME_LOUNGE.exitTriggerRadius) {
      return { id: 'boardgame-exit', label: 'E — Rời CLB Board Game ra sân KTX' };
    }
    return null;
  }

  if (inLibraryLobby) {
    if (seated) {
      return { id: 'seat-stand-up', label: 'E — Đứng dậy' };
    }
    if (isNearLibraryElevator(pos, libraryFloor)) {
      return {
        id: 'library-elevator',
        label: 'E — Sử dụng Thang máy Thư viện (T1–T10)',
      };
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
      if (sid === 'tqb-6f-piano-bench') {
        return {
          id: 'piano-6f',
          label: 'E — Ngồi đánh đàn Đại dương cầm Grand Piano',
        };
      }
      if (sid.startsWith('tqb-10f-bed-') || sid.startsWith('tqb-10f-lounger-')) {
        return {
          id: `seat:${sid}`,
          label: 'E — Nằm lên giường & gối mềm thư giãn ngắm cảnh',
        };
      }
      return {
        id: `seat:${sid}`,
        label: 'E — Ngồi học',
      };
    }
    if (libraryFloor === 1) {
      if (dist(LIBRARY_LOBBY.statue.x, LIBRARY_LOBBY.statue.z) <= 2.6) {
        return { id: 'lobby-statue', label: 'E — Tìm hiểu Tượng GS. Tạ Quang Bửu' };
      }
      if (hskMode && dist(LIBRARY_LOBBY.vocabBoard.x, LIBRARY_LOBBY.vocabBoard.z) <= 2.4) {
        return { id: 'lobby-vocab-board', label: 'E — Xem bảng từ vựng Thư viện' };
      }
      if (dist(LIBRARY_LOBBY.infoDesk.x, LIBRARY_LOBBY.infoDesk.z) <= 2.4) {
        return { id: 'lobby-info-desk', label: 'E — Quầy thông tin & mượn sách' };
      }
    }
    if (libraryFloor === 6 && dist(-6.6, 3.6) <= 2.5) {
      return { id: 'piano-6f', label: 'E — Chơi đàn Đại dương cầm Grand Piano' };
    }
    if (libraryFloor === 10 && dist(15.4, 0.6) <= 2.5) {
      return { id: 'telescope-10f', label: 'E — Ngắm bầu trời sao qua Kính thiên văn' };
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
    if (outdoorBenchId) {
      return { id: 'bench-stand-up', label: 'E — Đứng dậy khỏi ghế' };
    }
    if (hskMode) {
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
    }
    if (dist(LIBRARY_DOOR.pos.x, LIBRARY_DOOR.pos.z) <= LIBRARY_DOOR.triggerRadius) {
      return { id: 'library-door', label: 'E — Vào sảnh Thư viện Tạ Quang Bửu' };
    }
    if (dist(BOARD_GAME_CLUB_DOOR.pos.x, BOARD_GAME_CLUB_DOOR.pos.z) <= BOARD_GAME_CLUB_DOOR.triggerRadius) {
      return { id: 'boardgame-door', label: '🎲 Nhấn E — Vào CLB Board Game' };
    }
    if (dist(C7_DOOR.pos.x, C7_DOOR.pos.z) <= C7_DOOR.triggerRadius) {
      return {
        id: 'c7-door',
        label: hskMode
          ? 'E — Vào Giảng đường Tòa C7 (Học HSK theo bài)'
          : 'E — Bật Chế độ HSK & Vào Giảng đường Tòa C7',
      };
    }
    const nearCheckin = findNearestCheckinLandmark(pos);
    if (nearCheckin) {
      return {
        id: `checkin:${nearCheckin.id}`,
        label:
          !hskMode && nearCheckin.id === 'c7'
            ? 'E — Khám phá & Check-in Tòa C7'
            : nearCheckin.promptLabel,
      };
    }
    if (
      footballPos &&
      dist(footballPos.x, footballPos.z) <= CAMPUS_FOOTBALL_PITCH.kickInteractRadius
    ) {
      return { id: 'football-kick', label: 'E — Sút bóng mạnh về phía trước' };
    }
    for (const stall of CAMPUS_DRINK_STALLS) {
      if (dist(stall.x, stall.z) <= 2.6) {
        return { id: `drink-stall:${stall.id}`, label: stall.promptLabel };
      }
    }
    for (const board of CAMPUS_MEMORY_BOARDS) {
      if (dist(board.x, board.z) <= 2.6) {
        return { id: `memory-board:${board.id}`, label: board.promptLabel };
      }
    }
    let nearestBench: (typeof OUTDOOR_SITTABLE_BENCHES)[number] | null = null;
    let nearestBenchDist = 2.2;
    for (const bench of OUTDOOR_SITTABLE_BENCHES) {
      const bd = dist(bench.seatPos.x, bench.seatPos.z);
      if (bd <= nearestBenchDist) {
        nearestBenchDist = bd;
        nearestBench = bench;
      }
    }
    if (nearestBench) {
      return {
        id: `bench:${nearestBench.id}`,
        label: `E — Ngồi nghỉ tại ${nearestBench.label}`,
      };
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
