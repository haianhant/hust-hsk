// ---------------------------------------------------------------------------
// shared/contracts/multiplayer.ts — Shared contracts, constants, and pure
// validators for HUST-HSK multiplayer rooms (Client <-> Cloudflare Worker).
//
// ARCHITECTURAL RULE: Zero React, Three.js, or browser DOM dependencies.
// ---------------------------------------------------------------------------

import { BOUNDS, clampScalar, type AABB } from '../constants/world';

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

const OUTFIT_SET = new Set<string>(VALID_OUTFIT_IDS);
const HAIR_SET = new Set<string>(VALID_HAIR_STYLES);
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
}

export type Player = RemotePlayer;

// --- WebSocket Wire Protocol Messages --------------------------------------

export interface ClientJoinMessage extends RemoteAppearance {
  type: 'join';
  sessionId: string;
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

export type ClientToServerMessage =
  | ClientJoinMessage
  | ClientMoveMessage
  | ClientStateMessage
  | ClientAppearanceMessage
  | ClientPingMessage;

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
  | ServerPongMessage;

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
