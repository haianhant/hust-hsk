# Bước 5 — Ghi chú tuyến "Buổi học đầu tiên" + UI học tập

Ngày: 05/11/2026. Không deploy, không tạo project Vercel, không chạm hoc-hsk/chua-online.
Không sửa file engine lõi (chỉ import): `lib/learn/types.ts`, `pinyin.ts`,
`store.ts`, `speech.ts`, `content/hsk3-l10.ts` là của luồng engine Bước 4.

## File đã làm / sửa

Mới:
- `lib/learn/quest-data.ts` — tuyến dạng dữ liệu: `FIRST_LESSON_QUEST`
  (thưởng 50đ, badge `first-lesson`) + 13 bước dữ liệu khớp 10 bước brief
  §5.1 (bước 4/5/7 tách đôi để mỗi bước một hành động). Câu tự soạn gắn
  `source:'authored'`, không trình bày là trích giáo trình.
- `components/three/Classroom.tsx` — phòng học mô phỏng 9×6 m trong cùng
  Canvas: sàn gỗ, tường trắng, bảng đen canvas texture ("数学课" + 4 từ),
  3 bàn + ghế (mặt bàn 0,75 m, mặt ghế 0,45 m, đúng tỉ lệ avatar 1,7 m),
  vở 笔记 (nắp xoay mở), tập 作业 (bay lên tay → bay tới tay cô),
  kệ sách + đồng hồ + cửa sổ (vật gây nhiễu), biển "Phòng học mô phỏng
  phục vụ học tập — chưa có tư liệu nội thất thật." Bấm vật 3D (raycast)
  hoặc chọn trong panel.
- `components/three/Npc.tsx` — NPC Minh (áo xanh lá, gần cổng Parabol
  (-72, 8)) + cô giáo (áo trắng, trong phòng). StudentAvatar KHÔNG tham số
  hóa được màu áo nên dựng hình đơn giản cùng tỉ lệ 1,7 m, thở nhẹ.
- `components/learn/QuestPanel.tsx` — khung hội thoại + mọi dạng câu hỏi:
  chọn vật, chọn nghĩa, gõ pinyin (chặn chấm khi đang gõ IME — chờ
  compositionend), nghe chép (nghe lại + tốc độ), xếp câu từ thẻ, chọn số
  lượt, chọn mục tiêu, kiểm tra cuối 5 từ (tự nhớ: chỉ hiện chữ Hán).
  Gợi ý trừ điểm qua `usedHint`/`firstTry`.
- `components/learn/Handbook.tsx` — sổ tay: tab theo bài / đã gặp / cần ôn /
  đã nhớ vững / tìm kiếm; pinyin bật/tắt; phát âm; ví dụ; lịch sử sai;
  "Tiến độ lưu trên thiết bị này" + Xuất/Nhập JSON bản sao.
- `components/learn/ResultPanel.tsx` — kết quả: gặp 9/9, tự nhớ X/5, cần ôn;
  nút "Ôn lỗi ngay" + "Học tiếp".
- `components/learn/QuestObjective.tsx` — chip mục tiêu hiện tại trên HUD.
- `test/quest-smoke.cjs` — smoke Playwright toàn tuyến (xem dưới).

Sửa:
- `app/page.tsx` — thay toast E placeholder bằng hệ quest: HUD thêm chip mục
  tiêu + nút 📖 Sổ tay + điểm + streak + nút âm thanh (bật/tắt + tốc độ
  0,6/0,8/1,0) + nút "✋ Tương tác" (mobile); intro thêm "Tiếp tục học" +
  "Chọn bài" (chỉ HSK 3 Bài 10 mở được, các bài khác "Sắp ra mắt ở Bước 6");
  E tính vật gần nhất từ `playerState.pos` (poll 200 ms), chỉ trong
  triggerRadius mới có tác dụng, ngoài tầm toast "Hãy đến gần hơn"; panel mở
  → `uiLocked=true`; fade vào/ra phòng; khôi phục vị trí theo questState
  khi reload; banner thiếu giọng zh-CN (không chặn học).
- `lib/playerState.ts` — CHỈ THÊM `uiLocked`, `inClassroom`.
- `lib/campus.ts` — CHỈ THÊM `CLASSROOM_DOOR` ((-58,-45.5), r=2.5),
  `CLASSROOM` (bounds/spawn/bảng/bàn/NPC), `CLASSROOM_COLLIDERS`,
  `resolveClassroomCollisions`. Không sửa số liệu cũ. Spawn phòng dời
  z=2 → z=1 để camera thứ ba có chỗ đứng trong phòng (xem "Lỗi đã sửa").
- `components/three/Player.tsx` — tối thiểu: tôn trọng `uiLocked` (move=0,
  E không dispatch); mode phòng học (bounds/collider/spawn phòng, camera
  kẹp trong phòng, dist 3 m khi vào lớp); hook thêm `enterClassroom()` /
  `exitClassroom()` / `isInClassroom()`; reset về spawn phòng khi đang ở
  trong phòng.
- `components/three/CampusScene.tsx` — thêm props `inClassroom`,
  `notebookOpen`, `homework`, `onObjectClick`; render Classroom thay cho
  Ground/Landmarks khi ở trong phòng; NPC Minh chỉ ở campus.

## Cách chạy + kiểm chứng

- `npx tsc --noEmit` → exit 0.
- `npm run build` → PASS, ra `out/`.
- `node test/quest-smoke.cjs` → tự mở server `out/` ở 127.0.0.1:8321,
  chạy toàn tuyến bằng DOM (dùng hook teleport cho đoạn đi bộ dài),
  log `test-shots/quest-smoke.json`, ảnh `test-shots/step4-*.png`.
  Lần chạy cuối: **20/20 bước PASS, 0 lỗi console, 0 lỗi page**
  (thời gian ~190 s — chủ yếu là SwiftShader ~1–2 fps + chờ, không phải
  thời gian chơi thật).
- `node test/leg-sim.cjs` (campus cũ, kiểm tra hồi quy): **4/4 PASS**.

## Kết quả từng bước tuyến (smoke cuối)

| # | Bước | Kết quả |
|---|---|---|
| 1 | Gặp Minh ở cổng, E nhận nhiệm vụ | PASS |
| 2 | Tới cửa C1, E vào phòng (fade) | PASS — vào phòng, bước cô giáo (数学) tự mở |
| 3 | Chọn đúng bảng đen | PASS |
| 4 | Mở vở 笔记 / nhận 作业 | PASS — animation nắp vở + bay lên tay |
| 5 | 认真 / 清楚 (tình huống) | PASS |
| 6 | Xếp câu 把 "请把作业交给老师。" | PASS — tập bài bay tới tay cô giáo |
| 7 | 遍 chọn 3 lượt | PASS |
| 8 | 提高 chọn mục tiêu | PASS |
| 9 | Kiểm tra cuối 5 từ (gõ pinyin ×2, chọn nghĩa ×2, nghe chép ×1) | PASS — 5/5 đúng lần đầu |
| 10 | Kết quả: gặp 9/9, tự nhớ 5/5; điểm 110 trước thưởng, 160 sau +50đ | PASS |
| 11 | "Ôn lỗi ngay" mở sổ tay tab Cần ôn | PASS |
| 12 | "Học tiếp" ra khỏi phòng về cửa C1 | PASS |
| 13 | Reload → "Tiếp tục học" → điểm giữ 160 | PASS |

Điểm: 11 câu đúng lần đầu × 10đ = 110 + thưởng hoàn thành 50đ = 160.
Thưởng idempotent qua `store.awardQuestCompletion` (chơi lại không cộng lại
— kiểm chứng bằng `awarded:false` ở lần hoàn thành thứ hai trong logic;
smoke chỉ chạy một lượt hoàn thành).

## Lệch hợp đồng engine đã gặp và cách khớp (đã sửa, tsc 0)

1. `checkPinyin` / `checkHanzi` trả `{ ok, detail }`, không phải `boolean`
   → dùng `.ok`, hiện `.detail` làm lý do sai (vd sai thanh điệu ở âm tiết
   nào). (QuestPanel)
2. `importProgress(text)` trả `{ ok, progress?, error?, warnings? }`
   → kiểm tra `.ok` mới ghi đè; lỗi hiện `.error`, không mất dữ liệu cũ;
   `warnings` (id lạ bị loại) hiện kèm. (Handbook)
3. `LEXEMES` không export từ `content/hsk3-l10.ts` — tên thật là
   `HSK3_L10_LEXEMES` (alias `EXAMPLES` thì có).
4. `activity` phải thuộc `ActivityType` của engine — map: chọn vật/chọn mục
   tiêu → `'quest'`, chọn nghĩa/chọn số → `'quiz'`, xếp câu → `'fill'`,
   kiểm tra cuối → `'review'`.
5. `awardQuestCompletion` trả `{ progress, awarded, points }`, không phải
   `Progress` trực tiếp — dùng `.progress`, `awarded=false` nghĩa là đã
   nhận thưởng trước đó.
6. `recordAnswer` có `firstTry?` — QuestPanel theo dõi "đã sai ở câu này
   chưa" và truyền `firstTry` (đúng lần đầu 10đ, đúng sau khi sai 3đ);
   kiểm tra cuối mỗi câu chỉ trả lời một lần nên `firstTry: true`.
7. `speak`/`hasChineseVoice` khớp hợp đồng (lỗi `'no-voice'` → banner).

## Lỗi đã tìm và sửa trong lúc test

1. **React error #310 (hooks)** — `useMemo` (due/encountered) nằm sau early
   return màn intro → số hook đổi khi `entered` false→true, app crash ngay
   khi vào trường. Sửa: dời mọi hook lên trước early return.
2. **Hướng camera vào phòng sai** — `enterClassroom` đặt `yaw = π` (nhìn
   về +Z, tường nam). Hướng nhìn = `-(sin yaw, cos yaw)` nên muốn nhìn bắc
   (−Z, về bảng) phải là `yaw = 0`. Sửa + ra khỏi phòng cũng quay mặt về
   bắc (nhìn quảng trường C1).
3. **Camera lọt ra ngoài phòng** — phòng sâu 6 m, camera 4,5–7 m sau avatar
   đứng ngoài tường nam, nhìn xuyên khe cửa vào. Sửa: kẹp vị trí camera
   trong lòng phòng (x ±4,3; z ±2,8; y ≤ 2,85), rút dist về 3 m khi vào
   lớp, spawn phòng dời z=2 → z=1.
4. **Nút "🎯 Nhiệm vụ" chồng hộp hướng dẫn** (cùng vị trí giữa-dưới trên
   desktop) — Playwright không bấm được (pointer events bị chặn). Sửa: dời
   nút vào cột trái trên, dưới chip điểm.
5. **Mâu thuẫn khóa E ở bước đi bộ** — panel goto mở thì E/WASD bị khóa nên
   không tới được cửa. Sửa: panel goto có nút "Đóng bảng để đi tới lớp";
   sang bước mới (không phải goto) panel tự mở lại.

## Giả định về engine (ghi để luồng engine đối chiếu)

- `recordAnswer`/`markEncountered`/`markActivityDay` là hàm thuần, trả
  `Progress` mới (không mutate).
- `recordAnswer` tự tính điểm trong store từ `firstTry`/`usedHint`/replay
  (UI không cộng điểm tay).
- `loadProgress` trả `Progress` (kèm `loadError?` tạm khi JSON hỏng —
  `saveProgress`/`exportProgress` loại trường này khi ghi).
- `getDueWords(p, todayKey())` trả id các từ cần ôn; `encountered` là
  `string[]`.
- `speak(text, { rate, onEnd?, onError? })` — thiếu giọng gọi
  `onError('no-voice')`, không throw.
- `checkPinyin(input, expected, 'tone')` chấp nhận cả dạng dấu
  ("shùxué") và dạng số thanh.

## Chưa xác minh được

- Cảm giác di chuyển/FPS và gõ pinyin có dấu trên điện thoại thật (chỉ có
  SwiftShader ~1–2 fps; smoke dùng bàn phím desktop).
- Giọng đọc zh-CN thật trên thiết bị người dùng (headless không có giọng →
  banner hiện đúng, học bằng chữ vẫn chạy).
- Animation "bay lên tay" nhìn từ góc người chơi thật (chỉ kiểm chứng bằng
  ảnh tĩnh + vị trí đích đúng trong code).
- Chơi lại toàn tuyến lần 2 (thưởng không cộng lại) mới kiểm chứng ở mức
  logic `awarded=false`, chưa chạy smoke lượt 2 end-to-end.
- Ảnh chụp `step4-*.png` là ảnh SwiftShader (màu/ánh sáng có thể khác máy thật).
