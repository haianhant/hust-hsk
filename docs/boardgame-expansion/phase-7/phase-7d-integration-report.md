# Phase 7D — Báo cáo Kiểm thử Tích hợp Liên Nhân vật (30 Kịch bản) & E2E Cloudflare Durable Object 4P–8P

> **Suite kiểm thử:** [`test/boardgame-phase7d-integration.test.cjs`](../../../test/boardgame-phase7d-integration.test.cjs)  
> **Phạm vi:** 30/30 kịch bản liên nhân vật bắt buộc (Section 21), E2E WebSocket Cloudflare Durable Object thật trên toàn bộ 5 quy mô bàn `4P, 5P, 6P, 7P, 8P` (Section 22), và kiểm định bảo mật/quyền riêng tư (Section 23).

---

## 1. Ma trận 30 Kịch bản Liên Nhân vật (Section 21)

| # | Kịch bản kiểm thử | Nhóm test | Xác nhận hành vi thực tế |
|---:|---|---|---|
| 1 | Lloyd ngắt đòn đánh thường trước khi đổ xúc xắc | `P7D-1` | `state.rngState` bất biến (`0` RNG), Lloyd trừ 2 HP, nạn nhân 0 sát thương |
| 2 | Lloyd hy sinh HP cuối cùng (2 HP còn lại) để hủy đòn | `P7D-1` | Lloyd bị loại (`alive = false`) nhưng đòn đánh vẫn bị hủy hoàn toàn |
| 3 | Lloyd ngắt Machine Gun AoE | `P7D-1` | 1 lần ngắt bảo vệ cả 2 nạn nhân cùng Cụm, `0` RNG |
| 4 | Bản sao Lloyd có nhiều chủ sở hữu hợp lệ | `P7D-1` | Thứ tự vòng ghế thuận chiều: `lloyd1` bỏ qua → `Antimony` (sao chép Lloyd) hủy đòn |
| 5 | Vengeful Spirit sao chép kỹ năng 1 lần/trận | `P7D-1` | Bản sao `exp2_elise` nhận `skillUsedOnce = false` mới tinh dù `vs.skillUsedOnce = true` |
| 6 | Vengeful Spirit sao chép kỹ năng đã được sao chép | `P7D-1` | Sao chép từ Antimony (đã sao chép Elise) → `effectiveSkillRoleId = exp2_elise`, `copyDepth = 2` |
| 7 | Antimony sao chép cả kỹ năng lẫn mục tiêu thắng | `P7B-6` / `P7D-1` | `COPY_GOAL` đồng thắng Hunter khi Shadow cuối cùng bị loại |
| 8 | Chu trình đồ thị mục tiêu thắng Antimony | `P7D-1` | Vòng lặp `Antimony ↔ Cassie` bị `CopiedVictoryGraph` phát hiện & fail-closed (`finished = false`) |
| 9 | Voodoo chiếm quyền lượt kế của người khác | `P7D-2` | Giữ nguyên `turnOrder`, `activePlayerId = victim`, `controllerPlayerId = voodoo` |
| 10 | Voodoo không đọc được vai ẩn & bài kín nạn nhân | `P7D-2` | `getPrivateGameView(voodoo).hand.length === 0`, `revealedRoleId === null`, tạm dừng khi có `inv-*` |
| 11 | Voodoo bị cấm dùng kỹ năng đặc biệt / lật vai nạn nhân | `P7D-2` | Server từ chối `REVEAL_ROLE` & `USE_SKILL` từ Voodoo (`ok: false`) |
| 12 | Voodoo mất kết nối giữa lượt chiếm quyền | `P7D-2` | `applyTimeoutAutoTurn` đóng lượt nạn nhân an toàn, giải phóng grant, không treo bàn |
| 13 | Undead rơi vào `DORMANT_PENDING_REVIVE` | `P7D-2` | Giữ nguyên trang bị (`ev-02`), lật mặt, không thể bị nhắm mục tiêu |
| 14 | Undead hồi sinh chính xác 6 HP ở đầu lượt kế | `P7D-2` | `lifecycleState = 'REVIVED'`, `hp = 6`, giữ nguyên trang bị |
| 15 | Undead bị loại vĩnh viễn ở lần chí tử thứ 2 | `P7D-2` | `lifecycleState = 'FINAL_ELIMINATED'`, trang bị bị loot/hủy |
| 16 | Undead ngủ đông khi là Shadow cuối cùng | `P7D-2` | Hunter **KHÔNG** thắng sớm (`finished === false`) |
| 17 | Gideon & Vengeful Spirit phản ứng với Undead ngủ đông | `P7D-2` | Cả Gideon (0 lá Trắng) lẫn Vengeful Spirit (`pendingChoice === null`) đều bỏ qua giai đoạn ngủ đông |
| 18 | Bonnie chuyển phe sau khi giết Shadow | `P7D-3` | `baseFaction = 'wanderer'` bất biến, `effectiveFaction = 'mist-order'` |
| 19 | Bonnie giết Shadow cuối cùng | `P7D-3` | Chuyển phe ở Bước 6a **TRƯỚC** kiểm tra thắng Bước 9 → Hunter không thắng sớm |
| 20 | Cain kích hoạt thắng song phe | `P7D-3` | `winnerFaction = 'multi-faction'`, `winningFactions = ['lantern-guard', 'mist-order']` |
| 21 | Thắng cá nhân Cain & thắng đồng thời | `P7B-7` / `P7D-3` | Xác nhận cả 5P (`1H+1S` do Cain giết) lẫn 6P (`≥1H + ≥1S + ≥1N khác chết`) |
| 22 | N.C. Soldier chiêu mộ Neutral khác | `P7D-3` | Kết nạp thành công vào `AllianceGroupRecord` độc lập |
| 23 | Ngưỡng chiêu mộ chính xác 5 vết thương | `P7D-3` | `<= 4` vết thương không kết nạp; `>= 5` vết thương & còn sống kết nạp thành công |
| 24 | Tương tác liên minh N.C. Soldier với Bonnie | `P7D-3` | Sau khi Bonnie thành Shadow (`mist-order`), Chiêu Mộ bị từ chối (`ok: false`) |
| 25 | Điều kiện thắng 3 vũ khí của N.C. Soldier | `P7D-3` | Đồng đội cầm hộ `ev-03` chưa thắng; thủ lĩnh cầm đủ `ev-06, ev-05, ev-03` + đủ Neutral → đồng thắng |
| 26 | Cain tương tác với mục tiêu thắng sao chép | `P7D-3` | Antimony sao chép mục tiêu Hunter đồng thắng khi Cain kích hoạt `multi-faction` |
| 27 | Nhiều điều kiện thắng tức thì trong cùng 1 lô sự kiện | `P7D-3` | Cain song phe + Antimony `COPY_GOAL` + Bethany `SHARE_OUTCOME` hợp nhất đầy đủ trong `winnerPlayerIds` |
| 28 | Giới hạn chuỗi phản ứng & sao chép kỹ năng | `P7D-3` | Chặn tự sao chép vòng lặp & giữ giới hạn `MAX_SKILL_COPY_DEPTH = 3` |
| 29 | Nhiều người bị loại đồng thời trong 1 lô AoE | `P7D-3` | Antimony chọn xác định nạn nhân đầu theo `turnOrder` (`v1`); Vengeful Spirit nhận `choice-secret-*` với cả 2 nạn nhân |
| 30 | Classic 0-regression & 0 trường mở rộng trong Classic DTO | `P7D-3` | Classic DTO không phát sinh `controlledTurn`, `alliances`, `winningFactions`, `lifecycleState`, `effectiveFaction` |

---

## 2. Kết quả E2E Cloudflare Durable Object Thật (Section 22)

- **Chặn Production (`enableExperimentalRulesets: false`):** HTTP `POST /api/boardgame/matches` từ chối toàn bộ `starter-fifty-six`, `expansion-1`, `expansion-2`, `full-expansion` với HTTP `400` và mã `RULESET_UNAVAILABLE`.
- **Đủ 5 quy mô bàn `4P, 5P, 6P, 7P, 8P` trên `starter-fifty-six` + chạy song song phòng `classic`:** Khởi tạo, chia vai (xác nhận bàn `5P` không bao giờ chia `exp2_nc_soldier`), đồng bộ Spectator (`privateView === null`), thực thi lệnh WebSocket thật qua DO.
- **Bảo mật & Hibernation SQLite (`P7D-5`):**
  - Voodoo chiếm quyền hợp lệ qua WebSocket, nạn nhân bị chặn lệnh công khai cạnh tranh, Voodoo bị chặn `REVEAL_ROLE`, giữ quyền xuyên suốt F5 reconnect + DO hibernation, chống phát lại `requestId` trùng lặp, hết lượt đóng grant và từ chối mọi lệnh phát lại sau hết hạn.
  - Undead ngủ đông `DORMANT_PENDING_REVIVE` bảo toàn qua DO hibernation → hồi sinh chính xác **6 HP** (`REVIVED`) đầu lượt kế.
  - `effectiveFaction = 'mist-order'` của Bonnie và `AllianceGroup` của N.C. Soldier bảo toàn nguyên vẹn qua DO hibernation.
  - Cain kích hoạt thắng song phe phát DTO `winnerFaction: 'multi-faction'`, `winningFactions: ['lantern-guard', 'mist-order']` nhất quán cho mọi người chơi và Spectator.
