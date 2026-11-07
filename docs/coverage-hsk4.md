# Coverage HSK 4 — 811 từ / 50 nhóm (Bước 7)

- **Ngày:** 2026-11-06
- **Nguồn đối soát:** `docs/content-audit.md` §3b (thượng) / §3c (hạ) + phụ lục §6 (kiểm tra lại quyển hạ 2026-11-06, đã xác minh bằng mã nguồn trang live) + dữ liệu trong repo (`content/hsk4-shang-l1.ts` … `l10.ts`, `content/hsk4-xia-l11.ts` … `l20.ts`, aggregate ở `content/hsk4-index.ts`).
- **Cách đếm:** đếm trực tiếp từ dữ liệu trong repo bằng test (`test/learn.test.cjs` (16)); bảng 811 dòng ở §5 sinh bằng script từ cùng dữ liệu, không gõ tay.

## 1. Đối chiếu tổng số với audit — KHỚP 100%, không chênh lệch

### Quyển thượng (bài 1–10): 404 từ / 40 nhóm

| Bài | Từ (audit) | Từ (repo) | Nhóm (audit) | Nhóm (repo) | Quest | Chênh lệch |
|---|---|---|---|---|---|---|
| 1 | 40 | 40 | 4 (7+11+12+10) | 4 (7+11+12+10) | `hsk4-shang-l1a` (18 từ) + `hsk4-shang-l1b` (22 từ) | Không |
| 2 | 37 | 37 | 4 (8+7+10+12) | 4 (8+7+10+12) | `hsk4-shang-l2a` (15 từ) + `hsk4-shang-l2b` (22 từ) | Không |
| 3 | 42 | 42 | 4 (7+12+10+13) | 4 (7+12+10+13) | `hsk4-shang-l3a` (19 từ) + `hsk4-shang-l3b` (23 từ) | Không |
| 4 | 40 | 40 | 4 (9+9+10+12) | 4 (9+9+10+12) | `hsk4-shang-l4a` (18 từ) + `hsk4-shang-l4b` (22 từ) | Không |
| 5 | 44 | 44 | 4 (11+7+14+12) | 4 (11+7+14+12) | `hsk4-shang-l5a` (18 từ) + `hsk4-shang-l5b` (26 từ) | Không |
| 6 | 39 | 39 | 4 (7+9+15+8) | 4 (7+9+15+8) | `hsk4-shang-l6a` (16 từ) + `hsk4-shang-l6b` (23 từ) | Không |
| 7 | 39 | 39 | 4 (12+8+10+9) | 4 (12+8+10+9) | `hsk4-shang-l7a` (20 từ) + `hsk4-shang-l7b` (19 từ) | Không |
| 8 | 40 | 40 | 4 (11+9+9+11) | 4 (11+9+9+11) | `hsk4-shang-l8a` (20 từ) + `hsk4-shang-l8b` (20 từ) | Không |
| 9 | 40 | 40 | 4 (10+8+12+10) | 4 (10+8+12+10) | `hsk4-shang-l9a` (18 từ) + `hsk4-shang-l9b` (22 từ) | Không |
| 10 | 43 | 43 | 4 (12+8+10+13) | 4 (12+8+10+13) | `hsk4-shang-l10a` (20 từ) + `hsk4-shang-l10b` (23 từ) | Không |
| **Tổng thượng** | **404** | **404** | **40 nhóm** | **40 nhóm** | **20 quest** | **Không** |

### Quyển hạ (bài 11–20): 407 từ / 10 nhóm (1 nhóm/bài)

| Bài | Từ (audit) | Từ (repo) | Nhóm (audit) | Nhóm (repo) | Quest | Chênh lệch |
|---|---|---|---|---|---|---|
| 11 | 41 | 41 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l11a` (21 từ) + `hsk4-xia-l11b` (20 từ) | Không |
| 12 | 43 | 43 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l12a` (22 từ) + `hsk4-xia-l12b` (21 từ) | Không |
| 13 | 43 | 43 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l13a` (22 từ) + `hsk4-xia-l13b` (21 từ) | Không |
| 14 | 41 | 41 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l14a` (21 từ) + `hsk4-xia-l14b` (20 từ) | Không |
| 15 | 37 | 37 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l15a` (19 từ) + `hsk4-xia-l15b` (18 từ) | Không |
| 16 | 41 | 41 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l16a` (21 từ) + `hsk4-xia-l16b` (20 từ) | Không |
| 17 | 41 | 41 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l17a` (21 từ) + `hsk4-xia-l17b` (20 từ) | Không |
| 18 | 39 | 39 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l18a` (20 từ) + `hsk4-xia-l18b` (19 từ) | Không |
| 19 | 40 | 40 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l19a` (20 từ) + `hsk4-xia-l19b` (20 từ) | Không |
| 20 | 41 | 41 | 1 (cả bài) | 1 (cả bài) | `hsk4-xia-l20a` (21 từ) + `hsk4-xia-l20b` (20 từ) | Không |
| **Tổng hạ** | **407** | **407** | **10 nhóm** | **10 nhóm** | **20 quest** | **Không** |

| Toàn bộ HSK 4 | 811 | 811 | 50 nhóm | 50 nhóm | 40 quest | Không |

- ID từ duy nhất: 811/811 (không trùng, không thiếu; cộng HSK 3 = 1057 id duy nhất toàn cục).
- Mỗi từ có đúng 1 ví dụ tự soạn (`source: 'authored'`), 811/811.
- **Quyển hạ chỉ có 1 nhóm/bài là đúng theo nguồn, không phải thiếu sót:** audit §6 (kiểm tra lại 2026-11-06 bằng `engine.js` của trang live) cho thấy hàm `vocabGroupsCur()` của site nguồn trả về đúng 1 nhóm chứa toàn bộ từ cho mọi bài hạ (`if(isXia()) return [l.vocab.map((v,i)=>i)]`). Không bịa thêm nhóm cho hạ.
- **Quyển hạ không có audio gốc / scene-sync** (audit §6): track audio nhóm và đồng bộ cảnh chỉ tồn tại ở quyển thượng; hạ chỉ có TTS của trình duyệt. App 3D dùng TTS zh-CN của trình duyệt cho mọi bài nên không thiếu chức năng nào so với thiết kế.
- **Từ loại bài 15 giữ nguyên văn nguồn:** cả 37 từ bài 15 có `pos` là `"Cụm từ"` trong nguồn (kể cả từ đơn như 答, 由, 扔, 镜子) — dữ liệu repo giữ nguyên, không tự "sửa" cho đẹp. Ghi rõ ở đây để khi đối soát không tưởng là lỗi nhập.
- **Quan sát chưa đổi thiết kế:** số câu trắc nghiệm bài khóa đếm được là 8 câu/bài ở cả 3 quyển (4 cảnh × 2), không phải 4 như audit §2/§3 ghi (xem §6) — chỉ ghi nhận, quest 3D không sao chép quiz của site nguồn nên không ảnh hưởng coverage.
- File nội dung theo mẫu `hsk4-shang-l1.ts` / `hsk4-xia-l11.ts`: mỗi bài có `LESSON` + `GROUP` + `LEXEMES` + `VOCABULARY` + `EXAMPLES` (+ alias `EXAMPLES`); thượng tách mảng theo nhóm (g1–g4), hạ một mảng duy nhất + 1 `GROUP` — hai cách tổ chức này cho cùng một aggregate ở `content/hsk4-index.ts` nên không ảnh hưởng coverage. `HSK4_COURSE` định nghĩa ở `hsk4-shang-l1.ts`, các file thượng khác re-export.

## 2. Cấu trúc luyện tập: site nguồn ≠ app 3D (ghi rõ để khỏi nhầm)

Cấu trúc "5 tab (Từ vựng · Bài khóa · Ngữ pháp · Luyện tập · Trò chơi), quiz, fill-in, dictation, game" trong audit (§2) là cấu trúc của **site nguồn** hoc-hsk. **Trong app 3D, luyện tập theo bài ở Bước 7 là quest + sổ tay + SRS — KHÔNG sao chép quiz/fill/dictation của site nguồn sang đây:**

| Site nguồn (audit) | App 3D Bước 7 |
|---|---|
| Trắc nghiệm bài khóa (4 câu/bài theo §2; đếm thực tế 8 câu — xem §1) | Không có — thay bằng 2 bước `pick-meaning` + kiểm tra cuối 5 từ trong mỗi quest |
| Điền từ vào câu | Không có — thay bằng 1 bước `order`/`choose-number`/`choose-goal` (tự soạn) ở mỗi quest |
| Nghe viết dictation | Không có — kiểm tra cuối có 1 câu nghe chép (dạng `dictation` ở câu 3/5) trong quest |
| 4 game (tone/fall/carp/cannon) | Không có ở Bước 7 |
| Tab Từ vựng (ảnh minh họa, 1 ví dụ/từ) | Sổ tay (`Handbook.tsx`): 5 tab (Theo bài / Đã gặp / Cần ôn / Đã nhớ vững / Tìm kiếm), mỗi từ có pinyin, nghĩa, 1 ví dụ tự soạn, lịch sử sai |
| Audio gốc nhà xuất bản (thượng) / TTS (hạ) | TTS zh-CN của trình duyệt cho mọi bài (giọng tổng hợp, không gọi là giọng người thật) |
| SRS "Ôn tập hôm nay" | SRS 1–3–7–14–30 ngày qua `lib/learn/store.ts` (xem §4) |

Không sao chép toàn văn bài khóa, không dịch toàn văn, không copy audio gốc. Mọi câu tiếng Trung trong quest đều tự soạn, gắn `source: 'authored'`, không gọi là nguyên văn sách. Câu chủ đề của bài (tên bài trong audit §3b/§3c) chỉ dùng làm tiêu đề hiển thị, không dùng làm câu luyện tập.

## 3. Đường học của một từ (nơi học lần đầu → quest → ôn)

1. **Chia buổi nhỏ (quyết định Bước 7):** mỗi bài HSK 4 có **2 quest ngắn** (phần 1 + phần 2), mỗi quest 8 bước theo đúng khung L11: chào Minh → tới cửa phòng → nghe cô giáo (1 từ chủ đề) → 2 bước `pick-meaning` → 1 bước `order`/`choose-number`/`choose-goal` → kiểm tra cuối 5 từ → kết quả. Thượng: phần 1 = nhóm 1–2, phần 2 = nhóm 3–4. Hạ: phần 1 = nửa đầu bài (ceil(n/2) từ), phần 2 = nửa sau. Bước nào có `lexemeId` thì `markEncountered` ghi "đã gặp" và đáp án ghi qua `recordAnswer` (điểm 10/5/3/2).
2. **Kiểm tra cuối 5 từ/quest:** 200 từ trong tổng số 811 nằm trong vòng kiểm tra cuối của quest chứa nó (cột "Kiểm tra cuối" ở §5); 611 từ còn lại vẫn được gặp + ghi điểm ở các bước học, và đều vào sổ tay.
3. **Vòng ôn lại ngay:** từ sai ở kiểm tra cuối được hỏi lại 1 câu dạng khác ngay trong phiên (`recordReReview`, 0 điểm, không đổi level/nextDue — từ vẫn đến hạn ôn vào ngày mai).
4. **SRS dài hạn (§4):** xem dưới.

## 4. Đường ôn SRS (1–3–7–14–30 qua store)

- Lịch ôn theo level (`lib/learn/store.ts`, `REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30]`): đúng không gợi ý lần đầu → level +1, `nextDue` = hôm nay + khoảng của level mới; đúng có gợi ý / đúng sau khi sai → giữ level, ôn lại ngày mai; sai → level 0, ôn lại ngày mai.
- "Đã nhớ tương đối vững": level ≥ 3 và không còn lần sai chưa sửa đúng (`isWellKnownState`).
- Sổ tay tab "Cần ôn": từ đến hạn (`getDueWords`) CỘNG từ sai trong phiên/ngày hôm nay (`getDueWordsIncludingTodayWrong`) — từ vừa sai vẫn hiện để ôn dù `nextDue` là ngày mai.
- Tiến độ lưu trên thiết bị này (localStorage, key `bkhn-progress-v1`, không cần tài khoản); xuất/nhập JSON bản sao có validate — id từ lạ bị loại, 1057 id đã biết (HSK 3 246 + HSK 4 811) đều được nhận (`importProgress`); migration từ store cũ (chỉ 9 từ bài 10 nhóm 1) đã kiểm chứng bằng test (16) — không mất tiến độ.
- Thưởng hoàn thành quest: 50 điểm + huy hiệu riêng từng quest, idempotent qua `awardQuestCompletion` (chơi lại không cộng lại).
- Mở khóa (quyết định Bước 7, nối tiếp quyết định mở khóa tự do của Bước 6, xem `PROGRESS.md`): **MỞ TỰ DO** — cả 20 bài HSK 4 bấm được ngay, không khóa bài sau theo bài trước; trạng thái từng bài (chưa bắt đầu / đang học dở / đã hoàn thành) hiện rõ trong menu "Đổi bài". Mỗi bài có 2 quest; menu tự chọn quest tiếp theo chưa xong (chơi lại quest phần 1 khi cả 2 đã xong). HSK 5 giữ khóa "Sắp ra mắt" (chưa có nguồn). Danh sách bài trong menu cuộn trong thẻ (`max-h-[58vh]`) vì 29 bài không vừa một màn hình.

## 5. Bảng chi tiết 811 từ

Cột "Quest" = quest chứa từ đó (từ học lần đầu ở quest này). Cột "Kiểm tra cuối" = từ có nằm trong 5 từ kiểm tra cuối của quest đó không.

| Từ | Pinyin | Nghĩa | Bài · Nhóm | Quest | Kiểm tra cuối |
|---|---|---|---|---|---|
| 签证 | qiānzhèng | thị thực, visa | Bài 1 · nhóm 1 | hsk4-shang-l1a | ✓ (hsk4-shang-l1a) |
| 入学 | rùxué | nhập học | Bài 1 · nhóm 1 | hsk4-shang-l1a | – |
| 通知 | tōngzhī | thông báo; thông báo (cho ai) | Bài 1 · nhóm 1 | hsk4-shang-l1a | ✓ (hsk4-shang-l1a) |
| 证件 | zhèngjiàn | giấy tờ tùy thân | Bài 1 · nhóm 1 | hsk4-shang-l1a | – |
| 材料 | cáiliào | tài liệu, hồ sơ | Bài 1 · nhóm 1 | hsk4-shang-l1a | – |
| 证 | zhèng | giấy chứng nhận, thẻ (chứng) | Bài 1 · nhóm 1 | hsk4-shang-l1a | – |
| 任何 | rènhé | bất kỳ, bất cứ | Bài 1 · nhóm 1 | hsk4-shang-l1a | – |
| 食堂 | shítáng | nhà ăn (căng-tin trường) | Bài 1 · nhóm 2 | hsk4-shang-l1a | – |
| 座 | zuò | (lượng từ) tòa, ngôi — dùng cho tòa nhà, núi | Bài 1 · nhóm 2 | hsk4-shang-l1a | – |
| 申请 | shēnqǐng | xin, đăng ký, nộp đơn | Bài 1 · nhóm 2 | hsk4-shang-l1a | – |
| 奖学金 | jiǎngxuéjīn | học bổng | Bài 1 · nhóm 2 | hsk4-shang-l1a | ✓ (hsk4-shang-l1a) |
| 表现 | biǎoxiàn | thể hiện, biểu hiện | Bài 1 · nhóm 2 | hsk4-shang-l1a | – |
| 获得 | huòdé | đạt được, nhận được | Bài 1 · nhóm 2 | hsk4-shang-l1a | ✓ (hsk4-shang-l1a) |
| 要是 | yàoshi | nếu, nếu như | Bài 1 · nhóm 2 | hsk4-shang-l1a | – |
| 减轻 | jiǎnqīng | giảm bớt, làm nhẹ đi | Bài 1 · nhóm 2 | hsk4-shang-l1a | – |
| 经济 | jīngjì | kinh tế | Bài 1 · nhóm 2 | hsk4-shang-l1a | – |
| 压力 | yālì | áp lực | Bài 1 · nhóm 2 | hsk4-shang-l1a | – |
| 加油 | jiāyóu | cố lên | Bài 1 · nhóm 2 | hsk4-shang-l1a | ✓ (hsk4-shang-l1a) |
| 随着 | suízhe | cùng với (sự thay đổi) | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 课程 | kèchéng | khóa học, chương trình học | Bài 1 · nhóm 3 | hsk4-shang-l1b | ✓ (hsk4-shang-l1b) |
| 专业 | zhuānyè | chuyên ngành; chuyên nghiệp | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 本科 | běnkē | bậc đại học (cử nhân) | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 硕士 | shuòshì | thạc sĩ | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 研究生 | yánjiūshēng | học viên cao học (thạc sĩ/tiến sĩ) | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 博士 | bóshì | tiến sĩ | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 研究 | yánjiū | nghiên cứu | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 活动 | huódòng | hoạt động | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 通过 | tōngguò | thông qua, qua; đỗ (kỳ thi) | Bài 1 · nhóm 3 | hsk4-shang-l1b | ✓ (hsk4-shang-l1b) |
| 交流 | jiāoliú | giao lưu, trao đổi | Bài 1 · nhóm 3 | hsk4-shang-l1b | – |
| 适应 | shìyìng | thích nghi, thích ứng | Bài 1 · nhóm 3 | hsk4-shang-l1b | ✓ (hsk4-shang-l1b) |
| 将来 | jiānglái | tương lai, sau này | Bài 1 · nhóm 4 | hsk4-shang-l1b | ✓ (hsk4-shang-l1b) |
| 国际 | guójì | quốc tế | Bài 1 · nhóm 4 | hsk4-shang-l1b | – |
| 当 | dāng | làm, đảm nhiệm (nghề/chức vụ) | Bài 1 · nhóm 4 | hsk4-shang-l1b | – |
| 教育 | jiàoyù | giáo dục; giáo dục (ai) | Bài 1 · nhóm 4 | hsk4-shang-l1b | – |
| 成为 | chéngwéi | trở thành | Bài 1 · nhóm 4 | hsk4-shang-l1b | – |
| 教师 | jiàoshī | giáo viên (gọi trang trọng) | Bài 1 · nhóm 4 | hsk4-shang-l1b | – |
| 贸易 | màoyì | thương mại, mậu dịch | Bài 1 · nhóm 4 | hsk4-shang-l1b | – |
| 方面 | fāngmiàn | phương diện, lĩnh vực, mặt | Bài 1 · nhóm 4 | hsk4-shang-l1b | – |
| 知识 | zhīshi | kiến thức | Bài 1 · nhóm 4 | hsk4-shang-l1b | ✓ (hsk4-shang-l1b) |
| 另 | lìng | khác, nữa (một … khác) | Bài 1 · nhóm 4 | hsk4-shang-l1b | – |
| 房东 | fángdōng | chủ nhà (cho thuê) | Bài 2 · nhóm 1 | hsk4-shang-l2a | ✓ (hsk4-shang-l2a) |
| 出租 | chūzū | cho thuê | Bài 2 · nhóm 1 | hsk4-shang-l2a | – |
| 房租 | fángzū | tiền thuê nhà | Bài 2 · nhóm 1 | hsk4-shang-l2a | ✓ (hsk4-shang-l2a) |
| 收拾 | shōushi | dọn dẹp, thu xếp | Bài 2 · nhóm 1 | hsk4-shang-l2a | – |
| 租 | zū | thuê | Bài 2 · nhóm 1 | hsk4-shang-l2a | ✓ (hsk4-shang-l2a) |
| 嗯 | ǹg | ừ, ừm (thán từ hưởng ứng) | Bài 2 · nhóm 1 | hsk4-shang-l2a | – |
| 亮 | liàng | sáng; sáng sủa | Bài 2 · nhóm 1 | hsk4-shang-l2a | – |
| 就是 | jiùshì | (cụm cuối câu) cứ… là được | Bài 2 · nhóm 1 | hsk4-shang-l2a | – |
| 种 | zhǒng | trồng | Bài 2 · nhóm 2 | hsk4-shang-l2a | – |
| 周围 | zhōuwéi | xung quanh | Bài 2 · nhóm 2 | hsk4-shang-l2a | ✓ (hsk4-shang-l2a) |
| 不过 | búguò | nhưng, tuy nhiên (nhẹ nhàng) | Bài 2 · nhóm 2 | hsk4-shang-l2a | – |
| 毕业 | bìyè | tốt nghiệp | Bài 2 · nhóm 2 | hsk4-shang-l2a | – |
| 恐怕 | kǒngpà | e rằng, sợ rằng | Bài 2 · nhóm 2 | hsk4-shang-l2a | – |
| 热闹 | rènao | náo nhiệt, nhộn nhịp | Bài 2 · nhóm 2 | hsk4-shang-l2a | ✓ (hsk4-shang-l2a) |
| 入住 | rùzhù | dọn vào ở, vào ở | Bài 2 · nhóm 2 | hsk4-shang-l2a | – |
| 日记 | rìjì | nhật ký | Bài 2 · nhóm 3 | hsk4-shang-l2b | ✓ (hsk4-shang-l2b) |
| 顺利 | shùnlì | thuận lợi, suôn sẻ | Bài 2 · nhóm 3 | hsk4-shang-l2b | – |
| 并 | bìng | và, đồng thời; (trước phủ định) hoàn toàn | Bài 2 · nhóm 3 | hsk4-shang-l2b | – |
| 客厅 | kètīng | phòng khách | Bài 2 · nhóm 3 | hsk4-shang-l2b | ✓ (hsk4-shang-l2b) |
| 台 | tái | (lượng từ) chiếc — dùng cho máy móc, thiết bị | Bài 2 · nhóm 3 | hsk4-shang-l2b | – |
| 厨房 | chúfáng | nhà bếp | Bài 2 · nhóm 3 | hsk4-shang-l2b | – |
| 平常 | píngcháng | ngày thường; bình thường | Bài 2 · nhóm 3 | hsk4-shang-l2b | – |
| 基本上 | jīběnshàng | về cơ bản, cơ bản là | Bài 2 · nhóm 3 | hsk4-shang-l2b | – |
| 整个 | zhěnggè | toàn bộ, cả (một đơn vị) | Bài 2 · nhóm 3 | hsk4-shang-l2b | ✓ (hsk4-shang-l2b) |
| 毛巾 | máojīn | khăn mặt, khăn tắm | Bài 2 · nhóm 3 | hsk4-shang-l2b | – |
| 建议 | jiànyì | kiến nghị, đề xuất; lời khuyên | Bài 2 · nhóm 4 | hsk4-shang-l2b | ✓ (hsk4-shang-l2b) |
| 查看 | chákàn | kiểm tra, xem xét | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 信息 | xìnxī | thông tin | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 查找 | cházhǎo | tra cứu, tìm kiếm | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 接着 | jiēzhe | tiếp theo, sau đó; tiếp tục | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 同时 | tóngshí | đồng thời; cùng lúc đó | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 位置 | wèizhì | vị trí | Bài 2 · nhóm 4 | hsk4-shang-l2b | ✓ (hsk4-shang-l2b) |
| 价格 | jiàgé | giá cả | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 理想 | lǐxiǎng | lý tưởng; lý tưởng (điều mơ ước) | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 由于 | yóuyú | do, bởi vì, nhờ | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 工资 | gōngzī | tiền lương | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 感 | gǎn | cảm giác (hậu tố: 幸福感， 安全感…) | Bài 2 · nhóm 4 | hsk4-shang-l2b | – |
| 十字路口 | shízì lùkǒu | ngã tư, giao lộ | Bài 3 · nhóm 1 | hsk4-shang-l3a | ✓ (hsk4-shang-l3a) |
| 直接 | zhíjiē | trực tiếp; thẳng luôn | Bài 3 · nhóm 1 | hsk4-shang-l3a | – |
| 转 | zhuǎn | rẽ, quay, chuyển | Bài 3 · nhóm 1 | hsk4-shang-l3a | ✓ (hsk4-shang-l3a) |
| 正好 | zhènghǎo | vừa khéo, vừa đúng lúc | Bài 3 · nhóm 1 | hsk4-shang-l3a | – |
| 熟悉 | shúxī | quen thuộc, biết rõ | Bài 3 · nhóm 1 | hsk4-shang-l3a | ✓ (hsk4-shang-l3a) |
| 正 | zhèng | đúng hướng, thẳng (chính: chính nam, chính bắc) | Bài 3 · nhóm 1 | hsk4-shang-l3a | – |
| 目的地 | mùdìdì | điểm đến, đích đến | Bài 3 · nhóm 1 | hsk4-shang-l3a | – |
| 下载 | xiàzài | tải xuống | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 进行 | jìnxíng | tiến hành | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 支付 | zhīfù | thanh toán, trả tiền | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 软件 | ruǎnjiàn | phần mềm, ứng dụng | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 不仅 | bùjǐn | không chỉ, không những | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 扫码 | sǎomǎ | quét mã (QR) | Bài 3 · nhóm 2 | hsk4-shang-l3a | ✓ (hsk4-shang-l3a) |
| 结账 | jiézhàng | thanh toán, tính tiền | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 购物 | gòuwù | mua sắm | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 订 | dìng | đặt (hàng, vé, phòng…) | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 快递 | kuàidì | chuyển phát nhanh; hàng chuyển phát | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 微信 | Wēixìn | WeChat (ứng dụng nhắn tin, thanh toán) | Bài 3 · nhóm 2 | hsk4-shang-l3a | – |
| 支付宝 | Zhīfùbǎo | Alipay (ví điện tử thanh toán) | Bài 3 · nhóm 2 | hsk4-shang-l3a | ✓ (hsk4-shang-l3a) |
| 现金 | xiànjīn | tiền mặt | Bài 3 · nhóm 3 | hsk4-shang-l3b | ✓ (hsk4-shang-l3b) |
| 网购 | wǎnggòu | mua sắm trên mạng | Bài 3 · nhóm 3 | hsk4-shang-l3b | ✓ (hsk4-shang-l3b) |
| 寄 | jì | gửi (thư, bưu phẩm) | Bài 3 · nhóm 3 | hsk4-shang-l3b | – |
| 等 | děng | vân vân, các thứ (liệt kê) | Bài 3 · nhóm 3 | hsk4-shang-l3b | – |
| 货 | huò | hàng hóa | Bài 3 · nhóm 3 | hsk4-shang-l3b | – |
| 甚至 | shènzhì | thậm chí | Bài 3 · nhóm 3 | hsk4-shang-l3b | – |
| 改变 | gǎibiàn | thay đổi; làm thay đổi | Bài 3 · nhóm 3 | hsk4-shang-l3b | ✓ (hsk4-shang-l3b) |
| 手指 | shǒuzhǐ | ngón tay | Bài 3 · nhóm 3 | hsk4-shang-l3b | – |
| 乱 | luàn | lung tung, bừa bãi; loạn | Bài 3 · nhóm 3 | hsk4-shang-l3b | – |
| 管 | guǎn | đừng bận tâm, đừng để ý (khẩu ngữ: 别管） | Bài 3 · nhóm 3 | hsk4-shang-l3b | – |
| 提供 | tígōng | cung cấp | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 身份证 | shēnfènzhèng | chứng minh thư, căn cước | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 个人 | gèrén | cá nhân | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 能否 | néngfǒu | có thể… hay không (văn viết) | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 保护 | bǎohù | bảo vệ | Bài 3 · nhóm 4 | hsk4-shang-l3b | ✓ (hsk4-shang-l3b) |
| 于是 | yúshì | thế là, do đó | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 密码 | mìmǎ | mật khẩu | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 随便 | suíbiàn | tùy tiện, sao cũng được; tùy ý | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 技术 | jìshù | kỹ thuật, công nghệ | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 法律 | fǎlǜ | pháp luật | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 手段 | shǒuduàn | thủ đoạn, biện pháp, cách thức | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 保证 | bǎozhèng | đảm bảo, cam đoan | Bài 3 · nhóm 4 | hsk4-shang-l3b | – |
| 网络 | wǎngluò | mạng (internet) | Bài 3 · nhóm 4 | hsk4-shang-l3b | ✓ (hsk4-shang-l3b) |
| 啊 | ā | à (thán từ: ngạc nhiên, chợt hiểu) | Bài 4 · nhóm 1 | hsk4-shang-l4a | – |
| 停 | tíng | đỗ, dừng (xe) | Bài 4 · nhóm 1 | hsk4-shang-l4a | – |
| 交 | jiāo | giao, nộp | Bài 4 · nhóm 1 | hsk4-shang-l4a | – |
| 费 | fèi | phí, chi phí; tốn (công, sức) | Bài 4 · nhóm 1 | hsk4-shang-l4a | – |
| 信号 | xìnhào | tín hiệu, sóng | Bài 4 · nhóm 1 | hsk4-shang-l4a | – |
| 感谢 | gǎnxiè | cảm ơn, biết ơn | Bài 4 · nhóm 1 | hsk4-shang-l4a | ✓ (hsk4-shang-l4a) |
| 联系 | liánxì | liên lạc, liên hệ | Bài 4 · nhóm 1 | hsk4-shang-l4a | ✓ (hsk4-shang-l4a) |
| 方式 | fāngshì | cách thức, phương thức | Bài 4 · nhóm 1 | hsk4-shang-l4a | – |
| 客气 | kèqi | khách sáo, lịch sự | Bài 4 · nhóm 1 | hsk4-shang-l4a | ✓ (hsk4-shang-l4a) |
| 剩 | shèng | thừa, còn lại | Bài 4 · nhóm 2 | hsk4-shang-l4a | – |
| 提 | tí | xách, cầm (nâng lên) | Bài 4 · nhóm 2 | hsk4-shang-l4a | – |
| 袋子 | dàizi | túi, bao | Bài 4 · nhóm 2 | hsk4-shang-l4a | – |
| 重 | zhòng | nặng | Bài 4 · nhóm 2 | hsk4-shang-l4a | – |
| 算 | suàn | tính, tính toán | Bài 4 · nhóm 2 | hsk4-shang-l4a | – |
| 再说 | zàishuō | hơn nữa, với lại | Bài 4 · nhóm 2 | hsk4-shang-l4a | – |
| 之间 | zhījiān | giữa, trong khoảng (hai điểm/người) | Bài 4 · nhóm 2 | hsk4-shang-l4a | – |
| 互相 | hùxiāng | lẫn nhau, qua lại | Bài 4 · nhóm 2 | hsk4-shang-l4a | ✓ (hsk4-shang-l4a) |
| 辛苦 | xīnkǔ | vất vả; (lời cảm ơn) bạn vất vả rồi | Bài 4 · nhóm 2 | hsk4-shang-l4a | ✓ (hsk4-shang-l4a) |
| 出行 | chūxíng | đi lại, ra ngoài đi xa | Bài 4 · nhóm 3 | hsk4-shang-l4b | ✓ (hsk4-shang-l4b) |
| 距离 | jùlí | khoảng cách; cách (xa) | Bài 4 · nhóm 3 | hsk4-shang-l4b | – |
| 往往 | wǎngwǎng | thường thường, hay (theo quy luật) | Bài 4 · nhóm 3 | hsk4-shang-l4b | – |
| 既 | jì | vừa (trong mẫu 既…又…: vừa… vừa…) | Bài 4 · nhóm 3 | hsk4-shang-l4b | – |
| 电动车 | diàndòngchē | xe điện | Bài 4 · nhóm 3 | hsk4-shang-l4b | ✓ (hsk4-shang-l4b) |
| 速度 | sùdù | tốc độ | Bài 4 · nhóm 3 | hsk4-shang-l4b | ✓ (hsk4-shang-l4b) |
| 充电 | chōngdiàn | sạc điện | Bài 4 · nhóm 3 | hsk4-shang-l4b | – |
| 流行 | liúxíng | thịnh hành, được ưa chuộng | Bài 4 · nhóm 3 | hsk4-shang-l4b | – |
| 省 | shěng | tiết kiệm; tỉnh (đơn vị hành chính) | Bài 4 · nhóm 3 | hsk4-shang-l4b | – |
| 力气 | lìqi | sức lực | Bài 4 · nhóm 3 | hsk4-shang-l4b | – |
| 乘客 | chéngkè | hành khách | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 购买 | gòumǎi | mua (trang trọng hơn 买） | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 食物 | shíwù | thức ăn, thực phẩm | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 免费 | miǎnfèi | miễn phí | Bài 4 · nhóm 4 | hsk4-shang-l4b | ✓ (hsk4-shang-l4b) |
| 早餐 | zǎocān | bữa sáng | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 来得及 | láidejí | kịp, còn đủ thời gian | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 鲜花 | xiānhuā | hoa tươi | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 顺便 | shùnbiàn | nhân tiện, tiện thể | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 心情 | xīnqíng | tâm trạng | Bài 4 · nhóm 4 | hsk4-shang-l4b | ✓ (hsk4-shang-l4b) |
| 更加 | gèngjiā | càng… hơn, càng thêm | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 愉快 | yúkuài | vui vẻ, thoải mái | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 来不及 | láibùjí | không kịp, không đủ thời gian | Bài 4 · nhóm 4 | hsk4-shang-l4b | – |
| 至少 | zhìshǎo | ít nhất, tối thiểu | Bài 5 · nhóm 1 | hsk4-shang-l5a | – |
| 中餐 | zhōngcān | món ăn Trung Quốc, cơm Tàu | Bài 5 · nhóm 1 | hsk4-shang-l5a | ✓ (hsk4-shang-l5a) |
| 专门 | zhuānmén | chuyên, riêng, đặc biệt (cho việc gì) | Bài 5 · nhóm 1 | hsk4-shang-l5a | – |
| 煮 | zhǔ | luộc, nấu (trong nước) | Bài 5 · nhóm 1 | hsk4-shang-l5a | – |
| 油 | yóu | dầu (ăn) | Bài 5 · nhóm 1 | hsk4-shang-l5a | – |
| 道 | dào | (lượng từ) món — dùng cho món ăn trong bữa | Bài 5 · nhóm 1 | hsk4-shang-l5a | ✓ (hsk4-shang-l5a) |
| 熟 | shú/shóu | chín (đã nấu chín); quen thuộc | Bài 5 · nhóm 1 | hsk4-shang-l5a | – |
| 倒 | dào | rót, đổ | Bài 5 · nhóm 1 | hsk4-shang-l5a | – |
| 辣椒 | làjiāo | ớt | Bài 5 · nhóm 1 | hsk4-shang-l5a | – |
| 辣 | là | cay | Bài 5 · nhóm 1 | hsk4-shang-l5a | ✓ (hsk4-shang-l5a) |
| 水煮鱼 | Shuǐzhǔyú | cá luộc cay kiểu Tứ Xuyên | Bài 5 · nhóm 1 | hsk4-shang-l5a | – |
| 敢 | gǎn | dám | Bài 5 · nhóm 2 | hsk4-shang-l5a | ✓ (hsk4-shang-l5a) |
| 肚子 | dùzi | bụng | Bài 5 · nhóm 2 | hsk4-shang-l5a | – |
| 相同 | xiāngtóng | giống nhau, như nhau | Bài 5 · nhóm 2 | hsk4-shang-l5a | – |
| 顺序 | shùnxù | thứ tự, trình tự | Bài 5 · nhóm 2 | hsk4-shang-l5a | – |
| 够 | gòu | đủ | Bài 5 · nhóm 2 | hsk4-shang-l5a | ✓ (hsk4-shang-l5a) |
| 不够 | búgòu | không đủ | Bài 5 · nhóm 2 | hsk4-shang-l5a | – |
| 达到 | dádào | đạt đến, đạt được | Bài 5 · nhóm 2 | hsk4-shang-l5a | – |
| 聚 | jù | tụ tập, tụ họp | Bài 5 · nhóm 3 | hsk4-shang-l5b | ✓ (hsk4-shang-l5b) |
| 午餐 | wǔcān | bữa trưa | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 咸 | xián | mặn | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 凉 | liáng | nguội, mát lạnh | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 付 | fù | trả (tiền), thanh toán | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 各 | gè | mỗi (người/vật một phần riêng) | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 聚餐 | jùcān | ăn uống tụ tập, liên hoan | Bài 5 · nhóm 3 | hsk4-shang-l5b | ✓ (hsk4-shang-l5b) |
| 酸 | suān | chua | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 汤 | tāng | canh, súp | Bài 5 · nhóm 3 | hsk4-shang-l5b | ✓ (hsk4-shang-l5b) |
| 贵州 | Guìzhōu | Quý Châu (tỉnh của Trung Quốc) | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 红烧羊肉 | Hóngshāo Yángròu | thịt dê kho (hồng thiêu) | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 辣子鸡 | Làzǐjī | gà xào ớt (món Tứ Xuyên) | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 松鼠鳜鱼 | Sōngshǔ Guìyú | cá quế hình sóc (món Tô Châu chua ngọt) | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 酸汤米线 | Suāntāng Mǐxiàn | bún canh chua (đặc sản Quý Châu) | Bài 5 · nhóm 3 | hsk4-shang-l5b | – |
| 安排 | ānpái | sắp xếp, bố trí | Bài 5 · nhóm 4 | hsk4-shang-l5b | ✓ (hsk4-shang-l5b) |
| 按照 | ànzhào | theo, căn cứ theo | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 等 | děng | như, chẳng hạn (liệt kê: …等） | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 面对 | miànduì | đối mặt, đối diện | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 年龄 | niánlíng | tuổi, độ tuổi | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 普通 | pǔtōng | thông thường, bình thường | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 随意 | suíyì | tùy ý, thoải mái, không câu nệ | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 正式 | zhèngshì | chính thức, trang trọng | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 重视 | zhòngshì | coi trọng, xem trọng | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 主人 | zhǔrén | chủ nhà, chủ bữa tiệc | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 尊重 | zūnzhòng | tôn trọng | Bài 5 · nhóm 4 | hsk4-shang-l5b | ✓ (hsk4-shang-l5b) |
| 座位 | zuòwèi | chỗ ngồi, ghế | Bài 5 · nhóm 4 | hsk4-shang-l5b | – |
| 咳嗽 | késou | ho | Bài 6 · nhóm 1 | hsk4-shang-l6a | ✓ (hsk4-shang-l6a) |
| 咳 | ké | ho (đơn âm tiết của 咳嗽） | Bài 6 · nhóm 1 | hsk4-shang-l6a | – |
| 厉害 | lìhai | dữ dội, ghê gớm; lợi hại | Bài 6 · nhóm 1 | hsk4-shang-l6a | ✓ (hsk4-shang-l6a) |
| 严重 | yánzhòng | nghiêm trọng | Bài 6 · nhóm 1 | hsk4-shang-l6a | – |
| 赶快 | gǎnkuài | mau, nhanh chóng | Bài 6 · nhóm 1 | hsk4-shang-l6a | – |
| 陪 | péi | đi cùng, ở bên cùng | Bài 6 · nhóm 1 | hsk4-shang-l6a | ✓ (hsk4-shang-l6a) |
| 翻译 | fānyì | phiên dịch; người phiên dịch | Bài 6 · nhóm 1 | hsk4-shang-l6a | – |
| 护士 | hùshi | y tá, điều dưỡng | Bài 6 · nhóm 2 | hsk4-shang-l6a | ✓ (hsk4-shang-l6a) |
| 表 | biǎo | bảng, biểu mẫu; đồng hồ | Bài 6 · nhóm 2 | hsk4-shang-l6a | – |
| 性别 | xìngbié | giới tính | Bài 6 · nhóm 2 | hsk4-shang-l6a | – |
| 国籍 | guójí | quốc tịch | Bài 6 · nhóm 2 | hsk4-shang-l6a | – |
| 家庭 | jiātíng | gia đình | Bài 6 · nhóm 2 | hsk4-shang-l6a | – |
| 地址 | dìzhǐ | địa chỉ | Bài 6 · nhóm 2 | hsk4-shang-l6a | – |
| 挂号 | guàhào | đăng ký khám, lấy số (khám bệnh) | Bài 6 · nhóm 2 | hsk4-shang-l6a | – |
| 排队 | páiduì | xếp hàng | Bài 6 · nhóm 2 | hsk4-shang-l6a | ✓ (hsk4-shang-l6a) |
| 大厅 | dàtīng | sảnh lớn, đại sảnh | Bài 6 · nhóm 2 | hsk4-shang-l6a | – |
| 偶尔 | ǒu'ěr | thỉnh thoảng, hiếm khi | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 身 | shēn | thân thể; (lượng từ) bộ — dùng cho quần áo cả bộ | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 结果 | jiéguǒ | kết quả; (liên từ) kết quả là | Bài 6 · nhóm 3 | hsk4-shang-l6b | ✓ (hsk4-shang-l6b) |
| 性 | xìng | tính, …tính (hậu tố: 可能性， 重要性…) | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 体温 | tǐwēn | thân nhiệt, nhiệt độ cơ thể | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 降 | jiàng | hạ xuống, giảm xuống | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 光 | guāng | ánh sáng; chỉ, mỗi (phó từ) | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 打针 | dǎzhēn | tiêm (thuốc) | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 有效 | yǒuxiào | có hiệu quả | Bài 6 · nhóm 3 | hsk4-shang-l6b | ✓ (hsk4-shang-l6b) |
| 按时 | ànshí | đúng giờ, theo đúng lịch | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 汗 | hàn | mồ hôi | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 醒 | xǐng | tỉnh dậy, tỉnh giấc | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 感觉 | gǎnjué | cảm giác; cảm thấy | Bài 6 · nhóm 3 | hsk4-shang-l6b | ✓ (hsk4-shang-l6b) |
| 低 | dī | thấp | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 难受 | nánshòu | khó chịu, mệt (trong người) | Bài 6 · nhóm 3 | hsk4-shang-l6b | – |
| 通 | tōng | thông (suốt); gọi (điện) được | Bài 6 · nhóm 4 | hsk4-shang-l6b | – |
| 过程 | guòchéng | quá trình | Bài 6 · nhóm 4 | hsk4-shang-l6b | – |
| 部 | bù | bộ phận, phần; bộ (cơ quan) | Bài 6 · nhóm 4 | hsk4-shang-l6b | – |
| 收费 | shōufèi | thu phí, thu tiền | Bài 6 · nhóm 4 | hsk4-shang-l6b | – |
| 情况 | qíngkuàng | tình hình, tình trạng | Bài 6 · nhóm 4 | hsk4-shang-l6b | ✓ (hsk4-shang-l6b) |
| 好 | hǎo | để, sao cho (chỉ mục đích); khỏi (bệnh) | Bài 6 · nhóm 4 | hsk4-shang-l6b | – |
| 治疗 | zhìliáo | điều trị, chữa trị | Bài 6 · nhóm 4 | hsk4-shang-l6b | ✓ (hsk4-shang-l6b) |
| 步 | bù | bước chân | Bài 6 · nhóm 4 | hsk4-shang-l6b | – |
| 打扰 | dǎrǎo | làm phiền, quấy rầy | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 市场 | shìchǎng | thị trường | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 调查 | diàochá | điều tra, khảo sát | Bài 7 · nhóm 1 | hsk4-shang-l7a | ✓ (hsk4-shang-l7a) |
| 计划 | jìhuà | kế hoạch; lên kế hoạch | Bài 7 · nhóm 1 | hsk4-shang-l7a | ✓ (hsk4-shang-l7a) |
| 内容 | nèiróng | nội dung | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 改 | gǎi | sửa, thay đổi | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 细心 | xìxīn | tỉ mỉ, cẩn thận | Bài 7 · nhóm 1 | hsk4-shang-l7a | ✓ (hsk4-shang-l7a) |
| 客户 | kèhù | khách hàng | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 真正 | zhēnzhèng | thật sự, thực sự | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 想法 | xiǎngfǎ | suy nghĩ, ý tưởng | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 任务 | rènwù | nhiệm vụ | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 及时 | jíshí | kịp thời, đúng lúc | Bài 7 · nhóm 1 | hsk4-shang-l7a | – |
| 出差 | chūchāi | đi công tác | Bài 7 · nhóm 2 | hsk4-shang-l7a | – |
| 经验 | jīngyàn | kinh nghiệm | Bài 7 · nhóm 2 | hsk4-shang-l7a | ✓ (hsk4-shang-l7a) |
| 采访 | cǎifǎng | phỏng vấn | Bài 7 · nhóm 2 | hsk4-shang-l7a | ✓ (hsk4-shang-l7a) |
| 产品 | chǎnpǐn | sản phẩm | Bài 7 · nhóm 2 | hsk4-shang-l7a | – |
| 看法 | kànfǎ | quan điểm, cách nhìn | Bài 7 · nhóm 2 | hsk4-shang-l7a | – |
| 提前 | tíqián | sớm hơn, trước thời hạn | Bài 7 · nhóm 2 | hsk4-shang-l7a | – |
| 便于 | biànyú | thuận tiện cho, dễ dàng cho | Bài 7 · nhóm 2 | hsk4-shang-l7a | – |
| 既然 | jìrán | đã… thì… (tiền đề đã rõ) | Bài 7 · nhóm 2 | hsk4-shang-l7a | – |
| 谈 | tán | nói chuyện, bàn bạc | Bài 7 · nhóm 3 | hsk4-shang-l7b | ✓ (hsk4-shang-l7b) |
| 笔 | bǐ | (lượng từ) khoản — dùng cho tiền, giao dịch: 一笔钱 | Bài 7 · nhóm 3 | hsk4-shang-l7b | – |
| 生意 | shēngyi | việc buôn bán, kinh doanh | Bài 7 · nhóm 3 | hsk4-shang-l7b | – |
| 困难 | kùnnan | khó khăn | Bài 7 · nhóm 3 | hsk4-shang-l7b | ✓ (hsk4-shang-l7b) |
| 优点 | yōudiǎn | ưu điểm | Bài 7 · nhóm 3 | hsk4-shang-l7b | – |
| 缺点 | quēdiǎn | nhược điểm, khuyết điểm | Bài 7 · nhóm 3 | hsk4-shang-l7b | – |
| 实际 | shíjì | thực tế; thực tế (điều có thật) | Bài 7 · nhóm 3 | hsk4-shang-l7b | – |
| 效果 | xiàoguǒ | hiệu quả, kết quả | Bài 7 · nhóm 3 | hsk4-shang-l7b | ✓ (hsk4-shang-l7b) |
| 点 | diǎn | điểm, ý (khía cạnh: 这一点） | Bài 7 · nhóm 3 | hsk4-shang-l7b | – |
| 一下 | yíxià | một chút, một lát (sau động từ) | Bài 7 · nhóm 3 | hsk4-shang-l7b | – |
| 份 | fèn | (lượng từ) phần, bản, suất | Bài 7 · nhóm 4 | hsk4-shang-l7b | – |
| 积累 | jīlěi | tích lũy, gom góp dần | Bài 7 · nhóm 4 | hsk4-shang-l7b | ✓ (hsk4-shang-l7b) |
| 使 | shǐ | khiến, làm cho | Bài 7 · nhóm 4 | hsk4-shang-l7b | – |
| 进入 | jìnrù | đi vào, bước vào | Bài 7 · nhóm 4 | hsk4-shang-l7b | – |
| 社会 | shèhuì | xã hội | Bài 7 · nhóm 4 | hsk4-shang-l7b | – |
| 管理 | guǎnlǐ | quản lý | Bài 7 · nhóm 4 | hsk4-shang-l7b | – |
| 基础 | jīchǔ | nền tảng, cơ sở | Bài 7 · nhóm 4 | hsk4-shang-l7b | – |
| 能力 | nénglì | năng lực, khả năng | Bài 7 · nhóm 4 | hsk4-shang-l7b | ✓ (hsk4-shang-l7b) |
| 今后 | jīnhòu | từ nay về sau, sau này | Bài 7 · nhóm 4 | hsk4-shang-l7b | – |
| 紧张 | jǐnzhāng | căng thẳng, hồi hộp | Bài 8 · nhóm 1 | hsk4-shang-l8a | ✓ (hsk4-shang-l8a) |
| 放松 | fàngsōng | thư giãn, thả lỏng | Bài 8 · nhóm 1 | hsk4-shang-l8a | ✓ (hsk4-shang-l8a) |
| 呀 | yā | nha, đấy (thán từ cuối câu) | Bài 8 · nhóm 1 | hsk4-shang-l8a | – |
| 不管 | bùguǎn | dù, bất kể | Bài 8 · nhóm 1 | hsk4-shang-l8a | – |
| 郊区 | jiāoqū | ngoại ô | Bài 8 · nhóm 1 | hsk4-shang-l8a | – |
| 游玩 | yóuwán | đi chơi, tham quan vui chơi | Bài 8 · nhóm 1 | hsk4-shang-l8a | – |
| 主意 | zhǔyi | ý kiến, cách, chủ ý | Bài 8 · nhóm 1 | hsk4-shang-l8a | – |
| 外出 | wàichū | ra ngoài, đi ra ngoài | Bài 8 · nhóm 1 | hsk4-shang-l8a | – |
| 戴 | dài | đội, đeo (mũ, kính, găng…) | Bài 8 · nhóm 1 | hsk4-shang-l8a | – |
| 帽子 | màozi | mũ, nón | Bài 8 · nhóm 1 | hsk4-shang-l8a | – |
| 长城 | Chángchéng | Vạn Lý Trường Thành | Bài 8 · nhóm 1 | hsk4-shang-l8a | ✓ (hsk4-shang-l8a) |
| 项目 | xiàngmù | hạng mục, dự án, môn (thể thao) | Bài 8 · nhóm 2 | hsk4-shang-l8a | – |
| 加班 | jiābān | tăng ca, làm thêm giờ | Bài 8 · nhóm 2 | hsk4-shang-l8a | ✓ (hsk4-shang-l8a) |
| 熬夜 | áoyè | thức khuya, thức đêm | Bài 8 · nhóm 2 | hsk4-shang-l8a | – |
| 否则 | fǒuzé | nếu không thì | Bài 8 · nhóm 2 | hsk4-shang-l8a | – |
| 失去 | shīqù | mất đi, đánh mất | Bài 8 · nhóm 2 | hsk4-shang-l8a | – |
| 值得 | zhídé | đáng, xứng đáng | Bài 8 · nhóm 2 | hsk4-shang-l8a | – |
| 暂停 | zàntíng | tạm dừng | Bài 8 · nhóm 2 | hsk4-shang-l8a | – |
| 之后 | zhīhòu | sau, sau khi | Bài 8 · nhóm 2 | hsk4-shang-l8a | – |
| 风景 | fēngjǐng | phong cảnh | Bài 8 · nhóm 2 | hsk4-shang-l8a | ✓ (hsk4-shang-l8a) |
| 效率 | xiàolǜ | hiệu suất, hiệu quả làm việc | Bài 8 · nhóm 3 | hsk4-shang-l8b | ✓ (hsk4-shang-l8b) |
| 下降 | xiàjiàng | giảm xuống, hạ xuống | Bài 8 · nhóm 3 | hsk4-shang-l8b | – |
| 相比 | xiāngbǐ | so sánh (跟…相比） | Bài 8 · nhóm 3 | hsk4-shang-l8b | – |
| 因此 | yīncǐ | vì vậy, do đó | Bài 8 · nhóm 3 | hsk4-shang-l8b | – |
| 提醒 | tíxǐng | nhắc nhở | Bài 8 · nhóm 3 | hsk4-shang-l8b | – |
| 与 | yǔ | và, với, cùng (văn viết) | Bài 8 · nhóm 3 | hsk4-shang-l8b | – |
| 大自然 | dàzìrán | thiên nhiên, tự nhiên rộng lớn | Bài 8 · nhóm 3 | hsk4-shang-l8b | ✓ (hsk4-shang-l8b) |
| 美丽 | měilì | xinh đẹp, tuyệt đẹp | Bài 8 · nhóm 3 | hsk4-shang-l8b | ✓ (hsk4-shang-l8b) |
| 景色 | jǐngsè | cảnh sắc, cảnh đẹp | Bài 8 · nhóm 3 | hsk4-shang-l8b | – |
| 首都 | shǒudū | thủ đô | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 市区 | shìqū | khu nội thành, trung tâm thành phố | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 眼前 | yǎnqián | ngay trước mắt | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 美景 | měijǐng | cảnh đẹp | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 参观 | cānguān | tham quan, thăm quan | Bài 8 · nhóm 4 | hsk4-shang-l8b | ✓ (hsk4-shang-l8b) |
| 景点 | jǐngdiǎn | điểm tham quan, thắng cảnh | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 交通 | jiāotōng | giao thông | Bài 8 · nhóm 4 | hsk4-shang-l8b | ✓ (hsk4-shang-l8b) |
| 乘坐 | chéngzuò | đi, đón (phương tiện: xe, tàu, máy bay) | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 十分 | shífēn | vô cùng, rất (mức độ cao) | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 实际上 | shíjìshàng | trên thực tế | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 故宫 | Gùgōng | Cố Cung (Tử Cấm Thành, Bắc Kinh) | Bài 8 · nhóm 4 | hsk4-shang-l8b | – |
| 祝 | zhù | chúc, chúc mừng | Bài 9 · nhóm 1 | hsk4-shang-l9a | ✓ (hsk4-shang-l9a) |
| 巧克力 | qiǎokèlì | sô-cô-la | Bài 9 · nhóm 1 | hsk4-shang-l9a | – |
| 感动 | gǎndòng | cảm động | Bài 9 · nhóm 1 | hsk4-shang-l9a | ✓ (hsk4-shang-l9a) |
| 浪漫 | làngmàn | lãng mạn | Bài 9 · nhóm 1 | hsk4-shang-l9a | – |
| 幽默 | yōumò | hài hước, hóm hỉnh | Bài 9 · nhóm 1 | hsk4-shang-l9a | – |
| 耐心 | nàixīn | kiên nhẫn; sự kiên nhẫn | Bài 9 · nhóm 1 | hsk4-shang-l9a | – |
| 吸引 | xīyǐn | hấp dẫn, thu hút | Bài 9 · nhóm 1 | hsk4-shang-l9a | – |
| 当时 | dāngshí | lúc đó, khi đó | Bài 9 · nhóm 1 | hsk4-shang-l9a | – |
| 错过 | cuòguò | bỏ lỡ, lỡ mất | Bài 9 · nhóm 1 | hsk4-shang-l9a | – |
| 幸运 | xìngyùn | may mắn | Bài 9 · nhóm 1 | hsk4-shang-l9a | ✓ (hsk4-shang-l9a) |
| 幸福 | xìngfú | hạnh phúc | Bài 9 · nhóm 2 | hsk4-shang-l9a | ✓ (hsk4-shang-l9a) |
| 尽管 | jǐnguǎn | mặc dù | Bài 9 · nhóm 2 | hsk4-shang-l9a | – |
| 性格 | xìnggé | tính cách, tính nết | Bài 9 · nhóm 2 | hsk4-shang-l9a | – |
| 共同 | gòngtóng | chung, cùng nhau | Bài 9 · nhóm 2 | hsk4-shang-l9a | – |
| 责任 | zérèn | trách nhiệm | Bài 9 · nhóm 2 | hsk4-shang-l9a | – |
| 相互 | xiānghù | lẫn nhau (trang trọng hơn 互相） | Bài 9 · nhóm 2 | hsk4-shang-l9a | – |
| 理解 | lǐjiě | thấu hiểu, hiểu rõ | Bài 9 · nhóm 2 | hsk4-shang-l9a | ✓ (hsk4-shang-l9a) |
| 支持 | zhīchí | ủng hộ, hỗ trợ | Bài 9 · nhóm 2 | hsk4-shang-l9a | – |
| 印象 | yìnxiàng | ấn tượng | Bài 9 · nhóm 3 | hsk4-shang-l9b | ✓ (hsk4-shang-l9b) |
| 实在 | shízài | thật thà, thực sự; thực sự là | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 阳光 | yángguāng | ánh nắng; tươi sáng, lạc quan (tính cách) | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 负责 | fùzé | có trách nhiệm; phụ trách | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 积极 | jījí | tích cực, hăng hái | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 此 | cǐ | này (văn viết: 此次， 此人） | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 从此 | cóngcǐ | từ đó, từ nay trở đi | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 产生 | chǎnshēng | sinh ra, nảy sinh | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 爱情 | àiqíng | tình yêu (nam nữ) | Bài 9 · nhóm 3 | hsk4-shang-l9b | ✓ (hsk4-shang-l9b) |
| 间 | jiān | khoảng, gian (phòng, giữa hai điểm thời gian) | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 友情 | yǒuqíng | tình bạn | Bài 9 · nhóm 3 | hsk4-shang-l9b | ✓ (hsk4-shang-l9b) |
| 美好 | měihǎo | tốt đẹp, tươi đẹp | Bài 9 · nhóm 3 | hsk4-shang-l9b | – |
| 人生 | rénshēng | cuộc đời, nhân sinh | Bài 9 · nhóm 4 | hsk4-shang-l9b | – |
| 精彩 | jīngcǎi | đặc sắc, tuyệt vời | Bài 9 · nhóm 4 | hsk4-shang-l9b | – |
| 感情 | gǎnqíng | tình cảm | Bài 9 · nhóm 4 | hsk4-shang-l9b | ✓ (hsk4-shang-l9b) |
| 深 | shēn | sâu; (màu) đậm, sẫm | Bài 9 · nhóm 4 | hsk4-shang-l9b | – |
| 经营 | jīngyíng | kinh doanh; vun đắp, gìn giữ (tình cảm) | Bài 9 · nhóm 4 | hsk4-shang-l9b | – |
| 对方 | duìfāng | đối phương, người kia | Bài 9 · nhóm 4 | hsk4-shang-l9b | – |
| 感受 | gǎnshòu | cảm nhận, cảm xúc | Bài 9 · nhóm 4 | hsk4-shang-l9b | – |
| 尤其 | yóuqí | nhất là, đặc biệt là | Bài 9 · nhóm 4 | hsk4-shang-l9b | – |
| 日子 | rìzi | ngày tháng, cuộc sống thường ngày | Bài 9 · nhóm 4 | hsk4-shang-l9b | ✓ (hsk4-shang-l9b) |
| 从来 | cónglái | từ trước đến nay, xưa nay | Bài 9 · nhóm 4 | hsk4-shang-l9b | – |
| 小伙子 | xiǎohuǒzi | anh chàng, chàng trai trẻ | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 气温 | qìwēn | nhiệt độ không khí | Bài 10 · nhóm 1 | hsk4-shang-l10a | ✓ (hsk4-shang-l10a) |
| 零下 | líng xià | âm (dưới 0 độ) | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 度 | dù | độ (nhiệt độ, góc…) | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 冻 | dòng | đóng băng; lạnh cóng | Bài 10 · nhóm 1 | hsk4-shang-l10a | ✓ (hsk4-shang-l10a) |
| 后悔 | hòuhuǐ | hối hận | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 就是 | jiùshì | chính là; nhất định (nhấn mạnh) | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 温度 | wēndù | nhiệt độ | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 差别 | chābié | sự khác biệt, chênh lệch | Bài 10 · nhóm 1 | hsk4-shang-l10a | ✓ (hsk4-shang-l10a) |
| 厚 | hòu | dày | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 广州 | Guǎngzhōu | Quảng Châu (thành phố miền Nam TQ) | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 哈尔滨 | Hā'ěrbīn | Cáp Nhĩ Tân (thành phố miền Bắc TQ) | Bài 10 · nhóm 1 | hsk4-shang-l10a | – |
| 寒假 | hánjià | kỳ nghỉ đông | Bài 10 · nhóm 2 | hsk4-shang-l10a | ✓ (hsk4-shang-l10a) |
| 暖和 | nuǎnhuo | ấm áp | Bài 10 · nhóm 2 | hsk4-shang-l10a | – |
| 低于 | dīyú | thấp hơn, dưới (mức) | Bài 10 · nhóm 2 | hsk4-shang-l10a | – |
| 摄氏度 | shèshìdù | độ C (độ bách phân) | Bài 10 · nhóm 2 | hsk4-shang-l10a | – |
| 受不了 | shòubuliǎo | chịu không nổi | Bài 10 · nhóm 2 | hsk4-shang-l10a | ✓ (hsk4-shang-l10a) |
| 举办 | jǔbàn | tổ chức, đăng cai (hoạt động, sự kiện) | Bài 10 · nhóm 2 | hsk4-shang-l10a | – |
| 各种 | gèzhǒng | đủ loại, các loại | Bài 10 · nhóm 2 | hsk4-shang-l10a | – |
| 植物 | zhíwù | thực vật, cây cối | Bài 10 · nhóm 2 | hsk4-shang-l10a | – |
| 公里 | gōnglǐ | ki-lô-mét | Bài 10 · nhóm 3 | hsk4-shang-l10b | – |
| 气候 | qìhòu | khí hậu | Bài 10 · nhóm 3 | hsk4-shang-l10b | ✓ (hsk4-shang-l10b) |
| 而 | ér | còn, mà; và (văn viết, nối đối lập/bổ sung) | Bài 10 · nhóm 3 | hsk4-shang-l10b | – |
| 此外 | cǐwài | ngoài ra | Bài 10 · nhóm 3 | hsk4-shang-l10b | – |
| 方言 | fāngyán | phương ngữ, tiếng địa phương | Bài 10 · nhóm 3 | hsk4-shang-l10b | ✓ (hsk4-shang-l10b) |
| 普通话 | pǔtōnghuà | tiếng phổ thông (quan thoại chuẩn) | Bài 10 · nhóm 3 | hsk4-shang-l10b | – |
| 较 | jiào | hơi, khá; so (văn viết: 较大） | Bài 10 · nhóm 3 | hsk4-shang-l10b | – |
| 使用 | shǐyòng | sử dụng, dùng | Bài 10 · nhóm 3 | hsk4-shang-l10b | – |
| 引起 | yǐnqǐ | gây ra, dẫn đến | Bài 10 · nhóm 3 | hsk4-shang-l10b | – |
| 误会 | wùhuì | hiểu lầm; hiểu lầm (ai) | Bài 10 · nhóm 3 | hsk4-shang-l10b | ✓ (hsk4-shang-l10b) |
| 亲爱 | qīn'ài | thân yêu, yêu quý (kính ngữ thư từ) | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 再次 | zàicì | một lần nữa, lần thứ hai | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 开展 | kāizhǎn | triển khai, phát động (hoạt động) | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 绿色 | lǜsè | màu xanh lá; xanh (thân thiện môi trường) | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 环保 | huánbǎo | bảo vệ môi trường | Bài 10 · nhóm 4 | hsk4-shang-l10b | ✓ (hsk4-shang-l10b) |
| 拒绝 | jùjué | từ chối, khước từ | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 浪费 | làngfèi | lãng phí; lãng phí (đồ vật, thời gian) | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 节约 | jiéyuē | tiết kiệm | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 资源 | zīyuán | tài nguyên, nguồn lực | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 光 | guāng | sáng, bóng loáng; trơ trụi, sạch nhẵn | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 垃圾 | lājī | rác | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 分类 | fēnlèi | phân loại | Bài 10 · nhóm 4 | hsk4-shang-l10b | ✓ (hsk4-shang-l10b) |
| 日常 | rìcháng | hằng ngày, thường ngày | Bài 10 · nhóm 4 | hsk4-shang-l10b | – |
| 老年 | lǎonián | tuổi già | Bài 11 · nhóm 1 | hsk4-xia-l11a | ✓ (hsk4-xia-l11a) |
| 散步 | sànbù | đi dạo, tản bộ | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 丰富 | fēngfù | phong phú | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 羡慕 | xiànmù | ngưỡng mộ | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 即使 | jíshǐ | cho dù, dù cho | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 活 | huó | sống; sinh động; công việc | Bài 11 · nhóm 1 | hsk4-xia-l11a | ✓ (hsk4-xia-l11a) |
| 继续 | jìxù | tiếp tục | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 网友 | wǎngyǒu | bạn trên mạng | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 无聊 | wúliáo | nhàm chán, buồn tẻ | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 数字 | shùzì | kỹ thuật số; con số | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 点名 | diǎnmíng | điểm danh | Bài 11 · nhóm 1 | hsk4-xia-l11a | ✓ (hsk4-xia-l11a) |
| 教授 | jiàoshòu | giáo sư | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 线上 | xiànshàng | trực tuyến, trên mạng (online) | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 线下 | xiànxià | trực tiếp, ngoại tuyến (offline) | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 视频 | shìpín | video | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 记录 | jìlù | bản ghi, đoạn ghi lại | Bài 11 · nhóm 1 | hsk4-xia-l11a | ✓ (hsk4-xia-l11a) |
| 资料 | zīliào | tài liệu, tư liệu | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 自学 | zìxué | tự học | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 口语 | kǒuyǔ | khẩu ngữ, khả năng nói | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 科技 | kējì | khoa học kỹ thuật, công nghệ | Bài 11 · nhóm 1 | hsk4-xia-l11a | – |
| 获取 | huòqǔ | thu được, tiếp cận được | Bài 11 · nhóm 1 | hsk4-xia-l11a | ✓ (hsk4-xia-l11a) |
| 礼貌 | lǐmào | lễ phép, sự lịch sự | Bài 11 · nhóm 1 | hsk4-xia-l11b | ✓ (hsk4-xia-l11b) |
| 打招呼 | dǎ zhāohu | chào hỏi | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 家长 | jiāzhǎng | phụ huynh | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 成功 | chénggōng | thành công | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 分数 | fēnshù | điểm số | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 目的 | mùdì | mục đích | Bài 11 · nhóm 1 | hsk4-xia-l11b | ✓ (hsk4-xia-l11b) |
| 养成 | yǎngchéng | hình thành, rèn thành (thói quen) | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 留 | liú | dành ra, để lại; ở lại | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 做法 | zuòfǎ | cách làm | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 棒 | bàng | tuyệt vời, giỏi lắm | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 一生 | yìshēng | cả đời, suốt đời | Bài 11 · nhóm 1 | hsk4-xia-l11b | ✓ (hsk4-xia-l11b) |
| 快速 | kuàisù | nhanh chóng, tốc độ cao | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 优秀 | yōuxiù | xuất sắc, ưu tú | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 律师 | lǜshī | luật sư | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 仍 | réng | vẫn, vẫn còn | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 准时 | zhǔnshí | đúng giờ | Bài 11 · nhóm 1 | hsk4-xia-l11b | ✓ (hsk4-xia-l11b) |
| 网页 | wǎngyè | trang web | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 弹 | tán | chơi, gảy (nhạc cụ dây/phím) | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 钢琴 | gāngqín | đàn piano | Bài 11 · nhóm 1 | hsk4-xia-l11b | – |
| 重新 | chóngxīn | lại từ đầu, một lần nữa | Bài 11 · nhóm 1 | hsk4-xia-l11b | ✓ (hsk4-xia-l11b) |
| 毛衣 | máoyī | áo len | Bài 12 · nhóm 1 | hsk4-xia-l12a | ✓ (hsk4-xia-l12a) |
| 样子 | yàngzi | kiểu dáng, mẫu mã | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 适合 | shìhé | phù hợp, thích hợp | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 售货员 | shòuhuòyuán | nhân viên bán hàng | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 质量 | zhìliàng | chất lượng | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 强 | qiáng | hơn, tốt hơn; mạnh | Bài 12 · nhóm 1 | hsk4-xia-l12a | ✓ (hsk4-xia-l12a) |
| 年底 | niándǐ | cuối năm | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 全 | quán | toàn bộ, tất cả; hoàn toàn | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 打折 | dǎzhé | giảm giá, chiết khấu | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 值 | zhí | đáng (giá), xứng đáng | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 估计 | gūjì | đoán chừng, ước lượng | Bài 12 · nhóm 1 | hsk4-xia-l12a | ✓ (hsk4-xia-l12a) |
| 期 | qī | kỳ, đợt (cho sự việc tổ chức theo kỳ) | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 听力 | tīnglì | thính lực, khả năng nghe | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 烦 | fán | bực bội, khó chịu; làm phiền | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 脱 | tuō | cởi (quần áo, giày) | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 挂 | guà | treo, móc | Bài 12 · nhóm 1 | hsk4-xia-l12a | ✓ (hsk4-xia-l12a) |
| 脾气 | píqi | tính khí, tính nóng nảy （发脾气： nổi giận) | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 伤心 | shāngxīn | đau lòng, buồn bã | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 批评 | pīpíng | phê bình | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 道歉 | dàoqiàn | xin lỗi | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 老家 | lǎojiā | quê nhà, quê gốc | Bài 12 · nhóm 1 | hsk4-xia-l12a | – |
| 自 | zì | từ, kể từ | Bài 12 · nhóm 1 | hsk4-xia-l12a | ✓ (hsk4-xia-l12a) |
| 父母 | fùmǔ | cha mẹ | Bài 12 · nhóm 1 | hsk4-xia-l12b | ✓ (hsk4-xia-l12b) |
| 父子 | fùzǐ | cha và con | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 母子 | mǔzǐ | mẹ và con | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 无论 | wúlùn | bất luận, dù cho | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 条件 | tiáojiàn | điều kiện | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 允许 | yǔnxǔ | cho phép | Bài 12 · nhóm 1 | hsk4-xia-l12b | ✓ (hsk4-xia-l12b) |
| 另外 | lìngwài | ngoài ra; (cái) khác; riêng ra | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 卫生 | wèishēng | vệ sinh; hợp vệ sinh | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 母亲 | mǔqīn | mẹ | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 待 | dāi | ở, nán lại | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 将 | jiāng | (trang trọng, dùng như 把） | Bài 12 · nhóm 1 | hsk4-xia-l12b | ✓ (hsk4-xia-l12b) |
| 闻 | wén | ngửi | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 味道 | wèidào | mùi; hương vị | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 冷静 | lěngjìng | bình tĩnh, điềm tĩnh | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 鼻子 | bízi | mũi | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 父亲 | fùqīn | cha | Bài 12 · nhóm 1 | hsk4-xia-l12b | ✓ (hsk4-xia-l12b) |
| 城 | chéng | thành phố | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 鲜 | xiān | tươi ngon, đậm vị (món ăn) | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 暖 | nuǎn | ấm áp | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 勇敢 | yǒnggǎn | dũng cảm | Bài 12 · nhóm 1 | hsk4-xia-l12b | – |
| 商量 | shāngliang | bàn bạc, thương lượng | Bài 12 · nhóm 1 | hsk4-xia-l12b | ✓ (hsk4-xia-l12b) |
| 熊 | xióng | con gấu | Bài 13 · nhóm 1 | hsk4-xia-l13a | ✓ (hsk4-xia-l13a) |
| 老虎 | lǎohǔ | con hổ | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 喊 | hǎn | hét, kêu to, gọi to | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 级 | jí | cấp, bậc (dùng cho cấp độ, bậc hạng) | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 树林 | shùlín | rừng cây | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 景区 | jǐngqū | khu danh lam thắng cảnh, khu tham quan | Bài 13 · nhóm 1 | hsk4-xia-l13a | ✓ (hsk4-xia-l13a) |
| 区 | qū | khu, khu vực | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 美 | měi | đẹp | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 节假日 | jiéjiàrì | ngày lễ tết và ngày nghỉ | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 千万 | qiānwàn | nhất thiết phải, nhất định (lời dặn dò) | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 开玩笑 | kāi wánxiào | nói đùa, đùa giỡn | Bài 13 · nhóm 1 | hsk4-xia-l13a | ✓ (hsk4-xia-l13a) |
| 月饼 | yuèbǐng | bánh trung thu | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 葡萄 | pútao | quả nho | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 香 | xiāng | thơm | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 街道 | jiēdào | đường phố | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 剧院 | jùyuàn | nhà hát, rạp hát | Bài 13 · nhóm 1 | hsk4-xia-l13a | ✓ (hsk4-xia-l13a) |
| 演出 | yǎnchū | biểu diễn | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 赶 | gǎn | kịp lúc gặp đúng, rơi đúng vào (thời điểm) | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 巧 | qiǎo | khéo, trùng hợp | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 之中 | zhīzhōng | ở trong, trong số (những người/việc nào đó) | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 铁路 | tiělù | đường sắt | Bài 13 · nhóm 1 | hsk4-xia-l13a | – |
| 人员 | rényuán | nhân viên, nhân sự | Bài 13 · nhóm 1 | hsk4-xia-l13a | ✓ (hsk4-xia-l13a) |
| 反向 | fǎnxiàng | ngược hướng, đi ngược chiều | Bài 13 · nhóm 1 | hsk4-xia-l13b | ✓ (hsk4-xia-l13b) |
| 团圆 | tuányuán | đoàn viên, sum họp | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 左右 | zuǒyòu | khoảng, chừng (đặt sau số từ để chỉ số xấp xỉ) | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 大约 | dàyuē | khoảng, chừng, đại khái | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 烤 | kǎo | nướng | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 西红柿 | xīhóngshì | cà chua | Bài 13 · nhóm 1 | hsk4-xia-l13b | ✓ (hsk4-xia-l13b) |
| 出现 | chūxiàn | xuất hiện | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 作为 | zuòwéi | với tư cách là; là, làm | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 传统 | chuántǒng | truyền thống | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 有着 | yǒuzhe | có, đang có (mang theo) | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 意义 | yìyì | ý nghĩa | Bài 13 · nhóm 1 | hsk4-xia-l13b | ✓ (hsk4-xia-l13b) |
| 到来 | dàolái | đến, tới (thời điểm, sự việc) | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 美食 | měishí | món ăn ngon, mỹ thực | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 年夜饭 | niányèfàn | cơm tất niên (bữa cơm đêm giao thừa) | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 回忆 | huíyì | hồi tưởng, nhớ lại | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 童年 | tóngnián | tuổi thơ, thời thơ ấu | Bài 13 · nhóm 1 | hsk4-xia-l13b | ✓ (hsk4-xia-l13b) |
| 记忆 | jìyì | ký ức, trí nhớ | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 已 | yǐ | đã | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 中年 | zhōngnián | tuổi trung niên | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 仍然 | réngrán | vẫn, vẫn còn | Bài 13 · nhóm 1 | hsk4-xia-l13b | – |
| 兄弟 | xiōngdì | anh em | Bài 13 · nhóm 1 | hsk4-xia-l13b | ✓ (hsk4-xia-l13b) |
| 茶叶 | cháyè | trà, lá trà (chè) | Bài 14 · nhóm 1 | hsk4-xia-l14a | ✓ (hsk4-xia-l14a) |
| 究竟 | jiūjìng | rốt cuộc, cuối cùng thì (dùng trong câu hỏi để truy vấn) | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 分为 | fēnwéi | chia thành, phân thành | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 抱歉 | bàoqiàn | xin lỗi, lấy làm tiếc | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 暂时 | zànshí | tạm thời | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 满 | mǎn | đủ, đạt đến (một mức); đầy | Bài 14 · nhóm 1 | hsk4-xia-l14a | ✓ (hsk4-xia-l14a) |
| 两 | liǎng | lạng (đơn vị trọng lượng, bằng 50 gam) | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 超过 | chāoguò | vượt quá, hơn | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 盒子 | hézi | hộp | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 装 | zhuāng | đựng, cho vào; lắp đặt | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 各位 | gèwèi | các vị, quý vị (mọi người) | Bài 14 · nhóm 1 | hsk4-xia-l14a | ✓ (hsk4-xia-l14a) |
| 顾客 | gùkè | khách hàng | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 本 | běn | (của) chính mình, bản (chỉ đơn vị/cửa hàng của phía người nói) | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 假日 | jiàrì | ngày nghỉ, ngày lễ | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 低价 | dījià | giá thấp, giá rẻ | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 促销 | cùxiāo | khuyến mãi, xúc tiến bán hàng | Bài 14 · nhóm 1 | hsk4-xia-l14a | ✓ (hsk4-xia-l14a) |
| 广播 | guǎngbō | phát thanh, loa phát thanh; phát (tin) | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 减 | jiǎn | giảm, bớt | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 广告 | guǎnggào | quảng cáo | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 首先 | shǒuxiān | trước tiên, đầu tiên | Bài 14 · nhóm 1 | hsk4-xia-l14a | – |
| 牌子 | páizi | thương hiệu, nhãn hiệu | Bài 14 · nhóm 1 | hsk4-xia-l14a | ✓ (hsk4-xia-l14a) |
| 降价 | jiàngjià | giảm giá, hạ giá | Bài 14 · nhóm 1 | hsk4-xia-l14b | ✓ (hsk4-xia-l14b) |
| 样式 | yàngshì | kiểu dáng, mẫu mã | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 价钱 | jiàqián | giá cả, giá tiền | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 商业 | shāngyè | thương mại, kinh doanh | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 商品 | shāngpǐn | hàng hóa, sản phẩm | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 种类 | zhǒnglèi | chủng loại, loại | Bài 14 · nhóm 1 | hsk4-xia-l14b | ✓ (hsk4-xia-l14b) |
| 盲盒 | mánghé | hộp mù (blind box — hộp đồ chơi bí mật) | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 缺 | quē | thiếu, hết (hàng) | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 许多 | xǔduō | nhiều, rất nhiều | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 表示 | biǎoshì | bày tỏ, cho biết, thể hiện | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 加上 | jiāshàng | thêm vào đó, cộng thêm | Bài 14 · nhóm 1 | hsk4-xia-l14b | ✓ (hsk4-xia-l14b) |
| 态度 | tàidù | thái độ | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 友好 | yǒuhǎo | thân thiện, hữu hảo | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 使得 | shǐde | khiến cho, làm cho | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 者 | zhě | người (hậu tố chỉ người, như 购物者 — người mua sắm) | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 仔细 | zǐxì | cẩn thận, kỹ lưỡng | Bài 14 · nhóm 1 | hsk4-xia-l14b | ✓ (hsk4-xia-l14b) |
| 对于 | duìyú | đối với, về (một vấn đề/đối tượng) | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 不光 | bùguāng | không chỉ, không riêng | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 外套 | wàitào | áo khoác ngoài | Bài 14 · nhóm 1 | hsk4-xia-l14b | – |
| 袜子 | wàzi | tất, vớ | Bài 14 · nhóm 1 | hsk4-xia-l14b | ✓ (hsk4-xia-l14b) |
| 期中 | qīzhōng | giữa kỳ (như thi giữa kỳ) | Bài 15 · nhóm 1 | hsk4-xia-l15a | ✓ (hsk4-xia-l15a) |
| 医药 | yīyào | y dược | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 应聘 | yìngpìn | ứng tuyển, đi xin việc theo tin tuyển dụng | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 招聘 | zhāopìn | tuyển dụng, chiêu mộ nhân sự | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 实习 | shíxí | thực tập | Bài 15 · nhóm 1 | hsk4-xia-l15a | ✓ (hsk4-xia-l15a) |
| 考虑 | kǎolǜ | cân nhắc, suy xét | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 单位 | dānwèi | đơn vị, cơ quan (nơi làm việc) | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 毕业生 | bìyèshēng | sinh viên (sắp/mới) tốt nghiệp | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 经历 | jīnglì | kinh nghiệm, trải nghiệm; trải qua | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 消息 | xiāoxi | tin tức, tin thông báo | Bài 15 · nhóm 1 | hsk4-xia-l15a | ✓ (hsk4-xia-l15a) |
| 报名 | bàomíng | đăng ký, ghi danh | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 填写 | tiánxiě | điền (thông tin vào biểu mẫu) | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 笔试 | bǐshì | thi viết; kỳ thi viết | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 面试 | miànshì | phỏng vấn; buổi phỏng vấn | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 答 | dá | trả lời, đáp | Bài 15 · nhóm 1 | hsk4-xia-l15a | ✓ (hsk4-xia-l15a) |
| 由 | yóu | bởi, do (chỉ người thực hiện hành động) | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 部门 | bùmén | bộ phận, phòng ban | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 负责人 | fùzérén | người phụ trách, người chịu trách nhiệm | Bài 15 · nhóm 1 | hsk4-xia-l15a | – |
| 不论 | búlùn | bất luận, dù (cho) | Bài 15 · nhóm 1 | hsk4-xia-l15a | ✓ (hsk4-xia-l15a) |
| 肯定 | kěndìng | chắc chắn; khẳng định | Bài 15 · nhóm 1 | hsk4-xia-l15b | ✓ (hsk4-xia-l15b) |
| 短信 | duǎnxìn | tin nhắn (văn bản) | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 激动 | jīdòng | xúc động, phấn khích; làm xúc động | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 扔 | rēng | ném, vứt | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 理发 | lǐfà | cắt tóc | Bài 15 · nhóm 1 | hsk4-xia-l15b | ✓ (hsk4-xia-l15b) |
| 镜子 | jìngzi | (cái) gương | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 自我 | zìwǒ | bản thân, chính mình | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 能够 | nénggòu | có thể, có khả năng (làm được) | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 运用 | yùnyòng | vận dụng, áp dụng | Bài 15 · nhóm 1 | hsk4-xia-l15b | ✓ (hsk4-xia-l15b) |
| 工厂 | gōngchǎng | nhà máy, xí nghiệp | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 规定 | guīdìng | quy định; đưa ra quy định | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 课堂 | kètáng | lớp học, giờ học trên lớp | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 完全 | wánquán | hoàn toàn; trọn vẹn | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 例如 | lìrú | ví dụ như, chẳng hạn như | Bài 15 · nhóm 1 | hsk4-xia-l15b | ✓ (hsk4-xia-l15b) |
| 不如 | bùrú | không bằng (so sánh kém hơn) | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 细节 | xìjié | chi tiết, tình tiết nhỏ | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 答案 | dá'àn | đáp án, câu trả lời | Bài 15 · nhóm 1 | hsk4-xia-l15b | – |
| 职业 | zhíyè | nghề nghiệp | Bài 15 · nhóm 1 | hsk4-xia-l15b | ✓ (hsk4-xia-l15b) |
| 本来 | běnlái | vốn dĩ, ban đầu; nguyên gốc | Bài 16 · nhóm 1 | hsk4-xia-l16a | ✓ (hsk4-xia-l16a) |
| 只好 | zhǐhǎo | đành phải, chỉ còn cách | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 赶上 | gǎnshàng | đuổi kịp, theo kịp | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 旅行 | lǚxíng | du lịch, đi du lịch | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 推迟 | tuīchí | trì hoãn, lùi lại | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 取消 | qǔxiāo | hủy bỏ | Bài 16 · nhóm 1 | hsk4-xia-l16a | ✓ (hsk4-xia-l16a) |
| 可惜 | kěxī | đáng tiếc, tiếc là | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 确实 | quèshí | quả thực, đúng là | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 等到 | děngdào | đợi đến khi, chờ đến lúc | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 早晨 | zǎochen | buổi sáng (sớm) | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 忽然 | hūrán | bỗng nhiên, đột nhiên | Bài 16 · nhóm 1 | hsk4-xia-l16a | ✓ (hsk4-xia-l16a) |
| 增加 | zēngjiā | tăng thêm, gia tăng | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 调整 | tiáozhěng | điều chỉnh | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 错误 | cuòwù | sai sót, lỗi; sai, không đúng | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 并且 | bìngqiě | hơn nữa, đồng thời còn | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 例子 | lìzi | ví dụ | Bài 16 · nhóm 1 | hsk4-xia-l16a | ✓ (hsk4-xia-l16a) |
| 关键 | guānjiàn | mấu chốt, điểm then chốt; quan trọng nhất | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 详细 | xiángxì | chi tiết, tỉ mỉ | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 时间表 | shíjiānbiǎo | thời gian biểu, lịch trình | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 把握 | bǎwò | sự chắc chắn, nắm chắc phần thắng | Bài 16 · nhóm 1 | hsk4-xia-l16a | – |
| 相反 | xiāngfǎn | ngược lại; trái ngược | Bài 16 · nhóm 1 | hsk4-xia-l16a | ✓ (hsk4-xia-l16a) |
| 部分 | bùfen | một phần, bộ phận | Bài 16 · nhóm 1 | hsk4-xia-l16b | ✓ (hsk4-xia-l16b) |
| 轻松 | qīngsōng | nhẹ nhõm, thoải mái, thư thả | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 标准 | biāozhǔn | tiêu chuẩn, đạt chuẩn; chuẩn mực | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 严格 | yángé | nghiêm ngặt, nghiêm khắc; thực hiện nghiêm túc | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 取得 | qǔdé | đạt được, giành được | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 说不定 | shuōbudìng | biết đâu, không chừng, có khi | Bài 16 · nhóm 1 | hsk4-xia-l16b | ✓ (hsk4-xia-l16b) |
| 灵活 | línghuó | linh hoạt | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 一切 | yíqiè | tất cả, mọi thứ | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 却 | què | nhưng, thế mà (chỉ ý chuyển hướng) | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 不得不 | bùdébù | không thể không, đành phải | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 约 | yuē | hẹn, đặt hẹn; khoảng, chừng | Bài 16 · nhóm 1 | hsk4-xia-l16b | ✓ (hsk4-xia-l16b) |
| 不便 | búbiàn | bất tiện; không tiện (làm việc gì) | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 失望 | shīwàng | thất vọng; mất hy vọng | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 也许 | yěxǔ | có lẽ, có thể | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 逛 | guàng | dạo, đi dạo (phố, cửa hàng) | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 有趣 | yǒuqù | thú vị, hay | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 观看 | guānkàn | xem, quan sát (phim, thi đấu…) | Bài 16 · nhóm 1 | hsk4-xia-l16b | ✓ (hsk4-xia-l16b) |
| 部 | bù | lượng từ dùng cho sách, phim… | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 无法 | wúfǎ | không có cách nào, không thể | Bài 16 · nhóm 1 | hsk4-xia-l16b | – |
| 接受 | jiēshòu | chấp nhận, tiếp nhận | Bài 16 · nhóm 1 | hsk4-xia-l16b | ✓ (hsk4-xia-l16b) |
| 路过 | lùguò | đi ngang qua, ghé qua | Bài 17 · nhóm 1 | hsk4-xia-l17a | ✓ (hsk4-xia-l17a) |
| 趟 | tàng | chuyến, lượt (dùng cho việc đi lại) | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 健身房 | jiànshēnfáng | phòng tập gym, phòng tập thể hình | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 健身 | jiànshēn | tập gym, rèn luyện thân thể | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 体重 | tǐzhòng | cân nặng, thể trọng | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 会员 | huìyuán | hội viên, thành viên | Bài 17 · nhóm 1 | hsk4-xia-l17a | ✓ (hsk4-xia-l17a) |
| 饼干 | bǐnggān | bánh quy | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 酸奶 | suānnǎi | sữa chua | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 果汁 | guǒzhī | nước ép trái cây | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 教练 | jiàoliàn | huấn luyện viên | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 动作 | dòngzuò | động tác | Bài 17 · nhóm 1 | hsk4-xia-l17a | ✓ (hsk4-xia-l17a) |
| 科学 | kēxué | khoa học; (thuộc) khoa học | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 受伤 | shòushāng | bị thương, bị chấn thương | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 操场 | cāochǎng | sân vận động, sân tập | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 其中 | qízhōng | trong đó, trong số đó | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 之 | zhī | trợ từ "chi", dùng giữa định ngữ và trung tâm ngữ (văn phong trang trọng, tương đương 的） | Bài 17 · nhóm 1 | hsk4-xia-l17a | ✓ (hsk4-xia-l17a) |
| 火 | huǒ | rất được ưa chuộng, "hot"; lửa | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 好处 | hǎochù | lợi ích, điểm tốt | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 设备 | shèbèi | thiết bị, trang thiết bị | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 全身 | quánshēn | toàn thân | Bài 17 · nhóm 1 | hsk4-xia-l17a | – |
| 准确 | zhǔnquè | chính xác, chuẩn xác | Bài 17 · nhóm 1 | hsk4-xia-l17a | ✓ (hsk4-xia-l17a) |
| 仅仅 | jǐnjǐn | chỉ, vẻn vẹn, mới chỉ | Bài 17 · nhóm 1 | hsk4-xia-l17b | ✓ (hsk4-xia-l17b) |
| 表扬 | biǎoyáng | khen ngợi, biểu dương | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 进步 | jìnbù | tiến bộ | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 鼓励 | gǔlì | khuyến khích, động viên | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 帅 | shuài | đẹp trai, bảnh bao | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 乒乓球 | pīngpāngqiú | bóng bàn | Bài 17 · nhóm 1 | hsk4-xia-l17b | ✓ (hsk4-xia-l17b) |
| 队 | duì | đội | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 项 | xiàng | hạng mục, mục (dùng cho nội dung thi đấu, công việc, nhiệm vụ…) | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 赢得 | yíngdé | giành được, thắng được | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 叫作 | jiàozuò | được gọi là | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 梦 | mèng | giấc mơ; mơ | Bài 17 · nhóm 1 | hsk4-xia-l17b | ✓ (hsk4-xia-l17b) |
| 不断 | búduàn | không ngừng, liên tục | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 队员 | duìyuán | thành viên đội, tuyển thủ | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 训练 | xùnliàn | huấn luyện, tập luyện | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 球队 | qiúduì | đội bóng, đội thi đấu các môn bóng | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 球迷 | qiúmí | người hâm mộ (các môn bóng), cổ động viên | Bài 17 · nhóm 1 | hsk4-xia-l17b | ✓ (hsk4-xia-l17b) |
| 梦想 | mèngxiǎng | ước mơ; mơ ước | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 大赛 | dàsài | giải đấu lớn, cuộc thi lớn | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 赢 | yíng | thắng, giành chiến thắng | Bài 17 · nhóm 1 | hsk4-xia-l17b | – |
| 连 | lián | ngay cả, đến cả | Bài 17 · nhóm 1 | hsk4-xia-l17b | ✓ (hsk4-xia-l17b) |
| 猜 | cāi | đoán | Bài 18 · nhóm 1 | hsk4-xia-l18a | ✓ (hsk4-xia-l18a) |
| 共享单车 | gòngxiǎng dānchē | xe đạp chia sẻ (xe đạp công cộng dùng chung) | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 出口 | chūkǒu | lối ra, cửa ra | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 推 | tuī | đẩy; dắt (xe) | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 对 | duì | hướng vào, chĩa vào | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 二维码 | èrwéimǎ | mã QR (mã hai chiều) | Bài 18 · nhóm 1 | hsk4-xia-l18a | ✓ (hsk4-xia-l18a) |
| 注册 | zhùcè | đăng ký (tài khoản) | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 费用 | fèiyong | chi phí, lệ phí | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 说明 | shuōmíng | bản hướng dẫn; giải thích, nói rõ | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 办事 | bànshì | làm việc, giải quyết công việc | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 差点儿 | chàdiǎnr | suýt nữa, thiếu chút nữa | Bài 18 · nhóm 1 | hsk4-xia-l18a | ✓ (hsk4-xia-l18a) |
| 拍 | pāi | quay (phim), chụp (ảnh) | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 各个 | gègè | mỗi, từng (cái, người); từng cái một | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 小组 | xiǎozǔ | nhóm nhỏ, tổ | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 讨论 | tǎolùn | thảo luận | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 演 | yǎn | đóng vai, diễn | Bài 18 · nhóm 1 | hsk4-xia-l18a | ✓ (hsk4-xia-l18a) |
| 厨师 | chúshī | đầu bếp | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 各地 | gèdì | các nơi, khắp các địa phương | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 著名 | zhùmíng | nổi tiếng, trứ danh | Bài 18 · nhóm 1 | hsk4-xia-l18a | – |
| 小吃 | xiǎochī | món ăn vặt, món ăn nhẹ | Bài 18 · nhóm 1 | hsk4-xia-l18a | ✓ (hsk4-xia-l18a) |
| 互联网 | hùliánwǎng | mạng internet | Bài 18 · nhóm 1 | hsk4-xia-l18b | ✓ (hsk4-xia-l18b) |
| 点赞 | diǎnzàn | bấm "thích" (like) | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| AI眼镜 | AI yǎnjìng | kính thông minh AI | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 3D打印机 | 3D dǎyìnjī | máy in 3D | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 上门 | shàngmén | đến tận nhà (để cung cấp dịch vụ) | Bài 18 · nhóm 1 | hsk4-xia-l18b | ✓ (hsk4-xia-l18b) |
| 到底 | dàodǐ | rốt cuộc (dùng trong câu hỏi để truy vấn, nhấn mạnh) | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 仅 | jǐn | chỉ, vẻn vẹn | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 多样 | duōyàng | đa dạng, nhiều loại | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 推出 | tuīchū | cho ra mắt, tung ra (sản phẩm, dịch vụ) | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 预约 | yùyuē | đặt hẹn trước, đặt trước | Bài 18 · nhóm 1 | hsk4-xia-l18b | ✓ (hsk4-xia-l18b) |
| 取 | qǔ | lấy, nhận (đồ) | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 原因 | yuányīn | nguyên nhân | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 然而 | rán'ér | tuy nhiên, nhưng mà | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 不必 | búbì | không cần, không nhất thiết | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 亲戚 | qīnqi | họ hàng, bà con | Bài 18 · nhóm 1 | hsk4-xia-l18b | ✓ (hsk4-xia-l18b) |
| 按 | àn | theo, dựa theo; ấn, bấm | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 提出 | tíchū | đưa ra, đề xuất | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 大大 | dàdà | rất nhiều, ở mức độ lớn | Bài 18 · nhóm 1 | hsk4-xia-l18b | – |
| 现有 | xiànyǒu | hiện có, sẵn có hiện nay | Bài 18 · nhóm 1 | hsk4-xia-l18b | ✓ (hsk4-xia-l18b) |
| 话剧 | huàjù | kịch nói | Bài 19 · nhóm 1 | hsk4-xia-l19a | ✓ (hsk4-xia-l19a) |
| 排 | pái | tập dượt, diễn tập | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 艺术 | yìshù | nghệ thuật | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 内心 | nèixīn | nội tâm, trong lòng | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 自信 | zìxìn | tự tin; sự tự tin | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 少年 | shàonián | thiếu niên, thanh thiếu niên | Bài 19 · nhóm 1 | hsk4-xia-l19a | ✓ (hsk4-xia-l19a) |
| 歌手 | gēshǒu | ca sĩ | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 歌声 | gēshēng | giọng hát, tiếng hát | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 度假 | dùjià | đi nghỉ, nghỉ mát | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 演员 | yǎnyuán | diễn viên | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 演唱 | yǎnchàng | biểu diễn hát, trình diễn ca khúc | Bài 19 · nhóm 1 | hsk4-xia-l19a | ✓ (hsk4-xia-l19a) |
| 留下 | liúxia | để lại, lưu lại | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 青年 | qīngnián | thanh niên | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 观众 | guānzhòng | khán giả | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 功课 | gōngkè | bài vở, việc học; (nghĩa bóng) việc chuẩn bị/tìm hiểu trước | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 转发 | zhuǎnfā | chuyển tiếp (tin nhắn, bài viết) | Bài 19 · nhóm 1 | hsk4-xia-l19a | ✓ (hsk4-xia-l19a) |
| 入口 | rùkǒu | lối vào, cửa vào | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 入 | rù | vào (nhập vào, đi vào) | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 指 | zhǐ | chỉ (bằng tay), trỏ | Bài 19 · nhóm 1 | hsk4-xia-l19a | – |
| 功夫 | gōngfu | công phu, tay nghề/kỹ năng luyện tập lâu năm | Bài 19 · nhóm 1 | hsk4-xia-l19a | ✓ (hsk4-xia-l19a) |
| 获奖 | huòjiǎng | đoạt giải, được giải thưởng | Bài 19 · nhóm 1 | hsk4-xia-l19b | ✓ (hsk4-xia-l19b) |
| 奖 | jiǎng | giải thưởng, phần thưởng | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 期待 | qīdài | mong đợi, kỳ vọng | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 鼓掌 | gǔzhǎng | vỗ tay | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 邀请 | yāoqǐng | mời | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 庆祝 | qìngzhù | ăn mừng, chúc mừng | Bài 19 · nhóm 1 | hsk4-xia-l19b | ✓ (hsk4-xia-l19b) |
| 点头 | diǎntóu | gật đầu | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 作品 | zuòpǐn | tác phẩm (văn học, nghệ thuật) | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 作者 | zuòzhě | tác giả | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 世纪 | shìjì | thế kỷ | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 读者 | dúzhě | độc giả, bạn đọc | Bài 19 · nhóm 1 | hsk4-xia-l19b | ✓ (hsk4-xia-l19b) |
| 作家 | zuòjiā | nhà văn | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 版 | bǎn | ấn bản, phiên bản, bản (in) | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 文章 | wénzhāng | bài văn, bài viết | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 全部 | quánbù | toàn bộ, tất cả | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 整理 | zhěnglǐ | sắp xếp, chỉnh lý, thu xếp | Bài 19 · nhóm 1 | hsk4-xia-l19b | ✓ (hsk4-xia-l19b) |
| 文字 | wénzì | chữ viết, văn tự | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 图片 | túpiàn | hình ảnh, tranh ảnh | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 报考 | bàokǎo | đăng ký dự thi, nộp hồ sơ thi | Bài 19 · nhóm 1 | hsk4-xia-l19b | – |
| 文学 | wénxué | văn học | Bài 19 · nhóm 1 | hsk4-xia-l19b | ✓ (hsk4-xia-l19b) |
| 堵车 | dǔchē | tắc xe, kẹt xe | Bài 20 · nhóm 1 | hsk4-xia-l20a | ✓ (hsk4-xia-l20a) |
| 乘 | chéng | đi, đáp (tàu, xe, máy bay) | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 难道 | nándào | lẽ nào, chẳng lẽ (phó từ ngữ khí, dùng trong câu phản vấn hoặc biểu thị suy đoán) | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 无 | wú | không có | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 动车 | dòngchē | tàu cao tốc (tàu động lực phân tán) | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 车速 | chēsù | tốc độ xe/tàu | Bài 20 · nhóm 1 | hsk4-xia-l20a | ✓ (hsk4-xia-l20a) |
| 列 | liè | đoàn, dãy (dùng cho tàu, hàng dài) | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 晚餐 | wǎncān | bữa tối | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 夜 | yè | đêm, ban đêm | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 大巴 | dàbā | xe buýt lớn, xe khách đường dài | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 安检 | ānjiǎn | kiểm tra an ninh | Bài 20 · nhóm 1 | hsk4-xia-l20a | ✓ (hsk4-xia-l20a) |
| 登机 | dēngjī | lên máy bay | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 小说 | xiǎoshuō | tiểu thuyết | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 航班 | hángbān | chuyến bay | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 值机 | zhíjī | làm thủ tục lên máy bay (check-in) | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 旅客 | lǚkè | hành khách, lữ khách | Bài 20 · nhóm 1 | hsk4-xia-l20a | ✓ (hsk4-xia-l20a) |
| 牌 | pái | bảng, biển, thẻ | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 靠 | kào | sát, gần bên; dựa vào | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 窗户 | chuānghu | cửa sổ | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 转机 | zhuǎnjī | chuyển máy bay, quá cảnh | Bài 20 · nhóm 1 | hsk4-xia-l20a | – |
| 从中 | cóngzhōng | từ trong đó, qua đó | Bài 20 · nhóm 1 | hsk4-xia-l20a | ✓ (hsk4-xia-l20a) |
| 总结 | zǒngjié | tổng kết, đúc kết | Bài 20 · nhóm 1 | hsk4-xia-l20b | ✓ (hsk4-xia-l20b) |
| 道路 | dàolù | đường sá, đường đi | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 特点 | tèdiǎn | đặc điểm | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 所有 | suǒyǒu | tất cả, mọi | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 意见 | yìjiàn | ý kiến | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 细 | xì | tỉ mỉ, kỹ lưỡng; mảnh, mỏng | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 烦恼 | fánnǎo | phiền não, bực dọc | Bài 20 · nhóm 1 | hsk4-xia-l20b | ✓ (hsk4-xia-l20b) |
| 百分之 | bǎi fēn zhī | phần trăm (百分之四十 = bốn mươi phần trăm, 40%) | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 节省 | jiéshěng | tiết kiệm | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 当 | dàng | coi như, xem là | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 红包 | hóngbāo | bao lì xì, phong bao đỏ | Bài 20 · nhóm 1 | hsk4-xia-l20b | ✓ (hsk4-xia-l20b) |
| 卷 | juàn | quyển, cuốn (dùng cho sách) | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 里 | lǐ | dặm (đơn vị đo độ dài, 1 dặm = 500 mét) | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 要是 | yàoshi | nếu, nếu như | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 少数 | shǎoshù | thiểu số, số ít | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 民族 | mínzú | dân tộc | Bài 20 · nhóm 1 | hsk4-xia-l20b | ✓ (hsk4-xia-l20b) |
| 导游 | dǎoyóu | hướng dẫn viên du lịch; dẫn tour | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 解释 | jiěshì | giải thích | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 泼 | pō | té, hắt (nước) | Bài 20 · nhóm 1 | hsk4-xia-l20b | – |
| 流利 | liúlì | lưu loát, trôi chảy | Bài 20 · nhóm 1 | hsk4-xia-l20b | ✓ (hsk4-xia-l20b) |
