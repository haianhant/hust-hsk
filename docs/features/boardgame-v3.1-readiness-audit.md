# Bóng Đêm KTX v3.1 — Phase 0 Readiness & Security Audit (`AUDIT-01` .. `AUDIT-08`)

> **Dự án:** HUSTVerse — Bách Khoa 3D (`haianhant/hust-hsk`)  
> **Nhánh phát triển:** `feat/boardgame-v2-deduction`  
> **Baseline Audit SHA:** `6c0ae40233df9109b6c372c3cb058c02191df073`  
> **Ruleset mục tiêu:** `BOARD_GAME_RULESET_VERSION = 3` (`Hidden Role, Investigation & Survival`, 3 phe, 9 nhân vật đối xứng `11/12/13 HP`, 26 lá bài, 4–8 người chơi, Cloudflare Worker + `BoardGameRoom` SQLite Durable Object)  
> **Mục tiêu Audit:** Xác minh toàn bộ các lỗ hổng P0/P1/P2 có thật trong mã nguồn trước khi triển khai các gói `PR-R1` → `PR-R5`. Không sửa lỗi giả định; mọi mục dưới đây đều gắn vị trí file, dòng lệnh và bước tái hiện thực tế.

---

## Tóm tắt Điều hành Audit (Baseline `6c0ae40233df`)

Kiểm tra trực tiếp toàn bộ mã nguồn `features/boardgame/domain/*`, `features/boardgame/network/*`, `features/boardgame/ui/*`, `features/boardgame/world/BoardGameLounge.tsx`, `shared/contracts/boardgame.ts`, `worker/src/boardgame-room.ts`, `worker/src/boardgame-router.ts`, `.github/workflows/ci.yml` và `test/boardgame-*` xác nhận:
- **2 lỗi P0 (Security / Integrity / Privacy Leak):** Unvalidated `rawAction as BoardGameActionPayload` gây crash DO bằng khóa prototype (`'toString'` / `'constructor'`) + rò rỉ gián tiếp phe ẩn qua `Kỷ Luật Nội Trú` và rò rỉ `handCount` của Vy trên DTO công khai.
- **4 lỗi P1 (Auth / State Invariant / Reliability / Portable CI):** Chấp nhận token nối lại sai khi phòng ở `WAITING` & `generateInviteCode()` fallback `Math.random()`; bug vòng đời `tempShield` khi nhận giáp ngoài lượt tồn tại 2 vòng thay vì 1 vòng; `handleJoin` reconnect thiếu `recomputeLobbyStatus()` & thiếu dọn phòng `CREATED`/`PLAYING` bỏ hoang toàn bộ người thoát; đường dẫn cứng máy cá nhân trong Playwright E2E và thiếu gate E2E trong `.github/workflows/ci.yml`; chữ luật v1 cũ trên bảng 3D Lounge + trùng React `key={card.id}`.
- **2 hạng mục P2 (Balance Telemetry & Operations):** Chưa đo tách bạch thời điểm lật vai, nguyên nhân thắng Phiên Trực Cuối Đêm (`56,73%`), tỷ lệ dùng thẻ Sự kiện (`0,12`/ván) và mô hình thời lượng người thật trong `test/boardgame-sim.cjs`; thiếu log cấu trúc JSON chuẩn Worker + cấu hình `[env.staging]` riêng biệt.

---

## Chi tiết Từng Phát hiện

### `AUDIT-01` — [P0 · `SEC-01`] Ép kiểu `rawAction as BoardGameActionPayload` & Crash DO qua khóa Prototype (`toString` / `constructor`)

- **Mức độ nghiêm trọng:** **P0 (Critical — DoS Crash / Unvalidated Input)**
- **Module ảnh hưởng:**
  - `worker/src/boardgame-room.ts` (dòng `690–695`, `819–832`, `1495–1558`, `1816`)
  - `features/boardgame/domain/effects.ts` (dòng `814–821`, `857`)
  - `features/boardgame/domain/rules.ts` (dòng `106–113`)
- **Bước tái hiện:**
  1. Trong ván `PLAYING`, đến lượt người chơi đang giữ thẻ Sự kiện `ev-03` (*Loa KTX Thông Báo*).
  2. Gửi khung WebSocket `BG_GAME_ACTION` với `{ expectedRevision, requestId, action: { type: 'PLAY_EVENT', cardId: 'ev-03', targetLocation: 'toString' } }`.
  3. Hoặc gửi chuỗi JSON lỗi / loại bản tin không hợp lệ / `{ type: 'BG_SET_READY', ready: 'invalid' }` / frame UTF-8 đa byte sát ngưỡng `8192`.
- **Nguyên nhân gốc (Root Cause):**
  - `handleGameAction()` tại `worker/src/boardgame-room.ts:1496,1556` chỉ kiểm tra `typeof rawAction.type === 'string'` rồi ép kiểu trực tiếp `rawAction as BoardGameActionPayload`.
  - `resolveEventCard()` tại `effects.ts:814,857` nhận `targetLocation` và gọi `listLegalMovesForLocation('toString')` (`rules.ts:112`). Do `KTX_LOCATION_MAP` là plain object có prototype `Object.prototype`, biểu thức `KTX_LOCATION_MAP['toString']?.adjacent` trả về `(Object.prototype.toString).adjacent === undefined`, khiến `.slice()` ném ngoại lệ `TypeError: Cannot read properties of undefined (reading 'slice')` chưa được bắt.
  - Ngoài ra: `ev-01` chỉ kiểm tra `destLoc !== 'corridor'`, ghi tên phòng giả vào log công khai; `adaptLegacyEngineState()` (`boardgame-room.ts:1816`) dùng `p.roleId in ROLES_BY_ID` vốn trả về `true` cho `'toString'`/`'constructor'`; `webSocketMessage` kiểm tra `rawStr.length` (UTF-16 units thay vì byte UTF-8) và trả `RATE_LIMITED` thay vì `INVALID_ACTION`, đồng thời bỏ qua im lặng JSON hỏng / `msg.type` lạ không trả `BG_ERROR`; `BG_SET_READY` ép `Boolean(msg.ready)`; `BG_START_MATCH` nhận `turnTimeoutMs` xuống tới `1500ms` từ client.
- **Hành vi kỳ vọng:** Mọi gói tin client & `BoardGameActionPayload` phải qua schema kiểm tra runtime chặt chẽ (loại hành động, trường bắt buộc/tùy chọn, không có khóa thừa/`__proto__`/`constructor`/`prototype`, đúng cú pháp ID, `isValidLocationId` dùng `Object.hasOwn`); từ chối an toàn bằng `BG_ERROR('INVALID_ACTION', ...)` và không thay đổi trạng thái hay crash DO.
- **Giải pháp đề xuất:** Tạo bộ validator runtime zero-dependency tại `shared/contracts/boardgame.ts` (`validateBoardGameActionPayload`, `validateBoardGameClientMessage`), chặn khóa prototype tại `rules.ts` / `cards.ts` / `roles.ts` / `effects.ts` / `boardgame-room.ts`, kiểm tra `TextEncoder.encode(rawStr).byteLength` và giới hạn `turnTimeoutMs` production (`[15_000, 90_000]` trừ khi bật cờ kiểm thử `ALLOW_SHORT_TURN_TIMEOUT === '1'`).
- **Kiểm thử kiểm chứng:** Bộ test chống crash & fuzz payload trong `test/boardgame-engine.test.cjs` + `test/boardgame-match-do.test.cjs` + `E2E-06`.
- **Rủi ro hồi quy:** Thấp — client hợp lệ luôn gửi đúng schema; cần đảm bảo `boardgame-do-harness.cjs` bật `ALLOW_SHORT_TURN_TIMEOUT = '1'` cho test timeout `1500ms`.
- **Trạng thái tại v3.1:** **Resolved & Verified in v3.1** — Đã triển khai `isSafePlainObject`, `validateBoardGameActionPayload`, `validateBoardGameClientMessage` trong `shared/contracts/boardgame.ts`; khóa tra cứu prototype bằng `Object.freeze` + `Object.hasOwn` trong `rules.ts`, `cards.ts`, `roles.ts`, `state-machine.ts` và `adaptLegacyEngineState` (`boardgame-room.ts`); kiểm tra byte UTF-8 và `BG_ERROR('INVALID_ACTION')` + `clampBoardGameTurnTimeoutMs` (`[15_000, 90_000]`). Kiểm chứng bởi `test/boardgame-engine.test.cjs`, `test/boardgame-match-do.test.cjs` và `E2E-06`.

---

### `AUDIT-02` — [P0 · `SEC-03`] Rò rỉ Thông tin Ẩn (`Vy` `handCount` & Lộ phe gián tiếp qua `Kỷ Luật Nội Trú`)

- **Mức độ nghiêm trọng:** **P0 (Critical Hidden-Role Integrity & Privacy Leak)**
- **Module ảnh hưởng:**
  - `features/boardgame/domain/projections.ts` (dòng `47`)
  - `features/boardgame/domain/effects.ts` (dòng `367–394`, `660`, `673`, `684`)
  - `shared/contracts/boardgame.ts` (dòng `180`)
- **Bước tái hiện:**
  1. **Nhánh A (`Vy — suong-tin-gia`):** Vy lật vai công khai kích hoạt nội tại *Nhiễu Sóng Quan Sát*, nhưng mọi khung `BG_STATE_SYNC` công khai vẫn gửi `publicGame.players[vy].handCount = p.hand.length` (`number`), và thẻ `inv-08`/`inv-09` vẫn trả số chính xác.
  2. **Nhánh B (`Kỷ Luật Nội Trú`):** P1 (Gác Đèn **chưa lật vai**) dùng `ATTACK` hạ gục P2 (cũng là Gác Đèn). Máy chủ lập tức trừ 2 vết thương công khai trên P1 (`woundsTaken` tăng), đẩy trang bị của P1 vào `discards`, phát Highlight `"Kỷ Luật Nội Trú"` và log công khai `"🚨 Kỷ luật Đội Gác Đèn: ..."`. Ngược lại, nếu một Màn Sương / Lang Thang chưa lật hạ P2, log này không xuất hiện.
- **Nguyên nhân gốc (Root Cause):**
  - Vi phạm bất biến tại `effects.ts:8` (*"Nhân vật chưa lật vai KHÔNG tạo ra hiệu ứng công khai khác biệt"*): `Kỷ Luật Nội Trú` làm lộ 100% phe Gác Đèn của kẻ đánh chưa lật và tạo phép loại trừ chắc chắn 100% rằng bất kỳ ai chưa lật hạ Gác Đèn mà không nổ kỷ luật đều là Màn Sương hoặc Lang Thang.
  - `getPublicGameView()` (`projections.ts:47`) luôn gán `handCount: p.hand.length` không xét tới trạng thái lật vai của Vy.
- **Hành vi kỳ vọng:**
  - Khi Vy đã lật vai công khai, `handCount` trên kênh công khai và log/manh mối thẻ `inv-08`/`inv-09` (khi mục tiêu là Vy đã lật) ẩn dưới giá trị `null` (hiển thị `?`).
  - Khi **đã lật vai** (`actor.revealed === true`), Gác Đèn hạ nhầm đồng đội vẫn chịu toàn bộ kỷ luật công khai (2 thương sốc + rơi 1 trang bị + log). Khi **chưa lật vai** (`actor.revealed === false`), không được tạo thay đổi công khai khác biệt (`woundsTaken`, trang bị, log) — chuyển thành kỷ luật nội bộ bí mật (khóa kỹ năng chủ động 2 vòng `actor.skillCooldown = 2` kèm ghi chú riêng tư khi lật vai), giữ nguyên hoàn toàn tính bí mật cho cả Gác Đèn lẫn suy luận ngược về Màn Sương.
- **Giải pháp đề xuất:** Cập nhật `BoardGamePublicPlayerView.handCount: number | null` trong `shared/contracts/boardgame.ts`, chỉnh `projections.ts`, chỉnh `effects.ts`, cập nhật mô tả luật trong `BoardGameLobby.tsx` và `docs/features/boardgame-v3-rules.md`.
- **Kiểm thử kiểm chứng:** Regression tests cho rò rỉ `publicGame`, log sự kiện, Vy `handCount === null`, và so sánh hai trường hợp `actor.revealed = false` vs `actor.revealed = true` trong `test/boardgame-engine.test.cjs`.
- **Rủi ro hồi quy:** Có thể tác động nhẹ tỷ lệ thắng trong mô phỏng 4.500 ván nếu Gác Đèn chưa lật giảm mất 2 HP/đồ khi bắn nhầm; bắt buộc chạy lại simulation seed `20261115` để xác minh guardrail.
- **Trạng thái tại v3.1:** **Resolved & Verified in v3.1** — Đã đổi `BoardGamePublicPlayerView.handCount: number | null` trong `shared/contracts/boardgame.ts`; ẩn số lá của Vy (`suong-tin-gia`) khi đã lật vai thành `null` / `? lá (bị nhiễu)` trên `getPublicGameView()`, thẻ `inv-08`/`inv-09`, nhãn `DEFEND` và nội tại Lan; tách `Kỷ Luật Nội Trú` trong `effects.ts` (giữ phạt sốc 2 thương + rơi 1 trang bị công khai khi `actor.revealed === true`, đổi sang `skillCooldown = Math.max(actor.skillCooldown, 2)` bí mật khi chưa lật vai); đồng bộ tài liệu luật tại `docs/features/boardgame-v3-rules.md` và `BoardGameLobby.tsx`. Kiểm chứng bởi `test/boardgame-engine.test.cjs`, `test/boardgame-sim.cjs` và `E2E-06`.

---

### `AUDIT-03` — [P1 · `SEC-02`] Xử lý Token Kết nối lại Sai ở `WAITING`, CSPRNG `generateInviteCode` & Rate-limit Join

- **Mức độ nghiêm trọng:** **P1 (Security / Session Integrity)**
- **Module ảnh hưởng:**
  - `shared/contracts/boardgame.ts` (dòng `524–532`)
  - `worker/src/boardgame-room.ts` (dòng `990–1063`)
  - `features/boardgame/network/client.ts` (dòng `575–591`)
- **Bước tái hiện:**
  1. Gửi `BG_JOIN` kèm `reconnectToken` giả hoặc token thuộc trận khác trong khi phòng còn ở `WAITING` → máy chủ bỏ qua token sai rồi tạo một người chơi mới thay vì từ chối `UNAUTHORIZED`.
  2. Gọi `generateInviteCode()` không truyền callback → rơi về `Math.random()`.
  3. Gửi lặp liên tục khung `BG_JOIN` → chưa có ngưỡng giới hạn tần suất join/reconnect riêng.
- **Nguyên nhân gốc:** `handleJoin()` (`boardgame-room.ts:1054`) chỉ trả `UNAUTHORIZED` nếu `latestMatch.status === 'PLAYING' && !wantsSpectator`; `generateInviteCode()` dùng `Math.random()`; chưa có bộ đếm rate-limit riêng cho tác vụ join/reconnect.
- **Hành vi kỳ vọng:** Bất kỳ `reconnectToken` không trống nào gửi lên DO mà không khớp `reconnect_token_hash` trong SQLite của chính trận đó đều bị từ chối với `BG_ERROR('UNAUTHORIZED')`; `generateInviteCode()` bắt buộc dùng `globalThis.crypto.getRandomValues`; `handleJoin` giới hạn tần suất hợp lý; `BoardGameClient` tự xóa token cũ ở `sessionStorage` khi gặp `UNAUTHORIZED` để không lặp vô hạn.
- **Trạng thái tại v3.1:** **Resolved & Verified in v3.1** — Đã siết `handleJoin()` trong `worker/src/boardgame-room.ts` từ chối mọi `reconnectToken` không khớp across-state bằng `BG_ERROR('UNAUTHORIZED')`, bổ sung rate-limit join (`MAX_JOINS_PER_WINDOW = 5` / `WINDOW_MS`), bắt buộc `generateInviteCode()` sử dụng WebCrypto CSPRNG (`globalThis.crypto.getRandomValues`) và cập nhật `features/boardgame/network/client.ts` tự xóa token `sessionStorage` khi nhận `UNAUTHORIZED`. Kiểm chứng bởi `test/boardgame-lobby-do.test.cjs`, `test/boardgame-match-do.test.cjs` và `E2E-06`.

---

### `AUDIT-04` — [P1 · `ENG-04`] Lỗi Vòng đời Giáp Tạm (`tempShield`) Tồn tại 2 Vòng khi Nhận Ngoài Lượt

- **Mức độ nghiêm trọng:** **P1 (Gameplay State Invariant Bug)**
- **Module ảnh hưởng:**
  - `features/boardgame/domain/effects.ts` (dòng `112–118`, `397`, `825`, `1127`, `1253`, `1269`)
  - `features/boardgame/domain/actions.ts` (dòng `58–69`)
- **Bước tái hiện:**
  1. Lượt của P1 (`turnPhase = 'MAIN_ACTION'`): P1 đánh P2 (chưa lật, chưa đánh ai, chưa bị điều tra) → P2 kích hoạt *Bình Tĩnh Tự Vệ* và nhận `+1 Giáp tạm` qua `addTempShield(target, 1)`.
  2. `addTempShield` đặt `P2.gainedShieldThisTurn = true` mặc dù đây là lượt của P1!
  3. Đến lượt kế tiếp của P2, P2 thực hiện hành động khác (không tự tạo thêm giáp) rồi kết thúc lượt.
  4. `advanceTurn()` kiểm tra `if (!outgoing.gainedShieldThisTurn && outgoing.tempShield > 0)` → thấy `gainedShieldThisTurn === true` nên **không giảm giáp**, chỉ reset cờ về `false`. Kết quả: P2 giữ giáp miễn phí thêm trọn **1 vòng nữa** (tổng cộng 2 vòng). Lỗi tương tự xảy ra với `ev-01` (*Mất Điện Hành Lang*) hoặc kỹ năng Minh / Trang / Bình tặng giáp cho đồng đội.
- **Nguyên nhân gốc:** `addTempShield(player, amount)` không phân biệt giáp nhận trong **chính lượt của người nhận** hay nhận **ngoài lượt**.
- **Hành vi kỳ vọng:** Giáp tạm chỉ đặt `gainedShieldThisTurn = true` khi người nhận đúng là `getActivePlayer(state)` (để giữ giáp xuyên qua lượt của đối thủ cho tới cuối lượt kế tiếp của chính mình). Giáp nhận ngoài lượt giữ nguyên `gainedShieldThisTurn = false`, nên nó bảo vệ trong suốt các lượt còn lại cho đến hết lượt sắp tới của người nhận rồi mới giảm 1 như đúng luật 1 vòng. Khi bị loại (`eliminatePlayer`), reset luôn `gainedShieldThisTurn = false`.
- **Kiểm thử kiểm chứng:** Bộ 6 ca unit test vòng đời `tempShield` trong `test/boardgame-engine.test.cjs` + chạy lại simulation `4.500` ván xác nhận guardrail.
- **Trạng thái tại v3.1:** **Resolved & Verified in v3.1** — Đã bổ sung tham số `isActiveTurnPlayer` cho `addTempShield(player, amount, isActiveTurnPlayer = true)` trong `features/boardgame/domain/effects.ts` (giáp nhận ngoài lượt giữ nguyên `gainedShieldThisTurn = false` để hết đúng sau lượt kế tiếp của người nhận) và reset `gainedShieldThisTurn = false` khi `eliminatePlayer`. Kiểm chứng bởi bộ unit test `tempShield` trong `test/boardgame-engine.test.cjs` và `test/boardgame-sim.cjs`.

---

### `AUDIT-05` — [P1 · `ENG-05`/`OPS`] Lỗi Kẹt `WAITING` khi Reconnect & Rác Phòng `CREATED` / Phòng Mọi Người Ngắt Kết Nối

- **Mức độ nghiêm trọng:** **P1 (Multiplayer Reliability & Resource Cleanup)**
- **Module ảnh hưởng:**
  - `worker/src/boardgame-room.ts` (dòng `550–562`, `902–984`, `1022–1051`, `1780–1798`)
- **Bước tái hiện:**
  1. Hai người ở sảnh chờ, tất cả thành viên (trừ Host) đã Sẵn sàng → Host tạm mất mạng (`WAITING` giữ trạng thái hoặc chuyển về `WAITING` khi 1 người mất kết nối) → người này F5 reconnect → `handleJoin` set `connected = 1` nhưng không gọi `this.recomputeLobbyStatus()`, sảnh vẫn kẹt ở `WAITING`.
  2. Gọi `POST /api/boardgame/matches` tạo `CREATED`, không ai nối WS → `__init` không gọi `scheduleNextAlarm()`, bản ghi `CREATED` tồn tại mãi trong DO.
  3. Toàn bộ 4 người chơi trong ván `PLAYING` cùng đóng tab → DO vẫn giữ `alarm()` chạy tự động hết lượt 12s tới tận Vòng 9/10 thay vì hủy trận bỏ hoang sau TTL `5 phút`.
- **Hành vi kỳ vọng:** Reconnect gọi `recomputeLobbyStatus()` + `scheduleNextAlarm(nowMs)`; `__init` đặt alarm dọn `CREATED` quá `BOARD_GAME_RECONNECT_HOLD_MS` nếu 0 người; ván `PLAYING` có toàn bộ người ngồi ngắt kết nối liên tục `>= 5 phút` (`BOARD_GAME_ABANDONED_MATCH_TTL_MS`) sẽ chuyển `CLOSED` sạch sẽ và xóa khỏi directory.
- **Trạng thái tại v3.1:** **Resolved & Verified in v3.1** — Đã bổ sung `recomputeLobbyStatus()` + `scheduleNextAlarm()` khi reconnect sảnh, `BG_REQUEST_SYNC`, dọn phòng `CREATED` quá `BOARD_GAME_RECONNECT_HOLD_MS`, và đóng `CLOSED` các phòng `PLAYING` khi toàn bộ người ngồi ngắt kết nối liên tục `>= BOARD_GAME_ABANDONED_MATCH_TTL_MS` (`5 phút`). Kiểm chứng bởi `test/boardgame-lobby-do.test.cjs` và `test/boardgame-match-do.test.cjs`.

---

### `AUDIT-06` — [P1 · `ENG-06`/`UI`] Chữ Luật v1 Cũ trên Bảng 3D Lounge, Trùng React `key` & Kiểm tra Tương thích Phiên bản

- **Mức độ nghiêm trọng:** **P1 (UI Alignment & Forward Compatibility)**
- **Module ảnh hưởng:**
  - `features/boardgame/world/BoardGameLounge.tsx` (dòng `66–71`)
  - `features/boardgame/ui/BoardGameLobby.tsx` (dòng `533`, `560`)
  - `features/boardgame/ui/ActionPanel.tsx` (dòng `620`)
  - `features/boardgame/network/client.ts` (dòng `527–565`)
- **Chi tiết:**
  - Bảng nội quy 3D trong `BoardGameLounge.tsx:67-68` vẫn ghi *"Khôi phục Tín hiệu đạt 6 điểm"* và *"Đẩy Nhiễu sóng đạt 6 điểm"*.
  - `BoardGameLobby.tsx:533` ghi *"qua 8 vòng"* (thực tế v3 là `9–10` vòng) và cần mô tả rõ điều kiện `Kỷ Luật Nội Trú` khi đã lật vai.
  - `ActionPanel.tsx:620` dùng `key={card.id}` dù bộ bài có 2 bản sao mỗi `card.id` → cảnh báo React duplicate key khi rút 2 lá giống nhau.
  - `BG_STATE_SYNC` / `BG_AUTH_ISSUED` chưa mang `protocolVersion`, và `BoardGameClient` chưa báo lỗi tải lại trang rõ ràng nếu gặp phiên bản `rulesetVersion > 3` hoặc `protocolVersion` mới hơn.
- **Trạng thái tại v3.1:** **Resolved & Verified in v3.1** — Đã cập nhật bảng 3D trong `BoardGameLounge.tsx` theo luật v3, đồng bộ mô tả `9–10` vòng & `Kỷ Luật Nội Trú` trong `BoardGameLobby.tsx` và `docs/features/boardgame-v3-rules.md`, đổi React key tại `ActionPanel.tsx` thành `key={\`${card.id}-${cardIdx}\`}`, gắn `protocolVersion = BOARD_GAME_PROTOCOL_VERSION (1)` kèm kiểm tra forward-compat trên `BoardGameClient`. Kiểm chứng bởi `test/boardgame-lounge.test.cjs` và `E2E-01..E2E-06`.

---

### `AUDIT-07` — [P1 · `E2E`/`CI`] Đường dẫn Cứng Máy Cá nhân & Thiếu Gate Browser E2E trên GitHub Actions

- **Mức độ nghiêm trọng:** **P1 (Release Pipeline Blocker)**
- **Module ảnh hưởng:**
  - `test/boardgame-e2e.cjs` (dòng `32–33`, `51`)
  - `test/boardgame-bg1-smoke.cjs` (dòng `24`, `109`)
  - `package.json`, `.gitignore`, `.github/workflows/ci.yml`
- **Chi tiết:**
  - Trước v3.1, cả hai script Playwright từng trỏ cứng `SHOT_DIR` vào thư mục cá nhân trên máy dev và fallback `playwright-core` vào extension local.
  - `.github/workflows/ci.yml` chỉ chạy trên `main` (`PR` + `push`), không có script `test:boardgame:e2e`, không cài `npx playwright install --with-deps chromium`, không upload artifact screenshot/trace khi lỗi, và mới chỉ chạy kịch bản 4 người cơ bản (chưa đủ 6 kịch bản `E2E-01..E2E-06`: 8p, reconnect 5 điểm, mobile chi tiết, 2 trận đồng thời, hồi quy bảo mật).
- **Trạng thái tại v3.1:** **Resolved & Verified in v3.1** — Đã loại bỏ hoàn toàn đường dẫn máy cá nhân trong repo test/script, cài `playwright-core@1.48.2` vào `devDependencies`, chuẩn hóa `SHOT_DIR = test-results/boardgame` (ignored trong `.gitignore`), thêm script `npm run test:boardgame:e2e`, mở rộng đầy đủ `E2E-01..E2E-06` và cập nhật `.github/workflows/ci.yml` chạy trên `main` + `feat/**` với bước cài Chromium & upload artifact khi lỗi.

---

### `AUDIT-08` — [P2 · `BAL`/`OPS`] Telemetry Cân bằng Còn thiếu (Tỷ lệ Dùng Sự kiện `0,12`, Dawn Tiebreak `56,73%`) & Thiếu Observability/Staging

- **Mức độ nghiêm trọng:** **P2 (Gameplay Quality Analysis & Release Operations)**
- **Module ảnh hưởng:**
  - `test/boardgame-sim.cjs`
  - `worker/src/boardgame-room.ts`, `worker/src/boardgame-router.ts`, `worker/wrangler.toml`
- **Chi tiết:**
  - Phân tích sơ bộ `test/boardgame-sim.cjs:454–478, 646–730` cho thấy nguyên nhân lớn khiến trung bình dùng thẻ Sự kiện chỉ đạt `0,12`/ván xuất phát từ heuristic của bot simulation (Pha 2 hầu như không rút `'event'`, Pha 3 đặt `INVESTIGATE`/`ATTACK` ưu tiên tuyệt đối trước `PLAY_EVENT`). Cần tách riêng đo đạc nguyên nhân thật của bot vs usability thẻ trước khi cân nhắc chỉnh nhẹ nếu cần thiết.
  - Cần bổ sung số liệu thời điểm tự lật vai (`R1–R3` vs `R4+`), phân tích biên độ `guardWatchControl` vs `mistStealthControl`, mô hình thời lượng người thật, kế hoạch UAT, structured JSON logging an toàn (zero secret), và môi trường `[env.staging]` không phá hủy migration trên `wrangler.toml`.
- **Trạng thái tại v3.1:** **Resolved & Verified in v3.1** — Đã hoàn tất observability JSON không rò rỉ bí mật (`worker/src/boardgame-observability.ts`, `GET /api/boardgame/health`), `[env.staging]` trên `worker/wrangler.toml`, mở rộng telemetry 4.500 ván (`test/boardgame-sim.cjs`), báo cáo phân tích cân bằng (`boardgame-v3.1-balance-analysis.md`) và kế hoạch playtest (`boardgame-v3.1-uat-plan.md`).
