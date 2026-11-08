// ---------------------------------------------------------------------------
// features/campus/buildings/DormitoryComplex.tsx — Khu Ký túc xá Bách Khoa
// (B3–B13, KTX B8/B9 vàng cổ điển + Cổng Hội Sinh Viên, KTX Mới 9 tầng xanh-trắng,
// Sân bóng KTX & Nhà ăn KTX)
// Module ID: building.dorm-complex
// ---------------------------------------------------------------------------

import { DORM_COMPLEX } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';

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
  const clothesColors = ['#E11D48', '#2563EB', '#F8FAFC', '#16A34A', '#F59E0B'];

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Thân nhà 4 tầng sơn vàng nghệ cổ điển */}
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial color={DORM_YELLOW} roughness={0.88} />
      </mesh>
      {/* Mái bằng + gờ tường chắn mái (parapet) sơn vàng viền trắng kem */}
      <mesh position={[0, totalH + 0.22, 0]} castShadow>
        <boxGeometry args={[size.x + 0.3, 0.44, size.z + 0.3]} />
        <meshStandardMaterial color={DORM_BAND_CREAM} roughness={0.82} />
      </mesh>
      {/* Dải hành lang logia từng tầng + lan can bê tông vàng + quần áo sinh viên phơi (ktx-01.jpg) */}
      {[1, 2, 3].map((fl) => (
        <group key={`${code}-bal-${fl}`} position={[0, fl * floorH, size.z / 2 + 0.1]}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[size.x - 0.3, 0.14, 0.28]} />
            <meshStandardMaterial color={DORM_BAND_CREAM} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.48, 0.08]}>
            <boxGeometry args={[size.x - 0.5, 0.72, 0.08]} />
            <meshStandardMaterial color={DORM_YELLOW} roughness={0.86} />
          </mesh>
          {/* Quần áo sinh viên phơi ở hành lang tầng 2-4 (ktx-01.jpg) */}
          {[-size.x * 0.28, size.x * 0.18].map((lx, lIdx) => (
            <mesh
              key={`${code}-laundry-${fl}-${lIdx}`}
              position={[lx, 1.95, 0.04]}
            >
              <boxGeometry args={[0.42, 0.52, 0.06]} />
              <meshStandardMaterial
                color={clothesColors[(fl + lIdx + code.charCodeAt(1)) % clothesColors.length]}
                roughness={0.9}
              />
            </mesh>
          ))}
        </group>
      ))}
      {/* Lõi cầu thang giữa mặt đứng với ô gạch thông gió đứng */}
      <mesh position={[0, totalH / 2, size.z / 2 + 0.06]} castShadow>
        <boxGeometry args={[1.6, totalH - 0.4, 0.14]} />
        <meshStandardMaterial color={DORM_BAND_CREAM} roughness={0.86} />
      </mesh>
      {/* Cửa sổ gỗ nâu sẫm phòng KTX bật đèn ấm áp ban đêm */}
      {[0, 1, 2, 3].map((fl) =>
        [-size.x * 0.34, -size.x * 0.16, size.x * 0.16, size.x * 0.34].map((wx, idx) => {
          const glow = isNight && (fl + idx + code.length) % 2 === 0;
          return (
            <group key={`${code}-win-${fl}-${idx}`} position={[wx, fl * floorH + 1.55, size.z / 2 + 0.03]}>
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.18, 1.18]} />
                <meshStandardMaterial color={DORM_WOOD_BROWN} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[1.02, 1.02]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : '#2C4257'}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.35}
                />
              </mesh>
            </group>
          );
        }),
      )}
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
        position={[0, totalH - 0.62, size.z / 2 + 0.22]}
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
  const bayXs = [-4.8, -2.4, 0, 2.4, 4.8];

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Khối thân 9 tầng màu trắng hiện đại */}
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, size.z]} />
        <meshStandardMaterial color={KTX_WHITE} roughness={0.82} />
      </mesh>
      {/* Dải diềm trắng tầng 1-2 gắn dòng chữ xanh dương "KÝ TÚC XÁ ĐẠI HỌC BÁCH KHOA" (ktx-03.jpg) */}
      <mesh position={[0, 3.2, size.z / 2 + 0.14]} castShadow>
        <boxGeometry args={[size.x + 0.2, 1.35, 0.28]} />
        <meshStandardMaterial color={KTX_WHITE} roughness={0.78} />
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

      {/* Mặt đứng tầng 3–9: Phối mảng ô cờ Xanh dương đậm (#1B56A8) - Xanh da trời (#6DA4E0) - Trắng (#F4F6F9) (ktx-03.jpg) */}
      {[2, 3, 4, 5, 6, 7, 8].map((fl) =>
        bayXs.map((bx, bIdx) => {
          const pattern = (fl + bIdx) % 3;
          const panelColor =
            pattern === 0 ? KTX_BLUE_DEEP : pattern === 1 ? KTX_BLUE_SKY : KTX_WHITE;
          const glow = isNight && (fl + bIdx) % 2 === 0;
          return (
            <group key={`${code}-check-${fl}-${bIdx}`} position={[bx, fl * floorH + 1.45, size.z / 2 + 0.04]}>
              {/* Mảng tường/ban công phối màu ô cờ */}
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[2.28, floorH - 0.12, 0.16]} />
                <meshStandardMaterial color={panelColor} roughness={0.78} />
              </mesh>
              {/* Ô cửa sổ & khe logia tối màu bên trong mỗi khoang */}
              <mesh position={[0, 0.12, 0.1]}>
                <planeGeometry args={[1.42, 1.38]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : '#1E293B'}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.75 : 0}
                  roughness={0.3}
                />
              </mesh>
            </group>
          );
        }),
      )}

      {/* Mái phẳng + diềm mái xanh dương đậm */}
      <mesh position={[0, totalH + 0.25, 0]} castShadow>
        <boxGeometry args={[size.x + 0.4, 0.5, size.z + 0.4]} />
        <meshStandardMaterial color={KTX_BLUE_DEEP} roughness={0.78} />
      </mesh>

      {/* Chi tiết sân trước KTX mới (ktx-03.jpg): mái kính xanh lấy sáng tầng hầm + bồn gạch đỏ + ghế đá */}
      {[-3.4, 3.4].map((sx, sIdx) => (
        <group key={`${code}-forecourt-${sIdx}`} position={[sx, 0, size.z / 2 + 1.35]}>
          {/* Bồn gạch đỏ trồng cây cọ/cau cảnh */}
          <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.48, 1.2]} />
            <meshStandardMaterial color="#9E3B28" roughness={0.88} />
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
  return (
    <group position={[x, 0, z]} rotation-y={-Math.PI / 2}>
      {/* 2 trụ cổng xây gạch đỏ + mũ trụ trắng */}
      {[-2.3, 2.3].map((px) => (
        <group key={`hsv-pillar-${px}`} position={[px, 0, 0]}>
          <mesh position={[0, 1.65, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 3.3, 0.62]} />
            <meshStandardMaterial color="#A8422B" roughness={0.86} />
          </mesh>
          <mesh position={[0, 3.38, 0]} castShadow>
            <boxGeometry args={[0.76, 0.18, 0.76]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Cổng sắt đen mở hai bên trụ gạch */}
      {[-1.55, 1.55].map((gx) => (
        <mesh key={`hsv-gate-leaf-${gx}`} position={[gx, 1.15, 0]}>
          <boxGeometry args={[0.9, 2.1, 0.08]} />
          <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.5} />
        </mesh>
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
          // Huy hiệu tròn xanh Hội Sinh Viên ở phía trên-giữa
          ctx.fillStyle = '#1D4ED8';
          ctx.beginPath();
          ctx.arc(w * 0.16, h * 0.5, 36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 22px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('HSV', w * 0.16, h * 0.5);
          // Chữ "HỘI SINH VIÊN" màu xanh dương đậm
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

      {/* Nhà ăn KTX & bàn ghế dù che ngoài trời */}
      <group position={[d.canteenCenter.x, 0, d.canteenCenter.z]}>
        <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[d.canteenSize.x, 4.6, d.canteenSize.z]} />
          <meshStandardMaterial color="#FAF6EE" roughness={0.86} />
        </mesh>
        <mesh position={[0, 4.75, 0]} castShadow>
          <boxGeometry args={[d.canteenSize.x + 0.6, 0.35, d.canteenSize.z + 0.6]} />
          <meshStandardMaterial color="#C87D4B" roughness={0.78} />
        </mesh>
        <LabelPlane
          textureKey="dorm-canteen-sign"
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
            ctx.font = '900 36px Arial, sans-serif';
            ctx.fillText('NHÀ ĂN KTX BÁCH KHOA · 食堂', w / 2, h / 2);
          }}
          size={[4.4, 0.88]}
          position={[0, 3.85, d.canteenSize.z / 2 + 0.06]}
          transparent={false}
        />
      </group>
    </group>
  );
}
