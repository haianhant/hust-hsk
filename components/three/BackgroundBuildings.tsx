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

import { ImprovedTree } from './Trees';
import { LabelPlane } from './TextPlate';

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

type Facing = 's' | 'n' | 'e' | 'w';

// Các giảng đường & tòa nhà học tập quanh khuôn viên (C3, C4, C5, D3, D4, D5, D6, D8, D9):
// Giữ nguyên tâm x/z và kích thước footprint w/d đã đối chiếu an toàn với ROADS/LEGS/colliders;
// nâng cấp mặt đứng chuẩn giảng đường Bách khoa: tầng 1 ốp vàng kem, các tầng trên trắng kem,
// dải lan can hành lang đỏ HUST (#D22630), đố cửa sổ trắng, gờ mái và biển tên tòa nhà.
const BUILDINGS: Array<{
  code: string; x: number; z: number; w: number; d: number; h: number; face: Facing; tone: number;
}> = [
  // Hàng bắc (dãy nhà C10, C4, C5, C3), sau lưng C1 / dọc phía bắc Đường Tình Yêu.
  { code: 'C10', x: -24, z: -70, w: 11, d: 8, h: 10.5, face: 's', tone: 1 },
  { code: 'C4', x: -8, z: -70, w: 14, d: 8, h: 10.5, face: 's', tone: 0 },
  { code: 'C5', x: 14, z: -71, w: 12, d: 7, h: 10.5, face: 's', tone: 1 },
  { code: 'C3', x: 34, z: -70, w: 16, d: 9, h: 11.2, face: 's', tone: 2 },
  // Phía đông: khu giảng đường D3, D5, D7, D9 phía đông Thư viện & Quảng trường TĐN.
  { code: 'D3', x: 64, z: -2, w: 10, d: 8, h: 10.2, face: 'w', tone: 3 },
  { code: 'D5', x: 58, z: -52, w: 12, d: 8, h: 10.2, face: 'w', tone: 0 },
  { code: 'D7', x: 62, z: 50, w: 12, d: 8, h: 10.8, face: 'w', tone: 2 },
  { code: 'D9', x: 62, z: 62, w: 14, d: 8, h: 10.8, face: 'w', tone: 1 },
  // Phía nam-tây & tây Hồ Tiền: khu giảng đường D6, D8, D4.
  { code: 'D8', x: -58, z: 72, w: 16, d: 9, h: 10.8, face: 'n', tone: 2 },
  { code: 'D6', x: -84, z: 48, w: 10, d: 7, h: 9.8, face: 'e', tone: 3 },
  { code: 'D4', x: -93, z: -38, w: 6, d: 8, h: 9.8, face: 'e', tone: 0 },
];

// Cầu nối trên cao có mái che (Covered Skybridges) giữa các dãy giảng đường C & D
function LectureSkybridges() {
  const bridges: Array<{ x: number; z: number; w: number; d: number; y: number }> = [
    // Nối C10 (-18.5) ↔ C4 (-15)
    { x: -16.75, z: -70, w: 3.8, d: 2.2, y: 3.6 },
    // Nối C4 (-1) ↔ C5 (8)
    { x: 3.5, z: -70.5, w: 9.2, d: 2.2, y: 3.6 },
    // Nối C5 (20) ↔ C3 (26)
    { x: 23, z: -70.5, w: 6.2, d: 2.2, y: 3.6 },
    // Nối D7 (z=54) ↔ D9 (z=58)
    { x: 62, z: 56, w: 2.4, d: 4.4, y: 3.6 },
  ];
  return (
    <group>
      {bridges.map((br, idx) => (
        <group key={`skybridge-${idx}`} position={[br.x, br.y, br.z]}>
          {/* Sàn cầu nối bê tông trắng */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[br.w, 0.28, br.d]} />
            <meshStandardMaterial color="#F2EFE6" roughness={0.88} />
          </mesh>
          {/* Lan can đỏ HUST 2 bên cầu nối */}
          <mesh position={[0, 0.55, br.d / 2 - 0.08]}>
            <boxGeometry args={[br.w, 0.72, 0.08]} />
            <meshStandardMaterial color={HUST_RAIL_RED} roughness={0.55} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.55, -br.d / 2 + 0.08]}>
            <boxGeometry args={[br.w, 0.72, 0.08]} />
            <meshStandardMaterial color={HUST_RAIL_RED} roughness={0.55} metalness={0.25} />
          </mesh>
          {/* Mái che cầu nối */}
          <mesh position={[0, 2.55, 0]} castShadow>
            <boxGeometry args={[br.w + 0.2, 0.18, br.d + 0.35]} />
            <meshStandardMaterial color={ROOF_TONE} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BackgroundBuilding({ b }: { b: (typeof BUILDINGS)[number] }) {
  const along = b.face === 's' || b.face === 'n' ? b.w : b.d;
  const count = Math.max(3, Math.floor(along / 3));
  const floors = 3;
  const floorH = b.h / floors;
  const wins: Array<{ u: number; y: number }> = [];
  for (let r = 0; r < floors; r++) {
    for (let k = 0; k < count; k++) {
      wins.push({
        u: -along / 2 + ((k + 0.5) / count) * along,
        y: (r + 0.56) * floorH,
      });
    }
  }
  const faceOffset = ((): [number, number, number] => {
    switch (b.face) {
      case 's': return [0, 0, b.d / 2 + 0.04];
      case 'n': return [0, 0, -b.d / 2 - 0.04];
      case 'e': return [b.w / 2 + 0.04, 0, 0];
      case 'w': return [-b.w / 2 - 0.04, 0, 0];
    }
  })();
  const faceRotY = b.face === 's' ? 0 : b.face === 'n' ? Math.PI : b.face === 'e' ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[b.x, 0, b.z]}>
      {/* Thân nhà chính màu trắng kem */}
      <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial color={WALL_TONES[b.tone]} roughness={0.9} />
      </mesh>
      {/* Tầng 1 ốp màu vàng kem nhạt đặc trưng giảng đường Bách khoa */}
      <mesh position={[0, floorH * 0.48, 0]} receiveShadow>
        <boxGeometry args={[b.w + 0.06, floorH * 0.96, b.d + 0.06]} />
        <meshStandardMaterial color={PLINTH_BEIGE} roughness={0.92} />
      </mesh>
      {/* Mái phẳng + gờ parapet nhô nhẹ khỏi tường */}
      <mesh position={[0, b.h + 0.18, 0]} castShadow>
        <boxGeometry args={[b.w + 0.6, 0.36, b.d + 0.6]} />
        <meshStandardMaterial color={ROOF_TONE} roughness={0.95} />
      </mesh>
      {/* Mặt chính: các dải hành lang & lan can đỏ HUST + hệ cửa sổ có đố trắng + biển tên tòa */}
      <group position={[faceOffset[0], 0, faceOffset[2]]} rotation-y={faceRotY}>
        {[1, 2].map((fl) => (
          <group key={`rail-${fl}`} position={[0, fl * floorH, 0]}>
            {/* Dầm sàn hành lang trắng */}
            <mesh position={[0, -0.08, 0.05]}>
              <boxGeometry args={[along - 0.4, 0.18, 0.14]} />
              <meshStandardMaterial color={WINDOW_FRAME} roughness={0.85} />
            </mesh>
            {/* Dải lan can kim loại đỏ HUST */}
            <mesh position={[0, 0.42, 0.08]}>
              <boxGeometry args={[along - 0.6, 0.12, 0.06]} />
              <meshStandardMaterial color={HUST_RAIL_RED} roughness={0.55} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0.72, 0.08]}>
              <boxGeometry args={[along - 0.6, 0.06, 0.06]} />
              <meshStandardMaterial color={HUST_RAIL_RED} roughness={0.55} metalness={0.25} />
            </mesh>
          </group>
        ))}

        {/* Cửa sổ các tầng */}
        {wins.map((wn, i) => (
          <group key={`win-${i}`} position={[wn.u, wn.y, 0.02]}>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[1.42, 1.22]} />
              <meshStandardMaterial color={WINDOW_FRAME} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[1.24, 1.04]} />
              <meshStandardMaterial color={WINDOW_TONE} roughness={0.35} metalness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Biển tên giảng đường (C3, C4, C5, D3, D5, D6, D8, D9...) gắn gần cổ mái */}
        <LabelPlane
          textureKey={`bldg-sign-${b.code}`}
          canvasW={256}
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
            ctx.font = '900 72px Arial, sans-serif';
            ctx.fillText(b.code, w / 2, h / 2 + 4);
          }}
          size={[1.5, 0.75]}
          position={[-along / 2 + 1.2, b.h - 0.65, 0.09]}
          transparent={false}
        />
      </group>
    </group>
  );
}

// --- Cây nền ở rìa campus (tránh footprint khối nhà phụ + đường + hồ) --------
// Hàng bắc — ĐÃ DỜI (đợt r2p-A mục 1, quyết theo hình học, xem ghi chú cuối
// file): z = -72,5 → -62, x -28..80 cách 12 m — phía TRƯỚC (nam) các khối
// nhà bắc, phía đông C1, nhìn thấy được từ sân/đường tình yêu.
const BACKGROUND_TREES: Array<{ x: number; z: number; trunkH: number; canopyR: number }> = [
  // Hàng bắc z = -62 (trước mặt nam 3 khối nhà bắc, đông C1).
  { x: -28, z: -62, trunkH: 2.6, canopyR: 1.6 },
  { x: -16, z: -62, trunkH: 3.0, canopyR: 1.8 },
  { x: -4, z: -62, trunkH: 2.4, canopyR: 1.5 },
  { x: 8, z: -62, trunkH: 2.8, canopyR: 1.7 },
  { x: 20, z: -62, trunkH: 2.5, canopyR: 1.5 },
  { x: 32, z: -62, trunkH: 3.1, canopyR: 1.9 },
  { x: 44, z: -62, trunkH: 2.7, canopyR: 1.6 },
  { x: 56, z: -62, trunkH: 2.4, canopyR: 1.5 },
  { x: 68, z: -62, trunkH: 3.0, canopyR: 1.8 },
  { x: 80, z: -62, trunkH: 2.6, canopyR: 1.6 },
  // Hàng đông x = 88 (né quảng trường Trần Đại Nghĩa z -18..6).
  { x: 88, z: -64, trunkH: 2.8, canopyR: 1.7 },
  { x: 88, z: -52, trunkH: 2.5, canopyR: 1.5 },
  { x: 88, z: -40, trunkH: 3.0, canopyR: 1.8 },
  { x: 88, z: -28, trunkH: 2.6, canopyR: 1.6 },
  { x: 88, z: 20, trunkH: 2.7, canopyR: 1.6 },
  { x: 88, z: 32, trunkH: 2.4, canopyR: 1.5 },
  { x: 88, z: 44, trunkH: 3.0, canopyR: 1.8 },
  { x: 88, z: 56, trunkH: 2.6, canopyR: 1.6 },
  { x: 88, z: 68, trunkH: 2.8, canopyR: 1.7 },
  // Hàng nam z = 80 (né hồ x -24,5..20,5 + khối nhà phụ nam x -66..-50).
  { x: -80, z: 80, trunkH: 2.7, canopyR: 1.6 },
  { x: -68, z: 80, trunkH: 2.5, canopyR: 1.5 },
  { x: -44, z: 80, trunkH: 3.0, canopyR: 1.8 },
  { x: -32, z: 80, trunkH: 2.6, canopyR: 1.6 },
  { x: 28, z: 80, trunkH: 2.8, canopyR: 1.7 },
  { x: 40, z: 80, trunkH: 2.5, canopyR: 1.5 },
  { x: 52, z: 80, trunkH: 3.0, canopyR: 1.8 },
  { x: 64, z: 80, trunkH: 2.6, canopyR: 1.6 },
  { x: 76, z: 80, trunkH: 2.7, canopyR: 1.6 },
  // Hàng tây x = -92 (né cổng Parabol z 3,5..16,5 và đường tình yêu).
  { x: -92, z: -60, trunkH: 2.8, canopyR: 1.7 },
  { x: -92, z: -48, trunkH: 2.5, canopyR: 1.5 },
  { x: -92, z: -36, trunkH: 3.0, canopyR: 1.8 },
  { x: -92, z: 36, trunkH: 2.6, canopyR: 1.6 },
  { x: -92, z: 48, trunkH: 2.8, canopyR: 1.7 },
  { x: -92, z: 60, trunkH: 2.5, canopyR: 1.5 },
  { x: -92, z: 72, trunkH: 3.0, canopyR: 1.8 },
  // Lấp góc trống: đông-bắc + nam.
  { x: 72, z: -44, trunkH: 2.9, canopyR: 1.7 },
  { x: -70, z: 60, trunkH: 2.7, canopyR: 1.6 },
  { x: 30, z: 70, trunkH: 2.8, canopyR: 1.7 },
];

// --- Đèn đường mảnh dọc tuyến hiện có (ngoài mép đường ≥ 1 m) ----------------
const LAMPS: Array<{ x: number; z: number }> = [
  // Dọc đường tình yêu, phía bắc đường (mép đường z = -18,5), xen giữa cây cũ.
  { x: -32, z: -19.8 }, { x: -8, z: -19.8 }, { x: 16, z: -19.8 },
  { x: 40, z: -19.8 }, { x: 64, z: -19.8 },
  // Dọc đường ven hồ phía đông (mép đường x = 27), ngoài bờ kè.
  { x: 28, z: -10 }, { x: 28, z: 10 }, { x: 28, z: 60 }, { x: 28, z: 78 },
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
          ctx.font = '900 28px Arial, sans-serif';
          ctx.fillText('SƠ ĐỒ CHỈ DẪN HUST', 24, 42);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 26px Arial, sans-serif';
          ctx.fillText('⬆ Nhà C1 · Cầu đỏ C9', 24, 92);
          ctx.fillText('➡ Thư viện TQB · Hồ Tiền', 24, 138);
          ctx.fillText('⬅ Cổng Parabol (Giải Phóng)', 24, 184);
        }}
        size={[1.48, 0.62]}
        position={[0, 2.1, 0.042]}
        transparent={false}
      />
    </group>
  );
}

// --- Nhà để xe sinh viên có mái che tôn xanh (ngoài đường đi, ở (-66, 22)) ----
function BikeParkingShed() {
  return (
    <group position={[-66, 0, 22]}>
      {/* Nền bê tông nhà xe */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[9.2, 0.06, 4.2]} />
        <meshStandardMaterial color="#9E9E98" roughness={0.95} />
      </mesh>
      {/* 6 cột thép đỡ mái */}
      {[-4.0, 0, 4.0].map((px) =>
        [-1.7, 1.7].map((pz) => (
          <mesh key={`shed-col-${px}-${pz}`} position={[px, 1.25, pz]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 2.5, 8]} />
            <meshStandardMaterial color="#3F474E" roughness={0.5} metalness={0.5} />
          </mesh>
        )),
      )}
      {/* Mái vòm tôn xanh dương nhạt */}
      <mesh position={[0, 2.55, 0]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[9.6, 0.12, 4.6]} />
        <meshStandardMaterial color="#2E6B9E" roughness={0.65} metalness={0.25} />
      </mesh>
      {/* Biển "NHÀ ĐỂ XE SINH VIÊN" */}
      <LabelPlane
        textureKey="bike-shed-sign"
        canvasW={512}
        canvasH={96}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1C5C3A';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 5;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 38px Arial, sans-serif';
          ctx.fillText('NHÀ ĐỂ XE SINH VIÊN · 停车场', w / 2, h / 2);
        }}
        size={[3.2, 0.6]}
        position={[0, 2.35, -2.32]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
    </group>
  );
}

export default function BackgroundBuildings() {
  return (
    <group>
      {BUILDINGS.map((b, i) => (
        <BackgroundBuilding key={`bg-building-${i}`} b={b} />
      ))}
      <LectureSkybridges />
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
      <CampusSignpost x={-49.5} z={14.2} rotationY={Math.PI} />
      <CampusSignpost x={19.5} z={-19.5} rotationY={0} />
      <BikeParkingShed />
      {/* Sân lát nhỏ + ghế ngắm đường tình yêu (x 13..19, z -12,3..-9,3:
          ngoài mép đường z = -13,5; y = 0,025, trên cỏ y = 0, không chồng mặt nào). */}
      <mesh rotation-x={-Math.PI / 2} position={[16, 0.025, -10.8]} receiveShadow>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color={PAVE_TONE} roughness={0.95} />
      </mesh>
      <BgBench x={16} z={-10.8} rotationY={Math.PI} />
      {/* Ghế bờ tây hồ bổ sung, quay mặt ra hồ (như ghế hồ hiện có). */}
      <BgBench x={-27.5} z={45} rotationY={Math.PI / 2} />
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
