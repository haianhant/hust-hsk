#!/usr/bin/env node
'use strict';

require('./register-ts.cjs');

const assert = require('node:assert/strict');
const {
  CARDS_BY_ID,
  KTX_LOCATIONS,
  KTX_LOCATION_MAP,
  ROLES_BY_ID,
  ROLES_CATALOG,
  applyPlayerGameAction,
  createInitialGameState,
  getActivePlayer,
  getPrivateGameView,
  getPublicGameView,
  getRoleDistribution,
  isAdjacentLocation,
  listLegalMovesForLocation,
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
// Static Role Catalog & Conditional Investigation Truth Tables
// ---------------------------------------------------------------------------
const ALL_ROLE_IDS = ROLES_CATALOG.map((r) => r.id);

// Derived purely from public role definitions (never touches secret state)
const INV_POSITIVE_SETS = {
  'inv-mist-or-13': new Set(
    ROLES_CATALOG.filter((r) => r.faction === 'mist-order' || r.maxHp === 13).map((r) => r.id),
  ),
  'inv-guard-or-12': new Set(
    ROLES_CATALOG.filter((r) => r.faction === 'lantern-guard' || r.maxHp === 12).map((r) => r.id),
  ),
  'inv-wanderer-or-11': new Set(
    ROLES_CATALOG.filter((r) => r.faction === 'wanderer' || r.maxHp === 11).map((r) => r.id),
  ),
  'inv-non-guard-le12': new Set(
    ROLES_CATALOG.filter((r) => r.faction !== 'lantern-guard' && r.maxHp <= 12).map((r) => r.id),
  ),
  'inv-guard-dung-trang': new Set(
    ROLES_CATALOG.filter(
      (r) => r.faction === 'lantern-guard' || r.id === 'suong-gac-cong' || r.id === 'lang-quan-sat',
    ).map((r) => r.id),
  ),
};

const PROFILES = [
  'random-legal',
  'investigator',
  'defensive',
  'aggressive',
  'equipment-focused',
  'bluffing',
  'team-coordinator',
  'neutral-objective',
];

function getCardEffectKind(card) {
  return CARDS_BY_ID[card.id]?.effectKind ?? card.effectId;
}

function hasEquipped(equippedList, effectKind) {
  return equippedList.some((c) => getCardEffectKind(c) === effectKind);
}

// ---------------------------------------------------------------------------
// Strictly Isolated Per-Bot Deduction Memory (Public + Own Private View ONLY)
// ---------------------------------------------------------------------------
function createBotMemoryMap(playerIds, myPrivateViews) {
  const map = {};
  for (const pid of playerIds) {
    const priv = myPrivateViews[pid];
    const tableDist = getRoleDistribution(playerIds.length);
    const possibleByTarget = {};
    const suspicion = {};
    const trust = {};

    for (const otherId of playerIds) {
      if (otherId === pid) {
        possibleByTarget[otherId] = new Set([priv.roleId]);
      } else {
        // Roles are unique in a match; if 0 wanderers (4p), exclude wanderer role IDs upfront
        possibleByTarget[otherId] = new Set(
          ROLES_CATALOG.filter(
            (r) => r.id !== priv.roleId && (tableDist.wanderer > 0 || r.faction !== 'wanderer'),
          ).map((r) => r.id),
        );
      }
      suspicion[otherId] = 0;
      trust[otherId] = 0;
    }

    map[pid] = {
      selfId: pid,
      possibleByTarget,
      suspicion,
      trust,
      seenInvestigationIds: new Set(),
      seenLogIds: new Set(),
      revealedPeers: new Set(),
    };
  }
  return map;
}

function updateBotMemory(mem, pub, priv) {
  // 1. Exclude revealed roles from other players and lock revealed players to their exact role
  for (const p of pub.players) {
    if (p.revealedRoleId) {
      mem.possibleByTarget[p.playerId] = new Set([p.revealedRoleId]);
      if (!mem.revealedPeers.has(p.playerId)) {
        mem.revealedPeers.add(p.playerId);
        for (const other of pub.players) {
          if (other.playerId !== p.playerId) {
            mem.possibleByTarget[other.playerId].delete(p.revealedRoleId);
          }
        }
      }
    }
  }

  // 2. Process public investigation events deterministically
  if (pub.lastInvestigation && !mem.seenInvestigationIds.has(pub.lastInvestigation.id)) {
    mem.seenInvestigationIds.add(pub.lastInvestigation.id);
    const inv = pub.lastInvestigation;
    const cardMeta = CARDS_BY_ID[inv.cardId];
    const effectKind = cardMeta ? cardMeta.effectKind : null;
    const targetSet = mem.possibleByTarget[inv.targetPlayerId];

    if (targetSet && effectKind && INV_POSITIVE_SETS[effectKind]) {
      const matchSet = INV_POSITIVE_SETS[effectKind];
      for (const candidateRole of Array.from(targetSet)) {
        const matches = matchSet.has(candidateRole);
        if ((inv.outcome === 'condition-met' && !matches) || (inv.outcome === 'no-reaction' && matches)) {
          targetSet.delete(candidateRole);
        }
      }
    } else if (targetSet && effectKind === 'inv-pair-resonance' && inv.investigatorId === mem.selfId) {
      for (const candidateRole of Array.from(targetSet)) {
        const def = ROLES_BY_ID[candidateRole];
        const matches = def.faction === priv.faction || def.maxHp === priv.maxHp;
        if ((inv.outcome === 'condition-met' && !matches) || (inv.outcome === 'no-reaction' && matches)) {
          targetSet.delete(candidateRole);
        }
      }
    }
  }

  // 3. Process public combat/skill/help events for behavioral scoring
  for (const entry of pub.publicLog) {
    if (mem.seenLogIds.has(entry.id)) continue;
    mem.seenLogIds.add(entry.id);
    if (!entry.actorId || entry.actorId === mem.selfId) continue;

    if (entry.kind === 'attack') {
      // Unprovoked or frequent attacks slightly shift suspicion unless actor revealed Guard
      const actorPub = pub.players.find((p) => p.playerId === entry.actorId);
      if (actorPub && actorPub.revealedFaction === 'lantern-guard') {
        mem.trust[entry.actorId] += 1;
      } else {
        mem.suspicion[entry.actorId] += 1;
      }
    } else if (entry.kind === 'skill') {
      const actorPub = pub.players.find((p) => p.playerId === entry.actorId);
      if (actorPub?.revealedFaction === 'lantern-guard') mem.trust[entry.actorId] += 2;
      if (actorPub?.revealedFaction === 'mist-order') mem.suspicion[entry.actorId] += 4;
    }
  }
}

function estimateTargetWeights(mem, pub, priv, target) {
  const candidates = Array.from(mem.possibleByTarget[target.playerId] || ALL_ROLE_IDS);
  let guardCount = 0;
  let mistCount = 0;
  let wandererCount = 0;

  if (target.revealedFaction) {
    return {
      guardProb: target.revealedFaction === 'lantern-guard' ? 1 : 0,
      mistProb: target.revealedFaction === 'mist-order' ? 1 : 0,
      wandererProb: target.revealedFaction === 'wanderer' ? 1 : 0,
      uncertainty: 0,
    };
  }

  for (const rId of candidates) {
    const f = ROLES_BY_ID[rId].faction;
    if (f === 'lantern-guard') guardCount += 1;
    else if (f === 'mist-order') mistCount += 1;
    else wandererCount += 1;
  }

  const total = Math.max(1, guardCount + mistCount + wandererCount);
  const baseGuard = guardCount / total;
  const baseMist = mistCount / total;
  const baseWanderer = wandererCount / total;

  // Mild behavioral shift (only within ambiguous pool)
  const susp = (mem.suspicion[target.playerId] || 0) - (mem.trust[target.playerId] || 0);
  const shift = candidates.length > 1 ? Math.max(-0.18, Math.min(0.24, susp * 0.06)) : 0;

  // Notice: high gear + high investigations in 5p+ hints Hải
  const haiSignal =
    pub.players.length >= 5 &&
    target.equipped.length >= 2 &&
    target.investigationsCount >= 2 &&
    candidates.includes('lang-anh-san')
      ? 0.28
      : 0;

  const rawMist = Math.max(0.02, Math.min(0.96, baseMist + shift));
  const rawGuard = Math.max(0.02, Math.min(0.96, baseGuard - shift * 0.7));
  const rawWanderer = Math.max(0.0, Math.min(0.96, baseWanderer + haiSignal));
  const norm = rawMist + rawGuard + rawWanderer;

  return {
    guardProb: rawGuard / norm,
    mistProb: rawMist / norm,
    wandererProb: rawWanderer / norm,
    uncertainty: candidates.length / ALL_ROLE_IDS.length,
  };
}

// ---------------------------------------------------------------------------
// Legal Reachability Helpers (Strictly Public/Private Views)
// ---------------------------------------------------------------------------
function getLegalMoveDestinations(pub, priv, selfPub) {
  const step1 = listLegalMovesForLocation(selfPub.location);
  const hasTwoStep =
    hasEquipped(priv.equipped, 'eq-sneakers') ||
    (priv.revealed && priv.roleId === 'suong-an-danh' && selfPub.location === 'corridor');
  if (!hasTwoStep) return step1;

  const set = new Set(step1);
  for (const loc of step1) {
    for (const loc2 of listLegalMovesForLocation(loc)) {
      if (loc2 !== selfPub.location) set.add(loc2);
    }
  }
  return Array.from(set);
}

function getInvestigateTargets(pub, priv, selfPub, exploredRadioThisTurn, exploredCourtThisTurn) {
  const isGlobal =
    selfPub.location === 'radio' ||
    exploredRadioThisTurn ||
    hasEquipped(priv.equipped, 'eq-walkie-talkie') ||
    (priv.revealed && priv.roleId === 'gac-radio');
  const maxDist = exploredCourtThisTurn ? 1 : 1; // Normal range is same or adjacent room!
  return pub.players.filter((p) => {
    if (!p.alive || p.playerId === selfPub.playerId) return false;
    if (isGlobal) return true;
    return (
      p.location === selfPub.location ||
      (maxDist >= 1 && isAdjacentLocation(selfPub.location, p.location))
    );
  });
}

function getAttackTargets(pub, priv, selfPub, exploredCourtThisTurn, revealedThisTurn) {
  const adjacentAttack =
    hasEquipped(priv.equipped, 'eq-baton') ||
    selfPub.location === 'court' ||
    exploredCourtThisTurn ||
    (revealedThisTurn && (priv.roleId === 'suong-an-danh' || priv.roleId === 'suong-gac-cong'));

  return pub.players.filter((p) => {
    if (!p.alive || p.playerId === selfPub.playerId) return false;
    if (p.location === selfPub.location) return true;
    return adjacentAttack && isAdjacentLocation(selfPub.location, p.location);
  });
}

function scoreEnemyPriority(mem, pub, priv, target) {
  const w = estimateTargetWeights(mem, pub, priv, target);
  const myFaction = priv.faction;

  if (priv.roleId === 'lang-cuu-ho' && priv.protegePlayerId === target.playerId) {
    return -10;
  }

  let hostility = 0;
  if (myFaction === 'lantern-guard') {
    if (target.revealedFaction === 'lantern-guard') return -10;
    if (target.revealedFaction === 'mist-order') hostility = 2.2;
    else if (target.revealedFaction === 'wanderer') hostility = target.revealedRoleId === 'lang-anh-san' ? 1.8 : 0.65;
    else {
      hostility = (w.mistProb - w.guardProb) * 1.8 + w.wandererProb * 0.35;
      if (target.attacksMade > 0) hostility += 0.25;
    }
  } else if (myFaction === 'mist-order') {
    if (target.revealedFaction === 'mist-order') return -10;
    if (target.revealedFaction === 'lantern-guard') hostility = 2.2;
    else if (target.revealedFaction === 'wanderer') hostility = target.revealedRoleId === 'lang-anh-san' ? 1.7 : 0.7;
    else {
      hostility = (w.guardProb - w.mistProb) * 1.8 + w.wandererProb * 0.45;
      if (target.investigationsCount >= 2 && target.attacksMade === 0) hostility += 0.2;
    }
  } else {
    // Wanderer prioritizes urgent threats, aggressive foes, or finishing targets when Trang wants <= 2 alive
    if (priv.roleId === 'lang-quan-sat') {
      hostility = 0.65 + target.woundsTaken * 0.25;
    } else {
      hostility = (target.attacksMade > 0 ? 0.55 : 0.2) + (target.revealedRoleId === 'lang-anh-san' ? 1.1 : 0);
    }
  }

  // Threat alert: likely Hải rushing 2 eq + 2/3 inv in 5p+ games!
  if (
    pub.players.length >= 5 &&
    target.equipped.length >= 2 &&
    target.investigationsCount >= 2 &&
    priv.roleId !== 'lang-anh-san'
  ) {
    hostility += 1.25;
  }
  if (target.revealedRoleId === 'lang-anh-san' && pub.round >= 4) hostility += 1.2;
  if (target.exposedMark > 0) hostility += 0.45;

  // Focus-fire damaged targets instead of spreading chip damage
  hostility += Math.min(1.6, target.woundsTaken * 0.24);
  if (target.revealedRoleId !== null || priv.investigatedTargetIds.includes(target.playerId) || target.attacksMade > 0) {
    hostility += 0.3;
  }
  return hostility;
}

// ---------------------------------------------------------------------------
// Core Tactical Decision Function (Uses ONLY pub + priv + mem)
// ---------------------------------------------------------------------------
function chooseBotAction(pub, priv, profile, mem, rng, turnFlags) {
  const selfPub = pub.players.find((p) => p.playerId === priv.playerId);
  if (!selfPub || !selfPub.alive) return { type: 'END_TURN' };

  const aliveOthers = pub.players.filter((p) => p.alive && p.playerId !== selfPub.playerId);
  const rankedEnemies = aliveOthers
    .map((p) => ({ player: p, score: scoreEnemyPriority(mem, pub, priv, p) }))
    .sort((a, b) => b.score - a.score);
  const topEnemy = rankedEnemies[0] || null;
  const hasOffenseGear = hasEquipped(priv.equipped, 'eq-flashlight') || hasEquipped(priv.equipped, 'eq-baton');

  // ---------------- PHASE 1: MOVE_OR_STAY ----------------
  if (pub.turnPhase === 'MOVE_OR_STAY') {
    const dests = getLegalMoveDestinations(pub, priv, selfPub);
    if (profile === 'random-legal') {
      if (rng() < 0.2) return { type: 'STAY' };
      return { type: 'MOVE', location: pickRandom(dests, rng) || 'corridor' };
    }

    const needHeal = priv.woundsTaken >= Math.ceil(priv.maxHp * 0.55);
    const needGear = priv.equipped.length === 0 || (priv.equipped.length < 2 && pub.round <= 3);
    const isHai = priv.roleId === 'lang-anh-san';
    const isBinh = priv.roleId === 'lang-cuu-ho';
    const protege = isBinh && priv.protegePlayerId
      ? aliveOthers.find((p) => p.playerId === priv.protegePlayerId)
      : null;

    if (isBinh && protege) {
      if (protege.location === selfPub.location && rng() < 0.7) {
        return { type: 'STAY' };
      }
      if (dests.includes(protege.location)) {
        return { type: 'MOVE', location: protege.location };
      }
      if (dests.includes('corridor')) return { type: 'MOVE', location: 'corridor' };
    }

    let bestChoice = { type: 'STAY', score: 0.1 };
    const candidates = ['STAY', ...dests];
    for (const opt of candidates) {
      const loc = opt === 'STAY' ? selfPub.location : opt;
      let sc = opt === 'STAY' ? 0.0 : 0.2;

      const peersAtLoc = aliveOthers.filter((p) => p.location === loc);
      const adjFoes = aliveOthers.filter((p) => isAdjacentLocation(loc, p.location) && scoreEnemyPriority(mem, pub, priv, p) > 0.6);
      const topFoesAtLoc = peersAtLoc.filter((p) => scoreEnemyPriority(mem, pub, priv, p) > 0.55);
      const isOffenseReady = priv.faction === 'mist-order' || pub.round >= 2 || hasOffenseGear;

      if (loc === 'lobby' && needHeal) sc += 1.45;
      if (loc === 'canteen' && (needGear || profile === 'equipment-focused' || isHai)) {
        sc += priv.equipped.length === 0 ? 1.85 : 1.05;
      }
      if (loc === 'radio' && (profile === 'investigator' || isHai || (pub.round <= 3 && priv.hand.filter((c) => c.deck === 'investigation').length === 0))) {
        sc += 1.25;
      }
      if (loc === 'breaker' && (selfPub.exposedMark > 0 || (profile === 'defensive' && selfPub.tempShield === 0))) {
        sc += 0.9 + (selfPub.exposedMark > 0 ? 0.9 : 0);
      }
      if (loc === 'court' && isOffenseReady && (topFoesAtLoc.length > 0 || adjFoes.length > 0 || profile === 'aggressive')) {
        sc += 1.45;
      }
      if (loc === 'corridor' && (pub.round >= pub.maxRounds - 2 || priv.roleId === 'suong-an-danh')) {
        sc += 0.75;
      }

      if (pub.round >= pub.maxRounds - 2 && peersAtLoc.length === 0 && !priv.hand.length) {
        sc -= 0.7;
      }

      // Actively move to chase top confirmed/wounded/Hai enemies!
      if (topFoesAtLoc.length > 0 && isOffenseReady) {
        const highestScore = Math.max(...topFoesAtLoc.map((p) => scoreEnemyPriority(mem, pub, priv, p)));
        sc += 1.1 + highestScore * 0.65;
      } else if (hasEquipped(priv.equipped, 'eq-baton') && adjFoes.length > 0) {
        sc += 0.9;
      }

      if (pub.round >= pub.maxRounds - 2 && priv.faction === 'lantern-guard' && ['radio', 'breaker', 'lobby'].includes(loc)) {
        sc += 0.6;
      }
      if (pub.round >= pub.maxRounds - 2 && priv.faction === 'mist-order' && ['corridor', 'canteen', 'radio'].includes(loc)) {
        sc += 0.6;
      }
      sc += rng() * 0.35;

      if (sc > bestChoice.score) {
        bestChoice = opt === 'STAY' ? { type: 'STAY', score: sc } : { type: 'MOVE', location: opt, score: sc };
      }
    }
    return bestChoice.type === 'STAY' ? { type: 'STAY' } : { type: 'MOVE', location: bestChoice.location };
  }

  // ---------------- PHASE 2: LOCATION_ACTION ----------------
  if (pub.turnPhase === 'LOCATION_ACTION') {
    const locMeta = KTX_LOCATION_MAP[selfPub.location];
    const allowedDecks = locMeta ? locMeta.allowedDecks : ['event'];
    const invCards = priv.hand.filter((c) => c.deck === 'investigation');

    if (profile === 'random-legal') {
      if (rng() < 0.5) return { type: 'EXPLORE_LOC' };
      return { type: 'DRAW_CARD', deck: pickRandom(allowedDecks, rng) };
    }

    if (selfPub.location === 'court' && (profile === 'aggressive' || topEnemy?.score > 0.45)) {
      return { type: 'EXPLORE_LOC' };
    }
    if (selfPub.location === 'canteen' && (priv.equipped.length < 2 || profile === 'equipment-focused' || priv.roleId === 'lang-anh-san')) {
      return { type: 'EXPLORE_LOC' };
    }
    if (selfPub.location === 'lobby' && priv.woundsTaken >= 2) return { type: 'EXPLORE_LOC' };
    if (selfPub.location === 'radio' && invCards.length <= 1) {
      return { type: 'EXPLORE_LOC' };
    }
    if (selfPub.location === 'breaker' && (selfPub.exposedMark > 0 || selfPub.tempShield === 0)) {
      return { type: 'EXPLORE_LOC' };
    }

    if (allowedDecks.includes('investigation') && invCards.length === 0) {
      return { type: 'DRAW_CARD', deck: 'investigation' };
    }
    if (allowedDecks.includes('equipment') && priv.equipped.length < 2) {
      return { type: 'DRAW_CARD', deck: 'equipment' };
    }

    return rng() < 0.45
      ? { type: 'EXPLORE_LOC' }
      : { type: 'DRAW_CARD', deck: pickRandom(allowedDecks, rng) };
  }

  // ---------------- PHASE 3: MAIN_ACTION ----------------
  if (pub.turnPhase === 'MAIN_ACTION') {
    // A. Free preparation: REVEAL_ROLE (strategic timing!)
    if (!priv.revealed && !turnFlags.revealedAttempted) {
      let shouldReveal = false;

      if (profile === 'random-legal') {
        shouldReveal = pub.round >= 4 && rng() < 0.2;
      } else if (priv.roleId === 'lang-anh-san') {
        const haiReady = pub.round >= 5 && priv.equipped.length >= 2 && selfPub.investigationsCount >= 3;
        shouldReveal = haiReady || priv.woundsTaken >= 8;
      } else if (priv.roleId === 'lang-quan-sat') {
        const eliminated = pub.players.filter((p) => !p.alive).length;
        const trangSoloReady = pub.players.filter((p) => p.alive).length <= 2 && eliminated >= 2;
        const trangCoWinRevealReady =
          pub.round >= pub.maxRounds - 2 && eliminated >= 2 && selfPub.investigationsCount >= 2;
        shouldReveal = trangSoloReady || trangCoWinRevealReady || priv.woundsTaken >= 7;
      } else if (priv.roleId === 'lang-cuu-ho') {
        const protegeInRange =
          priv.protegePlayerId &&
          aliveOthers.some(
            (p) =>
              p.playerId === priv.protegePlayerId &&
              (p.location === selfPub.location || isAdjacentLocation(selfPub.location, p.location)),
          );
        shouldReveal = Boolean(protegeInRange) || priv.woundsTaken >= 7;
      } else if (priv.faction === 'lantern-guard') {
        if (priv.roleId === 'gac-radio' && pub.round >= 2 && (priv.hand.some((c) => c.deck === 'investigation') || topEnemy?.score > 0.65)) {
          shouldReveal = true;
        } else if (priv.roleId === 'gac-truc-ban' && (priv.woundsTaken >= 3 || pub.round >= 4)) {
          shouldReveal = true;
        } else if (priv.roleId === 'gac-ky-thuat' && (priv.woundsTaken >= 4 || pub.round >= 4)) {
          shouldReveal = true;
        }
      } else if (priv.faction === 'mist-order') {
        // Mist hides longer so Dawn Tiebreak isn't thrown away and Guards can't dogpile!
        const finisherTarget = aliveOthers.some(
          (p) =>
            (p.location === selfPub.location || isAdjacentLocation(selfPub.location, p.location)) &&
            scoreEnemyPriority(mem, pub, priv, p) > 0.65 &&
            p.woundsTaken >= (priv.roleId === 'suong-gac-cong' ? 5 : 4),
        );
        shouldReveal = priv.woundsTaken >= Math.floor(priv.maxHp * 0.62) || finisherTarget;
      }

      if (shouldReveal) {
        turnFlags.revealedAttempted = true;
        return { type: 'REVEAL_ROLE' };
      }
    }

    // Hai immediate win check right after reveal!
    if (
      priv.revealed &&
      priv.roleId === 'lang-anh-san' &&
      priv.skillCooldown === 0 &&
      pub.round >= 5 &&
      priv.equipped.length >= 2 &&
      selfPub.investigationsCount >= 3
    ) {
      return { type: 'USE_SKILL' };
    }

    // B. Free preparation: EQUIP_CARD (prioritize Flashlight/Baton or Windbreaker/Sneakers)
    if (!turnFlags.equipAttempted) {
      const passiveEqInHand = priv.hand.filter(
        (c) =>
          c.deck === 'equipment' &&
          !c.isConsumable &&
          !priv.equipped.some((eq) => eq.id === c.id),
      );
      if (passiveEqInHand.length > 0 && (priv.equipped.length < 2 || profile === 'equipment-focused')) {
        turnFlags.equipAttempted = true;
        return { type: 'EQUIP_CARD', cardId: passiveEqInHand[0].id };
      }
    }

    if (profile === 'random-legal') {
      const legalTurnEnders = [{ type: 'DEFEND' }, { type: 'END_TURN' }];
      const invTargets = getInvestigateTargets(pub, priv, selfPub, turnFlags.exploredRadio, turnFlags.exploredCourt);
      for (const c of priv.hand) {
        if (c.deck === 'investigation' && invTargets.length > 0) {
          legalTurnEnders.push({ type: 'INVESTIGATE_CARD', cardId: c.id, targetPlayerId: pickRandom(invTargets, rng).playerId });
        }
        if (c.deck === 'equipment' && c.isConsumable) {
          legalTurnEnders.push({ type: 'USE_EQUIPMENT', cardId: c.id, targetPlayerId: selfPub.playerId });
        }
      }
      const atkTargets = getAttackTargets(pub, priv, selfPub, turnFlags.exploredCourt, turnFlags.revealedThisTurn);
      if (atkTargets.length > 0) {
        legalTurnEnders.push({ type: 'ATTACK', targetPlayerId: pickRandom(atkTargets, rng).playerId });
      }
      return pickRandom(legalTurnEnders, rng);
    }

    // C. Emergency heal when critically injured (>= 5 wounds)
    const thermos = priv.hand.find((c) => getCardEffectKind(c) === 'eq-thermos')
      || priv.equipped.find((c) => getCardEffectKind(c) === 'eq-thermos');
    if (thermos && priv.woundsTaken >= 5) {
      return { type: 'USE_EQUIPMENT', cardId: thermos.id, targetPlayerId: selfPub.playerId };
    }
    if (thermos && priv.roleId === 'lang-cuu-ho' && priv.protegePlayerId) {
      const protSameRoom = aliveOthers.find(
        (p) => p.playerId === priv.protegePlayerId && p.location === selfPub.location && p.woundsTaken >= 4,
      );
      if (protSameRoom) {
        return { type: 'USE_EQUIPMENT', cardId: thermos.id, targetPlayerId: protSameRoom.playerId };
      }
    }

    // D. Active Role Skill when impactful
    if (priv.revealed && priv.skillCooldown === 0 && !turnFlags.skillFailed) {
      const inSkillRange = aliveOthers.filter(
        (p) => p.location === selfPub.location || isAdjacentLocation(selfPub.location, p.location),
      );
      const inRangeEnemy = inSkillRange
        .filter((p) => scoreEnemyPriority(mem, pub, priv, p) > 0.35)
        .sort((a, b) => scoreEnemyPriority(mem, pub, priv, b) - scoreEnemyPriority(mem, pub, priv, a))[0];

      if (priv.roleId === 'gac-ky-thuat') {
        const injuredAlly = inSkillRange.find(
          (p) => (p.revealedFaction === 'lantern-guard' || scoreEnemyPriority(mem, pub, priv, p) < -0.1) && p.woundsTaken >= 4,
        );
        if (priv.woundsTaken >= 5) {
          return { type: 'USE_SKILL', targetPlayerId: selfPub.playerId };
        }
        if (injuredAlly) return { type: 'USE_SKILL', targetPlayerId: injuredAlly.playerId };
      } else if (priv.roleId === 'gac-truc-ban') {
        const allyToWard = inSkillRange.find(
          (p) => (p.revealedFaction === 'lantern-guard' || scoreEnemyPriority(mem, pub, priv, p) < -0.2) && p.woundsTaken >= 4,
        );
        if (allyToWard) return { type: 'USE_SKILL', targetPlayerId: allyToWard.playerId };
      } else if (priv.roleId === 'gac-radio' && topEnemy && topEnemy.score > 0.45) {
        return { type: 'USE_SKILL', targetPlayerId: topEnemy.player.playerId };
      } else if (priv.roleId === 'suong-an-danh' && inRangeEnemy) {
        return { type: 'USE_SKILL', targetPlayerId: inRangeEnemy.playerId };
      } else if (priv.roleId === 'suong-tin-gia' && inRangeEnemy) {
        return { type: 'USE_SKILL', targetPlayerId: inRangeEnemy.playerId };
      } else if (priv.roleId === 'suong-gac-cong') {
        const pounceTarget = inSkillRange
          .filter((p) => (p.woundsTaken > 0 || p.revealedRoleId !== null) && scoreEnemyPriority(mem, pub, priv, p) > 0.25)
          .sort((a, b) => scoreEnemyPriority(mem, pub, priv, b) - scoreEnemyPriority(mem, pub, priv, a))[0];
        if (pounceTarget) return { type: 'USE_SKILL', targetPlayerId: pounceTarget.playerId };
      } else if (priv.roleId === 'lang-anh-san') {
        if (selfPub.investigationsCount < 3 || selfPub.tempShield === 0) {
          return { type: 'USE_SKILL' };
        }
      } else if (priv.roleId === 'lang-quan-sat' && inSkillRange.length > 0 && selfPub.tempShield < 2) {
        return { type: 'USE_SKILL', targetPlayerId: inSkillRange[0].playerId };
      } else if (priv.roleId === 'lang-cuu-ho' && inSkillRange.length > 0) {
        const protInRange = inSkillRange.find((p) => p.playerId === priv.protegePlayerId);
        if (protInRange) return { type: 'USE_SKILL', targetPlayerId: protInRange.playerId };
      }
    }

    // E. Prioritize Investigation when Hai needs 3 inv, or investigator profile, or target is still uncertain!
    const invCards = priv.hand.filter((c) => c.deck === 'investigation');
    const invTargets = getInvestigateTargets(pub, priv, selfPub, turnFlags.exploredRadio, turnFlags.exploredCourt);
    const atkTargets = getAttackTargets(pub, priv, selfPub, turnFlags.exploredCourt, turnFlags.revealedThisTurn);
    const rankedAtk = atkTargets
      .map((p) => ({ p, score: scoreEnemyPriority(mem, pub, priv, p) }))
      .sort((a, b) => b.score - a.score);
    const bestAtk = rankedAtk[0] || null;
    const isHaiNeedingInv = priv.roleId === 'lang-anh-san' && selfPub.investigationsCount < 3;
    const isTrangNeedingInv = priv.roleId === 'lang-quan-sat' && selfPub.investigationsCount < 2;

    if (invCards.length > 0 && invTargets.length > 0) {
      const sortedInvTargets = invTargets
        .slice()
        .sort((a, b) => {
          const aNew = priv.investigatedTargetIds.includes(a.playerId) ? 0 : 1;
          const bNew = priv.investigatedTargetIds.includes(b.playerId) ? 0 : 1;
          if (aNew !== bNew) return bNew - aNew;
          const wa = estimateTargetWeights(mem, pub, priv, a);
          const wb = estimateTargetWeights(mem, pub, priv, b);
          return wb.uncertainty - wa.uncertainty;
        });

      const pickTarget = sortedInvTargets[0];
      const noClearKill = !bestAtk || bestAtk.score < 1.1;
      const wantInvestigate =
        isHaiNeedingInv ||
        isTrangNeedingInv ||
        (profile === 'investigator' && (!bestAtk || bestAtk.score < 1.5)) ||
        (noClearKill && pickTarget && !pickTarget.revealedRoleId && mem.possibleByTarget[pickTarget.playerId].size > 1) ||
        pub.round <= 2;

      if (pickTarget && wantInvestigate) {
        return {
          type: 'INVESTIGATE_CARD',
          cardId: invCards[0].id,
          targetPlayerId: pickTarget.playerId,
        };
      }
    }

    // F. Attack when a confirmed/high-priority enemy target is in range
    if (bestAtk) {
      const wBest = estimateTargetWeights(mem, pub, priv, bestAtk.p);
      const isSureAlly =
        (priv.faction === 'lantern-guard' && (bestAtk.p.revealedFaction === 'lantern-guard' || wBest.guardProb >= 0.72)) ||
        (priv.faction === 'mist-order' && bestAtk.p.revealedFaction === 'mist-order');

      const atkThreshold =
        profile === 'aggressive'
          ? 0.05
          : pub.round >= 4
            ? 0.2
            : 0.42;

      if (!isSureAlly && bestAtk.score >= atkThreshold && (pub.round >= 2 || profile === 'aggressive' || bestAtk.score >= 0.6)) {
        return { type: 'ATTACK', targetPlayerId: bestAtk.p.playerId };
      }
    }

    // G. Calm Tea / Magnetic Pass / Events
    const calmTea = priv.hand.find((c) => getCardEffectKind(c) === 'ev-calm-tea');
    if (calmTea && priv.woundsTaken >= 3) {
      const sameRoomFriend = aliveOthers.find(
        (p) => p.location === selfPub.location && scoreEnemyPriority(mem, pub, priv, p) < 0.2,
      );
      return { type: 'PLAY_EVENT', cardId: calmTea.id, targetPlayerId: sameRoomFriend?.playerId };
    }

    const magPass = priv.hand.find((c) => getCardEffectKind(c) === 'eq-magnetic-pass')
      || priv.equipped.find((c) => getCardEffectKind(c) === 'eq-magnetic-pass');
    if (magPass && (selfPub.tempShield === 0 || priv.hand.length < 4)) {
      return { type: 'USE_EQUIPMENT', cardId: magPass.id, targetPlayerId: selfPub.playerId };
    }

    for (const ev of priv.hand.filter((c) => c.deck === 'event')) {
      const ek = getCardEffectKind(ev);
      if (ek === 'ev-locker-audit') {
        const equippedEnemy = aliveOthers
          .filter((p) => p.equipped.length > 0 && scoreEnemyPriority(mem, pub, priv, p) > 0.25)
          .sort((a, b) => scoreEnemyPriority(mem, pub, priv, b) - scoreEnemyPriority(mem, pub, priv, a))[0];
        if (equippedEnemy) return { type: 'PLAY_EVENT', cardId: ev.id, targetPlayerId: equippedEnemy.playerId };
      } else if (ek === 'ev-power-flicker') {
        return { type: 'PLAY_EVENT', cardId: ev.id, targetLocation: selfPub.location !== 'corridor' ? selfPub.location : 'lobby' };
      } else if (ek === 'ev-loudspeaker') {
        const crowdedLoc = KTX_LOCATIONS.map((l) => ({
          id: l.id,
          count: aliveOthers.filter((p) => p.location === l.id).length,
        })).sort((a, b) => b.count - a.count)[0];
        return { type: 'PLAY_EVENT', cardId: ev.id, targetLocation: crowdedLoc.id };
      } else if (ek === 'ev-midnight-noodles' && (selfPub.location === 'lobby' || selfPub.location === 'canteen' || priv.woundsTaken > 0)) {
        return { type: 'PLAY_EVENT', cardId: ev.id };
      } else if (ek === 'ev-rain-shower' || ek === 'ev-rumor-wave' || ek === 'ev-curfew-bell') {
        return { type: 'PLAY_EVENT', cardId: ev.id };
      }
    }

    // Secondary attack fallback when in room with a plausible target
    if (atkTargets.length > 0 && pub.round >= 3) {
      const rankedAtk = atkTargets
        .map((p) => ({ p, score: scoreEnemyPriority(mem, pub, priv, p) }))
        .sort((a, b) => b.score - a.score);
      const bestAtk = rankedAtk[0];
      const wBest = estimateTargetWeights(mem, pub, priv, bestAtk.p);
      const isSureAlly =
        (priv.faction === 'lantern-guard' && (bestAtk.p.revealedFaction === 'lantern-guard' || wBest.guardProb >= 0.65)) ||
        (priv.faction === 'mist-order' && bestAtk.p.revealedFaction === 'mist-order');
      if (!isSureAlly && bestAtk.score >= 0.0) {
        return { type: 'ATTACK', targetPlayerId: bestAtk.p.playerId };
      }
    }

    if (selfPub.tempShield < 2 || pub.players.some((p) => p.alive && p.playerId !== selfPub.playerId && p.location === selfPub.location)) {
      return { type: 'DEFEND' };
    }
    return { type: 'END_TURN' };
  }

  return { type: 'END_TURN' };
}

// ---------------------------------------------------------------------------
// 4,500-Match Balance Simulation Driver (`900` per count: 4, 5, 6, 7, 8)
// ---------------------------------------------------------------------------
function runBalanceSimulation(gamesPerCount = 900) {
  const playerCounts = [4, 5, 6, 7, 8];
  const rng = createRng(20261115);

  const overall = {
    totalGames: 0,
    stalledGames: 0,
    draws: 0,
    factionPrimaryWins: {
      'lantern-guard': 0,
      'mist-order': 0,
      wanderer: 0,
      'wanderer-solo': 0,
    },
    wanderer5to8: {
      appearances: 0,
      soloWins: 0,
      coWins: 0,
    },
    byCount: {},
    byRole: {},
    byProfile: {},
    roundsSum: 0,
    minRound: Infinity,
    maxRound: 0,
    earlyEndRounds1To2: 0,
    reachedMaxRound: 0,
    roundHistogram: {},
    totalPlayerSeats: 0,
    round1Deaths: 0,
    round1DeathGames: 0,
    totalEliminations: 0,
    firstEliminationRoundSum: 0,
    firstEliminationGames: 0,
    totalVoluntaryReveals: 0,
    winReasons: {
      elimination: 0,
      dawnTiebreak: 0,
      wandererSoloHai: 0,
      wandererSoloTrang: 0,
      mutualWipeout: 0,
    },
    actions: {
      investigate: 0,
      attack: 0,
      equip: 0,
      event: 0,
      skill: 0,
      defend: 0,
    },
    botAccessViolations: 0,
  };

  for (const r of ROLES_CATALOG) {
    overall.byRole[r.id] = {
      id: r.id,
      name: r.name,
      faction: r.faction,
      appearances: 0,
      wins: 0,
      soloWins: 0,
      survivedCount: 0,
      voluntaryReveals: 0,
    };
  }
  for (const p of PROFILES) {
    overall.byProfile[p] = { games: 0, wins: 0 };
  }

  for (const n of playerCounts) {
    overall.byCount[n] = {
      games: 0,
      guardWins: 0,
      mistWins: 0,
      wandererPrimaryWins: 0,
      wandererAppearances: 0,
      wandererWinInvolvement: 0,
      avgRounds: 0,
      roundsSum: 0,
      round1Deaths: 0,
      earlyEnds: 0,
    };

    for (let g = 0; g < gamesPerCount; g++) {
      overall.totalGames += 1;
      overall.byCount[n].games += 1;

      const playersInput = Array.from({ length: n }, (_, i) => ({
        playerId: `sim-${i + 1}`,
        displayName: `Bot ${i + 1}`,
        seatIndex: i,
      }));
      const state = createInitialGameState({
        matchId: `v3-sim-${n}-${g}`,
        seed: (1_000_000 + n * 100_000 + g) >>> 0,
        nowMs: 1_700_000_000_000,
        players: playersInput,
      });

      const seatProfiles = playersInput.map((_, i) => PROFILES[(g * 3 + i) % PROFILES.length]);
      const initPrivById = {};
      for (const p of state.players) {
        initPrivById[p.playerId] = getPrivateGameView(state, p.playerId);
      }
      const memByPlayer = createBotMemoryMap(
        state.players.map((p) => p.playerId),
        initPrivById,
      );

      let safetySteps = 0;
      let lastTurnKey = '';
      let turnFlags = {
        revealedAttempted: false,
        revealedThisTurn: false,
        equipAttempted: false,
        skillFailed: false,
        exploredRadio: false,
        exploredCourt: false,
      };
      let firstElimRound = null;
      const voluntaryRevealsSet = new Set();

      while (!state.finished && safetySteps < 700) {
        safetySteps += 1;
        const active = getActivePlayer(state);
        if (!active) break;

        const turnKey = `${state.turnNumber}:${active.playerId}`;
        if (turnKey !== lastTurnKey) {
          lastTurnKey = turnKey;
          turnFlags = {
            revealedAttempted: false,
            revealedThisTurn: false,
            equipAttempted: false,
            skillFailed: false,
            exploredRadio: false,
            exploredCourt: false,
          };
        }

        // Strict projection: bot only ever sees DTO views
        const pub = getPublicGameView(state);
        const priv = getPrivateGameView(state, active.playerId);
        if (pub.finalReveal !== null) overall.botAccessViolations += 1;
        updateBotMemory(memByPlayer[active.playerId], pub, priv);

        const profile = seatProfiles[active.seatIndex];
        const prevTurnPhase = state.turnPhase;
        const prevLoc = active.location;
        const aliveBefore = new Set(state.players.filter((p) => p.alive).map((p) => p.playerId));

        let action = chooseBotAction(pub, priv, profile, memByPlayer[active.playerId], rng, turnFlags);
        let res = applyPlayerGameAction(
          state,
          active.playerId,
          action,
          1_700_000_000_000 + safetySteps * 1000,
        );

        if (!res.ok) {
          // Strict safe legal fallback based on current phase (never stalls)
          if (action.type === 'USE_SKILL') turnFlags.skillFailed = true;
          if (state.turnPhase === 'MOVE_OR_STAY') {
            action = { type: 'STAY' };
          } else if (state.turnPhase === 'LOCATION_ACTION') {
            const locDef = KTX_LOCATION_MAP[active.location];
            action = rng() < 0.5 ? { type: 'EXPLORE_LOC' } : { type: 'DRAW_CARD', deck: locDef.allowedDecks[0] };
          } else {
            action = { type: 'DEFEND' };
          }
          res = applyPlayerGameAction(
            state,
            active.playerId,
            action,
            1_700_000_000_000 + safetySteps * 1000 + 100,
          );
          if (!res.ok && state.turnPhase === 'MAIN_ACTION') {
            action = { type: 'END_TURN' };
            res = applyPlayerGameAction(
              state,
              active.playerId,
              action,
              1_700_000_000_000 + safetySteps * 1000 + 200,
            );
          }
        }

        if (res.ok) {
          if (prevTurnPhase === 'LOCATION_ACTION' && action.type === 'EXPLORE_LOC') {
            if (prevLoc === 'radio') turnFlags.exploredRadio = true;
            if (prevLoc === 'court') turnFlags.exploredCourt = true;
          }
          if (action.type === 'REVEAL_ROLE') {
            turnFlags.revealedThisTurn = true;
            voluntaryRevealsSet.add(active.playerId);
          }
          if (action.type === 'INVESTIGATE_CARD') overall.actions.investigate += 1;
          else if (action.type === 'ATTACK') overall.actions.attack += 1;
          else if (action.type === 'EQUIP_CARD') overall.actions.equip += 1;
          else if (action.type === 'PLAY_EVENT') overall.actions.event += 1;
          else if (action.type === 'USE_SKILL') overall.actions.skill += 1;
          else if (action.type === 'DEFEND') overall.actions.defend += 1;
        }

        // Check Round-1 or first eliminations immediately
        for (const p of state.players) {
          if (aliveBefore.has(p.playerId) && !p.alive) {
            if (firstElimRound === null) firstElimRound = state.round;
            if (state.round === 1) {
              overall.round1Deaths += 1;
              overall.byCount[n].round1Deaths += 1;
            }
          }
        }
      }

      if (!state.finished) {
        overall.stalledGames += 1;
        continue;
      }

      if (!state.winnerFaction || state.winnerPlayerIds.length === 0) {
        overall.draws += 1;
      } else {
        overall.factionPrimaryWins[state.winnerFaction] =
          (overall.factionPrimaryWins[state.winnerFaction] || 0) + 1;
      }

      if (state.winnerFaction === 'lantern-guard') overall.byCount[n].guardWins += 1;
      else if (state.winnerFaction === 'mist-order') overall.byCount[n].mistWins += 1;
      else overall.byCount[n].wandererPrimaryWins += 1;

      const reason = state.winReason || '';
      if (reason.includes('Chốt Gói Tin Đêm')) overall.winReasons.wandererSoloHai += 1;
      else if (reason.includes('nhân chứng cuối cùng')) overall.winReasons.wandererSoloTrang += 1;
      else if (reason.includes('Hết ') || reason.includes('rạng sáng') || reason.includes('Giới Nghiêm')) {
        overall.winReasons.dawnTiebreak += 1;
      } else if (reason.includes('đều kiệt sức') || reason.includes('cùng lúc')) {
        overall.winReasons.mutualWipeout += 1;
      } else {
        overall.winReasons.elimination += 1;
      }

      const effectiveRound = Math.min(state.round, state.maxRounds);
      overall.roundsSum += effectiveRound;
      overall.byCount[n].roundsSum += effectiveRound;
      overall.minRound = Math.min(overall.minRound, effectiveRound);
      overall.maxRound = Math.max(overall.maxRound, effectiveRound);
      overall.roundHistogram[effectiveRound] = (overall.roundHistogram[effectiveRound] || 0) + 1;
      if (effectiveRound <= 2) {
        overall.earlyEndRounds1To2 += 1;
        overall.byCount[n].earlyEnds += 1;
      }
      if (state.round >= state.maxRounds) {
        overall.reachedMaxRound += 1;
      }
      if (firstElimRound === 1) {
        overall.round1DeathGames += 1;
      }
      if (firstElimRound !== null) {
        overall.firstEliminationRoundSum += firstElimRound;
        overall.firstEliminationGames += 1;
      }

      const finalReveal = getPublicGameView(state).finalReveal || [];
      const winnerSet = new Set(state.winnerPlayerIds);

      for (const p of state.players) {
        overall.totalPlayerSeats += 1;
        if (!p.alive) overall.totalEliminations += 1;
        if (voluntaryRevealsSet.has(p.playerId)) overall.totalVoluntaryReveals += 1;

        const rStats = overall.byRole[p.roleId];
        rStats.appearances += 1;
        const won = winnerSet.has(p.playerId);
        if (won) rStats.wins += 1;
        if (won && state.winnerFaction === 'wanderer-solo') rStats.soloWins += 1;
        if (p.alive) rStats.survivedCount += 1;
        if (voluntaryRevealsSet.has(p.playerId)) rStats.voluntaryReveals += 1;

        const profStats = overall.byProfile[seatProfiles[p.seatIndex]];
        profStats.games += 1;
        if (won) profStats.wins += 1;

        if (n >= 5 && p.faction === 'wanderer') {
          overall.wanderer5to8.appearances += 1;
          overall.byCount[n].wandererAppearances += 1;
          if (won) {
            overall.byCount[n].wandererWinInvolvement += 1;
            if (state.winnerFaction === 'wanderer-solo') overall.wanderer5to8.soloWins += 1;
            else overall.wanderer5to8.coWins += 1;
          }
        }
      }

      // Consistency check: finalReveal won flags agree with winnerPlayerIds
      for (const rec of finalReveal) {
        assert.equal(rec.won, winnerSet.has(rec.playerId));
      }
    }

    overall.byCount[n].avgRounds = +(overall.byCount[n].roundsSum / overall.byCount[n].games).toFixed(2);
  }

  return overall;
}

// ---------------------------------------------------------------------------
// Execute Simulation & Validate Balance Guardrails
// ---------------------------------------------------------------------------
const stats = runBalanceSimulation(900); // 4,500 matches (900 x 5 player counts)
const completed = stats.totalGames - stats.stalledGames;

const guardWinPct = (stats.factionPrimaryWins['lantern-guard'] / completed) * 100;
const mistWinPct = (stats.factionPrimaryWins['mist-order'] / completed) * 100;
const wandererSoloPct = (stats.factionPrimaryWins['wanderer-solo'] / completed) * 100;
const wandererSharedPrimaryPct = (stats.factionPrimaryWins.wanderer / completed) * 100;

const wandererTotalWins = stats.wanderer5to8.soloWins + stats.wanderer5to8.coWins;
const wandererInvolvementPct = (wandererTotalWins / Math.max(1, stats.wanderer5to8.appearances)) * 100;

const round1PlayerDeathRatePct = (stats.round1Deaths / Math.max(1, stats.totalPlayerSeats)) * 100;
const round1DeathMatchPct = (stats.round1DeathGames / completed) * 100;
const earlyEndPct = (stats.earlyEndRounds1To2 / completed) * 100;
const avgRounds = stats.roundsSum / completed;
const avgElims = stats.totalEliminations / completed;
const avgFirstElimRound = stats.firstEliminationGames > 0 ? stats.firstEliminationRoundSum / stats.firstEliminationGames : 0;

console.log('=== BONG DEM KTX v3 - 8-BOT SIMULATION REPORT ===');
console.log(
  JSON.stringify(
    {
      totalGames: stats.totalGames,
      completed,
      stalledGames: stats.stalledGames,
      draws: stats.draws,
      botAccessViolations: stats.botAccessViolations,
      avgRounds: +avgRounds.toFixed(2),
      minRound: stats.minRound,
      maxRound: stats.maxRound,
      reachedMaxRoundPct: +((stats.reachedMaxRound / completed) * 100).toFixed(2),
      earlyEndRounds1To2Pct: +earlyEndPct.toFixed(2),
      round1PlayerDeathRatePct: +round1PlayerDeathRatePct.toFixed(3),
      round1DeathMatchPct: +round1DeathMatchPct.toFixed(2),
      avgEliminationsPerGame: +avgElims.toFixed(2),
      avgFirstEliminationRound: +avgFirstElimRound.toFixed(2),
      primaryFactionRates: {
        lanternGuardPct: +guardWinPct.toFixed(2),
        mistOrderPct: +mistWinPct.toFixed(2),
        wandererSoloPct: +wandererSoloPct.toFixed(2),
        wandererLastStandingPct: +wandererSharedPrimaryPct.toFixed(2),
      },
      wandererInvolvement5to8: {
        appearances: stats.wanderer5to8.appearances,
        soloWins: stats.wanderer5to8.soloWins,
        coWins: stats.wanderer5to8.coWins,
        winInvolvementPct: +wandererInvolvementPct.toFixed(2),
      },
      winReasons: stats.winReasons,
      byPlayerCount: Object.fromEntries(
        Object.entries(stats.byCount).map(([k, v]) => [
          k,
          {
            games: v.games,
            guardWinPct: +((v.guardWins / v.games) * 100).toFixed(2),
            mistWinPct: +((v.mistWins / v.games) * 100).toFixed(2),
            wandererPrimaryWinPct: +((v.wandererPrimaryWins / v.games) * 100).toFixed(2),
            wandererInvolvementPct:
              v.wandererAppearances > 0
                ? +((v.wandererWinInvolvement / v.wandererAppearances) * 100).toFixed(2)
                : 0,
            avgRounds: v.avgRounds,
            earlyEndPct: +((v.earlyEnds / v.games) * 100).toFixed(2),
            round1Deaths: v.round1Deaths,
          },
        ]),
      ),
      byRole: Object.values(stats.byRole).map((r) => ({
        id: r.id,
        name: r.name,
        faction: r.faction,
        appearances: r.appearances,
        winRatePct: +((r.wins / Math.max(1, r.appearances)) * 100).toFixed(2),
        survivalPct: +((r.survivedCount / Math.max(1, r.appearances)) * 100).toFixed(2),
        revealPct: +((r.voluntaryReveals / Math.max(1, r.appearances)) * 100).toFixed(2),
        soloWins: r.soloWins,
      })),
      byProfile: Object.fromEntries(
        Object.entries(stats.byProfile).map(([p, d]) => [
          p,
          { games: d.games, winRatePct: +((d.wins / Math.max(1, d.games)) * 100).toFixed(2) },
        ]),
      ),
      avgActionsPerGame: {
        investigate: +(stats.actions.investigate / completed).toFixed(2),
        attack: +(stats.actions.attack / completed).toFixed(2),
        equip: +(stats.actions.equip / completed).toFixed(2),
        event: +(stats.actions.event / completed).toFixed(2),
        skill: +(stats.actions.skill / completed).toFixed(2),
        defend: +(stats.actions.defend / completed).toFixed(2),
      },
      roundHistogram: stats.roundHistogram,
    },
    null,
    2,
  ),
);

// Hard assertions matching GV3.5 acceptance criteria
assert.equal(stats.totalGames, 4500, 'Expected 4,500 simulated games (900 x 5 sizes)');
assert.equal(stats.stalledGames, 0, `Unexpected stalled games: ${stats.stalledGames}`);
assert.equal(stats.draws, 0, `Unexpected draw games: ${stats.draws}`);
assert.equal(stats.botAccessViolations, 0, 'Bot projection integrity violation');

assert.ok(
  guardWinPct >= 30 && guardWinPct <= 62,
  `Lantern Guard win rate ${guardWinPct.toFixed(2)}% outside [30%, 62%]`,
);
assert.ok(
  mistWinPct >= 30 && mistWinPct <= 62,
  `Mist Order win rate ${mistWinPct.toFixed(2)}% outside [30%, 62%]`,
);
assert.ok(
  wandererInvolvementPct >= 12 && wandererInvolvementPct <= 58,
  `Wanderer win involvement ${wandererInvolvementPct.toFixed(2)}% outside [12%, 58%]`,
);

for (const r of Object.values(stats.byRole)) {
  const rate = (r.wins / Math.max(1, r.appearances)) * 100;
  assert.ok(
    rate >= 20 && rate <= 68,
    `Role ${r.id} win rate ${rate.toFixed(2)}% outside [20%, 68%]`,
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

console.log('\nPASS: All 4,500-match v3 balance & integrity guardrails verified.');
