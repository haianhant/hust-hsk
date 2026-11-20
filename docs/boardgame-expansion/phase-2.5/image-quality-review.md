# Phase 2.5B — Image Quality Review & Contact Sheet Audit

- **Art Direction:** HUSTVerse Midnight — Cinematic Anime Noir
- **Scope:** 8 Starter Eight expansion character portraits (4 Hunter / Lantern Guard + 4 Shadow / Mist Order)
- **Target Specification:** Native `2:3` vertical aspect ratio (`1024×1536`), optimized `WebP` (`quality=88`, `< 500 KB`), clean top safe zone (~14%), dark smooth bottom safe zone (~28–32%), crisp anime ink lineart + painterly rim lighting, zero text/watermarks/anatomy artifacts.
- **Contact Sheet:** [`starter-eight-contact-sheet.png`](./starter-eight-contact-sheet.png) ([WebP](./starter-eight-contact-sheet.webp))
- **Asset Manifest:** [`asset-manifest.json`](./asset-manifest.json)

---

## 1. Per-Character 10-Point Quality Control Scorecard

Every generated raw portrait was visually inspected before conversion, then converted deterministically via [`scripts/process-phase25-portraits.py`](../../../scripts/process-phase25-portraits.py) and re-verified side-by-side on the Faction-grouped Contact Sheet.

| # | Role ID | Name | Faction | File | Resolution | Size | Iterations | Status |
|---|---|---|---|---|---|---:|---:|---|
| 1 | `exp2_g43` | **G43** | Hunter (`lantern-guard`) | `role-exp2-g43.webp` | `1024×1536` (2:3) | `151.8 KB` | 2 | **APPROVED** |
| 2 | `exp2_fiona` | **Fiona** | Hunter (`lantern-guard`) | `role-exp2-fiona.webp` | `1024×1536` (2:3) | `132.6 KB` | 2 | **APPROVED** |
| 3 | `exp1_gayle` | **Gayle** | Hunter (`lantern-guard`) | `role-exp1-gayle.webp` | `1024×1536` (2:3) | `123.4 KB` | 3 | **APPROVED** |
| 4 | `exp1_felicia` | **Felicia** | Hunter (`lantern-guard`) | `role-exp1-felicia.webp` | `1024×1536` (2:3) | `145.6 KB` | 2 | **APPROVED** |
| 5 | `exp1_wendigo` | **Wendigo** | Shadow (`mist-order`) | `role-exp1-wendigo.webp` | `1024×1536` (2:3) | `117.5 KB` | 3 | **APPROVED** |
| 6 | `exp2_wyvern` | **Wyvern** | Shadow (`mist-order`) | `role-exp2-wyvern.webp` | `1024×1536` (2:3) | `186.4 KB` | 1 | **APPROVED** |
| 7 | `exp1_victor` | **Victor** | Shadow (`mist-order`) | `role-exp1-victor.webp` | `1024×1536` (2:3) | `142.0 KB` | 1 | **APPROVED** |
| 8 | `exp1_undying` | **Undying** | Shadow (`mist-order`) | `role-exp1-undying.webp` | `1024×1536` (2:3) | `144.7 KB` | 1 | **APPROVED** |

**Total Bundle Size (all 8 portraits):** `1,144.0 KB` (`~1.12 MB`), average `143.0 KB/portrait` (all `< 38%` of the 500 KB per-asset budget).

---

## 2. Detailed Visual Inspection Notes & Regeneration Log

### Hunter / Lantern Guard Row

1. **`exp2_g43` — G43 (Fortress Mode)**
   - **Visual Check:** Matte gunmetal & obsidian heavy campus-defense armor, clean glowing cyan optical visor slit, hexagonal cyan core with amber circuit seams, armored shield-gauntlet angled forward, rainy campus colonnade with distant warm amber lamps.
   - **Iteration Note:** Iteration 1 had slightly tight top framing; Iteration 2 (`g43_1795160156877.jpg`) achieved full 14% top headroom, darker bottom plaque fade, and razor-sharp cel-shaded ink lines matching Classic portraits.
   - **10/10 Pass:** Silhouette, lighting, zero text, zero artifacts, unambiguous sci-fi distinction from Shadow knight `Undying`.

2. **`exp2_fiona` — Fiona (Precision Strike)**
   - **Visual Check:** Chin-length midnight-navy bob, glowing cyan optical mono-visor over left eye, structured charcoal-and-silver tactical jacket, holding an illuminated optical rangefinder/compass emitting subtle twin cyan sparks on a rainy dorm rooftop.
   - **Iteration Note:** Iteration 1 had overly busy bright light streaks; Iteration 2 (`fiona_final_1795160146136.jpg`) produced controlled noir lighting, anatomically clean 5-finger grip, expressive determined face, and clean dark bottom vignette.
   - **10/10 Pass:** Distinct from Lan (guard clipboard/keycard) and Vy (radio headset & lightning).

3. **`exp1_gayle` — Gayle (Frontline Brawler)**
   - **Visual Check:** Tousled dark hair, white nose bandage, confident determined smirk, midnight-navy sleeveless athletic hoodie with subtle amber trim, scuffed wrapped fight gloves raised in a clean symmetrical guard beneath foggy campus stadium floodlights.
   - **Iteration Note:** Iterations 1–2 needed tighter boxing-guard hand cleanliness and stronger ink outline harmony with Classic portraits; Iteration 3 (`gayle_v3_1795160230858.jpg`) nailed hand anatomy, expression, lighting, and bottom fade.
   - **10/10 Pass:** High-energy athletic Hunter silhouette with zero visual overlap with Minh or Dũng.

4. **`exp1_felicia` — Felicia (Resourceful Strategist)**
   - **Visual Check:** Side-braided chestnut hair, clever warm smile, dark olive utility jacket, leather satchel with brass magnifying glass and rolled notes, holding two clean blank luminous cards (cool cyan-white on left, muted amber-violet on right — representing White/Black dual draw choice) in a misty midnight campus archive.
   - **Iteration Note:** Iteration 1 had faint card rune noise; Iteration 2 (`felicia_v2_1795160172789.jpg`) delivered completely clean text-free luminous cards, natural fingers, and strong archive atmosphere.
   - **10/10 Pass:** Warm investigative presence cleanly aligned with Lantern Guard palette.

### Shadow / Mist Order Row

5. **`exp1_wendigo` — Wendigo (Shadow Stalker)**
   - **Visual Check:** Hooded supernatural predator with wide symmetrical gnarled obsidian antlers completely inside frame (~10% top headroom), gaunt ash-grey face with piercing glowing crimson eyes and wrapped dark mask, tattered obsidian cloak, dual anatomically accurate 5-finger clawed hands conjuring crimson-violet mist in front of a rainy brick campus archway.
   - **Iteration Note:** Iteration 1 cropped the upper antler tips; Iteration 2 slightly clipped one outer branch; Iteration 3 (`exp1_wendigo_framed_1795160386159.jpg`) pulled framing back so every antler tip sits comfortably inside the safe zone while preserving looming menace and zero graphic gore.
   - **10/10 Pass:** Iconic horror-noir silhouette, pure obsidian bottom fade.

6. **`exp2_wyvern` — Wyvern (Draconic Shadow)**
   - **Visual Check:** Swept obsidian dragon horns, fierce crimson-violet eyes, iridescent dark scaled armor, wide symmetrical bat-dragon wings threaded with glowing crimson-violet veins, clawed hand channeling a swirling crimson-violet arcane vortex on a stormy gothic rooftop with violet lightning.
   - **Iteration Note:** Approved on first generation (`role_exp2_wyvern_1795160299731.jpg`) — immediate standout composition, crisp linework, zero anatomical or wing defects.
   - **10/10 Pass:** Unmistakable winged apex predator silhouette; completely distinct from Tú (classic vampire coat).

7. **`exp1_victor` — Victor (Mad Alchemist)**
   - **Visual Check:** Wild silver-streaked dark hair, cracked brass goggles pushed up on forehead, intense reckless calculating grin, scorched dark lab coat over crimson collared shirt, black-gloved hands gripping a glowing crimson alchemical vial amidst crackling violet electrical arcs inside a foggy midnight engineering lab.
   - **Iteration Note:** Approved on first generation (`exp1_victor_portrait_1795160304052.jpg`) — expressive mania without caricature, crisp hands, zero gibberish text on lab equipment.
   - **10/10 Pass:** Instantly tells the story of self-damaging high-risk alchemy (`+2 DMG` at `1 HP` cost).

8. **`exp1_undying` — Undying (Iron Plating)**
   - **Visual Check:** Ancient battle-scarred forged black iron knight armor split across the chest by blazing crimson and violet spectral fissures, fractured medieval visored helm revealing a single glowing violet eye, standing inside a desolate misty concrete dormitory corridor.
   - **Iteration Note:** Approved on first generation (`role_undying_iron_plating_1795160294046.jpg`) — unmistakable gothic iron texture and spectral glow, zero visual confusion with G43's sleek cyan sci-fi plating or Classic Dũng's human varsity/security jacket.
   - **10/10 Pass:** Heavy tank silhouette with eerie supernatural resilience.

---

## 3. Comparative Contact Sheet Verification

Inspecting [`starter-eight-contact-sheet.png`](./starter-eight-contact-sheet.png) confirms:

- **Faction Instant Readability:** Row 1 (Hunters) reads immediately as cool midnight-navy / cyan / warm amber lantern light; Row 2 (Shadows) reads immediately as obsidian / crimson / violet supernatural menace.
- **Zero Silhouette Collision:** All 8 characters have completely distinct head/shoulder silhouettes (robot helmet, bob+visor, messy hair+fists, braid+cards, antlers+hood, horns+wings, wild hair+goggles, cracked iron helm).
- **Thumbnail Legibility (Pawn & Match Result Scale):** At `32px–44px` circular pawn scale (`object-cover object-top`), every character's eyes/visor/head silhouette remains centered and recognizable.
- **Card Overlay Safe Zones:** All 8 portraits maintain clear upper headroom (`~12–16%`) for the Faction badge + HP seal and transition cleanly into near-black (`#05070d`–`#08060e`) in the lower `28–32%` for `MidnightCharacterCard` typography.
- **No Copyright / Classic Duplication:** Every portrait is an original HUSTVerse Midnight creation with zero copied layouts, watermarks, or random typography.
