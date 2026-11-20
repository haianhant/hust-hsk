'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');

function registerTsHook() {
  if (require.extensions['.ts'] && require.extensions['.ts'].__phase5dHook) return;
  const loader = (mod, filename) => {
    const src = fs.readFileSync(filename, 'utf8');
    const out = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: filename,
    });
    mod._compile(out.outputText, filename);
  };
  loader.__phase5dHook = true;
  require.extensions['.ts'] = loader;
}

registerTsHook();

function parseWebpDimensions(buf) {
  assert.ok(buf.byteLength >= 30, 'WebP buffer too small');
  assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF', 'Missing RIFF signature');
  assert.equal(buf.subarray(8, 12).toString('ascii'), 'WEBP', 'Missing WEBP signature');
  const chunk = buf.subarray(12, 16).toString('ascii');

  if (chunk === 'VP8X') {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height, chunk };
  }
  if (chunk === 'VP8 ') {
    assert.equal(buf[23], 0x9d, 'VP8 missing start code byte 0');
    assert.equal(buf[24], 0x01, 'VP8 missing start code byte 1');
    assert.equal(buf[25], 0x2a, 'VP8 missing start code byte 2');
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return { width, height, chunk };
  }
  if (chunk === 'VP8L') {
    assert.equal(buf[20], 0x2f, 'VP8L missing signature byte');
    const bits = buf.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height, chunk };
  }
  throw new Error(`Unsupported WebP chunk: ${chunk}`);
}

const {
  MIDNIGHT_CHARACTER_ART,
  MIDNIGHT_CARD_BACK_ART,
  STARTER_EIGHT_ROLE_IDS,
  WAVE2_ROLE_IDS,
  WAVE3_ROLE_IDS,
  WAVE4_ROLE_IDS,
  resolveRoleCardPresentation,
} = require(path.join(ROOT, 'features/boardgame/ui/midnight-noir-tokens.ts'));
const { getRoleDesign, ROLES_CATALOG } = require(path.join(ROOT, 'features/boardgame/domain/roles.ts'));
const { DEFAULT_RULESET_REGISTRY } = require(
  path.join(ROOT, 'features/boardgame/domain/registry.ts'),
);
const {
  VisualEventTracker,
  extractVisualEventsFromDiff,
} = require(path.join(ROOT, 'features/boardgame/ui/vfx-queue.ts'));
const { DEFAULT_CLUSTER_PAIRS } = require(path.join(ROOT, 'features/boardgame/domain/rules.ts'));

const EXPECTED_WAVE4_MAP = {
  exp2_elise: '/assets/boardgame/roles/role-exp2-elise.webp',
  exp1_ernest: '/assets/boardgame/roles/role-exp1-ernest.webp',
  exp1_gwendolen: '/assets/boardgame/roles/role-exp1-gwendolen.webp',
  exp2_freyja: '/assets/boardgame/roles/role-exp2-freyja.webp',
  exp2_umibozu: '/assets/boardgame/roles/role-exp2-umibozu.webp',
  exp2_urban_legend: '/assets/boardgame/roles/role-exp2-urban-legend.webp',
  exp2_warlord: '/assets/boardgame/roles/role-exp2-warlord.webp',
  exp2_usurper: '/assets/boardgame/roles/role-exp2-usurper.webp',
  exp2_arlene: '/assets/boardgame/roles/role-exp2-arlene.webp',
  exp1_angel: '/assets/boardgame/roles/role-exp1-angel.webp',
  exp2_bianca: '/assets/boardgame/roles/role-exp2-bianca.webp',
  exp2_dalton: '/assets/boardgame/roles/role-exp2-dalton.webp',
};

function makePublicGame(overrides = {}) {
  return {
    rulesetVersion: 4,
    rulesetId: 'starter-thirty-eight',
    matchId: 'p5d-test-match-01',
    round: 1,
    maxRounds: 20,
    turnNumber: 1,
    turnPhase: 'ROLL_MOVE',
    activePlayerId: 'p1',
    turnOrder: ['p1', 'p2', 'p3', 'p4'],
    clusterPairs: DEFAULT_CLUSTER_PAIRS,
    deadCount: 0,
    players: ['p1', 'p2', 'p3', 'p4'].map((pid, idx) => ({
      playerId: pid,
      displayName: `Player ${idx + 1}`,
      seatIndex: idx,
      location: ['lobby', 'canteen', 'corridor', 'court'][idx],
      woundsTaken: 0,
      handCount: 0,
      equipped: [],
      attacksMade: 0,
      attacksThisTurn: 0,
      investigationsCount: 0,
      guardianShieldActive: false,
      alive: true,
      connected: true,
      revealedRoleId: null,
      revealedFaction: null,
      revealedMaxHp: null,
      revealedSkillCooldown: 0,
      revealedSkillUsedOnce: false,
    })),
    deckCounts: { investigation: 16, equipment: 16, event: 16 },
    lastDiceRoll: null,
    lastInvestigation: null,
    lastRevealEvent: null,
    publicLog: [],
    highlights: [],
    winnerLabel: null,
    winnerFaction: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
    ...overrides,
  };
}

test('P5D-1 — All 12 Wave 4 WebP assets exist, are valid 1024x1536 (2:3), < 200 KB, 48/48 unique SHA-256 & Contact Sheet present', () => {
  assert.equal(WAVE4_ROLE_IDS.length, 12);
  const publicDir = path.join(ROOT, 'public');
  const seenHashes = new Set();

  // Zero hash overlap across ALL 48 portraits (Classic + Starter Eight + Wave 2 + Wave 3 + Wave 4)
  for (const [roleId, mappedPath] of Object.entries(MIDNIGHT_CHARACTER_ART)) {
    const absPath = path.join(publicDir, mappedPath.slice(1));
    assert.equal(fs.existsSync(absPath), true, `Missing portrait file for ${roleId}: ${absPath}`);
    const buf = fs.readFileSync(absPath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    assert.equal(seenHashes.has(hash), false, `Duplicate portrait hash detected for ${roleId}`);
    seenHashes.add(hash);
  }
  assert.equal(seenHashes.size, 48, 'Expected 48 strictly distinct portrait SHA-256 digests');

  for (const roleId of WAVE4_ROLE_IDS) {
    const mappedPath = MIDNIGHT_CHARACTER_ART[roleId];
    assert.equal(mappedPath, EXPECTED_WAVE4_MAP[roleId], `Unexpected portrait path for ${roleId}`);
    const absPath = path.join(publicDir, mappedPath.slice(1));
    const buf = fs.readFileSync(absPath);
    assert.ok(buf.byteLength >= 20_000, `${roleId} WebP unexpectedly tiny (${buf.byteLength}B)`);
    assert.ok(buf.byteLength <= 200_000, `${roleId} WebP exceeds 200 KB preferred budget (${buf.byteLength}B)`);

    const dims = parseWebpDimensions(buf);
    assert.equal(dims.width, 1024, `${roleId} width must be 1024`);
    assert.equal(dims.height, 1536, `${roleId} height must be 1536`);
    assert.ok(Math.abs(dims.width / dims.height - 2 / 3) < 0.001, `${roleId} must be exact 2:3`);
  }

  const sheetWebp = path.join(ROOT, 'docs/boardgame-expansion/phase-5/character-contact-sheet.webp');
  const sheetPng = path.join(ROOT, 'docs/boardgame-expansion/phase-5/character-contact-sheet.png');
  assert.equal(fs.existsSync(sheetWebp), true, 'Missing phase-5 character-contact-sheet.webp');
  assert.equal(fs.existsSync(sheetPng), true, 'Missing phase-5 character-contact-sheet.png');
  assert.ok(fs.statSync(sheetWebp).size > 50_000, 'Contact sheet WebP unexpectedly small');
});

test('P5D-2 — MIDNIGHT_CHARACTER_ART covers exact 48 playable roles & phase-5/asset-manifest.json matches disk byte-for-byte', () => {
  assert.equal(ROLES_CATALOG.length, 10);
  assert.equal(STARTER_EIGHT_ROLE_IDS.length, 8);
  assert.equal(WAVE2_ROLE_IDS.length, 8);
  assert.equal(WAVE3_ROLE_IDS.length, 10);
  assert.equal(WAVE4_ROLE_IDS.length, 12);
  assert.equal(
    Object.keys(MIDNIGHT_CHARACTER_ART).length,
    48,
    'Expected exact 48 playable portraits (10 Classic + 8 Starter Eight + 8 Wave 2 + 10 Wave 3 + 12 Wave 4)',
  );

  // Every role in starter-thirty-eight ruleset resolves a real WebP portrait
  const playable48 = DEFAULT_RULESET_REGISTRY.listPlayableCharactersForRuleset('starter-thirty-eight', {
    allowExperimental: true,
  });
  assert.equal(playable48.length, 48, 'starter-thirty-eight must expose exactly 48 playable characters');
  for (const ch of playable48) {
    assert.ok(MIDNIGHT_CHARACTER_ART[ch.id], `Missing portrait mapping for ${ch.id}`);
  }

  // Verify phase-5/asset-manifest.json
  const manifestPath = path.join(ROOT, 'docs/boardgame-expansion/phase-5/asset-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.phase, '5D');
  assert.equal(manifest.totalPortraits, 12);
  assert.equal(manifest.cumulativePlayablePortraits, 48);
  assert.equal(manifest.assets.length, 12);

  const manifestIds = new Set();
  for (const entry of manifest.assets) {
    manifestIds.add(entry.roleId);
    const design = getRoleDesign(entry.roleId);
    assert.equal(entry.faction, design.faction, `Manifest faction mismatch for ${entry.roleId}`);
    assert.equal(entry.publicPath, MIDNIGHT_CHARACTER_ART[entry.roleId]);
    assert.equal(entry.width, 1024);
    assert.equal(entry.height, 1536);
    assert.equal(entry.aspectRatio, '2:3');
    assert.equal(entry.format, 'WEBP');
    assert.equal(entry.qaStatus, 'APPROVED');

    const absPath = path.join(ROOT, entry.repoPath);
    assert.equal(fs.existsSync(absPath), true, `Manifest repoPath missing: ${entry.repoPath}`);
    const buf = fs.readFileSync(absPath);
    assert.equal(buf.byteLength, entry.fileSizeBytes, `Manifest byte size mismatch for ${entry.roleId}`);
    const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
    assert.equal(actualSha, entry.sha256, `Manifest SHA-256 mismatch for ${entry.roleId}`);
  }
  for (const roleId of WAVE4_ROLE_IDS) {
    assert.equal(manifestIds.has(roleId), true, `Missing ${roleId} in phase-5/asset-manifest.json`);
  }
});

test('P5D-3 — P0 Secrecy matrix across all 12 Wave 4 roles (Hunter / Shadow / Neutral never leak when unrevealed)', () => {
  for (const roleId of WAVE4_ROLE_IDS) {
    const design = getRoleDesign(roleId);

    for (const viewerMode of ['other-player', 'spectator', 'owner-facedown']) {
      const hidden = resolveRoleCardPresentation({
        viewerMode,
        revealed: false,
        roleId,
        woundsTaken: 3,
      });
      assert.equal(hidden.showFront, false, `${roleId}/${viewerMode} must hide front`);
      assert.equal(hidden.roleId, null, `${roleId}/${viewerMode} leaked roleId`);
      assert.equal(hidden.roleName, null, `${roleId}/${viewerMode} leaked roleName`);
      assert.equal(hidden.faction, null, `${roleId}/${viewerMode} leaked faction`);
      assert.equal(hidden.maxHp, null, `${roleId}/${viewerMode} leaked maxHp`);
      assert.equal(hidden.hp, null, `${roleId}/${viewerMode} leaked hp`);
      assert.equal(hidden.skillName, null, `${roleId}/${viewerMode} leaked skillName`);
      assert.equal(hidden.portraitSrc, null, `${roleId}/${viewerMode} leaked portraitSrc`);
      assert.equal(hidden.cardBackSrc, MIDNIGHT_CARD_BACK_ART);
      assert.equal(hidden.publicWoundsTaken, 3);
    }

    const ownerPeek = resolveRoleCardPresentation({
      viewerMode: 'owner-peek',
      revealed: false,
      roleId,
      woundsTaken: 2,
    });
    assert.equal(ownerPeek.showFront, true);
    assert.equal(ownerPeek.roleId, roleId);
    assert.equal(ownerPeek.faction, design.faction);
    assert.equal(ownerPeek.maxHp, design.maxHp);
    assert.equal(ownerPeek.hp, design.maxHp - 2);
    assert.equal(ownerPeek.portraitSrc, MIDNIGHT_CHARACTER_ART[roleId]);

    for (const pubViewer of ['other-player', 'spectator']) {
      const revealed = resolveRoleCardPresentation({
        viewerMode: pubViewer,
        revealed: true,
        roleId,
        woundsTaken: 4,
      });
      assert.equal(revealed.showFront, true);
      assert.equal(revealed.roleId, roleId);
      assert.equal(revealed.portraitSrc, MIDNIGHT_CHARACTER_ART[roleId]);
      assert.equal(revealed.publicRevealed, true);
    }
  }
});

test('P5D-4 — Cinematic VFX Opening Deal, Role Reveal, Spectator isolation & Reduced Motion across all 12 Wave 4 roles', () => {
  for (const roleId of WAVE4_ROLE_IDS) {
    const design = getRoleDesign(roleId);
    const fresh = makePublicGame({ matchId: `p5d-open-${roleId}` });
    const priv = {
      playerId: 'p1',
      roleId,
      roleName: design.name,
      faction: design.faction,
      hp: design.maxHp,
      maxHp: design.maxHp,
      woundsTaken: 0,
      skillCooldown: 0,
      skillUsedOnce: false,
      revealed: false,
      secretGoalText: design.secretGoalText,
      protegePlayerId: null,
      protegeDisplayName: null,
      avengedProtegeKiller: false,
      investigatedTargetIds: [],
      hand: [],
      equipped: [],
      privateClues: [],
    };

    const ownerTracker = new VisualEventTracker();
    const ownerEvents = ownerTracker.seedBaseline(fresh, {
      selfPlayerId: 'p1',
      isSpectator: false,
      privateView: priv,
    });
    assert.equal(ownerEvents.length, 1);
    assert.equal(ownerEvents[0].bannerType, 'OPENING_DEAL');
    assert.equal(ownerEvents[0].roleId, roleId);
    assert.equal(ownerEvents[0].portraitSrc, MIDNIGHT_CHARACTER_ART[roleId]);

    const specTracker = new VisualEventTracker();
    const specEvents = specTracker.seedBaseline(fresh, {
      selfPlayerId: 'spec-1',
      isSpectator: true,
      privateView: priv,
    });
    assert.equal(specEvents.length, 1);
    assert.equal(specEvents[0].portraitSrc, null, `Spectator leaked portrait for ${roleId}`);
    assert.equal(specEvents[0].roleId, null);

    const revealedGame = makePublicGame({
      matchId: fresh.matchId,
      turnNumber: 2,
      players: fresh.players.map((p) =>
        p.playerId === 'p1'
          ? {
              ...p,
              revealedRoleId: roleId,
              revealedFaction: design.faction,
              revealedMaxHp: design.maxHp,
            }
          : p,
      ),
      lastRevealEvent: {
        id: `rev-${roleId}`,
        atMs: Date.now(),
        round: 1,
        playerId: 'p1',
        displayName: 'Player 1',
        roleId,
        roleName: design.name,
        faction: design.faction,
        reason: 'voluntary',
      },
    });
    const normalDiff = extractVisualEventsFromDiff(fresh, revealedGame, {
      selfPlayerId: 'p2',
      isSpectator: false,
      reducedMotion: false,
    });
    const revealEv = normalDiff.find(
      (ev) => ev.kind === 'CINEMATIC_CUTIN' && ev.bannerType === 'ROLE_REVEAL',
    );
    assert.ok(revealEv, `Expected ROLE_REVEAL cut-in for ${roleId}`);
    assert.equal(revealEv.portraitSrc, MIDNIGHT_CHARACTER_ART[roleId]);
    assert.equal(revealEv.faction, design.faction);

    const reducedDiff = extractVisualEventsFromDiff(fresh, revealedGame, {
      selfPlayerId: 'p2',
      isSpectator: false,
      reducedMotion: true,
    });
    const reducedReveal = reducedDiff.find(
      (ev) => ev.kind === 'CINEMATIC_CUTIN' && ev.bannerType === 'ROLE_REVEAL',
    );
    assert.ok(reducedReveal, `Expected reducedMotion ROLE_REVEAL for ${roleId}`);
    assert.equal(reducedReveal.portraitSrc, MIDNIGHT_CHARACTER_ART[roleId]);
    assert.ok(reducedReveal.durationMs < revealEv.durationMs, 'Reduced motion must shorten reveal duration');
  }
});

test('P5D-5 — Production ruleset safety strictly Classic-only (starter-thirty-eight blocked in production)', () => {
  const allProdVisible = DEFAULT_RULESET_REGISTRY.listRulesets();
  const prodEnabled = allProdVisible.filter((r) => r.enabledInProduction);
  assert.deepEqual(
    prodEnabled.map((r) => r.id),
    ['classic'],
    'Production rulesets must remain Classic-only in Phase 5D',
  );
  assert.equal(
    DEFAULT_RULESET_REGISTRY.getRuleset('starter-thirty-eight'),
    null,
    'starter-thirty-eight must not resolve without allowExperimental',
  );
});
