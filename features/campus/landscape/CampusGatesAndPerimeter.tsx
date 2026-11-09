// ---------------------------------------------------------------------------
// features/campus/landscape/CampusGatesAndPerimeter.tsx — Cổng Tạ Quang Bửu,
// Trạm Xe buýt Parabol & Hệ thống Tường rào bao quanh khuôn viên ĐHBK Hà Nội
// Module IDs: building.ta-quang-buu-gate, landscape.parabol-bus-stop,
//             landscape.tdn-candle-pillars, landscape.perimeter-fence
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PARABOL_BUS_STOP, TA_QUANG_BUU_GATE } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';

const IRON_DARK = '#2B333C';
const WALL_BASE_BEIGE = '#DECBA4';
const PILLAR_STONE_BEIGE = '#EAD8B1';
const COPING_GREY = '#CBD5E1';

export function TaQuangBuuGate() {
  const { x, z } = TA_QUANG_BUU_GATE.center;
  return (
    <group position={[x, 0, z]}>
      {[-4.5, 4.5].map((gx) => (
        <mesh key={`tqb-gate-${gx}`} position={[gx, 2.4, 0]} castShadow>
          <boxGeometry args={[1.1, 4.8, 1.1]} />
          <meshStandardMaterial color="#EAE4D7" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[10.2, 0.95, 0.8]} />
        <meshStandardMaterial color="#EAE4D7" roughness={0.85} />
      </mesh>
      <LabelPlane
        textureKey="tqb-gate-sign"
        canvasW={1024}
        canvasH={192}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#A81C24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 7;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 40px Arial, sans-serif';
          ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI · CỔNG TẠ QUANG BỬU', w / 2, h / 2);
        }}
        size={[8.6, 0.82]}
        position={[0, 4.5, 0.43]}
        transparent={false}
      />
    </group>
  );
}

export function ParabolBusStop() {
  const { x, z } = PARABOL_BUS_STOP.center;
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 2}>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.08, 2.2]} />
        <meshStandardMaterial color="#9E9B94" roughness={0.9} />
      </mesh>
      {[-2.3, 2.3].map((px) => (
        <mesh key={`bus-post-${px}`} position={[px, 1.35, -0.8]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 2.7, 10]} />
          <meshStandardMaterial color="#1E3A5F" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 2.72, -0.1]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[5.6, 0.12, 2.1]} />
        <meshStandardMaterial color="#1E3A5F" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.45, -0.55]} castShadow>
        <boxGeometry args={[3.2, 0.08, 0.42]} />
        <meshStandardMaterial color="#C87D4B" roughness={0.8} />
      </mesh>
      <LabelPlane
        textureKey="parabol-bus-sign"
        canvasW={512}
        canvasH={256}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1D4ED8';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFD166';
          ctx.font = '900 32px Arial, sans-serif';
          ctx.fillText('🚌 ĐIỂM DỪNG XE BUÝT BÁCH KHOA', 20, 48);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 24px Arial, sans-serif';
          ctx.fillText('Tuyến: 03A · 21A · 21B · 25 · 26 · 28 · 32 · E08', 20, 102);
          ctx.fillText('Điểm dừng: Cổng Parabol (Đường Giải Phóng)', 20, 152);
          ctx.fillStyle = '#93C5FD';
          ctx.fillText('公交车站 · HUST PARABOL GATE BUS STOP', 20, 206);
        }}
        size={[2.6, 1.25]}
        position={[0, 1.45, -0.78]}
        transparent={false}
      />
    </group>
  );
}

export function TranDaiNghiaCandlePillars() {
  return null;
}

interface FenceRunSpec {
  axis: 'x' | 'z';
  fixed: number;
  from: number;
  to: number;
}

/**
 * Các tuyến tường rào bao quanh khuôn viên ĐHBK Hà Nội:
 *  - Dọc đường Trần Đại Nghĩa (`x = 92.1`): nối liền hai bên Cổng Trần Đại Nghĩa,
 *    chừa lối mở sang Cổng Hội Sinh Viên KTX (`z = -31.5..-25.0`) và Nhà B1 SoICT (`z = 9.5..18.5`).
 *  - Dọc đường Đại Cồ Việt (`z = -75.2`): nối liền biên Bắc, chừa Cổng Đại Cồ Việt và Cổng Tạ Quang Bửu.
 *  - Dọc đường Giải Phóng (`x = -95.2` & cánh nối Cổng Parabol `x = -88.0`).
 *  - Dọc đường Lê Thanh Nghị (`z = 106.5`) & biên Đông (`x = 166.0`).
 */
const FENCE_RUNS: FenceRunSpec[] = [
  // 1. Tuyến tường rào mặt đường Trần Đại Nghĩa (x = 92.1) nối sát hai bên Cổng Trần Đại Nghĩa
  { axis: 'z', fixed: 92.1, from: -75.2, to: -31.5 },
  { axis: 'z', fixed: 92.1, from: -25.0, to: -17.2 },
  { axis: 'z', fixed: 92.1, from: 0.5, to: 9.5 },
  { axis: 'z', fixed: 92.1, from: 18.5, to: 42.0 },

  // 2. Tuyến biên Bắc — Đường Đại Cồ Việt (z = -75.2)
  { axis: 'x', fixed: -75.2, from: -95.2, to: -70.5 },
  { axis: 'x', fixed: -75.2, from: -45.5, to: 92.1 },
  { axis: 'x', fixed: -75.2, from: 98.0, to: 120.2 },
  { axis: 'x', fixed: -75.2, from: 131.8, to: 166.0 },

  // 3. Tuyến biên Tây — Đường Giải Phóng (x = -95.2) & tường nối Cổng Parabol (x = -88.0, mở thông trục z = -6)
  { axis: 'z', fixed: -95.2, from: -75.2, to: -17.0 },
  { axis: 'x', fixed: -17.0, from: -95.2, to: -88.0 },
  { axis: 'z', fixed: -88.0, from: -17.0, to: -12.8 },
  { axis: 'z', fixed: -88.0, from: 0.8, to: 4.5 },
  { axis: 'x', fixed: 11.0, from: -95.2, to: -88.0 },
  { axis: 'z', fixed: -95.2, from: 11.0, to: 106.5 },

  // 4. Tuyến biên Nam — Đường Lê Thanh Nghị (z = 106.5)
  { axis: 'x', fixed: 106.5, from: -95.2, to: 166.0 },

  // 5. Tuyến biên Đông — Khu KTX, Nhà T & SVĐ Bách Khoa (x = 166.0)
  { axis: 'z', fixed: 166.0, from: -75.2, to: 106.5 },
];

export function CampusPerimeterFence() {
  const baseRef = useRef<THREE.InstancedMesh>(null!);
  const copingRef = useRef<THREE.InstancedMesh>(null!);
  const pillarRef = useRef<THREE.InstancedMesh>(null!);
  const capRef = useRef<THREE.InstancedMesh>(null!);
  const railRef = useRef<THREE.InstancedMesh>(null!);
  const picketRef = useRef<THREE.InstancedMesh>(null!);

  const layout = useMemo(() => {
    const bases: THREE.Matrix4[] = [];
    const copings: THREE.Matrix4[] = [];
    const pillars: THREE.Matrix4[] = [];
    const caps: THREE.Matrix4[] = [];
    const rails: THREE.Matrix4[] = [];
    const pickets: THREE.Matrix4[] = [];

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);

    for (const run of FENCE_RUNS) {
      const totalLen = Math.abs(run.to - run.from);
      if (totalLen < 1.2) continue;
      const bays = Math.max(1, Math.round(totalLen / 5.8));
      const bayLen = totalLen / bays;
      const rotY = run.axis === 'x' ? 0 : Math.PI / 2;
      quat.setFromAxisAngle(yAxis, rotY);

      // Các trụ tường xây tại từng đầu nhịp (i = 0 .. bays)
      for (let i = 0; i <= bays; i++) {
        const coord = run.from + i * bayLen;
        const px = run.axis === 'x' ? coord : run.fixed;
        const pz = run.axis === 'x' ? run.fixed : coord;

        // Thân trụ xây gạch/đá vàng kem (0.50m × 2.36m × 0.50m)
        pos.set(px, 1.18, pz);
        scale.set(0.5, 2.36, 0.5);
        m.compose(pos, quat, scale);
        pillars.push(m.clone());

        // Mũ trụ bê tông xám phẳng (0.62m × 0.12m × 0.62m)
        pos.set(px, 2.42, pz);
        scale.set(0.62, 0.12, 0.62);
        m.compose(pos, quat, scale);
        caps.push(m.clone());
      }

      // Chân tường xây, gờ bê tông, thanh giằng ngang & song sắt đứng trong từng nhịp
      for (let i = 0; i < bays; i++) {
        const mid = run.from + (i + 0.5) * bayLen;
        const bx = run.axis === 'x' ? mid : run.fixed;
        const bz = run.axis === 'x' ? run.fixed : mid;
        const innerSpan = Math.max(0.4, bayLen - 0.44);

        // Chân tường xây thấp (cao 0.68m, dày 0.30m)
        pos.set(bx, 0.34, bz);
        scale.set(innerSpan, 0.68, 0.3);
        m.compose(pos, quat, scale);
        bases.push(m.clone());

        // Gờ bê tông xám đỉnh chân tường (cao 0.08m, dày 0.36m)
        pos.set(bx, 0.72, bz);
        scale.set(innerSpan, 0.08, 0.36);
        m.compose(pos, quat, scale);
        copings.push(m.clone());

        // 2 thanh giằng ngang bằng sắt (y = 0.92m và y = 2.08m)
        for (const ry of [0.92, 2.08]) {
          pos.set(bx, ry, bz);
          scale.set(innerSpan, 0.048, 0.048);
          m.compose(pos, quat, scale);
          rails.push(m.clone());
        }

        // Các thanh giáo sắt đứng cách đều ~0.42m dọc nhịp rào
        const picketCount = Math.max(2, Math.floor((innerSpan - 0.35) / 0.42));
        const step = (innerSpan - 0.35) / picketCount;
        for (let p = 0; p <= picketCount; p++) {
          const offset = -((innerSpan - 0.35) / 2) + p * step;
          const kx = run.axis === 'x' ? bx + offset : bx;
          const kz = run.axis === 'x' ? bz : bz + offset;
          pos.set(kx, 1.5, kz);
          scale.set(0.036, 1.48, 0.036);
          m.compose(pos, quat, scale);
          pickets.push(m.clone());
        }
      }
    }

    return { bases, copings, pillars, caps, rails, pickets };
  }, []);

  const unitBoxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const materials = useMemo(
    () => ({
      base: new THREE.MeshStandardMaterial({ color: WALL_BASE_BEIGE, roughness: 0.88 }),
      coping: new THREE.MeshStandardMaterial({ color: COPING_GREY, roughness: 0.82 }),
      pillar: new THREE.MeshStandardMaterial({ color: PILLAR_STONE_BEIGE, roughness: 0.86 }),
      rail: new THREE.MeshStandardMaterial({
        color: IRON_DARK,
        roughness: 0.48,
        metalness: 0.55,
      }),
    }),
    [],
  );

  useLayoutEffect(() => {
    const applyMatrices = (
      mesh: THREE.InstancedMesh | null,
      matrices: THREE.Matrix4[],
    ) => {
      if (!mesh) return;
      for (let i = 0; i < matrices.length; i++) {
        mesh.setMatrixAt(i, matrices[i]);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    applyMatrices(baseRef.current, layout.bases);
    applyMatrices(copingRef.current, layout.copings);
    applyMatrices(pillarRef.current, layout.pillars);
    applyMatrices(capRef.current, layout.caps);
    applyMatrices(railRef.current, layout.rails);
    applyMatrices(picketRef.current, layout.pickets);
  }, [layout]);

  useEffect(() => {
    return () => {
      unitBoxGeo.dispose();
      Object.values(materials).forEach((mat) => mat.dispose());
    };
  }, [unitBoxGeo, materials]);

  return (
    <group>
      <instancedMesh
        ref={baseRef}
        args={[unitBoxGeo, materials.base, layout.bases.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={copingRef}
        args={[unitBoxGeo, materials.coping, layout.copings.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={pillarRef}
        args={[unitBoxGeo, materials.pillar, layout.pillars.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={capRef}
        args={[unitBoxGeo, materials.coping, layout.caps.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={railRef}
        args={[unitBoxGeo, materials.rail, layout.rails.length]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={picketRef}
        args={[unitBoxGeo, materials.rail, layout.pickets.length]}
        castShadow
        frustumCulled={false}
      />
    </group>
  );
}
