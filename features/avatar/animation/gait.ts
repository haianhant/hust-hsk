// ---------------------------------------------------------------------------
// features/avatar/animation/gait.ts — Helper tính góc khớp đi bộ / chạy / đứng /
// ngồi học tự nhiên & hoạt ảnh hành động tương tác (Emote Animations),
// dùng chung cho Player, RemotePlayers, AmbientLife & CharacterCreatorModal.
// Module ID: avatar.rig
// ---------------------------------------------------------------------------

import type { AvatarEmoteId } from '../../../shared/contracts/multiplayer';

/** Độ hạ thấp gốc nhân vật khi ngồi trên ghế thư viện (mặt đệm ghế cao 0.45m, khớp hông local ở y = 0.80m). */
export const SEATED_GROUP_Y_OFFSET = -0.35;

export interface EmoteDefinition {
  id: AvatarEmoteId;
  keyHint: string;
  icon: string;
  labelVi: string;
  labelZh: string;
  durationMs: number;
}

export const EMOTE_DEFINITIONS: readonly EmoteDefinition[] = [
  {
    id: 'wave',
    keyHint: '1',
    icon: '👋',
    labelVi: 'Vẫy tay',
    labelZh: '打招呼',
    durationMs: 2600,
  },
  {
    id: 'dance',
    keyHint: '2',
    icon: '💃',
    labelVi: 'Nhảy nhót',
    labelZh: '跳舞',
    durationMs: 5200,
  },
  {
    id: 'cheer',
    keyHint: '3',
    icon: '🙌',
    labelVi: 'Hoan hô',
    labelZh: '欢呼',
    durationMs: 3000,
  },
  {
    id: 'bow',
    keyHint: '4',
    icon: '🙇',
    labelVi: 'Cúi chào',
    labelZh: '鞠躬',
    durationMs: 2400,
  },
  {
    id: 'clap',
    keyHint: '5',
    icon: '👏',
    labelVi: 'Vỗ tay',
    labelZh: '鼓掌',
    durationMs: 3000,
  },
  {
    id: 'stretch',
    keyHint: '6',
    icon: '🙆',
    labelVi: 'Vươn vai',
    labelZh: '伸懒腰',
    durationMs: 3400,
  },
] as const;

export interface EmotePoseTargets {
  legLTarget: number;
  legRTarget: number;
  legLZTarget: number;
  legRZTarget: number;
  kneeLTarget: number;
  kneeRTarget: number;
  footLTarget: number;
  footRTarget: number;
  armLTarget: number;
  armRTarget: number;
  armLZTarget: number;
  armRZTarget: number;
  elbowLTarget: number;
  elbowRTarget: number;
  bodyLeanTarget: number;
  bodyRollTarget: number;
  bodyYawTarget: number;
  bodyBobTarget: number;
  jumpYOffset: number;
}

export function computeNaturalGaitTargets(
  phase: number,
  swing: number,
  blend: number,
  t: number,
  isRunning: boolean,
) {
  const sinP = Math.sin(phase);
  const cosP = Math.cos(phase);
  // Chu kỳ đùi vung mượt tự nhiên (chống giật cục ở điểm đảo chiều)
  const legSwing = sinP * swing * blend;
  const legLTarget = legSwing;
  const legRTarget = -legSwing;
  // Gối gập tự nhiên trong pha nhấc chân đưa về trước (swing phase) và hơi chùng mềm khi tiếp đất
  const swingKneeAmp = isRunning ? 0.92 : 0.72;
  const stanceSoftKnee = 0.08 * Math.max(0, Math.sin(phase * 2)) * blend;
  const kneeLTarget =
    0.05 + (swingKneeAmp * Math.pow(Math.max(0, -cosP), 1.15) + stanceSoftKnee) * blend;
  const kneeRTarget =
    0.05 + (swingKneeAmp * Math.pow(Math.max(0, cosP), 1.15) + stanceSoftKnee) * blend;
  // Cổ chân miết từ gót sang mũi bàn chân (heel-strike -> toe-off) và giữ đế giày song song mặt đất
  const rawFootL = -(legLTarget + kneeLTarget) * 0.82 + 0.08 * sinP * blend;
  const rawFootR = -(legRTarget + kneeRTarget) * 0.82 - 0.08 * sinP * blend;
  const footLTarget = Math.min(Math.max(rawFootL, -0.45), 0.45) * blend;
  const footRTarget = Math.min(Math.max(rawFootR, -0.45), 0.45) * blend;
  // Tay đánh đối pha với chân, biên độ vừa phải tự nhiên, khuỷu tay hơi co mềm
  const armSwing = legSwing * (isRunning ? 0.78 : 0.64);
  const armLTarget = -armSwing + (1 - blend) * 0.06;
  const armRTarget = armSwing + (1 - blend) * -0.03;
  const elbowLTarget = -(0.24 + (isRunning ? 0.34 : 0.18) * blend * Math.max(0, sinP));
  const elbowRTarget = -(0.32 + (isRunning ? 0.34 : 0.18) * blend * Math.max(0, -sinP));
  const bodyLeanTarget = 0.038 * blend + (isRunning ? 0.055 * blend : 0);
  // Giữ trục thân thẳng vững chãi (<= 0.008 rad) để triệt tiêu hoàn toàn dáng đi lạch bạch
  const bodyRollTarget = sinP * 0.006 * blend + Math.sin(t * 0.9) * 0.006 * (1 - blend);
  const bodyBobTarget = Math.abs(cosP) * 0.014 * blend + Math.sin(t * 1.4) * 0.0035;

  return {
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
  };
}

/**
 * Góc khớp tư thế ngồi học tại bàn thư viện (cao độ mặt ghế 0.45m, mặt bàn 0.75m):
 * - Đùi gập về phía trước (-1.48 rad), gối gập xuống (1.45 rad) để bàn chân chạm sàn.
 * - Hai tay đưa nhẹ về phía trước đặt lên mặt bàn đọc sách.
 * - Thân trên hơi nghiêng nhẹ về phía bàn kèm nhịp thở tự nhiên.
 */
export function computeSeatedPoseTargets(t: number) {
  return {
    legLTarget: -1.48,
    legRTarget: -1.48,
    kneeLTarget: 1.45,
    kneeRTarget: 1.45,
    footLTarget: 0.03,
    footRTarget: 0.03,
    armLTarget: -0.62 + Math.sin(t * 1.1) * 0.015,
    armRTarget: -0.58 + Math.cos(t * 1.3) * 0.015,
    elbowLTarget: -0.86,
    elbowRTarget: -0.9,
    bodyLeanTarget: 0.07 + Math.sin(t * 1.4) * 0.008,
    bodyRollTarget: Math.sin(t * 0.8) * 0.005,
    bodyBobTarget: Math.sin(t * 1.4) * 0.002,
  };
}

/**
 * Tính góc khớp cho 6 hoạt ảnh hành động tương tác (Emotes):
 * - `wave`: Vẫy tay chào hỏi thân thiện
 * - `dance`: Nhảy nhót vũ đạo trẻ trung
 * - `cheer`: Nhảy bật hai tay hoan hô chiến thắng
 * - `bow`: Cúi chào lịch sự kiểu Á Đông (你好 / 老师好)
 * - `clap`: Vỗ tay cổ vũ nhịp nhàng trước ngực
 * - `stretch`: Vươn vai thư giãn chống mỏi lưng khi học bài
 */
export function computeEmotePoseTargets(
  emote: AvatarEmoteId,
  elapsedSec: number,
  seated = false,
): EmotePoseTargets {
  const baseLegs = seated
    ? {
        legLTarget: -1.48,
        legRTarget: -1.48,
        legLZTarget: 0,
        legRZTarget: 0,
        kneeLTarget: 1.45,
        kneeRTarget: 1.45,
        footLTarget: 0.03,
        footRTarget: 0.03,
      }
    : {
        legLTarget: 0,
        legRTarget: 0,
        legLZTarget: 0,
        legRZTarget: 0,
        kneeLTarget: 0.05,
        kneeRTarget: 0.05,
        footLTarget: 0,
        footRTarget: 0,
      };

  switch (emote) {
    case 'wave': {
      const w = Math.sin(elapsedSec * 10.5);
      return {
        ...baseLegs,
        armLTarget: seated ? -0.58 : 0.08,
        armRTarget: -2.42 + Math.cos(elapsedSec * 5.2) * 0.08,
        armLZTarget: 0.05,
        armRZTarget: -0.36 + w * 0.32,
        elbowLTarget: seated ? -0.82 : -0.26,
        elbowRTarget: -0.52 + w * 0.25,
        bodyLeanTarget: seated ? 0.04 : -0.03,
        bodyRollTarget: w * 0.065,
        bodyYawTarget: Math.sin(elapsedSec * 5.2) * 0.09,
        bodyBobTarget: Math.abs(w) * 0.022,
        jumpYOffset: 0,
      };
    }
    case 'dance': {
      const beat = elapsedSec * 7.2;
      const sinB = Math.sin(beat);
      const cosB = Math.cos(beat);
      const hop = Math.abs(Math.sin(beat * 2));
      const leftStep = Math.max(0, sinB);
      const rightStep = Math.max(0, -sinB);
      return {
        legLTarget: seated ? -1.48 : -0.58 * leftStep + 0.14 * rightStep,
        legRTarget: seated ? -1.48 : -0.58 * rightStep + 0.14 * leftStep,
        legLZTarget: seated ? 0 : 0.16 * leftStep,
        legRZTarget: seated ? 0 : -0.16 * rightStep,
        kneeLTarget: seated ? 1.45 : 0.12 + 0.92 * leftStep,
        kneeRTarget: seated ? 1.45 : 0.12 + 0.92 * rightStep,
        footLTarget: seated ? 0.03 : -0.22 * leftStep,
        footRTarget: seated ? 0.03 : -0.22 * rightStep,
        armLTarget: -1.75 + sinB * 0.78,
        armRTarget: -1.75 - sinB * 0.78,
        armLZTarget: 0.36 + cosB * 0.24,
        armRZTarget: -0.36 + cosB * 0.24,
        elbowLTarget: -0.68 - Math.max(0, cosB) * 0.45,
        elbowRTarget: -0.68 - Math.max(0, -cosB) * 0.45,
        bodyLeanTarget: Math.sin(beat * 2) * 0.06,
        bodyRollTarget: sinB * 0.11,
        bodyYawTarget: cosB * 0.26,
        bodyBobTarget: hop * 0.045,
        jumpYOffset: seated ? 0 : hop * 0.14,
      };
    }
    case 'cheer': {
      const pulse = elapsedSec * 6.8;
      const jumpWave = Math.max(0, Math.sin(pulse));
      const pump = Math.sin(pulse * 2);
      return {
        legLTarget: seated ? -1.48 : -0.24 * jumpWave,
        legRTarget: seated ? -1.48 : -0.24 * jumpWave,
        legLZTarget: seated ? 0 : 0.18 * jumpWave,
        legRZTarget: seated ? 0 : -0.18 * jumpWave,
        kneeLTarget: seated ? 1.45 : 0.08 + 0.46 * jumpWave,
        kneeRTarget: seated ? 1.45 : 0.08 + 0.46 * jumpWave,
        footLTarget: seated ? 0.03 : -0.18 * jumpWave,
        footRTarget: seated ? 0.03 : -0.18 * jumpWave,
        armLTarget: -2.68 + pump * 0.22,
        armRTarget: -2.68 - pump * 0.22,
        armLZTarget: 0.44 + jumpWave * 0.12,
        armRZTarget: -0.44 - jumpWave * 0.12,
        elbowLTarget: -0.28,
        elbowRTarget: -0.28,
        bodyLeanTarget: -0.06 * jumpWave,
        bodyRollTarget: Math.sin(pulse) * 0.05,
        bodyYawTarget: Math.cos(pulse) * 0.08,
        bodyBobTarget: jumpWave * 0.035,
        jumpYOffset: seated ? 0 : Math.pow(jumpWave, 1.2) * 0.24,
      };
    }
    case 'bow': {
      const bowEnv = Math.abs(Math.sin(elapsedSec * 2.2));
      const smoothBow = Math.pow(bowEnv, 0.75);
      return {
        ...baseLegs,
        armLTarget: -0.52 * smoothBow,
        armRTarget: -0.52 * smoothBow,
        armLZTarget: -0.24 * smoothBow,
        armRZTarget: 0.24 * smoothBow,
        elbowLTarget: -0.24 - 0.92 * smoothBow,
        elbowRTarget: -0.24 - 0.92 * smoothBow,
        bodyLeanTarget: (seated ? 0.07 : 0) + 0.58 * smoothBow,
        bodyRollTarget: 0,
        bodyYawTarget: 0,
        bodyBobTarget: -0.03 * smoothBow,
        jumpYOffset: 0,
      };
    }
    case 'clap': {
      const clapOsc = Math.abs(Math.sin(elapsedSec * 11.5));
      const bounce = Math.sin(elapsedSec * 5.75);
      return {
        ...baseLegs,
        armLTarget: -1.12 + bounce * 0.05,
        armRTarget: -1.12 - bounce * 0.05,
        armLZTarget: -0.35 + clapOsc * 0.25,
        armRZTarget: 0.35 - clapOsc * 0.25,
        elbowLTarget: -1.18,
        elbowRTarget: -1.18,
        bodyLeanTarget: seated ? 0.06 : 0.03,
        bodyRollTarget: bounce * 0.045,
        bodyYawTarget: bounce * 0.07,
        bodyBobTarget: (1 - clapOsc) * 0.018,
        jumpYOffset: 0,
      };
    }
    case 'stretch': {
      const env = Math.min(1, elapsedSec / 0.45);
      const sway = Math.sin(elapsedSec * 2.6);
      return {
        ...baseLegs,
        armLTarget: -2.82 * env + (1 - env) * (seated ? -0.6 : 0.05),
        armRTarget: -2.82 * env + (1 - env) * (seated ? -0.6 : -0.03),
        armLZTarget: 0.16 * env + sway * 0.12,
        armRZTarget: -0.16 * env + sway * 0.12,
        elbowLTarget: -0.22,
        elbowRTarget: -0.22,
        bodyLeanTarget: (seated ? 0.05 : 0) - 0.16 * env,
        bodyRollTarget: sway * 0.11 * env,
        bodyYawTarget: Math.cos(elapsedSec * 2.6) * 0.14 * env,
        bodyBobTarget: 0.025 * env,
        jumpYOffset: 0,
      };
    }
  }
}
