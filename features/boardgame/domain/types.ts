// ---------------------------------------------------------------------------
// features/boardgame/domain/types.ts — Internal Authoritative Types cho Engine
// Bóng Đêm KTX v4 (Săn Bóng Đêm KTX: Dice Movement, Paired Clusters, 1-on-1 Probe & Combat).
// Không phụ thuộc React, Three.js hay DOM.
// ---------------------------------------------------------------------------

import type {
  BoardGameCardPublicMeta,
  BoardGameClusterPair,
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
  | 'inv_anger'
  | 'inv_blackmail'
  | 'inv_greed'
  | 'inv_slap'
  | 'inv_spell'
  | 'inv_exorcism'
  | 'inv_aid'
  | 'inv_nurturance'
  | 'inv_huddle'
  | 'inv_bully'
  | 'inv_tough_lesson'
  | 'inv_prediction'
  | 'eq_holy_robe'
  | 'eq_fortune_brooch'
  | 'eq_talisman'
  | 'eq_spear'
  | 'eq_compass'
  | 'eq_silver_rosary'
  | 'eq_holy_water'
  | 'eq_blessing'
  | 'eq_first_aid'
  | 'eq_guardian_angel'
  | 'eq_flare'
  | 'eq_mirror'
  | 'eq_advent'
  | 'eq_chocolate'
  | 'eq_concealed_knowledge'
  | 'ev_masamune'
  | 'ev_butcher_knife'
  | 'ev_chainsaw'
  | 'ev_rusted_axe'
  | 'ev_handgun'
  | 'ev_machine_gun'
  | 'ev_vampire_bat'
  | 'ev_spider'
  | 'ev_dynamite'
  | 'ev_spiritual_doll'
  | 'ev_moody_goblin'
  | 'ev_banana_peel'
  | 'ev_diabolic_ritual';

export interface GameCardDefinition extends BoardGameCardPublicMeta {
  effectKind: GameCardEffectKind;
  copies: number;
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
  attacksThisTurn: number;
  investigationsCount: number;
  consecutiveSameZoneRolls: number;
  eliminatedRound: number | null;
  eliminatedByPlayerId: string | null;
  protegePlayerId: string | null;
  avengedProtegeKiller: boolean;
  charlesKillWon: boolean;
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
  clusterPairs: BoardGameClusterPair[];
  allowedMoveDestinations?: BoardGameLocationId[];
  firstDeadPlayerId: string | null;
  extraTurnPending: boolean;
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
