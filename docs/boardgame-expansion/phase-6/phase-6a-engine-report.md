# Bóng Đêm KTX — Phase 6A Engine Foundations Report

- **Date:** 2026-11-21
- **Branch:** `main`
- **Baseline HEAD:** `5e91f041811b3134244bee150987d5d5a313663f`
- **Milestone Status:** ✅ **COMPLETE (All Gates PASS, Zero Classic Regression)**

---

## 1. Delivered Shared Engine Primitives & Architecture Docs

### Architecture & Rules Specifications (`docs/boardgame-expansion/phase-6/`)
1. [`phase-6-scope.md`](./phase-6-scope.md) — Phase 6 target scope (10 Tier-3 characters, `starter-forty-eight` 58 playable, 8 Tier-4 strictly locked).
2. [`rules-decisions.md`](./rules-decisions.md) — Complete 10-field experimental `house-rule-approved` specifications for all 10 Tier-3 characters (`exp2_gideon`, `exp1_anathema`, `exp1_bethany`, `exp1_arnold`, `exp1_cassie`, `exp1_clairvoyant`, `exp2_april_skipps`, `exp2_colt`, `exp2_diana`, `exp2_aaron`), explicitly preserving `RC-13`, `RC-14`, `RC-15`, `RC-16`, `RC-20` source ambiguities.
3. [`copied-victory-architecture.md`](./copied-victory-architecture.md) — `CAP-07 CopiedVictoryGraph` specification separating `COPY_GOAL`, `SHARE_OUTCOME`, and `CONDITIONAL_SHARED`.
4. [`damage-redirection-architecture.md`](./damage-redirection-architecture.md) — `CAP-06` centralized damage redirection stage & 11-mechanic interaction matrix.
5. [`role-reveal-event-spec.md`](./role-reveal-event-spec.md) — Authoritative role reveal event ledger & normal-gameplay reveal filter.
6. [`equipment-transaction-spec.md`](./equipment-transaction-spec.md) — Authoritative equipment theft/transfer transaction ledger & atomic reclaim invariants.

### Code Modules Delivered
- [`features/boardgame/domain/character-metadata.ts`](../../../features/boardgame/domain/character-metadata.ts) (`CAP-10`): Versioned (`2026.11-p6a`) canonical fictional gender metadata covering all **66/66** role IDs (`female | male | unspecified`) with explicit provenance and zero player-profile inference.
- [`features/boardgame/domain/copied-victory-graph.ts`](../../../features/boardgame/domain/copied-victory-graph.ts) (`CAP-07`): Pure, memoized, deterministic `evaluateCopiedVictoryGraph()` supporting `COPY_GOAL`, `SHARE_OUTCOME`, `CONDITIONAL_SHARED`, transitive multi-hop evaluation, explicit cycle detection failing closed with internal telemetry, missing/dead target handling, and deterministic `turnOrder` co-winner ordering.
- [`features/boardgame/domain/victory-engine.ts`](../../../features/boardgame/domain/victory-engine.ts): Integrated `buildVictoryDependencyLinks()`, `evaluateDirectRoleGoalForSubject()`, and `evaluateExpandedVictoryWithDiagnostics()` into expanded victory evaluation while keeping `features/boardgame/domain/victory.ts` **100% untouched**.
- [`features/boardgame/domain/damage-redirection.ts`](../../../features/boardgame/domain/damage-redirection.ts) (`CAP-06`): Bounded (`MAX_REDIRECT_CHAIN_DEPTH = 4`) visited-set (`redirectChain`) redirection helpers for Anathema & Arnold plus internal `DamageRedirectionTrace` logging.
- [`features/boardgame/domain/reveal-events.ts`](../../../features/boardgame/domain/reveal-events.ts): Monotonic `revealSeq` authoritative reveal ledger excluding death-only (`eliminated`) and final-match disclosure (`final-disclosure`) events from normal reveal bindings.
- [`features/boardgame/domain/equipment-transactions.ts`](../../../features/boardgame/domain/equipment-transactions.ts): Conservation-safe theft/transfer transaction engine distinguishing genuine theft (`theft-court`, `theft-moody-goblin`, `theft-bob`) from voluntary transfers, enforcing Masamune immutability, idempotency keys, and atomic Colt rollback (`reclaimStolenEquipmentTransaction`).
- [`features/boardgame/domain/cards.ts`](../../../features/boardgame/domain/cards.ts): Added canonical `COLT_QUALIFYING_WEAPON_IDS` (`ev-02`, `ev-03`, `ev-04`, `ev-05`), `isColtQualifyingWeaponId()`, and `countColtQualifyingWeapons()`.
- [`shared/contracts/boardgame.ts`](../../../shared/contracts/boardgame.ts), [`features/boardgame/domain/types.ts`](../../../features/boardgame/domain/types.ts), [`features/boardgame/domain/projections.ts`](../../../features/boardgame/domain/projections.ts), [`worker/src/boardgame-room.ts`](../../../worker/src/boardgame-room.ts): Added Phase 6 PendingChoice kinds, `TRANSFER_TO_BETHANY` action contract + validator, privacy-gated public badges, owner-only `clairvoyantReveals`, and **normalized `publicDeadlineMs` for secret choices** (mitigating Phase 5 Residual Risk #2.2 disconnect-deadline side-channel).

---

## 2. Verification Results

| Gate / Command | Result | Key Assertions Verified |
|---|---|---|
| `npm run typecheck` | ✅ **PASS** | Frontend + Shared Contracts + Cloudflare Worker (`0` errors) |
| `node --test test/boardgame-phase6a.test.cjs` | ✅ **9/9 PASS** | All 11 mandatory `CopiedVictoryGraph` cases + `COPY_GOAL` vs `SHARE_OUTCOME`, `DamageRedirection` loop guards & attribution, 66/66 metadata, reveal ledger, atomic equipment transactions, privacy hardening |
| `npm run test:boardgame` | ✅ **PASS** | Catalog validator, all Classic + Phase 1–5 + Phase 6A tests, 25/25 Classic RNG SHA-256, 4,500-match Classic sim equivalence |
| `npm run test:contracts` | ✅ **12/12 PASS** | Shared contracts & HskRoom DO invariants |
| `git diff --stat features/boardgame/domain/victory.ts` | ✅ **EMPTY** | Classic victory evaluator 100% untouched |

---

## 3. Rules Approved, Blockers & Remaining Work
- **Rules Approved (`house-rule-approved` specs documented):** All 10 Phase 6 Tier-3 roles documented in [`rules-decisions.md`](./rules-decisions.md) (not yet flipped to `implemented` in catalog until Phase 6B).
- **Known Blockers:** None.
- **Remaining Work:** Phase 6B (10 Tier-3 gameplay implementations, `starter-forty-eight`, UI) → Phase 6C (10 real AI portraits `58/58` & visual QA) → Phase 6D (25 cross-character scenarios, security audit & real DO 4P–8P E2E) → Phase 6E (25,000-match simulation, balance, full CI, handoff & push).
