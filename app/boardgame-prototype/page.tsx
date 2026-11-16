import type { Metadata } from 'next';
import BoardGameVisualPrototypeView from '@/features/boardgame/ui/BoardGameVisualPrototypeView';

export const metadata: Metadata = {
  title: 'Visual Prototype · Bóng Đêm KTX | HUSTVerse Midnight — Anime Noir',
  description:
    'Màn hình so sánh giao diện cũ/mới (HUSTVerse Midnight — Anime Noir) cho Thẻ Nhân Vật 2:3 và 3 mẫu Thẻ Bài Bóng Đêm KTX.',
};

export default function BoardGamePrototypePage() {
  return <BoardGameVisualPrototypeView />;
}
