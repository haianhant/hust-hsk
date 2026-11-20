#!/usr/bin/env node
/**
 * scripts/sim-starter-eight.cjs — Deterministic 10,000-Match Simulation Harness
 * for `starter-eight` (10 Classic + 8 Starter Expansion Characters = 18 roles).
 *
 * Runs 2,000 deterministic matches per player count (4P, 5P, 6P, 7P, 8P = 10,000 total)
 * with skill-aware bots handling ALL 18 characters & ALL 6 Pending Choice kinds.
 *
 * Outputs structured JSON telemetry + writes snapshot to
 * `docs/boardgame-expansion/phase-2/.sim-starter-eight-raw.json` (when --write-json is passed).
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
  ROLES_CATALOG,
  applyPlayerGameAction,
  areInSameCluster,
  createInitialGameState,
  getActivePlayer,
  getPairedLocationInCluster,
  getPrivateGameView,
  getPublicGameView,
  getRoleDesign,
  getRoleDistribution,
} = require('../features/boardgame/domain/index.ts');

const ALL_STARTER_EIGHT_ROLE_IDS = [
  ...ROLES_CATALOG.map((r) => r.id),
  ...PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS,
];
const ALL_STARTER_EIGHT_DESIGNS = ALL_STARTER_EIGHT_ROLE_IDS.map((id) => getRoleDesign(id));
const DESIGN_BY_ID = Object.fromEntries(ALL_STARTER_EIGHT_DESIGNS.map((d) => [d.id, d]));

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
          ALL_STARTER_EIGHT_DESIGNS.filter(
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
    for (const r of ALL_STARTER_EIGHT_DESIGNS) {
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

function estimateTargetRoleScores(botMem, pub, priv, target) {
  const pubTarget = pub.players.find((p) => p.playerId === target.playerId);
  const danielSupportsHunters = priv.roleId === 'lang-tien-phong' && pub.deadCount >= 1;
  const remainingNeutralsDeadNeeded = Math.max(1, 3 - (pub.deadCount ?? 0));

  if (pubTarget?.revealedRoleId) {
    const role = DESIGN_BY_ID[pubTarget.revealedRoleId];
    if (danielSupportsHunters) {
      return {
        isEnemyProb: role.faction === 'lantern-guard' ? 0 : role.faction === 'mist-order' ? 1 : 0.35,
        isAllyProb: role.faction === 'lantern-guard' ? 1 : 0,
      };
    }
    if (priv.faction === 'lantern-guard') {
      if (role.faction === 'mist-order') return { isEnemyProb: 1, isAllyProb: 0 };
      if (role.faction === 'lantern-guard') return { isEnemyProb: 0, isAllyProb: 1 };
      if (role.id === 'lang-tien-phong') return { isEnemyProb: 0, isAllyProb: 0.65 };
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
    if (danielSupportsHunters) {
      if (r.faction === 'lantern-guard') allyWeight += 1;
      else if (r.faction === 'mist-order') enemyWeight += 1;
      else enemyWeight += 0.35;
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
  // Avoid duplicate non-stacking gear
  if (!card.isConsumable && equippedIds.has(card.id)) return 1.5;
  switch (card.id) {
    case 'eq-04': return 9.5; // Spear of Longinus (+2 atk for revealed Hunter!)
    case 'ev-06': return 9.0; // Machine Gun
    case 'ev-01': return 8.2; // Masamune
    case 'ev-02':
    case 'ev-03':
    case 'ev-04': return 7.6; // +1 atk weapons
    case 'eq-01': return 7.8; // Holy Robe (-1 incoming)
    case 'eq-03': return 7.2; // Talisman
    case 'eq-05': return 7.0; // Mystic Compass
    case 'eq-02': return 6.5; // Fortune Brooch
    case 'eq-06': return 6.2; // Silver Rosary
    case 'ev-05': return 6.4; // Handgun
    case 'eq-13': return priv.woundsTaken >= 3 ? 9.2 : 5.5; // Advent (Hunter full heal)
    case 'eq-07': return priv.woundsTaken >= 2 ? 7.0 : 4.0; // Holy Water
    case 'eq-10': return 6.8; // Guardian Angel
    case 'eq-15': return 7.5; // Concealed Knowledge (extra turn)
    case 'eq-11': return pub.round >= 2 ? 6.6 : 4.5; // Flare 2 AoE
    case 'eq-12': return 6.0; // Disenchant Mirror (good for Hunter!)
    case 'ev-07': return 6.8; // Vampire Bat
    case 'ev-11': return 6.5; // Moody Goblin (steal gear)
    case 'ev-09': return 5.0; // Dynamite
    case 'ev-08': return priv.hp >= 6 ? 4.8 : 2.0; // Spider
    case 'ev-10': return priv.hp >= 6 ? 5.2 : 2.2; // Spiritual Doll
    case 'eq-08': return 5.5; // Blessing
    case 'eq-09': return priv.woundsTaken >= 8 ? 7.0 : 4.2; // First Aid
    case 'ev-12': return 0.5; // Banana Peel (bad!)
    case 'ev-13': return 1.0; // Diabolic Ritual (useless for Hunter!)
    case 'eq-14': return 1.2; // Chocolate (Felicia doesn't start with A/E/U)
    default: return 4.0;
  }
}

function choosePendingChoiceOption(pub, priv, botMem, rng) {
  const pc = priv.pendingChoice;
  if (!pc) return null;

  switch (pc.kind) {
    case 'fiona_attack_roll': {
      // Pick the roll with strictly higher totalDmg
      const r0 = pc.options[0]?.roll?.totalDmg ?? 0;
      const r1 = pc.options[1]?.roll?.totalDmg ?? 0;
      return r1 > r0 ? pc.options[1].optionId : pc.options[0].optionId;
    }

    case 'gayle_attack_reroll': {
      // Reroll if 1st roll is poor: normal expected |1d6-1d4| = 1.92 -> reroll on 0 or 1;
      // Masamune expected 1d4 = 2.5 -> reroll on 1 or 2!
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
        const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, tPub);
        const val = isEnemyProb * 3 - isAllyProb * 4 + tPub.woundsTaken * 0.25;
        if (val > bestVal) {
          bestVal = val;
          bestOpt = opt;
        }
      }
      // Boost if target is likely an enemy and Victor has safe HP buffer (hp >= 4) or target near death (wounds >= 8)
      const bestTarget = bestOpt ? pub.players.find((p) => p.playerId === bestOpt.targetPlayerId) : null;
      const canFinish = Boolean(bestTarget && bestTarget.woundsTaken >= 8);
      if (bestOpt && bestVal > 0.8 && (priv.hp >= 4 || (priv.hp >= 2 && canFinish))) {
        return bestOpt.optionId;
      }
      return 'skip';
    }

    case 'wendigo_reveal_heal': {
      // Reveal when hurt, or mid/late match; occasionally stay hidden if at 0 wounds early
      if (priv.woundsTaken >= 1 || pub.deadCount >= 2 || pub.round >= 3) {
        return 'reveal_and_activate';
      }
      return rng() < 0.35 ? 'reveal_and_activate' : 'decline';
    }

    case 'undying_reveal_reduce': {
      // Reveal to save life, or when taking >= 2 damage after round 1 / already wounded
      if (priv.hp <= 4 || priv.woundsTaken >= 2 || pub.round >= 2) {
        return 'reveal_and_reduce';
      }
      return rng() < 0.75 ? 'reveal_and_reduce' : 'decline';
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

  const scoredOthers = aliveOthers
    .map((p) => {
      const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, p);
      const isWerewolfDanger =
        p.revealedRoleId === 'suong-gac-cong' && priv.roleId === 'lang-anh-san' && p.woundsTaken < 8;
      const isG43TankPenalty =
        p.revealedRoleId === 'exp2_g43' && !hasDamageWeapon ? 0.55 : 0;
      const woundWeight =
        priv.roleId === 'lang-cuu-ho' || priv.roleId === 'lang-quan-sat' || priv.roleId === 'exp2_wyvern'
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
        (p.revealedFaction === 'mist-order' && priv.faction === 'lantern-guard' ? 0.8 : 0) +
        (p.revealedFaction === 'lantern-guard' && priv.faction === 'mist-order' ? 0.6 : 0) +
        (p.revealedRoleId === 'lang-quan-sat' && priv.faction !== 'lantern-guard' ? 0.7 : 0) +
        (p.revealedRoleId === 'lang-anh-san' && p.equipped.length >= 4 ? 1.8 : 0) +
        (p.revealedRoleId === 'lang-cuu-ho' && pub.deadCount >= 2 ? 1.1 : 0) -
        (isWerewolfDanger ? 1.5 : 0) -
        isG43TankPenalty;
      return {
        player: p,
        isEnemyProb,
        isAllyProb,
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

    // Felicia loves Lobby (White) & Canteen (Black) & Breaker!
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
    // Felicia reveals right before drawing White or Black deck to maximize Tháo Vát!
    if (
      priv.roleId === 'exp1_felicia' &&
      !priv.revealed &&
      (selfPub.location === 'lobby' || selfPub.location === 'canteen' || selfPub.location === 'breaker')
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
        if (priv.roleId === 'exp1_felicia' && priv.revealed) {
          return { type: 'DRAW_CARD', deck: selfPub.equipped.length < 2 ? 'equipment' : 'event' };
        }
        if (priv.roleId === 'lang-anh-san') {
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
        if (pub.round === 1 && scoredOthers[0].isEnemyProb < 0.72 && priv.roleId !== 'lang-tien-phong') {
          return { type: 'SKIP_LOC' };
        }
        return { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: bestTarget.playerId };
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
          ['lang-quan-sat', 'gac-truc-ban', 'suong-tin-gia', 'exp1_undying'].includes(priv.roleId) &&
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
        return { type: 'USE_CARD', cardId: card.id, targetPlayerId: bestTarget.playerId };
      }
      return { type: 'USE_CARD', cardId: card.id };
    }

    const reachableScored = scoredOthers.filter((x) => {
      const sameCluster = areInSameCluster(selfPub.location, x.player.location, pub.clusterPairs);
      return hasHandgun ? !sameCluster : sameCluster;
    });

    // Strategic Voluntary Reveal (skill-aware for all 18 roles!)
    if (
      !priv.revealed &&
      priv.roleId !== 'lang-tien-phong' &&
      priv.roleId !== 'suong-tin-gia' &&
      priv.roleId !== 'exp1_wendigo' &&
      priv.roleId !== 'exp1_undying'
    ) {
      const inRangeGeared = reachableScored.some((x) => x.player.equipped.length > 0);
      const shouldRevealNow =
        ((priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') &&
          ((pub.round >= 2 && (scoredOthers[0].isEnemyProb >= 0.68 || bestTarget.woundsTaken >= 5)) ||
            hasSpear ||
            pub.round >= 4)) ||
        (priv.roleId === 'gac-truc-ban' && (hasSpear || selfPub.woundsTaken >= 5 || pub.round >= 4)) ||
        (priv.roleId === 'suong-an-danh' && priv.woundsTaken >= 2 && reachableScored.length > 0) ||
        (priv.roleId === 'suong-gac-cong' && (priv.woundsTaken >= 2 || pub.round >= 2)) ||
        (priv.roleId === 'lang-quan-sat' && priv.woundsTaken >= 4) ||
        (priv.roleId === 'lang-anh-san' && (inRangeGeared && pub.players.length <= 6 && !hasMachineGun || selfPub.equipped.length >= 4)) ||
        (priv.roleId === 'lang-cuu-ho' && (pub.deadCount >= 2 && priv.hp >= 5 && reachableScored.length > 0)) ||
        // Starter Eight reveal heuristics:
        (priv.roleId === 'exp2_g43' && (priv.woundsTaken >= 1 || hasSpear || pub.round >= 2)) ||
        (priv.roleId === 'exp2_fiona' && ((reachableScored.length > 0 && pub.round >= 2) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp2_wyvern' && (reachableScored.some((x) => x.player.woundsTaken >= 4) || pub.round >= 3)) ||
        (priv.roleId === 'exp1_gayle' && ((reachableScored.length > 0 && pub.round >= 2) || hasSpear || pub.round >= 3)) ||
        (priv.roleId === 'exp1_felicia' && (pub.round >= 1)) ||
        (priv.roleId === 'exp1_victor' && (reachableScored.length > 0 && priv.hp >= 5 && pub.round >= 2));

      if (shouldRevealNow) {
        return { type: 'REVEAL_ROLE' };
      }
    }

    // Active skills (Classic)
    if (priv.revealed) {
      if (
        (priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') &&
        !priv.skillUsedOnce &&
        (scoredOthers[0].isEnemyProb >= 0.65 || bestTarget.woundsTaken >= 5 || pub.round >= 4)
      ) {
        return { type: 'USE_SKILL', targetPlayerId: bestTarget.playerId };
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
          (x) => x.player.playerId === selfPub.lastAttackTargetId && (pub.deadCount >= 2 && x.player.woundsTaken >= 5),
        );
        if (feastTarget) return { type: 'USE_SKILL', targetPlayerId: feastTarget.playerId };
      }
    }

    // Combat Attack
    if (selfPub.attacksThisTurn < 1 && reachableScored.length > 0) {
      if (hasMasamune) {
        return { type: 'ATTACK', targetPlayerId: reachableScored[0].player.playerId };
      }
      const top = reachableScored[0];
      const topIsConfirmedAlly =
        top.isAllyProb >= 0.85 &&
        !['lang-anh-san', 'lang-quan-sat', 'lang-cuu-ho'].includes(priv.roleId) &&
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

function runStarterEightSimulation() {
  const validation = DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-eight', 8, {
    allowExperimental: true,
  });
  assert.equal(validation.ok, true, 'starter-eight must validate under allowExperimental');

  const stats = {
    rulesetId: 'starter-eight',
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
    wanderer5to8: { appearances: 0, wins: 0 },
    byCount: {},
    byRole: {},
    combos: {
      victorMachineGunAppearances: 0,
      victorMachineGunWins: 0,
      fionaMasamuneOrSpearAppearances: 0,
      fionaMasamuneOrSpearWins: 0,
      gayleMasamuneOrSpearAppearances: 0,
      gayleMasamuneOrSpearWins: 0,
      g43HolyRobeAppearances: 0,
      g43HolyRobeWins: 0,
      undyingHolyRobeAppearances: 0,
      undyingHolyRobeWins: 0,
      feliciaThreePlusGearAppearances: 0,
      feliciaThreePlusGearWins: 0,
      wyvernShadowKillFullHeals: 0,
    },
    pendingChoicesResolved: {
      fiona_attack_roll: 0,
      wendigo_reveal_heal: 0,
      gayle_attack_reroll: 0,
      felicia_draw_choice: 0,
      victor_blood_boost: 0,
      undying_reveal_reduce: 0,
    },
  };

  for (const d of ALL_STARTER_EIGHT_DESIGNS) {
    stats.byRole[d.id] = {
      id: d.id,
      name: d.name,
      faction: d.faction,
      maxHp: d.maxHp,
      isExpansion: PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS.includes(d.id),
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
  const gamesPerSize = 2000; // 5 * 2,000 = 10,000 deterministic matches!
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
      const seed = 7_000_000 + playerCount * 100_000 + g + 1;
      const rng = createRng(seed);
      const players = Array.from({ length: playerCount }, (_, idx) => ({
        playerId: `bot_${idx + 1}`,
        displayName: `Bot ${idx + 1}`,
        seatIndex: idx,
        appearance: { gender: idx % 2 === 0 ? 'male' : 'female', topStyle: 'jacket', hairColor: '#1f2937', skinTone: '#f1c27d' },
        connected: true,
      }));
      const profiles = players.map((_, idx) => PROFILES[(g + idx) % PROFILES.length]);

      let nowMs = 1_780_000_000_000 + seed * 10_000;
      const state = createInitialGameState({
        matchId: `s8-${playerCount}-${g}`,
        seed,
        nowMs,
        rulesetId: 'starter-eight',
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
      const maxSteps = 2800;
      let prevAliveSet = new Set(players.map((p) => p.playerId));
      const prevWounds = {};
      for (const p of players) prevWounds[p.playerId] = 0;

      // Track peak gear combos held during match
      const hadCombo = {
        victorMg: false,
        fionaWep: false,
        gayleWep: false,
        g43Robe: false,
        undyingRobe: false,
        feliciaGear3: false,
      };

      while (!state.finished && safety < maxSteps) {
        safety += 1;
        nowMs += 250;

        // 1. Handle Pending Choice (can belong to ANY player, even out-of-turn secret reactions!)
        if (state.pendingChoice) {
          const ownerId = state.pendingChoice.ownerPlayerId;
          const choiceKind = state.pendingChoice.kind;
          const pub = getPublicGameView(state);
          const ownerPriv = getPrivateGameView(state, ownerId);

          // Verify P0 secret privacy invariant inside simulation!
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
            // Safe default fallback
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
          stats.pendingChoicesResolved[choiceKind] = (stats.pendingChoicesResolved[choiceKind] || 0) + 1;
        } else {
          // 2. Normal active-player turn action
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

        // Track wounds dealt, deaths & combo peaks
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
          if (p.roleId === 'exp1_victor' && p.equipped.includes('ev-06')) hadCombo.victorMg = true;
          if (p.roleId === 'exp2_fiona' && (p.equipped.includes('ev-01') || p.equipped.includes('eq-04'))) hadCombo.fionaWep = true;
          if (p.roleId === 'exp1_gayle' && (p.equipped.includes('ev-01') || p.equipped.includes('eq-04'))) hadCombo.gayleWep = true;
          if (p.roleId === 'exp2_g43' && p.equipped.includes('eq-01')) hadCombo.g43Robe = true;
          if (p.roleId === 'exp1_undying' && p.equipped.includes('eq-01')) hadCombo.undyingRobe = true;
          if (p.roleId === 'exp1_felicia' && p.equipped.length >= 3) hadCombo.feliciaGear3 = true;
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
        for (const rid of PHASE2_IMPLEMENTED_EXPANSION_ROLE_IDS) {
          stats.byRole[rid].skillActivations += expStats.activationsByRole?.[rid] ?? 0;
          stats.byRole[rid].healTotal += expStats.healByRole?.[rid] ?? 0;
          stats.byRole[rid].damagePreventedTotal += expStats.damagePreventedByRole?.[rid] ?? 0;
          stats.byRole[rid].bonusDamageTotal += expStats.bonusDamageByRole?.[rid] ?? 0;
        }
      }

      // Check Wyvern Shadow full-heal occurrences from logs
      for (const l of state.publicLog) {
        if (l.text.includes('hạ gục Shadow, hồi đầy máu')) {
          stats.combos.wyvernShadowKillFullHeals += 1;
        }
      }

      for (const p of Object.values(state.players)) {
        const rb = stats.byRole[p.roleId];
        const won = state.winnerPlayerIds.includes(p.playerId);
        rb.appearances += 1;
        if (won) rb.wins += 1;
        if (p.alive) rb.survived += 1;
        if (p.revealed) rb.reveals += 1;

        if (p.roleId === 'exp1_victor' && hadCombo.victorMg) {
          stats.combos.victorMachineGunAppearances += 1;
          if (won) stats.combos.victorMachineGunWins += 1;
        }
        if (p.roleId === 'exp2_fiona' && hadCombo.fionaWep) {
          stats.combos.fionaMasamuneOrSpearAppearances += 1;
          if (won) stats.combos.fionaMasamuneOrSpearWins += 1;
        }
        if (p.roleId === 'exp1_gayle' && hadCombo.gayleWep) {
          stats.combos.gayleMasamuneOrSpearAppearances += 1;
          if (won) stats.combos.gayleMasamuneOrSpearWins += 1;
        }
        if (p.roleId === 'exp2_g43' && hadCombo.g43Robe) {
          stats.combos.g43HolyRobeAppearances += 1;
          if (won) stats.combos.g43HolyRobeWins += 1;
        }
        if (p.roleId === 'exp1_undying' && hadCombo.undyingRobe) {
          stats.combos.undyingHolyRobeAppearances += 1;
          if (won) stats.combos.undyingHolyRobeWins += 1;
        }
        if (p.roleId === 'exp1_felicia' && hadCombo.feliciaGear3) {
          stats.combos.feliciaThreePlusGearAppearances += 1;
          if (won) stats.combos.feliciaThreePlusGearWins += 1;
        }

        if (p.faction === 'wanderer' && playerCount >= 5) {
          stats.wanderer5to8.appearances += 1;
          countBucket.wandererAppearances += 1;
          if (won) {
            stats.wanderer5to8.wins += 1;
            countBucket.wandererWins += 1;
          }
        }
      }
    }
  }

  const elapsedMs = Date.now() - t0;
  const completed = Math.max(1, stats.totalGames - stats.stalledGames);
  const totalSeats = stats.totalGames * 6;
  const output = {
    rulesetId: 'starter-eight',
    elapsedMs,
    totalGames: stats.totalGames,
    completedGames: completed,
    stalledGames: stats.stalledGames,
    draws: stats.draws,
    botAccessViolations: stats.botAccessViolations,
    avgRounds: +(stats.totalRounds / completed).toFixed(2),
    avgTurns: +(stats.totalTurns / completed).toFixed(2),
    maxRound: stats.maxRound,
    reachedMaxRoundPct: +((stats.reachedMaxRound / completed) * 100).toFixed(2),
    earlyEndRounds1To2Pct: +((stats.earlyEnds1To2 / completed) * 100).toFixed(2),
    round1PlayerDeathRatePct: +((stats.round1Deaths / totalSeats) * 100).toFixed(3),
    avgEliminationsPerGame: +(stats.totalEliminations / completed).toFixed(2),
    avgDamageDealtPerGame: +(stats.totalDamageDealt / completed).toFixed(2),
    primaryFactionRates: {
      lanternGuardPct: +((stats.primaryFactions['lantern-guard'] / completed) * 100).toFixed(2),
      mistOrderPct: +((stats.primaryFactions['mist-order'] / completed) * 100).toFixed(2),
      wandererPrimaryPct: +((stats.primaryFactions.wanderer / completed) * 100).toFixed(2),
    },
    wanderer5to8WinRatePct: +((stats.wanderer5to8.wins / Math.max(1, stats.wanderer5to8.appearances)) * 100).toFixed(2),
    pendingChoicesResolved: stats.pendingChoicesResolved,
    combos: {
      victorMachineGun: {
        appearances: stats.combos.victorMachineGunAppearances,
        winRatePct: +((stats.combos.victorMachineGunWins / Math.max(1, stats.combos.victorMachineGunAppearances)) * 100).toFixed(2),
      },
      fionaMasamuneOrSpear: {
        appearances: stats.combos.fionaMasamuneOrSpearAppearances,
        winRatePct: +((stats.combos.fionaMasamuneOrSpearWins / Math.max(1, stats.combos.fionaMasamuneOrSpearAppearances)) * 100).toFixed(2),
      },
      gayleMasamuneOrSpear: {
        appearances: stats.combos.gayleMasamuneOrSpearAppearances,
        winRatePct: +((stats.combos.gayleMasamuneOrSpearWins / Math.max(1, stats.combos.gayleMasamuneOrSpearAppearances)) * 100).toFixed(2),
      },
      g43HolyRobe: {
        appearances: stats.combos.g43HolyRobeAppearances,
        winRatePct: +((stats.combos.g43HolyRobeWins / Math.max(1, stats.combos.g43HolyRobeAppearances)) * 100).toFixed(2),
      },
      undyingHolyRobe: {
        appearances: stats.combos.undyingHolyRobeAppearances,
        winRatePct: +((stats.combos.undyingHolyRobeWins / Math.max(1, stats.combos.undyingHolyRobeAppearances)) * 100).toFixed(2),
      },
      feliciaThreePlusGear: {
        appearances: stats.combos.feliciaThreePlusGearAppearances,
        winRatePct: +((stats.combos.feliciaThreePlusGearWins / Math.max(1, stats.combos.feliciaThreePlusGearAppearances)) * 100).toFixed(2),
      },
      wyvernShadowKillFullHeals: stats.combos.wyvernShadowKillFullHeals,
    },
    byPlayerCount: Object.fromEntries(
      Object.entries(stats.byCount).map(([pc, v]) => [
        `${pc}p`,
        {
          games: v.games,
          guardWinPct: +((v.guardWins / v.games) * 100).toFixed(2),
          mistWinPct: +((v.mistWins / v.games) * 100).toFixed(2),
          wandererPrimaryPct: +((v.wandererPrimaryWins / v.games) * 100).toFixed(2),
          wandererRoleWinPct:
            v.wandererAppearances > 0
              ? +((v.wandererWins / v.wandererAppearances) * 100).toFixed(2)
              : 0,
          avgRounds: +(v.roundSum / v.games).toFixed(2),
          avgTurns: +(v.turnSum / v.games).toFixed(2),
          earlyEndPct: +((v.earlyEnds / v.games) * 100).toFixed(2),
        },
      ]),
    ),
    byRole: Object.values(stats.byRole).map((r) => ({
      id: r.id,
      name: r.name,
      faction: r.faction,
      maxHp: r.maxHp,
      isExpansion: r.isExpansion,
      appearances: r.appearances,
      winRatePct: +((r.wins / Math.max(1, r.appearances)) * 100).toFixed(2),
      survivalPct: +((r.survived / Math.max(1, r.appearances)) * 100).toFixed(2),
      revealPct: +((r.reveals / Math.max(1, r.appearances)) * 100).toFixed(2),
      avgSkillActivationsPerAppearance: +(r.skillActivations / Math.max(1, r.appearances)).toFixed(2),
      avgHealPerAppearance: +(r.healTotal / Math.max(1, r.appearances)).toFixed(2),
      avgDamagePreventedPerAppearance: +(r.damagePreventedTotal / Math.max(1, r.appearances)).toFixed(2),
      avgBonusDamagePerAppearance: +(r.bonusDamageTotal / Math.max(1, r.appearances)).toFixed(2),
    })),
  };

  console.log(JSON.stringify(output, null, 2));

  if (process.argv.includes('--write-json')) {
    const outPath = path.resolve(__dirname, '../docs/boardgame-expansion/phase-2/starter-eight-sim-data.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  }

  assert.equal(stats.totalGames, 10000, 'Expected 10,000 simulated starter-eight games');
  assert.equal(stats.stalledGames, 0, `Unexpected stalled games: ${stats.stalledGames}`);
  assert.equal(stats.draws, 0, `Unexpected draw games: ${stats.draws}`);
  assert.equal(stats.botAccessViolations, 0, `Bot privacy violations: ${stats.botAccessViolations}`);

  console.log(`\nPASS: 10,000-match starter-eight simulation completed in ${elapsedMs}ms (0 stalls, 0 draws, 0 privacy leaks).`);
}

runStarterEightSimulation();
