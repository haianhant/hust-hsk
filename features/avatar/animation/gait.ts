// ---------------------------------------------------------------------------
// features/avatar/animation/gait.ts — Helper tính góc khớp đi bộ / chạy / đứng
// tự nhiên, chống lạch bạch (dùng chung cho Player, RemotePlayers, AmbientLife
// & CharacterCreatorModal 3D Preview).
// Module ID: avatar.rig
// ---------------------------------------------------------------------------

export function computeNaturalGaitTargets(
  phase: number,
  swing: number,
  blend: number,
  t: number,
  isRunning: boolean,
) {
  const legSwing = Math.sin(phase) * swing * blend;
  const legLTarget = legSwing;
  const legRTarget = -legSwing;
  const kneeLTarget = 0.05 + (isRunning ? 0.96 : 0.82) * Math.max(0, -Math.cos(phase)) * blend;
  const kneeRTarget = 0.05 + (isRunning ? 0.96 : 0.82) * Math.max(0, Math.cos(phase)) * blend;
  const footLTarget = Math.min(Math.max(-(legLTarget + kneeLTarget) * 0.85, -0.45), 0.45) * blend;
  const footRTarget = Math.min(Math.max(-(legRTarget + kneeRTarget) * 0.85, -0.45), 0.45) * blend;
  const armSwing = legSwing * (isRunning ? 0.82 : 0.72);
  const armLTarget = -armSwing + (1 - blend) * 0.08;
  const armRTarget = armSwing + (1 - blend) * -0.04;
  const elbowLTarget = -(0.28 + (isRunning ? 0.34 : 0.18) * blend * Math.max(0, Math.sin(phase)));
  const elbowRTarget = -(0.36 + (isRunning ? 0.34 : 0.18) * blend * Math.max(0, Math.sin(phase + Math.PI)));
  const bodyLeanTarget = 0.045 * blend + (isRunning ? 0.055 * blend : 0);
  // Giảm mạnh lắc ngang thân (0.008 rad) để triệt tiêu hoàn toàn dáng đi lạch bạch
  const bodyRollTarget = Math.sin(phase) * 0.008 * blend + Math.sin(t * 0.9) * 0.008 * (1 - blend);
  const bodyBobTarget = Math.abs(Math.cos(phase)) * 0.016 * blend + Math.sin(t * 1.4) * 0.004;

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
