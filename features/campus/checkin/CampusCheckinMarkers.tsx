// ---------------------------------------------------------------------------
// features/campus/checkin/CampusCheckinMarkers.tsx — Hệ thống trụ Check-in &
// Giới thiệu Kiến trúc – EdTech 3D đặt tại 9 công trình biểu tượng ĐHBK Hà Nội.
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { CAMPUS_LANDMARKS, type CampusLandmarkSpec } from './campus-passport';
import { LabelPlane } from '../../../components/three/TextPlate';

function CheckinMarkerPedestal({
  landmark,
  isNight,
  hskMode = false,
}: {
  landmark: CampusLandmarkSpec;
  isNight: boolean;
  hskMode?: boolean;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const floatRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 2.6) * 0.08;
      ringRef.current.scale.set(s, s, 1);
    }
    if (floatRef.current) {
      floatRef.current.position.y = 2.02 + Math.sin(t * 2.2 + landmark.pos.x * 0.1) * 0.06;
    }
  });

  return (
    <group position={[landmark.markerPos.x, 0, landmark.markerPos.z]}>
      {/* Vòng sáng định vị dưới mặt sân (y = 0.036 tránh z-fighting với mặt sân) */}
      <mesh
        ref={ringRef}
        rotation-x={-Math.PI / 2}
        position={[0, 0.036, 0]}
      >
        <ringGeometry args={[0.42, 0.56, 28]} />
        <meshBasicMaterial
          color="#FACC15"
          transparent
          opacity={isNight ? 0.78 : 0.52}
          depthWrite={false}
        />
      </mesh>

      {/* Đế đá granite tối + trụ kim loại đỏ Bách Khoa */}
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.14, 18]} />
        <meshStandardMaterial color="#1E293B" roughness={0.65} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.068, 1.12, 14]} />
        <meshStandardMaterial color="#991B1B" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Bảng thông tin nghiêng kiểu bảo tàng / khuôn viên đại học */}
      <group position={[0, 1.28, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.76, 0.5, 0.06]} />
          <meshStandardMaterial
            color="#0F172A"
            emissive={isNight ? '#1E3A8A' : '#000000'}
            emissiveIntensity={isNight ? 0.55 : 0}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
        <Billboard position={[0, 0.74, 0]} follow>
          <group ref={floatRef} position={[0, 0, 0]}>
            <LabelPlane
              textureKey={`campus-checkin-badge-${landmark.id}-${hskMode ? 'hsk' : 'core'}`}
              canvasW={512}
              canvasH={192}
              draw={(ctx, w, h) => {
                ctx.clearRect(0, 0, w, h);
                // Viền viên thuốc đỏ sẫm - vàng kim chuẩn Bách Khoa
                const r = 36;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.beginPath();
                ctx.roundRect(8, 8, w - 16, h - 16, r);
                ctx.fill();
                ctx.lineWidth = 6;
                ctx.strokeStyle = '#FACC15';
                ctx.stroke();

                ctx.fillStyle = '#FDE047';
                ctx.font = '800 30px "Be Vietnam Pro", "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`📍 CHECK-IN · ${landmark.code}`, w / 2, h * 0.36);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = '600 24px "Be Vietnam Pro", "Segoe UI", sans-serif';
                ctx.fillText(
                  hskMode ? 'Bấm [E] Khám phá & Học từ vựng' : 'Bấm [E] Khám phá & Check-in',
                  w / 2,
                  h * 0.71,
                );
              }}
              size={[1.45, 0.54]}
              position={[0, 0, 0]}
              transparent
            />
          </group>
        </Billboard>
      </group>
    </group>
  );
}

export default function CampusCheckinMarkers({
  isNight = false,
  hskMode = false,
}: {
  isNight?: boolean;
  hskMode?: boolean;
}) {
  return (
    <group name="campus-edtech-checkin-markers">
      {CAMPUS_LANDMARKS.map((lm) => (
        <CheckinMarkerPedestal key={lm.id} landmark={lm} isNight={isNight} hskMode={hskMode} />
      ))}
    </group>
  );
}
