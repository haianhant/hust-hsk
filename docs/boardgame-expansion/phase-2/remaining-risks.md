# Bóng Đêm KTX — Phase 2 Remaining Risks, Alpha Readiness & Next Wave Plan

> **Mục tiêu:** Tổng hợp các rủi ro còn tồn đọng sau khi hoàn thiện 8 tướng Starter Eight (`Phase 2A–2C`), đánh giá mức độ sẵn sàng cho **Internal Playtest Alpha**, và đề xuất đợt nhân vật kế tiếp dựa trên dữ liệu thực nghiệm.

---

## 1. Sổ Đăng ký Rủi ro (Risk Register — P0 / P1 / P2)

### P0 — Rủi ro Nghiêm trọng (Blocker Production)
| Mã | Mô tả rủi ro | Trạng thái hiện tại | Biện pháp kiểm soát |
|---|---|---|---|
| **R-P0-01** | Kích hoạt nhầm `starter-four`, `starter-eight`, `expansion-1/2`, `full-expansion` lên production | ✅ **Đã khóa cứng** | `wrangler.toml` không đặt `ALLOW_EXPERIMENTAL_RULESETS`; `enabledInProduction: false`; test tự động xác nhận HTTP 400 `RULESET_UNAVAILABLE` trên prod DO. |
| **R-P0-02** | Timing side-channel ở phản ứng bí mật (`Wendigo`, `Undying`) | ⚠️ **Đã giảm thiểu, còn cần quan sát ở human playtest** | Hiện tại `publicGame.pendingChoice` ẩn hoàn toàn `ownerPlayerId` và `kind` (`null`), thông báo trung tính và không phát log khi decline/timeout. Tuy nhiên, nếu bàn đấu *chỉ* tạm dừng khi thực sự có Wendigo/Undying ẩn còn sống, người chơi kỳ cựu vẫn có thể suy đoán *"trên bàn có một trong hai vai phản ứng bí mật"*. **Giải pháp đề xuất cho Phase 3:** Nếu mở rộng thêm các vai phản ứng ngoài lượt (Lloyd, Cindy, Arnold, Usurper), bổ sung *dummy brief delay* (300–500ms) hoặc cửa sổ phản ứng đồng nhất theo cấu hình phòng. |

### P1 — Rủi ro Cân bằng & Trải nghiệm Chơi (Playtest Focus)
| Mã | Mô tả rủi ro | Mức độ ảnh hưởng | Hướng theo dõi trong Human Playtest |
|---|---|---|---|
| **R-P1-01** | **G43 (`63.79%` win) & combo `G43 + Holy Robe` (`70.10%` win)** làm lệch cán cân Hunter vs Shadow ở bàn 4P và 8P | Cao (Balance) | Đo tỷ lệ thắng thực tế với người chơi biết counter-play bằng thẻ Đột Kích (`Flare`, `Dynamite`, `Vampire Bat`, `Spider`), Ô 9 và cướp giáp. Chưa sửa HP/kỹ năng trước khi có dữ liệu người thật. |
| **R-P1-02** | **Chân dung (Portrait Artwork) cho 8 tướng mới** hiện dùng thẻ crest/motif Midnight Noir fallback thay vì minh họa nhân vật riêng | Trung bình (Visual) | Không chặn gameplay hay playtest alpha; đưa vào lộ trình Phase 5 (HUST KTX Lore Localization & Portrait Art). |
| **R-P1-03** | **Thời hạn chọn bài của Felicia (`12s`)** với người chơi mới lần đầu đọc 2 thẻ dài | Trung bình (UX) | `BOARD_GAME_CHOICE_TIMEOUT_MS = 12_000` an toàn chống treo ván, có thể tăng lên `15_000` riêng cho `felicia_draw_choice` nếu playtest ghi nhận tỷ lệ timeout cao. |
| **R-P1-04** | **48 nhân vật mở rộng còn lại** vẫn có luật nguồn `needs-clarification` (`UNRESOLVED`) | Cao (Roadmap) | Cổng `isCharacterPlayable()` & `validate-character-catalog.cjs` khóa chặt 48/56 tướng ở `not-started`, tuyệt đối không cho lọt vào pool phân vai. |

### P2 — Rủi ro Vận hành & Nợ Kỹ thuật Nhỏ
| Mã | Mô tả rủi ro | Hướng xử lý |
|---|---|---|
| **R-P2-01** | Mức tiêu thụ CPU khi mở rộng lên 26–66 tướng trong `SkillEngine.dispatch` | Đã bổ sung **lazy rollback snapshot** trong `skill-engine.ts` (chỉ `structuredClone(state)` khi có ít nhất 1 handler vượt qua `canTrigger`), giúp 10,000 trận chạy chỉ còn ~24.7s. |
| **R-P2-02** | Đồng bộ UI Lobby hiển thị ruleset `starter-eight` cho môi trường staging/playtest nội bộ | Hiện Lobby mặc định chỉ nhận danh sách 4 ruleset production (`classic` Available; 3 expansion Coming Soon). Để mở playtest nội bộ trên staging, chỉ cần truyền cờ env staging `ALLOW_EXPERIMENTAL_RULESETS=1` + UI beta opt-in cho phòng nội bộ. |
| **R-P2-03** | Tương tác thẻ `eq_chocolate` với các tướng mở rộng bắt đầu bằng chữ `A/E/U` trong các đợt sau | Phase 2B đã chuẩn hóa cho `exp1_undying` (`U`); ở Phase 3 nên chuyển sang kiểm tra tổng quát theo chữ cái đầu `sourceName` từ `CharacterRegistry` (`A | E | U`) cho chế độ mở rộng. |

---

## 2. Đánh giá Mức độ Sẵn sàng Playtest Alpha (`starter-eight`)

| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| **Engine & 8/8 Skill/Victory Handlers** | ✅ **READY** | 4 Phase 2A (`verified`) + 4 Phase 2B (`house-rule-approved`) hoàn chỉnh trên `SkillEngine` & `VictoryEngine`. |
| **Multiplayer DO Stability (4P–8P, Reconnect, Hibernation, Alarm)** | ✅ **READY** | 0 deadlock, 0 stall qua 10,000 trận sim + toàn bộ bài test DO thật (`P2A-6`, `P2B-6`, `P2C-1..3`). |
| **P0 Security & Spectator Privacy** | ✅ **READY** | 0 secret leaks, anti-spoof xúc xắc/choice/ruleset, duplicate `requestId` idempotent. |
| **Classic Zero Regression & Prod Safety** | ✅ **READY** | 25/25 SHA-256 RNG khớp tuyệt đối, 4,500-match Classic diff = `0.00%`, production vẫn khóa cứng `classic` only. |
| **Midnight Noir UI/VFX & Reduced Motion** | ✅ **READY (Alpha)** | Đủ panel Pending Choice chuyên biệt (card/dice/HP-cost/secret), badge trạng thái kỹ năng, VFX/SFX + Reduced Motion; chỉ còn bổ sung tranh chân dung riêng ở Phase 5. |

**Kết luận:** **`starter-eight` ĐẠT CHUẨN INTERNAL ALPHA PLAYTEST READY** (chỉ bật trong môi trường thử nghiệm nội bộ `ALLOW_EXPERIMENTAL_RULESETS=1`, **KHÔNG bật trên production**).

---

## 3. Đề xuất Đợt Nhân vật Kế tiếp (Next Wave Recommendation — Phase 3A)

Dựa trên kết quả cân bằng `starter-eight` (phe Shadow đang cần thêm lực lượng đa dạng & các tướng Neutral mới để mở rộng pool Neutral vẫn đang chỉ có 4 tướng Classic!) và [`implementation-complexity-matrix.md`](../implementation-complexity-matrix.md), đề xuất **Wave kế tiếp gồm 6–8 tướng Tier 1 / Tier 2 ít phụ thuộc kiến trúc mới nhất**, ưu tiên chốt trước **2 Global Rules (`Location Alias Table` & `Wound-Track vs HP Convention`)**:

1. **Nhóm Tier 1 thuần combat/di chuyển (4 tướng — chốt `Location Alias` là code ngay):**
   - `exp1_elysia` (Hunter, 10 HP — *Phản công*: nếu đánh trúng `< 3` ST thì `+2` ST) — tái dụng trực tiếp `BEFORE_DAMAGE`.
   - `exp2_unchained` (Shadow, 11 HP — bổ sung sát thương chủ động giúp Shadow đối trọng G43!).
   - `exp2_father_harrison` (Hunter, 12 HP — đi thẳng vào `lobby`/Church thay vì đổ xúc xắc) — chốt `CAP-02` Location Alias.
   - `exp2_gloria` (Hunter, 14 HP — rút 2 thẻ Trắng tại `lobby`/Church) — tái dụng ngay `ON_DRAW_CARD`.
2. **Nhóm Shadow & Neutral mở rộng chiều sâu (4 tướng — bổ sung pool Neutral còn đang giữ 4 vai Classic!):**
   - `exp2_warlock` & `exp2_witch` (Shadow, 14 HP — tăng sức ép phép/khu vực của phe Shadow, khắc chế trực tiếp G43!).
   - `exp1_cindy` (Neutral, 11 HP — *Con ác mộng*: phản 1 ST khi nhận sát thương, tái dụng Secret Pending Choice đã có từ Undying/Wendigo!).
   - `exp1_bipolar` (Neutral, 10 HP — điều kiện thắng phân nhánh `conditional`, kiểm chứng nhánh `VictoryEngine` ngoài Classic!).

> **Không nên đưa vào Wave kế tiếp:** Toàn bộ 8 tướng Tier 4 (`Voodoo`, `Undead`, `Bonnie`, `N.C. Soldier`, `Antimony`, `Vengeful Spirit`, `Cain`, `Lloyd`) vẫn phải giữ sang Phase 4 sau khi chốt toàn bộ `RC-01..RC-09` trong [`rules-clarifications.md`](../rules-clarifications.md).
