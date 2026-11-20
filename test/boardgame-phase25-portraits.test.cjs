'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');

function registerTsHook() {
  if (require.extensions['.ts'] && require.extensions['.ts'].__phase25Hook) return;
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
  loader.__phase25Hook = true;
  require.extensions['.ts'] = loader;
}

registerTsHook();

/**
 * Pure Node binary WebP dimension parser supporting VP8X, VP8 (lossy), and VP8L (lossless).
 */
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
    // Keyframe start code at offset 23: 0x9d 0x01 0x2a
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

const EXPECTED_CLASSIC_MAP = {
  'gac-ky-thuat': '/assets/boardgame/prototype/role-minh-ky-thuat.webp',
  'gac-truc-ban': '/assets/boardgame/roles/role-lan-truc-ban.webp',
  'gac-radio': '/assets/boardgame/prototype/role-vy-radio.webp',
  'suong-an-danh': '/assets/boardgame/roles/role-tu-an-danh.webp',
  'suong-tin-gia': '/assets/boardgame/roles/role-khanh-tin-gia.webp',
  'suong-gac-cong': '/assets/boardgame/roles/role-dung-gac-cong.webp',
  'lang-anh-san': '/assets/boardgame/roles/role-hai-suu-tam.webp',
  'lang-quan-sat': '/assets/boardgame/roles/role-trang-kien-cuong.webp',
  'lang-cuu-ho': '/assets/boardgame/roles/role-bach-cuong-chien.webp',
  'lang-tien-phong': '/assets/boardgame/roles/role-dat-cam-tu.webp',
};

const EXPECTED_STARTER_EIGHT_MAP = {
  exp2_g43: '/assets/boardgame/roles/role-exp2-g43.webp',
  exp2_fiona: '/assets/boardgame/roles/role-exp2-fiona.webp',
  exp1_gayle: '/assets/boardgame/roles/role-exp1-gayle.webp',
  exp1_felicia: '/assets/boardgame/roles/role-exp1-felicia.webp',
  exp1_wendigo: '/assets/boardgame/roles/role-exp1-wendigo.webp',
  exp2_wyvern: '/assets/boardgame/roles/role-exp2-wyvern.webp',
  exp1_victor: '/assets/boardgame/roles/role-exp1-victor.webp',
  exp1_undying: '/assets/boardgame/roles/role-exp1-undying.webp',
};

function makePublicGame(overrides = {}) {
  return {
    rulesetVersion: 4,
    rulesetId: 'starter-eight',
    matchId: 'p25-test-match-01',
    round: 1,
    maxRounds: 20,
    turnNumber: 1,
    turnPhase: 'ROLL_MOVE',
    activePlayerId: 'p1',
    turnOrder: ['p1', 'p2', 'p3', 'p4'],
    clusterPairs: DEFAULT_CLUSTER_PAIRS,
    deadCount: 0,
    players: [
      {
        playerId: 'p1',
        displayName: 'Alpha',
        seatIndex: 0,
        location: 'lobby',
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
      },
      {
        playerId: 'p2',
        displayName: 'Beta',
        seatIndex: 1,
        location: 'canteen',
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
      },
      {
        playerId: 'p3',
        displayName: 'Gamma',
        seatIndex: 2,
        location: 'radio',
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
      },
      {
        playerId: 'p4',
        displayName: 'Delta',
        seatIndex: 3,
        location: 'court',
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
      },
    ],
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

test('P2.5-1 — All 8 Starter Eight WebP assets exist, are valid 1024x1536 (2:3), < 500 KB, unique & match Contact Sheet', () => {
  assert.equal(STARTER_EIGHT_ROLE_IDS.length, 8);
  const publicDir = path.join(ROOT, 'public');
  const seenHashes = new Set();

  for (const roleId of STARTER_EIGHT_ROLE_IDS) {
    const mappedPath = MIDNIGHT_CHARACTER_ART[roleId];
    assert.equal(mappedPath, EXPECTED_STARTER_EIGHT_MAP[roleId], `Unexpected portrait path for ${roleId}`);
    const absPath = path.join(publicDir, mappedPath.slice(1));
    assert.equal(fs.existsSync(absPath), true, `Missing portrait file: ${absPath}`);

    const buf = fs.readFileSync(absPath);
    assert.ok(buf.byteLength >= 20_000, `${roleId} WebP unexpectedly tiny (${buf.byteLength}B)`);
    assert.ok(buf.byteLength <= 500_000, `${roleId} WebP exceeds 500 KB budget (${buf.byteLength}B)`);

    const dims = parseWebpDimensions(buf);
    assert.equal(dims.width, 1024, `${roleId} width must be 1024`);
    assert.equal(dims.height, 1536, `${roleId} height must be 1536`);
    assert.ok(Math.abs(dims.width / dims.height - 2 / 3) < 0.001, `${roleId} must be exact 2:3`);

    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    assert.equal(seenHashes.has(hash), false, `${roleId} duplicates another portrait file`);
    seenHashes.add(hash);
  }

  // Verify Contact Sheet artifacts exist
  const sheetWebp = path.join(ROOT, 'docs/boardgame-expansion/phase-2.5/starter-eight-contact-sheet.webp');
  const sheetPng = path.join(ROOT, 'docs/boardgame-expansion/phase-2.5/starter-eight-contact-sheet.png');
  assert.equal(fs.existsSync(sheetWebp), true, 'Missing starter-eight-contact-sheet.webp');
  assert.equal(fs.existsSync(sheetPng), true, 'Missing starter-eight-contact-sheet.png');
  assert.ok(fs.statSync(sheetWebp).size > 50_000, 'Contact sheet WebP unexpectedly small');
});

test('P2.5-2 — asset-manifest.json & MIDNIGHT_CHARACTER_ART cover all 18 roles with 10 Classic untouched', () => {
  // All 10 Classic mappings remain byte-for-byte unchanged
  assert.equal(ROLES_CATALOG.length, 10);
  for (const [classicId, expectedUrl] of Object.entries(EXPECTED_CLASSIC_MAP)) {
    assert.equal(MIDNIGHT_CHARACTER_ART[classicId], expectedUrl, `Classic mapping drifted for ${classicId}`);
    const absPath = path.join(ROOT, 'public', expectedUrl.slice(1));
    assert.equal(fs.existsSync(absPath), true, `Missing Classic portrait: ${absPath}`);
  }
  assert.equal(Object.keys(MIDNIGHT_CHARACTER_ART).length, 18, 'Expected 10 Classic + 8 Starter Eight portraits');

  // Verify asset-manifest.json matches disk byte-for-byte
  const manifestPath = path.join(ROOT, 'docs/boardgame-expansion/phase-2.5/asset-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.totalPortraits, 8);
  assert.equal(manifest.assets.length, 8);

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
    assert.equal(fs.statSync(absPath).size, entry.fileSizeBytes, `Manifest byte size mismatch for ${entry.roleId}`);
  }
  for (const roleId of STARTER_EIGHT_ROLE_IDS) {
    assert.equal(manifestIds.has(roleId), true, `Missing ${roleId} in asset-manifest.json`);
  }
});

test('P2.5-3 — P0 Secrecy matrix across all 8 Starter Eight roles (unrevealed never leaks portrait/role/faction/maxHp)', () => {
  for (const roleId of STARTER_EIGHT_ROLE_IDS) {
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

test('P2.5-4 — Cinematic VFX Opening Deal, Role Reveal, Spectator isolation & Reduced Motion for all 8 Starter Eight roles', () => {
  for (const roleId of STARTER_EIGHT_ROLE_IDS) {
    const design = getRoleDesign(roleId);
    const fresh = makePublicGame({ matchId: `p25-open-${roleId}` });
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

    // 1. Owner Opening Deal resolves own new portrait
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

    // 2. Spectator Opening Deal NEVER leaks portrait or role even if privateView is passed
    const specTracker = new VisualEventTracker();
    const specEvents = specTracker.seedBaseline(fresh, {
      selfPlayerId: 'spec-1',
      isSpectator: true,
      privateView: priv,
    });
    assert.equal(specEvents.length, 1);
    assert.equal(specEvents[0].portraitSrc, null, `Spectator leaked portrait for ${roleId}`);
    assert.equal(specEvents[0].roleId, null);

    // 3. Mismatched player Opening Deal NEVER leaks portrait
    const otherTracker = new VisualEventTracker();
    const otherEvents = otherTracker.seedBaseline(fresh, {
      selfPlayerId: 'p2',
      isSpectator: false,
      privateView: priv,
    });
    assert.equal(otherEvents[0].portraitSrc, null, `Mismatched player leaked portrait for ${roleId}`);

    // 4. Role Reveal diff emits ROLE_REVEAL cut-in with exact portrait (normal + reduced motion)
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
        displayName: 'Alpha',
        roleId,
        roleName: design.name,
        faction: design.faction,
        reason: 'manual',
      },
    });
    const normalDiff = extractVisualEventsFromDiff(fresh, revealedGame, {
      selfPlayerId: 'p2',
      isSpectator: false,
      reducedMotion: false,
    });
    const revealEv = normalDiff.find((ev) => ev.kind === 'CINEMATIC_CUTIN' && ev.bannerType === 'ROLE_REVEAL');
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

test('P2.5-5 — Production ruleset safety untouched (Classic only in production, Starter Eight experimental)', () => {
  const allProdVisible = DEFAULT_RULESET_REGISTRY.listRulesets();
  const prodEnabled = allProdVisible.filter((r) => r.enabledInProduction);
  assert.deepEqual(
    prodEnabled.map((r) => r.id),
    ['classic'],
    'Production rulesets must remain Classic-only in Phase 2.5',
  );
  assert.equal(
    DEFAULT_RULESET_REGISTRY.getRuleset('starter-eight'),
    null,
    'starter-eight must not resolve without allowExperimental',
  );
  const starterEight = DEFAULT_RULESET_REGISTRY.getRuleset('starter-eight', {
    allowExperimental: true,
  });
  assert.ok(starterEight);
  assert.equal(starterEight.enabledInProduction, false);
  assert.equal(starterEight.availability, 'experimental');
});
