// ---------------------------------------------------------------------------
// features/avatar/index.ts — Public API barrel cho phân hệ Avatar (rig,
// appearance, animation)
// Module IDs: avatar.rig, avatar.outfit.*
// ---------------------------------------------------------------------------

export {
  AVATAR_COLORS,
  OUTFIT_PRESETS,
  type FigureJoints,
  type FigureProps,
  type FigureVariant,
  type HairStyle,
  type StudentAvatarProps,
} from './appearance/presets';
export {
  getSharedAvatarTextures,
  useHustCrimsonLogoTexture,
  useHustSleeveBadgeTexture,
  useHustTexture,
  useStudentIdTexture,
} from './appearance/textures';
export { Backpack, HustStudentLanyard } from './appearance/Accessories';
export { ArmSide, Hand, LegSide } from './rig/Limbs';
export { Torso } from './rig/Torso';
export { Head } from './rig/Head';
export { default as StudentAvatar, HumanFigure } from './rig/HumanFigure';
export {
  EMOTE_DEFINITIONS,
  LYING_GROUP_Y_OFFSET,
  SEATED_GROUP_Y_OFFSET,
  computeEmotePoseTargets,
  computeLyingPoseTargets,
  computeNaturalGaitTargets,
  computePianoPoseTargets,
  computeSeatedPoseTargets,
  isLyingSeatId,
  isPianoBenchSeatId,
  type EmoteDefinition,
  type EmotePoseTargets,
} from './animation/gait';
