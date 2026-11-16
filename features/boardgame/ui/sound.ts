'use client';

/**
 * Hiệu ứng âm thanh WebAudio thủ tục cho Bóng Đêm KTX (không cần file audio ngoài).
 * An toàn tuyệt đối trong SSR / môi trường thiếu AudioContext / headless Chromium.
 */

const SOUND_MUTED_STORAGE_KEY = 'hustverse:bg-sound-muted:v1';

let sharedAudioCtx: AudioContext | null = null;
let cachedMuted: boolean | null = null;

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
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || isBoardGameSoundMuted()) {
    return null;
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => undefined);
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

interface ToneNote {
  freq: number;
  startOffsetSec: number;
  durationSec: number;
  type?: OscillatorType;
  gainPeak?: number;
  endFreq?: number;
}

function playNotes(notes: readonly ToneNote[]): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const baseTime = ctx.currentTime + 0.005;
    for (const note of notes) {
      const start = baseTime + note.startOffsetSec;
      const stop = start + note.durationSec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type ?? 'sine';
      osc.frequency.setValueAtTime(note.freq, start);
      if (note.endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, note.endFreq), stop);
      }

      const peak = note.gainPeak ?? 0.06;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.02, note.durationSec * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(stop + 0.01);
    }
  } catch {
    // Im lặng khi WebAudio bị chặn bởi autoplay policy
  }
}

export function playCardDraw(): void {
  playNotes([
    { freq: 420, endFreq: 680, startOffsetSec: 0, durationSec: 0.075, type: 'triangle', gainPeak: 0.045 },
    { freq: 760, startOffsetSec: 0.05, durationSec: 0.08, type: 'sine', gainPeak: 0.035 },
  ]);
}

export function playRoleReveal(): void {
  playNotes([
    { freq: 330, startOffsetSec: 0, durationSec: 0.14, type: 'triangle', gainPeak: 0.05 },
    { freq: 440, startOffsetSec: 0.09, durationSec: 0.16, type: 'triangle', gainPeak: 0.055 },
    { freq: 660, startOffsetSec: 0.18, durationSec: 0.26, type: 'sine', gainPeak: 0.06 },
  ]);
}

export function playTrackAdvance(): void {
  playNotes([
    { freq: 523.25, startOffsetSec: 0, durationSec: 0.09, type: 'sine', gainPeak: 0.05 },
    { freq: 659.25, startOffsetSec: 0.07, durationSec: 0.13, type: 'sine', gainPeak: 0.055 },
  ]);
}

export function playTurnAlert(): void {
  playNotes([
    { freq: 587.33, startOffsetSec: 0, durationSec: 0.08, type: 'sine', gainPeak: 0.05 },
    { freq: 880, startOffsetSec: 0.09, durationSec: 0.14, type: 'sine', gainPeak: 0.05 },
  ]);
}

export function playEmotePop(): void {
  playNotes([
    { freq: 480, endFreq: 740, startOffsetSec: 0, durationSec: 0.08, type: 'sine', gainPeak: 0.04 },
  ]);
}

export function playVictoryFanfare(): void {
  playNotes([
    { freq: 523.25, startOffsetSec: 0, durationSec: 0.14, type: 'triangle', gainPeak: 0.055 },
    { freq: 659.25, startOffsetSec: 0.11, durationSec: 0.14, type: 'triangle', gainPeak: 0.055 },
    { freq: 783.99, startOffsetSec: 0.22, durationSec: 0.16, type: 'triangle', gainPeak: 0.06 },
    { freq: 1046.5, startOffsetSec: 0.34, durationSec: 0.36, type: 'sine', gainPeak: 0.065 },
  ]);
}

export function playSlashHit(): void {
  playNotes([
    { freq: 640, endFreq: 130, startOffsetSec: 0, durationSec: 0.095, type: 'sawtooth', gainPeak: 0.05 },
    { freq: 180, endFreq: 72, startOffsetSec: 0.03, durationSec: 0.11, type: 'triangle', gainPeak: 0.06 },
  ]);
}

export function playGunfireBurst(): void {
  playNotes([
    { freq: 380, endFreq: 95, startOffsetSec: 0, durationSec: 0.06, type: 'square', gainPeak: 0.045 },
    { freq: 410, endFreq: 90, startOffsetSec: 0.07, durationSec: 0.06, type: 'square', gainPeak: 0.045 },
    { freq: 440, endFreq: 85, startOffsetSec: 0.14, durationSec: 0.075, type: 'sawtooth', gainPeak: 0.05 },
  ]);
}

export function playLightningStrike(): void {
  playNotes([
    { freq: 1320, endFreq: 260, startOffsetSec: 0, durationSec: 0.12, type: 'sawtooth', gainPeak: 0.045 },
    { freq: 880, endFreq: 140, startOffsetSec: 0.05, durationSec: 0.18, type: 'triangle', gainPeak: 0.055 },
  ]);
}

export function playExplosionImpact(): void {
  playNotes([
    { freq: 170, endFreq: 42, startOffsetSec: 0, durationSec: 0.24, type: 'sawtooth', gainPeak: 0.07 },
    { freq: 115, endFreq: 38, startOffsetSec: 0.04, durationSec: 0.26, type: 'triangle', gainPeak: 0.065 },
  ]);
}

export function playBlockClang(): void {
  playNotes([
    { freq: 720, endFreq: 540, startOffsetSec: 0, durationSec: 0.09, type: 'triangle', gainPeak: 0.05 },
    { freq: 1080, startOffsetSec: 0.03, durationSec: 0.14, type: 'sine', gainPeak: 0.04 },
  ]);
}

export function playHealShimmer(): void {
  playNotes([
    { freq: 523.25, startOffsetSec: 0, durationSec: 0.1, type: 'sine', gainPeak: 0.04 },
    { freq: 659.25, startOffsetSec: 0.06, durationSec: 0.12, type: 'sine', gainPeak: 0.045 },
    { freq: 783.99, startOffsetSec: 0.12, durationSec: 0.18, type: 'sine', gainPeak: 0.05 },
  ]);
}

export function playCutInWhoosh(): void {
  playNotes([
    { freq: 240, endFreq: 620, startOffsetSec: 0, durationSec: 0.14, type: 'triangle', gainPeak: 0.05 },
    { freq: 620, endFreq: 880, startOffsetSec: 0.08, durationSec: 0.16, type: 'sine', gainPeak: 0.05 },
  ]);
}
