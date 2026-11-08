# Đặc tả Module: Hệ thống Học Tiếng Trung HSK 3–4 & SRS (`feature.learning.hsk`)

## 1. Thông tin Định danh Module

- **Module ID:** `feature.learning.hsk`
- **Purpose:** Cung cấp toàn bộ kho từ vựng HSK 3–4 (1.057 từ), 50 tuyến nhiệm vụ tương tác, bộ chấm Pinyin/Hán tự, thuật toán lặp lại ngắt quãng (SRS), lịch ôn 7 ngày, sổ lỗi, 6 huy hiệu toàn cục và lưu trữ tiến độ bền vững.
- **Source Paths:**
  - Nội dung từ vựng (Content): [`content/hsk3-index.ts`](file:///home/bao/Hust3D/hust-hsk/content/hsk3-index.ts) (`hsk3-l10.ts`..`hsk3-l18.ts`), [`content/hsk4-index.ts`](file:///home/bao/Hust3D/hust-hsk/content/hsk4-index.ts) (`hsk4-shang-l1.ts`..`l10.ts`, `hsk4-xia-l11.ts`..`l20.ts`)
  - Engine & Logic Thuần (Pure Logic): [`lib/learn/types.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/types.ts), [`lib/learn/pinyin.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/pinyin.ts), [`lib/learn/store.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/store.ts), [`lib/learn/quest-data.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/quest-data.ts), [`lib/learn/quest-data-hsk4-shang.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/quest-data-hsk4-shang.ts), [`lib/learn/quest-data-hsk4-xia.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/quest-data-hsk4-xia.ts), [`lib/learn/badges.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/badges.ts), [`lib/learn/suggest.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/suggest.ts), [`lib/learn/speech.ts`](file:///home/bao/Hust3D/hust-hsk/lib/learn/speech.ts)
  - Giao diện React (UI): [`components/learn/QuestPanel.tsx`](file:///home/bao/Hust3D/hust-hsk/components/learn/QuestPanel.tsx), [`components/learn/Handbook.tsx`](file:///home/bao/Hust3D/hust-hsk/components/learn/Handbook.tsx), [`components/learn/ReviewSession.tsx`](file:///home/bao/Hust3D/hust-hsk/components/learn/ReviewSession.tsx), [`components/learn/ResultPanel.tsx`](file:///home/bao/Hust3D/hust-hsk/components/learn/ResultPanel.tsx), [`components/learn/QuestObjective.tsx`](file:///home/bao/Hust3D/hust-hsk/components/learn/QuestObjective.tsx)
- **Reference Assets:**
  - [`docs/content-audit.md`](file:///home/bao/Hust3D/hust-hsk/docs/content-audit.md), [`docs/learn-engine.md`](file:///home/bao/Hust3D/hust-hsk/docs/learn-engine.md), [`docs/coverage-hsk3.md`](file:///home/bao/Hust3D/hust-hsk/docs/coverage-hsk3.md), [`docs/coverage-hsk4.md`](file:///home/bao/Hust3D/hust-hsk/docs/coverage-hsk4.md).
- **Current Implementation Status:** **Production** (Đã hoàn thiện và kiểm thử 45/45 unit tests + 48/48 quest e2e).

---

## 2. Ràng buộc Bất biến (`Invariants`)

1. **Độc lập hoàn toàn với WebGL:**
   - Không có bất kỳ file nào trong `content/*` hoặc `lib/learn/*` được phép import `three` hay `@react-three/*`.
2. **Quy mô & Tính Toàn vẹn Nội dung:**
   - Tổng cộng **1.057 từ vựng có ID duy nhất toàn cục**:
     - **HSK 3 (Bài 10–18):** 246 từ / 36 nhóm / 10 nhiệm vụ (`first-lesson`, `l10-g234`, `l11`..`l18`).
     - **HSK 4 (Bài 1–20):** 811 từ (Quyển Thượng bài 1–10: 404 từ; Quyển Hạ bài 11–20: 407 từ) / 50 nhóm / 40 nhiệm vụ (`hsk4-shang-l1a/b` .. `hsk4-xia-l20a/b`).
   - Mỗi từ vựng có đúng 1 câu ví dụ tự biên soạn (`example.authored === true`).
3. **Thuật toán SRS & Tính Điểm (`lib/learn/store.ts`):**
   - Cấp độ ghi nhớ `level` từ `0` đến `5` với khoảng cách ôn tập `[1, 2, 4, 7, 14, 30]` ngày:
     - Trả lời đúng không dùng gợi ý: `level = min(5, level + 1)`, cộng `+10đ` (lần đầu) / `+5đ` (thử lại).
     - Trả lời đúng có dùng gợi ý: giữ nguyên `level`, hẹn ôn lại vào ngày mai, cộng `+3đ`.
     - Trả lời sai: `level = 0`, `wrongCount + 1`, hẹn ôn lại vào ngày mai, cộng `+2đ` khuyến khích khi vượt qua.
   - Phần thưởng hoàn thành nhiệm vụ (`+50đ` qua `awardQuestCompletion`) là **idempotent** — làm lại nhiệm vụ đã hoàn thành không cộng trùng điểm thưởng 50đ.
   - Ôn lại từ trong Sổ lỗi cùng ngày (`recordReReview`) cộng `0đ` và không thay đổi `level`/`nextDue` để chống cày điểm.
4. ** Lưu trữ & Tương thích Ngược (`localStorage` key `bkhn-progress-v1`):**
   - Dữ liệu hỏng hoặc thiếu trường từ phiên bản cũ phải tự động migrate về giá trị mặc định an toàn mà không ném ngoại lệ (`throw`).
   - Khi nhập (Import) file JSON sao lưu, chỉ chấp nhận các `lexemeId` thuộc tập 1.057 từ hợp lệ (`KNOWN_LEXEME_IDS`), loại bỏ các ID lạ kèm cảnh báo.

---

## 3. Tiêu chí Nghiệm thu & Giới hạn Hiện tại

- **Acceptance Criteria:**
  - `npm run test:learn` (`node test/learn.test.cjs`) đạt **45/45 PASS**.
  - Gõ Pinyin trong `QuestPanel` hỗ trợ chế độ không bắt buộc dấu thanh (`toneless`) và không kích hoạt phím di chuyển nhân vật.
- **Known Limitations:**
  - Cấp độ HSK 5 hiện hiển thị trạng thái khóa trên giao diện chọn bài do chưa có bộ dữ liệu nguồn được kiểm toán.
  - Phát âm tiếng Trung sử dụng Web Speech API (`window.speechSynthesis`, giọng `zh-CN`) sẵn có trên trình duyệt/hệ điều hành; nếu thiết bị thiếu gói giọng tiếng Trung, ứng dụng hiển thị thông báo rõ ràng và vẫn cho phép hoàn thành mọi bài tập bằng chữ.
