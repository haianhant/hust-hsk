// ---------------------------------------------------------------------------
// features/campus/interaction/seat-interaction.ts — Multi-floor seat interaction
// state machine, proximity validator, and collision-safe stand-up resolver
// for Tạ Quang Bửu Library Floors 1–10 (`feature.campus.interaction`).
//
// ARCHITECTURAL BOUNDARY:
// - Preserves PR8/PR9 authoritative multiplayer seating invariants for the 4
//   canonical 1F lobby seats (`tqb-1f-t1-s1..s2`, `tqb-1f-t2-s1..s2`).
// - Extends local interactive seating across all accessible library floors
//   (Floors 1, 2, 3, 4, 5, 6, 7, 10) derived from canonical spatial geometry.
// ---------------------------------------------------------------------------

import {
  getSeatDefinition,
  getSeatsForStudyRoom,
  isValidSeatId,
  type StudyRoomZoneId,
  type StudySeatDefinition,
} from '../../../shared/contracts/study';
import { playerInput, playerState } from '../../../lib/playerState';
import type { StudySessionState } from '../../study/study-session/session';
import {
  AVATAR,
  BLOCK_A_DIMS,
  BLOCK_B_DIMS,
  BLOCK_D_DIMS,
  LIBRARY_LOBBY,
  ROOM_401_DIMS,
  getBlockAFurniturePlacements,
  getFloorBaseElevation,
  resolveLibraryLobbyCollisions,
  sanitizeLibraryFloor,
  stadiumPointAt,
  type LibraryFloor,
  type Vec2,
} from '../world-data';

/** Proximity threshold (m) for sitting in a Library chair/sofa/bench via E or click/tap. */
export const SEAT_INTERACT_RADIUS = 1.65;

/** Step-back offset (m) behind the chair when standing up so the avatar clears the chair collider. */
export const SEAT_STAND_OFFSET = 0.66;

export type LocalSeatingStatus = 'standing' | 'seated';

export type SeatSelectionRejectionReason =
  | 'invalid-seat'
  | 'wrong-room'
  | 'wrong-floor'
  | 'riding-bike'
  | 'ui-locked'
  | 'transition-locked'
  | 'already-seated-same'
  | 'already-seated-other'
  | 'too-far';

export interface ExtendedLibrarySeatDefinition extends StudySeatDefinition {
  floor: LibraryFloor;
  y: number;
  networked: boolean;
}

export interface LocalSeatingState {
  status: LocalSeatingStatus;
  studyRoomId: StudyRoomZoneId | null;
  seatId: string | null;
  seatLabel: string | null;
  tableId: string | null;
  anchorPos: Vec2 | null;
  facing: number | null;
  standUpPos: Vec2 | null;
  transitionLock: boolean;
}

export function createInitialSeatingState(): LocalSeatingState {
  return {
    status: 'standing',
    studyRoomId: null,
    seatId: null,
    seatLabel: null,
    tableId: null,
    anchorPos: null,
    facing: null,
    standUpPos: null,
    transitionLock: false,
  };
}

/**
 * Returns the 4 canonical PR8/PR9 networked study seats on Floor 1.
 */
export function getLibraryLobbySeats(): StudySeatDefinition[] {
  return getSeatsForStudyRoom('library-lobby');
}

export function isLibraryLobbySeatId(seatId: unknown): seatId is string {
  if (!isValidSeatId(seatId)) return false;
  const def = getSeatDefinition(seatId);
  return def?.studyRoomId === 'library-lobby';
}

// ── Multi-Floor Library Seat Catalog (Floors 1–10) ─────────────────────────

function buildAllLibrarySeats(): ExtendedLibrarySeatDefinition[] {
  const all: ExtendedLibrarySeatDefinition[] = [];

  // 1. Canonical PR8/PR9 Floor 1 networked seats (tqb-1f-t1-s1..s2, tqb-1f-t2-s1..s2)
  for (const s of getSeatsForStudyRoom('library-lobby')) {
    all.push({
      ...s,
      floor: 1,
      y: 0,
      networked: true,
    });
  }

  // 2. Block A shared furniture placements across Floors 1, 2, 3, 4, 5
  for (const floor of [1, 2, 3, 4, 5] as const) {
    const baseY = getFloorBaseElevation(floor);
    const placements = getBlockAFurniturePlacements(floor);
    for (const p of placements) {
      const cos = Math.cos(p.ry);
      const sin = Math.sin(p.ry);
      const toWorld = (lx: number, lz: number): Vec2 => ({
        x: Number((p.x + lx * cos + lz * sin).toFixed(3)),
        z: Number((p.z - lx * sin + lz * cos).toFixed(3)),
      });

      if (p.prop === 'table4') {
        // 4 chairs around the 4-seat study table matching buildFloors1To5.ts:
        // [-0.42, -0.56, 0], [0.42, -0.56, 0], [-0.42, 0.56, Math.PI], [0.42, 0.56, Math.PI]
        const chairSpots: ReadonlyArray<[number, number, number, string]> = [
          [-0.42, -0.56, 0, 'Ghế 1 (Tây-Bắc)'],
          [-0.42, 0.56, Math.PI, 'Ghế 2 (Tây-Nam)'],
          [0.42, -0.56, 0, 'Ghế 3 (Đông-Bắc)'],
          [0.42, 0.56, Math.PI, 'Ghế 4 (Đông-Nam)'],
        ];
        chairSpots.forEach(([lx, lz, faceOffset, sideLabel], idx) => {
          const pt = toWorld(lx, lz);
          all.push({
            seatId: `tqb-${floor}f-${p.id}-s${idx + 1}`,
            studyRoomId: 'library-lobby',
            tableId: p.id,
            label: `${p.name} · ${sideLabel}`,
            x: pt.x,
            z: pt.z,
            facing: Number((p.ry + faceOffset).toFixed(4)),
            floor,
            y: baseY,
            networked: false,
          });
        });
      } else if (p.prop === 'round4') {
        // 4 diagonal chairs around the round discussion table matching buildFloors1To5.ts:
        // a = (i * Math.PI) / 2 + Math.PI / 4, r = 0.82, chair ry = -a - Math.PI / 2
        const sideLabels = ['Đông-Nam', 'Tây-Nam', 'Tây-Bắc', 'Đông-Bắc'] as const;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          const pt = toWorld(Math.cos(a) * 0.82, Math.sin(a) * 0.82);
          all.push({
            seatId: `tqb-${floor}f-${p.id}-s${i + 1}`,
            studyRoomId: 'library-lobby',
            tableId: p.id,
            label: `${p.name} · Ghế ${sideLabels[i]}`,
            x: pt.x,
            z: pt.z,
            facing: Number((p.ry - a - Math.PI / 2).toFixed(4)),
            floor,
            y: baseY,
            networked: false,
          });
        }
      } else if (p.prop === 'sofa') {
        // Center, left, and right cushion spots on the 1.85m sofa
        const ptCenter = toWorld(0, 0.04);
        const ptLeft = toWorld(-0.48, 0.04);
        const ptRight = toWorld(0.48, 0.04);
        all.push(
          {
            seatId: `tqb-${floor}f-${p.id}`,
            studyRoomId: 'library-lobby',
            tableId: p.id,
            label: p.name,
            x: ptCenter.x,
            z: ptCenter.z,
            facing: Number(p.ry.toFixed(4)),
            floor,
            y: baseY,
            networked: false,
          },
          {
            seatId: `tqb-${floor}f-${p.id}-l`,
            studyRoomId: 'library-lobby',
            tableId: p.id,
            label: `${p.name} (Trái)`,
            x: ptLeft.x,
            z: ptLeft.z,
            facing: Number(p.ry.toFixed(4)),
            floor,
            y: baseY,
            networked: false,
          },
          {
            seatId: `tqb-${floor}f-${p.id}-r`,
            studyRoomId: 'library-lobby',
            tableId: p.id,
            label: `${p.name} (Phải)`,
            x: ptRight.x,
            z: ptRight.z,
            facing: Number(p.ry.toFixed(4)),
            floor,
            y: baseY,
            networked: false,
          },
        );
      } else if (p.prop === 'armchair') {
        const pt = toWorld(0, 0.04);
        all.push({
          seatId: `tqb-${floor}f-${p.id}`,
          studyRoomId: 'library-lobby',
          tableId: p.id,
          label: p.name,
          x: pt.x,
          z: pt.z,
          facing: Number(p.ry.toFixed(4)),
          floor,
          y: baseY,
          networked: false,
        });
      }
    }
  }

  // 3. Floors 4 & 5 Reading Rooms (401/501, 418/525, 419/526, 402/509, 404/511, 411/518)
  for (const floor of [4, 5] as const) {
    const baseY = getFloorBaseElevation(floor);
    const r401Label = floor === 4 ? '401' : '501';
    const r418Label = floor === 4 ? '418' : '525';
    const r411Label = floor === 4 ? '411' : '518';
    const r419Label = floor === 4 ? '419' : '526';
    const r402Label = floor === 4 ? '402' : '509';
    const r404Label = floor === 4 ? '404' : '511';
    const r4 = ROOM_401_DIMS;
    const R4Z = BLOCK_A_DIMS.R4Z;

    // Room 401 / 501 — 12 large reading tables (6 chairs each on West & East sides matching buildRoom401.ts)
    const chairX = r4.TW / 2 + 0.18;
    const slotD = r4.TD / 3;
    const bayZ0 = -r4.TD / 2 + 0.5 * slotD;
    const bayZ1 = 0;
    const bayZ2 = -r4.TD / 2 + 2.5 * slotD;
    let tIdx = 1;
    for (const tx of r4.TX) {
      for (const tzLocal of r4.TZ_LOCAL) {
        const tz = R4Z + tzLocal;
        const tableId = `f${floor}-r${r401Label}-table-${tIdx++}`;
        const seatOffsets: Array<[number, number, number, string]> = [
          [-chairX, bayZ0, Math.PI / 2, 'Tây-Bắc'],
          [chairX, bayZ0, -Math.PI / 2, 'Đông-Bắc'],
          [-chairX, bayZ2, Math.PI / 2, 'Tây-Nam'],
          [chairX, bayZ2, -Math.PI / 2, 'Đông-Nam'],
          [-chairX, bayZ1, Math.PI / 2, 'Tây-Giữa'],
          [chairX, bayZ1, -Math.PI / 2, 'Đông-Giữa'],
        ];
        seatOffsets.forEach(([ox, oz, facing, suffix], sIdx) => {
          all.push({
            seatId: `tqb-${tableId}-s${sIdx + 1}`,
            studyRoomId: 'library-lobby',
            tableId,
            label: `Bàn đọc P.${r401Label} #${tIdx - 1} (${suffix})`,
            x: Number((tx + ox).toFixed(3)),
            z: Number((tz + oz).toFixed(3)),
            facing: Number(facing.toFixed(4)),
            floor,
            y: baseY,
            networked: false,
          });
        });
      }
    }

    // Room 401 / 501 — L-shaped PC lookup counter seats matching buildRoom401.ts
    const cBackZ = R4Z - r4.HD + r4.WT / 2 + r4.COMP_CD / 2 + 0.03;
    const cBackX0 = -0.3;
    const cBackX1 = cBackX0 + r4.COMP_W;
    for (let i = 0; i < 10; i++) {
      const pcX = cBackX0 + 0.72 + (i * (r4.COMP_W - 1.44)) / 9;
      all.push({
        seatId: `tqb-f${floor}-r${r401Label}-pc-${i + 1}`,
        studyRoomId: 'library-lobby',
        tableId: `f${floor}-r${r401Label}-comp-back`,
        label: `Máy tính tra cứu P.${r401Label} #${i + 1}`,
        x: Number(pcX.toFixed(3)),
        z: Number((cBackZ + 0.39).toFixed(3)),
        facing: Math.PI,
        floor,
        y: baseY,
        networked: false,
      });
    }
    const cRightX = r4.HW - r4.WT / 2 - r4.COMP_CD / 2 - 0.03;
    const cRightZ0 = R4Z - r4.HD + r4.WT / 2 + r4.COMP_CD;
    for (let i = 0; i < 8; i++) {
      const pcZ = cRightZ0 + 0.72 + (i * (r4.COMP_R - 1.44)) / 7;
      all.push({
        seatId: `tqb-f${floor}-r${r401Label}-pc-${11 + i}`,
        studyRoomId: 'library-lobby',
        tableId: `f${floor}-r${r401Label}-comp-right`,
        label: `Máy tính tra cứu P.${r401Label} #${11 + i}`,
        x: Number((cRightX - 0.39).toFixed(3)),
        z: Number(pcZ.toFixed(3)),
        facing: Number((Math.PI / 2).toFixed(4)),
        floor,
        y: baseY,
        networked: false,
      });
    }

    // Helper for 6-chair rectangular reading room tables (`r4LongTbl`: cx ∈ [0, -0.82, 0.82], cz = ±0.64)
    const addRoomTables = (
      roomCode: string,
      xs: readonly number[],
      zs: readonly number[],
    ) => {
      let idx = 1;
      for (const tx of xs) {
        for (const tz of zs) {
          const tid = `f${floor}-r${roomCode}-table-${idx++}`;
          const spots: ReadonlyArray<[number, number, number, string]> = [
            [0, -0.64, 0, 'Bắc-Giữa'],
            [0, 0.64, Math.PI, 'Nam-Giữa'],
            [-0.82, -0.64, 0, 'Bắc-Tây'],
            [-0.82, 0.64, Math.PI, 'Nam-Tây'],
            [0.82, -0.64, 0, 'Bắc-Đông'],
            [0.82, 0.64, Math.PI, 'Nam-Đông'],
          ];
          spots.forEach(([ox, oz, facing, sideLabel], sIdx) => {
            all.push({
              seatId: `tqb-${tid}-s${sIdx + 1}`,
              studyRoomId: 'library-lobby',
              tableId: tid,
              label: `Bàn đọc P.${roomCode} #${idx - 1} (${sideLabel})`,
              x: Number((tx + ox).toFixed(3)),
              z: Number((tz + oz).toFixed(3)),
              facing,
              floor,
              y: baseY,
              networked: false,
            });
          });
        }
      }
    };

    addRoomTables(r418Label, [8.2, 13.8], [-17.5, -22.0, -26.5]);
    addRoomTables(r419Label, [24.2, 31.2], [-9.5, -5.0, 0.0, 5.0, 9.5]);
    addRoomTables(r402Label, [-30.5, -24.2], [1.5, 5.2, 8.9]);
    addRoomTables(r411Label, [-11.5, -3.2, 3.2, 11.5], [16.5, 20.2, 24.0]);

    // Room 404 / 511 (`fill404` round tables & sofas in West Wing North section)
    [-9.5, -3.5].forEach((tz, rIdx) => {
      const roundRy = 0.2;
      const cosR = Math.cos(roundRy);
      const sinR = Math.sin(roundRy);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const lx = Math.cos(a) * 0.82;
        const lz = Math.sin(a) * 0.82;
        all.push({
          seatId: `tqb-f${floor}-r${r404Label}-round-${rIdx + 1}-s${i + 1}`,
          studyRoomId: 'library-lobby',
          tableId: `f${floor}-r${r404Label}-round-${rIdx + 1}`,
          label: `Bàn tròn P.${r404Label} #${rIdx + 1} · Ghế ${i + 1}`,
          x: Number((-22.2 + lx * cosR + lz * sinR).toFixed(3)),
          z: Number((tz - lx * sinR + lz * cosR).toFixed(3)),
          facing: Number((roundRy - a - Math.PI / 2).toFixed(4)),
          floor,
          y: baseY,
          networked: false,
        });
      }
      all.push({
        seatId: `tqb-f${floor}-r${r404Label}-sofa-${rIdx + 1}`,
        studyRoomId: 'library-lobby',
        tableId: `f${floor}-r${r404Label}-sofa-${rIdx + 1}`,
        label: `Sofa P.${r404Label} #${rIdx + 1}`,
        x: -24.46,
        z: tz,
        facing: Number((Math.PI / 2).toFixed(4)),
        floor,
        y: baseY,
        networked: false,
      });
    });
  }

  // 4. Floor 6 (Block B Creative Space & Lounge)
  // 6 Mustard Armchairs on the raised wooden platform (y = 0.6)
  const f6Armchairs: ReadonlyArray<[number, number, number, string]> = [
    [-5.2, -3.8, 0.4, 'Ghế Lounge Sáng tạo Tây-Bắc'],
    [0.4, -5.4, -0.2, 'Ghế Lounge Sáng tạo Bắc'],
    [5.4, -3.8, -0.6, 'Ghế Lounge Sáng tạo Đông-Bắc'],
    [-5.2, 3.8, 2.5, 'Ghế Lounge Sáng tạo Tây-Nam'],
    [1.8, 4.8, 3.0, 'Ghế Lounge Sáng tạo Nam'],
    [5.4, 3.2, -2.4, 'Ghế Lounge Sáng tạo Đông-Nam'],
  ];
  f6Armchairs.forEach(([ax, az, ry, label], idx) => {
    all.push({
      seatId: `tqb-6f-armchair-${idx + 1}`,
      studyRoomId: 'library-lobby',
      tableId: `f6-armchair-${idx + 1}`,
      label: `Tầng 6 · ${label}`,
      x: ax,
      z: az,
      facing: ry,
      floor: 6,
      y: BLOCK_B_DIMS.PY,
      networked: false,
    });
  });

  // Grand Piano Bench on Floor 6 (y = 0.6, local [0, 0, -1.04] inside PIANO at [-6.6, 3.6, ry=0.38])
  all.push({
    seatId: 'tqb-6f-piano-bench',
    studyRoomId: 'library-lobby',
    tableId: 'f6-grand-piano',
    label: 'Tầng 6 · Ghế Đàn Đại dương cầm Grand Piano',
    x: -6.986,
    z: 2.634,
    facing: 0.38,
    floor: 6,
    y: BLOCK_B_DIMS.PY,
    networked: false,
  });

  // 5. Floor 7 (Block B Mezzanine study tables at r = FR + 2.2 = 13.2m, y = 5.25)
  for (let i = 0; i < 14; i++) {
    const s = (i + 0.5) / 14;
    const p = stadiumPointAt(s, BLOCK_B_DIMS.L, BLOCK_B_DIMS.FR + 2.2);
    if (p.x > BLOCK_B_DIMS.L + 6) continue;
    const cx = Math.max(-BLOCK_B_DIMS.L, Math.min(BLOCK_B_DIMS.L, p.x));
    const ry = Math.atan2(-(p.x - cx), -p.z);
    const cos = Math.cos(ry);
    const sin = Math.sin(ry);
    const tid = `f7-mezz-table-${i + 1}`;
    const chairSpots: ReadonlyArray<[number, number, number, string]> = [
      [-0.42, -0.55, 0, 'Trong-Tây'],
      [-0.42, 0.55, Math.PI, 'Ngoài-Tây'],
      [0.42, -0.55, 0, 'Trong-Đông'],
      [0.42, 0.55, Math.PI, 'Ngoài-Đông'],
    ];
    chairSpots.forEach(([lx, lz, faceOffset, sideLabel], sIdx) => {
      all.push({
        seatId: `tqb-7f-table-${i + 1}-s${sIdx + 1}`,
        studyRoomId: 'library-lobby',
        tableId: tid,
        label: `Bàn học Tầng lửng T7 #${i + 1} (${sideLabel})`,
        x: Number((p.x + lx * cos + lz * sin).toFixed(3)),
        z: Number((p.z - lx * sin + lz * cos).toFixed(3)),
        facing: Number((ry + faceOffset).toFixed(4)),
        floor: 7,
        y: BLOCK_B_DIMS.MZ,
        networked: false,
      });
    });
  }

  // 6. Floor 10 (Block D Rooftop Pergola tables, Plush Daybeds with Colorful Pillows, Sun loungers & Beanbags)
  const pgZ = BLOCK_D_DIMS.PG.tableZ; // 4.8
  BLOCK_D_DIMS.PG.tableXs.forEach((tx, idx) => {
    const tid = `f10-pergola-table-${idx + 1}`;
    all.push(
      {
        seatId: `tqb-10f-pergola-${idx + 1}-s1`,
        studyRoomId: 'library-lobby',
        tableId: tid,
        label: `Bàn gỗ Pergola Sân thượng T10 #${idx + 1} (Bắc)`,
        x: tx,
        z: Number((pgZ - 0.78).toFixed(3)),
        facing: 0,
        floor: 10,
        y: 0.0,
        networked: false,
      },
      {
        seatId: `tqb-10f-pergola-${idx + 1}-s2`,
        studyRoomId: 'library-lobby',
        tableId: tid,
        label: `Bàn gỗ Pergola Sân thượng T10 #${idx + 1} (Nam)`,
        x: tx,
        z: Number((pgZ + 0.78).toFixed(3)),
        facing: Math.PI,
        floor: 10,
        y: 0.0,
        networked: false,
      },
    );
  });

  // Floor 10 Plush Rooftop Daybeds with Colorful Soft Pillows (Giường nệm & gối mềm đa sắc màu)
  [-17.2, -14.2, -11.2].forEach((bx, idx) => {
    all.push({
      seatId: `tqb-10f-bed-${idx + 1}`,
      studyRoomId: 'library-lobby',
      tableId: `f10-bed-${idx + 1}`,
      label: `Giường nệm & Gối mềm Sân thượng T10 #${idx + 1}`,
      x: bx,
      z: -4.8,
      facing: 0,
      floor: 10,
      y: 0.05,
      networked: false,
    });
  });

  // Floor 10 Sun loungers on West lawn (also with colorful soft pillows & lying posture)
  [-17.2, -14.2, -11.2].forEach((lx, idx) => {
    all.push({
      seatId: `tqb-10f-lounger-${idx + 1}`,
      studyRoomId: 'library-lobby',
      tableId: `f10-lounger-${idx + 1}`,
      label: `Ghế nằm thư giãn & Gối mềm Sân thượng T10 #${idx + 1}`,
      x: lx,
      z: 3.4,
      facing: 0.15,
      floor: 10,
      y: 0.06,
      networked: false,
    });
  });

  // Floor 10 Beanbags (khớp 1:1 tọa độ mesh & collider [-16.5, -14.2, -11.8])
  const f10Beanbags: ReadonlyArray<[number, number, string]> = [
    [-16.5, -1.9, 'Ghế lười Beanbag Cam T10'],
    [-14.2, -1.9, 'Ghế lười Beanbag Xanh T10'],
    [-11.8, -1.9, 'Ghế lười Beanbag Đỏ T10'],
  ];
  f10Beanbags.forEach(([bx, bz, label], idx) => {
    all.push({
      seatId: `tqb-10f-beanbag-${idx + 1}`,
      studyRoomId: 'library-lobby',
      tableId: `f10-beanbag-${idx + 1}`,
      label,
      x: bx,
      z: bz,
      facing: 0,
      floor: 10,
      y: 0.0,
      networked: false,
    });
  });

  return all;
}

const ALL_LIBRARY_SEATS: readonly ExtendedLibrarySeatDefinition[] = buildAllLibrarySeats();

const ALL_LIBRARY_SEAT_MAP: ReadonlyMap<string, ExtendedLibrarySeatDefinition> = new Map(
  ALL_LIBRARY_SEATS.map((s) => [s.seatId, s]),
);

const LIBRARY_SEATS_BY_FLOOR: ReadonlyMap<LibraryFloor, readonly ExtendedLibrarySeatDefinition[]> =
  new Map(
    ([1, 2, 3, 4, 5, 6, 7, 10] as const).map((flr) => [
      flr,
      ALL_LIBRARY_SEATS.filter((s) => s.floor === flr),
    ]),
  );

export function getAllLibrarySeatsForFloor(
  floorInput: number = 1,
): readonly ExtendedLibrarySeatDefinition[] {
  const floor = sanitizeLibraryFloor(floorInput, 1);
  return LIBRARY_SEATS_BY_FLOOR.get(floor) ?? [];
}

export function getAnyLibrarySeatDefinition(
  seatId: unknown,
): ExtendedLibrarySeatDefinition | undefined {
  if (typeof seatId !== 'string') return undefined;
  return ALL_LIBRARY_SEAT_MAP.get(seatId);
}

export function isAnyLibrarySeatId(seatId: unknown): seatId is string {
  return typeof seatId === 'string' && ALL_LIBRARY_SEAT_MAP.has(seatId);
}

export function findNearestLibrarySeat(
  pos: Vec2,
  maxRadius: number = SEAT_INTERACT_RADIUS,
  libraryFloor = 1,
): { seat: ExtendedLibrarySeatDefinition; distance: number } | null {
  if (
    libraryFloor !== 1 &&
    libraryFloor !== 2 &&
    libraryFloor !== 3 &&
    libraryFloor !== 4 &&
    libraryFloor !== 5 &&
    libraryFloor !== 6 &&
    libraryFloor !== 7 &&
    libraryFloor !== 10
  ) {
    return null;
  }
  const seats = getAllLibrarySeatsForFloor(libraryFloor);
  let bestSeat: ExtendedLibrarySeatDefinition | null = null;
  let bestDist = Infinity;

  for (const seat of seats) {
    const d = Math.hypot(pos.x - seat.x, pos.z - seat.z);
    if (d <= maxRadius && d < bestDist) {
      bestDist = d;
      bestSeat = seat;
    }
  }

  return bestSeat ? { seat: bestSeat, distance: bestDist } : null;
}

/**
 * Computes a collision-safe standing position near `seat` in `LibraryLobby`
 * verified against the seat floor's colliders with `AVATAR.radius` (0.4m).
 */
export function computeSafeStandUpPosition(
  seat: StudySeatDefinition | ExtendedLibrarySeatDefinition,
  fallbackOrigin?: Vec2,
): Vec2 {
  const seatFloor: LibraryFloor =
    'floor' in seat && typeof seat.floor === 'number'
      ? sanitizeLibraryFloor(seat.floor, 1)
      : getAnyLibrarySeatDefinition(seat.seatId)?.floor ?? 1;

  const fwdX = Math.sin(seat.facing);
  const fwdZ = Math.cos(seat.facing);
  const rightX = Math.cos(seat.facing);
  const rightZ = -Math.sin(seat.facing);

  const candidates: Vec2[] = [
    // 1. Directly behind the chair backrest
    {
      x: +(seat.x - fwdX * SEAT_STAND_OFFSET).toFixed(3),
      z: +(seat.z - fwdZ * SEAT_STAND_OFFSET).toFixed(3),
    },
    // 2. Slightly further behind the chair
    {
      x: +(seat.x - fwdX * (SEAT_STAND_OFFSET + 0.14)).toFixed(3),
      z: +(seat.z - fwdZ * (SEAT_STAND_OFFSET + 0.14)).toFixed(3),
    },
    // 3. Back-left / Back-right of the chair
    {
      x: +(seat.x - fwdX * SEAT_STAND_OFFSET - rightX * 0.45).toFixed(3),
      z: +(seat.z - fwdZ * SEAT_STAND_OFFSET - rightZ * 0.45).toFixed(3),
    },
    {
      x: +(seat.x - fwdX * SEAT_STAND_OFFSET + rightX * 0.45).toFixed(3),
      z: +(seat.z - fwdZ * SEAT_STAND_OFFSET + rightZ * 0.45).toFixed(3),
    },
  ];

  // Step-back & lateral candidates behind/beside the chair first
  for (const dist of [0.85, 1.05, 1.25, 1.45]) {
    candidates.push(
      {
        x: +(seat.x - fwdX * dist).toFixed(3),
        z: +(seat.z - fwdZ * dist).toFixed(3),
      },
      {
        x: +(seat.x - rightX * dist).toFixed(3),
        z: +(seat.z - rightZ * dist).toFixed(3),
      },
      {
        x: +(seat.x + rightX * dist).toFixed(3),
        z: +(seat.z + rightZ * dist).toFixed(3),
      },
    );
  }

  if (fallbackOrigin) {
    candidates.push({ x: fallbackOrigin.x, z: fallbackOrigin.z });
  }

  for (const dist of [0.85, 1.05, 1.25, 1.45]) {
    candidates.push({
      x: +(seat.x + fwdX * dist).toFixed(3),
      z: +(seat.z + fwdZ * dist).toFixed(3),
    });
  }

  for (const cand of candidates) {
    const resolved = resolveLibraryLobbyCollisions(cand, AVATAR.radius, seatFloor);
    if (
      resolved.hit === null &&
      Math.hypot(resolved.pos.x - cand.x, resolved.pos.z - cand.z) < 0.01
    ) {
      return resolved.pos;
    }
  }

  return resolveLibraryLobbyCollisions(
    fallbackOrigin ?? { ...LIBRARY_LOBBY.spawn },
    AVATAR.radius,
    seatFloor,
  ).pos;
}

export interface ValidateSeatSelectionInput {
  seatId: unknown;
  playerPos: Vec2;
  inLibraryLobby: boolean;
  libraryFloor?: number;
  inClassroom: boolean;
  bikeRiding: boolean;
  uiLocked?: boolean;
  currentSeating: LocalSeatingState;
  maxRadius?: number;
}

export type ValidateSeatSelectionResult =
  | {
      ok: true;
      seat: ExtendedLibrarySeatDefinition;
      standUpPos: Vec2;
      distance: number;
    }
  | {
      ok: false;
      reason: SeatSelectionRejectionReason;
      message: string;
    };

export function validateSeatSelection(
  input: ValidateSeatSelectionInput,
): ValidateSeatSelectionResult {
  const {
    seatId,
    playerPos,
    inLibraryLobby,
    libraryFloor = 1,
    inClassroom,
    bikeRiding,
    uiLocked = false,
    currentSeating,
    maxRadius = SEAT_INTERACT_RADIUS,
  } = input;

  const seat = getAnyLibrarySeatDefinition(seatId);
  if (!seat) {
    return {
      ok: false,
      reason: 'invalid-seat',
      message: 'Ghế học không hợp lệ.',
    };
  }

  if (!inLibraryLobby || inClassroom) {
    return {
      ok: false,
      reason: 'wrong-room',
      message: 'Bạn cần ở trong Thư viện Tạ Quang Bửu để ngồi ghế này.',
    };
  }

  if (libraryFloor !== seat.floor) {
    return {
      ok: false,
      reason: 'wrong-floor',
      message: `Ghế học này nằm tại Tầng ${seat.floor} — hãy chuyển tới Tầng ${seat.floor} để ngồi học.`,
    };
  }

  if (bikeRiding) {
    return {
      ok: false,
      reason: 'riding-bike',
      message: 'Không thể ngồi học khi đang lái xe máy.',
    };
  }

  if (uiLocked && seat.seatId !== 'tqb-6f-piano-bench') {
    return {
      ok: false,
      reason: 'ui-locked',
      message: 'Hãy đóng bảng hiện tại trước khi chọn ghế học.',
    };
  }

  if (currentSeating.transitionLock) {
    return {
      ok: false,
      reason: 'transition-locked',
      message: 'Đang chuyển tư thế — vui lòng đợi một chút.',
    };
  }

  if (currentSeating.status === 'seated') {
    if (currentSeating.seatId === seat.seatId) {
      return {
        ok: false,
        reason: 'already-seated-same',
        message: `Bạn đang ngồi tại ${seat.label} rồi.`,
      };
    }
    return {
      ok: false,
      reason: 'already-seated-other',
      message: 'Bạn đang ngồi học — hãy bấm "Đứng dậy" trước khi chuyển sang ghế khác.',
    };
  }

  const distance = Math.hypot(playerPos.x - seat.x, playerPos.z - seat.z);
  const effectiveMaxRadius =
    seat.seatId === 'tqb-6f-piano-bench' ? Math.max(maxRadius, 3.2) : maxRadius;
  if (distance > effectiveMaxRadius) {
    return {
      ok: false,
      reason: 'too-far',
      message: 'Hãy lại gần ghế đọc sách hơn để ngồi học (phím E hoặc bấm vào ghế).',
    };
  }

  const standUpPos = computeSafeStandUpPosition(seat, playerPos);

  return {
    ok: true,
    seat,
    standUpPos,
    distance,
  };
}

export interface SitTransitionResult {
  ok: boolean;
  state: LocalSeatingState;
  seat?: ExtendedLibrarySeatDefinition;
  reason?: SeatSelectionRejectionReason;
  message?: string;
}

export function transitionToSeated(
  current: LocalSeatingState,
  input: Omit<ValidateSeatSelectionInput, 'currentSeating'>,
): SitTransitionResult {
  const check = validateSeatSelection({
    ...input,
    currentSeating: current,
  });

  if (!check.ok) {
    return {
      ok: false,
      state: current,
      reason: check.reason,
      message: check.message,
    };
  }

  const nextState: LocalSeatingState = {
    status: 'seated',
    studyRoomId: check.seat.studyRoomId,
    seatId: check.seat.seatId,
    seatLabel: check.seat.label,
    tableId: check.seat.tableId,
    anchorPos: { x: check.seat.x, z: check.seat.z },
    facing: check.seat.facing,
    standUpPos: check.standUpPos,
    transitionLock: false,
  };

  return {
    ok: true,
    state: nextState,
    seat: check.seat,
  };
}

export interface StandTransitionResult {
  ok: boolean;
  state: LocalSeatingState;
  releasedSeatId: string | null;
  standUpPos: Vec2 | null;
  facing: number | null;
  reason?: 'not-seated' | 'transition-locked';
}

export function transitionToStanding(current: LocalSeatingState): StandTransitionResult {
  if (current.transitionLock) {
    return {
      ok: false,
      state: current,
      releasedSeatId: null,
      standUpPos: null,
      facing: null,
      reason: 'transition-locked',
    };
  }

  if (current.status !== 'seated' || !current.seatId) {
    return {
      ok: false,
      state: current,
      releasedSeatId: null,
      standUpPos: null,
      facing: null,
      reason: 'not-seated',
    };
  }

  const seatDef = getAnyLibrarySeatDefinition(current.seatId) ?? getSeatDefinition(current.seatId);
  const standUpPos =
    current.standUpPos ??
    (seatDef
      ? computeSafeStandUpPosition(seatDef, current.anchorPos ?? undefined)
      : resolveLibraryLobbyCollisions({ ...LIBRARY_LOBBY.spawn }, AVATAR.radius).pos);

  return {
    ok: true,
    state: createInitialSeatingState(),
    releasedSeatId: current.seatId,
    standUpPos,
    facing: current.facing,
  };
}

/**
 * Ensures local sitting state is released immediately if the player leaves
 * `LibraryLobby`, enters `Classroom`, mounts a motorbike, or switches away
 * from the seated seat's floor.
 */
export function reconcileSeatingWithEnvironment(
  current: LocalSeatingState,
  env: {
    inLibraryLobby: boolean;
    inClassroom: boolean;
    bikeRiding: boolean;
    libraryFloor?: number;
  },
): { state: LocalSeatingState; released: boolean; releasedSeatId: string | null } {
  if (current.status !== 'seated') {
    return { state: current, released: false, releasedSeatId: null };
  }
  const activeFloor = env.libraryFloor ?? 1;
  const seatFloor = current.seatId
    ? (getAnyLibrarySeatDefinition(current.seatId)?.floor ?? 1)
    : 1;
  if (!env.inLibraryLobby || env.inClassroom || env.bikeRiding || activeFloor !== seatFloor) {
    return {
      state: createInitialSeatingState(),
      released: true,
      releasedSeatId: current.seatId,
    };
  }
  return { state: current, released: false, releasedSeatId: null };
}

/**
 * Reconciles a persisted StudySessionState's `seatId` and `studyRoomId` on reload
 * or room/floor change against the actual local seating state so a stale seat ID is
 * never restored when the player is not actually seated on that floor, while
 * preserving Pomodoro state, tasks, subject, and focus history.
 */
export function reconcilePersistedSessionSeat(
  session: StudySessionState,
  env: { inLibraryLobby: boolean; activeSeatId: string | null; libraryFloor?: number },
): StudySessionState {
  const activeFloor = env.libraryFloor ?? 1;
  const seatDef = env.activeSeatId ? getAnyLibrarySeatDefinition(env.activeSeatId) : undefined;
  const validLobbySeat =
    env.inLibraryLobby && seatDef && seatDef.floor === activeFloor
      ? env.activeSeatId
      : null;

  const targetRoomId: StudyRoomZoneId | null = validLobbySeat
    ? 'library-lobby'
    : env.inLibraryLobby
      ? 'library-lobby'
      : null;

  if (session.seatId === validLobbySeat && session.studyRoomId === targetRoomId) {
    return session;
  }

  return {
    ...session,
    studyRoomId: targetRoomId,
    seatId: validLobbySeat,
  };
}

export interface ReleaseSeatDriver {
  standUp?: () => {
    ok: boolean;
    reason?: string;
    releasedSeatId?: string | null;
    pos?: Vec2;
  };
}

export interface ReleaseActiveSeatOptions {
  driver?: ReleaseSeatDriver | null;
  fallbackSeatId?: string | null;
}

export interface ReleaseActiveSeatResult {
  released: boolean;
  releasedSeatId: string | null;
  standUpPos: Vec2 | null;
  viaMountedPlayer: boolean;
}

/**
 * Safe, centralized seat-release transition that works both when the 3D `Player`
 * component is mounted (`driver.standUp` available) and when `CampusScene`/`Player`
 * are unmounted during Zen 2D (`driver` is undefined).
 */
export function releaseActiveSeatSafely(
  options: ReleaseActiveSeatOptions = {},
): ReleaseActiveSeatResult {
  const { driver, fallbackSeatId = null } = options;

  // 1. Mounted 3D Player path: delegate directly to Player's internal standUp().
  if (driver && typeof driver.standUp === 'function') {
    const res = driver.standUp();
    if (res?.ok) {
      return {
        released: true,
        releasedSeatId: res.releasedSeatId ?? null,
        standUpPos: res.pos ? { ...res.pos } : { ...playerState.pos },
        viaMountedPlayer: true,
      };
    }

    const staleSeatId = playerState.seatId ?? fallbackSeatId;
    if (playerState.seated || staleSeatId) {
      playerState.seated = false;
      playerState.seatId = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bkhn:seat-change', {
            detail: {
              seated: false,
              seatId: null,
              seatLabel: null,
              studyRoomId: playerState.inLibraryLobby ? 'library-lobby' : null,
            },
          }),
        );
      }
    }

    return {
      released: false,
      releasedSeatId: null,
      standUpPos: null,
      viaMountedPlayer: true,
    };
  }

  // 2. Unmounted Player path (e.g. Zen 2D mode has suspended 3D rendering):
  const activeSeatId = playerState.seatId ?? fallbackSeatId ?? null;
  const wasSeated = Boolean(playerState.seated || activeSeatId);
  if (!wasSeated) {
    return {
      released: false,
      releasedSeatId: null,
      standUpPos: null,
      viaMountedPlayer: false,
    };
  }

  const seatDef = activeSeatId
    ? (getAnyLibrarySeatDefinition(activeSeatId) ?? getSeatDefinition(activeSeatId))
    : undefined;
  let standUpPos: Vec2 = { ...playerState.pos };

  if (playerState.inLibraryLobby) {
    standUpPos = seatDef
      ? computeSafeStandUpPosition(seatDef, playerState.pos)
      : resolveLibraryLobbyCollisions(
          { ...playerState.pos },
          AVATAR.radius,
          playerState.libraryFloor,
        ).pos;
    playerState.pos = { ...standUpPos };
    if (seatDef) {
      playerState.facing = seatDef.facing;
    }
  }

  playerState.seated = false;
  playerState.seatId = null;
  playerState.moving = false;
  playerInput.move.x = 0;
  playerInput.move.y = 0;
  playerInput.run = false;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bkhn:seat-change', {
        detail: {
          seated: false,
          seatId: null,
          seatLabel: null,
          studyRoomId: playerState.inLibraryLobby ? 'library-lobby' : null,
        },
      }),
    );
  }

  return {
    released: true,
    releasedSeatId: activeSeatId,
    standUpPos: { ...standUpPos },
    viaMountedPlayer: false,
  };
}

export type ReconnectSeatDecision =
  | { action: 'none' }
  | { action: 'preserve-confirmed'; seatId: string }
  | { action: 'release-stale-server-seat'; seatId: string }
  | {
      action: 'stand-up-occupied';
      seatId: string;
      occupiedByName: string;
      releaseServerSeatId?: string;
    }
  | {
      action: 'reclaim-available';
      seatId: string;
      previousServerSeatId?: string;
    };

/**
 * Pure decision helper for FIX 5 — evaluates what action to take for the local
 * player when an authoritative `study:room-snapshot` arrives on reconnect.
 */
export function evaluateReconnectSeatAction(input: {
  inLibraryLobby: boolean;
  libraryFloor?: number;
  localSeated: boolean;
  localSeatId: string | null;
  mpStatus: 'idle' | 'connecting' | 'online' | 'offline';
  selfId: string | null;
  seatMap: Record<string, { occupantId: string; occupantName: string }>;
}): ReconnectSeatDecision {
  if (input.mpStatus !== 'online' || !input.selfId) {
    return { action: 'none' };
  }

  const serverOwnedSeatId =
    Object.keys(input.seatMap).find(
      (sid) => input.seatMap[sid]?.occupantId === input.selfId,
    ) ?? null;

  const onFloor1 = (input.libraryFloor ?? 1) === 1;
  if (!input.inLibraryLobby || !onFloor1 || !input.localSeated || !input.localSeatId) {
    if (serverOwnedSeatId) {
      return { action: 'release-stale-server-seat', seatId: serverOwnedSeatId };
    }
    return { action: 'none' };
  }

  if (!isLibraryLobbySeatId(input.localSeatId)) {
    // Non-networked local seat on Floor 1 (e.g. lobby sofa/armchair): release any stale server seat
    // if the player is strictly on a non-networked local seat, or stand up if invalid.
    if (isAnyLibrarySeatId(input.localSeatId)) {
      if (serverOwnedSeatId) {
        return { action: 'release-stale-server-seat', seatId: serverOwnedSeatId };
      }
      return { action: 'none' };
    }
    return {
      action: 'stand-up-occupied',
      seatId: input.localSeatId,
      occupiedByName: 'hệ thống',
      ...(serverOwnedSeatId ? { releaseServerSeatId: serverOwnedSeatId } : {}),
    };
  }

  const occ = input.seatMap[input.localSeatId];
  if (occ && occ.occupantId === input.selfId) {
    return { action: 'preserve-confirmed', seatId: input.localSeatId };
  }
  if (occ && occ.occupantId !== input.selfId) {
    return {
      action: 'stand-up-occupied',
      seatId: input.localSeatId,
      occupiedByName: occ.occupantName || 'bạn khác',
      ...(serverOwnedSeatId && serverOwnedSeatId !== input.localSeatId
        ? { releaseServerSeatId: serverOwnedSeatId }
        : {}),
    };
  }
  return {
    action: 'reclaim-available',
    seatId: input.localSeatId,
    ...(serverOwnedSeatId && serverOwnedSeatId !== input.localSeatId
      ? { previousServerSeatId: serverOwnedSeatId }
      : {}),
  };
}

export type ReclaimOutcomeDecision =
  | { action: 'keep-seated'; seatId: string }
  | { action: 'release-server-seat'; seatId: string }
  | { action: 'keep-offline'; seatId: string }
  | { action: 'noop' }
  | {
      action: 'stand-up-failed';
      seatId: string;
      reason: string;
      occupiedByName?: string;
      releaseServerSeatId?: string;
    };

/**
 * Pure reconciliation helper for FIX 5 — determines how to reconcile local seating
 * after an async `requestSeatClaim` triggered by `reclaim-available` settles.
 */
export function evaluateReclaimOutcome(input: {
  targetSeatId: string;
  outcome:
    | { ok: true; occupancy: { seatId: string; occupantId: string } }
    | {
        ok: false;
        seatId: string;
        reason: string;
        occupiedBy?: string;
        occupiedByName?: string;
      };
  currentlyInLibraryLobby: boolean;
  currentLibraryFloor?: number;
  currentlySeated: boolean;
  currentLocalSeatId: string | null;
  previousServerSeatId?: string | null;
}): ReclaimOutcomeDecision {
  const stillSeatedAtTarget =
    input.currentlyInLibraryLobby &&
    (input.currentLibraryFloor ?? 1) === 1 &&
    input.currentlySeated &&
    input.currentLocalSeatId === input.targetSeatId;

  if (input.outcome.ok) {
    if (stillSeatedAtTarget) {
      return { action: 'keep-seated', seatId: input.targetSeatId };
    }
    return { action: 'release-server-seat', seatId: input.targetSeatId };
  }

  if (!stillSeatedAtTarget) {
    if (input.previousServerSeatId) {
      return { action: 'release-server-seat', seatId: input.previousServerSeatId };
    }
    return { action: 'noop' };
  }

  if (input.outcome.reason === 'offline') {
    return { action: 'keep-offline', seatId: input.targetSeatId };
  }

  return {
    action: 'stand-up-failed',
    seatId: input.targetSeatId,
    reason: input.outcome.reason,
    ...(input.outcome.occupiedByName
      ? { occupiedByName: input.outcome.occupiedByName }
      : {}),
    ...(input.previousServerSeatId
      ? { releaseServerSeatId: input.previousServerSeatId }
      : {}),
  };
}
