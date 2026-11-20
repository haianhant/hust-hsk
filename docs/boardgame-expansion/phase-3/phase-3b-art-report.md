# Phase 3B — Wave 2 AI Character Portraits & Visual Integration Report

- **Date:** 2026-11-20
- **Milestone:** Phase 3B (Wave 2 — 8 Expansion Characters: 3 Hunter, 3 Shadow, 2 Neutral)
- **Art Direction:** `HUSTVerse Midnight — Cinematic Anime Noir` (strictly aligned with [`character-art-bible.md`](../phase-2.5/character-art-bible.md))
- **Cumulative Playable Portrait Coverage:** **26 / 26** (`10 Classic` + `8 Starter Eight` + `8 Wave 2`)
- **Production Safety:** `classic`-only unchanged (`starter-sixteen` experimental-only)

---

## 1. Delivered Assets & Optimization Summary

Every Wave 2 portrait was generated as an original 2D anime noir illustration, visually inspected against all 10 Art Bible QC criteria, resized cleanly to `1024×1536` (`2:3`) via [`scripts/process-phase3b-portraits.py`](../../../scripts/process-phase3b-portraits.py), and encoded as optimized WebP (`quality=88`, `method=6`, all well under the `500 KB` budget):

| Role ID | Name | Faction | Asset Path | Dimensions | File Size | SHA-256 (prefix) | QC Status |
|---|---|---|---|---|---:|---|---|
| `exp1_elysia` | Elysia | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp1-elysia.webp` | `1024×1536` | `113.4 KB` | `7dc03b154143` | APPROVED |
| `exp2_father_harrison` | Father Harrison | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp2-father-harrison.webp` | `1024×1536` | `119.0 KB` | `a97bb7e381b1` | APPROVED |
| `exp2_gloria` | Gloria | Hunter (`lantern-guard`) | `public/assets/boardgame/roles/role-exp2-gloria.webp` | `1024×1536` | `109.3 KB` | `676a071511c8` | APPROVED |
| `exp2_unchained` | Unchained | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp2-unchained.webp` | `1024×1536` | `169.4 KB` | `4fe56a8140c5` | APPROVED |
| `exp2_warlock` | Warlock | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp2-warlock.webp` | `1024×1536` | `98.4 KB` | `18a08c7f0180` | APPROVED |
| `exp2_witch` | Witch | Shadow (`mist-order`) | `public/assets/boardgame/roles/role-exp2-witch.webp` | `1024×1536` | `85.9 KB` | `d2b0afec168d` | APPROVED |
| `exp1_cindy` | Cindy | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp1-cindy.webp` | `1024×1536` | `96.6 KB` | `6f13eaaba45d` | APPROVED |
| `exp1_bipolar` | Bipolar | Neutral (`wanderer`) | `public/assets/boardgame/roles/role-exp1-bipolar.webp` | `1024×1536` | `94.7 KB` | `8ec43e445fd7` | APPROVED |

- **Total Wave 2 payload:** `886.7 KB` across 8 high-resolution portraits (avg `110.8 KB` per asset; `100%` unique SHA-256 hashes across all 26 playable portraits).
- **Machine-readable manifest:** [`asset-manifest.json`](./asset-manifest.json)
- **3-Faction Contact Sheet:** [`character-contact-sheet.webp`](./character-contact-sheet.webp) / [`character-contact-sheet.png`](./character-contact-sheet.png)
- **Prompt documentation:** [`character-art-prompts.md`](./character-art-prompts.md)

---

## 2. Visual QC Review Notes & Candidate Selection

1. **Top Letterbox Filtering:** During visual inspection of multi-attempt raw outputs, `father_harrison_portrait_v3` and `bipolar_wanderer_portrait_v3` exhibited a hard horizontal black bar along the top edge. Both were rejected in favor of their verified `v2` candidates (`father_harrison_portrait_v2_1795165422395.jpg` and `bipolar_wanderer_portrait_v2_1795165425310.jpg`), which render full-bleed midnight architecture/sky cleanly to the top edge with proper headroom and crisp details (including Father Harrison's silver collar clasp).
2. **Zero Embedded Text / Garbled Glyphs:** Gloria's two floating ivory cards and Bipolar's sun-and-crescent fate coin were inspected specifically for text artifacts — both contain pure clean lighting/geometric motif with zero text or letters.
3. **Respectful Neutral Characterization (Bipolar):** Dual nature is conveyed entirely through Noir cinematography (split cyan/amber streetlamp light vs crimson/violet mist, dual-reflected eyes, sun-and-crescent coin) with zero medical or clinical stereotypes.
4. **Location & Skill Cohesion:** Warlock is framed on a wet midnight dormitory basketball court (`court` / `Erstwhile Altar`), Witch weaves mist inside a dimly lit midnight dormitory corridor (`corridor` / `Weird Woods`), Father Harrison holds an antique brass lantern in the rainy sanctuary lobby (`lobby` / `Church`), and Cindy's floating mirror shards evoke her `Mirror Counter` retaliation mechanic.
5. **Contact Sheet Typography Fix:** After inspecting the initial contact sheet, caption font size was tuned (`18pt → 15pt`) and horizontal card gap widened (`28px → 36px`) so `Father Harrison (exp2_father_harrison)` and `Gloria (exp2_gloria)` captions never touch.

---

## 3. Frontend & Cinematic Integration Verification

- **[`midnight-noir-tokens.ts`](../../../features/boardgame/ui/midnight-noir-tokens.ts):** Restored strict `Readonly<Record<BoardGameRoleId, string>>` typing on `MIDNIGHT_CHARACTER_ART` covering all `26/26` roles (10 Classic untouched, 8 Starter Eight untouched, 8 Wave 2 added) and exported `WAVE2_ROLE_IDS`.
- **[`BoardGameVisualPrototypeView.tsx`](../../../features/boardgame/ui/BoardGameVisualPrototypeView.tsx):** Added Section 5C (`data-testid="proto-section-wave2"`) with 4-way faction filter (`Tất cả (8)`, `Đội Săn Đêm (3)`, `Hội Bóng Đêm (3)`, `Kẻ Độc Hành (2)`), live P0 secrecy controls, wounds slider, foil toggle, 3D flip, and `MidnightCardZoomModal`.
- **Shared Portrait Consumers Verified:** `MidnightCharacterCard`, `RoleCard`, `MidnightCardZoomModal`, `PlayerPawnToken` (`BoardGameArt.tsx`), `MatchResult`, `BoardGameVfxStage`, and `VisualEventTracker` (`vfx-queue.ts`) all resolve the 8 Wave 2 WebP portraits seamlessly while respecting P0 secrecy and falling back gracefully to `RolePortraitSvg` on network error.

---

## 4. Automated & Playwright Visual QA Gates

- **Unit & Asset Integrity (`test/boardgame-phase3b-portraits.test.cjs` — `5/5 PASS`):**
  - Binary WebP header parsing (`1024×1536`, exact `2:3`, `< 500 KB`, 26 unique SHA-256 hashes).
  - Byte-for-byte `asset-manifest.json` size + SHA-256 verification.
  - Full P0 secrecy matrix (`other-player`, `spectator`, `owner-facedown`, `owner-peek`, `revealed=true`) across all 8 Wave 2 roles.
  - Cinematic `OPENING_DEAL`, `ROLE_REVEAL`, Spectator isolation, and Reduced Motion timing across all 8 Wave 2 roles.
- **Playwright Desktop (`1440×900`) & Mobile (`390×844`) Visual QA (`scripts/verify-phase3b-visuals.cjs`):**
  - All 8 Wave 2 cards load `1024×1536`, DOM ratio `2:3`, `0px` horizontal overflow on Desktop & Mobile.
  - All 4 faction tabs (`8 / 3 / 3 / 2`), P0 secrecy DOM removal (`0` leaked `role-exp*.webp` tags), Zoom modal across Hunter (`Elysia`), Shadow (`Warlock`), and Neutral (`Bipolar`), `onError` Noir Monogram SVG fallback (`role-exp2-unchained.webp`), and `prefers-reduced-motion: reduce` verified with `0` console/page/HTTP errors.
- **Existing Visual Regression (`test/boardgame-visual-prototype.cjs` + `scripts/verify-phase25-visuals.cjs`):** Verified PASS with zero regressions on Classic & Starter Eight visual surfaces.
