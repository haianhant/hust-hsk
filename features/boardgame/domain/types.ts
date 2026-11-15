// ---------------------------------------------------------------------------
// features/boardgame/domain/types.ts — Kiểu dữ liệu nội bộ (server-authoritative)
// của động cơ Bóng Đêm KTX v2 (rulesetVersion = 2). Không phụ thuộc React/DOM/Three.js.
// ---------------------------------------------------------------------------

import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import type {
  BoardGameAccessTag,
  BoardGameCardPublicMeta,
  BoardGameDeckId,
  BoardGameEvidenceEntry,
  BoardGameFactionId,
  BoardGameHighlightEntry,
  BoardGameHypothesisEntry,
  BoardGameLocationId,
  BoardGamePrivateNote,
  BoardGamePublicLogEntry,
  BoardGameRoleId,
  BoardGameTraceTag,
  BoardGameTurnPhase,
} from '../../../shared/contracts/boardgame';

export type GameCardEffectKind =
  | 'scene-last-operator'
  | 'inspect-access-tag'
  | 'inspect-trace-tag'
  | 'compare-alignment'
  | 'inspect-movement-history'
  | 'radar-adjacent-overload'
  | 'verify-decoy-tamper'
  | 'exclude-safe-facility'
  | 'local-blackout-shield'
  | 'canteen-ginger-tea'
  | 'surprise-rollcall'
  | 'corridor-chill-draw'
  | 'floodlight-clear-blackout'
  | 'urgent-step-shield'
  | 'cabinet-spark-trace'
  | 'warden-supply-unlock'
  | 'shield-self'
  | 'heal-target'
  | 'damage-target-trace'
  | 'relocate-self'
  | 'relocate-target'
  | 'block-heal'
  | 'plant-decoy-trace'
  | 'handheld-scanner';

export interface GameCard extends BoardGameCardPublicMeta {
  effectKind: GameCardEffectKind;
}

export interface RoleDefinition {
  id: BoardGameRoleId;
  name: string;
  faction: BoardGameFactionId;
  maxHp: number;
  accessTag: BoardGameAccessTag;
  traceTag: BoardGameTraceTag;
  skillName: string;
  skillSummary: string;
  covertSummary: string;
  revealBenefitSummary: string;
  goalSummary: string;
}

export interface LocationDefinition {
  id: BoardGameLocationId;
  name: string;
  shortLabel: string;
  description: string;
  actionLabel: string;
  isInfrastructure: boolean;
  adjacent: readonly BoardGameLocationId[];
}

export interface SceneTraceRecord {
  round: number;
  playerId: string;
  displayName: string;
  traceTag: BoardGameTraceTag;
  wasSabotage: boolean;
}

export interface AuthoritativePlayerState {
  playerId: string;
  displayName: string;
  seatIndex: number;
  appearance: RemoteAppearance;
  roleId: BoardGameRoleId;
  faction: BoardGameFactionId;
  hp: number;
  maxHp: number;
  shield: number;
  accessTag: BoardGameAccessTag;
  traceTag: BoardGameTraceTag;
  location: BoardGameLocationId;
  visitedLocations: BoardGameLocationId[];
  recentMoves: { round: number; location: BoardGameLocationId }[];
  technicalActionRounds: number[];
  plantedDecoyRounds: number[];
  dealtDamageRounds: number[];
  metPlayerIds: string[];
  verifiedSceneLocations: BoardGameLocationId[];
  alive: boolean;
  detained: boolean;
  connected: boolean;
  revealed: boolean;
  skillUsed: boolean;
  covertSkillUsed: boolean;
  confrontUsed: boolean;
  healBlockedNextTurn: boolean;
  bodyguardActive: boolean;
  wardPlayerId: string | null;
  wardProtectionsCount: number;
  sacrificedForWard: boolean;
  hypotheses: BoardGameHypothesisEntry[];
  hand: GameCard[];
  evidenceList: BoardGameEvidenceEntry[];
  privateNotes: BoardGamePrivateNote[];
}

export interface AuthoritativeGameState {
  rulesetVersion: 2;
  matchId: string;
  seed: number;
  rngState: number;
  round: number;
  maxRounds: number;
  secretSabotageLocation: BoardGameLocationId;
  sabotagePlanted: boolean;
  sabotagePlantedRound: number | null;
  sabotagePlantedByPlayerId: string | null;
  sabotageArmed: boolean;
  plotDetonated: boolean;
  disarmedCount: number;
  breakerSealed: boolean;
  radioSealed: boolean;
  falseAccusationCount: number;
  dossierPublishedBy: string | null;
  tamperedLocations: BoardGameLocationId[];
  tamperHistoryByLocation: Record<BoardGameLocationId, SceneTraceRecord[]>;
  turnOrder: string[];
  activeTurnIdx: number;
  turnPhase: BoardGameTurnPhase;
  actionUsedThisTurn: boolean;
  hypothesisUpdatedThisTurn: boolean;
  blackoutLocation: BoardGameLocationId | null;
  blackoutRoundsLeft: number;
  lastVisitorByLocation: Record<BoardGameLocationId, string | null>;
  players: AuthoritativePlayerState[];
  decks: Record<BoardGameDeckId, string[]>;
  discards: Record<BoardGameDeckId, string[]>;
  publicLog: BoardGamePublicLogEntry[];
  highlights: BoardGameHighlightEntry[];
  winnerLabel: string | null;
  winnerFaction: BoardGameFactionId | 'wanderer-solo' | null;
  winnerPlayerIds: string[];
  winReason: string | null;
  finished: boolean;
  seqCounter: number;
}
