// ---------------------------------------------------------------------------
// features/campus/buildings/C6C7C8Cluster.tsx — Cụm tòa nhà C6 – C7 – C8 &
// Trung tâm Hợp tác Việt – Đức (VDZ)
// Module IDs: building.c6-c8, building.c7, building.viet-duc-center
// ---------------------------------------------------------------------------

import { C7_BUILDING, VDZ_CENTER } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';

const WALL_BLUE_LIGHT = '#DCEAF7';
const HEADER_BLUE = '#3B6E9C';
const GLASS_MID = '#3A5F7D';

export function C6AndC8Block({
  code,
  subtitle,
  center,
  size,
  floors,
  floorHeight,
  isNight,
}: {
  code: string;
  subtitle: string;
  center: { x: number; z: number };
  size: { x: number; z: number };
  floors: number;
  floorHeight: number;
  isNight: boolean;
}) {
  const h = floors * floorHeight;
  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.14, 0.8, size.z + 0.14]} />
        <meshStandardMaterial color="#8E9BAE" roughness={0.88} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h, size.z]} />
        <meshStandardMaterial color={WALL_BLUE_LIGHT} roughness={0.86} />
      </mesh>
      <mesh position={[0, h + 0.25, 0]} castShadow>
        <boxGeometry args={[size.x + 0.45, 0.5, size.z + 0.45]} />
        <meshStandardMaterial color={HEADER_BLUE} roughness={0.75} />
      </mesh>
      {/* Cửa sổ mặt Nam & Bắc */}
      {Array.from({ length: floors }, (_, fl) =>
        [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((wx, idx) => {
          const glow = isNight && (fl + idx) % 2 === 0;
          return (
            <mesh
              key={`${code}-win-${fl}-${idx}`}
              position={[wx, fl * floorHeight + 1.65, size.z / 2 + 0.03]}
            >
              <planeGeometry args={[1.65, 1.2]} />
              <meshStandardMaterial
                color={glow ? '#FFE4A0' : GLASS_MID}
                emissive={glow ? '#FFB84D' : '#000000'}
                emissiveIntensity={glow ? 0.65 : 0}
                roughness={0.32}
              />
            </mesh>
          );
        }),
      )}
      <LabelPlane
        textureKey={`sign-${code}`}
        canvasW={512}
        canvasH={112}
        draw={(ctx, w, hCanvas) => {
          ctx.fillStyle = '#1E4E79';
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, hCanvas - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 36px Arial, sans-serif';
          ctx.fillText(`NHÀ ${code} · ${subtitle}`, w / 2, hCanvas / 2);
        }}
        size={[4.6, 0.92]}
        position={[0, h - 0.8, size.z / 2 + 0.06]}
        transparent={false}
      />
    </group>
  );
}

export function C7ComplexBuilding({ isNight }: { isNight: boolean }) {
  const { center, size, floors, floorHeight } = C7_BUILDING;
  const totalH = floors * floorHeight; // 9 tầng × 3.1m = 27.9m (khớp c7-flycam-toan-canh.jpg)
  const wingW = 5.4;
  const wingD = 10.2;
  const spineD = 5.3;
  const spineZ = -size.z / 2 + spineD / 2; // -5.1m (trục lưng phía Bắc)
  const wingZ = size.z / 2 - wingD / 2; // +2.65m (3 nhánh vươn về phía Nam tạo hình chữ E)
  const wingXs = [-size.x / 2 + wingW / 2, 0, size.x / 2 - wingW / 2]; // [-11.3, 0, +11.3]
  const courtXs = [-5.65, 5.65]; // 2 sân trong chữ U giữa 3 nhánh

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Bệ đá granite xám quanh toàn bộ tổ hợp C7 */}
      <mesh position={[0, 0.28, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.4, 0.56, size.z + 0.4]} />
        <meshStandardMaterial color="#8E949E" roughness={0.86} />
      </mesh>

      {/* ============ 1. KHỐI LƯNG CHÍNH (REAR SPINE) 9 TẦNG MÀU TRẮNG HIỆN ĐẠI ============ */}
      <mesh position={[0, totalH / 2, spineZ]} castShadow receiveShadow>
        <boxGeometry args={[size.x, totalH, spineD]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
      </mesh>
      {/* Mái phẳng xám nhạt + tường chắn mái (parapet) trên khối lưng */}
      <mesh position={[0, totalH + 0.22, spineZ]} castShadow>
        <boxGeometry args={[size.x + 0.3, 0.44, spineD + 0.3]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
      </mesh>
      {/* Dàn máy điều hòa trung tâm (HVAC chillers trắng) & tum thang máy trên mái lưng (c7-flycam-toan-canh.jpg) */}
      {[-9.5, -6.5, -3.5, 3.5, 6.5, 9.5].map((hx) => (
        <mesh key={`c7-hvac-${hx}`} position={[hx, totalH + 0.9, spineZ]} castShadow>
          <boxGeometry args={[2.1, 0.95, 1.8]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.65} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, totalH + 1.25, spineZ]} castShadow>
        <boxGeometry args={[3.8, 1.65, 2.8]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>

      {/* ============ 2. BA NHÁNH CHỮ E (3 PARALLEL WINGS) VƯƠN VỀ PHÍA NAM ============ */}
      {wingXs.map((wx, wIdx) => (
        <group key={`c7-wing-${wIdx}`} position={[wx, 0, wingZ]}>
          {/* Thân nhánh 9 tầng sơn trắng sáng */}
          <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[wingW, totalH, wingD]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
          </mesh>
          {/* Vách kính lớn thông tầng 1–2 (giảng đường & sảnh, cao 6.0m) */}
          <mesh position={[0, 3.1, 0.04]} castShadow>
            <boxGeometry args={[wingW + 0.08, 5.6, wingD - 0.5]} />
            <meshStandardMaterial color="#1E2D3B" roughness={0.25} metalness={0.35} />
          </mesh>
          {/* Khe hành lang / logia đứng âm tường ở chính giữa mặt đứng mỗi nhánh (c7-goc-nghieng.jpg) */}
          <mesh position={[0, (totalH + 6.2) / 2, wingD / 2 - 0.08]}>
            <boxGeometry args={[1.35, totalH - 6.6, 0.28]} />
            <meshStandardMaterial color="#334155" roughness={0.75} />
          </mesh>
          {/* Gờ phân tầng ngang màu xám trắng và lưới cửa sổ khung tối tầng 3–9 */}
          {[2, 3, 4, 5, 6, 7, 8].map((fl) => (
            <group key={`c7-wing-fl-${wIdx}-${fl}`}>
              <mesh position={[0, fl * floorHeight, 0]}>
                <boxGeometry args={[wingW + 0.14, 0.14, wingD + 0.14]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
              </mesh>
              {/* Cửa sổ 2 bên khe logia ở đầu hồi Nam của mỗi nhánh */}
              {[-1.7, 1.7].map((dx, dIdx) => {
                const glow = isNight && (fl + wIdx + dIdx) % 2 === 0;
                return (
                  <mesh
                    key={`c7-front-win-${wIdx}-${fl}-${dIdx}`}
                    position={[dx, fl * floorHeight + 1.55, wingD / 2 + 0.03]}
                  >
                    <planeGeometry args={[1.35, 1.35]} />
                    <meshStandardMaterial
                      color={glow ? '#FFE4A0' : '#233445'}
                      emissive={glow ? '#FFB84D' : '#000000'}
                      emissiveIntensity={glow ? 0.75 : 0}
                      roughness={0.28}
                      metalness={0.25}
                    />
                  </mesh>
                );
              })}
              {/* Cửa sổ dọc hai mặt bên (Đông & Tây) của nhánh nhìn xuống sân cây xanh */}
              {[-3.2, 0, 3.2].map((dz, zIdx) => {
                const glow = isNight && (fl + wIdx + zIdx) % 3 === 0;
                return (
                  <group key={`c7-side-win-${wIdx}-${fl}-${zIdx}`}>
                    <mesh
                      position={[-wingW / 2 - 0.03, fl * floorHeight + 1.55, dz]}
                      rotation-y={-Math.PI / 2}
                    >
                      <planeGeometry args={[1.85, 1.32]} />
                      <meshStandardMaterial
                        color={glow ? '#FFE4A0' : '#233445'}
                        emissive={glow ? '#FFB84D' : '#000000'}
                        emissiveIntensity={glow ? 0.72 : 0}
                        roughness={0.28}
                      />
                    </mesh>
                    <mesh
                      position={[wingW / 2 + 0.03, fl * floorHeight + 1.55, dz]}
                      rotation-y={Math.PI / 2}
                    >
                      <planeGeometry args={[1.85, 1.32]} />
                      <meshStandardMaterial
                        color={glow ? '#FFE4A0' : '#233445'}
                        emissive={glow ? '#FFB84D' : '#000000'}
                        emissiveIntensity={glow ? 0.72 : 0}
                        roughness={0.28}
                      />
                    </mesh>
                  </group>
                );
              })}
            </group>
          ))}
          {/* Mái phẳng + Ô mái ngói đỏ đặc trưng trên đỉnh mỗi nhánh chữ E (c7-flycam-toan-canh.jpg) */}
          <mesh position={[0, totalH + 0.22, 0]} castShadow>
            <boxGeometry args={[wingW + 0.3, 0.44, wingD + 0.3]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
          </mesh>
          <mesh position={[0, totalH + 0.62, 1.6]} castShadow>
            <boxGeometry args={[wingW - 0.8, 0.45, 4.2]} />
            <meshStandardMaterial color="#C84B31" roughness={0.72} />
          </mesh>
        </group>
      ))}

      {/* Cửa sổ mặt Bắc và mặt sân trong của khối lưng 9 tầng */}
      {[2, 3, 4, 5, 6, 7, 8].map((fl) =>
        [-11.5, -8.5, -5.65, -2.8, 0, 2.8, 5.65, 8.5, 11.5].map((sx, sIdx) => {
          const glow = isNight && (fl + sIdx) % 2 === 1;
          return (
            <group key={`c7-spine-win-${fl}-${sIdx}`}>
              <mesh
                position={[sx, fl * floorHeight + 1.55, spineZ - spineD / 2 - 0.03]}
                rotation-y={Math.PI}
              >
                <planeGeometry args={[1.9, 1.32]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : '#233445'}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.28}
                />
              </mesh>
              {(Math.abs(sx - -5.65) < 2.9 || Math.abs(sx - 5.65) < 2.9) && (
                <mesh position={[sx, fl * floorHeight + 1.55, spineZ + spineD / 2 + 0.03]}>
                  <planeGeometry args={[1.8, 1.32]} />
                  <meshStandardMaterial
                    color={glow ? '#FFE4A0' : '#233445'}
                    emissive={glow ? '#FFB84D' : '#000000'}
                    emissiveIntensity={glow ? 0.72 : 0}
                    roughness={0.28}
                  />
                </mesh>
              )}
            </group>
          );
        }),
      )}

      {/* ============ 3. HAI SÂN TRONG TRỒNG CÂY XANH & BỒN GẠCH ĐỎ (c7-mat-trong-san-cay.jpg) ============ */}
      {courtXs.map((cx, cIdx) => (
        <group key={`c7-courtyard-${cIdx}`} position={[cx, 0, wingZ]}>
          {/* Nền sân lát gạch xám sáng */}
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.032, 0]} receiveShadow>
            <planeGeometry args={[5.8, wingD - 0.4]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.9} />
          </mesh>
          {/* 2 bồn cây xây gạch đỏ trần (#C47D5B) + thảm cỏ + cây bóng mát trong mỗi sân */}
          {[-2.1, 2.2].map((pz, pIdx) => (
            <group key={`c7-planter-${cIdx}-${pIdx}`} position={[0, 0, pz]}>
              <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
                <boxGeometry args={[3.2, 0.48, 2.4]} />
                <meshStandardMaterial color="#C47D5B" roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.49, 0]} receiveShadow>
                <boxGeometry args={[2.85, 0.04, 2.05]} />
                <meshStandardMaterial color="#4D7C43" roughness={0.95} />
              </mesh>
              <mesh position={[0, 1.65, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.2, 2.4, 8]} />
                <meshStandardMaterial color="#5C4430" roughness={0.95} />
              </mesh>
              <mesh position={[0, 3.2, 0]} castShadow>
                <sphereGeometry args={[1.25, 12, 10]} />
                <meshStandardMaterial color="#3F6E38" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Mái hiên sảnh chính ở nhánh giữa & Biển hiệu C7 */}
      <mesh position={[0, 3.65, size.z / 2 + 0.9]} castShadow>
        <boxGeometry args={[5.8, 0.34, 1.8]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
      </mesh>
      {[-2.2, 2.2].map((colX) => (
        <mesh key={`c7-porch-col-${colX}`} position={[colX, 1.82, size.z / 2 + 1.55]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3.64, 14]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* Chữ nổi "C7" màu xám bạc gắn trên cao mặt đứng nhánh phải (c7-goc-nghieng.jpg) */}
      <LabelPlane
        textureKey="c7-top-code-sign"
        canvasW={256}
        canvasH={160}
        draw={(ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 118px Arial, sans-serif';
          ctx.lineWidth = 6;
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.75)';
          ctx.strokeText('C7', w / 2, h / 2);
          ctx.fillStyle = '#64748B';
          ctx.fillText('C7', w / 2, h / 2);
        }}
        size={[2.4, 1.5]}
        position={[wingXs[2] + 1.2, totalH - 1.9, size.z / 2 + 0.06]}
      />

      <LabelPlane
        textureKey="c7-main-sign"
        canvasW={512}
        canvasH={128}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1E3A5F';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 34px Arial, sans-serif';
          ctx.fillText('TÒA NHÀ C7 · ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.4);
          ctx.fillStyle = '#93C5FD';
          ctx.font = '700 23px Arial, sans-serif';
          ctx.fillText('TỔ HỢP GIẢNG ĐƯỜNG & ĐIỀU HÀNH TRUNG TÂM', w / 2, h * 0.75);
        }}
        size={[5.2, 1.1]}
        position={[0, 4.35, size.z / 2 + 0.08]}
        transparent={false}
      />
    </group>
  );
}

export function VietDucCenterBuilding({ isNight }: { isNight: boolean }) {
  const { center, size, floors, floorHeight } = VDZ_CENTER;
  const h = floors * floorHeight;

  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h, size.z]} />
        <meshStandardMaterial color="#E6F0FA" roughness={0.86} />
      </mesh>
      <mesh position={[0, h + 0.22, 0]} castShadow>
        <boxGeometry args={[size.x + 0.4, 0.44, size.z + 0.4]} />
        <meshStandardMaterial color="#3B6E9C" roughness={0.78} />
      </mesh>
      {[0, 1].map((fl) =>
        [-3.6, -1.2, 1.2, 3.6].map((wx, idx) => (
          <mesh key={`vdz-win-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.6, size.z / 2 + 0.03]}>
            <planeGeometry args={[1.5, 1.15]} />
            <meshStandardMaterial
              color={isNight ? '#FFE4A0' : GLASS_MID}
              emissive={isNight ? '#FFB84D' : '#000000'}
              emissiveIntensity={isNight ? 0.65 : 0}
              roughness={0.35}
            />
          </mesh>
        )),
      )}
      <LabelPlane
        textureKey="vdz-sign"
        canvasW={512}
        canvasH={112}
        draw={(ctx, w, hCanvas) => {
          ctx.fillStyle = '#1E3A5F';
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#F5C518';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, hCanvas - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 32px Arial, sans-serif';
          ctx.fillText('TRUNG TÂM VIỆT - ĐỨC (VDZ)', w / 2, hCanvas / 2);
        }}
        size={[4.0, 0.82]}
        position={[0, h - 0.55, size.z / 2 + 0.05]}
        transparent={false}
      />
    </group>
  );
}
