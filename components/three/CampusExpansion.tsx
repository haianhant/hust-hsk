// ---------------------------------------------------------------------------
// CampusExpansion.tsx — Hoàn thiện toàn bộ khuôn viên Đại học Bách khoa Hà Nội
// (Wave 2 — Trụ cột 1):
//   1. Tòa nhà C7 (Tổ hợp giảng đường - hành chính trung tâm 7 tầng hiện đại)
//   2. Trung tâm Hợp tác Việt – Đức (VDZ) phía Bắc Hồ Tiền
//   3. Khu Liên hợp Thể thao Bách Khoa (Sân bóng rổ/thể chất + Khán đài + Nhà thi đấu)
//   4. Khu Ký túc xá B6 – B10 & Căng-tin Sinh viên (Nhà ăn + bàn ghế dù che)
//   5. Cổng Nam Tạ Quang Bửu / Lê Thanh Nghị
//   6. Nhà chờ Xe buýt Cổng Parabol (Giải Phóng), Cột đèn nến Quảng trường TĐN
//      và Hệ thống Tường rào bao quanh 4 tuyến phố (Đại Cồ Việt, Giải Phóng,
//      Trần Đại Nghĩa, Tạ Quang Bửu).
// Mọi tọa độ đối chiếu từ lib/campus.ts, tuân thủ chống Z-fighting và giải phóng
// bộ nhớ WebGL (.dispose()).
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import {
  C7_BUILDING,
  DORM_COMPLEX,
  PARABOL_BUS_STOP,
  SPORTS_COMPLEX,
  TA_QUANG_BUU_GATE,
  VDZ_CENTER,
} from '../../lib/campus';
import { LabelPlane } from './TextPlate';
import { makeSportsCourtTexture } from './materials';

const HUST_RED = '#D22630';
const WALL_CREAM = '#F4F1E8';
const WALL_BEIGE = '#E2D2AC';
const GLASS_DARK = '#27445C';
const GLASS_MID = '#3A5F7D';
const FRAME_WHITE = '#FAF8F5';
const ROOF_GRAY = '#B9B4A6';
const IRON_DARK = '#25292E';

// --- 1. Tòa nhà C7 (Tổ hợp Giảng đường & Hành chính Trung tâm) ----------------
function C7ComplexBuilding() {
  const { center, size, floors, floorHeight } = C7_BUILDING;
  const totalH = floors * floorHeight; // 22.4 m

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Bậc tam cấp đá granite xám trước sảnh mặt Nam (+Z) */}
      <mesh position={[0, 0.16, size.z / 2 + 1.1]} castShadow receiveShadow>
        <boxGeometry args={[9.6, 0.32, 2.2]} />
        <meshStandardMaterial color="#8E8D88" roughness={0.85} />
      </mesh>
      {/* Chân đế ốp đá sẫm */}
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.16, 0.9, size.z + 0.16]} />
        <meshStandardMaterial color="#9E9B93" roughness={0.88} />
      </mesh>
      {/* Khối thân chính 7 tầng */}
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.86} />
      </mesh>
      {/* Khối kính mặt dựng trung tâm (Curtain Wall) nhô nhẹ về phía Nam */}
      <mesh position={[0, totalH / 2 + 0.8, 0.25]} castShadow>
        <boxGeometry args={[9.2, totalH - 1.2, size.z + 0.3]} />
        <meshStandardMaterial color={GLASS_DARK} roughness={0.28} metalness={0.35} />
      </mesh>
      {/* Đố ngang nhôm trắng trên vách kính trung tâm */}
      {[1, 2, 3, 4, 5, 6].map((fl) => (
        <mesh key={`c7-mullion-${fl}`} position={[0, fl * floorHeight, size.z / 2 + 0.43]}>
          <boxGeometry args={[9.25, 0.14, 0.06]} />
          <meshStandardMaterial color={FRAME_WHITE} roughness={0.6} />
        </mesh>
      ))}
      {/* Hệ lam chắn nắng đứng màu Đỏ Bách Khoa (#D22630) hai bên cánh mặt Nam */}
      {[-10.2, -8.8, -7.4, -6.0, 6.0, 7.4, 8.8, 10.2].map((lx) => (
        <mesh key={`c7-louver-${lx}`} position={[lx, totalH / 2 + 1.2, size.z / 2 + 0.18]} castShadow>
          <boxGeometry args={[0.24, totalH - 3.6, 0.32]} />
          <meshStandardMaterial color={HUST_RED} roughness={0.55} metalness={0.2} />
        </mesh>
      ))}
      {/* Cửa sổ 2 cánh bên theo từng tầng */}
      {[1, 2, 3, 4, 5, 6].map((fl) =>
        [-9.5, -6.7, 6.7, 9.5].map((wx) => (
          <mesh
            key={`c7-win-${fl}-${wx}`}
            position={[wx, fl * floorHeight + 1.4, size.z / 2 + 0.03]}
          >
            <planeGeometry args={[1.8, 1.35]} />
            <meshStandardMaterial color={GLASS_MID} roughness={0.32} metalness={0.25} />
          </mesh>
        )),
      )}
      {/* Mái hiên sảnh chính tầng 1 + 4 cột trụ vuông */}
      <mesh position={[0, 3.65, size.z / 2 + 1.55]} castShadow>
        <boxGeometry args={[10.4, 0.38, 2.6]} />
        <meshStandardMaterial color={FRAME_WHITE} roughness={0.8} />
      </mesh>
      {[-4.2, -1.6, 1.6, 4.2].map((cx) => (
        <mesh key={`c7-col-${cx}`} position={[cx, 1.8, size.z / 2 + 2.4]} castShadow>
          <boxGeometry args={[0.48, 3.6, 0.48]} />
          <meshStandardMaterial color={FRAME_WHITE} roughness={0.82} />
        </mesh>
      ))}
      {/* Gờ mái & khối kỹ thuật thang máy trên đỉnh C7 */}
      <mesh position={[0, totalH + 0.35, 0]} castShadow>
        <boxGeometry args={[size.x + 0.6, 0.7, size.z + 0.6]} />
        <meshStandardMaterial color={HUST_RED} roughness={0.65} />
      </mesh>
      <mesh position={[0, totalH + 1.4, 0]} castShadow>
        <boxGeometry args={[8.5, 1.6, 5.5]} />
        <meshStandardMaterial color={WALL_CREAM} roughness={0.88} />
      </mesh>
      {/* Biển tên TÒA NHÀ C7 trên mái hiên & đỉnh tòa */}
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
          ctx.font = '900 44px Arial, sans-serif';
          ctx.fillText('TÒA NHÀ C7 · 教学主楼', w / 2, h / 2);
        }}
        size={[5.2, 1.1]}
        position={[0, 4.45, size.z / 2 + 0.48]}
        transparent={false}
      />
    </group>
  );
}

// --- 2. Trung tâm Hợp tác Việt – Đức (VDZ) phía Bắc Hồ Tiền ------------------
function VietDucCenterBuilding() {
  const { center, size, floors, floorHeight } = VDZ_CENTER;
  const h = floors * floorHeight; // 9.9 m

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Thân nhà 3 tầng */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h, size.z]} />
        <meshStandardMaterial color="#F7F4EC" roughness={0.88} />
      </mesh>
      {/* Chân tường ốp gạch nâu nhạt */}
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.1, 0.9, size.z + 0.1]} />
        <meshStandardMaterial color="#C8B696" roughness={0.9} />
      </mesh>
      {/* Mái ngói đỏ nâu dốc đặc trưng kiến trúc Việt – Đức */}
      <mesh position={[0, h + 1.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[size.x * 0.68, 2.2, 4]} />
        <meshStandardMaterial color="#9E3B2B" roughness={0.8} />
      </mesh>
      {/* Hệ cửa sổ mặt Nam (nhìn ra Đường Tình Yêu & Hồ Tiền) */}
      {[0, 1, 2].map((fl) =>
        [-4.5, -1.5, 1.5, 4.5].map((wx) => (
          <mesh key={`vdz-win-${fl}-${wx}`} position={[wx, fl * floorHeight + 1.7, size.z / 2 + 0.03]}>
            <planeGeometry args={[1.6, 1.25]} />
            <meshStandardMaterial color={GLASS_MID} roughness={0.35} metalness={0.2} />
          </mesh>
        )),
      )}
      {/* Mái hiên sảnh & biển Trung tâm Việt – Đức */}
      <mesh position={[0, 3.1, size.z / 2 + 0.8]} castShadow>
        <boxGeometry args={[4.8, 0.28, 1.5]} />
        <meshStandardMaterial color="#EDE8DC" roughness={0.85} />
      </mesh>
      <LabelPlane
        textureKey="vdz-sign"
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1E3A5F';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#F5C518';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 32px Arial, sans-serif';
          ctx.fillText('TRUNG TÂM VIỆT - ĐỨC (VDZ)', w / 2, h * 0.38);
          ctx.fillStyle = '#FFD166';
          ctx.font = '700 26px Arial, sans-serif';
          ctx.fillText('越德合作中心 · VIETNAMESISCH-DEUTSCHES ZENTRUM', w / 2, h * 0.74);
        }}
        size={[4.4, 0.95]}
        position={[0, 3.85, size.z / 2 + 0.06]}
        transparent={false}
      />
    </group>
  );
}

// --- 3. Khu Liên hợp Thể thao & Nhà thi đấu Bách Khoa (Tây Nam) --------------
function BasketballHoop({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      {/* Trụ thép chính */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 3.3, 10]} />
        <meshStandardMaterial color="#1F4E79" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Tay đòn vươn vào sân */}
      <mesh position={[0, 3.15, 0.55]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, 1.1]} />
        <meshStandardMaterial color="#1F4E79" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Bảng rổ trắng viền đỏ */}
      <mesh position={[0, 3.25, 1.08]} castShadow>
        <boxGeometry args={[1.8, 1.05, 0.06]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.1, 1.12]}>
        <boxGeometry args={[0.6, 0.45, 0.02]} />
        <meshStandardMaterial color={HUST_RED} roughness={0.5} />
      </mesh>
      {/* Vành rổ cam + lưới trắng */}
      <mesh position={[0, 2.88, 1.32]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.23, 0.02, 8, 18]} />
        <meshStandardMaterial color="#E65100" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.68, 1.32]}>
        <cylinderGeometry args={[0.22, 0.14, 0.36, 12, 1, true]} />
        <meshStandardMaterial color="#FFFFFF" wireframe transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

function HustSportsComplex() {
  const { courtCenter, courtSize, stadiumCenter, stadiumSize } = SPORTS_COMPLEX;
  const courtTex = useMemo(() => makeSportsCourtTexture(), []);
  useEffect(() => () => courtTex.dispose(), [courtTex]);

  return (
    <group>
      {/* Sân bóng rổ & thể chất ngoài trời (y = 0,022 — trên cỏ y = 0, không Z-fighting) */}
      <group position={[courtCenter.x, 0, courtCenter.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]} receiveShadow>
          <planeGeometry args={[courtSize.x, courtSize.z]} />
          <meshStandardMaterial map={courtTex} roughness={0.82} metalness={0.02} />
        </mesh>
        {/* Hai trụ bóng rổ ở hai đầu Đông / Tây sân */}
        <BasketballHoop x={-courtSize.x / 2 + 0.6} z={0} rotY={Math.PI / 2} />
        <BasketballHoop x={courtSize.x / 2 - 0.6} z={0} rotY={-Math.PI / 2} />
        {/* Khán đài 2 bậc bê tông dọc mép Nam sân */}
        <mesh position={[0, 0.22, courtSize.z / 2 + 0.8]} castShadow receiveShadow>
          <boxGeometry args={[14, 0.44, 1.1]} />
          <meshStandardMaterial color="#C8C4B8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.55, courtSize.z / 2 + 1.55]} castShadow receiveShadow>
          <boxGeometry args={[14, 0.66, 0.9]} />
          <meshStandardMaterial color="#B5B1A5" roughness={0.9} />
        </mesh>
        {/* 4 cột đèn pha cao áp chiếu sáng sân thể thao */}
        {[-9.5, 9.5].map((lx) =>
          [-courtSize.z / 2 - 0.6, courtSize.z / 2 + 0.6].map((lz) => (
            <group key={`sport-lamp-${lx}-${lz}`} position={[lx, 0, lz]}>
              <mesh position={[0, 3.2, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.09, 6.4, 8]} />
                <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.6} />
              </mesh>
              <mesh position={[0, 6.45, 0]}>
                <boxGeometry args={[0.65, 0.28, 0.35]} />
                <meshStandardMaterial color="#FFFBEB" emissive="#FFE599" emissiveIntensity={0.6} />
              </mesh>
            </group>
          )),
        )}
      </group>

      {/* Nhà thi đấu Bách Khoa (cạnh phía Tây sân thể thao) */}
      <group position={[stadiumCenter.x, 0, stadiumCenter.z]}>
        {/* Thân nhà thi đấu */}
        <mesh position={[0, 4.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[stadiumSize.x, 8.2, stadiumSize.z]} />
          <meshStandardMaterial color="#EAE6DC" roughness={0.86} />
        </mesh>
        {/* Dải chân tường xanh đậm thể thao */}
        <mesh position={[0, 0.9, 0]} receiveShadow>
          <boxGeometry args={[stadiumSize.x + 0.1, 1.8, stadiumSize.z + 0.1]} />
          <meshStandardMaterial color="#1E4E68" roughness={0.85} />
        </mesh>
        {/* Mái vòm thép xanh dương đặc trưng Nhà thi đấu */}
        <mesh position={[0, 8.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.35, 1]} castShadow>
          <cylinderGeometry args={[stadiumSize.x / 2 + 0.3, stadiumSize.x / 2 + 0.3, stadiumSize.z + 0.4, 20, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#24638C" roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Biển NHÀ THI ĐẤU BÁCH KHOA hướng về phía Đông (sân thể thao) */}
        <LabelPlane
          textureKey="bk-stadium-sign"
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
            ctx.fillText('NHÀ THI ĐẤU BÁCH KHOA', w / 2, h * 0.38);
            ctx.fillStyle = '#FFD166';
            ctx.font = '700 28px Arial, sans-serif';
            ctx.fillText('百科体育馆 · HUST SPORTS ARENA', w / 2, h * 0.74);
          }}
          size={[5.6, 1.25]}
          position={[stadiumSize.x / 2 + 0.08, 6.2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          transparent={false}
        />
      </group>
    </group>
  );
}

// --- 4. Khu Ký túc xá B6 – B10 & Căng-tin Sinh viên (Đông Nam) ---------------
function DormBuilding({
  code,
  title,
  center,
  size,
}: {
  code: string;
  title: string;
  center: { x: number; z: number };
  size: { x: number; z: number };
}) {
  const floors = 4;
  const floorH = 3.1;
  const h = floors * floorH; // 12.4 m

  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h, size.z]} />
        <meshStandardMaterial color="#F2ECE0" roughness={0.88} />
      </mesh>
      <mesh position={[0, floorH * 0.5, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.08, floorH, size.z + 0.08]} />
        <meshStandardMaterial color={WALL_BEIGE} roughness={0.9} />
      </mesh>
      {/* Mái chống nóng đỏ gạch */}
      <mesh position={[0, h + 0.25, 0]} castShadow>
        <boxGeometry args={[size.x + 0.5, 0.5, size.z + 0.5]} />
        <meshStandardMaterial color="#A63A2B" roughness={0.85} />
      </mesh>
      {/* Dải hành lang ban công mặt Bắc & Nam */}
      {[1, 2, 3].map((fl) => (
        <group key={`dorm-bal-${code}-${fl}`} position={[0, fl * floorH, 0]}>
          <mesh position={[0, 0.45, -size.z / 2 - 0.12]}>
            <boxGeometry args={[size.x - 0.8, 0.85, 0.18]} />
            <meshStandardMaterial color="#D8D2C5" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.92, -size.z / 2 - 0.12]}>
            <boxGeometry args={[size.x - 0.8, 0.08, 0.08]} />
            <meshStandardMaterial color={HUST_RED} roughness={0.55} />
          </mesh>
        </group>
      ))}
      <LabelPlane
        textureKey={`dorm-sign-${code}`}
        canvasW={384}
        canvasH={96}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 38px Arial, sans-serif';
          ctx.fillText(title, w / 2, h / 2);
        }}
        size={[3.6, 0.85]}
        position={[-size.x / 2 - 0.08, h - 1.1, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        transparent={false}
      />
    </group>
  );
}

function StudentCanteen() {
  const { canteenCenter, canteenSize } = DORM_COMPLEX;
  return (
    <group position={[canteenCenter.x, 0, canteenCenter.z]}>
      {/* Nhà ăn 1 tầng cao thoáng */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[canteenSize.x, 4.4, canteenSize.z]} />
        <meshStandardMaterial color="#FAF6EE" roughness={0.86} />
      </mesh>
      {/* Mái hiên xanh lá HUST */}
      <mesh position={[0, 4.55, 0]} castShadow>
        <boxGeometry args={[canteenSize.x + 0.8, 0.35, canteenSize.z + 0.8]} />
        <meshStandardMaterial color="#1C5C3A" roughness={0.75} />
      </mesh>
      <LabelPlane
        textureKey="student-canteen-sign"
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
          ctx.font = '900 34px Arial, sans-serif';
          ctx.fillText('NHÀ ĂN SINH VIÊN · 学生食堂', w / 2, h / 2);
        }}
        size={[4.6, 0.95]}
        position={[0, 3.7, canteenSize.z / 2 + 0.08]}
        transparent={false}
      />
      {/* 2 bộ bàn tròn + dù che nắng đỏ-trắng ngoài sân Nam căng-tin */}
      {[-2.6, 2.6].map((tx, idx) => (
        <group key={`umb-${idx}`} position={[tx, 0, canteenSize.z / 2 + 2.4]}>
          <mesh position={[0, 0.38, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.7, 0.06, 14]} />
            <meshStandardMaterial color="#EAE6DF" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.15, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 2.3, 8]} />
            <meshStandardMaterial color={IRON_DARK} roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, 2.25, 0]} castShadow>
            <coneGeometry args={[1.35, 0.55, 8]} />
            <meshStandardMaterial color={idx === 0 ? HUST_RED : '#1C5C3A'} roughness={0.75} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- 5. Cổng Nam — Đường Tạ Quang Bửu / Lê Thanh Nghị ------------------------
function TaQuangBuuSouthGate() {
  const { x, z } = TA_QUANG_BUU_GATE.center;
  return (
    <group position={[x, 0, z]}>
      {[-4.2, 4.2].map((px) => (
        <mesh key={`tqb-gate-pil-${px}`} position={[px, 2.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 4.8, 1.1]} />
          <meshStandardMaterial color="#EAE3D2" roughness={0.86} />
        </mesh>
      ))}
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[9.6, 0.95, 0.85]} />
        <meshStandardMaterial color="#EAE3D2" roughness={0.86} />
      </mesh>
      <LabelPlane
        textureKey="tqb-south-gate-sign"
        canvasW={768}
        canvasH={160}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#A81C24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#F5C518';
          ctx.lineWidth = 7;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 38px Arial, sans-serif';
          ctx.fillText('CỔNG TẠ QUANG BỬU · ĐH BÁCH KHOA HÀ NỘI', w / 2, h * 0.38);
          ctx.fillStyle = '#FFD966';
          ctx.font = '700 26px Arial, sans-serif';
          ctx.fillText('谢光宝门 · TA QUANG BUU GATE', w / 2, h * 0.74);
        }}
        size={[7.8, 0.88]}
        position={[0, 4.5, -0.46]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
    </group>
  );
}

// --- 6. Nhà chờ Xe buýt Cổng Parabol, Đèn cột nến TĐN & Tường rào 4 Phố -----
function ParabolBusStop() {
  const { x, z } = PARABOL_BUS_STOP.center;
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 2}>
      {/* Nền vỉa hè trạm buýt */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[4.6, 0.06, 2.0]} />
        <meshStandardMaterial color="#BFB9AD" roughness={0.92} />
      </mesh>
      {/* Vách lưng và mái vòm trạm xe buýt */}
      <mesh position={[0, 1.25, -0.75]} castShadow>
        <boxGeometry args={[4.2, 2.3, 0.1]} />
        <meshStandardMaterial color="#27496D" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.48, -0.1]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[4.5, 0.14, 1.75]} />
        <meshStandardMaterial color="#D22630" roughness={0.6} />
      </mesh>
      {/* Ghế băng inox chờ xe buýt */}
      <mesh position={[0, 0.46, -0.35]} castShadow>
        <boxGeometry args={[3.2, 0.08, 0.42]} />
        <meshStandardMaterial color="#D1D5DB" roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Biển thông tin các tuyến xe buýt đi qua cổng Giải Phóng (docs/campus-reference.md §1) */}
      <LabelPlane
        textureKey="parabol-bus-stop-sign"
        canvasW={512}
        canvasH={160}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1D4ED8';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FACC15';
          ctx.font = '900 30px Arial, sans-serif';
          ctx.fillText('🚌 ĐIỂM DỪNG XE BUÝT BÁCH KHOA · 公交站', 18, 44);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 26px Arial, sans-serif';
          ctx.fillText('Tuyến: 03A · 21A · 25 · 26 · 28 · 32 · E08', 18, 92);
          ctx.fillText('Đường Giải Phóng — Cổng Parabol HUST', 18, 134);
        }}
        size={[3.8, 1.15]}
        position={[0, 1.38, -0.68]}
        transparent={false}
      />
    </group>
  );
}

// Hệ thống đèn cột hình ngọn nến tại Quảng trường Trần Đại Nghĩa (docs/campus-reference.md §2.7)
function TranDaiNghiaCandlePillars() {
  const pillars: Array<[number, number]> = [
    [74, -17],
    [82, -17],
    [90, -17],
    [74, 5],
    [82, 5],
    [90, 5],
  ];
  return (
    <group>
      {pillars.map(([px, pz], idx) => (
        <group key={`tdn-candle-${idx}`} position={[px, 0, pz]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.18, 2.8, 12]} />
            <meshStandardMaterial color="#3A3F45" roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, 3.05, 0]}>
            <cylinderGeometry args={[0.11, 0.13, 0.55, 12]} />
            <meshStandardMaterial color="#FFF7D6" emissive="#FFBA42" emissiveIntensity={0.85} />
          </mesh>
          <mesh position={[0, 3.45, 0]}>
            <coneGeometry args={[0.12, 0.28, 10]} />
            <meshStandardMaterial color="#FFE599" emissive="#FF9900" emissiveIntensity={1.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Tường rào thoáng 4 biên khuôn viên (chừa cổng Parabol, Đại Cồ Việt, Trần Đại Nghĩa, Tạ Quang Bửu)
function CampusPerimeterFence() {
  const segments: Array<{ cx: number; cz: number; len: number; axis: 'x' | 'z' }> = [
    // Biên Bắc (Đại Cồ Việt, z = -75.5), chừa cổng chính ở x = -58 (-66..-50)
    { cx: -81, cz: -75.5, len: 28, axis: 'x' },
    { cx: 22, cz: -75.5, len: 144, axis: 'x' },
    // Biên Nam (Tạ Quang Bửu, z = 85.5), chừa cổng Nam ở x = 38 (32..44)
    { cx: -32, cz: 85.5, len: 128, axis: 'x' },
    { cx: 70, cz: 85.5, len: 52, axis: 'x' },
    // Biên Tây (Giải Phóng, x = -95.5), chừa cổng Parabol z = 2..18
    { cx: -95.5, cz: -37, len: 76, axis: 'z' },
    { cx: -95.5, cz: 52, len: 66, axis: 'z' },
    // Biên Đông (Trần Đại Nghĩa, x = 95.5), chừa cổng Trần Đại Nghĩa z = -14..2
    { cx: 95.5, cz: -45, len: 60, axis: 'z' },
    { cx: 95.5, cz: 44, len: 82, axis: 'z' },
  ];

  return (
    <group>
      {segments.map((seg, i) => {
        const w = seg.axis === 'x' ? seg.len : 0.32;
        const d = seg.axis === 'z' ? seg.len : 0.32;
        return (
          <group key={`perim-fence-${i}`} position={[seg.cx, 0, seg.cz]}>
            {/* Chân tường xây gạch ốp đá */}
            <mesh position={[0, 0.32, 0]} receiveShadow>
              <boxGeometry args={[w, 0.64, d]} />
              <meshStandardMaterial color="#D6CFC2" roughness={0.9} />
            </mesh>
            {/* Dải song sắt đen phía trên */}
            <mesh position={[0, 1.15, 0]}>
              <boxGeometry args={[seg.axis === 'x' ? seg.len : 0.08, 1.0, seg.axis === 'z' ? seg.len : 0.08]} />
              <meshStandardMaterial color={IRON_DARK} roughness={0.5} metalness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function CampusExpansion() {
  return (
    <group>
      <C7ComplexBuilding />
      <VietDucCenterBuilding />
      <HustSportsComplex />
      <DormBuilding code="B6" title="KÝ TÚC XÁ B6 · 宿舍" center={DORM_COMPLEX.b6Center} size={DORM_COMPLEX.b6Size} />
      <DormBuilding code="B10" title="KÝ TÚC XÁ B10 · 宿舍" center={DORM_COMPLEX.b10Center} size={DORM_COMPLEX.b10Size} />
      <StudentCanteen />
      <TaQuangBuuSouthGate />
      <ParabolBusStop />
      <TranDaiNghiaCandlePillars />
      <CampusPerimeterFence />
    </group>
  );
}
