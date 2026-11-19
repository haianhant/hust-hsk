# Bóng Đêm KTX — Character Expansion Roadmap (10 Classic -> 66 Characters)

> Tài liệu này xác định lộ trình mở rộng từ **10 tướng Classic** lên **66 tướng** (10 Classic + 26 Expansion 1 + 30 Expansion 2) với kỷ luật kiểm soát rủi ro tuyệt đối cho bản Classic đang chạy production tại `https://hustverse.vercel.app/`.

---

## 1. Tổng quan Lộ trình theo Phase

| Phase | Tên Phase | Phạm vi chính | Ảnh hưởng Classic Gameplay | Trạng thái Ruleset Production |
|---|---|---|---|---|
| **Phase 0** | **Catalog & Rules Specification** | Audit hệ thống hiện tại, thu thập 56 tướng từ 6 bài nguồn `thegioiboardgame.vn`, chuẩn hóa `character-catalog.json` + validator, liệt kê 20 nhóm `UNRESOLVED` trong `rules-clarifications.md`, ma trận độ khó. | **0% (Không sửa code gameplay)** | `classic` only |
| **Phase 1** | **Expansion Architecture & Engine Foundation** | `RulesetRegistry`, `CharacterRegistry`, `SkillEngine` (event/trigger + priority + recursion guard + idempotency), `VictoryEngine` (7 archetypes + Classic equivalence), mở rộng `createInitialGameState` giữ nguyên RNG Classic, Lobby selector + server validation (`classic` Available; 3 expansion rulesets Coming Soon/Disabled), bộ test & CI regression. | **0% (Bit-for-bit Classic RNG & kết quả)** | `classic` only (`expansion-*` bị chặn tại server) |
| **Phase 2** | **Rules Ratification + Tier 1 & Tier 2 Implementation (30 tướng)** | Chốt & phê duyệt quyết định chính thức cho 20 mục `UNRESOLVED` (Global Rule #0 về reveal, Location Alias KTX, Area Scope, Card Canonical IDs, Wound vs HP track, Gender 66 tướng). Triển khai & test 12 tướng Tier 1 + 18 tướng Tier 2 trong nhánh thử nghiệm nội bộ (`experimental` feature flag). | **0% cho `classic`** | `classic` only (Exp 1/2 vẫn tắt cho tới khi đủ bộ) |
| **Phase 3** | **Out-of-Turn Reaction Queue & Tier 3 Implementation (18 tướng)** | Xây dựng `ServerReactionWindow` có timeout chống treo trận và chống timing side-channel leak, `HealPipeline`, `DamageRedirection` có cycle guard, `CopiedVictory` graph. Triển khai & test 18 tướng Tier 3. | **0% cho `classic`** | `classic` only (hoặc canary nội bộ) |
| **Phase 4** | **Tier 4 Core Mechanics & Expansion 1/2 Activation (8 tướng cuối)** | Triển khai `TurnOwnershipOverride` (`Voodoo`), `PendingResurrection` (`Undead`), `DynamicAllegiance` (`Bonnie`, `N.C. Soldier`), `MultiFactionVictory` (`Cain`), `DynamicSkillCopy` (`Antimony`, `Vengeful Spirit`), `GlobalAttackInterrupt` (`Lloyd`). Hoàn thiện 100% 26 tướng Exp 1 và 30 tướng Exp 2 + E2E multiplayer 4–8 người. | **0% cho `classic`** | Mở dần: `expansion-1` -> `expansion-2` -> `full-expansion` |
| **Phase 5** | **HUST KTX Lore Localization, Portrait Art & Balance Telemetry** | Việt hóa tên/tiểu sử theo chủ đề KTX Bách Khoa (tùy chọn giữ song song tên gốc SH), sinh artwork Midnight Anime Noir & VFX/SFX cho 56 nhân vật, telemetry cân bằng tỷ lệ thắng 4–8 người. | **0% cho `classic`** | Full 66 tướng production |

---

## 2. Điều kiện Sẵn sàng Bước vào Phase 2 (Phase 2 Entry Criteria)

Không bắt đầu viết bất kỳ skill handler nào của 56 nhân vật mở rộng cho tới khi **toàn bộ 6 cổng sau** đạt PASS:

1. **Phase 0 & Phase 1 đã nghiệm thu độc lập và merge sạch:**
   - `node scripts/validate-character-catalog.cjs` PASS (56 tướng, 0 trùng ID, 0 lỗi nguồn).
   - Toàn bộ CI gates (`typecheck`, `test:boardgame`, `test:contracts`, `test:mp`, `build`, BoardGame E2E 4 shards) PASS 100% với Classic regression = 0.
2. **Phê duyệt chính thức cho Global Expansion Rules (từ `rules-clarifications.md`):**
   - Chốt **Global Rule #0 (Reveal):** Mặc định mọi kỹ năng chỉ kích hoạt khi đã lộ diện trừ trường hợp ghi rõ không cần lộ diện (`Arlene`).
   - Chốt **Location Alias Table (RC-10):** `Church (6) -> lobby`, `Weird Woods (9) -> corridor`, `Erstwhile Altar (10) -> court`.
   - Chốt **Area Scope Definition (RC-10):** *"cùng khu vực"* là `Location` hay `Cluster`.
   - Chốt **Wound-Track vs HP-Remaining Convention (RC-15)** cho `Fallen`, `Dalton`, `April & Skipps`, `Fujiko`.
   - Kiểm kê & bổ sung **Canonical Shadow Hunters Card IDs** trong `features/boardgame/domain/cards.ts` (đã đối chiếu đủ trong `cards.ts`: `ev-02..ev-10`; cần chốt canonical tag & bản dịch hiển thị UI).
   - Chốt bảng **`gender`** chính thức cho toàn bộ 66 nhân vật (gồm cả 10 nhân vật Classic Bách Khoa) phục vụ `Aaron`.
3. **Phê duyệt từng nhóm `UNRESOLVED` tương ứng với Wave triển khai:**
   - Chỉ được chuyển `rulesStatus` của một nhân vật từ `"needs-clarification"` -> `"verified"` khi quyết định đã được ghi vào `rules-clarifications.md` kèm ngày duyệt và phương án được chọn.
4. **Cơ chế Cổng An toàn (Hard Playability Gate) luôn được giữ nguyên:**
   - Một nhân vật mở rộng chỉ được phép lọt vào `CharacterRegistry.listPlayableCharacters(rulesetId)` khi đồng thời thỏa 4 điều kiện:
     1. `rulesStatus === 'verified'`
     2. `implementationStatus === 'implemented'`
     3. Có executable skill handler + victory evaluator đã đăng ký trong registry
     4. Có unit test + determinstic simulation test PASS.
5. **Quy tắc Kích hoạt Ruleset:**
   - `expansion-1` chỉ chuyển `availability: 'available'` khi **26/26** nhân vật Expansion 1 hoàn thiện & pass E2E.
   - `expansion-2` chỉ chuyển `availability: 'available'` khi **30/30** nhân vật Expansion 2 hoàn thiện & pass E2E.
   - `full-expansion` chỉ chuyển `availability: 'available'` khi **66/66** nhân vật hoàn thiện và pass bộ test tương tác chéo (cross-expansion interactions: ví dụ `Ernest` vs `Umibozu`, `Antimony` vs `Undead`, `Anathema` vs `Arnold`, `Cain` vs `Bipolar`).
6. **Backward Compatibility & Zero-Downtime Deployment:**
   - Mọi nâng cấp schema runtime state cho Phase 2–4 phải lưu dưới trường tùy chọn mở rộng (ví dụ `expansionState?: ExpansionRuntimeState`) để các trận `classic` đang diễn ra trước thời điểm deploy không bao giờ bị ngắt kết nối hay corrupt state.
