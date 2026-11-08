# ADR-0004: Tách biệt Trạng thái Frame Mutable (`playerState`) và Trạng thái React UI

- **Trạng thái:** Đã chấp thuận & Đang áp dụng
- **Bối cảnh:**
  - Vòng lặp vật lý và hoạt họa 3D trong React Three Fiber (`useFrame` tại [`Player.tsx`](../../components/three/Player.tsx), [`Motorbike.tsx`](../../components/three/Motorbike.tsx), [`RemotePlayers.tsx`](../../components/three/RemotePlayers.tsx)) chạy ở tần số `60 FPS` (mỗi `~16.6ms`).
  - Nếu lưu tọa độ `(x, z)`, góc nhìn camera (`yaw`, `pitch`), vận tốc xe máy hay hướng quay nhân vật vào `React.useState` hoặc một global store kích hoạt re-render cây DOM của [`app/page.tsx`](../../app/page.tsx) mỗi frame, trình duyệt sẽ bị nghẽn CPU bởi quá trình reconciliation của React và gây tụt khung hình nghiêm trọng trên thiết bị di động.
- **Quyết định:**
  1. Duy trì các đối tượng trạng thái mutable thuần tại [`lib/playerState.ts`](../../lib/playerState.ts) (`playerState`, `playerInput`, `bikeState`, `bikeInput`, `fastTravelState`).
  2. Các component 3D trong `<Canvas>` đọc và ghi trực tiếp vào `playerState` / `bikeState` ở tần số `60 FPS` với chi phí cấp phát bộ nhớ bằng 0.
  3. Các thành phần giao diện DOM (`HUD`, `Minimap`, bộ phát gói tin `multiplayer.sendMove`) chỉ lấy mẫu định kỳ ở tần số thấp (`100ms – 200ms`, tức `5–10 Hz`) hoặc giao tiếp qua sự kiện rời rạc (`CustomEvent('bkhn:interact')`) khi thực sự có thay đổi về tên khu vực (`zone`) hoặc vật thể tương tác gần nhất.
- **Hệ quả:**
  - Vòng lặp 3D giữ được độ mượt tối đa, hoàn toàn độc lập với độ phức tạp của các bảng giao diện Sổ tay từ vựng hay Hộp thoại nhiệm vụ HSK.
