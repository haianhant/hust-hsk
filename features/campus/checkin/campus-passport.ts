// ---------------------------------------------------------------------------
// features/campus/checkin/campus-passport.ts — Dữ liệu Sổ tay Khám phá &
// Check-in 9 Công trình Biểu tượng ĐHBK Hà Nội (EdTech Campus Passport).
// Mỗi tòa nhà sở hữu 1 tính năng học tập / trải nghiệm sáng tạo riêng biệt:
//   - Tòa C7 là trung tâm duy nhất dạy & luyện HSK theo bài trên Giảng đường 3D.
//   - Các công trình khác kết hợp giới thiệu kiến trúc – lịch sử Bách Khoa với
//     từ vựng Hán ngữ theo ngữ cảnh và thử thách tương tác EdTech.
//
// ARCHITECTURAL RULE: Pure TypeScript (không phụ thuộc React hay Three.js) để
// dùng chung cho cả UI, Interaction Bridge và bộ kiểm thử Node (`test/*.cjs`).
// ---------------------------------------------------------------------------

import { TRAN_DAI_NGHIA_GATE } from '../world-data';

export interface BuildingVocabCard {
  hanzi: string;
  pinyin: string;
  vi: string;
  example?: string;
}

export interface BuildingEdTechQuiz {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  rewardPoints: number;
}

export type CreativeActionKind =
  | 'enter-c7-hsk'
  | 'enter-library'
  | 'toggle-lofi'
  | 'student-card-check'
  | 'architectural-lens'
  | 'heritage-pledge'
  | 'soict-tech-decode'
  | 'c9-sentence-sprint'
  | 'dorm-canteen-order';

export interface CampusLandmarkSpec {
  id: string;
  code: string;
  name: string;
  shortName: string;
  icon: string;
  accentColor: string;
  fastTravelId: string;
  /** Tâm vùng bấm phím E tương tác ngoài sân trường */
  pos: { x: number; z: number };
  /** Vị trí đặt trụ Check-in EdTech 3D (đặt lệch khỏi đường đi để không vướng lối) */
  markerPos: { x: number; z: number };
  triggerRadius: number;
  promptLabel: string;
  /** Tên tính năng sáng tạo riêng của công trình */
  creativeFeatureTitle: string;
  creativeFeatureBadge: string;
  creativeFeatureDesc: string;
  creativeActionKind: CreativeActionKind;
  creativeActionLabel: string;
  /** Câu chuyện giới thiệu lịch sử / kiến trúc chuẩn ĐHBK Hà Nội */
  historyYear: string;
  historySummary: string;
  architecturalHighlight: string;
  /** 4 thẻ từ vựng Hán ngữ chuyên đề gắn liền với công trình */
  vocab: [BuildingVocabCard, BuildingVocabCard, BuildingVocabCard, BuildingVocabCard];
  /** Thử thách EdTech ngắn gọn kết nối hiểu biết Bách Khoa & Hán ngữ */
  quiz: BuildingEdTechQuiz;
}

export const CAMPUS_PASSPORT_STORAGE_KEY = 'bkhn_campus_passport_v1';

export interface CampusPassportState {
  /** Map landmarkId -> ISO timestamp lần đầu check-in */
  checkedInAt: Record<string, string>;
  /** Map landmarkId -> đã giải đúng câu đố EdTech tại công trình */
  quizSolved: Record<string, boolean>;
  /** Map landmarkId -> đã kích hoạt tính năng sáng tạo đặc trưng của tòa nhà */
  featuresCollected: Record<string, boolean>;
}

export const CAMPUS_LANDMARKS: readonly CampusLandmarkSpec[] = [
  {
    id: 'c7',
    code: 'TÒA C7',
    name: 'Tòa C7 — Tổ hợp Giảng đường Chữ E',
    shortName: 'Tòa C7 (Học HSK)',
    icon: '🎓',
    accentColor: '#DC2626',
    fastTravelId: 'c7',
    pos: { x: 30.2, z: -31.8 },
    markerPos: { x: 30.8, z: -31.2 },
    triggerRadius: 2.8,
    promptLabel: 'E — Khám phá & Check-in Tòa C7 (Trung tâm Học HSK)',
    creativeFeatureTitle: 'Giảng đường HSK 3D Theo Bài',
    creativeFeatureBadge: 'Trung tâm Học HSK chính thức',
    creativeFeatureDesc:
      'Không gian duy nhất trong khuôn viên dùng để chọn bài và học giáo trình HSK 1 theo từng bài giảng tương tác trên bảng đen 3D.',
    creativeActionKind: 'enter-c7-hsk',
    creativeActionLabel: '🏫 Vào Giảng đường Tòa C7 & Chọn bài HSK',
    historyYear: 'Tổ hợp 9 tầng hiện đại',
    historySummary:
      'Tòa C7 là tổ hợp giảng đường và điều hành trung tâm quy mô lớn bậc nhất ĐHBK Hà Nội với mặt bằng chữ E chạy dọc trục Bắc–Nam sát phố Trần Đại Nghĩa, gồm 3 cánh hướng Tây ôm 2 sân cây xanh thoáng đãng.',
    architecturalHighlight:
      'Khối đế 2 tầng lắp vách kính lớn cho giảng đường, 3 cánh 9 tầng sơn trắng hiện đại hướng sang khu C4–C10, điểm ô mái ngói đỏ truyền thống trên đỉnh.',
    vocab: [
      { hanzi: '教学楼', pinyin: 'jiàoxuélóu', vi: 'Tòa giảng đường', example: '我们在C7教学楼上课。' },
      { hanzi: '教室', pinyin: 'jiàoshì', vi: 'Phòng học / Lớp học', example: '请进C7教室学习汉语。' },
      { hanzi: '课文', pinyin: 'kèwén', vi: 'Bài khóa / Bài học', example: '今天我们学习新课文。' },
      { hanzi: '黑板', pinyin: 'hēibǎn', vi: 'Bảng đen giảng đường', example: '请看黑板上的汉字。' },
    ],
    quiz: {
      question: 'Tòa C7 có hình dáng mặt bằng chữ gì và mang từ vựng tiếng Trung nào cho "Tòa giảng đường"?',
      options: [
        'Hình chữ E — 教学楼 (jiàoxuélóu)',
        'Hình chữ U — 图书馆 (túshūguǎn)',
        'Hình tròn — 体育馆 (tǐyùguǎn)',
        'Hình chữ L — 宿舍楼 (sùshèlóu)',
      ],
      correctIndex: 0,
      explanation: 'Tòa C7 có mặt bằng chữ E chạy dọc Bắc–Nam với 3 cánh hướng Tây, là "教学楼" (jiàoxuélóu — tòa giảng đường) trung tâm của trường.',
      rewardPoints: 15,
    },
  },
  {
    id: 'library',
    code: 'TQB',
    name: 'Thư viện Tạ Quang Bửu',
    shortName: 'Thư viện TQB',
    icon: '📚',
    accentColor: '#1D4ED8',
    fastTravelId: 'library',
    pos: { x: 42.4, z: 14.5 },
    markerPos: { x: 42.4, z: 14.0 },
    triggerRadius: 2.9,
    promptLabel: 'E — Khám phá & Check-in Thư viện Tạ Quang Bửu',
    creativeFeatureTitle: 'Tự học Pomodoro Cloud · Piano Tầng 6 · Sân thượng T10',
    creativeFeatureBadge: 'Tổ hợp Tự học 10 Tầng',
    creativeFeatureDesc:
      'Vào sảnh Thư viện để ngồi bàn tự học đồng bộ bảng xếp hạng giờ học Cloud, chơi Đại dương cầm ở Tầng 6 hoặc nằm ngắm mây sao tại Sân thượng Tầng 10.',
    creativeActionKind: 'enter-library',
    creativeActionLabel: '🏛️ Bước vào Thư viện Tạ Quang Bửu ngay',
    historyYear: 'Khánh thành 2006 · ~37.000 m²',
    historySummary:
      'Mang tên GS. Tạ Quang Bửu — Hiệu trưởng đầu tiên của ĐHBK Hà Nội, đây là một trong những thư viện đại học lớn nhất Việt Nam với hàng vạn đầu sách khoa học kỹ thuật.',
    architecturalHighlight:
      'Tháp 10 tầng chia 3 nhịp đứng đồ sộ, hai cánh phòng đọc khối đế mở rộng, hàng cột tròn kim loại, đồng hồ tròn chính diện và biển vàng "THƯ VIỆN TẠ QUANG BỬU".',
    vocab: [
      { hanzi: '图书馆', pinyin: 'túshūguǎn', vi: 'Thư viện', example: '谢光宝图书馆非常大。' },
      { hanzi: '自习', pinyin: 'zìxí', vi: 'Tự học', example: '周末我常去四楼自习。' },
      { hanzi: '钢琴', pinyin: 'gāngqín', vi: 'Đàn dương cầm (Piano)', example: '六楼有一架大钢琴。' },
      { hanzi: '安静', pinyin: 'ānjìng', vi: 'Yên tĩnh', example: '阅览室里很安静。' },
    ],
    quiz: {
      question: 'Khi rủ bạn lên Thư viện Tạ Quang Bửu "tự học", bạn dùng từ tiếng Trung nào chuẩn nhất?',
      options: [
        '自习 (zìxí)',
        '买东西 (mǎi dōngxi)',
        '踢足球 (tī zúqiú)',
        '点菜 (diǎncài)',
      ],
      correctIndex: 0,
      explanation: '"自习" (zìxí — tự học) là hoạt động quen thuộc nhất của sinh viên Bách Khoa mỗi mùa thi tại Thư viện Tạ Quang Bửu.',
      rewardPoints: 15,
    },
  },
  {
    id: 'c1',
    code: 'TÒA C1',
    name: 'Tòa C1 Hành chính & Quảng trường I ❤ BK',
    shortName: 'Tòa C1',
    icon: '🏛️',
    accentColor: '#B91C1C',
    fastTravelId: 'c1',
    pos: { x: -55.2, z: -39.5 },
    markerPos: { x: -55.2, z: -39.5 },
    triggerRadius: 2.9,
    promptLabel: 'E — Khám phá & Check-in Tòa C1 Lịch sử',
    creativeFeatureTitle: 'Phòng Truyền thống 1956 & Huy hiệu Bách Khoa',
    creativeFeatureBadge: 'Di sản Kiến trúc 1956',
    creativeFeatureDesc:
      'Tìm hiểu ý nghĩa huy hiệu compa – bánh răng – sách mở trên mặt đứng C1 và mở khóa Dấu Ấn Sinh Viên Bách Khoa 1956.',
    creativeActionKind: 'heritage-pledge',
    creativeActionLabel: '🎖️ Thắp sáng Huy hiệu Truyền thống Bách Khoa 1956',
    historyYear: 'Thành lập 15/10/1956',
    historySummary:
      'Tòa C1 là công trình trung tâm gắn liền với lịch sử thành lập Đại học Bách Khoa Hà Nội (1956), do các kiến trúc sư Liên Xô thiết kế theo phong cách hiện đại nhiệt đới.',
    architecturalHighlight:
      'Mái bê tông vỏ mỏng đúng 9 gợn sóng nông, hành lang loggia chắn nắng, tháp cầu thang gạch hoa gió đục lỗ và biểu trưng ĐHBK Hà Nội màu đỏ thắm.',
    vocab: [
      { hanzi: '历史', pinyin: 'lìshǐ', vi: 'Lịch sử', example: '百科大学有悠久的历史。' },
      { hanzi: '校徽', pinyin: 'xiàohuī', vi: 'Huy hiệu / Logo trường', example: 'C1大楼上有红色的校徽。' },
      { hanzi: '广场', pinyin: 'guǎngchǎng', vi: 'Quảng trường', example: '我们在C1广场拍照。' },
      { hanzi: '骄傲', pinyin: 'jiāo’ào', vi: 'Tự hào', example: '我是百科学生，我很骄傲！' },
    ],
    quiz: {
      question: 'Mái sảnh Tòa C1 lịch sử có bao nhiêu gợn sóng và "Logo/Huy hiệu trường" trong tiếng Trung là gì?',
      options: [
        '9 gợn sóng — 校徽 (xiàohuī)',
        '5 gợn sóng — 校车 (xiàochē)',
        '12 gợn sóng — 校长 (xiàozhǎng)',
        '7 gợn sóng — 校园 (xiàoyuán)',
      ],
      correctIndex: 0,
      explanation: 'Mái C1 nổi tiếng với đúng 9 gợn sóng bê tông vỏ mỏng và tấm "校徽" (xiàohuī — huy hiệu trường) đỏ sao vàng.',
      rewardPoints: 15,
    },
  },
  {
    id: 'tdn-gate',
    code: 'CỔNG TĐN',
    name: 'Cổng Trần Đại Nghĩa & Phòng Bác Bảo Vệ',
    shortName: 'Cổng Trần Đại Nghĩa',
    icon: '👮',
    accentColor: '#0284C7',
    fastTravelId: 'spawn',
    pos: { x: TRAN_DAI_NGHIA_GATE.guardPos.x, z: TRAN_DAI_NGHIA_GATE.guardPos.z },
    markerPos: { x: 90.35, z: -12.55 },
    triggerRadius: 3.0,
    promptLabel: 'E — Trò chuyện & Check-in cùng Bác bảo vệ Bách Khoa',
    creativeFeatureTitle: 'Xuất trình Thẻ Sinh Viên & Chào hỏi Bác Bảo Vệ',
    creativeFeatureBadge: 'Giao tiếp Cổng Trường',
    creativeFeatureDesc:
      'Luyện câu chào hỏi lễ phép bằng tiếng Trung với Bác bảo vệ Bách Khoa và đóng dấu xác thực Thẻ Sinh Viên điện tử ngay tại cổng trường.',
    creativeActionKind: 'student-card-check',
    creativeActionLabel: '🪪 Xuất trình Thẻ SV & Chào Bác Bảo Vệ bằng tiếng Trung',
    historyYear: 'Cổng Đông nhộn nhịp ngày & đêm',
    historySummary:
      'Cổng Trần Đại Nghĩa kết nối trực tiếp khu giảng đường C7 – D3–D5 với khu Ký túc xá và phố sinh viên Trần Đại Nghĩa, luôn sáng đèn cùng ca trực của các bác bảo vệ.',
    architecturalHighlight:
      'Tường biển hiệu trung tâm ốp đá chẻ vàng kem được 3 đèn pha rọi sáng rực vào ban đêm cùng nhà bảo vệ mái bằng sáng đèn ấm áp.',
    vocab: [
      { hanzi: '保安大叔', pinyin: 'bǎo’ān dàshū', vi: 'Bác bảo vệ', example: '保安大叔，您好！' },
      { hanzi: '学生证', pinyin: 'xuéshengzhèng', vi: 'Thẻ sinh viên', example: '这是我的学生证。' },
      { hanzi: '校门', pinyin: 'xiàomén', vi: 'Cổng trường', example: '陈大义校门晚上很亮。' },
      { hanzi: '请问', pinyin: 'qǐngwèn', vi: 'Xin hỏi (hỏi đường)', example: '请问，C7教学楼怎么走？' },
    ],
    quiz: {
      question: 'Khi đi qua Cổng Trần Đại Nghĩa gặp Bác bảo vệ và muốn xuất trình "Thẻ sinh viên", bạn nói từ nào?',
      options: [
        '学生证 (xuéshengzhèng)',
        '飞机票 (fēijīpiào)',
        '菜单 (càidān)',
        '笔记本 (bǐjìběn)',
      ],
      correctIndex: 0,
      explanation: '"学生证" (xuéshengzhèng) là thẻ sinh viên — vật bất ly thân khi qua cổng trường và vào thư viện Bách Khoa!',
      rewardPoints: 15,
    },
  },
  {
    id: 'parabol-gate',
    code: 'PARABOL',
    name: 'Cổng Parabol Giải Phóng',
    shortName: 'Cổng Parabol',
    icon: '⛩️',
    accentColor: '#D97706',
    fastTravelId: 'parabol',
    pos: { x: -84.2, z: -8.2 },
    markerPos: { x: -84.2, z: -9.4 },
    triggerRadius: 3.1,
    promptLabel: 'E — Khám phá & Check-in Cổng Parabol Biểu tượng',
    creativeFeatureTitle: 'Lăng kính Toán học & Kiến trúc Vòm Parabol 1965',
    creativeFeatureBadge: 'Biểu tượng Kiến trúc KTS Nguyễn Tiến Thuận',
    creativeFeatureDesc:
      'Khám phá đường cong quỹ đạo Parabol nổi tiếng của KTS Nguyễn Tiến Thuận và luyện mẫu câu chào đón tân sinh viên Bách Khoa.',
    creativeActionKind: 'architectural-lens',
    creativeActionLabel: '📐 Giải mã Đường cong Vòm Parabol & Chào Tân SV',
    historyYear: 'Xây dựng năm 1965 · Cao 12,5 m',
    historySummary:
      'Được thiết kế bởi KTS Nguyễn Tiến Thuận năm 1965, cổng vòm Parabol bên đường Giải Phóng là biểu tượng tự hào của bao thế hệ kỹ sư Bách Khoa Hà Nội.',
    architecturalHighlight:
      'Dải băng bê tông phẳng uốn cong parabol vươn cao 12,5 m chôn thẳng xuống đất (không phải ống tròn), có gờ chia khoang và 6 huy hiệu tròn nổi.',
    vocab: [
      { hanzi: '拱门', pinyin: 'gǒngmén', vi: 'Cổng vòm', example: '抛物线拱门是百科的象征。' },
      { hanzi: '建筑', pinyin: 'jiànzhù', vi: 'Kiến trúc', example: '这座建筑非常有特色。' },
      { hanzi: '欢迎', pinyin: 'huānyíng', vi: 'Chào mừng / Hoan nghênh', example: '欢迎来到河内百科大学！' },
      { hanzi: '新生', pinyin: 'xīnshēng', vi: 'Tân sinh viên', example: '欢迎新同学！' },
    ],
    quiz: {
      question: 'Cổng Parabol được thiết kế năm 1965 dưới dạng hình học nào và câu "Chào mừng" trong tiếng Trung là gì?',
      options: [
        'Dải băng phẳng uốn Parabol — 欢迎 (huānyíng)',
        'Ống thép tròn uốn cong — 再见 (zàijiàn)',
        'Khối cầu inox — 对不起 (duìbuqǐ)',
        'Tháp gạch vuông — 没关系 (méi guānxi)',
      ],
      correctIndex: 0,
      explanation: 'Cổng Parabol là dải băng bê tông phẳng uốn đường cong parabol (không phải ống tròn), luôn "欢迎" (huānyíng — chào mừng) các thế hệ sinh viên!',
      rewardPoints: 15,
    },
  },
  {
    id: 'b1-soict',
    code: 'B1 SOICT',
    name: 'Tòa B1 — Trường CNTT & Truyền thông (SoICT)',
    shortName: 'Nhà B1 (SoICT)',
    icon: '💻',
    accentColor: '#2563EB',
    fastTravelId: 'b1',
    pos: { x: 112.0, z: 4.5 },
    markerPos: { x: 108.8, z: 5.2 },
    triggerRadius: 3.4,
    promptLabel: 'E — Khám phá & Check-in Tòa B1 Trường CNTT (SoICT)',
    creativeFeatureTitle: 'Phòng Lab Giải mã Thuật ngữ AI & Công nghệ Hán ngữ',
    creativeFeatureBadge: 'EdTech STEM & AI Lab',
    creativeFeatureDesc:
      'Tương tác bảng mạch từ vựng Công nghệ thông tin, Trí tuệ nhân tạo & Lập trình bằng tiếng Trung dành riêng cho dân kỹ thuật Bách Khoa.',
    creativeActionKind: 'soict-tech-decode',
    creativeActionLabel: '🤖 Chạy Giải mã Từ vựng AI & CNTT tại Lab B1',
    historyYear: 'Cái nôi CNTT hàng đầu Việt Nam',
    historySummary:
      'Tòa B1 là trụ sở Trường Công nghệ Thông tin và Truyền thông (SoICT) — nơi đào tạo các kỹ sư phần mềm, khoa học dữ liệu và trí tuệ nhân tạo hàng đầu.',
    architecturalHighlight:
      'Tòa nhà 8 tầng sơn trắng kiến trúc thanh lịch, nổi bật với khối sảnh tròn rotunda hướng Bắc, thảm cỏ bán nguyệt và biển chữ "B1" xanh dương.',
    vocab: [
      { hanzi: '电脑', pinyin: 'diànnǎo', vi: 'Máy tính', example: '我用电脑写代码。' },
      { hanzi: '人工智能', pinyin: 'réngōng zhìnéng', vi: 'Trí tuệ nhân tạo (AI)', example: '我对人工智能很感兴趣。' },
      { hanzi: '编程', pinyin: 'biānchéng', vi: 'Lập trình', example: 'B1大楼的学生很喜欢编程。' },
      { hanzi: '工程师', pinyin: 'gōngchéngshī', vi: 'Kỹ sư', example: '我想成为软件工程师。' },
    ],
    quiz: {
      question: 'Tại Tòa B1 (SoICT), thuật ngữ "Trí tuệ nhân tạo (AI)" trong tiếng Trung được gọi là gì?',
      options: [
        '人工智能 (réngōng zhìnéng)',
        '公共汽车 (gōnggòng qìchē)',
        '天气预报 (tiānqì yùbào)',
        '电子邮件 (diànzǐ yóujiàn)',
      ],
      correctIndex: 0,
      explanation: '"人工智能" (réngōng = nhân công/nhân tạo, zhìnéng = trí năng/trí tuệ) là từ vựng công nghệ cực kỳ phổ biến hiện nay.',
      rewardPoints: 15,
    },
  },
  {
    id: 'tien-lake',
    code: 'HỒ TIỀN',
    name: 'Hồ Tiền Bách Khoa',
    shortName: 'Hồ Tiền',
    icon: '🪷',
    accentColor: '#0D9488',
    fastTravelId: 'lake',
    pos: { x: 24.0, z: 48.0 },
    markerPos: { x: 21.8, z: 48.0 },
    triggerRadius: 3.4,
    promptLabel: 'E — Thư giãn & Check-in Bờ Hồ Tiền Bách Khoa',
    creativeFeatureTitle: 'Góc Gió Mát Lofi Ven Hồ & Hội thoại Dạo bước',
    creativeFeatureBadge: 'Lá phổi xanh ~4.000 m²',
    creativeFeatureDesc:
      'Bật giai điệu Lofi Chill ngắm sen hồng dưới bóng liễu rủ Hồ Tiền và học các từ vựng miêu tả thiên nhiên, thời tiết trong khuôn viên.',
    creativeActionKind: 'toggle-lofi',
    creativeActionLabel: '🎵 Bật / Chuyển Giai điệu Lofi Ven Hồ Tiền',
    historyYear: 'Hồ chữ nhật 45 m × 88 m',
    historySummary:
      'Hồ Tiền rộng gần 4.000 m² nằm ở phía Nam trục đường chính, là không gian thư giãn, trò chuyện và ngắm hoa sen/súng nở quen thuộc của sinh viên sau giờ học.',
    architecturalHighlight:
      'Mặt hồ hình chữ nhật trục Bắc–Nam kè đá có gờ bê tông, bao quanh bởi hàng liễu rủ xanh mát, ghế đá và những cụm hoa sen hồng.',
    vocab: [
      { hanzi: '湖', pinyin: 'hú', vi: 'Hồ nước', example: '钱湖的风景真美。' },
      { hanzi: '荷花', pinyin: 'héhuā', vi: 'Hoa sen', example: '夏天湖里有很多荷花。' },
      { hanzi: '散步', pinyin: 'sànbù', vi: 'Đi dạo', example: '下课后我们在湖边散步。' },
      { hanzi: '天气', pinyin: 'tiānqì', vi: 'Thời tiết', example: '今天天气很好，很凉快。' },
    ],
    quiz: {
      question: 'Đi dạo quanh bờ Hồ Tiền ngắm hoa sen sau giờ học được diễn tả bằng động từ tiếng Trung nào?',
      options: [
        '散步 (sànbù)',
        '开车 (kāichē)',
        '睡觉 (shuìjiào)',
        '考试 (kǎoshì)',
      ],
      correctIndex: 0,
      explanation: '"散步" (sànbù — tản bộ / đi dạo) quanh bờ Hồ Tiền là trải nghiệm thư giãn tuyệt vời nhất ở Bách Khoa.',
      rewardPoints: 15,
    },
  },
  {
    id: 'c9',
    code: 'NHÀ C9',
    name: 'Nhà C9 & Cầu thang Đỏ Zic-zac',
    shortName: 'Nhà C9',
    icon: '🏢',
    accentColor: '#E11D48',
    fastTravelId: 'c9',
    pos: { x: -60.0, z: -17.0 },
    markerPos: { x: -61.6, z: -14.8 },
    triggerRadius: 3.2,
    promptLabel: 'E — Khám phá & Check-in Nhà C9 Cầu thang Đỏ',
    creativeFeatureTitle: 'Góc Check-in Cầu thang Đỏ & Ghép câu Đại cương',
    creativeFeatureBadge: 'Tọa độ Ký ức Đại cương',
    creativeFeatureDesc:
      'Check-in góc cầu thang bộ zic-zac lan can đỏ huyền thoại của Nhà C9 và thử sức ghép nhanh câu hỏi lịch học các môn đại cương.',
    creativeActionKind: 'c9-sentence-sprint',
    creativeActionLabel: '⚡ Thử thách Ghép câu Nhanh Môn Đại cương C9',
    historyYear: 'Góc sống ảo kinh điển Khu C',
    historySummary:
      'Nằm ở phân khu Tây-Bắc gần Cổng Parabol và vườn hoa C1, Nhà C9 gắn liền với những tiết Toán cao cấp, Vật lý đại cương và những bức ảnh kỷ yếu trên cầu thang đỏ.',
    architecturalHighlight:
      'Khối nhà 4 tầng sơn trắng kem với cầu thang bộ ngoài trời gấp khúc zic-zac 4 vế gắn mặt Đông và lan can kim loại sơn đỏ nổi bật.',
    vocab: [
      { hanzi: '楼梯', pinyin: 'lóutī', vi: 'Cầu thang bộ', example: 'C9大楼有红色的楼梯。' },
      { hanzi: '数学', pinyin: 'shùxué', vi: 'Môn Toán học', example: '高等数学很有意思。' },
      { hanzi: '同学', pinyin: 'tóngxué', vi: 'Bạn cùng lớp', example: '我和同学一起去上课。' },
      { hanzi: '拍照', pinyin: 'pāizhào', vi: 'Chụp ảnh check-in', example: '我们在这里拍照吧！' },
    ],
    quiz: {
      question: 'Điểm nhấn kiến trúc nổi tiếng nhất ở mặt Đông Nhà C9 ("cầu thang bộ") trong tiếng Trung là gì?',
      options: [
        '楼梯 (lóutī)',
        '电梯 (diàntī)',
        '窗户 (chuānghu)',
        '桌子 (zhuōzi)',
      ],
      correctIndex: 0,
      explanation: '"楼梯" (lóutī) là cầu thang bộ (phân biệt với "电梯" diàntī là thang máy trong Thư viện Tạ Quang Bửu!).',
      rewardPoints: 15,
    },
  },
  {
    id: 'dorm-ktx',
    code: 'KTX B8–B9',
    name: 'Khu Ký túc xá B8–B9 & Căng-tin Sinh viên',
    shortName: 'Khu KTX B8–B9',
    icon: '🏘️',
    accentColor: '#EA580C',
    fastTravelId: 'ktx',
    pos: { x: 112.5, z: -43.5 },
    markerPos: { x: 113.6, z: -41.4 },
    triggerRadius: 3.6,
    promptLabel: 'E — Khám phá & Check-in Khu Ký túc xá Bách Khoa',
    creativeFeatureTitle: 'Tình huống Giao tiếp Nội trú & Gọi món Căng-tin',
    creativeFeatureBadge: 'Đời sống Sinh viên Bách Khoa',
    creativeFeatureDesc:
      'Trải nghiệm không khí khu nội trú B8–B9, Văn phòng Hội Sinh viên và thực hành gọi món ăn, đồ uống bằng tiếng Trung tại Căng-tin.',
    creativeActionKind: 'dorm-canteen-order',
    creativeActionLabel: '🍜 Thực hành Gọi món Căng-tin KTX bằng tiếng Trung',
    historyYear: 'Khu nội trú B3–B13 sôi động',
    historySummary:
      'Khu Ký túc xá Bách Khoa quy tụ các dãy nhà B3–B13, Văn phòng Hội Sinh viên (B8), Trung tâm Quản lý KTX (B9), sân bóng và nhà ăn sinh viên ấm cúng.',
    architecturalHighlight:
      'Các dãy KTX sơn vàng ấm truyền thống đan xen khối KTX mới cao tầng xanh–trắng, bao quanh sân thể thao nội khu sôi nổi.',
    vocab: [
      { hanzi: '宿舍', pinyin: 'sùshè', vi: 'Ký túc xá', example: '我的宿舍在B9楼。' },
      { hanzi: '食堂', pinyin: 'shítáng', vi: 'Nhà ăn / Căng-tin', example: '百科食堂的饭很好吃。' },
      { hanzi: '室友', pinyin: 'shìyǒu', vi: 'Bạn cùng phòng', example: '我的室友也是工科学生。' },
      { hanzi: '米饭', pinyin: 'mǐfàn', vi: 'Cơm trắng', example: '阿姨，我要一份米饭！' },
    ],
    quiz: {
      question: 'Khi rủ bạn cùng phòng ("室友") sang "Nhà ăn / Căng-tin" KTX ăn trưa, bạn dùng từ nào?',
      options: [
        '食堂 (shítáng)',
        '医院 (yīyuàn)',
        '银行 (yínháng)',
        '机场 (jīchǎng)',
      ],
      correctIndex: 0,
      explanation: '"食堂" (shítáng) là nhà ăn / căng-tin trường học, gắn liền với đời sống "宿舍" (sùshè — ký túc xá).',
      rewardPoints: 15,
    },
  },
] as const;

export function createEmptyPassportState(): CampusPassportState {
  return {
    checkedInAt: {},
    quizSolved: {},
    featuresCollected: {},
  };
}

export function loadCampusPassport(): CampusPassportState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createEmptyPassportState();
  }
  try {
    const raw = window.localStorage.getItem(CAMPUS_PASSPORT_STORAGE_KEY);
    if (!raw) return createEmptyPassportState();
    const parsed = JSON.parse(raw) as Partial<CampusPassportState>;
    return {
      checkedInAt:
        parsed.checkedInAt && typeof parsed.checkedInAt === 'object'
          ? { ...parsed.checkedInAt }
          : {},
      quizSolved:
        parsed.quizSolved && typeof parsed.quizSolved === 'object'
          ? { ...parsed.quizSolved }
          : {},
      featuresCollected:
        parsed.featuresCollected && typeof parsed.featuresCollected === 'object'
          ? { ...parsed.featuresCollected }
          : {},
    };
  } catch {
    return createEmptyPassportState();
  }
}

export function saveCampusPassport(state: CampusPassportState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(CAMPUS_PASSPORT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Bỏ qua lỗi quota trên trình duyệt ẩn danh
  }
}

export function recordLandmarkCheckIn(
  prev: CampusPassportState,
  landmarkId: string,
  nowIso: string = new Date().toISOString(),
): { next: CampusPassportState; isFirstTime: boolean } {
  const valid = CAMPUS_LANDMARKS.some((l) => l.id === landmarkId);
  if (!valid) return { next: prev, isFirstTime: false };
  if (prev.checkedInAt[landmarkId]) {
    return { next: prev, isFirstTime: false };
  }
  return {
    isFirstTime: true,
    next: {
      ...prev,
      checkedInAt: {
        ...prev.checkedInAt,
        [landmarkId]: nowIso,
      },
    },
  };
}

export function recordLandmarkFeatureCollected(
  prev: CampusPassportState,
  landmarkId: string,
  nowIso: string = new Date().toISOString(),
): { next: CampusPassportState; isNewFeature: boolean } {
  const valid = CAMPUS_LANDMARKS.some((l) => l.id === landmarkId);
  if (!valid) return { next: prev, isNewFeature: false };
  const alreadyFeature = !!prev.featuresCollected[landmarkId];
  const checkedInAt = prev.checkedInAt[landmarkId]
    ? prev.checkedInAt
    : { ...prev.checkedInAt, [landmarkId]: nowIso };
  return {
    isNewFeature: !alreadyFeature,
    next: {
      ...prev,
      checkedInAt,
      featuresCollected: {
        ...prev.featuresCollected,
        [landmarkId]: true,
      },
    },
  };
}

export function recordLandmarkQuizSolved(
  prev: CampusPassportState,
  landmarkId: string,
  nowIso: string = new Date().toISOString(),
): { next: CampusPassportState; isFirstSolve: boolean } {
  const valid = CAMPUS_LANDMARKS.some((l) => l.id === landmarkId);
  if (!valid) return { next: prev, isFirstSolve: false };
  const alreadySolved = !!prev.quizSolved[landmarkId];
  const checkedInAt = prev.checkedInAt[landmarkId]
    ? prev.checkedInAt
    : { ...prev.checkedInAt, [landmarkId]: nowIso };
  return {
    isFirstSolve: !alreadySolved,
    next: {
      ...prev,
      checkedInAt,
      quizSolved: {
        ...prev.quizSolved,
        [landmarkId]: true,
      },
    },
  };
}

export function getCampusLandmarkById(id: string): CampusLandmarkSpec | undefined {
  return CAMPUS_LANDMARKS.find((item) => item.id === id);
}

export function findNearestCheckinLandmark(pos: {
  x: number;
  z: number;
}): CampusLandmarkSpec | null {
  let best: CampusLandmarkSpec | null = null;
  let bestDist = Infinity;
  for (const lm of CAMPUS_LANDMARKS) {
    const d = Math.hypot(pos.x - lm.pos.x, pos.z - lm.pos.z);
    if (d <= lm.triggerRadius && d < bestDist) {
      best = lm;
      bestDist = d;
    }
  }
  return best;
}

export function getPassportSummary(state: CampusPassportState): {
  checkedInCount: number;
  featuresCount: number;
  quizSolvedCount: number;
  totalLandmarks: number;
  completionPercent: number;
} {
  const totalLandmarks = CAMPUS_LANDMARKS.length;
  const checkedInCount = CAMPUS_LANDMARKS.filter((l) => !!state.checkedInAt[l.id]).length;
  const featuresCount = CAMPUS_LANDMARKS.filter((l) => !!state.featuresCollected[l.id]).length;
  const quizSolvedCount = CAMPUS_LANDMARKS.filter((l) => !!state.quizSolved[l.id]).length;
  const totalMilestones = totalLandmarks * 3;
  const earned = checkedInCount + featuresCount + quizSolvedCount;
  return {
    checkedInCount,
    featuresCount,
    quizSolvedCount,
    totalLandmarks,
    completionPercent:
      totalMilestones > 0 ? Math.round((earned / totalMilestones) * 100) : 0,
  };
}
