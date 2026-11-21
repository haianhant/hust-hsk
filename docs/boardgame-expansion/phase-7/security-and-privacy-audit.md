# Phase 7D — Kiểm toán Bảo mật & Quyền riêng tư Độc lập (Security & Privacy Audit)

> **Phạm vi kiểm toán:** Toàn bộ 66 nhân vật (`starter-fifty-six`), trọng tâm 8 nhân vật Tier-4 và 6 nền tảng mở rộng Phase 7 (`TurnOwnershipOverride`, `PendingResurrection`, `DynamicSkillCopy`, `DynamicAllegiance`, `GlobalAttackInterrupt`, `MultiFactionVictory`).  
> **Nguyên tắc trung thực:** Báo cáo tách bạch rõ ràng các lớp **đã được bảo chứng ở tầng Payload/Auth** so với **các kênh rò rỉ thời gian (timing side-channel) còn tồn dư**.

---

## 1. Ma trận Kiểm toán 12 Hạng mục Bảo mật (Section 23)

| # | Hạng mục kiểm toán | Cơ chế bảo vệ hiện hành | Trạng thái |
|---:|---|---|---|
| 1 | **Quyền riêng tư Vai ẩn (Hidden-role privacy)** | Mọi projection công khai (`getPublicGameView`) chỉ phát `revealedRoleId/revealedFaction/revealedMaxHp` khi `player.revealed === true`; Spectator luôn nhận `privateView: null`. `MIDNIGHT_CHARACTER_ART` không xuất hiện trong DOM khi chưa lật (`verify-phase7c-visuals.cjs`: `0` ảnh rò rỉ). | **PASS** |
| 2 | **Chống chiếm quyền lượt trái phép (Unauthorized turn ownership)** | `resolveTurnCommandAuthority` tách biệt 5 thực thể (`sender`, `activePlayer`, `controller`, `actingPawn`, `owner`); mọi lệnh không có grant hợp lệ hoặc từ nạn nhân đang bị chiếm quyền đều bị từ chối trên server (`CONTROLLED_BY_OTHER` / `NOT_YOUR_TURN`). | **PASS** |
| 3 | **Chống leo thang đặc quyền qua Voodoo (Privilege escalation)** | `TURN_CONTROL_PROHIBITED_CONTROLLER_ACTIONS` chặn cứng `REVEAL_ROLE`, `USE_SKILL`, `TRANSFER_TO_BETHANY`, `INVESTIGATE_CARD`, `SET_REACTION_PREF`, `RESOLVE_CHOICE` từ controller; `getPrivateGameView(voodoo)` không bao giờ kèm bài trên tay hay manh mối riêng của nạn nhân; rút `inv-*` tự động bật `pausedForOwnerDecision`. | **PASS** |
| 4 | **Bảo mật Reconnect Token** | `reconnectToken` chỉ cấp duy nhất qua `BG_AUTH_ISSUED` riêng từng socket; không bao giờ xuất hiện trong `publicGame`, `publicLog`, `highlights`, hay DTO của người chơi khác/Spectator. | **PASS** |
| 5 | **Quyền thực thi kỹ năng sao chép (`DynamicSkillCopy`)** | Kiểm tra `getEffectiveSkillRoleId`, `hasEffectiveSkillUsedOnce`, `MAX_SKILL_COPY_DEPTH = 3`, chống tự sao chép vòng lặp; không sao chép thông tin kín (bài tay, manh mối điều tra, tầm nhìn Clairvoyant) của chủ gốc. | **PASS** |
| 6 | **Metadata mục tiêu thắng sao chép ẩn** | Clairvoyant giữ tầm nhìn riêng chỉ trong `privateView.clairvoyantReveals`; Antimony lộ diện khi sao chép bắt buộc nên không tồn tại trạng thái sao chép bí mật rò rỉ; đồ thị chu trình fail-closed. | **PASS** |
| 7 | **Hiển thị phe động (`DynamicAllegiance`)** | `baseFaction` bất biến trong catalog/provenance; `effectiveFaction` chỉ xuất hiện trên public DTO sau khi Bonnie lộ diện bắt buộc trong Bước 6a, không bao giờ tiết lộ Bonnie trước thời điểm chuyển phe. | **PASS** |
| 8 | **Điều kiện chiêu mộ Neutral (`N.C. Soldier`)** | `isEligibleNcSoldierRecruitTarget` yêu cầu cứng `target.revealed === true` và `effectiveFaction === 'wanderer'`; từ chối mục tiêu ẩn vai để ngăn dùng kỹ năng dò phe (oracle attack!). | **PASS** |
| 9 | **Mã `choice-secret-*` & hạn thời gian riêng tư** | Toàn bộ lựa chọn bí mật (gồm cả `vengeful_spirit_copy_skill` mới cùng `wendigo`/`undying`/`cindy`/`usurper`/`bianca`/`arnold`) tiếp tục dùng tiền tố mờ đục `choice-secret-*` (không chứa tên vai), `ownerPlayerId: null`, `kind: null`, và `publicDeadlineMs` chuẩn hóa trên kênh công khai. | **PASS** |
| 10 | **Chống phát lại & nhân bản hành động (Replay & Idempotency)** | `requestId` deduplication trong Durable Object + `processedEventIds` + `resolvedChoiceIds` + `expiredControlGrantIds` ngăn tuyệt đối việc phát lại lệnh sau reconnect/hibernation hoặc sau khi hết hạn chiếm quyền Voodoo. | **PASS** |
| 11 | **Khóa biên giới Production** | `starter-fifty-six`, `expansion-1`, `expansion-2`, `full-expansion` đều khóa cứng `enabledInProduction: false`; server từ chối ở cả HTTP lẫn WebSocket với `RULESET_UNAVAILABLE` khi `enableExperimentalRulesets !== true`. | **PASS** |
| 12 | **Kênh rò rỉ thời gian phản ứng & VFX/Log timing** | Xem mục 2 bên dưới (đánh giá trung thực phần tồn dư). | **MITIGATED (RESIDUAL DOCUMENTED)** |

---

## 2. Đánh giá Trung thực các Kênh Thời gian Tồn dư (Residual Timing Side-Channels)

Chúng tôi **KHÔNG** tuyên bố đã triệt tiêu hoàn toàn 100% mọi kênh rò rỉ thời gian (timing side-channel) trên mạng thực tế:

1. **Độ trễ tương tác phản ứng bí mật (`choice-secret-*`):** Dù payload công khai đã che `choiceId` (`choice-secret-*`), `ownerPlayerId = null`, `kind = null`, chuẩn hóa `publicDeadlineMs`, và cho phép `SET_REACTION_PREF = AUTO_DECLINE` phản hồi `< 1ms`, việc bàn đấu tạm dừng trong vài giây khi một người chơi đang ở chế độ `ASK` cân nhắc phản ứng (`Vengeful Spirit`, `Undying`, `Arnold`, `Cindy`, `Usurper`) vẫn có thể tạo tín hiệu thời gian cho người chơi có kinh nghiệm suy đoán có ai đó trên bàn đang sở hữu vai phản ứng kín.
2. **Nhịp độ phản hồi khi Voodoo tạm dừng vì lá `inv-*` (`pausedForOwnerDecision`):** Công khai hiển thị cờ `pausedForOwnerDecision: true` khi nạn nhân rút lá Điều tra (`inv-*`) nhằm giúp UI giải thích lý do Voodoo tạm chờ — việc này tiết lộ **thời điểm** nạn nhân đang xử lý lá Điều tra (điều vốn đã công khai do ô rút bài Xanh), nhưng **không** tiết lộ nội dung lá bài hay kết quả điều tra.
3. **Hướng cải thiện sau Beta:** Chế độ `competitiveReactionTiming` có thể mở rộng thêm cửa sổ chờ đồng nhất (uniform padded reaction window) nếu kết quả Human Beta Playtest cho thấy người chơi khai thác độ trễ suy nghĩ trong thi đấu xếp hạng.
