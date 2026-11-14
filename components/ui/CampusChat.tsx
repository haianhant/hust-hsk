'use client';

// ---------------------------------------------------------------------------
// components/ui/CampusChat.tsx — Khung giao tiếp Chat thời gian thực & Thanh
// hoạt ảnh hành động tương tác (Emote Bar: Vẫy tay, Nhảy nhót, Hoan hô, Cúi
// chào, Vỗ tay, Vươn vai) cho sinh viên trong khuôn viên Bách khoa 3D.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { EMOTE_DEFINITIONS } from '../three/StudentAvatar';
import {
  multiplayer,
  type AvatarEmoteId,
  type ChatMessageEntry,
} from '../../lib/multiplayer';
import { playerState } from '../../lib/playerState';

const CAMPUS_QUICK_PHRASES: readonly { label: string; text: string }[] = [
  { label: '👋 Chào cả nhà!', text: 'Chào các bạn sinh viên Bách Khoa nha! 👋' },
  { label: '🛵 Dạo Hồ Tiền', text: 'Có ai rảnh lái xe dạo một vòng Hồ Tiền & Quảng trường C1 không? 🛵' },
  { label: '🍅 Lên Thư viện TQB', text: 'Cùng vào Thư viện Tạ Quang Bửu bật Pomodoro học bài nhé! 🍅' },
  { label: '💃 Nhảy chút!', text: 'Học xong 1 hiệp Pomodoro rồi, nhảy nhót thư giãn chút nào! 💃' },
] as const;

const HSK_QUICK_PHRASES: readonly { label: string; text: string }[] = [
  { label: '👋 你好！', text: '你好！Chào các bạn nha!' },
  { label: '📚 一起学习', text: '一起学习吧！Cùng vào Thư viện TQB ôn HSK nhé!' },
  { label: '💪 加油！', text: '加油！Chúc mọi người học tập hiệu quả!' },
  { label: '💃 Nhảy chút!', text: 'Học xong 1 hiệp Pomodoro rồi, nhảy nhót thư giãn chút nào! 💃' },
] as const;

export default function CampusChat({ hskMode = false }: { hskMode?: boolean }) {
  const activeQuickPhrases = hskMode ? HSK_QUICK_PHRASES : CAMPUS_QUICK_PHRASES;
  const [chatOpen, setChatOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );
  const [emotesOpen, setEmotesOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true,
  );
  const [messages, setMessages] = useState<ChatMessageEntry[]>(
    () => multiplayer.snapshot.messages,
  );
  const [onlineCount, setOnlineCount] = useState<number>(
    () => Math.max(1, multiplayer.snapshot.count),
  );
  const [draft, setDraft] = useState<string>('');
  const [activeEmoteId, setActiveEmoteId] = useState<AvatarEmoteId | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const lastSeenCountRef = useRef<number>(multiplayer.snapshot.messages.length);
  const prevWidthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initW = window.innerWidth;
    prevWidthRef.current = initW;
    if (initW < 768) setChatOpen(false);
    if (initW < 640) setEmotesOpen(false);

    const onResize = () => {
      const nextW = window.innerWidth;
      const prevW = prevWidthRef.current;
      prevWidthRef.current = nextW;
      if (prevW >= 768 && nextW < 768) {
        setChatOpen(false);
      } else if (prevW < 768 && nextW >= 768) {
        setChatOpen(true);
      }
      if (prevW >= 640 && nextW < 640) {
        setEmotesOpen(false);
      } else if (prevW < 640 && nextW >= 640) {
        setEmotesOpen(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const sync = () => {
      const snap = multiplayer.snapshot;
      setMessages(snap.messages);
      setOnlineCount(Math.max(1, snap.count));
      if (snap.messages.length > lastSeenCountRef.current) {
        const newMsgs = snap.messages.slice(lastSeenCountRef.current);
        const hasRemotePeerMsg = newMsgs.some((m) => !m.isSelf && !m.isCompanion);
        if (!chatOpen) {
          if (hasRemotePeerMsg) {
            setChatOpen(true);
            setUnreadCount(0);
          } else {
            setUnreadCount((c) => c + newMsgs.length);
          }
        }
      }
      lastSeenCountRef.current = snap.messages.length;
    };
    const unsub = multiplayer.subscribe(sync);
    sync();
    return unsub;
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, chatOpen]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const em = playerState.activeEmote;
      if (em) {
        setActiveEmoteId(em.id);
      } else {
        setActiveEmoteId(null);
      }
    }, 150);
    return () => window.clearInterval(id);
  }, []);

  const handleSend = (textToSend?: string) => {
    const raw = (textToSend ?? draft).trim();
    if (!raw) return;
    const sent = multiplayer.sendChatMessage(raw, playerState.avatarName);
    if (sent && textToSend === undefined) {
      setDraft('');
    }
  };

  const handleEmoteClick = (emoteId: AvatarEmoteId) => {
    multiplayer.sendEmote(emoteId);
    setActiveEmoteId(emoteId);
  };

  return (
    <div
      data-testid="campus-social-dock"
      className={`pointer-events-auto absolute bottom-[8.25rem] left-3 z-20 flex max-w-[calc(100vw-24px)] sm:bottom-4 sm:left-3 sm:flex-col sm:items-start sm:gap-2 ${
        !chatOpen && !emotesOpen ? 'flex-row items-center gap-1.5' : 'flex-col items-start gap-2'
      }`}
    >
      {/* Thanh Hoạt ảnh Hành động (Emote Bar) */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-950/80 px-2 py-1 text-xs text-white shadow-xl backdrop-blur-md sm:px-2.5 sm:py-1.5">
        <button
          type="button"
          data-testid="emote-bar-toggle"
          onClick={() => setEmotesOpen((v) => !v)}
          title="Bật/tắt thanh hành động (Phím tắt 1–6)"
          className="flex items-center gap-1 rounded-xl bg-amber-500/20 px-2 py-1 font-semibold text-amber-200 transition hover:bg-amber-500/30"
        >
          <span>😊</span>
          <span className="hidden sm:inline">Hành động</span>
        </button>
        {emotesOpen && (
          <div data-testid="emote-bar" className="flex flex-wrap items-center gap-1">
            {EMOTE_DEFINITIONS.map((em) => {
              const isActive = activeEmoteId === em.id;
              return (
                <button
                  key={em.id}
                  type="button"
                  data-testid={`emote-btn-${em.id}`}
                  onClick={() => handleEmoteClick(em.id)}
                  title={
                    hskMode
                      ? `${em.labelVi} (${em.labelZh}) — Phím ${em.keyHint}`
                      : `${em.labelVi} — Phím ${em.keyHint}`
                  }
                  className={`flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-medium transition ${
                    isActive
                      ? 'bg-amber-500 font-bold text-slate-950 shadow-md ring-2 ring-amber-200'
                      : 'bg-white/10 text-white/90 hover:bg-white/20'
                  }`}
                >
                  <span className="text-sm leading-none">{em.icon}</span>
                  <span className="hidden md:inline">{em.labelVi}</span>
                  <span className="rounded bg-black/30 px-1 text-[10px] font-mono text-white/70">
                    {em.keyHint}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Khung Chat Giao tiếp Sân trường */}
      {chatOpen ? (
        <div
          data-testid="campus-chat"
          className="flex w-[min(calc(100vw-24px),310px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/85 text-white shadow-2xl backdrop-blur-md sm:w-[340px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold tracking-wide text-white">
                💬 Trò chuyện Bách Khoa
              </span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/75">
                {onlineCount} SV
              </span>
            </div>
            <button
              type="button"
              data-testid="campus-chat-collapse"
              onClick={() => setChatOpen(false)}
              title="Thu gọn hộp trò chuyện"
              className="rounded-lg px-2 py-0.5 text-xs text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              Thu gọn ▾
            </button>
          </div>

          {/* Danh sách tin nhắn */}
          <div
            ref={listRef}
            data-testid="campus-chat-messages"
            className="flex max-h-[145px] min-h-[105px] flex-col gap-1.5 overflow-y-auto px-3 py-2 text-xs"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                data-testid="campus-chat-message-item"
                className="leading-snug break-words"
              >
                <span
                  className="font-bold"
                  style={{ color: m.isSelf ? '#38BDF8' : m.senderColor || '#FBBF24' }}
                >
                  {m.isSelf ? `${m.senderName} (Bạn)` : m.senderName}:
                </span>{' '}
                <span className="text-slate-100">{m.text}</span>
              </div>
            ))}
          </div>

          {/* Gợi ý câu giao tiếp nhanh */}
          <div className="flex gap-1 overflow-x-auto border-t border-white/10 bg-slate-900/50 px-2.5 py-1.5">
            {activeQuickPhrases.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => handleSend(qp.text)}
                className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-200 transition hover:bg-sky-500/30"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Ô nhập tin nhắn */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-1.5 border-t border-white/10 bg-slate-900/90 px-2.5 py-2"
          >
            <input
              type="text"
              data-testid="campus-chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={160}
              placeholder="Nhắn tin giao lưu (Enter để gửi)..."
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs text-white placeholder-white/45 focus:border-sky-400 focus:outline-none"
            />
            <button
              type="submit"
              data-testid="campus-chat-send"
              disabled={!draft.trim()}
              onClick={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-sky-500 disabled:opacity-40"
            >
              Gửi
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          data-testid="campus-chat-toggle"
          onClick={() => {
            setChatOpen(true);
            setUnreadCount(0);
          }}
          className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-950/85 px-2.5 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md transition hover:bg-slate-900 sm:gap-2 sm:rounded-full sm:px-3.5 sm:py-2"
        >
          <span>💬</span>
          <span className="hidden sm:inline">Trò chuyện</span>
          <span className="text-[11px] font-semibold text-white/85 sm:text-xs">({onlineCount})</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              +{unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
