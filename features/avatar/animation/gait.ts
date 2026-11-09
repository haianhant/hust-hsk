// ---------------------------------------------------------------------------
// features/avatar/animation/gait.ts — Helper tính góc khớp đi bộ / chạy / đứng /
// ngồi học tự nhiên, chống lạch bạch (dùng chung cho Player, RemotePlayers,
// AmbientLife & CharacterCreatorModal 3D Preview).
// Module ID: avatar.rig
// ---------------------------------------------------------------------------

/** Độ hạ thấp gốc nhân vật khi ngồi trên ghế thư viện (mặt đệm ghế cao 0.45m, khớp hông local ở y = 0.80m). */
export const SEATED_GROUP_Y_OFFSET = -0.35;

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
