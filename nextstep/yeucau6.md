1. Quả bóng hơi to so với người, chưa đồng bộ giữa các người chơi.
- Bóng hiện tại đường kính đo được khoảng 0.44 m, to gấp 2 lần bóng thật (bóng size 5 đường kính 0.22 m), người chơi cao 1.75 m. Thu nhỏ bóng cho đúng tỉ lệ, bán kính về khoảng 0.11 m.
- Trạng thái bóng chưa đồng bộ: người này đá bóng thì người khác không thấy bóng di chuyển. Nguyên nhân test được: tin nhắn `move` chỉ gửi vị trí và hướng của người, không gửi vị trí bóng, nên bóng chỉ tồn tại riêng trên từng máy. Cần đưa vị trí và vận tốc bóng vào tin nhắn đồng bộ, hoặc để server giữ trạng thái chung của bóng.

2. Thử cho thêm đăng nhập bằng ehust/ctt.

3. Camera trên điện thoại hơi mờ, cần nét hơn. Cả điện thoại và máy tính đều phải chờ hơi lâu khi vào, có vẻ đang load toàn bộ map (phải chờ tầm 5 giây mới xuất hiện cổng Trần Đại Nghĩa), cần tối ưu để vào nhanh hơn.
- Mờ: ở màn hình điện thoại 390px, canvas 3D render đúng bằng kích thước CSS rồi trình duyệt phóng to 2 lần nên mờ. Cần set pixel ratio cho renderer theo `min(devicePixelRatio, 2)`.
- Chờ lâu: không phải do mạng (file JS chỉ 0.58 MB), mà do build toàn bộ map với biên dịch shader ngay từ đầu. Cần load lười theo khu vực hoặc lazy-load phần chưa thấy, và hiện tiến trình loading.

4. Trong giảng đường HSK ở tòa C7: bảng tên của chính người chơi render rất to, che một phần hàng nút trên cùng. Bảng đen trong lớp ghi từ vựng toán (数学, 笔记...), lạ cho một lớp HSK, cần kiểm tra xem bảng có phải hiển thị từ HSK không.

5. Chip "Đang kết nối..." trên HUD cập nhật hơi chậm: sau khi vào 10 giây vẫn hiện dòng này dù đã online.

6. Khi ấn đi đến tòa C7 thì phải đi đến cái chỗ cửa ở ngay bên phải đường khi đi vào từ cổng Trần Đại Nghĩa, đó là nơi chính học sinh sẽ vào tòa, thay cho chỗ hiện tại đang đi đến.

7. Một số vạch kẻ đường đang hơi bị quá nổi khối, dày, gồ ghề, xem lại, hoặc các làn đường chỗ giao nhau đang hơi chồng chéo lên nhau.

8. Cỏ mọc cả trên đường bê tông.

9. Thêm intro cho người mới vào, từ lần sau vào không hiện intro (có cần đăng nhập trước không?) Màn hình UI lúc mới vào bị quá nhiều thông tin làm người dùng choáng, có thể tối ưu.

10. Bạn Minh đứng ở cổng Parabol đang không để làm gì, có nên cho bạn ấy đứng trước cổng Trần Đại Nghĩa 5-10 m giới thiệu intro luôn không, bạn ấy nên mặc áo phông đỏ HUST, khi mới vào cũng sẽ cho người dùng đứng cạnh bạn ấy trên cổng tầm 5-10 m, hiện tại đang sát cổng quá.
