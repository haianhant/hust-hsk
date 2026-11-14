// Walk-to-door check (đợt 4, thư viện dựng lại theo studywithhuster.cyou) —
// dùng ĐÚNG code va chạm thật lib/campus.ts như test/leg-sim.cjs: avatar đi bộ
// 4 m/s từ đích leg3 (24, 28) lên phía bắc theo đường x = 24 tới (24, 18),
// rẽ đông theo lối đi đỏ (z = 14) tới (34, 14), rồi đi về phía nam vòng qua
// PHÍA TÂY bệ chữ HUST (bệ x 35,2..40,8 có collider — không đi thẳng trục giữa
// được), lên bậc sảnh tới trước cửa kính mới (38, ~23,1).
// Cột hiên mới (z 19,5), hàng cau (33/43, 15,5), đèn, thùng rác KHÔNG có
// collider — test này xác minh collider thư viện mới không chặn lối đi; vị trí
// cột/cau/đèn được kiểm bằng mắt trên ảnh chụp (xem báo cáo đợt 4).
require('./register-ts.cjs');
const path = require('path');
const repo = path.resolve(__dirname, '..');
const campus = require(path.join(repo, 'lib/campus.ts'));
const SPEED = 4, DT = 1 / 60, ARRIVE_R = 1.5;
function walk(from, waypoints) {
  let pos = { ...from }, totalDist = 0, steps = 0, hits = {};
  for (const wp of waypoints) {
    let stuckTime = 0, lastProgress = Infinity, guard = 0;
    while (Math.hypot(wp.x - pos.x, wp.z - pos.z) > ARRIVE_R && guard < 60 * 240) {
      guard++; steps++;
      const dx = wp.x - pos.x, dz = wp.z - pos.z, d = Math.hypot(dx, dz);
      const stepLen = Math.min(SPEED * DT, d);
      const next = { x: pos.x + (dx / d) * stepLen, z: pos.z + (dz / d) * stepLen };
      const { pos: fixed, hit } = campus.resolveCollisions(next, campus.AVATAR.radius);
      if (hit) hits[hit] = (hits[hit] || 0) + 1;
      totalDist += Math.hypot(fixed.x - pos.x, fixed.z - pos.z);
      pos = fixed;
      if (d < lastProgress - 0.001) { lastProgress = d; stuckTime = 0; }
      else { stuckTime += DT; if (stuckTime > 3) return { pass: false, reason: `STUCK truoc (${wp.x}, ${wp.z}) tai (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`, steps, seconds: +(steps * DT).toFixed(1), distanceM: +totalDist.toFixed(1), endPos: pos, hits }; }
    }
    if (guard >= 60 * 240) return { pass: false, reason: 'TIMEOUT', steps, seconds: +(steps * DT).toFixed(1), distanceM: +totalDist.toFixed(1), endPos: pos, hits };
  }
  return { pass: true, reason: 'den dich trong 1,5 m', steps, seconds: +(steps * DT).toFixed(1), distanceM: +totalDist.toFixed(1), endPos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) }, hits };
}
// Lối vào mới: (24,28) -> (24,18) [điểm cuối đường C1–Thư viện] ->
// (24,14) [lối đi đỏ, plaza minZ 10] -> (34,14) [đông theo lối đi, dừng
// trước khi tới bệ HUST (x 35,2)] -> (34,17,5) [về nam, phía tây bệ HUST,
// qua bậc sảnh] -> (38,20) [dưới mái hiên, giữa các cột] ->
// (38,22,5) [tiến tới cửa kính mới z 26,5; collider khối đế minZ 23,5 chặn ở z ~23,1].
const r1 = walk({ x: 24, z: 28 }, [{ x: 24, z: 18 }, { x: 24, z: 14 }, { x: 34, z: 14 }, { x: 34, z: 17.5 }, { x: 38, z: 20 }, { x: 38, z: 22.5 }]);
console.log('walk-to-door (24,28)->(24,18)->(24,14)->(34,14)->(34,17.5)->(38,20)->(38,22.5):', JSON.stringify(r1));
// Sanity: avatar dung ngay truoc cua (38, 24,5) phai bi day ve z ~23,1
// (collider khối đế minZ 23,5 - radius 0,4); cach cua kinh (z 26,5) ~3,4 m.
const near = campus.resolveCollisions({ x: 38, z: 24.5 }, campus.AVATAR.radius);
console.log('stand-at-door (38,24.5) ->', JSON.stringify(near));
// Dung ngay trên bệ chữ HUST (38, 14) phai bi day ra phía bắc z ~13,0
// (bệ minZ 13,4 - radius 0,4), hit = 'Bệ chữ HUST'.
const hust = campus.resolveCollisions({ x: 38, z: 14 }, campus.AVATAR.radius);
console.log('stand-on-hust (38,14) ->', JSON.stringify(hust));
// Diem Đi nhanh thư viện (38, 12,5) nam ngoai mọi collider (trước bệ HUST).
const ft = campus.resolveCollisions({ x: 38, z: 12.5 }, campus.AVATAR.radius);
console.log('stand-fast-travel (38,12.5) ->', JSON.stringify(ft));
// Dung sát mặt bắc cánh tây (27.5, 29.0 — bên trong biên minZ 28.8) phai bi day
// ve z ~28.4 (collider tháp minZ 28.8 - radius 0.4), hit = 'Thư viện Tạ Quang Bửu (tháp)'.
const tower = campus.resolveCollisions({ x: 27.5, z: 29.0 }, campus.AVATAR.radius);
console.log('stand-tower-north (27.5,29.0) ->', JSON.stringify(tower));
// Diem giua san nam cu (38, 52) nam ngoai collider (dao co khong co collider).
const island = campus.resolveCollisions({ x: 38, z: 52 }, campus.AVATAR.radius);
console.log('stand-island (38,52) ->', JSON.stringify(island));
const ok = r1.pass
  && Math.abs(near.pos.z - 23.1) < 0.15
  && hust.hit === 'Bệ chữ HUST' && Math.abs(hust.pos.z - 13.0) < 0.15
  && ft.hit === null
  && tower.hit === 'Thư viện Tạ Quang Bửu (tháp)' && Math.abs(tower.pos.z - 28.4) < 0.15
  && island.hit === null;
process.exit(ok ? 0 : 1);
