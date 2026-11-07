# Coverage HSK 3 — 246 từ / 36 nhóm (Bước 6)

- **Ngày:** 2026-11-06
- **Nguồn đối soát:** `docs/content-audit.md` §3a (site nguồn, chỉ đọc) + dữ liệu trong repo (`content/hsk3-l10.ts` … `content/hsk3-l18.ts`, aggregate ở `content/hsk3-index.ts`).
- **Cách đếm:** đếm trực tiếp từ dữ liệu trong repo bằng test (`test/learn.test.cjs` (12)); bảng 246 dòng ở §3 sinh bằng script từ cùng dữ liệu, không gõ tay.

## 1. Đối chiếu tổng số với audit — KHỚP 100%, không chênh lệch

| Bài | Từ (audit) | Từ (repo) | Nhóm (audit) | Nhóm (repo) | Quest | Chênh lệch |
|---|---|---|---|---|---|---|
| 10 | 28 | 28 | 4 (9+9+6+4) | 4 (9+9+6+4) | `first-lesson` (9 từ, 13 bước) + `l10-g234` (19 từ, 8 bước) | Không |
| 11 | 28 | 28 | 4 (9+6+6+7) | 4 (9+6+6+7) | `l11` (28 từ, 8 bước) | Không |
| 12 | 27 | 27 | 4 (6+11+3+7) | 4 (6+11+3+7) | `l12` (27 từ, 8 bước) | Không |
| 13 | 28 | 28 | 4 (8+5+6+9) | 4 (8+5+6+9) | `l13` (28 từ, 8 bước) | Không |
| 14 | 27 | 27 | 4 (7+4+8+8) | 4 (7+4+8+8) | `l14` (27 từ, 8 bước) | Không |
| 15 | 26 | 26 | 4 (9+9+4+4) | 4 (9+9+4+4) | `l15` (26 từ, 8 bước) | Không |
| 16 | 26 | 26 | 4 (10+8+6+2) | 4 (10+8+6+2) | `l16` (26 từ, 8 bước) | Không |
| 17 | 27 | 27 | 4 (8+6+7+6) | 4 (8+6+7+6) | `l17` (27 từ, 8 bước) | Không |
| 18 | 29 | 29 | 4 (7+8+7+7) | 4 (7+8+7+7) | `l18` (29 từ, 8 bước) | Không |
| **Tổng** | **246** | **246** | **36 nhóm** | **36 nhóm** | **10 quest** | **Không** |

- ID từ duy nhất: 246/246 (không trùng, không thiếu).
- Mỗi từ có đúng 1 ví dụ tự soạn (`source: 'authored'`), 246/246.
- File nội dung theo mẫu `hsk3-l10.ts`: mỗi bài có `LESSON` + `GROUP` + `LEXEMES` + `VOCABULARY` + `EXAMPLES` (+ alias `EXAMPLES`); các file bài 11–18 import `HSK3_COURSE` từ `./hsk3-l10`. Bài 14–18 gộp các nhóm vào một mảng `LEXEMES` duy nhất + `GROUPS`, các bài 10–13 tách mảng theo nhóm — hai cách tổ chức này cho cùng một aggregate ở `content/hsk3-index.ts` nên không ảnh hưởng coverage.

## 2. Cấu trúc luyện tập: site nguồn ≠ app 3D (ghi rõ để khỏi nhầm)

Cấu trúc "5 tab (Từ vựng · Bài khóa · Ngữ pháp · Luyện tập · Trò chơi), quiz 4 câu, fill-in, dictation 15 câu, 4 game" trong audit (§2) là cấu trúc của **site nguồn** hoc-hsk. **Trong app 3D, luyện tập theo bài ở Bước 6 là quest + sổ tay + SRS — KHÔNG sao chép quiz/fill/dictation của site nguồn sang đây:**

| Site nguồn (audit) | App 3D Bước 6 |
|---|---|
| Trắc nghiệm bài khóa 4 câu/bài | Không có — thay bằng 2 bước `pick-meaning` + kiểm tra cuối 5 từ trong quest |
| Điền từ vào câu (25 mục/bài) | Không có — thay bằng 1 bước `order` (xếp câu tự soạn) ở 6/9 quest mới |
| Nghe viết dictation 15 câu/bài | Không có — kiểm tra cuối có 1 câu nghe chép (dạng `dictation` ở câu 3/5) trong quest |
| 4 game (tone/fall/carp/cannon) | Không có ở Bước 6 |
| Tab Từ vựng (ảnh minh họa, 1 ví dụ/từ) | Sổ tay (`Handbook.tsx`): 5 tab (Theo bài / Đã gặp / Cần ôn / Đã nhớ vững / Tìm kiếm), mỗi từ có pinyin, nghĩa, 1 ví dụ tự soạn, lịch sử sai |
| SRS "Ôn tập hôm nay" | SRS 1–3–7–14–30 ngày qua `lib/learn/store.ts` (xem §4) |

Không sao chép toàn văn bài khóa, không dịch toàn văn, không copy audio gốc. Mọi câu tiếng Trung trong quest đều tự soạn, gắn `source: 'authored'`, không gọi là nguyên văn sách. Câu chủ đề của bài (tên bài trong audit §3a) chỉ dùng làm tiêu đề hiển thị, không dùng làm câu luyện tập.

## 3. Đường học của một từ (nơi học lần đầu → quest → ôn)

1. **Gặp lần đầu trong quest:** bước `talk` của cô giáo (1 từ chủ đề) → 2 bước `pick-meaning` → 1 bước `order`/`choose-number`/`choose-goal` → kiểm tra cuối 5 từ. Bước nào có `lexemeId` thì `markEncountered` ghi "đã gặp" và đáp án ghi qua `recordAnswer` (điểm 10/5/3/2).
2. **Kiểm tra cuối 5 từ/bài:** 50 từ trong tổng số 246 nằm trong vòng kiểm tra cuối của quest chứa nó (cột "Kiểm tra cuối" ở §4); 196 từ còn lại vẫn được gặp + ghi điểm ở các bước học, và đều vào sổ tay.
3. **Vòng ôn lại ngay:** từ sai ở kiểm tra cuối được hỏi lại 1 câu dạng khác ngay trong phiên (`recordReReview`, 0 điểm, không đổi level/nextDue — từ vẫn đến hạn ôn vào ngày mai).
4. **SRS dài hạn (§4):** xem dưới.

## 4. Đường ôn SRS (1–3–7–14–30 qua store)

- Lịch ôn theo level (`lib/learn/store.ts`, `REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30]`): đúng không gợi ý lần đầu → level +1, `nextDue` = hôm nay + khoảng của level mới; đúng có gợi ý / đúng sau khi sai → giữ level, ôn lại ngày mai; sai → level 0, ôn lại ngày mai.
- "Đã nhớ tương đối vững": level ≥ 3 và không còn lần sai chưa sửa đúng (`isWellKnownState`).
- Sổ tay tab "Cần ôn": từ đến hạn (`getDueWords`) CỘNG từ sai trong phiên/ngày hôm nay (`getDueWordsIncludingTodayWrong`) — từ vừa sai vẫn hiện để ôn dù `nextDue` là ngày mai.
- Tiến độ lưu trên thiết bị này (localStorage, key `bkhn-progress-v1`, không cần tài khoản); xuất/nhập JSON bản sao có validate — id từ lạ bị loại, 246 id đã biết đều được nhận (`importProgress`).
- Thưởng hoàn thành quest: 50 điểm + huy hiệu riêng từng quest, idempotent qua `awardQuestCompletion` (chơi lại không cộng lại).
- Mở khóa (quyết định Bước 6, xem `PROGRESS.md`): **MỞ TỰ DO** — cả 9 bài HSK 3 bấm được ngay, không khóa bài sau theo bài trước; trạng thái từng bài (chưa bắt đầu / đang học dở / đã hoàn thành) hiện rõ trong menu "Đổi bài". Bài 10 có 2 quest (nhóm 1 → nhóm 2–4); menu bài 10 tự chọn quest tiếp theo chưa xong.

## 5. Bảng chi tiết 246 từ

Cột "Quest" = quest chứa từ đó (từ học lần đầu ở quest này). Cột "Kiểm tra cuối" = từ có nằm trong 5 từ kiểm tra cuối của quest đó không.

| Từ | Pinyin | Nghĩa | Bài · Nhóm | Quest | Kiểm tra cuối |
|---|---|---|---|---|---|
| 数学 | shùxué | môn Toán | Bài 10 · nhóm 1 | first-lesson | ✓ (first-lesson) |
| 认真 | rènzhēn | chăm chỉ, nghiêm túc | Bài 10 · nhóm 1 | first-lesson | – |
| 笔记 | bǐjì | ghi chép | Bài 10 · nhóm 1 | first-lesson | ✓ (first-lesson) |
| 清楚 | qīngchu | rõ ràng | Bài 10 · nhóm 1 | first-lesson | – |
| 黑板 | hēibǎn | bảng đen | Bài 10 · nhóm 1 | first-lesson | ✓ (first-lesson) |
| 把 | bǎ | giới từ/cấu trúc 把 | Bài 10 · nhóm 1 | first-lesson | – |
| 作业 | zuòyè | bài tập về nhà | Bài 10 · nhóm 1 | first-lesson | ✓ (first-lesson) |
| 遍 | biàn | lượt | Bài 10 · nhóm 1 | first-lesson | – |
| 提高 | tígāo | nâng cao | Bài 10 · nhóm 1 | first-lesson | ✓ (first-lesson) |
| 历史 | lìshǐ | Lịch sử | Bài 10 · nhóm 2 | l10-g234 | ✓ (l10-g234) |
| 难 | nán | khó | Bài 10 · nhóm 2 | l10-g234 | – |
| 要求 | yāoqiú | yêu cầu | Bài 10 · nhóm 2 | l10-g234 | – |
| 差 | chà | kém | Bài 10 · nhóm 2 | l10-g234 | – |
| 复习 | fùxí | ôn tập | Bài 10 · nhóm 2 | l10-g234 | ✓ (l10-g234) |
| 外语 | wàiyǔ | ngoại ngữ | Bài 10 · nhóm 2 | l10-g234 | – |
| 当然 | dāngrán | đương nhiên | Bài 10 · nhóm 2 | l10-g234 | – |
| 遇到 | yùdào | gặp, gặp phải | Bài 10 · nhóm 2 | l10-g234 | – |
| 办公室 | bàngōngshì | văn phòng | Bài 10 · nhóm 2 | l10-g234 | – |
| 页 | yè | trang (sách) | Bài 10 · nhóm 3 | l10-g234 | – |
| 对话 | duìhuà | hội thoại | Bài 10 · nhóm 3 | l10-g234 | ✓ (l10-g234) |
| 明白 | míngbai | hiểu | Bài 10 · nhóm 3 | l10-g234 | ✓ (l10-g234) |
| 讲 | jiǎng | giảng | Bài 10 · nhóm 3 | l10-g234 | – |
| 句 | jù | câu (nói) | Bài 10 · nhóm 3 | l10-g234 | – |
| 句子 | jùzi | câu (văn) | Bài 10 · nhóm 3 | l10-g234 | – |
| 年级 | niánjí | khối lớp | Bài 10 · nhóm 4 | l10-g234 | – |
| 后年 | hòunián | năm sau nữa | Bài 10 · nhóm 4 | l10-g234 | – |
| 一般 | yìbān | bình thường | Bài 10 · nhóm 4 | l10-g234 | – |
| 努力 | nǔlì | nỗ lực | Bài 10 · nhóm 4 | l10-g234 | ✓ (l10-g234) |
| 会议 | huìyì | cuộc họp | Bài 11 · nhóm 1 | l11 | ✓ (l11) |
| 经理 | jīnglǐ | giám đốc | Bài 11 · nhóm 1 | l11 | – |
| 开会 | kāihuì | họp | Bài 11 · nhóm 1 | l11 | ✓ (l11) |
| 后天 | hòutiān | ngày kia | Bài 11 · nhóm 1 | l11 | – |
| 地点 | dìdiǎn | địa điểm | Bài 11 · nhóm 1 | l11 | – |
| 室 | shì | phòng | Bài 11 · nhóm 1 | l11 | – |
| 发 | fā | gửi | Bài 11 · nhóm 1 | l11 | – |
| 笔记本电脑 | bǐjìběn diànnǎo | máy tính xách tay | Bài 11 · nhóm 1 | l11 | – |
| 或者 | huòzhě | hoặc | Bài 11 · nhóm 1 | l11 | – |
| 声音 | shēngyīn | âm thanh | Bài 11 · nhóm 2 | l11 | – |
| 看来 | kànlái | xem ra, có vẻ như | Bài 11 · nhóm 2 | l11 | – |
| 办法 | bànfǎ | cách, biện pháp | Bài 11 · nhóm 2 | l11 | – |
| 解决 | jiějué | giải quyết | Bài 11 · nhóm 2 | l11 | ✓ (l11) |
| 只能 | zhǐnéng | chỉ có thể | Bài 11 · nhóm 2 | l11 | – |
| 别人 | biérén | người khác | Bài 11 · nhóm 2 | l11 | – |
| 请假 | qǐngjià | xin nghỉ | Bài 11 · nhóm 3 | l11 | ✓ (l11) |
| 同事 | tóngshì | đồng nghiệp | Bài 11 · nhóm 3 | l11 | – |
| 休假 | xiūjià | nghỉ phép | Bài 11 · nhóm 3 | l11 | – |
| 怕 | pà | sợ | Bài 11 · nhóm 3 | l11 | – |
| 邮箱 | yóuxiāng | hộp thư điện tử | Bài 11 · nhóm 3 | l11 | – |
| 老张 | Lǎo Zhāng | Lão Trương (cách gọi đồng nghiệp họ Trương) | Bài 11 · nhóm 3 | l11 | – |
| 愿意 | yuànyì | sẵn lòng | Bài 11 · nhóm 4 | l11 | – |
| 城市 | chéngshì | thành phố | Bài 11 · nhóm 4 | l11 | – |
| 离开 | líkāi | rời khỏi | Bài 11 · nhóm 4 | l11 | – |
| 机会 | jīhuì | cơ hội | Bài 11 · nhóm 4 | l11 | ✓ (l11) |
| 生活 | shēnghuó | cuộc sống | Bài 11 · nhóm 4 | l11 | – |
| 为 | wèi | vì | Bài 11 · nhóm 4 | l11 | – |
| 或 | huò | hoặc | Bài 11 · nhóm 4 | l11 | – |
| 街 | jiē | phố, đường | Bài 12 · nhóm 1 | l12 | – |
| 开花 | kāihuā | nở hoa | Bài 12 · nhóm 1 | l12 | – |
| 公园 | gōngyuán | công viên | Bài 12 · nhóm 1 | l12 | ✓ (l12) |
| 船 | chuán | thuyền | Bài 12 · nhóm 1 | l12 | – |
| 工作日 | gōngzuòrì | ngày làm việc | Bài 12 · nhóm 1 | l12 | – |
| 地方 | dìfang | nơi, địa điểm | Bài 12 · nhóm 1 | l12 | – |
| 刚才 | gāngcái | vừa rồi, lúc nãy | Bài 12 · nhóm 2 | l12 | – |
| 刮 | guā | (gió) thổi | Bài 12 · nhóm 2 | l12 | – |
| 风 | fēng | gió | Bài 12 · nhóm 2 | l12 | – |
| 新闻 | xīnwén | tin tức | Bài 12 · nhóm 2 | l12 | – |
| 伞 | sǎn | ô, dù | Bài 12 · nhóm 2 | l12 | – |
| 借 | jiè | mượn | Bài 12 · nhóm 2 | l12 | – |
| 把 | bǎ | cái (đồ có tay cầm) | Bài 12 · nhóm 2 | l12 | – |
| 雨衣 | yǔyī | áo mưa | Bài 12 · nhóm 2 | l12 | – |
| 变 | biàn | thay đổi | Bài 12 · nhóm 2 | l12 | – |
| 季节 | jìjié | mùa (trong năm) | Bài 12 · nhóm 2 | l12 | ✓ (l12) |
| 变化 | biànhuà | thay đổi; sự thay đổi | Bài 12 · nhóm 2 | l12 | ✓ (l12) |
| 冬天 | dōngtiān | mùa đông | Bài 12 · nhóm 3 | l12 | ✓ (l12) |
| 常常 | chángcháng | thường, thường xuyên | Bài 12 · nhóm 3 | l12 | – |
| 关注 | guānzhù | quan tâm, chú ý | Bài 12 · nhóm 3 | l12 | – |
| 四季 | sìjì | bốn mùa | Bài 12 · nhóm 4 | l12 | ✓ (l12) |
| 春天 | chūntiān | mùa xuân | Bài 12 · nhóm 4 | l12 | – |
| 夏天 | xiàtiān | mùa hè | Bài 12 · nhóm 4 | l12 | – |
| 凉快 | liángkuai | mát mẻ | Bài 12 · nhóm 4 | l12 | – |
| 秋天 | qiūtiān | mùa thu | Bài 12 · nhóm 4 | l12 | – |
| 叶子 | yèzi | lá | Bài 12 · nhóm 4 | l12 | – |
| 变成 | biànchéng | trở thành | Bài 12 · nhóm 4 | l12 | – |
| 请客 | qǐngkè | đãi khách, mời khách | Bài 13 · nhóm 1 | l13 | ✓ (l13) |
| 南方 | nánfāng | miền Nam | Bài 13 · nhóm 1 | l13 | – |
| 北方 | běifāng | miền Bắc | Bài 13 · nhóm 1 | l13 | – |
| 做法 | zuòfǎ | cách làm | Bài 13 · nhóm 1 | l13 | – |
| 不同 | bùtóng | khác nhau | Bài 13 · nhóm 1 | l13 | – |
| 加 | jiā | thêm | Bài 13 · nhóm 1 | l13 | – |
| 的话 | dehuà | nếu | Bài 13 · nhóm 1 | l13 | – |
| 做客 | zuòkè | làm khách | Bài 13 · nhóm 1 | l13 | – |
| 邻居 | línjū | hàng xóm, láng giềng | Bài 13 · nhóm 2 | l13 | ✓ (l13) |
| 放心 | fàngxīn | yên tâm | Bài 13 · nhóm 2 | l13 | – |
| 酒 | jiǔ | rượu | Bài 13 · nhóm 2 | l13 | – |
| 放 | fàng | đặt, để | Bài 13 · nhóm 2 | l13 | – |
| 客人 | kèrén | khách, khách hàng | Bài 13 · nhóm 2 | l13 | – |
| 晚会 | wǎnhuì | dạ hội, buổi tiệc tối | Bài 13 · nhóm 3 | l13 | – |
| 礼物 | lǐwù | quà, món quà | Bài 13 · nhóm 3 | l13 | ✓ (l13) |
| 画家 | huàjiā | họa sĩ | Bài 13 · nhóm 3 | l13 | – |
| 盘子 | pánzi | đĩa | Bài 13 · nhóm 3 | l13 | – |
| 一边 | yìbiān | vừa… vừa… | Bài 13 · nhóm 3 | l13 | – |
| 聊天儿 | liáotiānr | trò chuyện, tán gẫu | Bài 13 · nhóm 3 | l13 | – |
| 来自 | láizì | đến từ | Bài 13 · nhóm 4 | l13 | ✓ (l13) |
| 夫妻 | fūqī | vợ chồng | Bài 13 · nhóm 4 | l13 | – |
| 直到 | zhídào | cho đến, mãi đến | Bài 13 · nhóm 4 | l13 | – |
| 地图 | dìtú | bản đồ | Bài 13 · nhóm 4 | l13 | – |
| 点 | diǎn | điểm, chấm nhỏ | Bài 13 · nhóm 4 | l13 | – |
| 感到 | gǎndào | cảm thấy | Bài 13 · nhóm 4 | l13 | – |
| 东方 | dōngfāng | phương Đông | Bài 13 · nhóm 4 | l13 | – |
| 文化 | wénhuà | văn hóa | Bài 13 · nhóm 4 | l13 | ✓ (l13) |
| 英国 | Yīngguó | Vương quốc Anh | Bài 13 · nhóm 4 | l13 | – |
| 词典 | cídiǎn | từ điển | Bài 14 · nhóm 1 | l14 | ✓ (l14) |
| 最好 | zuìhǎo | tốt nhất | Bài 14 · nhóm 1 | l14 | – |
| 节 | jié | tiết (học) | Bài 14 · nhóm 1 | l14 | – |
| 图书馆 | túshūguǎn | thư viện | Bài 14 · nhóm 1 | l14 | ✓ (l14) |
| 被 | bèi | bị, được | Bài 14 · nhóm 1 | l14 | ✓ (l14) |
| 名人 | míngrén | danh nhân | Bài 14 · nhóm 1 | l14 | – |
| 故事 | gùshi | câu chuyện | Bài 14 · nhóm 1 | l14 | ✓ (l14) |
| 然后 | ránhòu | sau đó | Bài 14 · nhóm 2 | l14 | – |
| 报纸 | bàozhǐ | báo, tờ báo | Bài 14 · nhóm 2 | l14 | – |
| 忘记 | wàngjì | quên | Bài 14 · nhóm 2 | l14 | – |
| 电子书 | diànzǐshū | sách điện tử | Bài 14 · nhóm 2 | l14 | – |
| 女生 | nǚshēng | nữ sinh | Bài 14 · nhóm 3 | l14 | – |
| 表演 | biǎoyǎn | biểu diễn | Bài 14 · nhóm 3 | l14 | – |
| 节目 | jiémù | tiết mục | Bài 14 · nhóm 3 | l14 | – |
| 怎么办 | zěnme bàn | làm thế nào | Bài 14 · nhóm 3 | l14 | – |
| 校长 | xiàozhǎng | hiệu trưởng | Bài 14 · nhóm 3 | l14 | – |
| 面前 | miànqián | phía trước, trước mặt | Bài 14 · nhóm 3 | l14 | – |
| 有些 | yǒuxiē | hơi, có phần | Bài 14 · nhóm 3 | l14 | – |
| 相信 | xiāngxìn | tin tưởng | Bài 14 · nhóm 3 | l14 | ✓ (l14) |
| 新年 | xīnnián | năm mới | Bài 14 · nhóm 4 | l14 | – |
| 班级 | bānjí | lớp học | Bài 14 · nhóm 4 | l14 | – |
| 跳 | tiào | nhảy, khiêu vũ | Bài 14 · nhóm 4 | l14 | – |
| 留学生 | liúxuéshēng | lưu học sinh | Bài 14 · nhóm 4 | l14 | – |
| 最后 | zuìhòu | cuối cùng | Bài 14 · nhóm 4 | l14 | – |
| 一块儿 | yíkuàir | cùng nhau | Bài 14 · nhóm 4 | l14 | – |
| 网站 | wǎngzhàn | trang web | Bài 14 · nhóm 4 | l14 | – |
| 视频 | shìpín | video | Bài 14 · nhóm 4 | l14 | – |
| 蓝 | lán | màu xanh lam | Bài 15 · nhóm 1 | l15 | – |
| 段 | duàn | đoạn, quãng | Bài 15 · nhóm 1 | l15 | – |
| 附近 | fùjìn | gần đó, lân cận | Bài 15 · nhóm 1 | l15 | – |
| 马路 | mǎlù | đường cái | Bài 15 · nhóm 1 | l15 | – |
| 平时 | píngshí | thường ngày | Bài 15 · nhóm 1 | l15 | – |
| 放学 | fàngxué | tan học | Bài 15 · nhóm 1 | l15 | – |
| 游戏 | yóuxì | trò chơi | Bài 15 · nhóm 1 | l15 | – |
| 老人 | lǎorén | người già | Bài 15 · nhóm 1 | l15 | – |
| 根据 | gēnjù | căn cứ vào, dựa vào | Bài 15 · nhóm 1 | l15 | – |
| 了解 | liǎojiě | hiểu rõ, tìm hiểu | Bài 15 · nhóm 2 | l15 | ✓ (l15) |
| 可是 | kěshì | nhưng | Bài 15 · nhóm 2 | l15 | – |
| 以上 | yǐshàng | trở lên | Bài 15 · nhóm 2 | l15 | – |
| 有名 | yǒumíng | nổi tiếng | Bài 15 · nhóm 2 | l15 | – |
| 景点 | jǐngdiǎn | điểm du lịch | Bài 15 · nhóm 2 | l15 | ✓ (l15) |
| 游客 | yóukè | du khách | Bài 15 · nhóm 2 | l15 | – |
| 外地 | wàidì | nơi khác, vùng khác | Bài 15 · nhóm 2 | l15 | – |
| 聊 | liáo | trò chuyện | Bài 15 · nhóm 2 | l15 | – |
| 南京 | nánjīng | Nam Kinh | Bài 15 · nhóm 2 | l15 | ✓ (l15) |
| 河 | hé | sông | Bài 15 · nhóm 3 | l15 | – |
| 关系 | guānxi | quan hệ | Bài 15 · nhóm 3 | l15 | – |
| 养 | yǎng | nuôi dưỡng | Bài 15 · nhóm 3 | l15 | – |
| 黄河 | huáng hé | sông Hoàng Hà | Bài 15 · nhóm 3 | l15 | ✓ (l15) |
| 西北 | xīběi | tây bắc | Bài 15 · nhóm 4 | l15 | – |
| 经过 | jīngguò | đi qua, trải qua | Bài 15 · nhóm 4 | l15 | – |
| 草地 | cǎodì | thảm cỏ | Bài 15 · nhóm 4 | l15 | – |
| 遇见 | yùjiàn | tình cờ gặp | Bài 15 · nhóm 4 | l15 | ✓ (l15) |
| 脏 | zāng | bẩn | Bài 16 · nhóm 1 | l16 | – |
| 可爱 | kě'ài | đáng yêu | Bài 16 · nhóm 1 | l16 | ✓ (l16) |
| 一会儿 | yíhuìr | một lát | Bài 16 · nhóm 1 | l16 | – |
| 脚 | jiǎo | bàn chân | Bài 16 · nhóm 1 | l16 | – |
| 照顾 | zhàogu | chăm sóc | Bài 16 · nhóm 1 | l16 | – |
| 好像 | hǎoxiàng | hình như; giống như | Bài 16 · nhóm 1 | l16 | – |
| 认得 | rènde | nhận ra, biết mặt/chữ | Bài 16 · nhóm 1 | l16 | – |
| 周末 | zhōumò | cuối tuần | Bài 16 · nhóm 1 | l16 | – |
| 动物园 | dòngwùyuán | vườn thú | Bài 16 · nhóm 1 | l16 | ✓ (l16) |
| 动物 | dòngwù | động vật | Bài 16 · nhóm 1 | l16 | – |
| 大熊猫 | dàxióngmāo | gấu trúc lớn | Bài 16 · nhóm 2 | l16 | ✓ (l16) |
| 奇怪 | qíguài | kỳ lạ | Bài 16 · nhóm 2 | l16 | – |
| 其实 | qíshí | thật ra, thực ra | Bài 16 · nhóm 2 | l16 | – |
| 竹子 | zhúzi | tre, trúc | Bài 16 · nhóm 2 | l16 | ✓ (l16) |
| 国宝 | guóbǎo | báu vật quốc gia, quốc bảo | Bài 16 · nhóm 2 | l16 | ✓ (l16) |
| 全 | quán | toàn bộ, tất cả | Bài 16 · nhóm 2 | l16 | – |
| 野生 | yěshēng | hoang dã | Bài 16 · nhóm 2 | l16 | – |
| 关于 | guānyú | về, liên quan đến | Bài 16 · nhóm 2 | l16 | – |
| 饱 | bǎo | no | Bài 16 · nhóm 3 | l16 | – |
| 张 | zhāng | mở, há | Bài 16 · nhóm 3 | l16 | – |
| 嘴 | zuǐ | miệng | Bài 16 · nhóm 3 | l16 | – |
| 身边 | shēnbiān | bên cạnh (người) | Bài 16 · nhóm 3 | l16 | – |
| 半天 | bàntiān | nửa ngày; rất lâu | Bài 16 · nhóm 3 | l16 | – |
| 脸 | liǎn | mặt, khuôn mặt | Bài 16 · nhóm 3 | l16 | – |
| 大人 | dàrén | người lớn | Bài 16 · nhóm 4 | l16 | – |
| 喜爱 | xǐ'ài | yêu thích | Bài 16 · nhóm 4 | l16 | – |
| 向 | xiàng | hướng về | Bài 17 · nhóm 1 | l17 | ✓ (l17) |
| 楼梯 | lóutī | cầu thang bộ | Bài 17 · nhóm 1 | l17 | – |
| 害怕 | hàipà | sợ, sợ hãi | Bài 17 · nhóm 1 | l17 | – |
| 生气 | shēngqì | giận, tức giận | Bài 17 · nhóm 1 | l17 | – |
| 常见 | chángjiàn | thường gặp, thường thấy | Bài 17 · nhóm 1 | l17 | – |
| 聪明 | cōngming | thông minh | Bài 17 · nhóm 1 | l17 | ✓ (l17) |
| 错 | cuò | sai, lỗi, lỗi sai | Bài 17 · nhóm 1 | l17 | – |
| 认为 | rènwéi | cho rằng, nghĩ rằng | Bài 17 · nhóm 1 | l17 | – |
| 到处 | dàochù | mọi nơi, khắp nơi | Bài 17 · nhóm 2 | l17 | – |
| 继续 | jìxù | tiếp tục | Bài 17 · nhóm 2 | l17 | – |
| 同意 | tóngyì | đồng ý | Bài 17 · nhóm 2 | l17 | – |
| 可 | kě | nhưng, nhưng mà; thật (nhấn mạnh) | Bài 17 · nhóm 2 | l17 | – |
| 屋子 | wūzi | phòng, căn phòng, ngôi nhà | Bài 17 · nhóm 2 | l17 | – |
| 有关 | yǒuguān | liên quan, có liên quan | Bài 17 · nhóm 2 | l17 | – |
| 关机 | guānjī | tắt máy | Bài 17 · nhóm 3 | l17 | – |
| 前天 | qiántiān | hôm kia | Bài 17 · nhóm 3 | l17 | – |
| 留学 | liúxué | du học | Bài 17 · nhóm 3 | l17 | – |
| 国家 | guójiā | quốc gia, đất nước | Bài 17 · nhóm 3 | l17 | – |
| 比如 | bǐrú | ví dụ như, chẳng hạn | Bài 17 · nhóm 3 | l17 | – |
| 查 | chá | tra, kiểm tra | Bài 17 · nhóm 3 | l17 | – |
| 有用 | yǒuyòng | hữu ích | Bài 17 · nhóm 3 | l17 | – |
| 容易 | róngyì | dễ, dễ dàng | Bài 17 · nhóm 4 | l17 | ✓ (l17) |
| 回答 | huídá | trả lời | Bài 17 · nhóm 4 | l17 | ✓ (l17) |
| 方向 | fāngxiàng | phương hướng | Bài 17 · nhóm 4 | l17 | – |
| 只有 | zhǐyǒu | chỉ có | Bài 17 · nhóm 4 | l17 | – |
| 真正 | zhēnzhèng | thực sự, thật sự | Bài 17 · nhóm 4 | l17 | – |
| 难题 | nántí | vấn đề khó, vấn đề nan giải | Bài 17 · nhóm 4 | l17 | ✓ (l17) |
| 怎样 | zěnyàng | thế nào | Bài 18 · nhóm 1 | l18 | – |
| 过节 | guòjié | đón lễ | Bài 18 · nhóm 1 | l18 | – |
| 节 | jié | lễ, ngày lễ, dịp lễ | Bài 18 · nhóm 1 | l18 | – |
| 节日 | jiérì | ngày lễ | Bài 18 · nhóm 1 | l18 | – |
| 联欢 | liánhuān | liên hoan, vui chung | Bài 18 · nhóm 1 | l18 | – |
| 大概 | dàgài | khoảng, đại khái; có lẽ | Bài 18 · nhóm 1 | l18 | – |
| 春节 | chūnjié | Tết Nguyên đán | Bài 18 · nhóm 1 | l18 | ✓ (l18) |
| 阿姨 | āyí | cô, dì | Bài 18 · nhóm 2 | l18 | – |
| 叔叔 | shūshu | chú, bác trai | Bài 18 · nhóm 2 | l18 | – |
| 收 | shōu | nhận; thu, cất | Bài 18 · nhóm 2 | l18 | – |
| 总 | zǒng | luôn, cứ | Bài 18 · nhóm 2 | l18 | – |
| 起 | qǐ | (sau động từ) nhắc đến; bắt đầu từ | Bài 18 · nhóm 2 | l18 | – |
| 见面 | jiànmiàn | gặp mặt | Bài 18 · nhóm 2 | l18 | – |
| 矿泉水 | kuàngquánshuǐ | nước khoáng | Bài 18 · nhóm 2 | l18 | – |
| 刚刚 | gānggāng | vừa mới | Bài 18 · nhóm 2 | l18 | – |
| 出发 | chūfā | xuất phát | Bài 18 · nhóm 3 | l18 | – |
| 不久 | bùjiǔ | không lâu, chẳng bao lâu | Bài 18 · nhóm 3 | l18 | – |
| 发生 | fāshēng | xảy ra | Bài 18 · nhóm 3 | l18 | – |
| 刚 | gāng | vừa mới | Bài 18 · nhóm 3 | l18 | – |
| 只要 | zhǐyào | chỉ cần | Bài 18 · nhóm 3 | l18 | – |
| 学期 | xuéqī | học kỳ | Bài 18 · nhóm 3 | l18 | – |
| 毕业 | bìyè | tốt nghiệp | Bài 18 · nhóm 3 | l18 | ✓ (l18) |
| 出生 | chūshēng | sinh ra | Bài 18 · nhóm 4 | l18 | – |
| 过去 | guòqù | quá khứ, trước đây | Bài 18 · nhóm 4 | l18 | – |
| 懂得 | dǒngde | hiểu, biết được | Bài 18 · nhóm 4 | l18 | – |
| 坚持 | jiānchí | kiên trì, duy trì | Bài 18 · nhóm 4 | l18 | ✓ (l18) |
| 完成 | wánchéng | hoàn thành | Bài 18 · nhóm 4 | l18 | ✓ (l18) |
| 目标 | mùbiāo | mục tiêu | Bài 18 · nhóm 4 | l18 | ✓ (l18) |
| 发展 | fāzhǎn | phát triển | Bài 18 · nhóm 4 | l18 | – |
