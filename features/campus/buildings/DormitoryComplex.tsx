// ---------------------------------------------------------------------------
// features/campus/buildings/DormitoryComplex.tsx — Khu Ký túc xá Bách Khoa
// (B3–B13, KTX B8/B9 vàng cổ điển + Cổng Hội Sinh Viên, KTX Mới 9 tầng xanh-trắng,
// Sân bóng KTX & Nhà ăn KTX)
// Module ID: building.dorm-complex
// ---------------------------------------------------------------------------

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DORM_COMPLEX } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';
import { RoofSoffitAndPlinth, WindowGrid3D } from '../../../components/three/ArchitecturalWindowBand';
import { getSharedBuildingPbrTextures } from '../../../components/three/materials';

type LaundryGeometryBundle = {
  shirt: THREE.BufferGeometry;
  pants: THREE.BufferGeometry;
  towel: THREE.BufferGeometry;
  clip: THREE.BufferGeometry;
};

let sharedLaundryGeos: LaundryGeometryBundle | null = null;

function getSharedLaundryGeometries(): LaundryGeometryBundle | null {
  if (typeof document === 'undefined') return null;
  if (sharedLaundryGeos) return sharedLaundryGeos;

  // Áo phông 3D (gốc ở móc treo y = 0, thân buông xuống -0.46 m)
  const shirtShape = new THREE.Shape();
  shirtShape.moveTo(-0.06, 0);
  shirtShape.quadraticCurveTo(0, -0.04, 0.06, 0);
  shirtShape.lineTo(0.14, -0.02);
  shirtShape.lineTo(0.24, -0.14);
  shirtShape.lineTo(0.18, -0.2);
  shirtShape.lineTo(0.13, -0.13);
  shirtShape.lineTo(0.14, -0.45);
  shirtShape.quadraticCurveTo(0, -0.47, -0.14, -0.45);
  shirtShape.lineTo(-0.13, -0.13);
  shirtShape.lineTo(-0.18, -0.2);
  shirtShape.lineTo(-0.24, -0.14);
  shirtShape.lineTo(-0.14, -0.02);
  shirtShape.closePath();

  const shirt = new THREE.ExtrudeGeometry(shirtShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 8,
  });
  shirt.translate(0, 0, -0.011);

  // Quần dài 2 ống tách nhẹ
  const pantsShape = new THREE.Shape();
  pantsShape.moveTo(-0.12, 0);
  pantsShape.lineTo(0.12, 0);
  pantsShape.lineTo(0.14, -0.5);
  pantsShape.lineTo(0.03, -0.5);
  pantsShape.lineTo(0, -0.18);
  pantsShape.lineTo(-0.03, -0.5);
  pantsShape.lineTo(-0.14, -0.5);
  pantsShape.closePath();

  const pants = new THREE.ExtrudeGeometry(pantsShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  pants.translate(0, 0, -0.012);

  // Khăn tắm gập vắt mềm chữ U qua dây phơi (chiều rộng ngang 0.32 m)
  const towelSide = new THREE.Shape();
  towelSide.moveTo(-0.022, -0.34);
  towelSide.lineTo(-0.022, -0.015);
  towelSide.absarc(0, -0.015, 0.022, Math.PI, 0, true);
  towelSide.lineTo(0.022, -0.36);
  towelSide.lineTo(0.01, -0.36);
  towelSide.lineTo(0.01, -0.015);
  towelSide.absarc(0, -0.015, 0.01, 0, Math.PI, false);
  towelSide.lineTo(-0.01, -0.34);
  towelSide.closePath();

  const towel = new THREE.ExtrudeGeometry(towelSide, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 10,
  });
  towel.rotateY(Math.PI / 2);
  towel.translate(-0.16, 0.018, 0);

  const clip = new THREE.BoxGeometry(0.02, 0.045, 0.025);

  sharedLaundryGeos = { shirt, pants, towel, clip };
  return sharedLaundryGeos;
}

function BalconyLaundryLine({
  code,
  floor,
  span,
}: {
  code: string;
  floor: number;
  span: number;
}) {
  const geos = useMemo(() => getSharedLaundryGeometries(), []);
  const swayGroupRef = useRef<THREE.Group>(null);
  const seed = code.charCodeAt(code.length - 1) + floor * 17;
  const clothesColors = ['#E11D48', '#2563EB', '#F8FAFC', '#16A34A', '#F59E0B', '#38BDF8'];

  useFrame((state) => {
    if (!swayGroupRef.current) return;
    const t = state.clock.elapsedTime;
    swayGroupRef.current.rotation.x = Math.sin(t * 1.85 + seed * 0.4) * 0.075;
  });

  if (!geos) return null;
  const ropeW = Math.min(span * 0.66, 6.2);
  const items = [
    { x: -ropeW * 0.34, kind: 'shirt' as const, color: clothesColors[(seed + 0) % clothesColors.length] },
    { x: -ropeW * 0.1, kind: 'pants' as const, color: '#1E3A5F' },
    { x: ropeW * 0.14, kind: 'towel' as const, color: clothesColors[(seed + 3) % clothesColors.length] },
    { x: ropeW * 0.36, kind: 'shirt' as const, color: clothesColors[(seed + 4) % clothesColors.length] },
  ];

  return (
    <group position={[0, 2.24, 0.06]}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.007, 0.007, ropeW + 0.4, 6]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.45} metalness={0.6} />
      </mesh>
      <group ref={swayGroupRef}>
        {items.map((item, idx) => (
          <group key={`garment-${idx}`} position={[item.x, 0, 0]} rotation-y={((idx % 2) - 0.5) * 0.08}>
            <mesh
              geometry={
                item.kind === 'shirt'
                  ? geos.shirt
                  : item.kind === 'pants'
                    ? geos.pants
                    : geos.towel
              }
              castShadow
            >
              <meshStandardMaterial color={item.color} roughness={0.88} />
            </mesh>
            <mesh geometry={geos.clip} position={[-0.08, 0.02, 0]}>
              <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
            </mesh>
            <mesh geometry={geos.clip} position={[0.08, 0.02, 0]}>
              <meshStandardMaterial color="#EF4444" roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export function ClassicYellowDormBlock({
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
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
  const winColXs = useMemo(
    () => [-size.x * 0.34, -size.x * 0.16, size.x * 0.16, size.x * 0.34],
    [size.x],
  );
  const winRowYs = useMemo(() => [0, 1, 2, 3].map((fl) => fl * floorH + 1.55), [floorH]);

  return (
    <group position={[center.x, 0, center.z]}>
      <RoofSoffitAndPlinth
        w={size.x}
        d={size.z}
        height={totalH}
        plinthH={0.42}
        plinthColor="#8A7960"
        graniteMap={pbr?.granite.map}
        graniteBump={pbr?.granite.bumpMap}
      />
      {/* Thân nhà 4 tầng sơn vàng nghệ cổ điển PBR */}
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial
          color={DORM_YELLOW}
          map={pbr?.plaster.map}
          bumpMap={pbr?.plaster.bumpMap}
          bumpScale={0.015}
          roughness={0.88}
        />
      </mesh>
      {/* Mái bằng + gờ tường chắn mái (parapet) sơn vàng viền trắng kem */}
      <mesh position={[0, totalH + 0.22, 0]} castShadow>
        <boxGeometry args={[size.x + 0.3, 0.44, size.z + 0.3]} />
        <meshStandardMaterial color={DORM_BAND_CREAM} map={pbr?.plaster.map} roughness={0.82} />
      </mesh>
      {/* Dải hành lang logia từng tầng + lan can bê tông vàng + quần áo sinh viên phơi mềm 3D */}
      {[1, 2, 3].map((fl) => (
        <group key={`${code}-bal-${fl}`} position={[0, fl * floorH, size.z / 2 + 0.1]}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[size.x - 0.3, 0.14, 0.28]} />
            <meshStandardMaterial color={DORM_BAND_CREAM} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.48, 0.08]}>
            <boxGeometry args={[size.x - 0.5, 0.72, 0.08]} />
            <meshStandardMaterial color={DORM_YELLOW} map={pbr?.plaster.map} roughness={0.86} />
          </mesh>
          <BalconyLaundryLine code={code} floor={fl} span={size.x} />
        </group>
      ))}
      {/* Lõi cầu thang giữa mặt đứng với ô gạch thông gió 3D đứng */}
      <mesh position={[0, totalH / 2, size.z / 2 + 0.06]} castShadow>
        <boxGeometry args={[1.6, totalH - 0.4, 0.14]} />
        <meshStandardMaterial color={DORM_BAND_CREAM} map={pbr?.plaster.map} roughness={0.86} />
      </mesh>
      {[0, 1, 2, 3].map((fl) =>
        [-0.36, 0, 0.36].map((gx, gIdx) => (
          <mesh key={`${code}-vent-${fl}-${gIdx}`} position={[gx, fl * floorH + 1.55, size.z / 2 + 0.136]}>
            <boxGeometry args={[0.2, 0.92, 0.02]} />
            <meshStandardMaterial color="#3F2E22" roughness={0.85} />
          </mesh>
        )),
      )}
      {/* Cửa sổ khung gỗ nâu sẫm 3D mặt trước & mặt sau */}
      <WindowGrid3D
        position={[0, 0, size.z / 2]}
        colXs={winColXs}
        rowYs={winRowYs}
        winW={1.16}
        winH={1.16}
        frameColor={DORM_WOOD_BROWN}
        sillColor={DORM_BAND_CREAM}
        glassColor="#2C4257"
        isNight={isNight}
        seedOffset={code.charCodeAt(1) + 7}
        withRainHood={false}
      />
      <WindowGrid3D
        position={[0, 0, -size.z / 2]}
        rotation={[0, Math.PI, 0]}
        colXs={winColXs}
        rowYs={winRowYs}
        winW={1.16}
        winH={1.16}
        frameColor={DORM_WOOD_BROWN}
        sillColor={DORM_BAND_CREAM}
        glassColor="#2C4257"
        isNight={isNight}
        seedOffset={code.charCodeAt(1) + 19}
        withRainHood
      />
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
        position={[0, totalH - 0.62, size.z / 2 + 0.25]}
        transparent={false}
      />
    </group>
  );
}

export function NewHighRiseDormBlock({
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
  const bayXs = useMemo(() => [-4.8, -2.4, 0, 2.4, 4.8], []);
  const backRowYs = useMemo(() => [2, 3, 4, 5, 6, 7, 8].map((fl) => fl * floorH + 1.55), [floorH]);
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);

  return (
    <group position={[center.x, 0, center.z]}>
      <RoofSoffitAndPlinth
        w={size.x}
        d={size.z}
        height={totalH}
        plinthH={0.55}
        graniteMap={pbr?.granite.map}
        graniteBump={pbr?.granite.bumpMap}
      />
      {/* Khối thân 9 tầng màu trắng hiện đại PBR */}
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial
          color={KTX_WHITE}
          map={pbr?.plaster.map}
          bumpMap={pbr?.plaster.bumpMap}
          bumpScale={0.012}
          roughness={0.82}
        />
      </mesh>
      {/* Sảnh kính tầng 1 & cột hiên dưới bảng tên */}
      <mesh position={[0, 1.3, size.z / 2 + 0.03]}>
        <boxGeometry args={[6.2, 2.4, 0.08]} />
        <meshStandardMaterial color="#1E3A5F" roughness={0.18} metalness={0.5} envMapIntensity={1.25} />
      </mesh>
      {[-3.4, -1.7, 1.7, 3.4].map((px) => (
        <mesh key={`${code}-gcol-${px}`} position={[px, 1.35, size.z / 2 + 0.24]} castShadow>
          <boxGeometry args={[0.28, 2.6, 0.28]} />
          <meshStandardMaterial color={KTX_WHITE} roughness={0.78} />
        </mesh>
      ))}
      {/* Dải diềm trắng tầng 1-2 gắn dòng chữ xanh dương "KÝ TÚC XÁ ĐẠI HỌC BÁCH KHOA" (ktx-03.jpg) */}
      <mesh position={[0, 3.2, size.z / 2 + 0.14]} castShadow>
        <boxGeometry args={[size.x + 0.2, 1.35, 0.28]} />
        <meshStandardMaterial color={KTX_WHITE} map={pbr?.plaster.map} roughness={0.78} />
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

      {/* Mặt đứng tầng 3–9: Phối mảng ô cờ Xanh dương đậm - Xanh da trời - Trắng + khung cửa sổ & lan can logia 3D */}
      {[2, 3, 4, 5, 6, 7, 8].map((fl) =>
        bayXs.map((bx, bIdx) => {
          const pattern = (fl + bIdx) % 3;
          const panelColor =
            pattern === 0 ? KTX_BLUE_DEEP : pattern === 1 ? KTX_BLUE_SKY : KTX_WHITE;
          const glow = isNight && (fl + bIdx) % 2 === 0;
          const hasAc = (fl + bIdx) % 4 === 1;
          return (
            <group key={`${code}-check-${fl}-${bIdx}`} position={[bx, fl * floorH + 1.45, size.z / 2 + 0.04]}>
              {/* Mảng tường/ban công phối màu ô cờ PBR */}
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[2.28, floorH - 0.12, 0.16]} />
                <meshStandardMaterial color={panelColor} map={pbr?.plaster.map} roughness={0.78} />
              </mesh>
              {/* Ô cửa sổ 3D & đố khung nhôm bên trong mỗi khoang */}
              <mesh position={[0, 0.14, 0.095]}>
                <boxGeometry args={[1.42, 1.36, 0.04]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : '#1E293B'}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.78 : 0}
                  roughness={0.22}
                  metalness={0.45}
                  envMapIntensity={1.2}
                />
              </mesh>
              <mesh position={[0, 0.14, 0.12]}>
                <boxGeometry args={[0.045, 1.38, 0.04]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.45} metalness={0.3} />
              </mesh>
              {/* Thanh lan can logia an toàn ngang khoang */}
              <mesh position={[0, -0.58, 0.14]}>
                <boxGeometry args={[1.55, 0.06, 0.05]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.45} metalness={0.4} />
              </mesh>
              {hasAc && (
                <mesh position={[0.72, -0.82, 0.18]} castShadow>
                  <boxGeometry args={[0.48, 0.36, 0.22]} />
                  <meshStandardMaterial color="#E2E8F0" roughness={0.62} />
                </mesh>
              )}
            </group>
          );
        }),
      )}

      {/* Hệ cửa sổ 3D mặt lưng tòa KTX Mới */}
      <WindowGrid3D
        position={[0, 0, -size.z / 2]}
        rotation={[0, Math.PI, 0]}
        colXs={bayXs}
        rowYs={backRowYs}
        winW={1.36}
        winH={1.25}
        frameColor="#1E3A5F"
        sillColor="#E2E8F0"
        isNight={isNight}
        seedOffset={code.charCodeAt(1) + 41}
        withAcUnits
      />

      {/* Mái phẳng + diềm mái xanh dương đậm + tum thang máy & 2 bồn nước inox */}
      <mesh position={[0, totalH + 0.25, 0]} castShadow>
        <boxGeometry args={[size.x + 0.4, 0.5, size.z + 0.4]} />
        <meshStandardMaterial color={KTX_BLUE_DEEP} roughness={0.78} />
      </mesh>
      <group position={[0, totalH + 0.5, 0]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[3.4, 1.8, 2.8]} />
          <meshStandardMaterial color={KTX_WHITE} map={pbr?.plaster.map} roughness={0.82} />
        </mesh>
        {[-3.6, 3.6].map((tx, tIdx) => (
          <group key={`tank-${tIdx}`} position={[tx, 0.72, 0]}>
            <mesh rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.58, 0.58, 1.75, 16]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.85} roughness={0.18} />
            </mesh>
            {[-0.55, 0.55].map((lx) => (
              <mesh key={`leg-${lx}`} position={[lx, -0.45, 0]}>
                <boxGeometry args={[0.08, 0.55, 0.72]} />
                <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Chi tiết sân trước KTX mới (ktx-03.jpg): mái kính xanh lấy sáng tầng hầm + bồn gạch đỏ PBR */}
      {[-3.4, 3.4].map((sx, sIdx) => (
        <group key={`${code}-forecourt-${sIdx}`} position={[sx, 0, size.z / 2 + 1.35]}>
          {/* Bồn gạch đỏ trồng cây cọ/cau cảnh */}
          <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.48, 1.2]} />
            <meshStandardMaterial
              color="#9E3B28"
              map={pbr?.brickWall.map}
              bumpMap={pbr?.brickWall.bumpMap}
              bumpScale={0.014}
              roughness={0.88}
            />
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

export function HoiSinhVienBrickGate({ x, z }: { x: number; z: number }) {
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
  return (
    <group position={[x, 0, z]} rotation-y={-Math.PI / 2}>
      {/* 2 trụ cổng xây gạch đỏ PBR + mũ trụ trắng */}
      {[-2.3, 2.3].map((px) => (
        <group key={`hsv-pillar-${px}`} position={[px, 0, 0]}>
          <mesh position={[0, 1.65, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 3.3, 0.62]} />
            <meshStandardMaterial
              color="#A8422B"
              map={pbr?.brickWall.map}
              bumpMap={pbr?.brickWall.bumpMap}
              bumpScale={0.016}
              roughness={0.86}
            />
          </mesh>
          <mesh position={[0, 3.38, 0]} castShadow>
            <boxGeometry args={[0.76, 0.18, 0.76]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Cổng sắt song dọc thanh mảnh mở hai bên trụ gạch */}
      {[-1.55, 1.55].map((gx) => (
        <group key={`hsv-gate-leaf-${gx}`} position={[gx, 0, 0]}>
          <mesh position={[0, 2.18, 0]}>
            <boxGeometry args={[0.92, 0.06, 0.06]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.92, 0.06, 0.06]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.5} />
          </mesh>
          {[-0.36, -0.18, 0, 0.18, 0.36].map((bx) => (
            <mesh key={`bar-${bx}`} position={[bx, 1.22, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 1.95, 6]} />
              <meshStandardMaterial color="#1E293B" roughness={0.45} metalness={0.55} />
            </mesh>
          ))}
        </group>
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
          ctx.fillStyle = '#1D4ED8';
          ctx.beginPath();
          ctx.arc(w * 0.16, h * 0.5, 36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 22px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('HSV', w * 0.16, h * 0.5);
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

export function HustDormitoryZone({ isNight }: { isNight: boolean }) {
  const d = DORM_COMPLEX;
  const pbr = useMemo(() => getSharedBuildingPbrTextures(), []);
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

      {/* Sân bóng rổ KTX nằm giữa nhà B7 và B7bis (đúng vị trí Sân bóng rổ trên https://hustmap.com/) */}
      <group position={[d.basketballCenter.x, 0, d.basketballCenter.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]} receiveShadow>
          <planeGeometry args={[d.basketballSize.x, d.basketballSize.z]} />
          <meshStandardMaterial color="#C85A32" roughness={0.86} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.026, 0]}>
          <ringGeometry args={[0.92, 1.04, 24]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.026, 0]}>
          <planeGeometry args={[0.1, d.basketballSize.z - 0.5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {[-d.basketballSize.x / 2 + 0.35, d.basketballSize.x / 2 - 0.35].map((hx, hIdx) => (
          <group key={`ktx-hoop-${hIdx}`} position={[hx, 0, 0]}>
            <mesh position={[0, 1.55, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.055, 3.1, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
            </mesh>
            <mesh position={[hIdx === 0 ? 0.22 : -0.22, 2.85, 0]} castShadow>
              <boxGeometry args={[0.06, 0.72, 1.08]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
            </mesh>
            <mesh
              position={[hIdx === 0 ? 0.42 : -0.42, 2.65, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.18, 0.022, 8, 16]} />
              <meshStandardMaterial color="#EA580C" roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Căng tin B5-9 nằm giữa KTX B5 và KTX B9 (theo đúng https://hustmap.com/) */}
      <group position={[d.b59CanteenCenter.x, 0, d.b59CanteenCenter.z]}>
        <RoofSoffitAndPlinth
          w={d.b59CanteenSize.x}
          d={d.b59CanteenSize.z}
          height={4.4}
          plinthH={0.42}
          graniteMap={pbr?.granite.map}
          graniteBump={pbr?.granite.bumpMap}
        />
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[d.b59CanteenSize.x, 4.4, d.b59CanteenSize.z]} />
          <meshStandardMaterial
            color="#FAF6EE"
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.86}
          />
        </mesh>
        <mesh position={[0, 4.55, 0]} castShadow>
          <boxGeometry args={[d.b59CanteenSize.x + 0.5, 0.32, d.b59CanteenSize.z + 0.5]} />
          <meshStandardMaterial color="#C87D4B" roughness={0.78} />
        </mesh>
        <WindowGrid3D
          position={[-d.b59CanteenSize.x / 2, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          colXs={[-1.4, 1.4]}
          rowYs={[1.65]}
          winW={1.55}
          winH={1.2}
          frameColor="#7C2D12"
          sillColor="#F3EDE0"
          isNight={isNight}
          seedOffset={101}
        />
        <WindowGrid3D
          position={[0, 0, d.b59CanteenSize.z / 2]}
          colXs={[-1.4, 1.4]}
          rowYs={[1.65]}
          winW={1.55}
          winH={1.2}
          frameColor="#7C2D12"
          sillColor="#F3EDE0"
          isNight={isNight}
          seedOffset={103}
        />
        <LabelPlane
          textureKey="dorm-b59-canteen-sign"
          canvasW={512}
          canvasH={112}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#991B1B';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFD166';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 34px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('CĂNG TIN B5-9 · 食堂', w / 2, h / 2);
          }}
          size={[3.9, 0.82]}
          position={[-d.b59CanteenSize.x / 2 - 0.08, 3.6, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          transparent={false}
        />
      </group>

      {/* Trung tâm Phục vụ Tổng hợp Bách Khoa ở phía Nam sân bóng KTX (theo https://hustmap.com/) */}
      <group position={[d.serviceCenter.x, 0, d.serviceCenter.z]}>
        <RoofSoffitAndPlinth
          w={d.serviceSize.x}
          d={d.serviceSize.z}
          height={6.6}
          plinthH={0.45}
          graniteMap={pbr?.granite.map}
          graniteBump={pbr?.granite.bumpMap}
        />
        <mesh position={[0, 3.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[d.serviceSize.x, 6.6, d.serviceSize.z]} />
          <meshStandardMaterial
            color="#F2ECE1"
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.86}
          />
        </mesh>
        <mesh position={[0, 6.8, 0]} castShadow>
          <boxGeometry args={[d.serviceSize.x + 0.45, 0.38, d.serviceSize.z + 0.45]} />
          <meshStandardMaterial color="#2B547E" roughness={0.78} />
        </mesh>
        <WindowGrid3D
          position={[0, 0, d.serviceSize.z / 2]}
          colXs={[-d.serviceSize.x * 0.28, 0, d.serviceSize.x * 0.28]}
          rowYs={[1.55, 4.15]}
          winW={1.32}
          winH={1.05}
          frameColor="#1E3A5F"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={113}
        />
        <WindowGrid3D
          position={[0, 0, -d.serviceSize.z / 2]}
          rotation={[0, Math.PI, 0]}
          colXs={[-d.serviceSize.x * 0.28, 0, d.serviceSize.x * 0.28]}
          rowYs={[1.55, 4.15]}
          winW={1.32}
          winH={1.05}
          frameColor="#1E3A5F"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={117}
        />
        <LabelPlane
          textureKey="dorm-service-center-sign"
          canvasW={512}
          canvasH={112}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#1E3A5F';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 30px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('TT PHỤC VỤ TỔNG HỢP BK', w / 2, h / 2);
          }}
          size={[4.0, 0.82]}
          position={[0, 5.65, d.serviceSize.z / 2 + 0.08]}
          transparent={false}
        />
      </group>

      {/* Trung tâm ĐTTH & Trạm Y tế Bách Khoa giữa KTX B13 và KTX B3 (theo https://hustmap.com/) */}
      <group position={[d.canteenCenter.x, 0, d.canteenCenter.z]}>
        <RoofSoffitAndPlinth
          w={d.canteenSize.x}
          d={d.canteenSize.z}
          height={6.2}
          plinthH={0.45}
          graniteMap={pbr?.granite.map}
          graniteBump={pbr?.granite.bumpMap}
        />
        <mesh position={[0, 3.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[d.canteenSize.x, 6.2, d.canteenSize.z]} />
          <meshStandardMaterial
            color="#F8FAFC"
            map={pbr?.plaster.map}
            bumpMap={pbr?.plaster.bumpMap}
            bumpScale={0.012}
            roughness={0.85}
          />
        </mesh>
        <mesh position={[0, 6.38, 0]} castShadow>
          <boxGeometry args={[d.canteenSize.x + 0.5, 0.36, d.canteenSize.z + 0.5]} />
          <meshStandardMaterial color="#1C5C3A" roughness={0.78} />
        </mesh>
        <WindowGrid3D
          position={[0, 0, d.canteenSize.z / 2]}
          colXs={[-d.canteenSize.x * 0.28, 0, d.canteenSize.x * 0.28]}
          rowYs={[1.45, 3.85]}
          winW={1.3}
          winH={0.98}
          frameColor="#1C5C3A"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={127}
          withAcUnits
        />
        <WindowGrid3D
          position={[0, 0, -d.canteenSize.z / 2]}
          rotation={[0, Math.PI, 0]}
          colXs={[-d.canteenSize.x * 0.28, 0, d.canteenSize.x * 0.28]}
          rowYs={[1.45, 3.85]}
          winW={1.3}
          winH={0.98}
          frameColor="#1C5C3A"
          sillColor="#E2E8F0"
          isNight={isNight}
          seedOffset={131}
        />
        <LabelPlane
          textureKey="dorm-medical-center-sign"
          canvasW={576}
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
            ctx.font = '800 30px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('✚ TRUNG TÂM ĐTTH & TRẠM Y TẾ BK', w / 2, h / 2);
          }}
          size={[4.8, 0.88]}
          position={[0, 5.2, d.canteenSize.z / 2 + 0.08]}
          transparent={false}
        />
      </group>
    </group>
  );
}
