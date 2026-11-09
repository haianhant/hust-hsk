// ---------------------------------------------------------------------------
// LibraryLobby.tsx — NỘI THẤT ĐA TẦNG THƯ VIỆN TẠ QUANG BỬU (TẦNG 1–10)
// Chuẩn hóa toàn diện theo mô hình kiến trúc thủ tục studywithhuster.cyou kết hợp
// 100% tính năng học HSK & Multiplayer Study Presence (PR8/PR9):
//   - Khối A (Tầng 1–5): Đại sảnh thông tầng 5 tầng hình sân vận động (Stadium Atrium
//     39m × 26m × 22.5m), sàn ngôi sao 16 cánh, tranh trần Mặt trời, 2 cầu thang xoắn
//     đôi lên Tầng 2, 3 thang máy hoạt động, Phòng Mượn Sách tầng 1, hành lang tự học
//     Tầng 2–3 và 11 Phòng đọc Tầng 4–5 (Phòng 401, 501, 411, 419, 402, 418, 404...).
//   - Khối B (Tầng 6–7): Không gian Sáng tạo & Lounge ("INNOVATE · CONNECT ·
//     COLLABORATE · CREATE"), cột phễu loe LatheGeometry, đảo gỗ 3 ô dù, ghế bành
//     Mustard và Đại dương cầm 88 phím (Grand Piano) phát nhạc WebAudio tương tác.
//   - Khối D (Sân thượng Tầng 10): Sân thượng ngắm sao, giàn gỗ Pergola chăng đèn
//     dây vàng, ghế tắm nắng, Đài ngắm sao tròn và Kính thiên văn xoay hướng bầu trời.
//   - Bảo toàn 100% tọa độ & raycast của Tượng GS. Tạ Quang Bửu, Quầy thông tin,
//     Bảng từ vựng HSK và 4 ghế ngồi học Multiplayer (tqb-1f-t1-s1..s2, tqb-1f-t2-s1..s2).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  LibraryStudyArea,
  buildFloor10Rooftop,
  buildFloors1To5,
  buildFloors6To7,
  disposeObject3D,
  type Floor10RooftopController,
  type Floors6To7Controller,
} from '../../features/campus/buildings/library';
import {
  LIBRARY_LOBBY,
  getCollidersForFloor,
  libraryNavigationController,
  type LibraryFloor,
} from '../../lib/campus';
import { playerState } from '../../lib/playerState';
import { LabelPlane } from './TextPlate';

export interface LibraryLobbyProps {
  activeSeatId?: string | null;
  nearestSeatId?: string | null;
  onObjectClick?: (id: string) => void;
}

const WOOD_DARK = '#3B2214';
const WOOD_MID = '#54321E';
const BRONZE_DARK = '#4A3623';
const GOLD_BRASS = '#D4AF37';
const VELVET_RED = '#A81C24';
const AMBER_GLOW = '#FFB627';

// --- Bức tường gỗ nhị phân 0/1 & diềm hồi văn phát sáng ----------------------
function makeBinaryWallTextures(): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const w = 1024;
  const h = 512;
  const cMap = document.createElement('canvas');
  cMap.width = w;
  cMap.height = h;
  const ctxM = cMap.getContext('2d')!;

  const cEm = document.createElement('canvas');
  cEm.width = w;
  cEm.height = h;
  const ctxE = cEm.getContext('2d')!;

  const grad = ctxM.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#3D2314');
  grad.addColorStop(0.5, '#4E2E1B');
  grad.addColorStop(1, '#331D10');
  ctxM.fillStyle = grad;
  ctxM.fillRect(0, 0, w, h);

  ctxE.fillStyle = '#000000';
  ctxE.fillRect(0, 0, w, h);

  ctxM.strokeStyle = 'rgba(20, 10, 4, 0.55)';
  ctxM.lineWidth = 3;
  for (let x = 64; x < w; x += 64) {
    ctxM.beginPath();
    ctxM.moveTo(x, 60);
    ctxM.lineTo(x, h);
    ctxM.stroke();
  }

  const drawMeander = (ctx: CanvasRenderingContext2D, color: string, glow: boolean) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = glow ? 5 : 4;
    if (glow) {
      ctx.shadowColor = '#FFA000';
      ctx.shadowBlur = 12;
    }
    ctx.strokeRect(12, 10, w - 24, 42);
    const step = 48;
    for (let x = 24; x < w - 48; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 44);
      ctx.lineTo(x, 18);
      ctx.lineTo(x + 30, 18);
      ctx.lineTo(x + 30, 36);
      ctx.lineTo(x + 14, 36);
      ctx.lineTo(x + 14, 26);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawMeander(ctxM, '#FFD57E', false);
  drawMeander(ctxE, '#FFB830', true);

  let seed = 19101986;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const cols = 16;
  const rows = 7;
  for (let c = 0; c < cols; c++) {
    const cx = 32 + c * 64;
    const isCenterBehindStatue = c >= 6 && c <= 9;
    for (let r = 0; r < rows; r++) {
      const cy = 92 + r * 58;
      if (isCenterBehindStatue && r >= 1 && r <= 4 && rnd() < 0.55) continue;

      const isZero = (c + r) % 2 === 0 || rnd() > 0.48;
      const drawGlyph = (ctx: CanvasRenderingContext2D, stroke: string, glow: boolean) => {
        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.fillStyle = stroke;
        ctx.lineWidth = glow ? 6 : 5;
        if (glow) {
          ctx.shadowColor = '#FF9900';
          ctx.shadowBlur = 14;
        }
        if (isZero) {
          ctx.beginPath();
          ctx.arc(cx, cy, 16, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.roundRect(cx - 4, cy - 18, 8, 36, 3);
          ctx.fill();
        }
        ctx.restore();
      };
      drawGlyph(ctxM, '#FFE08A', false);
      drawGlyph(ctxE, '#FFAE19', true);
    }
  }

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const emissiveMap = new THREE.CanvasTexture(cEm);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = 4;

  return { map, emissiveMap };
}

// --- Biển đồng trên bệ tượng GS. Tạ Quang Bửu --------------------------------
function drawStatuePlaque(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#C89D28';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#5A410A';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#241705';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 46px Arial, sans-serif';
  ctx.fillText('GIÁO SƯ TẠ QUANG BỬU', w / 2, h * 0.28);
  ctx.font = '800 38px Arial, sans-serif';
  ctx.fillText('(1910 – 1986)', w / 2, h * 0.56);
  ctx.font = '700 26px Arial, sans-serif';
  ctx.fillText('HIỆU TRƯỞNG ĐẦU TIÊN TRƯỜNG ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.82);
}

// --- Bảng từ vựng Hán ngữ chuyên đề Thư viện & Khoa học ----------------------
function drawLibraryVocabBoard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#1E2D24';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#C9A227';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFD166';
  ctx.font = '900 54px Arial, sans-serif';
  ctx.fillText('谢光宝图书馆 · 常用词汇', w / 2, h * 0.14);

  ctx.fillStyle = '#F5F5F0';
  ctx.font = '700 40px Arial, sans-serif';
  ctx.fillText('图书馆  túshūguǎn — Thư viện', w / 2, h * 0.34);
  ctx.fillText('科学  kēxué — Khoa học · 技术  jìshù — Kỹ thuật', w / 2, h * 0.52);
  ctx.fillText('借书  jièshū — Mượn sách · 阅读  yuèdú — Đọc sách', w / 2, h * 0.70);

  ctx.fillStyle = '#A8E6CF';
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText('Bấm vào bảng hoặc tượng GS. Tạ Quang Bửu (phím E) để nghe phát âm', w / 2, h * 0.88);
}

// --- Biển tên Quầy thông tin Thư viện ----------------------------------------
function drawInfoDeskSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#3B2214';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#FFE08A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 46px Arial, sans-serif';
  ctx.fillText('咨询与借书处 · QUẦY THÔNG TIN', w / 2, h * 0.5);
}

export default function LibraryLobby({
  activeSeatId = null,
  nearestSeatId = null,
  onObjectClick,
}: LibraryLobbyProps) {
  const binaryWall = useMemo(() => makeBinaryWallTextures(), []);

  // Khởi tạo 3 phân khu kiến trúc đa tầng của Thư viện Tạ Quang Bửu (Tầng 1–5, Tầng 6–7, Sân thượng Tầng 10)
  // Các tầng trên (Tầng 2–5 nội thất hành lang/phòng đọc, Khối B Tầng 6–7, Khối D Tầng 10)
  // được khởi tạo lười (lazy-init) ngay khi chuyển tới tầng đó để mount Tầng 1 tức thì.
  const multiFloor = useMemo(() => {
    const groupA = new THREE.Group();
    const ctrlA = buildFloors1To5(groupA);

    const groupB = new THREE.Group();
    groupB.visible = false;
    let ctrlB: Floors6To7Controller | null = null;
    const ensureBlockB = () => {
      if (!ctrlB) ctrlB = buildFloors6To7(groupB);
      return ctrlB;
    };
    const disposeBlockB = () => {
      ctrlB?.dispose();
    };

    const groupD = new THREE.Group();
    groupD.visible = false;
    let ctrlD: Floor10RooftopController | null = null;
    const ensureBlockD = () => {
      if (!ctrlD) ctrlD = buildFloor10Rooftop(groupD);
      return ctrlD;
    };

    return { groupA, ctrlA, groupB, ensureBlockB, disposeBlockB, groupD, ensureBlockD };
  }, []);

  const floor1AnchorsRef = useRef<THREE.Group>(null);
  const floor6InteractiveRef = useRef<THREE.Group>(null);
  const floor10InteractiveRef = useRef<THREE.Group>(null);
  const debugOverlayRef = useRef<THREE.Group>(null);
  const debugFloorRenderedRef = useRef<LibraryFloor | null>(null);
  const perfStatsRef = useRef({ lastFrameDeltaMs: 0, maxFrameDeltaMs: 0 });

  useEffect(() => {
    const prepareFloor = (flr: LibraryFloor) => {
      const showFloor1 = flr === 1;
      const showBlockA = flr >= 1 && flr <= 5;
      const showBlockB = flr === 6 || flr === 7;
      const showBlockD = flr === 10;

      if (showBlockA) {
        multiFloor.ctrlA.prepareFloor(flr);
      } else if (showBlockB) {
        multiFloor.ensureBlockB();
      } else if (showBlockD) {
        multiFloor.ensureBlockD();
      }

      multiFloor.groupA.visible = showBlockA;
      multiFloor.groupB.visible = showBlockB;
      multiFloor.groupD.visible = showBlockD;
      if (floor1AnchorsRef.current) floor1AnchorsRef.current.visible = showFloor1;
      if (floor6InteractiveRef.current) floor6InteractiveRef.current.visible = flr === 6;
      if (floor10InteractiveRef.current) floor10InteractiveRef.current.visible = showBlockD;
      perfStatsRef.current.maxFrameDeltaMs = 0;
      return true;
    };

    return libraryNavigationController.registerHooks({ prepareFloor });
  }, [multiFloor]);

  useEffect(() => {
    const onPianoNote = (ev: Event) => {
      const detail = (ev as CustomEvent<{ midi?: number; velocity?: number }>).detail;
      if (detail && typeof detail.midi === 'number') {
        multiFloor.ensureBlockB().playPianoNote(detail.midi, detail.velocity ?? 0.8);
      }
    };
    const onElevatorCall = (ev: Event) => {
      const detail = (ev as CustomEvent<{ floor?: number }>).detail;
      if (detail && typeof detail.floor === 'number' && detail.floor >= 1 && detail.floor <= 5) {
        multiFloor.ctrlA.callLift(detail.floor);
      }
    };
    window.addEventListener('bkhn:piano-note', onPianoNote);
    window.addEventListener('bkhn:elevator-call', onElevatorCall);
    return () => {
      window.removeEventListener('bkhn:piano-note', onPianoNote);
      window.removeEventListener('bkhn:elevator-call', onElevatorCall);
    };
  }, [multiFloor]);

  useEffect(() => {
    return () => {
      binaryWall.map.dispose();
      binaryWall.emissiveMap.dispose();
      multiFloor.disposeBlockB();
      disposeObject3D(multiFloor.groupA);
      disposeObject3D(multiFloor.groupB);
      disposeObject3D(multiFloor.groupD);
      if (debugOverlayRef.current) {
        disposeObject3D(debugOverlayRef.current);
      }
    };
  }, [binaryWall, multiFloor]);

  useFrame((state, rawDelta) => {
    const dtMs = rawDelta * 1000;
    perfStatsRef.current.lastFrameDeltaMs = Number(dtMs.toFixed(2));
    if (dtMs > perfStatsRef.current.maxFrameDeltaMs && dtMs < 2000) {
      perfStatsRef.current.maxFrameDeltaMs = Number(dtMs.toFixed(2));
    }
    if (typeof window !== 'undefined') {
      const w = window as unknown as {
        __bkhnLibraryPerf?: {
          calls: number;
          triangles: number;
          geometries: number;
          textures: number;
          lastFrameDeltaMs: number;
          maxFrameDeltaMs: number;
          floor: number;
        };
      };
      w.__bkhnLibraryPerf = {
        calls: state.gl.info.render.calls,
        triangles: state.gl.info.render.triangles,
        geometries: state.gl.info.memory.geometries,
        textures: state.gl.info.memory.textures,
        lastFrameDeltaMs: perfStatsRef.current.lastFrameDeltaMs,
        maxFrameDeltaMs: perfStatsRef.current.maxFrameDeltaMs,
        floor: playerState.libraryFloor,
      };
    }
    const dt = Math.min(rawDelta, 0.05);
    const flr = playerState.libraryFloor;
    const showFloor1 = flr === 1;
    const showBlockA = flr >= 1 && flr <= 5;
    const showBlockB = flr === 6 || flr === 7;
    const showBlockD = flr === 10;

    if (multiFloor.groupA.visible !== showBlockA) multiFloor.groupA.visible = showBlockA;
    if (multiFloor.groupB.visible !== showBlockB) multiFloor.groupB.visible = showBlockB;
    if (multiFloor.groupD.visible !== showBlockD) multiFloor.groupD.visible = showBlockD;
    if (floor1AnchorsRef.current && floor1AnchorsRef.current.visible !== showFloor1) {
      floor1AnchorsRef.current.visible = showFloor1;
    }
    if (floor6InteractiveRef.current && floor6InteractiveRef.current.visible !== (flr === 6)) {
      floor6InteractiveRef.current.visible = flr === 6;
    }
    if (floor10InteractiveRef.current && floor10InteractiveRef.current.visible !== showBlockD) {
      floor10InteractiveRef.current.visible = showBlockD;
    }

    if (debugOverlayRef.current) {
      const wantDebug = Boolean(playerState.libraryCollisionDebug);
      if (debugOverlayRef.current.visible !== wantDebug) {
        debugOverlayRef.current.visible = wantDebug;
      }
      if (wantDebug && debugFloorRenderedRef.current !== flr) {
        debugFloorRenderedRef.current = flr;
        disposeObject3D(debugOverlayRef.current);
        debugOverlayRef.current.clear();
        const wireMat = new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          wireframe: true,
          transparent: true,
          opacity: 0.55,
        });
        for (const col of getCollidersForFloor(flr)) {
          const w = col.bounds.maxX - col.bounds.minX;
          const h = Math.min(2.2, col.bounds.maxY - col.bounds.minY);
          const d = col.bounds.maxZ - col.bounds.minZ;
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wireMat);
          m.position.set(
            (col.bounds.minX + col.bounds.maxX) / 2,
            col.bounds.minY + h / 2,
            (col.bounds.minZ + col.bounds.maxZ) / 2,
          );
          debugOverlayRef.current.add(m);
        }
      }
    }

    if (showBlockA) {
      multiFloor.ctrlA.update(dt, playerState.pos.x, playerState.libraryY, playerState.pos.z, flr);
    } else if (showBlockB) {
      multiFloor.ensureBlockB().update(dt);
    } else if (showBlockD) {
      multiFloor.ensureBlockD().update(dt, state.clock.elapsedTime);
    }
  });

  const clickObj = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onObjectClick?.(id);
  };
  const hover = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const leave = () => {
    document.body.style.cursor = 'auto';
  };

  // 4 trụ inox mạ vàng quanh tượng GS. Tạ Quang Bửu
  const stanchions: Array<[number, number]> = [
    [-1.18, -1.25],
    [1.18, -1.25],
    [-1.18, -2.95],
    [1.18, -2.95],
  ];

  return (
    <group>
      {/* Hệ thống ánh sáng ấm áp cho Đại sảnh thông tầng & các tầng đọc sách (1 đèn điểm trung tâm tối ưu shader) */}
      <pointLight position={[0, 7.5, 0]} color="#FFEBC2" intensity={1.9} distance={42} decay={1.1} />

      {/* =====================================================================
          3 PHÂN KHU KIẾN TRÚC ĐA TẦNG THƯ VIỆN TẠ QUANG BỬU (TẦNG 1–10)
          ===================================================================== */}
      <primitive object={multiFloor.groupA} />
      <primitive object={multiFloor.groupB} />
      <primitive object={multiFloor.groupD} />

      {/* =====================================================================
          CÁC ĐIỂM TƯƠNG TÁC HỌC HSK & MULTIPLAYER SEATING TẠI SẢNH TẦNG 1
          ===================================================================== */}
      <group ref={floor1AnchorsRef}>
        {/* Bức tường gỗ nhị phân 0/1 & diềm hồi văn phát sáng tích hợp trên vách Bắc Đại sảnh */}
        <group position={[0, 0, -12.38]}>
          <mesh
            position={[0, 2.05, 0.02]}
            onClick={clickObj('statue')}
            onPointerOver={hover}
            onPointerOut={leave}
          >
            <planeGeometry args={[7.4, 3.65]} />
            <meshStandardMaterial
              map={binaryWall.map}
              emissiveMap={binaryWall.emissiveMap}
              emissive={new THREE.Color(AMBER_GLOW)}
              emissiveIntensity={0.95}
              roughness={0.5}
            />
          </mesh>
        </group>

        {/* TƯỢNG BÁN THÂN ĐỒNG GS. TẠ QUANG BỬU (1910–1986) TẠI TÂM BẮC NGÔI SAO 16 CÁNH */}
        <group
          position={[LIBRARY_LOBBY.statue.x, 0, LIBRARY_LOBBY.statue.z]}
          onClick={clickObj('statue')}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          {/* Bậc đá nguyên khối đen xám dưới chân bệ */}
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.45, 0.16, 1.25]} />
            <meshStandardMaterial color="#2A2B2E" roughness={0.5} metalness={0.15} />
          </mesh>
          {/* Bệ gỗ gụ cao 1,35 m có phào chỉ trên/dưới */}
          <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.82, 1.32, 0.74]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.48, 0]} castShadow>
            <boxGeometry args={[0.92, 0.08, 0.84]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.92, 0.08, 0.84]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.5} />
          </mesh>

          {/* Biển đồng khắc tên GS. Tạ Quang Bửu ở mặt trước bệ (+Z) */}
          <LabelPlane
            textureKey="tqb-statue-plaque"
            canvasW={768}
            canvasH={320}
            draw={drawStatuePlaque}
            size={[0.68, 0.28]}
            position={[0, 0.96, 0.385]}
            transparent={false}
          />

          {/* Đế đồng dưới tượng bán thân */}
          <mesh position={[0, 1.56, 0]} castShadow>
            <boxGeometry args={[0.56, 0.08, 0.44]} />
            <meshStandardMaterial color={BRONZE_DARK} roughness={0.35} metalness={0.68} />
          </mesh>

          {/* Tượng bán thân đồng: vai + áo vest + cà vạt + cổ + đầu + vầng trán cao */}
          <group position={[0, 1.6, 0]}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <boxGeometry args={[0.74, 0.42, 0.38]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.32} metalness={0.72} />
            </mesh>
            {[-0.36, 0.36].map((sx) => (
              <mesh key={`sh-${sx}`} position={[sx, 0.26, 0]} castShadow>
                <sphereGeometry args={[0.16, 16, 14]} />
                <meshStandardMaterial color={BRONZE_DARK} roughness={0.32} metalness={0.72} />
              </mesh>
            ))}
            <mesh position={[-0.1, 0.24, 0.195]} rotation={[0, 0, 0.22]}>
              <boxGeometry args={[0.07, 0.32, 0.03]} />
              <meshStandardMaterial color="#59412A" roughness={0.3} metalness={0.74} />
            </mesh>
            <mesh position={[0.1, 0.24, 0.195]} rotation={[0, 0, -0.22]}>
              <boxGeometry args={[0.07, 0.32, 0.03]} />
              <meshStandardMaterial color="#59412A" roughness={0.3} metalness={0.74} />
            </mesh>
            <mesh position={[0, 0.22, 0.198]}>
              <boxGeometry args={[0.055, 0.28, 0.025]} />
              <meshStandardMaterial color="#684D33" roughness={0.28} metalness={0.76} />
            </mesh>
            <mesh position={[0, 0.49, 0.01]} castShadow>
              <cylinderGeometry args={[0.105, 0.12, 0.16, 18]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.32} metalness={0.72} />
            </mesh>
            <mesh position={[0, 0.69, 0.02]} scale={[0.92, 1.12, 0.98]} castShadow>
              <sphereGeometry args={[0.19, 24, 20]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.3} metalness={0.74} />
            </mesh>
            <mesh position={[0, 0.78, -0.01]} scale={[0.95, 0.85, 1.0]}>
              <sphereGeometry args={[0.185, 20, 16]} />
              <meshStandardMaterial color="#3B2A1B" roughness={0.38} metalness={0.68} />
            </mesh>
            <mesh position={[0, 0.73, 0.195]}>
              <boxGeometry args={[0.16, 0.028, 0.04]} />
              <meshStandardMaterial color="#59412A" roughness={0.3} metalness={0.75} />
            </mesh>
            <mesh position={[0, 0.67, 0.21]} rotation={[0.18, 0, 0]}>
              <boxGeometry args={[0.038, 0.095, 0.05]} />
              <meshStandardMaterial color="#59412A" roughness={0.3} metalness={0.75} />
            </mesh>
            {[-0.175, 0.175].map((ex) => (
              <mesh key={`ear-${ex}`} position={[ex, 0.68, 0.01]}>
                <boxGeometry args={[0.03, 0.08, 0.05]} />
                <meshStandardMaterial color={BRONZE_DARK} roughness={0.32} metalness={0.72} />
              </mesh>
            ))}
          </group>
        </group>

        {/* 4 TRỤ INOX MẠ VÀNG + DÂY NHUNG ĐỎ BAO QUANH TƯỢNG */}
        {stanchions.map(([sx, sz], idx) => (
          <group key={`stanchion-${idx}`} position={[sx, 0, sz]}>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.16, 0.18, 0.06, 20]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.25} metalness={0.85} />
            </mesh>
            <mesh position={[0, 0.48, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.028, 0.9, 14]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.22} metalness={0.88} />
            </mesh>
            <mesh position={[0, 0.96, 0]}>
              <sphereGeometry args={[0.055, 14, 12]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.82, -1.25]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 2.32, 12]} />
          <meshStandardMaterial color={VELVET_RED} roughness={0.75} />
        </mesh>
        <mesh position={[-1.18, 0.82, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 1.66, 12]} />
          <meshStandardMaterial color={VELVET_RED} roughness={0.75} />
        </mesh>
        <mesh position={[1.18, 0.82, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 1.66, 12]} />
          <meshStandardMaterial color={VELVET_RED} roughness={0.75} />
        </mesh>

        {/* QUẦY THÔNG TIN & MƯỢN SÁCH (Bên trái sảnh, x = -3.6, z = -0.6) */}
        <group
          position={[LIBRARY_LOBBY.infoDesk.x, 0, LIBRARY_LOBBY.infoDesk.z]}
          onClick={clickObj('info-desk')}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 1.04, 1.3]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.07, 0]} castShadow>
            <boxGeometry args={[1.72, 0.06, 1.42]} />
            <meshStandardMaterial color="#E8DFCE" roughness={0.4} />
          </mesh>
          <LabelPlane
            textureKey="lobby-info-desk-sign"
            canvasW={512}
            canvasH={128}
            draw={drawInfoDeskSign}
            size={[1.45, 0.36]}
            position={[0.81, 0.62, 0]}
            rotation={[0, Math.PI / 2, 0]}
            transparent={false}
          />
          {['#A54432', '#1F5C8A', '#2E7D32'].map((col, idx) => (
            <mesh key={`book-${idx}`} position={[0.2, 1.12 + idx * 0.045, -0.3]}>
              <boxGeometry args={[0.28, 0.04, 0.2]} />
              <meshStandardMaterial color={col} roughness={0.75} />
            </mesh>
          ))}
        </group>

        {/* BẢNG TỪ VỰNG HÁN NGỮ THƯ VIỆN TẠ QUANG BỬU (Bên phải sảnh, x = 3.6, z = -0.6) */}
        <group
          position={[LIBRARY_LOBBY.vocabBoard.x, 0, LIBRARY_LOBBY.vocabBoard.z]}
          rotation={[0, -Math.PI / 5, 0]}
          onClick={clickObj('vocab-board')}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          <mesh position={[-0.65, 0.95, 0]} castShadow>
            <boxGeometry args={[0.08, 1.9, 0.08]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
          </mesh>
          <mesh position={[0.65, 0.95, 0]} castShadow>
            <boxGeometry args={[0.08, 1.9, 0.08]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <boxGeometry args={[1.6, 1.1, 0.08]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
          </mesh>
          <LabelPlane
            textureKey="lobby-vocab-board"
            canvasW={1024}
            canvasH={640}
            draw={drawLibraryVocabBoard}
            size={[1.48, 0.96]}
            position={[0, 1.45, 0.055]}
            transparent={false}
          />
        </group>

        {/* KHU VỰC BÀN GHẾ NGỒI HỌC TƯƠNG TÁC MULTIPLAYER (PR8/PR9) */}
        <LibraryStudyArea
          activeSeatId={activeSeatId}
          nearestSeatId={nearestSeatId}
          onSelectSeat={(seatId) => onObjectClick?.(`seat:${seatId}`)}
        />
      </group>

      {/* Vùng tương tác click chuột vào Đại dương cầm Grand Piano trên Tầng 6 */}
      <group ref={floor6InteractiveRef} visible={false}>
        <mesh
          position={[-6.6, 1.25, 3.6]}
          onClick={(e) => {
            e.stopPropagation();
            // Phát hợp âm Đô trưởng (C4-E4-G4-C5) và mở thanh đàn Piano
            [60, 64, 67, 72].forEach((m, idx) =>
              setTimeout(() => multiFloor.ensureBlockB().playPianoNote(m, 0.8), idx * 90),
            );
            onObjectClick?.('piano-6f');
          }}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          <boxGeometry args={[2.1, 1.5, 2.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Vùng tương tác click chuột vào Kính thiên văn ngắm sao trên Sân thượng Tầng 10 */}
      <group ref={floor10InteractiveRef} visible={false}>
        <mesh
          position={[15.4, 1.2, 0.6]}
          onClick={clickObj('telescope-10f')}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          <boxGeometry args={[1.6, 1.8, 1.6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Lớp hiển thị lưới va chạm phát triển (tắt mặc định trong production) */}
      <group ref={debugOverlayRef} visible={false} name="library-collision-debug" />
    </group>
  );
}
