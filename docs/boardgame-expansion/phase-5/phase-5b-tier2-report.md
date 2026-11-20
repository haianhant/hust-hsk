# Bóng Đêm KTX — Phase 5B Report: Final Four Tier-2 Characters

- **Date:** 2026-11-20
- **Milestone:** Phase 5B (`Elise`, `Umibozu`, `Urban Legend`, `Arlene`)
- **Classification:** All 4 roles marked `rulesStatus: "house-rule-approved"`, `implementationStatus: "implemented"` (experimental only; production remains `classic`-only).

---

## 1. Delivered Characters (4/4 Tier-2 Completion)

| Role ID | Name | Pack | Faction | HP | Skill | Execution Binding | Victory Binding |
|---|---|---|---|---:|---|---|---|
| `exp2_elise` | Elise | Exp 2 | Hunter | 10 | Âm Hưởng Mềm Mại (5-HP cluster pool distribution, 1/match) | `exp:exp2_elise:soft-harmony` (`ACTIVE_SKILL`) | `victory-engine.ts:faction#hunters` |
| `exp2_umibozu` | Umibozu | Exp 2 | Shadow | 11 | Sóng Ngầm Lộ Diện (3 skill AoE to other cluster players on alive reveal, 1/match) | `exp:exp2_umibozu:reveal-surge` (`ON_ROLE_REVEAL`) | `victory-engine.ts:faction#shadows` |
| `exp2_urban_legend` | Urban Legend | Exp 2 | Shadow | 11 | Chuyện Kinh Dị (5 consumable black cards convert damage to `black-card` heal) | `exp:exp2_urban_legend:horror-story` (`BEFORE_DAMAGE`) | `victory-engine.ts:faction#shadows` |
| `exp2_arlene` | Arlene | Exp 2 | Neutral | 8 | Điệu Bộ (timing-safe Shadow Green-card disguise via private `reactionPolicy`) | `exp:exp2_arlene:affectation` (`ON_INVESTIGATE`) | `victory-engine.ts:neutral#arlene` |

---

## 2. Verification Summary (`test/boardgame-phase5b.test.cjs`)

- **P5B-1:** Registry & Catalog 1-to-1 sync (`30/56` implemented, `26/56` remaining strictly `needs-clarification`/`not-started`); strict verified-only playability gate continues rejecting `house-rule-approved` roles.
- **P5B-2 (Elise):** Verified cluster-only distribution (5-HP pool, including self, excluding other clusters), full-HP 0-heal safety, partial remainder discard, cancel/timeout preserving `skillUsedOnce === false`, and `CAP-04 HealPipeline` routing.
- **P5B-3 (Umibozu):** Verified voluntary reveal & forced `eq_mirror` reveal 3-dmg cluster AoE, exclusion of death reveal (`eliminated`), self-exclusion, deterministic seat ordering, `Witch` immunity, `G43` pierce (skill vs attack), `Undying` reduction (`3 → 2`), `Cindy` retaliation, and recursion lock.
- **P5B-4 (Urban Legend):** Verified consumable damaging black cards (`ev-07`, `ev-08`, `ev-10`, `ev-12`) convert damage to `black-card` heal capped at `maxHp`, permanent black weapons (`ev-01..ev-06`) excluded, `Vampire Bat` caster still heals `+1 HP`, hidden P0 secrecy (`ownerPlayerId: null`, `kind: null`), and `CAP-05 reactionPolicy` (`ASK` / `AUTO_DECLINE`).
- **P5B-5 (Arlene):** Verified timing-safe Shadow Green-card impersonation (`< 1ms`, zero prompt, zero reveal, real `faction` stays `'wanderer'`), `AUTO_DECLINE` truthful mode, immediate solo win on Hunter card/skill/attack elimination, and strict non-win on Shadow or unattributed self-damage elimination.
