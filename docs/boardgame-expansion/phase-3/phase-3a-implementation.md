# Phase 3A — Wave 2 Gameplay Implementation Report

- **Milestone:** Phase 3A — Rules Ratification & Gameplay Implementation
- **New Experimental Pool:** `starter-sixteen` (`26` total characters: `10 Classic` + `8 Phase 2` + `8 Phase 3 Wave 2` = `10 Hunter`, `10 Shadow`, `6 Neutral`)
- **Production Ruleset Lock:** Strictly `classic`-only (`starter-four`, `starter-eight`, `starter-sixteen`, `expansion-1`, `expansion-2`, `full-expansion` all blocked in production).

---

## 1. Shared Engine Infrastructure Added

1. **Single-Source `LocationAlias` (`features/boardgame/domain/rules.ts`):**
   - `EXPANSION_LOCATION_ALIASES`: `church -> lobby`, `weird_woods -> corridor`, `erstwhile_altar -> court`.
   - `resolveLocationAlias(alias)` & `isPlayerAtExactLocationAlias(player, alias)` cleanly separate **exact location** from **cluster** (`areInSameCluster`), preventing single-location skills from misfiring across paired locations.
2. **Standardized 9-Step Damage & Retaliation Pipeline (`features/boardgame/domain/types.ts`, `expansion-skills.ts`):**
   - Added `'card'` and `'retaliation'` to `DamageSourceKind`, plus `causationId` and `isRetaliation` flags on `DAMAGE` steps and a dedicated `AFTER_DAMAGE_TRIGGERS` continuation step.
   - Prevents infinite reaction chains (`isRetaliation` / `sourceType === 'retaliation'` never triggers Cindy again or Werewolf counterattack) and prevents double-application of outgoing modifiers (`Unchained`, `Warlock`, `Elysia`, `Victor`) when resuming from pending choices.
3. **Neutral Victory Evaluators in `VictoryEngine` (`features/boardgame/domain/victory-engine.ts`):**
   - Added `evaluateExpandedVictory(state)` invoked exclusively for non-`classic` rulesets (keeping `victory.ts` 100% untouched for Classic).
   - Evaluates **Cindy** (solo instant trigger when `otherNeutrals.length > 0` and all other Neutrals dead; 5P single-Neutral co-win fallback when surviving to match end) and **Bipolar** (post-match conditional evaluation: alive on Hunter win OR dead on Shadow win; never wins on another Neutral solo win).
4. **Authoritative Sequential Card Queue (`gloriaQueuedCards`):**
   - Persisted directly inside `state.expansionState` (100% JSON-serializable for Cloudflare Durable Object SQLite hibernation & reconnect) so Gloria's 2nd White card never forces simultaneous immediate target selection.

---

## 2. Implemented Wave 2 Characters (8/8)

| Role ID | Name | Faction | HP | Rules Status | Skill Handler | Victory Binding |
|---|---|---|---:|---|---|---|
| `exp1_elysia` | Elysia | Hunter | 10 | `house-rule-approved` | `exp:exp1_elysia:counterattack` (`BEFORE_DAMAGE`) | `victory-engine.ts:faction#hunters` |
| `exp2_unchained` | Unchained | Shadow | 11 | `house-rule-approved` | `exp:exp2_unchained:endless-violence` (`BEFORE_DAMAGE`) | `victory-engine.ts:faction#shadows` |
| `exp2_warlock` | Warlock | Shadow | 14 | `house-rule-approved` | `exp:exp2_warlock:power-source` (`BEFORE_DAMAGE`) | `victory-engine.ts:faction#shadows` |
| `exp2_witch` | Witch | Shadow | 14 | `house-rule-approved` | `exp:exp2_witch:no-place-like-home` (`BEFORE_DAMAGE`) | `victory-engine.ts:faction#shadows` |
| `exp2_father_harrison` | Father Harrison | Hunter | 12 | `house-rule-approved` | `exp:exp2_father_harrison:sunday-service` (`ON_MOVE`) | `victory-engine.ts:faction#hunters` |
| `exp2_gloria` | Gloria | Hunter | 14 | `house-rule-approved` | `exp:exp2_gloria:mighty-blessing` (`ON_DRAW_CARD`) | `victory-engine.ts:faction#hunters` |
| `exp1_cindy` | Cindy | Neutral | 11 | `house-rule-approved` | `exp:exp1_cindy:nightmare` (`AFTER_DAMAGE`) | `victory-engine.ts:neutral#cindy` |
| `exp1_bipolar` | Bipolar | Neutral | 10 | `house-rule-approved` | `exp:exp1_bipolar:fate-coin` (`ON_TURN_START`) | `victory-engine.ts:conditional#bipolar` |

---

## 3. UI & VFX Gameplay Integration (Phase 3A)

- `ActionPanel.tsx`: Generic `bg-pending-choice-panel` supports all 3 new `BoardGamePendingChoiceKind` values (`elysia_counter_boost`, `cindy_reveal_retaliate`, `bipolar_fate_coin`); added `skillLockReason` validation for `exp2_father_harrison` (blocks staying in `lobby` or after starting dice roll) and `exp1_bipolar` (start-of-turn `ROLL_MOVE` only).
- `RoleCard.tsx` & `BoardGameArt.tsx`: Added complete `ROLE_VISUAL_META` and skill status badges for all 8 Wave 2 roles.
- `vfx-queue.ts`: Added P0-safe (`revealedRoleId`-gated) VFX triggers for Witch immunity (`MIỄN ST`), Cindy retaliation (`COUNTER_STRIKE`), Elysia/Unchained/Warlock bonus strikes, and Father Harrison/Gloria/Bipolar utility effects.
- Portraits for the 8 Wave 2 roles cleanly render Noir Monogram fallbacks until Milestone 3B delivers the 8 real Anime Noir WebP assets.
