# Bóng Đêm KTX — Phase 7 Scope & Canonical Tier-4 Baseline

> **Trạng thái Milestone:** Phase 7A (Advanced Engine Foundations & Rules Ratification)  
> **Baseline HEAD Đã Xác minh:** `e3dfeacfa93df604b69d0c7fc0bca5a4c98fc23f` (Phase 6E COMPLETE — CI 8/8 `success`)  
> **Nguyên tắc Nguồn sự thật (Single Source of Truth):** Mọi thông số HP, phe gốc (`faction`) và `id` đối chiếu trực tiếp với [`docs/boardgame-expansion/character-catalog.json`](../character-catalog.json).

---

## 1. Mục tiêu Toàn phần Phase 7 (Final Wave — `58 → 66 / 66`)

Phase 7 hoàn thiện **8 nhân vật Tier-4 cuối cùng** của bộ mở rộng Shadow Hunters trong **HUSTVerse — Bóng Đêm KTX**, đưa tổng số nhân vật chơi được lên **66 / 66** (`10 Classic + 56/56 Expansion`: `20 Hunter · 21 Shadow · 25 Neutral`, gồm đủ `26/26 Expansion 1` và `30/30 Expansion 2`) kèm **66 / 66 chân dung WebP gốc** (`1024×1536`).

### Quy mô Bắt buộc theo 5 Milestone Tuần tự

| Milestone | Phạm vi chính | Ràng buộc Cổng kiểm thử |
|---|---|---|
| **7A — Advanced Engine Foundations** | Sửa sai lệch HP tài liệu bàn giao Phase 6; phê chuẩn luật thử nghiệm 8 tướng Tier-4; triển khai 6 nền tảng engine (`TurnOwnershipOverride`, `PendingResurrection`, `DynamicSkillCopy`, `DynamicAllegiance`, `MultiFactionVictory`, `GlobalAttackInterrupt`) và thứ tự giao dịch loại 10 bước | `typecheck`, `test:boardgame` (gồm `boardgame-phase7a.test.cjs`), `test:contracts`, 0-diff `victory.ts` |
| **7B — Eight Tier-4 Characters** | Triển khai 8 kỹ năng, điều kiện thắng, PendingChoice, UI chỉ báo, loại trừ `exp2_nc_soldier` bàn 5P, tạo pool thử nghiệm `starter-fifty-six` (`enabledInProduction: false`) | Unit + integration test 8 tướng, UI & contracts PASS |
| **7C — Final Eight AI Portraits** | Sinh 8 chân dung gốc phong cách *HUSTVerse Midnight — Anime Noir*, tối ưu `1024×1536` WebP, ghép Contact Sheet 8 & 66 nhân vật, Prototype Section 5G (113 assets), Playwright QA | 66/66 SHA-256 duy nhất, visual inspection bằng mắt & Playwright PASS |
| **7D — Multiplayer & Security Validation** | 30 kịch bản tương tác chéo; Cloudflare Durable Object WebSocket E2E đủ `4P–8P`; kiểm toán bảo mật độc lập (ẩn vai, Voodoo hijack, reconnect, hibernation, `choice-secret-*`) | 30/30 kịch bản & 4P–8P DO E2E PASS, 0 lỗ hổng P0 |
| **7E — 30,000-Match Sim & Final Audit** | Mô phỏng xác định ≥ 30.000 trận (`6.000 × 5` từ `4P–8P`) trên `starter-fifty-six`; kiểm toán 66/66 catalog & 3 trạng thái phát hành; báo cáo Classic 0-regression & kế hoạch Human Beta ≥ 100 trận; đẩy lên `main` & xác minh CI xanh tại đúng commit SHA | Toàn bộ CI gates + Remote GitHub Actions PASS 100% |

---

## 2. Danh mục Chính tắc 8 Nhân vật Tier-4 & Sửa Sai lệch Dữ liệu HP

Đối chiếu từ [`character-catalog.json`](../character-catalog.json) (đã sửa sai lệch 5 giá trị HP cũ trong [`phase-6-handoff.md`](../phase-6/phase-6-handoff.md)):

| # | Role ID | Nhân vật | Gói | Phe gốc (`catalog`) | Phe KTX (`BoardGameFactionId`) | HP Chính tắc | RC Nguồn | Hạ tầng Cốt lõi |
|---:|---|---|---|---|---|---:|---|---|
| 1 | `exp1_lloyd` | Lloyd | `expansion-1` | `hunter` | `lantern-guard` | **12** | `RC-06` | `GlobalAttackInterrupt` |
| 2 | `exp1_vengeful_spirit` | Vengeful Spirit | `expansion-1` | `shadow` | `mist-order` | **13** | `RC-04` | `DynamicSkillCopy` |
| 3 | `exp1_voodoo` | Voodoo | `expansion-1` | `shadow` | `mist-order` | **13** | `RC-01` | `TurnOwnershipOverride` |
| 4 | `exp1_undead` | Undead | `expansion-1` | `shadow` | `mist-order` | **11** | `RC-02` | `PendingResurrection` |
| 5 | `exp1_antimony` | Antimony | `expansion-1` | `neutral` | `wanderer` | **8** | `RC-04` | `DynamicSkillCopy` + `CopiedVictoryGraph` |
| 6 | `exp2_cain` | Cain | `expansion-2` | `neutral` | `wanderer` | **11** | `RC-05` | `MultiFactionVictory` |
| 7 | `exp2_bonnie` | Bonnie | `expansion-2` | `neutral` | `wanderer` | **10** | `RC-03` | `DynamicAllegiance` |
| 8 | `exp2_nc_soldier` | N.C. Soldier | `expansion-2` | `neutral` | `wanderer` | **13** | `RC-09` | `DynamicAllegiance` (Alliance Group) |

### Lịch sử Sửa lỗi Dữ liệu (Mandatory Data Correction)
- Trong bản bàn giao Phase 6 ban đầu, 5 dòng có sai lệch HP (`Vengeful Spirit: 10→13`, `Voodoo: 11→13`, `Antimony: 12→8`, `Cain: 13→11`, `N.C. Soldier: 12→13`). Đã hiệu đính trực tiếp tại [`docs/boardgame-expansion/phase-6/phase-6-handoff.md`](../phase-6/phase-6-handoff.md) và khóa bảo vệ tự động trong [`test/boardgame-phase7a.test.cjs`](../../../test/boardgame-phase7a.test.cjs).

---

## 3. Khóa An toàn Production & Phân tách Trạng thái Phát hành

- Production (`ALLOW_EXPERIMENTAL_RULESETS !== '1'`) **giữ nguyên `classic`-only**.
- Mọi bộ luật mở rộng (`starter-four`, `starter-eight`, `starter-sixteen`, `starter-twenty-six`, `starter-thirty-eight`, `starter-forty-eight`, `starter-fifty-six`, `expansion-1`, `expansion-2`, `full-expansion`) đều bị từ chối ở server nếu chưa bật cờ thử nghiệm nội bộ.
- Hoàn thành cài đặt (`IMPLEMENTED`) và kiểm thử nội bộ (`INTERNAL_VALIDATED`) **không tự động cấp quyền** `PUBLIC_RELEASE_APPROVED`.
