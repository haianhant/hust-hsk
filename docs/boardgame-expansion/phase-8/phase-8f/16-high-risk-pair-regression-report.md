# Phase 8F-2 — 16 Historical Uncovered High-Risk Role Pairs Regression Report

> **Suite:** [`test/boardgame-phase8f-16-pairs.test.cjs`](../../../../test/boardgame-phase8f-16-pairs.test.cjs) (**18/18 tests PASS**, incl. `8F1-ELIG` + 16 deterministic pair tests + real SQLite DO E2E reconnect test `8F2-C-DO`)
> **Evidence Registry:** [`scripts/phase8f-interaction-evidence.cjs`](../../../../scripts/phase8f-interaction-evidence.cjs)
> **Strict Legal Deal Enforcement:** Every scenario uses `makeLegalScenario()` validating real `DEFAULT_RULESET_REGISTRY` pack pools and `getRoleDistribution(playerCount)` (4P `2H/2S/0N`, 5P `2H/2S/1N`, no 5P `exp2_nc_soldier`).

---

## 1. Summary Result

All **16 / 16** historical uncovered high-risk pairs (`score >= 15`) from Phase 8E [`pairwise-coverage-report.md`](../stability/pairwise-coverage-report.md#L33-L50) are now deterministically verified with positive, negative/decline, timeout, privacy, and full invariant checks (`checkGameStateInvariants(..., { checkSerialization: true })`):

- **`15` pairs** promoted to `INTERACTION_ASSERTED`
- **`1` pair (`exp1_voodoo × exp1_clairvoyant`)** promoted to `DO_E2E_ASSERTED` (verified both in unit `8F2-C5` and end-to-end across real SQLite DO disconnect + hibernation + F5 reconnect in `8F2-C-DO`)
- **Zero** invariant failures, **zero** leaked private clues, **zero** orphaned `TurnControlGrant`s, **zero** infinite reflect/counter loops.

---

## 2. Group-by-Group Traceable Verification Matrix

### Group A — Voodoo + Elimination Triggers (`#1–#2`)

| # | Pair | Score | Legal Rulesets / Seats | Test Case ID | Evidence Tier | Behavioral Outcomes Asserted |
|---:|---|---:|---|---|---|---|
| 1 | `exp1_voodoo × exp1_vengeance` (Voodoo × Vengeance) | 23 | `expansion-1`, `full-expansion` · 4P–8P | `8F2-A1` | `INTERACTION_ASSERTED` | Hijacked Vengeance retains kill credit & owns `vengeance_chain_strike`; controller Voodoo rejected on `RESOLVE_CHOICE`; Vengeance chaining onto Voodoo kills Voodoo and immediately cancels active `TurnControlGrant` with zero duplicated events; decline & choice timeout preserve `oncePerMatch` and finish hijacked turn cleanly. |
| 2 | `exp1_voodoo × exp1_wendigo` (Voodoo × Wendigo) | 23 | `expansion-1`, `full-expansion` · 4P–8P | `8F2-A2` | `INTERACTION_ASSERTED` | Hijacked kill triggers secret `wendigo_reveal_heal` owned by Wendigo; `getPrivateGameView(voodoo)` & `getPublicGameView()` leak ZERO identity/prompt details; accept reveals & heals exact 1 HP once; decline & timeout leak zero role info and complete hijacked turn without stuck state. |

### Group B — Undead + Immediate Victory (`#3–#7`)

| # | Pair | Score | Legal Rulesets / Seats | Test Case ID | Evidence Tier | Behavioral Outcomes Asserted |
|---:|---|---:|---|---|---|---|
| 3 | `exp1_undead × lang-tien-phong` (Undead × Daniel) | 21 | `expansion-1`, `full-expansion` · **5P–8P** | `8F2-B1` | `INTERACTION_ASSERTED` | 1st lethal on Undead creates `DORMANT_PENDING_REVIVE` leaving `firstDeadPlayerId === null` and Daniel hidden; Daniel dying while Undead is dormant wins immediately as 1st committed death; 2nd lethal on revived Undead commits `FINAL_ELIMINATED` and triggers Daniel Scream exactly once. |
| 4 | `exp1_undead × lang-cuu-ho` (Undead × Charles) | 18 | `expansion-1`, `full-expansion` · **5P–8P** | `8F2-B2` | `INTERACTION_ASSERTED` | With 2 prior dead players, Charles's 1st lethal on Undead causes dormancy WITHOUT reaching `deadCount >= 3` or `charlesKillWon`; 2nd lethal on revived Undead commits `deadCount = 3` and triggers Charles immediate victory exactly once. |
| 5 | `exp1_undead × exp2_dalton` (Undead × Dalton) | 18 | `full-expansion` · **5P–8P** | `8F2-B3` | `INTERACTION_ASSERTED` | Activated Dalton (`12th Round`) 1st lethal on Undead creates dormancy with ZERO Dalton kill credit (`daltonKillWinTriggeredIds` empty); 2nd lethal on revived Undead appends Dalton once and commits immediate victory. |
| 6 | `exp1_undead × exp2_cruz` (Undead × Cruz) | 18 | `full-expansion` · **5P–8P** | `8F2-B4` | `INTERACTION_ASSERTED` | Cruz damaging Black card (`ev-07`) 1st lethal on Undead creates dormancy with ZERO Cruz win trigger; `ev-08` 2nd lethal on revived Undead triggers `cruzWinTriggeredIds` once and commits immediate victory. |
| 7 | `exp1_undead × exp2_arlene` (Undead × Arlene) | 18 | `full-expansion` · **5P–8P** | `8F2-B5` | `INTERACTION_ASSERTED` | Hunter `eq-12` Flare hitting last-Shadow Undead (dormant) + Arlene (dead) grants Arlene solo immediate win WITHOUT premature Hunter co-win; revived Shadow Undead killing Arlene does NOT satisfy Arlene's Hunter-kill condition. |

### Group C — Voodoo + Start-of-Turn Skills + Real DO Reconnect (`#8–#13`)

| # | Pair | Score | Legal Rulesets / Seats | Test Case ID | Evidence Tier | Behavioral Outcomes Asserted |
|---:|---|---:|---|---|---|---|
| 8 | `exp1_voodoo × exp1_wrath` (Voodoo × Wrath) | 17 | `expansion-1`, `full-expansion` · 4P–8P | `8F2-C1` | `INTERACTION_ASSERTED` | Start-of-hijacked-turn `wrath_turn_start_aoe` owned by Wrath; Voodoo rejected on `RESOLVE_CHOICE` & `USE_SKILL`; AoE killing 1-HP Voodoo cancels grant immediately; decline & timeout return control to Voodoo and expire grant cleanly on `END_TURN`. |
| 9 | `exp1_voodoo × exp1_bipolar` (Voodoo × Bipolar) | 17 | `expansion-1`, `full-expansion` · **5P–8P** | `8F2-C2` | `INTERACTION_ASSERTED` | `bipolar_fate_coin` owned by Bipolar; Voodoo rejected; deterministic self-kill cancels grant & advances turn cleanly; heal / decline / timeout preserve `oncePerMatch` and grant lifecycle. |
| 10 | `exp1_voodoo × exp1_anathema` (Voodoo × Anathema) | 17 | `expansion-1`, `full-expansion` · **5P–8P** | `8F2-C3` | `INTERACTION_ASSERTED` | Revealed Anathema owns `anathema_curse_target` and still takes unpreventable 1 HP end-of-turn cost when Voodoo ends hijacked turn; hidden Anathema emits no start-of-turn prompt and Voodoo is blocked on `REVEAL_ROLE` & `USE_SKILL`. |
| 11 | `exp1_voodoo × exp1_bethany` (Voodoo × Bethany) | 17 | `expansion-1`, `full-expansion` · **5P–8P** | `8F2-C4` | `INTERACTION_ASSERTED` | `bethany_designate_chosen` owned by Bethany; Voodoo rejected on `RESOLVE_CHOICE` and `TRANSFER_TO_BETHANY`; accept transfers equipment atomically; timeout preserves equipment and returns hijacked turn cleanly. |
| 12 | `exp1_voodoo × exp1_clairvoyant` (Voodoo × Clairvoyant) | 17 | `expansion-1`, `full-expansion` · **5P–8P** | `8F2-C5` + `8F2-C-DO` | **`DO_E2E_ASSERTED`** | `clairvoyant_peek_copy` owned by Clairvoyant; private peek clue strictly isolated from Voodoo (`privateView.privateClues` & `publicView`); **real SQLite DO test (`8F2-C-DO`)** disconnects victim mid-choice, hibernates DO, F5-reconnects victim, verifies Voodoo rejection, Clairvoyant resolution, clue privacy, and clean grant expiry. |
| 13 | `exp1_voodoo × exp2_visions` (Voodoo × Visions) | 17 | `full-expansion` · 4P–8P | `8F2-C6` | `INTERACTION_ASSERTED` | `visions_mark_target` owned by Visions; Voodoo cannot attack Visions's marked target during hijack; persistent turn-start mark tick killing 1-HP Voodoo cancels grant immediately so Visions regains turn control cleanly. |

### Group D — Arnold + Damage Prevention (`#14–#16`)

| # | Pair | Score | Legal Rulesets / Seats | Test Case ID | Evidence Tier | Behavioral Outcomes Asserted |
|---:|---|---:|---|---|---|---|
| 14 | `exp1_arnold × exp1_gwendolen` (Arnold × Gwendolen) | 16 | `expansion-1`, `full-expansion` · **5P–8P** | `8F2-D1` | `INTERACTION_ASSERTED` | Gwendolen's lethal counterattack (`gwendolen_counter_attack`) opens secret `arnold_reflect_lethal`; Arnold survives at exact `1 HP`, reflects damage onto Gwendolen with zero repeated counter/reflection loop; non-lethal Gwendolen counter never opens Arnold reflection. |
| 15 | `exp1_arnold × exp1_undying` (Arnold × Undying) | 16 | `expansion-1`, `full-expansion` · **5P–8P** | `8F2-D2` | `INTERACTION_ASSERTED` | Deterministic `BEFORE_DAMAGE` priority: Arnold reflects 2 lethal damage onto hidden 2-HP Undying → Undying opens `undying_reduce_damage`, reduces `2→1`, and survives at `>= 1 HP`; Undying declining reduction dies cleanly once with zero loop. |
| 16 | `exp1_arnold × exp2_urban_legend` (Arnold × Urban Legend) | 16 | `full-expansion` · **5P–8P** | `8F2-D3` | `INTERACTION_ASSERTED` | Arnold reflecting Urban Legend's `ev-07` lethal produces `sourceType: 'skill'` (so Urban Legend does NOT convert reflected damage to heal) while Arnold keeps exact `2 HP`; conversely, hidden Urban Legend receiving Arnold's lethal `ev-07` converts Black card into `+2 HP` heal at `BEFORE_DAMAGE` before lethal check; non-lethal `ev-07` never opens Arnold reflection. |

---

## 3. Defects Found While Testing the 16 Pairs

Zero gameplay defects were discovered in the 16 interaction pairs themselves — all 16 pairs functioned cleanly under strict legal seat distribution, turn-control privacy, lifecycle dormancy, and `BEFORE_DAMAGE` ordering invariants. (All 3 confirmed Phase 8F P1 defects were uncovered during the Phase 8F-3 Card Continuation & Copied-Skill audits — see [`bug-register.md`](./bug-register.md).)
