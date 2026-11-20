# Bóng Đêm KTX — CAP-06: Centralized Damage Redirection Architecture

- **Module:** [`features/boardgame/domain/damage-redirection.ts`](../../../features/boardgame/domain/damage-redirection.ts)
- **Integration:** `executeDamageStep()` in [`features/boardgame/domain/expansion-skills.ts`](../../../features/boardgame/domain/expansion-skills.ts) (Classic `effects.ts:applyDamage()` remains **100% untouched**).

---

## 1. Damage Event Attribution & Trace Schema

Every `DAMAGE` `PendingResolutionStep` preserves full causal ancestry across redirections:

| Field | Semantics |
|---|---|
| `damageEventId` | Unique monotonic event ID (`dmg-*`, `dmg-arnold-reflect-*`), deduplicated in `processedEventIds`. |
| `causationId` | Causal parent event ID linking redirected/reflected damage back to the originating event. |
| `originalAttackerPlayerId` | Original source actor who initiated the damage (preserved across Anathema & Arnold redirects). |
| `originalTargetPlayerId` | Original intended victim before any redirection. |
| `targetPlayerId` | Effective current target of this damage step. |
| `attackerPlayerId` | Effective attributable actor for kill/retaliation evaluation on this step. |
| `sourceType` | `'attack' \| 'card' \| 'event' \| 'location' \| 'skill' \| 'investigation' \| 'retaliation' \| 'hp-cost'`. |
| `redirectChain` | Ordered list of visited player IDs already traversed by this damage event (cycle guard). |
| `redirectDepth` | Integer redirect hop counter bounded by `MAX_REDIRECT_CHAIN_DEPTH = 4`. |
| `anathemaRedirected` | Guard flag preventing double Anathema redirection on the same damage event. |
| `arnoldChecked` / `isArnoldReflection` | Guard flags ensuring Arnold evaluates at most once per damage step and reflected damage never triggers another Arnold reflection loop. |

Committed outcomes record an internal `DamageRedirectionTrace` (`originalAttackerPlayerId`, `originalTargetPlayerId`, `effectiveTargetPlayerId`, `sourceType`, `damageEventId`, `causationId`, `redirectChain`, `redirectDepth`, `preventionOutcome`, `actualHpLoss`, `eliminationAttributionPlayerId`) in `expansionState.damageTraces` (bounded to 64 entries, internal telemetry only — never projected publicly).

---

## 2. Exact Interaction Matrix (11 Mandatory Mechanics)

| # | Mechanic | Exact Ordering & Interaction with Damage Redirection |
|---|---|---|
| **1** | **Unpreventable / Self HP Costs** (`isHpCost` or `unpreventable`) | **Bypasses BOTH Anathema & Arnold completely.** Anathema's end-of-activation-turn 1 dmg, Ernest 2-HP cost, Victor 1-HP cost, and Charles self-cost always hit the actor directly. |
| **2** | **Anathema Curse (`exp1_anathema`)** | Runs at **Stage 0 (Pre-Defense)** of `executeDamageStep`. If Anathema is revealed & alive with an active living curse target not in `redirectChain` (`redirectDepth < 4`), redirects the damage event to `curseTargetId`, resetting target-specific defense flags (`urbanLegendChecked`, `undyingChecked`, `biancaChecked`) so the **cursed target's** full defense stack runs! Preserves `attackerPlayerId` & `originalAttackerPlayerId`. Marks original `damageEventId` as redirected (no duplicate damage on Anathema). |
| **3** | **Urban Legend (`exp2_urban_legend`)** | Runs on the **effective target** after Anathema redirect. If Anathema redirects a consumable Black card (`ev-07..ev-10`, `ev-12`) onto Urban Legend, Urban Legend can convert it to heal. |
| **4** | **Angel Aura (`exp1_angel`)** | Protects the **effective target** if revealed Neutral. If Anathema redirects damage onto a revealed Neutral covered by Angel, damage becomes `0`. |
| **5** | **Witch Immunity (`exp2_witch`)** | Runs on the **effective target**. If Anathema redirects damage onto a revealed Witch standing at Weird Woods (`corridor`), Witch takes `0`. |
| **6** | **Holy Robe (`eq-01`) & G43 (`exp2_g43`)** | Apply on the **effective target** (`Holy Robe` on `'attack'` sourceType; `G43` reduces all eligible HP dmg `>= 1` by 1). |
| **7** | **Undying (`exp1_undying`) & Bianca (`exp2_bianca`)** | Run on the **effective target** after Holy Robe / G43. Bianca may discard non-Masamune gear to cancel redirected single-target damage. |
| **8** | **Arnold Lethal Reflection (`exp1_arnold`)** | Runs at **Stage 4 (Post-Mitigation / Pre-HP-Commit)** when `postMitigationDmg >= arnold.hp`, `!arnold.skillUsedOnce`, valid living `attackerPlayerId !== arnoldId`, `!isArnoldReflection`, and `attackerPlayerId` not in `redirectChain`. Cancels damage to Arnold (HP unchanged!), marks `skillUsedOnce = true`, and enqueues 1 linked reflected `DAMAGE` step (`sourceType: 'skill'`, `isArnoldReflection: true`, `attackerPlayerId: arnoldId`, `targetPlayerId: origAttackerId`). |
| **9** | **Cindy Retaliation (`exp1_cindy`)** | Runs at **Stage 7 (`AFTER_DAMAGE_TRIGGERS`)** on the **effective target** that actually loses `>= 1` HP and survives. If Anathema redirects damage onto Cindy (survives), Cindy retaliates against the original attacker. If Arnold reflects lethal damage onto Cindy (survives), Cindy retaliates 1 dmg against Arnold! |
| **10** | **AoE Damage** (`Flare`, `Dynamite`, `Wrath`, `Umibozu`, `Machine Gun`) | Each AoE victim receives an independent `DAMAGE` step sharing `causationId`. If AoE hits BOTH Anathema and CurseTarget: CurseTarget takes its own AoE step once AND takes Anathema's redirected step once (`redirectChain: [anathemaId, curseTargetId]` prevents any bounce back). No extra hits beyond the 2 original AoE targets! |
| **11** | **Target Eliminated During Same Wave** | At the start of `executeDamageStep`, if `target` is already dead (`!target.alive`), the step exits cleanly with `0` damage, `0` duplicate elimination, `0` duplicate loot, and `0` duplicate victory check. If Anathema's curse target dies mid-wave, the curse immediately deactivates (`active: false`) so subsequent damage in the same wave hits Anathema normally. |

---

## 3. Termination & Non-Duplication Guarantees

- **Strict Visited-Set Monotonicity:** Every redirect adds the new target to `redirectChain` and rejects any target already in `redirectChain`. Since `|players| <= 8` and `MAX_REDIRECT_CHAIN_DEPTH = 4`, every damage event terminates in at most `4` hops.
- **Anathema ↔ Arnold Loop Proof:**
  - Case A: Attacker `X` hits `Anathema` (curse → `Arnold`) for lethal dmg. `redirectChain = [Anathema, Arnold]`. `Arnold` reflects to `X` (`redirectChain = [Anathema, Arnold, X]`). `X` is neither Anathema nor Arnold → terminates in 2 hops!
  - Case B: `Anathema` (curse → `Arnold`) casts `Flare` hitting `Arnold` for lethal dmg. `Arnold` reflects to `Anathema` (`redirectChain = [Arnold, Anathema]`). `Anathema`'s curse tries to redirect to `Arnold`, but `Arnold ∈ redirectChain` → **blocked (`cycle-or-visited`)**! Damage hits `Anathema` directly → terminates in 1 hop!
  - Case C: `Arnold A` attacks `Arnold B` for lethal dmg. `Arnold B` reflects with `isArnoldReflection: true`. Even if lethal to `Arnold A`, `isArnoldReflection === true` blocks re-reflection → terminates in 1 hop!
- **No Duplicate Loot or Elimination:** Original `damageEventId` is marked processed before enqueueing any linked reflected step, and redirection mutates zero HP on the bypassed victim.
