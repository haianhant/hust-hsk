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
 * Hàm bao vào/ra mượt mà theo đường cong raised-cosine (đạo hàm bằng 0 ở cả hai đầu)
 * giúp nhân vật chuyển từ tư thế đứng/ngồi sang hành động tương tác và thu tay về êm ái,
 * không bao giờ bị giật cục khi bắt đầu hoặc kết thúc hoạt ảnh.
 */
export function computeEmoteEnvelope(
  elapsedSec: number,
  durationSec: number,
  attackSec = 0.34,
  releaseSec = 0.44,
): number {
  if (elapsedSec <= 0) return 0;
  if (elapsedSec < attackSec) {
    const u = Math.max(0, Math.min(1, elapsedSec / attackSec));
    return 0.5 - 0.5 * Math.cos(Math.PI * u);
  }
  const rem = durationSec - elapsedSec;
  if (rem <= 0) return 0;
  if (rem < releaseSec) {
    const u = Math.max(0, Math.min(1, rem / releaseSec));
    return 0.5 - 0.5 * Math.cos(Math.PI * u);
  }
  return 1;
}

function blendPoseToNeutral(
  raw: EmotePoseTargets,
  neutral: EmotePoseTargets,
  env: number,
): EmotePoseTargets {
  const mix = (a: number, b: number) => b + (a - b) * env;
  return {
    legLTarget: mix(raw.legLTarget, neutral.legLTarget),
    legRTarget: mix(raw.legRTarget, neutral.legRTarget),
    legLZTarget: mix(raw.legLZTarget, neutral.legLZTarget),
    legRZTarget: mix(raw.legRZTarget, neutral.legRZTarget),
    kneeLTarget: mix(raw.kneeLTarget, neutral.kneeLTarget),
    kneeRTarget: mix(raw.kneeRTarget, neutral.kneeRTarget),
    footLTarget: mix(raw.footLTarget, neutral.footLTarget),
    footRTarget: mix(raw.footRTarget, neutral.footRTarget),
    armLTarget: mix(raw.armLTarget, neutral.armLTarget),
    armRTarget: mix(raw.armRTarget, neutral.armRTarget),
    armLZTarget: mix(raw.armLZTarget, neutral.armLZTarget),
    armRZTarget: mix(raw.armRZTarget, neutral.armRZTarget),
    elbowLTarget: mix(raw.elbowLTarget, neutral.elbowLTarget),
    elbowRTarget: mix(raw.elbowRTarget, neutral.elbowRTarget),
    bodyLeanTarget: mix(raw.bodyLeanTarget, neutral.bodyLeanTarget),
    bodyRollTarget: mix(raw.bodyRollTarget, neutral.bodyRollTarget),
    bodyYawTarget: mix(raw.bodyYawTarget, neutral.bodyYawTarget),
    bodyBobTarget: mix(raw.bodyBobTarget, neutral.bodyBobTarget),
    jumpYOffset: mix(raw.jumpYOffset, neutral.jumpYOffset),
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
  const def = EMOTE_DEFINITIONS.find((d) => d.id === emote);
  const durationSec = (def?.durationMs ?? 3000) / 1000;
  const env = computeEmoteEnvelope(elapsedSec, durationSec);

  const neutral: EmotePoseTargets = seated
    ? {
        legLTarget: -1.48,
        legRTarget: -1.48,
        legLZTarget: 0,
        legRZTarget: 0,
        kneeLTarget: 1.45,
        kneeRTarget: 1.45,
        footLTarget: 0.03,
        footRTarget: 0.03,
        armLTarget: -0.6,
        armRTarget: -0.58,
        armLZTarget: 0,
        armRZTarget: 0,
        elbowLTarget: -0.86,
        elbowRTarget: -0.9,
        bodyLeanTarget: 0.07,
        bodyRollTarget: 0,
        bodyYawTarget: 0,
        bodyBobTarget: 0,
        jumpYOffset: 0,
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
        armLTarget: 0.06,
        armRTarget: -0.03,
        armLZTarget: 0,
        armRZTarget: 0,
        elbowLTarget: -0.24,
        elbowRTarget: -0.32,
        bodyLeanTarget: 0,
        bodyRollTarget: 0,
        bodyYawTarget: 0,
        bodyBobTarget: 0,
        jumpYOffset: 0,
      };

  const baseLegs = {
    legLTarget: neutral.legLTarget,
    legRTarget: neutral.legRTarget,
    legLZTarget: 0,
    legRZTarget: 0,
    kneeLTarget: neutral.kneeLTarget,
    kneeRTarget: neutral.kneeRTarget,
    footLTarget: neutral.footLTarget,
    footRTarget: neutral.footRTarget,
  };

  let raw: EmotePoseTargets;
  switch (emote) {
    case 'wave': {
      const w = Math.sin(elapsedSec * 8.6);
      const wSlow = Math.sin(elapsedSec * 4.3);
      raw = {
        ...baseLegs,
        armLTarget: seated ? -0.58 : 0.08 + wSlow * 0.03,
        armRTarget: -2.28 + Math.cos(elapsedSec * 4.3) * 0.05,
        armLZTarget: 0.04,
        armRZTarget: -0.32 + w * 0.26,
        elbowLTarget: seated ? -0.82 : -0.26,
        elbowRTarget: -0.46 + Math.cos(elapsedSec * 8.6) * 0.14,
        bodyLeanTarget: seated ? 0.04 : -0.02,
        bodyRollTarget: w * 0.042,
        bodyYawTarget: wSlow * 0.065,
        bodyBobTarget: (0.5 - 0.5 * Math.cos(elapsedSec * 8.6)) * 0.006,
        jumpYOffset: 0,
      };
      break;
    }
    case 'dance': {
      // Nhịp groove C∞ mượt mà (không dùng Math.abs sắc cạnh gây khựng khớp)
      const beat = elapsedSec * 6.2;
      const sinB = Math.sin(beat);
      const cosB = Math.cos(beat);
      const bounce = 0.5 - 0.5 * Math.cos(beat * 2);
      const leftWeight = 0.5 + 0.5 * sinB;
      const rightWeight = 0.5 - 0.5 * sinB;
      raw = {
        legLTarget: seated ? -1.48 : -0.32 * leftWeight + 0.06 * rightWeight,
        legRTarget: seated ? -1.48 : -0.32 * rightWeight + 0.06 * leftWeight,
        legLZTarget: seated ? 0 : 0.09 * leftWeight,
        legRZTarget: seated ? 0 : -0.09 * rightWeight,
        kneeLTarget: seated ? 1.45 : 0.08 + 0.46 * leftWeight + 0.12 * bounce,
        kneeRTarget: seated ? 1.45 : 0.08 + 0.46 * rightWeight + 0.12 * bounce,
        footLTarget: seated ? 0.03 : -0.14 * leftWeight,
        footRTarget: seated ? 0.03 : -0.14 * rightWeight,
        armLTarget: -1.52 + sinB * 0.58,
        armRTarget: -1.52 - sinB * 0.58,
        armLZTarget: 0.26 + cosB * 0.16,
        armRZTarget: -0.26 + cosB * 0.16,
        elbowLTarget: -0.72 - 0.28 * leftWeight,
        elbowRTarget: -0.72 - 0.28 * rightWeight,
        bodyLeanTarget: (bounce - 0.5) * 0.045,
        bodyRollTarget: sinB * 0.075,
        bodyYawTarget: cosB * 0.18,
        bodyBobTarget: bounce * 0.007,
        jumpYOffset: seated ? 0 : bounce * 0.055,
      };
      break;
    }
    case 'cheer': {
      const pulse = elapsedSec * 5.8;
      const jumpWave = 0.5 - 0.5 * Math.cos(pulse);
      const pump = Math.sin(pulse * 2);
      raw = {
        legLTarget: seated ? -1.48 : -0.18 * jumpWave,
        legRTarget: seated ? -1.48 : -0.18 * jumpWave,
        legLZTarget: seated ? 0 : 0.12 * jumpWave,
        legRZTarget: seated ? 0 : -0.12 * jumpWave,
        kneeLTarget: seated ? 1.45 : 0.08 + 0.34 * jumpWave,
        kneeRTarget: seated ? 1.45 : 0.08 + 0.34 * jumpWave,
        footLTarget: seated ? 0.03 : -0.14 * jumpWave,
        footRTarget: seated ? 0.03 : -0.14 * jumpWave,
        armLTarget: -2.56 + pump * 0.18,
        armRTarget: -2.56 - pump * 0.18,
        armLZTarget: 0.36 + jumpWave * 0.1,
        armRZTarget: -0.36 - jumpWave * 0.1,
        elbowLTarget: -0.28,
        elbowRTarget: -0.28,
        bodyLeanTarget: -0.045 * jumpWave,
        bodyRollTarget: Math.sin(pulse) * 0.038,
        bodyYawTarget: Math.cos(pulse) * 0.06,
        bodyBobTarget: jumpWave * 0.006,
        jumpYOffset: seated ? 0 : Math.pow(jumpWave, 1.35) * 0.15,
      };
      break;
    }
    case 'bow': {
      // Đường cong cúi chào mượt: cúi xuống -> giữ nhẹ -> nâng người lên
      const u = Math.max(0, Math.min(1, elapsedSec / durationSec));
      const smoothBow = Math.pow(Math.sin(u * Math.PI), 0.85);
      raw = {
        ...baseLegs,
        kneeLTarget: seated ? 1.45 : 0.05 + 0.06 * smoothBow,
        kneeRTarget: seated ? 1.45 : 0.05 + 0.06 * smoothBow,
        armLTarget: -0.44 * smoothBow,
        armRTarget: -0.44 * smoothBow,
        armLZTarget: -0.22 * smoothBow,
        armRZTarget: 0.22 * smoothBow,
        elbowLTarget: -0.24 - 0.82 * smoothBow,
        elbowRTarget: -0.24 - 0.82 * smoothBow,
        bodyLeanTarget: (seated ? 0.07 : 0) + 0.48 * smoothBow,
        bodyRollTarget: 0,
        bodyYawTarget: 0,
        bodyBobTarget: 0,
        jumpYOffset: 0,
      };
      break;
    }
    case 'clap': {
      // Dao động vỗ tay C∞ mượt không có đỉnh nhọn
      const clapWave = 0.5 - 0.5 * Math.cos(elapsedSec * 14.5);
      const bounce = Math.sin(elapsedSec * 4.8);
      raw = {
        ...baseLegs,
        armLTarget: -1.06 + bounce * 0.04,
        armRTarget: -1.06 - bounce * 0.04,
        armLZTarget: -0.36 + clapWave * 0.21,
        armRZTarget: 0.36 - clapWave * 0.21,
        elbowLTarget: -1.14 - (1 - clapWave) * 0.06,
        elbowRTarget: -1.14 - (1 - clapWave) * 0.06,
        bodyLeanTarget: seated ? 0.06 : 0.025,
        bodyRollTarget: bounce * 0.036,
        bodyYawTarget: bounce * 0.055,
        bodyBobTarget: clapWave * 0.005,
        jumpYOffset: 0,
      };
      break;
    }
    case 'stretch': {
      const sway = Math.sin(elapsedSec * 2.4);
      const breath = 0.5 - 0.5 * Math.cos(elapsedSec * 2.4);
      raw = {
        ...baseLegs,
        armLTarget: -2.68,
        armRTarget: -2.68,
        armLZTarget: 0.15 + sway * 0.09,
        armRZTarget: -0.15 + sway * 0.09,
        elbowLTarget: -0.22,
        elbowRTarget: -0.22,
        bodyLeanTarget: (seated ? 0.05 : 0) - 0.13 * (0.65 + 0.35 * breath),
        bodyRollTarget: sway * 0.078,
        bodyYawTarget: Math.cos(elapsedSec * 2.4) * 0.095,
        bodyBobTarget: breath * 0.006,
        jumpYOffset: 0,
      };
      break;
    }
  }

  return blendPoseToNeutral(raw, neutral, env);
}
