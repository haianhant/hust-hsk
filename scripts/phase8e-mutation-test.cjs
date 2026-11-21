#!/usr/bin/env node
/**
 * scripts/phase8e-mutation-test.cjs
 *
 * Phase 8E-4 — Targeted In-Memory Mutation Testing on 8 Core Engine Predicates:
 * Injects 1 surgical fault at a time via Node's in-memory `.ts` compiler hook
 * (ZERO writes to repo source files on disk!) and runs focused verification tests
 * to prove our test suite actively catches broken game/security logic.
 *
 * 8 Core Predicates (12 targeted mutants):
 *  1. Victory eligibility       (MUT-01 Colt, MUT-02 Arnold, MUT-03 Cain)
 *  2. PendingChoice ownership   (MUT-04 resolvePendingChoice owner check)
 *  3. Turn control auth         (MUT-05 Voodoo prohibited action, MUT-06 Private inv pause)
 *  4. Deadline expiration       (MUT-07 BUG-8B-02 PendingChoice deadline retention on reconnect)
 *  5. Resurrection status       (MUT-08 Dormant counts alive for faction victory)
 *  6. Damage redirection        (MUT-09 Cycle/visited guard, MUT-10 HP-cost bypass)
 *  7. Effective faction         (MUT-11 DynamicAllegiance getEffectiveFaction)
 *  8. Equipment conservation    (MUT-12 Atomic remove-before-equip transfer)
 *
 * Usage:
 *   node scripts/phase8e-mutation-test.cjs [--json]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const REPO = path.resolve(__dirname, '..');

const MUTANTS = [
  {
    id: 'MUT-01',
    predicate: 'victory-eligibility',
    file: 'features/boardgame/domain/victory-engine.ts',
    description: 'Colt immediate victory weapon threshold >= 3 mutated to >= 4',
    find: 'return player.alive && countColtQualifyingWeapons(player.equipped) >= 3;',
    replace: 'return player.alive && countColtQualifyingWeapons(player.equipped) >= 4;',
    testFiles: ['test/boardgame-phase8e-coverage.test.cjs'],
  },
  {
    id: 'MUT-02',
    predicate: 'victory-eligibility',
    file: 'features/boardgame/domain/victory-engine.ts',
    description: 'Arnold survivor count > 2 mutated to >= 2',
    find: "return timing === 'end-of-match' && subject.alive && alivePlayers.length > 2;",
    replace: "return timing === 'end-of-match' && subject.alive && alivePlayers.length >= 2;",
    testFiles: ['test/boardgame-phase8e-coverage.test.cjs'],
  },
  {
    id: 'MUT-03',
    predicate: 'victory-eligibility',
    file: 'features/boardgame/domain/victory-engine.ts',
    description: 'Cain 6P-8P personal victory deadOtherNeutrals >= 1 mutated to >= 0',
    find: 'return deadHunters >= 1 && deadShadows >= 1 && deadOtherNeutrals >= 1;',
    replace: 'return deadHunters >= 1 && deadShadows >= 1 && deadOtherNeutrals >= 0;',
    testFiles: ['test/boardgame-phase8e-coverage.test.cjs'],
  },
  {
    id: 'MUT-04',
    predicate: 'pending-choice-ownership',
    file: 'features/boardgame/domain/expansion-skills.ts',
    description: 'Disable non-owner rejection in resolvePendingChoice',
    find: 'if (!options?.isTimeoutFallback && pending.ownerPlayerId !== playerId) {',
    replace: 'if (false && !options?.isTimeoutFallback && pending.ownerPlayerId !== playerId) {',
    testFiles: ['test/boardgame-phase8e-interactions.test.cjs'],
  },
  {
    id: 'MUT-05',
    predicate: 'turn-control-authorization',
    file: 'features/boardgame/domain/turn-ownership.ts',
    description: 'Allow hijacked victim to bypass Voodoo CONTROLLED_BY_OTHER lock',
    find: "  if (senderPlayerId === grant.activePlayerId) {\n    return {\n      authorized: false,\n      actingPawnPlayerId: null,\n      code: 'CONTROLLED_BY_OTHER',",
    replace: "  if (senderPlayerId === grant.activePlayerId) {\n    return {\n      authorized: true,\n      actingPawnPlayerId: grant.actingPawnPlayerId,\n      code: 'CONTROLLED_BY_OTHER',",
    testFiles: ['test/boardgame-phase7b.test.cjs'],
  },
  {
    id: 'MUT-06',
    predicate: 'turn-control-authorization',
    file: 'features/boardgame/domain/turn-ownership.ts',
    description: 'Disable turn-control pause when victim holds private inv-* card',
    find: 'if (ownerHasPrivateInv) {',
    replace: 'if (false && ownerHasPrivateInv) {',
    testFiles: ['test/boardgame-phase8e-interactions.test.cjs'],
  },
  {
    id: 'MUT-07',
    predicate: 'deadline-expiration',
    file: 'worker/src/boardgame-room.ts',
    description: 'Revert BUG-8B-02 fix (allow reconnect to clear pendingChoice deadline)',
    find: 'if (engineState?.pendingChoice) {',
    replace: 'if (false && engineState?.pendingChoice) {',
    testFiles: ['test/boardgame-phase8b-stateful-audit.test.cjs'],
  },
  {
    id: 'MUT-08',
    predicate: 'resurrection-status',
    file: 'features/boardgame/domain/pending-resurrection.ts',
    description: 'Exclude DORMANT_PENDING_REVIVE from isPlayerLivingOrPendingRevive',
    find: "return lc === 'ALIVE' || lc === 'REVIVED' || lc === 'DORMANT_PENDING_REVIVE';",
    replace: "return lc === 'ALIVE' || lc === 'REVIVED';",
    testFiles: ['test/boardgame-phase8e-interactions.test.cjs'],
  },
  {
    id: 'MUT-09',
    predicate: 'damage-redirection',
    file: 'features/boardgame/domain/damage-redirection.ts',
    description: 'Disable visited-target cycle guard in evaluateAnathemaRedirection',
    find: 'if (visited.includes(cursedVictim.playerId)) {',
    replace: 'if (false && visited.includes(cursedVictim.playerId)) {',
    testFiles: ['test/boardgame-phase6a.test.cjs'],
  },
  {
    id: 'MUT-10',
    predicate: 'damage-redirection',
    file: 'features/boardgame/domain/damage-redirection.ts',
    description: 'Allow hp-cost/unpreventable self-damage to redirect via Anathema',
    find: "if (step.isHpCost || step.unpreventable || step.sourceType === 'hp-cost') {",
    replace: "if (false && step.isHpCost) {",
    testFiles: ['test/boardgame-phase6b.test.cjs'],
  },
  {
    id: 'MUT-11',
    predicate: 'effective-faction',
    file: 'features/boardgame/domain/dynamic-allegiance.ts',
    description: 'Ignore dynamic effectiveFaction override (always return base player.faction)',
    find: 'return change ? change.effectiveFaction : player.faction;',
    replace: 'return player.faction;',
    testFiles: ['test/boardgame-phase8e-interactions.test.cjs'],
  },
  {
    id: 'MUT-12',
    predicate: 'equipment-conservation',
    file: 'features/boardgame/domain/equipment-transactions.ts',
    description: 'Copy instead of removing transferred equipment (causes item duplication)',
    find: 'const [movedCardId] = fromPlayer.equipped.splice(idx, 1);',
    replace: 'const movedCardId = fromPlayer.equipped[idx];',
    testFiles: ['test/boardgame-phase6a.test.cjs'],
  },
];

// Build temporary preloader hook inside OS tmpdir (zero writes inside repo!)
const os = require('node:os');
const hookPath = path.join(os.tmpdir(), `hust-p8e-mutant-hook-${process.pid}.cjs`);

const hookSource = `'use strict';
const fs = require('fs');
const path = require('path');
const ts = require(${JSON.stringify(require.resolve('typescript'))});
const targetFile = path.resolve(process.env.P8E_MUT_FILE);
const findStr = process.env.P8E_MUT_FIND;
const replaceStr = process.env.P8E_MUT_REPLACE;
let applied = false;

require.extensions['.ts'] = function(module, filename) {
  let source = fs.readFileSync(filename, 'utf8');
  if (path.resolve(filename) === targetFile) {
    if (!source.includes(findStr)) {
      throw new Error('MUTANT_PATTERN_NOT_FOUND in ' + filename);
    }
    source = source.replace(findStr, replaceStr);
    applied = true;
  }
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
};
process.on('exit', () => {
  if (!applied) {
    console.error('MUTANT_WARNING_NOT_LOADED: ' + targetFile);
  }
});
`;

function main() {
  fs.writeFileSync(hookPath, hookSource, 'utf8');
  const results = [];
  try {
    for (const mut of MUTANTS) {
      const absFile = path.join(REPO, mut.file);
      const src = fs.readFileSync(absFile, 'utf8');
      if (!src.includes(mut.find)) {
        throw new Error(`Pattern not found for ${mut.id} in ${mut.file}`);
      }
      const t0 = performance.now();
      const child = spawnSync(
        process.execPath,
        ['--require', hookPath, '--test', ...mut.testFiles.map((f) => path.join(REPO, f))],
        {
          cwd: REPO,
          env: {
            ...process.env,
            P8E_MUT_FILE: absFile,
            P8E_MUT_FIND: mut.find,
            P8E_MUT_REPLACE: mut.replace,
          },
          encoding: 'utf8',
          timeout: 60_000,
        },
      );
      const ms = Number((performance.now() - t0).toFixed(1));
      const killed = child.status !== 0;
      const failLine =
        (child.stdout + '\n' + child.stderr)
          .split('\n')
          .find((l) => l.includes('✖') || l.includes('AssertionError')) || '';
      results.push({
        id: mut.id,
        predicate: mut.predicate,
        file: mut.file,
        description: mut.description,
        testFiles: mut.testFiles,
        status: killed ? 'KILLED' : 'SURVIVED',
        exitCode: child.status,
        durationMs: ms,
        killedBy: failLine.trim().slice(0, 160),
      });
    }
  } finally {
    try {
      fs.unlinkSync(hookPath);
    } catch {}
  }

  const killed = results.filter((r) => r.status === 'KILLED').length;
  const survived = results.filter((r) => r.status === 'SURVIVED').length;
  const summary = {
    totalMutants: results.length,
    killed,
    survived,
    killScorePct: Number(((killed / results.length) * 100).toFixed(2)),
    predicatesCovered: [...new Set(results.map((r) => r.predicate))],
    results,
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Phase 8E Targeted Mutation Testing: ${killed}/${results.length} KILLED (${summary.killScorePct}%), ${survived} SURVIVED`);
    for (const r of results) {
      console.log(`  [${r.status}] ${r.id} (${r.predicate}) — ${r.description} (${r.durationMs}ms)`);
    }
  }
  process.exit(survived > 0 ? 1 : 0);
}

main();
