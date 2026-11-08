// ---------------------------------------------------------------------------
// features/campus/buildings/C2AndNorthGate.tsx — Nhà C2 (VP Đoàn TN & Đảng ủy /
// Hội trường C2) & Cổng chính Số 1 Đại Cồ Việt
// Module IDs: building.c2, building.dai-co-viet-gate
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import { C2_BUILDING, DAI_CO_VIET_GATE } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';
import { makeWeatheredConcreteTexture } from '../../../components/three/materials';

export function drawC2Sign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F5F2EB';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8A6B48';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#B02A24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 44px Arial, sans-serif';
  ctx.fillText('NHÀ C2 · VP ĐOÀN TN & ĐẢNG ỦY', w / 2, h * 0.52);
}

export function C2Building({ isNight = false }: { isNight?: boolean }) {
  const concretePbr = useMemo(() => makeWeatheredConcreteTexture(3, 2), []);
  useEffect(
    () => () => {
      concretePbr.map.dispose();
      concretePbr.bumpMap.dispose();
    },
    [concretePbr],
  );

  // Đặt ở C2_BUILDING.center (-86, 0, -22), trục dài theo hướng Bắc–Nam (size 7.5 × 15 m), mặt chính hướng Đông (+X) ra vườn hoa C1
  return (
    <group position={[C2_BUILDING.center.x, 0, C2_BUILDING.center.z]} rotation-y={Math.PI / 2}>
      {/* Khối nhà C2 15 × 7.5 m (sau khi xoay 90°: dọc Bắc–Nam 15 m, ngang Đông–Tây 7.5 m), cao 7.8 m */}
      <mesh position={[0, 3.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[15, 7.8, 7.5]} />
        <meshStandardMaterial
          color="#D9B38C"
          map={concretePbr.map}
          bumpMap={concretePbr.bumpMap}
          bumpScale={0.015}
          roughness={0.86}
        />
      </mesh>
      {/* Chân đế sẫm màu */}
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[15.12, 0.9, 7.62]} />
        <meshStandardMaterial color="#A67F58" roughness={0.9} />
      </mesh>
      {/* Mái vòm/phẳng đặc trưng của Nhà C2 */}
      <mesh position={[0, 7.8, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.28, 1, 1]} castShadow>
        <cylinderGeometry args={[3.9, 3.9, 15.4, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#B89470" roughness={0.85} />
      </mesh>
      {/* Hàng cột hiên mặt Đông (quay ra Quảng trường / Vườn hoa C1) */}
      {[-5.5, -2.75, 0, 2.75, 5.5].map((cx) => (
        <mesh key={`c2-col-${cx}`} position={[cx, 3.5, 3.95]} castShadow>
          <boxGeometry args={[0.42, 7.0, 0.42]} />
          <meshStandardMaterial color="#FAF6EE" roughness={0.82} />
        </mesh>
      ))}
      {/* Mái hiên sảnh mặt Đông */}
      <mesh position={[0, 4.1, 4.35]} castShadow>
        <boxGeometry args={[13.6, 0.32, 1.3]} />
        <meshStandardMaterial color="#EDE4D3" roughness={0.85} />
      </mesh>
      {/* Cửa kính lớn tầng 1 & tầng 2 (phản chiếu bầu trời IBL ban ngày, sáng ấm về đêm) */}
      {[-4.2, -1.4, 1.4, 4.2].map((wx, idx) => {
        const lit = isNight && idx !== 2;
        return (
          <group key={`c2-win-${wx}`}>
            <mesh position={[wx, 1.8, 3.78]}>
              <planeGeometry args={[1.95, 2.5]} />
              <meshStandardMaterial
                color={lit ? '#FFE0A3' : '#3A5368'}
                emissive={lit ? '#FFB84D' : '#000000'}
                emissiveIntensity={lit ? 0.65 : 0}
                roughness={0.22}
                metalness={0.35}
              />
            </mesh>
            <mesh position={[wx, 5.5, 3.78]}>
              <planeGeometry args={[1.95, 1.75]} />
              <meshStandardMaterial
                color={lit ? '#FFE0A3' : '#4A657A'}
                emissive={lit ? '#FFB84D' : '#000000'}
                emissiveIntensity={lit ? 0.55 : 0}
                roughness={0.22}
                metalness={0.35}
              />
            </mesh>
          </group>
        );
      })}
      <LabelPlane
        textureKey="c2-hall-sign"
        canvasW={512}
        canvasH={128}
        draw={drawC2Sign}
        size={[4.2, 0.95]}
        position={[0, 4.8, 3.83]}
        transparent={false}
      />
    </group>
  );
}

export function drawDaiCoVietGateSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#A81C24';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#F5C518';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 46px Arial, sans-serif';
  ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.36);
  ctx.fillStyle = '#FFD966';
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText('SỐ 1 ĐẠI CỒ VIỆT · HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY', w / 2, h * 0.74);
}

export function DaiCoVietGate() {
  return (
    <group position={[DAI_CO_VIET_GATE.center.x, 0, DAI_CO_VIET_GATE.center.z]}>
      {/* Hai trụ cổng chính ốp đá trang nghiêm */}
      {[-5.2, 5.2].map((gx) => (
        <group key={`dcv-pillar-${gx}`} position={[gx, 0, 0]}>
          <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.3, 5.6, 1.3]} />
            <meshStandardMaterial color="#EAE4D7" roughness={0.85} />
          </mesh>
          <mesh position={[0, 5.75, 0]} castShadow>
            <boxGeometry args={[1.55, 0.3, 1.55]} />
            <meshStandardMaterial color="#C8C0B0" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Dầm ngang cổng chính mang biển tên trường */}
      <mesh position={[0, 5.1, 0]} castShadow>
        <boxGeometry args={[11.8, 1.15, 0.9]} />
        <meshStandardMaterial color="#EAE4D7" roughness={0.85} />
      </mesh>
      <LabelPlane
        textureKey="dcv-gate-sign-south"
        canvasW={1024}
        canvasH={220}
        draw={drawDaiCoVietGateSign}
        size={[9.6, 1.02]}
        position={[0, 5.1, 0.48]}
        transparent={false}
      />
      <LabelPlane
        textureKey="dcv-gate-sign-north"
        canvasW={1024}
        canvasH={220}
        draw={drawDaiCoVietGateSign}
        size={[9.6, 1.02]}
        position={[0, 5.1, -0.48]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
      {/* Hàng rào sắt thoáng hai bên cổng Đại Cồ Việt */}
      {[-12, -8.5, 8.5, 12].map((fx) => (
        <group key={`dcv-fence-${fx}`} position={[fx, 0, 0]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[3.4, 0.7, 0.35]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <boxGeometry args={[3.3, 1.3, 0.08]} />
            <meshStandardMaterial color="#2B2F33" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
