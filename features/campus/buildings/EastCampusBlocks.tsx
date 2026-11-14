// ---------------------------------------------------------------------------
// features/campus/buildings/EastCampusBlocks.tsx — Nhà B1 (Trường CNTT & TT — SoICT)
// & Cụm Nhà ăn A1-5, Nhà A17, Nhà E và Nhà T theo đúng Bản đồ Số https://hustmap.com/
// Module IDs: building.b1-soict, building.east-blocks
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { EAST_CAMPUS_BLOCKS, SOICT_B1 } from '../world-data';
import { ExtrudedText3D } from '../../../components/three/Signage3D';
import { CANVAS_VN_FONT, LabelPlane } from '../../../components/three/TextPlate';
import { RoofSoffitAndPlinth, WindowGrid3D } from '../../../components/three/ArchitecturalWindowBand';
import { getSharedBuildingPbrTextures } from '../../../components/three/materials';
import { ImprovedTree } from '../../../components/three/Trees';
import { FacultyParkedCar } from './C6C7C8Cluster';
import { SimpleBench } from '../landscape/C1SquareLandmarks';
import { BlueParkingSignPost, ParkedMotorbike } from '../landscape/CampusParkingAndAnnexes';

const GLASS_DARK = '#27445C';

/**
 * Sân trước & Bãi xe Nhà B1 (SoICT) trong tọa độ thế giới (B1_FORECOURT_PLAZA: x = 99..132, z = -2.8..14.5).
 * Gồm thảm cỏ bán nguyệt giữa sân, sân quay xe trước sảnh Rotunda, Nhà xe B1 phía Tây,
 * làn đỗ xe ô tô giảng viên phía Đông, hàng ghế đá, đèn sân trước và cây bóng mát góc sân.
 */
function SoictB1Forecourt({ isNight }: { isNight: boolean }) {
  const b1Bikes: Array<{ x: number; z: number; yaw: number; color: string }> = [
    { x: 101.8, z: 3.1, yaw: Math.PI / 2, color: '#DC2626' },
    { x: 101.8, z: 4.5, yaw: Math.PI / 2, color: '#0F172A' },
    { x: 101.8, z: 5.9, yaw: Math.PI / 2, color: '#2563EB' },
    { x: 104.2, z: 3.8, yaw: -Math.PI / 2, color: '#F8FAFC' },
    { x: 104.2, z: 6.8, yaw: -Math.PI / 2, color: '#475569' },
  ];

  const lamps: Array<[number, number]> = [
    [108.2, 0.2],
    [122.8, 0.2],
    [108.2, 11.4],
    [122.8, 11.4],
  ];

  return (
    <group>
      {/* Mảng đá lát sân quay xe trước sảnh Rotunda (y = 0.024 > mặt plaza 0.015 tránh Z-fighting) */}
      <mesh position={[115.5, 0.024, 6.2]} receiveShadow>
        <cylinderGeometry args={[8.6, 8.6, 0.012, 32]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.86} />
      </mesh>
      <mesh position={[115.5, 0.026, 0.6]} receiveShadow>
        <boxGeometry args={[6.4, 0.012, 6.2]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.86} />
      </mesh>

      {/* Thảm cỏ bán nguyệt / elip trước sảnh B1 tại (115.5, 5.8) */}
      <group position={[115.5, 0, 5.8]}>
        <mesh position={[0, 0.14, 0]} scale={[4.2, 1, 1.8]} receiveShadow castShadow>
          <cylinderGeometry args={[1, 1.03, 0.28, 32]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.84} />
        </mesh>
        <mesh position={[0, 0.295, 0]} scale={[3.9, 1, 1.54]} receiveShadow>
          <cylinderGeometry args={[1, 1, 0.04, 32]} />
          <meshStandardMaterial color="#4D8B45" roughness={0.94} />
        </mesh>
        {[-2.2, -1.0, 0, 1.0, 2.2].map((bx, idx) => (
          <mesh
            key={`b1-lawn-shrub-${idx}`}
            position={[bx, idx === 2 ? 0.66 : 0.56, idx === 2 ? 0 : idx % 2 === 0 ? 0.42 : -0.42]}
            castShadow
          >
            <sphereGeometry args={[idx === 2 ? 0.58 : 0.44, 10, 8]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#2E6F34' : '#3B8242'} roughness={0.9} />
          </mesh>
        ))}
        {/* Bục đá khắc bảng hiệu "SOICT · HUST" trước bồn cỏ */}
        <mesh position={[0, 0.36, -1.42]} rotation={[-0.22, 0, 0]} castShadow>
          <boxGeometry args={[2.1, 0.52, 0.28]} />
          <meshStandardMaterial color="#475569" roughness={0.82} />
        </mesh>
        <LabelPlane
          textureKey="soict-b1-lawn-plaque-v1"
          canvasW={512}
          canvasH={128}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#0F295C';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#93C5FD';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `700 42px ${CANVAS_VN_FONT}`;
            ctx.fillText('SOICT · NHÀ B1', w / 2, h / 2);
          }}
          size={[1.85, 0.42]}
          position={[0, 0.39, -1.59]}
          rotation={[0.22, Math.PI, 0]}
          transparent={false}
        />
      </group>

      {/* Nhà xe B1 (mái tôn vòm xanh + khung cột thép + xe máy đỗ gọn gàng ở cánh Tây x = 100.4..105.8, z = 1.8..9.2) */}
      <group>
        <mesh position={[103.1, 0.032, 5.5]} receiveShadow>
          <boxGeometry args={[5.4, 0.04, 7.4]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.9} />
        </mesh>
        {[100.65, 105.55].map((px) =>
          [2.1, 4.35, 6.6, 8.85].map((pz) => (
            <mesh key={`b1-shed-col-${px}-${pz}`} position={[px, 1.32, pz]} castShadow>
              <cylinderGeometry args={[0.075, 0.085, 2.64, 10]} />
              <meshStandardMaterial color="#334155" roughness={0.55} metalness={0.5} />
            </mesh>
          )),
        )}
        <mesh position={[103.1, 2.68, 5.5]} rotation={[0, 0, 0.08]} castShadow>
          <boxGeometry args={[5.75, 0.12, 7.65]} />
          <meshStandardMaterial color="#1E40AF" roughness={0.52} metalness={0.28} />
        </mesh>
        {b1Bikes.map((bike, bIdx) => (
          <ParkedMotorbike key={`b1-shed-bike-${bIdx}`} x={bike.x} z={bike.z} yaw={bike.yaw} color={bike.color} />
        ))}
        <BlueParkingSignPost
          x={106.2}
          z={1.8}
          rotY={Math.PI}
          textureKey="parking-sign-b1-shed-v1"
          title="NHÀ XE NHÀ B1"
          subtitle="SINH VIÊN SoICT"
        />
      </group>

      {/* 2 ô tô giảng viên & vạch kẻ ô đỗ ở cánh Đông sân B1 (x = 126..130.5, z = 2.7..8.1) */}
      {[3.6, 7.2].map((bz, idx) => (
        <group key={`b1-car-bay-${idx}`} position={[128.2, 0.026, bz]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0, -0.96]}>
            <planeGeometry args={[4.4, 0.08]} />
            <meshBasicMaterial color="#F8FAFC" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0.96]}>
            <planeGeometry args={[4.4, 0.08]} />
            <meshBasicMaterial color="#F8FAFC" />
          </mesh>
        </group>
      ))}
      <FacultyParkedCar
        x={128.2}
        z={3.6}
        yaw={-Math.PI / 2}
        color="#F8FAFC"
        kind="suv"
        plate="30H-812.09"
        isNight={isNight}
      />
      <FacultyParkedCar
        x={128.2}
        z={7.2}
        yaw={-Math.PI / 2}
        color="#1E3A5F"
        kind="sedan"
        plate="30A-509.64"
        isNight={isNight}
      />

      {/* Ghế đá sân trước Nhà B1 */}
      <SimpleBench x={107.8} z={10.6} rotationY={Math.PI} />
      <SimpleBench x={123.2} z={10.6} rotationY={Math.PI} />

      {/* 4 cột đèn sân trước B1 */}
      {lamps.map(([lx, lz], lIdx) => (
        <group key={`b1-lamp-${lIdx}`} position={[lx, 0, lz]}>
          <mesh position={[0, 1.85, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.08, 3.7, 10]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.55} />
          </mesh>
          <mesh position={[0, 3.76, 0]}>
            <cylinderGeometry args={[0.22, 0.14, 0.24, 12]} />
            <meshStandardMaterial
              color={isNight ? '#FEF3C7' : '#E2E8F0'}
              emissive={isNight ? '#FDE68A' : '#000000'}
              emissiveIntensity={isNight ? 0.9 : 0}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}

      {/* 2 cây bóng mát góc Bắc sân trước B1 (không đâm vào mặt tiền hay lộ trình người đi bộ) */}
      <ImprovedTree x={101.2} z={-0.8} trunkH={2.8} canopyR={2.35} withTreePit />
      <ImprovedTree x={129.8} z={-0.8} trunkH={2.8} canopyR={2.35} withTreePit />
    </group>
  );
}

export function SoictB1Building({ isNight }: { isNight: boolean }) {
  const { center, floorHeight } = SOICT_B1;
  const h7 = 7 * floorHeight; // 22.4 m (cánh trái + trụ góc tròn 7 tầng)
  const h8 = 8 * floorHeight; // 25.6 m (khối tháp phải 8 tầng mang biển B1 xanh dương)
  const h5 = 5 * floorHeight; // 16.0 m (khối giật cấp phía trước 5 tầng)
  const basePlinthH = 2 * floorHeight; // 6.4 m (2 tầng đế sơn trắng sáng đồng bộ toàn tòa B1)
  const B1_PLINTH_WHITE = '#F8FAFC';
  const B1_WHITE = '#FFFFFF';
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);

  // Xoay 180° (Math.PI) để mặt tiền sảnh tròn (Rotunda), bồn cỏ bán nguyệt và biển "B1"
  // hướng về phía Bắc (-Z, nhìn ra Sân trước Nhà B1 và trục đường chính Cổng Trần Đại Nghĩa)
  return (
    <>
      <SoictB1Forecourt isNight={isNight} />
      <group position={[center.x, 0, center.z]} rotation-y={Math.PI}>
        {/* ============ 1. CÁNH TRÁI 7 TẦNG (15.2m × 7.4m, TỔNG THỂ B1 RỘNG 33m × 17m) ============ */}
        <group position={[-8.2, 0, -1.5]} rotation-y={0.22}>
          <RoofSoffitAndPlinth
            w={15.2}
            d={7.4}
            height={h7}
            plinthH={0.48}
            graniteMap={pbr?.granite.map}
            graniteBump={pbr?.granite.bumpMap}
          />
          {/* Tầng 1-2 khối đế sơn trắng sáng + gờ phân tầng */}
          <mesh position={[0, basePlinthH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[15.2, basePlinthH, 7.4]} />
            <meshStandardMaterial
              color={B1_PLINTH_WHITE}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, basePlinthH, 0]}>
            <boxGeometry args={[15.36, 0.18, 7.56]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
          </mesh>
          {/* Tầng 3-7 sơn trắng tinh khiết */}
          <mesh position={[0, (basePlinthH + h7) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[15.08, h7 - basePlinthH, 7.28]} />
            <meshStandardMaterial
              color={B1_WHITE}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.82}
            />
          </mesh>
          <mesh position={[0, h7 + 0.24, 0]} castShadow>
            <boxGeometry args={[15.48, 0.48, 7.68]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
          </mesh>
          {/* Hệ cửa sổ 3D mặt trước & mặt sau khối đế tầng 1-2 và thân tầng 3-7 */}
          <WindowGrid3D
            position={[0, 0, 3.7]}
            colXs={[-5.7, -3.4, -1.1, 1.1, 3.4, 5.7]}
            rowYs={[0, 1].map((fl) => fl * floorHeight + 1.65)}
            winW={1.48}
            winH={1.24}
            frameColor="#1E293B"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={11}
          />
          <WindowGrid3D
            position={[0, 0, 3.64]}
            colXs={[-5.7, -3.4, -1.1, 1.1, 3.4, 5.7]}
            rowYs={[2, 3, 4, 5, 6].map((fl) => fl * floorHeight + 1.65)}
            winW={1.48}
            winH={1.24}
            frameColor="#1E293B"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={13}
          />
          <WindowGrid3D
            position={[0, 0, -3.7]}
            rotation={[0, Math.PI, 0]}
            colXs={[-5.7, -3.4, -1.1, 1.1, 3.4, 5.7]}
            rowYs={[0, 1].map((fl) => fl * floorHeight + 1.65)}
            winW={1.48}
            winH={1.24}
            frameColor="#1E293B"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={15}
          />
          <WindowGrid3D
            position={[0, 0, -3.64]}
            rotation={[0, Math.PI, 0]}
            colXs={[-5.7, -3.4, -1.1, 1.1, 3.4, 5.7]}
            rowYs={[2, 3, 4, 5, 6].map((fl) => fl * floorHeight + 1.65)}
            winW={1.48}
            winH={1.24}
            frameColor="#1E293B"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={17}
          />
        </group>

        {/* ============ 2. CÁNH PHẢI 8 TẦNG GIẬT CẤP XUỐNG 5 TẦNG + BIỂN CHỮ "B1" XANH DƯƠNG ============ */}
        <group position={[7.4, 0, -2.0]} rotation-y={-0.18}>
          {/* Chân đế & khối cao 8 tầng phía sau màu trắng (16.2m × 7.4m) */}
          <group position={[0, 0, -0.8]}>
            <RoofSoffitAndPlinth
              w={16.2}
              d={7.4}
              height={h8}
              plinthH={0.48}
              graniteMap={pbr?.granite.map}
              graniteBump={pbr?.granite.bumpMap}
            />
            <mesh position={[0, h8 / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[16.2, h8, 7.4]} />
              <meshStandardMaterial
                color={B1_WHITE}
                map={pbr?.plaster.map}
                bumpMap={pbr?.plaster.bumpMap}
                bumpScale={0.012}
                roughness={0.82}
              />
            </mesh>
            <mesh position={[0, h8 + 0.24, 0]} castShadow>
              <boxGeometry args={[16.6, 0.48, 7.8]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
            </mesh>
            {/* Tum thang máy & lan can kỹ thuật trên mái 8 tầng */}
            <mesh position={[2.8, h8 + 1.18, 0]} castShadow>
              <boxGeometry args={[4.4, 1.56, 3.4]} />
              <meshStandardMaterial
                color="#F1F5F9"
                map={pbr?.plaster.map}
                bumpMap={pbr?.plaster.bumpMap}
                bumpScale={0.01}
                roughness={0.82}
              />
            </mesh>
            <mesh position={[2.8, h8 + 2.04, 0]} castShadow>
              <boxGeometry args={[4.75, 0.2, 3.75]} />
              <meshStandardMaterial color="#CBD5E1" roughness={0.78} />
            </mesh>
            {/* Cửa sổ mặt sau khối 8 tầng */}
            <WindowGrid3D
              position={[0, 0, -3.7]}
              rotation={[0, Math.PI, 0]}
              colXs={[-5.7, -3.4, -1.1, 1.1, 3.4, 5.7]}
              rowYs={[0, 1, 2, 3, 4, 5, 6, 7].map((fl) => fl * floorHeight + 1.65)}
              winW={1.48}
              winH={1.24}
              frameColor="#1E293B"
              sillColor="#E2E8F0"
              isNight={isNight}
              seedOffset={23}
            />
            {/* Cửa sổ tầng 6-7 đầy đủ & tầng 8 chừa khoang trái cho biển chữ nổi B1 */}
            <WindowGrid3D
              position={[0, 0, 3.7]}
              colXs={[-5.7, -3.4, -1.1, 1.1, 3.4, 5.7]}
              rowYs={[5, 6].map((fl) => fl * floorHeight + 1.65)}
              winW={1.48}
              winH={1.24}
              frameColor="#1E293B"
              sillColor="#E2E8F0"
              isNight={isNight}
              seedOffset={41}
            />
            <WindowGrid3D
              position={[0, 0, 3.7]}
              colXs={[-1.1, 1.1, 3.4, 5.7]}
              rowYs={[7 * floorHeight + 1.65]}
              winW={1.48}
              winH={1.24}
              frameColor="#1E293B"
              sillColor="#E2E8F0"
              isNight={isNight}
              seedOffset={43}
            />
            {/* Biển chữ nổi 3D khối đặc "B1" màu xanh dương đậm (#1D4E9E) trên đỉnh cánh 8 tầng */}
            <ExtrudedText3D
              text="B1"
              size={[3.1, 1.85]}
              depth={0.22}
              position={[-4.5, h8 - 1.65, 3.92]}
              frontColor="#1D4E9E"
              frontHighlightColor="#3B82F6"
              sideColor="#0F295C"
              metalness={0.48}
              roughness={0.32}
              emissive="#1E40AF"
              emissiveIntensity={isNight ? 0.35 : 0.08}
            />
          </group>

          {/* Khối giật cấp 5 tầng nhô ra phía trước sơn trắng đồng bộ (13.8m × 5.4m) */}
          <group position={[0.4, 0, 3.0]}>
            <RoofSoffitAndPlinth
              w={13.8}
              d={5.4}
              height={h5}
              plinthH={0.48}
              graniteMap={pbr?.granite.map}
              graniteBump={pbr?.granite.bumpMap}
            />
            <mesh position={[0, basePlinthH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[13.8, basePlinthH, 5.4]} />
              <meshStandardMaterial
                color={B1_PLINTH_WHITE}
                map={pbr?.plaster.map}
                bumpMap={pbr?.plaster.bumpMap}
                bumpScale={0.012}
                roughness={0.8}
              />
            </mesh>
            <mesh position={[0, basePlinthH, 0]}>
              <boxGeometry args={[13.96, 0.18, 5.56]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
            </mesh>
            <mesh position={[0, (basePlinthH + h5) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[13.68, h5 - basePlinthH, 5.28]} />
              <meshStandardMaterial
                color={B1_WHITE}
                map={pbr?.plaster.map}
                bumpMap={pbr?.plaster.bumpMap}
                bumpScale={0.012}
                roughness={0.82}
              />
            </mesh>
            <mesh position={[0, h5 + 0.22, 0]} castShadow>
              <boxGeometry args={[14.08, 0.44, 5.68]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
            </mesh>
            {/* Cửa sổ 3D mặt trước khối 5 tầng */}
            <WindowGrid3D
              position={[0, 0, 2.7]}
              colXs={[-4.8, -2.4, 0, 2.4, 4.8]}
              rowYs={[0, 1].map((fl) => fl * floorHeight + 1.65)}
              winW={1.44}
              winH={1.24}
              frameColor="#1E293B"
              sillColor="#E2E8F0"
              isNight={isNight}
              seedOffset={31}
            />
            <WindowGrid3D
              position={[0, 0, 2.64]}
              colXs={[-4.8, -2.4, 0, 2.4, 4.8]}
              rowYs={[2, 3, 4].map((fl) => fl * floorHeight + 1.65)}
              winW={1.44}
              winH={1.24}
              frameColor="#1E293B"
              sillColor="#E2E8F0"
              isNight={isNight}
              seedOffset={37}
            />
          </group>
        </group>

        {/* ============ 3. KHỐI TRỤ LÕI CONG 8 TẦNG & KHỐI SẢNH TRÒN ROTUNDA 3 TẦNG (r = 5.15m) ============ */}
        <group position={[-0.2, 0, -1.6]}>
          {/* Trụ góc bo tròn nối giao hai cánh chữ V */}
          <mesh position={[0, 0.24, 0]} receiveShadow>
            <cylinderGeometry args={[4.95, 4.95, 0.48, 28]} />
            <meshStandardMaterial
              color="#64748B"
              map={pbr?.granite.map}
              bumpMap={pbr?.granite.bumpMap}
              bumpScale={0.014}
              roughness={0.86}
            />
          </mesh>
          <mesh position={[0, (h8 - 0.8) / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[4.8, 4.8, h8 - 0.8, 28]} />
            <meshStandardMaterial
              color={B1_WHITE}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.8}
            />
          </mesh>
          {/* Dải kính cong ngang + vành lam chắn nắng nhôm trên trụ trung tâm */}
          {[2, 3, 4, 5, 6].map((fl) => (
            <group key={`b1-cyl-glass-${fl}`}>
              <mesh position={[0, fl * floorHeight + 1.65, 0]}>
                <cylinderGeometry args={[4.84, 4.84, 1.28, 28, 1, true, -Math.PI * 0.42, Math.PI * 0.84]} />
                <meshStandardMaterial
                  color={isNight && fl % 2 === 0 ? '#FFE4A0' : GLASS_DARK}
                  emissive={isNight && fl % 2 === 0 ? '#FFB84D' : '#000000'}
                  emissiveIntensity={isNight && fl % 2 === 0 ? 0.65 : 0}
                  roughness={0.22}
                  metalness={0.45}
                  envMapIntensity={1.25}
                  side={2}
                />
              </mesh>
              <mesh position={[0, fl * floorHeight + 2.36, 0]}>
                <cylinderGeometry args={[4.94, 4.94, 0.09, 28, 1, true, -Math.PI * 0.44, Math.PI * 0.88]} />
                <meshStandardMaterial color="#CBD5E1" roughness={0.5} metalness={0.35} side={2} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, h8 - 0.56, 0]} castShadow>
            <cylinderGeometry args={[5.05, 5.05, 0.48, 28]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
          </mesh>

          {/* Khối sảnh tròn Rotunda 3 tầng nhô ra phía Bắc (tâm thế giới (115.5, 17.5), r = 5.15m) */}
          <group position={[0.2, 0, 6.6]}>
            {/* Chân đế granite bậc thềm dưới Rotunda */}
            <mesh position={[0, 0.16, 0]} receiveShadow>
              <cylinderGeometry args={[5.35, 5.45, 0.32, 32]} />
              <meshStandardMaterial
                color="#64748B"
                map={pbr?.granite.map}
                bumpMap={pbr?.granite.bumpMap}
                bumpScale={0.014}
                roughness={0.86}
              />
            </mesh>
            {/* Tầng 1: Sảnh kính cong + hàng cột tròn trắng cao ráo */}
            <mesh position={[0, 1.85, 0]} castShadow>
              <cylinderGeometry args={[4.45, 4.45, 3.7, 32]} />
              <meshStandardMaterial color="#1E2D3B" roughness={0.2} metalness={0.5} envMapIntensity={1.25} />
            </mesh>
            {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((ang, cIdx) => (
              <mesh
                key={`b1-rotunda-col-${cIdx}`}
                position={[Math.sin(ang * 0.42) * 5.0, 1.85, Math.cos(ang * 0.42) * 5.0]}
                castShadow
              >
                <cylinderGeometry args={[0.22, 0.22, 3.7, 16]} />
                <meshStandardMaterial
                  color={B1_WHITE}
                  map={pbr?.plaster.map}
                  roughness={0.75}
                />
              </mesh>
            ))}
            {/* Mái đón sảnh cong ốp alu trắng sáng + dây giằng thép neo từ tầng 2 */}
            <mesh position={[0, 3.78, 0.72]} castShadow>
              <cylinderGeometry args={[5.95, 5.95, 0.36, 32]} />
              <meshStandardMaterial color={B1_WHITE} roughness={0.55} metalness={0.22} />
            </mesh>
            {[-2.8, 2.8].map((rx, rIdx) => (
              <mesh
                key={`b1-tie-rod-${rIdx}`}
                position={[rx, 5.15, 4.65]}
                rotation={[0.78, 0, rIdx === 0 ? -0.18 : 0.18]}
                castShadow
              >
                <cylinderGeometry args={[0.04, 0.04, 3.55, 8]} />
                <meshStandardMaterial color="#94A3B8" roughness={0.35} metalness={0.75} />
              </mesh>
            ))}
            {/* Tầng 2 của khối sảnh tròn Rotunda */}
            <mesh position={[0, 5.2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[5.15, 5.15, 2.9, 32]} />
              <meshStandardMaterial
                color={B1_PLINTH_WHITE}
                map={pbr?.plaster.map}
                bumpMap={pbr?.plaster.bumpMap}
                bumpScale={0.012}
                roughness={0.8}
              />
            </mesh>
            <mesh position={[0, 5.42, 0]}>
              <cylinderGeometry args={[5.19, 5.19, 1.05, 32, 1, true, -Math.PI * 0.46, Math.PI * 0.92]} />
              <meshStandardMaterial
                color={isNight ? '#FFE4A0' : GLASS_DARK}
                emissive={isNight ? '#FFB84D' : '#000000'}
                emissiveIntensity={isNight ? 0.55 : 0}
                roughness={0.22}
                metalness={0.45}
                side={2}
              />
            </mesh>
            {/* Tầng 3 của khối sảnh tròn Rotunda + lan can mái */}
            <mesh position={[0, 8.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[5.15, 5.15, 2.9, 32]} />
              <meshStandardMaterial
                color={B1_WHITE}
                map={pbr?.plaster.map}
                bumpMap={pbr?.plaster.bumpMap}
                bumpScale={0.012}
                roughness={0.82}
              />
            </mesh>
            <mesh position={[0, 8.32, 0]}>
              <cylinderGeometry args={[5.19, 5.19, 1.05, 32, 1, true, -Math.PI * 0.46, Math.PI * 0.92]} />
              <meshStandardMaterial
                color={isNight ? '#FFE4A0' : GLASS_DARK}
                emissive={isNight ? '#FFB84D' : '#000000'}
                emissiveIntensity={isNight ? 0.5 : 0}
                roughness={0.22}
                metalness={0.45}
                side={2}
              />
            </mesh>
            <mesh position={[0, 9.72, 0]} castShadow>
              <cylinderGeometry args={[5.38, 5.38, 0.38, 32]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
            </mesh>

            {/* Biển mặt tiền "NHÀ B1 · TRƯỜNG CNTT & TT (SoICT)" trên khung giá đỡ gắn vành mái đón */}
            <mesh position={[0, 4.22, 6.45]} castShadow>
              <boxGeometry args={[5.65, 1.24, 0.36]} />
              <meshStandardMaterial color="#0F295C" roughness={0.55} />
            </mesh>
            <LabelPlane
              textureKey="soict-b1-sign-white-blue-v3"
              canvasW={1024}
              canvasH={256}
              draw={(ctx, w, hCanvas) => {
                ctx.fillStyle = '#1D4E9E';
                ctx.fillRect(0, 0, w, hCanvas);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 10;
                ctx.strokeRect(12, 12, w - 24, hCanvas - 24);
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `700 44px ${CANVAS_VN_FONT}`;
                ctx.fillText('NHÀ B1 · TRƯỜNG CNTT & TT (SoICT)', w / 2, hCanvas * 0.37, w - 64);
                ctx.fillStyle = '#E0F2FE';
                ctx.font = `600 28px ${CANVAS_VN_FONT}`;
                ctx.fillText('SCHOOL OF INFORMATION AND COMMUNICATIONS TECHNOLOGY', w / 2, hCanvas * 0.72, w - 64);
              }}
              size={[5.42, 1.1]}
              position={[0, 4.22, 6.66]}
              transparent={false}
            />
          </group>
        </group>
      </group>
    </>
  );
}

export function EastCampusBlocks({ isNight }: { isNight: boolean }) {
  const { a15, a17, nhaE, nhaT } = EAST_CAMPUS_BLOCKS;
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
  const smallBlocks = [
    {
      code: 'NHÀ ĂN A1-5',
      center: a15.center,
      size: a15.size,
      h: 7.2,
      color: '#FAF6EE',
      roof: '#C87D4B',
      rotY: 0,
    },
    {
      code: 'NHÀ A17',
      center: a17.center,
      size: a17.size,
      h: 9.8,
      color: '#DCEAF7',
      roof: '#3B6E9C',
      rotY: a17.rotY,
    },
    {
      code: 'NHÀ E',
      center: nhaE.center,
      size: nhaE.size,
      h: 9.2,
      color: '#EDE5D5',
      roof: '#8C7A6B',
      rotY: 0,
    },
  ];

  return (
    <group>
      {smallBlocks.map((b, bIdx) => (
        <group key={b.code} position={[b.center.x, 0, b.center.z]} rotation-y={b.rotY}>
          <RoofSoffitAndPlinth
            w={b.size.x}
            d={b.size.z}
            height={b.h}
            plinthH={0.5}
            plinthColor="#8E949E"
            graniteMap={pbr?.granite.map}
            graniteBump={pbr?.granite.bumpMap}
          />
          <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.size.x, b.h, b.size.z]} />
            <meshStandardMaterial
              color={b.color}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.86}
            />
          </mesh>
          <mesh position={[0, b.h + 0.2, 0]} castShadow>
            <boxGeometry args={[b.size.x + 0.4, 0.4, b.size.z + 0.4]} />
            <meshStandardMaterial color={b.roof} roughness={0.82} />
          </mesh>
          {b.code === 'NHÀ A17' && (
            <group position={[0, b.h + 0.4, 0]}>
              <mesh position={[0, 0.72, 0]} castShadow>
                <boxGeometry args={[3.4, 1.44, 2.6]} />
                <meshStandardMaterial
                  color="#E2ECF5"
                  map={pbr?.plaster.map}
                  roughness={0.84}
                />
              </mesh>
              <mesh position={[0, 1.5, 0]} castShadow>
                <boxGeometry args={[3.7, 0.16, 2.9]} />
                <meshStandardMaterial color={b.roof} roughness={0.78} />
              </mesh>
            </group>
          )}
          <WindowGrid3D
            position={[0, 0, b.size.z / 2]}
            colXs={[-b.size.x * 0.28, 0, b.size.x * 0.28]}
            rowYs={[1.65, 4.75]}
            winW={1.38}
            winH={1.15}
            frameColor="#334155"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={51 + bIdx * 7}
            withAcUnits={b.code !== 'NHÀ ĂN A1-5'}
          />
          <WindowGrid3D
            position={[0, 0, -b.size.z / 2]}
            rotation={[0, Math.PI, 0]}
            colXs={[-b.size.x * 0.28, 0, b.size.x * 0.28]}
            rowYs={b.code === 'NHÀ ĂN A1-5' ? [1.65, 4.75] : [1.65, 4.75, 7.65]}
            winW={1.38}
            winH={1.15}
            frameColor="#334155"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={59 + bIdx * 7}
            withAcUnits={b.code !== 'NHÀ ĂN A1-5'}
          />
          <LabelPlane
            textureKey={`east-block-${b.code}`}
            canvasW={384}
            canvasH={96}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#1E3A5F';
              ctx.fillRect(0, 0, w, h);
              ctx.strokeStyle = '#FFD166';
              ctx.lineWidth = 5;
              ctx.strokeRect(5, 5, w - 10, h - 10);
              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '800 34px "Be Vietnam Pro", Arial, sans-serif';
              ctx.fillText(b.code, w / 2, h / 2);
            }}
            size={[Math.min(b.size.x - 1.0, 3.2), 0.76]}
            position={[0, b.h - 0.78, b.size.z / 2 + 0.08]}
            transparent={false}
          />
        </group>
      ))}

      {/* Nhà T chạy dọc ở rìa Đông khuôn viên HUST theo đúng Bản đồ Số https://hustmap.com/ */}
      <group position={[nhaT.center.x, 0, nhaT.center.z]} rotation-y={-0.16}>
        <RoofSoffitAndPlinth
          w={nhaT.size.x}
          d={nhaT.size.z}
          height={12.4}
          plinthH={0.55}
          graniteMap={pbr?.granite.map}
          graniteBump={pbr?.granite.bumpMap}
        />
        <mesh position={[0, 6.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[nhaT.size.x, 12.4, nhaT.size.z]} />
          <meshStandardMaterial
            color="#365985"
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.82}
          />
        </mesh>
        <mesh position={[0, 12.6, 0]} castShadow>
          <boxGeometry args={[nhaT.size.x + 0.5, 0.45, nhaT.size.z + 0.5]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
        </mesh>
        <mesh position={[0, 13.45, 0]} castShadow>
          <boxGeometry args={[3.2, 1.35, 3.6]} />
          <meshStandardMaterial color="#E2E8F0" map={pbr?.plaster.map} roughness={0.82} />
        </mesh>
        <WindowGrid3D
          position={[-nhaT.size.x / 2, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          colXs={[-7, -3.5, 0, 3.5, 7]}
          rowYs={[2.1, 5.5, 8.9]}
          winW={1.8}
          winH={1.3}
          frameColor="#E2E8F0"
          sillColor="#F1F5F9"
          glassColor="#93C5FD"
          isNight={isNight}
          seedOffset={83}
          withAcUnits
        />
        <WindowGrid3D
          position={[nhaT.size.x / 2, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          colXs={[-7, -3.5, 0, 3.5, 7]}
          rowYs={[2.1, 5.5, 8.9]}
          winW={1.8}
          winH={1.3}
          frameColor="#E2E8F0"
          sillColor="#F1F5F9"
          glassColor="#93C5FD"
          isNight={isNight}
          seedOffset={89}
          withAcUnits
        />
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
          position={[-nhaT.size.x / 2 - 0.08, 10.95, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          transparent={false}
        />
      </group>
    </group>
  );
}
