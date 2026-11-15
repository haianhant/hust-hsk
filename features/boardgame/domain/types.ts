// ---------------------------------------------------------------------------
// features/boardgame/domain/types.ts — Kiểu dữ liệu nội bộ (server-authoritative)
// của động cơ Bóng Đêm KTX v3 (`rulesetVersion = 3`: Hidden Role, Investigation & Survival).
// Không phụ thuộc React / DOM / Three.js.
// ---------------------------------------------------------------------------

import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import type {
  BoardGameCardPublicMeta,
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameHighlightEntry,
  BoardGameInvestigationOutcome,
  BoardGameLocationId,
  BoardGamePrivateClueEntry,
  BoardGamePrivateNote,
  BoardGamePublicLogEntry,
  BoardGameRevealEvent,
  BoardGameRoleId,
  BoardGameTurnPhase,
} from '../../../shared/contracts/boardgame';

export type GameCardEffectKind =
  // 9 Conditional Investigation cards
  | 'inv-mist-or-13'
  | 'inv-guard-or-12'
  | 'inv-wanderer-or-11'
  | 'inv-non-guard-le12'
  | 'inv-guard-dung-trang'
  | 'inv-pair-resonance'
  | 'inv-footsteps'
  | 'inv-scuffle-trace'
  | 'inv-locker-check'
  // 9 Equipment cards (7 persistent + 2 consumable)
  | 'eq-windbreaker'
  | 'eq-flashlight'
  | 'eq-sneakers'
  | 'eq-walkie-talkie'
  | 'eq-alarm-whistle'
  | 'eq-goggles'
  | 'eq-baton'
  | 'eq-thermos'
  | 'eq-magnetic-pass'
  // 8 Event cards
  | 'ev-power-flicker'
  | 'ev-midnight-noodles'
  | 'ev-loudspeaker'
  | 'ev-rain-shower'
  | 'ev-locker-audit'
  | 'ev-calm-tea'
  | 'ev-rumor-wave'
  | 'ev-curfew-bell';

export interface GameCard extends BoardGameCardPublicMeta {
  effectKind: GameCardEffectKind;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  cooldownRounds: number;
  summary: string;
}

export interface CharacterDesign {
  id: BoardGameRoleId;
  name: string;
  faction: BoardGameFactionId;
  maxHp: number;
  secretObjective: string;
  activeAbility: AbilityDefinition;
  passiveAbility: AbilityDefinition;
  revealBenefit: string;
  weaknesses: readonly string[];
}

export interface LocationDefinition {
  id: BoardGameLocationId;
  name: string;
  shortLabel: string;
  description: string;
  actionLabel: string;
  allowedDecks: readonly BoardGameDeckId[];
  adjacent: readonly BoardGameLocationId[];
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
  tempShield: number;
  location: BoardGameLocationId;
  visitedLocations: BoardGameLocationId[];
  recentTrail: BoardGameLocationId[];
  alive: boolean;
  connected: boolean;
  revealed: boolean;
  skillCooldown: number;
  stayedLastTurn: boolean;
  stayedCount: number;
  movesMade: number;
  attacksMade: number;
  investigationsCount: number;
  actedThisRound: boolean;
  extendedRangeThisTurn: boolean;
  courtAttackBonusThisTurn: boolean;
  globalInvestigateThisTurn: boolean;
  equipUsedThisTurn: boolean;
  wardedUntilRound: number;
  exposedMark: number;
  gainedShieldThisTurn: boolean;
  protegePlayerId: string | null;
  protectedProtegeCount: number;
  eliminatedByPlayerId: string | null;
  eliminatedPlayerIds: string[];
  avengedProtegeKiller: boolean;
  investigatedTargetIds: string[];
  hand: GameCard[];
  equipped: GameCard[];
  privateClues: BoardGamePrivateClueEntry[];
  privateNotes: BoardGamePrivateNote[];
}

export interface AuthoritativeGameState {
  rulesetVersion: 3;
  matchId: string;
  seed: number;
  rngState: number;
  round: number;
  maxRounds: number;
  turnNumber: number;
  turnStartedAtMs: number;
  turnOrder: string[];
  activeTurnIdx: number;
  turnPhase: BoardGameTurnPhase;
  curfewPressureActive: boolean;
  courtRangeJammedRound: number;
  lastInvestigation: BoardGameInvestigationOutcome | null;
  lastRevealEvent: BoardGameRevealEvent | null;
  players: AuthoritativePlayerState[];
  decks: Record<BoardGameDeckId, string[]>;
  discards: Record<BoardGameDeckId, string[]>;
  publicLog: BoardGamePublicLogEntry[];
  highlights: BoardGameHighlightEntry[];
  winnerLabel: string | null;
  winnerFaction: BoardGameFactionId | 'wanderer-solo' | 'wanderer' | null;
  winnerPlayerIds: string[];
  winReason: string | null;
  finished: boolean;
  publicLogSeq: number;
  seqCounter: number;
}
