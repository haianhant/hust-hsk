# Bóng Đêm KTX — Phase 7 Final Handoff (66/66 Complete Character Catalog)

> **Trạng thái Hoàn thành:** **Phase 7 (`Wave 6 / starter-fifty-six` — Tier-4 Completion & 66-Character Catalog) HOÀN TẤT 100%** qua 5 milestone tuần tự độc lập (`7A` → `7B` → `7C` → `7D` → `7E`).  
> **Quy mô Đạt được:** **66 / 66 nhân vật chơi được** trong bộ luật thử nghiệm nội bộ (`10 Classic + 56/56 Expansion`: `20 Hunter · 21 Shadow · 25 Neutral`; `26/26 Expansion 1`, `30/30 Expansion 2`), **66 / 66 chân dung AI gốc `1024×1536` WebP** (**113 tài nguyên WebP Midnight Noir**), **34 loại Pending Choice**, và **0.00% hồi quy Classic**.  
> **An toàn Production:** Production giữ nguyên **`classic`-only** (`starter-fifty-six`, `expansion-1`, `expansion-2`, `full-expansion` đều khóa cứng `enabledInProduction: false`, trả về `HTTP 400 / RULESET_UNAVAILABLE`). **Human Beta Playtest (`>= 100` trận người thật) CHƯA THỰC HIỆN.**

---

## 1. Sổ cái Commit theo Milestone (Phase 7A–7E)

| Milestone | Commit SHA | Nội dung Bàn giao Chính |
|---|---|---|
| **Baseline trước Phase 7** | `e3dfeacfa93df604b69d0c7fc0bca5a4c98fc23f` | Hoàn tất Phase 6E (`58/66` nhân vật, `58/58` chân dung) |
| **Phase 7A — Architecture** | `2c7358454beef2a817b9b0f802f6a2ea7aef8d19` | Hiệu đính 5 HP sai ở `phase-6-handoff.md`; phê chuẩn `rules-decisions.md`; xây 6 nền tảng lõi (`TurnOwnershipOverride`, `PendingResurrection`, `DynamicSkillCopy` 66/66, `DynamicAllegiance`, `MultiFactionVictory`, `GlobalAttackInterrupt`); `test/boardgame-phase7a.test.cjs` (8/8 PASS) |
| **Phase 7B — Gameplay & UI** | `500e9870cf5808286cb25c2a06b72310c699c28a` | Triển khai đủ 8 nhân vật Tier-4, 3 PendingChoice mới (`34` tổng), ruleset `starter-fifty-six` (`66/66`), loại `exp2_nc_soldier` bàn 5P, `validatePackInternally`, UI điều khiển Voodoo & huy hiệu Tier-4; `test/boardgame-phase7b.test.cjs` (9/9 PASS) |
| **Phase 7C — Original AI Art** | `805b30b587287aaeb26dcbb1634a5fd9926173f1` | Sinh & duyệt thị giác 8 chân dung Anime Noir WebP (`66.6–147.0 KB`, **66/66 SHA-256 duy nhất**), 2 Contact Sheet (`8` vai & `66` vai), Prototype Section `5G`, `test/boardgame-phase7c-portraits.test.cjs` (5/5 PASS) & Playwright Visual QA `scripts/verify-phase7c-visuals.cjs` (0px overflow) |
| **Phase 7D — Security & DO E2E** | `c322cbf47012870f412011323601d8a8761c8fa2` | `test/boardgame-phase7d-integration.test.cjs` (5/5 PASS: 30/30 kịch bản liên nhân vật, real DO 4P–8P E2E + hibernation/reconnect/privacy + production lock); báo cáo kiểm toán bảo mật độc lập |
| **Phase 7E — 30k Sim, Fix & Handoff** | *(Commit Phase 7E trên `main`)* | Vá lỗi đồng bộ `publicDrawnCardIds` khi Voodoo chiếm quyền Felicia/Cruz/Gloria phát hiện qua mô phỏng; chạy `30,000` trận `sim-s56-v2` (`0` stall, `0` draw, `0` leak, `0` equipment violation); hoàn thiện đủ 23 tài liệu Phase 7 & cập nhật `expansion-roadmap.md` |

---

## 2. Danh mục Đầy đủ 23 Tài liệu Bắt buộc (`docs/boardgame-expansion/phase-7/`)

1. [`phase-7-scope.md`](./phase-7-scope.md)
2. [`rules-decisions.md`](./rules-decisions.md)
3. [`turn-ownership-architecture.md`](./turn-ownership-architecture.md)
4. [`pending-resurrection-architecture.md`](./pending-resurrection-architecture.md)
5. [`dynamic-skill-copy-architecture.md`](./dynamic-skill-copy-architecture.md)
6. [`dynamic-allegiance-architecture.md`](./dynamic-allegiance-architecture.md)
7. [`multi-faction-victory-architecture.md`](./multi-faction-victory-architecture.md)
8. [`global-attack-interrupt-spec.md`](./global-attack-interrupt-spec.md)
9. [`phase-7a-engine-report.md`](./phase-7a-engine-report.md)
10. [`phase-7b-character-implementation.md`](./phase-7b-character-implementation.md)
11. [`character-art-prompts.md`](./character-art-prompts.md)
12. [`asset-manifest.json`](./asset-manifest.json)
13. [`character-contact-sheet.webp`](./character-contact-sheet.webp) *(kèm `.png`)*
14. [`full-catalog-contact-sheet.webp`](./full-catalog-contact-sheet.webp) *(kèm `.png`)*
15. [`phase-7c-art-report.md`](./phase-7c-art-report.md)
16. [`phase-7d-integration-report.md`](./phase-7d-integration-report.md)
17. [`phase-7e-simulation-report.md`](./phase-7e-simulation-report.md) *(kèm dữ liệu thô [`starter-fifty-six-sim-data.json`](./starter-fifty-six-sim-data.json))*
18. [`classic-regression-report.md`](./classic-regression-report.md)
19. [`security-and-privacy-audit.md`](./security-and-privacy-audit.md)
20. [`full-catalog-completeness-report.md`](./full-catalog-completeness-report.md)
21. [`release-readiness-report.md`](./release-readiness-report.md)
22. [`remaining-risks.md`](./remaining-risks.md)
23. [`phase-7-handoff.md`](./phase-7-handoff.md)

Cập nhật lộ trình tổng thể: [`docs/boardgame-expansion/expansion-roadmap.md`](../expansion-roadmap.md).

---

## 3. Bộ Lệnh Tái lập Toàn bộ Cổng Kiểm thử (Reproducible Verification Commands)

```bash
# 1. Xác minh Classic victory.ts 0-diff
git diff --stat e3dfeac..HEAD -- features/boardgame/domain/victory.ts

# 2. Toàn bộ cổng kiểm thử kho mã nguồn + static build
npm run typecheck
npm run test:boardgame
npm run test:contracts
npm run test:learn
npm run test:world
npm run test:avatar
npm run test:ui
npm run test:study
npm run test:nav
npm run test:mp
npm run build

# 3. Playwright Visual QA, Visual Prototype & E2E
node scripts/verify-phase7c-visuals.cjs
node test/boardgame-visual-prototype.cjs
node test/boardgame-e2e.cjs --shard=e2e-05-06

# 4. Mô phỏng 30,000 trận Full Catalog
node scripts/sim-starter-fifty-six.cjs --write-json
```

---

## 4. Hành động Kế tiếp Sau Phase 7

1. Tổ chức **Closed Human Beta Playtest (`>= 100` trận người thật 4P–8P)** theo [`release-readiness-report.md`](./release-readiness-report.md), ưu tiên dữ liệu cho `Anathema`, `Colt`, `Dalton`, `G43 + Holy Robe`, `Voodoo`, `Undead`, `Cain`, và `N.C. Soldier`.
2. Căn cứ số liệu người thật để chốt bản tinh chỉnh cân bằng/UX (nếu cần), sau đó lần lượt nâng trạng thái từ `IMPLEMENTED` → `INTERNAL_VALIDATED` → `PUBLIC_RELEASE_APPROVED` theo thứ tự: `expansion-1` (36 tướng) → `expansion-2` (40 tướng) → `full-expansion` (66 tướng), luôn bảo toàn `classic` làm chế độ mặc định.
