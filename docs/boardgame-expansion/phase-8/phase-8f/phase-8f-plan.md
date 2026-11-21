# Phase 8F — Small Reliability Gap Closure Plan

> **Baseline HEAD:** `8a5096be73d469bbf987cf8372f2e55912cfe53c` (Phase 8E Certification Complete — GitHub Actions Run `#44912081542` 8/8 PASS, Vercel Production & Cloudflare Worker live).
> **Scope:** Bounded reliability follow-up — zero new characters, zero balance/house-rule changes, zero new cards/VFX, zero production load/soak tests.

---

## 1. Objectives & Bounded Workstreams

| Workstream | Objective | Primary Deliverable(s) |
|---|---|---|
| **8F-1: Coverage Measurement & Legal Eligibility** | Replace naive regex test-block co-occurrence with an explicit traceable behavioral evidence registry (`CO_OCCURRENCE_ONLY`, `INTERACTION_EXECUTED`, `INTERACTION_ASSERTED`, `DO_E2E_ASSERTED`); compute legal role-pair eligibility directly from `DEFAULT_RULESET_REGISTRY`, `getRoleDistribution(4..8)`, and 5P `exp2_nc_soldier` exclusion. | [`scripts/phase8f-interaction-evidence.cjs`](../../../../scripts/phase8f-interaction-evidence.cjs), upgraded [`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs), [`coverage-methodology.md`](./coverage-methodology.md), [`pair-eligibility-report.md`](./pair-eligibility-report.md), [`interaction-coverage-recalculated.json`](./interaction-coverage-recalculated.json) |
| **8F-2: 16 Historical Uncovered High-Risk Pairs** | Add deterministic, legally dealt assertions (plus real SQLite DO reconnect check for Voodoo + start-of-turn choice) closing all 16 historical high-risk gaps across Groups A–D without overstating coverage of newly surfaced backlog pairs. | [`test/boardgame-phase8f-16-pairs.test.cjs`](../../../../test/boardgame-phase8f-16-pairs.test.cjs), [`16-high-risk-pair-regression-report.md`](./16-high-risk-pair-regression-report.md) |
| **8F-3: Card Continuation, Copied-Skill × Card & Action-Driven Victory** | Audit every exit path of `applyExpandedUseCard()`, `resolveUseCard()`, `deliverNextGloriaQueuedCard()`, `finalizeIfFinished()`, and `continuationManaged`; audit copied-skill × card eligibility/reveal guards; verify immediate victory through real authoritative actions. | [`test/boardgame-phase8f-continuation-copy.test.cjs`](../../../../test/boardgame-phase8f-continuation-copy.test.cjs), surgical P1 fixes in [`features/boardgame/domain/expansion-skills.ts`](../../../../features/boardgame/domain/expansion-skills.ts), [`card-continuation-audit.md`](./card-continuation-audit.md), [`copied-skill-card-audit.md`](./copied-skill-card-audit.md), [`bug-register.md`](./bug-register.md) |
| **8F-4: Verification Gates, Extended CI & Handoff** | Add 4 targeted Phase 8F mutants (`MUT-13..MUT-16`) to `scripts/phase8e-mutation-test.cjs`, wire Phase 8F suites into `package.json` & `.github/workflows/ci-extended.yml`, preserve Phase 8E historical metrics alongside recalculated Phase 8F metrics in `reliability-scorecard.json`, verify all regression gates and live production deployment safely. | [`extended-ci-verification.md`](./extended-ci-verification.md), [`phase-8f-handoff.md`](./phase-8f-handoff.md), updated [`../stability/reliability-scorecard.json`](../stability/reliability-scorecard.json) |

---

## 2. Explicit Non-Goals (Scope Guardrails)

- No new characters, skills, cards, portraits, or VFX changes.
- No character HP, damage, or balance tuning (`features/boardgame/domain/victory.ts` stays `0-diff`, Classic RNG & 4,500-match simulation stays `0.00%` drift).
- No brute-force re-run of 30,000-match balance sims or local 50-room load/soak reruns.
- No load/soak or leaderboard-mutating tests against public production (`hust-hsk-rooms` Worker / `hustverse.vercel.app`).
- Newly exposed high-risk pairs revealed by fixing co-occurrence inflation (`41/72` remaining after closing the 16 historical gaps) are transparently recorded as honest backlog rather than silently swept into scope creep.
