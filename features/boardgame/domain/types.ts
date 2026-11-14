// ---------------------------------------------------------------------------
// features/boardgame/domain/types.ts — Kiểu dữ liệu nội bộ (server-authoritative)
// của động cơ Bóng Đêm KTX. Không phụ thuộc React, DOM hay Three.js.
// ---------------------------------------------------------------------------

import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import type {
  BoardGameCardPublicMeta,
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameHighlightEntry,
  BoardGameLocationId,
  BoardGamePrivateNote,
  BoardGamePublicLogEntry,
  BoardGameRoleId,
  BoardGameTurnPhase,
} from '../../../shared/contracts/boardgame';

export interface GameCard extends BoardGameCardPublicMeta {
  effectKind:
    | 'signal-up'
    | 'mist-up'
    | 'heal-self'
    | 'shield-self'
    | 'damage-target'
    | 'damage-area'
    | 'fragment-up'
    | 'steal-fragment'
    | 'inspect-faction'
    | 'inspect-revealed-clue'
    | 'blackout-location'
    | 'relocate-target'
    | 'block-heal';
}

export interface RoleDefinition {
  id: BoardGameRoleId;
  name: string;
  faction: BoardGameFactionId;
  maxHp: number;
  skillName: string;
  skillSummary: string;
  goalSummary: string;
}

export interface LocationDefinition {
  id: BoardGameLocationId;
  name: string;
  shortLabel: string;
  description: string;
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
  shield: number;
  fragments: number;
  location: BoardGameLocationId;
  alive: boolean;
  connected: boolean;
  revealed: boolean;
  skillUsed: boolean;
  healBlockedNextTurn: boolean;
  wardPlayerId: string | null;
  shieldedForWardCount: number;
  predictedPlayerIds: string[];
  correctPredictions: number;
  hand: GameCard[];
  privateNotes: BoardGamePrivateNote[];
}

export interface AuthoritativeGameState {
  matchId: string;
  seed: number;
  rngState: number;
  round: number;
  maxRounds: number;
  signalProgress: number;
  mistProgress: number;
  maxTrackValue: number;
  turnOrder: string[];
  activeTurnIdx: number;
  turnPhase: BoardGameTurnPhase;
  actionUsedThisTurn: boolean;
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
