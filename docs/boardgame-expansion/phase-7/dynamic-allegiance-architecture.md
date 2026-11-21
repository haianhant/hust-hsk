# Kiến trúc `DynamicAllegiance` & Nhóm Liên minh Độc lập (Phase 7A)

> **Module Chính:** [`features/boardgame/domain/dynamic-allegiance.ts`](../../../features/boardgame/domain/dynamic-allegiance.ts)  
> **Điểm tích hợp:** [`victory-engine.ts`](../../../features/boardgame/domain/victory-engine.ts), [`projections.ts`](../../../features/boardgame/domain/projections.ts), [`state-machine.ts`](../../../features/boardgame/domain/state-machine.ts)

---

## 1. Tách bạch 4 Lớp Danh tính Phe phái

Không bao giờ đánh đồng việc gia nhập liên minh với việc đổi phe sang Hunter hoặc Shadow:

| Khái niệm | Lưu trữ | Khả biến? | Ví dụ |
|---|---|---|---|
| **`baseFaction`** | `player.faction` | **Bất biến** (provenance theo catalog) | Bonnie luôn có `baseFaction = 'wanderer'` |
| **`effectiveFaction`** | `expansionState.effectiveFactionByPlayer[pid]` | **Đổi 1 lần, bất khả nghịch** | Bonnie sau khi kết liễu Shadow có `effectiveFaction = 'mist-order'` |
| **`allianceId`** | `expansionState.alliances[allianceId]` | Độc lập với `effectiveFaction` | Thành viên bị N.C. Soldier chiêu mộ giữ nguyên `effectiveFaction = 'wanderer'` và `roleId` gốc |
| **`effectiveSkillRoleId`** | `expansionState.copiedSkillsByPlayer[pid]` | Động theo `DynamicSkillCopy` | Thành viên liên minh N.C. Soldier nhận kỹ năng Chiêu Mộ (`exp2_nc_soldier`) |

---

## 2. Quy tắc Chuyển đổi Phe Động — Bonnie (`exp2_bonnie`)

1. Kích hoạt tại bước 6–7 của chuỗi giao dịch loại (TRƯỚC bước 9 kiểm tra thắng thua).
2. `convertPlayerEffectiveFaction` ghi nhận bản ghi `DynamicFactionChangeRecord` 1 lần duy nhất (`alreadyConverted` chặn chuyển đổi kép) mà **không** sửa đổi lịch sử `revealHistory` hay `eliminatedRound` quá khứ.
3. Mọi kiểm tra hiện tại (đếm phe thắng trong `victory-engine.ts`, thẻ Điều tra, `Ernest`, `Cindy`, `Angel`, `Bryon`, điều kiện chiêu mộ `N.C. Soldier`) đọc thống nhất qua `getEffectiveFaction(state, player)` — loại bỏ tuyệt đối nguy cơ đếm Bonnie ở cả Neutral lẫn Shadow.
4. Nếu Bonnie kết liễu Shadow cuối cùng: Bonnie lập tức trở thành Shadow sống duy nhất (`shadowsAlive = 1`) nên phe Hunter **chưa** thắng; trận đấu tiếp tục!
5. Bảo mật P0: `projections.ts` chỉ xuất `effectiveFaction` sau khi Bonnie lộ diện công khai (bắt buộc lúc chuyển phe) hoặc khi trận kết thúc.

---

## 3. Quy tắc Nhóm Liên minh — N.C. Soldier (`exp2_nc_soldier`)

1. `state-machine.ts` lưu danh sách `originallyDealtNeutralIds` ngay lúc khởi tạo ván mở rộng, đồng thời **loại trừ `exp2_nc_soldier` khỏi pool bàn 5P** (vì bàn 5P chỉ có 1 ghế Neutral duy nhất).
2. `isEligibleNcSoldierRecruitTarget` yêu cầu mục tiêu:
   - Khác người chiêu mộ, đang sống, không ngủ đông.
   - **Đã lộ diện công khai** (ngăn chặn tuyệt đối lộ vai ẩn khi chiêu mộ nhầm Hunter/Shadow!).
   - Có `isEffectiveNeutral(state, target) === true` (Bonnie đã thành Shadow bị từ chối!).
   - Chưa nằm trong liên minh.
3. Khi chiêu mộ thành công (`recruitPlayerIntoNcSoldierAlliance` + `bindNcSoldierRecruitedSkill`):
   - Thành viên giữ nguyên `roleId` và `baseFaction`/`effectiveFaction = 'wanderer'`.
   - Mục tiêu thắng cá nhân cũ được thay thế bằng mục tiêu chung của liên minh (`!isPlayerInAlliance` ngăn thắng theo mục tiêu cá nhân cũ).
   - Thành viên có thể dùng kỹ năng Chiêu Mộ để tiếp tục kết nạp Neutral khác vào cùng `AllianceGroupRecord`.
4. **Điều kiện thắng (`isNcSoldierAllianceVictorySatisfied`):**
   - Thủ lĩnh còn sống & vẫn là Neutral hiệu lực.
   - Ít nhất 1 Neutral khác được chiêu mộ, VÀ **tất cả** `otherOriginalNeutrals` đều đang nằm trong liên minh (nếu 1 Neutral chết hoặc Bonnie đổi phe trước khi chiêu mộ -> trả về `false`!).
   - Thủ lĩnh **tự mình đeo** đủ 3 vũ khí: `ev-06` (Machine Gun), `ev-05` (Handgun), `ev-03` (Chainsaw).
   - Tất cả thành viên trong liên minh đồng thắng tức thì.
