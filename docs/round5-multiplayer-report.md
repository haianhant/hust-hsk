# Đợt 5 — Multiplayer: nhiều người cùng vào trường (tên + MSSV)

**Ngày:** 2026-11-07. **Trạng thái:** XONG + kiểm chứng (chưa deploy, chưa push GitHub — parent push file text qua connector, Vercel tự deploy từ main).

**Yêu cầu user (07/11 16:18):** "quên chưa làm kiểu nhiều người cùng vào web với điền tên, mã số sinh viên rồi, cần connect cloudflare gì không" — đã chốt: CẦN Cloudflare như bên chùa; làm luôn; bảng tên hiện TÊN + MSSV.

## 1. Worker Cloudflare `hust-hsk-rooms` — ĐÃ LIVE

- **Script:** `hust-hsk-rooms` (mới riêng, không dùng chung Worker chùa), account `692d45feec834c9219a6e331393bbc5c`, subdomain `hunganhz179`.
- **URL:** `wss://hust-hsk-rooms.hunganhz179.workers.dev/ws` · `GET /health` · `GET /api/rooms`.
- **Durable Object:** class riêng `HskRoom`, binding `HSK_ROOM`, migration v1 `new_sqlite_classes ["HskRoom"]`.
- **Phòng:** `hsk-1`..`hsk-5`, tối đa 15 người/phòng, vào phòng đầu tiên còn chỗ (kiểm tra count trước khi forward request, giữ nguyên WebSocket upgrade + header `x-room-id`).
- **Trạng thái phòng chỉ trong bộ nhớ (in-memory)** — không lưu tên/MSSV/vị trí vào storage/log. `/api/rooms` chỉ trả số người mỗi phòng, KHÔNG trả tên/MSSV.
- **Upload:** lần đầu 2026-11-07 09:28 UTC (HTTP 200, id `hust-hsk-rooms`, deployment `0aa31c49818b4365bfb3e69f8fdcd648`); enable subdomain HTTP 200 `enabled: true`. Helper `cloudflare_api.py` đã mở rộng `--binding-name`/`--class-name` (mặc định cũ `TEMPLE_ROOM`/`TempleRoom` giữ luồng chùa); re-upload phải `--no-migration`.
- **Kiểm chứng live từ VM (curl qua egress proxy, 2026-11-07 11:0x UTC):**
  - `/health` → `{"ok":true,"rooms":["hsk-1","hsk-2","hsk-3","hsk-4","hsk-5"],"capacity":15}`
  - `/api/rooms` → 5 phòng × 0 người, capacity 15.
- **Env Vercel đã set 2026-11-07:** `NEXT_PUBLIC_HUST_MULTIPLAYER_WS_URL = wss://hust-hsk-rooms.hunganhz179.workers.dev/ws` (type `encrypted`, Production + Preview). Env chỉ có hiệu lực sau deploy lại — frontend có fallback hardcode cùng URL nên bản build hiện tại vẫn nối được. Code Worker: `worker/` (`src/index.ts`, `src/room.ts`, `wrangler.toml`, `package.json`, `tsconfig.json`, `README.md`).

## 2. Protocol (tóm tắt)

| Hướng | Tin | Nội dung chính |
|---|---|---|
| Client → server | `join {sessionId, name, mssv}` | MSSV phải đúng 8 chữ số, sai → `error` "MSSV phải là 8 chữ số" |
| Client → server | `move {x, z, facing, state}` | state: `idle`/`walking`/`running`/`riding` |
| Client → server | `state {state}`, `ping` | đổi trạng thái / giữ kết nối |
| Server → client | `welcome {id, roomId, players, count}` | danh sách người đã ở trong phòng |
| Server → client | `join`, `leave`, `move`, `state`, `count`, `full`, `error`, `pong` | broadcast |

**Giới hạn server:** kẹp biên campus x −96..96, z −76..86; tốc độ đi/chạy ≤ 7 m/s, lái xe ≤ 15 m/s (xe tối đa 14); vị trí nhảy quá xa bị kẹp về khoảng đi được kể từ lần cập nhật trước (client phải gửi lặp lại vị trí đích để server đuổi kịp — xem §5.4); tên tối đa 30 ký tự, đã lọc ký tự nguy hiểm; rate limit 20 msg/s (vượt: bỏ tin; vượt gấp đôi: đóng socket); kết nối lại cùng sessionId thay thế socket cũ (không trùng avatar).

## 3. Frontend (file mới + sửa)

**Mới:**
- `lib/identity.ts` — `Identity {name, mssv}`, localStorage `bkhn-identity-v1`, session `bkhn-session-id`; `MSSV_RE = /^\d{8}$/`; `validateIdentity` (tên 1..30 ký tự; MSSV 8 chữ số); `loadIdentity`/`saveIdentity`/`clearIdentity`/`getSessionId`. KHÔNG hardcode tên/MSSV ai vào code.
- `lib/multiplayer.ts` — singleton `multiplayer`, `RemotePlayer {id, name, mssv, color, x, z, facing, state}`, `MpStatus 'idle'|'connecting'|'online'|'offline'`. URL từ env `NEXT_PUBLIC_HUST_MULTIPLAYER_WS_URL`, fallback `wss://hust-hsk-rooms.hunganhz179.workers.dev/ws`. Reconnect backoff 1 s → 15 s, tối đa 10 lần; heartbeat ping 30 s; `sendMove` 10×/giây khi đổi. `move`/`state` KHÔNG emit React update (vị trí đọc trực tiếp qua ref trong useFrame) — chỉ emit khi welcome/join/leave/count/full/error/đổi status.
- `components/three/RemotePlayers.tsx` — mỗi người khác là `HumanFigure` variant polo, màu áo `player.color` (hash từ sessionId, bảng 8 màu, KHÔNG có đỏ HUST `#DA1E26` để người chơi chính luôn nhận ra), quần `#2B2F36`, giày trắng, balô tối; bảng tên `Billboard` NGOÀI nhóm xoay (như `Npc.tsx` — không thì chữ đọc ngược), canvas 512×64, plane 1,6×0,2 m, chữ "Tên (MSSV)", tự co cỡ chữ nếu tên dài; nội suy vị trí về target (kẹp tốc độ theo trạng thái; nhảy cóc nếu lệch > 8 m); facing nội suy góc ngắn nhất; đi/chạy vung chân tay; đứng yên thở nhẹ; lái xe thì tư thế ngồi + xe máy đơn giản vẽ inline. Chỉ re-render React khi danh sách người (id) thay đổi. Hook debug `window.__bkhnMpRender()` trả vị trí render thực tế (đã nội suy) của từng người khác.
- `test/ws-shim/server.js` + `package.json` — shim mirror logic `room.ts` (port 8788), `test/ws-shim/test-clients.js`.
- `test/mp-protocol.cjs`, `test/mp-client.cjs`, `test/mp-offline.cjs` (xem §6).

**Sửa:**
- `lib/playerState.ts` — thêm `facing: -Math.PI/2`, `riding: false` vào `playerState`.
- `components/three/Player.tsx` — useFrame ghi `playerState.facing` + `playerState.riding` mỗi frame; `teleport`/`fastTravel`/`mountBike`/`dismountBike` ghi `playerState.pos` (và `facing`/`riding`) NGAY LẬP TỨC, không chờ frame sau (xem §5.2).
- `components/three/CampusScene.tsx` — mount `<RemotePlayers />` ngoài sân (không mount trong phòng học).
- `app/page.tsx` — màn hình vào thêm thẻ identity (form "👤 Bạn là ai trong trường?" với ô `id="identity-name"`, `id="identity-mssv"` chỉ nhận chữ số, tối đa 8 khi chưa có identity; khi đã lưu hiện gọn "👤 Tên (MSSV)" + nút "Đổi tên/MSSV"). `tryEnter(resumeQuest)` mới: validate identity → lỗi hiện `<p role="alert">` + mở lại form, không vào; đúng thì `saveIdentity`, `multiplayer.connect(getSessionId(), name, mssv)`, rồi `enterCampus`. Mọi điểm vào trường đều qua `tryEnter`. `goToMenu` thêm `multiplayer.disconnect()`. Cầu nối vị trí (interval 100 ms, gửi khi đổi > 0,05; không gửi khi trong phòng học; không gửi điểm/quest/SRS; gửi lại vị trí hiện tại tối thiểu 2 lần/giây kể cả khi đứng yên — xem §5.4). HUD chip góc trái trên (`data-testid="mp-chip"`): online → "👥 Phòng hsk-1 · N người"; connecting → "👥 Đang kết nối…"; offline → "👥 Chơi một mình (mất kết nối)". Test hook `window.__bkhnMp()` trả snapshot.
- `tsconfig.json` gốc — thêm `"worker"` vào `exclude` (worker có tsconfig riêng). `lib/multiplayer.ts` dùng `Array.from(...)` thay spread iterator (tsconfig gốc target mặc định ES5, spread iterator lỗi TS2802).
- **Test hồi quy cũ cập nhật theo identity (đợt 5):** `test/verify-step4fix.cjs` (`enterFresh` điền form nếu hiện; run C-fix seed identity trong addInitScript; run E-fix mobile timeout selector 30 s → 60 s + điền form), `test/fast-travel-check.cjs` (`enterFresh` điền form), `test/play-all-quests.cjs` (2 điểm vào điền form nếu hiện), `test/pinyin-input.cjs` (`enterFresh` + điểm vào sau reload của pageB điền form nếu hiện). Lý do: trước đợt 5 bấm `#enter-campus` là vào ngay; từ đợt 5 phải có tên + MSSV hợp lệ mới vào được.

**KHÔNG đồng bộ:** điểm, quest, SRS, sổ lỗi, huy hiệu — vẫn lưu riêng từng máy. KHÔNG người chơi giả, KHÔNG điểm giả, KHÔNG bảng xếp hạng giả.

## 4. Ảnh bằng chứng (`test-shots/r5-mp-*`)

- `r5-mp-entry.png` — màn hình vào với ô tên + MSSV (chụp trong `mp-client`).
- `r5-mp-two-players.png` (góc B) — avatar của B (polo đỏ, giữa) + avatar người khác (áo tím `#8E24AA`, phải) + bảng tên "Hải Anh (20226010)" + HUD "Phòng hsk-1 · 2 người". Crop phóng to bảng tên: `r5-crop-b-tag4.png`.
- `r5-mp-two-players-a.png` (góc A) — avatar của A (polo đỏ, giữa) + avatar người khác (áo tím, trái) + bảng tên "Minh (20226011)" + HUD "Phòng hsk-1 · 2 người". Crop phóng to bảng tên: `r5-crop-a-tag5.png` (bảng tên hơi khuất sau khung cổng Parabol tối nên đọc khó hơn — bản thân tag vẫn render đúng).
- `r5-mp-offline.png` — mất mạng vẫn vào trường chơi được, chip "Chơi một mình (mất kết nối)", không người chơi giả.

## 5. Bốn lỗi thật tìm ra trong lúc test (đã sửa)

### 5.1 Hydration React #425/#418
`useState` initializer đọc `localStorage` (`loadIdentity()`) làm lần render đầu ở client khác bản prerender ở server (form vs dòng đã lưu) → 4× lỗi #425 + 1× #418. Sửa: state identity khởi tạo rỗng/`true` (giống hệt bản server), đọc identity đã lưu trong `useEffect` sau mount. Sau sửa: 0 console/page errors (trừ lỗi WS do proxy VM, xem §7).

### 5.2 Teleport không đồng bộ (playerState chỉ cập nhật trong useFrame)
Sau teleport/dịch chuyển nhanh, người khác thấy avatar đứng yên ở chỗ cũ. Nguyên nhân: cầu nối đọc `playerState.pos` (chỉ cập nhật trong useFrame), còn SwiftShader chậm (frame cách nhau vài giây) nên vị trí sau teleport bị trễ nhiều giây. Sửa: `teleport`/`fastTravel`/`mountBike`/`dismountBike` ghi `playerState.pos` ngay lập tức.

### 5.3 RemotePlayers không vẽ người đã ở trong phòng khi scene mount (lỗi mount)
Người vào sau (B) thấy A trong snapshot nhưng không thấy avatar của A. Nguyên nhân: welcome tới TRƯỚC khi CampusScene tải xong (chunk dynamic + SwiftShader chậm); effect mount chỉ gán `playersRef.current` mà không force re-render, và sau đó không còn sự kiện membership nào kích hoạt re-render. Sửa: `force()` một lần ngay sau khi gán snapshot ở mount.

### 5.4 Nội suy đóng băng khi target đứng yên + cầu nối không gửi lặp lại sau teleport
Hai lỗi liên quan, cùng triệu chứng (avatar người khác kẹt ở chỗ cũ):
- (a) `SPEED_CAP['idle'] = 0` — nội suy kẹp tốc độ theo trạng thái target nên khi người khác teleport rồi đứng yên, figure không bao giờ đuổi kịp chỗ mới. Sửa: tốc độ tối thiểu 4,5 m/s kể cả khi target idle (`Math.max(4.5, SPEED_CAP[target.state])`); nhảy cóc > 8 m giữ nguyên.
- (b) Cầu nối chỉ gửi khi vị trí/hướng/trạng thái đổi > 0,05 — sau teleport, server kẹp tin move đầu tiên về ~0,7 m (7 m/s × 0,1 s) rồi client không gửi nữa vì vị trí local không đổi, nên server kẹt ở bước kẹp đầu tiên (đã gặp: B thấy A dừng ở (-72,6, 11,9) thay vì (-70,14)). Sửa: gửi lại vị trí hiện tại tối thiểu 2 lần/giây kể cả khi đứng yên (`stale` > 500 ms).
- (c) Kẹp delta nội suy 0,1 s/khung → 0,5 s/khung: khung chậm (điện thoại yếu, SwiftShader ~0,4 fps) vẫn bắt kịp vị trí thật; nhảy cóc > 8 m xử lý trường hợp lệch lớn.

## 6. Kết quả test

### 6.1 Protocol qua shim (`test/mp-protocol.cjs`) — 18/18 PASS
Log `test-shots/r5-mp-protocol.log`. Welcome phòng hsk-1; B thấy A trong welcome (tên + MSSV); màu không phải đỏ HUST; A thấy B join; count = 2; B nhận move của A (facing + state); teleport 100 m bị kẹp; vượt biên bị kẹp ±96/−76..86; riding state broadcast; MSSV sai → error không welcome; tên `<script>alert(1)</script>` bị lọc thành `scriptalert(1)script`; reconnect cùng sessionId không trùng (count vẫn 2, socket cũ bị đóng); người thứ 16 vào hsk-2; leave broadcast + count giảm; ping→pong.

### 6.2 Hai client qua shim (`test/mp-client.cjs --shim`, run 14) — 15/15 PASS, EXIT=0
Log `test-shots/r5-mp-client-shim-run14.log` (2026-11-07 10:55 UTC). Identity đã lưu hiện đúng; A online phòng hsk-1; MSSV sai bị chặn; B online cùng phòng hsk-1; A thấy B "Minh (20226011)", B thấy A "Hải Anh (20226010)"; HUD cả hai "Phòng hsk-1 · 2 người"; B thấy A di chuyển khi đi bộ (>0,15 m); B thấy A trạng thái walking/idle; B thấy A hội tụ về chỗ teleport (-70,14) trong 1,5 m; snapshot lúc chụp ảnh: B thấy A `{color:"#8E24AA", x:-70, z:14, facing:0, state:"idle"}`, A thấy B `{color:"#8E24AA", x:-76, z:10, facing:-1.571, state:"idle"}`; **vị trí render thực tế lúc chụp ảnh: B thấy A ở đúng (-68,22), A thấy B ở đúng (-72,22)** — nội suy hội tụ hoàn toàn; 0 console errors; 0 page errors.
- Lưu ý test: SwiftShader ~0,1–0,4 fps với 2 context nên giữ W 8 s chỉ đi được 0–0,6 m (có lượt 0 khung hình chạy trong 8 s) — check di chuyển chỉ chấm khi A nhúc nhích tại chỗ trước đã, không thì SKIP có ghi lý do; teleport + hội tụ render là kiểm chứng chính. HUD check đọc qua `evaluate(querySelector)` thay vì `locator.textContent()` (locator từng timeout 30 s liền dù chip có trong DOM — renderer nghẽn).

### 6.3 Offline (`test/mp-offline.cjs --shim`) — 5/5 PASS, EXIT=0
Log `test-shots/r5-mp-offline.log`. Mất mạng (chặn WS bằng `page.routeWebSocket`) → status offline, vẫn vào trường chơi được; chip "Chơi một mình (mất kết nối)"; không người chơi giả; 0 console errors; 0 page errors.

### 6.4 Kiểm chứng live Worker thật (`test/mp-client.cjs --real`) — CHƯA ĐẠT, rào cản proxy VM
- Run 1: `page.goto` lỗi `ERR_EMPTY_RESPONSE` — proxy áp cho cả server local 127.0.0.1:8339. Đã sửa test: thêm `bypass: '127.0.0.1,localhost'` vào proxy của Chromium.
- Run 2 (log `test-shots/r5-mp-client-real-run2.log`, 2026-11-07 11:00 UTC): 3 passed, 12 failed. Lỗi chính xác: `WebSocket connection to 'wss://hust-hsk-rooms.hunganhz179.workers.dev/ws' failed: Establishing a tunnel via proxy server failed.` — proxy egress của VM không cho mở tunnel WebSocket tới workers.dev (curl HTTPS qua proxy vẫn OK; Node `ws` trực tiếp lỗi EPROTO, qua HttpsProxyAgent timeout 20 s). Cả hai client rơi về chế độ chơi một mình đúng thiết kế ("Chơi một mình (mất kết nối)"), không crash, 0 page errors.
- **Kết luận: chưa chứng minh được hai client thật gặp nhau trên Worker thật từ VM.** Cần kiểm chứng qua trình duyệt managed (parent, `browser.browse`) hoặc user trên điện thoại thật. Worker đã chứng minh live qua curl (§1); protocol + hai client đã chứng minh qua shim (§6.1–6.2).

### 6.5 Hồi quy trên bản build production cuối (không env shim — fallback URL Worker thật)
- `npx tsc --noEmit` exit 0; `npm run build` PASS (First Load JS 239 kB, từ 235 kB — multiplayer thêm ~4 kB).
- Engine `node --test test/learn.test.cjs`: **45/45 pass, 0 fail**.
- `node test/leg-sim.cjs`: **4/4** (leg3 132,4 m, 385 chạm bồn cỏ C1 đông có từ trước, vẫn pass).
- `node test/walk-to-library-door.cjs`: **PASS** (30 m, 7,5 s, 0 chạm).
- `node test/fast-travel-check.cjs`: **19/20** — 19 check chức năng đều PASS; check duy nhất FAIL là `[console-clean]` vì 3 lỗi console `WebSocket ... failed: Establishing a tunnel via proxy server failed` (rào cản proxy VM §6.4, không phải lỗi sản phẩm — trên máy thật có mạng, WS nối được thì không có lỗi này). 0 page error.
- `node test/pinyin-input.cjs`: **11/11 PASS**, 0 page error (console errors 25 — toàn lỗi WS do proxy VM).
- `node test/verify-step4fix.cjs`: **24/24 PASS**, 0 page error (console errors 33 — toàn lỗi WS do proxy VM). Chạy 07/11 ~11:4x UTC. Lưu ý: test này nhạy ngày (không chạy vắt qua 17:00 UTC = 00:00 ICT).
- `node test/play-all-quests.cjs`: **ĐANG CHẠY — cập nhật sau** (bắt đầu ~12:0x UTC 07/11, dự kiến 30–60 phút).

## 7. Còn tồn / chưa xác minh

1. **Kiểm chứng live hai client thật trên Worker thật — CHƯA XONG** (§6.4). Cần parent kiểm chứng qua trình duyệt managed hoặc user trên điện thoại thật. Không báo "đã chứng minh live" cho tới khi thấy hai client thật gặp nhau.
2. **Console errors WS trong VM** — mọi test trình duyệt chạy trên bản production trong VM đều ghi lỗi console `WebSocket ... failed` (proxy chặn tunnel). Đây là rào cản môi trường, không phải lỗi sản phẩm; nhưng lưu ý: trên máy thật mất mạng, console cũng sẽ có các lỗi này (trình duyệt tự log lỗi mạng WS, app không chặn được) — app vẫn chơi một mình bình thường.
3. **Chưa xác minh trên điện thoại/máy thật:** FPS multiplayer, cảm giác khi thấy người khác di chuyển/lái xe ở 60 fps (nội suy + tư thế lái chỉ kiểm bằng ảnh tĩnh SwiftShader), gõ tên/MSSV bằng IME thật, HUD phòng + số người trên màn hẹp.
4. **Biết trước:** cùng tên gõ giống nhau thì server coi là 2 người khác nhau (phân biệt bằng sessionId) — khác Bảng Vàng chùa (chung 1 ô theo tên). Không chống gian lận mạnh (client tự báo vị trí; server chỉ kẹp biên + tốc độ). Ngoại tuyến hoặc trong phòng học thì không thấy người khác (phòng học không mount RemotePlayers — theo thiết kế).
5. Các tồn cũ từ đợt 3–4 còn nguyên (xem PROGRESS.md): FPS/joystick/giọng zh-CN/gõ pinyin IME/lái xe/fade/dropdown Đi nhanh màn hẹp/lùi xe/"Đưa xe về đường" chỗ chật chưa xác minh trên máy thật; biển thư viện bị che nửa dưới khi nhìn rất gần dưới mái hiên; tán liễu/hoa súng/hàng cây bắc; `choose-goal` không chấm đúng/sai (theo thiết kế).

## 8. File thay đổi (để parent push GitHub)

**Worker (mới):** `worker/src/index.ts`, `worker/src/room.ts`, `worker/wrangler.toml`, `worker/package.json`, `worker/tsconfig.json`, `worker/README.md`.

**Frontend (mới):** `lib/identity.ts`, `lib/multiplayer.ts`, `components/three/RemotePlayers.tsx`, `test/ws-shim/server.js`, `test/ws-shim/package.json`, `test/mp-protocol.cjs`, `test/mp-client.cjs`, `test/mp-offline.cjs`.

**Frontend (sửa):** `lib/playerState.ts`, `components/three/Player.tsx`, `components/three/CampusScene.tsx`, `app/page.tsx`, `tsconfig.json`, `test/verify-step4fix.cjs`, `test/fast-travel-check.cjs`, `test/play-all-quests.cjs`, `test/pinyin-input.cjs`.

**Dọn dẹp đã xong:** xóa file chẩn đoán một lần `test/r5-diag-*.cjs` (3 file) và crop thừa `r5-crop-*` (giữ lại `r5-crop-b-tag4.png`, `r5-crop-a-tag5.png` làm bằng chứng bảng tên đọc được). `out/` hiện tại là **bản production cuối** (không env shim — fallback URL Worker thật đã bake sẵn trong `out/_next/static/chunks/app/page-*.js`).

**Đủ điều kiện để parent push GitHub + Vercel tự deploy** (sau khi play-all-quests xong và ghi kết quả vào §6.5): KHÔNG tự deploy, KHÔNG tự push GitHub theo brief.
