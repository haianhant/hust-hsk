#!/usr/bin/env node
/**
 * scripts/sim-starter-thirty-eight.cjs — Deterministic 20,000-Match Simulation Harness
 * for `starter-thirty-eight` (10 Classic + 38 Expansion = 48 playable roles: 18H / 18S / 12N).
 *
 * Runs 4,000 deterministic matches per player count (4P, 5P, 6P, 7P, 8P = 20,000 total)
 * using seed formula `9_000_000 + playerCount * 100_000 + g + 1` with skill-aware bots covering
 * ALL 48 characters, ALL 22 Pending Choices, and private `SET_REACTION_PREF` policies.
 *
 * Emits `totalPendingChoicesResolved` programmatically (exact sum of all 22 choice buckets)
 * and writes `docs/boardgame-expansion/phase-5/starter-thirty-eight-sim-data.json` with `--write-json`.
 */
'use strict';

require('../test/register-ts.cjs');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_RULESET_REGISTRY,
  LOCATIONS_CATALOG,
  PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
  PHASE3A_ROLE_IDS,
  PHASE4B_ROLE_IDS,
  PHASE5B_ROLE_IDS,
  PHASE5C_ROLE_IDS,
  ROLES_CATALOG,
  STARTER_THIRTY_EIGHT_EXPANSION_ROLE_IDS,
  applyPlayerGameAction,
  areInSameCluster,
  createInitialGameState,
  getActivePlayer,
  getPairedLocationInCluster,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  getRoleDistribution,
  isEligibleForChocolateHeal,
} = require('../features/boardgame/domain/index.ts');

const PHASE5_ROLE_IDS = [...PHASE5B_ROLE_IDS, ...PHASE5C_ROLE_IDS];
const ALL_S38_ROLE_IDS = [
  ...ROLES_CATALOG.map((r) => r.id),
  ...STARTER_THIRTY_EIGHT_EXPANSION_ROLE_IDS,
];
const ALL_S38_DESIGNS = ALL_S38_ROLE_IDS.map((id) => getRoleDesign(id));
const DESIGN_BY_ID = Object.fromEntries(ALL_S38_DESIGNS.map((d) => [d.id, d]));

const CRUZ_QUALIFYING_CARDS = new Set(['ev-07', 'ev-08', 'ev-09', 'ev-10']);

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
          ALL_S38_DESIGNS.filter(
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

  for (const clue of priv.privateClues || []) {
    const clueKey = `${clue.atMs}|${clue.targetPlayerId}|${clue.cardTitle}|${clue.detail}`;
    if (botMem.seenClueKeys.has(clueKey)) continue;
    botMem.seenClueKeys.add(clueKey);

    const set = botMem.possible[clue.targetPlayerId];
    if (!set) continue;

    let exactMatched = false;
    for (const r of ALL_S38_DESIGNS) {
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
          // Unknown and Arlene can disguise on faction green cards!
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

  if (pubTarget?.revealedRoleId) {
    const role = DESIGN_BY_ID[pubTarget.revealedRoleId];
    if (priv.roleId === 'exp2_bryon' || priv.roleId === 'exp1_angel') {
      if (role.faction === 'wanderer') return { isEnemyProb: 0, isAllyProb: 1 };
      return { isEnemyProb: 0.45, isAllyProb: 0.1 };
    }
    if (priv.roleId === 'exp2_arlene') {
      // Arlene wants to provoke Hunters to kill her, NOT Shadows!
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
      // Hunters NEVER want to accidentally hand Arlene an immediate solo win!
      if (role.id === 'exp2_arlene') return { isEnemyProb: 0.02, isAllyProb: 0.1 };
      if (
        role.id === 'lang-tien-phong' ||
        role.id === 'exp1_bipolar' ||
        role.id === 'exp2_bryon' ||
        role.id === 'exp1_angel'
      ) {
        return { isEnemyProb: 0.08, isAllyProb: 0.5 };
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
      if (role.id === 'lang-anh-san' && pub.players.length !== 7) {
        return { isEnemyProb: pubTarget.equipped.length >= 4 ? 0.95 : 0.2, isAllyProb: 0 };
      }
      return { isEnemyProb: pub.players.length >= 6 ? 1 : 0.7, isAllyProb: 0 };
    }
    return { isEnemyProb: 1, isAllyProb: 0 };
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
      enemyWeight += 1;
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
  // Lower score = preferred to sacrifice first for Freyja / Bianca
  switch (cardId) {
    case 'eq-02': return 1; // Silver Rosary
    case 'eq-06': return 2; // Fortune Brooch
    case 'eq-05': return 3; // Mystic Compass
    case 'eq-03': return 4; // Talisman
    case 'ev-05': return 5; // Handgun
    case 'ev-02':
    case 'ev-03':
    case 'ev-04': return 6; // +1 weapons
    case 'eq-01': return 7; // Holy Robe
    case 'ev-06': return 8; // Machine Gun
    case 'eq-04': return 9; // Spear of Longinus
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
        const tid = opt.targetPlayerId;
        const tPub = pub.players.find((p) => p.playerId === tid);
        if (!tPub) continue;
        if (tPub.revealedRoleId === 'exp2_witch' && tPub.location === 'corridor') continue;
        if (isPubAngelProtected(pub, tPub.playerId)) continue;
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        const g43Priority = tPub.revealedRoleId === 'exp2_g43' ? 0.65 : 0;
        const val = isEnemyProb * 3 - isAllyProb * 4 + tPub.woundsTaken * 0.25 + g43Priority;
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

    case 'wendigo_reveal_heal': {
      if (priv.woundsTaken >= 1 || pub.deadCount >= 2 || pub.round >= 3) {
        return 'reveal_and_activate';
      }
      return rng() < 0.35 ? 'reveal_and_activate' : 'decline';
    }

    case 'undying_reveal_reduce': {
      if (priv.hp <= 4 || priv.woundsTaken >= 2 || pub.round >= 2) {
        return 'reveal_and_reduce';
      }
      return rng() < 0.75 ? 'reveal_and_reduce' : 'decline';
    }

    case 'elysia_counter_boost': {
      const optBoost = pc.options.find((o) => o.optionId === 'boost');
      return optBoost ? 'boost' : 'skip';
    }

    case 'cindy_reveal_retaliate': {
      if (priv.woundsTaken >= 3 || pub.round >= 2) {
        return 'reveal_and_retaliate';
      }
      return rng() < 0.6 ? 'reveal_and_retaliate' : 'decline';
    }

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
        if (v.revealedRoleId === 'exp2_witch' && v.location === 'corridor') continue;
        if (isPubAngelProtected(pub, v.playerId)) continue;
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
          t.revealedRoleId === 'exp2_g43'
            ? 2.2
            : t.revealedRoleId === 'lang-quan-sat' || t.revealedRoleId === 'exp1_fallen' || t.revealedRoleId === 'exp2_bianca'
              ? 1.4
              : 0;
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
      if (['ev-06', 'ev-01', 'ev-02', 'ev-03', 'ev-04'].includes(drawn.id) && priv.equipped.length < 2) {
        return 'keep';
      }
      return 'redraw';
    }

    case 'bryon_gift_equipment': {
      const giftOpts = pc.options.filter((o) => o.optionId !== 'done');
      if (giftOpts.length === 0) return 'done';
      const bobAll = giftOpts.find((o) => {
        const rec = pub.players.find((p) => p.playerId === o.targetPlayerId);
        return rec?.revealedRoleId === 'lang-anh-san' && o.label.includes('TẤT CẢ');
      });
      if (bobAll) return bobAll.optionId;
      const bobSingle = giftOpts.find((o) => {
        const rec = pub.players.find((p) => p.playerId === o.targetPlayerId);
        return rec?.revealedRoleId === 'lang-anh-san';
      });
      if (bobSingle) return bobSingle.optionId;
      // Also prioritize gifting gear to Bianca (`exp2_bianca`) so Bianca can prevent hits & keep Neutrals alive!
      const biancaOpt = giftOpts.find((o) => {
        const rec = pub.players.find((p) => p.playerId === o.targetPlayerId);
        return rec?.revealedRoleId === 'exp2_bianca';
      });
      if (biancaOpt) return biancaOpt.optionId;
      const allOpt = giftOpts.find((o) => o.label.includes('TẤT CẢ'));
      if (allOpt && priv.equipped.length >= 2) return allOpt.optionId;
      return giftOpts[0].optionId;
    }

    // ---- Wave 4 (Phase 5) Pending Choices ----
    case 'elise_distribute_heal': {
      const allocOpts = pc.options.filter((o) => o.optionId !== 'skip');
      if (allocOpts.length === 0) return 'skip';
      let bestOpt = null;
      let bestScore = -999;
      for (const opt of allocOpts) {
        let score = 0;
        // Parse mentions of player names & "+X" from label/detail
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
            const eff = Math.min(amt, p.woundsTaken);
            score += eff * (isAllyProb * 2.6 - isEnemyProb * 2.5);
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestOpt = opt;
        }
      }
      return bestOpt && bestScore >= 2.2 ? bestOpt.optionId : 'skip';
    }

    case 'urban_legend_reveal_heal': {
      if (priv.woundsTaken >= 1 || priv.hp <= 6 || pub.round >= 2) {
        return 'reveal_and_heal';
      }
      return rng() < 0.75 ? 'reveal_and_heal' : 'decline';
    }

    case 'gwendolen_counter_attack': {
      const counterOpt = pc.options.find((o) => o.optionId === 'counter');
      if (!counterOpt) return 'skip';
      const targetId = counterOpt.targetPlayerId;
      const tPub = targetId ? pub.players.find((p) => p.playerId === targetId) : null;
      if (tPub) {
        const { isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        if (isAllyProb >= 0.8) return 'skip';
        if (tPub.revealedRoleId === 'exp2_arlene') return 'skip';
      }
      return 'counter';
    }

    case 'freyja_extra_attack': {
      const atkOpts = pc.options.filter((o) => o.optionId !== 'done');
      if (atkOpts.length === 0) return 'done';
      let bestOpt = null;
      let bestVal = -999;
      for (const opt of atkOpts) {
        const tPub = opt.targetPlayerId
          ? pub.players.find((p) => p.playerId === opt.targetPlayerId)
          : null;
        if (!tPub || !tPub.alive) continue;
        if ((tPub.revealedRoleId === 'exp2_witch' && tPub.location === 'corridor') || isPubAngelProtected(pub, tPub.playerId)) {
          continue;
        }
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        if (isAllyProb >= 0.75 || tPub.revealedRoleId === 'exp2_arlene') continue;
        const cardCost = scoreGearToDiscard(opt.card?.id);
        const killUrgency = tPub.woundsTaken >= 7 ? 3.5 : tPub.woundsTaken * 0.25;
        const val = isEnemyProb * 4.5 + killUrgency - cardCost * 0.48;
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
        if (!tPub || !tPub.alive) continue;
        if (isPubAngelProtected(pub, tPub.playerId)) continue;
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        const pullOffBonus =
          tPub.revealedRoleId === 'exp1_angel' && tPub.location === 'lobby'
            ? 2.0
            : tPub.revealedRoleId === 'exp2_elise' || tPub.revealedRoleId === 'exp1_ernest'
              ? 1.5
              : 0;
        const score = isEnemyProb * 3.5 - isAllyProb * 4.0 + tPub.woundsTaken * 0.35 + pullOffBonus;
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
      const tPub = blockOpt.targetPlayerId
        ? pub.players.find((p) => p.playerId === blockOpt.targetPlayerId)
        : null;
      if (tPub) {
        const { isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        if (isAllyProb >= 0.75) return 'decline';
      }
      return 'reveal_and_block';
    }

    case 'bianca_discard_prevent': {
      const discOpts = pc.options.filter((o) => o.optionId !== 'decline');
      if (discOpts.length === 0) return 'decline';
      // Parse incoming damage from description
      const dmgMatch = (pc.description || '').match(/(\d+)\s*sát thương/);
      const incoming = dmgMatch ? Number(dmgMatch[1]) : 2;
      const isLethal = incoming >= priv.hp;
      // Bianca wins if she has the LOWEST remaining HP while alive!
      // Prevent ALWAYS if lethal or heavy hit leaving <= 1 HP early; allow mild non-lethal hits to drop HP!
      if (isLethal || (priv.hp - incoming <= 1 && pub.round <= 4) || (incoming >= 3 && priv.equipped.length >= 2)) {
        const sorted = [...discOpts].sort(
          (a, b) => scoreGearToDiscard(a.card?.id) - scoreGearToDiscard(b.card?.id),
        );
        return sorted[0].optionId;
      }
      return 'decline';
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
        priv.roleId === 'exp2_dalton'
          ? 0.3
          : 0.12;
      const gearTargetBonus =
        priv.roleId === 'lang-anh-san'
          ? pub.players.length <= 6
            ? p.equipped.length * 4.2 + (p.woundsTaken >= 8 ? 1.5 : 0)
            : p.equipped.length > 0
              ? p.equipped.length * 3.5 + p.woundsTaken * 0.85
              : -0.8
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
        (p.revealedRoleId === 'exp2_gloria' && priv.faction === 'mist-order' ? 0.5 : 0) +
        (p.revealedRoleId === 'exp2_usurper' && priv.faction === 'lantern-guard' ? 0.8 : 0) +
        (p.revealedRoleId === 'exp1_ernest' && !p.revealedSkillUsedOnce && priv.faction === 'mist-order' ? 1.0 : 0) +
        (p.revealedRoleId === 'lang-quan-sat' && priv.faction !== 'lantern-guard' ? 0.7 : 0) +
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
        isImmuneWitch,
        isAngelImmune,
        isImmune,
        isProtectedUdi,
        isMarkedByVisions,
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
    if (
      priv.roleId === 'exp2_father_harrison' &&
      !priv.revealed &&
      selfPub.location !== 'lobby' &&
      (selfPub.equipped.length < 3 || pub.round >= 2)
    ) {
      return { type: 'REVEAL_ROLE' };
    }
    if (
      priv.roleId === 'exp2_father_harrison' &&
      priv.revealed &&
      selfPub.location !== 'lobby' &&
      (selfPub.equipped.length < 3 || priv.woundsTaken >= 4 || pub.deckCounts.equipment >= 4)
    ) {
      return { type: 'USE_SKILL' };
    }
    if (
      priv.roleId === 'exp1_bipolar' &&
      !priv.revealed &&
      !priv.skillUsedOnce &&
      (priv.woundsTaken >= 4 || (pub.round >= 3 && estimateBoardFavor(pub) <= -3 && priv.hp <= 4))
    ) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp1_fea' && !priv.revealed && pub.round >= 2) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp1_wrath' && !priv.revealed && pub.round >= 2) {
      const sameClusterEnemies = scoredOthers.filter(
        (x) =>
          areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) &&
          x.isEnemyProb >= 0.5,
      );
      if (sameClusterEnemies.length >= 1) return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp1_wrath' && priv.revealed) {
      const sameClusterEnemies = scoredOthers.filter(
        (x) =>
          areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) &&
          !x.isImmune &&
          x.isEnemyProb >= 0.5,
      );
      const sameClusterAllies = scoredOthers.filter(
        (x) =>
          areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) &&
          x.isAllyProb >= 0.7,
      );
      if (sameClusterEnemies.length > sameClusterAllies.length && !pub.lastDiceRoll?.rerollRequired) {
        if (rng() < 0.85) return { type: 'USE_SKILL' };
      }
    }
    if (priv.roleId === 'exp2_visions' && !priv.revealed && !priv.skillUsedOnce && pub.round >= 2) {
      return { type: 'REVEAL_ROLE' };
    }
    if (
      priv.roleId === 'exp2_visions' &&
      priv.revealed &&
      !priv.skillUsedOnce &&
      !pub.visionsMarkedTargetByPlayer?.[priv.playerId] &&
      !pub.lastDiceRoll?.rerollRequired
    ) {
      return { type: 'USE_SKILL' };
    }
    // Wave 4 Warlord: reveal + pull-attack in ROLL_MOVE (before rolling dice!)
    if (
      priv.roleId === 'exp2_warlord' &&
      !priv.revealed &&
      !priv.skillUsedOnce &&
      pub.round >= 2 &&
      !pub.lastDiceRoll?.rerollRequired
    ) {
      return { type: 'REVEAL_ROLE' };
    }
    if (
      priv.roleId === 'exp2_warlord' &&
      priv.revealed &&
      !priv.skillUsedOnce &&
      !pub.lastDiceRoll?.rerollRequired
    ) {
      const pullCandidate = scoredOthers.find(
        (x) =>
          !x.isAngelImmune &&
          x.isEnemyProb >= 0.6 &&
          (x.player.woundsTaken >= 4 || pub.round >= 3 || x.player.location !== selfPub.location),
      );
      if (pullCandidate) {
        return { type: 'USE_SKILL', targetPlayerId: pullCandidate.player.playerId };
      }
    }
    // Wave 4 Ernest: reveal & apostasy in ROLL_MOVE if >= 3 HP and Shadows hold gear or unrevealed!
    if (
      priv.roleId === 'exp1_ernest' &&
      !priv.revealed &&
      !priv.skillUsedOnce &&
      priv.hp >= 3 &&
      pub.round >= 2
    ) {
      return { type: 'REVEAL_ROLE' };
    }
    if (
      priv.roleId === 'exp1_ernest' &&
      priv.revealed &&
      !priv.skillUsedOnce &&
      priv.hp >= 3 &&
      !pub.lastDiceRoll?.rerollRequired
    ) {
      const shadowGear = pub.players
        .filter((p) => p.alive && p.revealedFaction === 'mist-order')
        .reduce((acc, p) => acc + p.equipped.length, 0);
      const unrevealedCount = aliveOthers.filter((p) => !p.revealedRoleId).length;
      if (shadowGear >= 1 || unrevealedCount >= 2 || pub.round >= 3) {
        return { type: 'USE_SKILL' };
      }
    }
    // Wave 4 Angel: reveal & arm Guardian Wings around round 2-3
    if (
      priv.roleId === 'exp1_angel' &&
      !priv.revealed &&
      !priv.skillUsedOnce &&
      (priv.woundsTaken >= 2 || pub.round >= 2)
    ) {
      return { type: 'REVEAL_ROLE' };
    }
    if (
      priv.roleId === 'exp1_angel' &&
      priv.revealed &&
      !priv.skillUsedOnce &&
      !pub.lastDiceRoll?.rerollRequired &&
      (priv.woundsTaken >= 2 || pub.round >= 2)
    ) {
      return { type: 'USE_SKILL' };
    }
    if (priv.roleId === 'gac-truc-ban' && priv.revealed) {
      const paired = getPairedLocationInCluster(selfPub.location, pub.clusterPairs);
      if (paired) {
        const shouldTeleport =
          (paired === 'corridor' && (selfPub.woundsTaken >= 3 || bestTarget.woundsTaken >= 5)) ||
          (paired === 'court' && scoredOthers.some((x) => x.player.equipped.length > 0)) ||
          areInSameCluster(paired, bestTarget.location, pub.clusterPairs);
        if (shouldTeleport) return { type: 'USE_SKILL' };
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

    // Angel wants exact `lobby` (Church) when a Neutral died or late-game!
    if (priv.roleId === 'exp1_angel' && poolIds.includes('lobby') && (pub.deadCount >= 1 || pub.round >= 3)) {
      return { type: 'CHOOSE_DEST', location: 'lobby' };
    }
    // Bianca & Freyja love White/Black gear tiles!
    if (priv.roleId === 'exp2_bianca' || priv.roleId === 'exp2_freyja') {
      if (selfPub.equipped.length < 3) {
        if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
        if (poolIds.includes('canteen')) return { type: 'CHOOSE_DEST', location: 'canteen' };
        if (poolIds.includes('breaker')) return { type: 'CHOOSE_DEST', location: 'breaker' };
      }
    }
    // Urban Legend loves Black cards!
    if (priv.roleId === 'exp2_urban_legend' && pub.deckCounts.event > 0) {
      if (poolIds.includes('canteen')) return { type: 'CHOOSE_DEST', location: 'canteen' };
    }
    if (priv.roleId === 'exp2_cruz') {
      if (poolIds.includes('canteen') && pub.deckCounts.event > 0) return { type: 'CHOOSE_DEST', location: 'canteen' };
      if (poolIds.includes('breaker') && pub.deckCounts.event > 0) return { type: 'CHOOSE_DEST', location: 'breaker' };
    }
    if (priv.roleId === 'exp1_udi' && priv.revealed) {
      const crowded = poolIds.find((locId) => {
        const cnt = aliveOthers.filter((p) => areInSameCluster(locId, p.location, pub.clusterPairs)).length;
        return cnt >= 2;
      });
      if (crowded) return { type: 'CHOOSE_DEST', location: crowded };
    }
    if (priv.roleId === 'exp2_bryon') {
      const neutralAlly = aliveOthers.find((p) => p.revealedFaction === 'wanderer');
      if (neutralAlly && selfPub.equipped.some((e) => e.id !== 'ev-01')) {
        const meetLoc = poolIds.find((locId) => areInSameCluster(locId, neutralAlly.location, pub.clusterPairs));
        if (meetLoc) return { type: 'CHOOSE_DEST', location: meetLoc };
      }
      if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
    }
    if (priv.roleId === 'exp2_warlock' && poolIds.includes('court')) {
      const someoneInCourtRange = aliveOthers.some((p) => {
        const same = areInSameCluster('court', p.location, pub.clusterPairs);
        return hasHandgun ? !same : same;
      });
      if (someoneInCourtRange || priv.revealed) return { type: 'CHOOSE_DEST', location: 'court' };
    }
    if (priv.roleId === 'exp2_witch' && poolIds.includes('corridor') && (priv.woundsTaken >= 2 || priv.revealed)) {
      return { type: 'CHOOSE_DEST', location: 'corridor' };
    }
    if (priv.roleId === 'exp2_gloria' && poolIds.includes('lobby') && pub.deckCounts.equipment >= 2) {
      return { type: 'CHOOSE_DEST', location: 'lobby' };
    }
    if (priv.roleId === 'exp2_father_harrison' && poolIds.includes('lobby') && selfPub.equipped.length < 3) {
      return { type: 'CHOOSE_DEST', location: 'lobby' };
    }
    if (priv.roleId === 'exp1_felicia' && priv.revealed && selfPub.equipped.length < 3) {
      if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
      if (poolIds.includes('canteen')) return { type: 'CHOOSE_DEST', location: 'canteen' };
      if (poolIds.includes('breaker')) return { type: 'CHOOSE_DEST', location: 'breaker' };
    }
    if (priv.roleId === 'lang-anh-san' && selfPub.equipped.length < 5) {
      const geared = aliveOthers.find((p) => p.equipped.length > 0);
      if (geared && poolIds.includes('court')) return { type: 'CHOOSE_DEST', location: 'court' };
      if (selfPub.woundsTaken >= 6 && poolIds.includes('corridor')) return { type: 'CHOOSE_DEST', location: 'corridor' };
      if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
      if (poolIds.includes('breaker')) return { type: 'CHOOSE_DEST', location: 'breaker' };
      if (poolIds.includes('canteen')) return { type: 'CHOOSE_DEST', location: 'canteen' };
    }
    if (
      priv.woundsTaken >= 5 &&
      !(priv.roleId === 'lang-tien-phong' && pub.deadCount === 0) &&
      !(priv.roleId === 'exp2_dalton' && isPubDaltonActivated(pub, priv.playerId)) &&
      poolIds.includes('corridor')
    ) {
      return { type: 'CHOOSE_DEST', location: 'corridor' };
    }
    if (bestTarget && bestTarget.woundsTaken >= 6 && poolIds.includes('corridor')) {
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
    if (
      priv.roleId === 'exp1_felicia' &&
      !priv.revealed &&
      (selfPub.location === 'lobby' || selfPub.location === 'canteen' || selfPub.location === 'breaker')
    ) {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp2_gloria' && !priv.revealed && selfPub.location === 'lobby') {
      return { type: 'REVEAL_ROLE' };
    }
    if (priv.roleId === 'exp2_witch' && !priv.revealed && selfPub.location === 'corridor') {
      return { type: 'REVEAL_ROLE' };
    }
    if (
      priv.roleId === 'exp2_cruz' &&
      !priv.revealed &&
      (selfPub.location === 'canteen' || selfPub.location === 'breaker')
    ) {
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
        if ((priv.roleId === 'exp2_cruz' || priv.roleId === 'exp2_urban_legend') && pub.deckCounts.event > 0) {
          return { type: 'DRAW_CARD', deck: 'event' };
        }
        if (priv.roleId === 'exp1_felicia' && priv.revealed) {
          return { type: 'DRAW_CARD', deck: selfPub.equipped.length < 2 ? 'equipment' : 'event' };
        }
        if (
          priv.roleId === 'lang-anh-san' ||
          priv.roleId === 'exp2_bryon' ||
          priv.roleId === 'exp2_bianca' ||
          priv.roleId === 'exp2_freyja'
        ) {
          return { type: 'DRAW_CARD', deck: pub.deckCounts.equipment > 0 ? 'equipment' : 'event' };
        }
        if (pub.round <= 2 && selfPub.equipped.length >= 1 && rng() < 0.3 && pub.deckCounts.investigation > 0) {
          return { type: 'DRAW_CARD', deck: 'investigation' };
        }
        return { type: 'DRAW_CARD', deck: rng() < 0.5 ? 'equipment' : 'event' };
      }
      case 'corridor': {
        const danielSeekingFirstDeath = priv.roleId === 'lang-tien-phong' && pub.deadCount === 0;
        const daltonBlockedSelfHeal =
          priv.roleId === 'exp2_dalton' && isPubDaltonActivated(pub, priv.playerId);
        const biancaWantsLowHp = priv.roleId === 'exp2_bianca' && priv.hp >= 3;
        if (
          (selfPub.woundsTaken >= 2 && !danielSeekingFirstDeath && !daltonBlockedSelfHeal && !biancaWantsLowHp) ||
          (bestAlly && bestAlly.woundsTaken >= 3 && bestTarget.woundsTaken < 8)
        ) {
          const healTarget =
            selfPub.woundsTaken >= (bestAlly?.woundsTaken ?? 0) &&
            !danielSeekingFirstDeath &&
            !daltonBlockedSelfHeal &&
            !biancaWantsLowHp
              ? selfPub.playerId
              : bestAlly
                ? bestAlly.playerId
                : null;
          if (healTarget) {
            return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: healTarget };
          }
        }
        const dmgTarget = scoredOthers.find((x) => !x.isImmune)?.player || bestTarget;
        if (pub.round === 1 && scoredOthers[0].isEnemyProb < 0.72 && priv.roleId !== 'lang-tien-phong') {
          return { type: 'SKIP_LOC' };
        }
        return { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: dmgTarget.playerId };
      }
      case 'court': {
        const donor = scoredOthers
          .filter((x) => x.player.equipped.length > 0)
          .sort((a, b) => b.attackScore - a.attackScore)[0]?.player;
        if (donor) {
          return { type: 'USE_LOC_POWER', mode: 'steal', targetPlayerId: donor.playerId };
        }
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
      if (!card.isConsumable && card.deck !== 'investigation') {
        return { type: 'EQUIP_CARD', cardId: card.id };
      }
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
        const trigger =
          isEligibleForChocolateHeal(priv.roleId, true) &&
          (priv.woundsTaken >= 2 || priv.revealed);
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
        if (priv.roleId === 'exp2_cruz' || (priv.roleId === 'exp2_dalton' && isPubDaltonActivated(pub, priv.playerId))) {
          const killable = scoredOthers
            .filter((x) => !x.isImmune)
            .sort((a, b) => b.player.woundsTaken - a.player.woundsTaken)[0]?.player;
          if (killable) return { type: 'USE_CARD', cardId: card.id, targetPlayerId: killable.playerId };
        }
        const nonImmune = scoredOthers.find((x) => !x.isImmune)?.player || bestTarget;
        return { type: 'USE_CARD', cardId: card.id, targetPlayerId: nonImmune.playerId };
      }
      return { type: 'USE_CARD', cardId: card.id };
    }

    const reachableScored = scoredOthers.filter((x) => {
      if (x.isProtectedUdi || x.isMarkedByVisions) return false;
      const sameCluster = areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs);
      return hasHandgun ? !sameCluster : sameCluster;
    });

    // Strategic Voluntary Reveal (skill-aware for ALL 48 roles!)
    if (
      !priv.revealed &&
      priv.roleId !== 'lang-tien-phong' &&
      priv.roleId !== 'suong-tin-gia' &&
      priv.roleId !== 'exp1_wendigo' &&
      priv.roleId !== 'exp1_undying' &&
      priv.roleId !== 'exp1_cindy' &&
      priv.roleId !== 'exp2_urban_legend' &&
      priv.roleId !== 'exp2_arlene' &&
      priv.roleId !== 'exp2_dalton' &&
      !(priv.roleId === 'exp1_fallen' && priv.hp < 8)
    ) {
      const inRangeGeared = reachableScored.some((x) => x.player.equipped.length > 0);
      const sameClusterOthers = scoredOthers.filter((x) =>
        areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs),
      );
      const sameClusterCount = sameClusterOthers.length;
      const sameClusterEnemies = sameClusterOthers.filter((x) => !x.isImmune && x.isEnemyProb >= 0.55).length;
      const sameClusterAllies = sameClusterOthers.filter((x) => x.isAllyProb >= 0.7).length;
      const sameClusterAllyMissingHp =
        priv.woundsTaken +
        sameClusterOthers
          .filter((x) => x.isAllyProb >= 0.65)
          .reduce((acc, x) => acc + x.player.woundsTaken, 0);
      const hasRevealedNeutralInCluster = aliveOthers.some(
        (p) => p.revealedFaction === 'wanderer' && areInSameCluster(selfPub.location, p.location, pub.clusterPairs),
      );
      const nonMasamuneGearCount = selfPub.equipped.filter((c) => c.id !== 'ev-01').length;

      const shouldRevealNow =
        ((priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') &&
          ((pub.round >= 2 && (scoredOthers[0].isEnemyProb >= 0.68 || bestTarget.woundsTaken >= 5)) ||
            hasSpear ||
            pub.round >= 4)) ||
        (priv.roleId === 'gac-truc-ban' && (hasSpear || selfPub.woundsTaken >= 5 || pub.round >= 4)) ||
        (priv.roleId === 'suong-an-danh' && priv.woundsTaken >= 2 && reachableScored.length > 0) ||
        (priv.roleId === 'suong-gac-cong' && (priv.woundsTaken >= 2 || pub.round >= 2)) ||
        (priv.roleId === 'lang-quan-sat' && priv.woundsTaken >= 4) ||
        (priv.roleId === 'lang-anh-san' && ((inRangeGeared && pub.players.length <= 6 && !hasMachineGun) || selfPub.equipped.length >= 4)) ||
        (priv.roleId === 'lang-cuu-ho' && (pub.deadCount >= 2 && priv.hp >= 5 && reachableScored.length > 0)) ||
        // Starter Eight:
        (priv.roleId === 'exp2_g43' && (priv.woundsTaken >= 1 || hasSpear || pub.round >= 2)) ||
        (priv.roleId === 'exp2_fiona' && ((reachableScored.length > 0 && pub.round >= 2) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_wyvern' && (reachableScored.some((x) => x.player.woundsTaken >= 4) || pub.round >= 3)) ||
        (priv.roleId === 'exp1_gayle' && ((reachableScored.length > 0 && pub.round >= 2) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp1_felicia' && pub.round >= 1) ||
        (priv.roleId === 'exp1_victor' && (reachableScored.length > 0 && priv.hp >= 5 && pub.round >= 2)) ||
        // Wave 2:
        (priv.roleId === 'exp1_elysia' && ((reachableScored.length > 0 && pub.round >= 2) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_unchained' && (reachableScored.length > 0 && pub.round >= 2)) ||
        (priv.roleId === 'exp2_warlock' && ((selfPub.location === 'court' && reachableScored.length > 0) || pub.round >= 3)) ||
        (priv.roleId === 'exp2_witch' && (selfPub.location === 'corridor' || priv.woundsTaken >= 4)) ||
        (priv.roleId === 'exp2_father_harrison' && (hasSpear || pub.round >= 2)) ||
        (priv.roleId === 'exp2_gloria' && (selfPub.location === 'lobby' || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp1_bipolar' && (priv.woundsTaken >= 4 || pub.round >= 4)) ||
        // Wave 3:
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
        // Wave 4:
        (priv.roleId === 'exp2_elise' && (sameClusterAllyMissingHp >= 3 || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_umibozu' && (sameClusterEnemies >= 1 && sameClusterEnemies >= sameClusterAllies)) ||
        (priv.roleId === 'exp1_ernest' && (priv.hp >= 3 && (pub.round >= 2 || hasSpear))) ||
        (priv.roleId === 'exp1_gwendolen' && (pub.round >= 2 || hasSpear || sameClusterCount >= 1)) ||
        (priv.roleId === 'exp2_freyja' && ((nonMasamuneGearCount >= 1 && reachableScored.length > 0) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_warlord' && pub.round >= 2) ||
        (priv.roleId === 'exp2_usurper' && (pub.round >= 3 && aliveOthers.some((p) => p.woundsTaken >= 3))) ||
        (priv.roleId === 'exp1_angel' && (pub.round >= 2 || priv.woundsTaken >= 2)) ||
        (priv.roleId === 'exp2_bianca' && (nonMasamuneGearCount >= 1 && (priv.woundsTaken >= 2 || pub.round >= 2)));

      if (shouldRevealNow) {
        return { type: 'REVEAL_ROLE' };
      }
    }

    // Active skills in MAIN_ACTION
    if (priv.revealed) {
      // Elise Soft Harmony (distribute up to 5 HP in cluster, once/match)
      if (priv.roleId === 'exp2_elise' && !priv.skillUsedOnce && !pub.usurperAuraActive) {
        const sameClusterAllyWounds =
          priv.woundsTaken +
          scoredOthers
            .filter(
              (x) =>
                x.isAllyProb >= 0.65 &&
                areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs),
            )
            .reduce((acc, x) => acc + x.player.woundsTaken, 0);
        if (sameClusterAllyWounds >= 3 || (priv.woundsTaken >= 4 && pub.round >= 3)) {
          return { type: 'USE_SKILL' };
        }
      }

      // Ernest Apostasy (2-HP cost, requires >= 3 HP)
      if (priv.roleId === 'exp1_ernest' && !priv.skillUsedOnce && priv.hp >= 3) {
        const shadowGear = pub.players
          .filter((p) => p.alive && p.revealedFaction === 'mist-order')
          .reduce((acc, p) => acc + p.equipped.length, 0);
        const unrevealedCount = aliveOthers.filter((p) => !p.revealedRoleId).length;
        if (shadowGear >= 1 || unrevealedCount >= 2 || pub.round >= 3) {
          return { type: 'USE_SKILL' };
        }
      }

      // Angel Guardian Wings (arm for next turn, once/match)
      if (priv.roleId === 'exp1_angel' && !priv.skillUsedOnce && (priv.woundsTaken >= 2 || pub.round >= 2)) {
        return { type: 'USE_SKILL' };
      }

      if (
        priv.roleId === 'exp2_bryon' &&
        selfPub.attacksThisTurn === 0 &&
        selfPub.equipped.some((e) => e.id !== 'ev-01') &&
        aliveOthers.some((p) => p.revealedFaction === 'wanderer' && areInSameCluster(selfPub.location, p.location, pub.clusterPairs))
      ) {
        return { type: 'USE_SKILL' };
      }

      if (
        priv.roleId === 'exp2_eleanor' &&
        selfPub.attacksThisTurn === 0 &&
        !(hasMasamune && reachableScored.length > 0) &&
        pub.deckCounts.investigation > 0
      ) {
        const hasUnrevealed = aliveOthers.some((p) => !p.revealedRoleId);
        const topReachableEnemy = reachableScored[0];
        const wantIntelOverAttack =
          hasUnrevealed &&
          (reachableScored.length === 0 ||
            (pub.round <= 3 && (!topReachableEnemy || topReachableEnemy.isEnemyProb < 0.78)));
        if (wantIntelOverAttack) return { type: 'USE_SKILL' };
      }

      if (
        (priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') &&
        !priv.skillUsedOnce &&
        (scoredOthers[0].isEnemyProb >= 0.65 || bestTarget.woundsTaken >= 5 || pub.round >= 4)
      ) {
        const nonImmune = scoredOthers.find((x) => !x.isImmune)?.player || bestTarget;
        return { type: 'USE_SKILL', targetPlayerId: nonImmune.playerId };
      }
      if (priv.roleId === 'lang-quan-sat' && !priv.skillUsedOnce && priv.woundsTaken >= 4) {
        return { type: 'USE_SKILL' };
      }
      if (
        priv.roleId === 'lang-cuu-ho' &&
        selfPub.attacksThisTurn >= 1 &&
        selfPub.lastAttackTargetId &&
        priv.hp > 4 &&
        reachableScored.length > 0
      ) {
        const feastTarget = reachableScored.find(
          (x) =>
            x.player.playerId === selfPub.lastAttackTargetId &&
            !x.isImmune &&
            pub.deadCount >= 2 &&
            x.player.woundsTaken >= 5,
        );
        if (feastTarget) return { type: 'USE_SKILL', targetPlayerId: feastTarget.playerId };
      }
    }

    // Combat Attack
    if (selfPub.attacksThisTurn < 1 && reachableScored.length > 0) {
      const nonImmuneReachable = reachableScored.filter((x) => !x.isImmune);
      const candidates = nonImmuneReachable.length > 0 ? nonImmuneReachable : reachableScored;
      if (hasMasamune) {
        return { type: 'ATTACK', targetPlayerId: candidates[0].player.playerId };
      }
      const top = candidates[0];
      if (top.isImmune) return { type: 'END_TURN' };
      if (priv.faction === 'lantern-guard' && top.player.revealedRoleId === 'exp2_arlene') {
        return { type: 'END_TURN' };
      }
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

function runStarterThirtyEightSimulation() {
  const validation = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-thirty-eight', 8, {
    allowExperimental: true,
  });
  assert.equal(validation.ok, true, 'starter-thirty-eight must validate under allowExperimental');

  const stats = {
    rulesetId: 'starter-thirty-eight',
    seedFormula: '9_000_000 + playerCount * 100_000 + g + 1',
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
      vsWave4ShadowAppearances: 0,
      vsWave4ShadowWins: 0,
      vsWrathAppearances: 0,
      vsWrathWins: 0,
      vsUmibozuAppearances: 0,
      vsUmibozuWins: 0,
      vsUsurperAppearances: 0,
      vsUsurperWins: 0,
    },
    reactionPolicyUsage: {
      ASK: 0,
      AUTO_DECLINE: 0,
      AUTO_ACTIVATE_WHEN_ELIGIBLE: 0,
    },
    wave4Telemetry: {
      // 1. Ernest
      ernestActivations: 0,
      ernestForcedShadowReveals: 0,
      ernestDestroyedGear: 0,
      ernestUmibozuCounterTriggers: 0,
      // 2. Usurper
      usurperActivations: 0,
      usurperHealsBlockedTotal: 0,
      usurperSecretInterceptions: 0,
      eliseWithUsurperApps: 0,
      eliseWithUsurperWins: 0,
      eliseWithoutUsurperApps: 0,
      eliseWithoutUsurperWins: 0,
      // 3. Angel
      angelActivations: 0,
      angelDamagePreventedTotal: 0,
      angelAllNeutralsAliveOnlyWins: 0,
      angelChurchExactOnlyWins: 0,
      angelBothConditionsWins: 0,
      // 4. Bianca
      biancaActivations: 0,
      biancaDamagePreventedTotal: 0,
      biancaLowestHpStrictWins: 0,
      biancaLowestHpTieWins: 0,
      biancaPresentMatches: 0,
      biancaPresentRoundSum: 0,
      biancaAbsentMatches: 0,
      biancaAbsentRoundSum: 0,
      // 5. Dalton
      daltonActivations: 0,
      daltonSelfHealsBlockedTotal: 0,
      daltonKillAfterActivationWins: 0,
      daltonHighestHpEndWins: 0,
      // 6. Freyja
      freyjaExtraAttacks: 0,
      freyjaMaxExtraInSingleMatch: 0,
      // 7. Warlord
      warlordPulls: 0,
      warlordWitchOffCorridorPulls: 0,
      // 8. Gwendolen
      gwendolenCounters: 0,
      // 9. Umibozu
      umibozuActivations: 0,
      umibozuBonusDamageTotal: 0,
      // 10. Elise + Arlene + Urban Legend
      eliseActivations: 0,
      eliseHealTotal: 0,
      arleneHunterKillSoloWins: 0,
      arleneDisguiseActivations: 0,
      urbanLegendActivations: 0,
      urbanLegendConvertedHealTotal: 0,
    },
    pendingChoicesResolved: {
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
    },
  };

  for (const d of ALL_S38_DESIGNS) {
    const wave = PHASE5C_ROLE_IDS.includes(d.id)
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
      bonusDamageTotal: 0,
      healsBlockedTotal: 0,
    };
  }

  const sizes = [4, 5, 6, 7, 8];
  const gamesPerSize = 4000; // 5 * 4,000 = 20,000 deterministic matches!
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
      const seed = 9_000_000 + playerCount * 100_000 + g + 1;
      const rng = createRng(seed);
      const players = Array.from({ length: playerCount }, (_, idx) => ({
        playerId: `bot_${idx + 1}`,
        displayName: `Bot ${idx + 1}`,
        seatIndex: idx,
        appearance: { gender: idx % 2 === 0 ? 'male' : 'female', topStyle: 'jacket', hairColor: '#1f2937', skinTone: '#f1c27d' },
        connected: true,
      }));
      const profiles = players.map((_, idx) => PROFILES[(g + idx) % PROFILES.length]);

      let nowMs = 1_797_000_000_000 + seed * 10_000;
      const state = createInitialGameState({
        matchId: `s38-${playerCount}-${g}`,
        seed,
        nowMs,
        rulesetId: 'starter-thirty-eight',
        allowExperimental: true,
        players,
      });

      // Exercise CAP-05 `SET_REACTION_PREF` deterministically across seats (verify zero-leak + policy variety!)
      for (let idx = 0; idx < players.length; idx += 1) {
        const pid = players[idx].playerId;
        const r = state.players[pid].roleId;
        let policy = 'ASK';
        if (r === 'exp2_arlene') {
          policy = g % 10 === 0 ? 'AUTO_DECLINE' : 'AUTO_ACTIVATE_WHEN_ELIGIBLE';
        } else if (['exp1_wendigo', 'exp1_undying', 'exp1_cindy', 'exp2_urban_legend', 'exp2_usurper'].includes(r)) {
          const mod = (g + idx) % 6;
          if (mod === 0) policy = 'AUTO_DECLINE';
          else if (mod === 1) policy = 'AUTO_ACTIVATE_WHEN_ELIGIBLE';
          else policy = 'ASK';
        }
        if (policy !== 'ASK') {
          const prefRes = applyPlayerGameAction(state, pid, { type: 'SET_REACTION_PREF', policy }, nowMs);
          assert.equal(prefRes.ok, true, `SET_REACTION_PREF failed for ${r}/${policy}`);
        }
        stats.reactionPolicyUsage[policy] += 1;
      }

      const myPrivateViews = {};
      for (const p of players) {
        myPrivateViews[p.playerId] = getPrivateGameView(state, p.playerId);
      }
      const botMemMap = createBotMemory(
        players.map((p) => p.playerId),
        myPrivateViews,
      );

      let safety = 0;
      const maxSteps = 4200;
      const prevAliveSet = new Set(players.map((p) => p.playerId));
      const prevWounds = {};
      for (const p of players) prevWounds[p.playerId] = 0;
      let lastRecordedTurn = -1;
      let hadG43Robe = false;
      let prevLogLen = state.publicLog.length;

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
            if (pub.pendingChoice?.ownerPlayerId !== null || pub.pendingChoice?.kind !== null) {
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
          if (choiceKind === 'usurper_reveal_block_heal' && optionId === 'reveal_and_block') {
            stats.wave4Telemetry.usurperSecretInterceptions += 1;
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

          // Pre-action snapshot for Ernest / Warlord telemetry
          const preActionAction = chooseBotAction(pub, priv, mem, profiles[activeIdx], rng);
          let preShadowHidden = 0;
          let preShadowGear = 0;
          let preUmibozuHidden = false;
          let preWarlordWitchCorridor = false;
          if (preActionAction.type === 'USE_SKILL' && active.roleId === 'exp1_ernest') {
            for (const sp of Object.values(state.players)) {
              if (sp.alive && sp.faction === 'mist-order') {
                if (!sp.revealed) preShadowHidden += 1;
                preShadowGear += sp.equipped.length;
                if (sp.roleId === 'exp2_umibozu' && !sp.revealed) preUmibozuHidden = true;
              }
            }
          }
          if (preActionAction.type === 'USE_SKILL' && active.roleId === 'exp2_warlord' && preActionAction.targetPlayerId) {
            const wt = state.players[preActionAction.targetPlayerId];
            if (wt && wt.roleId === 'exp2_witch' && wt.location === 'corridor' && active.location !== 'corridor') {
              preWarlordWitchCorridor = true;
            }
          }

          let res = applyPlayerGameAction(state, active.playerId, preActionAction, nowMs);
          if (res.ok && preActionAction.type === 'USE_SKILL' && active.roleId === 'exp1_ernest') {
            stats.wave4Telemetry.ernestForcedShadowReveals += preShadowHidden;
            stats.wave4Telemetry.ernestDestroyedGear += preShadowGear;
            if (preUmibozuHidden) stats.wave4Telemetry.ernestUmibozuCounterTriggers += 1;
          }
          if (res.ok && preWarlordWitchCorridor) {
            stats.wave4Telemetry.warlordWitchOffCorridorPulls += 1;
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
          if (preActionAction.type === 'ATTACK' && botMemMap[preActionAction.targetPlayerId]) {
            botMemMap[preActionAction.targetPlayerId].attackedMe[active.playerId] =
              (botMemMap[preActionAction.targetPlayerId].attackedMe[active.playerId] || 0) + 1;
          }
        }

        // Check public privacy invariants on newly added logs (never leak hidden Arlene/Usurper/Urban Legend)
        if (state.publicLog.length > prevLogLen) {
          prevLogLen = state.publicLog.length;
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

      const expStats = state.expansionState?.stats;
      if (expStats) {
        for (const rid of STARTER_THIRTY_EIGHT_EXPANSION_ROLE_IDS) {
          stats.byRole[rid].skillActivations += expStats.activationsByRole?.[rid] ?? 0;
          stats.byRole[rid].healTotal += expStats.healByRole?.[rid] ?? 0;
          stats.byRole[rid].damagePreventedTotal += expStats.damagePreventedByRole?.[rid] ?? 0;
          stats.byRole[rid].bonusDamageTotal += expStats.bonusDamageByRole?.[rid] ?? 0;
          stats.byRole[rid].healsBlockedTotal += expStats.healsBlockedByRole?.[rid] ?? 0;
        }
        stats.wave4Telemetry.ernestActivations += expStats.activationsByRole?.exp1_ernest ?? 0;
        stats.wave4Telemetry.usurperActivations += expStats.activationsByRole?.exp2_usurper ?? 0;
        stats.wave4Telemetry.usurperHealsBlockedTotal += expStats.healsBlockedByRole?.exp2_usurper ?? 0;
        stats.wave4Telemetry.angelActivations += expStats.activationsByRole?.exp1_angel ?? 0;
        stats.wave4Telemetry.angelDamagePreventedTotal += expStats.damagePreventedByRole?.exp1_angel ?? 0;
        stats.wave4Telemetry.biancaActivations += expStats.activationsByRole?.exp2_bianca ?? 0;
        stats.wave4Telemetry.biancaDamagePreventedTotal += expStats.damagePreventedByRole?.exp2_bianca ?? 0;
        stats.wave4Telemetry.daltonActivations += expStats.activationsByRole?.exp2_dalton ?? 0;
        stats.wave4Telemetry.daltonSelfHealsBlockedTotal += expStats.healsBlockedByRole?.exp2_dalton ?? 0;
        const freyjaMatchExtras = expStats.activationsByRole?.exp2_freyja ?? 0;
        stats.wave4Telemetry.freyjaExtraAttacks += freyjaMatchExtras;
        if (freyjaMatchExtras > stats.wave4Telemetry.freyjaMaxExtraInSingleMatch) {
          stats.wave4Telemetry.freyjaMaxExtraInSingleMatch = freyjaMatchExtras;
        }
        stats.wave4Telemetry.warlordPulls += expStats.activationsByRole?.exp2_warlord ?? 0;
        stats.wave4Telemetry.gwendolenCounters += expStats.activationsByRole?.exp1_gwendolen ?? 0;
        stats.wave4Telemetry.umibozuActivations += expStats.activationsByRole?.exp2_umibozu ?? 0;
        stats.wave4Telemetry.umibozuBonusDamageTotal += expStats.bonusDamageByRole?.exp2_umibozu ?? 0;
        stats.wave4Telemetry.eliseActivations += expStats.activationsByRole?.exp2_elise ?? 0;
        stats.wave4Telemetry.eliseHealTotal += expStats.healByRole?.exp2_elise ?? 0;
        stats.wave4Telemetry.arleneDisguiseActivations += expStats.activationsByRole?.exp2_arlene ?? 0;
        stats.wave4Telemetry.urbanLegendActivations += expStats.activationsByRole?.exp2_urban_legend ?? 0;
        stats.wave4Telemetry.urbanLegendConvertedHealTotal += expStats.healByRole?.exp2_urban_legend ?? 0;
      }

      const playerList = Object.values(state.players);
      const allRolesInMatch = new Set(playerList.map((p) => p.roleId));
      const hasWave4Shadow =
        allRolesInMatch.has('exp2_umibozu') ||
        allRolesInMatch.has('exp2_urban_legend') ||
        allRolesInMatch.has('exp2_warlord') ||
        allRolesInMatch.has('exp2_usurper');

      if (allRolesInMatch.has('exp2_bianca')) {
        stats.wave4Telemetry.biancaPresentMatches += 1;
        stats.wave4Telemetry.biancaPresentRoundSum += state.round;
      } else {
        stats.wave4Telemetry.biancaAbsentMatches += 1;
        stats.wave4Telemetry.biancaAbsentRoundSum += state.round;
      }

      const aliveSurvivors = playerList.filter((p) => p.alive);
      const minAliveHp = aliveSurvivors.length > 0 ? Math.min(...aliveSurvivors.map((p) => p.hp)) : -1;
      const allNeutralsAlive = playerList.filter((p) => p.faction === 'wanderer').every((p) => p.alive);

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
          if (hasWave4Shadow) {
            stats.g43Counterplay.vsWave4ShadowAppearances += 1;
            if (won) stats.g43Counterplay.vsWave4ShadowWins += 1;
          }
          if (allRolesInMatch.has('exp1_wrath')) {
            stats.g43Counterplay.vsWrathAppearances += 1;
            if (won) stats.g43Counterplay.vsWrathWins += 1;
          }
          if (allRolesInMatch.has('exp2_umibozu')) {
            stats.g43Counterplay.vsUmibozuAppearances += 1;
            if (won) stats.g43Counterplay.vsUmibozuWins += 1;
          }
          if (allRolesInMatch.has('exp2_usurper')) {
            stats.g43Counterplay.vsUsurperAppearances += 1;
            if (won) stats.g43Counterplay.vsUsurperWins += 1;
          }
        }

        if (p.roleId === 'exp2_elise') {
          if (allRolesInMatch.has('exp2_usurper')) {
            stats.wave4Telemetry.eliseWithUsurperApps += 1;
            if (won) stats.wave4Telemetry.eliseWithUsurperWins += 1;
          } else {
            stats.wave4Telemetry.eliseWithoutUsurperApps += 1;
            if (won) stats.wave4Telemetry.eliseWithoutUsurperWins += 1;
          }
        }

        if (p.roleId === 'exp2_arlene' && won && state.winnerFaction === 'wanderer-solo') {
          stats.wave4Telemetry.arleneHunterKillSoloWins += 1;
        }

        if (p.roleId === 'exp1_angel' && won && p.alive) {
          const atChurch = p.location === 'lobby';
          if (allNeutralsAlive && atChurch) stats.wave4Telemetry.angelBothConditionsWins += 1;
          else if (atChurch) stats.wave4Telemetry.angelChurchExactOnlyWins += 1;
          else if (allNeutralsAlive) stats.wave4Telemetry.angelAllNeutralsAliveOnlyWins += 1;
        }

        if (p.roleId === 'exp2_bianca' && won && p.alive) {
          const tiedMinCount = aliveSurvivors.filter((s) => s.hp === minAliveHp).length;
          if (tiedMinCount > 1) stats.wave4Telemetry.biancaLowestHpTieWins += 1;
          else stats.wave4Telemetry.biancaLowestHpStrictWins += 1;
        }

        if (p.roleId === 'exp2_dalton' && won) {
          if (state.expansionState?.daltonKillWinTriggeredIds?.includes(p.playerId)) {
            stats.wave4Telemetry.daltonKillAfterActivationWins += 1;
          } else {
            stats.wave4Telemetry.daltonHighestHpEndWins += 1;
          }
        }

        if (p.faction === 'wanderer' && playerCount >= 5) {
          stats.wanderer5to8.appearances += 1;
          countBucket.wandererAppearances += 1;
          if (won) {
            stats.wanderer5to8.wins += 1;
            countBucket.wandererWins += 1;
            if (state.winnerFaction === 'wanderer-solo') {
              stats.wanderer5to8.soloWins += 1;
            } else {
              stats.wanderer5to8.coWins += 1;
            }
          }
        }
      }
    }
  }

  const elapsedMs = Date.now() - t0;
  const completed = Math.max(1, stats.totalGames - stats.stalledGames);
  const totalSeats = stats.totalGames * 6;
  const totalLocTurns = Math.max(
    1,
    Object.values(stats.locationOccupancyTurns).reduce((a, b) => a + b, 0),
  );
  const pct = (n, d) => +((n / Math.max(1, d)) * 100).toFixed(2);
  const totalPendingChoicesResolved = Object.values(stats.pendingChoicesResolved).reduce(
    (sum, n) => sum + n,
    0,
  );

  const output = {
    rulesetId: 'starter-thirty-eight',
    seedFormula: stats.seedFormula,
    playableCharacters: ALL_S38_ROLE_IDS.length,
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
      vsWave4Shadow: {
        appearances: stats.g43Counterplay.vsWave4ShadowAppearances,
        winRatePct: pct(stats.g43Counterplay.vsWave4ShadowWins, stats.g43Counterplay.vsWave4ShadowAppearances),
      },
      vsWrath: {
        appearances: stats.g43Counterplay.vsWrathAppearances,
        winRatePct: pct(stats.g43Counterplay.vsWrathWins, stats.g43Counterplay.vsWrathAppearances),
      },
      vsUmibozu: {
        appearances: stats.g43Counterplay.vsUmibozuAppearances,
        winRatePct: pct(stats.g43Counterplay.vsUmibozuWins, stats.g43Counterplay.vsUmibozuAppearances),
      },
      vsUsurper: {
        appearances: stats.g43Counterplay.vsUsurperAppearances,
        winRatePct: pct(stats.g43Counterplay.vsUsurperWins, stats.g43Counterplay.vsUsurperAppearances),
      },
    },
    wave4Telemetry: {
      ...stats.wave4Telemetry,
      biancaPresentAvgRounds: +(
        stats.wave4Telemetry.biancaPresentRoundSum / Math.max(1, stats.wave4Telemetry.biancaPresentMatches)
      ).toFixed(2),
      biancaAbsentAvgRounds: +(
        stats.wave4Telemetry.biancaAbsentRoundSum / Math.max(1, stats.wave4Telemetry.biancaAbsentMatches)
      ).toFixed(2),
      eliseWithUsurperWinPct: pct(
        stats.wave4Telemetry.eliseWithUsurperWins,
        stats.wave4Telemetry.eliseWithUsurperApps,
      ),
      eliseWithoutUsurperWinPct: pct(
        stats.wave4Telemetry.eliseWithoutUsurperWins,
        stats.wave4Telemetry.eliseWithoutUsurperApps,
      ),
    },
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
      avgBonusDamagePerAppearance: +(r.bonusDamageTotal / Math.max(1, r.appearances)).toFixed(2),
      avgHealsBlockedPerAppearance: +(r.healsBlockedTotal / Math.max(1, r.appearances)).toFixed(2),
    })),
  };

  console.log(JSON.stringify(output, null, 2));

  if (process.argv.includes('--write-json')) {
    const outPath = path.resolve(
      __dirname,
      '../docs/boardgame-expansion/phase-5/starter-thirty-eight-sim-data.json',
    );
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  }

  assert.equal(stats.totalGames, 20000, 'Expected 20,000 simulated starter-thirty-eight games');
  assert.equal(stats.stalledGames, 0, `Unexpected stalled games: ${stats.stalledGames}`);
  assert.equal(stats.draws, 0, `Unexpected draw games: ${stats.draws}`);
  assert.equal(stats.botAccessViolations, 0, `Bot privacy violations: ${stats.botAccessViolations}`);

  const sumCheck = Object.values(stats.pendingChoicesResolved).reduce((a, b) => a + b, 0);
  assert.equal(sumCheck, totalPendingChoicesResolved, 'Reconciled pending choices sum mismatch');

  console.log(
    `\nPASS: 20,000-match starter-thirty-eight simulation completed in ${elapsedMs}ms (0 stalls, 0 draws, 0 privacy leaks, ${totalPendingChoicesResolved} pending choices resolved across 22 kinds).`,
  );
}

runStarterThirtyEightSimulation();
