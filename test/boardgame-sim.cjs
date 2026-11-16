#!/usr/bin/env node
'use strict';

require('./register-ts.cjs');

const assert = require('node:assert/strict');
const {
  LOCATIONS_CATALOG,
  ROLES_BY_ID,
  ROLES_CATALOG,
  applyPlayerGameAction,
  areInSameCluster,
  createInitialGameState,
  getActivePlayer,
  getPairedLocationInCluster,
  getPrivateGameView,
  getPublicGameView,
  getRoleDistribution,
} = require('../features/boardgame/domain/index.ts');

// ---------------------------------------------------------------------------
// Deterministic PRNG (Mulberry32)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Clue Deduction Filter (purely from public role catalog & private clues)
// ---------------------------------------------------------------------------
const CLUE_CONDITION_FILTERS = [
  {
    key: '[Săn Đêm hoặc Bóng Đêm',
    fn: (r) => r.faction === 'lantern-guard' || r.faction === 'mist-order',
  },
  {
    key: '[Săn Đêm hoặc Độc Hành',
    fn: (r) => r.faction === 'lantern-guard' || r.faction === 'wanderer',
  },
  {
    key: '[Độc Hành hoặc Bóng Đêm',
    fn: (r) => r.faction === 'wanderer' || r.faction === 'mist-order',
  },
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
          ROLES_CATALOG.filter(
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
      seenLogIds: new Set(),
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

    // Exact Prediction (Tiên Tri) reveal
    let exactMatched = false;
    for (const r of ROLES_CATALOG) {
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
          // Khánh "Tin Giả" (Unknown) khi úp vai có thể né ST/cướp hoặc giả danh khớp thẻ Hồi 1
          if (targetUnrevealed && roleId === 'suong-tin-gia') {
            continue;
          }
          const role = ROLES_BY_ID[roleId];
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
    const role = ROLES_BY_ID[pubTarget.revealedRoleId];
    if (danielSupportsHunters) {
      return {
        isEnemyProb: role.faction === 'lantern-guard' ? 0 : role.faction === 'mist-order' ? 1 : 0.35,
        isAllyProb: role.faction === 'lantern-guard' ? 1 : 0,
      };
    }
    if (priv.faction === 'lantern-guard') {
      if (role.faction === 'mist-order') return { isEnemyProb: 1, isAllyProb: 0 };
      if (role.faction === 'lantern-guard') return { isEnemyProb: 0, isAllyProb: 1 };
      // Revealed Neutral: target only when near solo-win or feeding threat
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
      // Shadows hunt weak Neutrals (especially 8-HP Allie) to secure 3-Neutral-dead victory
      return { isEnemyProb: pub.players.length >= 6 ? 1 : 0.7, isAllyProb: 0 };
    }
    // Wanderer attacking revealed targets
    return {
      isEnemyProb: 1,
      isAllyProb: 0,
    };
  }

  const set = botMem.possible[target.playerId];
  if (!set || set.size === 0) {
    return { isEnemyProb: 0.5, isAllyProb: 0.3 };
  }
  let enemyWeight = 0;
  let allyWeight = 0;
  for (const rid of set) {
    const r = ROLES_BY_ID[rid];
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

  // Score alive others
  const scoredOthers = aliveOthers
    .map((p) => {
      const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, p);
      const isWerewolfDanger =
        p.revealedRoleId === 'suong-gac-cong' && priv.roleId === 'lang-anh-san' && p.woundsTaken < 8;
      const woundWeight =
        priv.roleId === 'lang-cuu-ho' || priv.roleId === 'lang-quan-sat' ? 0.28 : 0.12;
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
        (isWerewolfDanger ? 1.5 : 0);
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
        if (shouldTeleport) {
          return { type: 'USE_SKILL' };
        }
      }
    }
    return { type: 'ROLL_DICE' };
  }

  // Phase 1B: CHOOSE_MOVE (dice 7 or Mystic Compass eq-05)
  if (pub.turnPhase === 'CHOOSE_MOVE') {
    const poolIds =
      pub.allowedMoveDestinations && pub.allowedMoveDestinations.length > 0
        ? pub.allowedMoveDestinations
        : LOCATIONS_CATALOG.filter((l) => l.id !== selfPub.location).map((l) => l.id);

    if (priv.roleId === 'lang-anh-san' && selfPub.equipped.length < 5) {
      const geared = aliveOthers.find((p) => p.equipped.length > 0);
      if (geared && poolIds.includes('court')) return { type: 'CHOOSE_DEST', location: 'court' };
      if (selfPub.woundsTaken >= 6 && poolIds.includes('corridor')) {
        return { type: 'CHOOSE_DEST', location: 'corridor' };
      }
      // In 5-6p Robbery (only without Machine Gun) or 7-8p kill-loot on weakened geared, jump into range
      const lootTarget = scoredOthers.find(
        (x) =>
          x.player.equipped.length > 0 &&
          x.player.revealedRoleId !== 'suong-gac-cong' &&
          (pub.players.length <= 6 && !hasMachineGun
            ? true
            : x.player.woundsTaken >= (hasDamageWeapon || hasMachineGun ? 2 : 4)),
      )?.player;
      if (lootTarget) {
        const huntLocs = poolIds.filter((locId) =>
          hasHandgun
            ? !areInSameCluster(locId, lootTarget.location, pub.clusterPairs)
            : areInSameCluster(locId, lootTarget.location, pub.clusterPairs),
        );
        const preferredDrawHunt =
          huntLocs.find((id) => id === 'lobby') ||
          huntLocs.find((id) => id === 'breaker') ||
          huntLocs.find((id) => id === 'canteen') ||
          huntLocs[0];
        if (
          preferredDrawHunt &&
          (pub.players.length <= 6 ||
            ['lobby', 'breaker', 'canteen'].includes(preferredDrawHunt) ||
            lootTarget.equipped.length >= 2)
        ) {
          return { type: 'CHOOSE_DEST', location: preferredDrawHunt };
        }
      }
      if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
      if (poolIds.includes('breaker')) return { type: 'CHOOSE_DEST', location: 'breaker' };
      if (poolIds.includes('canteen')) return { type: 'CHOOSE_DEST', location: 'canteen' };
    }
    if (priv.roleId === 'lang-cuu-ho' && pub.deadCount < 2) {
      if (selfPub.woundsTaken >= 5 && poolIds.includes('corridor')) {
        return { type: 'CHOOSE_DEST', location: 'corridor' };
      }
      if (poolIds.includes('lobby')) return { type: 'CHOOSE_DEST', location: 'lobby' };
      if (poolIds.includes('canteen')) return { type: 'CHOOSE_DEST', location: 'canteen' };
    }
    if (
      priv.woundsTaken >= 5 &&
      !(priv.roleId === 'lang-tien-phong' && pub.deadCount === 0) &&
      poolIds.includes('corridor')
    ) {
      return { type: 'CHOOSE_DEST', location: 'corridor' };
    }
    if (bestTarget && bestTarget.woundsTaken >= 6 && poolIds.includes('corridor')) {
      return { type: 'CHOOSE_DEST', location: 'corridor' };
    }
    if (pub.round === 1 && selfPub.equipped.length >= 1 && priv.roleId !== 'lang-anh-san' && poolIds.includes('radio')) {
      return { type: 'CHOOSE_DEST', location: 'radio' };
    }
    const desiredId =
      poolIds.find((locId) => areInSameCluster(locId, bestTarget.location, pub.clusterPairs)) ||
      pickRandom(poolIds, rng) ||
      poolIds[0];
    return { type: 'CHOOSE_DEST', location: desiredId };
  }

  // Phase 2: LOCATION_ACTION
  if (pub.turnPhase === 'LOCATION_ACTION') {
    switch (selfPub.location) {
      case 'radio':
        return { type: 'DRAW_CARD', deck: 'investigation' };
      case 'lobby':
        return { type: 'DRAW_CARD', deck: 'equipment' };
      case 'canteen':
        return { type: 'DRAW_CARD', deck: 'event' };
      case 'breaker': {
        if (priv.roleId === 'lang-anh-san') {
          if (pub.players.length >= 7 && !hasDamageWeapon && pub.deckCounts.event > 0) {
            return { type: 'DRAW_CARD', deck: 'event' };
          }
          return {
            type: 'DRAW_CARD',
            deck: pub.deckCounts.equipment > 0 ? 'equipment' : 'event',
          };
        }
        if (priv.roleId === 'lang-cuu-ho' && !hasDamageWeapon && pub.deckCounts.event > 0) {
          return { type: 'DRAW_CARD', deck: 'event' };
        }
        if (pub.round <= 2 && selfPub.equipped.length >= 1 && rng() < 0.3 && pub.deckCounts.investigation > 0) {
          return { type: 'DRAW_CARD', deck: 'investigation' };
        }
        return { type: 'DRAW_CARD', deck: rng() < 0.5 ? 'equipment' : 'event' };
      }
      case 'corridor': {
        if (priv.roleId === 'lang-anh-san') {
          if (selfPub.woundsTaken >= 5) {
            return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: selfPub.playerId };
          }
          const killableGeared = aliveOthers
            .filter((p) => p.equipped.length >= 1 && p.woundsTaken >= 8)
            .sort((a, b) => b.equipped.length - a.equipped.length)[0];
          if (killableGeared) {
            return { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: killableGeared.playerId };
          }
          if (pub.players.length >= 7 || hasMachineGun) {
            const lootMark = aliveOthers
              .filter((p) => p.equipped.length >= 2 && p.woundsTaken >= 3)
              .sort((a, b) => b.equipped.length - a.equipped.length)[0];
            if (lootMark) {
              return { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: lootMark.playerId };
            }
          }
          const dyingNoGear = aliveOthers
            .filter((p) => p.equipped.length === 0 && p.woundsTaken >= 6)
            .sort((a, b) => b.woundsTaken - a.woundsTaken)[0];
          if (dyingNoGear) {
            return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: dyingNoGear.playerId };
          }
          if (selfPub.woundsTaken >= 2) {
            return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: selfPub.playerId };
          }
          return { type: 'SKIP_LOC' };
        }
        if (priv.faction === 'lantern-guard' && pub.players.length >= 6 && pub.round <= 3 && scoredOthers[0].isEnemyProb < 0.55) {
          if (selfPub.woundsTaken >= 1) return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: selfPub.playerId };
          if (bestAlly && bestAlly.woundsTaken >= 1) return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: bestAlly.playerId };
          return { type: 'SKIP_LOC' };
        }
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
        if (
          (pub.round === 1 && scoredOthers[0].isEnemyProb < 0.72 && priv.roleId !== 'lang-tien-phong') ||
          (priv.roleId === 'lang-anh-san' && selfPub.woundsTaken < 3 && bestTarget.woundsTaken < 6) ||
          (priv.roleId === 'lang-cuu-ho' && pub.deadCount < 2 && bestTarget.woundsTaken < 6)
        ) {
          return { type: 'SKIP_LOC' };
        }
        return { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: bestTarget.playerId };
      }
      case 'court': {
        const donor = scoredOthers
          .filter((x) => x.player.equipped.length > 0)
          .sort((a, b) => {
            const aBobThreat = a.player.equipped.length >= 4 ? 10 : 0;
            const bBobThreat = b.player.equipped.length >= 4 ? 10 : 0;
            if (aBobThreat !== bBobThreat) return bBobThreat - aBobThreat;
            const aMainFoe = a.player.revealedFaction && a.player.revealedFaction !== 'wanderer' && a.player.revealedFaction !== priv.faction ? 2 : 0;
            const bMainFoe = b.player.revealedFaction && b.player.revealedFaction !== 'wanderer' && b.player.revealedFaction !== priv.faction ? 2 : 0;
            if (aMainFoe !== bMainFoe) return bMainFoe - aMainFoe;
            const aHarmlessBob = a.player.revealedRoleId === 'lang-anh-san' && a.player.equipped.length <= 3 ? 1 : 0;
            const bHarmlessBob = b.player.revealedRoleId === 'lang-anh-san' && b.player.equipped.length <= 3 ? 1 : 0;
            if (aHarmlessBob !== bHarmlessBob) return aHarmlessBob - bHarmlessBob;
            const aWeap = a.player.equipped.some((c) => ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-05', 'ev-06', 'eq-04'].includes(c.id)) ? 1 : 0;
            const bWeap = b.player.equipped.some((c) => ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-05', 'ev-06', 'eq-04'].includes(c.id)) ? 1 : 0;
            if (aWeap !== bWeap) return bWeap - aWeap;
            return b.attackScore - a.attackScore;
          })[0]?.player;
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
    // Step 3A: Mandatory resolution of drawn hand cards before ATTACK or END_TURN
    if (priv.hand.length > 0) {
      const card = priv.hand[0];
      if (!card.isConsumable && card.deck !== 'investigation') {
        return { type: 'EQUIP_CARD', cardId: card.id };
      }
      if (card.deck === 'investigation') {
        if (['inv-01', 'inv-02', 'inv-03'].includes(card.id)) {
          const gearedProbe = scoredOthers
            .map((x) => x.player)
            .filter((p) => p.equipped.length > 0 && !(p.revealedRoleId === 'suong-tin-gia'))
            .filter((p) => {
              if (!p.revealedFaction) return true;
              if (card.id === 'inv-01') return p.revealedFaction !== 'wanderer';
              if (card.id === 'inv-02') return p.revealedFaction !== 'mist-order';
              return p.revealedFaction !== 'lantern-guard';
            })
            .sort((a, b) => {
              if (b.woundsTaken !== a.woundsTaken) return b.woundsTaken - a.woundsTaken;
              return b.equipped.length - a.equipped.length;
            })[0];
          if (gearedProbe) {
            return { type: 'INVESTIGATE_CARD', cardId: card.id, targetPlayerId: gearedProbe.playerId };
          }
        }
        const targetToProbe =
          aliveOthers
            .filter((p) => !p.revealedRoleId)
            .sort(
              (a, b) => (botMem.possible[b.playerId]?.size || 0) - (botMem.possible[a.playerId]?.size || 0),
            )[0] || aliveOthers[0];
        return {
          type: 'INVESTIGATE_CARD',
          cardId: card.id,
          targetPlayerId: targetToProbe.playerId,
        };
      }
      if (card.id === 'eq-08') {
        const blessTarget = bestAlly || aliveOthers[aliveOthers.length - 1];
        return { type: 'USE_CARD', cardId: card.id, targetPlayerId: blessTarget.playerId };
      }
      if (card.id === 'eq-09') {
        let aidTargetId = bestTarget.playerId;
        if (selfPub.woundsTaken >= 8) {
          aidTargetId = selfPub.playerId;
        } else if (bestAlly && bestAlly.woundsTaken >= 8) {
          aidTargetId = bestAlly.playerId;
        } else {
          const healthyEnemy = scoredOthers
            .filter((x) => x.isAllyProb < 0.5 && x.player.woundsTaken < 7)
            .sort((a, b) => a.player.woundsTaken - b.player.woundsTaken)[0]?.player;
          if (healthyEnemy) aidTargetId = healthyEnemy.playerId;
        }
        return { type: 'USE_CARD', cardId: 'eq-09', targetPlayerId: aidTargetId };
      }
      if (card.id === 'eq-13') {
        const trigger = priv.faction === 'lantern-guard' && (priv.woundsTaken >= 2 || priv.revealed);
        return { type: 'USE_CARD', cardId: 'eq-13', ...(trigger ? {} : { skipEffect: true }) };
      }
      if (card.id === 'eq-14') {
        const trigger =
          ['lang-quan-sat', 'gac-truc-ban', 'suong-tin-gia'].includes(priv.roleId) &&
          (priv.woundsTaken >= 2 || priv.revealed);
        return { type: 'USE_CARD', cardId: 'eq-14', ...(trigger ? {} : { skipEffect: true }) };
      }
      if (card.id === 'ev-13') {
        const trigger = priv.faction === 'mist-order' && (priv.woundsTaken >= 2 || priv.revealed);
        return { type: 'USE_CARD', cardId: 'ev-13', ...(trigger ? {} : { skipEffect: true }) };
      }
      if (card.id === 'ev-11') {
        const donor = scoredOthers
          .filter((x) => x.player.equipped.length > 0)
          .sort((a, b) => {
            const aBobThreat = a.player.equipped.length >= 4 ? 10 : 0;
            const bBobThreat = b.player.equipped.length >= 4 ? 10 : 0;
            if (aBobThreat !== bBobThreat) return bBobThreat - aBobThreat;
            const aMainFoe = a.player.revealedFaction && a.player.revealedFaction !== 'wanderer' && a.player.revealedFaction !== priv.faction ? 2 : 0;
            const bMainFoe = b.player.revealedFaction && b.player.revealedFaction !== 'wanderer' && b.player.revealedFaction !== priv.faction ? 2 : 0;
            if (aMainFoe !== bMainFoe) return bMainFoe - aMainFoe;
            const aHarmlessBob = a.player.revealedRoleId === 'lang-anh-san' && a.player.equipped.length <= 3 ? 1 : 0;
            const bHarmlessBob = b.player.revealedRoleId === 'lang-anh-san' && b.player.equipped.length <= 3 ? 1 : 0;
            if (aHarmlessBob !== bHarmlessBob) return aHarmlessBob - bHarmlessBob;
            const aWeap = a.player.equipped.some((c) => ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-05', 'ev-06', 'eq-04'].includes(c.id)) ? 1 : 0;
            const bWeap = b.player.equipped.some((c) => ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-05', 'ev-06', 'eq-04'].includes(c.id)) ? 1 : 0;
            if (aWeap !== bWeap) return bWeap - aWeap;
            return b.attackScore - a.attackScore;
          })[0]?.player;
        return {
          type: 'USE_CARD',
          cardId: 'ev-11',
          ...(donor ? { targetPlayerId: donor.playerId } : {}),
        };
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

    // Step 3B: Strategic Voluntary Reveal (never Daniel or Unknown)
    if (
      !priv.revealed &&
      priv.roleId !== 'lang-tien-phong' &&
      priv.roleId !== 'suong-tin-gia'
    ) {
      const inRangeGeared = reachableScored.some((x) => x.player.equipped.length > 0);
      const inRangeHighWoundsGeared = reachableScored.some(
        (x) =>
          (x.player.equipped.length >= 2 &&
            (x.player.woundsTaken >= (hasDamageWeapon ? 6 : 7) ||
              (x.player.revealedMaxHp &&
                x.player.revealedMaxHp - x.player.woundsTaken <= (hasDamageWeapon ? 4 : 3)))) ||
          (x.player.equipped.length >= 1 && x.player.woundsTaken >= 8),
      );
      const shouldRevealNow =
        ((priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') &&
          ((pub.round >= 2 &&
            (scoredOthers[0].isEnemyProb >= 0.68 ||
              bestTarget.revealedFaction === 'mist-order' ||
              bestTarget.woundsTaken >= 5)) ||
            hasSpear ||
            pub.round >= 4)) ||
        (priv.roleId === 'gac-truc-ban' && (hasSpear || selfPub.woundsTaken >= 5 || pub.round >= 4)) ||
        (priv.roleId === 'suong-an-danh' && priv.woundsTaken >= 2 && reachableScored.length > 0) ||
        (priv.roleId === 'suong-gac-cong' && (priv.woundsTaken >= 2 || pub.round >= 2)) ||
        (priv.roleId === 'lang-quan-sat' && priv.woundsTaken >= 4) ||
        (priv.roleId === 'lang-anh-san' &&
          (pub.players.length <= 6
            ? (inRangeGeared && !hasMachineGun) ||
              (selfPub.equipped.some((c) => c.id === 'eq-06') && inRangeHighWoundsGeared)
            : inRangeHighWoundsGeared ||
              (selfPub.equipped.length >= 4 &&
                reachableScored.some((x) => x.player.equipped.length >= 1 && x.player.woundsTaken >= 6)))) ||
        (priv.roleId === 'lang-cuu-ho' &&
          ((pub.deadCount >= 2 &&
            priv.hp >= 5 &&
            reachableScored.some((x) => x.player.woundsTaken >= 5)) ||
            pub.deadCount >= 3));
      if (shouldRevealNow) {
        return { type: 'REVEAL_ROLE' };
      }
    }

    // Step 3C: Active Skill Usage
    if (priv.revealed) {
      if (
        (priv.roleId === 'gac-ky-thuat' || priv.roleId === 'gac-radio') &&
        !priv.skillUsedOnce &&
        (scoredOthers[0].isEnemyProb >= 0.65 ||
          bestTarget.revealedFaction === 'mist-order' ||
          bestTarget.woundsTaken >= 5 ||
          pub.round >= 4)
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
          (x) =>
            x.player.playerId === selfPub.lastAttackTargetId &&
            ((pub.deadCount >= 2 && x.player.woundsTaken >= 5) ||
              (pub.deadCount >= 3 && priv.hp >= 6)),
        );
        if (feastTarget) {
          return { type: 'USE_SKILL', targetPlayerId: feastTarget.player.playerId };
        }
      }
    }

    // Step 3D: Combat Attack within legal cluster range (respecting Masamune mandatory attack)
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
      const bobHoldFire =
        priv.roleId === 'lang-anh-san' &&
        (pub.players.length <= 6 && !hasMachineGun
          ? top.player.equipped.length === 0 ||
            !priv.revealed ||
            (top.player.revealedRoleId === 'suong-gac-cong' && top.player.woundsTaken < 9 && !hasDamageWeapon)
          : top.player.equipped.length === 0 ||
            (!hasDamageWeapon && !hasMachineGun && top.player.woundsTaken < 3));
      const charlesHoldFire =
        priv.roleId === 'lang-cuu-ho' &&
        pub.deadCount < 2 &&
        top.player.woundsTaken < 5 &&
        !hasDamageWeapon;
      const suppressRound1Blind =
        pub.round === 1 &&
        top.isEnemyProb < 0.72 &&
        priv.roleId !== 'lang-tien-phong';
      if (
        !topIsConfirmedAlly &&
        !hunterAvoidNeutral &&
        !bobHoldFire &&
        !charlesHoldFire &&
        !suppressRound1Blind
      ) {
        if (
          !(
            hasMachineGun &&
            reachableScored.some((x) => x.isAllyProb >= 0.85 && x.player.woundsTaken >= 8)
          )
        ) {
          return { type: 'ATTACK', targetPlayerId: top.player.playerId };
        }
      }
    }

    return { type: 'END_TURN' };
  }

  return { type: 'END_TURN' };
}

// ---------------------------------------------------------------------------
// Stats Collector
// ---------------------------------------------------------------------------
function runSimulation() {
  const stats = {
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
    round1DeathGames: 0,
    totalEliminations: 0,
    winReasons: {},
    byCount: {},
    byRole: {},
    actions: {
      roll: 0,
      reroll: 0,
      chooseDest: 0,
      draw: 0,
      locPower: 0,
      investigate: 0,
      equip: 0,
      event: 0,
      skill: 0,
      attack: 0,
      reveal: 0,
    },
    primaryFactions: {
      'lantern-guard': 0,
      'mist-order': 0,
      wanderer: 0,
    },
    wanderer5to8: {
      appearances: 0,
      wins: 0,
    },
  };

  for (const r of ROLES_CATALOG) {
    stats.byRole[r.id] = {
      id: r.id,
      name: r.name,
      faction: r.faction,
      appearances: 0,
      wins: 0,
      survived: 0,
      reveals: 0,
    };
  }

  const sizes = [4, 5, 6, 7, 8];
  const gamesPerSize = 900;

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
      const seed = playerCount * 100_000 + g + 1;
      const rng = createRng(seed);
      const players = Array.from({ length: playerCount }, (_, idx) => ({
        playerId: `bot_${idx + 1}`,
        displayName: `Bot ${idx + 1}`,
        seatIndex: idx,
        appearance: { gender: idx % 2 === 0 ? 'male' : 'female', topStyle: 'jacket', hairColor: '#1f2937', skinTone: '#f1c27d' },
        connected: true,
      }));
      const profiles = players.map((_, idx) => PROFILES[(g + idx) % PROFILES.length]);

      let nowMs = 1_760_000_000_000 + seed * 10_000;
      const state = createInitialGameState({
        matchId: `sim4-${playerCount}-${g}`,
        seed,
        nowMs,
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
      const maxSteps = 2200;
      let prevAliveSet = new Set(players.map((p) => p.playerId));
      let hadRound1Death = false;

      while (!state.finished && safety < maxSteps) {
        safety += 1;
        nowMs += 250;
        const active = getActivePlayer(state);
        if (!active) {
          stats.stalledGames += 1;
          break;
        }
        const activeIdx = players.findIndex((p) => p.playerId === active.playerId);

        // Bot-accessible views ONLY
        const pub = getPublicGameView(state);
        const priv = getPrivateGameView(state, active.playerId);

        // Verify strict P0 projection invariants inside simulation
        if (pub.rulesetVersion !== 4) stats.botAccessViolations += 1;
        for (const pp of pub.players) {
          if (!pp.revealedRoleId && pp.playerId !== active.playerId) {
            if (pp.hp !== undefined || pp.maxHp !== undefined) {
              stats.botAccessViolations += 1;
            }
          }
        }
        const rawPub = JSON.stringify(pub);
        if (rawPub.includes('"privateClues":') || rawPub.includes('"signalProgress":')) {
          stats.botAccessViolations += 1;
        }

        const mem = botMemMap[active.playerId];
        updateBotMemory(mem, pub, priv);

        const prevPhase = state.turnPhase;
        const prevLoc = active.location;
        const action = chooseBotAction(pub, priv, mem, profiles[activeIdx], rng);
        let res = applyPlayerGameAction(state, active.playerId, action, nowMs);
        if (!res.ok) {
          // Safe fallback
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
            if (cid.startsWith('inv-')) {
              const oth = Object.values(state.players).find((p) => p.alive && p.playerId !== active.playerId);
              res = applyPlayerGameAction(state, active.playerId, { type: 'INVESTIGATE_CARD', cardId: cid, targetPlayerId: oth.playerId }, nowMs);
            } else {
              const oth = Object.values(state.players).find((p) => p.alive && p.playerId !== active.playerId);
              res = applyPlayerGameAction(state, active.playerId, { type: 'USE_CARD', cardId: cid, skipEffect: true, targetPlayerId: oth?.playerId }, nowMs);
            }
          } else {
            res = applyPlayerGameAction(state, active.playerId, { type: 'END_TURN' }, nowMs);
          }
        }

        if (res.ok) {
          if (action.type === 'ROLL_DICE') {
            stats.actions.roll += 1;
            if (state.lastDiceRoll?.rerollRequired && state.turnPhase === 'ROLL_MOVE') {
              stats.actions.reroll += 1;
            }
          } else if (action.type === 'CHOOSE_DEST') stats.actions.chooseDest += 1;
          else if (action.type === 'DRAW_CARD') stats.actions.draw += 1;
          else if (action.type === 'USE_LOC_POWER') stats.actions.locPower += 1;
          else if (action.type === 'INVESTIGATE_CARD') stats.actions.investigate += 1;
          else if (action.type === 'EQUIP_CARD') stats.actions.equip += 1;
          else if (action.type === 'USE_CARD') stats.actions.event += 1;
          else if (action.type === 'USE_SKILL') stats.actions.skill += 1;
          else if (action.type === 'ATTACK') {
            stats.actions.attack += 1;
            if (botMemMap[action.targetPlayerId]) {
              botMemMap[action.targetPlayerId].attackedMe[active.playerId] =
                (botMemMap[action.targetPlayerId].attackedMe[active.playerId] || 0) + 1;
            }
          } else if (action.type === 'REVEAL_ROLE') {
            stats.actions.reveal += 1;
          }
          void prevPhase;
          void prevLoc;
        } else {
          stats.stalledGames += 1;
          break;
        }

        // Check newly eliminated players
        for (const p of Object.values(state.players)) {
          if (prevAliveSet.has(p.playerId) && !p.alive) {
            prevAliveSet.delete(p.playerId);
            stats.totalEliminations += 1;
            if (state.round === 1) {
              stats.round1Deaths += 1;
              countBucket.round1Deaths += 1;
              hadRound1Death = true;
            }
          }
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
      if (hadRound1Death) stats.round1DeathGames += 1;

      const reasonKey = state.winReason || state.winnerFaction || 'unknown';
      const reasonBucket = state.winnerFaction || 'other';
      stats.winReasons[reasonBucket] = (stats.winReasons[reasonBucket] || 0) + 1;
      void reasonKey;

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

      for (const p of Object.values(state.players)) {
        const rb = stats.byRole[p.roleId];
        rb.appearances += 1;
        if (state.winnerPlayerIds.includes(p.playerId)) rb.wins += 1;
        if (p.alive) rb.survived += 1;
        if (p.revealed) rb.reveals += 1;

        if (p.faction === 'wanderer' && playerCount >= 5) {
          stats.wanderer5to8.appearances += 1;
          countBucket.wandererAppearances += 1;
          if (state.winnerPlayerIds.includes(p.playerId)) {
            stats.wanderer5to8.wins += 1;
            countBucket.wandererWins += 1;
          }
        }
      }
    }
  }

  const completed = Math.max(1, stats.totalGames - stats.stalledGames);
  const guardWinPct = (stats.primaryFactions['lantern-guard'] / completed) * 100;
  const mistWinPct = (stats.primaryFactions['mist-order'] / completed) * 100;
  const wandererPrimaryPct = (stats.primaryFactions.wanderer / completed) * 100;
  const wandererInvolvementPct =
    stats.wanderer5to8.appearances > 0
      ? (stats.wanderer5to8.wins / stats.wanderer5to8.appearances) * 100
      : 0;
  const earlyEndPct = (stats.earlyEnds1To2 / completed) * 100;
  const totalPlayerSeats = stats.totalGames * 6; // avg 6 seats
  const round1PlayerDeathRatePct = (stats.round1Deaths / totalPlayerSeats) * 100;

  console.log(
    JSON.stringify(
      {
        version: 'v4-classic-tabletop',
        totalGames: stats.totalGames,
        stalledGames: stats.stalledGames,
        draws: stats.draws,
        botAccessViolations: stats.botAccessViolations,
        avgRounds: +(stats.totalRounds / completed).toFixed(2),
        avgTurns: +(stats.totalTurns / completed).toFixed(2),
        maxRound: stats.maxRound,
        reachedMaxRoundPct: +((stats.reachedMaxRound / completed) * 100).toFixed(2),
        earlyEndRounds1To2Pct: +earlyEndPct.toFixed(2),
        round1PlayerDeathRatePct: +round1PlayerDeathRatePct.toFixed(3),
        avgEliminationsPerGame: +(stats.totalEliminations / completed).toFixed(2),
        primaryFactionRates: {
          lanternGuardPct: +guardWinPct.toFixed(2),
          mistOrderPct: +mistWinPct.toFixed(2),
          wandererPrimaryPct: +wandererPrimaryPct.toFixed(2),
        },
        wanderer5to8WinRatePct: +wandererInvolvementPct.toFixed(2),
        avgActionsPerGame: Object.fromEntries(
          Object.entries(stats.actions).map(([k, v]) => [k, +(v / completed).toFixed(2)]),
        ),
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
          appearances: r.appearances,
          winRatePct: +((r.wins / Math.max(1, r.appearances)) * 100).toFixed(2),
          survivalPct: +((r.survived / Math.max(1, r.appearances)) * 100).toFixed(2),
          revealPct: +((r.reveals / Math.max(1, r.appearances)) * 100).toFixed(2),
        })),
      },
      null,
      2,
    ),
  );

  // Integrity & Balance Assertions
  assert.equal(stats.totalGames, 4500, 'Expected 4,500 simulated games (900 x 5 sizes)');
  assert.equal(stats.stalledGames, 0, `Unexpected stalled games: ${stats.stalledGames}`);
  assert.equal(stats.draws, 0, `Unexpected draw games: ${stats.draws}`);
  assert.equal(stats.botAccessViolations, 0, 'Bot projection integrity violation');

  assert.ok(
    guardWinPct >= 25 && guardWinPct <= 68,
    `Đội Săn Đêm win rate ${guardWinPct.toFixed(2)}% outside [25%, 68%]`,
  );
  assert.ok(
    mistWinPct >= 25 && mistWinPct <= 68,
    `Hội Bóng Đêm win rate ${mistWinPct.toFixed(2)}% outside [25%, 68%]`,
  );
  assert.ok(
    wandererInvolvementPct >= 10 && wandererInvolvementPct <= 65,
    `Wanderer win involvement ${wandererInvolvementPct.toFixed(2)}% outside [10%, 65%]`,
  );
  for (const r of Object.values(stats.byRole)) {
    const rate = (r.wins / Math.max(1, r.appearances)) * 100;
    assert.ok(
      rate >= 15 && rate <= 72,
      `Role ${r.id} win rate ${rate.toFixed(2)}% outside [15%, 72%]`,
    );
  }
  assert.ok(
    round1PlayerDeathRatePct < 2,
    `Round-1 player death rate ${round1PlayerDeathRatePct.toFixed(3)}% >= 2%`,
  );
  assert.ok(
    earlyEndPct < 5,
    `Rounds 1-2 early ending rate ${earlyEndPct.toFixed(2)}% >= 5%`,
  );

  console.log('\nPASS: All 4,500-match v4 balance & integrity guardrails verified.');
}

runSimulation();
