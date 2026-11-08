/**
 * test/ws-shim/mini-ws.js — Zero-dependency RFC 6455 WebSocket & WebSocketServer
 * fallback using built-in Node.js `http`, `crypto`, and `events`.
 *
 * Why this exists:
 * - Locally, Debian/Ubuntu provides `/usr/share/nodejs/ws`.
 * - On fresh CI runners (`ubuntu-latest` with `npm ci`), `ws` is not in the root
 *   `package-lock.json`. This module tries `require('ws')` first (unless
 *   `FORCE_MINI_WS=1` is set) and falls back to a pure Node.js RFC 6455
 *   implementation that implements the exact `ws` API used by `server.js` and
 *   `test-clients.js`.
 */

const crypto = require('crypto');
const http = require('http');
const { EventEmitter } = require('events');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function encodeFrame(opcode, payloadBuf, mask) {
  const len = payloadBuf.length;
  let headerLen = 2;
  if (len >= 126 && len <= 65535) headerLen += 2;
  else if (len > 65535) headerLen += 8;
  const maskBit = mask ? 0x80 : 0x00;
  const maskKey = mask ? crypto.randomBytes(4) : null;
  const frame = Buffer.alloc(headerLen + (mask ? 4 : 0) + len);

  frame[0] = 0x80 | (opcode & 0x0f);
  if (len < 126) {
    frame[1] = maskBit | len;
  } else if (len <= 65535) {
    frame[1] = maskBit | 126;
    frame.writeUInt16BE(len, 2);
  } else {
    frame[1] = maskBit | 127;
    frame.writeBigUInt64BE(BigInt(len), 2);
  }

  let offset = headerLen;
  if (mask && maskKey) {
    maskKey.copy(frame, offset);
    offset += 4;
    for (let i = 0; i < len; i++) {
      frame[offset + i] = payloadBuf[i] ^ maskKey[i & 3];
    }
  } else {
    payloadBuf.copy(frame, offset);
  }
  return frame;
}

class MiniWebSocket extends EventEmitter {
  constructor(urlOrSocket, head, isServer = false) {
    super();
    this.readyState = isServer ? 1 : 0; // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
    this._isServer = isServer;
    this._buffer = Buffer.alloc(0);
    this._socket = null;

    if (isServer) {
      this._attachSocket(urlOrSocket, head);
    } else {
      this._connectClient(urlOrSocket);
    }
  }

  _connectClient(urlStr) {
    const u = new URL(urlStr);
    const key = crypto.randomBytes(16).toString('base64');
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': key,
      },
    });

    req.on('upgrade', (_res, socket, head) => {
      this.readyState = 1;
      this._attachSocket(socket, head);
      this.emit('open');
    });

    req.on('response', (res) => {
      this.readyState = 3;
      this.emit('error', new Error(`Unexpected HTTP status ${res.statusCode}`));
    });

    req.on('error', (err) => {
      this.readyState = 3;
      this.emit('error', err);
    });

    req.end();
  }

  _attachSocket(socket, head) {
    this._socket = socket;
    socket.setNoDelay(true);
    if (head && head.length > 0) {
      this._onData(head);
    }
    socket.on('data', (chunk) => this._onData(chunk));
    socket.on('close', () => {
      if (this.readyState !== 3) {
        this.readyState = 3;
        this.emit('close');
      }
    });
    socket.on('error', (err) => {
      this.emit('error', err);
    });
  }

  _onData(chunk) {
    this._buffer = Buffer.concat([this._buffer, chunk]);
    while (this._buffer.length >= 2) {
      const b0 = this._buffer[0];
      const b1 = this._buffer[1];
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let payloadLen = b1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (this._buffer.length < 4) return;
        payloadLen = this._buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this._buffer.length < 10) return;
        payloadLen = Number(this._buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLen = masked ? 4 : 0;
      const totalFrameLen = offset + maskLen + payloadLen;
      if (this._buffer.length < totalFrameLen) return;

      let payload = this._buffer.subarray(offset + maskLen, totalFrameLen);
      if (masked) {
        const maskKey = this._buffer.subarray(offset, offset + 4);
        const unmasked = Buffer.alloc(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          unmasked[i] = payload[i] ^ maskKey[i & 3];
        }
        payload = unmasked;
      } else {
        payload = Buffer.from(payload);
      }

      this._buffer = this._buffer.subarray(totalFrameLen);

      if (opcode === 0x08) {
        // Close frame
        if (this.readyState === 1 && this._socket && !this._socket.destroyed) {
          try {
            this._socket.write(encodeFrame(0x08, Buffer.alloc(0), !this._isServer));
          } catch {
            // ignore
          }
        }
        this.readyState = 3;
        if (this._socket && !this._socket.destroyed) {
          this._socket.destroy();
        }
        this.emit('close');
        return;
      } else if (opcode === 0x09) {
        // Ping -> Pong
        if (this.readyState === 1 && this._socket) {
          this._socket.write(encodeFrame(0x0a, payload, !this._isServer));
        }
      } else if (opcode === 0x01 || opcode === 0x02) {
        this.emit('message', payload);
      }
    }
  }

  send(data) {
    if (this.readyState !== 1 || !this._socket) return;
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
    const frame = encodeFrame(0x01, buf, !this._isServer);
    this._socket.write(frame);
  }

  close(code = 1000, reason = '') {
    if (this.readyState === 3) return;
    this.readyState = 2;
    if (this._socket && !this._socket.destroyed) {
      try {
        const reasonBuf = Buffer.from(String(reason), 'utf8');
        const payload = Buffer.alloc(2 + reasonBuf.length);
        payload.writeUInt16BE(code, 0);
        reasonBuf.copy(payload, 2);
        this._socket.write(encodeFrame(0x08, payload, !this._isServer));
        this._socket.end();
      } catch {
        this._socket.destroy();
      }
    }
    this.readyState = 3;
  }
}

class MiniWebSocketServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
  }

  handleUpgrade(req, socket, head, cb) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    const accept = crypto
      .createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n',
    ];
    socket.write(headers.join('\r\n'));
    const ws = new MiniWebSocket(socket, head, true);
    cb(ws, req);
  }
}

let ExportedWebSocket = MiniWebSocket;
let ExportedWebSocketServer = MiniWebSocketServer;

if (process.env.FORCE_MINI_WS !== '1') {
  try {
    const wsPkg = require('ws');
    if (wsPkg && wsPkg.WebSocketServer) {
      ExportedWebSocket = wsPkg.WebSocket || wsPkg;
      ExportedWebSocketServer = wsPkg.WebSocketServer;
    }
  } catch {
    // Fallback to MiniWebSocket & MiniWebSocketServer on environments without 'ws'
  }
}

module.exports = ExportedWebSocket;
module.exports.WebSocket = ExportedWebSocket;
module.exports.WebSocketServer = ExportedWebSocketServer;
