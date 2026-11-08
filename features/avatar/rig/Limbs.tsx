// ---------------------------------------------------------------------------
// features/avatar/rig/Limbs.tsx — Khớp tay (ArmSide + Hand) và khớp chân
// (LegSide) có cầu khớp che kín điểm xoay (Ball-Joint Caps)
// Module ID: avatar.rig
// ---------------------------------------------------------------------------

import type { RefObject } from 'react';
import type * as THREE from 'three';
import {
  HUST_CRIMSON,
  POLO_RED,
  SKIN,
  SOCK,
  WHITE,
  WINDBREAKER_WHITE,
  type FigureVariant,
} from '../appearance/presets';

/** Bàn tay: lòng bàn tay bo mềm + 4 ngón tay + ngón cái tự nhiên. */
export function Hand({ side, scale = 1 }: { side: -1 | 1; scale?: number }) {
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
export function ArmSide({
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
  const short = variant === 'polo' || variant === 'tshirt';
  const isWindbreaker = variant === 'windbreaker';
  const isBomber = variant === 'bomber';
  const isSweater = variant === 'sweater';
  const isHoodie = variant === 'hoodie';
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
          theo đúng ảnh thật ao-khoac-gio-do-chi-tiet-01.jpg, polo-do-nam-nu-01.jpg, ao-phong-xanh-nu-01.jpg */}
      {side === 1 && sleeveBadgeTex && (isWindbreaker || short || isBomber || isHoodie || isSweater) && (
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
            {(isBomber || isSweater) && (
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
export function LegSide({
  side,
  hipX,
  legScale,
  pants,
  skirtColor,
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
  skirtColor?: string;
  shoe: string;
  shoeSole: string;
  fabricTex: THREE.CanvasTexture;
  hipRef?: RefObject<THREE.Group>;
  kneeRef?: RefObject<THREE.Group>;
  footRef?: RefObject<THREE.Group>;
}) {
  const hasSkirt = Boolean(skirtColor);
  const hipTone = skirtColor ?? pants;
  const lowerLegTone = hasSkirt ? SKIN : pants;

  return (
    <group ref={hipRef} position={[side * hipX, 0.8, 0]}>
      {/* KHỚP CẦU HÁNG (Hip Ball-Joint Cap) đặt đúng tâm xoay (0,0,0) — không bao giờ hở háng */}
      <mesh position={[0, 0.01, 0]} scale={[legScale, 1.05, legScale]} castShadow>
        <sphereGeometry args={[0.102, 16, 14]} />
        <meshStandardMaterial color={hipTone} map={fabricTex} roughness={0.86} />
      </mesh>

      {hasSkirt ? (
        <>
          {/* Phần đùi trên nằm trong lòng chân váy (đồng màu váy để khi bước rộng không lộ khe) */}
          <mesh position={[0, -0.095, 0]} scale={[legScale, 1, legScale]} castShadow>
            <cylinderGeometry args={[0.098, 0.09, 0.19, 16]} />
            <meshStandardMaterial color={hipTone} map={fabricTex} roughness={0.84} />
          </mesh>
          {/* Phần đùi dưới lộ dưới gấu chân váy */}
          <mesh position={[0, -0.275, 0]} scale={[legScale, 1, legScale]} castShadow>
            <cylinderGeometry args={[0.086, 0.078, 0.22, 16]} />
            <meshStandardMaterial color={SKIN} roughness={0.68} />
          </mesh>
        </>
      ) : (
        <>
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
        </>
      )}

      {/* KHỚP CẦU GỐI (Knee Ball-Joint Cap) tại tâm xoay gối (0, -0.38, 0) */}
      <mesh position={[0, -0.38, 0]} scale={[legScale, legScale, legScale]}>
        <sphereGeometry args={[hasSkirt ? 0.077 : 0.083, 14, 12]} />
        <meshStandardMaterial
          color={lowerLegTone}
          map={hasSkirt ? undefined : fabricTex}
          roughness={hasSkirt ? 0.68 : 0.86}
        />
      </mesh>

      {/* Cẳng chân xoay quanh gối (y = 0,42) */}
      <group ref={kneeRef} position={[0, -0.38, 0]}>
        <mesh position={[0, -0.165, 0]} scale={[legScale, 1, legScale]} castShadow>
          <cylinderGeometry args={[hasSkirt ? 0.075 : 0.082, hasSkirt ? 0.056 : 0.064, 0.34, 16]} />
          <meshStandardMaterial
            color={lowerLegTone}
            map={hasSkirt ? undefined : fabricTex}
            roughness={hasSkirt ? 0.68 : 0.86}
          />
        </mesh>
        {!hasSkirt && (
          <>
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
          </>
        )}
        {/* Cổ tất thể thao cao + Cầu khớp cổ chân (nhúng sâu từ y=-0.285 xuống y=-0.365 xuyên vào cổ giày) */}
        <mesh position={[0, hasSkirt ? -0.315 : -0.335, 0]} scale={[legScale, 1, legScale]}>
          <cylinderGeometry args={[0.056, 0.054, hasSkirt ? 0.095 : 0.062, 14]} />
          <meshStandardMaterial color={SOCK} roughness={0.82} />
        </mesh>
        {hasSkirt && (
          <mesh position={[0, -0.274, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[legScale, legScale, 1]}>
            <torusGeometry args={[0.056, 0.004, 8, 16]} />
            <meshStandardMaterial color={HUST_CRIMSON} roughness={0.75} />
          </mesh>
        )}
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
