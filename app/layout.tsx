import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bách khoa Hán ngữ 3D — HUST HSK',
  description:
    'Học tiếng Trung trong khuôn viên Đại học Bách khoa Hà Nội được tái hiện 3D: đi dạo campus, ghé nhà C1, Thư viện Tạ Quang Bửu và Hồ Tiền, mang tiếng Trung vào từng câu chuyện. Dự án học tập độc lập, không phải website chính thức của Đại học.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
