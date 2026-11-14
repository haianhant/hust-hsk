// ---------------------------------------------------------------------------
// BackgroundBuildings.tsx — khối nhà phụ + cây nền + ghế/đèn (đợt sửa lần 2,
// brief §4). Mục đích: cảnh không kết thúc đột ngột ở khoảng trời trống ở
// rìa campus. Khối nhà phụ CHỈ là hình khối sáng màu, thấp (5-8 m), không
// chi tiết, KHÔNG đặt tên, KHÔNG biển chữ, KHÔNG chắn mặt đứng công trình
// chính hay lối đi. Cây nền dùng ImprovedTree (Trees.tsx) — cây rìa, không
// dùng để che mặt đứng nào. Ghế/đèn đặt NGOÀI đường đi chính (cách mép đường
// ≥ 1 m), không có collider mới nên leg-sim (lib/campus.ts) không đổi.
// Vị trí đã đối chiếu với ROADS/LEGS/collider trong lib/campus.ts (xem ghi
// chú cuối file). Export default, không props — luồng tích hợp gắn vào
// CampusScene (đã gắn sẵn trong bản sao này; KHÔNG gắn lần 2).
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import * as THREE from 'three';
import { ImprovedTree } from './Trees';
import { ExtrudedText3D, FramedSignBox3D } from './Signage3D';
import { LabelPlane } from './TextPlate';
import { RoofSoffitAndPlinth, WindowGrid3D } from './ArchitecturalWindowBand';
import { getSharedBuildingPbrTextures } from './materials';
import {
  BIKE_PARKING_SHED,
  CAMPUS_SHADE_TREES,
  C_CONNECTOR_BUILDINGS,
  D4_BUILDING,
  LECTURE_BUILDINGS,
  type LectureBuildingSpec,
} from '../../lib/campus';
import { playerState } from '../../lib/playerState';

const WALL_TONES = ['#F4F2EA', '#EDE8DC', '#F0ECE1', '#E8E4DA'];
const PLINTH_BEIGE = '#DFC99B';
const HUST_RAIL_RED = '#D22630';
const ROOF_TONE = '#C9C2B2';
const WINDOW_TONE = '#3F586E';
const WINDOW_FRAME = '#FAF8F2';
const LAMP_POLE = '#3A3A3A';
const LAMP_HEAD = '#FFF3C4';
const BENCH_WOOD = '#7A5230';
const BENCH_IRON = '#1A1A1A';
const PAVE_TONE = '#A8A8A2';

// Nhà D4 (Viện Ngoại ngữ — khối nhà hình chữ L ở góc Tây-Nam sát đường Giải Phóng theo đúng bản đồ)
function D4ForeignLanguagesBuilding({ isNight }: { isNight: boolean }) {
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
  return (
    <group position={[D4_BUILDING.center.x, 0, D4_BUILDING.center.z]}>
      {/* Cánh ngang phía Nam (18 × 7 m) */}
      <mesh position={[0, 5.1, 4.5]} castShadow receiveShadow>
        <boxGeometry args={[18, 10.2, 7]} />
        <meshStandardMaterial
          color="#EAE3D2"
          map={pbr?.plaster.map}
          bumpMap={pbr?.plaster.bumpMap}
          bumpScale={0.012}
          roughness={0.88}
        />
      </mesh>
      {/* Cánh dọc phía Đông tạo hình chữ L (7 × 13 m) */}
      <mesh position={[5.5, 5.1, -2.0]} castShadow receiveShadow>
        <boxGeometry args={[7, 10.2, 13]} />
        <meshStandardMaterial
          color="#EAE3D2"
          map={pbr?.plaster.map}
          bumpMap={pbr?.plaster.bumpMap}
          bumpScale={0.012}
          roughness={0.88}
        />
      </mesh>
      {/* Chân đế granite dưới cùng + tầng 1 ốp vàng kem */}
      <mesh position={[0, 0.24, 4.5]} receiveShadow>
        <boxGeometry args={[18.22, 0.48, 7.22]} />
        <meshStandardMaterial
          color="#64748B"
          map={pbr?.granite.map}
          bumpMap={pbr?.granite.bumpMap}
          bumpScale={0.014}
          roughness={0.86}
        />
      </mesh>
      <mesh position={[5.5, 0.24, -2.0]} receiveShadow>
        <boxGeometry args={[7.22, 0.48, 13.22]} />
        <meshStandardMaterial
          color="#64748B"
          map={pbr?.granite.map}
          bumpMap={pbr?.granite.bumpMap}
          bumpScale={0.014}
          roughness={0.86}
        />
      </mesh>
      <mesh position={[0, 1.6, 4.5]} receiveShadow>
        <boxGeometry args={[18.1, 3.2, 7.1]} />
        <meshStandardMaterial color={PLINTH_BEIGE} map={pbr?.plaster.map} roughness={0.9} />
      </mesh>
      <mesh position={[5.5, 1.6, -2.0]} receiveShadow>
        <boxGeometry args={[7.1, 3.2, 13.1]} />
        <meshStandardMaterial color={PLINTH_BEIGE} map={pbr?.plaster.map} roughness={0.9} />
      </mesh>
      {/* Mái phẳng chữ L */}
      <mesh position={[0, 10.38, 4.5]} castShadow>
        <boxGeometry args={[18.5, 0.36, 7.5]} />
        <meshStandardMaterial color={ROOF_TONE} roughness={0.92} />
      </mesh>
      <mesh position={[5.5, 10.38, -2.0]} castShadow>
        <boxGeometry args={[7.5, 0.36, 13.5]} />
        <meshStandardMaterial color={ROOF_TONE} roughness={0.92} />
      </mesh>
      {/* Cửa sổ nổi khối 3D mặt Bắc, mặt Nam & hông Đông cánh dọc */}
      <WindowGrid3D
        position={[0, 0, 0.95]}
        rotation={[0, Math.PI, 0]}
        colXs={[-6.5, -3.5, -0.5]}
        rowYs={[1.8, 5.1, 7.9]}
        winW={1.4}
        winH={1.1}
        frameColor="#1E293B"
        sillColor="#F3EDE0"
        isNight={isNight}
        seedOffset={181}
        withAcUnits
      />
      <WindowGrid3D
        position={[0, 0, 8.0]}
        colXs={[-6.0, -2.5, 1.0, 4.5]}
        rowYs={[1.8, 5.1, 7.9]}
        winW={1.45}
        winH={1.12}
        frameColor="#1E293B"
        sillColor="#F3EDE0"
        isNight={isNight}
        seedOffset={183}
      />
      <WindowGrid3D
        position={[9.0, 0, -2.0]}
        rotation={[0, Math.PI / 2, 0]}
        colXs={[-4.2, -1.4, 1.4, 4.2]}
        rowYs={[1.8, 5.1, 7.9]}
        winW={1.45}
        winH={1.12}
        frameColor="#1E293B"
        sillColor="#F3EDE0"
        isNight={isNight}
        seedOffset={187}
      />
      <FramedSignBox3D
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '700 44px Arial, sans-serif';
          ctx.fillText('NHÀ D4 · VIỆN NGOẠI NGỮ', w / 2, h * 0.42);
          ctx.fillStyle = '#FFD166';
          ctx.font = '700 24px Arial, sans-serif';
          ctx.fillText('SCHOOL OF FOREIGN LANGUAGES · 外语学院', w / 2, h * 0.76);
        }}
        size={[4.2, 0.95]}
        depth={0.1}
        boxColor="#7F1D1D"
        frameColor="#F5C518"
        position={[-2.5, 9.2, 0.88]}
        rotation={[0, Math.PI, 0]}
        isNight={isNight}
      />
    </group>
  );
}

// Khối nhà nối 3 tầng chạm đất (C3-4, C4-5, C5-10 theo chuẩn https://hustmap.com/)
// kết hợp hành lang cầu nối trên cao ở đầu Đông Khu C, giữa D3 ↔ D5 và giữa D6 ↔ D8
function LectureSkybridges({ isNight }: { isNight: boolean }) {
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
  const bridges: Array<{ x: number; z: number; w: number; d: number; y: number }> = [
    // Cầu nối đầu Đông giữa C4 (-57) ↔ C5 (-46) ↔ C10 (-35)
    { x: -5.5, z: -51.5, w: 2.2, d: 4.8, y: 3.6 },
    { x: -5.5, z: -40.5, w: 2.2, d: 4.8, y: 3.6 },
    // Cầu nối hành lang giữa D3 (z=3.0..9.8) ↔ D5 (z=20.5..27.1)
    { x: 62.2, z: 15.15, w: 2.4, d: 10.8, y: 3.4 },
    // Cầu nối hành lang giữa D5 (z=20.5..27.1) ↔ D7 (z=38.5..45.3)
    { x: 62.2, z: 32.8, w: 2.4, d: 11.5, y: 3.4 },
    // Cầu nối giữa D6 (z=38) ↔ D8 (z=54)
    { x: -46, z: 46, w: 2.4, d: 8.6, y: 3.4 },
  ];
  return (
    <group>
      {/* Cầu nối khung bê tông trắng 5 tầng bắc ngang cuối trục đường x = 56.2 nối cụm D7 ↔ D9 */}
      <group position={[56.0, 0, 61.2]}>
        {[-3.85, -1.3, 1.3, 3.85].map((cx, cIdx) => {
          const isOuter = cIdx === 0 || cIdx === 3;
          return (
            <mesh
              key={`d79-bridge-col-${cIdx}`}
              position={[cx, isOuter ? 7.75 : 9.65, 0]}
              castShadow
            >
              <boxGeometry args={[0.38, isOuter ? 15.5 : 11.7, 2.2]} />
              <meshStandardMaterial
                color="#F8FAFC"
                map={pbr?.plaster.map}
                bumpMap={pbr?.plaster.bumpMap}
                bumpScale={0.01}
                roughness={0.8}
              />
            </mesh>
          );
        })}
        {[1, 2, 3, 4].map((fl) => (
          <group key={`d79-bridge-fl-${fl}`} position={[0, fl * 3.1 + 0.65, 0]}>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[8.1, 0.32, 2.3]} />
              <meshStandardMaterial color="#F8FAFC" map={pbr?.plaster.map} roughness={0.8} />
            </mesh>
            {[-1.04, 1.04].map((rz, rIdx) => (
              <mesh key={`rail-${rIdx}`} position={[0, 0.56, rz]}>
                <boxGeometry args={[7.8, 0.68, 0.06]} />
                <meshStandardMaterial color="#5A2322" roughness={0.55} metalness={0.3} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 15.65, 0]} castShadow>
          <boxGeometry args={[8.3, 0.34, 2.5]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.82} />
        </mesh>
      </group>

      {/* 3 Khối nhà nối 3 tầng chạm đất C3-4, C4-5, C5-10 ở đầu Tây cụm C3–C4–C5–C10 */}
      {C_CONNECTOR_BUILDINGS.map((cb, cbIdx) => (
        <group key={cb.code} position={[cb.center.x, 0, cb.center.z]}>
          <mesh position={[0, 1.4, 0]} receiveShadow>
            <boxGeometry args={[cb.size.x + 0.08, 2.8, cb.size.z + 0.08]} />
            <meshStandardMaterial color={PLINTH_BEIGE} map={pbr?.plaster.map} roughness={0.92} />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <boxGeometry args={[cb.size.x + 0.14, 2.5, 2.1]} />
            <meshStandardMaterial color="#273038" roughness={0.9} />
          </mesh>
          <mesh position={[0, cb.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[cb.size.x, cb.h, cb.size.z]} />
            <meshStandardMaterial
              color={WALL_TONES[1]}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.88}
            />
          </mesh>
          <mesh position={[0, cb.h + 0.16, 0]} castShadow>
            <boxGeometry args={[cb.size.x + 0.45, 0.32, cb.size.z + 0.45]} />
            <meshStandardMaterial color={ROOF_TONE} roughness={0.92} />
          </mesh>
          {/* Cửa sổ nổi khối 3D tầng 2 & 3 mặt Tây và mặt Đông */}
          <WindowGrid3D
            position={[-cb.size.x / 2, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            colXs={[0]}
            rowYs={[4.95, 7.95]}
            winW={2.05}
            winH={1.12}
            frameColor={WINDOW_FRAME}
            sillColor="#DFC99B"
            isNight={isNight}
            seedOffset={191 + cbIdx * 5}
            withRainHood={false}
          />
          <WindowGrid3D
            position={[cb.size.x / 2, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            colXs={[0]}
            rowYs={[4.95, 7.95]}
            winW={2.05}
            winH={1.12}
            frameColor={WINDOW_FRAME}
            sillColor="#DFC99B"
            isNight={isNight}
            seedOffset={197 + cbIdx * 5}
          />
          {/* Biển tên NHÀ C3-4 / C4-5 / C5-10 gắn trên mặt Tây */}
          <LabelPlane
            textureKey={`connector-sign-${cb.code}`}
            canvasW={320}
            canvasH={112}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#B81D24';
              ctx.fillRect(0, 0, w, h);
              ctx.strokeStyle = '#F5C518';
              ctx.lineWidth = 6;
              ctx.strokeRect(5, 5, w - 10, h - 10);
              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '800 44px "Be Vietnam Pro", Arial, sans-serif';
              ctx.fillText(cb.code, w / 2, h / 2 + 2);
            }}
            size={[1.65, 0.58]}
            position={[-cb.size.x / 2 - 0.08, cb.h - 0.62, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            transparent={false}
          />
        </group>
      ))}

      {/* Các hành lang cầu nối trên cao */}
      {bridges.map((br, idx) => (
        <group key={`skybridge-${idx}`} position={[br.x, br.y, br.z]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[br.w, 0.28, br.d]} />
            <meshStandardMaterial color="#F2EFE6" map={pbr?.plaster.map} roughness={0.88} />
          </mesh>
          <mesh position={[br.w / 2 - 0.06, 0.55, 0]}>
            <boxGeometry args={[0.08, 0.72, br.d]} />
            <meshStandardMaterial color={HUST_RAIL_RED} roughness={0.55} metalness={0.25} />
          </mesh>
          <mesh position={[-br.w / 2 + 0.06, 0.55, 0]}>
            <boxGeometry args={[0.08, 0.72, br.d]} />
            <meshStandardMaterial color={HUST_RAIL_RED} roughness={0.55} metalness={0.25} />
          </mesh>
          <mesh position={[0, 2.55, 0]} castShadow>
            <boxGeometry args={[br.w + 0.35, 0.18, br.d + 0.2]} />
            <meshStandardMaterial color={ROOF_TONE} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Cụm giảng đường 5 tầng kiến trúc khung bê tông trắng hiện đại D3 – D5 – D3-5 – D7 – D9
 * Dựng chuẩn 1:1 theo bộ ảnh thực tế `tham-khao/NEW/`:
 *   - `Một phần tòa D3 nhìn từ trục đường phải, bên tòa C7.jpg`
 *   - `trục đường bên trái từ cổng trần đại nghĩa, chiều đi ra.jpg`
 *   - `từ cuối 2 nhánh bên nhìn sang bên trái, cụm tòa D3,5,7,9.jpg`
 *   - `bên phải thư viện.jpg`
 */
function ModernistWhiteDBuilding({ b, isNight }: { b: LectureBuildingSpec; isNight: boolean }) {
  const floors = 5;
  const floorH = b.h / floors; // 15.5m / 5 = 3.1m
  const isD3 = b.code === 'D3';
  const isNorthSouth = b.face === 'w' || b.face === 'e'; // D3-5 chạy dọc Bắc–Nam
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
  const westWinRowYs = useMemo(() => [0, 1, 2, 3, 4].map((fl) => fl * floorH + 1.68), [floorH]);
  const upperRowYs = useMemo(() => [1, 2, 3, 4].map((fl) => fl * floorH + 1.62), [floorH]);
  const groundRowYs = useMemo(() => [1.62], []);
  const fullColXs = useMemo(() => [-4.5, -1.6, 1.4, 4.3, 6.9], []);
  const d3GroundNorthColXs = useMemo(() => [-4.5, -1.6, 4.3, 6.9], []);

  if (isNorthSouth) {
    // Khối nối D3-5 chạy dọc Bắc–Nam (5 tầng sơn trắng đồng bộ + hành lang hướng Tây nhìn ra sân trong D3-D5)
    const bayCount = 5;
    const bayZs = Array.from({ length: bayCount }, (_, i) => -b.d / 2 + 1.8 + i * ((b.d - 3.6) / (bayCount - 1)));
    return (
      <group position={[b.x, 0, b.z]}>
        <mesh position={[0, 0.18, 0]} receiveShadow>
          <boxGeometry args={[b.w + 0.16, 0.36, b.d + 0.16]} />
          <meshStandardMaterial
            color="#CBD5E1"
            map={pbr?.granite.map}
            bumpMap={pbr?.granite.bumpMap}
            bumpScale={0.012}
            roughness={0.86}
          />
        </mesh>
        <mesh position={[0.45, b.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[b.w - 0.9, b.h, b.d]} />
          <meshStandardMaterial
            color="#F8FAFC"
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.82}
          />
        </mesh>
        <mesh position={[0, b.h + 0.16, 0]} castShadow>
          <boxGeometry args={[b.w + 0.36, 0.32, b.d + 0.36]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.82} />
        </mesh>
        <WindowGrid3D
          position={[b.w / 2, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          colXs={[-4.8, -1.6, 1.6, 4.8]}
          rowYs={[0, 1, 2, 3, 4].map((fl) => fl * floorH + 1.62)}
          winW={1.8}
          winH={1.28}
          frameColor="#E2E8F0"
          sillColor="#CBD5E1"
          isNight={isNight}
          seedOffset={211}
        />
        {[1, 2, 3, 4].map((fl) => (
          <group key={`d35-fl-${fl}`} position={[0, fl * floorH, 0]}>
            <mesh position={[-b.w / 2 + 0.5, -0.08, 0]} castShadow>
              <boxGeometry args={[1.05, 0.2, b.d]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
            </mesh>
            <mesh position={[-b.w / 2 + 0.08, 0.48, 0]}>
              <boxGeometry args={[0.06, 0.78, b.d - 0.4]} />
              <meshStandardMaterial color="#5A2322" roughness={0.55} metalness={0.3} />
            </mesh>
          </group>
        ))}
        {bayZs.map((bz, idx) => (
          <mesh key={`d35-col-${idx}`} position={[-b.w / 2 + 0.14, b.h / 2, bz]} castShadow>
            <boxGeometry args={[0.28, b.h, 0.28]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.78} />
          </mesh>
        ))}
      </group>
    );
  }

  // Các tòa D3, D5, D7, D9 chạy Đông–Tây, mặt hành lang mở hướng Bắc (-Z)
  const frontZ = -b.d / 2;
  const corrDepth = 1.25;
  // Đầu hồi Tây (x = -b.w/2 .. -b.w/2 + 2.9) xây phẳng làm buồng thang & mảng tường trắng gắn chữ nổi "D3"
  const endBayW = 2.9;
  const openSpanW = b.w - endBayW;
  const openCenterX = endBayW / 2;
  const colCount = Math.max(5, Math.round(openSpanW / 2.9) + 1);
  const colXs = Array.from(
    { length: colCount },
    (_, i) => -b.w / 2 + endBayW + (i / (colCount - 1)) * (openSpanW - 0.22),
  );

  return (
    <group position={[b.x, 0, b.z]}>
      {/* Vỉa hè lát gạch xám sáng + các ô gốc cây bó vỉa đá dọc mặt Bắc & mặt Tây (đối chiếu ảnh D3) */}
      {(isD3 || b.code === 'D5' || b.code === 'D7') && (
        <group>
          <mesh position={[-0.6, 0.035, 0]} receiveShadow>
            <boxGeometry args={[b.w + 2.4, 0.07, b.d + (isD3 ? 3.8 : 2.2)]} />
            <meshStandardMaterial color="#B8C0C8" roughness={0.88} />
          </mesh>
          {isD3 &&
            [-6.4, 2.2, 6.8].map((tx, tIdx) => (
              <group key={`d3-treepit-${tIdx}`} position={[tx, 0.075, frontZ - 1.35]}>
                <mesh position={[0, 0.03, 0]} receiveShadow>
                  <boxGeometry args={[2.3, 0.06, 1.35]} />
                  <meshStandardMaterial
                    color="#94A3B8"
                    map={pbr?.granite.map}
                    bumpMap={pbr?.granite.bumpMap}
                    bumpScale={0.01}
                    roughness={0.85}
                  />
                </mesh>
                <mesh position={[0, 0.065, 0]} receiveShadow>
                  <boxGeometry args={[2.05, 0.02, 1.12]} />
                  <meshStandardMaterial color="#466D3B" roughness={0.95} />
                </mesh>
              </group>
            ))}
        </group>
      )}

      {/* Bệ chân đế bê tông granite xám sáng */}
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[b.w + 0.16, 0.36, b.d + 0.16]} />
        <meshStandardMaterial
          color="#CBD5E1"
          map={pbr?.granite.map}
          bumpMap={pbr?.granite.bumpMap}
          bumpScale={0.012}
          roughness={0.86}
        />
      </mesh>

      {/* 1. KHỐI ĐẦU HỒI TÂY PHẲNG MÀU TRẮNG TINH (#F8FAFC) + CHỮ NỔI ĐEN "D3" & DÀN NÓNG ĐIỀU HÒA HÔNG TÂY */}
      <mesh position={[-b.w / 2 + endBayW / 2, b.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[endBayW, b.h, b.d]} />
        <meshStandardMaterial
          color="#F8FAFC"
          map={pbr?.plaster.map}
          bumpMap={pbr?.plaster.bumpMap}
          bumpScale={0.012}
          roughness={0.8}
        />
      </mesh>
      <ExtrudedText3D
        text={b.code}
        size={[1.62, 0.98]}
        depth={0.16}
        position={[-b.w / 2 + endBayW * 0.5, 6.45, frontZ - 0.09]}
        rotation={[0, Math.PI, 0]}
        frontColor="#26292E"
        frontHighlightColor="#475569"
        sideColor="#0F172A"
        metalness={0.55}
        roughness={0.35}
      />
      {/* Cửa sổ khung nhôm trắng 3D + dàn nóng điều hòa gắn dọc mặt Tây (-X, sát trục đường x = 56.2) */}
      <WindowGrid3D
        position={[-b.w / 2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        colXs={[-1.65, 1.55]}
        rowYs={westWinRowYs}
        winW={1.85}
        winH={1.36}
        frameColor="#CBD5E1"
        sillColor="#E2E8F0"
        glassColor="#64748B"
        isNight={isNight}
        seedOffset={b.code.charCodeAt(1) + 221}
        withAcUnits
      />

      {/* 2. THÂN PHÒNG HỌC LÙI SAU HÀNH LANG MỞ HƯỚNG BẮC (-Z) */}
      {isD3 ? (
        <group>
          {/* Tầng 2–5 liền khối phía trên cổng xuyên sảnh */}
          <mesh
            position={[openCenterX, floorH + (b.h - floorH) / 2, corrDepth / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[openSpanW, b.h - floorH, b.d - corrDepth]} />
            <meshStandardMaterial
              color="#F8FAFC"
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.82}
            />
          </mesh>
          {/* Hai cánh tầng 1 hai bên lối xuyên sảnh trung tâm */}
          <mesh position={[-2.95, floorH / 2, corrDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[6.2, floorH, b.d - corrDepth]} />
            <meshStandardMaterial
              color="#F8FAFC"
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.82}
            />
          </mesh>
          <mesh position={[5.9, floorH / 2, corrDepth / 2]} castShadow receiveShadow>
            <boxGeometry args={[6.2, floorH, b.d - corrDepth]} />
            <meshStandardMaterial
              color="#F8FAFC"
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.82}
            />
          </mesh>
          {/* Trần lối đi xuyên sảnh sáng đèn LED trắng */}
          <mesh position={[1.45, floorH - 0.06, corrDepth / 2]}>
            <boxGeometry args={[2.6, 0.08, b.d - corrDepth]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive="#FFFBEB"
              emissiveIntensity={0.65}
            />
          </mesh>
        </group>
      ) : (
        <mesh position={[openCenterX, b.h / 2, corrDepth / 2]} castShadow receiveShadow>
          <boxGeometry args={[openSpanW, b.h, b.d - corrDepth]} />
          <meshStandardMaterial
            color="#F8FAFC"
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.82}
          />
        </mesh>
      )}

      {/* Mái bằng bê tông trắng sáng trên đỉnh toàn tòa */}
      <mesh position={[0, b.h + 0.16, 0]} castShadow>
        <boxGeometry args={[b.w + 0.36, 0.32, b.d + 0.36]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.82} />
      </mesh>

      {/* 3. HỆ KHUNG LƯỚI CỘT TRẮNG, HÀNH LANG MỞ TẦNG 2–5, ĐÈN TRẦN & LAN CAN SẮT NÂU ĐỎ (#5A2322) */}
      {colXs.map((cx, idx) => (
        <mesh key={`${b.code}-grid-col-${idx}`} position={[cx, b.h / 2, frontZ + 0.16]} castShadow>
          <boxGeometry args={[0.3, b.h, 0.32]} />
          <meshStandardMaterial color="#FFFFFF" map={pbr?.plaster.map} roughness={0.78} />
        </mesh>
      ))}

      {[1, 2, 3, 4].map((fl) => (
        <group key={`${b.code}-corr-${fl}`} position={[openCenterX, fl * floorH, 0]}>
          <mesh position={[0, -0.09, frontZ + corrDepth / 2]} castShadow>
            <boxGeometry args={[openSpanW, 0.22, corrDepth + 0.06]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
          </mesh>
          {[-4.2, -0.8, 2.6, 5.8].map((lx, lIdx) => (
            <mesh key={`corr-light-${lIdx}`} position={[lx, -0.21, frontZ + 0.65]}>
              <boxGeometry args={[0.75, 0.03, 0.18]} />
              <meshStandardMaterial
                color="#FFFBEB"
                emissive="#FDE68A"
                emissiveIntensity={isNight ? 1.4 : 0.75}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.78, frontZ + 0.12]}>
            <boxGeometry args={[openSpanW - 0.2, 0.06, 0.05]} />
            <meshStandardMaterial color="#5A2322" roughness={0.5} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.44, frontZ + 0.12]}>
            <boxGeometry args={[openSpanW - 0.2, 0.05, 0.04]} />
            <meshStandardMaterial color="#5A2322" roughness={0.5} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.16, frontZ + 0.12]}>
            <boxGeometry args={[openSpanW - 0.2, 0.08, 0.05]} />
            <meshStandardMaterial color="#5A2322" roughness={0.5} metalness={0.35} />
          </mesh>
        </group>
      ))}

      {/* Hệ cửa sổ lớp học 3D bên trong hành lang Bắc & mặt Nam */}
      <WindowGrid3D
        position={[0, 0, frontZ + corrDepth]}
        rotation={[0, Math.PI, 0]}
        colXs={isD3 ? d3GroundNorthColXs : fullColXs}
        rowYs={groundRowYs}
        winW={2.02}
        winH={1.42}
        frameColor="#E2E8F0"
        sillColor="#CBD5E1"
        glassColor="#475569"
        isNight={isNight}
        seedOffset={231}
        withRainHood={false}
      />
      <WindowGrid3D
        position={[0, 0, frontZ + corrDepth]}
        rotation={[0, Math.PI, 0]}
        colXs={fullColXs}
        rowYs={upperRowYs}
        winW={2.02}
        winH={1.42}
        frameColor="#E2E8F0"
        sillColor="#CBD5E1"
        glassColor="#475569"
        isNight={isNight}
        seedOffset={233}
        withRainHood={false}
      />
      <WindowGrid3D
        position={[0, 0, b.d / 2]}
        colXs={isD3 ? d3GroundNorthColXs : fullColXs}
        rowYs={groundRowYs}
        winW={1.95}
        winH={1.38}
        frameColor="#E2E8F0"
        sillColor="#CBD5E1"
        glassColor="#475569"
        isNight={isNight}
        seedOffset={239}
      />
      <WindowGrid3D
        position={[0, 0, b.d / 2]}
        colXs={fullColXs}
        rowYs={upperRowYs}
        winW={1.95}
        winH={1.38}
        frameColor="#E2E8F0"
        sillColor="#CBD5E1"
        glassColor="#475569"
        isNight={isNight}
        seedOffset={241}
        withAcUnits
      />

      {/* 4. MÁI ĐÓN SẢNH BẮC 4 CỘT TRÒN TRẮNG + BẬC TAM CẤP + ĐƯỜNG DỐC KHUYẾT TẬT CỦA NHÀ D3 */}
      {isD3 && (
        <group position={[1.45, 0, frontZ]}>
          <mesh position={[0, 3.48, -0.88]} castShadow>
            <boxGeometry args={[8.4, 0.36, 1.82]} />
            <meshStandardMaterial color="#F8FAFC" map={pbr?.plaster.map} roughness={0.78} />
          </mesh>
          {[-3.6, -1.5, 1.5, 3.6].map((px, pIdx) => (
            <mesh key={`d3-portico-col-${pIdx}`} position={[px, 1.74, -1.52]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 3.48, 16]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.76} />
            </mesh>
          ))}
          {[0, 1, 2].map((st) => (
            <mesh
              key={`d3-step-${st}`}
              position={[0, 0.08 + st * 0.1, -1.62 + st * 0.28]}
              receiveShadow
            >
              <boxGeometry args={[7.4, 0.1, 0.32]} />
              <meshStandardMaterial
                color="#94A3B8"
                map={pbr?.granite.map}
                bumpMap={pbr?.granite.bumpMap}
                bumpScale={0.01}
                roughness={0.88}
              />
            </mesh>
          ))}
          <mesh position={[0.95, 0.56, -0.45]} castShadow>
            <boxGeometry args={[1.15, 0.62, 0.55]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.65} />
          </mesh>
          <group position={[5.35, 0, -0.68]}>
            <mesh position={[0, 0.18, 0]} rotation={[0, 0, 0.08]} receiveShadow>
              <boxGeometry args={[3.4, 0.22, 0.92]} />
              <meshStandardMaterial color="#CBD5E1" roughness={0.86} />
            </mesh>
            <mesh position={[0, 0.68, -0.42]} rotation={[0, 0, 0.08]}>
              <boxGeometry args={[3.4, 0.05, 0.05]} />
              <meshStandardMaterial color="#5A2322" roughness={0.5} metalness={0.35} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}

function BackgroundBuilding({ b, isNight }: { b: LectureBuildingSpec; isNight: boolean }) {
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
  if (
    b.code === 'D3' ||
    b.code === 'D5' ||
    b.code === 'D3-5' ||
    b.code === 'D7' ||
    b.code === 'D9'
  ) {
    return <ModernistWhiteDBuilding b={b} isNight={isNight} />;
  }
  const along = b.face === 's' || b.face === 'n' ? b.w : b.d;
  const count = Math.max(3, Math.floor(along / 3));
  const floors = Math.max(3, Math.round(b.h / 3.0));
  const isHighRise = floors >= 8;
  const floorH = b.h / floors;
  const upperFloors = Array.from({ length: floors - 1 }, (_, idx) => idx + 1);
  const winColXs = useMemo(
    () => Array.from({ length: count }, (_, k) => -along / 2 + ((k + 0.5) / count) * along),
    [along, count],
  );
  const winRowYs = useMemo(
    () => Array.from({ length: floors }, (_, r) => (r + 0.56) * floorH),
    [floorH, floors],
  );
  const faceOffset = ((): [number, number, number] => {
    switch (b.face) {
      case 's': return [0, 0, b.d / 2];
      case 'n': return [0, 0, -b.d / 2];
      case 'e': return [b.w / 2, 0, 0];
      case 'w': return [-b.w / 2, 0, 0];
    }
  })();
  const faceRotY = b.face === 's' ? 0 : b.face === 'n' ? Math.PI : b.face === 'e' ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[b.x, 0, b.z]} rotation-y={b.rotY ?? 0}>
      <RoofSoffitAndPlinth
        w={b.w}
        d={b.d}
        height={b.h}
        plinthH={0.44}
        plinthColor={isHighRise ? '#64748B' : '#94A3B8'}
        graniteMap={pbr?.granite.map}
        graniteBump={pbr?.granite.bumpMap}
      />
      {/* Thân nhà chính màu trắng sáng / trắng kem PBR */}
      <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial
          color={isHighRise ? '#F8FAFC' : WALL_TONES[b.tone]}
          map={pbr?.plaster.map}
          bumpMap={pbr?.plaster.bumpMap}
          bumpScale={0.012}
          roughness={0.86}
        />
      </mesh>
      {/* Tầng 1 ốp màu vàng kem nhạt (hoặc đá granite xám hiện đại cho cao ốc D8 11 tầng) */}
      <mesh position={[0, floorH * 0.48, 0]} receiveShadow>
        <boxGeometry args={[b.w + 0.06, floorH * 0.96, b.d + 0.06]} />
        <meshStandardMaterial
          color={isHighRise ? '#94A3B8' : PLINTH_BEIGE}
          map={isHighRise ? pbr?.granite.map : pbr?.plaster.map}
          roughness={0.9}
        />
      </mesh>
      {/* Mái phẳng + gờ parapet nhô nhẹ khỏi tường */}
      <mesh position={[0, b.h + 0.18, 0]} castShadow>
        <boxGeometry args={[b.w + 0.6, 0.36, b.d + 0.6]} />
        <meshStandardMaterial color={isHighRise ? '#CBD5E1' : ROOF_TONE} roughness={0.92} />
      </mesh>
      {/* Tum thang máy & dàn chiller trên đỉnh tòa nhà cao tầng D8 (11 tầng theo https://hustmap.com/) */}
      {isHighRise && (
        <group position={[0, b.h + 0.36, 0]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[4.6, 2.2, 3.8]} />
            <meshStandardMaterial color="#E2E8F0" map={pbr?.plaster.map} roughness={0.82} />
          </mesh>
          <mesh position={[0, 2.32, 0]} castShadow>
            <boxGeometry args={[5.0, 0.24, 4.2]} />
            <meshStandardMaterial color="#991B1B" roughness={0.74} />
          </mesh>
          {[-5.2, 5.2].map((hx) => (
            <mesh key={`hr-hvac-${hx}`} position={[hx, 0.55, 0]} castShadow>
              <boxGeometry args={[2.0, 1.1, 2.2]} />
              <meshStandardMaterial color="#CBD5E1" roughness={0.65} metalness={0.25} />
            </mesh>
          ))}
          {/* Biển chữ lớn TÒA NHÀ D8 hướng Đông sang Hồ Tiền & Thư viện */}
          <LabelPlane
            textureKey={`bldg-sign-east-high-${b.code}`}
            canvasW={384}
            canvasH={144}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#991B1B';
              ctx.fillRect(0, 0, w, h);
              ctx.strokeStyle = '#FACC15';
              ctx.lineWidth = 7;
              ctx.strokeRect(6, 6, w - 12, h - 12);
              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '800 54px "Be Vietnam Pro", Arial, sans-serif';
              ctx.fillText(`TÒA ${b.code}`, w / 2, h / 2 + 2);
            }}
            size={[2.6, 0.98]}
            position={[b.w / 2 + 0.08, -1.6, 0]}
            rotation={[0, Math.PI / 2, 0]}
            transparent={false}
          />
        </group>
      )}
      {/* Ống thoát nước mưa & dàn nóng điều hòa ở đầu hồi giúp khối nhà chân thực */}
      {[-b.w / 2 + 0.6, b.w / 2 - 0.6].map((pipeX, idx) => (
        <mesh key={`pipe-${idx}`} position={[pipeX, b.h / 2, -b.d / 2 - 0.04]}>
          <cylinderGeometry args={[0.04, 0.04, b.h - 0.2, 6]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      {[1, 2].map((fl) => (
        <mesh key={`ac-${fl}`} position={[b.w / 2 + 0.18, fl * floorH + 0.8, 0]} castShadow>
          <boxGeometry args={[0.32, 0.52, 0.72]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
        </mesh>
      ))}

      {/* Mặt chính: sảnh tầng 1 + dải hành lang & lan can đỏ HUST + hệ cửa sổ 3D + biển tên tòa */}
      <group position={[faceOffset[0], 0, faceOffset[2]]} rotation-y={faceRotY}>
        {/* Mái hiên cửa chính tầng 1 & bậc tam cấp */}
        <mesh position={[0, floorH * 0.88, 0.48]} castShadow>
          <boxGeometry args={[3.4, 0.2, 0.95]} />
          <meshStandardMaterial color={WINDOW_FRAME} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.12, 0.42]} receiveShadow>
          <boxGeometry args={[3.2, 0.24, 0.85]} />
          <meshStandardMaterial color="#9E9B93" map={pbr?.granite.map} roughness={0.9} />
        </mesh>

        {upperFloors.map((fl) => (
          <group key={`rail-${fl}`} position={[0, fl * floorH, 0]}>
            <mesh position={[0, -0.08, 0.05]}>
              <boxGeometry args={[along - 0.4, 0.18, 0.14]} />
              <meshStandardMaterial color={WINDOW_FRAME} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.42, 0.08]}>
              <boxGeometry args={[along - 0.6, 0.12, 0.06]} />
              <meshStandardMaterial color={isHighRise ? '#475569' : HUST_RAIL_RED} roughness={0.55} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0.72, 0.08]}>
              <boxGeometry args={[along - 0.6, 0.06, 0.06]} />
              <meshStandardMaterial color={isHighRise ? '#991B1B' : HUST_RAIL_RED} roughness={0.55} metalness={0.25} />
            </mesh>
          </group>
        ))}

        {/* Cửa sổ 3D các tầng phía sau thanh lan can */}
        <WindowGrid3D
          position={[0, 0, 0.03]}
          colXs={winColXs}
          rowYs={winRowYs}
          winW={1.36}
          winH={1.12}
          frameColor={WINDOW_FRAME}
          sillColor="#CBD5E1"
          glassColor={WINDOW_TONE}
          isNight={isNight}
          seedOffset={b.code.charCodeAt(0) + 251}
          withRainHood={false}
        />

        {/* Biển tên giảng đường gắn gần cổ mái */}
        <LabelPlane
          textureKey={`bldg-sign-${b.code}`}
          canvasW={384}
          canvasH={128}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#B81D24';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#F5C518';
            ctx.lineWidth = 8;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '700 56px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
            ctx.fillText(`NHÀ ${b.code}`, w / 2, h / 2 + 2);
          }}
          size={[isHighRise ? 2.6 : 2.1, isHighRise ? 0.9 : 0.75]}
          position={[-along / 2 + 1.8, b.h - 0.75, 0.14]}
          transparent={false}
        />
      </group>

      {/* Mặt sau: dải gờ tầng + hệ cửa sổ 3D có bệ đá & ô văng che mưa */}
      <group position={[-faceOffset[0], 0, -faceOffset[2]]} rotation-y={faceRotY + Math.PI}>
        {upperFloors.map((fl) => (
          <mesh key={`back-ledge-${fl}`} position={[0, fl * floorH - 0.06, 0.03]}>
            <boxGeometry args={[along - 0.4, 0.14, 0.08]} />
            <meshStandardMaterial color={WINDOW_FRAME} roughness={0.86} />
          </mesh>
        ))}
        <WindowGrid3D
          position={[0, 0, 0]}
          colXs={winColXs}
          rowYs={winRowYs}
          winW={1.32}
          winH={1.08}
          frameColor={WINDOW_FRAME}
          sillColor="#CBD5E1"
          glassColor={WINDOW_TONE}
          isNight={isNight}
          seedOffset={b.code.charCodeAt(0) + 271}
          withAcUnits={isHighRise}
        />
      </group>

      {/* Biển phụ gắn đầu hồi Tây cho cụm D3 – D5 – D7 hướng về phía sân Thư viện Tạ Quang Bửu */}
      {(b.code === 'D3' || b.code === 'D5' || b.code === 'D7') && (
        <LabelPlane
          textureKey={`bldg-sign-west-${b.code}`}
          canvasW={384}
          canvasH={128}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#B81D24';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#F5C518';
            ctx.lineWidth = 8;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '700 56px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
            ctx.fillText(`NHÀ ${b.code}`, w / 2, h / 2 + 2);
          }}
          size={[1.95, 0.7]}
          position={[-b.w / 2 - 0.06, b.h - 0.75, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          transparent={false}
        />
      )}
    </group>
  );
}

// --- Cây nền quanh khuôn viên (đồng bộ 100% với CAMPUS_SHADE_TREES trong lib/campus.ts để có collider thân cây) ---
const BACKGROUND_TREES: Array<{ x: number; z: number; trunkH: number; canopyR: number }> =
  CAMPUS_SHADE_TREES.map((t, idx) => ({
    x: t.x,
    z: t.z,
    trunkH: 2.5 + (idx % 4) * 0.16,
    canopyR: 1.5 + (idx % 4) * 0.1,
  }));

// --- Đèn đường mảnh dọc tuyến trục chính (ngoài mép đường ≥ 1 m) ----------------
const LAMPS: Array<{ x: number; z: number }> = [
  // Dọc trục chính Parabol – Trần Đại Nghĩa (z = -6), phía bắc vỉa hè (z = -11.3, ngoài biên đại lộ)
  { x: -34, z: -11.3 }, { x: -8, z: -11.3 }, { x: 18, z: -11.3 },
  { x: 36, z: -11.3 }, { x: 48, z: -11.3 },
  // Dọc đường ven hồ phía đông (mép đường x = 27), ngoài bờ kè.
  { x: 28, z: 14 }, { x: 28, z: 36 }, { x: 28, z: 60 }, { x: 28, z: 82 },
];

function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.6, 8]} />
        <meshStandardMaterial color={LAMP_POLE} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.65, 0]}>
        <sphereGeometry args={[0.16, 12, 8]} />
        <meshStandardMaterial color={LAMP_HEAD} roughness={0.4} emissive="#FFE9A8" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

// --- Ghế bổ sung (ngoài đường đi) --------------------------------------------
function BgBench({ x, z, rotationY = 0 }: { x: number; z: number; rotationY?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.55]} />
        <meshStandardMaterial color={BENCH_WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.78, -0.24]} castShadow>
        <boxGeometry args={[1.8, 0.55, 0.1]} />
        <meshStandardMaterial color={BENCH_WOOD} roughness={0.9} />
      </mesh>
      {[-0.8, 0.8].map((dx) => (
        <mesh key={dx} position={[dx, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.5]} />
          <meshStandardMaterial color={BENCH_IRON} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// --- Biển chỉ dẫn nội khu Bách khoa (Campus Direction Signpost) ---------------
function CampusSignpost({ x, z, rotationY = 0 }: { x: number; z: number; rotationY?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 2.5, 10]} />
        <meshStandardMaterial color="#2C353D" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[1.55, 0.68, 0.06]} />
        <meshStandardMaterial color="#1A3A5C" roughness={0.6} />
      </mesh>
      <LabelPlane
        textureKey="campus-dir-sign"
        canvasW={512}
        canvasH={224}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#183B5E';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFD166';
          ctx.font = '700 27px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('SƠ ĐỒ CHỈ DẪN HUST', 24, 42);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 25px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('▲ Nhà C1 · Cầu đỏ C9', 24, 92);
          ctx.fillText('▶ Thư viện TQB · Hồ Tiền', 24, 138);
          ctx.fillText('◀ Cổng Parabol (Giải Phóng)', 24, 184);
        }}
        size={[1.48, 0.62]}
        position={[0, 2.1, 0.042]}
        transparent={false}
      />
    </group>
  );
}

let sharedParkedScooterShellGeo: THREE.BufferGeometry | null = null;
function getParkedScooterShellGeometry(): THREE.BufferGeometry | null {
  if (typeof document === 'undefined') return null;
  if (sharedParkedScooterShellGeo) return sharedParkedScooterShellGeo;
  const s = new THREE.Shape();
  s.moveTo(-0.56, 0.34);
  s.quadraticCurveTo(-0.46, 0.62, -0.34, 0.72);
  s.quadraticCurveTo(-0.24, 0.78, -0.22, 0.68);
  s.quadraticCurveTo(-0.18, 0.38, -0.02, 0.36);
  s.lineTo(0.14, 0.36);
  s.quadraticCurveTo(0.24, 0.56, 0.52, 0.58);
  s.quadraticCurveTo(0.58, 0.52, 0.54, 0.4);
  s.lineTo(0.2, 0.24);
  s.lineTo(-0.24, 0.22);
  s.quadraticCurveTo(-0.44, 0.24, -0.56, 0.34);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.024,
    bevelSegments: 2,
    curveSegments: 10,
  });
  g.translate(0, 0, -0.14);
  g.rotateY(-Math.PI / 2);
  sharedParkedScooterShellGeo = g;
  return sharedParkedScooterShellGeo;
}

// --- Điểm trông giữ xe D4-6-8 mở rộng có mái che tôn xanh + dãy xe máy sinh viên (chuẩn https://hustmap.com/) ----
function BikeParkingShed() {
  const { center, size } = BIKE_PARKING_SHED;
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
  const scooterShellGeo = useMemo(() => getParkedScooterShellGeometry(), []);
  return (
    <group position={[center.x, 0, center.z]}>
      {/* Nền bê tông nhà xe 14.8 × 5.0 m */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[size.x, 0.06, size.z]} />
        <meshStandardMaterial color="#9E9E98" roughness={0.95} />
      </mesh>
      {/* 8 cột thép đỡ mái + xà gồ ngang */}
      {[-6.6, -2.2, 2.2, 6.6].map((px) =>
        [-2.1, 2.1].map((pz) => (
          <mesh key={`shed-col-${px}-${pz}`} position={[px, 1.35, pz]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 2.7, 8]} />
            <meshStandardMaterial color="#3F474E" roughness={0.5} metalness={0.5} />
          </mesh>
        )),
      )}
      {[-6.6, -2.2, 2.2, 6.6].map((px) => (
        <mesh key={`shed-beam-${px}`} position={[px, 2.64, 0]} rotation={[0.06, 0, 0]}>
          <boxGeometry args={[0.08, 0.1, size.z - 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {/* Mái tôn xanh dương gợn sóng PBR chuẩn nhà xe sinh viên Bách Khoa */}
      <mesh position={[0, 2.74, 0]} rotation={[0.06, 0, 0]} castShadow>
        <boxGeometry args={[size.x + 0.6, 0.12, size.z + 0.6]} />
        <meshStandardMaterial
          color="#2E6B9E"
          bumpMap={pbr?.ribbedMetalBump}
          bumpScale={0.025}
          roughness={0.48}
          metalness={0.38}
        />
      </mesh>
      {/* Dãy xe máy tay ga 3D bo cong đỗ gọn trong nhà xe D4-6-8 */}
      {[-5.4, -3.8, -2.2, -0.6, 1.0, 2.6, 4.2, 5.6].map((mx, idx) => {
        const colors = ['#1E293B', '#991B1B', '#1D4ED8', '#F8FAFC', '#0F766E'];
        const col = colors[idx % colors.length];
        return (
          <group
            key={`d468-moto-${idx}`}
            position={[mx, 0, idx % 2 === 0 ? -0.9 : 0.9]}
            rotation-z={0.06}
          >
            {/* Lốp trước & sau + vành đúc */}
            {[-0.44, 0.44].map((wz, wi) => (
              <group key={`w-${wi}`} position={[0, 0.22, wz]}>
                <mesh rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.17, 0.052, 8, 14]} />
                  <meshStandardMaterial color="#18181B" roughness={0.85} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.05, 10]} />
                  <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.65} />
                </mesh>
              </group>
            ))}
            {/* Chắn bùn trước cong ôm bánh */}
            <mesh position={[0, 0.34, -0.44]} rotation={[Math.PI * 0.2, 0, 0]}>
              <cylinderGeometry args={[0.21, 0.21, 0.12, 10, 1, true, -Math.PI * 0.38, Math.PI * 0.76]} />
              <meshStandardMaterial color={col} roughness={0.32} metalness={0.45} side={THREE.DoubleSide} />
            </mesh>
            {/* Thân vỏ ExtrudeGeometry bo cong khí động học */}
            {scooterShellGeo && (
              <mesh geometry={scooterShellGeo} castShadow>
                <meshStandardMaterial color={col} roughness={0.28} metalness={0.5} envMapIntensity={1.2} />
              </mesh>
            )}
            {/* Yên 2 tầng da đen */}
            <mesh position={[0, 0.59, 0.2]} rotation={[0.08, 0, 0]}>
              <capsuleGeometry args={[0.11, 0.36, 4, 8]} />
              <meshStandardMaterial color="#1E293B" roughness={0.8} />
            </mesh>
            {/* Tay lái + 2 gương tròn + cụm đồng hồ */}
            <mesh position={[0, 0.78, -0.28]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.02, 0.02, 0.46, 8]} />
              <meshStandardMaterial color="#1E293B" roughness={0.45} metalness={0.55} />
            </mesh>
            {[-0.2, 0.2].map((gx) => (
              <group key={`m-${gx}`} position={[gx, 0.85, -0.28]}>
                <mesh rotation-z={gx > 0 ? -0.25 : 0.25}>
                  <cylinderGeometry args={[0.008, 0.008, 0.12, 6]} />
                  <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[gx > 0 ? 0.02 : -0.02, 0.07, 0]}>
                  <cylinderGeometry args={[0.038, 0.038, 0.015, 10]} />
                  <meshStandardMaterial color="#E2E8F0" metalness={0.75} roughness={0.2} />
                </mesh>
              </group>
            ))}
            {/* Pô xe mạ & biển số trắng phía sau */}
            <mesh position={[0.14, 0.25, 0.32]} rotation-x={Math.PI / 2 - 0.12}>
              <cylinderGeometry args={[0.036, 0.04, 0.42, 8]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.75} roughness={0.28} />
            </mesh>
            <mesh position={[0, 0.46, 0.56]} rotation-x={0.22}>
              <boxGeometry args={[0.14, 0.1, 0.015]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
            </mesh>
            {/* Chân chống nghiêng */}
            <mesh position={[-0.08, 0.12, 0.05]} rotation-z={0.35}>
              <cylinderGeometry args={[0.01, 0.01, 0.24, 6]} />
              <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
      {/* Biển "ĐIỂM TRÔNG GIỮ XE D4-6-8" 2 mặt Bắc & Nam có hộp nền (không bị ngược chữ) */}
      {[
        { bz: -size.z / 2 - 0.28, lz: -size.z / 2 - 0.33, rotY: Math.PI },
        { bz: size.z / 2 + 0.28, lz: size.z / 2 + 0.33, rotY: 0 },
      ].map((side, sIdx) => (
        <group key={`d468-sign-side-${sIdx}`}>
          <mesh position={[0, 2.52, side.bz]} castShadow>
            <boxGeometry args={[4.88, 0.84, 0.06]} />
            <meshStandardMaterial color="#C81E24" roughness={0.6} />
          </mesh>
          <LabelPlane
            textureKey="bike-shed-sign-d468-v2"
            canvasW={640}
            canvasH={112}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#C81E24';
              ctx.fillRect(0, 0, w, h);
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 6;
              ctx.strokeRect(6, 6, w - 12, h - 12);
              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '800 34px "Be Vietnam Pro", Arial, sans-serif';
              ctx.fillText('ĐIỂM TRÔNG GIỮ XE D4-6-8 · 停车场', w / 2, h / 2);
            }}
            size={[4.8, 0.78]}
            position={[0, 2.52, side.lz]}
            rotation={[0, side.rotY, 0]}
            transparent={false}
          />
        </group>
      ))}
    </group>
  );
}

export default function BackgroundBuildings({ timeOfDay = 'day' }: { timeOfDay?: 'day' | 'sunset' | 'night' }) {
  const isNight = (timeOfDay ?? playerState.timeOfDay) !== 'day';
  return (
    <group>
      {LECTURE_BUILDINGS.map((b, i) => (
        <BackgroundBuilding key={`bg-building-${i}`} b={b} isNight={isNight} />
      ))}
      <D4ForeignLanguagesBuilding isNight={isNight} />
      <LectureSkybridges isNight={isNight} />
      {BACKGROUND_TREES.map((t, i) => (
        <ImprovedTree
          key={`bg-tree-${i}`}
          x={t.x}
          z={t.z}
          trunkH={t.trunkH}
          canopyR={t.canopyR}
          canopyY={t.trunkH + 0.9}
        />
      ))}
      {LAMPS.map((l, i) => (
        <Lamp key={`lamp-${i}`} x={l.x} z={l.z} />
      ))}
      <CampusSignpost x={-52.5} z={-1.2} rotationY={Math.PI} />
      <CampusSignpost x={19.5} z={-10.8} rotationY={0} />
      <BikeParkingShed />
      <BgBench x={-27.5} z={48} rotationY={Math.PI / 2} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// ĐỐI CHIẾU VỊ TRÍ (lib/campus.ts) — để luồng tích hợp / leg-sim kiểm lại:
// - Khối nhà phụ: không khối nào nằm trên ROADS hay trong BUILDING_COLLIDERS;
//   khối gần nhất với đường là E1 (64,-2): cách đường tình yêu (60,-16)-(92,-6)
//   ~8,7 m theo trục Z; khối bắc cách đường C1-Thư viện > 40 m.
// - Cây nền: hàng bắc z=-62 cách C1 (x≤-34) ≥ 6 m về phía đông, cách mặt
//   nam 3 khối nhà bắc (z -65,5..-67,5) 3,5-5,5 m về phía nam — đứng
//   TRƯỚC nhà, không chạm footprint nào, không chắn đường đi; hàng đông
//   x=88 cách thư viện (x≤50) 38 m; hàng nam z=80 cách hồ (z≤84,6,
//   nhưng x ngoài -24,5..20,5) — cây (-32,80)/(-44,80) cách mép tây hồ 7,5 m;
//   hàng tây x=-92 cách chân cổng Parabol (x≥-89,2) 2,8 m theo trục X nhưng
//   z=-60..-36/36..72 đều ngoài khoảng z của cổng (3,5..16,5).
//   LÝ DO DỜI HÀNG BẮC (đợt r2p-A mục 1, tự quyết theo hình học — xem
//   PROGRESS.md): hàng cũ z=-72,5 nằm TRONG dải z của 3 khối nhà bắc
//   (z -74,5..-65,5) mà tán chỉ cao ~4,8-5,9 m, thấp hơn nhà (6-8 m) nên
//   từ sân nhìn ra, cây nào đứng sau nhà là bị che kín; 5 cây phía tây
//   (x -88..-40) còn bị C1 (cao > 13 m, x -82..-34, z -63..-49) che thêm
//   một lớp — ảnh r2-round2-bg-trees-north.png chỉ thấy nhà, không thấy
//   cây nào. Phương án (b) nhét cây vào khe giữa các nhà bị loại: chỉ có
//   2 khe (x -1..8 rộng 9 m, x 20..26 rộng 6 m), cây vẫn nằm sau tuyến
//   nhà, chỉ nhìn thấy qua khe hẹp. Phương án (c) hạ chiều cao nhà bắc bị
//   loại: nhà 4 m đọc thành lán thấp kề bên C1 4 tầng, tán cây vẫn bị che
//   một nửa. Phương án (a) ĐÃ CHỌN: dời cả hàng ra z=-62 — phía trước
//   (nam) mặt nam các khối nhà bắc, phía đông C1 (x≥-28 > -34, ngoài
//   footprint C1; không chạm đường C1–Thư viện x=24 hay đường tình yêu
//   z=-16) — nhìn từ đường tình yêu/sân C1 thấy đủ 10 cây đứng trước nhà.
// - Đèn đường tình yêu z=-19,8: mép đường z=-18,5, cách 1,3 m; đèn ven hồ
//   x=28: mép đường x=27, cách 1 m. Ghế (16,-10,8): mép đường z=-13,5, cách
//   2,7 m. Ghế (-27,5,45) trùng tuyến ghế hồ hiện có (x=-27,5).
// - Không vật nào có collider mới: leg-sim chỉ đọc lib/campus.ts nên 4/4
//   không đổi vì file này; kiểm chứng bằng mắt + ảnh là chính.
// ---------------------------------------------------------------------------
