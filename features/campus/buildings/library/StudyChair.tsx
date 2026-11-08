'use client';

// ---------------------------------------------------------------------------
// features/campus/buildings/library/StudyChair.tsx — Ghế ngồi học thư viện
// có định danh seatId chuẩn từ STUDY_SEATS, hỗ trợ hover/proximity highlight
// và chọn ghế bằng chuột/chạm hoặc phím E.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import type * as THREE from 'three';
import type { StudySeatDefinition } from '../../../../shared/contracts/study';

export interface StudyChairProps {
  seat: StudySeatDefinition;
  woodTex?: THREE.CanvasTexture;
  isSeatedHere: boolean;
  isNearestInteractable: boolean;
  onSelectSeat?: (seatId: string) => void;
}

export function StudyChair({
  seat,
  woodTex,
  isSeatedHere,
  isNearestInteractable,
  onSelectSeat,
}: StudyChairProps) {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    return () => {
      if (hovered && typeof document !== 'undefined') {
        document.body.style.cursor = 'auto';
      }
    };
  }, [hovered]);

  const highlighted = hovered || isNearestInteractable;
  const cushionColor = isSeatedHere
    ? '#15803D'
    : highlighted
      ? '#C8232C'
      : '#9E1B22';
  const cushionEmissive = isSeatedHere
    ? '#0F5132'
    : highlighted
      ? '#5C1118'
      : '#000000';
  const frameColor = highlighted ? '#B6834E' : '#9C6B3B';

  return (
    <group
      position={[seat.x, 0, seat.z]}
      rotation={[0, seat.facing, 0]}
      userData={{ seatId: seat.seatId, studyRoomId: seat.studyRoomId }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectSeat?.(seat.seatId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'auto';
        }
      }}
    >
      {/* Hộp bắt tia (raycast hitbox) bao quanh thân ghế để bấm chuột / chạm cảm ứng trên cả PC & mobile không bị lọt khe giữa đệm và tựa lưng */}
      <mesh position={[0, 0.44, 0.04]}>
        <boxGeometry args={[0.48, 0.82, 0.46]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Khung mặt ghế gỗ (cao 0.42m, tâm dịch +0.05m về phía bàn để khớp đùi nhân vật) */}
      <mesh position={[0, 0.42, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.43, 0.028, 0.41]} />
        <meshStandardMaterial color={frameColor} map={woodTex} roughness={0.48} />
      </mesh>

      {/* Đệm ngồi bọc nỉ đỏ Bách khoa (mặt trên ở cao độ y = 0.45m) */}
      <mesh position={[0, 0.444, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.395, 0.024, 0.375]} />
        <meshStandardMaterial
          color={cushionColor}
          emissive={cushionEmissive}
          emissiveIntensity={highlighted || isSeatedHere ? 0.45 : 0}
          roughness={0.68}
        />
      </mesh>

      {/* 2 chân trước (y = 0 -> 0.42m) */}
      {([-0.18, 0.18] as const).map((lx) => (
        <mesh key={`front-leg-${lx}`} position={[lx, 0.21, 0.22]} castShadow>
          <boxGeometry args={[0.032, 0.42, 0.032]} />
          <meshStandardMaterial color="#2A3240" roughness={0.46} metalness={0.52} />
        </mesh>
      ))}

      {/* 2 chân sau nối liền trụ tựa lưng (y = 0 -> 0.81m) */}
      {([-0.18, 0.18] as const).map((lx) => (
        <mesh key={`rear-leg-${lx}`} position={[lx, 0.405, -0.13]} castShadow>
          <boxGeometry args={[0.034, 0.81, 0.034]} />
          <meshStandardMaterial color="#2A3240" roughness={0.46} metalness={0.52} />
        </mesh>
      ))}

      {/* Thanh giằng ngang dưới gầm ghế */}
      {([-0.18, 0.18] as const).map((lx) => (
        <mesh key={`side-rail-${lx}`} position={[lx, 0.15, 0.045]}>
          <boxGeometry args={[0.022, 0.022, 0.34]} />
          <meshStandardMaterial color="#2A3240" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}

      {/* Tựa lưng gỗ uốn công thái học (local z = -0.14m, sau lưng nhân vật) */}
      <mesh position={[0, 0.71, -0.142]} castShadow>
        <boxGeometry args={[0.42, 0.18, 0.026]} />
        <meshStandardMaterial color={frameColor} map={woodTex} roughness={0.46} />
      </mesh>

      {/* Đệm tựa lưng bọc nỉ đồng bộ với đệm ngồi */}
      <mesh position={[0, 0.71, -0.125]}>
        <boxGeometry args={[0.35, 0.125, 0.016]} />
        <meshStandardMaterial
          color={cushionColor}
          emissive={cushionEmissive}
          emissiveIntensity={highlighted || isSeatedHere ? 0.35 : 0}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}
