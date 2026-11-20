# Bóng Đêm KTX — Phase 5 Final Handoff (`Wave 4 / starter-thirty-eight`)

- **Date:** 2026-11-21
- **Branch:** `main`
- **Completed Phase 5 Milestones (5 Sequential Commits):**
  - **Phase 5A (`9ffcb3e`):** Ratified Wave 4 rules (`phase-5-scope.md`, `rules-decisions.md`), implemented 5 shared zero-regression engine foundations (`CAP-04` `heal-pipeline.ts`, `CAP-05` private `SET_REACTION_PREF` unicast sync without revision bump, `CAP-06` bounded reaction chains `MAX_PENDING_STEPS_DRAIN=96` & `MAX_REACTION_CHAIN_DEPTH=6`, `CAP-07` extended Neutral victory primitives, `CAP-10` canonical black-damage & white-heal card sets; `engine-foundations.md`), added `test/boardgame-phase5a.test.cjs` (5/5 PASS).
  - **Phase 5B (`ae3d7df`):** Closed out the **last 4 Tier-2 characters** (`Elise`, `Umibozu`, `Urban Legend`, `Arlene`), added `test/boardgame-phase5b.test.cjs` (5/5 PASS) & `phase-5b-tier2-report.md`.
  - **Phase 5C (`aa0a84b`):** Implemented **8 Tier-3 characters** (`Ernest`, `Gwendolen`, `Freyja`, `Warlord`, `Usurper`, `Angel`, `Bianca`, `Dalton`), created `starter-thirty-eight` experimental ruleset (**48 playable**: `18H / 18S / 12N`, `enabledInProduction: false`, `BOARD_GAME_CATALOG_VERSION = '2026.11-p5c'`), synced catalog (`38` implemented / `18` strictly locked), integrated `ActionPanel.tsx` skill locks + public aura badges + private `SET_REACTION_PREF` HUD toggle, added `test/boardgame-phase5c.test.cjs` (9/9 PASS covering all 17 mandatory cross-character interactions) & `phase-5c-tier3-report.md`.
  - **Phase 5D (`b228ac2`):** Generated & visually inspected **12 original `HUSTVerse Midnight — Anime Noir` portraits** (`1024×1536` WebP, `84.6–152.4 KB`, **48/48 unique SHA-256**), built Contact Sheet & `asset-manifest.json`, restored strict `48/48` `MIDNIGHT_CHARACTER_ART`, added Prototype Section 5E (`proto-section-wave4`, **95 WebP assets total**), added `test/boardgame-phase5d-portraits.test.cjs` (5/5 PASS) & Playwright Desktop/Mobile visual QA (`verify-phase5d-visuals.cjs` PASS).
  - **Phase 5E (this commit):** Executed **20,000-match** deterministic `starter-thirty-eight` simulation (`scripts/sim-starter-thirty-eight.cjs`, `58.85s`, 0 stalls, 0 draws, 0 privacy leaks, **77,626** choices across 22 kinds), real Cloudflare DO 4P–8P E2E + hibernation/security/unicast suite (`test/boardgame-phase5e-integration.test.cjs`, 4/4 PASS), full Classic 0.00% regression proof (`victory.ts` empty diff), honest privacy & side-channel report, remaining risks register, and roadmap update.

---

## 1. Cumulative Expansion Status (`48 / 66` Playable · `38 / 56` Expansion Implemented)

| Pool / Layer | Hunter | Shadow | Neutral | Total | Portraits | Rules Status | Production Status |
|---|---:|---:|---:|---:|---:|---|---|
| **Classic (`classic`)** | 3 | 3 | 4 | **10** | 10/10 WebP | 10 `verified` (100% untouched) | ✅ **LIVE IN PRODUCTION** |
| **Wave 1 (`starter-eight` delta)** | +4 | +4 | +0 | **+8** | 8/8 WebP | 4 `verified` + 4 `house-rule-approved` | 🔒 Experimental Only |
| **Wave 2 (`starter-sixteen` delta)** | +3 | +3 | +2 | **+8** | 8/8 WebP | 8 `house-rule-approved` | 🔒 Experimental Only |
| **Wave 3 (`starter-twenty-six` delta)** | +4 | +4 | +2 | **+10** | 10/10 WebP | 10 `house-rule-approved` | 🔒 Experimental Only |
| **Wave 4 (`starter-thirty-eight` delta)** | +4 | +4 | +4 | **+12** | 12/12 WebP | 12 `house-rule-approved` | 🔒 Experimental Only |
| **Total Playable (`starter-thirty-eight`)** | **18** | **18** | **12** | **48** | **48/48 WebP** | **38/56 exp (`16 Exp1 · 22 Exp2`)** | 🔒 Experimental Beta Ready |
| **Remaining Catalog (Wave 5 Final)** | **2** | **3** | **13** | **18** | 0/18 | `needs-clarification` / `not-started` (`10 Exp1 · 8 Exp2`) | 🔒 Hard-Blocked by Playability Gate |
| **Full Catalog Total** | **20** | **21** | **25** | **66** | 48/66 | 10 Classic + 26 Exp1 + 30 Exp2 | — |

---

## 2. Manifest of All 12 Newly Delivered Wave 4 Roles (Completing 48/48 Playable Roster)

*(Roles #1–#36 remain unchanged from [`phase-4/phase-4-handoff.md`](../phase-4/phase-4-handoff.md); below are roles #37–#48.)*

| # | Role ID | Source Name | Pack | Faction | HP | Tier | Rules Status | Skill Binding (`skillImpl`) | Victory Binding (`victoryImpl`) | Portrait Path (`MIDNIGHT_CHARACTER_ART`) |
|---:|---|---|---|---|---:|---|---|---|---|---|
| 37 | `exp2_elise` | Elise | `expansion-2` | Hunter | 10 | T2 | `house-rule-approved` | `exp:exp2_elise:soft-harmony` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp2-elise.webp` |
| 38 | `exp2_umibozu` | Umibozu | `expansion-2` | Shadow | 11 | T2 | `house-rule-approved` | `exp:exp2_umibozu:reveal-surge` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-umibozu.webp` |
| 39 | `exp2_urban_legend` | Urban Legend | `expansion-2` | Shadow | 11 | T2 | `house-rule-approved` | `exp:exp2_urban_legend:horror-story` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-urban-legend.webp` |
| 40 | `exp2_arlene` | Arlene | `expansion-2` | Neutral | 8 | T2 | `house-rule-approved` | `exp:exp2_arlene:affectation` | `victory-engine.ts:neutral#arlene` | `/assets/boardgame/roles/role-exp2-arlene.webp` |
| 41 | `exp1_ernest` | Ernest | `expansion-1` | Hunter | 10 | T3 | `house-rule-approved` | `exp:exp1_ernest:apostasy` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp1-ernest.webp` |
| 42 | `exp1_gwendolen` | Gwendolen | `expansion-1` | Hunter | 14 | T3 | `house-rule-approved` | `exp:exp1_gwendolen:shelter` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp1-gwendolen.webp` |
| 43 | `exp2_freyja` | Freyja | `expansion-2` | Hunter | 12 | T3 | `house-rule-approved` | `exp:exp2_freyja:reckless-assault` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp2-freyja.webp` |
| 44 | `exp2_warlord` | Warlord | `expansion-2` | Shadow | 14 | T3 | `house-rule-approved` | `exp:exp2_warlord:war-pull` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-warlord.webp` |
| 45 | `exp2_usurper` | Usurper | `expansion-2` | Shadow | 11 | T3 | `house-rule-approved` | `exp:exp2_usurper:usurp-heal` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-usurper.webp` |
| 46 | `exp1_angel` | Angel | `expansion-1` | Neutral | 8 | T3 | `house-rule-approved` | `exp:exp1_angel:guardian-wings` | `victory-engine.ts:conditional#angel` | `/assets/boardgame/roles/role-exp1-angel.webp` |
| 47 | `exp2_bianca` | Bianca | `expansion-2` | Neutral | 10 | T3 | `house-rule-approved` | `exp:exp2_bianca:scrap-shield` | `victory-engine.ts:neutral#bianca` | `/assets/boardgame/roles/role-exp2-bianca.webp` |
| 48 | `exp2_dalton` | Dalton | `expansion-2` | Neutral | 13 | T3 | `house-rule-approved` | `exp:exp2_dalton:twelfth-round` | `victory-engine.ts:conditional#dalton` | `/assets/boardgame/roles/role-exp2-dalton.webp` |

---

## 3. Complete Phase 5 Deliverable Inventory (`docs/boardgame-expansion/phase-5/`)

1. [`phase-5-scope.md`](./phase-5-scope.md) — Wave 4 scope & capability map
2. [`rules-decisions.md`](./rules-decisions.md) — Ratified `house-rule-approved` specs for all 12 Wave 4 roles (with explicit preservation of `Dalton` `RC-15` ambiguity and `Gwendolen` `preRevealed` privacy rule)
3. [`engine-foundations.md`](./engine-foundations.md) — Shared `CAP-04`, `CAP-05`, `CAP-06`, `CAP-07`, `CAP-10` engine foundations
4. [`phase-5b-tier2-report.md`](./phase-5b-tier2-report.md) — Final 4 Tier-2 implementation report
5. [`phase-5c-tier3-report.md`](./phase-5c-tier3-report.md) — 8 Tier-3 roles, `starter-thirty-eight` & UI integration report
6. [`character-art-prompts.md`](./character-art-prompts.md) — 12 HUSTVerse Midnight Anime Noir prompt specs
7. [`asset-manifest.json`](./asset-manifest.json) — Machine-readable portrait manifest with exact byte sizes & SHA-256 digests (`48/48` unique)
8. [`character-contact-sheet.webp`](./character-contact-sheet.webp) & [`character-contact-sheet.png`](./character-contact-sheet.png) — 3-Faction visual review sheet (`4H · 4S · 4N`)
9. [`phase-5d-art-report.md`](./phase-5d-art-report.md) — Visual QC & Playwright Desktop/Mobile QA report
10. [`starter-thirty-eight-sim-data.json`](./starter-thirty-eight-sim-data.json) — Raw 20,000-match deterministic simulation output
11. [`phase-5e-simulation-report.md`](./phase-5e-simulation-report.md) — Full 10-topic balance, longitudinal G43 & bot-vs-human analysis
12. [`integration-test-report.md`](./integration-test-report.md) — Complete CI, 4P–8P real DO E2E & Playwright test matrix
13. [`classic-regression-report.md`](./classic-regression-report.md) — `victory.ts` 0-diff, 25/25 SHA-256 RNG & 4,500-match Classic 0.00% diff proof
14. [`privacy-side-channel-report.md`](./privacy-side-channel-report.md) — Honest eliminated vs residual side-channel security audit
15. [`remaining-risks.md`](./remaining-risks.md) — P0/P1/P2 risk & unresolved-rule register
16. [`phase-5-handoff.md`](./phase-5-handoff.md) — This handoff document
17. Updated [`../expansion-roadmap.md`](../expansion-roadmap.md) — Cumulative roadmap (`48/66` playable; `18/56` remaining)

---

## 4. Next Wave Plan (Phase 6 / Wave 5 — Final 18 Characters to Complete `66/66`)

### 4.1. Exact Inventory of the Final 18 Unimplemented Characters (`2H / 3S / 13N`; `10 Exp1 · 8 Exp2`)
- **Remaining Tier-3 (`10` roles):**
  - Hunter (`1`): `exp2_gideon` (14 HP — Damage Redirection)
  - Neutral (`9`): `exp1_anathema` (8), `exp1_bethany` (10), `exp1_arnold` (8), `exp1_cassie` (11), `exp1_clairvoyant` (11), `exp2_april_skipps` (8), `exp2_colt` (11), `exp2_diana` (13), `exp2_aaron` (8)
- **Remaining Tier-4 (`8` roles):**
  - Hunter (`1`): `exp1_lloyd` (12 — Global Attack Interrupt)
  - Shadow (`3`): `exp1_vengeful_spirit` (13 — Dynamic Skill Copy), `exp1_voodoo` (13 — Turn Ownership Override), `exp1_undead` (11 — Pending Resurrection)
  - Neutral (`4`): `exp1_antimony` (8 — Dynamic Skill & Copied Victory), `exp2_cain` (11 — Multi-Faction Victory), `exp2_bonnie` (10 — Dynamic Allegiance), `exp2_nc_soldier` (13 — Dynamic Allegiance)

### 4.2. Recommended Phase 6 Execution Sequence
1. **Human Beta Playtest on `starter-thirty-eight` (`48` roles):** Collect ≥ 100 human matches focusing on `Dalton` (`RC-15` 12-HP vs 12-wounds), `Ernest` (`28.40%` bot WR), `G43 + Holy Robe` (`64.84%`), `Wrath` (`52.62%`), and `SET_REACTION_PREF` UX.
2. **Phase 6A — Wave 5 Core Mechanics Foundations:** Build `DamageRedirection` with cycle guard (`Gideon`, `Aaron`), `CopiedVictoryGraph` with cycle detection (`Cassie`, `Clairvoyant`, `Diana`, `Antimony`), `TurnOwnershipOverride` (`Voodoo`), `PendingResurrection` (`Undead`), `DynamicAllegiance` (`Bonnie`, `N.C. Soldier`), `MultiFactionVictory` (`Cain`), `DynamicSkillCopy` (`Vengeful Spirit`, `Antimony`), and `GlobalAttackInterrupt` (`Lloyd`).
3. **Phase 6B–6E — Final 18 Roles, 18 Anime Noir Portraits (`66/66`), 30k-Match Sim & Pack Unlocks:** Complete `expansion-1` (`26/26`), `expansion-2` (`30/30`), and `full-expansion` (`66/66`) while keeping `classic` 100% bit-for-bit untouched.
