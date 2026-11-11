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
  EMOTE_DEFINITIONS,
  HumanFigure,
  LYING_GROUP_Y_OFFSET,
  OUTFIT_PRESETS,
  SEATED_GROUP_Y_OFFSET,
  computeEmotePoseTargets,
  computeLyingPoseTargets,
  computeNaturalGaitTargets,
  computePianoPoseTargets,
  computeSeatedPoseTargets,
  isLyingSeatId,
  isPianoBenchSeatId,
  type FigureJoints,
} from './StudentAvatar';
import { findNearestLibrarySeat } from '../../features/campus/interaction';
import {
  CANVAS_VN_FONT,
  drawSpeechBubbleCanvas,
  wrapVietnameseCanvasContext,
} from './TextPlate';
import {
  computeCanonicalLibraryElevation,
  getBlockForFloor,
  getFloorBaseElevation,
  sanitizeLibraryFloor,
} from '../../lib/campus';
import {
  multiplayer,
  type MultiplayerSceneId,
  type RemotePlayer,
  type RemoteState,
} from '../../lib/multiplayer';
import { playerState } from '../../lib/playerState';

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
    const rawCtx = canvas.getContext('2d');
    if (rawCtx) {
      const ctx = wrapVietnameseCanvasContext(rawCtx);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(4, 4, 504, 56, 16);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Co chữ vừa khung nếu tên dài (tối đa 30 ký tự + " (12345678)").
      let size = 32;
      ctx.font = `700 ${size}px ${CANVAS_VN_FONT}`;
      const w = ctx.measureText(label).width;
      if (w > 470) size = Math.max(18, Math.floor((size * 470) / w));
      ctx.font = `700 ${size}px ${CANVAS_VN_FONT}`;
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
function RemotePlayerView({
  player,
  scene,
}: {
  player: RemotePlayer;
  scene: MultiplayerSceneId;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const figureRef = useRef<THREE.Group>(null!);
  const bikeGroupRef = useRef<THREE.Group>(null!);
  const joints = useFigureJoints();
  const initFloor = sanitizeLibraryFloor(player.libraryFloor ?? 1);
  const initY =
    scene === 'library'
      ? computeCanonicalLibraryElevation(
          player.x,
          player.z,
          initFloor,
          getFloorBaseElevation(initFloor),
        ).y
      : 0;
  const cur = useRef({ x: player.x, y: initY, z: player.z, facing: player.facing });
  const lastTargetRef = useRef({ x: player.x, z: player.z, movedAt: performance.now() });
  const prevFloorRef = useRef<number>(initFloor);
  const phase = useRef(0);
  const label = `${player.name} (${player.mssv})`;
  const tagTex = useNameTagTexture(label);
  const bubbleMeshRef = useRef<THREE.Mesh>(null!);
  const lastBubbleTextRef = useRef<string>('');
  const bubbleTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => bubbleTex.dispose(), [bubbleTex]);

  useEffect(() => {
    const latest = multiplayer.getRemotePlayer(player.id) ?? player;
    cur.current.x = latest.x;
    cur.current.z = latest.z;
    cur.current.facing = latest.facing;
    remoteRenderPos.set(player.id, {
      x: latest.x,
      z: latest.z,
      facing: latest.facing,
    });
    return () => {
      remoteRenderPos.delete(player.id);
    };
  }, [player.id, scene]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.5);
    const target = multiplayer.getRemotePlayer(player.id) ?? player;
    const nowMs = performance.now();
    if (
      Math.hypot(target.x - lastTargetRef.current.x, target.z - lastTargetRef.current.z) > 0.005
    ) {
      lastTargetRef.current = { x: target.x, z: target.z, movedAt: nowMs };
    }
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
    const isRemoteSeated = scene === 'library' && Boolean(target.seatedSeatId);
    let effectiveSeatId: string | null = target.seatedSeatId ?? null;
    let renderX = cur.current.x;
    let renderZ = cur.current.z;
    if (scene === 'library') {
      const remoteFloor = sanitizeLibraryFloor(target.libraryFloor ?? 1);
      const sameBlock =
        getBlockForFloor(remoteFloor) === getBlockForFloor(playerState.libraryFloor);
      if (g.visible !== sameBlock) {
        g.visible = sameBlock;
      }
      if (isRemoteSeated) {
        const matched = findNearestLibrarySeat(
          { x: target.x, z: target.z },
          0.95,
          remoteFloor,
        );
        const matchedSeat = matched?.seat;
        if (matchedSeat) {
          cur.current.x = matchedSeat.x;
          cur.current.z = matchedSeat.z;
          cur.current.facing = matchedSeat.facing;
          renderX = matchedSeat.x;
          renderZ = matchedSeat.z;
          effectiveSeatId = matchedSeat.seatId;
        }
        const isLying = isLyingSeatId(effectiveSeatId);
        const seatBaseY =
          matchedSeat?.y !== undefined
            ? matchedSeat.y
            : computeCanonicalLibraryElevation(
                cur.current.x,
                cur.current.z,
                remoteFloor,
                getFloorBaseElevation(remoteFloor),
              ).y;
        cur.current.y = seatBaseY + (isLying ? LYING_GROUP_Y_OFFSET : SEATED_GROUP_Y_OFFSET);
        prevFloorRef.current = remoteFloor;
      } else {
        const elev = computeCanonicalLibraryElevation(
          cur.current.x,
          cur.current.z,
          remoteFloor,
          prevFloorRef.current !== remoteFloor
            ? getFloorBaseElevation(remoteFloor)
            : cur.current.y,
        );
        if (prevFloorRef.current !== remoteFloor || Math.abs(elev.y - cur.current.y) > 3.5) {
          cur.current.y = elev.y;
          prevFloorRef.current = remoteFloor;
        } else {
          cur.current.y += (elev.y - cur.current.y) * Math.min(1, dt * 12);
        }
        // Khi 2 người chơi cùng đứng trùng một điểm trong Thư viện (vd vừa bước qua cửa vào spawn (0, 2.4)),
        // tách nhẹ vị trí hiển thị hình ảnh sang bên cạnh 0.62m để cả hai luôn nhìn thấy nhau rõ ràng.
        if (
          remoteFloor === playerState.libraryFloor &&
          Math.hypot(cur.current.x - playerState.pos.x, cur.current.z - playerState.pos.z) < 0.35
        ) {
          const sideSign = (player.id.charCodeAt(0) + player.id.charCodeAt(player.id.length - 1)) % 2 === 0 ? 1 : -1;
          renderX = cur.current.x + sideSign * 0.62;
        }
      }
    } else {
      if (!g.visible) g.visible = true;
      cur.current.y = target.state === 'riding' ? 0.12 : 0;
      // Ngoài sân trường (campus) hoặc phòng học, nếu 2 sinh viên đứng trùng điểm spawn/dịch chuyển (< 0.35m),
      // cũng tách nhẹ vị trí hiển thị hình ảnh sang bên 0.62m để đứng cạnh nhau thay vì chồng lên nhau.
      if (
        target.state !== 'riding' &&
        Math.hypot(cur.current.x - playerState.pos.x, cur.current.z - playerState.pos.z) < 0.35
      ) {
        const sideSign = (player.id.charCodeAt(0) + player.id.charCodeAt(player.id.length - 1)) % 2 === 0 ? 1 : -1;
        renderX = cur.current.x + sideSign * 0.62;
      }
    }
    g.position.set(renderX, cur.current.y, renderZ);
    if (figureRef.current) {
      figureRef.current.rotation.y = cur.current.facing;
    }
    if (bikeGroupRef.current) {
      bikeGroupRef.current.visible = target.state === 'riding' && scene === 'campus';
    }
    remoteRenderPos.set(player.id, { x: cur.current.x, z: cur.current.z, facing: cur.current.facing });

    // Nếu người chơi khác đã dừng lại tại đích hơn 650ms mà gói 'idle' cuối bị trễ, tự động chuyển về tư thế đứng tự nhiên
    const effectiveState: RemoteState =
      (target.state === 'walking' || target.state === 'running') &&
      dist < 0.02 &&
      nowMs - lastTargetRef.current.movedAt > 650
        ? 'idle'
        : target.state;

    const j = joints;
    const poseEase = Math.min(1, dt * 14);
    const set = (ref: React.RefObject<THREE.Group>, axis: 'x' | 'y' | 'z', v: number) => {
      if (ref.current) {
        ref.current.rotation[axis] += (v - ref.current.rotation[axis]) * poseEase;
      }
    };
    const remoteEmote = multiplayer.getPlayerEmote(player.id);
    const remoteBubble = multiplayer.getPlayerChatBubble(player.id);
    const wallNow = Date.now();
    const isEmoting =
      Boolean(remoteEmote) &&
      wallNow < remoteEmote!.expiresAtMs &&
      effectiveState !== 'riding';

    if (effectiveState === 'riding' && scene === 'campus') {
      // Tư thế ngồi lái (cùng số với Player): hông -1,25/-1,35, gối
      // 1,15/1,25, vai -0,95, khuỷu -0,55.
      set(j.legL, 'x', -1.25);
      set(j.legR, 'x', -1.35);
      set(j.legL, 'z', 0);
      set(j.legR, 'z', 0);
      set(j.kneeL, 'x', 1.15);
      set(j.kneeR, 'x', 1.25);
      set(j.footL, 'x', 0.15);
      set(j.footR, 'x', 0.15);
      set(j.armL, 'x', -0.95);
      set(j.armR, 'x', -0.95);
      set(j.armL, 'z', 0);
      set(j.armR, 'z', 0);
      set(j.elbowL, 'x', -0.55);
      set(j.elbowR, 'x', -0.55);
      set(j.body, 'x', 0.08);
      set(j.body, 'y', 0);
      set(j.body, 'z', 0);
    } else if (isEmoting && remoteEmote && !(isRemoteSeated && isLyingSeatId(effectiveSeatId))) {
      const elapsedSec = Math.max(0, (wallNow - remoteEmote.startedAtMs) / 1000);
      const emotePose = computeEmotePoseTargets(remoteEmote.emote, elapsedSec, isRemoteSeated);
      set(j.legL, 'x', emotePose.legLTarget);
      set(j.legR, 'x', emotePose.legRTarget);
      set(j.legL, 'z', emotePose.legLZTarget);
      set(j.legR, 'z', emotePose.legRZTarget);
      set(j.kneeL, 'x', emotePose.kneeLTarget);
      set(j.kneeR, 'x', emotePose.kneeRTarget);
      set(j.footL, 'x', emotePose.footLTarget);
      set(j.footR, 'x', emotePose.footRTarget);
      set(j.armL, 'x', emotePose.armLTarget);
      set(j.armR, 'x', emotePose.armRTarget);
      set(j.armL, 'z', emotePose.armLZTarget);
      set(j.armR, 'z', emotePose.armRZTarget);
      set(j.elbowL, 'x', emotePose.elbowLTarget);
      set(j.elbowR, 'x', emotePose.elbowRTarget);
      set(j.body, 'x', emotePose.bodyLeanTarget);
      set(j.body, 'y', emotePose.bodyYawTarget);
      set(j.body, 'z', emotePose.bodyRollTarget);
      if (j.body.current) {
        j.body.current.position.y += (emotePose.bodyBobTarget - j.body.current.position.y) * poseEase;
      }
      if (!isRemoteSeated) {
        g.position.y = cur.current.y + emotePose.jumpYOffset;
      }
    } else if (isRemoteSeated) {
      const t = performance.now() / 1000;
      if (isLyingSeatId(effectiveSeatId)) {
        const lyingPose = computeLyingPoseTargets(t);
        set(j.legL, 'x', lyingPose.legLTarget);
        set(j.legR, 'x', lyingPose.legRTarget);
        set(j.legL, 'z', 0);
        set(j.legR, 'z', 0);
        set(j.kneeL, 'x', lyingPose.kneeLTarget);
        set(j.kneeR, 'x', lyingPose.kneeRTarget);
        set(j.footL, 'x', lyingPose.footLTarget);
        set(j.footR, 'x', lyingPose.footRTarget);
        set(j.armL, 'x', lyingPose.armLTarget);
        set(j.armR, 'x', lyingPose.armRTarget);
        set(j.armL, 'z', 0);
        set(j.armR, 'z', 0);
        set(j.elbowL, 'x', lyingPose.elbowLTarget);
        set(j.elbowR, 'x', lyingPose.elbowRTarget);
        set(j.body, 'x', lyingPose.bodyLeanTarget);
        set(j.body, 'y', 0);
        set(j.body, 'z', lyingPose.bodyRollTarget);
        if (j.body.current) {
          j.body.current.position.y += (lyingPose.bodyBobTarget - j.body.current.position.y) * poseEase;
        }
      } else if (isPianoBenchSeatId(effectiveSeatId)) {
        const pianoPose = computePianoPoseTargets(
          t,
          multiplayer.isPlayerPlayingPiano(player.id),
        );
        set(j.legL, 'x', pianoPose.legLTarget);
        set(j.legR, 'x', pianoPose.legRTarget);
        set(j.legL, 'z', 0);
        set(j.legR, 'z', 0);
        set(j.kneeL, 'x', pianoPose.kneeLTarget);
        set(j.kneeR, 'x', pianoPose.kneeRTarget);
        set(j.footL, 'x', pianoPose.footLTarget);
        set(j.footR, 'x', pianoPose.footRTarget);
        set(j.armL, 'x', pianoPose.armLTarget);
        set(j.armR, 'x', pianoPose.armRTarget);
        set(j.armL, 'z', pianoPose.armLZTarget);
        set(j.armR, 'z', pianoPose.armRZTarget);
        set(j.elbowL, 'x', pianoPose.elbowLTarget);
        set(j.elbowR, 'x', pianoPose.elbowRTarget);
        set(j.body, 'x', pianoPose.bodyLeanTarget);
        set(j.body, 'y', 0);
        set(j.body, 'z', pianoPose.bodyRollTarget);
        if (j.body.current) {
          j.body.current.position.y += (pianoPose.bodyBobTarget - j.body.current.position.y) * poseEase;
        }
      } else {
        const seatedPose = computeSeatedPoseTargets(t);
        set(j.legL, 'x', seatedPose.legLTarget);
        set(j.legR, 'x', seatedPose.legRTarget);
        set(j.legL, 'z', 0);
        set(j.legR, 'z', 0);
        set(j.kneeL, 'x', seatedPose.kneeLTarget);
        set(j.kneeR, 'x', seatedPose.kneeRTarget);
        set(j.footL, 'x', seatedPose.footLTarget);
        set(j.footR, 'x', seatedPose.footRTarget);
        set(j.armL, 'x', seatedPose.armLTarget);
        set(j.armR, 'x', seatedPose.armRTarget);
        set(j.armL, 'z', 0);
        set(j.armR, 'z', 0);
        set(j.elbowL, 'x', seatedPose.elbowLTarget);
        set(j.elbowR, 'x', seatedPose.elbowRTarget);
        set(j.body, 'x', seatedPose.bodyLeanTarget);
        set(j.body, 'y', 0);
        set(j.body, 'z', seatedPose.bodyRollTarget);
        if (j.body.current) {
          j.body.current.position.y += (seatedPose.bodyBobTarget - j.body.current.position.y) * poseEase;
        }
      }
    } else if (effectiveState === 'walking' || effectiveState === 'running') {
      const isRun = effectiveState === 'running';
      const speed = isRun ? 10.5 : 7.5;
      const swing = isRun ? 0.62 : 0.5;
      phase.current += dt * speed;
      const t = performance.now() / 1000;
      const gait = computeNaturalGaitTargets(phase.current, swing, 1, t, isRun);
      set(j.legL, 'x', gait.legLTarget);
      set(j.legR, 'x', gait.legRTarget);
      set(j.legL, 'z', 0);
      set(j.legR, 'z', 0);
      set(j.kneeL, 'x', gait.kneeLTarget);
      set(j.kneeR, 'x', gait.kneeRTarget);
      set(j.footL, 'x', gait.footLTarget);
      set(j.footR, 'x', gait.footRTarget);
      set(j.armL, 'x', gait.armLTarget);
      set(j.armR, 'x', gait.armRTarget);
      set(j.armL, 'z', 0);
      set(j.armR, 'z', 0);
      set(j.elbowL, 'x', gait.elbowLTarget);
      set(j.elbowR, 'x', gait.elbowRTarget);
      set(j.body, 'x', gait.bodyLeanTarget);
      set(j.body, 'y', 0);
      set(j.body, 'z', gait.bodyRollTarget);
      if (j.body.current) {
        j.body.current.position.y += (0 - j.body.current.position.y) * poseEase;
      }
    } else {
      // Đứng yên: thở nhẹ, tay hơi gập (như NPC).
      const t = performance.now() / 1000;
      set(j.legL, 'x', 0);
      set(j.legR, 'x', 0);
      set(j.legL, 'z', 0);
      set(j.legR, 'z', 0);
      set(j.kneeL, 'x', 0.05);
      set(j.kneeR, 'x', 0.05);
      set(j.footL, 'x', 0);
      set(j.footR, 'x', 0);
      set(j.armL, 'x', 0.08);
      set(j.armR, 'x', -0.04);
      set(j.armL, 'z', 0);
      set(j.armR, 'z', 0);
      set(j.elbowL, 'x', -0.28);
      set(j.elbowR, 'x', -0.36);
      set(j.body, 'x', 0);
      set(j.body, 'y', 0);
      set(j.body, 'z', Math.sin(t * 0.9) * 0.008);
      if (j.body.current) {
        j.body.current.scale.y = 1 + Math.sin(t * 1.4) * 0.008;
        j.body.current.position.y += (0 - j.body.current.position.y) * poseEase;
      }
    }

    let overheadText = '';
    if (remoteBubble && wallNow < remoteBubble.expiresAtMs) {
      overheadText = `💬 ${remoteBubble.text}`;
    } else if (isEmoting && remoteEmote) {
      const def = EMOTE_DEFINITIONS.find((d) => d.id === remoteEmote.emote);
      if (def) overheadText = `${def.icon} ${def.labelVi} · ${def.labelZh}`;
    }
    if (bubbleMeshRef.current) {
      if (overheadText) {
        if (lastBubbleTextRef.current !== overheadText) {
          lastBubbleTextRef.current = overheadText;
          drawSpeechBubbleCanvas(
            bubbleTex.image as HTMLCanvasElement,
            overheadText,
            remoteBubble ? '#0284C7' : '#F59E0B',
          );
          bubbleTex.needsUpdate = true;
        }
        bubbleMeshRef.current.visible = true;
      } else {
        bubbleMeshRef.current.visible = false;
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
          backpack={(player.backpack ?? true) && !Boolean(player.seatedSeatId)}
          backpackColors={{ pack: '#2A2E33', packLight: '#3A3E44', packZip: '#1A1A1A' }}
          joints={joints}
        />
        <group ref={bikeGroupRef} visible={player.state === 'riding' && scene === 'campus'}>
          <SimpleBike color="#166534" />
        </group>
      </group>
      {/* Billboard ngoài nhóm xoay — chữ luôn đọc xuôi (như Npc.tsx). */}
      <Billboard position={[0, 1.95, 0]}>
        <mesh ref={bubbleMeshRef} visible={false} position={[0, 0.28, 0]}>
          <planeGeometry args={[1.65, 0.42]} />
          <meshBasicMaterial
            map={bubbleTex}
            transparent
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh>
          <planeGeometry args={[1.6, 0.2]} />
          <meshStandardMaterial map={tagTex} transparent depthWrite={false} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
    </group>
  );
}

function playerSignature(p: RemotePlayer): string {
  return `${p.id}:${p.name}:${p.mssv}:${p.state}:${p.scene ?? 'campus'}:${p.libraryFloor ?? 1}:${p.seatedSeatId ?? ''}:${p.gender ?? ''}:${p.outfit ?? ''}:${p.hairStyle ?? ''}:${p.skirt ?? ''}:${p.glasses ?? ''}:${p.backpack ?? ''}`;
}

function filterPlayersForScene(
  players: RemotePlayer[],
  seatedIds: Set<string>,
  scene: MultiplayerSceneId,
): RemotePlayer[] {
  return players.filter((p) => {
    if (scene === 'library' && seatedIds.has(p.id)) return false;
    const pScene = p.scene ?? 'campus';
    return pScene === scene;
  });
}

export interface RemotePlayersProps {
  scene?: MultiplayerSceneId;
}

export default function RemotePlayers({ scene = 'campus' }: RemotePlayersProps) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const sigRef = useRef<string>('');

  const snapNow = multiplayer.snapshot;
  const seatedIdsNow = new Set(snapNow.seats.map((s) => s.occupantId));
  const visiblePlayers = filterPlayersForScene(snapNow.players, seatedIdsNow, scene);
  sigRef.current = `${scene}|${visiblePlayers.map(playerSignature).join('|')}`;

  useEffect(() => {
    const unsub = multiplayer.subscribe((snap) => {
      const seatedIds = new Set(snap.seats.map((s) => s.occupantId));
      const next = filterPlayersForScene(snap.players, seatedIds, scene);
      const nextSig = `${scene}|${next.map(playerSignature).join('|')}`;
      if (sigRef.current !== nextSig) {
        sigRef.current = nextSig;
        force();
      }
    });
    force();
    (window as unknown as { __bkhnMpRender?: () => Record<string, { x: number; z: number; facing: number }> }).__bkhnMpRender = () =>
      Object.fromEntries(remoteRenderPos);
    return unsub;
  }, [scene]);

  return (
    <group>
      {visiblePlayers.map((p) => (
        <RemotePlayerView key={`${scene}:${p.id}`} player={p} scene={scene} />
      ))}
    </group>
  );
}
