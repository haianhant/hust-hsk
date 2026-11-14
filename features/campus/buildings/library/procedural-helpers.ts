// ---------------------------------------------------------------------------
// procedural-helpers.ts — Bộ công cụ sinh hình học 3D & CanvasTexture thủ tục
// cho nội thất đa tầng Thư viện Tạ Quang Bửu (Tầng 1–10 theo chuẩn studywithhuster.cyou).
// Tuân thủ ADR-0002 (0 file 3D ngoài) và GEMINI.md Mục 3 (giải phóng bộ nhớ WebGL).
// ---------------------------------------------------------------------------

import * as THREE from 'three';

export function lin(n: number, a: number, b: number): number[] {
  return Array.from({ length: n }, (_, i) => a + (n > 1 ? (i * (b - a)) / (n - 1) : 0));
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(
  w: number,
  h: number,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  rx = 0,
  ry = 0,
): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    const dt = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    dt.colorSpace = THREE.SRGBColorSpace;
    if (rx) {
      dt.wrapS = THREE.RepeatWrapping;
      dt.wrapT = THREE.RepeatWrapping;
      dt.repeat.set(rx, ry || rx);
    }
    return dt as unknown as THREE.CanvasTexture;
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) fn(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (rx) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry || rx);
  }
  return t;
}

/**
 * No-op raycast handler for purely decorative procedural meshes so R3F pointer
 * events skip thousands of non-interactive triangles.
 */
export const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

/**
 * Batches heavily repeated static `THREE.Mesh` objects sharing `(geometry, material)`
 * into `THREE.InstancedMesh` instances, merges remaining static opaque meshes per
 * material into a single baked `BufferGeometry` (cutting WebGL draw calls & GPU
 * geometry uploads across Floors 1–10), preserves any animated subtrees in
 * `preserveRoots`, and disables pointer raycasting on decorative procedural meshes.
 */
export function optimizeStaticLibraryGroup(
  container: THREE.Object3D,
  preserveRoots: ReadonlyArray<THREE.Object3D | null | undefined> = [],
): { batchedMeshes: number; instancedGroups: number; mergedMaterialGroups: number } {
  const preserved = new Set<THREE.Object3D>();
  for (let i = 0; i < preserveRoots.length; i++) {
    const root = preserveRoots[i];
    if (!root) continue;
    root.traverse((node: THREE.Object3D) => {
      preserved.add(node);
    });
  }

  container.updateMatrixWorld(true);
  const containerInverse = new THREE.Matrix4().copy(container.matrixWorld).invert();

  const buckets = new Map<
    string,
    {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      meshes: THREE.Mesh[];
      matrices: THREE.Matrix4[];
    }
  >();

  container.traverse((obj) => {
    const inst = obj as THREE.InstancedMesh;
    if (inst.isInstancedMesh) {
      inst.raycast = NOOP_RAYCAST;
      return;
    }

    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.raycast = NOOP_RAYCAST;

    if (!mesh.visible || preserved.has(mesh) || mesh.children.length > 0) return;
    if (!mesh.geometry || !mesh.material || Array.isArray(mesh.material)) return;

    const key = `${mesh.geometry.uuid}_${mesh.material.uuid}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        geometry: mesh.geometry,
        material: mesh.material,
        meshes: [],
        matrices: [],
      };
      buckets.set(key, bucket);
    }
    bucket.meshes.push(mesh);
    bucket.matrices.push(
      new THREE.Matrix4().multiplyMatrices(containerInverse, mesh.matrixWorld),
    );
  });

  let batchedMeshes = 0;
  let instancedGroups = 0;
  let mergedMaterialGroups = 0;

  const matMergeBuckets = new Map<
    string,
    {
      material: THREE.Material;
      items: Array<{
        mesh: THREE.Mesh;
        geometry: THREE.BufferGeometry;
        matrix: THREE.Matrix4;
      }>;
    }
  >();

  buckets.forEach(({ geometry, material, meshes, matrices }) => {
    const canMergeByMat =
      !material.transparent &&
      Boolean(geometry.attributes.position) &&
      geometry.attributes.position.itemSize === 3 &&
      Boolean(geometry.attributes.normal) &&
      geometry.attributes.normal.itemSize === 3 &&
      !geometry.attributes.color;

    // Dùng InstancedMesh cho các chi tiết lặp lại >= 6 lần (hoặc >= 2 nếu là kính trong suốt)
    const instanceThreshold = canMergeByMat ? 6 : 2;
    if (meshes.length >= instanceThreshold) {
      for (const m of meshes) {
        m.parent?.remove(m);
      }
      const im = new THREE.InstancedMesh(geometry, material, matrices.length);
      im.raycast = NOOP_RAYCAST;
      im.castShadow = meshes.some((m) => m.castShadow);
      im.receiveShadow = meshes.some((m) => m.receiveShadow);
      for (let i = 0; i < matrices.length; i++) {
        im.setMatrixAt(i, matrices[i]);
      }
      im.instanceMatrix.needsUpdate = true;
      container.add(im);
      batchedMeshes += meshes.length;
      instancedGroups += 1;
      return;
    }

    if (canMergeByMat) {
      let mBucket = matMergeBuckets.get(material.uuid);
      if (!mBucket) {
        mBucket = { material, items: [] };
        matMergeBuckets.set(material.uuid, mBucket);
      }
      for (let i = 0; i < meshes.length; i++) {
        mBucket.items.push({ mesh: meshes[i], geometry, matrix: matrices[i] });
      }
    }
  });

  const tmpPos = new THREE.Vector3();
  const tmpNorm = new THREE.Vector3();
  const normalMat = new THREE.Matrix3();

  matMergeBuckets.forEach(({ material, items }) => {
    if (items.length < 2) return;

    let totalVerts = 0;
    for (let i = 0; i < items.length; i++) {
      const g = items[i].geometry;
      const count = g.index ? g.index.count : g.attributes.position.count;
      totalVerts += count;
    }
    if (totalVerts === 0) return;

    const posOut = new Float32Array(totalVerts * 3);
    const normOut = new Float32Array(totalVerts * 3);
    const uvOut = new Float32Array(totalVerts * 2);

    let vCursor = 0;
    let castShadow = false;
    let receiveShadow = false;

    for (let i = 0; i < items.length; i++) {
      const { mesh, geometry, matrix } = items[i];
      if (mesh.castShadow) castShadow = true;
      if (mesh.receiveShadow) receiveShadow = true;
      mesh.parent?.remove(mesh);

      normalMat.getNormalMatrix(matrix);
      const flipWinding = matrix.determinant() < 0;
      const posAttr = geometry.attributes.position;
      const normAttr = geometry.attributes.normal;
      const uvAttr = geometry.attributes.uv;
      const idxAttr = geometry.index;
      const vCount = idxAttr ? idxAttr.count : posAttr.count;

      for (let t = 0; t < vCount; t += 3) {
        for (let k = 0; k < 3; k++) {
          const sk = flipWinding ? (k === 1 ? 2 : k === 2 ? 1 : 0) : k;
          const vi = idxAttr ? idxAttr.getX(t + sk) : t + sk;

          tmpPos.fromBufferAttribute(posAttr, vi).applyMatrix4(matrix);
          posOut[vCursor * 3] = tmpPos.x;
          posOut[vCursor * 3 + 1] = tmpPos.y;
          posOut[vCursor * 3 + 2] = tmpPos.z;

          tmpNorm.fromBufferAttribute(normAttr, vi).applyMatrix3(normalMat).normalize();
          normOut[vCursor * 3] = tmpNorm.x;
          normOut[vCursor * 3 + 1] = tmpNorm.y;
          normOut[vCursor * 3 + 2] = tmpNorm.z;

          if (uvAttr) {
            uvOut[vCursor * 2] = uvAttr.getX(vi);
            uvOut[vCursor * 2 + 1] = uvAttr.getY(vi);
          }
          vCursor++;
        }
      }
    }

    const mergedGeo = new THREE.BufferGeometry();
    mergedGeo.setAttribute('position', new THREE.BufferAttribute(posOut, 3));
    mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normOut, 3));
    mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2));
    mergedGeo.computeBoundingBox();
    mergedGeo.computeBoundingSphere();

    const mergedMesh = new THREE.Mesh(mergedGeo, material);
    mergedMesh.raycast = NOOP_RAYCAST;
    mergedMesh.castShadow = castShadow;
    mergedMesh.receiveShadow = receiveShadow;
    container.add(mergedMesh);

    batchedMeshes += items.length;
    mergedMaterialGroups += 1;
  });

  return { batchedMeshes, instancedGroups, mergedMaterialGroups };
}

/**
 * Sinh CanvasTexture bóng tiếp xúc mềm (Contact Ambient Occlusion) đặt dưới chân
 * bàn ghế, bục đàn Grand Piano, quầy lễ tân để triệt tiêu cảm giác vật thể trôi nổi.
 */
export function makeLibrarySoftAoTex(): THREE.CanvasTexture {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.06, w / 2, h / 2, w * 0.49);
    g.addColorStop(0, 'rgba(10, 14, 22, 0.72)');
    g.addColorStop(0.52, 'rgba(10, 14, 22, 0.34)');
    g.addColorStop(0.84, 'rgba(10, 14, 22, 0.08)');
    g.addColorStop(1, 'rgba(10, 14, 22, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * Sinh CanvasTexture vân gỗ sồi / óc chó ấm áp cho bàn đọc,
 * kệ sách, tay vịn lan can và bậc cầu thang xoắn trong Thư viện Tạ Quang Bửu.
 * Giữ bumpMap = undefined để dùng chung biến thể shader USE_MAP (tránh biên dịch lại
 * hàng chục shader GLSL nặng trên SwiftShader CI).
 */
export function makeLibraryWoodGrainTex(
  baseHex: string,
  grainHex: string,
  rx = 2,
  ry = 2,
  seed = 195610,
): { map: THREE.CanvasTexture; bumpMap?: undefined } {
  const rng = mulberry32(seed);
  const map = canvasTex(
    64,
    64,
    (ctx) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 20; i++) {
        const y = rng() * 64;
        const h = 1 + rng() * 2.5;
        ctx.fillStyle = grainHex;
        ctx.globalAlpha = 0.1 + rng() * 0.16;
        ctx.fillRect(0, y, 64, h);
      }
      ctx.strokeStyle = grainHex;
      for (let k = 0; k < 7; k++) {
        const y0 = rng() * 64;
        const amp = 1.5 + rng() * 2.5;
        ctx.globalAlpha = 0.14 + rng() * 0.12;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.bezierCurveTo(21, y0 + amp, 42, y0 - amp, 64, y0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    rx,
    ry,
  );
  return { map };
}

/**
 * Sinh texture vải nỉ / da bọc đệm ghế đọc sách, ghế bành và sofa.
 */
export function makeLibraryUpholsteryTex(
  baseHex: string,
  weaveHex: string,
  rx = 3,
  ry = 3,
): { map: THREE.CanvasTexture; bumpMap?: undefined } {
  const map = canvasTex(
    64,
    64,
    (ctx) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = weaveHex;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      for (let i = 0; i < 64; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 64);
        ctx.moveTo(0, i);
        ctx.lineTo(64, i);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    rx,
    ry,
  );
  return { map };
}

/**
 * Sinh texture vữa kiến trúc / đá mịn cho tường và cột thông tầng Thư viện.
 */
export function makeLibraryStuccoWallTex(
  baseHex: string,
  grainHex: string,
  rx = 6,
  ry = 3,
  seed = 202611,
): { map: THREE.CanvasTexture; bumpMap?: undefined } {
  const rng = mulberry32(seed);
  const map = canvasTex(
    64,
    64,
    (ctx) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = grainHex;
      for (let i = 0; i < 64; i++) {
        ctx.globalAlpha = 0.06 + rng() * 0.08;
        ctx.fillRect(rng() * 64, rng() * 64, 2 + rng() * 3, 2 + rng() * 3);
      }
      ctx.globalAlpha = 1;
    },
    rx,
    ry,
  );
  return { map };
}

export const LIBRARY_VN_FONT = '"Be Vietnam Pro", "Noto Sans", system-ui, sans-serif';

/**
 * Sinh texture hàng gáy sách đa sắc (bìa vải, dải nhũ vàng, nhãn mã phân loại)
 * cho kệ sách & kho mở Thư viện — không tạo thêm draw call cho từng quyển sách.
 */
export function makeBookSpineRowTex(
  seed = 202611,
  rx = 2,
  ry = 1,
): { map: THREE.CanvasTexture; bumpMap?: undefined } {
  const rng = mulberry32(seed);
  const palette = [
    '#1e3a5f',
    '#7c2d12',
    '#14532d',
    '#78350f',
    '#312e81',
    '#991b1b',
    '#0f766e',
    '#475569',
    '#a16207',
    '#831843',
    '#d6c7a9',
    '#334155',
  ];
  const map = canvasTex(
    256,
    128,
    (ctx) => {
      // Nền hốc tủ tối phía sau gáy sách thấp
      ctx.fillStyle = '#1f1812';
      ctx.fillRect(0, 0, 256, 128);
      let x = 0;
      let idx = 0;
      while (x < 256) {
        const w = Math.min(256 - x, 10 + Math.floor(rng() * 14));
        const topGap = Math.floor(rng() * 16);
        const h = 128 - topGap;
        const base = palette[Math.floor(rng() * palette.length)]!;

        ctx.fillStyle = base;
        ctx.fillRect(x, topGap, w, h);

        // Bóng vát 2 mép tạo cảm giác gáy cong 3D
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x, topGap, 2, h);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(x + w - 2, topGap, 2, h);

        // Vạch gân nhũ vàng / kem trên gáy sách
        const foilColor = idx % 3 === 0 ? '#f6d365' : '#e5e7eb';
        ctx.fillStyle = foilColor;
        ctx.globalAlpha = 0.72;
        ctx.fillRect(x + 2, topGap + 14 + Math.floor(rng() * 8), Math.max(2, w - 4), 3);
        if (w >= 14) {
          ctx.fillRect(x + 3, topGap + 24, Math.max(2, w - 6), Math.min(24, 10 + Math.floor(rng() * 14)));
        }
        ctx.globalAlpha = 1;

        // Tem nhãn phân loại thư viện màu trắng ở chân gáy sách
        if (idx % 2 === 0 || w >= 13) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(x + 2, 102, Math.max(3, w - 4), 14);
          ctx.fillStyle = '#334155';
          ctx.fillRect(x + 3, 106, Math.max(2, w - 6), 2);
          ctx.fillRect(x + 3, 111, Math.max(2, w - 7), 2);
        }

        x += w;
        idx++;
      }
    },
    rx,
    ry,
  );
  return { map };
}

/**
 * Sinh texture màn hình OPAC / Quầy thủ thư / Kiosk tự mượn trả tiếng Việt chuẩn NFC.
 */
export function makeMonitorScreenTex(kind: 'opac' | 'admin' | 'kiosk' = 'opac'): { map: THREE.CanvasTexture } {
  const map = canvasTex(256, 160, (ctx, w, h) => {
    ctx.fillStyle = kind === 'admin' ? '#0f172a' : '#0c1b2e';
    ctx.fillRect(0, 0, w, h);

    // Thanh tiêu đề ứng dụng
    ctx.fillStyle = kind === 'kiosk' ? '#991b1b' : '#1d4ed8';
    ctx.fillRect(0, 0, w, 24);
    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `700 10px ${LIBRARY_VN_FONT}`;
    const title =
      kind === 'admin'
        ? 'LIB-HUST · QUẢN LÝ MƯỢN TRẢ'.normalize('NFC')
        : kind === 'kiosk'
          ? 'TỰ MƯỢN / TRẢ SÁCH · TQB'.normalize('NFC')
          : 'TRA CỨU OPAC · TẠ QUANG BỬU'.normalize('NFC');
    ctx.fillText(title, 8, 12);

    if (kind === 'opac') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 32, w - 20, 20);
      ctx.fillStyle = '#64748b';
      ctx.font = `500 9px ${LIBRARY_VN_FONT}`;
      ctx.fillText('Tìm nhan đề, tác giả, mã ISBN...'.normalize('NFC'), 16, 42);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(w - 54, 34, 42, 16);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('Tìm'.normalize('NFC'), w - 33, 42);

      const cards = [
        ['Giải tích I & II · ĐHBK Hà Nội', 'Tầng 4 · Sẵn sàng', '#22c55e'],
        ['Cấu trúc dữ liệu & Thuật toán', 'Tầng 5 · P.501', '#38bdf8'],
        ['Giáo trình Hán ngữ HSK 1–6', 'Tầng 3 · Sẵn sàng', '#22c55e'],
      ] as const;
      cards.forEach(([label, loc, pill], idx) => {
        const cy = 60 + idx * 30;
        ctx.fillStyle = '#172a45';
        ctx.fillRect(10, cy, w - 20, 24);
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.font = `600 9px ${LIBRARY_VN_FONT}`;
        ctx.fillText(label.normalize('NFC'), 16, cy + 9);
        ctx.fillStyle = pill;
        ctx.font = `700 8px ${LIBRARY_VN_FONT}`;
        ctx.fillText(loc.normalize('NFC'), 16, cy + 19);
      });
    } else if (kind === 'admin') {
      const rows = [
        ['MSSV 2023xxxx · Mượn 03 cuốn', '#4ade80'],
        ['Kệ mở R4 · Đã kiểm kê 98%', '#60a5fa'],
        ['Phòng đọc P.401 · Còn 24 chỗ', '#fbbf24'],
        ['Trạng thái cổng từ · Hoạt động', '#34d399'],
      ] as const;
      rows.forEach(([txt, dot], idx) => {
        const ry = 34 + idx * 28;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(10, ry, w - 20, 22);
        ctx.fillStyle = dot;
        ctx.beginPath();
        ctx.arc(20, ry + 11, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.font = `600 9px ${LIBRARY_VN_FONT}`;
        ctx.fillText(txt.normalize('NFC'), 30, ry + 11);
      });
    } else {
      const steps = [
        ['1. Quét thẻ Sinh viên / QR', '#fbbf24'],
        ['2. Đặt sách lên bàn cảm ứng NFC', '#38bdf8'],
        ['3. Xác nhận & nhận phiếu hẹn', '#4ade80'],
      ] as const;
      steps.forEach(([s, col], idx) => {
        const sy = 36 + idx * 38;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(12, sy, w - 24, 30);
        ctx.fillStyle = col;
        ctx.fillRect(12, sy, 4, 30);
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.font = `700 10px ${LIBRARY_VN_FONT}`;
        ctx.fillText(s.normalize('NFC'), 24, sy + 15);
      });
    }
  });
  return { map };
}

/**
 * Sinh texture mặt trước máy bán nước tự động (tủ kính hàng lon/chai & bảng chọn QR).
 */
export function makeVendingFrontTex(): { map: THREE.CanvasTexture } {
  const map = canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // Biển đèn hộp trên cùng
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(10, 10, w - 20, 44);
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 15px ${LIBRARY_VN_FONT}`;
    ctx.fillText('HUST VENDING · GIẢI KHÁT'.normalize('NFC'), w / 2, 32);

    // Khoang kính trưng bày bên trái
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, 64, 158, 320);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 64, 158, 320);

    const drinkColors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#06b6d4'];
    for (let r = 0; r < 5; r++) {
      const sy = 76 + r * 60;
      ctx.fillStyle = '#334155';
      ctx.fillRect(16, sy + 44, 150, 5);
      for (let c = 0; c < 4; c++) {
        const sx = 24 + c * 36;
        ctx.fillStyle = drinkColors[(r + c) % drinkColors.length]!;
        ctx.fillRect(sx, sy + 6, 22, 36);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(sx + 4, sy + 10, 4, 24);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(sx + 2, sy + 45, 18, 8);
      }
    }

    // Ánh phản chiếu chéo nhẹ trên kính
    ctx.fillStyle = 'rgba(186,230,253,0.12)';
    ctx.beginPath();
    ctx.moveTo(16, 68);
    ctx.lineTo(100, 68);
    ctx.lineTo(42, 380);
    ctx.lineTo(16, 380);
    ctx.closePath();
    ctx.fill();

    // Bảng điều khiển & QR bên phải
    ctx.fillStyle = '#334155';
    ctx.fillRect(178, 64, 66, 210);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(186, 76, 50, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 10px ${LIBRARY_VN_FONT}`;
    ctx.fillText('QR PAY'.normalize('NFC'), 211, 89);

    for (let kr = 0; kr < 4; kr++) {
      for (let kc = 0; kc < 3; kc++) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(186 + kc * 18, 114 + kr * 18, 13, 13);
      }
    }
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(190, 200, 42, 42);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(196, 206, 12, 12);
    ctx.fillRect(214, 206, 12, 12);
    ctx.fillRect(196, 224, 12, 12);
    ctx.fillRect(212, 222, 14, 14);

    // Khay lấy đồ bên dưới
    ctx.fillStyle = '#020617';
    ctx.fillRect(20, 404, 180, 74);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 404, 180, 74);
  });
  return { map };
}

/**
 * Giải phóng toàn bộ BufferGeometry, Material và Texture trong cây Object3D
 * khi unmount component để tránh rò rỉ bộ nhớ WebGL (GEMINI.md Mục 3).
 */
export function disposeObject3D(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((obj) => {
    const anyObj = obj as THREE.Mesh & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    if (anyObj.geometry) {
      geometries.add(anyObj.geometry);
    }
    if (anyObj.material) {
      const mats = Array.isArray(anyObj.material) ? anyObj.material : [anyObj.material];
      for (const m of mats) {
        if (!m) continue;
        materials.add(m);
        const rec = m as unknown as Record<string, unknown>;
        for (const key of ['map', 'emissiveMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap']) {
          const val = rec[key];
          if (val && (val as THREE.Texture).isTexture) {
            textures.add(val as THREE.Texture);
          }
        }
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
