# Bóng Đêm KTX — Phase 1 Migration & Backward Compatibility Plan

> **Mục tiêu tuyệt đối:** Triển khai Phase 1 lên production (Cloudflare Worker + Vercel Frontend) mà **không làm gián đoạn, mất kết nối hay đóng bất kỳ trận Classic v4 nào đang diễn ra**.

---

## 1. Chính sách Phiên bản Giao thức & Luật (`Protocol / Ruleset Version`)

| Hằng số | Trước Phase 1 | Sau Phase 1 | Lý do giữ nguyên |
|---|---|---|---|
| `BOARD_GAME_RULESET_VERSION` | `4` | **`4` (Giữ nguyên)** | `worker/src/boardgame-room.ts` (`loadEngineState`) sẽ đưa ván đang chơi qua `adaptLegacyEngineState` (đóng ván cũ) nếu `rulesetVersion !== 4`; client cũ cũng từ chối kết nối nếu nhận `rulesetVersion > 4`. |
| `BOARD_GAME_PROTOCOL_VERSION` | `1` | **`1` (Giữ nguyên)** | Mọi thay đổi DTO trong Phase 1 đều là **additive & optional** (`rulesetId?`, `catalogVersion?`, `BG_SET_RULESET`). Client đang mở tab trước khi deploy vẫn đọc `BG_STATE_SYNC` bình thường. |
| `BOARD_GAME_CATALOG_VERSION` | *(chưa có)* | **`'2026.11-p1'`** | Hằng số mới xác định phiên bản catalog được server khóa tại thời điểm `BG_START_MATCH`. |

---

## 2. Migration Cơ sở dữ liệu SQLite Durable Object (`BoardGameRoom`)

Trong `worker/src/boardgame-room.ts` (`ensureSchema()`):

1. **Bảng `matches`:**
   - Thêm 2 cột mới vào `CREATE TABLE IF NOT EXISTS matches (...)`:
     - `ruleset_id TEXT NOT NULL DEFAULT 'classic'`
     - `catalog_version TEXT`
   - Đối với các Durable Object đã tồn tại trên production trước khi deploy, thực thi migration idempotent an toàn trong `try { ... } catch {}`:
     ```sql
     ALTER TABLE matches ADD COLUMN ruleset_id TEXT NOT NULL DEFAULT 'classic';
     ALTER TABLE matches ADD COLUMN catalog_version TEXT;
     ```
2. **Bảng `directory_matches`:**
   - Thêm cột `ruleset_id TEXT NOT NULL DEFAULT 'classic'` vào `CREATE TABLE` kèm `ALTER TABLE directory_matches ADD COLUMN ruleset_id TEXT NOT NULL DEFAULT 'classic'` trong `try/catch`.

---

## 3. Tương thích State Đang Chạy (`game_state_json` & Reconnect/F5)

Khi một trận Classic v4 đã khởi tạo **trước thời điểm deploy Phase 1** tỉnh dậy từ WebSocket Hibernation hoặc có người chơi nhấn F5:

1. `loadEngineState(match, playerRows)` đọc `game_state_json` có `rulesetVersion === 4` (không rơi vào `adaptLegacyEngineState`).
2. Các trường mới được backfill an toàn tại chỗ trong bộ nhớ mà không thay đổi bất kỳ giá trị game nào:
   ```ts
   if (!engineState.rulesetId) {
     engineState.rulesetId = sanitizeBoardGameRulesetId(match.ruleset_id); // 'classic'
   }
   if (!engineState.catalogVersion) {
     engineState.catalogVersion = match.catalog_version ?? BOARD_GAME_CATALOG_VERSION;
   }
   ```
3. `buildStateSyncPayload` trả về `BG_STATE_SYNC` chứa đầy đủ `publicGame` + `privateView` + `rulesetId: 'classic'`, giữ nguyên vai trò, máu, bài, vị trí và lịch sử của người chơi.
4. Kịch bản này đã được kiểm chứng tự động bằng test **`C3`** trong `test/boardgame-expansion-foundation.test.cjs` (xóa trực tiếp `rulesetId` và `catalogVersion` trong SQLite `game_state_json` rồi gọi `BG_REQUEST_SYNC`).

---

## 4. Chiến lược Rollout & Rollback An toàn

- **Thứ tự deploy:** Worker (`hust-hsk-rooms`) và Frontend (`hustverse.vercel.app`) tương thích hai chiều ở mọi thời điểm:
  - *Old Frontend + New Worker:* Old frontend không gửi `rulesetId` -> Worker mặc định `'classic'`, phớt lờ 2 trường optional mới trong `BG_STATE_SYNC`.
  - *New Frontend + Old Worker:* New frontend nhận `BG_STATE_SYNC` thiếu `rulesetId` -> `sanitizeBoardGameRulesetId(undefined)` mặc định `'classic'`; nút chọn expansion đã khóa `disabled` sẵn ở UI.
- **Rollback:** Nếu cần revert commit Phase 1, các cột `ruleset_id` / `catalog_version` trong SQLite và khóa JSON thừa trong `game_state_json` bị phiên bản cũ bỏ qua hoàn toàn mà không gây lỗi parse hay SQL error.
