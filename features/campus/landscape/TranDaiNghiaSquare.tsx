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

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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

  // Đổ bóng chân chữ 3D xuống nền đá (không dùng strokeText lệch gây bóng mờ kép trên dấu tiếng Việt)
  ctx.save();
  ctx.shadowColor = 'rgba(20, 18, 12, 0.42)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dòng 1: ĐẠI HỌC BÁCH KHOA HÀ NỘI (chữ in hoa đậm màu đen than #181C1A)
  ctx.fillStyle = '#181C1A';
  ctx.font = '700 96px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
  ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.39);

  // Dòng 2: HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY (chữ in hoa thanh mảnh)
  ctx.fillStyle = '#222825';
  ctx.font = '600 46px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
  ctx.fillText('HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY', w / 2, h * 0.74);
  ctx.restore();
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

function drawGuardHousePlate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 44px "Be Vietnam Pro", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PHÒNG BẢO VỆ', w / 2, h * 0.42);
  ctx.fillStyle = '#FDE047';
  ctx.font = '600 26px "Be Vietnam Pro", "Segoe UI", sans-serif';
  ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.76);
}

/**
 * Bác bảo vệ Bách Khoa thân thiện đứng gác cạnh Phòng bảo vệ Cổng Trần Đại Nghĩa:
 * Áo sơ mi bảo vệ xanh da trời nhạt, cầu vai & cà vạt xanh tím than, băng tay đỏ "BẢO VỆ",
 * mũ kê-pi bảo vệ có sao vàng, bộ đàm bên hông và động tác gật đầu / vẫy chào sinh viên.
 */
function HustSecurityGuard({ position }: { position: [number, number, number] }) {
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (torsoRef.current) {
      torsoRef.current.position.y = 0.88 + Math.sin(t * 2.1) * 0.012;
      torsoRef.current.rotation.y = Math.sin(t * 0.75) * 0.08;
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.9) * 0.16;
      headRef.current.rotation.x = Math.sin(t * 1.8) * 0.04;
    }
    if (rightArmRef.current) {
      // Định kỳ giơ tay vẫy chào sinh viên qua cổng
      const waveCycle = t % 6.5;
      if (waveCycle < 2.2) {
        const env = Math.sin((waveCycle / 2.2) * Math.PI);
        rightArmRef.current.rotation.x = -0.85 * env;
        rightArmRef.current.rotation.z = -0.35 * env - Math.sin(t * 8.5) * 0.16 * env;
      } else {
        rightArmRef.current.rotation.x = Math.sin(t * 1.6) * 0.05;
        rightArmRef.current.rotation.z = -0.08;
      }
    }
  });

  return (
    <group position={position} rotation={[0, Math.PI * 0.32, 0]}>
      {/* Bóng đổ nhẹ dưới chân */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.048, 0]}>
        <circleGeometry args={[0.32, 18]} />
        <meshBasicMaterial color="#0F172A" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      {/* Giày da đen & hai ống quần âu xanh tím than */}
      {[-0.105, 0.105].map((lx, idx) => (
        <group key={`guard-leg-${idx}`} position={[lx, 0, 0]}>
          <mesh position={[0, 0.06, 0.035]} castShadow>
            <boxGeometry args={[0.12, 0.11, 0.24]} />
            <meshStandardMaterial color="#111827" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.075, 0.76, 10]} />
            <meshStandardMaterial color="#1E293B" roughness={0.82} />
          </mesh>
        </group>
      ))}

      {/* Hông quần + thắt lưng da đen khóa bạc + bộ đàm bảo vệ */}
      <mesh position={[0, 0.86, 0]} castShadow>
        <boxGeometry args={[0.38, 0.14, 0.24]} />
        <meshStandardMaterial color="#1E293B" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.91, 0]}>
        <boxGeometry args={[0.395, 0.05, 0.255]} />
        <meshStandardMaterial color="#0F172A" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.91, 0.132]}>
        <boxGeometry args={[0.065, 0.045, 0.015]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Bộ đàm đeo hông trái */}
      <group position={[-0.21, 0.88, 0.03]}>
        <mesh castShadow>
          <boxGeometry args={[0.05, 0.12, 0.06]} />
          <meshStandardMaterial color="#111827" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.1, 0.01]}>
          <cylinderGeometry args={[0.006, 0.008, 0.1, 6]} />
          <meshStandardMaterial color="#0F172A" roughness={0.4} />
        </mesh>
        <mesh position={[0.026, 0.04, 0.015]}>
          <sphereGeometry args={[0.008, 6, 6]} />
          <meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.6} />
        </mesh>
      </group>

      {/* Thân trên đồng phục bảo vệ Bách Khoa */}
      <group ref={torsoRef} position={[0, 0.88, 0]}>
        {/* Áo sơ mi xanh da trời bảo vệ */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.41, 0.48, 0.25]} />
          <meshStandardMaterial color="#7CC0EE" roughness={0.76} />
        </mesh>
        {/* Cổ áo sơ mi & cà vạt xanh tím than */}
        <mesh position={[0, 0.52, 0.02]}>
          <cylinderGeometry args={[0.095, 0.11, 0.06, 10]} />
          <meshStandardMaterial color="#BAE6FD" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.31, 0.13]}>
          <boxGeometry args={[0.055, 0.34, 0.016]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.65} />
        </mesh>
        {/* Cầu vai xanh tím than viền vàng */}
        {[-0.16, 0.16].map((sx, idx) => (
          <mesh key={`guard-epaulet-${idx}`} position={[sx, 0.525, 0]}>
            <boxGeometry args={[0.12, 0.025, 0.11]} />
            <meshStandardMaterial color="#1E3A8A" roughness={0.6} />
          </mesh>
        ))}
        {/* Bảng tên vàng & túi ngực trái */}
        <mesh position={[-0.11, 0.39, 0.13]}>
          <boxGeometry args={[0.09, 0.032, 0.012]} />
          <meshStandardMaterial color="#FACC15" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[0.11, 0.36, 0.128]}>
          <boxGeometry args={[0.085, 0.095, 0.01]} />
          <meshStandardMaterial color="#60A5FA" roughness={0.78} />
        </mesh>

        {/* Tay trái (đeo băng đỏ "BẢO VỆ") */}
        <group position={[0.255, 0.46, 0]} rotation={[0.08, 0, 0.08]}>
          <mesh position={[0, -0.09, 0]} castShadow>
            <cylinderGeometry args={[0.068, 0.062, 0.2, 10]} />
            <meshStandardMaterial color="#7CC0EE" roughness={0.76} />
          </mesh>
          {/* Băng đỏ sao vàng trực cổng */}
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.071, 0.068, 0.075, 12]} />
            <meshStandardMaterial color="#DC2626" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.29, 0.01]} castShadow>
            <cylinderGeometry args={[0.052, 0.045, 0.24, 10]} />
            <meshStandardMaterial color="#F1C29B" roughness={0.78} />
          </mesh>
        </group>

        {/* Tay phải (vẫy chào sinh viên) */}
        <group ref={rightArmRef} position={[-0.255, 0.46, 0]} rotation={[0, 0, -0.08]}>
          <mesh position={[0, -0.09, 0]} castShadow>
            <cylinderGeometry args={[0.068, 0.062, 0.2, 10]} />
            <meshStandardMaterial color="#7CC0EE" roughness={0.76} />
          </mesh>
          <mesh position={[0, -0.29, 0.01]} castShadow>
            <cylinderGeometry args={[0.052, 0.045, 0.24, 10]} />
            <meshStandardMaterial color="#F1C29B" roughness={0.78} />
          </mesh>
        </group>

        {/* Đầu & mũ kê-pi bác bảo vệ hiền hậu */}
        <group ref={headRef} position={[0, 0.56, 0]}>
          {/* Cổ */}
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.065, 0.072, 0.09, 10]} />
            <meshStandardMaterial color="#F1C29B" roughness={0.78} />
          </mesh>
          {/* Khuôn mặt */}
          <mesh position={[0, 0.16, 0]} castShadow>
            <sphereGeometry args={[0.135, 16, 14]} />
            <meshStandardMaterial color="#F1C29B" roughness={0.76} />
          </mesh>
          {/* Tóc mai điểm bạc hai bên thái dương & gáy */}
          <mesh position={[0, 0.17, -0.035]}>
            <sphereGeometry args={[0.132, 14, 12]} />
            <meshStandardMaterial color="#475569" roughness={0.88} />
          </mesh>
          {/* Đôi mắt & chân mày bạc phúc hậu */}
          {[-0.046, 0.046].map((ex, idx) => (
            <group key={`guard-eye-${idx}`}>
              <mesh position={[ex, 0.175, 0.124]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial color="#1E293B" roughness={0.4} />
              </mesh>
              <mesh position={[ex, 0.202, 0.122]} rotation={[0, 0, idx === 0 ? 0.08 : -0.08]}>
                <boxGeometry args={[0.042, 0.011, 0.012]} />
                <meshStandardMaterial color="#475569" roughness={0.85} />
              </mesh>
            </group>
          ))}
          {/* Nụ cười hiền */}
          <mesh position={[0, 0.118, 0.125]}>
            <boxGeometry args={[0.056, 0.012, 0.012]} />
            <meshStandardMaterial color="#9A3412" roughness={0.7} />
          </mesh>

          {/* Mũ kê-pi bảo vệ xanh tím than + lưỡi trai đen + huy hiệu sao vàng */}
          <group position={[0, 0.255, 0]}>
            {/* Đai mũ */}
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.138, 0.135, 0.055, 16]} />
              <meshStandardMaterial color="#172554" roughness={0.62} />
            </mesh>
            {/* Chóp mũ kê-pi loe nhẹ */}
            <mesh position={[0, 0.048, -0.008]} rotation={[-0.08, 0, 0]} castShadow>
              <cylinderGeometry args={[0.168, 0.138, 0.052, 18]} />
              <meshStandardMaterial color="#1E3A8A" roughness={0.65} />
            </mesh>
            {/* Lưỡi trai đen bóng phía trước */}
            <mesh position={[0, -0.018, 0.105]} rotation={[0.22, 0, 0]}>
              <cylinderGeometry args={[0.115, 0.125, 0.014, 14, 1, false, -Math.PI * 0.45, Math.PI * 0.9]} />
              <meshStandardMaterial color="#0F172A" roughness={0.28} metalness={0.3} />
            </mesh>
            {/* Dây mũ vàng & huy hiệu tròn đỏ-vàng chính giữa */}
            <mesh position={[0, -0.01, 0.134]}>
              <boxGeometry args={[0.13, 0.012, 0.012]} />
              <meshStandardMaterial color="#FACC15" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.025, 0.142]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.024, 0.024, 0.012, 12]} />
              <meshStandardMaterial
                color="#DC2626"
                emissive="#FACC15"
                emissiveIntensity={0.35}
                roughness={0.4}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export function TranDaiNghiaSquare({ isNight = false }: { isNight?: boolean }) {
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

        {/* Khối tường chính ốp đá chẻ vàng kem (rộng 5.45m × cao 2.38m × dày 0.68m) —
            ban đêm được 3 đèn pha ngoài cổng rọi sáng rực vàng ấm để nổi bật dòng chữ
            "ĐẠI HỌC BÁCH KHOA HÀ NỘI" */}
        <mesh position={[-0.12, 1.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.68, 2.38, 5.45]} />
          <meshStandardMaterial
            color="#F5EBD6"
            map={stoneTextures.map}
            bumpMap={stoneTextures.bumpMap}
            bumpScale={0.028}
            emissive={isNight ? '#FFE6AD' : '#000000'}
            emissiveMap={stoneTextures.map}
            emissiveIntensity={isNight ? 0.98 : 0}
            roughness={0.86}
          />
        </mesh>
        {/* Mũ tường đá phẳng trên đỉnh (coping stone) */}
        <mesh position={[-0.12, 2.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.74, 0.08, 5.55]} />
          <meshStandardMaterial
            color="#E5D2AA"
            emissive={isNight ? '#FFDFA0' : '#000000'}
            emissiveIntensity={isNight ? 0.45 : 0}
            roughness={0.82}
          />
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

        {/* Đèn pha thực (PointLight luôn mount để tránh recompile shader) chiếu rực mặt Đông biển đá khi trời tối */}
        <pointLight
          position={[1.45, 1.48, 0]}
          color="#FFE39E"
          intensity={isNight ? 4.2 : 0}
          distance={12}
          decay={1.7}
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
              <boxGeometry args={[0.16, 0.11, 0.18]} />
              <meshStandardMaterial color="#1B4D3E" roughness={0.45} metalness={0.35} />
            </mesh>
            {/* Mặt kính đèn phát sáng rực rỡ khi trời tối */}
            <mesh position={[-0.09, 0.37, 0]} rotation={[0, 0, 0.35]}>
              <boxGeometry args={[0.025, 0.085, 0.14]} />
              <meshStandardMaterial
                color="#FFFBEB"
                emissive="#FFE599"
                emissiveIntensity={isNight ? 3.4 : 0.65}
              />
            </mesh>
            {/* Luồng sáng nón (volumetric beam) hướng lên mặt chữ ĐẠI HỌC BÁCH KHOA HÀ NỘI vào ban đêm */}
            {isNight && (
              <mesh position={[-0.36, 0.98, 0]} rotation={[0, 0, -0.42]}>
                <coneGeometry args={[0.72, 1.48, 16, 1, true]} />
                <meshBasicMaterial
                  color="#FFE7A3"
                  transparent
                  opacity={0.22}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
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

      {/* ============ 4. TRỤ CỔNG ĐÁ CHẺ, HÀNG RÀO SẮT, NHÀ BẢO VỆ SÁNG ĐÈN & BÁC BẢO VỆ ============ */}
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

      {/* Nhà bảo vệ 1 tầng mái bằng màu trắng xám nằm ngay sau trụ cổng phải —
          sáng đèn ấm áp bên trong & dưới mái hiên khi trời tối */}
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
        {/* Biển tên PHÒNG BẢO VỆ trên mặt Nam hướng ra làn cổng */}
        <LabelPlane
          textureKey="tdn-guardhouse-sign"
          canvasW={512}
          canvasH={160}
          draw={drawGuardHousePlate}
          size={[1.35, 0.42]}
          position={[0.35, 2.62, 1.725]}
        />
        {/* Cửa ra vào phòng bảo vệ (nửa trên lắp kính phát sáng ấm ban đêm) */}
        <mesh position={[-1.08, 1.08, 1.715]}>
          <boxGeometry args={[0.82, 2.08, 0.04]} />
          <meshStandardMaterial color="#334155" roughness={0.55} />
        </mesh>
        <mesh position={[-1.08, 1.52, 1.74]}>
          <boxGeometry args={[0.62, 0.88, 0.02]} />
          <meshStandardMaterial
            color={isNight ? '#FFF1B8' : '#38BDF8'}
            emissive={isNight ? '#FFC65C' : '#000000'}
            emissiveIntensity={isNight ? 1.55 : 0}
            roughness={0.28}
          />
        </mesh>

        {/* Cửa sổ kính khung nhôm mặt Nam (hướng về làn đường cổng) — sáng đèn vàng ấm khi trời tối */}
        <mesh position={[0.42, 1.65, 1.715]}>
          <boxGeometry args={[1.76, 1.22, 0.04]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0.42, 1.65, 1.74]}>
          <boxGeometry args={[1.62, 1.08, 0.02]} />
          <meshStandardMaterial
            color={isNight ? '#FFF3C4' : '#1E293B'}
            emissive={isNight ? '#FFC452' : '#000000'}
            emissiveIntensity={isNight ? 1.75 : 0}
            roughness={0.25}
          />
        </mesh>
        {/* Đố chia khung cửa sổ mặt Nam */}
        <mesh position={[0.42, 1.65, 1.755]}>
          <boxGeometry args={[0.04, 1.1, 0.015]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>

        {/* Cửa sổ kính mặt Đông (nhìn ra đường Trần Đại Nghĩa) — sáng đèn vàng ấm khi trời tối */}
        <mesh position={[1.715, 1.65, 0]}>
          <boxGeometry args={[0.04, 1.22, 1.68]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[1.74, 1.65, 0]}>
          <boxGeometry args={[0.02, 1.08, 1.54]} />
          <meshStandardMaterial
            color={isNight ? '#FFF3C4' : '#1E293B'}
            emissive={isNight ? '#FFC452' : '#000000'}
            emissiveIntensity={isNight ? 1.75 : 0}
            roughness={0.25}
          />
        </mesh>

        {/* Đèn ốp trần hiên phòng bảo vệ + PointLight rọi sáng lối gác & Bác bảo vệ ban đêm */}
        <mesh position={[0.15, 3.06, 1.84]}>
          <boxGeometry args={[0.68, 0.06, 0.2]} />
          <meshStandardMaterial
            color="#FFFBEB"
            emissive="#FFE299"
            emissiveIntensity={isNight ? 2.9 : 0.15}
          />
        </mesh>
        <mesh position={[1.84, 3.06, 0]}>
          <boxGeometry args={[0.2, 0.06, 0.68]} />
          <meshStandardMaterial
            color="#FFFBEB"
            emissive="#FFE299"
            emissiveIntensity={isNight ? 2.6 : 0.15}
          />
        </mesh>
        <pointLight
          position={[0.55, 2.85, 2.45]}
          color="#FFE29A"
          intensity={isNight ? 3.2 : 0}
          distance={9.5}
          decay={1.75}
        />
      </group>

      {/* Bác bảo vệ Bách Khoa đứng gác cạnh phòng bảo vệ phía Bắc Cổng Trần Đại Nghĩa */}
      <HustSecurityGuard
        position={[
          TRAN_DAI_NGHIA_GATE.guardPos.x - x,
          0,
          TRAN_DAI_NGHIA_GATE.guardPos.z - z,
        ]}
      />

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
          <meshStandardMaterial
            color={isNight ? '#FFF1B8' : '#38BDF8'}
            emissive={isNight ? '#FFC452' : '#000000'}
            emissiveIntensity={isNight ? 1.5 : 0}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[1.06, 1.4, 0]}>
          <boxGeometry args={[0.04, 0.95, 1.1]} />
          <meshStandardMaterial
            color={isNight ? '#FFF1B8' : '#38BDF8'}
            emissive={isNight ? '#FFC452' : '#000000'}
            emissiveIntensity={isNight ? 1.5 : 0}
            roughness={0.25}
          />
        </mesh>
      </group>
    </group>
  );
}
