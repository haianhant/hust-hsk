# Phase 8E — Controlled Local Concurrency Load & Soak Report (8E-4)

> **Harness:** [`scripts/bench-phase8e-load-soak.cjs`](../../../../scripts/bench-phase8e-load-soak.cjs) (`npm run test:stability:load`)
> **Environment:** Isolated local Node.js v22 + real `BoardGameRoom` Durable Object + persistent local SQLite + `mini-ws` WebSockets (**zero traffic sent to public production Worker `https://hust-hsk-rooms.hunganhz179.workers.dev`**).
> **Important Confidence Disclaimer:** These measurements evaluate engine + DO SQLite/WebSocket correctness, lock-free isolation, alarm hygiene, and resource stability under local multi-room load. They are **test workload levels, not production Cloudflare edge capacity guarantees**.

---

## 1. Concurrent Room Workloads (`5`, `10`, `25`, `50` Concurrent 4P–8P Rooms)

Each room ran realistic lifecycle traffic: HTTP room creation → 4P–8P WebSocket joins (`classic`, `expansion-1`, `expansion-2`, `full-expansion`) → Ready checks → `BG_START_MATCH` → multi-step game actions (`ROLL_DICE`, `CHOOSE_DEST`, `SKIP_LOC`, `END_TURN`, `RESOLVE_CHOICE`) → mid-match disconnect & reconnect cycle → SQLite 48-card/state invariant audit → clean socket & SQLite disposal.

| Concurrent Rooms | Connected Players | Wall Time | Create p50 / p95 | WS Connect p50 | Action ACK p50 / p95 / p99 | Reconnect Success | Errors / Inv Fails / Log Breaches | Alarms Scheduled | CPU User | Process RSS |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **5** | 30 | `615.0 ms` | `101.6 / 121.4 ms` | `30.1 ms` | `15.1 / 21.5 / 22.4 ms` | **100%** (`5/5`) | `0 / 0 / 0` | `5/5` | `412.9 ms` | `223.8 MB` |
| **10** | 60 | `1,219.2 ms` | `94.3 / 135.6 ms` | `67.6 ms` | `29.5 / 48.2 / 57.9 ms` | **100%** (`10/10`) | `0 / 0 / 0` | `10/10` | `730.8 ms` | `233.2 MB` |
| **25** | 150 | `2,731.0 ms` | `88.6 / 138.6 ms` | `47.7 ms` | `27.7 / 45.3 / 47.5 ms` | **100%** (`25/25`) | `0 / 0 / 0` | `25/25` | `1,339.1 ms` | `250.8 MB` |
| **50** | 300 | `4,992.8 ms` | `83.6 / 108.3 ms` | `46.9 ms` | `27.3 / 38.4 / 53.2 ms` | **100%** (`50/50`) | `0 / 0 / 0` | `50/50` | `2,503.3 ms` | `271.3 MB` |

---

## 2. Extended Multi-Room Soak Test (`12` Cycles · `48` Rooms · `36` Hibernations)

Each soak cycle ran 3 active 4P–6P rooms across rotating rulesets (6 action rounds + mid-match reconnect + forced `hibernateAndWake()` + SQLite invariant check) plus 1 abandoned waiting room cleaned via `BG_LEAVE`.

| Soak Metric | Measured Result | Assessment |
|---|---|---|
| Cycles executed | `12` | Repeatable workload |
| Total rooms created & processed | `48` (`36` active + `12` abandoned) | All cleaned cleanly |
| Forced DO hibernations verified | `36` | `100%` clean rehydration |
| Invariant failures / 48-card breaches | **`0`** | Clean |
| Bounded log breaches (`publicLog > 40` or `visualEvents > 48`) | **`0`** | Bounds enforced |
| Stale `PendingChoice` / alarm leaks / runtime errors | **`0`** | Clean |
| Action ACK p50 latency drift (early 3 cycles → late 3 cycles) | `7.25 ms` → `7.83 ms` (`+0.58 ms`) | Flat (no degradation) |
| V8 HeapUsed (early 3 cycles avg → late 3 cycles avg) | `79.69 MB` → `45.62 MB` (GC stabilized) | No unbounded heap growth |
| Peak Process RSS | `271.95 MB` | Bounded |

---

## 3. Harness vs Real Cloudflare Worker Limitations

1. **Single-process SQLite & event loop:** Local harness shares one Node.js event loop and local SQLite files across all 50 simulated rooms, whereas Cloudflare Workers isolates each Durable Object per room across edge colos.
2. **Network conditions:** Loopback `127.0.0.1` WebSockets have sub-millisecond transport RTT and cannot model mobile packet loss, TLS handshakes, or real Cloudflare WebSocket hibernation billing/limits.
3. **Rate limiter behavior observed:** Rapid sequential actions from a single player within 1ms correctly triggered `RATE_LIMITED` (`action-burst`), confirming the DO anti-abuse throttle operates under bursty load.
