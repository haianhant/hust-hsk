# Learn Engine — Bước 4 (engine học tập lõi)

Logic thuần, không UI, không 3D, không phụ thuộc DOM (trừ `speech.ts`,
chỉ chạm `window` sau guard). Mọi hoạt động học (quest, flashcard, ôn tập…)
dùng chung vocabulary ID và progress store này.

## File

| File | Vai trò |
|---|---|
| `lib/learn/types.ts` | Toàn bộ type: Course, Lesson, LessonGroup, Lexeme, LessonVocabulary, Example, Quest, LearningEvent, ReviewState, Progress, CampusObject |
| `content/hsk3-l10.ts` | Dữ liệu khởi đầu: HSK 3 bài 10 nhóm 1 (9 từ đã xác minh) + Lesson + LessonGroup + LessonVocabulary + 9 ví dụ tự viết |
| `lib/learn/pinyin.ts` | Chuẩn hóa + chấm pinyin / chữ Hán |
| `lib/learn/store.ts` | Progress store versioned (nhận storage adapter) |
| `lib/learn/speech.ts` | Đọc tiếng Trung bằng SpeechSynthesis zh-CN |
| `test/learn.test.cjs` | Test tự động (node:test, không cài thêm runner) |

## Mô hình dữ liệu

- `courses` → `lessons` → `lessonGroups` → `lessonVocabulary` (nối từ với
  bài/nhóm, giữ thứ tự nguồn). Một từ có thể ở nhiều bài.
- `lexemes`: mỗi từ giữ ID ổn định (`hsk3-l10-g1-<pinyin không dấu không
  khoảng trắng>`, vd `hsk3-l10-g1-shuxue`), hanzi, pinyin gốc có dấu,
  nghĩa TV, từ loại, courseId/lessonId/groupId, order, sourceUrl
  (`https://hoc-hsk.vercel.app/hsk3`), verifiedAt (`2026-11-05`),
  status `'verified'`. Sửa dữ liệu không đổi ID → không mất tiến độ.
- `examples`: câu, pinyin, nghĩa, nguồn. Toàn bộ 9 ví dụ hiện tại có
  `source: 'authored'` — câu do nhóm dự án tự viết, đã rà soát tiếng Trung,
  KHÔNG trình bày là trích giáo trình, KHÔNG sao chép toàn văn bài khóa.
- `quests` (tóm tắt cho engine): id / title / lessonId / lexemeIds /
  rewardPoints / badgeId. Định nghĩa bước quest đầy đủ thuộc luồng quest/UI.
- `learningEvents`: loại hoạt động, đáp án, kết quả, thời điểm, có dùng
  gợi ý hay không, questId (nếu có).
- `reviewState` theo từng từ: mức nhớ level 0..5, ngày ôn tiếp `nextDue`,
  `lastSeen`, `correctCount` / `wrongCount`, `lastWrongAt`.
- `campusObjects`: id, name, position {x, z}, triggerRadius, questId?

Dữ liệu hiện tại — CHỈ 9 từ nhóm 1 HSK 3 bài 10 (thứ tự nguồn 1..9),
đã đối soát với `docs/content-audit.md` §3a (bài 10 có 28 từ, nhóm 1 có
9 từ): 数学 shùxué, 认真 rènzhēn, 笔记 bǐjì, 清楚 qīngchu, 黑板 hēibǎn,
把 bǎ, 作业 zuòyè, 遍 biàn, 提高 tígāo. Lesson: `hsk3-l10`,
“你明天再把书还给我”, chủ đề “Học tập & câu chữ 把”.
Không thêm từ/bài nào khác, không thêm HSK 3 bài 1–9 hay HSK 5.

Ví dụ tự viết đã rà soát (không câu nào còn nghi ngờ ở thời điểm ghi):
“我喜欢数学。” / “他学习很认真。” / “我记了笔记。” (dùng 记笔记 — cách
kết hợp chuẩn; không dùng 写笔记) / “老师说得很清楚。” / “黑板上有汉字。”
/ “请把书给我。” (câu chữ 把 chuẩn) / “我写作业。” / “我读了三遍。”
/ “我想提高汉语。”

## Bảng điểm (`scoreAnswer`)

| Trường hợp | Điểm |
|---|---:|
| Đúng lần đầu, không gợi ý | 10 |
| Đúng có gợi ý | 5 |
| Đúng sau khi đã sai trong lượt (`firstTry: false`) | 3 |
| Replay (quest đã hoàn thành) đúng | 2 |
| Sai | 0 |

Điểm thưởng và mức nhớ là hai dữ liệu khác nhau. Hoàn thành quest lần đầu
nhận thưởng một lần (`awardQuestCompletion` idempotent — gọi lần 2 trả
`awarded: false`, không cộng điểm, không thêm badge nữa); replay chỉ 2đ/câu.

## Lịch ôn (`REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30]`)

- Đúng, không gợi ý, lần đầu → level +1 (tối đa 5), `nextDue` = hôm nay +
  khoảng của level mới (1 → +1d, 2 → +3d, 3 → +7d, 4 → +14d, 5 → +30d).
- Đúng có gợi ý → giữ level, `nextDue` = ngày mai.
- Đúng sau khi sai trong lượt → giữ level, `nextDue` = ngày mai
  (lượt sửa ngay trong phiên không nâng mức nhớ dài hạn).
- Sai → level 0, `nextDue` = ngày mai, `wrongCount` +1.
- `getDueWords(p, today)`: từ có `nextDue <= today`, hoặc từ đã gặp nhưng
  chưa từng có trạng thái ôn. Từ vừa sai có `nextDue` ngày mai nên chưa đến
  hạn trong hôm nay.

Đây là **cấu hình sản phẩm**, không tuyên bố là thuật toán tối ưu khoa học.

## Quy tắc chấm

### Pinyin

- `normalizePinyin(s)`: NFC, lowercase, bỏ toàn bộ khoảng trắng, ánh xạ
  `ü` / `u:` / `v` → `ü`. Không tự thêm dấu thanh: `'nv'` → `'nü'`
  (không thành `'nǚ'` — thêm dấu sẽ là bịa thanh điệu).
- Ánh xạ ü (định nghĩa rõ): `'v'` và `'u:'` đều là cách gõ thay cho `'ü'`;
  `'ü'` giữ nguyên.
- `pinyinToNumbered(s)`: đổi dấu thanh thành số (`shùxué` → `shu4xue2`,
  `rènzhēn` → `ren4zhen1`); âm tiết không dấu → số 5. Chấp nhận cả đầu
  vào dạng số thanh (`shu4xue2`).
- `checkPinyin(input, expected, mode)` trả `{ ok, detail }`:
  - mode `'tone'`: đổi cả hai về dạng số rồi so sánh; PHẢI khớp số thanh.
    Input bỏ dấu khi đáp án có dấu → SAI; sai thanh → SAI, `detail` nói
    rõ sai thanh nào ở âm tiết nào. Không phân biệt hoa/thường.
  - mode `'toneless'`: chỉ so sánh chữ cái gốc bỏ dấu — chỉ dùng khi câu
    hỏi không kiểm tra thanh điệu.
- Tách âm tiết bằng maximal munch trên bảng âm tiết pinyin hợp lệ, nên
  số thanh được đặt cuối âm tiết (`liǎng` → `liang3`, không phải `lia3ng`).

### Chữ Hán

- `normalizeHanzi(s)`: NFC, bỏ khoảng trắng và dấu câu (ASCII và toàn giác
  `。，、；：？！·…—「」『』（）《》〈〉“”‘’`).
- `checkHanzi(input, expected)` trả `{ ok, detail }`: chỉ cho phép khác
  biệt khoảng trắng/dấu câu; không bỏ qua từ sai, không đổi trật tự.

## Lưu trữ (localStorage key + schema version + migration)

- Key: `bkhn-progress-v1`. Schema version: `CURRENT_VERSION = 1`.
- `Progress` gồm: `version`, `lexemes`, `encountered`, `events`, `points`,
  `badges`, `completedQuests`, `streak { count, lastDay }`, `settings
  { soundOn, speechRate, showPinyin }`, `questState | null`.
- Store nhận `StorageLike { getItem, setItem, removeItem }` — logic lõi
  không gọi thẳng `localStorage`, chạy được trong node test. UI truyền
  `window.localStorage`.
- `loadProgress(storage)`: dữ liệu cũ thiếu trường → điền mặc định, không
  mất tiến độ (migration v1). JSON hỏng hoặc không phải object → progress
  rỗng kèm `loadError`, KHÔNG throw; `saveProgress`/`exportProgress`
  không lưu `loadError` trở lại.
- `exportProgress(p): string` (JSON), `importProgress(json)` validate kỹ,
  KHÔNG throw, KHÔNG ghi đè dữ liệu hiện tại (chỉ trả kết quả):
  JSON hỏng / sai kiểu trường → `{ ok: false, error }`; id từ lạ (không
  nằm trong 9 id đã biết) → bị loại bỏ, `{ ok: true, warnings: [...] }`.
- `recordAnswer` trả Progress MỚI (không mutate input), ghi LearningEvent,
  cộng điểm, đánh dấu đã gặp từ; đáp án đúng tính vào streak.
- Streak: ngày địa phương Asia/Ho_Chi_Minh (`todayKey`, dùng
  `Intl.DateTimeFormat` với timeZone `Asia/Ho_Chi_Minh`). Chỉ tăng khi có
  hoạt động học có trả lời trong ngày (đúng đáp án hoặc hoàn thành quest):
  cùng ngày giữ nguyên, hôm qua → +1, khác → reset về 1.
- Gặp ≠ thuộc: `markEncountered` chỉ thêm vào `encountered`, không tạo
  trạng thái nhớ.

## Âm thanh (`speech.ts`)

- Dùng SpeechSynthesis của trình duyệt, giọng zh-CN (ưu tiên lang bắt đầu
  `zh-CN`, rồi `zh`); lắng nghe `voiceschanged` vì giọng có thể load chậm.
- `speak(text, opts)`: dừng lời cũ trước khi phát câu mới (`cancel`).
  Chỉ phát sau tương tác người dùng — UI phải gọi từ cử chỉ
  (nút “Vào trường”, nút nghe…), trình duyệt chặn autoplay.
- Thiếu SpeechSynthesis → `onError('no-speech')`; thiếu giọng tiếng Trung
  → `onError('no-voice')`, KHÔNG throw — UI hiện thông báo
  “thiết bị chưa có giọng tiếng Trung, vẫn học được bằng chữ”.
- `stopSpeaking()`, `hasChineseVoice()`, `getChineseVoice()`.

## Cách chạy test

```bash
node --test test/learn.test.cjs   # từ thư mục gốc của repo
npx tsc --noEmit                  # type-check đầy đủ của cả repo
```

Test tự biên dịch `lib/learn/*.ts` + `content/hsk3-l10.ts` bằng `npx tsc`
ra `test/.tmp-learn/` (thư mục build tạm, không commit) rồi test bằng
node:test có sẵn — không cài thêm runner. Kết quả lần chạy 2026-11-05:
**21 test, 21 pass, 0 fail** (nhóm 1–10 theo nhiệm vụ + kiểm tra nội dung,
`getDueWords`, guard node của speech).

## Lưu ý / việc chưa làm

- **Lỗi type còn tồn tại (không thuộc file Bước 4, không được sửa ở đây):**
  `npx tsc --noEmit` hiện exit 2 với 3 lỗi trong file của luồng quest/UI
  song song — `components/learn/QuestPanel.tsx` (dùng `checkPinyin` /
  `checkHanzi` như trả `boolean`, trong khi hợp đồng Bước 4 là trả
  `{ ok, detail }` — cần dùng `.ok`) và `components/learn/Handbook.tsx`
  (dùng `importProgress(text)` như trả `Progress`, trong khi hợp đồng là
  trả `{ ok, progress?, error? }` — cần kiểm tra `.ok` rồi dùng
  `.progress`). Các file của Bước 4 tự nó type-check sạch. Đã thêm alias
  `EXAMPLES` trong `content/hsk3-l10.ts` để khớp import của Handbook.
- Chưa làm (thuộc luồng khác): UI quest/panel/sổ tay, dữ liệu quest đầy
  đủ, tích hợp 3D, các bài/nhóm từ tiếp theo (HSK 3 bài 10 nhóm 2–4,
  bài 11–18, HSK 4).
- `getDueWords` hiểu “level 0 đã gặp” là từ đã gặp nhưng chưa có trạng
  thái ôn, hoặc `nextDue` đã tới; từ vừa sai (`nextDue` ngày mai) chưa
  đến hạn trong hôm nay.
- `recordAnswer` có thêm tham số tùy chọn `firstTry` (mặc định `true`)
  để phân biệt “đúng lần đầu” (10đ, nâng level) với “đúng sau khi sai”
  (3đ, không nâng level) — hợp đồng gốc không nêu tên tham số này, nhưng
  bảng điểm 10/5/3/2 cần nó để phân biệt hai trường hợp.
