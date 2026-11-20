# Bóng Đêm KTX — Phase 4 Final Handoff (`Wave 3 / starter-twenty-six`)

- **Date:** 2026-11-20
- **Branch:** `main`
- **Completed Phase 4 Milestones:**
  - **Phase 4A (`a3979c3`):** Reconciled Phase 3 statistics (`totalPendingChoicesResolved: 39533` & exact per-faction catalog partition checks), ratified Wave 3 rules (`phase-4-scope.md`, `rules-decisions.md`), built 5 shared zero-regression engine foundations (`getRemainingHp`, `listLivingPlayersInSameCluster`, `CANONICAL_SH_CARD_IDS`, dynamic `eq_chocolate` A/E/U, extended event attribution; `engine-changes.md`), added `test/boardgame-phase4a.test.cjs` (5/5 PASS).
  - **Phase 4B (`d4bcbc2`):** Implemented all 10 Wave 3 Tier-2 characters server-authoritatively across `shared/contracts/boardgame.ts`, `expansion-skills.ts`, `actions.ts`, `victory-engine.ts`, `registry.ts` (`starter-twenty-six` — 36 roles), `projections.ts`, UI/ActionPanel/VFX, added `test/boardgame-phase4b.test.cjs` (11/11 PASS) & `phase-4b-implementation.md`.
  - **Phase 4C (`217740e`):** Generated & visually audited 10 original `HUSTVerse Midnight — Anime Noir` WebP portraits (`1024×1536`, `63.5–108.2 KB`, 36/36 unique SHA-256), built Contact Sheet & `asset-manifest.json`, restored strict `36/36` `MIDNIGHT_CHARACTER_ART`, added Prototype Section 5D (`proto-section-wave3`, 83 WebP assets total), added `test/boardgame-phase4c-portraits.test.cjs` (5/5 PASS) & Playwright Desktop/Mobile visual QA (`verify-phase4c-visuals.cjs` PASS).
  - **Phase 4D (this commit):** Executed **15,000-match** deterministic `starter-twenty-six` simulation (`scripts/sim-starter-twenty-six.cjs`, 0 stalls, 0 draws, 0 privacy leaks, **69,211** choices resolved across 15 kinds), real Cloudflare DO 4P–8P E2E + hibernation/security integration suite (`test/boardgame-phase4d-integration.test.cjs`, 4/4 PASS), full Classic 0.00% regression proof, hidden-reaction side-channel audit, and roadmap update.

---

## 1. Cumulative Expansion Status (`36 / 66` Characters Playable · `26 / 56` Expansion Implemented)

| Pool / Layer | Hunter | Shadow | Neutral | Total | Portraits | Rules Status | Production Status |
|---|---:|---:|---:|---:|---:|---|---|
| **Classic (`classic`)** | 3 | 3 | 4 | **10** | 10/10 WebP | 10 `verified` (100% untouched) | ✅ **LIVE IN PRODUCTION** |
| **Wave 1 (`starter-eight` delta)** | +4 | +4 | +0 | **+8** | 8/8 WebP | 4 `verified` + 4 `house-rule-approved` | 🔒 Experimental Only |
| **Wave 2 (`starter-sixteen` delta)** | +3 | +3 | +2 | **+8** | 8/8 WebP | 8 `house-rule-approved` | 🔒 Experimental Only |
| **Wave 3 (`starter-twenty-six` delta)** | +4 | +4 | +2 | **+10** | 10/10 WebP | 10 `house-rule-approved` | 🔒 Experimental Only |
| **Total Playable (`starter-twenty-six`)** | **14** | **14** | **8** | **36** | **36/36 WebP** | **26/56 exp (`13 Exp1 · 13 Exp2`)** | 🔒 Experimental Beta Ready |
| **Remaining Catalog (Waves 4+)** | **6** | **7** | **17** | **30** | 0/30 | `needs-clarification` / `not-started` (`13 Exp1 · 17 Exp2`) | 🔒 Hard-Blocked by Playability Gate |
| **Full Catalog Total** | **20** | **21** | **25** | **66** | 36/66 | 10 Classic + 26 Exp1 + 30 Exp2 | — |

---

## 2. Complete Manifest of All 36 Playable Roles (`starter-twenty-six`)

| # | Role ID | Source Name | Pack | Faction | HP | Rules Status | Skill Binding (`skillImpl`) | Victory Binding (`victoryImpl`) | Portrait Path (`MIDNIGHT_CHARACTER_ART`) |
|---:|---|---|---|---|---:|---|---|---|---|
| 1 | `gac-ky-thuat` | George | `classic` | Hunter | 14 | `verified` | `classic:gac-ky-thuat:demolish-1d4` | `victory.ts:evaluateVictory#hunters` | `/assets/boardgame/prototype/role-minh-ky-thuat.webp` |
| 2 | `gac-truc-ban` | Emi | `classic` | Hunter | 10 | `verified` | `classic:gac-truc-ban:teleport-cluster` | `victory.ts:evaluateVictory#hunters` | `/assets/boardgame/roles/role-lan-truc-ban.webp` |
| 3 | `gac-radio` | Franklin | `classic` | Hunter | 12 | `verified` | `classic:gac-radio:lightning-1d6` | `victory.ts:evaluateVictory#hunters` | `/assets/boardgame/prototype/role-vy-radio.webp` |
| 4 | `suong-an-danh` | Vampire | `classic` | Shadow | 13 | `verified` | `classic:suong-an-danh:vampire-drain` | `victory.ts:evaluateVictory#shadows` | `/assets/boardgame/roles/role-tu-an-danh.webp` |
| 5 | `suong-tin-gia` | Unknown | `classic` | Shadow | 11 | `verified` | `classic:suong-tin-gia:unknown-deceit` | `victory.ts:evaluateVictory#shadows` | `/assets/boardgame/roles/role-khanh-tin-gia.webp` |
| 6 | `suong-gac-cong` | Werewolf | `classic` | Shadow | 14 | `verified` | `classic:suong-gac-cong:werewolf-counterattack` | `victory.ts:evaluateVictory#shadows` | `/assets/boardgame/roles/role-dung-gac-cong.webp` |
| 7 | `lang-anh-san` | Bob | `classic` | Neutral | 10 | `verified` | `classic:lang-anh-san:bob-robbery` | `victory.ts:evaluateVictory#bob` | `/assets/boardgame/roles/role-hai-suu-tam.webp` |
| 8 | `lang-quan-sat` | Allie | `classic` | Neutral | 8 | `verified` | `classic:lang-quan-sat:allie-full-heal` | `victory.ts:evaluateVictory#allie` | `/assets/boardgame/roles/role-trang-kien-cuong.webp` |
| 9 | `lang-cuu-ho` | Charles | `classic` | Neutral | 11 | `verified` | `classic:lang-cuu-ho:charles-bloody-feast` | `victory.ts:evaluateVictory#charles` | `/assets/boardgame/roles/role-bach-cuong-chien.webp` |
| 10 | `lang-tien-phong` | Daniel | `classic` | Neutral | 13 | `verified` | `classic:lang-tien-phong:daniel-scream` | `victory.ts:evaluateVictory#daniel` | `/assets/boardgame/roles/role-dat-cam-tu.webp` |
| 11 | `exp1_wendigo` | Wendigo | `expansion-1` | Shadow | 14 | `verified` | `exp:exp1_wendigo:cannibal-feast` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp1-wendigo.webp` |
| 12 | `exp2_g43` | G43 | `expansion-2` | Hunter | 14 | `verified` | `exp:exp2_g43:fortress-mode` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp2-g43.webp` |
| 13 | `exp2_fiona` | Fiona | `expansion-2` | Hunter | 12 | `verified` | `exp:exp2_fiona:surgical-strike` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp2-fiona.webp` |
| 14 | `exp2_wyvern` | Wyvern | `expansion-2` | Shadow | 14 | `verified` | `exp:exp2_wyvern:absorption` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-wyvern.webp` |
| 15 | `exp1_gayle` | Gayle | `expansion-1` | Hunter | 14 | `house-rule-approved` | `exp:exp1_gayle:trainee-fighter` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp1-gayle.webp` |
| 16 | `exp1_felicia` | Felicia | `expansion-1` | Hunter | 12 | `house-rule-approved` | `exp:exp1_felicia:resourceful` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp1-felicia.webp` |
| 17 | `exp1_victor` | Victor | `expansion-1` | Shadow | 13 | `house-rule-approved` | `exp:exp1_victor:mad-scientist` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp1-victor.webp` |
| 18 | `exp1_undying` | Undying | `expansion-1` | Shadow | 11 | `house-rule-approved` | `exp:exp1_undying:iron-plating` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp1-undying.webp` |
| 19 | `exp1_elysia` | Elysia | `expansion-1` | Hunter | 10 | `house-rule-approved` | `exp:exp1_elysia:counterattack` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp1-elysia.webp` |
| 20 | `exp2_unchained` | Unchained | `expansion-2` | Shadow | 11 | `house-rule-approved` | `exp:exp2_unchained:endless-violence` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-unchained.webp` |
| 21 | `exp2_warlock` | Warlock | `expansion-2` | Shadow | 14 | `house-rule-approved` | `exp:exp2_warlock:power-source` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-warlock.webp` |
| 22 | `exp2_witch` | Witch | `expansion-2` | Shadow | 14 | `house-rule-approved` | `exp:exp2_witch:no-place-like-home` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-witch.webp` |
| 23 | `exp2_father_harrison` | Father Harrison | `expansion-2` | Hunter | 12 | `house-rule-approved` | `exp:exp2_father_harrison:sunday-service` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp2-father-harrison.webp` |
| 24 | `exp2_gloria` | Gloria | `expansion-2` | Hunter | 14 | `house-rule-approved` | `exp:exp2_gloria:mighty-blessing` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp2-gloria.webp` |
| 25 | `exp1_cindy` | Cindy | `expansion-1` | Neutral | 11 | `house-rule-approved` | `exp:exp1_cindy:nightmare` | `victory-engine.ts:neutral#cindy` | `/assets/boardgame/roles/role-exp1-cindy.webp` |
| 26 | `exp1_bipolar` | Bipolar | `expansion-1` | Neutral | 10 | `house-rule-approved` | `exp:exp1_bipolar:fate-coin` | `victory-engine.ts:conditional#bipolar` | `/assets/boardgame/roles/role-exp1-bipolar.webp` |
| 27 | `exp1_fallen` | Fallen | `expansion-1` | Hunter | 12 | `house-rule-approved` | `exp:exp1_fallen:resistance` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp1-fallen.webp` |
| 28 | `exp1_fea` | Fea | `expansion-1` | Hunter | 12 | `house-rule-approved` | `exp:exp1_fea:dice-adjust` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp1-fea.webp` |
| 29 | `exp2_eleanor` | Eleanor | `expansion-2` | Hunter | 10 | `house-rule-approved` | `exp:exp2_eleanor:interrogator` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp2-eleanor.webp` |
| 30 | `exp2_fujiko` | Fujiko | `expansion-2` | Hunter | 12 | `house-rule-approved` | `exp:exp2_fujiko:its-over` | `victory-engine.ts:faction#hunters` | `/assets/boardgame/roles/role-exp2-fujiko.webp` |
| 31 | `exp1_udi` | Udi | `expansion-1` | Shadow | 11 | `house-rule-approved` | `exp:exp1_udi:hiding` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp1-udi.webp` |
| 32 | `exp1_wrath` | Wrath | `expansion-1` | Shadow | 14 | `house-rule-approved` | `exp:exp1_wrath:cluster-aoe` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp1-wrath.webp` |
| 33 | `exp1_vengeance` | Vengeance | `expansion-1` | Shadow | 13 | `house-rule-approved` | `exp:exp1_vengeance:chain-strike` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp1-vengeance.webp` |
| 34 | `exp2_visions` | Visions | `expansion-2` | Shadow | 13 | `house-rule-approved` | `exp:exp2_visions:curse-mark` | `victory-engine.ts:faction#shadows` | `/assets/boardgame/roles/role-exp2-visions.webp` |
| 35 | `exp2_cruz` | Cruz | `expansion-2` | Neutral | 11 | `house-rule-approved` | `exp:exp2_cruz:black-redraw` | `victory-engine.ts:neutral#cruz` | `/assets/boardgame/roles/role-exp2-cruz.webp` |
| 36 | `exp2_bryon` | Bryon | `expansion-2` | Neutral | 10 | `house-rule-approved` | `exp:exp2_bryon:generous-service` | `victory-engine.ts:shared#bryon` | `/assets/boardgame/roles/role-exp2-bryon.webp` |

---

## 3. Deliverable Inventory (`docs/boardgame-expansion/phase-4/`)

1. [`phase-4-scope.md`](./phase-4-scope.md) — Wave 3 scope & Phase 3 statistical discrepancy reconciliation
2. [`rules-decisions.md`](./rules-decisions.md) — Global engine conventions + 10 Wave 3 `house-rule-approved` specs
3. [`engine-changes.md`](./engine-changes.md) — 5 shared zero-regression engine foundations
4. [`phase-4b-implementation.md`](./phase-4b-implementation.md) — Wave 3 gameplay & `starter-twenty-six` implementation summary
5. [`character-art-prompts.md`](./character-art-prompts.md) — 10 HUSTVerse Midnight Anime Noir prompt specs
6. [`asset-manifest.json`](./asset-manifest.json) — Machine-readable portrait manifest with exact byte sizes & SHA-256 digests
7. [`character-contact-sheet.webp`](./character-contact-sheet.webp) & [`character-contact-sheet.png`](./character-contact-sheet.png) — 3-Faction visual review sheet
8. [`phase-4c-art-report.md`](./phase-4c-art-report.md) — Visual QC & Playwright Desktop/Mobile QA report
9. [`starter-twenty-six-sim-data.json`](./starter-twenty-six-sim-data.json) — Raw 15,000-match deterministic simulation output
10. [`phase-4d-simulation-report.md`](./phase-4d-simulation-report.md) — Full 9-topic balance & power-creep analysis
11. [`integration-test-report.md`](./integration-test-report.md) — Complete CI, DO E2E & Playwright test matrix
12. [`classic-regression-report.md`](./classic-regression-report.md) — 25/25 SHA-256 RNG + 4,500-match Classic 0.00% diff proof
13. [`remaining-risks.md`](./remaining-risks.md) — P0/P1/P2 risk register & hidden-reaction timing side-channel mitigation design
14. [`phase-4-handoff.md`](./phase-4-handoff.md) — This handoff document
15. Updated [`../expansion-roadmap.md`](../expansion-roadmap.md) — Updated cumulative roadmap (`36/66` playable; `30/56` remaining `6H/7S/17N`)

---

## 4. Recommended Next Steps (Phase 5 / Wave 4 — Remaining 30 Roles: `6H / 7S / 17N`)

### 4.1. Exact Inventory of the Remaining 30 Unimplemented Roles
- **Remaining Tier-2 (`4` roles — low infrastructure friction):**
  - Hunter (`1`): `exp2_elise` (10 HP)
  - Shadow (`2`): `exp2_umibozu` (11 HP), `exp2_urban_legend` (11 HP)
  - Neutral (`1`): `exp2_arlene` (8 HP)
- **Remaining Tier-3 (`18` roles — require targeted mid-tier primitives):**
  - Hunter (`4`): `exp1_ernest` (10), `exp1_gwendolen` (14), `exp2_freyja` (12), `exp2_gideon` (14)
  - Shadow (`2`): `exp2_warlord` (14), `exp2_usurper` (11)
  - Neutral (`12`): `exp1_anathema` (8), `exp1_bethany` (10), `exp1_arnold` (8), `exp1_cassie` (11), `exp1_clairvoyant` (11), `exp1_angel` (8), `exp2_dalton` (13), `exp2_april_skipps` (8), `exp2_bianca` (10), `exp2_colt` (11), `exp2_diana` (13), `exp2_aaron` (8)
- **Remaining Tier-4 (`8` roles — deferred for dedicated Wave 5 Core Mechanics):**
  - Hunter (`1`): `exp1_lloyd` (12)
  - Shadow (`3`): `exp1_vengeful_spirit` (13), `exp1_voodoo` (13), `exp1_undead` (11)
  - Neutral (`4`): `exp1_antimony` (8), `exp2_cain` (11), `exp2_bonnie` (10), `exp2_nc_soldier` (13)

### 4.2. Priority Order for Phase 5
1. **Run Internal Human Beta Playtest on `starter-twenty-six` (`36` roles, `ALLOW_EXPERIMENTAL_RULESETS=1`):** Collect ≥ 100 human matches tracking `G43 + Holy Robe`, `Wrath`, `Eleanor`, `Cruz`, `Cindy 5P`, `Bipolar`, and secret-reaction turn pacing; implement Tier-1 `Auto-Decline` secret reaction toggle before any public beta.
2. **Wave 4A/4B (10–12 Roles — Close Out All Tier-2 + First Half of Tier-3):** Implement `HealPipeline` (`Gwendolen`, `Ernest`, `Freyja`, `Angel`, `Bianca`), `DamageRedirection` with cycle guard (`Gideon`, `Aaron`), plus the last 4 Tier-2 roles (`Elise`, `Umibozu`, `Urban Legend`, `Arlene`) and Shadow Tier-3 (`Warlord`, `Usurper`) → creating `starter-thirty-eight` (`48` playable characters).
3. **Wave 5 (Remaining Tier-3 Copied-Victory Neutral Cluster + All 8 Tier-4 Core Mechanics):** Build `CopiedVictoryGraph` (`Cassie`, `Clairvoyant`, `Diana`, `Antimony`), `TurnOwnershipOverride` (`Voodoo`), `PendingResurrection` (`Undead`), `DynamicAllegiance` (`Bonnie`, `N.C. Soldier`), `MultiFactionVictory` (`Cain`), and `GlobalAttackInterrupt` (`Lloyd`) to unlock `expansion-1` (`26/26`), `expansion-2` (`30/30`), and `full-expansion` (`66/66`).
