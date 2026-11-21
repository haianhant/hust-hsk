# Bóng Đêm KTX — Phase 8A Production Beta Handoff

> **Trạng thái:** **Phase 8A — Production Beta Release (`classic` Stable Default + Opt-In Beta `expansion-1` / `expansion-2` / `full-expansion`)**.  
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
