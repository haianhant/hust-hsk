// ---------------------------------------------------------------------------
// features/campus/buildings/index.ts — Public API barrel cho các khối công trình
// kiến trúc ĐHBK Hà Nội
// ---------------------------------------------------------------------------

export {
  C6AndC8Block,
  C7ComplexBuilding,
  C7FacultyParkingLane,
  D3D5ParkingGarage,
  VietDucCenterBuilding,
} from './C6C7C8Cluster';
export { EastCampusBlocks, SoictB1Building } from './EastCampusBlocks';
export {
  ClassicYellowDormBlock,
  HoiSinhVienBrickGate,
  HustDormitoryZone,
  NewHighRiseDormBlock,
} from './DormitoryComplex';
export {
  FootballGoalpost,
  HustSportsAndStadiumComplex,
} from './SportsAndStadiumComplex';
export {
  C2Building,
  DaiCoVietGate,
  drawC2Sign,
  drawDaiCoVietGateSign,
} from './C2AndNorthGate';
export {
  LibraryStudyArea,
  StudyChair,
  StudySeatMarkers,
  StudyTable,
  type LibraryStudyAreaProps,
  type StudyChairProps,
  type StudySeatMarkersProps,
  type StudyTableModelProps,
} from './library';
