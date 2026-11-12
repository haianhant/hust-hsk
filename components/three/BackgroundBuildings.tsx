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
  return (
    <group position={[D4_BUILDING.center.x, 0, D4_BUILDING.center.z]}>
      {/* Cánh ngang phía Nam (18 × 7 m) */}
      <mesh position={[0, 5.1, 4.5]} castShadow receiveShadow>
        <boxGeometry args={[18, 10.2, 7]} />
        <meshStandardMaterial color="#EAE3D2" roughness={0.88} />
      </mesh>
      {/* Cánh dọc phía Đông tạo hình chữ L (7 × 13 m) */}
      <mesh position={[5.5, 5.1, -2.0]} castShadow receiveShadow>
        <boxGeometry args={[7, 10.2, 13]} />
        <meshStandardMaterial color="#EAE3D2" roughness={0.88} />
      </mesh>
      {/* Chân đế ốp màu vàng kem */}
      <mesh position={[0, 1.6, 4.5]} receiveShadow>
        <boxGeometry args={[18.1, 3.2, 7.1]} />
        <meshStandardMaterial color={PLINTH_BEIGE} roughness={0.9} />
      </mesh>
      <mesh position={[5.5, 1.6, -2.0]} receiveShadow>
        <boxGeometry args={[7.1, 3.2, 13.1]} />
        <meshStandardMaterial color={PLINTH_BEIGE} roughness={0.9} />
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
      {/* Cửa sổ mặt Bắc cánh ngang */}
      {[0, 1, 2].map((fl) =>
        [-6.5, -3.5, -0.5].map((wx, idx) => (
          <mesh key={`d4-win-${fl}-${idx}`} position={[wx, fl * 3.3 + 1.8, 0.96]}>
            <planeGeometry args={[1.4, 1.1]} />
            <meshStandardMaterial
              color={isNight ? '#FFE4A0' : WINDOW_TONE}
              emissive={isNight ? '#FFB84D' : '#000000'}
              emissiveIntensity={isNight ? 0.65 : 0}
              roughness={0.35}
            />
          </mesh>
        )),
      )}
      <LabelPlane
        textureKey="bldg-sign-D4-lshape"
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#B81D24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#F5C518';
          ctx.lineWidth = 7;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 44px Arial, sans-serif';
          ctx.fillText('NHÀ D4 · VIỆN NGOẠI NGỮ', w / 2, h * 0.42);
          ctx.fillStyle = '#FFD166';
          ctx.font = '700 24px Arial, sans-serif';
          ctx.fillText('SCHOOL OF FOREIGN LANGUAGES · 外语学院', w / 2, h * 0.76);
        }}
        size={[4.2, 0.95]}
        position={[-2.5, 9.2, 0.94]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
    </group>
  );
}

// Khối nhà nối 3 tầng chạm đất (C3-4, C4-5, C5-10 theo chuẩn https://hustmap.com/)
// kết hợp hành lang cầu nối trên cao ở đầu Đông Khu C, giữa D3 ↔ D5 và giữa D6 ↔ D8
function LectureSkybridges({ isNight }: { isNight: boolean }) {
  const bridges: Array<{ x: number; z: number; w: number; d: number; y: number }> = [
    // Cầu nối đầu Đông giữa C4 (-57) ↔ C5 (-46) ↔ C10 (-35)
    { x: -5.5, z: -51.5, w: 2.2, d: 4.8, y: 3.6 },
    { x: -5.5, z: -40.5, w: 2.2, d: 4.8, y: 3.6 },
    // Cầu nối giữa D3 (z=14) ↔ D5 (z=29)
    { x: 56.5, z: 21.5, w: 2.2, d: 8.6, y: 3.6 },
    // Cầu nối giữa D6 (z=38) ↔ D8 (z=54)
    { x: -46, z: 46, w: 2.4, d: 8.6, y: 3.4 },
  ];
  return (
    <group>
      {/* 3 Khối nhà nối 3 tầng chạm đất C3-4, C4-5, C5-10 ở đầu Tây cụm C3–C4–C5–C10 */}
      {C_CONNECTOR_BUILDINGS.map((cb) => (
        <group key={cb.code} position={[cb.center.x, 0, cb.center.z]}>
          {/* Chân đế vàng kem */}
          <mesh position={[0, 1.4, 0]} receiveShadow>
            <boxGeometry args={[cb.size.x + 0.08, 2.8, cb.size.z + 0.08]} />
            <meshStandardMaterial color={PLINTH_BEIGE} roughness={0.92} />
          </mesh>
          {/* Cổng vòm lối đi xuyên sân tầng 1 */}
          <mesh position={[0, 1.25, 0]}>
            <boxGeometry args={[cb.size.x + 0.14, 2.5, 2.1]} />
            <meshStandardMaterial color="#273038" roughness={0.9} />
          </mesh>
          {/* Thân nhà nối 3 tầng */}
          <mesh position={[0, cb.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[cb.size.x, cb.h, cb.size.z]} />
            <meshStandardMaterial color={WALL_TONES[1]} roughness={0.88} />
          </mesh>
          {/* Mái phẳng */}
          <mesh position={[0, cb.h + 0.16, 0]} castShadow>
            <boxGeometry args={[cb.size.x + 0.45, 0.32, cb.size.z + 0.45]} />
            <meshStandardMaterial color={ROOF_TONE} roughness={0.92} />
          </mesh>
          {/* Cửa sổ tầng 2 & 3 mặt Tây (nhìn ra Quảng trường C1) và mặt Đông (nhìn vào Nhà xe C5) */}
          {[1, 2].map((fl) => (
            <group key={`${cb.code}-fl-${fl}`}>
              <mesh position={[-cb.size.x / 2 - 0.03, fl * 3.3 + 1.65, 0]} rotation-y={-Math.PI / 2}>
                <planeGeometry args={[2.1, 1.15]} />
                <meshStandardMaterial
                  color={isNight ? '#FFE4A0' : WINDOW_TONE}
                  emissive={isNight ? '#FFB84D' : '#000000'}
                  emissiveIntensity={isNight ? 0.65 : 0}
                  roughness={0.32}
                />
              </mesh>
              <mesh position={[cb.size.x / 2 + 0.03, fl * 3.3 + 1.65, 0]} rotation-y={Math.PI / 2}>
                <planeGeometry args={[2.1, 1.15]} />
                <meshStandardMaterial
                  color={isNight ? '#FFE4A0' : WINDOW_TONE}
                  emissive={isNight ? '#FFB84D' : '#000000'}
                  emissiveIntensity={isNight ? 0.65 : 0}
                  roughness={0.32}
                />
              </mesh>
            </group>
          ))}
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
            position={[-cb.size.x / 2 - 0.05, cb.h - 0.62, 0]}
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
            <meshStandardMaterial color="#F2EFE6" roughness={0.88} />
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

function BackgroundBuilding({ b, isNight }: { b: LectureBuildingSpec; isNight: boolean }) {
  const along = b.face === 's' || b.face === 'n' ? b.w : b.d;
  const count = Math.max(3, Math.floor(along / 3));
  const floors = Math.max(3, Math.round(b.h / 3.0));
  const isHighRise = floors >= 8;
  const floorH = b.h / floors;
  const upperFloors = Array.from({ length: floors - 1 }, (_, idx) => idx + 1);
  const wins: Array<{ u: number; y: number; lit: boolean }> = [];
  for (let r = 0; r < floors; r++) {
    for (let k = 0; k < count; k++) {
      const lit = ((r * 7 + k * 13 + b.code.charCodeAt(0)) % 3) !== 0;
      wins.push({
        u: -along / 2 + ((k + 0.5) / count) * along,
        y: (r + 0.56) * floorH,
        lit,
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
    <group position={[b.x, 0, b.z]} rotation-y={b.rotY ?? 0}>
      {/* Thân nhà chính màu trắng sáng / trắng kem */}
      <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial color={isHighRise ? '#F8FAFC' : WALL_TONES[b.tone]} roughness={0.86} />
      </mesh>
      {/* Tầng 1 ốp màu vàng kem nhạt (hoặc đá granite xám hiện đại cho cao ốc D8 11 tầng) */}
      <mesh position={[0, floorH * 0.48, 0]} receiveShadow>
        <boxGeometry args={[b.w + 0.06, floorH * 0.96, b.d + 0.06]} />
        <meshStandardMaterial color={isHighRise ? '#94A3B8' : PLINTH_BEIGE} roughness={0.9} />
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
            <meshStandardMaterial color="#E2E8F0" roughness={0.82} />
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
            position={[b.w / 2 + 0.06, -1.6, 0]}
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

      {/* Mặt chính: sảnh tầng 1 + các dải hành lang & lan can đỏ HUST + hệ cửa sổ phát sáng ban đêm + biển tên tòa */}
      <group position={[faceOffset[0], 0, faceOffset[2]]} rotation-y={faceRotY}>
        {/* Mái hiên cửa chính tầng 1 & bậc tam cấp */}
        <mesh position={[0, floorH * 0.88, 0.48]} castShadow>
          <boxGeometry args={[3.4, 0.2, 0.95]} />
          <meshStandardMaterial color={WINDOW_FRAME} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.12, 0.42]} receiveShadow>
          <boxGeometry args={[3.2, 0.24, 0.85]} />
          <meshStandardMaterial color="#9E9B93" roughness={0.9} />
        </mesh>

        {upperFloors.map((fl) => (
          <group key={`rail-${fl}`} position={[0, fl * floorH, 0]}>
            {/* Dầm sàn hành lang trắng */}
            <mesh position={[0, -0.08, 0.05]}>
              <boxGeometry args={[along - 0.4, 0.18, 0.14]} />
              <meshStandardMaterial color={WINDOW_FRAME} roughness={0.85} />
            </mesh>
            {/* Dải lan can kim loại đỏ HUST (hoặc chỉ xám hiện đại cho cao ốc D8) */}
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

        {/* Cửa sổ các tầng (tự động phát sáng ấm áp khi về chiều tối / ban đêm) */}
        {wins.map((wn, i) => {
          const glow = isNight && wn.lit;
          return (
            <group key={`win-${i}`} position={[wn.u, wn.y, 0.02]}>
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.42, 1.22]} />
                <meshStandardMaterial color={WINDOW_FRAME} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[1.24, 1.04]} />
                <meshStandardMaterial
                  color={glow ? '#FFE59E' : WINDOW_TONE}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.7 : 0}
                  roughness={0.35}
                  metalness={0.2}
                />
              </mesh>
            </group>
          );
        })}

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
          position={[-along / 2 + 1.8, b.h - 0.75, 0.09]}
          transparent={false}
        />
      </group>

      {/* Mặt sau: dải gờ tầng + hệ cửa sổ thông gió giúp tòa nhà nhìn từ mọi phía đều có chiều sâu kiến trúc */}
      <group position={[-faceOffset[0], 0, -faceOffset[2]]} rotation-y={faceRotY + Math.PI}>
        {upperFloors.map((fl) => (
          <mesh key={`back-ledge-${fl}`} position={[0, fl * floorH - 0.06, 0.03]}>
            <boxGeometry args={[along - 0.4, 0.14, 0.08]} />
            <meshStandardMaterial color={WINDOW_FRAME} roughness={0.86} />
          </mesh>
        ))}
        {wins.map((wn, i) => {
          const glow = isNight && wn.lit;
          return (
            <group key={`back-win-${i}`} position={[wn.u, wn.y, 0.02]}>
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.36, 1.14]} />
                <meshStandardMaterial color={WINDOW_FRAME} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[1.18, 0.96]} />
                <meshStandardMaterial
                  color={glow ? '#FFE59E' : WINDOW_TONE}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.65 : 0}
                  roughness={0.35}
                  metalness={0.2}
                />
              </mesh>
            </group>
          );
        })}
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
  // Dọc trục chính Parabol – Trần Đại Nghĩa (z = -6), phía bắc vỉa hè (z = -11.2)
  { x: -34, z: -11.2 }, { x: -8, z: -11.2 }, { x: 18, z: -11.2 },
  { x: 44, z: -11.2 }, { x: 60, z: -11.2 },
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

// --- Điểm trông giữ xe D4-6-8 mở rộng có mái che tôn xanh + dãy xe máy sinh viên (chuẩn https://hustmap.com/) ----
function BikeParkingShed() {
  const { center, size } = BIKE_PARKING_SHED;
  return (
    <group position={[center.x, 0, center.z]}>
      {/* Nền bê tông nhà xe 14.8 × 5.0 m */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[size.x, 0.06, size.z]} />
        <meshStandardMaterial color="#9E9E98" roughness={0.95} />
      </mesh>
      {/* 8 cột thép đỡ mái */}
      {[-6.6, -2.2, 2.2, 6.6].map((px) =>
        [-2.1, 2.1].map((pz) => (
          <mesh key={`shed-col-${px}-${pz}`} position={[px, 1.35, pz]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 2.7, 8]} />
            <meshStandardMaterial color="#3F474E" roughness={0.5} metalness={0.5} />
          </mesh>
        )),
      )}
      {/* Mái tôn xanh dương chuẩn nhà xe sinh viên Bách Khoa */}
      <mesh position={[0, 2.72, 0]} rotation={[0.06, 0, 0]} castShadow>
        <boxGeometry args={[size.x + 0.6, 0.14, size.z + 0.6]} />
        <meshStandardMaterial color="#2E6B9E" roughness={0.62} metalness={0.28} />
      </mesh>
      {/* Dãy xe máy sinh viên đỗ gọn trong nhà xe D4-6-8 */}
      {[-5.4, -3.8, -2.2, -0.6, 1.0, 2.6, 4.2, 5.6].map((mx, idx) => {
        const colors = ['#1E293B', '#991B1B', '#1D4ED8', '#F8FAFC', '#0F766E'];
        const col = colors[idx % colors.length];
        return (
          <group key={`d468-moto-${idx}`} position={[mx, 0, idx % 2 === 0 ? -0.9 : 0.9]}>
            <mesh position={[0, 0.24, -0.45]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.17, 0.05, 8, 12]} />
              <meshStandardMaterial color="#18181B" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.24, 0.45]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.17, 0.05, 8, 12]} />
              <meshStandardMaterial color="#18181B" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.52, 0.05]} castShadow>
              <boxGeometry args={[0.36, 0.34, 1.05]} />
              <meshStandardMaterial color={col} roughness={0.35} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.72, 0.12]}>
              <boxGeometry args={[0.3, 0.1, 0.62]} />
              <meshStandardMaterial color="#1E293B" roughness={0.8} />
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
