// ---------------------------------------------------------------------------
// ParabolGate.tsx — Cổng Parabol (Cổng Giải Phóng), dựng lại theo brief sửa
// kiến trúc ngoại thất §3 + docs/reference-visual.md §1.
//
// Khác bản cũ trong Landmarks.tsx (giữ nguyên file đó — luồng tích hợp sẽ
// thay <ParabolGate/> ở Landmarks bằng component này):
//  1. Chân vòm CHÔN xuống đất (parabol kéo tới u = ±4,05, y ≈ -0,31 m) thay
//     vì đặt trên hai hộp bệ 2,5 m — ảnh thật: chân chạm đất trực tiếp,
//     không có bệ cao. Hộp bệ cũ còn rộng hơn dải băng cả hai phương nên
//     đọc như hai trụ đồ sộ, trái brief ("không thêm hai trụ cổng đồ sộ").
//  2. GỜ CHIA KHOANG: mỗi gờ là một "cổ áo" ôm trọn mặt cắt dải băng
//     (đoạn extrude ngắn, nở ra 0,045 m mọi phía), đặt giữa các huy hiệu —
//     bản cũ hoàn toàn không có gờ, trong khi ảnh cận cảnh thấy rõ các
//     khoang chữ nhật trên mặt dải băng.
//  3. HUY HIỆU đặt đúng GIỮA mặt dải băng (điểm giữa biên trong–ngoài) và
//     CẢ HAI mặt đông/tây — bản cũ đặt huy hiệu trên biên trong (lệch mép)
//     và chỉ một mặt tây, nên nhìn xiên huy hiệu treo lơ lửng nửa ngoài
//     mặt băng.
//  4. GỜ DỌC MÉP: hai dải nổi mỏng dọc mép trong + mép ngoài trên cả hai
//     mặt, cùng các cổ áo tạo thành khung khoang chữ nhật như ảnh.
//  5. VẾT Ố xám-xanh tính theo đường cong thật (điểm giữa dải băng tại u
//     đã chọn) thay vì tọa độ cố định — các vết ố cũ nằm ngoài mặt băng,
//     lơ lửng trong không khí.
//  6. Cổng xếp sắt đen có thêm thanh chéo chữ X (kiểu cổng xếp kéo ngang)
//     và nhà gác có thêm cửa ra mặt nam — cùng footprint cũ, không đổi
//     collider.
// Vị trí/kích thước lấy từ PARABOL_GATE trong lib/campus.ts (không sửa
// file đó): tâm (-88, 10), thông thủy 8 m, cao đỉnh đường giữa 12,5 m,
// dải băng rộng 1,2 m, dày 0,6 m theo phương đường đi (trục X).
// Footprint mới NẰM TRONG legAabbs hiện tại nên collider không cần đổi
// (xem AABB trong báo cáo bàn giao).
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PARABOL_GATE } from '../../lib/campus';
import type { TimeOfDay } from '../../lib/playerState';
import { makeWeatheredConcreteTexture } from './materials';
import { ImprovedTree } from './Trees';

// --- Màu chốt (reference-visual §0, ước lượng từ ảnh) ------------------------
const GATE_WHITE = '#F2EFE6'; // bê tông cổng Parabol, trắng ấm
const GATE_STAIN = '#9AA08E'; // vết ố xám-xanh ở mặt khuất nắng
const MEDAL = '#E8E4D8'; // huy hiệu tròn, trắng ngà hơn nền một chút
const MEDAL_CORE = '#D8D2C2'; // nhân huy hiệu, sẫm hơn vành một chút
const C1_ROOF = '#8E8A80'; // mái nhà gác / mái che, xám-nâu bạc màu
const C1_GLASS = '#6E7F8C'; // kính cửa sổ nhà gác, xám-xanh
const IRON_BLACK = '#1A1A1A'; // sắt đen: cột mái che, cổng xếp, cửa
const TRUNK = '#6B5138';
const LEAF = '#5D7D4A';

// --- Đường parabol đường giữa dải băng ---------------------------------------
// u: độ lệch theo trục Z quanh tâm cổng (u = -4 → chân nam, u = +4 → chân
// bắc, y = 0 tại mặt đất). y = H·(1 − (u/a)²), a = clearWidth/2 = 4.
// U_END = 4,05: kéo parabol xuống y ≈ −0,31 m để chân chôn dưới đất, mặt
// cắt cuối dải nằm dưới mặt đất nên không còn khe hở hình nêm ở chân.
const A = PARABOL_GATE.clearWidth / 2; // 4 m — nửa thông thủy
const H = PARABOL_GATE.height; // 12,5 m — cao đỉnh đường giữa
const W = PARABOL_GATE.depth; // 1,2 m — rộng dải băng (mặt phẳng vòm)
const T = PARABOL_GATE.ribbonThickness; // 0,6 m — dày dải băng (trục X)
const U_END = 4.05;

type CurvePoint = { u: number; y: number; dy: number; nx: number; ny: number };

function curveAt(u: number): CurvePoint {
  const y = H * (1 - (u / A) * (u / A));
  const dy = H * (-2 * u) / (A * A);
  const len = Math.hypot(1, dy);
  // Pháp tuyến (theo cặp (u, y)) hướng ra ngoài vòm: (-dy, 1) / |..|.
  return { u, y, dy, nx: -dy / len, ny: 1 / len };
}

/** Điểm giữa dải băng tại u (biên trong + pháp tuyến × W/2). */
function midAt(u: number): { z: number; y: number } {
  const c = curveAt(u);
  return {
    z: PARABOL_GATE.center.z + c.u + c.nx * (W / 2),
    y: c.y + c.ny * (W / 2),
  };
}

// --- Dựng hình extrude: tiết diện trong mặt phẳng ZY, dày theo trục X --------
/**
 * Tiết diện dải băng (hoặc một đoạn/gờ của nó) trong mặt phẳng shape-XY
 * (x_shape = u, y_shape = y), rồi xoay về mặt phẳng thế giới ZY.
 * @param u0 u đầu đoạn, @param u1 u cuối đoạn
 * @param expand nở mặt cắt ra hai phía pháp tuyến (gờ cổ áo: 0,045 m)
 * @param thickness độ dày extrude theo trục X
 * @param xCenter tâm theo trục X của khối extrude
 */
function buildRibbonPiece(
  u0: number,
  u1: number,
  expand: number,
  thickness: number,
  xCenter: number,
): THREE.ExtrudeGeometry {
  const N = Math.max(4, Math.round(((u1 - u0) / (2 * U_END)) * 96));
  const inner: Array<[number, number]> = [];
  const outer: Array<[number, number]> = [];
  for (let i = 0; i <= N; i++) {
    const u = u0 + ((u1 - u0) * i) / N;
    const c = curveAt(u);
    inner.push([u - c.nx * expand, c.y - c.ny * expand]);
    outer.push([u + c.nx * (W + expand), c.y + c.ny * (W + expand)]);
  }
  const shape = new THREE.Shape();
  shape.moveTo(outer[0][0], outer[0][1]);
  for (const [u, y] of outer) shape.lineTo(u, y);
  for (let i = inner.length - 1; i >= 0; i--) shape.lineTo(inner[i][0], inner[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  // Mặt phẳng shape XY → mặt phẳng thế giới ZY; chiều dày extrude → trục X
  // (sau rotateY(-π/2), extrude +Z thành -X nên translate +thickness/2 để
  // khối nằm cân quanh xCenter).
  g.rotateY(-Math.PI / 2);
  g.translate(xCenter + thickness / 2, 0, PARABOL_GATE.center.z);
  return g;
}

// Huy hiệu: 6/chân, cách đều dọc mặt vòm (u = 0,75..3,65, bước 0,6).
const MEDAL_U = [0.75, 1.35, 1.95, 2.55, 3.15, 3.65];
// Gờ chia khoang: 5/chân, nằm đúng giữa hai huy hiệu kề nhau.
const COLLAR_U = [1.05, 1.65, 2.25, 2.85, 3.45];
// Vết ố: mặt tây (khuất nắng) — đoạn cong trên + chân bắc.
const STAIN_U: Array<{ u: number; r: number }> = [
  { u: -1.8, r: 0.5 },
  { u: 1.4, r: 0.55 },
  { u: 3.0, r: 0.45 },
];

// --- Cây lớn hai bên cổng (như bản cũ) ---------------------------------------
// Đợt r2p-A mục 6: tán cũ là 1 cầu tròn hoàn hảo (r = canopyR) trên thân —
// đổi thành cụm 5 khối lệch nhau (khối chính lệch tâm + 4 khối phụ lệch
// cao/thấp/ngang), dẹt không đều; tỉ lệ tính theo canopyR để dùng được
// cho cả 2 cỡ cây (3,2 và 2,6 m).
function SimpleTree({ x, z, trunkH = 3.4, canopyR = 3.2, canopyY = 5 }: {
  x: number; z: number; trunkH?: number; canopyR?: number; canopyY?: number;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, trunkH, 10]} />
        <meshStandardMaterial color={TRUNK} roughness={1} />
      </mesh>
      <mesh position={[0.18 * canopyR, canopyY - 0.05 * canopyR, 0.06 * canopyR]} scale={[1, 0.8, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.58, 16, 12]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
      <mesh position={[-0.52 * canopyR, canopyY + 0.14 * canopyR, -0.12 * canopyR]} scale={[1, 0.62, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.44, 14, 10]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
      <mesh position={[0.5 * canopyR, canopyY - 0.12 * canopyR, -0.2 * canopyR]} scale={[1, 0.62, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.4, 14, 10]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
      <mesh position={[-0.1 * canopyR, canopyY + 0.3 * canopyR, 0.18 * canopyR]} scale={[1, 0.65, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.36, 12, 10]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
      <mesh position={[0.34 * canopyR, canopyY - 0.28 * canopyR, 0.24 * canopyR]} scale={[1, 0.65, 1]} castShadow>
        <sphereGeometry args={[canopyR * 0.32, 12, 10]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
    </group>
  );
}

export function ParabolGate({ timeOfDay = 'day' }: { timeOfDay?: TimeOfDay }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const concretePbr = useMemo(() => makeWeatheredConcreteTexture(2, 6), []);

  // Dải băng chính: một kết cấu liên tục, hai chân nối mượt với đỉnh
  // (parabol liền mạch, đỉnh cong mềm), mặt cắt chữ nhật 1,2 × 0,6 m có
  // cạnh, mặt ngoài, mặt trong và bề dày — tuyệt đối không ống tròn.
  const ribbonGeo = useMemo(
    () => buildRibbonPiece(-U_END, U_END, 0, T, PARABOL_GATE.center.x),
    [],
  );

  // Gờ chia khoang: "cổ áo" ôm trọn mặt cắt dải băng, nở 0,045 m mọi phía
  // (dày X 0,7 m so với 0,6 m của dải) nên đọc được cả chính diện, xiên
  // 45° và từ dưới nhìn lên — không phải đường kẻ vẽ trên mặt phẳng.
  const collarGeos = useMemo(() => {
    const geos: THREE.ExtrudeGeometry[] = [];
    for (const s of [-1, 1]) {
      for (const u of COLLAR_U) {
        geos.push(
          buildRibbonPiece(s * u - 0.07, s * u + 0.07, 0.045, T + 0.1, PARABOL_GATE.center.x),
        );
      }
    }
    return geos;
  }, []);

  // Gờ dọc mép: hai dải nổi mỏng (rộng 0,1 m theo mặt băng, nhô 0,04 m
  // khỏi mặt bên) dọc mép trong + mép ngoài, cả hai mặt đông/tây. Cùng
  // các cổ áo, chúng tạo khung khoang chữ nhật trên mặt dải băng như ảnh
  // cận cảnh. Dải nhô 0,04 m, cổ áo nhô 0,05 m nên hai mặt ngoài không
  // đồng phẳng → không nhấp nháy z-fighting ở chỗ giao nhau.
  const railGeos = useMemo(() => {
    const geos: THREE.ExtrudeGeometry[] = [];
    const buildRail = (off0: number, off1: number, xCenter: number) => {
      const N = 96;
      const lo: Array<[number, number]> = [];
      const hi: Array<[number, number]> = [];
      for (let i = 0; i <= N; i++) {
        const u = -U_END + ((2 * U_END) * i) / N;
        const c = curveAt(u);
        lo.push([u + c.nx * off0, c.y + c.ny * off0]);
        hi.push([u + c.nx * off1, c.y + c.ny * off1]);
      }
      const shape = new THREE.Shape();
      shape.moveTo(hi[0][0], hi[0][1]);
      for (const [u, y] of hi) shape.lineTo(u, y);
      for (let i = lo.length - 1; i >= 0; i--) shape.lineTo(lo[i][0], lo[i][1]);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
      g.rotateY(-Math.PI / 2);
      g.translate(xCenter + 0.02, 0, PARABOL_GATE.center.z);
      return g;
    };
    const cx = PARABOL_GATE.center.x;
    geos.push(buildRail(0, 0.1, cx - 0.32));
    geos.push(buildRail(W - 0.1, W, cx - 0.32));
    geos.push(buildRail(0, 0.1, cx + 0.32));
    geos.push(buildRail(W - 0.1, W, cx + 0.32));
    return geos;
  }, []);

  useEffect(
    () => () => {
      ribbonGeo.dispose();
      collarGeos.forEach((g) => g.dispose());
      railGeos.forEach((g) => g.dispose());
      concretePbr.map.dispose();
      concretePbr.bumpMap.dispose();
    },
    [ribbonGeo, collarGeos, railGeos, concretePbr],
  );

  const medallions = useMemo(() => {
    const list: Array<{ x: number; y: number; z: number }> = [];
    for (const s of [-1, 1]) {
      for (const u of MEDAL_U) {
        const m = midAt(s * u);
        list.push({ x: PARABOL_GATE.center.x - T / 2 - 0.02, y: m.y, z: m.z });
        list.push({ x: PARABOL_GATE.center.x + T / 2 + 0.02, y: m.y, z: m.z });
      }
    }
    return list;
  }, []);

  const stains = useMemo(
    () => STAIN_U.map(({ u, r }) => ({ ...midAt(u), r })),
    [],
  );

  // Đèn tròn âm trần (soffit downlights) gắn ở mặt bụng dưới các khoang vòm Parabol (khớp cong-parabol-03.jpg)
  const soffitLights = useMemo(() => {
    const list: Array<{ y: number; z: number; rotX: number }> = [];
    for (const s of [-1, 1]) {
      for (const u of MEDAL_U) {
        const su = s * u;
        const c = curveAt(su);
        // Mặt bụng trong vòm nằm tại offset 0 (đường cong gốc c.y, u), nhô nhẹ 0.025m theo pháp tuyến trong
        const y = c.y - c.ny * 0.025;
        const z = PARABOL_GATE.center.z + su - c.nx * 0.025;
        const rotX = Math.atan2(c.nx, -c.ny);
        list.push({ y, z, rotX });
      }
    }
    return list;
  }, []);

  return (
    <group>
      {/* Dải băng chính + gờ dọc mép + gờ chia khoang với vân bê tông PBR. */}
      <mesh geometry={ribbonGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={GATE_WHITE}
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.012}
          roughness={0.86}
        />
      </mesh>
      {railGeos.map((g, i) => (
        <mesh key={`rail-${i}`} geometry={g} castShadow>
          <meshStandardMaterial
            color={GATE_WHITE}
            map={concretePbr.map}
            bumpMap={concretePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.85}
          />
        </mesh>
      ))}
      {collarGeos.map((g, i) => (
        <mesh key={`collar-${i}`} geometry={g} castShadow receiveShadow>
          <meshStandardMaterial
            color={GATE_WHITE}
            map={concretePbr.map}
            bumpMap={concretePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.85}
          />
        </mesh>
      ))}

      {/* Vết ố xám-xanh nhẹ ở mặt khuất nắng (mặt tây). */}
      {stains.map((s, i) => (
        <mesh
          key={`stain-${i}`}
          position={[PARABOL_GATE.center.x - T / 2 - 0.015, s.y, s.z]}
          rotation-y={-Math.PI / 2}
        >
          <circleGeometry args={[s.r, 20]} />
          <meshStandardMaterial
            color={GATE_STAIN}
            roughness={1}
            transparent
            opacity={0.38}
            polygonOffset
            polygonOffsetFactor={-1}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Huy hiệu tròn hai mặt dải băng: vành + nhân nổi. */}
      {medallions.map((m, i) => (
        <group key={`medal-${i}`} position={[m.x, m.y, m.z]}>
          <mesh rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 20]} />
            <meshStandardMaterial
              color={MEDAL}
              map={concretePbr.map}
              bumpMap={concretePbr.bumpMap}
              bumpScale={0.008}
              roughness={0.8}
            />
          </mesh>
          <mesh
            rotation-z={Math.PI / 2}
            position={[m.x < PARABOL_GATE.center.x ? -0.045 : 0.045, 0, 0]}
          >
            <cylinderGeometry args={[0.11, 0.11, 0.03, 16]} />
            <meshStandardMaterial color={MEDAL_CORE} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Đèn tròn âm trần ở mặt dưới (bụng) các khoang vòm Parabol (khớp cong-parabol-03.jpg) */}
      {soffitLights.map((sl, i) => (
        <mesh
          key={`soffit-light-${i}`}
          position={[PARABOL_GATE.center.x, sl.y, sl.z]}
          rotation={[sl.rotX, 0, 0]}
        >
          <cylinderGeometry args={[0.11, 0.11, 0.04, 16]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive={isNight ? '#FFE599' : '#FFFFFF'}
            emissiveIntensity={isNight ? 1.4 : 0.25}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* 2 đầu máy cổng xếp tự động (inox + bảng LED đỏ) đặt sát chân trong của vòm Parabol (cong-parabol-01.jpg) */}
      {[6.25, 13.75].map((gz, i) => (
        <group key={`parabol-gate-motor-${i}`} position={[-88, 0, gz]}>
          <mesh position={[0, 0.58, 0]} castShadow>
            <boxGeometry args={[0.52, 1.16, 0.42]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.35} metalness={0.65} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[0.54, 0.22, 0.34]} />
            <meshStandardMaterial
              color="#1E293B"
              emissive="#EF4444"
              emissiveIntensity={isNight ? 0.95 : 0.45}
            />
          </mesh>
        </group>
      ))}

      {/* Đèn pha hắt sáng chân vòm Parabol khi Hoàng hôn & Ban đêm */}
      {isNight && (
        <>
          {[6.2, 13.8].map((fz, i) => (
            <group key={`parabol-flood-${i}`} position={[-87.2, 0.15, fz]}>
              <mesh>
                <boxGeometry args={[0.35, 0.22, 0.35]} />
                <meshStandardMaterial color={IRON_BLACK} roughness={0.5} metalness={0.5} />
              </mesh>
              <mesh position={[0, 0.12, 0]}>
                <planeGeometry args={[0.24, 0.24]} />
                <meshStandardMaterial
                  color="#FFF2CC"
                  emissive="#FFCC66"
                  emissiveIntensity={1.6}
                />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* Nhà gác trắng phía bắc cổng: hộp 4 × 3 × 3, mái bằng đua sang lối phụ Bắc (cong-parabol-01.jpg, cong-parabol-02.jpg) */}
      <group position={[-88, 0, 1]}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 3, 3]} />
          <meshStandardMaterial
            color={GATE_WHITE}
            map={concretePbr.map}
            bumpMap={concretePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.88}
          />
        </mesh>
        <mesh position={[0, 3.15, 1.1]} castShadow>
          <boxGeometry args={[4.8, 0.24, 5.4]} />
          <meshStandardMaterial
            color={GATE_WHITE}
            map={concretePbr.map}
            bumpMap={concretePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.86}
          />
        </mesh>
        <mesh position={[2.02, 1.6, 0]}>
          <boxGeometry args={[0.06, 1.1, 1.4]} />
          <meshStandardMaterial
            color={isNight ? '#FFD27D' : C1_GLASS}
            emissive={isNight ? '#FFB84D' : '#000000'}
            emissiveIntensity={isNight ? 0.75 : 0}
            roughness={0.25}
            metalness={0.25}
          />
        </mesh>
        <mesh position={[0, 1, 1.53]}>
          <boxGeometry args={[0.9, 2, 0.06]} />
          <meshStandardMaterial color={IRON_BLACK} roughness={0.6} metalness={0.3} />
        </mesh>
      </group>

      {/* Mái che phẳng phía nam cổng trên 4 cột + cổng xếp sắt đen. */}
      <group position={[-88, 0, 19]}>
        <mesh position={[0, 3.2, 0]} castShadow>
          <boxGeometry args={[5, 0.25, 4]} />
          <meshStandardMaterial
            color={GATE_WHITE}
            map={concretePbr.map}
            bumpMap={concretePbr.bumpMap}
            bumpScale={0.01}
            roughness={0.88}
          />
        </mesh>
        {[-2.2, 2.2].map((dx) =>
          [-1.7, 1.7].map((dz) => (
            <mesh key={`${dx}-${dz}`} position={[dx, 1.6, dz]}>
              <cylinderGeometry args={[0.09, 0.09, 3.2, 8]} />
              <meshStandardMaterial color={IRON_BLACK} roughness={0.6} metalness={0.4} />
            </mesh>
          )),
        )}
        {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((dz) => (
          <mesh key={`fold-${dz}`} position={[0, 1.3, dz]}>
            <boxGeometry args={[0.12, 2.6, 0.12]} />
            <meshStandardMaterial color={IRON_BLACK} roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[0.12, 0.12, 3.4]} />
          <meshStandardMaterial color={IRON_BLACK} roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.12, 0.12, 3.4]} />
          <meshStandardMaterial color={IRON_BLACK} roughness={0.5} metalness={0.5} />
        </mesh>
        {[-1.2, -0.6, 0, 0.6, 1.2].map((dz, i) => (
          <mesh
            key={`xbrace-${dz}`}
            position={[0, 1.3, dz]}
            rotation-x={i % 2 === 0 ? 1.28 : -1.28}
          >
            <boxGeometry args={[0.07, 0.07, 2.1]} />
            <meshStandardMaterial color={IRON_BLACK} roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Cây lớn hai bên cổng sử dụng ImprovedTree có vân vỏ cây + tán lá PBR */}
      <ImprovedTree x={-93.5} z={4} trunkH={3.4} canopyR={3.2} canopyY={5} />
      <ImprovedTree x={-93.5} z={16} trunkH={3.4} canopyR={3.2} canopyY={5} />
      <ImprovedTree x={-82.5} z={2.5} trunkH={3} canopyR={2.6} canopyY={4.4} />
      <ImprovedTree x={-82.5} z={17.5} trunkH={3} canopyR={2.6} canopyY={4.4} />
    </group>
  );
}
