# Kiểm chứng độc lập — Bước 4–5: Engine học tập + tuyến "Buổi học đầu tiên"

Ngày kiểm chứng: 05/11/2026. Người kiểm chứng: vòng verify độc lập (không tin báo
cáo của hai luồng làm — tự chạy lại mọi thứ, tự chơi thử, chỉ ghi nhận những gì
tự đo được). **Không sửa code nguồn.** Không deploy, không tạo project Vercel,
không chạm hoc-hsk / chua-online.

## Phương pháp & môi trường

- Repo `~/workspace/bach-khoa-han-ngu/`, build lại từ đầu bằng `npm run build`
  (không dùng `out/` cũ).
- Trình duyệt: Playwright `chromium_headless_shell-1248` + SwiftShader (WebGL
  phần mềm, ~1–2 fps). Server local `python3 -m http.server` phục vụ `out/`
  (cổng 8322–8325). Mỗi lượt chơi dùng profile trình duyệt mới (localStorage
  trống), trừ lượt chơi lại (seed đúng file JSON đã xuất ở lượt A).
- Script kiểm chứng do vòng này tự viết: `test/verify-step4.cjs` (lượt A),
  `test/verify-step4b.cjs` (probe A2 + lượt B/C/D/E), `test/verify-step4c.cjs`
  (probe P1/P2), `test/verify-step4d.cjs` (probe P3 — xem lưu ý ở F9).
  Chỉ tham khảo `test/quest-smoke.cjs` về cách dùng hook `window.__bkhn`,
  không chạy lại script của luồng trước.
- Log đầy đủ: `test-shots/verify-step4.json` (83 bước ghi lại, 78 pass,
  **0 lỗi console, 0 lỗi page** trong toàn bộ các lượt chơi).
- Ảnh: `test-shots/step4v-*.png` (15 ảnh + 1 ảnh probe, đã tự xem từng ảnh).

## Kiểm tra 1 — Build + test tự động (chạy lại từ đầu)

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Type-check | `npx tsc --noEmit` | **PASS, exit 0, 0 lỗi** (3 lỗi QuestPanel/Handbook mà luồng engine ghi trong `docs/learn-engine.md` đã được sửa — tsc hiện sạch) |
| Build | `npm run build` | **PASS**, `out/` 1,7 MB, First Load JS 112 kB |
| Test engine | `node --test test/learn.test.cjs` | **PASS 21/21, 0 fail** (đã đọc file test: assert normalizePinyin, pinyinToNumbered, checkPinyin/checkHanzi, review level/nextDue, award idempotent, migration, import validation, streak, scoreAnswer 10/5/3/2, content 9 từ, getDueWords, speech node-guard) |
| Hồi quy campus | `node test/leg-sim.cjs` | **PASS 4/4**, hits `{}` mọi chặng; leg1 8,2 s/32,7 m; leg2 14,1 s/56,5 m; leg3 32,2 s/128,9 m; leg4 4,2 s/16,6 m; spawn OK |

## Kiểm tra 2 — Chơi thử toàn tuyến (3 lượt + probe)

Thời gian đo được (wall-clock, gồm chờ SwiftShader render + chụp ảnh):
lượt A hoàn hảo **267 s**, lượt B sai cố ý **194 s**, lượt C chơi lại **128 s**.
Thời gian chơi thật trên máy thật sẽ ngắn hơn nhiều (SwiftShader ~1–2 fps làm
mọi lần chờ DOM/click đều chậm; theo skill, không đánh giá tốc độ bằng
wall-clock khi render phần mềm).

### Lượt A — hoàn hảo (profile trống): 110 + 50 = 160 ✅

| Bước | Kết quả đo được |
|---|---|
| Vào trường | WebGL + hook `__bkhn` sẵn; banner thiếu giọng zh-CN hiện |
| E ngoài tầm Minh (4,47 m > r 2,5 m) | Toast "Hãy đến gần hơn để tương tác." ✅ |
| Đi bộ thật W+Shift spawn → Minh | Đi được **2,22 m trong 10,8 s**, dừng cách Minh **2,25 m** (≤ trigger 2,5 m), prompt "E — Nói chuyện với Minh" hiện ✅ |
| Gặp Minh, vào cửa C1 | E ở (-58,-41) cách cửa 4,5 m → toast, không vào; E ở (-58,-44) cách cửa 1,5 m → prompt → fade → vào phòng, bước cô giáo mở ✅ |
| Chọn bảng / mở vở / nhận bài | Đúng lần đầu bằng nút panel ✅ (ảnh step4v-05/-06) |
| 认真 / 清楚 / 把 / 遍 / 提高 | Đúng lần đầu hết ✅ |
| Kiểm tra cuối Q1 | Chỉ hiện chữ Hán: body không chứa "môn Toán"/"shùxué" ✅ — nhưng xem F6 (placeholder lộ đáp án) |
| IME composition (Q1) | `compositionstart` + Enter → **KHÔNG chấm** (không feedback); `compositionend` + Enter → chấm bình thường ✅ (dispatch `CompositionEvent` thật trên `#review-pinyin`) |
| Kiểm tra cuối Q2–Q5 | Đúng hết (chọn nghĩa ×2, nghe chép ×1, gõ pinyin ×1) ✅ |
| Điểm trước thưởng | **HUD = 110, localStorage = 110**; events: 11 câu × 10đ (heiban, renzhen, qingchu, ba, bian, tigao, shuxue, heiban, biji, zuoye, tigao) ✅ |
| Thưởng hoàn thành | "Học tiếp" → **160**; `completedQuests={first-lesson: 50đ}`; `badges=["first-lesson"]`; streak `{count:1, lastDay:"2026-11-05"}` ✅ |
| Reload giữa tuyến (sau 清楚, bước order-ba) | stepIndex 8 → 8, điểm 30 → 30, trong phòng, vị trí (0,00; 1,00) = spawn phòng ✅ |
| Reload sau hoàn thành | Điểm 160 giữ nguyên, nút "Tiếp tục học" hiện ✅ |
| Âm thanh | Banner "Thiết bị chưa có giọng tiếng Trung — vẫn học được bằng chữ." hiện; bấm nút 🔊 Nghe không crash, không lỗi console ✅ |

### Lượt B — sai cố ý (profile trống): 76 + 50 = 126 ✅ (điểm từng câu)

Events trong localStorage (mỗi từ: [điểm các lần trả lời]):

| Từ | Điểm | Ghi chú |
|---|---|---|
| 黑板 heiban | [10, 0] | chọn bảng đúng lần đầu 10đ; kiểm tra cuối chọn nghĩa sai 0đ |
| 认真 renzhen | [0, 3] | chọn sai trước rồi sửa đúng → **3đ** ✅ |
| 清楚 qingchu | [10] | đúng lần đầu |
| 把 ba | [10] | xếp câu đúng |
| 遍 bian | [0, 3] | chọn sai số lượt rồi sửa đúng → **3đ** ✅ |
| 提高 tigao | [10, 10] | mục tiêu + kiểm tra cuối |
| 数学 shuxue | [0] | kiểm tra cuối gõ pinyin không dấu → sai 0đ (tone mode không chấp nhận bỏ dấu) |
| 笔记 biji | [10] | nghe chép đúng |
| 作业 zuoye | [10] | chọn nghĩa đúng |

- Tổng trước thưởng **76**, sau "Học tiếp" **126** ✅. Màn kết quả ghi "tự nhớ đúng 3/5" ✅.
- Trạng thái ôn của 2 từ sai kiểm tra cuối: `level 0, nextDue 2026-11-06
  (ngày mai), wrongCount 1, lastWrongAt` có ✅ — đúng quy tắc engine.
- Từ đúng không gợi ý tăng level: đúng lần đầu → level 1, nextDue ngày mai
  (kiểm tra qua state trong JSON xuất) ✅.
- Click 3D vào bảng: từ spawn (cách bảng 3,60 m > trigger 2,5 m) click
  (640,120) → toast "Hãy đến gần bảng hơn để chọn.", **0 event ghi**
  (cửa khoảng cách hoạt động thật) ✅; từ (0,-0,3) cách bảng 2,30 m,
  click (640,250) → chọn đúng bảng (probe P2; điểm (640,150) trong lượt B
  trượt vì nằm TRÊN bảng — xem step4v-14-board-close.png — đó là lỗi điểm
  click của script, không phải lỗi scene).

### Lượt C — chơi lại (seed profile 160đ từ file đã xuất): idempotent ✅

- Bắt đầu lại từ màn "Chọn bài" → panel Minh mở không cần E ✅.
- 11 câu đúng hết → **182 = 160 + 22** (11 × 2đ replay) ✅.
- Màn kết quả ghi "Thưởng hoàn thành 50 điểm đã nhận ở lần chơi trước —
  chơi lại chỉ cộng điểm luyện tập." ✅ (ảnh step4v-13).
- "Học tiếp" lần 2 → **điểm giữ 182**, `completedQuests` không đổi,
  `badges` vẫn 1 chiếc ✅.

### Tương tác theo skill — trigger radius vs khoảng cách đứng

| Điểm tương tác | Vị trí (code) | Trigger radius (code) | Khoảng cách từ điểm đứng | Kết luận |
|---|---|---|---|---|
| NPC Minh | (-72, 8), `app/page.tsx` MINH_POS | 2,5 m (`MINH_RADIUS`) | spawn 4,47 m (ngoài) → đi bộ tới 2,25 m (trong) | radius > khoảng cách khi tới gần ✅, E ngoài tầm toast ✅ |
| Cửa C1 | (-58, -45,5), `lib/campus.ts` CLASSROOM_DOOR | 2,5 m | (-58,-41): 4,5 m (ngoài); (-58,-44): 1,5 m (trong) | ✅ |
| Bảng đen | (0, -2,6), `lib/campus.ts` CLASSROOM | 2,5 m (`app/page.tsx`) | spawn phòng (0,1): 3,60 m (ngoài — phải đi về phía bắc); (0,-0,3): 2,30 m (trong) | ✅ (click 3D đã kiểm chứng cả hai phía của ngưỡng) |
| Vở / bài tập | (-2,2; 0,6), bàn 1 | 2,0 m (`app/page.tsx`) | spawn phòng: 2,24 m (ngoài); đứng sát bàn (qua collider bàn, bán kính 0,4 m): ~0,7 m (trong) | ✅ theo hình học; chưa click 3D trực tiếp vào vở (xem "Chưa xác minh") |
| Cô giáo | (2,2; -2) | — (không phải điểm E) | — | NPC tĩnh, không cần E |

Lưu ý: prompt "E — …" của bảng/vở/bài tập **không bao giờ hiện trong luồng
chơi thường** — panel học tự mở ở mỗi bước trong phòng và `handleInteract`
trả về sớm khi panel mở (`app/page.tsx`, `panelRef.current !== null`),
nên phím E ở các bước này không có tác dụng; đường tương tác 3D thực tế là
click trực tiếp vào vật (đã kiểm chứng với bảng) và nút trong panel.
Không chặn chơi, nhưng ghi lại để vòng sau quyết định có giữ prompt E
trong phòng hay không.

### Nội dung

- Đúng **9 từ nhóm 1 HSK3 bài 10**, đúng thứ tự nguồn 1–9
  (数学, 认真, 笔记, 清楚, 黑板, 把, 作业, 遍, 提高), id ổn định
  `hsk3-l10-g1-*`, không có từ/bài khác: sổ tay "Theo bài (9)", gặp 9/9,
  chip kết quả đủ 9 ✅.
- 9 ví dụ đều `source: 'authored'` trong `content/hsk3-l10.ts` (nhãn nội bộ
  theo brief §5); không có toàn văn bài khóa trong repo; tiêu đề bài
  你明天再把书还给我 chỉ xuất hiện ở tên bài ✅.
- Câu "请把作业交给老师。" được trình bày là **câu tự soạn**: `quest-data.ts`
  ghi `source: 'authored'` + câu vi "không phải trích nguyên văn giáo trình",
  panel xếp câu render dòng chú thích đó (không điều kiện) ✅.
- Ghi chú: trong sổ tay, câu ví dụ hiện KHÔNG kèm nhãn "tự soạn" nhìn thấy
  được (chỉ có cờ nội bộ) — brief chỉ yêu cầu nhãn nội bộ nên không tính
  là lỗi; chỉ ghi nhận để vòng sau quyết định có cần nhãn hiển thị không.

### Ôn tập — phát hiện mâu thuẫn cần quyết định (F2, xem dưới)

- Từ sai kiểm tra cuối có `nextDue` ngày mai ✅, nhưng **tab "Cần ôn" hôm
  nay vẫn (0) và báo "Không có từ nào cần ôn hôm nay. 🎉"** — `getDueWords`
  chỉ trả `nextDue <= hôm nay` nên từ vừa sai chưa bao giờ hiện trong ngày
  sai. Người học vừa sai 2 từ sẽ thấy sổ tay báo không có gì cần ôn.
- Chữ ở màn kết quả còn hứa "Từ sai đã vào hàng đợi ôn tập — ôn lại sau
  vài câu trong phiên, và ôn lại vào ngày mai." — nhưng trong phiên KHÔNG
  có lượt hỏi lại từ sai (mỗi câu kiểm tra cuối chỉ trả lời một lần),
  và danh sách "Cần ôn lại" trên màn kết quả (cũng từ `getDueWords`) cũng
  không chứa chúng. Cần quyết định: hoặc thêm tab/mục "ôn ngày mai", hoặc
  sửa chữ, hoặc đổi quy tắc hiển thị.

## Kiểm tra 3 — Mobile 390×844 (tab riêng, touch) ✅ với 2 vết

| Kiểm tra | Số đo thật |
|---|---|
| Không tràn ngang (trong trường / sổ tay / panel câu hỏi) | `scrollWidth == innerWidth == 390` ở cả 3 trạng thái ✅ |
| Joystick | 112×112 tại (12, 716), góc dưới-trái ✅ |
| Nút "✋ Tương tác" | (246, 744, 132×40), trong viewport ✅ — nhưng xem F8 (nút "?" đè lên) |
| Nút đóng sổ tay | (335, 252, 39×36), trong viewport, không bị che ✅ |
| Chữ Hán trong panel | 30 px (≥ 28 px theo chuẩn panel) ✅, panel vừa màn hình |
| NPC Minh trên mobile | Nhìn rõ, áo xanh lá, tỉ lệ ngang avatar ✅ (ảnh step4v-12) |

## Kiểm tra 4 — Sổ tay + xuất/nhập

| Kiểm tra | Kết quả |
|---|---|
| Đủ 5 tab | "Theo bài (9) / Đã gặp (9) / Cần ôn (0) / Đã nhớ vững (9) / Tìm kiếm" sau lượt A ✅ |
| Pinyin bật/tắt | **FAIL — xem F1** |
| Nghĩa TV ẩn ở lượt tự nhớ | Kiểm tra cuối Q1 chỉ hiện chữ Hán ✅ (trừ F6) |
| Xuất JSON | File xuất có points 160, encountered 9, 9 từ có state ✅ |
| Nhập vào profile trống | **Khôi phục 160đ, encountered 9, completedQuests nguyên** ✅ |
| Nhập JSON hỏng | Báo **"File nhập không phải JSON hợp lệ."** (rõ ràng, đúng lỗi), dữ liệu cũ không mất ✅ (probe P1; FAIL ban đầu trong log là do script kiểm tra sai chuỗi, đã hiệu chỉnh) |

## Ảnh đã chụp (tiền tố `step4v-`, đã tự xem từng ảnh)

| Ảnh | Đánh giá khi xem |
|---|---|
| `step4v-01-intro.png` | Màn mở đầu sạch, đủ disclaimer "không phải website chính thức", 2 nút; profile trống không có "Tiếp tục học" (đúng) |
| `step4v-02-minh.png` | Minh đứng sau lưng avatar, chỉ thấy nửa đầu — NPC khó nhận ra từ góc này; prompt E bị hộp hướng dẫn che (F4) |
| `step4v-03-door.png` | Quảng trường C1, biển "C1", tim đỏ I LOVE BK đọc rõ; avatar đứng sát bệ tượng; prompt E bị che (F4) |
| `step4v-04-classroom.png` | Bảng "数学课" đọc rõ, cô giáo tỉ lệ tốt (không chibi); **đầu avatar che mất giữa bảng** (F5) |
| `step4v-05-board.png` / `step4v-05b-board.png` | Panel chọn bảng rõ, 5 lựa chọn; bảng sau lưng đọc được |
| `step4v-06-notebook.png` | Panel vở rõ; vở 3D trên bàn bị panel + avatar che nên **animation mở vở không nhìn thấy được trong ảnh** |
| `step4v-07-review.png` | Panel kiểm tra cuối sạch, chỉ chữ Hán 数学; **placeholder "VD: shùxué" lộ đáp án** (F6); sau reload, camera quay về hướng đông (F5b) |
| `step4v-08-result.png` | Kết quả đầy đủ: 9/9, 5/5, 2 nút vừa khung |
| `step4v-08b-result.png` | Kết quả lượt B: tự nhớ 3/5 |
| `step4v-09-handbook.png` | Sổ tay rõ, đủ tab + số lượng; ví dụ có pinyin |
| `step4v-10-mobile-campus.png` | Joystick + nút Tương tác hiện; banner che chip điểm (F7); **nút "?" đè lên nút "Tương tác"** (F8) |
| `step4v-11-mobile-handbook.png` | Sổ tay mobile vừa màn hình, tab xếp 2 hàng, nút đóng thấy rõ |
| `step4v-12-mobile-quest.png` | Panel Minh trên mobile đọc tốt, chữ Hán lớn; banner che một phần HUD trên (F7) |
| `step4v-13-replay-result.png` | Kết quả chơi lại 182đ, dòng thưởng đã nhận rõ; **2 nút cuối tràn khỏi panel** (F9) |
| `step4v-14-board-close.png` | Cận cảnh bảng từ (0,-0,3): bảng tới y≈170 — giải thích vì sao click (640,150) trượt (probe P2) |
| `step4v-15-result-overflow.png` | Ảnh probe P3 (đo sai trạng thái — xem F9, bằng chứng thật là crop của step4v-13) |

## Danh sách lỗi (file:dòng + tái hiện + mức độ)

### Lỗi thật — cần sửa (không lỗi nào chặn chơi hết tuyến)

**F1 — Tắt pinyin trong sổ tay không ẩn pinyin trong câu ví dụ** (không chặn)
- File: `components/learn/Handbook.tsx:228` (dòng 220 có điều kiện
  `showPinyin`, dòng 228 render `ex.pinyin` vô điều kiện).
- Tái hiện: vào trường (profile có tiến độ) → mở sổ tay → bấm "Pinyin: Hiện"
  → pinyin từ chính biến mất nhưng "(wǒ xǐhuān shùxué.)" vẫn hiện trong
  câu ví dụ. Probe A2 xác nhận: `headwordPinyinGone=true`,
  `examplePinyinStillThere=true`.

**F3 — Từ vừa sai vẫn nằm trong tab "Đã nhớ vững"** (không chặn, nhưng sai
dữ liệu học tập)
- File: `components/learn/Handbook.tsx:56-57` —
  `knownIds = encounteredIds.filter(id => !dueSet.has(id))`, không kiểm tra
  level.
- Tái hiện: lượt B — sai 数学 và 黑板 ở kiểm tra cuối (level 0, wrongCount 1,
  nextDue ngày mai) → mở sổ tay tab "Đã nhớ vững" → **数学 vẫn có mặt**
  trong tab (vì nextDue ngày mai nên không "due" hôm nay). Mụt từ trong tab
  còn mang dòng đỏ "Đã sai 1 lần — cần ôn lại." — tự mâu thuẫn với tên tab.
- Sửa gợi ý: "Đã nhớ vững" nên yêu cầu `level >= 1` (hoặc ≥ 2) và loại từ
  vừa sai; hoặc đổi tên tab theo đúng định nghĩa hiện tại.

**F9 — Màn kết quả chơi lại tràn nút "Học tiếp" khỏi panel (1280×800)**
(không chặn hẳn — cuộn trong panel thì tới được — nhưng người dùng mới
dễ tưởng kẹt)
- File: `components/learn/ResultPanel.tsx` (chữ thưởng 2 dòng khi chơi lại)
  + panel `app/page.tsx` (`max-h-[72dvh] overflow-y-auto`).
- Tái hiện: chơi lại toàn tuyến → màn kết quả → dòng thưởng dài 2 dòng
  ("…đã nhận ở lần chơi trước — chơi lại chỉ cộng điểm luyện tập.") đẩy
  nội dung dài thêm → 2 nút "Ôn lỗi ngay"/"Học tiếp →" chỉ thấy nửa trên,
  bị cắt ở mép dưới panel (crop `/tmp/crop13.png` từ
  `step4v-13-replay-result.png`); lần đầu (thưởng 1 dòng) thì vừa đủ
  (`step4v-08-result.png`). Không có dấu hiệu nào cho biết panel cuộn được.
- Lưu ý probe: probe P3 đo nhầm trạng thái (recallResults là React state,
  mất sau reload nên panel đo chỉ cao 372 px) — kết quả P3 không dùng được;
  bằng chứng là ảnh crop trên.

### Mâu thuẫn thiết kế — cần coordinator/quyết định, không phải lỗi code đơn lẻ

**F2 — Từ sai "vào hàng đợi ôn" nhưng không thấy ở đâu trong ngày sai**
- Engine đúng spec (`store.ts` `getDueWords`: chỉ `nextDue <= hôm nay`;
  từ sai `nextDue` ngày mai) — nhưng kỳ vọng "từ sai hiện ở tab Cần ôn"
  không thể đúng cùng lúc với quy tắc đó. Hệ quả đo được (lượt B):
  sau khi sai 2 từ, tab "Cần ôn (0)", màn kết quả không liệt kê chúng ở
  "Cần ôn lại", dù chữ dưới hứa "ôn lại sau vài câu trong phiên" (trong
  phiên không có lượt hỏi lại nào). Cần một trong: mục "Ôn ngày mai" trong
  sổ tay, hoặc sửa chữ ở ResultPanel, hoặc đổi định nghĩa tab Cần ôn.

### Vết UI — không chặn

**F4 — Prompt "E — …" trên desktop bị hộp "Cách di chuyển" che mất**
- File: `app/page.tsx:724-725` (prompt, `bottom-24`/`sm:bottom-20`, giữa)
  vs `app/page.tsx:771` (hộp hướng dẫn, `sm:bottom-4 sm:left-1/2`, render
  sau nên đè lên). Cả hai cùng canh giữa dưới ở desktop 1280×800.
- Tái hiện: hộp hướng dẫn đang mở (mặc định desktop) → đứng cạnh Minh/cửa
  → prompt E có trong DOM (test `waitText` vẫn thấy) nhưng **không nhìn
  thấy trên màn hình** (ảnh step4v-02/-03). Người mới không biết phải bấm E.
  Trên mobile hộp mặc định đóng nên không bị.

**F5 — Đầu avatar che mất dòng giữa của bảng đen trong phòng học**
- Ảnh step4v-04/-05/-06/-14: dòng "数学 shùxué / 黑板 hēibǎn / 笔记 …" luôn
  bị đầu + ba lô avatar che một phần vì camera sau lưng avatar nhìn thẳng
  bảng. Panel học vẫn hiện đủ từ nên không chặn học, nhưng thao tác
  "nhìn bảng" mất một nửa giá trị 3D. (Liên quan: sau reload giữa tuyến,
  yaw không được khôi phục — camera quay về hướng đông mặc định thay vì
  nhìn bảng, ảnh step4v-07; `app/page.tsx:478-479` chỉ khôi phục
  `inClassroom` + `pos`, không khôi phục yaw; `Player.tsx:59` yaw khởi
  tạo `-π/2`.)

**F6 — Placeholder ô gõ pinyin lộ đáp án câu kiểm tra cuối số 1**
- File: `components/learn/QuestPanel.tsx:629` —
  `placeholder="VD: shùxué"` (cố định).
- Câu Q1 kiểm tra cuối là 数学 = shùxué → placeholder **chính là đáp án**.
  Ảnh step4v-07 thấy rõ "VD: shùxué" trong ô trống. (Kiểm tra "chỉ hiện
  chữ Hán" bằng `innerText` vẫn pass vì placeholder không nằm trong
  innerText — đó là lý do kiểm tra tự động không bắt được; chỉ xem ảnh
  mới thấy.) Đổi placeholder thành ví dụ của từ khác hoặc bỏ hẳn.

**F7 — Banner thiếu giọng che chip điểm + tên khu trên mobile 390 px**
- File: `app/page.tsx` (banner `top-3`, rộng `min(92vw,480px)`, canh giữa)
  vs chip điểm/tên khu (`left-3 top-3`). Trên 390 px banner gần như phủ
  hết dải trên: ảnh step4v-10/-12 chỉ thấy "0 điểm" ló ra sau banner.
  Tắt banner (✕) thì hết; desktop 1280 px không bị.

**F8 — Nút "?" trên mobile đè lên nút "✋ Tương tác" (390×844)**
- File: `app/page.tsx:796` (nút "?", mobile `bottom-[4.5rem] right-3`)
  vs cột nút dưới-phải (`bottom-4 right-3`, nút Tương tác ở giữa cột).
- Ảnh step4v-10: vòng tròn "?" nằm chồng lên đuôi chữ "Tương tác"
  ("Tương tá…?"), thu hẹp vùng bấm và gây nhầm. Đo trước đó chỉ kiểm tra
  nút nằm trong viewport nên không bắt được lỗi chồng lấn này — chỉ xem
  ảnh mới thấy.

## Những gì chưa xác minh được

- **FPS / cảm giác di chuyển / joystick trên máy thật và điện thoại thật**
  (chỉ có SwiftShader ~1–2 fps; đi bộ thật W+Shift chỉ đạt ~0,2 m/s
  wall-clock do delta-clamp — không kết luận tốc độ thật).
- **Giọng đọc zh-CN thật** (headless không có giọng → chỉ kiểm được banner
  + không crash khi bấm nghe).
- **Gõ IME thật bằng bộ gõ tiếng Trung** (chỉ dispatch `CompositionEvent`
  tổng hợp; guard `compositionstart`/`compositionend` đã kiểm chứng live
  bằng event thật, nhưng gõ bằng IME thật trên máy người dùng thì chưa).
- **Điểm gợi ý 5đ ở UI** — bảng điểm 5đ chỉ được kiểm chứng ở unit test
  (`scoreAnswer`); các lượt chơi của vòng này không bấm nút Gợi ý lần nào.
- **Nút "Ôn lỗi ngay"** trên màn kết quả (chưa bấm live; chỉ đọc code
  `onReviewNow → openHandbook('due')`).
- **Click 3D vào vở/bài tập** (chỉ kiểm chứng đường nút panel + cửa khoảng
  cách của bảng; vở/bài tập là mesh nhỏ trên bàn 1, chưa click trực tiếp).
- **Animation mở vở / tập bài bay lên tay** — trạng thái `notebookOpen` /
  `homework` đổi đúng, nhưng trong ảnh chụp vở và tập đều bị panel +
  avatar che khuất nên không nhìn thấy animation bằng mắt.
- **Streak qua nhiều ngày** (mới kiểm chứng `count: 1` trong ngày).
- **Chữ "authored" hiển thị trên câu ví dụ trong sổ tay** — chỉ có cờ nội
  bộ trong dữ liệu (đúng brief §5); UI sổ tay không gắn nhãn nhìn thấy được.

## Lỗi của chính vòng kiểm tra (đã sửa, không phải lỗi sản phẩm)

1. Lần chạy đầu mở 2 context WebGL SwiftShader cùng lúc (giữ context lượt A
   mở trong khi chạy lượt B) → tab thứ hai không render được, `__bkhn`
   timeout 90 s. Đã sửa bằng cách chạy nối tiếp một context tại một thời
   điểm (lượt C seed lại profile từ file JSON đã xuất). Bài học: SwiftShader
   không chịu nổi 2 context WebGL cùng lúc.
2. `board-3d-near` FAIL do click sai điểm (640,150) nằm trên bảng + chỉ chờ
   800 ms. Probe P2 (chờ 4 s + quét điểm) chứng minh click (640,250) chọn
   đúng bảng.
3. `import-bad` FAIL do script kiểm tra sai chuỗi thông báo. Probe P1 xác
   định chuỗi thật là "File nhập không phải JSON hợp lệ."
4. Probe P3 đo sai trạng thái (xem F9) — không dùng kết quả đó.

## Kết luận

**Tuyến "Buổi học đầu tiên" chơi được trọn vẹn từ đầu tới cuối, đúng nội
dung 9 từ, điểm 10/3/2 và thưởng idempotent đều đúng số đo, persistence và
xuất/nhập đều hoạt động, 0 lỗi console/page trong toàn bộ 5 lượt chơi
(A/B/C/D/E) + 3 probe.** Ba lỗi thật cần sửa trước khi coi là đạt:
**F1** (pinyin ví dụ không ẩn), **F3** ("Đã nhớ vững" chứa từ vừa sai),
**F9** (nút kết quả chơi lại tràn khỏi panel). Thêm một quyết định thiết kế
**F2** (từ sai vô hình trong ngày sai) và 5 vết UI (F4–F8) nên sửa cùng đợt.
Không có lỗi nào chặn chơi, nhưng F3 làm sai lệch dữ liệu học tập hiển thị
và F9 có thể làm người chơi tưởng kẹt ở màn kết quả chơi lại.
