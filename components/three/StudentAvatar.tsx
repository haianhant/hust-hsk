// ---------------------------------------------------------------------------
// StudentAvatar.tsx — Hệ thống Nhân vật & Đồng phục Sinh viên ĐHBK Hà Nội (Việc 2)
// Đặc tả kỹ thuật (docs/huong-dan-phat-trien.md §2):
//   1. Khớp cầu che kín điểm xoay (Ball-Joint Caps & Pelvis Bridge):
//      - Cầu khớp háng (hip ball-joint) tại (0,0,0) của hipRef + cầu nối Pelvis Bridge
//        → triệt tiêu hoàn toàn hiện tượng hở khe đùi/hông khi đi bộ, chạy hoặc lái xe.
//      - Cầu khớp gối (knee ball-joint), cầu khớp cổ chân + cổ tất cao (ankle sphere +
//        high sock cuff) nhúng sâu vào cổ giày → không bao giờ hở cổ chân.
//      - Cầu khớp vai (shoulder cap sphere) nối mượt thân áo với tay áo.
//   2. Hai mẫu nhân vật Nam ('male') & Nữ ('female') cân đối, tự nhiên:
//      - Chung hệ khung xương FigureJoints và chiều cao chuẩn ~1,707 m (đế giày y = 0).
//      - Khác biệt tinh tế về tỉ lệ vai/eo/hông/chân, đường nét khuôn mặt (lông mày,
//        hàng mi trên, sắc môi) và 6 kiểu tóc (short, swept, layered, ponytail, bob, bun)
//        cao gọn trên lông mày, không bao giờ che mắt.
//   3. Đồng phục HUST chuẩn thực tế:
//      - Mặc định 'windbreaker-hust': Áo khoác gió đồng phục ĐHBK Hà Nội (phối trắng kem
//        phần ngực trên/vai + đỏ Bách khoa phần thân dưới ngăn cách bởi đường cắt chữ V
//        chevron, cổ trụ đứng, nẹp khóa kéo dọc chính giữa, túi chéo, bo tay/gấu và
//        phù hiệu HUST ngực trái).
//      - 3 biến thể Bomber HUST: 'bomber-red-grey' (Đỏ–Ghi), 'bomber-navy-white' (Xanh–Trắng),
//        'bomber-red-navy' (Đỏ–Xanh) với cổ/bo tay dệt kim kẻ sọc thể thao & tay áo phối màu.
//      - Giữ đầy đủ 'polo-red', 'hoodie-hust', 'shirt-white', 'sport-pe' và tương thích
//        100% với NPC Minh (hoodie navy) & Cô giáo (shirt trắng).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  makeFabricTexture,
  makeHairStrandTexture,
  makeSoftShadowTexture,
} from './materials';
import type {
  AvatarGender,
  AvatarHairStyle,
  AvatarOutfitId,
} from '../../lib/playerState';

// Shared singleton textures for all human figures (Player + NPCs + AmbientLife)
let sharedAvatarTex: {
  hair: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
  shadow: THREE.CanvasTexture;
} | null = null;

function getSharedAvatarTextures() {
  if (!sharedAvatarTex) {
    sharedAvatarTex = {
      hair: makeHairStrandTexture(3, 3),
      shadow: makeSoftShadowTexture(),
    };
  }
  return sharedAvatarTex;
}

// --- Bảng màu chuẩn ----------------------------------------------------------
const POLO_RED = '#DA1E26';
const POLO_DARK = '#8F1418';
const HUST_CRIMSON = '#B5121B';
const HUST_CRIMSON_DARK = '#7F0D14';
const WINDBREAKER_WHITE = '#F4F6F9';
const BUTTON_DARK = '#5A0E12';
const NAVY = '#1F3A5F';
const NAVY_DARK = '#152A45';
const KHAKI = '#8A7B5C';
const SHIRT_WHITE = '#F5F5F0';
const SHIRT_DARK = '#D8D5CC';
const PANTS = '#232E3D';
const SHOE_WHITE = '#F5F5F5';
const SHOE_SOLE = '#222222';
const SKIN = '#ECC39E';
const SKIN_WARM = '#E3AF89';
const HAIR = '#1B1918';
const HAIR_HIGHLIGHT = '#2C2826';
const PACK_BLACK = '#1F2226';
const PACK_GRAY = '#5A5A52';
const PACK_GRAY_LIGHT = '#6E6E66';
const PACK_ZIP = '#4A4F55';
const WHITE = '#F5F5F5';
const SILVER = '#C0C0C0';
const SOCK = '#E8E2D5';

export interface FigureJoints {
  body: RefObject<THREE.Group>;
  armL: RefObject<THREE.Group>;
  armR: RefObject<THREE.Group>;
  elbowL: RefObject<THREE.Group>;
  elbowR: RefObject<THREE.Group>;
  legL: RefObject<THREE.Group>;
  legR: RefObject<THREE.Group>;
  kneeL: RefObject<THREE.Group>;
  kneeR: RefObject<THREE.Group>;
  footL: RefObject<THREE.Group>;
  footR: RefObject<THREE.Group>;
}

export type FigureVariant = 'polo' | 'hoodie' | 'shirt' | 'windbreaker' | 'bomber';
export type HairStyle = AvatarHairStyle;

export interface FigureProps {
  variant: FigureVariant;
  gender?: AvatarGender;
  shirt: string;
  shirtDark: string;
  /** Màu mảng ngực trên/vai (dùng cho áo khoác gió HUST trắng–đỏ) */
  upperYokeColor?: string;
  /** Màu tay áo phối riêng (dùng cho áo Bomber HUST) */
  sleeveColor?: string;
  pants: string;
  shoe: string;
  shoeSole: string;
  hairStyle: HairStyle;
  glasses?: boolean;
  lanyard?: boolean;
  wristwatch?: boolean;
  cap?: string;
  backpack?: boolean;
  backpackColors?: { pack: string; packLight: string; packZip: string };
  joints?: FigureJoints;
  showBackpack?: boolean;
}

/** Logo chữ HUST trắng dùng cho nền áo tối/đỏ */
function useHustTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 80);
      ctx.fillStyle = WHITE;
      ctx.font = '900 46px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HUST', 128, 42);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Logo HUST đỏ Bách khoa đặt trên mảng ngực trắng của Áo khoác gió đồng phục HUST */
function useHustCrimsonLogoTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 96);
      // Huy hiệu khiên nhỏ bên trái + chữ HUST đỏ đậm bên phải
      ctx.fillStyle = '#B5121B';
      ctx.beginPath();
      ctx.roundRect(14, 18, 46, 58, 10);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.font = '900 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BK', 37, 48);

      ctx.fillStyle = '#B5121B';
      ctx.font = '900 50px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HUST', 72, 50);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Phù hiệu tròn trắng-đỏ ĐHBK Hà Nội gắn trên bắp tay trái (ao-khoac-gio-do-chi-tiet-01.jpg, polo-do-nam-nu-01.jpg) */
function useHustSleeveBadgeTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      // Nền tròn trắng viền đỏ Bách khoa
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(64, 64, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B5121B';
      ctx.lineWidth = 8;
      ctx.stroke();
      // Vòng chấm chữ đỏ quanh viền trong
      ctx.strokeStyle = '#B5121B';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(64, 64, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Biểu trưng đỏ + sao vàng ở tâm
      ctx.fillStyle = '#B5121B';
      ctx.beginPath();
      ctx.arc(64, 64, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.font = '900 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BK', 64, 65);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texFromHook(texture);
}

function texFromHook(t: THREE.CanvasTexture): THREE.CanvasTexture {
  return t;
}

/** Texture Thẻ sinh viên Bách Khoa đeo trước ngực (HUST Student ID Card). */
function useStudentIdTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, 128, 192);
      ctx.fillStyle = '#DA1E26';
      ctx.fillRect(0, 0, 128, 38);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HUST', 64, 27);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(14, 50, 42, 54);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(35, 68, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(21, 82, 28, 18);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(66, 54, 48, 8);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(66, 70, 40, 6);
      ctx.fillRect(66, 82, 44, 6);
      ctx.fillStyle = '#0F172A';
      for (let x = 18; x < 110; x += 6) {
        ctx.fillRect(x, 122, 3, 18);
      }
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(0, 166, 128, 26);
      ctx.fillStyle = '#FACC15';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillText('SINH VIÊN BK', 64, 184);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Bàn tay: lòng bàn tay bo mềm + 4 ngón tay + ngón cái tự nhiên. */
function Hand({ side, scale = 1 }: { side: -1 | 1; scale?: number }) {
  return (
    <group scale={[scale, scale, scale]}>
      <mesh position={[0, -0.05, 0.005]} scale={[0.82, 1.15, 0.56]} castShadow>
        <sphereGeometry args={[0.05, 14, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>
      {[-0.024, -0.008, 0.008, 0.024].map((fx, i) => (
        <mesh key={i} position={[fx, -0.112, 0.008]}>
          <cylinderGeometry args={[0.0085, 0.0072, 0.044, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.68} />
        </mesh>
      ))}
      <mesh position={[-side * 0.042, -0.055, 0.014]} rotation={[0, 0, side * 0.55]}>
        <cylinderGeometry args={[0.011, 0.009, 0.038, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>
    </group>
  );
}

/** Một tay: có khớp cầu vai (shoulder ball-joint cap) tại (0,0,0) để khi vung tay không bao giờ hở vai/nách. */
function ArmSide({
  side,
  shoulderX,
  armScale,
  variant,
  shirt,
  shirtDark,
  upperYokeColor,
  sleeveColor,
  fabricTex,
  sleeveBadgeTex,
  wristwatch,
  shoulderRef,
  elbowRef,
}: {
  side: -1 | 1;
  shoulderX: number;
  armScale: number;
  variant: FigureVariant;
  shirt: string;
  shirtDark: string;
  upperYokeColor?: string;
  sleeveColor?: string;
  fabricTex: THREE.CanvasTexture;
  sleeveBadgeTex?: THREE.CanvasTexture;
  wristwatch?: boolean;
  shoulderRef?: RefObject<THREE.Group>;
  elbowRef?: RefObject<THREE.Group>;
}) {
  const short = variant === 'polo';
  const isWindbreaker = variant === 'windbreaker';
  const isBomber = variant === 'bomber';
  const topSleeveTone = isWindbreaker
    ? (upperYokeColor ?? WINDBREAKER_WHITE)
    : isBomber
      ? (sleeveColor ?? shirt)
      : shirt;
  const lowSleeveTone = isWindbreaker
    ? shirt
    : isBomber
      ? (sleeveColor ?? shirt)
      : shirt;

  return (
    <group ref={shoulderRef} position={[side * shoulderX, 1.29, 0]}>
      {/* Khớp cầu đầu vai (Shoulder Ball-Joint Cap) lấp kín 100% khe vai ở mọi góc vung tay */}
      <mesh position={[0, 0.006, 0]} scale={[armScale, 1, armScale]} castShadow>
        <sphereGeometry args={[0.061, 14, 12]} />
        <meshStandardMaterial color={topSleeveTone} map={fabricTex} roughness={0.82} />
      </mesh>

      {/* Phù hiệu tròn trắng-đỏ ĐHBK Hà Nội gắn ở mặt ngoài bắp tay trái (side === 1)
          theo đúng ảnh thật ao-khoac-gio-do-chi-tiet-01.jpg & polo-do-nam-nu-01.jpg */}
      {side === 1 && sleeveBadgeTex && (isWindbreaker || short || isBomber) && (
        <mesh
          position={[0.058 * armScale, -0.088, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <circleGeometry args={[0.024, 18]} />
          <meshStandardMaterial map={sleeveBadgeTex} roughness={0.6} />
        </mesh>
      )}

      {short ? (
        <group>
          {/* Tay áo ngắn polo + bo tay trắng */}
          <mesh position={[0, -0.075, 0]} scale={[armScale, 1, armScale]} castShadow>
            <cylinderGeometry args={[0.058, 0.053, 0.15, 16]} />
            <meshStandardMaterial color={shirt} map={fabricTex} roughness={0.84} />
          </mesh>
          <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[armScale, armScale, 1]}>
            <torusGeometry args={[0.053, 0.007, 8, 18]} />
            <meshStandardMaterial color={WHITE} roughness={0.82} />
          </mesh>
          {/* Bắp tay da */}
          <mesh position={[0, -0.205, 0]} scale={[armScale, 1, armScale]} castShadow>
            <cylinderGeometry args={[0.048, 0.044, 0.11, 14]} />
            <meshStandardMaterial color={SKIN} roughness={0.68} />
          </mesh>
        </group>
      ) : (
        <group>
          {/* Bắp tay trên (từ vai xuống khuỷu y = 0..-0.26) */}
          <mesh position={[0, -0.13, 0]} scale={[armScale, 1, armScale]} castShadow>
            <cylinderGeometry args={[0.059, 0.052, 0.26, 16]} />
            <meshStandardMaterial color={topSleeveTone} map={fabricTex} roughness={0.8} />
          </mesh>
          {/* Đường viền chuyển màu + sọc trắng dọc ống tay Áo khoác gió HUST (ao-khoac-gio-do-chi-tiet-01.jpg) */}
          {isWindbreaker && (
            <>
              <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[armScale, armScale, 1]}>
                <torusGeometry args={[0.053, 0.005, 8, 16]} />
                <meshStandardMaterial color="#1E293B" roughness={0.75} />
              </mesh>
              <mesh position={[side * 0.054 * armScale, -0.13, 0]}>
                <boxGeometry args={[0.006, 0.23, 0.012]} />
                <meshStandardMaterial color={WHITE} roughness={0.75} />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Khớp cầu khuỷu tay (Elbow Ball-Joint Cap) */}
      <mesh position={[0, -0.26, 0]} scale={[armScale, armScale, armScale]}>
        <sphereGeometry args={[short ? 0.045 : 0.051, 14, 12]} />
        <meshStandardMaterial color={short ? SKIN : lowSleeveTone} map={short ? undefined : fabricTex} roughness={0.8} />
      </mesh>

      {/* Cẳng tay xoay quanh khuỷu (y = -0.26) — khi tay áo dài, phần ống tay dưới đi theo khớp khuỷu! */}
      <group ref={elbowRef} position={[0, -0.26, 0]}>
        {short ? (
          <mesh position={[0, -0.12, 0]} scale={[armScale, 1, armScale]} castShadow>
            <cylinderGeometry args={[0.044, 0.036, 0.24, 14]} />
            <meshStandardMaterial color={SKIN} roughness={0.68} />
          </mesh>
        ) : (
          <group>
            {/* Ống tay áo dưới đi theo cẳng tay để khi gập khuỷu không bao giờ xuyên/gãy ống tay */}
            <mesh position={[0, -0.105, 0]} scale={[armScale, 1, armScale]} castShadow>
              <cylinderGeometry args={[0.05, 0.044, 0.21, 16]} />
              <meshStandardMaterial color={lowSleeveTone} map={fabricTex} roughness={0.82} />
            </mesh>
            {/* Bo cổ tay áo khoác gió / bomber / hoodie */}
            <mesh position={[0, -0.218, 0]} scale={[armScale, 1, armScale]} castShadow>
              <cylinderGeometry args={[0.045, 0.042, 0.034, 16]} />
              <meshStandardMaterial color={shirtDark} roughness={0.86} />
            </mesh>
            {isBomber && (
              <mesh position={[0, -0.218, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[armScale, armScale, 1]}>
                <torusGeometry args={[0.044, 0.0035, 8, 16]} />
                <meshStandardMaterial color={WHITE} roughness={0.8} />
              </mesh>
            )}
          </group>
        )}

        {/* Đồng hồ đeo tay sinh viên ở cổ tay trái (side === 1) */}
        {wristwatch && side === 1 && (
          <group position={[0, -0.228, 0]} scale={[armScale, 1, armScale]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.037, 0.0055, 8, 16]} />
              <meshStandardMaterial color="#27272A" roughness={0.6} />
            </mesh>
            <mesh position={[0.036, 0, 0.01]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.016, 0.016, 0.008, 12]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        )}
        <group position={[0, -0.24, 0]}>
          <Hand side={side} scale={armScale} />
        </group>
      </group>
    </group>
  );
}

/** Một chân: có khớp cầu háng (Hip Ball-Joint), khớp cầu gối (Knee Ball-Joint),
 *  khớp cầu cổ chân + cổ tất cao (Ankle Sphere + High Sock Cuff) che kín 100% khe hở.
 *  Đế giày dưới cùng chạm đúng y = 0,000 để giữ chuẩn measureAvatar. */
function LegSide({
  side,
  hipX,
  legScale,
  pants,
  shoe,
  shoeSole,
  fabricTex,
  hipRef,
  kneeRef,
  footRef,
}: {
  side: -1 | 1;
  hipX: number;
  legScale: number;
  pants: string;
  shoe: string;
  shoeSole: string;
  fabricTex: THREE.CanvasTexture;
  hipRef?: RefObject<THREE.Group>;
  kneeRef?: RefObject<THREE.Group>;
  footRef?: RefObject<THREE.Group>;
}) {
  return (
    <group ref={hipRef} position={[side * hipX, 0.8, 0]}>
      {/* KHỚP CẦU HÁNG (Hip Ball-Joint Cap) đặt đúng tâm xoay (0,0,0) — không bao giờ hở háng */}
      <mesh position={[0, 0.01, 0]} scale={[legScale, 1.05, legScale]} castShadow>
        <sphereGeometry args={[0.102, 16, 14]} />
        <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
      </mesh>

      {/* Đùi thuôn xuống gối (nhúng sâu vào cả cầu háng trên và cầu gối dưới) */}
      <mesh position={[0, -0.19, 0]} scale={[legScale, 1, legScale]} castShadow>
        <cylinderGeometry args={[0.1, 0.084, 0.39, 16]} />
        <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
      </mesh>
      {/* Sọc trắng chạy dọc mép ngoài đùi quần thể thao xanh than (ao-khoac-gio-do-nhom-01.jpg, polo-do-nam-nu-01.jpg) */}
      <mesh position={[side * 0.091 * legScale, -0.19, 0]} rotation={[0, 0, -side * 0.04]}>
        <boxGeometry args={[0.008, 0.36, 0.018]} />
        <meshStandardMaterial color={WHITE} roughness={0.78} />
      </mesh>

      {/* KHỚP CẦU GỐI (Knee Ball-Joint Cap) tại tâm xoay gối (0, -0.38, 0) */}
      <mesh position={[0, -0.38, 0]} scale={[legScale, legScale, legScale]}>
        <sphereGeometry args={[0.083, 14, 12]} />
        <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
      </mesh>

      {/* Cẳng chân xoay quanh gối (y = 0,42) */}
      <group ref={kneeRef} position={[0, -0.38, 0]}>
        <mesh position={[0, -0.165, 0]} scale={[legScale, 1, legScale]} castShadow>
          <cylinderGeometry args={[0.082, 0.064, 0.34, 16]} />
          <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
        </mesh>
        {/* Sọc trắng chạy dọc mép ngoài ống quần dưới */}
        <mesh position={[side * 0.073 * legScale, -0.165, 0]} rotation={[0, 0, -side * 0.05]}>
          <boxGeometry args={[0.008, 0.31, 0.016]} />
          <meshStandardMaterial color={WHITE} roughness={0.78} />
        </mesh>
        {/* Gấu quần gấp lai ôm cổ chân */}
        <mesh position={[0, -0.318, 0]} scale={[legScale, 1, legScale]} castShadow>
          <cylinderGeometry args={[0.067, 0.065, 0.042, 16]} />
          <meshStandardMaterial color={pants} roughness={0.88} />
        </mesh>
        {/* Cổ tất thể thao cao + Cầu khớp cổ chân (nhúng sâu từ y=-0.305 xuống y=-0.365 xuyên vào cổ giày) */}
        <mesh position={[0, -0.335, 0]} scale={[legScale, 1, legScale]}>
          <cylinderGeometry args={[0.054, 0.054, 0.062, 14]} />
          <meshStandardMaterial color={SOCK} roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.35, 0]} scale={[legScale, legScale, legScale]}>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshStandardMaterial color={SOCK} roughness={0.82} />
        </mesh>

        {/* Bàn chân Sneaker 3D tại cổ chân (y 0,07; mặt đáy đế giày ở -0,07 -> world y = 0,000) */}
        <group ref={footRef} position={[0, -0.35, 0]}>
          {/* Cổ giày ôm cao quanh khớp cổ chân (chống hở khi gập cổ chân) */}
          <mesh position={[0, 0.004, -0.01]} scale={[legScale, 1, 1]} castShadow>
            <cylinderGeometry args={[0.062, 0.068, 0.038, 14]} />
            <meshStandardMaterial color={shoe} roughness={0.68} />
          </mesh>
          {/* Đế ngoài (Outsole) chống trượt */}
          <mesh position={[0, -0.055, 0.03]} castShadow>
            <boxGeometry args={[0.16 * legScale, 0.03, 0.3]} />
            <meshStandardMaterial color={shoeSole} roughness={0.9} />
          </mesh>
          {/* Đế giữa (Midsole) viền sáng */}
          <mesh position={[0, -0.038, 0.03]} castShadow>
            <boxGeometry args={[0.156 * legScale, 0.014, 0.29]} />
            <meshStandardMaterial color="#EAEAEA" roughness={0.75} />
          </mesh>
          {/* Thân giày chính (Upper) */}
          <mesh position={[0, -0.02, 0.028]} castShadow>
            <boxGeometry args={[0.15 * legScale, 0.052, 0.255]} />
            <meshStandardMaterial color={shoe} roughness={0.65} />
          </mesh>
          {/* Mũi giày bo tròn */}
          <mesh position={[0, -0.032, 0.135]} scale={[legScale, 0.6, 1]} castShadow>
            <sphereGeometry args={[0.062, 14, 10]} />
            <meshStandardMaterial color={shoe} roughness={0.65} />
          </mesh>
          {/* Lưỡi gà (Tongue) & miếng đệm gót đỏ HUST */}
          <mesh position={[0, 0.01, 0.055]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.078 * legScale, 0.034, 0.018]} />
            <meshStandardMaterial color={shoe} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.012, -0.098]}>
            <boxGeometry args={[0.09 * legScale, 0.034, 0.012]} />
            <meshStandardMaterial color={POLO_RED} roughness={0.6} />
          </mesh>
          {/* 3 vạch dây giày thể thao */}
          {[0.058, 0.085, 0.112].map((lz, idx) => (
            <mesh key={idx} position={[0, 0.005, lz]}>
              <boxGeometry args={[0.086 * legScale, 0.007, 0.014]} />
              <meshStandardMaterial color={shoeSole} roughness={0.75} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Dây đeo thẻ sinh viên Bách Khoa (HUST Lanyard + Student ID Badge) trước ngực. */
function HustStudentLanyard({ idTex }: { idTex: THREE.CanvasTexture }) {
  return (
    <group>
      <mesh position={[-0.036, 1.24, 0.15]} rotation={[0.08, 0, -0.26]}>
        <boxGeometry args={[0.016, 0.21, 0.006]} />
        <meshStandardMaterial color={POLO_RED} roughness={0.75} />
      </mesh>
      <mesh position={[0.036, 1.24, 0.15]} rotation={[0.08, 0, 0.26]}>
        <boxGeometry args={[0.016, 0.21, 0.006]} />
        <meshStandardMaterial color={POLO_RED} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.135, 0.16]}>
        <boxGeometry args={[0.018, 0.018, 0.008]} />
        <meshStandardMaterial color={SILVER} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.07, 0.161]} castShadow>
        <boxGeometry args={[0.068, 0.098, 0.006]} />
        <meshStandardMaterial color="#1E3A8A" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.07, 0.166]}>
        <planeGeometry args={[0.06, 0.09]} />
        <meshStandardMaterial map={idTex} roughness={0.45} />
      </mesh>
    </group>
  );
}

/** Thân áo: cầu nối hông (Pelvis Bridge) + eo/ngực theo giới tính + chi tiết Áo khoác gió HUST / Bomber / Polo / Hoodie / Sơ mi. */
function Torso({
  variant,
  gender = 'male',
  shirt,
  shirtDark,
  upperYokeColor,
  pants,
  hustTex,
  hustCrimsonTex,
  idTex,
  fabricTex,
  lanyard,
}: {
  variant: FigureVariant;
  gender?: AvatarGender;
  shirt: string;
  shirtDark: string;
  upperYokeColor?: string;
  pants: string;
  hustTex: THREE.CanvasTexture;
  hustCrimsonTex: THREE.CanvasTexture;
  idTex: THREE.CanvasTexture;
  fabricTex: THREE.CanvasTexture;
  lanyard?: boolean;
}) {
  const isFemale = gender === 'female';
  const torsoScaleX = isFemale ? 0.92 : 1.02;
  const waistScaleX = isFemale ? 0.85 : 1.0;
  const hipScaleX = isFemale ? 0.98 : 1.0;
  const isWindbreaker = variant === 'windbreaker';
  const isBomber = variant === 'bomber';
  const topColor = isWindbreaker ? (upperYokeColor ?? WINDBREAKER_WHITE) : shirt;

  return (
    <group>
      {/* KHỐI CẦU NỐI HÔNG – ĐÙI (Pelvis Bridge) phủ kín từ y=0.76..0.88 để nối liền đáy thân với 2 khớp đùi */}
      <mesh position={[0, 0.84, 0]} scale={[hipScaleX, 0.62, 0.74]} castShadow>
        <sphereGeometry args={[0.202, 18, 14]} />
        <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.805, 0]} scale={[hipScaleX, 1, 0.72]} castShadow>
        <cylinderGeometry args={[0.194, 0.186, 0.09, 18]} />
        <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
      </mesh>

      {/* Phần bụng & eo (y = 0.84..1.10) */}
      <mesh position={[0, 0.97, 0]} scale={[waistScaleX, 1, 0.71]} castShadow>
        <cylinderGeometry args={[0.192, 0.198, 0.25, 20]} />
        <meshStandardMaterial color={shirt} map={fabricTex} roughness={0.82} />
      </mesh>

      {/* Phần ngực trên (y = 1.09..1.30): nếu là Áo khoác gió HUST thì nửa trên màu trắng kem */}
      <mesh position={[0, 1.195, 0]} scale={[torsoScaleX, 1, 0.73]} castShadow>
        <cylinderGeometry args={[0.186, 0.194, 0.22, 20]} />
        <meshStandardMaterial color={topColor} map={fabricTex} roughness={0.8} />
      </mesh>

      {/* Đường nét ngực tinh tế, lịch sự cho mẫu nhân vật Nữ */}
      {isFemale && (
        <mesh position={[0, 1.155, 0.042]} scale={[1.15, 0.72, 0.68]} castShadow>
          <sphereGeometry args={[0.118, 16, 12]} />
          <meshStandardMaterial color={isWindbreaker ? shirt : topColor} map={fabricTex} roughness={0.82} />
        </mesh>
      )}

      {/* Phễu vai dốc mềm mại nối ra 2 khớp vai */}
      <mesh position={[0, 1.302, 0]} scale={[torsoScaleX, 1, 0.72]} castShadow>
        <cylinderGeometry args={[0.142, 0.192, 0.08, 20]} />
        <meshStandardMaterial color={topColor} map={fabricTex} roughness={0.8} />
      </mesh>

      {/* Gấu áo / bo chun gấu áo */}
      <mesh position={[0, 0.845, 0]} scale={[hipScaleX, 1, 0.71]} castShadow>
        <cylinderGeometry args={[0.198, 0.2, 0.038, 20]} />
        <meshStandardMaterial color={shirtDark} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.828, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[hipScaleX, 0.71, 1]}>
        <torusGeometry args={[0.198, 0.008, 8, 20]} />
        <meshStandardMaterial color={shirtDark} roughness={0.86} />
      </mesh>

      {/* --- 1. ÁO KHOÁC GIÓ ĐỒNG PHỤC HUST (Mặc định cho cả Nam và Nữ) --- */}
      {isWindbreaker && (
        <group>
          {/* Hai cánh đường cắt chữ V (Chevron V-Seam) trước ngực phân tách mảng trắng trên & đỏ HUST dưới */}
          <mesh position={[-0.068, 1.115, 0.138]} rotation={[0.06, -0.22, -0.34]}>
            <boxGeometry args={[0.155, 0.018, 0.012]} />
            <meshStandardMaterial color="#1E293B" roughness={0.65} />
          </mesh>
          <mesh position={[0.068, 1.115, 0.138]} rotation={[0.06, 0.22, 0.34]}>
            <boxGeometry args={[0.155, 0.018, 0.012]} />
            <meshStandardMaterial color="#1E293B" roughness={0.65} />
          </mesh>
          {/* Đường cắt ngang sau lưng nối 2 mảng trắng – đỏ */}
          <mesh position={[0, 1.115, -0.138]}>
            <boxGeometry args={[0.31, 0.016, 0.01]} />
            <meshStandardMaterial color="#1E293B" roughness={0.65} />
          </mesh>

          {/* Cổ trụ đứng (Stand Collar) đặc trưng áo khoác gió Bách khoa */}
          <mesh position={[0, 1.352, -0.004]} castShadow>
            <cylinderGeometry args={[0.078, 0.088, 0.056, 18]} />
            <meshStandardMaterial color={topColor} roughness={0.78} />
          </mesh>
          {/* Lớp lót cổ trong màu tối */}
          <mesh position={[0, 1.366, -0.004]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.076, 0.006, 8, 18]} />
            <meshStandardMaterial color="#1E293B" roughness={0.75} />
          </mesh>

          {/* Nẹp khóa kéo dọc chính giữa thân trước (Center Storm-Flap Zipper) */}
          <mesh position={[0, 1.095, 0.143]}>
            <boxGeometry args={[0.022, 0.53, 0.01]} />
            <meshStandardMaterial color="#1E293B" roughness={0.55} metalness={0.25} />
          </mesh>
          {/* Đầu kéo khóa kim loại bạc */}
          <mesh position={[0, 1.29, 0.151]}>
            <boxGeometry args={[0.012, 0.024, 0.008]} />
            <meshStandardMaterial color={SILVER} roughness={0.3} metalness={0.8} />
          </mesh>

          {/* Hai túi chéo hai bên hông có nẹp viền */}
          {[-0.105, 0.105].map((px, idx) => (
            <mesh
              key={`wb-pocket-${idx}`}
              position={[px, 0.945, 0.132]}
              rotation={[0, px > 0 ? -0.35 : 0.35, px > 0 ? -0.22 : 0.22]}
            >
              <boxGeometry args={[0.016, 0.115, 0.01]} />
              <meshStandardMaterial color={shirtDark} roughness={0.75} />
            </mesh>
          ))}

          {/* Phù hiệu chữ HUST đỏ trên mảng trắng ngực trái (+X) */}
          <mesh position={[0.068, 1.225, 0.142]} rotation={[0, 0.38, 0]}>
            <planeGeometry args={[0.088, 0.033]} />
            <meshStandardMaterial map={hustCrimsonTex} transparent roughness={0.65} />
          </mesh>
        </group>
      )}

      {/* --- 2. ÁO KHOÁC BOMBER HUST (3 biến thể Đỏ-Ghi, Xanh-Trắng, Đỏ-Xanh) --- */}
      {isBomber && (
        <group>
          {/* Cổ dệt kim bo tròn kiểu Varsity Bomber có sọc trắng */}
          <mesh position={[0, 1.348, 0]}>
            <cylinderGeometry args={[0.078, 0.088, 0.046, 18]} />
            <meshStandardMaterial color={shirtDark} roughness={0.84} />
          </mesh>
          <mesh position={[0, 1.362, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.079, 0.0045, 8, 18]} />
            <meshStandardMaterial color={WHITE} roughness={0.8} />
          </mesh>
          {/* Sọc trắng trên bo gấu áo bomber */}
          <mesh position={[0, 0.845, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[hipScaleX, 0.72, 1]}>
            <torusGeometry args={[0.199, 0.0045, 8, 20]} />
            <meshStandardMaterial color={WHITE} roughness={0.8} />
          </mesh>
          {/* Khóa kéo kim loại dọc chính giữa thân áo bomber */}
          <mesh position={[0, 1.09, 0.143]}>
            <boxGeometry args={[0.018, 0.51, 0.01]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.35} metalness={0.75} />
          </mesh>
          {/* 2 túi chéo viền trắng/ghi đặc trưng áo bomber */}
          {[-0.105, 0.105].map((px, idx) => (
            <mesh
              key={`bomber-pocket-${idx}`}
              position={[px, 0.945, 0.133]}
              rotation={[0, px > 0 ? -0.35 : 0.35, px > 0 ? -0.24 : 0.24]}
            >
              <boxGeometry args={[0.018, 0.11, 0.01]} />
              <meshStandardMaterial color={WHITE} roughness={0.75} />
            </mesh>
          ))}
          {/* Chữ HUST ngực trái */}
          <mesh position={[0.068, 1.22, 0.142]} rotation={[0, 0.38, 0]}>
            <planeGeometry args={[0.084, 0.028]} />
            <meshStandardMaterial map={hustTex} transparent roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* --- 3. ÁO POLO ĐỎ BÁCH KHOA / ĐỒ THỂ CHẤT --- */}
      {variant === 'polo' && (
        <group>
          <mesh position={[0, 1.345, 0]}>
            <cylinderGeometry args={[0.078, 0.088, 0.04, 16]} />
            <meshStandardMaterial color={shirt} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.366, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.078, 0.006, 8, 16]} />
            <meshStandardMaterial color={WHITE} roughness={0.82} />
          </mesh>
          <mesh position={[0, 1.326, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.086, 0.004, 8, 16]} />
            <meshStandardMaterial color={POLO_DARK} roughness={0.85} />
          </mesh>
          <mesh position={[-0.048, 1.335, 0.062]} rotation={[0.55, 0, 0.38]}>
            <boxGeometry args={[0.085, 0.05, 0.008]} />
            <meshStandardMaterial color={shirt} roughness={0.85} />
          </mesh>
          <mesh position={[0.048, 1.335, 0.062]} rotation={[0.55, 0, -0.38]}>
            <boxGeometry args={[0.085, 0.05, 0.008]} />
            <meshStandardMaterial color={shirt} roughness={0.85} />
          </mesh>
          <mesh position={[-0.048, 1.312, 0.075]} rotation={[0.55, 0, 0.38]}>
            <boxGeometry args={[0.082, 0.007, 0.009]} />
            <meshStandardMaterial color={WHITE} roughness={0.82} />
          </mesh>
          <mesh position={[0.048, 1.312, 0.075]} rotation={[0.55, 0, -0.38]}>
            <boxGeometry args={[0.082, 0.007, 0.009]} />
            <meshStandardMaterial color={WHITE} roughness={0.82} />
          </mesh>
          <mesh position={[0, 1.265, 0.142]}>
            <boxGeometry args={[0.05, 0.14, 0.012]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          {[1.3, 1.235].map((by) => (
            <mesh key={by} position={[0, by, 0.149]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.008, 10]} />
              <meshStandardMaterial color={BUTTON_DARK} roughness={0.55} />
            </mesh>
          ))}
          <mesh position={[0.065, 1.22, 0.138]} rotation={[0, 0.45, 0]}>
            <planeGeometry args={[0.08, 0.025]} />
            <meshStandardMaterial map={hustTex} transparent roughness={0.75} />
          </mesh>
        </group>
      )}

      {/* --- 4. ÁO HOODIE (Dùng cho NPC Minh & Hoodie HUST) --- */}
      {variant === 'hoodie' && (
        <group>
          <mesh position={[0, 0.94, 0.155]} castShadow>
            <boxGeometry args={[0.28, 0.18, 0.032]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          <mesh position={[0, 1.03, 0.168]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.26, 10]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          <mesh position={[0, 1.345, 0]}>
            <cylinderGeometry args={[0.08, 0.09, 0.05, 16]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          <mesh position={[-0.045, 1.26, 0.15]} rotation={[0, 0, 0.06]}>
            <cylinderGeometry args={[0.006, 0.006, 0.11, 6]} />
            <meshStandardMaterial color={WHITE} roughness={0.8} />
          </mesh>
          <mesh position={[0.045, 1.26, 0.15]} rotation={[0, 0, -0.06]}>
            <cylinderGeometry args={[0.006, 0.006, 0.11, 6]} />
            <meshStandardMaterial color={WHITE} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.36, -0.1]} scale={[1.05, 0.5, 0.75]} castShadow>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
          <mesh position={[0.065, 1.22, 0.138]} rotation={[0, 0.45, 0]}>
            <planeGeometry args={[0.08, 0.025]} />
            <meshStandardMaterial map={hustTex} transparent roughness={0.75} />
          </mesh>
        </group>
      )}

      {/* --- 5. ÁO SƠ MI TRẮNG (Dùng cho Cô giáo & Sơ mi SV) --- */}
      {variant === 'shirt' && (
        <group>
          <mesh position={[0, 1.345, 0]}>
            <cylinderGeometry args={[0.078, 0.088, 0.04, 16]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          <mesh position={[-0.048, 1.335, 0.062]} rotation={[0.55, 0, 0.38]}>
            <boxGeometry args={[0.085, 0.05, 0.008]} />
            <meshStandardMaterial color={shirt} roughness={0.86} />
          </mesh>
          <mesh position={[0.048, 1.335, 0.062]} rotation={[0.55, 0, -0.38]}>
            <boxGeometry args={[0.085, 0.05, 0.008]} />
            <meshStandardMaterial color={shirt} roughness={0.86} />
          </mesh>
          {[1.31, 1.19, 1.07, 0.95].map((by, i) => (
            <mesh key={i} position={[0, by, 0.148]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshStandardMaterial color="#E8E4D8" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[-0.11, 1.17, 0.135]}>
            <boxGeometry args={[0.095, 0.105, 0.014]} />
            <meshStandardMaterial color={shirt} roughness={0.86} />
          </mesh>
          <mesh position={[-0.11, 1.23, 0.143]} rotation={[0, 0, 0.08]}>
            <cylinderGeometry args={[0.006, 0.006, 0.055, 6]} />
            <meshStandardMaterial color="#1F3A5F" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[hipScaleX, 0.71, 1]}>
            <torusGeometry args={[0.196, 0.013, 8, 20]} />
            <meshStandardMaterial color="#1A1A1A" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.86, 0.14]}>
            <boxGeometry args={[0.038, 0.024, 0.01]} />
            <meshStandardMaterial color={SILVER} roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      )}

      {/* Dây đeo thẻ sinh viên Bách Khoa */}
      {lanyard && <HustStudentLanyard idTex={idTex} />}
    </group>
  );
}

/** Đầu + cổ + khuôn mặt biểu cảm theo giới tính + 6 kiểu tóc tạo khối (short, swept, layered, ponytail, bob, bun).
 *  Đỉnh vòm tóc giữ đúng cao độ y = 1,707 m để tương thích 100% với measureAvatar. */
function Head({
  gender = 'male',
  hairStyle,
  glasses,
  cap,
}: {
  gender?: AvatarGender;
  hairStyle: HairStyle;
  glasses?: boolean;
  cap?: string;
}) {
  const isFemale = gender === 'female';
  const eyelidLRef = useRef<THREE.Mesh>(null!);
  const eyelidRRef = useRef<THREE.Mesh>(null!);
  const { hair: hairPbr } = useMemo(() => getSharedAvatarTextures(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycle = t % 3.4;
    const blink = cycle < 0.14 ? Math.sin((cycle / 0.14) * Math.PI) : 0;
    const scaleY = 0.22 + blink * 0.85;
    if (eyelidLRef.current) eyelidLRef.current.scale.y = scaleY;
    if (eyelidRRef.current) eyelidRRef.current.scale.y = scaleY;
  });

  return (
    <group>
      {/* Cổ nối tự nhiên đầu – thân */}
      <mesh position={[0, 1.385, 0]} castShadow>
        <cylinderGeometry args={[isFemale ? 0.045 : 0.05, isFemale ? 0.051 : 0.056, 0.11, 14]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>
      {/* Đầu chính: cầu r 0,108, nữ thon gọn hơn nhẹ ở xương hàm */}
      <mesh position={[0, 1.555, 0]} scale={[isFemale ? 0.89 : 0.92, 1.16, 0.96]} castShadow>
        <sphereGeometry args={[0.108, 28, 20]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>

      {/* --- Tóc nền đa lớp & 6 kiểu tóc tạo khối (cao thoáng trên lông mày, không bao giờ che mắt) --- */}
      <mesh position={[0, 1.566, -0.008]} rotation={[-0.32, 0, 0]} scale={[0.98, 1.22, 1.04]} castShadow>
        <sphereGeometry args={[0.115, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.44]} />
        <meshStandardMaterial
          color={HAIR}
          map={hairPbr.map}
          bumpMap={hairPbr.bumpMap}
          bumpScale={0.008}
          roughness={0.72}
        />
      </mesh>
      <mesh position={[0, 1.558, -0.038]} rotation={[0.15, 0, 0]} scale={[0.97, 1.15, 0.78]} castShadow>
        <sphereGeometry args={[0.114, 24, 18]} />
        <meshStandardMaterial
          color={HAIR}
          map={hairPbr.map}
          bumpMap={hairPbr.bumpMap}
          bumpScale={0.008}
          roughness={0.74}
        />
      </mesh>
      <mesh position={[0, 1.668, -0.004]} scale={[0.88, 0.36, 0.88]} castShadow>
        <sphereGeometry args={[0.106, 20, 14]} />
        <meshStandardMaterial
          color={HAIR}
          map={hairPbr.map}
          bumpMap={hairPbr.bumpMap}
          bumpScale={0.008}
          roughness={0.7}
        />
      </mesh>
      <mesh position={[-0.022, 1.678, 0.008]} rotation={[0.06, 0, 0.16]} scale={[0.42, 0.22, 0.62]}>
        <sphereGeometry args={[0.084, 14, 10]} />
        <meshStandardMaterial
          color={HAIR_HIGHLIGHT}
          map={hairPbr.map}
          bumpMap={hairPbr.bumpMap}
          bumpScale={0.006}
          roughness={0.66}
        />
      </mesh>
      <mesh position={[0.024, 1.676, 0.006]} rotation={[0.06, 0, -0.15]} scale={[0.42, 0.22, 0.62]}>
        <sphereGeometry args={[0.084, 14, 10]} />
        <meshStandardMaterial
          color={HAIR}
          map={hairPbr.map}
          bumpMap={hairPbr.bumpMap}
          bumpScale={0.006}
          roughness={0.72}
        />
      </mesh>
      {[-0.094, 0.094].map((sx, idx) => (
        <mesh
          key={`sideburn-${idx}`}
          position={[sx, 1.576, 0.012]}
          rotation={[0.08, 0, sx > 0 ? -0.08 : 0.08]}
          scale={[0.28, 0.68, 0.38]}
        >
          <sphereGeometry args={[0.048, 12, 10]} />
          <meshStandardMaterial
            color={HAIR}
            map={hairPbr.map}
            bumpMap={hairPbr.bumpMap}
            bumpScale={0.006}
            roughness={0.74}
          />
        </mesh>
      ))}

      {hairStyle === 'short' && (
        <group>
          <mesh position={[0, 1.65, 0.052]} rotation={[-0.12, 0, 0]} scale={[1.14, 0.42, 0.62]}>
            <sphereGeometry args={[0.076, 18, 12]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.72}
            />
          </mesh>
          <mesh position={[-0.028, 1.636, 0.082]} rotation={[0.15, 0, 0.18]} scale={[0.58, 0.36, 0.38]}>
            <sphereGeometry args={[0.048, 12, 10]} />
            <meshStandardMaterial
              color={HAIR_HIGHLIGHT}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.68}
            />
          </mesh>
          <mesh position={[0.028, 1.638, 0.082]} rotation={[0.15, 0, -0.15]} scale={[0.58, 0.36, 0.38]}>
            <sphereGeometry args={[0.048, 12, 10]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.72}
            />
          </mesh>
        </group>
      )}

      {hairStyle === 'swept' && (
        <group>
          <mesh position={[0.016, 1.65, 0.052]} rotation={[-0.12, 0, -0.14]} scale={[1.16, 0.42, 0.62]}>
            <sphereGeometry args={[0.076, 18, 12]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.72}
            />
          </mesh>
          <mesh position={[-0.032, 1.636, 0.08]} rotation={[0.14, 0, 0.24]} scale={[0.62, 0.34, 0.38]}>
            <sphereGeometry args={[0.048, 12, 10]} />
            <meshStandardMaterial
              color={HAIR_HIGHLIGHT}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.68}
            />
          </mesh>
        </group>
      )}

      {hairStyle === 'layered' && (
        <group>
          {/* Kiểu tóc Layer bồng bềnh trẻ trung (rẽ ngôi giữa thoáng trán, ôm gọn hai bên tai) */}
          <mesh position={[-0.036, 1.644, 0.068]} rotation={[0.1, 0, 0.32]} scale={[0.72, 0.4, 0.46]}>
            <sphereGeometry args={[0.054, 14, 10]} />
            <meshStandardMaterial
              color={HAIR_HIGHLIGHT}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.68}
            />
          </mesh>
          <mesh position={[0.036, 1.644, 0.068]} rotation={[0.1, 0, -0.32]} scale={[0.72, 0.4, 0.46]}>
            <sphereGeometry args={[0.054, 14, 10]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.72}
            />
          </mesh>
          {[-0.092, 0.092].map((lx, idx) => (
            <mesh
              key={`layer-side-${idx}`}
              position={[lx, 1.545, -0.015]}
              scale={[0.32, 0.88, 0.56]}
            >
              <sphereGeometry args={[0.058, 12, 10]} />
              <meshStandardMaterial
                color={HAIR}
                map={hairPbr.map}
                bumpMap={hairPbr.bumpMap}
                bumpScale={0.006}
                roughness={0.72}
              />
            </mesh>
          ))}
        </group>
      )}

      {hairStyle === 'bun' && (
        <group>
          <mesh position={[0, 1.65, 0.05]} rotation={[-0.12, 0, 0]} scale={[1.12, 0.4, 0.6]}>
            <sphereGeometry args={[0.074, 16, 12]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.72}
            />
          </mesh>
          <mesh position={[0, 1.615, -0.145]} scale={[1, 0.9, 0.9]} castShadow>
            <sphereGeometry args={[0.068, 14, 12]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.008}
              roughness={0.74}
            />
          </mesh>
          <mesh position={[0, 1.625, -0.145]} rotation={[0, 0, Math.PI / 2 - 0.18]}>
            <cylinderGeometry args={[0.007, 0.005, 0.19, 8]} />
            <meshStandardMaterial color="#5C3820" roughness={0.55} />
          </mesh>
          <mesh position={[0.09, 1.655, -0.145]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#D6B265" roughness={0.45} metalness={0.3} />
          </mesh>
        </group>
      )}

      {hairStyle === 'ponytail' && (
        <group>
          <mesh position={[0, 1.65, 0.052]} rotation={[-0.12, 0, 0]} scale={[1.14, 0.4, 0.6]}>
            <sphereGeometry args={[0.075, 16, 12]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.72}
            />
          </mesh>
          <mesh position={[0, 1.56, -0.118]} rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[0.026, 0.0075, 8, 14]} />
            <meshStandardMaterial color={POLO_RED} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.47, -0.158]} rotation={[0.38, 0, 0]} scale={[0.82, 1.48, 0.82]} castShadow>
            <sphereGeometry args={[0.06, 14, 12]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.008}
              roughness={0.74}
            />
          </mesh>
        </group>
      )}

      {hairStyle === 'bob' && (
        <group>
          <mesh position={[0, 1.65, 0.052]} rotation={[-0.12, 0, 0]} scale={[1.14, 0.42, 0.62]}>
            <sphereGeometry args={[0.076, 16, 12]} />
            <meshStandardMaterial
              color={HAIR}
              map={hairPbr.map}
              bumpMap={hairPbr.bumpMap}
              bumpScale={0.006}
              roughness={0.72}
            />
          </mesh>
          {[-0.09, 0.09].map((bx, i) => (
            <mesh key={`bob-side-${i}`} position={[bx, 1.5, -0.006]} scale={[0.38, 1.22, 0.72]} castShadow>
              <sphereGeometry args={[0.07, 14, 10]} />
              <meshStandardMaterial
                color={HAIR}
                map={hairPbr.map}
                bumpMap={hairPbr.bumpMap}
                bumpScale={0.008}
                roughness={0.74}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Mũ lưỡi trai */}
      {cap && (
        <group>
          <mesh position={[0, 1.632, 0.005]} rotation={[-0.12, 0, 0]} castShadow>
            <sphereGeometry args={[0.118, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={cap} roughness={0.82} />
          </mesh>
          <mesh position={[0, 1.62, 0.155]} rotation={[0.12, 0, 0]} scale={[1, 0.18, 1]} castShadow>
            <cylinderGeometry args={[0.08, 0.09, 0.028, 16]} />
            <meshStandardMaterial color={cap} roughness={0.82} />
          </mesh>
          <mesh position={[0, 1.632, 0.095]}>
            <boxGeometry args={[0.028, 0.011, 0.011]} />
            <meshStandardMaterial color={WHITE} roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* Tai hai bên */}
      {[-1, 1].map((s) => (
        <group key={`ear-${s}`} position={[s * (isFemale ? 0.097 : 0.1), 1.555, 0]}>
          <mesh scale={[0.5, 1, 0.8]}>
            <sphereGeometry args={[0.026, 10, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.68} />
          </mesh>
          <mesh position={[s * 0.006, 0, 0.005]} scale={[0.35, 0.65, 0.5]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshStandardMaterial color={SKIN_WARM} roughness={0.75} />
          </mesh>
        </group>
      ))}

      {/* Đôi mắt 3D đa lớp */}
      {[-1, 1].map((s) => {
        const ex = s * 0.041;
        return (
          <group key={`eye-${s}`} position={[ex, 1.56, 0.095]}>
            <mesh scale={[1.15, isFemale ? 0.98 : 0.92, 0.55]}>
              <sphereGeometry args={[0.0165, 14, 10]} />
              <meshStandardMaterial color="#FAF9F5" roughness={0.35} />
            </mesh>
            <mesh position={[0, 0, 0.0045]} scale={[0.92, 0.95, 0.55]}>
              <sphereGeometry args={[0.0115, 12, 10]} />
              <meshStandardMaterial color="#1F1612" roughness={0.25} />
            </mesh>
            <mesh position={[0.0038, 0.004, 0.0102]}>
              <sphereGeometry args={[0.0032, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            {/* Hàng mi trên sắc nét hơn cho nhân vật Nữ */}
            {isFemale && (
              <mesh position={[s * 0.003, 0.0115, 0.007]} rotation={[0, 0, -s * 0.14]}>
                <boxGeometry args={[0.032, 0.0032, 0.004]} />
                <meshStandardMaterial color="#141210" roughness={0.6} />
              </mesh>
            )}
            <mesh
              ref={s === -1 ? eyelidLRef : eyelidRRef}
              position={[0, 0.009, 0.003]}
              scale={[1.2, 0.22, 0.6]}
            >
              <sphereGeometry args={[0.0165, 12, 8]} />
              <meshStandardMaterial color={SKIN_WARM} roughness={0.68} />
            </mesh>
          </group>
        );
      })}

      {/* Lông mày (Nam đậm khỏe khoắn, Nữ thanh mảnh cong nhẹ) */}
      <mesh position={[-0.042, 1.586, 0.097]} rotation={[0, 0, isFemale ? 0.06 : 0.1]}>
        <boxGeometry args={[0.036, isFemale ? 0.0052 : 0.0072, 0.009]} />
        <meshStandardMaterial color={HAIR} roughness={0.85} />
      </mesh>
      <mesh position={[0.042, 1.586, 0.097]} rotation={[0, 0, isFemale ? -0.06 : -0.1]}>
        <boxGeometry args={[0.036, isFemale ? 0.0052 : 0.0072, 0.009]} />
        <meshStandardMaterial color={HAIR} roughness={0.85} />
      </mesh>

      {/* Má ửng hồng nhẹ */}
      {[-0.06, 0.06].map((cx, i) => (
        <mesh key={`cheek-${i}`} position={[cx, 1.532, 0.088]} scale={[1.1, 0.65, 0.4]}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshStandardMaterial color={isFemale ? '#E59B88' : SKIN_WARM} roughness={0.75} />
        </mesh>
      ))}

      {/* Sống mũi & chóp mũi */}
      <mesh position={[0, 1.532, 0.101]} scale={[0.66, 1.22, 0.6]}>
        <sphereGeometry args={[0.0165, 12, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>

      {/* Khuôn miệng cười nhẹ thân thiện */}
      <mesh position={[0, 1.492, 0.089]} rotation={[0.15, 0, Math.PI]}>
        <torusGeometry args={[isFemale ? 0.023 : 0.025, 0.0046, 8, 14, Math.PI]} />
        <meshStandardMaterial color={isFemale ? '#C85A56' : '#9E423B'} roughness={0.62} />
      </mesh>

      {/* Kính gọng tri thức */}
      {glasses && (
        <group>
          {[-0.042, 0.042].map((gx, idx) => (
            <group key={`glass-lens-${idx}`} position={[gx, 1.56, 0.104]}>
              <mesh>
                <torusGeometry args={[0.03, 0.0038, 8, 18]} />
                <meshStandardMaterial color="#22252A" roughness={0.4} metalness={0.5} />
              </mesh>
              <mesh>
                <circleGeometry args={[0.028, 16]} />
                <meshStandardMaterial color="#D8F0FF" transparent opacity={0.22} roughness={0.15} metalness={0.2} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 1.563, 0.104]}>
            <boxGeometry args={[0.018, 0.0045, 0.005]} />
            <meshStandardMaterial color="#22252A" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[-0.08, 1.563, 0.055]}>
            <boxGeometry args={[0.0045, 0.0045, 0.09]} />
            <meshStandardMaterial color="#22252A" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0.08, 1.563, 0.055]}>
            <boxGeometry args={[0.0045, 0.0045, 0.09]} />
            <meshStandardMaterial color="#22252A" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Ba lô sinh viên Bách Khoa: có ngăn phụ, bình nước thể thao bên hông & huy hiệu BK đỏ. */
function Backpack({ colors }: { colors: { pack: string; packLight: string; packZip: string } }) {
  const { pack, packLight, packZip } = colors;
  return (
    <group>
      <mesh position={[0, 1.13, -0.2]} scale={[1, 1, 0.6]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 18]} />
        <meshStandardMaterial color={pack} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.28, -0.2]} scale={[1, 0.5, 0.6]} castShadow>
        <sphereGeometry args={[0.15, 18, 12]} />
        <meshStandardMaterial color={pack} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.98, -0.2]} scale={[1, 0.5, 0.6]}>
        <sphereGeometry args={[0.15, 18, 12]} />
        <meshStandardMaterial color={pack} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.06, -0.258]} scale={[1, 0.7, 0.35]} castShadow>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshStandardMaterial color={packLight} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.12, -0.288]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, 0.19, 8]} />
        <meshStandardMaterial color={packZip} roughness={0.6} />
      </mesh>
      <mesh position={[0.045, 1.105, -0.293]}>
        <boxGeometry args={[0.016, 0.028, 0.008]} />
        <meshStandardMaterial color={SILVER} roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh position={[-0.045, 1.21, -0.282]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.008, 14]} />
        <meshStandardMaterial color={POLO_RED} roughness={0.5} />
      </mesh>
      <mesh position={[0.155, 1.02, -0.2]} scale={[0.35, 0.7, 0.7]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color={packLight} roughness={0.88} />
      </mesh>
      <mesh position={[0.158, 1.09, -0.2]} castShadow>
        <cylinderGeometry args={[0.026, 0.026, 0.11, 12]} />
        <meshStandardMaterial color="#38BDF8" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0.158, 1.152, -0.2]}>
        <cylinderGeometry args={[0.022, 0.024, 0.024, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.355, -0.2]}>
        <torusGeometry args={[0.035, 0.01, 8, 16, Math.PI]} />
        <meshStandardMaterial color={pack} roughness={0.88} />
      </mesh>
      {[-0.13, 0.13].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.315, -0.02]}>
            <boxGeometry args={[0.055, 0.02, 0.32]} />
            <meshStandardMaterial color={pack} roughness={0.88} />
          </mesh>
          <mesh position={[x, 1.16, 0.148]} rotation={[-0.04, 0, 0]}>
            <boxGeometry args={[0.055, 0.34, 0.016]} />
            <meshStandardMaterial color={pack} roughness={0.88} />
          </mesh>
          <mesh position={[x, 1.04, 0.158]} rotation={[-0.04, 0, 0]}>
            <boxGeometry args={[0.06, 0.03, 0.02]} />
            <meshStandardMaterial color={packZip} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Hình người đầy đủ, dùng chung cho người chơi + NPC + Multiplayer + AmbientLife. */
export function HumanFigure(props: FigureProps) {
  const {
    variant,
    gender = 'male',
    shirt,
    shirtDark,
    upperYokeColor,
    sleeveColor,
    pants,
    shoe,
    shoeSole,
    hairStyle,
    glasses,
    lanyard = false,
    wristwatch = false,
    cap,
    backpack,
    backpackColors,
    joints,
    showBackpack = true,
  } = props;
  const hustTex = useHustTexture();
  const hustCrimsonTex = useHustCrimsonLogoTexture();
  const sleeveBadgeTex = useHustSleeveBadgeTexture();
  const idTex = useStudentIdTexture();
  const fabricTex = useMemo(() => makeFabricTexture(5, 5), []);
  const { shadow: shadowTex } = useMemo(() => getSharedAvatarTextures(), []);
  useEffect(() => () => fabricTex.dispose(), [fabricTex]);

  const isFemale = gender === 'female';
  const shoulderX = isFemale ? 0.178 : 0.19;
  const hipX = isFemale ? 0.09 : 0.095;
  const legScale = isFemale ? 0.92 : 1.0;
  const armScale = isFemale ? 0.92 : 1.0;
  const packColors = backpackColors ?? { pack: PACK_BLACK, packLight: '#2A2E33', packZip: PACK_ZIP };

  return (
    <group>
      {/* Đĩa bóng tiếp xúc mềm dưới chân nhân vật (gắn ignoreMeasure để không ảnh hưởng measureAvatar) */}
      <mesh
        userData={{ ignoreMeasure: true }}
        rotation-x={-Math.PI / 2}
        position={[0, 0.036, 0]}
      >
        <planeGeometry args={[0.68, 0.68]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <LegSide
        side={1}
        hipX={hipX}
        legScale={legScale}
        pants={pants}
        shoe={shoe}
        shoeSole={shoeSole}
        fabricTex={fabricTex}
        hipRef={joints?.legL}
        kneeRef={joints?.kneeL}
        footRef={joints?.footL}
      />
      <LegSide
        side={-1}
        hipX={hipX}
        legScale={legScale}
        pants={pants}
        shoe={shoe}
        shoeSole={shoeSole}
        fabricTex={fabricTex}
        hipRef={joints?.legR}
        kneeRef={joints?.kneeR}
        footRef={joints?.footR}
      />
      <group ref={joints?.body}>
        <Torso
          variant={variant}
          gender={gender}
          shirt={shirt}
          shirtDark={shirtDark}
          upperYokeColor={upperYokeColor}
          pants={pants}
          hustTex={hustTex}
          hustCrimsonTex={hustCrimsonTex}
          idTex={idTex}
          fabricTex={fabricTex}
          lanyard={lanyard}
        />
        <ArmSide
          side={1}
          shoulderX={shoulderX}
          armScale={armScale}
          variant={variant}
          shirt={shirt}
          shirtDark={shirtDark}
          upperYokeColor={upperYokeColor}
          sleeveColor={sleeveColor}
          fabricTex={fabricTex}
          sleeveBadgeTex={sleeveBadgeTex}
          wristwatch={wristwatch}
          shoulderRef={joints?.armL}
          elbowRef={joints?.elbowL}
        />
        <ArmSide
          side={-1}
          shoulderX={shoulderX}
          armScale={armScale}
          variant={variant}
          shirt={shirt}
          shirtDark={shirtDark}
          upperYokeColor={upperYokeColor}
          sleeveColor={sleeveColor}
          fabricTex={fabricTex}
          sleeveBadgeTex={sleeveBadgeTex}
          wristwatch={wristwatch}
          shoulderRef={joints?.armR}
          elbowRef={joints?.elbowR}
        />
        <Head gender={gender} hairStyle={hairStyle} glasses={glasses} cap={cap} />
        {backpack && showBackpack && <Backpack colors={packColors} />}
      </group>
    </group>
  );
}

export interface StudentAvatarProps {
  joints: FigureJoints;
  showBackpack?: boolean;
  gender?: AvatarGender;
  hairStyle?: AvatarHairStyle;
  outfit?: AvatarOutfitId;
  glasses?: boolean;
  lanyard?: boolean;
}

export const OUTFIT_PRESETS: Record<
  AvatarOutfitId,
  {
    label: string;
    desc: string;
    variant: FigureVariant;
    shirt: string;
    shirtDark: string;
    upperYokeColor?: string;
    sleeveColor?: string;
    pants: string;
    shoe: string;
    shoeSole: string;
  }
> = {
  'windbreaker-hust': {
    label: 'Áo khoác gió HUST',
    desc: 'Đồng phục chính thức ĐHBK Hà Nội (Trắng – Đỏ)',
    variant: 'windbreaker',
    shirt: HUST_CRIMSON,
    shirtDark: HUST_CRIMSON_DARK,
    upperYokeColor: WINDBREAKER_WHITE,
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'bomber-red-grey': {
    label: 'Bomber HUST Đỏ – Ghi',
    desc: 'Thân đỏ Bách khoa, tay ghi sáng, bo cổ kẻ sọc',
    variant: 'bomber',
    shirt: '#9E1B22',
    shirtDark: '#6E1117',
    sleeveColor: '#D8DCE3',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'bomber-navy-white': {
    label: 'Bomber HUST Xanh – Trắng',
    desc: 'Thân xanh tím than, tay trắng kem năng động',
    variant: 'bomber',
    shirt: '#1B2A4A',
    shirtDark: '#111C33',
    sleeveColor: '#F1F5F9',
    pants: '#1E2430',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'bomber-red-navy': {
    label: 'Bomber HUST Đỏ – Xanh',
    desc: 'Thân đỏ Bách khoa, tay xanh navy đậm',
    variant: 'bomber',
    shirt: '#A6192E',
    shirtDark: '#75101F',
    sleeveColor: '#18243E',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'polo-red': {
    label: 'Áo Polo Đỏ HUST',
    desc: 'Áo thun cổ bẻ đỏ tươi Bách khoa',
    variant: 'polo',
    shirt: POLO_RED,
    shirtDark: POLO_DARK,
    pants: PANTS,
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'hoodie-hust': {
    label: 'Áo Hoodie Đỏ BK',
    desc: 'Áo nỉ có mũ mùa đông Bách khoa',
    variant: 'hoodie',
    shirt: '#B81D24',
    shirtDark: '#7F1217',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'shirt-white': {
    label: 'Áo Sơ mi Trắng',
    desc: 'Sơ mi trắng thanh lịch',
    variant: 'shirt',
    shirt: SHIRT_WHITE,
    shirtDark: SHIRT_DARK,
    pants: '#1F2937',
    shoe: '#2B2623',
    shoeSole: '#141210',
  },
  'sport-pe': {
    label: 'Đồ Thể chất HUST',
    desc: 'Trang phục Giáo dục thể chất xanh Bách khoa',
    variant: 'polo',
    shirt: '#1D4ED8',
    shirtDark: '#1E3A8A',
    pants: '#172554',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
};

/** Helper tính góc khớp đi bộ / chạy / đứng tự nhiên, chống lạch bạch (dùng chung cho Player & 3D Preview). */
export function computeNaturalGaitTargets(
  phase: number,
  swing: number,
  blend: number,
  t: number,
  isRunning: boolean,
) {
  const legSwing = Math.sin(phase) * swing * blend;
  const legLTarget = legSwing;
  const legRTarget = -legSwing;
  const kneeLTarget = 0.05 + (isRunning ? 0.96 : 0.82) * Math.max(0, -Math.cos(phase)) * blend;
  const kneeRTarget = 0.05 + (isRunning ? 0.96 : 0.82) * Math.max(0, Math.cos(phase)) * blend;
  const footLTarget = Math.min(Math.max(-(legLTarget + kneeLTarget) * 0.85, -0.45), 0.45) * blend;
  const footRTarget = Math.min(Math.max(-(legRTarget + kneeRTarget) * 0.85, -0.45), 0.45) * blend;
  const armSwing = legSwing * (isRunning ? 0.82 : 0.72);
  const armLTarget = -armSwing + (1 - blend) * 0.08;
  const armRTarget = armSwing + (1 - blend) * -0.04;
  const elbowLTarget = -(0.28 + (isRunning ? 0.34 : 0.18) * blend * Math.max(0, Math.sin(phase)));
  const elbowRTarget = -(0.36 + (isRunning ? 0.34 : 0.18) * blend * Math.max(0, Math.sin(phase + Math.PI)));
  const bodyLeanTarget = 0.045 * blend + (isRunning ? 0.055 * blend : 0);
  // Giảm mạnh lắc ngang thân (0.008 rad) để triệt tiêu hoàn toàn dáng đi lạch bạch
  const bodyRollTarget = Math.sin(phase) * 0.008 * blend + Math.sin(t * 0.9) * 0.008 * (1 - blend);
  const bodyBobTarget = Math.abs(Math.cos(phase)) * 0.016 * blend + Math.sin(t * 1.4) * 0.004;

  return {
    legLTarget,
    legRTarget,
    kneeLTarget,
    kneeRTarget,
    footLTarget,
    footRTarget,
    armLTarget,
    armRTarget,
    elbowLTarget,
    elbowRTarget,
    bodyLeanTarget,
    bodyRollTarget,
    bodyBobTarget,
  };
}

/** Người chơi chính: mặc định Áo khoác gió đồng phục HUST + hỗ trợ Nam/Nữ + 6 kiểu tóc + 8 trang phục. */
export default function StudentAvatar({
  joints,
  showBackpack = true,
  gender = 'male',
  hairStyle = 'short',
  outfit = 'windbreaker-hust',
  glasses = false,
  lanyard = true,
}: StudentAvatarProps) {
  const preset = OUTFIT_PRESETS[outfit] ?? OUTFIT_PRESETS['windbreaker-hust'];
  return (
    <HumanFigure
      variant={preset.variant}
      gender={gender}
      shirt={preset.shirt}
      shirtDark={preset.shirtDark}
      upperYokeColor={preset.upperYokeColor}
      sleeveColor={preset.sleeveColor}
      pants={preset.pants}
      shoe={preset.shoe}
      shoeSole={preset.shoeSole}
      hairStyle={hairStyle}
      glasses={glasses}
      lanyard={lanyard}
      wristwatch
      backpack
      backpackColors={{ pack: PACK_BLACK, packLight: '#2A2E33', packZip: PACK_ZIP }}
      joints={joints}
      showBackpack={showBackpack}
    />
  );
}

export const AVATAR_COLORS = { NAVY, NAVY_DARK, KHAKI, PACK_GRAY, PACK_GRAY_LIGHT, SHIRT_WHITE, SHIRT_DARK };
