// ---------------------------------------------------------------------------
// TienLake.tsx — Hồ Tiền (Bước 3 + đợt sửa lần 2, brief §3: bỏ hình "nấm hồng")
// Tách từ components/three/Landmarks.tsx (TienLake + LotusField) để luồng
// hồ/sân/cây sửa độc lập, không đụng Landmarks.tsx (C1/Parabol/thư viện/C9)
// hay chức năng học tập.
//
// ĐỢT SỬA LẦN 2 (brief §3, ảnh Hồ Tiền library.hust.edu.vn — chỉ quan sát):
// - HOA: bỏ đầu cầu hồng trên cọng nâu ("nấm"). Hoa mới = nón dẹt có thể
//   tích (đợt r2p-A mục 4): 8 cánh ngoài xòe + 5 cánh trong dựng đứng khép
//   thành chén hoa, nhị cam-đỏ ở giữa; nụ cánh khép đứng, lõi hồng đậm.
//   Cuống mảnh màu xanh-nâu dịu, cao 0,30 m. Số hoa 420 → 150.
// - LÁ: bỏ đĩa tròn đều dày. Lá mới = phiến hữu cơ có KHE KHUYẾT hình nêm
//   (ShapeGeometry: cung tròn khuyết một góc rồi khép về tâm — kiểu lá súng
//   trong ảnh tham chiếu), 2 cỡ khe khác nhau, kích thước/góc xoay lệch nhau,
//   nằm sát mặt nước (y ≈ 0,09). Lá 5.000 → 2.400, bèo 700 → 400.
// - PHÂN BỐ: vẫn cụm không đều theo seed cố định (28 tâm cụm, 65% quanh
//   cụm) nhưng tổng diện tích lá giảm rõ → độ phủ đo thật kỳ vọng ~50%
//   (trước 73,19%), lá nhiều hơn hoa, xen khoảng nước nhìn thấy được.
// - NƯỚC: bỏ xanh-đen đặc #12241F → xanh xám/ôliu dịu #5E7268, roughness
//   0,28 (phản chiếu nhẹ, không phản xạ nặng), KHÔNG nhận bóng
//   (receiveShadow=false) để hết các bóng đen sắc cạnh của lá/cuống làm
//   mặt nước loang lổ. Gợn chậm ±0,008 m. Mực nước giữ y = 0,05.
// - BỜ KÈ: hạ từ 0,85 m → 0,45 m (gờ trên cùng 0,51 m) — mép bờ thấp hợp
//   lý, vẫn có bề dày + mặt trên (gờ bê tông) + chân kè. THUẦN HÌNH ẢNH:
//   collider AABB trong lib/campus.ts KHÔNG đổi nên bờ vẫn chặn người chơi.
// - LIỄU (ĐỢT 3, brief §3 — bỏ "sợi dây" dưới tán): XÓA HẲN 8 cành rủ
//   cong (ống TubeGeometry) + 56 cụm lá dài-mỏng dọc cành — ảnh cận
//   06/11 (test-shots/r3-tree-before-willow-west-close.png) cho thấy các
//   cành rủ đọc thành sợi dây xanh dài như dây điện/chân sứa. Không thay
//   bằng dây màu khác, không thêm rễ khí sinh hay cành rủ. Tán mới = 7 cụm
//   lệch nhau, dẹt/tròn KHÔNG đều (sy 0,62–1,0 theo từng cụm, không còn
//   dẹt đều 0,55 như cũ), gồm 2 cụm rìa thấp chạm mép tán; 4 sắc xanh giữ
//   nguyên. Thân thuôn + 4 nhánh nối thực sự với tán giữ nguyên; thêm
//   rotY biến thể theo seed. Liễu vẫn KHÔNG có collider (xem cuối file).
// Mực nước (giữ nguyên): nước y = 0,05; gờ bê tông y = 0,51 (thấp hơn
//   0,46 m). KHÔNG đặt mặt nước ngang bằng sân.
// KHÔNG thêm đảo, thủy đình, cầu đỏ hay đài phun nước (brief §6).
// Không gán nhãn loài hoa trên giao diện (chưa xác minh).
// Mọi số đo/vị trí lấy từ lib/campus.ts (LAKE, LAKE_BANK, LAKE_BENCHES,
// LAKE_WILLOWS). Không đổi collider — xem ghi chú cuối file.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAKE, LAKE_BANK, LAKE_BENCHES, LAKE_WILLOWS } from '../../lib/campus';
import { playerState } from '../../lib/playerState';
import {
  makeBarkTexture,
  makeFoliageCanopyTexture,
  makeSoftShadowTexture,
  makeStoneBankTexture,
  makeWalkwayBrickTexture,
  makeWaterRippleBumpTexture,
  makeWoodGrainTexture,
} from './materials';

// --- Bảng màu chốt (reference-visual §0, ước lượng từ ảnh; nước + hoa sửa
// theo brief đợt 2 §3) --------------------------------------------------------
const LAKE_WATER = '#5E7268'; // nước Hồ Tiền, xanh xám/ôliu DỊU (trước #12241F gần như đen)
const LOTUS_LEAF = '#2F5D3A'; // lá súng, xanh đậm
const LOTUS_LEAF_2 = '#3A6B44'; // lá súng, xanh đậm nhạt hơn một nấc
const LOTUS_LEAF_3 = '#27512F'; // lá súng, xanh đậm sẫm hơn một nấc
const LOTUS_FLOWER = '#E85A9B'; // hoa súng, hồng tươi
const LOTUS_FLOWER_LIGHT = '#F07AB0'; // cánh hồng nhạt
const LOTUS_FLOWER_DEEP = '#D6458A'; // cánh/nụ hồng đậm
const LOTUS_CENTER = '#E8641F'; // nhị, cam-đỏ
const LOTUS_BUD_CORE = '#C94F83'; // lõi nụ, hồng đậm
const DUCKWEED = '#7CB342'; // bèo/lục bình, xanh non
const BANK_STONE = '#8A8D85'; // bờ kè đá hộc, xám
const BANK_STONE_DARK = '#7C7F77'; // bệ chân kè, xám sẫm hơn một nấc
const BANK_RIM = '#B9B9B0'; // gờ bê tông trên bờ kè
const PAVE = '#B7AFA3'; // lối đi lát gạch quanh hồ, xám ấm (ước lượng)
const PAVE_EDGE = '#9A9284'; // viền sẫm của lối lát
const TRUNK = '#6B5138';
const WILLOW_LEAF = '#5D7D4A';
const WILLOW_LEAF_LIGHT = '#6E8F57';
const WILLOW_LEAF_GOLD = '#5A7D2A';
const WILLOW_LEAF_PALE = '#7C9B60';
const STEM_GREEN = '#5F7046'; // cuống hoa, xanh-nâu dịu (trước #7A3B2E nâu đỏ)
const BENCH_WOOD = '#7A5230'; // ghế gỗ nâu
const BENCH_IRON = '#1A1A1A'; // khung ghế sắt đen

// Mực nước / mép bờ (m): nước 0,05 — mép đá 0,45 (chênh 0,40 m) — gờ 0,51.
// Đợt 2 hạ bờ 0,85 → 0,45: mép bờ thấp, hợp tỉ lệ người (cao 1,7 m).
const WATER_Y = LAKE.waterY; // 0,05 — giữ nguyên hằng số campus.ts
const BANK_H = 0.45; // chiều cao tường kè đá (phần nổi trên mặt nước)
const BANK_BASE_H = 0.18; // bệ chân kè
const RIM_H = 0.06; // gờ bê tông: dày 0,06, mặt trên y = 0,51
const WALKWAY_Y = 0.035; // mặt lối lát (cỏ 0 → sân 0,015 → đường 0,02 → lát 0,035)
const WALKWAY_EDGE_Y = 0.045;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Hình học lá/cánh (dựng một lần, dùng chung cho mọi instance) -----------
// Lá súng: phiến tròn bán kính 0,5 có KHE KHUYẾT hình nêm về tâm + UV tâm phiến lá
// để áp texture gân lá tỏa tròn (radial veins + bumpMap).
function makeLeafGeometry(notch: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  const half = notch / 2;
  shape.absarc(0, 0, 0.5, half, Math.PI * 2 - half, false);
  shape.lineTo(0, 0);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) + 0.5;
    uv[i * 2 + 1] = pos.getY(i) + 0.5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Cánh hoa súng/sen: phiến cánh hình thìa khum (cupped spoon-petal) bằng BufferGeometry,
// gốc hẹp ở y = 0, bụng bầu rộng ở y = 0,14, đầu khum nhọn dịu ở y = 0,27; lòng cánh
// uốn lõm vào tâm hoa (-Z) và chóp hơi ngả nhẹ tự nhiên thay vì khối nón nhọn thô.
function makePetalGeometry(): THREE.BufferGeometry {
  const uSteps = 8;
  const vSteps = 4;
  const cols = vSteps + 1;
  const height = 0.27;
  const maxHalfW = 0.088;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iu = 0; iu <= uSteps; iu++) {
    const t = iu / uSteps;
    const widthProfile =
      t === 0
        ? 0.2
        : t === 1
          ? 0.0
          : Math.pow(Math.sin(Math.pow(t, 0.72) * Math.PI), 0.75);
    const halfW = maxHalfW * widthProfile;
    const y = t * height;
    // Khum bụng nhẹ ra ngoài (+Z) ở giữa cánh và hơi cụp vào trong ở chóp
    const bellyZ = Math.sin(t * Math.PI) * 0.022 - Math.pow(Math.max(0, t - 0.65), 2) * 0.02;

    for (let iv = 0; iv <= vSteps; iv++) {
      const s = (iv / vSteps) * 2 - 1; // -1..1
      const x = s * halfW;
      // Hai mép cánh uốn vào lòng hoa (-Z) tạo độ khum chén sâu tự nhiên
      const cupZ = bellyZ - s * s * 0.026 * (1 - t * 0.35);
      positions.push(x, y, cupZ);
      uvs.push(0.5 + s * 0.45 * Math.max(0.2, widthProfile), t);
    }
  }

  for (let iu = 0; iu < uSteps; iu++) {
    for (let iv = 0; iv < vSteps; iv++) {
      const a = iu * cols + iv;
      const b = a + 1;
      const c = (iu + 1) * cols + iv;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeLilypadPbrTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  const bc = document.createElement('canvas');
  bc.width = 256;
  bc.height = 256;
  const bctx = bc.getContext('2d');

  if (ctx && bctx) {
    const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
    grad.addColorStop(0, '#D9F2C6');
    grad.addColorStop(0.55, '#F2FBE8');
    grad.addColorStop(0.92, '#E2EFC8');
    grad.addColorStop(1, '#4C7A34');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    bctx.fillStyle = '#787878';
    bctx.fillRect(0, 0, 256, 256);

    // Tâm cuống lá & 14 tia gân tỏa tròn ra mép phiến lá súng
    for (let k = 0; k < 14; k++) {
      const ang = (k / 14) * Math.PI * 2;
      const ex = 128 + Math.cos(ang) * 120;
      const ey = 128 + Math.sin(ang) * 120;
      ctx.strokeStyle = 'rgba(180, 220, 140, 0.45)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      bctx.strokeStyle = '#C4C4C4';
      bctx.lineWidth = 3;
      bctx.beginPath();
      bctx.moveTo(128, 128);
      bctx.lineTo(ex, ey);
      bctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 250, 210, 0.55)';
    ctx.beginPath();
    ctx.arc(128, 128, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.needsUpdate = true;
  return { map, bumpMap };
}

function makeLotusPetalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    // FlipY mặc định: đỉnh canvas (y = 0) tương ứng chóp cánh (v = 1)
    const grad = ctx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0.0, '#FFFDF5');
    grad.addColorStop(0.32, '#FCE7F3');
    grad.addColorStop(0.76, '#F472B6');
    grad.addColorStop(1.0, '#DB2777');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
    ctx.lineWidth = 1.6;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(64 + k * 6, 252);
      ctx.quadraticCurveTo(64 + k * 14, 128, 64 + k * 5, 10);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const LEAF_TONES = [LOTUS_LEAF, LOTUS_LEAF_2, LOTUS_LEAF_3];
const PETAL_TONES = [LOTUS_FLOWER, LOTUS_FLOWER_LIGHT, LOTUS_FLOWER_DEEP];

// --- Lá súng / bèo / hoa ----------------------------------------------------
// Seed + thứ tự rút số giữ như bản Bước 3 (cụm → lá → bèo → hoa) để vị trí
// các cụm ổn định; chỉ đổi SỐ LƯỢNG và hình học từng đối tượng.
export function LotusField() {
  const rand = useMemo(() => mulberry32(20261105), []);
  // Cụm tự nhiên: ~28 tâm cụm rải đều trong hồ; 65% lá/bèo/hoa rơi quanh một
  // tâm cụm (lệch chuẩn ~4,5 m), 35% còn lại rải đều để không hở mảng nước
  // lớn giữa các cụm. Cùng một seed → vị trí ổn định giữa các lần tải.
  const clusters = useMemo(() => {
    const cs: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 28; i++) {
      cs.push({
        x: LAKE.center.x - LAKE.halfW + 3 + rand() * (LAKE.halfW * 2 - 6),
        z: LAKE.center.z - LAKE.halfL + 3 + rand() * (LAKE.halfL * 2 - 6),
      });
    }
    return cs;
  }, [rand]);
  const placeInLake = (inset: number): { x: number; z: number } => {
    let x: number;
    let z: number;
    if (rand() < 0.65) {
      const c = clusters[Math.floor(rand() * clusters.length)];
      // Tổng 3 uniform − 1,5 ≈ phân phối chuẩn, lệch chuẩn ~4,5 m.
      const ox = (rand() + rand() + rand() - 1.5) * 9;
      const oz = (rand() + rand() + rand() - 1.5) * 9;
      x = c.x + ox;
      z = c.z + oz;
    } else {
      x = LAKE.center.x - LAKE.halfW + inset + rand() * (LAKE.halfW * 2 - inset * 2);
      z = LAKE.center.z - LAKE.halfL + inset + rand() * (LAKE.halfL * 2 - inset * 2);
    }
    // Kẹp vào trong hồ (cách mép ≥ inset) để lá không trèo lên bờ kè.
    x = Math.min(Math.max(x, LAKE.center.x - LAKE.halfW + inset), LAKE.center.x + LAKE.halfW - inset);
    z = Math.min(Math.max(z, LAKE.center.z - LAKE.halfL + inset), LAKE.center.z + LAKE.halfL - inset);
    return { x, z };
  };

  // Lá súng: 2.400 lá có khe khuyết (2 cỡ khe, chia 2 mesh), bán kính thật
  // 0,4–0,85 m (scale 0,8–1,7 trên phiến r = 0,5), nằm sát mặt nước.
  // Bèo: 400 mảng nhỏ, bán kính thật 0,25–0,4 m.
  const leavesA = useMemo(() => {
    const arr: Array<{ x: number; z: number; r: number; a: number; y: number }> = [];
    for (let i = 0; i < 1300; i++) {
      const p = placeInLake(1.5);
      arr.push({ x: p.x, z: p.z, r: 0.8 + rand() * 0.9, a: rand() * Math.PI * 2, y: 0.085 + rand() * 0.01 });
    }
    return arr;
  }, [rand]);
  const leavesB = useMemo(() => {
    const arr: Array<{ x: number; z: number; r: number; a: number; y: number }> = [];
    for (let i = 0; i < 1100; i++) {
      const p = placeInLake(1.5);
      arr.push({ x: p.x, z: p.z, r: 0.8 + rand() * 0.9, a: rand() * Math.PI * 2, y: 0.085 + rand() * 0.01 });
    }
    return arr;
  }, [rand]);
  const weeds = useMemo(() => {
    const arr: Array<{ x: number; z: number; r: number; a: number }> = [];
    for (let i = 0; i < 400; i++) {
      const p = placeInLake(1.5);
      arr.push({ x: p.x, z: p.z, r: 0.5 + rand() * 0.3, a: rand() * Math.PI * 2 });
    }
    return arr;
  }, [rand]);
  // Hoa: 150 bông (90 nở + 60 nụ) trên cuống mảnh cao 0,30 m — giảm rõ so
  // với 420 bông bản cũ. Bông nở: cánh xòe; nụ: cánh khép đứng, nhỏ hơn.
  const flowers = useMemo(() => {
    const arr: Array<{ x: number; z: number; s: number; bud: boolean; rot: number; tilt: number }> = [];
    for (let i = 0; i < 150; i++) {
      const p = placeInLake(2);
      const bud = i >= 90; // 90 bông nở đầu, 60 nụ sau
      arr.push({
        x: p.x,
        z: p.z,
        s: bud ? 0.55 + rand() * 0.25 : 0.9 + rand() * 0.4,
        bud,
        rot: rand() * Math.PI * 2,
        tilt: 0.1 + rand() * 0.25, // cuống hơi nghiêng, không dựng đứng đều
      });
    }
    return arr;
  }, [rand]);

  const leafGeoA = useMemo(() => makeLeafGeometry(0.55), []);
  const leafGeoB = useMemo(() => makeLeafGeometry(1.05), []);
  const petalGeo = useMemo(() => makePetalGeometry(), []);
  const lilypadPbr = useMemo(() => makeLilypadPbrTextures(), []);
  const petalTex = useMemo(() => makeLotusPetalTexture(), []);

  useEffect(
    () => () => {
      leafGeoA.dispose();
      leafGeoB.dispose();
      petalGeo.dispose();
      lilypadPbr.map.dispose();
      lilypadPbr.bumpMap.dispose();
      petalTex.dispose();
    },
    [leafGeoA, leafGeoB, petalGeo, lilypadPbr, petalTex],
  );

  const leafRefA = useRef<THREE.InstancedMesh>(null);
  const leafRefB = useRef<THREE.InstancedMesh>(null);
  const weedRef = useRef<THREE.InstancedMesh>(null);
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const petalRef = useRef<THREE.InstancedMesh>(null);
  const centerRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    const setLeaf = (
      mesh: THREE.InstancedMesh | null,
      list: Array<{ x: number; z: number; r: number; a: number; y?: number }>,
      yDefault: number,
    ) => {
      if (!mesh) return;
      list.forEach((p, i) => {
        e.set(-Math.PI / 2, 0, p.a);
        q.setFromEuler(e);
        v.set(p.x, p.y ?? yDefault, p.z);
        s.set(p.r, p.r, p.r);
        m.compose(v, q, s);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    // Lá/bèo nổi sát mặt nước (nước y = 0,05; lá 0,085–0,095; bèo 0,08).
    // Màu từng lá lệch nhau trong 3 sắc xanh đậm → không còn một màu phẳng.
    setLeaf(leafRefA.current, leavesA, 0.09);
    setLeaf(leafRefB.current, leavesB, 0.09);
    setLeaf(weedRef.current, weeds, 0.08);
    [leafRefA, leafRefB].forEach((ref) => {
      const mesh = ref.current;
      if (!mesh) return;
      const n = mesh.count;
      for (let i = 0; i < n; i++) {
        col.set(LEAF_TONES[i % LEAF_TONES.length]);
        // Lệch nhẹ độ sáng từng lá (±8%) để mặt lá không phẳng một màu.
        const f = 0.92 + ((i * 37) % 17) / 100;
        col.multiplyScalar(f);
        mesh.setColorAt(i, col);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    if (weedRef.current) {
      for (let i = 0; i < weeds.length; i++) {
        col.set(DUCKWEED);
        const f = 0.9 + ((i * 53) % 19) / 100;
        col.multiplyScalar(f);
        weedRef.current.setColorAt(i, col);
      }
      if (weedRef.current.instanceColor) weedRef.current.instanceColor.needsUpdate = true;
    }

    // Hoa: cuống + 13 cánh/bông (8 ngoài + 5 trong) + tâm (nhị cam-đỏ cho
    // bông nở, lõi hồng đậm thuôn cho nụ). Cánh: Euler 'YXZ' — nghiêng khỏi
    // phương đứng rồi xoay quanh Y theo góc cánh → cánh xòe ra ngoài quanh tâm.
    if (stemRef.current && petalRef.current && centerRef.current) {
      flowers.forEach((p, fi) => {
        const topY = 0.33; // ngọn cuống (~0,28 m trên mặt nước)
        // Cuống mảnh (r 0,012–0,02), cao 0,30 m, hơi nghiêng.
        e.set(p.tilt, 0, (p.rot % 0.4) - 0.2);
        q.setFromEuler(e);
        v.set(p.x, 0.2, p.z);
        s.set(1, 1, 1);
        m.compose(v, q, s);
        stemRef.current!.setMatrixAt(fi, m);
        // 13 cánh/bông: 8 cánh ngoài xòe thành chén + 5 cánh trong dựng
        // đứng ôm nhị; cánh hình thìa khum lõm tự nhiên nên giữ tỉ lệ 3D chuẩn.
        for (let k = 0; k < 8; k++) {
          const az = p.rot + (k / 8) * Math.PI * 2 + (rand() - 0.5) * 0.12;
          // Bông nở xòe 0,78–1,08 rad; nụ khép 0,2–0,42 rad ôm lấy lõi.
          const tilt = p.bud ? 0.2 + rand() * 0.22 : 0.78 + rand() * 0.3;
          e.set(tilt, az, 0, 'YXZ');
          q.setFromEuler(e);
          v.set(p.x, topY, p.z);
          const ps = p.s * (0.9 + rand() * 0.2);
          s.set(ps, ps, ps);
          m.compose(v, q, s);
          petalRef.current!.setMatrixAt(fi * 13 + k, m);
          col.set(PETAL_TONES[(fi + k) % PETAL_TONES.length]);
          petalRef.current!.setColorAt(fi * 13 + k, col);
        }
        for (let j = 0; j < 5; j++) {
          const az = p.rot + ((j + 0.5) / 5) * Math.PI * 2 + (rand() - 0.5) * 0.12;
          const tilt = p.bud ? 0.12 + rand() * 0.16 : 0.28 + rand() * 0.22;
          e.set(tilt, az, 0, 'YXZ');
          q.setFromEuler(e);
          v.set(p.x, topY, p.z);
          const ps = p.s * 0.68 * (0.9 + rand() * 0.2);
          s.set(ps, ps, ps);
          m.compose(v, q, s);
          petalRef.current!.setMatrixAt(fi * 13 + 8 + j, m);
          col.set(PETAL_TONES[(fi + j + 1) % PETAL_TONES.length]);
          petalRef.current!.setColorAt(fi * 13 + 8 + j, col);
        }
        // Tâm bông.
        e.set(0, 0, 0);
        q.setFromEuler(e);
        v.set(p.x, topY + 0.02, p.z);
        if (p.bud) s.set(p.s * 0.7, p.s * 1.5, p.s * 0.7); // lõi nụ thuôn đứng
        else s.set(p.s, p.s * 0.5, p.s); // nhị dẹt
        m.compose(v, q, s);
        centerRef.current!.setMatrixAt(fi, m);
        col.set(p.bud ? LOTUS_BUD_CORE : LOTUS_CENTER);
        centerRef.current!.setColorAt(fi, col);
      });
      stemRef.current.instanceMatrix.needsUpdate = true;
      petalRef.current.instanceMatrix.needsUpdate = true;
      centerRef.current.instanceMatrix.needsUpdate = true;
      if (petalRef.current.instanceColor) petalRef.current.instanceColor.needsUpdate = true;
      if (centerRef.current.instanceColor) centerRef.current.instanceColor.needsUpdate = true;
    }

    // Đo độ phủ THẬT của lá + bèo (không ước lượng bằng tổng diện tích):
    // lưới 0,25 m phủ toàn hồ, đánh dấu ô nào nằm trong ít nhất một đĩa;
    // tỉ lệ ô phủ = độ phủ mặt hồ. Đắt rẻ: mỗi đĩa chỉ quét ô trong khung
    // bao của nó (~7×7 ô), tổng ~2.800 đĩa → ~120k phép kiểm, chạy một lần.
    // Lưu ý: lá thật có khe khuyết nên diện tích thật nhỏ hơn đĩa ước
    // lượng này một chút — số đo là cận trên của độ phủ lá.
    const step = 0.25;
    const nx = Math.round((LAKE.halfW * 2) / step);
    const nz = Math.round((LAKE.halfL * 2) / step);
    const grid = new Uint8Array(nx * nz);
    const markDisc = (cx: number, cz: number, r: number) => {
      const x0 = LAKE.center.x - LAKE.halfW;
      const z0 = LAKE.center.z - LAKE.halfL;
      const i0 = Math.max(0, Math.floor((cx - r - x0) / step));
      const i1 = Math.min(nx - 1, Math.ceil((cx + r - x0) / step));
      const j0 = Math.max(0, Math.floor((cz - r - z0) / step));
      const j1 = Math.min(nz - 1, Math.ceil((cz + r - z0) / step));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const px = x0 + (i + 0.5) * step;
          const pz = z0 + (j + 0.5) * step;
          if ((px - cx) ** 2 + (pz - cz) ** 2 <= r * r) grid[j * nx + i] = 1;
        }
      }
    };
    // Bán kính thật = 0,5 (bán kính phiến gốc) × scale p.r.
    leavesA.forEach((p) => markDisc(p.x, p.z, 0.5 * p.r));
    leavesB.forEach((p) => markDisc(p.x, p.z, 0.5 * p.r));
    weeds.forEach((p) => markDisc(p.x, p.z, 0.5 * p.r));
    let covered = 0;
    for (let k = 0; k < grid.length; k++) covered += grid[k];
    playerState.lakeCoverage = covered / grid.length;
  }, [leavesA, leavesB, weeds, flowers, leafGeoA, leafGeoB, petalGeo, rand]);

  return (
    <group>
      {/* Lá súng xanh đậm, phiến có khe khuyết (2 cỡ khe), phủ mặt nước —
          độ phủ thật đo ở trên, mục tiêu ~50% để xen khoảng nước nhìn thấy
          được (trước đây ~73%). */}
      <instancedMesh ref={leafRefA} args={[leafGeoA, undefined, leavesA.length]}>
        <meshStandardMaterial
          color="#FFFFFF"
          map={lilypadPbr.map}
          bumpMap={lilypadPbr.bumpMap}
          bumpScale={0.012}
          roughness={0.82}
        />
      </instancedMesh>
      <instancedMesh ref={leafRefB} args={[leafGeoB, undefined, leavesB.length]}>
        <meshStandardMaterial
          color="#FFFFFF"
          map={lilypadPbr.map}
          bumpMap={lilypadPbr.bumpMap}
          bumpScale={0.012}
          roughness={0.82}
        />
      </instancedMesh>
      {/* Mảng bèo xanh non xen kẽ (phiến nhỏ có khe khuyết). */}
      <instancedMesh ref={weedRef} args={[leafGeoB, undefined, weeds.length]}>
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </instancedMesh>
      {/* Hoa: cuống mảnh xanh-nâu cao 0,30 m + 13 cánh/bông hình thìa khum mềm mại + tâm. */}
      <instancedMesh ref={stemRef} args={[undefined, undefined, flowers.length]}>
        <cylinderGeometry args={[0.012, 0.02, 0.3, 6]} />
        <meshStandardMaterial color={STEM_GREEN} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={petalRef} args={[petalGeo, undefined, flowers.length * 13]}>
        <meshStandardMaterial
          color="#FFFFFF"
          map={petalTex}
          roughness={0.62}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh ref={centerRef} args={[undefined, undefined, flowers.length]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

// --- Liễu ven hồ: thân + nhánh + tán cụm lệch (ĐỢT 3: KHÔNG cành rủ) -------
// Mỗi cây: thân thuôn + 4 cành nhánh chĩa ra tán + 7 cụm tán lệch nhau,
// dẹt/tròn không đều. KHÔNG còn cành rủ (đợt 3 đã xóa: ống cong +
// cụm lá dọc cành đọc thành sợi dây). Mọi góc/kích thước/màu rút từ seed
// cố định → 9 cây đều khác nhau nhưng build nào cũng giống nhau
// (không dùng Math.random()).

type WillowSpec = {
  s: number;
  rotY: number;
  trunkH: number;
  tilt: number;
  branches: Array<{ az: number; tilt: number; len: number; r: number }>;
  lobes: Array<{ dx: number; dy: number; dz: number; r: number; sy: number; color: string }>;
};

const WILLOW_TONES = [WILLOW_LEAF, WILLOW_LEAF_LIGHT, WILLOW_LEAF_GOLD, WILLOW_LEAF_PALE];

function buildWillowSpecs(): WillowSpec[] {
  const rand = mulberry32(20261106);
  return LAKE_WILLOWS.map(() => {
    const trunkH = 2.6 + rand() * 0.8;
    const branches = [0, 1, 2, 3].map((k) => ({
      az: (k / 4) * Math.PI * 2 + rand() * 0.9,
      tilt: 0.45 + rand() * 0.35,
      len: 1.2 + rand() * 0.6,
      r: 0.05 + rand() * 0.03,
    }));
    // Tán 7 cụm lệch nhau, dẹt/tròn KHÔNG đều (sy mỗi cụm rút riêng trong
    // khoảng của nó — không còn dẹt đều 0,55 như bản cũ, nên không đọc
    // thành đĩa tròn phẳng xếp chồng như mũ nấm). Khối chính + khối đỉnh +
    // 3 khối bên + 2 khối rìa THẤP (đáy cụm ≈ trunkH − 0,1 m, vẫn cao hơn
    // đầu người ~0,8 m, khoảng trống dưới tán thoáng, không có collider).
    // Góc mỗi cụm rút ngẫu nhiên (không chia đều) để silhouette lệch hẳn.
    const a = () => rand() * Math.PI * 2;
    const off = (r: number) => ({ dx: Math.cos(a()) * r, dz: Math.sin(a()) * r });
    const tone = () => WILLOW_TONES[Math.floor(rand() * 4)];
    const lobes = [
      { ...off(0.15), dy: trunkH + 0.95, r: 1.75, sy: 0.78 + rand() * 0.1, color: WILLOW_TONES[Math.floor(rand() * 2)] },
      { ...off(0.5), dy: trunkH + 1.6, r: 1.15, sy: 0.88 + rand() * 0.12, color: tone() },
      { ...off(1.05), dy: trunkH + 0.85, r: 1.0, sy: 0.62 + rand() * 0.1, color: tone() },
      { ...off(0.95), dy: trunkH + 1.2, r: 0.9, sy: 0.95 + rand() * 0.05, color: tone() },
      { ...off(1.15), dy: trunkH + 1.45, r: 0.72, sy: 0.7 + rand() * 0.15, color: tone() },
      { ...off(1.35), dy: trunkH + 0.45, r: 0.62, sy: 0.82 + rand() * 0.12, color: tone() },
      { ...off(1.2), dy: trunkH + 0.6, r: 0.55, sy: 0.68 + rand() * 0.15, color: tone() },
    ];
    return {
      s: 0.88 + rand() * 0.3,
      rotY: rand() * Math.PI * 2,
      trunkH,
      tilt: (rand() - 0.5) * 0.14,
      branches,
      lobes,
    };
  });
}

function LakeWillow({
  x,
  z,
  spec,
  barkPbr,
  foliagePbr,
  shadowTex,
}: {
  x: number;
  z: number;
  spec: WillowSpec;
  barkPbr: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  foliagePbr: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  shadowTex: THREE.CanvasTexture;
}) {
  const canopyRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!canopyRef.current) return;
    const t = state.clock.elapsedTime;
    canopyRef.current.rotation.z = Math.sin(t * 1.1 + x * 0.2) * 0.02;
    canopyRef.current.rotation.x = Math.cos(t * 0.85 + z * 0.2) * 0.015;
  });

  return (
    <group position={[x, 0, z]} scale={spec.s} rotation-y={spec.rotY} rotation-z={spec.tilt}>
      {/* Bóng tiếp xúc mềm dưới gốc cây liễu ven hồ */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.048 / spec.s, 0]}>
        <planeGeometry args={[4.2, 4.2]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.36} depthWrite={false} />
      </mesh>
      {/* Thân thuôn, hơi nghiêng theo cả cây + vân vỏ cây PBR. */}
      <mesh position={[0, spec.trunkH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.24, spec.trunkH, 10]} />
        <meshStandardMaterial
          color={TRUNK}
          map={barkPbr.map}
          bumpMap={barkPbr.bumpMap}
          bumpScale={0.025}
          roughness={0.92}
        />
      </mesh>
      {/* 4 cành nhánh từ ngọn thân chĩa ra tán. */}
      {spec.branches.map((b, i) => (
        <group key={`br-${i}`} position={[0, spec.trunkH, 0]} rotation-y={-b.az}>
          <group rotation-z={b.tilt}>
            <mesh position={[0, b.len / 2, 0]} castShadow>
              <cylinderGeometry args={[b.r * 0.6, b.r, b.len, 6]} />
              <meshStandardMaterial
                color={TRUNK}
                map={barkPbr.map}
                bumpMap={barkPbr.bumpMap}
                bumpScale={0.018}
                roughness={0.92}
              />
            </mesh>
          </group>
        </group>
      ))}
      {/* 7 cụm tán lệch nhau, dẹt/tròn KHÔNG đều + vân tán lá PBR + đung đưa nhẹ theo gió. */}
      <group ref={canopyRef}>
        {spec.lobes.map((l, i) => (
          <mesh key={`lobe-${i}`} position={[l.dx, l.dy, l.dz]} scale={[1, l.sy, 1]} castShadow receiveShadow>
            <sphereGeometry args={[l.r, 16, 12]} />
            <meshStandardMaterial
              color={l.color}
              map={foliagePbr.map}
              bumpMap={foliagePbr.bumpMap}
              bumpScale={0.032}
              roughness={0.86}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// --- Ghế gỗ nâu, khung sắt đen (bản sao SimpleBench trong Landmarks.tsx) -----
function LakeBench({
  x,
  z,
  rotationY = 0,
  woodTex,
}: {
  x: number;
  z: number;
  rotationY?: number;
  woodTex: THREE.CanvasTexture;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.55]} />
        <meshStandardMaterial
          color={BENCH_WOOD}
          map={woodTex}
          bumpMap={woodTex}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[0, 0.78, -0.24]} castShadow>
        <boxGeometry args={[1.8, 0.55, 0.1]} />
        <meshStandardMaterial
          color={BENCH_WOOD}
          map={woodTex}
          bumpMap={woodTex}
          bumpScale={0.01}
          roughness={0.85}
        />
      </mesh>
      {[-0.8, 0.8].map((dx) => (
        <mesh key={dx} position={[dx, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.5]} />
          <meshStandardMaterial color={BENCH_IRON} roughness={0.5} metalness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

// --- Lối đi lát gạch quanh hồ (dải tây/bắc/nam; phía đông là đường x = 24) ---
// Dải tây: x −27,6..−25,1 (sát bờ kè tây), z −4,6..84,6.
// Dải bắc: z −7..−4,6 (sát bờ kè bắc), x −27,6..21,1.
// Dải nam: z 84,6..86 (sát bờ kè nam, gọn trong BOUNDS maxZ = 86), x −27,6..21,1.
// Các dải chỉ CHẠM nhau ở mép (không chồng mặt) để khỏi z-fighting; mặt lát
// y = 0,035, viền sẫm y = 0,045 — đều cao hơn cỏ (0) / đường (0,02) / sân
// (0,015) nhưng không chồng lên bất kỳ mặt nào khác.
const WALKWAYS: Array<{ cx: number; cz: number; w: number; l: number }> = [
  { cx: -26.35, cz: LAKE.center.z, w: 2.5, l: 89.2 }, // tây
  { cx: -3.25, cz: LAKE.center.z - LAKE.halfL - 1.8, w: 48.7, l: 2.4 }, // bắc (phía nam đường chính z = -6)
  { cx: -3.25, cz: LAKE.center.z + LAKE.halfL + 1.3, w: 48.7, l: 1.4 }, // nam
];

export function TienLake() {
  const w = LAKE.halfW * 2; // 45 m
  const l = LAKE.halfL * 2; // 88 m
  const willowSpecs = useMemo(() => buildWillowSpecs(), []);
  const waterRef = useRef<THREE.Mesh>(null);
  const lakeTextures = useMemo(() => {
    const waterBump = makeWaterRippleBumpTexture(10, 18);
    const stoneBank = makeStoneBankTexture(16, 1);
    const walkwayBrick = makeWalkwayBrickTexture(2, 32);
    const barkPbr = makeBarkTexture(2, 4);
    const foliagePbr = makeFoliageCanopyTexture(3, 3);
    const woodTex = makeWoodGrainTexture(2, 1);
    const shadowTex = makeSoftShadowTexture();
    return { waterBump, stoneBank, walkwayBrick, barkPbr, foliagePbr, woodTex, shadowTex };
  }, []);

  useEffect(
    () => () => {
      lakeTextures.waterBump.dispose();
      lakeTextures.stoneBank.dispose();
      lakeTextures.walkwayBrick.dispose();
      lakeTextures.barkPbr.map.dispose();
      lakeTextures.barkPbr.bumpMap.dispose();
      lakeTextures.foliagePbr.map.dispose();
      lakeTextures.foliagePbr.bumpMap.dispose();
      lakeTextures.woodTex.dispose();
      lakeTextures.shadowTex.dispose();
    },
    [lakeTextures],
  );

  // Gợn nhẹ, chậm: mặt nước dao động ±0,008 m quanh y = 0,05 + dịch chuyển
  // vân sóng gợn (bumpMap offset) tạo hiệu ứng lấp lánh tự nhiên.
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (waterRef.current) {
      waterRef.current.position.y = WATER_Y + Math.sin(t * 0.45) * 0.008;
    }
    lakeTextures.waterBump.offset.x = (t * 0.032) % 1;
    lakeTextures.waterBump.offset.y = (t * 0.022) % 1;
  });

  return (
    <group>
      {/* Mặt nước hình chữ nhật 45 × 88 m, y = 0,05 — thấp hơn gờ bê tông
          (y = 0,51) 0,46 m. Màu xanh xám/ôliu dịu, có bumpMap gợn sóng
          chuyển động mượt + phản chiếu IBL bầu trời; KHÔNG nhận bóng để mặt nước không loang lổ bóng lá. */}
      <mesh ref={waterRef} rotation-x={-Math.PI / 2} position={[LAKE.center.x, WATER_Y, LAKE.center.z]}>
        <planeGeometry args={[w, l]} />
        <meshStandardMaterial
          color={LAKE_WATER}
          bumpMap={lakeTextures.waterBump}
          bumpScale={0.022}
          roughness={0.16}
          metalness={0.12}
          envMapIntensity={1.25}
        />
      </mesh>

      {/* Bờ kè đá hộc THẤP: tường kè cao 0,45 m ôm mép nước + bệ chân kè
          thấp nhô về phía nước + gờ bê tông phẳng trên cùng (mặt trên
          y = 0,51). Áp dụng vân đá hộc xếp lớp + rêu ẩm chân kè. */}
      {LAKE_BANK.map((b, i) => {
        const cx = (b.minX + b.maxX) / 2;
        const cz = (b.minZ + b.maxZ) / 2;
        const bw = b.maxX - b.minX;
        const bl = b.maxZ - b.minZ;
        const horizontal = bw > bl;
        const inwardX = horizontal ? 0 : cx < LAKE.center.x ? 1 : -1;
        const inwardZ = horizontal ? (cz < LAKE.center.z ? 1 : -1) : 0;
        const baseW = bw + (inwardX !== 0 ? 0.06 : 0);
        const baseL = bl + (inwardZ !== 0 ? 0.06 : 0);
        const baseCx = cx + (inwardX !== 0 ? inwardX * 0.03 : 0);
        const baseCz = cz + (inwardZ !== 0 ? inwardZ * 0.03 : 0);
        return (
          <group key={`bank-${i}`}>
            <mesh position={[cx, BANK_H / 2, cz]} castShadow receiveShadow>
              <boxGeometry args={[bw, BANK_H, bl]} />
              <meshStandardMaterial
                color="#FFFFFF"
                map={lakeTextures.stoneBank}
                bumpMap={lakeTextures.stoneBank}
                bumpScale={0.022}
                roughness={0.92}
              />
            </mesh>
            <mesh position={[baseCx, BANK_BASE_H / 2, baseCz]} receiveShadow>
              <boxGeometry args={[baseW, BANK_BASE_H, baseL]} />
              <meshStandardMaterial color={BANK_STONE_DARK} roughness={0.95} />
            </mesh>
            <mesh position={[cx, BANK_H + RIM_H / 2, cz]}>
              <boxGeometry args={[bw + 0.12, RIM_H, bl + 0.12]} />
              <meshStandardMaterial color={BANK_RIM} roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Lối đi lát gạch quanh hồ (tây/bắc/nam) + viền sẫm mép ngoài. */}
      {WALKWAYS.map((wk, i) => (
        <group key={`walk-${i}`}>
          <mesh rotation-x={-Math.PI / 2} position={[wk.cx, WALKWAY_Y, wk.cz]} receiveShadow>
            <planeGeometry args={[wk.w, wk.l]} />
            <meshStandardMaterial
              color="#FFFFFF"
              map={lakeTextures.walkwayBrick}
              bumpMap={lakeTextures.walkwayBrick}
              bumpScale={0.01}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
          {/* Viền sẫm dọc mép ngoài của dải lát. */}
          <mesh
            rotation-x={-Math.PI / 2}
            position={[
              i === 0 ? wk.cx - wk.w / 2 + 0.125 : wk.cx,
              WALKWAY_EDGE_Y,
              i === 0 ? wk.cz : i === 1 ? wk.cz - wk.l / 2 + 0.125 : wk.cz + wk.l / 2 - 0.125,
            ]}
            receiveShadow
          >
            <planeGeometry args={i === 0 ? [0.25, wk.l] : [wk.w, 0.25]} />
            <meshStandardMaterial color={PAVE_EDGE} roughness={0.95} metalness={0} />
          </mesh>
        </group>
      ))}

      <LotusField />

      {/* Liễu ven hồ: thân + nhánh + 7 cụm tán lệch + bồn gạch đỏ bo tròn quanh gốc cây (ho-tien-01.jpg). */}
      {LAKE_WILLOWS.map((wl, i) => (
        <group key={`willow-${i}`}>
          <LakeWillow
            x={wl.x}
            z={wl.z}
            spec={willowSpecs[i]}
            barkPbr={lakeTextures.barkPbr}
            foliagePbr={lakeTextures.foliagePbr}
            shadowTex={lakeTextures.shadowTex}
          />
          <mesh position={[wl.x, 0.14, wl.z]} castShadow receiveShadow>
            <cylinderGeometry args={[0.78, 0.84, 0.28, 18]} />
            <meshStandardMaterial color="#B65B43" roughness={0.88} />
          </mesh>
          <mesh position={[wl.x, 0.29, wl.z]} receiveShadow>
            <cylinderGeometry args={[0.66, 0.66, 0.03, 18]} />
            <meshStandardMaterial color="#4A6B3B" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Hàng cột đèn sân vườn 5 chao cầu trắng dọc lối dạo gạch ven Hồ Tiền (ho-tien-01.jpg) */}
      {[
        { x: -27.4, z: 13 },
        { x: -27.4, z: 32 },
        { x: -27.4, z: 50 },
        { x: -27.4, z: 66 },
        { x: -27.4, z: 86 },
        { x: 22.1, z: 14 },
        { x: 22.1, z: 36 },
        { x: 22.1, z: 60 },
        { x: 22.1, z: 84 },
      ].map((lp, idx) => (
        <group key={`lake-garden-lamp-${idx}`} position={[lp.x, 0, lp.z]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 3.2, 10]} />
            <meshStandardMaterial color={BENCH_IRON} roughness={0.55} metalness={0.4} />
          </mesh>
          {[
            [0, 3.36, 0],
            [0.24, 3.2, 0],
            [-0.24, 3.2, 0],
            [0, 3.2, 0.24],
            [0, 3.2, -0.24],
          ].map(([dx, dy, dz], bIdx) => (
            <mesh key={`lake-lamp-globe-${idx}-${bIdx}`} position={[dx, dy, dz]}>
              <sphereGeometry args={[0.13, 12, 10]} />
              <meshStandardMaterial
                color="#F8FAFC"
                emissive="#FFF2CC"
                emissiveIntensity={0.45}
                roughness={0.3}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Ghế gỗ dọc bờ, quay mặt ra hồ. */}
      {LAKE_BENCHES.map((b, i) => (
        <LakeBench
          key={`lake-bench-${i}`}
          x={b.x}
          z={b.z}
          rotationY={b.x < LAKE.center.x ? Math.PI / 2 : -Math.PI / 2}
          woodTex={lakeTextures.woodTex}
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// GHI CHÚ CHO LUỒNG TÍCH HỢP (collider — file này KHÔNG đổi collider):
// - Mực nước y = 0,05 giữ nguyên LAKE.waterY nên pointInLake /
//   resolveCollisions (lib/campus.ts) không đổi: hồ vẫn chặn avatar bằng
//   hình chữ nhật như cũ, đúng cả trước và sau khi thay file này vào.
// - Mép đá bờ kè hạ từ 0,85 → 0,45 m (gờ 0,93 → 0,51 m) là THUẦN HÌNH ẢNH:
//   collider bờ kè trong campus.ts là AABB 2D (chỉ x/z) nên chiều cao hình
//   ảnh không ảnh hưởng va chạm. Avatar vẫn không trèo qua kè được.
// - Bệ chân kè nhô 0,06 m về phía nước: nằm trong lòng hồ (vùng
//   pointInLake đã chặn), avatar không chạm tới nên không cần collider mới.
// - Bồn cỏ quảng trường C1 (Ground.tsx) cũng chưa có collider — xem ghi chú
//   trong Ground.tsx.
// ---------------------------------------------------------------------------
