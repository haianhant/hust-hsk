# Bóng Đêm KTX v3 — Báo Cáo Kiểm Thử Tổng Hợp (`GV3.1 – GV3.5`)

> **Phạm vi kiểm chứng:** Toàn bộ kiến trúc Board Game Club 3D (`world`), Động cơ luật **v3 (`BOARD_GAME_RULESET_VERSION = 3`)**, Cloudflare Worker Durable Object (`BoardGameRoom` & `__lounge_directory__`), UI 2D (`BoardGameLobby`, `GameBoard`, `RoleCard`, `ActionPanel`, `MatchResult`, `MatchPostcard`), Mô phỏng 4.500 ván, E2E đa trình duyệt và toàn bộ cổng hồi quy `GEMINI.md`.

---

## 1. Bảng Cổng Kiểm thử Bắt buộc (`GV3.5`)

| Nhóm kiểm thử | Lệnh thực thi | Số lượng Test / Kịch bản | Trọng tâm xác minh |
|---|---|---:|---|
| **TypeScript Multi-Project** | `npm run typecheck` (`tsc --noEmit && tsc --noEmit -p worker/tsconfig.json`) | 2 project (`web` + `worker`) | Kiểu `BOARD_GAME_RULESET_VERSION = 3`, hợp đồng chia sẻ `shared/contracts/boardgame.ts`, Worker DO |
| **CLB 3D & Va chạm (`BG1`)** | `node --test test/boardgame-lounge.test.cjs` | 5 test | Biên KTX (`B6/B7/Căng tin`), `2 bàn × 8 ghế = 16 ghế`, collider phòng, camera clamp & telemetry |
| **Lobby DO & SQLite (`BG2`)** | `node --test test/boardgame-lobby-do.test.cjs` | 6 test (`11/11` khi chạy gộp Lounge + Lobby DO) | Join atomic theo bàn (`table-1/2`), mã mời 6 ký tự, tối đa 8 người + từ chối thứ 9 `ROOM_FULL`, Spectator read-only, token băm SHA-256, fence `4001`, hibernation SQLite, chuyển host & Origin guard |
| **Động cơ Luật v3 & Bảo mật P0** | `node --test test/boardgame-engine.test.cjs` | 9 test | Setup `4–8p` (`rulesetVersion = 3`, `11/12/13 HP`), vòng 3 pha `MOVE_OR_STAY -> LOCATION_ACTION -> MAIN_ACTION`, toàn bộ 9 nhân vật + kỹ năng/hồi chiêu/nội tại, 26 thẻ bài + giới hạn 4 lá tay/2 trang bị, bảng chân trị `inv-01..inv-09`, anti-leakage §18 (`hp/maxHp/roleId/hand/protegePlayerId`), Bình Tĩnh Tự Vệ, Kỷ luật Gác Đèn, Hải/Trang solo win, Bình co-win, Phiên Trực Cuối Đêm |
| **Match DO v3 & §19 Resilience** | `node --test test/boardgame-match-do.test.cjs` | 5 subtest (+ 1 suite wrapper) | Trận `4p + Spectator` tới `FINISHED` + kiểm tra mọi frame WS & zero-MSSV, 2 trận song song + Idempotency `requestId` + `STALE_REVISION` + `4001`, đồng hồ đơn `40s/lượt`, ngắt kết nối 8p + `alarm()` `12s` trung lập + hibernation, tự động chốt an toàn bản ghi SQLite v1/v2 cũ lên `FINISHED` |
| **Cân bằng 8 Bot (`4.500` ván)** | `node test/boardgame-sim.cjs` | 4.500 ván (`900 × [4,5,6,7,8]`) | Cô lập `(pub, priv)` với `0` vi phạm, `0` kẹt, `0` hòa, Guard `49,31%` / Mist `42,82%`, Lang Thang `43,00%`, tất cả 9 vai `[38,08%..51,41%]` trong `[20%, 68%]`, chết V1 `0%` |
| **Gộp `npm run test:boardgame`** | `npm run test:boardgame` | **26/26** Node test + **4.500** ván sim | Cổng kiểm thử Board Game tự động gộp trong CI |
| **E2E Đa Trình Duyệt (`BG4`)** | `node test/boardgame-e2e.cjs` | 4 context Playwright (Desktop + `390×844` Mobile) | Tạo trận trên HUD, tham gia bằng `?bgInvite=CODE`, kiểm tra WebSocket frame `rulesetVersion = 3` (zero leak `hp`/`maxHp`/vai chưa lật), bảo mật Úp/Mở vai trên Desktop & Mobile, reconnect `F5`, hoàn thành ván thực tế, xuất Bưu thiếp PNG `1200×675` (zero MSSV), thoát sạch về sân KTX |
| **HSK Engine & SRS** | `npm run test:learn` | 45 test | Toàn bộ unit test học từ vựng HSK & lặp lại ngắt quãng SRS |
| **Shared Contracts** | `npm run test:contracts` | 12 test | `BOUNDS`, tốc độ di chuyển, `HskRoom` DO hibernation, ghế thư viện & đồng bộ bóng đá/board game |
| **Campus Navigation** | `npm run test:nav` | 4 chặng | Điều hướng A* trên mạng lưới đường `ROADS` sân trường ĐHBK Hà Nội |
| **Campus Multiplayer WS** | `npm run test:mp` | 33 kiểm tra | Giao thức multiplayer 3D sân trường, ghế học, emote/chat, đồng bộ board game/bóng đá qua Worker shim |
| **Static Export Build** | `npm run build` | Next.js `out/` | Biên dịch và xuất bản tĩnh toàn bộ ứng dụng (`out/`) thành công |

---

## 2. Xác minh Anti-Leakage (§18) & Di trú Dữ liệu Bền vững (§19)

1. **Tách kênh Public / Unicast Private:**
   - Trong `test/boardgame-engine.test.cjs` và mọi frame WebSocket của `test/boardgame-match-do.test.cjs` lẫn `test/boardgame-e2e.cjs`: kiểm tra trực tiếp không tồn tại các trường nhạy cảm (`hp`, `maxHp`, `protegePlayerId`, `reconnectTokenHash`, `mssv`, `gameStateJson`) trong `publicGame`, và mọi người chơi chưa lật vai đều có `revealedRoleId = null`, `revealedFaction = null`, `revealedMaxHp = null`.
   - Khán giả (`isSpectator = true`) nhận `privateView = null` và mọi thao tác thay đổi ván bị từ chối với mã `SPECTATOR_READ_ONLY`.
2. **Bảo mật màn hình khi chơi gần nhau:**
   - `RoleCard`, `ActionPanel`, `GameBoard` tuân thủ trạng thái `hiddenOnScreen = true` (mặc định úp thẻ): che kín toàn bộ tên bài trên tay, nút thao tác riêng và tên kỹ năng chưa lật để tránh người ngồi cạnh nhìn lén màn hình; chỉ hiển thị khi người chơi chủ động mở thẻ (`desktop` và `mobile 390×844`).
3. **Di trú SQLite v1/v2 → v3 không phá hủy (`worker/src/boardgame-room.ts`):**
   - Bảng SQLite của Durable Object (`matches`, `match_players`, `processed_requests`, `directory_matches`) được giữ nguyên hoàn toàn không chỉnh sửa `[[migrations]]`.
   - Các phòng v1/v2 tồn đọng khi có kết nối `BG_STATE_SYNC` được tự động đóng chốt sang `FINISHED` sạch sẽ thay vì ném ngoại lệ hay xóa DB.

---

## 3. Kết luận Nghiệm thu Kỹ thuật (`GV3.5`)

- Toàn bộ kiến trúc v3 (`features/boardgame/domain`, `shared/contracts/boardgame.ts`, `worker/src/boardgame-room.ts`, `features/boardgame/ui`, `test/*`, `docs/features/boardgame-v3-*`) đạt trạng thái hoàn chỉnh, ổn định cả trên logic thuần TypeScript, Cloudflare Durable Objects SQLite, mô phỏng 4.500 ván 8-bot và trình duyệt Playwright thực tế đa màn hình mà không ảnh hưởng các hệ thống 3D campus, thư viện, Pomodoro hay HSK hiện có.
