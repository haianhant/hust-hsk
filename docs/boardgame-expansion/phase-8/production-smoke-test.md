# Bóng Đêm KTX — Phase 8A Production Beta Smoke Test Report

> **Trạng thái:** Đang chờ triển khai CI/CD lên Production để chạy nghiệm thu trực tiếp `node scripts/smoke-production-beta.cjs` (bản ghi kết quả live sẽ được cập nhật ngay sau khi CI `deploy-worker` hoàn tất).

## 1. Kiểm chứng Cục bộ Trước Khi Triển khai (Pre-Deploy Local DO Harness — PASS)

- `test/boardgame-phase8a-beta-release.test.cjs` (`P8A-1`..`P8A-4`): **4/4 PASS**
  - Default-off flag rejection (`expansion-1`, `expansion-2`, `full-expansion`, `starter-*` → `HTTP 400 / RULESET_UNAVAILABLE`).
  - Independent allowlist (`expansion-1` only) + chặn nhồi `starter-fifty-six`.
  - Enabled Production Beta (`expansion-1,expansion-2,full-expansion`) với `ALLOW_EXPERIMENTAL_RULESETS` tắt: `classic` (4P), `expansion-1` (5P), `expansion-2` (5P — loại `exp2_nc_soldier`), `full-expansion` (`4P, 5P, 6P, 7P, 8P`), Host-only `BG_SET_RULESET`, khóa đổi luật sau khi bắt đầu, F5 reconnect, Spectator `privateView === null`.
  - Tier-4 gameplay trên `full-expansion` (`Voodoo`, `Undead`, `Bonnie`, `Cain multi-faction`, `N.C. Soldier` chặn Neutral ẩn) & Safe Rollback bảo toàn trận Beta đang chạy khi tắt cờ `ENABLE_PRODUCTION_BETA_EXPANSIONS="0"`.
  - Telemetry `GET /api/boardgame/telemetry` chính xác, hỗ trợ token gate tùy chọn, `0` rò rỉ token/PII/vai ẩn đang chơi.
- `worker/scripts/deploy-ci.mjs --dry-check`: **PASS** (`1143268 bytes`, `202.78 KiB gzip`, xác nhận đủ bindings `HSK_ROOM`, `BOARD_GAME_ROOM`, và vars `ENVIRONMENT`, `ENABLE_PRODUCTION_BETA_EXPANSIONS`, `BETA_ALLOWED_RULESETS`).
