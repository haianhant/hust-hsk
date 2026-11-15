# Bóng Đêm KTX v3.1 — Balance Simulation Analysis (`node test/boardgame-sim.cjs`)

> **Ruleset:** v3 (`BOARD_GAME_RULESET_VERSION = 3`, `BOARD_GAME_PROTOCOL_VERSION = 1`)  
> **Simulation Suite:** [`test/boardgame-sim.cjs`](../../test/boardgame-sim.cjs)  
> **Scope:** 4,500 server-engine simulated matches (900 games per table size across 4P, 5P, 6P, 7P, and 8P) executed sequentially against the v3.1 release candidate engine.  
> **Guardrail Result:** **PASS** — `4,500/4,500` matches completed with `0` stalled games, `0` draws, `0` mutual wipeouts, and `0` bot projection/secret-leakage violations (`botAccessViolations = 0`).

---

## 1. Automated Balance Guardrail Compliance

| Guardrail Metric | Required Threshold | Observed Value | Status |
| :--- | :--- | :--- | :--- |
| Total Simulated Games (`4P..8P`) | `4,500` (`900 × 5` sizes) | `4,500` | `PASS` |
| Stalled Games | `0` | `0` | `PASS` |
| Draws / Mutual Wipeout | `0` draws | `0` draws (`0` mutual wipeouts) | `PASS` |
| Bot Projection Integrity Violations | `0` | `0` | `PASS` |
| Đội Gác Đèn (`lantern-guard`) Primary Win Rate | `30.00% – 62.00%` | `50.76%` | `PASS` |
| Hội Màn Sương (`mist-order`) Primary Win Rate | `30.00% – 62.00%` | `41.98%` | `PASS` |
| Kẻ Lang Thang (`wanderer`) Win Involvement (`5P–8P`) | `12.00% – 58.00%` | `42.28%` (`403` solo + `1,880` co-wins / `5,400` appearances) | `PASS` |
| Individual Character Win Rate (All 9 Roles) | `20.00% – 68.00%` | `35.38% – 52.14%` | `PASS` |
| Round-1 Player Death Rate | `< 2.000%` | `0.00%` (`0` across all 4P–8P sizes) | `PASS` |
| Early Ending Rate (Rounds 1–2) | `< 5.00%` | `0.00%` (earliest end Round `3`) | `PASS` |

---

## 2. Match Pacing, Eliminations & Win Reasons

- **Average Match Length:** `8.88` rounds (range `3 – 10` rounds; `68.51%` reached max-round Rạng Sáng resolution).
- **Round End Distribution:** Round 3 (`2`), Round 4 (`14`), Round 5 (`117`), Round 6 (`212`), Round 7 (`301`), Round 8 (`451`), Round 9 (`1,718`), Round 10 (`1,685`).
- **Elimination Pacing:** Average `2.47` eliminations per game; average first elimination at Round `4.83` (`round1PlayerDeathRatePct = 0`, `round1DeathMatchPct = 0`, `earlyEndRounds1To2Pct = 0`).
- **Primary Win Breakdown (`4,500` games):**
  - Elimination Victory: `1,623`
  - Rạng Sáng Tiebreak (`dawnTiebreak`): `2,550` (`eliminationAdvantage: 1,618`, `guardWatchAdvantage: 299`, `mistStealthControl: 348`, `exactTieGuardDefault: 285`; `wandererCoWinAttached: 1,030`)
  - Wanderer Solo Objectives: `Hải` (`304`) + `Trang` (`23`) = `327` (`wandererSoloPct = 7.27%`, `wandererLastStandingPct = 0%`)

### Modeled Human Match Duration Estimates

| Table Size | Avg Total Turns | Fast (`18s/turn + 1.5m`) | Typical (`25s/turn + 1.5m`) | Deliberate (`32s/turn + 1.5m`) |
| :--- | ---: | ---: | ---: | ---: |
| `4P` | `31.42` | `10.9 min` | `14.6 min` | `18.3 min` |
| `6P` | `43.09` | `14.4 min` | `19.5 min` | `24.5 min` |
| `8P` | `59.43` | `19.3 min` | `26.3 min` | `33.2 min` |

---

## 3. Balance by Table Size (`4P – 8P`, 900 Games Each)

| Players | Games | Đội Gác Đèn Win % | Hội Màn Sương Win % | Lang Thang Primary Solo % | Lang Thang Win Involvement % | Avg Rounds | Early End % | Round-1 Deaths |
| :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `4P` | `900` | `52.22%` | `47.78%` | `0.00%` | `0.00%` | `8.78` | `0.00%` | `0` |
| `5P` | `900` | `53.44%` | `38.78%` | `7.78%` | `39.89%` | `8.38` | `0.00%` | `0` |
| `6P` | `900` | `48.33%` | `38.78%` | `12.89%` | `37.94%` | `8.55` | `0.00%` | `0` |
| `7P` | `900` | `51.00%` | `43.11%` | `5.89%` | `45.67%` | `9.46` | `0.00%` | `0` |
| `8P` | `900` | `48.78%` | `41.44%` | `9.78%` | `46.11%` | `9.21` | `0.00%` | `0` |

*Note: At `4P`, roster composition uses 2 Đội Gác Đèn vs 2 Hội Màn Sương with no Wanderer slot, yielding a near-even `52.22% / 47.78%` split. Across `5P–8P`, Wanderer wins and co-wins add strategic swing without pushing either core faction outside healthy bounds.*

---

## 4. Character Performance (All 9 Original Roles)

| Role ID | Character Name | Faction | Appearances | Win Rate % | Survival % | Reveal % | Solo Wins |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| `gac-ky-thuat` | Minh — Kỹ Thuật Viên | Đội Gác Đèn | `3,606` | `52.14%` | `67.58%` | `96.70%` | `0` |
| `gac-truc-ban` | Lan — Trực Ban Nội Trú | Đội Gác Đèn | `3,603` | `51.48%` | `62.73%` | `96.59%` | `0` |
| `gac-radio` | Khánh — Phát Thanh Viên KTX | Đội Gác Đèn | `3,591` | `48.20%` | `36.65%` | `96.21%` | `0` |
| `suong-an-danh` | Tú — Cư Dân Vô Hình | Hội Màn Sương | `3,602` | `42.00%` | `54.19%` | `94.34%` | `0` |
| `suong-tin-gia` | Vy — Người Gửi Tin Đồn | Hội Màn Sương | `3,591` | `40.38%` | `48.93%` | `94.26%` | `0` |
| `suong-gac-cong` | Dũng — Bóng Đêm Hành Lang | Hội Màn Sương | `3,607` | `43.69%` | `59.86%` | `94.70%` | `0` |
| `lang-anh-san` | Hải — Người Săn Gói Tin | Kẻ Lang Thang | `1,775` | `35.38%` | `75.04%` | `40.85%` | `304` |
| `lang-quan-sat` | Trang — Người Ghi Chép | Kẻ Lang Thang | `1,765` | `41.76%` | `76.26%` | `57.90%` | `44` |
| `lang-cuu-ho` | Bình — Người Bảo Hộ | Kẻ Lang Thang | `1,860` | `49.35%` | `70.32%` | `95.97%` | `55` |

---

## 5. Strategic Agency, Voluntary Reveal & Card Economy

### Bot Strategy Profiles vs Random Legal Play

| Strategy Profile | Games | Win Rate % |
| :--- | ---: | ---: |
| `neutral-objective` | `3,372` | `51.42%` |
| `defensive` | `3,375` | `49.57%` |
| `bluffing` | `3,373` | `49.13%` |
| `team-coordinator` | `3,375` | `48.92%` |
| `aggressive` | `3,378` | `48.02%` |
| `investigator` | `3,377` | `46.67%` |
| `equipment-focused` | `3,376` | `46.09%` |
| `random-legal` | `3,374` | `24.27%` |

Purposeful profiles win roughly **2x** as often (`46.09% – 51.42%`) as `random-legal` (`24.27%`), confirming meaningful player agency.

### Voluntary Role Revelation Timing & Impact

- **Total Voluntary Reveals:** `24,153` (average reveal round: `3.66`)
- **Round Histogram:** R1 (`1,630`), R2 (`4,611`), R3 (`5,115`), R4 (`8,553`), R5 (`1,447`), R6 (`879`), R7 (`577`), R8 (`737`), R9 (`384`), R10 (`220`)
- **Revealed vs Unrevealed Win Rate Delta:**
  - `lantern-guard`: `51.42%` revealed (`10,422`) vs `28.31%` unrevealed (`378`) → `+23.11%` delta
  - `mist-order`: `43.39%` revealed (`10,199`) vs `18.97%` unrevealed (`601`) → `+24.42%` delta
  - `wanderer`: `52.80%` revealed (`3,532`) vs `22.38%` unrevealed (`1,868`) → `+30.43%` delta

### Average Actions & Event Card Funnel

- **Average Actions / Match:** `attack = 20.22`, `equip = 11.17`, `skill = 10.91`, `investigate = 7.79`, `defend = 1.61`, `event = 1.57`
- **Event Funnel (across 4,500 games):** `12,600` opening-hand events + `26,549` Phase-2 drawn events + `3,385` Vy reveal bonuses → `7,051` played (`ev-01: 897`, `ev-02: 883`, `ev-03: 884`, `ev-04: 909`, `ev-05: 911`, `ev-06: 721`, `ev-07: 957`, `ev-08: 889`), `17,781` held unplayed at game end.

---

## 6. Balance Risks Observed & Recommendations for Post-RC Observation

1. **Đội Gác Đèn Slight Edge at 4P–5P (`52.22%` / `53.44%`):** Slightly favors Đội Gác Đèn due to `exactTieGuardDefault: 285` and defensive healing combos (`Minh`/`Lan`), though well within the `30%–62%` guardrail. Track win rates in `UAT-01` human playtests before adjusting HP or Rạng Sáng tiebreak weights.
2. **Low `event` Play Ratio (`7,051` played vs `17,781` left in hand):** Bots heavily favor `attack`/`skill` over `event` cards in tactical turns. Observe human card-usage telemetry in staging logs (`BG_METRIC`) to see whether human players utilize Event cards more actively or if minor Phase-2/event slot UX cues help.
