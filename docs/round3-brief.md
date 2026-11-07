# Brief đợt 3 — sửa nhân vật ngược + xoay thư viện 180° + bỏ dây cây + xe máy + đi nhanh (user gửi 06/11/2026)

> Thực hiện lần lượt, kiểm tra trực tiếp trong game trước khi báo hoàn thành. Thứ tự: nhân vật → thư viện → cây → xe máy → dịch chuyển nhanh → kiểm tra/bàn giao.

## 1. Sửa nhân vật bị ngược đầu, tay và chân

Nhân vật hiện có các bộ phận không thống nhất hướng. Kiểm tra cả model, bộ xương, animation và hướng điều khiển; không chỉ xoay đầu cho vừa một góc chụp.

**Quy ước bắt buộc:**

- Mặt, ngực, đầu gối và mũi giày cùng hướng về phía trước.
- Balô nằm sau lưng.
- Hai tay gắn đúng bên trái/phải theo cơ thể nhân vật.
- Khi đi tới, nhân vật tiến theo hướng mặt; không đi lùi trong khi chạy animation tiến.
- Khi quay người, toàn bộ đầu, thân, tay, chân và balô quay cùng nhau.

**Cách sửa:**

1. Tạm tắt animation, đặt nhân vật ở tư thế đứng trung tính trên nền kiểm tra.
2. Hiển thị mũi tên đánh dấu phía trước của nhân vật và trục của đối tượng gốc.
3. Kiểm tra hướng model so với hướng mà bộ điều khiển sử dụng.
4. Nếu model nhập vào có hướng khác, sửa tại một nhóm chứa model hoặc chuẩn hóa lúc nhập; không bù bằng các góc xoay rải rác trên đầu, tay và chân.
5. Kiểm tra tư thế gốc của bộ xương và cách gán animation. Không dùng scale âm để lật người nếu làm đảo trái/phải hoặc biến dạng bộ xương.
6. Sửa riêng bộ phận nào bị dựng ngược trong tọa độ cục bộ, sau đó kiểm tra lại toàn thân.
7. Bật lại từng animation: đứng, đi, chạy, quay, ngồi xe.

**Hình thể và chuyển động:**

- Khuỷu tay và đầu gối gập đúng chiều.
- Mũi giày hướng trước, gót ở sau; giày không biến thành hai tấm phẳng dưới chân.
- Bàn chân tiếp đất, không trượt hoặc đi xuyên nền.
- Tay đánh đối xứng chéo với chân khi đi.
- Đầu không tự quay 180° khi chuyển animation hoặc đổi hướng.
- Quai balô ôm vai, không có đoạn thừa treo lơ lửng bên cạnh người.
- Giữ áo polo HUST và tỉ lệ người đã chỉnh, không quay về nhân vật hình ống.

**Bắt buộc kiểm tra từ trước, sau, trái, phải và quay đủ một vòng.** Không nghiệm thu nhân vật chỉ từ góc camera sau lưng.

## 2. Xoay thư viện đúng 180° so với hiện trạng

Chủ dự án xác nhận: **thư viện hiện đang quay ngược trước–sau. Hãy xoay toàn bộ thư viện 180° quanh trục đứng so với hướng hiện tại.**

- Nếu scene dùng Y làm trục đứng thì xoay quanh Y; nếu dùng hệ trục khác thì dùng đúng trục đứng.
- Xoay quanh tâm/pivot của thư viện, giữ vị trí công trình; không xoay quanh gốc toàn scene khiến nhà chạy sang nơi khác.
- Thực hiện một lần, không cộng thêm 180° mỗi lần tải trang hoặc dựng lại scene.
- Xoay đồng bộ thân nhà, mặt đồng hồ, lam, sảnh, cửa, bậc và biển tên.
- Cập nhật collider, điểm tương tác, điểm vào/ra và vị trí dịch chuyển của thư viện.
- Sắp lại đoạn đường tiếp cận sảnh nếu cần để người chơi đi vào được.
- Không xoay hồ hoặc toàn campus.
- Không chỉ chuyển đồng hồ sang mặt khác.
- Không tạo hai mặt đều có đồng hồ.

Sau sửa, chụp từ trên xuống và từ vị trí bên hồ như ảnh cũ để xác nhận mặt có đồng hồ đã quay sang phía đối diện.

## 3. Bỏ các “sợi dây” dưới tán cây

Các thanh xanh dài đang thả từ tán xuống trông như dây điện hoặc chân con sứa. **Xóa chúng khỏi mẫu cây này**, áp dụng cho mọi cây dùng chung mẫu.

Thay đổi cụ thể:

- Giữ thân và tạo vài nhánh nối thực sự với tán.
- Chia tán thành những cụm lá không đều, có khoảng sáng tối.
- Giảm hình dạng đĩa tròn phẳng đang xếp chồng như mũ nấm.
- Không thay dây xanh bằng dây màu khác.
- Không thêm rễ khí sinh hoặc cành rủ nếu mẫu cây không cần chúng.
- Cây trang trí không được có collider lớn bao kín cả khoảng trống dưới tán, làm người chơi mắc kẹt.

Ưu tiên một mẫu cây đơn giản nhưng tự nhiên, sau đó tạo biến thể về kích thước và góc xoay.

## 4. Thêm xe máy có thể lên ngồi và điều khiển

Campus rộng nên cần xe máy để đi nhanh. Phải có **xe thật, tư thế ngồi thật và cơ chế lên/xuống xe**, không chỉ tăng tốc nhân vật đi bộ rồi đặt xe bên cạnh.

### Xe và vị trí ban đầu

- Tạo một mẫu xe máy hoặc xe tay ga phổ thông, kích thước tương xứng nhân vật.
- Có yên, hai bánh, tay lái, thân xe, đèn và gương; phong cách thống nhất với campus.
- Đặt xe ở điểm đỗ gần nơi xuất hiện ban đầu, ngoài lối đi chính.
- Có nút “Gọi xe” đưa xe tới điểm trống hợp lệ gần người chơi khi đang ở ngoài trời.
- Chỉ tồn tại một xe cá nhân; gọi lại không sinh thêm xe liên tục.

### Lên và xuống xe

- Đến gần xe, hiện “E — Lên xe”; điện thoại có nút chạm.
- Nhân vật ngồi đúng trên yên, mặt cùng hướng đầu xe.
- Hai tay đặt lên tay lái, đầu gối gập tự nhiên, chân đặt đúng vị trí để chân.
- Balô đi theo người và không xuyên yên.
- Chuyển sang trạng thái lái xe; dừng animation đi bộ và tránh để collider người va chạm ngược với chính xe.
- Chỉ xuống xe khi xe đã dừng hoặc gần dừng.
- Khi xuống, tìm chỗ trống bên cạnh; nếu bị chắn thì thử bên còn lại. Không đặt người vào tường, hồ hoặc dưới nền.

### Điều khiển và cảm giác tốc độ

- PC: W tiến, S phanh; chỉ lùi chậm khi đã gần dừng; A/D lái.
- Có phanh rõ ràng và hướng dẫn phím ngắn.
- Điện thoại: nút ga/phanh và điều khiển hướng đủ lớn, không xung đột với camera.
- Tốc độ tối đa ban đầu khoảng 3–4 lần đi bộ, có tăng tốc và giảm tốc mượt. Điều chỉnh theo quy mô thực tế của scene.
- Xe nghiêng nhẹ khi rẽ; bánh quay theo vận tốc, bánh trước đổi hướng theo lái.
- Không quay xe tức thời tại chỗ khi đang chạy nhanh.
- Camera bám phía sau và hơi cao, nhìn được đường phía trước; không rung mạnh.
- Khi phóng nhanh, vẫn tránh xuyên tường hoặc nhảy qua vật cản do bước cập nhật quá lớn.

### Phạm vi di chuyển

- Xe đi trên đường và khu sân cho phép.
- Không đi xuyên nhà, lao xuống hồ hoặc chạy lên cầu thang.
- Cửa phòng học và các vùng nội thất yêu cầu xuống xe.
- Va chạm với cây, bờ hồ, công trình và NPC phải được xử lý; có thể dừng/trượt nhẹ, không cần mô phỏng tai nạn.
- Có nút “Đưa xe về đường” nếu mắc kẹt, dùng vị trí hợp lệ gần nhất.

## 5. Thêm dịch chuyển nhanh tới địa điểm

Thêm nút **“Đi nhanh”** trong HUD và trên bản đồ.

Danh sách lấy từ các địa điểm thực sự có trong game, ví dụ:

- Nhà C1.
- Thư viện Tạ Quang Bửu.
- Hồ Tiền.
- Cổng Parabol.
- Khu C9.
- Điểm bắt đầu.

Cho phép chọn các điểm chính ngay từ đầu, không bắt người học đi bộ khám phá hết mới được dùng.

**Cơ chế:**

- Chọn địa điểm → chuyển cảnh ngắn → xuất hiện tại một điểm đứng an toàn ngoài công trình.
- Nhân vật quay về phía lối vào hoặc hướng nhìn phù hợp.
- Tải xong nền và collider khu đích trước khi đặt người xuống.
- Đặt lại vận tốc và camera để không giữ đà chạy hoặc góc nhìn từ khu cũ.
- Không đặt người giữa hồ, trong tường, trên mái hoặc giữa vùng tương tác bị khóa.
- Nếu đang ngồi xe: tự dừng, chuyển người sang trạng thái đi bộ tại đích và đưa xe về điểm đỗ hợp lệ gần đó.
- Dịch chuyển chỉ thay vị trí, không tự hoàn thành nhiệm vụ, cộng điểm hay học hộ.
- Có thể thêm “Đi tới đây” trong bảng nhiệm vụ để tới điểm gần mục tiêu.

Chặn thao tác dịch chuyển chồng nhau khi người dùng bấm liên tiếp.

## 6. Kiểm tra trạng thái và bàn giao

Thực hiện theo thứ tự: **nhân vật → thư viện → cây → xe máy → dịch chuyển nhanh**.

Phải chơi thử các chuỗi:

1. Đi bộ → quay người → chạy → dừng.
2. Lên xe → tăng tốc → rẽ → phanh → xuống xe.
3. Gọi xe nhiều lần, bảo đảm không nhân bản.
4. Đang lái → dịch chuyển tới C1 → đi bộ vào điểm học.
5. Dịch chuyển tới thư viện sau khi xoay nhà, bảo đảm điểm đến nằm đúng phía sảnh mới.
6. Đóng bảng học → tiếp tục điều khiển, không kẹt phím hoặc tự tăng ga.
7. Va chạm ở góc nhà, thân cây và mép hồ.
8. Thử điều khiển trên giao diện điện thoại.

Bàn giao ảnh nhân vật đủ bốn hướng, ảnh thư viện trước–sau khi xoay, ảnh cây đã bỏ dây và đoạn quay ngắn hoặc chuỗi kiểm thử rõ ràng chứng minh xe hoạt động.

**Không báo hoàn thành xe máy chỉ bằng ảnh nhân vật ngồi trên xe; phải kiểm tra được cả lái, phanh, xuống xe và dịch chuyển.**
