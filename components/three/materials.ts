// ---------------------------------------------------------------------------
// materials.ts — Bộ sinh Procedural PBR CanvasTexture (Deterministic Seed)
// Dùng cho Giai đoạn 1: nâng cấp mặt đất, đường nhựa, vỉa hè, sân gạch Thư viện,
// sân đá Quảng trường C1, bờ kè đá hộc và mặt nước gợn sóng Hồ Tiền.
// Không tải ảnh ngoài; mọi texture được sinh bằng Canvas 2D và giải phóng
// qua useEffect khi unmount.
// ---------------------------------------------------------------------------

import * as THREE from 'three';

export function createSeededRandom(seed = 20261107): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function configureTexture(
  tex: THREE.CanvasTexture,
  repeatX: number,
  repeatY: number,
  isColor = true,
): THREE.CanvasTexture {
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Thảm cỏ khuôn viên Bách Khoa: nền xanh tự nhiên có mảng sáng/tối dịu
 * và hạt cỏ mịn để mặt đất 220×190 m không bị phẳng như nhựa.
 */
export function makeGrassTexture(repeatX = 26, repeatY = 22): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  const rnd = createSeededRandom(20260101);

  ctx.fillStyle = '#7A9B58';
  ctx.fillRect(0, 0, 256, 256);

  // Mảng chuyển sắc hữu cơ
  for (let i = 0; i < 32; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const r = 24 + rnd() * 52;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const warm = rnd() > 0.45;
    g.addColorStop(0, warm ? 'rgba(138, 168, 88, 0.16)' : 'rgba(92, 126, 66, 0.16)');
    g.addColorStop(1, 'rgba(122, 155, 88, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Hạt lá cỏ nhỏ
  for (let i = 0; i < 2400; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const dg = Math.floor((rnd() - 0.5) * 28);
    ctx.fillStyle = `rgba(${114 + dg}, ${148 + dg}, ${82 + Math.floor(dg * 0.6)}, 0.28)`;
    ctx.fillRect(x, y, 1.5, 3);
  }

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true);
}

/**
 * Mặt đường nhựa (Asphalt) trong khuôn viên: hạt đá răm mịn + vệt bánh xe
 * + rãnh thoát nước nhẹ hai mép.
 */
export function makeAsphaltTexture(repeatX = 4, repeatY = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  const rnd = createSeededRandom(20260102);

  ctx.fillStyle = '#8B8C88';
  ctx.fillRect(0, 0, 256, 256);

  // Hai dải rãnh thoát nước sát mép đường (y gần 0 và 256)
  const edgeGradTop = ctx.createLinearGradient(0, 0, 0, 22);
  edgeGradTop.addColorStop(0, 'rgba(55, 56, 52, 0.38)');
  edgeGradTop.addColorStop(1, 'rgba(55, 56, 52, 0)');
  ctx.fillStyle = edgeGradTop;
  ctx.fillRect(0, 0, 256, 22);

  const edgeGradBot = ctx.createLinearGradient(0, 234, 0, 256);
  edgeGradBot.addColorStop(0, 'rgba(55, 56, 52, 0)');
  edgeGradBot.addColorStop(1, 'rgba(55, 56, 52, 0.38)');
  ctx.fillStyle = edgeGradBot;
  ctx.fillRect(0, 234, 256, 22);

  // Hạt đá nhựa đường
  for (let i = 0; i < 3000; i++) {
    const v = 105 + Math.floor(rnd() * 60);
    ctx.fillStyle = `rgba(${v}, ${v}, ${v - 3}, ${0.14 + rnd() * 0.16})`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 1.8, 1.8);
  }

  // Vạch phân làn đứt nét mờ ở tim đường (y = 128)
  ctx.fillStyle = 'rgba(238, 235, 222, 0.55)';
  ctx.fillRect(24, 124, 96, 8);
  ctx.fillRect(152, 124, 80, 8);

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true);
}

/**
 * Sân gạch đỏ-nâu đất nung (Quảng trường Thư viện Tạ Quang Bửu):
 * lát ô gạch đất nung có độ lệch màu tự nhiên và mạch vữa trầm.
 */
export function makeTerracottaTileTexture(repeatX = 14, repeatY = 22): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  const b = document.createElement('canvas');
  b.width = 256;
  b.height = 256;
  const bctx = b.getContext('2d');
  if (!bctx) throw new Error('Canvas 2D không khả dụng');

  const rnd = createSeededRandom(20061010);

  // Mạch vữa
  ctx.fillStyle = '#784230';
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#404040';
  bctx.fillRect(0, 0, 256, 256);

  const cols = 4;
  const rows = 4;
  const tw = 256 / cols;
  const th = 256 / rows;
  const gap = 3;

  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const dr = Math.floor((rnd() - 0.5) * 18);
      const dg = Math.floor((rnd() - 0.5) * 12);
      ctx.fillStyle = `rgb(${168 + dr}, ${92 + dg}, ${68 + dg})`;
      ctx.fillRect(k * tw + gap, r * th + gap, tw - gap * 2, th - gap * 2);

      // Viền sáng nhẹ góc gạch
      ctx.strokeStyle = 'rgba(255, 220, 195, 0.14)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(k * tw + gap + 1, r * th + gap + 1, tw - gap * 2 - 2, th - gap * 2 - 2);

      const bv = 210 + Math.floor((rnd() - 0.5) * 20);
      bctx.fillStyle = `rgb(${bv}, ${bv}, ${bv})`;
      bctx.fillRect(k * tw + gap, r * th + gap, tw - gap * 2, th - gap * 2);
    }
  }

  // Hạt đất nung mịn
  for (let i = 0; i < 1200; i++) {
    const v = rnd() > 0.5 ? 'rgba(255,235,215,0.08)' : 'rgba(65,30,18,0.09)';
    ctx.fillStyle = v;
    ctx.fillRect(rnd() * 256, rnd() * 256, 2, 2);
  }

  return {
    map: configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true),
    bumpMap: configureTexture(new THREE.CanvasTexture(b), repeatX, repeatY, false),
  };
}

/**
 * Đá lát Quảng trường C1: đá granito / đá rửa xám sáng có hạt khoáng mịn.
 */
export function makeC1PlazaStoneTexture(repeatX = 12, repeatY = 6): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  const rnd = createSeededRandom(19651965);

  ctx.fillStyle = '#CFCBC2';
  ctx.fillRect(0, 0, 256, 256);

  // Chia 2×2 tấm đá phụ trong mỗi ô lớn
  ctx.strokeStyle = 'rgba(155, 150, 140, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  ctx.strokeRect(129, 1, 126, 126);
  ctx.strokeRect(1, 129, 126, 126);
  ctx.strokeRect(129, 129, 126, 126);

  for (let i = 0; i < 2000; i++) {
    const v = 165 + Math.floor(rnd() * 65);
    ctx.fillStyle = `rgba(${v}, ${v - 2}, ${v - 6}, 0.16)`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 1.8, 1.8);
  }

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true);
}

/**
 * Đá hộc bờ kè Hồ Tiền: các viên đá xám xếp lớp có mạch vữa và rêu ẩm chân kè.
 */
export function makeStoneBankTexture(repeatX = 18, repeatY = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  const rnd = createSeededRandom(20162026);

  ctx.fillStyle = '#5E615B';
  ctx.fillRect(0, 0, 512, 128);

  const rows = 3;
  const rh = 128 / rows;
  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * -28;
    while (x < 512) {
      const w = 48 + Math.floor(rnd() * 34);
      const base = 126 + Math.floor((rnd() - 0.5) * 28);
      ctx.fillStyle = `rgb(${base}, ${base + 2}, ${base - 4})`;
      ctx.fillRect(x + 2, r * rh + 2, w - 4, rh - 4);
      x += w;
    }
  }

  // Vệt rêu ẩm tối dần ở chân kè
  const moss = ctx.createLinearGradient(0, 72, 0, 128);
  moss.addColorStop(0, 'rgba(38, 52, 38, 0)');
  moss.addColorStop(1, 'rgba(34, 48, 36, 0.42)');
  ctx.fillStyle = moss;
  ctx.fillRect(0, 72, 512, 56);

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true);
}

/**
 * Gạch lát đường dạo ven Hồ Tiền: gạch chữ nhật lát so le ấm áp.
 */
export function makeWalkwayBrickTexture(repeatX = 2, repeatY = 36): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  const rnd = createSeededRandom(20260404);

  ctx.fillStyle = '#8F877B';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 4;
  const rh = 256 / rows;
  const cw = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw / 2);
    for (let k = -1; k <= cols; k++) {
      const x = k * cw + offset;
      const d = Math.floor((rnd() - 0.5) * 16);
      ctx.fillStyle = `rgb(${184 + d}, ${176 + d}, ${163 + d})`;
      ctx.fillRect(x + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true);
}

/**
 * Sóng gợn mặt nước Hồ Tiền (Seamless Bump + Shimmer Map).
 */
export function makeWaterRippleBumpTexture(repeatX = 10, repeatY = 18): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const tau = Math.PI * 2;

  for (let y = 0; y < size; y++) {
    const v = (y / size) * tau;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * tau;
      const w1 = Math.sin(u * 3 + v * 2);
      const w2 = Math.cos(u * 2 - v * 4);
      const w3 = Math.sin(u * 5 + v * 5) * 0.5;
      const val = Math.floor(((w1 + w2 + w3 + 2.5) / 5.0) * 255);
      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, false);
}
