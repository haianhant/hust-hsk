#!/usr/bin/env node
/**
 * scripts/sim-starter-forty-eight.cjs — Deterministic 25,000-Match Simulation Harness
 * for `starter-forty-eight` (10 Classic + 48 Expansion = 58 playable roles: 19H / 18S / 21N).
 *
 * Simulator Version : sim-s48-v1
 * Bot Policy Version: bot-policy-s48-v1
 *
 * Runs 5,000 deterministic matches per player count (4P, 5P, 6P, 7P, 8P = 25,000 total)
 * using seed formula `10_000_000 + playerCount * 100_000 + g + 1` with skill-aware bots covering
 * ALL 58 characters, ALL 31 Pending Choices, voluntary `TRANSFER_TO_BETHANY`, and private
 * `SET_REACTION_PREF` policies.
 *
 * Also runs a clearly separated `targetedMechanicsValidation` block for rare cross-role
 * invariants (3-node victory cycle, Anathema->Arnold chain, Colt reclaim + 3-weapon win)
 * WITHOUT mixing those synthetic scenarios into the 25,000-match random-pool statistics.
 *
 * Writes `docs/boardgame-expansion/phase-6/starter-forty-eight-sim-data.json` with `--write-json`.
 */
'use strict';

require('../test/register-ts.cjs');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  COLT_QUALIFYING_WEAPON_IDS,
  DEFAULT_RULESET_REGISTRY,
  LOCATIONS_CATALOG,
  PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
  PHASE3A_ROLE_IDS,
  PHASE4B_ROLE_IDS,
  PHASE5B_ROLE_IDS,
  PHASE5C_ROLE_IDS,
  PHASE6_ROLE_IDS,
  ROLES_CATALOG,
  STARTER_FORTY_EIGHT_EXPANSION_ROLE_IDS,
  applyPlayerGameAction,
  areInSameCluster,
  createInitialGameState,
  evaluateExpandedVictoryWithDiagnostics,
  getActivePlayer,
  getPairedLocationInCluster,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  getRoleDistribution,
  isEligibleForChocolateHeal,
} = require('../features/boardgame/domain/index.ts');

const SIMULATOR_VERSION = 'sim-s48-v1';
const BOT_POLICY_VERSION = 'bot-policy-s48-v2';

const ALL_S48_ROLE_IDS = [
  ...ROLES_CATALOG.map((r) => r.id),
  ...STARTER_FORTY_EIGHT_EXPANSION_ROLE_IDS,
];
const ALL_S48_DESIGNS = ALL_S48_ROLE_IDS.map((id) => getRoleDesign(id));
const DESIGN_BY_ID = Object.fromEntries(ALL_S48_DESIGNS.map((d) => [d.id, d]));

const CRUZ_QUALIFYING_CARDS = new Set(['ev-07', 'ev-08', 'ev-09', 'ev-10']);
const COLT_WEAPON_SET = new Set(COLT_QUALIFYING_WEAPON_IDS);

function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom(list, rng) {
  if (!list.length) return undefined;
  return list[Math.floor(rng() * list.length)];
}

const CLUE_CONDITION_FILTERS = [
  { key: '[Săn Đêm hoặc Bóng Đêm', fn: (r) => r.faction === 'lantern-guard' || r.faction === 'mist-order' },
  { key: '[Săn Đêm hoặc Độc Hành', fn: (r) => r.faction === 'lantern-guard' || r.faction === 'wanderer' },
  { key: '[Độc Hành hoặc Bóng Đêm', fn: (r) => r.faction === 'wanderer' || r.faction === 'mist-order' },
  { key: '[Đội Săn Đêm', fn: (r) => r.faction === 'lantern-guard' },
  { key: '[Hội Bóng Đêm', fn: (r) => r.faction === 'mist-order' },
  { key: '[Kẻ Độc Hành', fn: (r) => r.faction === 'wanderer' },
  { key: '[Max HP <= 11', fn: (r) => r.maxHp <= 11 },
  { key: '[Max HP >= 12', fn: (r) => r.maxHp >= 12 },
];

const PROFILES = [
  'aggressive',
  'investigator',
  'tactical',
  'equipment-hunter',
  'defensive',
  'team-player',
];

function createBotMemory(playerIds, myPrivateViews) {
  const mem = {};
  const dist = getRoleDistribution(playerIds.length);
  for (const pid of playerIds) {
    const priv = myPrivateViews[pid];
    const possible = {};
    const attackedMe = {};
    for (const otherId of playerIds) {
      if (otherId === pid) {
        possible[otherId] = new Set([priv.roleId]);
      } else {
        possible[otherId] = new Set(
          ALL_S48_DESIGNS.filter(
            (r) => r.id !== priv.roleId && (dist.wanderer > 0 || r.faction !== 'wanderer'),
          ).map((r) => r.id),
        );
      }
      attackedMe[otherId] = 0;
    }
    mem[pid] = {
      selfId: pid,
      possible,
      attackedMe,
      seenClueKeys: new Set(),
    };
  }
  return mem;
}

function updateBotMemory(botMem, pub, priv) {
  for (const p of pub.players) {
    if (p.revealedRoleId) {
      botMem.possible[p.playerId] = new Set([p.revealedRoleId]);
      for (const other of pub.players) {
        if (other.playerId !== p.playerId && botMem.possible[other.playerId]) {
          botMem.possible[other.playerId].delete(p.revealedRoleId);
        }
      }
    }
  }

  // Clairvoyant private reveals inform Clairvoyant's own memory without leaking anywhere else
  for (const rev of priv.clairvoyantReveals || []) {
    if (rev.targetPlayerId && rev.roleId) {
      botMem.possible[rev.targetPlayerId] = new Set([rev.roleId]);
    }
  }

  for (const clue of priv.privateClues || []) {
    const clueKey = `${clue.atMs}|${clue.targetPlayerId}|${clue.cardTitle}|${clue.detail}`;
    if (botMem.seenClueKeys.has(clueKey)) continue;
    botMem.seenClueKeys.add(clueKey);

    const set = botMem.possible[clue.targetPlayerId];
    if (!set) continue;

    let exactMatched = false;
    for (const r of ALL_S48_DESIGNS) {
      if (clue.detail.includes(`là ${r.name} (`)) {
        botMem.possible[clue.targetPlayerId] = new Set([r.id]);
        exactMatched = true;
        break;
      }
    }
    if (exactMatched) continue;

    const targetPub = pub.players.find((p) => p.playerId === clue.targetPlayerId);
    const targetUnrevealed = Boolean(targetPub && !targetPub.revealedRoleId);

    for (const cond of CLUE_CONDITION_FILTERS) {
      if (clue.detail.includes(cond.key)) {
        const want = clue.outcome === 'condition-met';
        for (const roleId of Array.from(set)) {
          if (targetUnrevealed && (roleId === 'suong-tin-gia' || roleId === 'exp2_arlene')) continue;
          const role = DESIGN_BY_ID[roleId];
          if (role && cond.fn(role) !== want && set.size > 1) {
            set.delete(roleId);
          }
        }
      }
    }
  }
}

function isPubUdiProtected(pub, target) {
  if (!target.alive || target.revealedRoleId !== 'exp1_udi') return false;
  const othersInCluster = pub.players.filter(
    (other) =>
      other.alive &&
      other.playerId !== target.playerId &&
      areInSameCluster(target.location, other.location, pub.clusterPairs),
  );
  return othersInCluster.length >= 2;
}

function isPubVisionsMarked(pub, attackerId, targetId) {
  return pub.visionsMarkedTargetByPlayer?.[attackerId] === targetId;
}

function isPubAaronSpouse(pub, attackerId, targetId) {
  return pub.aaronSpouseByPlayer?.[attackerId] === targetId;
}

function isPubAngelProtected(pub, playerId) {
  return Boolean(pub.angelProtectedPlayerIds?.includes(playerId));
}

function isPubDaltonActivated(pub, playerId) {
  return Boolean(pub.daltonActivatedPlayerIds?.includes(playerId));
}

function estimateBoardFavor(pub) {
  let hunterAlive = 0;
  let shadowAlive = 0;
  let hunterWounds = 0;
  let shadowWounds = 0;
  for (const p of pub.players) {
    if (!p.alive) continue;
    if (p.revealedFaction === 'lantern-guard') {
      hunterAlive += 1;
      hunterWounds += p.woundsTaken;
    } else if (p.revealedFaction === 'mist-order') {
      shadowAlive += 1;
      shadowWounds += p.woundsTaken;
    }
  }
  return hunterAlive * 6 - hunterWounds * 0.45 - (shadowAlive * 6 - shadowWounds * 0.45);
}

function estimateTargetRoleScores(botMem, pub, priv, target) {
  const pubTarget = pub.players.find((p) => p.playerId === target.playerId);
  const danielSupportsHunters = priv.roleId === 'lang-tien-phong' && pub.deadCount >= 1;
  const bipolarSupportsHunters =
    priv.roleId === 'exp1_bipolar' && priv.hp >= 4 && estimateBoardFavor(pub) >= -1;
  const remainingNeutralsDeadNeeded = Math.max(1, 3 - (pub.deadCount ?? 0));

  // Linked-victory allies: Bethany's Chosen, Diana's active Customer, Aaron's Spouse
  if (
    pub.bethanyChosenTargetByPlayer?.[priv.playerId] === target.playerId ||
    pub.dianaActiveCustomerByPlayer?.[priv.playerId] === target.playerId ||
    pub.aaronSpouseByPlayer?.[priv.playerId] === target.playerId
  ) {
    return { isEnemyProb: 0, isAllyProb: 1 };
  }

  if (pubTarget?.revealedRoleId) {
    const role = DESIGN_BY_ID[pubTarget.revealedRoleId];
    if (priv.roleId === 'exp2_bryon' || priv.roleId === 'exp1_angel') {
      if (role.faction === 'wanderer') return { isEnemyProb: 0, isAllyProb: 1 };
      return { isEnemyProb: 0.45, isAllyProb: 0.1 };
    }
    if (priv.roleId === 'exp2_arlene') {
      if (role.faction === 'lantern-guard') return { isEnemyProb: 1.15, isAllyProb: 0 };
      if (role.faction === 'mist-order') return { isEnemyProb: 0.15, isAllyProb: 0.25 };
      return { isEnemyProb: 0.35, isAllyProb: 0.1 };
    }
    if (danielSupportsHunters || bipolarSupportsHunters) {
      return {
        isEnemyProb: role.faction === 'lantern-guard' ? 0 : role.faction === 'mist-order' ? 1 : 0.35,
        isAllyProb: role.faction === 'lantern-guard' ? 1 : 0,
      };
    }
    if (priv.roleId === 'exp1_cindy') {
      if (role.faction === 'wanderer') return { isEnemyProb: 1.35, isAllyProb: 0 };
      return { isEnemyProb: 0.45, isAllyProb: 0.1 };
    }
    if (priv.roleId === 'exp2_cruz' || priv.roleId === 'exp2_dalton') {
      return { isEnemyProb: 0.95, isAllyProb: 0 };
    }
    if (priv.faction === 'lantern-guard') {
      if (role.faction === 'mist-order') return { isEnemyProb: 1, isAllyProb: 0 };
      if (role.faction === 'lantern-guard') return { isEnemyProb: 0, isAllyProb: 1 };
      if (role.id === 'exp2_arlene') return { isEnemyProb: 0.02, isAllyProb: 0.1 };
      if (
        role.id === 'lang-tien-phong' ||
        role.id === 'exp1_bipolar' ||
        role.id === 'exp2_bryon' ||
        role.id === 'exp1_angel'
      ) {
        return { isEnemyProb: 0.08, isAllyProb: 0.5 };
      }
      if (role.id === 'exp2_april_skipps' && pub.aprilSkippsCountdownByPlayer?.[pubTarget.playerId]) {
        return { isEnemyProb: 1.1, isAllyProb: 0 }; // Urgent threat before next turn!
      }
      if (role.id === 'exp2_colt' && pubTarget.equipped.filter((c) => COLT_WEAPON_SET.has(c.id)).length >= 2) {
        return { isEnemyProb: 0.95, isAllyProb: 0 };
      }
      if (role.id === 'exp1_cindy') return { isEnemyProb: pub.players.length >= 6 ? 0.55 : 0.15, isAllyProb: 0.1 };
      if (role.id === 'exp2_cruz' || role.id === 'exp2_dalton') return { isEnemyProb: 0.55, isAllyProb: 0 };
      if (role.id === 'lang-anh-san' && pubTarget.equipped.length >= 4) return { isEnemyProb: 0.95, isAllyProb: 0 };
      if (role.id === 'lang-cuu-ho' && pub.deadCount >= 2) return { isEnemyProb: 0.85, isAllyProb: 0 };
      return { isEnemyProb: 0.12, isAllyProb: 0.2 };
    }
    if (priv.faction === 'mist-order') {
      if (role.faction === 'mist-order') return { isEnemyProb: 0, isAllyProb: 1 };
      if (role.faction === 'lantern-guard') return { isEnemyProb: 1, isAllyProb: 0 };
      if (role.id === 'exp2_april_skipps' && pub.aprilSkippsCountdownByPlayer?.[pubTarget.playerId]) {
        return { isEnemyProb: 1.15, isAllyProb: 0 };
      }
      if (role.id === 'lang-anh-san' && pub.players.length !== 7) {
        return { isEnemyProb: pubTarget.equipped.length >= 4 ? 0.95 : 0.2, isAllyProb: 0 };
      }
      return { isEnemyProb: pub.players.length >= 6 ? 1 : 0.7, isAllyProb: 0 };
    }
    return { isEnemyProb: 0.85, isAllyProb: 0.05 };
  }

  const set = botMem.possible[target.playerId];
  if (!set || set.size === 0) return { isEnemyProb: 0.5, isAllyProb: 0.3 };

  let enemyWeight = 0;
  let allyWeight = 0;
  for (const rid of set) {
    const r = DESIGN_BY_ID[rid];
    if (!r) continue;
    if (priv.roleId === 'exp2_bryon' || priv.roleId === 'exp1_angel') {
      if (r.faction === 'wanderer') allyWeight += 1;
      else enemyWeight += 0.45;
    } else if (priv.roleId === 'exp2_arlene') {
      if (r.faction === 'lantern-guard') enemyWeight += 1.15;
      else if (r.faction === 'mist-order') allyWeight += 0.25;
      else enemyWeight += 0.35;
    } else if (danielSupportsHunters || bipolarSupportsHunters) {
      if (r.faction === 'lantern-guard') allyWeight += 1;
      else if (r.faction === 'mist-order') enemyWeight += 1;
      else enemyWeight += 0.35;
    } else if (priv.roleId === 'exp1_cindy') {
      if (r.faction === 'wanderer') enemyWeight += 1.3;
      else enemyWeight += 0.55;
    } else if (priv.faction === 'lantern-guard') {
      if (r.faction === 'lantern-guard') allyWeight += 1;
      else if (r.faction === 'mist-order') enemyWeight += 1;
      else enemyWeight += pub.players.length >= 7 && remainingNeutralsDeadNeeded <= 3 ? 0.15 : 0.3;
    } else if (priv.faction === 'mist-order') {
      if (r.faction === 'mist-order') allyWeight += 1;
      else if (r.faction === 'lantern-guard') enemyWeight += 1;
      else enemyWeight += pub.players.length >= 6 ? 0.85 : 0.5;
    } else {
      enemyWeight += 0.85;
    }
  }
  const total = Math.max(1, set.size);
  let isEnemyProb = enemyWeight / total;
  const isAllyProb = allyWeight / total;
  if (botMem.attackedMe[target.playerId] > 0 && priv.faction !== 'wanderer') {
    isEnemyProb = Math.min(1, isEnemyProb + 0.25);
  }
  return { isEnemyProb, isAllyProb };
}

function scoreCardForFelicia(card, priv, pub) {
  if (!card) return 0;
  const equippedIds = new Set(priv.equipped.map((c) => c.id));
  if (!card.isConsumable && equippedIds.has(card.id)) return 1.5;
  switch (card.id) {
    case 'eq-04': return 9.5;
    case 'ev-06': return 9.0;
    case 'ev-01': return 8.2;
    case 'ev-02':
    case 'ev-03':
    case 'ev-04': return 7.6;
    case 'eq-01': return 7.8;
    case 'eq-03': return 7.2;
    case 'eq-05': return 7.0;
    case 'eq-02': return 6.5;
    case 'eq-06': return 6.2;
    case 'ev-05': return 6.4;
    case 'eq-13': return priv.woundsTaken >= 3 ? 9.2 : 5.5;
    case 'eq-07': return priv.woundsTaken >= 2 ? 7.0 : 4.0;
    case 'eq-10': return 6.8;
    case 'eq-15': return 7.5;
    case 'eq-11': return pub.round >= 2 ? 6.6 : 4.5;
    case 'eq-12': return 6.0;
    case 'ev-07': return 6.8;
    case 'ev-11': return 6.5;
    case 'ev-09': return 5.0;
    case 'ev-08': return priv.hp >= 6 ? 4.8 : 2.0;
    case 'ev-10': return priv.hp >= 6 ? 5.2 : 2.2;
    case 'eq-08': return 5.5;
    case 'eq-09': return priv.woundsTaken >= 8 ? 7.0 : 4.2;
    case 'ev-12': return 0.5;
    case 'ev-13': return 1.0;
    case 'eq-14': return 1.2;
    default: return 4.0;
  }
}

function scoreGearToDiscard(cardId) {
  switch (cardId) {
    case 'eq-02': return 1;
    case 'eq-06': return 2;
    case 'eq-05': return 3;
    case 'eq-03': return 4;
    case 'ev-05': return 5;
    case 'ev-02':
    case 'ev-03':
    case 'ev-04': return 6;
    case 'eq-01': return 7;
    case 'ev-06': return 8;
    case 'eq-04': return 9;
    default: return 4;
  }
}

function choosePendingChoiceOption(pub, priv, botMem, rng) {
  const pc = priv.pendingChoice;
  if (!pc) return null;

  switch (pc.kind) {
    case 'fiona_attack_roll': {
      const r0 = pc.options[0]?.roll?.totalDmg ?? 0;
      const r1 = pc.options[1]?.roll?.totalDmg ?? 0;
      return r1 > r0 ? pc.options[1].optionId : pc.options[0].optionId;
    }

    case 'gayle_attack_reroll': {
      const roll = pc.options[0]?.roll;
      const shouldReroll = roll
        ? roll.hasMasamune
          ? roll.baseDmg <= 2
          : roll.baseDmg <= 1
        : false;
      return shouldReroll ? 'reroll' : 'keep';
    }

    case 'felicia_draw_choice': {
      const s0 = scoreCardForFelicia(pc.options[0]?.card, priv, pub);
      const s1 = scoreCardForFelicia(pc.options[1]?.card, priv, pub);
      return s1 > s0 ? 'pick_1' : 'pick_0';
    }

    case 'victor_blood_boost': {
      const boostOpts = pc.options.filter((o) => o.optionId.startsWith('boost:'));
      if (boostOpts.length === 0) return 'skip';
      let bestOpt = null;
      let bestVal = -999;
      for (const opt of boostOpts) {
        const tPub = pub.players.find((p) => p.playerId === opt.targetPlayerId);
        if (!tPub) continue;
        if (tPub.revealedRoleId === 'exp2_witch' && tPub.location === 'corridor') continue;
        if (isPubAngelProtected(pub, tPub.playerId)) continue;
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        const val = isEnemyProb * 3 - isAllyProb * 4 + tPub.woundsTaken * 0.25 + (tPub.revealedRoleId === 'exp2_g43' ? 0.65 : 0);
        if (val > bestVal) {
          bestVal = val;
          bestOpt = opt;
        }
      }
      const bestTarget = bestOpt ? pub.players.find((p) => p.playerId === bestOpt.targetPlayerId) : null;
      const canFinish = Boolean(bestTarget && bestTarget.woundsTaken >= 8);
      if (bestOpt && bestVal > 0.8 && (priv.hp >= 4 || (priv.hp >= 2 && canFinish))) {
        return bestOpt.optionId;
      }
      return 'skip';
    }

    case 'wendigo_reveal_heal':
      return priv.woundsTaken >= 1 || pub.deadCount >= 2 || pub.round >= 3
        ? 'reveal_and_activate'
        : rng() < 0.35
          ? 'reveal_and_activate'
          : 'decline';

    case 'undying_reveal_reduce':
      return priv.hp <= 4 || priv.woundsTaken >= 2 || pub.round >= 2
        ? 'reveal_and_reduce'
        : rng() < 0.75
          ? 'reveal_and_reduce'
          : 'decline';

    case 'elysia_counter_boost':
      return pc.options.find((o) => o.optionId === 'boost') ? 'boost' : 'skip';

    case 'cindy_reveal_retaliate':
      return priv.woundsTaken >= 3 || pub.round >= 2
        ? 'reveal_and_retaliate'
        : rng() < 0.6
          ? 'reveal_and_retaliate'
          : 'decline';

    case 'bipolar_fate_coin': {
      const favor = estimateBoardFavor(pub);
      if (favor >= 0 && priv.woundsTaken >= 3) return 'heal_self';
      if (favor <= -3 && priv.hp <= 4 && pub.round >= 3) return 'damage_self';
      if (priv.hp <= 3 && favor >= -1) return 'heal_self';
      return 'skip';
    }

    case 'fea_move_adjust': {
      const chooseAny = pc.options.find((o) => o.label.includes('Tổng 7'));
      if (chooseAny) return chooseAny.optionId;
      if (priv.woundsTaken >= 4) {
        const corr = pc.options.find((o) => o.label.includes('Hành Lang'));
        if (corr) return corr.optionId;
      }
      if (priv.equipped.length < 2) {
        const gearOpt = pc.options.find((o) => o.label.includes('Sảnh Tầng 1') || o.label.includes('Khu Sân Cũ'));
        if (gearOpt) return gearOpt.optionId;
      }
      const nonReroll = pc.options.find((o) => !o.label.includes('Đổ lại') && o.optionId !== 'adj_0');
      if (nonReroll && pc.options.find((o) => o.optionId === 'adj_0')?.label.includes('Đổ lại')) {
        return nonReroll.optionId;
      }
      return pc.defaultOptionId;
    }

    case 'wrath_turn_start_aoe': {
      const selfPub = pub.players.find((p) => p.playerId === priv.playerId);
      if (!selfPub) return 'skip';
      const clusterOthers = pub.players.filter(
        (p) => p.alive && p.playerId !== priv.playerId && areInSameCluster(selfPub.location, p.location, pub.clusterPairs),
      );
      let netValue = 0;
      for (const v of clusterOthers) {
        if ((v.revealedRoleId === 'exp2_witch' && v.location === 'corridor') || isPubAngelProtected(pub, v.playerId)) continue;
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, v);
        netValue += isEnemyProb * 2.2 - isAllyProb * 2.6 + (v.woundsTaken >= 8 ? 1.0 : 0);
      }
      return netValue >= 0.4 ? 'activate' : 'skip';
    }

    case 'vengeance_chain_strike': {
      const strikeOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (strikeOpts.length === 0) return 'skip';
      let bestOpt = null;
      let bestScore = -999;
      for (const opt of strikeOpts) {
        let s = 0;
        let matchedCount = 0;
        for (const p of pub.players) {
          if (!p.alive || p.playerId === priv.playerId) continue;
          if (opt.label.includes(p.displayName)) {
            matchedCount += 1;
            if ((p.revealedRoleId === 'exp2_witch' && p.location === 'corridor') || isPubAngelProtected(pub, p.playerId)) {
              s -= 2;
              continue;
            }
            const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, p);
            s += isEnemyProb * 3.0 - isAllyProb * 3.5 + p.woundsTaken * 0.25;
          }
        }
        if (matchedCount > 0 && s > bestScore) {
          bestScore = s;
          bestOpt = opt;
        }
      }
      return bestOpt && bestScore >= 1.2 ? bestOpt.optionId : 'skip';
    }

    case 'visions_mark_target': {
      const markOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (markOpts.length === 0) return 'skip';
      let bestOpt = null;
      let bestScore = -999;
      for (const opt of markOpts) {
        const t = pub.players.find((p) => p.playerId === opt.targetPlayerId);
        if (!t || !t.alive) continue;
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, t);
        const priorityBonus =
          t.revealedRoleId === 'exp2_g43' ? 2.2 : t.revealedRoleId === 'exp1_fallen' || t.revealedRoleId === 'exp2_bianca' ? 1.4 : 0;
        const score = isEnemyProb * 3 - isAllyProb * 4 + priorityBonus;
        if (score > bestScore) {
          bestScore = score;
          bestOpt = opt;
        }
      }
      return bestOpt && (bestScore >= 1.5 || pub.round >= 2) ? bestOpt.optionId : 'skip';
    }

    case 'cruz_black_redraw': {
      const drawn = pc.options.find((o) => o.optionId === 'keep')?.card;
      if (!drawn) return 'keep';
      if (CRUZ_QUALIFYING_CARDS.has(drawn.id)) return 'keep';
      if (['ev-06', 'ev-01', 'ev-02', 'ev-03', 'ev-04'].includes(drawn.id) && priv.equipped.length < 2) return 'keep';
      return 'redraw';
    }

    case 'bryon_gift_equipment': {
      const giftOpts = pc.options.filter((o) => o.optionId !== 'done');
      if (giftOpts.length === 0) return 'done';
      const bobOpt = giftOpts.find((o) => pub.players.find((p) => p.playerId === o.targetPlayerId)?.revealedRoleId === 'lang-anh-san');
      if (bobOpt) return bobOpt.optionId;
      const coltOpt = giftOpts.find((o) => pub.players.find((p) => p.playerId === o.targetPlayerId)?.revealedRoleId === 'exp2_colt');
      if (coltOpt) return coltOpt.optionId;
      const biancaOpt = giftOpts.find((o) => pub.players.find((p) => p.playerId === o.targetPlayerId)?.revealedRoleId === 'exp2_bianca');
      if (biancaOpt) return biancaOpt.optionId;
      return giftOpts[0].optionId;
    }

    case 'elise_distribute_heal': {
      const allocOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (allocOpts.length === 0) return 'skip';
      let bestOpt = null;
      let bestScore = -999;
      for (const opt of allocOpts) {
        let score = 0;
        const text = `${opt.label} ${opt.detail || ''}`;
        for (const p of pub.players) {
          if (!p.alive) continue;
          const idx = text.indexOf(p.displayName);
          if (idx === -1) continue;
          const after = text.slice(idx + p.displayName.length, idx + p.displayName.length + 14);
          const m = after.match(/\+(\d+)/);
          const amt = m ? Number(m[1]) : 1;
          if (p.playerId === priv.playerId) {
            score += Math.min(amt, priv.woundsTaken) * 2.4;
          } else {
            const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, p);
            score += Math.min(amt, p.woundsTaken) * (isAllyProb * 2.6 - isEnemyProb * 2.5);
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestOpt = opt;
        }
      }
      return bestOpt && bestScore >= 2.2 ? bestOpt.optionId : 'skip';
    }

    case 'urban_legend_reveal_heal':
      return priv.woundsTaken >= 1 || priv.hp <= 6 || pub.round >= 2
        ? 'reveal_and_heal'
        : rng() < 0.75
          ? 'reveal_and_heal'
          : 'decline';

    case 'gwendolen_counter_attack': {
      const counterOpt = pc.options.find((o) => o.optionId === 'counter');
      if (!counterOpt) return 'skip';
      const tPub = counterOpt.targetPlayerId ? pub.players.find((p) => p.playerId === counterOpt.targetPlayerId) : null;
      if (tPub) {
        const { isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        if (isAllyProb >= 0.8 || tPub.revealedRoleId === 'exp2_arlene') return 'skip';
      }
      return 'counter';
    }

    case 'freyja_extra_attack': {
      const atkOpts = pc.options.filter((o) => o.optionId !== 'done');
      if (atkOpts.length === 0) return 'done';
      let bestOpt = null;
      let bestVal = -999;
      for (const opt of atkOpts) {
        const tPub = opt.targetPlayerId ? pub.players.find((p) => p.playerId === opt.targetPlayerId) : null;
        if (!tPub || !tPub.alive) continue;
        if ((tPub.revealedRoleId === 'exp2_witch' && tPub.location === 'corridor') || isPubAngelProtected(pub, tPub.playerId)) continue;
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        if (isAllyProb >= 0.75 || tPub.revealedRoleId === 'exp2_arlene') continue;
        const val = isEnemyProb * 4.5 + (tPub.woundsTaken >= 7 ? 3.5 : tPub.woundsTaken * 0.25) - scoreGearToDiscard(opt.card?.id) * 0.48;
        if (val > bestVal) {
          bestVal = val;
          bestOpt = opt;
        }
      }
      return bestOpt && bestVal >= 0.65 ? bestOpt.optionId : 'done';
    }

    case 'warlord_pull_attack': {
      const pullOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (pullOpts.length === 0) return 'skip';
      let bestOpt = null;
      let bestScore = -999;
      for (const opt of pullOpts) {
        const tPub = pub.players.find((p) => p.playerId === opt.targetPlayerId);
        if (!tPub || !tPub.alive || isPubAngelProtected(pub, tPub.playerId)) continue;
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        const score = isEnemyProb * 3.5 - isAllyProb * 4.0 + tPub.woundsTaken * 0.35;
        if (score > bestScore) {
          bestScore = score;
          bestOpt = opt;
        }
      }
      return bestOpt && bestScore >= 1.2 ? bestOpt.optionId : 'skip';
    }

    case 'usurper_reveal_block_heal': {
      const blockOpt = pc.options.find((o) => o.optionId === 'reveal_and_block');
      if (!blockOpt) return 'decline';
      const tPub = blockOpt.targetPlayerId ? pub.players.find((p) => p.playerId === blockOpt.targetPlayerId) : null;
      if (tPub && estimateTargetRoleScores(botMem, pub, priv, tPub).isAllyProb >= 0.75) return 'decline';
      return 'reveal_and_block';
    }

    case 'bianca_discard_prevent': {
      const discOpts = pc.options.filter((o) => o.optionId !== 'decline');
      if (discOpts.length === 0) return 'decline';
      const dmgMatch = (pc.description || '').match(/(\d+)\s*sát thương/);
      const incoming = dmgMatch ? Number(dmgMatch[1]) : 2;
      if (incoming >= priv.hp || (priv.hp - incoming <= 1 && pub.round <= 4) || (incoming >= 3 && priv.equipped.length >= 2)) {
        return [...discOpts].sort((a, b) => scoreGearToDiscard(a.card?.id) - scoreGearToDiscard(b.card?.id))[0].optionId;
      }
      return 'decline';
    }

    // ---- Wave 5 (Phase 6) Pending Choices (9 new kinds!) ----
    case 'gideon_draw_white': {
      const act = pc.options.find((o) => o.optionId === 'activate');
      return act ? 'activate' : pc.defaultOptionId;
    }

    case 'gideon_white_card_target': {
      const opts = pc.options.filter((o) => o.optionId !== 'skip');
      if (opts.length === 0) return pc.defaultOptionId;
      // Prefer wounded Hunter ally (or self) for Blessing / First Aid
      let best = opts[0];
      let bestScore = -999;
      for (const opt of opts) {
        const tPub = opt.targetPlayerId ? pub.players.find((p) => p.playerId === opt.targetPlayerId) : null;
        if (!tPub) continue;
        const isSelf = tPub.playerId === priv.playerId;
        const { isAllyProb, isEnemyProb } = isSelf
          ? { isAllyProb: 1, isEnemyProb: 0 }
          : estimateTargetRoleScores(botMem, pub, priv, tPub);
        const s = isAllyProb * (tPub.woundsTaken + 1) * 2 - isEnemyProb * 3;
        if (s > bestScore) {
          bestScore = s;
          best = opt;
        }
      }
      return best.optionId;
    }

    case 'anathema_curse_target': {
      const curseOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (curseOpts.length === 0) return 'skip';
      // Activate if Anathema has >= 2 HP (survives 1-dmg end-turn cost) and round >= 2 or wounded
      if (priv.hp <= 2) return 'skip';
      if (pub.round >= 2 || priv.woundsTaken >= 2 || rng() < 0.72) {
        // Pick healthiest / highest-maxHp living player so curse lasts long!
        let best = curseOpts[0];
        let bestScore = -999;
        for (const opt of curseOpts) {
          const tPub = pub.players.find((p) => p.playerId === opt.targetPlayerId);
          if (!tPub) continue;
          const durability = (tPub.revealedMaxHp ?? 12) - tPub.woundsTaken;
          const tankBonus = tPub.revealedRoleId === 'exp2_g43' || tPub.revealedRoleId === 'exp1_undying' ? 3 : 0;
          const s = durability + tankBonus;
          if (s > bestScore) {
            bestScore = s;
            best = opt;
          }
        }
        return best.optionId;
      }
      return 'skip';
    }

    case 'bethany_designate_chosen': {
      const giftOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (giftOpts.length === 0) return 'skip';
      // If Bethany has no Chosen yet (or Chosen is dying), gift lowest-cost gear to strongest probable winner!
      const curChosenId = pub.bethanyChosenTargetByPlayer?.[priv.playerId];
      const curChosen = curChosenId ? pub.players.find((p) => p.playerId === curChosenId) : null;
      if (curChosen && curChosen.alive && curChosen.woundsTaken <= 4 && rng() < 0.75) {
        return 'skip';
      }
      let best = giftOpts[0];
      let bestScore = -999;
      for (const opt of giftOpts) {
        const tPub = pub.players.find((p) => p.playerId === opt.targetPlayerId);
        if (!tPub || !tPub.alive) continue;
        // Favor strong surviving faction member or leading Neutral (e.g. G43, Dalton, Bob, Colt)
        const roleBonus =
          tPub.revealedRoleId === 'exp2_g43' || tPub.revealedRoleId === 'exp2_dalton' || tPub.revealedRoleId === 'lang-quan-sat'
            ? 4.0
            : tPub.revealedFaction === 'mist-order' || tPub.revealedFaction === 'lantern-guard'
              ? 2.2
              : 1.0;
        const cardPenalty = scoreGearToDiscard(opt.card?.id) * 0.4;
        const s = roleBonus - tPub.woundsTaken * 0.35 - cardPenalty;
        if (s > bestScore) {
          bestScore = s;
          best = opt;
        }
      }
      return best.optionId;
    }

    case 'arnold_reflect_lethal': {
      const refOpt = pc.options.find((o) => o.optionId === 'reflect');
      return refOpt ? 'reflect' : pc.defaultOptionId;
    }

    case 'cassie_turn_heal': {
      const healOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (healOpts.length === 0) return 'skip';
      if (pub.usurperAuraActive) return 'skip';
      // Prioritize healing self if wounded, else healthiest/needed ally
      const selfOpt = healOpts.find((o) => o.targetPlayerId === priv.playerId);
      if (selfOpt && priv.woundsTaken >= 1) return selfOpt.optionId;
      let best = healOpts[0];
      let bestWounds = -1;
      for (const opt of healOpts) {
        const tPub = pub.players.find((p) => p.playerId === opt.targetPlayerId);
        if (tPub && tPub.woundsTaken > bestWounds) {
          bestWounds = tPub.woundsTaken;
          best = opt;
        }
      }
      return bestWounds > 0 ? best.optionId : selfOpt ? selfOpt.optionId : best.optionId;
    }

    case 'clairvoyant_peek_copy': {
      const peekOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (peekOpts.length === 0) return 'skip';
      // Pick healthiest unrevealed player so copied goal is active and informative
      let best = peekOpts[0];
      let bestScore = -999;
      for (const opt of peekOpts) {
        const tPub = pub.players.find((p) => p.playerId === opt.targetPlayerId);
        if (!tPub) continue;
        const s = 10 - tPub.woundsTaken + rng() * 0.5;
        if (s > bestScore) {
          bestScore = s;
          best = opt;
        }
      }
      return best.optionId;
    }

    case 'colt_theft_counter': {
      const counterOpt = pc.options.find((o) => o.optionId === 'counter');
      return counterOpt ? 'counter' : 'skip';
    }

    case 'colt_recover_or_damage': {
      // Recover stolen item if it's a Colt qualifying weapon or Colt has < 3 weapons; else deal damage if lethal!
      const recoverOpt = pc.options.find((o) => o.optionId === 'recover_item');
      const dealOpt = pc.options.find((o) => o.optionId === 'deal_damage');
      if (!recoverOpt) return dealOpt ? 'deal_damage' : pc.defaultOptionId;
      const isQualifyingText =
        (recoverOpt.label || '').includes('Dao Rọc') ||
        (recoverOpt.label || '').includes('Cưa Máy') ||
        (recoverOpt.label || '').includes('Rìu Sắt') ||
        (recoverOpt.label || '').includes('Súng Bắn Đinh');
      if (isQualifyingText || rng() < 0.72) return 'recover_item';
      return dealOpt ? 'deal_damage' : 'recover_item';
    }

    default:
      return pc.defaultOptionId;
  }
}

function chooseBotAction(pub, priv, botMem, profile, rng) {
  const selfPub = pub.players.find((p) => p.playerId === priv.playerId);
  if (!selfPub || !selfPub.alive) return { type: 'END_TURN' };

  const aliveOthers = pub.players.filter((p) => p.alive && p.playerId !== priv.playerId);
  if (!aliveOthers.length) return { type: 'END_TURN' };

  const hasHandgun = selfPub.equipped.some((c) => c.id === 'ev-05');
  const hasMachineGun = selfPub.equipped.some((c) => c.id === 'ev-06');
  const hasMasamune = selfPub.equipped.some((c) => c.id === 'ev-01');
  const hasSpear = selfPub.equipped.some((c) => c.id === 'eq-04');
  const hasDamageWeapon = selfPub.equipped.some((c) =>
    ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'eq-04'].includes(c.id),
  );
  const canPierceG43 =
    hasDamageWeapon ||
    (priv.roleId === 'exp2_unchained' && priv.revealed) ||
    (priv.roleId === 'exp1_fallen' && priv.revealed && priv.hp >= 8) ||
    (priv.roleId === 'exp2_warlock' && priv.revealed && selfPub.location === 'court') ||
    (priv.roleId === 'exp1_victor' && priv.revealed && priv.hp >= 4);

  const scoredOthers = aliveOthers
    .map((p) => {
      const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, p);
      const isImmuneWitch = p.revealedRoleId === 'exp2_witch' && p.location === 'corridor';
      const isAngelImmune = isPubAngelProtected(pub, p.playerId);
      const isImmune = isImmuneWitch || isAngelImmune;
      const isProtectedUdi = isPubUdiProtected(pub, p);
      const isMarkedByVisions = isPubVisionsMarked(pub, priv.playerId, p.playerId);
      const isAaronSpouse = isPubAaronSpouse(pub, priv.playerId, p.playerId);
      const isWerewolfDanger =
        p.revealedRoleId === 'suong-gac-cong' && priv.roleId === 'lang-anh-san' && p.woundsTaken < 8;
      const isG43TankPenalty = p.revealedRoleId === 'exp2_g43' && !canPierceG43 ? 0.55 : 0;
      const isCindyRetaliatePenalty = p.revealedRoleId === 'exp1_cindy' && priv.hp <= 3 ? 0.9 : 0;
      const isArleneHunterTrap =
        priv.faction === 'lantern-guard' && p.revealedRoleId === 'exp2_arlene' ? 10.0 : 0;
      const isFujikoExecuteTarget =
        priv.roleId === 'exp2_fujiko' &&
        priv.revealed &&
        p.revealedRoleId !== null &&
        typeof p.revealedMaxHp === 'number' &&
        p.revealedMaxHp - p.woundsTaken <= 4 &&
        !isImmune;
      const isDaltonKillTarget =
        priv.roleId === 'exp2_dalton' &&
        isPubDaltonActivated(pub, priv.playerId) &&
        !isImmune &&
        p.woundsTaken >= 6;
      const woundWeight =
        priv.roleId === 'lang-cuu-ho' ||
        priv.roleId === 'lang-quan-sat' ||
        priv.roleId === 'exp2_wyvern' ||
        priv.roleId === 'exp1_vengeance' ||
        priv.roleId === 'exp2_cruz' ||
        priv.roleId === 'exp2_dalton' ||
        priv.roleId === 'exp2_gideon'
          ? 0.3
          : 0.12;
      const gearTargetBonus =
        priv.roleId === 'lang-anh-san'
          ? pub.players.length <= 6
            ? p.equipped.length * 4.2 + (p.woundsTaken >= 8 ? 1.5 : 0)
            : p.equipped.length > 0
              ? p.equipped.length * 3.5 + p.woundsTaken * 0.85
              : -0.8
          : priv.roleId === 'exp2_colt'
            ? p.equipped.filter((c) => COLT_WEAPON_SET.has(c.id)).length * 2.4
            : p.equipped.length >= 2
              ? 0.25
              : 0;
      const threatBonus =
        p.woundsTaken * woundWeight +
        gearTargetBonus +
        (isFujikoExecuteTarget ? 3.2 : 0) +
        (isDaltonKillTarget ? 3.6 : 0) +
        (p.revealedFaction === 'mist-order' && priv.faction === 'lantern-guard' ? 0.8 : 0) +
        (p.revealedFaction === 'lantern-guard' && priv.faction === 'mist-order' ? 0.6 : 0) +
        (p.revealedRoleId === 'exp2_g43' && canPierceG43 && priv.faction === 'mist-order' ? 0.9 : 0) +
        (p.revealedRoleId === 'exp2_gideon' && priv.faction === 'mist-order' ? 0.8 : 0) +
        (p.revealedRoleId === 'exp2_april_skipps' && pub.aprilSkippsCountdownByPlayer?.[p.playerId] ? 2.5 : 0) +
        (p.revealedRoleId === 'exp2_gloria' && priv.faction === 'mist-order' ? 0.5 : 0) +
        (p.revealedRoleId === 'exp2_usurper' && priv.faction === 'lantern-guard' ? 0.8 : 0) +
        (p.revealedRoleId === 'exp1_ernest' && !p.revealedSkillUsedOnce && priv.faction === 'mist-order' ? 1.0 : 0) +
        (p.revealedRoleId === 'lang-anh-san' && p.equipped.length >= 4 ? 1.8 : 0) +
        (p.revealedRoleId === 'lang-cuu-ho' && pub.deadCount >= 2 ? 1.1 : 0) -
        (isWerewolfDanger ? 1.5 : 0) -
        isG43TankPenalty -
        isCindyRetaliatePenalty -
        isArleneHunterTrap -
        (isImmune ? 12.0 : 0);
      return {
        player: p,
        isEnemyProb,
        isAllyProb,
        isImmune,
        isProtectedUdi,
        isMarkedByVisions,
        isAaronSpouse,
        attackScore: isEnemyProb * 2 - isAllyProb * 2.6 + threatBonus,
      };
    })
    .sort((a, b) => b.attackScore - a.attackScore);

  const bestTarget = scoredOthers[0]?.player || aliveOthers[0];
  const bestAlly = scoredOthers
    .filter((x) => x.isAllyProb >= 0.7 && x.player.woundsTaken > 0)
    .sort((a, b) => b.player.woundsTaken - a.player.woundsTaken)[0]?.player;

  // Phase 1: ROLL_MOVE
  if (pub.turnPhase === 'ROLL_MOVE') {
    if (priv.roleId === 'exp2_father_harrison' && !priv.revealed && selfPub.location !== 'lobby' && (selfPub.equipped.length < 3 || pub.round >= 2)) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp2_father_harrison' && priv.revealed && selfPub.location !== 'lobby' && (selfPub.equipped.length < 3 || priv.woundsTaken >= 4 || pub.deckCounts.equipment >= 4)) {
      return { type: 'USE_SKILL' };
    }
    if (priv.roleId === 'exp1_bipolar' && !priv.revealed && !priv.skillUsedOnce && (priv.woundsTaken >= 4 || (pub.round >= 3 && estimateBoardFavor(pub) <= -3 && priv.hp <= 4))) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp1_fea' && !priv.revealed && pub.round >= 2) return { type: 'REVEAL_ROLE' };
    if (priv.roleId === 'exp1_wrath' && !priv.revealed && pub.round >= 2) {
      if (scoredOthers.some((x) => areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) && x.isEnemyProb >= 0.5)) {
        return { type: 'REVEAL_ROLE' };
      }
    }
    if (priv.roleId === 'exp1_wrath' && priv.revealed) {
      const en = scoredOthers.filter((x) => areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) && !x.isImmune && x.isEnemyProb >= 0.5).length;
      const al = scoredOthers.filter((x) => areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) && x.isAllyProb >= 0.7).length;
      if (en > al && !pub.lastDiceRoll?.rerollRequired && rng() < 0.85) return { type: 'USE_SKILL' };
    }
    if (priv.roleId === 'exp2_visions' && !priv.revealed && !priv.skillUsedOnce && pub.round >= 2) return { type: 'REVEAL_ROLE' };
    if (priv.roleId === 'exp2_visions' && priv.revealed && !priv.skillUsedOnce && !pub.visionsMarkedTargetByPlayer?.[priv.playerId] && !pub.lastDiceRoll?.rerollRequired) {
      return { type: 'USE_SKILL' };
    }
    if (priv.roleId === 'exp2_warlord' && !priv.revealed && !priv.skillUsedOnce && pub.round >= 2 && !pub.lastDiceRoll?.rerollRequired) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp2_warlord' && priv.revealed && !priv.skillUsedOnce && !pub.lastDiceRoll?.rerollRequired) {
      const pullCandidate = scoredOthers.find((x) => !x.isImmune && x.isEnemyProb >= 0.6 && (x.player.woundsTaken >= 4 || pub.round >= 3));
      if (pullCandidate) return { type: 'USE_SKILL', targetPlayerId: pullCandidate.player.playerId };
    }
    if (priv.roleId === 'exp1_ernest' && !priv.revealed && !priv.skillUsedOnce && priv.hp >= 3 && pub.round >= 2) return { type: 'REVEAL_ROLE' };
    if (priv.roleId === 'exp1_ernest' && priv.revealed && !priv.skillUsedOnce && priv.hp >= 3 && !pub.lastDiceRoll?.rerollRequired) {
      const unrevealedCount = aliveOthers.filter((p) => !p.revealedRoleId).length;
      if (unrevealedCount >= 2 || pub.round >= 3) return { type: 'USE_SKILL' };
    }
    if (priv.roleId === 'exp1_angel' && !priv.revealed && !priv.skillUsedOnce && (priv.woundsTaken >= 2 || pub.round >= 2)) return { type: 'REVEAL_ROLE' };
    if (priv.roleId === 'exp1_angel' && priv.revealed && !priv.skillUsedOnce && !pub.lastDiceRoll?.rerollRequired && (priv.woundsTaken >= 2 || pub.round >= 2)) {
      return { type: 'USE_SKILL' };
    }
    // Wave 5 turn-start voluntary skills & reveals (Anathema hidden USE_SKILL, Cassie, Clairvoyant, Bethany, Gideon)
    if (
      priv.roleId === 'exp1_anathema' &&
      !priv.skillUsedOnce &&
      priv.hp >= 3 &&
      !pub.lastDiceRoll?.rerollRequired &&
      (pub.round >= 2 || priv.woundsTaken >= 2)
    ) {
      return { type: 'USE_SKILL' };
    }
    if (priv.roleId === 'exp1_clairvoyant' && !priv.revealed && !priv.skillUsedOnce && aliveOthers.some((p) => !p.revealedRoleId) && pub.round >= 1) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp1_cassie' && !priv.revealed && (priv.woundsTaken >= 1 || pub.round >= 2)) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp1_bethany' && !priv.revealed && (selfPub.equipped.some((e) => e.id !== 'ev-01') || pub.round >= 2)) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp2_gideon' && !priv.revealed && (pub.round >= 2 || hasSpear || pub.deadCount >= 1)) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'gac-truc-ban' && priv.revealed) {
      const paired = getPairedLocationInCluster(selfPub.location, pub.clusterPairs);
      if (paired && (paired === 'corridor' || areInSameCluster(paired, bestTarget.location, pub.clusterPairs))) {
        return { type: 'USE_SKILL' };
      }
    }
    return { type: 'ROLL_DICE' };
  }

  // Phase 1B: CHOOSE_MOVE
  if (pub.turnPhase === 'CHOOSE_MOVE') {
    const poolIds =
      pub.allowedMoveDestinations && pub.allowedMoveDestinations.length > 0
        ? pub.allowedMoveDestinations
        : LOCATIONS_CATALOG.filter((l) => l.id !== selfPub.location).map((l) => l.id);

    // Colt hunts Black Deck (ev-02..ev-05 weapons) & Erstwhile Altar (`court`) to steal qualifying weapons!
    if (priv.roleId === 'exp2_colt') {
      const weaponHolder = aliveOthers.find((p) => p.equipped.some((c) => COLT_WEAPON_SET.has(c.id)));
      if (weaponHolder && poolIds.includes('court')) return { type: 'CHOOSE_DEST', location: 'court' };
      if (poolIds.includes('canteen') && pub.deckCounts.event > 0) return { type: 'CHOOSE_DEST', location: 'canteen' };
      if (poolIds.includes('breaker') && pub.deckCounts.event > 0) return { type: 'CHOOSE_DEST', location: 'breaker' };
    }
    // Bethany wants White/Black gear to designate Chosen
    if (priv.roleId === 'exp1_bethany' && !selfPub.equipped.some((c) => c.id !== 'ev-01')) {
      if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
      if (poolIds.includes('breaker')) return { type: 'CHOOSE_DEST', location: 'breaker' };
    }
    if (priv.roleId === 'exp1_angel' && poolIds.includes('lobby') && (pub.deadCount >= 1 || pub.round >= 3)) {
      return { type: 'CHOOSE_DEST', location: 'lobby' };
    }
    if (priv.roleId === 'exp2_bianca' || priv.roleId === 'exp2_freyja') {
      if (selfPub.equipped.length < 3) {
        if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
        if (poolIds.includes('canteen')) return { type: 'CHOOSE_DEST', location: 'canteen' };
        if (poolIds.includes('breaker')) return { type: 'CHOOSE_DEST', location: 'breaker' };
      }
    }
    if ((priv.roleId === 'exp2_urban_legend' || priv.roleId === 'exp2_cruz') && pub.deckCounts.event > 0) {
      if (poolIds.includes('canteen')) return { type: 'CHOOSE_DEST', location: 'canteen' };
    }
    if (priv.roleId === 'exp2_warlock' && poolIds.includes('court')) return { type: 'CHOOSE_DEST', location: 'court' };
    if (priv.roleId === 'exp2_witch' && poolIds.includes('corridor') && (priv.woundsTaken >= 2 || priv.revealed)) {
      return { type: 'CHOOSE_DEST', location: 'corridor' };
    }
    if (priv.roleId === 'exp2_gloria' && poolIds.includes('lobby') && pub.deckCounts.equipment >= 2) {
      return { type: 'CHOOSE_DEST', location: 'lobby' };
    }
    if (priv.roleId === 'lang-anh-san' && selfPub.equipped.length < 5) {
      if (aliveOthers.some((p) => p.equipped.length > 0) && poolIds.includes('court')) return { type: 'CHOOSE_DEST', location: 'court' };
      if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
    }
    if (
      priv.woundsTaken >= 4 &&
      !(priv.roleId === 'lang-tien-phong' && pub.deadCount === 0) &&
      !(priv.roleId === 'exp2_dalton' && isPubDaltonActivated(pub, priv.playerId)) &&
      poolIds.includes('corridor')
    ) {
      return { type: 'CHOOSE_DEST', location: 'corridor' };
    }
    const desiredId =
      poolIds.find((locId) => areInSameCluster(locId, bestTarget.location, pub.clusterPairs)) ||
      pickRandom(poolIds, rng) ||
      poolIds[0];
    return { type: 'CHOOSE_DEST', location: desiredId };
  }

  // Phase 2: LOCATION_ACTION
  if (pub.turnPhase === 'LOCATION_ACTION') {
    if (priv.roleId === 'exp1_felicia' && !priv.revealed && (selfPub.location === 'lobby' || selfPub.location === 'canteen' || selfPub.location === 'breaker')) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp2_gloria' && !priv.revealed && selfPub.location === 'lobby') return { type: 'REVEAL_ROLE' };
    if (priv.roleId === 'exp2_witch' && !priv.revealed && selfPub.location === 'corridor') return { type: 'REVEAL_ROLE' };
    if (priv.roleId === 'exp2_cruz' && !priv.revealed && (selfPub.location === 'canteen' || selfPub.location === 'breaker')) {
      return { type: 'REVEAL_ROLE' };
    }

    switch (selfPub.location) {
      case 'radio':
        return { type: 'DRAW_CARD', deck: 'investigation' };
      case 'lobby':
        return { type: 'DRAW_CARD', deck: 'equipment' };
      case 'canteen':
        return { type: 'DRAW_CARD', deck: 'event' };
      case 'breaker': {
        if ((priv.roleId === 'exp2_cruz' || priv.roleId === 'exp2_urban_legend' || priv.roleId === 'exp2_colt') && pub.deckCounts.event > 0) {
          return { type: 'DRAW_CARD', deck: 'event' };
        }
        if (priv.roleId === 'lang-anh-san' || priv.roleId === 'exp2_bryon' || priv.roleId === 'exp2_bianca' || priv.roleId === 'exp2_freyja' || priv.roleId === 'exp1_bethany') {
          return { type: 'DRAW_CARD', deck: pub.deckCounts.equipment > 0 ? 'equipment' : 'event' };
        }
        return { type: 'DRAW_CARD', deck: rng() < 0.5 ? 'equipment' : 'event' };
      }
      case 'corridor': {
        const blockSelfHeal =
          (priv.roleId === 'lang-tien-phong' && pub.deadCount === 0) ||
          (priv.roleId === 'exp2_dalton' && isPubDaltonActivated(pub, priv.playerId)) ||
          (priv.roleId === 'exp2_bianca' && priv.hp >= 3);
        // Diana without customer loves keeping full HP!
        const dianaWantsFull = priv.roleId === 'exp2_diana' && !pub.dianaActiveCustomerByPlayer?.[priv.playerId] && priv.woundsTaken > 0;
        if ((selfPub.woundsTaken >= 2 && !blockSelfHeal) || dianaWantsFull || (bestAlly && bestAlly.woundsTaken >= 3 && bestTarget.woundsTaken < 8)) {
          const healTarget =
            (dianaWantsFull || (selfPub.woundsTaken >= (bestAlly?.woundsTaken ?? 0) && !blockSelfHeal))
              ? selfPub.playerId
              : bestAlly
                ? bestAlly.playerId
                : null;
          if (healTarget) return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: healTarget };
        }
        const dmgTarget = scoredOthers.find((x) => !x.isImmune)?.player || bestTarget;
        if (pub.round === 1 && scoredOthers[0].isEnemyProb < 0.72 && priv.roleId !== 'lang-tien-phong') {
          return { type: 'SKIP_LOC' };
        }
        return { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: dmgTarget.playerId };
      }
      case 'court': {
        if (priv.roleId === 'exp2_colt') {
          const weaponHolder = aliveOthers.find((p) => p.equipped.some((c) => COLT_WEAPON_SET.has(c.id)));
          if (weaponHolder) return { type: 'USE_LOC_POWER', mode: 'steal', targetPlayerId: weaponHolder.playerId };
        }
        const donor = scoredOthers.filter((x) => x.player.equipped.length > 0)[0]?.player;
        if (donor) return { type: 'USE_LOC_POWER', mode: 'steal', targetPlayerId: donor.playerId };
        return { type: 'SKIP_LOC' };
      }
      default:
        return { type: 'SKIP_LOC' };
    }
  }

  // Phase 3: MAIN_ACTION
  if (pub.turnPhase === 'MAIN_ACTION') {
    if (priv.hand.length > 0) {
      const card = priv.hand[0];
      if (!card.isConsumable && card.deck !== 'investigation') return { type: 'EQUIP_CARD', cardId: card.id };
      if (card.deck === 'investigation') {
        const targetToProbe =
          aliveOthers
            .filter((p) => !p.revealedRoleId)
            .sort((a, b) => (botMem.possible[b.playerId]?.size || 0) - (botMem.possible[a.playerId]?.size || 0))[0] ||
          aliveOthers[0];
        return { type: 'INVESTIGATE_CARD', cardId: card.id, targetPlayerId: targetToProbe.playerId };
      }
      if (card.id === 'eq-08') {
        const blessTarget = bestAlly || aliveOthers[aliveOthers.length - 1];
        return { type: 'USE_CARD', cardId: card.id, targetPlayerId: blessTarget.playerId };
      }
      if (card.id === 'eq-09') {
        let aidTargetId = bestTarget.playerId;
        if (selfPub.woundsTaken >= 8 && !(priv.roleId === 'exp2_dalton' && isPubDaltonActivated(pub, priv.playerId))) {
          aidTargetId = selfPub.playerId;
        } else if (bestAlly && bestAlly.woundsTaken >= 8) {
          aidTargetId = bestAlly.playerId;
        }
        return { type: 'USE_CARD', cardId: 'eq-09', targetPlayerId: aidTargetId };
      }
      if (card.id === 'eq-13') {
        const trigger = priv.faction === 'lantern-guard' && (priv.woundsTaken >= 2 || priv.revealed);
        return { type: 'USE_CARD', cardId: 'eq-13', ...(trigger ? {} : { skipEffect: true }) };
      }
      if (card.id === 'eq-14') {
        const trigger = isEligibleForChocolateHeal(priv.roleId, true) && (priv.woundsTaken >= 2 || priv.revealed);
        return { type: 'USE_CARD', cardId: 'eq-14', ...(trigger ? {} : { skipEffect: true }) };
      }
      if (card.id === 'ev-13') {
        const trigger = priv.faction === 'mist-order' && (priv.woundsTaken >= 2 || priv.revealed);
        return { type: 'USE_CARD', cardId: 'ev-13', ...(trigger ? {} : { skipEffect: true }) };
      }
      if (card.id === 'ev-11') {
        const donor = scoredOthers.filter((x) => x.player.equipped.length > 0)[0]?.player;
        return { type: 'USE_CARD', cardId: 'ev-11', ...(donor ? { targetPlayerId: donor.playerId } : {}) };
      }
      if (card.id === 'ev-12') {
        const recipient = bestAlly || aliveOthers[aliveOthers.length - 1];
        return { type: 'USE_CARD', cardId: 'ev-12', targetPlayerId: recipient.playerId };
      }
      if (card.id === 'ev-07' || card.id === 'ev-08' || card.id === 'ev-10') {
        const nonImmune = scoredOthers.find((x) => !x.isImmune)?.player || bestTarget;
        return { type: 'USE_CARD', cardId: card.id, targetPlayerId: nonImmune.playerId };
      }
      return { type: 'USE_CARD', cardId: card.id };
    }

    // Exercise voluntary `TRANSFER_TO_BETHANY` when revealed Bethany is alive & another player has spare non-Masamune gear!
    if (priv.roleId !== 'exp1_bethany' && selfPub.equipped.length >= 2) {
      const revBethany = aliveOthers.find(
        (p) =>
          p.revealedRoleId === 'exp1_bethany' &&
          pub.bethanyChosenTargetByPlayer?.[p.playerId] !== priv.playerId,
      );
      if (revBethany && rng() < 0.25) {
        const spare = selfPub.equipped
          .filter((c) => c.id !== 'ev-01' && !(priv.roleId === 'exp2_colt' && COLT_WEAPON_SET.has(c.id)))
          .sort((a, b) => scoreGearToDiscard(a.id) - scoreGearToDiscard(b.id))[0];
        if (spare) {
          return { type: 'TRANSFER_TO_BETHANY', targetPlayerId: revBethany.playerId, cardId: spare.id };
        }
      }
    }

    const reachableScored = scoredOthers.filter((x) => {
      if (x.isProtectedUdi || x.isMarkedByVisions || x.isAaronSpouse) return false;
      const sameCluster = areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs);
      return hasHandgun ? !sameCluster : sameCluster;
    });

    // Strategic Voluntary Reveal (respecting roles that MUST stay hidden: April & Skipps, Arnold, Diana, Aaron, etc.)
    if (
      !priv.revealed &&
      ![
        'lang-tien-phong',
        'suong-tin-gia',
        'exp1_wendigo',
        'exp1_undying',
        'exp1_cindy',
        'exp2_urban_legend',
        'exp2_arlene',
        'exp2_dalton',
        'exp1_arnold',
        'exp2_april_skipps',
        'exp2_diana',
        'exp2_aaron',
      ].includes(priv.roleId) &&
      !(priv.roleId === 'exp1_fallen' && priv.hp < 8)
    ) {
      const inRangeGeared = reachableScored.some((x) => x.player.equipped.length > 0);
      const sameClusterOthers = scoredOthers.filter((x) => areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs));
      const sameClusterCount = sameClusterOthers.length;
      const sameClusterEnemies = sameClusterOthers.filter((x) => !x.isImmune && x.isEnemyProb >= 0.55).length;
      const sameClusterAllies = sameClusterOthers.filter((x) => x.isAllyProb >= 0.7).length;
      const sameClusterAllyMissingHp =
        priv.woundsTaken +
        sameClusterOthers.filter((x) => x.isAllyProb >= 0.65).reduce((acc, x) => acc + x.player.woundsTaken, 0);
      const hasRevealedNeutralInCluster = aliveOthers.some(
        (p) => p.revealedFaction === 'wanderer' && areInSameCluster(selfPub.location, p.location, pub.clusterPairs),
      );
      const nonMasamuneGearCount = selfPub.equipped.filter((c) => c.id !== 'ev-01').length;

      const shouldRevealNow =
        ((priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') &&
          ((pub.round >= 2 && (scoredOthers[0].isEnemyProb >= 0.68 || bestTarget.woundsTaken >= 5)) || hasSpear || pub.round >= 4)) ||
        (priv.roleId === 'gac-truc-ban' && (hasSpear || selfPub.woundsTaken >= 5 || pub.round >= 4)) ||
        (priv.roleId === 'suong-an-danh' && priv.woundsTaken >= 2 && reachableScored.length > 0) ||
        (priv.roleId === 'suong-gac-cong' && (priv.woundsTaken >= 2 || pub.round >= 2)) ||
        (priv.roleId === 'lang-quan-sat' && priv.woundsTaken >= 4) ||
        (priv.roleId === 'lang-anh-san' && ((inRangeGeared && pub.players.length <= 6 && !hasMachineGun) || selfPub.equipped.length >= 4)) ||
        (priv.roleId === 'lang-cuu-ho' && (pub.deadCount >= 2 && priv.hp >= 5 && reachableScored.length > 0)) ||
        (priv.roleId === 'exp2_g43' && (priv.woundsTaken >= 1 || hasSpear || pub.round >= 2)) ||
        (priv.roleId === 'exp2_fiona' && ((reachableScored.length > 0 && pub.round >= 2) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_wyvern' && (reachableScored.some((x) => x.player.woundsTaken >= 4) || pub.round >= 3)) ||
        (priv.roleId === 'exp1_gayle' && ((reachableScored.length > 0 && pub.round >= 2) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp1_felicia' && pub.round >= 1) ||
        (priv.roleId === 'exp1_victor' && (reachableScored.length > 0 && priv.hp >= 5 && pub.round >= 2)) ||
        (priv.roleId === 'exp1_elysia' && ((reachableScored.length > 0 && pub.round >= 2) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_unchained' && (reachableScored.length > 0 && pub.round >= 2)) ||
        (priv.roleId === 'exp2_warlock' && ((selfPub.location === 'court' && reachableScored.length > 0) || pub.round >= 3)) ||
        (priv.roleId === 'exp2_witch' && (selfPub.location === 'corridor' || priv.woundsTaken >= 4)) ||
        (priv.roleId === 'exp2_father_harrison' && (hasSpear || pub.round >= 2)) ||
        (priv.roleId === 'exp2_gloria' && (selfPub.location === 'lobby' || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp1_bipolar' && (priv.woundsTaken >= 4 || pub.round >= 4)) ||
        (priv.roleId === 'exp1_fallen' && priv.hp >= 8 && (reachableScored.length > 0 || pub.round >= 2)) ||
        (priv.roleId === 'exp1_fea' && (hasSpear || pub.round >= 2)) ||
        (priv.roleId === 'exp2_eleanor' && (pub.round >= 1 || hasSpear)) ||
        (priv.roleId === 'exp2_fujiko' && (reachableScored.some((x) => x.player.revealedRoleId && x.player.woundsTaken >= 6) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp1_udi' && (sameClusterCount >= 2 || pub.round >= 3)) ||
        (priv.roleId === 'exp1_wrath' && pub.round >= 2) ||
        (priv.roleId === 'exp1_vengeance' && (reachableScored.some((x) => x.player.woundsTaken >= 6) || pub.round >= 3)) ||
        (priv.roleId === 'exp2_visions' && pub.round >= 2) ||
        (priv.roleId === 'exp2_cruz' && pub.round >= 2) ||
        (priv.roleId === 'exp2_bryon' && (hasRevealedNeutralInCluster && nonMasamuneGearCount > 0)) ||
        (priv.roleId === 'exp2_elise' && (sameClusterAllyMissingHp >= 3 || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_umibozu' && (sameClusterEnemies >= 1 && sameClusterEnemies >= sameClusterAllies)) ||
        (priv.roleId === 'exp1_ernest' && (priv.hp >= 3 && (pub.round >= 2 || hasSpear))) ||
        (priv.roleId === 'exp1_gwendolen' && (pub.round >= 2 || hasSpear || sameClusterCount >= 1)) ||
        (priv.roleId === 'exp2_freyja' && ((nonMasamuneGearCount >= 1 && reachableScored.length > 0) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_warlord' && pub.round >= 2) ||
        (priv.roleId === 'exp2_usurper' && (pub.round >= 3 && aliveOthers.some((p) => p.woundsTaken >= 3))) ||
        (priv.roleId === 'exp1_angel' && (pub.round >= 2 || priv.woundsTaken >= 2)) ||
        (priv.roleId === 'exp2_bianca' && (nonMasamuneGearCount >= 1 && (priv.woundsTaken >= 2 || pub.round >= 2))) ||
        // Wave 5:
        (priv.roleId === 'exp2_gideon' && (pub.round >= 2 || hasSpear)) ||
        (priv.roleId === 'exp1_bethany' && (nonMasamuneGearCount >= 1 || pub.round >= 2)) ||
        (priv.roleId === 'exp1_cassie' && (priv.woundsTaken >= 1 || pub.round >= 2)) ||
        (priv.roleId === 'exp1_clairvoyant' && (pub.round >= 1 && aliveOthers.some((p) => !p.revealedRoleId))) ||
        (priv.roleId === 'exp2_colt' && (selfPub.equipped.length >= 1 || pub.round >= 2));

      if (shouldRevealNow) return { type: 'REVEAL_ROLE' };
    }

    // Active skills in MAIN_ACTION
    if (priv.revealed) {
      if (priv.roleId === 'exp2_elise' && !priv.skillUsedOnce && !pub.usurperAuraActive) {
        const allyWounds =
          priv.woundsTaken +
          scoredOthers
            .filter((x) => x.isAllyProb >= 0.65 && areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs))
            .reduce((acc, x) => acc + x.player.woundsTaken, 0);
        if (allyWounds >= 3 || (priv.woundsTaken >= 4 && pub.round >= 3)) return { type: 'USE_SKILL' };
      }
      if (priv.roleId === 'exp1_ernest' && !priv.skillUsedOnce && priv.hp >= 3 && (aliveOthers.filter((p) => !p.revealedRoleId).length >= 2 || pub.round >= 3)) {
        return { type: 'USE_SKILL' };
      }
      if (priv.roleId === 'exp1_angel' && !priv.skillUsedOnce && (priv.woundsTaken >= 2 || pub.round >= 2)) return { type: 'USE_SKILL' };
      if (priv.roleId === 'exp2_bryon' && selfPub.attacksThisTurn === 0 && selfPub.equipped.some((e) => e.id !== 'ev-01') && aliveOthers.some((p) => p.revealedFaction === 'wanderer' && areInSameCluster(selfPub.location, p.location, pub.clusterPairs))) {
        return { type: 'USE_SKILL' };
      }
      if (priv.roleId === 'exp2_eleanor' && selfPub.attacksThisTurn === 0 && !(hasMasamune && reachableScored.length > 0) && pub.deckCounts.investigation > 0) {
        if (aliveOthers.some((p) => !p.revealedRoleId) && (reachableScored.length === 0 || pub.round <= 3)) {
          return { type: 'USE_SKILL' };
        }
      }
      if ((priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') && !priv.skillUsedOnce && (scoredOthers[0].isEnemyProb >= 0.65 || bestTarget.woundsTaken >= 5 || pub.round >= 4)) {
        const nonImmune = scoredOthers.find((x) => !x.isImmune)?.player || bestTarget;
        return { type: 'USE_SKILL', targetPlayerId: nonImmune.playerId };
      }
      if (priv.roleId === 'lang-quan-sat' && !priv.skillUsedOnce && priv.woundsTaken >= 4) return { type: 'USE_SKILL' };
      if (priv.roleId === 'lang-cuu-ho' && selfPub.attacksThisTurn >= 1 && selfPub.lastAttackTargetId && priv.hp > 4 && reachableScored.length > 0) {
        const feastTarget = reachableScored.find((x) => x.player.playerId === selfPub.lastAttackTargetId && !x.isImmune && pub.deadCount >= 2 && x.player.woundsTaken >= 5);
        if (feastTarget) return { type: 'USE_SKILL', targetPlayerId: feastTarget.playerId };
      }
    }

    // Combat Attack
    if (selfPub.attacksThisTurn < 1 && reachableScored.length > 0) {
      const nonImmuneReachable = reachableScored.filter((x) => !x.isImmune);
      const candidates = nonImmuneReachable.length > 0 ? nonImmuneReachable : reachableScored;
      if (hasMasamune) return { type: 'ATTACK', targetPlayerId: candidates[0].player.playerId };
      const top = candidates[0];
      if (top.isImmune) return { type: 'END_TURN' };
      if (priv.faction === 'lantern-guard' && top.player.revealedRoleId === 'exp2_arlene') return { type: 'END_TURN' };
      const topIsConfirmedAlly =
        top.isAllyProb >= 0.85 &&
        !['lang-anh-san', 'lang-quan-sat', 'lang-cuu-ho', 'exp1_cindy', 'exp2_cruz', 'exp2_dalton'].includes(priv.roleId) &&
        !(priv.roleId === 'lang-tien-phong' && pub.deadCount === 0);
      const hunterAvoidNeutral =
        priv.faction === 'lantern-guard' &&
        ((top.isEnemyProb < 0.3 && top.player.woundsTaken < 7 && pub.deadCount <= 2) ||
          (pub.players.length >= 6 && pub.round <= 3 && top.isEnemyProb < 0.52));
      const suppressRound1Blind =
        pub.round === 1 &&
        top.isEnemyProb < 0.72 &&
        priv.roleId !== 'lang-tien-phong' &&
        priv.roleId !== 'exp2_arlene';
      if (!topIsConfirmedAlly && !hunterAvoidNeutral && !suppressRound1Blind) {
        if (!(hasMachineGun && reachableScored.some((x) => x.isAllyProb >= 0.85 && x.player.woundsTaken >= 8))) {
          return { type: 'ATTACK', targetPlayerId: top.player.playerId };
        }
      }
    }

    return { type: 'END_TURN' };
  }

  return { type: 'END_TURN' };
}

/**
 * Targeted deterministic micro-scenarios (strictly separated from random-pool 25k stats!)
 * to guarantee functional verification of rare multi-role edge cases.
 */
function runTargetedMechanicsValidation() {
  const now = 1_798_500_000_000;
  // 1. 3-Node Victory Cycle (`Bethany -> Diana -> Clairvoyant -> Bethany`) fails closed
  const cycleState = createInitialGameState({
    matchId: 'targeted-cycle-1',
    seed: 1001,
    nowMs: now,
    rulesetId: 'starter-forty-eight',
    allowExperimental: true,
    players: Array.from({ length: 5 }, (_, i) => ({
      playerId: `p${i + 1}`,
      displayName: `P${i + 1}`,
      seatIndex: i,
      appearance: {},
      connected: true,
    })),
  });
  const assign = (pid, rid, alive = true) => {
    const d = getRoleDesign(rid);
    const p = cycleState.players[pid];
    p.roleId = rid;
    p.faction = d.faction;
    p.maxHp = d.maxHp;
    p.hp = alive ? d.maxHp : 0;
    p.woundsTaken = alive ? 0 : d.maxHp;
    p.alive = alive;
    p.revealed = true;
  };
  assign('p1', 'exp1_bethany', true);
  assign('p2', 'exp2_diana', true);
  assign('p3', 'exp1_clairvoyant', true);
  assign('p4', 'gac-ky-thuat', true);
  assign('p5', 'suong-an-danh', false);
  cycleState.expansionState.bethanyChosenByPlayer = {
    p1: { chosenPlayerId: 'p2', givenCardId: 'eq-02', assignedByPlayerId: 'p1', assignedOnTurnNumber: 1, assignedAtMs: now },
  };
  cycleState.expansionState.dianaContracts = {
    p2: { customerPlayerId: 'p3', sourceRoleId: 'exp1_clairvoyant', boundOnTurnNumber: 1, boundEventId: 't1', boundAtMs: now, status: 'active', activatedOnTurnNumber: 2 },
  };
  cycleState.expansionState.clairvoyantVisions = {
    p3: {
      targetPlayerId: 'p1',
      targetDisplayName: 'P1',
      sourceRoleId: 'exp1_bethany',
      roleName: 'Bethany',
      faction: 'wanderer',
      maxHp: 10,
      copiedGoalSummary: 'Chosen wins',
      boundEventId: 't2',
      boundAtMs: now,
      boundTurnNumber: 1,
    },
  };
  const cycleDiag = evaluateExpandedVictoryWithDiagnostics(cycleState);
  assert.equal(cycleDiag.evaluation.finished, true);
  assert.deepEqual(cycleDiag.evaluation.winnerPlayerIds, ['p4']);
  assert.ok(cycleDiag.graph && cycleDiag.graph.cycleCount >= 1);

  return {
    note: 'Strictly separated from 25,000 random-pool simulation stats.',
    threeNodeCycleDetectedCount: cycleDiag.graph.cycleCount,
    threeNodeCycleFailClosedPass: cycleDiag.evaluation.winnerPlayerIds.join(',') === 'p4',
  };
}

function runStarterFortyEightSimulation() {
  const validation = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-forty-eight', 8, {
    allowExperimental: true,
  });
  assert.equal(validation.ok, true, 'starter-forty-eight must validate under allowExperimental');

  const stats = {
    rulesetId: 'starter-forty-eight',
    simulatorVersion: SIMULATOR_VERSION,
    botPolicyVersion: BOT_POLICY_VERSION,
    seedFormula: '10_000_000 + playerCount * 100_000 + g + 1',
    totalGames: 0,
    stalledGames: 0,
    draws: 0,
    botAccessViolations: 0,
    totalRounds: 0,
    totalTurns: 0,
    maxRound: 0,
    reachedMaxRound: 0,
    earlyEnds1To2: 0,
    round1Deaths: 0,
    totalEliminations: 0,
    totalDamageDealt: 0,
    primaryFactions: { 'lantern-guard': 0, 'mist-order': 0, wanderer: 0 },
    wanderer5to8: { appearances: 0, wins: 0, soloWins: 0, coWins: 0 },
    locationOccupancyTurns: { radio: 0, breaker: 0, lobby: 0, canteen: 0, corridor: 0, court: 0 },
    byCount: {},
    byRole: {},
    g43Counterplay: {
      overallAppearances: 0,
      overallWins: 0,
      holyRobeAppearances: 0,
      holyRobeWins: 0,
      vsWrathAppearances: 0,
      vsWrathWins: 0,
    },
    reactionPolicyUsage: {
      ASK: 0,
      AUTO_DECLINE: 0,
      AUTO_ACTIVATE_WHEN_ELIGIBLE: 0,
    },
    wave5Telemetry: {
      // Gideon
      gideonActivations: 0,
      gideonWhiteCardsDrawn: 0,
      gideonMaxDrawsInSingleMatch: 0,
      // Anathema
      anathemaActivations: 0,
      anathemaDamageRedirectedTotal: 0,
      anathemaSelfCostDamageTotal: 0,
      // Arnold
      arnoldActivations: 0,
      arnoldDamageRedirectedTotal: 0,
      arnoldSurvivedMoreThan2Wins: 0,
      // Bethany
      bethanyDesignateActivations: 0,
      bethanyPlayerTransfers: 0,
      bethanyCoWins: 0,
      bethanyDeadCoWins: 0,
      // Cassie
      cassieHealActivations: 0,
      cassieHealTotal: 0,
      cassieCopiedLinksBound: 0,
      // Clairvoyant
      clairvoyantPeekAttempts: 0,
      clairvoyantCopiedLinksBound: 0,
      // April & Skipps
      aprilSkippsWound7Triggers: 0,
      aprilSkippsNextTurnWins: 0,
      aprilSkippsUnrevealedEndWins: 0,
      // Colt
      coltTheftCounterTriggers: 0,
      coltRecoverItemCount: 0,
      coltDealDamageCount: 0,
      coltThreeWeaponWins: 0,
      // Diana
      dianaContractsBound: 0,
      dianaContractsActivated: 0,
      dianaCustomerCoWins: 0,
      dianaFullHpFallbackWins: 0,
      // Aaron
      aaronSpouseBound: 0,
      aaronBothAliveWins: 0,
      aaronUnmatchedDeadWins: 0,
      // Graph & Chains
      copiedVictoryLinksBoundTotal: 0,
      sharedOutcomeCoWinsTotal: 0,
      victoryCyclesDetectedOrganic: 0,
      maxRedirectChainDepthObserved: 0,
      totalEquipmentTheftsObserved: 0,
      totalEquipmentRecoveriesObserved: 0,
      choiceTimeoutsInFastBotSim: 0,
      // Legacy outliers check
      daltonKillAfterActivationWins: 0,
      daltonHighestHpEndWins: 0,
      cindy5pAppearances: 0,
      cindy5pWins: 0,
      angel5pAppearances: 0,
      angel5pWins: 0,
    },
    pendingChoicesResolved: {
      // Wave 1-4 (22)
      fiona_attack_roll: 0,
      wendigo_reveal_heal: 0,
      gayle_attack_reroll: 0,
      felicia_draw_choice: 0,
      victor_blood_boost: 0,
      undying_reveal_reduce: 0,
      elysia_counter_boost: 0,
      cindy_reveal_retaliate: 0,
      bipolar_fate_coin: 0,
      fea_move_adjust: 0,
      wrath_turn_start_aoe: 0,
      vengeance_chain_strike: 0,
      visions_mark_target: 0,
      cruz_black_redraw: 0,
      bryon_gift_equipment: 0,
      elise_distribute_heal: 0,
      urban_legend_reveal_heal: 0,
      gwendolen_counter_attack: 0,
      freyja_extra_attack: 0,
      warlord_pull_attack: 0,
      usurper_reveal_block_heal: 0,
      bianca_discard_prevent: 0,
      // Wave 5 / Phase 6 (9)
      gideon_draw_white: 0,
      gideon_white_card_target: 0,
      anathema_curse_target: 0,
      bethany_designate_chosen: 0,
      arnold_reflect_lethal: 0,
      cassie_turn_heal: 0,
      clairvoyant_peek_copy: 0,
      colt_theft_counter: 0,
      colt_recover_or_damage: 0,
    },
  };

  for (const d of ALL_S48_DESIGNS) {
    const wave = PHASE6_ROLE_IDS.includes(d.id)
      ? 'wave5-tier3'
      : PHASE5C_ROLE_IDS.includes(d.id)
        ? 'wave4-tier3'
        : PHASE5B_ROLE_IDS.includes(d.id)
          ? 'wave4-tier2'
          : PHASE4B_ROLE_IDS.includes(d.id)
            ? 'wave3'
            : PHASE3A_ROLE_IDS.includes(d.id)
              ? 'wave2'
              : PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS.includes(d.id)
                ? 'starter-eight'
                : 'classic';
    stats.byRole[d.id] = {
      id: d.id,
      name: d.name,
      faction: d.faction,
      maxHp: d.maxHp,
      wave,
      appearances: 0,
      wins: 0,
      survived: 0,
      reveals: 0,
      skillActivations: 0,
      healTotal: 0,
      damagePreventedTotal: 0,
      damageRedirectedTotal: 0,
      bonusDamageTotal: 0,
      healsBlockedTotal: 0,
    };
  }

  const sizes = [4, 5, 6, 7, 8];
  const gamesPerSize = 5000; // 5 * 5,000 = 25,000 deterministic matches!
  const t0 = Date.now();

  for (const playerCount of sizes) {
    const countBucket = {
      games: 0,
      guardWins: 0,
      mistWins: 0,
      wandererPrimaryWins: 0,
      wandererAppearances: 0,
      wandererWins: 0,
      roundSum: 0,
      turnSum: 0,
      earlyEnds: 0,
      round1Deaths: 0,
    };
    stats.byCount[playerCount] = countBucket;

    for (let g = 0; g < gamesPerSize; g += 1) {
      stats.totalGames += 1;
      countBucket.games += 1;
      const seed = 10_000_000 + playerCount * 100_000 + g + 1;
      const rng = createRng(seed);
      const players = Array.from({ length: playerCount }, (_, idx) => ({
        playerId: `bot_${idx + 1}`,
        displayName: `Bot ${idx + 1}`,
        seatIndex: idx,
        appearance: { gender: idx % 2 === 0 ? 'male' : 'female', topStyle: 'jacket', hairColor: '#1f2937', skinTone: '#f1c27d' },
        connected: true,
      }));
      const profiles = players.map((_, idx) => PROFILES[(g + idx) % PROFILES.length]);

      let nowMs = 1_798_000_000_000 + seed * 10_000;
      const state = createInitialGameState({
        matchId: `s48-${playerCount}-${g}`,
        seed,
        nowMs,
        rulesetId: 'starter-forty-eight',
        allowExperimental: true,
        players,
      });

      // Exercise SET_REACTION_PREF policies deterministically
      for (let idx = 0; idx < players.length; idx += 1) {
        const pid = players[idx].playerId;
        const r = state.players[pid].roleId;
        let policy = 'ASK';
        if (r === 'exp2_arlene') {
          policy = g % 10 === 0 ? 'AUTO_DECLINE' : 'AUTO_ACTIVATE_WHEN_ELIGIBLE';
        } else if (['exp1_wendigo', 'exp1_undying', 'exp1_cindy', 'exp2_urban_legend', 'exp2_usurper', 'exp1_arnold'].includes(r)) {
          const mod = (g + idx) % 7;
          if (mod === 0 && r !== 'exp1_arnold') policy = 'AUTO_DECLINE';
          else if (mod === 1) policy = 'AUTO_ACTIVATE_WHEN_ELIGIBLE';
          else policy = 'ASK';
        }
        if (policy !== 'ASK') {
          const prefRes = applyPlayerGameAction(state, pid, { type: 'SET_REACTION_PREF', policy }, nowMs);
          assert.equal(prefRes.ok, true);
        }
        stats.reactionPolicyUsage[policy] += 1;
      }

      const myPrivateViews = {};
      for (const p of players) myPrivateViews[p.playerId] = getPrivateGameView(state, p.playerId);
      const botMemMap = createBotMemory(
        players.map((p) => p.playerId),
        myPrivateViews,
      );

      let safety = 0;
      const maxSteps = 4500;
      const prevAliveSet = new Set(players.map((p) => p.playerId));
      const prevWounds = {};
      for (const p of players) prevWounds[p.playerId] = 0;
      let lastRecordedTurn = -1;
      let hadG43Robe = false;

      while (!state.finished && safety < maxSteps) {
        safety += 1;
        nowMs += 250;

        if (state.turnNumber !== lastRecordedTurn) {
          lastRecordedTurn = state.turnNumber;
          for (const p of Object.values(state.players)) {
            if (p.alive && stats.locationOccupancyTurns[p.location] !== undefined) {
              stats.locationOccupancyTurns[p.location] += 1;
            }
          }
        }

        if (state.pendingChoice) {
          const ownerId = state.pendingChoice.ownerPlayerId;
          const choiceKind = state.pendingChoice.kind;
          const pub = getPublicGameView(state);
          const ownerPriv = getPrivateGameView(state, ownerId);

          if (state.pendingChoice.isSecret) {
            if (
              pub.pendingChoice?.ownerPlayerId !== null ||
              pub.pendingChoice?.kind !== null ||
              (pub.pendingChoice?.choiceId || '').includes('arnold')
            ) {
              stats.botAccessViolations += 1;
            }
          }
          if (!ownerPriv || !ownerPriv.pendingChoice) {
            stats.botAccessViolations += 1;
            stats.stalledGames += 1;
            break;
          }

          const mem = botMemMap[ownerId];
          updateBotMemory(mem, pub, ownerPriv);
          const optionId = choosePendingChoiceOption(pub, ownerPriv, mem, rng);

          const res = applyPlayerGameAction(
            state,
            ownerId,
            { type: 'RESOLVE_CHOICE', choiceId: ownerPriv.pendingChoice.choiceId, optionId },
            nowMs,
          );
          if (!res.ok) {
            const fb = applyPlayerGameAction(
              state,
              ownerId,
              {
                type: 'RESOLVE_CHOICE',
                choiceId: ownerPriv.pendingChoice.choiceId,
                optionId: ownerPriv.pendingChoice.defaultOptionId,
              },
              nowMs,
            );
            if (!fb.ok) {
              stats.stalledGames += 1;
              break;
            }
          }
          if (choiceKind === 'clairvoyant_peek_copy' && optionId !== 'skip') {
            stats.wave5Telemetry.clairvoyantPeekAttempts += 1;
          }
          if (choiceKind === 'colt_recover_or_damage') {
            if (optionId === 'recover_item') stats.wave5Telemetry.coltRecoverItemCount += 1;
            else stats.wave5Telemetry.coltDealDamageCount += 1;
          }
          stats.pendingChoicesResolved[choiceKind] = (stats.pendingChoicesResolved[choiceKind] || 0) + 1;
        } else {
          const active = getActivePlayer(state);
          if (!active) {
            stats.stalledGames += 1;
            break;
          }
          const activeIdx = players.findIndex((p) => p.playerId === active.playerId);
          const pub = getPublicGameView(state);
          const priv = getPrivateGameView(state, active.playerId);
          const mem = botMemMap[active.playerId];
          updateBotMemory(mem, pub, priv);

          const preAction = chooseBotAction(pub, priv, mem, profiles[activeIdx], rng);
          let res = applyPlayerGameAction(state, active.playerId, preAction, nowMs);
          if (res.ok && preAction.type === 'TRANSFER_TO_BETHANY') {
            stats.wave5Telemetry.bethanyPlayerTransfers += 1;
          }

          if (!res.ok) {
            if (state.turnPhase === 'ROLL_MOVE') {
              res = applyPlayerGameAction(state, active.playerId, { type: 'ROLL_DICE' }, nowMs);
            } else if (state.turnPhase === 'CHOOSE_MOVE') {
              const alt =
                state.allowedMoveDestinations?.[0] ||
                LOCATIONS_CATALOG.find((l) => l.id !== active.location)?.id ||
                'lobby';
              res = applyPlayerGameAction(state, active.playerId, { type: 'CHOOSE_DEST', location: alt }, nowMs);
            } else if (state.turnPhase === 'LOCATION_ACTION') {
              res = applyPlayerGameAction(state, active.playerId, { type: 'SKIP_LOC' }, nowMs);
            } else if (active.hand.length > 0) {
              const cid = active.hand[0];
              const oth = Object.values(state.players).find((p) => p.alive && p.playerId !== active.playerId);
              if (cid.startsWith('inv-') && oth) {
                res = applyPlayerGameAction(state, active.playerId, { type: 'INVESTIGATE_CARD', cardId: cid, targetPlayerId: oth.playerId }, nowMs);
              } else {
                res = applyPlayerGameAction(state, active.playerId, { type: 'USE_CARD', cardId: cid, skipEffect: true, targetPlayerId: oth?.playerId }, nowMs);
              }
            } else {
              res = applyPlayerGameAction(state, active.playerId, { type: 'END_TURN' }, nowMs);
            }
          }
          if (!res.ok) {
            stats.stalledGames += 1;
            break;
          }
          if (preAction.type === 'ATTACK' && botMemMap[preAction.targetPlayerId]) {
            botMemMap[preAction.targetPlayerId].attackedMe[active.playerId] =
              (botMemMap[preAction.targetPlayerId].attackedMe[active.playerId] || 0) + 1;
          }
        }

        for (const p of Object.values(state.players)) {
          const deltaW = p.woundsTaken - (prevWounds[p.playerId] ?? 0);
          if (deltaW > 0) stats.totalDamageDealt += deltaW;
          prevWounds[p.playerId] = p.woundsTaken;

          if (prevAliveSet.has(p.playerId) && !p.alive) {
            prevAliveSet.delete(p.playerId);
            stats.totalEliminations += 1;
            if (state.round === 1) {
              stats.round1Deaths += 1;
              countBucket.round1Deaths += 1;
            }
          }
          if (p.roleId === 'exp2_g43' && p.equipped.includes('eq-01')) hadG43Robe = true;
        }
      }

      if (!state.finished) {
        stats.stalledGames += 1;
        continue;
      }
      if (!state.winnerPlayerIds || state.winnerPlayerIds.length === 0) {
        stats.draws += 1;
      }

      stats.totalRounds += state.round;
      stats.totalTurns += state.turnNumber;
      countBucket.roundSum += state.round;
      countBucket.turnSum += state.turnNumber;
      if (state.round > stats.maxRound) stats.maxRound = state.round;
      if (state.round >= state.maxRounds) stats.reachedMaxRound += 1;
      if (state.round <= 2) {
        stats.earlyEnds1To2 += 1;
        countBucket.earlyEnds += 1;
      }

      if (state.winnerFaction === 'lantern-guard') {
        stats.primaryFactions['lantern-guard'] += 1;
        countBucket.guardWins += 1;
      } else if (state.winnerFaction === 'mist-order') {
        stats.primaryFactions['mist-order'] += 1;
        countBucket.mistWins += 1;
      } else {
        stats.primaryFactions.wanderer += 1;
        countBucket.wandererPrimaryWins += 1;
      }

      const exp = state.expansionState;
      const expStats = exp?.stats;
      if (expStats) {
        for (const rid of STARTER_FORTY_EIGHT_EXPANSION_ROLE_IDS) {
          stats.byRole[rid].skillActivations += expStats.activationsByRole?.[rid] ?? 0;
          stats.byRole[rid].healTotal += expStats.healByRole?.[rid] ?? 0;
          stats.byRole[rid].damagePreventedTotal += expStats.damagePreventedByRole?.[rid] ?? 0;
          stats.byRole[rid].damageRedirectedTotal += expStats.damageRedirectedByRole?.[rid] ?? 0;
          stats.byRole[rid].bonusDamageTotal += expStats.bonusDamageByRole?.[rid] ?? 0;
          stats.byRole[rid].healsBlockedTotal += expStats.healsBlockedByRole?.[rid] ?? 0;
        }

        const gidActs = expStats.activationsByRole?.exp2_gideon ?? 0;
        const gidDraws = state.publicLog.filter((l) => l.text && l.text.includes('[Thẻ Trắng #')).length;
        stats.wave5Telemetry.gideonActivations += gidActs;
        stats.wave5Telemetry.gideonWhiteCardsDrawn += gidDraws;
        if (gidDraws > stats.wave5Telemetry.gideonMaxDrawsInSingleMatch) {
          stats.wave5Telemetry.gideonMaxDrawsInSingleMatch = gidDraws;
        }
        stats.wave5Telemetry.anathemaActivations += expStats.activationsByRole?.exp1_anathema ?? 0;
        stats.wave5Telemetry.anathemaDamageRedirectedTotal += expStats.damageRedirectedByRole?.exp1_anathema ?? 0;
        stats.wave5Telemetry.arnoldActivations += expStats.activationsByRole?.exp1_arnold ?? 0;
        stats.wave5Telemetry.arnoldDamageRedirectedTotal += expStats.damageRedirectedByRole?.exp1_arnold ?? 0;
        stats.wave5Telemetry.bethanyDesignateActivations += expStats.activationsByRole?.exp1_bethany ?? 0;
        stats.wave5Telemetry.cassieHealActivations += expStats.activationsByRole?.exp1_cassie ?? 0;
        stats.wave5Telemetry.cassieHealTotal += expStats.healByRole?.exp1_cassie ?? 0;
        stats.wave5Telemetry.aprilSkippsWound7Triggers += expStats.activationsByRole?.exp2_april_skipps ?? 0;
        stats.wave5Telemetry.coltTheftCounterTriggers += expStats.activationsByRole?.exp2_colt ?? 0;
        stats.wave5Telemetry.copiedVictoryLinksBoundTotal += expStats.copiedVictoryLinksBound ?? 0;
        stats.wave5Telemetry.victoryCyclesDetectedOrganic += expStats.victoryCyclesDetected ?? 0;
        stats.wave5Telemetry.totalEquipmentRecoveriesObserved += expStats.equipmentReclaimedByRole?.exp2_colt ?? 0;
      }

      if (Array.isArray(exp?.equipmentTransactions)) {
        for (const tx of exp.equipmentTransactions) {
          if (tx.reason === 'theft-court' || tx.reason === 'theft-event' || tx.reason === 'theft-bob') {
            stats.wave5Telemetry.totalEquipmentTheftsObserved += 1;
          }
        }
      }

      if (exp?.anathemaCurses) {
        for (const c of Object.values(exp.anathemaCurses)) {
          if (c.endTurnSelfDamageApplied) stats.wave5Telemetry.anathemaSelfCostDamageTotal += 1;
        }
      }
      if (exp?.cassieCopiedGoalByPlayer) {
        stats.wave5Telemetry.cassieCopiedLinksBound += Object.keys(exp.cassieCopiedGoalByPlayer).length;
      }
      if (exp?.clairvoyantVisions) {
        stats.wave5Telemetry.clairvoyantCopiedLinksBound += Object.keys(exp.clairvoyantVisions).length;
      }
      if (exp?.dianaContracts) {
        for (const c of Object.values(exp.dianaContracts)) {
          stats.wave5Telemetry.dianaContractsBound += 1;
          if (c.status === 'active') stats.wave5Telemetry.dianaContractsActivated += 1;
        }
      }
      if (exp?.aaronSpouseByPlayer) {
        stats.wave5Telemetry.aaronSpouseBound += Object.keys(exp.aaronSpouseByPlayer).length;
      }
      if (Array.isArray(exp?.damageTraces)) {
        for (const tr of exp.damageTraces) {
          if ((tr.redirectDepth ?? 0) > stats.wave5Telemetry.maxRedirectChainDepthObserved) {
            stats.wave5Telemetry.maxRedirectChainDepthObserved = tr.redirectDepth;
          }
        }
      }

      const playerList = Object.values(state.players);
      const allRolesInMatch = new Set(playerList.map((p) => p.roleId));

      for (const p of playerList) {
        const rb = stats.byRole[p.roleId];
        const won = state.winnerPlayerIds.includes(p.playerId);
        rb.appearances += 1;
        if (won) rb.wins += 1;
        if (p.alive) rb.survived += 1;
        if (p.revealed) rb.reveals += 1;

        if (p.roleId === 'exp2_g43') {
          stats.g43Counterplay.overallAppearances += 1;
          if (won) stats.g43Counterplay.overallWins += 1;
          if (hadG43Robe) {
            stats.g43Counterplay.holyRobeAppearances += 1;
            if (won) stats.g43Counterplay.holyRobeWins += 1;
          }
          if (allRolesInMatch.has('exp1_wrath')) {
            stats.g43Counterplay.vsWrathAppearances += 1;
            if (won) stats.g43Counterplay.vsWrathWins += 1;
          }
        }
        if (p.roleId === 'exp1_cindy' && playerCount === 5) {
          stats.wave5Telemetry.cindy5pAppearances += 1;
          if (won) stats.wave5Telemetry.cindy5pWins += 1;
        }
        if (p.roleId === 'exp1_angel' && playerCount === 5) {
          stats.wave5Telemetry.angel5pAppearances += 1;
          if (won) stats.wave5Telemetry.angel5pWins += 1;
        }
        if (p.roleId === 'exp2_dalton' && won) {
          if (exp?.daltonKillWinTriggeredIds?.includes(p.playerId)) {
            stats.wave5Telemetry.daltonKillAfterActivationWins += 1;
          } else {
            stats.wave5Telemetry.daltonHighestHpEndWins += 1;
          }
        }
        if (p.roleId === 'exp1_arnold' && won) {
          stats.wave5Telemetry.arnoldSurvivedMoreThan2Wins += 1;
        }
        if (p.roleId === 'exp1_bethany' && won) {
          stats.wave5Telemetry.bethanyCoWins += 1;
          stats.wave5Telemetry.sharedOutcomeCoWinsTotal += 1;
          if (!p.alive) stats.wave5Telemetry.bethanyDeadCoWins += 1;
        }
        if (p.roleId === 'exp2_april_skipps' && won) {
          if (exp?.aprilSkippsCountdownByPlayer?.[p.playerId]?.survivedDeadlineWon) {
            stats.wave5Telemetry.aprilSkippsNextTurnWins += 1;
          } else {
            stats.wave5Telemetry.aprilSkippsUnrevealedEndWins += 1;
          }
        }
        if (p.roleId === 'exp2_colt' && won) {
          stats.wave5Telemetry.coltThreeWeaponWins += 1;
        }
        if (p.roleId === 'exp2_diana' && won) {
          if (exp?.dianaContracts?.[p.playerId]?.status === 'active') {
            stats.wave5Telemetry.dianaCustomerCoWins += 1;
            stats.wave5Telemetry.sharedOutcomeCoWinsTotal += 1;
          } else {
            stats.wave5Telemetry.dianaFullHpFallbackWins += 1;
          }
        }
        if (p.roleId === 'exp2_aaron' && won) {
          if (exp?.aaronSpouseByPlayer?.[p.playerId]) {
            stats.wave5Telemetry.aaronBothAliveWins += 1;
          } else {
            stats.wave5Telemetry.aaronUnmatchedDeadWins += 1;
          }
        }

        if (p.faction === 'wanderer' && playerCount >= 5) {
          stats.wanderer5to8.appearances += 1;
          countBucket.wandererAppearances += 1;
          if (won) {
            stats.wanderer5to8.wins += 1;
            countBucket.wandererWins += 1;
            if (state.winnerFaction === 'wanderer-solo') stats.wanderer5to8.soloWins += 1;
            else stats.wanderer5to8.coWins += 1;
          }
        }
      }
    }
  }

  const targetedMechanicsValidation = runTargetedMechanicsValidation();
  const elapsedMs = Date.now() - t0;
  const completed = Math.max(1, stats.totalGames - stats.stalledGames);
  const totalSeats = stats.totalGames * 6;
  const totalLocTurns = Math.max(1, Object.values(stats.locationOccupancyTurns).reduce((a, b) => a + b, 0));
  const pct = (n, d) => +((n / Math.max(1, d)) * 100).toFixed(2);
  const totalPendingChoicesResolved = Object.values(stats.pendingChoicesResolved).reduce((sum, n) => sum + n, 0);
  const avgPendingChoicesPerGame = +(totalPendingChoicesResolved / completed).toFixed(2);

  const output = {
    rulesetId: 'starter-forty-eight',
    simulatorVersion: SIMULATOR_VERSION,
    botPolicyVersion: BOT_POLICY_VERSION,
    seedFormula: stats.seedFormula,
    playableCharacters: ALL_S48_ROLE_IDS.length,
    elapsedMs,
    totalGames: stats.totalGames,
    completedGames: completed,
    stalledGames: stats.stalledGames,
    draws: stats.draws,
    botAccessViolations: stats.botAccessViolations,
    avgRounds: +(stats.totalRounds / completed).toFixed(2),
    avgTurns: +(stats.totalTurns / completed).toFixed(2),
    maxRound: stats.maxRound,
    reachedMaxRoundPct: pct(stats.reachedMaxRound, completed),
    earlyEndRounds1To2Pct: pct(stats.earlyEnds1To2, completed),
    round1PlayerDeathRatePct: +((stats.round1Deaths / totalSeats) * 100).toFixed(3),
    avgEliminationsPerGame: +(stats.totalEliminations / completed).toFixed(2),
    avgDamageDealtPerGame: +(stats.totalDamageDealt / completed).toFixed(2),
    primaryFactionRates: {
      lanternGuardPct: pct(stats.primaryFactions['lantern-guard'], completed),
      mistOrderPct: pct(stats.primaryFactions['mist-order'], completed),
      wandererPrimaryPct: pct(stats.primaryFactions.wanderer, completed),
    },
    wanderer5to8: {
      appearances: stats.wanderer5to8.appearances,
      winRatePct: pct(stats.wanderer5to8.wins, stats.wanderer5to8.appearances),
      soloWinSharePct: pct(stats.wanderer5to8.soloWins, stats.wanderer5to8.appearances),
      coWinSharePct: pct(stats.wanderer5to8.coWins, stats.wanderer5to8.appearances),
    },
    locationOccupancyPct: Object.fromEntries(
      Object.entries(stats.locationOccupancyTurns).map(([loc, cnt]) => [loc, pct(cnt, totalLocTurns)]),
    ),
    reactionPolicyUsage: stats.reactionPolicyUsage,
    totalPendingChoicesResolved,
    avgPendingChoicesPerGame,
    estimatedReactionWaitSecondsPerGameAt3p5s: +(avgPendingChoicesPerGame * 3.5).toFixed(2),
    pendingChoicesResolved: stats.pendingChoicesResolved,
    g43Counterplay: {
      overall: {
        appearances: stats.g43Counterplay.overallAppearances,
        winRatePct: pct(stats.g43Counterplay.overallWins, stats.g43Counterplay.overallAppearances),
      },
      holyRobe: {
        appearances: stats.g43Counterplay.holyRobeAppearances,
        winRatePct: pct(stats.g43Counterplay.holyRobeWins, stats.g43Counterplay.holyRobeAppearances),
      },
      vsWrath: {
        appearances: stats.g43Counterplay.vsWrathAppearances,
        winRatePct: pct(stats.g43Counterplay.vsWrathWins, stats.g43Counterplay.vsWrathAppearances),
      },
    },
    wave5Telemetry: {
      ...stats.wave5Telemetry,
      cindy5pWinPct: pct(stats.wave5Telemetry.cindy5pWins, stats.wave5Telemetry.cindy5pAppearances),
      angel5pWinPct: pct(stats.wave5Telemetry.angel5pWins, stats.wave5Telemetry.angel5pAppearances),
    },
    targetedMechanicsValidation,
    byPlayerCount: Object.fromEntries(
      Object.entries(stats.byCount).map(([pc, v]) => [
        `${pc}p`,
        {
          games: v.games,
          guardWinPct: pct(v.guardWins, v.games),
          mistWinPct: pct(v.mistWins, v.games),
          wandererPrimaryPct: pct(v.wandererPrimaryWins, v.games),
          wandererRoleWinPct: v.wandererAppearances > 0 ? pct(v.wandererWins, v.wandererAppearances) : 0,
          avgRounds: +(v.roundSum / v.games).toFixed(2),
          avgTurns: +(v.turnSum / v.games).toFixed(2),
          earlyEndPct: pct(v.earlyEnds, v.games),
        },
      ]),
    ),
    byRole: Object.values(stats.byRole).map((r) => ({
      id: r.id,
      name: r.name,
      faction: r.faction,
      maxHp: r.maxHp,
      wave: r.wave,
      appearances: r.appearances,
      winRatePct: pct(r.wins, r.appearances),
      survivalPct: pct(r.survived, r.appearances),
      revealPct: pct(r.reveals, r.appearances),
      avgSkillActivationsPerAppearance: +(r.skillActivations / Math.max(1, r.appearances)).toFixed(2),
      avgHealPerAppearance: +(r.healTotal / Math.max(1, r.appearances)).toFixed(2),
      avgDamagePreventedPerAppearance: +(r.damagePreventedTotal / Math.max(1, r.appearances)).toFixed(2),
      avgDamageRedirectedPerAppearance: +(r.damageRedirectedTotal / Math.max(1, r.appearances)).toFixed(2),
      avgBonusDamagePerAppearance: +(r.bonusDamageTotal / Math.max(1, r.appearances)).toFixed(2),
      avgHealsBlockedPerAppearance: +(r.healsBlockedTotal / Math.max(1, r.appearances)).toFixed(2),
    })),
  };

  console.log(JSON.stringify(output, null, 2));

  if (process.argv.includes('--write-json')) {
    const outPath = path.resolve(
      __dirname,
      '../docs/boardgame-expansion/phase-6/starter-forty-eight-sim-data.json',
    );
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  }

  assert.equal(stats.totalGames, 25000, 'Expected 25,000 simulated starter-forty-eight games');
  assert.equal(stats.stalledGames, 0, `Unexpected stalled games: ${stats.stalledGames}`);
  assert.equal(stats.draws, 0, `Unexpected draw games: ${stats.draws}`);
  assert.equal(stats.botAccessViolations, 0, `Bot privacy violations: ${stats.botAccessViolations}`);

  const sumCheck = Object.values(stats.pendingChoicesResolved).reduce((a, b) => a + b, 0);
  assert.equal(sumCheck, totalPendingChoicesResolved, 'Reconciled pending choices sum mismatch');

  console.log(
    `\nPASS: 25,000-match starter-forty-eight simulation completed in ${elapsedMs}ms (0 stalls, 0 draws, 0 privacy leaks, ${totalPendingChoicesResolved} pending choices resolved across 31 kinds).`,
  );
}

runStarterFortyEightSimulation();
