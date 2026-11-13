// ---------------------------------------------------------------------------
// components/three/Signage3D.tsx — Hệ thống chữ nổi kiến trúc 3D thực thụ
// (ExtrudedText3D) & biển hộp khung nổi 3D (FramedSignBox3D) cho toàn bộ công trình
// trong khuôn viên Đại học Bách khoa Hà Nội (C7, Trường Vật Liệu, Nhà Cựu SV, C1, D3–D9...).
//
// Khắc phục triệt để tình trạng biển chữ phẳng 2D giả đổ bóng:
//   - Quét mặt nạ chữ tiếng Việt (Be Vietnam Pro, chuẩn Unicode NFC, không vẽ bóng 2D)
//     và gộp dải hình chữ nhật 2 chiều thành một BufferGeometry khối đặc 3D duy nhất
//     có bề dày vật lý thực (depth = 0.08m – 0.24m), pháp tuyến 6 mặt chuẩn để bắt nắng
//     và đổ bóng thật từ mọi góc nhìn nghiêng 0°–90°.
//   - Mặt chính diện phủ lớp chữ kim loại / sơn tĩnh điện độ phân giải cao (alphaTest)
//     đặt nhô +0.004m khỏi mặt trước khối đùn 3D (chống Z-fighting tuyệt đối).
//   - Giải phóng (.dispose()) đầy đủ mọi BufferGeometry & CanvasTexture khi unmount.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { CANVAS_VN_FONT, wrapVietnameseCanvasContext } from './TextPlate';

type BoxSpec3D = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
};

/** Gộp danh sách hộp chữ nhật thành 1 BufferGeometry duy nhất bằng TypedArray tốc độ cao. */
function buildMergedBoxesGeometry(specs: BoxSpec3D[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const count = specs.length;
  if (count === 0) {
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(0), 3));
    return geo;
  }

  // Mỗi hộp: 6 mặt × 4 đỉnh = 24 đỉnh, 6 mặt × 6 chỉ số = 36 indices
  const positions = new Float32Array(count * 24 * 3);
  const normals = new Float32Array(count * 24 * 3);
  const indices = new Uint32Array(count * 36);

  let pOff = 0;
  let nOff = 0;
  let iOff = 0;
  let vBase = 0;

  const pushFace = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    dx: number, dy: number, dz: number,
    nx: number, ny: number, nz: number,
  ) => {
    positions[pOff++] = ax; positions[pOff++] = ay; positions[pOff++] = az;
    positions[pOff++] = bx; positions[pOff++] = by; positions[pOff++] = bz;
    positions[pOff++] = cx; positions[pOff++] = cy; positions[pOff++] = cz;
    positions[pOff++] = dx; positions[pOff++] = dy; positions[pOff++] = dz;

    for (let k = 0; k < 4; k++) {
      normals[nOff++] = nx;
      normals[nOff++] = ny;
      normals[nOff++] = nz;
    }

    indices[iOff++] = vBase;
    indices[iOff++] = vBase + 1;
    indices[iOff++] = vBase + 2;
    indices[iOff++] = vBase;
    indices[iOff++] = vBase + 2;
    indices[iOff++] = vBase + 3;
    vBase += 4;
  };

  for (let s = 0; s < count; s++) {
    const b = specs[s];
    const x0 = b.x - b.w * 0.5;
    const x1 = b.x + b.w * 0.5;
    const y0 = b.y - b.h * 0.5;
    const y1 = b.y + b.h * 0.5;
    const z0 = b.z - b.d * 0.5;
    const z1 = b.z + b.d * 0.5;

    // Front (+Z)
    pushFace(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, 0, 0, 1);
    // Back (-Z)
    pushFace(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, 0, 0, -1);
    // Top (+Y)
    pushFace(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0, 0, 1, 0);
    // Bottom (-Y)
    pushFace(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, 0, -1, 0);
    // Right (+X)
    pushFace(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1, 1, 0, 0);
    // Left (-X)
    pushFace(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, -1, 0, 0);
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeBoundingSphere();
  return geo;
}

/** Tự động điền chữ vừa khít chiều ngang khung vẽ với đầy đủ dấu tiếng Việt. */
function drawFittedCleanText(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  fillStyle: string | CanvasGradient,
  fontWeight = '700',
  letterSpacingRatio = 0,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontPx = Math.round(h * 0.72);
  ctx.font = `${fontWeight} ${fontPx}px ${CANVAS_VN_FONT}`;
  const maxAllowedW = w * 0.92;
  const measured = ctx.measureText(text).width * (1 + letterSpacingRatio);
  if (measured > maxAllowedW && measured > 1) {
    fontPx = Math.max(14, Math.floor(fontPx * (maxAllowedW / measured)));
    ctx.font = `${fontWeight} ${fontPx}px ${CANVAS_VN_FONT}`;
  }

  ctx.fillStyle = fillStyle;
  // Tuyệt đối KHÔNG vẽ shadowBlur/shadowOffset 2D để chữ là hình khối 3D thật 100%
  ctx.fillText(text, w / 2, h * 0.52);
  ctx.restore();
}

function useFontsLoadedEpoch(): number {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    let cancelled = false;
    document.fonts.ready
      .then(() => {
        if (!cancelled) setEpoch((v) => v + 1);
      })
      .catch(() => {
        // Ignore offline/headless font errors
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return epoch;
}

export interface ExtrudedText3DProps {
  text: string;
  /** Kích thước bao [rộng, cao] tính bằng mét (m) */
  size: [number, number];
  /** Bề dày đùn khối chữ 3D theo trục Z cục bộ (m), mặc định 0.18m */
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Màu mặt chữ chính diện */
  frontColor?: string;
  /** Màu nhấn ánh kim phía trên mặt chữ (tạo hiệu ứng kim loại phay xước tự nhiên) */
  frontHighlightColor?: string;
  /** Màu thành bên hông chữ 3D (đậm hơn mặt trước để tách khối sắc nét ở góc xiên) */
  sideColor?: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  castShadow?: boolean;
  /** Mật độ lưới đùn khối theo chiều ngang (mặc định tự động 96–288 theo độ dài chuỗi) */
  gridCols?: number;
  /** Thanh ray thép đỡ chân chữ nổi (dùng cho chữ đặt đứng trên mái đón hoặc cổ mái) */
  mountingRail?: {
    yOffset: number;
    height?: number;
    depth?: number;
    color?: string;
    standoffCount?: number;
  };
}

export function ExtrudedText3D({
  text,
  size,
  depth = 0.18,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  frontColor = '#D4AF37',
  frontHighlightColor,
  sideColor = '#785416',
  metalness = 0.68,
  roughness = 0.3,
  emissive = '#000000',
  emissiveIntensity = 0,
  castShadow = true,
  gridCols,
  mountingRail,
}: ExtrudedText3DProps) {
  const [worldW, worldH] = size;
  const fontEpoch = useFontsLoadedEpoch();

  const { bodyGeo, frontTex } = useMemo(() => {
    if (typeof document === 'undefined') {
      return {
        bodyGeo: new THREE.BufferGeometry(),
        frontTex: null as THREE.CanvasTexture | null,
      };
    }

    // 1. Sinh mặt chữ độ phân giải cao (tỷ lệ texW/texH khớp chính xác worldW/worldH để không bị kéo giãn)
    const aspect = Math.max(0.8, worldW / Math.max(0.12, worldH));
    const texW = aspect >= 10 ? 2048 : aspect >= 4.5 ? 1536 : aspect >= 2.2 ? 1024 : 512;
    const texH = Math.max(96, Math.min(384, Math.round(texW / aspect)));
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = texW;
    frontCanvas.height = texH;
    const rawFrontCtx = frontCanvas.getContext('2d');
    let fTex: THREE.CanvasTexture | null = null;
    if (rawFrontCtx) {
      const fCtx = wrapVietnameseCanvasContext(rawFrontCtx);
      let fill: string | CanvasGradient = frontColor;
      if (frontHighlightColor) {
        const grad = fCtx.createLinearGradient(0, texH * 0.15, 0, texH * 0.85);
        grad.addColorStop(0, frontHighlightColor);
        grad.addColorStop(0.55, frontColor);
        grad.addColorStop(1, frontColor);
        fill = grad;
      }
      drawFittedCleanText(fCtx, text, texW, texH, fill, '800');
      fTex = new THREE.CanvasTexture(frontCanvas);
      fTex.colorSpace = THREE.SRGBColorSpace;
      fTex.anisotropy = 8;
      fTex.needsUpdate = true;
    }

    // 2. Quét lưới nhị phân & gộp hình chữ nhật 2 chiều (tỷ lệ cols/rows khớp chính xác aspect)
    const cols =
      gridCols ??
      Math.min(480, Math.max(96, Math.round(Math.min(44, Math.max(3, text.length)) * 12)));
    const rows = Math.max(24, Math.min(96, Math.round(cols / aspect)));

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = cols;
    maskCanvas.height = rows;
    const rawMaskCtx = maskCanvas.getContext('2d');
    const boxes: BoxSpec3D[] = [];

    if (rawMaskCtx) {
      const mCtx = wrapVietnameseCanvasContext(rawMaskCtx);
      drawFittedCleanText(mCtx, text, cols, rows, '#FFFFFF', '800');
      const img = mCtx.getImageData(0, 0, cols, rows).data;

      // Gộp các dải ngang liên tiếp cùng cột [x0, x1] theo hàng dọc để giảm tối đa số lượng mặt tam giác
      let activeRects = new Map<string, { x0: number; x1: number; y0: number; y1: number }>();
      const finishedRects: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];

      for (let py = 0; py < rows; py++) {
        const nextRects = new Map<string, { x0: number; x1: number; y0: number; y1: number }>();
        let px = 0;
        while (px < cols) {
          const alpha = img[(py * cols + px) * 4 + 3];
          if (alpha < 108) {
            px++;
            continue;
          }
          const x0 = px;
          while (px < cols && img[(py * cols + px) * 4 + 3] >= 108) {
            px++;
          }
          const x1 = px; // exclusive
          const key = `${x0}:${x1}`;
          const prev = activeRects.get(key);
          if (prev) {
            prev.y1 = py + 1;
            nextRects.set(key, prev);
            activeRects.delete(key);
          } else {
            nextRects.set(key, { x0, x1, y0: py, y1: py + 1 });
          }
        }
        activeRects.forEach((r) => finishedRects.push(r));
        activeRects = nextRects;
      }
      activeRects.forEach((r) => finishedRects.push(r));

      const cellW = worldW / cols;
      const cellH = worldH / rows;

      for (let i = 0; i < finishedRects.length; i++) {
        const r = finishedRects[i];
        const bw = (r.x1 - r.x0) * cellW;
        const bh = (r.y1 - r.y0) * cellH;
        const bx = -worldW * 0.5 + (r.x0 + r.x1) * 0.5 * cellW;
        const by = worldH * 0.5 - (r.y0 + r.y1) * 0.5 * cellH;
        boxes.push({ x: bx, y: by, z: 0, w: bw, h: bh, d: depth });
      }
    }

    return {
      bodyGeo: buildMergedBoxesGeometry(boxes),
      frontTex: fTex,
    };
  }, [text, worldW, worldH, depth, frontColor, frontHighlightColor, gridCols, fontEpoch]);

  useEffect(
    () => () => {
      bodyGeo.dispose();
      if (frontTex) frontTex.dispose();
    },
    [bodyGeo, frontTex],
  );

  const railH = mountingRail?.height ?? 0.065;
  const railD = mountingRail?.depth ?? Math.max(depth * 1.15, 0.16);
  const railColor = mountingRail?.color ?? '#18181B';
  const standoffCount = mountingRail?.standoffCount ?? 6;

  return (
    <group position={position} rotation={rotation}>
      {/* Thân đùn khối đặc 3D thật (có vách cạnh hông, đỉnh, đáy bắt ánh sáng mặt trời) */}
      <mesh geometry={bodyGeo} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial
          color={sideColor}
          metalness={Math.min(1, metalness * 0.85)}
          roughness={Math.min(1, roughness + 0.08)}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.45}
        />
      </mesh>

      {/* Mặt chính diện kim loại / sơn phủ sắc nét (nhô +0.004m chống Z-fighting) */}
      {frontTex && (
        <mesh position={[0, 0, depth * 0.5 + 0.004]}>
          <planeGeometry args={[worldW, worldH]} />
          <meshStandardMaterial
            map={frontTex}
            alphaTest={0.18}
            transparent
            metalness={metalness}
            roughness={roughness}
            emissive={emissive !== '#000000' ? emissive : frontColor}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      )}

      {/* Hệ khung ray thép & chân chốt đỡ chữ nổi 3D (khi chữ đứng độc lập trên mái đón / cổ mái) */}
      {mountingRail && (
        <group>
          <mesh position={[0, mountingRail.yOffset, 0]} castShadow>
            <boxGeometry args={[worldW * 0.94, railH, railD]} />
            <meshStandardMaterial color={railColor} roughness={0.4} metalness={0.65} />
          </mesh>
          {Array.from({ length: standoffCount }, (_, idx) => {
            const sx =
              standoffCount <= 1
                ? 0
                : -worldW * 0.42 + (idx / (standoffCount - 1)) * (worldW * 0.84);
            const pinH = Math.max(0.06, Math.abs(mountingRail.yOffset) * 0.65);
            return (
              <mesh
                key={`standoff-${idx}`}
                position={[sx, mountingRail.yOffset + pinH * 0.45, 0]}
              >
                <boxGeometry args={[0.045, pinH, Math.min(railD * 0.6, 0.08)]} />
                <meshStandardMaterial color={railColor} roughness={0.45} metalness={0.6} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

export interface FramedSignBox3DProps {
  /** Hàm vẽ nội dung mặt biển (sử dụng wrapVietnameseCanvasContext chuẩn) */
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  canvasW?: number;
  canvasH?: number;
  /** Kích thước mặt biển [rộng, cao] (m) */
  size: [number, number];
  /** Bề dày hộp biển 3D (m), mặc định 0.10m */
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  boxColor?: string;
  frameColor?: string;
  frameWidth?: number;
  isNight?: boolean;
}

/** Biển hiệu dạng hộp nổi 3D có viền khung kim loại đùn nổi thật quanh mép biển. */
export function FramedSignBox3D({
  draw,
  canvasW = 768,
  canvasH = 192,
  size,
  depth = 0.1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  boxColor = '#1E293B',
  frameColor = '#CBD5E1',
  frameWidth = 0.055,
  isNight = false,
}: FramedSignBox3DProps) {
  const [w, h] = size;
  const fontEpoch = useFontsLoadedEpoch();

  const { faceTex, frameGeo } = useMemo(() => {
    let tex: THREE.CanvasTexture | null = null;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const raw = canvas.getContext('2d');
      if (raw) {
        const ctx = wrapVietnameseCanvasContext(raw);
        draw(ctx, canvasW, canvasH);
        tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
      }
    }

    const fd = depth + 0.028;
    const fGeo = buildMergedBoxesGeometry([
      // Thanh viền trên & dưới
      { x: 0, y: h * 0.5 + frameWidth * 0.5, z: 0.008, w: w + frameWidth * 2, h: frameWidth, d: fd },
      { x: 0, y: -h * 0.5 - frameWidth * 0.5, z: 0.008, w: w + frameWidth * 2, h: frameWidth, d: fd },
      // Thanh viền trái & phải
      { x: -w * 0.5 - frameWidth * 0.5, y: 0, z: 0.008, w: frameWidth, h: h, d: fd },
      { x: w * 0.5 + frameWidth * 0.5, y: 0, z: 0.008, w: frameWidth, h: h, d: fd },
    ]);

    return { faceTex: tex, frameGeo: fGeo };
  }, [draw, canvasW, canvasH, w, h, depth, frameWidth, fontEpoch]);

  useEffect(
    () => () => {
      frameGeo.dispose();
      if (faceTex) faceTex.dispose();
    },
    [frameGeo, faceTex],
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Thân hộp biển kim loại 3D */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, depth]} />
        <meshStandardMaterial color={boxColor} roughness={0.5} metalness={0.45} />
      </mesh>
      {/* Viền khung nhôm / đồng 3D ôm quanh hộp biển */}
      <mesh geometry={frameGeo} castShadow>
        <meshStandardMaterial color={frameColor} roughness={0.36} metalness={0.62} />
      </mesh>
      {/* Mặt nội dung biển nhô +0.02m khỏi lưng hộp */}
      {faceTex && (
        <mesh position={[0, 0, depth * 0.5 + 0.005]}>
          <planeGeometry args={[w - 0.01, h - 0.01]} />
          <meshStandardMaterial
            map={faceTex}
            roughness={0.42}
            metalness={0.12}
            emissive={isNight ? '#FFFFFF' : '#000000'}
            emissiveMap={isNight ? faceTex : null}
            emissiveIntensity={isNight ? 0.32 : 0}
          />
        </mesh>
      )}
    </group>
  );
}
