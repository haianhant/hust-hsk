# Bóng Đêm KTX v3 — Kiểm toán v2 & Các Quyết định Thiết kế (`RULESET_VERSION = 3`)

> **Tài liệu thiết kế kiến trúc & luật chơi** cho đợt tái thiết kế **Bóng Đêm KTX v3 — Hidden Role, Investigation & Survival** trong dự án **HUSTVerse — Bách Khoa 3D** (`feat/boardgame-v2-deduction`).

---

## 1. Kiểm toán Toàn diện Động cơ v2 (`76d9815`)

### 1.1. Tổng quan các hệ thống hiện có trong v2
Qua kiểm tra trực tiếp toàn bộ mã nguồn thuộc `features/boardgame/domain/*`, `features/boardgame/ui/*`, `shared/contracts/boardgame.ts`, `worker/src/boardgame-room.ts`, và bộ kiểm thử `test/boardgame-*`:

1. **Vòng lặp lượt v2 (`actions.ts`, `rules.ts`):** `MOVE` (bắt buộc di chuyển sang ô khác) → `DRAW_OR_EXPLORE` (`INTERACT_LOC scan/sabotage` hoặc `DRAW_CARD`) → `TACTICAL_ACTION` (`INVESTIGATE`, `CONFRONT`, `ATTACK`, `DETONATE_PLOT`, `PUBLISH_DOSSIER`, `RECORD_HYPOTHESIS`, `USE_SKILL`, `REVEAL_ROLE`, `END_TURN`).
2. **Hệ thống Điều tra & Sổ tay v2 (`roles.ts`, `effects.ts`, `cards.ts`):** Ma trận Latinh 3×3 (`accessTag` × `traceTag`), hành động `INVESTIGATE` (`equipment` / `activity`), thẻ `clue-01..08`, mảng `evidenceList` và `hypotheses` (bắt buộc ghi chép cho Trang).
3. **Hệ thống Phá hoại & Niêm phong Hạ tầng v2 (`state-machine.ts`, `effects.ts`, `victory.ts`):** `secretSabotageLocation`, `sabotagePlanted`, `sabotagePlantedRound`, `sabotageArmed`, `plotDetonated`, `breakerSealed`, `radioSealed`, `disarmedCount`, `blackoutLocation`, `CONFRONT` + trạng thái `detained`, và chuỗi **Phiên Họp Rạng Sáng (Dawn Inquest)** nhiều tầng.
4. **Hạ tầng Multiplayer & Đồ họa (`worker/src/boardgame-room.ts`, `boardgame-router.ts`, `features/boardgame/world/*`, `BoardGameArt.tsx`, `MatchPostcard.tsx`):** SQLite Durable Object (`matches`, `match_players`, `processed_requests`, `directory_matches`), token kết nối lại CSPRNG 256-bit băm SHA-256, WebSocket Hibernation & fencing `4001`, tách biệt `getPublicGameView` / `getPrivateGameView`, Phòng CLB 3D 16 ghế, nhân vật SVG, WebAudio SFX và Bưu thiếp PNG 1200×675.

### 1.2. Hệ thống GIỮ LẠI & Đơn giản hóa
- **Kiến trúc Multiplayer DO nguyên trạng:** Giữ nguyên `BoardGameRoom`, `boardgame-router.ts`, schema SQLite (tuyệt đối không xóa dữ liệu cũ, không chỉnh `migrations` trong `worker/wrangler.toml`), mã mời 6 ký tự, Ready check, reconnect, fencing, hibernation và tự động vào phòng khi ngồi ghế 3D.
- **Tách kênh P0 (`getPublicGameView` vs `getPrivateGameView`):** Giữ tuyệt đối nguyên tắc không gửi `hp`, `maxHp`, vai chưa lật, bài trên tay hay dữ liệu riêng tư sang kênh công khai hoặc khán giả.
- **3 Phe & 9 Nhân vật HUSTVerse + 6 Khu vực KTX:** Giữ 3 phe (`Đội Gác Đèn`, `Hội Màn Sương`, `Kẻ Lang Thang`), 9 tên/ID nhân vật (`Minh`, `Lan`, `Khánh`, `Tú`, `Vy`, `Dũng`, `Hải`, `Trang`, `Bình`), 6 khu vực (`lobby`, `canteen`, `corridor`, `court`, `radio`, `breaker`) cùng bản đồ nối kề cận và hệ thống đồ họa SVG/MatchPostcard/WebAudio.

### 1.3. Hệ thống LOẠI BỎ khỏi v3
- Loại bỏ hoàn toàn **đường đua điểm Tín hiệu/Màn sương** (đã gỡ ở v2, tiếp tục không dùng).
- Loại bỏ hoàn toàn **Mạch Quá Tải & Phá hoại trạm** (`secretSabotageLocation`, `sabotagePlanted`, `sabotageArmed`, `plotDetonated`, `DETONATE_PLOT`, cửa sổ phản ứng gỡ mạch, `blackoutLocation`).
- Loại bỏ hoàn toàn **Niêm phong hạ tầng** (`breakerSealed`, `radioSealed`, `disarmedCount`, tính điểm hạ tầng).
- Loại bỏ hoàn toàn **Hồ sơ chứng cứ đa lớp & Thắng tức thì bằng công bố** (`PUBLISH_DOSSIER`, `evidenceList`, `RECORD_HYPOTHESIS`, ma trận `accessTag`/`traceTag` phức tạp).
- Loại bỏ hoàn toàn **Hệ thống Đối chất & Tạm giữ song song** (`CONFRONT`, `detained`, `falseAccusationCount`, công thức Dawn Inquest phức tạp).

### 1.4. Các Vấn đề Thiết kế mà v3 Giải quyết Trực tiếp

| # | Vấn đề tồn tại ở v2 (`76d9815`) | Cách v3 giải quyết triệt để |
|---|---|---|
| **1** | **Quá nhiều hệ thống chồng chéo (Cognitive Overload):** Người chơi mới phải hiểu 4 cơ chế song song: Gài mạch + Gỡ/Niêm phong trạm + Ma trận 3×3 + Đối chất Tạm giữ + Hồ sơ giả thuyết. | Rút gọn toàn bộ về một vòng lặp **Hidden-Role Social Deduction & Survival** trực quan: **Di chuyển/Đứng yên → Tương tác Khu vực hoặc Rút thẻ → Dùng Thẻ Điều tra có điều kiện / Trang bị / Tấn công / Phòng thủ / Lật vai & Kỹ năng**. |
| **2** | **Mất cân bằng 4 người Turn 0 (`Màn Sương` thắng 69,4%):** Trong v2, Hội Màn Sương biết đồng đội *và* trạm mục tiêu ngay Turn 0 trong bàn 2v2, dẫn đến phối hợp gài + kích nổ quá áp đảo. | **Ẩn danh toàn bàn từ Turn 0:** Không ai biết vai hay phe của người khác khi bắt đầu (kể cả cùng phe Gác Đèn hay Màn Sương); mọi người đều phải dùng thẻ điều tra và quan sát hành vi để nhận diện đồng minh và kẻ thù. |
| **3** | **Khung HP gốc gợi ý phe:** Trong v2, `10 HP` chỉ có Trang, `11 HP` nghiêng về Lang Thang/Khánh/Vy, còn `12 HP` thu hẹp về Minh/Lan/Tú/Dũng. | Cân bằng đối xứng **3 ngưỡng HP (`11 / 12 / 13`) có mặt đều ở cả 3 phe** (mỗi phe gồm đúng 1 nhân vật 11 HP, 1 nhân vật 12 HP, 1 nhân vật 13 HP), mọi người khởi đầu ở `Sảnh KTX` với `woundsTaken = 0`. |
| **4** | **Reset đồng hồ 45s sau mỗi pha con (`boardgame-room.ts`):** Mỗi lượt kéo dài thành 3–5 lần 45s. | Mỗi lượt dùng **1 ngân sách thời gian duy nhất (`40s` kết nối / `12s` mất kết nối)** theo `turnNumber` + `turnStartedAtMs`; các pha con trong cùng lượt **không reset đồng hồ**. |
| **5** | **Rò rỉ bộ đếm log & dấu vết lén:** `seqCounter` dùng chung khiến ID nhật ký công khai nhảy bậc khi tạo ghi chú riêng tư; kỹ năng lén của Vy tạo cảm giác khó hiểu trên UI. | Tách riêng **`publicLogSeq`** chỉ tăng khi thêm nhật ký công khai; bỏ hoàn toàn kỹ năng lén trước khi lật vai — mọi kỹ năng chủ động đặc biệt chỉ mở sau khi **tự nguyện Lật vai (`REVEAL_ROLE`)**. |
| **6** | **Bắt buộc di chuyển vô nghĩa & thiếu cơ chế chống đánh bừa:** v2 ép luôn phải đi sang ô khác mỗi lượt và thiếu hậu quả rõ cho việc đánh ngẫu nhiên Turn 1. | Cho phép **`STAY` (Đứng yên)** hợp lý về chiến thuật; thêm **Bình Tĩnh Tự Vệ** (đòn đánh vào người chưa lật, chưa từng tấn công và chưa được bạn điều tra bị giảm 1 ST và cho nạn nhân +1 Giáp tạm) và **Kỷ Luật Nội Trú** (Gác Đèn hạ nhầm Gác Đèn bị sốc 2 vết thương + rơi 1 trang bị). |

---

## 2. Thay đổi Hợp đồng Mạng & Chính sách Tương thích Dữ liệu Cũ (`rulesetVersion = 3`)

### 2.1. Thay đổi trong `shared/contracts/boardgame.ts`
- Nâng `BOARD_GAME_RULESET_VERSION = 3 as const`.
- Đặt `BOARD_GAME_DEFAULT_TURN_TIMEOUT_MS = 40_000` và `BOARD_GAME_DISCONNECTED_TURN_TIMEOUT_MS = 12_000`.
- Cập nhật `BoardGameTurnPhase`: `'MOVE_OR_STAY' | 'LOCATION_ACTION' | 'MAIN_ACTION' | 'ENDED'`.
- Cập nhật `BoardGameDeckId`: `'investigation' | 'equipment' | 'event'`.
- Cập nhật `BoardGamePublicPlayerView`: bỏ `detained`, thay bằng `equipped: BoardGameCardPublicMeta[]` (tối đa 2 trang bị công khai đang mang), `tempShield: number`, `attacksMade: number`, `investigationsCount: number`, `stayedLastTurn: boolean`, `wardedUntilRound: number`, `exposedMark: number`.
- Cập nhật `BoardGamePublicGameView`: bỏ toàn bộ trường sabotage/seal/dossier; thêm `turnNumber`, `curfewPressureActive`, `lastInvestigation: BoardGameInvestigationOutcome | null`, `lastRevealEvent: BoardGameRevealEvent | null`.
- Cập nhật `BoardGamePrivateGameView`: gọn nhẹ gồm `roleId`, `roleName`, `faction`, `hp`, `maxHp`, `woundsTaken`, `tempShield`, `skillCooldown`, `revealed`, `secretGoalText`, `protegePlayerId`, `protegeDisplayName`, `protectedProtegeCount`, `avengedProtegeKiller`, `investigatedTargetIds`, `hand`, `equipped`, `privateClues`, `privateNotes`.
- Cập nhật `BoardGameActionPayload`: `MOVE`, `STAY`, `EXPLORE_LOC`, `DRAW_CARD`, `EQUIP_CARD`, `USE_EQUIPMENT`, `INVESTIGATE_CARD`, `PLAY_EVENT`, `ATTACK`, `DEFEND`, `REVEAL_ROLE`, `USE_SKILL`, `END_TURN`.

### 2.2. Quyết định Cơ chế Thẻ Điều tra Có điều kiện (Server Deterministic Resolution vs Target Prompt)
- **Đánh giá 2 phương án:**
  - *Phương án A (Tạm dừng chờ người bị điều tra bấm chọn phản hồi):* Dễ phát sinh kẹt/đợi timeout nếu mục tiêu mất mạng trên mobile, làm chậm nhịp ván đấu và phát sinh lỗi hết giờ lồng nhau.
  - *Phương án B (Máy chủ giải quyết tất định tức thì với tương tác trang bị phòng thủ — ĐƯỢC CHỌN):* Khi người chơi A dùng Thẻ Điều tra lên B, máy chủ kiểm tra ngay điều kiện xác định trên trạng thái thực của B (cùng trang bị phòng hộ như *Kính Chắn Bụi Xưởng Thực Tập*), phát kết quả `outcome: 'condition-met' | 'no-reaction'` rõ ràng qua `lastInvestigation` + nhật ký công khai (nếu có hiệu ứng chung) và ghi manh mối riêng tư cho A. Trận đấu không bao giờ bị treo chờ người mất kết nối, nhưng vẫn giữ trọn tính bất định và khả năng suy luận giao điểm.

### 2.3. Chính sách Tương thích Dữ liệu SQLite v1 / v2 trong `worker/src/boardgame-room.ts`
- **Không xóa dữ liệu SQLite (`matches`, `match_players`), không sửa đổi `[[migrations]]` trong `worker/wrangler.toml`.**
- Khi `loadEngineState()` đọc một bản ghi cũ (`outerVersion !== 3 || rawRecord.rulesetVersion !== 3`):
  1. **Nếu ván cũ đã kết thúc (`match.status === 'FINISHED'` hoặc `rawRecord.finished === true`):** Hàm `adaptLegacyEngineState()` giữ nguyên `winnerLabel`, `winReason`, `winnerPlayerIds` và ánh xạ lại danh sách `finalReveal` sang cấu trúc DTO v3 để người chơi vẫn xem lại được lịch sử và Bưu thiếp kỷ niệm mà không bị sập DO.
  2. **Nếu ván cũ đang dở dang (`PLAYING` theo luật v1/v2):** Không diễn giải nhầm trạng thái cũ theo luật v3; máy chủ tự động khép an toàn sang `finished: true` (`turnPhase: 'ENDED'`), giữ nguyên bảng lật vai lịch sử kèm thông báo rõ: *"Phiên v1/v2 cũ đã được khép an toàn khi nâng cấp lên Luật v3 — bấm Sẵn sàng ván mới để chơi ngay!"*. Khi tất cả bấm Sẵn sàng và Host bấm Bắt đầu, `handleStartMatch` khởi tạo ván mới 100% theo `rulesetVersion = 3`.
