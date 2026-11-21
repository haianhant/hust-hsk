# Bóng Đêm KTX — Phase 7A Engine Foundations Report

> **Milestone:** Phase 7A — Advanced Engine Foundations & Rules Ratification  
> **Trạng thái:** **HOÀN TẤT 100%** (trước khi mở khóa 8 nhân vật Tier-4 ở Phase 7B)  
> **Baseline HEAD:** `e3dfeacfa93df604b69d0c7fc0bca5a4c98fc23f`

---

## 1. Hạng mục Đã Hoàn thành

1. **Hiệu đính Dữ liệu HP Bắt buộc (Mandatory Data Correction):**
   - Sửa 5 giá trị HP sai lệch trong [`docs/boardgame-expansion/phase-6/phase-6-handoff.md`](../phase-6/phase-6-handoff.md) theo nguồn chính tắc [`character-catalog.json`](../character-catalog.json): `Vengeful Spirit (10→13)`, `Voodoo (11→13)`, `Antimony (12→8)`, `Cain (13→11)`, `N.C. Soldier (12→13)`.
   - Gắn bài kiểm tra hồi quy tự động `7A.1` trong [`test/boardgame-phase7a.test.cjs`](../../../test/boardgame-phase7a.test.cjs) đối chiếu HP, phe gốc và ID giữa JSON catalog, `expansion-catalog.ts`, `phase-6-handoff.md`, `phase-7-scope.md` và `rules-decisions.md`.
2. **Phê chuẩn Luật Thử nghiệm 8 Nhân vật Tier-4:**
   - Hoàn thiện [`rules-decisions.md`](./rules-decisions.md) phân tách rõ `SOURCE_RULE`, `SOURCE_AMBIGUITY`, `APPROVED_EXPERIMENTAL_HOUSE_RULE`, `ENGINE_DECISION`, `OPEN_QUESTION`, `TEST_REQUIREMENT`; toàn bộ gắn nhãn `house-rule-approved` (tuyệt đối không mạo nhận `verified`).
3. **6 Nền tảng Engine Tác quyền Server (Server-Authoritative Primitives):**
   - [`turn-ownership.ts`](../../../features/boardgame/domain/turn-ownership.ts) — `TurnOwnershipOverride` (5 định danh tách biệt, phân quyền công khai/cấm, tạm dừng cho thẻ Điều tra bí mật, hết hạn chống phát lại, tích hợp `actions.ts`, `projections.ts` & đồng hồ rớt mạng `worker/src/boardgame-room.ts`).
   - [`pending-resurrection.ts`](../../../features/boardgame/domain/pending-resurrection.ts) — `PendingResurrection` (`ALIVE → DORMANT_PENDING_REVIVE → REVIVED (6 HP) → FINAL_ELIMINATED`, `ELIMINATION_TRANSACTION_STAGES` 10 bước, miễn thắng sớm Hunter, bảo toàn trang bị & lượt kế).
   - [`dynamic-skill-copy.ts`](../../../features/boardgame/domain/dynamic-skill-copy.ts) — `DynamicSkillCopy` (`SKILL_COPY_CAPABILITY_MATRIX` phủ đủ `66/66` nhân vật: `45 FULL_DIRECT · 6 SPECIAL_LIFECYCLE · 13 ADAPTED_FUTURE_ONLY · 2 SELF_REFERENTIAL_NO_LOOP`, trạng thái lượt dùng mới độc lập, `MAX_SKILL_COPY_DEPTH = 3`, chống chu trình, tích hợp `SkillEngine.dispatch()`).
   - [`dynamic-allegiance.ts`](../../../features/boardgame/domain/dynamic-allegiance.ts) — `DynamicAllegiance` & `AllianceGroupRecord` (tách `baseFaction`, `effectiveFaction` bất khả nghịch cho Bonnie, liên minh Neutral độc lập cho N.C. Soldier, loại trừ `exp2_nc_soldier` bàn 5P trong `state-machine.ts`).
   - [`victory-engine.ts`](../../../features/boardgame/domain/victory-engine.ts) + [`copied-victory-graph.ts`](../../../features/boardgame/domain/copied-victory-graph.ts) — `MultiFactionVictory` (`winnerFaction: 'multi-faction'`, `winningFactions?: readonly BoardGameFactionId[]`), Cain song phe & 5P/6P–8P, Antimony `COPY_GOAL`, gộp đồng thời các điều kiện thắng trong 1 lô sự kiện.
   - [`global-attack-interrupt.ts`](../../../features/boardgame/domain/global-attack-interrupt.ts) — `GlobalAttackInterrupt` (snapshot toàn bàn trước khi đổ xúc xắc, hủy Machine Gun như 1 hành động, 0 RNG tiêu hao khi hủy, xếp hàng xác định chỉ ứng viên đã lộ diện).

---

## 2. Kết quả Cổng Kiểm thử Thực tế (Phase 7A)

| Lệnh kiểm thử | Kết quả | Chi tiết |
|---|---|---|
| `npm run typecheck` | **PASS** (exit 0) | 0 lỗi TypeScript trên Frontend, Shared Contracts & Cloudflare Worker |
| `node scripts/validate-character-catalog.cjs` | **PASS** (exit 0) | 56 Expansion + 10 Classic = 66; Production Classic-only |
| `test/boardgame-*.test.cjs` (gồm `test/boardgame-phase7a.test.cjs`) | **171 / 171 PASS** | Gồm **8/8** kiểm thử kiến trúc & bảo mật Phase 7A (`7A.1`–`7A.8`) |
| `node test/boardgame-sim.cjs` | **PASS (4.500 / 4.500 trận)** | `0` treo ván, `0` vi phạm privacy, Classic Guard `39.73%` / Mist `45.56%` / Wanderer `14.71%` (`0.00%` sai lệch) |
| `npm run test:contracts` | **12 / 12 PASS** | Đầy đủ hợp đồng dùng chung & Durable Object |
| `git diff -- features/boardgame/domain/victory.ts` | **0 dòng thay đổi** | Bảo toàn nguyên vẹn đường chạy Classic gốc |

---

## 3. Rủi ro Mở & Việc Kế tiếp (Phase 7B)

- **Rủi ro mở cần theo dõi sang 7B/7D:** Tích hợp 8 bộ xử lý kỹ năng Tier-4 vào đường ống `expansion-skills.ts` cần bảo đảm tuyệt đối không sinh trùng lặp sự kiện trên chuỗi phản ứng (`Lloyd` hy sinh HP cuối cùng, `Undead` ngủ đông trước bước 5, `Bonnie` chuyển phe trước bước 9, `Vengeful Spirit` secret `choice-secret-*`, `Voodoo` chặn đọc vai ẩn qua WebSocket thật).
- **Nhiệm vụ kế tiếp (Milestone 7B):** Triển khai đầy đủ 8 nhân vật Tier-4, thêm các `PendingChoice` mới, tạo bộ luật thử nghiệm `starter-fifty-six` (`66` nhân vật, khóa cứng trên Production), bổ sung chỉ báo UI/VFX và kiểm thử đầy đủ 8 nhân vật.
