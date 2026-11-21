# Phase 8E — Real Durable Object Chaos & Persistence Report (8E-3)

> **Test Suite:** [`test/boardgame-phase8e-do-chaos.test.cjs`](../../../../test/boardgame-phase8e-do-chaos.test.cjs) (integrated into Fast CI via `npm run test:boardgame` and `npm run test:stability:fast`)
> **Infrastructure:** Real `BoardGameRoom` Durable Object + persistent SQLite storage (`test/ws-shim/boardgame-do-harness.cjs`, `boardgame-sqlite.cjs`) + real WebSocket client connections (`mini-ws`), deterministic `container.triggerAlarm()` & `container.hibernateAndWake()` (zero arbitrary `sleep()` correctness waits).
> **Result:** **5/5 test groups PASS (`2.66s`)**, **0 state corruption**, **0 invariant violations**, **0 duplicated victory rewards**.

---

## Chaos & Persistence Scenario Coverage Matrix

| Scenario | Room Sizes / Rulesets | Verification Assertion | Result |
|---|---|---|---|
| **Host leaving waiting room (`BG_LEAVE`)** | 2+ seated, `full-expansion` | Next lowest-seat connected player promoted to `hostPlayerId`; `rulesetId` preserved unchanged (`8E3-1`). | **PASS** |
| **Concurrent game rooms (4P–8P)** | 5 simultaneous rooms: `4P classic`, `5P exp1`, `6P exp2`, `7P full`, `8P full` | Strict room isolation; exact `ruleset_id` & `catalog_version` persisted; 48-card invariants pass on all 5 rooms (`8E3-1`). | **PASS** |
| **Host disconnect mid-match + reconnect** | `8P full-expansion` | Match stays `PLAYING`; returning Host reconnects with exact `playerId` via `reconnectToken` (`8E3-1`). | **PASS** |
| **Spectator disconnect & reconnect** | `8P full-expansion` | Reconnected Spectator receives `privateView === null` and `revealedRoleId === null` on all hidden players (`8E3-1`). | **PASS** |
| **Disconnect while holding private `PendingChoice` + reconnect BEFORE deadline** | `4P full-expansion` (`turnTimeoutMs = 0`, secret Usurper choice) | `alarmAtMs` scheduled (`BUG-8B-02` guard); survives disconnect + `hibernateAndWake()`; non-owner steal rejected; returning owner resolves cleanly (`8E3-2`). | **PASS** |
| **Disconnect while holding private `PendingChoice` + reconnect AFTER deadline** | `4P full-expansion` (`turnTimeoutMs = 0`) | Past deadline + `hibernateAndWake()` + `triggerAlarm()` auto-resolves default option with zero deadlock; stale `choiceId` submission after reconnect rejected cleanly (`8E3-2`). | **PASS** |
| **Duplicate WebSocket action (`requestId`)** | `4P classic` | Replaying exact `requestId` returns idempotent `BG_ACTION_ACK` without bumping `revision` or re-rolling (`8E3-3`). | **PASS** |
| **Out-of-order `expectedRevision`** | `4P classic` | Stale `expectedRevision` rejected with `STALE_REVISION` and zero state mutation (`8E3-3`). | **PASS** |
| **Delayed stale-phase action** | `4P classic` | Late `ROLL_DICE` arriving after phase advanced rejected cleanly (`8E3-3`). | **PASS** |
| **Two simultaneous clients acting for same player** | `4P classic` | Second socket joining with same `reconnectToken` displaces older socket cleanly with WS close code `4001`; state invariants intact (`8E3-3`). | **PASS** |
| **Long reaction chain across DO hibernation** | `6P full-expansion` (`Anathema` redirect → hidden `Arnold` secret reflection) | DO hibernates & wakes mid-secret-choice; Arnold resolves reflection cleanly, survives, attacker takes reflected damage, 48 cards intact (`8E3-4`). | **PASS** |
| **Network drop during game end + zero duplicate victory rewards** | `6P full-expansion` | Player drops immediately before final lethal blow, then reconnects after `FINISHED`; final action replay + hibernation + `triggerAlarm()` produce identical `/api/boardgame/leaderboard` rows (**0 duplicated rewards**) (`8E3-4`). | **PASS** |
| **Production Beta rollback compatibility (`ENABLE_PRODUCTION_BETA_EXPANSIONS="0"`)** | `5P full-expansion` + `classic` + `starter-*` | Active `full-expansion` room continues & processes actions unconverted after flag flip + hibernation; new `expansion-1`/`expansion-2`/`full-expansion` creation rejected (`4xx`); all 7 `starter-*` rejected; new `classic` creation succeeds (`201`) (`8E3-5`). | **PASS** |
