# Procedural PBR Recipes (`THREE.CanvasTexture`)

Các mẫu hàm tạo texture procerudal (không dùng ảnh ngoài) có tính tất định (deterministic seed) dùng cho `components/three/`.

## 1. Bộ sinh số ngẫu nhiên có Seed cố định (Deterministic PRNG)

```ts
export function createSeededRandom(seed = 20261107): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

## 2. Gạch Đỏ-Nâu Đất Nung (Sân Thư viện Tạ Quang Bửu)

```ts
export function makeTerracottaTileTexture(repeatX = 16, repeatY = 24): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const rnd = createSeededRandom(10102006);

  // Nền mạch vữa xám-nâu
  ctx.fillStyle = '#7D4532';
  ctx.fillRect(0, 0, 256, 256);

  const cols = 4;
  const rows = 4;
  const tw = 256 / cols;
  const th = 256 / rows;
  const gap = 3;

  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const dr = Math.floor((rnd() - 0.5) * 14);
      const dg = Math.floor((rnd() - 0.5) * 10);
      ctx.fillStyle = `rgb(${166 + dr}, ${91 + dg}, ${67 + dg})`;
      ctx.fillRect(k * tw + gap, r * th + gap, tw - gap * 2, th - gap * 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}
```

## 3. Mặt Đường Nhựa Có Hạt Đá & Vỉa Hè (Asphalt Road Texture)

```ts
export function makeAsphaltTexture(repeatX = 4, repeatY = 20): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const rnd = createSeededRandom(19562026);

  ctx.fillStyle = '#8F8F8B';
  ctx.fillRect(0, 0, 256, 256);

  // Hạt đá răm mịn trên mặt nhựa
  for (let i = 0; i < 1800; i++) {
    const v = 120 + Math.floor(rnd() * 45);
    ctx.fillStyle = `rgba(${v},${v},${v - 3},0.18)`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}
```

## 4. Tường Bê Tông / Vữa Trát Nắng Bách Khoa (Weathered Concrete / Plaster)

```ts
export function makePlasterWallTexture(baseHex = '#F4F3EF'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const rnd = createSeededRandom(19651015);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Vết loang thời gian rất nhẹ
  for (let i = 0; i < 18; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const r = 18 + rnd() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(135, 132, 120, 0.045)');
    g.addColorStop(1, 'rgba(135, 132, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.anisotropy = 4;
  return tex;
}
```
