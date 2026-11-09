// ---------------------------------------------------------------------------
// CampusExpansion.tsx — Compatibility compositor & re-export facade (PR4).
// Các khối công trình đã được module hóa theo phân khu tại:
//   - features/campus/buildings/C6C7C8Cluster.tsx
//   - features/campus/buildings/EastCampusBlocks.tsx
//   - features/campus/buildings/DormitoryComplex.tsx
//   - features/campus/buildings/SportsAndStadiumComplex.tsx
//   - features/campus/landscape/CampusGatesAndPerimeter.tsx
// ---------------------------------------------------------------------------

import { C6_BUILDING, C8_BUILDING } from '../../lib/campus';
import { playerState } from '../../lib/playerState';
import {
  C6AndC8Block,
  C7ComplexBuilding,
  C7FacultyParkingLane,
  D3D5ParkingGarage,
  VietDucCenterBuilding,
} from '../../features/campus/buildings/C6C7C8Cluster';
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
  C6AndC8Block,
  C7ComplexBuilding,
  C7FacultyParkingLane,
  D3D5ParkingGarage,
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
}: {
  timeOfDay?: 'day' | 'sunset' | 'night';
}) {
  const isNight = (timeOfDay ?? playerState.timeOfDay) !== 'day';

  return (
    <group>
      {/* Cụm 3 tòa C6 – C7 – C8 sát đường Trần Đại Nghĩa */}
      <C6AndC8Block
        code="C6"
        subtitle="VIỆN CƠ KHÍ ĐỘNG LỰC"
        center={C6_BUILDING.center}
        size={C6_BUILDING.size}
        floors={C6_BUILDING.floors}
        floorHeight={C6_BUILDING.floorHeight}
        isNight={isNight}
      />
      <C7ComplexBuilding isNight={isNight} />
      <C6AndC8Block
        code="C8"
        subtitle="KHỐI GIẢNG ĐƯỜNG & THÍ NGHIỆM C8"
        center={C8_BUILDING.center}
        size={C8_BUILDING.size}
        floors={C8_BUILDING.floors}
        floorHeight={C8_BUILDING.floorHeight}
        isNight={isNight}
      />

      {/* Bên trái Cổng Trần Đại Nghĩa (+Z): Nhà để xe sinh viên D3 - D5 (tham-khao/Nha-de-xe-D3-D5/images.jpg) */}
      <D3D5ParkingGarage />

      {/* Bên phải Cổng Trần Đại Nghĩa (-Z): Trục đường & làn đỗ xe ô tô giảng viên cạnh tòa C7 */}
      <C7FacultyParkingLane isNight={isNight} />

      {/* Nhà Bắc Hồ Tiền (VDZ) */}
      <VietDucCenterBuilding isNight={isNight} />

      {/* Phân khu phía Đông đường Trần Đại Nghĩa: KTX B3–B13, Nhà B1 (SoICT), A17/H1/H3/Nhà T, Khu Thể thao & SVĐ */}
      <HustDormitoryZone isNight={isNight} />
      <SoictB1Building isNight={isNight} />
      <EastCampusBlocks isNight={isNight} />
      <HustSportsAndStadiumComplex isNight={isNight} />

      <TaQuangBuuGate />
      <ParabolBusStop />
      <TranDaiNghiaCandlePillars />
      <CampusPerimeterFence />
    </group>
  );
}
