// ---------------------------------------------------------------------------
// LibraryLobby.tsx — SẢNH TẦNG 1 THƯ VIỆN TẠ QUANG BỬU (Giai đoạn 4).
// Dựng theo tư liệu ảnh thật Sảnh tầng 1 Thư viện Tạ Quang Bửu (docs/reference-visual.md §3):
//   - Tượng bán thân đồng GS. Tạ Quang Bửu (1910–1986) trên bệ gỗ gụ cao có
//     biển đồng khắc tên, bao quanh bởi 4 trụ inox mạ vàng và dây nhung đỏ.
//   - Bức tường hậu cảnh ốp gỗ nâu trầm với họa tiết NHỊ PHÂN 0/1 (vòng tròn &
//     thanh đứng) phát sáng vàng hổ phách ấm + diềm hồi văn phát sáng phía trên.
//   - Sàn đá hoa văn rẻ quạt đồng tâm (đỏ nâu đất nung, kem sáng, xám đá).
//   - Quầy thông tin thư viện (借书处) & Bảng từ vựng Hán ngữ chuyên đề Thư viện
//     & Khoa học để người chơi tương tác (phím E hoặc click chuột).
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { LibraryStudyArea } from '../../features/campus/buildings/library';
import { LIBRARY_LOBBY } from '../../lib/campus';
import { LabelPlane } from './TextPlate';

export interface LibraryLobbyProps {
  activeSeatId?: string | null;
  nearestSeatId?: string | null;
  onObjectClick?: (id: string) => void;
}

const WALL_CREAM = '#F3EFE6';
const COLUMN_STONE = '#E5DEC9';
const WOOD_DARK = '#3B2214';
const WOOD_MID = '#54321E';
const BRONZE_DARK = '#4A3623';
const GOLD_BRASS = '#D4AF37';
const VELVET_RED = '#A81C24';
const AMBER_GLOW = '#FFB627';

// --- Sàn đá hoa văn rẻ quạt (Sunburst Marble Floor) --------------------------
function makeSunburstFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  const cx = 512;
  const cy = 280; // Tâm rẻ quạt đặt gần khu vực tượng GS. Tạ Quang Bửu

  // Nền đá kem sáng
  ctx.fillStyle = '#E8DFCE';
  ctx.fillRect(0, 0, 1024, 1024);

  // Các nan quạt tỏa ra từ tâm tượng
  const rays = 24;
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 1) / rays) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 920, a0, a1);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#E6DDD0' : '#D9CFC0';
    ctx.fill();
  }

  // Các vành khuyên đồng tâm: đỏ nâu đất nung, xám đá, kem
  const rings: Array<{ rOuter: number; rInner: number; color: string }> = [
    { rOuter: 640, rInner: 575, color: '#9E543E' },
    { rOuter: 460, rInner: 410, color: '#878C92' },
    { rOuter: 310, rInner: 245, color: '#A65B43' },
    { rOuter: 175, rInner: 135, color: '#7D8288' },
    { rOuter: 135, rInner: 0, color: '#DDD3C2' },
  ];
  for (const rg of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, rg.rOuter, 0, Math.PI * 2);
    if (rg.rInner > 0) {
      ctx.arc(cx, cy, rg.rInner, 0, Math.PI * 2, true);
    }
    ctx.fillStyle = rg.color;
    ctx.fill();
  }

  // Mạch gạch đồng tâm & hướng tâm
  ctx.strokeStyle = 'rgba(60, 50, 42, 0.32)';
  ctx.lineWidth = 2;
  for (let r = 80; r <= 880; r += 65) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
    ctx.lineTo(cx + Math.cos(a) * 900, cy + Math.sin(a) * 900);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// --- Bức tường gỗ nhị phân 0/1 & diềm hồi văn phát sáng ----------------------
function makeBinaryWallTextures(): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const w = 1024;
  const h = 512;
  const cMap = document.createElement('canvas');
  cMap.width = w;
  cMap.height = h;
  const ctxM = cMap.getContext('2d')!;

  const cEm = document.createElement('canvas');
  cEm.width = w;
  cEm.height = h;
  const ctxE = cEm.getContext('2d')!;

  // Nền gỗ óc chó nâu trầm có vân dọc nhẹ
  const grad = ctxM.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#3D2314');
  grad.addColorStop(0.5, '#4E2E1B');
  grad.addColorStop(1, '#331D10');
  ctxM.fillStyle = grad;
  ctxM.fillRect(0, 0, w, h);

  ctxE.fillStyle = '#000000';
  ctxE.fillRect(0, 0, w, h);

  // Chia pano gỗ dọc
  ctxM.strokeStyle = 'rgba(20, 10, 4, 0.55)';
  ctxM.lineWidth = 3;
  for (let x = 64; x < w; x += 64) {
    ctxM.beginPath();
    ctxM.moveTo(x, 60);
    ctxM.lineTo(x, h);
    ctxM.stroke();
  }

  // Diềm hồi văn (Greek key / meander) phát sáng ở mép trên (y = 14..52)
  const drawMeander = (ctx: CanvasRenderingContext2D, color: string, glow: boolean) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = glow ? 5 : 4;
    if (glow) {
      ctx.shadowColor = '#FFA000';
      ctx.shadowBlur = 12;
    }
    ctx.strokeRect(12, 10, w - 24, 42);
    const step = 48;
    for (let x = 24; x < w - 48; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 44);
      ctx.lineTo(x, 18);
      ctx.lineTo(x + 30, 18);
      ctx.lineTo(x + 30, 36);
      ctx.lineTo(x + 14, 36);
      ctx.lineTo(x + 14, 26);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawMeander(ctxM, '#FFD57E', false);
  drawMeander(ctxE, '#FFB830', true);

  // Các cột ký hiệu nhị phân 0 (vòng tròn) và 1 (vạch đứng) phát sáng hai bên tượng
  // Chừa khoảng giữa (x = 380..644) phía sau tượng bán thân thoáng hơn một chút để tôn tượng
  let seed = 19101986;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const cols = 16;
  const rows = 7;
  for (let c = 0; c < cols; c++) {
    const cx = 32 + c * 64;
    const isCenterBehindStatue = c >= 6 && c <= 9;
    for (let r = 0; r < rows; r++) {
      const cy = 92 + r * 58;
      // Ở vùng ngay sau đầu tượng, giảm mật độ để đầu tượng nổi bật
      if (isCenterBehindStatue && r >= 1 && r <= 4 && rnd() < 0.55) continue;

      const isZero = (c + r) % 2 === 0 || rnd() > 0.48;
      const drawGlyph = (ctx: CanvasRenderingContext2D, stroke: string, glow: boolean) => {
        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.fillStyle = stroke;
        ctx.lineWidth = glow ? 6 : 5;
        if (glow) {
          ctx.shadowColor = '#FF9900';
          ctx.shadowBlur = 14;
        }
        if (isZero) {
          ctx.beginPath();
          ctx.arc(cx, cy, 16, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.roundRect(cx - 4, cy - 18, 8, 36, 3);
          ctx.fill();
        }
        ctx.restore();
      };
      drawGlyph(ctxM, '#FFE08A', false);
      drawGlyph(ctxE, '#FFAE19', true);
    }
  }

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const emissiveMap = new THREE.CanvasTexture(cEm);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = 4;

  return { map, emissiveMap };
}

// --- Biển đồng trên bệ tượng GS. Tạ Quang Bửu --------------------------------
function drawStatuePlaque(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#C89D28';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#5A410A';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#241705';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 46px Arial, sans-serif';
  ctx.fillText('GIÁO SƯ TẠ QUANG BỬU', w / 2, h * 0.28);
  ctx.font = '800 38px Arial, sans-serif';
  ctx.fillText('(1910 – 1986)', w / 2, h * 0.56);
  ctx.font = '700 26px Arial, sans-serif';
  ctx.fillText('HIỆU TRƯỞNG ĐẦU TIÊN TRƯỜNG ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.82);
}

// --- Bảng từ vựng Hán ngữ chuyên đề Thư viện & Khoa học ----------------------
function drawLibraryVocabBoard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#1E2D24';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#C9A227';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFD166';
  ctx.font = '900 54px Arial, sans-serif';
  ctx.fillText('谢光宝图书馆 · 常用词汇', w / 2, h * 0.14);

  ctx.fillStyle = '#F5F5F0';
  ctx.font = '700 40px Arial, sans-serif';
  ctx.fillText('图书馆  túshūguǎn — Thư viện', w / 2, h * 0.34);
  ctx.fillText('科学  kēxué — Khoa học · 技术  jìshù — Kỹ thuật', w / 2, h * 0.52);
  ctx.fillText('借书  jièshū — Mượn sách · 阅读  yuèdú — Đọc sách', w / 2, h * 0.70);

  ctx.fillStyle = '#A8E6CF';
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText('Bấm vào bảng hoặc tượng GS. Tạ Quang Bửu (phím E) để nghe phát âm', w / 2, h * 0.88);
}

// --- Biển tên Quầy thông tin Thư viện ----------------------------------------
function drawInfoDeskSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#3B2214';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#FFE08A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 46px Arial, sans-serif';
  ctx.fillText('咨询与借书处 · QUẦY THÔNG TIN', w / 2, h * 0.5);
}

export default function LibraryLobby({
  activeSeatId = null,
  nearestSeatId = null,
  onObjectClick,
}: LibraryLobbyProps) {
  const floorTex = useMemo(() => makeSunburstFloorTexture(), []);
  const binaryWall = useMemo(() => makeBinaryWallTextures(), []);

  useEffect(() => {
    return () => {
      floorTex.dispose();
      binaryWall.map.dispose();
      binaryWall.emissiveMap.dispose();
    };
  }, [floorTex, binaryWall]);

  const clickObj = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onObjectClick?.(id);
  };
  const hover = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const leave = () => {
    document.body.style.cursor = 'auto';
  };

  // 4 trụ inox mạ vàng quanh tượng GS. Tạ Quang Bửu
  const stanchions: Array<[number, number]> = [
    [-1.18, -1.25],
    [1.18, -1.25],
    [-1.18, -2.95],
    [1.18, -2.95],
  ];

  return (
    <group>
      {/* Ánh sáng ấm đặc trưng của Sảnh tầng 1 Thư viện Tạ Quang Bửu */}
      <pointLight position={[0, 3.6, -1.6]} color="#FFE2A8" intensity={1.8} distance={12} />
      <pointLight position={[-3.2, 3.4, 0.5]} color="#FFF3D6" intensity={1.1} distance={10} />
      <pointLight position={[3.2, 3.4, 0.5]} color="#FFF3D6" intensity={1.1} distance={10} />

      {/* Sàn đá hoa văn rẻ quạt 12 × 8.4 m */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[12, 0.1, 8.4]} />
        <meshStandardMaterial map={floorTex} roughness={0.35} metalness={0.08} />
      </mesh>

      {/* Trần sảnh cao 4.2 m + gờ thông tầng lửng (mezzanine ring) */}
      <mesh position={[0, 4.25, 0]}>
        <boxGeometry args={[12.2, 0.12, 8.6]} />
        <meshStandardMaterial color="#FAF7F0" roughness={0.85} />
      </mesh>
      {/* Dải đèn âm trần phát sáng ấm */}
      {[-3.2, 0, 3.2].map((lx) => (
        <mesh key={`ceil-light-${lx}`} position={[lx, 4.18, 0]}>
          <boxGeometry args={[0.45, 0.02, 5.8]} />
          <meshStandardMaterial color="#FFFDF6" emissive="#FFE4A3" emissiveIntensity={0.95} />
        </mesh>
      ))}

      {/* Tường bắc (hậu cảnh), tường tây, tường đông, tường nam (cửa kính ra sân) */}
      <mesh position={[0, 2.1, -4.15]} receiveShadow>
        <boxGeometry args={[12.2, 4.2, 0.2]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.88} />
      </mesh>
      <mesh position={[-5.9, 2.1, 0]} receiveShadow>
        <boxGeometry args={[0.2, 4.2, 8.4]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.88} />
      </mesh>
      <mesh position={[5.9, 2.1, 0]} receiveShadow>
        <boxGeometry args={[0.2, 4.2, 8.4]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.88} />
      </mesh>
      {/* Tường nam có khung cửa kính lớn nhìn ra quảng trường Thư viện */}
      <mesh position={[-3.6, 2.1, 4.15]}>
        <boxGeometry args={[4.8, 4.2, 0.2]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.88} />
      </mesh>
      <mesh position={[3.6, 2.1, 4.15]}>
        <boxGeometry args={[4.8, 4.2, 0.2]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.88} />
      </mesh>
      <mesh position={[0, 3.55, 4.15]}>
        <boxGeometry args={[2.4, 1.3, 0.2]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.88} />
      </mesh>
      {/* Cửa kính sảnh chính phía nam */}
      <mesh position={[0, 1.45, 4.12]}>
        <boxGeometry args={[2.3, 2.9, 0.06]} />
        <meshStandardMaterial color="#9CC5D8" roughness={0.2} metalness={0.15} transparent opacity={0.55} />
      </mesh>

      {/* 4 cột trụ tròn ốp đá kem trong sảnh */}
      {[
        [-4.2, -3.2],
        [4.2, -3.2],
        [-4.2, 2.6],
        [4.2, 2.6],
      ].map(([cx, cz], idx) => (
        <group key={`lobby-col-${idx}`} position={[cx, 0, cz]}>
          <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.34, 4.2, 20]} />
            <meshStandardMaterial color={COLUMN_STONE} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.38, 0.4, 0.24, 20]} />
            <meshStandardMaterial color="#8A8275" roughness={0.75} />
          </mesh>
        </group>
      ))}

      {/* =====================================================================
          BỨC TƯỜNG NHỊ PHÂN 0/1 PHÁT SÁNG (Hậu cảnh tượng GS. Tạ Quang Bửu)
          ===================================================================== */}
      <group position={[0, 0, -3.96]}>
        {/* Khung gỗ viền ngoài */}
        <mesh position={[0, 2.0, -0.04]} receiveShadow>
          <boxGeometry args={[7.8, 3.85, 0.08]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
        </mesh>
        {/* Mặt tường gỗ óc chó kèm họa tiết 0/1 & hồi văn phát sáng */}
        <mesh
          position={[0, 2.0, 0.02]}
          onClick={clickObj('statue')}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          <planeGeometry args={[7.4, 3.65]} />
          <meshStandardMaterial
            map={binaryWall.map}
            emissiveMap={binaryWall.emissiveMap}
            emissive={new THREE.Color(AMBER_GLOW)}
            emissiveIntensity={0.95}
            roughness={0.5}
          />
        </mesh>
        {/* Các vòng tròn 0 và thanh 1 nổi 3D phát sáng để tạo chiều sâu thật */}
        {[-3.1, -2.4, -1.7, 1.7, 2.4, 3.1].map((bx, i) => (
          <group key={`bin3d-${i}`} position={[bx, 2.1, 0.05]}>
            <mesh position={[0, 0.55, 0]}>
              <torusGeometry args={[0.14, 0.024, 12, 24]} />
              <meshStandardMaterial
                color="#FFE599"
                emissive="#FFA812"
                emissiveIntensity={1.1}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[0.05, 0.3, 0.03]} />
              <meshStandardMaterial
                color="#FFE599"
                emissive="#FFA812"
                emissiveIntensity={1.1}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, -0.75, 0]}>
              <torusGeometry args={[0.14, 0.024, 12, 24]} />
              <meshStandardMaterial
                color="#FFE599"
                emissive="#FFA812"
                emissiveIntensity={1.1}
                roughness={0.3}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* =====================================================================
          TƯỢNG BÁN THÂN ĐỒNG GS. TẠ QUANG BỬU (1910–1986)
          ===================================================================== */}
      <group
        position={[LIBRARY_LOBBY.statue.x, 0, LIBRARY_LOBBY.statue.z]}
        onClick={clickObj('statue')}
        onPointerOver={hover}
        onPointerOut={leave}
      >
        {/* Bậc đá nguyên khối đen xám dưới chân bệ */}
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.45, 0.16, 1.25]} />
          <meshStandardMaterial color="#2A2B2E" roughness={0.5} metalness={0.15} />
        </mesh>
        {/* Bệ gỗ gụ cao 1,35 m có phào chỉ trên/dưới */}
        <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.82, 1.32, 0.74]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.48, 0]} castShadow>
          <boxGeometry args={[0.92, 0.08, 0.84]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.92, 0.08, 0.84]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.5} />
        </mesh>

        {/* Biển đồng khắc tên GS. Tạ Quang Bửu ở mặt trước bệ (+Z) */}
        <LabelPlane
          textureKey="tqb-statue-plaque"
          canvasW={768}
          canvasH={320}
          draw={drawStatuePlaque}
          size={[0.68, 0.28]}
          position={[0, 0.96, 0.385]}
          transparent={false}
        />

        {/* Đế đồng dưới tượng bán thân */}
        <mesh position={[0, 1.56, 0]} castShadow>
          <boxGeometry args={[0.56, 0.08, 0.44]} />
          <meshStandardMaterial color={BRONZE_DARK} roughness={0.35} metalness={0.68} />
        </mesh>

        {/* Tượng bán thân đồng: vai + áo vest + cà vạt + cổ + đầu + vầng trán cao */}
        <group position={[0, 1.6, 0]}>
          {/* Ngực & hai vai áo vest */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.74, 0.42, 0.38]} />
            <meshStandardMaterial color={BRONZE_DARK} roughness={0.32} metalness={0.72} />
          </mesh>
          {/* Hai bờ vai bo tròn */}
          {[-0.36, 0.36].map((sx) => (
            <mesh key={`sh-${sx}`} position={[sx, 0.26, 0]} castShadow>
              <sphereGeometry args={[0.16, 16, 14]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.32} metalness={0.72} />
            </mesh>
          ))}
          {/* Ve áo vest & cà vạt nổi */}
          <mesh position={[-0.1, 0.24, 0.195]} rotation={[0, 0, 0.22]}>
            <boxGeometry args={[0.07, 0.32, 0.03]} />
            <meshStandardMaterial color="#59412A" roughness={0.3} metalness={0.74} />
          </mesh>
          <mesh position={[0.1, 0.24, 0.195]} rotation={[0, 0, -0.22]}>
            <boxGeometry args={[0.07, 0.32, 0.03]} />
            <meshStandardMaterial color="#59412A" roughness={0.3} metalness={0.74} />
          </mesh>
          <mesh position={[0, 0.22, 0.198]}>
            <boxGeometry args={[0.055, 0.28, 0.025]} />
            <meshStandardMaterial color="#684D33" roughness={0.28} metalness={0.76} />
          </mesh>
          {/* Cổ */}
          <mesh position={[0, 0.49, 0.01]} castShadow>
            <cylinderGeometry args={[0.105, 0.12, 0.16, 18]} />
            <meshStandardMaterial color={BRONZE_DARK} roughness={0.32} metalness={0.72} />
          </mesh>
          {/* Đầu & khuôn mặt điêu khắc */}
          <mesh position={[0, 0.69, 0.02]} scale={[0.92, 1.12, 0.98]} castShadow>
            <sphereGeometry args={[0.19, 24, 20]} />
            <meshStandardMaterial color={BRONZE_DARK} roughness={0.3} metalness={0.74} />
          </mesh>
          {/* Mái tóc chải ngược & vầng trán cao đặc trưng */}
          <mesh position={[0, 0.78, -0.01]} scale={[0.95, 0.85, 1.0]}>
            <sphereGeometry args={[0.185, 20, 16]} />
            <meshStandardMaterial color="#3B2A1B" roughness={0.38} metalness={0.68} />
          </mesh>
          {/* Chân mày, sống mũi & hai tai */}
          <mesh position={[0, 0.73, 0.195]}>
            <boxGeometry args={[0.16, 0.028, 0.04]} />
            <meshStandardMaterial color="#59412A" roughness={0.3} metalness={0.75} />
          </mesh>
          <mesh position={[0, 0.67, 0.21]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.038, 0.095, 0.05]} />
            <meshStandardMaterial color="#59412A" roughness={0.3} metalness={0.75} />
          </mesh>
          {[-0.175, 0.175].map((ex) => (
            <mesh key={`ear-${ex}`} position={[ex, 0.68, 0.01]}>
              <boxGeometry args={[0.03, 0.08, 0.05]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.32} metalness={0.72} />
            </mesh>
          ))}
        </group>
      </group>

      {/* =====================================================================
          4 TRỤ INOX MẠ VÀNG + DÂY NHUNG ĐỎ BAO QUANH TƯỢNG
          ===================================================================== */}
      {stanchions.map(([sx, sz], idx) => (
        <group key={`stanchion-${idx}`} position={[sx, 0, sz]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 0.06, 20]} />
            <meshStandardMaterial color={GOLD_BRASS} roughness={0.25} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.028, 0.028, 0.9, 14]} />
            <meshStandardMaterial color={GOLD_BRASS} roughness={0.22} metalness={0.88} />
          </mesh>
          <mesh position={[0, 0.96, 0]}>
            <sphereGeometry args={[0.055, 14, 12]} />
            <meshStandardMaterial color={GOLD_BRASS} roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Dây nhung đỏ nối mặt trước và hai bên */}
      <mesh position={[0, 0.82, -1.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 2.32, 12]} />
        <meshStandardMaterial color={VELVET_RED} roughness={0.75} />
      </mesh>
      <mesh position={[-1.18, 0.82, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 1.66, 12]} />
        <meshStandardMaterial color={VELVET_RED} roughness={0.75} />
      </mesh>
      <mesh position={[1.18, 0.82, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 1.66, 12]} />
        <meshStandardMaterial color={VELVET_RED} roughness={0.75} />
      </mesh>

      {/* Hai chậu cây cảnh đối xứng hai bên bức tường nhị phân */}
      {[-2.4, 2.4].map((px) => (
        <group key={`plant-${px}`} position={[px, 0, -3.2]}>
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.2, 0.56, 16]} />
            <meshStandardMaterial color="#D8CFC0" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.85, 0]} castShadow>
            <sphereGeometry args={[0.42, 14, 12]} />
            <meshStandardMaterial color="#2E5E36" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* =====================================================================
          QUẦY THÔNG TIN & MƯỢN SÁCH (Bên trái sảnh, x = -3.6, z = -0.6)
          ===================================================================== */}
      <group
        position={[LIBRARY_LOBBY.infoDesk.x, 0, LIBRARY_LOBBY.infoDesk.z]}
        onClick={clickObj('info-desk')}
        onPointerOver={hover}
        onPointerOut={leave}
      >
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.04, 1.3]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.65} />
        </mesh>
        <mesh position={[0, 1.07, 0]} castShadow>
          <boxGeometry args={[1.72, 0.06, 1.42]} />
          <meshStandardMaterial color="#E8DFCE" roughness={0.4} />
        </mesh>
        <LabelPlane
          textureKey="lobby-info-desk-sign"
          canvasW={512}
          canvasH={128}
          draw={drawInfoDeskSign}
          size={[1.45, 0.36]}
          position={[0.81, 0.62, 0]}
          rotation={[0, Math.PI / 2, 0]}
          transparent={false}
        />
        {/* Chồng sách tham khảo trên quầy */}
        {['#A54432', '#1F5C8A', '#2E7D32'].map((col, idx) => (
          <mesh key={`book-${idx}`} position={[0.2, 1.12 + idx * 0.045, -0.3]}>
            <boxGeometry args={[0.28, 0.04, 0.2]} />
            <meshStandardMaterial color={col} roughness={0.75} />
          </mesh>
        ))}
      </group>

      {/* =====================================================================
          BẢNG TỪ VỰNG HÁN NGỮ THƯ VIỆN TẠ QUANG BỬU (Bên phải sảnh, x = 3.6, z = -0.6)
          ===================================================================== */}
      <group
        position={[LIBRARY_LOBBY.vocabBoard.x, 0, LIBRARY_LOBBY.vocabBoard.z]}
        rotation={[0, -Math.PI / 5, 0]}
        onClick={clickObj('vocab-board')}
        onPointerOver={hover}
        onPointerOut={leave}
      >
        {/* Chân giá đỡ gỗ */}
        <mesh position={[-0.65, 0.95, 0]} castShadow>
          <boxGeometry args={[0.08, 1.9, 0.08]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
        <mesh position={[0.65, 0.95, 0]} castShadow>
          <boxGeometry args={[0.08, 1.9, 0.08]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.45, 0]} castShadow>
          <boxGeometry args={[1.6, 1.1, 0.08]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
        </mesh>
        <LabelPlane
          textureKey="lobby-vocab-board"
          canvasW={1024}
          canvasH={640}
          draw={drawLibraryVocabBoard}
          size={[1.48, 0.96]}
          position={[0, 1.45, 0.055]}
          transparent={false}
        />
      </group>

      {/* =====================================================================
          KHU VỰC BÀN GHẾ NGỒI HỌC TƯƠNG TÁC (PR8 Local Interactive Seating)
          2 bàn đọc + 4 ghế ngồi học (tqb-1f-t1-s1..s2, tqb-1f-t2-s1..s2)
          ===================================================================== */}
      <LibraryStudyArea
        activeSeatId={activeSeatId}
        nearestSeatId={nearestSeatId}
        onSelectSeat={(seatId) => onObjectClick?.(`seat:${seatId}`)}
      />
    </group>
  );
}
