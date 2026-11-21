# Bóng Đêm KTX — Phase 6D Integration, Cross-Character & Cloudflare DO E2E Report

> **Milestone:** Phase 6D — Kiểm thử tích hợp đa nhân vật, bảo mật thông tin ẩn và Durable Object Multiplayer E2E trên `starter-forty-eight` (**58 vai trò chơi được**: `10 Classic + 48 Expansion`).  
> **Suite chính:** [`test/boardgame-phase6d-integration.test.cjs`](../../../test/boardgame-phase6d-integration.test.cjs) (kết hợp `test/boardgame-phase6a.test.cjs`, `test/boardgame-phase6b.test.cjs`, `test/boardgame-phase6c-portraits.test.cjs`).  
> **Production Safety:** Production DO mặc định (khi chưa bật `ALLOW_EXPERIMENTAL_RULESETS=1`) từ chối `starter-forty-eight` với `HTTP 400 / RULESET_UNAVAILABLE`.

---

## 1. Ma trận Phủ 25 Kịch bản Bắt buộc (Section 25)

| # | Kịch bản kiểm thử | Test case | Kết quả |
|---:|---|---|---|
| 1 | Gideon rút và giải quyết tuần tự 3 thẻ Cung Ứng (Trắng) sau khi một Shadow bị hạ | `P6D-1` / `P6B-2` | PASS |
| 2 | Gideon kích hoạt **ngoài lượt (out of turn)** khi người chơi khác tiêu diệt Shadow | `P6D-1` | PASS |
| 3 | Anathema chuyển hướng sát thương chí mạng sang nạn nhân bị nguyền & tắt nguyền khi nạn nhân chết | `P6D-1` / `P6B-3` | PASS |
| 4 | Chuỗi chuyển hướng `Attacker → Anathema (Stage 0) → Arnold (Stage 4) → Attacker` giữ nguyên HP Arnold & ghi trace nội bộ | `P6D-1` / `P6B-5` | PASS |
| 5 | Arnold phản sát thương chí mạng sang Cindy → Cindy lật vai phản đòn (`cindy_reveal_retaliate`) không gây vòng lặp Arnold | `P6D-1` | PASS |
| 6 | Bắc cầu 3 tầng `Bethany (SHARE_OUTCOME) → Diana (CONDITIONAL_SHARED) → Cassie (COPY_GOAL) → Anathema` + kiểm chứng khi Diana chết | `P6D-2` | PASS |
| 7 | Clairvoyant sao chép điều kiện động của Cassie (đang sao chép Colt 3 vũ khí) — chứng minh `COPY_GOAL !== SHARE_OUTCOME` | `P6D-2` | PASS |
| 8 | Chu trình 3 nút `Bethany → Diana → Clairvoyant → Bethany` fail-closed (`cycleCount >= 1`, `via = cycle_blocked`, không treo máy) | `P6D-2` / `P6A` | PASS |
| 9 | Cassie gắn kết Neutral lộ diện thường đầu tiên (loại trừ chết/cuối trận, không gắn lại lần 2) | `P6D-2` / `P6B-6` | PASS |
| 10 | Diana bàn 5P không có khách hàng: dự phòng đầy máu cuối trận (full HP thắng, bị thương thua) | `P6D-2` / `P6B-10` | PASS |
| 11 | Aaron không tìm được vợ: dự phòng chết trước khi kết trận (không thắng tức thì khi chết) | `P6D-2` / `P6B-11` | PASS |
| 12 | Aaron với Machine Gun (bỏ qua vợ, bắn mục tiêu khác) & Masamune (bảo vệ vợ ghi đè ép đánh khi vợ là mục tiêu duy nhất) | `P6D-2` / `P6B-11` | PASS |
| 13 | April & Skipps chạm đúng ô 7 vết thương (`hp = 1`) bắt buộc lộ diện; nhảy qua 7 (chết thẳng) không kích | `P6D-3` / `P6B-8` | PASS |
| 14 | April & Skipps hồi máu sau mốc 7 vẫn giữ đếm ngược & thắng tức thì cuối lượt kế tiếp của mình | `P6D-3` / `P6B-8` | PASS |
| 15 | Colt phản công khi bị cướp đồ từ xa (`court` / `ev-11` / `Bob`) bỏ qua giới hạn cụm | `P6D-3` / `P6B-9` | PASS |
| 16 | Colt gây ≥ 2 ST chọn thu hồi **đúng lá bị cướp** nguyên tử (0 sát thương, bảo toàn tổng số trang bị) | `P6D-3` / `P6B-9` | PASS |
| 17 | Colt thắng tức thì khi đeo đủ 3 vũ khí chuẩn (`ev-02`, `ev-03`, `ev-04`, `ev-05`) | `P6D-3` / `P6B-9` | PASS |
| 18 | Nhiều sự kiện lộ diện đồng thời trong 1 batch (`Ernest` `Apostasy` lật nhiều Shadow gồm nữ) → `Aaron` gắn kết xác định theo `turnOrder` / `revealSeq` | `P6D-3` | PASS |
| 19 | Nhiều chiến thắng Neutral tức thì đồng thời (`Bob` 5 đồ + `Colt` 3 vũ khí + `Bethany` Chosen trên `Colt`) sắp đúng `state.turnOrder` | `P6D-3` | PASS |
| 20 | Ngắt kết nối & F5 reconnect giữa phản ứng chuỗi (`Clairvoyant` private vision & `Arnold` secret lethal reaction qua DO hibernation) | `P6D-5` | PASS |
| 21 | Từ chối yêu cầu riêng tư sai chủ sở hữu bằng thông báo lỗi trung tính (không lộ tên vai/chủ phản ứng) | `P6D-5` | PASS |
| 22 | Chống phát lại request mạng trùng (`requestId` idempotency trong SQLite `processed_requests`, không tăng revision/không nhân đôi sát thương) | `P6D-5` | PASS |
| 23 | Bảo mật vai ẩn tuyệt đối với Khán giả (Spectator: `privateView === null`, không rò vai/phe/vision/hợp đồng chờ) | `P6D-4` / `P6D-5` | PASS |
| 24 | Tương tác chéo với tướng cũ: `Wrath` AoE chuyển hướng sang `G43 + Holy Robe` (`0 ST`), `Angel` bảo vệ Neutral bị nguyền, `Dalton` kích hoạt hiệp 12 từ đòn chuyển hướng | `P6D-1` | PASS |
| 25 | Classic giữ nguyên 100% hành vi & DTO sạch không trường mở rộng (`victory.ts` 0-diff, 25/25 SHA-256 RNG) | `P6D-3` / `P6D-4` | PASS |

---

## 2. Kiểm thử Real Cloudflare Durable Object WebSocket E2E (Section 26)

1. **Đủ 5 quy mô phòng chơi (`4P, 5P, 6P, 7P, 8P`) trên `starter-forty-eight`:**
   - Chia vai từ đúng pool `58` vai (`19H / 18S / 21N`), không trùng vai, giữ nguyên tỷ lệ phe chuẩn 4P–8P.
   - Thực thi lượt đi thật qua WebSocket (`ROLL_DICE`, `CHOOSE_DEST`, `SKIP_LOCATION`, `END_TURN`, `RESOLVE_CHOICE`) tôn trọng server authority, không âm HP, không nhân bản trang bị.
2. **Khóa Production & Phòng Song Song:**
   - Server production (`ALLOW_EXPERIMENTAL_RULESETS` không đặt) trả `HTTP 400` kèm `code: 'RULESET_UNAVAILABLE'` cho `starter-forty-eight`.
   - Phòng `classic` (4P) và `starter-forty-eight` (6P) chạy đồng thời trên cùng Worker/DO namespace không nhiễm dữ liệu lẫn nhau.
3. **SQLite Persistence, Hibernation, F5 Reconnect & Alarm Timeout:**
   - `container.hibernateAndWake()` + F5 `BG_JOIN` (`reconnectToken`) phục hồi nguyên vẹn `clairvoyantReveals`, `arnold_reflect_lethal`, `publicDeadlineMs` chuẩn hóa, và `dianaContracts`.
   - Hết giờ trên `colt_theft_counter` qua `/__bg_trigger_alarm` hoàn tất giao dịch cướp an toàn, không kẹt `pendingChoice`, bảo toàn chính xác `1` bản sao của `ev-02`.
   - Từ chối chuyển `ev-01` (Masamune) qua `TRANSFER_TO_BETHANY` ở tầng server.
