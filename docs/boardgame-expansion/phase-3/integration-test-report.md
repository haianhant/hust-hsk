# Bóng Đêm KTX — Phase 3C Integration, Multiplayer DO & Visual QA Report

- **Date:** 2026-11-20
- **Scope:** Full verification of Wave 2 (`starter-sixteen`: 26 playable characters, 26 WebP portraits, 9 Pending Choice kinds, LocationAlias, Gloria sequential draw queue, Neutral Cindy & Bipolar victories, Cloudflare Durable Object SQLite hibernation & disconnect recovery, Playwright Desktop & Mobile visual QA).

---

## 1. Automated Verification Matrix

| Gate / Suite | Command | Result | Coverage Summary |
|---|---|---|---|
| **TypeScript Frontend + Worker** | `npm run typecheck` | ✅ PASS | 0 errors across `features/`, `shared/`, `components/`, `worker/` |
| **Catalog Validator** | `node scripts/validate-character-catalog.cjs` | ✅ PASS | 56 expansion + 10 Classic = 66 (`verified=4, house-rule-approved=12, needs-clarification=40, implemented=16, not-started=40, activeInProd=false`) |
| **Phase 3A Wave 2 Unit Suite** | `test/boardgame-phase3a.test.cjs` | ✅ 9/9 PASS | All 8 Wave 2 characters, LocationAlias, 9-step Damage Pipeline, Cindy 5P/6P/7P victory, Bipolar 6-case victory matrix |
| **Phase 3B Portrait & Secrecy Suite** | `test/boardgame-phase3b-portraits.test.cjs` | ✅ 5/5 PASS | All 8 Wave 2 `1024×1536` WebP (`< 500 KB`), 26 unique SHA-256 hashes, `asset-manifest.json` byte sync, P0 secrecy & VFX |
| **Phase 3C Integration & 4P–8P DO E2E** | `test/boardgame-phase3c-integration.test.cjs` | ✅ 4/4 PASS | 4-chained single-turn choices, real DO 4P–8P E2E, DO hibernation preserving Gloria queue + secret Cindy choice, disconnect recovery, prod block |
| **All Prior Boardgame Suites** | `test/boardgame-{lounge,lobby-do,engine,match-do,expansion-foundation,phase2a,phase2b,phase2c-integration,phase25-portraits}.test.cjs` | ✅ 62/62 PASS | 100% pass across Phase 0, 1, 2A, 2B, 2C, 2.5 |
| **Classic 4,500-Match Simulation** | `node test/boardgame-sim.cjs` | ✅ PASS | 4,500/4,500 matches, 0.00% diff vs pre-Phase 1 baseline |
| **Starter Sixteen 10,000-Match Sim** | `node scripts/sim-starter-sixteen.cjs --write-json` | ✅ PASS | 10,000/10,000 matches (26.78s), 0 stalls, 0 draws, 0 privacy violations, **39,533** choices *(reconciled in Phase 4A from `totalPendingChoicesResolved`)* |
| **UI, Contracts, World, Avatar, Study, Learn, Nav, MP** | `npm run test:contracts && npm run test:learn && npm run test:world && npm run test:avatar && npm run test:ui && npm run test:study && npm run test:nav && npm run test:mp` | ✅ PASS | Full HUSTVerse workspace regression gates green |
| **Next.js Static Production Build** | `npm run build` | ✅ PASS | Clean static export to `out/` |
| **Playwright Phase 3B Visual QA** | `node scripts/verify-phase3b-visuals.cjs` | ✅ PASS | Desktop `1440×900` + Mobile `390×844`, 0px overflow, 8/8 `1024×1536` WebP, 3-faction tabs, P0 DOM removal, 3-faction Zoom modal, `onError` fallback, Reduced Motion |
| **Playwright Phase 2.5 & Prototype QA** | `node scripts/verify-phase25-visuals.cjs && node test/boardgame-visual-prototype.cjs` | ✅ PASS | 73/73 unique decoded WebP assets, `CLS=0`, `webglContexts=0`, 0 errors |
| **Playwright Multiplayer Browser E2E** | `node test/boardgame-e2e.cjs --shard=e2e-05-06` | ✅ PASS | 2-match concurrent isolation + 4/4 WebSocket security probes |

---

## 2. Highlighted Phase 3C Integration Scenarios Verified (`P3C-1..P3C-4`)

1. **4-Chained Pending Choices in a Single Turn (`P3C-1`):**
   - Revealed `Elysia` (equipped with `Machine Gun`) attacks a cluster containing hidden `Undying`, hidden `Cindy`, and a 1-HP `Witch` (outside `corridor`), while hidden `Wendigo` watches from `court`.
   - Deterministic resolution order verified step-by-step: `elysia_counter_boost` (public) → `undying_reveal_reduce` (secret P0 masked) → `cindy_reveal_retaliate` (secret P0 masked, retaliates 1 dmg to Elysia) → Witch dies → `wendigo_reveal_heal` (secret P0 masked, heals +1 HP) → turn advances cleanly with zero deadlock and zero hidden-role leak.
2. **Bipolar Lethal Self-Damage Victory Trigger (`P3C-1`):**
   - Revealed `Bipolar` (3 HP left) chooses `damage_self` on `ON_TURN_START` (`d4 + 2 >= 3`), dies as the 3rd Neutral death, immediately triggering Shadow faction victory where **dead Bipolar co-wins** alongside Warlock & Unchained (while dead Cindy loses).
3. **Real Cloudflare Durable Object WebSocket E2E across 4P, 5P, 6P, 7P, and 8P (`P3C-2`):**
   - Verified across all 5 player counts on `starter-sixteen`: exact unique role dealing within the 26-role pool, exact unchanged faction distribution (`2H-2S-0N`, `2H-2S-1N`, `2H-2S-2N`, `2H-2S-3N`, `3H-3S-2N`), and strict Spectator P0 isolation (`privateView === null`, zero leaked unrevealed roles).
4. **DO Hibernation, Idempotency, Disconnect Recovery & Production Block (`P3C-3`):**
   - Production DO (`ALLOW_EXPERIMENTAL_RULESETS` unset) rejects `starter-sixteen` with `HTTP 400 / RULESET_UNAVAILABLE`.
   - Concurrent `classic` (Table 1) and `starter-sixteen` (Table 2) run in parallel with zero cross-contamination.
   - `container.hibernateAndWake()` verified TWICE mid-turn: once preserving Gloria's queued 2nd White card (`eq-08`) across SQLite reload (plus idempotent duplicate `requestId` replay), and once preserving hidden Cindy's open secret `cindy_reveal_retaliate` choice right before Cindy disconnects — alarm resolves safely to `decline` without revealing Cindy's role or stalling the match!
5. **Wave 2 UI / VFX / Sound / Reduced Motion (`P3C-4`):**
   - All 8 Wave 2 roles verify complete `ROLE_VISUAL_META`, `MIDNIGHT_CHARACTER_ART`, `extractVisualEventsFromDiff` VFX/audio dispatch, shortened `reducedMotion` durations, and zero VFX leak for hidden `Cindy`.
