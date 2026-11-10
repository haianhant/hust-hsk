// ---------------------------------------------------------------------------
// buildFloor10Rooftop.ts — Khối D: Sân thượng Tầng 10 Thư viện Tạ Quang Bửu
// Chuyển thể chuẩn 1:1 từ mô hình thủ tục studywithhuster.cyou (tang10.js).
// Bao gồm: sàn gạch sân thượng, lối dạo lát gỗ có dải đèn LED ấm, lan can kính,
// nhà kỹ thuật thang máy, thảm cỏ & ghế tắm nắng đôi, thảm picnic & ghế lười,
// giàn gỗ Pergola chăng dây đèn vàng, Đài ngắm sao tròn phía Đông với bảng
// bản đồ sao tháng 11, Kính thiên văn xoay được và bầu trời sao Ngân Hà + sao băng.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { canvasTex, mulberry32, optimizeStaticLibraryGroup } from './procedural-helpers';
import {
  createLibraryLocation,
  queryLibraryGround,
  resolveLibraryMovement,
} from '../../world-data/library-spatial';

export interface Floor10RooftopController {
  telescopePos: { x: number; y: number; z: number };
  scopePivot: THREE.Group;
  groundY: (x: number, z: number) => number;
  blockedAt: (x: number, z: number) => boolean;
  update: (dt: number, elapsed: number) => void;
}

export function buildFloor10Rooftop(world: THREE.Group): Floor10RooftopController {
  const X0 = -22.4;
  const X1 = 22.4;
  const Z0 = -8.6;
  const Z1 = 8.6;
  const RW = X1 - X0;
  const RD = Z1 - Z0;
  const KS = { x0: -5.2, x1: 5.2, z0: -8.2, z1: -3.4, h: 3.4 };
  const PG = { x0: -6.8, x1: 6.8, z0: 2.2, z1: 7.4, h: 2.95 };
  const SD = { x: 14.8, z: 0.4, r: 4.2, y: 0.18 };

  const G = (p: THREE.Object3D = world, x = 0, y = 0, z = 0, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (ry) g.rotation.y = ry;
    p.add(g);
    return g;
  };
  const mk = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    p: THREE.Object3D = world,
  ) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    if (rx || ry || rz) o.rotation.set(rx, ry, rz);
    p.add(o);
    return o;
  };
  const gCache: Record<string, THREE.BufferGeometry> = {};
  const mCache: Record<string, THREE.MeshStandardMaterial> = {};
  const mat = (c: number, r = 0.65, m = 0, ex?: THREE.MeshStandardMaterialParameters) => {
    const k = ex ? `${c}_${r}_${m}_${JSON.stringify(ex)}` : `${c}_${r}_${m}`;
    return (mCache[k] ??= new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...ex }));
  };
  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    p: THREE.Object3D = world,
  ) => mk((gCache[`b_${w}_${h}_${d}`] ??= new THREE.BoxGeometry(w, h, d)), m, x, y, z, rx, ry, rz, p);
  const cyl = (
    rt: number,
    rb: number,
    h: number,
    s: number,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    p: THREE.Object3D = world,
  ) => mk((gCache[`c_${rt}_${rb}_${h}_${s}`] ??= new THREE.CylinderGeometry(rt, rb, h, s)), m, x, y, z, rx, ry, rz, p);

  const M_STONE = mat(0x2e3440, 0.82);
  const M_PARA = mat(0xd8dee9, 0.72);
  const M_WOOD_D = mat(0x4a2f1d, 0.55);
  const M_WOOD_M = mat(0x7c5032, 0.52);
  const M_WOOD_L = mat(0xb88655, 0.5);
  const M_LAWN = mat(0x2d5a36, 0.92);
  const M_LEAF = mat(0x255230, 0.78);
  const M_CHR = mat(0xcfd6df, 0.22, 0.88);
  const M_DRK = mat(0x1b1f26, 0.38, 0.72);
  const M_GOLD = mat(0xd4af37, 0.28, 0.82);
  const M_FABRIC = mat(0xece6d8, 0.75);
  const M_GLS = new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.1 });
  const M_LED = new THREE.MeshBasicMaterial({ color: 0xffd584 });

  // Sàn đá sân thượng + Đường dạo lát gỗ + Dải LED vàng ấm
  const deckTex = canvasTex(
    256,
    256,
    (c) => {
      c.fillStyle = '#333a47';
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#232832';
      c.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        c.beginPath();
        c.moveTo(i * 64, 0);
        c.lineTo(i * 64, 256);
        c.moveTo(0, i * 64);
        c.lineTo(256, i * 64);
        c.stroke();
      }
    },
    22,
    10,
  );
  mk(
    new THREE.PlaneGeometry(RW, RD),
    new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.72, metalness: 0.08 }),
    0,
    0,
    0,
    -Math.PI / 2,
  );

  // Lối đi lát gỗ ấm chạy dọc sân thượng
  box(34, 0.025, 2.6, M_WOOD_M, 0, 0.012, -0.8);
  box(34, 0.028, 0.08, M_LED, 0, 0.015, -2.12);
  box(34, 0.028, 0.08, M_LED, 0, 0.015, 0.52);

  // Tường chắn mái thấp + Lan can kính cường lực quanh 4 cạnh sân thượng
  box(RW + 0.4, 0.42, 0.28, M_PARA, 0, 0.21, Z0);
  box(RW + 0.4, 0.42, 0.28, M_PARA, 0, 0.21, Z1);
  box(0.28, 0.42, RD + 0.4, M_PARA, X0, 0.21, 0);
  box(0.28, 0.42, RD + 0.4, M_PARA, X1, 0.21, 0);

  box(RW, 0.72, 0.04, M_GLS, 0, 0.78, Z0);
  box(RW, 0.72, 0.04, M_GLS, 0, 0.78, Z1);
  box(0.04, 0.72, RD, M_GLS, X0, 0.78, 0);
  box(0.04, 0.72, RD, M_GLS, X1, 0.78, 0);

  box(RW + 0.1, 0.05, 0.08, M_CHR, 0, 1.15, Z0);
  box(RW + 0.1, 0.05, 0.08, M_CHR, 0, 1.15, Z1);
  box(0.08, 0.05, RD + 0.1, M_CHR, X0, 1.15, 0);
  box(0.08, 0.05, RD + 0.1, M_CHR, X1, 1.15, 0);

  // Khối kỹ thuật & Thang máy lên Sân thượng (KS: x ∈ [-5.2, 5.2], z ∈ [-8.2, -3.4])
  {
    const kw = KS.x1 - KS.x0;
    const kd = KS.z1 - KS.z0;
    const kx = (KS.x0 + KS.x1) / 2;
    const kz = (KS.z0 + KS.z1) / 2;
    box(kw, KS.h, kd, M_PARA, kx, KS.h / 2, kz);
    box(kw + 0.4, 0.22, kd + 0.4, M_STONE, kx, KS.h + 0.11, kz);
    // 2 Cửa thang máy sân thượng (Tây & Đông)
    for (const ex of [-2.4, 2.4]) {
      box(1.9, 2.4, 0.12, M_CHR, ex, 1.2, KS.z1 + 0.06);
      box(0.78, 2.25, 0.06, M_DRK, ex - 0.41, 1.12, KS.z1 + 0.11);
      box(0.78, 2.25, 0.06, M_DRK, ex + 0.41, 1.12, KS.z1 + 0.11);
    }

    const signTex = canvasTex(512, 96, (c) => {
      c.fillStyle = '#0f172a';
      c.fillRect(0, 0, 512, 96);
      c.strokeStyle = '#fbbf24';
      c.lineWidth = 5;
      c.strokeRect(4, 4, 504, 88);
      c.fillStyle = '#fef3c7';
      c.font = 'bold 30px Segoe UI,sans-serif';
      c.textAlign = 'center';
      c.fillText('TẦNG 10 · SÂN THƯỢNG NGẮM SAO', 256, 58);
    });
    box(3.4, 0.56, 0.06, new THREE.MeshBasicMaterial({ map: signTex }), 0, 2.78, KS.z1 + 0.08);
  }

  // Thảm cỏ Tây + Ghế tắm nắng đôi + Đèn bão & Thảm Picnic
  box(11.5, 0.06, 6.4, M_LAWN, -14.2, 0.03, 3.2);
  for (const lx of [-17.2, -14.2, -11.2]) {
    const lg = G(world, lx, 0.06, 3.4, 0.15);
    box(0.78, 0.18, 1.95, M_WOOD_L, 0, 0.16, 0, 0, 0, 0, lg);
    box(0.72, 0.08, 1.25, M_FABRIC, 0, 0.28, 0.28, 0, 0, 0, lg);
    box(0.72, 0.08, 0.65, M_FABRIC, 0, 0.44, -0.62, 0.48, 0, 0, lg);
    cyl(0.08, 0.1, 0.24, 10, M_LED, 0.62, 0.14, -0.3, 0, 0, 0, lg);
  }
  // Ghế lười (Beanbags)
  for (const [bxX, bzZ, col] of [
    [-16.5, -4.2, 0xd97706],
    [-14.2, -5.1, 0x2563eb],
    [-11.8, -4.0, 0xdc2626],
  ]) {
    const bb = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 12), mat(col, 0.72));
    bb.scale.set(1.15, 0.68, 1.15);
    bb.position.set(bxX, 0.32, bzZ);
    world.add(bb);
  }

  // Giàn gỗ Pergola phía Nam (PG: x ∈ [-6.8, 6.8], z ∈ [2.2, 7.4]) + Dây đèn vàng võng
  const bulbs: THREE.Mesh[] = [];
  {
    const pw = PG.x1 - PG.x0;
    const pd = PG.z1 - PG.z0;
    const px = (PG.x0 + PG.x1) / 2;
    const pz = (PG.z0 + PG.z1) / 2;
    for (const cx of [PG.x0, -2.2, 2.2, PG.x1]) {
      for (const cz of [PG.z0, PG.z1]) {
        box(0.18, PG.h, 0.18, M_WOOD_D, cx, PG.h / 2, cz);
      }
    }
    box(pw + 0.5, 0.18, 0.18, M_WOOD_D, px, PG.h, PG.z0);
    box(pw + 0.5, 0.18, 0.18, M_WOOD_D, px, PG.h, PG.z1);
    for (let x = PG.x0 - 0.1; x <= PG.x1 + 0.1; x += 0.68) {
      box(0.09, 0.14, pd + 0.5, M_WOOD_M, x, PG.h + 0.12, pz);
    }
    // Bàn ghế gỗ dài dưới giàn Pergola
    for (const bxX of [-4.2, 0, 4.2]) {
      const bg = G(world, bxX, 0, pz);
      box(2.2, 0.06, 0.82, M_WOOD_L, 0, 0.74, 0, 0, 0, 0, bg);
      box(0.1, 0.72, 0.72, M_DRK, -0.88, 0.36, 0, 0, 0, 0, bg);
      box(0.1, 0.72, 0.72, M_DRK, 0.88, 0.36, 0, 0, 0, 0, bg);
      box(2.1, 0.05, 0.36, M_WOOD_L, 0, 0.44, -0.78, 0, 0, 0, bg);
      box(2.1, 0.05, 0.36, M_WOOD_L, 0, 0.44, 0.78, 0, 0, 0, bg);
    }
    // Bóng đèn dây võng (String Lights)
    const bulbGeo = new THREE.SphereGeometry(0.045, 8, 8);
    for (const rz of [PG.z0 + 1.1, pz, PG.z1 - 1.1]) {
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const lx = PG.x0 + t * pw;
        const sag = Math.sin(t * Math.PI) * 0.24;
        const b = mk(bulbGeo, M_LED, lx, PG.h - 0.08 - sag, rz);
        bulbs.push(b);
      }
    }
  }

  // =========================================================================
  // ĐÀI NGẮM SAO TRÒN PHÍA ĐÔNG & KÍNH THIÊN VĂN (SD: x = 14.8, z = 0.4, r = 4.2)
  // =========================================================================
  const sdG = G(world, SD.x, 0, SD.z);
  cyl(SD.r, SD.r + 0.12, SD.y, 48, M_WOOD_D, 0, SD.y / 2, 0, 0, 0, 0, sdG);
  cyl(SD.r - 0.08, SD.r - 0.08, 0.02, 48, M_WOOD_L, 0, SD.y + 0.01, 0, 0, 0, 0, sdG);
  cyl(SD.r + 0.05, SD.r + 0.05, 0.03, 48, M_LED, 0, 0.02, 0, 0, 0, 0, sdG);

  // Bảng bản đồ bầu trời sao tháng 11
  {
    const bg = G(sdG, -2.4, SD.y, -2.2, 0.45);
    box(0.08, 1.55, 0.08, M_DRK, -0.75, 0.78, 0, 0, 0, 0, bg);
    box(0.08, 1.55, 0.08, M_DRK, 0.75, 0.78, 0, 0, 0, 0, bg);
    const mapTex = canvasTex(512, 320, (c) => {
      c.fillStyle = '#091224';
      c.fillRect(0, 0, 512, 320);
      c.strokeStyle = '#38bdf8';
      c.lineWidth = 5;
      c.strokeRect(6, 6, 500, 308);
      c.fillStyle = '#fde68a';
      c.font = 'bold 24px Segoe UI,sans-serif';
      c.textAlign = 'center';
      c.fillText('BẢN ĐỒ SAO BẦU TRỜI HÀ NỘI', 256, 40);
      c.strokeStyle = 'rgba(147,197,253,0.45)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(256, 178, 108, 0, Math.PI * 2);
      c.stroke();
      const stars: Array<[number, number]> = [
        [210, 130],
        [240, 145],
        [256, 165],
        [275, 180],
        [305, 195],
        [230, 210],
        [285, 140],
      ];
      c.beginPath();
      stars.forEach(([sx, sy], idx) => (idx ? c.lineTo(sx, sy) : c.moveTo(sx, sy)));
      c.stroke();
      c.fillStyle = '#fff';
      stars.forEach(([sx, sy]) => {
        c.beginPath();
        c.arc(sx, sy, 4, 0, Math.PI * 2);
        c.fill();
      });
      c.fillStyle = '#93c5fd';
      c.font = '16px Segoe UI,sans-serif';
      c.fillText('Orion · Cassiopeia · Taurus · Pleiades', 256, 300);
    });
    box(1.65, 1.02, 0.05, new THREE.MeshBasicMaterial({ map: mapTex }), 0, 1.25, 0, -0.15, 0, 0, bg);
  }

  // Kính thiên văn khúc xạ lớn trên chân máy 3 càng (Telescope)
  const teleG = G(sdG, 0.6, SD.y, 0.2);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.3;
    const leg = G(teleG, 0, 1.08, 0, a);
    cyl(0.024, 0.016, 1.22, 10, M_WOOD_M, 0, -0.54, 0.28, -0.45, 0, 0, leg);
  }
  cyl(0.08, 0.1, 0.16, 16, M_DRK, 0, 1.12, 0, 0, 0, 0, teleG);
  const scopePivot = G(teleG, 0, 1.24, 0, 0.55);
  // Ống kính thiên văn trắng-vàng đồng hướng lên bầu trời sao
  const tubeG = G(scopePivot);
  tubeG.rotation.x = -0.52;
  cyl(0.085, 0.072, 1.28, 20, M_PARA, 0, 0, 0, Math.PI / 2, 0, 0, tubeG);
  cyl(0.092, 0.092, 0.18, 20, M_GOLD, 0, 0, 0.58, Math.PI / 2, 0, 0, tubeG);
  cyl(0.055, 0.065, 0.22, 16, M_DRK, 0, 0, -0.68, Math.PI / 2, 0, 0, tubeG);
  cyl(0.022, 0.022, 0.36, 10, M_GOLD, 0.095, 0.06, -0.25, Math.PI / 2, 0, 0, tubeG);

  // Vòm bầu trời đêm đầy sao + Dải Ngân Hà + Sao băng trên tầng 10
  const skyG = G(world, 0, 0, 0);
  {
    const rng = mulberry32(1010);
    const starCount = 900;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = rng() * Math.PI * 0.44;
      const r = 68;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = 6 + r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sPts = new THREE.Points(
      sGeo,
      new THREE.PointsMaterial({ color: 0xfff8dc, size: 0.35, transparent: true, opacity: 0.9 }),
    );
    skyG.add(sPts);
  }

  // Gộp mesh tĩnh Sân thượng Tầng 10 thành InstancedMesh & tắt raycast trang trí
  optimizeStaticLibraryGroup(world, [scopePivot, skyG]);

  const groundY = (x: number, z: number) => {
    const support = queryLibraryGround(createLibraryLocation(10, x, z, 0));
    return support.supported && support.elevation !== null ? support.elevation : 0;
  };

  const blockedAt = (x: number, z: number) => {
    const loc = createLibraryLocation(10, x, z, 0);
    const res = resolveLibraryMovement(loc, loc);
    return res.blocked || !res.grounded;
  };

  const update = (dt: number, elapsed: number) => {
    scopePivot.rotation.y = 0.55 + Math.sin(elapsed * 0.35) * 0.25;
    skyG.rotation.y += dt * 0.008;
  };

  return {
    telescopePos: { x: SD.x + 0.6, y: SD.y, z: SD.z + 0.2 },
    scopePivot,
    groundY,
    blockedAt,
    update,
  };
}
