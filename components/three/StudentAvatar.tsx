// ---------------------------------------------------------------------------
// StudentAvatar.tsx — Nhân vật sinh viên Bách khoa 3D (Nâng cấp Đồ họa Wave 2)
// Kỹ thuật: Hình học thủ công nhiều lớp có chuyển tiếp mềm + Procedural PBR
// CanvasTexture (vân vải dệt, thẻ sinh viên HUST, logo ngực) + Đôi mắt 3D đa lớp
// có đốm sáng long lanh & hoạt họa chớp mắt tự nhiên + 5 kiểu tóc tạo khối +
// Giày Sneaker 3D nhiều lớp + Đồng hồ đeo tay + Bình nước ba lô.
//
// Giữ chuẩn tỉ lệ tuyệt đối (gốc y = 0 tại đế giày, mặt trước = +Z):
//   - Tổng chiều cao bounding box local: ~1,707 m (khớp kiểm thử r3-phase1.cjs)
//   - Đầy đủ hệ khớp FigureJoints (body, armL/R, elbowL/R, legL/R, kneeL/R, footL/R)
//   - Hỗ trợ 4 bộ trang phục sinh viên Bách khoa (polo-red, hoodie-hust,
//     shirt-white, sport-pe), kính cận, dây đeo thẻ SV và ba lô.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeFabricTexture } from './materials';
import type { AvatarOutfitId } from '../../lib/playerState';

// --- Bảng màu chuẩn ----------------------------------------------------------
const POLO_RED = '#DA1E26'; // đỏ polo tươi HUST
const POLO_DARK = '#8F1418'; // viền/nẹp cúc đỏ sẫm
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
const SKIN_WARM = '#E3AF89'; // má / mí mắt / khớp ngón ấm hơn một nấc
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

export type FigureVariant = 'polo' | 'hoodie' | 'shirt';
export type HairStyle = 'short' | 'swept' | 'bun' | 'ponytail' | 'bob';

export interface FigureProps {
  variant: FigureVariant;
  shirt: string;
  shirtDark: string;
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

function useHustTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 64);
      ctx.fillStyle = WHITE;
      ctx.font = 'bold 44px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HUST', 128, 34);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Texture Thẻ sinh viên Bách Khoa đeo trước ngực (HUST Student ID Card). */
function useStudentIdTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Nền thẻ trắng kem bo viền
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, 128, 192);
      // Dải đầu thẻ đỏ Bách Khoa
      ctx.fillStyle = '#DA1E26';
      ctx.fillRect(0, 0, 128, 38);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HUST', 64, 27);
      // Ảnh thẻ sinh viên gợi ý bên trái
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(14, 50, 42, 54);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(35, 68, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(21, 82, 28, 18);
      // Các dòng thông tin MSSV bên phải
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(66, 54, 48, 8);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(66, 70, 40, 6);
      ctx.fillRect(66, 82, 44, 6);
      // Dải mã vạch & chân thẻ xanh
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

/** Bàn tay: lòng bàn tay bo mềm + 4 ngón tay có đốt gợi ý + ngón cái tự nhiên. */
function Hand({ side }: { side: -1 | 1 }) {
  return (
    <group>
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
      {/* Ngón cái phía trong bàn tay */}
      <mesh position={[-side * 0.042, -0.055, 0.014]} rotation={[0, 0, side * 0.55]}>
        <cylinderGeometry args={[0.011, 0.009, 0.038, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>
    </group>
  );
}

/** Một tay: pivot ở vai (±0,19, 1,29). Có thêm huy hiệu tay áo & đồng hồ đeo tay ở cổ tay trái. */
function ArmSide({
  side,
  sleeve,
  shirt,
  shirtDark,
  fabricTex,
  wristwatch,
  shoulderRef,
  elbowRef,
}: {
  side: -1 | 1;
  sleeve: 'short' | 'long';
  shirt: string;
  shirtDark: string;
  fabricTex: THREE.CanvasTexture;
  wristwatch?: boolean;
  shoulderRef?: RefObject<THREE.Group>;
  elbowRef?: RefObject<THREE.Group>;
}) {
  const short = sleeve === 'short';
  return (
    <group ref={shoulderRef} position={[side * 0.19, 1.29, 0]}>
      {short ? (
        <group>
          {/* Tay áo polo tới giữa bắp tay (y 1,29..1,14) + bo tay viền trắng + chỉ đỏ */}
          <mesh position={[0, -0.075, 0]} castShadow>
            <cylinderGeometry args={[0.058, 0.054, 0.15, 16]} />
            <meshStandardMaterial color={shirt} map={fabricTex} roughness={0.84} />
          </mesh>
          <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.054, 0.007, 8, 18]} />
            <meshStandardMaterial color={WHITE} roughness={0.82} />
          </mesh>
          {/* Bắp tay da lộ ra dưới tay áo */}
          <mesh position={[0, -0.205, 0]} castShadow>
            <cylinderGeometry args={[0.049, 0.045, 0.11, 14]} />
            <meshStandardMaterial color={SKIN} roughness={0.68} />
          </mesh>
        </group>
      ) : (
        <group>
          {/* Tay áo dài thuôn tới cổ tay + bo tay */}
          <mesh position={[0, -0.23, 0]} castShadow>
            <cylinderGeometry args={[0.058, 0.047, 0.46, 16]} />
            <meshStandardMaterial color={shirt} map={fabricTex} roughness={0.84} />
          </mesh>
          <mesh position={[0, -0.46, 0]} castShadow>
            <cylinderGeometry args={[0.048, 0.048, 0.035, 16]} />
            <meshStandardMaterial color={shirtDark} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.485, 0]}>
            <cylinderGeometry args={[0.038, 0.04, 0.04, 12]} />
            <meshStandardMaterial color={SKIN} roughness={0.68} />
          </mesh>
        </group>
      )}
      {/* Khớp khuỷu cầu chìm */}
      <mesh position={[0, -0.26, 0]}>
        <sphereGeometry args={[short ? 0.044 : 0.046, 12, 10]} />
        <meshStandardMaterial color={short ? SKIN : shirt} roughness={0.8} />
      </mesh>
      {/* Cẳng tay + đồng hồ cổ tay trái (side = 1) + bàn tay */}
      <group ref={elbowRef} position={[0, -0.26, 0]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <cylinderGeometry args={[0.044, 0.036, 0.24, 14]} />
          <meshStandardMaterial color={SKIN} roughness={0.68} />
        </mesh>
        {/* Đồng hồ đeo tay sinh viên ở cổ tay trái (side === 1) */}
        {wristwatch && side === 1 && (
          <group position={[0, -0.215, 0]}>
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
          <Hand side={side} />
        </group>
      </group>
    </group>
  );
}

/** Một chân: đùi + cẳng chân có đường ly/chỉ quần + Giày Sneaker 3D nhiều lớp.
 *  Đế giày dưới cùng chạm đúng y = 0,000 để giữ chuẩn measureAvatar. */
function LegSide({
  side,
  pants,
  shoe,
  shoeSole,
  fabricTex,
  hipRef,
  kneeRef,
  footRef,
}: {
  side: -1 | 1;
  pants: string;
  shoe: string;
  shoeSole: string;
  fabricTex: THREE.CanvasTexture;
  hipRef?: RefObject<THREE.Group>;
  kneeRef?: RefObject<THREE.Group>;
  footRef?: RefObject<THREE.Group>;
}) {
  return (
    <group ref={hipRef} position={[side * 0.095, 0.8, 0]}>
      {/* Đùi thuôn xuống gối */}
      <mesh position={[0, -0.19, 0]} castShadow>
        <cylinderGeometry args={[0.098, 0.082, 0.38, 16]} />
        <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
      </mesh>
      {/* Khớp gối cầu chìm */}
      <mesh position={[0, -0.38, 0]}>
        <sphereGeometry args={[0.08, 14, 10]} />
        <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
      </mesh>
      {/* Cẳng chân pivoting tại gối (y 0,42) */}
      <group ref={kneeRef} position={[0, -0.38, 0]}>
        <mesh position={[0, -0.165, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.33, 16]} />
          <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
        </mesh>
        {/* Gấu quần gấp lai + tất thể thao cổ chân */}
        <mesh position={[0, -0.315, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.064, 0.036, 16]} />
          <meshStandardMaterial color={pants} roughness={0.88} />
        </mesh>
        <mesh position={[0, -0.335, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.035, 12]} />
          <meshStandardMaterial color={SOCK} roughness={0.82} />
        </mesh>
        {/* Bàn chân Sneaker 3D tại cổ chân (y 0,07; mặt đáy đế giày ở -0,07 -> world y = 0,000) */}
        <group ref={footRef} position={[0, -0.35, 0]}>
          {/* Đế ngoài (Outsole) chống trượt */}
          <mesh position={[0, -0.055, 0.03]} castShadow>
            <boxGeometry args={[0.16, 0.03, 0.3]} />
            <meshStandardMaterial color={shoeSole} roughness={0.9} />
          </mesh>
          {/* Đế giữa (Midsole) viền sáng */}
          <mesh position={[0, -0.038, 0.03]} castShadow>
            <boxGeometry args={[0.156, 0.014, 0.29]} />
            <meshStandardMaterial color="#EAEAEA" roughness={0.75} />
          </mesh>
          {/* Thân giày chính (Upper) */}
          <mesh position={[0, -0.022, 0.028]} castShadow>
            <boxGeometry args={[0.15, 0.048, 0.255]} />
            <meshStandardMaterial color={shoe} roughness={0.65} />
          </mesh>
          {/* Mũi giày bo tròn */}
          <mesh position={[0, -0.032, 0.135]} scale={[1, 0.6, 1]} castShadow>
            <sphereGeometry args={[0.062, 14, 10]} />
            <meshStandardMaterial color={shoe} roughness={0.65} />
          </mesh>
          {/* Lưỡi gà (Tongue) & miếng đệm gót đỏ HUST */}
          <mesh position={[0, 0.008, 0.055]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.078, 0.032, 0.018]} />
            <meshStandardMaterial color={shoe} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.012, -0.098]}>
            <boxGeometry args={[0.09, 0.034, 0.012]} />
            <meshStandardMaterial color={POLO_RED} roughness={0.6} />
          </mesh>
          {/* 3 vạch dây giày thể thao */}
          {[0.058, 0.085, 0.112].map((lz, idx) => (
            <mesh key={idx} position={[0, 0.003, lz]}>
              <boxGeometry args={[0.086, 0.007, 0.014]} />
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
      {/* Hai nhánh dây đeo đỏ HUST tạo hình chữ V từ cổ xuống ngực */}
      <mesh position={[-0.036, 1.24, 0.146]} rotation={[0.08, 0, -0.26]}>
        <boxGeometry args={[0.016, 0.21, 0.006]} />
        <meshStandardMaterial color={POLO_RED} roughness={0.75} />
      </mesh>
      <mesh position={[0.036, 1.24, 0.146]} rotation={[0.08, 0, 0.26]}>
        <boxGeometry args={[0.016, 0.21, 0.006]} />
        <meshStandardMaterial color={POLO_RED} roughness={0.75} />
      </mesh>
      {/* Móc kim loại bạc nối dây với bao thẻ */}
      <mesh position={[0, 1.135, 0.156]}>
        <boxGeometry args={[0.018, 0.018, 0.008]} />
        <meshStandardMaterial color={SILVER} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Bao nhựa xanh/trắng + mặt thẻ sinh viên HUST */}
      <mesh position={[0, 1.07, 0.157]} castShadow>
        <boxGeometry args={[0.068, 0.098, 0.006]} />
        <meshStandardMaterial color="#1E3A8A" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.07, 0.162]}>
        <planeGeometry args={[0.06, 0.09]} />
        <meshStandardMaterial map={idTex} roughness={0.45} />
      </mesh>
    </group>
  );
}

/** Thân áo: hông + eo + ngực + phễu vai dốc + vân vải PBR + dây đeo thẻ SV. */
function Torso({
  variant,
  shirt,
  shirtDark,
  pants,
  hustTex,
  idTex,
  fabricTex,
  lanyard,
}: {
  variant: FigureVariant;
  shirt: string;
  shirtDark: string;
  pants: string;
  hustTex: THREE.CanvasTexture;
  idTex: THREE.CanvasTexture;
  fabricTex: THREE.CanvasTexture;
  lanyard?: boolean;
}) {
  return (
    <group>
      {/* Hông (quần) */}
      <mesh position={[0, 0.86, 0]} scale={[1, 0.55, 0.72]} castShadow>
        <sphereGeometry args={[0.2, 18, 12]} />
        <meshStandardMaterial color={pants} map={fabricTex} roughness={0.86} />
      </mesh>
      {/* Eo + ngực có vân vải dệt */}
      <mesh position={[0, 0.96, 0]} scale={[1, 1, 0.7]} castShadow>
        <cylinderGeometry args={[0.2, 0.195, 0.24, 20]} />
        <meshStandardMaterial color={shirt} map={fabricTex} roughness={0.84} />
      </mesh>
      <mesh position={[0, 1.18, 0]} scale={[1.02, 1, 0.72]} castShadow>
        <cylinderGeometry args={[0.185, 0.2, 0.24, 20]} />
        <meshStandardMaterial color={shirt} map={fabricTex} roughness={0.84} />
      </mesh>
      {/* Phễu vai dốc mềm mại */}
      <mesh position={[0, 1.3, 0]} scale={[1.02, 1, 0.72]} castShadow>
        <cylinderGeometry args={[0.145, 0.195, 0.08, 20]} />
        <meshStandardMaterial color={shirt} map={fabricTex} roughness={0.84} />
      </mesh>
      {/* Gấu áo */}
      <mesh position={[0, 0.845, 0]} scale={[1, 1, 0.7]} castShadow>
        <cylinderGeometry args={[0.198, 0.2, 0.035, 20]} />
        <meshStandardMaterial color={shirtDark} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.828, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.7, 1]}>
        <torusGeometry args={[0.198, 0.008, 8, 20]} />
        <meshStandardMaterial color={shirtDark} roughness={0.86} />
      </mesh>

      {variant === 'polo' && (
        <group>
          {/* Cổ bẻ polo + viền trắng */}
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
          {/* Nẹp cúc + 2 cúc */}
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
          {/* Chữ "HUST" ngực trái (+X) */}
          <mesh position={[0.065, 1.22, 0.136]} rotation={[0, 0.45, 0]}>
            <planeGeometry args={[0.08, 0.024]} />
            <meshStandardMaterial map={hustTex} transparent roughness={0.75} />
          </mesh>
          {/* Nếp vải nhẹ */}
          <mesh position={[-0.185, 1.14, 0.08]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.012, 0.07, 0.012]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
          <mesh position={[0.185, 1.14, 0.08]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.012, 0.07, 0.012]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
        </group>
      )}

      {variant === 'hoodie' && (
        <group>
          <mesh position={[0, 0.94, 0.155]} castShadow>
            <boxGeometry args={[0.3, 0.19, 0.035]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          <mesh position={[0, 1.03, 0.17]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.28, 10]} />
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
          {/* Chữ HUST trên ngực áo khoác/hoodie */}
          <mesh position={[0.065, 1.22, 0.136]} rotation={[0, 0.45, 0]}>
            <planeGeometry args={[0.08, 0.024]} />
            <meshStandardMaterial map={hustTex} transparent roughness={0.75} />
          </mesh>
        </group>
      )}

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
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshStandardMaterial color="#E8E4D8" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[-0.12, 1.17, 0.135]}>
            <boxGeometry args={[0.1, 0.11, 0.014]} />
            <meshStandardMaterial color={shirt} roughness={0.86} />
          </mesh>
          <mesh position={[-0.12, 1.23, 0.143]} rotation={[0, 0, 0.08]}>
            <cylinderGeometry args={[0.006, 0.006, 0.055, 6]} />
            <meshStandardMaterial color="#1F3A5F" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.7, 1]}>
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

/** Đầu + cổ + khuôn mặt biểu cảm (mắt 3D đa lớp có chớp mắt tự nhiên) + 5 kiểu tóc tạo khối.
 *  Đỉnh vòm tóc giữ đúng cao độ y = 1,707 m để tương thích 100% với measureAvatar. */
function Head({
  hairStyle,
  glasses,
  cap,
}: {
  hairStyle: HairStyle;
  glasses?: boolean;
  cap?: string;
}) {
  const eyelidLRef = useRef<THREE.Mesh>(null!);
  const eyelidRRef = useRef<THREE.Mesh>(null!);

  // Hoạt họa chớp mắt tự nhiên mỗi ~3,4 giây (không làm thay đổi bounding box của đầu)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycle = t % 3.4;
    // Chớp mắt nhanh trong khoảng 0..0.14s của chu kỳ
    const blink = cycle < 0.14 ? Math.sin((cycle / 0.14) * Math.PI) : 0;
    const scaleY = 0.22 + blink * 0.85;
    if (eyelidLRef.current) eyelidLRef.current.scale.y = scaleY;
    if (eyelidRRef.current) eyelidRRef.current.scale.y = scaleY;
  });

  return (
    <group>
      {/* Cổ nối tự nhiên đầu – thân */}
      <mesh position={[0, 1.385, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.056, 0.11, 14]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>
      {/* Đầu chính: cầu r 0,108 dẹt dọc, tâm y 1,555 */}
      <mesh position={[0, 1.555, 0]} scale={[0.92, 1.16, 0.96]} castShadow>
        <sphereGeometry args={[0.108, 28, 20]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>

      {/* --- Tóc nền đa lớp & 5 kiểu tóc tạo khối (che kín 100% hộp sọ da 1,680m, đỉnh tóc đạt đúng 1,707m) --- */}
      {/* Vòm tóc chính: bọc hoàn toàn ngoài ellipsoid sọ [0.92, 1.16, 0.96]*0.108 trên cả 3 trục X, Y, Z */}
      <mesh position={[0, 1.562, -0.002]} rotation={[-0.14, 0, 0]} scale={[0.98, 1.25, 1.05]} castShadow>
        <sphereGeometry args={[0.114, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={HAIR} roughness={0.82} />
      </mesh>
      {/* Khối tóc sau đầu & ôm gáy dày dặn (không lộ da đầu khi camera nhìn từ phía sau/trên xuống) */}
      <mesh position={[0, 1.545, -0.024]} scale={[0.97, 1.16, 0.98]} castShadow>
        <sphereGeometry args={[0.112, 24, 18]} />
        <meshStandardMaterial color={HAIR} roughness={0.84} />
      </mesh>
      {/* Lớp tóc phồng đỉnh đầu (Crown Volume + lọn tóc bóng nhẹ) tạo độ dày tự nhiên */}
      <mesh position={[0, 1.662, 0.006]} scale={[0.88, 0.38, 0.92]} castShadow>
        <sphereGeometry args={[0.11, 20, 14]} />
        <meshStandardMaterial color={HAIR} roughness={0.8} />
      </mesh>
      <mesh position={[-0.022, 1.674, 0.018]} rotation={[0.1, 0, 0.16]} scale={[0.42, 0.24, 0.68]}>
        <sphereGeometry args={[0.088, 14, 10]} />
        <meshStandardMaterial color={HAIR_HIGHLIGHT} roughness={0.78} />
      </mesh>
      <mesh position={[0.024, 1.672, 0.015]} rotation={[0.08, 0, -0.15]} scale={[0.42, 0.24, 0.68]}>
        <sphereGeometry args={[0.088, 14, 10]} />
        <meshStandardMaterial color={HAIR} roughness={0.82} />
      </mesh>
      {/* Tóc mai 2 bên thái dương (Sideburns) nối liền vòm tóc xuống ngang tai */}
      {[-0.092, 0.092].map((sx, idx) => (
        <mesh
          key={`sideburn-${idx}`}
          position={[sx, 1.568, 0.026]}
          rotation={[0.12, 0, sx > 0 ? -0.08 : 0.08]}
          scale={[0.32, 0.78, 0.46]}
        >
          <sphereGeometry args={[0.052, 12, 10]} />
          <meshStandardMaterial color={HAIR} roughness={0.84} />
        </mesh>
      ))}

      {hairStyle === 'short' && (
        <group>
          {/* Vòm mái trước trán nối liền đỉnh đầu */}
          <mesh position={[0, 1.642, 0.056]} scale={[1.18, 0.52, 0.68]}>
            <sphereGeometry args={[0.082, 18, 12]} />
            <meshStandardMaterial color={HAIR} roughness={0.82} />
          </mesh>
          {/* Lọn tóc mái trước trán tạo nét trẻ trung */}
          <mesh position={[-0.03, 1.624, 0.088]} rotation={[0.22, 0, 0.18]} scale={[0.62, 0.42, 0.42]}>
            <sphereGeometry args={[0.056, 12, 10]} />
            <meshStandardMaterial color={HAIR_HIGHLIGHT} roughness={0.8} />
          </mesh>
          <mesh position={[0.028, 1.626, 0.088]} rotation={[0.22, 0, -0.15]} scale={[0.62, 0.42, 0.42]}>
            <sphereGeometry args={[0.056, 12, 10]} />
            <meshStandardMaterial color={HAIR} roughness={0.82} />
          </mesh>
        </group>
      )}

      {hairStyle === 'swept' && (
        <group>
          <mesh position={[0.018, 1.642, 0.056]} rotation={[0, 0, -0.15]} scale={[1.22, 0.5, 0.66]}>
            <sphereGeometry args={[0.082, 18, 12]} />
            <meshStandardMaterial color={HAIR} roughness={0.82} />
          </mesh>
          <mesh position={[-0.036, 1.622, 0.086]} rotation={[0.2, 0, 0.25]} scale={[0.68, 0.38, 0.42]}>
            <sphereGeometry args={[0.058, 12, 10]} />
            <meshStandardMaterial color={HAIR_HIGHLIGHT} roughness={0.8} />
          </mesh>
        </group>
      )}

      {hairStyle === 'bun' && (
        <group>
          {/* Mái trước mềm mại cho kiểu tóc búi để không bị hở trán */}
          <mesh position={[0, 1.64, 0.056]} scale={[1.14, 0.48, 0.62]}>
            <sphereGeometry args={[0.078, 16, 12]} />
            <meshStandardMaterial color={HAIR} roughness={0.82} />
          </mesh>
          <mesh position={[0, 1.615, -0.145]} scale={[1, 0.9, 0.9]} castShadow>
            <sphereGeometry args={[0.068, 14, 12]} />
            <meshStandardMaterial color={HAIR} roughness={0.85} />
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
          {/* Mái rẽ nhẹ trước trán nối liền vòm tóc */}
          <mesh position={[0, 1.64, 0.058]} scale={[1.16, 0.48, 0.64]}>
            <sphereGeometry args={[0.08, 16, 12]} />
            <meshStandardMaterial color={HAIR} roughness={0.82} />
          </mesh>
          {/* Dây buộc tóc đỏ HUST + đuôi ngựa năng động phía sau */}
          <mesh position={[0, 1.56, -0.118]} rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[0.025, 0.007, 8, 14]} />
            <meshStandardMaterial color={POLO_RED} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.48, -0.155]} rotation={[0.38, 0, 0]} scale={[0.78, 1.38, 0.78]} castShadow>
            <sphereGeometry args={[0.058, 14, 12]} />
            <meshStandardMaterial color={HAIR} roughness={0.84} />
          </mesh>
        </group>
      )}

      {hairStyle === 'bob' && (
        <group>
          {/* Mái ngang dày + hai lọn tóc ngắn ôm sát má nữ sinh */}
          <mesh position={[0, 1.642, 0.058]} scale={[1.18, 0.5, 0.66]}>
            <sphereGeometry args={[0.082, 16, 12]} />
            <meshStandardMaterial color={HAIR} roughness={0.82} />
          </mesh>
          {[-0.088, 0.088].map((bx, i) => (
            <mesh key={`bob-side-${i}`} position={[bx, 1.51, 0.012]} scale={[0.38, 1.18, 0.76]} castShadow>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshStandardMaterial color={HAIR} roughness={0.84} />
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

      {/* Tai hai bên + hốc tai ấm */}
      {[-1, 1].map((s) => (
        <group key={`ear-${s}`} position={[s * 0.1, 1.555, 0]}>
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

      {/* --- Đôi mắt 3D đa lớp (Tròng trắng + Con ngươi + Đốm sáng Catchlight + Mí mắt chớp) --- */}
      {[-1, 1].map((s) => {
        const ex = s * 0.042;
        return (
          <group key={`eye-${s}`} position={[ex, 1.56, 0.095]}>
            {/* Tròng trắng (Sclera) */}
            <mesh scale={[1.15, 0.92, 0.55]}>
              <sphereGeometry args={[0.0165, 14, 10]} />
              <meshStandardMaterial color="#FAF9F5" roughness={0.35} />
            </mesh>
            {/* Mống mắt & con ngươi nâu đen có chiều sâu */}
            <mesh position={[0, 0, 0.0045]} scale={[0.92, 0.95, 0.55]}>
              <sphereGeometry args={[0.0115, 12, 10]} />
              <meshStandardMaterial color="#1F1612" roughness={0.25} />
            </mesh>
            {/* Đốm sáng phản chiếu (Catchlight) giúp mắt có hồn */}
            <mesh position={[0.0038, 0.004, 0.0102]}>
              <sphereGeometry args={[0.0032, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            {/* Mí mắt trên (khép mở khi chớp mắt) */}
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

      {/* Lông mày thanh thoát */}
      <mesh position={[-0.042, 1.586, 0.097]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.036, 0.007, 0.009]} />
        <meshStandardMaterial color={HAIR} roughness={0.85} />
      </mesh>
      <mesh position={[0.042, 1.586, 0.097]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.036, 0.007, 0.009]} />
        <meshStandardMaterial color={HAIR} roughness={0.85} />
      </mesh>

      {/* Má ửng hồng nhẹ tự nhiên */}
      {[-0.062, 0.062].map((cx, i) => (
        <mesh key={`cheek-${i}`} position={[cx, 1.532, 0.088]} scale={[1.1, 0.65, 0.4]}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshStandardMaterial color={SKIN_WARM} roughness={0.75} />
        </mesh>
      ))}

      {/* Sống mũi & chóp mũi mềm mại */}
      <mesh position={[0, 1.532, 0.101]} scale={[0.68, 1.25, 0.62]}>
        <sphereGeometry args={[0.017, 12, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.68} />
      </mesh>

      {/* Khuôn miệng cười nhẹ thân thiện */}
      <mesh position={[0, 1.492, 0.089]} rotation={[0.15, 0, Math.PI]}>
        <torusGeometry args={[0.025, 0.0045, 8, 14, Math.PI]} />
        <meshStandardMaterial color="#9E423B" roughness={0.65} />
      </mesh>

      {/* Kính gọng tri thức (có tròng kính trong mờ nhẹ) */}
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
      {/* Ngăn trước + khóa kéo + huy hiệu tròn đỏ BK */}
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
      {/* Huy hiệu móc khóa tròn đỏ Bách Khoa gắn trên ba lô */}
      <mesh position={[-0.045, 1.21, -0.282]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.008, 14]} />
        <meshStandardMaterial color={POLO_RED} roughness={0.5} />
      </mesh>
      {/* Túi hông + Bình nước giữ nhiệt sinh viên */}
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
      {/* Quai xách trên nóc */}
      <mesh position={[0, 1.355, -0.2]}>
        <torusGeometry args={[0.035, 0.01, 8, 16, Math.PI]} />
        <meshStandardMaterial color={pack} roughness={0.88} />
      </mesh>
      {/* Quai đeo 2 bên vai */}
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

/** Hình người đầy đủ, dùng chung cho người chơi + NPC + Multiplayer. */
export function HumanFigure(props: FigureProps) {
  const {
    variant,
    shirt,
    shirtDark,
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
  const idTex = useStudentIdTexture();
  const fabricTex = useMemo(() => makeFabricTexture(5, 5), []);
  useEffect(() => () => fabricTex.dispose(), [fabricTex]);

  const sleeve: 'short' | 'long' = variant === 'polo' ? 'short' : 'long';
  const packColors = backpackColors ?? { pack: PACK_BLACK, packLight: '#2A2E33', packZip: PACK_ZIP };

  return (
    <group>
      <LegSide
        side={1}
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
          shirt={shirt}
          shirtDark={shirtDark}
          pants={pants}
          hustTex={hustTex}
          idTex={idTex}
          fabricTex={fabricTex}
          lanyard={lanyard}
        />
        <ArmSide
          side={1}
          sleeve={sleeve}
          shirt={shirt}
          shirtDark={shirtDark}
          fabricTex={fabricTex}
          wristwatch={wristwatch}
          shoulderRef={joints?.armL}
          elbowRef={joints?.elbowL}
        />
        <ArmSide
          side={-1}
          sleeve={sleeve}
          shirt={shirt}
          shirtDark={shirtDark}
          fabricTex={fabricTex}
          wristwatch={wristwatch}
          shoulderRef={joints?.armR}
          elbowRef={joints?.elbowR}
        />
        <Head hairStyle={hairStyle} glasses={glasses} cap={cap} />
        {backpack && showBackpack && <Backpack colors={packColors} />}
      </group>
    </group>
  );
}

export interface StudentAvatarProps {
  joints: FigureJoints;
  showBackpack?: boolean;
  outfit?: AvatarOutfitId;
  glasses?: boolean;
  lanyard?: boolean;
}

const OUTFIT_PRESETS: Record<
  AvatarOutfitId,
  {
    variant: FigureVariant;
    shirt: string;
    shirtDark: string;
    pants: string;
    shoe: string;
    shoeSole: string;
  }
> = {
  'polo-red': {
    variant: 'polo',
    shirt: POLO_RED,
    shirtDark: POLO_DARK,
    pants: PANTS,
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'hoodie-hust': {
    variant: 'hoodie',
    shirt: '#B81D24',
    shirtDark: '#7F1217',
    pants: '#1E293B',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
  'shirt-white': {
    variant: 'shirt',
    shirt: SHIRT_WHITE,
    shirtDark: SHIRT_DARK,
    pants: '#1F2937',
    shoe: '#2B2623',
    shoeSole: '#141210',
  },
  'sport-pe': {
    variant: 'polo',
    shirt: '#1D4ED8',
    shirtDark: '#1E3A8A',
    pants: '#172554',
    shoe: SHOE_WHITE,
    shoeSole: SHOE_SOLE,
  },
};

/** Người chơi chính: mặc định Polo HUST đỏ + dây đeo thẻ SV + đồng hồ + giày sneaker 3D. */
export default function StudentAvatar({
  joints,
  showBackpack = true,
  outfit = 'polo-red',
  glasses = false,
  lanyard = true,
}: StudentAvatarProps) {
  const preset = OUTFIT_PRESETS[outfit] ?? OUTFIT_PRESETS['polo-red'];
  return (
    <HumanFigure
      variant={preset.variant}
      shirt={preset.shirt}
      shirtDark={preset.shirtDark}
      pants={preset.pants}
      shoe={preset.shoe}
      shoeSole={preset.shoeSole}
      hairStyle="short"
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
