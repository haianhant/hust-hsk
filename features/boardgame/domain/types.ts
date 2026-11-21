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
  BoardGameReactionPolicy,
  BoardGameRevealEvent,
  BoardGameRevealRecord,
  BoardGameRoleId,
  BoardGameRulesetId,
  BoardGameTurnPhase,
  BoardGameWinnerFaction,
  BoardGameZoneClusterId,
} from '../../../shared/contracts/boardgame';
import type { RemoteAppearance } from '../../../shared/contracts/multiplayer';
import type { DamageRedirectionTrace } from './damage-redirection';
import type {
  AllianceGroupRecord,
  DynamicFactionChangeRecord,
} from './dynamic-allegiance';
import type { CopiedSkillBinding } from './dynamic-skill-copy';
import type { EquipmentTransferTransaction } from './equipment-transactions';
import type { PendingDeclaredAttack } from './global-attack-interrupt';
import type { PlayerLifecycleRecord } from './pending-resurrection';
import type {
  AuthoritativeRevealTriggerReason,
  AuthoritativeRoleRevealRecord,
} from './reveal-events';
import type { TurnControlGrant } from './turn-ownership';

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

/** Phân loại nguồn hồi máu chuẩn cho CAP-04 HealPipeline (mở rộng). */
export type HealSourceKind =
  | 'skill'
  | 'white-card'
  | 'black-card'
  | 'location'
  | 'investigation';

export interface HealExecutionResult {
  attempted: number;
  actual: number;
  blockedBy:
    | 'none'
    | 'dalton-self-heal'
    | 'usurper-aura'
    | 'usurper-reveal'
    | 'target-dead'
    | 'duplicate-event';
  pendingChoiceOpened?: boolean;
}

export interface AngelAuraEntry {
  phase: 'armed' | 'active' | 'expired';
  armedOnTurnNumber: number;
  activatedOnTurnNumber?: number;
}

export interface DaltonActivationEntry {
  activatedOnTurnNumber: number;
  damageEventId: string;
}

export interface AnathemaCurseEntry {
  targetPlayerId: string;
  activatedOnTurnNumber: number;
  active: boolean;
  endTurnSelfDamageApplied: boolean;
}

export interface BethanyChosenEntry {
  chosenPlayerId: string;
  designatedOnTurnNumber: number;
  boundEventId: string;
  boundAtMs: number;
  txId: string;
}

export interface CopiedGoalBindingEntry {
  targetPlayerId: string;
  sourceRoleId: string;
  boundEventId: string;
  boundAtMs: number;
  boundTurnNumber: number;
}

export interface ClairvoyantVisionEntry {
  targetPlayerId: string;
  targetDisplayName: string;
  sourceRoleId: string;
  roleName: string;
  faction: BoardGameFactionId;
  maxHp: number;
  copiedGoalSummary: string;
  boundEventId: string;
  boundAtMs: number;
  boundTurnNumber: number;
}

export interface AprilSkippsCountdownEntry {
  revealedBySkill: boolean;
  triggeredOnTurnNumber: number;
  triggeredDuringOwnTurn: boolean;
  ownTurnsCompletedAfterTrigger: number;
  survivedDeadlineWon: boolean;
}

export interface DianaContractEntry {
  customerPlayerId: string;
  sourceRoleId: string;
  boundOnTurnNumber: number;
  boundEventId: string;
  boundAtMs: number;
  status: 'pending' | 'active' | 'cancelled';
  activatedOnTurnNumber?: number;
}

export interface AaronSpouseEntry {
  spousePlayerId: string;
  sourceRoleId: string;
  boundEventId: string;
  boundAtMs: number;
  boundTurnNumber: number;
}

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
      /** CAP-06 attribution & bounded redirection ancestry (Phase 6A). */
      originalAttackerPlayerId?: string | null;
      originalTargetPlayerId?: string;
      redirectChain?: string[];
      redirectDepth?: number;
      anathemaRedirected?: boolean;
      arnoldChecked?: boolean;
      arnoldReflected?: boolean;
      isArnoldReflection?: boolean;
      preAttackTargetHp?: number;
      preAttackTargetRevealed?: boolean;
      isFujikoExecution?: boolean;
      isTalismanWardable?: boolean;
      isHpCost?: boolean;
      unpreventable?: boolean;
      isRetaliation?: boolean;
      isSingleTarget?: boolean;
      isConsumableBlackCardDamage?: boolean;
      isBonusAttack?: boolean;
      isRetaliatoryAttack?: boolean;
      biancaChecked?: boolean;
      biancaPrevented?: boolean;
      postMitigationDmg?: number;
      urbanLegendChecked?: boolean;
      urbanLegendConverted?: boolean;
      undyingChecked?: boolean;
      undyingReduced?: boolean;
      preUndyingDmg?: number;
      chainDepth?: number;
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
      kind: 'HEAL';
      healEventId: string;
      causationId?: string;
      sourceCardId?: string;
      actorPlayerId: string | null;
      targetPlayerId: string;
      rawAmount: number;
      sourceKind: HealSourceKind;
      sourceLabel?: string;
      roleStatId?: string;
      usurperChecked?: boolean;
      usurperBlocked?: boolean;
      chainDepth?: number;
      postLogKind?: BoardGamePublicLogEntry['kind'];
      postLogPrefix?: string;
      postLogSuffix?: string;
      postLogActorId?: string | null;
      zeroLogText?: string;
      blockedLogText?: string;
    }
  | {
      kind: 'ROLE_REVEALED_TRIGGERS';
      revealEventId: string;
      revealedPlayerId: string;
      revealCause: 'voluntary' | 'forced-card' | 'reaction' | 'skill-forced';
      revealTriggerReason?: AuthoritativeRevealTriggerReason;
      sourceActorId?: string | null;
      wasAliveBeforeReveal?: boolean;
      isDeathReveal?: boolean;
      isFinalMatchDisclosure?: boolean;
      umibozuChecked?: boolean;
      cassieChecked?: boolean;
      dianaChecked?: boolean;
      aaronChecked?: boolean;
      chainDepth?: number;
    }
  | {
      kind: 'GIDEON_DRAW_WHITE_CARD';
      gideonPlayerId: string;
      eliminationEventId: string;
      remainingDraws: number;
      drawIndex: number;
      chainDepth?: number;
    }
  | {
      kind: 'COLT_THEFT_COUNTER';
      coltPlayerId: string;
      thiefPlayerId: string;
      txId: string;
      stolenCardId: string;
      stolenCardTitle: string;
      chainDepth?: number;
    }
  | {
      kind: 'GWENDOLEN_COUNTER';
      counterEventId: string;
      gwendolenPlayerId: string;
      attackerPlayerId: string;
      protectedVictimIds: string[];
      chainDepth?: number;
    }
  | {
      kind: 'FREYJA_EXTRA_ATTACK_CHECK';
      freyjaPlayerId: string;
      usedExtraAttacksCount: number;
      chainDepth?: number;
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
      isBonusAttack?: boolean;
      isRetaliatoryAttack?: boolean;
      gwendolenVictims?: Array<{
        playerId: string;
        location: BoardGameLocationId;
        faction: BoardGameFactionId;
        preRevealed: boolean;
      }>;
      chainDepth?: number;
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
      gideonCheckedIds?: string[];
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
    }
  | {
      kind: 'elise_distribute_heal';
      actorPlayerId: string;
      distributionMap: Record<string, Array<{ playerId: string; amount: number }>>;
    }
  | {
      kind: 'urban_legend_reveal_heal';
      urbanLegendPlayerId: string;
      damageEventId: string;
      sourceCardId: string;
      rawAmount: number;
    }
  | {
      kind: 'gwendolen_counter_attack';
      gwendolenPlayerId: string;
      attackerPlayerId: string;
      protectedVictimIds: string[];
      counterEventId: string;
      chainDepth: number;
    }
  | {
      kind: 'freyja_extra_attack';
      freyjaPlayerId: string;
      usedExtraAttacksCount: number;
      attackMap: Record<string, { discardCardId: string; targetPlayerId: string }>;
      chainDepth: number;
    }
  | {
      kind: 'warlord_pull_attack';
      warlordPlayerId: string;
      targetMap: Record<string, string>;
    }
  | {
      kind: 'usurper_reveal_block_heal';
      usurperPlayerId: string;
      healEventId: string;
      targetPlayerId: string;
      sourceKind: HealSourceKind;
      potentialHeal: number;
    }
  | {
      kind: 'bianca_discard_prevent';
      biancaPlayerId: string;
      damageEventId: string;
      incomingDmg: number;
      sourceType: DamageSourceKind;
      cardMap: Record<string, string>;
    }
  | {
      kind: 'gideon_draw_white';
      gideonPlayerId: string;
      eliminationEventId: string;
      victimPlayerId: string;
      victimDisplayName: string;
    }
  | {
      kind: 'gideon_white_card_target';
      gideonPlayerId: string;
      eliminationEventId: string;
      cardId: string;
      remainingDraws: number;
      drawIndex: number;
      targetMap: Record<string, string>;
    }
  | {
      kind: 'anathema_curse_target';
      anathemaPlayerId: string;
      turnNumber: number;
      targetMap: Record<string, string>;
    }
  | {
      kind: 'bethany_designate_chosen';
      bethanyPlayerId: string;
      turnNumber: number;
      giftMap: Record<string, { targetPlayerId: string; cardId: string }>;
    }
  | {
      kind: 'arnold_reflect_lethal';
      arnoldPlayerId: string;
      damageEventId: string;
      reflectTargetPlayerId: string;
      reflectedAmount: number;
      wasUnrevealed: boolean;
    }
  | {
      kind: 'cassie_turn_heal';
      cassiePlayerId: string;
      turnNumber: number;
      targetMap: Record<string, string>;
    }
  | {
      kind: 'clairvoyant_peek_copy';
      clairvoyantPlayerId: string;
      turnNumber: number;
      targetMap: Record<string, string>;
    }
  | {
      kind: 'colt_theft_counter';
      coltPlayerId: string;
      thiefPlayerId: string;
      txId: string;
      stolenCardId: string;
      stolenCardTitle: string;
      chainDepth: number;
    }
  | {
      kind: 'colt_recover_or_damage';
      coltPlayerId: string;
      thiefPlayerId: string;
      txId: string;
      stolenCardId: string;
      stolenCardTitle: string;
      rolledDamage: number;
      rollDesc: string;
      chainDepth: number;
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
  /** Mốc deadline công khai chuẩn hóa (che sự khác biệt kết nối cho secret choices — Phase 6A). */
  publicDeadlineMs?: number;
  data: PendingChoiceContextData;
}

export interface ExpansionRuntimeStats {
  activationsByRole: Record<string, number>;
  damagePreventedByRole: Record<string, number>;
  damageRedirectedByRole?: Record<string, number>;
  healByRole: Record<string, number>;
  bonusDamageByRole: Record<string, number>;
  healsBlockedByRole?: Record<string, number>;
  equipmentReclaimedByRole?: Record<string, number>;
  clairvoyantInspections?: number;
  copiedVictoryLinksBound?: number;
  victoryCyclesDetected?: number;
  // ---- Phase 7 (Tier-4 Advanced Engine Telemetry) ----
  copiedSkillActivations?: number;
  resurrectionsTriggered?: number;
  hijackedTurnsCount?: number;
  hijackedActionsCount?: number;
  unauthorizedControlAttempts?: number;
  dynamicFactionChangesCount?: number;
  recruitmentsCount?: number;
  multiFactionVictoriesCount?: number;
  lloydInterruptedAttacksCount?: number;
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
  /** Chính sách phản ứng riêng tư theo từng người chơi (CAP-05 — tuyệt đối không xuất công khai). */
  reactionPolicyByPlayer?: Record<string, BoardGameReactionPolicy>;
  /** Hào quang Thiên sứ bảo hộ (Angel — Phase 5C): armed -> active -> expired. */
  angelAuras?: Record<string, AngelAuraEntry>;
  /** Ghi nhận kích hoạt Vòng Đấu Thứ 12 của Dalton (Phase 5C). */
  daltonActivatedByPlayer?: Record<string, DaltonActivationEntry>;
  /** Danh sách playerId Dalton đã hạ gục mục tiêu sau khi kích hoạt Vòng Đấu Thứ 12. */
  daltonKillWinTriggeredIds?: string[];
  /** Danh sách playerId Arlene đã bị một Hunter hạ gục. */
  arleneHunterKillTriggeredIds?: string[];
  /** Danh sách playerId Umibozu đã kích hoạt AoE lộ diện 1 lần/trận. */
  umibozuTriggeredIds?: string[];
  // ---- Phase 6 (Tier-3 Completion & Advanced Victory Mechanics) ----
  anathemaCurses?: Record<string, AnathemaCurseEntry>;
  bethanyChosenByPlayer?: Record<string, BethanyChosenEntry>;
  cassieCopiedGoalByPlayer?: Record<string, CopiedGoalBindingEntry>;
  clairvoyantVisions?: Record<string, ClairvoyantVisionEntry>;
  aprilSkippsCountdownByPlayer?: Record<string, AprilSkippsCountdownEntry>;
  dianaContracts?: Record<string, DianaContractEntry>;
  aaronSpouseByPlayer?: Record<string, AaronSpouseEntry>;
  revealSeq?: number;
  revealHistory?: AuthoritativeRoleRevealRecord[];
  equipmentTransactions?: EquipmentTransferTransaction[];
  damageTraces?: DamageRedirectionTrace[];
  anathemaPromptedTurnNumber?: number;
  bethanyPromptedTurnNumber?: number;
  cassiePromptedTurnNumber?: number;
  clairvoyantPromptedTurnNumber?: number;
  // ---- Phase 7 (Tier-4 Advanced Engine Foundations) ----
  /** TurnOwnershipOverride (Voodoo): grant điều khiển lượt đang hoạt động, hàng đợi chờ & sổ chống phát lại. */
  activeTurnControl?: TurnControlGrant | null;
  pendingTurnControlGrants?: TurnControlGrant[];
  expiredControlGrantIds?: string[];
  voodooPromptedTurnNumber?: number;
  /** PendingResurrection (Undead): trạng thái vòng đời từng người chơi. */
  lifecycleByPlayer?: Record<string, PlayerLifecycleRecord>;
  /** DynamicSkillCopy (Vengeful Spirit / Antimony / N.C. Soldier alliance): gắn kết kỹ năng hiệu lực. */
  copiedSkillsByPlayer?: Record<string, CopiedSkillBinding>;
  /** Antimony `COPY_GOAL` binding đi qua CopiedVictoryGraph. */
  antimonyCopiedGoalByPlayer?: Record<string, CopiedGoalBindingEntry>;
  /** DynamicAllegiance (Bonnie): phe hiệu lực động tách biệt khỏi `baseFaction` bất biến. */
  effectiveFactionByPlayer?: Record<string, DynamicFactionChangeRecord>;
  /** Alliance Groups (N.C. Soldier): liên minh Neutral độc lập với `effectiveFaction`. */
  alliances?: Record<string, AllianceGroupRecord>;
  /** Danh sách playerId Neutral được chia lúc khởi tạo trận (dùng cho điều kiện chiêu mộ đủ của N.C. Soldier). */
  originallyDealtNeutralIds?: string[];
  /** MultiFactionVictory (Cain): danh sách playerId đã kích hoạt điều kiện thắng song phe khi chính họ chết. */
  cainDeathVictoryModifierIds?: string[];
  /** Ghi nhận các phe bị từng playerId trực tiếp kết liễu (dùng cho điều kiện thắng 5P của Cain). */
  killedFactionsByPlayer?: Record<string, BoardGameFactionId[]>;
  /** GlobalAttackInterrupt (Lloyd): đòn tấn công đang chờ cửa sổ ngắt trước khi đổ xúc xắc. */
  pendingDeclaredAttack?: PendingDeclaredAttack | null;
  competitiveReactionTiming?: boolean;
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
  winnerFaction: BoardGameWinnerFaction | null;
  /** Phase 7A: Danh sách các phe đồng thắng khi kích hoạt MultiFactionVictory (bỏ qua ở Classic). */
  winningFactions?: BoardGameFactionId[];
  winnerLabel: string | null;
  winnerPlayerIds: string[];
  winReason: string | null;
  finalReveal: BoardGameRevealRecord[] | null;
}

export interface VictoryEvaluation {
  finished: boolean;
  winnerFaction: BoardGameWinnerFaction | null;
  /** Phase 7A: Danh sách các phe đồng thắng (hỗ trợ đồng thắng Hunter + Shadow cho Cain & đòn đồng quy). */
  winningFactions?: BoardGameFactionId[];
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
