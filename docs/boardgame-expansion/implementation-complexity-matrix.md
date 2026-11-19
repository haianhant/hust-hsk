# Bóng Đêm KTX — Implementation Complexity Matrix (56 Expansion Characters)

> Tài liệu này phân loại toàn bộ **56 nhân vật mở rộng** trong [`character-catalog.json`](./character-catalog.json) theo 4 cấp độ khó kỹ thuật (`tier-1` -> `tier-4`), các hệ thống engine phụ thuộc, rủi ro bảo mật/quyền riêng tư multiplayer, và trạng thái luật (`rulesStatus`).

---

## 1. Tổng hợp Phân tầng Độ khó

| Tier | Độ phức tạp (`complexity`) | Số nhân vật | Exp 1 | Exp 2 | Đặc trưng kiến trúc yêu cầu |
|---|---|---:|---:|---:|---|
| **Tier 1** | `low` | **12** | 4 | 8 | Passive/modifier số học thuần trong pipeline `BEFORE_ATTACK`, `BEFORE_DAMAGE`, `ON_MOVE`, `ON_DRAW_CARD`, `ON_ELIMINATION`; không cần cửa sổ phản ứng ngoài lượt hay đổi phe động. |
| **Tier 2** | `medium` | **18** | 9 | 9 | Cần pending choice nội lượt (chọn lá bài/phân bổ hồi máu/đánh dấu mục tiêu), kiểm tra điều kiện địa điểm/khu vực, lọc mục tiêu tấn công, hoặc điều kiện thắng cá nhân mới. |
| **Tier 3** | `high` | **18** | 8 | 10 | Cần cửa sổ phản ứng ngoài lượt nhẹ, chuyển hướng/chặn sát thương/hồi máu, chuỗi hành động thưởng, sao chép điều kiện thắng đơn, hoặc metadata mở rộng (`gender`, `canonicalShId`, `timedAura`). |
| **Tier 4** | `very-high` | **8** | 5 | 3 | Thay đổi lõi kiến trúc turn/lifecycle/allegiance: điều khiển lượt người khác (`Voodoo`), hồi sinh trì hoãn (`Undead`), đổi phe động (`Bonnie`, `N.C. Soldier`), sao chép động cả kỹ năng + điều kiện thắng (`Antimony`, `Vengeful Spirit`), thêm điều kiện thắng toàn cục đa phe (`Cain`), ngắt tấn công toàn bản đồ có side-channel privacy risk (`Lloyd`). |
| **Tổng** | — | **56** | **26** | **30** | — |

---

## 2. Bản đồ Năng lực Engine Phụ thuộc (Capability Prerequisites)

| Mã Năng lực | Tên Năng lực Engine | Số tướng cần | Nhân vật tiêu biểu |
|---|---|---:|---|
| `CAP-01` | **Damage & Combat Modifier Pipeline** (`BEFORE_ATTACK`, `BEFORE_DAMAGE`, `AFTER_ATTACK`) | 16 | `G43`, `Fiona`, `Gayle`, `Elysia`, `Fallen`, `Victor`, `Undying`, `Fujiko`, `Warlock`, `Witch`, `Unchained`, `Urban Legend` |
| `CAP-02` | **Location Alias & Area Scope Resolver** (`Church/Weird Woods/Erstwhile Altar`, `Location` vs `Cluster`) | 12 | `Angel`, `Father Harrison`, `Gloria`, `Warlock`, `Witch`, `Gwendolen`, `Udi`, `Wrath`, `Elise`, `Umibozu`, `Warlord`, `Bryon` |
| `CAP-03` | **Pending Card / Multi-Target Choice State** (nội lượt) | 11 | `Felicia`, `Cruz`, `Elise`, `Vengeance`, `Freyja`, `Gideon`, `Visions`, `Clairvoyant`, `Warlord`, `Bipolar`, `Eleanor` |
| `CAP-04` | **Centralized Heal Pipeline & Heal Block Aura** (`ON_HEAL`) | 7 | `Usurper`, `Dalton`, `Elise`, `Cassie`, `Cain`, `Wendigo`, `Wyvern` |
| `CAP-05` | **Reaction Window / Out-of-Turn Interrupt Queue** (có timeout + chống timing leak) | 11 | `Lloyd`, `Gwendolen`, `Cindy`, `Arnold`, `Undying`, `Bianca`, `Colt`, `Gideon`, `Usurper`, `Wendigo`, `Vengeful Spirit` |
| `CAP-06` | **Damage Redirection & Recursion / Cycle Guard** | 5 | `Anathema`, `Arnold`, `Cindy`, `Gwendolen`, `Umibozu` |
| `CAP-07` | **Dynamic Allegiance, Shared & Copied Victory Graph** (có cycle detection) | 12 | `Bonnie`, `Antimony`, `Vengeful Spirit`, `Cain`, `Bethany`, `Cassie`, `Clairvoyant`, `Diana`, `Aaron`, `N.C. Soldier`, `Bipolar`, `April & Skipps` |
| `CAP-08` | **Turn Ownership Override (`controllerPlayerId !== pawnPlayerId`)** | 1 | `Voodoo` |
| `CAP-09` | **Pending Resurrection Lifecycle (`alive` vs `pendingResurrection`)** | 1 | `Undead` |
| `CAP-10` | **Extended Canonical Metadata (`gender` 66 tướng & `canonicalShId` thẻ bài)** | 6 | `Aaron` (gender), `Colt`, `Cruz`, `Bryon`, `N.C. Soldier` (tên thẻ SH), `Ernest` (batch force-reveal) |

---

## 3. Ma trận Chi tiết 56 Nhân vật theo Tier

### 3.1. Tier 1 — Low Complexity (12 nhân vật)

| ID | Tên gốc | Bộ | Phe | HP | Trigger chính | Phụ thuộc Engine | Rủi ro Privacy | Luật (`rulesStatus`) |
|---|---|---|---|---:|---|---|---|---|
| `exp2_g43` | G43 | Exp 2 | Hunter | 14 | `BEFORE_DAMAGE` | `CAP-01` | Thấp | `verified` |
| `exp2_fiona` | Fiona | Exp 2 | Hunter | 12 | `BEFORE_ATTACK` | `CAP-01` | Thấp | `verified` |
| `exp1_wendigo` | Wendigo | Exp 1 | Shadow | 14 | `ON_ELIMINATION` | `CAP-04`, `CAP-05` (nếu ẩn) | Trung bình | `verified` |
| `exp2_wyvern` | Wyvern | Exp 2 | Shadow | 14 | `ON_ELIMINATION` | `CAP-01`, `CAP-04` | Thấp | `verified` |
| `exp1_gayle` | Gayle | Exp 1 | Hunter | 14 | `BEFORE_ATTACK` | `CAP-01` | Thấp | `needs-clarification` |
| `exp1_elysia` | Elysia | Exp 1 | Hunter | 10 | `BEFORE_DAMAGE` | `CAP-01` | Thấp | `needs-clarification` |
| `exp1_victor` | Victor | Exp 1 | Shadow | 13 | `BEFORE_DAMAGE` | `CAP-01` | Thấp | `needs-clarification` |
| `exp2_father_harrison` | Father Harrison | Exp 2 | Hunter | 12 | `ON_MOVE` | `CAP-02` | Thấp | `needs-clarification` |
| `exp2_gloria` | Gloria | Exp 2 | Hunter | 14 | `ON_DRAW_CARD` | `CAP-02`, `CAP-03` | Thấp | `needs-clarification` |
| `exp2_warlock` | Warlock | Exp 2 | Shadow | 14 | `BEFORE_DAMAGE` | `CAP-01`, `CAP-02` | Thấp | `needs-clarification` |
| `exp2_witch` | Witch | Exp 2 | Shadow | 14 | `BEFORE_DAMAGE` | `CAP-01`, `CAP-02` | Thấp | `needs-clarification` |
| `exp2_unchained` | Unchained | Exp 2 | Shadow | 11 | `BEFORE_DAMAGE` | `CAP-01` | Thấp | `needs-clarification` |

### 3.2. Tier 2 — Medium Complexity (18 nhân vật)

| ID | Tên gốc | Bộ | Phe | HP | Trigger chính | Phụ thuộc Engine | Rủi ro Privacy | Luật (`rulesStatus`) |
|---|---|---|---|---:|---|---|---|---|
| `exp1_felicia` | Felicia | Exp 1 | Hunter | 12 | `ON_DRAW_CARD` | `CAP-03` | Trung bình (xem 2 lá bí mật) | `needs-clarification` |
| `exp1_fallen` | Fallen | Exp 1 | Hunter | 12 | `BEFORE_DAMAGE` | `CAP-01` | Thấp | `needs-clarification` |
| `exp1_fea` | Fea | Exp 1 | Hunter | 12 | `ON_MOVE` | `CAP-02` | Thấp | `needs-clarification` |
| `exp1_undying` | Undying | Exp 1 | Shadow | 11 | `BEFORE_DAMAGE` | `CAP-01`, `CAP-05` | Trung bình | `needs-clarification` |
| `exp1_vengeance` | Vengeance | Exp 1 | Shadow | 13 | `ON_ELIMINATION` | `CAP-03` | Thấp | `needs-clarification` |
| `exp1_udi` | Udi | Exp 1 | Shadow | 11 | `BEFORE_ATTACK` | `CAP-02` | Thấp | `needs-clarification` |
| `exp1_wrath` | Wrath | Exp 1 | Shadow | 14 | `ON_TURN_START` | `CAP-02` | Thấp | `needs-clarification` |
| `exp1_bipolar` | Bipolar | Exp 1 | Neutral | 10 | `ON_TURN_START` | `CAP-03`, `CAP-07` | Thấp | `needs-clarification` |
| `exp1_cindy` | Cindy | Exp 1 | Neutral | 11 | `AFTER_DAMAGE` | `CAP-05`, `CAP-06` | Trung bình | `needs-clarification` |
| `exp2_fujiko` | Fujiko | Exp 2 | Hunter | 12 | `AFTER_ATTACK` | `CAP-01` | Thấp | `needs-clarification` |
| `exp2_eleanor` | Eleanor | Exp 2 | Hunter | 10 | `ACTIVE_SKILL` | `CAP-03` | Thấp | `needs-clarification` |
| `exp2_elise` | Elise | Exp 2 | Hunter | 10 | `ACTIVE_SKILL` | `CAP-02`, `CAP-03`, `CAP-04` | Thấp | `needs-clarification` |
| `exp2_umibozu` | Umibozu | Exp 2 | Shadow | 11 | `ON_ROLE_REVEAL` | `CAP-02`, `CAP-06` | Thấp | `needs-clarification` |
| `exp2_urban_legend` | Urban Legend | Exp 2 | Shadow | 11 | `BEFORE_DAMAGE` | `CAP-01`, `CAP-04` | Trung bình | `needs-clarification` |
| `exp2_visions` | Visions | Exp 2 | Shadow | 13 | `ON_TURN_START` | `CAP-03` | Thấp | `needs-clarification` |
| `exp2_cruz` | Cruz | Exp 2 | Neutral | 11 | `ON_DRAW_CARD` | `CAP-03`, `CAP-10` | Thấp | `needs-clarification` |
| `exp2_arlene` | Arlene | Exp 2 | Neutral | 8 | `ON_INVESTIGATE` | `CAP-07` | Cao (ẩn vai trên thẻ Xanh) | `needs-clarification` |
| `exp2_bryon` | Bryon | Exp 2 | Neutral | 10 | `BEFORE_ATTACK` | `CAP-02`, `CAP-10` | Thấp | `needs-clarification` |

### 3.3. Tier 3 — High Complexity (18 nhân vật)

| ID | Tên gốc | Bộ | Phe | HP | Trigger chính | Phụ thuộc Engine | Rủi ro Privacy | Luật (`rulesStatus`) |
|---|---|---|---|---:|---|---|---|---|
| `exp1_ernest` | Ernest | Exp 1 | Hunter | 10 | `ACTIVE_SKILL` | `CAP-06`, `CAP-10` | Cao (ép lộ diện hàng loạt) | `needs-clarification` |
| `exp1_gwendolen` | Gwendolen | Exp 1 | Hunter | 14 | `AFTER_ATTACK` | `CAP-02`, `CAP-05`, `CAP-06` | Trung bình | `needs-clarification` |
| `exp1_anathema` | Anathema | Exp 1 | Neutral | 8 | `ON_TURN_START` | `CAP-06`, `CAP-07` | Thấp | `needs-clarification` |
| `exp1_bethany` | Bethany | Exp 1 | Neutral | 10 | `ON_TURN_START` | `CAP-07`, `CAP-10` | Thấp | `needs-clarification` |
| `exp1_arnold` | Arnold | Exp 1 | Neutral | 8 | `BEFORE_DAMAGE` | `CAP-05`, `CAP-06`, `CAP-07` | Trung bình | `needs-clarification` |
| `exp1_cassie` | Cassie | Exp 1 | Neutral | 11 | `ON_TURN_START` | `CAP-04`, `CAP-07` | Thấp | `needs-clarification` |
| `exp1_clairvoyant` | Clairvoyant | Exp 1 | Neutral | 11 | `ON_TURN_START` | `CAP-03`, `CAP-07` | **Rất cao** (xem vai bí mật người khác) | `needs-clarification` |
| `exp1_angel` | Angel | Exp 1 | Neutral | 8 | `ACTIVE_SKILL` | `CAP-02`, `CAP-07` | Thấp | `needs-clarification` |
| `exp2_freyja` | Freyja | Exp 2 | Hunter | 12 | `AFTER_ATTACK` | `CAP-01`, `CAP-03` | Thấp | `needs-clarification` |
| `exp2_gideon` | Gideon | Exp 2 | Hunter | 14 | `ON_ELIMINATION` | `CAP-03`, `CAP-05` | Thấp | `needs-clarification` |
| `exp2_warlord` | Warlord | Exp 2 | Shadow | 14 | `ON_MOVE` | `CAP-02`, `CAP-03` | Thấp | `needs-clarification` |
| `exp2_usurper` | Usurper | Exp 2 | Shadow | 11 | `ON_HEAL` | `CAP-04`, `CAP-05` | Cao (timing leak ngoài lượt) | `needs-clarification` |
| `exp2_dalton` | Dalton | Exp 2 | Neutral | 13 | `AFTER_DAMAGE` | `CAP-04`, `CAP-07` | Thấp | `needs-clarification` |
| `exp2_april_skipps` | April & Skipps | Exp 2 | Neutral | 8 | `AFTER_DAMAGE` | `CAP-07` | Trung bình | `needs-clarification` |
| `exp2_bianca` | Bianca | Exp 2 | Neutral | 10 | `REACTION_INTERRUPT` | `CAP-05`, `CAP-07` | Cao (timing leak ngoài lượt) | `needs-clarification` |
| `exp2_colt` | Colt | Exp 2 | Neutral | 11 | `ON_EQUIPMENT_CHANGE` | `CAP-05`, `CAP-10` | Trung bình | `needs-clarification` |
| `exp2_diana` | Diana | Exp 2 | Neutral | 13 | `ON_ROLE_REVEAL` | `CAP-07` | Thấp | `needs-clarification` |
| `exp2_aaron` | Aaron | Exp 2 | Neutral | 8 | `ON_ROLE_REVEAL` | `CAP-07`, `CAP-10` | Thấp | `needs-clarification` |

### 3.4. Tier 4 — Very-High Complexity (8 nhân vật)

| ID | Tên gốc | Bộ | Phe | HP | Trigger chính | Phụ thuộc Engine | Rủi ro Privacy | Luật (`rulesStatus`) |
|---|---|---|---|---:|---|---|---|---|
| `exp1_lloyd` | Lloyd | Exp 1 | Hunter | 12 | `REACTION_INTERRUPT` | `CAP-05` | **Rất cao** (timing side-channel) | `needs-clarification` |
| `exp1_vengeful_spirit` | Vengeful Spirit | Exp 1 | Shadow | 13 | `ON_ELIMINATION` | `CAP-05`, `CAP-07` | Trung bình | `needs-clarification` |
| `exp1_voodoo` | Voodoo | Exp 1 | Shadow | 13 | `ON_TURN_START` | `CAP-08` | **Cực cao** (cướp lượt không được lộ vai/bài) | `needs-clarification` |
| `exp1_undead` | Undead | Exp 1 | Shadow | 11 | `ON_ELIMINATION` | `CAP-09` | Trung bình | `needs-clarification` |
| `exp1_antimony` | Antimony | Exp 1 | Neutral | 8 | `ON_ELIMINATION` | `CAP-07` | Trung bình | `needs-clarification` |
| `exp2_cain` | Cain | Exp 2 | Neutral | 11 | `ACTIVE_SKILL` | `CAP-04`, `CAP-07` | Thấp | `needs-clarification` |
| `exp2_bonnie` | Bonnie | Exp 2 | Neutral | 10 | `ON_ELIMINATION` | `CAP-07` | Cao (đổi phe động & thẻ Điều tra) | `needs-clarification` |
| `exp2_nc_soldier` | N.C. Soldier | Exp 2 | Neutral | 13 | `ACTIVE_SKILL` | `CAP-07`, `CAP-10` | Cao (nhắm Neutral ẩn vai) | `needs-clarification` |

---

## 4. Nhận định Kiến trúc cho Giai đoạn Triển khai Kế tiếp

1. **Không nên bật cả 26 hoặc 30 tướng cùng lúc trong 1 PR duy nhất:** Ngay cả sau khi hoàn tất nền tảng Phase 1, nên phát hành theo từng **Wave theo Tier** (Wave A: 12 tướng Tier 1 -> Wave B: 18 tướng Tier 2 -> Wave C: 18 tướng Tier 3 -> Wave D: 8 tướng Tier 4), chỉ mở khóa ruleset `expansion-1` khi toàn bộ 26/26 tướng Exp 1 đạt `implementationStatus === 'implemented'` và có bộ unit + multiplayer test hoàn chỉnh.
2. **Nút thắt lớn nhất của Phase 2 không nằm ở code mà ở 20 mục `UNRESOLVED`:** 52/56 nhân vật đang bị chặn bởi `rules-clarifications.md`. Chỉ **4 tướng (`G43`, `Fiona`, `Wendigo`, `Wyvern`)** đã có luật `verified` sẵn sàng thiết kế handler ngay sau khi Phase 1 hoàn tất.
