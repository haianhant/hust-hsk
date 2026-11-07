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

/**
 * Mặt sân Quảng trường Trần Đại Nghĩa cảm hứng Bản mạch điện tử (PCB Circuit Plaza,
 * khánh thành 19/05/2025): nền đá xanh ngọc khắc đường mạch trắng-vàng đồng và vi điểm nối.
 */
export function makeCircuitPlazaTexture(repeatX = 2, repeatY = 2): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  const rnd = createSeededRandom(20250519);

  // Nền đá xanh ngọc mạch in
  ctx.fillStyle = '#9BCBC0';
  ctx.fillRect(0, 0, 512, 512);

  // Ô gạch đá ngầm
  ctx.strokeStyle = 'rgba(72, 118, 108, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Hạt khoáng mịn
  for (let i = 0; i < 1600; i++) {
    const v = 135 + Math.floor(rnd() * 80);
    ctx.fillStyle = `rgba(${v - 15}, ${v + 12}, ${v + 6}, 0.14)`;
    ctx.fillRect(rnd() * 512, rnd() * 512, 2, 2);
  }

  // Chip trung tâm & đường mạch điện tử 45°/90°
  ctx.strokeStyle = 'rgba(246, 252, 250, 0.82)';
  ctx.lineWidth = 5;
  ctx.strokeRect(196, 196, 120, 120);
  ctx.fillStyle = 'rgba(56, 104, 96, 0.45)';
  ctx.fillRect(204, 204, 104, 104);

  const traces: Array<Array<[number, number]>> = [
    [[256, 196], [256, 96], [192, 32], [64, 32]],
    [[220, 196], [220, 128], [144, 52], [32, 52]],
    [[292, 196], [292, 112], [368, 36], [480, 36]],
    [[316, 256], [416, 256], [472, 200], [472, 88]],
    [[316, 292], [396, 292], [456, 352], [456, 476]],
    [[256, 316], [256, 416], [320, 480], [440, 480]],
    [[216, 316], [216, 396], [152, 460], [44, 460]],
    [[196, 256], [104, 256], [48, 312], [48, 420]],
    [[196, 220], [120, 220], [64, 164], [64, 88]],
  ];

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const path of traces) {
    ctx.strokeStyle = 'rgba(248, 252, 250, 0.85)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    path.forEach(([x, y], idx) => {
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Pad tròn ở đầu và cuối đường mạch
    const last = path[path.length - 1];
    ctx.fillStyle = '#F7FAF9';
    ctx.beginPath();
    ctx.arc(last[0], last[1], 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(last[0], last[1], 4, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true);
}

/**
 * Mặt sân Bóng rổ & Thể chất Bách Khoa (Khu Liên hợp Thể thao):
 * nền xanh lá thể thao, khu vực giới hạn đỏ đất nung và vạch sơn trắng chuẩn.
 */
export function makeSportsCourtTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  // Viền ngoài xanh lá cây đậm thể thao
  ctx.fillStyle = '#2E6F4E';
  ctx.fillRect(0, 0, 1024, 512);

  // Sân chính bên trong màu đỏ nâu Acrylic
  ctx.fillStyle = '#B84A39';
  ctx.fillRect(64, 44, 896, 424);

  // Khu vực dưới rổ 2 đầu (xanh lá)
  ctx.fillStyle = '#2E6F4E';
  ctx.fillRect(64, 176, 170, 160);
  ctx.fillRect(790, 176, 170, 160);

  // Vạch sơn trắng
  ctx.strokeStyle = '#F7F9F7';
  ctx.lineWidth = 6;
  ctx.strokeRect(64, 44, 896, 424);

  // Vạch giữa sân + vòng tròn trung tâm
  ctx.beginPath();
  ctx.moveTo(512, 44);
  ctx.lineTo(512, 468);
  ctx.stroke();

  ctx.fillStyle = '#2E6F4E';
  ctx.beginPath();
  ctx.arc(512, 256, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Khu dưới rổ + vòng ném phạt 2 bên
  ctx.strokeRect(64, 176, 170, 160);
  ctx.beginPath();
  ctx.arc(234, 256, 56, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.strokeRect(790, 176, 170, 160);
  ctx.beginPath();
  ctx.arc(790, 256, 56, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.stroke();

  // Vòng 3 điểm hai đầu sân
  ctx.beginPath();
  ctx.arc(118, 256, 178, -Math.PI * 0.42, Math.PI * 0.42);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(906, 256, 178, Math.PI * 0.58, Math.PI * 1.42);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Vân vải dệt vi mô (Procedural Fabric Weave) dùng cho trang phục nhân vật
 * (áo Polo, Hoodie, Sơ mi, Quần): sắc trắng-xám trung tính để nhân trực tiếp với color.
 */
export function makeFabricTexture(repeatX = 5, repeatY = 5): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  const rnd = createSeededRandom(20260905);

  ctx.fillStyle = '#F7F7F7';
  ctx.fillRect(0, 0, 128, 128);

  // Sợi dệt ngang dọc rất mảnh
  for (let y = 0; y < 128; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(215, 215, 215, 0.35)' : 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(0, y, 128, 2);
  }
  for (let x = 0; x < 128; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? 'rgba(220, 220, 220, 0.3)' : 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x, 0, 2, 128);
  }

  for (let i = 0; i < 400; i++) {
    const v = 225 + Math.floor(rnd() * 30);
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.22)`;
    ctx.fillRect(rnd() * 128, rnd() * 128, 2, 2);
  }

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true);
}

/**
 * Sân vận động Bách Khoa (SVĐ Bách Khoa): Đường chạy điền kinh Tartan đỏ gạch bao quanh
 * sân bóng đá cỏ xanh kẻ sọc 2 tông + vạch vôi trắng (vòng tròn trung tâm, vòng cấm địa 16m50, khung 5m50).
 */
export function makeFootballFieldTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 680;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  // Viền đường chạy điền kinh màu đỏ gạch Bách Khoa
  ctx.fillStyle = '#B84234';
  ctx.fillRect(0, 0, 1024, 680);

  // Vạch phân làn chạy điền kinh trắng mảnh
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  for (let lane = 1; lane <= 3; lane++) {
    const pad = lane * 14;
    ctx.strokeRect(pad, pad, 1024 - pad * 2, 680 - pad * 2);
  }

  // Lòng sân cỏ bóng đá xanh mướt kẻ sọc đậm nhạt
  const fx = 56;
  const fy = 52;
  const fw = 1024 - fx * 2;
  const fh = 680 - fy * 2;
  const stripes = 12;
  const sw = fw / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#3E8E3A' : '#489B42';
    ctx.fillRect(fx + i * sw, fy, sw + 1, fh);
  }

  // Vạch vôi trắng chuẩn sân bóng đá (như hình vẽ trên khuon-vien-truong.png)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.strokeRect(fx + 16, fy + 16, fw - 32, fh - 32);

  // Đường giữa sân & vòng tròn giao bóng
  ctx.beginPath();
  ctx.moveTo(512, fy + 16);
  ctx.lineTo(512, fy + fh - 16);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 340, 74, 0, Math.PI * 2);
  ctx.stroke();

  // Chấm giao bóng giữa sân
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(512, 340, 7, 0, Math.PI * 2);
  ctx.fill();

  // Khu vực cấm địa 2 đầu sân (16m50 & 5m50 + cung phạt đền)
  const leftX = fx + 16;
  const rightX = fx + fw - 16;
  ctx.strokeRect(leftX, 340 - 145, 135, 290);
  ctx.strokeRect(leftX, 340 - 72, 52, 144);
  ctx.beginPath();
  ctx.arc(leftX + 98, 340, 58, -0.62, 0.62);
  ctx.stroke();

  ctx.strokeRect(rightX - 135, 340 - 145, 135, 290);
  ctx.strokeRect(rightX - 52, 340 - 72, 52, 144);
  ctx.beginPath();
  ctx.arc(rightX - 98, 340, 58, Math.PI - 0.62, Math.PI + 0.62);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Bể bơi Bách Khoa: Mặt nước xanh ngọc lam kèm 6 làn phao bơi đỏ - trắng - xanh.
 */
export function makeSwimmingPoolTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  ctx.fillStyle = '#1CA3DE';
  ctx.fillRect(0, 0, 512, 256);

  // Ô gạch đáy bể mờ dưới làn nước
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Vạch kẻ chữ T đáy làn bơi & dây phao phân làn
  for (let lane = 1; lane <= 5; lane++) {
    const y = (lane * 256) / 6;
    ctx.strokeStyle = '#0D47A1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(28, y - 14);
    ctx.lineTo(484, y - 14);
    ctx.stroke();

    // Dây phao đỏ-trắng nổi trên mặt nước
    for (let x = 8; x < 504; x += 12) {
      ctx.fillStyle = (x / 12) % 2 === 0 ? '#E53935' : '#FFFFFF';
      ctx.fillRect(x, y - 2, 10, 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// ===========================================================================
// WAVE 4 — HIGH-FIDELITY 3D GRAPHICS OVERHAUL (IBL, PBR ARCHITECTURE, FOLIAGE)
// ===========================================================================

/**
 * Bản đồ môi trường Equirectangular (512×256) phục vụ Image-Based Lighting (IBL)
 * qua THREE.PMREMGenerator và vòm trời chuyển sắc 3D (SkyDome).
 */
export function makeSkyEnvEquirectTexture(
  timeOfDay: 'day' | 'sunset' | 'night' = 'day',
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  if (timeOfDay === 'day') {
    grad.addColorStop(0.0, '#4E88C7'); // Thiên đỉnh xanh trong
    grad.addColorStop(0.32, '#8EBCE6'); // Bầu trời cao
    grad.addColorStop(0.49, '#DCEBF7'); // Đường chân trời sáng
    grad.addColorStop(0.52, '#C8D8C2'); // Tiếp giáp mặt đất
    grad.addColorStop(0.75, '#7A9668'); // Phản xạ cỏ xanh
    grad.addColorStop(1.0, '#5A6E4E');
  } else if (timeOfDay === 'sunset') {
    grad.addColorStop(0.0, '#3D4E78'); // Thiên đỉnh tím chiều
    grad.addColorStop(0.28, '#9E6B78');
    grad.addColorStop(0.45, '#EB9560'); // Chân trời cam hồng hoàng hôn
    grad.addColorStop(0.5, '#FFD099');
    grad.addColorStop(0.55, '#8A6E5A');
    grad.addColorStop(1.0, '#4A3C32');
  } else {
    grad.addColorStop(0.0, '#0B1324'); // Thiên đỉnh đêm sâu
    grad.addColorStop(0.38, '#162442');
    grad.addColorStop(0.5, '#253A60'); // Chân trời đêm Hà Nội
    grad.addColorStop(0.55, '#1B2622');
    grad.addColorStop(1.0, '#0F1514');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Đốm sáng mặt trời / mặt trăng trên bản đồ phản xạ để tạo specular highlight sống động trên kính & mặt nước
  const sunX = timeOfDay === 'day' ? 140 : timeOfDay === 'sunset' ? 380 : 210;
  const sunY = timeOfDay === 'day' ? 68 : timeOfDay === 'sunset' ? 112 : 76;
  const sunR = timeOfDay === 'sunset' ? 76 : 56;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunR);
  if (timeOfDay === 'day') {
    sunGrad.addColorStop(0, 'rgba(255, 255, 245, 0.98)');
    sunGrad.addColorStop(0.3, 'rgba(255, 250, 225, 0.55)');
    sunGrad.addColorStop(1, 'rgba(255, 250, 225, 0)');
  } else if (timeOfDay === 'sunset') {
    sunGrad.addColorStop(0, 'rgba(255, 235, 180, 0.98)');
    sunGrad.addColorStop(0.35, 'rgba(255, 160, 85, 0.65)');
    sunGrad.addColorStop(1, 'rgba(255, 130, 65, 0)');
  } else {
    sunGrad.addColorStop(0, 'rgba(225, 238, 255, 0.85)');
    sunGrad.addColorStop(0.35, 'rgba(150, 185, 240, 0.35)');
    sunGrad.addColorStop(1, 'rgba(120, 160, 220, 0)');
  }
  ctx.fillStyle = sunGrad;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Đĩa hào quang Mặt trời / Mặt trăng mềm (Sun Corona / Moon Glow Halo).
 */
export function makeSunHaloTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 124);
  g.addColorStop(0.0, 'rgba(255, 255, 245, 0.95)');
  g.addColorStop(0.18, 'rgba(255, 240, 200, 0.65)');
  g.addColorStop(0.48, 'rgba(255, 210, 145, 0.22)');
  g.addColorStop(1.0, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Đĩa bóng đổ tiếp đất mềm (Ambient Occlusion Contact Shadow) dưới chân nhân vật, gốc cây, ghế đá.
 */
export function makeSoftShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  g.addColorStop(0.0, 'rgba(18, 24, 16, 0.46)');
  g.addColorStop(0.45, 'rgba(18, 24, 16, 0.24)');
  g.addColorStop(0.78, 'rgba(18, 24, 16, 0.07)');
  g.addColorStop(1.0, 'rgba(18, 24, 16, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Vân tường bê tông / vữa trát nắng Bách Khoa (Weathered Concrete / Stucco PBR)
 * dùng cho Cổng Parabol, Nhà C1, Thư viện Tạ Quang Bửu và Nhà C9.
 * Sắc nền trắng ngà rất sáng để nhân trực tiếp với màu đặc trưng của từng công trình.
 */
export function makeWeatheredConcreteTexture(
  repeatX = 4,
  repeatY = 2,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
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

  const rnd = createSeededRandom(19561015);

  ctx.fillStyle = '#FAF9F6';
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);

  // Vệt loang thời gian rất nhẹ trên mặt vữa trát
  for (let i = 0; i < 24; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const r = 18 + rnd() * 44;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() > 0.4;
    g.addColorStop(0, dark ? 'rgba(140, 136, 126, 0.055)' : 'rgba(255, 255, 252, 0.06)');
    g.addColorStop(1, 'rgba(140, 136, 126, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Hạt khoáng vữa mịn + bump vi mô
  for (let i = 0; i < 2200; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const v = 228 + Math.floor((rnd() - 0.5) * 34);
    ctx.fillStyle = `rgba(${v}, ${v - 1}, ${v - 3}, 0.22)`;
    ctx.fillRect(x, y, 1.8, 1.8);

    const bv = 110 + Math.floor(rnd() * 36);
    bctx.fillStyle = `rgb(${bv}, ${bv}, ${bv})`;
    bctx.fillRect(x, y, 2, 2);
  }

  return {
    map: configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true),
    bumpMap: configureTexture(new THREE.CanvasTexture(b), repeatX, repeatY, false),
  };
}

/**
 * Vân đá Granite tự nhiên (dùng cho bậc tam cấp C1, Thư viện, bệ chữ I ❤️ BK, HUST, Khối đá trắng).
 */
export function makeGraniteStoneTexture(
  repeatX = 3,
  repeatY = 3,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
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

  const rnd = createSeededRandom(20260715);
  ctx.fillStyle = '#ECEAE4';
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3200; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const v = 185 + Math.floor((rnd() - 0.5) * 90);
    ctx.fillStyle = `rgba(${v}, ${v}, ${v - 2}, 0.25)`;
    ctx.fillRect(x, y, 2, 2);

    const bv = 95 + Math.floor(rnd() * 60);
    bctx.fillStyle = `rgb(${bv}, ${bv}, ${bv})`;
    bctx.fillRect(x, y, 2, 2);
  }

  return {
    map: configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true),
    bumpMap: configureTexture(new THREE.CanvasTexture(b), repeatX, repeatY, false),
  };
}

/**
 * Vân gỗ tự nhiên (dùng cho cửa gỗ tầng trệt C9, ghế băng sân trường, bục giảng).
 */
export function makeWoodGrainTexture(repeatX = 2, repeatY = 2): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  const rnd = createSeededRandom(20260808);

  ctx.fillStyle = '#F2E8D8';
  ctx.fillRect(0, 0, 256, 256);

  // Thớ gỗ dọc
  for (let x = 0; x < 256; x += 3) {
    const alpha = 0.06 + rnd() * 0.1;
    ctx.fillStyle = rnd() > 0.5 ? `rgba(120, 82, 42, ${alpha})` : `rgba(255, 245, 225, ${alpha})`;
    ctx.fillRect(x, 0, 2, 256);
  }

  return configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true);
}

/**
 * Vân vỏ cây cổ thụ có rãnh dọc (Bark PBR Texture + BumpMap) dùng cho thân và cành cây.
 */
export function makeBarkTexture(
  repeatX = 2,
  repeatY = 4,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');

  const b = document.createElement('canvas');
  b.width = 128;
  b.height = 256;
  const bctx = b.getContext('2d');
  if (!bctx) throw new Error('Canvas 2D không khả dụng');

  const rnd = createSeededRandom(20260321);
  ctx.fillStyle = '#EBE3D8';
  ctx.fillRect(0, 0, 128, 256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 128, 256);

  // Rãnh vỏ cây chạy dọc
  for (let i = 0; i < 220; i++) {
    const x = rnd() * 128;
    const y = rnd() * 256;
    const w = 2 + rnd() * 3;
    const h = 18 + rnd() * 42;
    const dark = rnd() > 0.35;
    ctx.fillStyle = dark ? 'rgba(95, 72, 50, 0.22)' : 'rgba(255, 245, 230, 0.16)';
    ctx.fillRect(x, y, w, h);

    bctx.fillStyle = dark ? '#454545' : '#B8B8B8';
    bctx.fillRect(x, y, w, h);
  }

  return {
    map: configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true),
    bumpMap: configureTexture(new THREE.CanvasTexture(b), repeatX, repeatY, false),
  };
}

/**
 * Vân tán lá đa sắc có độ xốp nổi khối (Dappled Foliage Canopy PBR Texture + BumpMap).
 * Sắc nền trắng-xanh rất sáng để nhân trực tiếp với màu tán lá riêng của từng loài cây.
 */
export function makeFoliageCanopyTexture(
  repeatX = 3,
  repeatY = 3,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
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

  const rnd = createSeededRandom(20260505);
  ctx.fillStyle = '#EEF5E8';
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#787878';
  bctx.fillRect(0, 0, 256, 256);

  // Các chùm lá xếp lớp sáng tối
  for (let i = 0; i < 650; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const rx = 5 + rnd() * 8;
    const ry = 3 + rnd() * 6;
    const rot = rnd() * Math.PI;
    const isLight = rnd() > 0.42;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = isLight ? 'rgba(255, 255, 238, 0.25)' : 'rgba(65, 92, 52, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    bctx.save();
    bctx.translate(x, y);
    bctx.rotate(rot);
    bctx.fillStyle = isLight ? '#C8C8C8' : '#424242';
    bctx.beginPath();
    bctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    bctx.fill();
    bctx.restore();
  }

  return {
    map: configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true),
    bumpMap: configureTexture(new THREE.CanvasTexture(b), repeatX, repeatY, false),
  };
}

/**
 * Vân sợi tóc Anisotropic (Hair Strand PBR Texture + BumpMap) dùng cho mái tóc nhân vật 3D.
 */
export function makeHairStrandTexture(
  repeatX = 4,
  repeatY = 3,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
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

  const rnd = createSeededRandom(20261112);
  ctx.fillStyle = '#E8E2DC';
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);

  // Dải ánh bóng ngang nhẹ kiểu tóc bóng mượt (anisotropic highlight band)
  const sheen = ctx.createLinearGradient(0, 48, 0, 172);
  sheen.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.5, 'rgba(255, 248, 238, 0.24)');
  sheen.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 48, 256, 124);

  // Sợi tóc mảnh chạy dọc
  for (let i = 0; i < 900; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const h = 24 + rnd() * 56;
    const isLight = rnd() > 0.5;
    ctx.fillStyle = isLight ? 'rgba(255, 248, 240, 0.18)' : 'rgba(55, 40, 32, 0.22)';
    ctx.fillRect(x, y, 1.5, h);

    bctx.fillStyle = isLight ? '#B5B5B5' : '#4E4E4E';
    bctx.fillRect(x, y, 1.5, h);
  }

  return {
    map: configureTexture(new THREE.CanvasTexture(c), repeatX, repeatY, true),
    bumpMap: configureTexture(new THREE.CanvasTexture(b), repeatX, repeatY, false),
  };
}
