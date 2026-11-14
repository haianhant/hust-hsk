'use client';

// ---------------------------------------------------------------------------
// features/campus/buildings/library/StudyChair.tsx — Ghế ngồi học thư viện
// có định danh seatId chuẩn từ STUDY_SEATS, hỗ trợ 5 trạng thái trực quan PR9:
//   1. available (Trống)
//   2. pending (Đang giữ chỗ...)
//   3. occupied-self (Ghế của bạn)
//   4. occupied-other (Đã có người ngồi)
//   5. offline-self (Ghế của bạn · Chế độ ngoại tuyến)
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { CANVAS_VN_FONT, wrapVietnameseCanvasContext } from '../../../../components/three/TextPlate';
import type { StudySeatDefinition } from '../../../../shared/contracts/study';

export type ChairVisualState =
  | 'available'
  | 'pending'
  | 'occupied-self'
  | 'occupied-other'
  | 'offline-self';

export interface StudyChairProps {
  seat: StudySeatDefinition;
  woodTex?: THREE.CanvasTexture;
  isSeatedHere: boolean;
  isNearestInteractable: boolean;
  isPendingHere?: boolean;
  isOccupiedByOther?: boolean;
  occupantName?: string | null;
  isOnline?: boolean;
  onSelectSeat?: (seatId: string) => void;
}

function useChairStatusBadgeTexture(
  text: string | null,
  borderColor: string,
): THREE.CanvasTexture | null {
  const tex = useMemo(() => {
    if (!text) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 448;
    canvas.height = 68;
    const rawCtx = canvas.getContext('2d');
    if (rawCtx) {
      const ctx = wrapVietnameseCanvasContext(rawCtx);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      ctx.beginPath();
      ctx.roundRect(4, 4, 440, 60, 16);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(4, 4, 440, 60, 16);
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let size = 25;
      ctx.font = `700 ${size}px ${CANVAS_VN_FONT}`;
      const w = ctx.measureText(text).width;
      if (w > 412) {
        size = Math.max(16, Math.floor((size * 412) / w));
        ctx.font = `700 ${size}px ${CANVAS_VN_FONT}`;
      }
      ctx.fillText(text, 224, 35);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, borderColor]);

  useEffect(() => {
    return () => {
      tex?.dispose();
    };
  }, [tex]);

  return tex;
}

export function StudyChair({
  seat,
  woodTex,
  isSeatedHere,
  isNearestInteractable,
  isPendingHere = false,
  isOccupiedByOther = false,
  occupantName = null,
  isOnline = false,
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

  const visualState: ChairVisualState = isSeatedHere
    ? isOnline
      ? 'occupied-self'
      : 'offline-self'
    : isPendingHere
      ? 'pending'
      : isOccupiedByOther
        ? 'occupied-other'
        : 'available';

  const highlighted = hovered || isNearestInteractable;

  let cushionColor = '#9E1B22';
  let cushionEmissive = '#000000';
  let emissiveIntensity = 0;

  if (visualState === 'occupied-self' || visualState === 'offline-self') {
    cushionColor = '#15803D';
    cushionEmissive = '#0F5132';
    emissiveIntensity = 0.45;
  } else if (visualState === 'pending') {
    cushionColor = '#D97706';
    cushionEmissive = '#92400E';
    emissiveIntensity = 0.55;
  } else if (visualState === 'occupied-other') {
    cushionColor = highlighted ? '#475569' : '#334155';
    cushionEmissive = highlighted ? '#334155' : '#0F172A';
    emissiveIntensity = highlighted ? 0.35 : 0.15;
  } else if (highlighted) {
    cushionColor = '#C8232C';
    cushionEmissive = '#5C1118';
    emissiveIntensity = 0.45;
  }

  const frameColor =
    visualState === 'occupied-other'
      ? '#64748B'
      : highlighted || visualState === 'pending'
        ? '#B6834E'
        : '#9C6B3B';

  const badgeConfig = useMemo(() => {
    if (visualState === 'pending') {
      return { text: '⏳ Đang giữ chỗ...', border: '#F59E0B', y: 1.02 };
    }
    if (visualState === 'occupied-self') {
      return { text: '🪑 Ghế của bạn', border: '#22C55E', y: 1.54 };
    }
    if (visualState === 'offline-self') {
      return { text: '🪑 Ghế của bạn · Ngoại tuyến', border: '#38BDF8', y: 1.54 };
    }
    return { text: null, border: '#94A3B8', y: 1.02 };
  }, [visualState]);

  const badgeTex = useChairStatusBadgeTexture(badgeConfig.text, badgeConfig.border);

  return (
    <group
      position={[seat.x, 0, seat.z]}
      userData={{
        seatId: seat.seatId,
        studyRoomId: seat.studyRoomId,
        seatVisualState: visualState,
        occupiedByOther: isOccupiedByOther,
        occupantName: occupantName ?? undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectSeat?.(seat.seatId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = isOccupiedByOther ? 'not-allowed' : 'pointer';
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
      <group rotation={[0, seat.facing, 0]}>
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
        {/* Mép trước mặt ghế bo tròn công thái học & thanh giằng thép dưới mặt ghế */}
        <mesh position={[0, 0.42, 0.242]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, 0.426, 12]} />
          <meshStandardMaterial color={frameColor} map={woodTex} roughness={0.46} />
        </mesh>
        <mesh position={[0, 0.39, 0.05]}>
          <boxGeometry args={[0.36, 0.022, 0.032]} />
          <meshStandardMaterial color="#2A3240" roughness={0.48} metalness={0.54} />
        </mesh>

        {/* Đệm ngồi bọc nỉ (mặt trên ở cao độ y = 0.45m) */}
        <mesh position={[0, 0.444, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.395, 0.024, 0.375]} />
          <meshStandardMaterial
            color={cushionColor}
            emissive={cushionEmissive}
            emissiveIntensity={emissiveIntensity}
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
          <group key={`rear-leg-${lx}`}>
            <mesh position={[lx, 0.405, -0.13]} castShadow>
              <boxGeometry args={[0.034, 0.81, 0.034]} />
              <meshStandardMaterial color="#2A3240" roughness={0.46} metalness={0.52} />
            </mesh>
            <mesh position={[lx, 0.814, -0.13]}>
              <boxGeometry args={[0.036, 0.01, 0.036]} />
              <meshStandardMaterial color="#64748B" roughness={0.32} metalness={0.75} />
            </mesh>
          </group>
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
        <mesh position={[0, 0.805, -0.142]}>
          <boxGeometry args={[0.42, 0.022, 0.032]} />
          <meshStandardMaterial color="#8B5A32" map={woodTex} roughness={0.44} />
        </mesh>

        {/* Đệm tựa lưng bọc nỉ đồng bộ với đệm ngồi */}
        <mesh position={[0, 0.71, -0.125]}>
          <boxGeometry args={[0.35, 0.125, 0.016]} />
          <meshStandardMaterial
            color={cushionColor}
            emissive={cushionEmissive}
            emissiveIntensity={emissiveIntensity * 0.8}
            roughness={0.7}
          />
        </mesh>
      </group>

      {/* Bảng trạng thái nổi trên ghế khi đang giữ chỗ hoặc đang ngồi (Billboard ngoài nhóm xoay) */}
      {badgeTex && (
        <Billboard position={[0, badgeConfig.y, 0]}>
          <mesh>
            <planeGeometry args={[1.18, 0.18]} />
            <meshBasicMaterial
              map={badgeTex}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}
