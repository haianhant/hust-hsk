# Phase 8E — Targeted Mutation Testing Report (8E-4)

> **Runner:** [`scripts/phase8e-mutation-test.cjs`](../../../../scripts/phase8e-mutation-test.cjs)
> **Technique:** Zero-disk-write in-memory TypeScript fault-seeding (`require.extensions['.ts']` preloader hook in fresh isolated child processes per mutant — repository files are never modified on disk).
> **Scope:** 8 core security & gameplay integrity predicates (12 non-equivalent targeted mutants + 2 verified defense-in-depth equivalent guards).

---

## 1. Initial Mutation Run Findings & Gap Closure

1. **Real Test Gap Discovered & Closed (`MUT-08` — `resurrection-status`):**
   - In the initial run (`10/12` killed), mutating `isPlayerLivingOrPendingRevive` in `features/boardgame/domain/pending-resurrection.ts` to omit `DORMANT_PENDING_REVIVE` **SURVIVED** against `test/boardgame-phase7b.test.cjs` because that suite did not isolate `Undead` as the sole remaining Shadow.
   - **Action taken:** Added focused deterministic test **`B3`** (`Undead` as sole remaining Shadow entering dormancy must keep `st.finished === false`) in [`test/boardgame-phase8e-interactions.test.cjs`](../../../../test/boardgame-phase8e-interactions.test.cjs).
   - **Post-closure result:** `MUT-08` is now **KILLED (`923.8ms`)**.
2. **Verified Defense-in-Depth Equivalent Guards (Documented Honestly):**
   - Mutating `TURN_CONTROL_PROHIBITED_CONTROLLER_ACTIONS.has(action.type)` alone in `turn-ownership.ts:498` OR `!TURN_CONTROL_AUTHORIZED_PUBLIC_ACTIONS.has(action.type)` alone in `turn-ownership.ts:507` survived because the two sets are complementary defense-in-depth checks — disabling either one leaves the other blocking every unauthorized Voodoo action.
   - Similarly, mutating `action.cardId.startsWith('inv-')` in `turn-ownership.ts:517` survived because BOTH `ownerHasPrivateInv` (`turn-ownership.ts:468`) AND `resolveUseCard` (`card.deck === 'investigation'`) independently reject `USE_CARD`/`EQUIP_CARD` on `inv-*` cards.
   - Replaced the equivalent mutant slot `MUT-05` with the non-equivalent `CONTROLLED_BY_OTHER` victim-bypass mutation (`turn-ownership.ts:535`), which is **KILLED**.

---

## 2. Final Mutation Scorecard — 12/12 Non-Equivalent Mutants KILLED (100%)

| Mutant ID | Core Predicate | Target File | Fault Seeded | Killing Test Suite | Duration | Status |
|---|---|---|---|---|---:|---|
| **MUT-01** | `victory-eligibility` | `victory-engine.ts` | Colt weapon count `>= 3` → `>= 4` | `boardgame-phase8e-coverage.test.cjs` | `932.8ms` | **KILLED** |
| **MUT-02** | `victory-eligibility` | `victory-engine.ts` | Arnold survivors `> 2` → `>= 2` | `boardgame-phase8e-coverage.test.cjs` | `889.5ms` | **KILLED** |
| **MUT-03** | `victory-eligibility` | `victory-engine.ts` | Cain 6P–8P `deadOtherNeutrals >= 1` → `>= 0` | `boardgame-phase8e-coverage.test.cjs` | `882.0ms` | **KILLED** |
| **MUT-04** | `pending-choice-ownership` | `expansion-skills.ts` | Disable `pending.ownerPlayerId !== playerId` guard | `boardgame-phase8e-interactions.test.cjs` | `966.5ms` | **KILLED** |
| **MUT-05** | `turn-control-authorization` | `turn-ownership.ts` | Allow hijacked victim to bypass `CONTROLLED_BY_OTHER` | `boardgame-phase7b.test.cjs` | `924.9ms` | **KILLED** |
| **MUT-06** | `turn-control-authorization` | `turn-ownership.ts` | Disable `ownerHasPrivateInv` pause during Voodoo turn | `boardgame-phase8e-interactions.test.cjs` | `911.5ms` | **KILLED** |
| **MUT-07** | `deadline-expiration` | `worker/src/boardgame-room.ts` | Revert `BUG-8B-02` `if (engineState?.pendingChoice)` guard | `boardgame-phase8b-stateful-audit.test.cjs` | `3093.1ms` | **KILLED** |
| **MUT-08** | `resurrection-status` | `pending-resurrection.ts` | Drop `DORMANT_PENDING_REVIVE` from `isPlayerLivingOrPendingRevive` | `boardgame-phase8e-interactions.test.cjs` (`B3`) | `923.8ms` | **KILLED** |
| **MUT-09** | `damage-redirection` | `damage-redirection.ts` | Disable `visited.includes(cursedVictim.playerId)` cycle guard | `boardgame-phase6a.test.cjs` | `957.6ms` | **KILLED** |
| **MUT-10** | `damage-redirection` | `damage-redirection.ts` | Allow `isHpCost` / `unpreventable` damage to redirect via Anathema | `boardgame-phase6b.test.cjs` | `884.8ms` | **KILLED** |
| **MUT-11** | `effective-faction` | `dynamic-allegiance.ts` | Always return base `player.faction` instead of `effectiveFaction` | `boardgame-phase8e-interactions.test.cjs` | `936.2ms` | **KILLED** |
| **MUT-12** | `equipment-conservation` | `equipment-transactions.ts` | Copy instead of splicing transferred item (item duplication) | `boardgame-phase6a.test.cjs` | `1040.8ms` | **KILLED** |
