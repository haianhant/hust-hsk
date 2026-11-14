'use client';

// ---------------------------------------------------------------------------
// features/boardgame/world/BoardGameSeats.tsx — Render avatar những người chơi
// đang ngồi tại các ghế bàn chơi (trừ người chơi local do Player.tsx render)
// kèm bảng tên tối giản không lộ vai trò bí mật hay MSSV.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
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
import { CANVAS_VN_FONT, wrapVietnameseCanvasContext } from '../../../components/three/TextPlate';
import {
  getBoardGameSeatById,
  type BoardGameSeatSpec,
} from '../../campus/world-data';
import type { AvatarGender, AvatarHairStyle, AvatarOutfitId } from '../../../lib/playerState';

export interface BoardGameSeatOccupant {
  playerId: string;
  seatId: string;
  displayName: string;
  isHost?: boolean;
  ready?: boolean;
  connected?: boolean;
  appearance?: {
    gender?: AvatarGender;
    outfit?: AvatarOutfitId;
    hairStyle?: AvatarHairStyle;
    skirt?: boolean;
    glasses?: boolean;
  };
}

function useSeatJoints(): FigureJoints {
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

function makeSeatNameBadgeTexture(name: string, ready: boolean, isHost: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const raw = canvas.getContext('2d');
  if (raw) {
    const ctx = wrapVietnameseCanvasContext(raw);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(12, 16, 488, 96, 22);
    ctx.fill();
    ctx.strokeStyle = ready ? '#10B981' : isHost ? '#F59E0B' : '#64748B';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = `700 32px ${CANVAS_VN_FONT}`;
    ctx.fillText(isHost ? `👑 ${name}` : name, 256, 54);

    ctx.fillStyle = ready ? '#34D399' : '#FDE68A';
    ctx.font = `600 22px ${CANVAS_VN_FONT}`;
    ctx.fillText(ready ? 'Sẵn sàng vào ván' : 'Đang chờ tại bàn', 256, 92);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function SeatedRemotePlayerAvatar({
  seat,
  occupant,
}: {
  seat: BoardGameSeatSpec;
  occupant: BoardGameSeatOccupant;
}) {
  const joints = useSeatJoints();
  const badgeTex = useMemo(
    () =>
      makeSeatNameBadgeTexture(
        occupant.displayName,
        Boolean(occupant.ready),
        Boolean(occupant.isHost),
      ),
    [occupant.displayName, occupant.ready, occupant.isHost],
  );

  useEffect(() => {
    return () => {
      badgeTex.dispose();
    };
  }, [badgeTex]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.25);
    const poseEase = Math.min(1, dt * 14);
    const pose = computeSeatedPoseTargets(clock.getElapsedTime());
    const set = (ref: React.RefObject<THREE.Group>, axis: 'x' | 'y' | 'z', v: number) => {
      if (ref.current) {
        ref.current.rotation[axis] += (v - ref.current.rotation[axis]) * poseEase;
      }
    };
    set(joints.legL, 'x', pose.legLTarget);
    set(joints.legR, 'x', pose.legRTarget);
    set(joints.kneeL, 'x', pose.kneeLTarget);
    set(joints.kneeR, 'x', pose.kneeRTarget);
    set(joints.footL, 'x', pose.footLTarget);
    set(joints.footR, 'x', pose.footRTarget);
    set(joints.armL, 'x', pose.armLTarget);
    set(joints.armR, 'x', pose.armRTarget);
    set(joints.elbowL, 'x', pose.elbowLTarget);
    set(joints.elbowR, 'x', pose.elbowRTarget);
    set(joints.body, 'x', pose.bodyLeanTarget);
    set(joints.body, 'z', pose.bodyRollTarget);
  });

  const app = occupant.appearance ?? {};
  const gender: AvatarGender = app.gender ?? 'male';
  const outfitId: AvatarOutfitId = app.outfit ?? 'windbreaker-hust';
  const preset = OUTFIT_PRESETS[outfitId] ?? OUTFIT_PRESETS['windbreaker-hust'];
  const hairStyle: AvatarHairStyle =
    app.hairStyle ?? (gender === 'female' ? 'ponytail' : 'short');
  const skirtColor =
    gender === 'female' && app.skirt ? (preset.defaultSkirtColor ?? '#1E293B') : undefined;

  return (
    <group
      name={`boardgame-seated-avatar-${occupant.playerId}`}
      position={[seat.x, SEATED_GROUP_Y_OFFSET, seat.z]}
    >
      <group rotation={[0, seat.facing, 0]}>
        <HumanFigure
          variant={preset.variant}
          gender={gender}
          shirt={preset.shirt}
          shirtDark={preset.shirtDark}
          upperYokeColor={preset.upperYokeColor}
          sleeveColor={preset.sleeveColor}
          skirtColor={skirtColor}
          pants={preset.pants}
          shoe={preset.shoe}
          shoeSole={preset.shoeSole}
          hairStyle={hairStyle}
          glasses={Boolean(app.glasses)}
          lanyard
          wristwatch
          backpack={false}
          backpackColors={{ pack: '#2A2E33', packLight: '#3A3E44', packZip: '#1A1A1A' }}
          seated
          joints={joints}
        />
      </group>

      <Billboard position={[0, 1.98, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <mesh>
          <planeGeometry args={[1.15, 0.29]} />
          <meshBasicMaterial map={badgeTex} transparent depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

export interface BoardGameSeatsProps {
  occupants?: readonly BoardGameSeatOccupant[];
  localPlayerId?: string | null;
  localSeatId?: string | null;
}

export default function BoardGameSeats({
  occupants = [],
  localPlayerId = null,
  localSeatId = null,
}: BoardGameSeatsProps) {
  return (
    <group name="boardgame-remote-seated-avatars">
      {occupants.map((occ) => {
        if (localPlayerId && occ.playerId === localPlayerId) return null;
        if (localSeatId && occ.seatId === localSeatId) return null;
        const seat = getBoardGameSeatById(occ.seatId);
        if (!seat) return null;
        return <SeatedRemotePlayerAvatar key={occ.playerId} seat={seat} occupant={occ} />;
      })}
    </group>
  );
}
