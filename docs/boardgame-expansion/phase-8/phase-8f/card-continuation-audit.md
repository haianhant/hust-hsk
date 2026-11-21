# Phase 8F-3 — Card Continuation & Action-Driven Immediate Victory Audit

> **Audited Files:** [`features/boardgame/domain/actions.ts`](../../../../features/boardgame/domain/actions.ts#L455-L722), [`features/boardgame/domain/expansion-skills.ts`](../../../../features/boardgame/domain/expansion-skills.ts#L4974-L5690), [`features/boardgame/domain/expansion-skills.ts`](../../../../features/boardgame/domain/expansion-skills.ts#L10975-L11015)
> **Regression Suite:** `8F3-A1`, `8F3-A2`, `8F3-A3`, `8F3-C1`, `8F3-C2` in [`test/boardgame-phase8f-continuation-copy.test.cjs`](../../../../test/boardgame-phase8f-continuation-copy.test.cjs)
> **Mutation Proof:** `MUT-16` KILLED in [`scripts/phase8e-mutation-test.cjs`](../../../../scripts/phase8e-mutation-test.cjs)

---

## 1. Complete Exit-Path Audit of `USE_CARD` & `EQUIP_CARD` Continuation

In expanded rulesets (`expansion-1`, `expansion-2`, `full-expansion`), `applyPlayerGameAction()` (`actions.ts:517–550`) delegates continuation via two patterns:
- **`EQUIP_CARD` (`continuationManaged = false`):** calls `resolveEquipCard()`, then `deliverNextGloriaQueuedCard(state, actor, nowMs)` (`actions.ts:520`), then falls through to `finalizeIfFinished(state, nowMs)` (`actions.ts:710`).
- **`USE_CARD` (`continuationManaged = true`):** delegates all Gloria queue delivery and match finalization to `applyExpandedUseCard()` (`expansion-skills.ts:4974–5690`).

### Exit-Path Verification Table (All 16 Card Effect Branches)

| Card / Branch | Execution Mode | Gloria Queue Delivery Site | Match Finalization Site | Verified By | Status |
|---|---|---|---|---|---|
| `eq-10` Guardian Angel, `eq-15` Concealed Knowledge (`!handledInExpandedCardPipeline`) | Sync fallback → `resolveUseCard()` | `expansion-skills.ts:5016` | `expansion-skills.ts:5017` | `8F3-A2a`, `8F3-A2b` | **PASS** |
| `eq-07` Holy Water (`eq_holy_water`) | Async `pendingSteps` (`HEAL` + `FINISH_ACTION`) | `FINISH_ACTION` (`10990`) | `FINISH_ACTION` (`10984`, `10991`) | `8F3-A2c` (paused on Usurper!) | **PASS** |
| `eq-08` Blessing (`eq_blessing`) | Async `pendingSteps` (`HEAL` + `FINISH_ACTION`) | `FINISH_ACTION` (`10990`) | `FINISH_ACTION` (`10984`, `10991`) | `8E1-1` | **PASS** |
| `eq-09` First Aid — zero-change branch | Sync exit | `expansion-skills.ts:5148` | `expansion-skills.ts:5149` | Code audit + `8E1-1` | **PASS** |
| `eq-09` First Aid — heal or raise-to-7 (`April & Skipps`) | Async `pendingSteps` (`HEAL` or `APPLY_WOUNDS` + `FINISH_ACTION`) | `FINISH_ACTION` (`10990`) | `FINISH_ACTION` (`10984`, `10991`) | `8F3-A2d` | **PASS** |
| `eq-11` Mystic Mirror (`eq_mirror`) | Sync exit | `expansion-skills.ts:5187` | `expansion-skills.ts:5188` | Code audit + `8E1-1` | **PASS** |
| `eq-13` Advent — skip / non-Hunter / Fallen `<8 HP` | Sync exit | `expansion-skills.ts:5238` | `expansion-skills.ts:5239` | `8F3-B1b` | **PASS** |
| `eq-13` Advent — Hunter heal | Async `pendingSteps` (`HEAL` + `FINISH_ACTION`) | `FINISH_ACTION` (`10990`) | `FINISH_ACTION` (`10984`, `10991`) | `8F3-B1b` | **PASS** |
| `eq-14` Chocolate — skip / non-A-E-U / Undead pre-lethal | Sync exit | `expansion-skills.ts:5289` | `expansion-skills.ts:5290` | `8F3-B1a` | **PASS** |
| `eq-14` Chocolate — A/E/U heal | Async `pendingSteps` (`HEAL` + `FINISH_ACTION`) | `FINISH_ACTION` (`10990`) | `FINISH_ACTION` (`10984`, `10991`) | `8F3-B1a`, `8F3-B3b` | **PASS** |
| `ev-13` Diabolic Ritual — skip / non-Shadow | Sync exit | `expansion-skills.ts:5338` | `expansion-skills.ts:5339` | `8F3-B3b` | **PASS** |
| `ev-13` Diabolic Ritual — Shadow heal | Async `pendingSteps` (`HEAL` + `FINISH_ACTION`) | `FINISH_ACTION` (`10990`) | `FINISH_ACTION` (`10984`, `10991`) | `8F3-B3a` | **PASS** |
| `eq-12` Flare (`eq_flare`), `ev-07` Vampire Bat, `ev-08` Spider, `ev-10` Spiritual Doll | Async `pendingSteps` (`DAMAGE` + `FINISH_ACTION`) | `FINISH_ACTION` (`10990`) | `FINISH_ACTION` (`10984`, `10991`) | `8E1-1`, `8F2-B4`, `8F2-B5` | **PASS** |
| **`ev-09` Dynamite — roll-7 dud (`mapped === null`)** | **Sync exit** | **`expansion-skills.ts:5494` (WAS MISSING — `BUG-8F-03` P1!)** | `expansion-skills.ts:5495` | **`8F3-A1` + `MUT-16`** | **FIXED (P1)** |
| `ev-09` Dynamite — non-7 zone blast | Async `pendingSteps` (`DAMAGE[]` + `FINISH_ACTION`) | `FINISH_ACTION` (`10990`) | `FINISH_ACTION` (`10984`, `10991`) | `8E1-1` | **PASS** |
| `ev-11` Moody Goblin — 0 donors / direct steal / Colt theft counter | Sync exit (`5615`, `5651`) or Async (`colt_theft_counter` → `FINISH_ACTION`) | `5615` / `5651` / `10990` | `5616` / `5652` / `10984, 10991` | `8F3-A3a` | **PASS** |
| `ev-12` Banana Peel — equipped item gift (`BUG-8E-01` fix) / 0-gear self-damage | Sync exit (`5669`) or Async (`DAMAGE` + `FINISH_ACTION`) | `5669` / `10990` | `5670` / `10984, 10991` | `8E1-1`, `8F3-A3b` | **PASS** |

---

## 2. Confirmed Defect (`BUG-8F-03`, P1)

- **Location:** `features/boardgame/domain/expansion-skills.ts:5493–5496` (`case 'ev_dynamite'` when `d6 + d4 === 7` → `mapped === null`).
- **Pre-Fix Failure (`8F3-A1`):** When Gloria held `ev-09` (Dynamite) with a 2nd queued card in `exp.gloriaQueuedCards` and rolled `7` (dud), the early return called `callbacks.finalizeIfFinished(state, nowMs)` without calling `deliverNextGloriaQueuedCard(state, actor, nowMs)`. Because `actions.ts:653` blocks `END_TURN` and `actions.ts:567` blocks `ATTACK` while `hasGloriaQueuedCards(state, actor.playerId)` is true, Gloria's turn deadlocked until timeout!
- **Fix:** Added `deliverNextGloriaQueuedCard(state, actor, nowMs)` immediately before `callbacks.finalizeIfFinished(state, nowMs)` at `expansion-skills.ts:5494`.
- **Verification:** `8F3-A1` failed pre-fix (`expected 0, actual 1`) and passes post-fix; `MUT-16` proves reverting the line is immediately caught.

---

## 3. Multi-Step Pause, Finalization & Action-Driven Immediate Victory

Verified through **real authoritative `applyPlayerGameAction()` calls** (never synthetic direct `evaluateVictory()` shortcuts) in `8F3-A2`, `8F3-A3`, `8F3-C1`, and `8F3-C2`:

1. **Paused reaction before queued card delivery (`8F3-A2c`):** Gloria uses `eq-07` Holy Water while hidden `Usurper` intercepts → queued 2nd card `eq-02` is NOT prematurely delivered during `usurper_reveal_block_heal`; after Usurper resolves, `FINISH_ACTION` delivers `eq-02` **exactly once**.
2. **Paused reaction before immediate victory (`8F3-A3a`):** Bob uses `ev-11` Moody Goblin to steal a 5th equipment item from revealed `Colt` → `colt_theft_counter` opens BEFORE Bob wins; after Colt declines, Bob wins immediately with **1** victory log (zero double-finalization).
3. **Self-lethal `ev-12` Banana Peel (`8F3-A3b`):** Last Shadow at 1 HP with 0 equipment plays `ev-12`, dies cleanly via `FINISH_ACTION`, and triggers Hunter victory once.
4. **Action-Driven Immediate Victory (`8F3-C1` & `8F3-C2`):**
   - **Colt:** 3rd qualifying weapon via real `DRAW_CARD` (`canteen`) AND via real `USE_LOC_POWER` (`court` steal).
   - **Bob:** 5th equipment via real `EQUIP_CARD` AND via real 4–6P `ATTACK` steal-instead-of-damage.
   - **N.C. Soldier:** real `USE_SKILL` recruitment + real `DRAW_CARD` for 3rd required weapon (`ev-03`).
   - **Bonnie:** real `USE_CARD` (`ev-07`) killing last Shadow (converting to Shadow before Hunter win) → real `ATTACK` killing last Hunter.
   - **Cain:** real `USE_SKILL` (`Power Play`) → real `ATTACK` elimination triggering immediate `multi-faction` dual victory.
   - **Undead:** real `ATTACK` 1st lethal enters `DORMANT_PENDING_REVIVE` delaying Hunter victory → `END_TURN` revives Undead at 6 HP → real `ATTACK` 2nd lethal commits `FINAL_ELIMINATED` and Hunter victory.
