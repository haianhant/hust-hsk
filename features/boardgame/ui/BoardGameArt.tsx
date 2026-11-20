'use client';

// ---------------------------------------------------------------------------
// features/boardgame/ui/BoardGameArt.tsx — Hệ thống Đồ họa Bàn Cờ Bóng Đêm KTX v4
// Minh họa SVG nguyên bản 3 Cụm / 6 Khu vực Đánh số Xúc xắc, Quân cờ 8 màu,
// Xúc xắc 1d6 / 1d4 và Chồng bài Khám Phá / Cung Ứng / Đột Kích.
// ---------------------------------------------------------------------------

import React from 'react';
import type {
  BoardGameClusterPair,
  BoardGameDeckId,
  BoardGameFactionId,
  BoardGameLocationId,
  BoardGameRoleId,
  BoardGameZoneClusterId,
} from '@/shared/contracts/boardgame';
import {
  MIDNIGHT_CARD_BACK_ART,
  MIDNIGHT_CHARACTER_ART,
} from './midnight-noir-tokens';

export const FACTION_THEME: Record<
  BoardGameFactionId,
  {
    label: string;
    shortLabel: string;
    accent: string;
    badgeBg: string;
    borderClass: string;
    textClass: string;
    cardGlow: string;
  }
> = {
  'lantern-guard': {
    label: 'Đội Săn Đêm',
    shortLabel: 'Săn Đêm',
    accent: '#34d399',
    badgeBg: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/50',
    borderClass: 'border-emerald-400/55',
    textClass: 'text-emerald-200',
    cardGlow: 'shadow-[0_12px_36px_rgba(16,185,129,0.22)]',
  },
  'mist-order': {
    label: 'Hội Bóng Đêm',
    shortLabel: 'Bóng Đêm',
    accent: '#fb7185',
    badgeBg: 'bg-rose-500/20 text-rose-100 border-rose-400/50',
    borderClass: 'border-rose-400/55',
    textClass: 'text-rose-200',
    cardGlow: 'shadow-[0_12px_36px_rgba(244,63,94,0.22)]',
  },
  wanderer: {
    label: 'Kẻ Độc Hành',
    shortLabel: 'Độc Hành',
    accent: '#fbbf24',
    badgeBg: 'bg-amber-500/20 text-amber-100 border-amber-400/50',
    borderClass: 'border-amber-400/55',
    textClass: 'text-amber-200',
    cardGlow: 'shadow-[0_12px_36px_rgba(245,158,11,0.22)]',
  },
};

export interface RoleVisualMeta {
  codeName: string;
  title: string;
  accentHex: string;
  motif: string;
  shortAbility: string;
}

export const ROLE_VISUAL_META: Record<BoardGameRoleId, RoleVisualMeta> = {
  'gac-ky-thuat': {
    codeName: 'Minh "Kỹ Thuật"',
    title: 'George · 14 HP',
    accentHex: '#34d399',
    motif: 'Cờ lê & Ánh đèn pha',
    shortAbility: '1 lần/trận: Tung 1d4 gây sát thương toàn bàn',
  },
  'gac-truc-ban': {
    codeName: 'Lan "Trực Ban"',
    title: 'Emi · 10 HP',
    accentHex: '#10b981',
    motif: 'Thẻ từ & Cổng dịch chuyển',
    shortAbility: 'Pha 1: Bước thẳng sang ô cặp đôi cùng Cụm',
  },
  'gac-radio': {
    codeName: 'Vy "Radio"',
    title: 'Franklin · 12 HP',
    accentHex: '#38bdf8',
    motif: 'Tai nghe & Sét cao áp',
    shortAbility: '1 lần/trận: Tung 1d6 gây sát thương toàn bàn',
  },
  'suong-an-danh': {
    codeName: 'Tú "Ẩn Danh"',
    title: 'Vampire · 13 HP',
    accentHex: '#fb7185',
    motif: 'Bóng áo choàng đêm',
    shortAbility: 'Nội tại: Đánh trúng (> 0) hồi lại 2 máu',
  },
  'suong-tin-gia': {
    codeName: 'Khánh "Tin Giả"',
    title: 'Unknown · 11 HP',
    accentHex: '#f43f5e',
    motif: 'Mặt nạ Ngụy Trang',
    shortAbility: 'Nội tại khi úp vai: Nói dối trước Thẻ Khám Phá Kín',
  },
  'suong-gac-cong': {
    codeName: 'Dũng "Gác Cổng"',
    title: 'Werewolf · 14 HP',
    accentHex: '#a78bfa',
    motif: 'Ổ khóa sắt & Khiên phản đòn',
    shortAbility: 'Nội tại: Bị đánh thường & sống → đánh trả |1d6-1d4|',
  },
  'lang-anh-san': {
    codeName: 'Hải "Sưu Tầm"',
    title: 'Bob · 10 HP',
    accentHex: '#fbbf24',
    motif: 'Túi đồ nghề KTX',
    shortAbility: 'Thắng đủ 5 đồ · Cướp đồ thay ST (4–6p) / lột sạch khi giết (7–8p)',
  },
  'lang-quan-sat': {
    codeName: 'Trang "Kiên Cường"',
    title: 'Allie · 8 HP',
    accentHex: '#f59e0b',
    motif: 'Ngọn lửa hồi sinh',
    shortAbility: '1 lần/trận: Hồi sạch thương tích về 0 · Thắng nếu sống cuối trận',
  },
  'lang-cuu-ho': {
    codeName: 'Bách "Cuồng Chiến"',
    title: 'Charles · 11 HP',
    accentHex: '#fb923c',
    motif: 'Dấu ấn Đẫm Máu',
    shortAbility: 'Tự mất 2 máu để chém bồi đòn thứ 2 · Thắng khi giết xác >= 3',
  },
  'lang-tien-phong': {
    codeName: 'Đạt "Cảm Tử"',
    title: 'Daniel · 13 HP',
    accentHex: '#2dd4bf',
    motif: 'Còi báo động Cảm Tử',
    shortAbility: 'Tự lộ khi có người đầu tiên ngã · Thắng nếu chết ĐẦU TIÊN',
  },
  exp1_wendigo: {
    codeName: 'Wendigo',
    title: 'Shadow MR1 · 14 HP',
    accentHex: '#e11d48',
    motif: 'Nanh Băng Tiệc Thịt',
    shortAbility: 'Khi người khác bị loại: lật vai hoặc đang lật hồi 1 HP',
  },
  exp2_g43: {
    codeName: 'G43',
    title: 'Hunter MR2 · 14 HP',
    accentHex: '#10b981',
    motif: 'Giáp Thép Pháo Đài',
    shortAbility: 'Nội tại sau lật vai: Giảm 2 sát thương từ đòn tấn công',
  },
  exp2_fiona: {
    codeName: 'Fiona',
    title: 'Hunter MR2 · 12 HP',
    accentHex: '#22d3ee',
    motif: 'Lưỡi Dao Giải Phẫu',
    shortAbility: 'Khi tấn công (đã lật vai): Tung xúc xắc 2 lần & chọn 1 kết quả',
  },
  exp2_wyvern: {
    codeName: 'Wyvern',
    title: 'Shadow MR2 · 14 HP',
    accentHex: '#c084fc',
    motif: 'Cánh Rồng Hấp Thụ',
    shortAbility: 'Hạ mục tiêu bằng đòn đánh: Hồi 5 HP (Hunter/Neutral) hoặc đầy máu (Shadow)',
  },
  exp1_gayle: {
    codeName: 'Gayle',
    title: 'Hunter MR1 · 14 HP',
    accentHex: '#38bdf8',
    motif: 'Găng Đấu Sĩ Thực Tập',
    shortAbility: 'Khi tấn công (đã lật vai): Có thể đổ lại xúc xắc đánh 1 lần (bắt buộc lấy lần 2)',
  },
  exp1_felicia: {
    codeName: 'Felicia',
    title: 'Hunter MR1 · 12 HP',
    accentHex: '#34d399',
    motif: 'Bộ Thẻ Tháo Vát',
    shortAbility: 'Khi rút bài Trắng/Đen (đã lật vai): Rút 2 chọn 1, hủy lá còn lại',
  },
  exp1_victor: {
    codeName: 'Victor',
    title: 'Shadow MR1 · 13 HP',
    accentHex: '#f97316',
    motif: 'Ống Nghiệm Bác Học Điên',
    shortAbility: 'Khi đánh trúng (≥ 2 HP, đã lật vai): Trả 1 HP để +2 ST cho 1 mục tiêu',
  },
  exp1_undying: {
    codeName: 'Undying',
    title: 'Shadow MR1 · 11 HP',
    accentHex: '#94a3b8',
    motif: 'Lớp Giáp Mạ Sắt',
    shortAbility: 'Khi nhận ≥ 2 ST (đòn đánh/kỹ năng/thẻ): Lật vai hoặc đang lật giảm 1 ST',
  },
  exp1_elysia: {
    codeName: 'Elysia',
    title: 'Hunter MR1 · 10 HP',
    accentHex: '#22d3ee',
    motif: 'Kiếm Sĩ Phản Công',
    shortAbility: 'Đánh trúng gây 1–2 ST (trước phòng thủ): Có thể cộng thêm +2 ST',
  },
  exp2_unchained: {
    codeName: 'Unchained',
    title: 'Shadow MR2 · 11 HP',
    accentHex: '#f43f5e',
    motif: 'Xiềng Xích Phá Vỡ',
    shortAbility: 'Nội tại sau lật vai: Đòn tấn công trúng gây thêm +2 sát thương',
  },
  exp2_warlock: {
    codeName: 'Warlock',
    title: 'Shadow MR2 · 14 HP',
    accentHex: '#a855f7',
    motif: 'Cổ Ngữ Sân Bóng (10)',
    shortAbility: 'Nội tại sau lật vai: Đứng tại Sân Bóng (10) đánh trúng gây thêm +3 ST',
  },
  exp2_witch: {
    codeName: 'Witch',
    title: 'Shadow MR2 · 14 HP',
    accentHex: '#c084fc',
    motif: 'Màn Sương Hành Lang (9)',
    shortAbility: 'Nội tại sau lật vai: Miễn toàn bộ sát thương HP khi đứng tại Hành Lang (9)',
  },
  exp2_father_harrison: {
    codeName: 'Father Harrison',
    title: 'Hunter MR2 · 12 HP',
    accentHex: '#fbbf24',
    motif: 'Đèn Lồng Lễ Chủ Nhật',
    shortAbility: 'Pha di chuyển (đã lật vai): Chọn bước thẳng vào Sảnh Tầng 1 (6) thay vì đổ xúc xắc',
  },
  exp2_gloria: {
    codeName: 'Gloria',
    title: 'Hunter MR2 · 14 HP',
    accentHex: '#34d399',
    motif: 'Phước Lành Thẻ Trắng',
    shortAbility: 'Nội tại sau lật vai: Rút 2 thẻ Trắng tuần tự khi đi vào Sảnh Tầng 1 (6)',
  },
  exp1_cindy: {
    codeName: 'Cindy',
    title: 'Neutral MR1 · 11 HP',
    accentHex: '#e879f9',
    motif: 'Phản Đòn Ác Mộng',
    shortAbility: 'Khi nhận ≥ 1 ST & còn sống: Lật vai hoặc đang lật phản kích 1 ST · Thắng khi chỉ còn mình là Neutral sống',
  },
  exp1_bipolar: {
    codeName: 'Bipolar',
    title: 'Neutral MR1 · 10 HP',
    accentHex: '#f59e0b',
    motif: 'Đồng Xu Định Mệnh',
    shortAbility: '1 lần/trận (đầu lượt): Chọn tự hồi hoặc tự nhận d4+2 ST · Thắng khi sống (Hunter thắng) hoặc chết (Shadow thắng)',
  },
  exp1_fallen: {
    codeName: 'Fallen',
    title: 'Hunter MR1 · 12 HP',
    accentHex: '#34d399',
    motif: 'Áo Choàng Chống Cự',
    shortAbility: 'Chỉ tự lật khi ≥ 8 HP · Nội tại khi ≥ 8 HP: Đòn tấn công trúng +2 ST',
  },
  exp1_fea: {
    codeName: 'Fea',
    title: 'Hunter MR1 · 12 HP',
    accentHex: '#2dd4bf',
    motif: 'Xúc Xắc Chỉnh Phục',
    shortAbility: 'Sau khi lật vai: Điều chỉnh +/-1 nút xúc xắc di chuyển (trong [2..10])',
  },
  exp2_eleanor: {
    codeName: 'Eleanor',
    title: 'Hunter MR2 · 10 HP',
    accentHex: '#10b981',
    motif: 'Hồ Sơ Thẩm Vấn',
    shortAbility: 'Pha tấn công (đã lật vai): Rút 1 thẻ Khám Phá (Xanh) thay cho tấn công',
  },
  exp2_fujiko: {
    codeName: 'Fujiko',
    title: 'Hunter MR2 · 12 HP',
    accentHex: '#22d3ee',
    motif: 'Lưỡi Kiếm Kết Liễu',
    shortAbility: 'Đánh trúng gây ≥ 1 ST lên mục tiêu đã lộ diện có ≤ 4 HP trước đòn đánh → hạ gục tức thì',
  },
  exp1_udi: {
    codeName: 'Udi',
    title: 'Shadow MR1 · 11 HP',
    accentHex: '#a855f7',
    motif: 'Bóng Ẩn Đám Đông',
    shortAbility: 'Nội tại sau lật vai: Không thể bị tấn công trực tiếp khi có ≥ 2 người khác cùng Cụm',
  },
  exp1_wrath: {
    codeName: 'Wrath',
    title: 'Shadow MR1 · 14 HP',
    accentHex: '#f43f5e',
    motif: 'Hỏa Ngục Thịnh Nộ',
    shortAbility: 'Đầu lượt (đã lật vai): Có thể gây 2 ST kỹ năng lên mọi người chơi khác cùng Cụm',
  },
  exp1_vengeance: {
    codeName: 'Vengeance',
    title: 'Shadow MR1 · 13 HP',
    accentHex: '#e11d48',
    motif: 'Xiềng Báo Thù',
    shortAbility: '1 lần/trận sau khi hạ gục người khác: Chọn 2 người chơi khác cùng chịu 1d4 ST kỹ năng',
  },
  exp2_visions: {
    codeName: 'Visions',
    title: 'Shadow MR2 · 13 HP',
    accentHex: '#c084fc',
    motif: 'Con Mắt Ám Ảnh',
    shortAbility: '1 lần/trận (đầu lượt): Đánh dấu 1 người — cấm đánh họ nhưng họ mất 1 HP mỗi đầu lượt sau của bạn',
  },
  exp2_cruz: {
    codeName: 'Cruz',
    title: 'Neutral MR2 · 11 HP',
    accentHex: '#f59e0b',
    motif: 'Lá Bài Đen Đáy Chồng',
    shortAbility: 'Đổi thẻ Đen (đặt đáy, rút lại 1 lần) · Thắng khi hạ gục người trong lượt dùng Dơi/Nhện/Kíp Nổ/Búp Bê',
  },
  exp2_bryon: {
    codeName: 'Bryon',
    title: 'Neutral MR2 · 10 HP',
    accentHex: '#cbd5e1',
    motif: 'Rương Trang Bị Hào Phóng',
    shortAbility: 'Trước khi đánh: Tặng trang bị (trừ Masamune) cho Neutral lộ diện cùng Cụm · Thắng khi không Neutral nào chết',
  },
  exp2_elise: {
    codeName: 'Elise',
    title: 'Hunter MR2 · 10 HP',
    accentHex: '#34d399',
    motif: 'Âm Hưởng Hồi Phục',
    shortAbility: '1 lần/trận: Phân bổ tổng 5 HP hồi máu cho người chơi cùng Cụm (gồm bản thân)',
  },
  exp2_umibozu: {
    codeName: 'Umibozu',
    title: 'Shadow MR2 · 11 HP',
    accentHex: '#a855f7',
    motif: 'Sóng Ngầm Lộ Diện',
    shortAbility: '1 lần/trận khi lộ diện còn sống: Gây 3 ST kỹ năng lên mọi người chơi khác cùng Cụm',
  },
  exp2_urban_legend: {
    codeName: 'Urban Legend',
    title: 'Shadow MR2 · 11 HP',
    accentHex: '#f43f5e',
    motif: 'Chuyện Kinh Dị KTX',
    shortAbility: 'Nội tại / Lật phản ứng: Sát thương từ thẻ Đen dùng 1 lần chuyển thành hồi máu',
  },
  exp2_arlene: {
    codeName: 'Arlene',
    title: 'Neutral MR2 · 8 HP',
    accentHex: '#fbbf24',
    motif: 'Mặt Nạ Điệu Bộ',
    shortAbility: 'Phản ứng thẻ Xanh như Shadow (không lộ vai) · Thắng tức thì nếu bị Hunter hạ gục',
  },
  exp1_ernest: {
    codeName: 'Ernest',
    title: 'Hunter MR1 · 10 HP',
    accentHex: '#10b981',
    motif: 'Huyết Ấn Từ Đạo',
    shortAbility: '1 lần/trận (còn ≥ 3 HP): Trả 2 HP ép toàn bộ Shadow lộ diện & hủy sạch trang bị của họ',
  },
  exp1_gwendolen: {
    codeName: 'Gwendolen',
    title: 'Hunter MR1 · 14 HP',
    accentHex: '#34d399',
    motif: 'Khiên Thép Che Chở',
    shortAbility: 'Nội tại sau lật vai: Phản công kẻ đánh Hunter/Neutral đã lộ diện trong cùng Cụm',
  },
  exp2_freyja: {
    codeName: 'Freyja',
    title: 'Hunter MR2 · 12 HP',
    accentHex: '#2dd4bf',
    motif: 'Chiến Kích Liều Lĩnh',
    shortAbility: 'Sau khi tấn công: Bỏ từng trang bị (trừ Masamune) để tung thêm 1 đòn đánh thưởng',
  },
  exp2_warlord: {
    codeName: 'Warlord',
    title: 'Shadow MR2 · 14 HP',
    accentHex: '#e11d48',
    motif: 'Xích Sắt Chiến Tranh',
    shortAbility: '1 lần/trận (Pha 1): Kéo 1 người tới ô bạn & tung đòn đánh thưởng, sau đó chơi tiếp bình thường',
  },
  exp2_usurper: {
    codeName: 'Usurper',
    title: 'Shadow MR2 · 11 HP',
    accentHex: '#c084fc',
    motif: 'Vương Miện Soán Ngôi',
    shortAbility: 'Hào quang cấm người khác hồi máu bằng Kỹ năng/Thẻ Trắng · Có thể lật vai chặn ngay 1 lần hồi',
  },
  exp1_angel: {
    codeName: 'Angel',
    title: 'Neutral MR1 · 8 HP',
    accentHex: '#fde047',
    motif: 'Đôi Cánh Thiên Sứ',
    shortAbility: '1 lần/trận: Đầu lượt sau bảo vệ miễn sát thương toàn bộ Neutral lộ diện · Thắng: đủ Neutral sống hoặc đứng Church',
  },
  exp2_bianca: {
    codeName: 'Bianca',
    title: 'Neutral MR2 · 10 HP',
    accentHex: '#e2e8f0',
    motif: 'Kho Phế Liệu Khiên Chắn',
    shortAbility: 'Bỏ 1 trang bị (trừ Masamune) vô hiệu hóa nguồn ST đơn mục tiêu · Thắng khi có HP thấp nhất cuối trận',
  },
  exp2_dalton: {
    codeName: 'Dalton',
    title: 'Neutral MR2 · 13 HP',
    accentHex: '#f59e0b',
    motif: 'Găng Tay Vòng 12',
    shortAbility: 'Bắt buộc lộ diện khi ≤ 12 HP & cấm tự hồi máu · Thắng tức thì nếu hạ gục sau kích hoạt hoặc nhiều máu nhất cuối trận',
  },
  exp2_gideon: {
    codeName: 'Gideon',
    title: 'Hunter MR2 · 14 HP',
    accentHex: '#38bdf8',
    motif: 'Phần Thưởng Nhiệm Vụ',
    shortAbility: 'Sau khi 1 Shadow bị hạ gục (đã lộ diện): Rút và sử dụng tuần tự 3 thẻ Cung Ứng (Trắng)',
  },
  exp1_anathema: {
    codeName: 'Anathema',
    title: 'Neutral MR1 · 8 HP',
    accentHex: '#c084fc',
    motif: 'Sợi Chỉ Lời Nguyền',
    shortAbility: '1 lần/trận (đầu lượt): Lộ diện & nguyền 1 người gánh sát thương thay mình đến khi họ chết (cuối lượt tự chịu 1 ST)',
  },
  exp1_bethany: {
    codeName: 'Bethany',
    title: 'Neutral MR1 · 10 HP',
    accentHex: '#f59e0b',
    motif: 'Tín Vật Người Được Chọn',
    shortAbility: 'Trao 1 trang bị (trừ Masamune) để chỉ định Người được chọn, hoặc người khác tặng đồ trở thành Người được chọn · Thắng khi họ thắng',
  },
  exp1_arnold: {
    codeName: 'Arnold',
    title: 'Neutral MR1 · 8 HP',
    accentHex: '#e2e8f0',
    motif: 'Gương Đảo Nghịch Vận Mệnh',
    shortAbility: '1 lần/trận: Hủy sát thương chí mạng (giữ nguyên HP) và phản toàn bộ sát thương đó sang kẻ gây ra · Thắng nếu sống cùng > 2 người',
  },
  exp1_cassie: {
    codeName: 'Cassie',
    title: 'Neutral MR1 · 11 HP',
    accentHex: '#fbbf24',
    motif: 'Trái Tim Cộng Hưởng',
    shortAbility: 'Đầu lượt hồi 1 HP cho 1 người bất kỳ · Sao chép điều kiện thắng của Neutral khác đầu tiên lộ diện',
  },
  exp1_clairvoyant: {
    codeName: 'Clairvoyant',
    title: 'Neutral MR1 · 11 HP',
    accentHex: '#818cf8',
    motif: 'Gương Soi Tiên Tri',
    shortAbility: '1 lần/trận (đầu lượt): Xem bí mật vai 1 người chưa lộ diện và sao chép điều kiện thắng của họ',
  },
  exp2_april_skipps: {
    codeName: 'April & Skipps',
    title: 'Neutral MR2 · 8 HP',
    accentHex: '#fde047',
    motif: 'Đèn Báo Động Ô Số 7',
    shortAbility: 'Bắt buộc lộ diện khi chạm đúng 7 vết thương (1 HP) → thắng nếu trụ hết lượt kế của mình; hoặc giữ kín vai tới hết trận',
  },
  exp2_colt: {
    codeName: 'Colt',
    title: 'Neutral MR2 · 11 HP',
    accentHex: '#f97316',
    motif: 'Khẩu Súng Đường Phố',
    shortAbility: 'Phản công kẻ cướp đồ (≥ 2 ST có thể đòi lại món bị cướp) · Thắng tức thì khi sở hữu ≥ 3 vũ khí chuẩn',
  },
  exp2_diana: {
    codeName: 'Diana',
    title: 'Neutral MR2 · 13 HP',
    accentHex: '#f472b6',
    motif: 'Khế Ước Khách Hàng',
    shortAbility: 'Neutral khác đầu tiên lộ diện trở thành Khách hàng từ đầu lượt kế của họ (cần sống & họ thắng; không có thì đầy máu cuối trận)',
  },
  exp2_aaron: {
    codeName: 'Aaron',
    title: 'Neutral MR2 · 8 HP',
    accentHex: '#fb7185',
    motif: 'Song Quang Định Mệnh',
    shortAbility: 'Nhân vật nữ đầu tiên lộ diện trở thành Vợ (cấm tấn công vợ · cùng sống cuối trận; không có vợ thì chết trước hết trận)',
  },
};

export interface LocationVisualMeta {
  name: string;
  shortName: string;
  clusterId: BoardGameZoneClusterId;
  clusterTitle: string;
  diceLabel: string;
  accentHex: string;
  bgGradient: string;
  actionIcon: string;
  actionTitle: string;
  actionDesc: string;
  badgeText: string;
}

export const LOCATION_VISUAL_META: Record<BoardGameLocationId, LocationVisualMeta> = {
  radio: {
    name: 'Trạm Radio KTX',
    shortName: 'Radio',
    clusterId: 'north',
    clusterTitle: 'Cụm Bắc',
    diceLabel: '2–3',
    accentHex: '#10b981',
    bgGradient: 'from-emerald-950/90 via-slate-900/95 to-slate-950',
    actionIcon: '🔍',
    actionTitle: 'Rút Thẻ Khám Phá',
    actionDesc: 'Rút 1 Thẻ Khám Phá (đưa kín 1-đối-1)',
    badgeText: 'Khám Phá',
  },
  breaker: {
    name: 'Cổng Hầm KTX',
    shortName: 'Cổng Hầm',
    clusterId: 'north',
    clusterTitle: 'Cụm Bắc',
    diceLabel: '4–5',
    accentHex: '#f59e0b',
    bgGradient: 'from-amber-950/85 via-slate-900/95 to-slate-950',
    actionIcon: '🃏',
    actionTitle: 'Tự Chọn 1 Chồng Bài',
    actionDesc: 'Chọn rút 1 thẻ Khám Phá, Cung Ứng hoặc Đột Kích',
    badgeText: 'Tự Chọn',
  },
  lobby: {
    name: 'Sảnh Tầng 1',
    shortName: 'Sảnh',
    clusterId: 'central',
    clusterTitle: 'Cụm Trung Tâm',
    diceLabel: '6',
    accentHex: '#06b6d4',
    bgGradient: 'from-cyan-950/90 via-slate-900/95 to-slate-950',
    actionIcon: '🛡️',
    actionTitle: 'Rút Thẻ Cung Ứng',
    actionDesc: 'Rút 1 Thẻ Cung Ứng (Trang bị / Hồi sức)',
    badgeText: 'Cung Ứng',
  },
  canteen: {
    name: 'Khu Sân Cũ Đêm',
    shortName: 'Sân Cũ',
    clusterId: 'central',
    clusterTitle: 'Cụm Trung Tâm',
    diceLabel: '8',
    accentHex: '#f43f5e',
    bgGradient: 'from-rose-950/85 via-slate-900/95 to-slate-950',
    actionIcon: '⚡',
    actionTitle: 'Rút Thẻ Đột Kích',
    actionDesc: 'Rút 1 Thẻ Đột Kích (Vũ khí / Sự kiện)',
    badgeText: 'Đột Kích',
  },
  corridor: {
    name: 'Hành Lang Tầng 4',
    shortName: 'Hành Lang',
    clusterId: 'south',
    clusterTitle: 'Cụm Nam',
    diceLabel: '9',
    accentHex: '#8b5cf6',
    bgGradient: 'from-violet-950/85 via-slate-900/95 to-slate-950',
    actionIcon: '💥',
    actionTitle: 'Gây 2 ST hoặc Hồi 1 Máu',
    actionDesc: 'Chọn 1 người bất kỳ: Gây 2 sát thương HOẶC Hồi 1 thương tích',
    badgeText: '2 ST / Hồi 1',
  },
  court: {
    name: 'Sân Bóng Rổ Đêm',
    shortName: 'Sân Bóng',
    clusterId: 'south',
    clusterTitle: 'Cụm Nam',
    diceLabel: '10',
    accentHex: '#38bdf8',
    bgGradient: 'from-sky-950/90 via-slate-900/95 to-slate-950',
    actionIcon: '🧤',
    actionTitle: 'Cướp 1 Trang Bị',
    actionDesc: 'Lấy 1 Trang bị đang đeo từ đối thủ bất kỳ',
    badgeText: 'Cướp Đồ',
  },
};

const CLUSTER_STYLE_META: Record<
  BoardGameZoneClusterId,
  { title: string; ringClass: string; badgeClass: string }
> = {
  north: {
    title: 'Cụm 1',
    ringClass: 'border-emerald-400/35 bg-emerald-950/20',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  },
  central: {
    title: 'Cụm 2',
    ringClass: 'border-cyan-400/35 bg-cyan-950/20',
    badgeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
  },
  south: {
    title: 'Cụm 3',
    ringClass: 'border-violet-400/35 bg-violet-950/20',
    badgeClass: 'bg-violet-500/20 text-violet-200 border-violet-400/40',
  },
};

export const BOARD_CLUSTERS_ORDER: readonly {
  clusterId: BoardGameZoneClusterId;
  title: string;
  subtitle: string;
  ringClass: string;
  badgeClass: string;
  locations: readonly [BoardGameLocationId, BoardGameLocationId];
}[] = [
  {
    clusterId: 'north',
    ...CLUSTER_STYLE_META.north,
    subtitle: '2–3 Radio · 4–5 Cổng Hầm',
    locations: ['radio', 'breaker'],
  },
  {
    clusterId: 'central',
    ...CLUSTER_STYLE_META.central,
    subtitle: '6 Sảnh · 8 Sân Cũ',
    locations: ['lobby', 'canteen'],
  },
  {
    clusterId: 'south',
    ...CLUSTER_STYLE_META.south,
    subtitle: '9 Hành Lang · 10 Sân Bóng',
    locations: ['corridor', 'court'],
  },
];

export function buildBoardClustersView(clusterPairs?: readonly BoardGameClusterPair[]) {
  if (!clusterPairs || clusterPairs.length === 0) return BOARD_CLUSTERS_ORDER;
  return clusterPairs.map((pair) => {
    const a = LOCATION_VISUAL_META[pair.locationIds[0]];
    const b = LOCATION_VISUAL_META[pair.locationIds[1]];
    return {
      clusterId: pair.clusterId,
      ...CLUSTER_STYLE_META[pair.clusterId],
      subtitle: `${a.diceLabel} ${a.shortName} · ${b.diceLabel} ${b.shortName}`,
      locations: pair.locationIds,
    };
  });
}

export const BOARD_GRID_ORDER: readonly BoardGameLocationId[] = [
  'radio',
  'breaker',
  'lobby',
  'canteen',
  'corridor',
  'court',
];

export const SEAT_RING_PALETTE: readonly string[] = [
  '#38bdf8', // seat 0 - sky
  '#fbbf24', // seat 1 - amber
  '#a78bfa', // seat 2 - violet
  '#34d399', // seat 3 - emerald
  '#fb7185', // seat 4 - rose
  '#f472b6', // seat 5 - pink
  '#2dd4bf', // seat 6 - teal
  '#fb923c', // seat 7 - orange
];

export function FactionCrestSvg({
  faction,
  size = 24,
}: {
  faction: BoardGameFactionId | null;
  size?: number;
}) {
  if (faction === 'lantern-guard') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M16 3L27 8V16.5C27 23.2 22.1 27.6 16 29.5C9.9 27.6 5 23.2 5 16.5V8L16 3Z"
          fill="#064e3b"
          stroke="#34d399"
          strokeWidth="2.2"
        />
        <circle cx="16" cy="16" r="5" fill="#6ee7b7" />
        <path d="M16 7.5V10.5M16 21.5V24.5M9.5 16H12.5M19.5 16H22.5" stroke="#a7f3d0" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (faction === 'mist-order') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="#4c0519" stroke="#fb7185" strokeWidth="2.2" />
        <path
          d="M19.5 9.5C15.8 10 13 13 13 16.5C13 20 15.8 22.8 19.8 23.2C14.8 24.4 9.5 21.2 9.5 16C9.5 10.8 14.5 7.8 19.5 9.5Z"
          fill="#fda4af"
        />
        <circle cx="21.5" cy="13" r="2" fill="#ffe4e6" />
      </svg>
    );
  }
  if (faction === 'wanderer') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <polygon points="16,3 29,16 16,29 3,16" fill="#451a03" stroke="#fbbf24" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="4.5" fill="#fde68a" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#1e293b" stroke="#64748b" strokeWidth="2" strokeDasharray="3 2" />
      <text x="16" y="21" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="800">
        ?
      </text>
    </svg>
  );
}

export function RolePortraitSvg({
  roleId,
  faction,
  size = 44,
}: {
  roleId: BoardGameRoleId | null;
  faction: BoardGameFactionId | null;
  size?: number;
}) {
  const accent =
    roleId && ROLE_VISUAL_META[roleId]
      ? ROLE_VISUAL_META[roleId].accentHex
      : faction
        ? FACTION_THEME[faction].accent
        : '#94a3b8';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#0f172a" stroke={accent} strokeWidth="2.2" />
      <circle cx="24" cy="18" r="7.5" fill={accent} fillOpacity="0.28" stroke={accent} strokeWidth="2" />
      <path
        d="M11 40C12.2 32.8 17.5 29 24 29C30.5 29 35.8 32.8 37 40"
        fill={accent}
        fillOpacity="0.22"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {roleId === 'gac-radio' && (
        <path d="M16 18C16 12.5 32 12.5 32 18" stroke="#e0f2fe" strokeWidth="2.2" strokeLinecap="round" />
      )}
      {roleId === 'suong-tin-gia' && (
        <path d="M25 8L20 17H26L22 25" stroke="#fecdd3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {roleId === 'lang-anh-san' && (
        <rect x="28" y="29" width="9" height="7" rx="2" fill="#fbbf24" />
      )}
      {roleId === 'lang-cuu-ho' && (
        <path d="M18 35L30 27" stroke="#fb7185" strokeWidth="2.4" strokeLinecap="round" />
      )}
      {roleId === 'lang-tien-phong' && (
        <circle cx="34" cy="14" r="4" fill="#2dd4bf" />
      )}
    </svg>
  );
}

export function LocationSceneSvg({
  location,
  size = 44,
}: {
  location: BoardGameLocationId;
  size?: number;
}) {
  const accent = LOCATION_VISUAL_META[location].accentHex;
  switch (location) {
    case 'radio':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#052e2b" stroke={accent} strokeWidth="1.8" />
          <path d="M24 38V18M17 38H31" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="15" r="3.5" fill="#34d399" />
          <path d="M16 12C12.5 15.5 12.5 21.5 16 25M32 12C35.5 15.5 35.5 21.5 32 25" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'breaker':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#2f0a17" stroke={accent} strokeWidth="1.8" />
          <rect x="13" y="10" width="22" height="28" rx="3" fill="#4c0519" stroke="#fb7185" strokeWidth="2" />
          <path d="M26 15L19 25H25L22 33" stroke="#fde047" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'lobby':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#082f49" stroke={accent} strokeWidth="1.8" />
          <rect x="11" y="13" width="26" height="24" rx="2.5" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2" />
          <rect x="18" y="21" width="12" height="16" fill="#0284c7" />
          <circle cx="24" cy="17" r="2.2" fill="#fde68a" />
        </svg>
      );
    case 'canteen':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#3b2004" stroke={accent} strokeWidth="1.8" />
          <path d="M14 21H30V31C30 34.5 27 37 22 37C17 37 14 34.5 14 31V21Z" fill="#f59e0b" />
          <path d="M30 23H33.5C35.2 23 36.5 24.3 36.5 26C36.5 27.7 35.2 29 33.5 29H30" stroke="#fde68a" strokeWidth="2.2" />
          <path d="M19 13V17M24 12V17" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'corridor':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#1e1b4b" stroke={accent} strokeWidth="1.8" />
          <path d="M24 11V37M14 24H34" stroke="#34d399" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="35" cy="14" r="4.5" fill="#f43f5e" />
        </svg>
      );
    case 'court':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#0f2942" stroke={accent} strokeWidth="1.8" />
          <circle cx="24" cy="24" r="11" fill="#ea580c" stroke="#fdba74" strokeWidth="2" />
          <path d="M13 24H35M24 13V35M17 16C21 20 21 28 17 32M31 16C27 20 27 28 31 32" stroke="#431407" strokeWidth="1.6" />
        </svg>
      );
  }
}

export function DeckCardBackSvg({
  deck,
  size = 44,
}: {
  deck: BoardGameDeckId;
  size?: number;
}) {
  const palette =
    deck === 'investigation'
      ? { bg: '#064e3b', border: '#10b981', glow: 'rgba(16,185,129,0.28)', glyph: '🔍' }
      : deck === 'equipment'
        ? { bg: '#0c4a6e', border: '#38bdf8', glow: 'rgba(56,189,248,0.28)', glyph: '🛡️' }
        : { bg: '#4c0519', border: '#f43f5e', glow: 'rgba(244,63,94,0.28)', glyph: '⚡' };
  const h = Math.round(size * 1.36);
  return (
    <div
      style={{
        width: size,
        height: h,
        backgroundColor: palette.bg,
        borderColor: palette.border,
        boxShadow: `0 3px 0 #020617, 0 5px 12px ${palette.glow}`,
      }}
      className="relative shrink-0 overflow-hidden rounded-lg border-2 flex flex-col items-center justify-center select-none"
      aria-hidden="true"
    >
      <img
        src={MIDNIGHT_CARD_BACK_ART}
        alt=""
        width={720}
        height={1080}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity"
      />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${palette.bg}99, rgba(2,6,23,0.75))` }}
      />
      <span className="relative z-10 text-sm leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
        {palette.glyph}
      </span>
    </div>
  );
}

export function DiceD6Svg({ value, size = 44 }: { value: number; size?: number }) {
  const v = Math.max(1, Math.min(6, Math.round(value)));
  const pips: Record<number, readonly [number, number][]> = {
    1: [[24, 24]],
    2: [
      [15, 15],
      [33, 33],
    ],
    3: [
      [15, 15],
      [24, 24],
      [33, 33],
    ],
    4: [
      [15, 15],
      [33, 15],
      [15, 33],
      [33, 33],
    ],
    5: [
      [15, 15],
      [33, 15],
      [24, 24],
      [15, 33],
      [33, 33],
    ],
    6: [
      [15, 13],
      [33, 13],
      [15, 24],
      [33, 24],
      [15, 35],
      [33, 35],
    ],
  };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label={`1d6 ra ${v}`}>
      <rect x="3" y="3" width="42" height="42" rx="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2.5" />
      {(pips[v] ?? pips[1]).map(([cx, cy], idx) => (
        <circle key={idx} cx={cx} cy={cy} r="3.8" fill={v === 1 ? '#e11d48' : '#0f172a'} />
      ))}
    </svg>
  );
}

export function DiceD4Svg({ value, size = 44 }: { value: number; size?: number }) {
  const v = Math.max(1, Math.min(4, Math.round(value)));
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label={`1d4 ra ${v}`}>
      <polygon
        points="24,4 44,41 4,41"
        fill="#f59e0b"
        stroke="#fef3c7"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text
        x="24"
        y="34"
        textAnchor="middle"
        fill="#1e1b4b"
        fontSize="18"
        fontWeight="900"
      >
        {v}
      </text>
    </svg>
  );
}

const GENERIC_PAWN_PREFIXES = new Set(['SINH', 'VIEN', 'SV', 'BAN', 'NGUOI', 'CHOI']);

function toAsciiUpper(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Derives a distinct 2-character badge from a Vietnamese/campus player display name
 * (ignoring generic prefixes like "Sinh viên" or trailing cohort tags like "K67").
 */
function derivePawnLabel(displayName: string, seatIndex: number): string {
  const rawParts = displayName.trim().split(/[\s_-]+/).filter(Boolean);
  if (rawParts.length === 0) return `P${seatIndex + 1}`;

  if (rawParts.length >= 2 && /^\d+$/.test(rawParts[rawParts.length - 1])) {
    const firstChar = toAsciiUpper(rawParts[0]).slice(0, 1) || 'P';
    return `${firstChar}${rawParts[rawParts.length - 1].slice(-1)}`;
  }

  let parts = [...rawParts];
  while (parts.length > 1 && GENERIC_PAWN_PREFIXES.has(toAsciiUpper(parts[0]))) {
    parts = parts.slice(1);
  }
  while (parts.length > 1 && /^(K\d{1,3}|\d+P|HUST|BKHN|BK)$/.test(toAsciiUpper(parts[parts.length - 1]))) {
    parts = parts.slice(0, -1);
  }

  const lastAscii = toAsciiUpper(parts[parts.length - 1]);
  if (/^[A-Z]\d$/.test(lastAscii)) {
    return lastAscii;
  }
  if (parts.length >= 2) {
    const prevAscii = toAsciiUpper(parts[parts.length - 2]);
    const combined = `${prevAscii.slice(0, 1)}${lastAscii.slice(0, 1)}`;
    if (combined.length > 0) return combined;
  }
  return lastAscii.slice(0, 2) || `P${seatIndex + 1}`;
}

export const PlayerPawnToken = React.memo(function PlayerPawnToken({
  displayName,
  seatIndex,
  alive,
  isActive,
  isSelf,
  revealedFaction,
  revealedRoleId = null,
  compact = false,
  elevated = true,
  size,
}: {
  displayName: string;
  seatIndex: number;
  alive: boolean;
  isActive: boolean;
  isSelf: boolean;
  revealedFaction: BoardGameFactionId | null;
  revealedRoleId?: BoardGameRoleId | null;
  compact?: boolean;
  elevated?: boolean;
  size?: '2xs' | 'xs' | 'sm' | 'md';
}) {
  const ringHex = SEAT_RING_PALETTE[seatIndex % SEAT_RING_PALETTE.length];
  const initial = derivePawnLabel(displayName, seatIndex);
  const resolvedSize = size ?? (compact ? 'sm' : 'md');
  const sizeClass =
    resolvedSize === '2xs'
      ? 'w-5 h-5 text-[10px]'
      : resolvedSize === 'xs'
        ? 'w-7 h-7 text-[10px]'
        : resolvedSize === 'sm'
          ? 'w-8 h-8 text-[11px]'
          : 'w-10 h-10 text-xs';
  const dotClass =
    resolvedSize === '2xs'
      ? 'w-2 h-2 -bottom-0.5 -right-0.5 border'
      : resolvedSize === 'xs'
        ? 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 border'
        : 'w-3.5 h-3.5 -bottom-1 -right-1 border-2';
  const factionBg =
    revealedFaction === 'lantern-guard'
      ? 'bg-emerald-700'
      : revealedFaction === 'mist-order'
        ? 'bg-rose-700'
        : revealedFaction === 'wanderer'
          ? 'bg-amber-700'
          : 'bg-slate-800';
  const portraitSrc = revealedRoleId ? MIDNIGHT_CHARACTER_ART[revealedRoleId] ?? null : null;
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => {
    setImgError(false);
  }, [portraitSrc]);

  return (
    <div
      data-pawn-revealed={revealedRoleId ? 'true' : 'false'}
      style={{
        borderColor: alive ? ringHex : '#475569',
        boxShadow: elevated
          ? `0 3px 0 #020617, 0 5px 10px rgba(2, 6, 23, 0.78), inset 0 1px 1px rgba(255,255,255,0.28)`
          : undefined,
      }}
      className={`relative shrink-0 rounded-full border-2 ${sizeClass} ${factionBg} ${
        !alive ? 'opacity-50 grayscale' : ''
      } ${
        isActive
          ? resolvedSize === '2xs'
            ? 'ring-1 ring-amber-300 ring-offset-1 ring-offset-slate-950'
            : 'ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-950 scale-105'
          : ''
      } flex items-center justify-center font-black text-white select-none transition-transform`}
      title={displayName}
    >
      {elevated && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-1 inset-x-0.5 h-1.5 rounded-full bg-slate-950/90 blur-[0.5px] -z-10"
        />
      )}
      {portraitSrc && !imgError ? (
        <div className="relative h-full w-full overflow-hidden rounded-full">
          <img
            src={portraitSrc}
            alt={displayName}
            width={720}
            height={1080}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-top"
            draggable={false}
          />
          {!alive && (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/65 text-rose-300 font-black">
              ✕
            </span>
          )}
        </div>
      ) : (
        <span>{alive ? initial : '✕'}</span>
      )}
      {isSelf && (
        <span className={`absolute ${dotClass} rounded-full bg-cyan-400 border-slate-950 shadow`} />
      )}
    </div>
  );
});

/**
 * Khung viền góc khắc kim loại Anime Noir (tái sử dụng cho Thẻ Nhân vật & Thẻ Bài 2:3).
 */
export function MidnightOrnamentFrameSvg({
  primaryHex,
  secondaryHex,
}: {
  primaryHex: string;
  secondaryHex: string;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 240 360"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Viền chỉ mảnh bên trong */}
      <rect
        x="8"
        y="8"
        width="224"
        height="344"
        rx="12"
        stroke={secondaryHex}
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      {/* Góc trên trái */}
      <path
        d="M12 34V16C12 13.8 13.8 12 16 12H36M16 18H28"
        stroke={primaryHex}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Góc trên phải */}
      <path
        d="M204 12H224C226.2 12 228 13.8 228 16V34M212 18H224"
        stroke={secondaryHex}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Góc dưới trái */}
      <path
        d="M12 326V344C12 346.2 13.8 348 16 348H36"
        stroke={secondaryHex}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Góc dưới phải */}
      <path
        d="M204 348H224C226.2 348 228 346.2 228 344V326"
        stroke={primaryHex}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Kim cương trang trí giữa viền trên & dưới */}
      <polygon points="120,4 125,9 120,14 115,9" fill={secondaryHex} fillOpacity="0.9" />
      <polygon points="120,346 125,351 120,356 115,351" fill={primaryHex} fillOpacity="0.85" />
    </svg>
  );
}
