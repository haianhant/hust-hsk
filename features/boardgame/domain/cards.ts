// ---------------------------------------------------------------------------
// features/boardgame/domain/cards.ts — Bộ 26 Thẻ Bài Nguyên Bản v3:
//  - 9 Thẻ Điều tra có điều kiện (`investigation`)
//  - 9 Thẻ Trang bị (`equipment`: 7 trang bị mang theo + 2 tiêu hao)
//  - 8 Thẻ Sự kiện (`event`)
//
// Mọi thẻ Điều tra có điều kiện đều được kiểm chứng sao cho cả 2 nhánh kết quả
// ('condition-met' | 'no-reaction') đều khớp từ >= 2 phe trở lên.
// ---------------------------------------------------------------------------

import type { BoardGameDeckId } from '../../../shared/contracts/boardgame';
import type { GameCard } from './types';

export const CARDS_CATALOG: readonly GameCard[] = [
  // === 9 THẺ ĐIỀU TRA CÓ ĐIỀU KIỆN ===
  {
    id: 'inv-01',
    deck: 'investigation',
    title: 'Sổ Trực Đêm B7',
    summary:
      'Kiểm tra xem mục tiêu có thuộc Hội Màn Sương hoặc có Máu tối đa = 13 hay không. Nếu đúng, chịu 1 vết thương áp lực (dừng ở 1 HP).',
    conditionText: 'Màn Sương HOẶC Máu tối đa = 13',
    effectId: 'inv-mist-or-13',
    effectKind: 'inv-mist-or-13',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-02',
    deck: 'investigation',
    title: 'Danh Sách Trực Cổng',
    summary:
      'Kiểm tra xem mục tiêu có thuộc Đội Gác Đèn hoặc có Máu tối đa = 12 hay không. Nếu đúng, hồi 1 vết thương nếu đang bị thương.',
    conditionText: 'Gác Đèn HOẶC Máu tối đa = 12',
    effectId: 'inv-guard-or-12',
    effectKind: 'inv-guard-or-12',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-03',
    deck: 'investigation',
    title: 'Mẩu Giấy Tủ Đồ',
    summary:
      'Kiểm tra xem mục tiêu là Kẻ Lang Thang hoặc có Máu tối đa = 11. Nếu đúng, soi kín xem họ có thẻ Điều tra/Trang bị trên tay.',
    conditionText: 'Lang Thang HOẶC Máu tối đa = 11',
    effectId: 'inv-wanderer-or-11',
    effectKind: 'inv-wanderer-or-11',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-04',
    deck: 'investigation',
    title: 'Tiếng Còi Tuần Đêm',
    summary:
      'Kiểm tra mục tiêu thuộc (Màn Sương hoặc Lang Thang) với Máu tối đa <= 12. Nếu đúng, bóc 1 Giáp tạm hoặc chịu 1 thương áp lực.',
    conditionText: '(Màn Sương / Lang Thang) & Máu <= 12',
    effectId: 'inv-non-guard-le12',
    effectKind: 'inv-non-guard-le12',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-05',
    deck: 'investigation',
    title: 'Soi Thẻ Nội Trú',
    summary:
      'Kiểm tra mục tiêu có thuộc nhóm (Gác Đèn / Dũng / Trang) hay không; nếu đúng, đọc kín nhóm máu chẵn (12) hay lẻ (11/13).',
    conditionText: 'Gác Đèn HOẶC Dũng HOẶC Trang',
    effectId: 'inv-guard-dung-trang',
    effectKind: 'inv-guard-dung-trang',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-06',
    deck: 'investigation',
    title: 'Đối Chiếu Lời Khai',
    summary:
      'Kiểm tra mục tiêu có CÙNG PHE hoặc CÙNG MÁU TỐI ĐA với bạn hay không, kèm ghi chú kín mức thương tích.',
    conditionText: 'Cùng phe HOẶC Cùng Máu tối đa với bạn',
    effectId: 'inv-pair-resonance',
    effectKind: 'inv-pair-resonance',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-07',
    deck: 'investigation',
    title: 'Dấu Chân Hành Lang',
    summary:
      'Kiểm tra xem mục tiêu từng ghé Phát Thanh / Bảo Vệ hoặc từng Đứng yên (STAY). Nếu đúng, xem kín 2 địa điểm gần nhất của họ.',
    conditionText: 'Từng ghé Phát thanh/Bảo vệ HOẶC Đứng yên',
    effectId: 'inv-footsteps',
    effectKind: 'inv-footsteps',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-08',
    deck: 'investigation',
    title: 'Vết Xước Tay Áo',
    summary:
      'Kiểm tra xem mục tiêu đã từng ATTACK hoặc đang đeo Trang bị hay không. Nếu đúng, đọc kín lịch sử tấn công & số bài trên tay.',
    conditionText: 'Đã từng tấn công HOẶC Đang đeo trang bị',
    effectId: 'inv-scuffle-trace',
    effectKind: 'inv-scuffle-trace',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'inv-09',
    deck: 'investigation',
    title: 'Kiểm Tra Ngăn Balo',
    summary:
      'Kiểm tra mục tiêu đang giữ >= 2 thẻ trên tay hoặc đang đeo Trang bị. Nếu đúng, biết kín nhóm thẻ bài trên tay họ.',
    conditionText: '>= 2 thẻ trên tay HOẶC Đang đeo trang bị',
    effectId: 'inv-locker-check',
    effectKind: 'inv-locker-check',
    targetMode: 'single-player',
    value: 1,
  },

  // === 9 THẺ TRANG BỊ (7 MANG THEO + 2 TIÊU HAO) ===
  {
    id: 'eq-01',
    deck: 'equipment',
    title: 'Áo Khoác Gió Bách Khoa',
    summary: 'Trang bị: Giảm 1 sát thương từ mọi đòn ATTACK đánh vào bạn (tối thiểu 1 ST trước giáp).',
    effectId: 'eq-windbreaker',
    effectKind: 'eq-windbreaker',
    targetMode: 'self',
    isConsumable: false,
    value: 1,
  },
  {
    id: 'eq-02',
    deck: 'equipment',
    title: 'Đèn Pin Tuần Tra',
    summary: 'Trang bị: Đòn ATTACK của bạn gây +1 ST vào mục tiêu đã lật vai hoặc đã có >= 2 vết thương.',
    effectId: 'eq-flashlight',
    effectKind: 'eq-flashlight',
    targetMode: 'self',
    isConsumable: false,
    value: 1,
  },
  {
    id: 'eq-03',
    deck: 'equipment',
    title: 'Giày Thể Thao Sân KTX',
    summary: 'Trang bị: Khi MOVE có thể bước tới khu vực cách 1 hoặc 2 bước trên đồ thị KTX.',
    effectId: 'eq-sneakers',
    effectKind: 'eq-sneakers',
    targetMode: 'self',
    isConsumable: false,
    value: 2,
  },
  {
    id: 'eq-04',
    deck: 'equipment',
    title: 'Bộ Đàm Trực Đêm',
    summary: 'Trang bị: Dùng thẻ Điều tra tới bất kỳ người chơi nào trên toàn bản đồ.',
    effectId: 'eq-walkie-talkie',
    effectKind: 'eq-walkie-talkie',
    targetMode: 'self',
    isConsumable: false,
    value: 1,
  },
  {
    id: 'eq-05',
    deck: 'equipment',
    title: 'Còi Báo Động Cầm Tay',
    summary: 'Trang bị: Nếu còn sống sau khi bị đánh cùng phòng, đẩy kẻ tấn công dạt sang 1 ô kề cận.',
    effectId: 'eq-alarm-whistle',
    effectKind: 'eq-alarm-whistle',
    targetMode: 'self',
    isConsumable: false,
    value: 1,
  },
  {
    id: 'eq-06',
    deck: 'equipment',
    title: 'Kính Chắn Bụi Thực Tập',
    summary: 'Trang bị: Chặn hoàn toàn sát thương áp lực từ thẻ Điều tra và sát thương nhẹ từ Sự kiện.',
    effectId: 'eq-goggles',
    effectKind: 'eq-goggles',
    targetMode: 'self',
    isConsumable: false,
    value: 1,
  },
  {
    id: 'eq-07',
    deck: 'equipment',
    title: 'Móc Khóa Gậy Tuần Đêm',
    summary: 'Trang bị: Cho phép dùng ATTACK nhắm tới cả người chơi ở khu vực kề cận.',
    effectId: 'eq-baton',
    effectKind: 'eq-baton',
    targetMode: 'self',
    isConsumable: false,
    value: 1,
  },
  {
    id: 'eq-08',
    deck: 'equipment',
    title: 'Bình Giữ Nhiệt Trà Gừng',
    summary: 'Tiêu hao: Hồi ngay 3 vết thương cho bản thân hoặc 1 sinh viên cùng phòng, rồi bỏ thẻ.',
    effectId: 'eq-thermos',
    effectKind: 'eq-thermos',
    targetMode: 'same-location',
    isConsumable: true,
    value: 3,
  },
  {
    id: 'eq-09',
    deck: 'equipment',
    title: 'Thẻ Từ Nội Trú Đa Năng',
    summary: 'Tiêu hao: Nhận ngay +2 Giáp tạm (tối đa 2) và rút 1 thẻ Điều tra mới, rồi bỏ thẻ.',
    effectId: 'eq-magnetic-pass',
    effectKind: 'eq-magnetic-pass',
    targetMode: 'self',
    isConsumable: true,
    value: 2,
  },

  // === 8 THẺ SỰ KIỆN ===
  {
    id: 'ev-01',
    deck: 'event',
    title: 'Mất Điện Hành Lang',
    summary:
      'Người đứng ở Hành Lang B7 mất 1 Giáp tạm; bạn chọn 1 khu vực khác để tặng +1 Giáp tạm cho người ở đó.',
    effectId: 'ev-power-flicker',
    effectKind: 'ev-power-flicker',
    targetMode: 'location',
    value: 1,
  },
  {
    id: 'ev-02',
    deck: 'event',
    title: 'Bữa Khuya Căng Tin',
    summary:
      'Sinh viên ở Căng Tin hoặc Sảnh KTX hồi 1 vết thương; người ở khu khác mất 1 thương nếu chưa có Giáp tạm.',
    effectId: 'ev-midnight-noodles',
    effectKind: 'ev-midnight-noodles',
    targetMode: 'global',
    value: 1,
  },
  {
    id: 'ev-03',
    deck: 'event',
    title: 'Loa KTX Thông Báo',
    summary: 'Người đang đứng tại khu vực được chọn bị điều động bước sang 1 ô kề cận (nếu là bạn tự chọn ở lại).',
    effectId: 'ev-loudspeaker',
    effectKind: 'ev-loudspeaker',
    targetMode: 'location',
    value: 1,
  },
  {
    id: 'ev-04',
    deck: 'event',
    title: 'Mưa Rào Sân KTX',
    summary:
      'Sân Bóng Rổ bị hạn chế tầm nhìn hết vòng; ai đứng trên sân chưa đeo Kính/Giáp nhận 1 vết thương cảm lạnh.',
    effectId: 'ev-rain-shower',
    effectKind: 'ev-rain-shower',
    targetMode: 'global',
    value: 1,
  },
  {
    id: 'ev-05',
    deck: 'event',
    title: 'Kiểm Tra Tủ Đồ Đột Xuất',
    summary:
      'Chọn 1 người đang mang Trang bị: tháo món trang bị cũ nhất của họ và họ rút bù 1 thẻ Điều tra.',
    effectId: 'ev-locker-audit',
    effectKind: 'ev-locker-audit',
    targetMode: 'single-player',
    value: 1,
  },
  {
    id: 'ev-06',
    deck: 'event',
    title: 'Bình Trà Ấm Cuối Đêm',
    summary: 'Bạn hồi 2 vết thương và tặng 1 người cùng phòng hồi 1 vết thương.',
    effectId: 'ev-calm-tea',
    effectKind: 'ev-calm-tea',
    targetMode: 'same-location',
    value: 2,
  },
  {
    id: 'ev-07',
    deck: 'event',
    title: 'Tin Đồn Lan Truyền',
    summary:
      'Mọi người giữ >= 3 thẻ trên tay bỏ bớt 1 thẻ cũ nhất vào chồng bài bỏ; người dùng nhận +1 Giáp tạm.',
    effectId: 'ev-rumor-wave',
    effectKind: 'ev-rumor-wave',
    targetMode: 'global',
    value: 1,
  },
  {
    id: 'ev-08',
    deck: 'event',
    title: 'Hồi Chuông Giới Nghiêm',
    summary:
      'Áp lực giới nghiêm: mọi sinh viên chưa dùng Điều tra lần nào từ đầu trận nhận 1 vết thương cảnh cáo (dừng ở 1 HP).',
    effectId: 'ev-curfew-bell',
    effectKind: 'ev-curfew-bell',
    targetMode: 'global',
    value: 1,
  },
];

export const CARDS_BY_ID: Record<string, GameCard> = Object.fromEntries(
  CARDS_CATALOG.map((card) => [card.id, card]),
);

export function listCardIdsByDeck(deck: BoardGameDeckId): string[] {
  return CARDS_CATALOG.filter((c) => c.deck === deck).map((c) => c.id);
}
