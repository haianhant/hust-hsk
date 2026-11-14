// ---------------------------------------------------------------------------
// features/avatar/appearance/Accessories.tsx — Phụ kiện sinh viên Bách Khoa:
// Dây đeo thẻ sinh viên (HustStudentLanyard) & Ba lô (Backpack)
// Module ID: avatar.rig
// ---------------------------------------------------------------------------

import type * as THREE from 'three';
import { POLO_RED, SILVER } from './presets';

/** Dây đeo thẻ sinh viên Bách Khoa (HUST Lanyard + Student ID Badge) trước ngực. */
export function HustStudentLanyard({ idTex }: { idTex: THREE.CanvasTexture }) {
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

/** Ba lô sinh viên Bách Khoa: có ngăn phụ, bình nước thể thao bên hông & huy hiệu BK đỏ. */
export function Backpack({
  colors,
}: {
  colors: { pack: string; packLight: string; packZip: string };
}) {
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

/** Mũ Cử nhân Tốt nghiệp ĐHBK Hà Nội (Mortarboard + viền đỏ Bách Khoa + tua rua vàng).
 *  Gắn `userData={{ ignoreMeasure: true }}` trên mọi mesh để không làm sai lệch `measureAvatar`. */
export function GraduationCap() {
  return (
    <group position={[0, 1.665, -0.008]} rotation={[-0.08, 0, -0.04]} userData={{ ignoreMeasure: true }}>
      {/* Vành mũ ôm đầu có đai đỏ Bách Khoa */}
      <mesh position={[0, 0.015, 0]} userData={{ ignoreMeasure: true }} castShadow>
        <cylinderGeometry args={[0.098, 0.104, 0.056, 20]} />
        <meshStandardMaterial color="#18181B" roughness={0.68} />
      </mesh>
      <mesh position={[0, -0.004, 0]} userData={{ ignoreMeasure: true }}>
        <cylinderGeometry args={[0.105, 0.107, 0.016, 20]} />
        <meshStandardMaterial color={POLO_RED} roughness={0.55} />
      </mesh>
      {/* Tấm chóp vuông nghiêng nhẹ đặc trưng lễ tốt nghiệp */}
      <mesh position={[0, 0.048, 0.006]} rotation={[0, Math.PI / 4, 0]} userData={{ ignoreMeasure: true }} castShadow>
        <boxGeometry args={[0.25, 0.014, 0.25]} />
        <meshStandardMaterial color="#18181B" roughness={0.62} />
      </mesh>
      {/* Khuy tròn vàng giữa chóp + dây tua rua rủ bên phải */}
      <mesh position={[0, 0.058, 0.006]} userData={{ ignoreMeasure: true }}>
        <cylinderGeometry args={[0.011, 0.011, 0.008, 12]} />
        <meshStandardMaterial color="#FACC15" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[-0.068, 0.055, 0.018]} rotation={[0, 0.2, Math.PI / 2]} userData={{ ignoreMeasure: true }}>
        <cylinderGeometry args={[0.0045, 0.0045, 0.135, 8]} />
        <meshStandardMaterial color="#FACC15" roughness={0.42} metalness={0.35} />
      </mesh>
      <mesh position={[-0.132, -0.008, 0.028]} userData={{ ignoreMeasure: true }}>
        <cylinderGeometry args={[0.009, 0.015, 0.095, 10]} />
        <meshStandardMaterial color="#EAB308" roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Ly đồ uống sinh viên Bách Khoa cầm tay phải ('iced-tea' = Trà chanh BK, 'coffee' = Cà phê nâu đá Hồ Tiền).
 *  Gắn `userData={{ ignoreMeasure: true }}` trên mọi mesh để giữ chuẩn chiều cao nhân vật. */
export function HandheldDrinkCup({ drink }: { drink: 'iced-tea' | 'coffee' }) {
  const isCoffee = drink === 'coffee';
  return (
    <group position={[0, -0.025, 0.048]} rotation={[0.85, 0, 0]} userData={{ ignoreMeasure: true }}>
      {/* Cốc nhựa trong suốt có nước bên trong */}
      <mesh position={[0, 0, 0]} userData={{ ignoreMeasure: true }} castShadow>
        <cylinderGeometry args={[0.036, 0.027, 0.105, 14]} />
        <meshStandardMaterial
          color={isCoffee ? '#4A2C18' : '#EAB308'}
          roughness={0.28}
          transparent
          opacity={0.92}
        />
      </mesh>
      {isCoffee && (
        <mesh position={[0, -0.032, 0]} userData={{ ignoreMeasure: true }}>
          <cylinderGeometry args={[0.03, 0.027, 0.032, 12]} />
          <meshStandardMaterial color="#F3E5D0" roughness={0.45} />
        </mesh>
      )}
      {!isCoffee && (
        <mesh position={[0.008, 0.028, 0.01]} rotation={[0.5, 0, 0.2]} userData={{ ignoreMeasure: true }}>
          <cylinderGeometry args={[0.017, 0.017, 0.006, 12]} />
          <meshStandardMaterial color="#84CC16" roughness={0.45} />
        </mesh>
      )}
      {/* Viên đá lạnh trên mặt cốc */}
      <mesh position={[-0.008, 0.034, -0.006]} rotation={[0.3, 0.4, 0.2]} userData={{ ignoreMeasure: true }}>
        <boxGeometry args={[0.018, 0.016, 0.018]} />
        <meshStandardMaterial color="#E0F2FE" transparent opacity={0.8} roughness={0.12} />
      </mesh>
      {/* Nắp cốc */}
      <mesh position={[0, 0.055, 0]} userData={{ ignoreMeasure: true }}>
        <cylinderGeometry args={[0.038, 0.038, 0.008, 14]} />
        <meshStandardMaterial color="#F8FAFC" transparent opacity={0.78} roughness={0.25} />
      </mesh>
      {/* Ống hút */}
      <mesh position={[0.006, 0.088, 0.004]} rotation={[0.08, 0, -0.14]} userData={{ ignoreMeasure: true }}>
        <cylinderGeometry args={[0.0038, 0.0038, 0.075, 8]} />
        <meshStandardMaterial color={isCoffee ? '#1E293B' : '#16A34A'} roughness={0.4} />
      </mesh>
    </group>
  );
}
