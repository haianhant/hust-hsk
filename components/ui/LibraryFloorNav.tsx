// ---------------------------------------------------------------------------
// LibraryFloorNav.tsx — Bảng điều khiển Thang máy & Chuyển tầng nhanh (Tầng 1–10)
// kết hợp Đàn Đại dương cầm Grand Piano (Tầng 6) & Kính thiên văn ngắm sao (Tầng 10)
// theo chuẩn mô hình Thư viện Tạ Quang Bửu tại studywithhuster.cyou.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { playerState } from '../../lib/playerState';

export type LibraryFloorNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10;

export interface LibraryPresetDestination {
  id: string;
  shortLabel: string;
  fullLabel: string;
  floor: LibraryFloorNumber;
  x: number;
  z: number;
  yaw: number;
  pitch?: number;
}

export const LIBRARY_PRESET_DESTINATIONS: LibraryPresetDestination[] = [
  {
    id: 'f1-atrium',
    shortLabel: 'T1 · Đại sảnh',
    fullLabel: 'Tầng 1 · Đại sảnh Ngôi sao 16 cánh',
    floor: 1,
    x: 0,
    z: 2.4,
    yaw: 0,
    pitch: 0.2,
  },
  {
    id: 'f1-borrow',
    shortLabel: 'T1 · Phòng mượn',
    fullLabel: 'Tầng 1 · Phòng Mượn Sách',
    floor: 1,
    x: -22.2,
    z: 1.8,
    yaw: Math.PI / 2,
    pitch: 0.18,
  },
  {
    id: 'f2-balcony',
    shortLabel: 'T2 · Tự học',
    fullLabel: 'Tầng 2 · Hành lang thông tầng',
    floor: 2,
    x: 15.6,
    z: 0,
    yaw: Math.PI / 2,
    pitch: 0.22,
  },
  {
    id: 'f3-balcony',
    shortLabel: 'T3 · Hành lang',
    fullLabel: 'Tầng 3 · Hành lang đọc sách',
    floor: 3,
    x: -15.6,
    z: 0,
    yaw: -Math.PI / 2,
    pitch: 0.22,
  },
  {
    id: 'f4-r401',
    shortLabel: 'P.401 · Đọc tự do',
    fullLabel: 'Tầng 4 · Phòng đọc 401 (144 chỗ + 17 PC)',
    floor: 4,
    x: -10.8,
    z: -18.5,
    yaw: 0,
    pitch: 0.2,
  },
  {
    id: 'f4-r411',
    shortLabel: 'P.411 · Chuyên ngành',
    fullLabel: 'Tầng 4 · Phòng đọc chuyên ngành 411',
    floor: 4,
    x: 0,
    z: 16.2,
    yaw: Math.PI,
    pitch: 0.2,
  },
  {
    id: 'f4-r419',
    shortLabel: 'P.419 · Đọc mở',
    fullLabel: 'Tầng 4 · Phòng đọc mở 419',
    floor: 4,
    x: 27.5,
    z: 0,
    yaw: -Math.PI / 2,
    pitch: 0.2,
  },
  {
    id: 'f5-r501',
    shortLabel: 'P.501 · Học nhóm',
    fullLabel: 'Tầng 5 · Phòng học nhóm 501',
    floor: 5,
    x: -10.8,
    z: -18.5,
    yaw: 0,
    pitch: 0.2,
  },
  {
    id: 'f6-lounge',
    shortLabel: 'T6 · Sáng tạo 🎹',
    fullLabel: 'Tầng 6 · Không gian Sáng tạo & Đại dương cầm',
    floor: 6,
    x: -4.2,
    z: 5.5,
    yaw: 0.55,
    pitch: 0.22,
  },
  {
    id: 'f7-mezz',
    shortLabel: 'T7 · Tầng lửng',
    fullLabel: 'Tầng 7 · Tầng lửng INNOVATE · CONNECT · CREATE',
    floor: 7,
    x: 0,
    z: 13.2,
    yaw: 0,
    pitch: 0.25,
  },
  {
    id: 'f10-rooftop',
    shortLabel: 'T10 · Sân thượng 🔭',
    fullLabel: 'Tầng 10 · Sân thượng Pergola & Đài ngắm sao',
    floor: 10,
    x: 11.5,
    z: 0.4,
    yaw: -Math.PI / 2,
    pitch: 0.16,
  },
];

const PIANO_OCTAVE_NOTES = [
  { midi: 60, label: 'C4', solfege: 'Đô' },
  { midi: 62, label: 'D4', solfege: 'Rê' },
  { midi: 64, label: 'E4', solfege: 'Mi' },
  { midi: 65, label: 'F4', solfege: 'Fa' },
  { midi: 67, label: 'G4', solfege: 'Sol' },
  { midi: 69, label: 'A4', solfege: 'La' },
  { midi: 71, label: 'B4', solfege: 'Si' },
  { midi: 72, label: 'C5', solfege: 'Đô+' },
];

export interface LibraryFloorNavProps {
  visible: boolean;
  externalModal?: 'piano' | 'telescope' | null;
  onClearExternalModal?: () => void;
}

export function LibraryFloorNav({
  visible,
  externalModal = null,
  onClearExternalModal,
}: LibraryFloorNavProps) {
  const [activeDestId, setActiveDestId] = useState<string>('f1-atrium');
  const [currentFloor, setCurrentFloor] = useState<LibraryFloorNumber>(playerState.libraryFloor);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [showTelescopeModal, setShowTelescopeModal] = useState<boolean>(false);

  useEffect(() => {
    const onFloorChange = (ev: Event) => {
      const flr = (ev as CustomEvent<{ floor?: LibraryFloorNumber }>).detail?.floor;
      if (flr) setCurrentFloor(flr);
    };
    window.addEventListener('bkhn:library-floor', onFloorChange);
    return () => window.removeEventListener('bkhn:library-floor', onFloorChange);
  }, []);

  useEffect(() => {
    if (externalModal === 'telescope') {
      setShowTelescopeModal(true);
      onClearExternalModal?.();
    } else if (externalModal === 'piano') {
      onClearExternalModal?.();
    }
  }, [externalModal, onClearExternalModal]);

  if (!visible) return null;

  const jumpToPreset = (dest: LibraryPresetDestination) => {
    setActiveDestId(dest.id);
    setCurrentFloor(dest.floor);
    setShowTelescopeModal(false);
    const bkhn = (
      window as unknown as {
        __bkhn?: {
          setLibraryFloor?: (
            floor: LibraryFloorNumber,
            x?: number,
            z?: number,
            yaw?: number,
            pitch?: number,
          ) => void;
        };
      }
    ).__bkhn;
    bkhn?.setLibraryFloor?.(dest.floor, dest.x, dest.z, dest.yaw, dest.pitch);
  };

  const triggerPianoNote = (midi: number) => {
    window.dispatchEvent(new CustomEvent('bkhn:piano-note', { detail: { midi, velocity: 0.82 } }));
  };

  const playMelody = () => {
    const notes = [60, 64, 67, 72, 71, 67, 64, 69, 67, 65, 64, 62, 60];
    notes.forEach((m, i) => {
      setTimeout(() => triggerPianoNote(m), i * 190);
    });
  };

  const activePreset =
    LIBRARY_PRESET_DESTINATIONS.find((d) => d.id === activeDestId && d.floor === currentFloor) ??
    LIBRARY_PRESET_DESTINATIONS.find((d) => d.floor === currentFloor) ??
    LIBRARY_PRESET_DESTINATIONS[0];

  return (
    <>
      <div
        data-testid="library-floor-nav"
        className="pointer-events-auto fixed left-3 top-14 z-20 flex max-w-[calc(100vw-24px)] flex-col gap-1.5"
      >
        {/* Thanh trạng thái Tầng hiện tại + nút mở/thu gọn bảng thang máy Tầng 1–10 */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-400/35 bg-slate-950/85 px-2.5 py-1.5 text-xs text-amber-100 shadow-lg backdrop-blur-md">
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            🛗 Tầng {currentFloor}
          </span>
          <span className="hidden text-slate-300 sm:inline">· {activePreset.fullLabel}</span>
          <button
            type="button"
            data-testid="library-floor-toggle"
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/35"
          >
            {expanded ? 'Thu gọn ▲' : 'Chọn tầng / phòng (T1–T10) ▼'}
          </button>
        </div>

        {/* Dải nút chọn nhanh các tầng & phòng đọc chuẩn studywithhuster.cyou */}
        {expanded && (
          <div
            data-testid="library-floor-list"
            className="flex max-w-[680px] flex-wrap gap-1 rounded-xl border border-slate-700/80 bg-slate-950/90 p-2 shadow-xl backdrop-blur-md"
          >
            {LIBRARY_PRESET_DESTINATIONS.map((dest) => {
              const isCurrent = dest.floor === currentFloor && dest.id === activePreset.id;
              return (
                <button
                  key={dest.id}
                  type="button"
                  data-testid={`lib-floor-btn-${dest.id}`}
                  onClick={() => jumpToPreset(dest)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    isCurrent
                      ? 'border border-amber-300 bg-amber-500 text-slate-950 shadow-sm'
                      : 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:border-amber-400/60 hover:bg-slate-700'
                  }`}
                >
                  {dest.shortLabel}
                </button>
              );
            })}
          </div>
        )}

        {/* Thanh phím đàn Đại dương cầm 88 phím khi ở Tầng 6 */}
        {currentFloor === 6 && (
          <div
            data-testid="library-piano-bar"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-amber-400/40 bg-slate-950/90 px-2.5 py-1.5 text-xs text-slate-100 shadow-lg backdrop-blur-md"
          >
            <span className="mr-1 font-bold text-amber-300">🎹 Grand Piano Tầng 6:</span>
            {PIANO_OCTAVE_NOTES.map((n) => (
              <button
                key={n.midi}
                type="button"
                onClick={() => triggerPianoNote(n.midi)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-900 shadow-sm transition active: translate-y-0.5 hover:bg-amber-100"
              >
                {n.solfege}
              </button>
            ))}
            <button
              type="button"
              onClick={playMelody}
              className="ml-1 rounded-lg border border-amber-400/50 bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/40"
            >
              🎵 Dạo giai điệu
            </button>
          </div>
        )}

        {/* Nút ngắm sao qua Kính thiên văn khi ở Sân thượng Tầng 10 */}
        {currentFloor === 10 && (
          <div
            data-testid="library-rooftop-bar"
            className="flex items-center gap-2 rounded-xl border border-sky-400/40 bg-slate-950/90 px-2.5 py-1.5 text-xs text-sky-100 shadow-lg backdrop-blur-md"
          >
            <span className="font-bold text-sky-300">🔭 Đài ngắm sao Tầng 10:</span>
            <button
              type="button"
              onClick={() => setShowTelescopeModal(true)}
              className="rounded-lg border border-sky-400/50 bg-sky-500/25 px-2.5 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/40"
            >
              Ngắm bầu trời sao & Từ vựng Thiên văn HSK
            </button>
          </div>
        )}
      </div>

      {/* Modal Kính thiên văn ngắm bầu trời sao Hà Nội & Từ vựng HSK trên Tầng 10 */}
      {showTelescopeModal && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-sky-400/50 bg-slate-950 p-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-sky-300">
                  🔭 Đài Ngắm Sao Sân Thượng Tầng 10 · 图书馆顶层观星台
                </h3>
                <p className="text-xs text-slate-400">
                  Góc nhìn qua kính thiên văn khúc xạ hướng Đông trên đỉnh Thư viện Tạ Quang Bửu
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTelescopeModal(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Đóng ✕
              </button>
            </div>

            <div className="my-4 flex flex-col items-center justify-center rounded-xl border border-sky-500/30 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 p-4">
              <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-2 border-amber-400/70 bg-slate-950/90 shadow-inner">
                <div className="text-center">
                  <div className="text-2xl tracking-widest text-amber-200">✦  ★  ✧</div>
                  <div className="mt-1 text-xs font-bold text-sky-300">
                    Orion · Cassiopeia · Pleiades
                  </div>
                  <div className="mt-1 text-[11px] text-slate-300">
                    Bầu trời đêm Hà Nội nhìn từ độ cao +36m
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5">
                <div className="font-bold text-amber-300">天文望远镜 (tiānwén wàngyuǎnjìng)</div>
                <div className="text-slate-300">Kính thiên văn</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5">
                <div className="font-bold text-amber-300">星空 · 银河 (xīngkōng · yínhé)</div>
                <div className="text-slate-300">Bầu trời sao · Dải Ngân Hà</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5">
                <div className="font-bold text-amber-300">星座 · 流星 (xīngzuò · liúxīng)</div>
                <div className="text-slate-300">Chòm sao · Sao băng</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5">
                <div className="font-bold text-amber-300">顶层露台 (dǐngcéng lùtái)</div>
                <div className="text-slate-300">Sân thượng tầng 10</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
