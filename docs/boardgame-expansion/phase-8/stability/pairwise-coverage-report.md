# Phase 8E — Risk-Weighted Pairwise & 3-Way Coverage Report

> **Source:** [`scripts/phase8e-interaction-matrix.cjs`](../../../../scripts/phase8e-interaction-matrix.cjs) + [`test/boardgame-phase8e-interactions.test.cjs`](../../../../test/boardgame-phase8e-interactions.test.cjs) + 520-match extended fuzzer.

## 1. Measured Pairwise Coverage Summary

| Metric | Measured Value |
|---|---:|
| Total unordered role pairs `C(66, 2)` | 2145 |
| Eligible overlapping-mechanic / shared-hook pairs (`score > 0`) | 598 |
| Critical pairs (`score >= 25`) — covered / total | **6 / 6** |
| High-risk pairs (`score >= 15`) — total | 72 |
| High-risk pairs covered by pre-8E tests | 30 |
| High-risk pairs newly covered by Phase 8E deterministic tests | **+26** |
| High-risk pairs total deterministically covered | **56 / 72** |
| High-risk pairs remaining without dedicated deterministic test (exercised only via fuzz co-occurrence) | **16** |
| Distinct unordered pairs co-occurring in 520-match stateful fuzz run | 1746 / 2145 |

## 2. Mandatory Critical Interaction Families (A–E) — Deterministic Assertions

| Family | Mandatory Combinations Asserted | Test Reference | Result |
|---|---|---|---|
| **A. Voodoo + Turn Ownership** | Voodoo + Felicia (White draw choice ownership & privacy), Voodoo + Gloria (2-card Church queue), Voodoo + Cruz (Black redraw ownership), Voodoo + Father Harrison (BUG-8B-09 guard), Voodoo + private `inv-*` pause/resume, Voodoo + Lloyd out-of-turn interrupt, Voodoo + mid-turn victim elimination | `8E2-A` | **PASS** |
| **B. Resurrection + Elimination** | Undead + Gideon (dormant=0 draws, permanent=3 draws), Undead + Vengeful Spirit, Undead + Antimony, Undead + Bonnie (dormant no convert, permanent converts), Undead + Cain, Undead + simultaneous Flare multi-lethal, Undead as last Shadow blocking premature Hunter win (kills `MUT-08`) | `8E2-B` | **PASS** |
| **C. Damage Resolution** | Anathema + Arnold (redirect→reflect bounded chain), Anathema + Wrath (turn-start AoE redirect), Arnold + Cindy (reflect→after-damage), Lloyd + Machine Gun (pre-roll 0-RNG multi-target cancel), Witch + G43 + Holy Robe mitigation clamping, Redirection + elimination + Gideon on-kill trigger | `8E2-C` | **PASS** |
| **D. Copied Skill & Victory** | Vengeful Spirit copying Gideon + `eq-13` Advent (`BUG-8E-02`), Antimony copying Gideon + `eq-14` Chocolate (`BUG-8E-02`), Antimony copying Undead lifecycle resurrection, Bethany + Diana transitive `SHARE_OUTCOME`, Bethany↔Diana & Cassie↔Clairvoyant cycle guard, Vengeful Spirit using dead George's 1d4 skill post-death | `8E2-D` | **PASS** |
| **E. Dynamic Faction & Alliance** | Bonnie + Cain (Shadow death accounting), Bonnie + N.C. Soldier (conversion blocks recruit & alliance win), Bonnie + Cassie/Diana (no bind after Shadow conversion), simultaneous `ev-08` Spider endgame, Cain multi-faction dual victory + Bipolar + Allie simultaneous winners | `8E2-E` | **PASS** |

## 3. High-Risk Uncovered Pairs (Explicit Honest Backlog)

The following **16** high-risk pairs (`score >= 15`) do not yet have dedicated standalone deterministic pairwise assertions (though all participating roles are individually verified and included in the 8 risk-weighted fuzzer rosters):

| Pair | Risk Score | Overlapping Mechanics | Eligibility Note |
|---|---:|---|---|
| `exp1_vengeance` × `exp1_voodoo` (Vengeance × Voodoo) | 23 | turn_ownership×private_pending_choice, turn_ownership×elimination_triggers, turn_ownership×reveal_events | Eligible in 4P–8P |
| `exp1_wendigo` × `exp1_voodoo` (Wendigo × Voodoo) | 23 | turn_ownership×private_pending_choice, turn_ownership×elimination_triggers, turn_ownership×reveal_events | Eligible in 4P–8P |
| `lang-tien-phong` × `exp1_undead` (Daniel × Undead) | 21 | resurrection×elimination_triggers, resurrection×immediate_victory, hook:ON_ELIMINATION | Eligible in 4P–8P |
| `lang-cuu-ho` × `exp1_undead` (Charles × Undead) | 18 | resurrection×elimination_triggers, resurrection×immediate_victory | Eligible in 4P–8P |
| `exp1_undead` × `exp2_dalton` (Undead × Dalton) | 18 | resurrection×elimination_triggers, resurrection×immediate_victory | Eligible in 4P–8P |
| `exp1_undead` × `exp2_cruz` (Undead × Cruz) | 18 | resurrection×elimination_triggers, resurrection×immediate_victory | Eligible in 4P–8P |
| `exp1_undead` × `exp2_arlene` (Undead × Arlene) | 18 | resurrection×elimination_triggers, resurrection×immediate_victory | Eligible in 4P–8P |
| `exp1_voodoo` × `exp1_wrath` (Voodoo × Wrath) | 17 | turn_ownership×private_pending_choice, turn_ownership×reveal_events, hook:ON_TURN_START | Eligible in 4P–8P |
| `exp1_voodoo` × `exp1_bipolar` (Voodoo × Bipolar) | 17 | turn_ownership×private_pending_choice, turn_ownership×reveal_events, hook:ON_TURN_START | Eligible in 4P–8P |
| `exp1_voodoo` × `exp1_anathema` (Voodoo × Anathema) | 17 | turn_ownership×private_pending_choice, turn_ownership×reveal_events, hook:ON_TURN_START | Eligible in 4P–8P |
| `exp1_voodoo` × `exp1_bethany` (Voodoo × Bethany) | 17 | turn_ownership×private_pending_choice, turn_ownership×reveal_events, hook:ON_TURN_START | Eligible in 4P–8P |
| `exp1_voodoo` × `exp1_clairvoyant` (Voodoo × Clairvoyant) | 17 | turn_ownership×private_pending_choice, turn_ownership×reveal_events, hook:ON_TURN_START | Eligible in 4P–8P |
| `exp1_voodoo` × `exp2_visions` (Voodoo × Visions) | 17 | turn_ownership×private_pending_choice, turn_ownership×reveal_events, hook:ON_TURN_START | Eligible in 4P–8P |
| `exp1_gwendolen` × `exp1_arnold` (Gwendolen × Arnold) | 16 | damage_reflection×immunity_prevention, damage_reflection×damage_reflection | Eligible in 4P–8P |
| `exp1_undying` × `exp1_arnold` (Undying × Arnold) | 16 | damage_reflection×immunity_prevention, immunity_prevention×immunity_prevention, hook:BEFORE_DAMAGE | Eligible in 4P–8P |
| `exp1_arnold` × `exp2_urban_legend` (Arnold × Urban Legend) | 16 | damage_reflection×immunity_prevention, immunity_prevention×immunity_prevention, hook:BEFORE_DAMAGE | Eligible in 4P–8P |

## 4. Unreachable / Illegal Pair Constraints Documented

- **4P deal constraint:** `getRoleDistribution(4)` deals `2H / 2S / 0N`; all `C(25, 2) = 300` Neutral×Neutral pairs are unreachable in 4P.
- **5P deal constraint:** `getRoleDistribution(5)` deals `2H / 2S / 1N` and explicitly excludes `exp2_nc_soldier`; all Neutral×Neutral pairs and any `exp2_nc_soldier` pair are unreachable in 5P.
- **Pack isolation:** `expansion-1` only pairs cannot legally co-occur with `expansion-2` only roles outside `full-expansion`.
