# Bóng Đêm KTX — Character Expansion Roadmap (10 Classic -> 66 Characters)

> Tài liệu này xác định lộ trình mở rộng từ **10 tướng Classic** lên **66 tướng** (10 Classic + 26 Expansion 1 + 30 Expansion 2) với kỷ luật kiểm soát rủi ro tuyệt đối cho bản Classic đang chạy production tại `https://hustverse.vercel.app/`.
>
> **Cập nhật 2026-11-21 (Phase 8A — Opt-In Production Beta / Early Access):** Chủ dự án đã phê duyệt mở **Production Beta (Early Access)** có kiểm soát bằng Feature Flags phía server (`ENABLE_PRODUCTION_BETA_EXPANSIONS`, `BETA_ALLOWED_RULESETS`) cho 3 gói **`expansion-1` (36 tướng)**, **`expansion-2` (40 tướng)** và **`full-expansion` (66 tướng)**, trong khi **`classic` (10 tướng)** vẫn là chế độ mặc định ổn định (`PUBLIC_RELEASE_APPROVED`) và toàn bộ 7 pool thử nghiệm nội bộ **`starter-*`** tiếp tục bị khóa cứng khỏi production.  
> **Thu thập Human Beta:** Dữ liệu người thật (mục tiêu `>= 100` trận hoàn tất) nay được thu thập trực tiếp thông qua chương trình **Production Early Access** kèm telemetry tổng hợp ẩn danh (`GET /api/boardgame/telemetry`) thay vì chặn hoàn toàn việc phát hành Beta. **Mục tiêu 100 trận người thật HIỆN CHƯA HOÀN TẤT (`0 / 100` trận người thật) và trạng thái 3 gói mở rộng là `PRODUCTION_BETA_ENABLED`, CHƯA phải `PUBLIC_RELEASE_APPROVED`.**

---

## 1. Tiến độ Thực tế & Lộ trình theo Wave / Phase

| Giai đoạn | Tên Milestone | Phạm vi Thực tế | Tiến độ Nhân vật (Cộng dồn) | Ảnh hưởng Classic | Production Ruleset |
|---|---|---|---|---|---|
| **Phase 0** *(DONE · `ce3b8c7`)* | **Catalog & Rules Specification** | Chuẩn hóa `character-catalog.json` (56 tướng mở rộng), validator, `rules-clarifications.md` (20 nhóm `UNRESOLVED`), ma trận độ khó. | `10 / 66` (Catalog: 56) | **0%** | `classic` only |
| **Phase 1** *(DONE · `01cf47c`)* | **Expansion Architecture & Engine Foundation** | `CharacterRegistry`, `RulesetRegistry`, `SkillEngine`, `VictoryEngine`, giữ bit-for-bit Classic RNG (25 SHA-256), server validation chặn expansion. | `10 / 66` | **0%** | `classic` only |
| **Phase 2 (2A–2C)** *(DONE · `dc36ec0`, `bf879e2`, `20d618f`)* | **Wave 1 — Starter Eight Gameplay & Balance** | Triển khai 8 tướng đầu tiên (`G43`, `Fiona`, `Gayle`, `Felicia`, `Wendigo`, `Wyvern`, `Victor`, `Undying`), Pending Choice + Continuation Queue + Secret Reaction P0, 10k-match sim. | `18 / 66` (`8/56` exp) | **0%** | `classic` only |
| **Phase 2.5** *(DONE · `0ef7366`..`bf1a16d`)* | **Wave 1 — Starter Eight Visual Identity** | Art Bible `HUSTVerse Midnight — Anime Noir`, 8 chân dung `1024×1536` WebP, Contact Sheet, UI/VFX & Playwright Visual QA. | `18 / 66` (`18` portraits) | **0%** | `classic` only |
| **Phase 3 (3A–3C)** *(DONE · `bcd9212`, `cb9982b`, `098b29d`)* | **Wave 2 — Starter Sixteen Gameplay, Art & Balance** | 8 tướng Wave 2 (`Elysia`, `Father Harrison`, `Gloria`, `Unchained`, `Warlock`, `Witch`, `Cindy`, `Bipolar`), 8 chân dung (`26/26`), 4P–8P DO E2E, 10k-match sim. | `26 / 66` (`16/56` exp · `26` portraits) | **0%** | `classic` only |
| **Phase 4 (4A–4D)** *(DONE · `a3979c3`..`9e498cd`)* | **Wave 3 — Starter Twenty-Six Gameplay, Art & Balance** | 10 tướng Tier-2 Wave 3 (`Fallen`, `Fea`, `Eleanor`, `Fujiko`, `Udi`, `Wrath`, `Vengeance`, `Visions`, `Cruz`, `Bryon`), 10 chân dung (`36/36`), 15k-match sim. | `36 / 66` (`26/56` exp · `36` portraits) | **0%** | `classic` only |
| **Phase 5 (5A–5E)** *(DONE · `9ffcb3e`..`5e91f04`)* | **Wave 4 — Tier-2 Completion & Tier-3 Wave (`starter-thirty-eight`)** | `HealPipeline`, `SET_REACTION_PREF`, 4 Tier-2 cuối + 8 Tier-3, 12 chân dung (`48/48`), 20k-match sim. | `48 / 66` (`38/56` exp · `48` portraits) | **0%** | `classic` only |
| **Phase 6 (6A–6E)** *(DONE · `1532dcd`..`e3dfeac`)* | **Wave 5 — Tier-3 Completion & Advanced Victory Mechanics (`starter-forty-eight`)** | `CopiedVictoryGraph`, `DamageRedirection`, `character-metadata`, `reveal-events`, `equipment-transactions`, `choice-secret-*`, 10 Tier-3 cuối, 10 chân dung (`58/58`), 25k-match sim. | `58 / 66` (`48/56` exp · `58` portraits) | **0%** | `classic` only |
| **Phase 7 (7A–7E)** *(DONE · `2c73584`..`64f5ae4`)* | **Wave 6 — Tier-4 Completion & Full 66-Character Catalog (`starter-fifty-six`)** | 6 nền tảng Tier-4 (`TurnOwnershipOverride`, `PendingResurrection`, `DynamicSkillCopy`, `DynamicAllegiance`, `MultiFactionVictory`, `GlobalAttackInterrupt`), 8 tướng Tier-4 cuối, 8 chân dung gốc (`66/66` · **113 WebP**), 30 kịch bản + real DO 4P–8P E2E, **30,000-match** sim (`0` stall/draw/leak). | **`66 / 66`** (`56/56` exp · `66/66` portraits) | **0%** | `classic` only |
| **Phase 8A** *(ACTIVE RELEASE)* | **Production Beta / Early Access Release** | Bật opt-in Production Beta có kiểm soát bằng cờ server (`ENABLE_PRODUCTION_BETA_EXPANSIONS`, `BETA_ALLOWED_RULESETS`) cho `expansion-1` (36), `expansion-2` (40), `full-expansion` (66); UI Sảnh gắn nhãn `Stable` vs `Beta` + cảnh báo cân bằng; telemetry tổng hợp ẩn danh trên SQLite DO (`GET /api/boardgame/telemetry`); runbook deploy & rollback tức thì; khóa cứng 7 pool `starter-*`. | **`66 / 66`** (`Production Beta`) | **0%** | `classic` (**Stable Default**) + `expansion-1/2/full` (**Beta**) |
| **Phase 8B+** *(NEXT — ITERATIVE BETA)* | **Human Beta Data Collection (`0 / 100`) & Balance Patches** | Tích lũy `>= 100` trận người thật hoàn tất qua Production Early Access, phân tích telemetry thực tế cho `Anathema`, `Colt`, `Dalton`, `G43 + Holy Robe`, `Voodoo`, `Undead`, `Cain`, `N.C. Soldier`, phát hành Balance & UX Patch có version, sau đó xét duyệt thăng hạng `PUBLIC_RELEASE_APPROVED`. | `66 / 66` *(0/100 human target)* | **0%** | Nâng cấp từ `PRODUCTION_BETA_ENABLED` → `PUBLIC_RELEASE_APPROVED` khi đủ dữ liệu |

---

## 2. Trạng thái Chi tiết 56 Nhân vật Mở rộng (`56/56 Implemented · Production Beta`)

- **Toàn bộ `56 / 56` nhân vật mở rộng** (`17 Hunter · 18 Shadow · 21 Neutral`; `26/26 Exp1 · 30/30 Exp2`; `4 verified + 52 house-rule-approved`) đã hoàn thiện mã nguồn server-authoritative, chân dung WebP gốc `1024×1536`, kiểm thử DO 4P–8P và mô phỏng 30,000 trận.
- Hiện khả dụng trên Production dưới nhãn **Beta (Early Access)** thông qua 3 bộ luật opt-in `expansion-1`, `expansion-2`, `full-expansion`.

---

## 3. Cổng An toàn & Trạng thái Phát hành (4 Mức Tách biệt)

1. **`IMPLEMENTED`** — Hoàn thiện mã nguồn + ảnh + unit test (trạng thái mặc định trong code khi tắt cờ Beta).
2. **`INTERNAL_VALIDATED`** — Đã qua kiểm thử DO E2E + mô phỏng số lượng lớn nội bộ (`starter-fifty-six`; luôn bị khóa khỏi production).
3. **`PRODUCTION_BETA_ENABLED`** — Mở opt-in có gắn nhãn Beta + telemetry + rollback tức thì trên production (`expansion-1`, `expansion-2`, `full-expansion` trong Phase 8A).
4. **`PUBLIC_RELEASE_APPROVED`** — Chế độ ổn định mặc định (`classic`), và là đích đến cho các gói mở rộng sau khi đạt mốc `>= 100` trận người thật + hoàn tất điều chỉnh cân bằng.
5. **Bất biến Classic:** Giữ nguyên `features/boardgame/domain/victory.ts` (`0-diff`), `25/25` SHA-256 RNG match và `0.00%` sai lệch trên 4,500 trận Classic simulation (`test/boardgame-sim.cjs`).
