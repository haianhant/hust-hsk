# Bóng Đêm KTX — Phase 3 Final Handoff (`Wave 2 / Starter Sixteen`)

- **Date:** 2026-11-20
- **Branch:** `main`
- **Completed Milestones:**
  - **Phase 3A** (`bcd9212`): Rules ratification (`phase-3-scope.md`, `rules-decisions.md`), `LocationAlias` single source of truth, 9-step Damage Pipeline (`AFTER_DAMAGE_TRIGGERS`, `causationId`, `isRetaliation`), 8 Wave 2 skill/victory implementations, `starter-sixteen` experimental ruleset (`26` playable characters), `test/boardgame-phase3a.test.cjs` (9/9 PASS).
  - **Phase 3B** (`cb9982b`): 8 AI-generated `1024×1536` (`2:3`) Anime Noir WebP portraits (`85.9–169.4 KB`, 100% unique SHA-256), 3-Faction Contact Sheet, `asset-manifest.json`, strict `26/26` `MIDNIGHT_CHARACTER_ART`, Prototype Section 5C (`proto-section-wave2`), `test/boardgame-phase3b-portraits.test.cjs` (5/5 PASS), Playwright Desktop/Mobile visual QA (`verify-phase3b-visuals.cjs` PASS).
  - **Phase 3C** (this commit): Cross-character + 4P–8P real Cloudflare DO E2E (`test/boardgame-phase3c-integration.test.cjs`, 4/4 PASS), 10,000-match deterministic simulation (`scripts/sim-starter-sixteen.cjs`, 0 stalls, 0 draws, 0 privacy leaks), G43 counterplay & Wave 2 balance reports, Classic 0.00% regression report, updated `expansion-roadmap.md`.

---

## 1. Cumulative Expansion Status (26 / 66 Characters Playable)

| Pool / Layer | Characters | Portraits | Gameplay Rules | Production Status |
|---|---:|---:|---|---|
| **Classic (`classic`)** | 10 (3H / 3S / 4N) | 10/10 WebP | `verified` (100% untouched) | ✅ **LIVE IN PRODUCTION** |
| **Wave 1 (`starter-eight` additions)** | +8 (4H / 4S / 0N) | 8/8 WebP (`1024×1536`) | 4 `verified` + 4 `house-rule-approved` | 🔒 Experimental Only (`ALLOW_EXPERIMENTAL_RULESETS=1`) |
| **Wave 2 (`starter-sixteen` additions)** | +8 (3H / 3S / 2N) | 8/8 WebP (`1024×1536`) | 8 `house-rule-approved` | 🔒 Experimental Only (`ALLOW_EXPERIMENTAL_RULESETS=1`) |
| **Total Playable (`starter-sixteen`)** | **26 (10H / 10S / 6N)** | **26/26 WebP** | **16/56 expansion implemented** | 🔒 Experimental Beta Ready |
| **Remaining Catalog (Waves 3+)** | 40 (7H / 8S / 25N) | 0/40 | `needs-clarification` / `not-started` | 🔒 Hard-Blocked by Playability Gate |

---

## 2. Deliverable Inventory (`docs/boardgame-expansion/phase-3/`)

1. [`phase-3-scope.md`](./phase-3-scope.md) — Wave 2 scope & distinction from original Tier-3 roadmap
2. [`rules-decisions.md`](./rules-decisions.md) — Global rules (`LocationAlias`, 9-step Damage Pipeline, Retaliation anti-loop, Sequential Draw Queue) + 8 character house rules
3. [`phase-3a-implementation.md`](./phase-3a-implementation.md) — Engine, registry, worker, and UI architecture summary for Milestone 3A
4. [`character-art-prompts.md`](./character-art-prompts.md) — 8 HUSTVerse Midnight Anime Noir art direction & prompt specs
5. [`asset-manifest.json`](./asset-manifest.json) — Machine-readable asset manifest with exact dimensions, file sizes & SHA-256 digests
6. [`character-contact-sheet.webp`](./character-contact-sheet.webp) & [`character-contact-sheet.png`](./character-contact-sheet.png) — 3-Faction visual review sheet
7. [`phase-3b-art-report.md`](./phase-3b-art-report.md) — Visual QC audit, candidate selections, and Playwright Desktop/Mobile verification
8. [`starter-sixteen-sim-data.json`](./starter-sixteen-sim-data.json) — Raw 10,000-match deterministic simulation output
9. [`phase-3c-simulation-report.md`](./phase-3c-simulation-report.md) — Paired-seed balance analysis, G43 counterplay breakdown & Neutral Cindy/Bipolar metrics
10. [`integration-test-report.md`](./integration-test-report.md) — Full test & CI verification matrix
11. [`classic-regression-report.md`](./classic-regression-report.md) — 25/25 SHA-256 RNG + 4,500-match Classic 0.00% diff proof
12. [`remaining-risks.md`](./remaining-risks.md) — P0/P1/P2 Risk Register & technical debt
13. [`phase-3-handoff.md`](./phase-3-handoff.md) — This handoff document
14. Updated [`../expansion-roadmap.md`](../expansion-roadmap.md) — Reconciled wave-based delivery (`Starter Eight`, `Starter Sixteen`) vs remaining 40 characters

---

## 3. Recommended Next Phase (Phase 4 / Wave 3 Entry Criteria)

1. **Conduct Internal Human Beta Playtest on `starter-sixteen`** (staging/local with `ALLOW_EXPERIMENTAL_RULESETS=1`): collect ≥ 100 human games focusing on `G43` counterplay, `Bipolar` social counterplay, `Cindy` 5P/6P pacing, and secret-reaction pacing.
2. **Next Wave 3 Candidates (8–10 Tier 2 characters):** Prioritize characters that reuse existing infrastructure (`LocationAlias`, `BEFORE_DAMAGE`, `ON_DRAW_CARD`, `ON_ELIMINATION`, `ON_TURN_START`) while continuing to balance all 3 factions, and refactor `eq_chocolate` (`A/E/U`) to read dynamically from `DEFAULT_CHARACTER_REGISTRY`.
3. **Keep Tier 4 Core Mechanics Deferred until Wave 4+:** `Voodoo`, `Undead`, `Bonnie`, `N.C. Soldier`, `Antimony`, `Vengeful Spirit`, `Cain`, and `Lloyd` remain explicitly unimplemented until their cross-system primitives (`TurnOwnershipOverride`, `PendingResurrection`, `DynamicAllegiance`, `CopiedVictoryGraph`) are ratified and built.
