# Bóng Đêm KTX v3.1 — Sổ tay Vận hành, Triển khai Staging & Rollback Runbook

> **Dự án:** HUSTVerse — Bách Khoa 3D (`haianhant/hust-hsk`)  
> **Thành phần:** Cloudflare Worker (`worker/`) + Next.js Static Export Frontend (Vercel)  
> **Trạng thái hiện tại:** Đã kiểm chứng dry-run bundle & cấu hình `[env.staging]` cục bộ; thao tác deploy lên tài khoản Cloudflare / Vercel thật thuộc bước vận hành bên ngoài có xác thực API token.

---

## 1. Cấu trúc Môi trường & Tương thích CI/CD

- **Production Worker (`[main]` mặc định):** `name = "hust-hsk-rooms"` trong `worker/wrangler.toml` (dòng `1–19`), giữ nguyên 100% migration `v1` (`HskRoom`) và `v2` (`BoardGameRoom`) để tương thích `worker/scripts/deploy-ci.mjs`.
- **Staging Worker (`[env.staging]`):** `name = "hust-hsk-rooms-staging"`, `ENVIRONMENT = "staging"`, khai báo đầy đủ binding `HSK_ROOM`, `BOARD_GAME_ROOM` và `[[env.staging.migrations]]` (`v1`, `v2`).
- **Quy tắc bất biến `worker/wrangler.toml`:** `worker/scripts/deploy-ci.mjs` (`extractBaseToml`) cắt file tính tới dòng `[[migrations]]` đầu tiên, do đó mọi cấu hình `[env.staging]` nằm bên dưới dòng `19` sẽ **không ảnh hưởng** script deploy production tự động khi CI chạy trên `main`.

---

## 2. Quy trình Triển khai Staging (`OPS-02` / `OPS-03`)

### Bước 1: Kiểm tra Dry-run trước khi đụng hạ tầng thật
```bash
cd worker
npx wrangler deploy --dry-run --env staging --outdir /tmp/wrangler-staging-dryrun
rm -rf /tmp/wrangler-staging-dryrun
```

### Bước 2: Triển khai Cloudflare Worker Staging (Yêu cầu `CLOUDFLARE_API_TOKEN`)
```bash
cd worker
npx wrangler deploy --env staging
```
Kiểm tra sức khỏe ngay lập tức:
```bash
curl -fsS https://hust-hsk-rooms-staging.<account-subdomain>.workers.dev/api/boardgame/health
```
Kỳ vọng HTTP `200` với payload:
```json
{
  "ok": true,
  "component": "boardgame",
  "env": "staging",
  "protocolVersion": 1,
  "rulesetVersion": 3,
  "metrics": { "counts": { ... }, "lastEventAtMs": ... }
}
```
Lưu ý: **Không bật** biến `ALLOW_SHORT_TURN_TIMEOUT` trên staging hay production để máy chủ luôn kẹp `turnTimeoutMs` trong `[15_000, 90_000]` ms.

### Bước 3: Triển khai Vercel Preview cho Frontend
1. Trỏ biến môi trường Preview trên Vercel:
   - `NEXT_PUBLIC_MP_WS_URL = wss://hust-hsk-rooms-staging.<account-subdomain>.workers.dev/ws`
2. Xác nhận origin Preview của Vercel khớp mẫu `^https:\/\/hust[a-z0-9-]*\.vercel\.app$` tại `resolveAllowedBoardGameOrigin()` (`worker/src/boardgame-router.ts`).
3. Thực hiện smoke-test tạo phòng từ trình duyệt -> xác nhận `POST /api/boardgame/matches`, `GET /api/boardgame/matches`, và nối WS `wss://.../ws/boardgame`.

---

## 3. Quan trắc Log & Metrics (`Observability`)

Mọi sự kiện được phát qua `worker/src/boardgame-observability.ts` dưới dạng 1 dòng JSON thuần (`component: "boardgame"`):
- **Vòng đời phòng:** `MATCH_CREATED`, `PLAYER_JOINED`, `PLAYER_RECONNECTED`, `PLAYER_DISCONNECTED`, `MATCH_STARTED`, `MATCH_FINISHED`, `MATCH_CLEANED_UP`.
- **Tương tác & Hết giờ:** `ACTION_APPLIED`, `ACTION_REJECTED`, `TURN_TIMEOUT`.
- **An ninh & Giới hạn tần suất:** `ORIGIN_REJECTED`, `RATE_LIMITED`, `WEBSOCKET_ERROR`.

Bộ lọc kiểm tra log trực tiếp trên Wrangler:
```bash
npx wrangler tail --env staging --format json | jq 'select(.component == "boardgame")'
```
Cảnh báo cần chú ý khi vận hành:
- `ACTION_REJECTED` hoặc `WEBSOCKET_ERROR` tăng bất thường → kiểm tra lệch phiên bản client/server (`protocolVersion` / `rulesetVersion`).
- `ORIGIN_REJECTED` tăng → kiểm tra domain Vercel preview mới hay traffic lạ.
- `RATE_LIMITED` (`action-burst` hoặc `join-burst`) → kiểm tra hành vi spam từ một session/IP.

---

## 4. Tương thích SQLite Durable Object & Nâng cấp Từ Bản Cũ

- Bảng SQLite của `BoardGameRoom` giữ nguyên 4 bảng: `matches`, `match_players`, `processed_requests`, `directory_matches`.
- Các ván v1/v2 còn sót trong `matches.game_state_json` (khi chưa lên v3) được `adaptLegacyEngineState()` (`worker/src/boardgame-room.ts`) xử lý an toàn: kiểm tra `Object.hasOwn(ROLES_BY_ID, ...)` và đóng ván sạch sẽ kèm lý do nâng cấp lên Luật v3 mà không gây lỗi deserialization.
- Phòng `CREATED` không có người nối quá `BOARD_GAME_RECONNECT_HOLD_MS` (45 giây) và phòng `PLAYING` bị toàn bộ người ngồi ngắt kết nối liên tục `>= BOARD_GAME_ABANDONED_MATCH_TTL_MS` (5 phút) được `alarm()` tự dọn sang `CLOSED` và xóa khỏi `directory_matches`.

---

## 5. Quy trình Rollout Production (`main`) & Rollback Tức thì

*(Chỉ thực hiện sau khi Human UAT hoàn tất và chủ dự án duyệt merge vào `main`.)*

1. **Thứ tự Deploy (Backend Worker Trước — Frontend Sau):**
   - Hợp nhất PR vào `main`; GitHub Actions chạy đủ các gate + deploy Cloudflare Worker (`worker/scripts/deploy-ci.mjs`), tiếp theo Vercel deploy tĩnh từ `out/`.
   - Lý do: Frontend kiểm tra `protocolVersion` và cấu trúc `publicGame`; đưa Worker v3.1 lên trước bảo đảm mọi field mới (`handCount: number | null`, `GET /api/boardgame/health`, `BG_REQUEST_SYNC`) sẵn sàng ngay khi client mới xuất hiện.
2. **Smoke Check sau Production Deploy:**
   - `curl -fsS https://<prod-worker-host>/api/boardgame/health` trả `ok: true, protocolVersion: 1, rulesetVersion: 3`.
   - Mở `https://hustverse.vercel.app/`, vào CLB Board Game, ngồi Bàn 1, tạo mã mời, mở tab ẩn danh nhập mã và rời phòng.
3. **Rollback Nhanh (< 2 phút):**
   - **Frontend (Vercel):** Instant Rollback về deployment ngay trước đó trên Vercel Dashboard (các trận cũ trong DO vẫn bảo toàn).
   - **Worker (Cloudflare):**
     ```bash
     cd worker
     npx wrangler rollback --message "Rollback boardgame v3.1 to previous stable worker"
     ```
     Hoặc `git revert <merge-commit>` trên nhánh khẩn cấp và chạy CI deploy Worker trước đó.
