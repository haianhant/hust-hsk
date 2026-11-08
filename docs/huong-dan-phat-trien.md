# Hướng dẫn phát triển tiếp — Bách khoa Hán ngữ 3D

> Dành cho bạn Bảo, dùng Gemini 4 Argon (`gemini-4-argon`, context 1M) làm tiếp.
> Nguyên tắc: nói mục tiêu + ràng buộc cứng + tiêu chí nghiệm thu, Gemini tự quyết
> chi tiết kỹ thuật. Tự test trên máy mình, báo lại bằng chữ (đã làm gì, file nào
> đổi, còn gì chưa chắc). **Không cần chụp ảnh hay quay video.**

## 0. Bối cảnh và cách làm việc

- Repo: `haianhant/hust-hsk`, nhánh `main`. Push lên `main` là Vercel tự deploy
  (project `hust-hsk`, live https://hust-hsk.vercel.app/).
- Stack: Next.js 14 static export + React Three Fiber + Tailwind.
  Build: `npm run build` (ra `out/`). Chạy local: `npm run dev`.
- **Đọc trước khi sửa:** `PROGRESS.md`, `NEXT_STEPS.md`, `lib/campus.ts`.
  `PROGRESS.md` ghi toàn bộ quyết định đã chốt và những thứ cấm làm vỡ.
- Bạn Bảo đã push 5 commit tối 07/11 (đồ họa PBR/ngày-đêm, quy hoạch khuôn viên
  theo bản đồ, nâng cấp nhân vật). **Trước khi làm 2 việc dưới đây, đối chiếu với
  code hiện tại: cái nào đã xong đúng thì giữ, cái nào còn thiếu/sai thì làm tiếp.
  Không hoàn tác công việc đã đúng.**
- Pull `main` mới nhất trước khi sửa; tránh sửa cùng file với Hải Anh cùng lúc.
  File nhị phân (GLB/mp3/font) chỉ push bằng git trên máy. Sau deploy giữ ~3
  deployment gần nhất trên Vercel.
- Nguồn nội dung học: web hoc-hsk của Hải Anh — CHỈ ĐỌC, không sửa, không deploy
  đè. Không sao chép toàn văn bài khóa, bản dịch toàn văn, hay audio của nhà xuất
  bản. Không chạm repo chùa (`chua-online`) hay web hoc-hsk.

## 1. Việc 1 — Tái cấu trúc tổng mặt bằng campus theo bản đồ thật

Bản đồ tham chiếu duy nhất (đã kiểm tra, đọc rõ):

https://cdn.thuviennhadat.vn//upload/hinh-anh-bai-viet/NHL/thang-08-2025/06-08-2025/map-dhbk.jpg

Bản đồ này là sơ đồ (không tỉ lệ 1:1): Bắc ở trên; đường Giải Phóng phía tây,
cổng Parabol ở phía tây, ngang giữa bản đồ; đường Đại Cồ Việt phía bắc, cổng Bắc;
C1 là khối dài nằm ngang phía bắc; C2/C9 phía tây; C3–C5/C10 ở giữa; C6–C8 phía
đông; nửa nam có Hồ Tiền, Thư viện Tạ Quang Bửu ở phía đông của hồ, dãy D3/D5/D7/D9
quanh thư viện, D2/D4/D6/D8 phía tây hồ, B1 (SoICT) phía đông-nam, cổng B8 phía
đông (đường Trần Đại Nghĩa). Nếu đọc không rõ thì hỏi Hải Anh gửi ảnh rõ hơn —
**không tự bịa vị trí rồi báo đã giống thực tế.**

Mốc thời gian: **TRƯỚC đợt di dời cổng Parabol tháng 11/2026** (cổng ở vị trí cũ
trên bản đồ, không trộn với vị trí sau di dời).

Làm theo thứ tự:

1. Checkpoint + liệt kê hiện trạng: công trình, cổng, hồ, sân, đường, cây lớn,
   điểm tương tác — vị trí, hướng, kích thước, nhiệm vụ gắn với từng chỗ.
2. Vẽ mặt bằng top-down bằng khối đơn giản trước (đường bao, cổng, trục đường,
   footprint nhà, Hồ Tiền, sân, nhãn, mũi tên mặt chính, hướng Bắc). Chỉ khi
   mặt bằng này đúng mới dời model chi tiết.
3. Dời công trình theo cụm; làm lại đường và sân theo vị trí mới; cập nhật
   nhiệm vụ, NPC, xe máy, teleport, minimap, menu "Đi nhanh".
4. Mọi tọa độ lấy từ **một cấu hình bố trí tập trung** (`lib/campus.ts`):
   mỗi địa điểm có ID ổn định, vị trí, hướng, kích thước, điểm neo. Khi dời
   hay xoay công trình, cửa/sảnh/bậc/collider/điểm tương tác/điểm đứng/điểm
   dịch chuyển phải đi theo. Không để tọa độ nhiệm vụ và teleport rải rác.

Ràng buộc cứng:

- Mặt thư viện có đồng hồ **KHÔNG quay ra hồ**. Hướng thư viện hiện tại đã đúng
  sau lần xoay 180° trước đó — giữ nguyên, không xoay thêm.
- C1 gắn sân trước + đường vào sảnh; sảnh không mở vào cỏ hay công trình khác.
- Thư viện giữ quan hệ đúng với Hồ Tiền và sân tiếp cận.
- Cổng Parabol nằm phía giáp đường Giải Phóng theo bản đồ, không đặt làm cổng
  trang trí trước C1.
- C9 + cầu thang lan can đỏ là một cụm, không tách cầu thang ra hồ.
- Bia đá, chữ check-in, ghế, bồn cây đặt có căn cứ, không dồn hết trước cửa C1.
- Không gom địa danh thành vòng tròn quanh hồ cho dễ thấy.
- Giữ tỉ lệ và khoảng cách tương đối; đã có xe máy + dịch chuyển nhanh nên
  không cần kéo các tòa lại gần nhau. Chỗ nào ước lượng thì ghi rõ, không nhận
  chính xác 1:1.

Nghiệm thu: đi bộ/lái xe từ cổng tới C1, thư viện, hồ thông suốt, không kẹt góc
nhà/bậc/cây; vào đúng sảnh mới của thư viện; dịch chuyển tới từng điểm đứng đúng
nền, quay đúng hướng; nhiệm vụ kích hoạt đúng chỗ; minimap và "Đi nhanh" khớp
scene thật.

## 2. Việc 2 — Làm lại hệ thống nhân vật sinh viên

Vấn đề: nhân vật hiện đi lạch bạch, chân như tách khỏi thân. Sửa tận gốc, không
chỉ thay áo hay giảm tốc animation.

- Cấu trúc: pivot tại khớp (háng, gối, cổ chân, vai, khuỷu); thân–chân liên kết
  qua hông; **không hở khớp hông/gối/cổ chân khi bước**; quần áo, tóc, balô đi
  theo đúng bộ phận. Tắt animation kiểm tra trước, bật từng chuyển động sau.
- Dáng đi: hai chân bước trước–sau, không quét ngang; khoảng cách hai bàn chân
  gần bề rộng hông; gối gập đúng hướng; mũi chân hướng di chuyển; hông dịch
  nhẹ, không lắc ngang; tay trái đi cùng nhịp chân phải; đầu ổn định; chân
  không xuyên/nổi/trượt; nhịp bước đồng bộ tốc độ; bị chặn thì dừng, không chạy
  tại chỗ. Một cơ chế di chuyển nhất quán, không cộng dồn hai cơ chế.
- Hai mẫu Nam/Nữ cùng rig, khác vừa phải ở hình thể/tóc/mặt; không làm nữ bằng
  cách gắn tóc dài lên model nam. Tỉ lệ cân đối, không kéo chân/bóp eo quá mức.
- Tham chiếu dáng người: https://chuahaianonline.vercel.app/ (chỉ tham khảo cách
  thể hiện người; **không** mang trang phục/phong cách chùa sang; không có mã
  nguồn thì tự dựng).
- Áo khoác gió HUST làm mặc định (cả nam/nữ), theo đúng ảnh tham chiếu:
  https://dantri.com.vn/giao-duc/dai-hoc-bach-khoa-ha-noi-trinh-lang-hon-20-mau-dong-phuc-sinh-vien-moi-20221222110735214.htm
  (bài có ảnh áo khoác gió và bomber; bomber phối đỏ–ghi, xanh–trắng, đỏ–xanh).
  Theo đúng phân mảng màu, cổ, tay, nẹp, túi, vị trí chữ HUST; không trộn chi
  tiết các mẫu; không dùng áo đỏ trơn dán HUST. Xong áo gió mới thêm bomber.
- Màn chọn nhân vật trước khi vào trường: ô nhập tên, chọn Nam/Nữ, kiểu tóc,
  bộ đồng phục, bật/tắt balô; preview 3D xoay được + nút Đứng/Đi bộ/Chạy. Trong
  game có mục "Nhân vật & trang phục" để đổi lại. Đổi đồ giữ tên, vị trí, tiến
  độ; lưu trên thiết bị, tải lại trang vẫn khôi phục.
- Tên trên đầu: đúng tên đã nhập (tiếng Việt có dấu), trống thì "Sinh viên";
  chữ sáng, nền tối, luôn hướng camera, không đọc ngược, neo trên đầu, ổn định
  không rung theo bước, vẫn theo người khi ngồi xe. Đồng bộ tên + ngoại hình
  qua multiplayer hiện có.
- Tương thích xe máy + dịch chuyển: ngồi đúng yên, tay đúng tay lái; xuống xe
  về tư thế đứng; teleport không mất tóc/giày/tên/trang phục; không sinh nhân
  vật cũ ở điểm xuất phát.

Nghiệm thu (cả Nam và Nữ): đứng/đi/chạy/dừng, quay đầu, đi vào vật cản, lên/
xuống xe, dịch chuyển, đổi áo/tóc/balô, tải lại trang. **Chỉ xong khi nhân vật
đi liền mạch, chân không rời thân, mặc đúng mẫu áo HUST, tên bám ổn định.**

## 3. Những thứ không được làm vỡ

- Tiến độ học, SRS, sổ lỗi, huy hiệu, streak (localStorage `bkhn-progress-v1`).
- Xe máy (Gọi xe, E lên/xuống, W/S/A/D), dịch chuyển nhanh, minimap.
- Multiplayer: tên + MSSV (8 số), bảng tên "Tên (MSSV)", phòng tối đa 15 người,
  Worker Cloudflare `hust-hsk-rooms` đã live.
- Minh: hoodie NAVY + mũ đỏ + quần kaki + balô xám (không đổi về đỏ hay xanh lá).
  Cô giáo: áo trắng + kính tròn + búi tóc.
- Không người chơi giả, điểm giả, bảng giả. Không giới thiệu giọng TTS tổng hợp
  là giọng người thật.
