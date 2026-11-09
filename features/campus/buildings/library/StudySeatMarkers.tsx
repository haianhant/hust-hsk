'use client';

// ---------------------------------------------------------------------------
// features/campus/buildings/library/StudySeatMarkers.tsx — Vòng chỉ báo mặt sàn
// tinh tế dưới mỗi ghế học (chống Z-fighting ở y = 0.014m), phân biệt 4 trạng
// thái ghế: Đang ngồi (xanh lá), Đang giữ chỗ (cam), Đã có người khác ngồi (đỏ),
// Gần nhất / Trống (vàng ấm).
// ---------------------------------------------------------------------------

import type { StudySeatDefinition } from '../../../../shared/contracts/study';

export interface StudySeatMarkersProps {
  seats: readonly StudySeatDefinition[];
  activeSeatId: string | null;
  nearestSeatId: string | null;
  pendingSeatId?: string | null;
  occupiedByOtherSeatIds?: ReadonlySet<string>;
  onSelectSeat?: (seatId: string) => void;
}

export function StudySeatMarkers({
  seats,
  activeSeatId,
  nearestSeatId,
  pendingSeatId = null,
  occupiedByOtherSeatIds,
  onSelectSeat,
}: StudySeatMarkersProps) {
  return (
    <group>
      {seats.map((seat) => {
        const isActive = seat.seatId === activeSeatId;
        const isPending = seat.seatId === pendingSeatId;
        const isOccupiedOther = Boolean(occupiedByOtherSeatIds?.has(seat.seatId));
        const isNearest = seat.seatId === nearestSeatId;

        const color = isActive
          ? '#22C55E'
          : isPending
            ? '#F59E0B'
            : isOccupiedOther
              ? '#EF4444'
              : isNearest
                ? '#F59E0B'
                : '#C8A97E';

        const opacity = isActive
          ? 0.78
          : isPending
            ? 0.82
            : isOccupiedOther
              ? 0.65
              : isNearest
                ? 0.68
                : 0.28;

        return (
          <mesh
            key={`marker-${seat.seatId}`}
            position={[seat.x, 0.014, seat.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSeat?.(seat.seatId);
            }}
          >
            <ringGeometry args={[0.25, 0.32, 24]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
