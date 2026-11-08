// ---------------------------------------------------------------------------
// features/campus/landscape/CampusGatesAndPerimeter.tsx — Cổng Tạ Quang Bửu,
// Trạm Xe buýt Parabol, Cột đèn nến TĐN & Hàng rào bao quanh khuôn viên
// Module IDs: building.ta-quang-buu-gate, landscape.parabol-bus-stop,
//             landscape.tdn-candle-pillars, landscape.perimeter-fence
// ---------------------------------------------------------------------------

import { PARABOL_BUS_STOP, TA_QUANG_BUU_GATE } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';

const IRON_DARK = '#25292E';

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
  const pillars: Array<[number, number]> = [
    [75, -16.5],
    [81, -16.5],
    [87, -16.5],
    [75, 4.5],
    [81, 4.5],
    [87, 4.5],
  ];
  return (
    <group>
      {pillars.map(([px, pz], idx) => (
        <group key={`tdn-candle-${idx}`} position={[px, 0, pz]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.42, 0.5, 0.42]} />
            <meshStandardMaterial color="#2C3036" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.14, 1.9, 12]} />
            <meshStandardMaterial color="#EAE6DF" roughness={0.5} />
          </mesh>
          <mesh position={[0, 2.55, 0]}>
            <coneGeometry args={[0.14, 0.42, 12]} />
            <meshStandardMaterial color="#FFF3C4" emissive="#FFB84D" emissiveIntensity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function CampusPerimeterFence() {
  const northX = [-88, -80, -72, -42, -30, -18, -6, 6, 18, 30, 42, 54, 66, 78, 98, 112, 142, 156];
  const southX = [-84, -70, -56, -42, -28, -14, 0, 14, 28, 42, 56, 70, 84, 98, 114, 130, 146, 160];
  const westZ = [-66, -54, -42, -30, -18, 30, 42, 54, 66, 78];

  return (
    <group>
      {northX.map((fx) => (
        <group key={`fence-n-${fx}`} position={[fx, 0, -75.2]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[6.5, 0.6, 0.28]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[6.4, 1.1, 0.06]} />
            <meshStandardMaterial color={IRON_DARK} roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
      {southX.map((fx) => (
        <group key={`fence-s-${fx}`} position={[fx, 0, 106.5]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[6.5, 0.6, 0.28]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[6.4, 1.1, 0.06]} />
            <meshStandardMaterial color={IRON_DARK} roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
      {westZ.map((fz) => (
        <group key={`fence-w-${fz}`} position={[-95.2, 0, fz]} rotation-y={Math.PI / 2}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[6.5, 0.6, 0.28]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[6.4, 1.1, 0.06]} />
            <meshStandardMaterial color={IRON_DARK} roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
