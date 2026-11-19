# Bóng Đêm KTX — Phase 1 Ruleset Matrix

> Bảng đặc tả chính thức 4 bộ luật được quản lý tập trung bởi `DEFAULT_RULESET_REGISTRY` trong [`features/boardgame/domain/registry.ts`](../../../features/boardgame/domain/registry.ts) và đồng bộ giữa Frontend, Shared Contracts và Cloudflare Worker.

---

## 1. Ma trận 4 Rulesets (Phase 1 State)

| `rulesetId` | Tên hiển thị | Gói nhân vật bao gồm | Tổng tướng catalog | Tướng playable Phase 1 | Trạng thái UI (`availability`) | Cho phép Production (`enabledInProduction`) | Phản hồi Server khi yêu cầu tạo/đổi/bắt đầu |
|---|---|---|---:|---:|---|---|---|
| **`classic`** | Classic (Bản Gốc · 10 tướng) | `['classic']` | **10** (3H / 3S / 4W) | **10** | `available` (**Available**) | **`true`** | ✅ Chấp nhận & khóa `rulesetId = 'classic'` + `catalogVersion = '2026.11-p1'` |
| **`expansion-1`** | Expansion 1 (Classic + 26 tướng) | `['classic', 'expansion-1']` | **36** (11H / 12S / 13W) | **0** | `coming-soon` (**Coming Soon**) | **`false`** | ⛔ Từ chối với `RULESET_UNAVAILABLE` (HTTP 400 / WS `BG_ERROR`) |
| **`expansion-2`** | Expansion 2 (Classic + 30 tướng) | `['classic', 'expansion-2']` | **40** (12H / 12S / 16W) | **0** | `coming-soon` (**Coming Soon**) | **`false`** | ⛔ Từ chối với `RULESET_UNAVAILABLE` (HTTP 400 / WS `BG_ERROR`) |
| **`full-expansion`** | Full Expansion (Toàn bộ 66 tướng) | `['classic', 'expansion-1', 'expansion-2']` | **66** (20H / 21S / 25W) | **0** | `coming-soon` (**Coming Soon**) | **`false`** | ⛔ Từ chối với `RULESET_UNAVAILABLE` (HTTP 400 / WS `BG_ERROR`) |
| *(Bất kỳ giá trị lạ nào)* | — | — | — | — | — | — | ⛔ Từ chối với `INVALID_RULESET` (HTTP 400 / WS `BG_ERROR`) |

---

## 2. Phân bổ Phe theo Số người chơi (4–8 Người, Bất biến cho Mọi Ruleset)

Được giữ nguyên 100% qua `getRoleDistribution(playerCount)` trong `features/boardgame/domain/roles.ts`:

| Số người chơi | Đội Săn Đêm (Hunter) | Hội Bóng Đêm (Shadow) | Kẻ Độc Hành (Neutral / Wanderer) | Tổng |
|---:|---:|---:|---:|---:|
| **4 người** | 2 | 2 | 0 | 4 |
| **5 người** | 2 | 2 | 1 | 5 |
| **6 người** | 2 | 2 | 2 | 6 |
| **7 người** | 2 | 2 | 3 | 7 |
| **8 người** | 3 | 3 | 2 | 8 |

---

## 3. Kiểm soát Quyền & Xác thực tại Server

| Hành động | Điểm kiểm tra | Quyền yêu cầu | Điều kiện trạng thái | Hành vi khi vi phạm |
|---|---|---|---|---|
| `POST /api/boardgame/matches` | `worker/src/boardgame-router.ts` | Bất kỳ client hợp lệ | — | HTTP `400` kèm `code: 'INVALID_RULESET' \| 'RULESET_UNAVAILABLE'` |
| `POST /api/boardgame/join-table` | `worker/src/boardgame-router.ts` | Bất kỳ client hợp lệ | — | HTTP `400` kèm `code: 'INVALID_RULESET' \| 'RULESET_UNAVAILABLE'` |
| `BG_SET_RULESET` (WS) | `shared/contracts/boardgame.ts` + `BoardGameRoom.handleSetRuleset` | **Chỉ Host** (`host_player_id`) | Lobby (`CREATED \| WAITING \| READY_CHECK \| FINISHED`) | `NOT_HOST`, `INVALID_ACTION`, `INVALID_RULESET`, hoặc `RULESET_UNAVAILABLE` |
| `BG_START_MATCH` (WS) | `BoardGameRoom.handleStartMatch` + `createInitialGameState` | **Chỉ Host** | Đủ 4–8 người ngồi & sẵn sàng | `RULESET_UNAVAILABLE` / `INVALID_RULESET`; giữ nguyên Lobby, không chuyển `PLAYING` |
| Gửi danh sách tướng tùy chỉnh từ Client | `validateBoardGameClientMessage` (`CLIENT_MSG_ALLOWED_KEYS`) | **Cấm tuyệt đối** | Mọi trạng thái | `INVALID_ACTION` (unknown key rejected) |
