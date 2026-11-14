// ---------------------------------------------------------------------------
// features/campus/buildings/SportsAndStadiumComplex.tsx — Khu Thể thao & SVĐ
// dọc hai bên phố Lê Thanh Nghị theo đúng Bản đồ Số https://hustmap.com/:
//   - Tây-Bắc phố Lê Thanh Nghị: Bể bơi Bách Khoa -> Nhà thi đấu Bách Khoa -> Nhà TC
//   - Đông-Nam phố Lê Thanh Nghị: Sân bóng rổ, SVĐ Bách Khoa & KTX A2 – A3
// Module ID: building.sports-complex
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SPORTS_COMPLEX } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';
import {
  makeFootballFieldTexture,
  makeGraniteStoneTexture,
  makeSportsCourtTexture,
  makeSwimmingPoolTexture,
} from '../../../components/three/materials';

function createGoalNetTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.lineWidth = 2.4;
    const step = 16;
    for (let i = 0; i <= 128; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  tex.needsUpdate = true;
  return tex;
}

export function FootballGoalpost({
  x,
  z,
  rotY,
  netTex,
}: {
  x: number;
  z: number;
  rotY: number;
  netTex: THREE.CanvasTexture;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      {/* 2 cột dọc + xà ngang khung thành sơn trắng */}
      {[-2.6, 2.6].map((gx) => (
        <mesh key={`post-${gx}`} position={[gx, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 2.4, 12]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.35} metalness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 2.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 5.32, 12]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.35} metalness={0.25} />
      </mesh>
      {/* Thanh giằng đáy chữ U + 2 thanh chống góc sau */}
      {[-2.6, 2.6].map((gx) => (
        <group key={`support-${gx}`}>
          <mesh position={[gx, 0.04, -0.7]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 1.4, 8]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.45} metalness={0.4} />
          </mesh>
          <mesh position={[gx, 1.2, -0.7]} rotation={[0.53, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 2.74, 8]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.45} metalness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.04, -1.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.032, 0.032, 5.2, 8]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.45} metalness={0.4} />
      </mesh>
      {/* Lưới đan ô trắng bọc mặt sau, nóc và 2 hông */}
      <mesh position={[0, 1.2, -1.4]}>
        <planeGeometry args={[5.2, 2.4]} />
        <meshStandardMaterial map={netTex} transparent alphaTest={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.4, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.2, 1.4]} />
        <meshStandardMaterial map={netTex} transparent alphaTest={0.12} side={THREE.DoubleSide} />
      </mesh>
      {[-2.6, 2.6].map((gx) => (
        <mesh key={`sidenet-${gx}`} position={[gx, 1.2, -0.7]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.4, 2.4]} />
          <meshStandardMaterial map={netTex} transparent alphaTest={0.12} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function StadiumGrandstand({
  position,
  width,
  tiers,
  hasCanopy,
  stonePbr,
}: {
  position: [number, number, number];
  width: number;
  tiers: number;
  hasCanopy: boolean;
  stonePbr: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };
}) {
  const seatStepZ = 0.65;
  const seatStepY = 0.42;
  const seatCount = Math.max(4, Math.floor((width - 1.2) / 0.72));

  return (
    <group position={position}>
      {/* Bậc thềm bê tông giật cấp */}
      {Array.from({ length: tiers }, (_, tIdx) => {
        const h = (tIdx + 1) * seatStepY;
        const zCenter = -tIdx * seatStepZ;
        return (
          <group key={`tier-${tIdx}`}>
            <mesh position={[0, h / 2, zCenter]} castShadow receiveShadow>
              <boxGeometry args={[width, h, seatStepZ]} />
              <meshStandardMaterial
                color="#94A3B8"
                map={stonePbr.map}
                bumpMap={stonePbr.bumpMap}
                bumpScale={0.01}
                roughness={0.86}
              />
            </mesh>
            {/* Dãy ghế khán đài Bách Khoa Đỏ–Trắng xen lối bậc cầu thang giữa */}
            {Array.from({ length: seatCount }, (_, sIdx) => {
              const sx = -width / 2 + 0.6 + ((width - 1.2) * sIdx) / (seatCount - 1);
              if (Math.abs(sx) < 0.48) return null; // chừa lối đi giữa
              const isWhite = (sIdx + tIdx) % 3 === 0;
              return (
                <group key={`seat-${tIdx}-${sIdx}`} position={[sx, h + 0.04, zCenter - 0.02]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.42, 0.08, 0.34]} />
                    <meshStandardMaterial color={isWhite ? '#F1F5F9' : '#B91C1C'} roughness={0.48} />
                  </mesh>
                  <mesh position={[0, 0.14, -0.14]} castShadow>
                    <boxGeometry args={[0.42, 0.24, 0.06]} />
                    <meshStandardMaterial color={isWhite ? '#E2E8F0' : '#991B1B'} roughness={0.48} />
                  </mesh>
                </group>
              );
            })}
            {/* Bậc cầu thang vàng ở trục giữa */}
            <mesh position={[0, h + 0.02, zCenter]} receiveShadow>
              <boxGeometry args={[0.78, 0.04, seatStepZ - 0.08]} />
              <meshStandardMaterial color="#FACC15" roughness={0.78} />
            </mesh>
          </group>
        );
      })}
      {/* Lan can thép bảo vệ phía sau & hai đầu hồi */}
      <mesh position={[0, tiers * seatStepY + 0.45, -(tiers - 1) * seatStepZ - 0.28]}>
        <boxGeometry args={[width, 0.06, 0.06]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.6} roughness={0.35} />
      </mesh>
      {Array.from({ length: 5 }, (_, ri) => {
        const rx = -width / 2 + 0.2 + ((width - 0.4) * ri) / 4;
        return (
          <mesh
            key={`rail-post-${ri}`}
            position={[rx, tiers * seatStepY + 0.22, -(tiers - 1) * seatStepZ - 0.28]}
          >
            <cylinderGeometry args={[0.03, 0.03, 0.48, 8]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.6} roughness={0.35} />
          </mesh>
        );
      })}
      {/* Mái che thép hiện đại cho khán đài chính */}
      {hasCanopy && (
        <group>
          {[-width * 0.4, -width * 0.14, width * 0.14, width * 0.4].map((px, pi) => (
            <mesh
              key={`canopy-col-${pi}`}
              position={[px, tiers * seatStepY + 0.9, -(tiers - 1) * seatStepZ - 0.24]}
              castShadow
            >
              <cylinderGeometry args={[0.06, 0.07, 1.9, 8]} />
              <meshStandardMaterial color="#1E293B" metalness={0.65} roughness={0.4} />
            </mesh>
          ))}
          <mesh
            position={[0, tiers * seatStepY + 1.9, -((tiers - 1) * seatStepZ) / 2 + 0.15]}
            rotation={[-0.12, 0, 0]}
            castShadow
          >
            <boxGeometry args={[width + 0.5, 0.12, tiers * seatStepZ + 1.25]} />
            <meshStandardMaterial color="#1E3A5F" metalness={0.45} roughness={0.48} />
          </mesh>
          {/* Viền đỏ Bách Khoa mặt trước mái che */}
          <mesh
            position={[0, tiers * seatStepY + 2.09, 0.78]}
            castShadow
          >
            <boxGeometry args={[width + 0.5, 0.14, 0.08]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.55} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function StadiumFloodlightTower({
  x,
  z,
  isNight,
}: {
  x: number;
  z: number;
  isNight: boolean;
}) {
  const yaw = Math.atan2(-x, -z);
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      {/* Chân đế bê tông + trụ thép thuôn */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.32, 0.5, 10]} />
        <meshStandardMaterial color="#64748B" roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.9, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 9.2, 10]} />
        <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.65} />
      </mesh>
      {/* Giá đỡ đầu đèn + giàn 12 bóng pha LED hướng nghiêng xuống mặt sân */}
      <group position={[0, 9.5, 0]} rotation={[0.42, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.45, 0.78, 0.16]} />
          <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.6} />
        </mesh>
        {[-0.45, -0.15, 0.15, 0.45].map((bx, cIdx) =>
          [-0.22, 0, 0.22].map((by, rIdx) => (
            <mesh key={`lamp-${cIdx}-${rIdx}`} position={[bx, by, 0.09]}>
              <cylinderGeometry args={[0.075, 0.075, 0.04, 10]} />
              <meshStandardMaterial
                color="#FFFBEB"
                emissive="#FEF08A"
                emissiveIntensity={isNight ? 1.8 : 0.45}
              />
            </mesh>
          )),
        )}
        {isNight && (
          <mesh position={[0, 0, 4.8]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[3.4, 9.6, 16, 1, true]} />
            <meshBasicMaterial
              color="#FEF9C3"
              transparent
              opacity={0.07}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

export function HustSportsAndStadiumComplex({ isNight }: { isNight: boolean }) {
  const {
    poolCenter,
    poolSize,
    stadiumCenter,
    stadiumSize,
    nhaTcCenter,
    nhaTcSize,
    courtCenter,
    courtSize,
    footballFieldCenter,
    footballFieldSize,
    ktxA3Center,
    ktxA3Size,
    ktxA2Center,
    ktxA2Size,
  } = SPORTS_COMPLEX;

  const courtTex = useMemo(() => makeSportsCourtTexture(), []);
  const fieldTex = useMemo(() => makeFootballFieldTexture(), []);
  const poolTex = useMemo(() => makeSwimmingPoolTexture(), []);
  const goalNetTex = useMemo(() => createGoalNetTexture(), []);
  const stonePbr = useMemo(() => makeGraniteStoneTexture(4, 2), []);

  useEffect(
    () => () => {
      courtTex.dispose();
      fieldTex.dispose();
      poolTex.dispose();
      goalNetTex.dispose();
      stonePbr.map.dispose();
      stonePbr.bumpMap.dispose();
    },
    [courtTex, fieldTex, poolTex, goalNetTex, stonePbr],
  );

  return (
    <group>
      {/* 6.1 Bể bơi Bách Khoa (nằm Đông-Bắc Nhà thi đấu dọc phố Lê Thanh Nghị theo https://hustmap.com/) */}
      <group position={[poolCenter.x, 0, poolCenter.z]}>
        {/* Thành bể bơi lát gạch trắng kem */}
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <boxGeometry args={[poolSize.x + 1.4, 0.44, poolSize.z + 1.4]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.75} />
        </mesh>
        {/* Mặt nước bể bơi xanh ngọc có phao phân làn */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.46, 0]}>
          <planeGeometry args={[poolSize.x, poolSize.z]} />
          <meshStandardMaterial map={poolTex} roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Nhà điều hành & cổng vào Bể bơi ở mép Bắc */}
        <mesh position={[0, 1.45, -poolSize.z / 2 - 0.45]} castShadow receiveShadow>
          <boxGeometry args={[6.8, 2.9, 0.7]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.82} />
        </mesh>
        <LabelPlane
          textureKey="bk-swimming-pool-sign"
          canvasW={512}
          canvasH={104}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#0369A1';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#BAE6FD';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 34px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('BỂ BƠI BÁCH KHOA · 游泳池', w / 2, h / 2);
          }}
          size={[4.4, 0.85]}
          position={[0, 2.15, -poolSize.z / 2 - 0.84]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
      </group>

      {/* 6.2 Nhà thi đấu Bách Khoa — Khối nhà thi đấu lớn ở giữa cụm Thể thao */}
      <group position={[stadiumCenter.x, 0, stadiumCenter.z]}>
        <mesh position={[0, 4.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[stadiumSize.x, 8.8, stadiumSize.z]} />
          <meshStandardMaterial color="#EAE6DC" roughness={0.86} />
        </mesh>
        <mesh position={[0, 9.0, 0]} castShadow>
          <boxGeometry args={[stadiumSize.x + 0.6, 0.6, stadiumSize.z + 0.6]} />
          <meshStandardMaterial color="#27496D" roughness={0.65} metalness={0.25} />
        </mesh>
        <LabelPlane
          textureKey="bk-stadium-arena-sign"
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
            ctx.font = '800 36px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('NHÀ THI ĐẤU BÁCH KHOA', w / 2, h * 0.4);
            ctx.fillStyle = '#FFD166';
            ctx.font = '700 24px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('BACH KHOA INDOOR STADIUM · 体育馆', w / 2, h * 0.75);
          }}
          size={[5.6, 1.25]}
          position={[0, 6.4, -stadiumSize.z / 2 - 0.06]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
      </group>

      {/* 6.3 Nhà TC (Trung tâm Giáo dục Thể chất & Thể thao — nằm Tây-Nam Nhà thi đấu theo https://hustmap.com/) */}
      <group position={[nhaTcCenter.x, 0, nhaTcCenter.z]}>
        <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[nhaTcSize.x, 8.0, nhaTcSize.z]} />
          <meshStandardMaterial color="#F0ECE1" roughness={0.86} />
        </mesh>
        <mesh position={[0, 8.22, 0]} castShadow>
          <boxGeometry args={[nhaTcSize.x + 0.5, 0.44, nhaTcSize.z + 0.5]} />
          <meshStandardMaterial color="#2A5C6A" roughness={0.7} metalness={0.2} />
        </mesh>
        <LabelPlane
          textureKey="bk-nha-tc-sign"
          canvasW={512}
          canvasH={120}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#1C5C3A';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFD166';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 36px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('NHÀ TC · GIÁO DỤC THỂ CHẤT', w / 2, h * 0.42);
            ctx.fillStyle = '#FDE047';
            ctx.font = '700 22px "Be Vietnam Pro", Arial, sans-serif';
            ctx.fillText('TRUNG TÂM GDTC & THỂ THAO ĐHBK HÀ NỘI', w / 2, h * 0.76);
          }}
          size={[5.0, 1.1]}
          position={[0, 6.0, -nhaTcSize.z / 2 - 0.06]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
      </group>

      {/* 6.4 Sân bóng rổ ngoài trời phía Bắc Sân vận động Bách Khoa */}
      <group position={[courtCenter.x, 0, courtCenter.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]} receiveShadow>
          <planeGeometry args={[courtSize.x, courtSize.z]} />
          <meshStandardMaterial map={courtTex} roughness={0.82} />
        </mesh>
      </group>

      {/* 6.5 Sân vận động Bách Khoa (SVĐ Bóng đá lớn + Đường chạy điền kinh đỏ + Khán đài) */}
      <group position={[footballFieldCenter.x, 0, footballFieldCenter.z]}>
        {/* Mặt sân vận động (y = 0,020 — người chơi đi bộ/chạy bộ thoải mái trên sân) */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[footballFieldSize.x, footballFieldSize.z]} />
          <meshStandardMaterial map={fieldTex} roughness={0.85} />
        </mesh>
        {/* 2 Khung thành bóng đá lưới trắng dệt ô ở 2 đầu Đông / Tây sân */}
        <FootballGoalpost
          x={-footballFieldSize.x / 2 + 2.6}
          z={0}
          rotY={Math.PI / 2}
          netTex={goalNetTex}
        />
        <FootballGoalpost
          x={footballFieldSize.x / 2 - 2.6}
          z={0}
          rotY={-Math.PI / 2}
          netTex={goalNetTex}
        />
        {/* Hai cụm khán đài giật cấp hai bên lối vào Sân bóng rổ (tránh giao nhau với courtCenter) */}
        <StadiumGrandstand
          position={[-9.2, 0, -footballFieldSize.z / 2 - 0.9]}
          width={9.4}
          tiers={4}
          hasCanopy
          stonePbr={stonePbr}
        />
        <StadiumGrandstand
          position={[11.4, 0, -footballFieldSize.z / 2 - 0.9]}
          width={6.0}
          tiers={3}
          hasCanopy={false}
          stonePbr={stonePbr}
        />
        {/* 4 Cột đèn pha cao áp giàn 12 bóng SVĐ Bách Khoa */}
        {[-15, 15].map((lx) =>
          [-footballFieldSize.z / 2 - 0.8, footballFieldSize.z / 2 + 0.8].map((lz) => (
            <StadiumFloodlightTower
              key={`stadium-flood-${lx}-${lz}`}
              x={lx}
              z={lz}
              isNight={isNight}
            />
          )),
        )}
      </group>

      {/* 6.6 Cụm KTX A3 & KTX A2 phía Đông-Bắc Sân vận động Bách Khoa (chuẩn https://hustmap.com/) */}
      {[
        { code: 'KTX A3', center: ktxA3Center, size: ktxA3Size },
        { code: 'KTX A2', center: ktxA2Center, size: ktxA2Size },
      ].map((dorm) => (
        <group key={dorm.code} position={[dorm.center.x, 0, dorm.center.z]}>
          <mesh position={[0, 5.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[dorm.size.x, 10.8, dorm.size.z]} />
            <meshStandardMaterial color="#E8D8C0" roughness={0.88} />
          </mesh>
          <mesh position={[0, 11.0, 0]} castShadow>
            <boxGeometry args={[dorm.size.x + 0.4, 0.4, dorm.size.z + 0.4]} />
            <meshStandardMaterial color="#8C6D53" roughness={0.82} />
          </mesh>
          {[0, 1, 2].map((fl) =>
            [-4.0, -1.35, 1.35, 4.0].map((wx, idx) => {
              const glow = isNight && (fl + idx) % 2 === 0;
              return (
                <mesh
                  key={`${dorm.code}-win-${fl}-${idx}`}
                  position={[wx, fl * 3.3 + 1.8, -dorm.size.z / 2 - 0.03]}
                  rotation-y={Math.PI}
                >
                  <planeGeometry args={[1.45, 1.15]} />
                  <meshStandardMaterial
                    color={glow ? '#FFE4A0' : '#2C4257'}
                    emissive={glow ? '#FFB84D' : '#000000'}
                    emissiveIntensity={glow ? 0.72 : 0}
                    roughness={0.35}
                  />
                </mesh>
              );
            }),
          )}
          <LabelPlane
            textureKey={`dorm-sign-${dorm.code}`}
            canvasW={384}
            canvasH={96}
            draw={(ctx, w, h) => {
              ctx.fillStyle = '#1E40AF';
              ctx.fillRect(0, 0, w, h);
              ctx.strokeStyle = '#FFD166';
              ctx.lineWidth = 6;
              ctx.strokeRect(6, 6, w - 12, h - 12);
              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '800 40px "Be Vietnam Pro", Arial, sans-serif';
              ctx.fillText(dorm.code, w / 2, h / 2);
            }}
            size={[3.0, 0.78]}
            position={[0, 9.4, -dorm.size.z / 2 - 0.05]}
            rotation={[0, Math.PI, 0]}
            transparent={false}
          />
        </group>
      ))}
    </group>
  );
}
