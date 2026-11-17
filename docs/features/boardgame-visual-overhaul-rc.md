# Bóng Đêm KTX Visual Overhaul — Báo cáo Release Candidate (RC)

> **Trạng thái Phát hành:** `READY_FOR_APPROVAL`  
> **Nhánh làm việc:** `feat/boardgame-visual-prototype` *(chưa merge vào `main`, chưa deploy production)*  
> **Phạm vi kiểm tra:** Toàn bộ 4 giai đoạn Visual Overhaul (**Prototype 2:3** → **Combat VFX & Visual Event Queue** → **Thư viện 57 Asset & Tabletop KTX** → **Âm thanh Đa lớp, Đồ họa 3 Mức & QA/E2E**).  
> **Cam kết bất biến Gameplay:** `0 diff` trong `features/boardgame/domain/`, `shared/contracts/` và `worker/`.

---

## 1. Kiến trúc Âm thanh Đa lớp & Đồng bộ Visual Event Queue

### 1.1. Engine WebAudio Đa lớp (`features/boardgame/ui/sound.ts`)
Thay vì phát các nốt beep đơn lẻ nối trực tiếp ra `destination`, `sound.ts` sử dụng đồ thị WebAudio thủ tục khép kín (zero asset ngoài mạng, khởi tạo lười khi có thao tác người dùng):
- **Chuỗi xử lý Master:** `Layer Sources (Oscillators + PCM Noise Buffers) → BiquadFilterNode (sweep) → masterGain (0.85) → DynamicsCompressorNode (threshold -14dB, knee 18, ratio 6) → AudioContext.destination`.
- **Sample PCM ngắn thủ tục (tạo 1 lần với PRNG `mulberry32`, ~30 KB RAM):**
  - `paper` (`0.14s`): ma sát giấy cán mờ cho `playCardDraw` & `playCardFlip`.
  - `diceClick` (`0.045s`): xung va chạm acrylic/gỗ nảy 4 nhịp cho `playDiceRoll` (có hợp âm nhấn khi `freeChoice` tổng 7).
  - `blade` (`0.18s`): tiếng xé gió kim loại cho `playSlashHit` (thường / Masamune nguyền rủa), `playSpearThrust` & `playCutInWhoosh`.
  - `gunCrack` (`0.09s`): xung đạn + tiếng vỏ đồng leng keng cho `playGunfireBurst` (`HANDGUN_SHOT` / `MACHINE_GUN_BARRAGE`).
  - `arcCrackle` (`0.32s`): xung hồ quang cao áp cho `playLightningStrike` (Vy Radio) & `playExplosionImpact`.
- **Các cue đồng bộ thêm:** `playCounterStrike` (đỡ đòn kim loại + phản đòn sau 75ms), `playBlockClang`, `playHealShimmer`, `playStealSnatch`, `playRoleReveal(faction?)` (dựa **duy nhất** trên phe đã lộ công khai), `playTurnAlert`, `playEliminationBell`, `playVictoryFanfare`, `playEmotePop`.

### 1.2. Đồng bộ Chống Trùng theo Visual Event Queue & Quản lý Tài nguyên
- **Hàm điều phối duy nhất `playSoundForVisualEvent(event)`:** Gọi tại đúng thời điểm kích hoạt trong [`BoardGameVfxStage.tsx`](../../features/boardgame/ui/BoardGameVfxStage.tsx) (`enqueueEvents` cho xúc xắc/rút bài/combat và cut-in pump cho từng banner điện ảnh). Toàn bộ `useEffect` phát âm trùng ở [`GameBoard.tsx`](../../features/boardgame/ui/GameBoard.tsx) đã được gỡ bỏ.
- **Chống phát trùng Reconnect & Sync lặp:**
  - `VisualEventTracker` dùng `sessionStorage` chặn sự kiện lịch sử khi F5 reload/reconnect.
  - `sound.ts` lưu thêm bộ đệm FIFO `MAX_PLAYED_EVENT_IDS = 256` khử trùng theo `event.id`.
- **Chống nghẽn & dọn bộ nhớ khi quay về 3D Campus:**
  - Cooldown theo nhóm (`55ms–90ms`) gộp các event nổ cùng mili-giây (nhiều mục tiêu Súng Liên Thanh), giới hạn `MAX_ACTIVE_VOICES = 14`.
  - `stopAllBoardGameSounds()` dừng tức thì mọi node đang phát khi nhấn **Mute** hoặc **Skip Cinematic**.
  - `suspendBoardGameAudio()` được gọi trong cleanup `useEffect` unmount của `GameBoard` và `BoardGameVfxSandbox`, trả `AudioContext` khỏi trạng thái `running` (`activeVoices === 0`) khi rời bàn quay lại khuôn viên 3D.

---

## 2. Tài liệu Cấu hình Đồ họa 3 Mức & Trợ năng (`features/boardgame/ui/graphics-settings.ts`)

Lưu bền vững tại `localStorage` key `hustverse:bg-graphics-prefs:v1`, áp dụng nhất quán cho cả bàn chơi thực tế (`GameBoard.tsx`) và phòng lab thử nghiệm (`BoardGameVfxSandbox.tsx` / `BoardGameVisualPrototypeView.tsx`).

| Tham số thực thi | `High` | `Balanced` *(Mặc định Mobile)* | `Low` *(Mặc định OS Reduced Motion / <=2 nhân)* |
| :--- | :--- | :--- | :--- |
| **`dprCap` (Canvas 2D VFX)** | `2.0×` | `1.5×` | `1.0×` |
| **`particleScale` (Tia lửa / Hạt)** | `1.0` (100%) | `0.55` (55%) | `0` (chỉ giữ đường chém vector) |
| **`enableBackdropBlur`** | `true` | `false` *(thay bằng nền tối độ tương phản cao)* | `false` |
| **`enableFoil` (Foil Shimmer)** | `true` | `true` | `false` |
| **`enable3DTilt` (Nghiêng thẻ 3D)** | `!coarsePointer` | `false` | `false` |
| **`enableMistDrift` (Sương trên 6 ô KTX)** | `true` | `false` | `false` |
| **`pawnGlideDurationMs` (Trượt FLIP)** | `520ms` | `340ms` | `0ms` |
| **`enableScreenShake` (Rung mạnh)** | Theo công tắc người dùng (`true` mặc định) | Theo công tắc người dùng | `false` *(tự tắt ở Low)* |

### 2.1. Quy tắc Tự động Nhận diện (`detectAutoQualityTier`)
1. Chọn **`Low`** nếu bật `prefers-reduced-motion: reduce`, hoặc `hardwareConcurrency <= 2`, hoặc `deviceMemory <= 2 GB`.
2. Chọn **`Balanced`** nếu con trỏ cảm ứng (`pointer: coarse`), chiều rộng viewport `< 768px` (bao gồm mobile `390×844`), hoặc `hardwareConcurrency <= 4`.
3. Chọn **`High`** trên desktop đủ tài nguyên.

### 2.2. Công tắc Người dùng trên Giao diện (`bg-graphics-settings-panel`)
- Mở bằng nút **`⚙️`** trên thanh trạng thái `bg-v3-status-bar` (đặt panel riêng ngoài header để không làm tràn màn hình `390×844`):
  - **Mức đồ họa:** `Tự động` (`bg-quality-auto`), `Cao (High)` (`bg-quality-high`), `Cân bằng (Balanced)` (`bg-quality-balanced`), `Thấp (Low)` (`bg-quality-low`).
  - **Rung màn hình & Chớp mạnh:** `bg-shake-toggle-btn` cho phép tắt riêng rung mạnh ngay cả khi vẫn giữ mức `High` VFX.
  - **Giảm chuyển động:** `bg-reduced-motion-toggle-btn` / `bg-vfx-motion-toggle-btn` đồng bộ hai chiều với `localStorage`.
  - **Âm thanh (Mute) & Skip Cinematic:** `bg-sound-toggle-btn` / `bg-panel-mute-toggle-btn` và `bg-skip-vfx-btn` / `bg-panel-skip-cinematic-btn`.

---

## 3. Tối ưu React Rerender, GPU & Bộ nhớ

- **Memoization (`React.memo` & `useCallback`):**
  - Bọc `React.memo` cho `TabletopLocationTile`, `MidnightCharacterCard`, `MidnightActionCard`, `RoleCard`, `GameLog`, `MidnightCardZoomModal`, `BoardGameVfxStage`, và `PlayerPawnToken`.
  - Ổn định callback `dispatchAction` (dùng ref cho `onAction` & `actionBusy` để không re-render các ô bàn cờ mỗi nhịp đếm giây `nowMs` 500ms) và `useMemo` cho `boardClusters`.
  - Trong `BoardGameVfxStage`, thu hẹp dependency của `useEffect` vẽ đường nhắm mục tiêu sang chữ ký vị trí người chơi (`playersLocationSig`) thay vì tham chiếu object `publicGame`.
- **Giải phóng GPU & Animation Cleanup:**
  - `useBoardGameVfxQueue` hủy toàn bộ timeout/`requestAnimationFrame`, xóa hàng đợi animation và đặt `canvas.width = 0; canvas.height = 0` khi unmount để giải phóng buffer GPU ngay lập tức.
  - `useSmoothPawnGlide` lưu tập các `Animation` đang chạy trong `Set<Animation>` và gọi `.cancel()` khi đổi `matchId` hoặc unmount.
  - `CampusScene` 3D nhận `suspend3D={bgGameActive}` trong `app/page.tsx`, tạm dừng vòng render WebGL khi đang mở bàn chơi 2D và phục hồi ngay khi rời bàn.

---

## 4. Báo cáo Hiệu năng Thực đo (Performance Report)

### 4.1. Đo đạc 2D Board Game & VFX Burst (`test/boardgame-visual-prototype.cjs`)
- **Môi trường đo:** `Headless Chromium` (Linux, `SwiftShader` software rendering), build tĩnh xuất bản từ `npm run build` (`Next.js 14.2.5`, trang `/` `225 kB` / `317 kB First Load JS`, trang `/boardgame-prototype` `52 kB` / `144 kB First Load JS`), đo tại `2026-11-17T03:23:31.105Z` (lưu tại `test-results/boardgame-prototype/rc-perf-report.json`).
- **Kịch bản đo mỗi mức:** Bắn chuỗi VFX nặng liên hoàn trong ~950ms (`Súng Liên Thanh đa mục tiêu + BLOCK` → `Vy Radio Xung Cao Áp 1d6 + Cut-in chân dung lớn` → `Masamune + Dũng Phản Kích`).

| Hồ sơ đo | Viewport | Frames / Window | Avg Frame | p50 Frame | p95 Frame | Max Frame | Measured rAF Cadence | JS Heap Used | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Desktop `High` | `1440×900` | `57` / `958ms` | `16.66 ms` | `16.7 ms` | `16.8 ms` | `16.8 ms` | `60.0 Hz` | `7.89 MB` | Đủ hạt 100%, DPR cap `2×`, blur BẬT |
| Desktop `Balanced` | `1440×900` | `57` / `963ms` | `16.66 ms` | `16.7 ms` | `16.7 ms` | `16.8 ms` | `60.0 Hz` | `8.68 MB` | Hạt 55%, tắt blur & mist |
| Desktop `Low` | `1440×900` | `57` / `960ms` | `16.67 ms` | `16.7 ms` | `16.8 ms` | `16.8 ms` | `60.0 Hz` | `9.36 MB` | `0` hạt, giữ đường chém vector, tắt shake/foil |
| Mobile `Auto → Balanced` | `390×844` | `57` / `954ms` | `16.67 ms` | `16.7 ms` | `16.8 ms` | `16.8 ms` | `60.0 Hz` | `10.75 MB` | Tự nhận `balanced`, `0` mist elements, `0 px` overflow |

> **Giải thích trung thực về số liệu:** Trong Headless Chromium không có màn hình >60Hz, `requestAnimationFrame` đồng bộ theo nhịp vsync `16.67 ms` (60 Hz). Việc `maxFrameMs <= 16.8 ms` trên cả Desktop lẫn Mobile cho thấy không có khung hình nào bị trễ nhịp vsync trong chuỗi burst Canvas 2D + Cut-in. Lưu ý hiệu năng trên thiết bị di động thật phụ thuộc GPU thực tế của từng máy (do môi trường đo là Linux/SwiftShader), vì vậy chế độ `Auto` chủ động hạ xuống `Balanced` (tắt `backdrop-blur`, sương KTX, tilt 3D, giảm 45% hạt và cap DPR ở `1.5×`) để giảm tải fill-rate GPU trên điện thoại.

- **Chỉ số trang & Tải tài nguyên:**
  - `CLS` (Cumulative Layout Shift): **`0`**
  - Số WebGL context phụ do Bóng Đêm KTX tạo ra: **`0`**
  - Overflow ngang: Desktop `0 px`, Mobile `390×844` `0 px`
  - Artwork WebP giải mã duy nhất: **`57/57`** (`16` ảnh priority eager trên màn hình đầu + `117` lượt `loading="lazy"` ở lưới 10 nhân vật / 40 thẻ; tổng dung lượng thư viện WebP giữ nguyên tối ưu từ Giai đoạn 2).

### 4.2. Kiểm toán Cách ly Khuôn viên 3D (`test/boardgame-bg1-smoke.cjs` & `test/boardgame-e2e.cjs`)
- Trước khi vào CLB Board Game KTX (SwiftShader 3D WebGL phần mềm): `canvasCount = 2`, `frames = 2` trong cửa sổ 800ms.
- Sau khi vào CLB → ngồi bàn → mở luật → đóng quay về sân KTX:
  - `campus3dAfter`: `canvasCount = 2`, `frames = 2` trong cửa sổ 800ms (tương đương trước khi mở).
  - `lingeringBoard = 0`, `lingeringVfxCanvas = 0`, `audioActiveVoices = 0`, `audioContextState = "uninitialized"` (hoặc `suspended` sau khi bàn thật phát audio, được kiểm chứng thêm trong `E2E-01` exit audit).
  - `PR10b Transition Race` (33 lần chuyển tầng liên tiếp ở Thư viện Tạ Quang Bửu): PASS (`geometries = 1982`, `textures = 155`, `calls = 1525`).

---

## 5. Báo cáo Kiểm thử & Cổng CI (`exit code 0` Toàn bộ)

| Cổng CI / Bộ kiểm thử | Lệnh chạy thực tế | Kết quả | Chi tiết ghi nhận |
| :--- | :--- | :--- | :--- |
| Gate 1 — TypeScript | `npm run typecheck` | **PASS** (0) | Frontend + Shared Contracts + Cloudflare Worker (`tsc --noEmit`) |
| Gate 2 — Learn Engine | `npm run test:learn` | **PASS** (0) | `45/45` unit tests HSK & SRS |
| Gate 3 — Shared Contracts | `npm run test:contracts` | **PASS** (0) | Đồng bộ `BOUNDS`, tốc độ di chuyển, khôi phục Durable Object |
| Gate 3b — World / Avatar / UI / Study / VFX | `npm test` (bao gồm `ui-gameplay`, `boardgame-vfx`) | **PASS** (0) | Bao gồm `5/5` tests của `boardgame-vfx.test.cjs` (VFX Queue, Quality 3 mức, Audio Dedupe/Cooldown/Mute) |
| Gate 4 — Campus Nav | `npm run test:nav` | **PASS** (0) | `4/4` chặng A* `ROADS` |
| Gate 5 — Multiplayer Sync | `npm run test:mp` | **PASS** (0) | `21/21` scenarios giao thức WebSocket |
| Gate 5b — Board Game Logic & DO Simulation | `npm run test:boardgame` | **PASS** (0) | Lounge + Lobby DO + Engine + Match DO + mô phỏng cân bằng `4,500` trận `4p–8p` |
| Gate 6 — Production Static Build | `npm run build` | **PASS** (0) | `Next.js 14.2.5` export `out/` sạch, `0` lỗi lint/type |
| Prototype Visual & Perf Regression | `PLAYWRIGHT_CORE_PATH=... node test/boardgame-visual-prototype.cjs` | **PASS** (0) | Desktop `1440×900` & Mobile `390×844`, `CLS=0`, `0` WebGL phụ, 3 mức đồ họa, Shake OFF, Mute/Skip, rAF telemetry |
| Gate 8a — Multiplayer E2E (All 4 Scenarios) | `PLAYWRIGHT_CORE_PATH=... node test/boardgame-e2e.cjs` | **PASS** (0) | **E2E-01+04** (`B4FJ8T`, `370` frames, mobile `11` actions, `1200×675` postcard); **E2E-02** (`A9G5JA`, `8` người + khán giả thứ 9 cô lập P0); **E2E-03** (`TS7SRL`, reconnect 5 mốc, `0` phát trùng); **E2E-05+06** (2 bàn song song + `4` WS security probes) |
| Gate 8b — BG1 Lounge Smoke & 3D Isolation | `PLAYWRIGHT_CORE_PATH=... node test/boardgame-bg1-smoke.cjs` | **PASS** (0) | Desktop + Mobile `390×844`, trước/sau khi mở & đóng CLB không rò DOM/Canvas/Audio |
| Gate 7 — Library Navigation & Camera Race | `PLAYWRIGHT_CORE_PATH=... npm run test:pr10b` | **PASS** (0) | 11/11 presets + camera 360° + 33 floor transition race |

---

## 6. Release Checklist

- [x] `features/boardgame/ui/sound.ts` nâng cấp âm thanh đa lớp WebAudio + PCM buffer thủ tục cho đủ rút/lật bài, xúc xắc, chém, Masamune, thương, súng, tia sét, phản kích, nổ, khiên, hồi máu, cướp, lật vai, chuyển lượt, hạ gục, chiến thắng.
- [x] Đồng bộ 100% SFX với `VisualEventTracker` & `BoardGameVfxStage`, không phát trùng khi reconnect hay nhiều event đồng thời.
- [x] Hỗ trợ đầy đủ 3 mức Graphics Quality (`High / Balanced / Low` + `Auto`), `Mute`, `Skip Cinematic`, `Reduced Motion`, và công tắc tắt rung mạnh (`shakeEnabled`).
- [x] Tối ưu `React.memo`, callback ổn định, cleanup animation/`rAF`/Canvas 2D & `suspendBoardGameAudio()`, không ảnh hưởng 3D campus khi đóng game.
- [x] Toàn bộ cổng CI (`typecheck`, `test`, `test:boardgame`, `build`, `test:pr10b`, `boardgame-visual-prototype`, `boardgame-e2e`, `boardgame-bg1-smoke`) đều PASS (`exit code 0`).
- [x] Bỏ chế độ che/úp bài cục bộ chống nhìn lén màn hình cho cả thẻ nhân vật (`RoleCard`) và bài rút trên tay (`ActionPanel` / `CARD_DRAW`) vì mỗi người chơi trên thiết bị riêng, giữ nguyên bảo mật P0 với đối thủ & khán giả trên server.
- [x] Bảo toàn tuyệt đối logic game và bảo mật P0 (`0 diff` trong `domain/`, `shared/contracts/`, `worker/`).
- [x] Giữ nguyên trên nhánh `feat/boardgame-visual-prototype` để chờ duyệt (chưa merge `main`, chưa deploy production).

**Kết luận:** **`READY_FOR_APPROVAL`**
