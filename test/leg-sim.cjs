// Leg simulation — Bước 2 self-test (theo skill web_3d_scene_test_and_scale_audit).
// Dùng ĐÚNG code va chạm thật trong lib/campus.ts (transpile bằng typescript
// của repo rồi require), mô phỏng avatar đi bộ 4 m/s, dt = 1/60, lái về từng
// waypoint của mỗi chặng. Log kết quả mỗi chặng ra test/leg-results.json ngay
// khi chặng đó xong (restart không mất các chặng trước).
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const repo = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(repo, 'lib/campus.ts'), 'utf8');
const { outputText } = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const tmp = path.join(__dirname, '_campus.compiled.cjs');
fs.writeFileSync(tmp, outputText);
const campus = require(tmp);

const SPEED = 4; // m/s — walk, đúng AVATAR.walkSpeed
const DT = 1 / 60;
const ARRIVE_R = 1.5; // m
const results = [];
const outFile = path.join(__dirname, 'leg-results.json');

function simulateLeg(leg) {
  let pos = { ...leg.from };
  let totalDist = 0;
  let steps = 0;
  let hits = {};
  const maxSteps = 60 * 240; // tối đa 240 s mỗi chặng
  for (const wp of leg.waypoints) {
    let stuckTime = 0;
    let lastProgress = Infinity;
    let guard = 0;
    while (Math.hypot(wp.x - pos.x, wp.z - pos.z) > ARRIVE_R && guard < maxSteps) {
      guard += 1;
      steps += 1;
      const dx = wp.x - pos.x;
      const dz = wp.z - pos.z;
      const d = Math.hypot(dx, dz);
      const stepLen = Math.min(SPEED * DT, d);
      const next = { x: pos.x + (dx / d) * stepLen, z: pos.z + (dz / d) * stepLen };
      const { pos: fixed, hit } = campus.resolveCollisions(next, campus.AVATAR.radius);
      if (hit) hits[hit] = (hits[hit] || 0) + 1;
      const moved = Math.hypot(fixed.x - pos.x, fixed.z - pos.z);
      totalDist += moved;
      pos = fixed;
      // Kẹt = không tiến thêm trong 3 s liên tục (tính theo khoảng cách tới đích).
      if (d < lastProgress - 0.001) {
        lastProgress = d;
        stuckTime = 0;
      } else {
        stuckTime += DT;
        if (stuckTime > 3) {
          return {
            id: leg.id, name: leg.name, pass: false,
            reason: `STUCK trước waypoint (${wp.x}, ${wp.z}) tại (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}), còn cách đích ${d.toFixed(1)} m`,
            steps, seconds: +(steps * DT).toFixed(1), distanceM: +totalDist.toFixed(1),
            endPos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) }, hits,
          };
        }
      }
      lastProgress = Math.min(lastProgress, d);
    }
    if (guard >= maxSteps) {
      return {
        id: leg.id, name: leg.name, pass: false, reason: 'TIMEOUT 240 s',
        steps, seconds: +(steps * DT).toFixed(1), distanceM: +totalDist.toFixed(1),
        endPos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) }, hits,
      };
    }
  }
  return {
    id: leg.id, name: leg.name, pass: true, reason: 'đến đích trong 1,5 m',
    steps, seconds: +(steps * DT).toFixed(1), distanceM: +totalDist.toFixed(1),
    endPos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) }, hits,
  };
}

// Kiểm tra thêm: cổng Parabol đủ rộng cho avatar (lối thông 8 m >> 0,8 m),
// và spawn nằm trong lối đi (không kẹt trong chân cổng).
const spawnCheck = (() => {
  const { pos, hit } = campus.resolveCollisions({ ...campus.SPAWN }, campus.AVATAR.radius);
  const moved = Math.hypot(pos.x - campus.SPAWN.x, pos.z - campus.SPAWN.z);
  return { pass: moved < 0.01 && hit === null, movedM: +moved.toFixed(3), hit };
})();

for (const leg of campus.LEGS) {
  const r = simulateLeg(leg);
  results.push(r);
  console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name} — ${r.seconds}s, ${r.distanceM} m, hits=${JSON.stringify(r.hits)} ${r.reason}`);
  fs.writeFileSync(outFile, JSON.stringify({ spawnCheck, legs: results }, null, 2));
}
console.log(`spawnCheck: ${JSON.stringify(spawnCheck)}`);
console.log(`Kết quả: ${results.filter((r) => r.pass).length}/${results.length} chặng pass → ${outFile}`);
fs.unlinkSync(tmp);
