// ---------------------------------------------------------------------------
// CampusScene.tsx — scene gốc Bước 2: Canvas + trời/sáng + Ground/Landmarks/Player
// Không dùng drei Text, không tải font/texture ngoài, không dùng <Sky> nặng.
// Bước 5: thêm mode phòng học mô phỏng — khi inClassroom thì render
// <Classroom/> thay cho Ground/Landmarks (+ NPC Minh chỉ ở campus).
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Ground from './Ground';
import Landmarks from './Landmarks';
import Player from './Player';
import RemotePlayers from './RemotePlayers';
import Classroom, { type HomeworkState } from './Classroom';
import LibraryLobby from './LibraryLobby';
import { MinhNpc } from './Npc';
import BackgroundBuildings from './BackgroundBuildings';
import CampusExpansion from './CampusExpansion';
import AmbientLife from './AmbientLife';
import Motorbike from './Motorbike';
import type { TimeOfDay } from '../../lib/playerState';

export interface CampusSceneProps {
  inClassroom?: boolean;
  inLibraryLobby?: boolean;
  timeOfDay?: TimeOfDay;
  notebookOpen?: boolean;
  homework?: HomeworkState;
  onObjectClick?: (id: string) => void;
}

const ATMOSPHERE: Record<
  TimeOfDay,
  {
    bg: string;
    fogColor: string;
    fogNear: number;
    fogFar: number;
    hemiSky: string;
    hemiGround: string;
    hemiIntensity: number;
    sunPos: [number, number, number];
    sunColor: string;
    sunIntensity: number;
    westFillColor: string;
    westFillIntensity: number;
    southFillColor: string;
    southFillIntensity: number;
    northFillColor: string;
    northFillIntensity: number;
  }
> = {
  day: {
    bg: '#cfe0ec',
    fogColor: '#dce8ef',
    fogNear: 180,
    fogFar: 520,
    hemiSky: '#dceefb',
    hemiGround: '#8a9a72',
    hemiIntensity: 1.3,
    sunPos: [80, 100, 40],
    sunColor: '#ffffff',
    sunIntensity: 1.6,
    westFillColor: '#ffffff',
    westFillIntensity: 0.7,
    southFillColor: '#fff2df',
    southFillIntensity: 0.3,
    northFillColor: '#ffffff',
    northFillIntensity: 0.5,
  },
  sunset: {
    bg: '#dfa074',
    fogColor: '#e2ab82',
    fogNear: 165,
    fogFar: 500,
    hemiSky: '#ffd4a3',
    hemiGround: '#6e5a4f',
    hemiIntensity: 1.15,
    sunPos: [-95, 42, 18],
    sunColor: '#ff9e58',
    sunIntensity: 1.55,
    westFillColor: '#ffb87a',
    westFillIntensity: 0.65,
    southFillColor: '#ffd9b3',
    southFillIntensity: 0.35,
    northFillColor: '#e8c3a8',
    northFillIntensity: 0.48,
  },
  night: {
    bg: '#131d31',
    fogColor: '#17233b',
    fogNear: 160,
    fogFar: 480,
    hemiSky: '#4a6696',
    hemiGround: '#253028',
    hemiIntensity: 0.82,
    sunPos: [-60, 95, -35],
    sunColor: '#b8d0ff',
    sunIntensity: 0.72,
    westFillColor: '#7694c4',
    westFillIntensity: 0.42,
    southFillColor: '#FFE0A3',
    southFillIntensity: 0.28,
    northFillColor: '#88a4d4',
    northFillIntensity: 0.4,
  },
};

// --- Bầu trời sao & mặt trăng/mặt trời chiều + đèn sân trường ban đêm ----------
function SkyAtmosphereAndNightLights({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 260;
    const positions = new Float32Array(count * 3);
    let seed = 20261108;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      const theta = rnd() * Math.PI * 2;
      const phi = 0.12 + rnd() * (Math.PI * 0.36);
      const r = 340;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useEffect(() => () => starGeo.dispose(), [starGeo]);

  if (timeOfDay === 'day') return null;

  return (
    <group>
      {/* Đĩa mặt trời hoàng hôn hướng tây (phía cổng Parabol / đường Giải Phóng) */}
      {timeOfDay === 'sunset' && (
        <mesh position={[-240, 68, 25]}>
          <sphereGeometry args={[14, 24, 20]} />
          <meshBasicMaterial color="#FFB067" fog={false} />
        </mesh>
      )}

      {/* Bầu trời sao + mặt trăng sáng dịu khi về đêm */}
      {timeOfDay === 'night' && (
        <>
          <points geometry={starGeo}>
            <pointsMaterial color="#E8F1FF" size={1.8} sizeAttenuation={false} fog={false} />
          </points>
          <mesh position={[-160, 185, -110]}>
            <sphereGeometry args={[9.5, 24, 20]} />
            <meshBasicMaterial color="#F4F8FF" fog={false} />
          </mesh>
        </>
      )}

      {/* Hệ thống đèn chiếu sáng khuôn viên Bách khoa khi Hoàng hôn & Đêm */}
      <pointLight
        position={[-84, 7.5, 10]}
        color="#FFD892"
        intensity={timeOfDay === 'night' ? 2.4 : 1.1}
        distance={36}
      />
      <pointLight
        position={[-58, 8.5, -42]}
        color="#FFE0A6"
        intensity={timeOfDay === 'night' ? 2.8 : 1.2}
        distance={44}
      />
      <pointLight
        position={[38, 9.0, 18]}
        color="#FFE0A6"
        intensity={timeOfDay === 'night' ? 3.0 : 1.3}
        distance={46}
      />
      <pointLight
        position={[-30, 6.5, -2]}
        color="#FFD48A"
        intensity={timeOfDay === 'night' ? 2.0 : 0.9}
        distance={32}
      />
      <pointLight
        position={[24, 5.5, 36]}
        color="#FFD892"
        intensity={timeOfDay === 'night' ? 2.2 : 0.9}
        distance={40}
      />
      <pointLight
        position={[0, 5.5, -16]}
        color="#FFD892"
        intensity={timeOfDay === 'night' ? 2.0 : 0.85}
        distance={38}
      />
    </group>
  );
}

export default function CampusScene({
  inClassroom = false,
  inLibraryLobby = false,
  timeOfDay = 'day',
  notebookOpen = false,
  homework = 'desk',
  onObjectClick,
}: CampusSceneProps) {
  const atm = ATMOSPHERE[timeOfDay] ?? ATMOSPHERE.day;
  const isIndoor = inClassroom || inLibraryLobby;
  const activeAtm = isIndoor ? ATMOSPHERE.day : atm;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 55, near: 0.1, far: 600, position: [-70, 10, 26] }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <color attach="background" args={[activeAtm.bg]} />
      <fog attach="fog" args={[activeAtm.fogColor, activeAtm.fogNear, activeAtm.fogFar]} />

      <hemisphereLight args={[activeAtm.hemiSky, activeAtm.hemiGround, activeAtm.hemiIntensity]} />
      <directionalLight
        position={activeAtm.sunPos}
        color={activeAtm.sunColor}
        intensity={activeAtm.sunIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
      <directionalLight
        position={[-60, 40, -20]}
        color={activeAtm.westFillColor}
        intensity={activeAtm.westFillIntensity}
      />
      <directionalLight
        position={[10, 30, 90]}
        color={activeAtm.southFillColor}
        intensity={activeAtm.southFillIntensity}
      />
      <directionalLight
        position={[0, 40, -90]}
        color={activeAtm.northFillColor}
        intensity={activeAtm.northFillIntensity}
      />

      {inClassroom ? (
        <Classroom
          notebookOpen={notebookOpen}
          homework={homework}
          onObjectClick={onObjectClick ?? (() => undefined)}
        />
      ) : inLibraryLobby ? (
        <LibraryLobby onObjectClick={onObjectClick} />
      ) : (
        <>
          <SkyAtmosphereAndNightLights timeOfDay={timeOfDay} />
          <Ground />
          <Landmarks />
          {/* Khối nhà phụ + cây nền + ghế/đèn rìa campus (đợt sửa lần 2 §4).
              Đã gắn ở đây — luồng tích hợp KHÔNG gắn lần 2. */}
          <BackgroundBuildings />
          {/* Mở rộng toàn bộ khuôn viên Bách khoa (Wave 2: C7, VDZ, Khu Thể thao, KTX B6–B10, Cổng Nam, Tường rào). */}
          <CampusExpansion />
          {/* Quần thể sinh viên NPC đi dạo & sinh hoạt trong sân trường. */}
          <AmbientLife />
          {/* NPC bạn đồng hành Minh đứng gần cổng Parabol, gần spawn. */}
          <MinhNpc />
          {/* Xe máy cá nhân (đợt 3 giai đoạn 4) — chỉ ngoài sân, không vào phòng học. */}
          <Motorbike />
          {/* Người chơi khác (đợt 5 multiplayer) — chỉ ngoài sân. */}
          <RemotePlayers />
        </>
      )}
      <Player />
    </Canvas>
  );
}
