# Bóng Đêm KTX — Phase 8B Regression Verification Report

> **Trạng thái:** **ALL GATES PASS (exit code 0)** — Sẵn sàng mở khóa Phase 8C (Character VFX & Structured Visual Events).

| Hạng mục kiểm thử | Lệnh chạy | Kết quả | Chi tiết chính |
|---|---|---|---|
| **Phase 8B Audit & DO Tests** | `node --test test/boardgame-phase8b-stateful-audit.test.cjs` | **PASS (`11/11`)** | Xác minh `checkGameStateInvariants`, toàn bộ 9 lỗi `BUG-8B-01..09` (gồm 2 bài test real SQLite DO) và 76 trận fuzz + 20 replay tích hợp. |
| **Deep Stateful & Adversarial Fuzzer** | `node scripts/fuzz-boardgame-stateful.cjs --valid=400 --targeted=80 --adversarial=150 --replay=60` | **PASS (`0` lỗi)** | `400` Valid (`76,162` bước), `80` Targeted (`13,636` bước), `72/72` Deterministic Replay, `56,763/56,763` Adversarial Rejections. |
| **Classic `victory.ts` Guard** | `git diff --exit-code features/boardgame/domain/victory.ts` | **PASS (`0-diff`)** | Không sửa bất kỳ dòng nào trong logic chiến thắng Classic. |
| **TypeScript Typecheck** | `npm run typecheck` | **PASS (`0` lỗi)** | Frontend + Shared Contracts + Cloudflare Worker (`worker/tsconfig.json`). |
| **Full Board Game Regression** | `npm run test:boardgame` | **PASS (`205/205`)** | Toàn bộ 29 bộ kiểm thử từ Lounge/Lobby/Engine/DO → Phase 2–8B (gồm 25/25 Classic RNG fingerprints & real DO hibernation/reconnect). |
| **4,500-Match Classic Baseline** | `node test/boardgame-sim.cjs` (trong `test:boardgame`) | **PASS** | `4,500/4,500` trận hoàn tất, `0` stall, `0` draw, `0` bot violation, Guard `39.73%`, Mist `45.56%`, Wanderer primary `14.71%` (`0.00%` sai lệch so với baseline `72595c5`). |

---

## Xác nhận Chuyển Pha (Phase 8B → Phase 8C)
- Toàn bộ P0/P1 phát hiện trong Track A đã được vá tối thiểu, kiểm chứng bằng bài test FAIL → PASS và không gây hồi quy.
- Đã được tách commit riêng biệt theo chiến lược Release Discipline (Commit 1: Audit instrumentation & fuzzer; Commit 2: Confirmed bug fixes, regression tests & Phase 8B docs).
