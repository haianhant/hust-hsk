// ---------------------------------------------------------------------------
// features/avatar/rig/Torso.tsx — Thân áo: cầu nối hông (Pelvis Bridge) +
// chân váy xếp ly chữ A (Pleated Skirt) + eo/ngực theo giới tính + chi tiết
// Áo khoác gió HUST / Bomber / Polo / Hoodie / Áo phông / Sweater / Sơ mi
// Module IDs: avatar.rig, avatar.outfit.*
// ---------------------------------------------------------------------------

import type * as THREE from 'three';
import type { AvatarGender } from '../../../lib/playerState';
import { HustStudentLanyard } from '../appearance/Accessories';
import {
  BUTTON_DARK,
  POLO_DARK,
  SILVER,
  WHITE,
  WINDBREAKER_WHITE,
  type FigureVariant,
} from '../appearance/presets';

export function Torso({
  variant,
  gender = 'male',
  shirt,
  shirtDark,
  upperYokeColor,
  pants,
  skirtColor,
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
  skirtColor?: string;
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
  const pelvisTone = skirtColor ?? pants;

  return (
    <group>
      {/* KHỐI CẦU NỐI HÔNG – ĐÙI (Pelvis Bridge) phủ kín từ y=0.76..0.88 để nối liền đáy thân với 2 khớp đùi */}
      <mesh position={[0, 0.84, 0]} scale={[hipScaleX, 0.62, 0.74]} castShadow>
        <sphereGeometry args={[0.202, 18, 14]} />
        <meshStandardMaterial color={pelvisTone} map={fabricTex} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.805, 0]} scale={[hipScaleX, 1, 0.72]} castShadow>
        <cylinderGeometry args={[0.194, 0.186, 0.09, 18]} />
        <meshStandardMaterial color={pelvisTone} map={fabricTex} roughness={0.86} />
      </mesh>

      {/* CHÂN VÁY XẾP LY CHỮ A (khi bật chế độ chân váy cho nhân vật Nữ — ao-phong-xanh-nu-01.jpg, so-mi-nu-01.jpg) */}
      {skirtColor && (
        <group>
          {/* Cạp váy ôm gọn eo */}
          <mesh position={[0, 0.835, 0]} scale={[hipScaleX * 0.96, 1, 0.72]} castShadow>
            <cylinderGeometry args={[0.192, 0.198, 0.036, 20]} />
            <meshStandardMaterial color={skirtColor} map={fabricTex} roughness={0.8} />
          </mesh>
          {/* Thân chân váy chữ A xòe nhẹ từ hông xuống giữa đùi */}
          <mesh position={[0, 0.705, 0]} scale={[hipScaleX * 1.02, 1, 0.78]} castShadow>
            <cylinderGeometry args={[0.194, 0.246, 0.24, 24]} />
            <meshStandardMaterial color={skirtColor} map={fabricTex} roughness={0.82} />
          </mesh>
          {/* 12 nếp gấp xếp ly (pleat ridges) đều quanh chân váy */}
          {Array.from({ length: 12 }, (_, idx) => {
            const ang = (idx / 12) * Math.PI * 2;
            const rx = Math.sin(ang) * 0.218 * hipScaleX;
            const rz = Math.cos(ang) * 0.218 * 0.78;
            return (
              <mesh
                key={`skirt-pleat-${idx}`}
                position={[rx, 0.702, rz]}
                rotation={[Math.cos(ang) * 0.19, ang, -Math.sin(ang) * 0.19]}
                castShadow
              >
                <boxGeometry args={[0.022, 0.23, 0.012]} />
                <meshStandardMaterial color={skirtColor} map={fabricTex} roughness={0.84} />
              </mesh>
            );
          })}
        </group>
      )}

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

      {/* --- 4. ÁO HOODIE (Dùng cho NPC Minh & Hoodie HUST Thu-Đông) --- */}
      {variant === 'hoodie' && (
        <group>
          {/* Túi Kangaroo vát chéo 2 bên trước bụng */}
          <mesh position={[0, 0.94, 0.152]} castShadow>
            <boxGeometry args={[0.26, 0.17, 0.028]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          {[-0.125, 0.125].map((kx, idx) => (
            <mesh
              key={`hoodie-pkt-edge-${idx}`}
              position={[kx, 0.955, 0.158]}
              rotation={[0, 0, kx > 0 ? 0.28 : -0.28]}
            >
              <boxGeometry args={[0.012, 0.12, 0.016]} />
              <meshStandardMaterial color={shirt} roughness={0.82} />
            </mesh>
          ))}
          <mesh position={[0, 1.025, 0.164]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.24, 10]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          {/* Cổ áo nối liền mũ */}
          <mesh position={[0, 1.345, 0]}>
            <cylinderGeometry args={[0.082, 0.092, 0.052, 16]} />
            <meshStandardMaterial color={shirtDark} roughness={0.86} />
          </mesh>
          {/* Dây rút mũ + đầu bịt kim loại bạc */}
          {[-0.044, 0.044].map((dx, idx) => (
            <group key={`hood-cord-${idx}`} position={[dx, 1.255, 0.148]} rotation={[0, 0, dx > 0 ? -0.06 : 0.06]}>
              <mesh>
                <cylinderGeometry args={[0.0055, 0.0055, 0.115, 6]} />
                <meshStandardMaterial color={WHITE} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.062, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.018, 6]} />
                <meshStandardMaterial color={SILVER} roughness={0.35} metalness={0.75} />
              </mesh>
            </group>
          ))}
          {/* Mũ trùm 3D gấp sau gáy có lòng mũ tối màu tạo chiều sâu */}
          <mesh position={[0, 1.365, -0.105]} scale={[1.08, 0.56, 0.8]} castShadow>
            <sphereGeometry args={[0.122, 16, 12]} />
            <meshStandardMaterial color={shirtDark} roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.382, -0.095]} scale={[0.92, 0.38, 0.64]}>
            <sphereGeometry args={[0.11, 14, 10]} />
            <meshStandardMaterial color="#182232" roughness={0.9} />
          </mesh>
          <mesh position={[0.065, 1.22, 0.139]} rotation={[0, 0.45, 0]}>
            <planeGeometry args={[0.084, 0.027]} />
            <meshStandardMaterial map={hustTex} transparent roughness={0.75} />
          </mesh>
        </group>
      )}

      {/* --- 4b. ÁO PHÔNG XANH TÍM THAN HUST (ao-phong-xanh-nu-01.jpg) --- */}
      {variant === 'tshirt' && (
        <group>
          {/* Viền cổ tròn dệt kim */}
          <mesh position={[0, 1.345, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.078, 0.009, 8, 18]} />
            <meshStandardMaterial color={shirtDark} roughness={0.84} />
          </mesh>
          {/* Chữ HUST trắng lớn in chính giữa ngực đúng mẫu ao-phong-xanh-nu-01.jpg */}
          <mesh position={[0, 1.195, 0.143]}>
            <planeGeometry args={[0.155, 0.05]} />
            <meshStandardMaterial map={hustTex} transparent roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* --- 4c. ÁO SWEATER NỈ KEM THU ĐÔNG HUST (bomber-thu-dong-nhom-01.jpg) --- */}
      {variant === 'sweater' && (
        <group>
          {/* Cổ tròn bo gân đỏ Bách khoa viền trắng */}
          <mesh position={[0, 1.346, 0]}>
            <cylinderGeometry args={[0.078, 0.088, 0.042, 18]} />
            <meshStandardMaterial color={shirtDark} roughness={0.84} />
          </mesh>
          <mesh position={[0, 1.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.079, 0.0045, 8, 18]} />
            <meshStandardMaterial color={WHITE} roughness={0.8} />
          </mesh>
          {/* Viền sọc trắng trên bo gấu áo sweater */}
          <mesh position={[0, 0.845, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[hipScaleX, 0.72, 1]}>
            <torusGeometry args={[0.199, 0.0045, 8, 20]} />
            <meshStandardMaterial color={WHITE} roughness={0.8} />
          </mesh>
          {/* Phù hiệu BK | HUST đỏ đậm nổi bật giữa ngực */}
          <mesh position={[0, 1.195, 0.143]}>
            <planeGeometry args={[0.145, 0.054]} />
            <meshStandardMaterial map={hustCrimsonTex} transparent roughness={0.68} />
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
