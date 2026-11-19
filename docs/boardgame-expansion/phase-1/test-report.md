# Bóng Đêm KTX — Phase 1 Test & CI Verification Report

> Báo cáo kết quả kiểm thử tự động thực thi trực tiếp trên nhánh `main` sau khi hoàn tất triển khai Phase 1 (Expansion Architecture & Engine Foundation). **Không sửa đổi hay làm yếu bất kỳ assertion cũ nào.**

---

## 1. Kết quả Bộ Kiểm thử Nền tảng Phase 1 (`test/boardgame-expansion-foundation.test.cjs`)

**Tổng kết:** **10/10 PASS** (`0 fail`, `~1.19s`) — đã tích hợp trực tiếp vào `npm run test:boardgame` và CI Gate 5b.

| Mã Test | Nhóm | Nội dung kiểm chứng | Kết quả |
|---|---|---|---|
| `A1` | Registry | Lookup đủ 66 tướng (10 Classic + 56 Expansion), ID duy nhất toàn cục, đồng bộ 1-1 `EXPANSION_CHARACTER_CATALOG` với `docs/boardgame-expansion/character-catalog.json`, tất cả 56 tướng mở rộng đều `skillImpl = null`, `victoryImpl = null`, `isCharacterPlayable = false`. | ✅ PASS |
| `A2` | Registry | Từ chối trùng ID (`duplicate character id`) và lệch `entry.id !== metadata.id`. | ✅ PASS |
| `A3` | Registry | Lọc 4 ruleset (`classic`: 10/10 playable; `expansion-1`: 36 catalog / 0 playable; `expansion-2`: 40 / 0; `full-expansion`: 66 / 0); từ chối ruleset chưa mở khóa (`RULESET_UNAVAILABLE`), ruleset không hợp lệ (`INVALID_RULESET`), và chặn nhân vật chưa hoàn thiện ngay cả khi bật ruleset thử nghiệm. | ✅ PASS |
| `B1` | Engine | Phân vai deterministic cho bàn 4–8 người (đúng split `2/2/0`, `2/2/1`, `2/2/2`, `2/2/3`, `3/3/2`, 0 trùng vai); trùng khớp **25/25 SHA-256 baseline pre-Phase-1** (bit-for-bit Classic RNG); ném `BoardGameRulesetError` với mọi ruleset mở rộng/không hợp lệ. | ✅ PASS |
| `B2` | Engine | `SkillEngine` sắp xếp theo `priority ASC -> seatDistanceFromActive ASC -> handler.id ASC`, RNG deterministic qua Mulberry32, áp dụng `oncePerMatch` & `cooldownRounds`, bỏ qua sự kiện trùng `eventKey` (`skippedIdempotent: true`). | ✅ PASS |
| `B3` | Engine | Bảo vệ chống vòng lặp (`LOOP_DETECTED`), chống đệ quy vượt ngưỡng (`MAX_RECURSION_DEPTH`), và rollback nguyên tử toàn bộ `state` khi handler ném lỗi (`rolledBack: true`). | ✅ PASS |
| `B4` | Engine | `VictoryEngine` hỗ trợ đủ 7 archetypes (`VICTORY_ARCHETYPES.length === 7`), kiểm chứng `dynamic-allegiance`, kiểm chứng phát hiện chu trình đồ thị `copied-victory` (`A -> B -> A`), và tương đương 100% với `evaluateVictory(state)` của Classic trên mọi nhánh thắng. | ✅ PASS |
| `C1` | Multiplayer DO | Real 5P + 1 Spectator trên SQLite & WebSocket DO thật: chặn `POST /api/boardgame/matches` ruleset mở rộng/sai (HTTP 400); chặn non-host `BG_SET_RULESET` (`NOT_HOST`); chặn host chọn `full-expansion` (`RULESET_UNAVAILABLE`) và `'not-a-ruleset'` (`INVALID_RULESET`); chặn `BG_START_MATCH` override `expansion-2`; kiểm tra Spectator `privateView === null` và 0 secret leak trên `publicGame`; F5 reconnect giữ nguyên vai/HP; retry trùng `requestId` giữ nguyên `revision` & kết quả xúc xắc. | ✅ PASS |
| `C2` | Contracts | `validateBoardGameClientMessage` chấp nhận `BG_SET_RULESET` hợp lệ, từ chối ruleset lạ (`INVALID_RULESET`) và bác bỏ trường lạ `customRoleIds` trên `BG_START_MATCH` (chặn client tự chọn danh sách tướng). | ✅ PASS |
| `C3` | Multiplayer DO | Trận thật 8 người Classic (`3/3/2`, 8 vai duy nhất) + mô phỏng dữ liệu SQLite live v4 trước Phase 1 (xóa `rulesetId` & `catalogVersion` trong `game_state_json`) xác minh `BG_REQUEST_SYNC` khôi phục sạch sẽ không đóng ván đang chạy. | ✅ PASS |

---

## 2. Kết quả Toàn bộ CI Verification Gates (Gates 1–8)

| Gate CI | Lệnh thực thi | Kết quả | Chi tiết chính |
|---|---|---|---|
| **Catalog Validator** | `node scripts/validate-character-catalog.cjs` | ✅ PASS | 56 expansion roles (26 + 30), 4 `verified` / 52 `needs-clarification`, 0 trùng ID, 0 va chạm Classic. |
| **Gate 1 — Typecheck** | `npm run typecheck` | ✅ PASS | 0 lỗi trên cả `tsc --noEmit` (Frontend) & `tsc --noEmit -p worker/tsconfig.json` (Cloudflare Worker). |
| **Gate 2 — HSK Engine** | `npm run test:learn` | ✅ PASS | 45/45 unit tests PASS. |
| **Gate 3 — Shared Contracts** | `npm run test:contracts` | ✅ PASS | 5/5 unit tests PASS. |
| **Gate 3b — World/Avatar/UI/Study** | `npm run test:world && npm run test:avatar && npm run test:ui && npm run test:study` | ✅ PASS | Toàn bộ unit tests PASS (bao gồm 25/25 `boardgame-vfx.test.cjs`). |
| **Gate 4 — Campus Nav** | `npm run test:nav` | ✅ PASS | 4/4 chặng di chuyển A* PASS. |
| **Gate 5 — MP Protocol** | `npm run test:mp` | ✅ PASS | 12/12 kịch bản WebSocket protocol PASS. |
| **Gate 5b — BoardGame + Sim** | `npm run test:boardgame` | ✅ PASS | Catalog validator + 41/41 tests (31 Classic + 10 Phase 1) + **4,500-match Classic simulation** PASS (`0 stalled`, `0 draws`, `0 bot violations`). |
| **Gate 6 — Static Export** | `npm run build` | ✅ PASS | Next.js 14.2.5 static export (`out/`) thành công, 0 lỗi lint/type. |
| **Gate 7 — PR10B Browser Gate** | `npm run test:pr10b` | ✅ PASS | 11/11 Library presets + mobile viewport + 360° camera sweep + 33 rapid floor transitions PASS. |
| **Gate 8 — BoardGame E2E (`bg1-smoke`)** | `node test/boardgame-bg1-smoke.cjs` | ✅ PASS | Desktop + Mobile + 3D isolation (`lingeringBoard: 0`, `lingeringVfxCanvas: 0`). |
| **Gate 8 — BoardGame E2E (`e2e-01-04`)** | `node test/boardgame-e2e.cjs --shard=e2e-01-04` | ✅ PASS | 4P Desktop+Mobile full lifecycle, 17 mobile actions, 835 frames checked, postcard 1200×675. |
| **Gate 8 — BoardGame E2E (`e2e-02`)** | `node test/boardgame-e2e.cjs --shard=e2e-02` | ✅ PASS | 8P Table 2 + 9th Spectator P0 isolation, 8 turns completed. |
| **Gate 8 — BoardGame E2E (`e2e-03`)** | `node test/boardgame-e2e.cjs --shard=e2e-03` | ✅ PASS | 5-checkpoint F5 reload reconnect matrix PASS. |
| **Gate 8 — BoardGame E2E (`e2e-05-06`)** | `node test/boardgame-e2e.cjs --shard=e2e-05-06` | ✅ PASS | 2-match concurrent isolation + 4/4 security probes PASS. |
