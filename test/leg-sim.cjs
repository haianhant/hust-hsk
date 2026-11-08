// Leg simulation — Kiểm thử điều hướng & va chạm sân trường (hỗ trợ tìm đường A*
// trên mạng lưới đường ROADS + lưới né vật cản, thay vì ép bot cắt chéo đường
// chim bay xuyên qua tòa nhà hay hồ nước).
require('./register-ts.cjs');
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const campus = require(path.join(repo, 'lib/campus.ts'));

const SPEED = 4; // m/s — walk, đúng AVATAR.walkSpeed
const DT = 1 / 60;
const ARRIVE_R = 1.5; // m
const CLEAR_R = campus.AVATAR.radius + 0.4;
const results = [];
const outFile = path.join(__dirname, 'leg-results.json');

function isPointFree(x, z, r = CLEAR_R) {
  const { hit } = campus.resolveCollisions({ x, z }, r);
  return hit === null;
}

function isSegmentClear(a, b, r = CLEAR_R) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(2, Math.ceil(dist / 0.4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    if (!isPointFree(x, z, r)) return false;
  }
  return true;
}

function isOnRoad(x, z) {
  if (!Array.isArray(campus.ROADS)) return false;
  for (const r of campus.ROADS) {
    const pts = r.points;
    if (!Array.isArray(pts) || pts.length < 2) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const vx = b.x - a.x;
      const vz = b.z - a.z;
      const len2 = vx * vx + vz * vz;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / len2)) : 0;
      const px = a.x + vx * t;
      const pz = a.z + vz * t;
      if (Math.hypot(x - px, z - pz) <= (r.width || 5) * 0.55) return true;
    }
  }
  return false;
}

/** Tìm đường thông minh bằng A* (ưu tiên đi trên ROADS và né mọi BUILDING_COLLIDERS) */
function findSmartWaypoints(start, goal) {
  if (isSegmentClear(start, goal)) return [goal];

  const step = 2.0; // lưới 2 m
  const half = Math.ceil((campus.CAMPUS_SIZE || 200) / 2) + 20;
  const snap = (v) => Math.round(v / step) * step;
  const keyOf = (x, z) => `${x},${z}`;

  const sx = snap(start.x);
  const sz = snap(start.z);
  const gx = snap(goal.x);
  const gz = snap(goal.z);

  const open = [{ x: sx, z: sz, g: 0, f: Math.hypot(gx - sx, gz - sz) }];
  const gScore = new Map([[keyOf(sx, sz), 0]]);
  const cameFrom = new Map();
  const closed = new Set();

  const dirs = [
    [step, 0],
    [-step, 0],
    [0, step],
    [0, -step],
    [step, step],
    [step, -step],
    [-step, step],
    [-step, -step],
  ];

  let bestNode = { x: sx, z: sz };
  let bestDist = Math.hypot(gx - sx, gz - sz);
  let iter = 0;

  while (open.length > 0 && iter < 12000) {
    iter += 1;
    // Lấy node có f nhỏ nhất
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0];
    const ck = keyOf(cur.x, cur.z);
    if (closed.has(ck)) continue;
    closed.add(ck);

    const dToGoal = Math.hypot(goal.x - cur.x, goal.z - cur.z);
    if (dToGoal < bestDist) {
      bestDist = dToGoal;
      bestNode = cur;
    }
    if (dToGoal <= step * 1.5) {
      bestNode = cur;
      break;
    }

    for (const [dx, dz] of dirs) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      if (Math.abs(nx) > half || Math.abs(nz) > half) continue;
      const nk = keyOf(nx, nz);
      if (closed.has(nk)) continue;
      if (!isPointFree(nx, nz, CLEAR_R)) continue;

      const moveCost = Math.hypot(dx, dz) * (isOnRoad(nx, nz) ? 0.8 : 1.0);
      const tentativeG = cur.g + moveCost;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, cur);
        gScore.set(nk, tentativeG);
        open.push({
          x: nx,
          z: nz,
          g: tentativeG,
          f: tentativeG + Math.hypot(goal.x - nx, goal.z - nz) * 0.85,
        });
      }
    }
  }

  // Truy vết đường đi và làm mượt (string-pulling)
  const raw = [{ x: goal.x, z: goal.z }];
  let cur = bestNode;
  while (cur && cameFrom.has(keyOf(cur.x, cur.z))) {
    raw.push({ x: cur.x, z: cur.z });
    cur = cameFrom.get(keyOf(cur.x, cur.z));
  }
  raw.reverse();

  const smoothed = [];
  let anchor = start;
  let i = 0;
  while (i < raw.length) {
    let furthest = i;
    for (let j = raw.length - 1; j > i; j--) {
      if (isSegmentClear(anchor, raw[j], CLEAR_R)) {
        furthest = j;
        break;
      }
    }
    smoothed.push(raw[furthest]);
    anchor = raw[furthest];
    i = furthest + 1;
  }
  return smoothed;
}

function simulateLeg(leg) {
  let pos = { ...leg.from };
  let totalDist = 0;
  let steps = 0;
  let hits = {};
  const maxSteps = 60 * 240; // tối đa 240 s mỗi chặng

  // Mở rộng mỗi waypoint bằng đường đi A* quanh vật cản / theo mạng lưới đường
  const expandedWaypoints = [];
  let prevPt = pos;
  for (const wp of leg.waypoints) {
    const subPath = findSmartWaypoints(prevPt, wp);
    expandedWaypoints.push(...subPath);
    prevPt = wp;
  }

  for (const wp of expandedWaypoints) {
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
      if (d < lastProgress - 0.001) {
        lastProgress = d;
        stuckTime = 0;
      } else {
        stuckTime += DT;
        if (stuckTime > 3) {
          return {
            id: leg.id,
            name: leg.name,
            pass: false,
            reason: `STUCK trước waypoint (${wp.x}, ${wp.z}) tại (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}), còn cách đích ${d.toFixed(1)} m`,
            steps,
            seconds: +(steps * DT).toFixed(1),
            distanceM: +totalDist.toFixed(1),
            endPos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) },
            hits,
          };
        }
      }
      lastProgress = Math.min(lastProgress, d);
    }
    if (guard >= maxSteps) {
      return {
        id: leg.id,
        name: leg.name,
        pass: false,
        reason: 'TIMEOUT 240 s',
        steps,
        seconds: +(steps * DT).toFixed(1),
        distanceM: +totalDist.toFixed(1),
        endPos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) },
        hits,
      };
    }
  }
  return {
    id: leg.id,
    name: leg.name,
    pass: true,
    reason: 'đến đích trong 1,5 m',
    steps,
    seconds: +(steps * DT).toFixed(1),
    distanceM: +totalDist.toFixed(1),
    endPos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) },
    hits,
  };
}

const spawnCheck = (() => {
  const { pos, hit } = campus.resolveCollisions({ ...campus.SPAWN }, campus.AVATAR.radius);
  const moved = Math.hypot(pos.x - campus.SPAWN.x, pos.z - campus.SPAWN.z);
  return { pass: moved < 0.01 && hit === null, movedM: +moved.toFixed(3), hit };
})();

for (const leg of campus.LEGS) {
  const r = simulateLeg(leg);
  results.push(r);
  console.log(
    `${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name} — ${r.seconds}s, ${r.distanceM} m, hits=${JSON.stringify(r.hits)} ${r.reason}`,
  );
  fs.writeFileSync(outFile, JSON.stringify({ spawnCheck, legs: results }, null, 2));
}
console.log(`spawnCheck: ${JSON.stringify(spawnCheck)}`);
console.log(`Kết quả: ${results.filter((r) => r.pass).length}/${results.length} chặng pass → ${outFile}`);
