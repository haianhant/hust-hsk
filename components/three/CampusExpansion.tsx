// ---------------------------------------------------------------------------
// CampusExpansion.tsx — Compatibility compositor & re-export facade (PR4).
// Các khối công trình đã được module hóa theo phân khu tại:
//   - features/campus/buildings/C6C7C8Cluster.tsx
//   - features/campus/buildings/EastCampusBlocks.tsx
//   - features/campus/buildings/DormitoryComplex.tsx
//   - features/campus/buildings/SportsAndStadiumComplex.tsx
//   - features/campus/landscape/CampusGatesAndPerimeter.tsx
// ---------------------------------------------------------------------------

import { C15_BUILDING, C6_BUILDING } from '../../lib/campus';
import { playerState } from '../../lib/playerState';
import {
  AlumniHouseBuilding,
  C6AndC8Block,
  C7ComplexBuilding,
  C7FacultyParkingLane,
  D3D5ParkingGarage,
  HustDigitalHubBuilding,
  SchoolOfMaterialsBuilding,
  VietDucCenterBuilding,
} from '../../features/campus/buildings/C6C7C8Cluster';
import { CampusParkingAndAnnexes } from '../../features/campus/landscape/CampusParkingAndAnnexes';
import {
  EastCampusBlocks,
  SoictB1Building,
} from '../../features/campus/buildings/EastCampusBlocks';
import {
  ClassicYellowDormBlock,
  HoiSinhVienBrickGate,
  HustDormitoryZone,
  NewHighRiseDormBlock,
} from '../../features/campus/buildings/DormitoryComplex';
import {
  FootballGoalpost,
  HustSportsAndStadiumComplex,
} from '../../features/campus/buildings/SportsAndStadiumComplex';
import {
  CampusPerimeterFence,
  ParabolBusStop,
  TaQuangBuuGate,
  TranDaiNghiaCandlePillars,
} from '../../features/campus/landscape/CampusGatesAndPerimeter';

export {
  AlumniHouseBuilding,
  C6AndC8Block,
  C7ComplexBuilding,
  C7FacultyParkingLane,
  CampusParkingAndAnnexes,
  D3D5ParkingGarage,
  HustDigitalHubBuilding,
  SchoolOfMaterialsBuilding,
  VietDucCenterBuilding,
  SoictB1Building,
  EastCampusBlocks,
  ClassicYellowDormBlock,
  NewHighRiseDormBlock,
  HoiSinhVienBrickGate,
  HustDormitoryZone,
  FootballGoalpost,
  HustSportsAndStadiumComplex,
  TaQuangBuuGate,
  ParabolBusStop,
  TranDaiNghiaCandlePillars,
  CampusPerimeterFence,
};

export default function CampusExpansion({
  timeOfDay = 'day',
  hskMode = false,
  mountWave = 3,
}: {
  timeOfDay?: 'day' | 'sunset' | 'night';
  hskMode?: boolean;
  mountWave?: 0 | 1 | 2 | 3;
}) {
  const isNight = (timeOfDay ?? playerState.timeOfDay) !== 'day';

  return (
    <group>
      {/* Đợt 0 (Frame 0): Tòa C7, đường xe C7/D3-D5 & hàng rào Cổng Trần Đại Nghĩa */}
      <C7ComplexBuilding isNight={isNight} hskMode={hskMode} />
      <C7FacultyParkingLane isNight={isNight} />
      <D3D5ParkingGarage />
      <TranDaiNghiaCandlePillars />
      <CampusPerimeterFence />

      {/* Đợt 1: Các khối nhà kề cận khu Đông/Trung tâm (C6, SMSE, C15, B1, KTX, Cổng TQB) */}
      {mountWave >= 1 && (
        <>
          <C6AndC8Block
            code="C6"
            subtitle="NHÀ C6"
            center={C6_BUILDING.center}
            size={C6_BUILDING.size}
            floors={C6_BUILDING.floors}
            floorHeight={C6_BUILDING.floorHeight}
            isNight={isNight}
          />
          <SchoolOfMaterialsBuilding isNight={isNight} />
          <C6AndC8Block
            code="C15"
            subtitle="NHÀ C15"
            center={C15_BUILDING.center}
            size={C15_BUILDING.size}
            floors={C15_BUILDING.floors}
            floorHeight={C15_BUILDING.floorHeight}
            isNight={isNight}
          />
          <HustDormitoryZone isNight={isNight} />
          <SoictB1Building isNight={isNight} />
          <TaQuangBuuGate />
        </>
      )}

      {/* Đợt 2: Khu thể thao, KTX Đông-Nam, bờ Bắc Hồ Tiền & bãi xe toàn trường */}
      {mountWave >= 2 && (
        <>
          <CampusParkingAndAnnexes isNight={isNight} />
          <VietDucCenterBuilding isNight={isNight} />
          <HustDigitalHubBuilding isNight={isNight} />
          <AlumniHouseBuilding isNight={isNight} />
          <EastCampusBlocks isNight={isNight} />
          <HustSportsAndStadiumComplex isNight={isNight} />
          <ParabolBusStop />
        </>
      )}
    </group>
  );
}
