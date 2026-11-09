// ---------------------------------------------------------------------------
// LibraryFloorNav.tsx — Bảng điều khiển Thang máy & Chuyển tầng nhanh (Tầng 1–10)
// kết hợp Đàn Đại dương cầm Grand Piano (Tầng 6) & Kính thiên văn ngắm sao (Tầng 10)
// theo chuẩn mô hình Thư viện Tạ Quang Bửu tại studywithhuster.cyou.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import {
  LIBRARY_PRESET_DESTINATIONS,
  libraryNavigationController,
  type LibraryFloor,
  type LibraryNavigationSnapshot,
  type LibrarySpawnPoint,
} from '../../lib/campus';

export type LibraryFloorNumber = LibraryFloor;
export type LibraryPresetDestination = LibrarySpawnPoint;
export { LIBRARY_PRESET_DESTINATIONS };

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
  const [navSnap, setNavSnap] = useState<LibraryNavigationSnapshot>(() =>
    libraryNavigationController.getSnapshot(),
  );
  const [expanded, setExpanded] = useState<boolean>(false);
  const [showTelescopeModal, setShowTelescopeModal] = useState<boolean>(false);

  useEffect(() => {
    setNavSnap(libraryNavigationController.getSnapshot());
    const unsub = libraryNavigationController.subscribe((snap) => {
      setNavSnap(snap);
    });
    const onFloorChange = (ev: Event) => {
      const flr = (ev as CustomEvent<{ floor?: LibraryFloorNumber }>).detail?.floor;
      if (flr) {
        libraryNavigationController.notifyNaturalFloorChange(flr);
      }
    };
    window.addEventListener('bkhn:library-floor', onFloorChange);
    return () => {
      unsub();
      window.removeEventListener('bkhn:library-floor', onFloorChange);
    };
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

  const currentFloor = navSnap.currentFloor;
  const activeDestId = navSnap.activePresetId;
  const isBusy = navSnap.phase === 'preparing' || navSnap.phase === 'transitioning';

  const jumpToPreset = (dest: LibraryPresetDestination) => {
    if (libraryNavigationController.isBusy()) return;
    const outcome = libraryNavigationController.navigateToPreset(dest.id);
    if (outcome.ok) {
      setShowTelescopeModal(false);
    }
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
        data-nav-phase={navSnap.phase}
        data-current-floor={currentFloor}
        data-active-preset={activePreset.id}
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
                  disabled={isBusy}
                  data-testid={`lib-floor-btn-${dest.id}`}
                  onClick={() => jumpToPreset(dest)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
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
