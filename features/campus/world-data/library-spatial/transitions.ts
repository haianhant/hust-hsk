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
  sanitizeLibraryFloor,
} from './floors';
import type { LibraryLocation } from './types';

export interface FloorTransitionResolution {
  location: LibraryLocation;
  yaw: number;
  pitch: number;
  spawnId: string;
  clampedToSpawn: boolean;
}

/**
 * Safely resolves a floor transition (via elevator HUD, preset button, or
 * programmatic `setLibraryFloor`), guaranteeing that the destination
 * `LibraryLocation` has valid floor support and zero collision overlap,
 * and never leaks Block A's `(floor - 1) * 4.5` elevation into Block B or D.
 */
export function resolveLibraryFloorTransition(
  targetFloorInput: number,
  customX?: number,
  customZ?: number,
  customYaw?: number,
  customPitch?: number,
  avatarRadius: number = AVATAR.radius,
  avatarHeight: number = AVATAR.height,
): FloorTransitionResolution {
  const floor = sanitizeLibraryFloor(targetFloorInput, 1);
  const spawn = getLibraryFloorSpawn(floor);
  const baseElevation = getFloorBaseElevation(floor);

  const desiredX = typeof customX === 'number' && Number.isFinite(customX) ? customX : spawn.x;
  const desiredZ = typeof customZ === 'number' && Number.isFinite(customZ) ? customZ : spawn.z;
  const desiredYaw = typeof customYaw === 'number' && Number.isFinite(customYaw) ? customYaw : spawn.yaw;
  const desiredPitch = typeof customPitch === 'number' && Number.isFinite(customPitch) ? customPitch : spawn.pitch;

  const initialLoc = createLibraryLocation(floor, desiredX, desiredZ, baseElevation);
  const moved = resolveLibraryMovement(initialLoc, initialLoc, avatarRadius, avatarHeight);
  const support = queryLibraryGround(moved.position);

  if (support.supported && support.elevation !== null) {
    return {
      location: {
        ...moved.position,
        y: support.elevation,
      },
      yaw: desiredYaw,
      pitch: desiredPitch,
      spawnId: spawn.id,
      clampedToSpawn: false,
    };
  }

  // Fallback to canonical floor spawn if custom coordinates were outside walkable bounds
  const fallbackLoc = createLibraryLocation(floor, spawn.x, spawn.z, spawn.y);
  const fallbackMoved = resolveLibraryMovement(fallbackLoc, fallbackLoc, avatarRadius, avatarHeight);
  return {
    location: fallbackMoved.position,
    yaw: spawn.yaw,
    pitch: spawn.pitch,
    spawnId: spawn.id,
    clampedToSpawn: true,
  };
}
