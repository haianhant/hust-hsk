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
    t. wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry || rx);
  }
  return t;
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
