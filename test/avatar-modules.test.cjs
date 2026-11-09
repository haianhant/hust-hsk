// ---------------------------------------------------------------------------
// test/avatar-modules.test.cjs — Unit tests for PR4 3D modularization:
//   1. Avatar presets & 10 HUST uniform contracts (`features/avatar/appearance/presets.ts`)
//   2. Natural gait animation math (`features/avatar/animation/gait.ts`)
//   3. Structural exports of modularized 3D building/landscape/avatar facades
// ---------------------------------------------------------------------------
'use strict';

require('./register-ts.cjs');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const presetsMod = require('../features/avatar/appearance/presets.ts');
const gaitMod = require('../features/avatar/animation/gait.ts');
const mpContracts = require('../shared/contracts/multiplayer.ts');
const buildingsBarrel = require('../features/campus/buildings/index.ts');
const landscapeBarrel = require('../features/campus/landscape/index.ts');
const campusExpansionFacade = require('../components/three/CampusExpansion.tsx');
const landmarksFacade = require('../components/three/Landmarks.tsx');
const studentAvatarFacade = require('../components/three/StudentAvatar.tsx');

describe('PR4 — Avatar Appearance Presets & Uniform Contracts', () => {
  test('OUTFIT_PRESETS covers all 10 HUST uniforms in shared multiplayer contract', () => {
    const { OUTFIT_PRESETS, AVATAR_COLORS } = presetsMod;
    const { VALID_OUTFIT_IDS } = mpContracts;

    assert.equal(Object.keys(OUTFIT_PRESETS).length, 10);
    for (const outfitId of VALID_OUTFIT_IDS) {
      const preset = OUTFIT_PRESETS[outfitId];
      assert.ok(preset, `Missing OUTFIT_PRESETS entry for ${outfitId}`);
      assert.ok(preset.label.length > 0);
      assert.ok(preset.desc.length > 0);
      assert.ok(preset.shirt.startsWith('#'));
      assert.ok(preset.shirtDark.startsWith('#'));
      assert.ok(preset.pants.startsWith('#'));
      assert.ok(preset.shoe.startsWith('#'));
      assert.ok(preset.shoeSole.startsWith('#'));
      assert.ok(
        preset.defaultSkirtColor && preset.defaultSkirtColor.startsWith('#'),
        `${outfitId} must define defaultSkirtColor for female skirt option`,
      );
    }

    // Windbreaker HUST invariants
    assert.equal(OUTFIT_PRESETS['windbreaker-hust'].variant, 'windbreaker');
    assert.equal(OUTFIT_PRESETS['windbreaker-hust'].upperYokeColor, '#F4F6F9');
    assert.equal(OUTFIT_PRESETS['windbreaker-hust'].shirt, '#B5121B');

    // 3 Bomber variants define sleeveColor
    for (const bomberId of ['bomber-red-grey', 'bomber-navy-white', 'bomber-red-navy']) {
      assert.equal(OUTFIT_PRESETS[bomberId].variant, 'bomber');
      assert.ok(OUTFIT_PRESETS[bomberId].sleeveColor?.startsWith('#'));
    }

    assert.ok(AVATAR_COLORS.NAVY);
    assert.ok(AVATAR_COLORS.KHAKI);
    assert.ok(AVATAR_COLORS.SHIRT_WHITE);
  });

  test('computeNaturalGaitTargets satisfies anti-waddle and joint sign invariants', () => {
    const { computeNaturalGaitTargets } = gaitMod;

    // 1. Idle state (blend = 0)
    const idle = computeNaturalGaitTargets(0, 0.5, 0, 1.5, false);
    assert.ok(Math.abs(idle.legLTarget) === 0);
    assert.ok(Math.abs(idle.legRTarget) === 0);
    assert.ok(Math.abs(idle.footLTarget) === 0);
    assert.ok(Math.abs(idle.footRTarget) === 0);
    assert.ok(Math.abs(idle.kneeLTarget - 0.05) < 1e-9);
    assert.ok(Math.abs(idle.kneeRTarget - 0.05) < 1e-9);
    assert.ok(idle.elbowLTarget < -0.2);
    assert.ok(idle.elbowRTarget < -0.3);

    // 2. Walk cycle (blend = 1, isRunning = false) & Run cycle (isRunning = true)
    for (const isRunning of [false, true]) {
      const swing = isRunning ? 0.62 : 0.5;
      for (let p = 0; p < Math.PI * 2; p += Math.PI / 6) {
        const g = computeNaturalGaitTargets(p, swing, 1, 2.0, isRunning);
        // Anti-phase legs
        assert.ok(Math.abs(g.legLTarget + g.legRTarget) < 1e-9);
        // Knee flex is always positive (cẳng chân gập về sau)
        assert.ok(g.kneeLTarget >= 0.05 - 1e-9);
        assert.ok(g.kneeRTarget >= 0.05 - 1e-9);
        // Elbow flex is always negative (cẳng tay gập về trước)
        assert.ok(g.elbowLTarget < 0);
        assert.ok(g.elbowRTarget < 0);
        // Foot compensation clamped to [-0.45, 0.45]
        assert.ok(g.footLTarget >= -0.45 && g.footLTarget <= 0.45);
        assert.ok(g.footRTarget >= -0.45 && g.footRTarget <= 0.45);
        // Anti-waddle body roll <= 0.0081 rad
        assert.ok(Math.abs(g.bodyRollTarget) <= 0.0081);
      }
    }
  });

  test('3D component facades and feature barrels export all expected components', () => {
    // StudentAvatar facade
    assert.equal(typeof studentAvatarFacade.default, 'function');
    assert.equal(typeof studentAvatarFacade.HumanFigure, 'function');
    assert.equal(typeof studentAvatarFacade.computeNaturalGaitTargets, 'function');
    assert.equal(typeof studentAvatarFacade.computeSeatedPoseTargets, 'function');
    assert.equal(studentAvatarFacade.SEATED_GROUP_Y_OFFSET, -0.35);
    assert.equal(studentAvatarFacade.OUTFIT_PRESETS, presetsMod.OUTFIT_PRESETS);
    assert.equal(studentAvatarFacade.AVATAR_COLORS, presetsMod.AVATAR_COLORS);

    // PR8 seated pose targets & LibraryStudyArea exports
    const seatedPose = gaitMod.computeSeatedPoseTargets(1.2);
    assert.equal(seatedPose.legLTarget, -1.48);
    assert.equal(seatedPose.legRTarget, -1.48);
    assert.equal(seatedPose.kneeLTarget, 1.45);
    assert.equal(seatedPose.kneeRTarget, 1.45);
    assert.ok(seatedPose.elbowLTarget < -0.8);
    assert.ok(seatedPose.elbowRTarget < -0.8);
    assert.ok(seatedPose.bodyLeanTarget > 0.05);

    for (const fnName of [
      'LibraryStudyArea',
      'StudyTable',
      'StudyChair',
      'StudySeatMarkers',
    ]) {
      assert.equal(typeof buildingsBarrel[fnName], 'function', `buildingsBarrel.${fnName}`);
    }

    // CampusExpansion facade + feature/campus/buildings + feature/campus/landscape
    assert.equal(typeof campusExpansionFacade.default, 'function');
    for (const fnName of [
      'C6AndC8Block',
      'C7ComplexBuilding',
      'VietDucCenterBuilding',
      'SoictB1Building',
      'EastCampusBlocks',
      'ClassicYellowDormBlock',
      'NewHighRiseDormBlock',
      'HoiSinhVienBrickGate',
      'HustDormitoryZone',
      'FootballGoalpost',
      'HustSportsAndStadiumComplex',
    ]) {
      assert.equal(typeof buildingsBarrel[fnName], 'function', `buildingsBarrel.${fnName}`);
      assert.equal(campusExpansionFacade[fnName], buildingsBarrel[fnName]);
    }

    for (const fnName of [
      'TaQuangBuuGate',
      'ParabolBusStop',
      'TranDaiNghiaCandlePillars',
      'CampusPerimeterFence',
    ]) {
      assert.equal(typeof landscapeBarrel[fnName], 'function', `landscapeBarrel.${fnName}`);
      assert.equal(campusExpansionFacade[fnName], landscapeBarrel[fnName]);
    }

    // Landmarks facade
    assert.equal(typeof landmarksFacade.default, 'function');
    for (const fnName of [
      'SimpleBench',
      'ILoveBK',
      'makeRockTexture',
      'WhiteRock',
      'C1Fountain',
      'TranDaiNghiaSquare',
    ]) {
      assert.equal(typeof landscapeBarrel[fnName], 'function', `landscapeBarrel.${fnName}`);
      assert.equal(landmarksFacade[fnName], landscapeBarrel[fnName]);
    }
    for (const fnName of [
      'drawC2Sign',
      'C2Building',
      'drawDaiCoVietGateSign',
      'DaiCoVietGate',
    ]) {
      assert.equal(typeof buildingsBarrel[fnName], 'function', `buildingsBarrel.${fnName}`);
      assert.equal(landmarksFacade[fnName], buildingsBarrel[fnName]);
    }
  });
});
