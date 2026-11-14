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
  makeLibraryWoodGrainTex,
  makeMonitorScreenTex,
  type Floor10RooftopController,
  type Floors6To7Controller,
} from '../../features/campus/buildings/library';
import {
  LIBRARY_LOBBY,
  getCollidersForFloor,
  libraryNavigationController,
  type LibraryFloor,
} from '../../lib/campus';
import { playerState, type TimeOfDay } from '../../lib/playerState';
import { multiplayer } from '../../lib/multiplayer';
import { makeGraniteStoneTexture, makeLightShaftTexture, makeSoftShadowTexture } from './materials';
import { CANVAS_VN_FONT, LabelPlane } from './TextPlate';

export interface LibraryLobbyProps {
  activeSeatId?: string | null;
  nearestSeatId?: string | null;
  timeOfDay?: TimeOfDay;
  onObjectClick?: (id: string) => void;
}

const WOOD_DARK = '#3B2214';
const WOOD_MID = '#54321E';
const BRONZE_DARK = '#7A593C';
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
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#D9B13B');
  grad.addColorStop(0.5, '#BA8D1C');
  grad.addColorStop(1, '#DFBC50');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#FFF2B2';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.strokeStyle = '#5A410A';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  for (const [rx, ry] of [
    [28, 28],
    [w - 28, 28],
    [28, h - 28],
    [w - 28, h - 28],
  ]) {
    ctx.fillStyle = '#5A410A';
    ctx.beginPath();
    ctx.arc(rx, ry, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#241705';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 44px ${CANVAS_VN_FONT}`;
  ctx.fillText('GIÁO SƯ TẠ QUANG BỬU'.normalize('NFC'), w / 2, h * 0.28);
  ctx.font = `700 34px ${CANVAS_VN_FONT}`;
  ctx.fillText('(1910 – 1986)', w / 2, h * 0.56);
  ctx.font = `700 23px ${CANVAS_VN_FONT}`;
  ctx.fillText('HIỆU TRƯỞNG ĐẦU TIÊN TRƯỜNG ĐẠI HỌC BÁCH KHOA HÀ NỘI'.normalize('NFC'), w / 2, h * 0.82);
}

// --- Bảng từ vựng Hán ngữ chuyên đề Thư viện & Khoa học ----------------------
function drawLibraryVocabBoard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#18271E');
  bg.addColorStop(0.5, '#22362B');
  bg.addColorStop(1, '#192920');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#C9A227';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.strokeStyle = 'rgba(255, 224, 130, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFD166';
  ctx.font = `700 50px ${CANVAS_VN_FONT}`;
  ctx.fillText('谢光宝图书馆 · 常用词汇'.normalize('NFC'), w / 2, h * 0.14);

  ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.14, h * 0.23);
  ctx.lineTo(w * 0.86, h * 0.23);
  ctx.stroke();

  ctx.fillStyle = '#F5F5F0';
  ctx.font = `700 38px ${CANVAS_VN_FONT}`;
  ctx.fillText('图书馆  túshūguǎn — Thư viện'.normalize('NFC'), w / 2, h * 0.35);
  ctx.fillText('科学  kēxué — Khoa học · 技术  jìshù — Kỹ thuật'.normalize('NFC'), w / 2, h * 0.53);
  ctx.fillText('借书  jièshū — Mượn sách · 阅读  yuèdú — Đọc sách'.normalize('NFC'), w / 2, h * 0.71);

  ctx.fillStyle = '#A8E6CF';
  ctx.font = `700 28px ${CANVAS_VN_FONT}`;
  ctx.fillText('Bấm vào bảng hoặc tượng GS. Tạ Quang Bửu (phím E) để nghe phát âm'.normalize('NFC'), w / 2, h * 0.88);
}

// --- Biển tên Quầy thông tin Thư viện ----------------------------------------
function drawInfoDeskSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#341C10');
  grad.addColorStop(0.5, '#4A2918');
  grad.addColorStop(1, '#341C10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.strokeStyle = 'rgba(255, 224, 138, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, w - 32, h - 32);
  ctx.fillStyle = '#FFE08A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 42px ${CANVAS_VN_FONT}`;
  ctx.fillText('咨询与借书处 · QUẦY THÔNG TIN'.normalize('NFC'), w / 2, h * 0.5);
}

export default function LibraryLobby({
  activeSeatId = null,
  nearestSeatId = null,
  timeOfDay = 'day',
  onObjectClick,
}: LibraryLobbyProps) {
  const binaryWall = useMemo(() => makeBinaryWallTextures(), []);
  const granitePbr = useMemo(() => makeGraniteStoneTexture(2, 2), []);
  const atriumBeamGeo = useMemo(() => new THREE.PlaneGeometry(11.5, 16.5), []);
  const atriumBeamTex = useMemo(() => makeLightShaftTexture(), []);
  const lobbyAssets = useMemo(() => {
    const mahoganyTex = makeLibraryWoodGrainTex('#6B3E26', '#4E2A17', 2, 2);
    const deskMonitorTex = makeMonitorScreenTex('admin');
    const ropeGeos = [
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-1.14, 0.85, -1.25),
          new THREE.Vector3(0, 0.70, -1.25),
          new THREE.Vector3(1.14, 0.85, -1.25),
        ),
        18,
        0.024,
        10,
        false,
      ),
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-1.18, 0.85, -1.29),
          new THREE.Vector3(-1.18, 0.71, -2.1),
          new THREE.Vector3(-1.18, 0.85, -2.91),
        ),
        18,
        0.024,
        10,
        false,
      ),
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(1.18, 0.85, -1.29),
          new THREE.Vector3(1.18, 0.71, -2.1),
          new THREE.Vector3(1.18, 0.85, -2.91),
        ),
        18,
        0.024,
        10,
        false,
      ),
    ];
    const aoShadowTex = makeSoftShadowTexture();
    return { mahoganyTex, deskMonitorTex, ropeGeos, aoShadowTex };
  }, []);

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
  const atriumBeamRef = useRef<THREE.Group>(null);
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
      const detail = (
        ev as CustomEvent<{ midi?: number; velocity?: number; remoteId?: string }>
      ).detail;
      if (detail && typeof detail.midi === 'number') {
        const vel = detail.velocity ?? 0.82;
        if (!detail.remoteId) {
          multiplayer.sendPianoNote(detail.midi, vel);
          if (playerState.libraryFloor === 6 && playerState.seatId !== 'tqb-6f-piano-bench') {
            window.dispatchEvent(new CustomEvent('bkhn:sit-piano-bench'));
          }
        } else if (playerState.libraryFloor !== 6 && playerState.libraryFloor !== 7) {
          return;
        }
        multiFloor.ensureBlockB().playPianoNote(detail.midi, vel);
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
      granitePbr.map.dispose();
      granitePbr.bumpMap.dispose();
      atriumBeamGeo.dispose();
      atriumBeamTex.dispose();
      lobbyAssets.mahoganyTex.map.dispose();
      lobbyAssets.deskMonitorTex.map.dispose();
      lobbyAssets.aoShadowTex.dispose();
      lobbyAssets.ropeGeos.forEach((g) => g.dispose());
      multiFloor.disposeBlockB();
      disposeObject3D(multiFloor.groupA);
      disposeObject3D(multiFloor.groupB);
      disposeObject3D(multiFloor.groupD);
      if (debugOverlayRef.current) {
        disposeObject3D(debugOverlayRef.current);
      }
    };
  }, [binaryWall, granitePbr, atriumBeamGeo, atriumBeamTex, lobbyAssets, multiFloor]);

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
    // Giữ hiển thị bàn đọc, ghế ngồi và tượng GS. Tạ Quang Bửu ở Tầng 1 xuyên suốt giếng trời thông tầng Block A (T1–T5)
    if (floor1AnchorsRef.current && floor1AnchorsRef.current.visible !== showBlockA) {
      floor1AnchorsRef.current.visible = showBlockA;
    }
    if (floor6InteractiveRef.current && floor6InteractiveRef.current.visible !== (flr === 6)) {
      floor6InteractiveRef.current.visible = flr === 6;
    }
    if (floor10InteractiveRef.current && floor10InteractiveRef.current.visible !== showBlockD) {
      floor10InteractiveRef.current.visible = showBlockD;
    }
    if (atriumBeamRef.current && atriumBeamRef.current.visible !== showBlockA) {
      atriumBeamRef.current.visible = showBlockA;
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
      multiFloor.ensureBlockD().update(dt, state.clock.elapsedTime, playerState.timeOfDay);
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

  const ambientColor =
    timeOfDay === 'night' ? '#FFE4B5' : timeOfDay === 'sunset' ? '#FFD8A8' : '#FFF6E5';
  const ambientIntensity = timeOfDay === 'night' ? 0.56 : timeOfDay === 'sunset' ? 0.48 : 0.44;
  const binaryEmissiveIntensity =
    timeOfDay === 'night' ? 1.5 : timeOfDay === 'sunset' ? 1.22 : 0.95;
  const beamColor =
    timeOfDay === 'night' ? '#FFD580' : timeOfDay === 'sunset' ? '#FFB36B' : '#FFF8E7';
  const beamOpacity = timeOfDay === 'night' ? 0.045 : timeOfDay === 'sunset' ? 0.085 : 0.055;
  const beamRotZ = timeOfDay === 'day' ? 0.14 : timeOfDay === 'sunset' ? -0.18 : 0;

  return (
    <group>
      {/* Hệ thống ánh sáng ấm áp đồng bộ Ngày/Hoàng hôn/Đêm cho Đại sảnh & các tầng đọc (giữ nguyên NUM_POINT_LIGHTS=0 để không biên dịch lại shader GLSL) */}
      <ambientLight color={ambientColor} intensity={ambientIntensity} />

      {/* =====================================================================
          3 PHÂN KHU KIẾN TRÚC ĐA TẦNG THƯ VIỆN TẠ QUANG BỬU (TẦNG 1–10)
          ===================================================================== */}
      <primitive object={multiFloor.groupA} />
      <primitive object={multiFloor.groupB} />
      <primitive object={multiFloor.groupD} />

      {/* Luồng ánh sáng giếng trời thông tầng mềm mại (chỉ bật ban ngày & hoàng hôn) */}
      <group
        ref={atriumBeamRef}
        position={[0, 12.8, -1.5]}
        rotation={[0, 0, beamRotZ]}
        visible={timeOfDay !== 'night'}
      >
        {timeOfDay !== 'night' &&
          [0, Math.PI / 2].map((rotY, idx) => (
            <mesh
              key={`atrium-beam-${idx}`}
              geometry={atriumBeamGeo}
              rotation={[0, rotY, 0]}
              raycast={() => null}
            >
              <meshBasicMaterial
                map={atriumBeamTex}
                color={beamColor}
                transparent
                opacity={beamOpacity * 1.4}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
      </group>

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
              emissive={AMBER_GLOW}
              emissiveIntensity={binaryEmissiveIntensity}
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
          {/* Bóng tiếp xúc AO mềm dưới bệ tượng */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} raycast={() => null}>
            <planeGeometry args={[2.35, 2.05]} />
            <meshBasicMaterial
              map={lobbyAssets.aoShadowTex}
              color="#0A0E17"
              transparent
              opacity={0.55}
              depthWrite={false}
            />
          </mesh>
          {/* Bậc đá nguyên khối đen xám dưới chân bệ (2 cấp vát) */}
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.45, 0.16, 1.25]} />
            <meshStandardMaterial
              color="#2A2B2E"
              map={granitePbr.map}
              roughness={0.42}
              metalness={0.18}
            />
          </mesh>
          <mesh position={[0, 0.165, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.22, 0.07, 1.04]} />
            <meshStandardMaterial
              color="#35373C"
              map={granitePbr.map}
              roughness={0.38}
              metalness={0.2}
            />
          </mesh>
          {/* Bệ gỗ gụ cao 1,35 m có phào chỉ trên/dưới, soi huỳnh & nẹp đồng */}
          <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.82, 1.32, 0.74]} />
            <meshStandardMaterial color="#8A573B" map={lobbyAssets.mahoganyTex.map} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.64, 0.44, 0.77]} />
            <meshStandardMaterial color="#4A2A18" roughness={0.56} />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow>
            <boxGeometry args={[0.85, 0.96, 0.54]} />
            <meshStandardMaterial color="#4A2A18" roughness={0.56} />
          </mesh>
          {([-0.405, 0.405] as const).map((cx) =>
            ([-0.365, 0.365] as const).map((cz) => (
              <mesh key={`ped-brass-${cx}-${cz}`} position={[cx, 0.82, cz]}>
                <boxGeometry args={[0.025, 1.26, 0.025]} />
                <meshStandardMaterial color={GOLD_BRASS} roughness={0.34} metalness={0.54} />
              </mesh>
            )),
          )}
          <mesh position={[0, 1.48, 0]} castShadow>
            <boxGeometry args={[0.92, 0.08, 0.84]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.48} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.92, 0.08, 0.84]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.48} />
          </mesh>

          {/* Khung viền đồng & biển đồng khắc tên GS. Tạ Quang Bửu ở mặt trước bệ (+Z) */}
          <mesh position={[0, 1.11, 0.382]}>
            <boxGeometry args={[0.72, 0.022, 0.022]} />
            <meshStandardMaterial color={GOLD_BRASS} roughness={0.34} metalness={0.54} />
          </mesh>
          <mesh position={[0, 0.81, 0.382]}>
            <boxGeometry args={[0.72, 0.022, 0.022]} />
            <meshStandardMaterial color={GOLD_BRASS} roughness={0.34} metalness={0.54} />
          </mesh>
          {([-0.35, 0.35] as const).map((px) => (
            <mesh key={`plq-side-${px}`} position={[px, 0.96, 0.382]}>
              <boxGeometry args={[0.022, 0.32, 0.022]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.34} metalness={0.54} />
            </mesh>
          ))}
          <LabelPlane
            textureKey="tqb-statue-plaque"
            canvasW={768}
            canvasH={320}
            draw={drawStatuePlaque}
            size={[0.68, 0.28]}
            position={[0, 0.96, 0.395]}
            transparent={false}
          />

          {/* Đế đồng dưới tượng bán thân */}
          <mesh position={[0, 1.56, 0]} castShadow>
            <boxGeometry args={[0.56, 0.08, 0.44]} />
            <meshStandardMaterial color={BRONZE_DARK} roughness={0.38} metalness={0.44} />
          </mesh>

          {/* Tượng bán thân đồng: vai + cổ áo vest + cà vạt + cằm/mắt kính + vầng trán cao */}
          <group position={[0, 1.6, 0]}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <boxGeometry args={[0.74, 0.42, 0.38]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.36} metalness={0.46} />
            </mesh>
            <mesh position={[0, 0.415, 0]} scale={[1.15, 0.45, 0.68]} castShadow>
              <cylinderGeometry args={[0.26, 0.34, 0.24, 18]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.36} metalness={0.46} />
            </mesh>
            {[-0.36, 0.36].map((sx) => (
              <mesh key={`sh-${sx}`} position={[sx, 0.26, 0]} castShadow>
                <sphereGeometry args={[0.16, 16, 14]} />
                <meshStandardMaterial color={BRONZE_DARK} roughness={0.36} metalness={0.46} />
              </mesh>
            ))}
            <mesh position={[-0.1, 0.24, 0.195]} rotation={[0, 0, 0.22]}>
              <boxGeometry args={[0.07, 0.32, 0.03]} />
              <meshStandardMaterial color="#694D33" roughness={0.34} metalness={0.46} />
            </mesh>
            <mesh position={[0.1, 0.24, 0.195]} rotation={[0, 0, -0.22]}>
              <boxGeometry args={[0.07, 0.32, 0.03]} />
              <meshStandardMaterial color="#694D33" roughness={0.34} metalness={0.46} />
            </mesh>
            <mesh position={[0, 0.22, 0.198]}>
              <boxGeometry args={[0.055, 0.28, 0.025]} />
              <meshStandardMaterial color="#7A5B3E" roughness={0.34} metalness={0.46} />
            </mesh>
            <mesh position={[0, 0.49, 0.01]} castShadow>
              <cylinderGeometry args={[0.105, 0.12, 0.16, 18]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.36} metalness={0.46} />
            </mesh>
            <mesh position={[0, 0.69, 0.02]} scale={[0.92, 1.12, 0.98]} castShadow>
              <sphereGeometry args={[0.19, 24, 20]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.35} metalness={0.48} />
            </mesh>
            {/* Khối hàm/cằm & gò má giúp diện mạo bán thân rõ khối hơn */}
            <mesh position={[0, 0.59, 0.085]} scale={[0.95, 0.85, 0.9]} castShadow>
              <sphereGeometry args={[0.1, 14, 12]} />
              <meshStandardMaterial color={BRONZE_DARK} roughness={0.35} metalness={0.48} />
            </mesh>
            <mesh position={[0, 0.78, -0.01]} scale={[0.95, 0.85, 1.0]}>
              <sphereGeometry args={[0.185, 20, 16]} />
              <meshStandardMaterial color="#4A3522" roughness={0.4} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.73, 0.195]}>
              <boxGeometry args={[0.16, 0.028, 0.04]} />
              <meshStandardMaterial color="#694D33" roughness={0.34} metalness={0.46} />
            </mesh>
            {/* Kính tròn đặc trưng của GS. Tạ Quang Bửu */}
            {([-0.056, 0.056] as const).map((gx) => (
              <mesh key={`lens-${gx}`} position={[gx, 0.708, 0.205]}>
                <torusGeometry args={[0.032, 0.0055, 8, 16]} />
                <meshStandardMaterial color={GOLD_BRASS} roughness={0.3} metalness={0.55} />
              </mesh>
            ))}
            <mesh position={[0, 0.71, 0.206]}>
              <boxGeometry args={[0.046, 0.008, 0.012]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.3} metalness={0.55} />
            </mesh>
            <mesh position={[0, 0.67, 0.21]} rotation={[0.18, 0, 0]}>
              <boxGeometry args={[0.038, 0.095, 0.05]} />
              <meshStandardMaterial color="#694D33" roughness={0.34} metalness={0.46} />
            </mesh>
            {[-0.175, 0.175].map((ex) => (
              <mesh key={`ear-${ex}`} position={[ex, 0.68, 0.01]}>
                <boxGeometry args={[0.03, 0.08, 0.05]} />
                <meshStandardMaterial color={BRONZE_DARK} roughness={0.36} metalness={0.46} />
              </mesh>
            ))}
          </group>
        </group>

        {/* 4 TRỤ INOX MẠ VÀNG + DÂY NHUNG ĐỎ VÕNG CATENARY BAO QUANH TƯỢNG */}
        {stanchions.map(([sx, sz], idx) => (
          <group key={`stanchion-${idx}`} position={[sx, 0, sz]}>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.16, 0.18, 0.06, 20]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.3} metalness={0.55} />
            </mesh>
            <mesh position={[0, 0.48, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.028, 0.9, 14]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.28} metalness={0.56} />
            </mesh>
            <mesh position={[0, 0.85, 0]}>
              <cylinderGeometry args={[0.042, 0.042, 0.055, 14]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.28} metalness={0.56} />
            </mesh>
            <mesh position={[0, 0.96, 0]}>
              <sphereGeometry args={[0.055, 14, 12]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.26} metalness={0.56} />
            </mesh>
          </group>
        ))}
        {lobbyAssets.ropeGeos.map((ropeGeo, idx) => (
          <mesh key={`velvet-rope-${idx}`} geometry={ropeGeo} castShadow>
            <meshStandardMaterial color={VELVET_RED} roughness={0.72} />
          </mesh>
        ))}
        {[
          [-1.13, 0.85, -1.25],
          [1.13, 0.85, -1.25],
          [-1.18, 0.85, -1.3],
          [-1.18, 0.85, -2.9],
          [1.18, 0.85, -1.3],
          [1.18, 0.85, -2.9],
        ].map(([fx, fy, fz], idx) => (
          <mesh key={`rope-ferrule-${idx}`} position={[fx, fy, fz]}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshStandardMaterial color={GOLD_BRASS} roughness={0.28} metalness={0.55} />
          </mesh>
        ))}

        {/* QUẦY THÔNG TIN & MƯỢN SÁCH (Bên trái sảnh, x = -3.6, z = -0.6) */}
        <group
          position={[LIBRARY_LOBBY.infoDesk.x, 0, LIBRARY_LOBBY.infoDesk.z]}
          onClick={clickObj('info-desk')}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} raycast={() => null}>
            <planeGeometry args={[2.35, 2.05]} />
            <meshBasicMaterial
              map={lobbyAssets.aoShadowTex}
              color="#0A0E17"
              transparent
              opacity={0.52}
              depthWrite={false}
            />
          </mesh>
          {/* Chân đế âm & thân gỗ gụ soi nan dọc */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[1.54, 0.1, 1.24]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.68} />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 1.04, 1.3]} />
            <meshStandardMaterial color="#8A573B" map={lobbyAssets.mahoganyTex.map} roughness={0.54} />
          </mesh>
          {([-0.54, -0.27, 0, 0.27, 0.54] as const).map((fx) =>
            ([-0.66, 0.66] as const).map((fz) => (
              <mesh key={`desk-flute-${fx}-${fz}`} position={[fx, 0.52, fz]}>
                <boxGeometry args={[0.05, 0.84, 0.025]} />
                <meshStandardMaterial color={WOOD_DARK} roughness={0.62} />
              </mesh>
            )),
          )}
          {([-0.58, 0.58] as const).map((fz) => (
            <mesh key={`desk-pilaster-${fz}`} position={[0.808, 0.52, fz]}>
              <boxGeometry args={[0.028, 0.9, 0.09]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.55} />
            </mesh>
          ))}
          <mesh position={[0, 1.045, 0]}>
            <boxGeometry args={[1.76, 0.024, 1.46]} />
            <meshStandardMaterial color={GOLD_BRASS} roughness={0.36} metalness={0.52} />
          </mesh>
          <mesh position={[0, 1.07, 0]} castShadow>
            <boxGeometry args={[1.72, 0.06, 1.42]} />
            <meshStandardMaterial color="#E8DFCE" roughness={0.38} />
          </mesh>
          <LabelPlane
            textureKey="lobby-info-desk-sign"
            canvasW={512}
            canvasH={128}
            draw={drawInfoDeskSign}
            size={[1.45, 0.36]}
            position={[0.825, 0.62, 0]}
            rotation={[0, Math.PI / 2, 0]}
            transparent={false}
          />
          {['#A54432', '#1F5C8A', '#2E7D32'].map((col, idx) => (
            <mesh key={`book-${idx}`} position={[0.2, 1.12 + idx * 0.045, -0.35]}>
              <boxGeometry args={[0.28, 0.04, 0.2]} />
              <meshStandardMaterial color={col} roughness={0.75} />
            </mesh>
          ))}
          {/* Màn hình tra cứu thủ thư đặt trên chân đế vững chãi & bàn phím */}
          <group position={[-0.24, 1.1, 0.28]} rotation={[0, -Math.PI * 0.28, 0]}>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.2, 0.02, 0.16]} />
              <meshStandardMaterial color="#252C38" roughness={0.4} metalness={0.65} />
            </mesh>
            <mesh position={[0, 0.09, -0.02]}>
              <boxGeometry args={[0.04, 0.15, 0.04]} />
              <meshStandardMaterial color="#252C38" roughness={0.4} metalness={0.65} />
            </mesh>
            <mesh position={[0, 0.25, 0]} castShadow>
              <boxGeometry args={[0.42, 0.27, 0.032]} />
              <meshStandardMaterial color="#1E2530" roughness={0.45} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.25, -0.02]}>
              <planeGeometry args={[0.38, 0.23]} />
              <meshStandardMaterial
                map={lobbyAssets.deskMonitorTex.map}
                emissiveMap={lobbyAssets.deskMonitorTex.map}
                emissive="#FFFFFF"
                emissiveIntensity={0.35}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0, 0.01, -0.22]}>
              <boxGeometry args={[0.34, 0.016, 0.12]} />
              <meshStandardMaterial color="#262D3A" roughness={0.55} />
            </mesh>
          </group>
          {/* Sổ nhật ký mượn sách mở trên quầy & đèn bàn đồng ấm */}
          <group position={[0.26, 1.106, 0.28]} rotation={[0, 0.2, 0]}>
            <mesh position={[-0.1, 0.01, 0]} rotation={[0, 0, -0.06]}>
              <boxGeometry args={[0.19, 0.016, 0.26]} />
              <meshStandardMaterial color="#FAF7F0" roughness={0.7} />
            </mesh>
            <mesh position={[0.1, 0.01, 0]} rotation={[0, 0, 0.06]}>
              <boxGeometry args={[0.19, 0.016, 0.26]} />
              <meshStandardMaterial color="#FAF7F0" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.006, 0]}>
              <boxGeometry args={[0.04, 0.014, 0.27]} />
              <meshStandardMaterial color="#8B1E24" roughness={0.65} />
            </mesh>
          </group>
          <group position={[-0.38, 1.1, -0.38]}>
            <mesh position={[0, 0.015, 0]}>
              <cylinderGeometry args={[0.09, 0.1, 0.03, 14]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.32} metalness={0.54} />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.014, 0.016, 0.32, 10]} />
              <meshStandardMaterial color={GOLD_BRASS} roughness={0.32} metalness={0.54} />
            </mesh>
            <mesh position={[0.06, 0.34, 0]} rotation={[0, 0, -0.35]}>
              <cylinderGeometry args={[0.045, 0.12, 0.13, 16]} />
              <meshStandardMaterial
                color="#FFE5A3"
                emissive="#FFCB66"
                emissiveIntensity={0.55}
                roughness={0.35}
              />
            </mesh>
          </group>
        </group>

        {/* BẢNG TỪ VỰNG HÁN NGỮ THƯ VIỆN TẠ QUANG BỬU (Bên phải sảnh, x = 3.6, z = -0.6) */}
        <group
          position={[LIBRARY_LOBBY.vocabBoard.x, 0, LIBRARY_LOBBY.vocabBoard.z]}
          rotation={[0, -Math.PI / 5, 0]}
          onClick={clickObj('vocab-board')}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} raycast={() => null}>
            <planeGeometry args={[2.1, 0.95]} />
            <meshBasicMaterial
              map={lobbyAssets.aoShadowTex}
              color="#0A0E17"
              transparent
              opacity={0.46}
              depthWrite={false}
            />
          </mesh>
          {/* Chân chữ T có mặt bích & thanh giằng ngang */}
          {([-0.65, 0.65] as const).map((lx) => (
            <group key={`board-leg-${lx}`} position={[lx, 0, 0]}>
              <mesh position={[0, 0.03, 0]} castShadow>
                <boxGeometry args={[0.12, 0.06, 0.46]} />
                <meshStandardMaterial color="#252C38" roughness={0.45} metalness={0.55} />
              </mesh>
              <mesh position={[0, 0.95, 0]} castShadow>
                <boxGeometry args={[0.08, 1.9, 0.08]} />
                <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[1.38, 0.05, 0.06]} />
            <meshStandardMaterial color="#252C38" roughness={0.45} metalness={0.55} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <boxGeometry args={[1.6, 1.1, 0.08]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
          </mesh>
          {/* Khay đựng bút lông & 3 cây bút màu dưới mép bảng */}
          <mesh position={[0, 0.89, 0.075]} castShadow>
            <boxGeometry args={[1.48, 0.045, 0.11]} />
            <meshStandardMaterial color={WOOD_MID} roughness={0.55} />
          </mesh>
          {(['#DC2626', '#2563EB', '#16A34A'] as const).map((col, idx) => (
            <mesh key={`marker-${idx}`} position={[-0.35 + idx * 0.22, 0.922, 0.08]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.011, 0.011, 0.13, 8]} />
              <meshStandardMaterial color={col} roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0.42, 0.925, 0.08]}>
            <boxGeometry args={[0.12, 0.032, 0.055]} />
            <meshStandardMaterial color="#262D3A" roughness={0.8} />
          </mesh>
          <LabelPlane
            textureKey="lobby-vocab-board"
            canvasW={1024}
            canvasH={640}
            draw={drawLibraryVocabBoard}
            size={[1.48, 0.96]}
            position={[0, 1.45, 0.058]}
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
            onObjectClick?.('piano-6f');
            // Phát hợp âm Đô trưởng (C4-E4-G4-C5) và đồng bộ sang người chơi khác
            [60, 64, 67, 72].forEach((m, idx) =>
              setTimeout(
                () =>
                  window.dispatchEvent(
                    new CustomEvent('bkhn:piano-note', { detail: { midi: m, velocity: 0.82 } }),
                  ),
                idx * 90,
              ),
            );
          }}
          onPointerOver={hover}
          onPointerOut={leave}
        >
          <boxGeometry args={[2.1, 1.5, 2.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Vùng tương tác click chuột vào Kính thiên văn ngắm sao & Giường nệm trên Sân thượng Tầng 10 */}
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
        {([-17.2, -14.2, -11.2] as const).map((bx, idx) => (
          <mesh
            key={`f10-bed-hit-${idx + 1}`}
            position={[bx, 0.35, -4.8]}
            onClick={clickObj(`seat:tqb-10f-bed-${idx + 1}`)}
            onPointerOver={hover}
            onPointerOut={leave}
          >
            <boxGeometry args={[1.55, 0.7, 2.15]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
        {([-17.2, -14.2, -11.2] as const).map((lx, idx) => (
          <mesh
            key={`f10-lounger-hit-${idx + 1}`}
            position={[lx, 0.35, 3.4]}
            onClick={clickObj(`seat:tqb-10f-lounger-${idx + 1}`)}
            onPointerOver={hover}
            onPointerOut={leave}
          >
            <boxGeometry args={[0.95, 0.65, 2.0]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Lớp hiển thị lưới va chạm phát triển (tắt mặc định trong production) */}
      <group ref={debugOverlayRef} visible={false} name="library-collision-debug" />
    </group>
  );
}
