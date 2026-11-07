# Chú thích ảnh top-down đợt 4 bằng PIL (chạy sau test/r4-lib-shots.cjs).
# Mapping world -> pixel hiệu chuẩn từ khung đỏ đợt 3
# (x 29,5..46,5, z 20..44,1 -> cột x 781..861, hàng y 474..587):
# AX = AZ ≈ 4,7 px/m (camera topView, viewport 1280x800).
# Nhãn đặt ở khoảng trống PHÍA ĐÔNG thư viện, nối bằng leader line —
# bản trước đặt nhãn chồng lên nhau ngay trên tòa (tòa chỉ ~100×60 px).
# Chạy: python3 test/r4-lib-annotate.py
from PIL import Image, ImageDraw, ImageFont

SHOTS = 'test-shots'
AX, BX = 4.7059, 642.2   # px = AX * x + BX
AZ, BZ = 4.6888, 380.2   # py = AZ * z + BZ
NEW = {'x0': 27.5, 'x1': 48.5, 'z0': 30.0, 'z1': 43.0}  # tháp đợt 4
BASE = {'x0': 32.5, 'x1': 43.5, 'z0': 24.0, 'z1': 30.0}  # khối đế
CLOCK = (38, 23.9)


def X(x):
    return AX * x + BX


def Z(z):
    return AZ * z + BZ


def main():
    im = Image.open(f'{SHOTS}/r4-lib-topdown.png').convert('RGB')
    d = ImageDraw.Draw(im)
    try:
        font_big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
        font_mid = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    except OSError:
        font_big = font_mid = ImageFont.load_default()

    def label(x, y, text, font=font_mid, fill='white'):
        d.text((x + 2, y + 2), text, font=font, fill='black')
        d.text((x, y), text, font=font, fill=fill)

    def leader(x1, y1, x2, y2, color='white'):
        d.line([x1, y1, x2, y2], fill=color, width=2)
        d.ellipse([x2 - 4, y2 - 4, x2 + 4, y2 + 4], fill=color)

    # Khung đỏ footprint tháp mới + khung xanh khối đế.
    d.rectangle([X(NEW['x0']), Z(NEW['z0']), X(NEW['x1']), Z(NEW['z1'])], outline='red', width=4)
    d.rectangle([X(BASE['x0']), Z(BASE['z0']), X(BASE['x1']), Z(BASE['z1'])], outline='#1E5AA8', width=3)
    # Mũi tên mặt chính: từ đồng hồ chỉ về bắc (-Z, lên trên).
    cx, cy = X(CLOCK[0]), Z(CLOCK[1])
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill='#1E5AA8', outline='white', width=2)
    d.line([cx, cy, cx, cy - 40], fill='#1E5AA8', width=4)
    d.polygon([(cx, cy - 52), (cx - 9, cy - 34), (cx + 9, cy - 34)], fill='#1E5AA8')
    # Nhãn phía đông (khoảng trống), nối leader line về đặc điểm.
    lx = 890
    label(lx, 388, 'Sân trước mới (plaza z 10..19)', font_mid)
    leader(lx - 8, 398, X(46), Z(14.5))
    label(lx, 420, 'Mặt chính -> BẮC scene (-Z)', font_mid, '#1E5AA8')
    leader(lx - 8, 430, cx, cy - 52)
    label(lx, 452, 'Đồng hồ (38, 23,9)', font_mid, '#1E5AA8')
    leader(lx - 8, 462, cx, cy)
    label(lx, 500, 'Tháp 21×13 m (khung đỏ)', font_mid)
    leader(lx - 8, 510, X(NEW['x1']), Z(36.5))
    label(lx, 532, 'Khối đế + sảnh (khung xanh)', font_mid, '#1E5AA8')
    leader(lx - 8, 542, X(BASE['x1']), Z(27))
    # Nhãn hồ + tiêu đề/chú thích ở dưới (khoảng trống, tránh chip UI trên).
    label(X(-14), Z(40), 'Hồ Tiền', font_big)
    label(20, 700, 'Thư viện sau dựng lại đợt 4 — top-down (bắc lên trên, đông sang phải)', font_big)
    label(20, 740, 'Trước: tháp 17×24, mặt tiền là cạnh hẹp — Sau: tấm đứng 21×13, mặt tiền rộng.', font_mid)

    out = f'{SHOTS}/r4-lib-topdown-annotated.png'
    im.save(out)
    print('saved', out)


if __name__ == '__main__':
    main()
