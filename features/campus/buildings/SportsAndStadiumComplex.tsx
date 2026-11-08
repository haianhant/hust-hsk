// ---------------------------------------------------------------------------
// features/campus/buildings/SportsAndStadiumComplex.tsx — Khu Thể chất
// (Nhà thi đấu TC, Bể bơi, Sân bóng rổ, Khán đài & SVĐ Bóng đá, KTX Lào)
// Module ID: building.sports-complex
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import { SPORTS_COMPLEX } from '../world-data';
import { LabelPlane } from '../../../components/three/TextPlate';
import {
  makeFootballFieldTexture,
  makeSportsCourtTexture,
  makeSwimmingPoolTexture,
} from '../../../components/three/materials';

export function FootballGoalpost({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      {/* 2 cột dọc + xà ngang khung thành sơn trắng */}
      {[-2.6, 2.6].map((gx) => (
        <mesh key={`post-${gx}`} position={[gx, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 2.4, 10]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 5.32, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Khung lưới phía sau khung thành */}
      <mesh position={[0, 1.2, -0.75]}>
        <boxGeometry args={[5.2, 2.35, 1.4]} />
        <meshStandardMaterial color="#F8FAFC" wireframe transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

export function HustSportsAndStadiumComplex({ isNight }: { isNight: boolean }) {
  const {
    stadiumCenter,
    stadiumSize,
    poolCenter,
    poolSize,
    courtCenter,
    courtSize,
    footballFieldCenter,
    footballFieldSize,
    ktxLaoCenter,
    ktxLaoSize,
  } = SPORTS_COMPLEX;

  const courtTex = useMemo(() => makeSportsCourtTexture(), []);
  const fieldTex = useMemo(() => makeFootballFieldTexture(), []);
  const poolTex = useMemo(() => makeSwimmingPoolTexture(), []);

  useEffect(
    () => () => {
      courtTex.dispose();
      fieldTex.dispose();
      poolTex.dispose();
    },
    [courtTex, fieldTex, poolTex],
  );

  return (
    <group>
      {/* 6.1 Nhà thi đấu Bách Khoa (TC) — Khối vuông mái xanh đậm như trên bản đồ */}
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
          textureKey="bk-tc-stadium-sign"
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
            ctx.fillText('NHÀ THI ĐẤU BÁCH KHOA (TC)', w / 2, h * 0.4);
            ctx.fillStyle = '#FFD166';
            ctx.font = '700 24px Arial, sans-serif';
            ctx.fillText('TRUNG TÂM GIÁO DỤC THỂ CHẤT & THỂ THAO · 体育馆', w / 2, h * 0.75);
          }}
          size={[5.6, 1.25]}
          position={[0, 6.4, -stadiumSize.z / 2 - 0.06]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
      </group>

      {/* 6.2 Bể bơi Bách Khoa (màu xanh ngọc lam có phao phân làn) */}
      <group position={[poolCenter.x, 0, poolCenter.z]}>
        {/* Thành bể bơi lát gạch trắng kem */}
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <boxGeometry args={[poolSize.x + 1.4, 0.44, poolSize.z + 1.4]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.75} />
        </mesh>
        {/* Mặt nước bể bơi */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.46, 0]}>
          <planeGeometry args={[poolSize.x, poolSize.z]} />
          <meshStandardMaterial map={poolTex} roughness={0.2} metalness={0.1} />
        </mesh>
      </group>

      {/* 6.3 Sân bóng rổ / thể chất ngoài trời giữa Nhà thi đấu TC và Bể bơi */}
      <group position={[courtCenter.x, 0, courtCenter.z]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]} receiveShadow>
          <planeGeometry args={[courtSize.x, courtSize.z]} />
          <meshStandardMaterial map={courtTex} roughness={0.82} />
        </mesh>
      </group>

      {/* 6.4 Sân vận động Bách Khoa (SVĐ Bóng đá lớn + Đường chạy điền kinh đỏ + Khán đài) */}
      <group position={[footballFieldCenter.x, 0, footballFieldCenter.z]}>
        {/* Mặt sân vận động (y = 0,020 — người chơi đi bộ/chạy bộ thoải mái trên sân) */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[footballFieldSize.x, footballFieldSize.z]} />
          <meshStandardMaterial map={fieldTex} roughness={0.85} />
        </mesh>
        {/* 2 Khung thành bóng đá ở 2 đầu Đông / Tây sân */}
        <FootballGoalpost x={-footballFieldSize.x / 2 + 2.6} z={0} rotY={Math.PI / 2} />
        <FootballGoalpost x={footballFieldSize.x / 2 - 2.6} z={0} rotY={-Math.PI / 2} />
        {/* Khán đài đỏ dọc rìa Bắc sân vận động (sát đường Lê Thanh Nghị như trên bản đồ) */}
        <mesh position={[0, 0.65, -footballFieldSize.z / 2 - 1.4]} castShadow receiveShadow>
          <boxGeometry args={[24, 1.3, 2.2]} />
          <meshStandardMaterial color="#B83B32" roughness={0.82} />
        </mesh>
        <mesh position={[0, 1.45, -footballFieldSize.z / 2 - 2.2]} castShadow receiveShadow>
          <boxGeometry args={[24, 1.8, 1.4]} />
          <meshStandardMaterial color="#9E2A22" roughness={0.82} />
        </mesh>
        {/* 4 Cột đèn pha cao áp SVĐ Bách Khoa */}
        {[-15, 15].map((lx) =>
          [-footballFieldSize.z / 2 - 0.8, footballFieldSize.z / 2 + 0.8].map((lz) => (
            <group key={`stadium-flood-${lx}-${lz}`} position={[lx, 0, lz]}>
              <mesh position={[0, 4.5, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.12, 9.0, 8]} />
                <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.6} />
              </mesh>
              <mesh position={[0, 9.1, 0]}>
                <boxGeometry args={[0.9, 0.4, 0.4]} />
                <meshStandardMaterial
                  color="#FFFBEB"
                  emissive="#FFE599"
                  emissiveIntensity={isNight ? 1.2 : 0.45}
                />
              </mesh>
            </group>
          )),
        )}
      </group>

      {/* 6.5 KTX Lào (nằm phía Đông Bắc SVĐ Bách Khoa theo đúng khuon-vien-truong.png) */}
      <group position={[ktxLaoCenter.x, 0, ktxLaoCenter.z]}>
        <mesh position={[0, 5.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[ktxLaoSize.x, 10.8, ktxLaoSize.z]} />
          <meshStandardMaterial color="#E8D8C0" roughness={0.88} />
        </mesh>
        <mesh position={[0, 11.0, 0]} castShadow>
          <boxGeometry args={[ktxLaoSize.x + 0.4, 0.4, ktxLaoSize.z + 0.4]} />
          <meshStandardMaterial color="#8C6D53" roughness={0.82} />
        </mesh>
        <LabelPlane
          textureKey="ktx-lao-sign"
          canvasW={384}
          canvasH={96}
          draw={(ctx, w, h) => {
            ctx.fillStyle = '#8C4A27';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#FFD166';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '900 40px Arial, sans-serif';
            ctx.fillText('KÝ TÚC XÁ LÀO', w / 2, h / 2);
          }}
          size={[3.4, 0.85]}
          position={[0, 9.4, -ktxLaoSize.z / 2 - 0.05]}
          rotation={[0, Math.PI, 0]}
          transparent={false}
        />
      </group>
    </group>
  );
}
