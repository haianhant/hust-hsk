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
  skirt?: boolean;
  glasses?: boolean;
  lanyard?: boolean;
  backpack?: boolean;
}

const WALKING_STUDENTS: WalkerSpec[] = [
  // 1. Nữ sinh viên mặc Áo khoác gió đồng phục HUST đi dạo dọc mép bắc Đường Tình Yêu
  {
    id: 'walk-love-1',
    a: [-36, -18.2],
    b: [12, -18.2],
    speed: 1.55,
    phaseOffset: 0.4,
    variant: 'windbreaker',
    shirt: '#BA1C24',
    shirtDark: '#821017',
    pants: '#1E293B',
    hairStyle: 'ponytail',
    lanyard: true,
    backpack: true,
  },
  // 2. Nam sinh viên mặc Áo Bomber HUST đi dọc mép nam Đường Tình Yêu hướng về Quảng trường TĐN
  {
    id: 'walk-love-2',
    a: [18, -14.0],
    b: [64, -14.0],
    speed: 1.65,
    phaseOffset: 1.9,
    variant: 'bomber',
    shirt: '#1B2A4A',
    shirtDark: '#E2E8F0',
    pants: '#27272A',
    hairStyle: 'short',
    glasses: true,
    lanyard: true,
    backpack: true,
  },
  // 3. Nữ sinh viên mặc Áo phông xanh HUST + Chân váy xếp ly trắng đi dạo bờ Tây Hồ Tiền
  {
    id: 'walk-lake-west',
    a: [-26.2, 18],
    b: [-26.2, 56],
    speed: 1.4,
    phaseOffset: 3.1,
    variant: 'tshirt',
    shirt: '#1D3557',
    shirtDark: '#12233B',
    pants: '#F4F5F7',
    skirt: true,
    hairStyle: 'bob',
    lanyard: true,
    backpack: true,
  },
  // 4. Nam sinh viên đi dọc sân trước Tòa C7
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
  // 5. Sinh viên đi dọc lối sân thoáng Khu Ký túc xá Bách Khoa (ngoài hoàn toàn nhà B5–B7)
  {
    id: 'walk-dorm',
    a: [108, -56],
    b: [108, -14],
    speed: 1.5,
    phaseOffset: 2.3,
    variant: 'hoodie',
    shirt: '#9E1B22',
    shirtDark: '#6B1015',
    pants: '#1E293B',
    hairStyle: 'ponytail',
    lanyard: false,
    backpack: true,
  },
  // 6. Sinh viên tập chạy bộ ở Sân Bóng rổ / Khu Thể chất Bách Khoa
  {
    id: 'walk-sport-1',
    a: [74, 59],
    b: [86, 59],
    speed: 2.4,
    phaseOffset: 1.1,
    variant: 'tshirt',
    shirt: '#1D3557',
    shirtDark: '#12233B',
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
  // 8. Sinh viên đi bộ trước Trường CNTT&TT (Nhà B1 — SoICT)
  {
    id: 'walk-soict-b1',
    a: [98, 25],
    b: [124, 25],
    speed: 1.55,
    phaseOffset: 1.5,
    variant: 'windbreaker',
    shirt: '#BA1C24',
    shirtDark: '#821017',
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
        skirt={spec.skirt}
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
  skirt?: boolean;
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
    variant: 'windbreaker',
    shirt: '#BA1C24',
    shirtDark: '#821017',
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
    skirt: true,
    hairStyle: 'ponytail',
    lanyard: true,
    backpack: true,
  },
  {
    id: 'stand-c1-2',
    pos: [-48.0, -35.6],
    rotY: (Math.PI * 2) / 3,
    variant: 'hoodie',
    shirt: '#9E1B22',
    shirtDark: '#6B1015',
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
    variant: 'bomber',
    shirt: '#8E1B22',
    shirtDark: '#D1D5DB',
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
    variant: 'sweater',
    shirt: '#ECE7DF',
    shirtDark: '#D4CDC1',
    pants: '#1E293B',
    hairStyle: 'bun',
    glasses: true,
    lanyard: true,
    backpack: false,
  },
];

function StandingStudent({ spec }: { spec: StandingSpec }) {
  const joints = useJoints();
  const isFemale = spec.hairStyle === 'ponytail' || spec.hairStyle === 'bob' || spec.hairStyle === 'bun';

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
        gender={isFemale ? 'female' : 'male'}
        skirt={spec.skirt}
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

// --- Sinh viên ngồi đọc sách / ôn bài trên ghế đá ven Hồ Tiền (tham-khao/ho-tien/) ---
const SITTING_STUDENTS: StandingSpec[] = [
  // 1. Nam sinh viên ngồi đọc giáo trình trên ghế bờ Tây Hồ Tiền (z = 30, dưới bóng liễu)
  {
    id: 'sit-lake-west-1',
    pos: [-27.38, 30.0],
    rotY: Math.PI / 2,
    variant: 'windbreaker',
    shirt: '#BA1C24',
    shirtDark: '#821017',
    pants: '#1E293B',
    hairStyle: 'short',
    glasses: true,
    lanyard: true,
    backpack: false,
  },
  // 2. Nữ sinh viên ngồi ôn bài trên ghế bờ Đông Hồ Tiền nhìn ra mặt hồ sen/súng (z = 20)
  {
    id: 'sit-lake-east-1',
    pos: [22.18, 20.0],
    rotY: -Math.PI / 2,
    variant: 'tshirt',
    shirt: '#1D3557',
    shirtDark: '#12233B',
    pants: '#F4F5F7',
    skirt: true,
    hairStyle: 'ponytail',
    glasses: false,
    lanyard: true,
    backpack: false,
  },
  // 3. Nữ sinh viên mặc Sweater Kem ngồi đọc sách trên ghế giữa bờ Tây Hồ Tiền (z = 45)
  {
    id: 'sit-lake-west-2',
    pos: [-27.38, 45.0],
    rotY: Math.PI / 2,
    variant: 'sweater',
    shirt: '#ECE7DF',
    shirtDark: '#D4CDC1',
    pants: '#2B3548',
    hairStyle: 'bob',
    glasses: true,
    lanyard: true,
    backpack: false,
  },
];

function SittingStudent({ spec }: { spec: StandingSpec }) {
  const joints = useJoints();
  const isFemale = spec.hairStyle === 'ponytail' || spec.hairStyle === 'bob' || spec.hairStyle === 'bun';

  useEffect(() => {
    // Tư thế ngồi tự nhiên trên ghế gỗ (hông gập 90°, gối gập 85°, hai tay nâng cuốn sách trước ngực)
    if (joints.legL.current) joints.legL.current.rotation.x = -1.45;
    if (joints.legR.current) joints.legR.current.rotation.x = -1.45;
    if (joints.kneeL.current) joints.kneeL.current.rotation.x = 1.42;
    if (joints.kneeR.current) joints.kneeR.current.rotation.x = 1.42;
    if (joints.footL.current) joints.footL.current.rotation.x = 0.04;
    if (joints.footR.current) joints.footR.current.rotation.x = 0.04;
    if (joints.armL.current) joints.armL.current.rotation.x = -0.56;
    if (joints.armR.current) joints.armR.current.rotation.x = -0.56;
    if (joints.elbowL.current) joints.elbowL.current.rotation.x = -0.92;
    if (joints.elbowR.current) joints.elbowR.current.rotation.x = -0.92;
  }, [joints]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (joints.body.current) {
      joints.body.current.rotation.x = 0.08 + Math.sin(t * 1.1) * 0.015;
      joints.body.current.scale.y = 1 + Math.sin(t * 1.6) * 0.006;
    }
  });

  return (
    <group position={[spec.pos[0], -0.35, spec.pos[1]]} rotation-y={spec.rotY}>
      <HumanFigure
        variant={spec.variant}
        gender={isFemale ? 'female' : 'male'}
        skirt={spec.skirt}
        shirt={spec.shirt}
        shirtDark={spec.shirtDark}
        pants={spec.pants}
        shoe="#F5F5F5"
        shoeSole="#222222"
        hairStyle={spec.hairStyle}
        glasses={spec.glasses}
        lanyard={spec.lanyard}
        wristwatch
        backpack={false}
        joints={joints}
      />
      {/* Cuốn giáo trình / sách mở trên tay sinh viên đang đọc ven hồ */}
      <group position={[0, 1.02, 0.34]} rotation={[0.55, 0, 0]}>
        <mesh position={[-0.065, 0, 0]} rotation={[0, 0, 0.18]} castShadow>
          <boxGeometry args={[0.13, 0.012, 0.19]} />
          <meshStandardMaterial color="#FAF8F5" roughness={0.85} />
        </mesh>
        <mesh position={[0.065, 0, 0]} rotation={[0, 0, -0.18]} castShadow>
          <boxGeometry args={[0.13, 0.012, 0.19]} />
          <meshStandardMaterial color="#FAF8F5" roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.008, 0]}>
          <boxGeometry args={[0.26, 0.008, 0.196]} />
          <meshStandardMaterial color="#B81D24" roughness={0.75} />
        </mesh>
      </group>
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
      {SITTING_STUDENTS.map((s) => (
        <SittingStudent key={s.id} spec={s} />
      ))}
    </group>
  );
}
