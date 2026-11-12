// ---------------------------------------------------------------------------
// features/campus/landscape/CampusParkingAndAnnexes.tsx — Hệ thống đầy đủ các
// bãi gửi xe (Bãi xe C1, Bãi xe C2, Bãi xe C9, 2 Nhà xe C5, Điểm giữ xe D7-D9,
// Sân xe D3-D5), Lối vào & Lối ra Hầm Gửi xe C7, các khối nhà phụ trợ thuộc
// trường và tiện ích giao thông công cộng (Trạm buýt Trần Đại Nghĩa, TNGo, Vmac)
// đối chiếu trực tiếp từ Bản đồ Số https://hustmap.com/.
// ---------------------------------------------------------------------------

import {
  C7_UNDERGROUND_RAMPS,
  CAMPUS_AMENITIES,
  CAMPUS_ANNEX_BLOCKS,
  CAMPUS_PARKING_LOTS,
} from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';
import { FacultyParkedCar } from '../buildings/C6C7C8Cluster';

function ParkedMotorbike({
  x,
  z,
  yaw = 0,
  color,
}: {
  x: number;
  z: number;
  yaw?: number;
  color: string;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      <mesh position={[0, 0.22, -0.44]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.16, 0.048, 8, 12]} />
        <meshStandardMaterial color="#18181B" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.22, 0.44]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.16, 0.048, 8, 12]} />
        <meshStandardMaterial color="#18181B" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.49, 0.06]} castShadow>
        <boxGeometry args={[0.35, 0.34, 1.04]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.69, 0.14]}>
        <boxGeometry args={[0.29, 0.1, 0.6]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.78, -0.38]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[0.52, 0.08, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  );
}

function BlueParkingSignPost({
  x,
  z,
  rotY = 0,
  textureKey,
  title,
  subtitle,
}: {
  x: number;
  z: number;
  rotY?: number;
  textureKey: string;
  title: string;
  subtitle: string;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.045, 2.2, 10]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.68} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <boxGeometry args={[1.18, 0.72, 0.05]} />
        <meshStandardMaterial color="#1D4ED8" roughness={0.55} />
      </mesh>
      <LabelPlane
        textureKey={textureKey}
        canvasW={384}
        canvasH={240}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1D4ED8';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 8;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 76px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('P', w / 2, 68);
          ctx.font = '800 28px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText(title, w / 2, 146);
          ctx.fillStyle = '#FDE047';
          ctx.font = '700 22px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText(subtitle, w / 2, 194);
        }}
        size={[1.12, 0.68]}
        position={[0, 1.95, 0.036]}
        transparent={false}
      />
      <LabelPlane
        textureKey={textureKey}
        canvasW={384}
        canvasH={240}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1D4ED8';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 8;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 76px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('P', w / 2, 68);
          ctx.font = '800 28px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText(title, w / 2, 146);
          ctx.fillStyle = '#FDE047';
          ctx.font = '700 22px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText(subtitle, w / 2, 194);
        }}
        size={[1.12, 0.68]}
        position={[0, 1.95, -0.036]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
    </group>
  );
}

/**
 * Ram dốc Lối vào / Lối ra Hầm Gửi xe Tòa C7 (lớp `garages` trên https://hustmap.com/)
 * Thiết kế tường bê tông chắn dốc sơn sọc vàng-đen, mái vòm kính khung thép che mưa,
 * cửa hầm ngầm tối có chiều sâu quang học, barie tự động và biển xanh tiêu chuẩn.
 */
function C7UndergroundGarageRamp({
  center,
  size,
  title,
  subtitle,
  textureKey,
  isEntry,
  isNight,
}: {
  center: { x: number; z: number };
  size: { x: number; z: number };
  title: string;
  subtitle: string;
  textureKey: string;
  isEntry: boolean;
  isNight: boolean;
}) {
  // Mặt cổng vào/ra ở phía Tây (-X, nối với đường nội bộ x = 24), dốc đi xuống về phía Đông (+X, chui vào gầm C7)
  const halfW = size.x / 2;
  const halfD = size.z / 2;

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Đường dẫn nhựa nối từ trục nội bộ vào miệng hầm */}
      <mesh rotation-x={-Math.PI / 2} position={[-2.2, 0.018, 0]} receiveShadow>
        <planeGeometry args={[size.x + 4.8, size.z + 0.6]} />
        <meshStandardMaterial color="#4B5563" roughness={0.92} />
      </mesh>

      {/* Hốc tối hầm ngầm phía Đông (+X) tạo cảm giác ram dốc lao xuống tầng hầm C7 */}
      <mesh rotation-x={-Math.PI / 2} position={[0.6, 0.024, 0]}>
        <planeGeometry args={[size.x - 1.2, size.z - 0.5]} />
        <meshStandardMaterial color="#0F172A" roughness={0.95} />
      </mesh>
      {/* Mặt ram dốc nghiêng có vạch xương cá chống trượt */}
      <mesh position={[-0.8, 0.04, 0]} rotation={[0, 0, -0.06]} receiveShadow>
        <boxGeometry args={[4.4, 0.06, size.z - 0.55]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
      {/* Cổng hầm bê tông phía cuối ram dốc (+X) */}
      <group position={[halfW - 1.1, 0, 0]}>
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 2.7, size.z]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.84} />
        </mesh>
        {/* Lòng cửa hầm tối sâu bên trong */}
        <mesh position={[-1.12, 1.05, 0]}>
          <boxGeometry args={[0.08, 2.1, size.z - 0.65]} />
          <meshStandardMaterial color="#020617" roughness={1} />
        </mesh>
        {/* Đèn dẫn hướng xanh/đỏ trong hầm khi trời tối */}
        <mesh position={[-1.08, 1.95, 0]}>
          <boxGeometry args={[0.08, 0.1, size.z - 1.1]} />
          <meshStandardMaterial
            color={isEntry ? '#4ADE80' : '#F87171'}
            emissive={isEntry ? '#22C55E' : '#EF4444'}
            emissiveIntensity={isNight ? 2.1 : 0.8}
          />
        </mesh>
      </group>

      {/* Hai tường chắn bê tông hai bên ram dốc + sọc cảnh báo vàng đen */}
      {[-halfD + 0.16, halfD - 0.16].map((wz, idx) => (
        <group key={`ramp-wall-${idx}`} position={[-0.8, 0, wz]}>
          <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[size.x - 1.8, 1.04, 0.28]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.84} />
          </mesh>
          <mesh position={[-halfW + 1.1, 0.52, 0]}>
            <boxGeometry args={[0.42, 1.06, 0.31]} />
            <meshStandardMaterial color="#FACC15" roughness={0.75} />
          </mesh>
        </group>
      ))}

      {/* Khung vòm thép + mái kính xanh che mưa suốt chiều dài ram dốc */}
      {[-3.2, -0.8, 1.6].map((ax, idx) => (
        <group key={`ramp-arch-${idx}`} position={[ax, 0, 0]}>
          {[-halfD + 0.16, halfD - 0.16].map((pz, pIdx) => (
            <mesh key={`p-${pIdx}`} position={[0, 1.75, pz]} castShadow>
              <boxGeometry args={[0.1, 1.45, 0.1]} />
              <meshStandardMaterial color="#475569" roughness={0.45} metalness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[0.12, 0.1, size.z + 0.1]} />
            <meshStandardMaterial color="#475569" roughness={0.45} metalness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.7, 2.58, 0]} castShadow>
        <boxGeometry args={[size.x - 1.4, 0.08, size.z + 0.25]} />
        <meshStandardMaterial
          color="#38BDF8"
          transparent
          opacity={0.48}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Trụ barie tự động + đèn cảnh báo cam ở miệng hầm (-X) */}
      <group position={[-halfW + 0.4, 0, halfD - 0.48]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.36, 1.1, 0.36]} />
          <meshStandardMaterial color="#EA580C" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.18, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.14, 10]} />
          <meshStandardMaterial
            color="#F59E0B"
            emissive="#F59E0B"
            emissiveIntensity={isNight ? 2.0 : 0.7}
          />
        </mesh>
        <mesh position={[0, 0.92, -1.15]} castShadow>
          <boxGeometry args={[0.07, 0.07, 2.0]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
        </mesh>
      </group>

      {/* Biển hiệu ngang trên đỉnh cổng hầm hướng về phía Tây (-X) */}
      <mesh position={[-halfW + 0.85, 2.58, 0]} castShadow>
        <boxGeometry args={[0.14, 0.68, size.z + 0.1]} />
        <meshStandardMaterial color="#1E3A8A" roughness={0.55} />
      </mesh>
      <LabelPlane
        textureKey={textureKey}
        canvasW={640}
        canvasH={144}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1E3A8A';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '800 32px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText(title, w / 2, h * 0.38);
          ctx.fillStyle = '#FDE047';
          ctx.font = '700 22px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText(subtitle, w / 2, h * 0.75);
        }}
        size={[size.z - 0.05, 0.62]}
        position={[-halfW + 0.75, 2.58, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        transparent={false}
      />
    </group>
  );
}

/** Nhà để xe máy / xe đạp có mái che (dùng cho 2 Nhà xe C5 giữa C4–C5 và C5–C10) */
function CoveredMotoShed({
  center,
  size,
  signKey,
  title,
}: {
  center: { x: number; z: number };
  size: { x: number; z: number };
  signKey: string;
  title: string;
}) {
  const motoColors = ['#1E293B', '#991B1B', '#1D4ED8', '#F8FAFC', '#0F766E'];
  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, 0.028, 0]} receiveShadow>
        <boxGeometry args={[size.x, 0.056, size.z]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.92} />
      </mesh>
      {[-3.6, 0, 3.6].map((cx) =>
        [-1.1, 1.1].map((cz) => (
          <mesh key={`c5-col-${cx}-${cz}`} position={[cx, 1.25, cz]} castShadow>
            <cylinderGeometry args={[0.048, 0.048, 2.5, 8]} />
            <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.55} />
          </mesh>
        )),
      )}
      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[size.x + 0.4, 0.12, size.z + 0.4]} />
        <meshStandardMaterial color="#1E5B45" roughness={0.65} metalness={0.25} />
      </mesh>
      {[-3.0, -1.5, 0, 1.5, 3.0].map((mx, idx) => (
        <ParkedMotorbike
          key={`c5-moto-${idx}`}
          x={mx}
          z={0}
          yaw={0}
          color={motoColors[idx % motoColors.length]}
        />
      ))}
      {/* Hộp bảng hiệu 2 mặt Đông & Tây cho Nhà xe C5 (chống nhìn xuyên mặt lưng bị ngược chữ) */}
      {[
        { bx: size.x / 2 + 0.18, lx: size.x / 2 + 0.22, rotY: Math.PI / 2 },
        { bx: -size.x / 2 - 0.18, lx: -size.x / 2 - 0.22, rotY: -Math.PI / 2 },
      ].map((side, sIdx) => (
        <group key={`c5-sign-side-${sIdx}`}>
          <mesh position={[side.bx, 2.38, 0]} castShadow>
            <boxGeometry args={[0.06, 0.58, 2.66]} />
            <meshStandardMaterial color="#14532D" roughness={0.6} />
          </mesh>
          <LabelPlane
            textureKey={signKey}
            canvasW={448}
            canvasH={96}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#14532D';
              ctx.fillRect(0, 0, w, h);
              ctx.strokeStyle = '#FACC15';
              ctx.lineWidth = 5;
              ctx.strokeRect(5, 5, w - 10, h - 10);
              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '800 32px "Be Vietnam Pro", Arial, sans-serif';
              ctx.fillText(title, w / 2, h / 2);
            }}
            size={[2.6, 0.54]}
            position={[side.lx, 2.38, 0]}
            rotation={[0, side.rotY, 0]}
            transparent={false}
          />
        </group>
      ))}
    </group>
  );
}

export function CampusParkingAndAnnexes({ isNight }: { isNight: boolean }) {
  const {
    c1West,
    c1East,
    c1NorthLane,
    c2Carport,
    c9Lot,
    c5NorthShed,
    c5SouthShed,
    d7d9Lot,
    d3d5Courtyard,
  } = CAMPUS_PARKING_LOTS;

  return (
    <group>
      {/* ==================== 1. BÃI XE C1 (BẮC NHÀ C1 · CỔNG ĐẠI CỒ VIỆT) ==================== */}
      {[c1West, c1East, c1NorthLane].map((lot, idx) => (
        <group key={`c1-lot-${idx}`} position={[lot.center.x, 0, lot.center.z]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.018, 0]} receiveShadow>
            <planeGeometry args={[lot.size.x, lot.size.z]} />
            <meshStandardMaterial color="#5B616A" roughness={0.92} />
          </mesh>
          {[-4.5, -1.5, 1.5, 4.5].map((sx, sIdx) => (
            <mesh key={`st-${sIdx}`} rotation-x={-Math.PI / 2} position={[sx, 0.025, 0]}>
              <planeGeometry args={[0.12, lot.size.z - 0.6]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
      <FacultyParkedCar
        x={c1West.center.x - 3.0}
        z={c1West.center.z}
        yaw={0}
        color="#1E293B"
        kind="sedan"
        plate="30F-218.66"
        isNight={isNight}
      />
      <FacultyParkedCar
        x={c1West.center.x + 3.0}
        z={c1West.center.z}
        yaw={0}
        color="#F8FAFC"
        kind="suv"
        plate="29A-884.12"
        isNight={isNight}
      />
      <FacultyParkedCar
        x={c1East.center.x - 3.0}
        z={c1East.center.z}
        yaw={0}
        color="#991B1B"
        kind="sedan"
        plate="30H-609.35"
        isNight={isNight}
      />
      <FacultyParkedCar
        x={c1East.center.x + 3.0}
        z={c1East.center.z}
        yaw={0}
        color="#334155"
        kind="sedan"
        plate="30E-714.90"
        isNight={isNight}
      />
      <BlueParkingSignPost
        x={-63.8}
        z={-66.2}
        rotY={Math.PI / 2}
        textureKey="sign-parking-c1"
        title="BÃI XE C1"
        subtitle="KHU HÀNH CHÍNH · ĐCV"
      />

      {/* ==================== 2. BÃI XE C2 (CARPORT TÂY-BẮC PHÍA BẮC NHÀ C2) ==================== */}
      <group position={[c2Carport.center.x, 0, c2Carport.center.z]}>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <boxGeometry args={[c2Carport.size.x, 0.06, c2Carport.size.z]} />
          <meshStandardMaterial color="#646973" roughness={0.92} />
        </mesh>
        {[-4.6, 0, 4.6].map((cx) =>
          [-2.8, 2.8].map((cz) => (
            <mesh key={`c2p-col-${cx}-${cz}`} position={[cx, 1.45, cz]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 2.9, 10]} />
              <meshStandardMaterial color="#475569" roughness={0.45} metalness={0.6} />
            </mesh>
          )),
        )}
        <mesh position={[0, 2.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[c2Carport.size.x + 0.5, 0.16, c2Carport.size.z + 0.5]} />
          <meshStandardMaterial color="#2563EB" roughness={0.62} metalness={0.3} />
        </mesh>
        <mesh position={[c2Carport.size.x / 2 + 0.25, 2.75, 0]} castShadow>
          <boxGeometry args={[0.08, 0.76, 3.48]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.55} />
        </mesh>
        <LabelPlane
          textureKey="sign-parking-c2-banner"
          canvasW={512}
          canvasH={112}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#1E3A8A';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 38px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('P · BÃI XE C2', w / 2, h / 2);
          }}
          size={[3.4, 0.72]}
          position={[c2Carport.size.x / 2 + 0.31, 2.75, 0]}
          rotation={[0, Math.PI / 2, 0]}
          transparent={false}
        />
        <mesh position={[0, 2.75, c2Carport.size.z / 2 + 0.25]} castShadow>
          <boxGeometry args={[3.48, 0.76, 0.08]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.55} />
        </mesh>
        <LabelPlane
          textureKey="sign-parking-c2-banner"
          canvasW={512}
          canvasH={112}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#1E3A8A';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 38px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('P · BÃI XE C2', w / 2, h / 2);
          }}
          size={[3.4, 0.72]}
          position={[0, 2.75, c2Carport.size.z / 2 + 0.31]}
          transparent={false}
        />
      </group>
      <FacultyParkedCar
        x={c2Carport.center.x - 2.7}
        z={c2Carport.center.z}
        yaw={0}
        color="#0F172A"
        kind="suv"
        plate="30G-332.08"
        isNight={isNight}
      />
      <FacultyParkedCar
        x={c2Carport.center.x + 2.5}
        z={c2Carport.center.z}
        yaw={0}
        color="#CBD5E1"
        kind="sedan"
        plate="30A-512.77"
        isNight={isNight}
      />

      {/* ==================== 3. BÃI XE C9 (GIỮA NHÀ C9 & QUẢNG TRƯỜNG NGÃ 5) ==================== */}
      <group position={[c9Lot.center.x, 0, c9Lot.center.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.018, 0]} receiveShadow>
          <planeGeometry args={[c9Lot.size.x, c9Lot.size.z]} />
          <meshStandardMaterial color="#5D636D" roughness={0.92} />
        </mesh>
        {[-3.2, 0, 3.2].map((lz, idx) => (
          <mesh key={`c9-stall-${idx}`} rotation-x={-Math.PI / 2} position={[0, 0.025, lz]}>
            <planeGeometry args={[c9Lot.size.x - 0.8, 0.12]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.85} />
          </mesh>
        ))}
      </group>
      <FacultyParkedCar
        x={c9Lot.center.x}
        z={c9Lot.center.z - 1.7}
        yaw={Math.PI / 2}
        color="#1E3A8A"
        kind="sedan"
        plate="30K-129.45"
        isNight={isNight}
      />
      <FacultyParkedCar
        x={c9Lot.center.x}
        z={c9Lot.center.z + 1.8}
        yaw={Math.PI / 2}
        color="#E2E8F0"
        kind="suv"
        plate="29H-408.61"
        isNight={isNight}
      />
      <BlueParkingSignPost
        x={c9Lot.box.maxX + 0.35}
        z={c9Lot.box.maxZ - 0.6}
        rotY={0}
        textureKey="sign-parking-c9"
        title="BÃI XE C9"
        subtitle="KHU GIẢNG VIÊN C9"
      />

      {/* ==================== 4. HAI NHÀ XE C5 (SÂN GIỮA C4–C5 & SÂN GIỮA C5–C10) ==================== */}
      <CoveredMotoShed
        center={c5NorthShed.center}
        size={c5NorthShed.size}
        signKey="sign-nha-xe-c5-north"
        title="NHÀ XE C5 (BẮC)"
      />
      <CoveredMotoShed
        center={c5SouthShed.center}
        size={c5SouthShed.size}
        signKey="sign-nha-xe-c5-south"
        title="NHÀ XE C5 (NAM)"
      />

      {/* ==================== 5. ĐIỂM TRÔNG GIỮ XE D7 - D9 (NAM THƯ VIỆN · BẮC D9) ==================== */}
      <group position={[d7d9Lot.center.x, 0, d7d9Lot.center.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.019, 0]} receiveShadow>
          <planeGeometry args={[d7d9Lot.size.x, d7d9Lot.size.z]} />
          <meshStandardMaterial color="#666B75" roughness={0.92} />
        </mesh>
        {/* Vạch phân làn xe máy màu vàng */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.026, 0]}>
          <planeGeometry args={[d7d9Lot.size.x - 2.4, 0.12]} />
          <meshStandardMaterial color="#FACC15" roughness={0.85} />
        </mesh>
        {/* Bốt quẹt thẻ gửi xe thông minh ở đầu Tây (mở ra lối đi bộ ven Hồ Tiền / Thư viện) */}
        <group position={[-d7d9Lot.size.x / 2 + 0.9, 0, 0]}>
          <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.35, 2.1, 1.35]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
          </mesh>
          <mesh position={[0, 2.18, 0]} castShadow>
            <boxGeometry args={[1.6, 0.16, 1.6]} />
            <meshStandardMaterial color="#C81E24" roughness={0.65} />
          </mesh>
          <mesh position={[0, 2.55, 0]} castShadow>
            <boxGeometry args={[0.14, 0.64, 2.68]} />
            <meshStandardMaterial color="#C81E24" roughness={0.6} />
          </mesh>
          {[
            { lx: -0.085, rotY: -Math.PI / 2 },
            { lx: 0.085, rotY: Math.PI / 2 },
          ].map((side, sIdx) => (
            <LabelPlane
              key={`d7d9-sign-${sIdx}`}
              textureKey="sign-parking-d7d9-booth"
              canvasW={576}
              canvasH={128}
              draw={(ctx, w, h) => {
                ctx.fillStyle = '#C81E24';
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 6;
                ctx.strokeRect(6, 6, w - 12, h - 12);
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '800 30px "Be Vietnam Pro", Arial, sans-serif';
                ctx.fillText('ĐIỂM TRÔNG GIỮ XE', w / 2, h * 0.36);
                ctx.fillStyle = '#FDE047';
                ctx.font = '900 36px "Be Vietnam Pro", Arial, sans-serif';
                ctx.fillText('D7 - D9', w / 2, h * 0.74);
              }}
              size={[2.6, 0.58]}
              position={[side.lx, 2.55, 0]}
              rotation={[0, side.rotY, 0]}
              transparent={false}
            />
          ))}
        </group>
        {/* 2 dãy xe máy sinh viên đỗ ngay ngắn */}
        {[-4.2, -2.6, -1.0, 0.6, 2.2, 3.8, 5.4].map((mx, idx) => {
          const palette = ['#1E293B', '#991B1B', '#1D4ED8', '#F8FAFC', '#0F766E', '#334155'];
          return (
            <group key={`d7d9-row-${idx}`}>
              <ParkedMotorbike
                x={mx}
                z={-1.35}
                yaw={0}
                color={palette[idx % palette.length]}
              />
              <ParkedMotorbike
                x={mx}
                z={1.35}
                yaw={Math.PI}
                color={palette[(idx + 2) % palette.length]}
              />
            </group>
          );
        })}
      </group>

      {/* ==================== 6. SÂN ĐỖ XE PHỤ TRONG CỤM D3 - D5 ==================== */}
      <group position={[d3d5Courtyard.center.x, 0, d3d5Courtyard.center.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.018, 0]} receiveShadow>
          <planeGeometry args={[d3d5Courtyard.size.x, d3d5Courtyard.size.z]} />
          <meshStandardMaterial color="#7C828D" roughness={0.92} />
        </mesh>
        {[-2.4, -0.8, 0.8, 2.4].map((mx, idx) => (
          <ParkedMotorbike
            key={`d35c-moto-${idx}`}
            x={mx}
            z={idx % 2 === 0 ? -1.1 : 1.1}
            yaw={0}
            color={idx % 2 === 0 ? '#1E3A8A' : '#991B1B'}
          />
        ))}
      </group>

      {/* ==================== 7. LỐI VÀO & LỐI RA HẦM GỬI XE TÒA C7 ==================== */}
      <C7UndergroundGarageRamp
        center={C7_UNDERGROUND_RAMPS.exitRamp.center}
        size={C7_UNDERGROUND_RAMPS.exitRamp.size}
        title="LỐI RA HẦM GỬI XE C7"
        subtitle="CHÚ Ý QUAN SÁT · ĐI CHẬM"
        textureKey="c7-ramp-exit-sign"
        isEntry={false}
        isNight={isNight}
      />
      <C7UndergroundGarageRamp
        center={C7_UNDERGROUND_RAMPS.entryRamp.center}
        size={C7_UNDERGROUND_RAMPS.entryRamp.size}
        title="LỐI VÀO HẦM GỬI XE C7"
        subtitle="CHIỀU CAO TỐI ĐA 2.1M"
        textureKey="c7-ramp-entry-sign"
        isEntry
        isNight={isNight}
      />

      {/* ==================== 8. CÁC KHỐI NHÀ PHỤ TRỢ & KIOT DỊCH VỤ SV ==================== */}
      {CAMPUS_ANNEX_BLOCKS.map((blk, idx) => {
        const isKiosk = blk.h < 5;
        return (
          <group key={blk.id} position={[blk.center.x, 0, blk.center.z]}>
            <mesh position={[0, 0.25, 0]} receiveShadow>
              <boxGeometry args={[blk.size.x + 0.14, 0.5, blk.size.z + 0.14]} />
              <meshStandardMaterial color="#94A3B8" roughness={0.9} />
            </mesh>
            <mesh position={[0, blk.h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[blk.size.x, blk.h, blk.size.z]} />
              <meshStandardMaterial color={isKiosk ? '#FAF5E8' : '#EDE8DC'} roughness={0.88} />
            </mesh>
            <mesh position={[0, blk.h + 0.16, 0]} castShadow>
              <boxGeometry args={[blk.size.x + 0.4, 0.32, blk.size.z + 0.4]} />
              <meshStandardMaterial color={isKiosk ? '#B45309' : '#B89470'} roughness={0.85} />
            </mesh>
            {/* Cửa sổ sáng ấm về đêm */}
            {[-1.1, 1.1].map((wx, wIdx) => (
              <mesh
                key={`${blk.id}-win-${wIdx}`}
                position={[wx, Math.min(blk.h * 0.52, 2.1), blk.size.z / 2 + 0.03]}
              >
                <planeGeometry args={[1.25, 1.05]} />
                <meshStandardMaterial
                  color={isNight && (idx + wIdx) % 2 === 0 ? '#FFE4A0' : '#3F586E'}
                  emissive={isNight && (idx + wIdx) % 2 === 0 ? '#FFB84D' : '#000000'}
                  emissiveIntensity={isNight ? 0.65 : 0}
                  roughness={0.32}
                />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* ==================== 9. TRẠM BUÝT TRẦN ĐẠI NGHĨA, XE ĐẠP TNGO & MÁY BÁN NƯỚC VMAC ==================== */}
      {/* Nhà chờ xe buýt "Đại học Bách Khoa" (Tuyến 31) trên Phố Trần Đại Nghĩa */}
      <group position={[CAMPUS_AMENITIES.tdnBusStop.x, 0, CAMPUS_AMENITIES.tdnBusStop.z]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 1.25, -0.65]} castShadow>
          <boxGeometry args={[3.4, 2.5, 0.08]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.5} metalness={0.35} />
        </mesh>
        <mesh position={[0, 2.55, 0]} castShadow>
          <boxGeometry args={[3.8, 0.14, 1.6]} />
          <meshStandardMaterial color="#1D4ED8" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.45, -0.3]} castShadow>
          <boxGeometry args={[2.4, 0.1, 0.42]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.6} metalness={0.4} />
        </mesh>
        <LabelPlane
          textureKey="tdn-bus-stop-31-sign"
          canvasW={512}
          canvasH={128}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#1D4ED8';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 28px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('🚌 ĐẠI HỌC BÁCH KHOA · TUYẾN 31', w / 2, h / 2);
          }}
          size={[2.9, 0.56]}
          position={[0, 2.15, -0.58]}
          transparent={false}
        />
      </group>

      {/* Trạm xe đạp công cộng TNGo (75 Trần Đại Nghĩa) */}
      <group position={[CAMPUS_AMENITIES.tngoStation.x, 0, CAMPUS_AMENITIES.tngoStation.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]} receiveShadow>
          <planeGeometry args={[1.8, 5.4]} />
          <meshStandardMaterial color="#0284C7" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.05, -2.35]} castShadow>
          <boxGeometry args={[0.55, 2.1, 0.22]} />
          <meshStandardMaterial color="#0369A1" roughness={0.5} />
        </mesh>
        <LabelPlane
          textureKey="tngo-bike-totem"
          canvasW={256}
          canvasH={384}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#0284C7';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 6;
            ctx.strokeRect(8, 8, w - 16, h - 16);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.font = '900 54px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('TNGo', w / 2, 92);
            ctx.font = '700 24px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('XE ĐẠP ĐÔ THỊ', w / 2, 168);
            ctx.fillStyle = '#FDE047';
            ctx.font = '700 22px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('75 TRẦN ĐẠI NGHĨA', w / 2, 224);
          }}
          size={[0.5, 0.85]}
          position={[0.13, 1.35, -2.35]}
          rotation={[0, Math.PI / 2, 0]}
          transparent={false}
        />
        {[-1.5, -0.5, 0.5, 1.5].map((bz, idx) => (
          <group key={`tngo-bike-${idx}`} position={[0, 0, bz]}>
            <mesh position={[-0.36, 0.28, 0]}>
              <torusGeometry args={[0.24, 0.028, 8, 14]} />
              <meshStandardMaterial color="#18181B" roughness={0.85} />
            </mesh>
            <mesh position={[0.36, 0.28, 0]}>
              <torusGeometry args={[0.24, 0.028, 8, 14]} />
              <meshStandardMaterial color="#18181B" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.48, 0]} rotation={[0, 0, 0.2]}>
              <boxGeometry args={[0.68, 0.06, 0.05]} />
              <meshStandardMaterial color="#0EA5E9" roughness={0.4} metalness={0.3} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 2 Máy bán nước tự động Skyline Vmac (tại Thư viện TQB & Nhà D4) */}
      {[
        { pos: CAMPUS_AMENITIES.vmacLibrary, rotY: 0, key: 'vmac-lib' },
        { pos: CAMPUS_AMENITIES.vmacD4, rotY: Math.PI / 2, key: 'vmac-d4' },
      ].map((vm) => (
        <group key={vm.key} position={[vm.pos.x, 0, vm.pos.z]} rotation-y={vm.rotY}>
          <mesh position={[0, 0.98, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.96, 1.96, 0.78]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.45} metalness={0.25} />
          </mesh>
          <mesh position={[-0.08, 1.08, 0.4]}>
            <planeGeometry args={[0.58, 1.18]} />
            <meshStandardMaterial
              color="#E0F2FE"
              emissive="#BAE6FD"
              emissiveIntensity={isNight ? 1.15 : 0.35}
              roughness={0.2}
            />
          </mesh>
          <LabelPlane
            textureKey={`${vm.key}-header`}
            canvasW={256}
            canvasH={64}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#7F1D1D';
              ctx.fillRect(0, 0, w, h);
              ctx.fillStyle = '#FDE047';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '800 26px "Be Vietnam Pro", Arial, sans-serif';
              ctx.fillText('SKYLINE VMAC', w / 2, h / 2);
            }}
            size={[0.88, 0.22]}
            position={[0, 1.82, 0.405]}
            transparent={false}
          />
        </group>
      ))}
    </group>
  );
}
