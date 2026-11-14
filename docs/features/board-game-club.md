# HUSTVerse Board Game Club & “Bóng Đêm KTX — Secrets After Dark”

> **Module IDs:** `feature.board-game-club`, `feature.bong-dem-ktx`, `worker.board-game-room`  
> **Phiên bản kiến trúc:** BG1 → BG4 (Stacked Branches trên nền `main`)  
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
  ui/           # Giao diện 2D Lobby, Bàn chơi, Nhật ký, Tổng kết & Bưu thiếp kỷ niệm
    BoardGameLobby.tsx, BoardGameHUD.tsx, GameBoard.tsx, RoleCard.tsx, ActionPanel.tsx,
    GameLog.tsx, MatchResult.tsx, MatchPostcard.tsx, sound.ts
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

## 3. Thiết kế Trò chơi “Bóng Đêm KTX — Secrets After Dark” (`BG3`)

### 3.1. Bối cảnh & Mục tiêu

> Đêm mất điện bất ngờ tại khu KTX Bách Khoa khiến hệ thống phát thanh nội bộ lặp lại các dải nhiễu kỳ lạ. Nhóm sinh viên tụ họp điều tra nhận ra có kẻ đang phá sóng từ bên trong, trong khi vài nhân vật khác lại theo đuổi toan tính riêng trước khi ánh đèn sáng trở lại.

- **Số người chơi:** `4 – 8` người mỗi bàn (`Tối đa 8 ghế/bàn`).
- **Số vòng hữu hạn:** Tối đa `7 vòng` (cho `4–5` người) hoặc `8 vòng` (cho `6–8` người) — bảo đảm **luôn kết thúc hữu hạn, không kẹt vô hạn**.
- **2 Chỉ số trung tâm trên Bảng KTX:**
  - `signalProgress` (`0 → 6`, **Chỉ số Tín hiệu**): Tiến trình khôi phục phát thanh của Đội Gác Đèn.
  - `mistProgress` (`0 → 6`, **Chỉ số Màn sương**): Mức độ nhiễu loạn & mất kiểm soát của Hội Màn Sương.
- **Mục tiêu & Nhịp độ 15–25 phút:** Mỗi người chơi giữ `1 Nhân vật bí mật` (100% nguyên bản), `HP` (`9–14`), năng lượng điều tra / lá bài trên tay (`tối đa 4 lá`), và đứng tại một trong `6 Khu vực KTX`.

### 3.2. Ba phe nguyên bản & 9 Nhân vật độc lập

#### Cấu hình chia vai theo số người chơi

| Số người | Đội Gác Đèn | Hội Màn Sương | Kẻ Lang Thang |
|---:|---:|---:|---:|
| **4** | 2 | 2 | 0 |
| **5** | 2 | 2 | 1 |
| **6** | 3 | 2 | 1 |
| **7** | 3 | 3 | 1 |
| **8** | 3 | 3 | 2 |

#### Danh sách 9 Nhân vật nguyên bản

| ID | Tên nhân vật | Phe | HP tối đa | Mục tiêu thắng đặc biệt | Kỹ năng chủ động / bị động (1 lần/ván hoặc có hồi) |
|---|---|---|---:|---|---|
| `gac-ky-thuat` | **Minh — Kỹ Thuật Viên Tầng Thượng** | Đội Gác Đèn | 12 | Đội Gác Đèn thắng (`signalProgress >= 6` hoặc hạ toàn bộ Hội Màn Sương) | **Nối Mạch Dự Phòng** (1 lần/ván): `+1 signalProgress` tại *Phòng Phát Thanh* hoặc *Phòng Bảo Vệ*, hồi `+2 HP` cho 1 người cùng phòng |
| `gac-truc-ban` | **Lan — Trực Ban Nội Trú** | Đội Gác Đèn | 13 | Đội Gác Đèn thắng | **Kiểm Tra Sổ Trực** (1 lần/ván): Bắt buộc 1 người cùng khu vực cho biết phe có phải *Hội Màn Sương* hay không (riêng cho Lan) hoặc tăng khiên `+2` |
| `gac-radio` | **Khánh — Hội Viên Radio KTX** | Đội Gác Đèn | 11 | Đội Gác Đèn thắng | **Sóng Ngắn Bách Khoa** (1 lần/ván): Soi gói manh mối tại khu vực hiện tại và rút thêm `1 lá Tín hiệu` |
| `suong-an-danh` | **Tú — Cư Dân Vô Hình** | Hội Màn Sương | 12 | Hội Màn Sương thắng (`mistProgress >= 6` hoặc hạ toàn bộ Đội Gác Đèn) | **Cắt Cầu Dao** (1 lần/ván): `+1 mistProgress`, khiến khu vực đang đứng tạm tối (người khác rời đi hoặc chịu `1 sát thương`) |
| `suong-tin-gia` | **Vy — Người Gửi Tin Đồn** | Hội Màn Sương | 11 | Hội Màn Sương thắng | **Bẻ Hướng Tần Số** (1 lần/ván): Đảo 1 điểm `signalProgress` thành `mistProgress` nếu đã lộ vai hoặc gây `2 sát thương` tầm xa 1 ô |
| `suong-gac-cong` | **Dũng — Bóng Đêm Hành Lang** | Hội Màn Sương | 13 | Hội Màn Sương thắng | **Khóa Cửa Chắn** (1 lần/ván): Gây `2 sát thương` cho 1 mục tiêu cùng khu vực và chặn hồi phục lượt tới |
| `lang-anh-san` | **Hải — Người Săn Gói Tin Bí Mật** | Kẻ Lang Thang | 10 | **Thu thập đủ 3 Mảnh Tin Đen** (`fragments >= 3`) khi vẫn còn sống, hoặc sống sót khi cạn vòng với `>= 2 Mảnh Tin` | **Lần Theo Dây Cáp** (1 lần/ván): Lật 1 lá Manh mối và nhận ngay `+1 Mảnh Tin Đen` |
| `lang-quan-sat` | **Trang — Người Ghi Chép Đêm Khuya** | Kẻ Lang Thang | 10 | **Đoán đúng phe của ≥ 3 người khác** thông qua hành động Lật/Chỉ điểm hoặc **là người đứng cạnh vị trí dẫn đầu khi trận kết thúc với HP >= 5** | **Ghi Chép Lạnh Lùng** (1 lần/ván): Soi bí mật phe của 1 người chơi bất kỳ và nhận `+2 Khiên` |
| `lang-cuu-ho` | **Bình — Người Bảo Hộ Ngầm** | Kẻ Lang Thang | 11 | **Giữ cho mục tiêu bí mật (`wardId`) sống sót tới khi kết thúc ván** và bản thân còn `HP >= 4` (nếu ward bị hạ, chuyển sang đạt `>= 3 lần Che Chắn`) | **Che Chắn Khẩn Cấp** (1 lần/ván): Chuyển toàn bộ sát thương hướng vào `ward` trong vòng sang Khiên hoặc hồi `+3 HP` cho `ward` |

> **Chốt kết thúc hữu hạn:** Khi hết số vòng tối đa (`7` hoặc `8`) mà chưa phe nào chạm ngưỡng thắng tức thì:
> 1. Kiểm tra điều kiện thắng Kẻ Lang Thang còn sống đạt mốc.
> 2. Nếu không, phe có hiệu số `(signalProgress - mistProgress)` cao hơn thắng; nếu hòa điểm, xét tổng HP còn lại của thành viên còn sống mỗi phe; nếu vẫn hòa, Đội Gác Đèn thắng nhờ lưới điện dự phòng khôi phục vào rạng sáng.

### 3.3. Bản đồ 6 Khu vực KTX

1. **Sảnh Ký Túc Xá (`lobby`):** Khu vực trung tâm, có đèn pin khẩn cấp (`+1 HP` khi dừng chân lần đầu trong vòng nếu HP < 5).
2. **Căng Tin B5–B9 (`canteen`):** Rút thêm `1 lá Sự Kiện` hoặc nhận đồ tiếp tế (`+1 Khiên`).
3. **Phòng Phát Thanh (`radio`):** Trạm khuếch đại chính; cho phép dùng hành động điều chỉnh `+1 Tín hiệu` hoặc `+1 Nhiễu sóng` theo phe/lựa chọn.
4. **Sân Bóng Rổ KTX (`court`):** Tầm quan sát rộng; có thể **Tác động (Attack / Thăm dò)** mục tiêu ở khu vực lân cận hoặc thu thập `1 Mảnh Tin`.
5. **Hành Lang B7 (`corridor`):** Nút giao lối tắt; di chuyển tới bất kỳ phòng nào vào lượt sau hoặc gài bẫy Manh mối.
6. **Phòng Bảo Vệ & Cầu Dao (`breaker`):** Trung tâm điện; mở khóa kiểm tra nguồn điện (`+1 Tín hiệu` / `+1 Màn sương` tùy lá bài) hoặc soi trạm ghi nhận ai vừa ghé qua.

### 3.4. Hệ thống 32 Lá bài Data-Driven (`GameCard`)

Mỗi `GameCard` khai báo thuần dữ liệu `{ id, deck: 'clue' | 'event' | 'tactic', title, summary, effectId, targetMode, value }`:
- **`clue` (10 lá):** Gửi manh mối kiểm chứng phe/khả năng hoặc thu thập `Mảnh Tin` (ví dụ: *Phiếu Ghi Trực Điện*, *Tệp Âm Thanh Nhiễu*, *Sổ Điểm Danh Tầng 3*).
- **`event` (12 lá):** Tác động toàn bàn hoặc tại khu vực như tăng/giảm Tín hiệu, Màn sương, đổi vị trí, hồi phục hay mất điện cục bộ.
- **`tactic` (10 lá):** Thẻ chiến thuật cầm tay (`tối đa 4 lá`): tạo Khiên, tăng sát thương, phản đòn, soi vai bí mật, hoặc chặn khả năng đối phương.

### 3.5. Cấu trúc 1 Lượt Chơi (Server-Authoritative)

1. **Di chuyển (`MOVE`):** Chọn 1 trong 5 khu vực khác vị trí hiện tại (hoặc giữ vị trí theo hiệu ứng).
2. **Hành động Khu vực (`EXPLORE` / `DRAW_CARD`):** Rút `1 lá` từ bộ `clue`, `event` hoặc `tactic` phù hợp khu vực (hoặc kích hoạt đặc quyền khu vực).
3. **Tác động Chiến thuật (`ACT`):** Chọn **1 trong các lựa chọn** hợp lệ trước khi kết thúc lượt:
   - Sử dụng 1 lá `Tactic` trên tay.
   - Kích hoạt **Kỹ năng Nhân vật** (có thể kèm **Lật Vai / Reveal Identity** để tăng uy lực hoặc đạt điều kiện).
   - **Thăm dò / Công kích** 1 người chơi ở cùng khu vực (hoặc tầm xa hợp lệ) gây sát thương / phá khiên.
   - **Bỏ qua (`END_TURN`)**.
4. **Hết giờ tự động (`DO alarm()`):** Sau `45 giây` không thao tác (hoặc `30 giây` cấu hình nhanh), `BoardGameRoom` Durable Object tự động thực hiện bước di chuyển/kết thúc lượt hợp lệ để ván đấu không bao giờ treo.

---

## 4. Kiến trúc Mạng, Durable Object & SQLite (`BG2`)

### 4.1. Định tuyến & Tách biệt Worker

- `worker/wrangler.toml`: Giữ nguyên `[[migrations]] tag = "v1"` cho `HskRoom`; **chỉ nối thêm**:
  - Binding `BOARD_GAME_ROOM` → `class_name = "BoardGameRoom"`
  - `[[migrations]] tag = "v2"`, `new_sqlite_classes = ["BoardGameRoom"]`
- `worker/src/boardgame-router.ts`:
  - `POST /api/boardgame/matches`: Tạo trận mới tại bàn 1 hoặc bàn 2, sinh `matchId`, mã mời `inviteCode` (`6` ký tự `[A-HJ-NP-Z2-9]`, loại bỏ `0/O/1/I/L`), đăng ký vào DO `__lounge_directory__`, trả về `{ matchId, inviteCode, tableId }`.
  - `GET /api/boardgame/matches`: Lấy danh sách trận đang mở (`CREATED`, `WAITING`, `READY_CHECK`, `PLAYING`) từ `__lounge_directory__` (tối đa 16 bản ghi công khai, **không chứa vai bí mật hay reconnectToken**).
  - `POST /api/boardgame/join-by-code`: Tra cứu `matchId` từ `inviteCode` qua `__lounge_directory__` (trả `404` nếu không tồn tại/đã đóng).
  - `GET /ws/boardgame?matchId=...&playerId=...&seatIndex=...`: Nâng cấp WebSocket trực tiếp vào `BoardGameRoom` DO tương ứng (`idFromName(matchId)` hoặc `idFromName('__lounge_directory__')` nếu `mode=directory`).

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
- **Mất kết nối giữa trận:** Đánh dấu `connected = 0`; nếu là host ở lobby, tự động chuyển host cho người ngồi ghế nhỏ nhất còn kết nối; giữ chỗ `90 giây` để reconnect; trong lúc `PLAYING`, nếu đến lượt người mất kết nối thì `alarm()` chạy đúng hạn `15 giây` (rút gọn cho người mất kết nối) để không kẹt bàn.

---

## 5. Bảo mật Thông tin Bí mật (P0 Hidden-Info Controls)

1. **Tách biệt tuyệt đối 2 hàm chiếu (Projections):**
   - `getPublicGameView(state)`: Chỉ chứa danh sách người chơi (tên, ghế, trang phục, `hp`, `maxHp`, `shield`, `location`, `revealedRoleId` — chỉ khác `null` khi đã lật vai công khai, `handCount` dạng số nguyên, `alive`), thanh tiến trình chung (`signalProgress`, `mistProgress`, `round`, `maxRounds`, `turnPhase`, `activePlayerId`, `turnDeadlineMs`), và nhật ký công khai đã được làm sạch (`publicLog`, không lộ tên vai hay nội dung thẻ riêng).
   - `getPrivateGameView(state, authenticatedPlayerId)`: Chỉ trả riêng cho `WebSocket` gắn đúng `authenticatedPlayerId` qua kênh unicast (`ws.send`). Chứa `roleId`, `faction`, `secretGoal`, `wardId` (nếu có), `hand` (danh sách `GameCard` trên tay), `privateNotes` (kết quả soi vai riêng cho người chơi đó).
2. **Spectator Strictly Read-Only:** Kết nối khán giả luôn nhận `privateView: null`, không thể gửi lệnh thay đổi trạng thái ván (`REJECTED_SPECTATOR`).
3. **Không bao giờ trả `game_state_json`, `reconnect_token_hash`, vai bí mật chưa lật, hoặc MSSV** trong `/api/boardgame/matches`, `MatchPostcard`, hay log lỗi.
4. **Rate limiting & Guard:** Kiểm tra `Origin` header với allowlist, giới hạn độ dài `displayName <= 24`, chặn spam chat/emote (`1.5s` cooldown trên server) và giới hạn tần suất action (`>= 120ms` giữa các lệnh).

---

## 6. Xử lý Lỗi & Kế hoạch Kiểm thử (`BG1 → BG4`)

| Nhóm kiểm thử | Script / Công cụ | Mục tiêu xác minh |
|---|---|---|
| **BG1 Spatial & Lounge Unit** | `node --test test/boardgame-lounge.test.cjs` | Tọa độ nhà CLB không đè KTX/cây, 16 ghế, camera clamp indoor, collider phòng |
| **BG1 Browser Smoke** | `node test/boardgame-bg1-smoke.cjs` | Playwright desktop `1280×800` & mobile `390×844`: vào phòng, ngồi ghế, xem bảng luật, thoát sạch |
| **BG2 DO SQLite & Lobby** | `node --test test/boardgame-lobby-do.test.cjs` | `BoardGameRoom` SQLite thực: 4/8 người chơi, từ chối người thứ 9, 2 trận song song, reconnect, hibernation, host thoát |
| **BG3 Pure Engine Unit** | `node --test test/boardgame-engine.test.cjs` | 9 vai, chia vai 4–8 người, 32 thẻ data-driven, thắng Gác Đèn / Màn Sương / Kẻ Lang Thang, giới hạn vòng |
| **BG3 3,000-Game Balance Sim** | `node test/boardgame-sim.cjs` | Chạy `>= 3.000` ván bot offline (4–8p), tỷ lệ kẹt `= 0%`, cân bằng tỷ lệ thắng hợp lý |
| **BG3 Full Match DO Test** | `node --test test/boardgame-match-do.test.cjs` | Chơi hết ván qua WS + SQLite DO, xác minh 0 rò rỉ vai bí mật trên mọi frame WS/khán giả, `alarm()` timeout, refresh reconnect |
| **BG4 E2E Multi-Context** | `node test/boardgame-e2e.cjs` | 4 trình duyệt Playwright thật (desktop + `390×844` mobile), `?bgInvite=CODE`, chơi 2D, inspect frame WS, xuất `MatchPostcard`, thoát về campus |
| **Hồi quy toàn hệ thống** | `typecheck`, `test:learn`, `test:contracts`, `test:nav`, `test:mp`, `npm test`, `build`, `library-seating-smoke.cjs`, `test:pr10b` | 100% PASS, không hỏng campus / thư viện / HSK / Pomodoro |

### Checklist Kiểm tra trên GPU Phần cứng Thực (Manual / Hardware Verification)

- Kiểm tra không có z-fighting trên mặt bàn, thảm phòng, mặt đất ngoài nhà CLB dưới bóng đổ `PCFSoftShadowMap`.
- Xoay 360° trong `BoardGameLounge` trên GPU rời & mobile WebGL2: FPS ổn định khi đi lại, chuyển `frameloop="demand"` khi vào bàn chơi 2D.
- Kiểm tra ánh sáng `Day / Sunset / Night` bảo đảm độ tương phản rõ nét giữa đèn thả vàng ấm và bóng đổ trong phòng.
