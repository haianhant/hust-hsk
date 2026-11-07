# Báo cáo đợt 3 — Giai đoạn 5: Dịch chuyển nhanh (06–07/11/2026)

> Chỉ làm giai đoạn 5 của `docs/round3-brief.md` §5. Không sửa
> `StudentAvatar` / `Npc` / `LibraryBuilding` / `Trees` / `TienLake` /
> `Motorbike.tsx` / `lib/learn/*` (ngoài nút "Đi tới đây" trong
> `QuestPanel.tsx` — phần tùy chọn của brief, đã làm), không sửa
> `PROGRESS.md` / `NEXT_STEPS.md`, không deploy, không chạm
> `hoc-hsk` / `chua-online`. Không đổi `LIBRARY` / collider / đường /
> `BIKE_PARK` đã chốt ở giai đoạn 2 và 4.

## 0. Kết quả chốt

Nút **"🚀 Đi nhanh"** trong HUD (góc dưới-phải, `#fast-travel`) và trên
bản đồ (`#minimap-fast-travel`), mở **6 điểm đến ngay từ đầu**, chọn →
fade đen 350 + 350 ms → xuất hiện đúng vị trí an toàn, đúng hướng nhìn,
không kẹt, không trôi. Đang lái xe thì tự dừng xe, người về đi bộ tại
đích, xe về điểm đỗ hợp lệ gần đích (đúng cơ chế giai đoạn 4, không nhân
bản). Chỉ đổi vị trí — không cộng điểm, không tự tiến quest (đo bằng
localStorage trước/sau: 0 điểm, `completedQuests` rỗng, `stepIndex`
không đổi qua các lần dịch chuyển thuần túy).

**Test hồi quy mới `test/fast-travel-check.cjs`: 20/20 PASS, 0 console
error, 0 page error** (lượt chạy 3, server riêng :8340, ~8,5 phút).
Hồi quy cũ: `tsc` exit 0; `npm run build` PASS ra `out/`; engine
45/45; leg-sim 4/4; `verify-step4fix` **24/24, 0 lỗi** (chạy 00:49–
00:58 ICT 07/11, hoàn toàn trong một ngày ICT — không vắt qua 17:00 UTC).

## 1. Sáu điểm đến (single source of truth: `FAST_TRAVEL_DESTINATIONS`, `lib/campus.ts`)

Hướng nhìn: `yaw` = góc camera (hướng nhìn = (−sin yaw, −cos yaw));
`facing` = hướng mặt avatar = atan2(dirX, dirZ). Tất cả đã kiểm bằng
đúng `resolveCollisions` thật với bán kính avatar 0,4 m: mỗi điểm là
**điểm bất động** của hàm đó (đặt vào thì trả về đúng điểm đó).

| # | Điểm đến | Tọa độ (x, z) | yaw / facing | Lý do an toàn |
|---|---|---|---|---|
| 1 | Nhà C1 | (-58, -43.5) | 0 / π (nhìn bắc về cửa) | Xem §1.1 — không phải (-58,-45.5) như gợi ý ban đầu |
| 2 | Thư viện Tạ Quang Bửu | (38, 15) | π / 0 (nhìn nam về cửa + đồng hồ) | Phía **bắc**, ngoài sảnh mới sau xoay 180°: trong plaza (minZ 14), cách mặt collider bắc (minZ 19,5) 4,5 m, cách cửa kính (z 21,44) 6,4 m, giữa 2 cau (33/43, 15,5) |
| 3 | Hồ Tiền | (24, 40) | π/2 / −π/2 (nhìn tây ra hồ) | Trên đường ven bờ đông (x = 24), cách mép bờ kè đông (x 21,1) 2,9 m, ngoài mặt nước |
| 4 | Cổng Parabol | (-88, 10) | −π/2 / π/2 (nhìn đông vào sân) | Giữa 2 chân cổng (lối đi z 6..14), ngoài collider chân cổng |
| 5 | Khu C9 | (-29, -2) | π/2 / −π/2 (nhìn tây về C9) | Phía đông cầu thang đỏ mặt đông C9 (thang x −32,6..−29,6), cách mép thang 0,6 m |
| 6 | Điểm bắt đầu | (-76, 10) = SPAWN | −π/2 / π/2 (nhìn đông) | Đúng SPAWN, trên đường chính |

### 1.1. Điểm C1: (-58, -43.5), không phải (-58, -45.5)

Điểm gợi ý (-58, -45.5) nằm **trong** collider bậc tam cấp C1
(z −49,5..−43,8): `resolveCollisions` đẩy nó ra (-58, -43.5) — mặt
nam của bậc, ngay trước bệ I LOVE BK. Điểm này nằm đúng ngưỡng chạm
của 2 collider kề (bậc + bệ) nên `resolveCollisions` vẫn ghi
`hit='Bệ chữ I LOVE BK'` dù vị trí trả về không đổi (moved = 0,00):
đó là **cân bằng chạm, không phải lún vào vật cản** — test hồi quy
kiểm bằng `moved`, không kiểm `hit` (lượt chạy 1 từng FAIL oan ở đây
vì kiểm `hit === null`; đã sửa test, xem §5). Từ (-58, -43.5), cách
trigger cửa lớp (-58, -45.5) đúng 2,0 m < bán kính trigger 2,5 m nên
tới nơi là hiện ngay "E — Vào phòng học". Chip khu báo đúng
"Quảng trường C1".

### 1.2. Điểm C9: (-29, -2), không phải (-28, -2)

Đứng ở x = −28 sẽ rơi vào hình chữ nhật hồ nới 4 m của `nearestZone`
nên chip khu báo nhầm "Hồ Tiền"; (-29, -2) báo đúng "Nhà C9" (kiểm
bằng `/tmp/ft-c9.cjs`). Đây là quirk có sẵn của `nearestZone`, không
đổi logic đó trong giai đoạn này.

### 1.3. Ảnh từng đích sau khi tới (`test-shots/r3-ft-*.png`)

| Ảnh | Đọc được gì |
|---|---|
| `r3-ft-spawn.png` | Trên đường chính, nhìn đông vào trường; Minh ở trước mặt, xe đỗ (-70, 14,5) bên phải |
| `r3-ft-parabol.png` | Đứng giữa 2 chân cổng, nhìn đông vào sân; Minh + xe ở xa trên đường |
| `r3-ft-c9.png` | Trước cầu thang đỏ lan can đỏ, nhìn tây về C9; chip khu "Nhà C9" |
| `r3-ft-lake.png` | Trên đường bờ đông, nhìn tây ra mặt hồ sen; chip khu "Hồ Tiền" |
| `r3-ft-library.png` | Sân trước cửa bắc mới, nhìn nam vào cửa kính + cột hiên; chip khu "Thư viện Tạ Quang Bửu" |
| `r3-ft-c1.png` | Trước bậc tam cấp, nhìn bắc về mặt tiền C1; tim đỏ I LOVE BK che một phần người từ góc camera mặc định (xem §6.3) |
| `r3-ft-library-door.png` | Chuỗi 5: đi bộ từ (38, 15) tới (38, 19,1) — sát mặt collider bắc, ngay trước bậc + cửa kính mới |
| `r3-ft-bike-c1.png` | Chuỗi 4: người ở C1 (đi bộ), xe đỗ (-58, -41) ngay sau lưng người, trên quảng trường |

## 2. Cơ chế chuyển cảnh + chống bấm chồng

- **Nút + panel:** HUD góc dưới-phải (`#fast-travel` + panel
  `data-testid="fast-travel-panel"`, 6 nút `fast-travel-<id>`) và trên
  bản đồ (`#minimap-fast-travel` + `minimap-fast-travel-<id>`).
  Dòng gợi ý mới trong hộp "Cách di chuyển": "🚀 Đi nhanh — nút
  'Đi nhanh' góc dưới-phải / trên bản đồ".
- **Trình tự** (`doFastTravel`, `app/page.tsx`): khóa bấm chồng ở tầng
  page (`travelingRef`, đồng bộ) → đóng panel học/menu (mở khóa
  `uiLocked`) → fade đen 350 ms → `__bkhn.fastTravel(destId)` đặt
  người xuống → fade về 350 ms → mở khóa. Toast "Đã tới \<tên\>."
- **Đặt người xuống** (`fastTravel`, `Player.tsx`): vị trí qua
  `resolveCollisions` (lưới an toàn — các điểm đã là điểm bất động);
  `facing` + `yaw` + `pitch 0,18` + camera `dist 7` đặt lại từ đích;
  `moveBlend = 0`; xóa sạch phím đang giữ (`keysRef`, `playerInput.move`,
  `bikeInput`) để không kẹt phím/tự di chuyển sau khi tới.
- **Nền + collider khu đích:** không cần tải thêm — toàn bộ scene và
  collider là hằng số module-level, đã có sẵn từ lúc vào trường; điểm
  đến vẫn chạy qua `resolveCollisions` trước khi đặt xuống.
- **Chống bấm chồng (2 lớp):** page `travelingRef` chặn ngay trong
  cùng một nhịp bấm; Player `fastTravelState.traveling` chặn ở tầng
  hook (trả `{ ok: false, reason: 'busy' }`, tự mở lại sau 900 ms —
  phủ fade 350 + 350 ms). Test: 3 lần gọi hook đồng bộ →
  `[{ok:true}, {reason:'busy'}, {reason:'busy'}]`, `count` chỉ tăng 1
  (7→8), vị trí cuối đúng đích lần đầu; hết khóa thì đi lại bình thường.
  Trạng thái đếm trong `fastTravelState` (`lib/playerState.ts`):
  `{ traveling, count, lastDestId }`, đọc qua `__bkhn.getFastTravel()`.
- **Đang trong phòng học:** Player tự ra khỏi phòng trước (dispatch
  `bkhn:classroom`, page đồng bộ) rồi đặt người xuống campus — không
  kẹt trong phòng.

## 3. Xử lý khi đang lái xe (chuỗi 4, brief §6)

`fastTravel` trong Player: `riding=false`, `speed/steer/lean=0`,
`bikeInput` về 0, rồi đỗ xe bằng **đúng cơ chế giai đoạn 4**:
`findFreeSpotNear(đích, 2,5, 8)` → `findFreeSpotNear(nearestRoadPoint(đích), 0, 4)`
→ fallback `BIKE_PARK`; đầu xe hướng về phía người. Không nhân bản
xe (Motorbike chỉ mount 1 lần, `instances` vẫn = 1).

Đo thật (chuỗi 4, `test/fast-travel-check.cjs`): lên xe ở điểm đỗ →
dịch chuyển tới C1 → `riding=false`, `instances=1`, xe ở (-58, -41),
cách đích 2,5 m, `resolveBikeCollisions(xe, 0,55).hit = null` → đi bộ
ngang quảng trường bằng phím D (x −58 → −57,2) → prompt
"E — Vào phòng học" → bấm E → `isInClassroom=true` (vào được phòng học).

## 4. "Đi tới đây" trong bảng nhiệm vụ — ĐÃ LÀM (tùy chọn)

`QuestPanel.tsx` thêm prop `onFastTravel` (page truyền
`doFastTravel`):

- Bước `goto-door` → nút "🚀 Đi tới đây — Nhà C1" (`quest-fast-travel`)
  tới đích C1.
- Bước `greet-minh` (talk) → nút "🚀 Đi tới đây — Điểm bắt đầu" tới
  đích spawn (cách Minh ~4,5 m).
- Các bước trong phòng học (bảng/vở/bài tập) không có nút — đã ở đúng
  chỗ, không cần đi đâu.

Test riêng (context 2 tươi): tới bước goto-door → bấm "Đi tới đây" →
tới (-58, -43.5), panel đóng, `stepIndex` 1→1 (không tự tiến bước),
điểm/quest không đổi. Chỉ đổi vị trí, không hoàn thành bước hay cộng điểm.

## 5. Kết quả test

| Kiểm tra | Lệnh / ghi chú | Kết quả |
|---|---|---|
| Type-check | `npx tsc --noEmit` | **exit 0** |
| Build | `npm run build` | **PASS**, ra `out/`, First Load JS 235 kB |
| Engine | `node --test test/learn.test.cjs` | **45/45** |
| Leg-sim đi bộ | `node test/leg-sim.cjs` | **4/4** (leg3 vẫn 385 chạm `Bồn cỏ C1Building (đông)` — có từ trước) |
| Dịch chuyển nhanh | `node test/fast-travel-check.cjs` (server riêng :8340) | **20/20 PASS, 0 console error, 0 page error** (lượt chạy 3, ~8,5 phút; log `test-shots/fast-travel-check.json`) |
| Hồi quy Bước 4–5 | `node test/verify-step4fix.cjs` | **24/24 PASS, 0 console error, 0 page error** (00:49–00:58 ICT 07/11, trong một ngày ICT) |

`test/fast-travel-check.cjs` — 20 bước (2 context): `dests-valid`
(6 đích là điểm bất động của `resolveCollisions`, thư viện z=15 trong
plaza phía bắc); 6 × `dest-<id>` (qua nút HUD: đúng vị trí dPos=0,00,
đúng yaw/facing d≤0,00, không trôi sau 1,5 s, ảnh từng đích);
`progress-unchanged` (localStorage trước/sau 6 lần đi giống hệt);
`chain-library` (chuỗi 5: tới (38,15) rồi đi bộ về nam tới
(38, 19,10) — sát mặt collider bắc z=19,5, cửa kính z=21,44);
`triple-click` + `triple-click-recover`; `panel-open-travel` (sổ tay
mở + giữ W: panel đóng, drift 0,000, `moving=false`);
`chain4-mount` / `chain4-travel` / `chain4-enter` (chuỗi 4, xem §3);
`progress-final` (cuối phiên vẫn 0 điểm, không quest nào tự hoàn
thành — `stepIndex` 2 là do vào phòng học ở chuỗi 4 làm bước
goto-door tiến lên teacher-math theo đúng luật quest cũ, không phải
do dịch chuyển); `quest-goto` ("Đi tới đây"); `minimap-travel`
(bản đồ → Hồ Tiền (24,40)); `console-clean` / `pageerror-clean`.

### 5.1. Ba lỗi test đã bắt được và sửa trong lúc làm (ghi lại để khỏi tái phạm)

1. **Lượt 1, `dests-valid` FAIL oan:** kiểm `hit === null` cho C1 —
   điểm (-58, -43.5) nằm đúng ngưỡng chạm của 2 collider kề nên
   `resolveCollisions` ghi hit dù vị trí trả về không đổi (moved 0,00).
   Đã sửa test thành kiểm `moved` (điểm bất động), xem §1.1.
2. **Lượt 1, `panel-open-travel` FAIL oan:** kiểm panel đóng bằng
   `innerText.includes('Sổ tay')` — nút HUD "📖 Sổ tay" lúc nào cũng
   hiện nên luôn false. Đã sửa thành kiểm tiêu đề riêng
   "Sổ tay từ vựng" và chờ đúng chuỗi đó khi mở sổ tay.
3. **Lượt 2, `dest-spawn` FAIL oan (dFace = π):** `uiTravel` chờ vị
   trí — mà vị trí bắt đầu TRÙNG vị trí spawn nên "đạt" ngay trước khi
   chuyển cảnh chạy, đọc `facing` cũ (-π/2). Đã sửa `uiTravel` chờ
   theo `fastTravelState.count` tăng rồi mới chờ vị trí.
   **Lượt 2, FATAL ở chuỗi 4** (`waitText 'Lên xe'` timeout): đứng
   (-70, 12) cách xe 2,5 m — ngoài bán kính lên xe 2,2 m nên prompt
   không bao giờ hiện. Đã sửa test đứng (-70, 13) (cách xe 1,5 m).
   (Lượt 1 FATAL ở `waitText 'Nói chuyện với Minh'` sau bước sổ tay:
   không tái diễn ở lượt 2–3 sau khi tăng timeout 30 s → 60 s; đã
   chứng minh bằng script chẩn đoán riêng `/tmp/ft-debug.cjs` rằng
   prompt hiện sau ~4 s — flaky do SwiftShader chậm dưới tải, không
   phải lỗi code.)

## 6. Lỗi còn tồn / chưa xác minh được

1. **Chip khu sau khi tới C1 bằng chuỗi 4** hiện "Sân trường" trong
   ảnh `r3-ft-bike-c1.png` (trong khi tới C1 bằng vòng 6 đích thì chip
   báo đúng "Quảng trường C1"): đây là **độ trễ poll HUD 200 ms** —
   ảnh chụp ngay sau khi tới, trước nhịp poll tiếp theo cập nhật
   `playerState.zone`; giá trị zone tự nó là đúng
   (`nearestZone(-58,-43.5) = 'Quảng trường C1'`, đã kiểm bằng node).
   Không phải lỗi logic; chỉ là ảnh chụp quá sớm. Không sửa.
2. **Ảnh tới C1:** tim đỏ I LOVE BK che một phần người từ góc camera
   mặc định (camera ở phía nam, bệ chữ nằm giữa camera và người).
   Đây là bố cục có sẵn của quảng trường (biển chữ đứng giữa lối vào),
   không phải lỗi điểm đến — vị trí đo bằng số là đúng, prompt
   "Vào phòng học" vẫn hiện. Nếu khó chịu thì dời camera mặc định sau
   khi tới C1, nhưng đó là thay đổi UX ngoài phạm vi giai đoạn này.
3. **Chưa xác minh:** cảm giác fade/chuyển cảnh trên điện thoại thật
   (mới chỉ là headless Chromium); nút "Đi nhanh" trên bản đồ ở màn
   hình hẹp (bản đồ 150 px + dropdown 200 px trên mobile — chưa có
   bước test mobile riêng cho dropdown này); FPS khi dịch chuyển liên
   tục; dịch chuyển khi đang ở trong phòng học mới kiểm bằng code
   (Player tự dispatch `bkhn:classroom` rồi đặt xuống campus), chưa
   có bước test trình duyệt riêng cho trường hợp đó.
4. **Harness chậm:** `fast-travel-check` chạy ~8,5 phút dưới
   SwiftShader (~1–2 fps); ảnh chụp có thể timeout 120 s khi máy bận
   (đã tăng timeout chụp lên 180 s trong script này). `verify-step4fix`
   vẫn nhạy ngày giờ — không chạy vắt qua 17:00 UTC (00:00 ICT).

## 7. File thay đổi

- Mới: `test/fast-travel-check.cjs`, `test-shots/r3-ft-*.png` (8 ảnh),
  `test-shots/fast-travel-check.json`, `docs/round3-phase5-report.md`
  (file này).
- Sửa: `lib/campus.ts` (chỉ thêm `FAST_TRAVEL_DESTINATIONS` +
  `FastTravelDestination` + `getFastTravelDestination` — KHÔNG đổi
  `LIBRARY`/collider/đường/`BIKE_PARK`), `lib/playerState.ts` (chỉ thêm
  `fastTravelState`), `components/three/Player.tsx` (chỉ thêm hàm
  `fastTravel` + hook `fastTravel`/`getFastTravel` — KHÔNG đổi dấu
  khớp/pha đi bộ/logic lái xe), `app/page.tsx` (nút + panel Đi nhanh,
  `doFastTravel`, truyền `onFastTravel` cho Minimap/QuestPanel, 1 dòng
  hướng dẫn), `components/ui/Minimap.tsx` (nút + dropdown Đi nhanh),
  `components/learn/QuestPanel.tsx` (chỉ thêm prop `onFastTravel` +
  nút "Đi tới đây" ở bước goto-door và greet-minh).
- Không sửa: `StudentAvatar`, `Npc`, `LibraryBuilding`, `Trees`,
  `TienLake`, `Motorbike.tsx`, `lib/learn/*`, `PROGRESS.md`,
  `NEXT_STEPS.md`. Không deploy, không tạo project Vercel, không chạm
  hoc-hsk/chua-online. Script chẩn đoán tạm `/tmp/ft-debug.cjs`,
  `/tmp/ft-cands.cjs`, `/tmp/ft-c9.cjs` nằm ngoài repo (đã ghi lại kết
  quả trong báo cáo này).
