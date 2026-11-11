// ---------------------------------------------------------------------------
// Classroom.tsx — PHÒNG HỌC MÔ PHỎNG trong cùng Canvas R3F (Bước 5).
// Phòng 9 × 6 m, tọa độ cục bộ (gốc giữa phòng, bắc = -Z). Sàn gỗ, tường
// trắng, bảng đen lớn tường bắc (chữ canvas texture, đọc rõ), 3 bàn học +
// ghế đúng tỉ lệ avatar 1,7 m (mặt bàn ~0,75 m, mặt ghế ~0,45 m), vở 笔记
// trên bàn 1 (mở được: nắp vở xoay mở), tập 作业 trên bàn 1 (bay lên tay
// rồi bay tới tay giáo viên), kệ sách + đồng hồ + cửa sổ làm vật gây nhiễu
// cho bước chọn bảng, NPC giáo viên cạnh bảng.
// GHI RÕ trong phòng: "Phòng học mô phỏng phục vụ học tập — chưa có tư liệu
// nội thất thật." Phòng KHÔNG nối vật lý với nhà C1: vào/ra bằng fade +
// chuyển mode (playerState.inClassroom).
// Bấm vật 3D (raycast onClick) → onObjectClick(id); panel DOM là dự phòng
// cho mobile.
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CLASSROOM } from '../../lib/campus';
import { LabelPlane } from './TextPlate';
import { TeacherNpc } from './Npc';

export type HomeworkState = 'desk' | 'hand' | 'teacher';

export interface ClassroomProps {
  notebookOpen: boolean;
  homework: HomeworkState;
  onObjectClick: (id: string) => void;
}

const WALL = '#F4F3EF';
const FLOOR = '#B98A5A';
const FLOOR_DARK = '#9C7448';
const BOARD_GREEN = '#2F3B33';
const DESK_WOOD = '#8A6B48';
const CHAIR_WOOD = '#6E5638';

function drawBoard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = BOARD_GREEN;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#F5F5F0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 120px Arial, sans-serif';
  ctx.fillText('数学课', w / 2, h * 0.3);
  ctx.font = '700 56px Arial, sans-serif';
  ctx.fillText('数学 shùxué · 黑板 hēibǎn', w / 2, h * 0.52);
  ctx.font = '700 52px Arial, sans-serif';
  ctx.fillText('笔记 bǐjì · 作业 zuòyè', w / 2, h * 0.74);
}

function drawRoomSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F2E8D5';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8A6B48';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = '#7F1D1D';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 32px "Be Vietnam Pro", Arial, sans-serif';
  ctx.fillText('GIẢNG ĐƯỜNG HÁN NGỮ HSK · TÒA NHÀ C7', w / 2, h * 0.34);
  ctx.fillStyle = '#3A2E12';
  ctx.font = '600 26px "Be Vietnam Pro", Arial, sans-serif';
  ctx.fillText('Đại học Bách Khoa Hà Nội — Học HSK theo từng bài', w / 2, h * 0.72);
}

function Desk({ x, z, id, onObjectClick }: { x: number; z: number; id: string; onObjectClick: (id: string) => void }) {
  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onObjectClick(id);
  };
  const hover = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const leave = () => {
    document.body.style.cursor = 'auto';
  };
  return (
    <group position={[x, 0, z]}>
      {/* Mặt bàn 1,2 × 0,6 m, cao 0,75 m (đúng tỉ lệ avatar 1,7 m). */}
      <mesh position={[0, 0.75, 0]} onClick={click} onPointerOver={hover} onPointerOut={leave}>
        <boxGeometry args={[1.2, 0.05, 0.6]} />
        <meshStandardMaterial color={DESK_WOOD} roughness={0.8} />
      </mesh>
      {[[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]].map(([lx, lz]) => (
        <mesh key={`${lx},${lz}`} position={[lx, 0.375, lz]}>
          <boxGeometry args={[0.05, 0.75, 0.05]} />
          <meshStandardMaterial color={CHAIR_WOOD} roughness={0.85} />
        </mesh>
      ))}
      {/* Ghế phía nam bàn (học sinh ngồi quay mặt về bảng bắc): mặt ghế 0,45 m. */}
      <group position={[0, 0, 0.55]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.42, 0.05, 0.42]} />
          <meshStandardMaterial color={CHAIR_WOOD} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.72, 0.2]}>
          <boxGeometry args={[0.42, 0.55, 0.05]} />
          <meshStandardMaterial color={CHAIR_WOOD} roughness={0.85} />
        </mesh>
        {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([lx, lz]) => (
          <mesh key={`${lx},${lz}`} position={[lx, 0.225, lz]}>
            <boxGeometry args={[0.04, 0.45, 0.04]} />
            <meshStandardMaterial color={CHAIR_WOOD} roughness={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function Classroom({ notebookOpen, homework, onObjectClick }: ClassroomProps) {
  const coverRef = useRef<THREE.Group>(null!);
  const homeworkRef = useRef<THREE.Group>(null!);

  // Animation vở + bài tập: nội suy mỗi frame về trạng thái đích.
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const k = Math.min(1, delta * 6);
    if (coverRef.current) {
      const target = notebookOpen ? -2.1 : 0;
      coverRef.current.rotation.x += (target - coverRef.current.rotation.x) * k;
    }
    if (homeworkRef.current) {
      const targets: Record<HomeworkState, [number, number, number]> = {
        desk: [CLASSROOM.homework.x, 0.8, CLASSROOM.homework.z],
        hand: [-1.4, 1.1, 1.5], // bay lên tay người chơi (đứng phía nam bàn 1)
        teacher: [CLASSROOM.npc.x, 1.25, CLASSROOM.npc.z + 0.45], // bay tới tay giáo viên
      };
      const t = targets[homework];
      const p = homeworkRef.current.position;
      p.x += (t[0] - p.x) * k;
      p.y += (t[1] - p.y) * k;
      p.z += (t[2] - p.z) * k;
    }
  });

  const clickObj = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onObjectClick(id);
  };
  const hover = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const leave = () => {
    document.body.style.cursor = 'auto';
  };

  return (
    <group>
      {/* Sàn gỗ 9 × 6 m. */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[9, 0.1, 6]} />
        <meshStandardMaterial color={FLOOR} roughness={0.85} />
      </mesh>
      {/* Trần phòng học 9,2 × 6,2 m + dải đèn tuýp âm trần chiếu sáng lớp học (không castShadow để giữ sáng đều). */}
      <mesh position={[0, 3.06, 0]}>
        <boxGeometry args={[9.2, 0.12, 6.2]} />
        <meshStandardMaterial color="#FAF8F2" roughness={0.88} />
      </mesh>
      {[-2.4, 0, 2.4].map((lx) => (
        <mesh key={`classroom-ceil-light-${lx}`} position={[lx, 2.99, 0]}>
          <boxGeometry args={[0.36, 0.02, 3.8]} />
          <meshStandardMaterial color="#FFFDF7" emissive="#FFE8B0" emissiveIntensity={0.9} />
        </mesh>
      ))}
      <pointLight position={[0, 2.85, 0]} color="#FFF9E6" intensity={0.65} distance={14} />
      {/* Vân sàn (dải gỗ sẫm, chống phẳng lì). */}
      {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((z) => (
        <mesh key={z} position={[0, 0.002, z]}>
          <boxGeometry args={[9, 0.004, 0.06]} />
          <meshStandardMaterial color={FLOOR_DARK} roughness={0.9} />
        </mesh>
      ))}
      {/* Tường bắc (có bảng) + tường đông/tây. */}
      <mesh position={[0, 1.5, -3.05]}>
        <boxGeometry args={[9.2, 3, 0.2]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[-4.55, 1.5, 0]}>
        <boxGeometry args={[0.2, 3, 6.2]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[4.55, 1.5, 0]}>
        <boxGeometry args={[0.2, 3, 6.2]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      {/* Tường nam: hai đoạn + lanh-tô trên cửa (cửa rộng 1,2 m ở giữa). */}
      <mesh position={[-2.55, 1.5, 3.05]}>
        <boxGeometry args={[4.1, 3, 0.2]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[2.55, 1.5, 3.05]}>
        <boxGeometry args={[4.1, 3, 0.2]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.6, 3.05]}>
        <boxGeometry args={[1.2, 0.8, 0.2]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      {/* Cánh cửa mở hé (gỗ). */}
      <mesh position={[0.55, 1.1, 2.85]} rotation={[0, 0.7, 0]}>
        <boxGeometry args={[1.1, 2.2, 0.06]} />
        <meshStandardMaterial color="#7A5C38" roughness={0.8} />
      </mesh>

      {/* Bảng đen lớn tường bắc: 3,4 × 1,2 m, chữ phấn đọc rõ. */}
      <mesh position={[0, 1.6, -2.93]} onClick={clickObj('board')} onPointerOver={hover} onPointerOut={leave}>
        <boxGeometry args={[3.6, 1.4, 0.08]} />
        <meshStandardMaterial color="#3A3A3A" roughness={0.8} />
      </mesh>
      <LabelPlane
        textureKey="classroom-board"
        canvasW={1024}
        canvasH={384}
        draw={drawBoard}
        size={[3.4, 1.28]}
        position={[0, 1.6, -2.88]}
      />
      {/* Khay phấn dưới bảng (bấm bảng cũng tính là bấm bảng đen). */}
      <mesh position={[0, 0.92, -2.85]} onClick={clickObj('board')} onPointerOver={hover} onPointerOut={leave}>
        <boxGeometry args={[3.4, 0.05, 0.12]} />
        <meshStandardMaterial color="#8A6B48" roughness={0.8} />
      </mesh>

      {/* Biển ghi rõ phòng mô phỏng (tường nam, trong phòng). */}
      <LabelPlane
        textureKey="classroom-sign"
        canvasW={1024}
        canvasH={128}
        draw={drawRoomSign}
        size={[2.6, 0.325]}
        position={[-2.9, 1.7, 2.93]}
        rotation={[0, Math.PI, 0]}
        transparent={false}
      />

      {/* Cửa sổ tường đông (vật gây nhiễu bước chọn bảng). */}
      <group position={[4.44, 1.6, -0.8]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh onClick={clickObj('window')} onPointerOver={hover} onPointerOut={leave}>
          <boxGeometry args={[1.4, 1.5, 0.06]} />
          <meshStandardMaterial color="#BFE3F0" roughness={0.3} emissive="#9FC8DC" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[1.5, 0.08, 0.04]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.08, 1.6, 0.04]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
        </mesh>
      </group>

      {/* Đồng hồ tường nam (vật gây nhiễu). */}
      <group position={[-3, 2.2, 2.93]} rotation={[0, Math.PI, 0]}>
        <mesh onClick={clickObj('clock')} onPointerOver={hover} onPointerOut={leave}>
          <cylinderGeometry args={[0.32, 0.32, 0.05, 24]} />
          <meshStandardMaterial color="#F8F8F8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.08, 0.04]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.03, 0.2, 0.01]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.5} />
        </mesh>
        <mesh position={[0.06, 0, 0.04]} rotation={[0, 0, -1.9]}>
          <boxGeometry args={[0.03, 0.28, 0.01]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.5} />
        </mesh>
      </group>

      {/* Kệ sách tường tây (vật gây nhiễu) + sách màu. */}
      <group position={[-4.35, 0, 0.8]} onClick={clickObj('shelf')} onPointerOver={hover} onPointerOut={leave}>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[0.4, 2.2, 1.8]} />
          <meshStandardMaterial color="#7A5C38" roughness={0.85} />
        </mesh>
        {['#A54432', '#2E7D32', '#1F5C8A', '#C9A227', '#6A4C93'].map((c, i) => (
          <mesh key={c} position={[0.05, 0.55 + Math.floor(i / 3) * 0.6, -0.6 + (i % 3) * 0.5]}>
            <boxGeometry args={[0.28, 0.4, 0.12]} />
            <meshStandardMaterial color={c} roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* 3 bàn học + ghế. */}
      {CLASSROOM.desks.map((d, i) => (
        <Desk key={i} x={d.x} z={d.z} id="desk" onObjectClick={onObjectClick} />
      ))}

      {/* Vở 笔记 trên bàn 1: trang + nắp xoay mở (bản lề ở mép bắc). */}
      <group position={[CLASSROOM.notebook.x - 0.25, 0.79, CLASSROOM.notebook.z - 0.05]}>
        <mesh onClick={clickObj('notebook')} onPointerOver={hover} onPointerOut={leave}>
          <boxGeometry args={[0.3, 0.015, 0.22]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
        </mesh>
        {/* Dòng chữ gợi ý trên trang vở. */}
        <mesh position={[0, 0.009, 0]}>
          <boxGeometry args={[0.24, 0.004, 0.02]} />
          <meshStandardMaterial color="#1F5C8A" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.009, 0.05]}>
          <boxGeometry args={[0.18, 0.004, 0.02]} />
          <meshStandardMaterial color="#1F5C8A" roughness={0.8} />
        </mesh>
        <group ref={coverRef} position={[0, 0.012, -0.11]}>
          <mesh position={[0, 0.004, 0.11]} onClick={clickObj('notebook')} onPointerOver={hover} onPointerOut={leave}>
            <boxGeometry args={[0.3, 0.008, 0.22]} />
            <meshStandardMaterial color="#A54432" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Tập 作业 trên bàn 1: bay lên tay rồi bay tới tay giáo viên. */}
      <group ref={homeworkRef} position={[CLASSROOM.homework.x + 0.25, 0.8, CLASSROOM.homework.z]}>
        <mesh onClick={clickObj('homework')} onPointerOver={hover} onPointerOut={leave}>
          <boxGeometry args={[0.28, 0.03, 0.2]} />
          <meshStandardMaterial color="#FFF8E6" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.018, 0]}>
          <boxGeometry args={[0.2, 0.004, 0.02]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
        </mesh>
      </group>

      {/* Giáo viên đứng cạnh bảng. */}
      <TeacherNpc position={[CLASSROOM.npc.x, CLASSROOM.npc.z]} rotationY={0} />
    </group>
  );
}
