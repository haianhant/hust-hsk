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

function createWoodSlatPbrTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  const b = document.createElement('canvas');
  b.width = 256;
  b.height = 256;
  const bctx = b.getContext('2d');

  if (ctx && bctx) {
    ctx.fillStyle = '#E5D3B8';
    ctx.fillRect(0, 0, 256, 256);
    bctx.fillStyle = '#B8B8B8';
    bctx.fillRect(0, 0, 256, 256);

    const slats = 8;
    const sw = 256 / slats;
    for (let i = 0; i < slats; i++) {
      const shade = i % 2 === 0 ? 'rgba(255,250,240,0.14)' : 'rgba(120,78,38,0.12)';
      ctx.fillStyle = shade;
      ctx.fillRect(i * sw + 2, 0, sw - 4, 256);
      // Khe nan dọc
      ctx.fillStyle = 'rgba(42, 24, 10, 0.48)';
      ctx.fillRect(i * sw, 0, 3, 256);
      bctx.fillStyle = '#383838';
      bctx.fillRect(i * sw, 0, 3, 256);
    }
    // Thanh nẹp ngang trên và dưới
    ctx.fillStyle = 'rgba(72, 42, 16, 0.28)';
    ctx.fillRect(0, 12, 256, 10);
    ctx.fillRect(0, 232, 256, 10);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(b);
  bumpMap.needsUpdate = true;
  return { map, bumpMap };
}

function createStripedAwningTexture(stripeA: string, stripeB: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const count = 8;
    const w = 256 / count;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = i % 2 === 0 ? stripeA : stripeB;
      ctx.fillRect(i * w, 0, w, 128);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(i * w, 0, 2, 128);
    }
    const shade = ctx.createLinearGradient(0, 0, 0, 128);
    shade.addColorStop(0, 'rgba(255,255,255,0.06)');
    shade.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 256, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createChalkboardMenuTexture(isTea: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 256;
  const rawCtx = c.getContext('2d');
  if (rawCtx) {
    const ctx = wrapVietnameseCanvasContext(rawCtx);
    ctx.fillStyle = '#18222B';
    ctx.fillRect(0, 0, 384, 256);
    ctx.strokeStyle = isTea ? '#F59E0B' : '#34D399';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 368, 240);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isTea ? '#FDE047' : '#A7F3D0';
    ctx.font = `700 30px ${CANVAS_VN_FONT}`;
    ctx.fillText(isTea ? 'THỰC ĐƠN TRÀ CHANH' : 'MENU CÀ PHÊ HỒ TIỀN', 192, 42, 344);

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, 68);
    ctx.lineTo(352, 68);
    ctx.stroke();

    const rows = isTea
      ? ['• Trà chanh giã tay ........ 15K', '• Trà đào cam sả .......... 22K', '• Hướng dương & trà đá ..... 10K']
      : ['• Nâu đá Bách Khoa ........ 20K', '• Bạc xỉu kem sữa .......... 25K', '• Đen đá nguyên chất ...... 18K'];
    ctx.textAlign = 'left';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = `600 22px ${CANVAS_VN_FONT}`;
    rows.forEach((line, idx) => {
      ctx.fillText(line, 30, 108 + idx * 46, 324);
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createCorkBoardPbrTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');

  const b = document.createElement('canvas');
  b.width = 256;
  b.height = 128;
  const bctx = b.getContext('2d');

  if (ctx && bctx) {
    ctx.fillStyle = '#CFA36E';
    ctx.fillRect(0, 0, 256, 128);
    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, 256, 128);

    let s = 20261114;
    const rnd = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < 1600; i++) {
      const x = rnd() * 256;
      const y = rnd() * 128;
      const w = 1.5 + rnd() * 2.5;
      const h = 1.5 + rnd() * 2;
      const light = rnd() > 0.45;
      ctx.fillStyle = light ? 'rgba(246, 217, 175, 0.34)' : 'rgba(128, 82, 42, 0.28)';
      ctx.fillRect(x, y, w, h);
      bctx.fillStyle = light ? '#B2B2B2' : '#545454';
      bctx.fillRect(x, y, w, h);
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(b);
  bumpMap.needsUpdate = true;
  return { map, bumpMap };
}

function createStickyNoteTexture(variant: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 128, 128);
    // Dải keo mờ trên đầu giấy & bóng nhẹ mép dưới
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, 128, 16);
    const bot = ctx.createLinearGradient(0, 108, 0, 128);
    bot.addColorStop(0, 'rgba(0,0,0,0)');
    bot.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = bot;
    ctx.fillRect(0, 108, 128, 20);

    // Dòng viết tay giả lập + ký hiệu nhỏ
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.58)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const lines = variant === 0 ? [38, 56, 74, 92] : [36, 54, 72, 90];
    lines.forEach((ly, idx) => {
      ctx.beginPath();
      const endX = idx === 3 ? 78 : 108 - ((idx * 17 + variant * 13) % 24);
      ctx.moveTo(18, ly);
      ctx.quadraticCurveTo(60, ly + (idx % 2 === 0 ? -2 : 2), endX, ly);
      ctx.stroke();
    });

    ctx.fillStyle = variant === 0 ? '#E11D48' : '#2563EB';
    ctx.beginPath();
    ctx.arc(98, 96, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createPolaroidMemoryTexture(variant: 0 | 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 160;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 128, 160);
    // Khung ảnh bên trong
    if (variant === 0) {
      const sky = ctx.createLinearGradient(12, 12, 12, 114);
      sky.addColorStop(0, '#FDBA74');
      sky.addColorStop(1, '#FEF08A');
      ctx.fillStyle = sky;
      ctx.fillRect(12, 12, 104, 102);
      // Bóng Cổng Parabol Bách Khoa
      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(28, 108);
      ctx.quadraticCurveTo(64, 24, 100, 108);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(12, 12, 104, 58);
      ctx.fillStyle = '#2F6F5B';
      ctx.fillRect(12, 70, 104, 44);
      ctx.fillStyle = '#EC4899';
      for (const [lx, ly] of [[38, 90], [66, 98], [92, 86]] as const) {
        ctx.beginPath();
        ctx.arc(lx, ly, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#475569';
    ctx.fillRect(28, 132, 72, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
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

/**
 * Quả bóng đá 32 múi (12 ngũ giác đen + 20 lục giác trắng) tính trực tiếp theo
 * phép chiếu cầu Equirectangular 3D dựa trên 12 đỉnh & 20 tâm mặt nhị thập diện đều,
 * giúp múi bóng tròn đều tuyệt đối ở hai cực kèm đường chỉ khâu bumpMap rõ nét.
 */
function createSoccerBallPbrTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const phi = (1 + Math.sqrt(5)) / 2;
  const rawVerts: Array<[number, number, number]> = [
    [0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi],
    [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1],
  ];
  const pentagons = rawVerts.map(([x, y, z]) => {
    const len = Math.hypot(x, y, z);
    return new THREE.Vector3(x / len, y / len, z / len);
  });

  // 20 tâm mặt tam giác của khối nhị thập diện đều = 20 tâm lục giác trắng
  const hexagons: THREE.Vector3[] = [];
  for (let i = 0; i < pentagons.length; i++) {
    for (let j = i + 1; j < pentagons.length; j++) {
      if (pentagons[i].dot(pentagons[j]) < 0.4) continue;
      for (let k = j + 1; k < pentagons.length; k++) {
        if (pentagons[i].dot(pentagons[k]) < 0.4 || pentagons[j].dot(pentagons[k]) < 0.4) continue;
        hexagons.push(
          new THREE.Vector3()
            .addVectors(pentagons[i], pentagons[j])
            .add(pentagons[k])
            .normalize(),
        );
      }
    }
  }

  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);

  const b = document.createElement('canvas');
  b.width = w;
  b.height = h;
  const bctx = b.getContext('2d')!;
  const bimg = bctx.createImageData(w, h);

  for (let py = 0; py < h; py++) {
    const theta = ((py + 0.5) / h) * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    for (let px = 0; px < w; px++) {
      const lam = ((px + 0.5) / w) * Math.PI * 2;
      const nx = -sinT * Math.cos(lam);
      const ny = cosT;
      const nz = sinT * Math.sin(lam);

      let best1 = -9;
      let best2 = -9;
      let bestIsPent = false;

      for (let i = 0; i < pentagons.length; i++) {
        const v = pentagons[i];
        const sc = nx * v.x + ny * v.y + nz * v.z - 0.032;
        if (sc > best1) {
          best2 = best1;
          best1 = sc;
          bestIsPent = true;
        } else if (sc > best2) {
          best2 = sc;
        }
      }
      for (let j = 0; j < hexagons.length; j++) {
        const u = hexagons[j];
        const sc = nx * u.x + ny * u.y + nz * u.z;
        if (sc > best1) {
          best2 = best1;
          best1 = sc;
          bestIsPent = false;
        } else if (sc > best2) {
          best2 = sc;
        }
      }

      const margin = best1 - best2;
      const seam = margin < 0.011;
      const idx = (py * w + px) * 4;

      if (seam) {
        img.data[idx] = 52;
        img.data[idx + 1] = 62;
        img.data[idx + 2] = 74;
        img.data[idx + 3] = 255;
        bimg.data[idx] = 45;
        bimg.data[idx + 1] = 45;
        bimg.data[idx + 2] = 45;
        bimg.data[idx + 3] = 255;
      } else if (bestIsPent) {
        const shade = Math.min(34, Math.floor(16 + margin * 120));
        img.data[idx] = shade;
        img.data[idx + 1] = shade + 4;
        img.data[idx + 2] = shade + 12;
        img.data[idx + 3] = 255;
        const bv = Math.min(245, Math.floor(175 + margin * 800));
        bimg.data[idx] = bv;
        bimg.data[idx + 1] = bv;
        bimg.data[idx + 2] = bv;
        bimg.data[idx + 3] = 255;
      } else {
        const shade = Math.min(252, Math.floor(236 + margin * 120));
        img.data[idx] = shade;
        img.data[idx + 1] = shade;
        img.data[idx + 2] = Math.min(255, shade + 2);
        img.data[idx + 3] = 255;
        const bv = Math.min(250, Math.floor(185 + margin * 800));
        bimg.data[idx] = bv;
        bimg.data[idx + 1] = bv;
        bimg.data[idx + 2] = bv;
        bimg.data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(b);
  bumpMap.needsUpdate = true;
  return { map, bumpMap };
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

function PlasticStoolMesh({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={position}>
      {/* Mặt ghế nhựa vuông vỉa hè có gờ bo & lỗ tròn xỏ tay */}
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.036, 0.28]} />
        <meshStandardMaterial color={color} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.012, 10]} />
        <meshStandardMaterial color="#0F172A" roughness={0.85} />
      </mesh>
      {/* Yếm thành ghế tăng cứng */}
      <mesh position={[0, 0.325, 0]} castShadow>
        <boxGeometry args={[0.25, 0.045, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.52} />
      </mesh>
      {/* 4 chân ghế nhựa choãi vát ra ngoài */}
      {[
        [-0.098, -0.098, 0.09, -0.09],
        [0.098, -0.098, 0.09, 0.09],
        [-0.098, 0.098, -0.09, -0.09],
        [0.098, 0.098, -0.09, 0.09],
      ].map(([lx, lz, rx, rz], idx) => (
        <mesh
          key={`stool-leg-${idx}`}
          position={[lx, 0.175, lz]}
          rotation={[rx, 0, rz]}
          castShadow
        >
          <cylinderGeometry args={[0.02, 0.014, 0.35, 8]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function DrinkStallProp({
  spec,
  isNight,
  woodSlatPbr,
}: {
  spec: DrinkStallSpec;
  isNight: boolean;
  woodSlatPbr: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
}) {
  const isTea = spec.drinkId === 'iced-tea';
  const assets = useMemo(() => {
    const signTex = createSignCanvasTexture(
      isTea ? 'TRÀ CHANH BÁCH KHOA' : 'CÀ PHÊ HỒ TIỀN',
      isTea ? 'Bấm E · Trà chanh đá mát lạnh' : 'Bấm E · Nâu đá đậm vị HUST',
      isTea ? '#991B1B' : '#064E3B',
      isTea ? '#FDE047' : '#A7F3D0',
      '#FFFFFF',
    );
    const awningTex = createStripedAwningTexture(
      isTea ? '#B91C1C' : '#0F5132',
      isTea ? '#FEF3C7' : '#ECFDF5',
    );
    const menuTex = createChalkboardMenuTexture(isTea);
    return { signTex, awningTex, menuTex };
  }, [isTea]);

  useEffect(
    () => () => {
      assets.signTex.dispose();
      assets.awningTex.dispose();
      assets.menuTex.dispose();
    },
    [assets],
  );

  return (
    <group position={[spec.x, 0, spec.z]} rotation-y={spec.rotY} name={`drink-stall-${spec.id}`}>
      {/* Đế gạch vỉa hè kê quầy */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[2.34, 0.06, 1.52]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.9} />
      </mesh>
      {/* Thân quầy ốp nan gỗ đứng PBR + nẹp khung tối */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.96, 0.85]} />
        <meshStandardMaterial
          color={isTea ? '#C67D38' : '#7C5336'}
          map={woodSlatPbr.map}
          bumpMap={woodSlatPbr.bumpMap}
          bumpScale={0.014}
          roughness={0.82}
        />
      </mesh>
      {/* Khung viền quầy & Bảng thực đơn phấn gắn nổi mặt trước quầy (lệch +0.03m) */}
      <mesh position={[0, 0.52, 0.44]} castShadow>
        <boxGeometry args={[1.18, 0.76, 0.03]} />
        <meshStandardMaterial color="#451A03" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.52, 0.462]}>
        <planeGeometry args={[1.1, 0.68]} />
        <meshStandardMaterial map={assets.menuTex} roughness={0.62} />
      </mesh>

      {/* Mặt bàn pha chế đá sáng bo viền */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.06, 0.08, 1.0]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.48} />
      </mesh>
      {/* Hai trụ thép đứng nâng mái hiên + 2 thanh đỡ biển trên */}
      {[-0.86, 0.86].map((px) => (
        <mesh key={px} position={[px, 1.68, -0.34]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 1.5, 8]} />
          <meshStandardMaterial color="#1E293B" roughness={0.45} metalness={0.5} />
        </mesh>
      ))}
      {[-0.58, 0.58].map((px) => (
        <mesh key={`strut-${px}`} position={[px, 2.28, 0.16]}>
          <cylinderGeometry args={[0.018, 0.018, 0.36, 6]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.55} />
        </mesh>
      ))}

      {/* Mái bạt vải kẻ sọc đỏ-kem / xanh-kem */}
      <mesh position={[0, 2.18, 0.04]} rotation-x={0.14} castShadow>
        <boxGeometry args={[2.28, 0.08, 1.38]} />
        <meshStandardMaterial map={assets.awningTex} roughness={0.76} />
      </mesh>
      {/* Diềm bạt lượn sóng trước mái hiên */}
      {Array.from({ length: 9 }, (_, vi) => (
        <mesh
          key={`valance-${vi}`}
          position={[-1.0 + vi * 0.25, 2.04, 0.72]}
          castShadow
        >
          <cylinderGeometry args={[0.125, 0.125, 0.035, 10, 1, false, 0, Math.PI]} />
          <meshStandardMaterial
            color={
              vi % 2 === 0
                ? isTea
                  ? '#B91C1C'
                  : '#0F5132'
                : isTea
                  ? '#FEF3C7'
                  : '#ECFDF5'
            }
            roughness={0.75}
          />
        </mesh>
      ))}

      {/* Biển hiệu chính tiếng Việt đặt nổi phía trên mái hiên */}
      <mesh position={[0, 2.48, 0.18]} castShadow>
        <boxGeometry args={[1.8, 0.6, 0.06]} />
        <meshStandardMaterial color="#1E293B" roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.48, 0.215]}>
        <planeGeometry args={[1.72, 0.54]} />
        <meshStandardMaterial
          map={assets.signTex}
          roughness={0.52}
          emissive={isNight ? '#FFFFFF' : '#000000'}
          emissiveMap={isNight ? assets.signTex : undefined}
          emissiveIntensity={isNight ? 0.42 : 0}
        />
      </mesh>

      {/* Đạo cụ pha chế chi tiết trên mặt bàn */}
      {isTea ? (
        <group position={[-0.48, 1.04, 0]}>
          {/* Đế gỗ kê bình trà chanh + bình thủy tinh có chanh lát */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.17, 0.17, 0.08, 14]} />
            <meshStandardMaterial color="#78350F" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.145, 0.145, 0.34, 16]} />
            <meshStandardMaterial color="#FEF08A" transparent opacity={0.78} roughness={0.14} />
          </mesh>
          <mesh position={[0, 0.43, 0]}>
            <cylinderGeometry args={[0.152, 0.152, 0.04, 16]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.14, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.06, 8]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>
      ) : (
        <group position={[-0.45, 1.04, -0.04]}>
          {/* Máy pha cà phê inox 2 họng + khay hứng + phin nhôm */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.46, 0.34, 0.32]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.78} roughness={0.26} />
          </mesh>
          <mesh position={[0, 0.03, 0.17]}>
            <boxGeometry args={[0.42, 0.04, 0.12]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.4} />
          </mesh>
          {[-0.12, 0.12].map((hx) => (
            <mesh key={`grouphead-${hx}`} position={[hx, 0.19, 0.17]}>
              <cylinderGeometry args={[0.042, 0.042, 0.05, 10]} />
              <meshStandardMaterial color="#1E293B" metalness={0.65} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}
      {/* Hàng cốc có nắp & ống hút màu sắc sinh động trên mặt quầy */}
      {[-0.02, 0.18, 0.38].map((cx, ci) => (
        <group key={cx} position={[cx, 1.12, 0.15]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.048, 0.035, 0.16, 12]} />
            <meshStandardMaterial
              color={isTea ? '#FDE047' : '#78350F'}
              roughness={0.28}
            />
          </mesh>
          <mesh position={[0, 0.085, 0]}>
            <sphereGeometry args={[0.048, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#F8FAFC" transparent opacity={0.7} roughness={0.2} />
          </mesh>
          <mesh position={[0.012, 0.12, 0]} rotation={[0, 0, -0.18]}>
            <cylinderGeometry args={[0.006, 0.006, 0.14, 6]} />
            <meshStandardMaterial color={ci === 1 ? '#EF4444' : '#22C55E'} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Dây 5 bóng đèn tròn ấm treo dưới mái hiên */}
      {[-0.85, -0.42, 0, 0.42, 0.85].map((bx, bi) => (
        <mesh key={`bulb-${bi}`} position={[bx, 2.02, 0.54]}>
          <sphereGeometry args={[0.046, 8, 8]} />
          <meshStandardMaterial
            color="#FEF9C3"
            emissive="#FBBF24"
            emissiveIntensity={isNight ? 1.55 : 0.22}
          />
        </mesh>
      ))}
      {/* Cặp ghế nhựa 4 chân vỉa hè cạnh quầy */}
      <PlasticStoolMesh
        position={[-0.68, 0, 0.78]}
        color={isTea ? '#2563EB' : '#059669'}
      />
      <PlasticStoolMesh
        position={[0.68, 0, 0.78]}
        color={isTea ? '#2563EB' : '#059669'}
      />
    </group>
  );
}

const STICKY_NOTES_LAYOUT = [
  { x: -0.62, y: 0.24, rotZ: -0.06, color: '#FEF08A', texVariant: 0 },
  { x: -0.18, y: 0.26, rotZ: 0.05, color: '#FBCFE8', texVariant: 1 },
  { x: 0.28, y: 0.22, rotZ: -0.04, color: '#BAE6FD', texVariant: 0 },
  { x: 0.66, y: 0.25, rotZ: 0.07, color: '#BBF7D0', texVariant: 1 },
  { x: -0.54, y: -0.18, rotZ: 0.04, color: '#BAE6FD', texVariant: 1 },
  { x: -0.05, y: -0.16, rotZ: -0.05, color: '#FEF08A', texVariant: 0 },
  { x: 0.44, y: -0.2, rotZ: 0.05, color: '#FBCFE8', texVariant: 1 },
] as const;

function MemoryBoardProp({
  spec,
  isNight,
  corkPbr,
  stickyNotesTex,
  polaroidsTex,
}: {
  spec: CampusMemoryBoardSpec;
  isNight: boolean;
  corkPbr: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  stickyNotesTex: [THREE.CanvasTexture, THREE.CanvasTexture];
  polaroidsTex: [THREE.CanvasTexture, THREE.CanvasTexture];
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
      {/* Bảng ghim bần PBR ở cả hai mặt (+/-Z) lệch >= 0.055m so với tâm bảng */}
      {[1, -1].map((dir) => (
        <group key={dir} position={[0, 0, dir * 0.055]} rotation-y={dir === 1 ? 0 : Math.PI}>
          <mesh position={[0, 1.44, 0]}>
            <planeGeometry args={[1.98, 1.04]} />
            <meshStandardMaterial
              color="#FFFFFF"
              map={corkPbr.map}
              bumpMap={corkPbr.bumpMap}
              bumpScale={0.015}
              roughness={0.9}
            />
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
          {/* Tờ giấy note viết tay dán nổi >= 0.02m trước mặt bảng bần */}
          {STICKY_NOTES_LAYOUT.map((n, idx) => (
            <group key={idx} position={[n.x, 1.44 + n.y, 0.022]} rotation-z={n.rotZ}>
              <mesh>
                <planeGeometry args={[0.32, 0.28]} />
                <meshStandardMaterial
                  color={n.color}
                  map={stickyNotesTex[n.texVariant]}
                  roughness={0.82}
                />
              </mesh>
              <mesh position={[0, 0.1, 0.016]}>
                <sphereGeometry args={[0.02, 8, 6]} />
                <meshStandardMaterial
                  color={idx % 2 === 0 ? '#DC2626' : '#2563EB'}
                  roughness={0.35}
                />
              </mesh>
            </group>
          ))}
          {/* 2 ảnh Polaroid kỷ niệm Bách Khoa dán thêm trên bảng */}
          {[
            { x: -0.78, y: 1.44 - 0.14, rot: -0.1, tex: polaroidsTex[0] },
            { x: 0.78, y: 1.44 - 0.18, rot: 0.08, tex: polaroidsTex[1] },
          ].map((ph, pi) => (
            <group key={`polaroid-${pi}`} position={[ph.x, ph.y, 0.024]} rotation-z={ph.rot}>
              <mesh>
                <planeGeometry args={[0.25, 0.31]} />
                <meshStandardMaterial map={ph.tex} roughness={0.62} />
              </mesh>
              <mesh position={[0, 0.125, 0.014]}>
                <sphereGeometry args={[0.018, 8, 6]} />
                <meshStandardMaterial color="#F59E0B" roughness={0.35} />
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
  const woodSlatPbr = useMemo(() => createWoodSlatPbrTextures(), []);
  const corkPbr = useMemo(() => createCorkBoardPbrTextures(), []);
  const stickyNotesTex = useMemo<[THREE.CanvasTexture, THREE.CanvasTexture]>(
    () => [createStickyNoteTexture(0), createStickyNoteTexture(1)],
    [],
  );
  const polaroidsTex = useMemo<[THREE.CanvasTexture, THREE.CanvasTexture]>(
    () => [createPolaroidMemoryTexture(0), createPolaroidMemoryTexture(1)],
    [],
  );
  const ballPbr = useMemo(() => createSoccerBallPbrTextures(), []);

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
    const geo = new THREE.PlaneGeometry(0.2, 0.09, 4, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      pos.setZ(i, Math.sin(px * 22) * 0.022 + py * px * 0.8);
    }
    geo.computeVertexNormals();
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
      woodSlatPbr.map.dispose();
      woodSlatPbr.bumpMap.dispose();
      corkPbr.map.dispose();
      corkPbr.bumpMap.dispose();
      stickyNotesTex[0].dispose();
      stickyNotesTex[1].dispose();
      polaroidsTex[0].dispose();
      polaroidsTex[1].dispose();
      ballPbr.map.dispose();
      ballPbr.bumpMap.dispose();
      scoreboard.tex.dispose();
      confettiAssets.geo.dispose();
      confettiAssets.mat.dispose();
    };
  }, [
    benchWoodTex,
    woodSlatPbr,
    corkPbr,
    stickyNotesTex,
    polaroidsTex,
    ballPbr,
    scoreboard,
    confettiAssets,
  ]);

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
        <DrinkStallProp
          key={stall.id}
          spec={stall}
          isNight={isNight}
          woodSlatPbr={woodSlatPbr}
        />
      ))}

      {/* 3. Ba Bảng Lưu bút Sân trường */}
      {CAMPUS_MEMORY_BOARDS.map((board) => (
        <MemoryBoardProp
          key={board.id}
          spec={board}
          isNight={isNight}
          corkPbr={corkPbr}
          stickyNotesTex={stickyNotesTex}
          polaroidsTex={polaroidsTex}
        />
      ))}

      {/* 4. Quả bóng đá 3D tương tác & Bảng tỉ số LED SVĐ Bách Khoa */}
      <mesh
        ref={ballMeshRef}
        position={[CAMPUS_FOOTBALL_PITCH.center.x, BALL_RADIUS, CAMPUS_FOOTBALL_PITCH.center.z]}
        castShadow
      >
        <sphereGeometry args={[BALL_RADIUS, 28, 20]} />
        <meshStandardMaterial
          map={ballPbr.map}
          bumpMap={ballPbr.bumpMap}
          bumpScale={0.015}
          roughness={0.38}
          metalness={0.06}
        />
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
