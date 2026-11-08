// ---------------------------------------------------------------------------
// AmbientLife.tsx — Quần thể Sinh viên Bách Khoa sống động trong khuôn viên
// (Wave 2 — Trụ cột 2):
//   - Sử dụng HumanFigure nâng cấp mới (mắt 3D đa lớp có chớp mắt, 5 kiểu tóc
//     short/swept/ponytail/bob/bun, dây đeo thẻ SV HUST, vân vải PBR, giày 3D).
//   - Gồm các nhóm sinh viên:
//     1. Đi bộ tuần tra dọc Đường Tình Yêu, bờ Hồ Tiền, sân C7, sân Thư viện.
//     2. Đứng trò chuyện / đọc sách gần C9, Quảng trường C1, Căng-tin SV.
//     3. Chơi thể thao tại Sân bóng rổ & đứng chờ tại Nhà chờ Xe buýt Parabol.
//   - Hoàn toàn không có collider vật lý và tránh các điểm dừng LEGS / Fast Travel.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import {
  HumanFigure,
  computeNaturalGaitTargets,
  type FigureJoints,
  type FigureVariant,
  type HairStyle,
} from './StudentAvatar';

function useJoints(): FigureJoints {
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

interface WalkerSpec {
  id: string;
  a: [number, number];
  b: [number, number];
  speed: number;
  phaseOffset: number;
  variant: FigureVariant;
  shirt: string;
  shirtDark: string;
  pants: string;
  hairStyle: HairStyle;
  glasses?: boolean;
  lanyard?: boolean;
  backpack?: boolean;
}

const WALKING_STUDENTS: WalkerSpec[] = [
  // 1. Nữ sinh viên đi dạo dọc mép bắc Đường Tình Yêu
  {
    id: 'walk-love-1',
    a: [-36, -18.2],
    b: [12, -18.2],
    speed: 1.55,
    phaseOffset: 0.4,
    variant: 'polo',
    shirt: '#DA1E26',
    shirtDark: '#8F1418',
    pants: '#1E293B',
    hairStyle: 'ponytail',
    lanyard: true,
    backpack: true,
  },
  // 2. Nam sinh viên đi dọc mép nam Đường Tình Yêu hướng về Quảng trường TĐN
  {
    id: 'walk-love-2',
    a: [18, -14.0],
    b: [64, -14.0],
    speed: 1.65,
    phaseOffset: 1.9,
    variant: 'shirt',
    shirt: '#F8FAFC',
    shirtDark: '#CBD5E1',
    pants: '#27272A',
    hairStyle: 'short',
    glasses: true,
    lanyard: true,
    backpack: true,
  },
  // 3. Nữ sinh viên đi dạo bờ Tây Hồ Tiền
  {
    id: 'walk-lake-west',
    a: [-26.2, 18],
    b: [-26.2, 56],
    speed: 1.4,
    phaseOffset: 3.1,
    variant: 'hoodie',
    shirt: '#2563EB',
    shirtDark: '#1D4ED8',
    pants: '#334155',
    hairStyle: 'bob',
    lanyard: false,
    backpack: true,
  },
  // 4. Nam sinh viên đi dọc sân giữa cụm C3–C10 và C6–C8
  {
    id: 'walk-c7',
    a: [18, -62],
    b: [18, -28],
    speed: 1.6,
    phaseOffset: 0.8,
    variant: 'polo',
    shirt: '#DA1E26',
    shirtDark: '#8F1418',
    pants: '#1F2937',
    hairStyle: 'swept',
    glasses: true,
    lanyard: true,
    backpack: true,
  },
  // 5. Sinh viên đi dọc Đường Tạ Quang Bửu giữa Khu Ký túc xá Bách Khoa (B3–B13)
  {
    id: 'walk-dorm',
    a: [126, -58],
    b: [126, -12],
    speed: 1.5,
    phaseOffset: 2.3,
    variant: 'polo',
    shirt: '#0D9488',
    shirtDark: '#0F766E',
    pants: '#1E293B',
    hairStyle: 'ponytail',
    lanyard: true,
    backpack: false,
  },
  // 6. Sinh viên tập chạy bộ ở Sân Bóng rổ / Khu Thể chất Bách Khoa
  {
    id: 'walk-sport-1',
    a: [74, 59],
    b: [86, 59],
    speed: 2.4,
    phaseOffset: 1.1,
    variant: 'polo',
    shirt: '#1D4ED8',
    shirtDark: '#1E3A8A',
    pants: '#172554',
    hairStyle: 'short',
    lanyard: false,
    backpack: false,
  },
  // 7. Sinh viên đá bóng trên Sân vận động Bách Khoa
  {
    id: 'walk-sport-2',
    a: [134, 68],
    b: [158, 68],
    speed: 2.5,
    phaseOffset: 4.0,
    variant: 'polo',
    shirt: '#DA1E26',
    shirtDark: '#8F1418',
    pants: '#1E293B',
    hairStyle: 'swept',
    lanyard: false,
    backpack: false,
  },
  // 8. Sinh viên đi bộ trước Viện CNTT&TT (Nhà B1 — SoICT)
  {
    id: 'walk-soict-b1',
    a: [98, 25],
    b: [124, 25],
    speed: 1.55,
    phaseOffset: 1.5,
    variant: 'shirt',
    shirt: '#F8FAFC',
    shirtDark: '#CBD5E1',
    pants: '#1E293B',
    hairStyle: 'short',
    glasses: true,
    lanyard: true,
    backpack: true,
  },
];

function WalkingStudent({ spec }: { spec: WalkerSpec }) {
  const groupRef = useRef<THREE.Group>(null!);
  const joints = useJoints();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + spec.phaseOffset * 5;
    const dx = spec.b[0] - spec.a[0];
    const dz = spec.b[1] - spec.a[1];
    const dist = Math.hypot(dx, dz) || 1;
    const period = (dist / spec.speed) * 2;
    const uRaw = (t % period) / (period / 2);
    const forward = uRaw <= 1;
    const u = forward ? uRaw : 2 - uRaw;

    const x = spec.a[0] + dx * u;
    const z = spec.a[1] + dz * u;
    const dirX = forward ? dx : -dx;
    const dirZ = forward ? dz : -dz;
    const facing = Math.atan2(dirX, dirZ);

    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z);
      groupRef.current.rotation.y = facing;
    }

    const phase = t * spec.speed * 4.2;
    const gait = computeNaturalGaitTargets(phase, 0.48, 1, t, spec.speed > 2.0);
    if (joints.legL.current) joints.legL.current.rotation.x = gait.legLTarget;
    if (joints.legR.current) joints.legR.current.rotation.x = gait.legRTarget;
    if (joints.kneeL.current) joints.kneeL.current.rotation.x = gait.kneeLTarget;
    if (joints.kneeR.current) joints.kneeR.current.rotation.x = gait.kneeRTarget;
    if (joints.footL.current) joints.footL.current.rotation.x = gait.footLTarget;
    if (joints.footR.current) joints.footR.current.rotation.x = gait.footRTarget;
    if (joints.armL.current) joints.armL.current.rotation.x = gait.armLTarget;
    if (joints.armR.current) joints.armR.current.rotation.x = gait.armRTarget;
    if (joints.elbowL.current) joints.elbowL.current.rotation.x = gait.elbowLTarget;
    if (joints.elbowR.current) joints.elbowR.current.rotation.x = gait.elbowRTarget;
    if (joints.body.current) {
      joints.body.current.rotation.x = gait.bodyLeanTarget;
      joints.body.current.rotation.z = gait.bodyRollTarget;
      joints.body.current.position.y = gait.bodyBobTarget;
    }
  });

  const isFemale = spec.hairStyle === 'ponytail' || spec.hairStyle === 'bob' || spec.hairStyle === 'bun';

  return (
    <group ref={groupRef} position={[spec.a[0], 0, spec.a[1]]}>
      <HumanFigure
        variant={spec.variant}
        gender={isFemale ? 'female' : 'male'}
        shirt={spec.shirt}
        shirtDark={spec.shirtDark}
        pants={spec.pants}
        shoe="#F5F5F5"
        shoeSole="#222222"
        hairStyle={spec.hairStyle}
        glasses={spec.glasses}
        lanyard={spec.lanyard}
        wristwatch
        backpack={spec.backpack}
        joints={joints}
      />
    </group>
  );
}

interface StandingSpec {
  id: string;
  pos: [number, number];
  rotY: number;
  variant: FigureVariant;
  shirt: string;
  shirtDark: string;
  pants: string;
  hairStyle: HairStyle;
  glasses?: boolean;
  lanyard?: boolean;
  backpack?: boolean;
}

const STANDING_STUDENTS: StandingSpec[] = [
  // Sinh viên đứng chờ xe buýt tại Nhà chờ Cổng Parabol
  {
    id: 'stand-bus-1',
    pos: [-86.8, 22.8],
    rotY: Math.PI / 2,
    variant: 'polo',
    shirt: '#DA1E26',
    shirtDark: '#8F1418',
    pants: '#232E3D',
    hairStyle: 'bob',
    glasses: true,
    lanyard: true,
    backpack: true,
  },
  // Hai sinh viên trao đổi bài gần Quảng trường C1 (bên đông bậc tam cấp, ngoài lối đi)
  {
    id: 'stand-c1-1',
    pos: [-46.5, -36.5],
    rotY: -Math.PI / 3,
    variant: 'shirt',
    shirt: '#F5F5F0',
    shirtDark: '#D8D5CC',
    pants: '#1E293B',
    hairStyle: 'ponytail',
    lanyard: true,
    backpack: true,
  },
  {
    id: 'stand-c1-2',
    pos: [-48.0, -35.6],
    rotY: (Math.PI * 2) / 3,
    variant: 'hoodie',
    shirt: '#991B1B',
    shirtDark: '#7F1D1D',
    pants: '#334155',
    hairStyle: 'short',
    glasses: true,
    lanyard: false,
    backpack: true,
  },
  // Sinh viên đứng ngắm hoa súng bờ Bắc Hồ Tiền / gần VDZ
  {
    id: 'stand-vdz-lake',
    pos: [4.5, -6.2],
    rotY: 0,
    variant: 'polo',
    shirt: '#DA1E26',
    shirtDark: '#8F1418',
    pants: '#1F2937',
    hairStyle: 'swept',
    lanyard: true,
    backpack: true,
  },
  // Sinh viên trước sân Thư viện Tạ Quang Bửu (góc đông sân, ngoài lối đi vào cửa)
  {
    id: 'stand-lib-east',
    pos: [44.5, 16.5],
    rotY: -Math.PI / 4,
    variant: 'shirt',
    shirt: '#F8FAFC',
    shirtDark: '#CBD5E1',
    pants: '#1E293B',
    hairStyle: 'bun',
    glasses: true,
    lanyard: true,
    backpack: false,
  },
];

function StandingStudent({ spec }: { spec: StandingSpec }) {
  const joints = useJoints();

  useEffect(() => {
    if (joints.armL.current) joints.armL.current.rotation.x = 0.1;
    if (joints.armR.current) joints.armR.current.rotation.x = -0.08;
    if (joints.elbowL.current) joints.elbowL.current.rotation.x = -0.35;
    if (joints.elbowR.current) joints.elbowR.current.rotation.x = -0.48;
    if (joints.kneeL.current) joints.kneeL.current.rotation.x = 0.05;
    if (joints.kneeR.current) joints.kneeR.current.rotation.x = 0.05;
  }, [joints]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (joints.body.current) {
      joints.body.current.scale.y = 1 + Math.sin(t * 1.5) * 0.007;
      joints.body.current.rotation.z = Math.sin(t * 0.85) * 0.012;
    }
  });

  return (
    <group position={[spec.pos[0], 0, spec.pos[1]]} rotation-y={spec.rotY}>
      <HumanFigure
        variant={spec.variant}
        shirt={spec.shirt}
        shirtDark={spec.shirtDark}
        pants={spec.pants}
        shoe="#F5F5F5"
        shoeSole="#222222"
        hairStyle={spec.hairStyle}
        glasses={spec.glasses}
        lanyard={spec.lanyard}
        wristwatch
        backpack={spec.backpack}
        joints={joints}
      />
    </group>
  );
}

export default function AmbientLife() {
  return (
    <group>
      {WALKING_STUDENTS.map((s) => (
        <WalkingStudent key={s.id} spec={s} />
      ))}
      {STANDING_STUDENTS.map((s) => (
        <StandingStudent key={s.id} spec={s} />
      ))}
    </group>
  );
}
