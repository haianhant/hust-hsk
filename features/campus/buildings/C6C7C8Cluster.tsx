// ---------------------------------------------------------------------------
// features/campus/buildings/C6C7C8Cluster.tsx — Cụm tòa nhà C6 – C7 – C15,
// Trung tâm Hợp tác Việt – Đức (VDZ) & Nhà Cựu sinh viên (HUST Digital Hub)
// Đối chiếu chuẩn https://hustmap.com/ & bộ ảnh thật tham-khao/c7/
// Module IDs: building.c6-c15, building.c7, building.viet-duc-center, building.alumni-house
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ALUMNI_HOUSE,
  C7_BUILDING,
  C7_FACULTY_PARKING,
  D3_D5_PARKING_GARAGE,
  HUST_DIGITAL_HUB,
  SCHOOL_OF_MATERIALS,
  VDZ_CENTER,
} from '../world-data';
import { ExtrudedText3D, FramedSignBox3D } from '../../../components/three/Signage3D';
import { LabelPlane } from '../../../components/three/TextPlate';
import { ImprovedTree } from '../../../components/three/Trees';
import { makeSoftShadowTexture } from '../../../components/three/materials';

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
  const isNorthSouth = size.z > size.x;
  const span = isNorthSouth ? size.z : size.x;
  const winCount = Math.max(2, Math.floor((span - 1.4) / 2.8));
  const winOffsets = Array.from(
    { length: winCount },
    (_, i) => -((winCount - 1) * 1.35) + i * 2.7,
  );
  const signW = Math.min(span - 1.0, 4.6);
  const labelText = subtitle.includes(code) ? subtitle : `NHÀ ${code} · ${subtitle}`;

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
      {/* Hệ cửa sổ tự động co giãn theo mặt đứng dài (Đông–Tây cho C6, Bắc–Nam cho C15) */}
      {Array.from({ length: floors }, (_, fl) =>
        winOffsets.map((u, idx) => {
          const glow = isNight && (fl + idx) % 2 === 0;
          const y = fl * floorHeight + 1.65;
          return isNorthSouth ? (
            <group key={`${code}-win-${fl}-${idx}`}>
              <mesh position={[-size.x / 2 - 0.03, y, u]} rotation-y={-Math.PI / 2}>
                <planeGeometry args={[1.55, 1.18]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_MID}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.65 : 0}
                  roughness={0.32}
                />
              </mesh>
              <mesh position={[size.x / 2 + 0.03, y, u]} rotation-y={Math.PI / 2}>
                <planeGeometry args={[1.55, 1.18]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_MID}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.65 : 0}
                  roughness={0.32}
                />
              </mesh>
            </group>
          ) : (
            <group key={`${code}-win-${fl}-${idx}`}>
              <mesh position={[u, y, size.z / 2 + 0.03]}>
                <planeGeometry args={[1.65, 1.2]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_MID}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.65 : 0}
                  roughness={0.32}
                />
              </mesh>
              <mesh position={[u, y, -size.z / 2 - 0.03]} rotation-y={Math.PI}>
                <planeGeometry args={[1.65, 1.2]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : GLASS_MID}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.65 : 0}
                  roughness={0.32}
                />
              </mesh>
            </group>
          );
        }),
      )}
      <LabelPlane
        textureKey={`sign-${code}-v2`}
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
          ctx.font = '900 34px Arial, sans-serif';
          ctx.fillText(labelText, w / 2, hCanvas / 2);
        }}
        size={[signW, 0.92]}
        position={
          isNorthSouth
            ? [-size.x / 2 - 0.06, h - 0.75, 0]
            : [0, h - 0.8, size.z / 2 + 0.06]
        }
        rotation={isNorthSouth ? [0, -Math.PI / 2, 0] : [0, 0, 0]}
        transparent={false}
      />
    </group>
  );
}

export function C7ComplexBuilding({
  isNight,
  hskMode = false,
}: {
  isNight: boolean;
  hskMode?: boolean;
}) {
  const { center, size, floors, floorHeight } = C7_BUILDING;
  const totalH = floors * floorHeight; // 9 tầng × 3.1m = 27.9m (khớp c7-flycam-toan-canh.jpg & tham-khao/NEW/)
  // Mặt bằng chữ E chạy dọc Bắc–Nam theo đúng https://hustmap.com/ & tham-khao/NEW/:
  // - Thân lưng dọc phía Đông (+X, dọc phố Trần Đại Nghĩa)
  // - 3 cánh song song vươn về phía Tây (-X), kẹp 2 sân cây xanh mở ra trục đường x = 56.2
  // - Mặt Nam (+Z, z = -13.8) chạy liền mạch sát nhánh đường 1 chiều đi vào từ Cổng Trần Đại Nghĩa
  const spineW = 6.5;
  const spineX = size.x / 2 - spineW / 2; // +10.75m
  const wingLenX = 21.55; // nhúng 0.05m vào khối lưng để khử z-fighting, chạm đúng -size.x/2 = -14.0m
  const wingX = -size.x / 2 + wingLenX / 2; // -3.225m
  const wingD = 7.2;
  const wingZs = [-size.z / 2 + wingD / 2, 0, size.z / 2 - wingD / 2]; // [-15.4, 0, +15.4]
  const courtZs = [-7.7, 7.7]; // 2 sân trong trồng cây xanh giữa 3 nhánh
  const southZ = size.z / 2; // +19.0m (world z = -13.8m, mặt tiền phía Nam nhìn ra làn đi vào)

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Vỉa hè lát đá granite xám + bó vỉa dọc mặt Nam (sát làn đi vào) & mặt Tây (sát trục rẽ phải x = 56.2) */}
      <mesh position={[-0.6, 0.036, southZ + 0.95]} receiveShadow>
        <boxGeometry args={[size.x + 3.2, 0.072, 1.9]} />
        <meshStandardMaterial color="#B9C1CA" roughness={0.86} />
      </mesh>
      <mesh position={[-size.x / 2 - 1.05, 0.036, 0.4]} receiveShadow>
        <boxGeometry args={[2.1, 0.072, size.z + 1.2]} />
        <meshStandardMaterial color="#B9C1CA" roughness={0.86} />
      </mesh>

      {/* Bệ đá granite xám quanh khối lưng */}
      <mesh position={[spineX, 0.28, 0]} receiveShadow>
        <boxGeometry args={[spineW + 0.4, 0.56, size.z + 0.4]} />
        <meshStandardMaterial color="#8E949E" roughness={0.86} />
      </mesh>

      {/* ============ 1. KHỐI LƯNG CHÍNH (EAST REAR SPINE) 9 TẦNG DỌC TRẦN ĐẠI NGHĨA ============ */}
      <mesh position={[spineX, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[spineW, totalH, size.z]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
      </mesh>
      {/* Vách kính đế tầng 1–2 dọc mặt Đông khối lưng */}
      <mesh position={[size.x / 2 - 0.22, 3.1, 0]} castShadow>
        <boxGeometry args={[0.52, 5.5, size.z - 1.2]} />
        <meshStandardMaterial color="#1E2D3B" roughness={0.25} metalness={0.35} />
      </mesh>
      {/* Mái phẳng xám nhạt + tường chắn mái (parapet) trên khối lưng */}
      <mesh position={[spineX, totalH + 0.22, 0]} castShadow>
        <boxGeometry args={[spineW + 0.3, 0.44, size.z + 0.3]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
      </mesh>
      {/* Dàn máy điều hòa trung tâm (HVAC chillers trắng) & tum thang máy trên mái lưng */}
      {[-14.5, -9.5, -4.5, 4.5, 9.5, 14.5].map((hz) => (
        <mesh key={`c7-hvac-${hz}`} position={[spineX, totalH + 0.9, hz]} castShadow>
          <boxGeometry args={[1.9, 0.95, 2.2]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.65} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[spineX, totalH + 1.25, 0]} castShadow>
        <boxGeometry args={[3.0, 1.65, 4.2]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>

      {/* ============ 2. BA NHÁNH CHỮ E (3 PARALLEL WINGS) VƯƠN VỀ PHÍA TÂY (-X) ============ */}
      {wingZs.map((wz, wIdx) => (
        <group key={`c7-wing-${wIdx}`} position={[wingX, 0, wz]}>
          {wIdx < 2 ? (
            <>
              {/* Chân đế granite từng nhánh (Bắc & Giữa) */}
              <mesh position={[0, 0.28, 0]} receiveShadow>
                <boxGeometry args={[wingLenX + 0.32, 0.56, wingD + 0.32]} />
                <meshStandardMaterial color="#8E949E" roughness={0.86} />
              </mesh>
              {/* Thân nhánh 9 tầng sơn trắng sáng */}
              <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[wingLenX, totalH, wingD]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
              </mesh>
              {/* Vách kính lớn thông tầng 1–2 (giảng đường & sảnh 2 nhánh Bắc & Giữa) */}
              <mesh position={[0.15, 3.1, 0]} castShadow>
                <boxGeometry args={[wingLenX - 0.5, 5.6, wingD + 0.08]} />
                <meshStandardMaterial color="#1E2D3B" roughness={0.25} metalness={0.35} />
              </mesh>
            </>
          ) : (
            <>
              {/* Nhánh Nam (wIdx === 2): Tầng 3–9 liền khối trắng; Tầng 1–2 khoét rỗng khoang Đại sảnh chính
                  rộng 9.0m (building x = -4.5..+4.5, tức wing local x = -1.275..+7.725) và sâu 4.75m
                  từ cửa kính mặt tiền Nam (southZ = +19.0) lùi vào bên trong sảnh (building z = +14.25),
                  để lớp cửa kính mặt tiền nhìn xuyên thấu hoàn toàn vào tường hậu trắng phía sau! */}
              <mesh position={[0, 5.85 + (totalH - 5.85) / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[wingLenX, totalH - 5.85, wingD]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
              </mesh>
              {/* Khối cánh Tây tầng 1–2 (building x = -14.0..-4.5 -> wing local x = -6.025, w = 9.5m) */}
              <mesh position={[-6.08, 0.28, 0]} receiveShadow>
                <boxGeometry args={[9.66, 0.56, wingD + 0.32]} />
                <meshStandardMaterial color="#8E949E" roughness={0.86} />
              </mesh>
              <mesh position={[-6.025, 2.95, 0]} castShadow receiveShadow>
                <boxGeometry args={[9.5, 5.9, wingD]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
              </mesh>
              {/* Khối cánh Đông tầng 1–2 nối vào lưng chữ E (building x = +4.5..+7.55 -> wing local x = +9.25, w = 3.05m) */}
              <mesh position={[9.25, 0.28, 0]} receiveShadow>
                <boxGeometry args={[3.15, 0.56, wingD + 0.32]} />
                <meshStandardMaterial color="#8E949E" roughness={0.86} />
              </mesh>
              <mesh position={[9.25, 2.95, 0]} castShadow receiveShadow>
                <boxGeometry args={[3.05, 5.9, wingD]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
              </mesh>
              {/* Phần thân Bắc phía sau bức tường hậu của đại sảnh (building z = +11.8..+14.25 -> wing local z = -2.375, d = 2.45m) */}
              <mesh position={[3.225, 0.28, -2.45]} receiveShadow>
                <boxGeometry args={[9.2, 0.56, 2.6]} />
                <meshStandardMaterial color="#8E949E" roughness={0.86} />
              </mesh>
              <mesh position={[3.225, 2.95, -2.375]} castShadow receiveShadow>
                <boxGeometry args={[9.1, 5.9, 2.45]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
              </mesh>
            </>
          )}
          {/* Khe hành lang / logia đứng âm tường ở chính giữa đầu hồi Tây mỗi nhánh */}
          <mesh position={[-wingLenX / 2 + 0.08, (totalH + 6.2) / 2, 0]}>
            <boxGeometry args={[0.28, totalH - 6.6, 1.35]} />
            <meshStandardMaterial color="#334155" roughness={0.75} />
          </mesh>
          {/* Gờ phân tầng ngang màu xám trắng và lưới cửa sổ khung tối tầng 3–9 */}
          {[2, 3, 4, 5, 6, 7, 8].map((fl) => (
            <group key={`c7-wing-fl-${wIdx}-${fl}`}>
              <mesh position={[0, fl * floorHeight, 0]}>
                <boxGeometry args={[wingLenX + 0.14, 0.14, wingD + 0.14]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
              </mesh>
              {/* Cửa sổ 2 bên khe logia ở đầu hồi Tây (-X) của mỗi nhánh */}
              {[-2.05, 2.05].map((dz, dIdx) => {
                const glow = isNight && (fl + wIdx + dIdx) % 2 === 0;
                return (
                  <mesh
                    key={`c7-front-win-${wIdx}-${fl}-${dIdx}`}
                    position={[-wingLenX / 2 - 0.03, fl * floorHeight + 1.55, dz]}
                    rotation-y={-Math.PI / 2}
                  >
                    <planeGeometry args={[1.55, 1.35]} />
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
              {/* Cửa sổ dọc mặt bên nhìn xuống sân cây xanh (nhánh Nam wIdx=2 không vẽ đè lên mặt tiền Nam chính) */}
              {[-7.5, -3.5, 0.5, 4.5, 8.2].map((dx, xIdx) => {
                const glow = isNight && (fl + wIdx + xIdx) % 3 === 0;
                return (
                  <group key={`c7-side-win-${wIdx}-${fl}-${xIdx}`}>
                    <mesh
                      position={[dx, fl * floorHeight + 1.55, -wingD / 2 - 0.03]}
                      rotation-y={Math.PI}
                    >
                      <planeGeometry args={[2.05, 1.32]} />
                      <meshStandardMaterial
                        color={glow ? '#FFE4A0' : '#233445'}
                        emissive={glow ? '#FFB84D' : '#000000'}
                        emissiveIntensity={glow ? 0.72 : 0}
                        roughness={0.28}
                      />
                    </mesh>
                    {wIdx < 2 && (
                      <mesh position={[dx, fl * floorHeight + 1.55, wingD / 2 + 0.03]}>
                        <planeGeometry args={[2.05, 1.32]} />
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
              })}
            </group>
          ))}
          {/* Mái phẳng + Ô mái ngói đỏ đặc trưng ở phía đầu Tây trên đỉnh mỗi nhánh chữ E */}
          <mesh position={[0, totalH + 0.22, 0]} castShadow>
            <boxGeometry args={[wingLenX + 0.3, 0.44, wingD + 0.3]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.85} />
          </mesh>
          <mesh position={[-4.5, totalH + 0.62, 0]} castShadow>
            <boxGeometry args={[6.2, 0.48, wingD - 0.9]} />
            <meshStandardMaterial color="#C84B31" roughness={0.72} />
          </mesh>
        </group>
      ))}

      {/* ============ 2B. MẶT TIỀN NAM ĐỒ SỘ (z = +size.z/2, NHÌN RA LÀN ĐI VÀO CỔNG TRẦN ĐẠI NGHĨA) ============
          Đối chiếu 1:1 ảnh thực tế:
          - `Một phần tòa C7 nhìn từ trục đường trái, từ tòa D3 hắt sang.jpg`
          - `trục đường bên phải từ cổng trần đại nghĩa, chiều đi vào.jpg` */}
      <group position={[0, 0, southZ]}>
        {/* 10 cột cửa sổ vuông tầng 3–9 có khung nhôm đen & rèm cuốn sáng màu nửa trên */}
        {[2, 3, 4, 5, 6, 7, 8].map((fl) =>
          [-12.2, -9.5, -6.8, -4.1, -1.4, 1.3, 4.0, 6.7, 9.4, 12.1].map((wx, idx) => {
            const lit = (fl + idx) % 3 === 0;
            return (
              <group key={`c7-south-win-${fl}-${idx}`} position={[wx, fl * floorHeight + 1.55, 0.03]}>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[1.68, 1.52, 0.04]} />
                  <meshStandardMaterial color="#1F2937" roughness={0.45} metalness={0.35} />
                </mesh>
                <mesh position={[0, 0.32, 0.026]}>
                  <planeGeometry args={[1.5, 0.72]} />
                  <meshStandardMaterial color="#CBD5E1" roughness={0.75} />
                </mesh>
                <mesh position={[0, -0.36, 0.026]}>
                  <planeGeometry args={[1.5, 0.64]} />
                  <meshStandardMaterial
                    color={isNight && lit ? '#FFE7A3' : lit ? '#FFFBEB' : '#334155'}
                    emissive={isNight && lit ? '#FFB84D' : lit ? '#FDE68A' : '#000000'}
                    emissiveIntensity={isNight && lit ? 0.8 : lit ? 0.22 : 0}
                    roughness={0.28}
                  />
                </mesh>
              </group>
            );
          }),
        )}

        {/* Các khoang giảng đường kính cao 2 tầng hai bên sảnh Nam (sáng đèn vàng ấm + bàn học vàng nhìn xuyên kính) */}
        {[-11.8, -9.2, -6.6, 6.6, 9.2, 11.8].map((bx, bIdx) => (
          <group key={`c7-south-lect-bay-${bIdx}`} position={[bx, 0, 0]}>
            {/* Lòng phòng học sáng ấm bên trong vách kính */}
            <mesh position={[0, 3.05, -0.18]}>
              <boxGeometry args={[2.05, 5.1, 0.42]} />
              <meshStandardMaterial
                color="#FEF3C7"
                emissive="#FDE68A"
                emissiveIntensity={isNight ? 0.85 : 0.42}
                roughness={0.75}
              />
            </mesh>
            {/* Dãy bàn học giảng đường màu vàng gỗ nhìn rõ qua vách kính tầng 1 (khớp ảnh thật!) */}
            {[-0.55, 0.55].map((deskX, dIdx) => (
              <mesh key={`desk-${dIdx}`} position={[deskX, 0.92, -0.05]}>
                <boxGeometry args={[0.76, 0.42, 0.24]} />
                <meshStandardMaterial color="#EAB308" roughness={0.6} />
              </mesh>
            ))}
            {/* Khung nhôm kính đen phân tầng 1–2 */}
            <mesh position={[0, 3.05, 0.02]}>
              <boxGeometry args={[2.14, 5.18, 0.05]} />
              <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.5} />
            </mesh>
            <mesh position={[0, 1.72, 0.05]}>
              <planeGeometry args={[1.92, 2.25]} />
              <meshStandardMaterial
                color="#FFFBEB"
                transparent
                opacity={0.45}
                roughness={0.18}
                metalness={0.35}
              />
            </mesh>
            <mesh position={[0, 4.38, 0.05]}>
              <planeGeometry args={[1.92, 2.2]} />
              <meshStandardMaterial
                color="#FEF3C7"
                emissive="#FDE68A"
                emissiveIntensity={isNight ? 0.7 : 0.35}
                roughness={0.22}
              />
            </mesh>
          </group>
        ))}

        {/* Đại sảnh kính trung tâm mặt Nam tầng 1–2:
            - Mặt tiền bên ngoài (z = 0): hệ vách kính & cửa kính trượt trong suốt khung nhôm đen (KHÔNG dán chữ lên kính/mặt tiền).
            - Lòng sảnh sâu 4.65m (z = 0 .. -4.65): sàn đá bóng, trần đèn LED âm trần sáng rõ, cột sảnh trắng.
            - Tường hậu màu trắng đặt lùi sâu 4.6m phía trong sảnh (z = -4.60): gắn quốc huy/logo đỏ và dòng chữ nổi 3D đỏ
              "ĐẠI HỌC BÁCH KHOA HÀ NỘI" + "HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY" nhìn xuyên qua cửa kính trượt! */}
        <group position={[0, 0, 0]}>
          {/* 1. Sàn đại sảnh lát đá granite trắng xám bóng (cao y = 0.36m khớp đỉnh bậc tam cấp) */}
          <mesh position={[0, 0.18, -2.38]} receiveShadow>
            <boxGeometry args={[9.08, 0.36, 4.8]} />
            <meshStandardMaterial color="#ECEFF3" roughness={0.32} metalness={0.08} />
          </mesh>
          {/* Đường viền đá sẫm dẫn hướng chiều sâu lòng sảnh 4.6m */}
          {[-2.8, 2.8].map((fx, fIdx) => (
            <mesh key={`c7-lobby-floor-strip-${fIdx}`} position={[fx, 0.366, -2.3]} receiveShadow>
              <boxGeometry args={[0.16, 0.008, 4.2]} />
              <meshStandardMaterial color="#94A3B8" roughness={0.4} />
            </mesh>
          ))}

          {/* 2. Hai vách bên lòng sảnh (x = ±4.48) + 2 cột trụ tròn trắng bên trong đại sảnh */}
          {[-4.48, 4.48].map((sx, sIdx) => (
            <mesh key={`c7-lobby-sidewall-${sIdx}`} position={[sx, 3.08, -2.36]} receiveShadow>
              <boxGeometry args={[0.1, 5.48, 4.76]} />
              <meshStandardMaterial
                color="#F8FAFC"
                emissive="#F1F5F9"
                emissiveIntensity={isNight ? 0.35 : 0.22}
                roughness={0.68}
              />
            </mesh>
          ))}
          {[-3.15, 3.15].map((cx, cIdx) => (
            <mesh key={`c7-lobby-inner-col-${cIdx}`} position={[cx, 1.88, -2.15]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 3.05, 14]} />
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#F8FAFC"
                emissiveIntensity={isNight ? 0.3 : 0.18}
                roughness={0.55}
              />
            </mesh>
          ))}

          {/* Quầy trực & dãy ghế chờ sinh viên đặt sát vách bên trong sảnh (tăng cảm giác chiều sâu 4.6m) */}
          <mesh position={[-3.65, 0.78, -3.2]} castShadow>
            <boxGeometry args={[1.1, 0.84, 1.5]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.55} />
          </mesh>
          <mesh position={[3.82, 0.62, -2.6]} castShadow>
            <boxGeometry args={[0.55, 0.48, 2.1]} />
            <meshStandardMaterial color="#1D4ED8" roughness={0.55} />
          </mesh>

          {/* 3. Trần sảnh tầng 1 (y = 3.36m) & trần sảnh tầng 2 (y = 5.76m) gắn hệ đèn LED panel trắng sáng */}
          <mesh position={[0, 3.36, -2.38]}>
            <boxGeometry args={[8.96, 0.14, 4.72]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive="#F8FAFC"
              emissiveIntensity={isNight ? 0.48 : 0.32}
              roughness={0.65}
            />
          </mesh>
          {[-1.15, -2.45, -3.75].map((lz, zIdx) =>
            [-2.4, 0, 2.4].map((lx, xIdx) => (
              <mesh key={`c7-lobby-led-${zIdx}-${xIdx}`} position={[lx, 3.28, lz]}>
                <boxGeometry args={[1.05, 0.025, 0.48]} />
                <meshStandardMaterial
                  color="#FFFFFF"
                  emissive={isNight ? '#FEF3C7' : '#FFFFFF'}
                  emissiveIntensity={isNight ? 1.55 : 1.05}
                />
              </mesh>
            )),
          )}
          {/* Trần và tường hậu hành lang thông tầng 2 nhìn qua dải kính trên mái đón */}
          <mesh position={[0, 5.76, -2.38]}>
            <boxGeometry args={[8.96, 0.14, 4.72]} />
            <meshStandardMaterial
              color="#F8FAFC"
              emissive="#FEF3C7"
              emissiveIntensity={isNight ? 0.55 : 0.28}
              roughness={0.7}
            />
          </mesh>
          <mesh position={[0, 4.58, -4.64]}>
            <boxGeometry args={[8.96, 2.34, 0.12]} />
            <meshStandardMaterial
              color="#F8FAFC"
              emissive="#FFFBEB"
              emissiveIntensity={isNight ? 0.58 : 0.32}
              roughness={0.65}
            />
          </mesh>

          {/* 4. BỨC TƯỜNG HẬU MÀU TRẮNG ĐẶT LÙI SÂU 4.60M BÊN TRONG ĐẠI SẢNH (z = -4.60)
              Hai bên trái/phải tường hậu là 2 lối hành lang dẫn sâu vào thang máy & giảng đường */}
          <mesh position={[0, 1.88, -4.74]}>
            <boxGeometry args={[9.02, 3.08, 0.1]} />
            <meshStandardMaterial color="#1E293B" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.88, -4.6]}>
            <boxGeometry args={[6.95, 3.02, 0.12]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive="#FFFFFF"
              emissiveIntensity={isNight ? 0.68 : 0.45}
              roughness={0.5}
            />
          </mesh>
          {/* Đèn hắt trần rọi sáng trực tiếp vào bức tường hậu trắng (y = 3.26, z = -4.25) */}
          <mesh position={[0, 3.27, -4.22]}>
            <boxGeometry args={[5.8, 0.03, 0.18]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive="#FFFFFF"
              emissiveIntensity={isNight ? 1.8 : 1.25}
            />
          </mesh>

          {/* Huy hiệu đỏ sao vàng/bánh răng ĐHBK gắn trên cao bức tường hậu trắng (z = -4.50) */}
          <group position={[0, 2.74, -4.5]}>
            <mesh castShadow>
              <boxGeometry args={[0.38, 0.5, 0.05]} />
              <meshStandardMaterial
                color="#C8102E"
                emissive="#991B1B"
                emissiveIntensity={isNight ? 0.35 : 0.15}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0, 0.04, 0.032]}>
              <cylinderGeometry args={[0.11, 0.11, 0.02, 16]} />
              <meshStandardMaterial color="#FACC15" metalness={0.65} roughness={0.28} />
            </mesh>
          </group>

          {/* Dòng chữ đỏ 3D "ĐẠI HỌC BÁCH KHOA HÀ NỘI" & dòng chữ tiếng Anh bên dưới gắn trên tường hậu (z = -4.50) */}
          <ExtrudedText3D
            text="ĐẠI HỌC BÁCH KHOA HÀ NỘI"
            size={[5.45, 0.44]}
            depth={0.07}
            position={[0, 2.16, -4.5]}
            frontColor="#C8102E"
            sideColor="#7F1D1D"
            metalness={0.28}
            roughness={0.36}
            emissive="#B91C1C"
            emissiveIntensity={isNight ? 0.42 : 0.2}
          />
          <ExtrudedText3D
            text="HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY"
            size={[4.95, 0.25]}
            depth={0.045}
            position={[0, 1.72, -4.51]}
            frontColor="#B91C1C"
            sideColor="#7F1D1D"
            metalness={0.24}
            roughness={0.4}
            emissive="#991B1B"
            emissiveIntensity={isNight ? 0.35 : 0.16}
          />

          {/* 5. HỆ VÁCH KÍNH & CỬA KÍNH TRƯỢT TRONG SUỐT KHUNG NHÔM ĐEN Ở MẶT TIỀN NGOÀI (z = 0)
              Hoàn toàn trong suốt nhìn xuyên thấu vào lòng sảnh 4.6m, KHÔNG có tường trắng đặc hay chữ dán ở mặt tiền! */}
          {/* Đố đứng nhôm đen chính chia 4 khoang (chừa khoang cửa kính trượt trung tâm x = -1.32..+1.32 thông thoáng) */}
          {[-4.45, -2.75, -1.32, 1.32, 2.75, 4.45].map((mx, mIdx) => (
            <mesh key={`c7-south-mull-${mIdx}`} position={[mx, 3.08, 0.04]}>
              <boxGeometry args={[0.09, 5.44, 0.09]} />
              <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.58} />
            </mesh>
          ))}
          {/* Đố đứng phụ tầng 2 phía trên mái đón */}
          <mesh position={[0, 4.54, 0.04]}>
            <boxGeometry args={[0.08, 2.38, 0.08]} />
            <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.58} />
          </mesh>
          {/* Thanh đố ngang nhôm đen (trán cửa trượt y = 2.58, dầm mái đón y = 3.26, đỉnh vách kính y = 5.76) */}
          {[2.58, 3.26, 5.76].map((my, mIdx) => (
            <mesh key={`c7-south-transom-${mIdx}`} position={[0, my, 0.04]}>
              <boxGeometry args={[8.98, 0.1, 0.095]} />
              <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.58} />
            </mesh>
          ))}
          {/* Chân đế nhôm đen cho 2 khoang kính cố định hai bên (chừa lối đi phẳng ở giữa x = -1.32..+1.32) */}
          {[-2.88, 2.88].map((sx, sIdx) => (
            <mesh key={`c7-south-sill-${sIdx}`} position={[sx, 0.41, 0.04]}>
              <boxGeometry args={[3.12, 0.09, 0.09]} />
              <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.58} />
            </mesh>
          ))}
          {/* Hai cánh cửa kính trượt tự động ở trung tâm (mở hé nhẹ ở giữa + tay nắm inox mảnh) */}
          {[-0.78, 0.78].map((dx, dIdx) => (
            <group key={`c7-sliding-door-${dIdx}`} position={[dx, 1.48, 0.02]}>
              <mesh position={[0, 1.05, 0]}>
                <boxGeometry args={[1.06, 0.06, 0.05]} />
                <meshStandardMaterial color="#0F172A" roughness={0.35} metalness={0.6} />
              </mesh>
              <mesh position={[0, -1.06, 0]}>
                <boxGeometry args={[1.06, 0.06, 0.05]} />
                <meshStandardMaterial color="#0F172A" roughness={0.35} metalness={0.6} />
              </mesh>
              {/* Nẹp đứng mảnh mép trong cánh cửa trượt + tay nắm inox */}
              <mesh position={[dIdx === 0 ? 0.51 : -0.51, 0, 0]}>
                <boxGeometry args={[0.04, 2.12, 0.05]} />
                <meshStandardMaterial color="#1E293B" roughness={0.35} metalness={0.6} />
              </mesh>
              <mesh position={[dIdx === 0 ? 0.42 : -0.42, -0.15, 0.045]}>
                <cylinderGeometry args={[0.014, 0.014, 0.48, 8]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.22} metalness={0.85} />
              </mesh>
            </group>
          ))}

          {/* Các tấm kính cường lực trong suốt (depthWrite=false để nhìn xuyên thấu 100% vào tường hậu trắng phía sau!) */}
          <mesh position={[0, 1.82, 0.03]}>
            <planeGeometry args={[8.84, 2.82]} />
            <meshStandardMaterial
              color="#D8EEF8"
              transparent
              opacity={0.18}
              depthWrite={false}
              roughness={0.06}
              metalness={0.22}
            />
          </mesh>
          {/* Kính thông tầng 2 phía trên mái đón (cũng trong suốt nhìn rõ trần sảnh tầng 2) */}
          <mesh position={[0, 4.52, 0.03]}>
            <planeGeometry args={[8.84, 2.38]} />
            <meshStandardMaterial
              color="#D8EEF8"
              transparent
              opacity={0.22}
              depthWrite={false}
              roughness={0.08}
              metalness={0.25}
            />
          </mesh>
          {/* Dải chỉ mờ an toàn mảnh trên các ô kính cố định hai bên (không che khoang cửa giữa) */}
          {[-3.6, -2.03, 2.03, 3.6].map((gx, gIdx) => (
            <mesh key={`c7-glass-frost-strip-${gIdx}`} position={[gx, 1.32, 0.038]}>
              <planeGeometry args={[1.32, 0.11]} />
              <meshStandardMaterial
                color="#F1F5F9"
                transparent
                opacity={0.26}
                depthWrite={false}
                roughness={0.4}
              />
            </mesh>
          ))}

          {/* Mái đón kính cường lực khung dầm thép đen đua ra sảnh Nam (y = 3.28m) */}
          <mesh position={[0, 3.28, 0.84]} castShadow>
            <boxGeometry args={[9.3, 0.14, 1.72]} />
            <meshStandardMaterial color="#111827" roughness={0.32} metalness={0.65} />
          </mesh>
          {[-4.2, -2.5, -0.8, 0.8, 2.5, 4.2].map((bx, bIdx) => (
            <mesh key={`canopy-rib-${bIdx}`} position={[bx, 3.19, 0.84]}>
              <boxGeometry args={[0.09, 0.1, 1.68]} />
              <meshStandardMaterial color="#0F172A" roughness={0.35} metalness={0.6} />
            </mesh>
          ))}

          {/* Bậc tam cấp đá granite xám dẫn vào đại sảnh Nam */}
          {[0, 1, 2].map((st) => (
            <mesh
              key={`c7-south-step-${st}`}
              position={[0, 0.08 + st * 0.12, 0.72 - st * 0.26]}
              receiveShadow
            >
              <boxGeometry args={[8.95, 0.12, 0.34]} />
              <meshStandardMaterial color="#7C8591" roughness={0.85} />
            </mesh>
          ))}

          {/* Chữ nổi 3D kim loại vàng đồng "C7" có chiều dày khối thật (0.22m) trên trán tường đại sảnh Nam */}
          <ExtrudedText3D
            text="C7"
            size={[2.35, 1.42]}
            depth={0.22}
            position={[0, 6.46, 0.13]}
            frontColor="#D4AF37"
            frontHighlightColor="#FCE79C"
            sideColor="#785314"
            metalness={0.74}
            roughness={0.26}
            emissive="#B4831E"
            emissiveIntensity={isNight ? 0.28 : 0.06}
          />
        </group>

        {/* Trụ quẹt thẻ màu cam + ghế nhựa xanh + bảng thông báo khung trắng trên vỉa hè Nam C7
            (khớp ảnh `trục đường bên phải từ cổng trần đại nghĩa, chiều đi vào.jpg`) */}
        <group position={[5.1, 0.07, 1.18]}>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.34, 0.96, 0.32]} />
            <meshStandardMaterial color="#EA580C" roughness={0.45} />
          </mesh>
          <mesh position={[0.36, 0.18, 0.06]} castShadow>
            <boxGeometry args={[0.28, 0.36, 0.28]} />
            <meshStandardMaterial color="#0284C7" roughness={0.55} />
          </mesh>
        </group>
        <group position={[7.2, 0.07, 1.2]} rotation-y={-0.25}>
          <mesh position={[-0.45, 0.72, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.44, 8]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.45} metalness={0.5} />
          </mesh>
          <mesh position={[0.45, 0.72, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.44, 8]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.45} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.95, 0]} castShadow>
            <boxGeometry args={[0.96, 1.08, 0.05]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {/* Cửa sổ mặt Đông (nhìn ra Trần Đại Nghĩa) và mặt Tây sân trong của khối lưng 9 tầng */}
      {[2, 3, 4, 5, 6, 7, 8].map((fl) =>
        [-15.8, -12.0, -8.2, -4.2, 0, 4.2, 8.2, 12.0, 15.8].map((sz, sIdx) => {
          const glow = isNight && (fl + sIdx) % 2 === 1;
          return (
            <group key={`c7-spine-win-${fl}-${sIdx}`}>
              <mesh
                position={[size.x / 2 + 0.03, fl * floorHeight + 1.55, sz]}
                rotation-y={Math.PI / 2}
              >
                <planeGeometry args={[2.1, 1.32]} />
                <meshStandardMaterial
                  color={glow ? '#FFE4A0' : '#233445'}
                  emissive={glow ? '#FFB84D' : '#000000'}
                  emissiveIntensity={glow ? 0.72 : 0}
                  roughness={0.28}
                />
              </mesh>
              {(Math.abs(sz - -7.7) < 3.6 || Math.abs(sz - 7.7) < 3.6) && (
                <mesh
                  position={[spineX - spineW / 2 - 0.03, fl * floorHeight + 1.55, sz]}
                  rotation-y={-Math.PI / 2}
                >
                  <planeGeometry args={[2.0, 1.32]} />
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

      {/* ============ 3. HAI SÂN TRONG TRỒNG CÂY XANH MỞ VỀ PHÍA TÂY (-X) ============ */}
      {courtZs.map((cz, cIdx) => (
        <group key={`c7-courtyard-${cIdx}`} position={[-3.3, 0, cz]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.032, 0]} receiveShadow>
            <planeGeometry args={[20.8, 7.8]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.9} />
          </mesh>
          {/* Bồn đá vàng kem nhạt đầu sân Tây nhìn ra đường x = 56.2 (Từ cuối 2 nhánh bên nhìn sang bên phải...jpg) */}
          {[-6.8, 1.8].map((px, pIdx) => (
            <group key={`c7-planter-${cIdx}-${pIdx}`} position={[px, 0, 0]}>
              <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
                <boxGeometry args={[3.8, 0.56, 3.0]} />
                <meshStandardMaterial color="#C8B294" roughness={0.86} />
              </mesh>
              <mesh position={[0, 0.57, 0]} receiveShadow>
                <boxGeometry args={[3.45, 0.04, 2.65]} />
                <meshStandardMaterial color="#4D7C43" roughness={0.95} />
              </mesh>
              <group position={[0, 0.55, 0]}>
                <ImprovedTree x={0} z={0} trunkH={2.0} canopyR={1.55} canopyY={2.75} withTreePit={false} />
              </group>
            </group>
          ))}
        </group>
      ))}

      {/* Dải cây bụi ven đường + Biển tròn "BÃI ĐỖ XE CHỮA CHÁY" + Vạch giảm tốc trắng trên trục rẽ phải x = 56.2
          (khớp 1:1 ảnh `Từ cuối 2 nhánh bên nhìn sang bên phải, chỗ tòa C7.jpg`) */}
      <group position={[-size.x / 2 - 1.15, 0, southZ - 3.6]}>
        {/* Bồn cây xanh góc Tây-Nam C7 */}
        <mesh position={[0, 0.09, -2.2]} receiveShadow>
          <boxGeometry args={[1.25, 0.1, 8.2]} />
          <meshStandardMaterial color="#3F6E38" roughness={0.94} />
        </mesh>
        {/* Trụ đèn đường thép mạ kẽm cao vút */}
        <mesh position={[-0.1, 2.8, 1.6]} castShadow>
          <cylinderGeometry args={[0.06, 0.085, 5.6, 10]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.42} metalness={0.65} />
        </mesh>
        {/* Biển tròn nền trắng viền đỏ "BÃI ĐỖ XE / CHỮA CHÁY" gắn cột sọc đỏ-trắng */}
        <group position={[-0.12, 0, -0.4]}>
          {[0.25, 0.7, 1.15, 1.6].map((py, pIdx) => (
            <mesh key={`fire-sign-pole-${pIdx}`} position={[0, py, 0]} castShadow>
              <cylinderGeometry args={[0.026, 0.028, 0.45, 8]} />
              <meshStandardMaterial color={pIdx % 2 === 0 ? '#DC2626' : '#F8FAFC'} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, 1.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 0.038, 24]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.5} metalness={0.35} />
          </mesh>
          <LabelPlane
            textureKey="c7-fire-parking-sign"
            canvasW={256}
            canvasH={256}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              ctx.beginPath();
              ctx.arc(w / 2, h / 2, 118, 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
              ctx.lineWidth = 18;
              ctx.strokeStyle = '#DC2626';
              ctx.stroke();
              ctx.fillStyle = '#DC2626';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '800 30px "Be Vietnam Pro", Arial, sans-serif';
              ctx.fillText('BÃI ĐỖ XE', w / 2, h * 0.42);
              ctx.fillText('CHỮA CHÁY', w / 2, h * 0.62);
            }}
            size={[0.6, 0.6]}
            position={[0, 1.98, 0.028]}
            transparent
          />
        </group>
      </group>
      {/* Cụm vạch trắng giảm tốc/qua đường ngang trục x = 56.2 (tương ứng dx = -17.3, dz = +19.8) */}
      {[-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((dz, idx) => (
        <mesh
          key={`c7-west-crosswalk-${idx}`}
          rotation-x={-Math.PI / 2}
          position={[-17.3, 0.026, southZ + 0.5 + dz]}
        >
          <planeGeometry args={[4.8, 0.11]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.85} />
        </mesh>
      ))}

      {/* ============ 4. SẢNH HỌC HSK HƯỚNG TÂY (-X) Ở NHÁNH GIỮA (z = 0, khớp C7_DOOR = 57.8, -32.8) ============ */}
      <mesh position={[-size.x / 2 - 0.95, 3.65, 0]} castShadow>
        <boxGeometry args={[1.9, 0.34, 5.8]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
      </mesh>
      <mesh position={[-size.x / 2 - 0.95, 3.46, 0]}>
        <boxGeometry args={[1.82, 0.04, 5.65]} />
        <meshStandardMaterial color="#2E3438" roughness={0.9} />
      </mesh>
      {[-2.2, 2.2].map((colZ) => (
        <mesh
          key={`c7-porch-col-${colZ}`}
          position={[-size.x / 2 - 1.6, 1.82, colZ]}
          castShadow
        >
          <cylinderGeometry args={[0.2, 0.2, 3.64, 14]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[-size.x / 2 - 0.95, 0.04, 0]} receiveShadow>
        <boxGeometry args={[1.9, 0.08, 5.2]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.85} />
      </mesh>
      <mesh position={[-size.x / 2 - 0.06, 1.38, 0]}>
        <boxGeometry args={[0.06, 2.68, 3.1]} />
        <meshStandardMaterial color="#0F172A" roughness={0.4} metalness={0.5} />
      </mesh>
      {[-0.72, 0.72].map((dz, idx) => (
        <group key={`c7-hsk-door-${idx}`}>
          <mesh position={[-size.x / 2 - 0.095, 1.36, dz]}>
            <boxGeometry args={[0.025, 2.48, 1.34]} />
            <meshStandardMaterial
              color={isNight ? '#FFEAB3' : '#38BDF8'}
              emissive={isNight ? '#FFB84D' : '#0284C7'}
              emissiveIntensity={isNight ? 1.1 : 0.25}
              roughness={0.22}
              metalness={0.35}
            />
          </mesh>
          <mesh position={[-size.x / 2 - 0.13, 1.25, idx === 0 ? -0.14 : 0.14]}>
            <cylinderGeometry args={[0.018, 0.018, 0.52, 8]} />
            <meshStandardMaterial color="#F8FAFC" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <FramedSignBox3D
        canvasW={640}
        canvasH={140}
        draw={(ctx, w, h) => {
          ctx.fillStyle = hskMode ? '#991B1B' : '#1E3A8A';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#FDE047';
          ctx.font = '700 30px "Be Vietnam Pro", "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            hskMode
              ? '🎓 TRUNG TÂM HỌC HÁN NGỮ HSK THEO BÀI'
              : '🏛️ GIẢNG ĐƯỜNG TRUNG TÂM TÒA C7',
            w / 2,
            h * 0.38,
          );
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '600 22px "Be Vietnam Pro", "Segoe UI", sans-serif';
          ctx.fillText(
            hskMode
              ? 'Bấm [E] trước sảnh để vào lớp & chọn bài học'
              : 'Bấm [E] trước sảnh để bật Chế độ HSK & vào giảng đường',
            w / 2,
            h * 0.75,
          );
        }}
        size={[3.9, 0.82]}
        depth={0.1}
        boxColor={hskMode ? '#7F1D1D' : '#1E3A8A'}
        frameColor="#FACC15"
        position={[-size.x / 2 - 0.14, 3.12, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        isNight={isNight}
      />

      {/* Chữ nổi 3D kim loại xám bạc "C7" (dày 0.22m) gắn trên cao đầu hồi Tây nhánh Nam & mặt Đông khối lưng */}
      <ExtrudedText3D
        text="C7"
        size={[2.35, 1.42]}
        depth={0.22}
        position={[-size.x / 2 - 0.11, totalH - 1.9, wingZs[2] + 1.1]}
        rotation={[0, -Math.PI / 2, 0]}
        frontColor="#94A3B8"
        frontHighlightColor="#E2E8F0"
        sideColor="#334155"
        metalness={0.68}
        roughness={0.3}
      />
      <ExtrudedText3D
        text="C7"
        size={[2.35, 1.42]}
        depth={0.22}
        position={[size.x / 2 + 0.11, totalH - 1.9, 14.2]}
        rotation={[0, Math.PI / 2, 0]}
        frontColor="#94A3B8"
        frontHighlightColor="#E2E8F0"
        sideColor="#334155"
        metalness={0.68}
        roughness={0.3}
      />

      <FramedSignBox3D
        canvasW={768}
        canvasH={160}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#1E3A5F';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '700 31px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('TÒA NHÀ C7 · ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.39);
          ctx.fillStyle = '#93C5FD';
          ctx.font = '700 22px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('TỔ HỢP GIẢNG ĐƯỜNG & ĐIỀU HÀNH TRUNG TÂM', w / 2, h * 0.74);
        }}
        size={[4.9, 1.02]}
        depth={0.12}
        boxColor="#0F172A"
        frameColor="#CBD5E1"
        position={[-size.x / 2 - 0.12, 4.48, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        isNight={isNight}
      />
    </group>
  );
}

/**
 * Tòa nhà TRƯỜNG VẬT LIỆU (SMSE — School of Materials Science and Engineering)
 * Nằm đối diện phía Tây Tòa C7 qua trục đường rẽ phải từ cuối 2 nhánh Cổng Trần Đại Nghĩa.
 * Dựng chuẩn 1:1 theo ảnh thực tế:
 *   - `tham-khao/NEW/trường vật liệu.jpg`
 *   - `tham-khao/NEW/Từ cuối 2 nhánh bên nhìn sang bên phải, chỗ tòa C7.jpg`
 */
export function SchoolOfMaterialsBuilding({ isNight }: { isNight: boolean }) {
  const { center, size, floors, floorHeight } = SCHOOL_OF_MATERIALS;
  const mainH = floors * floorHeight; // 4 × 3.4m = 13.6m
  const lowH = 2 * floorHeight + 0.55; // Khoang hạ bậc 2 tầng ở đầu Nam (bên trái khi nhìn từ mặt Đông)
  const eastX = size.x / 2; // +5.6m (world x = 51.0m, hướng mặt chính ra đường x = 56.2)
  // Khối chính 4 tầng dài 13.8m (z: -8.5..+5.3), khoang hạ bậc 2 tầng dài 3.2m (z: +5.3..+8.5)
  const mainLenZ = 13.8;
  const mainCenterZ = -1.6;
  const lowLenZ = 3.25;
  const lowCenterZ = 6.88;
  const mainBayZs = [-7.1, -4.9, -2.7, -0.5, 1.7, 3.9];
  const pilasterZs = [-8.25, -6.0, -3.8, -1.6, 0.6, 2.8, 5.05];

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Vỉa hè lát gạch xám sáng + bồn cây bó vỉa chạy dọc mặt tiền Đông sát đường x = 56.2 */}
      <mesh position={[eastX + 1.25, 0.036, 0]} receiveShadow>
        <boxGeometry args={[2.5, 0.072, size.z + 2.2]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.86} />
      </mesh>
      {[-5.6, 5.8].map((pz, pIdx) => (
        <group key={`smse-planter-${pIdx}`} position={[eastX + 1.15, 0.075, pz]}>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[1.45, 0.1, 4.2]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.11, 0]} receiveShadow>
            <boxGeometry args={[1.25, 0.03, 3.95]} />
            <meshStandardMaterial color="#3F6E38" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Chân đế granite đen xám toàn khối */}
      <mesh position={[0, 0.24, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.24, 0.48, size.z + 0.24]} />
        <meshStandardMaterial color="#475569" roughness={0.85} />
      </mesh>

      {/* 1. KHỐI CHÍNH 4 TẦNG MÀU TRẮNG KIẾN TRÚC & KHOANG NAM HẠ BẬC 2 TẦNG */}
      <mesh position={[0, mainH / 2, mainCenterZ]} castShadow receiveShadow>
        <boxGeometry args={[size.x, mainH, mainLenZ]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
      </mesh>
      {/* Mái bằng đua nhẹ màu trắng sáng trên đỉnh khối 4 tầng */}
      <mesh position={[0, mainH + 0.18, mainCenterZ]} castShadow>
        <boxGeometry args={[size.x + 0.48, 0.36, mainLenZ + 0.48]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
      </mesh>

      {/* Khoang Nam hạ bậc 2 tầng (bên trái ảnh `trường vật liệu.jpg`) */}
      <mesh position={[0, lowH / 2, lowCenterZ]} castShadow receiveShadow>
        <boxGeometry args={[size.x, lowH, lowLenZ]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
      </mesh>
      <mesh position={[0, lowH + 0.16, lowCenterZ]} castShadow>
        <boxGeometry args={[size.x + 0.42, 0.32, lowLenZ + 0.42]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
      </mesh>

      {/* 7 Trụ bổ tường đứng (vertical white pilasters) chạy suốt chiều cao mặt Đông khối 4 tầng + dải phân tầng */}
      {pilasterZs.map((pz, idx) => (
        <mesh key={`smse-pilaster-${idx}`} position={[eastX + 0.08, mainH / 2, pz]} castShadow>
          <boxGeometry args={[0.18, mainH - 0.1, 0.34]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.76} />
        </mesh>
      ))}
      <mesh position={[eastX + 0.1, 2 * floorHeight + 0.18, mainCenterZ]} castShadow>
        <boxGeometry args={[0.22, 0.48, mainLenZ + 0.08]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.78} />
      </mesh>

      {/* Hệ cửa sổ nhôm kính xanh xám + mảng spandrel xám giữa các tầng (tầng 2 ánh cam ấm đặc trưng như ảnh thật!) */}
      {mainBayZs.map((bz, bIdx) => {
        const isEntranceBay = bIdx === 2 || bIdx === 3;
        return (
          <group key={`smse-east-bay-${bIdx}`} position={[eastX, 0, bz]}>
            {/* Mảng tường âm spandrel xám xanh giữa tầng 3 và tầng 4 */}
            <mesh position={[0.02, 3 * floorHeight - 0.05, 0]}>
              <boxGeometry args={[0.04, 1.05, 1.72]} />
              <meshStandardMaterial color="#7B8690" roughness={0.72} />
            </mesh>
            {[0, 1, 2, 3].map((fl) => {
              if (fl === 0 && isEntranceBay) return null;
              const wy = fl * floorHeight + 1.78;
              const warmAmber = fl === 1 && (bIdx === 0 || bIdx === 4);
              const lit = isNight && (fl + bIdx) % 2 === 0;
              return (
                <group key={`smse-win-${bIdx}-${fl}`} position={[0.03, wy, 0]}>
                  <mesh>
                    <boxGeometry args={[0.05, 1.85, 1.72]} />
                    <meshStandardMaterial color="#52606D" roughness={0.45} metalness={0.35} />
                  </mesh>
                  <mesh position={[0.03, 0, 0]} rotation-y={Math.PI / 2}>
                    <planeGeometry args={[1.56, 1.66]} />
                    <meshStandardMaterial
                      color={warmAmber ? '#D97706' : lit ? '#FFE4A0' : '#5F7778'}
                      emissive={warmAmber ? '#B45309' : lit ? '#FFB84D' : '#000000'}
                      emissiveIntensity={warmAmber ? 0.55 : lit ? 0.7 : 0}
                      roughness={0.25}
                      metalness={0.3}
                    />
                  </mesh>
                  {/* Đố chia 3 ô cửa sổ nhôm */}
                  {[-0.52, 0.52].map((dz, mIdx) => (
                    <mesh key={`mull-${mIdx}`} position={[0.04, 0, dz]}>
                      <boxGeometry args={[0.03, 1.68, 0.04]} />
                      <meshStandardMaterial color="#475569" roughness={0.5} />
                    </mesh>
                  ))}
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Cửa sổ 2 tầng ở khoang hạ bậc phía Nam + cửa sổ mặt Nam/Tây */}
      {[0, 1].map((fl) => (
        <group key={`smse-low-win-${fl}`} position={[eastX + 0.03, fl * floorHeight + 1.78, lowCenterZ]}>
          <mesh>
            <boxGeometry args={[0.05, 1.9, 2.05]} />
            <meshStandardMaterial color="#52606D" roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[0.03, 0, 0]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[1.88, 1.72]} />
            <meshStandardMaterial
              color={fl === 1 ? '#D97706' : '#5F7778'}
              emissive={fl === 1 ? '#B45309' : '#000000'}
              emissiveIntensity={fl === 1 ? 0.5 : 0}
              roughness={0.25}
              metalness={0.3}
            />
          </mesh>
        </group>
      ))}

      {/* 2. SẢNH CHÍNH HƯỚNG ĐÔNG (+X): BẬC ĐÁ ĐEN + MÁI ĐÓN ĐEN + CHỮ NỔI VÀNG "TRƯỜNG VẬT LIỆU" + 2 STANDEE SMSE */}
      <group position={[eastX, 0, -1.6]}>
        {/* Hốc sảnh sáng rực ánh đèn trắng với vách logo SMSE bên trong (khớp `trường vật liệu.jpg`) */}
        <mesh position={[-0.28, 1.75, 0]}>
          <boxGeometry args={[0.56, 3.1, 3.8]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#FFFBEB"
            emissiveIntensity={isNight ? 0.95 : 0.55}
            roughness={0.6}
          />
        </mesh>
        <LabelPlane
          textureKey="smse-lobby-inner-wall"
          canvasW={384}
          canvasH={384}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#991B1B';
            ctx.textAlign = 'center';
            ctx.font = '800 22px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, 72);
            ctx.fillStyle = '#1E3A8A';
            ctx.font = '800 28px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('TRƯỜNG VẬT LIỆU', w / 2, 114);
            ctx.fillStyle = '#CBD5E1';
            ctx.font = '900 72px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('SMSE', w / 2, 212);
          }}
          size={[1.85, 2.15]}
          position={[0.02, 1.58, 0]}
          rotation={[0, Math.PI / 2, 0]}
          transparent={false}
        />
        {/* Khung cửa kính đôi mở vào sảnh */}
        {[-0.95, 0.95].map((dz, idx) => (
          <mesh key={`smse-door-frame-${idx}`} position={[0.06, 1.62, dz]}>
            <boxGeometry args={[0.06, 2.75, 0.08]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.5} />
          </mesh>
        ))}

        {/* 3 bậc tam cấp đá granite đen bóng trải rộng 6.9m */}
        {[0, 1, 2].map((st) => (
          <mesh
            key={`smse-black-step-${st}`}
            position={[0.68 - st * 0.22, 0.08 + st * 0.11, 0]}
            receiveShadow
          >
            <boxGeometry args={[0.28, 0.11, 6.9 - st * 0.25]} />
            <meshStandardMaterial color="#18181B" roughness={0.35} metalness={0.25} />
          </mesh>
        ))}

        {/* Mái đón phẳng sơn đen sang trọng đua ra 1.15m (y = 3.22m) */}
        <mesh position={[0.58, 3.22, 0]} castShadow>
          <boxGeometry args={[1.18, 0.2, 7.1]} />
          <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.45} />
        </mesh>

        {/* Dòng chữ nổi 3D kim loại vàng đồng "TRƯỜNG VẬT LIỆU" (dày khối đặc 0.20m + thanh ray đỡ thép đen)
            đặt đứng vững chãi trên đỉnh mái đón đen — nhìn nghiêng từ đầu đường vẫn thấy rõ chiều dày 3D thật! */}
        <ExtrudedText3D
          text="TRƯỜNG VẬT LIỆU"
          size={[5.9, 0.78]}
          depth={0.2}
          position={[0.88, 3.74, 0]}
          rotation={[0, Math.PI / 2, 0]}
          frontColor="#D8AE48"
          frontHighlightColor="#FDF0B2"
          sideColor="#785314"
          metalness={0.76}
          roughness={0.25}
          emissive="#B4831E"
          emissiveIntensity={isNight ? 0.3 : 0.08}
          mountingRail={{
            yOffset: -0.39,
            height: 0.06,
            depth: 0.22,
            color: '#0F172A',
            standoffCount: 8,
          }}
        />

        {/* 2 Standee màu xanh dương đậm "SMSE" có mã QR đứng hai bên cửa kính trên thềm đá đen */}
        {[-1.25, 1.25].map((sz, sIdx) => (
          <group key={`smse-standee-${sIdx}`} position={[0.32, 0.36, sz]}>
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.28, 0.04, 0.48]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.68, 0]} castShadow>
              <boxGeometry args={[0.04, 1.28, 0.52]} />
              <meshStandardMaterial color="#1E3A8A" roughness={0.5} />
            </mesh>
            <LabelPlane
              textureKey="smse-blue-standee"
              canvasW={256}
              canvasH={512}
              draw={(ctx, w, h) => {
                ctx.fillStyle = '#1E3A8A';
                ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = '#38BDF8';
                ctx.fillRect(16, 20, w - 32, 48);
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.font = '800 28px "Be Vietnam Pro", Arial, sans-serif';
                ctx.fillText('SMSE', w / 2, 54);
                ctx.font = '700 20px "Be Vietnam Pro", Arial, sans-serif';
                ctx.fillText('TRƯỜNG VẬT LIỆU', w / 2, 118);
                ctx.fillStyle = '#FDE047';
                ctx.fillText('TUYỂN SINH & ĐÀO TẠO', w / 2, 162);
                // Ô QR trắng dưới chân standee đúng ảnh thật
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(68, 290, 120, 120);
                ctx.fillStyle = '#0F172A';
                ctx.fillRect(82, 304, 34, 34);
                ctx.fillRect(140, 304, 34, 34);
                ctx.fillRect(82, 362, 34, 34);
                ctx.fillRect(126, 348, 28, 28);
                ctx.fillStyle = '#E2E8F0';
                ctx.fillRect(0, 442, w, 70);
              }}
              size={[0.5, 1.24]}
              position={[0.028, 0.68, 0]}
              rotation={[0, Math.PI / 2, 0]}
              transparent={false}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

export function VietDucCenterBuilding({ isNight }: { isNight: boolean }) {
  const { center, size, floors, floorHeight } = VDZ_CENTER;
  const h = floors * floorHeight;

  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.16, 0.5, size.z + 0.16]} />
        <meshStandardMaterial color="#8E9BAE" roughness={0.88} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h, size.z]} />
        <meshStandardMaterial color="#E6F0FA" roughness={0.86} />
      </mesh>
      <mesh position={[0, h + 0.22, 0]} castShadow>
        <boxGeometry args={[size.x + 0.4, 0.44, size.z + 0.4]} />
        <meshStandardMaterial color="#3B6E9C" roughness={0.78} />
      </mesh>
      {Array.from({ length: floors }, (_, fl) =>
        [-2.85, -0.95, 0.95, 2.85].map((wx, idx) => (
          <group key={`vdz-win-${fl}-${idx}`}>
            <mesh position={[wx, fl * floorHeight + 1.55, size.z / 2 + 0.03]}>
              <planeGeometry args={[1.35, 1.12]} />
              <meshStandardMaterial
                color={isNight ? '#FFE4A0' : GLASS_MID}
                emissive={isNight ? '#FFB84D' : '#000000'}
                emissiveIntensity={isNight ? 0.65 : 0}
                roughness={0.35}
              />
            </mesh>
            <mesh position={[wx, fl * floorHeight + 1.55, -size.z / 2 - 0.03]} rotation-y={Math.PI}>
              <planeGeometry args={[1.35, 1.12]} />
              <meshStandardMaterial
                color={isNight ? '#FFE4A0' : GLASS_MID}
                emissive={isNight ? '#FFB84D' : '#000000'}
                emissiveIntensity={isNight ? 0.65 : 0}
                roughness={0.35}
              />
            </mesh>
          </group>
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
        position={[0, h - 0.55, -size.z / 2 - 0.05]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
    </group>
  );
}

/**
 * Không gian số HUST Digital Hub — khối nhà kính hiện đại nằm giữa Trung tâm Việt – Đức (VDZ)
 * và Nhà Cựu sinh viên Bách Khoa ở bờ Bắc Hồ Tiền theo đúng Bản đồ Số https://hustmap.com/.
 */
export function HustDigitalHubBuilding({ isNight }: { isNight: boolean }) {
  const { center, size, floors, floorHeight } = HUST_DIGITAL_HUB;
  const h = floors * floorHeight;

  return (
    <group position={[center.x, 0, center.z]}>
      <mesh position={[0, 0.24, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.18, 0.48, size.z + 0.18]} />
        <meshStandardMaterial color="#475569" roughness={0.82} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, h, size.z]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
      </mesh>
      {/* Diềm mái công nghệ màu xanh dương đậm kết hợp chỉ đỏ Bách Khoa */}
      <mesh position={[0, h + 0.22, 0]} castShadow>
        <boxGeometry args={[size.x + 0.4, 0.44, size.z + 0.4]} />
        <meshStandardMaterial color="#0F172A" roughness={0.62} metalness={0.25} />
      </mesh>
      <mesh position={[0, h + 0.48, 0]}>
        <boxGeometry args={[size.x + 0.44, 0.08, size.z + 0.44]} />
        <meshStandardMaterial color="#DC2626" roughness={0.55} />
      </mesh>
      {/* Vách kính lớn 2 tầng mặt Bắc & mặt Nam */}
      {[0, 1].map((fl) =>
        [-2.0, 0, 2.0].map((wx, idx) => (
          <group key={`dhub-win-${fl}-${idx}`}>
            <mesh position={[wx, fl * floorHeight + 1.55, -size.z / 2 - 0.03]} rotation-y={Math.PI}>
              <planeGeometry args={[1.62, 1.32]} />
              <meshStandardMaterial
                color={isNight ? '#BAE6FD' : '#1E3A5F'}
                emissive={isNight ? '#38BDF8' : '#000000'}
                emissiveIntensity={isNight ? 0.72 : 0}
                roughness={0.22}
                metalness={0.35}
              />
            </mesh>
            <mesh position={[wx, fl * floorHeight + 1.55, size.z / 2 + 0.03]}>
              <planeGeometry args={[1.62, 1.32]} />
              <meshStandardMaterial
                color={isNight ? '#BAE6FD' : '#1E3A5F'}
                emissive={isNight ? '#38BDF8' : '#000000'}
                emissiveIntensity={isNight ? 0.72 : 0}
                roughness={0.22}
                metalness={0.35}
              />
            </mesh>
          </group>
        )),
      )}
      <LabelPlane
        textureKey="hust-digital-hub-sign-only"
        canvasW={576}
        canvasH={120}
        draw={(ctx, w, hCanvas) => {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, w - 12, hCanvas - 12);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 32px "Be Vietnam Pro", "Segoe UI", sans-serif';
          ctx.fillText('HUST DIGITAL HUB', w / 2, hCanvas * 0.4);
          ctx.fillStyle = '#7DD3FC';
          ctx.font = '700 20px "Be Vietnam Pro", "Segoe UI", sans-serif';
          ctx.fillText('KHÔNG GIAN SỐ BÁCH KHOA · 数字中心', w / 2, hCanvas * 0.76);
        }}
        size={[3.9, 0.82]}
        position={[0, h - 0.52, -size.z / 2 - 0.05]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
    </group>
  );
}

/**
 * Tòa nhà Cựu sinh viên Bách Khoa (tách biệt với HUST Digital Hub, nằm sát góc Đông-Bắc Hồ Tiền,
 * mặt tiền chính hướng Bắc -Z nhìn ra đại lộ sau nhập làn).
 * Dựng chuẩn 1:1 theo ảnh thực tế `tham-khao/NEW/tòa cựu sinh viên bách khoa.jpg`:
 *   - Khối hiện đại 2 tầng sơn trắng sáng + chữ nổi trên diềm mái "TÒA NHÀ CỰU SINH VIÊN BÁCH KHOA" + 5 đèn cần rọi.
 *   - Tầng 2 treo pano lớn kỷ niệm 70 năm ĐHBK HN: TRIỂN LÃM ẢNH "NGƯỜI BÁCH KHOA".
 *   - Tầng 1 bên Đông (+X) có hành lang cột thoáng + tường hoa gió đục ô chữ nhật so le + ghế gỗ;
 *     chính giữa là sảnh kính sáng đèn với bảng LED đỏ & mái kính treo thanh giằng inox.
 *   - Sân gạch hồng kem phía trước + Backdrop Check-in 70 Năm ĐHBK Hà Nội (1956–2026) bên sân Tây.
 */
export function AlumniHouseBuilding({ isNight }: { isNight: boolean }) {
  const { center, size, floors, floorHeight } = ALUMNI_HOUSE;
  const h = floors * floorHeight; // 2 × 3.3m = 6.6m
  const northZ = -size.z / 2; // -1.7m (mặt tiền chính hướng Bắc -Z)

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Sân gạch lát màu hồng kem trang nhã phía trước tòa nhà + bồn cây dải bụi thấp sát vỉa hè đại lộ */}
      <mesh position={[-1.4, 0.028, northZ - 1.45]} receiveShadow>
        <boxGeometry args={[size.x + 5.6, 0.056, 2.9]} />
        <meshStandardMaterial color="#DFCDC3" roughness={0.88} />
      </mesh>
      <mesh position={[-1.4, 0.14, northZ - 2.85]} receiveShadow>
        <boxGeometry args={[size.x + 5.2, 0.22, 0.42]} />
        <meshStandardMaterial color="#3F6E38" roughness={0.92} />
      </mesh>

      {/* Bệ tam cấp đá granite đen chạy dọc chân mặt tiền */}
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[size.x + 0.28, 0.28, size.z + 0.28]} />
        <meshStandardMaterial color="#1E293B" roughness={0.55} />
      </mesh>

      {/* Khối chính tầng 2 sơn trắng sáng vươn dài toàn bộ chiều ngang 10.2m (tạo hiên thoáng đầu Đông tầng 1) */}
      <mesh position={[0, floorHeight + floorHeight / 2 + 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, floorHeight + 0.44, size.z]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
      </mesh>
      {/* Gờ chắn mái (parapet) phẳng màu trắng cao thêm 0.65m để gắn dòng chữ nổi */}
      <mesh position={[0, h + 0.48, 0]} castShadow>
        <boxGeometry args={[size.x + 0.18, 0.68, size.z + 0.18]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.78} />
      </mesh>

      {/* Khối tầng 1 (x = -5.1..+3.1 = 8.2m), chừa 2.0m đầu Đông (+X) làm hành lang cột mở đúng ảnh thật */}
      <mesh position={[-1.0, floorHeight / 2 + 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x - 2.0, floorHeight, size.z - 0.1]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
      </mesh>
      {/* Cột hiên đầu Đông (+X) & đèn hắt ấm chân cột */}
      <mesh position={[size.x / 2 - 0.22, floorHeight / 2 + 0.14, northZ + 0.22]} castShadow>
        <boxGeometry args={[0.38, floorHeight, 0.38]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
      </mesh>
      <mesh position={[size.x / 2 - 0.22, floorHeight / 2 + 0.14, size.z / 2 - 0.22]} castShadow>
        <boxGeometry args={[0.38, floorHeight, 0.38]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.78} />
      </mesh>

      {/* Tường hoa gió đục các ô chữ nhật đứng so le màu trắng ở tầng 1 bên trái sảnh (+X: x = 0.6..2.8) + ghế gỗ */}
      <group position={[1.7, 0, northZ - 0.04]}>
        <mesh position={[0, 1.68, 0.06]}>
          <planeGeometry args={[2.1, 2.75]} />
          <meshStandardMaterial
            color="#FEF3C7"
            emissive="#FDE68A"
            emissiveIntensity={isNight ? 0.85 : 0.35}
            roughness={0.7}
            side={2}
          />
        </mesh>
        {[-0.82, -0.28, 0.28, 0.82].map((cx, cIdx) => (
          <group key={`alumni-breeze-col-${cIdx}`} position={[cx, 0, 0]}>
            <mesh position={[0, 1.68, 0]}>
              <boxGeometry args={[0.16, 2.9, 0.08]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.78} />
            </mesh>
            {[0.55, 1.38, 2.22].map((ry, rIdx) => (
              <mesh
                key={`bar-${rIdx}`}
                position={[0.26, ry + (cIdx % 2 === 0 ? 0 : 0.22), 0]}
              >
                <boxGeometry args={[0.42, 0.16, 0.08]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.78} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Ghế công viên nan gỗ nâu đặt ngay trước mảng tường ô thoáng */}
        <group position={[0, 0, -0.42]}>
          <mesh position={[0, 0.44, 0]} castShadow>
            <boxGeometry args={[1.55, 0.08, 0.46]} />
            <meshStandardMaterial color="#6D4C3D" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.72, 0.2]} castShadow>
            <boxGeometry args={[1.55, 0.44, 0.07]} />
            <meshStandardMaterial color="#6D4C3D" roughness={0.85} />
          </mesh>
          {[-0.65, 0.65].map((lx) => (
            <mesh key={`bench-leg-${lx}`} position={[lx, 0.22, 0]}>
              <boxGeometry args={[0.07, 0.44, 0.42]} />
              <meshStandardMaterial color="#1E293B" roughness={0.6} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Sảnh kính chính giữa-phải (x = -1.35) + Bảng LED chữ đỏ + Mái kính cường lực treo thanh giằng inox */}
      <group position={[-1.35, 0, northZ]}>
        {/* Lòng sảnh sáng ấm nhìn xuyên qua cửa kính */}
        <mesh position={[0, 1.65, 0.22]}>
          <boxGeometry args={[3.4, 2.8, 0.36]} />
          <meshStandardMaterial
            color="#FFFBEB"
            emissive="#FDE68A"
            emissiveIntensity={isNight ? 0.95 : 0.48}
            roughness={0.65}
          />
        </mesh>
        {[-1.68, -0.62, 0.62, 1.68].map((mx, idx) => (
          <mesh key={`alumni-door-mull-${idx}`} position={[mx, 1.65, -0.02]}>
            <boxGeometry args={[0.08, 2.82, 0.08]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
        {/* Bảng điện tử LED chữ đỏ phát sáng trên cửa chính */}
        <mesh position={[0, 2.84, -0.05]}>
          <boxGeometry args={[1.95, 0.34, 0.08]} />
          <meshStandardMaterial color="#111827" roughness={0.4} />
        </mesh>
        <LabelPlane
          textureKey="alumni-led-ticker-v2"
          canvasW={576}
          canvasH={96}
          draw={(ctx, w, hCanvas) => {
            ctx.fillStyle = '#090D16';
            ctx.fillRect(0, 0, w, hCanvas);
            ctx.fillStyle = '#EF4444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 26px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('★ NGÀY HỘI KHỞI NGHIỆP BÁCH KHOA ★', w / 2, hCanvas / 2 + 2);
          }}
          size={[1.86, 0.28]}
          position={[0, 2.84, -0.1]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
        {/* Mái đón kính trong suốt + 2 thanh giằng chéo inox */}
        <mesh position={[0, 3.24, -0.58]} castShadow>
          <boxGeometry args={[2.9, 0.06, 1.16]} />
          <meshStandardMaterial
            color="#BAE6FD"
            transparent
            opacity={0.62}
            roughness={0.15}
            metalness={0.45}
          />
        </mesh>
        {[-0.95, 0.95].map((rx, idx) => (
          <mesh
            key={`alumni-rod-${idx}`}
            position={[rx, 3.56, -0.48]}
            rotation={[0.68, 0, 0]}
          >
            <cylinderGeometry args={[0.016, 0.016, 1.15, 8]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.25} metalness={0.85} />
          </mesh>
        ))}
      </group>

      {/* Cửa sổ 2 cánh khung đen bên phải sảnh tầng 1 (x = -3.95) */}
      <group position={[-3.95, 1.65, northZ - 0.02]}>
        <mesh>
          <boxGeometry args={[1.15, 1.35, 0.05]} />
          <meshStandardMaterial color="#1E293B" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0, -0.03]} rotation-y={Math.PI}>
          <planeGeometry args={[1.02, 1.2]} />
          <meshStandardMaterial color="#64748B" roughness={0.25} metalness={0.35} />
        </mesh>
      </group>

      {/* PANO TRIỂN LÃM LỚN TẦNG 2: "70 NĂM ĐHBK HN · TRIỂN LÃM ẢNH NGƯỜI BÁCH KHOA" */}
      <LabelPlane
        textureKey="alumni-70y-exhibition-banner-v2"
        canvasW={1024}
        canvasH={240}
        draw={(ctx, w, hCanvas) => {
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, '#111827');
          grad.addColorStop(0.48, '#2A1215');
          grad.addColorStop(1, '#0B1933');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, hCanvas);
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 4;
          ctx.strokeRect(4, 4, w - 8, hCanvas - 8);
          // Tia sáng công nghệ trang trí giống pano thật
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(140, 210);
          ctx.quadraticCurveTo(460, 120, 920, 220);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
          ctx.beginPath();
          ctx.moveTo(420, 230);
          ctx.quadraticCurveTo(680, 140, 980, 195);
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.fillStyle = '#F8FAFC';
          ctx.font = '700 22px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('Lần đầu tiên', 32, 58);
          ctx.fillText('những trang lịch sử', 32, 92);
          ctx.fillStyle = '#FACC15';
          ctx.font = '900 28px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('70 năm ĐHBK HN', 32, 134);

          ctx.textAlign = 'center';
          ctx.fillStyle = '#EF4444';
          ctx.font = '900 44px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('70', w * 0.64, 68);
          ctx.fillStyle = '#FDE047';
          ctx.font = '800 28px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('TRIỂN LÃM ẢNH "NGƯỜI BÁCH KHOA"', w * 0.64, 118);
          ctx.fillStyle = '#BAE6FD';
          ctx.font = '600 18px "Be Vietnam Pro", Arial, sans-serif';
          ctx.fillText('1956 – 2026 · TỰ HÀO TRUYỀN THỐNG KỸ SƯ BÁCH KHOA', w * 0.64, 162);
        }}
        size={[7.4, 1.72]}
        position={[-0.95, 4.92, northZ - 0.05]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />

      {/* CHỮ NỔI 3D KHỐI ĐẶC TRÊN CỔ MÁI: "TÒA NHÀ CỰU SINH VIÊN BÁCH KHOA" + 5 ĐÈN CẦN RỌI */}
      <ExtrudedText3D
        text="TÒA NHÀ CỰU SINH VIÊN BÁCH KHOA"
        size={[7.6, 0.68]}
        depth={0.15}
        position={[-0.75, h + 0.42, northZ - 0.14]}
        rotation={[0, Math.PI, 0]}
        frontColor="#27272A"
        frontHighlightColor="#52525B"
        sideColor="#09090B"
        metalness={0.58}
        roughness={0.36}
      />
      {[-3.8, -2.1, -0.4, 1.3, 3.0].map((lx, idx) => (
        <group key={`alumni-gooseneck-${idx}`} position={[lx, h + 0.84, northZ - 0.24]}>
          <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.36, 8]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, -0.05, -0.06]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial
              color="#1E293B"
              emissive={isNight ? '#FFE082' : '#000000'}
              emissiveIntensity={isNight ? 1.8 : 0}
            />
          </mesh>
        </group>
      ))}

      {/* Cửa sổ mặt Nam (+Z) nhìn xuống mặt nước Hồ Tiền */}
      {[0, 1].map((fl) =>
        [-2.8, 0, 2.8].map((wx, idx) => (
          <mesh
            key={`alumni-south-win-${fl}-${idx}`}
            position={[wx, fl * floorHeight + 1.65, size.z / 2 + 0.03]}
          >
            <planeGeometry args={[1.8, 1.3]} />
            <meshStandardMaterial
              color={isNight ? '#FFE4A0' : '#2A475E'}
              emissive={isNight ? '#FFB84D' : '#000000'}
              emissiveIntensity={isNight ? 0.7 : 0}
              roughness={0.28}
              metalness={0.25}
            />
          </mesh>
        )),
      )}

      {/* BACKDROP CHECK-IN KỶ NIỆM 70 NĂM ĐHBK HÀ NỘI (1956–2026) Ở SÂN BÊN PHẢI (-X)
          (khớp góc phải ảnh `tòa cựu sinh viên bách khoa.jpg`: world x ≈ 8.2, z ≈ 0.5) */}
      <group position={[-7.05, 0, -0.45]}>
        {/* Bục thảm đỏ sự kiện */}
        <mesh position={[0, 0.05, -0.18]} receiveShadow>
          <boxGeometry args={[3.15, 0.1, 0.95]} />
          <meshStandardMaterial color="#B91C1C" roughness={0.82} />
        </mesh>
        {/* Tấm khung hậu thuẫn đặc phía sau để không bao giờ bị nhìn xuyên/ngược chữ */}
        <mesh position={[0, 1.12, 0]} castShadow>
          <boxGeometry args={[3.05, 2.05, 0.12]} />
          <meshStandardMaterial color="#DC2626" roughness={0.62} />
        </mesh>
        <LabelPlane
          textureKey="hust-70y-checkin-backdrop"
          canvasW={768}
          canvasH={480}
          draw={(ctx, w, hCanvas) => {
            ctx.fillStyle = '#DC2626';
            ctx.fillRect(0, 0, w, hCanvas);
            // Mảng trắng trung tâm vát chéo năng động đúng thiết kế kỷ niệm 70 năm
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(150, 28);
            ctx.lineTo(w - 36, 28);
            ctx.lineTo(w - 86, hCanvas - 32);
            ctx.lineTo(110, hCanvas - 32);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 8;
            ctx.stroke();

            // Huy hiệu tròn 70 năm bên trái
            ctx.beginPath();
            ctx.arc(112, 265, 68, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#DC2626';
            ctx.stroke();
            ctx.fillStyle = '#DC2626';
            ctx.textAlign = 'center';
            ctx.font = '900 30px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('1956', 112, 256);
            ctx.fillText('2026', 112, 292);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 34px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('HUST', 112, 412);

            // Nội dung chữ chính giữa
            ctx.fillStyle = '#B91C1C';
            ctx.font = '800 24px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('CHÀO MỪNG KỶ NIỆM 70 NĂM THÀNH LẬP', w * 0.56, 138);
            ctx.font = '900 29px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w * 0.56, 182);
            ctx.fillStyle = '#475569';
            ctx.font = '700 20px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('(1956 – 2026)', w * 0.56, 222);
            ctx.fillStyle = '#DC2626';
            ctx.font = '900 44px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('BÁCH KHOA 2026', w * 0.56, 298);
            ctx.fillStyle = '#D97706';
            ctx.font = '800 24px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('NGÀY TRỞ VỀ · ONE LOVE ONE FUTURE', w * 0.56, 358);
          }}
          size={[2.98, 1.98]}
          position={[0, 1.12, -0.072]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
      </group>
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
interface SharedCarAssets {
  sedanBodyGeo: THREE.BufferGeometry;
  suvBodyGeo: THREE.BufferGeometry;
  sedanSideGlassGeo: THREE.BufferGeometry;
  suvSideGlassGeo: THREE.BufferGeometry;
  wheelArchGeo: THREE.BufferGeometry;
  tireGeo: THREE.BufferGeometry;
  rimGeo: THREE.BufferGeometry;
  hubGeo: THREE.BufferGeometry;
  shadowTex: THREE.CanvasTexture;
}

let sharedCarAssetsSingleton: SharedCarAssets | null = null;

function extrudeCarSideProfile(shape: THREE.Shape, halfWidth: number, bevel = 0.045): THREE.BufferGeometry {
  const depth = Math.max(0.1, (halfWidth - bevel) * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 14,
  });
  // Shape (x = car Z length, y = car Y height), extruded along local +Z -> center & rotateY(+PI/2) so:
  // new X = old Z (width), new Y = old Y (height), new Z = -old X -> negate shape X or rotateY(-PI/2):
  // With rotateY(-PI/2): new X = -old Z, new Y = old Y, new Z = +old X!
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function getSharedCarAssets(): SharedCarAssets | null {
  if (typeof document === 'undefined') return null;
  if (sharedCarAssetsSingleton) return sharedCarAssetsSingleton;

  // Profile Sedan khí động học: mũi thấp bo cong, nắp capo dốc nhẹ, kính lái 38°, mui cong mượt, cốp sau gọn
  const sedanS = new THREE.Shape();
  sedanS.moveTo(-2.12, 0.3);
  sedanS.lineTo(2.08, 0.28);
  sedanS.quadraticCurveTo(2.2, 0.34, 2.18, 0.58);
  sedanS.quadraticCurveTo(2.12, 0.72, 1.88, 0.77);
  sedanS.lineTo(1.06, 0.85);
  sedanS.quadraticCurveTo(0.62, 1.24, 0.28, 1.33);
  sedanS.quadraticCurveTo(-0.32, 1.37, -0.78, 1.3);
  sedanS.quadraticCurveTo(-1.18, 1.18, -1.48, 0.9);
  sedanS.lineTo(-2.04, 0.85);
  sedanS.quadraticCurveTo(-2.16, 0.82, -2.16, 0.56);
  sedanS.closePath();

  const sedanGlassS = new THREE.Shape();
  sedanGlassS.moveTo(0.92, 0.88);
  sedanGlassS.quadraticCurveTo(0.56, 1.2, 0.25, 1.27);
  sedanGlassS.quadraticCurveTo(-0.3, 1.3, -0.74, 1.24);
  sedanGlassS.quadraticCurveTo(-1.08, 1.14, -1.32, 0.91);
  sedanGlassS.closePath();

  // Profile Crossover SUV: gầm cao khoẻ khoắn, mui dài, cửa hậu vát thể thao
  const suvS = new THREE.Shape();
  suvS.moveTo(-2.14, 0.34);
  suvS.lineTo(2.08, 0.32);
  suvS.quadraticCurveTo(2.22, 0.38, 2.2, 0.68);
  suvS.quadraticCurveTo(2.14, 0.84, 1.88, 0.89);
  suvS.lineTo(1.08, 0.95);
  suvS.quadraticCurveTo(0.64, 1.38, 0.28, 1.48);
  suvS.lineTo(-1.38, 1.47);
  suvS.quadraticCurveTo(-1.74, 1.44, -1.98, 0.98);
  suvS.quadraticCurveTo(-2.16, 0.9, -2.16, 0.58);
  suvS.closePath();

  const suvGlassS = new THREE.Shape();
  suvGlassS.moveTo(0.94, 0.98);
  suvGlassS.quadraticCurveTo(0.58, 1.33, 0.26, 1.41);
  suvGlassS.lineTo(-1.34, 1.4);
  suvGlassS.quadraticCurveTo(-1.62, 1.37, -1.82, 1.0);
  suvGlassS.closePath();

  const sedanBodyGeo = extrudeCarSideProfile(sedanS, 0.89, 0.055);
  const suvBodyGeo = extrudeCarSideProfile(suvS, 0.92, 0.06);
  // Kính sườn rộng hơn thân xe +0.014m mỗi bên để nổi rõ trên hông xe và không bị lấp trong thân
  const sedanSideGlassGeo = extrudeCarSideProfile(sedanGlassS, 0.904, 0.01);
  const suvSideGlassGeo = extrudeCarSideProfile(suvGlassS, 0.934, 0.01);

  const wheelArchGeo = new THREE.CylinderGeometry(0.375, 0.375, 0.26, 20);
  wheelArchGeo.rotateZ(Math.PI / 2);
  const tireGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.275, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.288, 14);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.298, 10);
  hubGeo.rotateZ(Math.PI / 2);

  sharedCarAssetsSingleton = {
    sedanBodyGeo,
    suvBodyGeo,
    sedanSideGlassGeo,
    suvSideGlassGeo,
    wheelArchGeo,
    tireGeo,
    rimGeo,
    hubGeo,
    shadowTex: makeSoftShadowTexture(),
  };
  return sharedCarAssetsSingleton;
}

export function FacultyParkedCar({
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
  const assets = useMemo(() => getSharedCarAssets(), []);

  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      {/* Bóng tiếp xúc AO mềm dưới gầm ô tô */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.026, 0]}>
        <planeGeometry args={[2.35, 4.95]} />
        <meshBasicMaterial
          map={assets?.shadowTex}
          color="#090D16"
          transparent
          opacity={0.76}
          depthWrite={false}
        />
      </mesh>

      {/* 4 bánh xe lốp đen + mâm đúc hợp kim đa chấu */}
      {[
        [-0.84, -1.34],
        [0.84, -1.34],
        [-0.84, 1.34],
        [0.84, 1.34],
      ].map(([wx, wz], idx) => (
        <group key={`wheel-${idx}`} position={[wx, 0.33, wz]}>
          {assets ? (
            <>
              <mesh geometry={assets.wheelArchGeo}>
                <meshStandardMaterial color="#0F172A" roughness={0.92} />
              </mesh>
              <mesh geometry={assets.tireGeo} castShadow>
                <meshStandardMaterial color="#18181B" roughness={0.86} />
              </mesh>
              <mesh geometry={assets.rimGeo}>
                <meshStandardMaterial color="#DCE4EE" roughness={0.26} metalness={0.78} />
              </mesh>
              <mesh geometry={assets.hubGeo}>
                <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.65} />
              </mesh>
            </>
          ) : (
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.32, 0.32, 0.22, 16]} />
              <meshStandardMaterial color="#18181B" roughness={0.85} />
            </mesh>
          )}
        </group>
      ))}

      {/* Thân xe nguyên khối bo cong khí động học (ExtrudeGeometry có vát mép mềm) */}
      {assets && (
        <>
          <mesh
            geometry={isSuv ? assets.suvBodyGeo : assets.sedanBodyGeo}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={color}
              roughness={0.24}
              metalness={0.52}
              envMapIntensity={1.25}
            />
          </mesh>
          {/* Cụm cửa kính sườn hai bên thân xe */}
          <mesh geometry={isSuv ? assets.suvSideGlassGeo : assets.sedanSideGlassGeo}>
            <meshStandardMaterial
              color="#1E2F42"
              roughness={0.14}
              metalness={0.68}
              envMapIntensity={1.35}
            />
          </mesh>
        </>
      )}

      {/* Kính chắn gió trước nghiêng 38° & kính hậu nghiêng */}
      <mesh
        position={[0, isSuv ? 1.18 : 1.07, 0.69]}
        rotation={[-0.95, 0, 0]}
      >
        <boxGeometry args={[isSuv ? 1.52 : 1.46, 0.82, 0.03]} />
        <meshStandardMaterial color="#203449" roughness={0.12} metalness={0.72} envMapIntensity={1.4} />
      </mesh>
      <mesh
        position={[0, isSuv ? 1.2 : 1.08, isSuv ? -1.78 : -1.16]}
        rotation={[isSuv ? 0.56 : 0.96, 0, 0]}
      >
        <boxGeometry args={[isSuv ? 1.48 : 1.42, isSuv ? 0.58 : 0.72, 0.03]} />
        <meshStandardMaterial color="#1E2F42" roughness={0.14} metalness={0.68} envMapIntensity={1.35} />
      </mesh>

      {/* Bậc ốp sườn tối màu + gương chiếu hậu hai bên + tay nắm cửa mạ crôm */}
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[isSuv ? 1.86 : 1.8, 0.09, 2.2]} />
        <meshStandardMaterial color="#1E293B" roughness={0.72} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={`car-side-trim-${side}`}>
          {/* Trụ B đen bóng chia ranh giới cửa kính trước & kính sau */}
          <mesh position={[side * (isSuv ? 0.938 : 0.908), isSuv ? 1.19 : 1.08, -0.14]}>
            <boxGeometry args={[0.018, isSuv ? 0.42 : 0.36, 0.09]} />
            <meshStandardMaterial color="#0F172A" roughness={0.22} metalness={0.45} />
          </mesh>
          {/* Nẹp crôm chân kính cửa xe */}
          <mesh position={[side * (isSuv ? 0.938 : 0.908), isSuv ? 0.98 : 0.89, isSuv ? -0.35 : -0.18]}>
            <boxGeometry args={[0.018, 0.022, isSuv ? 2.48 : 2.12]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.26} metalness={0.82} />
          </mesh>
          {/* Gương chiếu hậu khí động học */}
          <mesh position={[side * (isSuv ? 0.96 : 0.93), isSuv ? 0.99 : 0.9, 0.76]}>
            <boxGeometry args={[0.16, 0.1, 0.2]} />
            <meshStandardMaterial color={color} roughness={0.26} metalness={0.5} />
          </mesh>
          {/* Tay nắm cửa trước & sau */}
          {[-0.42, 0.28].map((hz, hIdx) => (
            <mesh
              key={`handle-${side}-${hIdx}`}
              position={[side * (isSuv ? 0.925 : 0.895), isSuv ? 0.86 : 0.77, hz]}
            >
              <boxGeometry args={[0.025, 0.035, 0.16]} />
              <meshStandardMaterial color="#CBD5E1" roughness={0.28} metalness={0.78} />
            </mesh>
          ))}
        </group>
      ))}
      {isSuv &&
        ([-0.66, 0.66] as const).map((rx) => (
          <mesh key={`roof-rail-${rx}`} position={[rx, 1.5, -0.52]}>
            <boxGeometry args={[0.045, 0.045, 1.65]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.32} metalness={0.75} />
          </mesh>
        ))}

      {/* Cản dưới trước/sau + lưới tản nhiệt nan crôm */}
      <mesh position={[0, 0.34, 2.15]}>
        <boxGeometry args={[1.64, 0.14, 0.1]} />
        <meshStandardMaterial color="#1E293B" roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.36, -2.13]}>
        <boxGeometry args={[1.66, 0.16, 0.1]} />
        <meshStandardMaterial color="#1E293B" roughness={0.68} />
      </mesh>
      <mesh position={[0, isSuv ? 0.62 : 0.54, 2.18]}>
        <boxGeometry args={[0.92, isSuv ? 0.24 : 0.18, 0.04]} />
        <meshStandardMaterial color="#0F172A" roughness={0.5} metalness={0.35} />
      </mesh>
      {[0, 1, 2].map((bar) => (
        <mesh
          key={`grille-bar-${bar}`}
          position={[0, (isSuv ? 0.55 : 0.48) + bar * 0.065, 2.202]}
        >
          <boxGeometry args={[0.86, 0.018, 0.02]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.24} metalness={0.85} />
        </mesh>
      ))}

      {/* Cụm đèn pha Projector LED trước & dải đèn hậu LED đỏ sau */}
      {[-0.63, 0.63].map((lx) => (
        <mesh
          key={`headlight-${lx}`}
          position={[lx, isSuv ? 0.68 : 0.59, 2.15]}
          rotation={[0, lx > 0 ? 0.16 : -0.16, 0]}
        >
          <boxGeometry args={[0.34, 0.12, 0.06]} />
          <meshStandardMaterial
            color="#F8FAFC"
            emissive="#FEF08A"
            emissiveIntensity={isNight ? 0.95 : 0.2}
            roughness={0.18}
          />
        </mesh>
      ))}
      {[-0.62, 0.62].map((lx) => (
        <mesh key={`taillight-${lx}`} position={[lx, isSuv ? 0.78 : 0.68, -2.14]}>
          <boxGeometry args={[0.38, 0.12, 0.05]} />
          <meshStandardMaterial
            color="#DC2626"
            emissive="#EF4444"
            emissiveIntensity={isNight ? 0.85 : 0.24}
            roughness={0.28}
          />
        </mesh>
      ))}

      {/* Biển số xe trắng trước & sau */}
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
        size={[0.46, 0.115]}
        position={[0, 0.41, 2.215]}
        transparent={false}
      />
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
        size={[0.46, 0.115]}
        position={[0, isSuv ? 0.68 : 0.62, -2.17]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />
    </group>
  );
}

/**
 * Dải đỗ xe ô tô của cán bộ giảng viên dọc trục rẽ phải phía Bắc Trường Vật liệu / Tây Tòa C7
 * (khớp ảnh thực tế `Từ cuối 2 nhánh bên nhìn sang bên phải, chỗ tòa C7.jpg` & https://hustmap.com/).
 */
export function C7FacultyParkingLane({ isNight }: { isNight: boolean }) {
  return (
    <group>
      {/* Dải nền bê tông nhựa đỗ xe ô tô phía Tây trục x = 56.2 (x: 47.9..53.7, z: -54.2..-32.0) */}
      <mesh rotation-x={-Math.PI / 2} position={[50.8, 0.018, -43.1]} receiveShadow>
        <planeGeometry args={[5.8, 22.4]} />
        <meshStandardMaterial color="#64686E" roughness={0.9} />
      </mesh>

      {/* Vạch sơn trắng phân chia các ô đỗ xe dọc đường */}
      {[-32.2, -37.7, -43.2, -48.7, -54.0].map((lineZ, idx) => (
        <mesh key={`c7-stall-line-${idx}`} rotation-x={-Math.PI / 2} position={[50.8, 0.023, lineZ]}>
          <planeGeometry args={[5.3, 0.13]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.85} />
        </mesh>
      ))}

      {/* Biển báo "P — KHU ĐỖ XE Ô TÔ GIẢNG VIÊN C7" có hộp lưng đặc (không bị ngược chữ từ phía sau) */}
      <group position={[48.5, 0, -31.8]} rotation-y={0}>
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 2.3, 10]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 2.05, 0]} castShadow>
          <boxGeometry args={[1.08, 0.75, 0.05]} />
          <meshStandardMaterial color="#1D4ED8" roughness={0.55} />
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
          position={[0, 2.05, 0.036]}
          transparent={false}
        />
      </group>

      {/* 5 chiếc ô tô giảng viên đỗ ngay ngắn dọc hai bên dải đỗ xe */}
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
