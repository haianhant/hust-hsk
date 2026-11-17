# HUSTVerse Board Game Club & “Bóng Đêm KTX — Secrets After Dark”

> **Module IDs:** `feature.board-game-club`, `feature.bong-dem-ktx`, `worker.board-game-room`  
> **Trạng thái triển khai:** Hoàn thiện BG1–BG4 và **Nâng cấp Luật v3 (`BOARD_GAME_RULESET_VERSION = 3` — Hidden Role, Investigation & Survival)** (`feat/boardgame-v2-deduction`).  
> **Tài liệu đặc tả & kiểm chứng v3:**
> - Quyết định thiết kế & rà soát v2 → v3: [`docs/features/boardgame-v3-design-decisions.md`](./boardgame-v3-design-decisions.md)
> - Bộ luật đầy đủ v3: [`docs/features/boardgame-v3-rules.md`](./boardgame-v3-rules.md)
> - Báo cáo cân bằng 4.500 ván (8 bot): [`docs/features/boardgame-v3-balance-report.md`](./boardgame-v3-balance-report.md)
> - Báo cáo kiểm thử tổng hợp v3: [`docs/features/boardgame-v3-test-report.md`](./boardgame-v3-test-report.md)  
> **Bản quyền:** 100% IP, bối cảnh, nhân vật, luật chơi, bộ thẻ và giao diện nguyên bản lấy cảm hứng từ thể loại *social deduction / hidden-role tactical board game*; không sao chép tên thương mại, luật chi tiết hay lời văn của bất kỳ sản phẩm nào khác.

---

## 1. Tổng quan Kiến trúc & Phân rã Module

Hệ thống được tách thành các lớp độc lập để tránh phình to `app/page.tsx` và `worker/src/room.ts`:

```text
features/boardgame/
  domain/       # Pure TypeScript, deterministic, không phụ thuộc React/DOM/Three.js
    rules.ts, roles.ts, cards.ts, effects.ts, actions.ts, victory.ts, projections.ts, state-machine.ts
  network/      # Protocol client & runtime payload guards
    contracts.ts, client.ts
  world/        # Lazy-loaded 3D exterior & interior scene (R3F / Three.js)
    BoardGameEntrance.tsx, BoardGameLounge.tsx, BoardGameTable.tsx, BoardGameSeats.tsx, BoardGameCamera.tsx
  ui/           # Giao diện 2D Lobby, Bàn chơi minh họa SVG, Nhật ký, Tổng kết & Bưu thiếp kỷ niệm
    BoardGameLobby.tsx, BoardGameHUD.tsx, BoardGameArt.tsx, GameBoard.tsx, RoleCard.tsx,
    ActionPanel.tsx, GameLog.tsx, MatchResult.tsx, MatchPostcard.tsx, sound.ts
  index.ts
shared/contracts/boardgame.ts   # Wire protocol & DTO dùng chung Frontend ↔ Cloudflare Worker
worker/src/
  boardgame-room.ts             # Durable Object class `BoardGameRoom` tách riêng hoàn toàn khỏi `HskRoom`
  boardgame-router.ts           # HTTP /api/boardgame/* & WS /ws/boardgame router
```

---

## 2. Thiết kế Không gian 3D & Tương tác (`BG1`)

### 2.1. Vị trí Khuôn viên (Không phá bỏ KTX hiện có)

| Thành phần | Tọa độ thế giới `(x, z)` | Kích thước / Phạm vi | Ghi chú |
|---|---|---|---|
| **Căng tin KTX B5–B9** (mốc tham khảo) | `(119.0, -52.5)` | `8.6m × 4.4m` (`minX: 114.7..123.3`) | Giữ nguyên hoàn toàn trong `DormitoryComplex.tsx` |
| **KTX B6 / KTX B7** (hàng xóm phía Tây) | `maxZ: -58.2` (B6), `minZ: -51.8` (B7) | Khoảng trống giữa B6–B7 rộng `6.4m` theo Z | Không cắt giao collider hoặc gốc cây |
| **Nhà CLB Board Game (`BOARD_GAME_CLUB`)** | `(106.0, -55.0)` | `6.4m × 3.8m` (`minX: 102.8..109.2, minZ: -56.9..-53.1`) | Quay mặt chính về hướng Đông (`+X`) nhìn sang sân Căng tin B5–B9 |
| **Điểm kích hoạt cửa (`BOARD_GAME_CLUB_DOOR`)** | `(109.8, -55.0)` | `triggerRadius = 2.4m`, spawn trả về `(110.2, -55.0)`, facing `-PI/2` | Nhắc tương tác: `🎲 Nhấn E — Vào CLB Board Game` |
| **Fast Travel `ktx`** | `(112.5, -45.0)` | Cập nhật mô tả nhắc `CLB Board Game` | Giữ nguyên tọa độ xuất phát |

### 2.2. Nội thất Phòng Sinh Hoạt Chung (`BOARD_GAME_LOUNGE`)

- **Hệ tọa độ cục bộ (tách biệt hoàn toàn khỏi campus & thư viện):**
  - Biên sàn đi lại: `minX: -7.0, maxX: 7.0, minZ: -5.2, maxZ: 5.2`, cao trần `3.6m`, `AVATAR.height = 1.7m`.
  - Điểm vào mặc định (`entryPos`): `(0, 4.15)`, hướng nhìn Bắc (`facing = PI`).
  - **Cửa thoát (`exitDoorPos`):** `(0, 4.85)` — nhắc `E — Rời CLB Board Game ra sân KTX` (hiển thị hộp thoại xác nhận nếu người chơi đang trong lobby có trận hoặc trận `PLAYING`).
  - **2 Bàn chơi chính (mỗi bàn 8 ghế = 16 ghế chuẩn):**
    - `table-1` (Khu Tây): tâm `(-3.2, -0.4)`, mặt bàn `2.7m × 1.55m`, ghế `bg-t1-s0..s7`.
    - `table-2` (Khu Đông): tâm `(3.2, -0.4)`, mặt bàn `2.7m × 1.55m`, ghế `bg-t2-s0..s7`.
  - **Tiện ích trang trí & tương tác:**
    - `Tủ trò chơi CLB` ở tường Bắc-Tây `(-5.6, -4.65)` (tải vỏ hộp game phong cách KTX).
    - `Bảng thông tin trận` ở chính giữa tường Bắc `(0, -4.85)` — tương tác `E — Xem bảng thông tin & luật CLB`.
    - `Quầy nước nhỏ` ở tường Đông-Bắc `(5.4, -4.45)` — bình trà đá, cốc giấy, đèn vàng ấm.
    - `Góc đứng xem / chờ trận` ở góc Đông-Nam `(5.1, 3.2)` — ghế băng dài nhìn về 2 bàn.
- **Chiếu sáng theo thời gian (`Day` / `Sunset` / `Night`):**
  - Ban ngày (`day`): ánh sáng tự nhiên dịu xuyên cửa sổ bên kết hợp đèn trần ấm.
  - Hoàng hôn (`sunset`): nắng vàng xiên qua rèm cửa, tăng sắc độ tungsten trên bàn chơi.
  - Ban đêm (`night`): không gian tụ họp KTX buổi tối ấm áp với 2 đèn thả trần vàng ấm rọi thẳng mặt bàn (`#FFE0B2` / `#FFB74D`), bảng đèn neon `"CLB BOARD GAME KTX"` và ánh đèn ấm bên ngoài cửa sổ.
- **Chống xuyên tường & camera indoor:**
  - `resolveBoardGameLoungeCollisions(p, radius)` kiểm tra biên phòng + `BOARD_GAME_LOUNGE_COLLIDERS` (tường bao, 2 bàn, quầy nước, tủ game, băng ghế).
  - `clampBoardGameLoungeCamera` giới hạn camera bám theo trong `[-6.85, 6.85] × [-5.05, 5.05]`, trần `<= 3.32m`, khoảng cách `<= 3.8m` (không lọt ra ngoài hộp tường/trần).
- **Tối ưu GPU khi chơi 2D (`PLAYING`):**
  - Khi giao diện bàn chơi 2D phủ toàn màn hình, R3F `<Canvas>` chuyển sang `frameloop="demand"` nhằm giảm tải GPU trên thiết bị yếu và di động mà vẫn giữ nguyên lớp nền khi thoát ván.

---

## 3. Thiết kế Trò chơi “Bóng Đêm KTX — Secrets After Dark” (Luật v3 — Hidden Role, Investigation & Survival)

> Tài liệu quy tắc & bảng chân trị chi tiết được lưu tại **[`docs/features/boardgame-v3-rules.md`](./boardgame-v3-rules.md)** (`BOARD_GAME_RULESET_VERSION = 3`).

### 3.1. Tóm tắt cơ chế v3 (Hidden Role, Điều tra Có điều kiện & Sinh tồn)

- **Số người chơi & Số vòng hữu hạn:** `4 – 8` người/bàn; tối đa `9 vòng` (`4–5` người) hoặc `10 vòng` (`6–8` người), kèm áp lực Giới Nghiêm ở 2 vòng cuối và **Phiên Trực Cuối Đêm** (tuyệt đối không cộng tổng HP để phân thắng thua).
- **Bảo mật P0 & Cân bằng Khung máu:** Cả 3 phe (`Đội Gác Đèn`, `Hội Màn Sương`, `Kẻ Lang Thang`) đều có đủ 3 mức máu tối đa đối xứng **`11 / 12 / 13 HP`**, xuất phát tại `Sảnh KTX` với `woundsTaken = 0`. `getPublicGameView()` **không** chứa `hp`, `maxHp`, vai chưa lật, bài trên tay hay `protegePlayerId`. Thẻ vai 2D mặc định **ÚP (`hiddenOnScreen = true`)** để tự động che cả bài trên tay và tên kỹ năng chưa lật.
- **26 Thẻ bài theo 3 Bộ (`investigation`, `equipment`, `event`):**
  - `9` thẻ **Điều tra có điều kiện (`inv-01..inv-09`)**: mọi lá đơn lẻ luôn khớp ít nhất 2–3 phe, người chơi phải ghép manh mối công khai + báo cáo kín (`PrivateClues`) để khoanh vùng nghi phạm.
  - `9` thẻ **Trang bị (`eq-01..eq-09`)**: tối đa `2` trang bị công khai trước mặt (`7` bị động + `2` tiêu hao).
  - `8` thẻ **Sự kiện (`ev-01..ev-08`)**: tạo biến động chiến thuật toàn khu vực KTX.
- **Bản đồ 6 khu vực nối đồ thị (`KTX_GRAPH`):** `Sảnh KTX (lobby)`, `Căng tin B5–B9 (canteen)`, `Phòng Phát Thanh (radio)`, `Sân Bóng Rổ (court)`, `Hành Lang B7 (corridor)` (trung tâm nối cả 5 ô), và `Phòng Bảo Vệ (breaker)`. Mỗi nơi có `EXPLORE_LOC` riêng và 1–2 chồng bài được phép rút.
- **Vòng lặp lượt 3 pha dưới 1 đồng hồ duy nhất (`40s` / `12s` mất kết nối):**
  1. `MOVE_OR_STAY`: `MOVE` tới khu vực kề (hoặc 2 bước khi có *Giày Thể Thao*) hoặc `STAY`.
  2. `LOCATION_ACTION`: Chọn `EXPLORE_LOC` (hiệu ứng khu vực) hoặc `DRAW_CARD` (rút 1 lá từ bộ bài của phòng).
  3. `MAIN_ACTION`: Thực hiện tối đa 1 lượt miễn phí `EQUIP_CARD` / `REVEAL_ROLE` (kèm xác nhận không hoàn tác, nhận ngay thưởng lật vai & mở `USE_SKILL`), rồi chọn 1 hành động chính (`INVESTIGATE_CARD`, `PLAY_EVENT`, `USE_EQUIPMENT`, `ATTACK`, `DEFEND`, `USE_SKILL`, `END_TURN`).
- **Chống đánh bừa & Chiến thắng đa chiều:** Đòn đánh mù vào người chưa lật, chưa từng đánh ai và chưa được điều tra kích hoạt *Bình Tĩnh Tự Vệ* (`-1 ST` & nạn nhân `+1 Giáp tạm`). Đội Gác Đèn hạ nhầm đồng đội chịu *Kỷ Luật Nội Trú* (`2` vết thương & rơi `1` trang bị). Kẻ Lang Thang (`Hải`, `Trang`, `Bình`) có mục tiêu độc lập hoặc đồng thắng.
- **Hết giờ trung lập (`DO alarm()`):** `applyTimeoutAutoTurn()` không đọc `faction`/`roleId`, tự động giữ vị trí và phòng thủ với log đồng nhất.
- **Chia sẻ & Hậu kỳ:** Link mời `?bgInvite=CODE`, âm thanh WebAudio (`sound.ts`), Bưu thiếp PNG 1200×675 (`MatchPostcard.tsx`, không MSSV).

---

## 4. Kiến trúc Mạng, Durable Object & SQLite (`BG2`)

### 4.1. Định tuyến & Tách biệt Worker

- `worker/wrangler.toml`: Giữ nguyên `[[migrations]] tag = "v1"` cho `HskRoom`; **chỉ nối thêm**:
  - Binding `BOARD_GAME_ROOM` → `class_name = "BoardGameRoom"`
  - `[[migrations]] tag = "v2"`, `new_sqlite_classes = ["BoardGameRoom"]`
- `worker/src/boardgame-router.ts`:
  - `POST /api/boardgame/matches`: Tạo trận mới tại bàn 1 hoặc bàn 2, sinh `matchId`, mã mời `inviteCode` (`6` ký tự `[A-HJ-NP-Z2-9]`, loại bỏ `0/O/1/I/L`), đăng ký vào DO `__lounge_directory__`, trả về `{ matchId, inviteCode, tableId }`.
  - `POST /api/boardgame/join-table`: Atomic lookup-or-create theo `tableId` (`table-1` / `table-2`) qua `__lounge_directory__` (`POST /__dir/join-or-register-table`) để khi người chơi ngồi vào ghế 3D là tự động vào phòng chờ đang mở của bàn đó hoặc tạo phòng mới nếu chưa có, kèm dọn race-condition khi nhiều người ngồi gần như đồng thời.
  - `GET /api/boardgame/matches`: Lấy danh sách trận đang mở (`CREATED`, `WAITING`, `READY_CHECK`, `PLAYING`) từ `__lounge_directory__` (tối đa 16 bản ghi công khai, **không chứa vai bí mật hay reconnectToken**).
  - `POST /api/boardgame/join-by-code`: Tra cứu `matchId` từ `inviteCode` qua `__lounge_directory__` (trả `404` nếu không tồn tại/đã đóng).
  - `GET /ws/boardgame?matchId=...&playerId=...&seatIndex=...`: Nâng cấp WebSocket trực tiếp vào `BoardGameRoom` DO tương ứng (`idFromName(matchId)` hoặc `idFromName('__lounge_directory__')` nếu `mode=directory`).
- **Luồng ngồi ghế -> Sẵn sàng / Bắt đầu trực tiếp trên HUD & Đồ họa bàn cờ (`BoardGameArt.tsx`):**
  - Ngồi xuống ghế 3D ở `Bàn 1` hoặc `Bàn 2` tự động gọi `joinOrCreateTableMatch` và hiển thị ngay thanh `[data-testid="bg-hud-match-bar"]` ngoài HUD với mã mời, nút chép link, bộ đếm sẵn sàng, nút `Sẵn sàng` (người chơi) và `▶ Bắt đầu ván đấu` (Host) mà không cần mở modal Sảnh. Đứng dậy khi đang ở phòng chờ sẽ rời phòng chờ sạch sẽ (`leaveMatch()`).
  - Màn hình bàn cờ 2D dùng đồ họa SVG tùy biến (`FactionCrestSvg`, `RolePortraitSvg` cho 9 lớp nhân vật, `LocationSceneSvg` cho 6 địa điểm KTX nối đường đi, `DeckCardBackSvg`, và `PlayerPawnToken` theo trang phục HUST cùng huy hiệu giáp/trang bị công khai) thay thế các khối chữ đơn thuần.

### 4.2. Lược đồ SQLite trong `BoardGameRoom`

```sql
CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  invite_code TEXT NOT NULL,
  table_id TEXT NOT NULL,
  host_player_id TEXT NOT NULL,
  status TEXT NOT NULL,           -- CREATED | WAITING | READY_CHECK | STARTING | PLAYING | FINISHED | CLOSED
  revision INTEGER NOT NULL,
  turn_deadline_ms INTEGER,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  game_state_json TEXT            -- Trạng thái game authoritative hoàn chỉnh (KHÔNG gửi thẳng ra client)
);

CREATE TABLE IF NOT EXISTS match_players (
  player_id TEXT PRIMARY KEY,
  seat_index INTEGER NOT NULL,    -- UNIQUE cho người đang ngồi (0..7), NULL nếu spectator
  display_name TEXT NOT NULL,
  outfit_json TEXT NOT NULL,
  is_spectator INTEGER NOT NULL DEFAULT 0,
  ready INTEGER NOT NULL DEFAULT 0,
  connected INTEGER NOT NULL DEFAULT 1,
  reconnect_token_hash TEXT NOT NULL,  -- SHA-256 hex, không lưu plaintext
  last_seen_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS processed_requests (
  player_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (player_id, request_id)
);

-- Bảng riêng cho instance __lounge_directory__
CREATE TABLE IF NOT EXISTS directory_matches (
  match_id TEXT PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  table_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  status TEXT NOT NULL,
  player_count INTEGER NOT NULL,
  max_players INTEGER NOT NULL,
  spectator_count INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
```

### 4.3. Hibernation, Reconnect & Fencing

- Mọi `WebSocket` đều dùng `ctx.acceptWebSocket(server)` với tag `playerId` + attachment `{ playerId, connectionId, isSpectator }`.
- Khi `BoardGameRoom` thức dậy sau hibernation (`constructor` / `webSocketMessage`), DO nạp lại `matches` + `match_players` từ SQLite và đối chiếu `attachment`.
- **Token bảo mật 256-bit:** Client nhận `reconnectToken` một lần duy nhất qua frame riêng tư (`BG_AUTH_ISSUED`) lúc tham gia lần đầu và lưu ở `sessionStorage`. Reconnect phải gửi `reconnectToken`; server băm SHA-256 đối chiếu `reconnect_token_hash`.
- **Fencing tab cũ:** Nếu cùng `playerId` mở kết nối mới hợp lệ với `reconnectToken`, socket cũ đang mở nhận close code `4001` (`"Replaced by newer connection"`) và bị ngắt sạch.
- **Mất kết nối giữa trận:** Đánh dấu `connected = 0`; nếu là host ở lobby, tự động chuyển host cho người ngồi ghế nhỏ nhất còn kết nối; giữ chỗ `90 giây` để reconnect; trong lúc `PLAYING`, nếu đến lượt người mất kết nối thì `alarm()` chạy đúng hạn `12 giây` (rút gọn cho người mất kết nối, so với `40 giây` mặc định) để không kẹt bàn; bản ghi v1/v2 cũ trong SQLite tự động chốt sạch `FINISHED` khi nâng cấp v3.

---

## 5. Bảo mật Thông tin Bí mật (P0 Hidden-Info Controls)

1. **Tách biệt tuyệt đối 2 hàm chiếu (Projections):**
   - `getPublicGameView(state)`: Chỉ chứa danh sách người chơi công khai (`displayName`, `seatIndex`, `appearance`, `location`, `woundsTaken`, `tempShield`, `handCount`, `equipped`, `attacksMade`, `investigationsCount`, `wardedUntilRound`, `exposedMark`, `alive`, `revealedRoleId` / `revealedFaction` / `revealedMaxHp` — tất cả `null` khi chưa lật vai hoặc chưa `FINISHED`), trạng thái bàn (`round`, `maxRounds`, `turnPhase`, `activePlayerId`, `curfewPressureActive`, `deckCounts`, `lastInvestigation`, `lastRevealEvent`), và nhật ký công khai (`publicLog`, không lộ danh tính hành động bí mật).
   - `getPrivateGameView(state, authenticatedPlayerId)`: Chỉ trả riêng cho `WebSocket` gắn đúng `authenticatedPlayerId` qua kênh unicast (`ws.send`). Chứa `roleId`, `roleName`, `faction`, `hp`, `maxHp`, `secretGoalText`, `protegePlayerId`, `hand` (danh sách thẻ trên tay), `equipped`, `privateClues` và `privateNotes`.
2. **Spectator Strictly Read-Only:** Kết nối khán giả luôn nhận `privateView: null`, không thể gửi lệnh thay đổi trạng thái ván (`REJECTED_SPECTATOR`).
3. **Không bao giờ trả `game_state_json`, `reconnect_token_hash`, vai bí mật chưa lật, hoặc MSSV** trong `/api/boardgame/matches`, `MatchPostcard`, hay log lỗi.
4. **Rate limiting & Idempotency Guard:** Kiểm tra `Origin` header với allowlist, giới hạn độ dài `displayName <= 24`, chặn spam chat/emote (`1.5s` cooldown trên server). Với `BG_GAME_ACTION`, kiểm tra bảng `processed_requests` (idempotency theo `requestId`) **trước**, sau đó mới áp dụng ngưỡng tần suất `MIN_ACTION_INTERVAL_MS = 25ms` và kiểm tra `expectedRevision` (`STALE_REVISION` resync nếu lệch phiên bản).

---

## 6. Xử lý Lỗi & Kế hoạch Kiểm thử (`BG1 → BG4`)

Chạy gộp nhanh toàn bộ kiểm thử tự động Board Game qua `npm run test:boardgame` (tích hợp trong CI Gate 5b tại `.github/workflows/ci.yml`), và chạy E2E trình duyệt đa ngữ cảnh qua `node test/boardgame-e2e.cjs`:

| Nhóm kiểm thử | Script / Công cụ | Mục tiêu xác minh |
|---|---|---|
| **BG1 Spatial & Lounge Unit** | `node --test test/boardgame-lounge.test.cjs` | Tọa độ nhà CLB không đè KTX/cây, 16 ghế, camera clamp indoor, collider phòng |
| **BG1 Browser Smoke** | `node test/boardgame-bg1-smoke.cjs` | Playwright desktop `1280×800` & mobile `390×844`: vào phòng, ngồi ghế, xem bảng luật, thoát sạch |
| **BG2 DO SQLite & Lobby** | `node --test test/boardgame-lobby-do.test.cjs` | `BoardGameRoom` SQLite thực: 4/8 người chơi, từ chối người thứ 9, 2 trận song song, reconnect, hibernation, host thoát |
| **BG3 Pure Engine Unit** | `node --test test/boardgame-engine.test.cjs` | 9 vai, chia vai 4–8 người, 26 thẻ (9 Điều tra, 9 Trang bị, 8 Sự kiện), bảng chân trị & anti-leakage P0 |
| **BG3 4,500-Game Balance Sim** | `node test/boardgame-sim.cjs` | Chạy `4.500` ván (8 bot, `4–8p`), tỷ lệ kẹt `0%`, hòa `0%`, kiểm tra mọi ngưỡng cân bằng vai/phe |
| **BG3 Full Match DO Test** | `node --test test/boardgame-match-do.test.cjs` | Chơi hết ván qua WS + SQLite DO, xác minh 0 rò rỉ vai bí mật trên mọi frame WS/khán giả, `alarm()` timeout, refresh reconnect |
| **BG4 E2E Multi-Context** | `node test/boardgame-e2e.cjs` | 4 trình duyệt Playwright thật (desktop + `390×844` mobile), `?bgInvite=CODE`, chơi 2D, inspect frame WS, xuất `MatchPostcard`, thoát về campus |
| **Hồi quy toàn hệ thống** | `typecheck`, `test:learn`, `test:contracts`, `test:nav`, `test:mp`, `npm test`, `build`, `library-seating-smoke.cjs`, `test:pr10b` | 100% PASS, không hỏng campus / thư viện / HSK / Pomodoro |

### Checklist Kiểm tra trên GPU Phần cứng Thực (Manual / Hardware Verification)

- Kiểm tra không có z-fighting trên mặt bàn, thảm phòng, mặt đất ngoài nhà CLB dưới bóng đổ `PCFSoftShadowMap`.
- Xoay 360° trong `BoardGameLounge` trên GPU rời & mobile WebGL2: FPS ổn định khi đi lại, chuyển `frameloop="demand"` khi vào bàn chơi 2D.
- Kiểm tra ánh sáng `Day / Sunset / Night` bảo đảm độ tương phản rõ nét giữa đèn thả vàng ấm và bóng đổ trong phòng.
