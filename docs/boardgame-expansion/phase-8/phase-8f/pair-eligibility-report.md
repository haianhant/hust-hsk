# Phase 8F-1 — Legal Role-Pair Eligibility Report

> **Implementation:** `computePairEligibility(idA, idB)` in [`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs)
> **Regression Gate:** `8F1-ELIG` in [`test/boardgame-phase8f-16-pairs.test.cjs`](../../../../test/boardgame-phase8f-16-pairs.test.cjs)
> **Machine-Readable Data:** `eligibilityAudit` in [`interaction-coverage-recalculated.json`](./interaction-coverage-recalculated.json)

---

## 1. Root Cause of Phase 8E's Eligibility Defect

In Phase 8E, `scripts/phase8e-interaction-matrix.cjs:318–320` computed pair eligibility with a two-line approximation:
```js
const isNeutralPair = a.metadata.faction === 'wanderer' && b.metadata.faction === 'wanderer';
const minPlayersEligible = isNeutralPair ? 6 : 4;
```
That heuristic violated **three** real domain rules implemented in `features/boardgame/domain/roles.ts`, `registry.ts`, and `state-machine.ts`:

1. **4P has ZERO Neutral seats (`getRoleDistribution(4) = { lanternGuard: 2, mistOrder: 2, wanderer: 0 }`):**
   Every **Hunter × Neutral** and **Shadow × Neutral** pair (`25 × 41 = 1,025` pairs) was wrongly labeled `minPlayersEligible = 4` (eligible in 4P–8P) instead of `5P–8P` (or `6P–8P` for `exp2_nc_soldier`).
2. **5P explicitly excludes `exp2_nc_soldier` (`state-machine.ts:75–78`):**
   Every non-Neutral × `exp2_nc_soldier` pair (`41` pairs, e.g. `exp1_undead × exp2_nc_soldier`, `exp1_vengeful_spirit × exp2_nc_soldier`) was wrongly labeled `4P–8P` instead of `6P–8P`. Every Neutral × `exp2_nc_soldier` pair is also illegal in 4P and 5P.
3. **Production Ruleset Pack Isolation (`DEFAULT_RULESET_REGISTRY`):**
   Phase 8E omitted `eligibleRulesets` per pair, failing to distinguish `classic`, `expansion-1`, `expansion-2`, and `full-expansion`-only pairs (`26 exp1-only × 30 exp2-only = 780` pairs can only co-occur in `full-expansion`).

---

## 2. Exact Domain Seat Capacities Used by `computePairEligibility()`

| Player Count | Hunters (`lantern-guard`) | Shadows (`mist-order`) | Neutrals (`wanderer`) | Special Pool Exclusion |
|---:|---:|---:|---:|---|
| **4P** | 2 | 2 | **0** | All Neutral roles ineligible |
| **5P** | 2 | 2 | **1** | `exp2_nc_soldier` excluded (`state-machine.ts:75–78`); Neutral × Neutral ineligible |
| **6P** | 2 | 2 | **2** | None |
| **7P** | 2 | 2 | **3** | None |
| **8P** | 3 | 3 | **2** | None |

---

## 3. Global Impact Across All `C(66, 2) = 2,145` Pairs

| Audit Metric | Count | Exact Combinatorial Verification |
|---|---:|---|
| Total unordered pairs `C(66, 2)` | **2,145** | `66 × 65 / 2 = 2,145` |
| Pairs whose `minPlayersEligible` was **wrong** in Phase 8E | **1,025** | `25 Neutrals × 41 non-Neutrals = 1,025` (984 fixed `4→5`, 41 `exp2_nc_soldier` fixed `4→6`) |
| High-risk pairs (`score >= 15`) whose `minPlayersEligible` was **wrong** | **24 / 72** | 22 fixed `4→5`, 2 fixed `4→6` |
| Pairs **ineligible in 4P** (`wanderer = 0`) | **1,325** | `1,025` (1-Neutral) + `300` (`C(25,2)` 2-Neutral) = `1,325` |
| Pairs **ineligible in 5P** | **341** | `300` (`C(25,2)` 2-Neutral) + `41` (non-Neutral × `exp2_nc_soldier`) = `341` |
| Pairs restricted **exclusively to `full-expansion`** | **780** | `26` Exp1-only × `30` Exp2-only = `780` |

---

## 4. All 24 High-Risk Pairs Corrected from Phase 8E

| # | Pair | Score | Old 8E Min Players | Corrected Eligibility (Seats) | Legal Production Rulesets |
|---:|---|---:|---:|---|---|
| 1 | `exp1_undead × exp2_bonnie` (Undead × Bonnie) | 32 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 2 | `exp1_undead × exp2_nc_soldier` (Undead × N.C. Soldier) | 27 | 4P *(wrong)* | **6P–8P** *(4P & 5P illegal!)* | `full-expansion` |
| 3 | `exp1_antimony × exp1_undead` (Undead × Antimony) | 23 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 4 | `exp1_voodoo × exp2_cruz` (Voodoo × Cruz) | 23 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 5 | `exp1_undead × lang-tien-phong` (Daniel × Undead) | 21 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 6 | `exp1_vengeful_spirit × exp2_bonnie` (VS × Bonnie) | 21 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 7 | `exp1_vengeful_spirit × exp2_nc_soldier` (VS × N.C. Soldier) | 18 | 4P *(wrong)* | **6P–8P** *(4P & 5P illegal!)* | `full-expansion` |
| 8 | `exp1_undead × lang-cuu-ho` (Charles × Undead) | 18 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 9 | `exp1_undead × exp2_cain` (Undead × Cain) | 18 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 10 | `exp1_undead × exp2_dalton` (Undead × Dalton) | 18 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 11 | `exp1_undead × exp2_cruz` (Undead × Cruz) | 18 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 12 | `exp1_undead × exp2_arlene` (Undead × Arlene) | 18 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 13 | `exp1_anathema × exp1_vengeful_spirit` (VS × Anathema) | 18 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 14 | `exp1_cassie × exp1_vengeful_spirit` (VS × Cassie) | 18 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 15 | `exp1_bipolar × exp1_voodoo` (Voodoo × Bipolar) | 17 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 16 | `exp1_anathema × exp1_voodoo` (Voodoo × Anathema) | 17 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 17 | `exp1_bethany × exp1_voodoo` (Voodoo × Bethany) | 17 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 18 | `exp1_clairvoyant × exp1_voodoo` (Voodoo × Clairvoyant) | 17 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 19 | `exp1_arnold × suong-gac-cong` (Werewolf × Arnold) | 16 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 20 | `exp1_arnold × exp1_gwendolen` (Gwendolen × Arnold) | 16 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 21 | `exp1_arnold × exp1_undying` (Undying × Arnold) | 16 | 4P *(wrong)* | **5P–8P** | `expansion-1`, `full-expansion` |
| 22 | `exp1_arnold × exp2_g43` (Arnold × G43) | 16 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 23 | `exp1_arnold × exp2_witch` (Arnold × Witch) | 16 | 4P *(wrong)* | **5P–8P** | `full-expansion` |
| 24 | `exp1_arnold × exp2_urban_legend` (Arnold × Urban Legend) | 16 | 4P *(wrong)* | **5P–8P** | `full-expansion` |

---

## 5. Regression Test Enforcement

`8F1-ELIG` in [`test/boardgame-phase8f-16-pairs.test.cjs`](../../../../test/boardgame-phase8f-16-pairs.test.cjs) locks all critical eligibility invariants (`exp1_undead × exp2_nc_soldier`, `exp2_bonnie × exp2_nc_soldier`, `exp1_undead × lang-tien-phong`, `exp1_voodoo × exp2_visions`, `exp1_arnold × exp2_urban_legend`, and Classic pairs), and `makeLegalScenario()` enforces real `getRoleDistribution(playerCount)` + pack membership + 5P `exp2_nc_soldier` checks on **every** Phase 8F-2 test case.
