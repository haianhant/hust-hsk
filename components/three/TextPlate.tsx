// ---------------------------------------------------------------------------
// TextPlate.tsx — chữ trong scene bằng canvas texture (Bước 3)
// Không dùng drei Text (tránh tải font ngoài), không copy ảnh gốc. Mọi chữ
// đọc được trong scene ("I LOVE BK", "C1", tên trường, biển quảng trường,
// mặt đồng hồ, bia tượng đài) đều vẽ bằng canvas 2D rồi dán lên mặt phẳng.
// Texture được cache theo key ở module — tạo một lần cho cả vòng đời app.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

function getTexture(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, px: number, maxW: number) {
  let size = px;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
  }
  return size;
}

// --- Các hàm vẽ (ổn định ở module, dùng lại cho mọi lần render) --------------

export function drawLetterI(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Chữ "I" CÓ CHÂN (serif): vẽ trực tiếp bằng hình chữ nhật — không phụ
  // thuộc font hệ thống (Arial "I" chỉ là nét sổ mảnh, hay lẫn với cột
  // loggia trắng phía sau). Thân dày + thanh ngang trên/dưới, viền tối
  // quanh chữ để đọc được cả trên nền cột trắng lẫn dải kính tối.
  // Mặt phẳng 0,8 × 1,9 m: thân rộng ~0,23 m, thanh ngang rộng ~0,67 m.
  ctx.clearRect(0, 0, w, h);
  const stemX0 = w * 0.36;
  const stemW = w * 0.28;
  const barX0 = w * 0.08;
  const barW = w * 0.84;
  const barH = h * 0.16;
  const halo = 12; // px — viền tối quanh chữ (~0,04 m ngang, ~0,09 m dọc)
  ctx.fillStyle = '#1A1A1A'; // viền tối: vẽ cùng hình, phóng to mỗi chiều
  ctx.fillRect(barX0 - halo, 0, barW + halo * 2, barH + halo);
  ctx.fillRect(stemX0 - halo, 0, stemW + halo * 2, h);
  ctx.fillRect(barX0 - halo, h - barH - halo, barW + halo * 2, barH + halo);
  ctx.fillStyle = '#F5F5F5'; // chữ trắng trên viền tối
  ctx.fillRect(barX0, 0, barW, barH);
  ctx.fillRect(stemX0, 0, stemW, h);
  ctx.fillRect(barX0, h - barH, barW, barH);
}

export function drawLetterBK(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#F5F5F5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 190px Arial, sans-serif';
  ctx.fillText('BK', w / 2, h / 2 + 8);
}

export function drawC1Label(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 192px Arial, sans-serif';
  // Đổ bóng khối 3D nâu sẫm + mặt chữ vàng cam ấm (#D96B27) chuẩn ảnh c1-can-luoi-hoa-gio-05.jpg
  ctx.fillStyle = 'rgba(78, 38, 12, 0.72)';
  ctx.fillText('C1', w / 2 + 6, h / 2 + 14);
  ctx.fillStyle = '#D96B27';
  ctx.fillText('C1', w / 2, h / 2 + 8);
}

export function drawHustSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Biểu trưng ĐHBK Hà Nội gắn bên phải tháp hoa gió C1 (chuẩn ảnh c1-can-luoi-hoa-gio-05.jpg):
  // Nền kem ngà viền nâu đồng, lá cờ đỏ sao vàng uốn lượn phía trên, chữ ĐẠI HỌC BÁCH KHOA
  // đặt trên trang sách mở trắng + bánh răng vàng + compa ở phía dưới.
  ctx.fillStyle = '#F3EAD8';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#7A5C38';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  // Phần trên: Lá cờ đỏ sao vàng chiếm nửa trên biểu trưng
  ctx.fillStyle = '#D41E24';
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.05);
  ctx.lineTo(w * 0.64, h * 0.05);
  ctx.quadraticCurveTo(w * 0.56, h * 0.25, w * 0.66, h * 0.44);
  ctx.lineTo(w * 0.08, h * 0.44);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F5C518';
  star(ctx, w * 0.34, h * 0.24, 54);

  // Chữ "ĐẠI HỌC" & "BÁCH KHOA" màu đỏ thẫm nổi bật giữa biểu trưng
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8C2318';
  ctx.font = '800 46px Arial, sans-serif';
  ctx.fillText('ĐẠI HỌC', w * 0.58, h * 0.50);
  ctx.fillStyle = '#C81E24';
  fitFont(ctx, 'BÁCH KHOA', 900, 76, w * 0.88);
  ctx.fillText('BÁCH KHOA', w * 0.5, h * 0.62);

  // Trang sách mở trắng + bánh răng vàng ở phần dưới biểu trưng
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#6E5030';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.14, h * 0.70);
  ctx.quadraticCurveTo(w * 0.32, h * 0.67, w * 0.5, h * 0.72);
  ctx.quadraticCurveTo(w * 0.68, h * 0.67, w * 0.86, h * 0.70);
  ctx.lineTo(w * 0.86, h * 0.84);
  ctx.quadraticCurveTo(w * 0.68, h * 0.81, w * 0.5, h * 0.86);
  ctx.quadraticCurveTo(w * 0.32, h * 0.81, w * 0.14, h * 0.84);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Nửa bánh răng vàng phía dưới sách mở
  ctx.fillStyle = '#D99B26';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.86, w * 0.16, 0, Math.PI, false);
  ctx.fill();
}

export function drawRockInscription(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Chữ đen 2 dòng trên khối đá trắng (reference-visual §6).
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1A1A1A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, 'ĐẠI HỌC BÁCH KHOA HÀ NỘI', 900, 92, w * 0.96);
  ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.3);
  fitFont(ctx, 'HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY', 700, 52, w * 0.96);
  ctx.fillText('HANOI UNIVERSITY OF SCIENCE AND TECHNOLOGY', w / 2, h * 0.72);
}

export function drawTdnSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Biển đồng vàng, chữ đỏ (reference-visual §7 — chỉ chữ đã đọc được trong ảnh).
  ctx.fillStyle = '#C9A227';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3A2E12';
  fitFont(ctx, 'ĐẠI HỌC BÁCH KHOA HÀ NỘI', 700, 44, w * 0.92);
  ctx.fillText('ĐẠI HỌC BÁCH KHOA HÀ NỘI', w / 2, h * 0.14);
  ctx.fillStyle = '#B03A2E';
  fitFont(ctx, 'QUẢNG TRƯỜNG', 900, 72, w * 0.9);
  ctx.fillText('QUẢNG TRƯỜNG', w / 2, h * 0.4);
  fitFont(ctx, 'TRẦN ĐẠI NGHĨA', 900, 118, w * 0.94);
  ctx.fillText('TRẦN ĐẠI NGHĨA', w / 2, h * 0.68);
  ctx.fillStyle = '#3A2E12';
  fitFont(ctx, 'TRAN DAI NGHIA SQUARE', 700, 40, w * 0.9);
  ctx.fillText('TRAN DAI NGHIA SQUARE', w / 2, h * 0.9);
}

export function drawMonument(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Bia cẩm thạch trắng, chữ khắc đỏ (reference-visual §5).
  // CHỈ tái hiện dòng ngày tháng đã đọc được trong ảnh; toàn văn lời khắc
  // chưa xác minh nên vẽ bằng vạch đỏ gợi ý, không bịa chữ.
  ctx.fillStyle = '#F5F5F3';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#B03A2E';
  for (let i = 0; i < 7; i++) {
    const y = 90 + i * 62;
    const rw = w * (0.72 - (i % 3) * 0.08);
    ctx.fillRect((w - rw) / 2, y, rw, 10);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, 'HÀ NỘI, NGÀY 01 THÁNG 9 NĂM 2006', 900, 44, w * 0.92);
  ctx.fillText('HÀ NỘI, NGÀY 01 THÁNG 9 NĂM 2006', w / 2, h - 70);
}

export function drawClockFace(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F8F8F8';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = w / 2 - 22;
    const r2 = w / 2 - (i % 3 === 0 ? 58 : 40);
    ctx.lineWidth = i % 3 === 0 ? 12 : 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1);
    ctx.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2);
    ctx.stroke();
  }
  ctx.fillStyle = '#1A1A1A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 72px Arial, sans-serif';
  ctx.fillText('12', cx, cy - w * 0.32);
  ctx.fillText('6', cx, cy + w * 0.32);
  ctx.fillText('3', cx + w * 0.32, cy);
  ctx.fillText('9', cx - w * 0.32, cy);
}

// --- Component mặt phẳng chữ --------------------------------------------------

export function LabelPlane({
  textureKey,
  canvasW,
  canvasH,
  draw,
  size,
  position,
  rotation = [0, 0, 0],
  transparent = true,
}: {
  textureKey: string;
  canvasW: number;
  canvasH: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  transparent?: boolean;
}) {
  const tex = useMemo(
    () => getTexture(textureKey, canvasW, canvasH, draw),
    [textureKey, canvasW, canvasH, draw],
  );
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} transparent={transparent} roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}
