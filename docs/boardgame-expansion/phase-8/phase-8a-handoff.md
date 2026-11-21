# Bóng Đêm KTX — Phase 8A Production Beta Handoff

> **Trạng thái:** **DEPLOYED & VERIFIED LIVE — Phase 8A Production Beta Release (`classic` Stable Default + Opt-In Beta `expansion-1` / `expansion-2` / `full-expansion`)**.  
> **Lưu ý Trung thực:** Mục tiêu kiểm thử 100 trận người thật (`0 / 100`) đang được thu thập qua Production Early Access — 3 gói mở rộng giữ trạng thái `PRODUCTION_BETA_ENABLED`, riêng `classic` là `PUBLIC_RELEASE_APPROVED`.

## 1. Danh mục 8 Tài liệu Phase 8 (`docs/boardgame-expansion/phase-8/`)

1. [`production-beta-release-plan.md`](./production-beta-release-plan.md)
2. [`feature-flags.md`](./feature-flags.md)
3. [`deployment-runbook.md`](./deployment-runbook.md)
4. [`rollback-runbook.md`](./rollback-runbook.md)
5. [`production-smoke-test.md`](./production-smoke-test.md)
6. [`beta-telemetry-spec.md`](./beta-telemetry-spec.md)
7. [`known-beta-risks.md`](./known-beta-risks.md)
8. [`phase-8a-handoff.md`](./phase-8a-handoff.md)

## 2. Thành phần Đã Triển khai

- **Feature Flags Server-Authoritative (Default-Off):** [`shared/contracts/boardgame.ts`](../../../shared/contracts/boardgame.ts), [`features/boardgame/domain/registry.ts`](../../../features/boardgame/domain/registry.ts), [`features/boardgame/domain/state-machine.ts`](../../../features/boardgame/domain/state-machine.ts), [`worker/wrangler.toml`](../../../worker/wrangler.toml), [`worker/scripts/deploy-ci.mjs`](../../../worker/scripts/deploy-ci.mjs).
- **Worker Validation, Public Capabilities & Beta Telemetry:** [`worker/src/boardgame-observability.ts`](../../../worker/src/boardgame-observability.ts), [`worker/src/boardgame-router.ts`](../../../worker/src/boardgame-router.ts), [`worker/src/boardgame-room.ts`](../../../worker/src/boardgame-room.ts), [`worker/src/index.ts`](../../../worker/src/index.ts).
- **Frontend Sync & Lobby UI:** [`features/boardgame/network/client.ts`](../../../features/boardgame/network/client.ts), [`features/boardgame/ui/BoardGameLobby.tsx`](../../../features/boardgame/ui/BoardGameLobby.tsx), [`app/page.tsx`](../../../app/page.tsx).
- **Kiểm thử & Công cụ Vận hành:** [`test/boardgame-phase8a-beta-release.test.cjs`](../../../test/boardgame-phase8a-beta-release.test.cjs), [`scripts/review-beta-telemetry.cjs`](../../../scripts/review-beta-telemetry.cjs), [`scripts/smoke-production-beta.cjs`](../../../scripts/smoke-production-beta.cjs).

## 3. Bằng chứng Triển khai & Nghiệm thu Production

- **Release Deployment Commit:** `bece2031c91c4e1a76aa7c416d468c41c2550aa5` (CI Run `44881686357`: **8/8 PASS**, gồm `Gates 1–6`, `Gate 7`, 5 shard `Gate 8` và `Deploy Cloudflare Worker (hust-hsk-rooms)`).
- **Public Frontend:** `https://hustverse.vercel.app/` (đã xác nhận Playwright live render `Classic STABLE 10 tướng`, `Expansion 1 BETA 36 tướng`, `Expansion 2 BETA 40 tướng`, `Full 66 BETA 66 tướng`, cảnh báo Beta và tải ảnh chân dung mở rộng HTTP 200).
- **Production Worker:** `https://hust-hsk-rooms.hunganhz179.workers.dev` (`catalogVersion: "2026.11-p7b"`, `protocolVersion: 1`, `rulesetVersion: 4`).
- **Feature Flags đang kích hoạt:** `ENVIRONMENT="production"`, `ENABLE_PRODUCTION_BETA_EXPANSIONS="1"`, `BETA_ALLOWED_RULESETS="expansion-1,expansion-2,full-expansion"`, `ALLOW_EXPERIMENTAL_RULESETS` **không được đặt** (`7/7` bộ luật `starter-*` trả `HTTP 400 / RULESET_UNAVAILABLE`).
- **Bảo toàn Dữ liệu:** `GET /api/boardgame/leaderboard?limit=10` giữ nguyên `4/4` bản ghi lịch sử; `features/boardgame/domain/victory.ts` không thay đổi (`0` dòng diff so với `64f5ae4`).
- **Live Smoke Test:** Xem chi tiết đầy đủ tại [`production-smoke-test.md`](./production-smoke-test.md) (`classic` 4P, `expansion-1` 4P, `expansion-2` 5P, `full-expansion` 6P đều PASS toàn bộ chia vai, khóa sau khi bắt đầu, F5 reconnect, spectator privacy và `ROLL_DICE`; `0` engine/worker/unhandled errors).

## 4. Ưu tiên Tiếp theo cho Giai đoạn Phát triển Beta Lặp (Phase 8B+)

1. **Thu thập 100 trận người thật đầu tiên (`0 / 100`):** Theo dõi định kỳ bằng `npm run telemetry:beta` (và cấu hình secret `BETA_TELEMETRY_TOKEN` trên Cloudflare nếu muốn bật kiểm soát truy cập báo cáo `perCharacterStats`).
2. **Đánh giá cân bằng theo dữ liệu thực tế:** Ưu tiên theo dõi các outlier đã ghi nhận từ mô phỏng bot (`Anathema`, `Colt`, `Dalton`, combo `G43 + Holy Robe`, `Voodoo`, `Undead`, `Cain`, `N.C. Soldier`) và tỷ lệ timeout lựa chọn ngoài lượt (`pendingChoiceTimeouts`, đặc biệt trận có `Lloyd`).
3. **Phát hành bản vá cân bằng có đánh số phiên bản:** Mọi điều chỉnh balance Beta phải tăng `BOARD_GAME_RULESET_VERSION` / `BOARD_GAME_CATALOG_VERSION` và không phá vỡ tương thích trận đang chạy.
4. **Cấp phát môi trường Staging Worker cố định:** Khởi tạo Worker `hust-hsk-rooms-staging` theo block `[env.staging.vars]` trong [`worker/wrangler.toml`](../../../worker/wrangler.toml) để kiểm thử pre-release trước khi đẩy thẳng lên production.
5. **Chỉ cấp nhãn `PUBLIC_RELEASE_APPROVED` cho các gói mở rộng** sau khi đạt đủ ngưỡng kiểm thử người thật và kiểm toán cân bằng cộng đồng.
