# Bóng Đêm KTX v3.1 — Báo cáo Kiểm thử Hồi quy, E2E & Benchmark (`Test Report`)

> **Dự án:** HUSTVerse — Bách Khoa 3D  
> **Tính năng:** Board Game Club — *Bóng Đêm KTX v3.1* (`RULESET_VERSION = 3`, `PROTOCOL_VERSION = 1`)  
> **Nhánh kiểm chứng:** `feat/boardgame-v2-deduction`  
> **Chiến lược thực thi:** Toàn bộ các suite nặng và Playwright headless chạy **tuần tự** (từng suite một) nhằm tránh tranh chấp CPU/WebGL và đảm bảo tính chính xác của số liệu đo.

---

## 1. Tổng hợp Cổng Kiểm thử Bắt buộc & Hồi quy (`VERIFIED`)

| Lệnh Kiểm thử | Phạm vi | Kết quả Quan sát | Ghi chú / Thời lượng |
|---|---|---|---|
| `npm run typecheck` | TypeScript Frontend + Shared Contracts + Worker | `PASS` (exit 0) | `tsc --noEmit && tsc --noEmit -p worker/tsconfig.json` |
| `npm run test:learn` | HSK 3 + HSK 4 Engine & SRS | `PASS` (`45/45`, `0 fail`) | `61.84 ms` |
| `npm run test:contracts` | Shared Contracts, Bounds & `HskRoom` DO | `PASS` (`12/12`, `0 fail`) | `985.01 ms` |
| `npm run test:world` | World data, Library spatial/elevation/seating | `PASS` (`32/32`, `0 fail`) | `1959.63 ms` |
| `npm run test:avatar` | 10 đồng phục HUST & kinematics rigging | `PASS` (`4/4`, `0 fail`) | `2055.88 ms` |
| `npm run test:ui` | HUD priority, seats & HSK/mode boundary | `PASS` (`12/12`, `0 fail`) | `1083.56 ms` |
| `npm run test:study` | Study room DO, Pomodoro & leaderboard | `PASS` (`21/21`, `0 fail`) | `1216.65 ms` |
| `npm run test:nav` | 4 chặng A* trên mạng lưới đường sân trường | `PASS` (`4/4` legs) | `spawnCheck: pass=true, movedM=0` |
| `npm run test:mp` | Giao thức WebSocket Campus / Library / Football | `PASS` (`33/33`, `0 fail`) | `mp-protocol exit=0` |
| `npm run test:boardgame` | Unit Engine v3/v3.1 + Lounge + SQLite DO + Sim | `PASS` (`30/30` + `4,500` ván sim) | `11492.89 ms` (unit/DO) + sim exit 0 |
| `node test/boardgame-sim.cjs` | Mô phỏng cân bằng 4P–8P (`900 × 5` ván) | `PASS` (`4,500/4,500`) | `0` treo, `0` hòa, `0` leak bot |
| `npm run test:boardgame:e2e` | Browser E2E 4P/8P/Reconnect/Security (`E2E-01..06`) | `PASS` (exit 0) | Xem chi tiết §2 (`e2e-summary.json`) |
| `node test/boardgame-bg1-smoke.cjs` | Smoke Lounge 3D Desktop + Mobile | `PASS` (exit 0) | `bg1-01..05` |
| `node test/boardgame-perf-bench.cjs` | Microbenchmark Worker DO (`4P` & `8P`) | `PASS` (exit 0) | Xem chi tiết §3 |
| `npm run test:pr10b` | Thư viện Navigation + Camera + Transition Race | `PASS` (rerun clean, exit 0) | Lần chạy đầu `library-transition-race` báo `2172 vs 1991`; chạy độc lập (`1991`) và rerun toàn suite `test:pr10b` PASS với `geometries=1991, textures=185, calls=1583` |
| `npm run build` | Next.js 14.2.5 static export (`out/`) | `PASS` (exit 0) | Route `/`: `543 kB`, First Load JS: `630 kB`, `4/4` static pages |
| `npx wrangler deploy --dry-run --env staging` | Bundling Cloudflare Worker `[env.staging]` | `PASS` (exit 0) | `333.54 KiB` / gzip `67.90 KiB` (`wrangler 4.162.0`) |

---

## 2. Kết quả Browser E2E (`E2E-01 .. E2E-06`) & Security Audit Trình duyệt

Từ [`test-results/boardgame/e2e-summary.json`](../../test-results/boardgame/e2e-summary.json) qua `npm run test:boardgame:e2e` (chạy trình duyệt headless Chromium + WebGL SwiftShader đối thoại với SQLite Durable Object harness):

| Kịch bản | Mã mời / Phòng | Kết quả & Dữ liệu Quan sát | Thời lượng | Ảnh / Artifact |
|---|---|---|---|---|
| **`E2E-01 & E2E-04`** (4P Desktop + Mobile `390×844` full lifecycle + Postcard + Exit KTX) | `5WYCVG` | PASS — Hoàn thành 31 thao tác Mobile P4, tạo Postcard `1200×675` PNG, quét `1,237` WebSocket frames `0` secret leak, thoát sạch về sân KTX | `482,939 ms` | `bg4-01-lobby-4p.png` .. `bg4-05-exit-ktx.png` |
| **`E2E-02`** (Bàn 2 full `8P` + Khán giả thứ 9) | `99FRDJ` | PASS — `8` người chơi hoàn tất `8` lượt; Spectator thứ 9 xác nhận `privateView === null` và không xuất hiện trong danh sách ngồi công khai | `135,893 ms` | `bg-v31-8p-spectator.png` |
| **`E2E-03`** (Ma trận F5 Reconnect 5 mốc) | `S498DB` | PASS — `5/5` checkpoints (`READY_CHECK` kèm chuyển quyền Chủ bàn, lượt bản thân, lượt đối thủ, sau `REVEAL_ROLE` giữ mở khóa kỹ năng, và màn `FINISHED`); khôi phục đúng `Lan — Trực Ban Nội Trú` | `138,359 ms` | `bg-v31-reconnect-check.png` |
| **`E2E-05 & E2E-06`** (Cô lập 2 bàn đồng thời + Probe bảo mật WS) | `AHRCM2`, `8H8BTJ` | PASS — 2 bàn `table-1` và `table-2` cô lập trạng thái hoàn toàn; `4/4` security probes trình duyệt (`cross-match token`, malformed JSON, unknown type, `__proto__` prototype key) bị từ chối chuẩn | `94,743 ms` | `e2e-summary.json` |

---

## 3. Benchmark Độ trễ & Băng thông Durable Object (`test/boardgame-perf-bench.cjs`)

| Thông số Đo | Trận `4` người chơi (`4P`) | Trận `8` người chơi (`8P`) |
|---|---|---|
| `createMatch` | `p50/p95/p99`: `144.50 ms` | `p50/p95/p99`: `9.88 ms` |
| `joinAuthSync` | `count=4`, `p50: 8.91 ms`, `p95: 16.35 ms`, `max: 16.35 ms` | `count=8`, `p50: 5.35 ms`, `p95: 10.13 ms`, `max: 10.13 ms` |
| `actionCommitBroadcast` | `count=48`, `p50: 17.28 ms`, `p95: 25.95 ms`, `p99: 29.99 ms`, `max: 29.99 ms` | `count=72`, `p50: 22.45 ms`, `p95: 45.15 ms`, `p99: 48.39 ms`, `max: 48.39 ms` |
| `requestSync` | `count=16`, `p50: 2.05 ms`, `p95/p99/max: 3.65 ms` | `count=24`, `p50: 2.90 ms`, `p95: 6.35 ms`, `p99/max: 7.79 ms` |
| Kích thước gói `BG_STATE_SYNC` | Latest `12.35 KB` / Max `12.81 KB` | Latest `15.49 KB` / Max `15.61 KB` |
| SQLite `game_state` Snapshot | `17,989` bytes | `31,605` bytes |

---

## 4. Vệ sinh Mã nguồn & Cấu hình Triển khai

- **Path Hygiene:** Kiểm tra đường dẫn máy cục bộ trên `test/boardgame*`, `features/boardgame/`, `shared/contracts/boardgame.ts`, `worker/src/boardgame*`, `docs/features/boardgame-v3*` → `0` đường dẫn máy cục bộ cứng.
- **Zero-Secret Audit:** Tất cả `1,237+` WebSocket frames trong `E2E-01..E2E-06` và `4,500` trận `boardgame-sim.cjs` không phát hiện rò rỉ `roleId`, `faction`, `hp`/`maxHp` khi đang `PLAYING`, `hand`, `protegePlayerId`, `privateNotes`/`privateClues`, `rngState`, `reconnectToken` ngoại lai, hay MSSV.
- **Trạng thái ngoài phạm vi tự động (`PENDING_EXTERNAL` / `NOT_EXECUTED`):**
  - `OPS-02`: Worker staging deploy thực tế lên Cloudflare live cần token API ngoại vi (`PENDING_EXTERNAL`; đã PASS `--dry-run --env staging`).
  - `UAT-01`: Phiên playtest người thật cần người tham gia thực tế (`PENDING_EXTERNAL`).
  - `REL-01` & `REL-02`: Không merge vào `main` và không deploy production (`NOT_EXECUTED`).
