// ---------------------------------------------------------------------------
// features/campus/buildings/C6C7C8Cluster.tsx — Cụm tòa nhà C6 – C7 – C8 &
// Trung tâm Hợp tác Việt – Đức (VDZ)
// Module IDs: building.c6-c8, building.c7, building.viet-duc-center
// ---------------------------------------------------------------------------

import { C7_BUILDING, C7_FACULTY_PARKING, D3_D5_PARKING_GARAGE, VDZ_CENTER } from '../world-data';
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

      {/* Mái hiên sảnh chính ở nhánh giữa, Cửa kính Giảng đường HSK & Biển hiệu C7 */}
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
      {/* Thảm sảnh & Cửa kính đôi dẫn vào Giảng đường Học HSK Tòa C7 */}
      <mesh position={[0, 0.04, size.z / 2 + 0.95]} receiveShadow>
        <boxGeometry args={[5.2, 0.08, 1.85]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.38, size.z / 2 + 0.06]}>
        <boxGeometry args={[3.1, 2.68, 0.06]} />
        <meshStandardMaterial color="#0F172A" roughness={0.4} metalness={0.5} />
      </mesh>
      {[-0.72, 0.72].map((dx, idx) => (
        <group key={`c7-hsk-door-${idx}`}>
          <mesh position={[dx, 1.36, size.z / 2 + 0.095]}>
            <boxGeometry args={[1.34, 2.48, 0.025]} />
            <meshStandardMaterial
              color={isNight ? '#FFEAB3' : '#38BDF8'}
              emissive={isNight ? '#FFB84D' : '#0284C7'}
              emissiveIntensity={isNight ? 1.1 : 0.25}
              roughness={0.22}
              metalness={0.35}
            />
          </mesh>
          {/* Tay nắm inox dọc cửa giảng đường */}
          <mesh position={[idx === 0 ? -0.14 : 0.14, 1.25, size.z / 2 + 0.13]}>
            <cylinderGeometry args={[0.018, 0.018, 0.52, 8]} />
            <meshStandardMaterial color="#F8FAFC" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <LabelPlane
        textureKey="c7-hsk-hub-banner"
        canvasW={640}
        canvasH={140}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#991B1B';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, h - 12);
          ctx.fillStyle = '#FDE047';
          ctx.font = '800 30px "Be Vietnam Pro", "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎓 TRUNG TÂM HỌC HÁN NGỮ HSK THEO BÀI', w / 2, h * 0.38);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '600 22px "Be Vietnam Pro", "Segoe UI", sans-serif';
          ctx.fillText('Bấm [E] trước sảnh để vào lớp & chọn bài học', w / 2, h * 0.75);
        }}
        size={[3.9, 0.82]}
        position={[0, 3.12, size.z / 2 + 0.12]}
      />

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

/**
 * Nhà để xe sinh viên D3 - D5 ("ĐIỂM TRÔNG GIỮ XE D3 - D5")
 * Nằm ngay bên tay trái (phía Nam +Z) khi đi từ Cổng Trần Đại Nghĩa vào khuôn viên.
 * Dựng chuẩn theo ảnh thật: tham-khao/Nha-de-xe-D3-D5/images.jpg
 */
export function D3D5ParkingGarage() {
  const { center, size, height } = D3_D5_PARKING_GARAGE;
  const halfW = size.x / 2;
  const frontZ = -size.z / 2; // Mặt tiền cổng vào quay về phía Bắc (-Z, nhìn ra trục chính Cổng Trần Đại Nghĩa)
  const columnZs = [-16.6, -11.0, -5.5, 0, 5.5, 11.0, 16.5];
  const motoRowsZ = [-12.5, -8.5, -4.5, -0.5, 3.5, 7.5, 11.5, 15.0];

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Nền bê tông nhà để xe D3 - D5 kéo dài sâu dọc trục Bắc–Nam + đường dẫn vào cổng */}
      <mesh position={[0, 0.028, -0.6]} receiveShadow>
        <boxGeometry args={[size.x + 1.2, 0.056, size.z + 2.4]} />
        <meshStandardMaterial color="#8E9299" roughness={0.92} />
      </mesh>
      {/* Vạch sơn phân làn lối đi xe máy dọc giữa nhà xe */}
      {[-0.65, 0.65].map((lx, idx) => (
        <mesh key={`d3d5-lane-line-${idx}`} rotation-x={-Math.PI / 2} position={[lx, 0.06, 0.8]}>
          <planeGeometry args={[0.1, size.z - 2.4]} />
          <meshStandardMaterial color="#FACC15" roughness={0.82} />
        </mesh>
      ))}

      {/* Kết cấu mái tôn khung thép phẳng xám sáng che mưa nắng chạy suốt chiều sâu 34m */}
      <mesh position={[0, height - 0.15, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[size.x + 0.6, 0.26, size.z - 0.2]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.7} metalness={0.35} />
      </mesh>
      {/* Dải tôn lấy sáng màu trắng đục chạy dọc chiều sâu mái nhà xe */}
      {[-3.8, 0, 3.8].map((sx) => (
        <mesh key={`d3d5-skylight-${sx}`} position={[sx, height + 0.01, 0.2]}>
          <boxGeometry args={[1.8, 0.04, size.z - 1.2]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.4} metalness={0.1} />
        </mesh>
      ))}

      {/* Dầm vì kèo thép ngang đỡ mái và hàng cột thép tròn màu bạc chạy dọc 2 biên Đông - Tây */}
      {columnZs.map((cz, zIdx) => (
        <group key={`d3d5-bay-${zIdx}`} position={[0, 0, cz]}>
          <mesh position={[0, height - 0.34, 0]}>
            <boxGeometry args={[size.x + 0.2, 0.16, 0.18]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.5} metalness={0.55} />
          </mesh>
          {[-halfW + 0.25, halfW - 0.25].map((cx, xIdx) => (
            <mesh key={`col-${xIdx}`} position={[cx, height / 2, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.13, height, 12]} />
              <meshStandardMaterial color="#D1D5DB" roughness={0.42} metalness={0.65} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Tường lửng + khung lưới bảo vệ thông thoáng dọc hai bên hông nhà xe */}
      {[-halfW + 0.25, halfW - 0.25].map((wx, sIdx) => (
        <group key={`d3d5-sidewall-${sIdx}`} position={[wx, 0, 1.2]}>
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.16, 1.1, size.z - 3.2]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.14, 0]}>
            <boxGeometry args={[0.2, 0.08, size.z - 3.1]} />
            <meshStandardMaterial color="#64748B" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Rèm vải trắng trang trí (valance bunting) treo dưới dầm cổng như trong ảnh thật */}
      {[-4.8, -2.9, -1.0, 1.0, 2.9, 4.8].map((vx, idx) => (
        <mesh
          key={`d3d5-valance-${idx}`}
          position={[vx, height - 0.92, frontZ - 0.22]}
          scale={[1.05, 0.34, 0.18]}
        >
          <sphereGeometry args={[0.92, 12, 8]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.85} />
        </mesh>
      ))}

      {/* BIỂN HIỆU ĐỎ "ĐIỂM TRÔNG GIỮ XE D3 - D5" (khớp 100% tham-khao/Nha-de-xe-D3-D5/images.jpg) */}
      <mesh position={[0, height - 0.35, frontZ - 0.24]} castShadow>
        <boxGeometry args={[size.x + 0.5, 1.18, 0.18]} />
        <meshStandardMaterial color="#C81E24" roughness={0.62} />
      </mesh>
      <LabelPlane
        textureKey="d3-d5-parking-sign-front-v2"
        canvasW={1024}
        canvasH={256}
        draw={(ctx, w, h) => {
          // Nền đỏ Bách khoa
          ctx.fillStyle = '#C81E24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#F8FAFC';
          ctx.lineWidth = 6;
          ctx.strokeRect(5, 5, w - 10, h - 10);

          // 1. Huy hiệu dọc ĐHBK Hà Nội ở góc trái (nền đỏ/trắng + sao vàng + bánh răng/compa + chữ BÁCH KHOA)
          const bx = 18;
          const by = 18;
          const bw = 136;
          const bh = h - 36;
          ctx.fillStyle = '#D91E26';
          ctx.fillRect(bx, by, bw / 2, bh - 42);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(bx + bw / 2, by, bw / 2, bh - 42);
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(bx, by + bh - 42, bw, 42);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.strokeRect(bx, by, bw, bh);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FACC15';
          ctx.font = '700 30px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('★', bx + bw * 0.25, by + 34);
          ctx.fillStyle = '#C81E24';
          ctx.font = '700 13px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('ĐẠI HỌC', bx + bw * 0.75, by + 34);
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(bx + bw * 0.5, by + 108, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#C81E24';
          ctx.font = '700 22px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('BK', bx + bw * 0.5, by + 110);
          ctx.font = '700 18px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('BÁCH KHOA', bx + bw * 0.5, by + bh - 20);

          // 2. Dòng chữ chính giữa: "ĐIỂM TRÔNG GIỮ XE" (trắng, chừa đủ khoảng trống dấu Ể phía trên) & "D3 - D5" (đen đậm)
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '700 56px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('ĐIỂM TRÔNG GIỮ XE', w * 0.5, 92);

          ctx.fillStyle = '#111827';
          ctx.font = '700 66px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('D3 - D5', w * 0.5, 186);

          // 3. Biển tròn xanh dương chữ "P" đỗ xe bên phải + hình xe máy vector sắc nét (không dùng emoji lỗi font)
          const px = w - 102;
          const py = h / 2;
          ctx.fillStyle = '#1D4ED8';
          ctx.beginPath();
          ctx.arc(px, py, 76, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 8;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 68px "Be Vietnam Pro", "Segoe UI", Roboto, "Noto Sans", sans-serif';
          ctx.fillText('P', px - 18, py - 8);
          // Vector biểu tượng xe máy trắng bên dưới-phải chữ P
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(px + 12, py + 28, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px + 40, py + 28, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px + 12, py + 28);
          ctx.lineTo(px + 24, py + 14);
          ctx.lineTo(px + 38, py + 14);
          ctx.lineTo(px + 40, py + 28);
          ctx.stroke();
        }}
        size={[size.x + 0.25, 1.12]}
        position={[0, height - 0.35, frontZ - 0.35]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />

      {/* 2 đảo phân làn sơn sọc vàng-đen + bốt quẹt thẻ màu cam + trụ camera & thanh chắn barie */}
      {[-3.4, 1.4].map((ix, idx) => (
        <group key={`d3d5-booth-${idx}`} position={[ix, 0, frontZ - 0.1]}>
          {/* Bệ đảo bê tông sơn sọc vàng đen */}
          <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.24, 2.2]} />
            <meshStandardMaterial color="#FACC15" roughness={0.75} />
          </mesh>
          {[-0.7, -0.2, 0.3, 0.8].map((sz, sIdx) => (
            <mesh key={`stripe-${sIdx}`} position={[0, 0.125, sz]}>
              <boxGeometry args={[0.94, 0.25, 0.22]} />
              <meshStandardMaterial color="#18181B" roughness={0.8} />
            </mesh>
          ))}
          {/* Tủ máy quẹt thẻ gửi xe thông minh màu cam đỏ */}
          <mesh position={[0, 0.72, -0.35]} castShadow>
            <boxGeometry args={[0.52, 0.96, 0.48]} />
            <meshStandardMaterial color="#EA580C" roughness={0.45} metalness={0.25} />
          </mesh>
          {/* Màn hình đọc thẻ trên tủ */}
          <mesh position={[0, 0.95, -0.6]}>
            <boxGeometry args={[0.34, 0.26, 0.04]} />
            <meshStandardMaterial color="#0F172A" roughness={0.3} />
          </mesh>
          {/* Cột gắn camera nhận diện biển số sơn vàng-đen */}
          <mesh position={[0, 1.35, 0.55]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 2.3, 10]} />
            <meshStandardMaterial color="#FACC15" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Thanh chắn barie trắng-đỏ */}
          <mesh position={[1.15, 0.88, -0.35]} castShadow>
            <boxGeometry args={[1.7, 0.07, 0.07]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Biển tròn "Cấm đỗ xe" gắn trên cột thép phải đúng theo ảnh */}
      <mesh position={[halfW - 0.25, 2.15, frontZ - 0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 18]} />
        <meshStandardMaterial color="#DC2626" roughness={0.5} />
      </mesh>
      <mesh position={[halfW - 0.25, 2.15, frontZ - 0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 18]} />
        <meshStandardMaterial color="#1D4ED8" roughness={0.5} />
      </mesh>

      {/* Các dãy xe máy & xe đạp sinh viên xếp gọn gàng chạy sâu dọc suốt 34m nhà xe D3 - D5 */}
      {[-4.8, -3.4, -2.0, 2.0, 3.4, 4.8].map((bx, bIdx) =>
        motoRowsZ.map((bz, rowIdx) => {
          const bodyColors = ['#1E293B', '#991B1B', '#1D4ED8', '#F8FAFC', '#334155', '#0F766E'];
          const col = bodyColors[(bIdx + rowIdx * 3) % bodyColors.length];
          return (
            <group key={`parked-moto-${bIdx}-${rowIdx}`} position={[bx, 0, bz]}>
              {/* Bánh trước & sau */}
              <mesh position={[0, 0.24, -0.52]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.18, 0.055, 8, 14]} />
                <meshStandardMaterial color="#18181B" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.24, 0.52]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.18, 0.055, 8, 14]} />
                <meshStandardMaterial color="#18181B" roughness={0.85} />
              </mesh>
              {/* Thân xe & yên xe */}
              <mesh position={[0, 0.52, 0.08]} castShadow>
                <boxGeometry args={[0.38, 0.36, 1.15]} />
                <meshStandardMaterial color={col} roughness={0.35} metalness={0.4} />
              </mesh>
              <mesh position={[0, 0.74, 0.16]}>
                <boxGeometry args={[0.32, 0.12, 0.68]} />
                <meshStandardMaterial color="#1E293B" roughness={0.8} />
              </mesh>
              {/* Cổ lái & đầu đèn */}
              <mesh position={[0, 0.82, -0.42]} rotation={[-0.25, 0, 0]}>
                <boxGeometry args={[0.56, 0.1, 0.12]} />
                <meshStandardMaterial color={col} roughness={0.4} />
              </mesh>
            </group>
          );
        }),
      )}
    </group>
  );
}

/**
 * Một chiếc ô tô 3D của giảng viên đỗ trên trục đường cạnh tòa C7
 */
function FacultyParkedCar({
  x,
  z,
  yaw,
  color,
  kind,
  plate,
  isNight,
}: {
  x: number;
  z: number;
  yaw: number;
  color: string;
  kind: 'sedan' | 'suv';
  plate: string;
  isNight: boolean;
}) {
  const isSuv = kind === 'suv';
  const bodyH = isSuv ? 0.68 : 0.56;
  const cabinH = isSuv ? 0.58 : 0.48;
  const cabinL = isSuv ? 2.45 : 2.05;
  const cabinZ = isSuv ? -0.18 : -0.1;

  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      {/* Bóng đổ tiếp xúc dưới gầm ô tô */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.024, 0]}>
        <planeGeometry args={[2.05, 4.5]} />
        <meshBasicMaterial color="#0F172A" transparent opacity={0.38} depthWrite={false} />
      </mesh>

      {/* 4 bánh xe hợp kim đa chấu */}
      {[
        [-0.86, -1.32],
        [0.86, -1.32],
        [-0.86, 1.32],
        [0.86, 1.32],
      ].map(([wx, wz], idx) => (
        <group key={`wheel-${idx}`} position={[wx, 0.32, wz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.22, 16]} />
            <meshStandardMaterial color="#18181B" roughness={0.85} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.23, 12]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.3} metalness={0.75} />
          </mesh>
        </group>
      ))}

      {/* Thân xe dưới (Lower Chassis) sơn bóng kim loại */}
      <mesh position={[0, 0.32 + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.82, bodyH, 4.32]} />
        <meshStandardMaterial color={color} roughness={0.28} metalness={0.55} />
      </mesh>
      {/* Cản trước & cản sau */}
      <mesh position={[0, 0.38, 2.18]} castShadow>
        <boxGeometry args={[1.76, 0.24, 0.12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.38, -2.18]} castShadow>
        <boxGeometry args={[1.76, 0.24, 0.12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} />
      </mesh>

      {/* Khoang cabin & kính chắn gió trước/sau/bên hông */}
      <mesh position={[0, 0.32 + bodyH + cabinH / 2 - 0.04, cabinZ]} castShadow>
        <boxGeometry args={[1.58, cabinH, cabinL]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.32 + bodyH + cabinH * 0.48, cabinZ]}>
        <boxGeometry args={[1.61, cabinH * 0.76, cabinL * 0.92]} />
        <meshStandardMaterial color="#1E293B" roughness={0.18} metalness={0.65} />
      </mesh>

      {/* Cụm đèn pha trước & lưới tản nhiệt mạ crôm */}
      <mesh position={[0, 0.56, 2.17]}>
        <boxGeometry args={[0.92, 0.18, 0.04]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.3} metalness={0.8} />
      </mesh>
      {[-0.64, 0.64].map((lx) => (
        <mesh key={`headlight-${lx}`} position={[lx, 0.62, 2.17]}>
          <boxGeometry args={[0.32, 0.14, 0.04]} />
          <meshStandardMaterial
            color="#F8FAFC"
            emissive="#FEF08A"
            emissiveIntensity={isNight ? 0.9 : 0.15}
            roughness={0.2}
          />
        </mesh>
      ))}
      {/* Cụm đèn hậu đỏ */}
      {[-0.64, 0.64].map((lx) => (
        <mesh key={`taillight-${lx}`} position={[lx, 0.64, -2.17]}>
          <boxGeometry args={[0.34, 0.14, 0.04]} />
          <meshStandardMaterial
            color="#DC2626"
            emissive="#EF4444"
            emissiveIntensity={isNight ? 0.8 : 0.2}
            roughness={0.3}
          />
        </mesh>
      ))}
      {/* Biển số xe trắng */}
      <LabelPlane
        textureKey={`car-plate-${plate}`}
        canvasW={192}
        canvasH={48}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 4;
          ctx.strokeRect(2, 2, w - 4, h - 4);
          ctx.fillStyle = '#0F172A';
          ctx.font = '900 26px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(plate, w / 2, h / 2 + 1);
        }}
        size={[0.48, 0.12]}
        position={[0, 0.42, 2.25]}
        transparent={false}
      />
    </group>
  );
}

/**
 * Trục đường & làn đỗ xe ô tô của các thầy cô giảng viên cạnh tòa C7
 * Nằm ngay bên tay phải (phía Bắc -Z) khi đi từ Cổng Trần Đại Nghĩa vào khuôn viên.
 */
export function C7FacultyParkingLane({ isNight }: { isNight: boolean }) {
  return (
    <group>
      {/* Dải nền bê tông nhựa đỗ xe ô tô dọc theo trục đường C7 (x: 68.8..74.4, z: -45.5..-17.5) */}
      <mesh rotation-x={-Math.PI / 2} position={[71.5, 0.018, -31.5]} receiveShadow>
        <planeGeometry args={[5.8, 28.0]} />
        <meshStandardMaterial color="#64686E" roughness={0.9} />
      </mesh>

      {/* Vạch sơn trắng phân chia 5 ô đỗ xe ô tô chuẩn kích thước */}
      {[-17.8, -23.3, -28.8, -34.3, -39.8, -45.2].map((lineZ, idx) => (
        <mesh key={`c7-stall-line-${idx}`} rotation-x={-Math.PI / 2} position={[71.5, 0.022, lineZ]}>
          <planeGeometry args={[5.2, 0.14]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.85} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[74.1, 0.022, -31.5]}>
        <planeGeometry args={[0.14, 27.5]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.85} />
      </mesh>

      {/* Biển báo "P — KHU ĐỖ XE Ô TÔ CÁN BỘ GIẢNG VIÊN C7" ở đầu trục đường */}
      <group position={[70.2, 0, -16.8]} rotation-y={0}>
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 2.3, 10]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.7} />
        </mesh>
        <LabelPlane
          textureKey="c7-faculty-parking-sign"
          canvasW={384}
          canvasH={256}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#1D4ED8';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 8;
            ctx.strokeRect(8, 8, w - 16, h - 16);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.font = '900 84px Arial, sans-serif';
            ctx.fillText('P', w / 2, 88);
            ctx.font = '800 26px Arial, sans-serif';
            ctx.fillText('KHU ĐỖ XE Ô TÔ', w / 2, 152);
            ctx.fillStyle = '#FDE047';
            ctx.font = '800 24px Arial, sans-serif';
            ctx.fillText('GIẢNG VIÊN TÒA C7', w / 2, 196);
          }}
          size={[1.05, 0.72]}
          position={[0, 2.05, 0.05]}
          transparent={false}
        />
      </group>

      {/* 5 chiếc ô tô giảng viên đỗ ngay ngắn trong ô */}
      {C7_FACULTY_PARKING.cars.map((car) => (
        <FacultyParkedCar
          key={car.id}
          x={car.x}
          z={car.z}
          yaw={car.yaw}
          color={car.color}
          kind={car.kind}
          plate={car.plate}
          isNight={isNight}
        />
      ))}
    </group>
  );
}
