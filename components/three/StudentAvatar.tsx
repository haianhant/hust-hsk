// ---------------------------------------------------------------------------
// StudentAvatar.tsx — Compatibility facade (PR4).
// Toàn bộ hệ thống khung xương (rig), 10 mẫu đồng phục HUST (appearance),
// phụ kiện và tính toán dáng đi (animation) đã được module hóa tại:
//   - features/avatar/appearance/presets.ts
//   - features/avatar/appearance/textures.ts
//   - features/avatar/appearance/Accessories.tsx
//   - features/avatar/rig/Limbs.tsx
//   - features/avatar/rig/Torso.tsx
//   - features/avatar/rig/Head.tsx
//   - features/avatar/rig/HumanFigure.tsx
//   - features/avatar/animation/gait.ts
// ---------------------------------------------------------------------------

export {
  AVATAR_COLORS,
  HumanFigure,
  OUTFIT_PRESETS,
  StudentAvatar as default,
  computeNaturalGaitTargets,
  type FigureJoints,
  type FigureProps,
  type FigureVariant,
  type HairStyle,
  type StudentAvatarProps,
} from '../../features/avatar';
