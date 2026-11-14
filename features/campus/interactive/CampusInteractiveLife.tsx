'use client';

// ---------------------------------------------------------------------------
// features/campus/interactive/CampusInteractiveLife.tsx — Đời sống & Tương
// tác 3D trên sân trường ĐHBK Hà Nội:
//   - Ghế đá phụ ngắm sen Hồ Tiền (`bench-lake-east-1` qua SimpleBench)
//   - 2 Quầy Trà chanh Bách Khoa & Xe Cà phê Hồ Tiền (`CAMPUS_DRINK_STALLS`)
//   - 3 Bảng Lưu bút Sân trường (`CAMPUS_MEMORY_BOARDS`)
//   - Mini-game Bóng đá SVĐ Bách Khoa: dẫn bóng, sút (`E` / `bkhn:football-kick`),
//     bắt lưới Đông/Tây, pháo giấy ăn mừng & Bảng tỉ số LED 3D (`CAMPUS_FOOTBALL_PITCH`)
// Module ID: feature.campus.interactive
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CANVAS_VN_FONT,
  wrapVietnameseCanvasContext,
} from '../../../components/three/TextPlate';
import { SimpleBench } from '../landscape/C1SquareLandmarks';
import {
  CAMPUS_DRINK_STALLS,
  CAMPUS_FOOTBALL_PITCH,
  CAMPUS_MEMORY_BOARDS,
  OUTDOOR_SITTABLE_BENCHES,
  getCampusGroundElevation,
  type CampusMemoryBoardSpec,
  type DrinkStallSpec,
} from '../world-data';
import { playerState, type TimeOfDay } from '../../../lib/playerState';

declare global {
  interface Window {
    __bkhnFootball?: {
      kick: (force?: boolean) => boolean;
      reset: () => void;
      getBall: () => { x: number; y: number; z: number; goals: number };
    };
  }
}

const BALL_RADIUS = 0.22;
const CONFETTI_COUNT = 36;
const CONFETTI_COLORS = ['#EF4444', '#FACC15', '#22C55E', '#38BDF8', '#F97316'] as const;

type ConfettiParticle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotSpeed: number;
};

function createBenchWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = 'rgba(58, 34, 12, 0.28)';
    for (let y = 4; y < 64; y += 10) {
      ctx.fillRect(0, y, 128, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createSignCanvasTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  borderHex: string,
  textHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const rawCtx = canvas.getContext('2d');
  if (rawCtx) {
    const ctx = wrapVietnameseCanvasContext(rawCtx);
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = textHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 40px ${CANVAS_VN_FONT}`;
    ctx.fillText(title, 256, 74, 468);

    ctx.font = `700 26px ${CANVAS_VN_FONT}`;
    ctx.fillStyle = borderHex === '#FDE047' ? '#FEF08A' : '#E2E8F0';
    ctx.fillText(subtitle, 256, 134, 468);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSoccerBallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#0F172A';
    const spots = [
      [32, 32],
      [96, 32],
      [160, 32],
      [224, 32],
      [64, 92],
      [128, 92],
      [192, 92],
      [0, 64],
      [256, 64],
    ];
    for (const [cx, cy] of spots) {
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k * Math.PI * 2) / 5 - Math.PI / 2;
        const px = cx + Math.cos(a) * 16;
        const py = cy + Math.sin(a) * 16;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawScoreboardCanvas(
  canvas: HTMLCanvasElement,
  goals: number,
  justScoredSide: 'west' | 'east' | null,
) {
  const rawCtx = canvas.getContext('2d');
  if (!rawCtx) return;
  const ctx = wrapVietnameseCanvasContext(rawCtx);
  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = justScoredSide ? '#FACC15' : '#DC2626';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FCD34D';
  ctx.font = `700 30px ${CANVAS_VN_FONT}`;
  ctx.fillText('SVĐ BÁCH KHOA · MINI-GAME BÓNG ĐÁ', canvas.width / 2, 54, canvas.width - 40);

  ctx.fillStyle = justScoredSide ? '#4ADE80' : '#F8FAFC';
  ctx.font = `700 54px ${CANVAS_VN_FONT}`;
  const scoreLine = justScoredSide
    ? `⚽ VÀOOO! (${goals} BÀN THẮNG)`
    : `BÀN THẮNG: ${goals}`;
  ctx.fillText(scoreLine, canvas.width / 2, 126, canvas.width - 40);
}

function DrinkStallProp({
  spec,
  isNight,
}: {
  spec: DrinkStallSpec;
  isNight: boolean;
}) {
  const isTea = spec.drinkId === 'iced-tea';
  const signTex = useMemo(
    () =>
      createSignCanvasTexture(
        isTea ? 'TRÀ CHANH BÁCH KHOA' : 'CÀ PHÊ HỒ TIỀN',
        isTea ? 'Bấm E · Trà chanh đá mát lạnh' : 'Bấm E · Nâu đá đậm vị HUST',
        isTea ? '#991B1B' : '#064E3B',
        isTea ? '#FDE047' : '#A7F3D0',
        '#FFFFFF',
      ),
    [isTea],
  );
  useEffect(() => () => signTex.dispose(), [signTex]);

  return (
    <group position={[spec.x, 0, spec.z]} rotation-y={spec.rotY} name={`drink-stall-${spec.id}`}>
      {/* Đế gỗ lát gạch nhỏ chống lún */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[2.3, 0.06, 1.45]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.9} />
      </mesh>
      {/* Quầy gỗ */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.96, 0.85]} />
        <meshStandardMaterial color={isTea ? '#B45309' : '#3F2E21'} roughness={0.82} />
      </mesh>
      {/* Mặt bàn pha chế sáng màu */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[2.04, 0.08, 0.98]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.55} />
      </mesh>
      {/* Khung mái hiên + trụ sắt */}
      {[-0.86, 0.86].map((px) => (
        <mesh key={px} position={[px, 1.55, -0.34]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 1.25, 8]} />
          <meshStandardMaterial color="#1E293B" roughness={0.45} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.18, 0.02]} rotation-x={0.14} castShadow>
        <boxGeometry args={[2.25, 0.1, 1.35]} />
        <meshStandardMaterial color={isTea ? '#B91C1C' : '#0F5132'} roughness={0.78} />
      </mesh>
      {/* Viền bạt mái hiên trước */}
      <mesh position={[0, 2.02, 0.68]}>
        <boxGeometry args={[2.25, 0.16, 0.04]} />
        <meshStandardMaterial color={isTea ? '#FACC15' : '#ECFDF5'} roughness={0.7} />
      </mesh>
      {/* Biển hiệu tiếng Việt nhô 0.03m phía trước mái hiên */}
      <mesh position={[0, 2.48, -0.25]}>
        <boxGeometry args={[1.76, 0.58, 0.05]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.48, -0.22]}>
        <planeGeometry args={[1.68, 0.52]} />
        <meshStandardMaterial
          map={signTex}
          roughness={0.55}
          emissive={isNight ? '#FFFFFF' : '#000000'}
          emissiveMap={isNight ? signTex : undefined}
          emissiveIntensity={isNight ? 0.38 : 0}
        />
      </mesh>
      {/* Bình trà / máy pha & cốc trưng bày trên mặt quầy */}
      <mesh position={[-0.45, 1.22, 0.04]} castShadow>
        <cylinderGeometry args={[0.14, 0.13, 0.36, 12]} />
        <meshStandardMaterial
          color={isTea ? '#FDE047' : '#334155'}
          roughness={0.25}
          metalness={isTea ? 0.05 : 0.6}
        />
      </mesh>
      {[-0.08, 0.14, 0.36].map((cx) => (
        <mesh key={cx} position={[cx, 1.13, 0.12]} castShadow>
          <cylinderGeometry args={[0.048, 0.036, 0.16, 10]} />
          <meshStandardMaterial color={isTea ? '#FEF08A' : '#9A6324'} roughness={0.35} />
        </mesh>
      ))}
      {/* Đèn quầy nhỏ phát sáng về đêm */}
      <mesh position={[0, 2.05, 0.25]}>
        <sphereGeometry args={[0.075, 10, 8]} />
        <meshStandardMaterial
          color="#FEF9C3"
          emissive="#FBBF24"
          emissiveIntensity={isNight ? 1.4 : 0.2}
        />
      </mesh>
      {/* Ghế nhựa xanh ngồi vỉa hè cạnh quầy */}
      {[-0.65, 0.65].map((sx) => (
        <mesh key={`stool-${sx}`} position={[sx, 0.22, 0.72]} castShadow>
          <cylinderGeometry args={[0.16, 0.18, 0.38, 10]} />
          <meshStandardMaterial color={isTea ? '#2563EB' : '#059669'} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

const STICKY_NOTES_LAYOUT = [
  { x: -0.62, y: 0.24, rotZ: -0.06, color: '#FEF08A' },
  { x: -0.18, y: 0.26, rotZ: 0.05, color: '#FBCFE8' },
  { x: 0.28, y: 0.22, rotZ: -0.04, color: '#BAE6FD' },
  { x: 0.66, y: 0.25, rotZ: 0.07, color: '#BBF7D0' },
  { x: -0.54, y: -0.18, rotZ: 0.04, color: '#BAE6FD' },
  { x: -0.05, y: -0.16, rotZ: -0.05, color: '#FEF08A' },
  { x: 0.44, y: -0.2, rotZ: 0.05, color: '#FBCFE8' },
] as const;

function MemoryBoardProp({
  spec,
  isNight,
}: {
  spec: CampusMemoryBoardSpec;
  isNight: boolean;
}) {
  const headerTex = useMemo(
    () =>
      createSignCanvasTexture(
        'BẢNG LƯU BÚT BÁCH KHOA',
        `${spec.label.replace('Bảng Lưu bút ', '')} · Bấm E`,
        '#B5121B',
        '#FDE047',
        '#FFFFFF',
      ),
    [spec.label],
  );
  useEffect(() => () => headerTex.dispose(), [headerTex]);

  return (
    <group position={[spec.x, 0, spec.z]} rotation-y={spec.rotY} name={`memory-board-${spec.id}`}>
      {/* Hai trụ thép sẫm cắm sâu xuống đất */}
      {[-1.08, 1.08].map((px) => (
        <mesh key={px} position={[px, 1.15, 0]} castShadow>
          <boxGeometry args={[0.1, 2.34, 0.1]} />
          <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.45} />
        </mesh>
      ))}
      {/* Mái che bảng màu rêu Bách Khoa */}
      <mesh position={[0, 2.35, 0.04]} rotation-x={0.1} castShadow>
        <boxGeometry args={[2.46, 0.1, 0.56]} />
        <meshStandardMaterial color="#14532D" roughness={0.78} />
      </mesh>
      {/* Khung bảng gỗ */}
      <mesh position={[0, 1.48, 0]} castShadow>
        <boxGeometry args={[2.16, 1.42, 0.1]} />
        <meshStandardMaterial color="#78350F" roughness={0.8} />
      </mesh>
      {/* Bảng ghim bần ở cả hai mặt (+/-Z) lệch >= 0.055m so với tâm bảng */}
      {[1, -1].map((dir) => (
        <group key={dir} position={[0, 0, dir * 0.055]} rotation-y={dir === 1 ? 0 : Math.PI}>
          <mesh position={[0, 1.44, 0]}>
            <planeGeometry args={[1.98, 1.04]} />
            <meshStandardMaterial color="#D9B382" roughness={0.92} />
          </mesh>
          {/* Biển tiêu đề phía trên bảng */}
          <mesh position={[0, 2.1, 0.02]}>
            <planeGeometry args={[1.98, 0.36]} />
            <meshStandardMaterial
              map={headerTex}
              roughness={0.55}
              emissive={isNight ? '#FFFFFF' : '#000000'}
              emissiveMap={isNight ? headerTex : undefined}
              emissiveIntensity={isNight ? 0.35 : 0}
            />
          </mesh>
          {/* Tờ giấy note dán nổi >= 0.02m trước mặt bảng bần */}
          {STICKY_NOTES_LAYOUT.map((n, idx) => (
            <group key={idx} position={[n.x, 1.44 + n.y, 0.022]} rotation-z={n.rotZ}>
              <mesh>
                <planeGeometry args={[0.32, 0.28]} />
                <meshStandardMaterial color={n.color} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.1, 0.015]}>
                <sphereGeometry args={[0.022, 6, 6]} />
                <meshStandardMaterial color="#DC2626" roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function CampusInteractiveLife({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const isNight = timeOfDay === 'night';

  const benchWoodTex = useMemo(() => createBenchWoodTexture(), []);
  const ballTex = useMemo(() => createSoccerBallTexture(), []);

  // Bảng tỉ số 3D SVĐ Bách Khoa
  const scoreboard = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    drawScoreboardCanvas(canvas, playerState.footballGoals, null);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { canvas, tex };
  }, []);

  const extraBenches = useMemo(
    () => OUTDOOR_SITTABLE_BENCHES.filter((b) => b.isExtraMesh),
    [],
  );

  // Bóng đá & pháo giấy SVĐ Bách Khoa
  const ballMeshRef = useRef<THREE.Mesh>(null);
  const ballShadowRef = useRef<THREE.Mesh>(null);
  const confettiMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const ballStateRef = useRef<{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    goalCooldown: number;
    dribbleCooldown: number;
    confettiTimer: number;
  }>({
    x: CAMPUS_FOOTBALL_PITCH.center.x,
    y: BALL_RADIUS,
    z: CAMPUS_FOOTBALL_PITCH.center.z,
    vx: 0,
    vy: 0,
    vz: 0,
    goalCooldown: 0,
    dribbleCooldown: 0,
    confettiTimer: 0,
  });

  const confettiParticlesRef = useRef<ConfettiParticle[]>(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rotSpeed: 4,
    })),
  );

  const confettiAssets = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.18, 0.11);
    const mat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      side: THREE.DoubleSide,
    });
    return { geo, mat };
  }, []);

  useEffect(() => {
    const mesh = confettiMeshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      c.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  const spawnGoalConfetti = (gx: number, gz: number) => {
    const b = ballStateRef.current;
    b.confettiTimer = 2.0;
    const parts = confettiParticlesRef.current;
    for (let i = 0; i < parts.length; i++) {
      const a = (i / parts.length) * Math.PI * 2 + (i % 3) * 0.25;
      const spd = 2.2 + (i % 5) * 0.9;
      parts[i].x = gx;
      parts[i].y = 1.1;
      parts[i].z = gz;
      parts[i].vx = Math.cos(a) * spd;
      parts[i].vy = 4.5 + (i % 4) * 1.4;
      parts[i].vz = Math.sin(a) * spd;
      parts[i].rotSpeed = 5 + (i % 6);
    }
  };

  const performKick = (force = false): boolean => {
    if (playerState.inClassroom || playerState.inLibraryLobby) return false;
    const b = ballStateRef.current;
    const dx = b.x - playerState.pos.x;
    const dz = b.z - playerState.pos.z;
    const dist = Math.hypot(dx, dz);
    if (!force && dist > CAMPUS_FOOTBALL_PITCH.kickInteractRadius + 0.85) {
      return false;
    }
    const fX = Math.sin(playerState.facing);
    const fZ = Math.cos(playerState.facing);
    const dirLen = dist > 0.08 ? dist : 1;
    const awayX = dist > 0.08 ? dx / dirLen : fX;
    const awayZ = dist > 0.08 ? dz / dirLen : fZ;
    let kx = awayX * 0.65 + fX * 0.35;
    let kz = awayZ * 0.65 + fZ * 0.35;
    const kLen = Math.hypot(kx, kz) || 1;
    kx /= kLen;
    kz /= kLen;

    b.vx = kx * 12.2;
    b.vz = kz * 12.2;
    b.vy = 3.8;
    b.dribbleCooldown = 0.25;
    return true;
  };

  useEffect(() => {
    playerState.footballPos = {
      x: ballStateRef.current.x,
      z: ballStateRef.current.z,
    };

    const onKickEvent = () => {
      performKick(false);
    };
    window.addEventListener('bkhn:football-kick', onKickEvent);

    window.__bkhnFootball = {
      kick: (force = true) => performKick(force),
      reset: () => {
        const b = ballStateRef.current;
        b.x = CAMPUS_FOOTBALL_PITCH.center.x;
        b.y = BALL_RADIUS;
        b.z = CAMPUS_FOOTBALL_PITCH.center.z;
        b.vx = 0;
        b.vy = 0;
        b.vz = 0;
        b.goalCooldown = 0;
        playerState.footballPos = { x: b.x, z: b.z };
      },
      getBall: () => ({
        x: ballStateRef.current.x,
        y: ballStateRef.current.y,
        z: ballStateRef.current.z,
        goals: playerState.footballGoals,
      }),
    };

    return () => {
      window.removeEventListener('bkhn:football-kick', onKickEvent);
      delete window.__bkhnFootball;
      playerState.footballPos = {
        x: CAMPUS_FOOTBALL_PITCH.center.x,
        z: CAMPUS_FOOTBALL_PITCH.center.z,
      };
    };
  }, []);

  useEffect(() => {
    return () => {
      benchWoodTex.dispose();
      ballTex.dispose();
      scoreboard.tex.dispose();
      confettiAssets.geo.dispose();
      confettiAssets.mat.dispose();
    };
  }, [benchWoodTex, ballTex, scoreboard, confettiAssets]);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const b = ballStateRef.current;
    const pitch = CAMPUS_FOOTBALL_PITCH;

    if (b.dribbleCooldown > 0) b.dribbleCooldown = Math.max(0, b.dribbleCooldown - dt);

    // 1) Dẫn bóng khi người chơi chạm bóng ngoài sân
    if (
      !playerState.inClassroom &&
      !playerState.inLibraryLobby &&
      !playerState.riding &&
      b.dribbleCooldown <= 0
    ) {
      const dx = b.x - playerState.pos.x;
      const dz = b.z - playerState.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < pitch.dribbleRadius && b.y <= 0.7) {
        const len = dist > 0.04 ? dist : 1;
        const pushX = dist > 0.04 ? dx / len : Math.sin(playerState.facing);
        const pushZ = dist > 0.04 ? dz / len : Math.cos(playerState.facing);
        b.vx = Math.max(-7.5, Math.min(7.5, b.vx * 0.35 + pushX * 4.4));
        b.vz = Math.max(-7.5, Math.min(7.5, b.vz * 0.35 + pushZ * 4.4));
        b.dribbleCooldown = 0.09;
      }
    }

    // 2) Trọng lực, nảy & ma sát sân cỏ
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    if (b.y > BALL_RADIUS || b.vy !== 0) {
      b.vy -= 14.5 * dt;
      b.y += b.vy * dt;
      if (b.y <= BALL_RADIUS) {
        b.y = BALL_RADIUS;
        if (Math.abs(b.vy) > 1.1) {
          b.vy = -b.vy * 0.45;
        } else {
          b.vy = 0;
        }
      }
    }
    const friction = Math.exp(-1.9 * dt);
    b.vx *= friction;
    b.vz *= friction;
    if (Math.hypot(b.vx, b.vz) < 0.04) {
      b.vx = 0;
      b.vz = 0;
    }

    // 3) Giới hạn đường biên SVĐ Bách Khoa
    const minX = pitch.center.x - pitch.halfW;
    const maxX = pitch.center.x + pitch.halfW;
    const minZ = pitch.center.z - pitch.halfD;
    const maxZ = pitch.center.z + pitch.halfD;
    if (b.x < minX) {
      b.x = minX;
      b.vx = Math.abs(b.vx) * 0.65;
    } else if (b.x > maxX) {
      b.x = maxX;
      b.vx = -Math.abs(b.vx) * 0.65;
    }
    if (b.z < minZ) {
      b.z = minZ;
      b.vz = Math.abs(b.vz) * 0.65;
    } else if (b.z > maxZ) {
      b.z = maxZ;
      b.vz = -Math.abs(b.vz) * 0.65;
    }

    // 4) Kiểm tra ghi bàn vào khung thành Tây (117.6) hoặc Đông (146.4)
    if (b.goalCooldown > 0) {
      b.goalCooldown -= dt;
      if (b.goalCooldown <= 0) {
        b.x = pitch.center.x;
        b.y = BALL_RADIUS;
        b.z = pitch.center.z;
        b.vx = 0;
        b.vy = 0;
        b.vz = 0;
        drawScoreboardCanvas(scoreboard.canvas, playerState.footballGoals, null);
        scoreboard.tex.needsUpdate = true;
      }
    } else if (
      Math.abs(b.z - pitch.center.z) <= pitch.goalHalfZ &&
      b.y <= pitch.goalHeight &&
      (b.x <= pitch.westGoalX || b.x >= pitch.eastGoalX)
    ) {
      const side: 'west' | 'east' = b.x <= pitch.westGoalX ? 'west' : 'east';
      b.goalCooldown = 1.55;
      b.vx *= 0.2;
      b.vz *= 0.2;
      playerState.footballGoals += 1;
      spawnGoalConfetti(side === 'west' ? pitch.westGoalX : pitch.eastGoalX, pitch.center.z);
      drawScoreboardCanvas(scoreboard.canvas, playerState.footballGoals, side);
      scoreboard.tex.needsUpdate = true;
      window.dispatchEvent(
        new CustomEvent('bkhn:football-goal', {
          detail: { side, totalGoals: playerState.footballGoals },
        }),
      );
    }

    playerState.footballPos = { x: b.x, z: b.z };

    // 5) Cập nhật vị trí bóng + độ xoay lăn
    const groundY = getCampusGroundElevation(b.x, b.z);
    if (ballMeshRef.current) {
      ballMeshRef.current.position.set(b.x, groundY + b.y, b.z);
      ballMeshRef.current.rotation.z -= (b.vx * dt) / BALL_RADIUS;
      ballMeshRef.current.rotation.x += (b.vz * dt) / BALL_RADIUS;
    }
    if (ballShadowRef.current) {
      const shrink = Math.max(0.45, 1 - (b.y - BALL_RADIUS) * 0.2);
      ballShadowRef.current.position.set(b.x, groundY + 0.032, b.z);
      ballShadowRef.current.scale.setScalar(shrink);
    }

    // 6) Pháo giấy ăn mừng bàn thắng
    const confetti = confettiMeshRef.current;
    if (confetti) {
      if (b.confettiTimer > 0) {
        b.confettiTimer = Math.max(0, b.confettiTimer - dt);
        confetti.visible = true;
        const parts = confettiParticlesRef.current;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.vy -= 9.5 * dt;
          p.x += p.vx * dt;
          p.y = Math.max(0.05, p.y + p.vy * dt);
          p.z += p.vz * dt;
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(
            state.clock.elapsedTime * p.rotSpeed,
            state.clock.elapsedTime * 2 + i,
            0,
          );
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          confetti.setMatrixAt(i, dummy.matrix);
        }
        confetti.instanceMatrix.needsUpdate = true;
      } else {
        confetti.visible = false;
      }
    }
  });

  return (
    <group name="CampusInteractiveLife">
      {/* 1. Ghế đá bổ sung bên bờ Đông Hồ Tiền */}
      {extraBenches.map((b) => (
        <SimpleBench key={b.id} x={b.x} z={b.z} rotationY={b.rotY} woodTex={benchWoodTex} />
      ))}

      {/* 2. Quầy Trà chanh Bách Khoa & Xe Cà phê Hồ Tiền */}
      {CAMPUS_DRINK_STALLS.map((stall) => (
        <DrinkStallProp key={stall.id} spec={stall} isNight={isNight} />
      ))}

      {/* 3. Ba Bảng Lưu bút Sân trường */}
      {CAMPUS_MEMORY_BOARDS.map((board) => (
        <MemoryBoardProp key={board.id} spec={board} isNight={isNight} />
      ))}

      {/* 4. Quả bóng đá 3D tương tác & Bảng tỉ số LED SVĐ Bách Khoa */}
      <mesh
        ref={ballMeshRef}
        position={[CAMPUS_FOOTBALL_PITCH.center.x, BALL_RADIUS, CAMPUS_FOOTBALL_PITCH.center.z]}
        castShadow
      >
        <sphereGeometry args={[BALL_RADIUS, 20, 16]} />
        <meshStandardMaterial map={ballTex} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh
        ref={ballShadowRef}
        position={[CAMPUS_FOOTBALL_PITCH.center.x, 0.032, CAMPUS_FOOTBALL_PITCH.center.z]}
        rotation-x={-Math.PI / 2}
      >
        <circleGeometry args={[BALL_RADIUS * 1.1, 16]} />
        <meshBasicMaterial color="#0F172A" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      <instancedMesh
        ref={confettiMeshRef}
        args={[confettiAssets.geo, confettiAssets.mat, CONFETTI_COUNT]}
        frustumCulled={false}
        visible={false}
      />

      {/* Bảng tỉ số LED đặt ở rìa Nam SVĐ, quay mặt về hướng Bắc (-Z) */}
      <group position={[132, 0, 92.2]} rotation-y={Math.PI} name="StadiumScoreboard3D">
        {[-1.55, 1.55].map((px) => (
          <mesh key={px} position={[px, 1.35, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.09, 2.7, 8]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 2.45, 0]} castShadow>
          <boxGeometry args={[4.0, 1.48, 0.16]} />
          <meshStandardMaterial color="#0F172A" roughness={0.55} metalness={0.4} />
        </mesh>
        <mesh position={[0, 2.45, 0.095]}>
          <planeGeometry args={[3.72, 1.26]} />
          <meshBasicMaterial map={scoreboard.tex} />
        </mesh>
      </group>
    </group>
  );
}
