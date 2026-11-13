import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = 'https://hustverse.vercel.app/';

const SITE_TITLE = 'HUSTVerse — Bách Khoa 3D | Không gian Mô phỏng & Game Tương tác ĐHBK Hà Nội';
const SITE_DESCRIPTION =
  'Khám phá khuôn viên Đại học Bách khoa Hà Nội trong không gian 3D tương tác: tùy chỉnh nhân vật & 10 bộ đồng phục BK, lái xe dạo trường, check-in 9 công trình biểu tượng, tự học tại Thư viện Tạ Quang Bửu 10 tầng, giao lưu trực tuyến và bật/tắt Chế độ Học tiếng Trung (HSK) tùy chọn.';

export const metadata: Metadata = {
  metadataBase: new URL('https://hustverse.vercel.app'),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: 'HUSTVerse — Bách Khoa 3D',
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
