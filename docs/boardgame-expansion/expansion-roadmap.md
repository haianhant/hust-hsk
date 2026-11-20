# Bóng Đêm KTX — Character Expansion Roadmap (10 Classic -> 66 Characters)

> Tài liệu này xác định lộ trình mở rộng từ **10 tướng Classic** lên **66 tướng** (10 Classic + 26 Expansion 1 + 30 Expansion 2) với kỷ luật kiểm soát rủi ro tuyệt đối cho bản Classic đang chạy production tại `https://hustverse.vercel.app/`.
>
> **Cập nhật 2026-11-20 (Hoàn tất Phase 4 / Wave 3 — `starter-twenty-six`):** Dự án áp dụng chiến lược **Wave-based incremental delivery** (mỗi wave gồm 8–10 tướng kèm luật phê duyệt, triển khai server-authoritative, chân dung `1024×1536` Midnight Anime Noir, real Cloudflare DO 4P–8P E2E và mô phỏng 10,000–15,000 trận). Tính đến hết Phase 4, đã có **36/66 nhân vật chơi được** (`10 Classic + 26/56 Expansion`: `14 Hunter · 14 Shadow · 8 Neutral`) với **36/36 chân dung WebP**. **30/56 nhân vật còn lại (`6 Hunter · 7 Shadow · 17 Neutral`: 4 Tier-2 cuối, 18 Tier-3 & 8 Tier-4) hiện vẫn ở trạng thái `not-started` / `needs-clarification` và bị khóa cứng.**

---

## 1. Tiến độ Thực tế & Lộ trình theo Wave / Phase

| Giai đoạn | Tên Milestone | Phạm vi Thực tế | Tiến độ Nhân vật (Cộng dồn) | Ảnh hưởng Classic | Production Ruleset |
|---|---|---|---|---|---|
| **Phase 0** *(DONE · `ce3b8c7`)* | **Catalog & Rules Specification** | Chuẩn hóa `character-catalog.json` (56 tướng mở rộng), validator, `rules-clarifications.md` (20 nhóm `UNRESOLVED`), ma trận độ khó. | `10 / 66` (Catalog: 56) | **0%** | `classic` only |
| **Phase 1** *(DONE · `01cf47c`)* | **Expansion Architecture & Engine Foundation** | `CharacterRegistry`, `RulesetRegistry`, `SkillEngine`, `VictoryEngine`, giữ bit-for-bit Classic RNG (25 SHA-256), server validation chặn expansion. | `10 / 66` | **0%** | `classic` only |
| **Phase 2 (2A–2C)** *(DONE · `dc36ec0`, `bf879e2`, `20d618f`)* | **Wave 1 — Starter Eight Gameplay & Balance** | Triển khai 8 tướng đầu tiên (**4 Hunter:** `G43`, `Fiona`, `Gayle`, `Felicia`; **4 Shadow:** `Wendigo`, `Wyvern`, `Victor`, `Undying`), Pending Choice + Continuation Queue + Secret Reaction P0, 10k-match sim (`starter-eight`). | `18 / 66` (`8/56` exp) | **0%** | `classic` only (`starter-eight` experimental) |
| **Phase 2.5** *(DONE · `0ef7366`..`bf1a16d`)* | **Wave 1 — Starter Eight Visual Identity** | Art Bible `HUSTVerse Midnight — Anime Noir`, 8 chân dung `1024×1536` WebP cho Starter Eight, Contact Sheet, tích hợp Midnight Noir UI/VFX & Playwright Visual QA. | `18 / 66` (`18` portraits) | **0%** | `classic` only |
| **Phase 3 (3A–3C)** *(DONE · `bcd9212`, `cb9982b`, `098b29d`)* | **Wave 2 — Starter Sixteen Gameplay, Art & Balance** | Triển khai **8 tướng Wave 2** (**3 Hunter:** `Elysia`, `Father Harrison`, `Gloria`; **3 Shadow:** `Unchained`, `Warlock`, `Witch`; **2 Neutral:** `Cindy`, `Bipolar`), `LocationAlias`, 9-step Damage Pipeline, Gloria sequential draw queue, Neutral Victory Engine, 8 chân dung WebP (`26/26`), 4P–8P real DO E2E, 10k-match sim (`starter-sixteen`). | `26 / 66` (`16/56` exp · `26` portraits) | **0%** | `classic` only (`starter-sixteen` experimental) |
| **Phase 4 (4A–4D)** *(DONE · `a3979c3`, `d4bcbc2`, `217740e` + 4D)* | **Wave 3 — Starter Twenty-Six Gameplay, Art & Balance** | Đối chiếu sạch số liệu Phase 3; xây 5 nền tảng chung (`getRemainingHp`, `listLivingPlayersInSameCluster`, `CANONICAL_SH_CARD_IDS`, dynamic `eq_chocolate` A/E/U, event attribution); triển khai **10 tướng Tier-2 Wave 3** (**4 Hunter:** `Fallen`, `Fea`, `Eleanor`, `Fujiko`; **4 Shadow:** `Udi`, `Wrath`, `Vengeance`, `Visions`; **2 Neutral:** `Cruz`, `Bryon`); 10 chân dung WebP `63.5–108.2 KB` (`36/36`); 4P–8P real DO E2E + hibernation; **15,000-match** sim (`starter-twenty-six`: `41.34% H / 42.81% S / 15.85% N`). | **`36 / 66`** (`26/56` exp · `36` portraits) | **0%** | `classic` only (`starter-twenty-six` experimental) |
| **Phase 5 / Wave 4** *(PLANNED)* | **Human Playtest + Remaining Tier-2 (4) & Tier-3 Wave (10–12 tướng)** | Chạy Internal Human Beta Playtest trên `starter-twenty-six` (≥ 100 trận) & bổ sung `Auto-Decline` giảm thiểu timing side-channel; xây `HealPipeline` & `DamageRedirection` (có cycle guard); triển khai 4 tướng Tier-2 cuối (`Elise`, `Umibozu`, `Urban Legend`, `Arlene`) cùng nhóm Tier-3 ưu tiên (`Ernest`, `Gwendolen`, `Freyja`, `Gideon`, `Warlord`, `Usurper`, `Angel`, `Bianca`, `Aaron`, ...). | `36 → ~48 / 66` (`30` hiện còn `not-started`) | **0%** | `classic` only (staging beta `starter-twenty-six` / Wave 4) |
| **Phase 6+ / Wave 5** *(PLANNED)* | **Remaining Tier-3 Copied-Victory & Tier-4 Core Mechanics (8 tướng cuối)** | Xây dựng hạ tầng cốt lõi cuối cùng: `CopiedVictoryGraph` (`Cassie`, `Clairvoyant`, `Diana`, `Antimony`), `TurnOwnershipOverride` (`Voodoo`), `PendingResurrection` (`Undead`), `DynamicAllegiance` (`Bonnie`, `N.C. Soldier`), `MultiFactionVictory` (`Cain`), `DynamicSkillCopy` (`Vengeful Spirit`, `Antimony`), `GlobalAttackInterrupt` (`Lloyd`). | `48 → 66 / 66` | **0%** | Mở dần khi đủ trọn bộ: `expansion-1` (26/26) → `expansion-2` (30/30) → `full-expansion` (66/66) |

---

## 2. Trạng thái Chi tiết 56 Nhân vật Mở rộng (Tính đến hết Phase 4)

- **Đã triển khai & có chân dung (`26 / 56`: `11 Hunter · 11 Shadow · 4 Neutral`; `13 Exp1 · 13 Exp2` — chỉ chạy trong Experimental Rulesets):**
  - **Wave 1 / Starter Eight (`8`):** `exp1_wendigo`, `exp2_g43`, `exp2_fiona`, `exp2_wyvern` (`verified`); `exp1_gayle`, `exp1_felicia`, `exp1_victor`, `exp1_undying` (`house-rule-approved`).
  - **Wave 2 / Starter Sixteen (`8`):** `exp1_elysia`, `exp2_unchained`, `exp2_warlock`, `exp2_witch`, `exp2_father_harrison`, `exp2_gloria`, `exp1_cindy`, `exp1_bipolar` (`house-rule-approved`).
  - **Wave 3 / Starter Twenty-Six (`10`):** `exp1_fallen`, `exp1_fea`, `exp2_eleanor`, `exp2_fujiko`, `exp1_udi`, `exp1_wrath`, `exp1_vengeance`, `exp2_visions`, `exp2_cruz`, `exp2_bryon` (`house-rule-approved`).
- **Chưa triển khai (`30 / 56`: `6 Hunter · 7 Shadow · 17 Neutral`; `13 Exp1 · 17 Exp2` — `rulesStatus: "needs-clarification"`, `implementationStatus: "not-started"`):**
  - Gồm `4` Tier-2 (`Elise`, `Umibozu`, `Urban Legend`, `Arlene`), `18` Tier-3 và `8` Tier-4 (`Lloyd`, `Vengeful Spirit`, `Voodoo`, `Undead`, `Antimony`, `Cain`, `Bonnie`, `N.C. Soldier`). Toàn bộ bị khóa chặt bởi `isCharacterPlayable()` và không thể lọt vào bất kỳ trận đấu nào.

---

## 3. Cổng An toàn & Điều kiện Kích hoạt Production (Hard Gates — Bất biến)

1. **Giữ nguyên 100% Classic Production:** Mọi phase/wave bắt buộc đạt `25/25` SHA-256 RNG match và `0.00%` sai lệch trên 4,500 trận Classic simulation (`test/boardgame-sim.cjs`), giữ nguyên vẹn `features/boardgame/domain/victory.ts`.
2. **Không tự nâng cấp trạng thái luật:** Nhân vật dùng experimental house rule giữ đúng `rulesStatus: "house-rule-approved"` (không tự gán `"verified"` nếu thiếu nguồn chính thức).
3. **Cổng Playability (4 điều kiện đồng thời):**
   - `rulesStatus === 'verified'` (hoặc `'house-rule-approved'` khi và chỉ khi ruleset có `allowExperimentalHouseRules: true`)
   - `implementationStatus === 'implemented'`
   - Có `skillImpl` & `victoryImpl` thật trong registry
   - Có unit test + DO integration + simulation + portrait asset PASS.
4. **Quy tắc Kích hoạt Production Ruleset:**
   - `expansion-1` chỉ mở khi đủ **26/26** nhân vật Expansion 1 hoàn thiện & pass E2E + playtest (hiện `13/26`).
   - `expansion-2` chỉ mở khi đủ **30/30** nhân vật Expansion 2 hoàn thiện & pass E2E + playtest (hiện `13/30`).
   - `full-expansion` chỉ mở khi đủ **66/66** nhân vật hoàn thiện và pass bộ kiểm thử tương tác chéo.
5. **Backward Compatibility & Zero-Downtime Deployment:** Mọi trường mở rộng (`expansionState`, `pendingChoice`, `gloriaQueuedCards`) lưu dạng optional JSON trong `AuthoritativeGameState` để các trận `classic` đang chạy không bao giờ bị gián đoạn.
