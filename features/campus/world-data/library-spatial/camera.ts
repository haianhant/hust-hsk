// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/camera.ts — Collision & Occlusion
// Resolver for the Third-Person Indoor Camera in Tạ Quang Bửu Library (PR10B).
//
// Pure TypeScript module (zero React / Three.js runtime dependencies).
// Reuses PR10A canonical spatial definitions (wall colliders, doorway lintels,
// structural columns, elevator shafts, tall furniture AABBs, and per-block
// ceiling/slab envelopes) to prevent wall, ceiling, and furniture clipping.
// ---------------------------------------------------------------------------

import {
  getBlockForFloor,
  getFloorBaseElevation,
  isValidLibraryFloor,
} from './floors';
import {
  BLOCK_A_DIMS,
  BLOCK_B_DIMS,
  BLOCK_D_DIMS,
  getCollidersForFloor,
  getDoorwaysForFloor,
  signedDistanceToStadium,
} from './geometry';
import { evaluateCurvedStairAt } from './elevation';
import type { LibraryFloor } from './types';

export interface LibraryCameraVec3 {
  x: number;
  y: number;
  z: number;
}

export interface LibraryCameraOcclusionInput {
  floor: number;
  target: LibraryCameraVec3;
  desiredPosition: LibraryCameraVec3;
  cameraRadius?: number;
  minDistance?: number;
}

export type LibraryCameraBlockerKind =
  | 'wall'
  | 'ceiling'
  | 'floor'
  | 'column'
  | 'furniture'
  | 'boundary'
  | null;

export interface LibraryCameraOcclusionResult {
  position: LibraryCameraVec3;
  target: LibraryCameraVec3;
  desiredDistance: number;
  safeDistance: number;
  hitFraction: number;
  occluded: boolean;
  blockerId: string | null;
  blockerKind: LibraryCameraBlockerKind;
}

interface Box3D {
  id: string;
  kind: Exclude<LibraryCameraBlockerKind, null>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

const DEFAULT_CAMERA_RADIUS = 0.26;
const DEFAULT_MIN_DISTANCE = 0.28;
const TALL_FURNITURE_MIN_HEIGHT = 1.35;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Returns the valid vertical camera envelope `[minY, maxY]` at `(x, z)` for
 * the given library floor. Prevents the camera from clipping above suspended
 * ceilings / upper floor slabs or below the active floor / stair surface.
 */
export function getCameraVerticalBoundsAt(
  floor: LibraryFloor,
  x: number,
  z: number,
): { minY: number; maxY: number; ceilingId: string; floorId: string } {
  const block = getBlockForFloor(floor);
  const baseY = getFloorBaseElevation(floor);

  if (block === 'A') {
    const minY = baseY;
    if (floor === 1 || floor === 2) {
      const stairHit = evaluateCurvedStairAt(x, z, 0.35);
      if (stairHit) {
        return {
          minY: floor === 1 ? 0 : Math.min(baseY, Math.max(0, stairHit.elevation - 0.35)),
          maxY: BLOCK_A_DIMS.FH + 4.14,
          ceilingId: 'f2-stairwell-ceiling',
          floorId: stairHit.stair.id,
        };
      }
    }

    // Floor 1 P.102 Book Lending Room (West wing: x < -19.5)
    if (floor === 1 && x < -BLOCK_A_DIMS.XW) {
      return {
        minY,
        maxY: baseY + 4.02,
        ceilingId: 'f1-p102-ceiling',
        floorId: 'f1-p102-floor',
      };
    }

    // North wing Reading Rooms 401/501 and 418/525 (z < -13.0 on Floors 4–5)
    if ((floor === 4 || floor === 5) && z < BLOCK_A_DIMS.ZB) {
      return {
        minY,
        maxY: baseY + 3.66,
        ceilingId: `f${floor}-reading-room-ceiling`,
        floorId: `f${floor}-reading-room-floor`,
      };
    }

    // Side and South rooms on Floors 4–5 (402, 404, 411, 419: x < -19.5 or x > 19.5 or z > 13.0)
    if (
      (floor === 4 || floor === 5) &&
      (x < -BLOCK_A_DIMS.XW || x > BLOCK_A_DIMS.XW || z > BLOCK_A_DIMS.ZF)
    ) {
      return {
        minY,
        maxY: baseY + 3.82,
        ceilingId: `f${floor}-side-room-ceiling`,
        floorId: `f${floor}-side-room-floor`,
      };
    }

    // Central stadium atrium void is open up to the skylight at y = 22.3m
    const inMainHall =
      x >= -BLOCK_A_DIMS.XW &&
      x <= BLOCK_A_DIMS.XW &&
      z >= BLOCK_A_DIMS.ZB &&
      z <= BLOCK_A_DIMS.ZF;
    const inAtriumVoid =
      inMainHall &&
      signedDistanceToStadium(x, z, BLOCK_A_DIMS.L, BLOCK_A_DIMS.FR).signedDist < -0.25;
    if (inAtriumVoid) {
      return {
        minY: floor === 1 ? 0 : Math.max(0, baseY - 2.2),
        maxY: 22.15,
        ceilingId: 'blockA-atrium-skylight',
        floorId: `f${floor}-atrium-floor`,
      };
    }

    // Standard Block A balcony / hall ceiling under the next floor slab
    const slabCeilingY = floor === 5 ? baseY + 4.2 : baseY + 4.14;
    return {
      minY,
      maxY: slabCeilingY,
      ceilingId: `f${floor}-slab-ceiling`,
      floorId: `f${floor}-slab-floor`,
    };
  }

  if (block === 'B') {
    if (floor === 6) {
      const inPlatform =
        signedDistanceToStadium(x, z, BLOCK_B_DIMS.L, BLOCK_B_DIMS.PR).signedDist <= 0;
      const minY = inPlatform ? BLOCK_B_DIMS.PY : 0.0;
      // Central atrium opening on Floor 6 rises to the high roof; outer ring
      // sits underneath the Floor 7 mezzanine slab (underside ~ 4.88m).
      const inMezzanineVoid =
        signedDistanceToStadium(x, z, BLOCK_B_DIMS.L, BLOCK_B_DIMS.FR).signedDist < -0.25;
      return {
        minY,
        maxY: inMezzanineVoid ? 9.45 : 4.82,
        ceilingId: inMezzanineVoid ? 'f6-high-roof' : 'f6-mezzanine-underside',
        floorId: 'f6-floor',
      };
    }
    // Floor 7 mezzanine
    return {
      minY: BLOCK_B_DIMS.MZ,
      maxY: 9.45,
      ceilingId: 'f7-roof-ceiling',
      floorId: 'f7-mezzanine-floor',
    };
  }

  // Block D — Floor 10 Rooftop
  const dxDeck = x - BLOCK_D_DIMS.SD.x;
  const dzDeck = z - BLOCK_D_DIMS.SD.z;
  const onEastDeck = Math.hypot(dxDeck, dzDeck) <= BLOCK_D_DIMS.SD.r;
  const underPergola =
    x >= BLOCK_D_DIMS.PG.x0 &&
    x <= BLOCK_D_DIMS.PG.x1 &&
    z >= BLOCK_D_DIMS.PG.z0 &&
    z <= BLOCK_D_DIMS.PG.z1;
  return {
    minY: onEastDeck ? BLOCK_D_DIMS.SD.y : 0.0,
    maxY: underPergola ? BLOCK_D_DIMS.PG.h - 0.18 : 11.5,
    ceilingId: underPergola ? 'f10-pergola-canopy' : 'f10-sky-limit',
    floorId: onEastDeck ? 'f10-east-deck' : 'f10-rooftop-slab',
  };
}

/**
 * Checks whether `(x, z)` is within the outer architectural boundary of `floor`
 * with a safety margin of `radius`.
 */
function checkOuterBoundaryAt(
  floor: LibraryFloor,
  x: number,
  z: number,
  radius: number,
): { inside: boolean; blockerId: string | null } {
  const block = getBlockForFloor(floor);

  if (block === 'B') {
    const sdf = signedDistanceToStadium(x, z, BLOCK_B_DIMS.L, BLOCK_B_DIMS.WR).signedDist;
    if (sdf > -radius) {
      return { inside: false, blockerId: `f${floor}-stadium-outer-wall` };
    }
    return { inside: true, blockerId: null };
  }

  if (block === 'D') {
    if (
      x < BLOCK_D_DIMS.X0 + radius ||
      x > BLOCK_D_DIMS.X1 - radius ||
      z < BLOCK_D_DIMS.Z0 + radius ||
      z > BLOCK_D_DIMS.Z1 - radius
    ) {
      return { inside: false, blockerId: 'f10-rooftop-parapet' };
    }
    return { inside: true, blockerId: null };
  }

  // Block A outer envelope (including North reading rooms & Floors 4–5 side rooms)
  if (x < -36.0 + radius || x > 36.0 - radius || z < -35.0 + radius || z > 27.0 - radius) {
    return { inside: false, blockerId: `f${floor}-outer-envelope` };
  }
  return { inside: true, blockerId: null };
}

/**
 * Builds doorway lintel AABBs for a Block A floor so high camera angles cannot
 * clip through the solid wall above an open doorway.
 */
function getDoorLintelBoxesForFloor(floor: LibraryFloor): Box3D[] {
  const doors = getDoorwaysForFloor(floor);
  if (doors.length === 0) return [];

  const baseY = getFloorBaseElevation(floor);
  const ceilingY = baseY + 4.5;
  const lintels: Box3D[] = [];

  for (const d of doors) {
    if (d.wallAxis === 'x') {
      lintels.push({
        id: `${d.id}-lintel`,
        kind: 'wall',
        minX: d.center - d.width * 0.5,
        maxX: d.center + d.width * 0.5,
        minY: baseY + d.height,
        maxY: ceilingY,
        minZ: d.wallCoord - 0.16,
        maxZ: d.wallCoord + 0.16,
      });
    } else {
      lintels.push({
        id: `${d.id}-lintel`,
        kind: 'wall',
        minX: d.wallCoord - 0.16,
        maxX: d.wallCoord + 0.16,
        minY: baseY + d.height,
        maxY: ceilingY,
        minZ: d.center - d.width * 0.5,
        maxZ: d.center + d.width * 0.5,
      });
    }
  }

  return lintels;
}

const FLOOR_CAMERA_BOX_CACHE = new Map<LibraryFloor, Box3D[]>();

function getCameraBlockerBoxesForFloor(floor: LibraryFloor): Box3D[] {
  const cached = FLOOR_CAMERA_BOX_CACHE.get(floor);
  if (cached) return cached;

  const boxes: Box3D[] = [];

  // 1. Add doorway lintel boxes
  boxes.push(...getDoorLintelBoxesForFloor(floor));

  // 2. Add walls, structural columns, shafts, and tall furniture (>= 1.35m)
  for (const col of getCollidersForFloor(floor)) {
    const b = col.bounds;
    const height = b.maxY - b.minY;

    if (col.kind === 'wall') {
      boxes.push({
        id: col.id,
        kind: 'wall',
        minX: b.minX,
        maxX: b.maxX,
        minY: b.minY,
        maxY: b.maxY,
        minZ: b.minZ,
        maxZ: b.maxZ,
      });
    } else if (col.kind === 'column' || col.kind === 'shaft') {
      boxes.push({
        id: col.id,
        kind: 'column',
        minX: b.minX,
        maxX: b.maxX,
        minY: b.minY,
        maxY: b.maxY,
        minZ: b.minZ,
        maxZ: b.maxZ,
      });
    } else if (
      col.kind === 'furniture' &&
      height >= TALL_FURNITURE_MIN_HEIGHT &&
      !col.id.startsWith('lobby-')
    ) {
      boxes.push({
        id: col.id,
        kind: 'furniture',
        minX: b.minX,
        maxX: b.maxX,
        minY: b.minY,
        maxY: b.maxY,
        minZ: b.minZ,
        maxZ: b.maxZ,
      });
    }
  }

  FLOOR_CAMERA_BOX_CACHE.set(floor, boxes);
  return boxes;
}

/**
 * Intersects 3D segment `P(t) = origin + t * delta` (`t in [0, 1]`) with a 3D AABB.
 * Returns the entry parameter `tEnter in [0, 1]` or `null` if no intersection.
 */
function intersectSegmentAABB(
  origin: LibraryCameraVec3,
  delta: LibraryCameraVec3,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): { tEnter: number; tExit: number } | null {
  let tMin = 0;
  let tMax = 1;

  const axes: Array<[number, number, number, number]> = [
    [origin.x, delta.x, minX, maxX],
    [origin.y, delta.y, minY, maxY],
    [origin.z, delta.z, minZ, maxZ],
  ];

  for (const [p, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-8) {
      if (p < lo || p > hi) return null;
    } else {
      const invD = 1 / d;
      let t1 = (lo - p) * invD;
      let t2 = (hi - p) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }

  return { tEnter: tMin, tExit: tMax };
}

/**
 * Casts a collision-aware camera ray from `target` toward `desiredPosition` on
 * `floor`, returning the unobstructed camera position and blocker metadata.
 */
export function resolveLibraryCameraOcclusion(
  input: LibraryCameraOcclusionInput,
): LibraryCameraOcclusionResult {
  const radius = input.cameraRadius ?? DEFAULT_CAMERA_RADIUS;
  const minDistance = input.minDistance ?? DEFAULT_MIN_DISTANCE;
  const { target, desiredPosition } = input;

  const dx = desiredPosition.x - target.x;
  const dy = desiredPosition.y - target.y;
  const dz = desiredPosition.z - target.z;
  const desiredDistance = Math.hypot(dx, dy, dz);

  if (!isValidLibraryFloor(input.floor) || desiredDistance <= 1e-5) {
    return {
      position: { ...desiredPosition },
      target: { ...target },
      desiredDistance,
      safeDistance: desiredDistance,
      hitFraction: 1,
      occluded: false,
      blockerId: null,
      blockerKind: null,
    };
  }

  const floor: LibraryFloor = input.floor;
  const delta: LibraryCameraVec3 = { x: dx, y: dy, z: dz };
  const boxes = getCameraBlockerBoxesForFloor(floor);

  let bestT = 1.0;
  let blockerId: string | null = null;
  let blockerKind: LibraryCameraBlockerKind = null;

  // 1. Test against all 3D blocker boxes (walls, lintels, columns, shafts, tall furniture)
  for (const box of boxes) {
    const padXZ = box.kind === 'furniture' ? radius * 0.75 : radius;
    const padY = radius * 0.65;

    const expandedHit = intersectSegmentAABB(
      target,
      delta,
      box.minX - padXZ,
      box.maxX + padXZ,
      box.minY - padY,
      box.maxY + padY,
      box.minZ - padXZ,
      box.maxZ + padXZ,
    );
    if (!expandedHit) continue;

    let candidateT = expandedHit.tEnter;

    // If `target` starts inside the expanded padding margin (e.g., player standing
    // next to a wall or bookcase while looking away from it), only count the box
    // if the camera ray actually enters the raw (unpadded) box or moves closer to it.
    if (candidateT <= 1e-4) {
      const rawHit = intersectSegmentAABB(
        target,
        delta,
        box.minX - 0.04,
        box.maxX + 0.04,
        box.minY - 0.04,
        box.maxY + 0.04,
        box.minZ - 0.04,
        box.maxZ + 0.04,
      );
      if (!rawHit) {
        continue;
      }
      candidateT = Math.max(0, rawHit.tEnter - radius / Math.max(desiredDistance, 0.5));
    }

    if (candidateT < bestT) {
      bestT = candidateT;
      blockerId = box.id;
      blockerKind = box.kind;
    }
  }

  // 2. Sample along the ray for curved outer boundaries (Floors 6, 7, 10) and
  // ceiling/floor slab changes (atrium rim, mezzanine underside, room ceilings).
  const effectiveEnvelopeFloor = (sampleY: number): LibraryFloor => {
    if (floor === 1 && target.y > 3.8 && sampleY >= 4.4) return 2;
    if (floor === 2 && target.y < 4.5 && sampleY < 4.1) return 1;
    return floor;
  };
  const sampleSteps = 20;
  for (let i = 1; i <= sampleSteps; i++) {
    const t = (i / sampleSteps) * bestT;
    const sx = target.x + dx * t;
    const sy = target.y + dy * t;
    const sz = target.z + dz * t;

    const boundary = checkOuterBoundaryAt(floor, sx, sz, radius);
    if (!boundary.inside) {
      const prevT = ((i - 1) / sampleSteps) * bestT;
      bestT = prevT;
      blockerId = boundary.blockerId;
      blockerKind = 'boundary';
      break;
    }

    const vBounds = getCameraVerticalBoundsAt(effectiveEnvelopeFloor(sy), sx, sz);
    const maxAllowedY = vBounds.maxY - radius * 0.85;
    const minAllowedY = vBounds.minY + radius * 0.85;

    if (sy > maxAllowedY && dy > 1e-4) {
      const tCeil = clamp((maxAllowedY - target.y) / dy, 0, bestT);
      if (tCeil < bestT) {
        bestT = tCeil;
        blockerId = vBounds.ceilingId;
        blockerKind = 'ceiling';
      }
      break;
    }

    if (sy < minAllowedY && dy < -1e-4) {
      const tFloor = clamp((minAllowedY - target.y) / dy, 0, bestT);
      if (tFloor < bestT) {
        bestT = tFloor;
        blockerId = vBounds.floorId;
        blockerKind = 'floor';
      }
      break;
    }
  }

  const minFraction = Math.min(1, minDistance / desiredDistance);
  const clampedFraction = clamp(bestT, minFraction, 1);

  let finalX = target.x + dx * clampedFraction;
  let finalY = target.y + dy * clampedFraction;
  let finalZ = target.z + dz * clampedFraction;

  // Final vertical safety clamp at the resolved XZ point so even at minDistance
  // the camera stays strictly between floor slab + margin and ceiling - margin.
  const endVBounds = getCameraVerticalBoundsAt(effectiveEnvelopeFloor(finalY), finalX, finalZ);
  const loY = endVBounds.minY + radius * 0.85;
  const hiY = endVBounds.maxY - radius * 0.85;
  if (finalY > hiY) {
    finalY = hiY;
    if (!blockerKind) {
      blockerId = endVBounds.ceilingId;
      blockerKind = 'ceiling';
    }
  } else if (finalY < loY) {
    finalY = loY;
    if (!blockerKind) {
      blockerId = endVBounds.floorId;
      blockerKind = 'floor';
    }
  }

  const occluded = clampedFraction < 0.999 || blockerKind !== null;

  return {
    position: { x: finalX, y: finalY, z: finalZ },
    target: { ...target },
    desiredDistance,
    safeDistance: Math.hypot(finalX - target.x, finalY - target.y, finalZ - target.z),
    hitFraction: clampedFraction,
    occluded,
    blockerId,
    blockerKind,
  };
}

/**
 * Smoothly steps the active camera distance without wall penetration or jitter:
 * - When obstructed (`safeDistance < currentDistance`), pulls in immediately to
 *   `safeDistance` so the camera never clips through walls or ceilings.
 * - When unobstructed (`safeDistance > currentDistance`), eases smoothly back
 *   toward `desiredDistance` (capped by `safeDistance`).
 */
export function stepLibraryCameraDistance(
  currentDistance: number,
  desiredDistance: number,
  safeDistance: number,
  dt: number,
): number {
  const targetDist = Math.min(desiredDistance, safeDistance);
  if (!Number.isFinite(currentDistance) || currentDistance <= 0) {
    return targetDist;
  }
  if (targetDist <= currentDistance) {
    // Immediate pull-in on obstruction to prevent single-frame wall clipping
    return targetDist;
  }
  // Smooth exponential recovery when obstruction clears
  const safeDt = clamp(dt, 0, 0.1);
  const alpha = 1 - Math.exp(-safeDt * 9.0);
  const next = currentDistance + (targetDist - currentDistance) * alpha;
  return Math.min(targetDist, next);
}
