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
  const totalH = floors * floorHeight; // 22.4 m

  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, 0.16, size.z / 2 + 1.0]} castShadow receiveShadow>
        <boxGeometry args={[9.2, 0.32, 2.0]} />
        <meshStandardMaterial color="#8E8D88" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.16, 0.9, size.z + 0.16]} />
        <meshStandardMaterial color="#9E9B93" roughness={0.88} />
      </mesh>
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.86} />
      </mesh>
      {/* Vách kính trung tâm */}
      <mesh position={[0, totalH / 2 + 0.8, 0.22]} castShadow>
        <boxGeometry args={[9.0, totalH - 1.2, size.z + 0.28]} />
        <meshStandardMaterial color={GLASS_DARK} roughness={0.28} metalness={0.35} />
      </mesh>
      {[1, 2, 3, 4, 5, 6].map((fl) => (
        <mesh key={`c7-mullion-${fl}`} position={[0, fl * floorHeight, size.z / 2 + 0.39]}>
          <boxGeometry args={[9.05, 0.14, 0.06]} />
          <meshStandardMaterial color={FRAME_WHITE} roughness={0.6} />
        </mesh>
      ))}
      {/* Lam đứng đỏ Bách Khoa */}
      {[-10.2, -8.8, -7.4, -6.0, 6.0, 7.4, 8.8, 10.2].map((lx) => (
        <mesh key={`c7-louver-${lx}`} position={[lx, totalH / 2 + 1.2, size.z / 2 + 0.16]} castShadow>
          <boxGeometry args={[0.24, totalH - 3.6, 0.3]} />
          <meshStandardMaterial color={HUST_RED} roughness={0.55} metalness={0.2} />
        </mesh>
      ))}
      {/* Cửa sổ 2 cánh bên phát sáng ban đêm */}
      {[1, 2, 3, 4, 5, 6].map((fl) =>
        [-9.5, -6.7, 6.7, 9.5].map((wx, idx) => {
          const glow = isNight && (fl + idx) % 2 === 1;
          return (
            <mesh
              key={`c7-win-${fl}-${wx}`}
              position={[wx, fl * floorHeight + 1.4, size.z / 2 + 0.03]}
            >
              <planeGeometry args={[1.8, 1.35]} />
              <meshStandardMaterial
                color={glow ? '#FFE4A0' : GLASS_MID}
                emissive={glow ? '#FFB84D' : '#000000'}
                emissiveIntensity={glow ? 0.72 : 0}
                roughness={0.32}
                metalness={0.25}
              />
            </mesh>
          );
        }),
      )}
      <mesh position={[0, 3.65, size.z / 2 + 1.45]} castShadow>
        <boxGeometry args={[10.2, 0.38, 2.4]} />
        <meshStandardMaterial color={FRAME_WHITE} roughness={0.8} />
      </mesh>
      {[-4.0, -1.5, 1.5, 4.0].map((cx) => (
        <mesh key={`c7-col-${cx}`} position={[cx, 1.8, size.z / 2 + 2.25]} castShadow>
          <boxGeometry args={[0.46, 3.6, 0.46]} />
          <meshStandardMaterial color={FRAME_WHITE} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[0, totalH + 0.35, 0]} castShadow>
        <boxGeometry args={[size.x + 0.6, 0.7, size.z + 0.6]} />
        <meshStandardMaterial color={HUST_RED} roughness={0.65} />
      </mesh>
      <LabelPlane
        textureKey="c7-main-sign"
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 8;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 34px Arial, sans-serif';
          ctx.fillText('NHÀ C7 · KH&CN NHIỆT LẠNH', w / 2, h * 0.4);
          ctx.fillStyle = '#FFD166';
          ctx.font = '700 24px Arial, sans-serif';
          ctx.fillText('TỔ HỢP GIẢNG ĐƯỜNG & ĐIỀU HÀNH TRUNG TÂM', w / 2, h * 0.75);
        }}
        size={[5.2, 1.1]}
        position={[0, 4.45, size.z / 2 + 0.44]}
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

// --- 3. Nhà B1 (Viện Công nghệ Thông tin & Truyền thông — SoICT) hình chữ V ----
function SoictB1Building({ isNight }: { isNight: boolean }) {
  const { center, floors, floorHeight } = SOICT_B1;
  const h = floors * floorHeight; // 16.5 m

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Hai cánh tòa nhà B1 xếp hình chữ V đối xứng đúng như Bản đồ Bách Khoa */}
      {[-1, 1].map((side) => (
        <group
          key={`b1-wing-${side}`}
          position={[side * 4.2, 0, 0]}
          rotation-y={side * 0.62}
        >
          <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[11.5, h, 5.8]} />
            <meshStandardMaterial color="#DFC4A6" roughness={0.86} />
          </mesh>
          <mesh position={[0, h + 0.25, 0]} castShadow>
            <boxGeometry args={[11.9, 0.5, 6.2]} />
            <meshStandardMaterial color="#8C583A" roughness={0.8} />
          </mesh>
          {/* Cửa sổ 5 tầng phát sáng ban đêm */}
          {[0, 1, 2, 3, 4].map((fl) =>
            [-3.8, -1.3, 1.3, 3.8].map((wx, idx) => {
              const glow = isNight && (fl + idx) % 2 === 0;
              return (
                <mesh key={`b1-w-${side}-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.7, 2.93]}>
                  <planeGeometry args={[1.55, 1.2]} />
                  <meshStandardMaterial
                    color={glow ? '#FFE4A0' : GLASS_DARK}
                    emissive={glow ? '#FFB84D' : '#000000'}
                    emissiveIntensity={glow ? 0.7 : 0}
                    roughness={0.32}
                  />
                </mesh>
              );
            }),
          )}
        </group>
      ))}
      {/* Khối sảnh trung tâm nối đáy chữ V */}
      <mesh position={[0, h / 2 + 0.4, 2.2]} castShadow>
        <boxGeometry args={[5.6, h + 0.8, 5.2]} />
        <meshStandardMaterial color={GLASS_DARK} roughness={0.28} metalness={0.35} />
      </mesh>
      <LabelPlane
        textureKey="soict-b1-sign"
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, hCanvas) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 7;
          ctx.strokeRect(8, 8, w - 16, hCanvas - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 34px Arial, sans-serif';
          ctx.fillText('NHÀ B1 · TRƯỜNG CNTT & TT (SoICT)', w / 2, hCanvas * 0.4);
          ctx.fillStyle = '#FFD166';
          ctx.font = '700 24px Arial, sans-serif';
          ctx.fillText('VIỆN CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG', w / 2, hCanvas * 0.75);
        }}
        size={[5.2, 1.15]}
        position={[0, 4.8, 4.85]}
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

// --- 5. Khu Ký túc xá Bách Khoa (B3–B13, VP Hội Sinh viên B8, Sân bóng KTX, Nhà ăn) ---
function DormBlock({
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

  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial color="#E6F0FA" roughness={0.88} />
      </mesh>
      <mesh position={[0, totalH + 0.2, 0]} castShadow>
        <boxGeometry args={[size.x + 0.35, 0.4, size.z + 0.35]} />
        <meshStandardMaterial color={HEADER_BLUE} roughness={0.78} />
      </mesh>
      {/* Dải hành lang và lan can từng tầng */}
      {[1, 2, 3].map((fl) => (
        <group key={`${code}-bal-${fl}`} position={[0, fl * floorH, size.z / 2 + 0.12]}>
          <mesh position={[0, 0.42, 0.06]}>
            <boxGeometry args={[size.x - 0.6, 0.75, 0.08]} />
            <meshStandardMaterial color={HEADER_BLUE} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Cửa sổ phòng KTX bật đèn ấm áp ban đêm */}
      {[0, 1, 2, 3].map((fl) =>
        [-size.x * 0.32, 0, size.x * 0.32].map((wx, idx) => {
          const glow = isNight && (fl + idx + code.length) % 2 === 0;
          return (
            <mesh key={`${code}-win-${fl}-${idx}`} position={[wx, fl * floorH + 1.6, size.z / 2 + 0.03]}>
              <planeGeometry args={[1.45, 1.1]} />
              <meshStandardMaterial
                color={glow ? '#FFE4A0' : GLASS_MID}
                emissive={glow ? '#FFB84D' : '#000000'}
                emissiveIntensity={glow ? 0.72 : 0}
                roughness={0.35}
              />
            </mesh>
          );
        }),
      )}
      <LabelPlane
        textureKey={`dorm-sign-${code}`}
        canvasW={512}
        canvasH={112}
        draw={(ctx, w, h) => {
          ctx.fillStyle = extraSign ? '#1E3A8A' : '#235789';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 34px Arial, sans-serif';
          ctx.fillText(extraSign ? `KTX ${code} · ${extraSign}` : `KÝ TÚC XÁ ${code}`, w / 2, h / 2);
        }}
        size={[Math.min(size.x - 1, 4.8), 0.88]}
        position={[0, totalH - 0.65, size.z / 2 + 0.2]}
        transparent={false}
      />
    </group>
  );
}

function HustDormitoryZone({ isNight }: { isNight: boolean }) {
  const d = DORM_COMPLEX;
  const dorms = [
    { code: 'B6', center: d.b6Center, size: d.b6Size },
    { code: 'B7', center: d.b7Center, size: d.b7Size },
    { code: 'B7bis', center: d.b7bisCenter, size: d.b7bisSize },
    { code: 'B8', center: d.b8Center, size: d.b8Size, extraSign: 'HỘI SINH VIÊN (P101)' },
    { code: 'B5', center: d.b5Center, size: d.b5Size },
    { code: 'B9', center: d.b9Center, size: d.b9Size, extraSign: 'TT QUẢN LÝ KTX' },
    { code: 'B13', center: d.b13Center, size: d.b13Size },
    { code: 'B3', center: d.b3Center, size: d.b3Size },
    { code: 'B10', center: d.b10Center, size: d.b10Size },
    { code: 'B4', center: d.b4Center, size: d.b4Size },
  ];

  return (
    <group>
      {dorms.map((item) => (
        <DormBlock
          key={item.code}
          code={item.code}
          center={item.center}
          size={item.size}
          extraSign={item.extraSign}
          isNight={isNight}
        />
      ))}

      {/* Sân bóng mini KTX (nằm ngay dưới B9 trên bản đồ khuon-vien-truong.png) */}
      <group position={[d.dormPitchCenter.x, 0, d.dormPitchCenter.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]} receiveShadow>
          <planeGeometry args={[d.dormPitchSize.x, d.dormPitchSize.z]} />
          <meshStandardMaterial color="#3B943B" roughness={0.88} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.026, 0]}>
          <ringGeometry args={[1.2, 1.32, 24]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
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
