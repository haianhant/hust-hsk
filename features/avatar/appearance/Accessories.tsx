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
