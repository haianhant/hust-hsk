# Bóng Đêm KTX — Phase 5 Scope & Baseline Audit (`Wave 4 / starter-thirty-eight`)

- **Date:** 2026-11-20
- **Baseline HEAD:** `9e498cd` (`main`, GitHub Actions Run `44764223142` — 8/8 jobs green)
- **Production Ruleset Policy:** `classic` ONLY (unchanged — all experimental pools hard-blocked on production unless `ALLOW_EXPERIMENTAL_RULESETS=1`)

---

## 1. Phase 5 Target Roster (12 New Characters: 4 Tier-2 + 8 Tier-3)

| # | Role ID | Source Name | Pack | Faction | Max HP | Difficulty | Approval Status |
|---:|---|---|---|---|---:|---|---|
| 1 | `exp2_elise` | Elise | Expansion 2 | Hunter (`lantern-guard`) | 10 | `tier-2` | `house-rule-approved` |
| 2 | `exp2_umibozu` | Umibozu | Expansion 2 | Shadow (`mist-order`) | 11 | `tier-2` | `house-rule-approved` |
| 3 | `exp2_urban_legend` | Urban Legend | Expansion 2 | Shadow (`mist-order`) | 11 | `tier-2` | `house-rule-approved` |
| 4 | `exp2_arlene` | Arlene | Expansion 2 | Neutral (`wanderer`) | 8 | `tier-2` | `house-rule-approved` |
| 5 | `exp1_ernest` | Ernest | Expansion 1 | Hunter (`lantern-guard`) | 10 | `tier-3` | `house-rule-approved` |
| 6 | `exp1_gwendolen` | Gwendolen | Expansion 1 | Hunter (`lantern-guard`) | 14 | `tier-3` | `house-rule-approved` |
| 7 | `exp2_freyja` | Freyja | Expansion 2 | Hunter (`lantern-guard`) | 12 | `tier-3` | `house-rule-approved` |
| 8 | `exp2_warlord` | Warlord | Expansion 2 | Shadow (`mist-order`) | 14 | `tier-3` | `house-rule-approved` |
| 9 | `exp2_usurper` | Usurper | Expansion 2 | Shadow (`mist-order`) | 11 | `tier-3` | `house-rule-approved` |
| 10 | `exp1_angel` | Angel | Expansion 1 | Neutral (`wanderer`) | 8 | `tier-3` | `house-rule-approved` |
| 11 | `exp2_bianca` | Bianca | Expansion 2 | Neutral (`wanderer`) | 10 | `tier-3` | `house-rule-approved` |
| 12 | `exp2_dalton` | Dalton | Expansion 2 | Neutral (`wanderer`) | 13 | `tier-3` | `house-rule-approved` |

---

## 2. Cumulative Roster & Remaining Catalog Partition

| Pool / Layer | Hunter | Shadow | Neutral | Total | Status |
|---|---:|---:|---:|---:|---|
| Classic (`classic`) | 3 | 3 | 4 | **10** | ✅ Live Production |
| Wave 1 (`starter-eight` delta) | +4 | +4 | +0 | **+8** | 🔒 Experimental (`18` total) |
| Wave 2 (`starter-sixteen` delta) | +3 | +3 | +2 | **+8** | 🔒 Experimental (`26` total) |
| Wave 3 (`starter-twenty-six` delta) | +4 | +4 | +2 | **+10** | 🔒 Experimental (`36` total) |
| **Wave 4 (`starter-thirty-eight` delta)** | **+4** | **+4** | **+4** | **+12** | **🔒 Experimental (`48` total — Phase 5 target)** |
| **Cumulative Playable (`starter-thirty-eight`)** | **18** | **18** | **12** | **48** | 🔒 Experimental Only (`38/56` exp: `16 Exp1 · 22 Exp2`) |
| **Remaining Expansion Catalog (Wave 5+)** | **2** | **3** | **13** | **18** | 🔒 `needs-clarification` / `not-started` (`10 Exp1 · 8 Exp2`) |
| **Full Catalog (Classic + 56 Expansion)** | **20** | **21** | **25** | **66** | 10 Classic + 26 Exp1 + 30 Exp2 |

- **Dealt-Faction Composition (4P–8P):** Unchanged (`4P: 2H-2S-0N`, `5P: 2H-2S-1N`, `6P: 2H-2S-2N`, `7P: 2H-2S-3N`, `8P: 3H-3S-2N`).
- **Locked Production Packs:** `expansion-1` (`16/26`), `expansion-2` (`22/30`), and `full-expansion` (`48/66`) remain strictly locked until 100% of their rosters are implemented and verified.

---

## 3. Baseline Preflight Verification (`9e498cd`)

- **GitHub Actions CI (`9e498cd` · Run `44764223142`):** 8/8 jobs PASS (`Gates 1–6`, `Gate 7 PR10B`, all 5 `Gate 8` shards including `e2e-03`, `Deploy Cloudflare Worker`).
- **Local Preflight:** `npm run typecheck` PASS; `node scripts/validate-character-catalog.cjs` PASS (`implemented=26 [11H/11S/4N], not-started=30 [6H/7S/17N], activeInProd=false`); Classic `25/25` SHA-256 RNG fingerprints & 4,500-match baseline 0.00% diff.

---

## 4. Five Sequential Milestones

- **Phase 5A:** Preflight audit, rules ratification (`rules-decisions.md`), shared engine foundations (`CAP-04` HealPipeline, `CAP-05` Out-of-Turn Reaction Queue + Private Reaction Policy, `CAP-06` Safe Effect/Reaction Chains, `CAP-07` Extended Neutral Victory Evaluation, `CAP-10` Canonical Metadata), `test/boardgame-phase5a.test.cjs`.
- **Phase 5B:** Complete the final 4 Tier-2 roles (`Elise`, `Umibozu`, `Urban Legend`, `Arlene`), `test/boardgame-phase5b.test.cjs`, `phase-5b-tier2-report.md`.
- **Phase 5C:** Implement the 8 Tier-3 roles (`Ernest`, `Gwendolen`, `Freyja`, `Warlord`, `Usurper`, `Angel`, `Bianca`, `Dalton`), register `starter-thirty-eight` (48 roles), wire UI/ActionPanel/PendingChoice/VFX/DO, `test/boardgame-phase5c.test.cjs`, `phase-5c-tier3-report.md`.
- **Phase 5D:** Generate 12 original `1024×1536` Anime Noir WebP portraits (`48/48` unique SHA-256), Contact Sheet, `asset-manifest.json`, strict `48/48` `MIDNIGHT_CHARACTER_ART`, Prototype Section 5E, unit + Playwright visual QA.
- **Phase 5E:** 20,000-match deterministic simulation (`starter-thirty-eight`), 4P–8P real Cloudflare DO E2E + hibernation/privacy QA, Classic zero-regression verification, privacy/side-channel report, remaining risks, handoff, roadmap update, and full green CI at final HEAD SHA.
