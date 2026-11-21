# Bóng Đêm KTX — Production Beta Deployment Runbook

> Tài liệu hướng dẫn quy trình triển khai chuẩn cho Frontend (`https://hustverse.vercel.app/`) và Cloudflare Worker (`https://hust-hsk-rooms.hunganhz179.workers.dev`) qua CI/CD được ủy quyền.

---

## 1. Hạ tầng & Đích Triển khai Đã Xác minh

| Thành phần | Đích Triển khai | Cơ chế Triển khai Được Ủy quyền | Ghi chú An toàn |
|---|---|---|---|
| **Frontend Static App** | `https://hustverse.vercel.app/` | Vercel Git integration tự build & deploy từ nhánh `main` (`output: 'export'`) | Trỏ về `wss://hust-hsk-rooms.hunganhz179.workers.dev/ws` qua [`lib/multiplayer.ts`](../../../lib/multiplayer.ts) |
| **Cloudflare Worker + DO SQLite** | `https://hust-hsk-rooms.hunganhz179.workers.dev` | GitHub Actions job `Deploy Cloudflare Worker (hust-hsk-rooms)` trong [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) gọi [`worker/scripts/deploy-ci.mjs`](../../../worker/scripts/deploy-ci.mjs) | Chỉ chạy sau khi `Gates 1–6`, `Gate 7` và 5/5 shard `Gate 8` đều PASS; đọc `[vars]` từ [`worker/wrangler.toml`](../../../worker/wrangler.toml) |
| **Staging Worker (Tùy chọn)** | `hust-hsk-rooms-staging` | `cd worker && npx wrangler@3 deploy --env staging` *(khi có `CLOUDFLARE_API_TOKEN`)* | Đã khai báo sẵn `[env.staging.vars]` trong `worker/wrangler.toml` |

---

## 2. Quy trình Triển khai Từng Bước

### Bước 1 — Kiểm tra cục bộ trước khi push
```bash
npm run typecheck
npm run test:boardgame
npm run test:contracts
npm run test:learn && npm run test:world && npm run test:avatar && npm run test:ui && npm run test:study && npm run test:nav && npm run test:mp
npm run build
(cd worker && node scripts/deploy-ci.mjs --dry-check)
```

### Bước 2 — Xác nhận không có migration phá hủy & không bật `ALLOW_EXPERIMENTAL_RULESETS`
- Kiểm tra `worker/wrangler.toml`:
  - Có `[vars]` với `ENABLE_PRODUCTION_BETA_EXPANSIONS = "1"` và `BETA_ALLOWED_RULESETS = "expansion-1,expansion-2,full-expansion"`.
  - **KHÔNG** có `ALLOW_EXPERIMENTAL_RULESETS`.
- Kiểm tra `git diff origin/main -- features/boardgame/domain/victory.ts` = `0` dòng (Classic bất biến).
- Kiểm tra SQLite schema trong `worker/src/boardgame-room.ts`: chỉ sử dụng `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` additive, không `DROP`/`TRUNCATE` bất kỳ bảng nào (`matches`, `boardgame_leaderboard`, ...).

### Bước 3 — Push lên `main` qua Git để chạy CI/CD
```bash
git push origin main
```
Theo dõi GitHub Actions (`CI Verification Gates`) cho đúng HEAD SHA đến khi đủ **8/8 job** (`Gates 1–6`, `Gate 7`, 5 shard `Gate 8`, `Deploy Cloudflare Worker`) đạt `completed / success`.

### Bước 4 — Nghiệm thu Production Live Sau Triển khai
```bash
# 1. Chạy smoke test tự động trên production thật (HTTP + WebSocket + Classic + 3 gói Beta + chặn 7 starter-*)
node scripts/smoke-production-beta.cjs

# 2. Kiểm tra báo cáo telemetry tổng hợp
npm run telemetry:beta
```
Xác nhận:
- `https://hustverse.vercel.app/` trả HTTP `200`.
- `GET /api/boardgame/rulesets` trả đúng 4 bộ luật (`classic` Stable + `expansion-1`, `expansion-2`, `full-expansion` Beta) và `0` bộ `starter-*`.
- Tất cả 7 gói `starter-*` bị từ chối `HTTP 400 / RULESET_UNAVAILABLE`.
- Dữ liệu lịch sử tại `GET /api/boardgame/leaderboard` vẫn còn nguyên vẹn.
