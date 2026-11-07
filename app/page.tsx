'use client';

// ---------------------------------------------------------------------------
// app/page.tsx — Màn mở đầu + HUD + tích hợp quest "Buổi học đầu tiên" (Bước 5).
// - HUD: chip mục tiêu, nút 📖 Sổ tay, điểm, nút âm thanh (bật/tắt lời đọc +
//   tốc độ 0,6/0,8/1,0), nút "Tương tác" cho mobile (dispatch bkhn:interact
//   như phím E).
// - E hiện tại dispatch bkhn:interact không kèm vị trí — page tính vật tương
//   tác gần nhất từ playerState.pos (poll 200 ms như zone) so với danh sách
//   interactable; chỉ trong triggerRadius mới hiện gợi ý "E — ..." và E mới
//   có tác dụng, ngoài tầm thì E hiện toast nhẹ "Hãy đến gần hơn".
// - Khi panel học mở: uiLocked=true, khóa cả phím WASD + joystick (Player
//   đọc flag mỗi frame), đóng panel mới mở khóa; focus đúng vào input/panel.
// - Âm thanh: chỉ phát sau tương tác (nút Vào trường / nút nghe),
//   stopSpeaking trước câu mới, có phát lại + tốc độ; thiếu giọng zh-CN →
//   banner "Thiết bị chưa có giọng tiếng Trung — vẫn học được bằng chữ".
// ---------------------------------------------------------------------------

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Joystick from '../components/ui/Joystick';
import Minimap from '../components/ui/Minimap';
import { bikeInput, bikeState, playerInput, playerState } from '../lib/playerState';
import { CLASSROOM, CLASSROOM_DOOR, FAST_TRAVEL_DESTINATIONS } from '../lib/campus';
import { ALL_HSK3_LEXEMES as LEXEMES, HSK3_LESSONS, HSK3_LESSON_LEXEMES } from '../content/hsk3-index';
import { ALL_HSK4_LEXEMES, HSK4_LESSONS, HSK4_LESSON_LEXEMES } from '../content/hsk4-index';
import {
  FIRST_LESSON_QUEST,
  HSK4_LESSON_QUEST_IDS,
  L10_QUEST_IDS,
  getQuestDef,
  type QuestDef,
  type QuestStep,
} from '../lib/learn/quest-data';
import type { Lesson, Lexeme, Progress } from '../lib/learn/types';
import {
  awardQuestCompletion,
  getDueWordsIncludingTodayWrong,
  loadProgress,
  markActivityDay,
  markEncountered,
  recordAnswer,
  recordReReview,
  saveProgress,
  todayKey,
} from '../lib/learn/store';
import { hasChineseVoice, speak, stopSpeaking } from '../lib/learn/speech';
import { getEarnedGlobalBadgeIds, GLOBAL_BADGES } from '../lib/learn/badges';
import { getNextSuggestion } from '../lib/learn/suggest';
import QuestPanel, { type QuestAnswer } from '../components/learn/QuestPanel';
import Handbook from '../components/learn/Handbook';
import ResultPanel from '../components/learn/ResultPanel';
import ReviewSession from '../components/learn/ReviewSession';
import QuestObjective from '../components/learn/QuestObjective';
import type { HomeworkState } from '../components/three/Classroom';

// CampusScene chỉ mount sau khi bấm "Vào trường" — tránh autoplay/WebGL
// trước khi người dùng tương tác.
const CampusScene = dynamic(() => import('../components/three/CampusScene'), {
  ssr: false,
});

const TOAST_MS = 2500;
const SPEECH_RATES = [0.6, 0.8, 1.0] as const;
const MINH_POS = { x: -72, z: 8 };
const MINH_RADIUS = 2.5;

type BkhnHook = {
  enterClassroom: () => void;
  exitClassroom: () => void;
  teleport: (x: number, z: number, yaw?: number, pitch?: number) => void;
  getPos: () => { x: number; z: number };
  getYaw?: () => number;
  getPitch?: () => number;
  // Đợt 3 giai đoạn 4 — xe máy (trả { ok, reason? }).
  getBike?: () => { pos: { x: number; z: number }; heading: number; speed: number; steer: number; lean: number; riding: boolean; instances: number };
  mountBike?: () => { ok: boolean; reason?: string };
  dismountBike?: () => { ok: boolean; reason?: string };
  callBike?: () => { ok: boolean; reason?: string };
  recallBike?: () => { ok: boolean; reason?: string };
  setBikePose?: (x: number, z: number, heading: number) => void;
  // Đợt 3 giai đoạn 5 — dịch chuyển nhanh (trả { ok, reason? }).
  fastTravel?: (destId: string) => { ok: boolean; reason?: string };
  getFastTravel?: () => { traveling: boolean; count: number; lastDestId: string | null };
};

function getHook(): BkhnHook | undefined {
  return (window as unknown as { __bkhn?: BkhnHook }).__bkhn;
}

const OBJECTIVES: Record<string, string> = {
  'greet-minh': 'Nói chuyện với Minh ở cổng Parabol',
  'goto-door': 'Tới cửa phòng học ở nhà C1',
  'teacher-math': 'Nghe cô giáo giới thiệu tiết học',
  'find-board': 'Tìm bảng đen trong phòng học',
  'open-notebook': 'Mở vở ghi chép trên bàn 1',
  'take-homework': 'Nhận tập bài tập về nhà',
  'learn-renzhen': 'Học từ 认真 — chăm chỉ, nghiêm túc',
  'learn-qingchu': 'Học từ 清楚 — rõ ràng',
  'order-ba': 'Xếp câu với 把 rồi nộp bài cho cô',
  'count-bian': 'Nghe và chọn số lượt đọc',
  'goal-tigao': 'Chọn mục tiêu cần nâng cao',
  'l10-g234-teacher': 'Nghe cô giáo giới thiệu từ ôn tập',
  'l10-g234-pick-nan': 'Học từ 难 — khó',
  'l10-g234-pick-mingbai': 'Học từ 明白 — hiểu',
  'l10-g234-order': 'Xếp câu với 努力',
  'l11-teacher': 'Nghe cô giáo giới thiệu cuộc họp',
  'l11-pick-jiejue': 'Học từ 解决 — giải quyết',
  'l11-pick-qingjia': 'Học từ 请假 — xin nghỉ',
  'l11-order': 'Xếp câu về cuộc họp',
  'l12-teacher': 'Nghe cô giáo giới thiệu mùa trong năm',
  'l12-pick-bianhua': 'Học từ 变化 — thay đổi',
  'l12-pick-changchang': 'Học từ 常常 — thường xuyên',
  'l12-count': 'Chọn số mùa trong năm',
  'l13-teacher': 'Nghe cô giáo giới thiệu hàng xóm',
  'l13-pick-laizi': 'Học từ 来自 — đến từ',
  'l13-pick-wenhua': 'Học từ 文化 — văn hóa',
  'l13-order': 'Xếp câu về hàng xóm',
  'l14-teacher': 'Nghe cô giáo giới thiệu thư viện',
  'l14-pick-xiangxin': 'Học từ 相信 — tin tưởng',
  'l14-pick-wangji': 'Học từ 忘记 — quên',
  'l14-order': 'Xếp câu với 被',
  'l15-teacher': 'Nghe cô giáo giới thiệu Nam Kinh',
  'l15-pick-liaojie': 'Học từ 了解 — tìm hiểu',
  'l15-pick-youming': 'Học từ 有名 — nổi tiếng',
  'l15-goal': 'Chọn điều muốn tìm hiểu',
  'l16-teacher': 'Nghe cô giáo giới thiệu gấu trúc',
  'l16-pick-keai': 'Học từ 可爱 — đáng yêu',
  'l16-pick-qishi': 'Học từ 其实 — thật ra',
  'l16-count': 'Chọn số gấu trúc trong vườn thú',
  'l17-teacher': 'Nghe cô giáo giới thiệu người thông minh',
  'l17-pick-tongyi': 'Học từ 同意 — đồng ý',
  'l17-pick-rongyi': 'Học từ 容易 — dễ dàng',
  'l17-order': 'Xếp câu với 向…学习',
  'l18-teacher': 'Nghe cô giáo giới thiệu Tết',
  'l18-pick-jianchi': 'Học từ 坚持 — kiên trì',
  'l18-pick-mubiao': 'Học từ 目标 — mục tiêu',
  'l18-order': 'Xếp câu về Tết',
  // --- HSK 4 (Bước 7): mục tiêu từng bước, sinh từ dữ liệu quest ---
  'hsk4-shang-l1a-teacher': 'Nghe cô giáo giới thiệu từ 奖学金',
  'hsk4-shang-l1a-pick-ruxue': 'Học từ 入学 — nhập học',
  'hsk4-shang-l1a-pick-yali': 'Học từ 压力 — áp lực',
  'hsk4-shang-l1a-order': 'Xếp câu với 申请',
  'hsk4-shang-l1b-teacher': 'Nghe cô giáo giới thiệu từ 专业',
  'hsk4-shang-l1b-pick-shiying': 'Học từ 适应 — thích nghi',
  'hsk4-shang-l1b-pick-chengwei': 'Học từ 成为 — trở thành',
  'hsk4-shang-l1b-goal': 'Chọn mục tiêu với 将来',
  'hsk4-shang-l2a-teacher': 'Nghe cô giáo giới thiệu từ 房租',
  'hsk4-shang-l2a-pick-shoushi': 'Học từ 收拾 — dọn dẹp',
  'hsk4-shang-l2a-pick-ruzhu': 'Học từ 入住 — dọn vào ở',
  'hsk4-shang-l2a-order': 'Xếp câu với 租',
  'hsk4-shang-l2b-teacher': 'Nghe cô giáo giới thiệu từ 客厅',
  'hsk4-shang-l2b-pick-shunli': 'Học từ 顺利 — thuận lợi',
  'hsk4-shang-l2b-pick-lixiang': 'Học từ 理想 — lý tưởng',
  'hsk4-shang-l2b-count': 'Chọn số đúng cho 台',
  'hsk4-shang-l3a-teacher': 'Nghe cô giáo giới thiệu từ 十字路口',
  'hsk4-shang-l3a-pick-zhuan': 'Học từ 转 — rẽ',
  'hsk4-shang-l3a-pick-zhifu': 'Học từ 支付 — thanh toán',
  'hsk4-shang-l3a-order': 'Xếp câu với 扫码',
  'hsk4-shang-l3b-teacher': 'Nghe cô giáo giới thiệu từ 网购',
  'hsk4-shang-l3b-pick-gaibian': 'Học từ 改变 — thay đổi',
  'hsk4-shang-l3b-pick-baohu': 'Học từ 保护 — bảo vệ',
  'hsk4-shang-l3b-order': 'Xếp câu với 密码',
  'hsk4-shang-l4a-teacher': 'Nghe cô giáo giới thiệu từ 感谢',
  'hsk4-shang-l4a-pick-huxiang': 'Học từ 互相 — lẫn nhau',
  'hsk4-shang-l4a-pick-xinku': 'Học từ 辛苦 — vất vả',
  'hsk4-shang-l4a-order': 'Xếp câu với 联系',
  'hsk4-shang-l4b-teacher': 'Nghe cô giáo giới thiệu từ 电动车',
  'hsk4-shang-l4b-pick-liuxing': 'Học từ 流行 — thịnh hành',
  'hsk4-shang-l4b-pick-laideji': 'Học từ 来得及 — kịp',
  'hsk4-shang-l4b-goal': 'Chọn mục tiêu với 心情',
  'hsk4-shang-l5a-teacher': 'Nghe cô giáo giới thiệu từ 辣',
  'hsk4-shang-l5a-pick-dao-liangci': 'Học từ 道 — ',
  'hsk4-shang-l5a-pick-shushou': 'Học từ 熟 — chín',
  'hsk4-shang-l5a-count': 'Chọn số đúng cho 道',
  'hsk4-shang-l5b-teacher': 'Nghe cô giáo giới thiệu từ 聚餐',
  'hsk4-shang-l5b-pick-fu': 'Học từ 付 — trả',
  'hsk4-shang-l5b-pick-zunzhong': 'Học từ 尊重 — tôn trọng',
  'hsk4-shang-l5b-order': 'Xếp câu với 安排',
  'hsk4-shang-l6a-teacher': 'Nghe cô giáo giới thiệu từ 咳嗽',
  'hsk4-shang-l6a-pick-lihai': 'Học từ 厉害 — dữ dội',
  'hsk4-shang-l6a-pick-guahao': 'Học từ 挂号 — đăng ký khám',
  'hsk4-shang-l6a-order': 'Xếp câu với 陪',
  'hsk4-shang-l6b-teacher': 'Nghe cô giáo giới thiệu từ 结果',
  'hsk4-shang-l6b-pick-youxiao': 'Học từ 有效 — có hiệu quả',
  'hsk4-shang-l6b-pick-nanshou': 'Học từ 难受 — khó chịu',
  'hsk4-shang-l6b-count': 'Chọn số đúng cho 步',
  'hsk4-shang-l7a-teacher': 'Nghe cô giáo giới thiệu từ 计划',
  'hsk4-shang-l7a-pick-xixin': 'Học từ 细心 — tỉ mỉ',
  'hsk4-shang-l7a-pick-jingyan': 'Học từ 经验 — kinh nghiệm',
  'hsk4-shang-l7a-order': 'Xếp câu với 调查',
  'hsk4-shang-l7b-teacher': 'Nghe cô giáo giới thiệu từ 困难',
  'hsk4-shang-l7b-pick-youdian': 'Học từ 优点 — ưu điểm',
  'hsk4-shang-l7b-pick-nengli': 'Học từ 能力 — năng lực',
  'hsk4-shang-l7b-goal': 'Chọn mục tiêu với 今后',
  'hsk4-shang-l8a-teacher': 'Nghe cô giáo giới thiệu từ 放松',
  'hsk4-shang-l8a-pick-jinzhang': 'Học từ 紧张 — căng thẳng',
  'hsk4-shang-l8a-pick-fengjing': 'Học từ 风景 — phong cảnh',
  'hsk4-shang-l8a-order': 'Xếp câu với 游玩',
  'hsk4-shang-l8b-teacher': 'Nghe cô giáo giới thiệu từ 效率',
  'hsk4-shang-l8b-pick-meili': 'Học từ 美丽 — xinh đẹp',
  'hsk4-shang-l8b-pick-canguan': 'Học từ 参观 — tham quan',
  'hsk4-shang-l8b-order': 'Xếp câu với 提醒',
  'hsk4-shang-l9a-teacher': 'Nghe cô giáo giới thiệu từ 幸运',
  'hsk4-shang-l9a-pick-gandong': 'Học từ 感动 — cảm động',
  'hsk4-shang-l9a-pick-xingfu': 'Học từ 幸福 — hạnh phúc',
  'hsk4-shang-l9a-goal': 'Chọn mục tiêu với 共同',
  'hsk4-shang-l9b-teacher': 'Nghe cô giáo giới thiệu từ 友情',
  'hsk4-shang-l9b-pick-yinxiang': 'Học từ 印象 — ấn tượng',
  'hsk4-shang-l9b-pick-jingying': 'Học từ 经营 — kinh doanh',
  'hsk4-shang-l9b-order': 'Xếp câu với 爱情',
  'hsk4-shang-l10a-teacher': 'Nghe cô giáo giới thiệu từ 气温',
  'hsk4-shang-l10a-pick-chabie': 'Học từ 差别 — sự khác biệt',
  'hsk4-shang-l10a-pick-nuanhuo': 'Học từ 暖和 — ấm áp',
  'hsk4-shang-l10a-count': 'Chọn số đúng cho 零下',
  'hsk4-shang-l10b-teacher': 'Nghe cô giáo giới thiệu từ 气候',
  'hsk4-shang-l10b-pick-fangyan': 'Học từ 方言 — phương ngữ',
  'hsk4-shang-l10b-pick-jieyue': 'Học từ 节约 — tiết kiệm',
  'hsk4-shang-l10b-order': 'Xếp câu với 开展',
  'hsk4-xia-l11a-teacher': 'Nghe cô giáo giới thiệu từ 继续',
  'hsk4-xia-l11a-pick-fengfu': 'Học từ 丰富 — phong phú',
  'hsk4-xia-l11a-pick-xianmu': 'Học từ 羡慕 — ngưỡng mộ',
  'hsk4-xia-l11a-order': 'Xếp câu với 自学',
  'hsk4-xia-l11b-teacher': 'Nghe cô giáo giới thiệu từ 养成',
  'hsk4-xia-l11b-pick-chenggong': 'Học từ 成功 — thành công',
  'hsk4-xia-l11b-pick-zhunshi': 'Học từ 准时 — đúng giờ',
  'hsk4-xia-l11b-goal': 'Chọn mục tiêu với 目的',
  'hsk4-xia-l12a-teacher': 'Nghe cô giáo giới thiệu từ 适合',
  'hsk4-xia-l12a-pick-dazhe': 'Học từ 打折 — giảm giá',
  'hsk4-xia-l12a-pick-daoqian': 'Học từ 道歉 — xin lỗi',
  'hsk4-xia-l12a-order': 'Xếp câu với 挂',
  'hsk4-xia-l12b-teacher': 'Nghe cô giáo giới thiệu từ 父母',
  'hsk4-xia-l12b-pick-wulun': 'Học từ 无论 — bất luận',
  'hsk4-xia-l12b-pick-shangliang': 'Học từ 商量 — bàn bạc',
  'hsk4-xia-l12b-goal': 'Chọn mục tiêu với 勇敢',
  'hsk4-xia-l13a-teacher': 'Nghe cô giáo giới thiệu từ 景区',
  'hsk4-xia-l13a-pick-kaiwanxiao': 'Học từ 开玩笑 — nói đùa',
  'hsk4-xia-l13a-pick-yuebing': 'Học từ 月饼 — bánh trung thu',
  'hsk4-xia-l13a-order': 'Xếp câu với 赶',
  'hsk4-xia-l13b-teacher': 'Nghe cô giáo giới thiệu từ 团圆',
  'hsk4-xia-l13b-pick-chuantong': 'Học từ 传统 — truyền thống',
  'hsk4-xia-l13b-pick-huiyi': 'Học từ 回忆 — hồi tưởng',
  'hsk4-xia-l13b-count': 'Chọn số đúng cho 大约',
  'hsk4-xia-l14a-teacher': 'Nghe cô giáo giới thiệu từ 茶叶',
  'hsk4-xia-l14a-pick-chaoguo': 'Học từ 超过 — vượt quá',
  'hsk4-xia-l14a-pick-cuxiao': 'Học từ 促销 — khuyến mãi',
  'hsk4-xia-l14a-order': 'Xếp câu với 装',
  'hsk4-xia-l14b-teacher': 'Nghe cô giáo giới thiệu từ 价钱',
  'hsk4-xia-l14b-pick-youhao': 'Học từ 友好 — thân thiện',
  'hsk4-xia-l14b-pick-taidu': 'Học từ 态度 — thái độ',
  'hsk4-xia-l14b-goal': 'Chọn mục tiêu với 表示',
  'hsk4-xia-l15a-teacher': 'Nghe cô giáo giới thiệu từ 应聘',
  'hsk4-xia-l15a-pick-baoming': 'Học từ 报名 — đăng ký',
  'hsk4-xia-l15a-pick-mianshi': 'Học từ 面试 — phỏng vấn',
  'hsk4-xia-l15a-order': 'Xếp câu với 填写',
  'hsk4-xia-l15b-teacher': 'Nghe cô giáo giới thiệu từ 职业',
  'hsk4-xia-l15b-pick-jidong': 'Học từ 激动 — xúc động',
  'hsk4-xia-l15b-pick-wanquan': 'Học từ 完全 — hoàn toàn',
  'hsk4-xia-l15b-goal': 'Chọn mục tiêu với 自我',
  'hsk4-xia-l16a-teacher': 'Nghe cô giáo giới thiệu từ 旅行',
  'hsk4-xia-l16a-pick-quxiao': 'Học từ 取消 — hủy bỏ',
  'hsk4-xia-l16a-pick-tuichi': 'Học từ 推迟 — trì hoãn',
  'hsk4-xia-l16a-order': 'Xếp câu với 等到',
  'hsk4-xia-l16b-teacher': 'Nghe cô giáo giới thiệu từ 灵活',
  'hsk4-xia-l16b-pick-shiwang': 'Học từ 失望 — thất vọng',
  'hsk4-xia-l16b-pick-youqu': 'Học từ 有趣 — thú vị',
  'hsk4-xia-l16b-count': 'Chọn số đúng cho 部',
  'hsk4-xia-l17a-teacher': 'Nghe cô giáo giới thiệu từ 健身',
  'hsk4-xia-l17a-pick-zhunque': 'Học từ 准确 — chính xác',
  'hsk4-xia-l17a-pick-haochu': 'Học từ 好处 — lợi ích',
  'hsk4-xia-l17a-count': 'Chọn số đúng cho 趟',
  'hsk4-xia-l17b-teacher': 'Nghe cô giáo giới thiệu từ 进步',
  'hsk4-xia-l17b-pick-guli': 'Học từ 鼓励 — khuyến khích',
  'hsk4-xia-l17b-pick-mengxiang': 'Học từ 梦想 — ước mơ',
  'hsk4-xia-l17b-goal': 'Chọn mục tiêu với 赢',
  'hsk4-xia-l18a-teacher': 'Nghe cô giáo giới thiệu từ 共享单车',
  'hsk4-xia-l18a-pick-taolun': 'Học từ 讨论 — thảo luận',
  'hsk4-xia-l18a-pick-zhuming': 'Học từ 著名 — nổi tiếng',
  'hsk4-xia-l18a-order': 'Xếp câu với 二维码',
  'hsk4-xia-l18b-teacher': 'Nghe cô giáo giới thiệu từ 互联网',
  'hsk4-xia-l18b-pick-bubi': 'Học từ 不必 — không cần',
  'hsk4-xia-l18b-pick-tichu': 'Học từ 提出 — đưa ra',
  'hsk4-xia-l18b-goal': 'Chọn mục tiêu với 上门',
  'hsk4-xia-l19a-teacher': 'Nghe cô giáo giới thiệu từ 话剧',
  'hsk4-xia-l19a-pick-gesheng': 'Học từ 歌声 — giọng hát',
  'hsk4-xia-l19a-pick-guanzhong': 'Học từ 观众 — khán giả',
  'hsk4-xia-l19a-order': 'Xếp câu với 排',
  'hsk4-xia-l19b-teacher': 'Nghe cô giáo giới thiệu từ 作家',
  'hsk4-xia-l19b-pick-qidai': 'Học từ 期待 — mong đợi',
  'hsk4-xia-l19b-pick-wenxue': 'Học từ 文学 — văn học',
  'hsk4-xia-l19b-goal': 'Chọn mục tiêu với 邀请',
  'hsk4-xia-l20a-teacher': 'Nghe cô giáo giới thiệu từ 乘',
  'hsk4-xia-l20a-pick-duche': 'Học từ 堵车 — tắc xe',
  'hsk4-xia-l20a-pick-zhuanji': 'Học từ 转机 — chuyển máy bay',
  'hsk4-xia-l20a-order': 'Xếp câu với 登机',
  'hsk4-xia-l20b-teacher': 'Nghe cô giáo giới thiệu từ 导游',
  'hsk4-xia-l20b-pick-jiesheng': 'Học từ 节省 — tiết kiệm',
  'hsk4-xia-l20b-pick-liuli': 'Học từ 流利 — lưu loát',
  'hsk4-xia-l20b-count': 'Chọn số đúng cho 卷',
  'final-review': 'Kiểm tra cuối 5 từ (tự nhớ)',
  result: 'Xem kết quả buổi học',
};

/** Thẻ chọn bài học — dùng chung cho màn mở đầu và menu "Đổi bài" trong game.
 *  Bước 6: cả 9 bài HSK 3 đều mở được ngay (MỞ TỰ DO — không khóa bài sau
 *  theo bài trước; trạng thái từng bài vẫn hiện rõ). Bài 10 có 2 quest
 *  (nhóm 1 "Buổi học đầu tiên" + nhóm 2–4); các bài 11–18 mỗi bài 1 quest.
 *  Bước 7: cả 20 bài HSK 4 đều mở được ngay (MỞ TỰ DO — mỗi bài 2 quest
 *  phần 1 + phần 2, bấm bài học tiếp quest chưa xong đầu tiên như bài 10).
 *  HSK 5 giữ khóa "Sắp ra mắt" (chưa có nguồn). */
function LessonPickerCard({ activeQuestId, completedQuests, onPick, onClose, onHome }: {
  activeQuestId: string | null;
  completedQuests: Record<string, { at: string; points: number }>;
  onPick: (questId: string) => void;
  onClose: () => void;
  onHome?: () => void;
}) {
  // Quest của từng bài: bài 10 có 2 quest, mỗi bài HSK 4 có 2 quest
  // (phần 1 + phần 2), các bài HSK 3 còn lại 1 quest.
  const questIdsForLesson = (lessonId: string): string[] => {
    if (lessonId === 'hsk3-l10') return [...L10_QUEST_IDS];
    if (HSK4_LESSON_QUEST_IDS[lessonId]) return [...HSK4_LESSON_QUEST_IDS[lessonId]];
    return [lessonId.replace('hsk3-l', 'l')];
  };
  const statusForLesson = (lessonId: string): string => {
    const qids = questIdsForLesson(lessonId);
    if (activeQuestId && qids.includes(activeQuestId)) return 'Đang học dở — bấm để học tiếp';
    const done = qids.filter((q) => completedQuests[q]);
    if (done.length === qids.length) return 'Đã hoàn thành ✓ — bấm để chơi lại';
    if (done.length > 0) {
      return lessonId === 'hsk3-l10'
        ? 'Nhóm 1 ✓ · Nhóm 2–4 chưa bắt đầu — bấm để học tiếp'
        : 'Đã học một phần — bấm để học tiếp';
    }
    return 'Chưa bắt đầu — bấm để học';
  };
  // Quest sẽ bắt đầu khi bấm vào bài: quest đang dở (học tiếp) → quest
  // chưa xong đầu tiên → quest đầu của bài (chơi lại).
  const pickForLesson = (lessonId: string): string => {
    const qids = questIdsForLesson(lessonId);
    if (activeQuestId && qids.includes(activeQuestId)) return activeQuestId;
    return qids.find((q) => !completedQuests[q]) ?? qids[0];
  };
  // Nút chọn một bài (dùng chung HSK 3 + HSK 4): hiện số từ + trạng thái.
  const lessonButton = (lesson: Lesson, levelLabel: string) => {
    const wordCount =
      (levelLabel === 'HSK 3' ? HSK3_LESSON_LEXEMES : HSK4_LESSON_LEXEMES)[lesson.id]?.length ?? 0;
    return (
      <button
        key={lesson.id}
        type="button"
        data-testid={`lesson-pick-${lesson.id}`}
        onClick={() => onPick(pickForLesson(lesson.id))}
        className="mb-2 w-full rounded-xl border border-[#A54432]/40 bg-[#FFF8E6] px-4 py-3 text-left transition hover:bg-[#A54432]/10"
      >
        <span className="block text-base font-bold text-[#2B2B2B]">
          {levelLabel} · Bài {lesson.number} — {lesson.title}
        </span>
        <span className="block text-sm text-[#2B2B2B]/70">
          {lesson.topic} · {wordCount} từ · {statusForLesson(lesson.id)}
        </span>
      </button>
    );
  };
  return (
    <div data-testid="lesson-picker" className="w-full max-w-md rounded-2xl border border-[#1c2b1f]/15 bg-white p-4 text-left shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1c2b1f]">Chọn bài học</h2>
        <button
          type="button"
          aria-label="Đóng chọn bài"
          onClick={onClose}
          className="rounded-full bg-black/10 px-2 py-0.5 font-bold text-[#1c2b1f]"
        >
          ✕
        </button>
      </div>
      {/* Danh sách bài cuộn trong thẻ (29 bài HSK 3 + HSK 4 không vừa màn
          hình): tiêu đề + nút "Về màn hình chính" luôn hiện, chỉ phần danh
          sách cuộn — trên điện thoại thật vẫn bấm được bài ở cuối danh sách. */}
      <div data-testid="lesson-list" className="max-h-[58vh] overflow-y-auto pr-1">
      <h3 className="mb-1 text-sm font-bold text-[#1c2b1f]/80">HSK 3 · Bài 10–18</h3>
      {HSK3_LESSONS.map((lesson) => lessonButton(lesson, 'HSK 3'))}
      <h3 className="mb-1 mt-3 text-sm font-bold text-[#1c2b1f]/80">HSK 4 · Quyển thượng · Bài 1–10</h3>
      {HSK4_LESSONS.filter((l) => l.id.startsWith('hsk4-shang')).map((lesson) => lessonButton(lesson, 'HSK 4'))}
      <h3 className="mb-1 mt-3 text-sm font-bold text-[#1c2b1f]/80">HSK 4 · Quyển hạ · Bài 11–20</h3>
      {HSK4_LESSONS.filter((l) => l.id.startsWith('hsk4-xia')).map((lesson) => lessonButton(lesson, 'HSK 4'))}
      <div className="mb-2 w-full cursor-not-allowed rounded-xl border border-[#2B2B2B]/10 bg-[#2B2B2B]/5 px-4 py-3 text-left text-sm text-[#2B2B2B]/50">
        HSK 5 — Sắp ra mắt
      </div>
      </div>
      {onHome && (
        <button
          type="button"
          onClick={onHome}
          className="w-full rounded-full border-2 border-[#1c2b1f]/30 px-6 py-2.5 text-base font-semibold text-[#1c2b1f] transition hover:bg-black/5"
        >
          🏠 Về màn hình chính
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [zone, setZone] = useState(playerState.zone);
  const [viewMode, setViewMode] = useState<'follow' | 'top'>(playerState.viewMode);
  const [toast, setToast] = useState<string | null>(null);
  // Hộp "Cách di chuyển" mặc định THU GỌN trong game (mục 7, 06/11): chỉ
  // hiện nút "?" để mở lại; màn hình vào (entry screen) không dùng state này.
  const [helpOpen, setHelpOpen] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [panel, setPanel] = useState<'quest' | 'handbook' | 'result' | 'review' | null>(null);
  const [handbookTab, setHandbookTab] = useState<'lesson' | 'encountered' | 'due' | 'known' | 'search' | 'calendar' | 'errors' | 'badges'>('lesson');
  // Phiên ôn nhanh (Bước 8): mở từ Lịch ôn / Sổ lỗi trong sổ tay.
  const [reviewSession, setReviewSession] = useState<{ ids: string[]; mode: 'review' | 'error'; title: string } | null>(null);
  const [inClassroom, setInClassroom] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [homework, setHomework] = useState<HomeworkState>('desk');
  const [actionDone, setActionDone] = useState(false);
  const [interactLabel, setInteractLabel] = useState<string | null>(null);
  // Đợt 3 giai đoạn 4 — xe máy: HUD đọc bikeState mỗi 200 ms (cùng poll
  // vật tương tác), không re-render mỗi frame.
  const [riding, setRiding] = useState(false);
  const [bikeSpeed, setBikeSpeed] = useState(0);
  const lastBikeNoticeRef = useRef(0);
  const [noVoice, setNoVoice] = useState(false);
  // Đã đóng banner thiếu giọng trong phiên: chặn setNoVoice(true) gọi lại
  // (lỗi TTS mỗi lần đọc / kiểm tra lại khi vào trường) để banner không tự
  // hiện lại liên tục. Trạng thái âm thanh vẫn giữ trong
  // progress.settings.soundOn (nút 🔊/🔇 góc trên-phải) — không kho mới.
  const noVoiceDismissedRef = useRef(false);
  const [fade, setFade] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  // Đợt 3 giai đoạn 5 — dịch chuyển nhanh: panel chọn điểm + khóa bấm chồng
  // ở tầng page (travelingRef chặn ngay trong cùng một nhịp bấm; hook
  // __bkhn.fastTravel chặn thêm ở tầng Player bằng fastTravelState).
  const [fastTravelOpen, setFastTravelOpen] = useState(false);
  const [traveling, setTraveling] = useState(false);
  const travelingRef = useRef(false);
  const [recallResults, setRecallResults] = useState<{ lexemeId: string; correct: boolean }[]>([]);
  const [rewardAlreadyGiven, setRewardAlreadyGiven] = useState(false);
  // Vòng ôn lại ngay (F2a) mở riêng từ nút "Ôn lỗi ngay" ở màn kết quả:
  // id các từ sai trong phiên; null = không mở vòng ôn lại.
  const [reReviewIds, setReReviewIds] = useState<string[] | null>(null);
  const [reReviewResults, setReReviewResults] = useState<{ lexemeId: string; correct: boolean }[]>([]);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<Progress | null>(null);
  const interactableRef = useRef<string | null>(null);
  const panelRef = useRef<typeof panel>(null);
  // F5b — lần cuối đã lưu yaw/pitch vào questState (chống ghi liên tục).
  const lastYawSaveRef = useRef<{ yaw: number; pitch: number; at: number } | null>(null);
  // Bước 8 — huy hiệu toàn cục đã đạt TRƯỚC buổi học hiện tại (để màn kết
  // quả đánh dấu huy hiệu mới đạt trong buổi này).
  const badgesBeforeQuestRef = useRef<string[]>([]);
  panelRef.current = panel;

  // Toàn bộ 1057 từ (HSK 3 246 + HSK 4 811) — QuestPanel/ResultPanel tra
  // cứu mọi từ qua đây; chỉ dùng HSK 3 sẽ làm quest HSK 4 mất từ.
  const ALL_LEXEMES = useMemo(
    () => [...(LEXEMES as unknown as Lexeme[]), ...ALL_HSK4_LEXEMES],
    [],
  );

  const lexemeById = useMemo(() => {
    const m: Record<string, Lexeme> = {};
    for (const l of ALL_LEXEMES) m[l.id] = l;
    return m;
  }, [ALL_LEXEMES]);

  const questState = progress?.questState ?? null;
  const questActive = !!questState && !questState.done;
  const stepIndex = questState?.stepIndex ?? 0;
  // Quest hiện tại phân giải theo questState.questId (registry Bước 6);
  // id lạ (dữ liệu lưu hỏng) fallback về tuyến bài 10 nhóm 1. Chưa chọn
  // bài nào thì mặc định cũng là tuyến bài 10 (cho sổ tay + menu).
  const currentQuestDef: QuestDef =
    getQuestDef(questState?.questId ?? '') ?? (getQuestDef('first-lesson') as QuestDef);
  const currentQuest = currentQuestDef.quest;
  const currentSteps = currentQuestDef.steps;
  const step: QuestStep | undefined = questActive ? currentSteps[stepIndex] : undefined;
  // Tuyến bài 10 nhóm 1 đã hoàn thành trước đây? (E gần Minh chỉ tự bắt
  // đầu tuyến đầu khi chưa xong quest nào; đã xong thì chọn bài từ menu.)
  const questDoneBefore = !!progress?.completedQuests?.[FIRST_LESSON_QUEST.id];
  // Đã hoàn thành quest hiện tại / bất kỳ quest nào (vào phòng tự do).
  const currentQuestDone = !!progress?.completedQuests?.[currentQuest.id];
  const anyQuestDone = !!progress && Object.keys(progress.completedQuests ?? {}).length > 0;
  // Từ của bài đang học (sổ tay hiển thị theo bài này; mặc định bài 10).
  const currentLessonLexemes: Lexeme[] =
    HSK3_LESSON_LEXEMES[currentQuest.lessonId] ??
    HSK4_LESSON_LEXEMES[currentQuest.lessonId] ??
    (LEXEMES as unknown as Lexeme[]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  // --- Nạp + lưu tiến độ (localStorage, không tài khoản) ----------------------
  useEffect(() => {
    try {
      const p = loadProgress(window.localStorage);
      progressRef.current = p;
      badgesBeforeQuestRef.current = getEarnedGlobalBadgeIds(p);
      setProgress(p);
    } catch {
      // loadProgress lỗi (dữ liệu hỏng): giữ progress null, người dùng vẫn
      // vào trường được; sổ tay sẽ báo khi nhập lại.
    }
  }, []);
  useEffect(() => {
    progressRef.current = progress;
    if (progress) {
      try {
        saveProgress(window.localStorage, progress);
      } catch {
        // Lưu thất bại (đầy bộ nhớ…): không chặn chơi, ghi chú ở sổ tay.
      }
    }
  }, [progress]);

  const soundOn = progress?.settings?.soundOn ?? true;
  const speechRate = progress?.settings?.speechRate ?? 1.0;

  const speakText = useCallback(
    (text: string) => {
      if (!soundOn) return;
      try {
        stopSpeaking();
        speak(text, {
          rate: speechRate,
          onError: (e) => {
            if (e === 'no-voice' && !noVoiceDismissedRef.current) setNoVoice(true);
          },
        });
      } catch {
        // TTS lỗi: không chặn học, người dùng vẫn đọc được chữ.
      }
    },
    [soundOn, speechRate],
  );

  // Kiểm tra giọng zh-CN sau khi vào trường (chỉ phát sau tương tác).
  useEffect(() => {
    if (!entered) return;
    try {
      if (!hasChineseVoice() && !noVoiceDismissedRef.current) setNoVoice(true);
    } catch {
      // hasChineseVoice lỗi: không chặn học.
    }
  }, [entered]);

  // Khu hiện tại + chế độ camera: đọc playerState.zone/viewMode mỗi 200 ms (HUD chỉ ĐỌC).
  // F5b — khi ở trong phòng học thì lưu góc camera (yaw/pitch) vào
  // questState để reload trong phòng khôi phục đúng hướng nhìn bảng.
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      setZone(playerState.zone);
      setViewMode(playerState.viewMode);
      if (!playerState.inClassroom) return;
      const yaw = playerState.cameraYaw;
      const pitch = playerState.cameraPitch;
      if (typeof yaw !== 'number' || typeof pitch !== 'number') return;
      const last = lastYawSaveRef.current;
      const now = Date.now();
      if (
        last &&
        Math.abs(last.yaw - yaw) < 0.1 &&
        Math.abs(last.pitch - pitch) < 0.05
      ) {
        return;
      }
      if (last && now - last.at < 1500) return;
      lastYawSaveRef.current = { yaw, pitch, at: now };
      // Dạng functional (không đọc progressRef.current): tránh ghi đè
      // mất bước quest vừa được advance() cập nhật cùng lúc (race ở
      // cửa phòng: poll object-form đã từng kéo stepIndex 2 về 1).
      setProgress((prev) => {
        if (!prev || !prev.questState) return prev;
        return { ...prev, questState: { ...prev.questState, yaw, pitch } };
      });
    }, 200);
    return () => clearInterval(id);
  }, [entered]);

  // Top-view (test hook): tự ẩn hộp hướng dẫn để khỏi che khung cảnh.
  useEffect(() => {
    if (viewMode === 'top') setHelpOpen(false);
  }, [viewMode]);

  // (Bỏ effect cũ "hiển thị mặc định trên desktop, thu gọn trên mobile":
  // mặc định giờ đã thu gọn ở mọi cỡ màn hình — xem useState helpOpen.)

  // Khi panel học hoặc menu chọn bài mở: khóa di chuyển (Player đọc flag mỗi frame).
  useEffect(() => {
    playerState.uiLocked = panel !== null || lessonsOpen;
    return () => {
      playerState.uiLocked = false;
    };
  }, [panel, lessonsOpen]);

  // Đồng bộ mode phòng học từ hook Player (enter/exitClassroom).
  useEffect(() => {
    const onMode = (e: Event) => {
      const d = (e as CustomEvent<{ inClassroom: boolean }>).detail;
      if (d) setInClassroom(d.inClassroom);
    };
    window.addEventListener('bkhn:classroom', onMode);
    return () => window.removeEventListener('bkhn:classroom', onMode);
  }, []);

  // --- Bắt đầu / chơi lại quest (mặc định tuyến bài 10 nhóm 1) ----------------
  const startQuest = useCallback((questId: string = FIRST_LESSON_QUEST.id) => {
    const p = progressRef.current;
    if (!p) return;
    const def = getQuestDef(questId) ?? (getQuestDef('first-lesson') as QuestDef);
    setRecallResults([]);
    setReReviewIds(null);
    setReReviewResults([]);
    setNotebookOpen(false);
    setHomework('desk');
    setActionDone(false);
    setRewardAlreadyGiven(!!p.completedQuests?.[def.quest.id]);
    badgesBeforeQuestRef.current = getEarnedGlobalBadgeIds(p);
    setProgress({
      ...p,
      questState: { questId: def.quest.id, stepIndex: 0, done: false },
    });
    setPanel('quest');
  }, []);

  // --- Gặp từ: đánh dấu encountered khi vào bước có lexemeId -------------------
  useEffect(() => {
    if (!entered || !step || !('lexemeId' in step) || !step.lexemeId) return;
    const id = step.lexemeId;
    setProgress((prev) => {
      if (!prev) return prev;
      return markEncountered(prev, id);
    });
  }, [entered, step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Nói câu tiếng Trung khi vào bước talk / pick-object / choose-number ----
  useEffect(() => {
    if (!entered || !step) return;
    if (step.kind === 'talk' && step.speakText) speakText(step.speakText);
    if (step.kind === 'pick-object') speakText(step.zh);
    if (step.kind === 'choose-number') speakText(step.zh);
    if (step.kind === 'choose-goal') speakText(step.zh);
  }, [entered, step?.id, speakText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sang bước mới (không phải bước đi bộ) thì tự mở lại panel học — ví dụ
  // vừa vào phòng học xong phải thấy ngay lời cô giáo. Người dùng đóng panel
  // giữa chừng thì panel vẫn đóng cho tới khi sang bước khác (effect chỉ
  // chạy khi step đổi).
  useEffect(() => {
    if (!entered || !step || step.kind === 'goto') return;
    setPanel('quest');
  }, [entered, step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Vật tương tác gần nhất (poll 200 ms) ------------------------------------
  // Thứ tự ưu tiên prompt E (đợt 3 giai đoạn 4) — chỉ HIỆN ĐÚNG 1 prompt:
  //   1. đang lái xe → "E — Xuống xe" (chỉ xuống được khi dừng/gần dừng);
  //   2. đứng gần xe (≤ 2,2 m) → "E — Lên xe" (ưu tiên hơn Minh/cửa lớp vì
  //      là hành động vật lý ngay trước mặt; thực tế xe đỗ (-70, 14,5)
  //      cách Minh (-72, 8) ~6,8 m nên 2 vùng trigger không chồng nhau);
  //   3. các vật tương tác học tập (Minh / cửa lớp / bảng / vở / bài tập).
  useEffect(() => {
    if (!entered) return;
    const id = setInterval(() => {
      const pos = playerState.pos;
      const dist = (x: number, z: number) => Math.hypot(pos.x - x, pos.z - z);
      setRiding(bikeState.riding);
      setBikeSpeed(bikeState.speed);
      // Thông báo một lần từ Player (vd xe bị chặn ở cửa phòng học).
      if (bikeState.notice && bikeState.notice.id !== lastBikeNoticeRef.current) {
        lastBikeNoticeRef.current = bikeState.notice.id;
        showToast(bikeState.notice.text);
      }
      let found: { id: string; label: string } | null = null;
      if (!inClassroom && bikeState.riding) {
        found = {
          id: 'bike-dismount',
          label: Math.abs(bikeState.speed) <= 0.5 ? 'E — Xuống xe' : 'E — Xuống xe (chỉ khi dừng hẳn)',
        };
      } else if (!inClassroom && dist(bikeState.pos.x, bikeState.pos.z) <= 2.2) {
        found = { id: 'bike-mount', label: 'E — Lên xe' };
      } else if (!inClassroom) {
        if (!questActive && !questDoneBefore && dist(MINH_POS.x, MINH_POS.z) <= MINH_RADIUS) {
          found = { id: 'npc-minh', label: 'E — Nói chuyện với Minh' };
        } else if (questActive && step?.id === 'greet-minh' && dist(MINH_POS.x, MINH_POS.z) <= MINH_RADIUS) {
          found = { id: 'npc-minh', label: 'E — Nói chuyện với Minh' };
        } else if (
          (questActive && step?.id === 'goto-door') || anyQuestDone
        ) {
          if (dist(CLASSROOM_DOOR.pos.x, CLASSROOM_DOOR.pos.z) <= CLASSROOM_DOOR.triggerRadius) {
            found = { id: 'classroom-door', label: 'E — Vào phòng học' };
          }
        }
      } else {
        if (questActive && step?.id === 'find-board' && dist(CLASSROOM.board.x, CLASSROOM.board.z) <= 2.5) {
          found = { id: 'board', label: 'E — Chọn bảng đen' };
        } else if (questActive && step?.id === 'open-notebook' && dist(CLASSROOM.notebook.x, CLASSROOM.notebook.z) <= 2) {
          found = { id: 'notebook', label: 'E — Mở vở ghi chép' };
        } else if (questActive && step?.id === 'take-homework' && dist(CLASSROOM.homework.x, CLASSROOM.homework.z) <= 2) {
          found = { id: 'homework', label: 'E — Nhận bài tập' };
        }
      }
      interactableRef.current = found?.id ?? null;
      setInteractLabel(found?.label ?? null);
    }, 200);
    return () => clearInterval(id);
  }, [entered, inClassroom, questActive, questDoneBefore, anyQuestDone, step?.id]);

  // --- Ghi đáp án vào store -----------------------------------------------------
  const handleAnswer = useCallback((a: QuestAnswer) => {
    const p = progressRef.current;
    if (!p || !a.lexemeId) return;
    const questId = p.questState?.questId ?? FIRST_LESSON_QUEST.id;
    setProgress(
      recordAnswer(p, {
        lexemeId: a.lexemeId,
        correct: a.correct,
        usedHint: a.usedHint,
        activity: a.activity,
        questId,
        firstTry: a.firstTry ?? true,
      }),
    );
    // Xếp câu 把 đúng → tập bài bay tới tay cô giáo (chỉ tuyến bài 10).
    if (a.activity === 'fill' && a.correct && questId === FIRST_LESSON_QUEST.id) setHomework('teacher');
  }, []);

  const handleReviewAnswer = useCallback((correct: boolean, lexemeId: string) => {
    const p = progressRef.current;
    if (!p) return;
    setProgress(
      recordAnswer(p, {
        lexemeId,
        correct,
        usedHint: false,
        activity: 'review',
        questId: p.questState?.questId ?? FIRST_LESSON_QUEST.id,
        // Mỗi câu kiểm tra cuối chỉ trả lời một lần → luôn là lần thử đầu.
        firstTry: true,
      }),
    );
    setRecallResults((prev) => [...prev, { lexemeId, correct }]);
  }, []);

  // Vòng ôn lại ngay (F2a): ghi bằng recordReReview — 0đ, không đổi
  // level/nextDue dài hạn; chỉ để biết từ sai đã được hỏi lại/sửa chưa.
  const handleReReviewAnswer = useCallback((correct: boolean, lexemeId: string) => {
    const p = progressRef.current;
    if (!p) return;
    setProgress(recordReReview(p, lexemeId, correct));
    setReReviewResults((prev) => [...prev, { lexemeId, correct }]);
  }, []);

  const advance = useCallback(() => {
    setActionDone(false);
    setProgress((prev) => {
      if (!prev || !prev.questState) return prev;
      const def = getQuestDef(prev.questState.questId) ?? (getQuestDef('first-lesson') as QuestDef);
      const nextIdx = prev.questState.stepIndex + 1;
      if (nextIdx >= def.steps.length) return prev;
      return { ...prev, questState: { ...prev.questState, stepIndex: nextIdx } };
    });
  }, []);

  // --- Hành động với vật trong phòng (vở / bài tập) ------------------------------
  const handleObjectAction = useCallback(
    (objectId: 'notebook' | 'homework') => {
      if (!questActive || !step || step.kind !== 'interact-object' || step.objectId !== objectId) {
        return;
      }
      if (objectId === 'notebook') setNotebookOpen(true);
      if (objectId === 'homework') setHomework('hand');
      setActionDone(true);
      const p = progressRef.current;
      if (p) setProgress(markEncountered(p, step.lexemeId));
    },
    [questActive, step],
  );

  // Bấm vật 3D trong phòng (raycast onClick) — kiểm tra khoảng cách rồi mới tính.
  // Panel quest đang mở KHÔNG chặn bấm vật (người chơi vẫn thấy bảng/bàn phía
  // trên panel); chỉ khi sổ tay đang mở thì mọi tương tác 3D đều khóa.
  const handleObjectClick = useCallback(
    (id: string) => {
      if (panelRef.current === 'handbook') return;
      const pos = playerState.pos;
      const near = (x: number, z: number, r: number) => Math.hypot(pos.x - x, pos.z - z) <= r;
      if (id === 'board') {
        if (!near(CLASSROOM.board.x, CLASSROOM.board.z, 2.5)) {
          showToast('Hãy đến gần bảng hơn để chọn.');
          return;
        }
        window.dispatchEvent(new CustomEvent('bkhn:quest-object', { detail: { id: 'board' } }));
        return;
      }
      if (id === 'notebook' || id === 'homework') {
        if (!near(CLASSROOM.notebook.x, CLASSROOM.notebook.z, 2)) {
          showToast('Hãy đến gần bàn 1 hơn.');
          return;
        }
        handleObjectAction(id);
        return;
      }
      // Vật gây nhiễu (cửa sổ, đồng hồ, kệ sách, bàn): vẫn tính là lựa chọn ở bước chọn bảng.
      if (step?.kind === 'pick-object') {
        window.dispatchEvent(new CustomEvent('bkhn:quest-object', { detail: { id } }));
      }
    },
    [handleObjectAction, showToast, step?.kind],
  );

  // --- Vào / ra phòng học (fade) ---------------------------------------------------
  const enterClassroomFade = useCallback(() => {
    setFade(true);
    window.setTimeout(() => {
      getHook()?.enterClassroom();
      setInClassroom(true);
      setFade(false);
    }, 350);
  }, []);

  const exitClassroomFade = useCallback(() => {
    setFade(true);
    window.setTimeout(() => {
      getHook()?.exitClassroom();
      setInClassroom(false);
      setFade(false);
    }, 350);
  }, []);

  // --- Dịch chuyển nhanh (đợt 3 giai đoạn 5) -----------------------------------
  // Chỉ thay vị trí + hướng nhìn — không chạm quest/progress/điểm (hook
  // Player.fastTravel không gọi bất kỳ hàm store nào). Trình tự: khóa bấm
  // chồng → đóng panel học/menu (mở khóa uiLocked, tránh kẹt phím sau khi
  // tới) → fade đen 350 ms → đặt người xuống ở đích → fade về 350 ms →
  // mở khóa. Đang lái xe thì Player tự dừng xe + đỗ xe gần đích.
  const doFastTravel = useCallback((destId: string) => {
    if (travelingRef.current) return;
    const hook = getHook();
    if (!hook?.fastTravel) return;
    travelingRef.current = true;
    setTraveling(true);
    setFastTravelOpen(false);
    setPanel(null);
    setLessonsOpen(false);
    setReReviewIds(null);
    setFade(true);
    window.setTimeout(() => {
      const r = hook.fastTravel?.(destId);
      if (r?.ok) {
        const dest = FAST_TRAVEL_DESTINATIONS.find((d) => d.id === destId);
        if (dest) showToast(`Đã tới ${dest.name}.`);
      } else if (r?.reason === 'busy') {
        showToast('Đang chuyển cảnh — đợi một chút rồi thử lại.');
      } else {
        showToast('Chưa đi nhanh được — thử lại sau.');
      }
      window.setTimeout(() => {
        setFade(false);
        travelingRef.current = false;
        setTraveling(false);
      }, 350);
    }, 350);
  }, [showToast]);

  /** Thoát buổi học giữa chừng: đóng mọi panel, ra khỏi phòng (nếu đang trong
   *  lớp), giữ nguyên tiến độ + bước quest — vào lớp lại sẽ học tiếp đúng
   *  bước đang dở, không mất điểm đã kiếm. */
  const exitLesson = useCallback(() => {
    setPanel(null);
    setReReviewIds(null);
    setLessonsOpen(false);
    if (inClassroom) exitClassroomFade();
    showToast('Đã thoát buổi học — tiến độ vẫn được lưu, vào lớp lại để học tiếp.');
  }, [inClassroom, exitClassroomFade, showToast]);

  /** Chọn bài từ menu trong game: nếu đang học dở đúng quest đó thì chỉ
   *  đóng menu để học tiếp; nếu chưa bắt đầu hoặc đã xong thì bắt đầu /
   *  chơi lại (ra khỏi phòng trước nếu đang trong lớp). */
  const pickLesson = useCallback((questId: string) => {
    setLessonsOpen(false);
    if (inClassroom) exitClassroomFade();
    if (questActive && questState?.questId === questId) return;
    startQuest(questId);
  }, [inClassroom, exitClassroomFade, questActive, questState?.questId, startQuest]);

  /** Về màn hình chính (mở đầu): đóng mọi panel, ra khỏi phòng học ngay
   *  (không chờ fade vì canvas sắp tháo), giữ tiến độ đã lưu. */
  const goToMenu = useCallback(() => {
    setPanel(null);
    setReReviewIds(null);
    setLessonsOpen(false);
    try {
      getHook()?.exitClassroom();
    } catch {
      // Scene đã tháo — không cần thoát phòng nữa.
    }
    setInClassroom(false);
    setEntered(false);
  }, []);

  // --- Xử lý phím E / nút Tương tác -------------------------------------------------
  const handleInteract = useCallback(() => {
    if (panelRef.current !== null) return;
    const id = interactableRef.current;
    if (!id) {
      showToast('Hãy đến gần hơn để tương tác.');
      return;
    }
    // Đợt 3 giai đoạn 4 — xe máy (E lên/xuống xe, chung nút ✋ Tương tác).
    if (id === 'bike-mount') {
      const r = getHook()?.mountBike?.();
      if (!r?.ok) showToast('Hãy đến gần xe hơn để lên xe.');
      return;
    }
    if (id === 'bike-dismount') {
      const r = getHook()?.dismountBike?.();
      if (!r?.ok && r?.reason === 'moving') {
        showToast('Xe đang chạy — giữ S để phanh dừng hẳn rồi mới xuống xe.');
      } else if (!r?.ok) {
        showToast('Chưa xuống xe được — đợi xe dừng hẳn rồi thử lại.');
      }
      return;
    }
    if (id === 'npc-minh') {
      if (!questActive && !questDoneBefore) {
        startQuest();
      } else if (questActive && step?.id === 'greet-minh') {
        setPanel('quest');
      }
      return;
    }
    if (id === 'classroom-door') {
      if (questActive && step?.id === 'goto-door') {
        enterClassroomFade();
        // Vào lớp xong mới sang bước cô giáo (đợi fade xong).
        window.setTimeout(() => advance(), 400);
      } else if (anyQuestDone || questActive) {
        enterClassroomFade();
      }
      return;
    }
    if (id === 'board') {
      window.dispatchEvent(new CustomEvent('bkhn:quest-object', { detail: { id: 'board' } }));
      return;
    }
    if (id === 'notebook' || id === 'homework') {
      handleObjectAction(id);
    }
  }, [questActive, questDoneBefore, anyQuestDone, step?.id, startQuest, enterClassroomFade, advance, handleObjectAction, showToast]);

  useEffect(() => {
    if (!entered) return;
    const onInteract = () => handleInteract();
    window.addEventListener('bkhn:interact', onInteract);
    return () => window.removeEventListener('bkhn:interact', onInteract);
  }, [entered, handleInteract]);

  // --- Hoàn thành quest --------------------------------------------------------------
  const completeQuest = useCallback(() => {
    const p = progressRef.current;
    if (!p) return;
    const def = getQuestDef(p.questState?.questId ?? '') ?? (getQuestDef('first-lesson') as QuestDef);
    // awardQuestCompletion trả { progress, awarded, points } (hợp đồng engine
    // Bước 4) — awarded=false khi đã nhận thưởng trước đó (chơi lại).
    const result = awardQuestCompletion(
      p,
      def.quest.id,
      def.quest.rewardPoints,
      def.quest.badgeId,
    );
    setRewardAlreadyGiven(!result.awarded);
    let next = markActivityDay(result.progress, todayKey());
    next = { ...next, questState: next.questState ? { ...next.questState, done: true } : null };
    setProgress(next);
    setReReviewIds(null);
    setPanel(null);
    exitClassroomFade();
  }, [exitClassroomFade]);

  // --- Vào trường (khôi phục vị trí an toàn theo questState) --------------------------
  const enterCampus = useCallback(
    (resumeQuest: boolean) => {
      const p = progressRef.current;
      const qs = p?.questState;
      if (qs && !qs.done && qs.stepIndex >= 2) {
        // Đang dở trong phòng học → khôi phục trong phòng, ở spawn phòng.
        // F5b — khôi phục cả góc camera đã lưu (mặc định quay về hướng
        // bảng, yaw 0 / pitch 0.38), không quay về hướng đông.
        playerState.inClassroom = true;
        playerState.pos = { ...CLASSROOM.spawn };
        playerState.cameraYaw = typeof qs.yaw === 'number' ? qs.yaw : 0;
        playerState.cameraPitch = typeof qs.pitch === 'number' ? qs.pitch : 0.25;
        setInClassroom(true);
      } else {
        playerState.inClassroom = false;
        playerState.cameraYaw = null;
        playerState.cameraPitch = null;
        setInClassroom(false);
      }
      setEntered(true);
      if (resumeQuest && qs && !qs.done) {
        window.setTimeout(() => setPanel('quest'), 300);
      }
    },
    [],
  );

  const toggleSound = useCallback(() => {
    setProgress((prev) => {
      if (!prev) return prev;
      return { ...prev, settings: { ...prev.settings, soundOn: !prev.settings.soundOn } };
    });
  }, []);

  const cycleRate = useCallback(() => {
    setProgress((prev) => {
      if (!prev) return prev;
      const cur = prev.settings.speechRate ?? 1.0;
      const idx = SPEECH_RATES.indexOf(cur as (typeof SPEECH_RATES)[number]);
      const next = SPEECH_RATES[(idx + 1) % SPEECH_RATES.length];
      return { ...prev, settings: { ...prev.settings, speechRate: next } };
    });
  }, []);

  const openHandbook = useCallback((tab: typeof handbookTab) => {
    setHandbookTab(tab);
    setPanel('handbook');
  }, []);

  // Nút "Ôn lỗi ngay" ở màn kết quả: mở lại vòng hỏi lại các từ sai trong
  // phiên (không mở sổ tay suông). Hết từ sai trong phiên thì mở sổ tay.
  const handleReviewNow = useCallback(() => {
    const wrong = recallResults.filter((r) => !r.correct).map((r) => r.lexemeId);
    if (wrong.length > 0) {
      setReReviewResults([]);
      setReReviewIds(wrong);
      setPanel('quest');
    } else {
      openHandbook('due');
    }
  }, [recallResults, openHandbook]);

  // (Các useMemo này PHẢI ở trước early return màn intro — hook phải chạy
  // đủ mọi lần render, nếu không React lỗi #310 khi entered đổi false→true.)
  // F2b — "Cần ôn" ở màn kết quả: từ sai trong phiên (dù nextDue ngày
  // mai) CỘNG từ đến hạn; từ sai trong phiên mang nhãn "ôn lại ngày mai".
  const sessionWrongIds: string[] = useMemo(
    () => recallResults.filter((r) => !r.correct).map((r) => r.lexemeId),
    [recallResults],
  );
  const dueLexemes: Lexeme[] = useMemo(() => {
    if (!progress) return [];
    try {
      const ids = Array.from(
        new Set([...getDueWordsIncludingTodayWrong(progress, todayKey()), ...sessionWrongIds]),
      );
      return ids.map((id) => lexemeById[id]).filter((l): l is Lexeme => !!l);
    } catch {
      return [];
    }
  }, [progress, lexemeById, sessionWrongIds]);

  const encounteredLexemes: Lexeme[] = useMemo(() => {
    if (!progress) return [];
    const e = (progress as unknown as { encountered?: unknown }).encountered;
    const ids: string[] = Array.isArray(e) ? (e as string[]) : e && typeof e === 'object' ? Object.keys(e as Record<string, unknown>) : [];
    return ids.map((id) => lexemeById[id]).filter((l): l is Lexeme => !!l);
  }, [progress, lexemeById]);

  const recallDetail = recallResults
    .map((r) => ({ lexeme: lexemeById[r.lexemeId], correct: r.correct }))
    .filter((r): r is { lexeme: Lexeme; correct: boolean } => !!r.lexeme);

  // --- Bước 8: phiên ôn nhanh + huy hiệu toàn cục + gợi ý ------------------
  // Đáp án trong phiên ôn nhanh: lịch ôn dùng recordAnswer (nhớ đúng +10đ,
  // level +1); sổ lỗi dùng recordReReview (0đ, không đổi level/nextDue).
  const handleReviewSessionAnswer = (lexemeId: string, correct: boolean) => {
    const p = progressRef.current;
    if (!p || !reviewSession) return;
    setProgress(
      reviewSession.mode === 'error'
        ? recordReReview(p, lexemeId, correct)
        : recordAnswer(p, {
            lexemeId,
            correct,
            usedHint: false,
            activity: 'review',
            firstTry: true,
          }),
    );
  };
  // Huy hiệu toàn cục ở màn kết quả: tất cả đã đạt, đánh dấu "mới đạt"
  // những huy hiệu chưa có trước buổi học này. Lưu ý: màn kết quả hiện
  // TRƯỚC khi completeQuest chạy (bấm "Tiếp tục" mới ghi completedQuests),
  // nên khi đang ở bước result thì tính "sau" với quest hiện tại coi như
  // đã xong — không thì huy hiệu "Hoàn thành HSK 3/4" không bao giờ hiện
  // "mới đạt!" trên màn kết quả (chỉ thấy sau trong sổ tay).
  const resultGlobalBadges = useMemo(() => {
    if (!progress) return [];
    const before = new Set(badgesBeforeQuestRef.current);
    const afterProgress =
      step?.kind === 'result' && progress.questState?.questId
        ? {
            ...progress,
            completedQuests: {
              ...progress.completedQuests,
              [progress.questState.questId]: {
                at: new Date().toISOString(),
                points: currentQuest?.rewardPoints ?? 50,
              },
            },
          }
        : progress;
    return getEarnedGlobalBadgeIds(afterProgress).map((id) => ({
      id,
      title: GLOBAL_BADGES.find((b) => b.id === id)?.title ?? id,
      isNew: !before.has(id),
    }));
  }, [progress, step?.kind, currentQuest?.rewardPoints]);
  // Gợi ý việc nên làm tiếp khi mở app (gọn, không che cảnh).
  const suggestion = useMemo(() => getNextSuggestion(progress), [progress]);

  const objectiveText = questActive && step ? OBJECTIVES[step.id] ?? currentQuest.title : null;

  // --- Màn mở đầu -----------------------------------------------------------------------
  if (!entered) {
    const hasSave = !!progress && (progress.points > 0 || !!progress.questState || Object.keys(progress.completedQuests ?? {}).length > 0);
    return (
      <main className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-[#eef2e6] px-6 text-center">
        <h1 className="text-4xl font-bold leading-tight text-[#1c2b1f] sm:text-5xl">Bách khoa Hán ngữ 3D</h1>
        <p className="max-w-xl text-lg text-[#1c2b1f]/80">
          Đến Bách khoa. Sống một ngày sinh viên. Mang tiếng Trung vào từng câu chuyện.
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-[#1c2b1f]/60">
          Dự án học tập độc lập, tái hiện Bách khoa Hà Nội; không phải website chính thức của Đại học. Campus được cô
          đọng, không phải digital twin chính xác.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            id="enter-campus"
            type="button"
            onClick={() => enterCampus(false)}
            className="rounded-full bg-[#1c5c3a] px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-[#16492e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c5c3a] focus-visible:ring-offset-2"
          >
            Vào trường
          </button>
          {hasSave && (
            <button
              id="continue-learning"
              type="button"
              onClick={() => enterCampus(true)}
              className="rounded-full bg-[#A54432] px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-[#8A3828] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A54432] focus-visible:ring-offset-2"
            >
              Tiếp tục học
            </button>
          )}
          <button
            id="choose-lesson"
            type="button"
            onClick={() => setLessonsOpen(true)}
            className="rounded-full border-2 border-[#1c5c3a] px-8 py-3 text-lg font-semibold text-[#1c5c3a] transition hover:bg-[#1c5c3a]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c5c3a] focus-visible:ring-offset-2"
          >
            Chọn bài
          </button>
        </div>
        {lessonsOpen && (
          <LessonPickerCard
            activeQuestId={questActive ? questState?.questId ?? null : null}
            completedQuests={progress?.completedQuests ?? {}}
            onPick={(questId) => {
              setLessonsOpen(false);
              enterCampus(true);
              startQuest(questId);
            }}
            onClose={() => setLessonsOpen(false)}
          />
        )}
        {hasSave && (
          <p className="text-sm text-[#1c2b1f]/60">
            Đã lưu trên thiết bị này: {progress?.points ?? 0} điểm
            {progress?.streak ? ` · chuỗi ${progress.streak.count} ngày` : ''}.
          </p>
        )}
        {hasSave && (
          <div className="max-w-xl rounded-2xl border border-[#1c5c3a]/20 bg-white/70 px-5 py-3 text-left">
            <p className="text-base font-semibold text-[#1c5c3a]">💡 {suggestion.text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestion.action === 'calendar' && (
                <button
                  type="button"
                  onClick={() => {
                    enterCampus(true);
                    openHandbook('calendar');
                  }}
                  className="rounded-full bg-[#2E7D32] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#256B29]"
                >
                  Mở lịch ôn
                </button>
              )}
              {(suggestion.action === 'resume' || suggestion.action === 'start') && suggestion.questId && (
                <button
                  type="button"
                  onClick={() => {
                    enterCampus(true);
                    startQuest(suggestion.questId as string);
                  }}
                  className="rounded-full bg-[#A54432] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#8A3828]"
                >
                  Học ngay →
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      {/* Canvas chiếm toàn bộ viewport phía sau HUD. */}
      <div className="absolute inset-0">
        <CampusScene
          inClassroom={inClassroom}
          notebookOpen={notebookOpen}
          homework={homework}
          onObjectClick={handleObjectClick}
        />
      </div>

      {/* Fade chuyển cảnh vào/ra phòng học. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-30 bg-black transition-opacity duration-300 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* (Chip thiếu giọng tiếng Trung nay nằm gọn trong cột trái trên, cùng
          các chip trạng thái khác — xem dưới.) */}

      {/* HUD: pointer-events-none, trừ các nút/joystick. */}
      <div className="pointer-events-none absolute inset-0">
        {/* Góc trên-trái: tên khu + điểm. */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          <div className="w-fit rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            {inClassroom ? 'Phòng học mô phỏng' : zone}
          </div>
          <div className="w-fit rounded-full bg-[#A54432]/90 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
            ⭐ {progress?.points ?? 0} điểm
            {progress?.streak && progress.streak.count > 0 ? ` · 🔥 ${progress.streak.count} ngày` : ''}
          </div>
          {/* Đợt 3 giai đoạn 4 — tốc độ xe khi đang lái (tối đa 14 m/s). */}
          {riding && (
            <div className="w-fit rounded-full bg-[#1c5c3a]/90 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              🛵 {bikeSpeed.toFixed(1)} m/s · tối đa 14
            </div>
          )}
          {/* Chip thiếu giọng tiếng Trung — gọn, cho đóng; nằm trong cột trạng
              thái góc trái trên nên không che mặt tiền hay chiếm bầu trời.
              Sau khi đóng, noVoiceDismissedRef chặn hiện lại trong phiên;
              trạng thái âm thanh vẫn giữ trong settings.soundOn (nút 🔊/🔇
              góc trên-phải). */}
          {noVoice && (
            <div className="pointer-events-auto flex w-fit max-w-[190px] items-center gap-1.5 rounded-full bg-[#FFF3CD]/95 px-3 py-1.5 text-xs font-semibold text-[#6B4E00] shadow-lg backdrop-blur-sm sm:max-w-[360px] sm:whitespace-nowrap">
              <span className="leading-snug">🔇 Chưa có giọng tiếng Trung — học bằng chữ</span>
              <button
                type="button"
                onClick={() => {
                  noVoiceDismissedRef.current = true;
                  setNoVoice(false);
                }}
                className="shrink-0 rounded-full px-1 font-bold hover:bg-black/10"
                aria-label="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          )}
          {/* Nút mở lại panel nhiệm vụ khi đã đóng (đặt ở cột trái trên để
              không chồng hộp hướng dẫn ở giữa dưới trên desktop). */}
          {questActive && panel === null && (
            <button
              id="reopen-quest"
              type="button"
              onClick={() => setPanel('quest')}
              className="pointer-events-auto w-fit rounded-full bg-[#A54432] px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-[#8A3828]"
            >
              🎯 Nhiệm vụ
            </button>
          )}
        </div>

        {/* Góc trên-phải: minimap + nút sổ tay/âm thanh/tốc độ/đổi bài. */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          {!inClassroom && <Minimap onFastTravel={doFastTravel} />}
          <div className="pointer-events-auto flex gap-2">
            <button
              id="change-lesson"
              type="button"
              onClick={() => setLessonsOpen(true)}
              className="rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              📚 Đổi bài
            </button>
            <button
              id="open-handbook"
              type="button"
              onClick={() => openHandbook('lesson')}
              className="rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              📖 Sổ tay
            </button>
            <button
              id="toggle-sound"
              type="button"
              onClick={toggleSound}
              aria-label={soundOn ? 'Tắt lời đọc' : 'Bật lời đọc'}
              className="rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              id="speech-rate"
              type="button"
              onClick={cycleRate}
              aria-label="Đổi tốc độ đọc"
              className="rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              {speechRate.toFixed(1)}×
            </button>
          </div>
        </div>

        {/* Chip mục tiêu hiện tại. F5a — trong phòng học thì dời sang góc
            trên-phải (dưới hàng nút), để khỏi che tiêu đề bảng đen ở giữa
            trên; ngoài sân vẫn giữ giữa trên như cũ. */}
        <div
          className={
            inClassroom
              ? 'absolute right-3 top-[5.5rem] flex justify-end'
              : 'absolute left-1/2 top-16 flex -translate-x-1/2 justify-center sm:top-3 sm:mt-12'
          }
        >
          <QuestObjective text={objectiveText} />
        </div>

        {/* Gợi ý tương tác "E — ..." (chỉ khi trong tầm): TO, GIỮA màn hình
            (trên nhân vật một chút để không che người) để người mới nhìn là
            thấy ngay — trước đây chỉ là viên thuốc nhỏ ở mép dưới, dễ bỏ qua. */}
        {interactLabel && panel === null && !lessonsOpen && (
          <div className="pointer-events-none absolute left-1/2 top-[36%] z-20 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="animate-pulse rounded-3xl bg-black/75 px-6 py-5 shadow-2xl backdrop-blur-sm sm:px-8">
              <span className="mr-4 inline-block rounded-2xl bg-white px-5 py-2 align-middle text-4xl font-black text-black shadow">
                E
              </span>
              <span className="align-middle text-2xl font-bold leading-tight text-white sm:text-3xl">
                {interactLabel.replace(/^E — /, '')}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Bấm phím E — hoặc nút ✋ Tương tác ở góc dưới phải
            </p>
          </div>
        )}

        {/* Góc dưới-phải: về vị trí an toàn + nút Tương tác (mobile). */}
        <div className="absolute bottom-4 right-3 flex flex-col items-end gap-2">
          {/* Đợt 3 giai đoạn 5 — dịch chuyển nhanh: nút mở panel + danh sách
              6 điểm đến (mở ngay từ đầu). Panel hiện phía trên nút. */}
          {fastTravelOpen && (
            <div
              data-testid="fast-travel-panel"
              className="pointer-events-auto w-[248px] rounded-2xl bg-white p-2 shadow-2xl"
            >
              <p className="px-2 pb-1 pt-1 text-sm font-bold text-[#1c2b1f]">🚀 Đi nhanh tới…</p>
              {FAST_TRAVEL_DESTINATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  data-testid={`fast-travel-${d.id}`}
                  disabled={traveling}
                  onClick={() => doFastTravel(d.id)}
                  className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-[#1c5c3a]/10 disabled:opacity-50"
                >
                  <span className="text-lg">{d.icon}</span>
                  <span>
                    <span className="block text-sm font-bold text-[#2B2B2B]">{d.name}</span>
                    <span className="block text-xs text-[#2B2B2B]/60">{d.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            id="fast-travel"
            type="button"
            disabled={traveling}
            onClick={() => setFastTravelOpen((o) => !o)}
            className="pointer-events-auto rounded-full bg-[#1c5c3a] px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[#16492e] disabled:opacity-60"
          >
            🚀 Đi nhanh
          </button>
          {/* Đợt 3 giai đoạn 4 — xe máy: chỉ ngoài sân (không gọi xe trong
              phòng học); "Gọi xe" ẩn khi đang lái vì đã ngồi trên xe rồi. */}
          {!inClassroom && !riding && (
            <button
              id="call-bike"
              type="button"
              onClick={() => {
                const r = getHook()?.callBike?.();
                if (r?.ok) showToast('Xe đang tới chỗ bạn.');
                else if (r?.reason === 'classroom') showToast('Đang trong phòng học thì không gọi xe được.');
                else showToast('Quanh đây không có chỗ trống để đỗ xe.');
              }}
              className="pointer-events-auto rounded-full bg-[#1c5c3a] px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[#16492e]"
            >
              🛵 Gọi xe
            </button>
          )}
          {!inClassroom && (
            <button
              id="recall-bike"
              type="button"
              onClick={() => {
                const r = getHook()?.recallBike?.();
                if (r?.ok) showToast('Xe đã về đường gần nhất.');
                else showToast('Chưa đưa xe về đường được — thử lại sau.');
              }}
              className="pointer-events-auto rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              🛵 Đưa xe về đường
            </button>
          )}
          {inClassroom && (
            <button
              id="exit-classroom"
              type="button"
              onClick={() => {
                // Thoát được cả khi panel học đang mở (trước đây chỉ thoát
                // khi panel đóng nên học dở trong lớp thì kẹt). relative z-30
                // để nút nổi trên panel dạng bottom sheet (z-20) trên mobile;
                // các nút HUD khác vẫn nằm dưới sheet như trước để khỏi che
                // nút trong bảng học.
                setPanel(null);
                setReReviewIds(null);
                exitClassroomFade();
              }}
              className="pointer-events-auto relative z-30 rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              🚪 Ra khỏi phòng
            </button>
          )}
          <button
            id="interact-button"
            type="button"
            onClick={() => handleInteract()}
            className="pointer-events-auto rounded-full bg-[#A54432] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#8A3828]"
          >
            ✋ Tương tác
          </button>
          <button
            id="safe-position"
            type="button"
            onClick={() => {
              playerInput.resetToken += 1;
            }}
            className="pointer-events-auto rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Về vị trí an toàn
          </button>
        </div>

        {/* Đợt 3 giai đoạn 4 — cụm lái mobile khi đang lái xe: nút ga/phanh
            + lái trái/phải 64 px, giữ để chạy; đặt góc dưới-phải, trên cụm
            nút (bottom 13rem) để không đè nút "?" (bottom 10rem, mobile)
            và không chạm joystick góc dưới-trái. Khi không lái thì ẩn. */}
        {riding && (
          <div className="pointer-events-auto absolute bottom-[13rem] right-3 hidden flex-col items-center gap-2 [@media(pointer:coarse)]:flex">
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="bike-left"
                aria-label="Lái trái"
                onPointerDown={(e) => {
                  e.preventDefault();
                  bikeInput.steer = -1;
                }}
                onPointerUp={() => {
                  bikeInput.steer = 0;
                }}
                onPointerLeave={() => {
                  bikeInput.steer = 0;
                }}
                onPointerCancel={() => {
                  bikeInput.steer = 0;
                }}
                onContextMenu={(e) => e.preventDefault()}
                className="flex h-16 w-16 touch-none items-center justify-center rounded-full bg-black/50 text-2xl font-bold text-white shadow-lg backdrop-blur-sm active:bg-black/70"
              >
                ◀
              </button>
              <button
                type="button"
                data-testid="bike-right"
                aria-label="Lái phải"
                onPointerDown={(e) => {
                  e.preventDefault();
                  bikeInput.steer = 1;
                }}
                onPointerUp={() => {
                  bikeInput.steer = 0;
                }}
                onPointerLeave={() => {
                  bikeInput.steer = 0;
                }}
                onPointerCancel={() => {
                  bikeInput.steer = 0;
                }}
                onContextMenu={(e) => e.preventDefault()}
                className="flex h-16 w-16 touch-none items-center justify-center rounded-full bg-black/50 text-2xl font-bold text-white shadow-lg backdrop-blur-sm active:bg-black/70"
              >
                ▶
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="bike-gas"
                aria-label="Ga"
                onPointerDown={(e) => {
                  e.preventDefault();
                  bikeInput.throttle = 1;
                }}
                onPointerUp={() => {
                  bikeInput.throttle = 0;
                }}
                onPointerLeave={() => {
                  bikeInput.throttle = 0;
                }}
                onPointerCancel={() => {
                  bikeInput.throttle = 0;
                }}
                onContextMenu={(e) => e.preventDefault()}
                className="flex h-16 w-16 touch-none items-center justify-center rounded-full bg-[#1c5c3a] text-base font-bold text-white shadow-lg active:bg-[#16492e]"
              >
                GA
              </button>
              <button
                type="button"
                data-testid="bike-brake"
                aria-label="Phanh"
                onPointerDown={(e) => {
                  e.preventDefault();
                  bikeInput.brake = 1;
                }}
                onPointerUp={() => {
                  bikeInput.brake = 0;
                }}
                onPointerLeave={() => {
                  bikeInput.brake = 0;
                }}
                onPointerCancel={() => {
                  bikeInput.brake = 0;
                }}
                onContextMenu={(e) => e.preventDefault()}
                className="flex h-16 w-16 touch-none items-center justify-center rounded-full bg-[#A54432] text-base font-bold text-white shadow-lg active:bg-[#8A3828]"
              >
                PHANH
              </button>
            </div>
          </div>
        )}

        {/* Góc dưới-trái: joystick (chỉ hiện trên thiết bị cảm ứng). */}
        <div className="absolute bottom-4 left-3">
          <Joystick />
        </div>

        {/* Bảng hướng dẫn thao tác. */}
        {helpOpen ? (
          <div className="pointer-events-auto absolute bottom-20 left-3 max-w-[260px] rounded-xl bg-black/50 p-3 text-xs leading-relaxed text-white backdrop-blur-sm sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:text-sm">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-semibold">Cách di chuyển</span>
              <button
                type="button"
                aria-label="Đóng hướng dẫn"
                onClick={() => setHelpOpen(false)}
                className="rounded-full px-2 py-0.5 text-white/80 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                ✕
              </button>
            </div>
            <ul className="list-none space-y-0.5">
              <li>WASD / mũi tên — di chuyển</li>
              <li>Kéo chuột — xoay camera</li>
              <li>Lăn chuột — zoom</li>
              <li>E — tương tác</li>
              <li>Shift — chạy</li>
              <li>🛵 Gọi xe — nút “Gọi xe” góc dưới-phải</li>
              <li>Đang lái: W ga · S phanh · A/D lái · E xuống xe (khi dừng)</li>
              <li>🚀 Đi nhanh — nút “Đi nhanh” góc dưới-phải / trên bản đồ</li>
            </ul>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Mở hướng dẫn"
            onClick={() => setHelpOpen(true)}
            className="pointer-events-auto absolute bottom-[10rem] right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-base text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
          >
            ?
          </button>
        )}

        {/* Toast. */}
        {toast && (
          <div
            role="status"
            className="absolute left-1/2 top-16 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm"
          >
            {toast}
          </div>
        )}
      </div>

      {/* Menu chọn bài trong game (nút 📚 Đổi bài): cùng danh sách bài như màn
          mở đầu + nút về màn hình chính. Khóa di chuyển khi mở (uiLocked). */}
      {lessonsOpen && entered && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <LessonPickerCard
            activeQuestId={questActive ? questState?.questId ?? null : null}
            completedQuests={progress?.completedQuests ?? {}}
            onPick={pickLesson}
            onClose={() => setLessonsOpen(false)}
            onHome={goToMenu}
          />
        </div>
      )}

      {/* Panel học / sổ tay / kết quả (DOM overlay, khóa di chuyển khi mở). */}
      {panel !== null && progress && (
        <div className="absolute inset-x-0 bottom-0 z-20 max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-[#FDF8EE] p-4 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[560px] sm:-translate-x-1/2 sm:rounded-2xl sm:p-5">
          {panel === 'quest' && reReviewIds && step?.kind === 'result' && (
            <QuestPanel
              step={{ id: 're-review', kind: 'review', lexemeIds: reReviewIds }}
              stepNumber={currentSteps.length}
              totalSteps={currentSteps.length}
              lexemeById={lexemeById}
              allLexemes={ALL_LEXEMES}
              actionDone={false}
              onAnswer={handleAnswer}
              onAdvance={advance}
              onInteractObject={handleObjectAction}
              onSpeak={speakText}
              soundOn={soundOn}
              onReviewAnswer={handleReviewAnswer}
              onReviewDone={() => setReReviewIds(null)}
              onReReviewAnswer={handleReReviewAnswer}
              reReviewOnly
              onReReviewDone={() => setReReviewIds(null)}
              onClose={() => setReReviewIds(null)}
              onExitLesson={exitLesson}
              questTitle={currentQuest.title}
            />
          )}
          {panel === 'quest' && !reReviewIds && step && step.kind !== 'result' && (
            <QuestPanel
              step={step}
              stepNumber={stepIndex + 1}
              totalSteps={currentSteps.length}
              lexemeById={lexemeById}
              allLexemes={ALL_LEXEMES}
              actionDone={actionDone}
              onAnswer={handleAnswer}
              onAdvance={advance}
              onInteractObject={handleObjectAction}
              onSpeak={speakText}
              soundOn={soundOn}
              onReviewAnswer={handleReviewAnswer}
              onReviewDone={advance}
              onClose={() => setPanel(null)}
              onExitLesson={exitLesson}
              questTitle={currentQuest.title}
              onFastTravel={doFastTravel}
            />
          )}
          {panel === 'quest' && !reReviewIds && step && step.kind === 'result' && (
            <ResultPanel
              encountered={encounteredLexemes}
              totalLexemes={currentQuest.lexemeIds.length}
              recallCorrect={recallResults.filter((r) => r.correct).length}
              recallTotal={recallResults.length}
              recallResults={recallDetail}
              dueWords={dueLexemes}
              dueTomorrowIds={sessionWrongIds}
              rewardPoints={currentQuest.rewardPoints}
              rewardAlreadyGiven={rewardAlreadyGiven}
              globalBadges={resultGlobalBadges}
              onReviewNow={handleReviewNow}
              onContinue={completeQuest}
            />
          )}
          {panel === 'quest' && !step && (
            <div className="text-center">
              <p className="mb-3 text-base text-[#2B2B2B]/80">
                {currentQuestDone
                  ? `Bạn đã hoàn thành “${currentQuest.title}”. Chơi lại để ôn ${currentQuest.lexemeIds.length} từ nhé — thưởng hoàn thành chỉ nhận một lần.`
                  : `Hãy gặp Minh ở cổng Parabol để bắt đầu “${currentQuest.title}”.`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  startQuest(currentQuest.id);
                }}
                className="w-full rounded-full bg-[#A54432] px-6 py-3 text-base font-bold text-white transition hover:bg-[#8A3828]"
              >
                {currentQuestDone ? 'Chơi lại buổi học' : 'Bắt đầu học'}
              </button>
            </div>
          )}
          {panel === 'handbook' && (
            <Handbook
              progress={progress}
              lexemes={currentLessonLexemes}
              allLexemes={ALL_LEXEMES}
              onSpeak={speakText}
              soundOn={soundOn}
              onImport={(p) => setProgress(p)}
              onClose={() => setPanel(null)}
              defaultTab={handbookTab}
              onStartReview={(ids, mode, title) => {
                setReviewSession({ ids, mode, title });
                setPanel('review');
              }}
            />
          )}
          {panel === 'review' && reviewSession && (
            <ReviewSession
              title={reviewSession.title}
              subtitle={
                reviewSession.mode === 'error'
                  ? 'Vòng ôn lỗi riêng: 0 điểm, không đổi level hay lịch ôn. Sửa đúng thì từ rời khỏi sổ lỗi.'
                  : 'Ôn đúng hạn: nhớ đúng +10 điểm và lên level nhớ; chưa nhớ thì từ về level 0, ôn lại ngày mai.'
              }
              words={reviewSession.ids
                .map((id) => lexemeById[id])
                .filter((l): l is Lexeme => !!l)}
              mode={reviewSession.mode}
              onAnswer={handleReviewSessionAnswer}
              onSpeak={speakText}
              soundOn={soundOn}
              onClose={() => {
                setReviewSession(null);
                setPanel(null);
              }}
            />
          )}
        </div>
      )}
    </main>
  );
}
