// ---------------------------------------------------------------------------
// features/social/multiplayer/MultiplayerStatusBar.tsx — Chip trạng thái phòng
// Multiplayer trên HUD và hook đồng bộ vị trí 10Hz + test hook `__bkhnMp`.
// Module ID: feature.social.multiplayer
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { formatCampusChannelLabel } from '../../../lib/gameModes';
import {
  multiplayer,
  type MultiplayerSceneId,
  type MultiplayerSnapshot,
  type RemoteAppearance,
  type RemoteState,
} from '../../../lib/multiplayer';
import { bikeState, playerInput, playerState } from '../../../lib/playerState';
import { SPAWN } from '../../../shared/constants/world';
import { clampMoveStep } from '../../../shared/contracts/multiplayer';

export function useMultiplayerBridge(entered: boolean): MultiplayerSnapshot {
  const [mpSnap, setMpSnap] = useState<MultiplayerSnapshot>(() => multiplayer.snapshot);

  useEffect(() => {
    const unsub = multiplayer.subscribe(setMpSnap);
    (window as unknown as { __bkhnMp?: () => MultiplayerSnapshot }).__bkhnMp = () =>
      multiplayer.snapshot;
    return unsub;
  }, []);

  useEffect(() => {
    if (!entered) return;
    let lastSent = {
      x: Number.NaN,
      z: Number.NaN,
      facing: Number.NaN,
      state: 'idle' as RemoteState,
      scene: 'campus' as MultiplayerSceneId,
      libraryFloor: 1,
      seatedSeatId: null as string | null,
      appSig: '',
    };
    let serverEst: { x: number; z: number } = { x: SPAWN.x, z: SPAWN.z };
    let lastSentAt = 0;

    const tick = () => {
      const scene: MultiplayerSceneId = playerState.inClassroom
        ? 'classroom'
        : playerState.inLibraryLobby
          ? 'library'
          : playerState.inBoardGameClub
            ? 'boardgame'
            : 'campus';
      const libraryFloor = playerState.libraryFloor ?? 1;
      const seatedSeatId =
        scene === 'library' && playerState.seated ? playerState.seatId : null;
      const state: RemoteState =
        scene === 'campus' && bikeState.riding
          ? 'riding'
          : playerState.moving && !seatedSeatId
            ? playerInput.run
              ? 'running'
              : 'walking'
            : 'idle';
      const { x, z } = playerState.pos;
      const facing = playerState.facing;
      const appearance: RemoteAppearance = {
        gender: playerState.avatarGender,
        outfit: playerState.avatarOutfit,
        hairStyle: playerState.avatarHairStyle,
        skirt: playerState.avatarSkirt,
        glasses: playerState.avatarGlasses,
        backpack: playerState.avatarBackpack,
      };
      const appSig = `${appearance.gender}:${appearance.outfit}:${appearance.hairStyle}:${appearance.skirt}:${appearance.glasses}:${appearance.backpack}`;

      const moved = Math.hypot(x - lastSent.x, z - lastSent.z) > 0.05;
      const turned = Math.abs(facing - lastSent.facing) > 0.05;
      const metaChanged =
        state !== lastSent.state ||
        scene !== lastSent.scene ||
        libraryFloor !== lastSent.libraryFloor ||
        seatedSeatId !== lastSent.seatedSeatId ||
        appSig !== lastSent.appSig;
      const converging = Math.hypot(x - serverEst.x, z - serverEst.z) > 0.15;
      const stale = Date.now() - lastSentAt > 500;

      if (moved || turned || metaChanged || converging || stale) {
        multiplayer.sendMove(x, z, facing, state, {
          scene,
          libraryFloor,
          seatedSeatId,
          appearance,
        });
        serverEst = clampMoveStep(serverEst.x, serverEst.z, x, z, state, 0.1);
        lastSent = {
          x,
          z,
          facing,
          state,
          scene,
          libraryFloor,
          seatedSeatId,
          appSig,
        };
        lastSentAt = Date.now();
      }
    };

    tick();
    const id = setInterval(tick, 100);
    window.addEventListener('bkhn:library-lobby', tick);
    window.addEventListener('bkhn:library-floor', tick);
    window.addEventListener('bkhn:classroom', tick);
    window.addEventListener('bkhn:outfit', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('bkhn:library-lobby', tick);
      window.removeEventListener('bkhn:library-floor', tick);
      window.removeEventListener('bkhn:classroom', tick);
      window.removeEventListener('bkhn:outfit', tick);
    };
  }, [entered]);

  return mpSnap;
}

export function MultiplayerStatusChip({ snapshot }: { snapshot: MultiplayerSnapshot }) {
  return (
    <div
      data-testid="mp-chip"
      className="w-fit rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm"
    >
      {snapshot.status === 'online'
        ? `👥 ${formatCampusChannelLabel(snapshot.roomId)} · ${snapshot.count} người`
        : snapshot.status === 'connecting'
          ? '👥 Đang kết nối…'
          : '👥 Chơi một mình (mất kết nối)'}
    </div>
  );
}
