'use client';

// ---------------------------------------------------------------------------
// features/social/rooms/RemoteStudySeats.tsx — Hiển thị sinh viên khác đang
// ngồi học trong Sảnh tầng 1 Thư viện Tạ Quang Bửu (PR9 Server-Authoritative
// Seat Occupancy & Live Study Presence).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import {
  HumanFigure,
  OUTFIT_PRESETS,
  SEATED_GROUP_Y_OFFSET,
  computeSeatedPoseTargets,
  type FigureJoints,
} from '../../../components/three/StudentAvatar';
import {
  multiplayer,
  type MultiplayerSnapshot,
  type RemotePlayer,
} from '../../../lib/multiplayer';
import { playerState } from '../../../lib/playerState';
import {
  getSeatDefinition,
  type PlayerStudyPresence,
  type SeatOccupancy,
} from '../../../shared/contracts/study';

export interface RemoteSeatedRenderEntry {
  seatId: string;
  occupantId: string;
  occupantName: string;
  x: number;
  y: number;
  z: number;
  facing: number;
  status: string;
  subjectTag: string | null;
  badgeLine1: string;
  badgeLine2: string;
}

export const remoteSeatedRenderMap = new Map<string, RemoteSeatedRenderEntry>();

function syncWindowRemoteSeatsDebug() {
  if (typeof window === 'undefined') return;
  const win = window as unknown as {
    __bkhnRemoteStudySeats?: () => RemoteSeatedRenderEntry[];
  };
  if (!win.__bkhnRemoteStudySeats) {
    win.__bkhnRemoteStudySeats = () => Array.from(remoteSeatedRenderMap.values());
  }
}

function useFigureJoints(): FigureJoints {
  return {
    body: useRef<THREE.Group>(null!),
    armL: useRef<THREE.Group>(null!),
    armR: useRef<THREE.Group>(null!),
    elbowL: useRef<THREE.Group>(null!),
    elbowR: useRef<THREE.Group>(null!),
    legL: useRef<THREE.Group>(null!),
    legR: useRef<THREE.Group>(null!),
    kneeL: useRef<THREE.Group>(null!),
    kneeR: useRef<THREE.Group>(null!),
    footL: useRef<THREE.Group>(null!),
    footR: useRef<THREE.Group>(null!),
  };
}

function darken(hex: string): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = parseInt(clean, 16);
  if (Number.isNaN(n)) return '#162844';
  const r = Math.max(0, ((n >> 16) & 255) - 38);
  const g = Math.max(0, ((n >> 8) & 255) - 38);
  const b = Math.max(0, (n & 255) - 38);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function formatRemoteSeatStatusLine(
  presence: PlayerStudyPresence | undefined,
  occupancy: SeatOccupancy,
): { text: string; accentColor: string } {
  const subject = presence?.subjectTag ?? occupancy.subjectTag ?? null;
  const status = presence?.status ?? 'idle';

  if (status === 'studying') {
    return {
      text: subject ? `🍅 Đang tự học · ${subject}` : '🍅 Đang tự học · Tập trung',
      accentColor: '#34D399',
    };
  }
  if (status === 'break') {
    return {
      text: subject ? `☕ Giải lao · ${subject}` : '☕ Đang giải lao',
      accentColor: '#FBBF24',
    };
  }
  return {
    text: subject ? `🪑 Đang ngồi · ${subject}` : '🪑 Đang ngồi học',
    accentColor: '#93C5FD',
  };
}

function useStudyBadgeTexture(
  line1: string,
  line2: string,
  accentColor: string,
): THREE.CanvasTexture {
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 116;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Nền thẻ tối bán trong suốt + viền mảnh
      ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      ctx.beginPath();
      ctx.roundRect(6, 6, 500, 104, 20);
      ctx.fill();

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(6, 6, 500, 104, 20);
      ctx.stroke();

      // Dòng 1: Tên sinh viên + nhãn ghế đã giữ chỗ (không bao giờ lộ MSSV)
      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let size1 = 27;
      ctx.font = `bold ${size1}px Arial, sans-serif`;
      const headerText = `${line1} · 🔒 Đã có người ngồi`;
      const w1 = ctx.measureText(headerText).width;
      if (w1 > 468) {
        size1 = Math.max(17, Math.floor((size1 * 468) / w1));
        ctx.font = `bold ${size1}px Arial, sans-serif`;
      }
      ctx.fillText(headerText, 256, 38);

      // Dòng 2: Trạng thái tự học (Pomodoro / Giải lao / Môn học)
      ctx.fillStyle = accentColor;
      let size2 = 24;
      ctx.font = `bold ${size2}px Arial, sans-serif`;
      const w2 = ctx.measureText(line2).width;
      if (w2 > 468) {
        size2 = Math.max(16, Math.floor((size2 * 468) / w2));
        ctx.font = `bold ${size2}px Arial, sans-serif`;
      }
      ctx.fillText(line2, 256, 78);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [line1, line2, accentColor]);

  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

interface RemoteSeatedStudentViewProps {
  occupancy: SeatOccupancy;
  player?: RemotePlayer;
  presence?: PlayerStudyPresence;
  onSelectOccupiedSeat?: (seatId: string) => void;
}

function RemoteSeatedStudentView({
  occupancy,
  player,
  presence,
  onSelectOccupiedSeat,
}: RemoteSeatedStudentViewProps) {
  const joints = useFigureJoints();
  const seat = useMemo(() => getSeatDefinition(occupancy.seatId), [occupancy.seatId]);

  const statusInfo = useMemo(
    () => formatRemoteSeatStatusLine(presence, occupancy),
    [presence, occupancy],
  );
  const displayName = player?.name || occupancy.occupantName || 'Sinh viên Bách khoa';
  const badgeTex = useStudyBadgeTexture(displayName, statusInfo.text, statusInfo.accentColor);

  useEffect(() => {
    syncWindowRemoteSeatsDebug();
    if (!seat) return;
    const entry: RemoteSeatedRenderEntry = {
      seatId: seat.seatId,
      occupantId: occupancy.occupantId,
      occupantName: displayName,
      x: seat.x,
      y: SEATED_GROUP_Y_OFFSET,
      z: seat.z,
      facing: seat.facing,
      status: presence?.status ?? 'idle',
      subjectTag: presence?.subjectTag ?? occupancy.subjectTag ?? null,
      badgeLine1: `${displayName} · 🔒 Đã có người ngồi`,
      badgeLine2: statusInfo.text,
    };
    remoteSeatedRenderMap.set(seat.seatId, entry);
    return () => {
      remoteSeatedRenderMap.delete(seat.seatId);
    };
  }, [seat, occupancy, displayName, presence, statusInfo.text]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pose = computeSeatedPoseTargets(t);
    const j = joints;
    const set = (ref: React.RefObject<THREE.Group>, axis: 'x' | 'z', v: number) => {
      if (ref.current) ref.current.rotation[axis] = v;
    };
    set(j.legL, 'x', pose.legLTarget);
    set(j.legR, 'x', pose.legRTarget);
    set(j.kneeL, 'x', pose.kneeLTarget);
    set(j.kneeR, 'x', pose.kneeRTarget);
    set(j.footL, 'x', pose.footLTarget);
    set(j.footR, 'x', pose.footRTarget);
    set(j.armL, 'x', pose.armLTarget);
    set(j.armR, 'x', pose.armRTarget);
    set(j.elbowL, 'x', pose.elbowLTarget);
    set(j.elbowR, 'x', pose.elbowRTarget);
    if (j.body.current) {
      j.body.current.rotation.x = pose.bodyLeanTarget;
      j.body.current.rotation.z = pose.bodyRollTarget;
      j.body.current.scale.y = 1 + Math.sin(t * 1.5) * 0.006;
    }
  });

  if (!seat) return null;

  const gender = player?.gender ?? occupancy.gender ?? 'male';
  const outfitKey = player?.outfit ?? occupancy.outfit;
  const preset = outfitKey ? OUTFIT_PRESETS[outfitKey] : undefined;
  const baseColor = player?.color ?? occupancy.color ?? '#1F3A5F';
  const hairStyle =
    player?.hairStyle ?? occupancy.hairStyle ?? (gender === 'female' ? 'ponytail' : 'short');
  const useSkirt = player?.skirt ?? occupancy.skirt ?? false;
  const skirtColor =
    gender === 'female' && useSkirt ? (preset?.defaultSkirtColor ?? '#1E293B') : undefined;
  const glasses = player?.glasses ?? occupancy.glasses ?? false;

  return (
    <group
      name={`remote-study-seat-${seat.seatId}`}
      position={[seat.x, SEATED_GROUP_Y_OFFSET, seat.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectOccupiedSeat?.(seat.seatId);
      }}
    >
      <group rotation={[0, seat.facing, 0]}>
        <HumanFigure
          variant={preset ? preset.variant : 'polo'}
          gender={gender}
          shirt={preset ? preset.shirt : baseColor}
          shirtDark={preset ? preset.shirtDark : darken(baseColor)}
          upperYokeColor={preset?.upperYokeColor}
          sleeveColor={preset?.sleeveColor}
          skirtColor={skirtColor}
          pants={preset ? preset.pants : '#2B2F36'}
          shoe={preset ? preset.shoe : '#F5F5F5'}
          shoeSole={preset ? preset.shoeSole : '#1A1A1A'}
          hairStyle={hairStyle}
          glasses={glasses}
          lanyard
          wristwatch
          backpack={false}
          backpackColors={{ pack: '#2A2E33', packLight: '#3A3E44', packZip: '#1A1A1A' }}
          joints={joints}
        />
      </group>

      {/* Billboard đặt ngoài nhóm xoay để chữ luôn đọc xuôi từ mọi góc camera */}
      <Billboard position={[0, 1.56, 0]}>
        <mesh>
          <planeGeometry args={[1.62, 0.36]} />
          <meshBasicMaterial map={badgeTex} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
    </group>
  );
}

export interface RemoteStudySeatsProps {
  onSelectOccupiedSeat?: (seatId: string) => void;
}

export function RemoteStudySeats({ onSelectOccupiedSeat }: RemoteStudySeatsProps) {
  const [snap, setSnap] = useState<MultiplayerSnapshot>(() => multiplayer.snapshot);
  const [activeFloor, setActiveFloor] = useState<number>(() => playerState.libraryFloor);

  useEffect(() => {
    syncWindowRemoteSeatsDebug();
    setSnap(multiplayer.snapshot);
    setActiveFloor(playerState.libraryFloor);
    const unsub = multiplayer.subscribe((next) => {
      setSnap(next);
    });
    const onFloorChange = (ev: Event) => {
      const flr = (ev as CustomEvent<{ floor?: number }>).detail?.floor;
      setActiveFloor(typeof flr === 'number' ? flr : playerState.libraryFloor);
    };
    window.addEventListener('bkhn:library-floor', onFloorChange);
    return () => {
      unsub();
      window.removeEventListener('bkhn:library-floor', onFloorChange);
      remoteSeatedRenderMap.clear();
    };
  }, []);

  const remoteLobbySeats = useMemo(() => {
    if (activeFloor !== 1) return [];
    return snap.seats.filter(
      (occ) =>
        occ.studyRoomId === 'library-lobby' &&
        (!snap.selfId || occ.occupantId !== snap.selfId),
    );
  }, [activeFloor, snap.seats, snap.selfId]);

  useEffect(() => {
    if (activeFloor !== 1) {
      remoteSeatedRenderMap.clear();
    }
  }, [activeFloor]);

  const playerMap = useMemo(() => {
    const map = new Map<string, RemotePlayer>();
    for (const p of snap.players) {
      map.set(p.id, p);
    }
    return map;
  }, [snap.players]);

  if (remoteLobbySeats.length === 0) return null;

  return (
    <group name="remote-study-seats">
      {remoteLobbySeats.map((occ) => (
        <RemoteSeatedStudentView
          key={`${occ.seatId}-${occ.occupantId}`}
          occupancy={occ}
          player={playerMap.get(occ.occupantId)}
          presence={snap.presences[occ.occupantId]}
          onSelectOccupiedSeat={onSelectOccupiedSeat}
        />
      ))}
    </group>
  );
}
export default RemoteStudySeats;
