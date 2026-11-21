# Bóng Đêm KTX — Phase 8A Production Beta Smoke Test Report

> **Trạng thái:** **VERIFIED LIVE ON PRODUCTION — PASS**  
> **Release Commit Deployed:** `bece2031c91c4e1a76aa7c416d468c41c2550aa5`  
> **CI Run (8/8 PASS + Cloudflare Worker Deploy):** `44881686357` (`https://github.com/haianhant/hust-hsk/actions/runs/44881686357`)  
> **Public Frontend URL:** `https://hustverse.vercel.app/`  
> **Production Cloudflare Worker:** `https://hust-hsk-rooms.hunganhz179.workers.dev`  
> **Ngày nghiệm thu thực tế:** `2026-11-21`

## 1. Kiểm chứng Cục bộ Trước Khi Triển khai (Pre-Deploy Local DO Harness — PASS)

- `test/boardgame-phase8a-beta-release.test.cjs` (`P8A-1`..`P8A-4`): **4/4 PASS**
  - Default-off flag rejection (`expansion-1`, `expansion-2`, `full-expansion`, `starter-*` → `HTTP 400 / RULESET_UNAVAILABLE`).
  - Independent allowlist (`expansion-1` only) + chặn nhồi `starter-fifty-six`.
  - Enabled Production Beta (`expansion-1,expansion-2,full-expansion`) với `ALLOW_EXPERIMENTAL_RULESETS` tắt: `classic` (4P), `expansion-1` (5P), `expansion-2` (5P — loại `exp2_nc_soldier`), `full-expansion` (`4P, 5P, 6P, 7P, 8P`), Host-only `BG_SET_RULESET`, khóa đổi luật sau khi bắt đầu, F5 reconnect, Spectator `privateView === null`.
  - Tier-4 gameplay trên `full-expansion` (`Voodoo`, `Undead`, `Bonnie`, `Cain multi-faction`, `N.C. Soldier` chặn Neutral ẩn) & Safe Rollback bảo toàn trận Beta đang chạy khi tắt cờ `ENABLE_PRODUCTION_BETA_EXPANSIONS="0"`.
  - Telemetry `GET /api/boardgame/telemetry` chính xác, hỗ trợ token gate tùy chọn, `0` rò rỉ token/PII/vai ẩn đang chơi.
- `worker/scripts/deploy-ci.mjs --dry-check`: **PASS** (`1143268 bytes`, `202.78 KiB gzip`, xác nhận đủ bindings `HSK_ROOM`, `BOARD_GAME_ROOM`, và vars `ENVIRONMENT`, `ENABLE_PRODUCTION_BETA_EXPANSIONS`, `BETA_ALLOWED_RULESETS`).

## 2. Nghiệm thu Trực tiếp trên Production (`scripts/smoke-production-beta.cjs` — PASS)

Chạy `node scripts/smoke-production-beta.cjs` trực tiếp vào `https://hust-hsk-rooms.hunganhz179.workers.dev` và `https://hustverse.vercel.app/` sau khi CI run `44881686357` triển khai xong:

### 2.1. Kiểm tra Endpoint & Cấu hình Server
- `GET /api/boardgame/health` → **HTTP 200**:
  - `env: "production"`, `protocolVersion: 1`, `rulesetVersion: 4`, `defaultRulesetId: "classic"`, `catalogVersion: "2026.11-p7b"`
  - `betaEnabled: true`, `betaAllowedRulesets: ["expansion-1", "expansion-2", "full-expansion"]`
- `GET /api/boardgame/rulesets` → **HTTP 200**:
  - Đúng 4 bộ luật công khai: `classic` (`stable`, `PUBLIC_RELEASE_APPROVED`, 10), `expansion-1` (`beta`, `PRODUCTION_BETA_ENABLED`, 36), `expansion-2` (`beta`, `PRODUCTION_BETA_ENABLED`, 40), `full-expansion` (`beta`, `PRODUCTION_BETA_ENABLED`, 66).
  - **0** pool thử nghiệm `starter-*` bị lộ trong payload.
- Chặn toàn bộ 7 bộ luật `starter-*` (`starter-four`, `starter-eight`, `starter-sixteen`, `starter-twenty-six`, `starter-thirty-eight`, `starter-forty-eight`, `starter-fifty-six`) qua `POST /api/boardgame/matches`: **7/7 bị từ chối với `HTTP 400` + `code: "RULESET_UNAVAILABLE"`**.
- Bảo toàn dữ liệu lịch sử: `GET /api/boardgame/leaderboard?limit=10` giữ nguyên **4/4 bản ghi người chơi lịch sử** (`Sv Bảo`, `Nguyễn Đình An`, `Hoang Ba Bao`, `Hai Anh`), không ảnh hưởng bảng xếp hạng.

### 2.2. Kiểm tra Live Room Creation, Ruleset Switching, Gameplay Start, F5 Reconnect & Spectator Privacy

| Ruleset | Số người | Match ID | Invite Code | Chia vai hợp lệ | Host Switch / Lock sau Start | F5 Reconnect giữ nguyên vai & bộ luật | Spectator Privacy (`privateView === null`) | Lượt mở đầu (`ROLL_DICE`) |
| --- | :---: | --- | :---: | :---: | :---: | :---: | :---: | :---: |
| `classic` (Stable) | 4P | `bg_d4c0612b8a1ec19a` | `7Y772F` | 4/4 | Lock PASS | PASS | PASS | PASS |
| `expansion-1` (Beta) | 4P | `bg_d76639306d231d28` | `J5TBJQ` | 4/4 | Switch `classic→expansion-1` + Lock PASS | PASS | PASS | PASS |
| `expansion-2` (Beta) | 5P | `bg_991a8908b96ba188` | `Z5YZ2D` | 5/5 (loại `exp2_nc_soldier`) | Lock PASS | PASS | PASS | PASS |
| `full-expansion` (Beta) | 6P | `bg_3a2cc04d59344f46` | `PH8KHB` | 6/6 | Lock PASS | PASS | PASS | PASS |

### 2.3. Kiểm tra Live Telemetry (`GET /api/boardgame/telemetry` & `npm run telemetry:beta`)
- `privacyGuarantees`: `noReconnectTokens: true`, `noPlayerPiiOrNames: true`, `noActiveMatchHiddenRoles: true`, `postMatchAggregateOnly: true`.
- Sau smoke test (4 phòng smoke không chạy kết thúc trận để không làm nhiễu bảng xếp hạng / dữ liệu người chơi thật):
  - `matchesCreated: 4`, `matchesStarted: 4`, `matchesCompleted: 0`, `matchesAbandoned: 0`
  - `humanPlaytestProgressCompleted: 0 / 100` (trung thực: chưa có trận người thật hoàn chỉnh nào được ghi nhận)
  - `reconnectAttempts: 4`, `invalidActionAttempts: 0`, `engineErrors: 0`, `workerErrors: 0`, `unhandledExceptions: 0`, `stateRestoreFailures: 0`, `unexpectedMatchEndings: 0`.

## 3. Kiểm tra Trình duyệt Trực tiếp trên `https://hustverse.vercel.app/` (Playwright — PASS)

- Truy cập trực tiếp `https://hustverse.vercel.app/`, vào CLB Board Game KTX (`window.__bkhn.enterBoardGameClub()`), mở Sảnh (`[data-testid="bg-toggle-lobby-btn"]` → `[data-testid="boardgame-lobby-modal"]`):
  - Trình duyệt gọi thực tế `GET https://hust-hsk-rooms.hunganhz179.workers.dev/api/boardgame/rulesets` → **HTTP 200**, `betaEnabled: true`.
  - Hiển thị đầy đủ 4 lựa chọn trong `[data-testid="bg-lobby-ruleset-preview"]` (và **0** lựa chọn `starter-*`):
    - `bg-create-ruleset-classic`: **`Classic STABLE 10 tướng`** (`enabled`, mặc định)
    - `bg-create-ruleset-expansion-1`: **`Expansion 1 BETA 36 tướng`** (`enabled`)
    - `bg-create-ruleset-expansion-2`: **`Expansion 2 BETA 40 tướng`** (`enabled`)
    - `bg-create-ruleset-full-expansion`: **`Full 66 BETA 66 tướng`** (`enabled`)
  - Hiển thị rõ cảnh báo Beta `[data-testid="bg-lobby-beta-notice"]`:  
    `⚠️ Gói Mở rộng đang ở giai đoạn Beta (tiếp tục điều chỉnh cân bằng). Classic (10 tướng) luôn là chế độ ổn định mặc định.`
  - Bố cục không tràn ngang (`scrollWidth <= innerWidth + 1`).
  - Xác nhận chân dung nhân vật mở rộng tải trực tiếp từ CDN Vercel **HTTP 200**:
    - `/assets/boardgame/roles/role-exp1-fallen.webp` (`200`, `108,434` bytes)
    - `/assets/boardgame/roles/role-exp1-lloyd.webp` (`200`, `125,636` bytes)
    - `/assets/boardgame/roles/role-exp2-cain.webp` (`200`, `144,372` bytes)
    - `/assets/boardgame/roles/role-exp2-nc-soldier.webp` (`200`, `121,470` bytes)
