# Phase 8E — Classic Zero-Regression Report

> **Verified Commit Base:** Phase 8E patches (`BUG-8E-01`, `BUG-8E-02` in `expansion-skills.ts`, `BUG-8E-03` in `fuzz-boardgame-stateful.cjs`)
> **Classic Verdict:** **0.00% Regression — Bit-for-Bit Identical Classic Engine & Simulation Baseline.**

---

## 1. Engine Isolation Proof

- `git diff --exit-code features/boardgame/domain/victory.ts` → **PASS (`0-diff`)**.
- Zero edits to `features/boardgame/domain/effects.ts`, `features/boardgame/domain/rules.ts`, `features/boardgame/domain/roles.ts`, or `features/boardgame/domain/victory.ts`.
- All 10 Classic characters (`George`, `Emi`, `Franklin`, `Vampire`, `Unknown`, `Werewolf`, `Bob`, `Allie`, `Charles`, `Daniel`) execute through the untouched Classic path whenever `rulesetId === 'classic'`.

## 2. Deterministic Classic Verification Gates

| Verification Suite | Measured Result | Drift |
|---|---|---|
| `test/boardgame-engine.test.cjs` (V4.1–V4.10 Classic rules & 48 cards) | **PASS** | `0` |
| `test/boardgame-expansion-foundation.test.cjs` (25/25 Classic RNG fingerprints) | **PASS (`25/25` exact match)** | `0.00%` |
| `node test/boardgame-sim.cjs` (**4,500-match** v4 Classic balance baseline, 900 matches × 4P–8P) | **PASS** (6P Guard `41.56%`, Mist `40.22%`, Wanderer `18.22%`, `avgRounds 6.93`; 7P Guard `34.33%`, Mist `44.33%`; 8P Guard `35.67%`, Mist `40.44%`; all 10 roles within guardrails) | **`0.00%`** |
| `test/boardgame-phase8e-do-chaos.test.cjs` (`8E3-3` Classic DO idempotency/dual-client, `8E3-5` Classic under Beta rollback) | **PASS** | `0` |
| `scripts/fuzz-boardgame-stateful.cjs` (`100` valid Classic matches + adversarial probes + deterministic replay) | **PASS (`0` violations)** | `0` |
