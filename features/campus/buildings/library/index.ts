// ---------------------------------------------------------------------------
// features/campus/buildings/library/index.ts — Public API barrel cho nội thất
// khu vực tự học Thư viện Tạ Quang Bửu (PR8)
// ---------------------------------------------------------------------------

export { LibraryStudyArea, type LibraryStudyAreaProps } from './LibraryStudyArea';
export { StudyChair, type StudyChairProps } from './StudyChair';
export { StudySeatMarkers, type StudySeatMarkersProps } from './StudySeatMarkers';
export { StudyTable, type StudyTableModelProps } from './StudyTable';
export { buildFloors1To5, type Floors1To5Controller, type ElevatorCarState } from './buildFloors1To5';
export { buildFloors6To7, type Floors6To7Controller, type PianoKey3D } from './buildFloors6To7';
export { buildFloor10Rooftop, type Floor10RooftopController } from './buildFloor10Rooftop';
export { buildRoom401, type Room401Controller } from './buildRoom401';
export {
  LIBRARY_VN_FONT,
  disposeObject3D,
  makeBookSpineRowTex,
  makeLibraryWoodGrainTex,
  makeMonitorScreenTex,
  makeVendingFrontTex,
} from './procedural-helpers';
