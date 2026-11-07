// ---------------------------------------------------------------------------
// CampusScene.tsx — scene gốc Bước 2: Canvas + trời/sáng + Ground/Landmarks/Player
// Không dùng drei Text, không tải font/texture ngoài, không dùng <Sky> nặng.
// Bước 5: thêm mode phòng học mô phỏng — khi inClassroom thì render
// <Classroom/> thay cho Ground/Landmarks (+ NPC Minh chỉ ở campus).
// ---------------------------------------------------------------------------

import { Canvas } from '@react-three/fiber';
import Ground from './Ground';
import Landmarks from './Landmarks';
import Player from './Player';
import RemotePlayers from './RemotePlayers';
import Classroom, { type HomeworkState } from './Classroom';
import { MinhNpc } from './Npc';
import BackgroundBuildings from './BackgroundBuildings';
import Motorbike from './Motorbike';

export interface CampusSceneProps {
  inClassroom?: boolean;
  notebookOpen?: boolean;
  homework?: HomeworkState;
  onObjectClick?: (id: string) => void;
}

export default function CampusScene({
  inClassroom = false,
  notebookOpen = false,
  homework = 'desk',
  onObjectClick,
}: CampusSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 55, near: 0.1, far: 600, position: [-70, 10, 26] }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      {/* Trời sáng hơn + sương nhạt, bắt đầu xa hơn (fog 160 → 180 m).
          Đợt sửa lần 2 §4/§8: ánh sáng ban ngày DỊU — giảm bóng đen gắt và
          các mảng nền xám xanh quá tối, giữ tường trắng không cháy sáng.
          Cũ → mới: hemi 1,15 → 1,30 (màu đất #6f7f5a → #8a9a72 sáng hơn,
          nâng mặt khuất nắng); mặt trời 1,75 → 1,60; fill tây 0,55 → 0,70;
          thêm fill nam 0,30 (không bóng) nâng bóng đổ; fog #d7e5ee →
          #dce8ef, 160-520 → 180-520; nền trời #bfd9ea → #cfe0ec.
          Không bloom/DoF/sương dày. */}
      <color attach="background" args={['#cfe0ec']} />
      <fog attach="fog" args={['#dce8ef', 180, 520]} />

      <hemisphereLight args={['#dceefb', '#8a9a72', 1.3]} />
      <directionalLight
        position={[80, 100, 40]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
      {/* Đèn fill từ phía tây (không bóng): mặt tây các nhà khuất nắng chính
          nên đọc xám tối — fill 0,55 → 0,70 nâng mặt khuất nắng lên mà không
          cháy mặt nắng. */}
      <directionalLight position={[-60, 40, -20]} intensity={0.7} />
      {/* Fill nam ấm nhẹ (không bóng): nâng vùng bóng đổ của mặt trời chính
          ở phía nam các khối nhà, giảm mảng tối gắt dưới tán cây/tường. */}
      <directionalLight position={[10, 30, 90]} intensity={0.3} color="#fff2df" />
      {/* Đợt 3 giai đoạn 2 — fill BẮC (không bóng, 0,5): sau khi xoay thư viện
          180°, mặt đồng hồ + sảnh chính quay về phía bắc của scene (−Z) và
          không còn nhận nắng trực tiếp từ mặt trời chính (đông-nam). Trước
          khi thêm đèn này, tường trắng mặt bắc chỉ đạt lum ~137 (đo trên
          ảnh r3-lib-clock-closeup.png) so với ~187 khi mặt còn hướng nam —
          mặt đồng hồ đọc xám thay vì trắng. Fill bắc đưa mặt mới về gần
          mức sáng cũ mà không cháy mặt nắng. */}
      <directionalLight position={[0, 40, -90]} intensity={0.5} />

      {inClassroom ? (
        <Classroom
          notebookOpen={notebookOpen}
          homework={homework}
          onObjectClick={onObjectClick ?? (() => undefined)}
        />
      ) : (
        <>
          <Ground />
          <Landmarks />
          {/* Khối nhà phụ + cây nền + ghế/đèn rìa campus (đợt sửa lần 2 §4).
              Đã gắn ở đây — luồng tích hợp KHÔNG gắn lần 2. */}
          <BackgroundBuildings />
          {/* NPC bạn đồng hành Minh đứng gần cổng Parabol, gần spawn. */}
          <MinhNpc />
          {/* Xe máy cá nhân (đợt 3 giai đoạn 4) — chỉ ngoài sân, không vào phòng học. */}
          <Motorbike />
          {/* Người chơi khác (đợt 5 multiplayer) — chỉ ngoài sân. */}
          <RemotePlayers />
        </>
      )}
      <Player />
    </Canvas>
  );
}
