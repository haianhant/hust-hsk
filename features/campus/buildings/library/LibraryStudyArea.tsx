'use client';

// ---------------------------------------------------------------------------
// features/campus/buildings/library/LibraryStudyArea.tsx — Khu vực bàn ghế ngồi học
// tương tác tại Sảnh tầng 1 Thư viện Tạ Quang Bửu (PR8 Local Interactive Seating).
// Sử dụng nguồn sự thật duy nhất từ STUDY_SEATS (shared/contracts/study.ts) và
// LIBRARY_LOBBY.studyTables (features/campus/world-data/buildings.ts).
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import { makeWoodGrainTexture } from '../../../../components/three/materials';
import { getSeatsForStudyRoom } from '../../../../shared/contracts/study';
import { LIBRARY_LOBBY } from '../../world-data/buildings';
import { StudyChair } from './StudyChair';
import { StudySeatMarkers } from './StudySeatMarkers';
import { StudyTable } from './StudyTable';

export interface LibraryStudyAreaProps {
  activeSeatId?: string | null;
  nearestSeatId?: string | null;
  onSelectSeat?: (seatId: string) => void;
}

export function LibraryStudyArea({
  activeSeatId = null,
  nearestSeatId = null,
  onSelectSeat,
}: LibraryStudyAreaProps) {
  const woodTex = useMemo(() => makeWoodGrainTexture(2, 2), []);
  useEffect(() => () => woodTex.dispose(), [woodTex]);

  const lobbySeats = useMemo(() => getSeatsForStudyRoom('library-lobby'), []);

  return (
    <group name="library-lobby-study-area">
      {LIBRARY_LOBBY.studyTables.map((table, index) => {
        const hasSeatedStudent = lobbySeats.some(
          (s) => s.tableId === table.tableId && s.seatId === activeSeatId,
        );
        return (
          <StudyTable
            key={table.tableId}
            tableId={table.tableId}
            label={table.label}
            index={index}
            x={table.x}
            z={table.z}
            w={table.width}
            d={table.depth}
            h={table.height}
            woodTex={woodTex}
            hasSeatedStudent={hasSeatedStudent}
          />
        );
      })}

      {lobbySeats.map((seat) => (
        <StudyChair
          key={seat.seatId}
          seat={seat}
          woodTex={woodTex}
          isSeatedHere={seat.seatId === activeSeatId}
          isNearestInteractable={seat.seatId === nearestSeatId}
          onSelectSeat={onSelectSeat}
        />
      ))}

      <StudySeatMarkers
        seats={lobbySeats}
        activeSeatId={activeSeatId}
        nearestSeatId={nearestSeatId}
        onSelectSeat={onSelectSeat}
      />
    </group>
  );
}
