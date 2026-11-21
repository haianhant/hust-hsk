# Bóng Đêm KTX — Phase 8B Deep Gameplay Logic Audit Report

> **Ngày hoàn tất:** 2026-11-21  
> **Baseline trước vá:** `72595c5d4730451d5e1d878874ded825d17aeb80`  
> **Trạng thái cổng Phase 8B:** **PASS (`0` P0/P1 mở, `0` vi phạm bất biến, `0` sai lệch Classic)**

---

## 1. Tóm tắt Điều hành

Kiểm toán sâu Track A (Phase 8B) đã kết hợp **đọc tĩnh toàn bộ 16 giai đoạn vòng đời ván đấu** (từ engine `features/boardgame/domain/*` tới tầng lưu trữ & đồng bộ Cloudflare Durable Object `worker/src/boardgame-room.ts`) với **hạ tầng Stateful Fuzzer + Adversarial Input Fuzzer + Deterministic Event Replay + Failure Shrinker** mới xây dựng.

Kết quả phát hiện và xác minh thực chứng **9 lỗi thật** (gồm **3 lỗi P0** và **6 lỗi P1**) — tất cả đều vượt qua được toàn bộ 28 bộ kiểm thử unit/E2E và mô phỏng bot 30.000 trận trước đó:

- **3 lỗi P0 nghiêm trọng nhất đã được vá triệt để:**
  1. **`BUG-8B-09` (Bắt trực tiếp bởi Stateful Fuzzer & Replay Verifier):** `Father Harrison` đã lộ diện (đứng ngoài Church) không thể tung xúc xắc `ROLL_DICE` vì `fatherHarrisonSundayServiceHandler` tự cướp sự kiện `ON_MOVE` của `applyExpandedDiceRollMove`, gây đột biến trạng thái trên hành động bị từ chối và **deadlock 100%** khi bị `Voodoo` chiếm quyền lượt.
  2. **`BUG-8B-01` (Privacy / Authorization Oracle):** `Voodoo` có thể ép nạn nhân chưa lộ diện lật vai công khai / dò phe ẩn bằng cách dùng `eq-13` (Advent), `eq-14` (Chocolate) hoặc `ev-13` (Diabolic Ritual) với `skipEffect: false`.
  3. **`BUG-8B-02` (Production Deadlock trên DO):** Khi `turn_timeout_ms <= 0` (mặc định production), thao tác F5 reconnect của người đang sở hữu `pendingChoice` xóa `turn_deadline_ms = NULL` và hủy Durable Object alarm, khiến bàn chơi treo vĩnh viễn nếu người chơi AFK.
- **6 lỗi P1 về đúng đắn nghiệp vụ & tính nhất quán:**
  - `BUG-8B-03`: Hạn lượt bị kế thừa deadline ngắn cũ của `pendingChoice` sau khi choice đóng trong cùng lượt.
  - `BUG-8B-04`: `applyTimeoutAutoTurn` tự skip luôn lượt của người chơi kế tiếp nếu việc hết hạn `pendingChoice` vừa tự động chuyển lượt.
  - `BUG-8B-05`: `Undead` chưa lộ có thể vượt rào `RC-02` bằng `ev-13` (Diabolic Ritual).
  - `BUG-8B-06`: Không nhất quán `DynamicAllegiance` sau chuyển phe `Bonnie` (`revealHistory`, `lastRevealEvent`, `Cassie`, `Diana`, `Angel` projection, `ev-13`).
  - `BUG-8B-07`: 13+ điểm kiểm tra cứng `player.roleId` / `player.skillUsedOnce` bỏ qua kỹ năng sao chép `DynamicSkillCopy` (`Vengeful Spirit` / `Antimony`).
  - `BUG-8B-08`: `COPY_GOAL` thiếu guard ngủ đông `Undead`, thiếu theo dõi cờ thắng sự kiện (`Charles`/`Cruz`/`Arlene`/`Dalton`), thiếu giải liên kết tự chọn của `Antimony` khi sao chép `Bethany`/`Clairvoyant`, và bỏ hoàn toàn fallback `Date.now()` trong `enqueueRoleRevealedTrigger`.

---

## 2. Kết quả Xác minh Stateful Fuzzing, Adversarial Fuzzing & Deterministic Replay

Lệnh thực thi trên bản đã vá:
```bash
node scripts/fuzz-boardgame-stateful.cjs --valid=400 --targeted=80 --adversarial=150 --replay=60
```

| Bộ kiểm chứng | Quy mô thực chạy | Số bước / Probe | Số lỗi / Vi phạm | Kết luận |
|---|---|---:|---:|---|
| **Valid Gameplay Stateful Fuzz** | `400` trận (`100` Classic, `100` Exp1, `100` Exp2, `100` Full; 4P–8P) | `76,162` bước | **`0`** | PASS (`399/400` kết thúc tự nhiên, `0` vi phạm bất biến, `0` đột biến khi `ok=false`) |
| **Targeted High-Interaction Fuzz** | `80` trận (4 tổ hợp Tier-4 + Tier-3 mật độ cao) | `13,636` bước | **`0`** | PASS (`0` deadlock, `0` mất/nhân bản trong 48 thẻ bài) |
| **Deterministic Event Replay** | `72` trận (bao gồm cả Valid & Targeted) | Toàn bộ trace | **`0`** | PASS (`72/72` khớp `sha256` trạng thái cuối từng byte) |
| **Adversarial Input Fuzz** | `150` trận (4P–8P, 4 bộ luật) | `56,763` probes | **`0`** | PASS (`56,763/56,763` từ chối sạch, `0` đột biến gameplay state) |

---

## 3. Phạm vi Chưa Thay đổi & Lưu ý Minh bạch

- **0-diff trên `features/boardgame/domain/victory.ts`** và **0.00% thay đổi** trên 4.500 trận mô phỏng Classic (`test/boardgame-sim.cjs`) cùng 25/25 Classic RNG fingerprints.
- Không thay đổi thông số cân bằng (HP, số lượng mục tiêu, điều kiện thắng) của bất kỳ nhân vật nào trong danh mục 66 nhân vật.
- Toàn bộ giao thức WebSocket, schema SQLite và feature flags Production Beta Phase 8A giữ tương thích ngược hoàn toàn.
