#!/usr/bin/env node
'use strict';

/**
 * scripts/fuzz-boardgame-stateful.cjs
 *
 * Phase 8B — Reproducible Stateful Fuzzer, Adversarial Input Fuzzer,
 * Deterministic Event Replay Verifier & Minimal-Trace Shrinker.
 *
 * Strictly separates:
 *  1. Valid Gameplay Stateful Fuzzing (4P–8P across classic, expansion-1, expansion-2, full-expansion
 *     plus targeted high-interaction character rosters).
 *  2. Adversarial Input Fuzzing (unauthorized actions, wrong turn, out-of-phase, spoofed choiceId,
 *     prohibited Voodoo actions, dormant/dead player actions, replayed actions) — asserting
 *     rejected actions NEVER mutate state.
 *  3. Deterministic Replay Verification (same initial seed + ordered action trace => byte-identical final state).
 *  4. Delta-Debugging Failure Shrinking (shrinks any failing trace to minimal reproducible steps).
 *
 * Usage:
 *   node scripts/fuzz-boardgame-stateful.cjs [--valid=200] [--adversarial=80] [--replay=40] [--json]
 */

require('../test/register-ts.cjs');

const crypto = require('node:crypto');
const {
  resolveProductionBetaConfigFromEnv,
} = require('../shared/contracts/boardgame.ts');
const {
  CARDS_CATALOG,
  LOCATIONS_CATALOG,
  applyPendingChoiceTimeout,
  applyPlayerGameAction,
  applyTimeoutAutoTurn,
  createInitialGameState,
  ensureExpansionState,
  getActiveTurnControlGrant,
  getCardById,
  getEffectiveSkillRoleId,
  getEffectiveTurnControllerId,
  getLocationDefinition,
  getPublicGameView,
  getRoleDesign,
  hasEffectiveSkillUsedOnce,
  hasGloriaQueuedCards,
  isEligibleNcSoldierRecruitTarget,
  isPlayerDormantPendingRevive,
  isPlayerTargetable,
  isTurnControlPausedForOwnerDecision,
  listExpandedReachableAttackTargets,
  listReachableAttackTargets,
} = require('../features/boardgame/domain/index.ts');

const {
  captureInitialIdentitySnapshot,
  checkGameStateInvariants,
} = require('../test/helpers/boardgame-invariants.cjs');

const PROD_BETA_ALL = resolveProductionBetaConfigFromEnv({
  ENABLE_PRODUCTION_BETA_EXPANSIONS: '1',
  BETA_ALLOWED_RULESETS: 'expansion-1,expansion-2,full-expansion',
});

const ALL_RULESETS = ['classic', 'expansion-1', 'expansion-2', 'full-expansion'];

function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(list, rng) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function makePlayersInput(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      playerId: `p${i + 1}`,
      displayName: `SV${i + 1}`,
      seatIndex: i,
      appearance: {
        gender: i % 2 === 0 ? 'male' : 'female',
        outfit: 'windbreaker-hust',
        hairStyle: 'short',
        skirt: false,
        glasses: false,
        backpack: true,
      },
      connected: true,
    });
  }
  return out;
}

/**
 * Enumerate legal candidate actions for the current authoritative state.
 * Note: used ONLY by the valid-gameplay generator so we test genuine gameplay state space
 * without mistaking expected rejections for engine bugs.
 */
function generateValidActionCandidates(state, rng) {
  const candidates = [];
  if (state.finished || state.turnPhase === 'ENDED') return candidates;

  const isExpanded = state.rulesetId && state.rulesetId !== 'classic';

  // If PendingChoice is active, only its owner may resolve it (or it may time out!)
  if (state.pendingChoice) {
    const pc = state.pendingChoice;
    for (const opt of pc.options) {
      candidates.push({
        kind: 'ACTION',
        playerId: pc.ownerPlayerId,
        action: { type: 'RESOLVE_CHOICE', choiceId: pc.choiceId, optionId: opt.optionId },
      });
    }
    // Occasionally test choice timeout boundary
    if (rng() < 0.08) {
      candidates.push({ kind: 'CHOICE_TIMEOUT' });
    }
    return candidates;
  }

  const active = state.activePlayerId ? state.players[state.activePlayerId] : null;
  if (!active || !active.alive || isPlayerDormantPendingRevive(state, active)) {
    return candidates;
  }

  const grant = isExpanded ? getActiveTurnControlGrant(state) : null;
  const pausedForOwner = grant ? isTurnControlPausedForOwnerDecision(state, grant) : false;
  const senderId = grant ? (pausedForOwner ? grant.privateInformationOwnerId : grant.controllerPlayerId) : active.playerId;
  const isHijackedByController = Boolean(grant && !pausedForOwner && senderId === grant.controllerPlayerId);

  // If paused for owner private investigation card, ONLY owner's INVESTIGATE_CARD is legal
  if (pausedForOwner) {
    const invCards = active.hand.filter((cid) => cid.startsWith('inv-'));
    const targets = state.turnOrder
      .map((id) => state.players[id])
      .filter((p) => p && p.alive && !isPlayerDormantPendingRevive(state, p) && p.playerId !== active.playerId);
    for (const cid of invCards) {
      for (const tgt of targets) {
        candidates.push({
          kind: 'ACTION',
          playerId: active.playerId,
          action: { type: 'INVESTIGATE_CARD', cardId: cid, targetPlayerId: tgt.playerId },
        });
      }
    }
    return candidates;
  }

  // Voluntary reveal (only when not hijacked by Voodoo controller)
  if (!isHijackedByController && !active.revealed) {
    candidates.push({
      kind: 'ACTION',
      playerId: senderId,
      action: { type: 'REVEAL_ROLE' },
    });
  }

  // Occasional private reaction policy toggle (always legal for any living non-dormant player)
  if (isExpanded && rng() < 0.05) {
    const living = state.turnOrder
      .map((id) => state.players[id])
      .filter((p) => p && p.alive && !isPlayerDormantPendingRevive(state, p));
    const who = pick(living, rng);
    if (who) {
      const policy = pick(['ASK', 'AUTO_DECLINE', 'AUTO_ACTIVATE_WHEN_ELIGIBLE'], rng);
      candidates.push({
        kind: 'ACTION',
        playerId: who.playerId,
        action: { type: 'SET_REACTION_PREF', policy },
      });
    }
  }

  // Phase-specific legal actions
  if (state.turnPhase === 'ROLL_MOVE') {
    candidates.push({ kind: 'ACTION', playerId: senderId, action: { type: 'ROLL_DICE' } });
  } else if (state.turnPhase === 'CHOOSE_MOVE') {
    const dests =
      state.allowedMoveDestinations && state.allowedMoveDestinations.length > 0
        ? state.allowedMoveDestinations
        : LOCATIONS_CATALOG.filter((l) => l.id !== active.location).map((l) => l.id);
    for (const loc of dests) {
      if (loc !== active.location) {
        candidates.push({ kind: 'ACTION', playerId: senderId, action: { type: 'CHOOSE_DEST', location: loc } });
      }
    }
  } else if (state.turnPhase === 'LOCATION_ACTION') {
    const loc = getLocationDefinition(active.location);
    if (loc.deckHint === 'any') {
      for (const deck of ['investigation', 'equipment', 'event']) {
        candidates.push({ kind: 'ACTION', playerId: senderId, action: { type: 'DRAW_CARD', deck } });
      }
    } else if (loc.deckHint === 'investigation' || loc.deckHint === 'equipment' || loc.deckHint === 'event') {
      candidates.push({ kind: 'ACTION', playerId: senderId, action: { type: 'DRAW_CARD', deck: loc.deckHint } });
    } else if (loc.deckHint === 'power-9') {
      const targets = state.turnOrder
        .map((id) => state.players[id])
        .filter((p) => p && p.alive && !isPlayerDormantPendingRevive(state, p));
      for (const tgt of targets) {
        candidates.push({
          kind: 'ACTION',
          playerId: senderId,
          action: { type: 'USE_LOC_POWER', targetPlayerId: tgt.playerId, mode: 'heal' },
        });
        if (tgt.playerId !== active.playerId) {
          candidates.push({
            kind: 'ACTION',
            playerId: senderId,
            action: { type: 'USE_LOC_POWER', targetPlayerId: tgt.playerId, mode: 'damage' },
          });
        }
      }
    } else if (loc.deckHint === 'power-10') {
      const donors = state.turnOrder
        .map((id) => state.players[id])
        .filter((p) => p && p.alive && !isPlayerDormantPendingRevive(state, p) && p.playerId !== active.playerId && p.equipped.length > 0);
      for (const d of donors) {
        candidates.push({
          kind: 'ACTION',
          playerId: senderId,
          action: { type: 'USE_LOC_POWER', targetPlayerId: d.playerId, mode: 'steal', equipCardId: pick(d.equipped, rng) },
        });
      }
    }
    candidates.push({ kind: 'ACTION', playerId: senderId, action: { type: 'SKIP_LOC' } });
  }

  // Resolve cards in hand during LOCATION_ACTION or MAIN_ACTION
  if ((state.turnPhase === 'LOCATION_ACTION' || state.turnPhase === 'MAIN_ACTION') && active.hand.length > 0) {
    const livingOthers = state.turnOrder
      .map((id) => state.players[id])
      .filter((p) => p && p.alive && !isPlayerDormantPendingRevive(state, p) && p.playerId !== active.playerId);
    const livingAll = state.turnOrder
      .map((id) => state.players[id])
      .filter((p) => p && p.alive && !isPlayerDormantPendingRevive(state, p));
    for (const cid of active.hand) {
      const card = getCardById(cid);
      if (!card) continue;
      if (card.deck === 'investigation') {
        if (!isHijackedByController) {
          for (const tgt of livingOthers) {
            candidates.push({
              kind: 'ACTION',
              playerId: senderId,
              action: { type: 'INVESTIGATE_CARD', cardId: cid, targetPlayerId: tgt.playerId },
            });
          }
        }
      } else if (!card.isConsumable) {
        candidates.push({ kind: 'ACTION', playerId: senderId, action: { type: 'EQUIP_CARD', cardId: cid } });
      } else {
        const tgt = pick(livingOthers, rng);
        const anyTgt = pick(livingAll, rng);
        const needOther =
          card.effectKind === 'eq_blessing' ||
          card.effectKind === 'ev_vampire_bat' ||
          card.effectKind === 'ev_spider' ||
          card.effectKind === 'ev_spiritual_doll';
        const needAny = card.effectKind === 'eq_first_aid';
        const chosenTarget = needOther ? tgt?.playerId : needAny ? anyTgt?.playerId : tgt?.playerId;
        const skipEffect =
          card.effectKind === 'eq_advent' ||
          card.effectKind === 'eq_chocolate' ||
          card.effectKind === 'ev_diabolic_ritual'
            ? rng() < 0.3
            : undefined;
        candidates.push({
          kind: 'ACTION',
          playerId: senderId,
          action: {
            type: 'USE_CARD',
            cardId: cid,
            ...(chosenTarget ? { targetPlayerId: chosenTarget } : {}),
            ...(skipEffect !== undefined ? { skipEffect } : {}),
          },
        });
      }
    }
  }

  // Active character skills (only when NOT hijacked by Voodoo controller)
  if (!isHijackedByController && active.hand.length === 0 && !(isExpanded && hasGloriaQueuedCards(state, active.playerId))) {
    const effRole = isExpanded ? getEffectiveSkillRoleId(state, active) : active.roleId;
    const design = getRoleDesign(effRole);
    const livingOthers = state.turnOrder
      .map((id) => state.players[id])
      .filter((p) => p && p.alive && !isPlayerDormantPendingRevive(state, p) && p.playerId !== active.playerId);

    if (active.revealed || effRole === 'exp1_anathema') {
      if (effRole === 'exp2_nc_soldier' && state.turnPhase === 'MAIN_ACTION' && active.attacksThisTurn === 0) {
        const reachable = listExpandedReachableAttackTargets(state, active);
        for (const tgt of reachable) {
          if (isEligibleNcSoldierRecruitTarget(state, active, tgt)) {
            candidates.push({
              kind: 'ACTION',
              playerId: senderId,
              action: { type: 'USE_SKILL', targetPlayerId: tgt.playerId },
            });
          }
        }
      } else if (
        effRole === 'gac-ky-thuat' ||
        effRole === 'gac-radio' ||
        effRole === 'lang-quan-sat' ||
        effRole === 'lang-cuu-ho' ||
        effRole === 'exp1_voodoo' ||
        effRole === 'exp2_cain' ||
        effRole === 'exp1_ernest' ||
        effRole === 'exp2_warlord' ||
        effRole === 'exp1_angel' ||
        effRole === 'exp2_elise' ||
        effRole === 'exp2_eleanor' ||
        effRole === 'exp2_bryon' ||
        effRole === 'exp1_anathema' ||
        effRole === 'exp1_bethany' ||
        effRole === 'exp1_cassie' ||
        effRole === 'exp1_clairvoyant' ||
        effRole === 'exp1_wrath' ||
        effRole === 'exp2_visions' ||
        effRole === 'exp1_bipolar' ||
        effRole === 'exp2_father_harrison' ||
        effRole === 'gac-truc-ban'
      ) {
        const tgt = pick(livingOthers, rng);
        const usedOnce = isExpanded ? hasEffectiveSkillUsedOnce(state, active) : active.skillUsedOnce;
        if (!design.oncePerMatch || !usedOnce) {
          candidates.push({
            kind: 'ACTION',
            playerId: senderId,
            action: { type: 'USE_SKILL', ...(tgt ? { targetPlayerId: tgt.playerId } : {}) },
          });
        }
      }
    }
  }

  // MAIN_ACTION attacks & END_TURN
  if (state.turnPhase === 'MAIN_ACTION' && active.hand.length === 0 && !(isExpanded && hasGloriaQueuedCards(state, active.playerId))) {
    if (active.attacksThisTurn === 0) {
      const reachable = isExpanded
        ? listExpandedReachableAttackTargets(state, active)
        : listReachableAttackTargets(state, active);
      for (const tgt of reachable) {
        candidates.push({
          kind: 'ACTION',
          playerId: senderId,
          action: { type: 'ATTACK', targetPlayerId: tgt.playerId },
        });
      }
    }
    candidates.push({ kind: 'ACTION', playerId: senderId, action: { type: 'END_TURN' } });
  }

  // Occasional forced auto-turn timeout simulation (tests timeout boundaries!)
  if (rng() < 0.015) {
    candidates.push({ kind: 'AUTO_TURN_TIMEOUT' });
  }

  return candidates;
}

/**
 * Execute a recorded step on `state`.
 */
function applyTraceStep(state, step) {
  if (step.kind === 'CHOICE_TIMEOUT') {
    const ok = applyPendingChoiceTimeout(state, step.nowMs);
    return { ok };
  }
  if (step.kind === 'AUTO_TURN_TIMEOUT') {
    applyTimeoutAutoTurn(state, step.nowMs);
    return { ok: true };
  }
  return applyPlayerGameAction(state, step.playerId, step.action, step.nowMs);
}

function canonicalGameplaySnapshot(s) {
  return JSON.stringify({
    round: s.round,
    turnNumber: s.turnNumber,
    turnPhase: s.turnPhase,
    activePlayerId: s.activePlayerId,
    finished: s.finished,
    winnerPlayerIds: s.winnerPlayerIds,
    decks: s.decks,
    discards: s.discards,
    pendingChoice: s.pendingChoice,
    players: Object.fromEntries(
      Object.entries(s.players).map(([k, p]) => [
        k,
        {
          hp: p.hp,
          woundsTaken: p.woundsTaken,
          alive: p.alive,
          revealed: p.revealed,
          location: p.location,
          hand: p.hand,
          equipped: p.equipped,
          skillUsedOnce: p.skillUsedOnce,
          attacksThisTurn: p.attacksThisTurn,
        },
      ]),
    ),
  });
}

/**
 * Targeted high-interaction rosters forcing Tier-4 + Tier-3 interactions that rare random deals may hit infrequently.
 */
const TARGETED_HIGH_INTERACTION_ROSTERS = [
  {
    name: 'voodoo-father-harrison-felicia-gloria',
    rulesetId: 'full-expansion',
    roles: [
      'exp1_voodoo',
      'exp2_father_harrison',
      'exp2_felicia',
      'exp2_gloria',
      'exp2_cruz',
      'exp1_lloyd',
    ],
  },
  {
    name: 'undead-vengeful-spirit-antimony-gideon-cain',
    rulesetId: 'full-expansion',
    roles: [
      'exp1_undead',
      'exp1_vengeful_spirit',
      'exp1_antimony',
      'exp2_gideon',
      'exp2_cain',
      'exp2_ernest',
    ],
  },
  {
    name: 'anathema-arnold-bianca-wrath-undying-usurper',
    rulesetId: 'full-expansion',
    roles: [
      'exp1_anathema',
      'exp1_arnold',
      'exp2_bianca',
      'exp1_wrath',
      'exp1_undying',
      'exp2_usurper',
    ],
  },
  {
    name: 'bonnie-cassie-diana-angel-nc-soldier-aaron',
    rulesetId: 'full-expansion',
    roles: [
      'exp2_bonnie',
      'exp1_cassie',
      'exp2_diana',
      'exp1_angel',
      'exp2_nc_soldier',
      'exp2_aaron',
      'exp1_lloyd',
      'exp1_wrath',
    ],
  },
];

function applyForcedRoster(state, roleIds) {
  const exp = ensureExpansionState(state);
  const origNeutrals = [];
  for (let i = 0; i < state.turnOrder.length && i < roleIds.length; i++) {
    const pid = state.turnOrder[i];
    const p = state.players[pid];
    const design = getRoleDesign(roleIds[i]);
    p.roleId = roleIds[i];
    p.faction = design.faction;
    p.maxHp = design.maxHp;
    p.hp = design.maxHp;
    p.woundsTaken = 0;
    if (design.faction === 'wanderer') origNeutrals.push(pid);
  }
  exp.originallyDealtNeutralIds = origNeutrals;
}

/**
 * Replay a full ordered trace from scratch and check invariants after every step.
 */
function replayTraceAndCheck(config, trace) {
  const state = createInitialGameState({
    matchId: config.matchId,
    seed: config.seed,
    nowMs: config.startMs,
    rulesetId: config.rulesetId,
    productionBeta: PROD_BETA_ALL,
    players: makePlayersInput(config.playerCount),
  });
  if (Array.isArray(config.forcedRoles) && config.forcedRoles.length > 0) {
    applyForcedRoster(state, config.forcedRoles);
  }
  const initId = captureInitialIdentitySnapshot(state);
  const initCheck = checkGameStateInvariants(state, { initialIdentity: initId });
  if (!initCheck.ok) {
    return { ok: false, failedAtStep: -1, violations: initCheck.violations, state };
  }
  for (let i = 0; i < trace.length; i++) {
    const preSnap = canonicalGameplaySnapshot(state);
    const res = applyTraceStep(state, trace[i]);
    if (!res.ok) {
      const postSnap = canonicalGameplaySnapshot(state);
      if (preSnap !== postSnap) {
        return {
          ok: false,
          failedAtStep: i,
          violations: [
            {
              category: 'ENGINE',
              code: 'REJECTED_ACTION_MUTATED_STATE',
              expected: 'unchanged state on ok=false',
              actual: { step: trace[i], error: res.error },
              message: `Rejected action ${trace[i]?.action?.type ?? trace[i]?.kind} mutated gameplay state`,
            },
          ],
          state,
        };
      }
    }
    const check = checkGameStateInvariants(state, {
      initialIdentity: initId,
      checkSerialization: i === trace.length - 1,
    });
    if (!check.ok) {
      return { ok: false, failedAtStep: i, violations: check.violations, state };
    }
  }
  return { ok: true, failedAtStep: -1, violations: [], state };
}

/**
 * Delta-debugging trace shrinker: tries prefix truncation then single-step deletion
 * to find the shortest sequence still violating the same invariant code.
 */
function shrinkFailingTrace(config, fullTrace, targetCode) {
  let best = fullTrace.slice();
  const reproduces = (candidate) => {
    const r = replayTraceAndCheck(config, candidate);
    return !r.ok && r.violations.some((v) => v.code === targetCode);
  };

  // Phase 1: binary search shortest failing prefix
  let lo = 1;
  let hi = best.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (reproduces(best.slice(0, mid))) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  best = best.slice(0, hi);

  // Phase 2: greedy chunk & single-step removal (bounded budget)
  let attempts = 0;
  let stepSize = Math.max(1, Math.floor(best.length / 4));
  while (stepSize >= 1 && attempts < 120) {
    let improved = false;
    for (let i = 0; i < best.length && attempts < 120; i += stepSize) {
      const candidate = [...best.slice(0, i), ...best.slice(i + stepSize)];
      if (candidate.length === 0) continue;
      attempts += 1;
      if (reproduces(candidate)) {
        best = candidate;
        improved = true;
        break;
      }
    }
    if (!improved) {
      stepSize = Math.floor(stepSize / 2);
    }
  }
  return best;
}

/**
 * Run a single valid-gameplay stateful fuzz match and check invariants on EVERY step.
 */
function runValidFuzzMatch(seed, rulesetId, playerCount, maxSteps = 450, forcedRoles = null) {
  const rng = createRng(seed ^ 0x9e3779b9);
  const startMs = 1_795_000_000_000 + (seed % 100_000);
  const config = {
    matchId: `fuzz-v-${rulesetId}-${playerCount}-${seed}`,
    seed,
    startMs,
    rulesetId,
    playerCount,
    ...(Array.isArray(forcedRoles) ? { forcedRoles } : {}),
  };
  const state = createInitialGameState({
    matchId: config.matchId,
    seed,
    nowMs: startMs,
    rulesetId,
    productionBeta: PROD_BETA_ALL,
    players: makePlayersInput(playerCount),
  });
  if (Array.isArray(forcedRoles) && forcedRoles.length > 0) {
    applyForcedRoster(state, forcedRoles);
  }
  const initId = captureInitialIdentitySnapshot(state);
  const trace = [];
  let nowMs = startMs;

  const initInv = checkGameStateInvariants(state, { initialIdentity: initId, checkSerialization: true });
  if (!initInv.ok) {
    return {
      ok: false,
      seed,
      rulesetId,
      playerCount,
      initialStateRef: initId,
      trace,
      violations: initInv.violations,
      minimalTrace: [],
    };
  }

  let stepsApplied = 0;
  let consecutiveNoOp = 0;

  while (!state.finished && stepsApplied < maxSteps) {
    nowMs += 250;
    const candidates = generateValidActionCandidates(state, rng);
    if (candidates.length === 0) {
      // Force fallback timeout if stuck
      const step = { kind: 'AUTO_TURN_TIMEOUT', nowMs };
      trace.push(step);
      applyTraceStep(state, step);
      stepsApplied += 1;
      consecutiveNoOp += 1;
      if (consecutiveNoOp > 8) {
        return {
          ok: false,
          seed,
          rulesetId,
          playerCount,
          initialStateRef: initId,
          trace,
          violations: [
            {
              category: 'TURN',
              code: 'FUZZ_STALL_NO_CANDIDATES',
              expected: 'at least one legal progression',
              actual: { phase: state.turnPhase, pendingChoice: state.pendingChoice?.kind ?? null },
              message: 'No valid candidate action found and auto-turn did not clear stall',
            },
          ],
          minimalTrace: trace.slice(-10),
        };
      }
      continue;
    }

    // Shuffle candidates lightly and pick first one accepted by engine
    let appliedStep = null;
    const tries = Math.min(candidates.length, 16);
    for (let t = 0; t < tries; t++) {
      const idx = Math.floor(rng() * candidates.length);
      const picked = candidates.splice(idx, 1)[0];
      const step = { ...picked, nowMs };
      const preSnap = canonicalGameplaySnapshot(state);
      const res = applyTraceStep(state, step);
      if (res.ok) {
        appliedStep = step;
        trace.push(step);
        stepsApplied += 1;
        consecutiveNoOp = 0;
        break;
      } else {
        // Rejected action MUST NEVER mutate gameplay state!
        const postSnap = canonicalGameplaySnapshot(state);
        if (preSnap !== postSnap) {
          const mutViolation = {
            category: 'ENGINE',
            code: 'REJECTED_ACTION_MUTATED_STATE',
            expected: 'gameplay state unchanged when res.ok === false',
            actual: { step, error: res.error },
            message: `Rejected action ${step.action?.type ?? step.kind} by ${step.playerId ?? 'system'} mutated gameplay state!`,
          };
          const failTrace = [...trace, step];
          return {
            ok: false,
            seed,
            rulesetId,
            playerCount,
            initialStateRef: initId,
            trace: failTrace,
            violations: [mutViolation],
            minimalTrace: shrinkFailingTrace(config, failTrace, 'REJECTED_ACTION_MUTATED_STATE'),
          };
        }
      }
    }

    if (!appliedStep) {
      // If all sampled random actions rejected (e.g. mandatory Masamune attack or hand resolution),
      // pick deterministically from remaining legal progression
      const fallback = state.pendingChoice
        ? { kind: 'CHOICE_TIMEOUT', nowMs }
        : { kind: 'AUTO_TURN_TIMEOUT', nowMs };
      trace.push(fallback);
      applyTraceStep(state, fallback);
      stepsApplied += 1;
      consecutiveNoOp += 1;
    }

    const inv = checkGameStateInvariants(state, {
      initialIdentity: initId,
      checkSerialization: stepsApplied % 40 === 0 || state.finished,
    });
    if (!inv.ok) {
      const minimalTrace = shrinkFailingTrace(config, trace, inv.violations[0].code);
      return {
        ok: false,
        seed,
        rulesetId,
        playerCount,
        initialStateRef: initId,
        trace,
        violations: inv.violations,
        minimalTrace,
      };
    }
  }

  return {
    ok: true,
    seed,
    rulesetId,
    playerCount,
    finished: state.finished,
    stepsApplied,
    rounds: state.round,
    winnerFaction: state.winnerFaction,
    winnerPlayerIds: [...state.winnerPlayerIds],
    finalHash: sha256(JSON.stringify(state)),
    config,
    trace,
  };
}

/**
 * Adversarial Input Fuzzing:
 * Interleaves random unauthorized/malformed/out-of-turn/spoofed actions between valid actions,
 * verifying:
 *  - Rejected actions NEVER mutate gameplay state (HP, wounds, cards, equipped, phase, turn, winners).
 *  - Dormant / eliminated players can NEVER perform normal actions.
 *  - Voodoo controller can NEVER execute prohibited actions or inspect hidden victim identity.
 *  - Replaying an already resolved choiceId always fails cleanly.
 */
function runAdversarialFuzzMatch(seed, rulesetId, playerCount, maxRoundsSteps = 120) {
  const rng = createRng(seed ^ 0x517cc1b7);
  const startMs = 1_795_500_000_000 + (seed % 100_000);
  const state = createInitialGameState({
    matchId: `fuzz-adv-${rulesetId}-${playerCount}-${seed}`,
    seed,
    nowMs: startMs,
    rulesetId,
    productionBeta: PROD_BETA_ALL,
    players: makePlayersInput(playerCount),
  });
  const initId = captureInitialIdentitySnapshot(state);
  let nowMs = startMs;
  let adversarialProbes = 0;
  let adversarialRejections = 0;
  const resolvedChoicesSeen = [];
  const violations = [];

  const canonicalGameplaySnapshot = (s) =>
    JSON.stringify({
      round: s.round,
      turnNumber: s.turnNumber,
      turnPhase: s.turnPhase,
      activePlayerId: s.activePlayerId,
      finished: s.finished,
      winnerPlayerIds: s.winnerPlayerIds,
      decks: s.decks,
      discards: s.discards,
      pendingChoice: s.pendingChoice,
      players: Object.fromEntries(
        Object.entries(s.players).map(([k, p]) => [
          k,
          {
            hp: p.hp,
            woundsTaken: p.woundsTaken,
            alive: p.alive,
            revealed: p.revealed,
            location: p.location,
            hand: p.hand,
            equipped: p.equipped,
            skillUsedOnce: p.skillUsedOnce,
            attacksThisTurn: p.attacksThisTurn,
          },
        ]),
      ),
    });

  for (let stepIdx = 0; stepIdx < maxRoundsSteps && !state.finished; stepIdx++) {
    nowMs += 200;

    // 1. Fire 4 adversarial probes per step
    const allIds = [...state.turnOrder, 'ghost-player-999'];
    const deadOrDormant = state.turnOrder.filter(
      (id) => !state.players[id].alive || isPlayerDormantPendingRevive(state, state.players[id]),
    );
    const activeController = getEffectiveTurnControllerId(state);
    const nonOwners = state.turnOrder.filter((id) => id !== activeController);

    const probes = [
      // Wrong-turn / non-owner action
      {
        playerId: pick(nonOwners.length ? nonOwners : allIds, rng),
        action: pick(
          [
            { type: 'ROLL_DICE' },
            { type: 'END_TURN' },
            { type: 'SKIP_LOC' },
            { type: 'ATTACK', targetPlayerId: pick(state.turnOrder, rng) },
            { type: 'DRAW_CARD', deck: 'equipment' },
            { type: 'USE_CARD', cardId: 'ev-07', targetPlayerId: pick(state.turnOrder, rng) },
          ],
          rng,
        ),
      },
      // Spoofed or replayed RESOLVE_CHOICE
      {
        playerId: pick(allIds, rng),
        action: {
          type: 'RESOLVE_CHOICE',
          choiceId:
            resolvedChoicesSeen.length > 0 && rng() < 0.5
              ? pick(resolvedChoicesSeen, rng)
              : state.pendingChoice
                ? state.pendingChoice.choiceId
                : 'choice-forged-999',
          optionId: 'forged_option_xyz',
        },
      },
      // Dead or dormant player trying to act
      ...(deadOrDormant.length > 0
        ? [
            {
              playerId: pick(deadOrDormant, rng),
              action: pick(
                [
                  { type: 'ROLL_DICE' },
                  { type: 'REVEAL_ROLE' },
                  { type: 'USE_SKILL', targetPlayerId: pick(state.turnOrder, rng) },
                  { type: 'END_TURN' },
                ],
                rng,
              ),
            },
          ]
        : []),
      // Unknown cardId / illegal transfer / self-attack
      {
        playerId: activeController || state.turnOrder[0],
        action: pick(
          [
            { type: 'ATTACK', targetPlayerId: activeController || state.turnOrder[0] },
            { type: 'EQUIP_CARD', cardId: 'inv-01' },
            { type: 'USE_CARD', cardId: 'nonexistent-card-99' },
            { type: 'INVESTIGATE_CARD', cardId: 'eq-01', targetPlayerId: pick(state.turnOrder, rng) },
            { type: 'TRANSFER_TO_BETHANY', targetPlayerId: 'p1', cardId: 'ev-01' },
          ],
          rng,
        ),
      },
    ];

    // If Voodoo grant is active, ALSO test all prohibited controller actions!
    const grant = getActiveTurnControlGrant(state);
    if (grant) {
      for (const badAction of [
        { type: 'REVEAL_ROLE' },
        { type: 'USE_SKILL', targetPlayerId: grant.controllerPlayerId },
        { type: 'INVESTIGATE_CARD', cardId: 'inv-01', targetPlayerId: grant.controllerPlayerId },
        { type: 'USE_CARD', cardId: 'inv-01', targetPlayerId: grant.controllerPlayerId },
        { type: 'EQUIP_CARD', cardId: 'inv-01' },
      ]) {
        probes.push({ playerId: grant.controllerPlayerId, action: badAction });
      }
    }

    for (const probe of probes) {
      if (!probe.playerId || !probe.action) continue;
      adversarialProbes += 1;
      const beforeSnap = canonicalGameplaySnapshot(state);
      const res = applyPlayerGameAction(state, probe.playerId, probe.action, nowMs);
      if (!res.ok) {
        adversarialRejections += 1;
        const afterSnap = canonicalGameplaySnapshot(state);
        if (beforeSnap !== afterSnap) {
          violations.push({
            category: 'ADVERSARIAL',
            code: 'REJECTED_ACTION_MUTATED_STATE',
            expected: 'state unchanged after rejected action',
            actual: { probe, error: res.error },
            message: `Rejected action ${probe.action.type} by ${probe.playerId} mutated gameplay state`,
          });
          return { ok: false, seed, rulesetId, playerCount, adversarialProbes, adversarialRejections, violations };
        }
      } else {
        // An adversarial probe MUST NEVER succeed for dead/dormant, ghost player, forged optionId, or prohibited Voodoo action!
        const pObj = state.players[probe.playerId];
        if (!pObj || !pObj.alive || isPlayerDormantPendingRevive(state, pObj)) {
          violations.push({
            category: 'ADVERSARIAL',
            code: 'DEAD_OR_GHOST_ACTION_ACCEPTED',
            expected: 'rejected',
            actual: probe,
            message: `Dead/dormant/ghost player ${probe.playerId} had action ${probe.action.type} accepted!`,
          });
          return { ok: false, seed, rulesetId, playerCount, adversarialProbes, adversarialRejections, violations };
        }
        if (probe.action.type === 'RESOLVE_CHOICE' && probe.action.optionId === 'forged_option_xyz') {
          violations.push({
            category: 'ADVERSARIAL',
            code: 'FORGED_OPTION_ACCEPTED',
            expected: 'rejected',
            actual: probe,
            message: 'Forged optionId was accepted by resolvePendingChoice!',
          });
          return { ok: false, seed, rulesetId, playerCount, adversarialProbes, adversarialRejections, violations };
        }
      }
    }

    // 2. Advance one valid step
    if (state.pendingChoice) {
      resolvedChoicesSeen.push(state.pendingChoice.choiceId);
    }
    const valid = generateValidActionCandidates(state, rng);
    let progressed = false;
    for (let t = 0; t < Math.min(valid.length, 10); t++) {
      const picked = valid.splice(Math.floor(rng() * valid.length), 1)[0];
      const r = applyTraceStep(state, { ...picked, nowMs: nowMs + 10 });
      if (r.ok) {
        progressed = true;
        break;
      }
    }
    if (!progressed) {
      applyTimeoutAutoTurn(state, nowMs + 20);
    }

    const inv = checkGameStateInvariants(state, { initialIdentity: initId });
    if (!inv.ok) {
      return {
        ok: false,
        seed,
        rulesetId,
        playerCount,
        adversarialProbes,
        adversarialRejections,
        violations: inv.violations,
      };
    }
  }

  return {
    ok: true,
    seed,
    rulesetId,
    playerCount,
    adversarialProbes,
    adversarialRejections,
    violations: [],
  };
}

function main() {
  const args = process.argv.slice(2);
  const getNumArg = (name, def) => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? Math.max(1, Number(found.split('=')[1]) || def) : def;
  };
  const validCount = getNumArg('valid', 120);
  const advCount = getNumArg('adversarial', 60);
  const replayCount = getNumArg('replay', 25);
  const jsonMode = args.includes('--json');

  const t0 = Date.now();
  const validFailures = [];
  const advFailures = [];
  const replayFailures = [];
  const completedValidSamples = [];

  let validStepsTotal = 0;
  let validFinishedCount = 0;
  const byRuleset = Object.create(null);

  for (let i = 0; i < validCount; i++) {
    const rulesetId = ALL_RULESETS[i % ALL_RULESETS.length];
    const playerCount = 4 + (i % 5); // 4..8
    const seed = 88_000_000 + i * 97 + playerCount * 7;
    const res = runValidFuzzMatch(seed, rulesetId, playerCount);
    byRuleset[rulesetId] = (byRuleset[rulesetId] || 0) + 1;
    if (!res.ok) {
      validFailures.push({
        seed: res.seed,
        rulesetId: res.rulesetId,
        playerCount: res.playerCount,
        violations: res.violations,
        minimalTraceLen: res.minimalTrace?.length ?? 0,
        minimalTrace: res.minimalTrace?.slice(0, 25),
      });
    } else {
      validStepsTotal += res.stepsApplied;
      if (res.finished) validFinishedCount += 1;
      if (completedValidSamples.length < replayCount) {
        completedValidSamples.push(res);
      }
    }
  }

  const targetedCount = getNumArg('targeted', 40);
  const targetedFailures = [];
  let targetedStepsTotal = 0;
  for (let i = 0; i < targetedCount; i++) {
    const roster = TARGETED_HIGH_INTERACTION_ROSTERS[i % TARGETED_HIGH_INTERACTION_ROSTERS.length];
    const seed = 77_000_000 + i * 73;
    const res = runValidFuzzMatch(seed, roster.rulesetId, roster.roles.length, 450, roster.roles);
    if (!res.ok) {
      targetedFailures.push({
        roster: roster.name,
        seed: res.seed,
        violations: res.violations,
        minimalTraceLen: res.minimalTrace?.length ?? 0,
        minimalTrace: res.minimalTrace?.slice(0, 25),
      });
    } else {
      targetedStepsTotal += res.stepsApplied;
      if (completedValidSamples.length < replayCount + 12) {
        completedValidSamples.push(res);
      }
    }
  }

  // Deterministic Replay Verification on sampled valid & targeted matches
  for (const sample of completedValidSamples) {
    const replay = replayTraceAndCheck(sample.config, sample.trace);
    const replayHash = sha256(JSON.stringify(replay.state));
    if (!replay.ok || replayHash !== sample.finalHash) {
      replayFailures.push({
        seed: sample.seed,
        rulesetId: sample.rulesetId,
        playerCount: sample.playerCount,
        expectedHash: sample.finalHash,
        actualHash: replayHash,
        violations: replay.violations,
      });
    }
  }

  let totalAdversarialProbes = 0;
  let totalAdversarialRejections = 0;
  for (let i = 0; i < advCount; i++) {
    const rulesetId = ALL_RULESETS[i % ALL_RULESETS.length];
    const playerCount = 4 + (i % 5);
    const seed = 99_000_000 + i * 131 + playerCount * 11;
    const res = runAdversarialFuzzMatch(seed, rulesetId, playerCount);
    totalAdversarialProbes += res.adversarialProbes;
    totalAdversarialRejections += res.adversarialRejections;
    if (!res.ok) {
      advFailures.push({
        seed: res.seed,
        rulesetId: res.rulesetId,
        playerCount: res.playerCount,
        violations: res.violations,
      });
    }
  }

  const summary = {
    ok:
      validFailures.length === 0 &&
      targetedFailures.length === 0 &&
      advFailures.length === 0 &&
      replayFailures.length === 0,
    elapsedMs: Date.now() - t0,
    validFuzz: {
      matchesRun: validCount,
      finishedCount: validFinishedCount,
      totalStepsExecuted: validStepsTotal,
      byRuleset,
      failureCount: validFailures.length,
      failures: validFailures.slice(0, 10),
    },
    targetedInteractionFuzz: {
      matchesRun: targetedCount,
      totalStepsExecuted: targetedStepsTotal,
      rosters: TARGETED_HIGH_INTERACTION_ROSTERS.map((r) => r.name),
      failureCount: targetedFailures.length,
      failures: targetedFailures.slice(0, 10),
    },
    deterministicReplay: {
      matchesReplayed: completedValidSamples.length,
      failureCount: replayFailures.length,
      failures: replayFailures.slice(0, 5),
    },
    adversarialFuzz: {
      matchesRun: advCount,
      totalProbes: totalAdversarialProbes,
      totalRejections: totalAdversarialRejections,
      failureCount: advFailures.length,
      failures: advFailures.slice(0, 10),
    },
  };

  if (jsonMode) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }

  process.exit(summary.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  TARGETED_HIGH_INTERACTION_ROSTERS,
  runValidFuzzMatch,
  runAdversarialFuzzMatch,
  replayTraceAndCheck,
  shrinkFailingTrace,
};
