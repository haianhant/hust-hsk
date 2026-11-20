# Bóng Đêm KTX — Phase 4 Scope & Baseline Reconciliation (`Wave 3 / starter-twenty-six`)

- **Date:** 2026-11-20
- **Starting HEAD:** `098b29d` (`main`)
- **Production Ruleset Policy:** `classic` ONLY (unchanged — all experimental pools hard-blocked on production)

---

## 1. Wave 3 Target Roster (10 New Tier-2 Characters)

| Role ID | Name | Pack | Faction | Max HP | Primary Trigger | Approval Class |
|---|---|---|---|---:|---|---|
| `exp1_fallen` | Fallen | Expansion 1 | Hunter (`lantern-guard`) | 12 | `BEFORE_DAMAGE` / Reveal Guard | `house-rule-approved` |
| `exp1_fea` | Fea | Expansion 1 | Hunter (`lantern-guard`) | 12 | `ON_MOVE` | `house-rule-approved` |
| `exp2_eleanor` | Eleanor | Expansion 2 | Hunter (`lantern-guard`) | 10 | `ACTIVE_SKILL` | `house-rule-approved` |
| `exp2_fujiko` | Fujiko | Expansion 2 | Hunter (`lantern-guard`) | 12 | `AFTER_ATTACK` / `DAMAGE` | `house-rule-approved` |
| `exp1_udi` | Udi | Expansion 1 | Shadow (`mist-order`) | 11 | `BEFORE_ATTACK` (Target Filter) | `house-rule-approved` |
| `exp1_wrath` | Wrath | Expansion 1 | Shadow (`mist-order`) | 14 | `ON_TURN_START` | `house-rule-approved` |
| `exp1_vengeance` | Vengeance | Expansion 1 | Shadow (`mist-order`) | 13 | `ON_ELIMINATION` | `house-rule-approved` |
| `exp2_visions` | Visions | Expansion 2 | Shadow (`mist-order`) | 13 | `ON_TURN_START` / Target Filter | `house-rule-approved` |
| `exp2_cruz` | Cruz | Expansion 2 | Neutral (`wanderer`) | 11 | `ON_DRAW_CARD` / `ON_VICTORY_CHECK` | `house-rule-approved` |
| `exp2_bryon` | Bryon | Expansion 2 | Neutral (`wanderer`) | 10 | `BEFORE_ATTACK` / `ON_VICTORY_CHECK` | `house-rule-approved` |

---

## 2. Cumulative Roster & Remaining Catalog Partition

| Pool / Layer | Hunter | Shadow | Neutral | Total | Status |
|---|---:|---:|---:|---:|---|
| Classic (`classic`) | 3 | 3 | 4 | **10** | Live Production |
| Wave 1 (`starter-eight` delta) | +4 | +4 | +0 | **+8** | Experimental (`18` total) |
| Wave 2 (`starter-sixteen` delta) | +3 | +3 | +2 | **+8** | Experimental (`26` total) |
| **Wave 3 (`starter-twenty-six` delta)** | **+4** | **+4** | **+2** | **+10** | **Experimental (`36` total — Phase 4 target)** |
| **Cumulative Playable (`starter-twenty-six`)** | **14** | **14** | **8** | **36** | Experimental Only (Prod Classic-only) |
| **Remaining Expansion Catalog (Waves 4+)** | **6** | **7** | **17** | **30** | `needs-clarification` / `not-started` |
| **Full Catalog (Classic + 56 Expansion)** | **20** | **21** | **25** | **66** | 10 Classic + 26 Exp1 + 30 Exp2 |

- **Match Faction Composition (4P–8P):** Unchanged (`4P: 2H-2S-0N`, `5P: 2H-2S-1N`, `6P: 2H-2S-2N`, `7P: 2H-2S-3N`, `8P: 3H-3S-2N`).

---

## 3. Phase 3 Statistical Discrepancies Reconciled in Phase 4A

1. **Pending Choice Totals (`starter-sixteen`, 10,000 matches):**
   - **Discrepancy:** Phase 3 markdown reports stated `49,533` resolved pending choices, while summing the nine counters in [`starter-sixteen-sim-data.json`](../phase-3/starter-sixteen-sim-data.json) yields **`39,533`** (`6,276 + 1,841 + 7,604 + 8,798 + 5,057 + 2,127 + 2,200 + 2,710 + 2,920 = 39,533`).
   - **Root Cause:** `scripts/sim-starter-sixteen.cjs` previously omitted an explicit aggregate `totalPendingChoicesResolved` field in JSON, causing a manual `+10,000` addition slip when drafting prose reports.
   - **Structural Fix:** Both `scripts/sim-starter-sixteen.cjs` and `scripts/sim-starter-eight.cjs` now compute and emit `totalPendingChoicesResolved` programmatically; `starter-sixteen-sim-data.json` was regenerated deterministically with `totalPendingChoicesResolved: 39533`; [`phase-3c-simulation-report.md`](../phase-3/phase-3c-simulation-report.md) and [`integration-test-report.md`](../phase-3/integration-test-report.md) were corrected; and `test/boardgame-phase4a.test.cjs` enforces exact JSON-to-report reconciliation.
2. **Remaining Expansion Characters by Faction (Post-Phase 3):**
   - **Discrepancy:** Phase 3 handoff listed `7H / 8S / 25N` for the 40 remaining characters.
   - **Exact Programmatic Count from [`character-catalog.json`](../character-catalog.json):** Expansion total is `17H / 18S / 21N` (`56`), Phase 2+3 implemented `7H / 7S / 2N` (`16`), leaving **`10 Hunter / 11 Shadow / 19 Neutral`** (`40`) before Phase 4B — and **`6 Hunter / 7 Shadow / 17 Neutral`** (`30`) after Phase 4B.
   - **Structural Fix:** [`scripts/validate-character-catalog.cjs`](../../../scripts/validate-character-catalog.cjs) now computes, prints, and asserts exact per-faction `implemented + remaining === total` invariants; [`phase-3-handoff.md`](../phase-3/phase-3-handoff.md) was corrected with an explicit erratum; and `test/boardgame-phase4a.test.cjs` enforces catalog partition invariants.

---

## 4. Phase 4 Milestone Execution Plan

- **Phase 4A:** Baseline audit, Phase 3 statistics cleanup, rules ratification (`rules-decisions.md`), shared engine foundations (`HP/Wound`, `Cluster Scope`, `Canonical Card IDs`, dynamic `eq_chocolate` A/E/U, `Event Attribution`), `test/boardgame-phase4a.test.cjs`.
- **Phase 4B:** Implement all 10 Wave 3 character skills & Neutral victories, add `starter-twenty-six` experimental ruleset (`36` roles), wire UI/ActionPanel/PendingChoice/VFX metadata, `test/boardgame-phase4b.test.cjs`.
- **Phase 4C:** Generate 10 real `1024×1536` Anime Noir WebP portraits, build 3-faction contact sheet & `asset-manifest.json`, wire `36/36` `MIDNIGHT_CHARACTER_ART` + Prototype Section 5D, run unit + Playwright Desktop/Mobile visual QA.
- **Phase 4D:** Run **15,000-match** deterministic `starter-twenty-six` simulation (3,000 × 5 across 4P–8P) with paired-seed/controlled balance investigations, real Cloudflare DO 4P–8P E2E + hibernation/security suite, full Classic zero-regression verification, update `expansion-roadmap.md`, and complete Phase 4 handoff.
