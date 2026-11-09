// ---------------------------------------------------------------------------
// Player.tsx — nhân vật sinh viên + điều khiển góc nhìn thứ ba (Bước 2, avatar chi tiết Bước 3)
// Mọi số đo lấy từ lib/campus.ts / lib/playerState.ts (source of truth):
// avatar cao đúng 1,7 m (chân 0,8 + thân áo 0,55 + cổ 0,09 + đầu 0,24 + tóc chạm 1,7),
// walk 4 m/s, run 7 m/s (giữ Shift), bán kính va chạm 0,4 m.
// Hình dạng nhân vật nằm ở components/three/StudentAvatar.tsx (Player chỉ giữ
// logic di chuyển/camera/va chạm + animation tay/chân khi đi).
// Điều khiển: WASD / mũi tên ghi vào playerInput.move, Shift = run,
// phím E dispatch CustomEvent('bkhn:interact') (placeholder, chưa có quest),
// kéo chuột trên canvas xoay camera, lăn chuột zoom 4–10 m.
// Trạng thái chia sẻ với HUD qua playerInput / playerState / updatePlayerState.
//
// ANIMATION — dựng lại lần 2 (06/11, brief §7):
//   * Tốc độ animation KHỚP tốc độ di chuyển: bước dài = 2 × (hông→cổ chân
//     0,73 m) × sin(biên độ đung đưa); phase tăng speed×π/bước dài nên
//     quãng đường/bước đo thật = bước dài hình học (không trượt chân).
//     Walk: biên độ 0,50 rad → bước 0,70 m, ~5,7 bước/s. Run: 0,62 rad →
//     bước 0,85 m, ~8,2 bước/s (không có pha bay — ghi rõ là giới hạn).
//   * Gối + khuỷu GẬP ĐÚNG CHIỀU (đợt 3 giai đoạn 1 — quy ước rotation.x,
//     mặt trước +Z): rotation.x DƯƠNG xoay chi treo (-Y) về SAU (-Z),
//     ÂM xoay về TRƯỚC (+Z). Nên gối gập (cẳng chân về sau) là
//     rotation.x DƯƠNG, khuỷu gập (cẳng tay về trước) là rotation.x ÂM
//     (trước đây dấu ngược cả hai). Gối cong nhất khi chân vung về
//     TRƯỚC qua dưới thân (0,05 + 0,85×max(0,−cos phase) cho chân L,
//     cực đại ở phase π), duỗi khi chạm đất; khuỷu gập sẵn ~0,30–0,42
//     rad, cong thêm khi tay vung về trước. Cổ chân bù góc
//     foot = −(leg + knee)×0,9 (đổi dấu theo gối mới) để bàn chân gần
//     phẳng khi tiếp đất (đế giày chạm y = 0).
//   * Idle: chuyển trọng lượng nhẹ (thân nghiêng ±0,012 rad + thở), hai tay
//     không song song (trái hơi trước, phải hơi sau, khuỷu gập khác nhau).
//   * Dừng: mọi khớp nội suy mềm về tư thế idle (blend 0→1 theo delta×6).
//   * uiLocked (panel học mở): move = 0 → blend về 0, nhân vật đứng yên,
//     không chạy tại chỗ.
//   * Balô: state + hook __bkhn.setBackpack(boolean) để tháo/lắp khi kiểm
//     tra model người và áo độc lập (xem PROGRESS.md).
// Camera: dist mặc định 7 m, target y = 1,2 (vùng thân trên) — giữ nguyên
// (§8: đã đủ xa để nhìn đường + bối cảnh, không đổi khi chưa có bằng chứng).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import {
  AVATAR,
  BIKE_MAX_SPEED,
  BIKE_PARK,
  BIKE_RADIUS,
  BUILDING_COLLIDERS,
  CLASSROOM,
  CLASSROOM_DOOR,
  FAST_TRAVEL_DESTINATIONS,
  LIBRARY_DOOR,
  LIBRARY_LOBBY,
  ROADS,
  SPAWN,
  findFreeSpotNear,
  getCampusGroundElevation,
  nearestRoadPoint,
  pushOutOfCircle,
  resolveBikeCollisions,
  resolveClassroomCollisions,
  resolveCollisions,
  resolveLibraryLobbyCollisions,
  createLibraryLocation,
  findNearestLibraryDoorway,
  getBlockForFloor,
  queryLibraryGround,
  resolveLibraryFloorTransition,
  resolveLibraryMovement,
  type LibraryFloor,
  type LibrarySpatialDiagnostics,
  type Vec2,
} from '../../lib/campus';
import { activeWalkingStudentPositions } from './AmbientLife';
import { remoteRenderPos } from './RemotePlayers';
import {
  bikeInput,
  bikeState,
  computeLibraryElevation,
  fastTravelState,
  playerInput,
  playerState,
  updatePlayerState,
  type AvatarGender,
  type AvatarHairStyle,
  type AvatarOutfitId,
} from '../../lib/playerState';
import {
  computeSafeStandUpPosition,
  createInitialSeatingState,
  findNearestLibrarySeat,
  transitionToSeated,
  transitionToStanding,
  type LocalSeatingState,
} from '../../features/campus/interaction';
import { getSeatDefinition } from '../../shared/contracts/study';
import StudentAvatar, {
  SEATED_GROUP_Y_OFFSET,
  computeNaturalGaitTargets,
  computeSeatedPoseTargets,
  type FigureJoints,
} from './StudentAvatar';

function usePlayerNameplateTexture(name: string): THREE.CanvasTexture {
  const display = (name || 'Sinh viên').trim() || 'Sinh viên';
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 512, 80);
      // Pill nền tối mờ sang trọng + viền vàng mảnh
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(12, 10, 488, 60, 30);
      ctx.fill();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let fontSize = 32;
      ctx.font = `700 ${fontSize}px system-ui, -apple-system, Arial, sans-serif`;
      const textW = ctx.measureText(display).width;
      if (textW > 440) {
        fontSize = Math.max(18, Math.floor((fontSize * 440) / textW));
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, Arial, sans-serif`;
      }
      ctx.fillText(display, 256, 42);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [display]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

const CAM_MIN_DIST = 4;
const CAM_MAX_DIST = 10;
const CAM_MIN_PITCH = 0.05; // rad — camera không xuống dưới mặt đất
const CAM_MAX_PITCH = 1.1; // rad
const CAM_MIN_Y = 0.6;
const LOOK_SPEED = 0.005;

// --- Hằng số xe máy (đợt 3 giai đoạn 4) --------------------------------------
// W ga, S phanh (chỉ lùi chậm khi gần dừng), A/D lái. Tăng tốc 6 m/s²,
// phanh 11 m/s², trôi tự nhiên 2 m/s²; lùi tối đa 2 m/s. Chiều dài cơ sở
// 1,35 m cho công thức quay xe đạp (yawRate = v/L·tan(steer)); không quay
// tại chỗ khi chạy nhanh (yawRate ~ 0 khi |v| < 0,3 m/s, góc lái thu hẹp
// theo tốc độ). Cập nhật vị trí chia bước nhỏ ≤ 0,25 m để không xuyên
// tường/nhảy qua vật cản ở tốc độ cao.
const BIKE_ACCEL = 6;
const BIKE_BRAKE = 11;
const BIKE_REVERSE_ACCEL = 3;
const BIKE_REVERSE_MAX = 2;
const BIKE_DRAG = 2;
const BIKE_WHEELBASE = 1.35;
const BIKE_MOUNT_RADIUS = 2.2; // m — đứng trong tầm này mới hiện "E — Lên xe"
const BIKE_DISMOUNT_MAX_SPEED = 0.5; // m/s — chỉ xuống xe khi đã dừng/gần dừng

// --- Hằng số animation (đợt sửa lần 2) --------------------------------------
// Chiều dài chân hông→cổ chân (m): hông y 0,80 − cổ chân y 0,07.
const LEG_LEN = 0.73;
const WALK_SWING = 0.5; // rad — biên độ đung đưa chân khi đi (bước 0,70 m)
const RUN_SWING = 0.62; // rad — khi chạy (bước 0,85 m)

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function pointInBuilding(x: number, z: number): boolean {
  return BUILDING_COLLIDERS.some(
    (c) => x >= c.box.minX && x <= c.box.maxX && z >= c.box.minZ && z <= c.box.maxZ,
  );
}

export default function Player() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  const groupRef = useRef<THREE.Group>(null!);
  const nameplateGroupRef = useRef<THREE.Group>(null!);
  // Khớp nhân vật (StudentAvatar lái hình học, Player lái góc quay):
  const bodyRef = useRef<THREE.Group>(null!);
  const legLRef = useRef<THREE.Group>(null!);
  const legRRef = useRef<THREE.Group>(null!);
  const kneeLRef = useRef<THREE.Group>(null!);
  const kneeRRef = useRef<THREE.Group>(null!);
  const footLRef = useRef<THREE.Group>(null!);
  const footRRef = useRef<THREE.Group>(null!);
  const armLRef = useRef<THREE.Group>(null!);
  const armRRef = useRef<THREE.Group>(null!);
  const elbowLRef = useRef<THREE.Group>(null!);
  const elbowRRef = useRef<THREE.Group>(null!);
  const joints: FigureJoints = {
    body: bodyRef,
    armL: armLRef,
    armR: armRRef,
    elbowL: elbowLRef,
    elbowR: elbowRRef,
    legL: legLRef,
    legR: legRRef,
    kneeL: kneeLRef,
    kneeR: kneeRRef,
    footL: footLRef,
    footR: footRRef,
  };

  // Balô: tháo/lắp được qua hook __bkhn.setBackpack (kiểm tra model/áo) hoặc từ Character Creator.
  const [backpackOn, setBackpackOn] = useState<boolean>(playerState.avatarBackpack);
  const backpackRef = useRef<boolean>(playerState.avatarBackpack);
  const setBackpack = (v: boolean) => {
    backpackRef.current = !!v;
    playerState.avatarBackpack = !!v;
    setBackpackOn(!!v);
  };

  // Việc 2 — Tùy chỉnh nhân vật, giới tính, kiểu tóc, trang phục, kính & dây đeo thẻ SV
  const [avatarName, setAvatarName] = useState<string>(playerState.avatarName || 'Sinh viên');
  const [gender, setGender] = useState<AvatarGender>(playerState.avatarGender);
  const [hairStyle, setHairStyle] = useState<AvatarHairStyle>(playerState.avatarHairStyle);
  const [outfit, setOutfit] = useState<AvatarOutfitId>(playerState.avatarOutfit);
  const [skirtOn, setSkirtOn] = useState<boolean>(playerState.avatarSkirt);
  const [glassesOn, setGlassesOn] = useState<boolean>(playerState.avatarGlasses);
  const [lanyardOn, setLanyardOn] = useState<boolean>(playerState.avatarLanyard);
  const nameplateTex = usePlayerNameplateTexture(avatarName);

  // PR8 — Khởi tạo trạng thái ngồi học cục bộ (khôi phục nguyên trạng khi chuyển từ Zen 2D về 3D).
  const initialSeatDef =
    playerState.inLibraryLobby && playerState.seated && playerState.seatId
      ? getSeatDefinition(playerState.seatId)
      : undefined;
  const seatingStateRef = useRef<LocalSeatingState>(
    initialSeatDef
      ? {
          status: 'seated',
          studyRoomId: initialSeatDef.studyRoomId,
          seatId: initialSeatDef.seatId,
          seatLabel: initialSeatDef.label,
          tableId: initialSeatDef.tableId,
          anchorPos: { x: initialSeatDef.x, z: initialSeatDef.z },
          facing: initialSeatDef.facing,
          standUpPos: computeSafeStandUpPosition(initialSeatDef, playerState.pos),
          transitionLock: false,
        }
      : createInitialSeatingState(),
  );
  const [isSeated, setIsSeated] = useState<boolean>(
    seatingStateRef.current.status === 'seated',
  );

  const syncSeatingToPlayerState = (nextState: LocalSeatingState) => {
    seatingStateRef.current = nextState;
    const seatedNow = nextState.status === 'seated' && !!nextState.seatId;
    playerState.seated = seatedNow;
    playerState.seatId = nextState.seatId;
    setIsSeated(seatedNow);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bkhn:seat-change', {
          detail: {
            seated: seatedNow,
            seatId: nextState.seatId,
            seatLabel: nextState.seatLabel,
            studyRoomId: nextState.studyRoomId,
          },
        }),
      );
    }
  };

  const applyPoseImmediately = (seatedNow: boolean) => {
    const targets = seatedNow
      ? computeSeatedPoseTargets(0)
      : computeNaturalGaitTargets(0, WALK_SWING, 0, 0, false);
    if (legLRef.current) legLRef.current.rotation.x = targets.legLTarget;
    if (legRRef.current) legRRef.current.rotation.x = targets.legRTarget;
    if (kneeLRef.current) kneeLRef.current.rotation.x = targets.kneeLTarget;
    if (kneeRRef.current) kneeRRef.current.rotation.x = targets.kneeRTarget;
    if (footLRef.current) footLRef.current.rotation.x = targets.footLTarget;
    if (footRRef.current) footRRef.current.rotation.x = targets.footRTarget;
    if (armLRef.current) armLRef.current.rotation.x = targets.armLTarget;
    if (armRRef.current) armRRef.current.rotation.x = targets.armRTarget;
    if (elbowLRef.current) elbowLRef.current.rotation.x = targets.elbowLTarget;
    if (elbowRRef.current) elbowRRef.current.rotation.x = targets.elbowRTarget;
    if (bodyRef.current) {
      bodyRef.current.position.y = targets.bodyBobTarget;
      bodyRef.current.rotation.z = targets.bodyRollTarget;
      bodyRef.current.rotation.x = targets.bodyLeanTarget;
    }
    if (groupRef.current) {
      groupRef.current.position.y = seatedNow ? SEATED_GROUP_Y_OFFSET : 0;
    }
  };

  const syncCameraTransform = () => {
    if (viewModeRef.current === 'top') {
      camera.position.set(0, 160, 5.01);
      camera.lookAt(0, 0, 5);
      camera.updateMatrixWorld();
      return;
    }
    const seatedNow = seatingStateRef.current.status === 'seated';
    const libY = playerState.inLibraryLobby && !seatedNow ? playerState.libraryY : 0;
    const target = new THREE.Vector3(
      posRef.current.x,
      (ridingRef.current ? 1.4 : seatedNow ? 0.95 : 1.2) + libY,
      posRef.current.z,
    );
    const placeCamera = (d: number): THREE.Vector3 => {
      const cp = Math.cos(pitchRef.current);
      const sp = Math.sin(pitchRef.current);
      return new THREE.Vector3(
        target.x + Math.sin(yawRef.current) * cp * d,
        target.y + sp * d,
        target.z + Math.cos(yawRef.current) * cp * d,
      );
    };
    let d = distRef.current;
    if (ridingRef.current) d = Math.max(d, 7.5);
    if (playerState.inClassroom) d = Math.min(d, 4.5);
    if (playerState.inLibraryLobby) d = Math.min(d, 6.2);
    let camPos = placeCamera(d);
    if (playerState.inClassroom) {
      camPos.x = clamp(camPos.x, -4.3, 4.3);
      camPos.z = clamp(camPos.z, -2.8, 2.8);
      camPos.y = Math.min(camPos.y, 2.85);
    } else if (playerState.inLibraryLobby) {
      camPos.x = clamp(camPos.x, -34.8, 34.8);
      camPos.z = clamp(camPos.z, -37.6, 26.8);
      camPos.y = clamp(camPos.y, libY + 0.35, libY + 8.5);
    }
    let guard = 0;
    while (
      guard < 24 &&
      d > 2.2 &&
      !playerState.inClassroom &&
      !playerState.inLibraryLobby &&
      pointInBuilding(camPos.x, camPos.z)
    ) {
      d *= 0.85;
      camPos = placeCamera(d);
      guard += 1;
    }
    camPos.y = Math.max(CAM_MIN_Y, camPos.y);
    camera.position.copy(camPos);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  };

  useEffect(() => {
    if (seatingStateRef.current.status === 'seated') {
      applyPoseImmediately(true);
      if (groupRef.current && seatingStateRef.current.anchorPos) {
        groupRef.current.position.set(
          seatingStateRef.current.anchorPos.x,
          SEATED_GROUP_Y_OFFSET,
          seatingStateRef.current.anchorPos.z,
        );
        if (typeof seatingStateRef.current.facing === 'number') {
          groupRef.current.rotation.y = seatingStateRef.current.facing;
        }
      }
    } else {
      playerState.pos = { ...posRef.current };
      applyPoseImmediately(false);
      if (groupRef.current) {
        groupRef.current.position.set(posRef.current.x, 0, posRef.current.z);
        groupRef.current.rotation.y = facingRef.current;
      }
    }
    syncCameraTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forceClearSeat = () => {
    if (seatingStateRef.current.status === 'seated' || playerState.seated || playerState.seatId) {
      applyPoseImmediately(false);
      syncSeatingToPlayerState(createInitialSeatingState());
    }
  };

  useEffect(() => {
    const onOutfitChange = () => {
      setAvatarName(playerState.avatarName || 'Sinh viên');
      setGender(playerState.avatarGender);
      setHairStyle(playerState.avatarHairStyle);
      setOutfit(playerState.avatarOutfit);
      setSkirtOn(!!playerState.avatarSkirt);
      setGlassesOn(playerState.avatarGlasses);
      setLanyardOn(playerState.avatarLanyard);
      backpackRef.current = !!playerState.avatarBackpack;
      setBackpackOn(!!playerState.avatarBackpack);
    };
    window.addEventListener('bkhn:outfit', onOutfitChange);
    return () => window.removeEventListener('bkhn:outfit', onOutfitChange);
  }, []);

  // Vị trí logic (mặt đất) — nguồn thật duy nhất; group.position chỉ để hiển thị.
  const posRef = useRef<Vec2>(
    initialSeatDef
      ? { x: initialSeatDef.x, z: initialSeatDef.z }
      : playerState.inLibraryLobby
        ? resolveLibraryLobbyCollisions({ ...playerState.pos }, AVATAR.radius).pos
        : playerState.inClassroom
          ? resolveClassroomCollisions({ ...playerState.pos }, AVATAR.radius).pos
          : { ...playerState.pos },
  );
  // F5b — khởi tạo yaw/pitch từ góc đã lưu (reload trong phòng khôi phục
  // hướng nhìn bảng); null thì dùng mặc định (yaw π/2 hướng tây từ cổng Trần Đại Nghĩa vào trường).
  const yawRef = useRef(playerState.cameraYaw ?? Math.PI / 2); // hướng nhìn ban đầu: -X (tây, từ cổng Trần Đại Nghĩa vào trong trường)
  const pitchRef = useRef(playerState.cameraPitch ?? 0.18); // nhìn hơi chúc xuống — đủ thấy ngọn các công trình cao
  const distRef = useRef(playerState.inClassroom || playerState.inLibraryLobby ? 3 : 7);
  const facingRef = useRef(
    initialSeatDef ? initialSeatDef.facing : (playerState.facing ?? -Math.PI / 2),
  );
  const walkPhaseRef = useRef(0);
  const moveBlendRef = useRef(0); // 0 = idle, 1 = đi/chạy hết cỡ (nội suy mềm)
  const prevHitRef = useRef<string | null>(null);
  const lastResetRef = useRef(playerInput.resetToken);
  // --- Xe máy (đợt 3 giai đoạn 4): Player là nguồn thật duy nhất ghi bikeState.
  const ridingRef = useRef(bikeState.riding);
  const bikePosRef = useRef<Vec2>({ ...bikeState.pos });
  const bikeHeadingRef = useRef(bikeState.heading);
  const bikeSpeedRef = useRef(bikeState.speed);
  const bikeSteerRef = useRef(0);
  const bikeLeanRef = useRef(0);
  const prevBikeHitRef = useRef<string | null>(null);
  const lastDoorNoticeRef = useRef(0);
  const syncBikeState = () => {
    bikeState.pos = { ...bikePosRef.current };
    bikeState.heading = bikeHeadingRef.current;
    bikeState.speed = bikeSpeedRef.current;
    bikeState.steer = bikeSteerRef.current;
    bikeState.lean = bikeLeanRef.current;
    bikeState.riding = ridingRef.current;
  };
  const keysRef = useRef<Set<string>>(new Set());
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  // --- Hành động xe máy (đợt 3 giai đoạn 4) — dùng ref để hook __bkhn
  // (tạo một lần trong useEffect) không bao giờ đọc closure cũ.
  const mountBike = (): { ok: boolean; reason?: string } => {
    if (ridingRef.current) return { ok: false, reason: 'riding' };
    if (playerState.inClassroom || playerState.inLibraryLobby) return { ok: false, reason: 'classroom' };
    if (playerState.uiLocked) return { ok: false, reason: 'ui-locked' };
    const d = Math.hypot(posRef.current.x - bikePosRef.current.x, posRef.current.z - bikePosRef.current.z);
    if (d > BIKE_MOUNT_RADIUS) return { ok: false, reason: 'too-far' };
    ridingRef.current = true;
    bikeSpeedRef.current = 0;
    bikeSteerRef.current = 0;
    bikeLeanRef.current = 0;
    facingRef.current = bikeHeadingRef.current;
    // Camera về sau xe, hơi cao để thấy đường trước.
    yawRef.current = bikeHeadingRef.current + Math.PI;
    pitchRef.current = Math.max(pitchRef.current, 0.18);
    distRef.current = Math.max(distRef.current, 8);
    posRef.current = { ...bikePosRef.current };
    // Đợt 5 — ghi playerState ngay (cầu nối multiplayer đọc playerState
    // mỗi 100 ms, không chờ frame sau — SwiftShader chậm, frame có thể
    // cách nhau vài giây).
    playerState.pos = { ...posRef.current };
    playerState.facing = facingRef.current;
    playerState.riding = true;
    syncBikeState();
    return { ok: true };
  };
  const dismountBike = (): { ok: boolean; reason?: string } => {
    if (!ridingRef.current) return { ok: false, reason: 'not-riding' };
    if (Math.abs(bikeSpeedRef.current) > BIKE_DISMOUNT_MAX_SPEED) {
      return { ok: false, reason: 'moving' };
    }
    const h = bikeHeadingRef.current;
    // Trái người lái = +X khi mặt +Z (quy ước đợt 3 giai đoạn 1): left =
    // (cos h, −sin h), right = (−cos h, sin h). Thử trái → phải → sau → trước.
    const left = { x: Math.cos(h), z: -Math.sin(h) };
    const right = { x: -Math.cos(h), z: Math.sin(h) };
    const fwd = { x: Math.sin(h), z: Math.cos(h) };
    const cands: Vec2[] = [
      { x: bikePosRef.current.x + left.x * 1.2, z: bikePosRef.current.z + left.z * 1.2 },
      { x: bikePosRef.current.x + right.x * 1.2, z: bikePosRef.current.z + right.z * 1.2 },
      { x: bikePosRef.current.x - fwd.x * 1.6, z: bikePosRef.current.z - fwd.z * 1.6 },
      { x: bikePosRef.current.x + fwd.x * 1.6, z: bikePosRef.current.z + fwd.z * 1.6 },
    ];
    let spot: Vec2 | null = null;
    for (const c of cands) {
      const { pos, hit } = resolveCollisions(c, AVATAR.radius);
      if (hit === null && Math.hypot(pos.x - c.x, pos.z - c.z) < 0.01) {
        spot = c;
        break;
      }
    }
    // Chỗ chật cả 4 hướng: tìm điểm trống gần nhất trong 4 m.
    if (!spot) spot = findFreeSpotNear(bikePosRef.current, 1.2, 4);
    if (!spot) return { ok: false, reason: 'blocked' };
    posRef.current = spot;
    facingRef.current = h;
    ridingRef.current = false;
    // Đợt 5 — ghi playerState ngay (xem mountBike).
    playerState.pos = { ...spot };
    playerState.facing = h;
    playerState.riding = false;
    bikeSpeedRef.current = 0;
    bikeSteerRef.current = 0;
    bikeLeanRef.current = 0;
    bikeInput.throttle = 0;
    bikeInput.brake = 0;
    bikeInput.steer = 0;
    syncBikeState();
    return { ok: true };
  };
  const callBike = (): { ok: boolean; reason?: string } => {
    if (playerState.inClassroom || playerState.inLibraryLobby) return { ok: false, reason: 'classroom' };
    if (ridingRef.current) return { ok: false, reason: 'riding' };
    // Chỉ di chuyển CÙNG MỘT xe (không tạo instance mới — Motorbike chỉ
    // mount 1 lần trong CampusScene, bikeState.instances luôn = 1).
    const spot = findFreeSpotNear(posRef.current, 2.5, 8);
    if (!spot) return { ok: false, reason: 'no-spot' };
    bikePosRef.current = spot;
    // Đầu xe hướng về phía người chơi để lên xe là chạy được ngay.
    bikeHeadingRef.current = Math.atan2(posRef.current.x - spot.x, posRef.current.z - spot.z);
    syncBikeState();
    return { ok: true };
  };
  const recallBike = (): { ok: boolean; reason?: string } => {
    if (playerState.inClassroom || playerState.inLibraryLobby) return { ok: false, reason: 'classroom' };
    const road = nearestRoadPoint(bikePosRef.current);
    const spot = findFreeSpotNear(road, 0, 4);
    if (!spot) return { ok: false, reason: 'no-spot' };
    bikePosRef.current = spot;
    // Hướng xe dọc đường gần nhất (tính từ đoạn polyline gần nhất).
    let bestDir: Vec2 | null = null;
    let bestD = Infinity;
    for (const r of ROADS) {
      for (let i = 0; i + 1 < r.points.length; i++) {
        const a = r.points[i];
        const b = r.points[i + 1];
        const mx = (a.x + b.x) / 2;
        const mz = (a.z + b.z) / 2;
        const d = Math.hypot(mx - spot.x, mz - spot.z);
        if (d < bestD) {
          bestD = d;
          bestDir = { x: b.x - a.x, z: b.z - a.z };
        }
      }
    }
    if (bestDir) bikeHeadingRef.current = Math.atan2(bestDir.x, bestDir.z);
    bikeSpeedRef.current = 0;
    bikeSteerRef.current = 0;
    bikeLeanRef.current = 0;
    if (ridingRef.current) {
      // Đang ngồi trên xe thì người đi theo xe về đường, vẫn đang lái.
      posRef.current = { ...spot };
      facingRef.current = bikeHeadingRef.current;
    }
    syncBikeState();
    return { ok: true };
  };
  // Test-only: đặt xe ở vị trí/hướng cho trước (kiểm tra va chạm/xuống xe
  // ở chỗ chật) — gameplay thật không dùng.
  const setBikePose = (x: number, z: number, heading: number) => {
    bikePosRef.current = { x, z };
    bikeHeadingRef.current = heading;
    bikeSpeedRef.current = 0;
    bikeSteerRef.current = 0;
    bikeLeanRef.current = 0;
    if (ridingRef.current) {
      posRef.current = { x, z };
      facingRef.current = heading;
    }
    syncBikeState();
  };
  const bikeActionsRef = useRef({ mountBike, dismountBike, callBike, recallBike, setBikePose });
  bikeActionsRef.current = { mountBike, dismountBike, callBike, recallBike, setBikePose };

  // --- Hành động ngồi học tại bàn thư viện (PR8 Local Interactive Seating) ---
  const sitAtSeat = (
    seatId: string,
  ): {
    ok: boolean;
    reason?: string;
    message?: string;
    seatId?: string;
    label?: string;
  } => {
    const res = transitionToSeated(seatingStateRef.current, {
      seatId,
      playerPos: posRef.current,
      inLibraryLobby: playerState.inLibraryLobby,
      libraryFloor: playerState.libraryFloor,
      inClassroom: playerState.inClassroom,
      bikeRiding: ridingRef.current,
      uiLocked: playerState.uiLocked,
    });
    if (!res.ok || !res.seat) {
      return { ok: false, reason: res.reason, message: res.message };
    }
    keysRef.current.clear();
    playerInput.move.x = 0;
    playerInput.move.y = 0;
    playerInput.run = false;
    moveBlendRef.current = 0;
    posRef.current = { x: res.seat.x, z: res.seat.z };
    facingRef.current = res.seat.facing;
    playerState.pos = { ...posRef.current };
    playerState.facing = res.seat.facing;
    playerState.moving = false;
    distRef.current = Math.min(distRef.current, 3.2);
    pitchRef.current = Math.max(pitchRef.current, 0.24);
    if (groupRef.current) {
      groupRef.current.position.set(res.seat.x, SEATED_GROUP_Y_OFFSET, res.seat.z);
      groupRef.current.rotation.y = res.seat.facing;
    }
    applyPoseImmediately(true);
    syncSeatingToPlayerState(res.state);
    syncCameraTransform();
    return { ok: true, seatId: res.seat.seatId, label: res.seat.label };
  };

  const standUp = (): {
    ok: boolean;
    reason?: string;
    releasedSeatId?: string | null;
    pos?: { x: number; z: number };
  } => {
    const res = transitionToStanding(seatingStateRef.current);
    if (!res.ok || !res.standUpPos) {
      return { ok: false, reason: res.reason };
    }
    keysRef.current.clear();
    playerInput.move.x = 0;
    playerInput.move.y = 0;
    playerInput.run = false;
    moveBlendRef.current = 0;
    posRef.current = { ...res.standUpPos };
    if (typeof res.facing === 'number') {
      facingRef.current = res.facing;
    }
    playerState.pos = { ...res.standUpPos };
    playerState.facing = facingRef.current;
    playerState.moving = false;
    if (groupRef.current) {
      groupRef.current.position.set(
        res.standUpPos.x,
        playerState.inLibraryLobby ? playerState.libraryY : 0,
        res.standUpPos.z,
      );
      groupRef.current.rotation.y = facingRef.current;
    }
    applyPoseImmediately(false);
    syncSeatingToPlayerState(res.state);
    syncCameraTransform();
    return {
      ok: true,
      releasedSeatId: res.releasedSeatId,
      pos: { ...res.standUpPos },
    };
  };

  const seatActionsRef = useRef({ sitAtSeat, standUp, forceClearSeat });
  seatActionsRef.current = { sitAtSeat, standUp, forceClearSeat };
  // --- Dịch chuyển nhanh (đợt 3 giai đoạn 5) ---------------------------------
  // Chỉ thay VỊ TRÍ + hướng nhìn: không chạm quest/progress/điểm (không
  // gọi bất kỳ hàm store nào). Khóa chống bấm chồng: fastTravelState.traveling
  // giữ trong lúc chuyển cảnh (tự mở lại sau 900 ms — đủ phủ fade 350 +
  // 350 ms của page); bấm thêm trong lúc đó trả { ok: false, reason: 'busy' }.
  // Đang lái xe → tự dừng xe, người về đi bộ tại đích, xe về điểm đỗ hợp lệ
  // gần đích (đúng cơ chế findFreeSpotNear/nearestRoadPoint của giai đoạn 4,
  // không nhân bản xe — Motorbike chỉ mount 1 lần, bikeState.instances = 1).
  // Đang trong phòng học → ra khỏi phòng trước (dispatch bkhn:classroom để
  // page đồng bộ), rồi đặt người xuống campus. Xóa sạch phím đang giữ để
  // không kẹt phím/tự di chuyển sau khi tới (vd dịch chuyển khi panel học
  // đang mở). Nền + collider khu đích không cần tải thêm: toàn bộ scene +
  // collider là hằng số module-level, đã có sẵn từ lúc vào trường; điểm
  // đến vẫn chạy qua resolveCollisions để một điểm lỗi không đặt người
  // vào tường/hồ (các điểm trong FAST_TRAVEL_DESTINATIONS đã kiểm là
  // resolve trả về đúng điểm đó).
  const fastTravel = (destId: string): { ok: boolean; reason?: string } => {
    const dest = FAST_TRAVEL_DESTINATIONS.find((d) => d.id === destId);
    if (!dest) return { ok: false, reason: 'unknown-dest' };
    if (fastTravelState.traveling) return { ok: false, reason: 'busy' };
    fastTravelState.traveling = true;
    window.setTimeout(() => {
      fastTravelState.traveling = false;
    }, 900);
    fastTravelState.count += 1;
    fastTravelState.lastDestId = destId;
    // Xóa phím đang giữ (cả phím vật lý lẫn joystick/mobile) trước khi đặt xuống.
    keysRef.current.clear();
    playerInput.move.x = 0;
    playerInput.move.y = 0;
    playerInput.run = false;
    bikeInput.throttle = 0;
    bikeInput.brake = 0;
    bikeInput.steer = 0;
    // Đang lái → dừng xe, người đi bộ tại đích, xe về điểm đỗ hợp lệ gần đích.
    if (ridingRef.current) {
      ridingRef.current = false;
      bikeSpeedRef.current = 0;
      bikeSteerRef.current = 0;
      bikeLeanRef.current = 0;
      const destPos: Vec2 = { x: dest.x, z: dest.z };
      const spot =
        findFreeSpotNear(destPos, 2.5, 8) ??
        findFreeSpotNear(nearestRoadPoint(destPos), 0, 4) ?? { ...BIKE_PARK };
      bikePosRef.current = spot;
      // Đầu xe hướng về phía người để lên xe là chạy được ngay.
      bikeHeadingRef.current = Math.atan2(dest.x - spot.x, dest.z - spot.z);
      syncBikeState();
    }
    // Đang ngồi học hoặc đang trong phòng học / sảnh thư viện → tự đứng dậy và ra khỏi phòng trước.
    seatActionsRef.current.forceClearSeat();
    if (playerState.inClassroom) {
      playerState.inClassroom = false;
      window.dispatchEvent(new CustomEvent('bkhn:classroom', { detail: { inClassroom: false } }));
    }
    if (playerState.inLibraryLobby) {
      playerState.inLibraryLobby = false;
      window.dispatchEvent(new CustomEvent('bkhn:library-lobby', { detail: { inLibraryLobby: false } }));
    }
    posRef.current = resolveCollisions({ x: dest.x, z: dest.z }, AVATAR.radius).pos;
    facingRef.current = dest.facing;
    yawRef.current = dest.yaw;
    playerState.cameraYaw = dest.yaw;
    // Đợt 5 — ghi playerState ngay để cầu nối multiplayer gửi vị trí
    // mới trong 100 ms (không chờ frame sau — xem mountBike).
    playerState.pos = { ...posRef.current };
    playerState.facing = dest.facing;
    pitchRef.current = 0.18;
    playerState.cameraPitch = 0.18;
    distRef.current = 7;
    viewModeRef.current = 'follow';
    moveBlendRef.current = 0;
    prevHitRef.current = null;
    return { ok: true };
  };
  const fastTravelRef = useRef(fastTravel);
  fastTravelRef.current = fastTravel;
  // window.__bkhn = { getPos, teleport(x, z, yaw?), topView() } — dùng để chụp
  // ảnh từ trên cao và đặt avatar đúng đầu mỗi chặng kiểm tra trong Playwright.
  const viewModeRef = useRef<'follow' | 'top'>(playerState.viewMode ?? 'follow');
  useEffect(() => {
    const hook = {
      getPos: () => ({ ...posRef.current }),
      // F5b — góc camera hiện tại (page lưu vào questState khi ở trong phòng).
      getYaw: () => yawRef.current,
      getPitch: () => pitchRef.current,
      teleport: (x: number, z: number, yaw?: number, pitch?: number) => {
        seatActionsRef.current.forceClearSeat();
        // Đẩy ra khỏi collider (hồ/tòa nhà) để một điểm teleport lỗi không đặt
        // avatar vào trong nước/tường — gameplay thật không bao giờ vào được
        // đó vì va chạm đã chặn lúc di chuyển.
        const resolved = playerState.inClassroom
          ? resolveClassroomCollisions({ x, z }, AVATAR.radius).pos
          : playerState.inLibraryLobby
            ? resolveLibraryLobbyCollisions({ x, z }, AVATAR.radius, playerState.libraryFloor).pos
            : resolveCollisions({ x, z }, AVATAR.radius).pos;
        posRef.current = resolved;
        // Đợt 5 — ghi playerState ngay để cầu nối multiplayer gửi vị trí
        // mới trong 100 ms (không chờ frame sau — xem mountBike).
        playerState.pos = { ...resolved };
        if (typeof yaw === 'number') yawRef.current = yaw;
        if (typeof pitch === 'number') pitchRef.current = pitch;
        viewModeRef.current = 'follow';
        let groundY = 0;
        if (playerState.inLibraryLobby) {
          const elev = computeLibraryElevation(resolved.x, resolved.z, playerState.libraryFloor, playerState.libraryY);
          playerState.libraryY = elev.y;
          playerState.libraryFloor = elev.floor;
          groundY = elev.y;
        } else if (!playerState.inClassroom) {
          groundY = getCampusGroundElevation(resolved.x, resolved.z);
        }
        if (groupRef.current) {
          groupRef.current.position.set(resolved.x, groundY, resolved.z);
        }
        syncCameraTransform();
      },
      topView: () => {
        viewModeRef.current = 'top';
      },
      followView: () => {
        viewModeRef.current = 'follow';
      },
      // Độ phủ lá + bèo Hồ Tiền (0..1), đo thật trong LotusField.
      lakeCoverage: () => playerState.lakeCoverage,
      // Đợt sửa lần 2 — tháo/lắp balô để kiểm tra model người và áo độc lập.
      setBackpack: (v: boolean) => setBackpack(!!v),
      getBackpack: () => backpackRef.current,
      // Đợt 3 giai đoạn 4 — xe máy: trạng thái + hành động (page gọi qua hook).
      getBike: () => ({
        pos: { ...bikePosRef.current },
        heading: bikeHeadingRef.current,
        speed: bikeSpeedRef.current,
        steer: bikeSteerRef.current,
        lean: bikeLeanRef.current,
        riding: ridingRef.current,
        instances: bikeState.instances,
      }),
      mountBike: () => bikeActionsRef.current.mountBike(),
      dismountBike: () => bikeActionsRef.current.dismountBike(),
      callBike: () => bikeActionsRef.current.callBike(),
      recallBike: () => bikeActionsRef.current.recallBike(),
      setBikePose: (x: number, z: number, heading: number) =>
        bikeActionsRef.current.setBikePose(x, z, heading),
      // Đợt 3 giai đoạn 5 — dịch chuyển nhanh (trả { ok, reason? }).
      fastTravel: (destId: string) => fastTravelRef.current(destId),
      getFastTravel: () => ({
        traveling: fastTravelState.traveling,
        count: fastTravelState.count,
        lastDestId: fastTravelState.lastDestId,
      }),
      // Đợt sửa lần 2 — số đo animation thật: phase, blend, góc các khớp,
      // cao độ cổ chân hai bên (đế giày ≈ cổ chân − 0,07 m khi bàn chân phẳng).
      // Góc khớp là rotation.x THÔ: gối DƯƠNG = gập đúng (cẳng chân về sau),
      // khuỷu ÂM = gập đúng (cẳng tay về trước). (Trước đợt 3, getPose báo
      // knee = −rotation.x nên dấu gập ngược của gối bị che.)
      getPose: () => {
        const footL = new THREE.Vector3();
        const footR = new THREE.Vector3();
        if (footLRef.current) footLRef.current.getWorldPosition(footL);
        if (footRRef.current) footRRef.current.getWorldPosition(footR);
        return {
          pos: { ...posRef.current },
          facing: facingRef.current,
          phase: walkPhaseRef.current,
          blend: moveBlendRef.current,
          moving: playerInput.move.x !== 0 || playerInput.move.y !== 0,
          run: playerInput.run,
          riding: ridingRef.current,
          seated: seatingStateRef.current.status === 'seated',
          seatId: seatingStateRef.current.seatId,
          bikeSpeed: bikeSpeedRef.current,
          bikeHeading: bikeHeadingRef.current,
          bikePos: { ...bikePosRef.current },
          legL: legLRef.current?.rotation.x ?? 0,
          legR: legRRef.current?.rotation.x ?? 0,
          kneeL: kneeLRef.current?.rotation.x ?? 0,
          kneeR: kneeRRef.current?.rotation.x ?? 0,
          footL: footLRef.current?.rotation.x ?? 0,
          footR: footRRef.current?.rotation.x ?? 0,
          armL: armLRef.current?.rotation.x ?? 0,
          armR: armRRef.current?.rotation.x ?? 0,
          elbowL: elbowLRef.current?.rotation.x ?? 0,
          elbowR: elbowRRef.current?.rotation.x ?? 0,
          ankleYL: +footL.y.toFixed(3),
          ankleYR: +footR.y.toFixed(3),
        };
      },
      // Đợt sửa lần 2 — bounding box thật của avatar THEO HỆ TỌA ĐỘ LOCAL
      // (đổi từng hình học về hệ local của group rồi hợp nhất, nên số đo
      // rộng/sâu không phụ thuộc hướng quay của avatar; Box3.setFromObject
      // không dùng vì nó biến đổi góc hộp và thổi phồng vật xoay).
      measureAvatar: () => {
        const g = groupRef.current;
        if (!g) return null;
        g.updateWorldMatrix(true, true);
        const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
        const box = new THREE.Box3();
        const tmp = new THREE.Box3();
        g.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh || !mesh.geometry || mesh.userData?.ignoreMeasure) return;
          const geo = mesh.geometry as THREE.BufferGeometry;
          if (!geo.boundingBox) geo.computeBoundingBox();
          if (!geo.boundingBox) return;
          tmp.copy(geo.boundingBox).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
          box.union(tmp);
        });
        if (box.isEmpty()) return null;
        const size = new THREE.Vector3();
        box.getSize(size);
        return {
          min: { x: +box.min.x.toFixed(3), y: +box.min.y.toFixed(3), z: +box.min.z.toFixed(3) },
          max: { x: +box.max.x.toFixed(3), y: +box.max.y.toFixed(3), z: +box.max.z.toFixed(3) },
          size: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) },
        };
      },
      // Bước 5 — vào/ra phòng học mô phỏng: đổi mode + teleport về spawn
      // tương ứng. Fade do page.tsx xử lý; page đồng bộ qua sự kiện
      // 'bkhn:classroom' { inClassroom }.
      enterClassroom: () => {
        seatActionsRef.current.forceClearSeat();
        // Xe không vào phòng học: nếu đang lái thì để xe ngoài sân, người
        // vào phòng ở trạng thái đi bộ (xe vẫn gọi lại được sau khi ra).
        if (ridingRef.current) {
          ridingRef.current = false;
          bikeSpeedRef.current = 0;
          bikeSteerRef.current = 0;
          bikeLeanRef.current = 0;
          syncBikeState();
        }
        playerState.inClassroom = true;
        posRef.current = { ...CLASSROOM.spawn };
        // Hướng nhìn = -(sin yaw, cos yaw): yaw = 0 → nhìn về -Z (bắc, về
        // phía bảng đen). yaw = π là SAI (nhìn về +Z, tường nam).
        yawRef.current = 0;
        playerState.cameraYaw = 0;
        // F5a — chúc camera xuống thêm (pitch 0.25): đầu avatar không còn
        // che dòng giữa bảng đen nhìn từ góc mặc định trong phòng.
        // (Pitch 0.38 đẩy cả bảng lên cao quá, tiêu đề cắt khỏi khung.)
        pitchRef.current = 0.25;
        playerState.cameraPitch = 0.25;
        // Phòng chỉ sâu 6 m: rút camera lại gần (3 m) để khung hình lớp học
        // không bị tường che (kẹp vị trí camera trong phòng ở useFrame).
        distRef.current = 3;
        viewModeRef.current = 'follow';
        window.dispatchEvent(new CustomEvent('bkhn:classroom', { detail: { inClassroom: true } }));
      },
      exitClassroom: () => {
        playerState.inClassroom = false;
        // Ra khỏi phòng về ngay cửa phòng học (chân bậc tam cấp C1),
        // quay mặt về bắc (yaw = 0) nhìn về quảng trường C1.
        posRef.current = { x: CLASSROOM_DOOR.pos.x, z: CLASSROOM_DOOR.pos.z + 2.5 };
        yawRef.current = 0;
        playerState.cameraYaw = 0;
        pitchRef.current = 0.18;
        playerState.cameraPitch = 0.18;
        viewModeRef.current = 'follow';
        window.dispatchEvent(new CustomEvent('bkhn:classroom', { detail: { inClassroom: false } }));
      },
      isInClassroom: () => playerState.inClassroom,
      enterLibraryLobby: () => {
        seatActionsRef.current.forceClearSeat();
        if (ridingRef.current) {
          ridingRef.current = false;
          bikeSpeedRef.current = 0;
          bikeSteerRef.current = 0;
          bikeLeanRef.current = 0;
          syncBikeState();
        }
        playerState.inClassroom = false;
        playerState.inLibraryLobby = true;
        playerState.libraryFloor = 1;
        playerState.libraryY = 0;
        posRef.current = { ...LIBRARY_LOBBY.spawn };
        facingRef.current = Math.PI;
        yawRef.current = 0; // nhìn thẳng về bắc (-Z), hướng tượng GS. Tạ Quang Bửu & tường nhị phân 0/1
        playerState.cameraYaw = 0;
        pitchRef.current = 0.2;
        playerState.cameraPitch = 0.2;
        distRef.current = 3.8;
        viewModeRef.current = 'follow';
        window.dispatchEvent(new CustomEvent('bkhn:library-lobby', { detail: { inLibraryLobby: true } }));
        window.dispatchEvent(new CustomEvent('bkhn:library-floor', { detail: { floor: 1 } }));
      },
      exitLibraryLobby: () => {
        seatActionsRef.current.forceClearSeat();
        playerState.inLibraryLobby = false;
        playerState.libraryFloor = 1;
        playerState.libraryY = 0;
        // Ra khỏi sảnh về trước mái hiên Thư viện (x = 38, z = 20.5), nhìn về bắc (yaw = 0) ra chữ HUST & sân trước
        posRef.current = { x: LIBRARY_DOOR.pos.x, z: 20.5 };
        facingRef.current = Math.PI;
        yawRef.current = 0;
        playerState.cameraYaw = 0;
        pitchRef.current = 0.18;
        playerState.cameraPitch = 0.18;
        distRef.current = 7;
        viewModeRef.current = 'follow';
        window.dispatchEvent(new CustomEvent('bkhn:library-lobby', { detail: { inLibraryLobby: false } }));
      },
      isInLibraryLobby: () => playerState.inLibraryLobby,
      getLibraryFloor: () => ({ floor: playerState.libraryFloor, y: playerState.libraryY }),
      setLibraryFloor: (
        floor: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10,
        x?: number,
        z?: number,
        yaw?: number,
        pitch?: number,
      ) => {
        if (!playerState.inLibraryLobby) return { ok: false, reason: 'not-in-library' };
        seatActionsRef.current.forceClearSeat();
        keysRef.current.clear();
        playerInput.move.x = 0;
        playerInput.move.y = 0;
        playerInput.run = false;
        moveBlendRef.current = 0;
        const trans = resolveLibraryFloorTransition(
          floor,
          x,
          z,
          yaw,
          pitch,
          AVATAR.radius,
          AVATAR.height,
        );
        const resolvedFloor = trans.location.floor;
        playerState.libraryFloor = resolvedFloor;
        playerState.libraryY = trans.location.y;
        posRef.current = { x: trans.location.x, z: trans.location.z };
        playerState.pos = { ...posRef.current };
        yawRef.current = trans.yaw;
        playerState.cameraYaw = trans.yaw;
        facingRef.current = trans.yaw + Math.PI;
        playerState.facing = facingRef.current;
        if (typeof pitch === 'number') {
          pitchRef.current = trans.pitch;
          playerState.cameraPitch = trans.pitch;
        }
        if (groupRef.current) {
          groupRef.current.position.set(trans.location.x, trans.location.y, trans.location.z);
          groupRef.current.rotation.y = facingRef.current;
        }
        const nearDoor = findNearestLibraryDoorway(resolvedFloor, trans.location.x, trans.location.z);
        const ground = queryLibraryGround(trans.location);
        playerState.librarySpatialDiag = {
          block: trans.location.block,
          floor: resolvedFloor,
          surfaceId: ground.surfaceId,
          grounded: ground.supported,
          lastCollisionId: null,
          nearestDoorId: nearDoor ? nearDoor.id : null,
        };
        syncCameraTransform();
        window.dispatchEvent(new CustomEvent('bkhn:library-floor', { detail: { floor: resolvedFloor } }));
        if (resolvedFloor >= 1 && resolvedFloor <= 5) {
          window.dispatchEvent(new CustomEvent('bkhn:elevator-call', { detail: { floor: resolvedFloor } }));
        }
        return {
          ok: true,
          floor: resolvedFloor,
          block: trans.location.block,
          pos: { x: trans.location.x, z: trans.location.z },
          y: trans.location.y,
        };
      },
      getLibrarySpatialDiagnostics: (): LibrarySpatialDiagnostics => {
        const floor = playerState.libraryFloor;
        const block = getBlockForFloor(floor);
        const px = posRef.current.x;
        const py = playerState.libraryY;
        const pz = posRef.current.z;
        const loc = createLibraryLocation(floor, px, pz, py);
        const ground = queryLibraryGround(loc);
        const nearDoor = findNearestLibraryDoorway(floor, px, pz);
        const nearSeat = findNearestLibrarySeat({ x: px, z: pz }, 100, 1);
        return {
          block,
          floor,
          pos: { x: px, y: py, z: pz },
          grounded: ground.supported,
          surfaceId: playerState.librarySpatialDiag.surfaceId ?? ground.surfaceId,
          lastCollisionId: playerState.librarySpatialDiag.lastCollisionId,
          collisionIds: playerState.librarySpatialDiag.lastCollisionId
            ? [playerState.librarySpatialDiag.lastCollisionId]
            : [],
          nearestDoorId: nearDoor ? nearDoor.id : null,
          nearestSeatId: nearSeat ? nearSeat.seat.seatId : null,
          nearestSeatFloor: 1,
          activeSeatId: seatingStateRef.current.seatId,
          debugCollisionOverlay: playerState.libraryCollisionDebug,
        };
      },
      setLibraryCollisionDebug: (enabled: boolean) => {
        playerState.libraryCollisionDebug = Boolean(enabled);
        return playerState.libraryCollisionDebug;
      },
      sitAtSeat: (seatId: string) => seatActionsRef.current.sitAtSeat(seatId),
      standUp: () => seatActionsRef.current.standUp(),
      getSeatState: () => ({
        seated: seatingStateRef.current.status === 'seated',
        status: seatingStateRef.current.status,
        seatId: seatingStateRef.current.seatId,
        seatLabel: seatingStateRef.current.seatLabel,
        studyRoomId: seatingStateRef.current.studyRoomId,
        pos: { ...posRef.current },
        facing: facingRef.current,
      }),
      projectSeatToScreen: (seatId: string) => {
        const seat = getSeatDefinition(seatId);
        if (!seat) return null;
        syncCameraTransform();
        camera.updateProjectionMatrix();
        const worldPt = new THREE.Vector3(seat.x, 0.44, seat.z);
        const ndc = worldPt.clone().project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        return {
          x: Math.round(rect.left + (ndc.x * 0.5 + 0.5) * rect.width),
          y: Math.round(rect.top + (-ndc.y * 0.5 + 0.5) * rect.height),
          inFront: ndc.z >= -1 && ndc.z <= 1,
        };
      },
    };
    (window as unknown as { __bkhn?: unknown; __bkhnLibrarySpatialDebug?: () => LibrarySpatialDiagnostics }).__bkhn = hook;
    (window as unknown as { __bkhnLibrarySpatialDebug?: () => LibrarySpatialDiagnostics }).__bkhnLibrarySpatialDebug =
      hook.getLibrarySpatialDiagnostics;
    return () => {
      if ((window as unknown as { __bkhn?: unknown }).__bkhn === hook) {
        delete (window as unknown as { __bkhn?: unknown }).__bkhn;
        delete (window as unknown as { __bkhnLibrarySpatialDebug?: unknown }).__bkhnLibrarySpatialDebug;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Bàn phím: WASD / mũi tên → playerInput.move, Shift = run, E = tương tác.
  useEffect(() => {
    const syncMove = () => {
      const k = keysRef.current;
      const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      playerInput.move.x = x;
      playerInput.move.y = y;
      playerInput.run = k.has('ShiftLeft') || k.has('ShiftRight');
    };
    // Đợt 3 mục 7: đang gõ trong ô nhập liệu (input pinyin của QuestPanel,
    // textarea/select/contentEditable) thì phím thuộc về ô đó — không
    // preventDefault (trước đây chặn mất W/A/S/D khi gõ, vd "jia" thành
    // "jiyou"), không thêm vào keysRef (nhân vật không đi trong lúc gõ).
    const isTypingTarget = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;
      if (!el || typeof el.tagName !== 'string') return false;
      const tag = el.tagName.toUpperCase();
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (
        e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' ||
        e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
        e.code === 'ShiftLeft' || e.code === 'ShiftRight'
      ) {
        e.preventDefault();
        keysRef.current.add(e.code);
        syncMove();
      }
      if (e.code === 'KeyE' && !e.repeat && !playerState.uiLocked) {
        // Bước 5: khi panel học mở (uiLocked) thì E không có tác dụng.
        window.dispatchEvent(new CustomEvent('bkhn:interact'));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      keysRef.current.delete(e.code);
      syncMove();
    };
    const onBlur = () => {
      keysRef.current.clear();
      syncMove();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // --- Kéo chuột trên canvas: xoay camera. Lăn chuột: zoom 4–10 m.
  useEffect(() => {
    const el = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      draggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Bỏ qua: trình duyệt không hỗ trợ capture trên phần tử này.
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      yawRef.current -= dx * LOOK_SPEED;
      pitchRef.current = clamp(pitchRef.current - dy * LOOK_SPEED, CAM_MIN_PITCH, CAM_MAX_PITCH);
    };
    const onPointerUp = () => {
      draggingRef.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distRef.current = clamp(
        distRef.current * Math.exp(e.deltaY * 0.001),
        CAM_MIN_DIST,
        CAM_MAX_DIST,
      );
    };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    // Về vị trí an toàn (luôn đưa nhân vật về Cổng Trần Đại Nghĩa ngoài sân trường)
    // khi HUD tăng playerInput.resetToken.
    if (playerInput.resetToken !== lastResetRef.current) {
      lastResetRef.current = playerInput.resetToken;
      seatActionsRef.current.forceClearSeat();
      // Đang lái thì xuống xe tại chỗ (xe ở yên vị trí cũ, gọi lại được).
      if (ridingRef.current) {
        ridingRef.current = false;
        bikeSpeedRef.current = 0;
        bikeSteerRef.current = 0;
        bikeLeanRef.current = 0;
        syncBikeState();
      }
      if (playerState.inClassroom) {
        playerState.inClassroom = false;
        window.dispatchEvent(new CustomEvent('bkhn:classroom', { detail: { inClassroom: false } }));
      }
      if (playerState.inLibraryLobby) {
        playerState.inLibraryLobby = false;
        window.dispatchEvent(new CustomEvent('bkhn:library-lobby', { detail: { inLibraryLobby: false } }));
      }
      posRef.current = { ...SPAWN };
      playerState.pos = { ...SPAWN };
      facingRef.current = -Math.PI / 2;
      playerState.facing = -Math.PI / 2;
      yawRef.current = Math.PI / 2;
      pitchRef.current = 0.18;
      distRef.current = 7;
      viewModeRef.current = 'follow';
      prevHitRef.current = null;
    }

    // Tiêu thụ lookDelta dùng chung (vùng xoay phải / joystick trên HUD):
    // cùng quy ước delta kéo như chuột, cộng dồn rồi reset về 0.
    if (playerInput.lookDelta.x !== 0 || playerInput.lookDelta.y !== 0) {
      yawRef.current -= playerInput.lookDelta.x;
      pitchRef.current = clamp(
        pitchRef.current - playerInput.lookDelta.y,
        CAM_MIN_PITCH,
        CAM_MAX_PITCH,
      );
      playerInput.lookDelta.x = 0;
      playerInput.lookDelta.y = 0;
    }

    // --- Lái xe (đợt 3 giai đoạn 4) — thay thế hoàn toàn di chuyển đi bộ ---
    // W ga, S phanh (chỉ lùi chậm khi gần dừng), A/D lái; animation đi bộ
    // dừng hẳn, collider người không va chạm ngược với chính xe của mình
    // (chỉ va chạm xe với môi trường qua resolveBikeCollisions).
    let moving = false;
    let effectivelyMoving = false;
    let speed: number = AVATAR.walkSpeed;
    let swing = WALK_SWING;
    if (ridingRef.current) {
      const k = keysRef.current;
      const locked = playerState.uiLocked;
      const pcThrottle = !locked && (k.has('KeyW') || k.has('ArrowUp')) ? 1 : 0;
      const pcBrake = !locked && (k.has('KeyS') || k.has('ArrowDown')) ? 1 : 0;
      const pcSteer =
        (!locked && (k.has('KeyD') || k.has('ArrowRight')) ? 1 : 0) -
        (!locked && (k.has('KeyA') || k.has('ArrowLeft')) ? 1 : 0);
      const throttle = Math.max(pcThrottle, locked ? 0 : bikeInput.throttle);
      const brake = Math.max(pcBrake, locked ? 0 : bikeInput.brake);
      const steerIn = clamp(pcSteer + (locked ? 0 : bikeInput.steer), -1, 1);
      let v = bikeSpeedRef.current;
      if (throttle > 0 && v < BIKE_MAX_SPEED) v += BIKE_ACCEL * throttle * delta;
      if (brake > 0) {
        if (v > 0.5) v -= BIKE_BRAKE * brake * delta;
        else v -= BIKE_REVERSE_ACCEL * brake * delta; // chỉ lùi chậm khi gần dừng
      } else if (throttle === 0) {
        // Trôi tự nhiên (không ga không phanh).
        if (v > 0) v = Math.max(0, v - BIKE_DRAG * delta);
        else if (v < 0) v = Math.min(0, v + BIKE_DRAG * delta);
      }
      v = clamp(v, -BIKE_REVERSE_MAX, BIKE_MAX_SPEED);
      // Góc lái thu hẹp theo tốc độ + nội suy mềm (không bẻ lái tức thời).
      // steerIn +1 = D/phải → bánh trước nghiêng phải (steer ÂM, vì
      // rotation.y DƯƠNG xoay đầu xe về TRÁI, +X khi mặt +Z); A/trái ngược lại.
      const steerTarget = -steerIn * 0.5 * (1 / (1 + Math.abs(v) * 0.06));
      bikeSteerRef.current += (steerTarget - bikeSteerRef.current) * Math.min(1, delta * 6);
      // Quay theo mô hình xe đạp; đứng yên/gần dừng thì không quay tại chỗ.
      if (Math.abs(v) > 0.3) {
        const yawRate = clamp((v / BIKE_WHEELBASE) * Math.tan(bikeSteerRef.current), -1.2, 1.2);
        bikeHeadingRef.current += yawRate * delta;
      }
      // Nghiêng nhẹ khi rẽ (trái = steer +, lean âm theo trục Z cục bộ).
      const leanTarget = clamp(
        -bikeSteerRef.current * Math.min(1, Math.abs(v) / 8) * 0.8,
        -0.2,
        0.2,
      );
      bikeLeanRef.current += (leanTarget - bikeLeanRef.current) * Math.min(1, delta * 5);
      // Tiến theo hướng đầu xe, chia bước nhỏ ≤ 0,25 m để không xuyên vật cản.
      const fwdX = Math.sin(bikeHeadingRef.current);
      const fwdZ = Math.cos(bikeHeadingRef.current);
      const dist = v * delta;
      const subSteps = Math.max(1, Math.ceil(Math.abs(dist) / 0.25));
      const subDt = delta / subSteps;
      let stopped = false;
      for (let i = 0; i < subSteps; i++) {
        const next: Vec2 = {
          x: bikePosRef.current.x + fwdX * v * subDt,
          z: bikePosRef.current.z + fwdZ * v * subDt,
        };
        const { pos, hit } = resolveBikeCollisions(next, BIKE_RADIUS);
        bikePosRef.current = pos;
        if (hit !== null) {
          if (hit !== prevBikeHitRef.current) playerState.collisions += 1;
          prevBikeHitRef.current = hit;
          // Dừng/trượt nhẹ: mất phần lớn vận tốc, không mô phỏng tai nạn.
          v *= 0.25;
          stopped = true;
          break;
        }
      }
      if (!stopped) prevBikeHitRef.current = null;
      bikeSpeedRef.current = v;
      // Cửa phòng học: xe không vào trong — nhắc xuống xe khi tới trong
      // 5 m (bậc tam cấp C1 + bệ I LOVE BK đã chặn vật lý ở ~4,15 m, nên
      // vành đai nhắc phải rộng hơn khoảng cách chặn vật lý mới tới được).
      const doorD = Math.hypot(
        bikePosRef.current.x - CLASSROOM_DOOR.pos.x,
        bikePosRef.current.z - CLASSROOM_DOOR.pos.z,
      );
      if (doorD < 5.0) {
        if (doorD < 2.6) bikeSpeedRef.current = 0;
        const now = state.clock.elapsedTime;
        if (now - lastDoorNoticeRef.current > 8) {
          lastDoorNoticeRef.current = now;
          bikeState.notice = {
            id: Date.now(),
            text: 'Xe không vào được phòng học — bấm E để xuống xe rồi vào lớp nhé.',
          };
        }
      }
      facingRef.current = bikeHeadingRef.current;
      posRef.current = { ...bikePosRef.current };
      syncBikeState();
    } else if (seatingStateRef.current.status === 'seated') {
      // --- PR8: Đang ngồi học tại ghế thư viện — khóa di chuyển WASD/joystick, giữ neo ghế ---
      moving = false;
      effectivelyMoving = false;
      if (seatingStateRef.current.anchorPos) {
        posRef.current.x = seatingStateRef.current.anchorPos.x;
        posRef.current.z = seatingStateRef.current.anchorPos.z;
      }
      if (typeof seatingStateRef.current.facing === 'number') {
        facingRef.current = seatingStateRef.current.facing;
      }
    } else {
    // --- Di chuyển theo hướng camera (yaw) ----------------------------------
    // Bước 5: uiLocked (panel học mở) → move = 0, cả phím lẫn joystick.
    const mx = playerState.uiLocked ? 0 : playerInput.move.x;
    const my = playerState.uiLocked ? 0 : playerInput.move.y;
    moving = mx !== 0 || my !== 0;
    let dirX = 0;
    let dirZ = 0;
    speed = playerInput.run ? AVATAR.runSpeed : AVATAR.walkSpeed;
    swing = playerInput.run ? RUN_SWING : WALK_SWING;
    if (moving) {
      const sin = Math.sin(yawRef.current);
      const cos = Math.cos(yawRef.current);
      // Hướng nhìn (từ camera về avatar) trên mặt đất: (−sin yaw, −cos yaw).
      const fwdX = -sin;
      const fwdZ = -cos;
      // Phải của hướng nhìn: (cos yaw, −sin yaw).
      const rightX = cos;
      const rightZ = -sin;
      dirX = fwdX * my + rightX * mx;
      dirZ = fwdZ * my + rightZ * mx;
      const len = Math.hypot(dirX, dirZ);
      if (len > 1) {
        dirX /= len;
        dirZ /= len;
      }
      const prevX = posRef.current.x;
      const prevZ = posRef.current.z;
      const walkDelta = Math.min(rawDelta, 0.16);
      const walkSubSteps = Math.max(1, Math.ceil(walkDelta / 0.05));
      const subDt = walkDelta / walkSubSteps;
      let curPos: Vec2 = { x: prevX, z: prevZ };
      let hit: string | null = null;
      if (playerState.inLibraryLobby) {
        const curLoc = createLibraryLocation(
          playerState.libraryFloor,
          prevX,
          prevZ,
          playerState.libraryY,
        );
        const desiredLoc = createLibraryLocation(
          playerState.libraryFloor,
          prevX + dirX * speed * walkDelta,
          prevZ + dirZ * speed * walkDelta,
          playerState.libraryY,
        );
        const moveRes = resolveLibraryMovement(curLoc, desiredLoc, AVATAR.radius, AVATAR.height);
        curPos = { x: moveRes.position.x, z: moveRes.position.z };
        hit = moveRes.hit;
        playerState.libraryY = moveRes.position.y;
        const nearDoor = findNearestLibraryDoorway(
          moveRes.recommendedFloor,
          moveRes.position.x,
          moveRes.position.z,
        );
        playerState.librarySpatialDiag = {
          block: moveRes.position.block,
          floor: moveRes.recommendedFloor,
          surfaceId: moveRes.surfaceId,
          grounded: moveRes.grounded,
          lastCollisionId: moveRes.collisionIds[0] ?? null,
          nearestDoorId: nearDoor ? nearDoor.id : null,
        };
        if (moveRes.recommendedFloor !== playerState.libraryFloor) {
          playerState.libraryFloor = moveRes.recommendedFloor;
          window.dispatchEvent(
            new CustomEvent('bkhn:library-floor', { detail: { floor: moveRes.recommendedFloor } }),
          );
        }
      } else {
        for (let s = 0; s < walkSubSteps; s++) {
          const next: Vec2 = {
            x: curPos.x + dirX * speed * subDt,
            z: curPos.z + dirZ * speed * subDt,
          };
          const res = playerState.inClassroom
            ? resolveClassroomCollisions(next, AVATAR.radius)
            : resolveCollisions(next, AVATAR.radius);
          curPos = res.pos;
          if (res.hit) hit = res.hit;
          // Chặn đi xuyên qua sinh viên đang đi bộ (AmbientLife) và người chơi khác (RemotePlayers) ngoài sân trường
          if (!playerState.inClassroom && !playerState.inLibraryLobby) {
            for (const wp of activeWalkingStudentPositions) {
              const pushed = pushOutOfCircle(curPos.x, curPos.z, wp, 0.38, AVATAR.radius);
              if (pushed) {
                curPos = pushed;
                if (!hit) hit = 'Sinh viên (NPC)';
              }
            }
            remoteRenderPos.forEach((rp) => {
              const pushed = pushOutOfCircle(curPos.x, curPos.z, rp, 0.4, AVATAR.radius);
              if (pushed) {
                curPos = pushed;
                if (!hit) hit = 'Sinh viên (MP)';
              }
            });
          }
        }
      }
      const pos = curPos;
      posRef.current = pos;
      // Đếm va chạm: chỉ đếm một lần khi vừa chạm vật mới (không đếm mỗi frame
      // khi đang trượt dọc tường).
      if (hit !== null && hit !== prevHitRef.current) playerState.collisions += 1;
      prevHitRef.current = hit;

      // Quay mặt theo hướng đi (nội suy góc ngắn nhất).
      const targetFacing = Math.atan2(dirX, dirZ);
      let diff = targetFacing - facingRef.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facingRef.current += diff * Math.min(1, walkDelta * 10);

      // Tính quãng đường dịch chuyển thực tế sau va chạm: nếu bị tường/vật cản
      // chặn đứng (actualSpeed <= 0.15 * speed), ngắt chu kỳ bước để không bước tại chỗ!
      const actualDist = Math.hypot(pos.x - prevX, pos.z - prevZ);
      const actualSpeed = walkDelta > 1e-5 ? actualDist / walkDelta : 0;
      effectivelyMoving = actualSpeed > 0.15 * speed;

      const stepLen = 2 * LEG_LEN * Math.sin(swing);
      if (effectivelyMoving) {
        walkPhaseRef.current += (actualDist * Math.PI) / stepLen;
      }
    }
    } // hết nhánh đi bộ (nhánh lái xe ở trên)

    // --- Animation nhân vật (Việc 2 — đồng bộ vận tốc thực & khử lạch bạch) --
    // Blend mềm đi ↔ đứng (nếu bị vật cản chặn không nhích được thì hạ blend về 0).
    const blendTarget = effectivelyMoving ? 1 : 0;
    moveBlendRef.current += (blendTarget - moveBlendRef.current) * Math.min(1, delta * 7);
    const blend = moveBlendRef.current;
    const phase = walkPhaseRef.current;
    const t = state.clock.elapsedTime;
    const ease = Math.min(1, delta * 12);

    const gait = computeNaturalGaitTargets(phase, swing, blend, t, playerInput.run);
    let {
      legLTarget,
      legRTarget,
      kneeLTarget,
      kneeRTarget,
      footLTarget,
      footRTarget,
      armLTarget,
      armRTarget,
      elbowLTarget,
      elbowRTarget,
      bodyLeanTarget,
      bodyRollTarget,
      bodyBobTarget,
    } = gait;
    // --- Tư thế ngồi xe (đợt 3 giai đoạn 4) — ghi đè toàn bộ tư thế đi bộ.
    // Dấu khớp theo quy ước đợt 3 giai đoạn 1 (mặt trước +Z): rotation.x
    // ÂM xoay chi treo về TRƯỚC, DƯƠNG xoay về SAU. Ngồi xe: đùi đưa về
    // trước gần ngang (leg ≈ −1,3), gối gập cẳng về sau (knee DƯƠNG ≈
    // +1,2 → cẳng gần thẳng đứng, bàn chân đặt đúng sàn xe y 0,38),
    // tay đưa về trước lên tay lái (arm ≈ −0,95), khuỷu gập cẳng về
    // trước (elbow ÂM ≈ −0,55). Balô theo người trong `body` nên ngồi
    // trên yên mà không xuyên yên (yên y 0,78 ≈ hông 0,80).
    if (ridingRef.current) {
      legLTarget = -1.25;
      legRTarget = -1.35;
      kneeLTarget = 1.15;
      kneeRTarget = 1.25;
      footLTarget = 0.15;
      footRTarget = 0.15;
      armLTarget = -0.95;
      armRTarget = -0.95;
      elbowLTarget = -0.55;
      elbowRTarget = -0.55;
      bodyLeanTarget = 0.12;
      bodyRollTarget = bikeLeanRef.current * 0.3;
      bodyBobTarget = 0;
    } else if (seatingStateRef.current.status === 'seated') {
      const seatedPose = computeSeatedPoseTargets(t);
      legLTarget = seatedPose.legLTarget;
      legRTarget = seatedPose.legRTarget;
      kneeLTarget = seatedPose.kneeLTarget;
      kneeRTarget = seatedPose.kneeRTarget;
      footLTarget = seatedPose.footLTarget;
      footRTarget = seatedPose.footRTarget;
      armLTarget = seatedPose.armLTarget;
      armRTarget = seatedPose.armRTarget;
      elbowLTarget = seatedPose.elbowLTarget;
      elbowRTarget = seatedPose.elbowRTarget;
      bodyLeanTarget = seatedPose.bodyLeanTarget;
      bodyRollTarget = seatedPose.bodyRollTarget;
      bodyBobTarget = seatedPose.bodyBobTarget;
    }

    const seatedNow = seatingStateRef.current.status === 'seated';
    const lerp = (ref: React.RefObject<THREE.Group>, axis: 'x' | 'z', target: number) => {
      if (ref.current) {
        ref.current.rotation[axis] += (target - ref.current.rotation[axis]) * ease;
      }
    };
    lerp(legLRef, 'x', legLTarget);
    lerp(legRRef, 'x', legRTarget);
    lerp(kneeLRef, 'x', kneeLTarget);
    lerp(kneeRRef, 'x', kneeRTarget);
    lerp(footLRef, 'x', footLTarget);
    lerp(footRRef, 'x', footRTarget);
    lerp(armLRef, 'x', armLTarget);
    lerp(armRRef, 'x', armRTarget);
    lerp(elbowLRef, 'x', elbowLTarget);
    lerp(elbowRRef, 'x', elbowRTarget);
    lerp(bodyRef, 'x', bodyLeanTarget);
    lerp(bodyRef, 'z', bodyRollTarget);
    if (bodyRef.current) {
      bodyRef.current.position.y += (bodyBobTarget - bodyRef.current.position.y) * ease;
    }

    let groundY = 0;
    if (playerState.inLibraryLobby && !seatedNow) {
      const elev = computeLibraryElevation(
        posRef.current.x,
        posRef.current.z,
        playerState.libraryFloor,
        playerState.libraryY,
      );
      playerState.libraryY = elev.y;
      if (elev.floor !== playerState.libraryFloor) {
        playerState.libraryFloor = elev.floor;
        window.dispatchEvent(new CustomEvent('bkhn:library-floor', { detail: { floor: elev.floor } }));
      }
      groundY = elev.y;
    } else if (!playerState.inClassroom && !playerState.inLibraryLobby && !ridingRef.current && !seatedNow) {
      groundY = getCampusGroundElevation(posRef.current.x, posRef.current.z);
    }

    groupRef.current.position.set(
      posRef.current.x,
      seatedNow ? SEATED_GROUP_Y_OFFSET : groundY,
      posRef.current.z,
    );
    groupRef.current.rotation.y = facingRef.current;
    if (nameplateGroupRef.current) {
      nameplateGroupRef.current.position.set(
        posRef.current.x,
        (ridingRef.current ? 2.05 : seatedNow ? 1.62 : 1.95) + groundY,
        posRef.current.z,
      );
    }

    updatePlayerState(posRef.current, moving);
    // F5b — đồng bộ góc camera ra playerState để page lưu vào tiến độ.
    playerState.cameraYaw = yawRef.current;
    playerState.cameraPitch = pitchRef.current;
    // Đồng bộ chế độ camera cho HUD (tự ẩn hộp hướng dẫn khi top-view).
    playerState.viewMode = viewModeRef.current;
    // Đợt 5 multiplayer — đồng bộ hướng + trạng thái lái xe để cầu nối
    // (page.tsx) gửi lên server; chỉ dùng cho hiển thị người chơi khác.
    playerState.facing = facingRef.current;
    playerState.riding = ridingRef.current;
    playerState.seated = seatedNow;
    playerState.seatId = seatingStateRef.current.seatId;

    // --- Camera thứ ba: nhìn vào điểm cao ~1,2 m trên avatar -----------------
    // TEST HOOK: chế độ top — camera trên cao nhìn thẳng xuống campus (chụp ảnh
    // mặt bằng kiểm tra), không phải góc chơi.
    if (viewModeRef.current === 'top') {
      camera.position.set(0, 160, 5.01);
      camera.lookAt(0, 0, 5);
      return;
    }
    const target = new THREE.Vector3(
      posRef.current.x,
      (ridingRef.current ? 1.4 : seatedNow ? 0.95 : 1.2) + groundY,
      posRef.current.z,
    );
    const placeCamera = (d: number): THREE.Vector3 => {
      const cp = Math.cos(pitchRef.current);
      const sp = Math.sin(pitchRef.current);
      return new THREE.Vector3(
        target.x + Math.sin(yawRef.current) * cp * d,
        target.y + sp * d,
        target.z + Math.cos(yawRef.current) * cp * d,
      );
    };
    let d = distRef.current;
    if (ridingRef.current) d = Math.max(d, 7.5);
    if (playerState.inClassroom) d = Math.min(d, 4.5);
    if (playerState.inLibraryLobby) d = Math.min(d, 6.2);
    let camPos = placeCamera(d);
    if (playerState.inClassroom) {
      camPos.x = clamp(camPos.x, -4.3, 4.3);
      camPos.z = clamp(camPos.z, -2.8, 2.8);
      camPos.y = Math.min(camPos.y, 2.85);
    } else if (playerState.inLibraryLobby) {
      camPos.x = clamp(camPos.x, -34.8, 34.8);
      camPos.z = clamp(camPos.z, -37.6, 26.8);
      camPos.y = clamp(camPos.y, groundY + 0.35, groundY + 8.5);
    }
    let guard = 0;
    while (
      guard < 24 &&
      d > 2.2 &&
      !playerState.inClassroom &&
      !playerState.inLibraryLobby &&
      pointInBuilding(camPos.x, camPos.z)
    ) {
      d *= 0.85;
      camPos = placeCamera(d);
      guard += 1;
    }
    camPos.y = Math.max(CAM_MIN_Y, camPos.y);
    camera.position.copy(camPos);
    camera.lookAt(target);
  });

  // Avatar chi tiết (components/three/StudentAvatar.tsx): cao đúng 1,7 m,
  // chân chạm đất (đế giày y = 0), khớp hông y = 0,8, khớp vai y = 1,29.
  // Bảng tên Billboard nằm ở nhóm riêng ngoài groupRef để:
  //   1) Không bị xoay ngược chữ theo facingRef.current
  //   2) Không rung lắc theo nhịp nhún chân bodyRef.current.position.y
  //   3) Không làm thay đổi kết quả đo bounding box của measureAvatar()
  return (
    <>
      <group ref={groupRef} position={[SPAWN.x, 0, SPAWN.z]}>
        <StudentAvatar
          joints={joints}
          showBackpack={backpackOn && !isSeated}
          seated={isSeated}
          gender={gender}
          hairStyle={hairStyle}
          outfit={outfit}
          skirt={skirtOn}
          glasses={glassesOn}
          lanyard={lanyardOn}
        />
      </group>
      <group ref={nameplateGroupRef} position={[SPAWN.x, 1.95, SPAWN.z]}>
        <Billboard position={[0, 0, 0]}>
          <mesh userData={{ ignoreMeasure: true }}>
            <planeGeometry args={[1.28, 0.2]} />
            <meshBasicMaterial
              map={nameplateTex}
              transparent
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </Billboard>
      </group>
    </>
  );
}
