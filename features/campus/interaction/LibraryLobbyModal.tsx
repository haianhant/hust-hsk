// ---------------------------------------------------------------------------
// features/campus/interaction/LibraryLobbyModal.tsx — Bảng tương tác Sảnh tầng 1
// Thư viện Tạ Quang Bửu (Tượng GS. Tạ Quang Bửu, Bảng từ vựng & Quầy thông tin)
// Module ID: building.library
// ---------------------------------------------------------------------------

export type LibraryLobbyModalTopic = 'statue' | 'vocab-board' | 'info-desk';

export interface LibraryLobbyModalProps {
  topic: LibraryLobbyModalTopic;
  onClose: () => void;
  onSpeak: (text: string) => void;
}

export default function LibraryLobbyModal({
  topic,
  onClose,
  onSpeak,
}: LibraryLobbyModalProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
      <div
        data-testid="library-lobby-modal"
        className="w-full max-w-lg rounded-2xl border border-[#C9A227]/40 bg-[#FDF8EE] p-5 text-left shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#3B2214]">
            {topic === 'statue'
              ? '🏛️ Tượng GS. Tạ Quang Bửu & Bức tường Nhị phân 0/1'
              : topic === 'vocab-board'
                ? '📚 Từ vựng Hán ngữ chuyên đề Thư viện & Khoa học'
                : '💁 Quầy Thông tin & Mượn sách Thư viện'}
          </h2>
          <button
            type="button"
            aria-label="Đóng thông tin sảnh thư viện"
            onClick={onClose}
            className="rounded-full bg-black/10 px-2.5 py-1 font-bold text-[#3B2214] hover:bg-black/20"
          >
            ✕
          </button>
        </div>

        {topic === 'statue' && (
          <div className="space-y-3 text-sm leading-relaxed text-[#2B2B2B]">
            <p>
              <strong>Giáo sư Tạ Quang Bửu (1910 – 1986)</strong> là nhà khoa học lớn, Hiệu trưởng đầu tiên của
              Trường Đại học Bách khoa Hà Nội và nguyên Bộ trưởng Bộ Đại học và Trung học chuyên nghiệp.
            </p>
            <p>
              Tại trung tâm sảnh tầng 1 Thư viện Tạ Quang Bửu, tượng bán thân đồng của Giáo sư đặt trang trọng trước{' '}
              <strong>bức tường gỗ khắc họa tiết nhị phân 0/1 và diềm hồi văn phát sáng vàng ấm</strong> — biểu
              tượng cho sự giao thoa giữa truyền thống văn hiến và khoa học công nghệ hiện đại của Bách khoa.
            </p>
            <div className="rounded-xl border border-[#C9A227]/40 bg-[#FFF8E6] p-3">
              <p className="font-bold text-[#A54432]">谢光宝教授图书馆 (Xiè Guāngbǎo Jiàoshòu Túshūguǎn)</p>
              <p className="text-xs text-[#2B2B2B]/75">
                Thư viện Giáo sư Tạ Quang Bửu · 科学先驱 (Kēxué xiānqū — Người tiên phong khoa học)
              </p>
              <button
                type="button"
                onClick={() => onSpeak('谢光宝教授是河内百科大学的第一任校长')}
                className="mt-2 rounded-full bg-[#1c5c3a] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#16492e]"
              >
                🔊 Nghe câu giới thiệu tiếng Trung
              </button>
            </div>
          </div>
        )}

        {topic === 'vocab-board' && (
          <div className="space-y-2.5 text-sm text-[#2B2B2B]">
            {[
              { zh: '图书馆', py: 'túshūguǎn', vi: 'Thư viện' },
              { zh: '科学', py: 'kēxué', vi: 'Khoa học' },
              { zh: '技术', py: 'jìshù', vi: 'Kỹ thuật / Công nghệ' },
              { zh: '阅读', py: 'yuèdú', vi: 'Đọc sách, nghiên cứu' },
              { zh: '借书', py: 'jièshū', vi: 'Mượn sách' },
            ].map((item) => (
              <div
                key={item.zh}
                className="flex items-center justify-between rounded-xl border border-[#1c2b1f]/15 bg-white px-3.5 py-2"
              >
                <div>
                  <span className="text-base font-bold text-[#A54432]">{item.zh}</span>{' '}
                  <span className="text-xs font-semibold text-[#1c5c3a]">({item.py})</span>
                  <p className="text-xs text-[#2B2B2B]/80">{item.vi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSpeak(item.zh)}
                  className="rounded-full bg-[#1c5c3a]/15 px-3 py-1 text-xs font-bold text-[#1c5c3a] hover:bg-[#1c5c3a]/25"
                >
                  🔊 Phát âm
                </button>
              </div>
            ))}
          </div>
        )}

        {topic === 'info-desk' && (
          <div className="space-y-3 text-sm leading-relaxed text-[#2B2B2B]">
            <p>
              Chào mừng bạn đến với <strong>Quầy thông tin &amp; Mượn trả sách tầng 1</strong>. Sinh viên Bách khoa sử
              dụng thẻ sinh viên (学生证 xuéshengzhèng) để qua cổng từ và mượn giáo trình tại các phòng đọc chuyên
              ngành từ tầng 3 đến tầng 9.
            </p>
            <div className="rounded-xl border border-[#1c5c3a]/30 bg-white p-3">
              <p className="font-bold text-[#1c5c3a]">
                “你好！我想在谢光宝图书馆借一本汉娜词典。”
              </p>
              <p className="mt-1 text-xs text-[#2B2B2B]/75">
                Xin chào! Tôi muốn mượn một cuốn từ điển tại Thư viện Tạ Quang Bửu.
              </p>
              <button
                type="button"
                onClick={() => onSpeak('你好，我想在图书馆借书')}
                className="mt-2 rounded-full bg-[#A54432] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#8A3828]"
              >
                🔊 Nghe hội thoại mẫu
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#3B2214] px-5 py-2 text-sm font-bold text-white hover:bg-[#24140B]"
          >
            Đóng (Tiếp tục tham quan sảnh)
          </button>
        </div>
      </div>
    </div>
  );
}
