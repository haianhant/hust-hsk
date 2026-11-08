'use client';

// ---------------------------------------------------------------------------
// CharacterCreatorModal.tsx — Trình tạo & Tùy chỉnh Nhân vật Sinh viên HUST 3D
// (Việc 2 — docs/huong-dan-phat-trien.md §2.4):
//   - Dùng chung cho cả:
//     1) Màn hình Tạo nhân vật trước khi vào trường (mode = 'entry')
//     2) Cửa sổ "Nhân vật & trang phục" mở từ HUD trong sân trường (mode = 'modal')
//   - Khung Xem trước 3D trực tiếp (Interactive 3D Preview Canvas):
//     + Kéo chuột / vuốt ngang hoặc bấm nút để xoay 360° quanh nhân vật
//     + Chuyển đổi trực tiếp 3 chế độ hoạt ảnh: Đứng (Idle) / Đi bộ (Walk) / Chạy (Run)
//     + Xem trực tiếp bảng tên tiếng Việt trên đầu nhân vật
//   - Tùy chỉnh đầy đủ: Tên hiển thị (mặc định "Sinh viên" nếu để trống), MSSV,
//     Giới tính (Nam / Nữ), 6 Kiểu tóc, 8 Trang phục (mặc định Áo khoác gió HUST +
//     3 mẫu Bomber HUST Đỏ-Ghi / Xanh-Trắng / Đỏ-Xanh + Polo + Hoodie + Sơ mi + Thể chất),
//     Bật/tắt Balo, Kính tri thức, Dây đeo thẻ SV.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import StudentAvatar, {
  OUTFIT_PRESETS,
  computeNaturalGaitTargets,
  type FigureJoints,
} from '../three/StudentAvatar';
import type {
  AvatarGender,
  AvatarHairStyle,
  AvatarOutfitId,
} from '../../lib/playerState';
import {
  validateIdentity,
  type CharacterProfile,
} from '../../lib/identity';

export type PreviewMotionMode = 'idle' | 'walk' | 'run';

const HAIR_OPTIONS: Array<{
  id: AvatarHairStyle;
  label: string;
  genderHint: 'male' | 'female' | 'both';
}> = [
  { id: 'short', label: 'Ngắn gọn (Lộ trán)', genderHint: 'male' },
  { id: 'swept', label: 'Rẽ ngôi 7/3', genderHint: 'male' },
  { id: 'layered', label: 'Layer trẻ trung', genderHint: 'both' },
  { id: 'ponytail', label: 'Đuôi ngựa năng động', genderHint: 'female' },
  { id: 'bob', label: 'Tóc Bob ngang vai', genderHint: 'female' },
  { id: 'bun', label: 'Tóc búi gọn', genderHint: 'female' },
];

const OUTFIT_ORDER: AvatarOutfitId[] = [
  'windbreaker-hust',
  'bomber-red-grey',
  'bomber-navy-white',
  'bomber-red-navy',
  'polo-red',
  'hoodie-hust',
  'shirt-white',
  'sport-pe',
];

const OUTFIT_SWATCHES: Record<AvatarOutfitId, [string, string]> = {
  'windbreaker-hust': ['#F4F6F9', '#B5121B'],
  'bomber-red-grey': ['#9E1B22', '#D8DCE3'],
  'bomber-navy-white': ['#1B2A4A', '#F1F5F9'],
  'bomber-red-navy': ['#A6192E', '#18243E'],
  'polo-red': ['#DA1E26', '#232E3D'],
  'hoodie-hust': ['#B81D24', '#1E293B'],
  'shirt-white': ['#F5F5F0', '#1F2937'],
  'sport-pe': ['#1D4ED8', '#172554'],
};

function AvatarPreviewRig({
  profile,
  motion,
  yaw,
}: {
  profile: CharacterProfile;
  motion: PreviewMotionMode;
  yaw: number;
}) {
  const rootRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const armLRef = useRef<THREE.Group>(null!);
  const armRRef = useRef<THREE.Group>(null!);
  const elbowLRef = useRef<THREE.Group>(null!);
  const elbowRRef = useRef<THREE.Group>(null!);
  const legLRef = useRef<THREE.Group>(null!);
  const legRRef = useRef<THREE.Group>(null!);
  const kneeLRef = useRef<THREE.Group>(null!);
  const kneeRRef = useRef<THREE.Group>(null!);
  const footLRef = useRef<THREE.Group>(null!);
  const footRRef = useRef<THREE.Group>(null!);

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

  const phaseRef = useRef(0);
  const blendRef = useRef(0);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const isMoving = motion === 'walk' || motion === 'run';
    const isRun = motion === 'run';
    const targetBlend = isMoving ? 1 : 0;
    blendRef.current += (targetBlend - blendRef.current) * Math.min(1, dt * 8);

    if (isMoving) {
      phaseRef.current += dt * (isRun ? 10.2 : 6.8);
    }

    const swing = isRun ? 0.62 : 0.5;
    const gait = computeNaturalGaitTargets(
      phaseRef.current,
      swing,
      blendRef.current,
      t,
      isRun,
    );
    const ease = Math.min(1, dt * 14);
    const lerpRot = (ref: React.RefObject<THREE.Group>, axis: 'x' | 'z', target: number) => {
      if (ref.current) {
        ref.current.rotation[axis] += (target - ref.current.rotation[axis]) * ease;
      }
    };

    lerpRot(legLRef, 'x', gait.legLTarget);
    lerpRot(legRRef, 'x', gait.legRTarget);
    lerpRot(kneeLRef, 'x', gait.kneeLTarget);
    lerpRot(kneeRRef, 'x', gait.kneeRTarget);
    lerpRot(footLRef, 'x', gait.footLTarget);
    lerpRot(footRRef, 'x', gait.footRTarget);
    lerpRot(armLRef, 'x', gait.armLTarget);
    lerpRot(armRRef, 'x', gait.armRTarget);
    lerpRot(elbowLRef, 'x', gait.elbowLTarget);
    lerpRot(elbowRRef, 'x', gait.elbowRTarget);
    lerpRot(bodyRef, 'x', gait.bodyLeanTarget);
    lerpRot(bodyRef, 'z', gait.bodyRollTarget);
    if (bodyRef.current) {
      bodyRef.current.position.y += (gait.bodyBobTarget - bodyRef.current.position.y) * ease;
    }
    if (rootRef.current) {
      rootRef.current.rotation.y += (yaw - rootRef.current.rotation.y) * Math.min(1, dt * 12);
    }
  });

  return (
    <group position={[0, -0.88, 0]}>
      {/* Bệ đứng tròn Bách Khoa trong phòng thử đồ 3D */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.52, 0.58, 0.08, 32]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.45, 0.49, 32]} />
        <meshBasicMaterial color="#FACC15" />
      </mesh>
      <group ref={rootRef} rotation-y={yaw}>
        <StudentAvatar
          joints={joints}
          showBackpack={profile.backpack}
          gender={profile.gender}
          hairStyle={profile.hairStyle}
          outfit={profile.outfit}
          glasses={profile.glasses}
          lanyard={profile.lanyard}
        />
      </group>
    </group>
  );
}

export interface CharacterCreatorModalProps {
  mode: 'entry' | 'modal';
  initialProfile: CharacterProfile;
  /** Ở màn hình entry, có thể truyền chuỗi rỗng cho name/mssv để người dùng tự gõ hoặc bấm vào ngay */
  initialNameInput?: string;
  initialMssvInput?: string;
  hasSave?: boolean;
  onConfirm: (profile: CharacterProfile, resumeQuest?: boolean) => void;
  onChooseLesson?: () => void;
  onClose?: () => void;
}

export default function CharacterCreatorModal({
  mode,
  initialProfile,
  initialNameInput,
  initialMssvInput,
  hasSave,
  onConfirm,
  onChooseLesson,
  onClose,
}: CharacterCreatorModalProps) {
  const [nameInput, setNameInput] = useState<string>(
    initialNameInput !== undefined ? initialNameInput : initialProfile.name,
  );
  const [mssvInput, setMssvInput] = useState<string>(
    initialMssvInput !== undefined ? initialMssvInput : initialProfile.mssv,
  );
  const [gender, setGender] = useState<AvatarGender>(initialProfile.gender);
  const [hairStyle, setHairStyle] = useState<AvatarHairStyle>(initialProfile.hairStyle);
  const [outfit, setOutfit] = useState<AvatarOutfitId>(initialProfile.outfit);
  const [backpack, setBackpack] = useState<boolean>(initialProfile.backpack);
  const [glasses, setGlasses] = useState<boolean>(initialProfile.glasses);
  const [lanyard, setLanyard] = useState<boolean>(initialProfile.lanyard);
  const [motion, setMotion] = useState<PreviewMotionMode>('idle');
  const [yaw, setYaw] = useState<number>(0.25);
  const [error, setError] = useState<string | null>(null);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);

  useEffect(() => {
    setCanvasReady(true);
  }, []);

  useEffect(() => {
    if (initialNameInput !== undefined) setNameInput(initialNameInput);
  }, [initialNameInput]);

  useEffect(() => {
    if (initialMssvInput !== undefined) setMssvInput(initialMssvInput);
  }, [initialMssvInput]);

  useEffect(() => {
    setGender(initialProfile.gender);
    setHairStyle(initialProfile.hairStyle);
    setOutfit(initialProfile.outfit);
    setBackpack(initialProfile.backpack);
    setGlasses(initialProfile.glasses);
    setLanyard(initialProfile.lanyard);
  }, [
    initialProfile.gender,
    initialProfile.hairStyle,
    initialProfile.outfit,
    initialProfile.backpack,
    initialProfile.glasses,
    initialProfile.lanyard,
  ]);

  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  const previewName = nameInput.trim() || 'Sinh viên';
  const currentProfile: CharacterProfile = {
    name: previewName,
    mssv: mssvInput.trim() || '20226010',
    gender,
    hairStyle,
    outfit,
    backpack,
    glasses,
    lanyard,
  };

  const handleGenderChange = (nextGender: AvatarGender) => {
    setGender(nextGender);
    if (nextGender === 'female' && (hairStyle === 'short' || hairStyle === 'swept')) {
      setHairStyle('ponytail');
    } else if (nextGender === 'male' && (hairStyle === 'ponytail' || hairStyle === 'bob' || hairStyle === 'bun')) {
      setHairStyle('short');
    }
  };

  const handleSubmit = (resumeQuest: boolean = false) => {
    const err = validateIdentity(nameInput, mssvInput);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onConfirm(
      {
        name: nameInput.trim() || 'Sinh viên',
        mssv: mssvInput.trim() || '20226010',
        gender,
        hairStyle,
        outfit,
        backpack,
        glasses,
        lanyard,
      },
      resumeQuest,
    );
  };

  return (
    <div
      data-testid="character-creator-modal"
      className={
        mode === 'entry'
          ? 'w-full max-w-4xl rounded-3xl border border-white/40 bg-[#FAF6F0]/95 p-4 text-[#2B2B2B] shadow-2xl backdrop-blur-md sm:p-6'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs sm:p-5'
      }
    >
      <div
        className={
          mode === 'entry'
            ? 'w-full'
            : 'max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/30 bg-[#FAF6F0] p-4 text-[#2B2B2B] shadow-2xl sm:p-6'
        }
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-black/10 pb-3">
          <div>
            <p className="text-xs font-extrabold tracking-widest text-[#B5121B] uppercase">
              ĐẠI HỌC BÁCH KHOA HÀ NỘI · 河内百科大学
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold text-[#1E293B] sm:text-2xl">
              {mode === 'entry'
                ? 'Bách khoa Hán ngữ 3D — Tạo nhân vật sinh viên'
                : '👕 Nhân vật & Đồng phục Sinh viên HUST'}
            </h1>
            <p className="mt-0.5 text-xs text-[#475569] sm:text-sm">
              {mode === 'entry'
                ? 'Tùy chỉnh diện mạo, đồng phục áo khoác gió / bomber HUST và xem thử dáng đi trước khi bước qua cổng Parabol.'
                : 'Thay đổi tên hiển thị, giới tính, kiểu tóc và đồng phục Bách khoa ngay trong sân trường.'}
            </p>
          </div>
          {mode === 'modal' && onClose && (
            <button
              type="button"
              data-testid="close-character-modal"
              onClick={onClose}
              className="rounded-full bg-black/10 px-3 py-1.5 text-xs font-bold text-[#1E293B] transition hover:bg-black/20"
            >
              ✕ Đóng
            </button>
          )}
        </div>

        {/* Body: 2 cột (Trái: Khung 3D Preview + Xoay + Đứng/Đi/Chạy | Phải: Tùy chọn nhân vật) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Cột Trái: 3D Preview (5 cột) */}
          <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-300/80 bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#1E293B] p-3 text-white shadow-inner lg:col-span-5">
            {/* Bảng tên mô phỏng trực tiếp như trên đầu nhân vật */}
            <div className="flex w-full items-center justify-between gap-2 px-1">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                {gender === 'male' ? '♂ Nam sinh BK' : '♀ Nữ sinh BK'}
              </span>
              <span className="text-[11px] font-semibold text-emerald-300">
                👤 {previewName} ({mssvInput.trim() || '20226010'})
              </span>
            </div>

            <div className="mt-1.5 flex flex-col items-center">
              <div
                data-testid="preview-overhead-nameplate"
                className="rounded-full border border-amber-400/70 bg-slate-900/90 px-3.5 py-0.5 text-xs font-bold text-white shadow-md"
              >
                {previewName}
              </div>
              <div className="h-1.5 w-0.5 bg-amber-400/50" />
            </div>

            {/* Canvas 3D Xem trước trực tiếp */}
            <div
              data-testid="character-preview-canvas"
              onPointerDown={(e) => {
                draggingRef.current = true;
                lastXRef.current = e.clientX;
              }}
              onPointerMove={(e) => {
                if (!draggingRef.current) return;
                const dx = e.clientX - lastXRef.current;
                lastXRef.current = e.clientX;
                setYaw((y) => y + dx * 0.012);
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
              onPointerCancel={() => {
                draggingRef.current = false;
              }}
              className="relative h-[250px] w-full cursor-grab overflow-hidden rounded-xl active:cursor-grabbing sm:h-[280px]"
            >
              {canvasReady && (
                <Canvas
                  dpr={[1, 1.5]}
                  camera={{ position: [0, 0.12, 2.35], fov: 38 }}
                  gl={{ antialias: true, powerPreference: 'high-performance' }}
                >
                  <ambientLight intensity={1.15} />
                  <directionalLight position={[2.5, 4, 3]} intensity={1.35} />
                  <directionalLight position={[-2.5, 2, -2]} intensity={0.55} color="#93C5FD" />
                  <AvatarPreviewRig profile={currentProfile} motion={motion} yaw={yaw} />
                </Canvas>
              )}
            </div>

            {/* Thanh điều khiển góc xoay & chế độ Đứng / Đi bộ / Chạy */}
            <div className="mt-2 w-full space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  data-testid="preview-rot-left"
                  onClick={() => setYaw((y) => y - Math.PI / 4)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  ↺ Xoay trái
                </button>
                <button
                  type="button"
                  data-testid="preview-rot-front"
                  onClick={() => setYaw(0)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Mặt trước
                </button>
                <button
                  type="button"
                  data-testid="preview-rot-back"
                  onClick={() => setYaw(Math.PI)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Mặt sau
                </button>
                <button
                  type="button"
                  data-testid="preview-rot-right"
                  onClick={() => setYaw((y) => y + Math.PI / 4)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Xoay phải ↻
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-black/35 p-1">
                {(
                  [
                    { id: 'idle', label: '🧍 Đứng' },
                    { id: 'walk', label: '🚶 Đi bộ' },
                    { id: 'run', label: '🏃 Chạy' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`preview-motion-${m.id}`}
                    onClick={() => setMotion(m.id)}
                    className={`rounded-lg py-1.5 text-xs font-bold transition ${
                      motion === m.id
                        ? 'bg-[#B5121B] text-white shadow'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cột Phải: Tùy chọn thông tin, giới tính, kiểu tóc, đồng phục, phụ kiện (7 cột) */}
          <div className="flex flex-col justify-between space-y-3.5 lg:col-span-7">
            {/* 1. Tên hiển thị trên đầu & MSSV */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-[#1E293B]">
                  Tên hiển thị trên đầu <span className="font-normal text-slate-500">(trống = &quot;Sinh viên&quot;)</span>
                </span>
                <input
                  id="identity-name"
                  type="text"
                  maxLength={30}
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                  placeholder="Sinh viên (vd: Nguyễn Minh Anh)"
                  className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[#B5121B] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[#1E293B]">
                  MSSV (8 chữ số HUST)
                </span>
                <input
                  id="identity-mssv"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={mssvInput}
                  onChange={(e) => {
                    setMssvInput(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                  placeholder="20226010"
                  className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 font-mono text-sm text-[#1E293B] focus:border-[#B5121B] focus:outline-none"
                />
              </label>
            </div>

            {/* 2. Chọn giới tính (Nam / Nữ) */}
            <div>
              <span className="block text-xs font-bold text-[#1E293B]">Giới tính nhân vật</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="gender-male"
                  onClick={() => handleGenderChange('male')}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    gender === 'male'
                      ? 'border-[#B5121B] bg-[#B5121B] text-white shadow-sm'
                      : 'border-black/15 bg-white text-[#1E293B] hover:bg-black/5'
                  }`}
                >
                  <span>♂</span> Nam sinh viên
                </button>
                <button
                  type="button"
                  data-testid="gender-female"
                  onClick={() => handleGenderChange('female')}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    gender === 'female'
                      ? 'border-[#B5121B] bg-[#B5121B] text-white shadow-sm'
                      : 'border-black/15 bg-white text-[#1E293B] hover:bg-black/5'
                  }`}
                >
                  <span>♀</span> Nữ sinh viên
                </button>
              </div>
            </div>

            {/* 3. Chọn kiểu tóc */}
            <div>
              <span className="block text-xs font-bold text-[#1E293B]">Kiểu tóc</span>
              <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {HAIR_OPTIONS.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    data-testid={`hair-${h.id}`}
                    onClick={() => setHairStyle(h.id)}
                    className={`rounded-xl border px-2.5 py-1.5 text-left text-xs font-bold transition ${
                      hairStyle === h.id
                        ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white shadow-xs'
                        : 'border-black/15 bg-white text-[#1E293B] hover:bg-black/5'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Chọn đồng phục HUST (Mặc định Áo khoác gió HUST + 3 Bomber HUST + Polo/Sơ mi/Thể chất) */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E293B]">
                  Trang phục & Đồng phục ĐHBK Hà Nội
                </span>
                <span className="text-[11px] font-semibold text-[#B5121B]">
                  {OUTFIT_PRESETS[outfit]?.desc}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {OUTFIT_ORDER.map((id) => {
                  const preset = OUTFIT_PRESETS[id];
                  const [c1, c2] = OUTFIT_SWATCHES[id];
                  const active = outfit === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`outfit-${id}`}
                      onClick={() => setOutfit(id)}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition ${
                        active
                          ? 'border-[#B5121B] bg-[#B5121B]/10 text-[#8F1418] ring-2 ring-[#B5121B]'
                          : 'border-black/15 bg-white text-[#1E293B] hover:bg-black/5'
                      }`}
                    >
                      <span className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full border border-black/25">
                        <span className="h-full w-1/2" style={{ backgroundColor: c1 }} />
                        <span className="h-full w-1/2" style={{ backgroundColor: c2 }} />
                      </span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Phụ kiện: Balo (Bật / Tắt), Kính tri thức, Dây đeo thẻ SV */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                data-testid="toggle-backpack"
                onClick={() => setBackpack((v) => !v)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  backpack
                    ? 'border-[#1C5C3A] bg-[#1C5C3A] text-white'
                    : 'border-black/20 bg-white text-[#1E293B]'
                }`}
              >
                🎒 Balo: {backpack ? 'Bật' : 'Tắt'}
              </button>
              <button
                type="button"
                data-testid="toggle-glasses"
                onClick={() => setGlasses((v) => !v)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  glasses
                    ? 'border-[#1C5C3A] bg-[#1C5C3A] text-white'
                    : 'border-black/20 bg-white text-[#1E293B]'
                }`}
              >
                👓 Kính: {glasses ? 'Bật' : 'Tắt'}
              </button>
              <button
                type="button"
                data-testid="toggle-lanyard"
                onClick={() => setLanyard((v) => !v)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  lanyard
                    ? 'border-[#1C5C3A] bg-[#1C5C3A] text-white'
                    : 'border-black/20 bg-white text-[#1E293B]'
                }`}
              >
                🪪 Thẻ SV: {lanyard ? 'Đeo' : 'Ẩn'}
              </button>
            </div>

            {error && (
              <p role="alert" className="text-xs font-bold text-[#c1272d]">
                {error}
              </p>
            )}

            {/* Nút xác nhận */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {mode === 'entry' && onChooseLesson && (
                <button
                  id="choose-lesson"
                  type="button"
                  onClick={onChooseLesson}
                  className="rounded-full border-2 border-[#1c5c3a] px-5 py-2.5 text-sm font-bold text-[#1c5c3a] transition hover:bg-[#1c5c3a]/10"
                >
                  Chọn bài
                </button>
              )}
              {mode === 'entry' && hasSave && (
                <button
                  id="continue-learning"
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="rounded-full bg-[#1c5c3a] px-6 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-[#16492e]"
                >
                  Tiếp tục học
                </button>
              )}
              {mode === 'modal' && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-black/20 bg-white px-5 py-2.5 text-sm font-bold text-[#1E293B] hover:bg-black/5"
                >
                  Hủy
                </button>
              )}
              <button
                id={mode === 'entry' ? 'enter-campus' : 'save-character'}
                type="button"
                onClick={() => handleSubmit(false)}
                className="w-full rounded-full bg-[#B5121B] px-6 py-3 text-base font-extrabold text-white shadow-lg transition hover:bg-[#8F1418] sm:w-auto"
              >
                {mode === 'entry' ? 'Vào cổng Parabol →' : 'Lưu nhân vật & trang phục'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
