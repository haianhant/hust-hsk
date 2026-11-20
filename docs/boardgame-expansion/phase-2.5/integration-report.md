# Phase 2.5C — UI & Cinematic Portrait Integration Report

- **Phase:** 2.5C — Frontend, Card Template, Cinematic VFX & Prototype Integration
- **Scope:** Integrate all 8 Starter Eight `1024×1536` WebP portraits into the centralized portrait pipeline with zero changes to Classic gameplay, Classic artwork mappings, HP, skills, victory conditions, RNG, or multiplayer ruleset locks.

---

## 1. Centralized Portrait Registry (`midnight-noir-tokens.ts`)

- Updated [`MIDNIGHT_CHARACTER_ART`](../../../features/boardgame/ui/midnight-noir-tokens.ts) to type `Readonly<Record<BoardGameRoleId, string>>` — compile-time guaranteeing all **18 playable roles** (10 Classic + 8 Starter Eight) resolve to verified full-art WebP assets.
- Exported `STARTER_EIGHT_ROLE_IDS` as the single UI source of truth for the 8 Phase 2.5 portraits (4 Hunter + 4 Shadow).
- **Classic Zero-Drift Verification:** All 10 Classic paths (`gac-ky-thuat` through `lang-tien-phong`) and `PROTOTYPE_CHARACTER_ART` remain byte-for-byte unchanged.

| Role ID | Faction | Mapped Public Path |
|---|---|---|
| `exp2_g43` | Hunter (`lantern-guard`) | `/assets/boardgame/roles/role-exp2-g43.webp` |
| `exp2_fiona` | Hunter (`lantern-guard`) | `/assets/boardgame/roles/role-exp2-fiona.webp` |
| `exp1_gayle` | Hunter (`lantern-guard`) | `/assets/boardgame/roles/role-exp1-gayle.webp` |
| `exp1_felicia` | Hunter (`lantern-guard`) | `/assets/boardgame/roles/role-exp1-felicia.webp` |
| `exp1_wendigo` | Shadow (`mist-order`) | `/assets/boardgame/roles/role-exp1-wendigo.webp` |
| `exp2_wyvern` | Shadow (`mist-order`) | `/assets/boardgame/roles/role-exp2-wyvern.webp` |
| `exp1_victor` | Shadow (`mist-order`) | `/assets/boardgame/roles/role-exp1-victor.webp` |
| `exp1_undying` | Shadow (`mist-order`) | `/assets/boardgame/roles/role-exp1-undying.webp` |

---

## 2. Integrated UI & Cinematic Components

| Component | Integration & Framing | Graceful Fallback (`onError`) | P0 Secrecy Guard |
|---|---|---|---|
| [`MidnightCharacterCard.tsx`](../../../features/boardgame/ui/MidnightCharacterCard.tsx) | Full-bleed `aspect-[2/3]` with `object-cover object-top`, faction metal frame, foil shimmer, HP seal, dark bottom plaque overlay. | Added `imgError` state resetting on `portraitSrc` change → falls back cleanly to `RolePortraitSvg` Noir Monogram (`data-portrait-fallback="true"`). | Enforced by `resolveRoleCardPresentation` — returns `portraitSrc: null`, `roleName: null`, `faction: null`, `maxHp: null` when `showFront === false`. |
| [`RoleCard.tsx`](../../../features/boardgame/ui/RoleCard.tsx) | Renders owner's secret/revealed card via `MidnightCharacterCard` and table overview pawns via `PlayerPawnToken`. | Inherited from `MidnightCharacterCard` & `PlayerPawnToken`. | Spectator / missing `privateView` renders anonymous placeholder; table pawns only receive `p.revealedRoleId`. |
| [`MidnightCardZoomModal.tsx`](../../../features/boardgame/ui/MidnightCardZoomModal.tsx) | Full-size zoom (`max-w-[350px]`) & 2-sided flip modal using `MidnightCharacterCard` + right-hand lore/skill panel. | Inherited from `MidnightCharacterCard`. | Re-checks `resolveRoleCardPresentation`; disables flip button and withholds portrait/metadata when `!canInspectFront`. |
| [`BoardGameArt.tsx`](../../../features/boardgame/ui/BoardGameArt.tsx) (`PlayerPawnToken`) | Circular board pawn token (`2xs`–`md`) with `object-cover object-top` keeping eyes/head centered. | Added `imgError` state resetting on `portraitSrc` change → falls back to 2-char display initials badge (or `✕` when eliminated). | Only computes `portraitSrc` when `revealedRoleId` is non-null (server-authoritative public reveal). |
| [`MatchResult.tsx`](../../../features/boardgame/ui/MatchResult.tsx) | Post-match `finalReveal` roster thumbnails (`h-11 w-8 object-cover object-top`). | Extracted `MatchResultPortrait` with `imgError` fallback to `RolePortraitSvg`. | Only displayed once match status is `FINISHED` and server broadcasts `finalReveal`. |
| [`vfx-queue.ts`](../../../features/boardgame/ui/vfx-queue.ts) & [`BoardGameVfxStage.tsx`](../../../features/boardgame/ui/BoardGameVfxStage.tsx) | Automatic resolution via `getRevealPortrait(roleId)` across `OPENING_DEAL` (owner-only), `ROLE_REVEAL` (post-reveal), `ULTIMATE_SKILL` & `ELIMINATION` cut-ins — preserving all existing animation choreography, scale, parallax, foil, and reduced-motion timings untouched. | Added `VfxPortraitImage` helper with `imgError` fallback to `RolePortraitSvg` / `FactionCrestSvg` across all 3 portrait cut-in surfaces. | Spectator `OPENING_DEAL` receives `portraitSrc: null`; public cut-ins strictly key off `player.revealedRoleId`. |
| [`BoardGameVisualPrototypeView.tsx`](../../../features/boardgame/ui/BoardGameVisualPrototypeView.tsx) | Added Section 5B (`proto-section-starter-eight`) showcasing all 8 Starter Eight cards with Hunter/Shadow filter tabs, Secrecy Scenario switcher, Wounds slider, Foil toggle, Reduced Motion, 3D Flip & Zoom Modal. | Inherited from `MidnightCharacterCard`. | Explicitly badged **"Phase 2.5 · Experimental Preview"** + **"Production: Classic Only"**; obeys P0 Secrecy toggle (`other-player` hides all 8 portraits from DOM). |

---

## 3. Non-Modification Guarantee

- **Zero gameplay logic files touched** (`features/boardgame/domain/*`, `shared/contracts/*`, `worker/src/*` remain completely untouched).
- **Production ruleset safety untouched:** Only `classic` remains `enabledInProduction: true`; `starter-eight` remains strictly `experimental`.
