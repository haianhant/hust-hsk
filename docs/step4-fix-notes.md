# Bước 4-fix — Sửa các lỗi vòng kiểm chứng độc lập (F1–F9 + nút "Ôn lỗi ngay")

Ngày: 05/11/2026. Chỉ sửa đúng các lỗi trong `docs/step4-verify.md`, không thêm
tính năng/bài/từ mới, không deploy, không chạm hoc-hsk/chua-online, không sửa
`PROGRESS.md`. Kiểm chứng lại bằng `test/verify-step4fix.cjs` (24/24 PASS,
0 lỗi console/page) — log `test-shots/verify-step4fix.json`, ảnh
`test-shots/step4fix-*.png`.

## Quyết định F2 đã thực hiện (theo brief sửa lỗi)

Sau kiểm tra cuối, nếu có từ sai thì hỏi lại MỖI từ sai 1 câu mới (dạng khác
câu cũ: gõ pinyin ↔ chọn nghĩa; nghe chép → gõ pinyin) TRƯỚC khi sang màn
kết quả. Lượt ôn lại này KHÔNG nâng level dài hạn và KHÔNG cộng điểm:
`recordReReview` (mới, `lib/learn/store.ts`) chỉ ghi event 0đ, giữ nguyên
level 0 + `nextDue` ngày mai — đúng §8.3. Màn kết quả liệt kê "Cần ôn" gồm
từ sai trong phiên với nhãn "ôn lại ngày mai"; tab "Cần ôn" trong sổ tay
gồm từ sai trong phiên + từ đến hạn. Chữ hứa trong UI đã khớp: "Từ sai
trong phiên đã được hỏi lại ngay — vẫn cần ôn lại vào ngày mai."

Định nghĩa "sai trong phiên" (để tab Cần ôn không phình): từ có event sai
trong ngày mà CHƯA được sửa đúng bằng một câu trả lời CÓ TÍNH ĐIỂM sau đó.
Sai rồi sửa đúng ngay trong câu (3đ) → đã sửa, không tính; sai ở kiểm tra
cuối rồi ôn lại đúng (0đ) → vẫn tính là sai trong phiên. Xem
`getSessionWrongIds` trong `lib/learn/store.ts`.

## Từng lỗi đã sửa (file:dòng, theo code sau sửa)

- **F1** — `components/learn/Handbook.tsx` (dòng render ví dụ): pinyin của
  câu ví dụ nay chỉ render khi `showPinyin` (`{showPinyin && ex.pinyin ...}`),
  giống pinyin từ chính.
- **F3** — `lib/learn/store.ts` thêm `isWellKnownState` + `ReviewState.lastCorrectAt`
  (mới, `lib/learn/types.ts`); `Handbook.tsx` dùng nó cho tab "Đã nhớ vững":
  chỉ khi `level >= 3` VÀ không còn lần sai chưa sửa (lần đúng gần nhất sau
  lần sai gần nhất). `recordAnswer` ghi `lastCorrectAt` khi trả lời đúng;
  migration/import mặc định `null` cho dữ liệu cũ (không mất tiến độ).
  `getDueWords` cũ giữ nguyên (từ vừa sai vẫn `nextDue` ngày mai).
- **F9** — `components/learn/ResultPanel.tsx`: chữ thưởng chơi lại gọn 1 dòng
  ("Thưởng 50 điểm đã nhận ở lần chơi trước.", cao 20 px); gọn header
  (🎉 3xl) và các hàng kiểm tra (`py-1.5`, `mb-2`); `app/page.tsx`: panel
  `max-h-[72dvh]` → `max-h-[80dvh]`. Đo ở 1280×800: cả hai nút nằm trọn
  trong panel (lượt đầu: nút bottom 768 ≤ panel bottom 776; chơi lại:
  scrollHeight == clientHeight, không cần cuộn).
- **F2** — xem quyết định ở trên. Code: `QuestPanel.tsx` thêm phase
  `inReReview`/`reReviewIds`/`wrongIds` + `reReviewKind` (dạng khác câu cũ),
  `onReReviewAnswer`/`reReviewOnly`/`onReReviewDone`; `app/page.tsx` thêm
  `handleReReviewAnswer` (ghi `recordReReview`), `sessionWrongIds`,
  `dueLexemes` = hợp từ sai trong phiên + từ đến hạn, `ResultPanel`
  nhận `dueTomorrowIds`; `store.ts` thêm `recordReReview`,
  `getSessionWrongIds`, `getDueWordsIncludingTodayWrong`.
- **F4** — `app/page.tsx`: prompt "E — …" dời lên `bottom-40 sm:bottom-44`
  (trên hộp "Cách di chuyển") + `z-20`. Đo: prompt (539,588,201×36) không
  giao hộp hướng dẫn (534,624,211×160), nhìn rõ trên ảnh.
- **F5** — (a) `components/three/Player.tsx`: `enterClassroom` đặt
  `pitch = 0.25` (0.38 đẩy bảng lên cao quá, tiêu đề cắt khỏi khung);
  `components/three/Classroom.tsx`: 3 dòng bảng dời xuống
  (`0.30/0.52/0.74` thay cho `0.30/0.62/0.85`); `app/page.tsx`: chip mục
  tiêu trong phòng dời sang góc trên-phải (`right-3 top-[5.5rem]`) để khỏi
  che tiêu đề bảng. Ảnh `step4fix-06`: cả 3 dòng 数学课 / 数学 shùxué ·
  黑板 hēibǎn / 笔记 bǐjì · 作业 zuòyè đều đọc rõ, không bị đầu avatar che.
  (b) Yaw/pitch camera trong phòng được lưu vào `questState.yaw/pitch`
  (mới, `types.ts` + migration/import trong `store.ts`; `playerState.ts`
  thêm `cameraYaw/cameraPitch`, `Player.tsx` khởi tạo yaw/pitch từ đó và
  đồng bộ mỗi frame + thêm `getYaw/getPitch` vào hook `__bkhn`;
  `app/page.tsx` lưu khi ở trong phòng — dạng functional để không ghi đè
  bước quest — và khôi phục ở `enterCampus`, mặc định yaw 0 / pitch 0.25
  = hướng bảng). Kiểm chứng: đặt yaw 1.2 → lưu `questState.yaw = 1.2` →
  reload → `getYaw() = 1.2` (không về -π/2 hướng đông).
- **F6** — `components/learn/QuestPanel.tsx`: placeholder ô gõ pinyin
  `"VD: shùxué"` → `"Nhập pinyin có dấu…"`.
- **F7** — `app/page.tsx`: banner thiếu giọng trên mobile dời xuống
  `top-[14rem]` (dưới hẳn hàng nút Sổ tay/âm thanh/tốc độ), desktop giữ
  `sm:top-3`. Đo 390 px: banner (16,224,359×56) không che chip điểm
  (12,56,100×32); ảnh xác nhận hàng nút trên-phải nhìn rõ.
- **F8** — `app/page.tsx`: nút "?" trên mobile dời lên `bottom-[10rem]`
  (desktop giữ giữa dưới). Đo 390×844: "?" (342,648,36×36) không giao nút
  "Tương tác" (246,744,132×40).
- **Nút "Ôn lỗi ngay"** — `app/page.tsx` `handleReviewNow`: nếu còn từ sai
  trong phiên thì mở lại vòng hỏi lại (`reReviewIds`, panel `QuestPanel`
  với bước review tổng hợp + `reReviewOnly`), không mở sổ tay suông; hết
  từ sai mới mở sổ tay tab Cần ôn. Kiểm chứng bằng Playwright: bấm thật
  → vòng "Ôn lại ngay — câu 1/2" mở với đúng 2 từ sai → trả lời đủ 2 câu
  → quay lại màn kết quả.

## Lỗi phát hiện thêm trong lúc sửa (đã sửa, ghi lại để khỏi tái phạm)

1. **Race ghi đè bước quest**: poll lưu yaw lúc đầu dùng
   `setProgress({...progressRef.current, ...})` dạng object — một tick rơi
   đúng lúc `advance()` (dạng function) chạy đã kéo `stepIndex` 2 về 1,
   làm lượt chơi lại kẹt ở cửa phòng (đã vào phòng nhưng bước không sang
   cô giáo). Sửa: poll dùng `setProgress` dạng functional. Bài học: mọi
   `setProgress` chạy định kỳ phải dùng dạng functional, không đọc
   `progressRef.current`.
2. **Test so sánh timestamp mili-giây bị flaky**: `lastWrongAt >
   lastCorrectAt` có thể bằng nhau khi hai đáp án cùng mili-giây → đổi
   assert thành `>=` (khẳng định thật là `isWellKnownState(...) === false`
   và `level === 0`); `getSessionWrongIds` dùng thứ tự mảng events thay
   vì so sánh timestamp.

## Kết quả kiểm tra lại

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | PASS, First Load JS 113 kB |
| `node --test test/learn.test.cjs` | **25/25 pass, 0 fail** (21 cũ + 4 mới cho F2/F3/F5b; chạy lại 3 lần đều 25/25) |
| `node test/leg-sim.cjs` | **4/4** |
| `node test/verify-step4fix.cjs` | **24/24 bước PASS, 0 lỗi console, 0 lỗi page**, exit 0 (log `test-shots/verify-step4fix.json`) |

Số đo lượt B-fix (sai cố ý 2 từ): điểm trước thưởng 76 (đúng bảng cũ),
vòng ôn lại 0đ, `shuxue`/`heiban` level 0 + `nextDue` 2026-11-06; sau
"Học tiếp" 126đ. Lượt C-fix (chơi lại): 11 câu × 2đ = 22đ → 148đ, thưởng
không cộng lại. Tab sổ tay sau khi sai: "Cần ôn (2)" đúng 2 từ sai,
"Đã nhớ vững (0)".

## Ảnh đã chụp (`test-shots/step4fix-*`, đã tự xem từng ảnh)

| Ảnh | Nội dung |
|---|---|
| `step4fix-01-result.png` | Màn kết quả lượt sai 2 từ: tự nhớ 3/5, đủ 2 từ cần ôn + nhãn "ôn lại ngày mai", 2 nút trọn vẹn |
| `step4fix-02-result-replay.png` | Màn kết quả chơi lại 148đ: thưởng 1 dòng, 5/5, 2 nút trọn vẹn, không cuộn |
| `step4fix-03-handbook-due.png` | Sổ tay tab "Cần ôn (2)": đúng 数学 + 黑板 |
| `step4fix-04-handbook-known.png` | Sổ tay tab "Đã nhớ vững (0)" |
| `step4fix-05-prompt-e.png` | Prompt "E — Nói chuyện với Minh" đọc rõ trên hộp hướng dẫn |
| `step4fix-06-classroom-board.png` | Bảng đen trong phòng: cả 3 dòng đọc rõ, không bị đầu avatar che |
| `step4fix-07-classroom-reload.png` | Trong phòng sau reload, yaw đã khôi phục |
| `step4fix-08-mobile.png` | Mobile 390×844: banner không che chip điểm/nút, "?" không đè "Tương tác" |

## Chưa đạt / lưu ý

- Không còn lỗi nào trong danh sách F1–F9 + nút "Ôn lỗi ngay" chưa đạt.
  Lưu ý nhỏ (không chặn): ở màn kết quả lượt đầu, panel vẫn còn dư cuộn
  12 px (`scrollHeight` 652 so với `clientHeight` 640) nhưng cả hai nút
  đã nằm trọn trong khung nhìn nên không cần cuộn; lượt chơi lại thì
  `scrollHeight == clientHeight` (hết cuộn).
- Nhãn tên "Cô giáo" của NPC trong phòng hơi bị chip mục tiêu (đã dời sang
  phải) chạm mép trái — chỉ là nhãn nổi nhỏ, không ảnh hưởng đọc bảng hay
  chơi.
- Kiểm chứng vẫn là SwiftShader + headless (giọng zh-CN thật, FPS/joystick
  trên máy thật chưa kiểm — như vòng verify đã ghi).
