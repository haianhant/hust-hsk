/**
 * test/ws-shim/boardgame-sqlite.cjs — Thực thi SqlStorage thật trên nền file
 * `.sqlite` (qua worker_threads + python3 sqlite3) cho Cloudflare Durable Objects
 * chạy trong Node 18, hỗ trợ đầy đủ hibernation/cold-wake qua tệp đĩa thật.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker, isMainThread, workerData } = require('worker_threads');

const PY_SQLITE_DRIVER = `
import json, sqlite3, sys

conns = {}
def get_conn(db_path):
    if db_path not in conns:
        c = sqlite3.connect(db_path, timeout=10.0)
        c.execute("PRAGMA journal_mode=WAL;")
        c.execute("PRAGMA synchronous=NORMAL;")
        c.row_factory = sqlite3.Row
        conns[db_path] = c
    return conns[db_path]

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    if line == "__EXIT__":
        break
    try:
        req = json.loads(line)
        db_path = req["dbPath"]
        query = req["query"]
        bindings = req.get("bindings", [])
        c = get_conn(db_path)
        cur = c.execute(query, tuple(bindings))
        if cur.description is not None:
            cols = [d[0] for d in cur.description]
            rows = [{cols[i]: row[i] for i in range(len(cols))} for row in cur.fetchall()]
        else:
            rows = []
        c.commit()
        sys.stdout.write(json.dumps({"ok": True, "rows": rows}) + "\\n")
        sys.stdout.flush()
    except Exception as exc:
        sys.stdout.write(json.dumps({"ok": False, "error": str(exc)}) + "\\n")
        sys.stdout.flush()

for c in conns.values():
    try:
        c.close()
    except Exception:
        pass
`;

if (!isMainThread) {
  const { spawn } = require('child_process');
  const { sab, tmpDir } = workerData;
  const ctrl = new Int32Array(sab, 0, 4);
  const reqFile = path.join(tmpDir, 'rpc-req.json');
  const resFile = path.join(tmpDir, 'rpc-res.json');

  const py = spawn('python3', ['-u', '-c', PY_SQLITE_DRIVER], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Read line-by-line synchronously isn't needed when driving request->response cleanly via temp event or fd,
  // wait: in Worker thread we can block reading py.stdout cleanly via fs.readFileSync('/dev/fd/...')?
  // Better: worker reads stdout chunks synchronously with fs.readSync or async? Wait: Atomics.wait in Worker
  // can wait cleanly for main thread, AND worker waits py stdout via callback?
  // Actually `Atomics.wait` ONLY blocks if we do it in a loop AFTER receiving async stdout OR using `fs.readSync` on py.stdout._handle.fd!
  // Let's use an async main loop in worker OR readable wait: no need to block on py.stdout synchronously!
  let stdoutBuf = '';
  let pyExited = false;
  let pyStderr = '';

  py.stderr.on('data', (chunk) => {
    pyStderr += chunk.toString();
  });

  function sendNextRequest() {
    while (true) {
      const state = Atomics.load(ctrl, 0);
      if (state === -1) {
        try {
          py.stdin.write('__EXIT__\n');
        } catch {
          // ignore
        }
        py.kill();
        return;
      }
      if (state === 1) {
        const line = fs.readFileSync(reqFile, 'utf8');
        py.stdin.write(`${line.replace(/\r?\n/g, ' ')}\n`);
        return;
      }
      Atomics.wait(ctrl, 0, 0, 50);
    }
  }

  py.stdout.on('data', (chunk) => {
    stdoutBuf += chunk.toString();
    const nl = stdoutBuf.indexOf('\n');
    if (nl === -1) return;
    const outLine = stdoutBuf.slice(0, nl);
    stdoutBuf = stdoutBuf.slice(nl + 1);
    fs.writeFileSync(resFile, outLine, 'utf8');
    Atomics.store(ctrl, 0, 2);
    Atomics.notify(ctrl, 0, 1);
    // Wait until main thread resets ctrl[0] back to 0 or -1 before polling next
    while (Atomics.load(ctrl, 0) === 2) {
      Atomics.wait(ctrl, 0, 2, 50);
    }
    setImmediate(sendNextRequest);
  });

  py.on('exit', () => {
    pyExited = true;
    if (Atomics.load(ctrl, 0) === 1) {
      fs.writeFileSync(
        resFile,
        JSON.stringify({ ok: false, error: pyStderr || 'python sqlite exited' }),
        'utf8',
      );
      Atomics.store(ctrl, 0, 2);
      Atomics.notify(ctrl, 0, 1);
    }
  });

  if (!pyExited) {
    setImmediate(sendNextRequest);
  }
}

let sharedEngine = null;

function ensureEngine() {
  if (sharedEngine) return sharedEngine;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hust-bg-sqlite-'));
  const sab = new SharedArrayBuffer(64);
  const ctrl = new Int32Array(sab, 0, 4);
  const reqFile = path.join(tmpDir, 'rpc-req.json');
  const resFile = path.join(tmpDir, 'rpc-res.json');

  const worker = new Worker(__filename, {
    workerData: { sab, tmpDir },
  });
  worker.unref();

  sharedEngine = {
    tmpDir,
    ctrl,
    reqFile,
    resFile,
    worker,
    dbFiles: new Map(),
    disposed: false,
    execSync(dbName, query, bindings) {
      if (this.disposed) {
        return [];
      }
      let dbPath = this.dbFiles.get(dbName);
      if (!dbPath) {
        const safe = String(dbName).replace(/[^a-zA-Z0-9_-]/g, '_');
        dbPath = path.join(this.tmpDir, `${safe}.sqlite`);
        this.dbFiles.set(dbName, dbPath);
      }
      fs.writeFileSync(
        this.reqFile,
        JSON.stringify({ dbPath, query, bindings }),
        'utf8',
      );
      Atomics.store(this.ctrl, 0, 1);
      Atomics.notify(this.ctrl, 0, 1);
      while (Atomics.load(this.ctrl, 0) === 1) {
        const waitRes = Atomics.wait(this.ctrl, 0, 1, 10000);
        if (waitRes === 'timed-out' && Atomics.load(this.ctrl, 0) === 1) {
          throw new Error(`SQLite worker timed out executing query: ${query.slice(0, 80)}`);
        }
      }
      const resRaw = fs.readFileSync(this.resFile, 'utf8');
      Atomics.store(this.ctrl, 0, 0);
      Atomics.notify(this.ctrl, 0, 1);
      const parsed = JSON.parse(resRaw);
      if (!parsed.ok) {
        throw new Error(`SQLite error: ${parsed.error}`);
      }
      return parsed.rows;
    },
    dispose() {
      this.disposed = true;
      try {
        Atomics.store(this.ctrl, 0, -1);
        Atomics.notify(this.ctrl, 0, 1);
      } catch {
        // ignore
      }
      try {
        this.worker.terminate();
      } catch {
        // ignore
      }
      try {
        fs.rmSync(this.tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    },
  };

  return sharedEngine;
}

function createPersistentSqlStorage(dbName) {
  const engine = ensureEngine();
  return {
    exec(query, ...bindings) {
      const rows = engine.execSync(dbName, query, bindings);
      return {
        toArray() {
          return rows.slice();
        },
        one() {
          return rows[0];
        },
        [Symbol.iterator]() {
          return rows.values();
        },
      };
    },
  };
}

function disposeAllSqliteStores() {
  if (sharedEngine) {
    sharedEngine.dispose();
    sharedEngine = null;
  }
}

if (isMainThread) {
  process.once('exit', disposeAllSqliteStores);
}

module.exports = {
  createPersistentSqlStorage,
  disposeAllSqliteStores,
};
