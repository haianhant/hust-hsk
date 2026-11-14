'use client';

// ---------------------------------------------------------------------------
// features/campus/atmosphere/CampusAtmosphereFX.tsx — Hiệu ứng không gian
// sống động ĐHBK Hà Nội:
//   - Lá vàng mùa thu rơi lững lờ (Ban ngày & Hoàng hôn) trên các trục dạo bộ
//   - Đom đóm phát sáng lơ lửng quanh mặt & bờ Hồ Tiền (Ban đêm)
//   - Đàn chim bồ câu Quảng trường C1 vỗ cánh bay vòng khi người chơi lại gần
// Module ID: feature.campus.atmosphere
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCampusGroundElevation } from '../../../lib/campus';
import { playerState, type TimeOfDay } from '../../../lib/playerState';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEAF_COUNT = 72;
const FIREFLY_COUNT = 44;
const PIGEON_COUNT = 8;

type LeafDatum = {
  baseX: number;
  baseZ: number;
  startY: number;
  fallSpeed: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  scale: number;
  colorHex: string;
};

type FireflyDatum = {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
  driftR: number;
};

type PigeonRuntime = {
  homeX: number;
  homeZ: number;
  baseYaw: number;
  peckPhase: number;
  flightRemain: number;
  flightOrbitOffset: number;
};

const LEAF_ZONES: ReadonlyArray<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [
  { minX: -68, maxX: -42, minZ: -50, maxZ: -26 }, // Quảng trường C1
  { minX: -44, maxX: 20, minZ: -15, maxZ: -5 },   // Đường Tình Yêu
  { minX: 17, maxX: 28, minZ: 36, maxZ: 82 },     // Dạo bộ Đông Hồ Tiền
  { minX: -78, maxX: -56, minZ: -16, maxZ: 10 },  // Vườn cây Cổng Parabol
];

const LEAF_PALETTE = ['#FBBF24', '#F59E0B', '#EA580C', '#D97706'] as const;

const PIGEON_HOMES: ReadonlyArray<{ x: number; z: number; yaw: number }> = [
  { x: -62.2, z: -33.4, yaw: 0.4 },
  { x: -61.3, z: -32.7, yaw: 1.9 },
  { x: -62.9, z: -32.3, yaw: -0.9 },
  { x: -61.6, z: -33.9, yaw: 2.6 },
  { x: -47.4, z: -34.2, yaw: -2.1 },
  { x: -46.5, z: -33.6, yaw: 0.8 },
  { x: -47.9, z: -33.1, yaw: 2.3 },
  { x: -46.8, z: -34.8, yaw: -0.4 },
];

export default function CampusAtmosphereFX({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const leafMeshRef = useRef<THREE.InstancedMesh>(null);
  const fireflyMeshRef = useRef<THREE.InstancedMesh>(null);
  const pigeonRootRefs = useRef<Array<THREE.Group | null>>([]);
  const pigeonWingLRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pigeonWingRRefs = useRef<Array<THREE.Mesh | null>>([]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const leaves = useMemo<LeafDatum[]>(() => {
    const rng = mulberry32(20261114);
    const out: LeafDatum[] = [];
    for (let i = 0; i < LEAF_COUNT; i++) {
      const z = LEAF_ZONES[i % LEAF_ZONES.length];
      out.push({
        baseX: z.minX + rng() * (z.maxX - z.minX),
        baseZ: z.minZ + rng() * (z.maxZ - z.minZ),
        startY: 0.2 + rng() * 7.8,
        fallSpeed: 0.48 + rng() * 0.42,
        swayAmp: 0.45 + rng() * 0.6,
        swayFreq: 0.9 + rng() * 0.9,
        phase: rng() * Math.PI * 2,
        scale: 0.8 + rng() * 0.65,
        colorHex: LEAF_PALETTE[Math.floor(rng() * LEAF_PALETTE.length)],
      });
    }
    return out;
  }, []);

  const fireflies = useMemo<FireflyDatum[]>(() => {
    const rng = mulberry32(778899);
    const out: FireflyDatum[] = [];
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      // Tập trung quanh bờ và mặt nước Hồ Tiền (x: -20..23, z: 38..86)
      out.push({
        x: -20 + rng() * 43,
        y: 0.45 + rng() * 1.9,
        z: 38 + rng() * 48,
        phase: rng() * Math.PI * 2,
        speed: 1.1 + rng() * 1.6,
        driftR: 0.55 + rng() * 0.85,
      });
    }
    return out;
  }, []);

  const pigeonsRef = useRef<PigeonRuntime[]>(
    PIGEON_HOMES.slice(0, PIGEON_COUNT).map((h, idx) => ({
      homeX: h.x,
      homeZ: h.z,
      baseYaw: h.yaw,
      peckPhase: idx * 0.9,
      flightRemain: 0,
      flightOrbitOffset: (idx / PIGEON_COUNT) * Math.PI * 2,
    })),
  );

  // Shared Geometries & Materials with explicit unmount cleanup
  const leafAssets = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.16, 0.09);
    const mat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.72,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    return { geo, mat };
  }, []);

  const fireflyAssets = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.055, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: '#FEF08A',
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    return { geo, mat };
  }, []);

  const pigeonAssets = useMemo(() => {
    const bodyGeo = new THREE.SphereGeometry(0.095, 8, 6);
    bodyGeo.scale(0.85, 0.78, 1.35);
    const headGeo = new THREE.SphereGeometry(0.052, 8, 6);
    const beakGeo = new THREE.ConeGeometry(0.016, 0.045, 5);
    const wingGeo = new THREE.BoxGeometry(0.18, 0.016, 0.095);
    const tailGeo = new THREE.BoxGeometry(0.07, 0.014, 0.09);

    const bodyMat = new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.82 });
    const neckMat = new THREE.MeshStandardMaterial({ color: '#64748B', roughness: 0.72 });
    const beakMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.65 });
    const wingMat = new THREE.MeshStandardMaterial({ color: '#94A3B8', roughness: 0.78 });

    return {
      geos: [bodyGeo, headGeo, beakGeo, wingGeo, tailGeo] as const,
      mats: [bodyMat, neckMat, beakMat, wingMat] as const,
      bodyGeo,
      headGeo,
      beakGeo,
      wingGeo,
      tailGeo,
      bodyMat,
      neckMat,
      beakMat,
      wingMat,
    };
  }, []);

  useEffect(() => {
    const mesh = leafMeshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < leaves.length; i++) {
      c.set(leaves[i].colorHex);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [leaves]);

  useEffect(() => {
    return () => {
      leafAssets.geo.dispose();
      leafAssets.mat.dispose();
      fireflyAssets.geo.dispose();
      fireflyAssets.mat.dispose();
      pigeonAssets.geos.forEach((g) => g.dispose());
      pigeonAssets.mats.forEach((m) => m.dispose());
    };
  }, [leafAssets, fireflyAssets, pigeonAssets]);

  const showLeaves = timeOfDay !== 'night';
  const showFireflies = timeOfDay === 'night';

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;

    // 1) Lá vàng mùa thu rơi lững lờ
    const leafMesh = leafMeshRef.current;
    if (leafMesh) {
      leafMesh.visible = showLeaves;
      if (showLeaves) {
        for (let i = 0; i < leaves.length; i++) {
          const l = leaves[i];
          const span = 8.0;
          const y = 0.08 + (((l.startY - t * l.fallSpeed) % span + span) % span);
          const x = l.baseX + Math.sin(t * l.swayFreq + l.phase) * l.swayAmp;
          const z = l.baseZ + Math.cos(t * l.swayFreq * 0.8 + l.phase) * l.swayAmp;
          dummy.position.set(x, y, z);
          dummy.rotation.set(
            Math.sin(t * 1.4 + l.phase) * 0.7,
            t * 0.9 + l.phase,
            Math.cos(t * 1.2 + l.phase) * 0.6,
          );
          dummy.scale.setScalar(l.scale);
          dummy.updateMatrix();
          leafMesh.setMatrixAt(i, dummy.matrix);
        }
        leafMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 2) Đom đóm Hồ Tiền ban đêm
    const flyMesh = fireflyMeshRef.current;
    if (flyMesh) {
      flyMesh.visible = showFireflies;
      if (showFireflies) {
        for (let i = 0; i < fireflies.length; i++) {
          const f = fireflies[i];
          const px = f.x + Math.cos(t * 0.55 + f.phase) * f.driftR;
          const pz = f.z + Math.sin(t * 0.48 + f.phase * 1.3) * f.driftR;
          const py = f.y + Math.sin(t * f.speed + f.phase) * 0.32;
          const pulse = 0.35 + 0.85 * (0.5 + 0.5 * Math.sin(t * f.speed * 2.2 + f.phase));
          dummy.position.set(px, py, pz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(pulse);
          dummy.updateMatrix();
          flyMesh.setMatrixAt(i, dummy.matrix);
        }
        flyMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 3) Đàn chim bồ câu Quảng trường C1: đi bộ nhặt thóc, bay vút lên khi người chơi lại gần
    const playerX = playerState.pos.x;
    const playerZ = playerState.pos.z;
    const pigeons = pigeonsRef.current;
    for (let i = 0; i < pigeons.length; i++) {
      const p = pigeons[i];
      const root = pigeonRootRefs.current[i];
      if (!root) continue;

      const distToHome = Math.hypot(playerX - p.homeX, playerZ - p.homeZ);
      if (distToHome < 3.8 && p.flightRemain < 4.5) {
        p.flightRemain = 6.2;
      }
      if (p.flightRemain > 0) {
        p.flightRemain = Math.max(0, p.flightRemain - dt);
      }

      const groundY = getCampusGroundElevation(p.homeX, p.homeZ);
      if (p.flightRemain > 0) {
        const progress = p.flightRemain / 6.2;
        const arc = Math.sin(Math.min(1, progress) * Math.PI);
        const orbitAngle = t * 1.65 + p.flightOrbitOffset;
        const radius = 2.6 + (i % 3) * 0.85;
        const fx = p.homeX + Math.cos(orbitAngle) * radius * arc;
        const fz = p.homeZ + Math.sin(orbitAngle) * radius * arc;
        const fy = groundY + 0.1 + arc * (5.2 + (i % 3) * 0.7);
        root.position.set(fx, fy, fz);
        root.rotation.set(-0.22 * arc, -orbitAngle, 0);

        const flap = Math.sin(t * 22 + i) * 0.95;
        const wL = pigeonWingLRefs.current[i];
        const wR = pigeonWingRRefs.current[i];
        if (wL) wL.rotation.z = flap;
        if (wR) wR.rotation.z = -flap;
      } else {
        const wanderX = p.homeX + Math.sin(t * 0.45 + p.peckPhase) * 0.42;
        const wanderZ = p.homeZ + Math.cos(t * 0.42 + p.peckPhase) * 0.42;
        const peckBob = Math.max(0, Math.sin(t * 3.8 + p.peckPhase)) * 0.04;
        root.position.set(wanderX, groundY + 0.085, wanderZ);
        root.rotation.set(peckBob * 3.2, p.baseYaw + Math.sin(t * 0.6 + p.peckPhase) * 0.5, 0);
        const wL = pigeonWingLRefs.current[i];
        const wR = pigeonWingRRefs.current[i];
        if (wL) wL.rotation.z = 0.08;
        if (wR) wR.rotation.z = -0.08;
      }
    }
  });

  return (
    <group name="CampusAtmosphereFX">
      <instancedMesh
        ref={leafMeshRef}
        args={[leafAssets.geo, leafAssets.mat, LEAF_COUNT]}
        frustumCulled={false}
        visible={showLeaves}
      />
      <instancedMesh
        ref={fireflyMeshRef}
        args={[fireflyAssets.geo, fireflyAssets.mat, FIREFLY_COUNT]}
        frustumCulled={false}
        visible={showFireflies}
      />
      <group name="C1PlazaPigeons">
        {PIGEON_HOMES.slice(0, PIGEON_COUNT).map((h, i) => (
          <group
            key={`pigeon-${i}`}
            ref={(el) => {
              pigeonRootRefs.current[i] = el;
            }}
            position={[h.x, 0.085, h.z]}
            rotation={[0, h.yaw, 0]}
          >
            <mesh geometry={pigeonAssets.bodyGeo} material={pigeonAssets.bodyMat} castShadow />
            <mesh
              position={[0, 0.075, 0.095]}
              geometry={pigeonAssets.headGeo}
              material={pigeonAssets.neckMat}
            />
            <mesh
              position={[0, 0.072, 0.145]}
              rotation={[Math.PI / 2, 0, 0]}
              geometry={pigeonAssets.beakGeo}
              material={pigeonAssets.beakMat}
            />
            <mesh
              position={[0, 0.015, -0.13]}
              rotation={[0.25, 0, 0]}
              geometry={pigeonAssets.tailGeo}
              material={pigeonAssets.neckMat}
            />
            <mesh
              ref={(el) => {
                pigeonWingLRefs.current[i] = el;
              }}
              position={[0.11, 0.02, 0]}
              geometry={pigeonAssets.wingGeo}
              material={pigeonAssets.wingMat}
            />
            <mesh
              ref={(el) => {
                pigeonWingRRefs.current[i] = el;
              }}
              position={[-0.11, 0.02, 0]}
              geometry={pigeonAssets.wingGeo}
              material={pigeonAssets.wingMat}
            />
          </group>
        ))}
      </group>
    </group>
  );
}
