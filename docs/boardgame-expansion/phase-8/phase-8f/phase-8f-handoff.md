# Phase 8F — Small Reliability Gap Closure Handoff

> **Baseline Commit:** `8a5096be73d469bbf987cf8372f2e55912cfe53c` (Phase 8E Complete)
> **Scope:** Bounded follow-up closing measurement inflation, eligibility errors, all 16 historical uncovered high-risk pairs, and card-continuation / copied-skill edge cases.
> **Open P0/P1 Defects:** **`0`** (3 confirmed P1 gameplay defects found FAIL-first, patched surgically, and locked with regression + mutation tests).

---

## 1. What Phase 8F Delivered

1. **8F-1 Truthful Evidence-Based Coverage & Legal Role-Pair Eligibility:**
   - Created machine-validated evidence registry [`scripts/phase8f-interaction-evidence.cjs`](../../../../scripts/phase8f-interaction-evidence.cjs) and upgraded [`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs) to classify every pair into `DO_E2E_ASSERTED`, `INTERACTION_ASSERTED`, `INTERACTION_EXECUTED`, `CO_OCCURRENCE_ONLY`, or `NONE`, counting **only** `INTERACTION_ASSERTED` + `DO_E2E_ASSERTED` as verified deterministic coverage.
   - Exposed `41` high-risk (`3` critical) co-occurrence false positives in historical Phase 8E (`56/72` historical co-occurrence → **`15/72`** true pre-8F verified baseline → **`31/72` (`43.06%`)** post-8F verified, **`+16`** newly verified in Phase 8F).
   - Fixed `computePairEligibility()` directly from `DEFAULT_RULESET_REGISTRY`, `getRoleDistribution(4..8)`, and `state-machine.ts:75–78`, correcting **`1,025 / 2,145`** total pairs (**`24 / 72`** high-risk pairs) and locking invariants in `8F1-ELIG`.
2. **8F-2 All 16 Historical Uncovered High-Risk Pairs Closed (`16/16`):**
   - [`test/boardgame-phase8f-16-pairs.test.cjs`](../../../../test/boardgame-phase8f-16-pairs.test.cjs) (**18/18 PASS**): Groups A (`8F2-A1..A2`), B (`8F2-B1..B5`), C (`8F2-C1..C6` + real SQLite DO reconnect `8F2-C-DO`), and D (`8F2-D1..D3`), all using strictly legal seat splits and ruleset pools.
3. **8F-3 Card Continuation, Copied-Skill × Card & Action-Driven Victory + 3 P1 Fixes:**
   - [`test/boardgame-phase8f-continuation-copy.test.cjs`](../../../../test/boardgame-phase8f-continuation-copy.test.cjs) (**8/8 PASS**):
     - **`BUG-8F-01` (P1, FIXED):** Blocked unrevealed `Undead` (`'U'`) from bypassing pre-lethal reveal lock via `eq-14` Chocolate and unrevealed `Fallen (<8 HP)` from bypassing voluntary reveal lock via `eq-13` Advent.
     - **`BUG-8F-02` (P1, FIXED):** Added `'gac-truc-ban'` (Classic Emi Teleport) handling in `applyExpandedUseSkill()` so `Vengeful Spirit` and `Antimony` copying Emi work on `USE_SKILL`.
     - **`BUG-8F-03` (P1, FIXED):** Added missing `deliverNextGloriaQueuedCard()` on `ev-09` Dynamite roll-7 dud early return in `applyExpandedUseCard()`.
   - Verified immediate victory for Colt, Bob, N.C. Soldier, Bonnie, Cain, and Undead dormancy delay through real `applyPlayerGameAction()` pipelines.
4. **8F-4 Mutation Proof, Fast/Extended CI & Scorecard Continuity:**
   - Expanded `scripts/phase8e-mutation-test.cjs` with `MUT-13..MUT-16` covering all 3 Phase 8F P1 fixes → **`16/16` KILLED (100%)**.
   - Wired both Phase 8F suites into `npm run test:boardgame`, `npm run test:stability:fast`, `npm run test:stability:extended`, and [`.github/workflows/ci-extended.yml`](../../../../.github/workflows/ci-extended.yml).
   - Preserved Phase 8E historical numbers intact alongside recalculated Phase 8F metrics in [`../stability/reliability-scorecard.json`](../stability/reliability-scorecard.json).

---

## 2. Complete Phase 8F Artifact Index (`docs/boardgame-expansion/phase-8/phase-8f/`)

- [`phase-8f-plan.md`](./phase-8f-plan.md)
- [`coverage-methodology.md`](./coverage-methodology.md)
- [`pair-eligibility-report.md`](./pair-eligibility-report.md)
- [`interaction-coverage-recalculated.json`](./interaction-coverage-recalculated.json)
- [`16-high-risk-pair-regression-report.md`](./16-high-risk-pair-regression-report.md)
- [`card-continuation-audit.md`](./card-continuation-audit.md)
- [`copied-skill-card-audit.md`](./copied-skill-card-audit.md)
- [`bug-register.md`](./bug-register.md)
- [`extended-ci-verification.md`](./extended-ci-verification.md)
- [`phase-8f-handoff.md`](./phase-8f-handoff.md) *(this document)*
- Updated scorecard: [`../stability/reliability-scorecard.json`](../stability/reliability-scorecard.json)

---

## 3. Truthful Remaining Risks & Prioritized Backlog

1. **41 Remaining High-Risk Pairs (`score >= 15`) Without Dedicated Deterministic Assertions** *(previously hidden behind Phase 8E's co-occurrence metric; `21` are `INTERACTION_EXECUTED` in stateful fuzzing and `20` are `CO_OCCURRENCE_ONLY`):*
   - **Priority 1 — 3 Remaining Critical Pairs (`score >= 25`, all `full-expansion` 6P–8P only):**
     1. `exp1_antimony × exp2_nc_soldier` (score 35, `INTERACTION_EXECUTED`) — Antimony copying N.C. Soldier recruitment & alliance victory semantics.
     2. `exp1_antimony × exp2_bonnie` (score 31, `CO_OCCURRENCE_ONLY`) — Antimony copying Bonnie / Bonnie conversion timing vs Antimony copy trigger.
     3. `exp1_undead × exp2_nc_soldier` (score 27, `CO_OCCURRENCE_ONLY`) — N.C. Soldier alliance victory/recruitment vs Undead dormancy & revival.
   - **Priority 2 — Top Remaining High-Risk Pairs (`score 20–24`, 10 pairs):**
     `exp1_bethany × exp2_nc_soldier` (24), `exp1_vengeful_spirit × exp1_voodoo` (23), `exp1_voodoo × exp2_gideon` (23), `exp1_bethany × lang-anh-san` (21), `exp1_vengeful_spirit × exp2_bonnie` (21), `exp2_bianca × exp2_colt` (21), `exp1_antimony × exp1_clairvoyant` (20), `exp1_antimony × exp2_aaron` (20), `exp1_antimony × exp2_diana` (20), `exp2_bonnie × lang-tien-phong` (20).
   - **Priority 3 — Remaining 28 High-Risk Pairs (`score 15–18`):** Full machine-readable list in `uncoveredHighRiskBacklog` of [`interaction-coverage-recalculated.json`](./interaction-coverage-recalculated.json).
2. **Remote Extended CI (`ci-extended.yml`):** Currently **`UNVERIFIED`** remotely until triggered via `gh workflow run ci-extended.yml --ref main` or the scheduled nightly run (`0 21 * * *` UTC); local execution is 100% green.
3. **Production Cloudflare Edge Soak & Human Playtest Balance:** Local SQLite DO chaos/load/soak verifies engine & DO persistence logic, but Production Beta expansions remain gated as **Beta** pending real human playtest telemetry (`npm run telemetry:beta`).
