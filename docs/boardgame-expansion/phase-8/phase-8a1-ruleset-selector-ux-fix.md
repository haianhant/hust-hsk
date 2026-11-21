# Phase 8A.1 — Pre-Match Game Mode Selector UX Fix (3D Seat-to-Match Flow)

> **Scope:** Targeted pre-match UX fix for the 3D Board Game Club seating flow (`handleSelectBoardGameSeat` → `joinOrCreateTableMatch`) in **HUSTVerse — Bóng Đêm KTX Production Beta**.
> **Baseline Commit:** `51103473d4906245e9858968765d9bc71c27f026` (Phase 8A + 8B + 8C + 8D)
> **Implementation Commit SHA:** `e9e9caa91119a9b2dc868995edb33c06776c44d0`
> **Production App:** [`https://hustverse.vercel.app/`](https://hustverse.vercel.app/) · **Cloudflare Worker:** `https://hust-hsk-rooms.hunganhz179.workers.dev`

---

## 1. Root Cause

In `app/page.tsx`, sitting at a physical 3D chair inside the Board Game Club (`handleSelectBoardGameSeat`) automatically calls `boardGameClient.joinOrCreateTableMatch()`, which creates or joins a Durable Object waiting room (defaulting to `classic` on room creation) and displays `BoardGameHUD` (`bg-hud-match-bar`: invite code, copy invite link, ready status, Ready button, Start Match button) while keeping the `"Sảnh & Mã mời"` modal (`BoardGameLobby`) closed (`boardGameLobbyOpen = false`).

Prior to Phase 8A.1, `BoardGameHUD` rendered **zero** ruleset indicators or controls—the only ruleset selector lived inside the separate `BoardGameLobby` modal. Players sitting directly at a 3D table could ready up and click **Bắt đầu** without ever discovering that **Expansion 1 (36 tướng)**, **Expansion 2 (40 tướng)**, and **Full Expansion (66 tướng)** Production Beta modes were enabled.

- **Reproduced BEFORE edits** on unmodified `out/` (`5110347`) + Production Beta SQLite DO harness:
  - Desktop (`1440×900`) & Mobile (`390×844`) after pressing `E` at chair `bg-t1-s0`: `lobbyOpenCount: 0`, `hudRulesetSelectorCount: 0`.

---

## 2. Before / After User Journey

| Step | Before Phase 8A.1 | After Phase 8A.1 |
|---|---|---|
| 1. Enter 3D CLB & sit at chair (`E`) | Auto-creates/joins room (`classic`), shows `bg-hud-match-bar` with Invite Code + Ready + Start only. | Same `joinOrCreateTableMatch()` auto-join, **plus** immediate server-synced Game Mode control directly in `bg-hud-match-bar`. |
| 2. Discover Expansion modes | Hidden inside separate `"Sảnh & Mã mời"` modal; easy to miss completely. | Host sees compact trigger `🎮 Chế độ chơi: Classic (10 tướng) STABLE ▼` immediately; 1 click opens all 4 modes (`Classic`, `Expansion 1`, `Expansion 2`, `Full Expansion`) with role counts, `STABLE`/`BETA` badges, and descriptions. |
| 3. Switch mode before Start | Required opening Lobby modal → switching → closing Lobby. | Host selects directly from HUD dropdown (or Lobby modal — both stay 100% synced). Start button updates dynamically (`▶ Bắt đầu · Full Expansion`). |
| 4. Guest / Spectator awareness | No active mode shown on HUD; guests unaware what ruleset the table is playing. | Guests and Spectators immediately see a compact read-only mode badge (`Full Expansion (66 tướng) BETA · Chủ bàn chọn chế độ chơi`) plus a subtle non-intrusive notice whenever Host changes mode live. |

---

## 3. Changed Files

| File | Role |
|---|---|
| `features/boardgame/ui/ruleset-selector-helpers.ts` *(new)* | Pure shared helpers for display labels (`Classic`, `Expansion 1`, `Expansion 2`, `Full Expansion`), release badges (`Stable` / `Beta` / `Unavailable`), mode-change notices, status lock rules (`isRulesetLockedForMatchStatus`), and resolved selector UI state (`resolveRulesetSelectorState`, `canRequestRulesetOption`). |
| `features/boardgame/network/client.ts` | Added `pendingRulesetId: BoardGameRulesetId \| null` to `BoardGameClientSnapshot` and request sequence guard (`rulesetReqSeq`). Hardened `setRuleset(rulesetId)` to validate lock/host/selectable/duplicate state, await `BG_ACTION_ACK` / `BG_ERROR` (6s timeout), never optimistically overwrite `snap.rulesetId`, and clear pending state on sync/error/disconnect/leave. |
| `features/boardgame/ui/BoardGameHUD.tsx` | Added compact Midnight Noir accessible Game Mode Selector inside `bg-hud-match-bar`: Host interactive trigger (`bg-hud-ruleset-trigger`) + viewport-safe popup `role="listbox"` (`bg-hud-ruleset-menu`, `z-[70]`), Guest/Spectator/Locked read-only badge (`bg-hud-ruleset-readonly`), Start Match active-mode label, live mode-change notice (`bg-hud-ruleset-notice`), and server error banner (`bg-hud-ruleset-error`). |
| `features/boardgame/ui/BoardGameLobby.tsx` | Reused shared `formatRulesetDisplayLabel`, `formatRulesetReleaseBadge`, `isRulesetLockedForMatchStatus`, and `pendingRulesetId` so HUD and Lobby remain a single synchronized surface. |
| `app/page.tsx` | Wired `matchStatus`, `rulesetId`, `pendingRulesetId`, `serverRulesets`, `connectionState`, `rulesetNotice`, `rulesetError`, and `onSelectRuleset` into `<BoardGameHUD />`, and `pendingRulesetId` into `<BoardGameLobby />`. Tracks `{ matchId, rulesetId, synced: bgSnap.revision > 0 }` so live mode switches display notices without firing spuriously on initial room join. |
| `package.json` | Added `node --test test/boardgame-phase8a1-ruleset-selector.test.cjs` to `npm run test:ui` (runs automatically in CI Gate 3b). |
| `test/boardgame-phase8a1-ruleset-selector.test.cjs` *(new)* | Automated unit/SSR component tests (12 criteria) + Real Cloudflare Durable Object integration tests (13 criteria). |
| `scripts/verify-phase8a1-e2e.cjs` *(new)* | Real-browser Playwright 3D seat-to-match E2E + Desktop/Mobile screenshot verification harness. |
| `docs/boardgame-expansion/phase-8/screenshots/phase-8a1/*.png` *(7 PNGs)* | Visual BEFORE and AFTER evidence for Desktop (`1440×900`) and Mobile (`390×844`). |

> **Strict Zero-Touch Invariant Verified:** `features/boardgame/domain/victory.ts` (`0-diff`), character skills, damage/heal pipelines, Voodoo/Undead/Copied victory mechanics, Structured Visual Events, VFX animations, and `worker/wrangler.toml` Production Beta flags were **not modified**.

---

## 4. UI Interaction Design

- **Theme & Density:** Midnight Noir glass surface (`bg-slate-950/95`, subtle amber/violet borders, valid Tailwind v3 opacity utilities only), aligned inline inside the existing `bg-hud-match-bar` without obstructing the 3D table or overlapping the top club bar.
- **Responsive Viewport Safety:**
  - Desktop (`1440×900`): Single compact HUD pill row; dropdown anchors cleanly beneath the trigger within viewport bounds.
  - Mobile (`390×844`): Dropdown uses `w-[min(21rem,calc(100vw-20px))]` horizontally centered (`x: 27..363` inside `390px`, `0px` horizontal overflow), with touch-friendly `min-h-[44px]` option buttons.
- **Accessibility & Keyboard Support:**
  - Trigger exposes `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `aria-busy`, and `aria-label`.
  - Popup implements `role="listbox"` / `role="option"` with `aria-selected`, `aria-disabled`, `ArrowDown`, `ArrowUp`, `Home`, `End`, `Enter`, `Space`, `Escape` (closes and restores trigger focus), and click-outside dismissal.
- **3D Input Isolation:** Pointer, wheel, and keyboard handlers on the selector stop propagation so interacting with the menu never moves the 3D camera, triggers `E` stand-up, or clicks through to the canvas.

---

## 5. Host / Guest / Spectator Behavior

| Role | Waiting / Ready Check / Finished | Starting / Playing / Closed |
|---|---|---|
| **Host (`isHost === true`)** | Interactive trigger (`bg-hud-ruleset-trigger`) opens dropdown to switch among server-allowed selectable rulesets (`classic`, `expansion-1`, `expansion-2`, `full-expansion`). Start button displays active mode (`▶ Bắt đầu · Full Expansion`). | Selector locks to read-only badge (`bg-hud-ruleset-readonly`) explaining mode is locked after start; open menu auto-closes immediately. |
| **Seated Guest (`!isHost && !isSpectator`)** | Read-only badge (`bg-hud-ruleset-readonly`) showing server-confirmed mode, role count, `STABLE`/`BETA` badge, and `"Chủ bàn chọn chế độ chơi"`. Never renders clickable switch controls. | Same read-only badge synced to match's authoritative ruleset. |
| **Spectator (`isSpectator === true`)** | Read-only badge displaying public room ruleset only (zero private hand/role leakage). | Public ruleset display only; strict P0 secrecy preserved. |

- **Ready State Policy:** Matches existing server-authoritative policy in `worker/src/boardgame-room.ts` (`BG_SET_RULESET` preserves seated `ready` flags across pre-match mode switches) and broadcasts a clear notice (`"🎮 Chủ bàn đã chuyển sang Full Expansion — 66 tướng (Beta)."`) to all connected clients.

---

## 6. Server Synchronization

- **Single Source of Truth:** `BoardGameClient` (`bgSnap.rulesetId`, `bgSnap.pendingRulesetId`, `bgSnap.serverRulesets`) feeds both `BoardGameHUD` and `BoardGameLobby`.
- **Zero Optimistic Mutation:** Selecting a mode sets `pendingRulesetId` (`Đang đồng bộ...`), disables duplicate requests, and sends `BG_SET_RULESET`. The displayed active ruleset updates **only** when the Durable Object responds with `BG_ACTION_ACK` + authoritative `BG_STATE_SYNC`.
- **Error Recovery:** If the server rejects a request (e.g., race with match start, unauthorized client, unavailable Beta flag, or socket drop), `pendingRulesetId` clears, the active label remains strictly at the server's authoritative `rulesetId`, and `bg-hud-ruleset-error` surfaces the server error cleanly.
- **Reconnect / F5 Persistence:** Solo Host F5 reconnect preserves Host role and selected ruleset (e.g. `full-expansion`); Guest F5 reconnect preserves room membership and reads the Host's persisted ruleset from SQLite. (When Host disconnects while other seated players are connected in `WAITING`/`READY_CHECK`, existing server failover `promoteNextConnectedHost` promotes the next lowest-seat connected player while keeping `ruleset_id` intact.)

---

## 7. Status Locking Rules

`isRulesetLockedForMatchStatus(status)` in `features/boardgame/ui/ruleset-selector-helpers.ts` matches `worker/src/boardgame-room.ts` 1-to-1:

| `BoardGameMatchStatus` | Ruleset Switch Allowed? | UI State |
|---|---|---|
| `CREATED`, `WAITING`, `READY_CHECK` | **Yes** (Host only) | Interactive trigger for Host; read-only for Guest/Spectator |
| `FINISHED` (Post-match rematch) | **Yes** (Host only; preserves previous mode until changed) | Interactive trigger for Host; read-only for Guest/Spectator |
| `STARTING`, `PLAYING`, `CLOSED` | **No** (Locked) | Read-only badge for all roles; server rejects `BG_SET_RULESET` with `MATCH_NOT_WAITING` |

---

## 8. Desktop & Mobile Screenshot References

All 7 visual evidence screenshots are stored under [`docs/boardgame-expansion/phase-8/screenshots/phase-8a1/`](./screenshots/phase-8a1/):

| Stage | Viewport | Screenshot | Visual Proof |
|---|---|---|---|
| **BEFORE** | Desktop `1440×900` | [`before-desktop-1440x900.png`](./screenshots/phase-8a1/before-desktop-1440x900.png) | Seated Host HUD shows Invite Code + Ready + Start with **no** ruleset selector. |
| **BEFORE** | Mobile `390×844` | [`before-mobile-390x844.png`](./screenshots/phase-8a1/before-mobile-390x844.png) | Seated Mobile Guest HUD shows Invite Code + Ready with **no** ruleset indicator. |
| **AFTER** | Desktop `1440×900` | [`after-desktop-classic-closed.png`](./screenshots/phase-8a1/after-desktop-classic-closed.png) | Host sits via 3D `E` (Lobby closed) and immediately sees `Classic (10 tướng) STABLE ▼`. |
| **AFTER** | Desktop `1440×900` | [`after-desktop-dropdown-open.png`](./screenshots/phase-8a1/after-desktop-dropdown-open.png) | Midnight Noir dropdown lists all 4 modes with badges, descriptions, and Beta note. |
| **AFTER** | Desktop `1440×900` | [`after-desktop-full-expansion-ready.png`](./screenshots/phase-8a1/after-desktop-full-expansion-ready.png) | 4/4 ready on `Full Expansion (66 tướng) BETA`, Start button shows `▶ Bắt đầu · Full Expansion`, live mode notice visible. |
| **AFTER** | Mobile `390×844` | [`after-mobile-host-dropdown-390x844.png`](./screenshots/phase-8a1/after-mobile-host-dropdown-390x844.png) | Mobile Host dropdown centered (`x: 27..363` inside `390px`), `0px` horizontal overflow, touch-friendly `44px+` rows. |
| **AFTER** | Mobile `390×844` | [`after-mobile-guest-390x844.png`](./screenshots/phase-8a1/after-mobile-guest-390x844.png) | Mobile Guest auto-joins Table 1, sees read-only `Full Expansion (66 tướng) BETA · Chủ bàn chọn chế độ chơi`, zero spurious join-time notice, `0px` overflow. |

---

## 9. Tests Executed

| Suite / Command | Scope | Result |
|---|---|---|
| `node --test test/boardgame-phase8a1-ruleset-selector.test.cjs` | 12 Unit/SSR Component assertions + 13 Real SQLite DO integration checks (`join-table`, Classic default, `Full Expansion` persistence, Guest/Spectator sync, non-host rejection, post-start lock, rematch preservation, Beta-disabled gating, 7/7 `starter-*` blocked) | **PASS (4/4 test groups)** |
| `node scripts/verify-phase8a1-e2e.cjs` | Real-browser Chromium Playwright 3D seat-to-match E2E (Desktop `1440×900` Host + Mobile `390×844` Guest + Mobile Host + Spectator + solo-Host F5 reload + HUD↔Lobby sync + keyboard/click-outside + `Full Expansion` match launch) | **PASS (`ok: true`, 0 page errors)** |
| `cd worker && node scripts/deploy-ci.mjs --dry-check` | Worker bundle & Beta vars verification (`ENABLE_PRODUCTION_BETA_EXPANSIONS="1"`, `BETA_ALLOWED_RULESETS="expansion-1,expansion-2,full-expansion"`) | **PASS (`1,168,277 B`)** |

---

## 10. Regression Evidence

All mandatory project verification gates and boardgame regression suites passed with exit code `0` after the final edit:

- `git diff --exit-code features/boardgame/domain/victory.ts` — **PASS (0-diff)**
- `npm run typecheck` (`tsc --noEmit && tsc --noEmit -p worker/tsconfig.json`) — **PASS**
- `npm run test:learn` — **PASS (45/45)**
- `npm run test:contracts` — **PASS (12/12)**
- `npm run test:world` — **PASS (32/32)**
- `npm run test:avatar` — **PASS (4/4)**
- `npm run test:ui` — **PASS** (`15/15` UI Gameplay + `29/29` BoardGame VFX + `4/4` Phase 8A.1 Ruleset Selector)
- `npm run test:study` — **PASS (22/22)**
- `npm run test:nav` — **PASS (4/4 legs)**
- `npm run test:mp` — **PASS (33/33)**
- `npm run test:boardgame` — **PASS (`205/205` unit/DO tests + `4,500/4,500` Classic v4 baseline with `0.00%` drift: Guard `39.73%`, Mist `45.56%`, Wanderer `14.71%`, `avgRounds 7.34`, `avgTurns 32.36`)**
- `npm run build` — **PASS (Next.js static export `out/`)**

---

## 11. Deployment Commit SHA

- **Implementation & Tests Commit:** `e9e9caa91119a9b2dc868995edb33c06776c44d0` (`feat(boardgame): phase 8a.1 pre-match HUD ruleset selector in 3D seat-to-match flow`)
- **Vercel Production Deployment (`Vercel – hustverse`):** `success` — [`BAZVZBEU7SXADugUrUMPNgmxJcYW`](https://vercel.com/haianhants-projects/hustverse/BAZVZBEU7SXADugUrUMPNgmxJcYW) → live at [`https://hustverse.vercel.app/`](https://hustverse.vercel.app/)
- **Cloudflare Worker (`hust-hsk-rooms`):** Deployed cleanly via CI job `Deploy Cloudflare Worker (hust-hsk-rooms)` (Beta flags unchanged).

---

## 12. GitHub CI Result

- **Workflow Run:** [`#44903533224`](https://github.com/haianhant/hust-hsk/actions/runs/44903533224) on commit `e9e9caa` — **8/8 Jobs `completed / success`**:
  1. `Gates 1–6 — Typecheck, Unit/Protocol/Sim & Static Build` — **success**
  2. `Gate 7 — PR10B Browser Verification Gate` — **success**
  3. `Gate 8 — Board Game E2E (e2e-01-04)` — **success**
  4. `Gate 8 — Board Game E2E (e2e-02)` — **success**
  5. `Gate 8 — Board Game E2E (e2e-03)` — **success**
  6. `Gate 8 — Board Game E2E (e2e-05-06)` — **success**
  7. `Gate 8 — Board Game E2E (bg1-smoke)` — **success**
  8. `Deploy Cloudflare Worker (hust-hsk-rooms)` — **success**

---

## 13. Live Production Smoke Result

Executed directly against live **`https://hustverse.vercel.app/`** and **`https://hust-hsk-rooms.hunganhz179.workers.dev`** (zero test overrides, real 3D seat-to-match flow on empty `table-2`, full cleanup on exit):

- **Ruleset Gating & Experimental Block:**
  - `GET /api/boardgame/rulesets` → selectable: `["classic", "expansion-1", "expansion-2", "full-expansion"]`.
  - All **7/7** experimental `starter-*` rulesets (`starter-eight` through `starter-sixty-six`) rejected with HTTP `4xx` on `POST /api/boardgame/matches`.
- **Live 3D Seat-to-Match (Desktop `1440×900` Host + Mobile `390×844` Guest):**
  - Host entered 3D CLB → sat physically at `bg-t2-s0` (`E`) → created room `X62U86` with Lobby closed → immediately saw `Classic (10 tướng)` → opened dropdown with all 4 modes → switched to `Full Expansion (66 tướng)` (`0px` horizontal overflow).
  - Mobile Guest entered 3D CLB → sat physically at `bg-t2-s1` (`E`) → auto-joined room `X62U86` → immediately saw read-only `Full Expansion (66 tướng) · Chủ bàn chọn chế độ chơi` (`0px` horizontal overflow, zero trigger rendered).
  - Live Host → Guest synchronization verified across `Full Expansion → Expansion 2 → Classic`, with guest mode-change notice (`bg-hud-ruleset-notice`) rendered on switch.
  - Zero browser `pageerror`s (`pageErrors: 0`).
- **Post-Smoke Production Hygiene:**
  - Both Guest and Host stood up cleanly (`bg-stand-up-btn` → `BG_LEAVE`).
  - `GET /api/boardgame/matches` → `0` active matches (`X62U86` cleaned up completely).
  - `GET /api/boardgame/leaderboard?limit=10` → **100% untouched** (`totalPlayers: 4`: `Sv Bảo: 41`, `Nguyễn Đình An: 30`, `Hoang Ba Bao: 5`, `Hai Anh: 5`).

---

## 14. Known Limitations

1. **Ready state preserved on mode change:** By design (matching existing server contract in `worker/src/boardgame-room.ts`), changing ruleset before match start keeps existing seated players' `ready` flags intact while notifying everyone via the HUD notice; if future human playtesting shows players prefer forced re-ready after a mode switch, that policy change should be made server-authoritatively in `BoardGameRoom`.
2. **Host disconnect failover:** If the Host disconnects while at least one other seated player remains connected in `WAITING`/`READY_CHECK`, the server immediately transfers Host control to the next lowest-seat connected player (while preserving the selected `ruleset_id`), so the returning original Host rejoins as a non-host until promoted or starting a new table.
3. **Production Beta status:** Expansion 1, Expansion 2, and Full Expansion remain Production Beta rulesets; human playtest balance telemetry is ongoing, and emergency rollback remains a single-flag switch (`ENABLE_PRODUCTION_BETA_EXPANSIONS="0"`).
