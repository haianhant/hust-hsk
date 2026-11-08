// ---------------------------------------------------------------------------
// CampusExpansion.tsx — Hoàn thiện toàn bộ khuôn viên Đại học Bách khoa Hà Nội
// chuẩn 100% theo Bản đồ Bách Khoa (docs/khuon-vien-truong.png):
//   1. Cụm tòa nhà C6 – C7 – C8 (Phía Đông dãy C3–C10, sát đường Trần Đại Nghĩa)
//   2. Trung tâm Hợp tác Việt – Đức (VDZ) & Sàn vọng cảnh Hồ Tiền
//   3. Khu Ký túc xá Bách Khoa (B3, B4, B5, B6, B7, B7bis, B8 - Văn phòng Hội Sinh viên,
//      B9 - Trung tâm Quản lý KTX, B10, B13, Nhà ăn KTX, Sân bóng KTX)
//   4. Nhà B1 hình chữ V (Viện Công nghệ Thông tin và Truyền thông — SoICT)
//   5. Cụm tòa nhà A17, H1, H3 và Nhà T (Phía Đông-Nam B1)
//   6. Khu Thể chất & Sân vận động Bách Khoa dọc đường Lê Thanh Nghị:
//      Nhà thi đấu (TC), Bể bơi Bách Khoa, Sân bóng rổ, Khán đài đỏ,
//      Sân vận động Bóng đá Bách Khoa & KTX Lào.
//   7. Trạm xe buýt Cổng Parabol, Bảng tin Đoàn-Hội, Hàng đèn nến TĐN & Tường rào.
// Mọi tọa độ đối chiếu từ lib/campus.ts, chống Z-fighting và giải phóng .dispose().
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import {
  C6_BUILDING,
  C7_BUILDING,
  C8_BUILDING,
  DORM_COMPLEX,
  EAST_CAMPUS_BLOCKS,
  PARABOL_BUS_STOP,
  SOICT_B1,
  SPORTS_COMPLEX,
  TA_QUANG_BUU_GATE,
  VDZ_CENTER,
} from '../../lib/campus';
import { playerState } from '../../lib/playerState';
import { LabelPlane } from './TextPlate';
import {
  makeFootballFieldTexture,
  makeSportsCourtTexture,
  makeSwimmingPoolTexture,
} from './materials';

const HUST_RED = '#D22630';
const WALL_CREAM = '#F4F1E8';
const WALL_BLUE_LIGHT = '#DCEAF7';
const HEADER_BLUE = '#3B6E9C';
const GLASS_DARK = '#27445C';
const GLASS_MID = '#3A5F7D';
const FRAME_WHITE = '#FAF8F5';
const IRON_DARK = '#25292E';

// --- 1. Cụm Tòa nhà C6 – C7 – C8 (Sát phía Tây đường Trần Đại Nghĩa) ----------
function C6AndC8Block({
  code,
  subtitle,
  center,
  size,
  floors,
  floorHeight,
  isNight,
}: {
  code: string;
  subtitle: string;
  center: { x: number; z: number };
  size: { x: number; z: number };
  floors: number;
  floorHeight: number;
  isNight: boolean;
}) {
  const h = floors * floorHeight;
  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.14, 0.8, size.z + 0.14]} />
        <meshStandardMaterial color="#8E9BAE" roughness={0.88} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h, size.z]} />
        <meshStandardMaterial color={WALL_BLUE_LIGHT} roughness={0.86} />
      </mesh>
      <mesh position={[0, h + 0.25, 0]} castShadow>
        <boxGeometry args={[size.x + 0.45, 0.5, size.z + 0.45]} />
        <meshStandardMaterial color={HEADER_BLUE} roughness={0.75} />
      </mesh>
      {/* Cửa sổ mặt Nam & Bắc */}
      {Array.from({ length: floors }, (_, fl) =>
        [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((wx, idx) => {
          const glow = isNight && (fl + idx) % 2 === 0;
          return (
            <mesh
              key={`${code}-win-${fl}-${idx}`}
              position={[wx, fl * floorHeight + 1.65, size.z / 2 + 0.03]}
            >
              <planeGeometry args={[1.65, 1.2]} />
              <meshStandardMaterial
                color={glow ? '#FFE4A0' : GLASS_MID}
                emissive={glow ? '#FFB84D' : '#000000'}
                emissiveIntensity={glow ? 0.65 : 0}
                roughness={0.32}
              />
            </mesh>
          );
        }),
      )}
      <LabelPlane
        textureKey={`sign-${code}`}
        canvasW={512}
        canvasH={112}
        draw={(ctx, w, hCanvas) => {
          ctx.fillStyle = '#1E4E79';
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, hCanvas - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 36px Arial, sans-serif';
          ctx.fillText(`NHÀ ${code} · ${subtitle}`, w / 2, hCanvas / 2);
        }}
        size={[4.6, 0.92]}
        position={[0, h - 0.8, size.z / 2 + 0.06]}
        transparent={false}
      />
    </group>
  );
}

function C7ComplexBuilding({ isNight }: { isNight: boolean }) {
  const { center, size, floors, floorHeight } = C7_BUILDING;
  const totalH = floors * floorHeight; // 9 tầng × 3.1m = 27.9m (khớp c7-flycam-toan-canh.jpg)
  const wingW = 5.4;
  const wingD = 10.2;
  const spineD = 5.3;
  const spineZ = -size.z / 2 + spineD / 2; // -5.1m (trục lưng phía Bắc)
  const wingZ = size.z / 2 - wingD / 2; // +2.65m (3 nhánh vươn về phía Nam tạo hình chữ E)
  const wingXs = [-size.x / 2 + wingW / 2, 0, size.x / 2 - wingW / 2]; // [-11.3, 0, +11.3]
  const courtXs = [-5.65, 5.65]; // 2 sân trong chữ U giữa 3 nhánh

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Bệ đá granite xám quanh toàn bộ tổ hợp C7 */}
      <mesh position={[0, 0.28, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.4, 0.56, size.z + 0.4]} />
        <meshStandardMaterial color="#8E949E" roughness={0.86} />
      </mesh>

      {/* ============ 1. KHỐI LƯNG CHÍNH (REAR SPINE) 9 TẦNG MÀU TRẮNG HIỆN ĐẠI ============ */}
      <mesh position={[0, totalH / 2, spineZ]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, spineD]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
      </mesh>
      {/* Mái phẳng xám nhạt + tường chắn mái (parapet) trên khối lưng */}
      <mesh position={[0, totalH + 0.22, spineZ]} castShadow>
        <boxGeometry args={[size.x + 0.3, 0.44, spineD + 0.3]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
      </mesh>
      {/* Dàn máy điều hòa trung tâm (HVAC chillers trắng) & tum thang máy trên mái lưng (c7-flycam-toan-canh.jpg) */}
      {[-9.5, -6.5, -3.5, 3.5, 6.5, 9.5].map((hx) => (
        <mesh key={`c7-hvac-${hx}`} position={[hx, totalH + 0.9, spineZ]} castShadow>
          <boxGeometry args={[2.1, 0.95, 1.8]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.65} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, totalH + 1.25, spineZ]} castShadow>
        <boxGeometry args={[3.8, 1.65, 2.8]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>

      {/* ============ 2. BA NHÁNH CHỮ E (3 PARALLEL WINGS) VƯƠN VỀ PHÍA NAM ============ */}
      {wingXs.map((wx, wIdx) => (
        <group key={`c7-wing-${wIdx}`} position={[wx, 0, wingZ]}>
          {/* Thân nhánh 9 tầng sơn trắng sáng */}
          <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[wingW, totalH, wingD]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
          </mesh>
          {/* Vách kính lớn thông tầng 1–2 (giảng đường & sảnh, cao 6.0m) */}
          <mesh position={[0, 3.1, 0.04]} castShadow>
            <boxGeometry args={[wingW + 0.08, 5.6, wingD - 0.5]} />
            <meshStandardMaterial color="#1E2D3B" roughness={0.25} metalness={0.35} />
          </mesh>
          {/* Khe hành lang / logia đứng âm tường ở chính giữa mặt đứng mỗi nhánh (c7-goc-nghieng.jpg) */}
          <mesh position={[0, (totalH + 6.2) / 2, wingD / 2 - 0.08]}>
            <boxGeometry args={[1.35, totalH - 6.6, 0.28]} />
            <meshStandardMaterial color="#334155" roughness={0.75} />
          </mesh>
          {/* Gờ phân tầng ngang màu xám trắng và lưới cửa sổ khung tối tầng 3–9 */}
          {[2, 3, 4, 5, 6, 7, 8].map((fl) => (
            <group key={`c7-wing-fl-${wIdx}-${fl}`}>
              <mesh position={[0, fl * floorHeight, 0]}>
                <boxGeometry args={[wingW + 0.14, 0.14, wingD + 0.14]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
              </mesh>
              {/* Cửa sổ 2 bên khe logia ở đầu hồi Nam của mỗi nhánh */}
              {[-1.7, 1.7].map((dx, dIdx) => {
                const glow = isNight && (fl + wIdx + dIdx) % 2 === 0;
                return (
                  <mesh
                    key={`c7-front-win-${wIdx}-${fl}-${dIdx}`}
                    position={[dx, fl * floorHeight + 1.55, wingD / 2 + 0.03]}
                  >
                    <planeGeometry args={[1.35, 1.35]} />
                    <meshStandardMaterial
                      color={glow ? '#FFE4A0' : '#233445'}
                      emissive={glow ? '#FFB84D' : '#000000'}
                      emissiveIntensity={glow ? 0.75 : 0}
                      roughness={0.28}
                      metalness={0.25}
                    />
                  </mesh>
                );
              })}
              {/* Cửa sổ dọc hai mặt bên (Đông & Tây) của nhánh nhìn xuống sân cây xanh */}
              {[-3.2, 0, 3.2].map((dz, zIdx) => {
                const glow = isNight && (fl + wIdx + zIdx) % 3 === 0;
                return (
                  <group key={`c7-side-win-${wIdx}-${fl}-${zIdx}`}>
                    <mesh
                      position={[-wingW / 2 - 0.03, fl * floorHeight + 1.55, dz]}
                      rotation-y={-Math.PI / 2}
                    >
                      <planeGeometry args={[1.85, 1.32]} />
                      <meshStandardMaterial
                        color={glow ? '#FFE4A0' : '#233445'}
                        emissive={glow ? '#FFB84D' : '#000000'}
                        emissiveIntensity={glow ? 0.72 : 0}
                        roughness={0.28}
                      />
                    </mesh>
                    <mesh
                      position={[wingW / 2 + 0.03, fl * floorHeight + 1.55, dz]}
                      rotation-y={Math.PI / 2}
                    >
                      <planeGeometry args={[1.85, 1.32]} />
                      <meshStandardMaterial
                        color={glow ? '#FFE4A0' : '#233445'}
                        emissive={glow ? '#FFB84D' : '#000000'}
                        emissiveIntensity={glow ? 0.72 : 0}
                        roughness={0.28}
                      />
                    </mesh>
                  </group>
                );
              })}
            </group>
          ))}
          {/* Mái phẳng + Ô mái ngói đỏ đặc trưng trên đỉnh mỗi nhánh chữ E (c7-flycam-toan-canh.jpg) */}
          <mesh position={[0, totalH + 0.22, 0]} castShadow>
            <boxGeometry args={[wingW + 0.3, 0.44, wingD + 0.3]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
          </mesh>
          <mesh position={[0, totalH + 0.62, 1.6]} castShadow>
            <boxGeometry args={[wingW - 0.8, 0.45, 4.2]} />
            <meshStandardMaterial color="#C84B31" roughness={0.72} />
          </mesh>
        </group>
      ))}

      {/* Cửa sổ mặt Bắc và mặt sân trong của khối lưng 9 tầng */}
      {[2, 3, 4, 5, 6, 7, 8].map((fl) =>
        [-11.5, -8.5, -5.65, -2.8, 0, 2.8, 5.65, 8.5, 11.5].map((sx, sIdx) => {
          const glow = isNight && (fl + sIdx) % 2 === 1;
          return (
            <group key={`c7-spine-win-${fl}-${sIdx}`}>
              <mesh
                position={[sx, fl * floorHeight + 1.55, spineZ - spineD / 2 - 0.03]}
                rotation-y={Math.PI}
              >
                <planeGeometry args={[1.9, 1.32]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : '#233445'}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.28}
                />
              </mesh>
              {(Math.abs(sx - -5.65) < 2.9 || Math.abs(sx - 5.65) < 2.9) && (
                <mesh position={[sx, fl * floorHeight + 1.55, spineZ + spineD / 2 + 0.03]}>
                  <planeGeometry args={[1.8, 1.32]} />
                  <meshStandardMaterial
                    color={glow ? '#FFE4A0' : '#233445'}
                    emissive={glow ? '#FFB84D' : '#000000'}
                    emissiveIntensity={glow ? 0.72 : 0}
                    roughness={0.28}
                  />
                </mesh>
              )}
            </group>
          );
        }),
      )}

      {/* ============ 3. HAI SÂN TRONG TRỒNG CÂY XANH & BỒN GẠCH ĐỎ (c7-mat-trong-san-cay.jpg) ============ */}
      {courtXs.map((cx, cIdx) => (
        <group key={`c7-courtyard-${cIdx}`} position={[cx, 0, wingZ]}>
          {/* Nền sân lát gạch xám sáng */}
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.032, 0]} receiveShadow>
            <planeGeometry args={[5.8, wingD - 0.4]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.9} />
          </mesh>
          {/* 2 bồn cây xây gạch đỏ trần (#C47D5B) + thảm cỏ + cây bóng mát trong mỗi sân */}
          {[-2.1, 2.2].map((pz, pIdx) => (
            <group key={`c7-planter-${cIdx}-${pIdx}`} position={[0, 0, pz]}>
              <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
                <boxGeometry args={[3.2, 0.48, 2.4]} />
                <meshStandardMaterial color="#C47D5B" roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.49, 0]} receiveShadow>
                <boxGeometry args={[2.85, 0.04, 2.05]} />
                <meshStandardMaterial color="#4D7C43" roughness={0.95} />
              </mesh>
              <mesh position={[0, 1.65, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.2, 2.4, 8]} />
                <meshStandardMaterial color="#5C4430" roughness={0.95} />
              </mesh>
              <mesh position={[0, 3.2, 0]} castShadow>
                <sphereGeometry args={[1.25, 12, 10]} />
                <meshStandardMaterial color="#3F6E38" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Mái hiên sảnh chính ở nhánh giữa & Biển hiệu C7 */}
      <mesh position={[0, 3.65, size.z / 2 + 0.9]} castShadow>
        <boxGeometry args={[5.8, 0.34, 1.8]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
      </mesh>
      {[-2.2, 2.2].map((colX) => (
        <mesh key={`c7-porch-col-${colX}`} position={[colX, 1.82, size.z / 2 + 1.55]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3.64, 14]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* Chữ nổi "C7" màu xám bạc gắn trên cao mặt đứng nhánh phải (c7-goc-nghieng.jpg) */}
      <LabelPlane
        textureKey="c7-top-code-sign"
        canvasW={256}
        canvasH={160}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 118px Arial, sans-serif';
          ctx.lineWidth = 6;
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.75)';
          ctx.strokeText('C7', w / 2, h / 2);
          ctx.fillStyle = '#64748B';
          ctx.fillText('C7', w / 2, h / 2);
        }}
        size={[2.4, 1.5]}
        position={[wingXs[2] + 1.2, totalH - 1.9, size.z / 2 + 0.06]}
      />

      <LabelPlane
        textureKey="c7-main-sign"
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1E3A5F';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 34px Arial, sans-serif';
          ctx.fillText('TÒA NHÀ C7 · ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.4);
          ctx.fillStyle = '#93C5FD';
          ctx.font = '700 23px Arial, sans-serif';
          ctx.fillText('TỔ HỢP GIẢNG ĐƯỜNG & ĐIỀU HÀNH TRUNG TÂM', w / 2, h * 0.75);
        }}
        size={[5.2, 1.1]}
        position={[0, 4.35, size.z / 2 + 0.08]}
        transparent={false}
      />
    </group>
  );
}

// --- 2. Khối nhà phía Bắc Hồ Tiền (VDZ / Thủy Tạ) & Sàn Vọng Cảnh Hồ Tiền -----
function VietDucCenterBuilding({ isNight }: { isNight: boolean }) {
  const { center, size, floors, floorHeight } = VDZ_CENTER;
  const h = floors * floorHeight;

  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h, size.z]} />
        <meshStandardMaterial color="#E6F0FA" roughness={0.86} />
      </mesh>
      <mesh position={[0, h + 0.22, 0]} castShadow>
        <boxGeometry args={[size.x + 0.4, 0.44, size.z + 0.4]} />
        <meshStandardMaterial color="#3B6E9C" roughness={0.78} />
      </mesh>
      {[0, 1].map((fl) =>
        [-3.6, -1.2, 1.2, 3.6].map((wx, idx) => (
          <mesh key={`vdz-win-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.6, size.z / 2 + 0.03]}>
            <planeGeometry args={[1.5, 1.15]} />
            <meshStandardMaterial
              color={isNight ? '#FFE4A0' : GLASS_MID}
              emissive={isNight ? '#FFB84D' : '#000000'}
              emissiveIntensity={isNight ? 0.65 : 0}
              roughness={0.35}
            />
          </mesh>
        )),
      )}
      <LabelPlane
        textureKey="vdz-sign"
        canvasW={512}
        canvasH={112}
        draw={(ctx, w, hCanvas) => {
          ctx.fillStyle = '#1E3A5F';
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#F5C518';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, hCanvas - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 32px Arial, sans-serif';
          ctx.fillText('TRUNG TÂM VIỆT - ĐỨC (VDZ)', w / 2, hCanvas / 2);
        }}
        size={[4.0, 0.82]}
        position={[0, h - 0.55, size.z / 2 + 0.05]}
        transparent={false}
      />
    </group>
  );
}

// --- 3. Nhà B1 (Trường Công nghệ Thông tin & Truyền thông — SoICT) theo tham-khao/b1-soict/ ----
function SoictB1Building({ isNight }: { isNight: boolean }) {
  const { center, floorHeight } = SOICT_B1;
  const h7 = 7 * floorHeight; // 22.4 m (cánh trái + trụ góc tròn 7 tầng)
  const h8 = 8 * floorHeight; // 25.6 m (khối tháp phải 8 tầng mang biển B1 xanh dương)
  const h5 = 5 * floorHeight; // 16.0 m (khối giật cấp phía trước 5 tầng)
  const baseRedH = 2 * floorHeight; // 6.4 m (2 tầng đế ốp gạch đỏ nâu #9E3A26)
  const B1_RED_BRICK = '#9E3A26';
  const B1_WHITE = '#F5F7FA';

  return (
    <group position={[center.x, 0, center.z]}>
      {/* ============ 1. CÁNH TRÁI 7 TẦNG (XẾP CHÉO CHỮ V, TẦNG 1-2 ĐỎ NÂU, TẦNG 3-7 TRẮNG) ============ */}
      <group position={[-5.4, 0, -1.2]} rotation-y={0.28}>
        {/* Tầng 1-2 ốp đỏ nâu đặc trưng (b1-soict-01.jpg) */}
        <mesh position={[0, baseRedH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.4, baseRedH, 5.6]} />
          <meshStandardMaterial color={B1_RED_BRICK} roughness={0.82} />
        </mesh>
        {/* Tầng 3-7 sơn trắng kem sáng */}
        <mesh position={[0, (baseRedH + h7) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.3, h7 - baseRedH, 5.5]} />
          <meshStandardMaterial color={B1_WHITE} roughness={0.84} />
        </mesh>
        <mesh position={[0, h7 + 0.22, 0]} castShadow>
          <boxGeometry args={[9.6, 0.44, 5.8]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.8} />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6].map((fl) =>
          [-3.2, -1.1, 1.1, 3.2].map((wx, idx) => {
            const glow = isNight && (fl + idx) % 2 === 0;
            return (
              <mesh key={`b1-left-w-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.65, 2.82]}>
                <planeGeometry args={[1.42, 1.22]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_DARK}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.3}
                />
              </mesh>
            );
          }),
        )}
      </group>

      {/* ============ 2. CÁNH PHẢI 8 TẦNG GIẬT CẤP XUỐNG 5 TẦNG + BIỂN CHỮ "B1" XANH DƯƠNG ============ */}
      <group position={[4.6, 0, -1.5]} rotation-y={-0.22}>
        {/* Khối cao 8 tầng phía sau */}
        <mesh position={[0, h8 / 2, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[10.2, h8, 5.4]} />
          <meshStandardMaterial color={B1_WHITE} roughness={0.84} />
        </mesh>
        <mesh position={[0, h8 + 0.22, -0.6]} castShadow>
          <boxGeometry args={[10.5, 0.44, 5.7]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.8} />
        </mesh>
        {/* Khối giật cấp 5 tầng nhô ra phía trước (tầng 1-2 ốp đỏ nâu, tầng 3-5 trắng) */}
        <mesh position={[0.4, baseRedH / 2, 2.2]} castShadow receiveShadow>
          <boxGeometry args={[8.8, baseRedH, 3.8]} />
          <meshStandardMaterial color={B1_RED_BRICK} roughness={0.82} />
        </mesh>
        <mesh position={[0.4, (baseRedH + h5) / 2, 2.2]} castShadow receiveShadow>
          <boxGeometry args={[8.7, h5 - baseRedH, 3.7]} />
          <meshStandardMaterial color={B1_WHITE} roughness={0.84} />
        </mesh>
        <mesh position={[0.4, h5 + 0.2, 2.2]} castShadow>
          <boxGeometry args={[9.0, 0.4, 4.0]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.8} />
        </mesh>
        {/* Cửa sổ mặt trước khối 5 tầng */}
        {[0, 1, 2, 3, 4].map((fl) =>
          [-2.6, -0.6, 1.4, 3.4].map((wx, idx) => {
            const glow = isNight && (fl + idx) % 2 === 1;
            return (
              <mesh key={`b1-right5-w-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.65, 4.13]}>
                <planeGeometry args={[1.4, 1.22]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_DARK}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.3}
                />
              </mesh>
            );
          }),
        )}
        {/* Cửa sổ tầng 6-8 của khối tháp 8 tầng lộ phía trên khối 5 tầng */}
        {[5, 6, 7].map((fl) =>
          [-3.2, -1.1, 1.1, 3.2].map((wx, idx) => {
            const glow = isNight && (fl + idx) % 2 === 0;
            return (
              <mesh key={`b1-right8-w-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.65, 2.13]}>
                <planeGeometry args={[1.45, 1.22]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_DARK}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.3}
                />
              </mesh>
            );
          }),
        )}
        {/* Biển chữ nổi "B1" màu xanh dương đậm (#1D4E9E) trên đỉnh cánh 8 tầng (b1-soict-01.jpg, b1-soict-03.jpg) */}
        <LabelPlane
          textureKey="soict-b1-top-blue-code"
          canvasW={256}
          canvasH={160}
          draw={(ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '900 122px Arial, sans-serif';
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeText('B1', w / 2, h / 2);
            ctx.fillStyle = '#1D4E9E';
            ctx.fillText('B1', w / 2, h / 2);
          }}
          size={[2.3, 1.45]}
          position={[-3.2, h8 - 1.5, 2.16]}
        />
      </group>

      {/* ============ 3. KHỐI TRỤ GÓC BO TRÒN 7 TẦNG & KHỐI SẢNH TRÒN 3 TẦNG NHÔ RA (b1-soict-02.jpg) ============ */}
      <group position={[-0.4, 0, -0.8]}>
        {/* Trụ góc bo tròn 7 tầng màu trắng */}
        <mesh position={[0, h7 / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.15, 3.15, h7, 24]} />
          <meshStandardMaterial color={B1_WHITE} roughness={0.82} />
        </mesh>
        {/* Các dải kính cong ngang theo từng tầng trên trụ góc tròn */}
        {[2, 3, 4, 5, 6].map((fl) => (
          <mesh key={`b1-cyl-glass-${fl}`} position={[0, fl * floorHeight + 1.65, 0]}>
            <cylinderGeometry args={[3.18, 3.18, 1.25, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84]} />
            <meshStandardMaterial
              color={isNight && fl % 2 === 0 ? '#FFE4A0' : GLASS_DARK}
              emissive={isNight && fl % 2 === 0 ? '#FFB84D' : '#000000'}
              emissiveIntensity={isNight && fl % 2 === 0 ? 0.65 : 0}
              roughness={0.28}
              metalness={0.3}
              side={2}
            />
          </mesh>
        ))}
        <mesh position={[0, h7 + 0.24, 0]} castShadow>
          <cylinderGeometry args={[3.35, 3.35, 0.48, 24]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.8} />
        </mesh>

        {/* Khối sảnh tròn (Rotunda) 3 tầng nhô ra phía trước tại góc giao (b1-soict-01.jpg, b1-soict-02.jpg) */}
        <group position={[0, 0, 2.8]}>
          {/* Tầng 1: Sảnh kính cong + hàng cột trụ tròn + mái đón (canopy) đua rộng */}
          <mesh position={[0, 1.7, 0]} castShadow>
            <cylinderGeometry args={[2.9, 2.9, 3.4, 24]} />
            <meshStandardMaterial color="#1E2D3B" roughness={0.25} metalness={0.35} />
          </mesh>
          {[-2.4, -1.2, 0, 1.2, 2.4].map((ang, cIdx) => (
            <mesh
              key={`b1-rotunda-col-${cIdx}`}
              position={[Math.sin(ang * 0.42) * 3.25, 1.7, Math.cos(ang * 0.42) * 3.25]}
              castShadow
            >
              <cylinderGeometry args={[0.18, 0.18, 3.4, 14]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.75} />
            </mesh>
          ))}
          {/* Mái đón sảnh cong ốp alu bạc-trắng */}
          <mesh position={[0, 3.45, 0.55]} castShadow>
            <cylinderGeometry args={[3.9, 3.9, 0.36, 24]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.6} metalness={0.25} />
          </mesh>
          {/* Tầng 2 của khối sảnh tròn: ốp màu đỏ nâu đặc trưng (b1-soict-02.jpg) */}
          <mesh position={[0, 4.9, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.3, 3.3, 2.8, 24]} />
            <meshStandardMaterial color={B1_RED_BRICK} roughness={0.82} />
          </mesh>
          {/* Tầng 3 của khối sảnh tròn: sơn trắng + dải cửa sổ + lan can sân thượng */}
          <mesh position={[0, 7.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.3, 3.3, 2.8, 24]} />
            <meshStandardMaterial color={B1_WHITE} roughness={0.84} />
          </mesh>
          <mesh position={[0, 9.25, 0]} castShadow>
            <cylinderGeometry args={[3.48, 3.48, 0.35, 24]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ============ 4. BỒN CỎ BÁN NGUYỆT TIỀN CẢNH TRƯỚC SẢNH B1 (b1-soict-01.jpg, b1-soict-03.jpg) ============ */}
      <group position={[-0.2, 0, 5.4]}>
        <mesh position={[0, 0.16, 0]} receiveShadow>
          <cylinderGeometry args={[3.2, 3.3, 0.32, 24]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.33, 0]} receiveShadow>
          <cylinderGeometry args={[2.9, 2.9, 0.05, 24]} />
          <meshStandardMaterial color="#4D8B45" roughness={0.95} />
        </mesh>
        {[-1.2, 0, 1.2].map((bx, bIdx) => (
          <mesh key={`b1-shrub-${bIdx}`} position={[bx, 0.68, (bIdx === 1 ? -0.3 : 0.3)]} castShadow>
            <sphereGeometry args={[0.55, 10, 8]} />
            <meshStandardMaterial color="#2E6F34" roughness={0.9} />
          </mesh>
        ))}
      </group>

      <LabelPlane
        textureKey="soict-b1-sign"
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, hCanvas) => {
          ctx.fillStyle = '#9E3A26';
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#F8FAFC';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, hCanvas - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 32px Arial, sans-serif';
          ctx.fillText('NHÀ B1 · TRƯỜNG CNTT & TT (SoICT)', w / 2, hCanvas * 0.4);
          ctx.fillStyle = '#FDE68A';
          ctx.font = '700 22px Arial, sans-serif';
          ctx.fillText('SCHOOL OF INFORMATION AND COMMUNICATIONS TECHNOLOGY', w / 2, hCanvas * 0.75);
        }}
        size={[4.4, 0.92]}
        position={[-0.4, 3.55, 6.48]}
        transparent={false}
      />
    </group>
  );
}

// --- 4. Cụm A17, H1, H3 và Nhà T ở phía Đông-Nam B1 --------------------------
function EastCampusBlocks({ isNight }: { isNight: boolean }) {
  const { a17, h1, h3, nhaT } = EAST_CAMPUS_BLOCKS;
  const smallBlocks = [
    { code: 'A17', center: a17.center, size: a17.size, color: '#DCEAF7', roof: '#3B6E9C', rotY: 0 },
    { code: 'H1', center: h1.center, size: h1.size, color: '#EDE5D5', roof: '#8C7A6B', rotY: -0.55 },
    { code: 'H3', center: h3.center, size: h3.size, color: '#EDE5D5', roof: '#8C7A6B', rotY: 0 },
  ];

  return (
    <group>
      {smallBlocks.map((b) => (
        <group key={b.code} position={[b.center.x, 0, b.center.z]} rotation-y={b.rotY}>
          <mesh position={[0, 4.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.size.x, 9.6, b.size.z]} />
            <meshStandardMaterial color={b.color} roughness={0.88} />
          </mesh>
          <mesh position={[0, 9.8, 0]} castShadow>
            <boxGeometry args={[b.size.x + 0.4, 0.4, b.size.z + 0.4]} />
            <meshStandardMaterial color={b.roof} roughness={0.82} />
          </mesh>
          <LabelPlane
            textureKey={`east-block-${b.code}`}
            canvasW={256}
            canvasH={96}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#1E3A5F';
              ctx.fillRect(0, 0, w, h);
              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '900 44px Arial, sans-serif';
              ctx.fillText(b.code, w / 2, h / 2);
            }}
            size={[2.0, 0.72]}
            position={[0, 8.4, b.size.z / 2 + 0.05]}
            transparent={false}
          />
        </group>
      ))}

      {/* Nhà T lớn nằm chéo ở rìa Đông như trên khuon-vien-truong.png */}
      <group position={[nhaT.center.x, 0, nhaT.center.z]} rotation-y={-0.32}>
        <mesh position={[0, 6.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[nhaT.size.x, 12.4, nhaT.size.z]} />
          <meshStandardMaterial color="#2C4A6F" roughness={0.82} />
        </mesh>
        <mesh position={[0, 12.6, 0]} castShadow>
          <boxGeometry args={[nhaT.size.x + 0.5, 0.45, nhaT.size.z + 0.5]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
        </mesh>
        {[0, 1, 2].map((fl) =>
          [-7, -3.5, 0, 3.5, 7].map((wz, idx) => (
            <mesh key={`nhat-win-${fl}-${idx}`} position={[-nhaT.size.x / 2 - 0.03, fl * 3.6 + 2.2, wz]} rotation-y={-Math.PI / 2}>
              <planeGeometry args={[1.8, 1.3]} />
              <meshStandardMaterial
                color={isNight ? '#FFE4A0' : '#93C5FD'}
                emissive={isNight ? '#FFB84D' : '#000000'}
                emissiveIntensity={isNight ? 0.65 : 0}
                roughness={0.35}
              />
            </mesh>
          )),
        )}
        <LabelPlane
          textureKey="east-block-nhaT"
          canvasW={384}
          canvasH={112}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#B81D24';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFD166';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '900 48px Arial, sans-serif';
            ctx.fillText('NHÀ T', w / 2, h / 2);
          }}
          size={[3.2, 0.92]}
          position={[-nhaT.size.x / 2 - 0.06, 10.6, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          transparent={false}
        />
      </group>
    </group>
  );
}

// --- 5. Khu Ký túc xá Bách Khoa (B3–B13, KTX B8/B9 vàng cổ điển + Cổng Hội Sinh Viên, KTX Mới 9 tầng xanh-trắng, Sân bóng KTX) ---
function ClassicYellowDormBlock({
  code,
  center,
  size,
  extraSign,
  isNight,
}: {
  code: string;
  center: { x: number; z: number };
  size: { x: number; z: number };
  extraSign?: string;
  isNight: boolean;
}) {
  const floors = 4;
  const floorH = 3.0;
  const totalH = floors * floorH;
  const DORM_YELLOW = '#E0AF48'; // Sơn vàng nghệ đặc trưng KTX B9/B8 (ktx-01.jpg, ktx-02.jpg)
  const DORM_BAND_CREAM = '#F3EDE0';
  const DORM_WOOD_BROWN = '#5C3228';
  const clothesColors = ['#E11D48', '#2563EB', '#F8FAFC', '#16A34A', '#F59E0B'];

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Thân nhà 4 tầng sơn vàng nghệ cổ điển */}
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial color={DORM_YELLOW} roughness={0.88} />
      </mesh>
      {/* Mái bằng + gờ tường chắn mái (parapet) sơn vàng viền trắng kem */}
      <mesh position={[0, totalH + 0.22, 0]} castShadow>
        <boxGeometry args={[size.x + 0.3, 0.44, size.z + 0.3]} />
        <meshStandardMaterial color={DORM_BAND_CREAM} roughness={0.82} />
      </mesh>
      {/* Dải hành lang logia từng tầng + lan can bê tông vàng + quần áo sinh viên phơi (ktx-01.jpg) */}
      {[1, 2, 3].map((fl) => (
        <group key={`${code}-bal-${fl}`} position={[0, fl * floorH, size.z / 2 + 0.1]}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[size.x - 0.3, 0.14, 0.28]} />
            <meshStandardMaterial color={DORM_BAND_CREAM} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.48, 0.08]}>
            <boxGeometry args={[size.x - 0.5, 0.72, 0.08]} />
            <meshStandardMaterial color={DORM_YELLOW} roughness={0.86} />
          </mesh>
          {/* Quần áo sinh viên phơi ở hành lang tầng 2-4 (ktx-01.jpg) */}
          {[-size.x * 0.28, size.x * 0.18].map((lx, lIdx) => (
            <mesh
              key={`${code}-laundry-${fl}-${lIdx}`}
              position={[lx, 1.95, 0.04]}
            >
              <boxGeometry args={[0.42, 0.52, 0.06]} />
              <meshStandardMaterial
                color={clothesColors[(fl + lIdx + code.charCodeAt(1)) % clothesColors.length]}
                roughness={0.9}
              />
            </mesh>
          ))}
        </group>
      ))}
      {/* Lõi cầu thang giữa mặt đứng với ô gạch thông gió đứng */}
      <mesh position={[0, totalH / 2, size.z / 2 + 0.06]} castShadow>
        <boxGeometry args={[1.6, totalH - 0.4, 0.14]} />
        <meshStandardMaterial color={DORM_BAND_CREAM} roughness={0.86} />
      </mesh>
      {/* Cửa sổ gỗ nâu sẫm phòng KTX bật đèn ấm áp ban đêm */}
      {[0, 1, 2, 3].map((fl) =>
        [-size.x * 0.34, -size.x * 0.16, size.x * 0.16, size.x * 0.34].map((wx, idx) => {
          const glow = isNight && (fl + idx + code.length) % 2 === 0;
          return (
            <group key={`${code}-win-${fl}-${idx}`} position={[wx, fl * floorH + 1.55, size.z / 2 + 0.03]}>
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.18, 1.18]} />
                <meshStandardMaterial color={DORM_WOOD_BROWN} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[1.02, 1.02]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : '#2C4257'}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.35}
                />
              </mesh>
            </group>
          );
        }),
      )}
      {/* Biển tên nhà KTX nền xanh chữ trắng chuẩn (B8, B9...) */}
      <LabelPlane
        textureKey={`dorm-sign-classic-${code}`}
        canvasW={512}
        canvasH={112}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1E40AF';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 36px Arial, sans-serif';
          ctx.fillText(extraSign ? `NHÀ ${code} · ${extraSign}` : `NHÀ KTX ${code}`, w / 2, h / 2);
        }}
        size={[Math.min(size.x - 1, 4.6), 0.86]}
        position={[0, totalH - 0.62, size.z / 2 + 0.22]}
        transparent={false}
      />
    </group>
  );
}

// --- Tòa KTX Mới cao tầng (9 tầng phối ô cờ Xanh đậm - Xanh nhạt - Trắng theo ktx-03.jpg) ---
function NewHighRiseDormBlock({
  code,
  center,
  size,
  isNight,
}: {
  code: string;
  center: { x: number; z: number };
  size: { x: number; z: number };
  isNight: boolean;
}) {
  const floors = 9;
  const floorH = 2.95;
  const totalH = floors * floorH; // 26.55 m
  const KTX_BLUE_DEEP = '#1B56A8';
  const KTX_BLUE_SKY = '#6DA4E0';
  const KTX_WHITE = '#F4F6F9';
  const bayXs = [-4.8, -2.4, 0, 2.4, 4.8];

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Khối thân 9 tầng màu trắng hiện đại */}
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial color={KTX_WHITE} roughness={0.82} />
      </mesh>
      {/* Dải diềm trắng tầng 1-2 gắn dòng chữ xanh dương "KÝ TÚC XÁ ĐẠI HỌC BÁCH KHOA" (ktx-03.jpg) */}
      <mesh position={[0, 3.2, size.z / 2 + 0.14]} castShadow>
        <boxGeometry args={[size.x + 0.2, 1.35, 0.28]} />
        <meshStandardMaterial color={KTX_WHITE} roughness={0.78} />
      </mesh>
      <LabelPlane
        textureKey={`new-ktx-banner-${code}`}
        canvasW={1024}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#F4F6F9';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#1B56A8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 54px Arial, sans-serif';
          ctx.fillText('KÝ TÚC XÁ ĐẠI HỌC BÁCH KHOA', w / 2, h / 2);
        }}
        size={[size.x - 0.8, 1.05]}
        position={[0, 3.2, size.z / 2 + 0.3]}
        transparent={false}
      />

      {/* Mặt đứng tầng 3–9: Phối mảng ô cờ Xanh dương đậm (#1B56A8) - Xanh da trời (#6DA4E0) - Trắng (#F4F6F9) (ktx-03.jpg) */}
      {[2, 3, 4, 5, 6, 7, 8].map((fl) =>
        bayXs.map((bx, bIdx) => {
          const pattern = (fl + bIdx) % 3;
          const panelColor =
            pattern === 0 ? KTX_BLUE_DEEP : pattern === 1 ? KTX_BLUE_SKY : KTX_WHITE;
          const glow = isNight && (fl + bIdx) % 2 === 0;
          return (
            <group key={`${code}-check-${fl}-${bIdx}`} position={[bx, fl * floorH + 1.45, size.z / 2 + 0.04]}>
              {/* Mảng tường/ban công phối màu ô cờ */}
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[2.28, floorH - 0.12, 0.16]} />
                <meshStandardMaterial color={panelColor} roughness={0.78} />
              </mesh>
              {/* Ô cửa sổ & khe logia tối màu bên trong mỗi khoang */}
              <mesh position={[0, 0.12, 0.1]}>
                <planeGeometry args={[1.42, 1.38]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : '#1E293B'}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.75 : 0}
                  roughness={0.3}
                />
              </mesh>
            </group>
          );
        }),
      )}

      {/* Mái phẳng + diềm mái xanh dương đậm */}
      <mesh position={[0, totalH + 0.25, 0]} castShadow>
        <boxGeometry args={[size.x + 0.4, 0.5, size.z + 0.4]} />
        <meshStandardMaterial color={KTX_BLUE_DEEP} roughness={0.78} />
      </mesh>

      {/* Chi tiết sân trước KTX mới (ktx-03.jpg): mái kính xanh lấy sáng tầng hầm + bồn gạch đỏ + ghế đá */}
      {[-3.4, 3.4].map((sx, sIdx) => (
        <group key={`${code}-forecourt-${sIdx}`} position={[sx, 0, size.z / 2 + 1.35]}>
          {/* Bồn gạch đỏ trồng cây cọ/cau cảnh */}
          <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.48, 1.2]} />
            <meshStandardMaterial color="#9E3B28" roughness={0.88} />
          </mesh>
          {/* Mái kính vòm xanh lấy sáng tầng hầm cạnh bồn gạch */}
          <mesh position={[sIdx === 0 ? 1.8 : -1.8, 0.55, 0]} rotation-x={0.18} castShadow>
            <boxGeometry args={[1.3, 0.12, 1.1]} />
            <meshStandardMaterial color="#38BDF8" roughness={0.2} metalness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- Cổng trụ gạch đỏ "HỘI SINH VIÊN" dẫn vào sân KTX B8 – B9 (khớp ktx-02.jpg) ---
function HoiSinhVienBrickGate({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={-Math.PI / 2}>
      {/* 2 trụ cổng xây gạch đỏ + mũ trụ trắng */}
      {[-2.3, 2.3].map((px) => (
        <group key={`hsv-pillar-${px}`} position={[px, 0, 0]}>
          <mesh position={[0, 1.65, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 3.3, 0.62]} />
            <meshStandardMaterial color="#A8422B" roughness={0.86} />
          </mesh>
          <mesh position={[0, 3.38, 0]} castShadow>
            <boxGeometry args={[0.76, 0.18, 0.76]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Cổng sắt đen mở hai bên trụ gạch */}
      {[-1.55, 1.55].map((gx) => (
        <mesh key={`hsv-gate-leaf-${gx}`} position={[gx, 1.15, 0]}>
          <boxGeometry args={[0.9, 2.1, 0.08]} />
          <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {/* Bảng tên trắng viền xanh "HỘI SINH VIÊN" kèm huy hiệu tròn xanh ở giữa trên đỉnh cổng (ktx-02.jpg) */}
      <mesh position={[0, 3.65, 0]} castShadow>
        <boxGeometry args={[5.2, 0.78, 0.16]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
      </mesh>
      <LabelPlane
        textureKey="ktx-hoi-sinh-vien-gate-sign"
        canvasW={768}
        canvasH={140}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#1D4ED8';
          ctx.lineWidth = 8;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          // Huy hiệu tròn xanh Hội Sinh Viên ở phía trên-giữa
          ctx.fillStyle = '#1D4ED8';
          ctx.beginPath();
          ctx.arc(w * 0.16, h * 0.5, 36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 22px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('HSV', w * 0.16, h * 0.5);
          // Chữ "HỘI SINH VIÊN" màu xanh dương đậm
          ctx.fillStyle = '#1D4ED8';
          ctx.font = '900 58px Arial, sans-serif';
          ctx.fillText('HỘI SINH VIÊN', w * 0.56, h * 0.54);
        }}
        size={[5.0, 0.72]}
        position={[0, 3.65, 0.1]}
        transparent={false}
      />
    </group>
  );
}

function HustDormitoryZone({ isNight }: { isNight: boolean }) {
  const d = DORM_COMPLEX;
  const classicDorms = [
    { code: 'B6', center: d.b6Center, size: d.b6Size },
    { code: 'B7', center: d.b7Center, size: d.b7Size },
    { code: 'B7bis', center: d.b7bisCenter, size: d.b7bisSize },
    { code: 'B8', center: d.b8Center, size: d.b8Size, extraSign: 'HỘI SINH VIÊN (P101)' },
    { code: 'B5', center: d.b5Center, size: d.b5Size },
    { code: 'B9', center: d.b9Center, size: d.b9Size, extraSign: 'TT QUẢN LÝ KTX' },
    { code: 'B3', center: d.b3Center, size: d.b3Size },
    { code: 'B4', center: d.b4Center, size: d.b4Size },
  ];
  const highRiseDorms = [
    { code: 'B10', center: d.b10Center, size: d.b10Size },
    { code: 'B13', center: d.b13Center, size: d.b13Size },
  ];

  return (
    <group>
      {/* Các dãy KTX 4 tầng sơn vàng nghệ cổ điển (B6, B7, B7bis, B8, B5, B9, B3, B4 — ktx-01.jpg, ktx-02.jpg) */}
      {classicDorms.map((item) => (
        <ClassicYellowDormBlock
          key={item.code}
          code={item.code}
          center={item.center}
          size={item.size}
          extraSign={item.extraSign}
          isNight={isNight}
        />
      ))}

      {/* Cổng trụ gạch đỏ "HỘI SINH VIÊN" trước lối vào sân trong KTX B8 - B9 (ktx-02.jpg) */}
      <HoiSinhVienBrickGate x={95.8} z={-28.5} />

      {/* Hai tòa KTX Mới 9 tầng phối ô cờ Xanh dương đậm - Xanh da trời - Trắng (B10 & B13 — ktx-03.jpg) */}
      {highRiseDorms.map((item) => (
        <NewHighRiseDormBlock
          key={item.code}
          code={item.code}
          center={item.center}
          size={item.size}
          isNight={isNight}
        />
      ))}

      {/* Sân bóng mini KTX ngay dưới B9 (kẻ vạch trắng + cầu môn + 4 cột đèn cao áp theo ktx-01.jpg) */}
      <group position={[d.dormPitchCenter.x, 0, d.dormPitchCenter.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]} receiveShadow>
          <planeGeometry args={[d.dormPitchSize.x, d.dormPitchSize.z]} />
          <meshStandardMaterial color="#388E3C" roughness={0.88} />
        </mesh>
        {/* Vạch biên trắng & vạch giữa sân */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.026, 0]}>
          <ringGeometry args={[1.15, 1.28, 24]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.026, 0]}>
          <planeGeometry args={[0.12, d.dormPitchSize.z - 0.6]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {/* 2 khung thành mini hai đầu sân bóng KTX */}
        {[-d.dormPitchSize.x / 2 + 0.35, d.dormPitchSize.x / 2 - 0.35].map((gx, gIdx) => (
          <group key={`dorm-goal-${gIdx}`} position={[gx, 0, 0]}>
            {[-1.1, 1.1].map((gz) => (
              <mesh key={`dorm-goal-post-${gz}`} position={[0, 0.85, gz]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 1.7, 8]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
              </mesh>
            ))}
            <mesh position={[0, 1.7, 0]} rotation-x={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 2.28, 8]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
            </mesh>
          </group>
        ))}
        {/* 4 cột đèn pha sân bóng KTX (ktx-01.jpg) */}
        {[
          [-d.dormPitchSize.x / 2 - 0.4, -d.dormPitchSize.z / 2 - 0.4],
          [d.dormPitchSize.x / 2 + 0.4, -d.dormPitchSize.z / 2 - 0.4],
          [-d.dormPitchSize.x / 2 - 0.4, d.dormPitchSize.z / 2 + 0.4],
          [d.dormPitchSize.x / 2 + 0.4, d.dormPitchSize.z / 2 + 0.4],
        ].map(([px, pz], pIdx) => (
          <group key={`dorm-pitch-lamp-${pIdx}`} position={[px, 0, pz]}>
            <mesh position={[0, 3.2, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.07, 6.4, 8]} />
              <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.4} />
            </mesh>
            <mesh position={[0, 6.45, 0]}>
              <boxGeometry args={[0.45, 0.22, 0.25]} />
              <meshStandardMaterial
                color="#F8FAFC"
                emissive={isNight ? '#FFF3C4' : '#000000'}
                emissiveIntensity={isNight ? 1.4 : 0}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Nhà ăn KTX & bàn ghế dù che ngoài trời */}
      <group position={[d.canteenCenter.x, 0, d.canteenCenter.z]}>
        <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[d.canteenSize.x, 4.6, d.canteenSize.z]} />
          <meshStandardMaterial color="#FAF6EE" roughness={0.86} />
        </mesh>
        <mesh position={[0, 4.75, 0]} castShadow>
          <boxGeometry args={[d.canteenSize.x + 0.6, 0.35, d.canteenSize.z + 0.6]} />
          <meshStandardMaterial color="#C87D4B" roughness={0.78} />
        </mesh>
        <LabelPlane
          textureKey="dorm-canteen-sign"
          canvasW={512}
          canvasH={112}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#1C5C3A';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFD166';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '900 36px Arial, sans-serif';
            ctx.fillText('NHÀ ĂN KTX BÁCH KHOA · 食堂', w / 2, h / 2);
          }}
          size={[4.4, 0.88]}
          position={[0, 3.85, d.canteenSize.z / 2 + 0.06]}
          transparent={false}
        />
      </group>
    </group>
  );
}

// --- 6. Khu Thể chất (Nhà thi đấu TC, Bể bơi, Sân bóng rổ, Khán đài & SVĐ Bóng đá, KTX Lào) ---
function FootballGoalpost({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      {/* 2 cột dọc + xà ngang khung thành sơn trắng */}
      {[-2.6, 2.6].map((gx) => (
        <mesh key={`post-${gx}`} position={[gx, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 2.4, 10]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 5.32, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Khung lưới phía sau khung thành */}
      <mesh position={[0, 1.2, -0.75]}>
        <boxGeometry args={[5.2, 2.35, 1.4]} />
        <meshStandardMaterial color="#F8FAFC" wireframe transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function HustSportsAndStadiumComplex({ isNight }: { isNight: boolean }) {
  const {
    stadiumCenter,
    stadiumSize,
    poolCenter,
    poolSize,
    courtCenter,
    courtSize,
    footballFieldCenter,
    footballFieldSize,
    ktxLaoCenter,
    ktxLaoSize,
  } = SPORTS_COMPLEX;

  const courtTex = useMemo(() => makeSportsCourtTexture(), []);
  const fieldTex = useMemo(() => makeFootballFieldTexture(), []);
  const poolTex = useMemo(() => makeSwimmingPoolTexture(), []);

  useEffect(
    () => () => {
      courtTex.dispose();
      fieldTex.dispose();
      poolTex.dispose();
    },
    [courtTex, fieldTex, poolTex],
  );

  return (
    <group>
      {/* 6.1 Nhà thi đấu Bách Khoa (TC) — Khối vuông mái xanh đậm như trên bản đồ */}
      <group position={[stadiumCenter.x, 0, stadiumCenter.z]}>
        <mesh position={[0, 4.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[stadiumSize.x, 8.8, stadiumSize.z]} />
          <meshStandardMaterial color="#EAE6DC" roughness={0.86} />
        </mesh>
        <mesh position={[0, 9.0, 0]} castShadow>
          <boxGeometry args={[stadiumSize.x + 0.6, 0.6, stadiumSize.z + 0.6]} />
          <meshStandardMaterial color="#27496D" roughness={0.65} metalness={0.25} />
        </mesh>
        <LabelPlane
          textureKey="bk-tc-stadium-sign"
          canvasW={512}
          canvasH={128}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#1E4E68';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFD166';
            ctx.lineWidth = 7;
            ctx.strokeRect(8, 8, w - 16, h - 16);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '900 36px Arial, sans-serif';
            ctx.fillText('NHÀ THI ĐẤU BÁCH KHOA (TC)', w / 2, h * 0.4);
            ctx.fillStyle = '#FFD166';
            ctx.font = '700 24px Arial, sans-serif';
            ctx.fillText('TRUNG TÂM GIÁO DỤC THỂ CHẤT & THỂ THAO · 体育馆', w / 2, h * 0.75);
          }}
          size={[5.6, 1.25]}
          position={[0, 6.4, -stadiumSize.z / 2 - 0.06]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
      </group>

      {/* 6.2 Bể bơi Bách Khoa (màu xanh ngọc lam có phao phân làn) */}
      <group position={[poolCenter.x, 0, poolCenter.z]}>
        {/* Thành bể bơi lát gạch trắng kem */}
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <boxGeometry args={[poolSize.x + 1.4, 0.44, poolSize.z + 1.4]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.75} />
        </mesh>
        {/* Mặt nước bể bơi */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.46, 0]}>
          <planeGeometry args={[poolSize.x, poolSize.z]} />
          <meshStandardMaterial map={poolTex} roughness={0.2} metalness={0.1} />
        </mesh>
      </group>

      {/* 6.3 Sân bóng rổ / thể chất ngoài trời giữa Nhà thi đấu TC và Bể bơi */}
      <group position={[courtCenter.x, 0, courtCenter.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]} receiveShadow>
          <planeGeometry args={[courtSize.x, courtSize.z]} />
          <meshStandardMaterial map={courtTex} roughness={0.82} />
        </mesh>
      </group>

      {/* 6.4 Sân vận động Bách Khoa (SVĐ Bóng đá lớn + Đường chạy điền kinh đỏ + Khán đài) */}
      <group position={[footballFieldCenter.x, 0, footballFieldCenter.z]}>
        {/* Mặt sân vận động (y = 0,020 — người chơi đi bộ/chạy bộ thoải mái trên sân) */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[footballFieldSize.x, footballFieldSize.z]} />
          <meshStandardMaterial map={fieldTex} roughness={0.85} />
        </mesh>
        {/* 2 Khung thành bóng đá ở 2 đầu Đông / Tây sân */}
        <FootballGoalpost x={-footballFieldSize.x / 2 + 2.6} z={0} rotY={Math.PI / 2} />
        <FootballGoalpost x={footballFieldSize.x / 2 - 2.6} z={0} rotY={-Math.PI / 2} />
        {/* Khán đài đỏ dọc rìa Bắc sân vận động (sát đường Lê Thanh Nghị như trên bản đồ) */}
        <mesh position={[0, 0.65, -footballFieldSize.z / 2 - 1.4]} castShadow receiveShadow>
          <boxGeometry args={[24, 1.3, 2.2]} />
          <meshStandardMaterial color="#B83B32" roughness={0.82} />
        </mesh>
        <mesh position={[0, 1.45, -footballFieldSize.z / 2 - 2.2]} castShadow receiveShadow>
          <boxGeometry args={[24, 1.8, 1.4]} />
          <meshStandardMaterial color="#9E2A22" roughness={0.82} />
        </mesh>
        {/* 4 Cột đèn pha cao áp SVĐ Bách Khoa */}
        {[-15, 15].map((lx) =>
          [-footballFieldSize.z / 2 - 0.8, footballFieldSize.z / 2 + 0.8].map((lz) => (
            <group key={`stadium-flood-${lx}-${lz}`} position={[lx, 0, lz]}>
              <mesh position={[0, 4.5, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.12, 9.0, 8]} />
                <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.6} />
              </mesh>
              <mesh position={[0, 9.1, 0]}>
                <boxGeometry args={[0.9, 0.4, 0.4]} />
                <meshStandardMaterial
                  color="#FFFBEB"
                  emissive="#FFE599"
                  emissiveIntensity={isNight ? 1.2 : 0.45}
                />
              </mesh>
            </group>
          )),
        )}
      </group>

      {/* 6.5 KTX Lào (nằm phía Đông Bắc SVĐ Bách Khoa theo đúng khuon-vien-truong.png) */}
      <group position={[ktxLaoCenter.x, 0, ktxLaoCenter.z]}>
        <mesh position={[0, 5.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[ktxLaoSize.x, 10.8, ktxLaoSize.z]} />
          <meshStandardMaterial color="#E8D8C0" roughness={0.88} />
        </mesh>
        <mesh position={[0, 11.0, 0]} castShadow>
          <boxGeometry args={[ktxLaoSize.x + 0.4, 0.4, ktxLaoSize.z + 0.4]} />
          <meshStandardMaterial color="#8C6D53" roughness={0.82} />
        </mesh>
        <LabelPlane
          textureKey="ktx-lao-sign"
          canvasW={384}
          canvasH={96}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#8C4A27';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFD166';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '900 40px Arial, sans-serif';
            ctx.fillText('KÝ TÚC XÁ LÀO', w / 2, h / 2);
          }}
          size={[3.4, 0.85]}
          position={[0, 9.4, -ktxLaoSize.z / 2 - 0.05]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
      </group>
    </group>
  );
}

// --- 7. Cổng Tạ Quang Bửu, Trạm Xe buýt Parabol, Cột đèn nến TĐN & Hàng rào ---
function TaQuangBuuGate() {
  const { x, z } = TA_QUANG_BUU_GATE.center;
  return (
    <group position={[x, 0, z]}>
      {[-4.5, 4.5].map((gx) => (
        <mesh key={`tqb-gate-${gx}`} position={[gx, 2.4, 0]} castShadow>
          <boxGeometry args={[1.1, 4.8, 1.1]} />
          <meshStandardMaterial color="#EAE4D7" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[10.2, 0.95, 0.8]} />
        <meshStandardMaterial color="#EAE4D7" roughness={0.85} />
      </mesh>
      <LabelPlane
        textureKey="tqb-gate-sign"
        canvasW={1024}
        canvasH={192}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#A81C24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 7;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 40px Arial, sans-serif';
          ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI · CỔNG TẠ QUANG BỬU', w / 2, h / 2);
        }}
        size={[8.6, 0.82]}
        position={[0, 4.5, 0.43]}
        transparent={false}
      />
    </group>
  );
}

function ParabolBusStop() {
  const { x, z } = PARABOL_BUS_STOP.center;
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 2}>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.08, 2.2]} />
        <meshStandardMaterial color="#9E9B94" roughness={0.9} />
      </mesh>
      {[-2.3, 2.3].map((px) => (
        <mesh key={`bus-post-${px}`} position={[px, 1.35, -0.8]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 2.7, 10]} />
          <meshStandardMaterial color="#1E3A5F" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 2.72, -0.1]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[5.6, 0.12, 2.1]} />
        <meshStandardMaterial color="#1E3A5F" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.45, -0.55]} castShadow>
        <boxGeometry args={[3.2, 0.08, 0.42]} />
        <meshStandardMaterial color="#C87D4B" roughness={0.8} />
      </mesh>
      <LabelPlane
        textureKey="parabol-bus-sign"
        canvasW={512}
        canvasH={256}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1D4ED8';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFD166';
          ctx.font = '900 32px Arial, sans-serif';
          ctx.fillText('🚌 ĐIỂM DỪNG XE BUÝT BÁCH KHOA', 20, 48);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 24px Arial, sans-serif';
          ctx.fillText('Tuyến: 03A · 21A · 21B · 25 · 26 · 28 · 32 · E08', 20, 102);
          ctx.fillText('Điểm dừng: Cổng Parabol (Đường Giải Phóng)', 20, 152);
          ctx.fillStyle = '#93C5FD';
          ctx.fillText('公交车站 · HUST PARABOL GATE BUS STOP', 20, 206);
        }}
        size={[2.6, 1.25]}
        position={[0, 1.45, -0.78]}
        transparent={false}
      />
    </group>
  );
}

function TranDaiNghiaCandlePillars() {
  const pillars: Array<[number, number]> = [
    [75, -16.5],
    [81, -16.5],
    [87, -16.5],
    [75, 4.5],
    [81, 4.5],
    [87, 4.5],
  ];
  return (
    <group>
      {pillars.map(([px, pz], idx) => (
        <group key={`tdn-candle-${idx}`} position={[px, 0, pz]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.42, 0.5, 0.42]} />
            <meshStandardMaterial color="#2C3036" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.14, 1.9, 12]} />
            <meshStandardMaterial color="#EAE6DF" roughness={0.5} />
          </mesh>
          <mesh position={[0, 2.55, 0]}>
            <coneGeometry args={[0.14, 0.42, 12]} />
            <meshStandardMaterial color="#FFF3C4" emissive="#FFB84D" emissiveIntensity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CampusPerimeterFence() {
  const northX = [-88, -80, -72, -42, -30, -18, -6, 6, 18, 30, 42, 54, 66, 78, 98, 112, 142, 156];
  const southX = [-84, -70, -56, -42, -28, -14, 0, 14, 28, 42, 56, 70, 84, 98, 114, 130, 146, 160];
  const westZ = [-66, -54, -42, -30, -18, 30, 42, 54, 66, 78];

  return (
    <group>
      {northX.map((fx) => (
        <group key={`fence-n-${fx}`} position={[fx, 0, -75.2]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[6.5, 0.6, 0.28]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[6.4, 1.1, 0.06]} />
            <meshStandardMaterial color={IRON_DARK} roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
      {southX.map((fx) => (
        <group key={`fence-s-${fx}`} position={[fx, 0, 106.5]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[6.5, 0.6, 0.28]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[6.4, 1.1, 0.06]} />
            <meshStandardMaterial color={IRON_DARK} roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
      {westZ.map((fz) => (
        <group key={`fence-w-${fz}`} position={[-95.2, 0, fz]} rotation-y={Math.PI / 2}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[6.5, 0.6, 0.28]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[6.4, 1.1, 0.06]} />
            <meshStandardMaterial color={IRON_DARK} roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function CampusExpansion({
  timeOfDay = 'day',
}: {
  timeOfDay?: 'day' | 'sunset' | 'night';
}) {
  const isNight = (timeOfDay ?? playerState.timeOfDay) !== 'day';

  return (
    <group>
      {/* Cụm 3 tòa C6 – C7 – C8 sát đường Trần Đại Nghĩa */}
      <C6AndC8Block
        code="C6"
        subtitle="VIỆN CƠ KHÍ ĐỘNG LỰC"
        center={C6_BUILDING.center}
        size={C6_BUILDING.size}
        floors={C6_BUILDING.floors}
        floorHeight={C6_BUILDING.floorHeight}
        isNight={isNight}
      />
      <C7ComplexBuilding isNight={isNight} />
      <C6AndC8Block
        code="C8"
        subtitle="KHỐI GIẢNG ĐƯỜNG & THÍ NGHIỆM C8"
        center={C8_BUILDING.center}
        size={C8_BUILDING.size}
        floors={C8_BUILDING.floors}
        floorHeight={C8_BUILDING.floorHeight}
        isNight={isNight}
      />

      {/* Nhà Bắc Hồ Tiền (VDZ) */}
      <VietDucCenterBuilding isNight={isNight} />

      {/* Phân khu phía Đông đường Trần Đại Nghĩa: KTX B3–B13, Nhà B1 (SoICT), A17/H1/H3/Nhà T, Khu Thể thao & SVĐ */}
      <HustDormitoryZone isNight={isNight} />
      <SoictB1Building isNight={isNight} />
      <EastCampusBlocks isNight={isNight} />
      <HustSportsAndStadiumComplex isNight={isNight} />

      <TaQuangBuuGate />
      <ParabolBusStop />
      <TranDaiNghiaCandlePillars />
      <CampusPerimeterFence />
    </group>
  );
}
