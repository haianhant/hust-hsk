# Brief sửa kiến trúc ngoại thất campus 3D — user gửi tối 05/11/2026

> Làm sau khi Bước 4–5 (engine học tập + tuyến "Buổi học đầu tiên") xong, để giữ các chức năng học tập đang hoạt động và tránh hai luồng cùng sửa một file (Landmarks.tsx / campus.ts / Player.tsx / StudentAvatar.tsx). Nếu cần thay model, phải cập nhật lại collider, điểm tương tác và đường đi tương ứng.

Người trong web chùa (~/workspace/chua-online/components/three/Player.tsx) là mẫu cho nhân vật ở đây: thân áo xếp lớp bằng các hình trụ thuôn dần + cầu vai tròn, đường viền torus, khuy/nút là các cầu nhỏ, tay áo dài + cổ tay + bàn tay là cầu dẹt, chân có đùi/cẳng/viền gấu, giày là hộp + mũi cầu + đế, chất liệu mờ (roughness ~0,84–0,9), da #ecc39e roughness 0,72. Nhân vật Bách khoa hiện tại vẫn như robot vì thân/tay/chân đều là hộp thẳng, mặt phẳng, thiếu lớp lang và chi tiết nhỏ đúng tỉ lệ thật.

---

Hãy sửa lại kiến trúc ngoại thất campus 3D hiện tại để giống Đại học Bách khoa Hà Nội hơn. Phạm vi lần này là hình khối công trình, mặt đứng, vật liệu, sân vườn và chất lượng mô hình.

Giữ các chức năng học tập đang hoạt động. Nếu cần thay model, phải cập nhật lại collider, điểm tương tác và đường đi tương ứng.

**Mục tiêu: nhìn công trình khi tắt biển tên vẫn nhận ra các nét đặc trưng của Bách khoa Hà Nội. Không chỉ tạo nhà hộp rồi gắn chữ HUST.**

Các mô tả dưới đây được rút ra từ ảnh thật. Tỉ lệ dựng đề xuất là hướng dẫn tạo mô hình, không phải số đo khảo sát công trình.

### 1. Chốt phong cách kiến trúc

Campus phải thể hiện kiến trúc trường đại học Việt Nam với những khối nhà sáng màu, hành lang có chiều sâu, nhịp cột và cửa lặp đều, cây trưởng thành và sân lát.

- Tường trắng ngà hoặc xám trắng, bề mặt sơn/bê tông mờ.
- Cửa và vùng hành lang tối hơn tường.
- Bóng đổ giúp đọc được mái đua, cột, lam và khoảng lùi.
- Màu đỏ tập trung ở chi tiết phù hợp, đặc biệt lan can C9.
- Màu xanh dương là điểm nhấn trên thư viện.
- Không thêm mái ngói cong, cổng tam quan, đèn lồng hoặc kiến trúc cung điện.
- Không dùng vật liệu bóng như nhựa cho toàn bộ tường.
- Không bo tròn tất cả góc nhà thành mô hình đồ chơi.

Ưu tiên sửa hình dáng tổng thể, sau đó mặt đứng và chiều sâu, cuối cùng mới thêm cây, ghế và trang trí.

### 2. Nhà C1 — công trình phải sửa kỹ nhất

Ảnh tham chiếu trực tiếp, nửa bên trái là C1:

https://library.hust.edu.vn/sites/default/files/5.%20Qu%E1%BA%A3ng%20tr%C6%B0%E1%BB%9Dng%20C1%20v%C3%A0%20C%C3%A2y%20c%E1%BA%A7u%20%C4%91%E1%BB%8F%20C9_0.jpg

**Những đặc điểm cần tái hiện từ ảnh:**

- Tổng thể trải ngang.
- Hai bên có các dải hành lang, cột và cửa lặp lại.
- Chính giữa nổi bật một mảng hoa gió trắng lớn, dạng lưới họa tiết xuyên sáng.
- Bên phải mảng hoa gió là một dải tường đặc đặt biểu trưng đỏ/vàng và chữ C1 thấp hơn.
- Dưới mảng hoa gió là mái sảnh phẳng đưa ra phía trước, có cột đỡ và cửa lùi vào.
- Đường mái có các nhịp vòm nông nối tiếp; nguồn HUST mô tả chín nhịp sóng.
- Trước nhà là bậc lên sảnh, sân lát và trục tiếp cận thoáng.

**Cách dựng bắt buộc:**

Tách C1 thành các bộ phận độc lập: thân nhà, hai dải mặt đứng bên, khối hoa gió giữa, dải tường biểu trưng, mái sảnh, cột sảnh, bậc và hệ mái trên cùng.

Không biến khối giữa thành tháp nhô cao. Giữ quan hệ chiều ngang–chiều cao theo ảnh, tránh bóp nhà thành một khối vuông ngắn.

**Mảng hoa gió:**

- Phải có cảm giác rỗng và nhìn thấy lớp tối phía sau.
- Chia thành những ô lớn bằng khung trắng, bên trong là họa tiết nhỏ lặp.
- Tạo ít nhất hai lớp: lớp hoa gió phía trước và bề mặt/hành lang lùi phía sau.
- Không thay bằng kính xanh, một bảng trắng đặc hoặc texture đen trắng dán sát tường.
- Có thể tối ưu bằng mô-đun lặp hoặc vật liệu có phần trong suốt, nhưng nhìn gần không được giống giấy dán.

**Hai bên mặt đứng:**

- Cột đứng chia nhịp rõ.
- Mép sàn và lan can tạo dải ngang.
- Cửa nằm sâu hơn lớp cột/lan can.
- Tầng trên và dưới phải thẳng trục; không đặt cửa ngẫu nhiên.
- Không dùng hàng ô vuông đen dán lên một khối hộp để thay toàn bộ hành lang.

**Mái chín nhịp:**

- Dựng thành một chuỗi vòm nông có nhịp điệu.
- Các nhịp không được cao như mái nhà thờ hoặc thành chín nửa quả cầu.
- Mái có bề dày vừa phải và có mặt dưới.
- Kiểm tra đường viền mái ở góc chính diện và góc xiên; không để phần mái bị che hoàn toàn bởi một lan can cao tự thêm.

**Sân C1:**

Tạo một khoảng sân đủ rộng để đứng nhìn thấy mặt tiền. Dùng đường lát dẫn vào sảnh, bồn cỏ và cây bố trí hai bên. Không đặt một cây lớn hoặc bảng nhiệm vụ ngay giữa che mảng hoa gió.

### 3. Cổng Parabol — phải dựng đúng một kết cấu cong có bề dày

Ảnh nhiều góc:

https://library.hust.edu.vn/sites/default/files/1%20C%E1%BB%95ng%20parapol.jpg

**Đặc điểm quan sát được:**

Cổng là kết cấu trắng ngà vươn cao, hai chân nối lên một đỉnh cong liên tục. Góc xiên cho thấy cổng có chiều sâu đáng kể; mặt phía trong có các gờ chia khoang và chi tiết tròn lặp lại.

**Yêu cầu dựng:**

- Dựng hai biên cong trong–ngoài thành một dải kết cấu liên tục rồi tạo chiều sâu.
- Hai chân phải nối mượt với phần đỉnh, không ghép hai cột đứng với một nửa vòng tròn.
- Giữ cảm giác thanh, cao và có khoảng rỗng lớn bên dưới.
- Mặt cắt phải có cạnh, mặt ngoài, mặt trong và bề dày; không dùng một ống tròn uốn cong.
- Bổ sung các gờ và chi tiết tròn phía trong theo ảnh. Chúng là chi tiết nhỏ, không phóng to thành các lỗ khổng lồ xuyên cổng.
- Bề mặt trắng hơi ngà, roughness cao, có bóng nhẹ ở các gờ.
- Không thêm mái ngói, bảng chữ lớn treo dưới đỉnh hoặc hai trụ cổng đồ sộ tự nghĩ ra.

Kiểm tra ba góc: chính diện, xiên 45 độ và đứng dưới nhìn lên. Nếu chính diện có vẻ đúng nhưng góc xiên chỉ là một tấm phẳng thì chưa đạt.

### 4. Thư viện Tạ Quang Bửu — phân biệt khối cao và khối đế

Ảnh ngoại thất góc xiên:

https://library.hust.edu.vn/sites/default/files/styles/juicebox_medium/public/7fd288c5-6753-44ab-8767-1ec4db11b9b4.jpg?itok=gE68LPzG

Ảnh bổ sung có chính diện và chi tiết đồng hồ:

https://library.hust.edu.vn/sites/default/files/2.%20Th%C6%B0%20vi%E1%BB%87n.jpg

**Những nét phải giữ:**

- Khối nhà cao, sáng màu, có các hàng cửa sổ ngang đều đặn.
- Phần trên mặt chính có một dải khoảng mở cao, chia bởi những cột đứng.
- Có các đường nhấn xanh dương.
- Khối mặt tiền thấp phía trước có hai mảng lam ngang lớn.
- Đồng hồ tròn đặt giữa hai mảng lam, phía trên lối vào.
- Sảnh thấp hơn, cửa lùi sâu, có cột và bậc tiếp cận.
- Ảnh xiên cho thấy khối bên và một dải kính đứng tại chỗ chuyển tiếp giữa các khối.

**Cách dựng:**

Tách thành khối cao chính, khối bên, dải kính đứng, khối đế mặt trước và sảnh. Không gộp tất cả vào một tòa hộp duy nhất.

Đối với mặt đứng khối cao:

- Chia tầng bằng các hàng cửa có cùng quy luật.
- Khung tường sáng bao quanh cửa; kính xám xanh sẫm vừa phải.
- Dải khoảng mở phía trên phải lùi sâu, cột đứng tạo bóng; không biến thành một hàng cửa giống các tầng dưới.
- Mép mái và đường xanh là chi tiết thanh, không làm thành mái xanh dày như mái tôn.

Đối với khối lam:

- Dựng lam thành nhiều thanh ngang có khoảng cách và chiều sâu.
- Chia hai cụm rõ ràng, chừa vùng giữa cho đồng hồ.
- Không thay lam bằng một tấm kính đen lớn.
- Có bóng dưới từng thanh hoặc hiệu ứng vật liệu tương đương khi nhìn xa.

Đối với đồng hồ:

- Mặt sáng, viền xanh, kim và vạch/chữ số tối đủ rõ.
- Đặt đúng vùng giữa khối đế, không đưa đồng hồ lên nóc như tháp đồng hồ.
- Kích thước vừa với mặt đứng, không phóng to thành biểu tượng chiếm cả tầng.

Biển tên “THƯ VIỆN TẠ QUANG BỬU” phải đọc được, nhưng không dùng biển tên để bù cho mặt tiền sai.

Phần sân có bậc rộng, cây và khoảng nhìn thoáng. Tránh trồng cây che kín đồng hồ, lam và sảnh cùng lúc.

### 5. C9 — cầu thang ngoài trời với lan can đỏ

Dùng nửa bên phải ảnh này:

https://library.hust.edu.vn/sites/default/files/5.%20Qu%E1%BA%A3ng%20tr%C6%B0%E1%BB%9Dng%20C1%20v%C3%A0%20C%C3%A2y%20c%E1%BA%A7u%20%C4%91%E1%BB%8F%20C9_0.jpg

Nếu đường dẫn trên không mở, dùng lại ảnh C1/C9 đã cung cấp ở mục 2; đó là cùng bộ tham chiếu.

Trong ảnh tham chiếu, điểm nhận diện là **hệ cầu thang ngoài trời màu trắng, các vế thang và chiếu nghỉ xếp gấp khúc, lan can kim loại đỏ**.

- Dựng vế thang có bậc, bản thang, chiếu nghỉ và cột đỡ.
- Lan can gồm tay vịn, trụ và thanh ngang mảnh.
- Giữ khoảng rỗng giữa các vế thang; người nhìn thấy ánh sáng và bóng đổ xuyên qua.
- Bản thang và chiếu nghỉ màu trắng/xám rất nhạt; lan can đỏ là điểm nhấn.
- Kết nối cầu thang với cửa hoặc hành lang theo logic kết cấu.
- Không thay bằng một cầu cong đỏ bắc qua hồ.
- Không làm thành cầu thang xoắn.
- Không dựng lan can bằng những khối đỏ đặc, quá dày.

Nếu cho người chơi sử dụng, collider phải liên tục từ chân thang tới chiếu nghỉ; lan can ngăn rơi nhưng không chặn lối đi.

### 6. Hồ Tiền và cây xanh

Hồ là cảnh quan trong campus, cần tạo cảm giác có bờ, có đường đi và có quan hệ với các khối nhà xung quanh.

- Mặt nước thấp hơn mép bờ; không đặt một mặt phẳng xanh ngang bằng nền sân.
- Dùng màu xanh xám dịu, gợn nhẹ.
- Có mép bờ liên tục và lối đi rõ.
- Cây ven hồ có thân, cành và tán phân lớp; một số tán rủ giúp cảnh mềm hơn.
- Không dùng hàng chục cây giống hệt nhau cả kích thước lẫn góc xoay.
- Không tự thêm đảo, thủy đình, cầu đỏ hoặc đài phun nước lớn để “làm đẹp”.

Đối với toàn campus, ưu tiên tán cây trưởng thành và các khoảng bóng mát. Cây phải bổ trợ kiến trúc, không dùng để che phần nhà làm sơ sài.

### 7. Tỉ lệ và chiều sâu

Dùng nhân vật cao khoảng 1,7 đơn vị nếu quy ước 1 đơn vị tương đương 1 m. Đây là thước kiểm tra trong mô hình, không phải căn cứ tự suy ra mọi kích thước thật.

Kiểm tra:

- Cửa lớn hơn người hợp lý.
- Lan can không cao ngang đầu.
- Bậc không cao đến đầu gối.
- Ghế không nhỏ như đồ chơi.
- Sảnh đủ sâu để tạo khoảng tối.
- Cột có tiết diện hợp lý với công trình.
- Cửa, lam và hoa gió không nằm cùng một mặt phẳng.

Mỗi mặt đứng chính phải có ba lớp thị giác: lớp ngoài như cột/lam, lớp tường hoặc lan can và lớp cửa/hành lang lùi phía sau.

### 8. Bố cục campus

Không gom C1, cổng Parabol, thư viện và C9 thành bốn vật trang trí quanh một sân tròn.

Lần sửa này ưu tiên đúng ngoại hình từng công trình. Không tự di chuyển công trình nếu chưa có căn cứ mặt bằng. Không tuyên bố tọa độ campus chính xác chỉ dựa vào ảnh chụp mặt tiền.

Nếu cần không gian để kiểm tra model, tạo một scene kiểm tra riêng với các công trình đứng tách nhau; scene đó không phải bản đồ campus dùng trong game.

### 9. Ánh sáng và chất lượng render

Trước tiên kiểm tra bằng ánh sáng ban ngày trung tính:

- Bóng mềm nhưng đủ nhìn rõ gờ mái, cột, lam và khoảng lùi.
- Không dùng ánh sáng vàng cam mạnh để che sai màu.
- Không dùng sương, bloom hoặc chiều sâu trường ảnh mạnh che chi tiết.
- Mặt trắng không được cháy sáng làm mất hình khối.
- Bổ sung bóng tiếp xúc tại chân cột, chân nhà và dưới mái sảnh.
- Cạnh bê tông có bevel nhỏ nếu cần, không làm mọi khối phồng tròn.

Chỉ thêm hiệu ứng đẹp sau khi hình khối đã đạt.

### 10. Thứ tự thực hiện và bằng chứng hoàn thành

Làm lần lượt:

1. Chụp hiện trạng trước khi sửa.
2. Sửa C1: khối tổng thể → hoa gió → hành lang → mái → sảnh.
3. Sửa cổng Parabol.
4. Sửa thư viện.
5. Sửa cầu thang đỏ C9.
6. Sửa sân, bờ hồ, cây và đường đi.
7. Cập nhật collider và các điểm tương tác.
8. Chơi thử, sửa lỗi, chụp ảnh sau sửa.

Mỗi công trình phải có ảnh chính diện và ảnh xiên. Riêng Parabol thêm góc nhìn từ dưới lên; C9 thêm góc thấy rõ các vế thang.

Tự kiểm tra những lỗi sau:

- Mái xuyên tường hoặc chồng lên nhau.
- Cột không chạm đất hoặc không đỡ tới mái.
- Lam và hoa gió bị nhấp nháy do các mặt trùng nhau.
- Cây xuyên sảnh, cành xuyên cửa.
- Cầu thang kết thúc vào tường đặc.
- Người chơi đi xuyên nhà hoặc bị kẹt ở bậc.
- Camera xuyên công trình.
- Biển chữ ngược, méo hoặc thiếu dấu.

**Không báo “đã giống Bách khoa” chỉ vì thêm logo, cây và màu trắng. Hãy bàn giao ảnh đối chiếu và nêu rõ các chi tiết hình khối đã sửa. Nếu phải tối ưu hiệu năng, giảm chi tiết phụ trước; giữ mái C1, hoa gió, hình cổng Parabol, lam–đồng hồ thư viện và cầu thang đỏ C9.**
