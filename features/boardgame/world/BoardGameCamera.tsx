// ---------------------------------------------------------------------------
// features/boardgame/world/BoardGameCamera.tsx — Giới hạn camera indoor
// cho Phòng Sinh Hoạt Chung CLB Board Game KTX (tránh lọt xuyên tường/trần).
// ---------------------------------------------------------------------------

import { BOARD_GAME_LOUNGE, BOARD_GAME_TABLES, type BoardGameTableId } from '../../campus/world-data';

export const BOARD_GAME_CAMERA_LIMITS = {
  minX: BOARD_GAME_LOUNGE.wallBounds.minX + 0.5, // -6.85
  maxX: BOARD_GAME_LOUNGE.wallBounds.maxX - 0.5, // +6.85
  minZ: BOARD_GAME_LOUNGE.wallBounds.minZ + 0.5, // -5.05
  maxZ: BOARD_GAME_LOUNGE.wallBounds.maxZ - 0.5, // +5.05
  minY: 0.28,
  maxY: BOARD_GAME_LOUNGE.wallBounds.height - 0.28, // 3.32
  maxFollowDistance: 3.8,
} as const;

/** Giữ camera nằm hoàn toàn bên trong 4 bức tường & trần phòng CLB Board Game. */
export function clampBoardGameLoungeCamera(pos: {
  x: number;
  y: number;
  z: number;
}): { x: number; y: number; z: number } {
  return {
    x: Math.max(BOARD_GAME_CAMERA_LIMITS.minX, Math.min(BOARD_GAME_CAMERA_LIMITS.maxX, pos.x)),
    y: Math.max(BOARD_GAME_CAMERA_LIMITS.minY, Math.min(BOARD_GAME_CAMERA_LIMITS.maxY, pos.y)),
    z: Math.max(BOARD_GAME_CAMERA_LIMITS.minZ, Math.min(BOARD_GAME_CAMERA_LIMITS.maxZ, pos.z)),
  };
}

export function computeBoardGameTableOverviewPose(tableId: BoardGameTableId): {
  pos: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
} {
  const table = BOARD_GAME_TABLES.find((t) => t.tableId === tableId) ?? BOARD_GAME_TABLES[0];
  return {
    pos: clampBoardGameLoungeCamera({
      x: table.center.x,
      y: 2.35,
      z: table.center.z + 2.85,
    }),
    lookAt: {
      x: table.center.x,
      y: 0.85,
      z: table.center.z,
    },
  };
}
