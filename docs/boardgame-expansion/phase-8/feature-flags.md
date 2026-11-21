# Bóng Đêm KTX — Production Beta Feature Flags Specification

> **Nguyên tắc Cốt lõi:** Mọi cờ Production Beta đều **MẶC ĐỊNH TẮT (`default-off`) trong mã nguồn** và **do máy chủ Cloudflare Worker quyết định tuyệt đối (server-authoritative)**. Client không bao giờ có quyền tự mở khóa bộ luật hay gửi danh sách nhân vật tùy ý.

---

## 1. Biến Môi trường Kiểm soát trên Cloudflare Worker

| Biến Môi trường | Giá trị Mặc định trong Mã nguồn | Giá trị Production Beta (Phase 8A) | Tác dụng |
|---|---|---|---|
| `ENABLE_PRODUCTION_BETA_EXPANSIONS` | `""` / `"0"` (**TẮT**) | `"1"` | Công tắc tổng cho phép các bộ luật thuộc allowlist Beta. Đặt `"0"` hoặc xóa biến sẽ **ngay lập tức chặn tạo phòng Beta mới** trong khi vẫn giữ `classic` và bảo toàn các trận Beta đang chạy. |
| `BETA_ALLOWED_RULESETS` | `""` (rỗng) | `"expansion-1,expansion-2,full-expansion"` | Danh sách allowlist phân tách bằng dấu phẩy; cho phép bật/tắt độc lập từng gói trong đúng 3 giá trị hợp lệ: `expansion-1`, `expansion-2`, `full-expansion`. Mọi giá trị ngoài danh sách này (bao gồm toàn bộ `starter-*`) bị bỏ qua hoàn toàn. |
| `ALLOW_EXPERIMENTAL_RULESETS` | `""` (**KHÔNG đặt trên production**) | *(Không cấu hình)* | Dành riêng cho test/alpha harness nội bộ (`starter-four` .. `starter-fifty-six`). **Tuyệt đối không đặt trên `worker/wrangler.toml`.** |
| `BETA_TELEMETRY_TOKEN` *(tùy chọn)* | `""` | *(Tùy chọn qua Cloudflare Secret)* | Nếu cấu hình, yêu cầu header `Authorization: Bearer <token>` hoặc `X-Beta-Telemetry-Token` để đọc mục `perCharacterStats` từ `GET /api/boardgame/telemetry`. |

---

## 2. Phân tách Trạng thái Phát hành (`BoardGameRulesetReleaseStatus`)

Mã nguồn trong [`shared/contracts/boardgame.ts`](../../../shared/contracts/boardgame.ts) và [`features/boardgame/domain/registry.ts`](../../../features/boardgame/domain/registry.ts) tách biệt rõ 4 trạng thái — tuyệt đối không đánh đồng Beta với sản phẩm đã kiểm chứng người thật:

1. `IMPLEMENTED`: Đã đủ mã nguồn, chân dung gốc và unit test (`DEFAULT_RULESET_DEFINITIONS` mặc định khi tắt cờ).
2. `INTERNAL_VALIDATED`: Đã qua mô phỏng nội bộ & DO E2E (`starter-fifty-six`).
3. `PRODUCTION_BETA_ENABLED`: Được bật opt-in trên production qua `ENABLE_PRODUCTION_BETA_EXPANSIONS=1` + `BETA_ALLOWED_RULESETS` (hiển thị nhãn **Beta** kèm cảnh báo điều chỉnh cân bằng).
4. `PUBLIC_RELEASE_APPROVED`: Chỉ cấp cho `classic` (10 tướng); các gói mở rộng chỉ chuyển sang trạng thái này sau khi tích lũy đủ dữ liệu người thật (mục tiêu `>= 100` trận hoàn tất) và chốt cân bằng.

---

## 3. Đồng bộ Khả năng Server ↔ Frontend

- **REST:** `GET /api/boardgame/rulesets` trả về duy nhất 4 gói công khai (`classic`, `expansion-1`, `expansion-2`, `full-expansion`) kèm `status: 'stable' | 'beta' | 'unavailable'`, `releaseStatus`, `selectable`, `expectedCharacterCount`. Không bao giờ liệt kê `starter-*`.
- **WebSocket:** Mỗi gói `BG_STATE_SYNC` đính kèm `betaEnabled` và `availableRulesets` từ cấu hình thực tế của Worker.
- **UI Sảnh (`BoardGameLobby.tsx`):** Khởi tạo an toàn ở trạng thái default-off (chỉ `classic` chọn được), sau đó tự đồng bộ ngay với `/api/boardgame/rulesets` và `BG_STATE_SYNC`. Nếu server tắt một gói Beta, nút tương ứng tự chuyển sang trạng thái `Unavailable` (`disabled`).

---

## 4. Cổng Xác thực Server Không Bị Bỏ Qua

Ngay cả khi cờ Production Beta đang bật, mọi yêu cầu (`POST /api/boardgame/matches`, `POST /api/boardgame/join-table`, `POST /__init`, `BG_SET_RULESET`, `BG_START_MATCH`, `createInitialGameState`) vẫn bắt buộc đi qua đủ toàn bộ cổng an toàn:
- Playability gate (`isCharacterPlayable`), đủ số tướng theo gói (`36 / 40 / 66`), đủ tỷ lệ phe `4P–8P`, loại cứng `exp2_nc_soldier` khỏi bàn `5P`, RNG tác quyền server, phân quyền Host-only & khóa đổi bộ luật sau khi bắt đầu, và bảo mật P0 vai ẩn/Spectator.
