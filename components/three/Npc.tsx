// ---------------------------------------------------------------------------
// Npc.tsx — NPC bạn đồng hành "Minh" + giáo viên trong phòng học.
// DỰNG LẠI lần 2 (06/11, brief §5–§7): dùng chung HumanFigure với người chơi
// (components/three/StudentAvatar.tsx) nên cùng tỉ lệ 1,7 m, vai dốc, khớp
// khuỷu/gối riêng; chỉ khác variant/màu/phụ kiện — không còn 2 bộ hình học
// lệch nhau như trước.
//
//   Minh — hoodie XANH NAVY + mũ lưỡi trai đỏ + quần kaki + ba lô xám
//     (khác hẳn người chơi polo đỏ + ba lô đen, không mũ).
//   Cô giáo — sơ mi trắng (cổ bẻ + 4 khuy + túi ngực + bút + thắt lưng),
//     quần tối, giày da tối, tóc búi + trâm, kính gọng tròn.
// Tư thế tĩnh: tay hơi gập khuỷu, không song song cứng; thở nhẹ qua bodyRef.
// Interface KHÔNG đổi: MinhNpc / TeacherNpc giữ nguyên props
// { position, rotationY } như CampusScene.tsx và Classroom.tsx đang dùng.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { HumanFigure, type FigureJoints } from './StudentAvatar';

function useNameTexture(name: string): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const r = 16;
      ctx.beginPath();
      ctx.roundRect(4, 4, 248, 56, r);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 128, 34);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [name]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useFigureJoints(): FigureJoints {
  return {
    body: useRef<THREE.Group>(null!),
    armL: useRef<THREE.Group>(null!),
    armR: useRef<THREE.Group>(null!),
    elbowL: useRef<THREE.Group>(null!),
    elbowR: useRef<THREE.Group>(null!),
    legL: useRef<THREE.Group>(null!),
    legR: useRef<THREE.Group>(null!),
    kneeL: useRef<THREE.Group>(null!),
    kneeR: useRef<THREE.Group>(null!),
    footL: useRef<THREE.Group>(null!),
    footR: useRef<THREE.Group>(null!),
  };
}

function LayeredFigure({
  children,
}: {
  children: (joints: FigureJoints) => React.ReactNode;
}) {
  const joints = useFigureJoints();
  // Tư thế nghỉ: tay hơi gập khuỷu, hai tay không song song cứng
  // (trái hơi đưa trước, phải hơi ngửa sau); gối gần thẳng.
  // Quy ước rotation.x (đợt 3 giai đoạn 1, mặt trước +Z): khuỷu gập đúng
  // là ÂM (cẳng tay về trước), gối gập đúng là DƯƠNG (cẳng chân về sau).
  useEffect(() => {
    if (joints.armL.current) joints.armL.current.rotation.x = 0.09;
    if (joints.armR.current) joints.armR.current.rotation.x = -0.05;
    if (joints.elbowL.current) joints.elbowL.current.rotation.x = -0.3;
    if (joints.elbowR.current) joints.elbowR.current.rotation.x = -0.42;
    if (joints.kneeL.current) joints.kneeL.current.rotation.x = 0.05;
    if (joints.kneeR.current) joints.kneeR.current.rotation.x = 0.05;
  }, [joints]);
  // Thở nhẹ + chuyển trọng lượng nhẹ: thân phập phồng, nghiêng rất nhẹ.
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (joints.body.current) {
      joints.body.current.scale.y = 1 + Math.sin(t * 1.4) * 0.008;
      joints.body.current.rotation.z = Math.sin(t * 0.9) * 0.012;
    }
  });
  return (
    <group>
      {children(joints)}
    </group>
  );
}

/**
 * Biển tên nổi trên đầu NPC — PHẢI đứng ngoài nhóm xoay của figure.
 * (Đợt 3 tích hợp: Billboard cũ nằm trong LayeredFigure, mà MinhNpc bọc
 * figure trong group rotationY = π/2; Billboard của drei chỉ đặt quaternion
 * cục bộ theo camera nên world orientation lệch theo rotation của cha —
 * từ nhiều góc camera thấy mặt sau của plane, chữ đọc ngược "dniM".
 * Đặt Billboard ở nhóm ngoài (chỉ position, không rotation) thì world
 * orientation đúng bằng camera, chữ luôn đọc xuôi, kể cả nhìn từ sau lưng.)
 */
function NameLabel({ name, y = 1.95 }: { name: string; y?: number }) {
  const nameTex = useNameTexture(name);
  return (
    <Billboard position={[0, y, 0]}>
      <mesh>
        <planeGeometry args={[0.7, 0.175]} />
        <meshStandardMaterial map={nameTex} transparent roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  );
}

/** NPC bạn đồng hành "Minh" — hoodie xanh navy + mũ lưỡi trai đỏ + quần kaki
 *  + ba lô xám. Khác hẳn người chơi (polo đỏ Bách khoa, ba lô đen, không
 *  mũ) để không đọc thành bản sao từ sau hay từ xa. */
export function MinhNpc({ position = [-72, 8] as [number, number], rotationY = Math.PI / 2 }: {
  position?: [number, number];
  rotationY?: number;
}) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <group rotation={[0, rotationY, 0]}>
        <LayeredFigure>
          {(joints) => (
            <HumanFigure
              variant="hoodie"
              shirt="#1F3A5F"
              shirtDark="#152A45"
              pants="#8A7B5C"
              shoe="#33383D"
              shoeSole="#1A1A1A"
              hairStyle="swept"
              backpack
              backpackColors={{ pack: '#5A5A52', packLight: '#6E6E66', packZip: '#3A3A36' }}
              cap="#D22630"
              joints={joints}
            />
          )}
        </LayeredFigure>
      </group>
      <NameLabel name="Minh" />
    </group>
  );
}

/** NPC giáo viên trong phòng học — sơ mi trắng, thắt lưng, giày da, tóc búi, kính. */
export function TeacherNpc({ position = [2.2, -2] as [number, number], rotationY = 0 }: {
  position?: [number, number];
  rotationY?: number;
}) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <group rotation={[0, rotationY, 0]}>
        <LayeredFigure>
          {(joints) => (
            <HumanFigure
              variant="shirt"
              shirt="#F5F5F0"
              shirtDark="#D8D5CC"
              pants="#2E2E33"
              shoe="#2A2320"
              shoeSole="#14100D"
              hairStyle="bun"
              glasses
              joints={joints}
            />
          )}
        </LayeredFigure>
      </group>
      <NameLabel name="Cô giáo" y={1.84} />
    </group>
  );
}

export default MinhNpc;
