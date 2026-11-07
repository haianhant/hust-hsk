// ---------------------------------------------------------------------------
// Motorbike.tsx — xe máy / xe tay ga phổ thông, 1 xe cá nhân duy nhất
// (đợt 3 giai đoạn 4). Tỉ lệ với avatar cao 1,707 m (Player/StudentAvatar):
//   dài 1,9 m (trục bánh trước z +0,70 → bánh sau z −0,70), rộng tay lái 0,62 m,
//   yên cao 0,78 m (hông người ngồi 0,80 m → ngồi đúng yên, không lún/kiễng),
//   bánh r 0,33 m, chỗ để chân y 0,38 m (cổ chân người ngồi ~0,46 m, bàn chân
//   chạm sàn xe, không treo lơ lửng).
// Hệ tọa độ cục bộ: đầu xe = +Z (cùng quy ước mặt trước +Z của avatar),
// gốc y = 0 tại mặt đất, giữa 2 bánh. Player giữ logic lái/va chạm và ghi
// vào bikeState (lib/playerState.ts); component này CHỈ ĐỌC bikeState để vẽ:
// vị trí + heading + lean, bánh quay theo vận tốc, bánh trước đổi hướng
// theo lái. Không tự sinh thêm xe: instance đếm qua bikeState.instances.
// Màu: xanh lá đậm HUST #1c5c3a + kem, thống nhất phong cách campus.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bikeState } from '../../lib/playerState';

const BODY_GREEN = '#1c5c3a';
const BODY_DARK = '#143d28';
const CREAM = '#f5f0e0';
const TIRE = '#1a1a1a';
const RIM = '#c8c8c8';
const METAL = '#9aa0a3';
const LIGHT_FRONT = '#fff8d0';
const LIGHT_REAR = '#c0392b';

const WHEEL_R = 0.33;

/** Một bánh: lốp torus + vành + 5 nan — quay quanh trục X (trục bánh). */
function Wheel({ spinRef }: { spinRef: React.RefObject<THREE.Group> }) {
  return (
    <group ref={spinRef}>
      {/* Lốp: torus mặc định nằm mặt XY (trục Z) → xoay Y 90° để mặt bánh
          nằm mặt ZY, trục bánh theo X. */}
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.26, 0.075, 12, 24]} />
        <meshStandardMaterial color={TIRE} roughness={0.95} />
      </mesh>
      {/* Vành + trục. */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.05, 20]} />
        <meshStandardMaterial color={RIM} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.12, 10]} />
        <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* 5 nan vành gợi ý. */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} rotation={[((i * Math.PI) / 5) * 2, 0, 0]} position={[0, 0, 0]}>
          <boxGeometry args={[0.055, 0.34, 0.02]} />
          <meshStandardMaterial color={RIM} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default function Motorbike() {
  const groupRef = useRef<THREE.Group>(null!);
  const leanRef = useRef<THREE.Group>(null!);
  const steerRef = useRef<THREE.Group>(null!);
  const frontSpinRef = useRef<THREE.Group>(null!);
  const rearSpinRef = useRef<THREE.Group>(null!);

  // Đếm instance thật: mount +1, unmount −1 — gọi xe không được nhân bản
  // (test kiểm tra bikeState.instances === 1 sau 3 lần gọi).
  useEffect(() => {
    bikeState.instances += 1;
    return () => {
      bikeState.instances -= 1;
    };
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = groupRef.current;
    if (!g) return;
    g.position.set(bikeState.pos.x, 0, bikeState.pos.z);
    g.rotation.y = bikeState.heading;
    if (leanRef.current) leanRef.current.rotation.z = bikeState.lean;
    if (steerRef.current) steerRef.current.rotation.y = bikeState.steer;
    // Bánh quay theo vận tốc: v = ω·r → ω = v / r (rad/s).
    const spin = (bikeState.speed * delta) / WHEEL_R;
    if (frontSpinRef.current) frontSpinRef.current.rotation.x += spin;
    if (rearSpinRef.current) rearSpinRef.current.rotation.x += spin;
  });

  return (
    <group ref={groupRef} position={[bikeState.pos.x, 0, bikeState.pos.z]}>
      <group ref={leanRef}>
        {/* --- Bánh sau (cố định, z −0,70) --- */}
        <group position={[0, WHEEL_R, -0.7]}>
          <Wheel spinRef={rearSpinRef} />
        </group>

        {/* --- Thân sau + yên --- */}
        {/* Yếm sau hai bên (che bánh sau một phần). */}
        <mesh position={[0, 0.55, -0.55]} castShadow>
          <boxGeometry args={[0.4, 0.28, 0.55]} />
          <meshStandardMaterial color={BODY_GREEN} roughness={0.55} />
        </mesh>
        {/* Yên: dài 0,55 m (z −0,05..−0,60), rộng 0,32 m, mặt yên y 0,78. */}
        <mesh position={[0, 0.74, -0.32]} castShadow>
          <boxGeometry args={[0.32, 0.09, 0.55]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.9} />
        </mesh>
        {/* Đuôi + đèn hậu + giá sau. */}
        <mesh position={[0, 0.62, -0.78]} castShadow>
          <boxGeometry args={[0.3, 0.1, 0.12]} />
          <meshStandardMaterial color={BODY_DARK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.62, -0.85]}>
          <boxGeometry args={[0.22, 0.07, 0.03]} />
          <meshStandardMaterial color={LIGHT_REAR} roughness={0.4} emissive={LIGHT_REAR} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.82, -0.72]}>
          <boxGeometry args={[0.34, 0.03, 0.2]} />
          <meshStandardMaterial color={METAL} roughness={0.35} metalness={0.6} />
        </mesh>

        {/* --- Sàn để chân + thân giữa --- */}
        <mesh position={[0, 0.36, 0.12]} castShadow>
          <boxGeometry args={[0.42, 0.06, 0.5]} />
          <meshStandardMaterial color={BODY_DARK} roughness={0.8} />
        </mesh>
        {/* Chỗ để chân 2 bên (người ngồi đặt bàn chân ở đây, y 0,38). */}
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 0.38, 0.28]}>
            <boxGeometry args={[0.1, 0.025, 0.22]} />
            <meshStandardMaterial color="#333333" roughness={0.9} />
          </mesh>
        ))}
        {/* Ống thân giữa nối sàn lên yên. */}
        <mesh position={[0, 0.55, -0.08]} castShadow>
          <boxGeometry args={[0.3, 0.35, 0.3]} />
          <meshStandardMaterial color={BODY_GREEN} roughness={0.55} />
        </mesh>

        {/* --- Yếm trước + đèn pha --- */}
        <mesh position={[0, 0.62, 0.48]} rotation={[-0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.44, 0.5, 0.16]} />
          <meshStandardMaterial color={BODY_GREEN} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.72, 0.58]}>
          <boxGeometry args={[0.2, 0.12, 0.03]} />
          <meshStandardMaterial color={LIGHT_FRONT} roughness={0.3} emissive={LIGHT_FRONT} emissiveIntensity={0.7} />
        </mesh>
        {/* Kính chắn gió nhỏ màu kem phía trên yếm. */}
        <mesh position={[0, 0.98, 0.44]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.36, 0.22, 0.02]} />
          <meshStandardMaterial color={CREAM} roughness={0.4} />
        </mesh>
        {/* Chắn bùn trước. */}
        <mesh position={[0, 0.62, 0.72]} rotation={[-0.15, 0, 0]} castShadow>
          <boxGeometry args={[0.24, 0.04, 0.3]} />
          <meshStandardMaterial color={BODY_DARK} roughness={0.6} />
        </mesh>

        {/* --- Tay lái (z +0,42, y 1,02): ghi-đông + tay nắm + gương --- */}
        <group ref={steerRef} position={[0, 0, 0]}>
          {/* Phuộc trước 2 bên (từ trục bánh lên ghi-đông). */}
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0.68, 0.62]} rotation={[0.18, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.72, 8]} />
              <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
            </mesh>
          ))}
          {/* Bánh trước: nằm trong nhóm lái để đổi hướng theo lái. */}
          <group position={[0, WHEEL_R, 0.7]}>
            <Wheel spinRef={frontSpinRef} />
          </group>
          {/* Ghi-đông ngang. */}
          <mesh position={[0, 1.02, 0.42]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.62, 10]} />
            <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Tay nắm 2 bên (tay người lái đặt ở đây, x ±0,28, y 1,02). */}
          {[-0.28, 0.28].map((x) => (
            <mesh key={x} position={[x, 1.02, 0.42]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.032, 0.032, 0.12, 10]} />
              <meshStandardMaterial color="#222222" roughness={0.9} />
            </mesh>
          ))}
          {/* Gương chiếu hậu 2 bên (cán + mặt gương). */}
          {[-0.24, 0.24].map((x) => (
            <group key={x}>
              <mesh position={[x, 1.14, 0.4]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]}>
                <cylinderGeometry args={[0.008, 0.008, 0.22, 6]} />
                <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
              </mesh>
              <mesh position={[x * 1.25, 1.24, 0.4]} rotation={[0, x > 0 ? 0.3 : -0.3, 0]}>
                <boxGeometry args={[0.11, 0.07, 0.015]} />
                <meshStandardMaterial color="#222222" roughness={0.5} />
              </mesh>
            </group>
          ))}
          {/* Cụm đồng hồ nhỏ giữa ghi-đông. */}
          <mesh position={[0, 1.05, 0.45]} rotation={[-0.4, 0, 0]}>
            <boxGeometry args={[0.14, 0.05, 0.1]} />
            <meshStandardMaterial color="#222222" roughness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
