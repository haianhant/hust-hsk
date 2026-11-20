# Bóng Đêm KTX — Phase 5C Report: Eight Tier-3 Characters & `starter-thirty-eight`

- **Date:** 2026-11-20
- **Milestone:** Phase 5C (`Ernest`, `Gwendolen`, `Freyja`, `Warlord`, `Usurper`, `Angel`, `Bianca`, `Dalton` + `starter-thirty-eight` experimental ruleset)
- **Catalog Version:** `2026.11-p5c`
- **Production Lock:** `starter-thirty-eight` is strictly experimental (`enabledInProduction: false`), rejected on production with `RULESET_UNAVAILABLE` unless `ALLOW_EXPERIMENTAL_RULESETS=1`.

---

## 1. Delivered Tier-3 Characters (8/8)

| Role ID | Name | Pack | Faction | HP | Primary Mechanism | Execution Binding | Victory Binding |
|---|---|---|---|---:|---|---|---|
| `exp1_ernest` | Ernest | Exp 1 | Hunter | 10 | 2-HP cost (requires ≥ 3 HP), force-reveal living Shadows & discard all Shadow gear; emits `ROLE_REVEALED_TRIGGERS` | `exp:exp1_ernest:apostasy` | `victory-engine.ts:faction#hunters` |
| `exp1_gwendolen` | Gwendolen | Exp 1 | Hunter | 14 | Non-recursive counterattack for revealed Hunter/Neutral in same cluster (`preRevealed` privacy rule) | `exp:exp1_gwendolen:shelter` | `victory-engine.ts:faction#hunters` |
| `exp2_freyja` | Freyja | Exp 2 | Hunter | 12 | Sequential equipment discard (excludes `Masamune`) for bonus attacks with full target/Udi/Machine Gun validation | `exp:exp2_freyja:reckless-assault` | `victory-engine.ts:faction#hunters` |
| `exp2_warlord` | Warlord | Exp 2 | Shadow | 14 | `ROLL_MOVE` pull to exact location + single-target bonus attack, then resume normal `ROLL_MOVE` (1/match) | `exp:exp2_warlord:war-pull` | `victory-engine.ts:faction#shadows` |
| `exp2_usurper` | Usurper | Exp 2 | Shadow | 11 | Continuous `'skill'`/`'white-card'` heal-block aura + hidden P0 secret interception respecting `reactionPolicy` | `exp:exp2_usurper:usurp-heal` | `victory-engine.ts:faction#shadows` |
| `exp1_angel` | Angel | Exp 1 | Neutral | 8 | `armed → active → expired` Neutral immunity aura; end-of-match win (all Neutrals alive OR exact `lobby` Church) | `exp:exp1_angel:guardian-wings` | `victory-engine.ts:conditional#angel` |
| `exp2_bianca` | Bianca | Exp 2 | Neutral | 10 | Non-Masamune gear discard prevents single-target damage (`isSingleTarget: true` only); lowest-HP survivor win (ties win) | `exp:exp2_bianca:scrap-shield` | `victory-engine.ts:neutral#bianca` |
| `exp2_dalton` | Dalton | Exp 2 | Neutral | 13 | Forced reveal at ≤ 12 remaining HP + self-heal block; immediate kill win after activation OR highest-HP survivor win | `exp:exp2_dalton:twelfth-round` | `victory-engine.ts:conditional#dalton` |

---

## 2. Cumulative Roster & Catalog Partition

- **Playable in `starter-thirty-eight`:** **48 characters** (`18 Hunter · 18 Shadow · 12 Neutral`) = `10 Classic + 38 Expansion` (`16 Exp1 · 22 Exp2`).
- **Remaining Unimplemented in Catalog:** **18 characters** (`2 Hunter · 3 Shadow · 13 Neutral`; `10 Exp1 · 8 Exp2`) — strictly `rulesStatus: "needs-clarification"`, `implementationStatus: "not-started"`, `skillImpl: null`, `victoryImpl: null`.

---

## 3. UI & Cross-Character Verification (`test/boardgame-phase5c.test.cjs`)

- Added `ROLE_VISUAL_META` for all 12 Phase 5 roles, `ActionPanel.tsx` skill lock checks (`Elise`, `Ernest`, `Warlord`, `Angel`), non-leaking public status badges (`Angel Aura`, `Usurper Aura`, `Dalton Vòng 12`), and the private `reactionPolicy` toggle bar (`SET_REACTION_PREF`, hidden in Classic).
- Verified all 17 mandatory Section 18 cross-character interaction scenarios in `test/boardgame-phase5c.test.cjs` (`P5C-1` through `P5C-9`).
