# Phase 3 — Wave 2 Scope & Roadmap Alignment

- **Phase:** Phase 3 — Character Expansion Wave 2 (Gameplay, Artwork & Balance)
- **Milestones:** `3A` (Rules Ratification & Gameplay Implementation), `3B` (AI Character Portraits & Cinematic Integration), `3C` (Integration QA, Simulation & Balance Analysis)
- **Target Roster Added in Wave 2 (8 Characters):**
  - **Hunter (3):** `exp1_elysia` (Elysia, 10 HP), `exp2_father_harrison` (Father Harrison, 12 HP), `exp2_gloria` (Gloria, 14 HP)
  - **Shadow (3):** `exp2_unchained` (Unchained, 11 HP), `exp2_warlock` (Warlock, 14 HP), `exp2_witch` (Witch, 14 HP)
  - **Neutral (2):** `exp1_cindy` (Cindy, 11 HP), `exp1_bipolar` (Bipolar, 10 HP)
- **Cumulative Playable Pool (Experimental `starter-sixteen`):** **26 characters** (`10 Classic` + `8 Phase 2 Starter Eight` + `8 Phase 3 Wave 2` = `10 Hunter`, `10 Shadow`, `6 Neutral`).

---

## 1. Distinction vs. Original Phase 0 Roadmap

The Phase 0 [`expansion-roadmap.md`](../expansion-roadmap.md) initially planned broad tier batches (30 characters in Phase 2, 18 Tier-3 characters in Phase 3). Following the incremental wave discipline established in Phase 2 (`starter-four` → `starter-eight` → Phase 2.5 portraits), **Phase 3 adopts a focused Wave 2 delivery of 8 characters** that introduces three critical architectural milestones safely:

1. **Official Expansion Location Alias Layer** (`Church -> lobby`, `Weird Woods -> corridor`, `Erstwhile Altar -> court`) with strict `exact location` vs `cluster` separation (`Warlock`, `Witch`, `Father Harrison`, `Gloria`).
2. **Full 9-Step Damage & Retaliation Pipeline** with `causationId` / `retaliation` loop prevention (`Elysia`, `Unchained`, `Warlock`, `Witch`, `Cindy`).
3. **First Expansion Neutral Victory Conditions** evaluated inside `VictoryEngine` without disturbing Classic (`Cindy` solo/5P-fallback + `Bipolar` conditional end-of-match victory).

> **Important Scope Boundary:** The original 18 Tier-3 characters and 8 Tier-4 characters (total **40 remaining expansion characters** out of 56) are **NOT** implemented or marked complete in Phase 3. Production rulesets remain strictly **`classic`-only** (`starter-four`, `starter-eight`, `starter-sixteen` are experimental-only; `expansion-1`, `expansion-2`, `full-expansion` stay `coming-soon` / blocked).

---

## 2. Milestone Acceptance Gates

| Milestone | Scope | Hard Gates |
|---|---|---|
| **3A** | Rules ratification (`rules-decisions.md`), `LocationAlias`, 9-step damage pipeline, 8 skill + victory handlers, `starter-sixteen` experimental pool, gameplay UI controls | Catalog validator PASS, `typecheck` PASS, Phase 3A unit tests + all Phase 1/2 tests PASS, Classic unchanged |
| **3B** | 8 real `1024×1536` WebP Anime Noir portraits (`< 500 KB`), Faction Contact Sheet, `asset-manifest.json`, UI/Cinematic/Prototype integration | All 8 visually inspected & approved, 26/26 mapped in `MIDNIGHT_CHARACTER_ART`, Playwright Desktop/Mobile visual QA + P0 secrecy PASS |
| **3C** | Cross-character matrix tests, real DO 4P–8P E2E, `10,000`-match `starter-sixteen` simulation + G43 counterplay analysis, full Classic regression & CI | 25/25 Classic RNG SHA-256 identical, 4,500-match Classic sim identical, 0 deadlocks/privacy leaks, all CI gates PASS |
