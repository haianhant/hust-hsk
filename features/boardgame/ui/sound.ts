'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/sound.ts
// Engine Âm thanh Đa lớp WebAudio + Sample PCM thủ tục cho Bóng Đêm KTX:
// - Đồ thị master: Layer Nodes -> masterGain -> DynamicsCompressor -> destination
// - Kết hợp dao động đa hài + BiquadFilter sweep + PCM noise buffers ngắn (~30KB)
// - Đồng bộ chặt chẽ theo Visual Event Queue (`playSoundForVisualEvent`), chống
//   phát trùng qua event.id khi F5 reconnect & giới hạn đa âm khi nổ nhiều đòn
// - Hỗ trợ Mute, Skip Cinematic (`stopAllBoardGameSounds`) & dọn dẹp sạch khi
//   đóng Bóng Đêm KTX quay về khuôn viên 3D (`suspendBoardGameAudio`)
// ---------------------------------------------------------------------------

import type {
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameRoleId,
} from '../../../shared/contracts/boardgame';
import type { BoardGameVisualEvent } from './vfx-queue';

const SOUND_MUTED_STORAGE_KEY = 'hustverse:bg-sound-muted:v1';
const MAX_PLAYED_EVENT_IDS = 256;
const MAX_ACTIVE_VOICES = 14;
const DEFAULT_CATEGORY_COOLDOWN_MS = 75;

let sharedAudioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let masterCompressorNode: DynamicsCompressorNode | null = null;
let cachedMuted: boolean | null = null;

interface CachedPcmBuffers {
  ctx: AudioContext;
  paper: AudioBuffer;
  diceClick: AudioBuffer;
  blade: AudioBuffer;
  gunCrack: AudioBuffer;
  arcCrackle: AudioBuffer;
}
let cachedBuffers: CachedPcmBuffers | null = null;

const activeSources = new Set<AudioScheduledSourceNode>();
const playedEventOrder: string[] = [];
const playedEventSet = new Set<string>();
const categoryLastPlayedMs = new Map<string, number>();

let totalTriggeredCount = 0;
let dedupedCount = 0;
let coalescedCount = 0;
let stopCount = 0;
let lastTriggeredCategory: string | null = null;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readMutedStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isBoardGameSoundMuted(): boolean {
  if (cachedMuted === null) {
    cachedMuted = readMutedStorage();
  }
  return cachedMuted;
}

export function setBoardGameSoundMuted(muted: boolean): void {
  cachedMuted = Boolean(muted);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, cachedMuted ? '1' : '0');
    } catch {
      // Bỏ qua lỗi quota / privacy mode
    }
  }
  if (cachedMuted) {
    stopAllBoardGameSounds();
  } else if (masterGainNode && sharedAudioCtx) {
    try {
      masterGainNode.gain.setTargetAtTime(0.85, sharedAudioCtx.currentTime, 0.015);
    } catch {
      // ignore
    }
  }
}

function ensureAudioGraph(): {
  ctx: AudioContext;
  bus: GainNode;
  buffers: CachedPcmBuffers;
} | null {
  if (typeof window === 'undefined' || isBoardGameSoundMuted()) {
    return null;
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new Ctor();
      masterGainNode = null;
      masterCompressorNode = null;
      cachedBuffers = null;
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    if (!masterGainNode || !masterCompressorNode) {
      masterGainNode = ctx.createGain();
      masterGainNode.gain.setValueAtTime(0.85, ctx.currentTime);

      masterCompressorNode = ctx.createDynamicsCompressor();
      masterCompressorNode.threshold.setValueAtTime(-14, ctx.currentTime);
      masterCompressorNode.knee.setValueAtTime(18, ctx.currentTime);
      masterCompressorNode.ratio.setValueAtTime(6, ctx.currentTime);
      masterCompressorNode.attack.setValueAtTime(0.003, ctx.currentTime);
      masterCompressorNode.release.setValueAtTime(0.16, ctx.currentTime);

      masterGainNode.connect(masterCompressorNode);
      masterCompressorNode.connect(ctx.destination);
    }

    if (!cachedBuffers || cachedBuffers.ctx !== ctx) {
      cachedBuffers = buildPcmBuffers(ctx);
    }

    return { ctx, bus: masterGainNode, buffers: cachedBuffers };
  } catch {
    return null;
  }
}

function buildPcmBuffers(ctx: AudioContext): CachedPcmBuffers {
  const sr = ctx.sampleRate || 44100;

  const makeNoise = (
    durationSec: number,
    seed: number,
    shaper: (idx: number, len: number, rng: () => number, prev: number) => number,
  ) => {
    const len = Math.max(64, Math.floor(sr * durationSec));
    const buf = ctx.createBuffer(1, len, sr);
    const ch = buf.getChannelData(0);
    const rng = mulberry32(seed);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const sample = shaper(i, len, rng, prev);
      prev = sample;
      ch[i] = Math.max(-1, Math.min(1, sample));
    }
    return buf;
  };

  return {
    ctx,
    // Ma sát giấy cán mờ khi rút/lật bài
    paper: makeNoise(0.14, 0x9e3779b1, (i, len, rng, prev) => {
      const env = Math.sin((i / len) * Math.PI);
      const white = rng() * 2 - 1;
      return (prev * 0.45 + white * 0.55) * env;
    }),
    // Xung gỗ/nhựa sắc gọn khi xúc xắc nảy trên mặt bàn
    diceClick: makeNoise(0.045, 0x243f6a88, (i, len, rng) => {
      const env = Math.exp((-i / len) * 9);
      return (rng() * 2 - 1) * env;
    }),
    // Lưỡi dao/thương xé gió
    blade: makeNoise(0.18, 0xb7e15162, (i, len, rng) => {
      const t = i / len;
      const env = Math.sin(t * Math.PI) * Math.exp(-t * 2.2);
      return (rng() * 2 - 1) * env;
    }),
    // Nổ thuốc súng sắc gọn
    gunCrack: makeNoise(0.09, 0x85ebca6b, (i, len, rng) => {
      const env = Math.exp((-i / len) * 11);
      return (rng() * 2 - 1) * env;
    }),
    // Tia điện cao áp / nổ rền
    arcCrackle: makeNoise(0.32, 0xc2b2ae35, (i, len, rng) => {
      const t = i / len;
      const crack = rng() > 0.86 ? (rng() * 2 - 1) * 1.4 : (rng() * 2 - 1) * 0.4;
      return crack * Math.exp(-t * 4.2);
    }),
  };
}

function trackSource(node: AudioScheduledSourceNode): boolean {
  if (activeSources.size >= MAX_ACTIVE_VOICES) {
    // Cắt voice cũ nhất nếu vượt ngân sách đa âm để bảo vệ CPU/Audio thread
    const oldest = activeSources.values().next().value;
    if (oldest) {
      activeSources.delete(oldest);
      try {
        oldest.stop();
        oldest.disconnect();
      } catch {
        // ignore
      }
    }
  }
  activeSources.add(node);
  node.onended = () => {
    activeSources.delete(node);
    try {
      node.disconnect();
    } catch {
      // ignore
    }
  };
  return true;
}

/**
 * Dừng tức thì mọi âm thanh board game đang phát (dùng cho Skip Cinematic & Mute).
 */
export function stopAllBoardGameSounds(): void {
  stopCount += 1;
  const list = Array.from(activeSources);
  activeSources.clear();
  for (const src of list) {
    try {
      src.onended = null;
      src.stop();
      src.disconnect();
    } catch {
      // ignore already stopped sources
    }
  }
}

/**
 * Tạm dừng và giải phóng tài nguyên WebAudio khi đóng Board Game quay về Campus 3D.
 */
export function suspendBoardGameAudio(): void {
  stopAllBoardGameSounds();
  if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
    void sharedAudioCtx.suspend().catch(() => undefined);
  }
}

export interface BoardGameAudioDiagnostics {
  muted: boolean;
  contextState: AudioContextState | 'uninitialized';
  activeVoices: number;
  playedEventIdsCount: number;
  totalTriggeredCount: number;
  dedupedCount: number;
  coalescedCount: number;
  stopCount: number;
  lastTriggeredCategory: string | null;
}

export function getBoardGameAudioDiagnostics(): BoardGameAudioDiagnostics {
  return {
    muted: isBoardGameSoundMuted(),
    contextState: sharedAudioCtx ? sharedAudioCtx.state : 'uninitialized',
    activeVoices: activeSources.size,
    playedEventIdsCount: playedEventSet.size,
    totalTriggeredCount,
    dedupedCount,
    coalescedCount,
    stopCount,
    lastTriggeredCategory,
  };
}

export function resetBoardGameAudioForTests(): void {
  stopAllBoardGameSounds();
  playedEventOrder.length = 0;
  playedEventSet.clear();
  categoryLastPlayedMs.clear();
  totalTriggeredCount = 0;
  dedupedCount = 0;
  coalescedCount = 0;
  stopCount = 0;
  lastTriggeredCategory = null;
}

interface ToneLayer {
  freq: number;
  endFreq?: number;
  startOffsetSec: number;
  durationSec: number;
  type?: OscillatorType;
  gainPeak?: number;
  attackSec?: number;
  detuneCents?: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterEndFreq?: number;
}

interface NoiseLayer {
  bufferKey: keyof Omit<CachedPcmBuffers, 'ctx'>;
  startOffsetSec: number;
  durationSec: number;
  playbackRate?: number;
  gainPeak?: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterEndFreq?: number;
  filterQ?: number;
}

function playLayeredCue(
  tones: readonly ToneLayer[],
  noises: readonly NoiseLayer[] = [],
): void {
  const graph = ensureAudioGraph();
  if (!graph) return;
  const { ctx, bus, buffers } = graph;
  try {
    const baseTime = ctx.currentTime + 0.006;

    for (const n of noises) {
      const buf = buffers[n.bufferKey];
      if (!buf) continue;
      const start = baseTime + n.startOffsetSec;
      const stop = start + n.durationSec;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.setValueAtTime(n.playbackRate ?? 1, start);

      const filter = ctx.createBiquadFilter();
      filter.type = n.filterType ?? 'bandpass';
      filter.frequency.setValueAtTime(n.filterFreq ?? 1800, start);
      if (n.filterEndFreq !== undefined) {
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(40, n.filterEndFreq),
          stop,
        );
      }
      filter.Q.setValueAtTime(n.filterQ ?? 1.4, start);

      const gain = ctx.createGain();
      const peak = n.gainPeak ?? 0.06;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.015, n.durationSec * 0.2));
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(bus);

      trackSource(src);
      src.start(start);
      src.stop(stop + 0.015);
    }

    for (const note of tones) {
      const start = baseTime + note.startOffsetSec;
      const stop = start + note.durationSec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = note.type ?? 'sine';
      osc.frequency.setValueAtTime(note.freq, start);
      if (note.endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(35, note.endFreq), stop);
      }
      if (note.detuneCents !== undefined) {
        osc.detune.setValueAtTime(note.detuneCents, start);
      }

      const peak = note.gainPeak ?? 0.055;
      const attack = note.attackSec ?? Math.min(0.018, note.durationSec * 0.25);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + Math.max(0.002, attack));
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      if (note.filterType) {
        const filter = ctx.createBiquadFilter();
        filter.type = note.filterType;
        filter.frequency.setValueAtTime(note.filterFreq ?? 1800, start);
        if (note.filterEndFreq !== undefined) {
          filter.frequency.exponentialRampToValueAtTime(
            Math.max(40, note.filterEndFreq),
            stop,
          );
        }
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(bus);
      trackSource(osc);
      osc.start(start);
      osc.stop(stop + 0.015);
    }
  } catch {
    // Im lặng khi WebAudio bị chặn bởi autoplay policy
  }
}

/** Rút bài: ma sát giấy cán mờ + âm bội phân biệt bộ bài công khai */
export function playCardDraw(deck?: BoardGameDeckId): void {
  const baseTone = deck === 'event' ? 540 : deck === 'equipment' ? 620 : 480;
  playLayeredCue(
    [
      { freq: baseTone, endFreq: baseTone * 1.45, startOffsetSec: 0.02, durationSec: 0.085, type: 'triangle', gainPeak: 0.036 },
      { freq: baseTone * 1.6, startOffsetSec: 0.06, durationSec: 0.09, type: 'sine', gainPeak: 0.026 },
    ],
    [
      {
        bufferKey: 'paper',
        startOffsetSec: 0,
        durationSec: 0.13,
        playbackRate: 1.05,
        gainPeak: 0.075,
        filterType: 'bandpass',
        filterFreq: 1600,
        filterEndFreq: 3200,
        filterQ: 1.3,
      },
    ],
  );
}

/** Lật mặt trước lá bài */
export function playCardFlip(): void {
  playLayeredCue(
    [
      { freq: 680, endFreq: 1020, startOffsetSec: 0, durationSec: 0.07, type: 'sine', gainPeak: 0.038 },
    ],
    [
      {
        bufferKey: 'paper',
        startOffsetSec: 0,
        durationSec: 0.09,
        playbackRate: 1.35,
        gainPeak: 0.065,
        filterType: 'highpass',
        filterFreq: 2100,
      },
    ],
  );
}

/** Đánh / Trang bị / Đưa thẻ kín: tiếng vuốt bài + xác nhận từng bộ bài */
export function playCardPlay(deck?: BoardGameDeckId): void {
  const accentFreq = deck === 'event' ? 620 : deck === 'equipment' ? 760 : 540;
  playLayeredCue(
    [
      { freq: accentFreq, endFreq: accentFreq * 1.28, startOffsetSec: 0, durationSec: 0.08, type: 'triangle', gainPeak: 0.044 },
      { freq: accentFreq * 1.5, startOffsetSec: 0.04, durationSec: 0.11, type: 'sine', gainPeak: 0.03 },
    ],
    [
      {
        bufferKey: 'paper',
        startOffsetSec: 0,
        durationSec: 0.085,
        playbackRate: 1.25,
        gainPeak: 0.068,
        filterType: 'bandpass',
        filterFreq: 1950,
        filterEndFreq: 3400,
      },
    ],
  );
}

/** Tung xúc xắc 3D: cốc lắc ban đầu + các nhịp nảy giảm dần + hợp âm khóa kết quả lúc dừng */
export function playDiceRoll(
  freeChoice = false,
  isAttack = false,
  durationMs = 1400,
  settleAtMs?: number,
): void {
  const isFast = durationMs <= 360 || (typeof settleAtMs === 'number' && settleAtMs <= 0);
  if (isFast) {
    playLayeredCue(
      [
        {
          freq: isAttack ? 310 : 440,
          endFreq: isAttack ? 460 : 660,
          startOffsetSec: 0.06,
          durationSec: 0.11,
          type: 'triangle',
          gainPeak: 0.04,
        },
      ],
      [
        { bufferKey: 'diceClick', startOffsetSec: 0, durationSec: 0.042, playbackRate: 1.08, gainPeak: 0.08, filterType: 'bandpass', filterFreq: 1750 },
        { bufferKey: 'diceClick', startOffsetSec: 0.08, durationSec: 0.04, playbackRate: 1.2, gainPeak: 0.055, filterType: 'bandpass', filterFreq: 1950 },
      ],
    );
    return;
  }

  const rawSettleMs = typeof settleAtMs === 'number' ? settleAtMs : durationMs * 0.77;
  const settleSec = Math.max(0.72, Math.min(1.18, rawSettleMs / 1000));
  playLayeredCue(
    [
      // Nảy thầm mặt gỗ bàn chơi KTX theo nhịp va chạm
      { freq: 185, endFreq: 95, startOffsetSec: 0.21, durationSec: 0.045, type: 'triangle', gainPeak: 0.032 },
      { freq: 215, endFreq: 105, startOffsetSec: 0.42, durationSec: 0.042, type: 'triangle', gainPeak: 0.026 },
      { freq: 170, endFreq: 88, startOffsetSec: 0.61, durationSec: 0.038, type: 'triangle', gainPeak: 0.022 },
      // Hợp âm chốt kết quả đúng khoảnh khắc xúc xắc đứng yên (settled)
      {
        freq: isAttack ? 310 : 440,
        endFreq: isAttack ? 465 : 659.25,
        startOffsetSec: settleSec,
        durationSec: 0.14,
        type: 'triangle',
        gainPeak: 0.044,
      },
      ...(freeChoice
        ? [
            { freq: 587.33, startOffsetSec: settleSec + 0.04, durationSec: 0.16, type: 'sine' as const, gainPeak: 0.05 },
            { freq: 880, startOffsetSec: settleSec + 0.09, durationSec: 0.24, type: 'sine' as const, gainPeak: 0.054 },
          ]
        : []),
    ],
    [
      // Chuẩn bị lắc tay + ma sát mặt bài
      { bufferKey: 'paper', startOffsetSec: 0.01, durationSec: 0.09, playbackRate: 1.2, gainPeak: 0.04, filterType: 'bandpass', filterFreq: 1400 },
      // 5 nhịp va chạm tách bạch theo giai đoạn lăn & giảm tốc
      { bufferKey: 'diceClick', startOffsetSec: 0.19, durationSec: 0.044, playbackRate: 1.02, gainPeak: 0.09, filterType: 'bandpass', filterFreq: 1700 },
      { bufferKey: 'diceClick', startOffsetSec: 0.36, durationSec: 0.042, playbackRate: 1.24, gainPeak: 0.078, filterType: 'bandpass', filterFreq: 2150 },
      { bufferKey: 'diceClick', startOffsetSec: 0.52, durationSec: 0.04, playbackRate: 0.94, gainPeak: 0.064, filterType: 'bandpass', filterFreq: 1600 },
      { bufferKey: 'diceClick', startOffsetSec: 0.7, durationSec: 0.038, playbackRate: 1.15, gainPeak: 0.048, filterType: 'bandpass', filterFreq: 1950 },
      { bufferKey: 'diceClick', startOffsetSec: 0.88, durationSec: 0.036, playbackRate: 1.05, gainPeak: 0.034, filterType: 'bandpass', filterFreq: 1750 },
    ],
  );
}

/** Chạm nhẹ quân cờ đáp xuống ô địa điểm */
export function playPawnTouchdown(): void {
  playLayeredCue(
    [{ freq: 195, endFreq: 112, startOffsetSec: 0, durationSec: 0.075, type: 'sine', gainPeak: 0.034 }],
    [
      {
        bufferKey: 'diceClick',
        startOffsetSec: 0,
        durationSec: 0.038,
        playbackRate: 0.78,
        gainPeak: 0.042,
        filterType: 'lowpass',
        filterFreq: 1200,
      },
    ],
  );
}

/** Chém thường hoặc Masamune nguyền rủa */
export function playSlashHit(cursed = false): void {
  playLayeredCue(
    [
      {
        freq: cursed ? 740 : 660,
        endFreq: cursed ? 115 : 145,
        startOffsetSec: 0,
        durationSec: 0.11,
        type: 'sawtooth',
        gainPeak: 0.05,
        filterType: 'lowpass',
        filterFreq: 3200,
        filterEndFreq: 420,
      },
      { freq: cursed ? 148 : 190, endFreq: 52, startOffsetSec: 0.035, durationSec: 0.13, type: 'triangle', gainPeak: 0.068 },
      ...(cursed
        ? [{ freq: 295, endFreq: 210, startOffsetSec: 0.05, durationSec: 0.22, type: 'sine' as const, gainPeak: 0.04, detuneCents: -14 }]
        : []),
    ],
    [
      {
        bufferKey: 'blade',
        startOffsetSec: 0,
        durationSec: 0.15,
        playbackRate: cursed ? 0.95 : 1.15,
        gainPeak: 0.08,
        filterType: 'highpass',
        filterFreq: 1850,
      },
    ],
  );
}

/** Thương Ánh Sáng / Đâm xuyên */
export function playSpearThrust(): void {
  playLayeredCue(
    [
      { freq: 920, endFreq: 360, startOffsetSec: 0, durationSec: 0.11, type: 'triangle', gainPeak: 0.055 },
      { freq: 1480, startOffsetSec: 0.02, durationSec: 0.17, type: 'sine', gainPeak: 0.04 },
      { freq: 165, endFreq: 68, startOffsetSec: 0.03, durationSec: 0.12, type: 'triangle', gainPeak: 0.058 },
    ],
    [
      {
        bufferKey: 'blade',
        startOffsetSec: 0,
        durationSec: 0.14,
        playbackRate: 1.4,
        gainPeak: 0.075,
        filterType: 'bandpass',
        filterFreq: 2600,
      },
    ],
  );
}

/** Súng lục / Súng liên thanh đa lớp đạn + vỏ đồng */
export function playGunfireBurst(shots = 3): void {
  const count = Math.max(1, Math.min(4, shots));
  const tones: ToneLayer[] = [];
  const noises: NoiseLayer[] = [];
  for (let i = 0; i < count; i++) {
    const t = i * 0.072;
    noises.push({
      bufferKey: 'gunCrack',
      startOffsetSec: t,
      durationSec: 0.08,
      playbackRate: 0.96 + i * 0.08,
      gainPeak: 0.095,
      filterType: 'lowpass',
      filterFreq: 3800,
      filterEndFreq: 680,
    });
    tones.push(
      { freq: 210 + i * 16, endFreq: 62, startOffsetSec: t, durationSec: 0.068, type: 'square', gainPeak: 0.038, filterType: 'lowpass', filterFreq: 900 },
      { freq: 3900 + i * 240, startOffsetSec: t + 0.045, durationSec: 0.045, type: 'sine', gainPeak: 0.015 },
    );
  }
  playLayeredCue(tones, noises);
}

/** Tia sét cao áp Vy Radio */
export function playLightningStrike(): void {
  playLayeredCue(
    [
      { freq: 1560, endFreq: 240, startOffsetSec: 0, durationSec: 0.14, type: 'sawtooth', gainPeak: 0.048, filterType: 'bandpass', filterFreq: 2200, filterEndFreq: 480 },
      { freq: 920, endFreq: 145, startOffsetSec: 0.04, durationSec: 0.18, type: 'triangle', gainPeak: 0.052 },
      { freq: 96, endFreq: 38, startOffsetSec: 0.03, durationSec: 0.28, type: 'sine', gainPeak: 0.075 },
    ],
    [
      {
        bufferKey: 'arcCrackle',
        startOffsetSec: 0,
        durationSec: 0.26,
        playbackRate: 1.1,
        gainPeak: 0.09,
        filterType: 'bandpass',
        filterFreq: 2900,
        filterEndFreq: 700,
      },
    ],
  );
}

/** Phản kích tức thì (Parry metallic clang at 0ms -> Riposte energy whip + thud at 95ms) */
export function playCounterStrike(): void {
  playLayeredCue(
    [
      // Stage 1: Parry steel guard clang (0ms)
      { freq: 1140, endFreq: 880, startOffsetSec: 0, durationSec: 0.085, type: 'triangle', gainPeak: 0.062 },
      { freq: 1780, endFreq: 1420, startOffsetSec: 0.008, durationSec: 0.11, type: 'sine', gainPeak: 0.048 },
      // Stage 2: Riposte claw whip + chest thud (95ms)
      {
        freq: 620,
        endFreq: 145,
        startOffsetSec: 0.095,
        durationSec: 0.14,
        type: 'sawtooth',
        gainPeak: 0.056,
        filterType: 'lowpass',
        filterFreq: 2400,
        filterEndFreq: 420,
      },
      { freq: 165, endFreq: 55, startOffsetSec: 0.105, durationSec: 0.13, type: 'triangle', gainPeak: 0.068 },
    ],
    [
      {
        bufferKey: 'diceClick',
        startOffsetSec: 0,
        durationSec: 0.032,
        playbackRate: 1.55,
        gainPeak: 0.042,
        filterType: 'highpass',
        filterFreq: 2800,
      },
      {
        bufferKey: 'blade',
        startOffsetSec: 0.09,
        durationSec: 0.13,
        playbackRate: 1.28,
        gainPeak: 0.072,
        filterType: 'bandpass',
        filterFreq: 2600,
        filterEndFreq: 800,
      },
    ],
  );
}

/** Vụ nổ / Đột kích gây sát thương diện rộng */
export function playExplosionImpact(): void {
  playLayeredCue(
    [
      { freq: 145, endFreq: 38, startOffsetSec: 0, durationSec: 0.28, type: 'sawtooth', gainPeak: 0.068, filterType: 'lowpass', filterFreq: 480, filterEndFreq: 90 },
      { freq: 92, endFreq: 36, startOffsetSec: 0.025, durationSec: 0.3, type: 'triangle', gainPeak: 0.072 },
    ],
    [
      {
        bufferKey: 'arcCrackle',
        startOffsetSec: 0,
        durationSec: 0.28,
        playbackRate: 0.72,
        gainPeak: 0.1,
        filterType: 'lowpass',
        filterFreq: 1400,
        filterEndFreq: 220,
      },
    ],
  );
}

/** Lá Chắn Thiên Thần BLOCK */
export function playBlockClang(): void {
  playLayeredCue([
    { freq: 740, endFreq: 560, startOffsetSec: 0, durationSec: 0.095, type: 'triangle', gainPeak: 0.055 },
    { freq: 1180, startOffsetSec: 0.02, durationSec: 0.16, type: 'sine', gainPeak: 0.045 },
    { freq: 1760, startOffsetSec: 0.035, durationSec: 0.14, type: 'sine', gainPeak: 0.024 },
  ]);
}

/** Hồi máu / Khế ước ánh sáng */
export function playHealShimmer(): void {
  playLayeredCue([
    { freq: 523.25, startOffsetSec: 0, durationSec: 0.11, type: 'sine', gainPeak: 0.04 },
    { freq: 659.25, startOffsetSec: 0.055, durationSec: 0.13, type: 'sine', gainPeak: 0.045 },
    { freq: 783.99, startOffsetSec: 0.11, durationSec: 0.18, type: 'sine', gainPeak: 0.05 },
    { freq: 1046.5, startOffsetSec: 0.16, durationSec: 0.22, type: 'triangle', gainPeak: 0.032 },
  ]);
}

/** Cướp trang bị */
export function playStealSnatch(): void {
  playLayeredCue(
    [
      { freq: 380, endFreq: 860, startOffsetSec: 0, durationSec: 0.12, type: 'triangle', gainPeak: 0.045 },
      { freq: 920, endFreq: 680, startOffsetSec: 0.09, durationSec: 0.09, type: 'sine', gainPeak: 0.04 },
    ],
    [
      {
        bufferKey: 'paper',
        startOffsetSec: 0,
        durationSec: 0.09,
        playbackRate: 1.45,
        gainPeak: 0.05,
        filterType: 'highpass',
        filterFreq: 1900,
      },
    ],
  );
}

/** Lộ diện nhân vật (1.48s 5-pha) — anticipation, lật thẻ 3D, lộ phe & impact theo phe công khai */
export function playRoleReveal(faction?: BoardGameFactionId | null): void {
  const isMist = faction === 'mist-order';
  const isWanderer = faction === 'wanderer';
  const root = isMist ? 261.63 : isWanderer ? 349.23 : 329.63;
  const third = isMist ? root * 1.1892 : isWanderer ? root * 1.1225 : root * 1.2599;
  const fifth = isMist ? root * 1.4142 : root * 1.4983;
  const peakNote = isMist ? root * 1.8877 : root * 2;

  playLayeredCue(
    [
      // 1) Anticipation (0..260ms): rung tụ năng lượng trước khi lật bài
      {
        freq: isMist ? 130 : 185,
        endFreq: root,
        startOffsetSec: 0,
        durationSec: 0.26,
        type: 'triangle',
        gainPeak: 0.038,
      },
      // 2) Card Flip -> Faction Reveal chord (0.42s..0.85s)
      {
        freq: root,
        startOffsetSec: 0.42,
        durationSec: 0.2,
        type: isMist ? 'sawtooth' : 'triangle',
        gainPeak: 0.052,
        filterType: 'lowpass',
        filterFreq: isMist ? 1600 : 2800,
      },
      { freq: third, startOffsetSec: 0.5, durationSec: 0.24, type: 'triangle', gainPeak: 0.058 },
      { freq: fifth, startOffsetSec: 0.62, durationSec: 0.3, type: 'sine', gainPeak: 0.064 },
      // 3) Impact climax (~0.70s..1.05s)
      { freq: peakNote, startOffsetSec: 0.72, durationSec: 0.36, type: 'sine', gainPeak: 0.048 },
      ...(isMist
        ? [{ freq: 92, endFreq: 52, startOffsetSec: 0.68, durationSec: 0.38, type: 'sine' as const, gainPeak: 0.058 }]
        : []),
    ],
    [
      {
        bufferKey: 'paper',
        startOffsetSec: 0.26,
        durationSec: 0.12,
        playbackRate: 1.28,
        gainPeak: 0.072,
        filterType: 'highpass',
        filterFreq: 1950,
      },
      {
        bufferKey: isMist ? 'blade' : 'arcCrackle',
        startOffsetSec: 0.68,
        durationSec: 0.18,
        playbackRate: isMist ? 0.92 : 1.15,
        gainPeak: 0.048,
        filterType: 'bandpass',
        filterFreq: isMist ? 1400 : 2600,
      },
    ],
  );
}

export function playTrackAdvance(): void {
  playLayeredCue([
    { freq: 523.25, startOffsetSec: 0, durationSec: 0.09, type: 'sine', gainPeak: 0.046 },
    { freq: 659.25, startOffsetSec: 0.065, durationSec: 0.12, type: 'sine', gainPeak: 0.05 },
  ]);
}

export function playTurnAlert(): void {
  playLayeredCue([
    { freq: 587.33, startOffsetSec: 0, durationSec: 0.085, type: 'sine', gainPeak: 0.05 },
    { freq: 880, startOffsetSec: 0.085, durationSec: 0.16, type: 'sine', gainPeak: 0.052 },
  ]);
}

export function playEliminationBell(): void {
  playLayeredCue([
    { freq: 220, endFreq: 146.83, startOffsetSec: 0, durationSec: 0.24, type: 'triangle', gainPeak: 0.065 },
    { freq: 110, endFreq: 82.41, startOffsetSec: 0.06, durationSec: 0.34, type: 'sine', gainPeak: 0.068 },
    { freq: 440, startOffsetSec: 0.01, durationSec: 0.2, type: 'sine', gainPeak: 0.03 },
  ]);
}

export function playEmotePop(): void {
  playLayeredCue([
    { freq: 480, endFreq: 760, startOffsetSec: 0, durationSec: 0.08, type: 'sine', gainPeak: 0.038 },
  ]);
}

export function playSignatureSkillCue(roleId?: BoardGameRoleId | null): void {
  const isLightning = roleId === 'gac-radio' || roleId === 'gac-ky-thuat';
  const isShadow = roleId === 'suong-an-danh' || roleId === 'suong-tin-gia';
  const base = isLightning ? 340 : isShadow ? 220 : 415;
  playLayeredCue(
    [
      { freq: base, endFreq: base * 1.48, startOffsetSec: 0, durationSec: 0.14, type: 'triangle', gainPeak: 0.05 },
      { freq: base * 1.5, endFreq: base * 2.05, startOffsetSec: 0.07, durationSec: 0.18, type: 'sine', gainPeak: 0.048 },
    ],
    [
      {
        bufferKey: isLightning ? 'arcCrackle' : 'blade',
        startOffsetSec: 0.02,
        durationSec: 0.16,
        playbackRate: isShadow ? 0.85 : 1.15,
        gainPeak: 0.056,
        filterType: 'bandpass',
        filterFreq: isShadow ? 1300 : 2300,
      },
    ],
  );
}

export function playVictoryFanfare(faction?: BoardGameFactionId | null): void {
  const isMist = faction === 'mist-order';
  const isWanderer = faction === 'wanderer';
  const notes = isMist
    ? [293.66, 349.23, 440, 587.33, 880] // D-minor triumphant climax
    : isWanderer
      ? [329.63, 440, 493.88, 659.25, 987.77] // E/A bright sus hero fanfare
      : [261.63, 523.25, 659.25, 783.99, 1046.5]; // Warm major victory chord

  playLayeredCue(
    [
      // Stage 1: Anticipation warm swell (0.00s..0.38s)
      { freq: notes[0] * 0.5, endFreq: notes[0], startOffsetSec: 0, durationSec: 0.42, type: 'sine', gainPeak: 0.044 },
      // Stage 2: Faction crest arpeggio (0.36s..0.78s)
      { freq: notes[1], startOffsetSec: 0.36, durationSec: 0.18, type: 'triangle', gainPeak: 0.052 },
      { freq: notes[2], startOffsetSec: 0.5, durationSec: 0.18, type: 'triangle', gainPeak: 0.056 },
      { freq: notes[3], startOffsetSec: 0.64, durationSec: 0.24, type: 'triangle', gainPeak: 0.06 },
      // Stage 3: Victory impact resonant chord (0.88s..1.48s)
      { freq: notes[0], startOffsetSec: 0.88, durationSec: 0.62, type: 'triangle', gainPeak: 0.048 },
      { freq: notes[4], startOffsetSec: 0.88, durationSec: 0.58, type: 'sine', gainPeak: 0.066 },
      { freq: notes[4] * 1.25, startOffsetSec: 0.92, durationSec: 0.52, type: 'sine', gainPeak: 0.036 },
    ],
    [
      {
        bufferKey: 'arcCrackle',
        startOffsetSec: 0.86,
        durationSec: 0.42,
        playbackRate: isMist ? 0.92 : isWanderer ? 1.15 : 1.05,
        gainPeak: 0.032,
        filterType: 'bandpass',
        filterFreq: isMist ? 1800 : 2800,
      },
    ],
  );
}

export function playDefeatToll(faction?: BoardGameFactionId | null): void {
  const root = faction === 'mist-order' ? 146.83 : faction === 'wanderer' ? 164.81 : 130.81;
  playLayeredCue(
    [
      // Stage 1: Low somber sub pulse (0.00s..0.40s)
      { freq: root, endFreq: root * 0.75, startOffsetSec: 0, durationSec: 0.44, type: 'sine', gainPeak: 0.056 },
      // Stage 2: Descending minor motif (0.36s..0.85s)
      { freq: root * 2.4, endFreq: root * 2.0, startOffsetSec: 0.36, durationSec: 0.26, type: 'triangle', gainPeak: 0.044 },
      { freq: root * 1.8, endFreq: root * 1.5, startOffsetSec: 0.58, durationSec: 0.32, type: 'triangle', gainPeak: 0.048 },
      // Stage 3: Deep midnight bell toll (0.86s..1.52s)
      { freq: root, endFreq: root * 0.88, startOffsetSec: 0.86, durationSec: 0.66, type: 'sine', gainPeak: 0.06 },
      { freq: root * 1.5, endFreq: root * 1.42, startOffsetSec: 0.88, durationSec: 0.56, type: 'triangle', gainPeak: 0.034 },
    ],
    [
      {
        bufferKey: 'blade',
        startOffsetSec: 0.84,
        durationSec: 0.36,
        playbackRate: 0.55,
        gainPeak: 0.036,
        filterType: 'lowpass',
        filterFreq: 620,
      },
    ],
  );
}

export function playSpectatorFinale(faction?: BoardGameFactionId | null): void {
  const base = faction === 'mist-order' ? 293.66 : faction === 'wanderer' ? 329.63 : 261.63;
  playLayeredCue([
    { freq: base, startOffsetSec: 0, durationSec: 0.38, type: 'sine', gainPeak: 0.04 },
    { freq: base * 1.5, startOffsetSec: 0.38, durationSec: 0.28, type: 'triangle', gainPeak: 0.048 },
    { freq: base * 2, startOffsetSec: 0.72, durationSec: 0.56, type: 'sine', gainPeak: 0.054 },
    { freq: base * 3, startOffsetSec: 0.86, durationSec: 0.46, type: 'sine', gainPeak: 0.03 },
  ]);
}

export function playCutInWhoosh(): void {
  playLayeredCue(
    [
      { freq: 230, endFreq: 660, startOffsetSec: 0, durationSec: 0.15, type: 'triangle', gainPeak: 0.048 },
      { freq: 660, endFreq: 920, startOffsetSec: 0.08, durationSec: 0.16, type: 'sine', gainPeak: 0.044 },
    ],
    [
      {
        bufferKey: 'blade',
        startOffsetSec: 0,
        durationSec: 0.17,
        playbackRate: 0.9,
        gainPeak: 0.055,
        filterType: 'bandpass',
        filterFreq: 900,
        filterEndFreq: 2400,
      },
    ],
  );
}

function recordEventId(id: string): boolean {
  if (playedEventSet.has(id)) return false;
  playedEventSet.add(id);
  playedEventOrder.push(id);
  if (playedEventOrder.length > MAX_PLAYED_EVENT_IDS) {
    const oldest = playedEventOrder.shift();
    if (oldest) playedEventSet.delete(oldest);
  }
  return true;
}

function resolveCategoryForVisualEvent(event: BoardGameVisualEvent): {
  category: string;
  cooldownMs: number;
} | null {
  switch (event.kind) {
    case 'DICE_ROLL':
      return { category: 'dice', cooldownMs: 80 };
    case 'CARD_DRAW':
      return { category: 'card-draw', cooldownMs: 80 };
    case 'COMBAT_VFX':
      return {
        category: `combat:${event.effect.toLowerCase()}`,
        cooldownMs: DEFAULT_CATEGORY_COOLDOWN_MS,
      };
    case 'CINEMATIC_CUTIN':
      return {
        category: `cutin:${event.bannerType.toLowerCase()}`,
        cooldownMs: 90,
      };
    case 'FLOATING_TEXT':
      // Số nhảy sát thương/hồi máu dùng âm thanh của COMBAT_VFX tương ứng, không kêu trùng
      return null;
  }
}

/**
 * Phát âm thanh đồng bộ từ một `BoardGameVisualEvent` thuộc Visual Event Queue.
 * - Khử trùng lặp tuyệt đối theo `event.id` (ngăn phát lại khi F5 reconnect / sync lại).
 * - Gộp theo cooldown từng nhóm cue khi nhiều mục tiêu trúng chiêu cùng mili-giây.
 * Trả về `true` nếu event kích hoạt lớp âm thanh mới, `false` nếu bị mute/trùng/gộp.
 */
export function playSoundForVisualEvent(
  event: BoardGameVisualEvent,
  nowMs: number = Date.now(),
): boolean {
  if (isBoardGameSoundMuted()) return false;

  const meta = resolveCategoryForVisualEvent(event);
  if (!meta) return false;

  if (!recordEventId(event.id)) {
    dedupedCount += 1;
    return false;
  }

  const lastAt = categoryLastPlayedMs.get(meta.category);
  if (lastAt !== undefined && nowMs - lastAt < meta.cooldownMs) {
    coalescedCount += 1;
    return false;
  }
  categoryLastPlayedMs.set(meta.category, nowMs);

  totalTriggeredCount += 1;
  lastTriggeredCategory = meta.category;

  switch (event.kind) {
    case 'DICE_ROLL':
      playDiceRoll(
        event.freeChoice,
        event.diceKind === 'attack',
        event.durationMs,
        event.settleAtMs,
      );
      return true;

    case 'CARD_DRAW':
      playCardDraw(event.deck);
      return true;

    case 'COMBAT_VFX': {
      switch (event.effect) {
        case 'LIGHTNING_STRIKE':
          playLightningStrike();
          return true;
        case 'MACHINE_GUN_BARRAGE':
          playGunfireBurst(3);
          return true;
        case 'HANDGUN_SHOT':
          playGunfireBurst(1);
          return true;
        case 'EXPLOSION':
          playExplosionImpact();
          return true;
        case 'COUNTER_STRIKE':
          playCounterStrike();
          return true;
        case 'SHIELD_GUARD':
          playBlockClang();
          return true;
        case 'HEAL_AURA':
          playHealShimmer();
          return true;
        case 'STEAL_TETHER':
          playStealSnatch();
          return true;
        case 'SPEAR_THRUST':
          playSpearThrust();
          return true;
        case 'MASAMUNE_SLASH':
          playSlashHit(true);
          return true;
        case 'SLASH':
        default:
          playSlashHit(false);
          return true;
      }
    }

    case 'CINEMATIC_CUTIN': {
      switch (event.bannerType) {
        case 'YOUR_TURN':
          playTurnAlert();
          return true;
        case 'ROLE_REVEAL':
          playRoleReveal(event.faction);
          return true;
        case 'VICTORY':
          if (event.matchOutcome === 'defeat') {
            playDefeatToll(event.faction);
          } else if (event.matchOutcome === 'spectator') {
            playSpectatorFinale(event.faction);
          } else {
            playVictoryFanfare(event.faction);
          }
          return true;
        case 'ULTIMATE_SKILL':
          playSignatureSkillCue(event.roleId);
          return true;
        case 'ELIMINATION':
          playEliminationBell();
          return true;
        case 'ULTIMATE_SKILL':
        default:
          playCutInWhoosh();
          return true;
      }
    }
    default:
      return false;
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as { __hustBgAudioDiag?: typeof getBoardGameAudioDiagnostics }).__hustBgAudioDiag =
    getBoardGameAudioDiagnostics;
}
