# Phase 8C — Character VFX & Visual QA Report

> **Date:** 2026-11-21
> **Verification Script:** `scripts/verify-phase8c-visuals.cjs` (Playwright headless Chromium against static production build `out/` on `/boardgame-prototype` → `BoardGameVfxSandbox`).
> **Unit & Contract Test Gate:** `test/boardgame-vfx.test.cjs` (**29/29 PASS**), `test/ui-gameplay.test.cjs` (**15/15 PASS**).

## 1. Visual QA Execution Summary

| Environment | Viewport | Result | Key Metrics |
|---|---|---|---|
| Desktop High Tier | `1440×900` | **PASS** | 0 console/page errors, 0 HTTP ≥400 (excl. `/favicon.ico`), all 8 Tier-4 + Tier-3 Canvas 2D effects rendered (`195–3,652` active alpha pixels per frame sample) |
| Desktop Low Tier + Reduced Motion | `1440×900` | **PASS** | `data-active-tier="low"`, `data-reduced-motion="true"`, Victory cut-in auto-completes cleanly within `<= 280ms`, zero opaque backdrop bleeding |
| Mobile Responsive | `390×844` | **PASS** | `scrollWidth = 390 <= innerWidth = 390` (0px horizontal overflow), Dual-Faction `MultiFactionVictory` stage legible and centered |

## 2. Automated + Visual Inspection Checklist

| # | Check Scenario | Automated Assertion | Visual Inspection Finding |
|---|---|---|---|
| 1 | **Lloyd (`exp1_lloyd`) — `LLOYD_INTERCEPT`** | `cutInVisible=true`, `nonZeroAlphaPixels=1821` | Cyan-gold hexagonal interception shield + golden `X` lock + radial shatter sparks + Lloyd portrait cut-in `NGẮT ĐÒN · LẠC LỐI · HỦY ĐÒN` rendered crisply; offensive `SLASH` suppressed on server cancel |
| 2 | **Voodoo (`exp1_voodoo`) — `VOODOO_PUPPET`** | `data-puppet-paused="true"`, `nonZeroAlphaPixels=570` | Overhead marionette control cross-bar + 4 glowing violet strings + ground seal + purple ring & `🔒 Bài kín` owner-pause badge clearly legible |
| 3 | **Undead (`exp1_undead`) — `UNDEAD_SHROUD` vs `ELIMINATION`** | `data-lifecycle-state="DORMANT_PENDING_REVIVE"`, `elimCutInCount=0`, `nonZeroAlphaPixels=1463` | Violet-emerald dormancy shroud rings + floating wisps + `💤 Ngủ Đông` badge unmistakably distinct from red permanent elimination; zero `ELIMINATION` cut-in |
| 4 | **Undead (`exp1_undead`) — `UNDEAD_REVIVE`** | `data-lifecycle-state="REVIVED"`, `nonZeroAlphaPixels=2422` | Rising emerald-gold revival pillar + shockwave rings + `+6 HP` floating badge; zero stray attack slash or duplicate `HEAL_AURA` |
| 5 | **Bonnie (`exp2_bonnie`) — `BONNIE_SUCCESSION`** | `bonnieCutIn=true`, `nonZeroAlphaPixels=1042` | Amber-to-crimson spiral vortex + Shadow conversion portrait cut-in `CHUYỂN PHE · HỘI BÓNG ĐÊM · NGHI THỨC KẾ THỪA` |
| 6 | **Cain (`exp2_cain`) — `CAIN_POWER_PLAY` + `MultiFactionVictory`** | `data-multi-faction="true"`, `data-winning-factions="lantern-guard,mist-order"`, `dualCrestSvgs=2` | Side-by-side Hunter (emerald) + `⚖️` + Shadow (crimson) crests, dual-tone emerald/crimson spotlight & fireworks, `⚖️ ĐỒNG THẮNG SONG PHE` motif verified on Desktop & Mobile |
| 7 | **Vengeful Spirit / Antimony / N.C. Soldier** | `vengefulPx=575`, `antimonyPx=827`, `ncOkPx=492`, `ncFailPx=195` | Swirling spectral wisps, prismatic diamond mirror, and N.C. Soldier gold chevrons (`success`) vs muted slate fizzle (`failed`) all render cleanly |
| 8 | **Tier-3 Reusable Effect Families (7/7)** | `redirectPx=357`, `comboPx=3652` | `REDIRECT_ARC` (`Arnold`/`Anathema`), `SHADOW_NOVA` (`Wrath`/`Umibozu`), `CARD_CASCADE` (`Gideon`/`Eleanor`), `ANGEL_SANCTUARY` (`Angel`), `FINISHER_SLASH` (`Fujiko`), `BOND_TETHER`, and `MARK_SEAL` all render without overlap |
| 9 | **Skip Mid-Animation** | `bg-vfx-cutin` count `= 0` immediately after click | Clean DOM teardown & `stopAllBoardGameSounds()` verified |
| 10 | **Mute Toggle** | `muted=true`, `totalTriggeredCount` unchanged during VFX | Global audio mute blocks all new Tier-4/Tier-3 WebAudio cues cleanly |
| 11 | **Consecutive Rapid Triggers (5× @ 45ms)** | `0` console/page errors, clean final skip | Queue & WAAPI animation cancellation handle rapid spam without orphaned nodes or z-index leaks |
| 12 | **Spectator Hidden-Role Privacy** | `data-spectator="true"`, `0` hidden role strings in DOM | Verified via both browser QA and `test/boardgame-vfx.test.cjs` (#25, #26) |

## 3. Defects Found & Fixed During Visual Inspection

1. **Victory Card Backdrop Opacity (`BoardGameVfxStage.tsx`):** The Victory V2 card previously used `bg-slate-950/92`, which is not a default Tailwind v3 opacity step (`90`/`95`), causing the card background to render transparent on Mobile and Low graphics tier (where `backdrop-blur-md` is disabled). Fixed to `bg-slate-950/95` and re-verified on both Desktop Low Tier and Mobile `390×844` screenshots.
2. **Sandbox Undead Revive Delta (`BoardGameVfxSandbox.tsx`):** The initial sandbox demo mutated `woundsTaken` upward (`1 → 5`) on Undead revive, causing the diff engine to infer a `+4` hit slash alongside the revival pillar. Fixed so Dormant/Revive transitions cleanly showcase `UNDEAD_SHROUD` and `UNDEAD_REVIVE` without spurious wound deltas.

## 4. Honest Coverage Accounting (66/66 Catalog)

Per `docs/boardgame-expansion/phase-8/character-vfx-coverage-matrix.md`:
- **20 roles** (`SIGNATURE_VFX`): bespoke role signature animation + audio (including all **8/8 Tier-4** characters and key Classic/Tier-3 headliners).
- **32 roles** (`SHARED_VFX`): structured reusable effect families (`REDIRECT_ARC`, `SHADOW_NOVA`, `MARK_SEAL`, `BOND_TETHER`, `CARD_CASCADE`, `FINISHER_SLASH`, `ANGEL_SANCTUARY`, `HEAL_AURA`, `SHIELD_GUARD`, `SLASH`, `STEAL_TETHER`).
- **9 roles** (`STATE_INDICATOR`): persistent pawn/panel status indicators & badges.
- **3 roles** (`PRIVATE_FEEDBACK`): strictly private clues/choices (intentionally **zero** public VFX to uphold P0 secrecy).
- **2 roles** (`NO_PUBLIC_VFX_REQUIRED`): passive/win-condition-only roles whose reveal/victory cinematics cover all public moments.
