# Bóng Đêm KTX v3.1 — Kế hoạch Kiểm thử Người chơi Thật (Human Playtest & UAT Plan)

> **Dự án:** HUSTVerse — Bách Khoa 3D (`haianhant/hust-hsk`)  
> **Ruleset mục tiêu:** `BOARD_GAME_RULESET_VERSION = 3` (Phiên bản phát hành ứng viên `v3.1`)  
> **Trạng thái hiện tại:** `Status: PENDING_HUMAN_UAT`  
> *(Tài liệu này là giao thức chuẩn bị cho đợt playtest với sinh viên/người chơi thật trên môi trường Staging trước khi bấm nút Go-Live `main`. Không có phiên chơi người thật nào được khẳng định là đã chạy trong báo cáo tự động này.)*

---

## 1. Mục tiêu Kiểm thử Trải nghiệm Thực tế (`UAT-01` .. `UAT-03`)

Các kiểm thử tự động (`boardgame-engine.test.cjs`, `boardgame-sim.cjs`, `boardgame-e2e.cjs`) đã xác minh logic máy chủ và luồng trình duyệt, nhưng **không thể thay thế đánh giá cảm giác chơi (playfeel)** của người thật trên 4 khía cạnh:
1. **`UAT-01` (Tự nhiên hóa suy luận & giao tiếp):** Người chơi mới hiểu được nhịp 3 pha lượt, đọc câu hỏi *Điều tra có điều kiện* đúng mà không nhầm thành "soi phe", và cân nhắc rủi ro giữa giữ ẩn danh với *Tự lật vai*.
2. **`UAT-02` (Chống nhìn trộm & công thái học Mobile 390×844):** Người ngồi cạnh nhau trong ký túc xá / quán cà phê bật nút úp thẻ (`🔒 Thẻ đang ÚP`), chuyển 3 tab mượt mà trên điện thoại mà không bị cuộn ngang hay bấm nhầm kết thúc lượt.
3. **`UAT-03` (Thời lượng, nhịp độ & công bằng Kẻ Lang Thang):** Ván đấu thực tế nằm trong khung 15–35 phút (phù hợp giờ giải lao KTX), người chơi 5–8p hiểu mục tiêu riêng của Hải / Trang / Bình và có tương tác lật kèo rõ rệt.

---

## 2. Ma trận Phiên Playtest Đề xuất (4 Phiên có Điều phối)

| Phiên | Cấu hình Bàn & Thiết bị | Thành phần Người chơi | Trọng tâm Quan sát |
|---|---|---|---|
| **Session A (4p Hybrid)** | 3 Desktop + 1 Mobile (`390×844`), không voice ngoài ở vòng 1–2 | Người chơi mới hoàn toàn (chưa đọc trước luật) | Độ rõ của kịch bản giới thiệu 5 phút, thao tác ngồi bàn 3D → HUD → 2D board, hiểu nút *Điều tra* & *Giáp tạm*. |
| **Session B (6p Campus Group)** | 6 Laptop/Desktop qua HTTPS Staging (`hust-hsk-rooms-staging`) | Nhóm 6 sinh viên quen game suy luận (Ma Sói / Avalon / Bang) | Suy luận 3 phe (`2 Gác Đèn / 2 Màn Sương / 2 Lang Thang`), tần suất dùng *Sự kiện*, nhịp thảo luận và chiến thuật lật vai. |
| **Session C (8p + 1 Spectator)** | 8 người chơi + 1 người quan sát qua `👁 Xem` | Nhóm đông người giờ cao điểm | Tốc độ đồng bộ WebSocket ở bàn 8p đủ ghế, độ thoáng thị giác trên Bàn Cờ 6 ô khi có 4–6 người đứng chung `Sảnh`/`Hành Lang`, xác minh màn hình khán giả 0 rò rỉ. |
| **Session D (Mobile Portrait & Mạng chập chờn)** | Tối thiểu 2 máy Android/iOS (`375–412px`), giả lập bật/tắt 4G/Wi-Fi giữa lượt | Tester kiểm thử di động | Thao tác 1 tay, chuyển tab `Bàn & Lượt` / `Vai bí mật` / `Nhật ký`, bật/tắt kết nối (cơ chế giữ ghế & `BG_STATE_SYNC` khôi phục sau 10s). |

---

## 3. Kịch bản Hướng dẫn Người chơi Mới (5 Phút · Facilitator Script)

Điều phối viên đọc đúng 4 ý sau trước khi chia ghế (tuyệt đối không tiết lộ mẹo chiến thuật của từng vai):

1. **Bước 1 — Bối cảnh & Bảo mật màn hình (60 giây):**
   - *"Chào mừng tới Phòng CLB Board Game Bách Khoa. Mỗi bạn nhận ngầm 1 trong 9 nhân vật thuộc **Đội Gác Đèn** (tìm và loại Hội Màn Sương), **Hội Màn Sương** (loại Đội Gác Đèn), hoặc **Kẻ Lang Thang** (mục tiêu riêng)."*
   - *"Mặc định thẻ vai và bài trên tay đang **ÚP**. Chỉ bấm `Lật xem bí mật` khi không ai nhìn màn hình; xem xong bấm `Úp thẻ` ngay."*
2. **Bước 2 — 3 Pha trong 1 Lượt `40 giây` (90 giây):**
   - *"Mỗi lượt gồm đúng 3 bước dưới một đồng hồ `40s`: ① Chọn **Đi sang ô kề** hoặc **Đứng yên** -> ② **Khảo sát khu vực** (lấy lợi thế ô đó) hoặc **Rút thẻ** -> ③ Có thể **Đeo Trang bị** / **Tự Lật Vai** (miễn phí), rồi chọn **1 Hành động Chính** (`Điều tra`, `Sự kiện`, `Dùng tiêu hao`, `Tấn công`, `Phòng thủ`, hoặc `Kỹ năng` nếu đã lật vai)."*
3. **Bước 3 — Hai nguyên tắc chống "đánh mù đầu trận" (90 giây):**
   - *"Thẻ **Điều tra có điều kiện** trả lời theo quy luật công khai (ví dụ: thuộc Màn Sương HOẶC có 13 HP), luôn khớp nhiều phe -> hãy ghép 2–3 manh mối thay vì đoán mò."*
   - *"Nếu đánh người chưa từng đánh ai, chưa lật vai và bạn chưa từng điều tra họ: sát thương bị giảm `1` và đối phương được `+1 Giáp tạm` phản ứng (**Bình Tĩnh Tự Vệ**). Đồng thời Gác Đèn tự lật vai mà đánh gục đồng đội sẽ dính **Kỷ Luật Nội Trú**."*
4. **Bước 4 — Lật vai, Giới Nghiêm & Phiên Trực Cuối Đêm (60 giây):**
   - *"Ván tối đa `9` vòng (4–5p) hoặc `10` vòng (6–8p). Ở 2 vòng cuối, đứng lẻ không hành động sẽ bị **Áp lực Giới Nghiêm** rút 1 HP. Hết vòng mà cả 2 phe chính còn sống sẽ phân thắng bại bằng **Phiên Trực Cuối Đêm** (số người loại được -> điểm kiểm soát chốt trực), KHÔNG bao giờ cộng HP."*

---

## 4. Phiếu Quan sát Trong Trận (Observer Rubric)

Điều phối viên ghi nhận định lượng cho mỗi phiên:

| Mã chỉ số | Định nghĩa | Cách ghi nhận | Ngưỡng cảnh báo |
|---|---|---|---|
| **OBS-01 · Nhầm pha / Hết giờ thụ động** | Số lượt người chơi hỏi *"Sao chưa đánh được?"* hoặc bị auto-timeout `40s` vì không tìm thấy nút | Đếm số lượt timeout ngoài ý muốn | `> 10%` tổng số lượt toàn ván |
| **OBS-02 · Đánh mù Vòng 1** | Số đòn `ATTACK` trước khi có bất kỳ thẻ Điều tra nào lên mục tiêu ở Vòng 1 | Đọc lại Nhật ký Công khai sau trận | `> 25%` người chơi tấn công mù ở Vòng 1 |
| **OBS-03 · Tai nạn nhìn trộm** | Người chơi quên úp thẻ hoặc để lộ thẻ vai/bài tay khi ngồi gần nhau | Quan sát thực tế & tự báo cáo | `>= 1` lần lộ không chủ ý do UI gây hiểu lầm |
| **OBS-04 · Độ trễ / Kẹt giao diện** | Bấm nút không phản hồi, phải F5 thủ công mới thấy lượt mới | Báo lỗi kèm thời điểm + thiết bị | `>= 1` trường hợp kẹt trạng thái vĩnh viễn |
| **OBS-05 · Suy luận sôi nổi** | Có ít nhất 2 cuộc tranh luận suy luận dựa trên kết quả `Điều tra` / *Sự kiện* mỗi ván | Đánh giá định tính theo vòng | Không ai nhắc tới manh mối Điều tra |
| **OBS-06 · Thời lượng thực tế** | Thời gian từ bấm `▶ Bắt đầu` tới màn hình `MatchPostcard` | Đồng hồ bấm giờ của điều phối viên | `< 8 phút` hoặc `> 40 phút` |

---

## 5. Khảo sát Sau Trận (Post-Match Survey · Thang điểm 1–5)

Mỗi người chơi điền nhanh trong 2 phút ngay sau khi xem `MatchPostcard`:

1. **Dễ làm quen:** *Tôi hiểu cách chơi cơ bản chỉ sau giải thích 5 phút và 1–2 lượt đầu.* (`1 = Rất khó hiểu` ... `5 = Rất trực quan`)
2. **Chiều sâu suy luận:** *Thẻ Điều tra có điều kiện và thao tác Lật vai tạo cảm giác nghi ngờ, đoán phe thú vị.* (`1–5`)
3. **Độ gọn & phản hồi UI:** *Bàn cờ 6 khu vực, nhật ký, và nút hành động dễ bấm trên thiết bị của tôi.* (`1–5`)
4. **Cân bằng & Cơ hội tham gia:** *Ván đấu kịch tính, không bị "chết oan quá sớm" ở đầu trận và mọi phe đều có cơ hội.* (`1–5`)
5. **Câu hỏi mở:**
   - *"Khoảnh khắc nào khiến bạn thấy hay nhất hoặc căng thẳng nhất?"*
   - *"Có thẻ bài, kỹ năng hoặc nút nào trên giao diện làm bạn phân vân/bối rối không?"*
   - *"Trên thang 1–5, bạn có muốn rủ bạn cùng phòng chơi thêm ván nữa không?"*

---

## 6. Tiêu chí Đạt Chuẩn Phát hành (`Go / No-Go Thresholds`)

Đợt UAT chỉ được chấm **PASS** để chuyển sang duyệt merge `main` khi đồng thời đạt:
- `0` lỗi rò rỉ bí mật (`P0`), `0` kẹt lượt không tự hồi phục bằng reconnect.
- Điểm trung bình 4 câu Likert >= `4.0 / 5.0` ở tất cả nhóm tham gia, không câu nào `< 3.5`.
- Thời lượng thực tế trung bình nằm trong khung mục tiêu `12–35 phút` (`4p` 12–22p, `6–8p` 18–35p).
- Tỷ lệ người chơi bị loại ngay trong Vòng 1 tại các ván thật `< 5%`.
- Tỷ lệ timeout thụ động do hiểu nhầm UI `< 8%` tổng số lượt.
- Hoàn tất checklist Session D (`390×844` không tràn ngang, reconnect khôi phục đúng thẻ vai & bài tay).
