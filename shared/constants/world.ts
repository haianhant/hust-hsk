// ---------------------------------------------------------------------------
// shared/constants/world.ts — Authoritative world constants shared across
// Frontend (Next.js / R3F), Backend (Cloudflare Worker DO), and Test Shim.
//
// ARCHITECTURAL RULE: Zero React, Three.js, or browser DOM dependencies.
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  z: number;
}

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Authoritative campus world bounds (in meters).
 * Covers West (Giải Phóng / Parabol Gate at x = -96) to East (Trần Đại Nghĩa /
 * SoICT B1 / Dormitories B3-B13 / Stadium at x = 168), and North (Đại Cồ Việt
 * at z = -76) to South (Tạ Quang Bửu / Sports Complex at z = 108).
 */
export const BOUNDS: Readonly<AABB> = {
  minX: -96,
  maxX: 168,
  minZ: -76,
  maxZ: 108,
} as const;

/** Default player spawn point inside Cổng Trần Đại Nghĩa, facing West (-X) into the campus. */
export const SPAWN = {
  x: 90,
  z: -6,
  facing: -Math.PI / 2,
} as const;

/** Standard human proportion and movement speeds (m, m/s). */
export const AVATAR = {
  height: 1.7,
  radius: 0.4,
  walkSpeed: 4,
  runSpeed: 7,
} as const;

/** Personal motorbike constants (m, m/s). */
export const BIKE_PARK: Vec2 & { heading: number } = {
  x: -70,
  z: 14.5,
  heading: Math.PI / 2,
};
export const BIKE_MAX_SPEED = 14;
export const BIKE_RADIUS = 0.55;

export function clampScalar(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function clampToWorldBounds(p: Vec2, bounds: Readonly<AABB> = BOUNDS): Vec2 {
  return {
    x: clampScalar(Number(p.x) || 0, bounds.minX, bounds.maxX),
    z: clampScalar(Number(p.z) || 0, bounds.minZ, bounds.maxZ),
  };
}
