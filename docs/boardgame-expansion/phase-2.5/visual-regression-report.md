# Phase 2.5D — Visual Regression & QA Verification Report

- **Date:** 2026-11-20
- **Branch:** `main`
- **Target Route Audited:** `/boardgame-prototype` (`out/` production static export) + full automated unit/integration/E2E gates
- **Browser Engine:** Headless Chromium (`/usr/bin/google-chrome`, Playwright `playwright-core@1.48.2`)

---

## 1. Automated Asset, Contract & Privacy Test Suite (`test/boardgame-phase25-portraits.test.cjs`)

Wired permanently into `npm run test:boardgame` (**62/62 PASS**, plus 4,500-match Classic balance guardrail):

| Test Case | Coverage | Result |
|---|---|---|
| `P2.5-1` | Binary RIFF/WEBP header + VP8/VP8L/VP8X dimension parsing (`1024×1536`, exact `2:3`), file size `20 KB–500 KB`, SHA-256 uniqueness across all 8 files, Contact Sheet (`.webp` & `.png`) existence | **PASS** |
| `P2.5-2` | `asset-manifest.json` byte-for-byte sync with disk & `getRoleDesign()`, all 10 Classic `MIDNIGHT_CHARACTER_ART` mappings preserved unchanged, total 18 mapped roles | **PASS** |
| `P2.5-3` | P0 Secrecy Matrix across all 8 Starter Eight roles (`other-player`, `spectator`, `owner-facedown`, `owner-peek`, `revealed=true`) — zero `portraitSrc`/`roleName`/`faction`/`maxHp` leak | **PASS** |
| `P2.5-4` | Cinematic VFX (`VisualEventTracker` + `extractVisualEventsFromDiff`): Owner `OPENING_DEAL`, Spectator & mismatched-player zero-leak isolation, `ROLE_REVEAL` cut-in portrait resolution, and `reducedMotion` duration scaling across all 8 roles | **PASS** |
| `P2.5-5` | Production ruleset guard: `listRulesets()` exposes ONLY `classic` as `enabledInProduction: true`; `starter-eight` requires `allowExperimental: true` | **PASS** |

---

## 2. Playwright Visual QA (`scripts/verify-phase25-visuals.cjs`)

Executed against the static production build (`npm run build` → `out/`):

### 2.1 Desktop (`1440×900`) Card Rendering & Framing

| Role ID | Natural Dimensions | Rendered Box | Ratio (`2:3 = 0.6667`) | Fallback Triggered | Status |
|---|---|---|---|---|---|
| `exp2_g43` | `1024×1536` | `280×420` | `0.6667` | `false` | **PASS** |
| `exp2_fiona` | `1024×1536` | `280×420` | `0.6667` | `false` | **PASS** |
| `exp1_gayle` | `1024×1536` | `280×420` | `0.6667` | `false` | **PASS** |
| `exp1_felicia` | `1024×1536` | `280×420` | `0.6667` | `false` | **PASS** |
| `exp1_wendigo` | `1024×1536` | `280×420` | `0.6667` | `false` | **PASS** |
| `exp2_wyvern` | `1024×1536` | `280×420` | `0.6667` | `false` | **PASS** |
| `exp1_victor` | `1024×1536` | `280×420` | `0.6667` | `false` | **PASS** |
| `exp1_undying` | `1024×1536` | `280×420` | `0.6667` | `false` | **PASS** |

- **Desktop Horizontal Overflow:** `0px`
- **Faction Filter Tabs:** `Tất cả (8)` → 8 cards, `Đội Săn Đêm (4)` → 4 cards, `Hội Bóng Đêm (4)` → 4 cards (**PASS**)
- **P0 Secrecy Toggle (`other-player`):** `leakedExpImgCount = 0`, `leakedSecretBadge = false`, all 8 cards flip to sealed Midnight Seal back face showing only public wound counts (**PASS**)
- **Zoom Modal (`MidnightCardZoomModal`):** Verified full-resolution (`1024×1536`) display, 2-sided flip toggle, and Escape/Close button for both Hunter (`exp2_g43`) and Shadow (`exp1_wendigo`) (**PASS**)

### 2.2 Mobile (`390×844`), Fallback & Accessibility

- **Mobile Horizontal Overflow:** `0px` (`cardWidth: 280`, `cardHeight: 420`, `cardRatio: 0.6667`) (**PASS**)
- **Graceful Image Load Error Fallback:** Aborting network request for `role-exp2-g43.webp` rendered `[data-portrait-fallback="true"]` with `RolePortraitSvg` (`svgCount: 1`) and `0` uncaught errors (**PASS**)
- **Reduced Motion (`prefers-reduced-motion: reduce`):** All portraits loaded cleanly (`1024×1536`), animations disabled/shortened with `0` console/page errors (**PASS**)

---

## 3. Existing Visual Prototype, Perf & E2E Regression

- **`test/boardgame-visual-prototype.cjs`:** **PASS**
  - `desktopOverflow: 0`, `mobileOverflow: 0`, `cls: 0`, `webglContexts: 0`
  - `decodedUniqueAssets: 65` (10 Classic + 8 Starter Eight + 40 cards + 6 locations + 1 card back)
  - Desktop FPS: `54.7–60.0 FPS` (`10.4–12.1 MB` JS heap); Mobile FPS: `59.0 FPS` (`10.8 MB` JS heap)
- **`test/boardgame-e2e.cjs --shard=e2e-05-06`:** **PASS** (2-match concurrent isolation + 4/4 security probes passed)

---

## 4. Full CI Gate Matrix

| Gate Command | Result |
|---|---|
| `npm run typecheck` | **PASS** (`exit 0`) |
| `npm run test:boardgame` | **PASS** (`62/62` + catalog validator + `4,500`-match Classic sim) |
| `npm run test:contracts` | **PASS** (`exit 0`) |
| `npm run test:learn` | **PASS** (`exit 0`) |
| `npm run test:world` | **PASS** (`exit 0`) |
| `npm run test:avatar` | **PASS** (`exit 0`) |
| `npm run test:ui` | **PASS** (`15/15` + `25/25` VFX tests) |
| `npm run test:study` | **PASS** (`22/22`) |
| `npm run test:nav` | **PASS** (`4/4` legs + spawn check) |
| `npm run test:mp` | **PASS** (`33/33`) |
| `npm run build` | **PASS** (Next.js 14.2.5 static export `out/`) |
| `scripts/verify-phase25-visuals.cjs` | **PASS** (Desktop + Mobile + Secrecy + Zoom + Fallback + Reduced Motion) |
| `test/boardgame-visual-prototype.cjs` | **PASS** (0 CLS, 65 unique decoded assets) |
| `test/boardgame-e2e.cjs --shard=e2e-05-06` | **PASS** (4/4 security probes) |
