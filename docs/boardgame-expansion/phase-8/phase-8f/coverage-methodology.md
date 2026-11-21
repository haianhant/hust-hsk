# Phase 8F-1 — Evidence-Based Interaction Coverage Methodology

> **Source Scripts:** [`scripts/phase8f-interaction-evidence.cjs`](../../../../scripts/phase8f-interaction-evidence.cjs) · [`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs)
> **Machine-Readable Artifact:** [`interaction-coverage-recalculated.json`](./interaction-coverage-recalculated.json)

---

## 1. Why Phase 8E's Pairwise Coverage Metric Was Misleading

In Phase 8E, `scripts/phase8e-interaction-matrix.cjs` scanned `test/boardgame-*.test.cjs` with a regex splitting on `test(...)` blocks and marked any pair `(roleA, roleB)` as *"deterministically covered"* if both string literals `'roleA'` and `'roleB'` appeared anywhere in the same `test()` block.

Manual code audit in Phase 8F-1 revealed **41 false-positive high-risk pairs** (and **3 false-positive critical pairs**) inside Phase 8E's claimed `56/72` (`6/6` critical):

- **`test/boardgame-phase6b.test.cjs` (`P6B-1`):** Contains an array listing multiple roles whose skills are locked/validated independently, creating accidental string co-occurrence between unrelated roles.
- **`test/boardgame-phase7a.test.cjs` (`7A.4`):** Loops over neutral/expansion role IDs in a catalog matrix check without ever testing pairwise gameplay interaction.
- **`test/boardgame-phase8e-interactions.test.cjs` (`8E2-B`, `8E2-D`, `8E2-E`) & `phase7d-integration.test.cjs` (`P7D-1`, `P7D-3`):** Large composite `test()` blocks containing multiple sub-scenarios (`{ ... }`) where Role A was tested in sub-block #1 and Role B in sub-block #4 without interacting.

---

## 2. Phase 8F Four-Tier Evidence Taxonomy

Every unordered role pair `(roleA, roleB)` out of `C(66, 2) = 2,145` is now classified into **exactly one** highest evidence tier:

| Tier | Definition | Counts as Verified Deterministic Coverage? |
|---|---|---|
| **`DO_E2E_ASSERTED`** | Dedicated test verified the pair's shared-mechanic interaction end-to-end over real Cloudflare Durable Object WebSocket + SQLite persistence/hibernation. | **YES** |
| **`INTERACTION_ASSERTED`** | Dedicated deterministic test explicitly triggered and asserted the pair's shared mechanic conflict and expected state outcome (positive + edge/negative paths). | **YES** |
| **`INTERACTION_EXECUTED`** | Both roles were legally dealt in the **same** stateful fuzzing match (`fuzz-boardgame-stateful.cjs`) and **both activated** their skills/actions in that match (`uniquePairsBothActivatedInSameMatch`), without a standalone deterministic pairwise assertion. | **NO** |
| **`CO_OCCURRENCE_ONLY`** | Both roles appeared together in a test block string scan or were dealt in the same fuzz match without both activating, with **no** dedicated pairwise behavioral assertion. | **NO** |
| **`NONE`** | No observed co-occurrence or assertion. | **NO** |

### Traceable Evidence Registry & Machine Validation

Every `INTERACTION_ASSERTED` and `DO_E2E_ASSERTED` claim MUST be registered in [`scripts/phase8f-interaction-evidence.cjs`](../../../../scripts/phase8f-interaction-evidence.cjs) with:
- `pairId` (canonical sorted `roleA::roleB`)
- `rulesetId` & `playerCount`
- `testFile` & `testCaseId`
- `triggeredMechanics[]` & `assertedOutcomes[]`
- `evidenceType` (`INTERACTION_ASSERTED` | `DO_E2E_ASSERTED`)
- `introducedInPhase` (`pre-8f` | `8f`)

At execution time, `validateEvidenceRegistry()` verifies on disk that every `testFile` exists and contains both `testCaseId` and both `roleId`s — failing hard if any entry becomes stale or phantom.

---

## 3. Historical Phase 8E vs Recalculated Phase 8F Numbers

> **Transparency Rule:** Historical Phase 8E metrics are preserved intact (and marked deprecated) alongside recalculated Phase 8F metrics so the exact correction is auditable.

| Metric | Historical Phase 8E (Co-occurrence — Deprecated) | Recalculated Pre-8F Baseline (Strict Verified Only) | Recalculated Post-8F (Strict Verified Only) | Delta in Phase 8F |
|---|---:|---:|---:|---:|
| **High-risk pairs (`score >= 15`) verified** | 56 / 72 (77.78%) *(41 were co-occurrence-only)* | **15 / 72 (20.83%)** *(12 asserted + 3 DO E2E)* | **31 / 72 (43.06%)** *(27 asserted + 4 DO E2E)* | **+16 pairs (+22.22 pp)** |
| **Historical 16 uncovered high-risk gaps closed** | 0 / 16 | 0 / 16 | **16 / 16 (100%)** *(15 asserted + 1 DO E2E)* | **+16 / 16** |
| **Critical pairs (`score >= 25`) verified** | 6 / 6 (100%) *(3 were co-occurrence-only)* | **3 / 6 (50.00%)** | **3 / 6 (50.00%)** | `0` *(3 critical pairs transparently tracked in backlog)* |
| **All overlapping pairs (`score > 0`, n=598)** | N/A | 31 / 598 | **47 / 598** *(42 asserted + 5 DO E2E; +293 fuzz-executed)* | **+16 pairs** |
| **All unordered pairs (`C(66,2)=2,145`)** | N/A | 31 / 2,145 | **47 / 2,145** *(+1,201 fuzz-executed, +692 co-occur, 205 none)* | **+16 pairs** |

### Breakdown of the 72 High-Risk Pairs (Post-8F, with 520-Match Fuzz Report)

| Category | Count (/ 72) | Verified Deterministic? |
|---|---:|---|
| `DO_E2E_ASSERTED` | **4** | YES (`exp1_anathema::exp1_arnold`, `exp1_undead::exp2_cain`, `exp2_bonnie::exp2_cain`, `exp1_clairvoyant::exp1_voodoo`) |
| `INTERACTION_ASSERTED` | **27** | YES (12 pre-8F + 15 new in Phase 8F-2) |
| `INTERACTION_EXECUTED` | **21** | NO (both roles co-activated in 520-match stateful fuzzer; deterministic test pending) |
| `CO_OCCURRENCE_ONLY` | **20** | NO (test-block or fuzz co-occurrence only; deterministic test pending) |
| `NONE` | **0** | NO |

---

## 4. Six Critical Pairs (`score >= 25`) — Honest Status

| Pair | Score | Legal Rulesets | Legal Seats | Historical 8E Claim | Recalculated Phase 8F Status |
|---|---:|---|---|---|---|
| `exp1_antimony × exp2_nc_soldier` | 35 | `full-expansion` | 6P–8P | Claimed covered | **`INTERACTION_EXECUTED`** *(Backlog #1 — no dedicated assertion yet)* |
| `exp1_undead × exp2_bonnie` | 32 | `full-expansion` | 5P–8P | Claimed covered | **`INTERACTION_ASSERTED`** (`8E2-B`) |
| `exp1_antimony × exp2_bonnie` | 31 | `full-expansion` | 6P–8P | Claimed covered | **`CO_OCCURRENCE_ONLY`** *(Backlog #2 — no dedicated assertion yet)* |
| `exp1_antimony × exp1_cassie` | 28 | `expansion-1`, `full-expansion` | 6P–8P | Claimed covered | **`INTERACTION_ASSERTED`** (`P7D-1`) |
| `exp1_undead × exp2_nc_soldier` | 27 | `full-expansion` | 6P–8P | Claimed covered | **`CO_OCCURRENCE_ONLY`** *(Backlog #3 — no dedicated assertion yet)* |
| `exp2_bonnie × exp2_nc_soldier` | 27 | `expansion-2`, `full-expansion` | 6P–8P | Claimed covered | **`INTERACTION_ASSERTED`** (`8E2-E`) |

The complete 41-pair remaining high-risk backlog (`uncoveredHighRiskBacklog`) is machine-exported in [`interaction-coverage-recalculated.json`](./interaction-coverage-recalculated.json) and summarized in [`phase-8f-handoff.md`](./phase-8f-handoff.md).
