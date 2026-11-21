# Bóng Đêm KTX — Production Beta Telemetry & Observability Specification

> **Mục tiêu:** Theo dõi sức khỏe vận hành, mức độ đón nhận từng gói Beta và cân bằng nhân vật thực tế với chi phí nhẹ (SQLite Durable Object + Cloudflare structured JSON logs), đồng thời **giữ vững tuyệt đối chuẩn bảo mật P0 vai ẩn và không thu thập PII**.

---

## 1. Danh mục Chỉ số Được Ghi nhận (`GET /api/boardgame/telemetry`)

### 1.1. Tổng quan Vòng đời Trận đấu (`summary`)
- `activeMatchesNow`: Số phòng đang mở (`CREATED` / `WAITING` / `READY_CHECK` / `STARTING` / `PLAYING`).
- `matchesCreated`, `matchesStarted`, `matchesCompleted`, `matchesAbandoned`.
- `avgMatchDurationMs`: Thời lượng trung bình của các trận đã hoàn tất (`duration_ms_sum / duration_ms_count`).
- `humanPlaytestTargetMatches` (`100`) & `humanPlaytestProgressCompleted` (số trận thực sự hoàn tất — chỉ tính trận đi đến `FINISHED`).

### 1.2. Phân bổ Ruleset, Sĩ số & Chiến thắng
- `rulesetPopularity.created` & `rulesetPopularity.completed` (theo `classic`, `expansion-1`, `expansion-2`, `full-expansion`).
- `playerCountDistribution` (`4`, `5`, `6`, `7`, `8` người).
- `victoryDistribution` (`lantern-guard`, `mist-order`, `wanderer-solo`, `wanderer`, `multi-faction`, `none`).

### 1.3. Vận hành & Độ ổn định (`operational`)
- `disconnections`, `reconnectAttempts`.
- `invalidActionAttempts`.
- `pendingChoiceTimeouts`, `turnTimeouts`.
- `engineErrors`, `workerErrors`, `unhandledExceptions`.
- `stateRestoreFailures` (phát hiện khi `game_state_json` bị lỗi định dạng lúc khôi phục).
- `unexpectedMatchEndings` (trận kết thúc không có người thắng hoặc chạm trần vòng `maxRounds`).

### 1.4. Thống kê Nhân vật Sau Trận (`perCharacterStats`)
- Chỉ được ghi nhận **SAU KHI** trận đạt trạng thái `FINISHED` (idempotent qua `boardgame_telemetry_recorded_matches`, sử dụng mã băm ẩn danh `tm_<sha256>`).
- Lưu tổng cộng dồn theo `roleId`: `appearances`, `wins`, `winRatePct`, `survivals`, `skillActivations`.
- Hoàn toàn **không** lưu tên người chơi, `playerId`, `matchId`, hay vai trò của bất kỳ trận đang diễn ra nào.

---

## 2. Bảo vệ Quyền riêng tư, Lưu trữ & Phân quyền Truy cập

| Quy tắc | Thực thi Thực tế trong Mã nguồn |
|---|---|
| **Không log `reconnectToken` / `tokenHash`** | Bị loại tuyệt đối khỏi whitelist của [`worker/src/boardgame-observability.ts`](../../../worker/src/boardgame-observability.ts) và mọi bảng telemetry. |
| **Không lộ vai ẩn hay thông tin điều tra bí mật** | `CHOICE_TIMEOUT` trên secret choice chỉ log `pendingChoiceKind: 'secret'` và ẩn `playerId`; bảng `boardgame_telemetry_roles` chỉ cập nhật sau khi trận đã `FINISHED` (khi toàn bộ vai đã lật công khai). |
| **Không lưu tên/MSSV/PII người chơi trong telemetry** | Khóa chống ghi trùng dùng `SHA-256` ẩn danh (`tm_<hex>`); regex `/\b\d{8}\b/g` tiếp tục lọc sạch MSSV 8 chữ số trên mọi structured log. |
| **Kiểm soát truy cập tùy chọn** | Nếu đặt Cloudflare Secret `BETA_TELEMETRY_TOKEN`, mục `perCharacterStats` chỉ trả về khi request có `Authorization: Bearer <token>` hoặc `X-Beta-Telemetry-Token`. |
| **Chính sách lưu giữ (Retention)** | Mục tiêu lưu giữ dữ liệu vận hành Beta trong **90 ngày** (`retentionDays: 90`); toàn bộ lưu dạng bộ đếm tổng hợp nhẹ (< 50 KB SQLite). |

---

## 3. Lệnh Xem Báo cáo Telemetry Cho Vận hành

```bash
# Xem báo cáo dạng bảng dễ đọc từ production
npm run telemetry:beta

# Xuất JSON thô cho phân tích hoặc đối chiếu trước/sau balance patch
node scripts/review-beta-telemetry.cjs --json

# Nếu cấu hình BETA_TELEMETRY_TOKEN trên Cloudflare Worker
BETA_TELEMETRY_TOKEN=<token> npm run telemetry:beta
```
