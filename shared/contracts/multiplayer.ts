// ---------------------------------------------------------------------------
// shared/contracts/multiplayer.ts — Shared contracts, constants, and pure
// validators for HUST-HSK multiplayer rooms (Client <-> Cloudflare Worker).
//
// ARCHITECTURAL RULE: Zero React, Three.js, or browser DOM dependencies.
// ---------------------------------------------------------------------------

import { BOUNDS, clampScalar, type AABB } from '../constants/world';
import type {
  StudyClientToServerMessage,
  StudyServerToClientMessage,
} from './study';

export type {
  StudyClientToServerMessage,
  StudyServerToClientMessage,
} from './study';

export type RemoteState = 'idle' | 'walking' | 'running' | 'riding';
export type PlayerState = RemoteState;

export type AvatarGender = 'male' | 'female';

export type AvatarOutfitId =
  | 'windbreaker-hust'
  | 'bomber-red-grey'
  | 'bomber-navy-white'
  | 'bomber-red-navy'
  | 'polo-red'
  | 'hoodie-hust'
  | 'tshirt-navy'
  | 'sweater-cream'
  | 'shirt-white'
  | 'sport-pe';

export type AvatarHairStyle =
  | 'short'
  | 'swept'
  | 'layered'
  | 'ponytail'
  | 'bob'
  | 'bun';

export type AvatarEmoteId =
  | 'wave'
  | 'dance'
  | 'cheer'
  | 'bow'
  | 'clap'
  | 'stretch';

export const VALID_GENDERS: readonly AvatarGender[] = ['male', 'female'] as const;

export const VALID_OUTFIT_IDS: readonly AvatarOutfitId[] = [
  'windbreaker-hust',
  'bomber-red-grey',
  'bomber-navy-white',
  'bomber-red-navy',
  'polo-red',
  'hoodie-hust',
  'tshirt-navy',
  'sweater-cream',
  'shirt-white',
  'sport-pe',
] as const;

export const VALID_HAIR_STYLES: readonly AvatarHairStyle[] = [
  'short',
  'swept',
  'layered',
  'ponytail',
  'bob',
  'bun',
] as const;

export const VALID_EMOTE_IDS: readonly AvatarEmoteId[] = [
  'wave',
  'dance',
  'cheer',
  'bow',
  'clap',
  'stretch',
] as const;

export const MAX_CHAT_MESSAGE_LENGTH = 160;

const OUTFIT_SET = new Set<string>(VALID_OUTFIT_IDS);
const HAIR_SET = new Set<string>(VALID_HAIR_STYLES);
const EMOTE_SET = new Set<string>(VALID_EMOTE_IDS);
const STATE_SET = new Set<string>(['idle', 'walking', 'running', 'riding']);

export const ROOM_IDS = ['hsk-1', 'hsk-2', 'hsk-3', 'hsk-4', 'hsk-5'] as const;
export const ROOM_CAPACITY = 15;
export const MAX_SPEED_WALK = 7; // m/s: walk 4, run ~6.5 + jitter tolerance
export const MAX_SPEED_RIDE = 15; // m/s: bike max 14 + jitter tolerance
export const MAX_MSG_PER_SEC = 20;
export const MSSV_RE = /^\d{8}$/;

/**
 * Fallback shirt colours for remote players, hashed from sessionId.
 * HUST red (#DA1E26) is deliberately excluded so default polo remotes remain
 * visually distinct.
 */
export const SHIRT_COLORS = [
  '#1F3A5F', // navy
  '#2E7D32', // green
  '#F2A007', // amber
  '#7C4DBE', // purple
  '#0E7C7B', // teal
  '#C2571B', // orange
  '#546E7A', // slate
  '#8E24AA', // magenta
] as const;

export type MultiplayerSceneId = 'campus' | 'library' | 'classroom' | 'boardgame';

export interface RemoteAppearance {
  gender?: AvatarGender;
  outfit?: AvatarOutfitId;
  hairStyle?: AvatarHairStyle;
  skirt?: boolean;
  glasses?: boolean;
  backpack?: boolean;
}

export interface RemotePlayer extends RemoteAppearance {
  id: string;
  name: string;
  mssv: string;
  color: string;
  x: number;
  z: number;
  facing: number;
  state: RemoteState;
  scene?: MultiplayerSceneId;
  libraryFloor?: number;
  seatedSeatId?: string | null;
}

export type Player = RemotePlayer;

// --- WebSocket Wire Protocol Messages --------------------------------------

export interface ClientJoinMessage extends RemoteAppearance {
  type: 'join';
  sessionId: string;
  /** Secret credential used exclusively to authenticate session reconnects; never broadcast to peers. */
  reconnectToken?: string;
  name: string;
  mssv: string;
}

export interface ClientMoveMessage {
  type: 'move';
  x: number;
  z: number;
  facing: number;
  state: RemoteState;
}

export interface ClientStateMessage {
  type: 'state';
  state: RemoteState;
}

export interface ClientAppearanceMessage extends RemoteAppearance {
  type: 'appearance';
  name?: string;
  mssv?: string;
}

export interface ClientPingMessage {
  type: 'ping';
}

export interface ClientChatMessage {
  type: 'chat';
  text: string;
}

export interface ClientEmoteMessage {
  type: 'emote';
  emote: AvatarEmoteId;
}

export interface ClientPianoNoteMessage {
  type: 'piano:note';
  midi: number;
  velocity?: number;
}

export type ClientToServerMessage =
  | ClientJoinMessage
  | ClientMoveMessage
  | ClientStateMessage
  | ClientAppearanceMessage
  | ClientPingMessage
  | ClientChatMessage
  | ClientEmoteMessage
  | ClientPianoNoteMessage
  | StudyClientToServerMessage;

export interface ServerWelcomeMessage {
  type: 'welcome';
  id: string;
  roomId: string;
  players: RemotePlayer[];
  count: number;
}

export interface ServerJoinMessage {
  type: 'join';
  player: RemotePlayer;
}

export interface ServerLeaveMessage {
  type: 'leave';
  id: string;
}

export interface ServerMoveMessage {
  type: 'move';
  id: string;
  x: number;
  z: number;
  facing: number;
  state: RemoteState;
  t: number;
}

export interface ServerStateMessage {
  type: 'state';
  id: string;
  state: RemoteState;
}

export interface ServerAppearanceMessage {
  type: 'appearance';
  player: RemotePlayer;
}

export interface ServerCountMessage {
  type: 'count';
  count: number;
}

export interface ServerFullMessage {
  type: 'full';
  message: string;
}

export interface ServerErrorMessage {
  type: 'error';
  message: string;
}

export interface ServerPongMessage {
  type: 'pong';
}

export interface ServerChatMessage {
  type: 'chat';
  id: string;
  name: string;
  color: string;
  text: string;
  t: number;
}

export interface ServerEmoteMessage {
  type: 'emote';
  id: string;
  emote: AvatarEmoteId;
  t: number;
}

export interface ServerPianoNoteMessage {
  type: 'piano:note';
  id: string;
  midi: number;
  velocity: number;
  t: number;
}

export type ServerToClientMessage =
  | ServerWelcomeMessage
  | ServerJoinMessage
  | ServerLeaveMessage
  | ServerMoveMessage
  | ServerStateMessage
  | ServerAppearanceMessage
  | ServerCountMessage
  | ServerFullMessage
  | ServerErrorMessage
  | ServerPongMessage
  | ServerChatMessage
  | ServerEmoteMessage
  | ServerPianoNoteMessage
  | StudyServerToClientMessage;

// --- Pure Validation & Sanitization Helpers --------------------------------

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickShirtColor(sessionId: string): string {
  return SHIRT_COLORS[hashString(sessionId) % SHIRT_COLORS.length];
}

export function sanitizeReconnectToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw
    .replace(/[\u0000-\u001f\u007f\s]/g, '')
    .trim()
    .slice(0, 64);
  return clean.length >= 1 ? clean : null;
}

/**
 * Derives a deterministic, non-reversible public player ID (`p-<h1>-<h2>`)
 * from a secret reconnect credential.
 *
 * Security invariant:
 * - Public broadcasts (`welcome`, `join`, `move`, `state`, `appearance`,
 *   `leave`, `study:room-snapshot`, `study:seat-claimed`, `study:seat-released`,
 *   `study:presence`) ONLY expose this derived public ID (`id` / `occupantId` /
 *   `playerId`), never the raw reconnect credential.
 * - Knowing a player's public ID does not allow another client to derive
 *   their reconnect credential or hijack their session on a new WebSocket.
 */
export function derivePublicPlayerId(reconnectCredential: string): string {
  const clean = sanitizeReconnectToken(reconnectCredential) ?? 'anon';
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const s1 = `hust-hsk-pub-id-v1:${clean}`;
  const s2 = `${clean}:hust-hsk-peer-key-v1`;
  for (let i = 0; i < s1.length; i++) {
    h1 ^= s1.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  for (let i = 0; i < s2.length; i++) {
    h2 ^= s2.charCodeAt(i);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    h2 ^= h2 >>> 13;
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;
  return `p-${h1.toString(36)}-${h2.toString(36)}`;
}

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Bạn';
  const clean = raw
    .replace(/[<>&/\\]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 30);
  return clean || 'Bạn';
}

export function sanitizeMssv(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim();
  return MSSV_RE.test(clean) ? clean : null;
}

export function isRemoteState(s: unknown): s is RemoteState {
  return typeof s === 'string' && STATE_SET.has(s);
}

export function isAvatarGender(g: unknown): g is AvatarGender {
  return g === 'male' || g === 'female';
}

export function isAvatarOutfitId(o: unknown): o is AvatarOutfitId {
  return typeof o === 'string' && OUTFIT_SET.has(o);
}

export function isAvatarHairStyle(h: unknown): h is AvatarHairStyle {
  return typeof h === 'string' && HAIR_SET.has(h);
}

export function isAvatarEmoteId(e: unknown): e is AvatarEmoteId {
  return typeof e === 'string' && EMOTE_SET.has(e);
}

export function sanitizeChatMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw
    .replace(/[<>&]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHAT_MESSAGE_LENGTH);
  return clean.length >= 1 ? clean : null;
}

export function extractValidAppearance(msg: Record<string, unknown>): RemoteAppearance {
  const out: RemoteAppearance = {};
  if (isAvatarGender(msg.gender)) out.gender = msg.gender;
  if (isAvatarOutfitId(msg.outfit)) out.outfit = msg.outfit;
  if (isAvatarHairStyle(msg.hairStyle)) out.hairStyle = msg.hairStyle;
  if (typeof msg.skirt === 'boolean') out.skirt = msg.skirt;
  if (typeof msg.glasses === 'boolean') out.glasses = msg.glasses;
  if (typeof msg.backpack === 'boolean') out.backpack = msg.backpack;
  return out;
}

/**
 * Clamps a movement update to authoritative world bounds and enforces the
 * per-state speed cap over `dtSec`.
 */
export function clampMoveStep(
  prevX: number,
  prevZ: number,
  rawX: unknown,
  rawZ: unknown,
  state: RemoteState,
  dtSec: number,
  bounds: Readonly<AABB> = BOUNDS,
): { x: number; z: number } {
  const x = clampScalar(Number(rawX) || 0, bounds.minX, bounds.maxX);
  const z = clampScalar(Number(rawZ) || 0, bounds.minZ, bounds.maxZ);
  const dt = Math.max(0.05, dtSec);
  const dx = x - prevX;
  const dz = z - prevZ;
  const dist = Math.hypot(dx, dz);
  const maxSpeed = state === 'riding' ? MAX_SPEED_RIDE : MAX_SPEED_WALK;
  const maxDist = maxSpeed * dt + 0.5;
  if (dist > maxDist && dist > 0) {
    return {
      x: prevX + (dx / dist) * maxDist,
      z: prevZ + (dz / dist) * maxDist,
    };
  }
  return { x, z };
}

// --- 2π-Periodic Facing Telemetry Envelope ---------------------------------
// Encodes authoritative scene ('campus' | 'library' | 'classroom'), library
// floor (1..10), seated seat ID, 0.1m position (x, z), and HUST appearance
// into an exact integer multiple `k * 2π` added to the normalized facing angle
// `normFacing ∈ (-π, π)`.
//
// Why this is 100% transparent & backward-compatible:
// 1. Trigonometric functions (`sin`, `cos`) and `lerpAngle` (`% 2π`) are
//    invariant under `+ k * 2π`.
// 2. Plain angles in `[-π, π]` have `k === 0` (`hasTelemetry: false`), so all
//    existing unit tests and legacy messages behave identically.
// 3. Survives untouched through legacy deployed Cloudflare Workers that only
//    forward `{ x, z, facing, state }` and clamp `x <= 96` or initialize
//    `SPAWN` at `(-76, 10)`.

const TAU = Math.PI * 2;
const TELEMETRY_RADIX_X = 2641; // [-96.0 .. +168.0] in 0.1m steps
const TELEMETRY_RADIX_Z = 1841; // [-76.0 .. +108.0] in 0.1m steps
const TELEMETRY_RADIX_SCENE = 25; // 0=campus, 1..8=lib floors, 9=classroom, 10..13=1F seats, 14..21=seated floors, 22=piano, 23=lying 10F, 24=boardgame
const TELEMETRY_RADIX_APP = 961; // 0=none, 1..960 = 2(gender)*10(outfit)*6(hair)*8(flags)

const TELEMETRY_LIBRARY_FLOORS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 10] as const;
const TELEMETRY_SEAT_IDS: readonly string[] = [
  'tqb-1f-t1-s1',
  'tqb-1f-t1-s2',
  'tqb-1f-t2-s1',
  'tqb-1f-t2-s2',
] as const;

export interface MoveTelemetryInput {
  x: number;
  z: number;
  facing: number;
  scene?: MultiplayerSceneId;
  libraryFloor?: number;
  seatedSeatId?: string | null;
  appearance?: RemoteAppearance;
}

export interface DecodedMoveTelemetry {
  hasTelemetry: boolean;
  facing: number;
  x?: number;
  z?: number;
  scene?: MultiplayerSceneId;
  libraryFloor?: number;
  seatedSeatId?: string | null;
  appearance?: RemoteAppearance;
}

function encodeAppearanceCode(app?: RemoteAppearance): number {
  if (!app || !app.outfit) return 0;
  const genderIdx = app.gender === 'female' ? 1 : 0;
  const outfitIdx = VALID_OUTFIT_IDS.indexOf(app.outfit);
  if (outfitIdx < 0) return 0;
  const hairIdx = app.hairStyle ? Math.max(0, VALID_HAIR_STYLES.indexOf(app.hairStyle)) : 0;
  const flags =
    (app.skirt ? 1 : 0) +
    (app.glasses ? 2 : 0) +
    (app.backpack !== false ? 4 : 0);
  return 1 + (((flags * 6 + hairIdx) * 10 + outfitIdx) * 2 + genderIdx);
}

function decodeAppearanceCode(code: number): RemoteAppearance | undefined {
  if (code <= 0 || code > 960) return undefined;
  let rem = code - 1;
  const genderIdx = rem % 2;
  rem = Math.floor(rem / 2);
  const outfitIdx = rem % 10;
  rem = Math.floor(rem / 10);
  const hairIdx = rem % 6;
  const flags = Math.floor(rem / 6);
  return {
    gender: genderIdx === 1 ? 'female' : 'male',
    outfit: VALID_OUTFIT_IDS[outfitIdx] ?? 'windbreaker-hust',
    hairStyle: VALID_HAIR_STYLES[hairIdx] ?? (genderIdx === 1 ? 'ponytail' : 'short'),
    skirt: Boolean(flags & 1),
    glasses: Boolean(flags & 2),
    backpack: Boolean(flags & 4),
  };
}

function encodeSceneCode(
  scene?: MultiplayerSceneId,
  libraryFloor?: number,
  seatedSeatId?: string | null,
): number {
  if (scene === 'classroom') return 9;
  if (scene === 'boardgame') return 24;
  if (scene === 'library') {
    const flrIdx = TELEMETRY_LIBRARY_FLOORS.indexOf(libraryFloor ?? 1);
    const validFlrIdx = flrIdx >= 0 ? flrIdx : 0;
    if (seatedSeatId) {
      const seatIdx = TELEMETRY_SEAT_IDS.indexOf(seatedSeatId);
      if (seatIdx >= 0) return 10 + seatIdx;
      if (seatedSeatId === 'tqb-6f-piano-bench') return 22;
      if (
        seatedSeatId.startsWith('tqb-10f-bed-') ||
        seatedSeatId.startsWith('tqb-10f-lounger-') ||
        seatedSeatId === 'lying-floor-10'
      ) {
        return 23;
      }
      return 14 + validFlrIdx;
    }
    return 1 + validFlrIdx;
  }
  return 0;
}

function decodeSceneCode(code: number): {
  scene: MultiplayerSceneId;
  libraryFloor: number;
  seatedSeatId: string | null;
} {
  if (code === 9) {
    return { scene: 'classroom', libraryFloor: 1, seatedSeatId: null };
  }
  if (code >= 10 && code <= 13) {
    return {
      scene: 'library',
      libraryFloor: 1,
      seatedSeatId: TELEMETRY_SEAT_IDS[code - 10] ?? null,
    };
  }
  if (code >= 14 && code <= 21) {
    const flr = TELEMETRY_LIBRARY_FLOORS[code - 14] ?? 1;
    return {
      scene: 'library',
      libraryFloor: flr,
      seatedSeatId: `seated-floor-${flr}`,
    };
  }
  if (code === 22) {
    return {
      scene: 'library',
      libraryFloor: 6,
      seatedSeatId: 'tqb-6f-piano-bench',
    };
  }
  if (code === 23) {
    return {
      scene: 'library',
      libraryFloor: 10,
      seatedSeatId: 'lying-floor-10',
    };
  }
  if (code === 24) {
    return { scene: 'boardgame', libraryFloor: 1, seatedSeatId: null };
  }
  if (code >= 1 && code <= 8) {
    return {
      scene: 'library',
      libraryFloor: TELEMETRY_LIBRARY_FLOORS[code - 1] ?? 1,
      seatedSeatId: null,
    };
  }
  return { scene: 'campus', libraryFloor: 1, seatedSeatId: null };
}

export function encodeMoveTelemetry(input: MoveTelemetryInput): number {
  const qx = clampScalar(
    Math.round(((Number(input.x) || 0) - BOUNDS.minX) * 10),
    0,
    TELEMETRY_RADIX_X - 1,
  );
  const qz = clampScalar(
    Math.round(((Number(input.z) || 0) - BOUNDS.minZ) * 10),
    0,
    TELEMETRY_RADIX_Z - 1,
  );
  const sc = encodeSceneCode(input.scene, input.libraryFloor, input.seatedSeatId);
  const ac = encodeAppearanceCode(input.appearance);
  const k =
    1 +
    (((ac * TELEMETRY_RADIX_SCENE + sc) * TELEMETRY_RADIX_Z + qz) *
      TELEMETRY_RADIX_X +
      qx);

  const rawFacing = Number(input.facing) || 0;
  let norm = (((rawFacing + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  if (norm <= -Math.PI + 1e-4) norm = -Math.PI + 1e-4;
  if (norm >= Math.PI - 1e-4) norm = Math.PI - 1e-4;
  return norm + k * TAU;
}

export function decodeMoveTelemetry(encodedFacing: unknown): DecodedMoveTelemetry {
  if (typeof encodedFacing !== 'number' || !Number.isFinite(encodedFacing)) {
    return { hasTelemetry: false, facing: 0 };
  }
  const k = Math.round(encodedFacing / TAU);
  const facing = encodedFacing - k * TAU;
  const maxK =
    TELEMETRY_RADIX_X *
    TELEMETRY_RADIX_Z *
    TELEMETRY_RADIX_SCENE *
    TELEMETRY_RADIX_APP;
  if (k <= 0 || k > maxK) {
    return { hasTelemetry: false, facing };
  }
  let rem = k - 1;
  const qx = rem % TELEMETRY_RADIX_X;
  rem = Math.floor(rem / TELEMETRY_RADIX_X);
  const qz = rem % TELEMETRY_RADIX_Z;
  rem = Math.floor(rem / TELEMETRY_RADIX_Z);
  const sc = rem % TELEMETRY_RADIX_SCENE;
  const ac = Math.floor(rem / TELEMETRY_RADIX_SCENE);

  const x = Number((BOUNDS.minX + qx / 10).toFixed(1));
  const z = Number((BOUNDS.minZ + qz / 10).toFixed(1));
  const { scene, libraryFloor, seatedSeatId } = decodeSceneCode(sc);
  const appearance = decodeAppearanceCode(ac);

  return {
    hasTelemetry: true,
    facing,
    x,
    z,
    scene,
    libraryFloor,
    seatedSeatId,
    ...(appearance ? { appearance } : {}),
  };
}
