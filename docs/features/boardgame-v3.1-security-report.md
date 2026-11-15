# Bóng Đêm KTX v3.1 — Báo cáo Bảo mật & Toàn vẹn Hệ thống (`SEC-01` .. `SEC-07`)

> **Dự án:** HUSTVerse — Bách Khoa 3D (`haianhant/hust-hsk`)  
> **Phạm vi:** `shared/contracts/boardgame.ts`, `features/boardgame/domain/*`, `features/boardgame/network/*`, `worker/src/boardgame-room.ts`, `worker/src/boardgame-router.ts`, `worker/src/boardgame-observability.ts`, `features/boardgame/ui/*`  
> **Ruleset & Protocol:** `BOARD_GAME_RULESET_VERSION = 3`, `BOARD_GAME_PROTOCOL_VERSION = 1`

---

## 1. Mô hình Đe dọa (Threat Model)

1. **Client giả mạo / Gói tin WebSocket độc hại (`T1`):** Attacker nối thẳng WebSocket gửi `BG_FORCE_WIN`, JSON vỡ, payload dư khóa, khóa prototype (`__proto__`, `constructor`, `prototype`, `toString`, `valueOf`), hoặc khung UTF-8 vượt kích thước.
2. **Chiếm quyền ghế / Token Replay (`T2`):** Attacker đoán mã mời, gửi lại `reconnectToken` của trận A sang trận B, spam `BG_JOIN`, hoặc giữ tab cũ sau khi bị thay thế.
3. **Rò rỉ thông tin ẩn (`T3`):** Rò rỉ `roleId`, `faction`, `hp`/`maxHp` trong khi `PLAYING`, `hand`, `protegePlayerId`, `privateNotes`/`privateClues`, `rngState`, `reconnectToken` của người khác, MSSV 8 chữ số, hoặc suy luận gián tiếp phe ẩn qua hiệu ứng phụ công khai (như *Kỷ Luật Nội Trú* khi chưa lật vai hoặc `handCount` công khai của Vy).
4. **Lạm dụng tài nguyên / Rác Durable Object (`T4`):** Flood REST/WS, ép `turnTimeoutMs` về `1.5s` để tự đánh bại người chơi thật, bỏ hoang phòng `CREATED`/`PLAYING` không giải phóng.
5. **Cross-Origin WS/HTTP & XSS hiển thị (`T5`):** Origin lạ mở kết nối tới `/api/boardgame/*` hoặc `/ws/boardgame`, hoặc nhúng ký tự điều khiển / `<script>` vào `displayName` / chat.

---

## 2. Kiểm soát Bảo mật Đã Triển khai (`SEC-01` .. `SEC-07`)

| Mã kiểm soát | Hạng mục | Cơ chế kỹ thuật thực thi | Bằng chứng kiểm thử |
|---|---|---|---|
| **`SEC-01`** | **Runtime Payload Validation & Anti-Prototype-Pollution** | `isSafePlainObject`, `validateBoardGameActionPayload`, `validateBoardGameClientMessage` (`shared/contracts/boardgame.ts`) kiểm tra strict whitelist toàn bộ loại lệnh & trường dữ liệu; từ chối khóa `__proto__`/`constructor`/`prototype` và trường thừa. `Object.freeze` + `Object.hasOwn` tại `ROLES_BY_ID`, `CARDS_BY_ID`, `KTX_LOCATION_MAP` (`roles.ts`, `cards.ts`, `rules.ts`), `isValidLocationId` (`effects.ts`), `adaptLegacyEngineState` (`boardgame-room.ts`). Kiểm tra `TextEncoder.encode(rawStr).byteLength <= MAX_WS_PAYLOAD_BYTES` (`8192`). | `test/boardgame-engine.test.cjs`, `test/boardgame-match-do.test.cjs` `(6)`, `E2E-06` |
| **`SEC-02`** | **Auth, CSPRNG & Session Integrity** | `generateInviteCode()` & token kết nối 256-bit bắt buộc `globalThis.crypto.getRandomValues`; SQLite chỉ lưu `SHA-256` hex (`reconnect_token_hash`), không bao giờ lưu hay broadcast plaintext token của người khác. `handleJoin` kiểm tra `reconnectToken` ở **mọi trạng thái** (`WAITING` lẫn `PLAYING`), từ chối sai/ngoại lai bằng `BG_ERROR('UNAUTHORIZED')`; client tự xóa token hỏng khi gặp `UNAUTHORIZED`. Fencing tab cũ mã WS `4001` (`BG_WS_FENCE_CLOSE_CODE`). | `test/boardgame-lobby-do.test.cjs`, `test/boardgame-match-do.test.cjs` `(2)(5)`, `E2E-03`, `E2E-06` |
| **`SEC-03`** | **Server-Authoritative Secret Separation** | Mọi phép chia vai, tráo bài và xử lý lượt chạy trên DO; PRNG tất định (`rngState`) không bao giờ đi ra `BG_STATE_SYNC`. `publicGame` loại bỏ toàn bộ `hp`, `maxHp` khi `PLAYING`, `hand`, `protegePlayerId`, `privateNotes`, `privateClues`, `finalReveal`. Khán giả (`isSpectator = true`) nhận `privateView: null` và bị chặn gửi mọi thao tác thay đổi ghế/lượt. `MatchPostcard` và mọi bản tin WS quét xóa MSSV 8 chữ số thành `HUST`. | `test/boardgame-engine.test.cjs` (`GV3.1..3.4`), `test/boardgame-e2e.cjs` (`E2E-01`, `E2E-02`), `test/boardgame-sim.cjs` (`botAccessViolations === 0`) |
| **`SEC-04`** | **Anti-Leak cho Cơ chế Ẩn danh (`Vy` & `Kỷ Luật Nội Trú`)** | Khi **Vy (`suong-tin-gia`)** đã lật vai: `BoardGamePublicPlayerView.handCount = null` (`projections.ts`), đồng thời `DEFEND`, `inv-08`, `inv-09` và nội tại Lan đều che thành `? lá (bị nhiễu)`. **Kỷ Luật Nội Trú** chỉ gây sốc công khai (`2` thương, min `1 HP`), rơi `1` trang bị và ghi Highlight/Log công khai khi Gác Đèn đã lật vai (`actor.revealed === true`); khi chưa lật (`false`), chỉ áp dụng `skillCooldown = Math.max(skillCooldown, 2)` kèm ghi chú riêng tư. | `test/boardgame-engine.test.cjs` (`GV3.4`), `test/boardgame-match-do.test.cjs` |
| **`SEC-05`** | **Origin Allowlist & CORS** | `resolveAllowedBoardGameOrigin()` (`worker/src/boardgame-router.ts`) chỉ chấp nhận `https://hustverse.vercel.app`, subdomain preview hợp lệ `^https:\/\/hust[a-z0-9-]*\.vercel\.app$` và `localhost`/`127.0.0.1`; origin lạ nhận `403` + log `ORIGIN_REJECTED`. | `worker/src/boardgame-router.ts`, `test/boardgame-lobby-do.test.cjs` |
| **`SEC-06`** | **Rate Limiting & Anti-Abuse (`turnTimeoutMs` Clamp)** | HTTP IP limit: `/api/boardgame/matches` (`20/phút`), `/api/boardgame/join-table` (`30/phút`), `/api/boardgame/join-by-code` (`45/phút`). Per-socket limit (`boardgame-room.ts`): `MAX_MSGS_PER_WINDOW = 25` / `2s`, `MAX_JOINS_PER_WINDOW = 5` / `2s`, `MIN_ACTION_INTERVAL_MS = 25ms`, `EMOTE_COOLDOWN_MS = 1500ms`. `clampBoardGameTurnTimeoutMs()` khóa khung `[15_000, 90_000]` trên production/staging (chỉ cho phép `>= 1_500ms` khi biến test `ALLOW_SHORT_TURN_TIMEOUT === '1'`). | `worker/src/boardgame-room.ts`, `worker/src/boardgame-router.ts`, `test/boardgame-match-do.test.cjs` `(6)` |
| **`SEC-07`** | **Safe Observability (Zero Secret Logging)** | `boardgame-observability.ts` chỉ chấp nhận danh sách trường an toàn định sẵn (`BoardGameLogEntry`), xóa ký tự điều khiển và thay `\b\d{8}\b` thành `HUST`. Tuyệt đối không ghi token, `tokenHash`, vai chưa lật, bài trên tay, hay `game_state_json`. | `worker/src/boardgame-observability.ts`, `GET /api/boardgame/health` |

---

## 3. Rủi ro Còn lại & Giới hạn Đã Biết (Residual Risks)

1. **In-Memory HTTP IP Buckets trên Worker Edge Isolate (`ipCreateBuckets`):** Map giới hạn IP đặt theo isolate của Cloudflare Worker (không dùng Redis/KV phân tán), mang tính phòng thủ lớp ngoài trước DoS cơ bản; phòng thủ bền vững dựa vào Cloudflare WAF/Rate Limiting Rules nếu traffic tăng đột biến.
2. **Độ trễ mạng Edge / Tái tạo WebSocket Hibernation:** Đã kiểm chứng qua `boardgame-do-harness.cjs` (bao gồm hibernation & SQLite reload); hiệu năng thực tế trên datacenter Cloudflare toàn cầu cần theo dõi thêm sau khi deploy lên `[env.staging]`.
3. **Kênh ngoài game (Ngồi cạnh nhìn màn hình / Discord):** UI mặc định úp thẻ vai & bài tay (`roleHiddenOnScreen = true`) để chống nhìn lướt màn hình vật lý, nhưng giao tiếp giọng nói ngoài đời thực thuộc phạm vi quy ước nhóm chơi (đã đưa vào kịch bản hướng dẫn `boardgame-v3.1-uat-plan.md`).
