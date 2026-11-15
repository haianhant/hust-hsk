// ---------------------------------------------------------------------------
// features/boardgame/domain/types.ts — Internal Authoritative Types cho Engine
// Bóng Đêm KTX v4 (Săn Bóng Đêm KTX: Dice Movement, Paired Clusters, 1-on-1 Probe & Combat).
// Không phụ thuộc React, Three.js hay DOM.
// ---------------------------------------------------------------------------

import type {
  BoardGameCardPublicMeta,
  BoardGameDeckId,
  BoardGameDiceRollEvent,
  BoardGameFactionId,
  BoardGameHighlightEntry,
  BoardGameInvestigationOutcome,
  BoardGameLocationId,
  BoardGamePrivateClueEntry,
  BoardGamePublicLogEntry,
  BoardGameRevealEvent,
  BoardGameRevealRecord,
  BoardGameRoleId,
  BoardGameTurnPhase,
  BoardGameZoneClusterId,
} from '../../../shared/contracts/boardgame';
import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';

export type GameCardEffectKind =
  | 'inv_is_hunter'
  | 'inv_is_shadow'
  | 'inv_is_wanderer'
  | 'inv_hunter_or_wanderer'
  | 'inv_shadow_or_wanderer'
  | 'inv_hp_ge_12'
  | 'inv_hp_le_11'
  | 'inv_unrevealed'
  | 'eq_armor'
  | 'eq_heavy_shield'
  | 'eq_event_ward'
  | 'eq_captain_badge'
  | 'ev_heal_2'
  | 'ev_heal_3'
  | 'ev_cluster_heal_2'
  | 'ev_full_heal_hunter'
  | 'eq_precise_stick'
  | 'eq_wrench'
  | 'eq_iron_bar'
  | 'eq_long_cable'
  | 'eq_steal_hook'
  | 'ev_snipe_2'
  | 'ev_location_blast_2'
  | 'ev_drain_2';

export interface GameCardDefinition extends BoardGameCardPublicMeta {
  effectKind: GameCardEffectKind;
}

export interface ZoneClusterDefinition {
  id: BoardGameZoneClusterId;
  name: string;
  subtitle: string;
  locationIds: readonly [BoardGameLocationId, BoardGameLocationId];
}

export interface LocationDefinition {
  id: BoardGameLocationId;
  name: string;
  shortName: string;
  clusterId: BoardGameZoneClusterId;
  diceNumbers: readonly number[];
  diceLabel: string;
  subtitle: string;
  deckHint: BoardGameDeckId | 'any' | 'power-9' | 'power-10';
  actionSummary: string;
  accentColor: string;
}

export interface CharacterDesign {
  id: BoardGameRoleId;
  name: string;
  title: string;
  faction: BoardGameFactionId;
  maxHp: number;
  skillName: string;
  skillSummary: string;
  cooldownRounds: number;
  oncePerMatch: boolean;
  targetMode: 'passive' | 'self' | 'same-cluster' | 'any-other' | 'any-player';
  secretGoalText: string;
}

export interface AuthoritativePlayerState {
  playerId: string;
  displayName: string;
  seatIndex: number;
  roleId: BoardGameRoleId;
  faction: BoardGameFactionId;
  hp: number;
  maxHp: number;
  woundsTaken: number;
  location: BoardGameLocationId;
  hand: string[];
  equipped: string[];
  revealed: boolean;
  alive: boolean;
  connected: boolean;
  skillCooldown: number;
  skillUsedOnce: boolean;
  guardianShieldActive: boolean;
  attacksMade: number;
  investigationsCount: number;
  consecutiveSameZoneRolls: number;
  eliminatedRound: number | null;
  eliminatedByPlayerId: string | null;
  protegePlayerId: string | null;
  avengedProtegeKiller: boolean;
  investigatedTargetIds: string[];
  privateClues: BoardGamePrivateClueEntry[];
  appearance: RemoteAppearance;
}

export interface AuthoritativeGameState {
  rulesetVersion: 4;
  matchId: string;
  seed: number;
  rngState: number;
  round: number;
  maxRounds: number;
  turnNumber: number;
  turnPhase: BoardGameTurnPhase;
  activePlayerId: string | null;
  turnOrder: string[];
  players: Record<string, AuthoritativePlayerState>;
  decks: Record<BoardGameDeckId, string[]>;
  discards: Record<BoardGameDeckId, string[]>;
  lastDiceRoll: BoardGameDiceRollEvent | null;
  lastInvestigation: BoardGameInvestigationOutcome | null;
  lastRevealEvent: BoardGameRevealEvent | null;
  publicLog: BoardGamePublicLogEntry[];
  highlights: BoardGameHighlightEntry[];
  finished: boolean;
  winnerFaction: BoardGameFactionId | 'wanderer-solo' | 'wanderer' | null;
  winnerLabel: string | null;
  winnerPlayerIds: string[];
  winReason: string | null;
  finalReveal: BoardGameRevealRecord[] | null;
}

export interface VictoryEvaluation {
  finished: boolean;
  winnerFaction: BoardGameFactionId | 'wanderer-solo' | 'wanderer' | null;
  winnerLabel: string | null;
  winnerPlayerIds: string[];
  winReason: string | null;
  winningRoleIds: BoardGameRoleId[];
}

export interface EngineActionResult {
  ok: boolean;
  error?: string;
  reason?: string;
}
