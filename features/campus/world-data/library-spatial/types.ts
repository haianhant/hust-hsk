// ---------------------------------------------------------------------------
// features/campus/world-data/library-spatial/types.ts — Pure TypeScript types
// for the Canonical Multi-Floor Tạ Quang Bửu Library Spatial Model (PR10A).
// Zero React or Three.js dependencies.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../bounds';

export type LibraryFloor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10;

export type LibraryBlock = 'A' | 'B' | 'D';

export interface LibraryLocation {
  block: LibraryBlock;
  floor: LibraryFloor;
  x: number;
  y: number;
  z: number;
}

export type SpatialColliderKind =
  | 'wall'
  | 'furniture'
  | 'railing'
  | 'column'
  | 'shaft';

export interface SpatialBounds3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface SpatialCylinder2D {
  x: number;
  z: number;
  radius: number;
}

export interface SpatialCollider {
  id: string;
  name: string;
  block: LibraryBlock;
  floor: LibraryFloor;
  kind: SpatialColliderKind;
  bounds: SpatialBounds3D;
  /** Optional cylindrical horizontal footprint (used for columns and round desks). */
  cylinder?: SpatialCylinder2D;
}

export type SurfaceShape2D =
  | {
      kind: 'rect';
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
    }
  | {
      kind: 'stadium';
      /** Half length of the straight horizontal section along X (`[-halfStraight, +halfStraight]`). */
      halfStraight: number;
      /** Semicircle radius at both X ends. */
      radius: number;
    }
  | {
      kind: 'circle';
      x: number;
      z: number;
      radius: number;
    };

export interface StadiumVoidOpening {
  /** +1 for East semicircle (`+halfStraight`), -1 for West semicircle (`-halfStraight`). */
  side: 1 | -1;
  /** Half angular opening (radians) around angle 0 (East) or PI (West) where stairs connect. */
  halfAngle: number;
}

export interface SurfaceVoidHole {
  id: string;
  shape: {
    kind: 'stadium';
    halfStraight: number;
    radius: number;
  };
  /** Optional angular openings on the semicircle ends where stairs join the slab. */
  openings?: StadiumVoidOpening[];
}

export interface WalkableSurface {
  id: string;
  name: string;
  block: LibraryBlock;
  floor: LibraryFloor;
  baseY: number;
  shape: SurfaceShape2D;
  holes?: SurfaceVoidHole[];
}

export interface DoorwayOpening {
  id: string;
  name: string;
  block: LibraryBlock;
  floor: LibraryFloor;
  /** Wall axis: `'x'` means the wall runs along X at fixed Z; `'z'` means the wall runs along Z at fixed X. */
  wallAxis: 'x' | 'z';
  /** Fixed coordinate of the wall (`z` when `wallAxis === 'x'`, `x` when `wallAxis === 'z'`). */
  wallCoord: number;
  /** Center coordinate along `wallAxis` (`x` when `wallAxis === 'x'`, `z` when `wallAxis === 'z'`). */
  center: number;
  /** Full clear doorway width (m). */
  width: number;
  /** Clear doorway height above the floor (m). */
  height: number;
  fromSurfaceId: string;
  toSurfaceId: string;
}

export interface CurvedStairFlight {
  id: string;
  name: string;
  block: 'A';
  fromFloor: 1;
  toFloor: 2;
  /** +1 = East curved stair, -1 = West curved stair. */
  side: 1 | -1;
  centerX: number;
  centerZ: number;
  innerRadius: number;
  outerRadius: number;
  midRadius: number;
  width: number;
  /** Start angle in radians (bottom of stair at Floor 1, `y = 0`). */
  startAngle: number;
  /** End angle in radians (top landing at Floor 2, `y = 4.5`). */
  endAngle: number;
  bottomY: number;
  topY: number;
}

export type LibraryFurniturePropKind =
  | 'table4'
  | 'round4'
  | 'sofa'
  | 'armchair'
  | 'shelf';

export interface LibraryFurniturePlacement {
  id: string;
  name: string;
  floor: 1 | 2 | 3 | 4 | 5;
  prop: LibraryFurniturePropKind;
  x: number;
  y: number;
  z: number;
  ry: number;
}

export interface LibrarySpawnPoint {
  id: string;
  label: string;
  fullLabel: string;
  shortLabel: string;
  description: string;
  block: LibraryBlock;
  floor: LibraryFloor;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface LibraryInteractionAnchor {
  id: string;
  name: string;
  block: LibraryBlock;
  floor: LibraryFloor;
  pos: Vec2;
  radius: number;
}

export interface FloorSupportResult {
  supported: boolean;
  elevation: number | null;
  surfaceId: string | null;
  floor: LibraryFloor;
  block: LibraryBlock;
  onStair: boolean;
  stairId: string | null;
  recommendedFloor: LibraryFloor;
}

export interface LibraryCollisionResult {
  position: LibraryLocation;
  blocked: boolean;
  collisionIds: string[];
  hit: string | null;
  grounded: boolean;
  surfaceId: string | null;
  recommendedFloor: LibraryFloor;
}

export interface LibrarySpatialDiagnostics {
  block: LibraryBlock;
  floor: LibraryFloor;
  pos: { x: number; y: number; z: number };
  grounded: boolean;
  surfaceId: string | null;
  lastCollisionId: string | null;
  collisionIds: string[];
  nearestDoorId: string | null;
  nearestSeatId: string | null;
  nearestSeatFloor: LibraryFloor;
  activeSeatId: string | null;
  debugCollisionOverlay: boolean;
}
