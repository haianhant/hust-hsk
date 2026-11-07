// test/mp-protocol.cjs — chạy shim WebSocket local + test-clients protocol.
// Usage: node test/mp-protocol.cjs
// Exit 0 khi protocol test pass hết; log ghi test-shots/r5-mp-protocol.log
// (chạy từ thư mục gốc project).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG = path.join(ROOT, 'test-shots', 'r5-mp-protocol.log');
const PORT = 8788;

function log(s) {
  fs.appendFileSync(LOG, s + '\n');
  process.stdout.write(s + '\n');
}

(async () => {
  fs.mkdirSync(path.join(ROOT, 'test-shots'), { recursive: true });
  fs.writeFileSync(LOG, '');
  const server = spawn('node', ['test/ws-shim/server.js', String(PORT)], { cwd: ROOT });
  server.stdout.on('data', (d) => log('[shim] ' + d.toString().trim()));
  server.stderr.on('data', (d) => log('[shim:err] ' + d.toString().trim()));
  await new Promise((r) => setTimeout(r, 800));

  const test = spawn('node', ['test/ws-shim/test-clients.js', String(PORT)], { cwd: ROOT });
  let out = '';
  test.stdout.on('data', (d) => { out += d; log(d.toString().trim()); });
  test.stderr.on('data', (d) => { out += d; log(d.toString().trim()); });
  const code = await new Promise((r) => test.on('close', r));
  server.kill('SIGTERM');
  log(`mp-protocol exit=${code}`);
  process.exit(code);
})();
