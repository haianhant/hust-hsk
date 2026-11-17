// ---------------------------------------------------------------------------
// Landmarks.tsx — Compatibility compositor & re-export facade (PR4).
// Các cụm công trình biểu tượng được module hóa tại:
//   - components/three/ParabolGate.tsx
//   - components/three/C1Building.tsx
//   - components/three/LibraryBuilding.tsx
//   - components/three/TienLake.tsx
//   - components/three/C9Building.tsx
//   - features/campus/landscape/C1SquareLandmarks.tsx
//   - features/campus/landscape/TranDaiNghiaSquare.tsx
//   - features/campus/buildings/C2AndNorthGate.tsx
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react';
import { LOVE_ROAD_BENCHES, LOVE_ROAD_TREES } from '../../lib/campus';
import type { TimeOfDay } from '../../lib/playerState';
import { C1Building } from './C1Building';
import { ParabolGate } from './ParabolGate';
import { LibraryBuilding } from './LibraryBuilding';
import { C9Building } from './C9Building';
import { TienLake } from './TienLake';
import ImprovedTree from './Trees';
import { makeWoodGrainTexture } from './materials';
import {
  C1Fountain,
  ILoveBK,
  Nga5PlazaLandmarks,
  SimpleBench,
  TranDaiNghiaMemorialPlaza,
  WhiteRock,
  makeRockTexture,
} from '../../features/campus/landscape/C1SquareLandmarks';
import { TranDaiNghiaSquare } from '../../features/campus/landscape/TranDaiNghiaSquare';
import {
  C2Building,
  DaiCoVietGate,
  drawC2Sign,
  drawDaiCoVietGateSign,
} from '../../features/campus/buildings/C2AndNorthGate';

export {
  SimpleBench,
  ILoveBK,
  makeRockTexture,
  WhiteRock,
  C1Fountain,
  Nga5PlazaLandmarks,
  TranDaiNghiaMemorialPlaza,
  TranDaiNghiaSquare,
  drawC2Sign,
  C2Building,
  drawDaiCoVietGateSign,
  DaiCoVietGate,
};

export default function Landmarks({
  timeOfDay = 'day',
  mountWave = 3,
}: {
  timeOfDay?: TimeOfDay;
  mountWave?: 0 | 1 | 2 | 3;
}) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const benchWoodTex = useMemo(() => makeWoodGrainTexture(2, 1), []);
  useEffect(() => () => benchWoodTex.dispose(), [benchWoodTex]);
  return (
    <group>
      {/* Đợt 0 (Frame 0): Cổng Trần Đại Nghĩa & quảng trường ngay trước điểm spawn */}
      <TranDaiNghiaSquare isNight={isNight} />

      {/* Đợt 1: Thư viện Tạ Quang Bửu trung tâm & hàng cây Đường Tình Yêu */}
      {mountWave >= 1 && (
        <>
          <LibraryBuilding timeOfDay={timeOfDay} />
          {LOVE_ROAD_TREES.map((t, i) => (
            <ImprovedTree key={`love-tree-${i}`} x={t.x} z={t.z} />
          ))}
          {LOVE_ROAD_BENCHES.map((b, i) => (
            <SimpleBench key={`love-bench-${i}`} x={b.x} z={b.z} woodTex={benchWoodTex} />
          ))}
        </>
      )}

      {/* Đợt 2: Khu Tây (Cổng Parabol, Quảng trường C1, Hồ Tiền, C9, C2, Cổng ĐCV) */}
      {mountWave >= 2 && (
        <>
          <ParabolGate timeOfDay={timeOfDay} />
          <C1Building timeOfDay={timeOfDay} />
          <ILoveBK isNight={isNight} />
          <TienLake timeOfDay={timeOfDay} />
          <C9Building timeOfDay={timeOfDay} />
          <WhiteRock />
          <C1Fountain isNight={isNight} />
          <Nga5PlazaLandmarks isNight={isNight} />
          <TranDaiNghiaMemorialPlaza isNight={isNight} />
          <C2Building isNight={isNight} />
          <DaiCoVietGate />
        </>
      )}
    </group>
  );
}
