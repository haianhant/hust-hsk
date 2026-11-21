# Bóng Đêm KTX — Character Expansion Roadmap (10 Classic -> 66 Characters)

> Tài liệu này xác định lộ trình mở rộng từ **10 tướng Classic** lên **66 tướng** (10 Classic + 26 Expansion 1 + 30 Expansion 2) với kỷ luật kiểm soát rủi ro tuyệt đối cho bản Classic đang chạy production tại `https://hustverse.vercel.app/`.
>
> **Cập nhật 2026-11-21 (Hoàn tất Phase 6 / Wave 5 — `starter-forty-eight` · Tier-3 Completion):** Dự án áp dụng chiến lược **Wave-based incremental delivery** (mỗi wave gồm 8–12 tướng kèm luật phê duyệt, triển khai server-authoritative, chân dung `1024×1536` Midnight Anime Noir, real Cloudflare DO 4P–8P E2E và mô phỏng 10,000–25,000 trận). Tính đến hết Phase 6, đã có **58/66 nhân vật chơi được** (`10 Classic + 48/56 Expansion`: `19 Hunter · 18 Shadow · 21 Neutral`) với **58/58 chân dung WebP** (tổng **105 WebP assets** Midnight Noir). Toàn bộ **Tier-2 & Tier-3 đã hoàn tất 100%**. **Chỉ còn đúng 8/56 nhân vật Tier-4 cuối cùng (`1 Hunter · 3 Shadow · 4 Neutral`: `5 Exp1 · 3 Exp2`) đang ở trạng thái `not-started` / `needs-clarification` và bị khóa cứng cho Phase 7.**

---

## 1. Tiến độ Thực tế & Lộ trình theo Wave / Phase

| Giai đoạn | Tên Milestone | Phạm vi Thực tế | Tiến độ Nhân vật (Cộng dồn) | Ảnh hưởng Classic | Production Ruleset |
|---|---|---|---|---|---|
| **Phase 0** *(DONE · `ce3b8c7`)* | **Catalog & Rules Specification** | Chuẩn hóa `character-catalog.json` (56 tướng mở rộng), validator, `rules-clarifications.md` (20 nhóm `UNRESOLVED`), ma trận độ khó. | `10 / 66` (Catalog: 56) | **0%** | `classic` only |
| **Phase 1** *(DONE · `01cf47c`)* | **Expansion Architecture & Engine Foundation** | `CharacterRegistry`, `RulesetRegistry`, `SkillEngine`, `VictoryEngine`, giữ bit-for-bit Classic RNG (25 SHA-256), server validation chặn expansion. | `10 / 66` | **0%** | `classic` only |
| **Phase 2 (2A–2C)** *(DONE · `dc36ec0`, `bf879e2`, `20d618f`)* | **Wave 1 — Starter Eight Gameplay & Balance** | Triển khai 8 tướng đầu tiên (**4 Hunter:** `G43`, `Fiona`, `Gayle`, `Felicia`; **4 Shadow:** `Wendigo`, `Wyvern`, `Victor`, `Undying`), Pending Choice + Continuation Queue + Secret Reaction P0, 10k-match sim (`starter-eight`). | `18 / 66` (`8/56` exp) | **0%** | `classic` only (`starter-eight` experimental) |
| **Phase 2.5** *(DONE · `0ef7366`..`bf1a16d`)* | **Wave 1 — Starter Eight Visual Identity** | Art Bible `HUSTVerse Midnight — Anime Noir`, 8 chân dung `1024×1536` WebP cho Starter Eight, Contact Sheet, tích hợp Midnight Noir UI/VFX & Playwright Visual QA. | `18 / 66` (`18` portraits) | **0%** | `classic` only |
| **Phase 3 (3A–3C)** *(DONE · `bcd9212`, `cb9982b`, `098b29d`)* | **Wave 2 — Starter Sixteen Gameplay, Art & Balance** | Triển khai **8 tướng Wave 2** (**3 Hunter:** `Elysia`, `Father Harrison`, `Gloria`; **3 Shadow:** `Unchained`, `Warlock`, `Witch`; **2 Neutral:** `Cindy`, `Bipolar`), `LocationAlias`, 9-step Damage Pipeline, Gloria sequential draw queue, Neutral Victory Engine, 8 chân dung WebP (`26/26`), 4P–8P real DO E2E, 10k-match sim (`starter-sixteen`). | `26 / 66` (`16/56` exp · `26` portraits) | **0%** | `classic` only (`starter-sixteen` experimental) |
| **Phase 4 (4A–4D)** *(DONE · `a3979c3`..`9e498cd`)* | **Wave 3 — Starter Twenty-Six Gameplay, Art & Balance** | Xây 5 nền tảng chung (`getRemainingHp`, `listLivingPlayersInSameCluster`, `CANONICAL_SH_CARD_IDS`, dynamic `eq_chocolate` A/E/U, event attribution); triển khai **10 tướng Tier-2 Wave 3** (`Fallen`, `Fea`, `Eleanor`, `Fujiko`, `Udi`, `Wrath`, `Vengeance`, `Visions`, `Cruz`, `Bryon`); 10 chân dung WebP (`36/36`); 4P–8P DO E2E; **15,000-match** sim (`starter-twenty-six`: `41.34% H / 42.81% S / 15.85% N`). | `36 / 66` (`26/56` exp · `36` portraits) | **0%** | `classic` only (`starter-twenty-six` experimental) |
| **Phase 5 (5A–5E)** *(DONE · `9ffcb3e`..`5e91f04`)* | **Wave 4 — Tier-2 Completion & Tier-3 Wave (`starter-thirty-eight`)** | Xây 5 nền tảng lõi (`CAP-04` `HealPipeline`, `CAP-05` private unicast `SET_REACTION_PREF`, `CAP-06` bounded reaction chains, `CAP-07` extended Neutral victory primitives, `CAP-10` canonical card sets); hoàn tất **4 tướng Tier-2 cuối** (`Elise`, `Umibozu`, `Urban Legend`, `Arlene`) + **8 tướng Tier-3** (`Ernest`, `Gwendolen`, `Freyja`, `Warlord`, `Usurper`, `Angel`, `Bianca`, `Dalton`); **12 chân dung WebP** (`48/48`); real DO 4P–8P E2E; **20,000-match** sim (`38.61% H / 44.15% S / 17.25% N`, `avgRounds = 7.29`, 0 stalls/leaks). | `48 / 66` (`38/56` exp · `48` portraits) | **0%** | `classic` only (`starter-thirty-eight` experimental) |
| **Phase 6 (6A–6E)** *(DONE · `1532dcd`..Phase 6E)* | **Wave 5 — Tier-3 Completion & Advanced Victory Mechanics (`starter-forty-eight`)** | Xây `CopiedVictoryGraph` (`COPY_GOAL` / `SHARE_OUTCOME` / `CONDITIONAL_SHARED` + cycle guard), `DamageRedirection` (`MAX_REDIRECT_CHAIN_DEPTH = 4` + visited-set), `character-metadata.ts` (66/66), `reveal-events.ts`, `equipment-transactions.ts` (atomic conservation), vá rò `choiceId` bí mật (`choice-secret-*`); triển khai **10 tướng Tier-3 cuối** (`Gideon`, `Anathema`, `Bethany`, `Arnold`, `Cassie`, `Clairvoyant`, `April & Skipps`, `Colt`, `Diana`, `Aaron`); **10 chân dung WebP** `64.0–130.6 KB` (**58/58** · **105 WebP assets**); Prototype Section 5F; 25 kịch bản + real DO 4P–8P E2E + hibernation; **25,000-match** sim (`starter-forty-eight`). | **`58 / 66`** (`48/56` exp · `58` portraits) | **0%** | `classic` only (`starter-forty-eight` experimental) |
| **Phase 7 / Wave 6** *(NEXT — FINAL 8 TIER-4)* | **Tier-4 Completion & Full Expansion Readiness (`66/66`)** | Xây các cơ chế Tier-4 còn lại (`TurnOwnershipOverride` cho `Voodoo`, `PendingResurrection` cho `Undead`, `DynamicSkillCopy` cho `Vengeful Spirit`/`Antimony`, `DynamicAllegiance` cho `Bonnie`/`N.C. Soldier`, `MultiFactionVictory` cho `Cain`, `GlobalAttackInterrupt` cho `Lloyd`); triển khai **8 tướng Tier-4 cuối** + sinh **8 chân dung cuối** (`66/66`); mở dần playtest `expansion-1` (26/26) → `expansion-2` (30/30) → `full-expansion` (66/66). | `58 → 66 / 66` (`8` Tier-4 còn `not-started`) | **0%** | Mở dần khi đủ trọn bộ & pass Human Playtest |

---

## 2. Trạng thái Chi tiết 56 Nhân vật Mở rộng (Tính đến hết Phase 6)

- **Đã triển khai & có chân dung (`48 / 56`: `16 Hunter · 15 Shadow · 17 Neutral`; `21 Exp1 · 27 Exp2` — chỉ chạy trong Experimental Rulesets):**
  - **Wave 1 / Starter Eight (`8`):** `exp1_wendigo`, `exp2_g43`, `exp2_fiona`, `exp2_wyvern` (`verified`); `exp1_gayle`, `exp1_felicia`, `exp1_victor`, `exp1_undying` (`house-rule-approved`).
  - **Wave 2 / Starter Sixteen (`8`):** `exp1_elysia`, `exp2_unchained`, `exp2_warlock`, `exp2_witch`, `exp2_father_harrison`, `exp2_gloria`, `exp1_cindy`, `exp1_bipolar` (`house-rule-approved`).
  - **Wave 3 / Starter Twenty-Six (`10`):** `exp1_fallen`, `exp1_fea`, `exp2_eleanor`, `exp2_fujiko`, `exp1_udi`, `exp1_wrath`, `exp1_vengeance`, `exp2_visions`, `exp2_cruz`, `exp2_bryon` (`house-rule-approved`).
  - **Wave 4 / Starter Thirty-Eight (`12`):** `exp2_elise`, `exp2_umibozu`, `exp2_urban_legend`, `exp2_arlene`, `exp1_ernest`, `exp1_gwendolen`, `exp2_freyja`, `exp2_warlord`, `exp2_usurper`, `exp1_angel`, `exp2_bianca`, `exp2_dalton` (`house-rule-approved`).
  - **Wave 5 / Starter Forty-Eight (`10` — Tier-3 Completion):** `exp2_gideon`, `exp1_anathema`, `exp1_bethany`, `exp1_arnold`, `exp1_cassie`, `exp1_clairvoyant`, `exp2_april_skipps`, `exp2_colt`, `exp2_diana`, `exp2_aaron` (`house-rule-approved`).
- **Chưa triển khai (`8 / 56`: `1 Hunter · 3 Shadow · 4 Neutral`; `5 Exp1 · 3 Exp2` — `rulesStatus: "needs-clarification"`, `implementationStatus: "not-started"`):**
  - **8 Tier-4 (Deferred to Phase 7):** `exp1_lloyd` (Hunter), `exp1_vengeful_spirit` (Shadow), `exp1_voodoo` (Shadow), `exp1_undead` (Shadow), `exp1_antimony` (Neutral), `exp2_cain` (Neutral), `exp2_bonnie` (Neutral), `exp2_nc_soldier` (Neutral).
  - Toàn bộ bị khóa chặt bởi `isCharacterPlayable()` và không thể lọt vào bất kỳ trận đấu nào.

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
   - `expansion-1` chỉ mở khi đủ **26/26** nhân vật Expansion 1 hoàn thiện & pass E2E + playtest (hiện `21/26`).
   - `expansion-2` chỉ mở khi đủ **30/30** nhân vật Expansion 2 hoàn thiện & pass E2E + playtest (hiện `27/30`).
   - `full-expansion` chỉ mở khi đủ **66/66** nhân vật hoàn thiện và pass bộ kiểm thử tương tác chéo.
5. **Backward Compatibility & Zero-Downtime Deployment:** Mọi trường mở rộng (`expansionState`, `pendingChoice`, `gloriaQueuedCards`, `angelAuras`, `daltonActivatedByPlayer`, `reactionPolicyByPlayer`) lưu dạng optional JSON trong `AuthoritativeGameState` để các trận `classic` đang chạy không bao giờ bị gián đoạn.
