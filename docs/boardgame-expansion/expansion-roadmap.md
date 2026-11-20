# Bóng Đêm KTX — Character Expansion Roadmap (10 Classic -> 66 Characters)

> Tài liệu này xác định lộ trình mở rộng từ **10 tướng Classic** lên **66 tướng** (10 Classic + 26 Expansion 1 + 30 Expansion 2) với kỷ luật kiểm soát rủi ro tuyệt đối cho bản Classic đang chạy production tại `https://hustverse.vercel.app/`.
>
> **Cập nhật 2026-11-20 (Wave-Based Delivery Reconciliation):** Thay vì triển khai một lần toàn bộ 30 tướng Tier 1–2 rồi 18 tướng Tier 3 trong các lô lớn rủi ro cao, dự án áp dụng chiến lược **Wave-based incremental delivery** (mỗi wave gồm 8 tướng đi kèm luật phê duyệt, triển khai server-authoritative, chân dung Midnight Anime Noir, integration DO E2E và mô phỏng 10,000 trận). **40/56 nhân vật còn lại (gồm toàn bộ nhóm Tier 3 phức tạp & Tier 4) hiện vẫn ở trạng thái `not-started` / `needs-clarification` và chưa hoàn thành.**

---

## 1. Tiến độ Thực tế & Lộ trình theo Wave / Phase

| Giai đoạn | Tên Milestone | Phạm vi Thực tế | Tiến độ Nhân vật (Cộng dồn) | Ảnh hưởng Classic | Production Ruleset |
|---|---|---|---|---|---|
| **Phase 0** *(DONE · `ce3b8c7`)* | **Catalog & Rules Specification** | Chuẩn hóa `character-catalog.json` (56 tướng mở rộng), validator, `rules-clarifications.md` (20 nhóm `UNRESOLVED`), ma trận độ khó. | `10 / 66` (Catalog: 56) | **0%** | `classic` only |
| **Phase 1** *(DONE · `01cf47c`)* | **Expansion Architecture & Engine Foundation** | `CharacterRegistry`, `RulesetRegistry`, `SkillEngine`, `VictoryEngine`, giữ bit-for-bit Classic RNG (25 SHA-256), server validation chặn expansion. | `10 / 66` | **0%** | `classic` only |
| **Phase 2 (2A–2C)** *(DONE · `dc36ec0`, `bf879e2`, `20d618f`)* | **Wave 1 — Starter Eight Gameplay & Balance** | Triển khai 8 tướng đầu tiên (**4 Hunter:** `G43`, `Fiona`, `Gayle`, `Felicia`; **4 Shadow:** `Wendigo`, `Wyvern`, `Victor`, `Undying`), Pending Choice + Continuation Queue + Secret Reaction P0, 10k-match sim (`starter-eight`). | `18 / 66` (`8/56` exp) | **0%** | `classic` only (`starter-eight` experimental) |
| **Phase 2.5** *(DONE · `0ef7366`..`bf1a16d`)* | **Wave 1 — Starter Eight Visual Identity** | Art Bible `HUSTVerse Midnight — Anime Noir`, 8 chân dung `1024×1536` WebP cho Starter Eight, Contact Sheet, tích hợp Midnight Noir UI/VFX & Playwright Visual QA. | `18 / 66` (`18` portraits) | **0%** | `classic` only |
| **Phase 3 (3A–3C)** *(DONE — Wave 2)* | **Wave 2 — Starter Sixteen Gameplay, Art & Balance** | **Không thay thế kế hoạch 18 tướng Tier 3 gốc** — triển khai Wave 2 gồm **8 tướng** (**3 Hunter:** `Elysia`, `Father Harrison`, `Gloria`; **3 Shadow:** `Unchained`, `Warlock`, `Witch`; **2 Neutral:** `Cindy`, `Bipolar`), `LocationAlias`, 9-step Damage Pipeline, Gloria sequential draw queue, Neutral Victory Engine, 8 chân dung WebP (`26/26`), 4P–8P real DO E2E, 10k-match sim (`starter-sixteen`). | **`26 / 66`** (`16/56` exp · `26` portraits) | **0%** | `classic` only (`starter-sixteen` experimental) |
| **Wave 3 / Phase 4** *(PLANNED)* | **Remaining Tier 1–2 & Mid-Tier Wave(s)** | Phê duyệt luật, triển khai, vẽ chân dung & cân bằng các nhóm nhân vật còn lại thuộc Tier 1–2 và nửa đầu Tier 3 (chuyển `eq_chocolate` đọc động theo registry; tinh chỉnh theo dữ liệu Human Playtest `starter-sixteen`). | `26 → ~44 / 66` (`40` còn lại hiện `not-started`) | **0%** | `classic` only (mở staging beta theo wave) |
| **Wave 4+ / Phase 5** *(PLANNED)* | **Remaining Tier 3 Out-of-Turn & Tier 4 Core Mechanics (8 tướng cuối)** | Xây dựng hạ tầng cho các cơ chế đặc biệt còn lại: `HealPipeline`, `DamageRedirection` (cycle guard), `CopiedVictoryGraph`, `TurnOwnershipOverride` (`Voodoo`), `PendingResurrection` (`Undead`), `DynamicAllegiance` (`Bonnie`, `N.C. Soldier`), `MultiFactionVictory` (`Cain`), `DynamicSkillCopy` (`Antimony`, `Vengeful Spirit`), `GlobalAttackInterrupt` (`Lloyd`). | `44 → 66 / 66` | **0%** | Mở dần khi đủ bộ: `expansion-1` (26/26) → `expansion-2` (30/30) → `full-expansion` (66/66) |

---

## 2. Trạng thái Chi tiết 56 Nhân vật Mở rộng (Tính đến hết Phase 3)

- **Đã triển khai & có chân dung (`16 / 56` — chỉ chạy trong Experimental Rulesets):**
  - **Wave 1 / Starter Eight (`8`):** `exp1_wendigo`, `exp2_g43`, `exp2_fiona`, `exp2_wyvern` (`verified`); `exp1_gayle`, `exp1_felicia`, `exp1_victor`, `exp1_undying` (`house-rule-approved`).
  - **Wave 2 / Starter Sixteen (`8`):** `exp1_elysia`, `exp2_unchained`, `exp2_warlock`, `exp2_witch`, `exp2_father_harrison`, `exp2_gloria`, `exp1_cindy`, `exp1_bipolar` (`house-rule-approved`).
- **Chưa triển khai (`40 / 56` — `rulesStatus: "needs-clarification"`, `implementationStatus: "not-started"`):**
  - Toàn bộ 40 nhân vật này (bao gồm toàn bộ nhóm Tier 3 phức tạp & 8 tướng Tier 4) bị khóa chặt bởi `isCharacterPlayable()` và không thể lọt vào bất kỳ trận đấu nào.

---

## 3. Cổng An toàn & Điều kiện Kích hoạt Production (Hard Gates — Bất biến)

1. **Giữ nguyên 100% Classic Production:** Mọi phase/wave bắt buộc đạt `25/25` SHA-256 RNG match và `0.00%` sai lệch trên 4,500 trận Classic simulation (`test/boardgame-sim.cjs`).
2. **Không tự nâng cấp trạng thái luật:** Nhân vật dùng experimental house rule giữ đúng `rulesStatus: "house-rule-approved"` (không tự gán `"verified"` nếu thiếu nguồn chính thức).
3. **Cổng Playability (4 điều kiện đồng thời):**
   - `rulesStatus === 'verified'` (hoặc `'house-rule-approved'` khi và chỉ khi ruleset có `allowExperimentalHouseRules: true`)
   - `implementationStatus === 'implemented'`
   - Có `skillImpl` & `victoryImpl` thật trong registry
   - Có unit test + DO integration + simulation + portrait asset PASS.
4. **Quy tắc Kích hoạt Production Ruleset:**
   - `expansion-1` chỉ mở khi đủ **26/26** nhân vật Expansion 1 hoàn thiện & pass E2E + playtest.
   - `expansion-2` chỉ mở khi đủ **30/30** nhân vật Expansion 2 hoàn thiện & pass E2E + playtest.
   - `full-expansion` chỉ mở khi đủ **66/66** nhân vật hoàn thiện và pass bộ kiểm thử tương tác chéo.
5. **Backward Compatibility & Zero-Downtime Deployment:** Mọi trường mở rộng (`expansionState`, `pendingChoice`, `gloriaQueuedCards`) lưu dạng optional JSON trong `AuthoritativeGameState` để các trận `classic` đang chạy không bao giờ bị gián đoạn.
