'use client';

// ---------------------------------------------------------------------------
// features/campus/buildings/library/StudyTable.tsx — Bàn đọc thư viện Tạ Quang Bửu
// Thiết kế chuẩn bàn đọc đại học Việt Nam hiện đại: mặt bàn gỗ sồi ấm,
// khung chân thép sơn tĩnh điện xám đen, vách ngăn thấp kèm đèn đọc sách LED.
// ---------------------------------------------------------------------------

import type * as THREE from 'three';
import { LabelPlane } from '../../../../components/three/TextPlate';

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
  ctx.font = '800 34px Arial, sans-serif';
  ctx.fillText('BÀN ĐỌC 01', w / 2, h / 2 + 2);
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
  ctx.font = '800 34px Arial, sans-serif';
  ctx.fillText('BÀN ĐỌC 02', w / 2, h / 2 + 2);
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

  return (
    <group position={[x, 0, z]} userData={{ studyTableId: tableId }}>
      {/* Mặt bàn gỗ sồi phủ laminate chống lóa (cao 0.75m) */}
      <mesh position={[0, h - 0.022, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.044, d]} />
        <meshStandardMaterial
          color="#C99762"
          map={woodTex}
          roughness={0.42}
          metalness={0.04}
        />
      </mesh>

      {/* Diềm gỗ sẫm bo dưới mặt bàn */}
      <mesh position={[0, h - 0.058, 0]}>
        <boxGeometry args={[w - 0.06, 0.032, d - 0.06]} />
        <meshStandardMaterial color="#8B5E34" map={woodTex} roughness={0.55} />
      </mesh>

      {/* Khung chân thép hộp sơn tĩnh điện xám than (chạm sàn y = 0) */}
      {([-legOffsetX, legOffsetX] as const).map((lx) =>
        ([-legOffsetZ, legOffsetZ] as const).map((lz) => (
          <group key={`${lx}-${lz}`} position={[lx, 0, lz]}>
            <mesh position={[0, legHeight / 2, 0]} castShadow>
              <boxGeometry args={[0.045, legHeight, 0.045]} />
              <meshStandardMaterial color="#262E3B" roughness={0.45} metalness={0.58} />
            </mesh>
            {/* Đế cao su chống trượt */}
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
      {/* Chụp đèn đọc sách ngang */}
      <mesh position={[0, h + 0.235, 0]}>
        <boxGeometry args={[w - 0.34, 0.028, 0.076]} />
        <meshStandardMaterial color="#2B3340" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Dải đèn LED vàng ấm hắt xuống mặt bàn */}
      <mesh position={[0, h + 0.219, 0]}>
        <boxGeometry args={[w - 0.4, 0.008, 0.048]} />
        <meshStandardMaterial
          color="#FFF3C8"
          emissive="#FFE299"
          emissiveIntensity={hasSeatedStudent ? 1.15 : 0.72}
          roughness={0.25}
        />
      </mesh>

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
