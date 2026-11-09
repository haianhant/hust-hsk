// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/geometry.ts — Canonical pure-TS
// spatial geometry (dimensions, walkable surfaces, doorways, stairs, columns,
// furniture & room colliders) for Tạ Quang Bửu Library Floors 1–10.
// Shared by procedural 3D builders and runtime collision/elevation resolvers.
// ---------------------------------------------------------------------------

import { STUDY_SEATS } from '../../../../shared/contracts/study';
import { LIBRARY_LOBBY } from '../buildings';
import { getBlockForFloor, getFloorBaseElevation } from './floors';
import type {
  CurvedStairFlight,
  DoorwayOpening,
  LibraryFloor,
  LibraryFurniturePlacement,
  LibraryFurniturePropKind,
  LibraryInteractionAnchor,
  SpatialCollider,
  WalkableSurface,
} from './types';

// ── 1. Canonical Block Dimensions ──────────────────────────────────────────

export const BLOCK_A_DIMS = {
  FH: 4.5,
  NF: 5,
  TH: 22.5,
  XW: 19.5,
  ZB: -13.0,
  ZF: 13.0,
  L: 6.5,
  FR: 7.5,
  SLAB: 0.28,
  RAIL_H: 1.05,
  R4Z: -23.8,
} as const;

export const BOOK_LENDING_ROOM_DIMS = {
  x0: -26.0,
  x1: -19.5,
  z0: -2.2,
  z1: 5.8,
  doorZ: 1.8,
  doorW: 5.4,
  /** Counter placed along x = -20.05 on the South portion of the window, leaving a 1.55m North entry passage z ∈ [-0.9, 0.65]. */
  counterX: -20.05,
  counterW: 0.78,
  counterZ0: 0.65,
  counterZ1: 4.25,
  shelfX: -23.95,
  shelfZs: [-0.65, 0.9, 2.7, 4.25] as const,
  westShelfX: -25.45,
  westShelfZs: [0.3, 3.3] as const,
  shelfW: 2.4,
  shelfD: 0.42,
} as const;

/**
 * Local-space bounding dimensions of each shared InstancedMesh furniture prop
 * in `buildFloors1To5.ts`, matching the procedural mesh geometry 1:1.
 */
export const PROP_DIMENSIONS = {
  table4: { minLX: -0.75, maxLX: 0.75, minLZ: -0.68, maxLZ: 0.68, height: 0.88 },
  round4: { radius: 0.92, height: 0.88 },
  sofa: { minLX: -0.93, maxLX: 0.93, minLZ: -0.39, maxLZ: 1.18, height: 0.88 },
  armchair: { minLX: -0.38, maxLX: 0.38, minLZ: -0.36, maxLZ: 0.36, height: 0.84 },
  shelf: { minLX: -1.20, maxLX: 1.20, minLZ: -0.21, maxLZ: 0.21, height: 2.15 },
} as const;

export const ROOM_401_DIMS = {
  S: 0.6,
  RW: 28.8,
  RD: 21.6,
  RH: 3.72,
  HW: 14.4,
  HD: 10.8,
  WT: 0.21,
  R4Z: -23.8,
  DOOR_X: -10.8,
  DOOR_W: 2.64,
  DOOR_H: 2.4,
  TX: [-9.6, -5.04, 5.04, 9.6] as const,
  TZ_LOCAL: [-4.56, 0.96, 6.48] as const,
  TW: 2.88,
  TD: 2.64,
  TH: 0.78,
  STACK_W: 0.66,
  STACK_D: 3.24,
  STACK_H: 2.28,
  STACK_X: [-12.0, -10.08, -8.16, -6.24, -4.32, -2.4] as const,
  /** Properly scaled inside the North-West quadrant of Room 401/501 (`z_local = -8.28`, `z_blockA = -32.08`). */
  STACK_Z_LOCAL: -8.28,
  COMP_W: 14.52,
  COMP_R: 9.6,
  COMP_CD: 0.66,
  DESK_X: -5.8,
  DESK_Z_LOCAL: 8.6,
  DESK_W: 3.12,
  DESK_D: 1.68,
  INNER_COLS_X: [-5.04, 5.04] as const,
  INNER_COLS_Z_LOCAL: [-2.4, 3.6] as const,
} as const;

export const BLOCK_B_DIMS = {
  L: 7.5,
  WR: 16.5,
  FR: 11.0,
  PR: 9.5,
  PY: 0.6,
  MZ: 5.25,
  H: 9.6,
  DESK: { x: 0, z: -11.2, r: 2.32 },
  PIANO: { x: -6.6, z: 3.6, halfW: 0.95, halfD: 1.05 },
  BOAT: { x: 2.2, z: -1.2, halfW: 2.55, halfD: 0.92 },
} as const;

export const BLOCK_D_DIMS = {
  X0: -22.4,
  X1: 22.4,
  Z0: -8.6,
  Z1: 8.6,
  KS: { x0: -5.2, x1: 5.2, z0: -8.2, z1: -3.4, h: 3.6 },
  PG: { x0: -6.8, x1: 6.8, z0: 2.2, z1: 7.4, h: 3.1, tableXs: [-4.2, 0, 4.2] as const, tableZ: 4.8 },
  SD: { x: 14.8, z: 0.4, r: 4.2, y: 0.18 },
  STAR_MAP: { x: 11.8, z: -2.5, halfW: 0.75, halfD: 0.32 },
  TELESCOPE: { x: 15.4, z: 0.6, r: 0.62 },
} as const;

export const ATRIUM_COLUMNS: ReadonlyArray<{ id: string; x: number; z: number; radius: number }> = [
  { id: 'atrium-col-west-end', x: -13.85, z: 0, radius: 0.42 },
  { id: 'atrium-col-east-end', x: 13.85, z: 0, radius: 0.42 },
  { id: 'atrium-col-nw', x: -6.5, z: -7.8, radius: 0.42 },
  { id: 'atrium-col-n-mid', x: 0, z: -7.8, radius: 0.42 },
  { id: 'atrium-col-ne', x: 6.5, z: -7.8, radius: 0.42 },
  { id: 'atrium-col-sw', x: -6.5, z: 7.8, radius: 0.42 },
  { id: 'atrium-col-s-mid', x: 0, z: 7.8, radius: 0.42 },
  { id: 'atrium-col-se', x: 6.5, z: 7.8, radius: 0.42 },
];

export const CURVED_STAIRS: readonly CurvedStairFlight[] = [
  {
    id: 'stair-1f-2f-east',
    name: 'Thang xoắn đôi Cánh Đông (T1 ↔ T2)',
    block: 'A',
    fromFloor: 1,
    toFloor: 2,
    side: 1,
    centerX: BLOCK_A_DIMS.L,
    centerZ: 0,
    innerRadius: 7.55,
    outerRadius: 9.35,
    midRadius: 8.45,
    width: 1.8,
    startAngle: -0.34,
    endAngle: 0.34,
    bottomY: 0.0,
    topY: BLOCK_A_DIMS.FH,
  },
  {
    id: 'stair-1f-2f-west',
    name: 'Thang xoắn đôi Cánh Tây (T1 ↔ T2)',
    block: 'A',
    fromFloor: 1,
    toFloor: 2,
    side: -1,
    centerX: -BLOCK_A_DIMS.L,
    centerZ: 0,
    innerRadius: 7.55,
    outerRadius: 9.35,
    midRadius: 8.45,
    width: 1.8,
    startAngle: Math.PI - 0.34,
    endAngle: Math.PI + 0.34,
    bottomY: 0.0,
    topY: BLOCK_A_DIMS.FH,
  },
] as const;

// ── 2. Stadium & Point-in-Surface Geometry Helpers ─────────────────────────

/**
 * Evaluates a point `(x, z)` along the perimeter of a horizontal stadium
 * with straight half-length `halfStraight` and semicircle radius `radius`
 * at normalized parameter `s ∈ [0, 1)`.
 */
export function stadiumPointAt(
  s: number,
  halfStraight: number,
  radius: number,
): { x: number; z: number; nx: number; nz: number; tx: number; tz: number } {
  const L = halfStraight;
  const str = 2 * L;
  const arc = Math.PI * radius;
  const perim = 2 * str + 2 * arc;
  let d = (((s % 1) + 1) % 1) * perim;
  if (d < str) {
    return { x: -L + d, z: -radius, nx: 0, nz: -1, tx: 1, tz: 0 };
  }
  d -= str;
  if (d < arc) {
    const a = -Math.PI / 2 + (d / arc) * Math.PI;
    return {
      x: L + Math.cos(a) * radius,
      z: Math.sin(a) * radius,
      nx: Math.cos(a),
      nz: Math.sin(a),
      tx: -Math.sin(a),
      tz: Math.cos(a),
    };
  }
  d -= arc;
  if (d < str) {
    return { x: L - d, z: radius, nx: 0, nz: 1, tx: -1, tz: 0 };
  }
  d -= str;
  const a = Math.PI / 2 + (d / arc) * Math.PI;
  return {
    x: -L + Math.cos(a) * radius,
    z: Math.sin(a) * radius,
    nx: Math.cos(a),
    nz: Math.sin(a),
    tx: -Math.sin(a),
    tz: Math.cos(a),
  };
}

/**
 * Signed distance from `(x, z)` to a horizontal stadium centered at `(0, 0)`
 * with straight half-length `halfStraight` and semicircle radius `radius`.
 * Negative inside the stadium, positive outside.
 */
export function signedDistanceToStadium(
  x: number,
  z: number,
  halfStraight: number,
  radius: number,
): { signedDist: number; clampedX: number; dx: number; dz: number; distFromAxis: number } {
  const clampedX = Math.max(-halfStraight, Math.min(halfStraight, x));
  const dx = x - clampedX;
  const dz = z;
  const distFromAxis = Math.hypot(dx, dz);
  return {
    signedDist: distFromAxis - radius,
    clampedX,
    dx,
    dz,
    distFromAxis,
  };
}

export const BLOCK_B_COLUMNS: ReadonlyArray<{ id: string; x: number; z: number; radius: number }> =
  Array.from({ length: 12 }, (_, i) => {
    const p = stadiumPointAt(i / 12, BLOCK_B_DIMS.L, BLOCK_B_DIMS.FR + 0.55);
    return {
      id: `block-b-col-${i + 1}`,
      x: Number(p.x.toFixed(3)),
      z: Number(p.z.toFixed(3)),
      radius: 0.38,
    };
  });

// ── 3. Canonical Doorways (Floor 1 & Floors 4–5) ───────────────────────────

export const FLOOR_1_DOORS: readonly DoorwayOpening[] = [
  {
    id: 'door-1f-borrow-102',
    name: 'Cửa Phòng Mượn Giáo Trình P.102',
    block: 'A',
    floor: 1,
    wallAxis: 'z',
    wallCoord: -BLOCK_A_DIMS.XW,
    center: BOOK_LENDING_ROOM_DIMS.doorZ,
    width: BOOK_LENDING_ROOM_DIMS.doorW,
    height: 2.55,
    fromSurfaceId: 'f1-main-lobby',
    toSurfaceId: 'f1-borrow-room',
  },
] as const;

function buildFloor4Or5Doors(floor: 4 | 5): DoorwayOpening[] {
  const f = floor;
  const r401Label = f === 4 ? '401' : '501';
  const r418Label = f === 4 ? '418' : '525';
  const r411Label = f === 4 ? '411' : '518';
  const r404Label = f === 4 ? '404' : '511';
  const r402Label = f === 4 ? '402' : '509';
  const r419Label = f === 4 ? '419' : '526';
  return [
    {
      id: `door-${f}f-r${r401Label}`,
      name: `Cửa Phòng đọc ${r401Label}`,
      block: 'A',
      floor: f,
      wallAxis: 'x',
      wallCoord: BLOCK_A_DIMS.ZB, // -13.0
      center: ROOM_401_DIMS.DOOR_X, // -10.8
      width: ROOM_401_DIMS.DOOR_W, // 2.64
      height: ROOM_401_DIMS.DOOR_H,
      fromSurfaceId: `f${f}-corridor`,
      toSurfaceId: `f${f}-room-${r401Label}`,
    },
    {
      id: `door-${f}f-r${r418Label}`,
      name: `Cửa Phòng đọc ${r418Label}`,
      block: 'A',
      floor: f,
      wallAxis: 'x',
      wallCoord: BLOCK_A_DIMS.ZB, // -13.0
      center: 11.5,
      width: 2.4,
      height: 2.4,
      fromSurfaceId: `f${f}-corridor`,
      toSurfaceId: `f${f}-room-${r418Label}`,
    },
    {
      id: `door-${f}f-r${r411Label}`,
      name: `Cửa Phòng đọc ${r411Label}`,
      block: 'A',
      floor: f,
      wallAxis: 'x',
      wallCoord: BLOCK_A_DIMS.ZF, // +13.0
      center: 0.0,
      width: 3.2,
      height: 2.4,
      fromSurfaceId: `f${f}-corridor`,
      toSurfaceId: `f${f}-room-${r411Label}`,
    },
    {
      id: `door-${f}f-r${r404Label}`,
      name: `Cửa Phòng ${r404Label}`,
      block: 'A',
      floor: f,
      wallAxis: 'z',
      wallCoord: -BLOCK_A_DIMS.XW, // -19.5
      center: -6.5,
      width: 2.4,
      height: 2.4,
      fromSurfaceId: `f${f}-corridor`,
      toSurfaceId: `f${f}-room-west`,
    },
    {
      id: `door-${f}f-r${r402Label}`,
      name: `Cửa Phòng ${r402Label}`,
      block: 'A',
      floor: f,
      wallAxis: 'z',
      wallCoord: -BLOCK_A_DIMS.XW, // -19.5
      center: 4.5,
      width: 2.6,
      height: 2.4,
      fromSurfaceId: `f${f}-corridor`,
      toSurfaceId: `f${f}-room-west`,
    },
    {
      id: `door-${f}f-r${r419Label}-north`,
      name: `Cửa Bắc Phòng tự học ${r419Label}`,
      block: 'A',
      floor: f,
      wallAxis: 'z',
      wallCoord: BLOCK_A_DIMS.XW, // +19.5
      center: -9.0,
      width: 2.4,
      height: 2.4,
      fromSurfaceId: `f${f}-corridor`,
      toSurfaceId: `f${f}-room-${r419Label}`,
    },
    {
      id: `door-${f}f-r${r419Label}-south`,
      name: `Cửa Nam Phòng tự học ${r419Label}`,
      block: 'A',
      floor: f,
      wallAxis: 'z',
      wallCoord: BLOCK_A_DIMS.XW, // +19.5
      center: 9.0,
      width: 2.4,
      height: 2.4,
      fromSurfaceId: `f${f}-corridor`,
      toSurfaceId: `f${f}-room-${r419Label}`,
    },
  ];
}

export const FLOOR_4_DOORS: readonly DoorwayOpening[] = buildFloor4Or5Doors(4);
export const FLOOR_5_DOORS: readonly DoorwayOpening[] = buildFloor4Or5Doors(5);

export function getDoorwaysForFloor(floor: LibraryFloor): readonly DoorwayOpening[] {
  if (floor === 1) return FLOOR_1_DOORS;
  if (floor === 4) return FLOOR_4_DOORS;
  if (floor === 5) return FLOOR_5_DOORS;
  return [];
}

// ── 4. Canonical Walkable Surfaces per Floor ───────────────────────────────

function buildWalkableSurfacesForFloor(floor: LibraryFloor): WalkableSurface[] {
  const baseY = getFloorBaseElevation(floor);
  const { XW, ZB, ZF, L, FR, R4Z } = BLOCK_A_DIMS;

  if (floor === 1) {
    return [
      {
        id: 'f1-main-lobby',
        name: 'Sảnh chính Tầng 1',
        block: 'A',
        floor: 1,
        baseY,
        shape: { kind: 'rect', minX: -XW, maxX: XW, minZ: ZB, maxZ: ZF },
      },
      {
        id: 'f1-borrow-room',
        name: 'Phòng Mượn Giáo Trình P.102',
        block: 'A',
        floor: 1,
        baseY,
        shape: {
          kind: 'rect',
          minX: BOOK_LENDING_ROOM_DIMS.x0,
          maxX: BOOK_LENDING_ROOM_DIMS.x1 + 0.5,
          minZ: BOOK_LENDING_ROOM_DIMS.z0,
          maxZ: BOOK_LENDING_ROOM_DIMS.z1,
        },
      },
    ];
  }

  if (floor === 2 || floor === 3) {
    return [
      {
        id: `f${floor}-balcony`,
        name: `Hành lang Ban công Tầng ${floor}`,
        block: 'A',
        floor,
        baseY,
        shape: { kind: 'rect', minX: -XW, maxX: XW, minZ: ZB, maxZ: ZF },
        holes: [
          {
            id: `f${floor}-atrium-void`,
            shape: { kind: 'stadium', halfStraight: L, radius: FR },
            openings:
              floor === 2
                ? [
                    { side: 1, halfAngle: 0.28 },
                    { side: -1, halfAngle: 0.28 },
                  ]
                : undefined,
          },
        ],
      },
    ];
  }

  if (floor === 4 || floor === 5) {
    const r401Label = floor === 4 ? '401' : '501';
    const r418Label = floor === 4 ? '418' : '525';
    const r411Label = floor === 4 ? '411' : '518';
    const r419Label = floor === 4 ? '419' : '526';
    return [
      {
        id: `f${floor}-corridor`,
        name: `Hành lang trung tâm Tầng ${floor}`,
        block: 'A',
        floor,
        baseY,
        shape: { kind: 'rect', minX: -XW, maxX: XW, minZ: ZB, maxZ: ZF },
        holes: [
          {
            id: `f${floor}-atrium-void`,
            shape: { kind: 'stadium', halfStraight: L, radius: FR },
          },
        ],
      },
      {
        id: `f${floor}-room-${r401Label}`,
        name: `Phòng đọc ${r401Label}`,
        block: 'A',
        floor,
        baseY,
        shape: {
          kind: 'rect',
          minX: -ROOM_401_DIMS.HW,
          maxX: ROOM_401_DIMS.HW,
          minZ: R4Z - ROOM_401_DIMS.HD, // -34.6
          maxZ: R4Z + ROOM_401_DIMS.HD + 0.4, // -12.6 (overlaps doorway)
        },
      },
      {
        id: `f${floor}-room-${r418Label}`,
        name: `Phòng đọc ${r418Label}`,
        block: 'A',
        floor,
        baseY,
        shape: {
          kind: 'rect',
          minX: 5.0,
          maxX: 18.0,
          minZ: -31.5,
          maxZ: ZB + 0.4,
        },
      },
      {
        id: `f${floor}-room-${r419Label}`,
        name: `Phòng tự học ${r419Label}`,
        block: 'A',
        floor,
        baseY,
        shape: {
          kind: 'rect',
          minX: XW - 0.4,
          maxX: 35.5,
          minZ: ZB,
          maxZ: ZF,
        },
      },
      {
        id: `f${floor}-room-west`,
        name: `Phòng đọc Cánh Tây Tầng ${floor}`,
        block: 'A',
        floor,
        baseY,
        shape: {
          kind: 'rect',
          minX: -35.5,
          maxX: -XW + 0.4,
          minZ: ZB,
          maxZ: ZF,
        },
      },
      {
        id: `f${floor}-room-${r411Label}`,
        name: `Phòng đọc ${r411Label}`,
        block: 'A',
        floor,
        baseY,
        shape: {
          kind: 'rect',
          minX: -16.0,
          maxX: 16.0,
          minZ: ZF - 0.4,
          maxZ: 27.5,
        },
      },
    ];
  }

  if (floor === 6) {
    return [
      {
        id: 'f6-central-platform',
        name: 'Bục gỗ Stadium Trung tâm Tầng 6',
        block: 'B',
        floor: 6,
        baseY: BLOCK_B_DIMS.PY,
        shape: {
          kind: 'stadium',
          halfStraight: BLOCK_B_DIMS.L,
          radius: BLOCK_B_DIMS.PR,
        },
      },
      {
        id: 'f6-main-hall',
        name: 'Sảnh Sáng tạo & Triển lãm Tầng 6',
        block: 'B',
        floor: 6,
        baseY: 0.0,
        shape: {
          kind: 'stadium',
          halfStraight: BLOCK_B_DIMS.L,
          radius: BLOCK_B_DIMS.WR,
        },
      },
    ];
  }

  if (floor === 7) {
    return [
      {
        id: 'f7-mezzanine',
        name: 'Gác lửng Không gian Xanh Tầng 7',
        block: 'B',
        floor: 7,
        baseY: BLOCK_B_DIMS.MZ,
        shape: {
          kind: 'stadium',
          halfStraight: BLOCK_B_DIMS.L,
          radius: BLOCK_B_DIMS.WR,
        },
        holes: [
          {
            id: 'f7-atrium-void',
            shape: {
              kind: 'stadium',
              halfStraight: BLOCK_B_DIMS.L,
              radius: BLOCK_B_DIMS.FR,
            },
          },
        ],
      },
    ];
  }

  // Floor 10 (Block D)
  return [
    {
      id: 'f10-stargazing-deck',
      name: 'Đài Quan Sát Sao Tầng 10',
      block: 'D',
      floor: 10,
      baseY: BLOCK_D_DIMS.SD.y,
      shape: {
        kind: 'circle',
        x: BLOCK_D_DIMS.SD.x,
        z: BLOCK_D_DIMS.SD.z,
        radius: BLOCK_D_DIMS.SD.r,
      },
    },
    {
      id: 'f10-rooftop-deck',
      name: 'Sân thượng Vườn Thượng Uyển Tầng 10',
      block: 'D',
      floor: 10,
      baseY: 0.0,
      shape: {
        kind: 'rect',
        minX: BLOCK_D_DIMS.X0,
        maxX: BLOCK_D_DIMS.X1,
        minZ: BLOCK_D_DIMS.Z0,
        maxZ: BLOCK_D_DIMS.Z1,
      },
    },
  ];
}

export const WALKABLE_SURFACES_BY_FLOOR: Record<LibraryFloor, readonly WalkableSurface[]> = {
  1: buildWalkableSurfacesForFloor(1),
  2: buildWalkableSurfacesForFloor(2),
  3: buildWalkableSurfacesForFloor(3),
  4: buildWalkableSurfacesForFloor(4),
  5: buildWalkableSurfacesForFloor(5),
  6: buildWalkableSurfacesForFloor(6),
  7: buildWalkableSurfacesForFloor(7),
  10: buildWalkableSurfacesForFloor(10),
};

export function getWalkableSurfacesForFloor(floor: LibraryFloor): readonly WalkableSurface[] {
  return WALKABLE_SURFACES_BY_FLOOR[floor];
}

// ── 5. Canonical Spatial Colliders per Floor ───────────────────────────────

function makeBoxCollider(
  id: string,
  name: string,
  floor: LibraryFloor,
  kind: SpatialCollider['kind'],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  height = 3.2,
  baseY = getFloorBaseElevation(floor),
): SpatialCollider {
  return {
    id,
    name,
    block: getBlockForFloor(floor),
    floor,
    kind,
    bounds: {
      minX,
      maxX,
      minY: baseY,
      maxY: baseY + height,
      minZ,
      maxZ,
    },
  };
}

function makeCylinderCollider(
  id: string,
  name: string,
  floor: LibraryFloor,
  kind: SpatialCollider['kind'],
  x: number,
  z: number,
  radius: number,
  height = 4.2,
  baseY = getFloorBaseElevation(floor),
): SpatialCollider {
  return {
    id,
    name,
    block: getBlockForFloor(floor),
    floor,
    kind,
    bounds: {
      minX: x - radius,
      maxX: x + radius,
      minY: baseY,
      maxY: baseY + height,
      minZ: z - radius,
      maxZ: z + radius,
    },
    cylinder: { x, z, radius },
  };
}

/**
 * Helper to split a wall segment along X (at fixed `z`) or along Z (at fixed `x`)
 * around doorway openings on that wall.
 */
function buildWallSegmentsWithDoors(
  idPrefix: string,
  namePrefix: string,
  floor: LibraryFloor,
  axis: 'x' | 'z',
  wallCoord: number,
  start: number,
  end: number,
  halfThickness: number,
  doors: readonly DoorwayOpening[],
): SpatialCollider[] {
  const relevantDoors = doors
    .filter((d) => d.wallAxis === axis && Math.abs(d.wallCoord - wallCoord) < 0.25)
    .map((d) => ({ min: d.center - d.width / 2, max: d.center + d.width / 2 }))
    .sort((a, b) => a.min - b.min);

  const segments: Array<{ min: number; max: number }> = [];
  let cursor = start;
  for (const door of relevantDoors) {
    if (door.min > cursor + 0.05) {
      segments.push({ min: cursor, max: door.min });
    }
    cursor = Math.max(cursor, door.max);
  }
  if (cursor < end - 0.05) {
    segments.push({ min: cursor, max: end });
  }

  return segments.map((seg, idx) => {
    if (axis === 'x') {
      return makeBoxCollider(
        `${idPrefix}-seg-${idx + 1}`,
        namePrefix,
        floor,
        'wall',
        seg.min,
        seg.max,
        wallCoord - halfThickness,
        wallCoord + halfThickness,
      );
    }
    return makeBoxCollider(
      `${idPrefix}-seg-${idx + 1}`,
      namePrefix,
      floor,
      'wall',
      wallCoord - halfThickness,
      wallCoord + halfThickness,
      seg.min,
      seg.max,
    );
  });
}

/**
 * Computes world-space axis-aligned bounding box `{ minX, maxX, minZ, maxZ }`
 * for a local box `[minLX, maxLX] × [minLZ, maxLZ]` rotated by `ry` around Y
 * and translated to `(x, z)`.
 */
export function computeRotatedBoxBounds(
  x: number,
  z: number,
  ry: number,
  minLX: number,
  maxLX: number,
  minLZ: number,
  maxLZ: number,
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const corners: Array<[number, number]> = [
    [minLX, minLZ],
    [maxLX, minLZ],
    [maxLX, maxLZ],
    [minLX, maxLZ],
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [lx, lz] of corners) {
    const wx = x + lx * c + lz * s;
    const wz = z - lx * s + lz * c;
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wz < minZ) minZ = wz;
    if (wz > maxZ) maxZ = wz;
  }
  return {
    minX: Number(minX.toFixed(4)),
    maxX: Number(maxX.toFixed(4)),
    minZ: Number(minZ.toFixed(4)),
    maxZ: Number(maxZ.toFixed(4)),
  };
}

function stadiumFacingRotationY(x: number, z: number): number {
  const cx = Math.max(-BLOCK_A_DIMS.L, Math.min(BLOCK_A_DIMS.L, x));
  const dx = x - cx;
  return Math.atan2(-dx, -z);
}

function buildBlockAFurniturePlacementsForFloor(floor: 1 | 2 | 3 | 4 | 5): LibraryFurniturePlacement[] {
  const { XW, ZB, ZF, L, FR } = BLOCK_A_DIMS;
  const y = getFloorBaseElevation(floor);
  const items: LibraryFurniturePlacement[] = [];

  if (floor === 1) {
    // 1. Book-Lending Room (P.102) 6 bookshelves: 4 East-facing + 2 against West wall
    const brm = BOOK_LENDING_ROOM_DIMS;
    let shelfIdx = 1;
    for (const sz of brm.shelfZs) {
      items.push({
        id: `f1-brm-shelf-${shelfIdx++}`,
        name: 'Kệ giáo trình P.102',
        floor: 1,
        prop: 'shelf',
        x: brm.shelfX,
        y,
        z: sz,
        ry: 0,
      });
    }
    for (const wsz of brm.westShelfZs) {
      items.push({
        id: `f1-brm-shelf-${shelfIdx++}`,
        name: 'Kệ giáo trình tường Tây P.102',
        floor: 1,
        prop: 'shelf',
        x: brm.westShelfX,
        y,
        z: wsz,
        ry: Math.PI / 2,
      });
    }

    // 2. Main Lobby West & East lounge sofas and armchairs
    for (const s of [-1, 1] as const) {
      const sideKey = s < 0 ? 'west' : 'east';
      const sideLabel = s < 0 ? 'Tây' : 'Đông';
      const ry = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      items.push(
        {
          id: `lobby-sofa-${sideKey}-1`,
          name: `Sofa Sảnh ${sideLabel} 1`,
          floor: 1,
          prop: 'sofa',
          x: s * 14.2,
          y,
          z: -5.8,
          ry,
        },
        {
          id: `lobby-armchair-${sideKey}-1`,
          name: `Ghế bành Sảnh ${sideLabel} 1`,
          floor: 1,
          prop: 'armchair',
          x: s * 14.2,
          y,
          z: -3.9,
          ry,
        },
        {
          id: `lobby-sofa-${sideKey}-2`,
          name: `Sofa Sảnh ${sideLabel} 2`,
          floor: 1,
          prop: 'sofa',
          x: s * 14.2,
          y,
          z: 5.8,
          ry,
        },
        {
          id: `lobby-armchair-${sideKey}-2`,
          name: `Ghế bành Sảnh ${sideLabel} 2`,
          floor: 1,
          prop: 'armchair',
          x: s * 14.2,
          y,
          z: 3.9,
          ry,
        },
      );
    }
    return items;
  }

  if (floor === 2 || floor === 3) {
    // Keep curved stair landings on Floor 2 completely unobstructed
    const isStairF = floor === 2;
    const inGap = (s: number) =>
      isStairF && ((s > 0.22 && s < 0.38) || (s > 0.72 && s < 0.88));

    // Inner ring of 4-seat study tables (r = FR + 1.65 = 9.15m)
    const N = 16;
    let tIdx = 1;
    for (let i = 0; i < N; i++) {
      const s = (i + 0.5) / N;
      if (inGap(s)) continue;
      const p = stadiumPointAt(s, L, FR + 1.65);
      items.push({
        id: `f${floor}-balcony-table4-${tIdx++}`,
        name: `Bàn tự học hành lang T${floor}`,
        floor,
        prop: 'table4',
        x: Number(p.x.toFixed(4)),
        y,
        z: Number(p.z.toFixed(4)),
        ry: Number(stadiumFacingRotationY(p.x, p.z).toFixed(4)),
      });
    }

    // Outer ring of round 4-seat tables (r = FR + 3.45 = 10.95m)
    let rIdx = 1;
    for (let i = 0; i < 12; i++) {
      const s = (i + 0.5) / 12;
      if (inGap(s)) continue;
      const p = stadiumPointAt(s, L, FR + 3.45);
      if (Math.abs(p.x) > XW - 2.3 || Math.abs(p.z) > ZF - 2.1) continue;
      items.push({
        id: `f${floor}-balcony-round4-${rIdx++}`,
        name: `Bàn tròn thảo luận T${floor}`,
        floor,
        prop: 'round4',
        x: Number(p.x.toFixed(4)),
        y,
        z: Number(p.z.toFixed(4)),
        ry: Number(((i * 0.7) % Math.PI).toFixed(4)),
      });
    }

    // West & East perimeter lounge sofas and armchairs (x = ±17)
    let sIdx = 1;
    let aIdx = 1;
    for (const s of [-1, 1] as const) {
      const ry = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      for (const z of [-9.2, -3.2, 3.2, 9.2]) {
        items.push(
          {
            id: `f${floor}-balcony-sofa-${sIdx++}`,
            name: `Sofa hành lang T${floor}`,
            floor,
            prop: 'sofa',
            x: s * 17,
            y,
            z,
            ry,
          },
          {
            id: `f${floor}-balcony-armchair-${aIdx++}`,
            name: `Ghế bành hành lang T${floor}`,
            floor,
            prop: 'armchair',
            x: s * 17,
            y,
            z: Number((z + 1.6).toFixed(4)),
            ry,
          },
        );
      }
    }

    // North & South perimeter tall bookshelves (z = ZB + 0.55 = -12.45 and z = ZF - 0.55 = +12.45)
    let shIdx = 1;
    for (const x of [-13.5, -9, -4.5, 4.5, 9, 13.5]) {
      items.push(
        {
          id: `f${floor}-north-shelf-${shIdx}`,
          name: `Kệ sách hành lang Bắc T${floor}`,
          floor,
          prop: 'shelf',
          x,
          y,
          z: ZB + 0.55,
          ry: 0,
        },
        {
          id: `f${floor}-south-shelf-${shIdx}`,
          name: `Kệ sách hành lang Nam T${floor}`,
          floor,
          prop: 'shelf',
          x,
          y,
          z: ZF - 0.55,
          ry: Math.PI,
        },
      );
      shIdx++;
    }
    return items;
  }

  // Floors 4 and 5 central corridor furniture
  let tIdx = 1;
  for (const x of [-9.5, -4.8, 0, 4.8, 9.5]) {
    items.push(
      {
        id: `f${floor}-corr-table4-${tIdx++}`,
        name: `Bàn tự học hành lang T${floor}`,
        floor,
        prop: 'table4',
        x,
        y,
        z: -9.6,
        ry: 0,
      },
      {
        id: `f${floor}-corr-table4-${tIdx++}`,
        name: `Bàn tự học hành lang T${floor}`,
        floor,
        prop: 'table4',
        x,
        y,
        z: 9.6,
        ry: Math.PI,
      },
    );
  }
  let rIdx = 1;
  for (const z of [-4.5, 0, 4.5]) {
    items.push(
      {
        id: `f${floor}-corr-round4-${rIdx++}`,
        name: `Bàn tròn hành lang T${floor}`,
        floor,
        prop: 'round4',
        x: -16.2,
        y,
        z,
        ry: 0.3,
      },
      {
        id: `f${floor}-corr-round4-${rIdx++}`,
        name: `Bàn tròn hành lang T${floor}`,
        floor,
        prop: 'round4',
        x: 15.8,
        y,
        z,
        ry: 0.8,
      },
    );
  }
  const corrSofas: ReadonlyArray<[number, number, number]> = [
    [-14.5, -11.8, 0],
    [14.5, -11.8, 0],
    [-14.5, 11.8, Math.PI],
    [14.5, 11.8, Math.PI],
  ];
  for (let i = 0; i < corrSofas.length; i++) {
    const [x, z, ry] = corrSofas[i];
    items.push({
      id: `f${floor}-corr-sofa-${i + 1}`,
      name: `Sofa hành lang T${floor}`,
      floor,
      prop: 'sofa',
      x,
      y,
      z,
      ry,
    });
  }
  return items;
}

export const BLOCK_A_FURNITURE_BY_FLOOR: Record<1 | 2 | 3 | 4 | 5, readonly LibraryFurniturePlacement[]> = {
  1: buildBlockAFurniturePlacementsForFloor(1),
  2: buildBlockAFurniturePlacementsForFloor(2),
  3: buildBlockAFurniturePlacementsForFloor(3),
  4: buildBlockAFurniturePlacementsForFloor(4),
  5: buildBlockAFurniturePlacementsForFloor(5),
};

export function getBlockAFurniturePlacements(
  floor: 1 | 2 | 3 | 4 | 5,
): readonly LibraryFurniturePlacement[] {
  return BLOCK_A_FURNITURE_BY_FLOOR[floor];
}

export function colliderFromFurniturePlacement(p: LibraryFurniturePlacement): SpatialCollider {
  if (p.prop === 'round4') {
    const d = PROP_DIMENSIONS.round4;
    return makeCylinderCollider(p.id, p.name, p.floor, 'furniture', p.x, p.z, d.radius, d.height, p.y);
  }
  const d = PROP_DIMENSIONS[p.prop];
  const box = computeRotatedBoxBounds(p.x, p.z, p.ry, d.minLX, d.maxLX, d.minLZ, d.maxLZ);
  return makeBoxCollider(p.id, p.name, p.floor, 'furniture', box.minX, box.maxX, box.minZ, box.maxZ, d.height, p.y);
}

function buildFloor1Colliders(): SpatialCollider[] {
  const { XW, ZB, ZF } = BLOCK_A_DIMS;
  const WT = 0.22;
  const cols: SpatialCollider[] = [];

  // 1. Main lobby perimeter walls (with doorway opening on West wall x = -19.5 for P.102)
  cols.push(
    makeBoxCollider('f1-wall-north', 'Tường Bắc Sảnh T1', 1, 'wall', -XW, XW, ZB - WT, ZB + WT),
    makeBoxCollider('f1-wall-south', 'Tường Nam Sảnh T1', 1, 'wall', -XW, XW, ZF - WT, ZF + WT),
    makeBoxCollider('f1-wall-east', 'Tường Đông Sảnh T1', 1, 'wall', XW - WT, XW + WT, ZB, ZF),
    ...buildWallSegmentsWithDoors(
      'f1-wall-west',
      'Tường Tây Sảnh T1',
      1,
      'z',
      -XW,
      ZB,
      ZF,
      WT,
      FLOOR_1_DOORS,
    ),
  );

  // 2. Book-Lending Room (P.102) outer walls & service counter
  const brm = BOOK_LENDING_ROOM_DIMS;
  cols.push(
    makeBoxCollider('f1-brm-wall-west', 'Tường Tây P.102', 1, 'wall', brm.x0 - WT, brm.x0 + WT, brm.z0, brm.z1),
    makeBoxCollider('f1-brm-wall-north', 'Tường Bắc P.102', 1, 'wall', brm.x0, brm.x1, brm.z0 - WT, brm.z0 + WT),
    makeBoxCollider('f1-brm-wall-south', 'Tường Nam P.102', 1, 'wall', brm.x0, brm.x1, brm.z1 - WT, brm.z1 + WT),
    makeBoxCollider(
      'f1-brm-counter',
      'Quầy Thủ thư Mượn Sách P.102',
      1,
      'furniture',
      brm.counterX - brm.counterW / 2,
      brm.counterX + brm.counterW / 2,
      brm.counterZ0,
      brm.counterZ1,
      1.1,
    ),
  );

  // 3. Shared Floor-1 furniture props (all 6 P.102 bookshelves + 4 lobby sofas + 4 lobby armchairs)
  for (const fp of getBlockAFurniturePlacements(1)) {
    cols.push(colliderFromFurniturePlacement(fp));
  }

  // 4. 8 Atrium Columns
  for (const c of ATRIUM_COLUMNS) {
    cols.push(makeCylinderCollider(`f1-${c.id}`, 'Cột thông tầng Sảnh T1', 1, 'column', c.x, c.z, c.radius));
  }

  // 5. Interactive Anchors & Lobby Fixed Fixtures (Statue, Info Desk, Vocab Board, South Reception, Planters, OPAC, Display Cases, Vending)
  cols.push(
    makeBoxCollider('lobby-statue', 'Tượng GS. Tạ Quang Bửu', 1, 'furniture', -1.35, 1.35, -3.1, -1.1, 2.4),
    makeBoxCollider('lobby-info-desk', 'Quầy thông tin & mượn sách', 1, 'furniture', -4.5, -2.7, -1.4, 0.2, 1.2),
    makeBoxCollider('lobby-vocab-board', 'Bảng từ vựng Thư viện', 1, 'furniture', 2.9, 4.4, -1.2, 0.0, 2.0),
    makeBoxCollider('lobby-south-reception', 'Quầy lễ tân chính Tầng 1', 1, 'furniture', -2.6, 2.6, 8.6, 10.2, 1.15),
    makeBoxCollider('lobby-planter-west', 'Bồn cây ghế gỗ Tây', 1, 'furniture', -11.55, -9.65, -1.65, 1.65, 1.2),
    makeBoxCollider('lobby-planter-east', 'Bồn cây ghế gỗ Đông', 1, 'furniture', 9.65, 11.55, -1.65, 1.65, 1.2),
    makeBoxCollider('lobby-opac-north', 'Bàn tra cứu OPAC Bắc', 1, 'furniture', -17.85, -16.75, -8.8, -6.2, 1.2),
    makeBoxCollider('lobby-opac-south', 'Bàn tra cứu OPAC Nam', 1, 'furniture', -17.85, -16.75, 6.2, 8.8, 1.2),
    makeBoxCollider('lobby-display-case-1', 'Tủ trưng bày Sảnh Bắc 1', 1, 'furniture', -15.7, -13.5, -12.35, -11.45, 1.45),
    makeBoxCollider('lobby-display-case-2', 'Tủ trưng bày Sảnh Bắc 2', 1, 'furniture', -11.7, -9.5, -12.35, -11.45, 1.45),
    makeBoxCollider('lobby-magazine-rack', 'Kệ báo & tạp chí Tầng 1', 1, 'furniture', -7.7, -5.9, -12.13, -11.67, 1.55),
    makeBoxCollider('lobby-vending-machine', 'Máy bán nước tự động Tầng 1', 1, 'furniture', 13.72, 14.88, -12.33, -11.47, 1.95),
  );

  // 6. PR8 Study Tables (derived directly from LIBRARY_LOBBY.studyTables[].box) & 4 Study Chairs
  for (const table of LIBRARY_LOBBY.studyTables) {
    cols.push(
      makeBoxCollider(
        `study-table-${table.tableId}`,
        table.label,
        1,
        'furniture',
        table.box.minX,
        table.box.maxX,
        table.box.minZ,
        table.box.maxZ,
        table.height,
      ),
    );
  }
  for (const seat of STUDY_SEATS) {
    if (seat.studyRoomId === 'library-lobby') {
      cols.push(
        makeBoxCollider(
          `study-chair-${seat.seatId}`,
          `Ghế học ${seat.label}`,
          1,
          'furniture',
          Number((seat.x - 0.215).toFixed(4)),
          Number((seat.x + 0.215).toFixed(4)),
          Number((seat.z - 0.16).toFixed(4)),
          Number((seat.z + 0.16).toFixed(4)),
          0.85,
        ),
      );
    }
  }

  return cols;
}

function buildFloor2Or3Colliders(floor: 2 | 3): SpatialCollider[] {
  const { XW, ZB, ZF } = BLOCK_A_DIMS;
  const WT = 0.22;
  const cols: SpatialCollider[] = [
    makeBoxCollider(`f${floor}-wall-north`, `Tường Bắc T${floor}`, floor, 'wall', -XW, XW, ZB - WT, ZB + WT),
    makeBoxCollider(`f${floor}-wall-south`, `Tường Nam T${floor}`, floor, 'wall', -XW, XW, ZF - WT, ZF + WT),
    makeBoxCollider(`f${floor}-wall-west`, `Tường Tây T${floor}`, floor, 'wall', -XW - WT, -XW + WT, ZB, ZF),
    makeBoxCollider(`f${floor}-wall-east`, `Tường Đông T${floor}`, floor, 'wall', XW - WT, XW + WT, ZB, ZF),
  ];

  // 8 Atrium Columns
  for (const c of ATRIUM_COLUMNS) {
    cols.push(makeCylinderCollider(`f${floor}-${c.id}`, `Cột thông tầng T${floor}`, floor, 'column', c.x, c.z, c.radius));
  }

  // Shared balcony furniture placements (table4, round4, sofa, armchair, shelf)
  for (const fp of getBlockAFurniturePlacements(floor)) {
    cols.push(colliderFromFurniturePlacement(fp));
  }

  return cols;
}

function buildFloor4Or5Colliders(floor: 4 | 5): SpatialCollider[] {
  const { XW, ZB, ZF, R4Z } = BLOCK_A_DIMS;
  const WT = 0.22;
  const doors = floor === 4 ? FLOOR_4_DOORS : FLOOR_5_DOORS;
  const r401Label = floor === 4 ? '401' : '501';
  const r418Label = floor === 4 ? '418' : '525';
  const r411Label = floor === 4 ? '411' : '518';
  const r419Label = floor === 4 ? '419' : '526';

  const cols: SpatialCollider[] = [];

  // 1. Corridor walls with exact doorway cutouts
  cols.push(
    ...buildWallSegmentsWithDoors(`f${floor}-corr-north`, `Tường Hành lang Bắc T${floor}`, floor, 'x', ZB, -XW, XW, WT, doors),
    ...buildWallSegmentsWithDoors(`f${floor}-corr-south`, `Tường Hành lang Nam T${floor}`, floor, 'x', ZF, -XW, XW, WT, doors),
    ...buildWallSegmentsWithDoors(`f${floor}-corr-west`, `Tường Hành lang Tây T${floor}`, floor, 'z', -XW, ZB, ZF, WT, doors),
    ...buildWallSegmentsWithDoors(`f${floor}-corr-east`, `Tường Hành lang Đông T${floor}`, floor, 'z', XW, ZB, ZF, WT, doors),
  );

  // 2. 8 Atrium Columns & shared corridor furniture in corridor
  for (const c of ATRIUM_COLUMNS) {
    cols.push(makeCylinderCollider(`f${floor}-${c.id}`, `Cột thông tầng T${floor}`, floor, 'column', c.x, c.z, c.radius));
  }
  for (const fp of getBlockAFurniturePlacements(floor)) {
    cols.push(colliderFromFurniturePlacement(fp));
  }
  if (floor === 4) {
    cols.push(
      makeBoxCollider('f4-corr-coffee-machine', 'Máy pha cà phê tự động T4', 4, 'furniture', 5.72, 6.68, -12.49, -11.71, 1.85),
    );
  }

  // 3. Room 401 / 501 Shell & Interior Colliders (converted from local R4Z = -23.8)
  const r4 = ROOM_401_DIMS;
  const r4MinZ = R4Z - r4.HD; // -34.6
  const r4MaxZ = R4Z + r4.HD; // -13.0
  cols.push(
    makeBoxCollider(`f${floor}-r${r401Label}-wall-north`, `Tường Bắc P.${r401Label}`, floor, 'wall', -r4.HW, r4.HW, r4MinZ - WT, r4MinZ + WT),
    makeBoxCollider(`f${floor}-r${r401Label}-wall-west`, `Tường Tây P.${r401Label}`, floor, 'wall', -r4.HW - WT, -r4.HW + WT, r4MinZ, r4MaxZ),
    makeBoxCollider(`f${floor}-r${r401Label}-wall-east`, `Tường Đông P.${r401Label}`, floor, 'wall', r4.HW - WT, r4.HW + WT, r4MinZ, r4MaxZ),
  );

  // Room 401/501 4 interior columns
  for (const ix of r4.INNER_COLS_X) {
    for (const izLocal of r4.INNER_COLS_Z_LOCAL) {
      const iz = R4Z + izLocal;
      cols.push(
        makeBoxCollider(
          `f${floor}-r${r401Label}-col-${ix}-${izLocal}`,
          `Cột P.${r401Label}`,
          floor,
          'column',
          ix - 0.22,
          ix + 0.22,
          iz - 0.22,
          iz + 0.22,
        ),
      );
    }
  }

  // Room 401/501 12 Study Tables
  let tIdx = 1;
  for (const tx of r4.TX) {
    for (const tzLocal of r4.TZ_LOCAL) {
      const tz = R4Z + tzLocal;
      cols.push(
        makeBoxCollider(
          `f${floor}-r${r401Label}-table-${tIdx++}`,
          `Bàn đọc P.${r401Label}`,
          floor,
          'furniture',
          tx - r4.TW / 2 - 0.12,
          tx + r4.TW / 2 + 0.12,
          tz - r4.TD / 2 - 0.08,
          tz + r4.TD / 2 + 0.08,
          0.95,
        ),
      );
    }
  }

  // Room 401/501 6 Book Stacks
  const stackZ = R4Z + r4.STACK_Z_LOCAL;
  for (let i = 0; i < r4.STACK_X.length; i++) {
    const sx = r4.STACK_X[i];
    cols.push(
      makeBoxCollider(
        `f${floor}-r${r401Label}-stack-${i + 1}`,
        `Giá sách P.${r401Label}`,
        floor,
        'furniture',
        sx - r4.STACK_W / 2 - 0.06,
        sx + r4.STACK_W / 2 + 0.06,
        stackZ - r4.STACK_D / 2 - 0.06,
        stackZ + r4.STACK_D / 2 + 0.06,
        r4.STACK_H,
      ),
    );
  }

  // Room 401/501 L-shaped computer counter & half-stadium librarian desk
  const cBackZ = r4MinZ + r4.WT / 2 + r4.COMP_CD / 2 + 0.03;
  const cRightX = r4.HW - r4.WT / 2 - r4.COMP_CD / 2 - 0.03;
  cols.push(
    makeBoxCollider(
      `f${floor}-r${r401Label}-comp-back`,
      `Quầy máy tính Bắc P.${r401Label}`,
      floor,
      'furniture',
      -0.3,
      -0.3 + r4.COMP_W,
      cBackZ - r4.COMP_CD / 2,
      cBackZ + r4.COMP_CD / 2 + 0.15,
      1.05,
    ),
    makeBoxCollider(
      `f${floor}-r${r401Label}-comp-right`,
      `Quầy máy tính Đông P.${r401Label}`,
      floor,
      'furniture',
      cRightX - r4.COMP_CD / 2 - 0.15,
      cRightX + r4.COMP_CD / 2,
      r4MinZ + r4.WT / 2 + r4.COMP_CD,
      r4MinZ + r4.WT / 2 + r4.COMP_CD + r4.COMP_R,
      1.05,
    ),
    makeBoxCollider(
      `f${floor}-r${r401Label}-librarian-desk`,
      `Quầy thủ thư P.${r401Label}`,
      floor,
      'furniture',
      r4.DESK_X - r4.DESK_W / 2,
      r4.DESK_X + r4.DESK_W / 2,
      R4Z + r4.DESK_Z_LOCAL - r4.DESK_D / 2,
      R4Z + r4.DESK_Z_LOCAL + r4.DESK_D / 2,
      1.1,
    ),
  );

  // 4. Room 418 / 525 (North-East Room: x ∈ [5.0, 18.0], z ∈ [-31.5, -13.0])
  cols.push(
    makeBoxCollider(`f${floor}-r${r418Label}-wall-north`, `Tường Bắc P.${r418Label}`, floor, 'wall', 5.0, 18.0, -31.5 - WT, -31.5 + WT),
    makeBoxCollider(`f${floor}-r${r418Label}-wall-west`, `Tường Tây P.${r418Label}`, floor, 'wall', 5.0 - WT, 5.0 + WT, -31.5, ZB),
    makeBoxCollider(`f${floor}-r${r418Label}-wall-east`, `Tường Đông P.${r418Label}`, floor, 'wall', 18.0 - WT, 18.0 + WT, -31.5, ZB),
  );
  let r418Idx = 1;
  for (const tx of [8.2, 13.8]) {
    for (const tz of [-17.5, -22.0, -26.5]) {
      cols.push(
        makeBoxCollider(
          `f${floor}-r${r418Label}-table-${r418Idx++}`,
          `Bàn đọc P.${r418Label}`,
          floor,
          'furniture',
          tx - 1.35,
          tx + 1.35,
          tz - 0.82,
          tz + 0.82,
          0.9,
        ),
      );
    }
  }

  // 5. Room 419 / 526 (East Wing: x ∈ [19.5, 35.5], z ∈ [-13.0, 13.0])
  cols.push(
    makeBoxCollider(`f${floor}-r${r419Label}-wall-north`, `Tường Bắc P.${r419Label}`, floor, 'wall', XW, 35.5, ZB - WT, ZB + WT),
    makeBoxCollider(`f${floor}-r${r419Label}-wall-south`, `Tường Nam P.${r419Label}`, floor, 'wall', XW, 35.5, ZF - WT, ZF + WT),
    makeBoxCollider(`f${floor}-r${r419Label}-wall-east`, `Tường Đông P.${r419Label}`, floor, 'wall', 35.5 - WT, 35.5 + WT, ZB, ZF),
  );
  let r419Idx = 1;
  for (const tx of [24.2, 31.2]) {
    for (const tz of [-9.5, -5.0, 0.0, 5.0, 9.5]) {
      cols.push(
        makeBoxCollider(
          `f${floor}-r${r419Label}-table-${r419Idx++}`,
          `Bàn tự học P.${r419Label}`,
          floor,
          'furniture',
          tx - 1.35,
          tx + 1.35,
          tz - 0.82,
          tz + 0.82,
          0.9,
        ),
      );
    }
  }

  // 6. West Wing Rooms 402/509 & 404/511 (x ∈ [-35.5, -19.5], z ∈ [-13.0, 13.0])
  cols.push(
    makeBoxCollider(`f${floor}-west-wall-north`, `Tường Bắc Cánh Tây T${floor}`, floor, 'wall', -35.5, -XW, ZB - WT, ZB + WT),
    makeBoxCollider(`f${floor}-west-wall-south`, `Tường Nam Cánh Tây T${floor}`, floor, 'wall', -35.5, -XW, ZF - WT, ZF + WT),
    makeBoxCollider(`f${floor}-west-wall-west`, `Tường Tây Cánh Tây T${floor}`, floor, 'wall', -35.5 - WT, -35.5 + WT, ZB, ZF),
  );
  let rWestStackIdx = 1;
  for (const sx of [-33.2, -31.0, -28.8, -26.6, -24.4, -22.2]) {
    cols.push(
      makeBoxCollider(
        `f${floor}-west-stack-${rWestStackIdx++}`,
        `Giá sách P.${floor === 4 ? '404' : '511'}`,
        floor,
        'furniture',
        sx - 0.36,
        sx + 0.36,
        -6.2 - 2.7,
        -6.2 + 2.7,
        2.3,
      ),
    );
  }
  let rWestIdx = 1;
  for (const tx of [-30.5, -24.2]) {
    for (const tz of [1.5, 5.2, 8.9]) {
      cols.push(
        makeBoxCollider(
          `f${floor}-west-table-${rWestIdx++}`,
          `Bàn đọc P.${floor === 4 ? '402' : '509'}`,
          floor,
          'furniture',
          tx - 1.35,
          tx + 1.35,
          tz - 0.82,
          tz + 0.82,
          0.9,
        ),
      );
    }
  }

  // 7. South Wing Room 411 / 518 (x ∈ [-16.0, 16.0], z ∈ [13.0, 27.5])
  cols.push(
    makeBoxCollider(`f${floor}-r${r411Label}-wall-south`, `Tường Nam P.${r411Label}`, floor, 'wall', -16.0, 16.0, 27.5 - WT, 27.5 + WT),
    makeBoxCollider(`f${floor}-r${r411Label}-wall-west`, `Tường Tây P.${r411Label}`, floor, 'wall', -16.0 - WT, -16.0 + WT, ZF, 27.5),
    makeBoxCollider(`f${floor}-r${r411Label}-wall-east`, `Tường Đông P.${r411Label}`, floor, 'wall', 16.0 - WT, 16.0 + WT, ZF, 27.5),
  );
  for (const cx of [-6.2, 6.2]) {
    for (const cz of [17.2, 22.8]) {
      cols.push(
        makeCylinderCollider(
          `f${floor}-r${r411Label}-col-${cx}-${cz}`,
          `Cột P.${r411Label}`,
          floor,
          'column',
          cx,
          cz,
          0.36,
        ),
      );
    }
  }
  let r411Idx = 1;
  for (const tx of [-11.5, -3.2, 3.2, 11.5]) {
    for (const tz of [16.5, 20.2, 24.0]) {
      cols.push(
        makeBoxCollider(
          `f${floor}-r${r411Label}-table-${r411Idx++}`,
          `Bàn đọc P.${r411Label}`,
          floor,
          'furniture',
          tx - 1.35,
          tx + 1.35,
          tz - 0.82,
          tz + 0.82,
          0.9,
        ),
      );
    }
  }

  return cols;
}

function buildFloor6Colliders(): SpatialCollider[] {
  const cols: SpatialCollider[] = [
    makeCylinderCollider(
      'f6-exhibition-desk',
      'Quầy tròn Triển lãm & Cột phễu T6',
      6,
      'furniture',
      BLOCK_B_DIMS.DESK.x,
      BLOCK_B_DIMS.DESK.z,
      BLOCK_B_DIMS.DESK.r,
      3.5,
      0.0,
    ),
    makeBoxCollider(
      'f6-grand-piano',
      'Đàn Grand Piano T6',
      6,
      'furniture',
      BLOCK_B_DIMS.PIANO.x - BLOCK_B_DIMS.PIANO.halfW,
      BLOCK_B_DIMS.PIANO.x + BLOCK_B_DIMS.PIANO.halfW,
      BLOCK_B_DIMS.PIANO.z - BLOCK_B_DIMS.PIANO.halfD,
      BLOCK_B_DIMS.PIANO.z + BLOCK_B_DIMS.PIANO.halfD,
      1.6,
      BLOCK_B_DIMS.PY,
    ),
    makeBoxCollider(
      'f6-boat-island',
      'Đảo thuyền cây xanh T6',
      6,
      'furniture',
      BLOCK_B_DIMS.BOAT.x - BLOCK_B_DIMS.BOAT.halfW,
      BLOCK_B_DIMS.BOAT.x + BLOCK_B_DIMS.BOAT.halfW,
      BLOCK_B_DIMS.BOAT.z - BLOCK_B_DIMS.BOAT.halfD,
      BLOCK_B_DIMS.BOAT.z + BLOCK_B_DIMS.BOAT.halfD,
      2.2,
      BLOCK_B_DIMS.PY,
    ),
  ];

  for (const c of BLOCK_B_COLUMNS) {
    cols.push(makeCylinderCollider(`f6-${c.id}`, 'Cột thông tầng T6', 6, 'column', c.x, c.z, c.radius, 9.6, 0.0));
  }

  return cols;
}

function buildFloor7Colliders(): SpatialCollider[] {
  const cols: SpatialCollider[] = [];
  for (const c of BLOCK_B_COLUMNS) {
    cols.push(
      makeCylinderCollider(`f7-${c.id}`, 'Cột thông tầng T7', 7, 'column', c.x, c.z, c.radius, 4.4, BLOCK_B_DIMS.MZ),
    );
  }
  return cols;
}

function buildFloor10Colliders(): SpatialCollider[] {
  const { X0, X1, Z0, Z1, KS, PG, STAR_MAP, TELESCOPE } = BLOCK_D_DIMS;
  const RT = 0.18;
  const cols: SpatialCollider[] = [
    makeBoxCollider('f10-rail-north', 'Lan can Bắc Sân thượng T10', 10, 'railing', X0, X1, Z0 - RT, Z0 + RT, 1.2, 0.0),
    makeBoxCollider('f10-rail-south', 'Lan can Nam Sân thượng T10', 10, 'railing', X0, X1, Z1 - RT, Z1 + RT, 1.2, 0.0),
    makeBoxCollider('f10-rail-west', 'Lan can Tây Sân thượng T10', 10, 'railing', X0 - RT, X0 + RT, Z0, Z1, 1.2, 0.0),
    makeBoxCollider('f10-rail-east', 'Lan can Đông Sân thượng T10', 10, 'railing', X1 - RT, X1 + RT, Z0, Z1, 1.2, 0.0),
    makeBoxCollider('f10-elevator-room', 'Phòng kỹ thuật thang máy T10', 10, 'shaft', KS.x0, KS.x1, KS.z0, KS.z1, KS.h, 0.0),
    makeBoxCollider(
      'f10-star-map',
      'Bảng Bản đồ sao Hà Nội',
      10,
      'furniture',
      STAR_MAP.x - STAR_MAP.halfW,
      STAR_MAP.x + STAR_MAP.halfW,
      STAR_MAP.z - STAR_MAP.halfD,
      STAR_MAP.z + STAR_MAP.halfD,
      2.1,
      0.0,
    ),
    makeCylinderCollider(
      'f10-telescope',
      'Kính thiên văn khúc xạ T10',
      10,
      'furniture',
      TELESCOPE.x,
      TELESCOPE.z,
      TELESCOPE.r,
      1.9,
      BLOCK_D_DIMS.SD.y,
    ),
  ];

  for (let i = 0; i < PG.tableXs.length; i++) {
    const tx = PG.tableXs[i];
    cols.push(
      makeCylinderCollider(
        `f10-pergola-table-${i + 1}`,
        'Bàn trà Vườn Thượng Uyển T10',
        10,
        'furniture',
        tx,
        PG.tableZ,
        0.58,
        0.85,
        0.0,
      ),
    );
  }

  return cols;
}

export const SPATIAL_COLLIDERS_BY_FLOOR: Record<LibraryFloor, readonly SpatialCollider[]> = {
  1: buildFloor1Colliders(),
  2: buildFloor2Or3Colliders(2),
  3: buildFloor2Or3Colliders(3),
  4: buildFloor4Or5Colliders(4),
  5: buildFloor4Or5Colliders(5),
  6: buildFloor6Colliders(),
  7: buildFloor7Colliders(),
  10: buildFloor10Colliders(),
};

export function getCollidersForFloor(floor: LibraryFloor): readonly SpatialCollider[] {
  return SPATIAL_COLLIDERS_BY_FLOOR[floor];
}

// ── 6. Canonical Floor-1 Interaction Anchors ───────────────────────────────

export const LIBRARY_INTERACTION_ANCHORS: readonly LibraryInteractionAnchor[] = [
  {
    id: 'lobby-statue',
    name: 'Tượng GS. Tạ Quang Bửu',
    block: 'A',
    floor: 1,
    pos: { x: 0, z: -2.1 },
    radius: 2.9,
  },
  {
    id: 'lobby-info-desk',
    name: 'Quầy thông tin & mượn sách',
    block: 'A',
    floor: 1,
    pos: { x: -3.6, z: -0.6 },
    radius: 2.4,
  },
  {
    id: 'lobby-vocab-board',
    name: 'Bảng từ vựng Thư viện',
    block: 'A',
    floor: 1,
    pos: { x: 3.6, z: -0.6 },
    radius: 2.4,
  },
] as const;
