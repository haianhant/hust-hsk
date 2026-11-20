#!/usr/bin/env node
/**
 * scripts/sim-starter-twenty-six.cjs — Deterministic 15,000-Match Simulation Harness
 * for `starter-twenty-six` (10 Classic + 8 Starter Eight + 8 Wave 2 + 10 Wave 3 = 36 playable roles).
 *
 * Runs 3,000 deterministic matches per player count (4P, 5P, 6P, 7P, 8P = 15,000 total)
 * using seed range `8,000,000 + playerCount*100,000 + g + 1` with skill-aware bots covering
 * ALL 36 characters & ALL 15 Pending Choices.
 *
 * Emits `totalPendingChoicesResolved` programmatically (sum of all 15 choice buckets)
 * and writes `docs/boardgame-expansion/phase-4/starter-twenty-six-sim-data.json` when `--write-json` is passed.
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
  ROLES_CATALOG,
  STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS,
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

const ALL_S26_ROLE_IDS = [
  ...ROLES_CATALOG.map((r) => r.id),
  ...STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS,
];
const ALL_S26_DESIGNS = ALL_S26_ROLE_IDS.map((id) => getRoleDesign(id));
const DESIGN_BY_ID = Object.fromEntries(ALL_S26_DESIGNS.map((d) => [d.id, d]));

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
          ALL_S26_DESIGNS.filter(
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
    for (const r of ALL_S26_DESIGNS) {
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
          if (targetUnrevealed && roleId === 'suong-tin-gia') continue;
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
  const hunterScore = hunterAlive * 6 - hunterWounds * 0.45;
  const shadowScore = shadowAlive * 6 - shadowWounds * 0.45;
  return hunterScore - shadowScore;
}

function estimateTargetRoleScores(botMem, pub, priv, target) {
  const pubTarget = pub.players.find((p) => p.playerId === target.playerId);
  const danielSupportsHunters = priv.roleId === 'lang-tien-phong' && pub.deadCount >= 1;
  const bipolarSupportsHunters = priv.roleId === 'exp1_bipolar' && priv.hp >= 4 && estimateBoardFavor(pub) >= -1;
  const remainingNeutralsDeadNeeded = Math.max(1, 3 - (pub.deadCount ?? 0));

  if (pubTarget?.revealedRoleId) {
    const role = DESIGN_BY_ID[pubTarget.revealedRoleId];
    if (priv.roleId === 'exp2_bryon') {
      // Bryon loses if ANY Neutral dies -> treat Neutrals as strict allies!
      if (role.faction === 'wanderer') return { isEnemyProb: 0, isAllyProb: 1 };
      return { isEnemyProb: 0.45, isAllyProb: 0.1 };
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
    if (priv.roleId === 'exp2_cruz') {
      return { isEnemyProb: 0.9, isAllyProb: 0 };
    }
    if (priv.faction === 'lantern-guard') {
      if (role.faction === 'mist-order') return { isEnemyProb: 1, isAllyProb: 0 };
      if (role.faction === 'lantern-guard') return { isEnemyProb: 0, isAllyProb: 1 };
      if (role.id === 'lang-tien-phong' || role.id === 'exp1_bipolar' || role.id === 'exp2_bryon') {
        return { isEnemyProb: 0.08, isAllyProb: 0.55 };
      }
      if (role.id === 'exp1_cindy') return { isEnemyProb: pub.players.length >= 6 ? 0.55 : 0.15, isAllyProb: 0.1 };
      if (role.id === 'exp2_cruz') return { isEnemyProb: 0.55, isAllyProb: 0 };
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
    if (priv.roleId === 'exp2_bryon') {
      if (r.faction === 'wanderer') allyWeight += 1;
      else enemyWeight += 0.45;
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

    // ---- Wave 3 Pending Choices ----
    case 'fea_move_adjust': {
      // Prefer hitting 7 (choose-any), else corridor when wounded, else lobby/canteen/non-reroll!
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
        // Score every player mentioned in label
        let s = 0;
        let matchedCount = 0;
        for (const p of pub.players) {
          if (!p.alive || p.playerId === priv.playerId) continue;
          if (opt.label.includes(p.displayName)) {
            matchedCount += 1;
            if (p.revealedRoleId === 'exp2_witch' && p.location === 'corridor') {
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
            : t.revealedRoleId === 'lang-quan-sat' || t.revealedRoleId === 'exp1_fallen'
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
      // Cruz ALWAYS keeps qualifying win-trigger cards (ev-07..ev-10) & high-value weapons!
      if (CRUZ_QUALIFYING_CARDS.has(drawn.id)) return 'keep';
      if (['ev-06', 'ev-01', 'ev-02', 'ev-03', 'ev-04'].includes(drawn.id) && priv.equipped.length < 2) {
        return 'keep';
      }
      // Redraw weak/irrelevant Black cards (ev-12 Banana Peel, ev-13 Diabolic Ritual, duplicate gear, etc.)!
      return 'redraw';
    }

    case 'bryon_gift_equipment': {
      const giftOpts = pc.options.filter((o) => o.optionId !== 'done');
      if (giftOpts.length === 0) return 'done';
      // Prioritize gifting ALL gear to Bob (`lang-anh-san`) to accelerate Bob 5-gear co-win!
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
      // Otherwise gift defensive gear or excess gear to any revealed Neutral ally in cluster!
      const allOpt = giftOpts.find((o) => o.label.includes('TẤT CẢ'));
      if (allOpt && priv.equipped.length >= 2) return allOpt.optionId;
      return giftOpts[0].optionId;
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
      const isProtectedUdi = isPubUdiProtected(pub, p);
      const isMarkedByVisions = isPubVisionsMarked(pub, priv.playerId, p.playerId);
      const isWerewolfDanger =
        p.revealedRoleId === 'suong-gac-cong' && priv.roleId === 'lang-anh-san' && p.woundsTaken < 8;
      const isG43TankPenalty =
        p.revealedRoleId === 'exp2_g43' && !canPierceG43 ? 0.55 : 0;
      const isCindyRetaliatePenalty =
        p.revealedRoleId === 'exp1_cindy' && priv.hp <= 3 ? 0.9 : 0;
      const isFujikoExecuteTarget =
        priv.roleId === 'exp2_fujiko' &&
        priv.revealed &&
        p.revealedRoleId !== null &&
        typeof p.revealedMaxHp === 'number' &&
        p.revealedMaxHp - p.woundsTaken <= 4 &&
        !isImmuneWitch;
      const woundWeight =
        priv.roleId === 'lang-cuu-ho' ||
        priv.roleId === 'lang-quan-sat' ||
        priv.roleId === 'exp2_wyvern' ||
        priv.roleId === 'exp1_vengeance' ||
        priv.roleId === 'exp2_cruz'
          ? 0.28
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
        (p.revealedFaction === 'mist-order' && priv.faction === 'lantern-guard' ? 0.8 : 0) +
        (p.revealedFaction === 'lantern-guard' && priv.faction === 'mist-order' ? 0.6 : 0) +
        (p.revealedRoleId === 'exp2_g43' && canPierceG43 && priv.faction === 'mist-order' ? 0.9 : 0) +
        (p.revealedRoleId === 'exp2_gloria' && priv.faction === 'mist-order' ? 0.5 : 0) +
        (p.revealedRoleId === 'lang-quan-sat' && priv.faction !== 'lantern-guard' ? 0.7 : 0) +
        (p.revealedRoleId === 'lang-anh-san' && p.equipped.length >= 4 ? 1.8 : 0) +
        (p.revealedRoleId === 'lang-cuu-ho' && pub.deadCount >= 2 ? 1.1 : 0) -
        (isWerewolfDanger ? 1.5 : 0) -
        isG43TankPenalty -
        isCindyRetaliatePenalty -
        (isImmuneWitch ? 12.0 : 0);
      return {
        player: p,
        isEnemyProb,
        isAllyProb,
        isImmuneWitch,
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
    // Fea reveals on turn start (round >= 2) to unlock +/-1 dice adjust!
    if (priv.roleId === 'exp1_fea' && !priv.revealed && pub.round >= 2) {
      return { type: 'REVEAL_ROLE' };
    }
    // Wrath reveals on turn start if enemies share cluster!
    if (priv.roleId === 'exp1_wrath' && !priv.revealed && pub.round >= 2) {
      const sameClusterEnemies = scoredOthers.filter(
        (x) =>
          areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) &&
          x.isEnemyProb >= 0.5,
      );
      if (sameClusterEnemies.length >= 1) {
        return { type: 'REVEAL_ROLE' };
      }
    }
    if (priv.roleId === 'exp1_wrath' && priv.revealed) {
      const sameClusterEnemies = scoredOthers.filter(
        (x) =>
          areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) &&
          !x.isImmuneWitch &&
          x.isEnemyProb >= 0.5,
      );
      const sameClusterAllies = scoredOthers.filter(
        (x) =>
          areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs) &&
          x.isAllyProb >= 0.7,
      );
      if (sameClusterEnemies.length > sameClusterAllies.length && !pub.lastDiceRoll?.rerollRequired) {
        // Trigger Wrath if Wrath revealed on this turn's ROLL_MOVE
        if (rng() < 0.85) return { type: 'USE_SKILL' };
      }
    }
    // Visions reveals on turn start (round >= 2) and immediately uses skill to place mark!
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
    if (priv.woundsTaken >= 5 && !(priv.roleId === 'lang-tien-phong' && pub.deadCount === 0) && poolIds.includes('corridor')) {
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
    // Cruz reveals before drawing Black card to unlock Black redraw!
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
        if (priv.roleId === 'exp2_cruz' && pub.deckCounts.event > 0) {
          return { type: 'DRAW_CARD', deck: 'event' };
        }
        if (priv.roleId === 'exp1_felicia' && priv.revealed) {
          return { type: 'DRAW_CARD', deck: selfPub.equipped.length < 2 ? 'equipment' : 'event' };
        }
        if (priv.roleId === 'lang-anh-san' || priv.roleId === 'exp2_bryon') {
          return { type: 'DRAW_CARD', deck: pub.deckCounts.equipment > 0 ? 'equipment' : 'event' };
        }
        if (pub.round <= 2 && selfPub.equipped.length >= 1 && rng() < 0.3 && pub.deckCounts.investigation > 0) {
          return { type: 'DRAW_CARD', deck: 'investigation' };
        }
        return { type: 'DRAW_CARD', deck: rng() < 0.5 ? 'equipment' : 'event' };
      }
      case 'corridor': {
        const danielSeekingFirstDeath = priv.roleId === 'lang-tien-phong' && pub.deadCount === 0;
        if (
          (selfPub.woundsTaken >= 2 && !danielSeekingFirstDeath) ||
          (bestAlly && bestAlly.woundsTaken >= 3 && bestTarget.woundsTaken < 8)
        ) {
          const healTarget =
            selfPub.woundsTaken >= (bestAlly?.woundsTaken ?? 0) && !danielSeekingFirstDeath
              ? selfPub.playerId
              : bestAlly.playerId;
          return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: healTarget };
        }
        const dmgTarget = scoredOthers.find((x) => !x.isImmuneWitch)?.player || bestTarget;
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
        if (selfPub.woundsTaken >= 8) aidTargetId = selfPub.playerId;
        else if (bestAlly && bestAlly.woundsTaken >= 8) aidTargetId = bestAlly.playerId;
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
        // Cruz prefers the lowest-HP target to secure immediate kill!
        if (priv.roleId === 'exp2_cruz') {
          const killable = scoredOthers
            .filter((x) => !x.isImmuneWitch)
            .sort((a, b) => b.player.woundsTaken - a.player.woundsTaken)[0]?.player;
          if (killable) return { type: 'USE_CARD', cardId: card.id, targetPlayerId: killable.playerId };
        }
        const nonImmune = scoredOthers.find((x) => !x.isImmuneWitch)?.player || bestTarget;
        return { type: 'USE_CARD', cardId: card.id, targetPlayerId: nonImmune.playerId };
      }
      return { type: 'USE_CARD', cardId: card.id };
    }

    const reachableScored = scoredOthers.filter((x) => {
      if (x.isProtectedUdi || x.isMarkedByVisions) return false;
      const sameCluster = areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs);
      return hasHandgun ? !sameCluster : sameCluster;
    });

    // Strategic Voluntary Reveal (skill-aware for ALL 36 roles!)
    if (
      !priv.revealed &&
      priv.roleId !== 'lang-tien-phong' &&
      priv.roleId !== 'suong-tin-gia' &&
      priv.roleId !== 'exp1_wendigo' &&
      priv.roleId !== 'exp1_undying' &&
      priv.roleId !== 'exp1_cindy' &&
      !(priv.roleId === 'exp1_fallen' && priv.hp < 8)
    ) {
      const inRangeGeared = reachableScored.some((x) => x.player.equipped.length > 0);
      const sameClusterCount = aliveOthers.filter((p) =>
        areInSameCluster(selfPub.location, p.location, pub.clusterPairs),
      ).length;
      const hasRevealedNeutralInCluster = aliveOthers.some(
        (p) => p.revealedFaction === 'wanderer' && areInSameCluster(selfPub.location, p.location, pub.clusterPairs),
      );

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
        (priv.roleId === 'exp2_bryon' && (hasRevealedNeutralInCluster && selfPub.equipped.some((e) => e.id !== 'ev-01')));

      if (shouldRevealNow) {
        return { type: 'REVEAL_ROLE' };
      }
    }

    // Active skills in MAIN_ACTION (Classic + Wave 3 Eleanor & Bryon)
    if (priv.revealed) {
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
        if (wantIntelOverAttack) {
          return { type: 'USE_SKILL' };
        }
      }

      if (
        (priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') &&
        !priv.skillUsedOnce &&
        (scoredOthers[0].isEnemyProb >= 0.65 || bestTarget.woundsTaken >= 5 || pub.round >= 4)
      ) {
        const nonImmune = scoredOthers.find((x) => !x.isImmuneWitch)?.player || bestTarget;
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
            !x.isImmuneWitch &&
            pub.deadCount >= 2 &&
            x.player.woundsTaken >= 5,
        );
        if (feastTarget) return { type: 'USE_SKILL', targetPlayerId: feastTarget.playerId };
      }
    }

    // Combat Attack
    if (selfPub.attacksThisTurn < 1 && reachableScored.length > 0) {
      const nonImmuneReachable = reachableScored.filter((x) => !x.isImmuneWitch);
      const candidates = nonImmuneReachable.length > 0 ? nonImmuneReachable : reachableScored;
      if (hasMasamune) {
        return { type: 'ATTACK', targetPlayerId: candidates[0].player.playerId };
      }
      const top = candidates[0];
      if (top.isImmuneWitch) {
        return { type: 'END_TURN' };
      }
      const topIsConfirmedAlly =
        top.isAllyProb >= 0.85 &&
        !['lang-anh-san', 'lang-quan-sat', 'lang-cuu-ho', 'exp1_cindy', 'exp2_cruz'].includes(priv.roleId) &&
        !(priv.roleId === 'lang-tien-phong' && pub.deadCount === 0);
      const hunterAvoidNeutral =
        priv.faction === 'lantern-guard' &&
        ((top.isEnemyProb < 0.3 && top.player.woundsTaken < 7 && pub.deadCount <= 2) ||
          (pub.players.length >= 6 && pub.round <= 3 && top.isEnemyProb < 0.52));
      const suppressRound1Blind =
        pub.round === 1 &&
        top.isEnemyProb < 0.72 &&
        priv.roleId !== 'lang-tien-phong';
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

function runStarterTwentySixSimulation() {
  const validation = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-twenty-six', 8, {
    allowExperimental: true,
  });
  assert.equal(validation.ok, true, 'starter-twenty-six must validate under allowExperimental');

  const stats = {
    rulesetId: 'starter-twenty-six',
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
      vsWave3ShadowAppearances: 0,
      vsWave3ShadowWins: 0,
      vsNoWave3ShadowAppearances: 0,
      vsNoWave3ShadowWins: 0,
      vsWrathAppearances: 0,
      vsWrathWins: 0,
      vsVengeanceAppearances: 0,
      vsVengeanceWins: 0,
      vsVisionsAppearances: 0,
      vsVisionsWins: 0,
      vsWarlockAppearances: 0,
      vsWarlockWins: 0,
      vsUnchainedAppearances: 0,
      vsUnchainedWins: 0,
    },
    wave3Telemetry: {
      fallenBoostHits: 0,
      feaAdjustments: 0,
      eleanorGreenDraws: 0,
      fujikoExecutions: 0,
      udiAttackBlocks: 0,
      wrathAoeActivations: 0,
      vengeanceChainActivations: 0,
      visionsMarksPlaced: 0,
      visionsTickActivations: 0,
      cruzRedraws: 0,
      cruzSoloWins: 0,
      cruzAppearances: 0,
      bryonGiftsGiven: 0,
      bryon5pAppearances: 0,
      bryon5pCoWins: 0,
      bryon6to8Appearances: 0,
      bryon6to8Wins: 0,
      bryonBobCoWinGames: 0,
      cindy5pAppearances: 0,
      cindy5pCoWins: 0,
      cindy6to8Appearances: 0,
      cindySoloWins: 0,
      bipolarHunterAliveWins: 0,
      bipolarShadowDeadWins: 0,
      bipolarSelfKillCount: 0,
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
    },
  };

  for (const d of ALL_S26_DESIGNS) {
    const wave = PHASE4B_ROLE_IDS.includes(d.id)
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
    };
  }

  const sizes = [4, 5, 6, 7, 8];
  const gamesPerSize = 3000; // 5 * 3,000 = 15,000 deterministic matches!
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
      const seed = 8_000_000 + playerCount * 100_000 + g + 1;
      const rng = createRng(seed);
      const players = Array.from({ length: playerCount }, (_, idx) => ({
        playerId: `bot_${idx + 1}`,
        displayName: `Bot ${idx + 1}`,
        seatIndex: idx,
        appearance: { gender: idx % 2 === 0 ? 'male' : 'female', topStyle: 'jacket', hairColor: '#1f2937', skinTone: '#f1c27d' },
        connected: true,
      }));
      const profiles = players.map((_, idx) => PROFILES[(g + idx) % PROFILES.length]);

      let nowMs = 1_796_000_000_000 + seed * 10_000;
      const state = createInitialGameState({
        matchId: `s26-${playerCount}-${g}`,
        seed,
        nowMs,
        rulesetId: 'starter-twenty-six',
        allowExperimental: true,
        players,
      });

      const myPrivateViews = {};
      for (const p of players) {
        myPrivateViews[p.playerId] = getPrivateGameView(state, p.playerId);
      }
      const botMemMap = createBotMemory(
        players.map((p) => p.playerId),
        myPrivateViews,
      );

      let safety = 0;
      const maxSteps = 3600;
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

          const wasAliveBefore = state.players[ownerId]?.alive;
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
          if (choiceKind === 'bipolar_fate_coin' && optionId === 'damage_self' && wasAliveBefore && !state.players[ownerId]?.alive) {
            stats.wave3Telemetry.bipolarSelfKillCount += 1;
          }
          if (choiceKind === 'visions_mark_target' && optionId !== 'skip') {
            stats.wave3Telemetry.visionsMarksPlaced += 1;
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

          const action = chooseBotAction(pub, priv, mem, profiles[activeIdx], rng);
          let res = applyPlayerGameAction(state, active.playerId, action, nowMs);
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
          if (action.type === 'ATTACK' && botMemMap[action.targetPlayerId]) {
            botMemMap[action.targetPlayerId].attackedMe[active.playerId] =
              (botMemMap[action.targetPlayerId].attackedMe[active.playerId] || 0) + 1;
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

      const expStats = state.expansionState?.stats;
      if (expStats) {
        for (const rid of STARTER_TWENTY_SIX_EXPANSION_ROLE_IDS) {
          stats.byRole[rid].skillActivations += expStats.activationsByRole?.[rid] ?? 0;
          stats.byRole[rid].healTotal += expStats.healByRole?.[rid] ?? 0;
          stats.byRole[rid].damagePreventedTotal += expStats.damagePreventedByRole?.[rid] ?? 0;
          stats.byRole[rid].bonusDamageTotal += expStats.bonusDamageByRole?.[rid] ?? 0;
        }
        stats.wave3Telemetry.fallenBoostHits += expStats.activationsByRole?.exp1_fallen ?? 0;
        stats.wave3Telemetry.feaAdjustments += expStats.activationsByRole?.exp1_fea ?? 0;
        stats.wave3Telemetry.eleanorGreenDraws += expStats.activationsByRole?.exp2_eleanor ?? 0;
        stats.wave3Telemetry.fujikoExecutions += expStats.activationsByRole?.exp2_fujiko ?? 0;
        stats.wave3Telemetry.udiAttackBlocks += expStats.activationsByRole?.exp1_udi ?? 0;
        stats.wave3Telemetry.wrathAoeActivations += expStats.activationsByRole?.exp1_wrath ?? 0;
        stats.wave3Telemetry.vengeanceChainActivations += expStats.activationsByRole?.exp1_vengeance ?? 0;
        stats.wave3Telemetry.visionsTickActivations += expStats.bonusDamageByRole?.exp2_visions ?? 0;
        stats.wave3Telemetry.cruzRedraws += expStats.activationsByRole?.exp2_cruz ?? 0;
        stats.wave3Telemetry.bryonGiftsGiven += expStats.activationsByRole?.exp2_bryon ?? 0;
      }

      const allRolesInMatch = new Set(Object.values(state.players).map((p) => p.roleId));
      const hasWave3Shadow =
        allRolesInMatch.has('exp1_udi') ||
        allRolesInMatch.has('exp1_wrath') ||
        allRolesInMatch.has('exp1_vengeance') ||
        allRolesInMatch.has('exp2_visions');

      const bryonInMatch = Object.values(state.players).find((p) => p.roleId === 'exp2_bryon');
      const bobInMatch = Object.values(state.players).find((p) => p.roleId === 'lang-anh-san');
      if (
        bryonInMatch &&
        bobInMatch &&
        state.winnerPlayerIds.includes(bryonInMatch.playerId) &&
        state.winnerPlayerIds.includes(bobInMatch.playerId)
      ) {
        stats.wave3Telemetry.bryonBobCoWinGames += 1;
      }

      for (const p of Object.values(state.players)) {
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
          if (hasWave3Shadow) {
            stats.g43Counterplay.vsWave3ShadowAppearances += 1;
            if (won) stats.g43Counterplay.vsWave3ShadowWins += 1;
          } else {
            stats.g43Counterplay.vsNoWave3ShadowAppearances += 1;
            if (won) stats.g43Counterplay.vsNoWave3ShadowWins += 1;
          }
          if (allRolesInMatch.has('exp1_wrath')) {
            stats.g43Counterplay.vsWrathAppearances += 1;
            if (won) stats.g43Counterplay.vsWrathWins += 1;
          }
          if (allRolesInMatch.has('exp1_vengeance')) {
            stats.g43Counterplay.vsVengeanceAppearances += 1;
            if (won) stats.g43Counterplay.vsVengeanceWins += 1;
          }
          if (allRolesInMatch.has('exp2_visions')) {
            stats.g43Counterplay.vsVisionsAppearances += 1;
            if (won) stats.g43Counterplay.vsVisionsWins += 1;
          }
          if (allRolesInMatch.has('exp2_warlock')) {
            stats.g43Counterplay.vsWarlockAppearances += 1;
            if (won) stats.g43Counterplay.vsWarlockWins += 1;
          }
          if (allRolesInMatch.has('exp2_unchained')) {
            stats.g43Counterplay.vsUnchainedAppearances += 1;
            if (won) stats.g43Counterplay.vsUnchainedWins += 1;
          }
        }

        if (p.roleId === 'exp2_cruz') {
          stats.wave3Telemetry.cruzAppearances += 1;
          if (won && state.winnerFaction === 'wanderer-solo') {
            stats.wave3Telemetry.cruzSoloWins += 1;
          }
        }
        if (p.roleId === 'exp2_bryon') {
          if (playerCount === 5) {
            stats.wave3Telemetry.bryon5pAppearances += 1;
            if (won) stats.wave3Telemetry.bryon5pCoWins += 1;
          } else {
            stats.wave3Telemetry.bryon6to8Appearances += 1;
            if (won) stats.wave3Telemetry.bryon6to8Wins += 1;
          }
        }
        if (p.roleId === 'exp1_cindy') {
          if (playerCount === 5) {
            stats.wave3Telemetry.cindy5pAppearances += 1;
            if (won) stats.wave3Telemetry.cindy5pCoWins += 1;
          } else {
            stats.wave3Telemetry.cindy6to8Appearances += 1;
            if (won && state.winnerFaction === 'wanderer-solo') {
              stats.wave3Telemetry.cindySoloWins += 1;
            }
          }
        }
        if (p.roleId === 'exp1_bipolar' && won) {
          if (state.winnerFaction === 'lantern-guard' && p.alive) {
            stats.wave3Telemetry.bipolarHunterAliveWins += 1;
          } else if (state.winnerFaction === 'mist-order' && !p.alive) {
            stats.wave3Telemetry.bipolarShadowDeadWins += 1;
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
    rulesetId: 'starter-twenty-six',
    playableCharacters: ALL_S26_ROLE_IDS.length,
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
      vsWave3Shadow: {
        appearances: stats.g43Counterplay.vsWave3ShadowAppearances,
        winRatePct: pct(stats.g43Counterplay.vsWave3ShadowWins, stats.g43Counterplay.vsWave3ShadowAppearances),
      },
      vsNoWave3Shadow: {
        appearances: stats.g43Counterplay.vsNoWave3ShadowAppearances,
        winRatePct: pct(stats.g43Counterplay.vsNoWave3ShadowWins, stats.g43Counterplay.vsNoWave3ShadowAppearances),
      },
      vsWrath: {
        appearances: stats.g43Counterplay.vsWrathAppearances,
        winRatePct: pct(stats.g43Counterplay.vsWrathWins, stats.g43Counterplay.vsWrathAppearances),
      },
      vsVengeance: {
        appearances: stats.g43Counterplay.vsVengeanceAppearances,
        winRatePct: pct(stats.g43Counterplay.vsVengeanceWins, stats.g43Counterplay.vsVengeanceAppearances),
      },
      vsVisions: {
        appearances: stats.g43Counterplay.vsVisionsAppearances,
        winRatePct: pct(stats.g43Counterplay.vsVisionsWins, stats.g43Counterplay.vsVisionsAppearances),
      },
      vsWarlock: {
        appearances: stats.g43Counterplay.vsWarlockAppearances,
        winRatePct: pct(stats.g43Counterplay.vsWarlockWins, stats.g43Counterplay.vsWarlockAppearances),
      },
      vsUnchained: {
        appearances: stats.g43Counterplay.vsUnchainedAppearances,
        winRatePct: pct(stats.g43Counterplay.vsUnchainedWins, stats.g43Counterplay.vsUnchainedAppearances),
      },
    },
    wave3Telemetry: stats.wave3Telemetry,
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
    })),
  };

  console.log(JSON.stringify(output, null, 2));

  if (process.argv.includes('--write-json')) {
    const outPath = path.resolve(__dirname, '../docs/boardgame-expansion/phase-4/starter-twenty-six-sim-data.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  }

  assert.equal(stats.totalGames, 15000, 'Expected 15,000 simulated starter-twenty-six games');
  assert.equal(stats.stalledGames, 0, `Unexpected stalled games: ${stats.stalledGames}`);
  assert.equal(stats.draws, 0, `Unexpected draw games: ${stats.draws}`);
  assert.equal(stats.botAccessViolations, 0, `Bot privacy violations: ${stats.botAccessViolations}`);

  console.log(`\nPASS: 15,000-match starter-twenty-six simulation completed in ${elapsedMs}ms (0 stalls, 0 draws, 0 privacy leaks, ${totalPendingChoicesResolved} pending choices resolved).`);
}

runStarterTwentySixSimulation();
