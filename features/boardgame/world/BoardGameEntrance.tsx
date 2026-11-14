'use client';

// ---------------------------------------------------------------------------
// features/boardgame/world/BoardGameEntrance.tsx — Ngoại thất nhà CLB Board Game
// HUSTVerse đặt tại sân KTX (cạnh Căng tin B5-9, giữa B6 và B7), không phá
// bỏ bất kỳ công trình KTX hiện có nào.
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CANVAS_VN_FONT, wrapVietnameseCanvasContext } from '../../../components/three/TextPlate';
import { BOARD_GAME_CLUB } from '../../campus/world-data';

function makeClubSignTexture(title: string, subtitle: string, isNight: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const raw = canvas.getContext('2d');
  if (raw) {
    const ctx = wrapVietnameseCanvasContext(raw);
    ctx.fillStyle = isNight ? '#1E1B2E' : '#2C221E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Biểu tượng viên xúc xắc nhỏ bên trái
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.roundRect(44, 54, 148, 148, 22);
    ctx.fill();
    ctx.fillStyle = '#B91C1C';
    const pips = [
      [82, 92],
      [154, 92],
      [118, 128],
      [82, 164],
      [154, 164],
    ];
    for (const [px, py] of pips) {
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FEF3C7';
    ctx.font = `700 54px ${CANVAS_VN_FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 224, 98);

    ctx.fillStyle = '#FBBF24';
    ctx.font = `700 32px ${CANVAS_VN_FONT}`;
    ctx.fillText(subtitle, 224, 168);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeEntrancePlaqueTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const raw = canvas.getContext('2d');
  if (raw) {
    const ctx = wrapVietnameseCanvasContext(raw);
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.fillStyle = '#FDE68A';
    ctx.textAlign = 'center';
    ctx.font = `700 34px ${CANVAS_VN_FONT}`;
    ctx.fillText('BÓNG ĐÊM KTX · 4–8 NGƯỜI', 256, 76);
    ctx.fillStyle = '#E4E4E7';
    ctx.font = `600 24px ${CANVAS_VN_FONT}`;
    ctx.fillText('Phòng Sinh Hoạt Chung Tầng 1', 256, 134);
    ctx.fillStyle = '#34D399';
    ctx.font = `700 26px ${CANVAS_VN_FONT}`;
    ctx.fillText('Nhấn [E] trước cửa để vào CLB', 256, 194);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export default function BoardGameEntrance({ isNight = false }: { isNight?: boolean }) {
  const { center, size, h } = BOARD_GAME_CLUB;

  const signTex = useMemo(
    () => makeClubSignTexture('CLB BOARD GAME KTX', 'BÓNG ĐÊM KTX · SECRETS AFTER DARK', isNight),
    [isNight],
  );
  const plaqueTex = useMemo(() => makeEntrancePlaqueTexture(), []);

  useEffect(() => {
    return () => {
      signTex.dispose();
    };
  }, [signTex]);

  useEffect(() => {
    return () => {
      plaqueTex.dispose();
    };
  }, [plaqueTex]);

  const warmEmissive = isNight ? 1.45 : 0.42;
  const halfX = size.x / 2; // 3.2
  const halfZ = size.z / 2; // 1.9

  return (
    <group name="boardgame-club-exterior" position={[center.x, 0, center.z]}>
      {/* Nền bệ đá granite nâng lên 0.14m (chống z-fighting hoàn toàn) */}
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x + 0.36, 0.14, size.z + 0.36]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.88} />
      </mesh>

      {/* Thềm bậc bước trước cửa Đông (+X) */}
      <mesh position={[halfX + 0.35, 0.04, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.92, 0.08, 2.25]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
      </mesh>
      <mesh position={[halfX + 0.05, 0.015, 0]} receiveShadow>
        <boxGeometry args={[1.4, 0.03, 2.5]} />
        <meshStandardMaterial color="#475569" roughness={0.92} />
      </mesh>

      {/* Khối tường chính tầng trệt (kem ấm + chân tường gạch nâu đỏ KTX) */}
      <mesh position={[0, 0.14 + (h - 0.14) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h - 0.14, size.z]} />
        <meshStandardMaterial color="#F3ECE1" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x + 0.04, 0.84, size.z + 0.04]} />
        <meshStandardMaterial color="#8B4332" roughness={0.9} />
      </mesh>

      {/* Mái hiên dốc & viền mái gỗ ấm */}
      <mesh position={[0, h + 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x + 0.55, 0.28, size.z + 0.55]} />
        <meshStandardMaterial color="#334155" roughness={0.78} />
      </mesh>
      <mesh position={[0, h + 0.36, 0]} castShadow>
        <boxGeometry args={[size.x - 0.2, 0.22, size.z - 0.2]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* Mặt tiền hướng Đông (+X): Cửa gỗ kính đôi + Mái đón + Biển CLB */}
      <group position={[halfX, 0, 0]}>
        {/* Khung cửa gỗ */}
        <mesh position={[0.02, 1.28, 0]} castShadow>
          <boxGeometry args={[0.12, 2.24, 1.88]} />
          <meshStandardMaterial color="#4A2E1E" roughness={0.72} />
        </mesh>
        {/* 2 cánh cửa kính phát sáng ấm bên trong */}
        {[-0.42, 0.42].map((dz, idx) => (
          <mesh key={idx} position={[0.05, 1.24, dz]}>
            <boxGeometry args={[0.06, 2.04, 0.78]} />
            <meshStandardMaterial
              color="#78350F"
              emissive="#F59E0B"
              emissiveIntensity={warmEmissive * 0.55}
              roughness={0.35}
            />
          </mesh>
        ))}

        {/* Mái hiên che mưa phía trước cửa */}
        <mesh position={[0.56, 2.52, 0]} rotation={[0, 0, -0.14]} castShadow>
          <boxGeometry args={[1.18, 0.1, 2.68]} />
          <meshStandardMaterial color="#5C3A21" roughness={0.75} />
        </mesh>

        {/* Biển hiệu chính nổi bật hướng Đông */}
        <mesh position={[0.14, 2.98, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[3.25, 0.78]} />
          <meshStandardMaterial
            map={signTex}
            emissive="#FBBF24"
            emissiveMap={signTex}
            emissiveIntensity={isNight ? 0.85 : 0.2}
            roughness={0.45}
          />
        </mesh>

        {/* 2 Đèn lồng vàng ấm treo 2 bên cửa */}
        {[-1.12, 1.12].map((dz, idx) => (
          <group key={idx} position={[0.24, 2.22, dz]}>
            <mesh>
              <cylinderGeometry args={[0.11, 0.11, 0.24, 10]} />
              <meshStandardMaterial
                color="#FEF3C7"
                emissive="#F59E0B"
                emissiveIntensity={warmEmissive}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.04, 10]} />
              <meshStandardMaterial color="#27272A" metalness={0.4} roughness={0.6} />
            </mesh>
          </group>
        ))}

        {/* Ánh sáng hắt sảnh vào ban đêm */}
        {isNight && (
          <pointLight
            position={[1.15, 2.35, 0]}
            color="#FFB74D"
            intensity={3.6}
            distance={10.5}
            decay={1.8}
          />
        )}

        {/* Bảng đứng giới thiệu trò chơi cạnh cửa */}
        <group position={[0.72, 0, -1.48]} rotation={[0, -0.35, 0]}>
          <mesh position={[0, 0.68, 0]} castShadow>
            <boxGeometry args={[0.08, 1.36, 0.96]} />
            <meshStandardMaterial color="#292524" roughness={0.75} />
          </mesh>
          <mesh position={[0.048, 0.92, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.86, 0.44]} />
            <meshStandardMaterial
              map={plaqueTex}
              emissive="#FDE68A"
              emissiveMap={plaqueTex}
              emissiveIntensity={isNight ? 0.5 : 0.12}
              roughness={0.5}
            />
          </mesh>
        </group>

        {/* Hai ghế đẩu gỗ ngoài cửa kiểu quán nước KTX */}
        {[1.38, 1.88].map((dz, idx) => (
          <group key={idx} position={[0.62, 0, dz]}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <cylinderGeometry args={[0.19, 0.19, 0.06, 12]} />
              <meshStandardMaterial color="#92400E" roughness={0.78} />
            </mesh>
            <mesh position={[0, 0.21, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.14, 0.4, 8]} />
              <meshStandardMaterial color="#3F2E21" roughness={0.85} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Cửa sổ hông Bắc & Nam tỏa ánh sáng ấm từ phòng sinh hoạt chung */}
      {[-halfZ - 0.03, halfZ + 0.03].map((wz, wIdx) => (
        <group key={wIdx} position={[0, 1.72, wz]}>
          {[-1.55, 0.25, 1.85].map((wx, idx) => (
            <group key={idx} position={[wx, 0, 0]}>
              <mesh>
                <boxGeometry args={[1.15, 0.92, 0.08]} />
                <meshStandardMaterial color="#451A03" roughness={0.72} />
              </mesh>
              <mesh position={[0, 0, wIdx === 0 ? -0.025 : 0.025]}>
                <boxGeometry args={[0.98, 0.76, 0.05]} />
                <meshStandardMaterial
                  color="#FDE68A"
                  emissive="#F59E0B"
                  emissiveIntensity={warmEmissive * 0.75}
                  roughness={0.28}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
