# Phase 8F — Defect Register

> **Audit Scope:** Phase 8F-1 (Coverage & Eligibility), Phase 8F-2 (16 High-Risk Pairs), Phase 8F-3 (Card Continuation & Copied-Skill × Card).
> **Policy:** Every confirmed gameplay defect was reproduced with a deterministic **FAIL-first** regression test BEFORE patching, verified **PASS** after patching, and locked with an in-memory **mutation test** proving the test catches regressions.

---

## Summary by Severity

| Severity | Confirmed | Fixed | Open | Notes |
|---|---:|---:|---:|---|
| **P0 (Blocker)** | 0 | 0 | **0** | — |
| **P1 (High — Gameplay Rules / Turn Deadlock)** | **3** | **3** | **0** | `BUG-8F-01`, `BUG-8F-02`, `BUG-8F-03` |
| **P2 (Medium — Tooling / Metric Accuracy)** | **2** | **2** | **0** | `BUG-8F-04` (co-occurrence inflation), `BUG-8F-05` (eligibility formula) |
| **P3 (Low)** | 0 | 0 | **0** | — |

---

## Detailed Defect Entries

### `BUG-8F-01` — P1 (FIXED) — Unrevealed `Undead` & `Fallen (<8 HP)` Bypass Reveal Restrictions via `eq-14` Chocolate / `eq-13` Advent

- **Area:** [`features/boardgame/domain/expansion-skills.ts`](../../../../features/boardgame/domain/expansion-skills.ts#L5192-L5255) (`applyExpandedUseCard` → `case 'eq_advent'` & `case 'eq_chocolate'`)
- **Root Cause:**
  - `eq_chocolate` (`eq-14`, A/E/U heal) checked `isEligibleForChocolateHeal(actor.roleId, true)` — which returns `true` for `exp1_undead` (`'U'`) — without checking `isUndeadPreLethalRevealRestricted(state, actor)`. An unrevealed Undead could voluntarily reveal and heal BEFORE its first lethal event, breaking Undead's pre-lethal reveal lock!
  - `eq_advent` (`eq-13`, Hunter heal) did not check `actor.roleId === 'exp1_fallen' && !actor.revealed && getRemainingHp(actor) < 8`, allowing an unrevealed Fallen below 8 HP to bypass its `< 8 HP` voluntary reveal lock (`applyExpandedRevealRole:4182`, `docs/boardgame-expansion/phase-4/rules-decisions.md:16`).
- **Pre-Fix Reproduction:** `8F3-B1` in [`test/boardgame-phase8f-continuation-copy.test.cjs`](../../../../test/boardgame-phase8f-continuation-copy.test.cjs) failed deterministically (`st.players.p1.revealed === true`, expected `false`).
- **Fix:** Treated `isUndeadPreLethalRevealRestricted(state, actor)` in `eq_chocolate` and `actor.roleId === 'exp1_fallen' && !actor.revealed && getRemainingHp(actor) < 8` in `eq_advent` as `effectiveSkip = true` (preserving revived Undead `eq-14` eligibility and `>= 8 HP` Fallen `eq-13` eligibility).
- **Verification:** `8F3-B1` PASS (both negative & positive paths) + `MUT-13` & `MUT-14` KILLED in `scripts/phase8e-mutation-test.cjs`.

---

### `BUG-8F-02` — P1 (FIXED) — Copied Classic `Emi` (`gac-truc-ban`) Rejected on `USE_SKILL`

- **Area:** [`features/boardgame/domain/expansion-skills.ts`](../../../../features/boardgame/domain/expansion-skills.ts#L7263-L7336) (`applyExpandedUseSkill`)
- **Root Cause:** `features/boardgame/domain/dynamic-skill-copy.ts:89` classifies Classic `Emi` (`gac-truc-ban`) as `FULL_DIRECT` copyable. However, `applyExpandedUseSkill()` explicitly excluded `'gac-truc-ban'` (returning `null`), causing `actions.ts:619` to fall back to Classic `resolveUseSkill()`, which switched on base `actor.roleId` (`exp1_vengeful_spirit` / `exp1_antimony`, both `targetMode: 'passive'`) and always returned `{ ok: false, error: '... sở hữu kỹ năng nội tại tự động.' }`.
- **Pre-Fix Reproduction:** `8F3-B2` in [`test/boardgame-phase8f-continuation-copy.test.cjs`](../../../../test/boardgame-phase8f-continuation-copy.test.cjs) failed deterministically for both `exp1_vengeful_spirit` and `exp1_antimony`.
- **Fix:** Added `'gac-truc-ban'` handling inside `applyExpandedUseSkill()` matching Classic `effects.ts:1870–1895` (`ROLL_MOVE` phase check, `getPairedLocationInCluster`, `LOCATION_ACTION` transition, `copiedSkillActivations` telemetry, `callbacks.finalizeIfFinished`), leaving Classic `effects.ts` untouched (`0.00%` Classic drift).
- **Verification:** `8F3-B2` PASS (positive + off-phase negative for both copiers) + `MUT-15` KILLED in `scripts/phase8e-mutation-test.cjs`.

---

### `BUG-8F-03` — P1 (FIXED) — `ev-09` Dynamite Roll-7 Dud Skips `deliverNextGloriaQueuedCard()` (Turn Deadlock)

- **Area:** [`features/boardgame/domain/expansion-skills.ts`](../../../../features/boardgame/domain/expansion-skills.ts#L5493-L5496) (`applyExpandedUseCard` → `case 'ev_dynamite'` when `mapped === null`)
- **Root Cause:** When `ev-09` rolled `d6 + d4 === 7` (dud), its early return was the sole remaining synchronous exit in `applyExpandedUseCard` that omitted `deliverNextGloriaQueuedCard(state, actor, nowMs)` before `callbacks.finalizeIfFinished(state, nowMs)`. If Gloria held a 2nd queued card, `ATTACK` and `END_TURN` stayed blocked until timeout.
- **Pre-Fix Reproduction:** `8F3-A1` in [`test/boardgame-phase8f-continuation-copy.test.cjs`](../../../../test/boardgame-phase8f-continuation-copy.test.cjs) failed deterministically (`gloriaQueuedCards.length === 1`, expected `0`).
- **Fix:** Added `deliverNextGloriaQueuedCard(state, actor, nowMs)` before `callbacks.finalizeIfFinished(state, nowMs)` on the roll-7 early exit.
- **Verification:** `8F3-A1` PASS + `MUT-16` KILLED in `scripts/phase8e-mutation-test.cjs`.

---

### `BUG-8F-04` — P2 (FIXED) — Pairwise Coverage Metric Conflated Test-Block Co-Occurrence with Verified Assertions

- **Area:** [`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs)
- **Root Cause:** Regex scan over `test()` blocks counted `41` high-risk pairs (and `3` critical pairs) as covered despite having zero pairwise behavioral assertions (`56/72` claimed vs `15/72` truly verified pre-8F).
- **Fix:** Introduced machine-validated traceable evidence registry ([`scripts/phase8f-interaction-evidence.cjs`](../../../../scripts/phase8f-interaction-evidence.cjs)) and 4-tier classification (`DO_E2E_ASSERTED`, `INTERACTION_ASSERTED`, `INTERACTION_EXECUTED`, `CO_OCCURRENCE_ONLY`) counting ONLY asserted tiers as verified deterministic coverage.

---

### `BUG-8F-05` — P2 (FIXED) — Pair Eligibility Ignored 4P Zero-Neutral Rule, 5P `exp2_nc_soldier` Exclusion & Pack Isolation

- **Area:** [`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs) (`computePairEligibility`)
- **Root Cause:** Heuristic `isNeutralPair ? 6 : 4` misclassified `1,025 / 2,145` total pairs (`24 / 72` high-risk pairs) as eligible in 4P (or 5P for `exp2_nc_soldier`) and omitted `eligibleRulesets` pack boundaries.
- **Fix:** Implemented `computePairEligibility()` directly from `DEFAULT_RULESET_REGISTRY`, `getRoleDistribution(4..8)`, and `state-machine.ts:75–78`, locked by `8F1-ELIG`.

---

## Non-Bug Observations Documented (Zero Code Churn)

1. `features/boardgame/domain/expansion-skills.ts:11759` (`bryon_gift_equipment`) checks `recipient.faction === 'wanderer'`, while `openBryonGiftChoice` already filters strictly via `getEffectiveFaction(state, p) === 'wanderer'` synchronously prior to opening the choice (no conversion can occur mid-choice).
2. `features/boardgame/domain/expansion-skills.ts:1423` (`computeRawAttackDamage` for `eq-04` Spear) checks `actor.faction === 'lantern-guard'`, which is currently equivalent to `getEffectiveFaction` because no role converts into or out of `lantern-guard`.
