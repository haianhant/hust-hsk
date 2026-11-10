// ---------------------------------------------------------------------------
// lib/lofiAudio.ts — Bộ tổng hợp âm nhạc Lofi Chill & Piano Ambient Học Tập
// Thuần thủ tục (Web Audio API — Zero external audio assets, ADR-0002)
//
// Kiến trúc chống rè & chống ngắt quãng (Zero-Distortion & Zero-Dropouts):
//   1. Hardware-Clock Lookahead Scheduler: Lập lịch nốt nhạc trước 0.45 giây
//      trực tiếp trên xung nhịp phần cứng `AudioContext.currentTime` (chu kỳ
//      quét 50ms). Dù luồng 3D WebGL có tải nặng hay khựng khung hình, âm nhạc
//      vẫn phát mượt mà tuyệt đối, không bao giờ bị ngắt quãng.
//   2. Loại bỏ hoàn toàn nhiễu trắng (white-noise vinyl/snare) gây tiếng rè
//      trên loa laptop; sử dụng chuỗi xử lý âm thanh cố định gồm:
//      Warm Lowpass Filter -> Stereo Ping-Pong Delay + Velvet Hall Convolver
//      Reverb -> Soft Limiter (DynamicsCompressorNode) -> Master Gain.
//   3. Hòa âm 8 ô nhịp liên tục (Overlapping Warm Pad + Felt Piano Arpeggio +
//      Deep Sine Sub-Bass + Ghibli Celesta Melody) với trường âm nối liền nhau
//      không có khoảng lặng.
// ---------------------------------------------------------------------------

export interface LofiAudioSnapshot {
  playing: boolean;
  volume: number;
  presetName: string;
}

type LofiListener = (snap: LofiAudioSnapshot) => void;

interface ChillChord {
  name: string;
  rootHz: number;
  fifthHz: number;
  padHz: readonly number[];
  arpHz: readonly number[];
  melodyHz: readonly number[];
}

// Vòng hòa âm 8 ô nhịp êm dịu kiểu Chillhop / Studio Ghibli Cafe Piano:
// Fmaj7 -> Em7 -> Dm9 -> Cmaj7 -> Bbmaj7 -> Am7 -> Gm9 -> C13sus4
const CHILL_PROGRESSION: readonly ChillChord[] = [
  {
    name: 'Fmaj7',
    rootHz: 87.31, // F2
    fifthHz: 130.81, // C3
    padHz: [174.61, 220.0, 261.63, 329.63], // F3, A3, C4, E4
    arpHz: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63], // C4, E4, G4, C5
    melodyHz: [523.25, 587.33, 659.25, 783.99, 880.0],
  },
  {
    name: 'Em7',
    rootHz: 82.41, // E2
    fifthHz: 123.47, // B2
    padHz: [164.81, 196.0, 246.94, 293.66], // E3, G3, B3, D4
    arpHz: [246.94, 293.66, 392.0, 493.88, 392.0, 293.66], // B3, D4, G4, B4
    melodyHz: [493.88, 587.33, 659.25, 783.99, 987.77],
  },
  {
    name: 'Dm9',
    rootHz: 73.42, // D2
    fifthHz: 110.0, // A2
    padHz: [146.83, 174.61, 220.0, 261.63, 329.63], // D3, F3, A3, C4, E4
    arpHz: [220.0, 261.63, 329.63, 440.0, 329.63, 261.63], // A3, C4, E4, A4
    melodyHz: [440.0, 523.25, 587.33, 659.25, 880.0],
  },
  {
    name: 'Cmaj9',
    rootHz: 65.41, // C2
    fifthHz: 98.0, // G2
    padHz: [130.81, 164.81, 196.0, 246.94, 293.66], // C3, E3, G3, B3, D4
    arpHz: [196.0, 246.94, 329.63, 392.0, 329.63, 246.94], // G3, B3, E4, G4
    melodyHz: [392.0, 440.0, 523.25, 659.25, 783.99],
  },
  {
    name: 'Bbmaj7',
    rootHz: 58.27, // Bb1
    fifthHz: 87.31, // F2
    padHz: [116.54, 174.61, 220.0, 293.66], // Bb2, F3, A3, D4
    arpHz: [220.0, 293.66, 349.23, 440.0, 349.23, 293.66], // A3, D4, F4, A4
    melodyHz: [440.0, 523.25, 587.33, 698.46, 880.0],
  },
  {
    name: 'Am7',
    rootHz: 110.0, // A2
    fifthHz: 164.81, // E3
    padHz: [146.83, 220.0, 261.63, 329.63], // D3, A3, C4, E4
    arpHz: [220.0, 261.63, 329.63, 392.0, 329.63, 261.63], // A3, C4, E4, G4
    melodyHz: [440.0, 523.25, 659.25, 783.99, 880.0],
  },
  {
    name: 'Gm9',
    rootHz: 98.0, // G2
    fifthHz: 146.83, // D3
    padHz: [196.0, 233.08, 293.66, 349.23, 440.0], // G3, Bb3, D4, F4, A4
    arpHz: [233.08, 293.66, 349.23, 440.0, 349.23, 293.66],
    melodyHz: [440.0, 523.25, 587.33, 698.46, 783.99],
  },
  {
    name: 'C9sus4',
    rootHz: 65.41, // C2
    fifthHz: 98.0, // G2
    padHz: [130.81, 174.61, 196.0, 233.08, 293.66], // C3, F3, G3, Bb3, D4
    arpHz: [196.0, 261.63, 293.66, 349.23, 293.66, 261.63],
    melodyHz: [523.25, 587.33, 659.25, 698.46, 783.99],
  },
];

// 75 BPM -> 1 phách (quarter note) = 0.8s, 1 nốt móc đơn (8th note) = 0.4s, 1 ô nhịp (bar) = 3.2s
const EIGHTH_NOTE_SEC = 0.4;
const STEPS_PER_BAR = 8; // 8 eighth-note steps per bar (8 * 0.4s = 3.2s)
const LOOKAHEAD_MS = 50;
const SCHEDULE_AHEAD_SEC = 0.45;

// Mẫu giai điệu nhẹ nhàng có khoảng thở tự nhiên (chỉ số trong melodyHz, -1 = nghỉ)
const MELODY_PATTERNS: ReadonlyArray<ReadonlyArray<number>> = [
  [-1, 0, -1, 2, 3, -1, 1, -1],
  [-1, 2, -1, 4, -1, 3, 2, -1],
  [0, -1, 1, -1, 2, -1, -1, -1],
  [-1, 3, 2, -1, 1, -1, 0, -1],
];

class LofiChillEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private playing = false;
  private volume = 0.65;
  private nextStepTime = 0;
  private currentStep = 0;
  private listeners = new Set<LofiListener>();
  private unlockBound: (() => void) | null = null;

  public getSnapshot(): LofiAudioSnapshot {
    return {
      playing: this.playing,
      volume: this.volume,
      presetName: 'Tạ Quang Bửu Chill Piano & Warm Pad',
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

  /**
   * Tạo xung phản xạ phòng (Stereo Hall Impulse Response) mượt mà không nhiễu gắt,
   * đã lọc lowpass để tạo độ vang ấm áp như sảnh thư viện yên tĩnh.
   */
  private createWarmReverbImpulse(ctx: AudioContext): AudioBuffer {
    const duration = 2.4;
    const length = Math.floor(ctx.sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    let seed = 19562026;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp1 = 0;
      let lp2 = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Đường bao tăng mềm 40ms đầu rồi suy giảm mượt theo hàm mũ
        const fadeIn = Math.min(1, i / (ctx.sampleRate * 0.04));
        const decay = Math.pow(1 - t, 2.8);
        const raw = (nextRand() * 2 - 1) * fadeIn * decay;
        // Lọc thông thấp 2 tầng ngay trong xung reverb để triệt tiêu hoàn toàn tần số chói/rè
        lp1 = lp1 + 0.14 * (raw - lp1);
        lp2 = lp2 + 0.14 * (lp1 - lp2);
        data[i] = lp2 * 0.55;
      }
    }
    return impulse;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx || this.ctx.state === 'closed') {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      this.ctx = ctx;

      // 1. Master Gain & Soft Limiter (DynamicsCompressor) chống vỡ tiếng (anti-clipping)
      const masterGain = ctx.createGain();
      masterGain.gain.value = this.volume;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.015;
      compressor.release.value = 0.25;

      // 2. Bộ lọc tổng ấm áp (loại bỏ hoàn toàn dải tần cao gây chói/rè)
      const masterWarmFilter = ctx.createBiquadFilter();
      masterWarmFilter.type = 'lowpass';
      masterWarmFilter.frequency.value = 1950;
      masterWarmFilter.Q.value = 0.5;

      // 3. Dry Bus
      const dryBus = ctx.createGain();
      dryBus.gain.value = 0.85;
      dryBus.connect(masterWarmFilter);

      // 4. Velvet Hall Reverb Bus
      const reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.42;
      const convolver = ctx.createConvolver();
      convolver.buffer = this.createWarmReverbImpulse(ctx);
      reverbSend.connect(convolver);
      convolver.connect(masterWarmFilter);

      // 5. Warm Stereo Echo / Delay Bus (300ms)
      const delaySend = ctx.createGain();
      delaySend.gain.value = 0.24;
      const delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.value = 0.3;
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.25;
      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1100;

      delaySend.connect(delayNode);
      delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayFilter.connect(masterWarmFilter);

      masterWarmFilter.connect(compressor);
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      this.masterGain = masterGain;
      this.dryBus = dryBus;
      this.reverbSend = reverbSend;
      this.delaySend = delaySend;

      ctx.onstatechange = () => {
        if (this.playing && ctx.state === 'running') {
          this.nextStepTime = Math.max(this.nextStepTime, ctx.currentTime + 0.05);
          this.runScheduler();
        }
      };
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private attachGestureUnlock(): void {
    if (typeof window === 'undefined' || this.unlockBound) return;
    const unlock = () => {
      if (!this.playing) {
        this.detachGestureUnlock();
        return;
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx
          .resume()
          .then(() => {
            if (this.playing && this.ctx && this.ctx.state === 'running') {
              this.detachGestureUnlock();
              this.nextStepTime = this.ctx.currentTime + 0.05;
              this.runScheduler();
            }
          })
          .catch(() => {});
      } else if (this.ctx && this.ctx.state === 'running') {
        this.detachGestureUnlock();
      }
    };
    this.unlockBound = unlock;
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
  }

  private detachGestureUnlock(): void {
    if (typeof window === 'undefined' || !this.unlockBound) return;
    const fn = this.unlockBound;
    this.unlockBound = null;
    window.removeEventListener('pointerdown', fn);
    window.removeEventListener('keydown', fn);
    window.removeEventListener('click', fn);
  }

  /**
   * Lớp 1: Warm Ambient Pad — ngân dài xuyên suốt cả ô nhịp (3.8s cho mỗi ô 3.2s),
   * giao thoa mượt (crossfade 0.6s) với ô nhịp kế tiếp để nhạc KHÔNG BAO GIỜ bị đứt quãng.
   */
  private scheduleWarmPad(ctx: AudioContext, chord: ChillChord, startTime: number): void {
    if (!this.dryBus || !this.reverbSend) return;
    const barDuration = STEPS_PER_BAR * EIGHTH_NOTE_SEC; // 3.2s
    const totalDur = barDuration + 0.65; // 3.85s (giao thoa 0.65s sang hợp âm tiếp theo)

    chord.padHz.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      // Detune cực nhẹ tạo độ dày ấm mà không gây phách nhiễu
      osc.detune.setValueAtTime((idx % 2 === 0 ? 1 : -1) * 3.0, startTime);

      const peak = 0.042 / Math.sqrt(chord.padHz.length);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.55);
      gain.gain.linearRampToValueAtTime(peak * 0.82, startTime + barDuration * 0.85);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + totalDur);

      osc.connect(gain);
      gain.connect(this.dryBus!);
      gain.connect(this.reverbSend!);

      osc.onended = () => {
        try {
          gain.disconnect();
          osc.disconnect();
        } catch {
          // ignore
        }
      };

      osc.start(startTime);
      osc.stop(startTime + totalDur + 0.05);
    });
  }

  /**
   * Lớp 2: Felt Piano / Rhodes Note — tiếng đàn piano dạ ấm áp rải đều theo từng phách móc đơn.
   */
  private scheduleFeltPianoNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    durationSec: number,
    velocity = 1.0,
  ): void {
    if (!this.dryBus || !this.reverbSend) return;

    const oscFundamental = ctx.createOscillator();
    const oscWarmHarmonic = ctx.createOscillator();
    const noteGain = ctx.createGain();
    const harmonicGain = ctx.createGain();

    oscFundamental.type = 'sine';
    oscFundamental.frequency.setValueAtTime(freq, startTime);

    oscWarmHarmonic.type = 'triangle';
    oscWarmHarmonic.frequency.setValueAtTime(freq * 2, startTime);

    const peak = 0.055 * velocity;
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(peak, startTime + 0.025);
    noteGain.gain.exponentialRampToValueAtTime(peak * 0.38, startTime + durationSec * 0.45);
    noteGain.gain.linearRampToValueAtTime(0.0001, startTime + durationSec);

    // Bội âm bậc 2 tắt nhanh tạo âm sắc búa đàn dạ (felt hammer) mềm mại
    harmonicGain.gain.setValueAtTime(0.0001, startTime);
    harmonicGain.gain.linearRampToValueAtTime(peak * 0.14, startTime + 0.015);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

    oscFundamental.connect(noteGain);
    oscWarmHarmonic.connect(harmonicGain);
    harmonicGain.connect(noteGain);

    noteGain.connect(this.dryBus);
    noteGain.connect(this.reverbSend);

    oscFundamental.onended = () => {
      try {
        harmonicGain.disconnect();
        noteGain.disconnect();
        oscWarmHarmonic.disconnect();
        oscFundamental.disconnect();
      } catch {
        // ignore
      }
    };

    oscFundamental.start(startTime);
    oscWarmHarmonic.start(startTime);
    oscWarmHarmonic.stop(startTime + 0.32);
    oscFundamental.stop(startTime + durationSec + 0.04);
  }

  /**
   * Lớp 3: Deep Sine Sub-Bass — âm trầm tròn trịa nâng đỡ hòa âm.
   */
  private scheduleWarmBass(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    durationSec: number,
  ): void {
    if (!this.dryBus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.085, startTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.055, startTime + durationSec * 0.7);
    gain.gain.linearRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(this.dryBus);

    osc.onended = () => {
      try {
        gain.disconnect();
        osc.disconnect();
      } catch {
        // ignore
      }
    };

    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.04);
  }

  /**
   * Lớp 4: Celesta / Music Box Melody — giai điệu trong trẻo đưa vào Delay + Reverb.
   */
  private scheduleCelestaMelody(ctx: AudioContext, freq: number, startTime: number): void {
    if (!this.dryBus || !this.reverbSend || !this.delaySend) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const dur = 1.35;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.042, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.012, startTime + 0.45);
    gain.gain.linearRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(gain);
    gain.connect(this.dryBus);
    gain.connect(this.reverbSend);
    gain.connect(this.delaySend);

    osc.onended = () => {
      try {
        gain.disconnect();
        osc.disconnect();
      } catch {
        // ignore
      }
    };

    osc.start(startTime);
    osc.stop(startTime + dur + 0.04);
  }

  /**
   * Lớp 5: Nhịp tim trầm (Soft Heartbeat Pulse) rất êm ở phách 1 và phách 3 (không dùng noise).
   */
  private scheduleSoftPulse(ctx: AudioContext, startTime: number, accent = false): void {
    if (!this.dryBus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 88 : 74, startTime);
    osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.14);

    const peak = accent ? 0.075 : 0.048;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, startTime + 0.24);

    osc.connect(gain);
    gain.connect(this.dryBus);

    osc.onended = () => {
      try {
        gain.disconnect();
        osc.disconnect();
      } catch {
        // ignore
      }
    };

    osc.start(startTime);
    osc.stop(startTime + 0.26);
  }

  /**
   * Lập lịch chính xác cho 1 bước móc đơn (8th-note step) tại thời điểm phần cứng `stepTime`.
   */
  private scheduleStepAt(ctx: AudioContext, step: number, stepTime: number): void {
    const barIdx = Math.floor(step / STEPS_PER_BAR) % CHILL_PROGRESSION.length;
    const stepInBar = step % STEPS_PER_BAR;
    const chord = CHILL_PROGRESSION[barIdx];

    // 1. Đầu mỗi ô nhịp: phát nền Warm Pad ngân dài + Bass chủ âm
    if (stepInBar === 0) {
      this.scheduleWarmPad(ctx, chord, stepTime);
      this.scheduleWarmBass(ctx, chord.rootHz, stepTime, EIGHTH_NOTE_SEC * 4.2);
      // Đánh nhẹ hợp âm Felt Piano rải ở phách 1
      chord.padHz.forEach((hz, idx) => {
        this.scheduleFeltPianoNote(
          ctx,
          hz,
          stepTime + idx * 0.035,
          EIGHTH_NOTE_SEC * 3.6,
          0.72,
        );
      });
    } else if (stepInBar === 4) {
      // Phách 3: Bass bậc 5 nhẹ nhàng nối liền nửa sau ô nhịp
      this.scheduleWarmBass(ctx, chord.fifthHz, stepTime, EIGHTH_NOTE_SEC * 3.9);
    }

    // 2. Rải nốt Felt Piano Arpeggio đều đặn từng phách móc đơn tạo dòng chảy liên tục
    const arpNote = chord.arpHz[stepInBar % chord.arpHz.length];
    const arpVel = stepInBar % 2 === 0 ? 0.68 : 0.52;
    this.scheduleFeltPianoNote(ctx, arpNote, stepTime, EIGHTH_NOTE_SEC * 2.4, arpVel);

    // 3. Nhịp tim trầm êm (Soft Pulse) ở phách 1 (step 0) và phách 3 (step 4)
    if (stepInBar === 0) {
      this.scheduleSoftPulse(ctx, stepTime, true);
    } else if (stepInBar === 4) {
      this.scheduleSoftPulse(ctx, stepTime, false);
    }

    // 4. Giai điệu Celesta / Music Box theo mẫu có câu cú rõ ràng
    const pattern = MELODY_PATTERNS[barIdx % MELODY_PATTERNS.length];
    const melodyIdx = pattern[stepInBar];
    if (melodyIdx !== undefined && melodyIdx >= 0) {
      const noteHz = chord.melodyHz[melodyIdx % chord.melodyHz.length];
      // Lệch nhẹ 18ms (humanize) để giai điệu mềm mại tự nhiên
      this.scheduleCelestaMelody(ctx, noteHz, stepTime + 0.018);
    }
  }

  /**
   * Lookahead Scheduler: chạy mỗi 50ms, luôn lập lịch trước tất cả các nốt trong
   * khoảng `[nextStepTime, ctx.currentTime + 0.45s]` để không bao giờ bị trễ/ngắt quãng.
   */
  private runScheduler(): void {
    if (!this.playing) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    // Nếu tab vừa thức dậy sau khi ngủ dài, kéo nextStepTime về hiện tại mượt mà
    if (this.nextStepTime < now - 0.1) {
      this.nextStepTime = now + 0.05;
    }

    while (this.nextStepTime < now + SCHEDULE_AHEAD_SEC) {
      this.scheduleStepAt(ctx, this.currentStep, this.nextStepTime);
      this.nextStepTime += EIGHTH_NOTE_SEC;
      this.currentStep = (this.currentStep + 1) % (STEPS_PER_BAR * CHILL_PROGRESSION.length);
    }
  }

  public start(): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (this.playing) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return true;
    }
    this.playing = true;
    this.currentStep = 0;
    this.nextStepTime = ctx.currentTime + 0.06;

    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 0.4);
    }

    if (ctx.state === 'running') {
      this.runScheduler();
    } else {
      this.attachGestureUnlock();
    }
    this.schedulerId = setInterval(() => this.runScheduler(), LOOKAHEAD_MS);
    this.emit();
    return true;
  }

  public stop(): void {
    this.detachGestureUnlock();
    if (!this.playing && !this.schedulerId) return;
    this.playing = false;
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.masterGain && this.ctx && this.ctx.state !== 'closed') {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
    }
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
    if (this.masterGain && this.ctx && this.playing) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
    this.emit();
  }
}

export const lofiAudio = new LofiChillEngine();
