// ---------------------------------------------------------------------------
// features/social/multiplayer/MultiplayerStatusBar.tsx — Chip trạng thái phòng
// Multiplayer trên HUD và hook đồng bộ vị trí 10Hz + test hook `__bkhnMp`.
// Module ID: feature.social.multiplayer
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import {
  multiplayer,
  type MultiplayerSnapshot,
  type RemoteState,
} from '../../../lib/multiplayer';
import { bikeState, playerInput, playerState } from '../../../lib/playerState';

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
    let lastSent = { x: 0, z: 0, facing: 0, state: 'idle' as RemoteState };
    let lastSentAt = 0;
    const id = setInterval(() => {
      if (playerState.inClassroom || playerState.inLibraryLobby) return;
      const state: RemoteState = bikeState.riding
        ? 'riding'
        : playerState.moving
          ? playerInput.run
            ? 'running'
            : 'walking'
          : 'idle';
      const { x, z } = playerState.pos;
      const facing = playerState.facing;
      const moved = Math.hypot(x - lastSent.x, z - lastSent.z) > 0.05;
      const turned = Math.abs(facing - lastSent.facing) > 0.05;
      const stale = Date.now() - lastSentAt > 500;
      if (moved || turned || state !== lastSent.state || stale) {
        multiplayer.sendMove(x, z, facing, state);
        lastSent = { x, z, facing, state };
        lastSentAt = Date.now();
      }
    }, 100);
    return () => clearInterval(id);
  }, [entered]);

  return mpSnap;
}

export function MultiplayerStatusChip({ snapshot }: { snapshot: MultiplayerSnapshot }) {
  return (
    <div
      data-testid="mp-chip"
      className="w-fit rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm"
    >
      {snapshot.status === 'online'
        ? `👥 Phòng ${snapshot.roomId ?? '—'} · ${snapshot.count} người`
        : snapshot.status === 'connecting'
          ? '👥 Đang kết nối…'
          : '👥 Chơi một mình (mất kết nối)'}
    </div>
  );
}
