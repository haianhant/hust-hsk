// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/elevation.ts — Canonical Ground
// Support, Surface Containment, Stair Progress & Elevation Engine (PR10A).
// Zero React or Three.js dependencies.
// ---------------------------------------------------------------------------

import {
  BLOCK_A_FLOOR_HEIGHT,
  getBlockForFloor,
  getFloorBaseElevation,
  sanitizeLibraryFloor,
} from './floors';
import {
  BLOCK_A_DIMS,
  BLOCK_B_DIMS,
  BLOCK_D_DIMS,
  CURVED_STAIRS,
  signedDistanceToStadium,
  WALKABLE_SURFACES_BY_FLOOR,
} from './geometry';
import type {
  CurvedStairFlight,
  FloorSupportResult,
  LibraryFloor,
  LibraryLocation,
  SurfaceVoidHole,
  WalkableSurface,
} from './types';

export interface StairHitResult {
  stair: CurvedStairFlight;
  progress: number;
  elevation: number;
  radialDistance: number;
}

/**
 * Evaluates whether `(x, z)` lies on either of the Floor 1 ↔ Floor 2 twin
 * curved staircases, and returns normalized progress `t ∈ [0, 1]` and `elevation ∈ [0, 4.5]`.
 */
export function evaluateCurvedStairAt(
  x: number,
  z: number,
  radialMargin = 0.22,
): StairHitResult | null {
  for (const stair of CURVED_STAIRS) {
    const dx = x - stair.centerX;
    const dz = z - stair.centerZ;
    const r = Math.hypot(dx, dz);
    if (r < stair.innerRadius - radialMargin || r > stair.outerRadius + radialMargin) {
      continue;
    }

    let a = Math.atan2(dz, dx);
    if (stair.side < 0 && a < 0) a += Math.PI * 2;
    const lo = Math.min(stair.startAngle, stair.endAngle) - 0.06;
    const hi = Math.max(stair.startAngle, stair.endAngle) + 0.06;
    if (a >= lo && a <= hi) {
      const t = (a - stair.startAngle) / (stair.endAngle - stair.startAngle);
      const progress = Math.max(0, Math.min(1, t));
      const elevation = stair.bottomY + progress * (stair.topY - stair.bottomY);
      return {
        stair,
        progress,
        elevation,
        radialDistance: r,
      };
    }
  }
  return null;
}

function isPointInsideVoidHole(x: number, z: number, hole: SurfaceVoidHole): boolean {
  const { halfStraight, radius } = hole.shape;
  const sd = signedDistanceToStadium(x, z, halfStraight, radius);
  if (sd.signedDist >= 0) {
    return false;
  }

  // Check if the point is within a stair landing opening near the stadium rim
  if (hole.openings && hole.openings.length > 0 && sd.distFromAxis >= radius - 1.85) {
    for (const op of hole.openings) {
      if (op.side === 1 && x >= halfStraight) {
        const a = Math.atan2(z, x - halfStraight);
        if (Math.abs(a) <= op.halfAngle) {
          return false;
        }
      } else if (op.side === -1 && x <= -halfStraight) {
        const a = Math.atan2(z, x + halfStraight);
        const diff = Math.abs(Math.abs(a) - Math.PI);
        if (diff <= op.halfAngle) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Checks whether `(x, z)` lies on a given `WalkableSurface` (with optional margin).
 * A positive `inwardMargin` shrinks the outer boundary and expands inner void holes.
 */
export function isPointOnWalkableSurface(
  x: number,
  z: number,
  surface: WalkableSurface,
  inwardMargin = 0,
): boolean {
  const { shape, holes } = surface;
  let insideOuter = false;

  if (shape.kind === 'rect') {
    insideOuter =
      x >= shape.minX + inwardMargin &&
      x <= shape.maxX - inwardMargin &&
      z >= shape.minZ + inwardMargin &&
      z <= shape.maxZ - inwardMargin;
  } else if (shape.kind === 'stadium') {
    const sd = signedDistanceToStadium(x, z, shape.halfStraight, shape.radius);
    insideOuter = sd.signedDist <= -inwardMargin;
  } else if (shape.kind === 'circle') {
    insideOuter = Math.hypot(x - shape.x, z - shape.z) <= shape.radius - inwardMargin;
  }

  if (!insideOuter) return false;

  if (holes) {
    for (const hole of holes) {
      const expandedHole: SurfaceVoidHole =
        inwardMargin !== 0
          ? {
              ...hole,
              shape: {
                ...hole.shape,
                radius: hole.shape.radius + inwardMargin,
              },
            }
          : hole;
      if (isPointInsideVoidHole(x, z, expandedHole)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Authoritative floor support & ground elevation query for any `LibraryLocation`.
 * Never infers floor identity solely from `y`, and strictly isolates Block A, B, and D
 * coordinate spaces.
 */
export function queryLibraryGround(location: LibraryLocation): FloorSupportResult {
  const floor = sanitizeLibraryFloor(location.floor, 1);
  const block = getBlockForFloor(floor);
  const { x, y, z } = location;

  // 1. Block A (Floors 1–5): Check Floor 1 ↔ Floor 2 twin curved stairs first
  if (floor === 1 || floor === 2) {
    const stairHit = evaluateCurvedStairAt(x, z);
    if (stairHit) {
      const verticalDelta = Math.abs(y - stairHit.elevation);
      const nearBottomOnF1 = floor === 1 && stairHit.progress <= 0.14;
      const nearTopOnF2 = floor === 2 && stairHit.progress >= 0.86;
      if (verticalDelta <= 0.65 || nearBottomOnF1 || nearTopOnF2) {
        // Hysteresis prevents floor-flipping oscillation at the stair midpoint
        let recommendedFloor: LibraryFloor = floor;
        if (floor === 1 && stairHit.elevation >= BLOCK_A_FLOOR_HEIGHT - 0.35) {
          recommendedFloor = 2;
        } else if (floor === 2 && stairHit.elevation <= 0.35) {
          recommendedFloor = 1;
        }
        return {
          supported: true,
          elevation: stairHit.elevation,
          surfaceId: stairHit.stair.id,
          floor,
          block,
          onStair: true,
          stairId: stairHit.stair.id,
          recommendedFloor,
        };
      }
    }
  }

  // 2. Block B Floor 6 special smooth step transition onto the 0.6m raised stadium platform
  if (floor === 6) {
    const outerSd = signedDistanceToStadium(x, z, BLOCK_B_DIMS.L, BLOCK_B_DIMS.WR);
    if (outerSd.signedDist > 0) {
      return {
        supported: false,
        elevation: null,
        surfaceId: null,
        floor,
        block,
        onStair: false,
        stairId: null,
        recommendedFloor: floor,
      };
    }

    const platSd = signedDistanceToStadium(x, z, BLOCK_B_DIMS.L, BLOCK_B_DIMS.PR);
    if (platSd.signedDist <= 0) {
      return {
        supported: true,
        elevation: BLOCK_B_DIMS.PY,
        surfaceId: 'f6-central-platform',
        floor,
        block,
        onStair: false,
        stairId: null,
        recommendedFloor: floor,
      };
    }
    if (platSd.signedDist <= 0.45) {
      const rampT = 1 - platSd.signedDist / 0.45;
      return {
        supported: true,
        elevation: Number((BLOCK_B_DIMS.PY * rampT).toFixed(4)),
        surfaceId: 'f6-central-platform',
        floor,
        block,
        onStair: false,
        stairId: null,
        recommendedFloor: floor,
      };
    }

    return {
      supported: true,
      elevation: 0.0,
      surfaceId: 'f6-main-hall',
      floor,
      block,
      onStair: false,
      stairId: null,
      recommendedFloor: floor,
    };
  }

  // 3. Standard Walkable Surface lookup for active floor
  const surfaces = WALKABLE_SURFACES_BY_FLOOR[floor];
  for (const surface of surfaces) {
    if (isPointOnWalkableSurface(x, z, surface, 0)) {
      return {
        supported: true,
        elevation: surface.baseY,
        surfaceId: surface.id,
        floor,
        block,
        onStair: false,
        stairId: null,
        recommendedFloor: floor,
      };
    }
  }

  return {
    supported: false,
    elevation: null,
    surfaceId: null,
    floor,
    block,
    onStair: false,
    stairId: null,
    recommendedFloor: floor,
  };
}

/**
 * Backward-compatible elevation helper used by `lib/playerState.ts` and `Player.tsx`.
 * Consumes `queryLibraryGround` so there is only one canonical elevation calculation.
 */
export function computeCanonicalLibraryElevation(
  x: number,
  z: number,
  currentFloor: LibraryFloor,
  currentY: number,
): { y: number; floor: LibraryFloor } {
  const floor = sanitizeLibraryFloor(currentFloor, 1);
  const block = getBlockForFloor(floor);
  const support = queryLibraryGround({ block, floor, x, y: currentY, z });

  if (support.supported && support.elevation !== null) {
    return {
      y: support.elevation,
      floor: support.recommendedFloor,
    };
  }

  // Fallback to canonical floor base elevation if temporarily queried at boundary edge
  if (floor === 6) {
    const platSd = signedDistanceToStadium(x, z, BLOCK_B_DIMS.L, BLOCK_B_DIMS.PR);
    return { y: platSd.signedDist <= 0 ? BLOCK_B_DIMS.PY : 0.0, floor: 6 };
  }
  if (floor === 10) {
    const inSd = Math.hypot(x - BLOCK_D_DIMS.SD.x, z - BLOCK_D_DIMS.SD.z) <= BLOCK_D_DIMS.SD.r;
    return { y: inSd ? BLOCK_D_DIMS.SD.y : 0.0, floor: 10 };
  }
  return {
    y: getFloorBaseElevation(floor),
    floor,
  };
}

/**
 * Compatibility helper matching `buildFloors1To5.ts` `surface(x, z, yHint)`:
 * returns ground elevation inside Block A (`Floors 1–5`) or `-999` if unsupported.
 */
export function queryBlockASurfaceY(x: number, z: number, yHint: number): number {
  const fIdx = Math.max(0, Math.min(BLOCK_A_DIMS.NF - 1, Math.round(yHint / BLOCK_A_DIMS.FH)));
  const floor = (fIdx + 1) as LibraryFloor;
  const res = queryLibraryGround({
    block: 'A',
    floor,
    x,
    y: yHint,
    z,
  });
  return res.supported && res.elevation !== null ? res.elevation : -999;
}
