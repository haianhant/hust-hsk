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
  SKIN_WARM,
  SOCK,
  WHITE,
  WINDBREAKER_WHITE,
  type FigureVariant,
} from '../appearance/presets';

const FINGER_SPECS: Array<{ x: number; len: number; rTop: number; rBot: number; curl: number }> = [
  { x: -0.023, len: 0.04, rTop: 0.0082, rBot: 0.0068, curl: 0.14 },
  { x: -0.008, len: 0.046, rTop: 0.0086, rBot: 0.0072, curl: 0.17 },
  { x: 0.008, len: 0.043, rTop: 0.0083, rBot: 0.007, curl: 0.19 },
  { x: 0.022, len: 0.035, rTop: 0.0075, rBot: 0.0062, curl: 0.22 },
];

/** Bàn tay 3D: cổ tay thuôn + lòng bàn tay giải phẫu + 4 ngón tay phân cấp có đốt/đầu ngón bo tròn + ngón cái 2 đốt tự nhiên. */
export function Hand({ side, scale = 1 }: { side: -1 | 1; scale?: number }) {
  return (
    <group scale={[scale, scale, scale]}>
      {/* Cổ tay nối mượt vào ống tay / cẳng tay */}
      <mesh position={[0, -0.01, 0]} scale={[0.92, 1, 0.76]} castShadow>
        <cylinderGeometry args={[0.033, 0.035, 0.026, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.66} />
      </mesh>
      {/* Mu bàn tay & lòng bàn tay tạo khối tự nhiên */}
      <mesh position={[0, -0.048, 0.004]} scale={[0.84, 1.08, 0.54]} castShadow>
        <sphereGeometry args={[0.048, 16, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.66} />
      </mesh>
      <mesh position={[0, -0.05, -0.008]} scale={[0.74, 0.92, 0.42]}>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshStandardMaterial color={SKIN_WARM} roughness={0.72} />
      </mesh>
      {/* Hàng khớp đốt bàn tay (knuckle ridge) */}
      <mesh position={[0, -0.082, 0.006]} rotation={[0, 0, Math.PI / 2]} scale={[0.72, 1, 0.65]}>
        <cylinderGeometry args={[0.014, 0.014, 0.058, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.66} />
      </mesh>
      {/* 4 ngón tay có độ dài phân cấp (trỏ, giữa, áp út, út) hơi khum tự nhiên + đầu ngón bo tròn */}
      {FINGER_SPECS.map((f, i) => {
        const fx = side === 1 ? f.x : -f.x;
        return (
          <group key={i} position={[fx, -0.084, 0.006]} rotation={[f.curl, 0, 0]}>
            <mesh position={[0, -f.len / 2, 0]} castShadow>
              <cylinderGeometry args={[f.rTop, f.rBot, f.len, 10]} />
              <meshStandardMaterial color={SKIN} roughness={0.66} />
            </mesh>
            <mesh position={[0, -f.len, 0]}>
              <sphereGeometry args={[f.rBot * 0.98, 10, 8]} />
              <meshStandardMaterial color={SKIN_WARM} roughness={0.68} />
            </mesh>
          </group>
        );
      })}
      {/* Ngón cái 2 đốt xoay chéo tự nhiên bên cạnh trong bàn tay */}
      <group position={[-side * 0.036, -0.042, 0.012]} rotation={[0.2, 0, side * 0.52]}>
        <mesh position={[0, -0.018, 0]} castShadow>
          <cylinderGeometry args={[0.0115, 0.0095, 0.036, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.66} />
        </mesh>
        <mesh position={[0, -0.036, 0]}>
          <sphereGeometry args={[0.0092, 10, 8]} />
          <meshStandardMaterial color={SKIN_WARM} roughness={0.68} />
        </mesh>
      </group>
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
  const isSport = variant === 'sport';
  const short = variant === 'polo' || variant === 'tshirt' || isSport;
  const isWindbreaker = variant === 'windbreaker';
  const isBomber = variant === 'bomber';
  const isSweater = variant === 'sweater';
  const isHoodie = variant === 'hoodie';
  const pipingColor = upperYokeColor ?? WINDBREAKER_WHITE;
  const topSleeveTone = isBomber ? (sleeveColor ?? shirt) : shirt;
  const lowSleeveTone = isBomber ? (sleeveColor ?? shirt) : shirt;

  return (
    <group ref={shoulderRef} position={[side * shoulderX, 1.29, 0]}>
      {/* Khớp cầu đầu vai (Shoulder Ball-Joint Cap) lấp kín 100% khe vai ở mọi góc vung tay */}
      <mesh position={[0, 0.006, 0]} scale={[armScale, 1, armScale]} castShadow>
        <sphereGeometry args={[0.061, 14, 12]} />
        <meshStandardMaterial color={topSleeveTone} map={fabricTex} roughness={0.82} />
      </mesh>

      {/* Phù hiệu tròn trắng-đỏ ĐHBK Hà Nội gắn ở mặt ngoài bắp tay trái (side === 1)
          theo đúng ảnh thật ao-khoac-gio-do-chi-tiet-01.jpg, ao-the-thao-co-tron.png, polo-do-nam-nu-01.jpg */}
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
          {/* Tay áo ngắn polo / tshirt / sport + viền bo tay */}
          <mesh position={[0, -0.075, 0]} scale={[armScale, 1, armScale]} castShadow>
            <cylinderGeometry args={[0.058, 0.053, 0.15, 16]} />
            <meshStandardMaterial color={shirt} map={fabricTex} roughness={0.84} />
          </mesh>
          <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[armScale, armScale, 1]}>
            <torusGeometry args={[0.053, 0.007, 8, 18]} />
            <meshStandardMaterial color={isSport ? shirtDark : WHITE} roughness={0.82} />
          </mesh>
          {isSport && (
            <mesh position={[side * 0.054 * armScale, -0.072, 0]}>
              <boxGeometry args={[0.006, 0.14, 0.012]} />
              <meshStandardMaterial color={WHITE} roughness={0.75} />
            </mesh>
          )}
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
          {/* Đường viền trắng dọc cầu vai & bắp tay Áo khoác gió HUST (ao-khoac-gio.png, ao-khoac-gio-do-chi-tiet-01.jpg) */}
          {isWindbreaker && (
            <>
              <mesh position={[0, -0.175, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[armScale, armScale, 1]}>
                <torusGeometry args={[0.053, 0.0045, 8, 16]} />
                <meshStandardMaterial color={pipingColor} roughness={0.72} />
              </mesh>
              <mesh position={[side * 0.054 * armScale, -0.095, 0]}>
                <boxGeometry args={[0.006, 0.165, 0.012]} />
                <meshStandardMaterial color={pipingColor} roughness={0.72} />
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
  hustTex,
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
  hustTex?: THREE.CanvasTexture;
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
          {/* Sọc trắng chạy dọc mép ngoài đùi quần thể thao xanh than (quan-the-thao.png) */}
          <mesh position={[side * 0.091 * legScale, -0.19, 0]} rotation={[0, 0, -side * 0.04]}>
            <boxGeometry args={[0.008, 0.36, 0.018]} />
            <meshStandardMaterial color={WHITE} roughness={0.78} />
          </mesh>
          {/* Chữ HUST trắng in ở mặt trước đùi trái (side === 1) đúng mẫu quan-the-thao.png */}
          {side === 1 && hustTex && (
            <mesh position={[0.036 * legScale, -0.115, 0.089 * legScale]} rotation={[0, 0.38, 0]}>
              <planeGeometry args={[0.056, 0.019]} />
              <meshStandardMaterial map={hustTex} transparent roughness={0.72} />
            </mesh>
          )}
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

        {/* Bàn chân Giày Thể thao 3D uốn lượn giải phẫu tại cổ chân (y = 0,07; đáy đế ở -0,07 -> world y = 0,000) */}
        <group ref={footRef} position={[0, -0.35, 0]}>
          {/* Đệm cổ giày bo tròn (Padded Ankle Collar) ôm sát cổ tất */}
          <mesh position={[0, 0.005, -0.022]} rotation={[Math.PI / 2, 0, 0]} scale={[0.92 * legScale, 1.08, 1]}>
            <torusGeometry args={[0.052, 0.012, 10, 18]} />
            <meshStandardMaterial color={shoe} roughness={0.62} />
          </mesh>

          {/* Đế ngoài (Sculpted Outsole: gót tròn + eo giữa thuôn + mũi bầu, đáy chạm đúng y = -0.070) */}
          <mesh position={[0, -0.059, -0.052]} scale={[0.96 * legScale, 1, 1.08]} castShadow>
            <cylinderGeometry args={[0.054, 0.056, 0.022, 16]} />
            <meshStandardMaterial color={shoeSole} roughness={0.88} />
          </mesh>
          <mesh position={[0, -0.059, 0.015]} castShadow>
            <boxGeometry args={[0.094 * legScale, 0.022, 0.12]} />
            <meshStandardMaterial color={shoeSole} roughness={0.88} />
          </mesh>
          <mesh position={[0, -0.059, 0.088]} scale={[1.02 * legScale, 1, 1.18]} castShadow>
            <cylinderGeometry args={[0.055, 0.056, 0.022, 18]} />
            <meshStandardMaterial color={shoeSole} roughness={0.88} />
          </mesh>

          {/* Đế giữa đàn hồi (Sculpted Cushion Midsole) ôm vòm bàn chân */}
          <mesh position={[0, -0.044, -0.05]} scale={[0.94 * legScale, 1, 1.06]} castShadow>
            <cylinderGeometry args={[0.053, 0.056, 0.014, 16]} />
            <meshStandardMaterial color="#F1F5F9" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.044, 0.018]} castShadow>
            <boxGeometry args={[0.092 * legScale, 0.014, 0.12]} />
            <meshStandardMaterial color="#F1F5F9" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.044, 0.088]} scale={[0.98 * legScale, 1, 1.16]} castShadow>
            <cylinderGeometry args={[0.053, 0.056, 0.014, 18]} />
            <meshStandardMaterial color="#F1F5F9" roughness={0.7} />
          </mesh>

          {/* Gót giày bo tròn (Rounded Heel Counter) + Tab gót đỏ Bách Khoa */}
          <mesh position={[0, -0.018, -0.048]} scale={[0.9 * legScale, 1, 1.05]} castShadow>
            <cylinderGeometry args={[0.05, 0.054, 0.044, 16]} />
            <meshStandardMaterial color={shoe} roughness={0.62} />
          </mesh>
          <mesh position={[0, -0.008, -0.098]} rotation={[0.12, 0, 0]}>
            <cylinderGeometry args={[0.018 * legScale, 0.022 * legScale, 0.032, 10]} />
            <meshStandardMaterial color={POLO_RED} roughness={0.55} />
          </mesh>

          {/* Thân giữa & mu bàn chân vát thuôn từ cổ chân xuống mũi giày (Contoured Vamp & Quarter) */}
          <mesh position={[0, -0.022, 0.022]} rotation={[0.22, 0, 0]} scale={[0.88 * legScale, 0.72, 1.25]} castShadow>
            <sphereGeometry args={[0.06, 16, 12]} />
            <meshStandardMaterial color={shoe} roughness={0.6} />
          </mesh>

          {/* Mũi giày vòm bo tròn mềm mại + đầu bọc cao su chống trầy (Rounded Toe Box & Bumper) */}
          <mesh position={[0, -0.031, 0.092]} scale={[0.88 * legScale, 0.52, 1.26]} castShadow>
            <sphereGeometry args={[0.06, 18, 12]} />
            <meshStandardMaterial color={shoe} roughness={0.58} />
          </mesh>
          <mesh position={[0, -0.042, 0.146]} scale={[0.78 * legScale, 0.36, 0.52]}>
            <sphereGeometry args={[0.056, 14, 10]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.72} />
          </mesh>

          {/* Sọc thể thao chéo hai bên hông giày */}
          {[-1, 1].map((sx) => (
            <mesh
              key={`shoe-stripe-${sx}`}
              position={[sx * 0.051 * legScale, -0.024, 0.018]}
              rotation={[0.28, sx * 0.06, 0]}
            >
              <boxGeometry args={[0.004, 0.012, 0.088]} />
              <meshStandardMaterial color={POLO_RED} roughness={0.55} />
            </mesh>
          ))}

          {/* Lưỡi gà (Padded Tongue) & 4 hàng dây giày tròn */}
          <mesh position={[0, 0.004, 0.032]} rotation={[-0.42, 0, 0]} scale={[0.76 * legScale, 0.34, 0.9]}>
            <sphereGeometry args={[0.044, 12, 10]} />
            <meshStandardMaterial color={shoe} roughness={0.65} />
          </mesh>
          {[0.032, 0.052, 0.072, 0.092].map((lz, idx) => (
            <mesh
              key={idx}
              position={[0, -0.002 - idx * 0.0045, lz]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.0038, 0.0038, (0.066 - idx * 0.004) * legScale, 8]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
