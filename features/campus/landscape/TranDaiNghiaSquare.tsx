// ---------------------------------------------------------------------------
// features/campus/landscape/TranDaiNghiaSquare.tsx — Cổng Trần Đại Nghĩa
// Dựng theo bộ ảnh thực tế tại `tham-khao/cong-tran-dai-nghia/`:
//   - `cong-tran-dai-nghia-goc-thang.png`: Bức tường biển hiệu trung tâm ốp đá
//     chẻ vàng kem nhám chia đôi 2 làn đường ra/vào, dòng chữ nổi màu đen than
//     "ĐẠI HỌC BÁCH KHOA HÀ NỘI / HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY",
//     bồn cây bê tông xám vát cạnh trồng hàng cây bụi xanh và 3 đèn pha chiếu
//     biển màu xanh lá đậm, hai bên là 2 làn đường nhựa có trụ kiểm soát thẻ/vé.
//   - `cong-tran-dai-nghia-goc-nghien.png`: Vạch kẻ đường người đi bộ (zebra
//     crossing) trước cổng, trụ cổng ốp đá vàng kem đồng bộ, hàng rào sắt và
//     nhà bảo vệ 1 tầng mái bằng màu trắng xám nằm bên phải cổng (phía trước
//     tòa C7 9 tầng màu trắng).
// Module ID: building.tran-dai-nghia-gate
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TRAN_DAI_NGHIA_GATE } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';
import { createSeededRandom } from '../../../components/three/materials';

/**
 * Sinh Procedural CanvasTexture + BumpMap cho bề mặt tường ốp đá chẻ vàng kem
 * (Split-face Beige Limestone Ashlar) đúng theo ảnh thực tế Cổng Trần Đại Nghĩa.
 */
function makeSplitLimestoneTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 512;
  const cMap = document.createElement('canvas');
  cMap.width = w;
  cMap.height = h;
  const ctxM = cMap.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = w;
  cBump.height = h;
  const ctxB = cBump.getContext('2d')!;

  const rnd = createSeededRandom(20261108);

  // Nền mạch vữa xám vàng trầm
  ctxM.fillStyle = '#B8A27A';
  ctxM.fillRect(0, 0, w, h);
  ctxB.fillStyle = '#404040';
  ctxB.fillRect(0, 0, w, h);

  const rows = 11;
  const rowH = h / rows;
  const palette = [
    '#EAD7AF',
    '#E2CA9B',
    '#EFE0BC',
    '#D9BF8C',
    '#E6D1A5',
    '#D2B47E',
    '#F2E5C6',
  ];

  for (let r = 0; r < rows; r++) {
    const y0 = Math.round(r * rowH);
    const bh = Math.round(rowH) - 3;
    let x = r % 2 === 0 ? 0 : -Math.round(w / 14);
    while (x < w) {
      const bw = Math.round(68 + rnd() * 44);
      const drawX = Math.max(0, x + 2);
      const drawW = Math.min(w - drawX, bw - 3);
      if (drawW > 4) {
        const baseColor = palette[Math.floor(rnd() * palette.length)];
        ctxM.fillStyle = baseColor;
        ctxM.fillRect(drawX, y0 + 2, drawW, bh);

        // Vân đá chẻ nhám tự nhiên trên từng viên đá
        const bumpLevel = Math.floor(155 + rnd() * 75);
        ctxB.fillStyle = `rgb(${bumpLevel},${bumpLevel},${bumpLevel})`;
        ctxB.fillRect(drawX, y0 + 2, drawW, bh);

        // Gờ sáng trên và bóng đổ dưới mỗi viên đá chẻ
        ctxM.fillStyle = 'rgba(255, 250, 235, 0.28)';
        ctxM.fillRect(drawX, y0 + 2, drawW, 3);
        ctxM.fillStyle = 'rgba(95, 74, 42, 0.22)';
        ctxM.fillRect(drawX, y0 + bh - 2, drawW, 3);

        // Các vệt gồ ghề trên mặt đá chẻ
        for (let k = 0; k < 5; k++) {
          const sx = drawX + rnd() * Math.max(2, drawW - 12);
          const sy = y0 + 4 + rnd() * Math.max(2, bh - 10);
          const sw = 8 + rnd() * 16;
          const sh = 3 + rnd() * 6;
          ctxM.fillStyle =
            rnd() > 0.5 ? 'rgba(255, 248, 228, 0.16)' : 'rgba(110, 86, 48, 0.14)';
          ctxM.fillRect(sx, sy, sw, sh);
        }
      }
      x += bw;
    }
  }

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

/**
 * Vẽ dòng chữ nổi 3D màu đen than trên mặt tường đá Cổng Trần Đại Nghĩa:
 *   ĐẠI HỌC BÁCH KHOA HÀ NỘI
 *   HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY
 */
function drawTranDaiNghiaStoneWallText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);

  // Đổ bóng chân chữ 3D xuống nền đá
  ctx.save();
  ctx.shadowColor = 'rgba(20, 18, 12, 0.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dòng 1: ĐẠI HỌC BÁCH KHOA HÀ NỘI (chữ in hoa đậm màu đen than #1C211E)
  ctx.fillStyle = '#1C211E';
  ctx.font = '900 72px Arial, Helvetica, sans-serif';
  ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.4);

  // Dòng 2: HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY (chữ in hoa thanh mảnh)
  ctx.font = '600 35px Arial, Helvetica, sans-serif';
  ctx.fillText('HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY', w / 2, h * 0.72);
  ctx.restore();

  // Viền highlight nhẹ mặt trên chữ kim loại sơn tĩnh điện
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.font = '900 72px Arial, Helvetica, sans-serif';
  ctx.strokeText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2 - 1, h * 0.4 - 1);
}

const SHRUB_CLUSTERS: Array<{
  dz: number;
  dx: number;
  r: number;
  h: number;
  color: string;
}> = [
  { dz: -2.25, dx: 0.52, r: 0.36, h: 0.42, color: '#2E6F28' },
  { dz: -1.85, dx: 0.58, r: 0.38, h: 0.46, color: '#3B8732' },
  { dz: -1.42, dx: 0.54, r: 0.35, h: 0.44, color: '#47963B' },
  { dz: -0.98, dx: 0.6, r: 0.4, h: 0.48, color: '#2E6F28' },
  { dz: -0.52, dx: 0.55, r: 0.37, h: 0.45, color: '#3B8732' },
  { dz: -0.05, dx: 0.58, r: 0.41, h: 0.49, color: '#4D9E3F' },
  { dz: 0.44, dx: 0.54, r: 0.37, h: 0.45, color: '#2E6F28' },
  { dz: 0.92, dx: 0.59, r: 0.39, h: 0.47, color: '#3B8732' },
  { dz: 1.38, dx: 0.55, r: 0.36, h: 0.44, color: '#47963B' },
  { dz: 1.82, dx: 0.58, r: 0.38, h: 0.46, color: '#2E6F28' },
  { dz: 2.22, dx: 0.52, r: 0.35, h: 0.41, color: '#3B8732' },
];

export function TranDaiNghiaSquare() {
  const { x, z } = TRAN_DAI_NGHIA_GATE.center; // (92, -6)
  const stoneTextures = useMemo(() => makeSplitLimestoneTextures(), []);

  useEffect(() => {
    return () => {
      stoneTextures.map.dispose();
      stoneTextures.bumpMap.dispose();
    };
  }, [stoneTextures]);

  return (
    <group position={[x, 0, z]}>
      {/* ============ 1. MẶT ĐƯỜNG NHỰA RỘNG 2 LÀN RA/VÀO & VẠCH KẺ ĐƯỜNG ZEBRA ============ */}
      {/* Thảm nhựa đường khu vực cổng nối 2 làn xe quanh đảo biển hiệu trung tâm */}
      <mesh rotation-x={-Math.PI / 2} position={[0.5, 0.018, -1.2]} receiveShadow>
        <planeGeometry args={[17.5, 17.6]} />
        <meshStandardMaterial color="#4A4E54" roughness={0.92} />
      </mesh>
      {/* Vỉa hè lát gạch xám hai bên cổng (phía Bắc cạnh nhà bảo vệ & phía Nam) */}
      <mesh position={[-0.2, 0.04, -10.2]} receiveShadow>
        <boxGeometry args={[14.5, 0.08, 4.2]} />
        <meshStandardMaterial color="#949BA3" roughness={0.9} />
      </mesh>
      <mesh position={[-0.2, 0.04, 7.6]} receiveShadow>
        <boxGeometry args={[14.5, 0.08, 3.8]} />
        <meshStandardMaterial color="#949BA3" roughness={0.9} />
      </mesh>

      {/* Vạch kẻ đường người đi bộ màu trắng (Zebra Crossing — cong-tran-dai-nghia-goc-nghien.png) */}
      {[-6.6, -5.4, -4.2, -3.0, -1.8, -0.6, 0.6, 1.8, 3.0, 4.2, 5.4].map((vz, idx) => (
        <mesh
          key={`tdn-zebra-${idx}`}
          rotation-x={-Math.PI / 2}
          position={[4.2, 0.025, vz]}
          receiveShadow
        >
          <planeGeometry args={[2.5, 0.52]} />
          <meshStandardMaterial color="#EAECEF" roughness={0.85} />
        </mesh>
      ))}

      {/* ============ 2. BỨC TƯỜNG BIỂN HIỆU ỐP ĐÁ CHẺ VÀNG KEM TRUNG TÂM ============ */}
      {/* Bồn cây bê tông xám vát cạnh bao quanh chân tường (cong-tran-dai-nghia-goc-thang.png) */}
      <group position={[0, 0, 0]}>
        {/* Đế bê tông vát cạnh ngoài cùng */}
        <mesh position={[0.18, 0.11, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.86, 0.22, 6.1]} />
          <meshStandardMaterial color="#BCC3CC" roughness={0.84} />
        </mesh>
        {/* Gờ vát nghiêng mặt trước (+X) và hai bên của bồn đá bê tông */}
        <mesh
          position={[1.06, 0.12, 0]}
          rotation={[0, 0, -0.45]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.26, 0.24, 6.08]} />
          <meshStandardMaterial color="#CFD6DF" roughness={0.8} />
        </mesh>
        {/* Lòng đất trồng cây trong bồn */}
        <mesh position={[0.52, 0.23, 0]} receiveShadow>
          <boxGeometry args={[0.96, 0.04, 5.65]} />
          <meshStandardMaterial color="#3B2D20" roughness={0.95} />
        </mesh>

        {/* Khối tường chính ốp đá chẻ vàng kem (rộng 5.45m × cao 2.38m × dày 0.68m) */}
        <mesh position={[-0.12, 1.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.68, 2.38, 5.45]} />
          <meshStandardMaterial
            color="#F5EBD6"
            map={stoneTextures.map}
            bumpMap={stoneTextures.bumpMap}
            bumpScale={0.028}
            roughness={0.86}
          />
        </mesh>
        {/* Mũ tường đá phẳng trên đỉnh (coping stone) */}
        <mesh position={[-0.12, 2.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.74, 0.08, 5.55]} />
          <meshStandardMaterial color="#E5D2AA" roughness={0.82} />
        </mesh>

        {/* Dòng chữ nổi "ĐẠI HỌC BÁCH KHOA HÀ NỘI / HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY"
            gắn trên mặt Đông (+X, hướng ra đường Trần Đại Nghĩa) */}
        <LabelPlane
          textureKey="tdn-stone-wall-sign-east"
          canvasW={2048}
          canvasH={512}
          draw={drawTranDaiNghiaStoneWallText}
          size={[5.05, 1.26]}
          position={[0.245, 1.62, 0]}
          rotation={[0, Math.PI / 2, 0]}
          transparent
        />
        {/* Dòng chữ nổi gắn trên mặt Tây (-X, hướng vào trong trường) */}
        <LabelPlane
          textureKey="tdn-stone-wall-sign-west"
          canvasW={2048}
          canvasH={512}
          draw={drawTranDaiNghiaStoneWallText}
          size={[5.05, 1.26]}
          position={[-0.485, 1.62, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          transparent
        />

        {/* Hàng cây bụi xanh tươi trồng dọc chân tường biển hiệu */}
        {SHRUB_CLUSTERS.map((sh, idx) => (
          <group key={`tdn-shrub-${idx}`} position={[sh.dx, 0.22 + sh.h * 0.45, sh.dz]}>
            <mesh castShadow receiveShadow scale={[1, 0.85, 1.15]}>
              <dodecahedronGeometry args={[sh.r, 1]} />
              <meshStandardMaterial color={sh.color} roughness={0.88} />
            </mesh>
            <mesh
              position={[-0.12, 0.08, (idx % 2 === 0 ? 1 : -1) * 0.1]}
              castShadow
              receiveShadow
            >
              <dodecahedronGeometry args={[sh.r * 0.78, 1]} />
              <meshStandardMaterial color="#4D9E3F" roughness={0.86} />
            </mesh>
          </group>
        ))}

        {/* 3 Đèn pha chiếu biển màu xanh lá đậm đặt trước bồn cây (cong-tran-dai-nghia-goc-thang.png) */}
        {[-1.65, 0, 1.65].map((lz, idx) => (
          <group key={`tdn-uplight-${idx}`} position={[0.92, 0.22, lz]}>
            {/* Chân trụ đèn */}
            <mesh position={[0, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.025, 0.03, 0.32, 8]} />
              <meshStandardMaterial color="#1B4D3E" roughness={0.5} metalness={0.4} />
            </mesh>
            {/* Hộp đầu đèn pha xanh đậm ngửa lên chiếu vào mặt biển đá */}
            <mesh position={[-0.02, 0.34, 0]} rotation={[0, 0, 0.35]} castShadow>
              <boxGeometry args={[0.14, 0.1, 0.16]} />
              <meshStandardMaterial color="#1B4D3E" roughness={0.45} metalness={0.35} />
            </mesh>
            {/* Mặt kính đèn phát sáng nhẹ */}
            <mesh position={[-0.08, 0.37, 0]} rotation={[0, 0, 0.35]}>
              <boxGeometry args={[0.02, 0.07, 0.12]} />
              <meshStandardMaterial
                color="#FFFBEB"
                emissive="#FFE599"
                emissiveIntensity={0.85}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* ============ 3. TRỤ KIỂM SOÁT VÉ/THẺ TỰ ĐỘNG & BARIE HAI LÀN XE ============ */}
      {/* Hai cụm tủ kiểm soát vé/barie đặt sát hai đầu tường đá (z = -3.35 và z = +3.35) */}
      {[-3.38, 3.38].map((bz, idx) => (
        <group key={`tdn-barrier-booth-${idx}`} position={[0.05, 0, bz]}>
          {/* Thân tủ kiểm soát inox xám bạc + dải phản quang đỏ trắng */}
          <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 1.16, 0.42]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.45} metalness={0.55} />
          </mesh>
          <mesh position={[0.22, 0.62, 0]}>
            <boxGeometry args={[0.02, 0.72, 0.28]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.5} />
          </mesh>
          {/* Biển tròn viền đỏ gắn trên trụ trắng cạnh lối xe */}
          <group position={[0.55, 0, idx === 0 ? 0.22 : -0.22]}>
            <mesh position={[0, 0.75, 0]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
            </mesh>
            <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.22, 0.22, 0.03, 20]} />
              <meshStandardMaterial color="#DC2626" roughness={0.5} />
            </mesh>
            <mesh position={[0.02, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.16, 0.16, 0.032, 20]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ============ 4. TRỤ CỔNG ĐÁ CHẺ, HÀNG RÀO SẮT & NHÀ BẢO VỆ BÊN PHẢI (PHÍA BẮC) ============ */}
      {/* Hai trụ cổng lớn ốp đá vàng kem đồng bộ bên phải lối vào (cong-tran-dai-nghia-goc-nghien.png) */}
      {[-7.6, -11.0].map((pz, idx) => (
        <group key={`tdn-north-pillar-${idx}`} position={[0.1, 0, pz]}>
          <mesh position={[0, 1.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.78, 2.84, 0.78]} />
            <meshStandardMaterial
              color="#F5EBD6"
              map={stoneTextures.map}
              bumpMap={stoneTextures.bumpMap}
              bumpScale={0.025}
              roughness={0.86}
            />
          </mesh>
          {/* Mũ trụ bê tông xám phẳng */}
          <mesh position={[0, 2.9, 0]} castShadow>
            <boxGeometry args={[0.9, 0.14, 0.9]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.78} />
          </mesh>
        </group>
      ))}
      {/* Khung hàng rào song sắt đứng màu trắng xám nối giữa 2 trụ cổng phải */}
      <group position={[0.1, 0, -9.3]}>
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.64, 2.7]} />
          <meshStandardMaterial color="#E2D5B5" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.65, 0]} castShadow>
          <boxGeometry args={[0.08, 1.95, 2.65]} />
          <meshStandardMaterial color="#D8DEE6" roughness={0.5} metalness={0.45} />
        </mesh>
      </group>

      {/* Nhà bảo vệ 1 tầng mái bằng màu trắng xám nằm ngay sau trụ cổng phải (cong-tran-dai-nghia-goc-nghien.png) */}
      <group position={[-1.0, 0, -9.4]}>
        {/* Thân nhà bảo vệ */}
        <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 3.1, 3.4]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.84} />
        </mesh>
        {/* Diềm mái bằng bê tông đua rộng đặc trưng */}
        <mesh position={[0, 3.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.95, 0.38, 3.95]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.78} />
        </mesh>
        {/* Cửa sổ kính khung nhôm đen mặt hướng về làn đường cổng và mặt Đông */}
        <mesh position={[0, 1.65, 1.72]}>
          <boxGeometry args={[1.8, 1.15, 0.05]} />
          <meshStandardMaterial color="#1E293B" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[1.72, 1.65, 0]}>
          <boxGeometry args={[0.05, 1.15, 1.6]} />
          <meshStandardMaterial color="#1E293B" roughness={0.3} metalness={0.4} />
        </mesh>
      </group>

      {/* ============ 5. TRỤ CỔNG ĐÁ & QUẦY BẢO VỆ BÊN TRÁI (PHÍA NAM) ============ */}
      <group position={[0.1, 0, 6.2]}>
        <mesh position={[0, 1.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.78, 2.84, 0.78]} />
          <meshStandardMaterial
            color="#F5EBD6"
            map={stoneTextures.map}
            bumpMap={stoneTextures.bumpMap}
            bumpScale={0.025}
            roughness={0.86}
          />
        </mesh>
        <mesh position={[0, 2.9, 0]} castShadow>
          <boxGeometry args={[0.9, 0.14, 0.9]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.78} />
        </mesh>
      </group>
      {/* Bốt trực nhỏ màu trắng-xanh bên lề trái như trong ảnh cong-tran-dai-nghia-goc-thang.png */}
      <group position={[-1.2, 0, 7.2]}>
        <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.1, 2.5, 1.9]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
        </mesh>
        <mesh position={[0, 2.58, 0]} castShadow>
          <boxGeometry args={[2.35, 0.18, 2.15]} />
          <meshStandardMaterial color="#1D4ED8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.4, -0.96]}>
          <boxGeometry args={[1.2, 0.95, 0.04]} />
          <meshStandardMaterial color="#38BDF8" roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}
