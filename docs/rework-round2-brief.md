# Brief đợt sửa lần 2 — hướng công trình, cảnh quan, nhân vật (user gửi 06/11/2026)

> Làm SAU khi đợt sửa UX (prompt E to + menu Đổi bài + thoát giữa buổi) đã kiểm chứng xong và deploy, để khỏi đè file app/page.tsx / QuestPanel.tsx. Giữ hoạt động học tập đang có. Không tự khẳng định phương vị Bắc/Nam nếu chưa có dữ liệu.

Ảnh hiện trạng user đính kèm (trong tin nhắn 06/11): campus sau đợt sửa kiến trúc lần 1 — thư viện nhìn từ phía hồ, nhân vật đứng giữa sân.

## 1. Sửa hướng thư viện Tạ Quang Bửu (ĐÍNH CHÍNH BẮT BUỘC)

**Mặt thư viện có đồng hồ KHÔNG quay ra Hồ Tiền.** Bản hiện tại đặt mặt chính có đồng hồ nhìn thẳng qua hồ — sai quan hệ không gian.

- Kiểm tra hướng của toàn bộ model thư viện trong scene.
- Xoay/đặt lại cả công trình để mặt có đồng hồ và sảnh chính hướng về phía sân tiếp cận, không hướng thẳng ra hồ như ảnh.
- Không chỉ tháo đồng hồ rồi gắn sang một bức tường khác.
- Không sao chép mặt có đồng hồ sang nhiều phía.
- Không tự di chuyển hồ sang chỗ khác để giữ nguyên lỗi của thư viện.
- Không mặc định xoay 180° khi chưa kiểm tra hệ trục và cấu trúc model: sửa theo quan hệ mặt chính–sân vào–hồ.
- Di chuyển đồng bộ sảnh, bậc, cửa, collider và điểm tương tác cùng công trình.
- Mặt nhìn từ hồ phải là mặt đứng phù hợp của thư viện, không phải bản sao nguyên mặt tiền có đồng hồ.
- Tạo một ảnh nhìn từ trên xuống, đánh dấu **hồ, thư viện, mặt đồng hồ, sân vào và mũi tên hướng mặt chính** để kiểm tra trước khi thêm trang trí.

## 2. Sửa tỉ lệ mặt tiền thư viện

Ảnh tham chiếu ngoại thất: https://library.hust.edu.vn/sites/default/files/styles/juicebox_medium/public/7fd288c5-6753-44ab-8767-1ec4db11b9b4.jpg?itok=gE68LPzG

Trong ảnh hiện trạng, đồng hồ và cụm lam đang quá nổi trội; sảnh phía dưới lại thành một khối cao, trống, với những cột mảnh kéo dài.

- Thu nhỏ đồng hồ tương quan với toàn mặt đứng; không để nó chiếm gần hết chiều cao khối lam.
- Giữ hai cụm lam ngang hai bên đồng hồ, có nhiều thanh mảnh và khoảng tối phía sau.
- Điều chỉnh khối sảnh thấp, sâu và có bóng đổ hợp lý theo ảnh; không dựng thành một hàng cột cao như chân đế của tòa tháp.
- Cửa kính lùi vào phía trong, mái sảnh và cột phải liên kết hợp lý.
- Khối cao phía trên phải có các hàng cửa sổ đều, phần tường và phần kính phân biệt rõ.
- Tường trắng ngà sáng; kính xanh xám vừa phải, không biến toàn nhà thành màu xám bẩn.
- Kiểm tra chữ "THƯ VIỆN TẠ QUANG BỬU" đúng dấu, không quá dày hoặc quá lớn.

## 3. Làm lại thực vật trong hồ: bỏ hình "nấm hồng"

Ảnh Hồ Tiền tham chiếu: https://library.hust.edu.vn/sites/default/files/3%20H%E1%BB%93%20ti%E1%BB%81n.jpg

Bản hiện tại có quá nhiều thân thẳng màu nâu, đầu tròn màu hồng, mọc đều và cao gần bằng nhau — giống một ruộng nấm hơn hồ hoa.

- Dùng hoa dạng nhiều cánh thuôn xếp quanh tâm, có bông nở và nụ.
- Bỏ đầu hoa hình cầu hoặc bán cầu trơn.
- Cuống mảnh, màu xanh hoặc xanh nâu dịu; phần nhìn thấy trên mặt nước ngắn hơn hiện tại.
- Lá nằm sát mặt nước, có hình dạng hữu cơ và khe khuyết phù hợp kiểu lá súng trong ảnh tham chiếu.
- Lá không phải những đĩa tròn đều, dày, có cùng kích thước.
- Phân bố theo cụm không đều; thay đổi kích thước, góc xoay và độ nở.
- Giảm rõ mật độ hoa hồng so với bản hiện tại. Lá nhiều hơn hoa, xen khoảng nước nhìn thấy được.
- Không rải hoa theo lưới và không phủ kín hồ bằng các đối tượng giống hệt nhau.
- Hướng mỹ thuật dựa trên ảnh Hồ Tiền, không cần gán nhãn loài hoa trên giao diện nếu chưa xác minh.

Mặt nước:
- Xanh xám hoặc xanh ôliu dịu, tránh màu đen đặc.
- Gợn nhỏ, chuyển động chậm.
- Có phản chiếu nhẹ của trời và công trình; không cần phản xạ nặng gây giật.
- Giảm các bóng đen sắc cạnh của từng lá, từng cuống đang làm mặt nước loang lổ.
- Mực nước thấp hơn mép bờ.

Bờ hồ:
- Trong ảnh hiện tại, mép bờ trông như một bức tường cao trước nhân vật. Hạ và cân lại tỉ lệ để thành mép bờ thấp hợp lý, có bề dày, mặt trên và chân bờ. Collider vẫn ngăn người chơi rơi xuống nước.

## 4. Sửa cây và không gian xung quanh

Cây hiện tại có tán như những chiếc mũ hoặc đĩa xanh chồng lên nhau; các sợi rủ xuống quá thẳng và thưa.

- Thân cây thuôn dần, có một số nhánh chính.
- Tán chia thành nhiều cụm lệch nhau, không đối xứng hoàn toàn.
- Cây rủ có cành cong và cụm lá nhỏ đi theo cành; bỏ những dây thẳng đứng giống dây điện.
- Dùng vài sắc xanh gần nhau để có chiều sâu.
- Không dùng cùng một cây với cùng chiều cao và góc xoay khắp campus.
- Bổ sung cây nền và các khối nhà phụ ở nơi phù hợp để cảnh không kết thúc đột ngột ở khoảng trời trống.
- Tạo đường dạo, ghế và đèn vừa đủ; giữ lối đi thông thoáng.
- Không dùng cây để che mặt đứng chưa sửa xong.
- Ánh sáng ban ngày dịu, đủ sáng để thấy vật liệu và hình dáng. Giảm bóng đen gắt và các mảng nền xám xanh quá tối.

## 5. Dựng lại nhân vật: sinh viên trẻ, không phải robot

Lỗi hiện tại: đầu nhỏ so với vai và áo; vai nổi thành hai khối tròn như giáp; tay áo và cánh tay giống những ống trụ cứng; chân dài, thẳng, thiếu khớp và chuyển tiếp; balô lớn, dày, che gần hết thân; tư thế đứng quá đối xứng và cứng.

Phong cách mong muốn: nhân vật 3D cách điệu nhẹ, trẻ trung, có tỉ lệ cơ thể tự nhiên, phù hợp sinh viên khoảng 18–23 tuổi. Không biến thành chibi đầu khổng lồ.

Thông số khởi điểm (không phải chuẩn nhân trắc bắt buộc):
- Chiều cao toàn thân khoảng 6,5–7 lần chiều cao đầu.
- Vai rộng khoảng 2,2–2,5 lần bề ngang đầu.
- Vai có độ dốc xuống cánh tay, không nằm ngang như thanh đòn.
- Cổ nối tự nhiên với đầu và thân.
- Bắp tay thuôn xuống khuỷu, cẳng tay thuôn xuống cổ tay.
- Bàn tay vừa phải, có ngón cái nhận diện được; không cần làm từng ngón quá chi tiết.
- Quần có hình khối đùi, đầu gối, bắp chân và gấu; không dùng hai thanh hộp dài.
- Giày có mũi, thân và đế, không phải hai khối trắng vuông.

Phải chỉnh toàn bộ tương quan đầu–vai–thân–tay–chân. Không chỉ tăng kích thước đầu rồi coi là đã sửa.

Ưu tiên mesh người có rig phù hợp, giấy phép sử dụng rõ ràng nếu có sẵn. Nếu dựng thủ công, phải tạo chuyển tiếp mềm giữa các phần; không để lộ các khối cầu và ống trụ ráp lại như đồ chơi cơ khí.

## 6. Áo sinh viên HUST: chọn đúng một mẫu polo tham chiếu

Ảnh sinh viên từ website HUST: https://hust.edu.vn/uploads/sys/news/2025_05/z6641822780364_e7057dabaa6d3bc23e79523a6dc0def9.jpg

Dùng mẫu polo đỏ trong ảnh làm trang phục mặc định. Đây là mẫu tham chiếu cụ thể, không phải tuyên bố HUST chỉ có một loại đồng phục.

- Áo polo đỏ, tay ngắn.
- Cổ bẻ, có viền sáng và tối tương phản mảnh theo ảnh.
- Có nẹp cúc ngắn phía trước.
- Chữ HUST trắng nhỏ ở ngực trái người mặc.
- Mép tay áo có viền nhỏ tương ứng mẫu.
- Phom áo vừa người, hơi rộng tự nhiên; không bó như áo thể thao và không phồng thành áo giáp.
- Tay áo kết thúc ở phần bắp tay, để lộ cẳng tay màu da.
- Vai áo mềm, liền với thân; bỏ hoàn toàn hai khối cầu đỏ ở vai.
- Vải mờ, có vài nếp nhẹ ở nách, khuỷu chuyển động và gấu áo; không bóng như nhựa.
- Không tự thêm sọc lớn, cầu vai, túi hộp hoặc biểu tượng khác.
- Nếu chưa có biểu trưng tay áo đủ rõ để tái hiện, ưu tiên đúng phom polo, màu, viền và chữ HUST; không vẽ một huy hiệu giả.

Phối quần dài đen/xanh than và giày thể thao đơn giản. Có thể thêm biến thể tóc và vóc dáng, nhưng giữ cùng chất lượng hình thể.

## 7. Thu gọn balô và sửa chuyển động

Balô:
- Nhỏ hơn chiều rộng thân.
- Nằm từ dưới vai tới vùng thắt lưng, không kéo xuống che mông.
- Có độ dày vừa phải, quai ôm qua vai.
- Không che hết cổ và đường vai.
- Không xuyên vào áo hoặc cánh tay.
- Tạo tùy chọn tháo balô để kiểm tra model người và áo độc lập.

Chuyển động:
- Đứng nghỉ có chuyển trọng lượng nhẹ, không giữ hai tay cứng song song.
- Khi đi, tay và chân đánh đối xứng chéo tự nhiên.
- Khuỷu và gối phải gập.
- Bàn chân tiếp đất, tốc độ animation khớp tốc độ di chuyển.
- Không trượt chân, không rung balô quá mạnh.
- Khi dừng, chuyển mềm sang idle.
- Khi mở bảng học, nhân vật đứng yên và không tiếp tục chạy tại chỗ.

## 8. Chỉnh camera và các bảng thông báo đang che cảnh

- Camera sau nhân vật đủ xa để nhìn đường và bối cảnh.
- Điểm ngắm ở vùng thân trên; không nhìn từ quá thấp khiến người và bờ hồ sai tỉ lệ.
- Cho xoay camera để xem nhân vật từ trước và bên.
- Kiểm tra camera tránh xuyên tường và không bị cây kéo giật.
- Thông báo "Thiết bị chưa có giọng tiếng Trung" hiện quá lớn và chiếm phần đẹp của cảnh. Chuyển thành thông báo gọn, cho đóng; sau đó giữ trạng thái âm thanh trong phần cài đặt. Không để banner lớn tồn tại liên tục.
- Thanh nhiệm vụ cũng cần gọn lại, có thể thu nhỏ. Giao diện không được che mặt tiền hoặc chiếm nhiều bầu trời như ảnh hiện tại.

## 9. Thứ tự sửa và tiêu chí kiểm tra

1. Sửa hướng toàn bộ thư viện và quan hệ với hồ.
2. Sửa tỉ lệ mặt tiền, đồng hồ, lam và sảnh.
3. Dựng lại nhân vật trên nền kiểm tra trung tính.
4. Hoàn thiện polo HUST và balô.
5. Kiểm tra đứng, đi, chạy, quay và dừng.
6. Làm lại hoa, lá, nước, bờ hồ và cây.
7. Chỉnh ánh sáng, camera và HUD.
8. Kiểm tra va chạm, điểm nhiệm vụ và hiệu năng.

Bàn giao ảnh kiểm chứng:
- Một ảnh từ trên xuống có mũi tên hướng mặt đồng hồ.
- Một ảnh đứng bên hồ nhìn về thư viện.
- Một ảnh mặt chính thư viện nhìn từ sân tiếp cận.
- Nhân vật ở ba góc trước, bên, sau; có ít nhất một ảnh tháo balô.
- Một ảnh cận áo để thấy cổ, tay áo và chữ HUST.
- Một ảnh cận hồ để thấy hình cánh hoa, lá và khoảng nước.

Không báo đã sửa chuyển động chỉ từ ảnh đứng: phải chạy thử animation.

**Hoàn thành khi cảnh có quan hệ không gian đúng theo đính chính, hồ không còn giống ruộng nấm, và nhân vật có dáng sinh viên mặc polo HUST thay vì robot đỏ đeo balô.**

## Ghi chú từ ảnh polo tham chiếu (Kiến tự xem ảnh gốc 06/11, chỉ xem — không copy ảnh vào project)

Ảnh sinh viên HUST (hust.edu.vn, 05/2025): polo đỏ tươi, tay ngắn tới giữa bắp tay, cổ bẻ có viền trắng + đường tối mảnh, mép tay áo có viền trắng tương ứng, nẹp cúc ngắn 2 cúc tối màu, chữ "HUST" trắng nhỏ ở ngực trái, phom vừa người hơi rộng, vải mờ. Tay áo trái có huy hiệu tròn đỏ/trắng nhỏ (chữ quanh viền, không đọc rõ) — theo brief, chưa rõ thì ƯU TIÊN đúng phom/màu/viền/chữ HUST, không vẽ huy hiệu giả. Quần tối màu; một sinh viên đeo túi đen.
