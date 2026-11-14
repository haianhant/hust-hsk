// ---------------------------------------------------------------------------
// features/campus/quests/campus-quests.ts — Chuỗi Nhiệm vụ "Hành trình Sinh viên
// Bách Khoa", Danh hiệu mở khóa & Huy hiệu Trường/Viện (Pure TypeScript, không phụ
// thuộc React/Three.js — hoạt động độc lập cả khi HSK Mode tắt).
// Module ID: feature.campus.quests
// ---------------------------------------------------------------------------

import type { CampusTitleId, SchoolBadgeId } from '../../../lib/playerState';

export const CAMPUS_QUESTS_STORAGE_KEY = 'bkhn_campus_quests_v1';

export type SchoolBadgeDef = {
  id: SchoolBadgeId;
  shortLabel: string;
  fullName: string;
  accentColor: string;
};

export const SCHOOL_BADGES: readonly SchoolBadgeDef[] = [
  { id: 'none', shortLabel: '', fullName: 'Sinh viên Tự do', accentColor: '#64748B' },
  { id: 'soict', shortLabel: 'SoICT · CNTT&TT', fullName: 'Trường CNTT & Truyền thông (SoICT)', accentColor: '#2563EB' },
  { id: 'sme', shortLabel: 'SME · Cơ khí', fullName: 'Trường Cơ khí (SME)', accentColor: '#B91C1C' },
  { id: 'seee', shortLabel: 'SEEE · Điện-ĐT', fullName: 'Trường Điện – Điện tử (SEEE)', accentColor: '#D97706' },
  { id: 'sccls', shortLabel: 'SCLS · Hóa-Sinh', fullName: 'Trường Hóa & Khoa học Sự sống', accentColor: '#059669' },
  { id: 'smse', shortLabel: 'SMSE · Vật liệu', fullName: 'Trường Vật liệu (SMSE)', accentColor: '#7C3AED' },
] as const;

export type CampusTitleDef = {
  id: CampusTitleId;
  label: string;
  shortTag: string;
  color: string;
  unlockByQuestId: string | null;
};

export const CAMPUS_TITLES: readonly CampusTitleDef[] = [
  { id: 'none', label: 'Chưa đeo danh hiệu', shortTag: '', color: '#64748B', unlockByQuestId: null },
  { id: 'tan-binh-bk', label: '🎒 Tân binh Bách Khoa', shortTag: 'Tân binh BK', color: '#0284C7', unlockByQuestId: 'tan-binh-nhap-hoc' },
  { id: 'tho-san-goc-song-ao', label: '📸 Thợ săn Góc Sống Ảo', shortTag: 'Nhiếp ảnh BK', color: '#E11D48', unlockByQuestId: 'goc-song-ao-bk' },
  { id: 'ban-than-ho-tien', label: '🧋 Bạn thân Hồ Tiền', shortTag: 'Chill Hồ Tiền', color: '#0D9488', unlockByQuestId: 'chieu-ho-tien' },
  { id: 'chan-sut-bk', label: '⚽ Chân sút Bách Khoa', shortTag: 'Chân sút BK', color: '#16A34A', unlockByQuestId: 'chan-sut-bach-khoa' },
  { id: 'chien-than-tqb', label: '📚 Chiến thần Tạ Quang Bửu', shortTag: 'Chiến thần TQB', color: '#1D4ED8', unlockByQuestId: 'dem-trang-thu-vien' },
  { id: 'huyen-thoai-bk', label: '🎓 Huyền thoại Bách Khoa', shortTag: 'Huyền thoại BK', color: '#B45309', unlockByQuestId: 'luu-but-ky-yeu' },
] as const;

export type CampusQuestMetricKey =
  | 'checkins'
  | 'cameraMoments'
  | 'chillLake'
  | 'footballGoals'
  | 'libraryVisits'
  | 'memoryActions';

export type CampusLifeQuestDef = {
  id: string;
  order: number;
  icon: string;
  title: string;
  desc: string;
  hint: string;
  metricKey: CampusQuestMetricKey;
  target: number;
  rewardPoints: number;
  rewardTitleId: CampusTitleId;
  unlocksGradCap?: boolean;
  fastTravelId: string;
};

export const CAMPUS_LIFE_QUESTS: readonly CampusLifeQuestDef[] = [
  {
    id: 'tan-binh-nhap-hoc',
    order: 1,
    icon: '🧭',
    title: 'Tân binh Nhập học Bách Khoa',
    desc: 'Check-in ít nhất 2 công trình biểu tượng trong khuôn viên ĐHBK Hà Nội.',
    hint: 'Tới gần các trụ Check-in (Cổng Parabol, C1, Tòa C7, Hồ Tiền, B1...) và bấm E.',
    metricKey: 'checkins',
    target: 2,
    rewardPoints: 20,
    rewardTitleId: 'tan-binh-bk',
    fastTravelId: 'parabol',
  },
  {
    id: 'goc-song-ao-bk',
    order: 2,
    icon: '📸',
    title: 'Thợ săn Góc Sống Ảo HUSTVerse',
    desc: 'Xuất 1 tấm Bưu thiếp Kỷ yếu qua Photo Mode (P) hoặc trải nghiệm Góc nhìn thứ nhất (V).',
    hint: 'Bấm P mở Photo Mode hoặc phím V chuyển Góc nhìn thứ nhất tại Quảng trường C1.',
    metricKey: 'cameraMoments',
    target: 1,
    rewardPoints: 25,
    rewardTitleId: 'tho-san-goc-song-ao',
    fastTravelId: 'c1',
  },
  {
    id: 'chieu-ho-tien',
    order: 3,
    icon: '🧋',
    title: 'Chiều Hồ Tiền & Trà chanh Bách Khoa',
    desc: 'Gọi 1 cốc Trà chanh / Cà phê cầm tay và ngồi nghỉ ngơi trên ghế đá sân trường.',
    hint: 'Ghé quầy Trà chanh (gần Parabol) hoặc Xe Cà phê Hồ Tiền, sau đó bấm E ngồi ghế đá.',
    metricKey: 'chillLake',
    target: 2,
    rewardPoints: 25,
    rewardTitleId: 'ban-than-ho-tien',
    fastTravelId: 'lake',
  },
  {
    id: 'chan-sut-bach-khoa',
    order: 4,
    icon: '⚽',
    title: 'Chân sút SVĐ Bách Khoa',
    desc: 'Ghi ít nhất 1 bàn thắng vào lưới tại Sân vận động Bách Khoa.',
    hint: 'Dịch chuyển tới SVĐ Bách Khoa, dẫn bóng lại gần khung thành và bấm E để sút!',
    metricKey: 'footballGoals',
    target: 1,
    rewardPoints: 30,
    rewardTitleId: 'chan-sut-bk',
    fastTravelId: 'stadium',
  },
  {
    id: 'dem-trang-thu-vien',
    order: 5,
    icon: '📚',
    title: 'Đêm trắng Thư viện Tạ Quang Bửu',
    desc: 'Bước vào đại sảnh Thư viện Tạ Quang Bửu trải nghiệm không gian tự học 10 tầng.',
    hint: 'Đi tới cửa Bắc Thư viện Tạ Quang Bửu (trước chữ HUST) và bấm E bước vào sảnh.',
    metricKey: 'libraryVisits',
    target: 1,
    rewardPoints: 25,
    rewardTitleId: 'chien-than-tqb',
    fastTravelId: 'library',
  },
  {
    id: 'luu-but-ky-yeu',
    order: 6,
    icon: '🎓',
    title: 'Lưu bút Kỷ yếu & Tốt nghiệp',
    desc: 'Ghim 1 lưu bút kỷ niệm hoặc thả tim lưu bút trên Bảng Lưu bút Sân trường.',
    hint: 'Tới Bảng Lưu bút tại Quảng trường C1 / Hồ Tiền / Thư viện TQB và bấm E để viết lưu bút.',
    metricKey: 'memoryActions',
    target: 1,
    rewardPoints: 35,
    rewardTitleId: 'huyen-thoai-bk',
    unlocksGradCap: true,
    fastTravelId: 'c1',
  },
] as const;

export type CampusQuestsState = {
  metrics: Record<CampusQuestMetricKey, number>;
  /** Cờ phụ tránh đếm trùng bước trong nhiệm vụ ghép (vd: gọi nước + ngồi ghế) */
  flags: Record<string, boolean>;
  claimedIds: string[];
};

export function createInitialCampusQuestsState(): CampusQuestsState {
  return {
    metrics: {
      checkins: 0,
      cameraMoments: 0,
      chillLake: 0,
      footballGoals: 0,
      libraryVisits: 0,
      memoryActions: 0,
    },
    flags: {},
    claimedIds: [],
  };
}

export function loadCampusQuestsState(storage?: Pick<Storage, 'getItem'> | null): CampusQuestsState {
  const base = createInitialCampusQuestsState();
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return base;
    const raw = store.getItem(CAMPUS_QUESTS_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<CampusQuestsState>;
    if (parsed.metrics && typeof parsed.metrics === 'object') {
      for (const k of Object.keys(base.metrics) as CampusQuestMetricKey[]) {
        const val = parsed.metrics[k];
        if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
          base.metrics[k] = Math.floor(val);
        }
      }
    }
    if (parsed.flags && typeof parsed.flags === 'object') {
      for (const [k, v] of Object.entries(parsed.flags)) {
        if (typeof v === 'boolean') base.flags[k] = v;
      }
    }
    if (Array.isArray(parsed.claimedIds)) {
      base.claimedIds = parsed.claimedIds.filter((id): id is string => typeof id === 'string');
    }
    return base;
  } catch {
    return base;
  }
}

export function saveCampusQuestsState(
  state: CampusQuestsState,
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    store?.setItem(CAMPUS_QUESTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function recordCampusQuestMetric(
  prev: CampusQuestsState,
  metricKey: CampusQuestMetricKey,
  options?: { setAbsolute?: number; increment?: number; uniqueFlag?: string },
): { next: CampusQuestsState; newlyCompletedQuestIds: string[] } {
  if (options?.uniqueFlag && prev.flags[options.uniqueFlag]) {
    return { next: prev, newlyCompletedQuestIds: [] };
  }
  const currentVal = prev.metrics[metricKey] ?? 0;
  const targetVal =
    typeof options?.setAbsolute === 'number'
      ? Math.max(currentVal, Math.floor(options.setAbsolute))
      : currentVal + Math.max(1, Math.floor(options?.increment ?? 1));

  if (targetVal === currentVal && !options?.uniqueFlag) {
    return { next: prev, newlyCompletedQuestIds: [] };
  }

  const next: CampusQuestsState = {
    metrics: { ...prev.metrics, [metricKey]: targetVal },
    flags: options?.uniqueFlag ? { ...prev.flags, [options.uniqueFlag]: true } : prev.flags,
    claimedIds: prev.claimedIds,
  };

  const newlyCompletedQuestIds: string[] = [];
  for (const q of CAMPUS_LIFE_QUESTS) {
    if (q.metricKey === metricKey && currentVal < q.target && targetVal >= q.target) {
      newlyCompletedQuestIds.push(q.id);
    }
  }
  return { next, newlyCompletedQuestIds };
}

export function isCampusQuestCompleted(state: CampusQuestsState, quest: CampusLifeQuestDef): boolean {
  return (state.metrics[quest.metricKey] ?? 0) >= quest.target;
}

export function claimCampusQuest(
  prev: CampusQuestsState,
  questId: string,
): {
  next: CampusQuestsState;
  claimed: boolean;
  rewardPoints: number;
  unlockedTitleId: CampusTitleId | null;
  unlockedGradCap: boolean;
} {
  const quest = CAMPUS_LIFE_QUESTS.find((q) => q.id === questId);
  if (!quest) {
    return { next: prev, claimed: false, rewardPoints: 0, unlockedTitleId: null, unlockedGradCap: false };
  }
  if (!isCampusQuestCompleted(prev, quest) || prev.claimedIds.includes(questId)) {
    return { next: prev, claimed: false, rewardPoints: 0, unlockedTitleId: null, unlockedGradCap: false };
  }
  const next: CampusQuestsState = {
    ...prev,
    claimedIds: [...prev.claimedIds, questId],
  };
  return {
    next,
    claimed: true,
    rewardPoints: quest.rewardPoints,
    unlockedTitleId: quest.rewardTitleId,
    unlockedGradCap: Boolean(quest.unlocksGradCap),
  };
}

export function getUnlockedTitleIds(state: CampusQuestsState): CampusTitleId[] {
  const unlocked: CampusTitleId[] = ['none'];
  for (const q of CAMPUS_LIFE_QUESTS) {
    if (state.claimedIds.includes(q.id) || isCampusQuestCompleted(state, q)) {
      unlocked.push(q.rewardTitleId);
    }
  }
  return unlocked;
}

export function isGradCapUnlocked(state: CampusQuestsState): boolean {
  const gradQuest = CAMPUS_LIFE_QUESTS.find((q) => q.unlocksGradCap);
  if (!gradQuest) return false;
  return state.claimedIds.includes(gradQuest.id) || isCampusQuestCompleted(state, gradQuest);
}

export function getSchoolBadgeDef(id?: SchoolBadgeId): SchoolBadgeDef {
  return SCHOOL_BADGES.find((s) => s.id === id) ?? SCHOOL_BADGES[0];
}

export function getCampusTitleDef(id?: CampusTitleId): CampusTitleDef {
  return CAMPUS_TITLES.find((t) => t.id === id) ?? CAMPUS_TITLES[0];
}
