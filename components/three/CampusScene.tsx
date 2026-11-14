// ---------------------------------------------------------------------------
// CampusScene.tsx — scene gốc Bước 2: Canvas + trời/sáng + Ground/Landmarks/Player
// Không dùng drei Text, không tải font/texture ngoài, không dùng <Sky> nặng.
// Bước 5: thêm mode phòng học mô phỏng — khi inClassroom thì render
// <Classroom/> thay cho Ground/Landmarks (+ NPC Minh chỉ ở campus).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
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
import CampusCheckinMarkers from '../../features/campus/checkin/CampusCheckinMarkers';
import CampusAtmosphereFX from '../../features/campus/atmosphere/CampusAtmosphereFX';
import CampusInteractiveLife from '../../features/campus/interactive/CampusInteractiveLife';
import { makeCloudPuffTexture, makeSkyEnvEquirectTexture, makeSunHaloTexture } from './materials';
import { libraryNavigationController } from '../../lib/campus';
import { playerState, type TimeOfDay } from '../../lib/playerState';

declare global {
  interface Window {
    __bkhnCaptureCanvas?: () => string;
  }
}

function PhotoCaptureBridge() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    window.__bkhnCaptureCanvas = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    };
    return () => {
      delete window.__bkhnCaptureCanvas;
    };
  }, [gl, scene, camera]);

  return null;
}

export interface CampusSceneProps {
  inClassroom?: boolean;
  inLibraryLobby?: boolean;
  activeSeatId?: string | null;
  nearestSeatId?: string | null;
  timeOfDay?: TimeOfDay;
  hskMode?: boolean;
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
    hemiIntensity: 1.24,
    sunPos: [80, 100, 40],
    sunColor: '#ffffff',
    sunIntensity: 1.68,
    westFillColor: '#ffffff',
    westFillIntensity: 0.52,
    southFillColor: '#fff2df',
    southFillIntensity: 0.28,
    northFillColor: '#ffffff',
    northFillIntensity: 0.38,
  },
  sunset: {
    bg: '#dfa074',
    fogColor: '#e2ab82',
    fogNear: 165,
    fogFar: 500,
    hemiSky: '#ffd4a3',
    hemiGround: '#7a6355',
    hemiIntensity: 1.22,
    sunPos: [-95, 42, 18],
    sunColor: '#ff9e58',
    sunIntensity: 1.72,
    westFillColor: '#ffb87a',
    westFillIntensity: 0.58,
    southFillColor: '#ffd9b3',
    southFillIntensity: 0.36,
    northFillColor: '#e8c3a8',
    northFillIntensity: 0.42,
  },
  night: {
    bg: '#131d31',
    fogColor: '#17233b',
    fogNear: 160,
    fogFar: 480,
    hemiSky: '#5876ab',
    hemiGround: '#2e3b32',
    hemiIntensity: 0.96,
    sunPos: [-60, 95, -35],
    sunColor: '#b8d0ff',
    sunIntensity: 0.85,
    westFillColor: '#7694c4',
    westFillIntensity: 0.52,
    southFillColor: '#FFE0A3',
    southFillIntensity: 0.42,
    northFillColor: '#88a4d4',
    northFillIntensity: 0.48,
  },
};

const INDOOR_ATMOSPHERE: Record<TimeOfDay, (typeof ATMOSPHERE)['day']> = {
  day: ATMOSPHERE.day,
  sunset: {
    ...ATMOSPHERE.day,
    bg: '#dfa074',
    fogColor: '#e6b896',
    hemiSky: '#ffe0bd',
    hemiGround: '#8a6f5a',
    hemiIntensity: 1.18,
    sunPos: [48, 32, -8],
    sunColor: '#ffb26b',
    sunIntensity: 1.35,
    westFillColor: '#ffd6ad',
    westFillIntensity: 0.52,
    southFillColor: '#ffe7c8',
    southFillIntensity: 0.36,
    northFillColor: '#f5dfc8',
    northFillIntensity: 0.42,
  },
  night: {
    ...ATMOSPHERE.day,
    bg: '#131d31',
    fogColor: '#1b263b',
    hemiSky: '#d8e2f5',
    hemiGround: '#6b5b4b',
    hemiIntensity: 1.05,
    sunPos: [18, 65, 16],
    sunColor: '#ffe9c4',
    sunIntensity: 0.95,
    westFillColor: '#d9e3f2',
    westFillIntensity: 0.48,
    southFillColor: '#ffe4b8',
    southFillIntensity: 0.46,
    northFillColor: '#dce6f8',
    northFillIntensity: 0.48,
  },
};

// --- Bầu trời mây 3D trôi nhẹ + sao & mặt trăng/mặt trời chiều + đèn sân trường ---
const CLOUD_CLUSTERS: Array<{ x: number; y: number; z: number; scale: number; speed: number }> = [
  { x: -110, y: 115, z: -140, scale: 1.2, speed: 0.9 },
  { x: -35, y: 128, z: -165, scale: 1.45, speed: 0.7 },
  { x: 55, y: 118, z: -135, scale: 1.15, speed: 1.0 },
  { x: 135, y: 122, z: -110, scale: 1.35, speed: 0.8 },
  { x: -95, y: 120, z: 125, scale: 1.25, speed: 0.85 },
  { x: 25, y: 130, z: 145, scale: 1.5, speed: 0.65 },
  { x: 120, y: 116, z: 115, scale: 1.1, speed: 0.95 },
];

function isSoftwareWebGLRenderer(gl: THREE.WebGLRenderer): boolean {
  try {
    const ctx = gl.getContext();
    if (!ctx) return false;
    const debugInfo = ctx.getExtension('WEBGL_debug_renderer_info');
    const unmasked = debugInfo
      ? String(ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '')
      : '';
    const glRenderer = String(ctx.getParameter(ctx.RENDERER) ?? '');
    return /swiftshader|llvmpipe|software|basic render/i.test(`${unmasked} ${glRenderer}`);
  } catch {
    return false;
  }
}

/**
 * Tạo bản đồ phản xạ môi trường vật lý (IBL — Image-Based Lighting) bằng THREE.PMREMGenerator
 * từ texture Equirectangular tự sinh để mọi mặt kính, mặt nước Hồ Tiền, kim loại có phản chiếu chân thực.
 */
function ProceduralEnvironment({
  timeOfDay,
  enabled,
}: {
  timeOfDay: TimeOfDay;
  enabled: boolean;
}) {
  const { gl, scene } = useThree();

  useEffect(() => {
    if (!enabled) {
      scene.environment = null;
      return;
    }

    const equirect = makeSkyEnvEquirectTexture(timeOfDay);
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envTarget = pmrem.fromEquirectangular(equirect);

    scene.environment = envTarget.texture;
    if ('environmentIntensity' in scene) {
      (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity =
        timeOfDay === 'night' ? 0.3 : 0.55;
    }

    return () => {
      if (scene.environment === envTarget.texture) {
        scene.environment = null;
      }
      envTarget.dispose();
      equirect.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, timeOfDay, enabled]);

  return null;
}

function SkyAtmosphereAndNightLights({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const cloudsRef = useRef<THREE.Group>(null!);
  const skyDomeTex = useMemo(() => makeSkyEnvEquirectTexture(timeOfDay), [timeOfDay]);
  const sunHaloTex = useMemo(() => makeSunHaloTexture(), []);
  const cloudPuffTex = useMemo(() => makeCloudPuffTexture(), []);
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

  useEffect(
    () => () => {
      starGeo.dispose();
      skyDomeTex.dispose();
      sunHaloTex.dispose();
      cloudPuffTex.dispose();
    },
    [starGeo, skyDomeTex, sunHaloTex, cloudPuffTex],
  );

  useFrame(({ clock }) => {
    if (!cloudsRef.current) return;
    const t = clock.getElapsedTime();
    cloudsRef.current.position.x = Math.sin(t * 0.03) * 14;
  });

  const cloudColor =
    timeOfDay === 'day' ? '#F8FBFF' : timeOfDay === 'sunset' ? '#FFD2B3' : '#2C3E5A';
  const cloudOpacity = timeOfDay === 'night' ? 0.32 : timeOfDay === 'sunset' ? 0.72 : 0.84;

  return (
    <group>
      {/* Vòm trời chuyển sắc 3D (SkyDome) từ thiên đỉnh xuống đường chân trời */}
      <mesh position={[0, -10, 0]} scale={[-1, 1, 1]}>
        <sphereGeometry args={[460, 32, 20]} />
        <meshBasicMaterial map={skyDomeTex} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      {/* Đĩa Mặt trời + Hào quang Corona ban ngày */}
      {timeOfDay === 'day' && (
        <group position={[180, 210, 90]}>
          <mesh>
            <sphereGeometry args={[11, 20, 16]} />
            <meshBasicMaterial color="#FFFDF2" fog={false} />
          </mesh>
          <Billboard>
            <mesh>
              <planeGeometry args={[68, 68]} />
              <meshBasicMaterial
                map={sunHaloTex}
                color="#FFF5D6"
                transparent
                opacity={0.75}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                fog={false}
              />
            </mesh>
          </Billboard>
        </group>
      )}

      {/* Các cụm mây bông mềm (Billboards xếp lớp mượt, không lộ ngấn giao cắt hình cầu) */}
      <group ref={cloudsRef}>
        {CLOUD_CLUSTERS.map((c, idx) => (
          <group key={`cloud-${idx}`} position={[c.x, c.y, c.z]} scale={c.scale}>
            {[
              { x: 0, y: 0, z: 0, w: 30, h: 17, op: 1.0 },
              { x: -10, y: -1.6, z: 1.8, w: 22, h: 13.5, op: 0.9 },
              { x: 10.5, y: -1.4, z: -1.4, w: 23, h: 14, op: 0.9 },
              { x: 2.2, y: 3.4, z: 0.5, w: 20, h: 13, op: 0.85 },
            ].map((p, pIdx) => (
              <Billboard key={`puff-${idx}-${pIdx}`} position={[p.x, p.y, p.z]}>
                <mesh>
                  <planeGeometry args={[p.w, p.h]} />
                  <meshBasicMaterial
                    map={cloudPuffTex}
                    color={cloudColor}
                    transparent
                    opacity={cloudOpacity * p.op}
                    depthWrite={false}
                    fog={false}
                  />
                </mesh>
              </Billboard>
            ))}
          </group>
        ))}
      </group>

      {timeOfDay !== 'day' && (
        <>
          {/* Đĩa mặt trời hoàng hôn hướng tây (phía cổng Parabol / đường Giải Phóng) + Hào quang cam ấm */}
          {timeOfDay === 'sunset' && (
            <group position={[-240, 68, 25]}>
              <mesh>
                <sphereGeometry args={[14, 24, 20]} />
                <meshBasicMaterial color="#FFB067" fog={false} />
              </mesh>
              <Billboard>
                <mesh>
                  <planeGeometry args={[86, 86]} />
                  <meshBasicMaterial
                    map={sunHaloTex}
                    color="#FF944D"
                    transparent
                    opacity={0.82}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    fog={false}
                  />
                </mesh>
              </Billboard>
            </group>
          )}

          {/* Bầu trời sao + mặt trăng sáng dịu có quầng trăng khi về đêm */}
          {timeOfDay === 'night' && (
            <>
              <points geometry={starGeo}>
                <pointsMaterial color="#E8F1FF" size={1.8} sizeAttenuation={false} fog={false} />
              </points>
              <group position={[-160, 185, -110]}>
                <mesh>
                  <sphereGeometry args={[9.5, 24, 20]} />
                  <meshBasicMaterial color="#F4F8FF" fog={false} />
                </mesh>
                <Billboard>
                  <mesh>
                    <planeGeometry args={[52, 52]} />
                    <meshBasicMaterial
                      map={sunHaloTex}
                      color="#B8D4FF"
                      transparent
                      opacity={0.58}
                      depthWrite={false}
                      blending={THREE.AdditiveBlending}
                      fog={false}
                    />
                  </mesh>
                </Billboard>
              </group>
            </>
          )}
        </>
      )}
    </group>
  );
}

/**
 * Đèn mặt trời bám theo người chơi trên lưới 2 m (triệt tiêu rung mép bóng)
 * thu hẹp frustum shadow-map từ 315×240 m xuống ±46 m -> bóng đổ sắc nét ~4×
 * mà không tốn thêm 1 byte VRAM hay draw call nào.
 */
function PlayerCenteredSunLight({
  atm,
  isIndoor,
}: {
  atm: (typeof ATMOSPHERE)['day'];
  isIndoor: boolean;
}) {
  const { gl } = useThree();
  const lightRef = useRef<THREE.DirectionalLight>(null!);
  const targetObj = useMemo(() => new THREE.Object3D(), []);
  const softwareRef = useRef<boolean | null>(null);
  const frameCountRef = useRef(0);
  const lastSnapRef = useRef<{ x: number; z: number; sx: number; sy: number; sz: number }>({
    x: Number.NaN,
    z: Number.NaN,
    sx: Number.NaN,
    sy: Number.NaN,
    sz: Number.NaN,
  });

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    const half = isIndoor ? 24 : 46;
    const cam = light.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 8;
    cam.far = 240;
    cam.updateProjectionMatrix();
    lastSnapRef.current.x = Number.NaN;

    const isSoft = softwareRef.current ?? isSoftwareWebGLRenderer(gl);
    softwareRef.current = isSoft;
    if (isSoft) {
      gl.shadowMap.type = THREE.PCFShadowMap;
      gl.shadowMap.autoUpdate = false;
      if (light.shadow.mapSize.width !== 1024 || light.shadow.mapSize.height !== 1024) {
        light.shadow.mapSize.set(1024, 1024);
        if (light.shadow.map) {
          light.shadow.map.dispose();
          light.shadow.map = null;
        }
      }
      gl.shadowMap.needsUpdate = !isIndoor;
    } else {
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      gl.shadowMap.autoUpdate = true;
      if (light.shadow.mapSize.width !== 2048 || light.shadow.mapSize.height !== 2048) {
        light.shadow.mapSize.set(2048, 2048);
        if (light.shadow.map) {
          light.shadow.map.dispose();
          light.shadow.map = null;
        }
      }
    }
  }, [gl, isIndoor, atm.sunPos]);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const snapX = isIndoor ? 0 : Math.round(playerState.pos.x / 2) * 2;
    const snapZ = isIndoor ? 0 : Math.round(playerState.pos.z / 2) * 2;
    const [ox, oy, oz] = atm.sunPos;
    const prev = lastSnapRef.current;
    const movedSnap =
      prev.x !== snapX || prev.z !== snapZ || prev.sx !== ox || prev.sy !== oy || prev.sz !== oz;
    if (movedSnap) {
      prev.x = snapX;
      prev.z = snapZ;
      prev.sx = ox;
      prev.sy = oy;
      prev.sz = oz;
      light.position.set(snapX + ox, oy, snapZ + oz);
      targetObj.position.set(snapX, 0, snapZ);
      targetObj.updateMatrixWorld();
    }
    if (softwareRef.current && !isIndoor) {
      frameCountRef.current += 1;
      if (movedSnap || frameCountRef.current % 10 === 0) {
        gl.shadowMap.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <primitive object={targetObj} />
      <directionalLight
        ref={lightRef}
        target={targetObj}
        position={atm.sunPos}
        color={atm.sunColor}
        intensity={atm.sunIntensity}
        castShadow={!isIndoor}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-46}
        shadow-camera-right={46}
        shadow-camera-top={46}
        shadow-camera-bottom={-46}
        shadow-camera-near={8}
        shadow-camera-far={240}
        shadow-bias={-0.00025}
        shadow-normalBias={0.022}
      />
    </>
  );
}

export default function CampusScene({
  inClassroom = false,
  inLibraryLobby = false,
  activeSeatId = null,
  nearestSeatId = null,
  timeOfDay = 'day',
  hskMode = false,
  notebookOpen = false,
  homework = 'desk',
  onObjectClick,
}: CampusSceneProps) {
  const [libraryFloor, setLibraryFloor] = useState<number>(() => playerState.libraryFloor);
  useEffect(() => {
    if (!inLibraryLobby) return;
    setLibraryFloor(playerState.libraryFloor);
    const onFloor = (e: Event) => {
      const d = (e as CustomEvent<{ floor?: number }>).detail;
      if (d && typeof d.floor === 'number') setLibraryFloor(d.floor);
    };
    const unsubNav = libraryNavigationController.subscribe((snap) => {
      setLibraryFloor(snap.currentFloor);
    });
    window.addEventListener('bkhn:library-floor', onFloor);
    return () => {
      unsubNav();
      window.removeEventListener('bkhn:library-floor', onFloor);
    };
  }, [inLibraryLobby]);

  const atm = ATMOSPHERE[timeOfDay] ?? ATMOSPHERE.day;
  const isOpenAirRooftop = inLibraryLobby && libraryFloor === 10;
  const isIndoor = inClassroom || (inLibraryLobby && !isOpenAirRooftop);
  const activeAtm = isIndoor ? (INDOOR_ATMOSPHERE[timeOfDay] ?? ATMOSPHERE.day) : atm;

  useEffect(() => {
    return () => {
      delete (window as unknown as { __bkhn?: unknown }).__bkhn;
    };
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.06 }}
      camera={{ fov: 55, near: 0.1, far: 600, position: [-70, 10, 26] }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <color attach="background" args={[activeAtm.bg]} />
      <fog attach="fog" args={[activeAtm.fogColor, activeAtm.fogNear, activeAtm.fogFar]} />
      <ProceduralEnvironment timeOfDay={timeOfDay} enabled={!isIndoor} />

      <hemisphereLight args={[activeAtm.hemiSky, activeAtm.hemiGround, activeAtm.hemiIntensity]} />
      <PlayerCenteredSunLight atm={activeAtm} isIndoor={isIndoor} />
      <directionalLight
        position={[-60, 40, -20]}
        color={activeAtm.westFillColor}
        intensity={activeAtm.westFillIntensity}
      />
      <directionalLight
        position={[10, isIndoor ? 65 : 30, isIndoor ? 45 : 90]}
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
          timeOfDay={timeOfDay}
          onObjectClick={onObjectClick ?? (() => undefined)}
        />
      ) : inLibraryLobby ? (
        <>
          {isOpenAirRooftop && (
            <>
              <SkyAtmosphereAndNightLights timeOfDay={timeOfDay} />
              <group position={[-38, -36.0, -36.5]}>
                <Ground />
                <Landmarks timeOfDay={timeOfDay} />
                <BackgroundBuildings timeOfDay={timeOfDay} />
                <CampusExpansion timeOfDay={timeOfDay} hskMode={hskMode} />
              </group>
            </>
          )}
          <LibraryLobby
            activeSeatId={activeSeatId}
            nearestSeatId={nearestSeatId}
            timeOfDay={timeOfDay}
            onObjectClick={onObjectClick}
          />
        </>
      ) : (
        <>
          <SkyAtmosphereAndNightLights timeOfDay={timeOfDay} />
          <Ground />
          <Landmarks timeOfDay={timeOfDay} />
          {/* Khối nhà phụ + cây nền + ghế/đèn rìa campus (đợt sửa lần 2 §4).
              Đã gắn ở đây — luồng tích hợp KHÔNG gắn lần 2. */}
          <BackgroundBuildings timeOfDay={timeOfDay} />
          {/* Mở rộng toàn bộ khuôn viên ĐHBK Hà Nội theo Bản đồ Số chuẩn https://hustmap.com/. */}
          <CampusExpansion timeOfDay={timeOfDay} hskMode={hskMode} />
          {/* Quần thể sinh viên NPC đi dạo & sinh hoạt trong sân trường. */}
          <AmbientLife />
          {/* NPC bạn đồng hành Minh đứng gần cổng Parabol, gần spawn. */}
          <MinhNpc />
          {/* Xe máy cá nhân (đợt 3 giai đoạn 4) — chỉ ngoài sân, không vào phòng học. */}
          <Motorbike />
          {/* Hệ thống trụ Check-in & Giới thiệu EdTech 9 công trình biểu tượng ĐHBK Hà Nội */}
          <CampusCheckinMarkers isNight={timeOfDay === 'night'} hskMode={hskMode} />
          {/* Hiệu ứng không gian sống động & Tương tác đời thường HUSTVerse */}
          <CampusAtmosphereFX timeOfDay={timeOfDay} />
          <CampusInteractiveLife timeOfDay={timeOfDay} />
        </>
      )}
      <RemotePlayers
        scene={inClassroom ? 'classroom' : inLibraryLobby ? 'library' : 'campus'}
      />
      <Player />
      <PhotoCaptureBridge />
    </Canvas>
  );
}
