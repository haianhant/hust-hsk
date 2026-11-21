# Bóng Đêm KTX — Phase 8C Character VFX Coverage Matrix (66/66 Nhân vật)

> **Nguyên tắc phân loại trung thực (Track B):** Không tuyên bố 66/66 hoạt ảnh độc nhất chỉ từ ảnh chân dung (`portrait`). Mỗi nhân vật trong toàn bộ **66 vai** (`10 Classic + 26 Expansion 1 + 30 Expansion 2`) được phân loại có chủ đích theo **5 cấp độ hiệu ứng**:
> - **`SIGNATURE_VFX`** — Hiệu ứng Canvas 2D + DOM/Cut-in + âm thanh WebAudio đặc trưng nhận diện ngay (toàn bộ 8 Tier-4 + nhóm biểu tượng Classic/Tier-3).
> - **`SHARED_VFX`** — Dùng bộ hiệu ứng tái sử dụng phân họ theo cơ chế (`SLASH`, `EXPLOSION`, `LIGHTNING_STRIKE`, `HEAL_AURA`, `SHIELD_GUARD`, `STEAL_TETHER`, `REDIRECT_ARC`, `SHADOW_NOVA`, `MARK_SEAL`, `BOND_TETHER`, `CARD_CASCADE`, `FINISHER_SLASH`, `ANGEL_SANCTUARY`).
> - **`STATE_INDICATOR`** — Biểu tượng/hào quang bền vững trên quân cờ & bảng trạng thái (`Dormant`, `Voodoo Puppet`, `Visions Mark`, `Angel Sanctuary`, `Usurper Seal`, `Anathema Curse`, `Bethany Chosen`, `Diana Customer`, `Aaron Spouse`, `April & Skipps Countdown`, `Cain Modifier`, `N.C. Soldier Alliance`).
> - **`PRIVATE_FEEDBACK`** — Chỉ phản hồi cục bộ riêng tư trên màn hình chủ sở hữu (không bao giờ phát VFX công khai làm lộ vai ẩn).
> - **`NO_PUBLIC_VFX_REQUIRED`** — Nội tại thụ động ẩn/tính toán điều kiện thắng nội bộ, chỉ phát `ROLE_REVEAL` / `VICTORY` khi lộ vai hoặc kết thúc trận.

---

## Tổng hợp Phân bổ 66/66 Nhân vật

| Hạng mục | Số vai | Tỷ lệ |
|---|---:|---:|
| **`SIGNATURE_VFX`** (Classic biểu tượng + Toàn bộ 8 Tier-4 + Tier-3 nổi bật) | **20** | 30.3% |
| **`SHARED_VFX`** (Bộ hiệu ứng phân họ tái sử dụng + phản ứng phòng thủ/tấn công/rút bài) | **32** | 48.5% |
| **`STATE_INDICATOR`** (Hào quang/liên kết công khai kèm hiệu ứng kích hoạt gọn) | **9** | 13.6% |
| **`PRIVATE_FEEDBACK`** (Soi/phản ứng bí mật chỉ hiển thị cho chủ sở hữu) | **3** | 4.5% |
| **`NO_PUBLIC_VFX_REQUIRED`** (Thụ động thuần điều kiện thắng / bảo mật ẩn) | **2** | 3.0% |
| **Tổng cộng** | **66** | **100.0%** |

---

## 1. Bộ Classic — 10 Nhân vật (Ổn định)

| # | Role ID | Nhân vật | Phe | Phân loại VFX | Sự kiện cấu trúc (`effectKey`) | Âm thanh | Ràng buộc Bảo mật P0 | Trạng thái |
|---:|---|---|---|---|---|---|---|---|
| 1 | `gac-ky-thuat` | Minh "Kỹ Thuật" | Hunter | `SIGNATURE_VFX` | `SKILL_ACTIVATED` (`classic_demolish`) + `EXPLOSION` | `playSignatureSkillCue` + `playExplosionImpact` | Chỉ phát khi đã lộ vai | Hoàn tất |
| 2 | `gac-truc-ban` | Lan "Trực Ban" | Hunter | `SHARED_VFX` | `SKILL_ACTIVATED` (`classic_teleport`) + `SHIELD_GUARD` | `playSignatureSkillCue` | Chỉ phát khi đã lộ vai | Hoàn tất |
| 3 | `gac-radio` | Vy "Radio" | Hunter | `SIGNATURE_VFX` | `SKILL_ACTIVATED` (`classic_lightning`) + `LIGHTNING_STRIKE` | `playSignatureSkillCue` + `playLightningStrike` | Chỉ phát khi đã lộ vai | Hoàn tất |
| 4 | `suong-an-danh` | Tú "Ẩn Danh" | Shadow | `SHARED_VFX` | `HEAL_APPLIED` (`classic_vampire_heal`) + `HEAL_AURA` | `playHealShimmer` | Chỉ phát khi đã lộ vai | Hoàn tất |
| 5 | `suong-tin-gia` | Khánh "Tin Giả" | Shadow | `NO_PUBLIC_VFX_REQUIRED` | Không phát VFX công khai khi ẩn; chỉ phát `ROLE_REVEALED` | `playRoleReveal` | Tuyệt đối không lộ khi lừa thẻ Xanh | Hoàn tất |
| 6 | `suong-gac-cong` | Dũng "Gác Cổng" | Shadow | `SIGNATURE_VFX` | `ATTACK_HIT` / `SKILL_ACTIVATED` (`classic_counter`) + `COUNTER_STRIKE` | `playCounterStrike` | Chỉ phát khi đã lộ vai | Hoàn tất |
| 7 | `lang-anh-san` | Hải "Sưu Tầm" | Neutral | `SHARED_VFX` | `EQUIPMENT_TRANSFERRED` (`bob_steal`) + `STEAL_TETHER` | `playStealSnatch` | Chỉ phát khi đã lộ vai | Hoàn tất |
| 8 | `lang-quan-sat` | Trang "Kiên Cường" | Neutral | `SIGNATURE_VFX` | `HEAL_APPLIED` (`classic_allie_heal`) + `HEAL_AURA` | `playSignatureSkillCue` + `playHealShimmer` | Chỉ phát khi đã lộ vai | Hoàn tất |
| 9 | `lang-cuu-ho` | Bách "Cuồng Chiến" | Neutral | `SIGNATURE_VFX` | `SKILL_ACTIVATED` (`classic_bloody_feast`) + `MASAMUNE_SLASH` | `playSignatureSkillCue` + `playSlashHit(true)` | Chỉ phát khi đã lộ vai | Hoàn tất |
| 10 | `lang-tien-phong` | Đạt "Cảm Tử" | Neutral | `SHARED_VFX` | `ROLE_REVEALED` (`daniel_scream`) | `playRoleReveal` | Chỉ phát khi buộc lộ diện / chết đầu tiên | Hoàn tất |

---

## 2. Bộ Tier-4 Biểu Tượng — 8 Nhân vật (Ưu tiên Cao nhất · Phase 8C)

| # | Role ID | Nhân vật | Phe | Phân loại VFX | Sự kiện cấu trúc (`kind` / `effectKey`) | Hiệu ứng Đặc trưng (Canvas + DOM) | Âm thanh | Ràng buộc Bảo mật P0 | Trạng thái |
|---:|---|---|---|---|---|---|---|---|---|
| 11 | `exp1_lloyd` | **Lloyd** | Hunter | `SIGNATURE_VFX` | `ATTACK_CANCELLED` (`lloyd_interrupt`) + `DAMAGE_APPLIED` (`-2` hp-cost) | `LLOYD_INTERCEPT`: Khiên lục giác quang-kim lao chắn giữa kẻ đánh & nạn nhân → vỡ sáng + nhãn `CANCELLED` & `-2 HP` trên Lloyd. Tuyệt đối **không** phát hit VFX của đòn đã hủy! | `playLloydIntercept` | Chỉ kích hoạt khi Lloyd đã lộ vai | **Phase 8C Signature** |
| 12 | `exp1_vengeful_spirit` | **Vengeful Spirit** | Shadow | `SIGNATURE_VFX` | `COPY_SKILL_APPLIED` (`vengeful_spirit_copy`) | `VENGEFUL_ECHO`: Dải linh hồn đỏ-tím chảy xoáy từ nạn nhân bị loại sang Vengeful Spirit kèm huy hiệu kỹ năng sao chép công khai. | `playVengefulEcho` | Khi còn ẩn & từ chối → `0` sự kiện, `0` VFX, `0` âm thanh | **Phase 8C Signature** |
| 13 | `exp1_voodoo` | **Voodoo** | Shadow | `SIGNATURE_VFX` + `STATE_INDICATOR` | `TURN_HIJACK_STARTED` (`voodoo_hijack_start`), `TURN_HIJACK_ENDED` (`voodoo_hijack_end`) | `VOODOO_PUPPET`: Các sợi dây rối linh hồn tím nối từ Voodoo tới quân cờ nạn nhân + khung spotlight con rối + huy hiệu tạm dừng khi nạn nhân xem bài kín + thu dây mượt khi kết thúc lượt. | `playVoodooPuppet` | Không bao giờ hiện lá `inv-*` hay vai ẩn nạn nhân | **Phase 8C Signature** |
| 14 | `exp1_undead` | **Undead** | Shadow | `SIGNATURE_VFX` + `STATE_INDICATOR` | `PLAYER_DORMANT` (`undead_dormant`), `PLAYER_REVIVED` (`undead_revive`) | `UNDEAD_SHROUD` & `UNDEAD_REVIVE`: Màn sương ngủ đông tím-ngọc + trạng thái quân cờ `NGỦ ĐÔNG` tách biệt hoàn toàn khỏi `HẠ GỤC` (0 loot VFX) → sóng hồi sinh `+6 HP` đầu lượt kế. | `playUndeadDormant` / `playUndeadRevive` | Không lộ vai trước lần chí tử đầu tiên (`RC-02`) | **Phase 8C Signature** |
| 15 | `exp1_antimony` | **Antimony** | Neutral | `SIGNATURE_VFX` | `COPY_SKILL_APPLIED` (`antimony_copy`) | `ANTIMONY_MIRROR`: Chùm gương tinh thể lam-vàng phản chiếu từ nạn nhân bị loại sang Antimony, chỉ hiển thị tên kỹ năng công khai đã sao chép (không lộ mục tiêu thắng kín). | `playAntimonyMirror` | Tuyệt đối không lộ mục tiêu thắng bí mật hay thẻ kín | **Phase 8C Signature** |
| 16 | `exp2_cain` | **Cain** | Neutral | `SIGNATURE_VFX` + `STATE_INDICATOR` | `SKILL_ACTIVATED` (`cain_power_play`), `MATCH_FINISHED` (`cain_multi_victory`) | `CAIN_POWER_PLAY`: Sóng cân bằng song sắc Lục bảo/Huyết nguyệt + hồi máu + màn `MultiFactionVictory` song phe (2 huy hiệu Hunter + Shadow đồng thời ở `BoardGameVfxStage` & `MatchResult`). | `playCainPowerPlay` + Dual Victory Fanfare | Chỉ bật huy hiệu song phe sau khi Cain đã lộ diện | **Phase 8C Signature** |
| 17 | `exp2_bonnie` | **Bonnie** | Neutral → Shadow | `SIGNATURE_VFX` + `STATE_INDICATOR` | `FACTION_CHANGED` (`bonnie_shadow_succession`) | `BONNIE_SUCCESSION`: Xoáy chuyển hóa Hổ phách → Huyết nguyệt tím sau khi máy chủ xác nhận chuyển phe, cập nhật huy hiệu & viền phe Shadow ngay lập tức (không phát lại khi F5). | `playBonnieSuccession` | Chỉ phát sau khi hạ gục Shadow & chuyển phe công khai | **Phase 8C Signature** |
| 18 | `exp2_nc_soldier` | **N.C. Soldier** | Neutral | `SIGNATURE_VFX` + `STATE_INDICATOR` | `PLAYER_RECRUITED` (`nc_soldier_recruit`), `MATCH_FINISHED` (`nc_soldier_alliance`) | `NC_SOLDIER_RECRUIT`: Xung chiêu mộ chiến thuật vàng-hổ phách tới mục tiêu Neutral đã lộ (phân biệt `CHIÊU MỘ!` thành công vs trượt `<5` vết thương) + huy hiệu Liên minh + banner thắng 3 vũ khí. | `playNcSoldierRecruit` | Chỉ nhắm mục tiêu Neutral ĐÃ LỘ DIỆN (`0` dò vai ẩn) | **Phase 8C Signature** |

---

## 3. Bộ Tier-3 & Các Đợt Trước — 48 Nhân vật Còn Lại (Expansion 1 & Expansion 2)

| # | Role ID | Nhân vật | Phe | Phân loại VFX | Họ Hiệu ứng / Chỉ báo | Ràng buộc Bảo mật P0 | Trạng thái |
|---:|---|---|---|---|---|---|---|
| 19 | `exp1_anathema` | Anathema | Neutral | `SIGNATURE_VFX` + `STATE_INDICATOR` | `DAMAGE_REDIRECTED` (`REDIRECT_ARC` đỏ thẫm) + huy hiệu mục tiêu bị nguyền | Chỉ hiện mục tiêu nguyền sau khi Anathema lộ diện | **Phase 8C Upgraded** |
| 20 | `exp1_arnold` | Arnold | Neutral | `SIGNATURE_VFX` | `DAMAGE_REDIRECTED` (`REDIRECT_ARC` pha lê phản đòn chí mạng + vỡ khiên) | Khi còn ẩn & từ chối → 0 VFX, 0 log | **Phase 8C Upgraded** |
| 21 | `exp2_gideon` | Gideon | Hunter | `SIGNATURE_VFX` | `SKILL_ACTIVATED` (`CARD_CASCADE`: 3 thẻ Trắng bung quạt tuần tự) | Công khai trang bị / thẻ tiêu hao | **Phase 8C Upgraded** |
| 22 | `exp2_colt` | Colt | Neutral | `SIGNATURE_VFX` | `EQUIPMENT_TRANSFERRED` (`STEAL_TETHER` thu hồi + `COUNTER_STRIKE`) | Chỉ kích hoạt khi Colt đã lộ diện | **Phase 8C Upgraded** |
| 23 | `exp1_wrath` | Wrath | Shadow | `SIGNATURE_VFX` | `SKILL_ACTIVATED` (`SHADOW_NOVA`: vòng lửa AoE toàn vùng) | Chỉ phát khi Wrath lộ diện | **Phase 8C Upgraded** |
| 24 | `exp1_vengeance` | Vengeance | Shadow | `SIGNATURE_VFX` | `SKILL_ACTIVATED` (`LIGHTNING_STRIKE` nối chuỗi 2 mục tiêu) | Chỉ phát khi Vengeance lộ diện | **Phase 8C Upgraded** |
| 25 | `exp2_fujiko` | Fujiko | Hunter | `SIGNATURE_VFX` | `SKILL_ACTIVATED` (`FINISHER_SLASH`: nhát chém đỏ kết liễu `≤4 HP`) | Chỉ kết liễu mục tiêu đã lộ diện | **Phase 8C Upgraded** |
| 26 | `exp1_angel` | Angel | Neutral | `STATE_INDICATOR` + `SHARED_VFX` | `DAMAGE_PREVENTED` (`ANGEL_SANCTUARY`: mái vòm vàng che chở Neutral đã lộ) | Tuyệt đối không gắn lên Neutral ẩn hay Bonnie đã thành Shadow | **Phase 8C Upgraded** |
| 27 | `exp2_usurper` | Usurper | Shadow | `STATE_INDICATOR` + `SHARED_VFX` | `HEAL_BLOCKED` (`MARK_SEAL`: ấn cấm hồi máu đỏ) + biểu tượng hào quang | Khi còn ẩn & từ chối → 0 VFX | **Phase 8C Upgraded** |
| 28 | `exp2_visions` | Visions | Shadow | `STATE_INDICATOR` + `SHARED_VFX` | `SKILL_ACTIVATED` / `DAMAGE_APPLIED` (`MARK_SEAL`: con mắt dấu ấn đầu lượt) | Chỉ hiển thị dấu ấn khi Visions đã lộ | **Phase 8C Upgraded** |
| 29 | `exp2_warlord` | Warlord | Shadow | `SHARED_VFX` | `SKILL_ACTIVATED` (`BOND_TETHER` xích kéo mục tiêu + `SLASH`) | Chỉ phát khi Warlord lộ diện | **Phase 8C Upgraded** |
| 30 | `exp1_bethany` | Bethany | Neutral | `STATE_INDICATOR` + `SHARED_VFX` | `EQUIPMENT_TRANSFERRED` (`BOND_TETHER` vàng gắn Người được chọn) | Chỉ hiện Chosen sau khi Bethany lộ | **Phase 8C Upgraded** |
| 31 | `exp2_diana` | Diana | Neutral | `STATE_INDICATOR` + `SHARED_VFX` | `ROLE_REVEALED` / `SKILL_ACTIVATED` (`BOND_TETHER` ấn hợp đồng khi kích hoạt) | Tuyệt đối không lộ trạng thái `pending` khi Diana còn ẩn | **Phase 8C Upgraded** |
| 32 | `exp2_aaron` | Aaron | Neutral | `STATE_INDICATOR` + `SHARED_VFX` | `SKILL_ACTIVATED` (`BOND_TETHER` vòng hoa hồng Vợ/Chồng) | Chỉ hiện liên kết sau khi Aaron lộ diện | **Phase 8C Upgraded** |
| 33 | `exp2_april_skipps` | April & Skipps | Neutral | `STATE_INDICATOR` + `SHARED_VFX` | `ROLE_REVEALED` (`MARK_SEAL`: còi báo động mốc 7 vết thương) | Chỉ kích hoạt công khai đúng mốc 7 vết thương | **Phase 8C Upgraded** |
| 34 | `exp1_cassie` | Cassie | Neutral | `SHARED_VFX` | `HEAL_APPLIED` (`HEAL_AURA` hồi +1 HP đầu lượt) | Không lộ mục tiêu `COPY_GOAL` bí mật | **Phase 8C Upgraded** |
| 35 | `exp1_clairvoyant` | Clairvoyant | Neutral | `PRIVATE_FEEDBACK` | `SKILL_ACTIVATED` (`CARD_CASCADE` tia nhìn mờ công khai; kết quả vai chỉ gửi riêng tư!) | Tuyệt đối không lộ vai bị soi trong `visualEvents` công khai | **Phase 8C Upgraded** |
| 36 | `exp2_eleanor` | Eleanor | Hunter | `SHARED_VFX` | `SKILL_ACTIVATED` (`CARD_CASCADE` tia điều tra ngọc) | Lá Xanh rút kín vẫn giữ úp mặt lưng | **Phase 8C Upgraded** |
| 37 | `exp2_bianca` | Bianca | Neutral | `SHARED_VFX` | `DAMAGE_PREVENTED` (`SHIELD_GUARD` hủy trang bị chặn sát thương) | Chỉ kích hoạt khi Bianca lộ diện | **Phase 8C Upgraded** |
| 38 | `exp2_dalton` | Dalton | Neutral | `STATE_INDICATOR` + `SHARED_VFX` | `ROLE_REVEALED` / `HEAL_BLOCKED` (`MARK_SEAL` Vòng Đấu Thứ 12) | Tự lộ khi chạm `≤ 12 HP` | **Phase 8C Upgraded** |
| 39 | `exp1_gayle` | Gayle | Hunter | `SHARED_VFX` | `ATTACK_HIT` (`SLASH` +1 ST tay không) | Chỉ phát khi Gayle lộ diện | Đã phủ |
| 40 | `exp1_felicia` | Felicia | Hunter | `PRIVATE_FEEDBACK` | Rút 2 giữ 1: hiển thị lựa chọn riêng tư, chỉ công khai lá rút cuối | Không lộ lá bị trả về chồng bài | Đã phủ |
| 41 | `exp1_ernest` | Ernest | Hunter | `SHARED_VFX` | `SKILL_ACTIVATED` / `HEAL_APPLIED` (`HEAL_AURA` Từ Đạo / tự thương) | Chỉ phát khi Ernest lộ diện | Đã phủ |
| 42 | `exp1_elysia` | Elysia | Hunter | `SHARED_VFX` | `ATTACK_HIT` (`COUNTER_STRIKE` / `SLASH` cộng thương theo số lần đánh) | Chỉ phát khi Elysia lộ diện | Đã phủ |
| 43 | `exp1_fallen` | Fallen | Hunter | `SHARED_VFX` | `ATTACK_HIT` (`SLASH` +2 ST khi HP `≥ 8`) | Chỉ phát khi Fallen lộ diện | Đã phủ |
| 44 | `exp1_gwendolen` | Gwendolen | Hunter | `SHARED_VFX` | `ATTACK_HIT` (`COUNTER_STRIKE` bảo vệ đồng minh cùng ô) | Chỉ phát khi Gwendolen lộ diện | Đã phủ |
| 45 | `exp1_fea` | Fea | Hunter | `SHARED_VFX` | `SKILL_ACTIVATED` (`SHIELD_GUARD` chỉnh tổng xúc xắc `±1`) | Chỉ phát khi Fea lộ diện | Đã phủ |
| 46 | `exp1_undying` | Undying | Shadow | `SHARED_VFX` | `DAMAGE_PREVENTED` (`SHIELD_GUARD` `-1 ST`) | Khi ẩn & từ chối → 0 VFX | Đã phủ |
| 47 | `exp1_victor` | Victor | Shadow | `SHARED_VFX` | `ATTACK_HIT` (`MASAMUNE_SLASH` Bác Học Điên) | Chỉ phát khi Victor lộ diện | Đã phủ |
| 48 | `exp1_wendigo` | Wendigo | Shadow | `SHARED_VFX` | `HEAL_APPLIED` (`HEAL_AURA` Tiệc Thịt hồi máu khi có người chết) | Khi ẩn & từ chối → 0 VFX | Đã phủ |
| 49 | `exp1_udi` | Udi | Shadow | `STATE_INDICATOR` | `SKILL_ACTIVATED` (`SHIELD_GUARD` Ẩn Thân khi ở rìa) | Chỉ phát khi Udi lộ diện | Đã phủ |
| 50 | `exp1_bipolar` | Bipolar | Neutral | `SHARED_VFX` | `SKILL_ACTIVATED` (`HEAL_AURA` hoặc `EXPLOSION` theo Đồng Xu Định Mệnh) | Chỉ phát khi Bipolar lộ diện | Đã phủ |
| 51 | `exp1_cindy` | Cindy | Neutral | `SHARED_VFX` | `DAMAGE_APPLIED` (`COUNTER_STRIKE` Con Ác Mộng) | Khi ẩn & từ chối → 0 VFX | Đã phủ |
| 52 | `exp2_father_harrison` | Father Harrison | Hunter | `SHARED_VFX` | `SKILL_ACTIVATED` (`HEAL_AURA` dịch chuyển Lễ Ngày Chủ Nhật tới Ô 6) | Chỉ phát khi Father Harrison lộ diện | Đã phủ |
| 53 | `exp2_gloria` | Gloria | Hunter | `SHARED_VFX` | `SKILL_ACTIVATED` (`CARD_CASCADE` rút 2 thẻ Trắng/Đen liên tiếp) | Chỉ phát khi Gloria lộ diện | Đã phủ |
| 54 | `exp2_freyja` | Freyja | Hunter | `SHARED_VFX` | `ATTACK_HIT` (`SLASH` bỏ trang bị đánh thêm) | Chỉ phát khi Freyja lộ diện | Đã phủ |
| 55 | `exp2_g43` | G43 | Hunter | `SHARED_VFX` | `DAMAGE_PREVENTED` (`SHIELD_GUARD` `-2 ST` Chế Độ Pháo Đài) | Chỉ phát khi G43 lộ diện | Đã phủ |
| 56 | `exp2_elise` | Elise | Hunter | `SHARED_VFX` | `HEAL_APPLIED` (`HEAL_AURA` Âm Hưởng Mềm Mại hồi HP) | Chỉ phát khi Elise lộ diện | Đã phủ |
| 57 | `exp2_fiona` | Fiona | Hunter | `SHARED_VFX` | `ATTACK_HIT` (`SLASH` Đòn Đánh Giải Phẫu chọn xúc xắc) | Chỉ phát khi Fiona lộ diện | Đã phủ |
| 58 | `exp2_warlock` | Warlock | Shadow | `SHARED_VFX` | `ATTACK_HIT` (`SLASH` cộng sát thương theo số trang bị) | Chỉ phát khi Warlock lộ diện | Đã phủ |
| 59 | `exp2_witch` | Witch | Shadow | `SHARED_VFX` | `DAMAGE_PREVENTED` (`SHIELD_GUARD` `MIỄN ST` tại Hành Lang Tầng 4) | Chỉ phát khi Witch lộ diện | Đã phủ |
| 60 | `exp2_wyvern` | Wyvern | Shadow | `SHARED_VFX` | `HEAL_APPLIED` (`HEAL_AURA` Hấp Thụ hồi máu khi gây ST) | Chỉ phát khi Wyvern lộ diện | Đã phủ |
| 61 | `exp2_umibozu` | Umibozu | Shadow | `SHARED_VFX` | `SKILL_ACTIVATED` (`SHADOW_NOVA` sóng 2 ST toàn bàn khi lộ diện) | Chỉ phát khi Umibozu lộ diện | Đã phủ |
| 62 | `exp2_urban_legend` | Urban Legend | Shadow | `SHARED_VFX` | `HEAL_APPLIED` (`HEAL_AURA` chuyển sát thương thẻ Đen thành hồi máu) | Khi ẩn & từ chối → 0 VFX | Đã phủ |
| 63 | `exp2_unchained` | Unchained | Shadow | `SHARED_VFX` | `ATTACK_HIT` (`SLASH` cộng sát thương theo thương tích) | Chỉ phát khi Unchained lộ diện | Đã phủ |
| 64 | `exp2_cruz` | Cruz | Neutral | `PRIVATE_FEEDBACK` | Chọn lại lá Đen (`cruz_black_redraw`) riêng tư; công khai chỉ hiện thẻ cuối | Không lộ lá Đen đã trả về chồng bài | Đã phủ |
| 65 | `exp2_arlene` | Arlene | Neutral | `NO_PUBLIC_VFX_REQUIRED` | Điều kiện thắng khi bị Hunter hạ gục → phát qua `ELIMINATION` + `MATCH_FINISHED` | Không lộ vai trước khi lộ/bị loại | Đã phủ |
| 66 | `exp2_bryon` | Bryon | Neutral | `SHARED_VFX` | `EQUIPMENT_TRANSFERRED` (`STEAL_TETHER` tặng trang bị đầu lượt) | Chỉ phát khi Bryon lộ diện | Đã phủ |
