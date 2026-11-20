# Bóng Đêm KTX — Phase 6B Ten Tier-3 Character Implementation Report

- **Date:** 2026-11-21
- **Branch:** `main`
- **Previous Milestone HEAD:** `1532dcd` (Phase 6A Engine Foundations)
- **Milestone Status:** ✅ **COMPLETE (58/66 Playable · 153/153 Board Game Tests PASS · Zero Classic Regression)**

---

## 1. Delivered Ten Tier-3 Characters (Tier-3 Completion)

| # | Role ID | Source Name | Faction | Max HP | Rules Status | Skill Binding | Victory Binding | PendingChoices Added |
|---:|---|---|---|---:|---|---|---|---|
| 1 | `exp2_gideon` | Gideon | Hunter | 14 | `house-rule-approved` | `exp:exp2_gideon:mission-reward` | `victory-engine.ts:faction#hunters` | `gideon_draw_white`, `gideon_white_card_target` |
| 2 | `exp1_anathema` | Anathema | Neutral | 8 | `house-rule-approved` | `exp:exp1_anathema:curse-redirect` | `victory-engine.ts:neutral#anathema` | `anathema_curse_target` |
| 3 | `exp1_bethany` | Bethany | Neutral | 10 | `house-rule-approved` | `exp:exp1_bethany:change-of-fate` | `copied-victory-graph.ts:share-outcome#bethany` | `bethany_designate_chosen` (+ `TRANSFER_TO_BETHANY`) |
| 4 | `exp1_arnold` | Arnold | Neutral | 8 | `house-rule-approved` | `exp:exp1_arnold:fate-change-reflect` | `victory-engine.ts:neutral#arnold` | `arnold_reflect_lethal` (`isSecret` when hidden) |
| 5 | `exp1_cassie` | Cassie | Neutral | 11 | `house-rule-approved` | `exp:exp1_cassie:strange-affair-heal` | `copied-victory-graph.ts:copy-goal#cassie` | `cassie_turn_heal` |
| 6 | `exp1_clairvoyant` | Clairvoyant | Neutral | 11 | `house-rule-approved` | `exp:exp1_clairvoyant:prophecy-peek` | `copied-victory-graph.ts:copy-goal#clairvoyant` | `clairvoyant_peek_copy` |
| 7 | `exp2_april_skipps` | April & Skipps | Neutral | 8 | `house-rule-approved` | `exp:exp2_april_skipps:spotted-run` | `victory-engine.ts:conditional#april-skipps` | *(Forced reveal at wound 7 + turn-end countdown)* |
| 8 | `exp2_colt` | Colt | Neutral | 11 | `house-rule-approved` | `exp:exp2_colt:street-justice` | `victory-engine.ts:neutral#colt` | `colt_theft_counter`, `colt_recover_or_damage` |
| 9 | `exp2_diana` | Diana | Neutral | 13 | `house-rule-approved` | `exp:exp2_diana:for-hire` | `copied-victory-graph.ts:conditional-shared#diana` | *(Silent pending customer → forced reveal next own turn)* |
| 10 | `exp2_aaron` | Aaron | Neutral | 8 | `house-rule-approved` | `exp:exp2_aaron:love-at-first-sight` | `copied-victory-graph.ts:conditional-shared#aaron` | *(First normal living female spouse + attack/MG/Masamune ban)* |

---

## 2. New Experimental Ruleset: `starter-forty-eight`
- **Catalog Version:** `2026.11-p6b`
- **Composition:** **58 playable roles** (`10 Classic + 48 Expansion`: **19 Hunter / 18 Shadow / 21 Neutral**).
- **Production Safety:** `enabledInProduction: false`, `isExperimental: true`; `validateRulesetForMatch('starter-forty-eight', ..., { allowExperimental: false })` returns `RULESET_UNAVAILABLE`.
- **Tier-4 Hard Lock:** All **8 Tier-4 roles** (`exp1_lloyd`, `exp1_vengeful_spirit`, `exp1_voodoo`, `exp1_undead`, `exp1_antimony`, `exp2_cain`, `exp2_bonnie`, `exp2_nc_soldier`) remain strictly `needs-clarification` / `not-started` / `coming-soon` and excluded from `starter-forty-eight`, `expansion-1`, `expansion-2`, and `full-expansion`.

---

## 3. UI & Gameplay Integration
- [`features/boardgame/ui/BoardGameArt.tsx`](../../../features/boardgame/ui/BoardGameArt.tsx): Added `ROLE_VISUAL_META` entries for all 10 Phase 6 Tier-3 roles.
- [`features/boardgame/ui/ActionPanel.tsx`](../../../features/boardgame/ui/ActionPanel.tsx):
  - Added server-synced skill lock rules for `Anathema` (activatable at `ROLL_MOVE` while unrevealed), `Bethany`, `Cassie`, `Clairvoyant`.
  - Added own-turn `TRANSFER_TO_BETHANY` voluntary equipment gift box (`bg-transfer-to-bethany-box`, excluding `ev-01` Masamune) when a revealed alive Bethany is on the board.
  - Added revealed-only public status badges in Tactical Context Bar (`Bị nguyền (Anathema)`, `Người được chọn (Bethany)`, `Khách hàng (Diana)`, `Vợ của Aaron`, `Đếm ngược ô 7 (April)`).
  - Added owner-only `Clairvoyant` private vision panel (`bg-clairvoyant-vision-panel`) and copied-victory goal banner (`bg-copied-goal-banner`) strictly fed from `privateView`.
  - Excluded Aaron's spouse from UI `attackableTargets` (matching server enforcement).
- [`features/boardgame/ui/midnight-noir-tokens.ts`](../../../features/boardgame/ui/midnight-noir-tokens.ts): Temporarily relaxed `MIDNIGHT_CHARACTER_ART` to `Partial<Record<BoardGameRoleId, string>>` until Phase 6C generates all 10 real AI portraits (`58/58` strict mapping restored in 6C; zero fake paths).

---

## 4. Verification Results

| Gate / Command | Result | Summary |
|---|---|---|
| `npm run typecheck` | ✅ **PASS** | Frontend + Shared Contracts + Cloudflare Worker (`0` errors) |
| `node --test test/boardgame-phase6b.test.cjs` | ✅ **11/11 PASS** | All 10 Tier-3 characters + `starter-forty-eight` + Tier-4 lock |
| `npm run test:boardgame` | ✅ **153/153 PASS** | Catalog validator (`48` implemented / `8` locked), Classic + Waves 1–5 + 25/25 Classic SHA-256 + 4,500-match Classic sim |
| `npm run test:ui` | ✅ **PASS** | UI gameplay + 25/25 VFX suite |
| `npm run test:contracts` | ✅ **12/12 PASS** | Shared contracts + HskRoom DO |

---

## 5. Remaining Work
- **Phase 6C:** Generate & visually inspect 10 real `1024×1536` `HUSTVerse Midnight — Anime Noir` WebP portraits (`58/58`), restore strict `MIDNIGHT_CHARACTER_ART`, build Contact Sheet & `asset-manifest.json`, add Prototype Section 5F (`105` assets total), and run Playwright Desktop/Mobile Visual QA.
- **Phase 6D:** 25 cross-character scenarios, hidden-information security audit, and real Cloudflare DO 4P–8P WebSocket E2E + hibernation/reconnect suite.
- **Phase 6E:** 25,000-match deterministic simulation (`starter-forty-eight`), targeted balance analysis, Classic zero-regression proof, full CI verification, handoff, push & remote GitHub Actions CI confirmation.
