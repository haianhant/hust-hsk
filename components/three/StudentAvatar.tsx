// ---------------------------------------------------------------------------
// StudentAvatar.tsx — avatar sinh viên, DỰNG LẠI lần 2 (06/11, brief §5–§7)
// Kỹ thuật: hình học thủ công có chuyển tiếp mềm (trụ thuôn chồng mí +
// khớp cầu CHÌM cùng màu, không lộ khối ráp) — three-stdlib không có sẵn
// mesh người có rig + giấy phép rõ trong node_modules nên không dùng model
// ngoài; KHÔNG copy model từ repo chùa-online.
//
// Tỉ lệ mới (m, gốc y = 0 tại mặt đất, mặt trước = +Z), tổng cao 1,70 m:
//   đầu       0,25 — cầu r 0,108 dẹt dọc (rộng 0,199 × cao 0,25), tâm y 1,555
//               → 1,70 / 0,25 ≈ 6,8 lần chiều cao đầu (brief: 6,5–7)
//   vai       0,50 — pivot tay ±0,19 + tay áo r 0,058 → 0,50 / 0,199 ≈ 2,5
//               lần bề ngang đầu (brief: 2,2–2,5); vai DỐC nhờ phễu yoke
//               (r trên 0,145 → r dưới 0,195), KHÔNG còn 2 cầu đỏ ở vai
//   cổ        0,11 — y 1,33..1,44, r 0,05, nối tự nhiên đầu–thân
//   thân      0,50 — hông y 0,80..1,30 (eo 0,84..1,08, ngực 1,06..1,30)
//   tay       vai y 1,29 → khuỷu 1,03 → cổ tay 0,79 → đầu ngón ~0,64
//               (trên đầu gối 0,42); bắp tay thuôn, cẳng tay thuôn, bàn tay
//               có ngón cái + 3 ngón gợi ý
//   chân      hông y 0,80 → gối 0,42 → cổ chân 0,07 → đế giày y = 0
//               (đùi/cẳng thuôn, gối cầu chìm, giày có mũi/thân/đế)
//   rộng nhất 0,50 (vai/tay áo); sâu nhất ~0,56 (mũi giày +0,20 .. ba lô −0,26)
// Khớp riêng để gập: khuỷu (forearm group) + gối (shin group) + cổ chân
// (foot group) — Player.tsx lái qua `joints`, NPC đặt tư thế tĩnh.
// Ba lô: rộng 0,30 (< thân 0,40), y 0,94..1,32 (dưới vai tới thắt lưng,
// không che mông), sâu 0,12, quai ôm qua vai; tháo được qua prop
// `showBackpack` (Player nối vào hook window.__bkhn.setBackpack).
// Polo HUST (người chơi, theo ảnh tham chiếu hust.edu.vn 05/2025 — chỉ xem,
// không copy ảnh vào project): polo đỏ tươi #DA1E26, TAY NGẮN tới giữa bắp
// tay (lộ cẳng tay da), cổ bẻ viền trắng + đường tối mảnh, nẹp cúc ngắn
// 2 cúc tối, chữ "HUST" trắng nhỏ ngực TRÁI người mặc (+X), mép tay áo
// viền trắng, phom vừa người hơi rộng, vải mờ (roughness ~0,88) + vài nếp
// nhẹ ở nách/gấu. Huy hiệu tay áo trong ảnh không đọc rõ → KHÔNG vẽ giả.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, type RefObject } from 'react';
import * as THREE from 'three';

// --- Bảng màu ----------------------------------------------------------------
const POLO_RED = '#DA1E26'; // đỏ polo tươi (ảnh tham chiếu)
const POLO_DARK = '#8F1418'; // viền/nẹp cúc đỏ sẫm
const BUTTON_DARK = '#5A0E12'; // cúc tối màu
const NAVY = '#1F3A5F';
const NAVY_DARK = '#152A45';
const KHAKI = '#8A7B5C';
const SHIRT_WHITE = '#F5F5F0';
const SHIRT_DARK = '#D8D5CC';
const PANTS = '#232E3D'; // quần xanh than (người chơi)
const SHOE_WHITE = '#F5F5F5';
const SHOE_SOLE = '#222222';
const SKIN = '#ECC39E'; // da, roughness 0,72
const HAIR = '#1A1A1A';
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
export type HairStyle = 'short' | 'swept' | 'bun';

export interface FigureProps {
  variant: FigureVariant;
  shirt: string;
  shirtDark: string;
  pants: string;
  shoe: string;
  shoeSole: string;
  hairStyle: HairStyle;
  glasses?: boolean;
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

/** Bàn tay: lòng bàn tay cầu dẹt + 3 ngón gợi ý + ngón cái nhận diện được. */
function Hand({ side }: { side: -1 | 1 }) {
  return (
    <group>
      <mesh position={[0, -0.05, 0.005]} scale={[0.8, 1.15, 0.55]} castShadow>
        <sphereGeometry args={[0.05, 12, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
      {[-0.022, 0, 0.022].map((fx, i) => (
        <mesh key={i} position={[fx, -0.115, 0.008]}>
          <cylinderGeometry args={[0.0105, 0.009, 0.042, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.72} />
        </mesh>
      ))}
      {/* Ngón cái: phía trong bàn tay (về phía thân khi tay buông). */}
      <mesh position={[-side * 0.042, -0.055, 0.012]} rotation={[0, 0, side * 0.55]}>
        <cylinderGeometry args={[0.011, 0.0095, 0.038, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
    </group>
  );
}

/** Một tay: pivot ở vai (±0,19, 1,29). Tay ngắn (polo) hay dài (hoodie/sơ mi)
 *  do `sleeve` quyết định; khuỷu là group con để gập. */
function ArmSide({
  side,
  sleeve,
  shirt,
  shirtDark,
  shoulderRef,
  elbowRef,
}: {
  side: -1 | 1;
  sleeve: 'short' | 'long';
  shirt: string;
  shirtDark: string;
  shoulderRef?: RefObject<THREE.Group>;
  elbowRef?: RefObject<THREE.Group>;
}) {
  const short = sleeve === 'short';
  return (
    <group ref={shoulderRef} position={[side * 0.19, 1.29, 0]}>
      {short ? (
        <group>
          {/* Tay áo polo tới giữa bắp tay (y 1,29..1,14) + viền trắng mép tay. */}
          <mesh position={[0, -0.075, 0]} castShadow>
            <cylinderGeometry args={[0.058, 0.055, 0.15, 14]} />
            <meshStandardMaterial color={shirt} roughness={0.88} />
          </mesh>
          <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.055, 0.007, 8, 16]} />
            <meshStandardMaterial color={WHITE} roughness={0.85} />
          </mesh>
          {/* Bắp tay da lộ ra dưới tay áo (y 1,14..1,03). */}
          <mesh position={[0, -0.205, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.046, 0.11, 12]} />
            <meshStandardMaterial color={SKIN} roughness={0.72} />
          </mesh>
        </group>
      ) : (
        <group>
          {/* Tay áo dài thuôn tới cổ tay (y 1,29..0,83) + bo tay. */}
          <mesh position={[0, -0.23, 0]} castShadow>
            <cylinderGeometry args={[0.058, 0.047, 0.46, 14]} />
            <meshStandardMaterial color={shirt} roughness={0.88} />
          </mesh>
          <mesh position={[0, -0.46, 0]} castShadow>
            <cylinderGeometry args={[0.048, 0.048, 0.035, 14]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
          {/* Cổ tay da. */}
          <mesh position={[0, -0.485, 0]}>
            <cylinderGeometry args={[0.038, 0.04, 0.04, 12]} />
            <meshStandardMaterial color={SKIN} roughness={0.72} />
          </mesh>
        </group>
      )}
      {/* Khớp khuỷu cầu CHÌM (cùng màu da/tay áo, không lộ như khớp robot). */}
      <mesh position={[0, -0.26, 0]}>
        <sphereGeometry args={[short ? 0.044 : 0.046, 12, 10]} />
        <meshStandardMaterial color={short ? SKIN : shirt} roughness={0.85} />
      </mesh>
      {/* Cẳng tay + bàn tay: group con pivoting tại khuỷu (y 1,03). */}
      <group ref={elbowRef} position={[0, -0.26, 0]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <cylinderGeometry args={[0.044, 0.037, 0.24, 12]} />
          <meshStandardMaterial color={SKIN} roughness={0.72} />
        </mesh>
        <group position={[0, -0.24, 0]}>
          <Hand side={side} />
        </group>
      </group>
    </group>
  );
}

/** Một chân: pivot ở hông (±0,095, 0,80). Gối là group con để gập, bàn chân
 *  là group con ở cổ chân (y 0,07) để giữ bàn chân tiếp đất khi đi. */
function LegSide({
  side,
  pants,
  shoe,
  shoeSole,
  hipRef,
  kneeRef,
  footRef,
}: {
  side: -1 | 1;
  pants: string;
  shoe: string;
  shoeSole: string;
  hipRef?: RefObject<THREE.Group>;
  kneeRef?: RefObject<THREE.Group>;
  footRef?: RefObject<THREE.Group>;
}) {
  return (
    <group ref={hipRef} position={[side * 0.095, 0.8, 0]}>
      {/* Đùi thuôn xuống gối (y 0,80..0,42); đầu trên chìm trong hông áo. */}
      <mesh position={[0, -0.19, 0]} castShadow>
        <cylinderGeometry args={[0.098, 0.082, 0.38, 14]} />
        <meshStandardMaterial color={pants} roughness={0.88} />
      </mesh>
      {/* Khớp gối cầu CHÌM (cùng màu quần). */}
      <mesh position={[0, -0.38, 0]}>
        <sphereGeometry args={[0.08, 12, 10]} />
        <meshStandardMaterial color={pants} roughness={0.88} />
      </mesh>
      {/* Cẳng chân: group con pivoting tại gối (y 0,42). */}
      <group ref={kneeRef} position={[0, -0.38, 0]}>
        <mesh position={[0, -0.165, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.33, 14]} />
          <meshStandardMaterial color={pants} roughness={0.88} />
        </mesh>
        {/* Gấu quần + tất cổ chân. */}
        <mesh position={[0, -0.315, 0]} castShadow>
          <cylinderGeometry args={[0.064, 0.064, 0.035, 14]} />
          <meshStandardMaterial color={pants} roughness={0.88} />
        </mesh>
        <mesh position={[0, -0.335, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.035, 12]} />
          <meshStandardMaterial color={SOCK} roughness={0.85} />
        </mesh>
        {/* Bàn chân: group con tại cổ chân (y 0,07) — giày có mũi/thân/đế. */}
        <group ref={footRef} position={[0, -0.35, 0]}>
          <mesh position={[0, -0.055, 0.03]} castShadow>
            <boxGeometry args={[0.16, 0.03, 0.3]} />
            <meshStandardMaterial color={shoeSole} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.028, 0.03]} castShadow>
            <boxGeometry args={[0.15, 0.055, 0.26]} />
            <meshStandardMaterial color={shoe} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.032, 0.135]} scale={[1, 0.6, 1]} castShadow>
            <sphereGeometry args={[0.062, 12, 10]} />
            <meshStandardMaterial color={shoe} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.002, 0.07]}>
            <boxGeometry args={[0.085, 0.007, 0.016]} />
            <meshStandardMaterial color={shoeSole} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.002, 0.105]}>
            <boxGeometry args={[0.085, 0.007, 0.016]} />
            <meshStandardMaterial color={shoeSole} roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Thân áo: hông + eo + ngực + phễu vai DỐC + chi tiết theo variant. */
function Torso({
  variant,
  shirt,
  shirtDark,
  pants,
  hustTex,
}: {
  variant: FigureVariant;
  shirt: string;
  shirtDark: string;
  pants: string;
  hustTex: THREE.CanvasTexture;
}) {
  return (
    <group>
      {/* Hông (quần) — cầu dẹt chìm dưới gấu áo, nối đùi với thân. */}
      <mesh position={[0, 0.86, 0]} scale={[1, 0.55, 0.72]} castShadow>
        <sphereGeometry args={[0.2, 18, 12]} />
        <meshStandardMaterial color={pants} roughness={0.88} />
      </mesh>
      {/* Eo + ngực: trụ thuôn, tiết diện ellipse (rộng hơn sâu). */}
      <mesh position={[0, 0.96, 0]} scale={[1, 1, 0.7]} castShadow>
        <cylinderGeometry args={[0.2, 0.195, 0.24, 18]} />
        <meshStandardMaterial color={shirt} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.18, 0]} scale={[1.02, 1, 0.72]} castShadow>
        <cylinderGeometry args={[0.185, 0.2, 0.24, 18]} />
        <meshStandardMaterial color={shirt} roughness={0.88} />
      </mesh>
      {/* Phễu vai DỐC (r trên 0,145 → r dưới 0,195): vai xuôi xuống cánh tay. */}
      <mesh position={[0, 1.3, 0]} scale={[1.02, 1, 0.72]} castShadow>
        <cylinderGeometry args={[0.145, 0.195, 0.08, 18]} />
        <meshStandardMaterial color={shirt} roughness={0.88} />
      </mesh>
      {/* Gấu áo: đai + viền torus mảnh. */}
      <mesh position={[0, 0.845, 0]} scale={[1, 1, 0.7]} castShadow>
        <cylinderGeometry args={[0.198, 0.2, 0.035, 18]} />
        <meshStandardMaterial color={shirtDark} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.828, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.7, 1]}>
        <torusGeometry args={[0.198, 0.008, 8, 20]} />
        <meshStandardMaterial color={shirtDark} roughness={0.88} />
      </mesh>

      {variant === 'polo' && (
        <group>
          {/* Cổ bẻ: đai cổ đỏ + viền trắng trên miệng cổ + đường tối mảnh dưới. */}
          <mesh position={[0, 1.345, 0]}>
            <cylinderGeometry args={[0.078, 0.088, 0.04, 16]} />
            <meshStandardMaterial color={shirt} roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.366, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.078, 0.006, 8, 16]} />
            <meshStandardMaterial color={WHITE} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.326, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.086, 0.004, 8, 16]} />
            <meshStandardMaterial color={POLO_DARK} roughness={0.85} />
          </mesh>
          {/* Hai cánh cổ bẻ trước ngực (đỏ, mép dưới viền trắng mảnh). */}
          <mesh position={[-0.048, 1.335, 0.062]} rotation={[0.55, 0, 0.38]}>
            <boxGeometry args={[0.085, 0.05, 0.008]} />
            <meshStandardMaterial color={shirt} roughness={0.88} />
          </mesh>
          <mesh position={[0.048, 1.335, 0.062]} rotation={[0.55, 0, -0.38]}>
            <boxGeometry args={[0.085, 0.05, 0.008]} />
            <meshStandardMaterial color={shirt} roughness={0.88} />
          </mesh>
          <mesh position={[-0.048, 1.312, 0.075]} rotation={[0.55, 0, 0.38]}>
            <boxGeometry args={[0.082, 0.007, 0.009]} />
            <meshStandardMaterial color={WHITE} roughness={0.85} />
          </mesh>
          <mesh position={[0.048, 1.312, 0.075]} rotation={[0.55, 0, -0.38]}>
            <boxGeometry args={[0.082, 0.007, 0.009]} />
            <meshStandardMaterial color={WHITE} roughness={0.85} />
          </mesh>
          {/* Nẹp cúc ngắn + 2 cúc tối màu. */}
          <mesh position={[0, 1.265, 0.142]}>
            <boxGeometry args={[0.05, 0.14, 0.012]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
          {[1.3, 1.235].map((by) => (
            <mesh key={by} position={[0, by, 0.149]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.008, 10]} />
              <meshStandardMaterial color={BUTTON_DARK} roughness={0.6} />
            </mesh>
          ))}
          {/* Chữ "HUST" trắng nhỏ ở ngực TRÁI người mặc (+X), ôm cong ngực.
              rotation.y +0,45 để mặt chữ hướng ra ngoài theo đường cong ngực
              (dấu âm trước đây úp mép chữ vào trong áo nên không thấy chữ);
              đặt lệch quai balô (quai ở x ±0,13) để chữ không bị quai che. */}
          <mesh position={[0.065, 1.22, 0.136]} rotation={[0, 0.45, 0]}>
            <planeGeometry args={[0.08, 0.024]} />
            <meshStandardMaterial map={hustTex} transparent roughness={0.8} />
          </mesh>
          {/* Nếp vải nhẹ: nách + gấu (đỏ sẫm hơn một nấc, mỏng, không bóng). */}
          <mesh position={[-0.185, 1.14, 0.08]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.012, 0.07, 0.012]} />
            <meshStandardMaterial color={shirtDark} roughness={0.9} />
          </mesh>
          <mesh position={[0.185, 1.14, 0.08]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.012, 0.07, 0.012]} />
            <meshStandardMaterial color={shirtDark} roughness={0.9} />
          </mesh>
        </group>
      )}

      {variant === 'hoodie' && (
        <group>
          {/* Hoodie pullover: túi kangaroo + miệng túi cuộn + dây rút + mũ sau gáy. */}
          <mesh position={[0, 0.94, 0.155]} castShadow>
            <boxGeometry args={[0.3, 0.19, 0.035]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.03, 0.17]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.28, 10]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.345, 0]}>
            <cylinderGeometry args={[0.08, 0.09, 0.05, 16]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
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
            <meshStandardMaterial color={shirtDark} roughness={0.9} />
          </mesh>
        </group>
      )}

      {variant === 'shirt' && (
        <group>
          {/* Sơ mi trắng: cổ bẻ + 4 khuy + túi ngực + bút + thắt lưng. */}
          <mesh position={[0, 1.345, 0]}>
            <cylinderGeometry args={[0.078, 0.088, 0.04, 16]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
          <mesh position={[-0.048, 1.335, 0.062]} rotation={[0.55, 0, 0.38]}>
            <boxGeometry args={[0.085, 0.05, 0.008]} />
            <meshStandardMaterial color={shirt} roughness={0.88} />
          </mesh>
          <mesh position={[0.048, 1.335, 0.062]} rotation={[0.55, 0, -0.38]}>
            <boxGeometry args={[0.085, 0.05, 0.008]} />
            <meshStandardMaterial color={shirt} roughness={0.88} />
          </mesh>
          {[1.31, 1.19, 1.07, 0.95].map((by, i) => (
            <mesh key={i} position={[0, by, 0.148]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshStandardMaterial color="#E8E4D8" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[-0.12, 1.17, 0.135]}>
            <boxGeometry args={[0.1, 0.11, 0.014]} />
            <meshStandardMaterial color={shirt} roughness={0.88} />
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
    </group>
  );
}

/** Đầu + cổ: cổ nối tự nhiên, đầu dẹt dọc, tóc + mặt gợi ý nhẹ bằng khối nổi. */
function Head({
  hairStyle,
  glasses,
  cap,
}: {
  hairStyle: HairStyle;
  glasses?: boolean;
  cap?: string;
}) {
  return (
    <group>
      {/* Cổ: y 1,33..1,44. */}
      <mesh position={[0, 1.385, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.056, 0.11, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
      {/* Đầu: cầu r 0,108 dẹt dọc, tâm y 1,555 (y 1,43..1,68). */}
      <mesh position={[0, 1.555, 0]} scale={[0.92, 1.16, 0.96]} castShadow>
        <sphereGeometry args={[0.108, 24, 18]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
      {/* Tóc: chỏm cầu phủ đỉnh + khối sau gáy. */}
      <mesh position={[0, 1.562, -0.008]} rotation={[-0.28, 0, 0]} castShadow>
        <sphereGeometry args={[0.112, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial color={HAIR} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.51, -0.05]} scale={[0.92, 0.9, 0.68]} castShadow>
        <sphereGeometry args={[0.102, 18, 14]} />
        <meshStandardMaterial color={HAIR} roughness={0.88} />
      </mesh>
      {hairStyle === 'short' && (
        <mesh position={[0, 1.635, 0.06]} scale={[1.15, 0.42, 0.55]}>
          <sphereGeometry args={[0.075, 14, 10]} />
          <meshStandardMaterial color={HAIR} roughness={0.88} />
        </mesh>
      )}
      {hairStyle === 'swept' && (
        <mesh position={[0.028, 1.632, 0.06]} rotation={[0, 0, -0.18]} scale={[1.2, 0.38, 0.52]}>
          <sphereGeometry args={[0.075, 14, 10]} />
          <meshStandardMaterial color={HAIR} roughness={0.88} />
        </mesh>
      )}
      {hairStyle === 'bun' && (
        <group>
          {/* Búi tóc gọn sau đầu + trâm (đỉnh búi 1,685 < tóc 1,70). */}
          <mesh position={[0, 1.615, -0.145]} scale={[1, 0.9, 0.9]} castShadow>
            <sphereGeometry args={[0.065, 14, 12]} />
            <meshStandardMaterial color={HAIR} roughness={0.88} />
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
      {/* Mũ lưỡi trai (chỉ Minh): vòm phủ đỉnh + lưỡi trai đưa ra trước. */}
      {cap && (
        <group>
          <mesh position={[0, 1.632, 0.005]} rotation={[-0.12, 0, 0]} castShadow>
            <sphereGeometry args={[0.118, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={cap} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.62, 0.155]} rotation={[0.12, 0, 0]} scale={[1, 0.18, 1]} castShadow>
            <cylinderGeometry args={[0.08, 0.09, 0.028, 16]} />
            <meshStandardMaterial color={cap} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.632, 0.095]}>
            <boxGeometry args={[0.028, 0.011, 0.011]} />
            <meshStandardMaterial color={WHITE} roughness={0.8} />
          </mesh>
        </group>
      )}
      {/* Tai hai bên. */}
      <mesh position={[-0.1, 1.555, 0]} scale={[0.5, 1, 0.8]}>
        <sphereGeometry args={[0.026, 10, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
      <mesh position={[0.1, 1.555, 0]} scale={[0.5, 1, 0.8]}>
        <sphereGeometry args={[0.026, 10, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
      {/* Mặt gợi ý nhẹ: mắt cầu nhỏ, lông mày, mũi cầu dẹt, miệng torus. */}
      <mesh position={[-0.042, 1.56, 0.098]}>
        <sphereGeometry args={[0.012, 10, 8]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.4} />
      </mesh>
      <mesh position={[0.042, 1.56, 0.098]}>
        <sphereGeometry args={[0.012, 10, 8]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.4} />
      </mesh>
      <mesh position={[-0.042, 1.585, 0.096]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.036, 0.007, 0.009]} />
        <meshStandardMaterial color={HAIR} roughness={0.88} />
      </mesh>
      <mesh position={[0.042, 1.585, 0.096]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.036, 0.007, 0.009]} />
        <meshStandardMaterial color={HAIR} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.53, 0.1]} scale={[0.7, 1.2, 0.6]}>
        <sphereGeometry args={[0.018, 10, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.492, 0.088]} rotation={[0.15, 0, Math.PI]}>
        <torusGeometry args={[0.026, 0.0045, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#8E3B34" roughness={0.7} />
      </mesh>
      {glasses && (
        <group>
          <mesh position={[-0.042, 1.56, 0.102]}>
            <torusGeometry args={[0.03, 0.0038, 8, 16]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.5} />
          </mesh>
          <mesh position={[0.042, 1.56, 0.102]}>
            <torusGeometry args={[0.03, 0.0038, 8, 16]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.563, 0.102]}>
            <boxGeometry args={[0.018, 0.005, 0.005]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.5} />
          </mesh>
          <mesh position={[-0.08, 1.563, 0.055]}>
            <boxGeometry args={[0.005, 0.005, 0.09]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.5} />
          </mesh>
          <mesh position={[0.08, 1.563, 0.055]}>
            <boxGeometry args={[0.005, 0.005, 0.09]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Ba lô gọn: rộng 0,30, cao y 0,94..1,32, sâu 0,12 — quai ôm qua vai,
 *  không che cổ/đường vai, không xuyên áo/cánh tay. */
function Backpack({ colors }: { colors: { pack: string; packLight: string; packZip: string } }) {
  const { pack, packLight, packZip } = colors;
  return (
    <group>
      {/* Thân chính: trụ bo + nắp vòm + đáy bo. */}
      <mesh position={[0, 1.13, -0.2]} scale={[1, 1, 0.6]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 18]} />
        <meshStandardMaterial color={pack} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.28, -0.2]} scale={[1, 0.5, 0.6]} castShadow>
        <sphereGeometry args={[0.15, 18, 12]} />
        <meshStandardMaterial color={pack} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.98, -0.2]} scale={[1, 0.5, 0.6]}>
        <sphereGeometry args={[0.15, 18, 12]} />
        <meshStandardMaterial color={pack} roughness={0.9} />
      </mesh>
      {/* Ngăn trước bo tròn + khóa kéo ngang + tay kéo. */}
      <mesh position={[0, 1.06, -0.258]} scale={[1, 0.7, 0.35]} castShadow>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshStandardMaterial color={packLight} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.12, -0.288]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, 0.19, 8]} />
        <meshStandardMaterial color={packZip} roughness={0.6} />
      </mesh>
      <mesh position={[0.045, 1.105, -0.293]}>
        <boxGeometry args={[0.016, 0.028, 0.008]} />
        <meshStandardMaterial color={SILVER} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Túi hông một bên. */}
      <mesh position={[0.155, 1.02, -0.2]} scale={[0.35, 0.7, 0.7]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color={packLight} roughness={0.9} />
      </mesh>
      {/* Quai xách trên nóc. */}
      <mesh position={[0, 1.355, -0.2]}>
        <torusGeometry args={[0.035, 0.01, 8, 16, Math.PI]} />
        <meshStandardMaterial color={pack} roughness={0.9} />
      </mesh>
      {/* Quai đeo: dải vắt qua vai (y 1,315, sát đỉnh vai, không che cổ) +
          dây dẹt trước ngực xuống tới thắt lưng + khóa điều chỉnh.
          Quai đặt ở x ±0,13 — lệch khỏi chữ HUST (ngực trái, x 0,025..0,105)
          để không che chữ; vẫn nằm trên vai/ngực, không chạm cánh tay. */}
      {[-0.13, 0.13].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.315, -0.02]}>
            <boxGeometry args={[0.055, 0.02, 0.32]} />
            <meshStandardMaterial color={pack} roughness={0.9} />
          </mesh>
          <mesh position={[x, 1.16, 0.148]} rotation={[-0.04, 0, 0]}>
            <boxGeometry args={[0.055, 0.34, 0.016]} />
            <meshStandardMaterial color={pack} roughness={0.9} />
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

/** Hình người đầy đủ, dùng chung cho người chơi + NPC (chỉ khác variant/màu).
 *  Chân nằm ngoài `body` (đứng trên đất khi thân nghiêng/thở); tay + thân +
 *  đầu + ba lô nằm trong `body` để Player/NPC nghiêng/thở cả thân trên.
 *  Quy ước trái/phải (đợt 3 giai đoạn 1): mặt trước = +Z nên bên TRÁI của
 *  nhân vật là +X — khớp *L gắn ở +X, khớp *R gắn ở −X. Trước đây *L gắn ở
 *  −X (nhãn đảo so với cơ thể thật, trong khi chữ HUST ngực trái đã đúng
 *  ở +X). Hình học Hand (ngón cái phía trong + phía trước) đi theo `side`
 *  nên đã đúng theo phía vật lý, chỉ cần đổi phía gắn — không sửa Hand. */
export function HumanFigure(props: FigureProps) {
  const {
    variant, shirt, shirtDark, pants, shoe, shoeSole,
    hairStyle, glasses, cap, backpack, backpackColors, joints,
    showBackpack = true,
  } = props;
  const hustTex = useHustTexture();
  const sleeve: 'short' | 'long' = variant === 'polo' ? 'short' : 'long';
  const packColors = backpackColors ?? { pack: PACK_BLACK, packLight: '#2A2E33', packZip: PACK_ZIP };
  return (
    <group>
      <LegSide side={1} pants={pants} shoe={shoe} shoeSole={shoeSole}
        hipRef={joints?.legL} kneeRef={joints?.kneeL} footRef={joints?.footL} />
      <LegSide side={-1} pants={pants} shoe={shoe} shoeSole={shoeSole}
        hipRef={joints?.legR} kneeRef={joints?.kneeR} footRef={joints?.footR} />
      <group ref={joints?.body}>
        <Torso variant={variant} shirt={shirt} shirtDark={shirtDark} pants={pants} hustTex={hustTex} />
        <ArmSide side={1} sleeve={sleeve} shirt={shirt} shirtDark={shirtDark}
          shoulderRef={joints?.armL} elbowRef={joints?.elbowL} />
        <ArmSide side={-1} sleeve={sleeve} shirt={shirt} shirtDark={shirtDark}
          shoulderRef={joints?.armR} elbowRef={joints?.elbowR} />
        <Head hairStyle={hairStyle} glasses={glasses} cap={cap} />
        {backpack && showBackpack && <Backpack colors={packColors} />}
      </group>
    </group>
  );
}

export interface StudentAvatarProps {
  joints: FigureJoints;
  showBackpack?: boolean;
}

/** Người chơi: polo HUST đỏ + quần xanh than + giày trắng + ba lô đen. */
export default function StudentAvatar({ joints, showBackpack = true }: StudentAvatarProps) {
  return (
    <HumanFigure
      variant="polo"
      shirt={POLO_RED}
      shirtDark={POLO_DARK}
      pants={PANTS}
      shoe={SHOE_WHITE}
      shoeSole={SHOE_SOLE}
      hairStyle="short"
      backpack
      backpackColors={{ pack: PACK_BLACK, packLight: '#2A2E33', packZip: PACK_ZIP }}
      joints={joints}
      showBackpack={showBackpack}
    />
  );
}

// Giữ export màu để Npc dùng chung nếu cần (không bắt buộc).
export const AVATAR_COLORS = { NAVY, NAVY_DARK, KHAKI, PACK_GRAY, PACK_GRAY_LIGHT, SHIRT_WHITE, SHIRT_DARK };
