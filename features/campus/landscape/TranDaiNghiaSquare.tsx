// ---------------------------------------------------------------------------
// features/campus/landscape/TranDaiNghiaSquare.tsx — Cổng Trần Đại Nghĩa (B8),
// Biển đồng vàng & Cụm tượng đài "Xếp bút nghiên"
// Module ID: landscape.tran-dai-nghia-square
// ---------------------------------------------------------------------------

import { MONUMENT, TRAN_DAI_NGHIA_GATE } from '../world-data';
import {
  LabelPlane,
  drawMonument,
  drawTdnSign,
} from '../../../components/three/TextPlate';

const GATE_WHITE = '#F2EFE6';
const BRONZE = '#C9A227';
const MARBLE = '#F5F5F3';

export function TranDaiNghiaSquare() {
  const { x, z } = TRAN_DAI_NGHIA_GATE.center; // (92, −6)
  return (
    <group>
      {/* Cổng Trần Đại Nghĩa: 2 trụ + xà ngang. */}
      <mesh position={[x, 2.5, z - 3.5]} castShadow>
        <boxGeometry args={[1.2, 5, 1.2]} />
        <meshStandardMaterial color={GATE_WHITE} roughness={0.9} />
      </mesh>
      <mesh position={[x, 2.5, z + 3.5]} castShadow>
        <boxGeometry args={[1.2, 5, 1.2]} />
        <meshStandardMaterial color={GATE_WHITE} roughness={0.9} />
      </mesh>
      <mesh position={[x, 5.5, z]} castShadow>
        <boxGeometry args={[1.2, 1, 8.2]} />
        <meshStandardMaterial color={GATE_WHITE} roughness={0.9} />
      </mesh>
      <LabelPlane
        textureKey="tdn-gate-arch-sign"
        canvasW={1024}
        canvasH={192}
        draw={(ctx, w, h) => {
          ctx.fillStyle = '#A81C24';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#FFD166';
          ctx.lineWidth = 7;
          ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 30px Arial, sans-serif';
          ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI · CỔNG TRẦN ĐẠI NGHĨA (B8)', w / 2, h / 2);
        }}
        size={[7.4, 0.82]}
        position={[x - 0.63, 5.5, z]}
        rotation={[0, -Math.PI / 2, 0]}
        transparent={false}
      />

      {/* Biển đồng vàng nghiêng, mặt hướng về phía tây (hướng người đi tới).
          Tấm biển mỏng theo trục X, ngửa ra sau (đỉnh nghiêng về phía đông). */}
      <group position={[MONUMENT.sign.x, 0, MONUMENT.sign.z]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 1.0, 0.3]} />
          <meshStandardMaterial color="#F5F5F3" roughness={0.9} />
        </mesh>
        <group position={[0, 1.35, 0]} rotation-z={-0.5}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 1.7, 3.4]} />
            <meshStandardMaterial color={BRONZE} roughness={0.35} metalness={0.5} />
          </mesh>
          <LabelPlane
            textureKey="tdn-sign"
            canvasW={1024}
            canvasH={512}
            draw={drawTdnSign}
            size={[3.2, 1.6]}
            position={[-0.08, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          />
        </group>
      </group>

      {/* Bia tượng đài "Xếp bút nghiên" trước Hội trường C2: bia cẩm thạch trắng +
          chữ khắc đỏ + cụm điêu khắc Trang sách mở & Mũ cối cẩm thạch trắng + đôi bình gốm. */}
      <group position={[MONUMENT.center.x, 0, MONUMENT.center.z]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.4, 3.2]} />
          <meshStandardMaterial color={MARBLE} roughness={0.75} />
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[0.5, 3, 2.2]} />
          <meshStandardMaterial color={MARBLE} roughness={0.75} />
        </mesh>
        {/* Tấm nghiêng thấp hơn, tựa vào chân bia. */}
        <mesh position={[-0.75, 0.65, 0]} rotation-z={0.45} castShadow>
          <boxGeometry args={[0.25, 1.4, 1.6]} />
          <meshStandardMaterial color={MARBLE} roughness={0.75} />
        </mesh>
        {/* Trang sách mở cẩm thạch trắng đặt trên bệ trước bia */}
        <group position={[-0.55, 0.92, 0]} rotation={[0, 0, 0.35]}>
          <mesh position={[0, 0, -0.36]} rotation={[0.18, 0, 0]} castShadow>
            <boxGeometry args={[0.55, 0.08, 0.68]} />
            <meshStandardMaterial color="#FAF9F5" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0, 0.36]} rotation={[-0.18, 0, 0]} castShadow>
            <boxGeometry args={[0.55, 0.08, 0.68]} />
            <meshStandardMaterial color="#FAF9F5" roughness={0.65} />
          </mesh>
          {/* Chiếc mũ cối sinh viên đặt trên trang sách mở */}
          <group position={[-0.04, 0.14, 0.12]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.05, 20]} />
              <meshStandardMaterial color="#F2EFE9" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.04, 0]} scale={[1, 0.68, 1]} castShadow>
              <sphereGeometry args={[0.2, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#F7F5F0" roughness={0.6} />
            </mesh>
          </group>
        </group>
        {/* Đôi bình hoa gốm sứ xanh trắng đặt đối xứng hai bên chân bia */}
        {[-1.25, 1.25].map((vz) => (
          <group key={`vase-${vz}`} position={[-0.45, 0.4, vz]}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.11, 0.44, 16]} />
              <meshStandardMaterial color="#EBF2FA" roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.46, 0]}>
              <cylinderGeometry args={[0.16, 0.12, 0.06, 16]} />
              <meshStandardMaterial color="#2B5B84" roughness={0.4} />
            </mesh>
          </group>
        ))}
        <LabelPlane
          textureKey="monument"
          canvasW={512}
          canvasH={768}
          draw={drawMonument}
          size={[1.8, 2.6]}
          position={[-0.28, 1.9, 0]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      </group>
    </group>
  );
}
