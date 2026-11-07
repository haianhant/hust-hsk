// ---------------------------------------------------------------------------
// lib/multiplayer.ts — Client WebSocket cho đợt 5 (multiplayer).
// Phỏng theo lib/multiplayer.ts của Chùa Online 3D (đã chứng minh live):
// cùng protocol (join/move/state/ping, welcome/join/leave/move/state/count),
// cùng luật (reconnect backoff, heartbeat 30 s, gửi move 10 lần/giây khi
// đổi, reconnect cùng sessionId để không trùng avatar).
//
// Khác chùa ở: join kèm MSSV (server validate 8 chữ số); state thêm
// 'running' và 'riding'; màu áo do server hash từ sessionId (không có
// đỏ HUST — người chơi chính luôn mặc polo đỏ).
//
// KHÔNG đồng bộ điểm/quest/SRS/huy hiệu. Mất kết nối → chơi một mình,
// status 'offline' để HUD ghi rõ — không bao giờ báo số người giả.
// ---------------------------------------------------------------------------

export type RemoteState = 'idle' | 'walking' | 'running' | 'riding';

export interface RemotePlayer {
  id: string;
  name: string;
  mssv: string;
  color: string;
  x: number;
  z: number;
  facing: number;
  state: RemoteState;
}

export type MpStatus = 'idle' | 'connecting' | 'online' | 'offline';

export interface MultiplayerSnapshot {
  status: MpStatus;
  roomId: string | null;
  count: number;
  players: RemotePlayer[];
  selfId: string | null;
  error: string | null;
}

const WS_URL =
  process.env.NEXT_PUBLIC_HUST_MULTIPLAYER_WS_URL ||
  'wss://hust-hsk-rooms.hunganhz179.workers.dev/ws';

const HEARTBEAT_MS = 30000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const MAX_RECONNECTS = 10;

type Listener = (snap: MultiplayerSnapshot) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private status: MpStatus = 'idle';
  private roomId: string | null = null;
  private count = 0;
  private players = new Map<string, RemotePlayer>();
  private selfId: string | null = null;
  private error: string | null = null;
  private sessionId = '';
  private name = '';
  private mssv = '';
  private reconnects = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;
  private listeners = new Set<Listener>();

  get snapshot(): MultiplayerSnapshot {
    return {
      status: this.status,
      roomId: this.roomId,
      count: this.count,
      players: Array.from(this.players.values()),
      selfId: this.selfId,
      error: this.error,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const snap = this.snapshot;
    for (const fn of Array.from(this.listeners)) {
      try {
        fn(snap);
      } catch {
        // Listener lỗi không được làm sập client.
      }
    }
  }

  private setStatus(status: MpStatus, error: string | null = null) {
    this.status = status;
    if (error !== null) this.error = error;
    this.emit();
  }

  connect(sessionId: string, name: string, mssv: string) {
    this.sessionId = sessionId;
    this.name = name;
    this.mssv = mssv;
    this.intentionalClose = false;
    this.reconnects = 0;
    this.error = null;
    this.openSocket();
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.players.clear();
    this.roomId = null;
    this.count = 0;
    this.selfId = null;
    this.setStatus('idle');
  }

  /** Gửi vị trí + hướng + trạng thái hiện tại (gọi ~10 lần/giây khi đổi). */
  sendMove(x: number, z: number, facing: number, state: RemoteState) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.selfId) return;
    try {
      this.ws.send(JSON.stringify({ type: 'move', x, z, facing, state }));
    } catch {
      // ignore — lần gửi sau sẽ thử lại
    }
  }

  private openSocket() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      this.scheduleReconnect('Không mở được kết nối.');
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.reconnects = 0;
      ws.send(
        JSON.stringify({
          type: 'join',
          sessionId: this.sessionId,
          name: this.name,
          mssv: this.mssv,
        }),
      );
      this.startHeartbeat();
    };

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      switch (msg.type) {
        case 'welcome': {
          this.selfId = typeof msg.id === 'string' ? msg.id : null;
          this.roomId = typeof msg.roomId === 'string' ? msg.roomId : null;
          this.count = typeof msg.count === 'number' ? msg.count : 0;
          this.players.clear();
          const list = Array.isArray(msg.players) ? msg.players : [];
          for (const p of list) {
            const rp = toRemotePlayer(p);
            if (rp && rp.id !== this.selfId) this.players.set(rp.id, rp);
          }
          this.setStatus('online', null);
          break;
        }
        case 'join': {
          const rp = toRemotePlayer(msg.player);
          if (rp && rp.id !== this.selfId) this.players.set(rp.id, rp);
          this.emit();
          break;
        }
        case 'leave': {
          if (typeof msg.id === 'string') this.players.delete(msg.id);
          this.emit();
          break;
        }
        case 'move': {
          // Vị trí đổi trong object cũ (mutate in place) — RemotePlayers
          // đọc trực tiếp qua ref trong useFrame nên KHÔNG emit ở đây:
          // emit mỗi tin move (10/giây/người) sẽ re-render cả page.
          if (typeof msg.id !== 'string') break;
          const p = this.players.get(msg.id);
          if (!p) break;
          if (typeof msg.x === 'number') p.x = msg.x;
          if (typeof msg.z === 'number') p.z = msg.z;
          if (typeof msg.facing === 'number') p.facing = msg.facing;
          if (typeof msg.state === 'string' && isRemoteState(msg.state)) p.state = msg.state;
          break;
        }
        case 'state': {
          // Như move: chỉ đổi trạng thái trong object cũ, không emit.
          if (typeof msg.id !== 'string') break;
          const p = this.players.get(msg.id);
          if (p && typeof msg.state === 'string' && isRemoteState(msg.state)) p.state = msg.state;
          break;
        }
        case 'count': {
          if (typeof msg.count === 'number') this.count = msg.count;
          this.emit();
          break;
        }
        case 'full': {
          this.setStatus('offline', 'Phòng đã đầy — đang chơi một mình.');
          this.scheduleReconnect();
          break;
        }
        case 'error': {
          this.setStatus('offline', typeof msg.message === 'string' ? msg.message : 'Lỗi kết nối.');
          break;
        }
        case 'pong': {
          break;
        }
        default:
          break;
      }
    };

    ws.onclose = () => {
      this.stopHeartbeat();
      if (this.intentionalClose) return;
      // Mất kết nối giữa chừng: vẫn giữ danh sách cũ trên màn hình cho
      // tới khi reconnect thành công, nhưng status nói rõ là offline.
      this.setStatus('offline', 'Mất kết nối — đang chơi một mình.');
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose sẽ xử lý tiếp (reconnect + status offline).
    };
  }

  private scheduleReconnect(reason?: string) {
    if (this.intentionalClose) return;
    if (this.reconnects >= MAX_RECONNECTS) {
      this.setStatus('offline', reason ?? 'Không kết nối được — đang chơi một mình.');
      return;
    }
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnects, RECONNECT_MAX_MS);
    this.reconnects += 1;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.intentionalClose) this.openSocket();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // ignore
        }
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

function isRemoteState(s: string): s is RemoteState {
  return s === 'idle' || s === 'walking' || s === 'running' || s === 'riding';
}

function toRemotePlayer(raw: unknown): RemotePlayer | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== 'string') return null;
  return {
    id: p.id,
    name: typeof p.name === 'string' ? p.name : 'Bạn',
    mssv: typeof p.mssv === 'string' ? p.mssv : '',
    color: typeof p.color === 'string' ? p.color : '#1F3A5F',
    x: typeof p.x === 'number' ? p.x : -76,
    z: typeof p.z === 'number' ? p.z : 10,
    facing: typeof p.facing === 'number' ? p.facing : 0,
    state: typeof p.state === 'string' && isRemoteState(p.state) ? p.state : 'idle',
  };
}

/** Singleton dùng chung cho cả app (giống chùa). */
export const multiplayer = new MultiplayerClient();
