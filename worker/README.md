# hust-hsk-rooms — Worker multiplayer cho Bách khoa Hán ngữ 3D

Cloudflare Worker + Durable Objects + WebSocket, phỏng theo Worker chùa
(`~/workspace/chua-online/worker/`). Một script riêng, một Durable Object
class riêng (`HskRoom`), không dùng chung Worker chùa.

## Endpoints

- `GET /health` → `{ ok, rooms, capacity }`
- `GET /api/rooms` → số người mỗi phòng (chỉ số, KHÔNG tên/MSSV)
- `GET /ws` → WebSocket upgrade; client được xếp vào phòng đầu tiên còn
  chỗ (`hsk-1`..`hsk-5`, tối đa 15 người/phòng)

## Protocol (client ↔ server, JSON)

| Hướng | Type | Payload |
|---|---|---|
| C→S | `join` | `{ sessionId, name, mssv, ...appearance }` — MSSV phải đúng 8 chữ số |
| C→S | `move` | `{ x, z, facing, state }` — state: idle/walking/running/riding |
| C→S | `state` | `{ state }` |
| C→S | `appearance` | `{ name?, ...appearance }` |
| C→S | `study:claim-seat` | `{ seatId, requestId?, subjectTag? }` — Giữ chỗ 1 trong 4 ghế `library-lobby` |
| C→S | `study:release-seat` | `{ seatId?, requestId? }` — Trả ghế đang ngồi |
| C→S | `study:presence` | `{ presence: { status, zoneId, seatId, subjectTag, pomodoroPhase, updatedAtMs } }` |
| C→S | `ping` | — |
| S→C | `welcome` | `{ id, roomId, players, count }` — snapshot lúc vào |
| S→C | `study:room-snapshot` | `{ roomId, seats, presences, revision }` — snapshot ghế & trạng thái tự học |
| S→C | `join` | `{ player }` |
| S→C | `leave` | `{ id }` |
| S→C | `move` | `{ id, x, z, facing, state, t }` |
| S→C | `state` | `{ id, state }` |
| S→C | `appearance` | `{ id, name?, ...appearance }` |
| S→C | `study:seat-claimed` | `{ seat, previousSeatId?, revision, requestId? }` |
| S→C | `study:seat-released` | `{ seatId, occupantId, reason?, revision, requestId? }` |
| S→C | `study:seat-rejected` | `{ seatId, reason, occupiedBy?, revision, requestId? }` |
| S→C | `study:presence` | `{ playerId, presence, revision }` |
| S→C | `count` | `{ count }` |
| S→C | `full` | `{ message }` — phòng đã đầy |
| S→C | `error` | `{ message }` — vd MSSV sai định dạng |
| S→C | `pong` | — |

## Luật server

- Trạng thái phòng chỉ giữ trong bộ nhớ (in-memory); không lưu MSSV,
  tên hay vị trí vào storage/log. Rời phòng là quên.
- Giới hạn campus: x −96..96, z −76..86 (như `lib/campus.ts`).
- Giới hạn tốc độ: đi/chạy ≤ 7 m/s, lái xe ≤ 15 m/s (xe tối đa 14).
  Vị trí nhảy quá xa bị kẹp về khoảng đi được kể từ lần cập nhật trước.
- Tên tối đa 30 ký tự, đã lọc ký tự nguy hiểm; MSSV sai định dạng bị
  từ chối ở `join`.
- Màu áo người chơi khác được hash từ sessionId (bảng 8 màu, KHÔNG có
  đỏ HUST — người chơi chính luôn mặc polo đỏ).
- Rate limit 20 msg/s (vượt quá: bỏ tin; vượt gấp đôi: đóng socket).
- Kết nối lại với cùng sessionId thay thế socket cũ — không bao giờ
  trùng avatar.

## Deploy (từ VM)

```bash
# 1. Cài deps lần đầu (typescript + workers-types)
cd ~/workspace/bach-khoa-han-ngu/worker && npm install
# 2. Typecheck + bundle
npx tsc --noEmit
~/workspace/chua-online/worker/node_modules/.bin/esbuild src/index.ts \
  --bundle --format=esm --outfile=dist/worker.js --target=es2022
# 3. Upload — LẦN ĐẦU có migration v1 (tạo class HskRoom);
#    upload lại phải thêm --no-migration (gửi lại migration lỗi 10074)
python3 ~/workspace/custom-connectors/custom.cloudflare/bin/cloudflare_api.py upload \
  --account 692d45feec834c9219a6e331393bbc5c --name hust-hsk-rooms \
  --file dist/worker.js --binding-name HSK_ROOM --class-name HskRoom
# 4. Bật workers.dev subdomain
python3 ~/workspace/custom-connectors/custom.cloudflare/bin/cloudflare_api.py enable-subdomain \
  --account 692d45feec834c9219a6e331393bbc5c --name hust-hsk-rooms
```

URL live: `https://hust-hsk-rooms.hunganhz179.workers.dev`
WebSocket: `wss://hust-hsk-rooms.hunganhz179.workers.dev/ws`

## Frontend

- `lib/multiplayer.ts` — client WebSocket (URL từ env
  `NEXT_PUBLIC_HUST_MULTIPLAYER_WS_URL`, fallback hardcode URL trên).
- `lib/identity.ts` — tên + MSSV, localStorage `bkhn-identity-v1`.
- `components/three/RemotePlayers.tsx` — vẽ người chơi khác + bảng tên
  "Tên (MSSV)".
- Không đồng bộ điểm/quest/SRS/huy hiệu; ngoại tuyến thì chơi một mình
  và HUD ghi rõ như vậy.
