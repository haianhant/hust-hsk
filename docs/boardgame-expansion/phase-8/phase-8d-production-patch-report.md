# Phase 8D — Production Beta Patch Validation & Release Report

> **Patch Target:** HUSTVerse — Bóng Đêm KTX Production Beta (`main`)
> **Base Commit (Phase 8A):** `72595c5d4730451d5e1d878874ded825d17aeb80`
> **Patch Commits:**
> 1. `19f9985` — `test(boardgame): phase 8b audit plan, state invariants & stateful fuzzer`
> 2. `ba24e81` — `fix(boardgame): phase 8b confirmed gameplay, privacy & DO alarm fixes`
> 3. `a1c4f4f` — `feat(boardgame): structured public visual event pipeline & 66-role vfx matrix`
> 4. `192c7d1` — `feat(boardgame): all 8 tier-4 signature VFX & coordinated WebAudio cues`
> 5. `ce831c3` — `feat(boardgame): tier-3 reusable VFX families, sandbox showcase & visual QA`
> 6. *(Commit 6 — this release documentation & handoff commit)*

---

## 1. Pre-Deploy Production Safety Audit

Live read-only checks against `https://hust-hsk-rooms.hunganhz179.workers.dev` prior to pushing:
- `GET /api/boardgame/matches` → `{"ok":true,"matches":[]}` (**0 active matches** — zero in-flight match disruption).
- `GET /api/boardgame/leaderboard?limit=10` → `totalPlayers: 4` (**Sv Bảo** `41pt`, **Nguyễn Đình An** `30pt`, **Hoang Ba Bao** `5pt`, **Hai Anh** `5pt` — all 4 historical records intact).
- Rollout feature flags in `worker/wrangler.toml` unchanged:
  - `ENVIRONMENT = "production"`
  - `ENABLE_PRODUCTION_BETA_EXPANSIONS = "1"`
  - `BETA_ALLOWED_RULESETS = "expansion-1,expansion-2,full-expansion"`
  - `ALLOW_EXPERIMENTAL_RULESETS` remains unset/disabled (all 7 `starter-*` rulesets blocked).
- Schema & persistence compatibility: `visualEvents` is strictly optional on `BoardGamePublicGameView` and `AuthoritativeGameState`, ensuring 100% backward compatibility with existing Durable Object SQLite snapshots and older clients.

---

## 2. Full Verification Gate Results (Pre-Push)

| Gate Command | Result | Evidence |
|---|---|---|
| `git diff --exit-code features/boardgame/domain/victory.ts` | **PASS** | 0-diff (Classic victory engine completely untouched) |
| `npm run typecheck` | **PASS** | `tsc --noEmit` + `worker/tsconfig.json` — 0 errors |
| `npm run test:learn` | **PASS** | 45/45 HSK & SRS unit tests |
| `npm run test:contracts` | **PASS** | 5/5 shared contracts & DO hibernation tests |
| `npm run test:world` | **PASS** | 32/32 campus geometry & collider tests |
| `npm run test:avatar` | **PASS** | 4/4 avatar gait & uniform contract tests |
| `npm run test:ui` | **PASS** | 15/15 `ui-gameplay` + **29/29 `boardgame-vfx`** (structured visual events, Tier-4 & Tier-3 audio, privacy, F5 dedupe) |
| `npm run test:study` | **PASS** | 22/22 Library Study & DO leaderboard tests |
| `npm run test:nav` | **PASS** | 4/4 campus A* navigation legs |
| `npm run test:mp` | **PASS** | 33/33 multiplayer WebSocket protocol scenarios |
| `npm run test:boardgame` | **PASS** | **205/205** boardgame unit/DO tests + **4,500/4,500** Classic v4 baseline (`0.00%` drift: Guard `39.73%`, Mist `45.56%`, Wanderer `14.71%`, `avgRounds 7.34`, `avgTurns 32.36`) |
| `node scripts/fuzz-boardgame-stateful.cjs --valid=400 --targeted=80 --adversarial=150 --replay=60` | **PASS** | **0 failures**: 400 Valid (`76,162` steps), 80 Targeted High-Interaction (`13,636` steps), 72/72 Deterministic Replay byte-identical, 150 Adversarial (`56,763/56,763` probes rejected, 0 mutations), including `visualEvents` P0 privacy & 48-cap invariants |
| `npm run build` | **PASS** | Static Next.js export `out/` (5/5 routes) |
| `cd worker && node scripts/deploy-ci.mjs --dry-check` | **PASS** | Bundled `.wrangler-dist/index.js` (`1,168,277 B` / `207.60 KiB` gzip) |
| `node scripts/verify-phase8c-visuals.cjs` | **PASS** | Desktop `1440×900`, Low Tier + Reduced Motion (`<= 280ms`), Mobile `390×844` (`0px` overflow), 0 console/page/HTTP errors |

---

## 3. Summary of Changes Shipped in This Production Beta Patch

### Track A — Phase 8B Deep Gameplay Audit (9 Confirmed Defects Fixed: 3 P0 + 6 P1)
- **P0 Fixes:** `BUG-8B-01` (Voodoo forced reveal / hidden-faction oracle on `eq-13`/`eq-14`/`ev-13`), `BUG-8B-02` (F5 reconnect during `pendingChoice` with `turn_timeout_ms <= 0` clearing `turn_deadline_ms`), `BUG-8B-09` (Father Harrison Sunday Service hijacking `ON_MOVE` on `ROLL_DICE` while mutating state and returning `ok: false`).
- **P1 Fixes:** `BUG-8B-03` (stale short choice deadline surviving choice resolution in same turn), `BUG-8B-04` (double turn advance in `applyTimeoutAutoTurn`), `BUG-8B-05` (`exp1_undead` pre-lethal reveal bypass via `ev-13`), `BUG-8B-06` (`DynamicAllegiance` inconsistencies after Bonnie Shadow conversion), `BUG-8B-07` (systemic `DynamicSkillCopy` bypass across 13+ runtime hooks), `BUG-8B-08` (`COPY_GOAL` dormancy guard, Angel parity, Cruz/Arlene/Dalton/Charles flags, Antimony own Bethany/Clairvoyant link, explicit `nowMs` determinism).

### Track B — Phase 8C Character VFX & Structured Visual Event Overhaul
- Replaced fragile log-text VFX inference with bounded (`<= 48`), monotonic, P0-redacted `BoardGameStructuredVisualEvent` emissions (`features/boardgame/domain/visual-events.ts`), keeping full legacy fallback and F5/reconnect zero-replay idempotency.
- Delivered bespoke Canvas 2D + DOM pawn state indicators + coordinated procedural WebAudio cues for all **8/8 Tier-4 characters** (`Lloyd`, `Vengeful Spirit`, `Voodoo`, `Undead`, `Antimony`, `Cain` + Dual-Faction `MultiFactionVictory`, `Bonnie`, `N.C. Soldier`) and **7 Tier-3 reusable effect families** (`REDIRECT_ARC`, `SHADOW_NOVA`, `MARK_SEAL`, `BOND_TETHER`, `CARD_CASCADE`, `FINISHER_SLASH`, `ANGEL_SANCTUARY`).
- Fixed Victory V2 card backdrop opacity (`bg-slate-950/92` → `bg-slate-950/95`) caught during Playwright visual screenshot review on Mobile and Low graphics tier.

---

## 4. Rollback Readiness

No rollback change required. Emergency Beta rollback remains a single-flag operation (`ENABLE_PRODUCTION_BETA_EXPANSIONS="0"` per [`rollback-runbook.md`](./rollback-runbook.md)) with zero impact on Classic matches or leaderboard data.
