# Báo cáo tích hợp đợt 3 — Bách khoa Hán ngữ 3D (06–07/11/2026)

> Coordinator tự làm tích hợp sau khi 5 worker giai đoạn xong. Thứ tự brief:
> nhân vật → thư viện → cây → xe máy → dịch chuyển nhanh → kiểm tra/bàn giao,
> cộng mục 7 (lỗi gõ "a" + bỏ bắt buộc dấu thanh, user thêm sau) và 2 sửa phát
> sinh ở tích hợp (nhãn tên Minh bị ngược, cành cây lơ lửng).
> KHÔNG deploy — parent deploy. Không chạm hoc-hsk/chua-online.

## 0. Kết quả chốt

Tất cả 5 giai đoạn + mục 7 + 2 sửa phát sinh đã xong và kiểm chứng. Bộ test đầy
đủ trên bản build cuối: **tsc 0; build PASS; engine 45/45; leg-sim 4/4;
smoke-step6 22/22; step8-check 13/13; verify-step4fix 24/24; ride-check 22/22;
fast-travel-check 20/20; pinyin-input 11/11; play-all-quests **48/48** — 0 lỗi
console/page ở mọi lượt chạy. (play-all: lượt 1 đạt 47/48 — chỉ tuyến đầu
l10-g234 timeout lúc máy lạnh; lượt chạy lại thứ 2 chết ở tuyến 21 vì
runtime SIGTERM; lượt chạy lại lần 3 (r3c.log) **48/48 PASS, 0 lỗi**, đã
đối chiếu trực tiếp log + JSON trên đĩa — xem §10.)

## 1. Giai đoạn 1 — Nhân vật ngược (docs/round3-phase1-report.md)

Cả 3 giả thuyết lỗi xác minh ĐÚNG bằng render + log `getPose`:
- (a) Gối gập ngược + sai pha: code cũ `rotation.x` âm (cẳng về trước);
  `|kneeL|` cực đại 0,63 ở phase 0° (giữa thì chống).
- (b) Khuỷu gập ngược + sai pha: `elbow` +0,30…0,60 (cẳng tay về sau).
- (c) Nhãn trái/phải đảo: `armL/legL` gắn ở −X trong khi trái thật là +X
  (chữ HUST ngực trái đã đúng ở +X).
- (d) Đầu/mặt/balô/giày ĐÃ ĐÚNG, không phải lỗi; đi thẳng về trước lệch 0°.

Sửa (chỉ `StudentAvatar.tsx`, `Player.tsx`, `Npc.tsx`): `*L` gắn `side={1}`;
gối `rotation.x = +kneeTarget`, pha mới cực đại ở phase π; khuỷu âm (gập về
trước); bù cổ chân suy lại `foot = −(leg + knee)·0,9`; `getPose` báo góc thô;
NPC khuỷu/gối đổi dấu tương ứng. Giữ polo HUST + cao 1,707 m.

Sau sửa: gối L cực đại +0,57 ở phase 174°; khuỷu âm suốt chu kỳ; đung đưa
chéo 33/40 mẫu; cổ chân tiếp đất đế ≈ 0,001 m; cao neutral 1,711 m. Ảnh:
4 hướng + quay vòng 8 góc + khung hình đi/chạy bên hông ở pha gối max, Minh
đủ 4 hướng, cô giáo trước/bên/sau. Test: tsc 0, build PASS, engine 45/45,
leg-sim 4/4, verify-step4fix 24/24, 0 lỗi.

## 2. Giai đoạn 2 — Thư viện xoay 180° (docs/round3-phase2-report.md)

Một group duy nhất trong `LibraryBuilding.tsx` (`position [76, 0, 64],
rotation-y π`) quanh tâm (38, 32), công thức `(x, z) → (76−x, 64−z)`. Sân
không xoay theo nhà; riêng hàng cau dời sang kẹp lối vào mới.

Sau xoay: **mặt đồng hồ nhìn về phía BẮC của scene (−Z)**, (38, 9.6, 19.9);
sảnh/mái hiên z 16.6..20, cột z 17.2, cửa kính z 21.44; tháp x 36..46 ↔ khối
bên x 30..36; biển tên (38, 12.55, 19.93); cau (33/43, 15.5); đảo cỏ/lộc
vừng giữ ở sân nam (nay là sân sau). Chỉ 1 mặt đồng hồ (ảnh mặt sau từ sân
nam + mặt tây từ hồ chứng minh). `LIBRARY.clock` + `plaza` minZ 18→14;
collider tính lại {29.5..46.5, 19.5..44.6}; đường C1–Thư viện và Thư viện–Hồ
Tiền nối tại (24, 18); thêm 1 fill bắc 0,5 (tường lum 137→163).

Ảnh: top-down đánh dấu + từ bên hồ + mặt chính mới từ phía bắc + closeup +
mặt sau + sân trước cửa mới (`test-shots/r3-lib-*`). Test: tsc 0, build PASS,
engine 45/45, leg-sim 4/4, walk-to-door đích mới PASS (5,5 s, 0 chạm),
verify-step4fix 24/24, 0 lỗi.

## 3. Giai đoạn 3 — Bỏ "sợi dây" dưới tán (docs/round3-phase3-report.md)

Mẫu có dây là `LakeWillow` (`TienLake.tsx`): 8 cành rủ TubeGeometry + 7 cụm
lá dài-mỏng/cành (9 cây ven hồ dùng chung); `DroopingTree` (Trees.tsx) grep
không nơi nào dùng; `ImprovedTree` không có bộ phận rủ. Ảnh cận TRƯỚC thấy
rõ 5–6 sợi xanh dài ~1,5–2 m thả thẳng đứng từ mép tán.

Đã xóa hẳn cành rủ + 72 ống + instancedMesh 504 cụm khỏi mẫu; tán nay 7 cụm
lệch nhau, `sy` riêng từng cụm 0,62–1,0 (hết dẹt đều 0,55), 4 sắc xanh; giữ
thân thuôn + 4 nhánh từ ngọn thân; không thêm collider (liễu vốn không có,
đáy tán ~2,2–2,9 m). Ảnh trước/sau cùng góc (`test-shots/r3-tree-*`, 5 cặp).
Test: tsc 0, build PASS, engine 45/45, leg-sim 4/4, verify-step4fix 24/24,
0 lỗi. Lưu ý: cặp cận bờ đông TRƯỚC/SAU không cùng góc; nhìn từ ngay dưới
tán, khối chính (r 1,75) vẫn chiếm ưu thế — nếu user vẫn thấy "mũ nấm" thì
hướng sửa tiếp là thu khối chính về r ~1,4 (chưa làm, chờ mắt user).

## 4. Giai đoạn 4 — Xe máy (docs/round3-phase4-report.md)

Mới `components/three/Motorbike.tsx`: xe tay ga xanh HUST, dài 1,9 m, yên
cao 0,78 m, bánh r 0,33 m quay theo vận tốc, tay lái + gương + đèn + kính
chắn gió. Đỗ ban đầu `BIKE_PARK` (-70, 14.5) cạnh cổng Parabol, ngoài đường
chính. Nút "🛵 Gọi xe" (1 xe duy nhất, gọi 3 lần vẫn `instances = 1`); "🛵
Đưa xe về đường" (về đúng tim đường, cách 0,00 m). Lên xe bằng E trong
2,2 m; tư thế ngồi đo thật bằng `getPose` (đùi −1,17, gối +1,08 gập đúng
chiều, tay −0,88, khuỷu −0,53, balô không xuyên yên); chỉ xuống xe khi
|v| ≤ 0,5 m/s (E khi đang chạy bị chặn + toast nhắc phanh); xuống xe thử
trái → phải → sau → trước. PC: W ga (6 m/s²), S phanh (11 m/s², chỉ lùi
chậm ≤ 2 m/s khi gần dừng), A/D lái (góc lái thu hẹp theo tốc độ, không
quay tại chỗ khi chạy nhanh); tốc độ tối đa đo thật **13,73 m/s** (~3,5×
đi bộ); nghiêng khi rẽ; chống xuyên tường bằng chia bước ≤ 0,25 m; va chạm
dừng đúng mặt C9 (z = 4,55), bờ kè hồ (x = 21,65), thân cây (z = −18,65);
cửa phòng học chặn vật lý + toast nhắc xuống xe. Mobile: cụm GA/PHANH/◀/▶
64×64 px, chỉ hiện trên thiết bị cảm ứng. Thứ tự ưu tiên prompt E: đang
lái → lên xe → Minh/cửa lớp.

Chuỗi khung hình 99 frame có vị trí/tốc độ (`test-shots/ride-check.json`).
Test mới `test/ride-check.cjs` **22/22**, verify-step4fix 24/24, 0 lỗi.

## 5. Giai đoạn 5 — Dịch chuyển nhanh (docs/round3-phase5-report.md)

Nút "🚀 Đi nhanh" trong HUD + trên bản đồ, 6 điểm đến mở ngay từ đầu
(`FAST_TRAVEL_DESTINATIONS`, `lib/campus.ts`): Nhà C1 (-58, -43.5, nhìn bắc
về cửa — điểm gợi ý (-58, -45.5) nằm trong collider bậc tam cấp nên resolve
đẩy ra đây); **Thư viện (38, 15), nhìn nam — đúng phía bắc, ngoài sảnh mới**
sau xoay 180° (trong plaza minZ 14, cách mặt collider 4,5 m, cách cửa kính
6,4 m); Hồ Tiền (24, 40); Cổng Parabol (-88, 10); Khu C9 (-29, -2); Điểm
bắt đầu (-76, 10) = SPAWN. Fade đen 350+350 ms; chống bấm chồng 2 lớp
(`travelingRef` + `fastTravelState.traveling` 900 ms); đặt lại vị trí/hướng/
vận tốc/camera, xóa phím đang giữ; đang lái → tự dừng, người đi bộ tại
đích, xe về điểm đỗ hợp lệ gần đích (không nhân bản); chỉ đổi vị trí —
không cộng điểm/không tự tiến quest (đo bằng localStorage trước/sau).
"Đi tới đây" trong bảng nhiệm vụ cũng đã làm (goto-door → C1, greet-minh →
Điểm bắt đầu).

Test mới `test/fast-travel-check.cjs` **20/20** (6 đích + chuỗi 4 lái→C1→vào
phòng học + chuỗi 5 tới thư viện rồi đi bộ tới cửa bắc + bấm 3 lần + panel
mở + "Đi tới đây" + bản đồ), verify-step4fix 24/24, 0 lỗi. Ảnh từng đích
(`test-shots/r3-ft-*.png`, 8 ảnh).

## 6. Mục 7 — Lỗi gõ "a" + bỏ bắt buộc dấu thanh (mới, làm ở tích hợp)

User báo: kiểm tra cuối HSK 4 bài 1, từ 加油, gõ "jia" thì "a" không vào ô
(ô chỉ còn "jiyou"); yêu cầu gõ "jiayou" là được, đừng bắt dấu thanh.

- **Gốc lỗi 1:** `Player.tsx`, listener `keydown` toàn cục gọi
  `e.preventDefault()` VÔ ĐIỀU KIỆN cho KeyW/KeyA/KeyS/KeyD (+ mũi tên +
  Shift), kể cả khi đang gõ trong ô `<input>` pinyin — `preventDefault()`
  trên keydown chặn ký tự vào ô. Mọi pinyin chứa w/a/s/d đều không gõ được
  (加油 jiāyóu, 数学 shùxué, 我 wǒ, 大 dà...). Phím E không bị chặn nên
  "jiyou" vẫn vào đủ.
- **Sửa 1:** `onKeyDown`/`onKeyUp` return sớm khi target là input/textarea/
  select/contentEditable — không preventDefault, không thêm vào keysRef
  (nhân vật cũng không đi bộ trong lúc gõ).
- **Sửa 2:** `QuestPanel.tsx` câu gõ pinyin kiểm tra cuối đổi
  `checkPinyin(..., 'tone')` → `'toneless'` (hàm đã có sẵn); prompt thành
  "Gõ pinyin của từ trên (không bắt buộc dấu thanh):"; placeholder
  "Nhập pinyin có dấu…" → "Nhập pinyin…" cho nhất quán (cập nhật assertion
  F6 trong `verify-step4fix.cjs`). Mode `'tone'` giữ nguyên trong
  `pinyin.ts` + unit test riêng cho nhiệm vụ kiểm tra thanh điệu sau này.
- **Test mới `test/pinyin-input.cjs`: 11/11 PASS, 0 lỗi console/page**
  (gõ phím thật, 2 lượt): "wasd" cả 4 ký tự vào ô; drift 0,000 m khi gõ;
  "shùxué" có dấu ĐÚNG; "shuxue"/"tigao" không dấu ĐÚNG; "tigeo" SAI với
  phản hồi "Sai chữ ở vị trí 4: nhập "e" nhưng đáp án là "a""; màn kết quả
  hiện sau 5 câu đúng; vòng ôn lại ngay mở sau 1 câu sai.
- **Hệ quả lên test cũ (đã sửa, không phải lỗi game):** `verify-step4fix`
  B-fix sai cố ý Q1 bằng 'shuxue' (không dấu) — nay đã thành ĐÚNG nên
  flow sai → ôn lại ngay gãy; đã đổi đáp án sai cố ý thành 'shuxie' (sai
  nguyên âm, sai ở cả 2 mode) → verify lại **24/24**.

## 7. Hai sửa phát sinh ở tích hợp

### 7.1. Nhãn tên "Minh" bị ngược ("dniM")
Gốc: `Billboard` của drei chỉ đặt quaternion CỤC BỘ theo camera; nó nằm
trong group xoay `rotationY = π/2` của NPC nên world orientation lệch theo
cha — camera thấy mặt sau của plane, chữ đọc ngược (ảnh TRƯỚC sửa cũng bị
y hệt, lỗi có từ trước, không do giai đoạn 1). Sửa (`Npc.tsx`): tách
`NameLabel` (Billboard) ra ngoài group xoay, chỉ giữ position — áp cho cả
Minh và cô giáo. Xác minh: crop phóng to ảnh `r3-label-minh-east.png` và
`r3-label-minh-south.png` — chữ **"Minh"** đọc xuôi cả 2 góc.

### 7.2. Cành cây lơ lửng (Trees.tsx — user nhắc ở tích hợp)
Đo bằng node trên code thật: 3 nhánh cũ chĩa theo góc cố định ~120°, đầu
nhánh hụt tâm cụm 0,6–1,1 m — 4–5/6 cụm tán không có nhánh nào chạm tới.
Sửa (`ImprovedTree`, `DroopingTree` không nơi nào dùng nên không đụng):
mỗi cụm tán có đúng 1 nhánh (3 → 6), **ngắm thẳng từ ngọn thân tới tâm
cụm** (`tilt = acos(d.y/|d|)`, `az = atan2(-d.z, -d.x)`), dài `dist × 1,08`
(ngọn nằm hẳn trong tán); gốc đặt đúng tại điểm chĩa trên trục thân, bán
kính gốc 0,06–0,08 m < bán kính thân tại đó ~0,10–0,13 m nên gốc nằm hẳn
trong thân (đã cân nhắc chôn gốc sâu 0,3 m dọc trục rồi bỏ: nhánh nghiêng
~77° sẽ đẩy gốc lệch khỏi trục ~0,29 m thành đoạn thừa lơ lửng).
Kiểm chứng bằng số (trích đúng `buildImprovedSpec` từ file, 8 cây mẫu):
**48/48** — ngọn nhánh cách tâm cụm 0,08–0,18 m (bán kính cụm 0,44–1,12 m),
mọi gốc trong thân. Ảnh render `test/r3-tree-branch-shots.cjs`:
`r3-branch-after-love-north.png` + crop phóng to thấy rõ thân chẻ thành
nhánh nâu đi lên chui vào cụm tán. tsc 0, build PASS.

## 8. Kiểm tra + bàn giao (brief §6) — 8 chuỗi

| Chuỗi | Bằng chứng | Kết quả |
|---|---|---|
| (1) đi bộ → quay → chạy → dừng | Giai đoạn 1: khung hình đi/chạy bên hông ở pha gối max, quay vòng 8 góc 45°, đi thẳng lệch 0°; leg-sim 4/4; verify 24/24 | PASS |
| (2) lên xe → tăng tốc → rẽ → phanh → xuống xe | `ride-check` 22/22 + chuỗi 99 frame vị trí/tốc độ (`ride-check.json`) | PASS |
| (3) gọi xe nhiều lần, không nhân bản | `ride-check` bước call-3x (`instances = 1`) | PASS |
| (4) đang lái → dịch chuyển tới C1 → đi bộ vào điểm học | `fast-travel-check` chuỗi 4 (xe về (-58,-41), vào được phòng học) | PASS |
| (5) dịch chuyển tới thư viện sau xoay, đúng phía sảnh mới | `fast-travel-check` chuỗi 5 (tới (38,15) rồi đi bộ tới (38,19.1) sát cửa bắc mới) | PASS |
| (6) đóng bảng học → tiếp tục điều khiển, không kẹt phím/tự tăng ga | `fast-travel-check` panel-open-travel (drift 0,000) + verify B-fix + `pinyin-input` no-walk (drift 0,000) | PASS |
| (7) va chạm góc nhà/thân cây/mép hồ (đi bộ + đi xe) | leg-sim 4/4 (đi bộ) + `ride-check` collide-c9/collide-lake/collide-tree (đi xe, dừng đúng mặt vật cản) | PASS |
| (8) điều khiển trên giao diện điện thoại 390 px | `ride-check` mobile-* (cụm lái 64 px, GA/PHANH, không chồng joystick) + verify E-fix (banner, nút "?") | PASS (trừ dropdown Đi nhanh trên bản đồ ở màn hẹp chưa có bước test riêng) |

## 9. Toàn bộ test trên bản build cuối (sau mọi thay đổi)

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | PASS, `out/` (First Load JS 235 kB) |
| Engine `test/learn.test.cjs` | **45/45** |
| `test/leg-sim.cjs` | **4/4** |
| `test/smoke-step6.cjs` | **22/22**, 0 lỗi |
| `test/step8-check.cjs` | **13/13**, 0 lỗi |
| `test/verify-step4fix.cjs` | **24/24**, 0 lỗi |
| `test/ride-check.cjs` (mới, gđ 4) | **22/22**, 0 lỗi |
| `test/fast-travel-check.cjs` (mới, gđ 5) | **20/20**, 0 lỗi |
| `test/pinyin-input.cjs` (mới, mục 7) | **11/11**, 0 lỗi |
| `test/play-all-quests.cjs` | **48/48**, 0 lỗi (lượt chạy lại lần 3, r3c.log — đã đối chiếu log + JSON trên đĩa; xem §10) |

## 10. Lỗi còn tồn / chưa xác minh được (nói thẳng)

1. **play-all-quests 47/48 (lượt chạy tích hợp, r3.log):** tuyến ĐẦU l10-g234
   timeout 30 s ở bước chờ `questState` thành l10-g234 sau khi bấm chọn bài —
   đúng lượt đầu tiên của phiên (máy lạnh, Chromium/SwiftShader vừa khởi
   động). 47 tuyến còn lại pass, gồm l12–l18 (cùng họ HSK3) và toàn bộ
   HSK4. Không có thay đổi nào ở tích hợp chạm tới đường chọn bài
   (page.tsx/lesson picker/store không đụng). **Lượt chạy lại thứ 2
   (r3b.log, bắt đầu ~21:33 UTC 06/11) đã xác nhận lỗi này là flaky:
   l10-g234 PASS (130→180), 20 tuyến đầu pass liên tiếp — nhưng lượt này
   chết ở tuyến 21 hsk4-shang-l7a: `page.waitForFunction: Target page,
   context or browser has been closed` (trình duyệt bị đóng giữa chừng,
   cùng họ sự cố runtime với 2 lần SIGTERM trước — kết quả session trả về
   sau đó xác nhận: `exitSignal: 15`, `failureKind: subprocess.sigterm`,
   chạy được 1809 s ≈ 30 phút rồi bị kill); script thử reload để
   khôi phục cũng fail (`page.goto: Target page... has been closed`), in
   "DỪNG ĐỢT" rồi dừng — không có dòng tổng kết, không ghi report JSON
   (JSON trên đĩa vẫn là của lượt 47/48, mtime 21:33). 0 lỗi console/page
   trong 20 tuyến đã chạy. Không còn tiến trình node nào chạy. Đang chạy
   lại lần 3 (r3c.log) để khẳng định 48/48.**
   **Lượt chạy lại lần 3 (r3c.log, xong ~23:18 UTC 06/11): 48/48 PASS, 0 lỗi
   console/page — đã đối chiếu trực tiếp log trên đĩa (48 dòng PASS, 0 FAIL,
   dòng tổng kết "PLAY-ALL: 48/48") và JSON report
   (`test-shots/play-all-quests.json`, mtime 23:18:49 UTC: total 48, passed
   48, failed [], consoleErrors 0, pageErrors 0). l10-g234 PASS (130→180,
   126 s). Đợt 3 đủ điều kiện deploy.**
   **CẢNH BÁO VỀ DỮ LIỆU GIAO VỀ:** thông báo nền trả về cho session chạy
   lại thứ 2 ghi "play-all exit: 0" và "PLAY-ALL: 48/48 tuyến PASS" —
   **KHÔNG khớp với bất kỳ file nào trên đĩa** (log r3b chỉ có 20 pass +
   1 fail + "DỪNG ĐỢT"; JSON không bị ghi đè; thời lượng 4376 s trong
   thông báo cũng không khớp ~31 phút của lượt chết). Các số trong thông
   báo đó (vd l20a 6060→6110, 81 s) khác cả lượt 47/48 (l20a 5930→5980,
   94 s) nên không phải là nhầm lẫn với lượt trước. Kết quả session trả
   về sau đó xác nhận lượt đó bị SIGTERM (`exitSignal: 15`, chạy 1809 s).
   Đây là mâu thuẫn trong dữ liệu runtime giao về — **bài học: với các
   lệnh nền dài, chỉ tin file trên đĩa, không tin riêng thông báo giao
   về**. Lượt 48/48 lần 3 đã được xác minh bằng file, không chỉ bằng
   thông báo.
2. **Chưa xác minh trên điện thoại/máy thật:** FPS, cảm giác joystick,
   giọng zh-CN, gõ pinyin + IME thật, cảm giác lái + rung camera ở tốc độ
   tối đa, fade/chuyển cảnh dịch chuyển nhanh, dropdown "Đi nhanh" trên
   bản đồ ở màn hình hẹp, màu đỏ áo #D22630 dưới ánh sáng thật.
3. Lùi xe (S khi gần dừng, tối đa 2 m/s) mới kiểm bằng code, chưa có bước
   test riêng; "Đưa xe về đường" ở chỗ quá chật (`findFreeSpotNear` trả
   null → toast) chưa gặp trong test; bánh trước đổi hướng khi rẽ gấp mới
   đo bằng số `steer`/`lean`, chưa soi ảnh.
4. Mặt bắc mới của thư viện vẫn tối hơn mặt nam cũ một chút (tường lum 163
   so với 187 — đúng vật lý, đã dừng cân ở fill bắc 0,5). Cột hiên/cau mới
   không có collider riêng (như bản cũ). Tán liễu nhìn từ ngay dưới vẫn do
   khối chính chiếm ưu thế (xem §3).
5. **Harness nhạy ngày giờ:** `verify-step4fix` và `step8-check` dùng ngày
   ICT — không chạy vắt qua 17:00 UTC (00:00 ICT); seed `step8-check` đã
   sửa thành ngày tương đối theo ICT (trước đây ghi cứng 2026-11-06 nên
   chạy ngày 07/11 fail oan 2 bước + timeout). `verify-step4fix` thoát
   exit 0 ngay cả khi có FATAL giữa chừng — phải đọc số bước 24/24, không
   tin exit code.
6. **Vận hành:** 2 lần lệnh nền dài bị kill SIGTERM không rõ nguyên nhân
   (pinyin-input ở 167 s; play-all ở ~14,5 phút) kèm `/tmp` bị dọn sạch —
   log kiểm thử từ giờ ghi trong workspace (`test-shots/*.log`) thay vì
   `/tmp`. Các lượt chạy dài khác (36 phút) vẫn sống sót; kill có vẻ
   ngẫu nhiên, không theo quy luật thời gian.
7. leg3 vẫn 385 lần chạm `Bồn cỏ C1Building (đông)` (có từ trước, chặng
   vẫn pass, ngoài phạm vi đợt này).

## 11. File thay đổi / tạo mới (đợt 3)

- Giai đoạn 1: `components/three/StudentAvatar.tsx`, `Player.tsx`,
  `Npc.tsx`; mới `test/r3-phase1*.cjs`, `docs/round3-phase1-report.md`.
- Giai đoạn 2: `components/three/LibraryBuilding.tsx`, `lib/campus.ts`
  (LIBRARY/collider/plaza/đường), `CampusScene.tsx` (fill bắc),
  `test/walk-to-library-door.cjs`; mới `test/shots-r3-library*.cjs`,
  `docs/round3-phase2-report.md`.
- Giai đoạn 3: `components/three/TienLake.tsx` (LakeWillow); mới
  `test/r3-tree-shots.cjs`, `docs/round3-phase3-report.md`.
- Giai đoạn 4: mới `components/three/Motorbike.tsx`,
  `test/ride-check.cjs`; sửa `Player.tsx`, `lib/playerState.ts`,
  `lib/campus.ts` (BIKE_PARK/colliders xe), `app/page.tsx`,
  `CampusScene.tsx`; `docs/round3-phase4-report.md`.
- Giai đoạn 5: `lib/campus.ts` (FAST_TRAVEL_DESTINATIONS),
  `lib/playerState.ts`, `Player.tsx` (fastTravel),
  `app/page.tsx`, `components/ui/Minimap.tsx`,
  `components/learn/QuestPanel.tsx` ("Đi tới đây"); mới
  `test/fast-travel-check.cjs`, `docs/round3-phase5-report.md`.
- Mục 7 + tích hợp: `Player.tsx` (guard ô nhập liệu),
  `components/learn/QuestPanel.tsx` (toneless + prompt + placeholder),
  `Npc.tsx` (NameLabel ngoài group xoay), `Trees.tsx` (nhánh ngắm
  thẳng), `test/verify-step4fix.cjs` ('shuxie' + placeholder F6),
  `test/step8-check.cjs` (seed ngày tương đối); mới
  `test/pinyin-input.cjs`, `test/r3-tree-branch-shots.cjs`,
  `docs/round3-task7.md`, `docs/round3-integration-report.md` (file này).
- Không sửa: `lib/learn/*` (ngoài QuestPanel ở trên),
  `StudentAvatar.tsx` (sau gđ 1), `LibraryBuilding.tsx` (sau gđ 2),
  `Motorbike.tsx` (sau gđ 4). Không deploy, không tạo project Vercel.
