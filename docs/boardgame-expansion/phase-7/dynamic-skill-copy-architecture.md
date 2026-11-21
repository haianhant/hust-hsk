# Kiến trúc `DynamicSkillCopy` & Ma trận Năng lực Sao chép 66/66 Nhân vật (Phase 7A)

> **Module Chính:** [`features/boardgame/domain/dynamic-skill-copy.ts`](../../../features/boardgame/domain/dynamic-skill-copy.ts)  
> **Tích hợp Engine:** [`skill-engine.ts`](../../../features/boardgame/domain/skill-engine.ts), [`actions.ts`](../../../features/boardgame/domain/actions.ts), [`projections.ts`](../../../features/boardgame/domain/projections.ts)  
> **Nguyên tắc phân tách:** Chỉ quản lý **kỹ năng hiệu lực** (`effectiveSkillRoleId`). Toàn bộ điều kiện thắng sao chép (`Antimony`, `Cassie`, `Clairvoyant`) ủy quyền 100% sang [`copied-victory-graph.ts`](../../../features/boardgame/domain/copied-victory-graph.ts) — tuyệt đối không nhân bản logic đồ thị thắng!

---

## 1. Mô hình `CopiedSkillBinding` & Chống Đệ quy Vô hạn

Mỗi người chơi có tối đa 1 bản ghi `CopiedSkillBinding` tại `state.expansionState.copiedSkillsByPlayer[playerId]`:

- `baseRoleId`: vai diễn gốc bất biến của người sở hữu (`exp1_vengeful_spirit`, `exp1_antimony`, hoặc vai Neutral được N.C. Soldier chiêu mộ).
- `effectiveSkillRoleId`: mã kỹ năng thực sự đang thực thi (phân giải thẳng tới kỹ năng cuối nếu sao chép một người đã sao chép trước đó).
- `sourcePlayerId` & `sourceOriginalRoleId`: nguồn sao chép để truy vết kiểm toán.
- `copyEventId`, `copiedAtMs`, `copiedAtTurnNumber`: khóa chống phát lại (idempotent).
- `copyDepth` & `provenanceChain`: giới hạn cứng **`MAX_SKILL_COPY_DEPTH = 3`** và kiểm tra chống chu trình (`victimBinding.sourcePlayerId === copier.playerId` → chặn an toàn).
- `skillUsedOnce`, `skillCooldown`, `resurrectionChargesUsed`: **trạng thái sử dụng MỚI và ĐỘC LẬP** của riêng bản sao, tách rời hoàn toàn khỏi nạn nhân đã chết lẫn cờ `skillUsedOnce` gốc của Vengeful Spirit / Antimony.

### 5 Bất biến Bắt buộc
1. **Không tự động đổi phe:** Sao chép kỹ năng của Hunter/Shadow không thay đổi `baseFaction` hay `effectiveFaction` (trừ khi về sau chính bản sao kích hoạt hiệu ứng đổi phe như Bonnie).
2. **Không kế thừa thông tin bí mật:** Không bao giờ sao chép `privateClues`, `hand`, `clairvoyantVisions` hay `reconnectToken` của nạn nhân.
3. **Không hồi tố sự kiện quá khứ:** Kỹ năng phụ thuộc sự kiện đã xảy ra (`Umibozu`, `Daniel`, `April & Skipps`, `Dalton`, `Unknown`, `Arlene`) chỉ áp dụng cho sự kiện **tương lai**.
4. **Cô lập lượt dùng `once-per-match`:** Dù nạn nhân đã dùng kỹ năng 1 lần trước khi chết, bản sao luôn nhận `skillUsedOnce = false` mới (trừ trường hợp mục tiêu là bản sao tự tham chiếu chưa kích hoạt `exp1_antimony`/`exp1_vengeful_spirit` được khóa `skillUsedOnce = true` để chặn vòng lặp tự sao chép).
5. **Tích hợp `SkillEngine`:** `SkillEngine.dispatch()` đọc trực tiếp `getEffectiveSkillRoleId`, `hasEffectiveSkillUsedOnce`, `markEffectiveSkillUsedOnce` và `getEffectiveSkillCooldown`.

---

## 2. Ma trận Năng lực Sao chép (`SKILL_COPY_CAPABILITY_MATRIX` — 66 / 66 Nhân vật)

Toàn bộ **66/66 nhân vật** (10 Classic + 26 Expansion 1 + 30 Expansion 2) được đăng ký tường minh trong `SKILL_COPY_CAPABILITY_MATRIX` (được kiểm tra tự động bằng unit test trong [`boardgame-phase7a.test.cjs`](../../../test/boardgame-phase7a.test.cjs)):

| Nhóm Phân loại (`copyStatus`) | Số lượng | Danh sách Đại diện & Ngữ nghĩa Sao chép Chính xác |
|---|---:|---|
| **`FULL_DIRECT`** | 45 | Toàn bộ kỹ năng chủ động / tấn công / phòng thủ / rút bài / di chuyển (`Franklin`, `George`, `Emi`, `Vampire`, `Werewolf`, `Bob`, `Allie`, `Charles`, `G43`, `Fiona`, `Wendigo`, `Wyvern`, `Gayle`, `Felicia`, `Victor`, `Undying`, `Elysia`, `Unchained`, `Warlock`, `Witch`, `Father Harrison`, `Gloria`, `Cindy`, `Bipolar`, `Fea`, `Eleanor`, `Fujiko`, `Udi`, `Wrath`, `Vengeance`, `Visions`, `Cruz`, `Bryon`, `Elise`, `Ernest`, `Gwendolen`, `Freyja`, `Warlord`, `Usurper`, `Angel`, `Bianca`, `Gideon`, `Anathema`, `Colt`). Thực thi trực tiếp trên trạng thái của người sao chép với bộ đếm lượt dùng mới. |
| **`SPECIAL_LIFECYCLE`** | 6 | **`exp1_lloyd`**: trở thành ứng viên `GlobalAttackInterrupt` hợp lệ, xếp hàng xác định.<br>**`exp1_voodoo`**: nhận 1 lượt chiếm quyền mới vào đầu lượt sau, tuân thủ đầy đủ `TurnOwnershipOverride`.<br>**`exp1_undead`**: nhận đúng 1 lượt `PendingResurrection` mới (hồi sinh `min(maxHp, 6)` HP ở đầu lượt sau dù đã lộ diện).<br>**`exp2_cain`**: nhận 1 lượt hồi máu theo số người sống & gắn điều kiện thắng song phe khi CHÍNH người sao chép chết.<br>**`exp2_bonnie`**: kết liễu Shadow trong tương lai sẽ chuyển `effectiveFaction` sang Shadow (nếu chưa là Shadow).<br>**`exp2_nc_soldier`**: nhận kỹ năng Chiêu Mộ lên Neutral đã lộ diện; đồng minh được chiêu mộ cũng dùng `bindingKind: 'alliance-recruitment'`. |
| **`ADAPTED_FUTURE_ONLY`** | 13 | `Unknown` (`suong-tin-gia`), `Daniel` (`lang-tien-phong`), `exp1_fallen`, `exp2_umibozu`, `exp2_arlene`, `exp1_cassie`, `exp1_clairvoyant`, `exp2_april_skipps`, `exp2_dalton`, `exp1_bethany`, `exp1_arnold`, `exp2_diana`, `exp2_aaron`. **Không hồi tố quá khứ**, không kế thừa mục tiêu/khách hàng/vợ/tầm nhìn bí mật của chủ cũ; áp dụng sạch cho các sự kiện từ thời điểm sao chép trở đi. |
| **`SELF_REFERENTIAL_NO_LOOP`** | 2 | **`exp1_antimony`**, **`exp1_vengeful_spirit`**: Nếu nạn nhân đã sao chép kỹ năng `X`, bản sao kế thừa thẳng `X` (`copyDepth + 1 ≤ 3`). Nếu nạn nhân chết trước khi kịp sao chép, khóa `skillUsedOnce = true` để tuyệt đối không gây vòng lặp tự sao chép vô hạn. |

> **Cam kết Trung thực:** Không có vai trò nào bị "âm thầm biến thành no-op"; mọi trường hợp đặc biệt đều có hợp đồng hành vi tường minh và được kiểm thử tự động.
