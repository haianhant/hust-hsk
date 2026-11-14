// ---------------------------------------------------------------------------
// features/campus/buildings/EastCampusBlocks.tsx — Nhà B1 (Trường CNTT & TT — SoICT)
// & Cụm Nhà ăn A1-5, Nhà A17, Nhà E và Nhà T theo đúng Bản đồ Số https://hustmap.com/
// Module IDs: building.b1-soict, building.east-blocks
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { EAST_CAMPUS_BLOCKS, SOICT_B1 } from '../world-data';
import { ExtrudedText3D } from '../../../components/three/Signage3D';
import { LabelPlane } from '../../../components/three/TextPlate';
import { RoofSoffitAndPlinth, WindowGrid3D } from '../../../components/three/ArchitecturalWindowBand';
import { getSharedBuildingPbrTextures } from '../../../components/three/materials';

const GLASS_DARK = '#27445C';

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
  // hướng về phía Bắc (-Z, nhìn ra trục đường chính Cổng Trần Đại Nghĩa và nhóm sinh viên trước sảnh)
  return (
    <group position={[center.x, 0, center.z]} rotation-y={Math.PI}>
      {/* ============ 1. CÁNH TRÁI 7 TẦNG (XẾP CHÉO CHỮ V, TOÀN KHỐI SƠN TRẮNG SÁNG) ============ */}
      <group position={[-5.4, 0, -1.2]} rotation-y={0.28}>
        <RoofSoffitAndPlinth
          w={9.4}
          d={5.6}
          height={h7}
          plinthH={0.45}
          graniteMap={pbr?.granite.map}
          graniteBump={pbr?.granite.bumpMap}
        />
        {/* Tầng 1-2 khối đế sơn trắng sáng + gờ phân tầng */}
        <mesh position={[0, basePlinthH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.4, basePlinthH, 5.6]} />
          <meshStandardMaterial
            color={B1_PLINTH_WHITE}
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.8}
          />
        </mesh>
        <mesh position={[0, basePlinthH, 0]}>
          <boxGeometry args={[9.52, 0.16, 5.72]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
        </mesh>
        {/* Tầng 3-7 sơn trắng tinh khiết */}
        <mesh position={[0, (basePlinthH + h7) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.3, h7 - basePlinthH, 5.5]} />
          <meshStandardMaterial
            color={B1_WHITE}
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.82}
          />
        </mesh>
        <mesh position={[0, h7 + 0.22, 0]} castShadow>
          <boxGeometry args={[9.6, 0.44, 5.8]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
        </mesh>
        {/* Hệ cửa sổ 3D mặt trước & mặt sau khối đế tầng 1-2 và thân tầng 3-7 */}
        <WindowGrid3D
          position={[0, 0, 2.8]}
          colXs={[-3.2, -1.1, 1.1, 3.2]}
          rowYs={[0, 1].map((fl) => fl * floorHeight + 1.65)}
          winW={1.42}
          winH={1.22}
          frameColor="#1E293B"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={11}
        />
        <WindowGrid3D
          position={[0, 0, 2.75]}
          colXs={[-3.2, -1.1, 1.1, 3.2]}
          rowYs={[2, 3, 4, 5, 6].map((fl) => fl * floorHeight + 1.65)}
          winW={1.42}
          winH={1.22}
          frameColor="#1E293B"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={13}
        />
        <WindowGrid3D
          position={[0, 0, -2.8]}
          rotation={[0, Math.PI, 0]}
          colXs={[-3.2, -1.1, 1.1, 3.2]}
          rowYs={[0, 1].map((fl) => fl * floorHeight + 1.65)}
          winW={1.42}
          winH={1.22}
          frameColor="#1E293B"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={15}
        />
        <WindowGrid3D
          position={[0, 0, -2.75]}
          rotation={[0, Math.PI, 0]}
          colXs={[-3.2, -1.1, 1.1, 3.2]}
          rowYs={[2, 3, 4, 5, 6].map((fl) => fl * floorHeight + 1.65)}
          winW={1.42}
          winH={1.22}
          frameColor="#1E293B"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={17}
        />
      </group>

      {/* ============ 2. CÁNH PHẢI 8 TẦNG GIẬT CẤP XUỐNG 5 TẦNG + BIỂN CHỮ "B1" XANH DƯƠNG ============ */}
      <group position={[4.6, 0, -1.5]} rotation-y={-0.22}>
        {/* Chân đế & khối cao 8 tầng phía sau màu trắng */}
        <group position={[0, 0, -0.6]}>
          <RoofSoffitAndPlinth
            w={10.2}
            d={5.4}
            height={h8}
            plinthH={0.45}
            graniteMap={pbr?.granite.map}
            graniteBump={pbr?.granite.bumpMap}
          />
          <mesh position={[0, h8 / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[10.2, h8, 5.4]} />
            <meshStandardMaterial
              color={B1_WHITE}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.82}
            />
          </mesh>
          <mesh position={[0, h8 + 0.22, 0]} castShadow>
            <boxGeometry args={[10.5, 0.44, 5.7]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
          </mesh>
          {/* Tum thang máy & lan can kỹ thuật trên mái 8 tầng */}
          <mesh position={[1.8, h8 + 1.15, 0]} castShadow>
            <boxGeometry args={[3.2, 1.5, 2.6]} />
            <meshStandardMaterial
              color="#F1F5F9"
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.01}
              roughness={0.82}
            />
          </mesh>
          <mesh position={[1.8, h8 + 1.98, 0]} castShadow>
            <boxGeometry args={[3.5, 0.18, 2.9]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.78} />
          </mesh>
          {/* Cửa sổ mặt sau khối 8 tầng */}
          <WindowGrid3D
            position={[0, 0, -2.7]}
            rotation={[0, Math.PI, 0]}
            colXs={[-3.4, -1.15, 1.15, 3.4]}
            rowYs={[0, 1, 2, 3, 4, 5, 6, 7].map((fl) => fl * floorHeight + 1.65)}
            winW={1.45}
            winH={1.22}
            frameColor="#1E293B"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={23}
          />
        </group>

        {/* Khối giật cấp 5 tầng nhô ra phía trước sơn trắng đồng bộ */}
        <group position={[0.4, 0, 2.2]}>
          <RoofSoffitAndPlinth
            w={8.8}
            d={3.8}
            height={h5}
            plinthH={0.45}
            graniteMap={pbr?.granite.map}
            graniteBump={pbr?.granite.bumpMap}
          />
          <mesh position={[0, basePlinthH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[8.8, basePlinthH, 3.8]} />
            <meshStandardMaterial
              color={B1_PLINTH_WHITE}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, basePlinthH, 0]}>
            <boxGeometry args={[8.92, 0.16, 3.92]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
          </mesh>
          <mesh position={[0, (basePlinthH + h5) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[8.7, h5 - basePlinthH, 3.7]} />
            <meshStandardMaterial
              color={B1_WHITE}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.82}
            />
          </mesh>
          <mesh position={[0, h5 + 0.2, 0]} castShadow>
            <boxGeometry args={[9.0, 0.4, 4.0]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
          </mesh>
          {/* Cửa sổ 3D mặt trước khối 5 tầng (theo tâm x = 0 của khối con) */}
          <WindowGrid3D
            position={[0, 0, 1.9]}
            colXs={[-3.0, -1.0, 1.0, 3.0]}
            rowYs={[0, 1].map((fl) => fl * floorHeight + 1.65)}
            winW={1.4}
            winH={1.22}
            frameColor="#1E293B"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={31}
          />
          <WindowGrid3D
            position={[0, 0, 1.85]}
            colXs={[-3.0, -1.0, 1.0, 3.0]}
            rowYs={[2, 3, 4].map((fl) => fl * floorHeight + 1.65)}
            winW={1.4}
            winH={1.22}
            frameColor="#1E293B"
            sillColor="#E2E8F0"
            isNight={isNight}
            seedOffset={37}
          />
        </group>

        {/* Cửa sổ tầng 6-7 đầy đủ & tầng 8 chừa khoang trái cho biển chữ nổi B1 */}
        <WindowGrid3D
          position={[0, 0, 2.1]}
          colXs={[-3.2, -1.1, 1.1, 3.2]}
          rowYs={[5, 6].map((fl) => fl * floorHeight + 1.65)}
          winW={1.45}
          winH={1.22}
          frameColor="#1E293B"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={41}
        />
        <WindowGrid3D
          position={[0, 0, 2.1]}
          colXs={[-1.1, 1.1, 3.2]}
          rowYs={[7 * floorHeight + 1.65]}
          winW={1.45}
          winH={1.22}
          frameColor="#1E293B"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={43}
        />
        {/* Biển chữ nổi 3D khối đặc "B1" màu xanh dương đậm (#1D4E9E, dày 0.20m) trên đỉnh cánh 8 tầng (b1-soict-01.jpg) */}
        <ExtrudedText3D
          text="B1"
          size={[2.25, 1.38]}
          depth={0.2}
          position={[-3.2, h8 - 1.5, 2.28]}
          frontColor="#1D4E9E"
          frontHighlightColor="#3B82F6"
          sideColor="#0F295C"
          metalness={0.48}
          roughness={0.32}
          emissive="#1E40AF"
          emissiveIntensity={isNight ? 0.35 : 0.08}
        />
      </group>

      {/* ============ 3. KHỐI TRỤ GÓC BO TRÒN 7 TẦNG & KHỐI SẢNH TRÒN 3 TẦNG NHÔ RA (b1-soict-02.jpg) ============ */}
      <group position={[-0.4, 0, -0.8]}>
        {/* Trụ góc bo tròn 7 tầng màu trắng PBR */}
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <cylinderGeometry args={[3.24, 3.24, 0.44, 24]} />
          <meshStandardMaterial
            color="#64748B"
            map={pbr?.granite.map}
            bumpMap={pbr?.granite.bumpMap}
            bumpScale={0.014}
            roughness={0.86}
          />
        </mesh>
        <mesh position={[0, h7 / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.15, 3.15, h7, 24]} />
          <meshStandardMaterial
            color={B1_WHITE}
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.8}
          />
        </mesh>
        {/* Các dải kính cong ngang + vành lam chắn nắng nhôm phía trên từng tầng */}
        {[2, 3, 4, 5, 6].map((fl) => (
          <group key={`b1-cyl-glass-${fl}`}>
            <mesh position={[0, fl * floorHeight + 1.65, 0]}>
              <cylinderGeometry args={[3.18, 3.18, 1.25, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84]} />
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
            <mesh position={[0, fl * floorHeight + 2.34, 0]}>
              <cylinderGeometry args={[3.26, 3.26, 0.08, 24, 1, true, -Math.PI * 0.44, Math.PI * 0.88]} />
              <meshStandardMaterial color="#CBD5E1" roughness={0.5} metalness={0.35} side={2} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, h7 + 0.24, 0]} castShadow>
          <cylinderGeometry args={[3.35, 3.35, 0.48, 24]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
        </mesh>

        {/* Khối sảnh tròn (Rotunda) 3 tầng nhô ra phía trước tại góc giao (b1-soict-01.jpg, b1-soict-02.jpg) */}
        <group position={[0, 0, 2.8]}>
          {/* Chân đế granite dưới Rotunda */}
          <mesh position={[0, 0.16, 0]} receiveShadow>
            <cylinderGeometry args={[3.04, 3.08, 0.32, 24]} />
            <meshStandardMaterial
              color="#64748B"
              map={pbr?.granite.map}
              bumpMap={pbr?.granite.bumpMap}
              bumpScale={0.014}
              roughness={0.86}
            />
          </mesh>
          {/* Tầng 1: Sảnh kính cong + hàng cột trụ tròn trắng + mái đón (canopy) đua rộng */}
          <mesh position={[0, 1.7, 0]} castShadow>
            <cylinderGeometry args={[2.9, 2.9, 3.4, 24]} />
            <meshStandardMaterial color="#1E2D3B" roughness={0.2} metalness={0.5} envMapIntensity={1.25} />
          </mesh>
          {[-2.4, -1.2, 0, 1.2, 2.4].map((ang, cIdx) => (
            <mesh
              key={`b1-rotunda-col-${cIdx}`}
              position={[Math.sin(ang * 0.42) * 3.25, 1.7, Math.cos(ang * 0.42) * 3.25]}
              castShadow
            >
              <cylinderGeometry args={[0.18, 0.18, 3.4, 14]} />
              <meshStandardMaterial
                color={B1_WHITE}
                map={pbr?.plaster.map}
                roughness={0.75}
              />
            </mesh>
          ))}
          {/* Mái đón sảnh cong ốp alu trắng sáng */}
          <mesh position={[0, 3.45, 0.55]} castShadow>
            <cylinderGeometry args={[3.9, 3.9, 0.36, 24]} />
            <meshStandardMaterial color={B1_WHITE} roughness={0.58} metalness={0.22} />
          </mesh>
          {/* Tầng 2 của khối sảnh tròn: sơn trắng sáng đồng bộ toàn tòa B1 */}
          <mesh position={[0, 4.9, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.3, 3.3, 2.8, 24]} />
            <meshStandardMaterial
              color={B1_PLINTH_WHITE}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, 5.15, 0]}>
            <cylinderGeometry args={[3.33, 3.33, 0.95, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9]} />
            <meshStandardMaterial
              color={isNight ? '#FFE4A0' : GLASS_DARK}
              emissive={isNight ? '#FFB84D' : '#000000'}
              emissiveIntensity={isNight ? 0.55 : 0}
              roughness={0.22}
              metalness={0.45}
              side={2}
            />
          </mesh>
          {/* Tầng 3 của khối sảnh tròn: sơn trắng + dải cửa sổ + lan can sân thượng */}
          <mesh position={[0, 7.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.3, 3.3, 2.8, 24]} />
            <meshStandardMaterial
              color={B1_WHITE}
              map={pbr?.plaster.map}
              bumpMap={pbr?.plaster.bumpMap}
              bumpScale={0.012}
              roughness={0.82}
            />
          </mesh>
          <mesh position={[0, 7.9, 0]}>
            <cylinderGeometry args={[3.33, 3.33, 0.95, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9]} />
            <meshStandardMaterial
              color={isNight ? '#FFE4A0' : GLASS_DARK}
              emissive={isNight ? '#FFB84D' : '#000000'}
              emissiveIntensity={isNight ? 0.5 : 0}
              roughness={0.22}
              metalness={0.45}
              side={2}
            />
          </mesh>
          <mesh position={[0, 9.25, 0]} castShadow>
            <cylinderGeometry args={[3.48, 3.48, 0.35, 24]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
          </mesh>
        </group>
      </group>

      {/* ============ 4. BỒN CỎ BÁN NGUYỆT TIỀN CẢNH TRƯỚC SẢNH B1 (b1-soict-01.jpg, b1-soict-03.jpg) ============ */}
      <group position={[-0.2, 0, 5.4]}>
        <mesh position={[0, 0.16, 0]} receiveShadow>
          <cylinderGeometry args={[3.2, 3.3, 0.32, 24]} />
          <meshStandardMaterial
            color="#CBD5E1"
            map={pbr?.granite.map}
            bumpMap={pbr?.granite.bumpMap}
            bumpScale={0.012}
            roughness={0.85}
          />
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
        textureKey="soict-b1-sign-white-blue-v2"
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
          ctx.font = '800 44px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('NHÀ B1 · TRƯỜNG CNTT & TT (SoICT)', w / 2, hCanvas * 0.37, w - 64);
          ctx.fillStyle = '#E0F2FE';
          ctx.font = '600 28px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('SCHOOL OF INFORMATION AND COMMUNICATIONS TECHNOLOGY', w / 2, hCanvas * 0.72, w - 64);
        }}
        size={[4.4, 0.92]}
        position={[-0.4, 3.55, 6.48]}
        transparent={false}
      />
    </group>
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
