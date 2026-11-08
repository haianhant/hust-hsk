// ---------------------------------------------------------------------------
// lib/campus.ts — Compatibility Facade cho dữ liệu thế giới 3D ĐHBK Hà Nội (PR3).
// Toàn bộ dữ liệu đã được tách theo trách nhiệm tại `features/campus/world-data/`:
//   - bounds.ts         (BOUNDS, SPAWN, AVATAR, BIKE_*, Vec2, AABB)
//   - buildings.ts      (PARABOL_GATE, C1, LIBRARY, LAKE, C9, C7_BUILDING, SOICT_B1, DORM_COMPLEX, ...)
//   - roads.ts          (ROADS, LOVE_ROAD_TREES, LOVE_ROAD_BENCHES)
//   - colliders.ts      (BUILDING_COLLIDERS, CLASSROOM_COLLIDERS, LIBRARY_LOBBY_COLLIDERS, TREE_TRUNKS, NPC_CIRCLES)
//   - zones.ts          (ZONES, CAMPUS_MAP_BUILDINGS, nearestZone)
//   - navigation.ts     (FAST_TRAVEL_DESTINATIONS, getFastTravelDestination, LEGS)
//   - spatial-utils.ts  (pointInLake, resolveCollisions, resolveClassroomCollisions, resolveLibraryLobbyCollisions, resolveBikeCollisions, nearestRoadPoint, findFreeSpotNear)
// Giữ nguyên toàn bộ public exports tại `lib/campus.ts` để đảm bảo 100% tương thích ngược.
// ---------------------------------------------------------------------------

export * from '../features/campus/world-data';
