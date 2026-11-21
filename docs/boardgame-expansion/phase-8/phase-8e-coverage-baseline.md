# Phase 8E — Gameplay Stability & Reliability Coverage Baseline (8E-0)

> **Audited HEAD:** `7ff5c257327e4aa4d16ba8f752df4a58e678fa09` (CI Run [`#44904290395`](https://github.com/haianhant/hust-hsk/actions/runs/44904290395) — 8/8 `completed / success`)
> **Audit Date:** 2026-11-21
> **Methodology:** Automated static scan across all **24 behavioral boardgame test files** (`169 test()` blocks, excluding portrait/VFX/lounge/HUD-only files) combined with an **80-match instrumented runtime sample** across `classic`, `expansion-1`, `expansion-2`, and `full-expansion` (4P–8P) plus direct code inspection of domain and Durable Object handlers.

---

## 1. Executive Summary of Measured Baseline Gaps

| Surface | Total Catalog | Covered Adequately | Weakly Covered / Partial | Untested / Blind Spot |
|---|---:|---:|---:|---:|
| **Playable Characters** | 66 (10 Classic + 56 Expansion) | 49 | 17 | 0 static (`0` hits), **15** runtime-silent in 80-match random fuzz |
| **Independent Victory Conditions** | 25 Neutral roles (+ 2 Factions + Multi-Faction) | 16 | 9 | Incomplete 4P–8P / near-miss / simultaneous projection matrix |
| **Canonical Cards** | 40 distinct IDs (**48 copies**) | 23 distinct IDs | 13 distinct IDs (`<=1` use test) | **4 distinct IDs / 6 copies** (`inv-03`, `inv-04`, `inv-10`, `eq-10`) have **0** explicit tests |
| **High-Interaction Fuzz Rosters** | 4 fixed Phase 8B rosters | 2 valid rosters | **2 broken rosters** | `exp2_felicia` and `exp2_ernest` are invalid role IDs (silently fell back to George!) |
| **Real DO Chaos & Persistence** | 16 target chaos dimensions | 6 basic covered | 5 partial | **5** untested (dual client same-player race, out-of-order WS queue, network drop during game end, long reaction chains under DO alarm, concurrent room stress) |
| **Load / Soak / Mutation** | Concurrency (`5..50` rooms), Soak, 8 core predicates | 0 | 0 | **Not yet implemented** |

---

## 2. Immediate Defects & Blind Spots Discovered During 8E-0 Audit

1. **Broken Fixture Role IDs in Phase 8B Targeted Fuzzer (`scripts/fuzz-boardgame-stateful.cjs:430, 445`):**
   - Roster `voodoo-father-harrison-felicia-gloria` listed `'exp2_felicia'` instead of `'exp1_felicia'`.
   - Roster `undead-vengeful-spirit-antimony-gideon-cain` listed `'exp2_ernest'` instead of `'exp1_ernest'`.
   - `applyForcedRoster()` did not validate `isKnownBoardGameRoleId()`, causing `getRoleDesign()` to silently fall back to `'gac-ky-thuat'` (George). As a result, `Voodoo + Felicia` and `Undead + Ernest` were **never** exercised by Phase 8B's targeted rosters.
2. **Suspected P1/P0 Card Defect (`features/boardgame/domain/expansion-skills.ts:5643-5655` — `ev_banana_peel`):**
   - When `actor.equipped.length > 0`, `applyExpandedUseCard` delegates `ev_banana_peel` directly to Classic `resolveUseCard()` and returns immediately while `actions.ts` has `continuationManaged = true`.
   - Consequence to verify & reproduce in 8E-1: skips `deliverNextGloriaQueuedCard()` (can strand Gloria's 2nd queued card and deadlock `ATTACK`/`END_TURN`) AND skips `callbacks.finalizeIfFinished()` (if handing equipment gives **Colt** 3rd weapon, **Bob** 5th item, or **N.C. Soldier** 3rd weapon, immediate victory does not fire on that action!).
3. **Suspected P1 Copied-Skill Defect (`features/boardgame/domain/expansion-skills.ts:10181-10239` — `GIDEON_DRAW_WHITE_CARD`):**
   - `case 'eq_advent'` unconditionally heals the `GIDEON_DRAW_WHITE_CARD` holder without verifying `getEffectiveFaction(state, gideon) === 'lantern-guard'`. When `Vengeful Spirit` (Shadow) or `Antimony` (Neutral) copies Gideon and draws `eq-13` (Advent), a non-Hunter receives full Hunter-only healing.
   - `case 'eq_chocolate'` unconditionally ignores the card even if `Antimony` (`sourceName = 'Antimony'`, eligible by `A/E/U` rule) copied Gideon.
4. **Zero-Test Canonical Cards (4 distinct IDs / 6 copies):**
   - `inv-03` (`inv_greed`, x2 copies) — **0 explicit test blocks**
   - `inv-04` (`inv_slap`, x2 copies) — **0 explicit test blocks**
   - `inv-10` (`inv_bully`, x1 copy, Max HP `<= 11`) — **0 explicit test blocks**
   - `eq-10` (`eq_guardian_angel`, x1 copy, normal-attack shield) — **0 explicit test blocks**

---

## 3. Character & Runtime Activation Baseline (66 Roles)

- **Static test scan (24 behavioral test files, 169 `test()` blocks):**
  - All 66 role IDs appear in at least 2 test blocks, **however**:
  - `exp2_freyja` has only **1** skill test block and **0** negative-path assertions.
  - `exp1_fea`, `exp2_eleanor`, `exp2_umibozu`, `exp2_urban_legend`, `exp2_gideon`, `exp2_april_skipps` each have only **1** negative-path test block.
  - Several Neutral victory roles (`exp1_arnold`, `exp1_angel`, `exp2_dalton`, `exp2_bianca`, `exp2_cruz`, `exp2_april_skipps`, `exp2_bryon`, `lang-cuu-ho`, `lang-tien-phong`) have `<= 2` victory test blocks and lack systematic near-miss negative checks, 4P–8P deal applicability checks, and simultaneous-winner projection checks.
- **80-match instrumented random fuzz baseline (20 matches per ruleset, 4P–8P):**
  - Roles dealt/appeared: **66/66**
  - Roles with `> 0` recorded runtime activations: **51/66**
  - Roles with **`0` recorded runtime activations (15 roles)**:
    - 8 Expansion conditional/situational roles: `exp1_arnold`, `exp2_fujiko`, `exp2_usurper`, `exp2_april_skipps`, `exp2_bonnie`, `exp2_bianca`, `exp2_arlene`, `exp2_bryon`.
    - 7 Classic passive/situational roles whose Classic hooks do not increment `expansionState.stats.activationsByRole`: `gac-truc-ban`, `suong-an-danh`, `suong-tin-gia`, `suong-gac-cong`, `lang-anh-san`, `lang-cuu-ho`, `lang-tien-phong`.
  - **Key takeaway:** Random fuzzing alone leaves conditional/situational roles unexercised even when all 66 roles appear in rosters. Deterministic targeted tests and risk-weighted interaction rosters are required.

---

## 4. Canonical Card Audit Baseline (40 Distinct IDs / 48 Copies)

- **Catalog Conservation Verified:** `16` Investigation (`inv-01..inv-12`) + `16` Equipment/White (`eq-01..eq-15`) + `16` Event/Black (`ev-01..ev-13`) = **48 canonical copies**.
- **Untested (0 explicit tests):** `inv-03` (x2), `inv-04` (x2), `inv-10` (x1), `eq-10` (x1).
- **Weakly tested (`<= 1` explicit use test):** `inv-02`, `inv-06`, `inv-07`, `inv-08`, `inv-09`, `inv-11`, `inv-12`, `eq-06`, `eq-12`, `eq-15`, `ev-04`, `ev-05`, `ev-11`.
- **Cross-cutting gaps across cards:**
  - Deck exhaustion + deterministic reshuffle under `takeOneCardFromDeck` has minimal dedicated assertions per deck.
  - Duplicate execution (`USE_CARD` twice on same cardId / stale hand card) and invalid target rejection (self-target on `eq-08`/`ev-07`/`ev-08`/`ev-10`, dead/dormant target, wrong phase) are not uniformly asserted across all 40 card IDs.
  - Match ending *during* multi-step card resolution (`eq-11` Flare, `ev-07` Bat, `ev-08` Spider, `ev-09` Dynamite, `ev-10` Doll, `ev-12` Banana Peel) has major gaps.

---

## 5. Existing Fuzzing & DO Test Suite Gaps

- **`scripts/fuzz-boardgame-stateful.cjs`:**
  - Lacks per-role activation telemetry, per-card execution telemetry, and cross-character interaction pair counters.
  - Only covers 4 static high-interaction rosters (2 with role ID typos).
  - Does not systematically cover all 5 mandatory Phase 8E interaction families (A–E) or risk-weighted pairwise/3-way combinations.
- **Real Durable Object Suites (`boardgame-match-do.test.cjs`, `boardgame-phase7d-integration.test.cjs`, `boardgame-phase8a-beta-release.test.cjs`, `boardgame-phase8b-stateful-audit.test.cjs`):**
  - Covered: 4P–8P creation, basic reconnect, hibernation wakeup, `BUG-8B-02` pendingChoice alarm retention, `BUG-8B-03` deadline refresh, Beta flag gating, Spectator P0 privacy.
  - Missing/Partial:
    - Disconnect while owning a **private** `PendingChoice` + reconnect *just before* vs *just after* deadline.
    - Two concurrent WebSocket clients attempting to act for the same player (session takeover vs concurrent race).
    - Duplicate WebSocket action (idempotency via `requestId`) + out-of-order `expectedRevision` + delayed message arrival.
    - Host explicitly leaving waiting room (`BG_LEAVE`) vs Host disconnecting mid-match.
    - Network interruption right at match finish + verifying zero duplicated leaderboard/reward mutations.
    - Long out-of-turn reaction chains across hibernation + pending alarms.
    - Multi-room concurrency (`5, 10, 25, 50` rooms) & long-running soak profiling.
    - Targeted mutation testing on the 8 core engine predicates.
