// ---------------------------------------------------------------------------
// features/boardgame/domain/types.ts — Internal Authoritative Types cho Engine
// Bóng Đêm KTX v4 (Săn Bóng Đêm KTX: Dice Movement, Paired Clusters, 1-on-1 Probe & Combat).
// Không phụ thuộc React, Three.js hay DOM.
// ---------------------------------------------------------------------------

import type {
  BoardGameCardPublicMeta,
  BoardGameChoiceOptionView,
  BoardGameClusterPair,
  BoardGameDeckId,
  BoardGameDiceRollEvent,
  BoardGameFactionId,
  BoardGameHighlightEntry,
  BoardGameInvestigationOutcome,
  BoardGameLocationId,
  BoardGamePendingChoiceKind,
  BoardGamePrivateClueEntry,
  BoardGamePublicLogEntry,
  BoardGameRevealEvent,
  BoardGameRevealRecord,
  BoardGameRoleId,
  BoardGameRulesetId,
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
  lastAttackTargetId?: string | null;
  investigationsCount: number;
  consecutiveSameZoneRolls: number;
  eliminatedRound: number | null;
  eliminatedByPlayerId: string | null;
  protegePlayerId: string | null;
  avengedProtegeKiller: boolean;
  charlesKillWon: boolean;
  investigatedTargetIds: string[];
  clueSeq?: number;
  privateClues: BoardGamePrivateClueEntry[];
  appearance: RemoteAppearance;
}

export type DamageSourceKind =
  | 'attack'
  | 'card'
  | 'event'
  | 'location'
  | 'skill'
  | 'investigation'
  | 'retaliation'
  | 'hp-cost';

export interface AttackRollSample {
  d6: number;
  d4: number;
  baseDmg: number;
  rawDmg: number;
  hasMasamune: boolean;
}

export type PendingResolutionStep =
  | {
      kind: 'DAMAGE';
      damageEventId: string;
      causationId?: string;
      sourceCardId?: string;
      targetPlayerId: string;
      rawAmount: number;
      sourceType: DamageSourceKind;
      attackerPlayerId: string | null;
      preAttackTargetHp?: number;
      preAttackTargetRevealed?: boolean;
      isFujikoExecution?: boolean;
      isTalismanWardable?: boolean;
      isHpCost?: boolean;
      unpreventable?: boolean;
      isRetaliation?: boolean;
      undyingChecked?: boolean;
      undyingReduced?: boolean;
      preUndyingDmg?: number;
      /** Ngữ cảnh ghi log đòn tấn công đơn mục tiêu hoặc bài/kỹ năng */
      attackSingleTargetLog?: {
        rollDesc: string;
      };
      /** Ghi log tùy chỉnh sau khi damage thực sự được áp dụng */
      postLogKind?: BoardGamePublicLogEntry['kind'];
      postLogPrefix?: string;
      postLogSuffix?: string;
      postLogActorId?: string | null;
    }
  | {
      kind: 'AFTER_DAMAGE_TRIGGERS';
      afterDamageEventId: string;
      sourceDamageEventId: string;
      targetPlayerId: string;
      attackerPlayerId: string | null;
      actualDealt: number;
      sourceType: DamageSourceKind;
      isRetaliation?: boolean;
      isHpCost?: boolean;
      cindyChecked?: boolean;
    }
  | {
      kind: 'POST_ATTACK_EFFECTS';
      attackerPlayerId: string;
      primaryTargetId: string;
      targetCount: number;
      d6: number;
      d4: number;
      baseDmg: number;
      rawDmg: number;
      hasMasamune: boolean;
      hasMachineGun: boolean;
      rollDesc: string;
      totalDealt: number;
      counterAttackerIds: string[];
    }
  | {
      kind: 'COUNTER_ATTACK';
      defenderPlayerId: string;
      attackerPlayerId: string;
    }
  | {
      kind: 'VAMPIRE_BAT_HEAL';
      actorPlayerId: string;
      targetPlayerId: string;
      cardTitle: string;
      dealtToTarget: number;
    }
  | {
      kind: 'SPIDER_SELF_DAMAGE';
      actorPlayerId: string;
      targetPlayerId: string;
      cardTitle: string;
      dealtToTarget: number;
    }
  | {
      kind: 'ELIMINATION_TRIGGERS';
      eliminationEventId: string;
      causationId?: string;
      sourceCardId?: string;
      turnNumberAtElimination?: number;
      victimPlayerId: string;
      victimFactionAtDeath: BoardGameFactionId;
      killerPlayerId: string | null;
      sourceType: DamageSourceKind;
      wyvernChecked?: boolean;
      vengeanceChecked?: boolean;
      wendigoCheckedIds?: string[];
    }
  | {
      kind: 'FINISH_ACTION';
      actorPlayerId: string;
      autoEndTurnMode: 'never' | 'always' | 'if-not-charles-feast';
    };

export type PendingChoiceContextData =
  | {
      kind: 'fiona_attack_roll';
      actorPlayerId: string;
      targetPlayerId: string;
      hasMasamune: boolean;
      hasMachineGun: boolean;
      rolls: [AttackRollSample, AttackRollSample];
    }
  | {
      kind: 'wendigo_reveal_heal';
      wendigoPlayerId: string;
      eliminationEventId: string;
      victimPlayerId: string;
      victimDisplayName: string;
    }
  | {
      kind: 'gayle_attack_reroll';
      actorPlayerId: string;
      targetPlayerId: string;
      hasMasamune: boolean;
      hasMachineGun: boolean;
      firstRoll: AttackRollSample;
    }
  | {
      kind: 'felicia_draw_choice';
      actorPlayerId: string;
      deckId: BoardGameDeckId;
      cardIds: [string, string];
    }
  | {
      kind: 'victor_blood_boost';
      actorPlayerId: string;
      targetPlayerId: string;
      hasMasamune: boolean;
      hasMachineGun: boolean;
      roll: AttackRollSample;
      eligibleTargetIds: string[];
    }
  | {
      kind: 'undying_reveal_reduce';
      undyingPlayerId: string;
      damageEventId: string;
      preUndyingDmg: number;
      sourceType: DamageSourceKind;
    }
  | {
      kind: 'elysia_counter_boost';
      actorPlayerId: string;
      targetPlayerId: string;
      hasMasamune: boolean;
      hasMachineGun: boolean;
      roll: AttackRollSample;
    }
  | {
      kind: 'cindy_reveal_retaliate';
      cindyPlayerId: string;
      sourceDamageEventId: string;
      attackerPlayerId: string;
      attackerDisplayName: string;
    }
  | {
      kind: 'bipolar_fate_coin';
      actorPlayerId: string;
      turnNumber: number;
    }
  | {
      kind: 'fea_move_adjust';
      actorPlayerId: string;
      d6: number;
      d4: number;
      rawTotal: number;
      deltaByOptionId: Record<string, -1 | 0 | 1>;
    }
  | {
      kind: 'wrath_turn_start_aoe';
      actorPlayerId: string;
      turnNumber: number;
      victimPlayerIds: string[];
    }
  | {
      kind: 'vengeance_chain_strike';
      vengeancePlayerId: string;
      eliminationEventId: string;
      victimPlayerId: string;
      targetMap: Record<string, string[]>;
    }
  | {
      kind: 'visions_mark_target';
      actorPlayerId: string;
      turnNumber: number;
      targetMap: Record<string, string>;
    }
  | {
      kind: 'cruz_black_redraw';
      actorPlayerId: string;
      drawnCardId: string;
    }
  | {
      kind: 'bryon_gift_equipment';
      actorPlayerId: string;
      giftMap: Record<string, { recipientPlayerId: string; cardIds: string[] }>;
    };

export interface AuthoritativePendingChoice {
  choiceId: string;
  eventId: string;
  ownerPlayerId: string;
  kind: BoardGamePendingChoiceKind;
  isSecret: boolean;
  title: string;
  description: string;
  publicPromptLabel: string;
  options: BoardGameChoiceOptionView[];
  defaultOptionId: string;
  createdAtMs: number;
  deadlineMs: number;
  data: PendingChoiceContextData;
}

export interface ExpansionRuntimeStats {
  activationsByRole: Record<string, number>;
  damagePreventedByRole: Record<string, number>;
  healByRole: Record<string, number>;
  bonusDamageByRole: Record<string, number>;
}

export interface GloriaQueuedCardEntry {
  playerId: string;
  cardId: string;
  movementEventId: string;
}

export interface VisionsMarkEntry {
  targetPlayerId: string;
  markedOnTurnNumber: number;
  lastTickTurnNumber?: number;
}

export interface ExpansionRuntimeState {
  eventSeq: number;
  processedEventIds: string[];
  resolvedChoiceIds: string[];
  pendingSteps: PendingResolutionStep[];
  gloriaQueuedCards?: GloriaQueuedCardEntry[];
  bipolarPromptedTurnNumber?: number;
  wrathPromptedTurnNumber?: number;
  visionsPromptedTurnNumber?: number;
  feaAdjustedTurnNumber?: number;
  bryonGiftedTurnNumber?: number;
  visionsMarks?: Record<string, VisionsMarkEntry>;
  /** Ghi nhận lượt mới nhất mà người chơi Cruz kích hoạt lá Đen hợp lệ (`ev-07..ev-10`). */
  cruzQualifyingCardTurnByPlayer?: Record<string, number>;
  /** Danh sách playerId Cruz đã hoàn thành điều kiện thắng hạ gục trong lượt hợp lệ. */
  cruzWinTriggeredIds?: string[];
  choiceTimeoutMs?: number;
  stats: ExpansionRuntimeStats;
}

export interface AuthoritativeGameState {
  rulesetVersion: 4;
  rulesetId?: BoardGameRulesetId;
  catalogVersion?: string;
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
  pendingChoice?: AuthoritativePendingChoice | null;
  expansionState?: ExpansionRuntimeState;
  firstDeadPlayerId: string | null;
  extraTurnPending: boolean;
  players: Record<string, AuthoritativePlayerState>;
  decks: Record<BoardGameDeckId, string[]>;
  discards: Record<BoardGameDeckId, string[]>;
  lastDiceRoll: BoardGameDiceRollEvent | null;
  lastInvestigation: BoardGameInvestigationOutcome | null;
  lastRevealEvent: BoardGameRevealEvent | null;
  logSeq?: number;
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
