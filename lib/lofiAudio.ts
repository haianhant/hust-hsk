// ---------------------------------------------------------------------------
// lib/lofiAudio.ts — Bộ tổng hợp âm nhạc Lofi Chill Học Tập (Web Audio API)
// Thuần thủ tục (Zero external audio assets - ADR-0002):
//   - Vòng hợp âm Jazz/Lofi 72 BPM ấm áp (Fmaj9 -> Em7 -> Dm9 -> Cmaj7/A7b9)
//   - Tiếng đàn Rhodes Electric Piano qua bộ lọc Low-pass ấm + hiệu ứng Chorus/Tape Wow
//   - Giai điệu Pentatonic nhẹ nhàng có tiếng vang Delay/Echo
//   - Nhịp trống Boom-Bap Lofi (Kick trầm ấm, Snare dịu, Hi-hat lắc nhẹ) + Sub-Bass
//   - Tiếng đĩa than Vinyl Crackle rất nhẹ tạo không gian học tập thư giãn tại Thư viện TQB
// ---------------------------------------------------------------------------

export interface LofiAudioSnapshot {
  playing: boolean;
  volume: number;
  presetName: string;
}

type LofiListener = (snap: LofiAudioSnapshot) => void;

interface ChordStep {
  rootHz: number;
  notesHz: number[];
  melodyPoolHz: number[];
}

// Vòng hợp âm Lofi Study kinh điển: Fmaj9 — Em7 — Dm9 — Cmaj7
const LOFI_CHORDS: readonly ChordStep[] = [
  {
    // Fmaj9: F2 root, F3 - A3 - C4 - E4 - G4
    rootHz: 87.31,
    notesHz: [174.61, 220.0, 261.63, 329.63, 392.0],
    melodyPoolHz: [440.0, 523.25, 587.33, 659.25, 783.99],
  },
  {
    // Em7: E2 root, E3 - G3 - B3 - D4 - G4
    rootHz: 82.41,
    notesHz: [164.81, 196.0, 246.94, 293.66, 392.0],
    melodyPoolHz: [392.0, 493.88, 587.33, 659.25, 783.99],
  },
  {
    // Dm9: D2 root, D3 - F3 - A3 - C4 - E4
    rootHz: 73.42,
    notesHz: [146.83, 174.61, 220.0, 261.63, 329.63],
    melodyPoolHz: [440.0, 523.25, 587.33, 659.25, 880.0],
  },
  {
    // Cmaj9 -> A7: C2 root, C3 - E3 - G3 - B3 - D4
    rootHz: 65.41,
    notesHz: [130.81, 164.81, 196.0, 246.94, 293.66],
    melodyPoolHz: [392.0, 440.0, 523.25, 659.25, 783.99],
  },
];

class LofiChillEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private vinylNode: AudioNode | null = null;
  private vinylGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private playing = false;
  private volume = 0.55;
  private stepIndex = 0; // 16 steps (16th notes) per bar, 64 steps per 4-bar loop
  private listeners = new Set<LofiListener>();
  private rngSeed = 20261110;

  private nextRand(): number {
    this.rngSeed = (this.rngSeed * 1664525 + 1013904223) >>> 0;
    return this.rngSeed / 0xffffffff;
  }

  public getSnapshot(): LofiAudioSnapshot {
    return {
      playing: this.playing,
      volume: this.volume,
      presetName: 'Tạ Quang Bửu Lofi Chill · 72 BPM',
    };
  }

  public subscribe(listener: LofiListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx || this.ctx.state === 'closed') {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;

      // Bộ lọc tổng ấm áp kiểu băng cassette Lofi
      const warmFilter = this.ctx.createBiquadFilter();
      warmFilter.type = 'lowpass';
      warmFilter.frequency.value = 1850;
      warmFilter.Q.value = 0.6;

      this.masterGain.connect(warmFilter);
      warmFilter.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = (this.nextRand() * 2 - 1) * 0.5;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 0.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.18) * 0.25;
      // Thêm tiếng nổ lách tách rất nhỏ của đĩa than (vinyl crackle)
      if (this.nextRand() < 0.0012) {
        data[i] += (this.nextRand() * 2 - 1) * 0.35;
      }
    }
    return buffer;
  }

  private startVinylBed(ctx: AudioContext): void {
    if (!this.noiseBuffer || !this.masterGain) return;
    this.stopVinylBed();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0.045;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    this.vinylNode = src;
    this.vinylGain = gain;
  }

  private stopVinylBed(): void {
    if (this.vinylNode) {
      try {
        (this.vinylNode as AudioBufferSourceNode).stop();
        this.vinylNode.disconnect();
      } catch {
        // ignore
      }
      this.vinylNode = null;
    }
    if (this.vinylGain) {
      try {
        this.vinylGain.disconnect();
      } catch {
        // ignore
      }
      this.vinylGain = null;
    }
  }

  private playRhodesChord(ctx: AudioContext, chord: ChordStep, durationSec: number): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    const chordFilter = ctx.createBiquadFilter();
    chordFilter.type = 'lowpass';
    chordFilter.frequency.setValueAtTime(920, now);
    chordFilter.frequency.exponentialRampToValueAtTime(540, now + durationSec * 0.9);
    chordFilter.connect(this.masterGain);

    chord.notesHz.forEach((freq, idx) => {
      const startOffset = idx * 0.028; // Rải hợp âm nhẹ (strum)
      const t0 = now + startOffset;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, t0);
      osc2.frequency.setValueAtTime(freq * 2, t0); // Overtone ấm của Rhodes
      osc1.detune.setValueAtTime((idx % 2 === 0 ? 1 : -1) * 4.5, t0);

      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      const noteGain = 0.052 / Math.sqrt(chord.notesHz.length);

      g1.gain.setValueAtTime(0.0001, t0);
      g1.gain.linearRampToValueAtTime(noteGain, t0 + 0.045);
      g1.gain.exponentialRampToValueAtTime(noteGain * 0.42, t0 + durationSec * 0.65);
      g1.gain.exponentialRampToValueAtTime(0.0005, t0 + durationSec);

      g2.gain.setValueAtTime(0.0001, t0);
      g2.gain.linearRampToValueAtTime(noteGain * 0.25, t0 + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0002, t0 + 0.45);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(chordFilter);
      g2.connect(chordFilter);

      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + durationSec + 0.05);
      osc2.stop(t0 + 0.5);
    });
  }

  private playSubBass(ctx: AudioContext, freq: number, durationSec: number): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.04, now + durationSec * 0.75);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + durationSec + 0.04);
  }

  private playMelodyPluck(ctx: AudioContext, freq: number): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1350, now);
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.55);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  private playKick(ctx: AudioContext, soft = false): void {
    if (!this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(112, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);

    const amp = soft ? 0.12 : 0.19;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(amp, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  private playSnare(ctx: AudioContext): void {
    if (!this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // Tiếng snare lofi dịu (noise qua bandpass + thân gỗ ngắn)
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.Q.setValueAtTime(0.9, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.linearRampToValueAtTime(0.075, now + 0.005);
    nGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now, (this.stepIndex * 0.13) % 1.5, 0.16);

    const body = ctx.createOscillator();
    const bGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(185, now);
    body.frequency.exponentialRampToValueAtTime(110, now + 0.06);
    bGain.gain.setValueAtTime(0.045, now);
    bGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.08);
    body.connect(bGain);
    bGain.connect(this.masterGain);
    body.start(now);
    body.stop(now + 0.09);
  }

  private playHiHat(ctx: AudioContext, accent = false): void {
    if (!this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4200, now);

    const gain = ctx.createGain();
    const peak = accent ? 0.032 : 0.018;
    gain.gain.setValueAtTime(0.0005, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, (this.stepIndex * 0.07) % 1.7, 0.055);
  }

  private tickStep(): void {
    if (!this.playing) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // 72 BPM -> 1 bar (4 beats) = 3.333s, 1 step (16th note) ≈ 208ms
    const barIdx = Math.floor(this.stepIndex / 16) % LOFI_CHORDS.length;
    const stepInBar = this.stepIndex % 16;
    const chord = LOFI_CHORDS[barIdx];

    // 1. Hợp âm Rhodes ở đầu mỗi ô nhịp (step 0) và nhấn nhẹ ở phách 3+ (step 10)
    if (stepInBar === 0) {
      this.playRhodesChord(ctx, chord, 3.25);
      this.playSubBass(ctx, chord.rootHz, 1.9);
    } else if (stepInBar === 10) {
      this.playSubBass(ctx, chord.rootHz * 1.5, 1.1);
    }

    // 2. Nhịp trống Boom-Bap Lofi (Kick ở 0, 7, 10; Snare ở 4, 12; Hi-hat ở các phách chẵn + đảo phách)
    if (stepInBar === 0 || stepInBar === 10) {
      this.playKick(ctx, false);
    } else if (stepInBar === 7 && this.nextRand() > 0.35) {
      this.playKick(ctx, true);
    }

    if (stepInBar === 4 || stepInBar === 12) {
      this.playSnare(ctx);
    }

    if (stepInBar % 2 === 0) {
      this.playHiHat(ctx, stepInBar % 4 === 2);
    } else if (stepInBar === 15 && this.nextRand() > 0.45) {
      this.playHiHat(ctx, false);
    }

    // 3. Giai điệu Pentatonic ngẫu hứng dịu nhẹ
    if (
      (stepInBar === 2 || stepInBar === 6 || stepInBar === 11 || stepInBar === 14) &&
      this.nextRand() > 0.42
    ) {
      const pool = chord.melodyPoolHz;
      const noteHz = pool[Math.floor(this.nextRand() * pool.length)];
      this.playMelodyPluck(ctx, noteHz);
    }

    this.stepIndex = (this.stepIndex + 1) % (16 * LOFI_CHORDS.length);
  }

  public start(): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (this.playing) return true;
    this.playing = true;
    this.stepIndex = 0;
    this.startVinylBed(ctx);
    this.tickStep();
    // 72 BPM -> 1/16 note = (60 / 72 / 4) * 1000 = 208.33 ms
    this.timerId = setInterval(() => this.tickStep(), 208);
    this.emit();
    return true;
  }

  public stop(): void {
    if (!this.playing && !this.timerId) return;
    this.playing = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.stopVinylBed();
    this.emit();
  }

  public toggle(): boolean {
    if (this.playing) {
      this.stop();
      return false;
    }
    return this.start();
  }

  public setVolume(nextVol: number): void {
    this.volume = Math.max(0, Math.min(1, nextVol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.emit();
  }
}

export const lofiAudio = new LofiChillEngine();
