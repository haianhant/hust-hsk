# Phase 8F-3 — Copied Skill × Card Eligibility & Reveal Restrictions Audit

> **Audited Files:** [`features/boardgame/domain/expansion-skills.ts`](../../../../features/boardgame/domain/expansion-skills.ts), [`features/boardgame/domain/dynamic-skill-copy.ts`](../../../../features/boardgame/domain/dynamic-skill-copy.ts), [`features/boardgame/domain/roles.ts`](../../../../features/boardgame/domain/roles.ts), [`features/boardgame/domain/effects.ts`](../../../../features/boardgame/domain/effects.ts)
> **Regression Suite:** `8F3-B1`, `8F3-B2`, `8F3-B3` in [`test/boardgame-phase8f-continuation-copy.test.cjs`](../../../../test/boardgame-phase8f-continuation-copy.test.cjs)
> **Mutation Proof:** `MUT-13`, `MUT-14`, `MUT-15` KILLED in [`scripts/phase8e-mutation-test.cjs`](../../../../scripts/phase8e-mutation-test.cjs)

---

## 1. Audit Matrix Across All 8 Dimensions

| # | Dimension | Expected Rule / Contract | Implementation Verification | Status |
|---|---|---|---|---|
| 1 | **Effective Faction Card Restrictions (`eq-13` Advent, `ev-13` Diabolic Ritual)** | Must evaluate `getEffectiveFaction(state, actor)` — copying a Hunter/Shadow skill does **NOT** change the copier's faction (`Vengeful Spirit` stays Shadow; `Antimony` stays Neutral). | `expansion-skills.ts` (`eq_advent:5202`, `ev_diabolic_ritual:5302`, `GIDEON_DRAW_WHITE_CARD:10237`) all use `getEffectiveFaction(state, actor)`. Verified in `8F3-B3`. | **PASS** |
| 2 | **Base-Role Initial Rule (`eq-14` Chocolate — A/E/U)** | Must check the player's **base `actor.roleId`** (NOT `effectiveSkillRoleId`!): Shadow `Vengeful Spirit` (`V`) copying `Allie` (`A`) MUST NOT heal; Neutral `Antimony` (`A`) copying `Vampire` (`V`) STILL heals. | `isEligibleForChocolateHeal(actor.roleId, true)` in `expansion-skills.ts:5252` & `10295` uses base `roleId`. Verified in `8F3-B3`. | **PASS** |
| 3 | **Reveal Restrictions on Self-Reveal Cards (`eq-13` Advent & `eq-14` Chocolate)** | Unrevealed `Undead` (`'U'`, pre-lethal reveal forbidden) MUST NOT reveal/heal via `eq-14`; unrevealed `Fallen` (`< 8 HP` voluntary reveal forbidden) MUST NOT reveal/heal via `eq-13`; Voodoo controller MUST NOT reveal hidden victim (`BUG-8B-01`). | **DEFECT FOUND (`BUG-8F-01`, P1):** `eq_chocolate` omitted `isUndeadPreLethalRevealRestricted(state, actor)` and `eq_advent` omitted `actor.roleId === 'exp1_fallen' && !actor.revealed && getRemainingHp(actor) < 8`. Both failed deterministically in pre-fix `8F3-B1`, now **FIXED** (`expansion-skills.ts:5196–5251`) and guarded by `MUT-13` & `MUT-14`. | **FIXED (P1)** |
| 4 | **Copied Classic Active Skill Dispatch (`gac-truc-ban` / Emi)** | `dynamic-skill-copy.ts:89` marks `gac-truc-ban` (Emi — Teleport) as `FULL_DIRECT` copyable. `Vengeful Spirit` and `Antimony` copying Emi MUST be able to execute `USE_SKILL` in `ROLL_MOVE`. | **DEFECT FOUND (`BUG-8F-02`, P1):** `applyExpandedUseSkill()` excluded `'gac-truc-ban'` (returning `null`), causing fallback to Classic `resolveUseSkill()` which switched on `actor.roleId` (`targetMode: 'passive'`) and always rejected! Reproduced FAIL-first in `8F3-B2`, now **FIXED** (`expansion-skills.ts:7269, 7306–7335`) and guarded by `MUT-15`. | **FIXED (P1)** |
| 5 | **Heal Blockers (`Usurper` aura, `Dalton` heal block)** | Copied healing skills (e.g., Vengeful Spirit copying Allie `lang-quan-sat`) MUST route through `HealPipeline` so revealed Usurper blocks skill heals while still consuming copied `oncePerMatch`; Black card `ev-13` remains unblocked by Usurper. | Verified in `8F3-B3a` (Usurper blocks VS's copied Allie skill heal, consumes `oncePerMatch`, while `ev-13` still heals VS). | **PASS** |
| 6 | **Equipment Restrictions (`eq-04` Spear, `eq-05` Silver Rosary, `eq-01` Holy Robe)** | Copying a Hunter skill does NOT grant Hunter-only `+2` Spear bonus; `computeRawAttackDamage` (`expansion-skills.ts:1423`) checks `actor.faction === 'lantern-guard'`. | Verified: currently no role converts to/from `lantern-guard` (Bonnie only converts to `mist-order`, N.C. Soldier alliance keeps base factions), so `actor.faction === 'lantern-guard'` is equivalent to `getEffectiveFaction`. Noted as clean defensive observation (no behavior bug). | **PASS** |
| 7 | **Copied Usage Limits (`oncePerMatch`, cooldown) & Provenance** | `CopiedSkillBinding` stores isolated `copiedSkillUsedOnce` / `copiedSkillCooldown` and `provenanceChain` (e.g. `['exp1_vengeful_spirit', 'lang-quan-sat']`), rejecting 2nd activation after 1st use even when blocked by Usurper. | Verified in `8F3-B3a` (`hasEffectiveSkillUsedOnce` transitions `false → true`, 2nd `USE_SKILL` rejected with `ok: false`). | **PASS** |
| 8 | **Copied `PendingChoice` Ownership & `bryon_gift_equipment` Observation** | Pending choices created by copied skills are strictly owned by the copier (`ownerPlayerId === copier.playerId`). Note: `bryon_gift_equipment` (`expansion-skills.ts:11759`) checks `recipient.faction === 'wanderer'`, but `openBryonGiftChoice` already filters strictly by `getEffectiveFaction(state, p) === 'wanderer'` synchronously before opening the choice (no conversion can happen while a choice is pending). | No exploitable defect; documented as non-bug defense observation to avoid unnecessary code churn. | **PASS** |

---

## 2. Pre-Fix Reproduction Evidence

Running `node --test test/boardgame-phase8f-continuation-copy.test.cjs` **before** patching `expansion-skills.ts` produced deterministic failures confirming both P1 defects:
- `8F3-B1` FAILED: `AssertionError: BUG-8F-01a: Unrevealed Undead MUST NOT bypass pre-lethal reveal restriction via eq-14 Chocolate! (actual: true, expected: false)`.
- `8F3-B2` FAILED: `AssertionError: BUG-8F-02: exp1_vengeful_spirit copying gac-truc-ban (Emi) MUST execute Teleport USE_SKILL: Vengeful Spirit sở hữu kỹ năng nội tại tự động. (actual: false, expected: true)`.

Post-fix: **8/8 PASS** in `test/boardgame-phase8f-continuation-copy.test.cjs` and **16/16 KILLED** in `scripts/phase8e-mutation-test.cjs`.
