/**
 * Đọc tiếng Trung bằng SpeechSynthesis của trình duyệt (giọng zh-CN).
 *
 * - Chỉ phát sau tương tác người dùng: UI phải gọi speak() từ một cử chỉ
 *   (nút "Vào trường", nút nghe, ...) — trình duyệt chặn autoplay.
 * - Dừng lời cũ trước khi phát câu mới (cancel).
 * - Thiếu giọng tiếng Trung → gọi onError('no-voice'), KHÔNG throw,
 *   để UI hiện thông báo "thiết bị chưa có giọng tiếng Trung,
 *   vẫn học được bằng chữ".
 * - Guard `typeof window === 'undefined'` để test node import được.
 */

export interface SpeakOptions {
  rate?: number;
  onEnd?: () => void;
  onError?: (code: string) => void;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let listenerAttached = false;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

function ensureVoiceListener(): void {
  const synth = getSynth();
  if (!synth || listenerAttached) return;
  listenerAttached = true;
  // Giọng có thể load chậm: lắng nghe voiceschanged để cập nhật danh sách.
  cachedVoices = synth.getVoices();
  synth.addEventListener('voiceschanged', () => {
    cachedVoices = synth.getVoices();
  });
}

/**
 * Giọng tiếng Trung tốt nhất hiện có: ưu tiên lang bắt đầu 'zh-CN', rồi 'zh'.
 * Trả null khi chưa có giọng (kể cả khi API có nhưng danh sách giọng rỗng).
 */
export function getChineseVoice(): SpeechSynthesisVoice | null {
  const synth = getSynth();
  if (!synth) return null;
  ensureVoiceListener();
  const voices = cachedVoices.length > 0 ? cachedVoices : synth.getVoices();
  return (
    voices.find((v) => v.lang.startsWith('zh-CN')) ??
    voices.find((v) => v.lang.startsWith('zh')) ??
    null
  );
}

export function hasChineseVoice(): boolean {
  return getChineseVoice() !== null;
}

/**
 * Đọc một câu tiếng Trung. Mã lỗi qua onError:
 * - 'no-speech': trình duyệt/môi trường không có SpeechSynthesis.
 * - 'no-voice': không có giọng tiếng Trung trên thiết bị.
 * - 'speak-error': lỗi khi phát (vd bị ngắt bởi hệ thống).
 */
export function speak(text: string, opts: SpeakOptions = {}): void {
  const synth = getSynth();
  if (!synth) {
    opts.onError?.('no-speech');
    return;
  }
  const voice = getChineseVoice();
  if (!voice) {
    opts.onError?.('no-voice');
    return;
  }
  synth.cancel(); // dừng lời cũ trước khi phát câu mới
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.voice = voice;
  utterance.rate = opts.rate ?? 1;
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = () => opts.onError?.('speak-error');
  synth.speak(utterance);
}

/** Dừng mọi lời đang đọc (an toàn khi không có SpeechSynthesis). */
export function stopSpeaking(): void {
  getSynth()?.cancel();
}
