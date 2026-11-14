// ---------------------------------------------------------------------------
// Motorbike.tsx — Xe tay ga / xe máy sinh viên bo cong 3D (Honda Vision/Wave)
// Tỉ lệ chuẩn với avatar 1,707 m:
//   - Bánh r = 0,33 m, trục z = ±0,70 m
//   - Yên mặt trên y ≈ 0,78 m, gác chân y = 0,38 m, tay nắm (±0,28, 1,02, 0,42)
//   - Đếm instance qua bikeState.instances (mount +1, unmount -1)
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bikeState, playerState } from '../../lib/playerState';
import { makeWarmLightPoolTexture } from './materials';
import { LabelPlane } from './TextPlate';

const BODY_CRIMSON = '#B91C1C'; // Đỏ đô ánh kim Bách Khoa
const BODY_DARK = '#1E293B'; // Nhựa sần tối màu
const SEAT_LEATHER = '#1F242B';
const TIRE = '#17191C';
const RIM = '#D1D5DB';
const CHROME = '#CBD5E1';
const LIGHT_FRONT = '#FFF8DC';
const LIGHT_REAR = '#DC2626';
const AMBER_TURN = '#F59E0B';

const WHEEL_R = 0.33;

function createSculptedScooterGeos() {
  // Helper: dựng silhouette trong mặt phẳng (z_world, y_world), extrude và xoay về (+Z forward, +Y up)
  const buildFromSideProfile = (
    draw: (s: THREE.Shape) => void,
    width: number,
    bevelT: number,
    bevelS: number,
  ) => {
    const shape = new THREE.Shape();
    draw(shape);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.02, width - bevelS * 2),
      bevelEnabled: true,
      bevelThickness: bevelT,
      bevelSize: bevelS,
      bevelSegments: 3,
      curveSegments: 14,
    });
    geo.translate(0, 0, -(Math.max(0.02, width - bevelS * 2)) / 2);
    geo.rotateY(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  };

  // 1. Thân vỏ chính bo cong khí động học: đuôi vuốt, cốp sau, gờ để chân trũng, yếm trước cong mượt
  const bodyGeo = buildFromSideProfile(
    (s) => {
      s.moveTo(-0.82, 0.64);
      s.quadraticCurveTo(-0.62, 0.72, -0.06, 0.71);
      s.quadraticCurveTo(0.08, 0.56, 0.22, 0.42);
      s.lineTo(0.36, 0.44);
      s.quadraticCurveTo(0.46, 0.72, 0.50, 0.94);
      s.quadraticCurveTo(0.64, 0.84, 0.65, 0.64);
      s.quadraticCurveTo(0.58, 0.44, 0.42, 0.31);
      s.lineTo(-0.18, 0.31);
      s.quadraticCurveTo(-0.56, 0.38, -0.82, 0.54);
      s.closePath();
    },
    0.34,
    0.032,
    0.028,
  );

  // 2. Sàn để chân & lườn nhựa nhám dưới yên
  const deckGeo = buildFromSideProfile(
    (s) => {
      s.moveTo(-0.22, 0.30);
      s.lineTo(0.36, 0.30);
      s.lineTo(0.42, 0.40);
      s.lineTo(-0.12, 0.40);
      s.closePath();
    },
    0.42,
    0.015,
    0.015,
  );

  // 3. Mặt nạ trước cong nổi khối chữ V
  const shieldGeo = buildFromSideProfile(
    (s) => {
      s.moveTo(0.44, 0.52);
      s.quadraticCurveTo(0.55, 0.74, 0.52, 0.95);
      s.quadraticCurveTo(0.64, 0.86, 0.67, 0.63);
      s.quadraticCurveTo(0.61, 0.50, 0.44, 0.52);
      s.closePath();
    },
    0.36,
    0.028,
    0.024,
  );

  // 4. Yên xe 2 tầng bo tròn công thái học (mặt người ngồi đúng y = 0,78)
  const seatGeo = buildFromSideProfile(
    (s) => {
      s.moveTo(-0.60, 0.71);
      s.quadraticCurveTo(-0.62, 0.81, -0.44, 0.81);
      s.quadraticCurveTo(-0.26, 0.78, -0.08, 0.78);
      s.quadraticCurveTo(-0.04, 0.75, -0.06, 0.70);
      s.lineTo(-0.56, 0.69);
      s.closePath();
    },
    0.29,
    0.024,
    0.024,
  );

  // 5. Dè chắn bùn trước uốn cong ôm lốp (xoay cùng tay lái steerRef)
  const fenderGeo = buildFromSideProfile(
    (s) => {
      s.moveTo(0.46, 0.56);
      s.quadraticCurveTo(0.70, 0.73, 0.95, 0.58);
      s.quadraticCurveTo(0.92, 0.53, 0.70, 0.66);
      s.quadraticCurveTo(0.50, 0.53, 0.46, 0.56);
      s.closePath();
    },
    0.15,
    0.012,
    0.01,
  );

  // 6. Chùm tia đèn pha phía trước ban đêm
  const beamGeo = new THREE.ConeGeometry(1.15, 5.2, 18, 1, true);
  beamGeo.translate(0, -2.6, 0);
  beamGeo.rotateX(-Math.PI / 2);

  return { bodyGeo, deckGeo, shieldGeo, seatGeo, fenderGeo, beamGeo };
}

/** Một bánh: lốp torus + mâm 5 nan chữ Y thể thao + đĩa phanh — quay quanh trục X. */
function Wheel({ spinRef, hasDisc = false }: { spinRef: React.RefObject<THREE.Group>; hasDisc?: boolean }) {
  return (
    <group ref={spinRef}>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.255, 0.075, 14, 28]} />
        <meshStandardMaterial color={TIRE} roughness={0.92} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.195, 0.195, 0.046, 22]} />
        <meshStandardMaterial color={RIM} roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
        <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.82} />
      </mesh>
      {hasDisc && (
        <mesh position={[-0.046, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.012, 20]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.22} metalness={0.88} />
        </mesh>
      )}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} rotation={[((i * Math.PI) / 5) * 2, 0, 0]}>
          <boxGeometry args={[0.048, 0.35, 0.022]} />
          <meshStandardMaterial color={RIM} roughness={0.32} metalness={0.68} />
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
  const standRef = useRef<THREE.Group>(null!);
  const beamGroupRef = useRef<THREE.Group>(null!);
  const beamMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const poolMatRef = useRef<THREE.MeshBasicMaterial>(null!);

  const assets = useMemo(() => {
    const geos = createSculptedScooterGeos();
    const lightPoolTex = makeWarmLightPoolTexture();
    return { ...geos, lightPoolTex };
  }, []);

  useEffect(
    () => () => {
      assets.bodyGeo.dispose();
      assets.deckGeo.dispose();
      assets.shieldGeo.dispose();
      assets.seatGeo.dispose();
      assets.fenderGeo.dispose();
      assets.beamGeo.dispose();
      assets.lightPoolTex.dispose();
    },
    [assets],
  );

  // Đếm instance thật: mount +1, unmount -1 — gọi xe không được nhân bản
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
    const spin = (bikeState.speed * delta) / WHEEL_R;
    if (frontSpinRef.current) frontSpinRef.current.rotation.x += spin;
    if (rearSpinRef.current) rearSpinRef.current.rotation.x += spin;

    if (standRef.current) {
      standRef.current.rotation.z = bikeState.riding ? -1.25 : 0.34;
    }

    const tod = playerState.timeOfDay;
    const beamVisible = tod !== 'day';
    if (beamGroupRef.current) {
      beamGroupRef.current.visible = beamVisible;
    }
    if (beamMatRef.current && poolMatRef.current) {
      const k = tod === 'night' ? 1 : 0.42;
      beamMatRef.current.opacity = 0.14 * k;
      poolMatRef.current.opacity = 0.42 * k;
    }
  });

  return (
    <group ref={groupRef} position={[bikeState.pos.x, 0, bikeState.pos.z]}>
      <group ref={leanRef}>
        {/* --- Bánh sau (cố định, z -0,70) --- */}
        <group position={[0, WHEEL_R, -0.7]}>
          <Wheel spinRef={rearSpinRef} />
        </group>

        {/* --- Thân vỏ bo cong ExtrudeGeometry --- */}
        <mesh geometry={assets.bodyGeo} castShadow receiveShadow>
          <meshStandardMaterial
            color={BODY_CRIMSON}
            roughness={0.24}
            metalness={0.38}
            envMapIntensity={1.3}
          />
        </mesh>
        <mesh geometry={assets.deckGeo} castShadow receiveShadow>
          <meshStandardMaterial color={BODY_DARK} roughness={0.78} metalness={0.08} />
        </mesh>
        <mesh geometry={assets.shieldGeo} castShadow receiveShadow>
          <meshStandardMaterial
            color={BODY_CRIMSON}
            roughness={0.22}
            metalness={0.4}
            envMapIntensity={1.35}
          />
        </mesh>
        {/* Viền ốp chữ V mạ crôm trước mặt nạ */}
        <mesh position={[0, 0.78, 0.625]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[0.1, 0.18, 0.025]} />
          <meshStandardMaterial color={CHROME} roughness={0.2} metalness={0.85} />
        </mesh>

        {/* --- Chỗ để chân 2 bên (giữ đúng y = 0,38 cho bàn chân người ngồi) --- */}
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 0.38, 0.28]} castShadow>
            <boxGeometry args={[0.1, 0.028, 0.22]} />
            <meshStandardMaterial color="#1F242B" roughness={0.88} />
          </mesh>
        ))}

        {/* --- Yên xe 2 tầng bo tròn & tay dắt sau mạ crôm --- */}
        <mesh geometry={assets.seatGeo} castShadow receiveShadow>
          <meshStandardMaterial color={SEAT_LEATHER} roughness={0.68} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.77, -0.66]} rotation={[Math.PI / 2 - 0.12, 0, 0]} castShadow>
          <torusGeometry args={[0.145, 0.018, 8, 16, Math.PI]} />
          <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.82} />
        </mesh>

        {/* --- Cụm đèn hậu LED rubi, xi-nhan & biển số Hà Nội 29-B1 --- */}
        <mesh position={[0, 0.62, -0.84]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[0.19, 0.075, 0.03]} />
          <meshStandardMaterial
            color={LIGHT_REAR}
            roughness={0.25}
            emissive={LIGHT_REAR}
            emissiveIntensity={0.65}
          />
        </mesh>
        {[-0.125, 0.125].map((sx) => (
          <mesh key={`rear-turn-${sx}`} position={[sx, 0.615, -0.83]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.048, 0.052, 0.026]} />
            <meshStandardMaterial
              color={AMBER_TURN}
              emissive={AMBER_TURN}
              emissiveIntensity={0.35}
              roughness={0.25}
            />
          </mesh>
        ))}
        {/* Dè sau + biển số xe Hà Nội sắc nét */}
        <mesh position={[0, 0.49, -0.83]} rotation={[0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.19, 0.14, 0.02]} />
          <meshStandardMaterial color="#111827" roughness={0.7} />
        </mesh>
        <LabelPlane
          textureKey="moto-plate-29b1-v1"
          canvasW={256}
          canvasH={192}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 10;
            ctx.strokeRect(8, 8, w - 16, h - 16);
            ctx.fillStyle = '#0F172A';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 58px Arial, sans-serif';
            ctx.fillText('29-B1', w / 2, h * 0.34);
            ctx.font = '800 60px Arial, sans-serif';
            ctx.fillText('686.86', w / 2, h * 0.72);
          }}
          size={[0.165, 0.12]}
          position={[0, 0.49, -0.845]}
          rotation={[0.25, Math.PI, 0]}
          transparent={false}
        />

        {/* --- Giảm xóc lò xo sau & ống xả có ốp chống bỏng inox --- */}
        {[-0.165, 0.165].map((sx) => (
          <mesh
            key={`shock-${sx}`}
            position={[sx, 0.46, -0.56]}
            rotation={[0.32, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.024, 0.024, 0.32, 10]} />
            <meshStandardMaterial color={BODY_CRIMSON} roughness={0.38} metalness={0.55} />
          </mesh>
        ))}
        <group position={[-0.21, 0.28, -0.44]} rotation={[-0.18, 0.06, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.048, 0.056, 0.56, 12]} />
            <meshStandardMaterial color="#18181B" roughness={0.55} metalness={0.45} />
          </mesh>
          <mesh position={[-0.036, 0.01, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.015, 0.44, 0.072]} />
            <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.88} />
          </mesh>
        </group>

        {/* --- Chân chống nghiêng (hạ khi đỗ, gập lên khi chạy) --- */}
        <group ref={standRef} position={[0.17, 0.29, -0.08]}>
          <mesh position={[0.05, -0.14, 0]}>
            <cylinderGeometry args={[0.014, 0.018, 0.28, 8]} />
            <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>

        {/* --- Pha đèn LED trước & chùm sáng ban đêm --- */}
        <mesh position={[0, 0.71, 0.65]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.21, 0.1, 0.04]} />
          <meshStandardMaterial
            color={LIGHT_FRONT}
            roughness={0.2}
            emissive={LIGHT_FRONT}
            emissiveIntensity={0.85}
          />
        </mesh>
        <group ref={beamGroupRef} visible={false}>
          <mesh position={[0, 0.71, 0.68]} rotation={[0.14, 0, 0]} geometry={assets.beamGeo}>
            <meshBasicMaterial
              ref={beamMatRef}
              color="#FFF1C2"
              transparent
              opacity={0.14}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.042, 3.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.5, 4.4]} />
            <meshBasicMaterial
              ref={poolMatRef}
              map={assets.lightPoolTex}
              color="#FFE6A3"
              transparent
              opacity={0.42}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>

        {/* --- Kính chắn gió nhỏ phong cách tay ga thể thao --- */}
        <mesh position={[0, 0.99, 0.49]} rotation={[-0.4, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.16, 0.022]} />
          <meshStandardMaterial
            color="#0F172A"
            roughness={0.15}
            metalness={0.45}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* --- Tay lái (z +0,42, y 1,02): phuộc, dè bùn theo bánh, ghi-đông, tay nắm & gương tròn --- */}
        <group ref={steerRef} position={[0, 0, 0]}>
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0.68, 0.62]} rotation={[0.18, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.72, 10]} />
              <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.8} />
            </mesh>
          ))}
          <mesh geometry={assets.fenderGeo} castShadow>
            <meshStandardMaterial
              color={BODY_CRIMSON}
              roughness={0.25}
              metalness={0.38}
              envMapIntensity={1.3}
            />
          </mesh>
          <group position={[0, WHEEL_R, 0.7]}>
            <Wheel spinRef={frontSpinRef} hasDisc />
          </group>
          <mesh position={[0, 1.02, 0.42]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.62, 10]} />
            <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.78} />
          </mesh>
          {/* Vỏ ốp đầu ghi-đông bo cong */}
          <mesh position={[0, 1.03, 0.44]} rotation={[-0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.28, 0.075, 0.16]} />
            <meshStandardMaterial color={BODY_CRIMSON} roughness={0.28} metalness={0.35} />
          </mesh>
          {/* Tay nắm 2 bên (tay người lái đặt tại ±0,28, 1,02, 0,42) */}
          {[-0.28, 0.28].map((x) => (
            <mesh key={x} position={[x, 1.02, 0.42]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.032, 0.032, 0.12, 12]} />
              <meshStandardMaterial color="#18181B" roughness={0.88} />
            </mesh>
          ))}
          {/* 2 gương chiếu hậu tròn mạ crôm thời trang */}
          {[-0.24, 0.24].map((x) => (
            <group key={x}>
              <mesh position={[x, 1.13, 0.41]} rotation={[0, 0, x > 0 ? -0.38 : 0.38]}>
                <cylinderGeometry args={[0.008, 0.008, 0.22, 8]} />
                <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.82} />
              </mesh>
              <group position={[x * 1.24, 1.24, 0.41]} rotation={[0, x > 0 ? 0.28 : -0.28, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.062, 0.056, 0.022, 18]} />
                  <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.85} />
                </mesh>
                <mesh position={[0, 0, -0.012]} rotation={[0, Math.PI, 0]}>
                  <circleGeometry args={[0.052, 16]} />
                  <meshStandardMaterial color="#93C5FD" roughness={0.08} metalness={0.95} />
                </mesh>
              </group>
            </group>
          ))}
          {/* Mặt đồng hồ điện tử xanh dịu */}
          <mesh position={[0, 1.068, 0.43]} rotation={[-0.55, 0, 0]}>
            <boxGeometry args={[0.13, 0.02, 0.075]} />
            <meshStandardMaterial
              color="#0F172A"
              emissive="#38BDF8"
              emissiveIntensity={0.38}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
