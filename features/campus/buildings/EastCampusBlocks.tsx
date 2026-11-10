// ---------------------------------------------------------------------------
// features/campus/buildings/EastCampusBlocks.tsx — Nhà B1 (Trường CNTT & TT — SoICT)
// & Cụm A17, H1, H3 và Nhà T
// Module IDs: building.b1-soict, building.east-blocks
// ---------------------------------------------------------------------------

import { EAST_CAMPUS_BLOCKS, SOICT_B1 } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';

const GLASS_DARK = '#27445C';

export function SoictB1Building({ isNight }: { isNight: boolean }) {
  const { center, floorHeight } = SOICT_B1;
  const h7 = 7 * floorHeight; // 22.4 m (cánh trái + trụ góc tròn 7 tầng)
  const h8 = 8 * floorHeight; // 25.6 m (khối tháp phải 8 tầng mang biển B1 xanh dương)
  const h5 = 5 * floorHeight; // 16.0 m (khối giật cấp phía trước 5 tầng)
  const basePlinthH = 2 * floorHeight; // 6.4 m (2 tầng đế sơn trắng sáng đồng bộ toàn tòa B1)
  const B1_PLINTH_WHITE = '#F8FAFC';
  const B1_WHITE = '#FFFFFF';

  // Xoay 180° (Math.PI) để mặt tiền sảnh tròn (Rotunda), bồn cỏ bán nguyệt và biển "B1"
  // hướng về phía Bắc (-Z, nhìn ra trục đường chính Cổng Trần Đại Nghĩa và nhóm sinh viên trước sảnh)
  return (
    <group position={[center.x, 0, center.z]} rotation-y={Math.PI}>
      {/* ============ 1. CÁNH TRÁI 7 TẦNG (XẾP CHÉO CHỮ V, TOÀN KHỐI SƠN TRẮNG SÁNG) ============ */}
      <group position={[-5.4, 0, -1.2]} rotation-y={0.28}>
        {/* Tầng 1-2 khối đế sơn trắng sáng + phào chỉ ngang */}
        <mesh position={[0, basePlinthH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.4, basePlinthH, 5.6]} />
          <meshStandardMaterial color={B1_PLINTH_WHITE} roughness={0.8} />
        </mesh>
        {/* Tầng 3-7 sơn trắng tinh khiết */}
        <mesh position={[0, (basePlinthH + h7) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.3, h7 - basePlinthH, 5.5]} />
          <meshStandardMaterial color={B1_WHITE} roughness={0.82} />
        </mesh>
        <mesh position={[0, h7 + 0.22, 0]} castShadow>
          <boxGeometry args={[9.6, 0.44, 5.8]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6].map((fl) =>
          [-3.2, -1.1, 1.1, 3.2].map((wx, idx) => {
            const glow = isNight && (fl + idx) % 2 === 0;
            return (
              <mesh key={`b1-left-w-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.65, 2.82]}>
                <planeGeometry args={[1.42, 1.22]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_DARK}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.3}
                />
              </mesh>
            );
          }),
        )}
      </group>

      {/* ============ 2. CÁNH PHẢI 8 TẦNG GIẬT CẤP XUỐNG 5 TẦNG + BIỂN CHỮ "B1" XANH DƯƠNG ============ */}
      <group position={[4.6, 0, -1.5]} rotation-y={-0.22}>
        {/* Khối cao 8 tầng phía sau màu trắng */}
        <mesh position={[0, h8 / 2, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[10.2, h8, 5.4]} />
          <meshStandardMaterial color={B1_WHITE} roughness={0.82} />
        </mesh>
        <mesh position={[0, h8 + 0.22, -0.6]} castShadow>
          <boxGeometry args={[10.5, 0.44, 5.7]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
        </mesh>
        {/* Khối giật cấp 5 tầng nhô ra phía trước sơn trắng đồng bộ */}
        <mesh position={[0.4, basePlinthH / 2, 2.2]} castShadow receiveShadow>
          <boxGeometry args={[8.8, basePlinthH, 3.8]} />
          <meshStandardMaterial color={B1_PLINTH_WHITE} roughness={0.8} />
        </mesh>
        <mesh position={[0.4, (basePlinthH + h5) / 2, 2.2]} castShadow receiveShadow>
          <boxGeometry args={[8.7, h5 - basePlinthH, 3.7]} />
          <meshStandardMaterial color={B1_WHITE} roughness={0.82} />
        </mesh>
        <mesh position={[0.4, h5 + 0.2, 2.2]} castShadow>
          <boxGeometry args={[9.0, 0.4, 4.0]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
        </mesh>
        {/* Cửa sổ mặt trước khối 5 tầng */}
        {[0, 1, 2, 3, 4].map((fl) =>
          [-2.6, -0.6, 1.4, 3.4].map((wx, idx) => {
            const glow = isNight && (fl + idx) % 2 === 1;
            return (
              <mesh key={`b1-right5-w-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.65, 4.13]}>
                <planeGeometry args={[1.4, 1.22]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_DARK}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.3}
                />
              </mesh>
            );
          }),
        )}
        {/* Cửa sổ tầng 6-8 của khối tháp 8 tầng lộ phía trên khối 5 tầng */}
        {[5, 6, 7].map((fl) =>
          [-3.2, -1.1, 1.1, 3.2].map((wx, idx) => {
            const glow = isNight && (fl + idx) % 2 === 0;
            return (
              <mesh key={`b1-right8-w-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.65, 2.13]}>
                <planeGeometry args={[1.45, 1.22]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_DARK}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.3}
                />
              </mesh>
            );
          }),
        )}
        {/* Biển chữ nổi "B1" màu xanh dương đậm (#1D4E9E) trên đỉnh cánh 8 tầng (b1-soict-01.jpg, b1-soict-03.jpg) */}
        <LabelPlane
          textureKey="soict-b1-top-blue-code"
          canvasW={256}
          canvasH={160}
          draw={(ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '700 120px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeText('B1', w / 2, h / 2);
            ctx.fillStyle = '#1D4E9E';
            ctx.fillText('B1', w / 2, h / 2);
          }}
          size={[2.3, 1.45]}
          position={[-3.2, h8 - 1.5, 2.16]}
        />
      </group>

      {/* ============ 3. KHỐI TRỤ GÓC BO TRÒN 7 TẦNG & KHỐI SẢNH TRÒN 3 TẦNG NHÔ RA (b1-soict-02.jpg) ============ */}
      <group position={[-0.4, 0, -0.8]}>
        {/* Trụ góc bo tròn 7 tầng màu trắng */}
        <mesh position={[0, h7 / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.15, 3.15, h7, 24]} />
          <meshStandardMaterial color={B1_WHITE} roughness={0.8} />
        </mesh>
        {/* Các dải kính cong ngang theo từng tầng trên trụ góc tròn */}
        {[2, 3, 4, 5, 6].map((fl) => (
          <mesh key={`b1-cyl-glass-${fl}`} position={[0, fl * floorHeight + 1.65, 0]}>
            <cylinderGeometry args={[3.18, 3.18, 1.25, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84]} />
            <meshStandardMaterial
              color={isNight && fl % 2 === 0 ? '#FFE4A0' : GLASS_DARK}
              emissive={isNight && fl % 2 === 0 ? '#FFB84D' : '#000000'}
              emissiveIntensity={isNight && fl % 2 === 0 ? 0.65 : 0}
              roughness={0.28}
              metalness={0.3}
              side={2}
            />
          </mesh>
        ))}
        <mesh position={[0, h7 + 0.24, 0]} castShadow>
          <cylinderGeometry args={[3.35, 3.35, 0.48, 24]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
        </mesh>

        {/* Khối sảnh tròn (Rotunda) 3 tầng nhô ra phía trước tại góc giao (b1-soict-01.jpg, b1-soict-02.jpg) */}
        <group position={[0, 0, 2.8]}>
          {/* Tầng 1: Sảnh kính cong + hàng cột trụ tròn trắng + mái đón (canopy) đua rộng */}
          <mesh position={[0, 1.7, 0]} castShadow>
            <cylinderGeometry args={[2.9, 2.9, 3.4, 24]} />
            <meshStandardMaterial color="#1E2D3B" roughness={0.25} metalness={0.35} />
          </mesh>
          {[-2.4, -1.2, 0, 1.2, 2.4].map((ang, cIdx) => (
            <mesh
              key={`b1-rotunda-col-${cIdx}`}
              position={[Math.sin(ang * 0.42) * 3.25, 1.7, Math.cos(ang * 0.42) * 3.25]}
              castShadow
            >
              <cylinderGeometry args={[0.18, 0.18, 3.4, 14]} />
              <meshStandardMaterial color={B1_WHITE} roughness={0.75} />
            </mesh>
          ))}
          {/* Mái đón sảnh cong ốp alu trắng sáng */}
          <mesh position={[0, 3.45, 0.55]} castShadow>
            <cylinderGeometry args={[3.9, 3.9, 0.36, 24]} />
            <meshStandardMaterial color={B1_WHITE} roughness={0.6} metalness={0.2} />
          </mesh>
          {/* Tầng 2 của khối sảnh tròn: sơn trắng sáng đồng bộ toàn tòa B1 */}
          <mesh position={[0, 4.9, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.3, 3.3, 2.8, 24]} />
            <meshStandardMaterial color={B1_PLINTH_WHITE} roughness={0.8} />
          </mesh>
          {/* Tầng 3 của khối sảnh tròn: sơn trắng + dải cửa sổ + lan can sân thượng */}
          <mesh position={[0, 7.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.3, 3.3, 2.8, 24]} />
            <meshStandardMaterial color={B1_WHITE} roughness={0.82} />
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
          <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
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
        textureKey="soict-b1-sign-white-blue"
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, hCanvas) => {
          ctx.fillStyle = '#1D4E9E';
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, hCanvas - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '700 30px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('NHÀ B1 · TRƯỜNG CNTT & TT (SoICT)', w / 2, hCanvas * 0.4);
          ctx.fillStyle = '#E0F2FE';
          ctx.font = '600 20px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('SCHOOL OF INFORMATION AND COMMUNICATIONS TECHNOLOGY', w / 2, hCanvas * 0.75);
        }}
        size={[4.4, 0.92]}
        position={[-0.4, 3.55, 6.48]}
        transparent={false}
      />
    </group>
  );
}

export function EastCampusBlocks({ isNight }: { isNight: boolean }) {
  const { a17, h1, h3, nhaT } = EAST_CAMPUS_BLOCKS;
  const smallBlocks = [
    { code: 'A17', center: a17.center, size: a17.size, color: '#DCEAF7', roof: '#3B6E9C', rotY: 0 },
    { code: 'H1', center: h1.center, size: h1.size, color: '#EDE5D5', roof: '#8C7A6B', rotY: -0.55 },
    { code: 'H3', center: h3.center, size: h3.size, color: '#EDE5D5', roof: '#8C7A6B', rotY: 0 },
  ];

  return (
    <group>
      {smallBlocks.map((b) => (
        <group key={b.code} position={[b.center.x, 0, b.center.z]} rotation-y={b.rotY}>
          <mesh position={[0, 4.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.size.x, 9.6, b.size.z]} />
            <meshStandardMaterial color={b.color} roughness={0.88} />
          </mesh>
          <mesh position={[0, 9.8, 0]} castShadow>
            <boxGeometry args={[b.size.x + 0.4, 0.4, b.size.z + 0.4]} />
            <meshStandardMaterial color={b.roof} roughness={0.82} />
          </mesh>
          <LabelPlane
            textureKey={`east-block-${b.code}`}
            canvasW={256}
            canvasH={96}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#1E3A5F';
              ctx.fillRect(0, 0, w, h);
              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '900 44px Arial, sans-serif';
              ctx.fillText(b.code, w / 2, h / 2);
            }}
            size={[2.0, 0.72]}
            position={[0, 8.4, b.size.z / 2 + 0.05]}
            transparent={false}
          />
        </group>
      ))}

      {/* Nhà T lớn nằm chéo ở rìa Đông như trên khuon-vien-truong.png */}
      <group position={[nhaT.center.x, 0, nhaT.center.z]} rotation-y={-0.32}>
        <mesh position={[0, 6.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[nhaT.size.x, 12.4, nhaT.size.z]} />
          <meshStandardMaterial color="#2C4A6F" roughness={0.82} />
        </mesh>
        <mesh position={[0, 12.6, 0]} castShadow>
          <boxGeometry args={[nhaT.size.x + 0.5, 0.45, nhaT.size.z + 0.5]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
        </mesh>
        {[0, 1, 2].map((fl) =>
          [-7, -3.5, 0, 3.5, 7].map((wz, idx) => (
            <mesh key={`nhat-win-${fl}-${idx}`} position={[-nhaT.size.x / 2 - 0.03, fl * 3.6 + 2.2, wz]} rotation-y={-Math.PI / 2}>
              <planeGeometry args={[1.8, 1.3]} />
              <meshStandardMaterial
                color={isNight ? '#FFE4A0' : '#93C5FD'}
                emissive={isNight ? '#FFB84D' : '#000000'}
                emissiveIntensity={isNight ? 0.65 : 0}
                roughness={0.35}
              />
            </mesh>
          )),
        )}
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
          position={[-nhaT.size.x / 2 - 0.06, 10.6, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          transparent={false}
        />
      </group>
    </group>
  );
}
