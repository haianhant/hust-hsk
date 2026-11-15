#!/usr/bin/env node
'use strict';

require('./register-ts.cjs');

const assert = require('node:assert/strict');
const {
  CARDS_BY_ID,
  LOCATIONS_CATALOG,
  ROLES_BY_ID,
  ROLES_CATALOG,
  applyPlayerGameAction,
  areInSameCluster,
  createInitialGameState,
  getActivePlayer,
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
  { key: '[Đội Săn Đêm]', fn: (r) => r.faction === 'lantern-guard' },
  { key: '[Hội Bóng Đêm]', fn: (r) => r.faction === 'mist-order' },
  { key: '[Kẻ Độc Hành]', fn: (r) => r.faction === 'wanderer' },
  {
    key: '[Săn Đêm hoặc Độc Hành]',
    fn: (r) => r.faction === 'lantern-guard' || r.faction === 'wanderer',
  },
  {
    key: '[Bóng Đêm hoặc Độc Hành]',
    fn: (r) => r.faction === 'mist-order' || r.faction === 'wanderer',
  },
  { key: '[Max HP >= 12]', fn: (r) => r.maxHp >= 12 },
  { key: '[Max HP <= 11]', fn: (r) => r.maxHp <= 11 },
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
      killerByVictim: {},
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

    // Exact Radio reveal
    for (const r of ROLES_CATALOG) {
      if (clue.detail.includes(`là ${r.name} (`)) {
        botMem.possible[clue.targetPlayerId] = new Set([r.id]);
        break;
      }
    }

    // Conditional investigation card filter
    for (const cond of CLUE_CONDITION_FILTERS) {
      if (clue.detail.includes(cond.key)) {
        const want = clue.outcome === 'condition-met';
        for (const roleId of Array.from(set)) {
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
  // Bình "Bảo Vệ" biết mặt Người được bảo hộ và bảo vệ người đó tuyệt đối; nếu bị hạ thì truy sát hung thủ!
  if (priv.roleId === 'lang-cuu-ho' && priv.protegePlayerId) {
    if (priv.protegePlayerId === target.playerId) {
      return { isEnemyProb: 0, isAllyProb: 1 };
    }
    if (botMem.killerByVictim[priv.protegePlayerId] === target.playerId) {
      return { isEnemyProb: 1, isAllyProb: 0 };
    }
  }

  const pubTarget = pub.players.find((p) => p.playerId === target.playerId);
  if (pubTarget?.revealedRoleId) {
    const role = ROLES_BY_ID[pubTarget.revealedRoleId];
    return {
      isEnemyProb:
        priv.faction === 'wanderer'
          ? 1
          : role.faction !== priv.faction
            ? 1
            : 0,
      isAllyProb: priv.faction !== 'wanderer' && role.faction === priv.faction ? 1 : 0,
    };
  }

  const set = botMem.possible[target.playerId];
  if (!set || set.size === 0) {
    return { isEnemyProb: 0.5, isAllyProb: 0.3 };
  }
  let enemyCount = 0;
  let allyCount = 0;
  for (const rid of set) {
    const r = ROLES_BY_ID[rid];
    if (!r) continue;
    if (priv.faction === 'wanderer') {
      if (priv.roleId === 'lang-cuu-ho' && r.faction === 'lantern-guard') allyCount += 1;
      else enemyCount += 1;
    } else if (r.faction === priv.faction) {
      allyCount += 1;
    } else {
      enemyCount += 1;
    }
  }
  const total = Math.max(1, set.size);
  let isEnemyProb = enemyCount / total;
  const isAllyProb = allyCount / total;
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

  // Score alive others
  const avengeTargetId =
    priv.roleId === 'lang-cuu-ho' && priv.protegePlayerId
      ? botMem.killerByVictim[priv.protegePlayerId] || null
      : null;
  const scoredOthers = aliveOthers
    .map((p) => {
      const { isEnemyProb, isAllyProb } = estimateTargetRoleScores(botMem, pub, priv, p);
      // Priority: avenge protege killer > known enemy > wounded target > geared Wanderer
      const threatBonus =
        p.woundsTaken * 0.08 +
        (p.equipped.length >= 2 ? 0.35 : 0) +
        (p.revealedFaction && p.revealedFaction !== priv.faction ? 0.4 : 0) +
        (avengeTargetId === p.playerId ? 3.5 : 0);
      return {
        player: p,
        isEnemyProb,
        isAllyProb,
        attackScore: isEnemyProb * 2 - isAllyProb * 2.5 + threatBonus,
      };
    })
    .sort((a, b) => b.attackScore - a.attackScore);

  const bestTarget = scoredOthers[0]?.player || aliveOthers[0];
  const bestAlly = scoredOthers
    .filter((x) => x.isAllyProb >= 0.7 && x.player.woundsTaken > 0)
    .sort((a, b) => b.player.woundsTaken - a.player.woundsTaken)[0]?.player;

  // Phase 1: ROLL_MOVE
  if (pub.turnPhase === 'ROLL_MOVE') {
    return { type: 'ROLL_DICE' };
  }

  // Phase 1B: CHOOSE_MOVE (dice rolled 7)
  if (pub.turnPhase === 'CHOOSE_MOVE') {
    const validLocs = LOCATIONS_CATALOG.filter((l) => l.id !== selfPub.location);
    if (priv.roleId === 'lang-anh-san' && selfPub.equipped.length < 3) {
      const geared = aliveOthers.find((p) => p.equipped.length > 0);
      if (geared && selfPub.location !== 'court') return { type: 'CHOOSE_DEST', location: 'court' };
      if (selfPub.location !== 'lobby') return { type: 'CHOOSE_DEST', location: 'lobby' };
    }
    if (priv.woundsTaken >= 5 && selfPub.location !== 'corridor') {
      return { type: 'CHOOSE_DEST', location: 'corridor' };
    }
    if (bestTarget && bestTarget.woundsTaken >= 6 && selfPub.location !== 'corridor') {
      return { type: 'CHOOSE_DEST', location: 'corridor' };
    }
    if (pub.round <= 2 && priv.hand.filter((c) => c.deck === 'investigation').length === 0 && selfPub.location !== 'radio') {
      return { type: 'CHOOSE_DEST', location: 'radio' };
    }
    const desired =
      validLocs.find((l) => l.clusterId === bestTarget.clusterId) ||
      pickRandom(validLocs, rng) ||
      LOCATIONS_CATALOG[0];
    return { type: 'CHOOSE_DEST', location: desired.id };
  }

  // Phase 2: LOCATION_ACTION
  if (pub.turnPhase === 'LOCATION_ACTION') {
    switch (selfPub.location) {
      case 'radio':
        return { type: 'DRAW_CARD', deck: 'investigation' };
      case 'lobby':
        return { type: 'DRAW_CARD', deck: 'equipment' };
      case 'breaker':
      case 'canteen':
        return { type: 'DRAW_CARD', deck: 'event' };
      case 'corridor': {
        if (selfPub.woundsTaken >= 2 || (bestAlly && bestAlly.woundsTaken >= 3 && bestTarget.woundsTaken < 8)) {
          const healTarget =
            selfPub.woundsTaken >= (bestAlly?.woundsTaken ?? 0) ? selfPub.playerId : bestAlly.playerId;
          return { type: 'USE_LOC_POWER', mode: 'heal', targetPlayerId: healTarget };
        }
        if (pub.round === 1 && scoredOthers[0].isEnemyProb < 0.72 && profile !== 'aggressive') {
          return { type: 'SKIP_LOC' };
        }
        return { type: 'USE_LOC_POWER', mode: 'damage', targetPlayerId: bestTarget.playerId };
      }
      case 'court': {
        const donor = scoredOthers.find((x) => x.player.equipped.length > 0)?.player;
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
    // 1. Always equip passive gear from hand (helps win/combat; triggers Hải's 3-gear win!)
    const equippable = priv.hand.find((c) => c.deck !== 'investigation' && !c.isConsumable);
    if (equippable) {
      return { type: 'EQUIP_CARD', cardId: equippable.id };
    }

    // 2. Heal if wounded substantially
    const healCard = priv.hand.find((c) =>
      ['eq-06', 'eq-07', 'eq-08', 'ev-02', 'ev-03'].includes(c.id),
    );
    if (healCard && (priv.woundsTaken >= 3 || (healCard.id === 'ev-03' && priv.faction === 'lantern-guard' && priv.revealed && priv.woundsTaken >= 4))) {
      if (healCard.id === 'ev-03' && !priv.revealed && priv.faction === 'lantern-guard') {
        return { type: 'REVEAL_ROLE' };
      }
      return { type: 'USE_CARD', cardId: healCard.id, targetPlayerId: priv.playerId };
    }

    // 3. Play Investigation Card on least-known alive player
    const invCard = priv.hand.find((c) => c.deck === 'investigation');
    if (invCard) {
      const targetToProbe =
        aliveOthers
          .filter((p) => !p.revealedRoleId)
          .sort((a, b) => (botMem.possible[b.playerId]?.size || 0) - (botMem.possible[a.playerId]?.size || 0))[0] ||
        aliveOthers[0];
      return {
        type: 'INVESTIGATE_CARD',
        cardId: invCard.id,
        targetPlayerId: targetToProbe.playerId,
      };
    }

    // 4. Offensive event cards (ev-06, ev-07, ev-08)
    const offCard = priv.hand.find((c) => c.id === 'ev-06' || c.id === 'ev-07' || c.id === 'ev-08');
    if (offCard && (pub.round >= 2 || bestTarget.woundsTaken >= 5 || scoredOthers[0].isEnemyProb >= 0.7)) {
      if (offCard.id === 'ev-07') {
        // Avoid self-blast unless urgent
        const nonSelfLocTarget =
          scoredOthers.find((x) => x.player.location !== selfPub.location)?.player || bestTarget;
        if (nonSelfLocTarget.location !== selfPub.location || (selfPub.woundsTaken <= 7 && bestTarget.woundsTaken >= 8)) {
          return { type: 'USE_CARD', cardId: 'ev-07', targetLocation: nonSelfLocTarget.location };
        }
      } else {
        return { type: 'USE_CARD', cardId: offCard.id, targetPlayerId: bestTarget.playerId };
      }
    }

    // 5. Strategic Voluntary Reveal
    if (!priv.revealed) {
      const deadCount = pub.players.filter((p) => !p.alive).length;
      const aliveCount = pub.players.length - deadCount;
      const sameClusterForSteal = scoredOthers.some(
        (x) => areInSameCluster(selfPub.location, x.player.location) && x.player.equipped.length > 0,
      );
      const shouldRevealNow =
        (priv.roleId === 'lang-quan-sat' && (aliveCount <= 4 || (deadCount >= 2 && pub.round >= 3))) ||
        (priv.roleId === 'lang-cuu-ho' && (avengeTargetId || priv.woundsTaken >= 4 || pub.round >= 3)) ||
        (priv.roleId === 'lang-anh-san' && pub.round >= 3 && (selfPub.equipped.length >= 3 || (selfPub.equipped.length >= 2 && sameClusterForSteal))) ||
        (priv.roleId === 'gac-truc-ban' && priv.woundsTaken >= 5) ||
        (priv.roleId === 'gac-ky-thuat' &&
          pub.round >= 2 &&
          scoredOthers.some((x) => areInSameCluster(selfPub.location, x.player.location) && (x.isEnemyProb >= 0.55 || x.player.woundsTaken >= 6))) ||
        (priv.roleId === 'gac-radio' && pub.round >= 2) ||
        (priv.roleId === 'suong-tin-gia' && pub.round >= 2 && bestTarget.woundsTaken >= 4) ||
        (priv.roleId === 'suong-gac-cong' && priv.woundsTaken >= 4) ||
        (priv.roleId === 'suong-an-danh' && priv.woundsTaken >= 5) ||
        pub.round >= 6;
      if (shouldRevealNow) {
        return { type: 'REVEAL_ROLE' };
      }
    }

    // 6. Active Skill Usage when revealed & off cooldown
    if (priv.revealed && !priv.skillUsedOnce && priv.skillCooldown === 0) {
      const sameClusterTargets = scoredOthers.filter((x) =>
        areInSameCluster(selfPub.location, x.player.location),
      );
      if (priv.roleId === 'gac-ky-thuat' && sameClusterTargets.length > 0) {
        const t = sameClusterTargets[0];
        if (t.isEnemyProb >= 0.5 || pub.round >= 3) {
          return { type: 'USE_SKILL', targetPlayerId: t.player.playerId };
        }
      } else if (priv.roleId === 'gac-truc-ban' && (priv.woundsTaken >= 5 || (bestAlly && bestAlly.woundsTaken >= 6))) {
        const healId = priv.woundsTaken >= 5 ? priv.playerId : bestAlly.playerId;
        return { type: 'USE_SKILL', targetPlayerId: healId };
      } else if (priv.roleId === 'gac-radio') {
        const unknown = aliveOthers.find((p) => !p.revealedRoleId && (botMem.possible[p.playerId]?.size || 0) > 1);
        if (unknown) {
          return { type: 'USE_SKILL', targetPlayerId: unknown.playerId };
        }
      } else if (priv.roleId === 'suong-tin-gia') {
        if (scoredOthers[0].isEnemyProb >= 0.55 || bestTarget.woundsTaken >= 5 || pub.round >= 3) {
          return { type: 'USE_SKILL', targetPlayerId: bestTarget.playerId };
        }
      } else if (priv.roleId === 'lang-anh-san') {
        const donor = sameClusterTargets.find((x) => x.player.equipped.length > 0);
        if (donor) {
          return { type: 'USE_SKILL', targetPlayerId: donor.player.playerId };
        }
      } else if (priv.roleId === 'lang-quan-sat' && (priv.woundsTaken >= 3 || pub.players.filter((p) => p.alive).length <= 4)) {
        return { type: 'USE_SKILL' };
      } else if (priv.roleId === 'lang-cuu-ho' && sameClusterTargets.length > 0 && priv.hp >= 6) {
        const protegeInCluster = sameClusterTargets.find((x) => x.player.playerId === priv.protegePlayerId && x.player.woundsTaken >= 2);
        const needy = protegeInCluster || sameClusterTargets.find((x) => x.player.woundsTaken >= 3);
        if (needy) {
          return { type: 'USE_SKILL', targetPlayerId: needy.player.playerId };
        }
      }
    }

    // 7. Combat Attack within legal cluster range
    const hasOtherClusterBow = selfPub.equipped.some((c) => c.id === 'ev-04');
    const hasWhirlwind = selfPub.equipped.some((c) => c.id === 'eq-03');
    const reachable = scoredOthers.filter((x) => {
      const sameCluster = areInSameCluster(selfPub.location, x.player.location);
      return hasOtherClusterBow ? !sameCluster : sameCluster;
    });

    if (reachable.length > 0) {
      const top = reachable[0];
      const topIsConfirmedAlly = top.isAllyProb >= 0.85 && priv.faction !== 'wanderer';
      const topIsProtege = priv.roleId === 'lang-cuu-ho' && priv.protegePlayerId === top.player.playerId;
      const suppressRound1Blind =
        pub.round === 1 &&
        top.isEnemyProb < 0.72 &&
        !(profile === 'aggressive' && top.player.woundsTaken <= 2);
      if (!topIsConfirmedAlly && !topIsProtege && !suppressRound1Blind) {
        if (!(hasWhirlwind && reachable.some((x) => x.isAllyProb >= 0.85 && x.player.woundsTaken >= 9))) {
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
            const alt = LOCATIONS_CATALOG.find((l) => l.id !== active.location)?.id || 'lobby';
            res = applyPlayerGameAction(state, active.playerId, { type: 'CHOOSE_DEST', location: alt }, nowMs);
          } else if (state.turnPhase === 'LOCATION_ACTION') {
            res = applyPlayerGameAction(state, active.playerId, { type: 'SKIP_LOC' }, nowMs);
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
            for (const bMem of Object.values(botMemMap)) {
              bMem.killerByVictim[p.playerId] = p.eliminatedByPlayerId || active.playerId;
            }
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
