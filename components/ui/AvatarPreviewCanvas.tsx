'use client';

// ---------------------------------------------------------------------------
// AvatarPreviewCanvas.tsx — Khung Xem trước 3D tách riêng (lazy-loaded)
// để màn hình EntryScreen tải & dựng giao diện tức thì mà không phải tải
// đồng bộ toàn bộ Three.js / React Three Fiber trong bundle đầu trang.
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import StudentAvatar, {
  computeNaturalGaitTargets,
  type FigureJoints,
} from '../three/StudentAvatar';
import type { CharacterProfile } from '../../lib/identity';

export type PreviewMotionMode = 'idle' | 'walk' | 'run';

function AvatarPreviewRig({
  profile,
  motion,
  yaw,
}: {
  profile: CharacterProfile;
  motion: PreviewMotionMode;
  yaw: number;
}) {
  const rootRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const armLRef = useRef<THREE.Group>(null!);
  const armRRef = useRef<THREE.Group>(null!);
  const elbowLRef = useRef<THREE.Group>(null!);
  const elbowRRef = useRef<THREE.Group>(null!);
  const legLRef = useRef<THREE.Group>(null!);
  const legRRef = useRef<THREE.Group>(null!);
  const kneeLRef = useRef<THREE.Group>(null!);
  const kneeRRef = useRef<THREE.Group>(null!);
  const footLRef = useRef<THREE.Group>(null!);
  const footRRef = useRef<THREE.Group>(null!);

  const joints: FigureJoints = {
    body: bodyRef,
    armL: armLRef,
    armR: armRRef,
    elbowL: elbowLRef,
    elbowR: elbowRRef,
    legL: legLRef,
    legR: legRRef,
    kneeL: kneeLRef,
    kneeR: kneeRRef,
    footL: footLRef,
    footR: footRRef,
  };

  const phaseRef = useRef(0);
  const blendRef = useRef(0);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const isMoving = motion === 'walk' || motion === 'run';
    const isRun = motion === 'run';
    const targetBlend = isMoving ? 1 : 0;
    blendRef.current += (targetBlend - blendRef.current) * Math.min(1, dt * 8);

    if (isMoving) {
      phaseRef.current += dt * (isRun ? 10.2 : 6.8);
    }

    const swing = isRun ? 0.62 : 0.5;
    const gait = computeNaturalGaitTargets(
      phaseRef.current,
      swing,
      blendRef.current,
      t,
      isRun,
    );
    const ease = Math.min(1, dt * 14);
    const lerpRot = (ref: React.RefObject<THREE.Group>, axis: 'x' | 'z', target: number) => {
      if (ref.current) {
        ref.current.rotation[axis] += (target - ref.current.rotation[axis]) * ease;
      }
    };

    lerpRot(legLRef, 'x', gait.legLTarget);
    lerpRot(legRRef, 'x', gait.legRTarget);
    lerpRot(kneeLRef, 'x', gait.kneeLTarget);
    lerpRot(kneeRRef, 'x', gait.kneeRTarget);
    lerpRot(footLRef, 'x', gait.footLTarget);
    lerpRot(footRRef, 'x', gait.footRTarget);
    lerpRot(armLRef, 'x', gait.armLTarget);
    lerpRot(armRRef, 'x', gait.armRTarget);
    lerpRot(elbowLRef, 'x', gait.elbowLTarget);
    lerpRot(elbowRRef, 'x', gait.elbowRTarget);
    lerpRot(bodyRef, 'x', gait.bodyLeanTarget);
    lerpRot(bodyRef, 'z', gait.bodyRollTarget);
    if (bodyRef.current) {
      bodyRef.current.position.y += (gait.bodyBobTarget - bodyRef.current.position.y) * ease;
    }
    if (rootRef.current) {
      rootRef.current.rotation.y += (yaw - rootRef.current.rotation.y) * Math.min(1, dt * 12);
    }
  });

  return (
    <group position={[0, -0.88, 0]}>
      {/* Bệ đứng tròn Bách Khoa trong phòng thử đồ 3D */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.52, 0.58, 0.08, 32]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.45, 0.49, 32]} />
        <meshBasicMaterial color="#FACC15" />
      </mesh>
      <group ref={rootRef} rotation-y={yaw}>
        <StudentAvatar
          joints={joints}
          showBackpack={profile.backpack}
          gender={profile.gender}
          hairStyle={profile.hairStyle}
          outfit={profile.outfit}
          skirt={profile.skirt}
          glasses={profile.glasses}
          lanyard={profile.lanyard}
          gradCap={profile.gradCap}
          heldDrink={profile.heldDrink}
        />
      </group>
    </group>
  );
}

export default function AvatarPreviewCanvas({
  profile,
  motion,
  yaw,
}: {
  profile: CharacterProfile;
  motion: PreviewMotionMode;
  yaw: number;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.12, 2.35], fov: 38 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={1.15} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.35} />
      <directionalLight position={[-2.5, 2, -2]} intensity={0.55} color="#93C5FD" />
      <AvatarPreviewRig profile={profile} motion={motion} yaw={yaw} />
    </Canvas>
  );
}
