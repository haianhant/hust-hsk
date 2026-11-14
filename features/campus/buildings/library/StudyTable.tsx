'use client';

// ---------------------------------------------------------------------------
// features/campus/buildings/library/StudyTable.tsx — Bàn đọc thư viện Tạ Quang Bửu
// Thiết kế chuẩn bàn đọc đại học Việt Nam hiện đại: mặt bàn gỗ sồi ấm,
// khung chân thép sơn tĩnh điện xám đen, vách ngăn thấp kèm đèn đọc sách LED.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import type * as THREE from 'three';
import { CANVAS_VN_FONT, LabelPlane } from '../../../../components/three/TextPlate';
import { makeSoftShadowTexture } from '../../../../components/three/materials';

let sharedTableShadowTex: THREE.CanvasTexture | null = null;
function getStudyTableShadowTex(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (!sharedTableShadowTex) sharedTableShadowTex = makeSoftShadowTexture();
  return sharedTableShadowTex;
}

export interface StudyTableModelProps {
  tableId: string;
  label: string;
  index: number;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  woodTex?: THREE.CanvasTexture;
  hasSeatedStudent?: boolean;
}

function drawTablePlaque1(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#232B38';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#D4A843';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = '#F6D365';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 32px ${CANVAS_VN_FONT}`;
  ctx.fillText('BÀN ĐỌC 01'.normalize('NFC'), w / 2, h / 2 + 2);
}

function drawTablePlaque2(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#232B38';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#D4A843';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = '#F6D365';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 32px ${CANVAS_VN_FONT}`;
  ctx.fillText('BÀN ĐỌC 02'.normalize('NFC'), w / 2, h / 2 + 2);
}

export function StudyTable({
  tableId,
  index,
  x,
  z,
  w,
  d,
  h,
  woodTex,
  hasSeatedStudent = false,
}: StudyTableModelProps) {
  const legOffsetX = w / 2 - 0.065;
  const legOffsetZ = d / 2 - 0.065;
  const legHeight = h - 0.04;
  const bookCornerX = index === 0 ? -w / 2 + 0.19 : w / 2 - 0.19;
  const drawPlaque = index === 0 ? drawTablePlaque1 : drawTablePlaque2;
  const plaqueKey = `library-study-table-plaque-${tableId}`;
  const shadowTex = useMemo(() => getStudyTableShadowTex(), []);

  return (
    <group position={[x, 0, z]} userData={{ studyTableId: tableId }}>
      {/* Bóng tiếp xúc AO mềm dưới gầm bàn đọc & ghế xung quanh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} raycast={() => null}>
        <planeGeometry args={[w + 0.72, d + 0.88]} />
        <meshBasicMaterial
          map={shadowTex ?? undefined}
          color="#0A0E17"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      {/* Mặt bàn gỗ sồi phủ laminate chống lóa (cao 0.75m) & nẹp óc chó chu vi */}
      <mesh position={[0, h - 0.022, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.044, d]} />
        <meshStandardMaterial
          color="#C99762"
          map={woodTex}
          roughness={0.42}
          metalness={0.04}
        />
      </mesh>
      {([-1, 1] as const).map((sz) => (
        <mesh key={`trim-z-${sz}`} position={[0, h - 0.022, sz * (d / 2 - 0.008)]}>
          <boxGeometry args={[w, 0.045, 0.016]} />
          <meshStandardMaterial color="#7C4F28" roughness={0.5} />
        </mesh>
      ))}
      {([-1, 1] as const).map((sx) => (
        <mesh key={`trim-x-${sx}`} position={[sx * (w / 2 - 0.008), h - 0.022, 0]}>
          <boxGeometry args={[0.016, 0.045, d]} />
          <meshStandardMaterial color="#7C4F28" roughness={0.5} />
        </mesh>
      ))}
      {/* Hộp ổ cắm điện & cổng USB âm mặt bàn */}
      {([-w * 0.26, w * 0.26] as const).map((gx, gi) => (
        <group key={`grommet-${gi}`} position={[gx, h + 0.003, gi === 0 ? 0.09 : -0.09]}>
          <mesh>
            <boxGeometry args={[0.085, 0.006, 0.052]} />
            <meshStandardMaterial color="#475569" roughness={0.32} metalness={0.72} />
          </mesh>
          <mesh position={[0, 0.0035, 0]}>
            <boxGeometry args={[0.056, 0.002, 0.024]} />
            <meshStandardMaterial color="#0F172A" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Diềm gỗ sẫm & máng đi dây cáp dưới mặt bàn */}
      <mesh position={[0, h - 0.058, 0]}>
        <boxGeometry args={[w - 0.06, 0.032, d - 0.06]} />
        <meshStandardMaterial color="#8B5E34" map={woodTex} roughness={0.55} />
      </mesh>
      <mesh position={[0, h - 0.11, 0]}>
        <boxGeometry args={[w - 0.28, 0.028, 0.08]} />
        <meshStandardMaterial color="#1E2633" roughness={0.5} metalness={0.55} />
      </mesh>

      {/* Khung chân thép hộp sơn tĩnh điện xám than (chạm sàn y = 0) */}
      {([-legOffsetX, legOffsetX] as const).map((lx) =>
        ([-legOffsetZ, legOffsetZ] as const).map((lz) => (
          <group key={`${lx}-${lz}`} position={[lx, 0, lz]}>
            <mesh position={[0, legHeight / 2, 0]} castShadow>
              <boxGeometry args={[0.045, legHeight, 0.045]} />
              <meshStandardMaterial color="#262E3B" roughness={0.45} metalness={0.58} />
            </mesh>
            {/* Vòng thép chỉnh cân bằng & đế cao su chống trượt */}
            <mesh position={[0, 0.022, 0]}>
              <cylinderGeometry args={[0.026, 0.026, 0.016, 12]} />
              <meshStandardMaterial color="#64748B" roughness={0.32} metalness={0.78} />
            </mesh>
            <mesh position={[0, 0.008, 0]}>
              <boxGeometry args={[0.056, 0.016, 0.056]} />
              <meshStandardMaterial color="#151921" roughness={0.8} />
            </mesh>
          </group>
        )),
      )}

      {/* Thanh giằng ngang hai đầu hồi bàn & thanh giằng dọc dưới mặt bàn */}
      {([-legOffsetX, legOffsetX] as const).map((lx) => (
        <mesh key={`stretcher-${lx}`} position={[lx, 0.16, 0]}>
          <boxGeometry args={[0.032, 0.032, d - 0.14]} />
          <meshStandardMaterial color="#262E3B" roughness={0.48} metalness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, h - 0.082, 0]}>
        <boxGeometry args={[w - 0.12, 0.03, 0.04]} />
        <meshStandardMaterial color="#262E3B" roughness={0.48} metalness={0.55} />
      </mesh>

      {/* Vách ngăn thấp giữa bàn + máng đèn đọc sách thư viện */}
      <mesh position={[0, h + 0.055, 0]}>
        <boxGeometry args={[w - 0.22, 0.11, 0.024]} />
        <meshStandardMaterial color="#E6DFD1" roughness={0.55} />
      </mesh>
      {([-w * 0.34, w * 0.34] as const).map((px) => (
        <mesh key={`lamp-post-${px}`} position={[px, h + 0.12, 0]}>
          <boxGeometry args={[0.024, 0.24, 0.024]} />
          <meshStandardMaterial color="#2B3340" roughness={0.4} metalness={0.62} />
        </mesh>
      ))}
      {/* Chụp đèn đọc sách ngang & nan tán quang chống chói */}
      <mesh position={[0, h + 0.235, 0]}>
        <boxGeometry args={[w - 0.34, 0.028, 0.076]} />
        <meshStandardMaterial color="#2B3340" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, h + 0.219, 0]}>
        <boxGeometry args={[w - 0.4, 0.008, 0.048]} />
        <meshStandardMaterial
          color="#FFF3C8"
          emissive="#FFE299"
          emissiveIntensity={hasSeatedStudent ? 1.15 : 0.72}
          roughness={0.25}
        />
      </mesh>
      {([-0.36, -0.18, 0, 0.18, 0.36] as const).map((frac) => (
        <mesh key={`louver-${frac}`} position={[(w - 0.42) * frac, h + 0.212, 0]}>
          <boxGeometry args={[0.012, 0.012, 0.054]} />
          <meshStandardMaterial color="#2B3340" roughness={0.45} metalness={0.55} />
        </mesh>
      ))}

      {/* Biển số bàn đọc hai mặt Bắc & Nam */}
      <LabelPlane
        textureKey={plaqueKey}
        canvasW={256}
        canvasH={64}
        draw={drawPlaque}
        size={[0.24, 0.06]}
        position={[0, h + 0.06, 0.015]}
        rotation={[0, 0, 0]}
        transparent={false}
      />
      <LabelPlane
        textureKey={plaqueKey}
        canvasW={256}
        canvasH={64}
        draw={drawPlaque}
        size={[0.24, 0.06]}
        position={[0, h + 0.06, -0.015]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />

      {/* Cụm sách giáo trình HSK / Giải tích đặt gọn ở góc bàn */}
      <group position={[bookCornerX, h, 0.12]}>
        <mesh position={[0, 0.012, 0]} rotation={[0, 0.08, 0]}>
          <boxGeometry args={[0.19, 0.024, 0.25]} />
          <meshStandardMaterial color="#9E1B22" roughness={0.65} />
        </mesh>
        <mesh position={[0.006, 0.032, -0.008]} rotation={[0, -0.06, 0]}>
          <boxGeometry args={[0.175, 0.018, 0.235]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.65} />
        </mesh>
      </group>
    </group>
  );
}
