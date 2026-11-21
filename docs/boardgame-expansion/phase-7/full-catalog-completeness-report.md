# Bóng Đêm KTX — Full 66-Character Catalog Completeness & Pack Availability Audit

> **Phiên bản Catalog:** `BOARD_GAME_CATALOG_VERSION = '2026.11-p7b'`  
> **Ngày kiểm toán:** 2026-11-21 (Phase 7E — Final Catalog Audit, Section 28)  
> **Kết luận ngắn gọn:** **66/66 nhân vật** đã hoàn tất triển khai kỹ thuật và kiểm định nội bộ (`56/56` nhân vật mở rộng + `10/10` Classic · **66/66 chân dung WebP gốc** · **34 loại Pending Choice**). **Production vẫn khóa cứng `classic`-only** — hoàn tất kỹ thuật **KHÔNG** tự động phê duyệt mở khóa công khai!

---

## 1. Bảng Kiểm toán 14 Tiêu chí Bắt buộc (Section 28)

| # | Tiêu chí Kiểm toán | Kết quả Thực tế | Nguồn Xác minh |
|---:|---|---|---|
| 1 | **56/56 Expansion characters registered** | **56 / 56** (`17 Hunter · 18 Shadow · 21 Neutral`) | `node scripts/validate-character-catalog.cjs` |
| 2 | **66/66 cumulative playable (internal experimental)** | **66 / 66** (`20 Hunter · 21 Shadow · 25 Neutral`) trong `starter-fifty-six` | `DEFAULT_RULESET_REGISTRY.validateRulesetForMatch('starter-fifty-six', 8, { allowExperimental: true })` |
| 3 | **66/66 portrait mappings & unique files** | **66 / 66** ảnh WebP `1024×1536` (`64` tại `public/assets/boardgame/roles/` + `2` Classic gốc tại `public/assets/boardgame/prototype/`; **66/66 SHA-256 duy nhất**; tổng **113 WebP assets** Midnight Noir) | `test/boardgame-phase7c-portraits.test.cjs` + [`asset-manifest.json`](./asset-manifest.json) |
| 4 | **26/26 Expansion 1 roles implemented** | **26 / 26** (`8 Hunter · 9 Shadow · 9 Neutral`; `0` missing) | `validatePackInternally('expansion-1')` + `validate-character-catalog.cjs` |
| 5 | **30/30 Expansion 2 roles implemented** | **30 / 30** (`9 Hunter · 9 Shadow · 12 Neutral`; `0` missing) | `validatePackInternally('expansion-2')` + `validate-character-catalog.cjs` |
| 6 | **All SkillEngine bindings executable** | **66 / 66** (`10` Classic adapter + `56` `ALL_EXPANSION_SKILL_BINDINGS`, không có `null`) | `DEFAULT_CHARACTER_REGISTRY` + `test/boardgame-phase7b.test.cjs` |
| 7 | **All VictoryEngine bindings executable** | **66 / 66** (`10` Classic + `56` `ALL_EXPANSION_VICTORY_BINDINGS`, không có `null`) | `DEFAULT_CHARACTER_REGISTRY` + `test/boardgame-phase7b.test.cjs` |
| 8 | **All house-rule decisions documented** | `verified = 4` (`Wendigo`, `G43`, `Fiona`, `Wyvern`), `house-rule-approved = 52`, `needs-clarification = 0`, `unknown = 0` — mọi house rule đều ghi nguồn & ranh giới rõ trong `phase-2..7/rules-decisions.md` | `docs/boardgame-expansion/character-catalog.json` + `phase-7/rules-decisions.md` |
| 9 | **No missing critical runtime implementations** | 6/6 primitive Tier-4 (`turn-ownership`, `pending-resurrection`, `dynamic-skill-copy`, `dynamic-allegiance`, `multi-faction-victory`, `global-attack-interrupt`) + 34 PendingChoice + 66/66 `SKILL_COPY_CAPABILITY_MATRIX` hoàn thiện | `phase-7a-engine-report.md` + `phase-7b-character-implementation.md` |
| 10 | **No duplicated character IDs** | `CharacterRegistry` chặn cứng trùng ID; `66` ID duy nhất trên toàn bộ catalog | `validate-character-catalog.cjs` + `registry.ts` |
| 11 | **No missing card metadata** | 48 lá bài Classic nguyên vẹn, `equipmentConservationViolations = 0` trên 30,000 trận | `test/boardgame-engine.test.cjs` + `starter-fifty-six-sim-data.json` |
| 12 | **No invalid role-dealing combinations** | Đủ pool cho mọi quy mô `4P–8P`; `exp2_nc_soldier` bị loại cứng ở bàn `5P` (`ncSoldier5pDealtCheck = 0 / 6,000`) | `state-machine.ts` + `starter-fifty-six-sim-data.json` |
| 13 | **All Tier-4 requirements enforced** | 30/30 kịch bản liên nhân vật + real DO 4P–8P E2E + hibernation + 30,000 trận `0` stall / `0` privacy leak | `test/boardgame-phase7d-integration.test.cjs` + `scripts/sim-starter-fifty-six.cjs` |
| 14 | **No accidental public enablement** | `activeInGameplay = false` cho toàn bộ 56 tướng mở rộng; `enabledInProduction = false` cho mọi ruleset trừ `classic` | `registry.ts` + `P7B-9` + `P7C-5` + `P7D-4` |

---

## 2. Phân tách Ba Trạng thái Phát hành & Kiểm định Gói Mở rộng (Pack Availability Matrix)

Theo yêu cầu nghiêm ngặt của Section 28, hệ thống tách bạch ba mức trạng thái (`RulesetReleaseStatus` trong [`registry.ts`](../../../features/boardgame/domain/registry.ts)):
1. **`IMPLEMENTED`** — Hoàn thiện mã nguồn, tài sản đồ họa và unit test cho đủ số tướng của gói.
2. **`INTERNAL_VALIDATED`** — Đã vượt qua kiểm thử tích hợp DO 4P–8P, bảo mật và mô phỏng số lượng lớn nội bộ.
3. **`PUBLIC_RELEASE_APPROVED`** — Đã vượt qua **Human Beta Playtest** thực tế và được phê duyệt bật công khai trên Production.

| Ruleset ID | Thành phần & Số tướng | `releaseStatus` | `enabledInProduction` | `availability` | Kiểm định Nội bộ (`validatePackInternally` / `allowExperimental`) | Cổng Chặn Production (`ALLOW_EXPERIMENTAL_RULESETS` tắt) |
|---|---|---|---:|---|---|---|
| **`classic`** | 10 Classic (`3H/3S/4N`) | **`PUBLIC_RELEASE_APPROVED`** | **`true`** | `available` | PASS (4,500 trận `0.00%` diff, 25/25 RNG) | **CHO PHÉP (Production mặc định)** |
| **`starter-fifty-six`** | 66 Full (`20H/21S/25N`) | **`INTERNAL_VALIDATED`** | **`false`** | `experimental` | PASS (`66/66`, 30,000 trận, DO 4P–8P E2E) | **CHẶN (`HTTP 400 / RULESET_UNAVAILABLE`)** |
| **`expansion-1`** | 10 Classic + 26 Exp1 = **36** (`11H/12S/13N`) | **`IMPLEMENTED`** | **`false`** | `coming-soon` | PASS nội bộ (`36/36`, `missingIds = []`) | **CHẶN (`HTTP 400 / RULESET_UNAVAILABLE`)** |
| **`expansion-2`** | 10 Classic + 30 Exp2 = **40** (`12H/12S/16N`) | **`IMPLEMENTED`** | **`false`** | `coming-soon` | PASS nội bộ (`40/40`, `missingIds = []`) | **CHẶN (`HTTP 400 / RULESET_UNAVAILABLE`)** |
| **`full-expansion`** | 10 Classic + 56 Exp = **66** (`20H/21S/25N`) | **`IMPLEMENTED`** | **`false`** | `coming-soon` | PASS nội bộ (`66/66`, `missingIds = []`) | **CHẶN (`HTTP 400 / RULESET_UNAVAILABLE`)** |
| `starter-four` .. `starter-forty-eight` | Các wave thử nghiệm lịch sử (`14..58`) | *(Experimental)* | **`false`** | `experimental` | PASS hồi quy nội bộ | **CHẶN (`HTTP 400 / RULESET_UNAVAILABLE`)** |

---

## 3. Phân bổ Tổng thể Tài nguyên Mỹ thuật Midnight Noir (`113` WebP Assets)

- **Chân dung Nhân vật (`66`):** `64` tệp trong `public/assets/boardgame/roles/` + `2` tệp Classic gốc trong `public/assets/boardgame/prototype/` (`role-hunter.webp`, `role-shadow.webp` — được ánh xạ chính xác trong `MIDNIGHT_CHARACTER_ART`), **66/66 SHA-256 duy nhất**, `1024×1536` (`2:3`).
- **Thẻ bài (`40`):** `37` tệp trong `public/assets/boardgame/cards/` + `3` tệp trong `public/assets/boardgame/prototype/`.
- **Địa điểm KTX (`6`):** `6` tệp trong `public/assets/boardgame/locations/`.
- **Mặt lưng thẻ (`1`):** `1` tệp trong `public/assets/boardgame/prototype/`.
- **Tổng cộng:** `66 + 40 + 6 + 1 = 113` tệp WebP thực tế trên đĩa.
