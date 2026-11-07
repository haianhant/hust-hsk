# Brief sửa nhà C1 + bia đá khắc tên trường (user gửi 06/11/2026)

> Làm cùng đợt sửa lần 2 (docs/rework-round2-brief.md), sau khi bản UX đã deploy — cùng sửa file C1Building.tsx / Landmarks.tsx nên gộp một đợt để khỏi đè nhau. Ưu tiên: bia đá → hoa gió → chiều sâu hành lang → mái → biểu trưng và sảnh. Giữ hoạt động học tập đang có.

Ảnh tham chiếu chính — thấy rõ bia đá và mặt đứng C1 phía sau:
https://cdn2.tuoitre.vn/471584752817336320/2026/8/8/base64-1786201824069845397181.jpeg

Ảnh bổ sung — nửa bên trái là mặt chính C1:
https://library.hust.edu.vn/sites/default/files/5.%20Qu%E1%BA%A3ng%20tr%C6%B0%E1%BB%9Dng%20C1%20v%C3%A0%20C%C3%A2y%20c%E1%BA%A7u%20%C4%91%E1%BB%8F%20C9_0.jpg

Bản hiện tại mới có một số yếu tố nhận diện nhưng hình khối và chi tiết vẫn sai.

## 1. Dựng lại bia đá, không chỉ đổi texture

Bản hiện tại giống một tấm biển mỏng bị cắt méo. Thay bằng khối đá tự nhiên có thể tích thực.

Hình dáng:
- Dáng bè ngang, gần hình chữ nhật nhưng đường viền tự nhiên, không đều.
- Trong ảnh tham chiếu, chiều ngang nhìn thấy khoảng hơn hai lần chiều cao. Dùng làm tỉ lệ khởi điểm thị giác, không coi là số đo thực địa.
- Mép trên nhấp nhô nhẹ, có những gờ đá thấp; không tạo các đỉnh nhọn lớn.
- Hai bên có vai đá bo không đều, thuôn xuống chân.
- Chân đá nặng, có các mảng lồi lõm và cảm giác nằm chắc trên nền.
- Mặt trước tương đối phẳng để khắc chữ, nhưng vẫn có hạt và vết đá.
- Phải có bề dày nhìn thấy ở góc xiên. Không dùng một mặt phẳng extrude rất mỏng.
- Không tạo hình tờ giấy nhàu, tấm kim loại gãy hoặc bia mộ đứng cao.

Vật liệu:
- Xám trắng tự nhiên, hơi loang sắc.
- Bề mặt nhám, hạt nhỏ; phần mép và chân thô hơn vùng chữ.
- Dùng biến dạng hình học cho đường viền và các mảng lớn; texture/normal chỉ bổ sung độ sần.
- Không dùng những tam giác lớn phẳng màu làm toàn khối đá trông như giấy gấp.
- Không làm bóng như đá marble đánh gương.

Chữ trên đá — hai dòng màu đen, căn giữa theo vùng mặt đá:

ĐẠI HỌC BÁCH KHOA HÀ NỘI
HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY

- Dòng tiếng Việt lớn hơn rõ rệt.
- Dòng tiếng Anh nhỏ hơn, nằm bên dưới.
- Font không chân, nét rõ, không kéo giãn chữ để lấp chiều ngang.
- Chừa khoảng đá thoáng ở trên, dưới và hai bên.
- Chữ áp sát hoặc khắc nông vào bề mặt, không nổi dày như bảng quảng cáo.
- Kiểm tra dấu tiếng Việt, đặc biệt "ĐẠI", "BÁCH", "HÀ NỘI".

Phần nền:
- Đá nằm trong một ô cảnh quan thấp có viền, cỏ và nền tiếp xúc tự nhiên. Không đặt trên bệ tượng cao. Có bóng tiếp xúc dưới chân để không bị cảm giác lơ lửng.
- Ảnh cận cảnh không đủ để suy ra tọa độ chính xác của bia trong toàn sân. Không tự kết luận phải đặt ở giữa hay bên trái chỉ từ ảnh này; lần sửa này ưu tiên đúng hình dáng, vật liệu và tỉ lệ.

## 2. Sửa mảng hoa gió C1

Bản hiện tại đang dùng các hình thoi đen lớn, thưa và lặp lại như họa tiết quân bài.

- Thay bằng mạng hoa gió có nhiều ô nhỏ, mật độ cao hơn, bám ảnh tham chiếu.
- Giữ các khung chia mảng lớn, nhưng bên trong mỗi mảng phải có nhiều mô-đun nhỏ.
- Không phóng to vài lỗ để tiết kiệm mô hình.
- Phần trắng là cấu kiện có bề dày; phần tối là khoảng rỗng và bóng của lớp phía sau.
- Tạo lớp hoa gió phía trước và không gian lùi phía sau, tránh các hình đen dán lên tường trắng.
- Khi nhìn xa, phải đọc thành một mảng lưới trắng tinh, không thành chín ô chứa chấm đen.
- Có thể tối ưu bằng mô-đun lặp hoặc vật liệu cắt rỗng phù hợp; chất lượng nhìn từ vị trí người chơi vẫn phải giữ được.

## 3. Sửa hành lang, cửa và mái

Hành lang:
- Trong bản hiện tại, những ô kính lớn và lan can đều nhau đang khiến C1 giống một khối chung cư.
- Tăng chiều sâu giữa hàng cột phía ngoài và cửa phía trong.
- Mép sàn, cột, lan can và cửa phải là các lớp khác nhau.
- Mỗi tầng có vùng bóng dưới sàn phía trên.
- Đối chiếu kiểu lan can với ảnh, không dùng một mẫu lan can kim loại chung cho toàn bộ công trình nếu khác ảnh.
- Có thể thêm vài chậu cây ở hành lang theo tham chiếu, nhưng không dùng chúng che lỗi kiến trúc.

Mái:
- Các nhịp mái hiện đang trông như những miếng tối đặt trên nóc.
- Dựng lại thành các vòm nông có mặt trên, mặt dưới và cạnh mái sáng.
- Giữ nhịp lặp đặc trưng; không biến thành những mái vòm cao hoặc các nửa ống rời.
- Kiểm tra góc chính diện lẫn góc xiên, tránh để bề dày mái mất hẳn.

## 4. Sửa biểu trưng và sảnh giữa

- Biểu trưng trên dải tường đặc đang quá nhỏ và giống một poster tạm.
- Dựng lại theo hình ảnh tham chiếu: bố cục biểu trưng dọc, phần chữ bên dưới, đúng tương quan với mảng hoa gió.
- Không thay biểu trưng bằng một lá cờ và vài dòng chữ tùy ý.
- Chữ C1 là nhãn riêng ở vị trí thấp trên dải tường, không nhập vào poster.
- Quốc kỳ trên mái phải có sao vàng; bản hiện tại nhìn như cờ đỏ trơn.
- Sảnh có mái đưa ra phía trước, cột đỡ, khoảng lùi cửa và bậc tiếp cận rõ.
- Kiểm tra cụm "I ♥ BK" không chắn lối vào. Chưa xác minh được vị trí thì không dùng cụm chữ này để tự tổ chức lại sân.

## 5. Kiểm tra trước khi báo hoàn thành

Thực hiện riêng từng hạng mục, ưu tiên **bia đá → hoa gió → chiều sâu hành lang → mái → biểu trưng và sảnh**.

Bàn giao:
1. Bia đá chính diện và góc xiên để thấy bề dày.
2. Ảnh cận hoa gió để thấy mô-đun nhỏ và chiều sâu.
3. C1 chính diện, có đủ mái và chân công trình.
4. C1 ở góc nhìn người chơi, so sánh trước–sau.

Không lấy việc "đã có đá, có chữ, có chín nhịp mái" làm tiêu chí hoàn thành. Phải đối chiếu hình dáng và tỉ lệ với ảnh. Những phần chưa xác minh được phải ghi rõ, không tự thêm chi tiết rồi gọi là giống thực tế.

## Ghi chú từ ảnh tham chiếu (Kiến tự xem ảnh gốc 06/11, chỉ xem — không copy ảnh vào project)

**Bia đá (ảnh Tuổi Trẻ):** tảng đá tự nhiên khổng lồ, rộng hơn cao khoảng 2 lần, xám trắng, mặt sần lỗ chỗ, mép trên lượn sóng nhẹ không đều, hai vai bo tròn thuôn xuống chân nặng nằm chắc trên đất; đá đặt trong ô cỏ chữ nhật thấp có viền bê tông/đá, cỏ và lối lát xung quanh, ghế gỗ bên trái. Chữ đen không chân, căn giữa, khoảng đá thoáng rộng bốn phía: dòng Việt lớn ở nửa trên, dòng Anh nhỏ hơn bên dưới.

**Mặt đứng C1 phía sau bia (cùng ảnh):** mảng hoa gió là lưới ô nhỏ DÀY ĐẶC dạng khe/khối chữ nhật đứng lặp đều trên nền trắng — KHÔNG phải hình thoi (bản hiện tại dùng thoi là sai kiểu lỗ). Dải tường biểu trưng: dải đỏ DỌC, sao vàng ở trên, chữ "BÁCH KHOA" màu vàng bên dưới — đó là bố cục biểu trưng cần dựng (không phải poster ngang hay lá cờ). Bên phải là hành lang mở: cột mảnh + lan can + cửa sổ, nhiều tầng thẳng trục; cây xanh hai bên.
