'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameVfxSandbox.tsx
// Sân khấu Demo Tương Tác dùng trực tiếp bộ `BoardGameVfxStage` + `useBoardGameVfxQueue`:
// - Đánh thường
// - Kiếm Gỗ Masamune + Dũng phản kích COUNTER
// - Súng Liên Thanh (Multi-target + Lá Chắn BLOCK)
// - Vy "Radio" Tuyệt Kỹ (Cut-in chân dung lớn + Tia sét 1d6)
// - Lật Vai Lộ Diện (Minh "Kỹ Thuật" Cut-in + Trang bị 3D)
// - Lượt Của Bạn / Hạ Gục / Chiến Thắng + Skip Animation + Giảm chuyển động
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import { getCardById, toCardPublicMeta } from '@/features/boardgame/domain/cards';
import { DEFAULT_CLUSTER_PAIRS } from '@/features/boardgame/domain/rules';
import {
  sanitizeBoardGameAppearance,
  type BoardGamePublicGameView,
  type BoardGamePublicPlayerView,
} from '@/shared/contracts/boardgame';
import {
  DeckCardBackSvg,
  DiceD4Svg,
  DiceD6Svg,
  PlayerPawnToken,
} from './BoardGameArt';
import { BoardGameVfxStage, useBoardGameVfxQueue } from './BoardGameVfxStage';
import {
  GRAPHICS_QUALITY_LABELS,
  GRAPHICS_TIER_LABELS,
  useBoardGameGraphicsSettings,
  type BoardGameQualitySetting,
} from './graphics-settings';
import {
  isBoardGameSoundMuted,
  setBoardGameSoundMuted,
  suspendBoardGameAudio,
} from './sound';

const BASE_APPEARANCE = sanitizeBoardGameAppearance({});

function cardMeta(id: string) {
  const c = getCardById(id);
  if (!c) {
    throw new Error(`Missing card ${id}`);
  }
  return toCardPublicMeta(c);
}

function createSandboxInitialGame(): BoardGamePublicGameView {
  const players: BoardGamePublicPlayerView[] = [
    {
      playerId: 'sb-minh',
      displayName: 'Minh An',
      seatIndex: 0,
      location: 'lobby',
      woundsTaken: 1,
      handCount: 0,
      equipped: [cardMeta('eq-04')],
      attacksMade: 0,
      attacksThisTurn: 0,
      investigationsCount: 0,
      guardianShieldActive: false,
      alive: true,
      connected: true,
      revealedRoleId: null,
      revealedFaction: null,
      revealedMaxHp: null,
      revealedSkillCooldown: 0,
      revealedSkillUsedOnce: false,
      appearance: BASE_APPEARANCE,
    },
    {
      playerId: 'sb-vy',
      displayName: 'Vy Hà',
      seatIndex: 1,
      location: 'radio',
      woundsTaken: 2,
      handCount: 0,
      equipped: [],
      attacksMade: 0,
      attacksThisTurn: 0,
      investigationsCount: 1,
      guardianShieldActive: false,
      alive: true,
      connected: true,
      revealedRoleId: 'gac-radio',
      revealedFaction: 'lantern-guard',
      revealedMaxHp: 12,
      revealedSkillCooldown: 0,
      revealedSkillUsedOnce: false,
      appearance: BASE_APPEARANCE,
    },
    {
      playerId: 'sb-dung',
      displayName: 'Dũng Kiên',
      seatIndex: 2,
      location: 'canteen',
      woundsTaken: 1,
      handCount: 0,
      equipped: [],
      attacksMade: 0,
      attacksThisTurn: 0,
      investigationsCount: 0,
      guardianShieldActive: true,
      alive: true,
      connected: true,
      revealedRoleId: 'suong-gac-cong',
      revealedFaction: 'mist-order',
      revealedMaxHp: 14,
      revealedSkillCooldown: 0,
      revealedSkillUsedOnce: false,
      appearance: BASE_APPEARANCE,
    },
    {
      playerId: 'sb-tu',
      displayName: 'Tú Linh',
      seatIndex: 3,
      location: 'canteen',
      woundsTaken: 2,
      handCount: 0,
      equipped: [cardMeta('ev-06')],
      attacksMade: 0,
      attacksThisTurn: 0,
      investigationsCount: 0,
      guardianShieldActive: false,
      alive: true,
      connected: true,
      revealedRoleId: null,
      revealedFaction: null,
      revealedMaxHp: null,
      revealedSkillCooldown: 0,
      revealedSkillUsedOnce: false,
      appearance: BASE_APPEARANCE,
    },
  ];

  return {
    rulesetVersion: 4,
    matchId: 'sandbox-vfx-v1',
    round: 2,
    maxRounds: 20,
    turnNumber: 5,
    turnPhase: 'MAIN_ACTION',
    activePlayerId: 'sb-minh',
    turnOrder: ['sb-minh', 'sb-vy', 'sb-dung', 'sb-tu'],
    clusterPairs: DEFAULT_CLUSTER_PAIRS,
    deadCount: 0,
    players,
    deckCounts: { investigation: 13, equipment: 12, event: 14 },
    lastDiceRoll: null,
    lastInvestigation: null,
    lastRevealEvent: null,
    publicLog: [],
    highlights: [],
    winnerLabel: null,
    winnerFaction: null,
    winnerPlayerIds: [],
    winReason: null,
    finalReveal: null,
  };
}

export function BoardGameVfxSandbox() {
  const stageRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<number>(1);
  const [game, setGame] = useState<BoardGamePublicGameView>(() => createSandboxInitialGame());
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>('sb-tu');
  const [muted, setMuted] = useState<boolean>(() => isBoardGameSoundMuted());
  const [lastDemoLabel, setLastDemoLabel] = useState<string>('Sẵn sàng — chọn 1 hiệu ứng để xem trực tiếp');

  const gfx = useBoardGameGraphicsSettings();

  useEffect(() => {
    return () => {
      suspendBoardGameAudio();
    };
  }, []);

  const vfx = useBoardGameVfxQueue({
    publicGame: game,
    privateView: null,
    selfPlayerId: 'sb-minh',
    isSpectator: false,
    handUnmasked: true,
    containerRef: stageRef,
    graphicsProfile: gfx.profile,
  });

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setBoardGameSoundMuted(next);
  };

  const nextLogId = (prefix: string) => {
    const n = seqRef.current++;
    return `sb-log-${prefix}-${n}`;
  };

  const resetSandbox = () => {
    seqRef.current += 1;
    vfx.skipAllAnimations();
    setGame({
      ...createSandboxInitialGame(),
      matchId: `sandbox-vfx-${seqRef.current}`,
    });
    setSelectedTargetId('sb-tu');
    setLastDemoLabel('Đã đặt lại sa bàn KTX 4 người');
  };

  // Demo 1: Đánh thường (Đường nhắm + SLASH + Xúc xắc |6-3|=3 + -3)
  const triggerNormalAttack = () => {
    setSelectedTargetId('sb-tu');
    setLastDemoLabel('Đánh thường: Minh An tung |6 - 3| = 3 sát thương lên Tú Linh');
    setGame((prev) => {
      const turn = prev.turnNumber + 1;
      const now = Date.now();
      return {
        ...prev,
        turnNumber: turn,
        activePlayerId: 'sb-minh',
        players: prev.players.map((p) =>
          p.playerId === 'sb-tu'
            ? { ...p, woundsTaken: Math.min(11, p.woundsTaken + 3) }
            : p,
        ),
        lastDiceRoll: {
          id: nextLogId('dice-norm'),
          round: prev.round,
          atMs: now,
          kind: 'attack',
          playerId: 'sb-minh',
          displayName: 'Minh An',
          d6: 6,
          d4: 3,
          total: 3,
          rerollRequired: false,
          freeChoice: false,
          resolvedLocation: null,
          targetPlayerId: 'sb-tu',
          damageDealt: 3,
        },
        publicLog: [
          ...prev.publicLog.slice(-15),
          {
            id: nextLogId('atk'),
            round: prev.round,
            atMs: now,
            kind: 'attack',
            actorId: 'sb-minh',
            text: '⚔️ Minh An tấn công Tú Linh (|6 - 3|, tổng 3) → gây 3 sát thương!',
          },
        ],
      };
    });
  };

  // Demo 2: Kiếm Gỗ Nguyền Rủa Masamune (ev-01) + Dũng phản kích COUNTER
  const triggerMasamuneAndCounter = () => {
    setSelectedTargetId('sb-dung');
    setLastDemoLabel('Kiếm Gỗ Masamune (1d4=4) chém Dũng Kiên & kích hoạt Phản Kích!');
    setGame((prev) => {
      const turn = prev.turnNumber + 1;
      const now = Date.now();
      return {
        ...prev,
        turnNumber: turn,
        activePlayerId: 'sb-minh',
        players: prev.players.map((p) => {
          if (p.playerId === 'sb-minh') {
            return {
              ...p,
              woundsTaken: Math.min(11, p.woundsTaken + 1),
              equipped: [cardMeta('ev-01')],
            };
          }
          if (p.playerId === 'sb-dung') {
            return { ...p, woundsTaken: Math.min(11, p.woundsTaken + 4) };
          }
          return p;
        }),
        lastDiceRoll: {
          id: nextLogId('dice-masa'),
          round: prev.round,
          atMs: now,
          kind: 'attack',
          playerId: 'sb-minh',
          displayName: 'Minh An',
          d6: 0,
          d4: 4,
          total: 4,
          rerollRequired: false,
          freeChoice: false,
          resolvedLocation: null,
          targetPlayerId: 'sb-dung',
          damageDealt: 4,
          counterRoll: {
            playerId: 'sb-dung',
            displayName: 'Dũng Kiên',
            d6: 3,
            d4: 2,
            total: 1,
            damageDealt: 1,
          },
        },
        publicLog: [
          ...prev.publicLog.slice(-15),
          {
            id: nextLogId('masa'),
            round: prev.round,
            atMs: now,
            kind: 'attack',
            actorId: 'sb-minh',
            text: '⚔️ Minh An tấn công Dũng Kiên (1d4=4, tổng 4) → gây 4 sát thương!',
          },
          {
            id: nextLogId('ctr'),
            round: prev.round,
            atMs: now + 1,
            kind: 'skill',
            actorId: 'sb-dung',
            text: '🥊 Dũng "Gác Cổng" (Dũng Kiên) phản kích tức thì (|3 - 2|, tổng 1) → Minh An chịu 1 sát thương!',
          },
        ],
      };
    });
  };

  // Demo 3: Súng Liên Thanh (ev-06) đa mục tiêu + Khiên BLOCK
  const triggerMachineGunBarrage = () => {
    setSelectedTargetId(null);
    setLastDemoLabel('Súng Liên Thanh: Tú Linh xả đạn đa mục tiêu (Minh -2, Vy -3, Dũng BLOCK)');
    setGame((prev) => {
      const turn = prev.turnNumber + 1;
      const now = Date.now();
      return {
        ...prev,
        turnNumber: turn,
        activePlayerId: 'sb-tu',
        players: prev.players.map((p) => {
          if (p.playerId === 'sb-minh') return { ...p, woundsTaken: Math.min(11, p.woundsTaken + 2) };
          if (p.playerId === 'sb-vy') return { ...p, woundsTaken: Math.min(10, p.woundsTaken + 3) };
          if (p.playerId === 'sb-dung') return { ...p, guardianShieldActive: false };
          return p;
        }),
        lastDiceRoll: {
          id: nextLogId('dice-mg'),
          round: prev.round,
          atMs: now,
          kind: 'attack',
          playerId: 'sb-tu',
          displayName: 'Tú Linh',
          d6: 5,
          d4: 2,
          total: 3,
          rerollRequired: false,
          freeChoice: false,
          resolvedLocation: null,
          targetPlayerId: 'sb-vy',
          damageDealt: 5,
        },
        publicLog: [
          ...prev.publicLog.slice(-15),
          {
            id: nextLogId('shield-blk'),
            round: prev.round,
            atMs: now,
            kind: 'skill',
            actorId: 'sb-dung',
            text: '🛡️ Lá Chắn Thiên Thần che chở Dũng Kiên — miễn nhiễm đòn đánh!',
          },
          {
            id: nextLogId('mg'),
            round: prev.round,
            atMs: now + 1,
            kind: 'attack',
            actorId: 'sb-tu',
            text: '🔫 Súng Liên Thanh! Tú Linh xả đạn (|5 - 2|, tổng 3) vào 3 người trong tầm → tổng 5 sát thương!',
          },
        ],
      };
    });
  };

  // Demo 4: Vy "Radio" Tuyệt Kỹ (Cut-in chân dung lớn + Tia sét Xung Cao Áp 1d6)
  const triggerVyRadioUltimate = () => {
    setSelectedTargetId('sb-tu');
    setLastDemoLabel('Vy "Radio" kích hoạt Tuyệt Kỹ: XUNG CAO ÁP 1D6 (Chân dung lớn + Sét giáng)');
    setGame((prev) => {
      const turn = prev.turnNumber + 1;
      const now = Date.now();
      return {
        ...prev,
        turnNumber: turn,
        activePlayerId: 'sb-vy',
        players: prev.players.map((p) =>
          p.playerId === 'sb-tu'
            ? { ...p, woundsTaken: Math.min(12, p.woundsTaken + 5) }
            : p,
        ),
        publicLog: [
          ...prev.publicLog.slice(-15),
          {
            id: nextLogId('vy-ult'),
            round: prev.round,
            atMs: now,
            kind: 'skill',
            actorId: 'sb-vy',
            text: '⚡ Vy Hà phóng Xung Cao Áp (1d6=5) lên Tú Linh → 5 sát thương!',
          },
        ],
      };
    });
  };

  // Demo 5: Lật Vai Lộ Diện (Minh "Kỹ Thuật" + Rút & Trang bị Thương Ánh Sáng)
  const triggerRevealAndDraw = () => {
    setSelectedTargetId(null);
    setLastDemoLabel('Minh An lật vai công khai Minh "Kỹ Thuật" & rút trang bị Thương Ánh Sáng');
    setGame((prev) => {
      const turn = prev.turnNumber + 1;
      const now = Date.now();
      return {
        ...prev,
        turnNumber: turn,
        activePlayerId: 'sb-minh',
        players: prev.players.map((p) =>
          p.playerId === 'sb-minh'
            ? {
                ...p,
                revealedRoleId: 'gac-ky-thuat',
                revealedFaction: 'lantern-guard',
                revealedMaxHp: 14,
                equipped: [cardMeta('eq-04')],
              }
            : p,
        ),
        lastRevealEvent: {
          id: `sb-rev-minh-${turn}`,
          round: prev.round,
          atMs: now,
          playerId: 'sb-minh',
          displayName: 'Minh An',
          roleId: 'gac-ky-thuat',
          roleName: 'Minh "Kỹ Thuật"',
          faction: 'lantern-guard',
          reason: 'voluntary',
        },
        publicLog: [
          ...prev.publicLog.slice(-15),
          {
            id: nextLogId('draw-eq'),
            round: prev.round,
            atMs: now,
            kind: 'equipment',
            actorId: 'sb-minh',
            text: '🎒 Minh An rút từ Cung Ứng tại Sảnh Tầng 1 và trang bị ngay "Thương Ánh Sáng"!',
          },
          {
            id: nextLogId('rev-minh'),
            round: prev.round,
            atMs: now + 1,
            kind: 'reveal',
            actorId: 'sb-minh',
            text: '🎭 Minh An lật vai công khai: Minh "Kỹ Thuật" (Đội Săn Đêm)!',
          },
        ],
      };
    });
  };

  // Demo phụ: Hồi máu (+2) / Hạ gục & Chiến thắng / Lượt của bạn
  const triggerHealAndKnockout = () => {
    setLastDemoLabel('Hồi máu (+2 💚) · Hạ gục · Banner CHIẾN THẮNG');
    setGame((prev) => {
      const turn = prev.turnNumber + 1;
      const now = Date.now();
      return {
        ...prev,
        turnNumber: turn,
        players: prev.players.map((p) => {
          if (p.playerId === 'sb-vy') return { ...p, woundsTaken: Math.max(0, p.woundsTaken - 2) };
          if (p.playerId === 'sb-tu') {
            return {
              ...p,
              alive: false,
              woundsTaken: 13,
              revealedRoleId: 'suong-an-danh',
              revealedFaction: 'mist-order',
              revealedMaxHp: 13,
            };
          }
          return p;
        }),
        winnerLabel: 'Đội Săn Đêm Chiến Thắng!',
        winnerFaction: 'lantern-guard',
        winnerPlayerIds: ['sb-minh', 'sb-vy'],
        winReason: 'Toàn bộ Hội Bóng Đêm đã bị loại khỏi KTX!',
        publicLog: [
          ...prev.publicLog.slice(-15),
          {
            id: nextLogId('heal'),
            round: prev.round,
            atMs: now,
            kind: 'equipment',
            actorId: 'sb-vy',
            text: '💚 Vy Hà hồi 2 thương tích (Nước Suối Hồi Phục).',
          },
        ],
      };
    });
  };

  return (
    <section
      data-testid="proto-section-vfx-sandbox"
      className="rounded-3xl border border-indigo-500/40 bg-slate-900/70 p-4 sm:p-6 shadow-2xl space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <span className="rounded-full border border-indigo-400/50 bg-indigo-950/75 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-200">
            Combat VFX &amp; Cut-in Lab
          </span>
          <h2 className="mt-1.5 text-lg font-black text-white sm:text-2xl">
            5. Sân Khấu Combat VFX, Xúc Xắc Nảy, Rút Bài &amp; Cut-in Điện Ảnh
          </h2>
          <p className="text-xs text-slate-300 sm:text-sm">
            Sử dụng trực tiếp Visual Event Queue, SVG nhắm mục tiêu, Canvas 2D &amp; CSS Cut-in giống bàn chơi thật.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/90 p-1">
            {(['auto', 'high', 'balanced', 'low'] as const satisfies readonly BoardGameQualitySetting[]).map(
              (q) => {
                const active = gfx.prefs.quality === q;
                return (
                  <button
                    key={q}
                    type="button"
                    data-testid={`proto-quality-${q}`}
                    aria-pressed={active}
                    onClick={() => gfx.setQuality(q)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
                      active
                        ? 'bg-cyan-400 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {GRAPHICS_QUALITY_LABELS[q]}
                  </button>
                );
              },
            )}
            <span className="px-2 text-[10px] font-extrabold text-cyan-300">
              Tier: {GRAPHICS_TIER_LABELS[gfx.profile.tier]}
            </span>
          </div>
          <button
            type="button"
            data-testid="proto-shake-toggle"
            onClick={() => gfx.setShakeEnabled(!gfx.prefs.shakeEnabled)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              !gfx.prefs.shakeEnabled
                ? 'border-emerald-400/70 bg-emerald-950/70 text-emerald-200'
                : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {gfx.prefs.shakeEnabled ? '📳 Rung mạnh: BẬT' : '🛡️ Rung mạnh: TẮT'}
          </button>
          <button
            type="button"
            data-testid="proto-sound-toggle"
            onClick={handleToggleMute}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              muted
                ? 'border-rose-400/70 bg-rose-950/70 text-rose-200'
                : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {muted ? '🔇 Âm: TẮT' : '🔊 Âm: BẬT'}
          </button>
          <button
            type="button"
            data-testid="proto-vfx-reduced-toggle"
            onClick={() => gfx.setReducedMotionOverride(!vfx.reducedMotion)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              vfx.reducedMotion
                ? 'border-amber-400/70 bg-amber-950/70 text-amber-200'
                : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {vfx.reducedMotion ? '⏸️ Reduced Motion: BẬT' : '✨ Reduced Motion: TẮT'}
          </button>
          <button
            type="button"
            data-testid="proto-vfx-reset-btn"
            onClick={resetSandbox}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            ↺ Đặt lại sa bàn
          </button>
        </div>
      </div>

      {/* Bộ nút kích hoạt 5 kịch bản + nút mở rộng */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="proto-vfx-demo-normal"
          onClick={triggerNormalAttack}
          className="rounded-xl border border-sky-400/50 bg-sky-950/75 px-3 py-2 text-xs font-black text-sky-100 hover:bg-sky-900 cursor-pointer"
        >
          ⚔️ 1. Đánh thường
        </button>
        <button
          type="button"
          data-testid="proto-vfx-demo-masamune"
          onClick={triggerMasamuneAndCounter}
          className="rounded-xl border border-rose-400/50 bg-rose-950/75 px-3 py-2 text-xs font-black text-rose-100 hover:bg-rose-900 cursor-pointer"
        >
          🩸 2. Masamune + Phản kích
        </button>
        <button
          type="button"
          data-testid="proto-vfx-demo-machinegun"
          onClick={triggerMachineGunBarrage}
          className="rounded-xl border border-orange-400/50 bg-orange-950/75 px-3 py-2 text-xs font-black text-orange-100 hover:bg-orange-900 cursor-pointer"
        >
          🔫 3. Súng Liên Thanh (Đa mục tiêu + BLOCK)
        </button>
        <button
          type="button"
          data-testid="proto-vfx-demo-vy-radio"
          onClick={triggerVyRadioUltimate}
          className="rounded-xl border border-emerald-400/60 bg-emerald-950/80 px-3 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-900 cursor-pointer"
        >
          ⚡ 4. Vy &ldquo;Radio&rdquo; Tuyệt Kỹ (Sét 1d6)
        </button>
        <button
          type="button"
          data-testid="proto-vfx-demo-reveal"
          onClick={triggerRevealAndDraw}
          className="rounded-xl border border-amber-400/60 bg-amber-950/80 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-900 cursor-pointer"
        >
          🎭 5. Lật Vai Minh + Rút Trang Bị
        </button>
        <button
          type="button"
          data-testid="proto-vfx-demo-victory"
          onClick={triggerHealAndKnockout}
          className="rounded-xl border border-purple-400/50 bg-purple-950/75 px-3 py-2 text-xs font-black text-purple-100 hover:bg-purple-900 cursor-pointer"
        >
          🏆 6. Hồi máu + Hạ gục + Thắng
        </button>
      </div>

      <p
        data-testid="proto-vfx-status-label"
        className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-cyan-200"
      >
        Trạng thái: {lastDemoLabel}
      </p>

      {/* SA BÀN DEMO CÓ GẮN TRỰC TIẾP BoardGameVfxStage */}
      <div
        ref={stageRef}
        data-testid="proto-vfx-arena"
        data-active-tier={gfx.profile.tier}
        data-shake-enabled={String(gfx.profile.enableScreenShake)}
        data-reduced-motion={String(vfx.reducedMotion)}
        className={`relative min-h-[340px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 p-3 sm:p-5 space-y-4 ${
          vfx.screenShake === 'heavy'
            ? 'bg-vfx-shake-heavy'
            : vfx.screenShake === 'light'
              ? 'bg-vfx-shake-light'
              : ''
        }`}
      >
        {/* 4 quân cờ ở các ô */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {game.players.map((p) => {
            const isTarget = selectedTargetId === p.playerId;
            return (
              <button
                key={p.playerId}
                type="button"
                data-vfx-player={p.playerId}
                onClick={() => setSelectedTargetId((prev) => (prev === p.playerId ? null : p.playerId))}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition cursor-pointer ${
                  !p.alive
                    ? 'opacity-45 border-slate-800 bg-slate-900/50'
                    : isTarget
                      ? 'border-rose-400 bg-rose-950/40 ring-2 ring-rose-400/50'
                      : 'border-slate-700/80 bg-slate-900/90 hover:border-cyan-400/60'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerPawnToken
                      compact
                      displayName={p.displayName}
                      seatIndex={p.seatIndex}
                      alive={p.alive}
                      isActive={game.activePlayerId === p.playerId}
                      isSelf={p.playerId === 'sb-minh'}
                      revealedFaction={p.revealedFaction}
                    />
                    <span className="truncate text-xs sm:text-sm font-black text-white">
                      {p.displayName}
                    </span>
                  </div>
                  {p.guardianShieldActive && (
                    <span className="rounded bg-sky-500/25 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
                      🛡️ Khiên
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-rose-200">
                    🩸 {p.woundsTaken} vết
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                    {p.revealedRoleId ? 'Đã lộ' : 'Vai ẩn'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Khay xúc xắc & 3 chồng bài */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-3">
          <div className="flex items-center gap-2">
            <DiceD6Svg value={game.lastDiceRoll?.d6 || 6} size={32} />
            <DiceD4Svg value={game.lastDiceRoll?.d4 || 4} size={32} />
            <span className="text-xs font-bold text-slate-300">Khay Xúc Xắc Server</span>
          </div>

          <div className="flex items-center gap-2">
            {(['investigation', 'equipment', 'event'] as const).map((dk) => (
              <div
                key={dk}
                data-vfx-deck={dk}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/90 px-2 py-1"
              >
                <DeckCardBackSvg deck={dk} size={24} />
                <span className="text-[11px] font-bold text-slate-200">
                  {game.deckCounts[dk]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <BoardGameVfxStage
          vfx={vfx}
          containerRef={stageRef}
          publicGame={game}
          sourcePlayerId="sb-minh"
          selectedTargetId={selectedTargetId}
          targetingTone="hostile"
        />
      </div>
    </section>
  );
}
