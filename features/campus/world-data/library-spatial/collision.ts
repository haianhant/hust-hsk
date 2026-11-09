// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/collision.ts — Authoritative
// Multi-Floor Library Collision & Movement Resolver (PR10A).
// Supports swept substepping, wall sliding, stadium atrium voids, curved stair
// channels, doorway openings, and full room/furniture colliders.
// Zero React or Three.js dependencies.
// ---------------------------------------------------------------------------

import { AVATAR, type Vec2 } from '../bounds';
import {
  evaluateCurvedStairAt,
  queryLibraryGround,
} from './elevation';
import {
  createLibraryLocation,
  getBlockForFloor,
  getFloorBaseElevation,
  sanitizeLibraryFloor,
} from './floors';
import {
  BLOCK_A_DIMS,
  BLOCK_B_DIMS,
  BLOCK_D_DIMS,
  getCollidersForFloor,
  getDoorwaysForFloor,
  signedDistanceToStadium,
} from './geometry';
import type {
  LibraryCollisionResult,
  LibraryFloor,
  LibraryLocation,
  SpatialCollider,
} from './types';

/**
 * Resolves circle-vs-AABB and circle-vs-cylinder penetration in 2D (`x, z`),
 * gated by 3D vertical overlap (`[y, y + avatarHeight]`).
 */
function resolveSingleCollider(
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  col: SpatialCollider,
): { x: number; z: number; collided: boolean } {
  const { bounds, cylinder } = col;
  if (y + height <= bounds.minY + 0.02 || y >= bounds.maxY - 0.02) {
    return { x, z, collided: false };
  }

  if (cylinder) {
    const dx = x - cylinder.x;
    const dz = z - cylinder.z;
    const minDist = cylinder.radius + radius;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist) {
      return { x, z, collided: false };
    }
    const dist = Math.sqrt(distSq);
    if (dist < 1e-6) {
      return { x: cylinder.x + minDist, z: cylinder.z, collided: true };
    }
    const scale = minDist / dist;
    return {
      x: cylinder.x + dx * scale,
      z: cylinder.z + dz * scale,
      collided: true,
    };
  }

  // Circle vs AABB (closest point on box to circle center)
  const closestX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
  const closestZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, z));
  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius - 1e-9) {
    return { x, z, collided: false };
  }

  // Center is strictly outside the box: push radially away from closest point
  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    return {
      x: x + (dx / dist) * push,
      z: z + (dz / dist) * push,
      collided: true,
    };
  }

  // Circle center is inside the AABB: push out along the minimum penetration axis
  const penLeft = x - (bounds.minX - radius);
  const penRight = bounds.maxX + radius - x;
  const penBack = z - (bounds.minZ - radius);
  const penFront = bounds.maxZ + radius - z;
  const minPen = Math.min(penLeft, penRight, penBack, penFront);

  if (minPen === penLeft) return { x: bounds.minX - radius, z, collided: true };
  if (minPen === penRight) return { x: bounds.maxX + radius, z, collided: true };
  if (minPen === penBack) return { x, z: bounds.minZ - radius, collided: true };
  return { x, z: bounds.maxZ + radius, collided: true };
}

/**
 * Resolves stadium atrium void and outer stadium wall constraints for a floor.
 */
function resolveStadiumConstraints(
  x: number,
  y: number,
  z: number,
  radius: number,
  floor: LibraryFloor,
): { x: number; z: number; collisionId: string | null } {
  // 1. Floors 1 & 2: Curved staircase side-rail channel protection when mid-stair
  if (floor === 1 || floor === 2) {
    const stairHit = evaluateCurvedStairAt(x, z, 0.25);
    if (stairHit && stairHit.progress > 0.08 && stairHit.progress < 0.92) {
      const verticalDelta = Math.abs(y - stairHit.elevation);
      if (verticalDelta <= 1.85) {
        const minR = stairHit.stair.innerRadius + radius * 0.45;
        const maxR = stairHit.stair.outerRadius - radius * 0.25;
        const dx = x - stairHit.stair.centerX;
        const dz = z - stairHit.stair.centerZ;
        const r = Math.hypot(dx, dz) || 1e-5;
        if (r < minR) {
          return {
            x: stairHit.stair.centerX + (dx / r) * minR,
            z: stairHit.stair.centerZ + (dz / r) * minR,
            collisionId: `${stairHit.stair.id}-inner-rail`,
          };
        }
        if (r > maxR) {
          return {
            x: stairHit.stair.centerX + (dx / r) * maxR,
            z: stairHit.stair.centerZ + (dz / r) * maxR,
            collisionId: `${stairHit.stair.id}-outer-rail`,
          };
        }
        return { x, z, collisionId: null };
      }
    }
  }

  // 2. Floors 2–5: Central Stadium Atrium Void (L = 6.5, FR = 7.5)
  if (floor >= 2 && floor <= 5) {
    // On Floor 2, allow entering/exiting the twin curved stairs at the East/West landings
    if (floor === 2) {
      const stairHit = evaluateCurvedStairAt(x, z, 0.12);
      if (stairHit && (stairHit.progress >= 0.55 || Math.abs(y - stairHit.elevation) <= 1.85)) {
        return { x, z, collisionId: null };
      }
    }

    const voidRadius = BLOCK_A_DIMS.FR + radius * 0.85;
    const sd = signedDistanceToStadium(x, z, BLOCK_A_DIMS.L, voidRadius);
    if (sd.signedDist < 0) {
      const dist = sd.distFromAxis || 1e-5;
      const nx = sd.dx / dist;
      const nz = sd.distFromAxis < 1e-5 ? (z >= 0 ? 1 : -1) : sd.dz / dist;
      return {
        x: sd.clampedX + nx * voidRadius,
        z: nz * voidRadius,
        collisionId: `f${floor}-atrium-void`,
      };
    }
  }

  // 3. Floors 6 & 7 (Block B): Outer Stadium Wall (L = 7.5, WR = 16.5) + Floor 7 Inner Void (FR = 11.0)
  if (floor === 6 || floor === 7) {
    let curX = x;
    let curZ = z;
    let hitId: string | null = null;

    const maxOuterR = BLOCK_B_DIMS.WR - radius;
    const outerSd = signedDistanceToStadium(curX, curZ, BLOCK_B_DIMS.L, maxOuterR);
    if (outerSd.signedDist > 0) {
      const dist = outerSd.distFromAxis || 1e-5;
      curX = outerSd.clampedX + (outerSd.dx / dist) * maxOuterR;
      curZ = (outerSd.dz / dist) * maxOuterR;
      hitId = `f${floor}-outer-stadium-wall`;
    }

    if (floor === 7) {
      const minInnerR = BLOCK_B_DIMS.FR + radius * 0.85;
      const innerSd = signedDistanceToStadium(curX, curZ, BLOCK_B_DIMS.L, minInnerR);
      if (innerSd.signedDist < 0) {
        const dist = innerSd.distFromAxis || 1e-5;
        const nx = innerSd.dx / dist;
        const nz = innerSd.distFromAxis < 1e-5 ? (curZ >= 0 ? 1 : -1) : innerSd.dz / dist;
        curX = innerSd.clampedX + nx * minInnerR;
        curZ = nz * minInnerR;
        hitId = 'f7-atrium-void';
      }
    }

    return { x: curX, z: curZ, collisionId: hitId };
  }

  return { x, z, collisionId: null };
}

/**
 * Resolves a single substep `(x, y, z)` against all colliders and stadium/surface
 * boundaries of `floor`.
 */
function resolveSingleStepOnFloor(
  prevX: number,
  prevZ: number,
  targetX: number,
  targetZ: number,
  y: number,
  floor: LibraryFloor,
  avatarRadius: number,
  avatarHeight: number,
  collisionSet: Set<string>,
): { x: number; z: number } {
  let x = targetX;
  let z = targetZ;

  const colliders = getCollidersForFloor(floor);

  // Two relaxation passes ensure clean corner resolution without jitter
  for (let pass = 0; pass < 2; pass++) {
    const stad = resolveStadiumConstraints(x, y, z, avatarRadius, floor);
    if (stad.collisionId) {
      x = stad.x;
      z = stad.z;
      collisionSet.add(stad.collisionId);
    }

    for (const col of colliders) {
      const res = resolveSingleCollider(x, y, z, avatarRadius, avatarHeight, col);
      if (res.collided) {
        x = res.x;
        z = res.z;
        collisionSet.add(col.id);
      }
    }
  }

  // Final safety check: ensure the resolved position is still supported on a walkable surface
  const block = getBlockForFloor(floor);
  const support = queryLibraryGround({ block, floor, x, y, z });
  if (!support.supported) {
    // Try sliding along X only or Z only before falling back to prev position
    const slideXSupport = queryLibraryGround({ block, floor, x, y, z: prevZ });
    if (slideXSupport.supported) {
      z = prevZ;
      collisionSet.add(`f${floor}-boundary-clamp`);
    } else {
      const slideZSupport = queryLibraryGround({ block, floor, x: prevX, y, z });
      if (slideZSupport.supported) {
        x = prevX;
        collisionSet.add(`f${floor}-boundary-clamp`);
      } else {
        const prevSupport = queryLibraryGround({ block, floor, x: prevX, y, z: prevZ });
        if (prevSupport.supported) {
          x = prevX;
          z = prevZ;
          collisionSet.add(`f${floor}-boundary-clamp`);
        } else if (floor === 10) {
          x = Math.max(BLOCK_D_DIMS.X0 + avatarRadius, Math.min(BLOCK_D_DIMS.X1 - avatarRadius, x));
          z = Math.max(BLOCK_D_DIMS.Z0 + avatarRadius, Math.min(BLOCK_D_DIMS.Z1 - avatarRadius, z));
          collisionSet.add('f10-boundary-clamp');
        } else if (block === 'A') {
          x = Math.max(-BLOCK_A_DIMS.XW + avatarRadius, Math.min(BLOCK_A_DIMS.XW - avatarRadius, x));
          z = Math.max(BLOCK_A_DIMS.ZB + avatarRadius, Math.min(BLOCK_A_DIMS.ZF - avatarRadius, z));
          collisionSet.add(`f${floor}-boundary-clamp`);
        }
      }
    }
  }

  return { x, z };
}

/**
 * Authoritative Library Movement & Collision Resolver (PR10A).
 *
 * - Resolves movement using the active floor and block.
 * - Supports avatar radius and height.
 * - Preserves wall sliding and prevents high-speed tunneling via swept substeps.
 * - Prevents falling into atrium voids or leaving walkable surfaces.
 * - Never pushes the avatar onto a different floor implicitly.
 */
export function resolveLibraryMovement(
  current: LibraryLocation,
  desired: LibraryLocation,
  avatarRadius: number = AVATAR.radius,
  avatarHeight: number = AVATAR.height,
): LibraryCollisionResult {
  const floor = sanitizeLibraryFloor(desired.floor ?? current.floor, 1);
  const block = getBlockForFloor(floor);
  const baseElevation = getFloorBaseElevation(floor);
  const startY = Number.isFinite(current.y) ? current.y : baseElevation;

  const collisionSet = new Set<string>();
  const dxTotal = desired.x - current.x;
  const dzTotal = desired.z - current.z;
  const totalDist = Math.hypot(dxTotal, dzTotal);

  // Swept substepping prevents tunneling through thin walls when running or lagging
  const maxStepDist = Math.max(0.12, avatarRadius * 0.45);
  const steps = Math.max(1, Math.min(32, Math.ceil(totalDist / maxStepDist)));

  let curX = current.x;
  let curZ = current.z;
  let curY = startY;
  const stepDx = dxTotal / steps;
  const stepDz = dzTotal / steps;

  for (let i = 1; i <= steps; i++) {
    const stepTargetX = curX + stepDx;
    const stepTargetZ = curZ + stepDz;

    const stepRes = resolveSingleStepOnFloor(
      curX,
      curZ,
      stepTargetX,
      stepTargetZ,
      curY,
      floor,
      avatarRadius,
      avatarHeight,
      collisionSet,
    );
    curX = stepRes.x;
    curZ = stepRes.z;

    const stepGround = queryLibraryGround({
      block,
      floor,
      x: curX,
      y: curY,
      z: curZ,
    });
    if (stepGround.supported && stepGround.elevation !== null) {
      curY = stepGround.elevation;
    }
  }

  const finalSupport = queryLibraryGround({
    block,
    floor,
    x: curX,
    y: curY,
    z: curZ,
  });
  const finalY =
    finalSupport.supported && finalSupport.elevation !== null
      ? finalSupport.elevation
      : curY;

  const collisionIds = Array.from(collisionSet);
  let hitLabel: string | null = null;
  if (collisionIds.length > 0) {
    const firstId = collisionIds[0];
    const col = getCollidersForFloor(floor).find((c) => c.id === firstId);
    if (col) {
      hitLabel = col.name;
    } else if (firstId.includes('atrium-void')) {
      hitLabel = 'Giếng trời thông tầng';
    } else if (firstId.includes('stair')) {
      hitLabel = 'Lan can cầu thang xoắn';
    } else if (firstId.includes('outer-stadium')) {
      hitLabel = 'Tường kính cong Không gian Sáng tạo';
    } else {
      hitLabel = 'Tường sảnh Thư viện';
    }
  }
  return {
    position: {
      block,
      floor,
      x: curX,
      y: finalY,
      z: curZ,
    },
    blocked: collisionIds.length > 0,
    collisionIds,
    hit: hitLabel,
    grounded: finalSupport.supported,
    surfaceId: finalSupport.surfaceId,
    recommendedFloor: finalSupport.recommendedFloor,
  };
}

/**
 * Finds the nearest doorway opening on the given floor within `maxDistance` (m).
 */
export function findNearestLibraryDoorway(
  floor: LibraryFloor,
  x: number,
  z: number,
  maxDistance = 3.5,
): { id: string; name: string; distance: number } | null {
  const doors = getDoorwaysForFloor(floor);
  let best: { id: string; name: string; distance: number } | null = null;
  for (const d of doors) {
    const doorX = d.wallAxis === 'x' ? d.center : d.wallCoord;
    const doorZ = d.wallAxis === 'z' ? d.center : d.wallCoord;
    const dist = Math.hypot(x - doorX, z - doorZ);
    if (dist <= maxDistance && (!best || dist < best.distance)) {
      best = { id: d.id, name: d.name, distance: Number(dist.toFixed(3)) };
    }
  }
  return best;
}

/**
 * Backward-compatible point collision resolver used by `spatial-utils.ts` and
 * existing unit tests (`resolveLibraryLobbyCollisions(p, radius, floor)`).
 */
export function resolveCanonicalLibraryPointCollision(
  p: Vec2,
  radius: number = AVATAR.radius,
  floorInput: number = 1,
): { pos: Vec2; hit: string | null } {
  const floor = sanitizeLibraryFloor(floorInput, 1);
  const loc = createLibraryLocation(floor, p.x, p.z);
  const res = resolveLibraryMovement(loc, loc, radius, AVATAR.height);
  return {
    pos: { x: res.position.x, z: res.position.z },
    hit: res.hit,
  };
}
