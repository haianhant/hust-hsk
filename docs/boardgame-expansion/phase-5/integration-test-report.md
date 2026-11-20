# Bóng Đêm KTX — Phase 5E Integration, Multiplayer DO & Visual QA Report

- **Date:** 2026-11-21
- **Scope:** Full end-to-end verification of **Phase 5 / Wave 4 (`starter-thirty-eight`)** — 48 playable characters (`10 Classic + 38 Expansion`), 48 unique WebP portraits (`1024×1536`), 22 Pending Choice kinds, `CAP-04` HealPipeline, `CAP-05` Private `SET_REACTION_PREF` Unicast Sync, `CAP-06` Bounded Safe Reaction Chains, `CAP-07` Extended Neutral Victory Primitives, `CAP-10` Canonical Card Sets, 4P–8P real Cloudflare Durable Object WebSocket E2E, SQLite hibernation & alarm recovery, Playwright Desktop & Mobile Visual QA, and 20,000-match deterministic simulation.

---

## 1. Automated Verification Matrix

| Gate / Suite | Command | Result | Coverage Summary |
|---|---|---|---|
| **TypeScript Frontend + Worker** | `npm run typecheck` | ✅ PASS | 0 errors across `features/`, `shared/`, `components/`, `worker/` |
| **Catalog Validator** | `node scripts/validate-character-catalog.cjs` | ✅ PASS | 56 expansion + 10 Classic = 66 (`verified=4, house-rule-approved=34, needs-clarification=18, implemented=38 [15H/15S/8N], not-started=18 [2H/3S/13N], activeInProd=false`) |
| **Phase 5A Shared Foundations** | `test/boardgame-phase5a.test.cjs` | ✅ 5/5 PASS | `CAP-04` HealPipeline, `CAP-05` real DO unicast `SET_REACTION_PREF` (zero leak, zero rev bump, hibernation), `CAP-06` bounded chain guards, `CAP-07` Neutral victory primitives, `CAP-10` canonical card sets |
| **Phase 5B Final 4 Tier-2 Roles** | `test/boardgame-phase5b.test.cjs` | ✅ 5/5 PASS | `Elise`, `Umibozu`, `Urban Legend`, `Arlene` — full edge cases, P0 secrecy & HealPipeline interactions |
| **Phase 5C 8 Tier-3 Roles & S38** | `test/boardgame-phase5c.test.cjs` | ✅ 9/9 PASS | `Ernest`, `Gwendolen`, `Freyja`, `Warlord`, `Usurper`, `Angel`, `Bianca`, `Dalton`, `starter-thirty-eight` (48 playable / 18 locked), and all 17 mandatory cross-character interaction scenarios |
| **Phase 5D Wave 4 Portraits** | `test/boardgame-phase5d-portraits.test.cjs` | ✅ 5/5 PASS | 12 Wave 4 `1024×1536` WebP (`84.6–152.4 KB`), 48/48 unique SHA-256 hashes, `asset-manifest.json` byte sync, Contact Sheet, P0 secrecy, VFX + Reduced Motion, Classic-only prod lock |
| **Phase 5E Real DO E2E & Hibernation** | `test/boardgame-phase5e-integration.test.cjs` | ✅ 4/4 PASS | Real Cloudflare DO WebSocket E2E across `4P, 5P, 6P, 7P, 8P`, production block (`HTTP 400 / RULESET_UNAVAILABLE`), concurrent Classic + S38, SQLite hibernation preserving `elise_distribute_heal`, hidden `usurper_reveal_block_heal`, `bianca_discard_prevent`, `angelAuras`, `daltonActivatedByPlayer`, `reactionPolicyByPlayer`, wrong-owner neutral rejection, duplicate `requestId` idempotency, alarm recovery, Wave 4 UI/VFX/48 portraits |
| **All Prior Boardgame Suites** | `test/boardgame-{lounge,lobby-do,engine,match-do,expansion-foundation,phase2*,phase3*,phase4*}.test.cjs` | ✅ 105/105 PASS | Total `npm run test:boardgame`: **133/133 PASS** + 4,500-match Classic simulation (`0.00%` diff) |
| **Starter Thirty-Eight 20,000-Match Sim** | `node scripts/sim-starter-thirty-eight.cjs --write-json` | ✅ PASS | 20,000/20,000 matches (`58.85s`), 0 stalls, 0 draws, 0 privacy leaks, **77,626** choices resolved across 22 choice kinds |
| **Workspace Regression Gates** | `npm run test:contracts && npm run test:learn && npm run test:world && npm run test:avatar && npm run test:ui && npm run test:study && npm run test:nav && npm run test:mp` | ✅ PASS | All HUSTVerse workspace contracts (12/12), HSK learning (45/45), 3D world, avatar, UI/VFX (15/15 + 25/25), study, nav (4/4) & multiplayer protocol (12/12) green |
| **Next.js Static Production Build** | `npm run build` | ✅ PASS | Clean static export to `out/` |
| **Playwright Phase 5D Visual QA** | `node scripts/verify-phase5d-visuals.cjs` | ✅ PASS | Desktop `1440×900` + Mobile `390×844`, `0px` overflow, 12/12 `1024×1536` WebP (`270×405`, `0.6667`), 4 faction tabs (`12/4/4/4`), P0 DOM removal, 3-faction Zoom Modal (`Freyja`/`Usurper`/`Angel`), `onError` fallback (`role-exp2-warlord.webp`), Reduced Motion |
| **Playwright Prototype Visual QA** | `node test/boardgame-visual-prototype.cjs` | ✅ PASS | `CLS=0`, `webglContexts=0`, `54.7–59.0 FPS`, `0px` Desktop & Mobile overflow, 0 console/page errors |
| **Playwright Multiplayer Browser E2E** | `node test/boardgame-e2e.cjs --shard=e2e-05-06` | ✅ PASS | 2-match concurrent isolation + 4/4 WebSocket security probes |

---

## 2. Highlighted Phase 5E Real DO Scenarios Verified (`P5E-1..P5E-4`)

1. **All 5 Player Counts on `starter-thirty-eight` (`P5E-1`):** Created real rooms for `4P, 5P, 6P, 7P, 8P` via HTTP `/api/boardgame/matches`, joined every seat + Spectator over WebSocket, verified unique dealing from the exact 48-role pool, unchanged faction distributions (`2-2-0`, `2-2-1`, `2-2-2`, `2-2-3`, `3-3-2`), default `reactionPolicy === 'ASK'`, and strict Spectator P0 privacy.
2. **Production Lock & Concurrency (`P5E-2`):** Verified production DO rejects `starter-thirty-eight` with `HTTP 400 / RULESET_UNAVAILABLE`, and verified simultaneous `classic` + `starter-thirty-eight` tables run on the same Worker with zero expansion field leakage onto `classic` clients.
3. **SQLite Hibernation, Security & Equipment No-Replay (`P5E-3`):**
   - Verified `SET_REACTION_PREF` persists across multiple `container.hibernateAndWake()` cycles via unicast sync with `0` public revision increment and `0` packets sent to opponents or Spectator.
   - Verified `elise_distribute_heal` timeout via DO alarm safely skips without consuming `skillUsedOnce`.
   - Verified `elise_distribute_heal` → hidden `usurper_reveal_block_heal` masks `ownerPlayerId` and `kind` (`null`), rejects wrong-owner `RESOLVE_CHOICE` with a neutral non-leaking message, survives hibernation, and cancels Elise's heal while enabling `usurperAuraActive`.
   - Verified `bianca_discard_prevent` excludes `Masamune` (`ev-01`), survives hibernation, discards `eq-02` cleanly, and replays duplicate `requestId` idempotently without double-discarding equipment.
   - Verified `angelAuras` and `daltonActivatedByPlayer` survive multiple SQLite DO hibernations.
4. **Wave 4 UI / VFX / Sound / Reduced Motion (`P5E-4`):** Verified all 12 Wave 4 roles have `ROLE_VISUAL_META`, `48/48` `MIDNIGHT_CHARACTER_ART`, audio dispatch, Reduced Motion compatibility, and strict zero-leak VFX isolation for hidden `Arlene`.
