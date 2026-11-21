# Phase 8E — Confirmed Defect Register

> **Baseline Audited:** `7ff5c257327e4aa4d16ba8f752df4a58e678fa09`
> **Severity Totals:** `0` P0 · **`2` P1 (2 Fixed, 0 Open)** · **`1` P2 (1 Fixed, 0 Open)** · `0` P3
> **Discipline:** Every confirmed defect below was deterministically reproduced as a **FAIL** on unmodified `7ff5c25` BEFORE applying the smallest justified patch, then re-verified **PASS** with zero Classic regression.

| Bug ID | Severity | Category | Source Location | Deterministic Reproduction (Pre-Fix FAIL) | Minimal Justified Patch | Post-Fix Verification |
|---|---|---|---|---|---|---|
| **BUG-8E-01** | **P1** | Card Resolution / Missed Victory & Queue Deadlock (`ev-12` Banana Peel) | `features/boardgame/domain/expansion-skills.ts` (`applyExpandedUseCard` → `case 'ev_banana_peel'`) | `8E1-1C` FAILED (`1 !== 0`): when `actor.equipped.length > 0`, `ev-12` returned `resolveUseCard(...)` directly while `actions.ts` set `continuationManaged = true`. Consequence: (a) `exp2_gloria` drawing `ev-12` + a 2nd card while holding equipment never received her 2nd queued card (`gloriaQueuedCards` stuck, blocking `ATTACK`/`END_TURN`), and (b) gifting **Colt** his 3rd qualifying weapon (or Bob his 5th item / N.C. Soldier his 3rd weapon) via `ev-12` failed to trigger immediate victory! | Captured `const res = resolveUseCard(...)`; when `res.ok`, invoked `deliverNextGloriaQueuedCard(state, actor, nowMs)` and `callbacks.finalizeIfFinished(state, nowMs)` before returning `res`. | `8E1-1C` PASS (both Gloria queue delivery and Colt immediate victory verified) + 48-card invariants + 520-match fuzz PASS. |
| **BUG-8E-02** | **P1** | Copied Skill Faction/Card Rule Violation (`GIDEON_DRAW_WHITE_CARD`) | `features/boardgame/domain/expansion-skills.ts` (`executeGideonDrawWhiteCardStep` → `eq_advent`, `eq_chocolate`) | `8E2-D` FAILED (`0 !== 5`): Shadow `Vengeful Spirit` copied `exp2_gideon`, eliminated a Shadow, drew `eq-13` (`Advent` — Hunter-only!), and was healed all 5 wounds to full HP because `eq_advent` unconditionally healed the Gideon holder. Conversely, Neutral `Antimony` (`A/E/U` eligible) copying Gideon ignored `eq-14` (`Chocolate`). | Gated `eq_advent` healing on `getEffectiveFaction(state, gideon) === 'lantern-guard'`, and routed `eq_chocolate` through `isEligibleForChocolateHeal(gideon.roleId, true)` + `HealPipeline`. | `8E2-D` (`D1` & `D1b`) PASS + `boardgame-phase6b.test.cjs` (`P6B-2`) PASS + `boardgame-phase7d-integration.test.cjs` PASS. |
| **BUG-8E-03** | **P2** | Verification Infrastructure Blind Spot (Invalid Fixture Role IDs) | `scripts/fuzz-boardgame-stateful.cjs` (`TARGETED_HIGH_INTERACTION_ROSTERS`, `applyForcedRoster`) | 8E-0 baseline audit detected `'exp2_felicia'` and `'exp2_ernest'` (non-existent role IDs) silently falling back to `'gac-ky-thuat'` (George) inside `getRoleDesign()`, leaving `Voodoo + Felicia` and `Undead + Ernest` unexercised in Phase 8B's targeted fuzzer. | Corrected IDs to `'exp1_felicia'` and `'exp1_ernest'`, added strict `isKnownBoardGameRoleId(rid)` assertion in `applyForcedRoster()`, and extended rosters with 8 validated risk-weighted Phase 8E rosters. | `fuzz-boardgame-stateful.cjs` 520-match run achieved `56/56` expansion roles activated (`3,187` activations), `0` failures. |

---

## Mutation-Discovered Test Gap (Not an Engine Bug — Closed)

- **`MUT-08` (`pending-resurrection.ts:isPlayerLivingOrPendingRevive`):** Initial mutation run (`10/12` killed) revealed that excluding `DORMANT_PENDING_REVIVE` survived `test/boardgame-phase7b.test.cjs`. Added dedicated deterministic assertion `B3` (`Undead` as sole remaining Shadow entering dormancy must block premature Hunter victory) in [`test/boardgame-phase8e-interactions.test.cjs`](../../../../test/boardgame-phase8e-interactions.test.cjs); re-run killed `MUT-08` (`12/12` non-equivalent mutants killed).

## Phase 8B Bug Protection Verified

All 9 Phase 8B regression tests (`BUG-8B-01` through `BUG-8B-09`) remain green inside `test/boardgame-phase8b-stateful-audit.test.cjs`, and `MUT-07` explicitly confirms `BUG-8B-02` (F5 reconnect retaining `pendingChoice` alarm deadline when `turnTimeoutMs = 0`) fails immediately if reverted.
