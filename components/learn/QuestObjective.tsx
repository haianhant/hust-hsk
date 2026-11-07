// ---------------------------------------------------------------------------
// QuestObjective.tsx — Chip mục tiêu hiện tại trên HUD (Bước 5).
// Một nhiệm vụ chính hiện cùng lúc.
// Gọn (HUD đợt sửa lần 2, brief §8): padding/cỡ chữ nhỏ hơn trước; bấm để
// thu gọn thành chip "🎯 Mục tiêu", bấm lại để mở. Mặc định MỞ mỗi khi
// bước quest đổi (text đổi -> reset collapsed), để người học luôn thấy mục
// tiêu mới. Toàn bộ chip là một nút bấm (pointer-events-auto đã có ở class).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';

export default function QuestObjective({ text }: { text: string | null }) {
  const [collapsed, setCollapsed] = useState(false);

  // Bước quest đổi -> tự mở lại để mục tiêu mới không bị giấu.
  useEffect(() => {
    setCollapsed(false);
  }, [text]);

  if (!text) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-expanded={false}
        aria-label="Mở mục tiêu nhiệm vụ"
        className="pointer-events-auto rounded-full bg-[#A54432]/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[#8A3828]"
      >
        🎯 Mục tiêu
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setCollapsed(true)}
      aria-expanded={true}
      aria-label="Thu gọn mục tiêu nhiệm vụ"
      title="Bấm để thu gọn"
      className="pointer-events-auto max-w-[min(88vw,340px)] rounded-full bg-[#A54432]/90 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[#8A3828] sm:text-sm"
    >
      🎯 {text} <span aria-hidden>▴</span>
    </button>
  );
}
