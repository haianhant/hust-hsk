# Bóng Đêm KTX — Phase 4D Integration, Multiplayer DO & Visual QA Report

- **Date:** 2026-11-20
- **Scope:** Full end-to-end verification of Wave 3 (`starter-twenty-six`: 36 playable characters, 36 WebP portraits, 15 Pending Choice kinds, Remaining-HP & Cluster-Scope engine foundations, dynamic `eq_chocolate` A/E/U, canonical SH card IDs, 4P–8P real Cloudflare Durable Object WebSocket E2E, SQLite hibernation & disconnect alarm recovery, Playwright Desktop & Mobile visual QA, and 15,000-match deterministic simulation).

---

## 1. Automated Verification Matrix

| Gate / Suite | Command | Result | Coverage Summary |
|---|---|---|---|
| **TypeScript Frontend + Worker** | `npm run typecheck` | ✅ PASS | 0 errors across `features/`, `shared/`, `components/`, `worker/` |
| **Catalog Validator** | `node scripts/validate-character-catalog.cjs` | ✅ PASS | 56 expansion + 10 Classic = 66 (`verified=4, house-rule-approved=22, needs-clarification=30, implemented=26 [11H/11S/4N], not-started=30 [6H/7S/17N], activeInProd=false`) |
| **Phase 4A Foundations Suite** | `test/boardgame-phase4a.test.cjs` | ✅ 5/5 PASS | Phase 3 stats reconciliation, remaining HP & cluster scope, canonical SH card IDs, dynamic `eq_chocolate` A/E/U, catalog invariants |
| **Phase 4B Wave 3 Gameplay Suite** | `test/boardgame-phase4b.test.cjs` | ✅ 11/11 PASS | All 10 Wave 3 characters (`Fallen`, `Fea`, `Eleanor`, `Fujiko`, `Udi`, `Wrath`, `Vengeance`, `Visions`, `Cruz`, `Bryon`), `starter-twenty-six` 36-role pool, cross-character interactions |
| **Phase 4C Portrait & Secrecy Suite** | `test/boardgame-phase4c-portraits.test.cjs` | ✅ 5/5 PASS | 10 Wave 3 `1024×1536` WebP (`63.5–108.2 KB`), 36/36 unique SHA-256 hashes, `asset-manifest.json` byte sync, P0 secrecy & VFX |
| **Phase 4D Integration & 4P–8P DO E2E** | `test/boardgame-phase4d-integration.test.cjs` | ✅ 4/4 PASS | Cross-character Wave 3 chains, real Cloudflare DO 4P–8P E2E + Spectator P0 privacy, DO hibernation preserving `visionsMarks` + `vengeance_chain_strike`, wrong-owner rejection, `requestId` idempotency, disconnect alarm recovery, production block |
| **All Prior Boardgame Suites** | `test/boardgame-{lounge,lobby-do,engine,match-do,expansion-foundation,phase2a,phase2b,phase2c-integration,phase25-portraits,phase3a,phase3b-portraits,phase3c-integration}.test.cjs` | ✅ 80/80 PASS | 100% pass across Phase 0, 1, 2A–2C, 2.5, 3A–3C (Total `npm run test:boardgame`: **105/105 PASS**) |
| **Classic 4,500-Match Simulation** | `node test/boardgame-sim.cjs` | ✅ PASS | 4,500/4,500 matches, 0.00% diff vs pre-Phase 1 baseline |
| **Starter Twenty-Six 15,000-Match Sim** | `node scripts/sim-starter-twenty-six.cjs --write-json` | ✅ PASS | 15,000/15,000 matches (`43.21s`), 0 stalls, 0 draws, 0 privacy leaks, **69,211** choices resolved across 15 choice kinds |
| **Workspace Regression Gates** | `npm run test:contracts && npm run test:learn && npm run test:world && npm run test:avatar && npm run test:ui && npm run test:study && npm run test:nav && npm run test:mp` | ✅ PASS | All HUSTVerse workspace contracts, learning engine, 3D world, avatar, UI/VFX (25/25), study, nav & multiplayer protocol tests green |
| **Next.js Static Production Build** | `npm run build` | ✅ PASS | Clean static export to `out/` |
| **Playwright Phase 4C Visual QA** | `node scripts/verify-phase4c-visuals.cjs` | ✅ PASS | Desktop `1440×900` + Mobile `390×844`, `0px` overflow, 10/10 `1024×1536` WebP, 4 faction tabs, P0 DOM removal, 3-faction Zoom modal (`Fujiko`/`Vengeance`/`Cruz`), `onError` fallback, Reduced Motion |
| **Playwright Prototype Visual QA** | `node test/boardgame-visual-prototype.cjs` | ✅ PASS | 83/83 unique decoded WebP assets, `CLS=0`, `webglContexts=0`, `55–59 FPS`, 0 console/page errors |
| **Playwright Multiplayer Browser E2E** | `node test/boardgame-e2e.cjs --shard=e2e-05-06` | ✅ PASS | 2-match concurrent isolation + 4/4 WebSocket security probes |

---

## 2. Highlighted Phase 4D Integration Scenarios Verified (`P4D-1..P4D-4`)

1. **Cross-Character Wave 3 Chains (`P4D-1`):**
   - **Fujiko Machine Gun vs Hidden-in-Crowd Udi + Revealed 4-HP Execution → Wendigo:** Verified that `Udi` standing with `>= 2` other living players in the same cluster is excluded server-side from `Fujiko`'s Machine Gun AoE (`udi_protected`), while a revealed `4 HP` target taking `>= 1` damage is executed through the unified elimination pipeline, triggering hidden `Wendigo`'s secret `wendigo_reveal_heal` choice with full P0 masking.
   - **Wrath Cluster AoE → Witch / G43 / Undying:** Verified that `Wrath`'s `ON_TURN_START` `2`-damage `'skill'` AoE skips Wrath itself, is completely blocked by `Witch` standing at `corridor` (`0` damage), bypasses `G43`'s attack-only damage reduction (`2` full damage dealt), and opens `Undying`'s secret `undying_reveal_reduce` choice.
   - **Vengeance Kill Chain → Cindy Retaliation & Wendigo Elimination Heal:** Verified `Vengeance` killing a target opens `vengeance_chain_strike`, consumes `skillUsedOnce` only on confirm, rolls a single shared `1d4` across 2 chosen victims, triggers `Cindy` retaliation without recursion, and triggers `Wendigo` when a victim dies.
2. **Real Cloudflare Durable Object WebSocket E2E across 4P, 5P, 6P, 7P, and 8P (`P4D-2`):**
   - Verified across all 5 player counts on `starter-twenty-six`: exact unique role dealing within the 36-role pool, unchanged faction split (`2H-2S-0N`, `2H-2S-1N`, `2H-2S-2N`, `2H-2S-3N`, `3H-3S-2N`), and strict Spectator P0 isolation (`privateView === null`, zero unrevealed role leaks).
3. **Production Block, Concurrency, SQLite DO Hibernation, Wrong-Owner Rejection, Idempotency & Disconnect Alarm Recovery (`P4D-3`):**
   - Production DO (`ALLOW_EXPERIMENTAL_RULESETS` unset) rejects `starter-twenty-six` with `HTTP 400 / RULESET_UNAVAILABLE`.
   - Concurrent `classic` (Table 1) and `starter-twenty-six` (Table 2) run simultaneously on the same Worker with zero cross-contamination.
   - `container.hibernateAndWake()` verified preserving BOTH persistent `expansionState.visionsMarks` AND an open `vengeance_chain_strike` Pending Choice across SQLite reload.
   - Wrong-owner `RESOLVE_PENDING_CHOICE` attempt rejected with error; duplicate `requestId` replayed idempotently with identical state revision; disconnecting during an open Pending Choice recovers cleanly via DO alarm to safe default (`skip`) without stalling the match.
4. **Wave 3 UI / VFX / Sound / Reduced Motion (`P4D-4`):**
   - Verified all 10 Wave 3 roles have complete `ROLE_VISUAL_META`, `36/36` `MIDNIGHT_CHARACTER_ART`, `extractVisualEventsFromDiff` VFX/audio dispatch, shortened `reducedMotion` timings, and zero hidden-role leaks for spectators and opponents.
