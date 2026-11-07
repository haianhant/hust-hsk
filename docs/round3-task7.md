# Đợt 3 — Mục 7 (làm SAU khi xong mục 1–6): Sửa lỗi gõ "a" + bỏ bắt buộc dấu thanh

Ghi chú coordinator, 2026-11-06 ~21:50. User báo trong lúc làm kiểm tra cuối bài HSK 4 bài 1.

## Triệu chứng user báo
- Từ 加油, gõ "jia" thì chữ "a" không vào ô (ô nhập chỉ còn "jiyou").
- User hỏi còn chữ nào bị vậy không + lý do.
- User yêu cầu: nhập từ thì đừng bắt nhập dấu thanh, gõ "jiayou" là được.

## Chẩn đoán đã xác minh (parent đọc code)
1. **Lỗi không gõ được "a"**: `components/three/Player.tsx`, listener `keydown` toàn cục trên `window` — với KeyW/KeyA/KeyS/KeyD (+ mũi tên + Shift) nó gọi `e.preventDefault()` VÔ ĐIỀU KIỆN, kể cả khi người dùng đang gõ trong ô `<input>` pinyin của QuestPanel. `preventDefault()` trên keydown chặn ký tự vào ô đang focus. Các phím bị ảnh hưởng: **W, A, S, D** (mũi tên/Shift cũng bị chặn nhưng ít gặp khi gõ). Mọi pinyin chứa w/a/s/d đều không gõ được: 加油 jiāyóu (a), 数学 shùxué (s), 我 wǒ (w), 大 dà (d, a)... Phím E không bị preventDefault (và có guard uiLocked) nên "e" gõ bình thường — khớp với "jiyou" vẫn vào đủ j/i/y/o/u.
   - **Sửa**: trong `onKeyDown` (và `onKeyUp` cho đối xứng) của Player.tsx, return sớm khi event target là phần tử nhập liệu (input/textarea/select/contentEditable) — không preventDefault, không thêm vào keysRef. Việc này cũng chặn nhân vật đi bộ trong lúc đang gõ.
2. **Bỏ bắt buộc dấu thanh**: chỉ ĐÚNG 1 chỗ dùng mode 'tone' là `components/learn/QuestPanel.tsx:217` — câu gõ pinyin ở kiểm tra cuối (`submitReviewText`, kind 'type-pinyin'), prompt dòng 712 "Gõ pinyin có dấu thanh của từ trên:". Hàm `checkPinyin` trong `lib/learn/pinyin.ts` ĐÃ CÓ sẵn mode 'toneless' (so sánh sau khi bỏ dấu).
   - **Sửa**: đổi chỗ gọi đó sang 'toneless'; đổi prompt thành "Gõ pinyin của từ trên (không bắt buộc dấu thanh):". Giữ nguyên hàm mode 'tone' trong pinyin.ts (không xóa) cho nhiệm vụ kiểm tra thanh điệu chuyên biệt sau này — chỉ không dùng nó cho câu gõ từ nữa. Cập nhật test engine nào đang assert hành vi tone-strict cho câu gõ từ (mode 'tone' vẫn giữ unit test riêng của nó).

## Thứ tự thực hiện
- Làm SAU khi xong mục 1–6 (giai đoạn 1 đang sửa Player.tsx; giai đoạn 4 xe máy cũng chạm Player.tsx). Gộp vào giai đoạn tích hợp (mục 6) do coordinator tự làm hoặc spawn worker riêng lúc đó.
- Không deploy riêng — gộp vào deploy đợt 3.

## Kiểm chứng bắt buộc (bằng trình duyệt thật, không chỉ unit test)
- Mở kiểm tra cuối một bài, focus ô nhập pinyin, gõ lần lượt w/a/s/d, xác nhận cả 4 ký tự đều vào ô.
- Gõ "jiayou" cho 加油 → chấm ĐÚNG.
- Gõ sai chữ (vd "jiyou") → vẫn chấm SAI, phản hồi chỉ đúng vị trí chữ sai.
- Gõ pinyin có dấu đúng (vd "jiāyóu") → vẫn được chấp nhận.
- Thêm test hồi quy (vd test/pinyin-input.cjs hoặc mở rộng verify hiện có).
- Chạy lại toàn bộ: engine 45/45, verify-step4fix 24/24, 0 lỗi console/page.
- Ghi vào PROGRESS.md + báo cáo cuối.
