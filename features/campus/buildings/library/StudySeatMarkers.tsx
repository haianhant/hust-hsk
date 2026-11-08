'use client';

// ---------------------------------------------------------------------------
// features/campus/buildings/library/StudySeatMarkers.tsx — Vòng chỉ báo mặt sàn
// tinh tế dưới mỗi ghế học (chống Z-fighting ở y = 0.014m).
// ---------------------------------------------------------------------------

import type { StudySeatDefinition } from '../../../../shared/contracts/study';

export interface StudySeatMarkersProps {
  seats: readonly StudySeatDefinition[];
  activeSeatId: string | null;
  nearestSeatId: string | null;
  onSelectSeat?: (seatId: string) => void;
}

export function StudySeatMarkers({
  seats,
  activeSeatId,
  nearestSeatId,
  onSelectSeat,
}: StudySeatMarkersProps) {
  return (
    <group>
      {seats.map((seat) => {
        const isActive = seat.seatId === activeSeatId;
        const isNearest = seat.seatId === nearestSeatId;
        const color = isActive
          ? '#22C55E'
          : isNearest
            ? '#F59E0B'
            : '#C8A97E';
        const opacity = isActive ? 0.75 : isNearest ? 0.68 : 0.28;

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
