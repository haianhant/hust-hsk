# Bóng Đêm KTX v3.1 — Báo cáo Kiểm thử Hồi quy, E2E & Benchmark (`Test Report`)

> **Dự án:** HUSTVerse — Bách Khoa 3D  
> **Tính năng:** Board Game Club — *Bóng Đêm KTX v3.1* (`RULESET_VERSION = 3`, `PROTOCOL_VERSION = 1`)  
> **Nhánh kiểm chứng:** `feat/boardgame-v2-deduction` (chuẩn bị fast-forward vào `main`)  
> **Chiến lược thực thi:** Cục bộ chạy các suite nặng và Playwright headless **tuần tự** để tránh tranh chấp CPU/WebGL; trên GitHub Actions CI, Gate 8 được song song hóa thành **5 matrix shards độc lập** chạy đồng thời sau bước build artifact `out/` dùng chung.

---

## 1. Tổng hợp Cổng Kiểm thử Bắt buộc & Hồi quy (`VERIFIED`)

| Lệnh Kiểm thử | Phạm vi | Kết quả Quan sát | Ghi chú / Thời lượng |
|---|---|---|---|
| `npm run typecheck` | TypeScript Frontend + Shared Contracts + Worker | `PASS` (exit 0) | `tsc --noEmit && tsc --noEmit -p worker/tsconfig.json` |
| `npm run test:learn` | HSK 3 + HSK 4 Engine & SRS | `PASS` (`45/45`, `0 fail`) | `60.99 ms` |
| `npm run test:contracts` | Shared Contracts, Bounds & `HskRoom` DO | `PASS` (`12/12`, `0 fail`) | `1019.51 ms` |
| `npm run test:world` | World data, Library spatial/elevation/seating | `PASS` (`32/32`, `0 fail`) | `2057.54 ms` |
| `npm run test:avatar` | 10 đồng phục HUST & kinematics rigging | `PASS` (`4/4`, `0 fail`) | `2100.90 ms` |
| `npm run test:ui` | HUD priority, seats & HSK/mode boundary | `PASS` (`12/12`, `0 fail`) | `1149.80 ms` |
| `npm run test:study` | Study room DO, Pomodoro & leaderboard | `PASS` (`21/21`, `0 fail`) | `1241.86 ms` |
| `npm run test:nav` | 4 chặng A* trên mạng lưới đường sân trường | `PASS` (`4/4` legs) | `spawnCheck: pass=true, movedM=0` |
| `npm run test:mp` | Giao thức WebSocket Campus / Library / Football | `PASS` (`33/33`, `0 fail`) | `mp-protocol exit=0` |
| `npm run test:boardgame` | Unit Engine v3/v3.1 + Lounge + SQLite DO + Sim | `PASS` (`30/30` + `4,500` ván sim) | `10971.70 ms` (unit/DO) + sim exit 0 |
| `node test/boardgame-sim.cjs` | Mô phỏng cân bằng 4P–8P (`900 × 5` ván) | `PASS` (`4,500/4,500`) | `0` treo, `0` hòa, `0` leak bot |
| `npm run test:boardgame:e2e` | Browser E2E 4P/8P/Reconnect/Security (`E2E-01..06`) | `PASS` (exit 0) | `612.23s` tổng tuần tự; CI song song 5 shard, xem chi tiết §2 |
| `node test/boardgame-bg1-smoke.cjs` | Smoke Lounge 3D Desktop + Mobile | `PASS` (exit 0) | `bg1-01..05` |
| `node test/boardgame-perf-bench.cjs` | Microbenchmark Worker DO (`4P` & `8P`) | `PASS` (exit 0) | Xem chi tiết §3 |
| `npm run test:pr10b` | Thư viện Navigation + Camera + Transition Race | `PASS` (exit 0) | Chạy sau sửa `CampusScene.tsx`: `11/11` preset + mobile, camera smoke PASS, 33 transition (`geometries=1897, textures=184, calls=1584`) |
| `npm run build` | Next.js 14.2.5 static export (`out/`) | `PASS` (exit 0) | Route `/`: `543 kB`, First Load JS: `630 kB`, `4/4` static pages |
| `npx wrangler deploy --dry-run --env staging` | Bundling Cloudflare Worker `[env.staging]` | `PASS` (exit 0) | Kiểm chứng trước đó trên cùng cấu hình `worker/`: `333.54 KiB` / gzip `67.90 KiB` |

---

## 2. Kết quả Browser E2E (`E2E-01 .. E2E-06`) & Tối ưu Song song Hóa Gate 8

Từ [`test-results/boardgame/e2e-summary.json`](../../test-results/boardgame/e2e-summary.json) qua `npm run test:boardgame:e2e` (trình duyệt headless Chromium + WebGL SwiftShader đối thoại với SQLite Durable Object harness):

| Kịch bản (`--shard`) | Mã mời / Phòng | Kết quả & Dữ liệu Quan sát | Thời lượng | Ảnh / Artifact |
|---|---|---|---|---|
| **`E2E-01 & E2E-04`** (`e2e-01-04`) | `EZB7R2` | PASS — Hoàn thành `32` thao tác Mobile `390×844` P4, tạo Postcard `1200×675` PNG, quét `884` WebSocket frames `0` secret leak, thoát sạch về sân KTX | `152,312 ms` | `bg4-01-lobby-4p.png` .. `bg4-05-exit-ktx.png` |
| **`E2E-02`** (`e2e-02`) | `63U8ZL` | PASS — `8` người chơi hoàn tất `8` lượt; Spectator thứ 9 xác nhận `privateView === null` và không xuất hiện trong danh sách ngồi công khai | `142,510 ms` | `bg-v31-8p-spectator.png` |
| **`E2E-03`** (`e2e-03`) | `NNU68F` | PASS — `5/5` checkpoints (`READY_CHECK` kèm chuyển quyền Chủ bàn, lượt bản thân, lượt đối thủ, sau `REVEAL_ROLE` giữ mở khóa kỹ năng, và màn `FINISHED`); khôi phục đúng `Tú — Cư Dân Vô Hình` | `188,850 ms` | `bg-v31-reconnect-check.png` |
| **`E2E-05 & E2E-06`** (`e2e-05-06`) | `JWJH47`, `HZYJVT` | PASS — 2 bàn `table-1` và `table-2` cô lập trạng thái hoàn toàn; `4/4` security probes trình duyệt (`cross-match token`, malformed JSON, unknown type, `__proto__` prototype key) bị từ chối chuẩn | `128,560 ms` *(đơn lẻ: `86,386 ms`, `AG2G8L` / `6LZQ6L`)* | `e2e-summary.json` |

### Tối ưu Ổn định & Song song Hóa Gate 8 trên CI
- **Loại bỏ tranh chấp WebGL SwiftShader (`bkhn:pause-3d` & thứ tự vào ván):** Trong `components/three/CampusScene.tsx`, thêm listener sự kiện `bkhn:pause-3d` để tạm dừng vòng lặp dựng hình `frameloop="never"` khi trình duyệt nền đang chờ trình duyệt thứ hai khởi động Campus 3D; trong `E2E-02` và `E2E-05 & E2E-06`, trận đầu tiên chuyển sang trạng thái `PLAYING` (`suspend3D = true`, 0% CPU WebGL) trước khi mở phiên trình duyệt thứ hai, đồng thời nâng `UI_TIMEOUT = 60000` ms cho các thao tác dựng UI trên runner CI 2 vCPU.
- **5 Matrix Shards Song song (`.github/workflows/ci.yml`):** Thay thế job đơn chạy tuần tự >14m43s bằng DAG 4 job (`build-and-unit` upload artifact `out/` → `gate7-pr10b` + 5 VM song song `gate8-boardgame-e2e` cho `e2e-01-04`, `e2e-02`, `e2e-03`, `e2e-05-06`, `bg1-smoke` → `deploy-worker` trên `main`).

---

## 3. Benchmark Độ trễ & Băng thông Durable Object (`test/boardgame-perf-bench.cjs`)

| Thông số Đo | Trận `4` người chơi (`4P`) | Trận `8` người chơi (`8P`) |
|---|---|---|
| `createMatch` | `p50/p95/p99`: `143.71 ms` | `p50/p95/p99`: `11.6 ms` |
| `joinAuthSync` | `count=4`, `p50: 9.51 ms`, `p95: 13.28 ms`, `max: 13.28 ms` | `count=8`, `p50: 6.26 ms`, `p95: 7.8 ms`, `max: 7.8 ms` |
| `actionCommitBroadcast` | `count=48`, `p50: 15.8 ms`, `p95: 27.01 ms`, `p99: 30.59 ms`, `max: 30.59 ms` | `count=72`, `p50: 20.67 ms`, `p95: 33.91 ms`, `p99: 40.32 ms`, `max: 40.32 ms` |
| `requestSync` | `count=16`, `p50: 2.36 ms`, `p95/p99/max: 4.73 ms` | `count=24`, `p50: 3.03 ms`, `p95: 5.3 ms`, `p99/max: 5.63 ms` |
| Kích thước gói `BG_STATE_SYNC` | Latest `12.32 KB` / Max `12.81 KB` | Latest `15.45 KB` / Max `15.76 KB` |
| SQLite `game_state` Snapshot | `18,002` bytes | `31,754` bytes |

---

## 4. Vệ sinh Mã nguồn & Cấu hình Triển khai

- **Path Hygiene:** Kiểm tra đường dẫn máy cục bộ trên `test/boardgame*`, `features/boardgame/`, `shared/contracts/boardgame.ts`, `worker/src/boardgame*`, `docs/features/boardgame-v3*`, `.github/workflows/ci.yml` → `0` đường dẫn máy cục bộ cứng.
- **Zero-Secret Audit:** Tất cả `884+` WebSocket frames trong `E2E-01..E2E-06` và `4,500` trận `boardgame-sim.cjs` không phát hiện rò rỉ `roleId`, `faction`, `hp`/`maxHp` khi đang `PLAYING`, `hand`, `protegePlayerId`, `privateNotes`/`privateClues`, `rngState`, `reconnectToken` ngoại lai, hay MSSV.
