# Phase 8E — Stateful Fuzzing Extension & Deterministic Replay Report (8E-2)

> **Fuzzer:** [`scripts/fuzz-boardgame-stateful.cjs`](../../../../scripts/fuzz-boardgame-stateful.cjs) + [`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs)
> **Command Executed:**
> ```bash
> node scripts/fuzz-boardgame-stateful.cjs --valid=400 --targeted=120 --adversarial=150 --replay=60 --json
> ```

---

## 1. Key Extensions Over Phase 8B

1. **Fixed Broken Phase 8B Fixture Role IDs (`BUG-8E-03`):** Corrected `'exp2_felicia'` → `'exp1_felicia'` and `'exp2_ernest'` → `'exp1_ernest'` and enforced strict `isKnownBoardGameRoleId()` validation in `applyForcedRoster()` so invalid role IDs can never silently fall back to George.
2. **Expanded Targeted Rosters (`4` → `12`):** Preserved all 4 Phase 8B rosters as regression fixtures and added **8 risk-weighted Phase 8E rosters** covering Mandatory Critical Families A–E plus 3 high-risk three-way combinations (`heal-gear-theft`, `reveal-protect-execute`, `move-attack-marks`).
3. **Runtime Behavioral Instrumentation:** Added real per-role activation telemetry (`uniqueRolesDealt`, `uniqueExpansionRolesActivated`, `totalExpansionSkillActivations`, `activationsByRole`) and unordered pair co-occurrence tracking (`uniquePairsCoOccurred`) so simulation runs explicitly distinguish *dealt* roles from *activated* roles.

---

## 2. Measured Run Results (Post-Fix)

| Track | Workload | Steps / Probes | Violations | Outcome |
|---|---|---:|---:|---|
| **Valid Gameplay Stateful Fuzz** | `400` matches (`100` each: `classic`, `expansion-1`, `expansion-2`, `full-expansion`; 4P–8P) | `76,161` steps | **`0`** | **PASS** |
| **Targeted Risk-Weighted Roster Fuzz** | `120` matches across `12` high-interaction rosters (4 Phase 8B + 8 Phase 8E) | `21,040` steps | **`0`** | **PASS** |
| **Deterministic Event Replay** | `76` sampled matches replayed from seed + ordered trace | Full trace | **`0`** | **PASS (`76/76` byte-identical SHA-256)** |
| **Adversarial Input Fuzz** | `150` matches (`4P–8P`, all 4 rulesets) | `56,763` probes (`56,763` rejected) | **`0`** | **PASS (`0` rejected-action mutations)** |

## 3. Runtime Instrumentation Metrics

- **Total Elapsed Wall Time:** `8,562 ms`
- **Unique Roles Dealt:** `66 / 66`
- **Unique Expansion Roles Activated at Runtime:** **`56 / 56`** (`100%` of expansion roles actually fired at least once!)
- **Total Expansion Skill Activations Recorded:** **`3,187`**
- **Distinct Unordered Role Pairs Co-Occurred:** **`1,746 / 2,145`**
- **Card Conservation (`48` canonical copies) & P0 Privacy Invariants:** Checked on **every single step** across all `97,201` steps — **`0` violations**.
