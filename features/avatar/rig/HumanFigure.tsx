// ---------------------------------------------------------------------------
// features/avatar/rig/HumanFigure.tsx — Hình người đầy đủ (HumanFigure) &
// nhân vật người chơi chính (StudentAvatar)
// Module IDs: avatar.rig, avatar.outfit.*
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import { makeFabricTexture } from '../../../components/three/materials';
import { Backpack } from '../appearance/Accessories';
import { SEATED_GROUP_Y_OFFSET } from '../animation/gait';
import {
  OUTFIT_PRESETS,
  PACK_BLACK,
  PACK_ZIP,
  type FigureProps,
  type StudentAvatarProps,
} from '../appearance/presets';
import {
  getSharedAvatarTextures,
  useHustCrimsonLogoTexture,
  useHustSleeveBadgeTexture,
  useHustTexture,
  useStudentIdTexture,
} from '../appearance/textures';
import { Head } from './Head';
import { ArmSide, LegSide } from './Limbs';
import { PelvisBase, Torso, WAIST_PIVOT_Y } from './Torso';

/** Hình người đầy đủ, dùng chung cho người chơi + NPC + Multiplayer + AmbientLife. */
export function HumanFigure(props: FigureProps) {
  const {
    variant,
    gender = 'male',
    shirt,
    shirtDark,
    upperYokeColor,
    sleeveColor,
    skirt,
    skirtColor,
    pants,
    shoe,
    shoeSole,
    hairStyle,
    glasses,
    lanyard = false,
    wristwatch = false,
    cap,
    backpack,
    backpackColors,
    joints,
    showBackpack = true,
    seated = false,
  } = props;
  const hustTex = useHustTexture();
  const hustCrimsonTex = useHustCrimsonLogoTexture();
  const sleeveBadgeTex = useHustSleeveBadgeTexture();
  const idTex = useStudentIdTexture();
  const fabricTex = useMemo(() => makeFabricTexture(5, 5), []);
  const { shadow: shadowTex } = useMemo(() => getSharedAvatarTextures(), []);
  useEffect(() => () => fabricTex.dispose(), [fabricTex]);

  const isFemale = gender === 'female';
  const shoulderX = isFemale ? 0.178 : 0.19;
  const hipX = isFemale ? 0.09 : 0.095;
  const legScale = isFemale ? 0.92 : 1.0;
  const armScale = isFemale ? 0.92 : 1.0;
  const packColors = backpackColors ?? { pack: PACK_BLACK, packLight: '#2A2E33', packZip: PACK_ZIP };
  const effectiveSkirtColor = isFemale ? (skirtColor ?? (skirt ? pants : undefined)) : undefined;
  const shadowY = seated ? 0.036 - SEATED_GROUP_Y_OFFSET : 0.036;

  return (
    <group>
      {/* Đĩa bóng tiếp xúc mềm dưới chân nhân vật (gắn ignoreMeasure để không ảnh hưởng measureAvatar) */}
      <mesh
        userData={{ ignoreMeasure: true }}
        rotation-x={-Math.PI / 2}
        position={[0, shadowY, 0]}
      >
        <planeGeometry args={[0.68, 0.68]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <LegSide
        side={1}
        hipX={hipX}
        legScale={legScale}
        pants={pants}
        skirtColor={effectiveSkirtColor}
        shoe={shoe}
        shoeSole={shoeSole}
        fabricTex={fabricTex}
        hustTex={hustTex}
        hipRef={joints?.legL}
        kneeRef={joints?.kneeL}
        footRef={joints?.footL}
      />
      <LegSide
        side={-1}
        hipX={hipX}
        legScale={legScale}
        pants={pants}
        skirtColor={effectiveSkirtColor}
        shoe={shoe}
        shoeSole={shoeSole}
        fabricTex={fabricTex}
        hustTex={hustTex}
        hipRef={joints?.legR}
        kneeRef={joints?.kneeR}
        footRef={joints?.footR}
      />
      <PelvisBase
        gender={gender}
        pants={pants}
        skirtColor={effectiveSkirtColor}
        fabricTex={fabricTex}
      />
      {/* Đặt tâm xoay của `joints.body` đúng tại khớp eo (WAIST_PIVOT_Y = 0.835m)
          thay vì tại mặt đất (y = 0) để khi cúi chào, nhảy nhót, vươn vai hoặc nghiêng
          người thì thân trên xoay quanh eo và luôn gắn liền với phần hông/chân. */}
      <group position={[0, WAIST_PIVOT_Y, 0]}>
        <group ref={joints?.body}>
          <group position={[0, -WAIST_PIVOT_Y, 0]}>
            <Torso
              variant={variant}
              gender={gender}
              shirt={shirt}
              shirtDark={shirtDark}
              upperYokeColor={upperYokeColor}
              pants={pants}
              skirtColor={effectiveSkirtColor}
              hustTex={hustTex}
              hustCrimsonTex={hustCrimsonTex}
              idTex={idTex}
              fabricTex={fabricTex}
              lanyard={lanyard}
            />
            <ArmSide
              side={1}
              shoulderX={shoulderX}
              armScale={armScale}
              variant={variant}
              shirt={shirt}
              shirtDark={shirtDark}
              upperYokeColor={upperYokeColor}
              sleeveColor={sleeveColor}
              fabricTex={fabricTex}
              sleeveBadgeTex={sleeveBadgeTex}
              wristwatch={wristwatch}
              shoulderRef={joints?.armL}
              elbowRef={joints?.elbowL}
            />
            <ArmSide
              side={-1}
              shoulderX={shoulderX}
              armScale={armScale}
              variant={variant}
              shirt={shirt}
              shirtDark={shirtDark}
              upperYokeColor={upperYokeColor}
              sleeveColor={sleeveColor}
              fabricTex={fabricTex}
              sleeveBadgeTex={sleeveBadgeTex}
              wristwatch={wristwatch}
              shoulderRef={joints?.armR}
              elbowRef={joints?.elbowR}
            />
            <Head gender={gender} hairStyle={hairStyle} glasses={glasses} cap={cap} />
            {backpack && showBackpack && <Backpack colors={packColors} />}
          </group>
        </group>
      </group>
    </group>
  );
}

/** Người chơi chính: mặc định Áo khoác gió đồng phục HUST + hỗ trợ Nam/Nữ + 6 kiểu tóc + 10 trang phục. */
export default function StudentAvatar({
  joints,
  showBackpack = true,
  seated = false,
  gender = 'male',
  hairStyle = 'short',
  outfit = 'windbreaker-hust',
  skirt = false,
  glasses = false,
  lanyard = true,
}: StudentAvatarProps) {
  const preset = OUTFIT_PRESETS[outfit] ?? OUTFIT_PRESETS['windbreaker-hust'];
  const skirtColor = gender === 'female' && skirt ? (preset.defaultSkirtColor ?? '#1E293B') : undefined;
  return (
    <HumanFigure
      variant={preset.variant}
      gender={gender}
      shirt={preset.shirt}
      shirtDark={preset.shirtDark}
      upperYokeColor={preset.upperYokeColor}
      sleeveColor={preset.sleeveColor}
      skirtColor={skirtColor}
      pants={preset.pants}
      shoe={preset.shoe}
      shoeSole={preset.shoeSole}
      hairStyle={hairStyle}
      glasses={glasses}
      lanyard={lanyard}
      wristwatch
      backpack
      backpackColors={{ pack: PACK_BLACK, packLight: '#2A2E33', packZip: PACK_ZIP }}
      joints={joints}
      showBackpack={showBackpack}
      seated={seated}
    />
  );
}
