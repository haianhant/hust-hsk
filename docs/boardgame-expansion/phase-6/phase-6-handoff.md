# Bóng Đêm KTX — Phase 6 Final Handoff & Phase 7 Readiness

> **Trạng thái Hoàn thành:** **Phase 6 (`Wave 5 / starter-forty-eight` — Tier-3 Completion & Advanced Victory Mechanics) HOÀN TẤT 100%** qua 5 milestone tuần tự độc lập (`6A` → `6B` → `6C` → `6D` → `6E`).  
> **Quy mô Hiện tại:** **58 / 66 nhân vật chơi được** (`10 Classic + 48/56 Expansion`: `19 Hunter · 18 Shadow · 21 Neutral`), **58 / 58 chân dung Full-Art 2:3 WebP** (tổng **105 WebP assets** Midnight Noir), **31 loại Pending Choice**, và **0.00% hồi quy Classic**.  
> **An toàn Production:** Production giữ nguyên **`classic`-only**; mọi ruleset mở rộng (`starter-eight`, `starter-sixteen`, `starter-twenty-six`, `starter-thirty-eight`, `starter-forty-eight`) bị chặn cứng bằng `HTTP 400 / RULESET_UNAVAILABLE` nếu không đặt `ALLOW_EXPERIMENTAL_RULESETS=1`.

---

## 1. Kiến trúc & 10 Nhân vật Mới Đã Bàn giao (Phase 6A–6E)

1. **Hạ tầng Engine Chung (Phase 6A):**
   - [`character-metadata.ts`](../../../features/boardgame/domain/character-metadata.ts) — `CAP-10`: bảng metadata vai diễn bất biến cho đủ `66/66` nhân vật (tách biệt 100% khỏi avatar người chơi).
   - [`copied-victory-graph.ts`](../../../features/boardgame/domain/copied-victory-graph.ts) — `CAP-07`: bộ đánh giá thuần túy phân tách `COPY_GOAL` vs `SHARE_OUTCOME` vs `CONDITIONAL_SHARED`, bắc cầu đa tầng, memoization, phát hiện chu trình fail-closed.
   - [`damage-redirection.ts`](../../../features/boardgame/domain/damage-redirection.ts) — `CAP-06`: `MAX_REDIRECT_CHAIN_DEPTH = 4`, visited-target `redirectChain`, trace nhân quả nội bộ cho `Anathema` (Stage 0) & `Arnold` (Stage 4).
   - [`reveal-events.ts`](../../../features/boardgame/domain/reveal-events.ts) — chuẩn hóa chuỗi sự kiện lộ diện (`revealSeq`, `isNormalGameplayReveal()` loại trừ chết/cuối trận).
   - [`equipment-transactions.ts`](../../../features/boardgame/domain/equipment-transactions.ts) — giao dịch chuyển/cướp/thu hồi trang bị bảo toàn nguyên tử (chống nhân bản, cấm chuyển Masamune, idempotent).
   - **Privacy Hardening (Phase 6A + 6D):** Chuẩn hóa `publicDeadlineMs` trên secret pending choice ngay cả khi chủ sở hữu rớt mạng + thay toàn bộ 6 secret `choiceId` sang tiền tố mờ `choice-secret-*` chống rò tên vai ẩn.
2. **10 Nhân vật Tier-3 Hoàn thiện (Phase 6B + 6C):**
   - **Hunter (1):** `exp2_gideon` (`Gideon`, 14 HP).
   - **Neutral (9):** `exp1_anathema` (`Anathema`, 8 HP), `exp1_bethany` (`Bethany`, 10 HP), `exp1_arnold` (`Arnold`, 8 HP), `exp1_cassie` (`Cassie`, 11 HP), `exp1_clairvoyant` (`Clairvoyant`, 11 HP), `exp2_april_skipps` (`April & Skipps`, 8 HP), `exp2_colt` (`Colt`, 11 HP), `exp2_diana` (`Diana`, 13 HP), `exp2_aaron` (`Aaron`, 8 HP).
   - **Nghệ thuật & UI:** 10 chân dung `1024×1536` WebP (`64.0–130.6 KB`, **58/58 SHA-256 duy nhất**), Contact Sheet [`character-contact-sheet.webp`](./character-contact-sheet.webp), [`asset-manifest.json`](./asset-manifest.json), Prototype Section **5F** (`proto-section-wave5`), Playwright Desktop/Mobile Visual QA PASS.

---

## 2. Danh mục Đầy đủ 18 Tài liệu Bắt buộc (`docs/boardgame-expansion/phase-6/`)

1. [`phase-6-scope.md`](./phase-6-scope.md)
2. [`rules-decisions.md`](./rules-decisions.md)
3. [`copied-victory-architecture.md`](./copied-victory-architecture.md)
4. [`damage-redirection-architecture.md`](./damage-redirection-architecture.md)
5. [`role-reveal-event-spec.md`](./role-reveal-event-spec.md)
6. [`equipment-transaction-spec.md`](./equipment-transaction-spec.md)
7. [`phase-6a-engine-report.md`](./phase-6a-engine-report.md)
8. [`phase-6b-character-implementation.md`](./phase-6b-character-implementation.md)
9. [`character-art-prompts.md`](./character-art-prompts.md)
10. [`asset-manifest.json`](./asset-manifest.json)
11. [`character-contact-sheet.webp`](./character-contact-sheet.webp) (kèm `.png`)
12. [`phase-6c-art-report.md`](./phase-6c-art-report.md)
13. [`phase-6d-integration-report.md`](./phase-6d-integration-report.md)
14. [`phase-6e-simulation-report.md`](./phase-6e-simulation-report.md) (kèm dữ liệu thô [`starter-forty-eight-sim-data.json`](./starter-forty-eight-sim-data.json))
15. [`classic-regression-report.md`](./classic-regression-report.md)
16. [`privacy-security-report.md`](./privacy-security-report.md)
17. [`remaining-risks.md`](./remaining-risks.md)
18. [`phase-6-handoff.md`](./phase-6-handoff.md)

---

## 3. Sẵn sàng cho Phase 7 — 8 Nhân vật Tier-4 Cuối cùng (`58 → 66 / 66`)

Toàn bộ **8 nhân vật Tier-4** còn lại hiện vẫn bị khóa cứng (`rulesStatus: "needs-clarification"`, `implementationStatus: "not-started"`) và sẵn sàng làm mục tiêu của **Phase 7 (Final Wave)**:

| # | Role ID | Nhân vật | Gói | Phe | HP | Hạ tầng Cần thiết ở Phase 7A |
|---:|---|---|---|---|---:|---|
| 1 | `exp1_lloyd` | Lloyd | Exp 1 | Hunter | 12 | `GlobalAttackInterrupt` (can thiệp đòn tấn công toàn bàn ngoài cụm) |
| 2 | `exp1_vengeful_spirit` | Vengeful Spirit | Exp 1 | Shadow | 10 | `DynamicSkillCopy` / sao chép năng lực hậu tử vong |
| 3 | `exp1_voodoo` | Voodoo | Exp 1 | Shadow | 11 | `TurnOwnershipOverride` (chiếm quyền điều khiển lượt của người khác) |
| 4 | `exp1_undead` | Undead | Exp 1 | Shadow | 11 | `PendingResurrection` (hồi sinh sau khi bị loại không gây loại kép) |
| 5 | `exp1_antimony` | Antimony | Exp 1 | Neutral | 12 | `DynamicSkillCopy` + tích hợp `CopiedVictoryGraph` đã sẵn sàng từ Phase 6A |
| 6 | `exp2_cain` | Cain | Exp 2 | Neutral | 13 | `MultiFactionVictory` (liên kết thắng đa phe / điều kiện kết hợp) |
| 7 | `exp2_bonnie` | Bonnie | Exp 2 | Neutral | 10 | `DynamicAllegiance` (đổi phe động trong trận không phá bất biến phe) |
| 8 | `exp2_nc_soldier` | N.C. Soldier | Exp 2 | Neutral | 12 | `DynamicAllegiance` + kiểm soát mục tiêu biến thiên theo trạng thái bàn |

- **Lộ trình Mở rộng sau Phase 7:** Sau khi hoàn tất 8 tướng Tier-4 + 8 chân dung cuối (`66/66`), thực hiện Human Beta Playtest cho các điểm ưu tiên (`Anathema` `79.4%`, `Colt` `7.2%`, `Bethany` `56.4%`, `Dalton` `RC-15`, `G43 + Holy Robe`) rồi lần lượt xem xét mở `expansion-1` (26/26), `expansion-2` (30/30) và `full-expansion` (66/66).
