# Bóng Đêm KTX — Phase 6 Scope (`Wave 5 / Tier-3 Completion — starter-forty-eight`)

- **Date:** 2026-11-21
- **Branch:** `main`
- **Verified Clean Baseline HEAD:** `5e91f041811b3134244bee150987d5d5a313663f` (Phase 5E, 8/8 GitHub Actions CI jobs GREEN, Run `44780484209`).

---

## 1. Verified Baseline Before Phase 6

| Dimension | Verified Baseline (End of Phase 5) | Phase 6 Target (End of Phase 6E) |
|---|---|---|
| Classic Playable Roles | 10 (`3H / 3S / 4N`) — **Production LIVE** | **10 (`3H / 3S / 4N`) — 100% UNTOUCHED** |
| Expansion Implemented Roles | 38 / 56 (`15H / 15S / 8N`) | **48 / 56 (`16H / 15S / 17N`)** |
| Total Playable Roles | 48 / 66 (`18H / 18S / 12N`) | **58 / 66 (`19H / 18S / 21N`)** |
| Remaining Unimplemented Roles | 18 / 56 (`10 Tier-3 + 8 Tier-4`) | **8 / 56 (Strictly Tier-4 ONLY — Locked)** |
| Unique Character Portraits (`1024×1536` WebP) | 48 / 48 (`95` Midnight Noir assets total) | **58 / 58 (`105` Midnight Noir assets total)** |
| Experimental Ruleset | `starter-thirty-eight` (`enabledInProduction: false`) | **`starter-forty-eight` (`enabledInProduction: false`)** |
| Production Ruleset | `classic` only | **`classic` only (Zero Production Expansion Activation)** |
| Classic RNG & Simulation | `25/25` SHA-256 + `4,500`-match `0.00%` diff | **`25/25` SHA-256 + `4,500`-match `0.00%` diff** |
| Simulation Volume | 20,000 matches (`starter-thirty-eight`) | **25,000 matches (`starter-forty-eight`, 5,000 × 4P–8P)** |

---

## 2. Exact Target Roster (10 Tier-3 Characters — Tier-3 Completion)

| # | Role ID | Source Name | Pack | Faction | Max HP | Original Refs | Rules Status Target |
|---:|---|---|---|---|---:|---|---|
| 1 | `exp2_gideon` | Gideon | `expansion-2` | Hunter (`lantern-guard`) | 14 | `RC-16` | `house-rule-approved` |
| 2 | `exp1_anathema` | Anathema | `expansion-1` | Neutral (`wanderer`) | 8 | `RC-20` | `house-rule-approved` |
| 3 | `exp1_bethany` | Bethany | `expansion-1` | Neutral (`wanderer`) | 10 | `RC-20` | `house-rule-approved` |
| 4 | `exp1_arnold` | Arnold | `expansion-1` | Neutral (`wanderer`) | 8 | `RC-16` | `house-rule-approved` |
| 5 | `exp1_cassie` | Cassie | `expansion-1` | Neutral (`wanderer`) | 11 | `RC-20` | `house-rule-approved` |
| 6 | `exp1_clairvoyant` | Clairvoyant | `expansion-1` | Neutral (`wanderer`) | 11 | `RC-20` | `house-rule-approved` |
| 7 | `exp2_april_skipps` | April & Skipps | `expansion-2` | Neutral (`wanderer`) | 8 | `RC-15` | `house-rule-approved` |
| 8 | `exp2_colt` | Colt | `expansion-2` | Neutral (`wanderer`) | 11 | `RC-16` | `house-rule-approved` |
| 9 | `exp2_diana` | Diana | `expansion-2` | Neutral (`wanderer`) | 13 | `RC-13` | `house-rule-approved` |
| 10 | `exp2_aaron` | Aaron | `expansion-2` | Neutral (`wanderer`) | 8 | `RC-14` | `house-rule-approved` |

> **Important Correction vs Phase 5 Handoff Note:** `docs/boardgame-expansion/character-catalog.json` is the authoritative catalog specification. `exp2_gideon` is implemented strictly per the catalog (*"Bạn có thể lập tức rút và dùng 3 'Thẻ bài trắng' sau khi một Shadow bị hạ gục"*), **not** as a damage-redirection character.

---

## 3. Strictly Excluded Tier-4 Roles (Deferred to Phase 7)

The following **8 Tier-4 roles** MUST remain `rulesStatus: "needs-clarification"`, `implementationStatus: "not-started"`, `availability: "coming-soon"`, and strictly excluded from `starter-forty-eight` and production:

- **Hunter (1):** `exp1_lloyd` (Global Attack Interrupt)
- **Shadow (3):** `exp1_vengeful_spirit` (Dynamic Skill Copy), `exp1_voodoo` (Turn Ownership Override), `exp1_undead` (Pending Resurrection)
- **Neutral (4):** `exp1_antimony` (Dynamic Skill + Copied Victory), `exp2_cain` (Multi-Faction Victory), `exp2_bonnie` (Dynamic Allegiance), `exp2_nc_soldier` (Dynamic Allegiance)

---

## 4. Five Sequential Milestones

1. **Phase 6A — Rules Ratification & Shared Engine Foundations:**
   - Ratify experimental house rules (`rules-decisions.md`), build `CAP-07 CopiedVictoryGraph` (`copied-victory-graph.ts`), `CAP-06 DamageRedirection` (`damage-redirection.ts`), `Authoritative Reveal Events` (`reveal-events.ts`), `CAP-10 Canonical Fictional Character Metadata` (`character-metadata.ts`), `Equipment Transfer/Theft Transactions` (`equipment-transactions.ts`), privacy deadline hardening, and exhaustive foundation tests (`test/boardgame-phase6a.test.cjs`).
2. **Phase 6B — Ten Tier-3 Gameplay Implementations, `starter-forty-eight` & UI:**
   - Implement all 10 Tier-3 skills, PendingChoices, VictoryEngine bindings, `TRANSFER_TO_BETHANY` server action, `starter-forty-eight` (`58` roles, experimental-only), UI controls/badges/private Clairvoyant vision panel, and focused character tests (`test/boardgame-phase6b.test.cjs`).
3. **Phase 6C — Ten Real AI Portraits (`58/58`) & Cinematic Integration:**
   - Generate & visually inspect 10 original `1024×1536` `HUSTVerse Midnight — Anime Noir` WebP portraits (`58/58` unique SHA-256), build Contact Sheet & `asset-manifest.json`, restore strict `MIDNIGHT_CHARACTER_ART`, add Prototype Section 5F (`105` assets total), and run Desktop/Mobile Playwright visual QA.
4. **Phase 6D — Cross-Character, Privacy Security & Real Cloudflare DO 4P–8P E2E:**
   - Validate all 25 mandatory cross-character scenarios, real Cloudflare DO SQLite + WebSocket 4P–8P E2E, hibernation/reconnect across chained reactions, production ruleset rejection, and hidden-information security audit.
5. **Phase 6E — 25,000-Match Simulation, Balance, Classic Zero-Regression & Handoff:**
   - Run 25,000 deterministic matches (`5,000 × 5` across `4P–8P`), reconcile telemetry, conduct targeted balance analysis (without auto-rebalancing), prove Classic 0.00% regression (`victory.ts` 0-diff, 25/25 SHA-256, 4,500-match equivalence), pass all CI gates locally and on GitHub Actions, and complete Phase 6 handoff.
