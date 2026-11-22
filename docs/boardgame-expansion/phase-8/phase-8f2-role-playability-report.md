# HUSTVerse — Bóng Đêm KTX · Phase 8F.2: Role Playability & Skill Clarity Report

**Ngày hoàn thành:** 2026-11-22  
**Phạm vi:** Bản vá an toàn tối thiểu (Minimal Safe Patch) khắc phục nhân vật có điều kiện thắng bất khả thi theo số người chơi, chuẩn hóa mô tả kỹ năng Gwendolen (`exp1_gwendolen`), rà soát khả năng chơi (playability) của toàn bộ 25 nhân vật phe Neutral từ 4P–8P, và kiểm định hồi quy toàn diện trên Production Beta.

---

## 1. Các Lỗi Đã Xác Nhận & Bản Vá (Confirmed Bugs and Fixes)

| Mã vấn đề | Nhân vật / Module | Mô tả lỗi xác nhận | Giải pháp & Tệp cập nhật |
|---|---|---|---|
| **BUG-8F2-01** | **Cassie (`exp1_cassie`) trong bàn 5 người (`5P`)** | Bàn 5P có phân bổ chuẩn `{ lanternGuard: 2, mistOrder: 2, wanderer: 1 }` (`roles.ts:361`) — chỉ có **duy nhất 1 ghế Neutral**. Cassie sở hữu cơ chế `COPY_GOAL` gắn vào *Neutral khác đầu tiên lộ diện trong gameplay bình thường* (`expansion-skills.ts:10070`) và không có điều kiện thắng dự phòng (`victory-engine.ts:235`). Khi chia trúng ở bàn 5P, liên kết mục tiêu của Cassie mãi mãi ở trạng thái `unresolved: true` (`won: false`), khiến điều kiện thắng **bất khả thi về mặt cấu trúc (0%)**. | Khai báo tập hằng chính tắc `FIVE_PLAYER_EXCLUDED_NEUTRAL_ROLE_IDS = new Set(['exp2_nc_soldier', 'exp1_cassie'])` cùng hàm thuần `filterEligibleWandererPoolForPlayerCount` tại `features/boardgame/domain/roles.ts`, áp dụng thống nhất tại `features/boardgame/domain/state-machine.ts` cho mọi ruleset mở rộng ở bàn 5P (`expansion-1`, `expansion-2`, `full-expansion` và các pool `starter-*`), giữ nguyên Cassie ở bàn hợp lệ `6P–8P`, bảo toàn 100% PRNG `classic` và tương thích ngược an toàn với mọi trận đã lưu trong SQLite DO (không cần migration phá hủy trạng thái). Đồng bộ ma trận cặp vai `scripts/phase8e-interaction-matrix.cjs`, `scripts/sim-starter-fifty-six.cjs` và `scripts/smoke-production-beta.cjs`. |
| **CLARITY-8F2-02** | **Gwendolen (`exp1_gwendolen` — Sự Che Chở)** | Mô tả cũ (*"Bạn có thể tấn công lại cho những Hunter hoặc Neutral đã bị tấn công trong khu vực đó."*) mơ hồ về: (1) phạm vi 1 ô hay Cụm 2 địa điểm, (2) đồng minh được bảo vệ có cần khác Gwendolen và đã lộ diện hay không, (3) điều kiện tầm đánh hợp lệ tới kẻ tấn công gốc, (4) sát thương gốc có bị chặn không, và (5) việc không sinh chuỗi phản công vô hạn. | Cập nhật nguyên văn mô tả chuẩn hóa trên `features/boardgame/domain/expansion-catalog.ts`, `docs/boardgame-expansion/character-catalog.json`, `features/boardgame/ui/BoardGameArt.tsx` và hộp thoại lựa chọn `GWENDOLEN_COUNTER` trong `features/boardgame/domain/expansion-skills.ts`; bổ sung thêm chốt bảo vệ `!gwen.revealed` ở bước giải quyết `gwendolen_counter_attack` (`expansion-skills.ts:11977`). |
| **CONSISTENCY-8F2-03** | **Bryon (`exp2_bryon` — Sự Phục Vụ Hào Phóng)** | Tại `expansion-skills.ts`, nhánh kiểm tra `USE_SKILL` (`7546`) dùng `getEffectiveFaction(state, p) === 'wanderer'`, trong khi `canTrigger` (`2383`) và bước nhận đồ `bryon_gift_equipment` (`11810`) kiểm tra `p.faction === 'wanderer'` tĩnh (lệch nếu Bonnie `exp2_bonnie` đã chuyển phe động sang Shadow `mist-order`). | Đồng bộ cả 3 điểm kiểm tra của Bryon sang `getEffectiveFaction(..., p) === 'wanderer'` tại `features/boardgame/domain/expansion-skills.ts`. |

---

## 2. Danh Sách Nhân Vật Giới Hạn Theo Số Người Chơi (Characters Restricted by Player Count)

Phân bổ ghế theo số người chơi (`getRoleDistribution(playerCount)`):
- **4P:** `2 Hunter · 2 Shadow · 0 Neutral` → Toàn bộ **25/25 Neutral** không được chia ở bàn 4P do `wanderer = 0`.
- **5P:** `2 Hunter · 2 Shadow · 1 Neutral` → Loại trừ chính xác **2 nhân vật Neutral** có điều kiện thắng phụ thuộc cấu trúc bắt buộc vào Neutral khác mà không có fallback:
  1. **`exp1_cassie` (Cassie — Expansion 1):** Yêu cầu sao chép điều kiện thắng của Neutral khác đầu tiên lộ diện; không có fallback. **Cấm chia ở 5P; mở bình thường ở 6P–8P (`expansion-1`, `full-expansion`).**
  2. **`exp2_nc_soldier` (N.C. Soldier — Expansion 2):** Yêu cầu chiêu mộ toàn bộ các Neutral ban đầu khác (`otherOriginalNeutrals.length >= 1`); trả về `false` nếu rỗng. **Cấm chia ở 5P; mở bình thường ở 6P–8P (`expansion-2`, `full-expansion`).**
- **6P (`2H · 2S · 2N`), 7P (`2H · 2S · 3N`), 8P (`3H · 3S · 2N`):** Toàn bộ **66/66 nhân vật** (bao gồm cả `exp1_cassie` và `exp2_nc_soldier`) đều hợp lệ trong bộ luật tương ứng.

---

## 3. Kiểm Chứng Kỹ Năng Gwendolen (`exp1_gwendolen` — Sự Che Chở)

Mô tả chuẩn hóa đồng bộ trên mọi bề mặt dữ liệu & UI:
> *"Khi một Hunter hoặc Neutral khác đã lộ diện trong cùng cụm địa điểm với bạn bị tấn công, bạn có thể phản công người tấn công đó nếu mục tiêu nằm trong tầm đánh hợp lệ. Phản công không ngăn sát thương của đòn đánh gốc và không tạo chuỗi phản công vô hạn."*

Đối chiếu thực thi engine (`features/boardgame/domain/expansion-skills.ts`) và kiểm thử hồi quy tất định (`test/boardgame-phase8f2-playability.test.cjs` — `8F2-2`):

1. **Gwendolen phải còn sống và đã lộ diện:** Kiểm tra tại `gwendolenShelterHandler` (`requiresRevealed: true`, `requiresAlive: true`), `POST_ATTACK_EFFECTS` (`gwen.alive && gwen.revealed`), `GWENDOLEN_COUNTER`, và `gwendolen_counter_attack`. Khi Gwendolen đang ẩn vai hoặc đã chết, không mở lựa chọn phản công.
2. **Nhân vật được bảo vệ phải là Hunter/Neutral khác đã lộ diện trong cùng cụm địa điểm:** Hệ thống chụp trạng thái nạn nhân trước đòn đánh (`preRevealed: v.revealed`, `faction: getEffectiveFaction(state, v)`, `location: v.location`) và kiểm tra `v.playerId !== gwen.playerId`, `v.preRevealed === true`, `(v.faction === 'lantern-guard' || v.faction === 'wanderer')`, `areInSameCluster(gwen.location, v.location, ...)`. Không kích hoạt khi tự đánh Gwendolen, khi nạn nhân chưa lộ diện trước đòn đánh (kể cả lật xác khi chết), khi nạn nhân là Shadow (kể cả Bonnie đã hóa Shadow), hoặc khác cụm.
3. **Người tấn công gốc phải còn là mục tiêu tấn công hợp lệ:** Kiểm tra `origAttacker.alive && canExpandedPlayerAttackTarget(state, gwen, origAttacker)` ở cả 3 chặng (trigger, mở prompt, giải quyết lựa chọn), tôn trọng đầy đủ tầm đánh theo Cụm, Súng Ngắn (`ev-05`), Udi ẩn thân (`exp1_udi`), Áo Choàng Thánh / Bùa Hộ Mệnh / ràng buộc vợ chồng Aaron.
4. **Phản công là tùy chọn, hết giờ mặc định Bỏ qua (`Skip`), không ngăn sát thương gốc:** Bước `DAMAGE` của đòn đánh gốc chạy hoàn tất trước `POST_ATTACK_EFFECTS`; `PendingChoice` có `options: ['counter', 'skip']`, `defaultOptionId: 'skip'`, và khi `options.isTimeoutFallback === true` hệ thống tự động bỏ qua với `0` sát thương phản công.
5. **Không tạo chuỗi phản công vô hạn:** Đòn phản công gắn `isRetaliatoryAttack: true`, tăng `chainDepth`, không đẩy tiếp `POST_ATTACK_EFFECTS`, đồng thời chặn kích hoạt phản đòn của Werewolf (`suong-gac-cong`) và chặn vòng lặp ping-pong kể cả khi trên bàn có nhân vật thứ hai sao chép kỹ năng Gwendolen (`exp1_antimony` / `exp1_vengeful_spirit`).

---

## 4. Kết Quả Rà Soát Khả Năng Chơi Của Toàn Bộ 25 Neutral (4P–8P)

Tuân thủ nguyên tắc phân biệt rõ **điều kiện thắng bất khả thi về cấu trúc** với **kỹ năng mang tính tình huống / tùy chọn**:

### 4.1. Nhóm 8 Nhân vật Neutral Ưu tiên

| Nhân vật | 4P (`0N`) | 5P (`1N`) | 6P–8P (`2–3N`) | Kết luận kiểm toán |
|---|---|---|---|---|
| **Cassie (`exp1_cassie`)** | Không chia | **Bất khả thi** (0 Neutral khác, 0 fallback) → **Đã loại khỏi pool 5P** | Khả thi (`1–2` Neutral khác có thể lộ diện để gắn `COPY_GOAL`) | **Đã sửa triệt để ở 5P**, giữ nguyên 6P–8P. |
| **N.C. Soldier (`exp2_nc_soldier`)** | Không chia | **Bất khả thi** (`otherOriginalNeutrals = 0`) → **Đã loại khỏi pool 5P** | Khả thi (`1–2` Neutral gốc để Chiêu Mộ + đủ 3 vũ khí trong chồng Đen) | Giữ nguyên & hợp nhất chuẩn loại trừ 5P cùng Cassie. |
| **Cindy (`exp1_cindy`)** | Không chia | **Khả thi & an toàn:** Nhánh solo tức thì chặn `if (otherNeutrals.length === 0) return false` (`victory-engine.ts:751` — không tự thắng ngay lúc chia vai); nhánh `end-of-match` cho phép Cindy đồng thắng nếu còn sống khi hết trận (`453–455`). Kỹ năng phản 1 ST hoạt động với mọi kẻ đánh. | Khả thi (thắng ngay hoặc đồng thắng cuối trận khi mọi Neutral khác bị loại vĩnh viễn và Cindy còn sống). | **Hợp lệ ở 5P–8P** (không cần loại khỏi 5P). |
| **Clairvoyant (`exp1_clairvoyant`)** | Không chia | **Khả thi:** Đầu lượt có 4 người chơi khác chưa lộ diện để soi và sao chép mục tiêu; nhờ đã loại Cassie & N.C. Soldier khỏi 5P, mọi mục tiêu bị soi ở 5P đều có điều kiện thắng khả thi. Trước khi soi, `unresolved: true` (`won: false`). | Khả thi (`5–7` mục tiêu chưa lộ diện lúc đầu trận). | **Hợp lệ ở 5P–8P.** |
| **Diana (`exp2_diana`)** | Không chia | **Khả thi nhờ Fallback thiết kế sẵn:** Kỹ năng Hợp đồng Khách hàng không có Neutral khác để kích hoạt ở 5P (kỹ năng tình huống), nhưng Diana có điều kiện thắng dự phòng chính thức `diana_full_hp_survivor` (`alive && woundsTaken === 0` ở `end-of-match`, `victory-engine.ts:272–289`), không tự thắng đầu trận và hoàn toàn đạt được cùng các thẻ Trắng hồi máu. | Khả thi (thắng cùng Khách hàng Neutral đang `active`, hoặc fallback sống đầy máu cuối trận nếu hợp đồng chưa kích hoạt). | **Hợp lệ ở 5P–8P** (đúng nguyên tắc không loại nhân vật chỉ vì kỹ năng không kích hoạt ở một cấu hình khi điều kiện thắng vẫn khả thi). |
| **Bethany (`exp1_bethany`)** | Không chia | **Khả thi:** Trao 1 trang bị (trừ Masamune) cho bất kỳ ai trong 4 người chơi khác (hoặc nhận trang bị từ họ) để chỉ định Người được chọn và thắng cùng họ (kể cả khi Bethany tử trận). | Khả thi (`5–7` người chơi khác, 18 trang bị vĩnh viễn hợp lệ trong chồng Trắng/Đen). | **Hợp lệ ở 5P–8P.** |
| **Bryon (`exp2_bryon`)** | Không chia | **Khả thi & an toàn:** Điều kiện thắng kiểm tra ở `timing === 'end-of-match'` (`subject.alive && allWanderers.every(...)`, `victory-engine.ts:471–475`) — không tự thắng lúc chia bài, và đồng thắng cuối trận nếu Bryon sống sót. Kỹ năng tặng trang bị cho Neutral khác là tùy chọn/tình huống. | Khả thi (sống sót cùng toàn bộ các Neutral hiệu lực khi kết thúc trận; kỹ năng tặng đồ hỗ trợ đồng minh Neutral). | **Hợp lệ ở 5P–8P** (đã đồng bộ `getEffectiveFaction` cho kỹ năng tặng đồ). |
| **Antimony (`exp1_antimony`)** | Không chia | **Khả thi:** Ở bàn 5P (`2H + 2S + 1N`), cái chết vĩnh viễn đầu tiên của 1 Hunter hoặc 1 Shadow vẫn còn lại `1H + 1S` nên trận đấu tiếp diễn; Antimony tự động lộ diện và sao chép cả kỹ năng lẫn mục tiêu thắng của người vừa chết (`expansion-skills.ts:9854–9922`). | Khả thi (`5–7` người chơi khác). | **Hợp lệ ở 5P–8P.** |

### 4.2. Nhóm 17 Nhân vật Neutral Còn Lại (Classic + Expansion 1 & 2)

- **Classic (4):**
  - `lang-anh-san` (**Bob** — sở hữu `>= 5` trang bị trên tổng 19 trang bị vĩnh viễn): Khả thi 5P–8P.
  - `lang-quan-sat` (**Allie** — còn sống khi hết trận): Khả thi 5P–8P.
  - `lang-cuu-ho` (**Charles** — đòn đánh thường kết liễu khi `deadCountNow >= 3`, tính cả nạn nhân vừa hạ gục): Ở 5P, sau khi 1H + 1S đã chết (`deadCount = 2`), Charles kết liễu H hoặc S cuối cùng sẽ đạt `deadCountNow = 3` và đồng thắng hợp lệ. Khả thi 5P–8P.
  - `lang-tien-phong` (**Daniel** — người chết đầu tiên hoặc còn sống khi Hunter thắng): Khả thi 5P–8P.
- **Expansion 1 & 2 còn lại (13):**
  - `exp1_bipolar` (sống khi Hunter thắng / chết khi Shadow thắng), `exp1_anathema` (còn sống cuối trận), `exp1_arnold` (còn sống cuối trận với `> 2` người sống — ở 5P khi 2 Shadow bị loại còn `2H + Arnold = 3 > 2`), `exp1_angel` (`end-of-match`: toàn bộ Neutral còn sống hoặc đứng tại Church — không tự thắng đầu trận), `exp2_cain` (có nhánh riêng cho 5P tại `victory-engine.ts:183–186`: tự tay hạ `>= 1` Hunter và `>= 1` Shadow là thắng solo ngay khi vẫn còn `1H + 1S`; 6P–8P cần `>= 1` xác mỗi phe H/S/N), `exp2_bonnie` (hạ 1 Shadow để hóa Shadow — ở 5P hạ 1 trong 2 Shadow vẫn còn 1 Shadow gốc + Bonnie đối đầu 2 Hunter), `exp2_dalton` (hạ người sau Vòng 12 hoặc cao HP nhất cuối trận), `exp2_april_skipps` (ẩn & sống cuối trận hoặc sống qua hết lượt kế sau mốc 7 vết thương), `exp2_bianca` (thấp HP nhất còn sống cuối trận), `exp2_colt` (`>= 3` vũ khí trong bộ 4 vũ khí chồng Đen), `exp2_cruz` (kết liễu cùng lượt dùng thẻ sát thương chồng Đen), `exp2_aaron` (cùng sống với nhân vật nữ lộ diện đầu tiên hoặc fallback chết trước khi hết trận kể cả khi bàn không có nhân vật nữ), `exp2_arlene` (bị hạ gục bởi Hunter).
  - **Kết luận:** Toàn bộ **23/23 Neutral hợp lệ ở 5P** và **25/25 Neutral ở 6P–8P** đều có điều kiện thắng khả thi, không có nhân vật nào tự thắng ngoài ý muốn do tập mục tiêu rỗng, và không còn trường hợp bất khả thắng về mặt cấu trúc.

---

## 5. Kết Quả Kiểm Thử Hồi Quy & CI (Regression & CI Results)

- **Bộ test chuyên biệt mới:** `test/boardgame-phase8f2-playability.test.cjs` (`8F2-1`..`8F2-4`):
  - `8F2-1`: Kiểm chứng tất định 750 ván 5P (`expansion-1`, `expansion-2`, `full-expansion` × 250 seeds) + 240 ván `starter-*` không bao giờ chia `exp1_cassie` hoặc `exp2_nc_soldier`; 1.320 ván 6P–8P xác nhận Cassie vẫn được chia bình thường; kiểm tra tương thích trận 5P lưu cũ và bất biến PRNG `classic` 4P–8P.
  - `8F2-2`: Kiểm chứng nguyên văn mô tả Gwendolen trên 4 nguồn (`roles.ts`, `expansion-catalog.ts`, `character-catalog.json`, `BoardGameArt.tsx`) và đầy đủ 5 bất biến hành vi (ẩn/chết, tự đánh/chưa lộ/Bonnie hóa Shadow/khác cụm, ngoài tầm/Udi ẩn thân, sát thương gốc + Skip + Timeout mặc định Skip, chống vòng lặp với Werewolf & nhân bản Gwendolen).
  - `8F2-3`: Kiểm toán toàn bộ 25 Neutral từ 4P–8P (0 auto-win lúc chia bài cho cả 23 Neutral 5P; kịch bản thắng tất định cho Cindy, Clairvoyant, Diana 5P fallback & 6P customer, Bethany, Bryon, Antimony, Cain 5P, Charles 5P, Arnold 5P, Cassie 6P–8P).
  - `8F2-4`: Kiểm thử E2E trên `BoardGameRoom` SQLite Durable Object thật cho bàn 5P Production Beta ở cả 3 chế độ `expansion-1`, `expansion-2`, `full-expansion` kèm reconnect.
- **Toàn bộ cổng kiểm định Local & CI:**
  - `npm run typecheck` (Frontend + Shared + Worker): **PASS** (`exit code 0`)
  - `node scripts/validate-character-catalog.cjs`: **PASS** (66/66 nhân vật đồng bộ 1-1)
  - `npm run test:boardgame` (bao gồm `boardgame-sim.cjs` Classic RNG fingerprints & `victory.ts` 0-diff): **PASS**
  - `npm run test:stability:fast` & `node scripts/phase8e-interaction-matrix.cjs` & `node scripts/smoke-production-beta.cjs`: **PASS**
  - `npm run test:boardgame:e2e`: **PASS**
  - 6 cổng bắt buộc HUSTVerse (`typecheck`, `test:learn` 45/45, `test:contracts` 5/5, `test:nav` 4/4, `test:mp` 12/12, `build`) + `test:ui`, `test:world`, `test:avatar`, `test:study` + Worker `--dry-check`: **PASS**

---

## 6. Xác Minh Triển Khai Production (Production Deployment Verification)

- **GitHub Actions CI/CD (`CI Verification Gates` trên nhánh `main`):** Toàn bộ 8 jobs (`Gate 1`..`Gate 6`, `Board Game Expansion Stability`, `Deploy Cloudflare Worker (hust-hsk-rooms)`) xanh 100%.
- **Production Endpoints:**
  - Frontend Vercel (`https://hustverse.vercel.app/`): HTTP `200`, hiển thị chính xác mô tả mới của Gwendolen (`Sự Che Chở`) và cấu hình Production Beta (`classic` ổn định mặc định; `expansion-1`, `expansion-2`, `full-expansion` Beta).
  - Cloudflare Worker (`https://hust-hsk-rooms.hunganhz179.workers.dev/api/boardgame/rulesets`): HTTP `200`, `productionBetaEnabled: true`, xác minh luồng phòng 5 người chơi Production Beta chia vai hợp lệ (không xuất hiện `exp1_cassie` và `exp2_nc_soldier` ở 5P) và dọn dẹp kết nối sạch sẽ sau khi kiểm tra.
