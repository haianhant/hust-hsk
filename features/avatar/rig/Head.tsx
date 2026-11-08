// ---------------------------------------------------------------------------
// features/avatar/rig/Head.tsx — Đầu + cổ + khuôn mặt biểu cảm theo giới tính +
// 6 kiểu tóc tạo khối (short, swept, layered, ponytail, bob, bun) + kính & mũ.
// Đỉnh vòm tóc giữ đúng cao độ y = 1,707 m để tương thích 100% với measureAvatar.
// Module ID: avatar.rig
// ---------------------------------------------------------------------------

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type { AvatarGender } from '../../../lib/playerState';
import {
  HAIR,
  HAIR_HIGHLIGHT,
  POLO_RED,
  SKIN,
  SKIN_WARM,
  WHITE,
  type HairStyle,
} from '../appearance/presets';
import { getSharedAvatarTextures } from '../appearance/textures';

export function Head({
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
