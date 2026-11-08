// ---------------------------------------------------------------------------
// RemotePlayers.tsx — Vẽ người chơi khác trong trường (đợt 5 multiplayer).
// - Mỗi người chơi khác là một HumanFigure (tái dùng StudentAvatar) với
//   variant polo, màu áo do server hash từ sessionId (KHÔNG có đỏ HUST —
//   người chơi chính luôn mặc polo đỏ nên phân biệt ngay).
// - Bảng tên Billboard trên đầu ghi "Tên (MSSV)". Billboard PHẢI đứng
//   ngoài nhóm xoay của figure (như Npc.tsx) — không thì chữ đọc ngược.
// - Vị trí nội suy (lerp) về target nhận từ server; đi/chạy vung chân
//   tay; lái xe thì ngồi tư thế lái + xe máy đơn giản dưới chân.
// - Chỉ render ngoài sân (CampusScene không mount trong phòng học).
// - Vị trí cập nhật qua ref trong useFrame — không re-render React khi
//   nhận tin move (10 tin/giây/người), chỉ re-render khi có người vào/ra.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useReducer, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import {
  HumanFigure,
  OUTFIT_PRESETS,
  computeNaturalGaitTargets,
  type FigureJoints,
} from './StudentAvatar';
import { multiplayer, type RemotePlayer, type RemoteState } from '../../lib/multiplayer';

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

/** Texture bảng tên "Tên (MSSV)" — canvas rộng hơn của Npc (tên + MSSV dài). */
function useNameTagTexture(label: string): THREE.CanvasTexture {
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(4, 4, 504, 56, 16);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Co chữ vừa khung nếu tên dài (tối đa 30 ký tự + " (12345678)").
      let size = 32;
      ctx.font = `bold ${size}px Arial, sans-serif`;
      const w = ctx.measureText(label).width;
      if (w > 470) size = Math.max(18, Math.floor((size * 470) / w));
      ctx.font = `bold ${size}px Arial, sans-serif`;
      ctx.fillText(label, 256, 34);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [label]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 38);
  const g = Math.max(0, ((n >> 8) & 255) - 38);
  const b = Math.max(0, (n & 255) - 38);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Xe máy đơn giản cho người chơi khác đang lái (2 bánh + thân + tay lái). */
function SimpleBike({ color }: { color: string }) {
  return (
    <group>
      {/* bánh trước/sau */}
      <mesh position={[0, 0.25, 0.55]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.25, 0.07, 10, 20]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.25, -0.55]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.25, 0.07, 10, 20]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.9} />
      </mesh>
      {/* thân xe + yên + tay lái */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.22, 0.16, 1.05]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.52, -0.28]}>
        <boxGeometry args={[0.2, 0.07, 0.4]} />
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.62, 0.5]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.04]} />
        <meshStandardMaterial color="#333333" roughness={0.7} />
      </mesh>
    </group>
  );
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const SPEED_CAP: Record<RemoteState, number> = {
  idle: 0,
  walking: 4.5,
  running: 7,
  riding: 15,
};

/** Vị trí render thực tế (đã nội suy) của từng người chơi khác — hook
 * debug cho test: window.__bkhnMpRender() trả { [id]: {x, z, facing} }. */
export const remoteRenderPos = new Map<string, { x: number; z: number; facing: number }>();

/** Một người chơi khác: nội suy vị trí + hoạt hình chân tay mỗi frame. */
function RemotePlayerView({ player }: { player: RemotePlayer }) {
  const groupRef = useRef<THREE.Group>(null!);
  const figureRef = useRef<THREE.Group>(null!);
  const joints = useFigureJoints();
  const cur = useRef({ x: player.x, z: player.z, facing: player.facing });
  const phase = useRef(0);
  const label = `${player.name} (${player.mssv})`;
  const tagTex = useNameTagTexture(label);

  useEffect(() => {
    return () => {
      remoteRenderPos.delete(player.id);
    };
  }, [player.id]);

  useFrame((_, delta) => {
    // Kẹp delta ở 0,5 s/khung: khung chậm (điện thoại yếu, SwiftShader
    // khi test ~0,4 fps) vẫn bắt kịp vị trí thật — kẹp 0,1 s cũ làm
    // người chơi khác bò 0,45 m/khung, mất ~40 s mới đuổi kịp sau
    // teleport. Nhảy cóc > 8 m vẫn snap ngay (dưới), nên không sợ vọt.
    const dt = Math.min(delta, 0.5);
    const target = player;
    // Nội suy vị trí về target (kẹp tốc độ theo trạng thái); nhảy cóc
    // nếu lệch > 8 m (vd vừa dịch chuyển nhanh / mới vào).
    // TỐC ĐỘ TỐI THIỂU 4,5 m/s kể cả khi target đứng yên ('idle' có cap
    // 0 trong bảng): người khác teleport/dịch chuyển nhanh rồi đứng yên
    // thì avatar vẫn phải đuổi kịp chỗ mới — cap 0 cũ làm figure đóng
    // băng vĩnh viễn ở chỗ cũ cho tới khi người đó đi tiếp (đã gặp:
    // tag hiện ở spawn trong khi dữ liệu đã ở (-70,14)).
    const dx = target.x - cur.current.x;
    const dz = target.z - cur.current.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 8) {
      cur.current.x = target.x;
      cur.current.z = target.z;
    } else if (dist > 0.001) {
      const cap = Math.max(4.5, SPEED_CAP[target.state]) * dt;
      const step = Math.min(dist, cap);
      cur.current.x += (dx / dist) * step;
      cur.current.z += (dz / dist) * step;
    }
    cur.current.facing = lerpAngle(cur.current.facing, target.facing, Math.min(1, dt * 10));

    const g = groupRef.current;
    if (!g) return;
    g.position.set(cur.current.x, target.state === 'riding' ? 0.12 : 0, cur.current.z);
    if (figureRef.current) {
      figureRef.current.rotation.y = cur.current.facing;
    }
    remoteRenderPos.set(player.id, { x: cur.current.x, z: cur.current.z, facing: cur.current.facing });

    const j = joints;
    const set = (ref: React.RefObject<THREE.Group>, axis: 'x' | 'z', v: number) => {
      if (ref.current) ref.current.rotation[axis] = v;
    };
    if (target.state === 'riding') {
      // Tư thế ngồi lái (cùng số với Player): hông -1,25/-1,35, gối
      // 1,15/1,25, vai -0,95, khuỷu -0,55.
      set(j.legL, 'x', -1.25);
      set(j.legR, 'x', -1.35);
      set(j.kneeL, 'x', 1.15);
      set(j.kneeR, 'x', 1.25);
      set(j.footL, 'x', 0.15);
      set(j.footR, 'x', 0.15);
      set(j.armL, 'x', -0.95);
      set(j.armR, 'x', -0.95);
      set(j.elbowL, 'x', -0.55);
      set(j.elbowR, 'x', -0.55);
      set(j.body, 'x', 0.08);
      set(j.body, 'z', 0);
    } else if (target.state === 'walking' || target.state === 'running') {
      const isRun = target.state === 'running';
      const speed = isRun ? 10.5 : 7.5;
      const swing = isRun ? 0.62 : 0.5;
      phase.current += dt * speed;
      const t = performance.now() / 1000;
      const gait = computeNaturalGaitTargets(phase.current, swing, 1, t, isRun);
      set(j.legL, 'x', gait.legLTarget);
      set(j.legR, 'x', gait.legRTarget);
      set(j.kneeL, 'x', gait.kneeLTarget);
      set(j.kneeR, 'x', gait.kneeRTarget);
      set(j.footL, 'x', gait.footLTarget);
      set(j.footR, 'x', gait.footRTarget);
      set(j.armL, 'x', gait.armLTarget);
      set(j.armR, 'x', gait.armRTarget);
      set(j.elbowL, 'x', gait.elbowLTarget);
      set(j.elbowR, 'x', gait.elbowRTarget);
      set(j.body, 'x', gait.bodyLeanTarget);
      set(j.body, 'z', gait.bodyRollTarget);
    } else {
      // Đứng yên: thở nhẹ, tay hơi gập (như NPC).
      const t = performance.now() / 1000;
      set(j.legL, 'x', 0);
      set(j.legR, 'x', 0);
      set(j.kneeL, 'x', 0.05);
      set(j.kneeR, 'x', 0.05);
      set(j.footL, 'x', 0);
      set(j.footR, 'x', 0);
      set(j.armL, 'x', 0.08);
      set(j.armR, 'x', -0.04);
      set(j.elbowL, 'x', -0.28);
      set(j.elbowR, 'x', -0.36);
      if (j.body.current) {
        j.body.current.scale.y = 1 + Math.sin(t * 1.4) * 0.008;
        j.body.current.rotation.x = 0;
        j.body.current.rotation.z = Math.sin(t * 0.9) * 0.008;
      }
    }
  });

  const gender = player.gender ?? 'male';
  const preset = player.outfit ? OUTFIT_PRESETS[player.outfit] : undefined;
  const hairStyle = player.hairStyle ?? (gender === 'female' ? 'ponytail' : 'short');
  const skirtColor =
    gender === 'female' && player.skirt
      ? (preset?.defaultSkirtColor ?? '#1E293B')
      : undefined;

  return (
    <group ref={groupRef} position={[player.x, 0, player.z]}>
      <group ref={figureRef}>
        <HumanFigure
          variant={preset ? preset.variant : 'polo'}
          gender={gender}
          shirt={preset ? preset.shirt : player.color}
          shirtDark={preset ? preset.shirtDark : darken(player.color)}
          upperYokeColor={preset?.upperYokeColor}
          sleeveColor={preset?.sleeveColor}
          skirtColor={skirtColor}
          pants={preset ? preset.pants : '#2B2F36'}
          shoe={preset ? preset.shoe : '#F5F5F5'}
          shoeSole={preset ? preset.shoeSole : '#1A1A1A'}
          hairStyle={hairStyle}
          glasses={player.glasses ?? false}
          lanyard
          wristwatch
          backpack={player.backpack ?? true}
          backpackColors={{ pack: '#2A2E33', packLight: '#3A3E44', packZip: '#1A1A1A' }}
          joints={joints}
        />
        {player.state === 'riding' && <SimpleBike color="#166534" />}
      </group>
      {/* Billboard ngoài nhóm xoay — chữ luôn đọc xuôi (như Npc.tsx). */}
      <Billboard position={[0, 1.95, 0]}>
        <mesh>
          <planeGeometry args={[1.6, 0.2]} />
          <meshStandardMaterial map={tagTex} transparent roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
    </group>
  );
}

function playerSignature(p: RemotePlayer): string {
  return `${p.id}:${p.name}:${p.mssv}:${p.gender ?? ''}:${p.outfit ?? ''}:${p.hairStyle ?? ''}:${p.skirt ?? ''}:${p.glasses ?? ''}:${p.backpack ?? ''}`;
}

export default function RemotePlayers() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const playersRef = useRef<RemotePlayer[]>([]);
  const sigRef = useRef<string>('');

  useEffect(() => {
    const unsub = multiplayer.subscribe((snap) => {
      const next = snap.players;
      const nextSig = next.map(playerSignature).join('|');
      const same = sigRef.current === nextSig;
      playersRef.current = next;
      sigRef.current = nextSig;
      if (!same) force();
    });
    playersRef.current = multiplayer.snapshot.players;
    sigRef.current = playersRef.current.map(playerSignature).join('|');
    // Vẽ ngay những người ĐÃ ở trong phòng khi scene mount: welcome có
    // thể tới trước khi CampusScene tải xong (chunk dynamic + SwiftShader
    // chậm) — nếu chỉ trông vào emit thì không còn sự kiện nào kích hoạt
    // re-render nữa và người đó không bao giờ hiện (đã gặp: B vào sau,
    // thấy A trong snapshot nhưng không thấy avatar của A).
    force();
    // Hook debug cho test: vị trí render thực tế của người chơi khác.
    (window as unknown as { __bkhnMpRender?: () => Record<string, { x: number; z: number; facing: number }> }).__bkhnMpRender = () =>
      Object.fromEntries(remoteRenderPos);
    return unsub;
  }, []);

  return (
    <group>
      {playersRef.current.map((p) => (
        <RemotePlayerView key={p.id} player={p} />
      ))}
    </group>
  );
}
