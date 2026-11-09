'use client';

// ---------------------------------------------------------------------------
// features/campus/buildings/library/LibraryStudyArea.tsx — Khu vực bàn ghế ngồi học
// tương tác tại Sảnh tầng 1 Thư viện Tạ Quang Bửu (PR8 Local Interactive Seating +
// PR9 Server-Authoritative Seat Occupancy & Live Study Presence).
// Sử dụng nguồn sự thật duy nhất từ STUDY_SEATS (shared/contracts/study.ts) và
// LIBRARY_LOBBY.studyTables (features/campus/world-data/buildings.ts).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { makeWoodGrainTexture } from '../../../../components/three/materials';
import { multiplayer, type MultiplayerSnapshot } from '../../../../lib/multiplayer';
import { getSeatsForStudyRoom } from '../../../../shared/contracts/study';
import { RemoteStudySeats } from '../../../social/rooms/RemoteStudySeats';
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

  const [mpSnap, setMpSnap] = useState<MultiplayerSnapshot>(() => multiplayer.snapshot);

  useEffect(() => {
    setMpSnap(multiplayer.snapshot);
    return multiplayer.subscribe((next) => {
      setMpSnap(next);
    });
  }, []);

  const lobbySeats = useMemo(() => getSeatsForStudyRoom('library-lobby'), []);

  const occupiedByOtherSeatIds = useMemo(() => {
    const set = new Set<string>();
    for (const occ of mpSnap.seats) {
      if (
        occ.studyRoomId === 'library-lobby' &&
        (!mpSnap.selfId || occ.occupantId !== mpSnap.selfId) &&
        occ.seatId !== activeSeatId
      ) {
        set.add(occ.seatId);
      }
    }
    return set;
  }, [mpSnap.seats, mpSnap.selfId, activeSeatId]);

  const pendingSeatId = mpSnap.pendingSeatRequest?.seatId ?? null;
  const isOnline = mpSnap.status === 'online';

  return (
    <group name="library-lobby-study-area">
      {LIBRARY_LOBBY.studyTables.map((table, index) => {
        const hasSeatedStudent = lobbySeats.some(
          (s) =>
            s.tableId === table.tableId &&
            (s.seatId === activeSeatId || Boolean(mpSnap.seatMap[s.seatId])),
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

      {lobbySeats.map((seat) => {
        const remoteOcc = mpSnap.seatMap[seat.seatId];
        const isOccupiedByOther = occupiedByOtherSeatIds.has(seat.seatId);
        return (
          <StudyChair
            key={seat.seatId}
            seat={seat}
            woodTex={woodTex}
            isSeatedHere={seat.seatId === activeSeatId}
            isNearestInteractable={seat.seatId === nearestSeatId}
            isPendingHere={seat.seatId === pendingSeatId}
            isOccupiedByOther={isOccupiedByOther}
            occupantName={isOccupiedByOther ? (remoteOcc?.occupantName ?? null) : null}
            isOnline={isOnline}
            onSelectSeat={onSelectSeat}
          />
        );
      })}

      <StudySeatMarkers
        seats={lobbySeats}
        activeSeatId={activeSeatId}
        nearestSeatId={nearestSeatId}
        pendingSeatId={pendingSeatId}
        occupiedByOtherSeatIds={occupiedByOtherSeatIds}
        onSelectSeat={onSelectSeat}
      />

      {/* Sinh viên khác đang ngồi học trong phòng multiplayer hiện tại */}
      <RemoteStudySeats onSelectOccupiedSeat={onSelectSeat} />
    </group>
  );
}
