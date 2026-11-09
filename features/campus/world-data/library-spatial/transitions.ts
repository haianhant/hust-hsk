// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/transitions.ts — Safe Floor
// Transition & Spawn Resolution for Tạ Quang Bửu Library (PR10A).
// Zero React or Three.js dependencies.
// ---------------------------------------------------------------------------

import { AVATAR } from '../bounds';
import { resolveLibraryMovement } from './collision';
import { queryLibraryGround } from './elevation';
import {
  createLibraryLocation,
  getFloorBaseElevation,
  getLibraryFloorSpawn,
  isValidLibraryFloor,
} from './floors';
import type { LibraryLocation } from './types';

export type FloorTransitionStatus = 'success' | 'corrected' | 'failed';

export type FloorTransitionFailureReason =
  | 'invalid-floor'
  | 'unsafe-destination';

export interface FloorTransitionResolution {
  ok: boolean;
  status: FloorTransitionStatus;
  reason?: FloorTransitionFailureReason;
  location: LibraryLocation;
  yaw: number;
  pitch: number;
  spawnId: string;
  clampedToSpawn: boolean;
  usedFallbackSpawn: boolean;
  grounded: boolean;
  surfaceId: string | null;
  collisionIds: string[];
}

function isSafeAndGroundedAt(
  loc: LibraryLocation,
  avatarRadius: number,
  avatarHeight: number,
): {
  safe: boolean;
  resolved: LibraryLocation;
  adjusted: boolean;
  grounded: boolean;
  surfaceId: string | null;
  collisionIds: string[];
} {
  const moved = resolveLibraryMovement(loc, loc, avatarRadius, avatarHeight);
  const support = queryLibraryGround(moved.position);
  const grounded = Boolean(
    support.supported &&
      support.elevation !== null &&
      Number.isFinite(support.elevation) &&
      support.surfaceId !== null,
  );
  if (!grounded) {
    return {
      safe: false,
      resolved: moved.position,
      adjusted: true,
      grounded: false,
      surfaceId: null,
      collisionIds: moved.collisionIds,
    };
  }

  const finalLoc: LibraryLocation = {
    ...moved.position,
    y: support.elevation!,
  };

  // Verify the settled position itself has zero remaining collision overlap
  const verify = resolveLibraryMovement(finalLoc, finalLoc, avatarRadius, avatarHeight);
  const verifyDrift = Math.hypot(verify.position.x - finalLoc.x, verify.position.z - finalLoc.z);
  const verifySupport = queryLibraryGround(verify.position);
  const isSettledSafe =
    !verify.blocked &&
    verifyDrift <= 1e-3 &&
    verifySupport.supported &&
    verifySupport.elevation !== null &&
    verifySupport.surfaceId !== null;

  const initialDrift = Math.hypot(finalLoc.x - loc.x, finalLoc.z - loc.z);
  const adjusted = moved.blocked || initialDrift > 1e-3;

  return {
    safe: isSettledSafe && !adjusted,
    resolved: finalLoc,
    adjusted,
    grounded: verifySupport.supported,
    surfaceId: verifySupport.surfaceId,
    collisionIds: moved.collisionIds,
  };
}

/**
 * Safely resolves a floor transition (via elevator HUD, preset button, or
 * programmatic `setLibraryFloor`):
 * - Rejects invalid floor numbers (`status: 'failed'`, `reason: 'invalid-floor'`)
 *   instead of silently teleporting the player to Floor 1.
 * - Distinguishes `'success'` (exact target is grounded & collision-free),
 *   `'corrected'` (pushed out of obstacle or fell back to verified floor spawn),
 *   and `'failed'` (neither target nor fallback is safe).
 * - Never leaks Block A's `(floor - 1) * 4.5` elevation into Block B or D.
 */
export function resolveLibraryFloorTransition(
  targetFloorInput: unknown,
  customX?: number,
  customZ?: number,
  customYaw?: number,
  customPitch?: number,
  avatarRadius: number = AVATAR.radius,
  avatarHeight: number = AVATAR.height,
  previousLocation?: LibraryLocation,
): FloorTransitionResolution {
  if (!isValidLibraryFloor(targetFloorInput)) {
    const dummySpawn = getLibraryFloorSpawn(1);
    return {
      ok: false,
      status: 'failed',
      reason: 'invalid-floor',
      location: previousLocation ?? createLibraryLocation(1, dummySpawn.x, dummySpawn.z, dummySpawn.y),
      yaw: dummySpawn.yaw,
      pitch: dummySpawn.pitch,
      spawnId: dummySpawn.id,
      clampedToSpawn: false,
      usedFallbackSpawn: false,
      grounded: false,
      surfaceId: null,
      collisionIds: [],
    };
  }

  const floor = targetFloorInput;
  const spawn = getLibraryFloorSpawn(floor);
  const baseElevation = getFloorBaseElevation(floor);

  const hasCustomCoords =
    typeof customX === 'number' &&
    Number.isFinite(customX) &&
    typeof customZ === 'number' &&
    Number.isFinite(customZ);

  const desiredX = hasCustomCoords ? customX! : spawn.x;
  const desiredZ = hasCustomCoords ? customZ! : spawn.z;
  const desiredYaw =
    typeof customYaw === 'number' && Number.isFinite(customYaw) ? customYaw : spawn.yaw;
  const desiredPitch =
    typeof customPitch === 'number' && Number.isFinite(customPitch) ? customPitch : spawn.pitch;

  const initialLoc = createLibraryLocation(floor, desiredX, desiredZ, baseElevation);
  const primary = isSafeAndGroundedAt(initialLoc, avatarRadius, avatarHeight);

  if (primary.safe) {
    return {
      ok: true,
      status: primary.adjusted ? 'corrected' : 'success',
      location: primary.resolved,
      yaw: desiredYaw,
      pitch: desiredPitch,
      spawnId: spawn.id,
      clampedToSpawn: false,
      usedFallbackSpawn: false,
      grounded: true,
      surfaceId: primary.surfaceId,
      collisionIds: primary.collisionIds,
    };
  }

  // Fallback to canonical floor spawn and verify it is grounded & collision-free
  const spawnLoc = createLibraryLocation(floor, spawn.x, spawn.z, spawn.y);
  const fallback = isSafeAndGroundedAt(spawnLoc, avatarRadius, avatarHeight);

  if (fallback.safe) {
    return {
      ok: true,
      status: 'corrected',
      location: fallback.resolved,
      yaw: spawn.yaw,
      pitch: spawn.pitch,
      spawnId: spawn.id,
      clampedToSpawn: true,
      usedFallbackSpawn: true,
      grounded: true,
      surfaceId: fallback.surfaceId,
      collisionIds: fallback.collisionIds,
    };
  }

  return {
    ok: false,
    status: 'failed',
    reason: 'unsafe-destination',
    location: previousLocation ?? fallback.resolved,
    yaw: spawn.yaw,
    pitch: spawn.pitch,
    spawnId: spawn.id,
    clampedToSpawn: true,
    usedFallbackSpawn: true,
    grounded: false,
    surfaceId: null,
    collisionIds: fallback.collisionIds,
  };
}
