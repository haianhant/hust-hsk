# Báo cáo đợt 4 — Làm lại Thư viện Tạ Quang Bửu theo studywithhuster.cyou

Ngày: 07/11/2026. Trạng thái: **XONG + KIỂM CHỨNG, ĐỦ ĐIỀU KIỆN DEPLOY, CHƯA DEPLOY.**
Phạm vi: chỉ tòa thư viện + tiền cảnh phía bắc của nó. Không đụng C1, C9, cổng
Parabol, Hồ Tiền, đường khác, nhân vật, xe máy, tòa nào khác. Không đụng
hoc-hsk / chua-online. Hướng mặt đồng hồ + sảnh giữ nhìn về bắc scene (−Z)
như đợt 3 đã chốt.

Tư liệu tham khảo: `docs/ref-library-studywithhuster.md` (đọc kỹ trước khi
chạm code; trang hỏi họ tên/MSSV mới cho vào sâu — không nhập thông tin gì,
chỉ xem/xoay khung cảnh mặc định). Trang đó dựng ĐÚNG kiến trúc thư viện,
mấy tòa xung quanh KHÔNG đúng, tiền cảnh trước thư viện đúng.

## 1. Kiến trúc mới làm được gì theo tư liệu

| Tư liệu yêu cầu | Bên mình (đợt 4) | Kiểm chứng |
|---|---|---|
| Một khối tấm đứng duy nhất, mặt tiền 3 nhịp dọc: khối giữa nhô trước + cao hơn một chút, hai cánh lùi sau + thấp hơn ~nửa tầng | Tháp x 27,5..48,5, z 30..43; khối giữa x 32,5..43,5 nhô trước 2 m (mặt z=28), cao 32,6 m; hai cánh lùi sau (mặt z=30), cao 31,0 m (thấp hơn đúng nửa tầng 1,6 m) | Ảnh `r4-lib-wide.png`, `r4-lib-left34.png`, `r4-lib-right34.png` — 3 nhịp đọc rõ |
| Dải kính tối dọc, hẹp, lõm vào giữa khối giữa và cánh phải, chạy suốt chiều cao (lõi thang) | Dải kính x 43,5..44,7, z 28,5..29,9, y 0,6..31,0 | Ảnh `r4-lib-right34.png` — dải tối dọc thấy rõ ở ranh giới khối giữa/cánh phải |
| ~10 tầng (trệt + áp mái); khối giữa tầng trên cùng 9 cửa đứng cao hẹp + dải xanh dương ngang phía trên | 10 tầng (f=0..9); tầng 9: 9 cửa đứng 0,7×2,6 m + dải xanh y 32,2 | Ảnh `r4-lib-wide.png` (lưới cửa đều), crop top-down (xem §4) |
| Các tầng dưới lưới cửa đều (khối giữa 6–7 nhóm/hàng, cánh 4–5 nhóm/hàng, mỗi nhóm 3–4 ô vuông) | Khối giữa 7 nhóm/hàng (5 hàng lộ trên khối đế, f=4..8) + đố trắng; cánh 4 nhóm/hàng (dải kính ngang + 3 đố/nhóm) | Ảnh `r4-lib-wide.png` |
| Tường trắng ngà mờ, kính xanh đen, không ban công | `LIB_WHITE #F2F1E9` roughness 0,9–1; kính `#1E3A5F` emissive; không ban công | Ảnh toàn bộ |
| Khối đế chỉ ôm khối giữa, nhô ra trước tạo mái hiên/sảnh | Đế x 32,5..43,5, z 24..30, y 0,6..11 (trụ bên + hộp trên); mái hiên z 18..24,5 | Ảnh `r4-lib-front.png`, `r4-lib-clock-closeup.png` |
| Mặt trước đế: 2 tấm lam ngang lớn xám (~12–14 thanh) hai bên đồng hồ | 2 tấm lam, mỗi tấm 13 thanh nghiêng −0,45, trên nền sáng (x 33,6..35,6 / 40,4..42,4, y 6,25..9,25) | Ảnh `r4-lib-clock-closeup.png` |
| Đồng hồ TRÒN, mặt trắng, viền xanh dương đậm, đường kính ~1 tầng (~1/8–1/10 chiều rộng mặt trước đế), hơi lệch trái trục giữa, ngay dưới mái xanh của đế và ngay trên mái hiên sảnh | Đồng hồ tròn r 1,3 m (đường kính 2,6 m), mặt trắng, viền xanh, kim 10:10, tại (38, 7,3, 23,9); khối lam xanh nhỏ 5 thanh phía trên; 2 chấm đen nhỏ hai bên | Ảnh `r4-lib-clock-closeup.png` — mặt đồng hồ đọc đúng (12 trên, 9 trái, 3 phải, 6 dưới) |
| Sảnh lõm vào dưới đế: 6 cột vuông xám to thưa đỡ mái hiên phẳng trắng/xám; cửa kính đôi ở giữa, khung dọc xanh dương, hai bên panel kính xanh đậm, bên trong tối | 6 cột vuông xám 0,5×0,5 m tại z 19,5; mái hiên phẳng trắng; cửa kính đôi x 36,6..39,4 + panel xanh đậm 2 bên + khung dọc xanh; hộp tối bên trong | Ảnh `r4-lib-clock-closeup.png`, `r4-lib-forecourt.png` |
| Bậc tam cấp rộng (4–5 bậc) chạy suốt chiều rộng sảnh xuống sân, hai đầu có đoạn dốc/bậc bên | 4 bậc (mỗi bậc cao 0,15 m, z 17..19) + khối bậc bên 2 đầu (x 31,5..32,5 / 43,5..44,5) | Ảnh `r4-lib-forecourt.png` |
| Mái phẳng xám nhạt, diềm nhô ra ở hai cánh, dải xanh dương đậm dưới diềm mái khối giữa | Mái phẳng xám nhạt, diềm nhô 0,4 m ở hai cánh; dải xanh y 32,2 dưới diềm mái khối giữa | Crop top-down (xem §4); ảnh `r4-lib-wide.png` (diềm mái) |
| Trên mái khối giữa: cụm ăng-ten đen cao mảnh phía trên-trái, hộp thang máy/kỹ thuật tối gần giữa mái, 1–2 hộp vuông nhỏ ở hai đầu | Ăng-ten (41,5, 33..36,5) + hộp thang máy tối (38, 33,75, 38) + 2 hộp vuông nhỏ (29/47, 31,8, 36); mái đế xanh đậm 2 cao độ (2 lớp xanh song song) | Crop top-down (xem §4) |
| Biển "THƯ VIỆN TẠ QUANG BỬU" giữ nguyên (đã chốt, đọc trọn) | Giữ nguyên chữ; vị trí dời lên y 13,8 (xem §3, lỗi biển bị che) | Ảnh `r4-lib-clock-closeup.png` — chữ vàng đọc trọn |

## 2. Tiền cảnh phía bắc (trong lô đất thư viện)

| Tư liệu yêu cầu | Bên mình (đợt 4) |
|---|---|
| Sân chữ nhật đối xứng quanh trục giữa (trục từ đường vào thẳng cửa sảnh): sân lát xám ngay trước sảnh | Sân xám x 33..46, z 12..16, ngay trước bậc sảnh; plaza mở rộng minZ 14 → 10 để đủ chỗ |
| Chữ "HUST" đỏ khối 3D trên bệ đen, trên trục giữa, rộng ~nửa chiều rộng sảnh | Chữ HUST đỏ 5,15 m (nửa sảnh 11 m) trên bệ đen 5,6×1,2 m tại (38, 14); bệ có collider riêng |
| Lối đi chính giữa màu nâu đỏ đi thẳng từ mép đường tới bậc sảnh (rộng ~1/5 chiều dài sân) | Lối đỏ x 24..33, z 12..16 (rộng 9 m ≈ 1/5 chiều dài sân 45 m), nối đường nhựa hiện có ở mép tây (x=24) |
| Hai bên lối đỏ là sân lát đỏ nâu hẹp hơn xen kẽ bồn cỏ | Bồn cỏ bắc (x 25..32, z 10..12) + bồn cỏ nam (x 25..32, z 16..19), mỗi bồn 1 cây tròn + 2 đèn; bồn đông (x 46..49,5, z 11..19) với 2 cọ quạt + cây tròn + ghế gỗ |
| Đèn: cột đen mảnh, đầu chùm 5 bóng trắng hình cầu (loại chính dọc lối đi) và loại 3 bóng nhỏ hơn, đặt dọc mép lối đỏ và trong bồn cỏ, cách đều | Đèn 5 bóng (cao 3,2 m) tại (26/30, 11) và (26/30, 17,5); đèn 3 bóng (cao 2,5 m) tại (46,8, 12/18) |
| Thùng rác xanh nhỏ ở 2 mép lối đi chính gần bồn cỏ | 2 thùng xanh tại (24,8, 12,4/15,6) |
| Không hàng ghế dài dọc lối chính, không bồn hoa/chậu lớn trước sảnh | Không làm; chỉ 1 ghế gỗ nâu ở bồn đông + 1 ghế ở bồn tây-bắc (trong bồn, không dọc lối) |
| Đường nhựa phía trước đã có sẵn — chỉ nối sân mới vào đường | Đường hiện có giữ nguyên; sân mới nối vào mép đường x=24 (lối đỏ bắt đầu đúng mép đường) |

Giữ nguyên sân sau phía nam: đảo cỏ (30,52) + cây, lộc vừng (49,52) — xem
ảnh `r4-lib-back.png`. Hai cây cau (33/43, 15,5) kẹp lối vào phía bắc giữ
nguyên (đã chốt đợt 3).

## 3. Footprint đã chọn + lý luận

**Vấn đề:** tư liệu nói mặt tiền rộng gấp 2,5–3 lần chiều sâu, nhưng lô đất
thư viện (plaza x 23..50) chỉ cho phép rộng tối đa ~22 m. Footprint cũ
17 rộng × ~25 sâu tức mặt tiền đang là cạnh HẸP — phải đảo lại.

**Lựa chọn:** tháp **21 m rộng (x 27,5..48,5) × 13 m sâu (z 30..43)**, tỉ lệ
1,6 — chưa đạt 2,5–3 (không thể đạt trong campus thu nhỏ này) nhưng đã đảo
đúng chiều (mặt tiền thành cạnh DÀI) và bù bằng bố cục 3 nhịp + dải cửa
ngang + dải xanh mái để đọc ra là tấm đứng rộng từ sân trước (xem ảnh
`r4-lib-wide.png`).

**Tâm tháp dời nam 4,5 m → (38, 36,5):** giữ tâm z=32 thì chỉ còn ~2 m sân
trống phía bắc bậc sảnh — không đủ đặt chữ HUST + lối đi + bồn cỏ đối xứng.
Lô đất không đổi; plaza mở rộng minZ 14 → 10 (đã kiểm tra vùng x 23..50,
z 8..14 trống: không cây/ghế/collider, chỉ đường x=24 đi qua).

**Đồng hồ r 1,3 m (đường kính 2,6 m ≈ 0,8 tầng):** hai tiêu chí tư liệu
("~1 tầng" = 3,2 m và "1/8–1/10 mặt trước đế" = 1,1–1,4 m với mặt đế 11 m)
không thể cùng đúng — mặt đế phải rộng 21–26 m mới thỏa cả hai; chọn ở
giữa, ghi rõ ở đây.

**Đồng bộ sau dựng lại (`lib/campus.ts`):**
- `LIBRARY.center` (38, 36,5), `size` {x:21, z:13}, `clock` (38, 7,3, 23,9)
  r 1,3, `plaza` minZ 10, thêm `LIBRARY.forecourt` + `HUST_SIGN`.
- Collider: 1 collider cũ → 2 collider (tháp {27,5..48,5, 29,5..43,5} +
  khối đế {32,5..43,5, 23,5..30,5}) + collider bệ chữ HUST.
- Điểm Đi nhanh thư viện → (38, 12,5), yaw π (trên lối đỏ, trước bệ HUST,
  ngoài collider; đi vào cửa phải vòng qua phía tây bệ — xem test chuỗi 5).
- Đường C1–Thư viện / Thư viện–Hồ Tiền không đổi (đã nối đúng vào sân mới:
  điểm cuối đường C1–Thư viện (24,28) → (24,18) → lối đỏ).
- Không có điểm tương tác E ở cửa thư viện (đã vậy từ trước, giữ nguyên).

## 4. Ba lỗi tự bắt được khi xem ảnh (đã sửa + chụp lại)

Lượt chụp đầu (7 ảnh, 0 lỗi) lộ 3 lỗi — đều đã sửa, build lại, chụp lại,
xem lại và đạt:

1. **Chữ HUST bị đảo ngược ("TƧUH").** Nguyên nhân: chữ đặt trực tiếp theo
   +X (H ở tây, T ở đông); nhìn từ phía bắc (hướng vào sảnh), +X (đông) nằm
   bên TRÁI người nhìn nên thứ tự chữ đảo + từng chữ bị soi gương (S thành
   Ƨ). Sửa: nhóm 4 chữ vào group xoay π quanh Y tại (38, 0,5, 14), chữ đặt
   theo tọa độ tương đối — cùng cách mặt đồng hồ đã làm (đồng hồ xoay π
   đọc đúng, đã xác minh bằng crop đợt 3). Ảnh sau: `r4-lib-front.png`
   đọc "HUST" xuôi, S đúng hình.
2. **Biển tên vàng biến mất.** Nguyên nhân: biển đặt y 12,3, ngay trên mái
   xanh của khối đế (y 11,3); từ camera thấp ở sân trước, tia nhìn qua mép
   mái (z=24) chạm tường tháp ở y ≈ 12,7 — biển (11,8..12,8) gần như khuất
   hẳn sau mái. Sửa: dời biển lên y 13,8, thu nhỏ 9 m → 8 m (vừa khoảng
   trống 13,2..14,55, dưới hàng cửa tầng 4 y 14,55..16,05). Ảnh sau:
   `r4-lib-clock-closeup.png` — chữ vàng đọc trọn, rõ.
3. **Trần hiên xanh lá.** Nguyên nhân: mặt dưới mái hiên/dầm trắng nhận màu
   nền của `hemisphereLight` (`#8a9a72`, xanh ô-liu — `CampusScene.tsx:48`)
   nên render ra trần xanh, sai tư liệu (mái hiên trắng/xám). Đây là đặc
   tính ánh sáng toàn cục có từ trước (ảnh đợt 3 cũng có vệt xanh nhạt dưới
   mái hiên) — không đổi ánh sáng toàn cục (ảnh hưởng cả campus). Sửa: thêm
   2 tấm trần (soffit) mỏng màu xám nhạt `#DDDCD7`, vật liệu
   `meshBasicMaterial` (không chịu sáng, giữ đúng màu) ngay dưới mái hiên
   (y 5,56) và dưới dầm (y 5,16). Ảnh sau: trần hiên xám nhạt, hết xanh.

**Hai sự cố ở khâu chụp (đã xử lý, ghi lại để lần sau khỏi lặp):**
- Góc 3/4 đầu đặt sai yaw (±π/4): quy ước yaw camera là yaw = −bearing
  (bearing đo từ bắc theo chiều kim đồng hồ): yaw 0 = bắc, π = nam,
  −π/2 = đông, π/2 = tây. ±π/4 nhìn về đông-bắc/tây-bắc, không phải vào
  thư viện. Yaw đúng cho 2 góc 3/4 là ∓2,63 rad (bearing 151°/209°).
  Đã chụp lại đúng (`r4-lib-left34.png`, `r4-lib-right34.png`).
- Ảnh mái (`r4-lib-roof.png`, pitch −0,55) không ngửa lên được: camera
  follow LUÔN nhìn vào ngực avatar (y=1,2), pitch chỉ đổi ĐỘ CAO camera,
  kẹp trong [0,05, 1,1] rad, và khoảng cách tối đa 10 m
  (`CAM_MAX_DIST = 10`). Với tháp cao 32,6 m, đỉnh tháp ở ~50° trên tâm
  khung từ mặt đất — không bao giờ vào khung follow-cam (giới hạn có từ
  trước, các đợt trước cũng vậy). Mái/ăng-ten/hộp thang máy xác minh bằng
  crop top-down (`/tmp/roof-crop.png` — xem mô tả dưới): hộp thang máy đen
  thấy rõ, cụm ăng-ten (dấu đen nhỏ), 2 hộp vuông 2 đầu, mái đế xanh 2 lớp
  song song — đủ cả. Ảnh `r4-lib-roof.png` giữ lại như góc thấp chính diện
  bổ sung.

## 5. Ảnh đối chiếu (prefix `test-shots/r4-lib-*`)

| File | Góc | Kết luận sau khi tự xem |
|---|---|---|
| `r4-lib-front.png` | Chính diện từ sân trước (38,6) | HUST xuôi, biển vàng đọc trọn, đồng hồ + 2 cụm lam + sảnh 6 cột + mái xanh 2 lớp — đạt |
| `r4-lib-clock-closeup.png` | Cận đồng hồ + sảnh + HUST, 2048×1280 | Đồng hồ 12/9/3/6 đúng, kim 10:10, lam 13 thanh + lam xanh 5 thanh, cột vuông xám, cửa kính xanh đậm — đạt |
| `r4-lib-forecourt.png` | Từ mép đường dọc lối đỏ (24,14) | Lối đỏ, sân xám, bồn cỏ 2 bên, đèn 5 bóng, thùng rác xanh, cọ quạt, bậc + cột + cửa — đạt |
| `r4-lib-left34.png` | Góc 3/4 tây-bắc (22,8) | Mặt tây dải cửa ngang (không đồng hồ/lam/biển/sảnh), mặt chính + mái, bờ hồ + sen nguyên vẹn — đạt |
| `r4-lib-right34.png` | Góc 3/4 đông-bắc (54,8) | Mặt đông dải cửa ngang + dải kính tối lõi thang, mặt chính, HUST nhìn nghiêng vẫn xuôi — đạt |
| `r4-lib-wide.png` | Toàn tháp từ phía bắc (38,0) | Tấm đứng rộng 3 nhịp, lưới cửa đều, biển + đồng hồ + lam + sảnh + HUST — đạt (đỉnh tháp ngoài khung do FOV, xem §4) |
| `r4-lib-back.png` | Mặt sau từ sân nam (38,60) | Mặt sau chỉ dải cửa ngang, không chi tiết mặt chính; đảo cỏ + lộc vừng nguyên vẹn — đạt |
| `r4-lib-roof.png` | Góc thấp chính diện (38,12) | Biển + đồng hồ + sảnh + HUST từ góc thấp — đạt (mái xác minh bằng top-down, xem §4) |
| `r4-lib-topdown.png` | Top-down toàn campus | Footprint 21×13, sân trước phía bắc, hồ không bị lấn, C1/Parabol nguyên vẹn — đạt |
| `r4-lib-topdown-annotated.png` | Top-down có chú thích | Khung đỏ tháp + khung xanh đế + mũi tên mặt chính → bắc + nhãn hồ/sân/đồng hồ (leader line ra khoảng trống phía đông; mapping hiệu chuẩn từ khung đỏ đợt 3: 4,7 px/m) — đạt |

Ảnh cũ `r4-lib-left.png` / `r4-lib-right.png` (chụp quá gần, đỉnh tháp
ngoài khung) đã xóa, thay bằng 2 góc 3/4.

## 6. Kiểm chứng tổng trên bản build cuối

Build: `npx tsc --noEmit` exit 0; `npm run build` PASS (`out/`).

| Test | Kết quả | Ghi chú |
|---|---|---|
| engine | **45/45** | `test/learn.test.cjs` |
| leg-sim | **4/4** | leg3 vẫn 385 chạm `Bồn cỏ C1Building (đông)` (có từ trước, chặng vẫn pass) |
| verify-step4fix | **24/24** | 0 console/page errors, không FATAL; chạy 04:0x UTC 07/11 (trước ngưỡng 17:00 UTC) |
| walk-to-library-door | **PASS** | Lộ trình mới (24,28)→(24,18)→(24,14)→(34,14)→(34,17,5)→(38,20)→(38,22,5): 30 m, 7,5 s, 0 chạm; sanity: đứng trước cửa (38,24,5) → đẩy về z 23,1 (mặt collider đế); đứng trên bệ HUST → đẩy về z 13,0, hit 'Bệ chữ HUST'; điểm Đi nhanh (38,12,5) ngoài collider; đứng sát mặt bắc cánh tây → z 29,1; sân nam (38,52) ngoài collider |
| fast-travel-check | **20/20** | 0 lỗi; chuỗi 5 mới: Đi nhanh tới (38,12,5) → lách tây bằng D tới x 34,2 → đi bộ vào tới (34,20, 22,84), dừng ở mặt collider đế z 23,1 |
| play-all-quests | **48/48** | `test-shots/r4-play-all-quests.log` (48 dòng PASS + dòng tổng "48/48, console 0, page 0", xong ~05:31 UTC 07/11, lượt chạy duy nhất, không SIGTERM) + JSON `test-shots/play-all-quests.json` (at 2026-11-07T04:19:40Z, total 48, ok 48, fail [], consoleErrors [], pageErrors []) — đối chiếu trực tiếp trên đĩa |
| Ảnh | 10 ảnh đợt 4, 0 lỗi console/page trong mọi lần chụp | `test-shots/r4-lib-shots.json`, `r4-lib-shots-retake34.json` |

Test đã cập nhật theo kiến trúc mới: `test/walk-to-library-door.cjs`
(lộ trình + sanity mới), `test/fast-travel-check.cjs` (điều kiện điểm đến
thư viện + chuỗi 5 lách bệ HUST), `test/r4-lib-shots.cjs` (6 góc + top-down
+ closeup hi-res), `test/r4-lib-annotate.py` (chú thích top-down),
`test/r4-lib-retake34.cjs` + `test/r4-lib-roof-shot.cjs` (chụp bổ sung).

## 7. Còn tồn / chưa xác minh

- Chưa xác minh trên điện thoại/máy thật (như mọi đợt): FPS, cảm giác
  joystick, giọng zh-CN, gõ pinyin + IME thật, fade dịch chuyển nhanh,
  dropdown "Đi nhanh" ở màn hẹp, lùi xe, "Đưa xe về đường" ở chỗ quá chật.
- Mái/ăng-ten/hộp thang máy chỉ xác minh qua top-down (camera follow không
  với tới đỉnh tháp từ mặt đất — giới hạn có từ trước, xem §4).
- Biển tên từ vị trí rất gần ngay dưới mái hiên (camera z≈10,5) bị che nửa
  dưới — đọc biển từ sân trước (z 6..14) thì rõ; đây là hệ quả tự nhiên của
  mái đế nhô 6 m, giống nhà thật.
- Mặt bắc (mặt chính) hơi tối hơn mặt nam cũ (lum 163 vs 187, đo đợt 3) —
  chưa đo lại sau đợt 4; mắt user trên điện thoại thật là chốt cuối.
- Các tồn cũ còn nguyên: tán liễu nhìn từ dưới vẫn khối chính chiếm ưu thế
  (nếu còn thấy "mũ nấm" thì thu khối chính về r ~1,4); hoa súng ở xa vẫn
  đọc như sao hồng nhỏ; hàng cây bắc còn che 1–2 cây khi nhìn từ nửa tây
  sân C1; `choose-goal` không chấm đúng/sai (theo thiết kế).

## 8. Vận hành đợt 4

- Làm trực tiếp, không spawn worker con (đã bị từ chối ở các đợt trước).
- Lệnh nền dài bị kill SIGTERM 1 lần (chụp bổ sung 3/4 + mái, chết ở ảnh
  thứ 3 — đã chụp lại ảnh mái bằng script riêng 1 ảnh). Log test ghi trong
  workspace (`test-shots/*.log`), không ghi `/tmp`. Chỉ tin file trên đĩa.
- `verify-step4fix` nhạy ngày, không chạy vắt qua 17:00 UTC; exit 0 ngay
  cả khi có FATAL giữa chừng — phải đọc số bước 24/24.
- Không deploy. Deploy (khi user chốt): `python3
  ~/workspace/custom-connectors/custom.vercel/bin/vercel_api.py deploy
  --dir ~/workspace/bach-khoa-han-ngu/out --name hust-hsk`, rồi curl kiểm
  chứng https://hust-hsk.vercel.app/ 200 + đúng title; sau deploy giữ ~3
  deployment gần nhất. Không đụng hoc-hsk hay chua-online.
