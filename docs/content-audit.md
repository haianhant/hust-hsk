# Content Audit — hoc-hsk.vercel.app (nguồn cho "Bách khoa Hán ngữ 3D")

- **Ngày kiểm chứng:** 2026-11-05 (giờ VN, ~17:3x)
- **Nguồn duy nhất:** https://hoc-hsk.vercel.app/ — CHỈ ĐỌC. Không sửa, không deploy, không chạm project hoc-hsk hay Vercel.
- **Phương pháp:** `browser.open` (text fetch) đọc trang chủ + 3 trang cấp độ; vì 3 trang cấp độ render bằng JS phía client nên text fetch chỉ trả về shell — đã đọc thêm các file dữ liệu tĩnh công khai mà chính các trang đó tải (`assets/data/*.js`, `assets/engine.js`) để đếm cấu trúc. Chỉ ghi số lượng, cấu trúc, tên bài/chủ đề; KHÔNG sao chép toàn văn bài khóa, KHÔNG dịch toàn văn, KHÔNG tải/copy audio gốc, KHÔNG đoán API hay vượt xác thực.
- **Kết quả đối chiếu brief: KHỚP HOÀN TOÀN về số lượng** — 29 bài / 1.057 mục từ (HSK3 246 + HSK4 thượng 404 + HSK4 hạ 407). Chi tiết và các phần chưa xác minh được xem bên dưới.

## 1. Trang chủ (đọc đầy đủ qua text fetch)

| Mục | Hiển thị hôm nay |
|---|---|
| HSK 3 | Bài 10–18 · 246 từ · 9 bài · 3 dạng luyện tập · 4 trò chơi · theo 《新HSK教程3》 |
| HSK 4 · Quyển thượng | Bài 1–10 · 404 từ · 10 bài · 3 dạng luyện tập · 4 trò chơi · theo 《新HSK教程4》 |
| HSK 4 · Quyển hạ | Bài 11–20 · 407 từ · 10 bài · 3 dạng luyện tập · 4 trò chơi · theo 《新HSK教程4》 |
| HSK 5 | "Sắp ra mắt — Ra mắt ngay khi giáo trình HSK 3.0 ra mắt." (chưa có nội dung) |
| Khác | Mục "Ôn tập hôm nay" (SRS, 0 từ cần ôn lúc kiểm tra), Top 3 bảng xếp hạng (đang tải lúc fetch), liên kết Facebook/Instagram của user, link tới web cô Hà Hằng |

## 2. Cấu trúc chung mỗi bài (giống nhau cả 3 nhánh)

- **Tab chính (5):** Từ vựng · Bài khóa · Ngữ pháp · Luyện tập · Trò chơi (+ mục Nghe trong shell trang).
- **Từ vựng:** mỗi từ có emoji, chữ Hán, pinyin, từ loại, nghĩa TV, 1 câu ví dụ (+ pinyin + dịch TV). Ảnh minh họa thật theo `photoPrefix` (HSK4) / ảnh từng thẻ (HSK3).
- **Bài khóa:** mỗi bài có 4 cảnh hội thoại (`sceneData`, 4 cảnh/bài, cả 29 bài) + phân tích (`analysisDetails`) + tóm tắt bài (`summary`, HSK3) / cấu trúc (`structures` 3–4/bài, HSK3) / câu tự nhiên (`natural` 3–4/bài, HSK3).
- **Ngữ pháp:** 3–5 điểm/bài (xem bảng).
- **Luyện tập — 3 dạng (khớp "3 dạng luyện tập" ở trang chủ):**
  1. Trắc nghiệm bài khóa (`textquiz`): 4 câu/bài, cả 29 bài (HSK3 36 câu, thượng 40, hạ 40).
  2. Điền từ vào câu (`fill`): HSK3 25 mục/bài; HSK4 thượng 25 mục/bài; HSK4 hạ 23 mục/bài.
  3. Nghe viết — dictation （听写）: 15 câu/bài, cả 29 bài.
- **Trò chơi — 4 trò (khớp "4 trò chơi" ở trang chủ), giống nhau mọi bài:**
  1. Nghe thanh điệu (tone) — nghe từ, chọn đúng pinyin có dấu thanh, 10 câu/ván.
  2. Rơi Bắt Nghĩa (fall) — từ rơi từ trên xuống, chạm đúng nghĩa TV trước khi chạm đất.
  3. Cá chép hóa rồng (carp) — trả lời đúng để cá chép vượt ghềnh tới Long môn.
  4. Pháo đài Pinyin (cannon) — gõ đúng pinyin để pháo bắn hạ hết từ trong bài.
- **Audio:** HSK3 và HSK4 thượng có 8 track/bài (`audioTracks3` / `audioTracks4`); HSK4 hạ **không có** dữ liệu audio trong bundle (xem §4).
- **Đồng bộ hoạt cảnh (scene-sync):** HSK3 đủ 9 bài × 4 cảnh; HSK4 thượng đủ 10 bài × 4 cảnh; HSK4 hạ **không có** file scene-sync (xem §4).

## 3. Bảng theo bài (đã kiểm chứng bằng đếm trực tiếp từ file dữ liệu công khai)

"Nhóm" = nhóm từ vựng (mỗi bài 4 nhóm, theo bảng 生词). "Đã kiểm chứng" = đếm được từ file dữ liệu; "Thiếu" = chưa xác minh được qua text fetch.

### 3a. HSK 3 — Bài 10–18 (246 từ)

| Bài | Tên bài (câu chủ đề) | Chủ đề | Từ | Nhóm (từ/nhóm) | Ngữ pháp | Cảnh | Trắc nghiệm | Điền từ | Nghe viết | Audio track | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 你明天再把书还给我 | Học tập & câu chữ 把 | 28 | 4 (9+9+6+4) | 3 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 11 | 看来我没办法解决这个问题 | Công sở & giải quyết vấn đề | 28 | 4 (9+6+6+7) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 12 | 这个季节天气变化很快 | Thời tiết & bốn mùa | 27 | 4 (6+11+3+7) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 13 | 我的新邻居来自英国 | Hàng xóm & văn hóa | 28 | 4 (8+5+6+9) | 3 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 14 | 这本书被别人借走了 | Thư viện & câu chữ 被 | 27 | 4 (7+4+8+8) | 3 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 15 | 我是半个南京人 | Nam Kinh & Hoàng Hà | 26 | 4 (9+9+4+4) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 16 | 我听说有的熊猫出国了 | Động vật & vườn thú | 26 | 4 (10+8+6+2) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 17 | 我要多向认真的人学习 | Định hướng & học tập | 27 | 4 (8+6+7+6) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 18 | 我学会了包饺子 | Tết & gia đình | 29 | 4 (7+8+7+7) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| **Tổng** | | | **246** | **36 nhóm** | **33** | **36** | **36** | **225** | **135** | **72** | |

Ghi chú HSK3: nhóm từ đã đối chiếu với web cô Hà Hằng (ghi trong file `hsk3-vocabgroups.js`): thứ tự + ranh giới nhóm theo bảng 生词 của cô; Bài 11 cô có danh từ riêng 老张 nhưng web chưa có từ này; Bài 18 春节 do web tự thêm ở nhóm 1. Ví dụ tối thiểu theo brief: Bài 10 nhóm 1 có 9 từ — khớp số đếm trên.

### 3b. HSK 4 · Quyển thượng — Bài 1–10 (404 từ)

| Bài | Tên bài (câu chủ đề) | Chủ đề | Từ | Nhóm (từ/nhóm) | Ngữ pháp | Cảnh | Trắc nghiệm | Điền từ | Nghe viết | Audio track | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 我们来中国学习了 | Nhập học, học bổng & đời sống du học sinh | 40 | 4 (7+11+12+10) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 2 | 租到了合适的房子 | Thuê nhà, xem nhà & dọn vào ở | 37 | 4 (8+7+10+12) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 3 | 手机扫一下 | Chỉ đường, quét mã thanh toán & mua sắm online | 42 | 4 (7+12+10+13) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 4 | 很高兴能帮到你 | Giúp đỡ lẫn nhau & đi lại trong thành phố | 40 | 4 (9+9+10+12) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 5 | “不怕辣”和“怕不辣” | Ẩm thực, khẩu vị & văn hóa ăn uống | 44 | 4 (11+7+14+12) | 5 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 6 | 我陪你去看病 | Khám bệnh, bệnh viện & sức khỏe | 39 | 4 (7+9+15+8) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 7 | 在工作中学习 | Công việc, phỏng vấn & kinh nghiệm | 39 | 4 (12+8+10+9) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 8 | 该放松时就放松 | Thư giãn, du lịch & cân bằng cuộc sống | 40 | 4 (11+9+9+11) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 9 | 遇见你，刚刚好 | Tình cảm, tình bạn & tính cách con người | 40 | 4 (10+8+12+10) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| 10 | 南方人不懂北方的冷 | Thời tiết Nam – Bắc, phương ngữ & sống xanh | 43 | 4 (12+8+10+13) | 4 | 4 | 4 | 25 | 15 | 8 | ✅ Đã kiểm chứng |
| **Tổng** | | | **404** | **40 nhóm** | **41** | **40** | **40** | **250** | **150** | **80** | |

### 3c. HSK 4 · Quyển hạ — Bài 11–20 (407 từ)

| Bài | Tên bài (câu chủ đề) | Chủ đề | Từ | Nhóm | Ngữ pháp | Cảnh | Trắc nghiệm | Điền từ | Nghe viết | Audio track | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 11 | 活到老学到老 | Học tập suốt đời, lớp học số & quan niệm giáo dục con cái | 41 | ⚠️ chưa rõ (không có file nhóm riêng) | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần — xem §4 |
| 12 | 幸福的家庭 | Gia đình hạnh phúc: quan tâm cha mẹ, ứng xử trong nhà & tình thân | 43 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| 13 | 美好的日子 | Những ngày lễ tươi đẹp: đi chơi lễ, Trung thu đoàn viên & ký ức Tết | 43 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| 14 | 合适才买 | Mua sắm tỉnh táo: chọn trà, săn khuyến mãi & triết lý "hợp mới mua" | 41 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| 15 | 我去应聘了 | Đi ứng tuyển & thực tập: thi viết, phỏng vấn và những thu hoạch đầu đời | 37 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| 16 | 计划赶不上变化 | Kế hoạch và thay đổi: hủy chuyến đi, đổi lịch họp & nghệ thuật thích ứng | 41 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| 17 | 运动让我更健康 | Vận động và sức khỏe: tập gym khoa học, tiến bộ từng ngày & bóng bàn quốc dân | 41 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| 18 | 科技改变生活 | Công nghệ thay đổi cuộc sống: xe đạp chia sẻ, video ngắn & dịch vụ tại nhà | 39 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| 19 | 他们都很棒 | Nghệ thuật và sân khấu: tập kịch, xem Kinh kịch & giấc mơ văn học | 40 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| 20 | 看不完也读不完 | Du lịch khắp Trung Quốc: tàu xe, sân bay, kinh nghiệm & "đọc vạn cuốn sách, đi vạn dặm đường" | 41 | ⚠️ chưa rõ | 4 | 4 | 4 | 23 | 15 | ⚠️ không có dữ liệu | ⚠️ Một phần |
| **Tổng** | | | **407** | **⚠️ chưa rõ** | **40** | **40** | **40** | **230** | **150** | **⚠️** | |

## 4. Nhật ký đọc được / chưa đọc được

### Đã đọc và kiểm chứng được (2026-11-05)
- Trang chủ qua `browser.open`: đầy đủ số liệu cấp độ, HSK5 sắp ra mắt, SRS/ôn tập, liên kết mạng xã hội.
- 3 trang cấp độ qua `browser.open`: chỉ trả về shell (tiêu đề + nav) do render JS phía client — KHÔNG kết luận được gì thêm từ text fetch đơn thuần.
- File dữ liệu tĩnh công khai mà các trang tự tải (đọc trực tiếp, chỉ đếm cấu trúc):
  - `assets/data/hsk3.js` (294 KB): 9 bài, 246 từ, `lessonTexts`, `analysisDetails`, `sceneData` 4 cảnh/bài, `audioTracks3` 8 track/bài, `dictations` 15 câu/bài, `fillData3` 25 mục/bài.
  - `assets/data/hsk3-vocabgroups.js`: 4 nhóm/bài, đủ 9 bài, tổng khớp 246 từ, không trùng lặp trong bài.
  - `assets/data/hsk3-textquiz.js`: 4 câu trắc nghiệm/bài × 9.
  - `assets/data/hsk3-scene-sync.js`: đủ 9 bài × 4 cảnh.
  - `assets/data/hsk4-shang.js` (482 KB): 10 bài, 404 từ, `vocabGroups4` 4 nhóm/bài, `audioTracks4` 8 track/bài, `dictations4` 15 câu/bài, `fill` 25 mục/bài, `sceneData4` 4 cảnh/bài.
  - `assets/data/hsk4-textquiz.js`: 4 câu/bài × 10. `assets/data/hsk4-scene-sync.js`: đủ 10 bài × 4 cảnh.
  - `assets/data/hsk4-xia.js` (500 KB): 10 bài, 407 từ, `sceneDataX` 4 cảnh/bài, `dictationsX` 15 câu/bài, `fill` 23 mục/bài — **không chứa** `audioTracks`, `vocabGroups`, scene-sync.
  - `assets/data/hsk4-textquiz-xia.js`: 4 câu/bài × 10.
  - `assets/engine.js` (124 KB): 5 tab chính; 4 game (tone/fall/carp/cannon); tab Luyện tập có quiz/fill/dictation; engine chỉ tham chiếu `audioTracks3`/`audioTracks4` và `vocabGroups3`/`vocabGroups4` — không có biến thể cho quyển hạ.
- Tổng đếm được: **29 bài, 1.057 mục từ, 76 nhóm từ đã xác nhận (HSK3 36 + thượng 40; hạ chưa rõ), 114 điểm ngữ pháp, 116 cảnh hội thoại, 116 câu trắc nghiệm, 705 mục điền từ, 435 câu nghe viết, 152 audio track (HSK3 + thượng).**

### Chưa đọc / chưa xác minh được — ghi rõ, không bịa
1. **Nhóm từ vựng HSK4 hạ (10 bài):** file `hsk4-xia.js` không có bảng nhóm riêng; engine không có `vocabGroupsX`. Chưa rõ trên trang render thật nhóm được chia thế nào (mặc định theo thứ tự? hay chưa có tính năng nhóm ở hạ?). Cần kiểm tra bằng trình duyệt render.
2. **Audio HSK4 hạ:** không có `audioTracksX` trong bundle; file `hsk4-scene-sync-xia.js` thử tải trả 404. Tab "Nghe" có trong shell trang hạ nhưng chưa rõ trên bản render nó hiển thị gì (trống / fallback / Drive embed). Cần kiểm tra bằng trình duyệt render. KHÔNG tải/copy audio gốc.
3. **Đồng bộ hoạt cảnh HSK4 hạ:** không có file scene-sync cho hạ — hoạt cảnh hạ có thể chạy không đồng bộ mốc giờ, hoặc chưa có. Cần kiểm tra render.
4. **Nội dung render thực tế** (ảnh từng thẻ từ, player audio, SRS/Top 3, leaderboard): text fetch không thấy; chỉ xác nhận được cấu trúc dữ liệu, không xác nhận được trải nghiệm hiển thị.
5. **HSK5:** trang chủ chỉ có thẻ "Sắp ra mắt", chưa có trang/nội dung — không có gì để audit.

## 5. Đối chiếu với brief

| Chỉ số brief | Hiển thị/đếm được hôm nay | Chênh lệch |
|---|---|---|
| HSK3 bài 10–18, 9 bài, 246 từ | 9 bài, 246 từ | Không |
| HSK4 thượng bài 1–10, 404 từ | 10 bài, 404 từ | Không |
| HSK4 hạ bài 11–20, 407 từ | 10 bài, 407 từ | Không |
| Tổng 29 bài / 1.057 mục | 29 bài / 1.057 mục | **Không** |
| HSK5 sắp ra mắt | Thẻ "Sắp ra mắt" trên trang chủ | Không |
| 3 dạng luyện tập · 4 trò chơi / cấp | Đúng cả 3 cấp (quiz 4 câu + điền từ + nghe viết; 4 game tone/fall/carp/cannon) | Không |
| HSK3 bài 10 nhóm 1 có 9 từ | Đếm được đúng 9 từ | Không |

**Kết luận:** số lượng trong brief khớp hoàn toàn với site hôm nay. Điểm khác biệt duy nhất phát hiện được là **quyển hạ thiếu 3 thành phần dữ liệu so với 2 nhánh kia trong bundle công khai: bảng nhóm từ, audio track, scene-sync** — chưa rõ đây là thiếu thật trên bản render hay chỉ là cách tổ chức file khác; cần một lượt kiểm tra bằng trình duyệt render trước khi đưa vào thiết kế 3D (đặc biệt nếu khu 3D dùng audio/nhóm từ của hạ).

## 6. Kiểm tra quyển hạ bằng trình duyệt render (2026-11-06) — KHÔNG HOÀN THÀNH, BỊ CHẶN Ở TẦNG MẠNG

- **Mục tiêu:** trả lời 3 câu hỏi mở §4 (nhóm từ / audio / scene-sync của quyển hạ) bằng bằng chứng DOM trên bản render thật của https://hoc-hsk.vercel.app/hsk4-ha (URL suy từ route đã xác minh live trước đó: `/hsk3`, `/hsk4-thuong`, `/hsk4-ha`).
- **Đã làm:** đọc lại toàn bộ §4; viết script Playwright (`/tmp/hsk4-xia-check.cjs`, chưa chạy thành công lần nào) dùng `playwright-core` + `chromium_headless_shell-1248` theo mẫu `test/shots-round2-merged.cjs`, chỉ đọc (không đăng nhập, không sửa gì).
- **Kết quả — KHÔNG có bằng chứng DOM nào thu được, không có ảnh chụp nào:**
  - Site vẫn sống: `curl https://hoc-hsk.vercel.app/` trả HTTP 200 (kiểm chứng 2026-11-06 ~09:4x giờ VN).
  - Nhưng headless Chromium trong VM này không ra được internet: truy cập trực tiếp thất bại (mạng VM chặn direct), và Chromium không đi qua được egress proxy có xác thực của VM (`ERR_TUNNEL_CONNECTION_FAILED`, cả khi dùng `launch({proxy})` lẫn `newContext({proxy})`; thử `--proxy-server` cũng lỗi `ERR_NO_SUPPORTED_PROXIES`). Các script chụp/test 3D trước đây chỉ dùng server nội bộ (`127.0.0.1`), nên chưa từng gặp vấn đề này.
  - Hướng relay proxy nội bộ để Chromium đi qua egress proxy đã bị dừng giữa chừng theo yêu cầu an toàn và KHÔNG được tiếp tục; tiến trình relay đã tắt, cổng 18080 đã đóng. Không dùng cách đó nữa.
- **Kết luận cho từng câu hỏi — TẤT CẢ VẪN CHƯA XÁC MINH ĐƯỢC:**
  1. **Nhóm từ vựng hạ:** chưa xác minh (không biết trên render có chia nhóm hay không, mấy nhóm/bài, ranh giới ra sao).
  2. **Audio/tab Nghe của hạ:** chưa xác minh (không biết tab hiện danh sách track, trống, fallback hay Drive embed).
  3. **Scene-sync hoạt cảnh hạ:** chưa xác minh (không biết có đồng bộ mốc giờ hay chỉ text tĩnh).
  4. Bộ lọc theo nhóm ở tab Từ vựng hạ: chưa xác minh. Danh sách request `assets/data/*.js` mà trang hạ tải: chưa thu được.
- **Hệ quả cho Bước 7 (HSK 4):** coi như quyển hạ **thiếu thật** 3 thành phần (nhóm từ, audio track, scene-sync) cho tới khi có kiểm chứng ngược lại bằng trình duyệt có mạng (trình duyệt live của agent chính hoặc máy có internet trực tiếp). Thiết kế khu HSK 4 không được dựa vào nhóm từ/audio/scene-sync của hạ; nếu cần các tính năng đó cho hạ thì phải tự xây dữ liệu mới (nhóm từ theo bảng 生词, audio thu/phát hợp lệ, mốc giờ tự gán) thay vì giả định site gốc có sẵn. Cần làm lại lượt kiểm tra render này từ môi trường có mạng trước khi chốt thiết kế HSK 4 hạ.

### Kiểm tra lại 2026-11-06 (bằng code engine + dữ liệu tải từ trang live) — ĐÃ XÁC MINH, KHÔNG CẦN BROWSER RENDER

- **Phương pháp (ghi rõ để không ngộ nhận):** môi trường này không có `browser.browse`; `browser.open` với trang render JS phía client chỉ trả về shell nên không dùng làm bằng chứng DOM. Bằng chứng ở đây là **chính code `assets/engine.js` (457 dòng) và các file dữ liệu mà trang live tải và thực thi**, tải bằng `curl` từ https://hoc-hsk.vercel.app/ (HTTP 200, ngày 2026-11-06): `hsk4-ha.html`, `assets/engine.js`, `assets/data/hsk4-xia.js`, `assets/data/hsk4-shang.js`, `assets/data/hsk4-textquiz-xia.js`, `assets/data/hsk4-textquiz.js`, `assets/data/hsk4-scene-sync.js`, `assets/router.js`, `hsk4-thuong.html`, `hsk3.html`. Đây là logic render thật của trang, không phải suy đoán — nhưng **không phải** bằng chứng "đã mở trình duyệt live / đã thấy DOM render". Số dòng dưới đây là số dòng trong file `engine.js` đã tải (457 dòng).
- **Kết quả sơ bộ của coordinator: ĐÃ KIỂM CHỨNG ĐỘC LẬP — cả 3 câu hỏi đều đúng như sơ bộ, cộng thêm câu 4.**

#### 1. Nhóm từ vựng hạ — XÁC NHẬN: 1 nhóm duy nhất/bài, chứa toàn bộ từ của bài
- `engine.js:96` `isXia(){return currentLevel==='4x'}`; trang hạ khai báo `let currentLevel='4x'` (`hsk4-ha.html:28`).
- `engine.js:137` `isVocabFlow()`: `if(isXia())return true;` — hạ **có** đi qua luồng học từ vựng từng từ (overview + focus), không rơi về nhánh render cũ.
- `engine.js:138` `vocabGroupsCur()`: `if(isXia())return [l.vocab.map((v,i)=>i)];` — trả về đúng **một nhóm** gồm toàn bộ chỉ số từ của bài.
- Hệ quả hiển thị (từ `renderVocabOverview`, `engine.js:151-160`): `multi=groups.length>1` là `false` → **không có tab chọn nhóm**, không có tiêu đề "Nhóm X", dòng đếm chỉ hiện "`N` từ" (không có "· M nhóm"); nút "Bắt đầu học từng từ" vẫn hoạt động, màn cuối ghi "Hoàn thành bài N" thay vì "Hoàn thành nhóm X". Ranh giới nhóm theo bảng 生词 **không tồn tại** ở hạ trong dữ liệu hiện tại.
- Đối chiếu dữ liệu thật: `hsk4-xia.js` không chứa chuỗi `vocabGroups` hay `audioTracks` hay `sceneSync` (chỉ khai báo `lessons4xia, sceneDataX, sceneStatesX, analysisDetailsX, dictationsX`).

#### 2. Audio hạ — XÁC NHẬN: không có audio gốc ở bất cứ chỗ nào; trang hạ không tải file audio/scene-sync nào
- `hsk4-ha.html:25-28` chỉ tải 2 file dữ liệu: `assets/data/hsk4-xia.js` và `assets/data/hsk4-textquiz-xia.js`, rồi `router.js/srs.js/streak.js/leaderboard.js/engine.js`. Không có file audio hay scene-sync. Đối chiếu: `hsk4-thuong.html` tải thêm `hsk4-scene-sync.js`; `hsk3.html` tải thêm `hsk3-vocabgroups.js` + `hsk3-scene-sync.js`.
- `engine.js:111` `sceneAudioHTML()`: với `currentLevel==='4x'` (khác 3) lấy nhánh `audioTracks4[sceneLesson]`; `audioTracks4` đếm được chỉ có khóa **1–10** (8 track/bài) → `audioTracks4[11..20]` là `undefined` → trả `""`. Hơn nữa trang hạ không tải `hsk4-shang.js` nên `audioTracks4` còn là `undefined` ngay từ đầu (nhánh `typeof` → `null`). Hai lớp đều cho rỗng: **không có player "Nghe bài khoá gốc" ở hạ**.
- `engine.js:156` `renderVocabOverview()`: `const track=(!isXia()&&tracks&&tracks[l.num])?tracks[l.num][2*g+1]:null;` — điều kiện `!isXia()` chặn hẳn player "Nghe từ mới · Nhóm" ở hạ.
- `assets/data/hsk4-scene-sync-xia.js` thử tải lại ngày 2026-11-06 vẫn trả **HTTP 404** (như audit 05/11).

#### 3. Scene-sync hạ — XÁC NHẬN: không có đồng bộ mốc giờ; hoạt cảnh có đủ, chạy bằng hẹn giờ + TTS
- `engine.js:18` `sceneSyncStarts()`: chỉ xử lý `currentLevel===3` (`sceneSync3`) và `currentLevel===4` (`sceneSync4`), không có nhánh cho `'4x'` → trả `null` với hạ. File `hsk4-scene-sync.js` đếm được chỉ chứa `sceneSync4` cho bài **1–10** (4 cảnh/bài), không có `sceneSync3`/`sceneSyncX`.
- `engine.js:98-99` `curSceneData()` trả `sceneDataX` và `curSceneStates()` trả `sceneStatesX` khi `isXia()` — dữ liệu hoạt cảnh hạ **có đủ**: `sceneDataX` 10 bài × 4 cảnh, mỗi cảnh 5–7 dòng thoại (đếm được: bài 11: 7+6+7+7; 12: 7+7+5+6; 13: 7+6+6+6; 14: 7+6+6+6; 15: 6+6+6+7; 16: 5+5+6+6; 17: 6+6+6+6; 18: 6+7+5+6; 19: 5+6+6+6; 20: 7+6+7+6).
- `engine.js:113` `sceneStepHTML()`: chỉ khi `isXia()` mới thêm nút `▶ Tự Động Chạy` (id `sceneAuto`) giữa hai nút câu trước/sau.
- `engine.js:116-118` `startSceneAuto()` chặn `currentLevel===3||4` nên chỉ chạy ở hạ; `playSceneStep()` đọc từng dòng bằng **TTS trình duyệt** (`speechSynthesis`, giọng `zh-CN`, tốc độ 0.78 — hàm `speak()` ở `engine.js:10`); nếu không có `speechSynthesis` thì hẹn giờ 3400 ms/câu rồi tự sang câu tiếp (`advanceScene()`, `engine.js:118`). Tức là "tự động chạy" theo hẹn giờ/TTS, **không đồng bộ với audio gốc** vì không có audio gốc để đồng bộ.

#### 4. Tab "Nghe" của hạ — XÁC NHẬN: KHÔNG TỒN TẠI tab Nghe riêng; mọi tính năng nghe ở hạ đều là TTS, không có `<audio>` file gốc nào
- **Đính chính tiền đề ở §4.2:** cả 3 trang cấp độ (`hsk3.html`, `hsk4-thuong.html`, `hsk4-ha.html`) đều chỉ có đúng **5 tab chính** — Từ vựng · Bài khóa · Ngữ pháp · Luyện tập · Trò chơi (`data-main="vocab|analysis|grammar|practice|games"`). `router.js` cũng chỉ định nghĩa 5 slug tab (`TAB_SLUGS`: `tu-vung | bai-khoa | ngu-phap | luyen-tap | tro-choi`), không có slug `listen`/`nghe`. Vì vậy "tab Nghe" không tồn tại trên shell hiện tại của trang hạ (cũng như của 2 nhánh kia); câu hỏi đúng phải là "các chỗ nghe trong hạ hiển thị gì".
- Các chỗ nghe ở hạ, tất cả qua TTS (`speechSynthesis`, `engine.js:10` `speak()`, tốc độ 0.78; handler click ở `engine.js:454`):
  - **Tab Từ vựng:** mỗi thẻ từ có nút ▶ (`data-speak`) đọc từ + câu ví dụ; không có player audio gốc theo nhóm (xem §6.2).
  - **Tab Bài khóa:** không có player audio gốc (xem §6.2); mỗi dòng thoại có nút "Nghe câu này" (`data-read` → TTS) và nút "Tự Động Chạy" (TTS từng dòng, xem §6.3).
  - **Tab Luyện tập → Nghe chép:** 15 câu/bài, nút nghe tốc độ thường 0.82 / chậm 0.62 (`playDictation`, `engine.js:290`); **Điền từ:** nút nghe câu (`playFill`, `engine.js:361` → TTS).
  - **Trò chơi Luyện thanh điệu:** nghe từ bằng TTS rồi chọn pinyin có dấu.
- Không có đường code nào ở hạ tạo ra thẻ `<audio class="orig-audio">`: `origAudioHTML()` (`engine.js:14`) chỉ được gọi từ `sceneAudioHTML()` và `renderVocabOverview()`/`renderVocab()` — cả ba đều trả rỗng/null với `isXia()`.

#### 5. Đối chiếu số lượng từ file dữ liệu thật (chạy `node` trên file đã tải) — KHỚP AUDIT §3b/§3c
| Nhánh | Bài | Từ/bài | Tổng | Nhóm |
|---|---|---|---|---|
| HSK4 hạ (`lessons4xia`) | 11–20 | 41/43/43/41/37/41/41/39/40/41 | **407** | 1 nhóm/bài (toàn bộ từ), theo `vocabGroupsCur()` |
| HSK4 thượng (`lessons4` + `vocabGroups4`) | 1–10 | 40/37/42/40/44/39/39/40/40/43 | **404** | 4 nhóm/bài, kích thước đúng §3b (vd bài 1: 7+11+12+10; bài 5: 11+7+14+12; bài 10: 12+8+10+13), tổng chỉ số nhóm = 404, không trùng/khuyết |

- Số lượng phụ đếm được trong cùng lượt (khớp audit): `dictationsX`/`dictations4` 15 câu/bài; `analysisDetailsX` đủ bài 11–20; ngữ pháp hạ 4 điểm/bài, thượng 4/4/4/4/5/4/4/4/4/4; `sceneData4` 10 bài × 4 cảnh.
- **Quan sát phụ khi đếm (chưa sửa §3, cần đối chiếu lại):** trắc nghiệm bài khóa đếm được **8 câu/bài** ở cả 3 nhánh (4 cảnh × 2 câu/cảnh — `textQuizX[11]` và `textQuiz4[1]` đều 2/2/2/2; `textQuiz3` cũng 8/bài), khác con số "4 câu/bài" ghi ở §2/§3 (HSK3 36, thượng 40, hạ 40 câu). `mcqHTML()` (`engine.js:104`) hiển thị 2 câu của cảnh hiện tại và tổng "Cả bài: x/8". Điền từ: `fill.items` = 15 câu/bài cả hai quyển thượng/hạ (8 chọn từ + 7 hoàn thành câu); con số 25 (thượng) / 23 (hạ) ở §3 bằng **ngân hàng từ + số câu** (thượng: bank 10 + 15; hạ: bank 8 + 15) nên vẫn nhất quán với audit nếu tính theo cách đó.

#### Hệ quả thiết kế cho Bước 7 (cập nhật, thay cho đoạn "coi như thiếu thật" ở trên)
- Quyển hạ **thiếu thật, đã xác minh bằng code**: (a) nhóm từ — chỉ 1 nhóm/bài chứa toàn bộ từ, không có ranh giới nhóm theo bảng 生词; (b) audio gốc — không có track nào, không có file nào được tải; (c) scene-sync — không có mốc giờ nào, `sceneSyncStarts()` trả `null`.
- Có thật ở hạ để dùng cho 3D: 407 từ (đủ 10 bài), 40 cảnh hội thoại có lời thoại + pinyin + dịch Việt (5–7 dòng/cảnh), trắc nghiệm 8 câu/bài, điền từ 15 câu/bài, nghe chép 15 câu/bài, ngữ pháp 4 điểm/bài — tất cả các phần nghe đều phải tự lo giọng đọc (TTS hoặc thu mới), không được giả định có audio gốc.
- Nếu khu HSK 4 hạ trong 3D cần nhóm từ / audio / đồng bộ cảnh thì phải **tự xây dữ liệu mới** (nhóm theo bảng 生词, audio thu/phát hợp lệ, mốc giờ tự gán); không dùng lại được gì từ site gốc cho 3 việc đó.

#### Vẫn chưa xác minh được (ghi rõ — cần trình duyệt thật có mạng, không suy ra từ code)
- Giao diện tab/vùng nghe nhìn bằng mắt trên trình duyệt thật (màu sắc, bố cục, trạng thái khi không có audio) — code chỉ cho biết phần tử nào được render, không cho biết trông ra sao.
- Chất lượng giọng TTS `speechSynthesis` thực tế trên máy người dùng (giọng `zh-CN` có sẵn hay không, nghe có rõ không) và hành vi nút "Tự Động Chạy" khi chạy thật (chuyển câu có mượt không, có kẹt ở câu cuối không).
- Ảnh minh họa từng thẻ từ của hạ (`assets/vocab-photos/h4x-11-*.jpg`…) có tải được đủ không; flashcard/SRS/Top 3 ở hạ có chạy đúng không.
- Con số trắc nghiệm 8 câu/bài (quan sát phụ ở trên) so với 4 câu/bài trong audit §2/§3 — cần một lượt đối chiếu riêng trước khi sửa §3.
